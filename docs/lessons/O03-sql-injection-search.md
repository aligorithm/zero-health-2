# Lesson O03 — SQL Injection in prescription search

**Category:** OWASP A03:2021 Injection.
**Health-tech relevance:** High. Health APIs are frequently probed with
injection payloads because a working injection yields the full patient
database in one shot.

## What it is

One branch of `GET /api/search?type=prescriptions` builds its SQL by
interpolating the `q` parameter directly into the statement:

```ts
const sql = `SELECT p.*, pt.full_name AS patient_name
               FROM prescriptions p LEFT JOIN users pt ON pt.id = p.patient_id
              WHERE p.medication LIKE '%${q}%' OR pt.full_name LIKE '%${q}%'
              ORDER BY p.id`;
```

Every other search branch uses bound parameters. This one does not.

## How to find it

- **Dynamically:** search prescriptions for `x' OR 1=1 --` and compare the row
  count with a benign term. Then try `x' UNION SELECT ...` to pull other
  tables (match the column count of the SELECT).
- **In code review:** grep for template literals or string concatenation
  feeding `db.prepare` / query builders. Any `${...}` inside SQL is a red flag.

## Impact (on this lab's fake data)

Table-wide disclosure: with a UNION payload any authenticated pharmacist,
doctor, or admin user can read rows from `users`, including password hashes,
for every account. In a real system this is a single-request PHI breach.

## The fix

Never concatenate input into SQL. Use bound parameters like the sibling
branches do, and reject queries that fail cleanly:

```ts
db.prepare(
  `SELECT p.*, pt.full_name AS patient_name
     FROM prescriptions p LEFT JOIN users pt ON pt.id = p.patient_id
    WHERE p.medication LIKE ? OR pt.full_name LIKE ?
    ORDER BY p.id`
).all(`%${q}%`, `%${q}%`);
```
