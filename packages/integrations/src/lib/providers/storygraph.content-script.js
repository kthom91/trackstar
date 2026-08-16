// Trackstar StoryGraph Content Script (Manifest V3)
// Features:
// 1. Inbound 1-Click Ingest (StoryGraph -> PDS) on https://app.thestorygraph.com/user-export
// 2. Outbound 1-Click Sync (PDS -> StoryGraph via Goodreads CSV format) on StoryGraph import pages

(function () {
  console.log('[Trackstar] StoryGraph content script initialized.');

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

  // Generate Goodreads-compliant CSV for StoryGraph Import
  function generateGoodreadsCsv(books) {
    const headers = [
      'Book Id', 'Title', 'Author', 'Author l-f', 'Additional Authors',
      'ISBN', 'ISBN13', 'My Rating', 'Average Rating', 'Publisher',
      'Binding', 'Number of Pages', 'Year Published', 'Original Publication Year',
      'Date Read', 'Date Added', 'Bookshelves', 'Bookshelves with positions',
      'Exclusive Shelf', 'My Review', 'Spoiler', 'Private Notes', 'Read Count',
      'Recommended For', 'Recommended By', 'Owned Copies', 'Original Purchase Date',
      'Original Purchase Location', 'Condition', 'Condition Description', 'BCID'
    ];

    function escapeCsv(val) {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    const rows = books.map((b, idx) => {
      let exclusiveShelf = 'read';
      let readCount = 1;
      if (b.status === 'want_to_consume' || b.status === 'to-read') {
        exclusiveShelf = 'to-read';
        readCount = 0;
      } else if (b.status === 'consuming' || b.status === 'currently-reading') {
        exclusiveShelf = 'currently-reading';
        readCount = 0;
      }

      const rawIsbn = (b.isbn || '').replace(/[^0-9X]/gi, '');
      const isbn10 = rawIsbn.length === 10 ? `="${rawIsbn}"` : '';
      const isbn13 = rawIsbn.length === 13 ? `="${rawIsbn}"` : (rawIsbn.length > 0 ? `="${rawIsbn}"` : '');
      const dateRead = (exclusiveShelf === 'read' && b.completedAt) ? b.completedAt.split('T')[0].replace(/-/g, '/') : '';
      const dateAdded = b.loggedAt ? b.loggedAt.split('T')[0].replace(/-/g, '/') : new Date().toISOString().split('T')[0].replace(/-/g, '/');
      const rating = (b.rating && b.rating > 0) ? Math.max(1, Math.min(5, Math.round(b.rating))) : 0;

      return [
        idx + 1,                                // Book Id
        escapeCsv(b.title),                     // Title
        escapeCsv(b.author || b.creator || ''), // Author
        '',                                     // Author l-f
        '',                                     // Additional Authors
        escapeCsv(isbn10),                      // ISBN (escaped for RFC-4180 / Ruby CSV.parse)
        escapeCsv(isbn13),                      // ISBN13 (escaped for RFC-4180 / Ruby CSV.parse)
        rating,                                 // My Rating (0 = unrated)
        '',                                     // Average Rating
        '',                                     // Publisher
        '',                                     // Binding
        '',                                     // Number of Pages
        b.year || '',                           // Year Published
        b.year || '',                           // Original Publication Year
        dateRead,                               // Date Read
        dateAdded,                              // Date Added
        '',                                     // Bookshelves
        '',                                     // Bookshelves with positions
        exclusiveShelf,                         // Exclusive Shelf
        escapeCsv(b.review || ''),              // My Review
        '',                                     // Spoiler
        '',                                     // Private Notes
        readCount,                              // Read Count
        '', '', '', '', '', '', '', ''          // Legacy unused columns
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  // =========================================================================
  // =========================================================================
  // 1. INBOUND: 1-CLICK STORYGRAPH EXPORT (StoryGraph -> PDS)
  // =========================================================================
  function initStoryGraphExport() {
    console.log('[Trackstar] Initializing 1-Click Ingest Card on /user-export...');

    function tryInject() {
      if (document.getElementById('trackstar-sg-export-card')) return true;

      // Locate the native export form and its parent container box
      const exportForm = document.querySelector('form[action*="user-export"], form[action*="export"]');
      if (exportForm) {
        const exportBox = exportForm.closest('div.rounded, div[class*="rounded"], div[class*="border"], div[class*="shadow"], div[class*="bg-"]') || exportForm;
        if (exportBox && exportBox.parentNode) {
          injectStoryGraphExportCard(exportBox.parentNode, exportBox);
          return true;
        }
      }

      const targetContainer = document.querySelector('main, .main-container, .content-container, #content, .container');
      if (targetContainer) {
        injectStoryGraphExportCard(targetContainer);
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

  function injectStoryGraphExportCard(container, anchorEl = null) {
    if (document.getElementById('trackstar-sg-export-card')) return;

    const card = document.createElement('div');
    card.id = 'trackstar-sg-export-card';
    card.className = 'trackstar-card';
    card.innerHTML = `
      <div class="trackstar-card-header">
        <div class="trackstar-card-brand">
          <div class="trackstar-logo-sm">t*</div>
          <div>
            <h3 class="trackstar-card-title">1-Click Sync to Trackstar PDS</h3>
            <p class="trackstar-card-subtitle">Directly ingest your reading log, ratings, and to-read pile into your AT Protocol PDS</p>
          </div>
        </div>
        <span class="trackstar-badge">Inbound Ingest</span>
      </div>

      <div class="trackstar-card-body">
        <p class="trackstar-card-desc">
          No need to manually download or parse CSV files. Click below to automatically generate or fetch your StoryGraph export and commit your entire reading history into your connected PDS repository.
        </p>

        <div id="trackstar-sg-progress-area" class="trackstar-progress-area hidden">
          <div class="trackstar-progress-header">
            <span id="trackstar-sg-progress-label">Preparing export...</span>
            <span id="trackstar-sg-progress-percent">0%</span>
          </div>
          <div class="trackstar-progress-bar-bg">
            <div id="trackstar-sg-progress-bar-fill" class="trackstar-progress-bar-fill"></div>
          </div>
        </div>

        <div id="trackstar-sg-status-msg" class="trackstar-status-msg hidden"></div>

        <div class="trackstar-card-actions">
          <button id="btn-trackstar-sg-auto-ingest" class="trackstar-btn trackstar-btn-primary">
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

    const btn = document.getElementById('btn-trackstar-sg-auto-ingest');
    btn?.addEventListener('click', () => runStoryGraphAutoIngest());
  }

  async function runStoryGraphAutoIngest() {
    const btn = document.getElementById('btn-trackstar-sg-auto-ingest');
    const progressArea = document.getElementById('trackstar-sg-progress-area');
    const progressLabel = document.getElementById('trackstar-sg-progress-label');
    const progressPercent = document.getElementById('trackstar-sg-progress-percent');
    const progressBarFill = document.getElementById('trackstar-sg-progress-bar-fill');
    const statusMsg = document.getElementById('trackstar-sg-status-msg');

    if (btn) btn.disabled = true;
    progressArea?.classList.remove('hidden');
    statusMsg?.classList.add('hidden');

    function updateProgress(label, percent) {
      if (progressLabel) progressLabel.textContent = label;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressBarFill) progressBarFill.style.width = `${percent}%`;
    }

    function findCsvDownloadUrl(htmlOrDoc = document) {
      if (typeof htmlOrDoc === 'string') {
        const match = htmlOrDoc.match(/https:\/\/(?:storage\.googleapis\.com\/exports\.thestorygraph\.com|exports\.thestorygraph\.com)[^"'\s<>&]+[^"'\s<>]+/i);
        return match ? match[0].replace(/&amp;/g, '&') : null;
      } else {
        const link = htmlOrDoc.querySelector('a[href*="exports.thestorygraph.com"], a[href*="storage.googleapis.com"], a[href*=".csv"]');
        if (link && link.href) return link.href;

        const downloadAnchor = Array.from(htmlOrDoc.querySelectorAll('a')).find(a => 
          a.textContent.trim().toLowerCase().includes('download') && 
          (a.href.includes('googleapis') || a.href.includes('thestorygraph') || a.href.includes('.csv'))
        );
        return downloadAnchor ? downloadAnchor.href : null;
      }
    }

    try {
      let csvUrl = findCsvDownloadUrl(document);

      if (csvUrl) {
        updateProgress('Found active StoryGraph download link on page...', 40);
        console.log('[Trackstar] Existing download link found on page:', csvUrl);
      } else {
        updateProgress('Triggering "Generate Export" on StoryGraph...', 15);

        const csrfToken = document.querySelector('input[name="authenticity_token"], meta[name="csrf-token"]')?.value || 
                          document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        const formData = new URLSearchParams();
        if (csrfToken) formData.append('authenticity_token', csrfToken);

        try {
          const postRes = await fetch('/user-export', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-CSRF-Token': csrfToken
            }
          });
          console.log('[Trackstar] Generate Export POST response status:', postRes.status);
        } catch (postErr) {
          console.warn('[Trackstar] Post fetch notice, falling back to button click:', postErr);
          const nativeBtn = document.querySelector('form[action*="user-export"] button[type="submit"], form[action*="user-export"] input[type="submit"], input[value*="Generate Export"], button[value*="Generate Export"]');
          if (nativeBtn) nativeBtn.click();
        }

        updateProgress('Export job queued. Waiting for StoryGraph to generate CSV...', 25);
        const maxPollAttempts = 15;
        let attempt = 0;

        await new Promise(r => setTimeout(r, 4000));

        while (!csvUrl && attempt < maxPollAttempts) {
          attempt++;
          const pollPct = Math.round(25 + (attempt / maxPollAttempts) * 30);
          updateProgress(`Generating export on StoryGraph... (polling attempt ${attempt}/${maxPollAttempts})`, pollPct);

          try {
            const pollRes = await fetch('/user-export', { credentials: 'include' });
            if (pollRes.ok) {
              const htmlText = await pollRes.text();
              csvUrl = findCsvDownloadUrl(htmlText);
              if (csvUrl) {
                console.log('[Trackstar] Located fresh CSV Download URL:', csvUrl);
                break;
              }
            }
          } catch (pollErr) {
            console.warn('[Trackstar] Polling check warning:', pollErr);
          }

          await new Promise(r => setTimeout(r, 3500));
        }

        if (!csvUrl) {
          csvUrl = findCsvDownloadUrl(document);
        }
      }

      if (!csvUrl) {
        throw new Error('Export generation took longer than expected. Please wait a moment and click "Start 1-Click Sync" again once the link is ready.');
      }

      updateProgress('Downloading StoryGraph CSV file via extension...', 60);
      const csvFetchRes = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'FETCH_EXTERNAL_URL',
          url: csvUrl
        }, resolve);
      });

      if (!csvFetchRes || !csvFetchRes.success) {
        throw new Error(csvFetchRes?.error || 'Failed to download StoryGraph CSV from storage.');
      }

      const csvText = csvFetchRes.data;
      const rows = parseCsv(csvText);
      console.log(`[Trackstar] Parsed ${rows.length} rows from StoryGraph export.`);

      if (rows.length === 0) {
        throw new Error('No book records found in StoryGraph CSV.');
      }

      updateProgress(`Preparing ${rows.length} books for PDS ingest...`, 70);

      const recordsToIngest = [];
      rows.forEach(row => {
        const title = row['title'] || row['book title'] || '';
        if (!title) return;

        const author = row['authors'] || row['author'] || row['contributors'] || '';
        const rawIsbn = row['isbn/uid'] || row['isbn13'] || row['isbn'] || '';
        const isbn = rawIsbn.replace(/[^0-9X]/gi, '');
        const readStatus = (row['read status'] || row['status'] || '').toLowerCase();
        
        let status = 'completed';
        if (readStatus.includes('to-read') || readStatus.includes('tbr')) {
          status = 'want_to_consume';
        } else if (readStatus.includes('currently') || readStatus.includes('reading')) {
          status = 'consuming';
        }

        const rating = row['star rating'] || row['rating'];
        const review = row['review'] || row['review text'] || '';
        const completedDate = row['last date read'] || row['dates read'] || row['date read'] || '';
        const dateAdded = row['date added'] || '';

        recordsToIngest.push({
          mediaType: 'book',
          title: title,
          author: author,
          creator: author,
          isbn: isbn,
          status: status,
          rating: rating ? parseFloat(rating) : undefined,
          review: review,
          completedDate: completedDate,
          date: dateAdded,
          source: 'storygraph'
        });
      });

      const BATCH_SIZE = 40;
      let totalCommitted = 0;

      for (let i = 0; i < recordsToIngest.length; i += BATCH_SIZE) {
        const chunk = recordsToIngest.slice(i, i + BATCH_SIZE);
        const pct = Math.round(70 + ((i + chunk.length) / recordsToIngest.length) * 28);
        updateProgress(`Writing books to PDS (${i + chunk.length}/${recordsToIngest.length})...`, pct);

        const batchRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'BATCH_INGEST_PDS',
            records: chunk
          }, resolve);
        });

        if (batchRes && batchRes.success) {
          totalCommitted += batchRes.data?.count || chunk.length;
        }
      }

      updateProgress('StoryGraph sync completed successfully!', 100);

      if (statusMsg) {
        statusMsg.className = 'trackstar-status-msg trackstar-status-success';
        statusMsg.innerHTML = `
          <strong>StoryGraph Import Complete!</strong><br>
          Successfully ingested <strong>${totalCommitted}</strong> books, reviews, and to-read items to your PDS!
        `;
        statusMsg.classList.remove('hidden');
      }

      showTrackstarBanner(`1-Click StoryGraph Sync Complete! ${totalCommitted} books committed to PDS.`, 'success', 8000);

    } catch (err) {
      console.error('[Trackstar StoryGraph Ingest Error]:', err);
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
  // 2. OUTBOUND: 1-CLICK PDS -> STORYGRAPH SYNC (via Goodreads CSV Import)
  // =========================================================================

  /**
   * Intelligently find the StoryGraph Goodreads CSV file input and associated form/buttons,
   * while strictly filtering out profile picture/avatar image upload inputs.
   */
  function findGoodreadsImportTarget() {
    const allFileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (allFileInputs.length === 0) return null;

    const scoredCandidates = [];

    for (const input of allFileInputs) {
      const accept = (input.getAttribute('accept') || '').toLowerCase();
      const name = (input.getAttribute('name') || '').toLowerCase();
      const id = (input.getAttribute('id') || '').toLowerCase();
      const form = input.closest('form');
      const formAction = (form?.getAttribute('action') || '').toLowerCase();
      const formText = (form?.textContent || '').toLowerCase();
      
      const container = input.closest('section, div.card, .content-container, .main-container, main, form') || input.parentElement;
      const containerText = (container?.textContent || '').toLowerCase();

      let score = 0;

      // Penalize image / avatar / profile photo file inputs heavily!
      if (
        accept.includes('image/') || accept.includes('image/*') || accept.includes('.png') || accept.includes('.jpg') ||
        name.includes('avatar') || name.includes('photo') || name.includes('picture') || name.includes('profile') ||
        id.includes('avatar') || id.includes('photo') || id.includes('picture') || id.includes('profile') ||
        formAction.includes('avatar') || formAction.includes('photo') ||
        (formText.includes('profile picture') && !formText.includes('goodreads'))
      ) {
        score -= 1000;
      }

      // Reward Goodreads / CSV / Import indicators
      if (formAction.includes('goodreads') || formAction.includes('import')) score += 50;
      if (name.includes('goodreads') || id.includes('goodreads')) score += 40;
      if (name.includes('csv') || id.includes('csv')) score += 30;
      if (accept.includes('csv') || accept.includes('.csv') || accept.includes('text/csv')) score += 30;
      if (formText.includes('goodreads') || formText.includes('import your goodreads') || formText.includes('goodreads library')) score += 40;
      if (containerText.includes('goodreads')) score += 25;
      if (formText.includes('import') || containerText.includes('import')) score += 10;
      if (name.includes('file') || id.includes('file')) score += 5;

      scoredCandidates.push({ input, form, container, score });
    }

    // Sort by descending score
    scoredCandidates.sort((a, b) => b.score - a.score);

    const best = scoredCandidates[0];
    if (!best || best.score < 0) {
      // No valid Goodreads CSV input found (e.g. only avatar uploads exist)
      return null;
    }

    const fileInput = best.input;
    const form = best.form;
    
    // Find the enclosing section or form for card injection
    let injectionContainer = form;
    if (!injectionContainer) {
      injectionContainer = fileInput.closest('.card, .section, div[class*="container"], fieldset') || fileInput.parentElement;
    }

    // Find submit button in form or container
    let submitBtn = null;
    if (form) {
      submitBtn = form.querySelector('input[type="submit"], button[type="submit"], button, input[value*="Import" i]');
    }
    if (!submitBtn && injectionContainer) {
      submitBtn = injectionContainer.querySelector('input[value*="Import" i], button[value*="Import" i], button[type="submit"], input[type="submit"]');
    }
    if (!submitBtn) {
      const allButtons = Array.from(document.querySelectorAll('input[type="submit"], button[type="submit"], button, a.button'));
      submitBtn = allButtons.find(b => {
        const txt = (b.textContent || b.value || '').toLowerCase();
        return txt.includes('import') && (txt.includes('goodreads') || txt.includes('library'));
      });
    }

    return {
      fileInput,
      form,
      injectionContainer,
      submitBtn
    };
  }

  function initStoryGraphGoodreadsImport() {
    console.log('[Trackstar] Checking for StoryGraph Goodreads import elements...');

    function tryInject() {
      if (document.getElementById('trackstar-sg-outbound-card')) return true;
      const target = findGoodreadsImportTarget();
      if (target && target.fileInput) {
        injectStoryGraphOutboundCard(target);
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
    }, 350);
  }

  function injectStoryGraphOutboundCard(target) {
    if (document.getElementById('trackstar-sg-outbound-card')) return;
    const { fileInput, form, injectionContainer } = target;

    const card = document.createElement('div');
    card.id = 'trackstar-sg-outbound-card';
    card.className = 'trackstar-card';
    card.innerHTML = `
      <div class="trackstar-card-header">
        <div class="trackstar-card-brand">
          <div class="trackstar-logo-sm">t*</div>
          <div>
            <h3 class="trackstar-card-title">1-Click PDS → StoryGraph Outbound Sync</h3>
            <p class="trackstar-card-subtitle">Sync books recorded in Trackstar PDS directly into your StoryGraph library</p>
          </div>
        </div>
        <span class="trackstar-badge">Outbound Sync</span>
      </div>

      <div class="trackstar-card-body">
        <p id="trackstar-outbound-desc" class="trackstar-card-desc">
          Checking unsynced books in your PDS...
        </p>

        <div id="trackstar-outbound-status-msg" class="trackstar-status-msg hidden"></div>

        <div class="trackstar-card-actions">
          <button id="btn-trackstar-sg-outbound-sync" 
                  class="trackstar-btn trackstar-btn-primary" 
                  disabled>
            1-Click Sync Books to StoryGraph
          </button>
          <a href="http://localhost:4200" target="_blank" class="trackstar-btn trackstar-btn-secondary">
            Open Trackstar ↗
          </a>
        </div>
      </div>
    `;

    // Inject directly above the Goodreads import form or section
    if (form && form.parentNode) {
      form.parentNode.insertBefore(card, form);
    } else if (injectionContainer && injectionContainer.parentNode) {
      injectionContainer.parentNode.insertBefore(card, injectionContainer);
    } else if (fileInput.parentNode) {
      fileInput.parentNode.insertBefore(card, fileInput);
    } else {
      document.body.appendChild(card);
    }

    updateOutboundCardBooks();
  }

  let currentUnsyncedBooks = [];

  async function updateOutboundCardBooks() {
    const desc = document.getElementById('trackstar-outbound-desc');
    const btnSync = document.getElementById('btn-trackstar-sg-outbound-sync');

    try {
      const res = await new Promise(r => chrome.runtime.sendMessage({ type: 'FETCH_BOOKS' }, r));
      if (res && res.success) {
        currentUnsyncedBooks = (res.data || []).filter(b => !b.isSynced && b.source !== 'storygraph');
      }
    } catch (e) {
      console.warn('[Trackstar] Could not fetch unsynced books:', e);
    }

    if (desc) {
      desc.innerHTML = currentUnsyncedBooks.length > 0
        ? `You have <strong>${currentUnsyncedBooks.length}</strong> unsynced book(s) in your PDS ready to be imported into StoryGraph.`
        : `All books currently in your PDS are already marked as synced to StoryGraph!`;
    }

    if (btnSync) {
      btnSync.textContent = `1-Click Sync (${currentUnsyncedBooks.length} Books) to StoryGraph`;
      btnSync.disabled = currentUnsyncedBooks.length === 0;
      btnSync.onclick = () => runStoryGraphOutboundSync(currentUnsyncedBooks);
    }
  }

  async function runStoryGraphOutboundSync(books) {
    const btn = document.getElementById('btn-trackstar-sg-outbound-sync');
    const statusMsg = document.getElementById('trackstar-outbound-status-msg');

    if (btn) btn.disabled = true;

    try {
      if (!books || books.length === 0) {
        throw new Error('No unsynced books found in PDS.');
      }

      const target = findGoodreadsImportTarget();
      if (!target || !target.fileInput) {
        throw new Error('Could not locate the StoryGraph Goodreads CSV file input. Please ensure you are in the Goodreads Import section of your StoryGraph account.');
      }

      showTrackstarBanner(`Generating Goodreads-format CSV for ${books.length} books...`, 'info', 3000);

      // 1. Generate Goodreads CSV in memory
      const csvContent = generateGoodreadsCsv(books);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], 'goodreads_library_export.csv', { type: 'text/csv' });

      // 2. Programmatically attach to the GOODREADS file input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      target.fileInput.files = dataTransfer.files;

      // Dispatch input & change events for Turbo/Stimulus/React/native listeners
      target.fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      target.fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

      // Also update filename display label if present
      const label = document.querySelector(`label[for="${target.fileInput.id}"]`) || target.fileInput.closest('label');
      const filenameSpan = target.fileInput.parentElement?.querySelector('.custom-file-label, .file-name, span');
      if (filenameSpan && filenameSpan.textContent.toLowerCase().includes('no file')) {
        filenameSpan.textContent = file.name;
      }

      // 3. Mark books as synced & update source in PDS
      await new Promise(r => chrome.runtime.sendMessage({
        type: 'MARK_BOOKS_SYNCED',
        books: books
      }, r));

      // 4. Highlight the "Import my Goodreads library" submit button
      const submitBtn = target.submitBtn || document.querySelector('input[value*="Import" i], button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add('trackstar-highlight-btn');
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Create download URL for fallback button
      const downloadUrl = URL.createObjectURL(blob);

      if (statusMsg) {
        statusMsg.className = 'trackstar-status-msg trackstar-status-success';
        statusMsg.innerHTML = `
          <strong>✓ CSV Attached (${books.length} Books)!</strong><br>
          File <code>goodreads_library_export.csv</code> has been attached to the Goodreads import form.<br>
          Click the highlighted <strong>"Import my Goodreads library"</strong> button below to complete the import.
          <div style="margin-top: 10px;">
            <a href="${downloadUrl}" download="goodreads_library_export.csv" class="trackstar-btn trackstar-btn-secondary" style="font-size: 11px; padding: 6px 12px;">
              Download Generated CSV (Fallback)
            </a>
          </div>
        `;
        statusMsg.classList.remove('hidden');
      }

      showTrackstarBanner(`CSV generated & attached! Click "Import my Goodreads library" below.`, 'success', 8000);

    } catch (err) {
      console.error('[Trackstar Outbound Sync Error]:', err);
      if (statusMsg) {
        statusMsg.className = 'trackstar-status-msg trackstar-status-error';
        statusMsg.textContent = `Error: ${err.message}`;
        statusMsg.classList.remove('hidden');
      }
      showTrackstarBanner(`Sync error: ${err.message}`, 'warn', 8000);
      if (btn) btn.disabled = false;
    }
  }

  // =========================================================================
  // ROUTING & LIFECYCLE (Supports Turbo / Hotwire / SPA Navigation)
  // =========================================================================
  function handleNavigation() {
    const path = window.location.pathname;

    if (path.includes('/user-export')) {
      document.getElementById('trackstar-sg-outbound-card')?.remove();
      initStoryGraphExport();
    } else {
      document.getElementById('trackstar-sg-export-card')?.remove();
      initStoryGraphGoodreadsImport();
    }
  }

  handleNavigation();

  window.addEventListener('turbo:load', handleNavigation);
  window.addEventListener('turbo:render', handleNavigation);
  window.addEventListener('turbolinks:load', handleNavigation);
  window.addEventListener('popstate', handleNavigation);

  // MutationObserver to safely detect dynamically loaded import containers
  const observer = new MutationObserver(() => {
    const path = window.location.pathname;
    if (path.includes('/user-export')) {
      if (!document.getElementById('trackstar-sg-export-card')) {
        initStoryGraphExport();
      }
    } else {
      if (!document.getElementById('trackstar-sg-outbound-card')) {
        initStoryGraphGoodreadsImport();
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
