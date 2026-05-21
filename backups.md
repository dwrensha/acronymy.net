To create a backup, do this:

```
wrangler --env prod d1 execute acronymy-prod --remote --json --command "select word, def, author, timestamp, original_author, original_timestamp from defs_log;" > backup.json
```
