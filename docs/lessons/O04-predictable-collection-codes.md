# Lesson O04 — Predictable collection codes

**Category:** OWASP A04:2021 Insecure Design.
**Health-tech relevance:** High. Pharmacy pickup codes are bearer
credentials: whoever presents them collects the medication.

## What it is

Prescription collection codes are generated with `Math.random()`:

```ts
for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
```

`Math.random()` is not a cryptographic primitive. Its output is a
pseudo-random sequence whose internal state can be recovered from a handful of
observed values, which makes codes predictable in practice, and it is also not
seeded per-process in a way that guarantees uniqueness.

## How to find it

- **In code review:** grep for `Math.random` anywhere near tokens, codes, ids,
  or secrets. If it feeds anything security-relevant, it is a finding.
- **Dynamically:** collect a batch of codes (as a doctor, create several
  prescriptions) and test for repeated substrings or predictable structure.

## Impact (on this lab's fake data)

A predictable code undermines the whole pharmacy verification flow: an
attacker who can guess or recover codes can collect someone else's
prescription, because the code is the only check at the counter.

## The fix

Use a CSPRNG and enough entropy:

```ts
const bytes = crypto.randomBytes(6);
for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
```

Better: treat codes as one factor of a real identity check at pickup, not the
only one.
