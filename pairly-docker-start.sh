#!/bin/bash
# Start Pairly PostgreSQL and Redis; run after Docker is up (e.g. from systemd)
# Usage: run from project root or pass path: ./pairly-docker-start.sh [path-to-project]
cd "${1:-$(dirname "$0")}" && docker-compose up -d
