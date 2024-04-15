To create a backup, do this:

```
wrangler --env prod d1 execute acronymy-prod --remote --json --command "select * from defs_log;" > backup.json
```
