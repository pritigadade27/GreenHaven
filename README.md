# Green Haven

> Bringing Nature to Every Home — a premium online garden centre.

| | |
|---|---|
| **Frontend** | React 18 + Vite, plain CSS, React Router DOM |
| **Backend** | Java 17, Spring Boot 3.3, REST API |
| **Database** | MySQL 8 |
| **IDE** | VS Code (frontend) · Eclipse (backend) |

## Setting up on a new machine

**You need:** Java 17 (JDK) · Node.js 18+ · MySQL 8 · Git.
Maven is *not* required — the repository carries the Maven wrapper (`mvnw`).

**1. Clone and set who you commit as**

```bash
git clone https://github.com/pritigadade27/GreenHaven.git
cd GreenHaven
git config user.name  "pritigadade27"
git config user.email "pritigadade27@gmail.com"
```

The identity is set per-repository, so it does not follow a clone. Without this,
commits from the new machine are authored by whatever global identity is set there.

**2. Create the database**

```sql
CREATE DATABASE green_haven CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'priti'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON green_haven.* TO 'priti'@'localhost';
```

Then load the schema, the catalogue and every migration in order:

```bash
mysql -u priti -p green_haven < backend/db/schema.sql
mysql -u priti -p green_haven < backend/db/data.sql
for f in backend/db/migration-*.sql; do mysql -u priti -p green_haven < "$f"; done
```

`SELECT COUNT(*) FROM plant;` should return **154**.

**3. Create the secrets files** — both are gitignored, so they never arrive with a clone:

```bash
cp backend/.env.example              backend/.env
cp backend/tools/test-env.example.sh backend/tools/test-env.sh
```

Fill in `backend/.env`:

| Key | What to put |
|---|---|
| `MYSQL_PASSWORD` | the password from step 2 |
| `GREENHAVEN_JWT_SECRET` | a long random string — `openssl rand -base64 48` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | the staff login, created on first startup |
| `RAZORPAY_MODE` | `simulated` (checkout works with no gateway account) |

**4. Run it**

```bash
cd backend && ./mvnw spring-boot:run     # http://localhost:8080/api
cd frontend && npm install && npm run dev # http://localhost:5173
```

In Eclipse: *File → Import → Existing Maven Projects* → pick `backend/`, then run
`GreenHavenApplication.java`.

**5. Check it worked**

```bash
bash backend/tools/smoke-test.sh          # 32 assertions
```

Vite proxies `/api` to `:8080`, so the React code calls `/api/...` with no CORS
setup and no hard-coded host.

For deploying to the internet, see **DEPLOYMENT.md**.

## Structure

```
green haven/
├── frontend/
│   ├── public/               favicon, touch icon
│   └── src/
│       ├── assets/           logo, plant photography
│       ├── components/
│       │   ├── common/       Button, ScrollToTop, Loader — used everywhere
│       │   ├── layout/       Navbar, Footer
│       │   ├── home/         Hero, Categories, FeaturedPlants, Testimonials…
│       │   ├── product/      ProductCard, ProductGrid, Filters
│       │   ├── cart/         CartItem, CartSummary
│       │   └── auth/         LoginForm, RegisterForm
│       ├── pages/            one folder per route
│       ├── context/          CartContext, WishlistContext, AuthContext
│       ├── services/         API layer — all fetch calls live here
│       ├── hooks/            useScrollReveal, useDebounce…
│       ├── data/             mock catalogue until the API is wired
│       ├── styles/           variables.css · global.css · animations.css
│       ├── utils/            formatters, validators
│       ├── App.jsx           routes
│       └── main.jsx          entry point
└── backend/
    ├── pom.xml
    └── src/main/
        ├── java/com/greenhaven/
        │   ├── config/       CORS, security wiring
        │   ├── controller/   REST endpoints
        │   ├── service/      business logic (+ impl/)
        │   ├── repository/   Spring Data JPA
        │   ├── model/        JPA entities
        │   ├── dto/          request/response shapes
        │   ├── security/     JWT filter and helpers
        │   └── exception/    global handler
        └── resources/        application.properties
```

## Design system

All colour, type, spacing, radius, shadow and motion tokens are defined once in
`frontend/src/styles/variables.css`. **Components never hard-code a hex or a
duration** — they reference the tokens, so the whole site can be retuned from a
single file.

| Token | Value | Role |
|---|---|---|
| `--color-primary` | `#6D0008` | headings, navbar, primary buttons |
| `--color-secondary` | `#BF0513` | hover states, sale tags |
| `--color-accent` | `#F45C7A` | highlights, badges, active states |
| `--color-card` | `#F29BA8` | tinted card surfaces, category tiles |
| `--color-bg` | `#FFF8F8` | page background |
| `--color-green` | `#827C48` | foliage, eco labels |
| `--color-text` | `#333333` | body copy |

Headings are **Playfair Display**, body is **Poppins**, both loaded in
`index.html`. The logo is the Green Haven botanical emblem (concept 03) in
`src/assets/logo/`.

## Build order

1. Folder structure, tooling, design tokens 
2. Navbar (sticky, glass on scroll)
3. Hero
4. Categories
5. Featured Plants
6. Best Sellers
7. Why Choose Green Haven
8. Plant Care Tips
9. Testimonials + Newsletter + Footer
10. Shop page · 11. Plant Details · 12. Wishlist · 13. Cart
14. Login/Register · 15. About · 16. Contact
17. Spring Boot API + MySQL, replacing the mock data
