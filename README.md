# SPM Pathway Data Collector

A self-hosted web app for collecting a research dataset on **secondary
school leavers' post-SPM study pathways**, built to work around the
government-classification restriction on official SPM student data. It
lets you crowdsource an anonymised, PDPA-compliant equivalent of the
public dataset your proposal currently relies on (De La Hoz, 2020), using
variables aligned to Table 3.1 of your proposal — see `DATA_DICTIONARY.md`.

It has three parts:

1. **Public survey** (`/`) — a bilingual (Bahasa Melayu / English),
   mobile-first, multi-step form respondents fill in on their phone.
2. **Backend API** (Express + SQLite via [Turso](https://turso.tech), a free
   hosted SQLite service) — validates, stores, and rate-limits submissions.
3. **Researcher dashboard** (`/admin/login.html`) — login-protected view
   with response stats, charts, a searchable table, and a one-click CSV
   export whose columns already match your variable naming (Table 3.1).

## Why this design

Your proposal's Scope and Limitations section names the exact gap this app
fills: public datasets don't capture "motivation, parental expectations,
counselling quality, or local labour-market conditions." This app collects
those directly (see the "Decision Factors" step), on top of the standard
demographic/socioeconomic/academic variables — so the dataset it produces
is not just a substitute for restricted government data, it's richer than
what that data would have given you.

It also supports two respondent types so you can build something closer
to a genuine longitudinal panel instead of one static snapshot:

- **SPM leavers** — retrospective: they already know their pathway.
- **Current Form 5 students** — prospective: they answer background and
  academic-trajectory questions now, and can return later (using the
  anonymous follow-up code shown after submission) to report their actual
  pathway once SPM results are out.

## Quick start (local)

```bash
npm install
cp .env.example .env      # then edit ADMIN_PASSWORD, SESSION_SECRET, IP_SALT
npm start
```

- Survey: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin/login.html
  (default login is `admin` / whatever you set as `ADMIN_PASSWORD` in
  `.env`; change it immediately from the dashboard's Account panel)

With `TURSO_DATABASE_URL` left blank in `.env`, the app automatically falls
back to a local SQLite file at `data/spm_pathway.db` — perfect for
developing and testing on your own machine, but **do not deploy with it
left blank**: on a free host with an ephemeral filesystem that file is
wiped on every redeploy/restart, and you'd lose responses. The deployment
guide below has you set `TURSO_DATABASE_URL` for production, which switches
the app to writing straight to your free, persistent Turso database instead.

## Deploying to Render + Turso (free, persistent, ~20 minutes)

This is the combination recommended for this app: Render hosts the running
app for free (it's fine that it sleeps after 15 minutes of inactivity — the
worst case is a respondent waits ~30-60 seconds for the first page load
after a quiet spell), and Turso holds your data in a separate, genuinely
persistent free database, so nothing is lost when Render's container
restarts, redeploys, or sleeps. Neither step requires a credit card.

### 1. Create your Turso database

1. Go to [turso.tech](https://turso.tech) and sign up (GitHub login is
   the quickest option).
2. In the dashboard, create a new database — any name works, e.g.
   `spm-pathway`. Pick the region closest to Malaysia (Singapore, if
   offered) for lower latency.
3. Once created, find two values you'll need shortly:
   - **Database URL** — looks like `libsql://spm-pathway-yourname.turso.io`
   - **Auth token** — generate one from the database's "Create Token"
     button (choose full-access / read-write, no expiry, unless you want
     to rotate it later)
4. Keep both values somewhere safe for a moment — you'll paste them into
   Render's environment variables next.

### 2. Put the code on GitHub

Render deploys from a Git repository, so the project needs to live on
GitHub first:

1. Unzip this project, then from inside the folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Create a new **empty** repository on [github.com/new](https://github.com/new)
   (public or private both work — Render can access either once connected).
3. Push:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
   (`.env` and `data/` are already excluded via `.gitignore`, so no
   secrets or local test data get pushed.)

### 3. Create the Render web service

1. Go to [render.com](https://render.com) and sign up (GitHub login again
   is easiest — it also makes connecting the repo a one-click step).
2. **New +** → **Web Service** → connect the GitHub repo you just pushed.
3. Configure:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Under **Environment Variables**, add each of these (values from
   `.env.example`, plus the two Turso values from step 1):
   | Key | Value |
   |---|---|
   | `TURSO_DATABASE_URL` | the `libsql://...` URL from Turso |
   | `TURSO_AUTH_TOKEN` | the token from Turso |
   | `SESSION_SECRET` | any long random string (e.g. generate one with `openssl rand -hex 32`) |
   | `IP_SALT` | another long random string, different from the above |
   | `ADMIN_USERNAME` | your choice, e.g. `admin` |
   | `ADMIN_PASSWORD` | a strong password — this logs into your researcher dashboard |
5. Click **Create Web Service**. Render builds and deploys — first deploy
   takes a few minutes; watch the logs for `SPM Pathway Data Collector
   running at...` to confirm it started, and check for the `[db] Using
   Turso (remote, persistent).` line to confirm it picked up your database
   (if it instead logs the local-file fallback line, double check the two
   `TURSO_*` environment variables are set correctly).

### 4. Verify and lock it down

1. Visit `https://<your-app>.onrender.com` — the survey should load.
2. Submit one test response, then log into
   `https://<your-app>.onrender.com/admin/login.html` with the
   `ADMIN_USERNAME`/`ADMIN_PASSWORD` you set, and confirm it shows up in
   the dashboard and in **Export CSV**.
3. Delete that test response from the dashboard before real data collection
   starts, so it doesn't end up in your dataset.
4. Render gives you HTTPS automatically on the `onrender.com` domain, so
   respondent data is encrypted in transit by default — nothing extra to
   configure there.

From here on, every response submitted through the live URL is written
directly to Turso and will still be there the next time you check, no
matter how many times Render restarts the free instance in between.

## Distributing the survey link

Realistic channels given the government-data restriction:

- School counsellors / Guru Bimbingan dan Kaunseling (with your
  supervisor's / school's permission) sharing the link with Form 5
  students and recent leavers.
- Alumni WhatsApp/Telegram groups, SPM-batch Facebook groups.
- A QR code poster at TVET colleges, matriculation colleges, and
  polytechnics during enrolment week (captures leavers who chose that
  pathway).
- Short URL + QR code generated once the app is deployed (e.g. via
  bit.ly) so it's easy to share verbally or in print.

## Ethics, consent, and PDPA 2010 compliance

- **No direct identifiers are collected.** No name, IC number, or student
  ID. Each submission only gets a random, non-reversible follow-up code
  (e.g. `SPM-7F3K-9QRT`) — useful for a respondent to link a follow-up
  submission to their earlier one, but not linkable back to their identity
  by you.
- **IP addresses are never stored in raw form** — only a salted SHA-256
  hash, used solely to rate-limit repeat submissions from the same
  network. Change `IP_SALT` in `.env` before going live.
- **Explicit consent** is the first screen; the form cannot proceed without
  the consent checkbox being ticked.
- **Minors**: many respondents will be 17. The consent screen asks
  under-18 respondents to get parent/guardian permission first — this is a
  practical safeguard, not a technical enforcement (there's no reliable way
  to verify age remotely), so mention it explicitly wherever you post the
  link, and consider routing school distribution through
  counsellors/teachers who can supervise it.
- **You should still get formal ethics clearance** from UMK's research
  ethics committee before collecting real data, exactly as you would for
  any primary-data survey — this app doesn't replace that approval, it's
  the instrument you'd submit as part of the application.
- The optional contact field (for following up with Form 5 respondents
  after SPM results) is stored in a separate column and is **excluded from
  the CSV export** used for modelling — it never touches your analysis
  dataset.

## Data quality safeguards already built in

- A hidden honeypot field silently drops likely-bot submissions.
- Rate limiting: max 20 submissions/hour per IP at the HTTP layer, plus a
  5-submissions/24h cap per IP hash at the application layer.
- Server-side validation mirrors the client-side form — a submission with
  an invalid or out-of-range value is rejected either way.
- The admin dashboard lets you **flag** (exclude without deleting — useful
  if you want to audit later) or **delete** suspected spam/duplicate
  entries before export.

## Using the exported CSV in your pipeline

`Admin Dashboard → Export CSV` gives you a file with columns named to
match your proposal's variable table (`GENDER`, `STRATUM`, `SISBEN`,
`EDU_FATHER`, `ACADEMIC_PROGRAM`, etc. — see `DATA_DICTIONARY.md` for the
full mapping). It should need only minor adjustment (e.g. renaming a
handful of columns, or splitting `ACADEMIC_PROGRAM` back into
`pathway_status` + `institution_type` if you prefer the richer breakdown)
before it slots into the same preprocessing pipeline (Figure 3.3) you
already designed for the public dataset:

1. Missing-value handling — same median/mode imputation strategy applies.
2. Categorical encoding — one-hot for nominal fields, ordinal encoding for
   `STRATUM`, `household_income_band`, education levels, and grade fields.
3. Temporal sequence construction — the four checkpoints collected
   (`PT3_SC` → `F4_BAND` → `F5_TRIAL_BAND` → SPM subject grades) map onto
   the same temporal-branch input your hybrid TCN/LSTM architecture
   expects; note they're coarser (self-reported bands, not raw marks) than
   the original dataset's numeric subject scores, so treat them as ordinal
   rather than continuous features.
4. Protected attributes for your Objective 2 fairness framework are
   flagged in `DATA_DICTIONARY.md` (gender, income classification,
   government-aid status, residence area, school type).

Because this is self-reported, voluntarily-sampled data (not a census of
official records), be explicit in your methodology chapter about
self-selection bias — respondents reachable through your distribution
channels (schools that cooperate, social media groups) may not represent
the full population of SPM leavers equally across states/income groups.
Report the demographic breakdown of who actually responded (the dashboard
charts give you this at a glance) alongside your model results.

## Project structure

```
spm-pathway-collector/
  server.js           Express app entrypoint
  db.js                Turso/SQLite schema + connection (auto-creates admin user)
  fields.js             Field schema (server) — single source of truth
  routes/survey.js      Public submission endpoint + validation
  routes/admin.js       Auth, response management, stats, CSV export
  public/index.html      Respondent-facing survey
  public/js/form.js         Survey wizard logic
  public/js/fields-client.js  Browser copy of the field schema
  public/js/i18n.js          Bahasa Melayu / English labels
  public/admin/          Researcher dashboard (login + charts + table)
  data/spm_pathway.db    Local SQLite fallback file (dev only — see Quick Start)
  DATA_DICTIONARY.md     Field-to-research-variable mapping
```

## If you change the questions

Edit `fields.js` (server) **and** `public/js/fields-client.js` (browser) —
keep them in sync. Add matching labels to `public/js/i18n.js` and a row to
`DATA_DICTIONARY.md`. The SQLite table is generated from `fields.js` on
first run only; if you add fields after the database already exists,
delete `data/spm_pathway.db` (only if it has no real responses yet!) or add
the column manually with `ALTER TABLE`.
