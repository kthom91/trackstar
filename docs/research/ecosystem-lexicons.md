# AT Protocol Ecosystem Lexicon Research

## Music Scrobbles (Teal)
**Teal (teal.fm)** provides a standardized Lexicon for music scrobbling, primarily using schemas like `fm.teal.feed.play`. It allows apps to record music listening data across the network without central API keys. Projects like **Malachite** convert legacy scrobbles (from Last.fm or Spotify) into Teal-compliant records, and apps like **Rocksky** interoperate with Teal metadata.

## Podcasts
Developers are exploring Lexicons to improve podcast synchronization and discovery. Projects like **pckt.blog** use Lexicons to bridge the AT Protocol and traditional RSS to offer richer podcast feeds, while tools like **Lexicon Garden** are helping to track podcast-related schemas.

## Video Games
Lexicons are being introduced to share in-game data, achievements, and cross-machine gameplay experiences on the protocol. The AT Protocol allows storing game states and social data in user-controlled repositories to "decentralize" gaming features.

## Board Games
Custom Lexicons are defining schemas for turn-based games (like chess), where the board state is saved as a record in a Personal Data Server (PDS). Experimental frameworks exist to handle multiplayer logic with Lexicon-based validation for consistent state.

## Travel & Attractions
Because official schemas lack geolocation, community developers are building location-based Lexicons. Projects like **Anchor** are creating schemas for Foursquare-style social check-ins and venue tagging.
