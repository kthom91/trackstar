# Trackstar

A personal tracking app that uses the AT Protocol (Bluesky) to store a user's logged media and events, without a centralized backend.

## Language

**Lexicon**:
The specific AT Protocol schema used to shape data for a given tracking type in the user's PDB. Can be an existing ecosystem standard (like Teal) or a custom trackstar schema.
_Avoid_: Schema, Table

**Provider API**:
A free, CORS-friendly, or BYOK (Bring Your Own Key) third-party service used to fetch metadata and images for a tracked item on the client side.
_Avoid_: Backend, Database

**Manual Entry**:
The creation of a tracking record purely via user input, used when a Provider API is unavailable (e.g., life events) or when overriding fetched data.
_Avoid_: Custom record
