import os
import sys
import requests
from atproto import Client, models

PDS_URL = "http://localhost:3000"
ADMIN_PASS = "trackstar_admin"
HANDLE = "kentrain.trackstar.test"
EMAIL = "kentrain@trackstar.test"
PASSWORD = "password123"

print("1. Checking if PDS is accessible...")
try:
    requests.get(f"{PDS_URL}/xrpc/_health")
except Exception as e:
    print(f"Error connecting to PDS: {e}")
    print("Make sure the docker container is running.")
    sys.exit(1)

print("2. Generating invite code via admin API...")
res = requests.post(
    f"{PDS_URL}/xrpc/com.atproto.server.createInviteCode",
    json={"useCount": 1},
    auth=("admin", ADMIN_PASS)
)
if res.status_code != 200:
    print(f"Failed to create invite code: {res.text}")
    sys.exit(1)
    
invite_code = res.json().get("code")
print(f"   -> Invite code generated: {invite_code}")

print(f"3. Creating account {HANDLE}...")
client = Client(base_url=PDS_URL)
try:
    profile = client.com.atproto.server.create_account(models.ComAtprotoServerCreateAccount.Data(
        email=EMAIL,
        handle=HANDLE,
        password=PASSWORD,
        invite_code=invite_code
    ))
    print(f"   -> Account created successfully!")
    print(f"   -> DID: {profile.did}")
    print(f"   -> Handle: {profile.handle}")
except Exception as e:
    if "Account already exists" in str(e) or "Handle already taken" in str(e):
        print("   -> Account already exists!")
    else:
        print(f"Failed to create account: {e}")
        sys.exit(1)

print("\n=== SUCCESS ===")
print("You now have a local AT Protocol PDS running with a test account.")
