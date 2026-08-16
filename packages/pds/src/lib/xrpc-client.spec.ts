import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdsXrpcClient } from './xrpc-client';

describe('PdsXrpcClient', () => {
  let client: PdsXrpcClient;

  beforeEach(() => {
    client = new PdsXrpcClient('http://localhost:3000');
    vi.restoreAllMocks();
  });

  it('normalizes base URL by stripping trailing slashes', () => {
    client.setBaseUrl('https://pds.example.com///');
    expect(client.getBaseUrl()).toBe('https://pds.example.com');
  });

  it('creates session and returns structured session data', async () => {
    const mockResponse = {
      did: 'did:plc:test12345',
      handle: 'alice.test',
      accessJwt: 'mock-access-token',
      refreshJwt: 'mock-refresh-token',
      email: 'alice@example.com'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const session = await client.createSession('alice.test', 'password123');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/xrpc/com.atproto.server.createSession',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'alice.test', password: 'password123' })
      })
    );

    expect(session.did).toBe('did:plc:test12345');
    expect(session.handle).toBe('alice.test');
    expect(session.accessJwt).toBe('mock-access-token');
    expect(session.refreshJwt).toBe('mock-refresh-token');
  });

  it('refreshes session using refresh JWT', async () => {
    const mockResponse = {
      did: 'did:plc:test12345',
      handle: 'alice.test',
      accessJwt: 'new-access-jwt',
      refreshJwt: 'new-refresh-jwt'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const session = await client.refreshSession('old-refresh-jwt');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/xrpc/com.atproto.server.refreshSession',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer old-refresh-jwt'
        })
      })
    );

    expect(session.accessJwt).toBe('new-access-jwt');
    expect(session.refreshJwt).toBe('new-refresh-jwt');
  });

  it('lists all collection records with automatic pagination traversal', async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          json: async () => ({
            cursor: 'cursor-page-2',
            records: [
              { uri: 'at://did:plc:123/app.trackstar.log/1', value: { title: 'First' } }
            ]
          })
        };
      } else {
        return {
          ok: true,
          json: async () => ({
            cursor: undefined,
            records: [
              { uri: 'at://did:plc:123/app.trackstar.log/2', value: { title: 'Second' } }
            ]
          })
        };
      }
    });

    const records = await client.listAllRecords('did:plc:123', 'app.trackstar.log');

    expect(records.length).toBe(2);
    expect(records[0].value.title).toBe('First');
    expect(records[1].value.title).toBe('Second');
    expect(callCount).toBe(2);
  });

  it('throws structured error message on non-200 responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Invalid credentials provided' })
    });

    await expect(client.createSession('bad.handle', 'wrong')).rejects.toThrow('Invalid credentials provided');
  });
});
