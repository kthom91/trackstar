# Self-Hosting AT Protocol PDS for TrackStar

This directory contains the production deployment stack for running a personal **AT Protocol Personal Data Server (PDS)** on an Ubuntu Linux server with your custom domain name and automatic TLS/SSL certificates via Caddy.

---

## Architecture Overview

```mermaid
graph LR
    User["TrackStar Web App / Extension"] -->|HTTPS (Port 443)| Caddy["Caddy Reverse Proxy<br/>(Auto TLS / Certbot)"]
    Caddy -->|HTTP :3000| PDS["Bluesky / ATProto PDS<br/>(Docker Container)"]
    PDS -->|PLC Registration| PLC["plc.directory"]
    PDS -->|Federation / Crawlers| BSKY["bsky.network"]
    PDS --> Disk["/var/lib/pds or ./data<br/>(SQLite / MST Blocks)"]
```

---

## Prerequisites

1. **Ubuntu Server** (20.04 LTS or 22.04/24.04 LTS recommended) with root/sudo access.
2. **Domain Name** (e.g., `yourdomain.com` managed on Cloudflare, Namecheap, Porkbun, etc.).
3. **Static IP or Dynamic DNS (DDNS)** on your home network.
4. **Port Forwarding**: Ports `80` (HTTP) and `443` (HTTPS) forwarded on your home router to your Ubuntu server's local IP address.
5. **Docker & Docker Compose**:
   ```bash
   # Quick install Docker on Ubuntu if not already installed:
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

---

## Step-by-Step Deployment Guide

### Step 1: DNS Configuration
Before starting the server, create the DNS record with your registrar:

| Record Type | Name / Host | Value / Target | Description |
| :--- | :--- | :--- | :--- |
| **A** (or CNAME) | `pds` (or apex `@`) | `<Your Home Public IP>` | Directs `pds.yourdomain.com` to your server. |

> [!TIP]
> If your ISP changes your public IP periodically, use a Dynamic DNS (DDNS) client like `ddclient` or Cloudflare DDNS Docker container to update this `A` record automatically.

---

### Step 2: Copy Files to Ubuntu Server
Clone this repository or copy the `deploy/pds` directory to your Ubuntu server:

```bash
# Example using rsync or scp
rsync -avz deploy/pds/ user@your-ubuntu-server:~/trackstar-pds/
```

On your Ubuntu server, navigate to the directory:
```bash
cd ~/trackstar-pds
```

---

### Step 3: Run Automated Setup & Secret Generation
Run the automated setup script. It will generate your `K256` PLC rotation key, secure JWT secrets, and admin password:

```bash
./setup.sh pds.yourdomain.com
```

This creates a secured `.env` configuration file and initializes the `./data` storage directory.

---

### Step 4: Launch the PDS Stack
Start Caddy and the ATProto PDS container:

```bash
./manage.sh start
# Or: docker compose up -d
```

Caddy will automatically request and install a Let's Encrypt / ZeroSSL TLS certificate for your domain.

---

### Step 5: Verify Health
Check that both the local container and the public HTTPS endpoint are responding:

```bash
./manage.sh health
```

You should see a `200 OK` response with `{"version":"..."}` from `https://pds.yourdomain.com/xrpc/_health`.

---

### Step 6: Create Your User Account
Create your primary TrackStar user account on your self-hosted PDS:

```bash
./manage.sh create-account
```

You will be prompted for:
1. **Handle**: e.g., `kenny.yourdomain.com` or `kenny.pds.yourdomain.com`
2. **Email**: Your contact email
3. **Password**: Your login password

The script will automatically request an invite code and register the account with your PDS and the AT Protocol PLC directory (`plc.directory`).

---

### Step 7: Handle Verification (Custom Domain Handles)

If your handle is `yourdomain.com` or `user.yourdomain.com`:

1. In your DNS provider, add a **TXT** record:
   - **Host / Name**: `_atproto` (for apex) or `_atproto.user` (for subdomain)
   - **Value**: `did=did:plc:abcdef123456...` *(the DID output from Step 6)*
2. The AT Protocol network will automatically resolve your handle to your PDS DID.

---

## Management Commands

The included `./manage.sh` helper provides easy commands:

| Command | Description |
| :--- | :--- |
| `./manage.sh start` | Starts all containers in the background |
| `./manage.sh stop` | Gracefully stops the containers |
| `./manage.sh restart` | Restarts all containers |
| `./manage.sh health` | Tests health check endpoints |
| `./manage.sh create-account` | Interactively provisions a user account |
| `./manage.sh create-invite` | Generates a new single-use or multi-use invite code |
| `./manage.sh logs [pds\|caddy]` | Streams live container logs |

---

## Connecting TrackStar to Your PDS

Once your PDS is live:
1. Open the **TrackStar Web App** or **Browser Extension**.
2. Set the PDS Service URL to `https://pds.yourdomain.com`.
3. Log in with your handle and password (or an App Password generated in your account).
4. All media logs (`app.trackstar.log`) will now be persisted directly to your self-hosted PDS repository!
