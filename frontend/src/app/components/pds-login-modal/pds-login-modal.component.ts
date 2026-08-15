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
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div class="bg-[#131b2e] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white font-black text-sm shadow-md">
              t*
            </div>
            <div>
              <h3 class="text-lg font-bold text-white font-['Outfit']">
                {{ auth.isAuthenticated() ? 'AT Protocol Account' : 'Connect Your PDS' }}
              </h3>
              <p class="text-[11px] text-gray-400">
                {{ auth.isAuthenticated() ? 'Connected to personal data repository' : 'Authenticate with your personal data server' }}
              </p>
            </div>
          </div>
          <button (click)="close.emit()" class="text-gray-400 hover:text-white transition-colors p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- If Already Connected -->
        <div *ngIf="auth.isAuthenticated()" class="space-y-4">
          <div class="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">Connected Handle</span>
              <span class="text-xs font-semibold text-indigo-400 font-mono">{{ auth.currentHandle() }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">User DID</span>
              <span class="text-[11px] text-gray-300 font-mono truncate max-w-[200px]" [title]="auth.currentDid()">
                {{ auth.currentDid() }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">PDS Server</span>
              <span class="text-xs text-gray-300 font-mono">{{ auth.currentPdsUrl() }}</span>
            </div>
          </div>

          <!-- TMDB API Key Settings -->
          <div class="space-y-2 pt-2 border-t border-white/5">
            <label class="block text-xs font-semibold text-gray-300">TMDB API Key (Optional)</label>
            <input type="text" 
                   [(ngModel)]="tmdbKey" 
                   (ngModelChange)="onTmdbKeyChange()"
                   placeholder="Enter your free TMDB API key for movie posters" 
                   class="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500">
            <p class="text-[10px] text-gray-500">Stored locally in your browser to enrich movie cover art.</p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-white/10">
            <button (click)="syncPds()" [disabled]="repo.loading()"
                    class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all">
              {{ repo.loading() ? 'Syncing...' : 'Sync Records Now' }}
            </button>
            <button (click)="logout()" 
                    class="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-semibold transition-all">
              Disconnect
            </button>
          </div>
        </div>

        <!-- Login Form -->
        <form *ngIf="!auth.isAuthenticated()" (ngSubmit)="handleLogin()" class="space-y-4">
          
          <!-- Server Presets -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-gray-300">PDS Server Presets</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" 
                      (click)="setPdsPreset('http://localhost:3000')"
                      [ngClass]="pdsUrl === 'http://localhost:3000' ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'"
                      class="px-3 py-1.5 rounded-xl border text-xs font-medium text-left transition-all">
                🖥️ Local PDS (:3000)
              </button>
              <button type="button" 
                      (click)="setPdsPreset('https://bsky.social')"
                      [ngClass]="pdsUrl === 'https://bsky.social' ? 'bg-indigo-600/30 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'"
                      class="px-3 py-1.5 rounded-xl border text-xs font-medium text-left transition-all">
                🦋 Bluesky (bsky.social)
              </button>
            </div>
          </div>

          <!-- PDS URL -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-gray-300">PDS Endpoint</label>
            <input type="url" 
                   [(ngModel)]="pdsUrl" 
                   name="pdsUrl" 
                   required
                   placeholder="http://localhost:3000"
                   class="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500">
          </div>

          <!-- Identifier -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-gray-300">Handle or Email</label>
            <input type="text" 
                   [(ngModel)]="identifier" 
                   name="identifier" 
                   required
                   placeholder="kentrain.trackstar.test or alice.bsky.social"
                   class="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500">
          </div>

          <!-- Password / App Password -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-gray-300">Password / App Password</label>
            </div>
            <input type="password" 
                   [(ngModel)]="password" 
                   name="password" 
                   required
                   placeholder="••••••••••••"
                   class="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500">
            <p class="text-[10px] text-gray-500">For Bluesky accounts, use an App Password generated in Settings &gt; App Passwords.</p>
          </div>

          <!-- Error Message -->
          <div *ngIf="errorMessage" class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
            {{ errorMessage }}
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button type="submit" 
                    [disabled]="submitting || !identifier || !password"
                    class="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center space-x-2">
              <div *ngIf="submitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{{ submitting ? 'Connecting to PDS...' : 'Connect to PDS' }}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  `
})
export class PdsLoginModalComponent {
  auth = inject(PdsAuthService);
  repo = inject(PdsRepositoryService);
  metadata = inject(DirectMetadataService);

  close = output<void>();

  pdsUrl = 'http://localhost:3000';
  identifier = 'kentrain.trackstar.test';
  password = 'password123';

  tmdbKey = this.metadata.getTmdbApiKey();
  submitting = false;
  errorMessage: string | null = null;

  setPdsPreset(url: string) {
    this.pdsUrl = url;
    if (url === 'https://bsky.social') {
      this.identifier = '';
      this.password = '';
    } else {
      this.identifier = 'kentrain.trackstar.test';
      this.password = 'password123';
    }
  }

  onTmdbKeyChange() {
    this.metadata.setTmdbApiKey(this.tmdbKey);
    if (this.tmdbKey.trim()) {
      this.repo.enrichMissingMetadata();
    }
  }

  async handleLogin() {
    this.submitting = true;
    this.errorMessage = null;

    try {
      await this.auth.login(this.pdsUrl, this.identifier, this.password);
      await this.repo.syncFromPds();
      this.close.emit();
    } catch (err: any) {
      console.error('Login error:', err);
      this.errorMessage = err?.message || 'Invalid credentials or PDS unreachable.';
    } finally {
      this.submitting = false;
    }
  }

  async syncPds() {
    await this.repo.syncFromPds();
  }

  logout() {
    this.auth.logout();
  }
}
