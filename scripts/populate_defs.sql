INSERT INTO defs (word, def_id)
SELECT a.word, a.rowid
FROM (
    SELECT rowid, *,
           ROW_NUMBER() OVER (PARTITION BY word ORDER BY timestamp DESC) as rn
    FROM defs_log
) a
WHERE a.rn = 1
ON CONFLICT (word)
DO UPDATE SET def_id = excluded.def_id;
