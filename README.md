# TrackStar (`track*`) — V1

TrackStar is a self-hosted personal media tracking application for logging books, movies, and concerts. It utilizes an event-log / record model in V1 to support individual usage while preparing for federated social synchronization ("Track Meet") in V2.

---

## Features

- **Books (Goodreads & Open Library)**: Import Goodreads CSV exports mapped to shelves (`to-read`, `currently-reading`, `read`), enriched with cover images and publish details via Open Library API.
- **Movies (Letterboxd & TMDB)**: Import Letterboxd `watched.csv` exports or poll Letterboxd RSS feeds, enriched with TMDB movie posters and ratings.
- **Concerts (setlist.fm)**: Synchronize live concert attendance history via setlist.fm REST API with 24-hour background cron scheduling (`APScheduler`).
- **AT Protocol Ready**: SQLModel database schema includes `at_uri`, `at_cid`, and `synced_to_pds` fields ready for PDS migration.
- **Angular 21 + Tailwind CSS Client**: Responsive, accessible (`@angular/aria`), glassmorphic single-page web app.

---

## Quickstart

### 1. Backend Setup with `uv`

```bash
# Install dependencies and sync environment
uv sync

# Run database migrations & FastAPI server
uv run uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` to inspect interactive OpenAPI documentation.

### 2. Frontend Setup (Angular 21)

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Open `http://localhost:4200` to launch the Angular Web Client.

---

## Docker Deployment

Build and start the complete backend environment:

```bash
docker-compose up -d --build
```

---

## Running Unit Tests

```bash
uv run pytest
```
