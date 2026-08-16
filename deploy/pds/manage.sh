#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Run ./setup.sh first."
    exit 1
fi

# Load environment variables
# shellcheck source=/dev/null
source .env

COMMAND="${1:-}"

case "$COMMAND" in
    "create-invite")
        USE_COUNT="${2:-1}"
        echo ">> Generating invite code (use count: $USE_COUNT)..."
        RES=$(curl -s -X POST "http://127.0.0.1:3000/xrpc/com.atproto.server.createInviteCode" \
            -u "admin:$PDS_ADMIN_PASSWORD" \
            -H "Content-Type: application/json" \
            -d "{\"useCount\": $USE_COUNT}")
        echo "$RES" | grep -o '"code":"[^"]*' | cut -d'"' -f4 || echo "$RES"
        ;;

    "create-account")
        echo "========================================================"
        echo "           Create AT Protocol User Account              "
        echo "========================================================"
        read -rp "Enter Handle (e.g. yourname.$PDS_HOSTNAME or custom domain): " HANDLE
        read -rp "Enter Email: " EMAIL
        read -s -rp "Enter Password: " PASSWORD
        echo ""

        # Generate invite code first
        echo ">> Requesting invite code from local PDS..."
        INVITE_RES=$(curl -s -X POST "http://127.0.0.1:3000/xrpc/com.atproto.server.createInviteCode" \
            -u "admin:$PDS_ADMIN_PASSWORD" \
            -H "Content-Type: application/json" \
            -d '{"useCount": 1}')
        INVITE_CODE=$(echo "$INVITE_RES" | grep -o '"code":"[^"]*' | cut -d'"' -f4)

        if [ -z "$INVITE_CODE" ]; then
            echo "❌ Failed to generate invite code. Response:"
            echo "$INVITE_RES"
            exit 1
        fi

        echo ">> Invite code obtained: $INVITE_CODE"
        echo ">> Registering account: $HANDLE ($EMAIL)..."

        CREATE_RES=$(curl -s -X POST "http://127.0.0.1:3000/xrpc/com.atproto.server.createAccount" \
            -H "Content-Type: application/json" \
            -d "{
                \"handle\": \"$HANDLE\",
                \"email\": \"$EMAIL\",
                \"password\": \"$PASSWORD\",
                \"inviteCode\": \"$INVITE_CODE\"
            }")

        DID=$(echo "$CREATE_RES" | grep -o '"did":"[^"]*' | cut -d'"' -f4)
        if [ -n "$DID" ]; then
            echo ""
            echo "✅ Account successfully created!"
            echo "--------------------------------------------------------"
            echo "DID:     $DID"
            echo "Handle:  $HANDLE"
            echo "PDS:     https://$PDS_HOSTNAME"
            echo "--------------------------------------------------------"
            echo ""
            echo "ℹ️  Next Step for Custom Domain Handles:"
            echo "   If using a custom domain handle (not ending in $PDS_HOSTNAME):"
            echo "   Add a DNS TXT record at: _atproto.$HANDLE"
            echo "   Value: did=$DID"
        else
            echo "❌ Account creation failed. Response:"
            echo "$CREATE_RES"
        fi
        ;;

    "health")
        echo ">> Checking PDS local health..."
        curl -i -s "http://127.0.0.1:3000/xrpc/_health" || true
        echo ""
        echo ">> Checking PDS public endpoint (https://$PDS_HOSTNAME/xrpc/_health)..."
        curl -i -s "https://$PDS_HOSTNAME/xrpc/_health" || true
        ;;

    "logs")
        docker compose logs -f "${2:-}"
        ;;

    "start")
        docker compose up -d
        ;;

    "stop")
        docker compose down
        ;;

    "restart")
        docker compose restart
        ;;

    *)
        echo "Usage: ./manage.sh <command>"
        echo ""
        echo "Available commands:"
        echo "  start           Start the PDS and Caddy services"
        echo "  stop            Stop the PDS and Caddy services"
        echo "  restart         Restart all services"
        echo "  health          Test health status of local & public PDS"
        echo "  create-account  Interactively create a user account on your PDS"
        echo "  create-invite   Generate an invite code"
        echo "  logs [service]  Tail container logs (e.g. './manage.sh logs pds')"
        echo ""
        ;;
esac
