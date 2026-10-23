# Zero Health — Intentionally Vulnerable Training Lab

> ⚠️ **THIS APPLICATION IS DELIBERATELY INSECURE.**
> It exists to teach web and health-tech security in a hands-on way, in the same
> spirit as OWASP Juice Shop, DVWA, and WebGoat. **Do not deploy it on a public
> network, do not put real data in it, and do not expose it to the internet.**

Zero Health is a fictional telehealth platform. Every patient, doctor, record,
prescription, and lab result in it is **synthetic and fabricated**. There is no
real personal data anywhere in this project, and there is intentionally no path
to add any.

## What this is for

Security training is only effective when learners can see a vulnerability in a
realistic application, trigger it against fake data, understand its real-world
impact, and then fix it. Zero Health provides a believable health-tech context
so that learners meet the vulnerabilities that actually matter in that domain,
not just generic textbook examples.

Each vulnerability in this lab ships with a matching lesson in [`docs/lessons/`](docs/lessons/)
covering four things:

1. **What it is** — the flaw and why it exists.
2. **How to find it** — detection signals, test cases, code-review red flags.
3. **Impact** — what it means in a health-tech context (always on synthetic data).
4. **The fix** — the secure-by-default remediation, with code.

The learning objective is always *find it and fix it*, never *maximize damage*.

## Features (all running on synthetic data)

- **Portals by role**: patient, doctor, pharmacist, lab technician, admin.
- **Prescriptions**: doctors prescribe with frequency, duration, and
  instructions. Every order gets a collection code the patient shows at the
  pharmacy; pharmacists verify the code and mark the order collected. Patients
  can request refills of collected orders, which prescribers re-issue with a
  fresh collection code.
- **Appointments**: patients book from real availability (30-minute slots,
  booked times disappear) through a guided intake (visit type, new or
  existing concern, symptoms, current medication), for consultations with a
  doctor or lab tests with a lab technician. Reschedule or cancel from the
  appointment detail page. Clinicians review the intake, chart notes, record
  outcomes and follow-ups; patients leave feedback and star ratings that
  surface on clinician profiles.
- **Lab results**: doctors and lab technicians record results with an
  optional result image (png/jpg/gif/webp upload). Each result has a detail
  page with the image, value, clinical interpretation, collection date, and
  the staff member who performed it.
- **Messaging**: threaded conversations between patients and staff, with
  unread badges and live updates.
- **Zero Agent**: a chatbot available on every portal page that answers
  questions about your own records, books appointments straight from chat,
  and keeps persisted history. Runs against any OpenAI-compatible endpoint,
  with a deterministic offline mock as fallback.
- **Search**: role-scoped search for staff across patients, prescriptions,
  appointments, and lab results.
- **Reports**: doctors and admins generate printable medical reports.
- **Admin console**: user provisioning (create, role change, delete), system
  statistics, and the job applications inbox.
- **Public site**: marketing landing page, satirical job board, and blog.

## Safety guardrails (built in)

- **Binds to `127.0.0.1` only** by default. The server refuses to start on
  `0.0.0.0` unless you set `I_UNDERSTAND_THIS_IS_INSECURE=1`, and prints a loud
  warning if you do.
- **Fictional data only.** The seed script is the only way data gets in, and
  every record it creates is fabricated demo data on `example.test` accounts.
  No real PHI has ever touched this project, and there is intentionally no
  path to add any.
- **Persistent runtime banner** in the UI marking this as an insecure lab.
- **No telemetry.** The only outbound calls are the LLM endpoint you point
  Zero Agent at and the SMTP server you configure for email.

## Stack

- **Frontend:** Next.js (App Router), TypeScript.
- **API:** Node + Express, SQLite (file-based, disposable), TypeScript.
- **Auth:** session tokens (JWT), intentionally containing teachable weaknesses.

## Running it

```bash
# install api + web dependencies
npm run install:all

# seed the synthetic database (deterministic ids)
npm run seed

# start the API (localhost only, port 4000)
npm run api

# in another terminal, start the web app (localhost only, port 3000)
npm run web
```

Then open http://127.0.0.1:3000. Seeded accounts and the password are printed by
the seed step; all use `Password1!`.

With the API running, a functional smoke test is available:

```bash
npm run verify
```

## Ports

The API defaults to `127.0.0.1:4000` and the web app to `127.0.0.1:3000`. The
web app proxies `/api/*` to the backend, so if the API runs on a different
port, point the web app at it:

```bash
PORT=4010 npm run api                                            # API on 4010
API_ORIGIN=http://127.0.0.1:4010 npm run web                     # web proxies to 4010
```

Both overrides work in dev and production (`next start`) — no rebuild needed.

## Zero Agent: bring your own model

Zero Agent is backed by a real LLM. Point it at any OpenAI-compatible chat
completions endpoint before starting the API:

```bash
AGENT_LLM_BASE_URL=http://localhost:11434/v1   # Ollama, LM Studio, vLLM, OpenAI, Groq, ...
AGENT_LLM_MODEL=llama3.2
AGENT_LLM_API_KEY=optional-for-hosted-providers
npm run api
```

Without a configured endpoint the agent routes answer 503 (appointment
booking through chat still works, since it is a deterministic tool). If the
endpoint errors or times out, the agent answers 502.

## Email

Email is delivered through the [Resend](https://resend.com) API: password
resets, appointment confirmations, refill notifications, and lab-result
notifications.

```bash
MAIL_API_KEY=re_...                       # Resend API key
MAIL_FROM="Zero Health <no-reply@yourdomain>"   # must be a verified Resend sender/domain
WEB_BASE_URL=https://zh.academy.exploit-forge.com   # used for links inside emails
```

Without a key, every email is printed to the API console so the flows stay
demonstrable offline.

## Password reset

The "Forgot password?" flow emails a single-use reset link (token hashed at
rest, valid 15 minutes). The forgot-password endpoint returns the same
response whether or not the account exists, so it cannot be used to enumerate
users.

## Finding the flaws

The application carries **no labels, hints, or warning callouts** on its pages
or in its code. Learners are expected to explore the running app (UI, devtools,
API traffic) and hunt for the weaknesses themselves. The lesson documents in
[`docs/lessons/`](docs/lessons/) are instructor material for the debrief: use
them to confirm and fix what students find, not as a spoiler list to hand out
up front.

## The curriculum

Every vulnerability has a lesson in [`docs/lessons/`](docs/lessons/) — start
with the [curriculum index](docs/lessons/README.md). The intended role and
permission model, and the map of where each deliberate gap diverges from it, is
in [`docs/role-model.md`](docs/role-model.md).

## Responsible use

This project is for operators who own the environment it runs in: instructors,
students, and security teams practicing in isolation. Use it the way you would
any vulnerable-by-design lab — on a machine you control, disconnected from
anything real. If you wouldn't run DVWA on it, don't run this on it either.
