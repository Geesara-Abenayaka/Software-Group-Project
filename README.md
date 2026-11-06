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

# Signs admin login sessions (any long random string). Without it, admins sign in again after every restart.
# ADMIN_TOKEN_SECRET=
```

`server/.env.example` lists every setting with an explanation.

## Admin sessions

Admin pages send a signed session token (from the login) with every admin API request, and the server
refuses admin routes without a valid one (`401`, and the page goes back to the login). A session lasts
12 hours and ends when the password changes. Public routes (programs, the application form, payments,
the chatbot, login and password reset) need no session.

## Tests

```bash
cd server
npm test
```

Runs the server's unit tests (reports, receipt matching, Stripe check, admin sessions) with Node's built-in
test runner. They need no database.

## Troubleshooting

- If backend shows `EADDRINUSE: address already in use :::5000`, another process is already using port 5000.
	- Stop the existing process, or
	- Run backend on another port (`PORT=5001`) and update frontend API URLs accordingly.

## Jenkins deployment

The root `Jenkinsfile` builds the frontend and backend Docker images, pushes both
the Git commit tag and `latest` to Docker Hub, then replaces the running
containers. Docker commands run on the Jenkins agent, so that agent must be the
EC2 host where the application should run (or otherwise have access to that
host's Docker daemon). It needs Git, Docker, and a POSIX shell.

1. In Jenkins, create a **Username with password** credential with ID
   `dockerhub-credentials` for Docker Hub.
2. Create a **Secret text** credential with ID `mongodb-uri` containing the
   MongoDB connection string. Do not put database credentials in the
   `Jenkinsfile` or commit them to Git.
3. Create a Pipeline job configured as **Pipeline script from SCM**, using this
   repository, the `main` branch, and `Jenkinsfile` as the script path.
4. Configure a GitHub repository webhook pointing to
   `https://<your-jenkins-host>/github-webhook/`, with `application/json` as the
   content type and push events enabled. Jenkins must be reachable by GitHub.
   The `githubPush()` trigger also requires the Jenkins GitHub plugin.
5. Ensure the EC2 security group allows inbound HTTP on port 80. The pipeline
   also publishes the backend on port 5000, as in the previous deployment
   setup.
6. Optional: so admins stay signed in across deployments, create a **Secret
   text** credential (for example `admin-token-secret`) with a long random
   string, add it to the `withCredentials` block of the deploy stage as
   `ADMIN_TOKEN_SECRET`, and pass `-e ADMIN_TOKEN_SECRET` to the backend's
   `docker run`. Without it the backend makes a new secret at every start and
   admins sign in again after each deployment. (The same goes for the Stripe
   keys, which the pipeline doesn't pass to the backend today.)

There are already two GitHub Actions workflows under `.github/workflows/` that
also run on pushes to `main`. Disable them in GitHub or remove their push
triggers if Jenkins should be the only deployment mechanism; otherwise both
systems may deploy at the same time.
