# QuizApp

Full-stack quiz platform. Three parts:

```
app/
├── server.js, db.js, auth.js, shuffle.js, validateQuiz.js   # backend (Express + MongoDB)
├── seed/quiz.json       # ML111 mock exam — seeded into MongoDB on first run
├── .env                 # secrets (MONGODB_URL, ADMIN_PASSWORD, JWT_SECRET, PORT)
├── frontend/            # React (JSX) + Vite — the user app  (dev :5173, prod served at /)
└── admin/               # React (JSX) + Vite — the admin app (dev :5174, prod served at /admin/)
```

## Run in production (one process serves everything)

```bash
npm install          # backend deps
node server.js       # http://localhost:4000  (user app at /, admin at /admin/, API at /api)
```

`frontend/dist` and `admin/dist` are already built. If you change React code, rebuild:

```bash
cd frontend && npm install && npm run build
cd ../admin && npm install && npm run build
```

## Run in development (hot reload)

```bash
node server.js                       # API on :4000
cd frontend && npm install && npm run dev   # user app on :5173 (proxies /api)
cd admin && npm install && npm run dev      # admin app on :5174 (proxies /api)
```

## Environment variables (.env)

| Var | Purpose |
|---|---|
| `MONGODB_URL` | MongoDB connection string (database name is taken from the path, e.g. `/shiftflow`) |
| `PORT` | default 4000 |
| `ADMIN_PASSWORD` | admin panel password |
| `JWT_SECRET` | token signing secret — change in production |

## How it works

- **Users**: type a name to enter (no passwords). Same name = same user (case-insensitive), so performance history stays attached to one ID.
- **Topics**: admin pastes quiz JSON (MCQ / true-false / matching-blocks) to create or edit topics; users pick a topic to start.
- **Shuffling**: every attempt re-shuffles question order server-side and re-shuffles MCQ options — retakes always look different.
- **Calculator**: floating scientific calculator during quizzes (powers, roots, log/ln, trig, π, e, memory) — no eval, custom parser.
- **Admin insights**: users table (attempts, avg/best/latest score) → drill into a user for per-topic stats and per-question breakdowns of every attempt.
