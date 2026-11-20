# Docker + GitHub deployment — where everything goes

## 1. Correction from my earlier Railway/Render guide
I'd earlier told you to run `uvicorn app.main:app`. That's **wrong** for this
codebase — every internal import (e.g. `from backend.app.ml.predictor import
StargazingPredictor`) is rooted at `backend`, so the correct command is:

```
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

run from the folder that CONTAINS `backend/`, not from inside it. All the
files below already use the corrected command.

## 2. File placement

```
repo-root/
├── .gitignore                      ← from this batch (rename, drop prefix)
├── docker-compose.yml              ← from this batch
├── backend/
│   ├── Dockerfile                  ← from backend.Dockerfile
│   ├── requirements.txt            ← from backend.requirements.txt
│   ├── .dockerignore               ← from backend.dockerignore
│   └── app/...                     ← your existing backend code, unchanged
└── frontend/
    ├── Dockerfile                  ← from frontend.Dockerfile
    ├── .dockerignore               ← from frontend.dockerignore
    └── src/... package.json ...    ← your existing frontend code, unchanged
```

(I prefixed the filenames with `backend.`/`frontend.` just so they wouldn't
collide while sitting in one folder here — strip that prefix when you copy
them into place, e.g. `backend.Dockerfile` → `backend/Dockerfile`.)

## 3. One thing to check in your Next.js project
Open `frontend/next.config.ts` and make sure it has:

```ts
const nextConfig = {
  output: "standalone",
  // ...whatever else is already there
};
```

The frontend Dockerfile relies on Next's "standalone" build output to keep
the final image small. If that line isn't there yet, add it — won't change
how the app behaves anywhere else.

## 4. Before you build — edit the one placeholder
In `docker-compose.yml`, swap `YOUR_SERVER_IP_OR_DOMAIN` for your server's
real address (the IP you SSH into, or a domain if you've got one pointed at
it). This has to be something a visitor's **browser** can reach — the
frontend bakes this URL into its JS bundle at build time, so it can't be an
internal Docker hostname like `backend`.

## 5. Build & run on your server

```bash
git clone <your-repo-url>
cd <your-repo>
docker compose up -d --build
```

- Backend → `http://YOUR_SERVER_IP:8000` (docs at `/docs`, health at `/health`)
- Frontend → `http://YOUR_SERVER_IP:3000`

Changed the code later? `git pull && docker compose up -d --build` picks it up.

## 6. If you change the server's address later
`NEXT_PUBLIC_API_URL` is baked in at build time, so moving to a new
IP/domain means updating it in `docker-compose.yml` and rebuilding the
frontend (`docker compose build frontend && docker compose up -d`) — a
plain restart won't pick up the new value.

## 7. Model file sanity check
The `.gitignore` ignores `*.pkl`/`*.joblib` broadly but explicitly
un-ignores `app/ml/stargazing_xgb_model.json` (adjust that path/filename if
your trained-model artifact is named or located differently) — that file
has to ship with the repo, or the container will fail to pre-warm the
model on startup. Double check with `git status` after your first commit
that it's actually tracked and not silently excluded.
