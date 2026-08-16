import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdsRepositoryCore } from './pds-repository';
import { PdsXrpcClient } from './xrpc-client';
import { LEXICONS } from './lexicons';

describe('PdsRepositoryCore', () => {
  let client: PdsXrpcClient;
  let repo: PdsRepositoryCore;

  beforeEach(() => {
    client = new PdsXrpcClient('http://localhost:3000');
    repo = new PdsRepositoryCore(client);
    vi.restoreAllMocks();
  });

  it('fetches unified logs and sorts descending by loggedAt', async () => {
    const mockLogs = [
      {
        uri: 'at://did:plc:alice/app.trackstar.log/3logOld',
        cid: 'cid1',
        value: {
          mediaType: 'movie',
          title: 'Interstellar',
          status: 'completed',
          rating: 5,
          loggedAt: '2024-01-01T12:00:00Z',
          source: 'letterboxd',
          metadata: { year: 2014, director: 'Christopher Nolan' }
        }
      },
      {
        uri: 'at://did:plc:alice/app.trackstar.log/3logNew',
        cid: 'cid2',
        value: {
          mediaType: 'movie',
          title: 'Oppenheimer',
          status: 'completed',
          rating: 5,
          loggedAt: '2024-06-01T12:00:00Z',
          source: 'letterboxd',
          metadata: { year: 2023, director: 'Christopher Nolan' }
        }
      }
    ];

    vi.spyOn(client, 'listAllRecords').mockImplementation(async (_did, collection) => {
      if (collection === LEXICONS.LOG) return mockLogs as any;
      return [];
    });

    const logs = await repo.fetchLogs('did:plc:alice');

    expect(logs.length).toBe(2);
    // Newest first
    expect(logs[0].id).toBe('3logNew');
    expect(logs[0].title).toBe('Oppenheimer');
    expect(logs[1].id).toBe('3logOld');
    expect(logs[1].title).toBe('Interstellar');
  });

  it('creates unified log record in a single atomic write', async () => {
    const putSpy = vi.spyOn(client, 'putRecord').mockResolvedValue({
      uri: 'at://did:plc:alice/app.trackstar.log/3tid123',
      cid: 'bafy123'
    });

    const result = await repo.createLog('did:plc:alice', 'token-123', {
      mediaType: 'book',
      title: 'Project Hail Mary',
      status: 'want_to_consume',
      metadata: { author: 'Andy Weir' }
    });

    expect(putSpy).toHaveBeenCalledTimes(1);
    expect(putSpy).toHaveBeenCalledWith(
      'did:plc:alice',
      LEXICONS.LOG,
      expect.stringMatching(/^3/),
      expect.objectContaining({
        $type: 'app.trackstar.log',
        mediaType: 'book',
        title: 'Project Hail Mary',
        status: 'want_to_consume',
        metadata: expect.objectContaining({ author: 'Andy Weir' })
      }),
      'token-123'
    );

    expect(result.logRkey).toMatch(/^3/);
  });

  it('deletes log record from repository', async () => {
    const deleteSpy = vi.spyOn(client, 'deleteRecord').mockResolvedValue({ uri: 'deleted-uri' });

    await repo.deleteLog('did:plc:alice', 'token-123', '3log123');

    expect(deleteSpy).toHaveBeenCalledWith('did:plc:alice', LEXICONS.LOG, '3log123', 'token-123');
  });
});
