import { Injectable, signal, computed } from '@angular/core';
import {
  ExtensionMediaItem,
  LetterboxdRssItem,
  RssPollState,
  SetlistSyncState,
  BatchIngestResult,
  IntegrationDefinition
} from '@trackstar/data';
import { PdsConfig } from '@trackstar/pds';
import {
  IntegrationProvider,
  getProvider,
  getAllProviders,
  NormalizedMediaEntry
} from '@trackstar/integrations';

@Injectable({
  providedIn: 'root'
})
export class ExtensionBridgeService {
  // Reactive signals
  readonly config = signal<PdsConfig>({
    pdsUrl: 'http://localhost:3000',
    handle: '',
    password: ''
  });

  readonly isConnected = computed(() => {
    const c = this.config();
    return Boolean(c.did && c.accessJwt);
  });

  readonly mediaItems = signal<ExtensionMediaItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly unsyncedItems = computed(() => {
    return this.mediaItems().filter(m => !m.isSynced);
  });

  readonly unsyncedCount = computed(() => this.unsyncedItems().length);

  readonly rssState = signal<RssPollState>({
    polling: false,
    newCount: 0,
    totalCount: 0,
    error: ''
  });

  readonly lbRssUsername = signal<string>('');

  // Setlist.fm State
  readonly setlistUsername = signal<string>('');
  readonly setlistApiKey = signal<string>('');
  readonly setlistSyncState = signal<SetlistSyncState>({
    syncing: false,
    page: 0,
    totalPages: 0,
    processed: 0,
    total: 0,
    error: '',
    success: false
  });

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('ExtensionBridgeService: chrome extension API not available.');
      return;
    }

    try {
      const stored = await chrome.storage.local.get(['lbRssUsername', 'setlistUsername', 'setlistApiKey']);
      if (stored?.lbRssUsername) {
        this.lbRssUsername.set(stored.lbRssUsername);
      }
      if (stored?.setlistUsername) {
        this.setlistUsername.set(stored.setlistUsername);
      }
      if (stored?.setlistApiKey) {
        this.setlistApiKey.set(stored.setlistApiKey);
      }

      const connected = await this.loadConfig();
      if (connected) {
        await this.fetchAllMedia();
      }
    } catch (err: any) {
      console.error('Init error in ExtensionBridge:', err);
    }
  }

  async loadConfig(): Promise<boolean> {
    try {
      const res = await this.sendMessage<{ success: boolean; data: PdsConfig }>({ type: 'GET_CONFIG' });
      if (res?.data) {
        const cfg = { ...res.data };
        this.config.set(cfg);
        return Boolean(cfg.did && cfg.accessJwt);
      }
    } catch (e) {
      console.warn('Failed to load PDS config:', e);
    }
    return false;
  }

  async loginOAuth(handle: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const res = await this.sendMessage<{ success: boolean; data?: PdsConfig; error?: string }>({
        type: 'LOGIN_OAUTH',
        handle: handle.trim()
      });

      if (!res.success) {
        throw new Error(res.error || 'OAuth Authentication failed');
      }

      if (res.data) {
        this.config.set(res.data);
      }

      await this.fetchAllMedia();
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'OAuth Login failed');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async loginPds(pdsUrl: string, handle: string, pass: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const res = await this.sendMessage<{ success: boolean; data?: PdsConfig; error?: string }>({
        type: 'LOGIN_PDS',
        pdsUrl: pdsUrl.trim(),
        handle: handle.trim(),
        password: pass.trim()
      });

      if (!res.success) {
        throw new Error(res.error || 'Authentication failed');
      }

      if (res.data) {
        this.config.set(res.data);
      }

      await this.fetchAllMedia();
      return true;
    } catch (err: any) {
      this.error.set(err?.message || 'Login failed');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    const emptyConfig: PdsConfig = {
      pdsUrl: 'http://localhost:3000',
      handle: '',
      password: '',
      accessJwt: '',
      did: ''
    };
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ pdsConfig: emptyConfig });
    }
    this.config.set(emptyConfig);
    this.mediaItems.set([]);
  }

  async fetchAllMedia(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const res = await this.sendMessage<{ success: boolean; data?: ExtensionMediaItem[]; error?: string }>({
        type: 'FETCH_ALL_MEDIA'
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch media logs');
      }

      this.mediaItems.set(res.data || []);
    } catch (err: any) {
      this.error.set(err?.message || 'Error fetching records from PDS');
      console.error('Error fetching all media:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async pollLetterboxdRss(username: string): Promise<void> {
    if (!username.trim()) return;
    const cleanUsername = username.trim();

    this.rssState.set({ polling: true, newCount: 0, totalCount: 0, error: '' });

    try {
      const feedUrl = `https://letterboxd.com/${cleanUsername}/rss/`;
      const fetchRes = await this.sendMessage<{ success: boolean; data?: string; error?: string }>({
        type: 'FETCH_EXTERNAL_URL',
        url: feedUrl
      });

      if (!fetchRes.success || !fetchRes.data) {
        throw new Error(fetchRes.error || 'Failed to fetch Letterboxd RSS feed.');
      }

      const provider = getProvider('letterboxd');
      if (!provider?.parseRss) {
        throw new Error('Letterboxd RSS parser not available in integration registry.');
      }

      const parsedResult = await provider.parseRss(fetchRes.data);
      const parsedItems: LetterboxdRssItem[] = parsedResult.entries.map(entry => ({
        link: entry.externalUrl || entry.metadata['letterboxd_url'] || entry.metadata['link'] || '',
        title: entry.title,
        year: entry.metadata['year'] ? String(entry.metadata['year']) : undefined,
        rating: entry.rating || null,
        watchedDate: entry.completedAt || entry.loggedAt,
        coverUrl: entry.metadata['coverUrl']
      })).filter(i => Boolean(i.link && i.title));

      if (parsedItems.length === 0) {
        this.rssState.set({
          polling: false,
          newCount: 0,
          totalCount: 0,
          error: 'No diary entries found in RSS feed.'
        });
        return;
      }

      const ingestRes = await this.sendMessage<{ success: boolean; data?: { newCount: number; totalCount: number }; error?: string }>({
        type: 'LETTERBOXD_RSS_INGEST',
        items: parsedItems
      });

      if (!ingestRes.success || !ingestRes.data) {
        throw new Error(ingestRes.error || 'Ingest failed.');
      }

      this.rssState.set({
        polling: false,
        newCount: ingestRes.data.newCount,
        totalCount: ingestRes.data.totalCount,
        error: ''
      });

      this.lbRssUsername.set(cleanUsername);
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ lbRssUsername: cleanUsername });
      }

      if (ingestRes.data.newCount > 0) {
        await this.fetchAllMedia();
      }
    } catch (err: any) {
      this.rssState.set({
        polling: false,
        newCount: 0,
        totalCount: 0,
        error: err?.message || 'RSS poll failed.'
      });
    }
  }

  async syncMovieToLetterboxd(item: ExtensionMediaItem): Promise<void> {
    const url = this.getLetterboxdReviewUrl(item);
    await this.openTab(url);
  }

  async syncBookToStoryGraph(item: ExtensionMediaItem): Promise<void> {
    const url = `https://app.thestorygraph.com/browse?search_term=${encodeURIComponent(item.title)}`;
    await this.openTab(url);
  }

  async markItemSynced(item: ExtensionMediaItem): Promise<void> {
    const source = item.mediaType === 'book' ? 'storygraph' : (item.mediaType === 'concert' ? 'setlist.fm' : 'letterboxd');
    await this.sendMessage({
      type: 'MARK_SYNCED',
      rkey: item.rkey,
      source
    });
    await this.fetchAllMedia();
  }

  getLetterboxdReviewUrl(item: ExtensionMediaItem): string {
    let slug = '';
    if (item.letterboxdUrl && item.letterboxdUrl.includes('letterboxd.com/film/')) {
      const match = item.letterboxdUrl.match(/letterboxd\.com\/film\/([^\/]+)/);
      if (match) slug = match[1];
    }
    if (!slug) {
      slug = (item.title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const payload = {
      rkey: item.rkey,
      atUri: item.atUri,
      title: item.title,
      year: item.year,
      rating: item.rating,
      rating10: item.rating ? item.rating * 2 : null,
      review: item.review || '',
      watchedDate: item.completedAt ? item.completedAt.split('T')[0] : (item.loggedAt ? item.loggedAt.split('T')[0] : new Date().toISOString().split('T')[0]),
      tags: 'trackstar',
      action: 'log_movie'
    };

    const payloadEncoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(payload)))));
    return `https://letterboxd.com/film/${slug}/review/#trackstar-sync=${payloadEncoded}`;
  }

  async saveSetlistCredentials(username: string, apiKey: string): Promise<void> {
    const cleanUser = username.trim();
    const cleanKey = apiKey.trim();
    this.setlistUsername.set(cleanUser);
    this.setlistApiKey.set(cleanKey);

    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        setlistUsername: cleanUser,
        setlistApiKey: cleanKey
      });
    }
  }

  async syncSetlistFm(username?: string, apiKey?: string): Promise<void> {
    const cleanUser = (username !== undefined ? username : this.setlistUsername()).trim();
    const cleanKey = (apiKey !== undefined ? apiKey : this.setlistApiKey()).trim();

    if (!cleanUser) {
      this.setlistSyncState.set({
        syncing: false,
        page: 0,
        totalPages: 0,
        processed: 0,
        total: 0,
        error: 'Please enter your setlist.fm username.',
        success: false
      });
      return;
    }

    if (!cleanKey) {
      this.setlistSyncState.set({
        syncing: false,
        page: 0,
        totalPages: 0,
        processed: 0,
        total: 0,
        error: 'Please enter your setlist.fm API key.',
        success: false
      });
      return;
    }

    await this.saveSetlistCredentials(cleanUser, cleanKey);

    this.setlistSyncState.set({
      syncing: true,
      page: 1,
      totalPages: 1,
      processed: 0,
      total: 0,
      error: '',
      success: false
    });

    try {
      const res = await this.sendMessage<{
        success: boolean;
        data?: { count: number; total: number; errors: any[] };
        error?: string;
      }>({
        type: 'SETLIST_FM_SYNC',
        username: cleanUser,
        apiKey: cleanKey
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to sync concerts from setlist.fm.');
      }

      this.setlistSyncState.set({
        syncing: false,
        page: 1,
        totalPages: 1,
        processed: res.data.count,
        total: res.data.total,
        error: '',
        success: true
      });

      await this.fetchAllMedia();
    } catch (err: any) {
      this.setlistSyncState.set({
        syncing: false,
        page: 0,
        totalPages: 0,
        processed: 0,
        total: 0,
        error: err?.message || 'Failed to sync concerts from setlist.fm.',
        success: false
      });
    }
  }

  getSetlistConcertUrl(item: ExtensionMediaItem): string {
    const query = `${item.title || ''} ${item.venue || ''} ${item.city || ''}`.trim();
    return `https://www.setlist.fm/search?query=${encodeURIComponent(query)}`;
  }

  async openTab(url: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      await chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  }

  private sendMessage<T = any>(message: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        reject(new Error('chrome.runtime.sendMessage is not available.'));
        return;
      }
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
}
