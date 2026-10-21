# Lesson A5 — Broken Function-Level Authorization → Prescription integrity

**Category:** OWASP API5:2023 (Broken Function Level Authorization) /
A01:2021 Broken Access Control.
**Health-tech relevance:** Very high. Altering a medication order is a
patient-safety issue, not just a data-integrity one. This is the class of flaw
that matters most in a prescribing workflow.

## What it is

`PATCH /api/prescriptions/:id` lets *any authenticated user* change a
prescription's medication, dosage, or status. Creating and altering orders is a
clinician-only function, but the handler checks only that you are logged in, not
that you are allowed to perform this function.

```js
// vulnerable
router.patch('/prescriptions/:id', authenticate, (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'not found' });
  // no role check, no ownership check, no audit trail
  db.prepare('UPDATE prescriptions SET ... WHERE id = ?').run(...);
});
```

In the lab you can log in as a patient and cancel or rewrite another patient's
synthetic order.

## How to find it

- **In code review:** state-changing handlers (`POST`/`PUT`/`PATCH`/`DELETE`)
  that have `authenticate` but no `req.user.role` check. Function-level
  authorization is about *who may invoke the action*; object-level (A4) is about
  *which record they may touch*. This endpoint misses both.
- **Dynamically:** authenticate as a low-privilege role and attempt a
  write that should be privileged. If it succeeds, the function isn't gated.
- **Signal:** compare the endpoint against the role-model table
  (`docs/role-model.md`). "Create / modify prescription" is doctor/admin only;
  the code allows everyone.

## Impact (on this lab's synthetic data)

A patient can cancel, re-dose, or change the medication on any synthetic order.
Mapped to a real system this is tampering with care instructions — which is why
prescribing paths need the strongest authorization *and* a tamper-evident audit
log. The remediation is the lesson; there is no "scale this up" step.

## The fix

Gate the function by role, confirm the actor is clinically related to the
record, validate the payload, and write an audit entry.

```js
router.patch('/prescriptions/:id', authenticate, (req, res) => {
  if (!['doctor', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'only a prescriber may modify an order' });
  }
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'not found' });

  const allowed = { status: ['active', 'cancelled', 'filled'] };
  if (req.body.status && !allowed.status.includes(req.body.status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  // apply change...
  auditLog({ actor: req.user.id, action: 'prescription.modify', target: rx.id, before: rx, body: req.body });
  // ...
});
```

Discussion points:
- Authentication ≠ authorization ≠ validation. This endpoint needed all three.
- An **audit trail** is a detective control: even a correctly-authorized change
  to a medication order should be attributable and reviewable.
- Consider a state machine for prescription status so illegal transitions
  (e.g. `filled` → `active`) are rejected centrally.
