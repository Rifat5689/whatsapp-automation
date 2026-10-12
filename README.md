# RIFAT.AI

## Local development

1. Copy `backend/.env.example` to `backend/.env` and supply local-only values. Keep `NODE_ENV=development`, `FRONTEND_ORIGIN=http://localhost:5173`, `AI_PROVIDER=mock`, `MESSAGING_PROVIDER=mock`, and `STORAGE_PROVIDER=local` until their production adapters are intentionally tested.
2. Optionally copy `frontend/.env.example` to `frontend/.env`; its `/api/v1` value uses the Vite proxy.
3. Run `npm install`, then `npm run dev` from the repository root.
4. Open `http://localhost:5173`. Run `npm run check` before pushing a feature branch.

Never put backend credentials in `frontend/.env` or any `VITE_*` variable. Merging a tested feature branch into `main` triggers the relevant Azure or Firebase production workflow.
