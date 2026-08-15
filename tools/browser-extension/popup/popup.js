// Trackstar Chrome Extension - Popup Controller (Dynamic Integrations & Unsynced Items)

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const connectionPill = document.getElementById('connection-pill');
  const btnToggleSettings = document.getElementById('btn-toggle-settings');
  const settingsView = document.getElementById('settings-view');
  const mainView = document.getElementById('main-view');
  const formSettings = document.getElementById('form-settings');
  const inputPdsUrl = document.getElementById('input-pds-url');
  const inputHandle = document.getElementById('input-handle');
  const inputPassword = document.getElementById('input-password');
  const btnPresetLocal = document.getElementById('btn-preset-local');
  const btnPresetBsky = document.getElementById('btn-preset-bsky');
  const settingsError = document.getElementById('settings-error');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  // Main Tabs & Panels
  const tabBtns = document.querySelectorAll('.main-tab-btn');
  const panelIntegrations = document.getElementById('panel-integrations');
  const panelUnsynced = document.getElementById('panel-unsynced');
  const integrationsList = document.getElementById('integrations-list');
  const unsyncedList = document.getElementById('unsynced-list');
  const unsyncedEmpty = document.getElementById('unsynced-empty');
  const badgeUnsyncedCount = document.getElementById('badge-unsynced-count');
  const loadingSpinner = document.getElementById('loading-spinner');
  const emptyState = document.getElementById('empty-state');
  const btnRefresh = document.getElementById('btn-refresh');

  let allMedia = [];
  let currentConfig = {};
  let activeTab = 'integrations';

  // RSS polling state (persisted to storage)
  let lbRssUsername = '';
  let lbRssState = { polling: false, newCount: 0, totalCount: 0, error: '' };

  // =========================================================================
  // LETTERBOXD RSS PARSER — runs in popup context where DOMParser is available
  // =========================================================================
  function parseLetterboxdRss(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const items = Array.from(doc.querySelectorAll('channel > item'));
    const NS = 'https://boxd.it/';

    return items.map(item => {
      const getText = (tag, ns) => {
        const el = ns ? item.getElementsByTagNameNS(ns, tag)[0] : item.querySelector(tag);
        return el ? (el.textContent || '').trim() : '';
      };

      const link = getText('link');
      const filmTitle = getText('filmTitle', NS) || getText('title');
      const filmYear = getText('filmYear', NS);
      const ratingRaw = getText('memberRating', NS);
      let watchedDate = getText('watchedDate', NS) || getText('pubDate');

      // Normalize YYYY-MM-DD → ISO
      if (watchedDate && /^\d{4}-\d{2}-\d{2}$/.test(watchedDate)) {
        watchedDate = `${watchedDate}T00:00:00Z`;
      }

      let rating = null;
      if (ratingRaw) {
        const val = Math.round(parseFloat(ratingRaw));
        rating = val > 0 ? Math.max(1, Math.min(5, val)) : null;
      }

      return { link, title: filmTitle, year: filmYear, rating, watchedDate };
    }).filter(i => i.link && i.title);
  }

  // =========================================================================
  // DYNAMIC INTEGRATIONS REGISTRY
  // Easily extensible: Add new platforms (e.g., Spotify, Goodreads, Trakt) here
  // =========================================================================
  const INTEGRATIONS = [
    {
      id: 'letterboxd',
      name: 'Letterboxd',
      category: 'Movies & Diary',
      avatarClass: 'letterboxd',
      logoSrc: '../icons/services/letterboxd_favicon.png',
      exportLabel: 'Export Letterboxd',
      exportUrl: 'https://letterboxd.com/settings/data/',
      exportTooltip: 'Open Letterboxd Account Data export page to run 1-click sync',
      syncLabel: 'Sync Watchlist',
      syncTooltip: 'Open Letterboxd Watchlist to run 1-click watchlist ingest',
      getSyncCount: (media) => media.filter(m => m.mediaType === 'movie' && m.status === 'want_to_consume').length,
      diaryLabel: 'Sync Diary',
      diaryTooltip: 'View unsynced diary entries — completed movies not yet logged on Letterboxd',
      getDiaryCount: (media) => media.filter(m => m.mediaType === 'movie' && m.status === 'completed' && !m.isSynced).length,
      onExport: async () => {
        await chrome.tabs.create({ url: 'https://letterboxd.com/settings/data/' });
      },
      onSync: async (config) => {
        let username = 'kentrain';
        if (config?.handle) {
          username = config.handle.split('.')[0] || 'kentrain';
        }
        await chrome.tabs.create({ url: `https://letterboxd.com/${username}/watchlist/` });
      },
      onDiary: null, // handled inline via tab switch
      onRenderExtra: (card) => {
        const section = document.createElement('div');
        section.className = 'rss-section';
        section.innerHTML = `
          <div class="rss-section-label">
            <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7M6 17a1 1 0 110 2 1 1 0 010-2z"/>
            </svg>
            Poll RSS Feed
          </div>
          <div class="rss-input-row">
            <input id="rss-lb-username" type="text" class="rss-username-input" placeholder="letterboxd username" value="${lbRssUsername}" />
            <button id="rss-lb-poll-btn" class="btn-rss-poll">Poll RSS</button>
          </div>
          <div id="rss-lb-status" class="rss-status hidden"></div>
        `;
        card.appendChild(section);

        const btn = section.querySelector('#rss-lb-poll-btn');
        const input = section.querySelector('#rss-lb-username');
        btn.addEventListener('click', () => {
          lbRssUsername = input.value.trim();
          pollLetterboxdRss(lbRssUsername);
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            lbRssUsername = input.value.trim();
            pollLetterboxdRss(lbRssUsername);
          }
        });
      }
    },
    {
      id: 'storygraph',
      name: 'StoryGraph',
      category: 'Books & Reading',
      avatarClass: 'storygraph',
      logoSrc: '../icons/services/storygraph.png',

      exportLabel: 'Export StoryGraph',
      exportUrl: 'https://app.thestorygraph.com/user-export',
      exportTooltip: 'Open StoryGraph user export page to run 1-click sync',
      syncLabel: 'Sync StoryGraph',
      syncTooltip: 'Open StoryGraph Goodreads import page',
      getSyncCount: null,
      onExport: async () => {
        await chrome.tabs.create({ url: 'https://app.thestorygraph.com/user-export' });
      },
      onSync: async () => {
        await chrome.tabs.create({ url: 'https://app.thestorygraph.com/import-goodreads' });
      }
    },
    {
      id: 'setlist',
      name: 'setlist.fm',
      category: 'Concerts & Live Shows',
      avatarClass: 'setlist',
      logoSrc: '../icons/services/setlistfm.png',
      exportLabel: 'Export setlist.fm',
      exportUrl: 'http://localhost:4200/importers',
      exportTooltip: 'Open Trackstar Importers for setlist.fm',
      syncLabel: null,
      getSyncCount: null,
      onExport: async () => {
        await chrome.tabs.create({ url: 'http://localhost:4200/importers' });
      },
      onSync: null
    }
  ];

  // Helper: Construct assisted 1-by-1 Letterboxd review URL
  function getLetterboxdReviewUrl(item) {
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

  // Helper: Construct setlist.fm concert URL
  function getSetlistConcertUrl(item) {
    if (item.setlistUrl) return item.setlistUrl;
    const query = `${item.title || ''} ${item.venue || ''} ${item.city || ''}`.trim();
    return `https://www.setlist.fm/search?query=${encodeURIComponent(query)}`;
  }

  // Helper: SVG Icons for Media Types
  function getTypeSvg(type) {
    if (type === 'book') {
      return `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`;
    }
    if (type === 'concert') {
      return `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>`;
    }
    return `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"></path></svg>`;
  }

  // =========================================================================
  // LETTERBOXD RSS POLL ORCHESTRATOR
  // =========================================================================
  async function pollLetterboxdRss(username) {
    if (!username) return;
    lbRssState = { polling: true, newCount: 0, totalCount: 0, error: '' };
    updateRssUi();

    try {
      const feedUrl = `https://letterboxd.com/${username.trim()}/rss/`;
      const fetchRes = await chrome.runtime.sendMessage({ type: 'FETCH_EXTERNAL_URL', url: feedUrl });
      if (!fetchRes.success) throw new Error(fetchRes.error || 'Failed to fetch RSS feed.');

      const parsed = parseLetterboxdRss(fetchRes.data);
      if (parsed.length === 0) {
        lbRssState = { polling: false, newCount: 0, totalCount: 0, error: 'No diary entries found in RSS feed.' };
        updateRssUi();
        return;
      }

      const ingestRes = await chrome.runtime.sendMessage({ type: 'LETTERBOXD_RSS_INGEST', items: parsed });
      if (!ingestRes.success) throw new Error(ingestRes.error || 'Ingest failed.');

      lbRssState = { polling: false, newCount: ingestRes.data.newCount, totalCount: ingestRes.data.totalCount, error: '' };
      updateRssUi();

      // Persist username for next time
      await chrome.storage.local.set({ lbRssUsername: username.trim() });

      // Refresh the media list if new items were imported
      if (ingestRes.data.newCount > 0) {
        await loadAllMedia();
      }
    } catch (err) {
      lbRssState = { polling: false, newCount: 0, totalCount: 0, error: err.message || 'RSS poll failed.' };
      updateRssUi();
    }
  }

  function updateRssUi() {
    const usernameInput = document.getElementById('rss-lb-username');
    const pollBtn = document.getElementById('rss-lb-poll-btn');
    const statusEl = document.getElementById('rss-lb-status');
    if (!pollBtn || !statusEl) return;

    pollBtn.disabled = lbRssState.polling;
    pollBtn.textContent = lbRssState.polling ? 'Polling...' : 'Poll RSS';

    if (lbRssState.polling) {
      statusEl.className = 'rss-status rss-status--pending';
      statusEl.textContent = 'Fetching Letterboxd RSS feed…';
      statusEl.classList.remove('hidden');
    } else if (lbRssState.error) {
      statusEl.className = 'rss-status rss-status--error';
      statusEl.textContent = lbRssState.error;
      statusEl.classList.remove('hidden');
    } else if (lbRssState.totalCount > 0) {
      statusEl.className = 'rss-status rss-status--success';
      statusEl.textContent = lbRssState.newCount > 0
        ? `✓ Synced ${lbRssState.newCount} new entr${lbRssState.newCount === 1 ? 'y' : 'ies'} (${lbRssState.totalCount} in feed)`
        : `✓ Up to date — ${lbRssState.totalCount} entr${lbRssState.totalCount === 1 ? 'y' : 'ies'} already synced`;
      statusEl.classList.remove('hidden');
    } else {
      statusEl.classList.add('hidden');
    }
  }

  // 1. Load Stored Configuration
  async function loadConfig() {
    const res = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    currentConfig = res?.data || {};

    inputPdsUrl.value = currentConfig.pdsUrl || 'http://localhost:3000';
    inputHandle.value = currentConfig.handle || 'kentrain.trackstar.test';
    inputPassword.value = currentConfig.password || 'password123';

    if (currentConfig.did && currentConfig.accessJwt) {
      connectionPill.textContent = currentConfig.handle ? `● ${currentConfig.handle}` : '● Connected';
      connectionPill.className = 'pill connected';
      return true;
    } else {
      connectionPill.textContent = '○ Disconnected';
      connectionPill.className = 'pill disconnected';
      return false;
    }
  }

  // 2. Fetch All Media Records Live from PDS
  async function loadAllMedia() {
    emptyState.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');

    try {
      const res = await chrome.runtime.sendMessage({ type: 'FETCH_ALL_MEDIA' });
      loadingSpinner.classList.add('hidden');

      if (!res.success) {
        throw new Error(res.error || 'Failed to fetch media logs.');
      }

      allMedia = res.data || [];
      renderAllViews();
    } catch (err) {
      loadingSpinner.classList.add('hidden');
      console.error('Error fetching media:', err);
      emptyState.classList.remove('hidden');
      emptyState.querySelector('.empty-title').textContent = 'PDS Connection Needed';
      emptyState.querySelector('.empty-desc').textContent = err.message || 'Please check your PDS credentials.';
      settingsView.classList.remove('hidden');
    }
  }

  // 3. Render All Views
  function renderAllViews() {
    renderIntegrations();
    renderUnsyncedItems();
  }

  // =========================================================================
  // RENDER TAB 1: INTEGRATIONS (Dynamic Platform Registry)
  // =========================================================================
  function renderIntegrations() {
    if (!integrationsList) return;
    integrationsList.innerHTML = '';

    INTEGRATIONS.forEach(integration => {
      const card = document.createElement('div');
      card.className = 'integration-card';

      // Compute dynamic sync button text with badge if available
      let syncBtnHtml = '';
      if (integration.syncLabel) {
        let syncCountSuffix = '';
        if (integration.getSyncCount) {
          const count = integration.getSyncCount(allMedia);
          syncCountSuffix = ` (${count})`;
        }
        syncBtnHtml = `
          <button class="btn-integration btn-integration-sync" data-action="sync" data-id="${integration.id}" title="${integration.syncTooltip || ''}">
            ${integration.syncLabel}${syncCountSuffix}
          </button>
        `;
      }

      // Compute optional diary button (links to unsynced tab)
      let diaryBtnHtml = '';
      if (integration.diaryLabel) {
        let diaryCount = 0;
        if (integration.getDiaryCount) {
          diaryCount = integration.getDiaryCount(allMedia);
        }
        diaryBtnHtml = `
          <button class="btn-integration btn-integration-diary" data-action="diary" data-id="${integration.id}" title="${integration.diaryTooltip || ''}">
            ${integration.diaryLabel} (${diaryCount})
          </button>
        `;
      }

      const actionsContainerClass = syncBtnHtml ? 'integration-card-actions' : 'integration-card-actions single';

      card.innerHTML = `
        <div class="integration-card-header">
          <div class="integration-card-info">
            <div class="integration-avatar ${integration.avatarClass}">
              ${integration.logoSrc
                ? `<img src="${integration.logoSrc}" alt="${integration.name} logo" class="integration-avatar-img">`
                : (integration.avatarText || '')}
            </div>
            <div>
              <div class="integration-name">${integration.name}</div>
              <div class="integration-desc">${integration.category}</div>
            </div>
          </div>
        </div>
        <div class="${actionsContainerClass}">
          <button class="btn-integration btn-integration-export" data-action="export" data-id="${integration.id}" title="${integration.exportTooltip || ''}">
            ${integration.exportLabel}
          </button>
          ${syncBtnHtml}
        </div>
        ${diaryBtnHtml ? `<div class="integration-card-actions single">${diaryBtnHtml}</div>` : ''}
      `;

      // Export Button Handler
      const btnExport = card.querySelector('[data-action="export"]');
      if (btnExport && integration.onExport) {
        btnExport.addEventListener('click', () => integration.onExport(currentConfig, allMedia));
      }

      // Sync Button Handler
      const btnSync = card.querySelector('[data-action="sync"]');
      if (btnSync && integration.onSync) {
        btnSync.addEventListener('click', () => integration.onSync(currentConfig, allMedia));
      }

      // Diary Button Handler — switches to the Unsynced Items tab
      const btnDiary = card.querySelector('[data-action="diary"]');
      if (btnDiary) {
        btnDiary.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          const unsyncedTabBtn = document.querySelector('.main-tab-btn[data-tab="unsynced"]');
          if (unsyncedTabBtn) unsyncedTabBtn.classList.add('active');
          panelIntegrations.classList.add('hidden');
          panelUnsynced.classList.remove('hidden');
          activeTab = 'unsynced';
        });
      }

      integrationsList.appendChild(card);

      // Allow integrations to inject extra UI (e.g. RSS poll section)
      if (integration.onRenderExtra) {
        integration.onRenderExtra(card);
      }
    });
  }


  // =========================================================================
  // RENDER TAB 2: UNSYNCED ITEMS ONLY
  // =========================================================================
  function renderUnsyncedItems() {
    if (!unsyncedList) return;
    unsyncedList.innerHTML = '';

    // Filter strictly for unsynced items
    const unsyncedItems = allMedia.filter(m => !m.isSynced);

    // Update Tab Badge Count
    if (badgeUnsyncedCount) {
      badgeUnsyncedCount.textContent = unsyncedItems.length;
    }

    if (unsyncedItems.length === 0) {
      if (unsyncedEmpty) unsyncedEmpty.classList.remove('hidden');
      return;
    }

    if (unsyncedEmpty) unsyncedEmpty.classList.add('hidden');

    unsyncedItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'media-card';

      const stars = item.rating ? '★'.repeat(item.rating) : '';
      const dateStr = item.completedAt ? new Date(item.completedAt).toLocaleDateString() : '';
      
      let typeLabel = 'Movie';
      let subtitle = dateStr || 'Logged on PDS';

      if (item.mediaType === 'book') {
        typeLabel = 'Book';
        subtitle = `${item.author ? item.author + ' • ' : ''}${dateStr || 'Logged on PDS'}`;
      } else if (item.mediaType === 'concert') {
        typeLabel = 'Concert';
        subtitle = `${item.venue ? item.venue + (item.city ? ', ' + item.city : '') + ' • ' : ''}${dateStr || 'Attended'}`;
      } else if (item.mediaType === 'movie') {
        typeLabel = 'Movie';
        subtitle = `${item.year ? item.year + ' • ' : ''}${dateStr || 'Logged on PDS'}`;
      }

      // Action button based on media type
      let actionsHtml = '';
      if (item.mediaType === 'movie' && item.status === 'completed') {
        const reviewUrl = getLetterboxdReviewUrl(item);
        actionsHtml = `
          <a href="${reviewUrl}" target="_blank" class="btn-diary-link" title="Sync to Letterboxd Diary (+ Review)">
            Sync to Diary ↗
          </a>
        `;
      } else if (item.mediaType === 'movie' && item.status === 'want_to_consume') {
        let username = 'kentrain';
        if (currentConfig?.handle) {
          username = currentConfig.handle.split('.')[0] || 'kentrain';
        }
        actionsHtml = `
          <a href="https://letterboxd.com/${username}/watchlist/" target="_blank" class="btn-watchlist-link" title="Open your Letterboxd Watchlist to sync this film">
            Sync to Watchlist ↗
          </a>
        `;
      } else if (item.mediaType === 'concert') {
        const setlistUrl = getSetlistConcertUrl(item);
        actionsHtml = `
          <a href="${setlistUrl}" target="_blank" class="btn-setlist-link" title="Open concert on setlist.fm to select 'I was there'">
            Sync to setlist.fm ↗
          </a>
        `;
      } else if (item.mediaType === 'book') {
        actionsHtml = `
          <a href="https://app.thestorygraph.com/import-goodreads" target="_blank" class="btn-sg-link" title="Import reading history into StoryGraph">
            StoryGraph ↗
          </a>
        `;
      } else {
        actionsHtml = `<span class="status-badge pending">Unsynced</span>`;
      }

      card.innerHTML = `
        <div class="media-info">
          ${item.coverUrl 
            ? `<img src="${item.coverUrl}" class="media-thumb" alt="${item.title}" />` 
            : `<div class="media-thumb-placeholder">${getTypeSvg(item.mediaType)}</div>`}
          <div class="media-meta">
            <div class="media-title-row">
              <span class="media-type-tag">${typeLabel}</span>
              <div class="media-title" title="${item.title}">${item.title}</div>
            </div>
            <div class="media-sub">${subtitle}</div>
            ${stars ? `<div class="media-rating">${stars} <span style="font-size: 9px; color: #9ca3af;">(${item.rating}/5)</span></div>` : ''}
          </div>
        </div>
        <div class="media-actions">
          ${actionsHtml}
        </div>
      `;

      unsyncedList.appendChild(card);
    });
  }

  // =========================================================================
  // PRIMARY TAB SWITCHING LOGIC
  // =========================================================================
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      activeTab = btn.dataset.tab;
      if (activeTab === 'integrations') {
        panelIntegrations.classList.remove('hidden');
        panelUnsynced.classList.add('hidden');
      } else if (activeTab === 'unsynced') {
        panelIntegrations.classList.add('hidden');
        panelUnsynced.classList.remove('hidden');
      }
    });
  });

  // =========================================================================
  // SETTINGS CONTROLLER
  // =========================================================================
  formSettings.addEventListener('submit', async (e) => {
    e.preventDefault();
    settingsError.classList.add('hidden');
    btnSaveSettings.disabled = true;
    btnSaveSettings.textContent = 'Connecting...';

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'LOGIN_PDS',
        pdsUrl: inputPdsUrl.value,
        handle: inputHandle.value,
        password: inputPassword.value
      });

      btnSaveSettings.disabled = false;
      btnSaveSettings.textContent = 'Connect to PDS';

      if (!res.success) {
        settingsError.textContent = res.error || 'Authentication failed.';
        settingsError.classList.remove('hidden');
        return;
      }

      settingsView.classList.add('hidden');
      await loadConfig();
      await loadAllMedia();
    } catch (err) {
      btnSaveSettings.disabled = false;
      btnSaveSettings.textContent = 'Connect to PDS';
      settingsError.textContent = err.message || 'Login failed.';
      settingsError.classList.remove('hidden');
    }
  });

  // Settings Presets
  btnPresetLocal.addEventListener('click', () => {
    inputPdsUrl.value = 'http://localhost:3000';
    inputHandle.value = 'kentrain.trackstar.test';
    inputPassword.value = 'password123';
  });

  btnPresetBsky.addEventListener('click', () => {
    inputPdsUrl.value = 'https://bsky.social';
    inputHandle.value = '';
    inputPassword.value = '';
  });

  // Toggle Settings View
  btnToggleSettings.addEventListener('click', () => {
    settingsView.classList.toggle('hidden');
  });

  // Refresh Button
  btnRefresh.addEventListener('click', () => {
    loadAllMedia();
  });

  // Initial Boot
  const stored = await chrome.storage.local.get('lbRssUsername');
  lbRssUsername = stored.lbRssUsername || '';

  const isConnected = await loadConfig();
  if (isConnected) {
    await loadAllMedia();
  } else {
    settingsView.classList.remove('hidden');
  }
});
