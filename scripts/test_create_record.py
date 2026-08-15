import os
from atproto import Client

PDS_URL = "http://localhost:3000"
HANDLE = "kentrain.trackstar.test"
PASSWORD = "password123"

client = Client(base_url=PDS_URL)

# Mock get_profile so login doesn't fail when trying to fetch the bsky profile
client.app.bsky.actor.get_profile = lambda *args, **kwargs: type('Profile', (), {'did': HANDLE})()

res = client.login(HANDLE, PASSWORD)
print("Logged in as:", client.me.did)

media_record = {
    "$type": "app.trackstar.media",
    "id": "book:1234",
    "mediaType": "book",
    "title": "Test Book",
    "createdAt": "2023-10-15T12:00:00Z"
}

try:
    res = client.com.atproto.repo.create_record(
        {"collection": "app.trackstar.media", "repo": client.me.did, "record": media_record}
    )
    print("Created media record successfully!")
    print(res.uri)
except Exception as e:
    print("Error:", e)
