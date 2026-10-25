# Savora local setup

React calls the Java API. Java connects directly to Supabase PostgreSQL. No Supabase API key is required. Passwords use BCrypt; login uses HTTP-only session cookies. Do not put database credentials in the frontend.

## 1. Update the existing database

You already ran the initial SQL. Do not run it again. In Supabase SQL Editor, run `docs/database/002_verification.sql` once. This adds private applications and document storage. Java does not automatically change your schema.

## 2. Find connection settings

Open your Supabase project, click **Connect**, and select **Session pooler** (port 5432) for typical Windows/IPv4 development. Copy the host, database, and username exactly. Use the database password, not your Supabase account password. Reset it in database settings if needed.

Official guide: https://supabase.com/docs/guides/database/connecting-to-postgres

Copy `backend/.env.example` to `backend/.env` and fill in:

```properties
DB_URL=jdbc:postgresql://YOUR_POOLER_HOST:5432/postgres?sslmode=require
DB_USERNAME=postgres.YOUR_PROJECT_REF
DB_PASSWORD=YOUR_DATABASE_PASSWORD
FRONTEND_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

Run Java from backend/ so it reads this file. Keep it out of Git. Java properties escaping applies: escape literal backslashes. Environment variables can be used instead.

This architecture needs **no API key**. Supabase SDK API keys are under project Settings > API Keys, if you use those services later. Never put a service-role/secret key in a browser.

## 3. Start both applications

Install Java 17 or newer, Maven, and Node.js. In one terminal:

```powershell
cd C:\UPDATE_FOLDER\FOODLOOP\backend
mvn spring-boot:run
```

Maven is also available on this computer at `C:\Program Files\NetBeans-22\netbeans\java\maven\bin\mvn.cmd` if it is not on PATH.

In another terminal:

```powershell
cd C:\UPDATE_FOLDER\FOODLOOP\frontend
npm install
npm run dev
```

Open http://localhost:5173. Use localhost consistently for both servers. Frontend defaults to http://localhost:8080/api; change VITE_API_BASE_URL in frontend/.env if needed, then restart Vite.

## 4. Create an administrator

Register your own account first. Promote only a trusted account in Supabase SQL Editor:

```sql
update public.users set role = 'ADMIN', verified = true
where email = 'replace-with-your-real-email';
```

Sign out/in after changing a role. There is no public admin registration or shared default password.

## 5. Test the full workflow

1. Register a donor with name, email and password. No food details are requested.
2. Sign in and submit the separate organization application: legal registration evidence and a valid ID (PDF/JPG/PNG, each up to 5 MB).
3. Admin downloads both documents and approves or rejects with notes. Rejected applicants may resubmit.
4. Donor refreshes the workspace, creates a donation, and enters food details and the pickup window.
5. Admin screens the listing and makes it available or rejects it.
6. Register and verify a recipient organization. Request available food.
7. Donor accepts one request. Other pending requests are rejected. The listed pickup start is used as the scheduled pickup time. Donor confirms completion after handoff.

The implementation supports DONOR, RECIPIENT, ADMIN and pickup only, matching your schema. Original demo code is retained in docs/Savora_original_demo.html for reference, not served as an alternative login.

## Privacy and deployment

Documents are private database bytes, not public URLs. RLS blocks public Supabase Data API access; only authenticated admins may download through Java. File signatures and sizes are checked. Add malware scanning and a retention/deletion process before collecting real applicants' documents publicly.

Sessions are in Java memory; restarting signs users out. Before a public launch add email verification, password recovery, login throttling, persistent sessions for multiple servers and monitoring. Deploy the frontend and API on one HTTPS site, set COOKIE_SECURE=true and FRONTEND_ORIGIN to the exact frontend origin. Current cookies support localhost or same-site deployment.

## Checks and troubleshooting

Run `npm run build` in frontend/ and `mvn test` in backend/. Backend tests use an isolated H2 database for account/security checks. They do not verify PostgreSQL-specific workflow queries; complete the checklist above against a test Supabase database after configuration.

Startup failure: check backend/.env, database password, active Supabase project, and Connect's exact session-pooler host/username. Missing tables: apply the verification migration after the original schema. 403 after a role change: sign out/in. Frontend connection errors: start Java and check API URL and FRONTEND_ORIGIN.
