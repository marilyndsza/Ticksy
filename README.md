# Ticksy

Ticksy is a React frontend backed by Supabase for auth/data, plus a small FastAPI service for health/API endpoints.

## Emergent cleanup

All Emergent-specific dependencies and runtime injections have been removed from this repo:

- `@emergentbase/visual-edits`
- `https://assets.emergent.sh/scripts/emergent-main.js`
- the "Made with Emergent" badge
- `emergentintegrations`

## Local setup

### Frontend

1. Copy [frontend/.env.example](/Users/mel/Desktop/Ticksy/frontend/.env.example) to `frontend/.env`.
2. Fill in your Supabase project values.
3. Install dependencies:

```bash
cd frontend
npm install
```

4. Start the frontend:

```bash
npm start
```

The app will run at `http://localhost:3000`.

### Backend

1. Copy [backend/.env.example](/Users/mel/Desktop/Ticksy/backend/.env.example) to `backend/.env`.
2. Create and activate a virtual environment if you want an isolated Python setup.
3. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

4. Start the API:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The API health check will be available at `http://localhost:8000/api/health`.

## Notes

- The frontend still requires a Supabase project because auth and app data are stored there.
- The backend is currently minimal and does not replace Supabase for auth or storage.
- For real deployments, run [supabase/migrations/001_align_students_schema.sql](/Users/mel/Desktop/Ticksy/supabase/migrations/001_align_students_schema.sql) in Supabase first so the `students` table includes `mode`, `selected_days`, and `medical_history` in the format the current frontend expects.

## Vercel + Supabase

To make deployment read and store the same data as local development:

1. Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in Vercel project environment variables.
2. Make sure your Supabase `students` table has:
   - `mode text`
   - `selected_days integer[]`
   - `medical_history text`
3. Run [supabase/migrations/001_align_students_schema.sql](/Users/mel/Desktop/Ticksy/supabase/migrations/001_align_students_schema.sql) in the Supabase SQL editor before deploying.
