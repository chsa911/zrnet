# Staging-ready source bundle

This bundle was created from the uploaded `frontend/` and `backend/` folders.

Included changes:
- `backend/app.js` now serves `frontend/dist` when present, with fallback to `backend/public`
- `backend/server.js` safely checks `DATABASE_URL` before parsing it
- `backend/middleware/adminAuth.js` uses cookie `path: "/"`
- `frontend/index.html` includes PWA + Apple install metadata
- `frontend/public/manifest.json` is updated for PagesInLine
- placeholder app icons were added under `frontend/public/icons/`

Intentionally excluded:
- `.env` files
- `node_modules`
- macOS metadata (`.DS_Store`, `__MACOSX`)
- `frontend/dist` build output

Before deployment:
1. build the frontend: `npm run build` inside `frontend/`
2. run the backend with `NODE_ENV=production`
3. set `DATABASE_URL`, `ADMIN_PASSWORD`, and any other runtime env vars in your host
4. point `staging.yourdomain.com` to your deployed backend

Note: the root workspace files were not part of the upload, so this zip contains the uploaded `frontend/` and `backend/` app folders only.
