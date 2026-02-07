#!/usr/bin/bash

npx wrangler --env prod d1 execute acronymy-prod --remote --command "SELECT word from words" --json | jq -r '.[0].results[].word'
