# Lesson O06 — Vulnerable dependency (prototype pollution)

**Category:** OWASP A06:2021 Vulnerable and Outdated Components.
**Health-tech relevance:** High. Real health-sector breaches routinely arrive
through vulnerable vendor software rather than code the victim wrote (the
Welltok and Change Healthcare incidents being textbook scale examples).

## What it is

The API pins `lodash@4.17.15`, which carries published prototype-pollution
CVEs (CVE-2020-8203, CVE-2019-10744 among them), and uses `_.set` on
`POST /api/settings/merge` to apply client-supplied settings paths:

```ts
import lodashSet from 'lodash/set';
// ...
lodashSet(settings, u.path, u.value);
```

A path like `__proto__.isAdmin` writes straight through to `Object.prototype`
inside the server process (the same primitive the published PoCs use; a plain
`__proto__` JSON key fed to `_.merge` does not pollute, because it only swaps
the merged object's prototype). The endpoint returns `prototype_polluted:
true` as an observable probe, but the real danger is polluted values
silently altering behavior elsewhere in the process (feature flags,
`isAdmin` checks, option defaults).

## How to find it

- **Dynamically:** send a `__proto__` payload to the merge endpoint and read
  the probe. Then look for any code that reads properties from plain objects
  with defaults.
- **Tooling:** `npm audit`, Dependabot/Socket/OWASP Dependency-Check flag this
  instantly. Health platforms should fail CI on high/critical advisories.

## Impact (on this lab's fake data)

Prototype pollution is a stepping stone: in real apps it has escalated to
authentication bypass, RCE (polluting `child_process` options), and DoS.

## The fix

Upgrade `lodash` to a patched version (>= 4.17.21), and validate/allow-list
input before merging anything. Track dependencies with automated alerts, and
treat a vulnerable dependency in a health platform as a patch-now event.
