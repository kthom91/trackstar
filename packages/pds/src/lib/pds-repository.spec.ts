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

  it('fetches and joins media items with logs and sorts descending by loggedAt', async () => {
    const mockMedia = [
      {
        uri: 'at://did:plc:alice/app.trackstar.media/movie_interstellar',
        value: {
          id: 'movie_interstellar',
          mediaType: 'movie',
          title: 'Interstellar',
          metadataJson: { year: 2014, director: 'Christopher Nolan' }
        }
      }
    ];

    const mockLogs = [
      {
        uri: 'at://did:plc:alice/app.trackstar.log/3logOld',
        cid: 'cid1',
        value: {
          mediaItemId: 'movie_interstellar',
          status: 'completed',
          rating: 5,
          loggedAt: '2024-01-01T12:00:00Z',
          source: 'letterboxd'
        }
      },
      {
        uri: 'at://did:plc:alice/app.trackstar.log/3logNew',
        cid: 'cid2',
        value: {
          mediaItemId: 'movie_interstellar',
          status: 'completed',
          rating: 4,
          loggedAt: '2024-06-01T12:00:00Z',
          source: 'letterboxd'
        }
      }
    ];

    vi.spyOn(client, 'listAllRecords').mockImplementation(async (_did, collection) => {
      if (collection === LEXICONS.MEDIA) return mockMedia as any;
      if (collection === LEXICONS.LOG) return mockLogs as any;
      return [];
    });

    const { logs, mediaMap } = await repo.fetchMediaAndLogs('did:plc:alice');

    expect(mediaMap.size).toBe(1);
    expect(mediaMap.get('movie_interstellar')?.title).toBe('Interstellar');
    expect(logs.length).toBe(2);
    // Newest first
    expect(logs[0].id).toBe('3logNew');
    expect(logs[0].mediaItem?.title).toBe('Interstellar');
    expect(logs[1].id).toBe('3logOld');
  });

  it('creates media item and log record atomically', async () => {
    const putSpy = vi.spyOn(client, 'putRecord').mockResolvedValue({
      uri: 'at://did:plc:alice/app.trackstar.log/3tid123',
      cid: 'bafy123'
    });

    const result = await repo.createLog('did:plc:alice', 'token-123', {
      mediaType: 'book',
      title: 'Project Hail Mary',
      status: 'want_to_consume',
      metadataJson: { author: 'Andy Weir' }
    });

    expect(putSpy).toHaveBeenCalledTimes(2);
    // 1st call: app.trackstar.media
    expect(putSpy).toHaveBeenNthCalledWith(
      1,
      'did:plc:alice',
      LEXICONS.MEDIA,
      'book_project_hail_mary',
      expect.objectContaining({
        title: 'Project Hail Mary',
        mediaType: 'book'
      }),
      'token-123'
    );
    // 2nd call: app.trackstar.log
    expect(putSpy).toHaveBeenNthCalledWith(
      2,
      'did:plc:alice',
      LEXICONS.LOG,
      expect.stringMatching(/^3/),
      expect.objectContaining({
        mediaItemId: 'book_project_hail_mary',
        status: 'want_to_consume'
      }),
      'token-123'
    );

    expect(result.mediaItemId).toBe('book_project_hail_mary');
  });

  it('deletes log record from repository', async () => {
    const deleteSpy = vi.spyOn(client, 'deleteRecord').mockResolvedValue({ uri: 'deleted-uri' });

    await repo.deleteLog('did:plc:alice', 'token-123', '3log123');

    expect(deleteSpy).toHaveBeenCalledWith('did:plc:alice', LEXICONS.LOG, '3log123', 'token-123');
  });
});
