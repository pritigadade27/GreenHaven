# Deploying Green Haven

Three pieces, three free services:

| Piece | Host | Free tier |
|---|---|---|
| React frontend | **Vercel** | Yes, generous |
| Spring Boot API | **Render** (Docker) | Yes — sleeps after ~15 min idle |
| MySQL 8 | **Aiven** or **Railway** or **TiDB Cloud Serverless** | Yes, small |

Nothing here changes how the project runs locally. With no environment
variables set, everything falls back to the localhost defaults it uses today.

---

## Before you start

The code is already deployment-ready. These four things were made configurable:

| What | Environment variable | Default (local) |
|---|---|---|
| Where the frontend finds the API | `VITE_API_BASE_URL` | empty → relative `/api`, proxied by Vite |
| Which origins may call the API | `CORS_ALLOWED_ORIGINS` | localhost:5173 / :4173 always allowed |
| Database location | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DB`, `MYSQL_SSL` | localhost:3306/green_haven |
| Server port | `PORT` | 8080 |

---

## 1 · Database first

Everything else needs its connection details, so start here.

1. Create a **MySQL 8** instance on your chosen provider.
2. Note the host, port, database name, user and password.
3. Load the schema and catalogue:

```bash
mysql -h <host> -P <port> -u <user> -p <database> < backend/db/schema.sql
mysql -h <host> -P <port> -u <user> -p <database> < backend/db/data.sql

# then every migration, in numerical order
for f in backend/db/migration-*.sql; do
  mysql -h <host> -P <port> -u <user> -p <database> < "$f"
done
```

> **Check it worked:** `SELECT COUNT(*) FROM plant;` should return **154**.

Managed MySQL almost always requires TLS, so set `MYSQL_SSL=true` on Render.

---

## 2 · Backend on Render

1. Render → **New → Web Service** → connect the GitHub repository.
2. Set **Root Directory** to `backend`, **Runtime** to **Docker**. The
   `Dockerfile` is already there; Render will find it.
3. Add these environment variables:

| Variable | Value |
|---|---|
| `MYSQL_HOST` | your database host |
| `MYSQL_PORT` | usually `3306` |
| `MYSQL_DB` | your database name |
| `MYSQL_USER` | database user |
| `MYSQL_PASSWORD` | database password |
| `MYSQL_SSL` | `true` |
| `GREENHAVEN_JWT_SECRET` | a **new** long random string — not the local one |
| `ADMIN_EMAIL` | the staff login |
| `ADMIN_PASSWORD` | a strong password, 12+ characters |
| `ADMIN_NAME` | e.g. `Green Haven Admin` |
| `RAZORPAY_MODE` | `simulated` until live keys are approved |
| `CORS_ALLOWED_ORIGINS` | your Vercel URL — fill in after step 3 |

Generate the JWT secret with:

```bash
openssl rand -base64 48
```

4. Deploy. The first build takes 5–10 minutes because Maven downloads its
   dependencies; later builds are cached and much faster.
5. Confirm it is alive: `https://<your-api>.onrender.com/api/plants` should
   return JSON with `"totalElements": 154`.

---

## 3 · Frontend on Vercel

1. Vercel → **Add New → Project** → import the same repository.
2. Set **Root Directory** to `frontend`. `vercel.json` supplies the rest.
3. Add one environment variable:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-api>.onrender.com` — **no trailing slash** |

4. Deploy, then copy the Vercel URL.
5. **Go back to Render** and set `CORS_ALLOWED_ORIGINS` to that URL, then
   redeploy the backend.

> This ordering is unavoidable: each side needs the other's address, so one of
> them has to be updated second.

---

## 4 · Check it end to end

| Check | Expected |
|---|---|
| Open the Vercel URL | Home page with 154 products |
| Browser console | No CORS errors |
| Register an account | Succeeds |
| Add to cart, checkout | Simulated payment completes |
| `/admin/login` | Staff sign-in works |

---

## Things that will bite you

### The backend sleeps
Render's free tier stops the service after ~15 minutes of no traffic. The next
request wakes it, which takes **around 50 seconds**. The first person to open
the site after a quiet period sees a long loading pause.

*If you are demonstrating this*, open the site a minute beforehand so it is
already awake. A paid Render instance (or an uptime pinger) removes this.

### Uploaded images do not survive a redeploy
Render's free filesystem is ephemeral. The 154 catalogue images are bundled into
the frontend build and are unaffected — but **photographs uploaded through the
admin panel, and customer review photos, are lost on every redeploy**.

Fixes, in order of effort:
1. Accept it for a demo — the seeded catalogue looks complete either way.
2. Move uploads to object storage (Cloudinary has a free tier). `UploadService`
   is the only class that writes files, so this is a contained change.
3. Attach a Render persistent disk — paid plans only.

### Free MySQL tiers are small
A few hundred MB. This schema with the full catalogue is under 20 MB, so there
is plenty of room, but do not load years of order history into it.

---

## Going live with Razorpay

While `RAZORPAY_MODE=simulated`, checkout works end to end without a gateway
account — the server signs a stand-in response and then verifies it through the
identical code path.

To take real money:

1. Complete Razorpay's account approval.
2. On Render set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and remove
   `RAZORPAY_MODE` (it defaults to `live`).
3. In the Razorpay dashboard add a webhook pointing at
   `https://<your-api>.onrender.com/api/webhooks/razorpay`, and set
   `RAZORPAY_WEBHOOK_SECRET` to the signing secret it gives you.

> The webhook matters more in production than locally: it is what settles an
> order when the customer's browser closes mid-payment.

---

## Never commit

`backend/.env` · `backend/tools/test-env.sh` · `backend/db/backups/*.sql`

All three are gitignored. Secrets belong in the hosting provider's environment
variable settings, nowhere else.
