#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE blog'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'blog')\gexec
EOSQL
