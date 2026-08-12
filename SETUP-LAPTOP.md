# Running Green Haven on another machine

Two ways. Pick one.

- **[The quick way](#the-quick-way)** — double-click one file, it does everything.
- **[The manual way](#the-manual-way)** — you run the database in MySQL Workbench yourself.

Both end in the same place: the site on `http://localhost:5173`, the API on `8080`, and the
database in your own MySQL where Workbench can see it.

---

## Install these first

Nothing below can install these for you — they need admin rights and a browser download.

| | Version | Where |
|---|---|---|
| **Java** | 17 or newer | https://adoptium.net/temurin/releases/?version=17 |
| **Node.js** | 18 or newer | https://nodejs.org/en/download |
| **MySQL** | 8.x | https://dev.mysql.com/downloads/installer/ |
| **Git** | any | https://git-scm.com/download/win |

In the MySQL installer choose **Server + Workbench**, and write down the root password it asks
you to set — you need it once, in the next step.

> Maven is **not** in the list. The project carries `mvnw.cmd`, which fetches Maven itself the
> first time it runs.

---

## Get the code

```bash
git clone https://github.com/pritigadade27/GreenHaven.git
cd GreenHaven
```

Put it wherever you like. A path with a space in it is fine — that case is handled.

---

## The quick way

Double-click **`SETUP.bat`** in the project folder.

It will:

1. Check Java, Node and MySQL are present, and name anything missing with a download link
2. Ask for your MySQL **root** password
3. Create the `green_haven` database and load all 154 products
4. Create the `priti` application account with a fresh random password
5. Write `backend\.env` with a newly generated JWT secret and admin password
6. `npm install` the frontend packages
7. Start the API and the site, and open your browser

It prints the admin sign-in near the end — **copy it**, it is generated per machine:

```
admin sign-in:  admin@greenhaven.com  /  Admin@123456
```

After that first run, use **`START.bat`** to launch the site. Setup does not need repeating.

Two extra PowerShell windows open — one for the API, one for the site. Closing them stops it.

---

## The manual way

Use this if you would rather see the database go in yourself.

### 1 · Load the database in Workbench

The whole database is a **single file**: [`database/green_haven_full.sql`](database/green_haven_full.sql).
It holds the tables, the catalogue and all sixteen migrations already stitched together in order,
so there is nothing to run one at a time.

1. Open **MySQL Workbench** and connect to your local server
2. **File → Open SQL Script…** → pick `database/green_haven_full.sql`
3. Click the **lightning bolt** (or `Ctrl+Shift+Enter`) to run the whole script
4. The last result grid should read **154**

```
products loaded (should be 154)
--------------------------------
154
```

The script creates the `green_haven` database itself — you do not need to make it first. Running
it again rebuilds from scratch, which is a clean slate but also wipes any test orders or accounts.

### 2 · Make the account the app signs in as

The application never connects as root. In a Workbench query tab:

```sql
CREATE USER IF NOT EXISTS 'priti'@'localhost' IDENTIFIED BY 'pick-a-password';
CREATE USER IF NOT EXISTS 'priti'@'127.0.0.1' IDENTIFIED BY 'pick-a-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON green_haven.* TO 'priti'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Both hostnames, because MySQL treats `localhost` and `127.0.0.1` as different accounts and the
Java driver may use either. No `DROP` or `ALTER` in the grant: the app never needs them at
runtime, so withholding them caps the damage of any compromise at data theft rather than
data destruction.

### 3 · Settings

Copy `backend\.env.example` to `backend\.env` and fill in four values:

```ini
MYSQL_USER=priti
MYSQL_PASSWORD=the-password-you-just-picked

# Any long random string. Changing it later signs everybody out.
GREENHAVEN_JWT_SECRET=paste-64-random-characters-here

RAZORPAY_MODE=simulated

# Created once, at first startup. Editing it later does NOT change the account.
ADMIN_EMAIL=admin@greenhaven.com
ADMIN_PASSWORD=choose-a-strong-one
ADMIN_NAME=Green Haven Admin
```

`backend\.env` is gitignored and must stay that way — it is the one file holding real secrets.

> `RAZORPAY_MODE=simulated` lets checkout run end to end with no gateway account. The server
> signs a stand-in response and then verifies it through the identical code path, so the payment
> logic you are testing is the real one.

### 4 · Run it

Two terminals, from the project folder:

```bash
# terminal 1 - the API
cd backend
mvnw.cmd spring-boot:run

# terminal 2 - the site
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The site talks to the API through Vite's dev proxy, so no
frontend configuration is needed locally.

---

## Checking it worked

| Check | Expect |
|---|---|
| http://localhost:5173 | home page, products visible |
| Shop page | **154 products · page 1 of 7** |
| http://localhost:8080/api/plants | JSON, `"totalElements": 154` |
| http://localhost:5173/admin/login | your `ADMIN_EMAIL` / `ADMIN_PASSWORD` signs in |

---

## When it goes wrong

**`Access denied for user 'priti'@'localhost'`**
`MYSQL_PASSWORD` in `backend\.env` does not match the password you gave that account. Re-run the
`ALTER USER 'priti'@'localhost' IDENTIFIED BY '...'` statement and make the two agree.

**`greenhaven.jwt.secret is not set`**
`backend\.env` is missing, or the API was started without it. `START.bat` loads that file into
the environment — starting Maven by hand does not, so set the variables in that shell first.

**`Schema-validation: missing column ...`**
The database is older than the code. Re-run `database/green_haven_full.sql`; it rebuilds
everything in the right order.

**`Communications link failure`**
MySQL is not running. On Windows: `services.msc` → **MySQL80** → Start.

**Port 8080 or 5173 already in use**
Something else has it. `netstat -ano | findstr :8080`, then stop that process.

**The shop page is empty but the API works**
The frontend was started before the API finished booting. Refresh the page.
