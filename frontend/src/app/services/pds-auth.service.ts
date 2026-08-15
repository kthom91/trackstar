import { Injectable, signal, computed } from '@angular/core';
import { BskyAgent, AtpSessionData } from '@atproto/api';

export interface PdsUserSession {
  did: string;
  handle: string;
  email?: string;
  pdsUrl: string;
  accessJwt: string;
  refreshJwt: string;
}

const STORAGE_KEY = 'trackstar_pds_session';

@Injectable({
  providedIn: 'root'
})
export class PdsAuthService {
  private agentInstance: BskyAgent | null = null;

  // Reactive State
  readonly session = signal<PdsUserSession | null>(this.loadStoredSession());
  readonly isAuthenticated = computed(() => !!this.session());
  readonly currentHandle = computed(() => this.session()?.handle || '');
  readonly currentDid = computed(() => this.session()?.did || '');
  readonly currentPdsUrl = computed(() => this.session()?.pdsUrl || 'http://localhost:3000');

  constructor() {
    this.initAgentFromStorage();
  }

  getAgent(): BskyAgent {
    if (!this.agentInstance) {
      const pdsUrl = this.session()?.pdsUrl || 'http://localhost:3000';
      this.agentInstance = new BskyAgent({ service: pdsUrl });
    }
    return this.agentInstance;
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
    if (saved) {
      this.agentInstance = new BskyAgent({ service: saved.pdsUrl });
      try {
        const sessionData: AtpSessionData = {
          did: saved.did,
          handle: saved.handle,
          email: saved.email,
          accessJwt: saved.accessJwt,
          refreshJwt: saved.refreshJwt,
          active: true,
        };
        this.agentInstance.resumeSession(sessionData).then(res => {
          if (res.success) {
            console.log('PDS session resumed successfully for:', saved.handle);
          }
        }).catch(err => {
          console.warn('Could not resume PDS session directly (using stored session):', err);
        });
      } catch (err) {
        console.warn('Error during session resume attempt:', err);
      }
    }
  }

  async login(pdsUrl: string, identifier: string, password: string): Promise<PdsUserSession> {
    const cleanUrl = pdsUrl.trim().replace(/\/$/, '') || 'http://localhost:3000';
    const agent = new BskyAgent({ service: cleanUrl });
    
    // Attempt session creation via AT Protocol XRPC
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
    this.session.set(userSession);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));

    return userSession;
  }

  logout(): void {
    this.session.set(null);
    this.agentInstance = null;
    localStorage.removeItem(STORAGE_KEY);
    console.log('Logged out from PDS.');
  }
}
