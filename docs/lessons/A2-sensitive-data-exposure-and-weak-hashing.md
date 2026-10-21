# Lesson A2 — Sensitive data exposure + weak password hashing

**Category:** OWASP A02:2021 Cryptographic Failures / API3 excessive data exposure.
**Health-tech relevance:** Credential reuse against a health platform is a
common breach path; leaking crackable hashes hands attackers the door.

## Two linked flaws

### 1. The API serializes secrets it should never return

`GET /api/admin/users` does `SELECT *` and returns the whole row, including
`password_hash`. Even for a legitimate admin, the API has no reason to ever
emit a password hash. Returning `SELECT *` lets schema changes silently start
leaking new sensitive columns.

### 2. The hashes are weak

Passwords are stored as **unsalted SHA-256** (see `seed.js` / `weakHash`):

```js
crypto.createHash('sha256').update(pw).digest('hex'); // fast, unsalted — crackable
```

SHA-256 is a fast hash with no salt, so identical passwords produce identical
hashes and the whole set is trivially attacked with rainbow tables or
high-rate GPU guessing.

## How to find it

- **Exposure:** grep responses/serializers for secret fields (`password`,
  `password_hash`, `token`, `ssn`). Any `SELECT *` feeding a JSON response is a
  smell. Check what the API *actually* returns, not what you intended.
- **Weak hashing:** look at the hashing call. `md5`/`sha1`/`sha256` on a
  password, or any hash without a per-user salt and a work factor, is the flaw.

## Impact (on this lab's synthetic data)

The leaked hashes are of fake accounts all using `Password1!`, so they're
identical — which is exactly the teaching point about unsalted fast hashes. No
real credentials exist here.

## The fix

**Never serialize secrets** — project only safe fields:

```js
const SAFE = 'id, email, full_name, role, created_at';
db.prepare(`SELECT ${SAFE} FROM users`).all();
```

**Hash with a slow, salted algorithm** — argon2id (preferred) or bcrypt:

```js
const argon2 = require('argon2');
const hash = await argon2.hash(password);          // per-hash salt + work factor built in
const ok   = await argon2.verify(hash, attempt);
```

Discussion points: add a serialization layer (DTO) so secrets can't leak by
default; set a bcrypt cost / argon2 memory cost appropriate to your hardware;
never log credentials or hashes.
