import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdsAuthService } from '../../services/pds-auth.service';
import { PdsRepositoryService } from '../../services/pds-repo.service';
import { DirectMetadataService } from '../../services/direct-metadata.service';

@Component({
  selector: 'app-pds-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e0e0e]/40 backdrop-blur-xs animate-fadeIn">
      <div class="bg-[#faf7f2] border border-[rgba(14,14,14,0.24)] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl text-[#0e0e0e]">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-4 border-b border-[rgba(14,14,14,0.14)]">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-xl bg-[#0e0e0e] flex items-center justify-center text-[#f0ede6] font-bold text-xs shadow-sm">
              t*
            </div>
            <div>
              <h3 class="text-xl font-serif font-bold text-[#0e0e0e]">
                {{ auth.isAuthenticated() ? 'AT Protocol Account' : 'Connect Your Account' }}
              </h3>
              <p class="text-[11px] font-mono text-[#9a8f7e]">
                {{ auth.isAuthenticated() ? 'Connected to personal data repository' : 'Standard AT Protocol OAuth authentication' }}
              </p>
            </div>
          </div>
          <button (click)="close.emit()" class="text-[#9a8f7e] hover:text-[#0e0e0e] transition-colors p-1.5 rounded-lg hover:bg-[#0e0e0e]/5">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- If Already Connected -->
        <div *ngIf="auth.isAuthenticated()" class="space-y-4">
          <div class="bg-[#f0ede6] border border-[rgba(14,14,14,0.14)] rounded-xl p-4 space-y-2 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="text-[#3d3830]">Connected Handle</span>
              <span class="font-bold text-[#0e0e0e]">{{ auth.currentHandle() }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[#3d3830]">User DID</span>
              <span class="text-[11px] text-[#9a8f7e] truncate max-w-[200px]" [title]="auth.currentDid()">
                {{ auth.currentDid() }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[#3d3830]">Auth Type</span>
              <span class="text-[#0e0e0e] font-semibold">
                {{ auth.isOAuth() ? '🔒 AT Protocol OAuth (PKCE/DPoP)' : '🔑 Direct Password Session' }}
              </span>
            </div>
          </div>

          <!-- TMDB API Key Settings -->
          <div class="space-y-1.5 pt-2 border-t border-[rgba(14,14,14,0.14)]">
            <div class="flex items-center justify-between font-mono text-xs">
              <label class="font-bold uppercase text-[10px] text-[#3d3830] tracking-wider">TMDB API Key (Optional)</label>
              <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#0e0e0e] hover:underline">Get Key ↗</a>
            </div>
            <input type="text" 
                   [(ngModel)]="tmdbKey" 
                   (ngModelChange)="onTmdbKeyChange()"
                   placeholder="Enter your free TMDB API key for movie posters" 
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] font-mono placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            <p class="text-[10px] font-mono text-[#9a8f7e]">Stored locally in your browser to enrich movie cover art.</p>
          </div>

          <!-- Last.fm API Key Settings -->
          <div class="space-y-1.5 pt-2 border-t border-[rgba(14,14,14,0.14)]">
            <div class="flex items-center justify-between font-mono text-xs">
              <label class="font-bold uppercase text-[10px] text-[#3d3830] tracking-wider">Last.fm API Key (Optional)</label>
              <a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#0e0e0e] hover:underline">Get Key ↗</a>
            </div>
            <input type="text" 
                   [(ngModel)]="lastfmKey" 
                   (ngModelChange)="onLastfmKeyChange()"
                   placeholder="Enter your free Last.fm API key for band pictures" 
                   class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] font-mono placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            <p class="text-[10px] font-mono text-[#9a8f7e]">Stored locally in your browser to enrich concert and band artwork.</p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-[rgba(14,14,14,0.14)] gap-2 font-mono text-xs">
            <button (click)="syncPds()" [disabled]="repo.loading()"
                    class="px-3.5 py-2 bg-[#0e0e0e] hover:bg-neutral-800 text-[#f0ede6] rounded-xl font-semibold shadow-sm transition-all">
              {{ repo.loading() ? 'Syncing...' : 'Sync Records' }}
            </button>
            <div class="flex items-center space-x-2">
              <button (click)="logout()" 
                      class="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 border border-rose-500/30 rounded-xl transition-all">
                Disconnect
              </button>
            </div>
          </div>
        </div>

        <!-- Login Selection Tabs -->
        <div *ngIf="!auth.isAuthenticated()" class="space-y-4">

          <!-- Method Switcher -->
          <div class="grid grid-cols-3 p-1 bg-[#f0ede6] rounded-xl font-mono text-[11px] border border-[rgba(14,14,14,0.1)]">
            <button type="button"
                    (click)="setAuthMode('apppassword')"
                    [ngClass]="authMode === 'apppassword' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold shadow-xs' : 'text-[#3d3830] hover:text-[#0e0e0e]'"
                    class="py-1.5 rounded-lg transition-all text-center">
              🔑 App Password
            </button>
            <button type="button"
                    (click)="setAuthMode('oauth')"
                    [ngClass]="authMode === 'oauth' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold shadow-xs' : 'text-[#3d3830] hover:text-[#0e0e0e]'"
                    class="py-1.5 rounded-lg transition-all text-center">
              🦋 OAuth
            </button>
            <button type="button"
                    (click)="setAuthMode('custom')"
                    [ngClass]="authMode === 'custom' ? 'bg-[#0e0e0e] text-[#f0ede6] font-bold shadow-xs' : 'text-[#3d3830] hover:text-[#0e0e0e]'"
                    class="py-1.5 rounded-lg transition-all text-center">
              🖥️ Custom PDS
            </button>
          </div>

          <!-- 1. Bluesky App Password Form (Instant & 100% reliable) -->
          <form *ngIf="authMode === 'apppassword'" (ngSubmit)="handleAppPasswordLogin()" class="space-y-3.5">
            <div class="space-y-1 font-mono text-xs">
              <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">Bluesky Handle</label>
              <input type="text" 
                     [(ngModel)]="identifier" 
                     name="identifier" 
                     required
                     placeholder="e.g. kthom91.bsky.social" 
                     class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            </div>

            <div class="space-y-1 font-mono text-xs">
              <div class="flex items-center justify-between">
                <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">App Password</label>
                <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer" class="text-[10px] text-[#0e0e0e] hover:underline">Create App Password ↗</a>
              </div>
              <input type="password" 
                     [(ngModel)]="password" 
                     name="password" 
                     required
                     placeholder="••••-••••-••••-••••"
                     class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
              <p class="text-[10px] text-[#9a8f7e]">
                In Bluesky app: <em>Settings &rarr; Privacy & Security &rarr; App Passwords</em>.
              </p>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl font-mono text-xs text-rose-900">
              {{ errorMessage }}
            </div>

            <button type="submit" 
                    [disabled]="submitting || !identifier || !password"
                    class="w-full py-2.5 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-40 text-[#f0ede6] font-mono font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2">
              <div *ngIf="submitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ submitting ? 'Connecting to Bluesky...' : 'Sign In with App Password' }}</span>
            </button>
          </form>

          <!-- 2. AT Protocol OAuth Form -->
          <div *ngIf="authMode === 'oauth'" class="space-y-4">
            <div class="space-y-1.5 font-mono text-xs">
              <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">Your Bluesky / AT Protocol Handle</label>
              <input type="text" 
                     [(ngModel)]="identifier" 
                     (keydown.enter)="handleOAuthLogin()"
                     placeholder="e.g. kthom91.bsky.social"
                     class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2.5 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
              <p class="text-[10px] text-[#9a8f7e]">
                Redirects to Bluesky's authorization server to authenticate via standard PKCE OAuth.
              </p>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl font-mono text-xs text-rose-900">
              {{ errorMessage }}
            </div>

            <button type="button" 
                    (click)="handleOAuthLogin()"
                    [disabled]="submitting || !identifier.trim()"
                    class="w-full py-2.5 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-40 text-[#f0ede6] font-mono font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2">
              <div *ngIf="submitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ submitting ? 'Redirecting to Bluesky...' : 'Sign In with OAuth' }}</span>
            </button>
          </div>

          <!-- 3. Custom / Local PDS Form -->
          <form *ngIf="authMode === 'custom'" (ngSubmit)="handleCustomLogin()" class="space-y-3.5">
            <div class="space-y-1 font-mono text-xs">
              <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">PDS Endpoint URL</label>
              <input type="url" 
                     [(ngModel)]="pdsUrl" 
                     name="pdsUrl" 
                     required
                     placeholder="http://localhost:3000"
                     class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            </div>

            <div class="space-y-1 font-mono text-xs">
              <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">Handle or Email</label>
              <input type="text" 
                     [(ngModel)]="identifier" 
                     name="identifier" 
                     required
                     placeholder="user123.trackstar.test"
                     class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            </div>

            <div class="space-y-1 font-mono text-xs">
              <label class="block text-[10px] font-bold uppercase text-[#3d3830] tracking-wider">Password</label>
              <input type="password" 
                     [(ngModel)]="password" 
                     name="password" 
                     required
                     placeholder="••••••••••••"
                     class="w-full bg-white border border-[rgba(14,14,14,0.24)] rounded-xl px-3.5 py-2 text-xs text-[#0e0e0e] placeholder-[#9a8f7e] focus:outline-none focus:border-[#0e0e0e]">
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl font-mono text-xs text-rose-900">
              {{ errorMessage }}
            </div>

            <button type="submit" 
                    [disabled]="submitting || !identifier || !password"
                    class="w-full py-2.5 bg-[#0e0e0e] hover:bg-neutral-800 disabled:opacity-40 text-[#f0ede6] font-mono font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2">
              <div *ngIf="submitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ submitting ? 'Connecting to PDS...' : 'Connect to Custom PDS' }}</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  `
})
export class PdsLoginModalComponent {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  metadata = inject(DirectMetadataService);

  close = output<void>();

  authMode: 'apppassword' | 'oauth' | 'custom' = 'apppassword';
  pdsUrl = 'http://localhost:3000';
  identifier = '';
  password = '';

  tmdbKey = this.metadata.getTmdbApiKey();
  lastfmKey = this.metadata.getLastfmApiKey();
  submitting = false;
  errorMessage: string | null = null;

  setAuthMode(mode: 'apppassword' | 'oauth' | 'custom') {
    this.authMode = mode;
    this.errorMessage = null;
  }

  onTmdbKeyChange() {
    this.metadata.setTmdbApiKey(this.tmdbKey);
    if (this.tmdbKey.trim()) {
      this.repo.enrichMissingMetadata();
    }
  }

  onLastfmKeyChange() {
    this.metadata.setLastfmApiKey(this.lastfmKey);
    if (this.lastfmKey.trim()) {
      this.repo.enrichMissingMetadata();
    }
  }

  async handleAppPasswordLogin() {
    this.submitting = true;
    this.errorMessage = null;

    try {
      await this.auth.login('https://bsky.social', this.identifier, this.password);
      await this.repo.syncFromPds();
      this.close.emit();
    } catch (err: any) {
      console.error('Bluesky App Password Login Error:', err);
      this.errorMessage = err?.message || 'Failed to authenticate with Bluesky. Please verify your handle and App Password.';
    } finally {
      this.submitting = false;
    }
  }

  async handleOAuthLogin() {
    if (!this.identifier.trim()) return;
    this.submitting = true;
    this.errorMessage = null;

    try {
      await this.auth.loginWithOAuth(this.identifier);
    } catch (err: any) {
      console.error('OAuth Login Error:', err);
      this.errorMessage = err?.message || 'Failed to initiate OAuth login. If running into domain issues, try using the App Password tab.';
      this.submitting = false;
    }
  }

  async handleCustomLogin() {
    this.submitting = true;
    this.errorMessage = null;

    try {
      await this.auth.login(this.pdsUrl, this.identifier, this.password);
      await this.repo.syncFromPds();
      this.close.emit();
    } catch (err: any) {
      console.error('Custom PDS Login error:', err);
      this.errorMessage = err?.message || 'Invalid credentials or PDS unreachable.';
    } finally {
      this.submitting = false;
    }
  }

  async syncPds() {
    await this.repo.syncFromPds();
  }

  async logout() {
    await this.auth.logout();
  }
}
