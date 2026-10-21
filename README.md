# QuizApp

Full-stack quiz platform.

```
app/
├── server.js, db.js, auth.js, shuffle.js, validateQuiz.js   # backend (Express + MongoDB)
├── seed/quiz.json       # ML111 mock exam — seeded into MongoDB on first run
├── .env                 # backend secrets (not committed)
├── frontend/            # React (JSX) + Vite — user app
└── admin/               # React (JSX) + Vite — admin app
```

---

## Deploy (Option B — backend on Render/Railway, frontends on Vercel)

### 1. Backend → Render (or Railway / any Node host)

- Push this repo to GitHub, create a **Web Service** from it.
- **Build command:** `npm install`
- **Start command:** `node server.js`
- **Environment variables:**
  - `MONGODB_URL` — your Atlas connection string
  - `ADMIN_PASSWORD` — admin panel password
  - `JWT_SECRET` — long random string
  - `FRONTEND_URL` — your Vercel user-app URL, e.g. `https://quizapp.vercel.app`
  - `ADMIN_URL` — your Vercel admin URL, e.g. `https://quizapp-admin.vercel.app`
  - (`PORT` is set by the host automatically)
- Note the backend URL, e.g. `https://quizapp-api.onrender.com`.

> Atlas: Network Access must allow the host's IPs (`0.0.0.0/0` is simplest).

### 2. User app → Vercel (project 1)

- Import the same repo, set **Root Directory** to `frontend`.
- Framework preset: **Vite** (Vercel auto-detects; `vercel.json` handles SPA routing).
- Environment variable: `VITE_API_URL` = `https://quizapp-api.onrender.com` (your backend URL, no trailing slash).
- Deploy.

### 3. Admin app → Vercel (project 2)

- Same repo again, **Root Directory** = `admin`.
- Same env var: `VITE_API_URL` = your backend URL.
- Deploy.

Both React apps inline `VITE_API_URL` at build time, so changing it later = update the env var in Vercel and **redeploy** (trigger a new build).

---

## Run locally (all-in-one, one process)

```bash
npm install
cp .env.example .env    # fill in MONGODB_URL etc.
node server.js          # http://localhost:4000  — user app /home, admin /admin/, api /api
```

## Run locally in dev mode (hot reload, 3 terminals)

```bash
node server.js                              # API on :4000
cd frontend && npm install && npm run dev   # user app on :5173 (proxies /api)
cd admin && npm install && npm run dev      # admin on :5174 (proxies /api)
```

In dev mode leave `VITE_API_URL` empty — the vite proxy forwards `/api` to `:4000`.

## Docker (self-host everything in one container)

```bash
docker build -t quizapp .
docker run -p 4000:4000 --env-file .env quizapp
```

## How it works

- **Users**: type a name (no passwords). Same name = same user ID, so history sticks.
- **Topics**: admin pastes quiz JSON (mcq / truefalse / matching) to create topics; users pick one.
- **Shuffling**: every attempt re-shuffles question order + MCQ options server-side.
- **Calculator**: floating scientific calculator during quizzes (custom parser, no eval).
- **Admin**: users table → per-user drill-down with per-topic stats and per-question breakdowns.
