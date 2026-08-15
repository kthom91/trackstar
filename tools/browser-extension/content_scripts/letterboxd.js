// Trackstar Letterboxd Content Script (Manifest V3)
// Features:
// 1. Inbound 1-Click Auto-Ingest on https://letterboxd.com/settings/data/ (Letterboxd Full Export -> PDS)
// 2. Inbound 1-Click Watchlist Ingest on https://letterboxd.com/<username>/watchlist/ (Letterboxd Watchlist -> PDS)
// 3. Outbound Assisted 1-by-1 Diary Log on https://letterboxd.com/film/<slug>/review/ (PDS -> Letterboxd Diary)

(function () {
  console.log('[Trackstar] Letterboxd content script loaded.');

  // UI Toast / Notification Banner Helper
  function showTrackstarBanner(message, type = 'info', duration = 5000) {
    let banner = document.getElementById('trackstar-sync-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'trackstar-sync-banner';
      document.body.appendChild(banner);
    }

    const icon = type === 'success' ? '✓' : (type === 'warn' ? '!' : '');
    banner.className = `trackstar-banner trackstar-${type}`;
    banner.innerHTML = `
      <div class="trackstar-banner-content">
        <div class="trackstar-badge">Trackstar PDS</div>
        <span class="trackstar-msg">${icon} ${message}</span>
      </div>
      <button id="trackstar-banner-close" title="Dismiss">&times;</button>
    `;

    document.getElementById('trackstar-banner-close')?.addEventListener('click', () => {
      banner.remove();
    });

    if (duration > 0) {
      setTimeout(() => {
        if (banner && banner.parentNode) {
          banner.style.opacity = '0';
          banner.style.transform = 'translateY(10px)';
          banner.style.transition = 'all 0.3s ease';
          setTimeout(() => banner.remove(), 300);
        }
      }, duration);
    }
  }

  // Lightweight robust CSV parser
  function parseCsv(csvText) {
    if (!csvText) return [];
    const lines = [];
    let row = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal);
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(currentVal);
        if (row.some(c => c.trim().length > 0)) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal);
      if (row.some(c => c.trim().length > 0)) lines.push(row);
    }

    if (lines.length < 2) return [];
    const headers = lines[0].map(h => h.trim().toLowerCase());
    return lines.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] || '').trim();
      });
      return obj;
    });
  }

  // =========================================================================
  // SECTION 1: INBOUND 1-CLICK FULL EXPORT INGEST ON /settings/data/ (Letterboxd -> PDS)
  // =========================================================================
  function initInboundDataExport() {
    if (!window.location.pathname.includes('/settings/data')) return;
    console.log('[Trackstar] Initializing 1-Click Export Card on /settings/data...');

    function tryInject() {
      if (document.getElementById('trackstar-export-card')) return true;

      // 1. Primary target: The Export button or button container on /settings/data/
      const exportBtn = document.querySelector(
        'a[href*="/data/export"], a[href$="/export/"], a.button[href*="/export"], button[data-action="export"]'
      );
      if (exportBtn) {
        const btnGroup = exportBtn.closest('.button-group, .buttons, .form-row, p, div, section') || exportBtn;
        if (btnGroup && btnGroup.parentNode) {
          injectInboundExportCard(btnGroup.parentNode, btnGroup);
          return true;
        }
      }

      // 2. Secondary target: Main content container inside #content
      const targetContainer = document.querySelector(
        '#content .content-wrap, #content .cols-2, #content .col-17, #content .col-main, #content, main, .content-wrap'
      );
      if (targetContainer) {
        injectInboundExportCard(targetContainer);
        return true;
      }
      return false;
    }

    if (tryInject()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInject() || attempts > 20) {
        clearInterval(interval);
      }
    }, 250);
  }

  function injectInboundExportCard(container, anchorEl = null) {
    if (document.getElementById('trackstar-export-card')) return;

    const card = document.createElement('div');
    card.id = 'trackstar-export-card';
    card.className = 'trackstar-card';
    card.innerHTML = `
      <div class="trackstar-card-header">
        <div class="trackstar-card-brand">
          <div class="trackstar-logo-sm">t*</div>
          <div>
            <h3 class="trackstar-card-title">1-Click Sync to Trackstar PDS</h3>
            <p class="trackstar-card-subtitle">Directly ingest your diary, watchlist, and ratings into your AT Protocol PDS</p>
          </div>
        </div>
        <span class="trackstar-badge">Inbound Ingest</span>
      </div>

      <div class="trackstar-card-body">
        <p class="trackstar-card-desc">
          No need to unzip or manually drag-and-drop CSV files. Click below to automatically download, unpack in memory, and commit your entire Letterboxd history into your connected PDS repository.
        </p>

        <div id="trackstar-progress-area" class="trackstar-progress-area hidden">
          <div class="trackstar-progress-header">
            <span id="trackstar-progress-label">Preparing export...</span>
            <span id="trackstar-progress-percent">0%</span>
          </div>
          <div class="trackstar-progress-bar-bg">
            <div id="trackstar-progress-bar-fill" class="trackstar-progress-bar-fill"></div>
          </div>
        </div>

        <div id="trackstar-status-msg" class="trackstar-status-msg hidden"></div>

        <div class="trackstar-card-actions">
          <button id="btn-trackstar-auto-ingest" class="trackstar-btn trackstar-btn-primary">
            Start 1-Click PDS Ingest
          </button>
          <a href="http://localhost:4200" target="_blank" class="trackstar-btn trackstar-btn-secondary">
            Open Trackstar Dashboard ↗
          </a>
        </div>
      </div>
    `;

    if (anchorEl && anchorEl.parentNode) {
      anchorEl.parentNode.insertBefore(card, anchorEl);
    } else if (container.firstChild) {
      container.insertBefore(card, container.firstChild);
    } else {
      container.appendChild(card);
    }

    const btnStart = document.getElementById('btn-trackstar-auto-ingest');
    btnStart?.addEventListener('click', () => runAutoIngest());
  }

  async function runAutoIngest() {
    const btn = document.getElementById('btn-trackstar-auto-ingest');
    const progressArea = document.getElementById('trackstar-progress-area');
    const progressLabel = document.getElementById('trackstar-progress-label');
    const progressPercent = document.getElementById('trackstar-progress-percent');
    const progressBarFill = document.getElementById('trackstar-progress-bar-fill');
    const statusMsg = document.getElementById('trackstar-status-msg');

    if (btn) btn.disabled = true;
    progressArea?.classList.remove('hidden');
    statusMsg?.classList.add('hidden');

    function updateProgress(label, percent) {
      if (progressLabel) progressLabel.textContent = label;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressBarFill) progressBarFill.style.width = `${percent}%`;
    }

    try {
      updateProgress('Requesting data export from Letterboxd...', 10);

      const exportAnchor = document.querySelector('a[href*="/data/export"], a.button[href*="/data/export"]');
      const exportUrl = exportAnchor ? exportAnchor.href : '/data/export/';

      const res = await fetch(exportUrl, {
        method: 'GET',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error(`Letterboxd export returned status ${res.status}. Please check that you are logged in.`);
      }

      updateProgress('Downloading and unzipping archive in memory...', 30);
      const blobBuffer = await res.arrayBuffer();
      const zipBytes = new Uint8Array(blobBuffer);

      if (typeof window.fflate === 'undefined' || !window.fflate.unzipSync) {
        throw new Error('Decompression library not ready. Please reload extension.');
      }

      const unzipped = window.fflate.unzipSync(zipBytes);
      console.log('[Trackstar] Files found in ZIP:', Object.keys(unzipped));

      const recordsToIngest = [];

      // 1. Process diary.csv
      const diaryFile = unzipped['diary.csv'] || Object.entries(unzipped).find(([k]) => k.endsWith('diary.csv'))?.[1];
      if (diaryFile) {
        const diaryText = window.fflate.strFromU8(diaryFile);
        const diaryRows = parseCsv(diaryText);
        console.log(`[Trackstar] Parsed ${diaryRows.length} diary entries.`);

        diaryRows.forEach(row => {
          const title = row['name'] || row['film title'] || row['title'] || '';
          if (title) {
            recordsToIngest.push({
              title: title,
              year: row['year'] || '',
              letterboxdUrl: row['letterboxd uri'] || '',
              rating: row['rating'] ? parseFloat(row['rating']) : undefined,
              watchedDate: row['watched date'] || row['date'] || '',
              date: row['date'] || '',
              tags: row['tags'] ? row['tags'].split(',').map(t => t.trim()) : ['trackstar'],
              isRewatch: (row['rewatch'] || '').toLowerCase() === 'yes',
              status: 'completed',
              source: 'letterboxd'
            });
          }
        });
      }

      // 2. Process watchlist.csv
      const watchlistFile = unzipped['watchlist.csv'] || Object.entries(unzipped).find(([k]) => k.endsWith('watchlist.csv'))?.[1];
      if (watchlistFile) {
        const watchlistText = window.fflate.strFromU8(watchlistFile);
        const watchlistRows = parseCsv(watchlistText);
        console.log(`[Trackstar] Parsed ${watchlistRows.length} watchlist items.`);

        watchlistRows.forEach(row => {
          const title = row['name'] || row['film title'] || row['title'] || '';
          if (title) {
            recordsToIngest.push({
              title: title,
              year: row['year'] || '',
              letterboxdUrl: row['letterboxd uri'] || '',
              date: row['date'] || '',
              tags: ['watchlist'],
              status: 'want_to_consume',
              source: 'letterboxd'
            });
          }
        });
      }

      if (recordsToIngest.length === 0) {
        throw new Error('No movies found in export archive.');
      }

      updateProgress(`Committing ${recordsToIngest.length} records to your PDS...`, 50);

      const BATCH_SIZE = 40;
      let totalCommitted = 0;

      for (let i = 0; i < recordsToIngest.length; i += BATCH_SIZE) {
        const chunk = recordsToIngest.slice(i, i + BATCH_SIZE);
        const pct = Math.round(50 + ((i + chunk.length) / recordsToIngest.length) * 48);
        updateProgress(`Writing records to PDS (${i + chunk.length}/${recordsToIngest.length})...`, pct);

        const batchRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'BATCH_INGEST_PDS',
            records: chunk
          }, resolve);
        });

        if (batchRes && batchRes.success) {
          totalCommitted += batchRes.data?.count || chunk.length;
        } else {
          console.warn('[Trackstar] Chunk upload warning:', batchRes?.error);
        }
      }

      updateProgress('Sync completed successfully!', 100);

      if (statusMsg) {
        statusMsg.className = 'trackstar-status-msg trackstar-status-success';
        statusMsg.innerHTML = `
          <strong>Import Complete!</strong><br>
          Successfully committed <strong>${totalCommitted}</strong> records to your PDS.
        `;
        statusMsg.classList.remove('hidden');
      }

      showTrackstarBanner(`1-Click Ingest Complete! ${totalCommitted} films added to PDS.`, 'success', 8000);

    } catch (err) {
      console.error('[Trackstar Auto Ingest Error]:', err);
      updateProgress('Failed', 0);
      if (statusMsg) {
        statusMsg.className = 'trackstar-status-msg trackstar-status-error';
        statusMsg.textContent = `Error: ${err.message}`;
        statusMsg.classList.remove('hidden');
      }
      showTrackstarBanner(`Import failed: ${err.message}`, 'warn', 8000);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // =========================================================================
  // SECTION 2: INBOUND 1-CLICK WATCHLIST INGEST ON /watchlist/ (Letterboxd -> PDS)
  // =========================================================================
  function countWatchlistFilmsOnPage() {
    const posterEls = Array.from(document.querySelectorAll(
      'ul.poster-list li, .poster-container, .film-poster, div[data-film-slug], li[data-film-slug], li.posteritem, .griditem'
    ));
    const slugs = new Set();
    posterEls.forEach(el => {
      const slug = el.dataset.filmSlug ||
                   el.getAttribute('data-film-slug') ||
                   el.querySelector('a')?.href?.split('/film/')[1]?.replace(/\/$/, '') ||
                   '';
      if (slug) slugs.add(slug);
    });

    if (slugs.size > 0) return slugs.size;

    // Fallback: Check header count or sub-nav counter elements
    const countEl = document.querySelector(
      '.watchlist-count, .js-watchlist-count, h1 .count, .sub-nav [href*="/watchlist"] .count, a[href*="/watchlist/"] span.count'
    );
    if (countEl) {
      const parsed = parseInt(countEl.textContent.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    return 0;
  }

  function updateWatchlistCardCount() {
    const btn = document.getElementById('btn-trackstar-wl-ingest');
    const desc = document.getElementById('trackstar-wl-desc');
    if (!btn) return;

    const count = countWatchlistFilmsOnPage();
    if (count > 0) {
      const label = count === 1 ? '1 Film' : `${count} Films`;
      btn.textContent = `Import Watchlist (${label}) to PDS`;
      if (desc) {
        desc.innerHTML = `Found <strong>${count}</strong> film(s) on this Letterboxd watchlist page ready to be committed into your AT Protocol PDS as "Want to Consume".`;
      }
    } else {
      btn.textContent = 'Import Watchlist to PDS';
    }
  }

  function initWatchlistIngest() {
    if (!window.location.pathname.includes('/watchlist')) return;
    console.log('[Trackstar] Initializing Watchlist Ingest Card on /watchlist...');

    function tryInject() {
      if (document.getElementById('trackstar-watchlist-card')) {
        updateWatchlistCardCount();
        return true;
      }

      // Find best container: section header, poster grid container, content wrap
      const targetContainer = document.querySelector(
        '.poster-list-container, ul.poster-list, #content .content-wrap, section.section, .cols-2, main, #content'
      );

      if (targetContainer) {
        injectWatchlistCard(targetContainer);
        return true;
      }
      return false;
    }

    if (tryInject()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInject() || attempts > 20) {
        clearInterval(interval);
      }
    }, 250);
  }

  function injectWatchlistCard(container) {
    if (document.getElementById('trackstar-watchlist-card')) return;

    const card = document.createElement('div');
    card.id = 'trackstar-watchlist-card';
    card.className = 'trackstar-card';
    card.innerHTML = `
      <div class="trackstar-card-header">
        <div class="trackstar-card-brand">
          <div class="trackstar-logo-sm">t*</div>
          <div>
            <h3 class="trackstar-card-title">1-Click Watchlist Sync to Trackstar PDS</h3>
            <p class="trackstar-card-subtitle">Import your Letterboxd watchlist items directly into your AT Protocol PDS as "Want to Consume"</p>
          </div>
        </div>
        <span class="trackstar-badge">Watchlist Ingest</span>
      </div>

      <div class="trackstar-card-body">
        <p id="trackstar-wl-desc" class="trackstar-card-desc">
          Click below to import all films from this Letterboxd watchlist page into your connected Personal Data Server repository.
        </p>

        <div id="trackstar-wl-progress-area" class="trackstar-progress-area hidden">
          <div class="trackstar-progress-header">
            <span id="trackstar-wl-progress-label">Scanning watchlist...</span>
            <span id="trackstar-wl-progress-percent">0%</span>
          </div>
          <div class="trackstar-progress-bar-bg">
            <div id="trackstar-wl-progress-bar-fill" class="trackstar-progress-bar-fill"></div>
          </div>
        </div>

        <div id="trackstar-wl-status-msg" class="trackstar-status-msg hidden"></div>

        <div class="trackstar-card-actions">
          <button id="btn-trackstar-wl-ingest" class="trackstar-btn trackstar-btn-primary">
            Import Watchlist to PDS
          </button>
          <a href="http://localhost:4200/want-to-consume" target="_blank" class="trackstar-btn trackstar-btn-secondary">
            Open Watchlist in Trackstar ↗
          </a>
        </div>
      </div>
    `;

    if (container.tagName === 'UL') {
      container.parentNode.insertBefore(card, container);
    } else if (container.firstChild) {
      container.insertBefore(card, container.firstChild);
    } else {
      container.appendChild(card);
    }

    const btnStart = document.getElementById('btn-trackstar-wl-ingest');
    btnStart?.addEventListener('click', () => runWatchlistIngest());

    // Update count immediately and after DOM paint
    updateWatchlistCardCount();
    setTimeout(updateWatchlistCardCount, 400);
    setTimeout(updateWatchlistCardCount, 1200);
  }

  async function runWatchlistIngest() {
    const btn = document.getElementById('btn-trackstar-wl-ingest');
    const progressArea = document.getElementById('trackstar-wl-progress-area');
    const progressLabel = document.getElementById('trackstar-wl-progress-label');
    const progressPercent = document.getElementById('trackstar-wl-progress-percent');
    const progressBarFill = document.getElementById('trackstar-wl-progress-bar-fill');
    const statusMsg = document.getElementById('trackstar-wl-status-msg');

    if (btn) btn.disabled = true;
    progressArea?.classList.remove('hidden');
    statusMsg?.classList.add('hidden');

    function updateProgress(label, percent) {
      if (progressLabel) progressLabel.textContent = label;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressBarFill) progressBarFill.style.width = `${percent}%`;
    }

    try {
      updateProgress('Scanning page for watchlist items...', 15);

      // Scrape movie posters on page
      const posterEls = Array.from(document.querySelectorAll(
        'ul.poster-list li, .poster-container, .film-poster, div[data-film-slug], li[data-film-slug]'
      ));

      console.log(`[Trackstar] Found ${posterEls.length} poster elements on watchlist page.`);

      const moviesMap = new Map();

      posterEls.forEach(el => {
        const slug = el.dataset.filmSlug ||
                     el.getAttribute('data-film-slug') ||
                     el.querySelector('a')?.href?.split('/film/')[1]?.replace(/\/$/, '') ||
                     '';

        if (!slug) return;

        const name = el.dataset.filmName ||
                     el.getAttribute('data-film-name') ||
                     el.querySelector('img')?.getAttribute('alt') ||
                     el.querySelector('.frame-title')?.textContent?.trim() ||
                     slug.replace(/-/g, ' ');

        const year = el.dataset.filmReleaseYear ||
                     el.getAttribute('data-film-release-year') ||
                     '';

        const coverImg = el.querySelector('img');
        const coverUrl = coverImg?.src || coverImg?.dataset?.src || '';

        if (!moviesMap.has(slug)) {
          moviesMap.set(slug, {
            title: name.trim(),
            year: year ? parseInt(year, 10) : undefined,
            letterboxdUrl: `https://letterboxd.com/film/${slug}/`,
            coverUrl: coverUrl,
            status: 'want_to_consume',
            tags: ['watchlist'],
            source: 'letterboxd'
          });
        }
      });

      const movies = Array.from(moviesMap.values());
      console.log(`[Trackstar] Extracted ${movies.length} unique watchlist films.`);

      if (movies.length === 0) {
        throw new Error('No movies found on this watchlist page. Ensure you are viewing a Letterboxd watchlist.');
      }

      updateProgress(`Committing ${movies.length} watchlist items to PDS...`, 40);

      const BATCH_SIZE = 30;
      let totalCommitted = 0;

      for (let i = 0; i < movies.length; i += BATCH_SIZE) {
        const chunk = movies.slice(i, i + BATCH_SIZE);
        const pct = Math.round(40 + ((i + chunk.length) / movies.length) * 58);
        updateProgress(`Writing watchlist to PDS (${i + chunk.length}/${movies.length})...`, pct);

        const batchRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'BATCH_INGEST_PDS',
            records: chunk
          }, resolve);
        });

        if (batchRes && batchRes.success) {
          totalCommitted += batchRes.data?.count || chunk.length;
        } else {
          console.warn('[Trackstar] Chunk upload warning:', batchRes?.error);
        }
      }

      updateProgress('Watchlist sync complete!', 100);

      if (statusMsg) {
        statusMsg.className = 'trackstar-status-msg trackstar-status-success';
        statusMsg.innerHTML = `
          <strong>✓ Watchlist Sync Complete!</strong><br>
          Successfully committed <strong>${totalCommitted}</strong> watchlist films into your PDS (Want to Consume).
        `;
        statusMsg.classList.remove('hidden');
      }

      showTrackstarBanner(`Watchlist Ingest Complete! ${totalCommitted} films added to PDS.`, 'success', 8000);

    } catch (err) {
      console.error('[Trackstar Watchlist Ingest Error]:', err);
      updateProgress('Failed', 0);
      if (statusMsg) {
        statusMsg.className = 'trackstar-status-msg trackstar-status-error';
        statusMsg.textContent = `Error: ${err.message}`;
        statusMsg.classList.remove('hidden');
      }
      showTrackstarBanner(`Watchlist import failed: ${err.message}`, 'warn', 8000);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // =========================================================================
  // SECTION 3: OUTBOUND ASSISTED 1-BY-1 DIARY LOG (https://letterboxd.com/film/<slug>/review/)
  // =========================================================================
  function getSyncPayload() {
    try {
      const hash = window.location.hash;
      if (!hash || !hash.includes('#trackstar-sync=')) return null;

      const raw = hash.split('#trackstar-sync=')[1];
      if (!raw) return null;

      const decodedJson = decodeURIComponent(escape(atob(decodeURIComponent(raw))));
      return JSON.parse(decodedJson);
    } catch (e) {
      console.warn('[Trackstar] Failed to parse sync payload from hash:', e);
      return null;
    }
  }

  function initAssistedDiaryLog() {
    const payload = getSyncPayload();
    if (!payload) return;

    console.log('[Trackstar Diary Sync] Active payload detected on film page:', payload);

    if (window.location.pathname.startsWith('/film/')) {
      showTrackstarBanner(`Opening diary review for "${payload.title}"...`, 'info', 0);

      function triggerLogModal() {
        const selectors = [
          '.add-this-film',
          '[data-action="add-film"]',
          '.action-add-film',
          'a.add-film-to-diary',
          'a[href*="/add-film/"]',
          '.edit-review-button',
          '.add-film-button'
        ];

        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            btn.click();
            return true;
          }
        }
        return false;
      }

      function waitForModal(callback, maxAttempts = 30) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const modal = document.querySelector('#modal, .film-review-modal, #film-diary-entry, form#film-diary-entry, .modal');
          const reviewBox = document.querySelector('#frm-review, textarea[name="review"], textarea#review, textarea');

          if (modal && reviewBox) {
            clearInterval(interval);
            callback(modal, reviewBox);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn('[Trackstar] Timed out waiting for Letterboxd review modal.');
            showTrackstarBanner('Please click "Log or review" on page to complete diary entry.', 'warn', 8000);
          }
        }, 200);
      }

      setTimeout(() => {
        triggerLogModal();

        waitForModal((modal, reviewBox) => {
          console.log('[Trackstar] Review modal located, pre-filling diary entry...');

          // 1. Pre-fill review text
          if (payload.review) {
            reviewBox.value = payload.review;
            reviewBox.dispatchEvent(new Event('input', { bubbles: true }));
            reviewBox.dispatchEvent(new Event('change', { bubbles: true }));
          }

          // 2. Pre-fill star rating (1-10 scale for Letterboxd half-stars, or 1-5 scale)
          if (payload.rating10 || payload.rating) {
            const ratingVal = payload.rating10 || (payload.rating * 2);
            const ratingInput = document.querySelector('#frm-rating, input[name="rating"]');
            if (ratingInput) {
              ratingInput.value = ratingVal;
              ratingInput.dispatchEvent(new Event('input', { bubbles: true }));
              ratingInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const starEl = document.querySelector(`.rateit-rate, .rating-stars [data-rating="${ratingVal}"]`);
            if (starEl) {
              starEl.click();
            }
          }

          // 3. Pre-fill watched date and ensure "specify date" checkbox is checked for diary logging
          if (payload.watchedDate) {
            const dateInput = document.querySelector('#specified-date, #frm-view-date, input[name="viewingDateStr"]');
            if (dateInput) {
              dateInput.value = payload.watchedDate;
              dateInput.dispatchEvent(new Event('input', { bubbles: true }));
              dateInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const specifyDateCheckbox = document.querySelector('#specify-date-checkbox, input#frm-specified-date');
            if (specifyDateCheckbox && !specifyDateCheckbox.checked) {
              specifyDateCheckbox.click();
            }
          }

          // 4. Pre-fill trackstar tag
          const tagsInput = document.querySelector('#frm-tags, input[name="tags"]');
          if (tagsInput) {
            const currentTags = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()) : [];
            if (!currentTags.includes('trackstar')) {
              currentTags.push('trackstar');
              tagsInput.value = currentTags.filter(Boolean).join(', ');
              tagsInput.dispatchEvent(new Event('input', { bubbles: true }));
              tagsInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          // 5. Highlight Save/Submit Button
          const submitBtn = modal.querySelector('input[type="submit"], button[type="submit"], .button-action, .save-review');
          if (submitBtn) {
            submitBtn.classList.add('trackstar-highlight-btn');
          }

          showTrackstarBanner(
            `Entry pre-filled for "${payload.title}" (${payload.rating ? payload.rating + '★' : 'Watched'})! Click "Save" to log to your Letterboxd Diary.`,
            'success',
            0
          );

          // 6. Hook form submission to mark item as synced in PDS
          const form = modal.querySelector('form') || modal;
          form.addEventListener('submit', () => {
            console.log('[Trackstar] Diary entry submitted! Updating PDS log source...');
            chrome.runtime.sendMessage({
              type: 'MARK_SYNCED',
              rkey: payload.rkey,
              source: 'letterboxd'
            });
            showTrackstarBanner(`✓ "${payload.title}" saved to Diary and marked synced in PDS!`, 'success', 6000);
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
          }, { once: true });

        });
      }, 600);
    }
  }

  // =========================================================================
  // ROUTING & LIFECYCLE (Supports Turbo / PJAX / SPA Navigation)
  // =========================================================================
  function handleNavigation() {
    const path = window.location.pathname;

    if (path.includes('/settings/data')) {
      document.getElementById('trackstar-watchlist-card')?.remove();
      initInboundDataExport();
    } else if (path.includes('/watchlist')) {
      document.getElementById('trackstar-export-card')?.remove();
      initWatchlistIngest();
    } else {
      document.getElementById('trackstar-export-card')?.remove();
      document.getElementById('trackstar-watchlist-card')?.remove();
    }

    if (path.startsWith('/film/')) {
      initAssistedDiaryLog();
    }
  }

  handleNavigation();

  // Listen for PJAX / Turbo / standard browser history events on Letterboxd
  ['turbo:load', 'pjax:end', 'popstate'].forEach(evt => {
    window.addEventListener(evt, () => {
      handleNavigation();
    });
  });

  // MutationObserver to safely detect dynamically loaded content
  const observer = new MutationObserver(() => {
    const path = window.location.pathname;
    if (path.includes('/settings/data')) {
      if (!document.getElementById('trackstar-export-card')) {
        initInboundDataExport();
      }
    } else if (path.includes('/watchlist')) {
      if (!document.getElementById('trackstar-watchlist-card')) {
        initWatchlistIngest();
      } else {
        updateWatchlistCardCount();
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

})();
