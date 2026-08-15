import os
from atproto import Client

PDS_URL = "http://localhost:3000"
HANDLE = "kentrain.trackstar.test"
PASSWORD = "password123"

client = Client(base_url=PDS_URL)
client.app.bsky.actor.get_profile = lambda *args, **kwargs: type('Profile', (), {'did': HANDLE})()
client.login(HANDLE, PASSWORD)

res = client.com.atproto.repo.list_records({
    "collection": "app.trackstar.log",
    "repo": client._session.did,
    "limit": 5
})

print(f"Total Logs in PDS: {len(res.records)}")
for r in res.records:
    print(r.uri)
    print(r.value)
