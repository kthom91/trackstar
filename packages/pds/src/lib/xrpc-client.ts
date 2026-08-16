import {
  PdsUserSession,
  AtpRecord,
  ListRecordsResponse,
  XrpcRequestOptions
} from './types';

export class PdsXrpcClient {
  constructor(private pdsUrl: string = 'http://localhost:3000') {}

  getBaseUrl(): string {
    return this.pdsUrl.replace(/\/+$/, '');
  }

  setBaseUrl(url: string): void {
    this.pdsUrl = url;
  }

  /**
   * Execute an XRPC endpoint request.
   */
  async request<T = any>(endpoint: string, options: XrpcRequestOptions = {}): Promise<T> {
    const method = options.method || 'GET';
    const cleanUrl = `${this.getBaseUrl()}/xrpc/${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers
    };

    if (options.body && method !== 'GET') {
      fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const res = await fetch(cleanUrl, fetchOptions);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `XRPC Error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Create a new session via com.atproto.server.createSession.
   */
  async createSession(identifier: string, password: string): Promise<PdsUserSession> {
    const data = await this.request<{
      did: string;
      handle: string;
      email?: string;
      accessJwt: string;
      refreshJwt: string;
    }>('com.atproto.server.createSession', {
      method: 'POST',
      body: {
        identifier: identifier.trim(),
        password: password.trim()
      }
    });

    return {
      did: data.did,
      handle: data.handle || identifier,
      email: data.email,
      pdsUrl: this.getBaseUrl(),
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt
    };
  }

  /**
   * Refresh an existing session via com.atproto.server.refreshSession.
   */
  async refreshSession(refreshJwt: string): Promise<PdsUserSession> {
    const data = await this.request<{
      did: string;
      handle: string;
      accessJwt: string;
      refreshJwt: string;
    }>('com.atproto.server.refreshSession', {
      method: 'POST',
      token: refreshJwt
    });

    return {
      did: data.did,
      handle: data.handle,
      pdsUrl: this.getBaseUrl(),
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt
    };
  }

  /**
   * List all records in a collection with pagination support.
   */
  async listAllRecords<T = Record<string, any>>(
    did: string,
    collection: string
  ): Promise<AtpRecord<T>[]> {
    let allRecords: AtpRecord<T>[] = [];
    let cursor: string | undefined;

    do {
      const query = `com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=${encodeURIComponent(collection)}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const res = await this.request<ListRecordsResponse<T>>(query, { method: 'GET' });
      const records = res.records || [];
      allRecords = allRecords.concat(records);
      cursor = res.cursor;
      if (records.length === 0) break;
    } while (cursor);

    return allRecords;
  }

  /**
   * Put (create or replace) a record in a repository.
   */
  async putRecord<T = Record<string, any>>(
    did: string,
    collection: string,
    rkey: string,
    record: T,
    accessJwt: string
  ): Promise<{ uri: string; cid: string }> {
    return await this.request('com.atproto.repo.putRecord', {
      method: 'POST',
      token: accessJwt,
      body: {
        repo: did,
        collection,
        rkey,
        record
      }
    });
  }

  /**
   * Delete a record from a repository.
   */
  async deleteRecord(
    did: string,
    collection: string,
    rkey: string,
    accessJwt: string
  ): Promise<{ uri?: string }> {
    return await this.request('com.atproto.repo.deleteRecord', {
      method: 'POST',
      token: accessJwt,
      body: {
        repo: did,
        collection,
        rkey
      }
    });
  }
}
