#!/bin/sh
# wait-for-sqlserver.sh

set -e

host="$1"
port="$2"
shift 2

until nc -z "$host" "$port"; do
  echo "Waiting for SQL Server at $host:$port..."
  sleep 2
done

exec "$@" 