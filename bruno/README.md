# TrackStar PDS Local Bruno Collection

A complete Bruno API collection to test, explore, and interact directly with your AT Protocol Personal Data Server (PDS) and the TrackStar unified log lexicon (`app.trackstar.log`).

## Getting Started

1. Open [Bruno](https://usebruno.com/).
2. Click **Open Collection** and select the `bruno/` directory inside this repository.
3. In the top-right environment dropdown, select:
   - **Local**: For local development (`http://localhost:3000`).
   - **Prod**: For the Bluesky-hosted PDS (`https://bsky.social`) with `kthom91.bsky.social`.
4. Enter your password / App Password and run request **`1-server-and-auth/2-Create-Session-Login`** — this will authenticate against your selected PDS and automatically capture `{{accessJwt}}` and `{{did}}` for all subsequent requests!

---

## Included Requests

### 1. Server & Auth
- **Describe Server**: `GET /xrpc/com.atproto.server.describeServer`
- **Create Session (Login)**: `POST /xrpc/com.atproto.server.createSession` (Captures JWT tokens into environment)
- **Get Current Session**: `GET /xrpc/com.atproto.server.getSession`
- **Refresh Session**: `POST /xrpc/com.atproto.server.refreshSession`

### 2. Identity & Repository
- **Describe Repo**: `GET /xrpc/com.atproto.repo.describeRepo`
- **Resolve Handle**: `GET /xrpc/com.atproto.identity.resolveHandle`

### 3. TrackStar Lexicons (CRUD & Purge)
- **List Logs**: `GET /xrpc/com.atproto.repo.listRecords?collection=app.trackstar.log`
- **Put Log Record**: `POST /xrpc/com.atproto.repo.putRecord` (Creates/updates self-contained `app.trackstar.log`)
- **Get Log Record**: `GET /xrpc/com.atproto.repo.getRecord`
- **Delete Log Record**: `POST /xrpc/com.atproto.repo.deleteRecord` (Single record delete)
- **Apply Writes (Batch Delete)**: `POST /xrpc/com.atproto.repo.applyWrites` (Atomic multi-record batch delete)
- **Purge All TrackStar Records**: `POST /xrpc/com.atproto.repo.applyWrites` (1-click scripted scan & wipe)

### 4. Sequencer & Sync
- **Get Latest Commit**: `GET /xrpc/com.atproto.sync.getLatestCommit`
- **Get Repo CAR Archive**: `GET /xrpc/com.atproto.sync.getRepo`
- **List Hosted Repos**: `GET /xrpc/com.atproto.sync.listRepos`
