# Legacy Log Migration Plan

This document outlines the migration plan to transition records from the unified `app.trackstar.log` to distinct lexicons: `app.trackstar.movie`, `app.trackstar.book`, and `app.trackstar.concert`.

## 1. Field Mapping

### Movies (`app.trackstar.movie`)
- `title` <- `title`
- `status` <- `status`
- `rating` <- `rating`
- `review` <- `review`
- `loggedAt` <- `loggedAt`
- `completedAt` <- `completedAt`
- `source` <- `source`
- `director` <- `metadata.director`
- `year` <- `metadata.year`
- `posterUrl` <- `metadata.posterUrl` OR `coverUrl`

### Books (`app.trackstar.book`)
- `title` <- `title`
- `status` <- `status`
- `rating` <- `rating`
- `review` <- `review`
- `loggedAt` <- `loggedAt`
- `completedAt` <- `completedAt`
- `source` <- `source`
- `author` <- `metadata.author`
- `year` <- `metadata.year`
- `isbn` <- `metadata.isbn`
- `coverUrl` <- `coverUrl`

### Concerts (`app.trackstar.concert`)
- `artist` <- `metadata.artist`
- `status` <- `status`
- `rating` <- `rating`
- `review` <- `review`
- `loggedAt` <- `loggedAt`
- `source` <- `source`
- `tour` <- `metadata.tour`
- `venue` <- `metadata.venue`
- `city` <- `metadata.city`
- `date` <- `metadata.date` OR `startedAt`
- `imageUrl` <- `coverUrl` OR `metadata.image_url`

## 2. Execution Strategy

1. **Client Deployment**: Deploy the client with the new module registry supporting both reading the new distinct lexicons and reading the old `app.trackstar.log` for backward compatibility. New logs will be written to the distinct lexicons.
2. **Migration Script**: Provide a UI button or a background task on the client that:
   - Fetches all `app.trackstar.log` records via `com.atproto.repo.listRecords`.
   - Iterates through and maps them to the new schema payloads based on `mediaType`.
   - Uses `com.atproto.repo.applyWrites` to batch upload the new records.
3. **Validation & Cleanup**: 
   - Verify the new records display correctly in the unified timeline.
   - Batch delete the old `app.trackstar.log` records (or leave them for a deprecation period of 30 days).
