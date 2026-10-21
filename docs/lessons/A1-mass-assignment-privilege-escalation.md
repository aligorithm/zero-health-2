# Lesson A1 — Mass Assignment → Privilege Escalation at registration

**Category:** OWASP API3:2023 (Broken Object Property Level Authorization) /
A08:2021-ish mass assignment, leading to A01 Broken Access Control.
**Health-tech relevance:** High. The jump from `patient` to `doctor`/`admin`
is the difference between seeing your own record and prescribing, dispensing,
or reading the whole panel of synthetic patients.

## What it is

`POST /api/auth/register` copies the `role` field straight from the request
body into the new user row. The client decides its own privilege level.

```js
// vulnerable
const { email, password, full_name, role } = req.body || {};
db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
  .run(email, weakHash(password), full_name, role || 'patient');
```

Send `{"role":"admin"}` and you are an admin. This is "mass assignment": the
server binds client-supplied fields to a privileged model property it never
meant to expose.

## How to find it

- **In code review:** a write path that spreads or destructures the whole
  request body into a DB insert/update, especially when the model has
  security-sensitive columns (`role`, `is_admin`, `verified`, `patient_id`).
  Grep for fields like `role`, `isAdmin`, `permissions` being read from
  `req.body`.
- **Dynamically:** register normally, capture the request, replay it with an
  extra `"role":"admin"` field, then check whether privileged endpoints open up.
- **Signal:** the set of fields the client *can* send is larger than the set it
  *should* be able to set.

## Impact (on this lab's synthetic data)

An attacker-registered `admin` can reach every staff-only endpoint and read the
seeded synthetic records across all fake patients. In a real system this is a
full authorization bypass from an unauthenticated starting point.

## The fix

Never accept privilege-defining fields from the client. Allow-list the fields
you bind, and set `role` server-side.

```js
router.post('/auth/register', (req, res) => {
  const { email, password, full_name } = req.body || {};   // role NOT destructured
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password, full_name required' });
  }
  const ALLOWED_SELF_SIGNUP_ROLE = 'patient';              // fixed server-side
  db.prepare('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
    .run(email, strongHash(password), full_name, ALLOWED_SELF_SIGNUP_ROLE);
  // ...
});
```

Staff roles are provisioned through a separate admin-only flow that itself
checks `req.user.role === 'admin'`. Discussion points for class:
- Validate against an explicit enum; reject unknown roles.
- Use separate DTOs/schemas for input vs. the DB model so binding is explicit.
- The same pattern applies to *updates* — a profile-edit endpoint that accepts
  `role` is the same bug.
