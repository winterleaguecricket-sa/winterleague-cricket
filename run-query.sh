#!/bin/bash
# Helper script to run SQL queries on the production database via SSH
# Usage: ./run-query.sh "SELECT * FROM table;"
# Or:    ./run-query.sh /path/to/query.sql

export SSHPASS='Bailey&Love2015!'
REMOTE="vmycnmyo@winterleaguecricket.co.za"
SSH_OPTS="-o StrictHostKeyChecking=no"
DB_CONN='PGPASSWORD="Bailey&Love2015!" psql -h localhost -U winterleague_user -d winterleague_cricket'

if [ -z "$1" ]; then
    echo "Usage: $0 \"SQL query\" or $0 /path/to/file.sql"
    exit 1
fi

# If argument is a file, read it; otherwise treat as inline SQL
if [ -f "$1" ]; then
    SQL=$(cat "$1")
else
    SQL="$1"
fi

# Write SQL to temp file on remote, execute, clean up
REMOTE_TMP="/tmp/wlc_query_$$.sql"
echo "$SQL" | sshpass -e ssh $SSH_OPTS "$REMOTE" "cat > $REMOTE_TMP && ${DB_CONN} -f $REMOTE_TMP; rm -f $REMOTE_TMP"
