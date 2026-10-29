# raw/ — immutable sources

Files in this directory are the original inputs the wiki is derived from. They are read-only:
never edit, rename, re-export or delete a file here. Add new sources as new files and ingest
them into `wiki/` (see the ingest operation in [AGENTS.md](../AGENTS.md)).

| File | What it is | Ingested |
| --- | --- | --- |
| `pasillo-plan-de-construccion.pdf` | The 21-page build plan for COMPA (Spanish, dated 2026-10-28); the former product name in the file name is explained in `wiki/glossary.md`. | 2026-10-28, see [wiki/sources/build-plan.md](../wiki/sources/build-plan.md) |

The `pre-commit` hook rejects modifications or deletions under `raw/`.
