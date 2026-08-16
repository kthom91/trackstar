import { Injectable, signal, computed } from '@angular/core';
import { BskyAgent, AtpSessionData, AtpSessionEvent } from '@atproto/api';
import { PdsUserSession } from '@trackstar/pds';

export type { PdsUserSession };

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
      this.agentInstance = this.createAgent(pdsUrl);
    }
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
          console.log('[PdsAuthService] Session persisted/refreshed automatically:', evt);
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
    if (saved) {
      this.agentInstance = this.createAgent(saved.pdsUrl);
      const sessionData: AtpSessionData = {
        did: saved.did,
        handle: saved.handle,
        email: saved.email,
        accessJwt: saved.accessJwt,
        refreshJwt: saved.refreshJwt,
        active: true,
      };
      this.agentInstance.sessionManager.session = sessionData;
    }
  }

  async refreshSession(): Promise<boolean> {
    const saved = this.session();
    if (!saved || !saved.refreshJwt) return false;

    const cleanUrl = (saved.pdsUrl || 'http://localhost:3000').replace(/\/$/, '');

    try {
      // 1. Direct XRPC call to refreshSession using refreshJwt
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

      // Re-initialize agent instance with fresh session without network call
      this.agentInstance = this.createAgent(cleanUrl);
      this.agentInstance.sessionManager.session = {
        did: updatedSession.did,
        handle: updatedSession.handle,
        email: updatedSession.email,
        accessJwt: updatedSession.accessJwt,
        refreshJwt: updatedSession.refreshJwt,
        active: true
      };

      console.log('[PdsAuthService] Refreshed tokens successfully for:', updatedSession.handle);
      return true;
    } catch (err) {
      console.warn('[PdsAuthService] Error during token refresh attempt:', err);
      return false;
    }
  }

  async login(pdsUrl: string, identifier: string, password: string): Promise<PdsUserSession> {
    const cleanUrl = pdsUrl.trim().replace(/\/$/, '') || 'http://localhost:3000';
    const agent = this.createAgent(cleanUrl);
    
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
