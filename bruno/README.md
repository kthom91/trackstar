# TrackStar PDS Local Bruno Collection

A complete Bruno API collection to test, explore, and interact directly with your AT Protocol Personal Data Server (PDS) and TrackStar lexicons (`app.trackstar.media`, `app.trackstar.log`).

## Getting Started

1. Open [Bruno](https://usebruno.com/).
2. Click **Open Collection** and select the `bruno/` directory inside this repository.
3. In the top-right environment dropdown, select **Local**.
4. Run request **`1-server-and-auth/2-Create-Session-Login`** — this will authenticate against `http://localhost:3000` with test credentials (`kentrain.trackstar.test` / `password123`) and automatically set `{{accessJwt}}` and `{{did}}` for all subsequent requests!

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

### 3. TrackStar Lexicons (CRUD, Prefix Ranges, & Purge)
- **List Media Items**: `GET /xrpc/com.atproto.repo.listRecords?collection=app.trackstar.media`
- **Put Media Record**: `POST /xrpc/com.atproto.repo.putRecord` (Creates/updates `app.trackstar.media`)
- **List Logs**: `GET /xrpc/com.atproto.repo.listRecords?collection=app.trackstar.log`
- **Put Log Record**: `POST /xrpc/com.atproto.repo.putRecord` (Creates/updates `app.trackstar.log`)
- **Get Log Record**: `GET /xrpc/com.atproto.repo.getRecord`
- **Delete Log Record**: `POST /xrpc/com.atproto.repo.deleteRecord` (Single record delete)
- **Apply Writes (Batch Delete)**: `POST /xrpc/com.atproto.repo.applyWrites` (Atomic multi-record batch delete)
- **List Media By Prefix (Movies)**: `GET /xrpc/com.atproto.repo.listRecords?...&rkeyStart=movie_&rkeyEnd=movie_~` (MST prefix query)
- **List Media By Prefix (Books)**: `GET /xrpc/com.atproto.repo.listRecords?...&rkeyStart=book_&rkeyEnd=book_~` (MST prefix query)
- **List Media By Prefix (Concerts)**: `GET /xrpc/com.atproto.repo.listRecords?...&rkeyStart=concert_&rkeyEnd=concert_~` (MST prefix query)
- **Purge All TrackStar Records**: `POST /xrpc/com.atproto.repo.applyWrites` (1-click scripted scan & wipe)
- **Seed Variety TrackStar Records**: `POST /xrpc/com.atproto.repo.applyWrites` (1-click atomic seed with books, movies, concerts across all lifecycle states)


### 4. Sequencer & Sync
- **Get Latest Commit**: `GET /xrpc/com.atproto.sync.getLatestCommit`
- **Get Repo CAR Archive**: `GET /xrpc/com.atproto.sync.getRepo`
- **List Hosted Repos**: `GET /xrpc/com.atproto.sync.listRepos`

### 5. Testing
- **Add Books Test Batch**: `POST /xrpc/com.atproto.repo.applyWrites` (Batch adds in-progress, want-to-read, and completed books in one atomic request)
- **Add Movies Test Batch**: `POST /xrpc/com.atproto.repo.applyWrites` (Batch adds completed and want-to-watch movies in one atomic request)
- **Add Attended Concert Test**: `POST /xrpc/com.atproto.repo.applyWrites` (Adds an attended/completed concert with venue metadata in one atomic request)
