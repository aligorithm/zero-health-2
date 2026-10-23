# Lesson P3 — Medical history import trusts a client-supplied patient id

**Category:** OWASP A01 Broken Access Control (BOLA on a write path).
**Health-tech relevance:** Critical. Record imports (from another clinic, a
pharmacy export, a device) are a classic health-tech integration feature —
and writing attacker-chosen data into another patient's record is a
reportable breach in any real system.

## What it is

`POST /api/me/medical-history` imports conditions, medications, and
allergies. The route is Plus-gated and is *meant* to write only into the
caller's own history — but it accepts an optional `patient_id` in the body
and writes into that user's history instead, with no ownership check:

```ts
const targetId = b.patient_id || user.id;
db.prepare('DELETE FROM medical_history WHERE patient_id = ?').run(targetId);
```

Any Plus subscriber can therefore **replace any patient's imported medical
history** — including deleting it (the import clears prior rows first).

## How to find it

- **Dynamically:** import history containing a distinctive marker, then
  check your own history endpoint — it's empty; log in as (or read via
  another flaw) the target patient to find your marker there.
- **In code review:** a `/me`-style endpoint that reads a second identity
  field from the body (`patient_id`, `user_id`, `account`) is an immediate
  red flag. The authenticated identity should be the **only** identity
  source on self-service routes.

## Impact (on this lab's fake data)

Tampering with the clinical record: a forged allergy list can drive
real-world prescribing decisions. Combined with the IDOR lessons, this is
also a data-poisoning primitive for anything downstream that trusts history
(including Zero Agent's record context).

## The fix

Never accept an identity field on a `/me` route: `const targetId = user.id`
period. On any write path, re-assert ownership from the token, not the
body, and audit what an import is allowed to replace.
