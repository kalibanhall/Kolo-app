#!/bin/bash
# KOLO Quick Deploy - Run this on your VPS
# Usage: bash <(curl -sL https://bit.ly/kolo-deploy)

set -e
apt update && apt install -y curl git
curl -sL https://raw.githubusercontent.com/kalibanhall/Kolo-app/main/scripts/vps-deploy.sh | bash
