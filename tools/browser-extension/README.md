# Trackstar — Media PDS Companion (Chrome Extension)

A companion Manifest V3 browser extension for Google Chrome, Brave, and Edge that enables 1-click data sync between your **AT Protocol Personal Data Server (PDS)**, **Letterboxd**, **StoryGraph**, and **setlist.fm**.

---

## Extension Interface & Architecture

The popup features a clean **2-tab architecture**:

### 1. Tab 1: Integrations
A dynamic, registry-driven list of media platforms:
* **Letterboxd**: **Export Letterboxd** (triggers 1-click PDS ingest on `letterboxd.com/settings/data/`) and **Sync Watchlist** (opens watchlist to ingest into PDS).
* **StoryGraph**: **Export StoryGraph** (triggers 1-click ingest from `app.thestorygraph.com/user-export`) and **Sync StoryGraph** (opens StoryGraph Goodreads import).
* **setlist.fm**: **Export setlist.fm** (opens Trackstar concert importer).
* *Future-ready architecture*: New services (Spotify, Goodreads, Trakt, Steam) can be dynamically registered in `INTEGRATIONS` registry in `popup.js`.

### 2. Tab 2: Unsynced Items
Displays only items in your PDS that need outbound syncing to platforms:
* **Completed Movies**: **`Sync to Diary ↗`** opens Letterboxd with pre-filled review, star rating, and viewing date.
* **Concerts**: **`Sync to setlist.fm ↗`** links directly to the concert on setlist.fm.
* **Books**: Links to StoryGraph.
* Automatically displays an *"All Caught Up!"* empty state when everything is synced.

---

## How to Install in Chrome / Brave / Edge

1. Open your browser and navigate to the Extensions management page:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **"Developer mode"** (toggle in the top-right corner).
3. Click the **"Load unpacked"** button.
4. Select the directory:
   ```
   tools/browser-extension
   ```
5. The **Trackstar PDS Sync** icon (`t*`) will appear in your extension toolbar. Pin it for quick access!
