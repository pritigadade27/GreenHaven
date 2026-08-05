# Database scripts

Kept **outside** `src/main/resources` on purpose. Anything under `resources` is
compiled into the deployable JAR, and `schema.sql` begins by dropping all
eleven tables — a single `spring.sql.init.mode=always` away from destroying
production. Spring never runs these; they are applied deliberately, by hand.

Run them in this order, once, on a fresh machine:

| File | Run as | What it does |
|---|---|---|
| `setup-user.sql` | MySQL **root** | Creates the `green_haven` database and the application user. Replace the placeholder password before running. |
| `schema.sql` | app user | Drops and recreates all tables, indexes and foreign keys. **Destructive** — it deletes every order. |
| `data.sql` | app user | Seeds categories, badges and all 154 products. Generated — do not edit by hand. |

```powershell
# from backend\
.\tools\mysql.ps1 reload      # schema.sql then data.sql
node .\tools\generate-seed-sql.mjs   # regenerate data.sql from the React catalogue
```

`data.sql` is generated from `frontend/src/data/*.js` so the catalogue has one
source of truth. Regenerate it rather than editing it.
