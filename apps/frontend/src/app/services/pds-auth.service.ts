import { Injectable, signal, computed } from '@angular/core';
import { BskyAgent, Agent, AtpSessionData, AtpSessionEvent } from '@atproto/api';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';
import { PdsUserSession } from '@trackstar/pds';

export type { PdsUserSession };

const STORAGE_KEY = 'trackstar_pds_session';

@Injectable({
  providedIn: 'root'
})
export class PdsAuthService {
  private agentInstance: (BskyAgent | Agent) | null = null;
  private oauthClient: BrowserOAuthClient | null = null;
  private oauthSession: OAuthSession | null = null;

  // Reactive State
  readonly session = signal<PdsUserSession | null>(this.loadStoredSession());
  readonly isAuthenticated = computed(() => !!this.session());
  readonly currentHandle = computed(() => this.session()?.handle || '');
  readonly currentDid = computed(() => this.session()?.did || '');
  readonly currentPdsUrl = computed(() => this.session()?.pdsUrl || 'https://bsky.social');
  readonly isOAuth = signal<boolean>(false);

  constructor() {
    this.initOAuth();
    this.initAgentFromStorage();
  }

  /**
   * Initializes the standard AT Protocol BrowserOAuthClient for SPAs.
   */
  private async initOAuth(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      this.oauthClient = new BrowserOAuthClient({
        handleResolver: 'https://bsky.social',
        clientMetadata: undefined
      });

      // Handle OAuth redirect callback and restore existing OAuth session
      const result = await this.oauthClient.init();
      if (result?.session) {
        this.oauthSession = result.session;
        this.isOAuth.set(true);
        const agent = new Agent(result.session);
        this.agentInstance = agent;

        const did = String(result.session.sub);
        let handle: string = did;

        try {
          const profile = await agent.getProfile({ actor: did as any });
          handle = String(profile.data.handle || did);
        } catch {
          // Fallback to DID if profile resolution fails
        }

        const userSession: PdsUserSession = {
          did: did,
          handle: handle,
          pdsUrl: 'https://bsky.social',
          accessJwt: '',
          refreshJwt: ''
        };

        this.session.set(userSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
        console.log('[PdsAuthService] Authenticated via AT Protocol OAuth (PKCE/DPoP):', handle);

        // Clean query parameters from URL if returning from OAuth redirect
        if (window.location.search.includes('code=') || window.location.search.includes('state=')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (err) {
      console.warn('[PdsAuthService] OAuth initialization notice:', err);
    }
  }

  /**
   * Primary recommended SPA login: initiates standard AT Protocol OAuth flow with PKCE.
   */
  async loginWithOAuth(handle: string): Promise<void> {
    if (!this.oauthClient) {
      await this.initOAuth();
    }
    if (!this.oauthClient) {
      throw new Error('OAuth Client could not be initialized');
    }

    const cleanHandle = handle.trim().replace(/^@/, '');
    if (!cleanHandle) {
      throw new Error('Please enter a valid Bluesky / AT Protocol handle');
    }

    console.log(`[PdsAuthService] Initiating OAuth for ${cleanHandle}...`);
    await this.oauthClient.signIn(cleanHandle, {
      prompt: 'login'
    });
  }

  /**
   * Returns the active authenticated Agent (either DPoP OAuth Agent or BskyAgent).
   */
  getAgent(): BskyAgent | Agent {
    if (this.agentInstance) {
      return this.agentInstance;
    }

    const current = this.session();
    const pdsUrl = current?.pdsUrl || 'http://localhost:3000';
    const agent = this.createAgent(pdsUrl);
    if (current?.accessJwt) {
      agent.api.setHeader('Authorization', `Bearer ${current.accessJwt}`);
    }
    this.agentInstance = agent;
    return this.agentInstance;
  }

  private createAgent(service: string): BskyAgent {
    return new BskyAgent({
      service: service,
      persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
        if (sess) {
          const current = this.session();
          const userSession: PdsUserSession = {
            did: sess.did,
            handle: sess.handle,
            email: sess.email || current?.email,
            pdsUrl: current?.pdsUrl || service,
            accessJwt: sess.accessJwt,
            refreshJwt: sess.refreshJwt
          };
          this.session.set(userSession);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
          console.log('[PdsAuthService] Password session persisted/refreshed automatically:', evt);
        } else if (evt === 'expired') {
          console.warn('[PdsAuthService] Session expired.');
        }
      }
    });
  }

  private loadStoredSession(): PdsUserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse stored PDS session:', e);
    }
    return null;
  }

  private initAgentFromStorage(): void {
    const saved = this.session();
    if (saved && saved.accessJwt && !this.oauthSession) {
      const agent = this.createAgent(saved.pdsUrl);
      agent.api.setHeader('Authorization', `Bearer ${saved.accessJwt}`);
      this.agentInstance = agent;
    }
  }

  async refreshSession(): Promise<boolean> {
    const saved = this.session();
    if (!saved || !saved.refreshJwt) return false;

    const cleanUrl = (saved.pdsUrl || 'http://localhost:3000').replace(/\/$/, '');

    try {
      const res = await fetch(`${cleanUrl}/xrpc/com.atproto.server.refreshSession`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${saved.refreshJwt}`
        }
      });

      if (!res.ok) {
        console.warn('[PdsAuthService] refreshSession XRPC failed with status:', res.status);
        return false;
      }

      const refreshedData = await res.json();
      const updatedSession: PdsUserSession = {
        did: refreshedData.did || saved.did,
        handle: refreshedData.handle || saved.handle,
        email: refreshedData.email || saved.email,
        pdsUrl: cleanUrl,
        accessJwt: refreshedData.accessJwt,
        refreshJwt: refreshedData.refreshJwt
      };

      this.session.set(updatedSession);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));

      const agent = this.createAgent(cleanUrl);
      agent.api.setHeader('Authorization', `Bearer ${updatedSession.accessJwt}`);
      this.agentInstance = agent;

      console.log('[PdsAuthService] Refreshed tokens successfully for:', updatedSession.handle);
      return true;
    } catch (err) {
      console.warn('[PdsAuthService] Error during token refresh attempt:', err);
      return false;
    }
  }

  /**
   * Direct password authentication for local development or self-hosted PDS.
   */
  async login(pdsUrl: string, identifier: string, password: string): Promise<PdsUserSession> {
    const cleanUrl = pdsUrl.trim().replace(/\/$/, '') || 'http://localhost:3000';
    const agent = this.createAgent(cleanUrl);
    
    const res = await agent.login({
      identifier: identifier.trim(),
      password: password.trim()
    });

    if (!res.success) {
      throw new Error('Failed to authenticate with PDS');
    }

    const userSession: PdsUserSession = {
      did: res.data.did,
      handle: res.data.handle,
      email: res.data.email,
      pdsUrl: cleanUrl,
      accessJwt: res.data.accessJwt,
      refreshJwt: res.data.refreshJwt
    };

    this.agentInstance = agent;
    this.isOAuth.set(false);
    this.session.set(userSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));

    return userSession;
  }

  async logout(): Promise<void> {
    if (this.oauthSession) {
      try {
        await this.oauthSession.signOut();
      } catch (e) {
        console.warn('OAuth signOut notice:', e);
      }
      this.oauthSession = null;
    }
    this.session.set(null);
    this.agentInstance = null;
    this.isOAuth.set(false);
    localStorage.removeItem(STORAGE_KEY);
    console.log('Logged out from PDS.');
  }
}
