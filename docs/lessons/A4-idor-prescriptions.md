# Lesson A4 — Broken Object-Level Authorization (IDOR) on prescriptions

**Category:** OWASP API1:2023 / A01:2021 — Broken Access Control
**Health-tech relevance:** High. In a real platform this is the difference
between a patient seeing their own medication list and seeing everyone's.

## What it is

The endpoint `GET /api/prescriptions/:id` authenticates the caller (it checks
that you have a valid session token) but never checks whether the prescription
you asked for actually belongs to you. Authentication answers "who are you";
**authorization** answers "are you allowed to see *this record*". This endpoint
does the first and skips the second.

```js
// vulnerable
router.get('/prescriptions/:id', authenticate, (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'not found' });
  res.json(rx); // <-- no ownership check
});
```

## How to find it

- **In code review:** any handler that looks up a record by an id from the URL
  or body, and returns it, without a clause tying it to the current user
  (`WHERE ... AND patient_id = :currentUser`) or an explicit role check.
- **Dynamically:** log in as one patient, request `/prescriptions/1`,
  `/prescriptions/2`, `/prescriptions/3` and observe that records belonging to
  other users come back. Sequential integer ids make this trivial to enumerate.
- **Signal:** the function has `authenticate` but no authorization logic in the
  body. Authentication middleware is not access control.

## Impact (on this lab's synthetic data)

Walking the id space returns every synthetic patient's medication, dosage, and
clinician notes. In a real deployment that is a bulk disclosure of health
records. The lesson is the *shape* of the failure, not a recipe for scale: the
fix below removes it entirely.

## The fix

Scope every object lookup to the caller, and gate cross-patient access behind
an explicit role check.

```js
router.get('/prescriptions/:id', authenticate, (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'not found' });

  const isOwner = rx.patient_id === req.user.id;
  const isClinician = ['doctor', 'pharmacist', 'admin'].includes(req.user.role);
  if (!isOwner && !isClinician) {
    return res.status(403).json({ error: 'forbidden' });
  }
  res.json(rx);
});
```

Defense-in-depth options worth discussing in class:
- Prefer non-sequential ids (UUIDs) so records can't be trivially enumerated —
  this is hardening, not a substitute for the authorization check.
- Return `404` rather than `403` when you don't want to reveal that a record
  exists at all.
- Centralize access checks in a policy layer so no single handler can forget.
