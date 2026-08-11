#!/usr/bin/env bash
# Credentials for the test suites.
#
# Copy this to test-env.sh and put the real values in. test-env.sh is
# gitignored; this template is not, so nothing secret is ever committed.
#
#   cp backend/tools/test-env.example.sh backend/tools/test-env.sh
#
# The suites refuse to run without these rather than falling back to a
# built-in default — a default password in a script is a password in the
# repository, which is exactly how the old one ended up public.

export MYSQL_PWD='your-mysql-password'
export ADMIN_EMAIL='admin@example.com'
export ADMIN_PASSWORD='your-admin-password'
