# Postgraduate LMS (Frontend + Backend)

This project has:
- Frontend: React + Vite (`Software-Group-Project`)
- Backend: Node.js + Express + MongoDB (`Software-Group-Project/server`)

## Prerequisites

- Node.js 18+ (Node 22 is also fine)
- npm

## First-time setup after clone

From project root (`Software-Group-Project`):

```bash
npm install
cd server
npm install
```

## Run the app

Open 2 terminals.

Terminal 1 (backend):

```bash
cd server
npm run dev
```

Backend runs on: `http://localhost:5000`

Terminal 2 (frontend):

```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

## Notes

- Frontend API calls are currently hardcoded to `http://localhost:5000`, so backend must run on port `5000`.
- MongoDB connection is configured in `server/config/db.js`.
- Email sending requires SMTP environment variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).
- For local development without real email delivery, set `EMAIL_SIMULATION=true` in backend environment.

## Optional backend `.env`

Create `server/.env` only if needed:

```env
PORT=5000
EMAIL_SIMULATION=true

# If you want real email sending instead of simulation:
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your_username
# SMTP_PASS=your_password
# SMTP_FROM=no-reply@example.com
```

## Troubleshooting

- If backend shows `EADDRINUSE: address already in use :::5000`, another process is already using port 5000.
	- Stop the existing process, or
	- Run backend on another port (`PORT=5001`) and update frontend API URLs accordingly.
