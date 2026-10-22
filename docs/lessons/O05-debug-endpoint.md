# Lesson O05 — Debug endpoint exposed

**Category:** OWASP A05:2021 Security Misconfiguration.
**Health-tech relevance:** High. Debug and status endpoints are left on by
accident constantly, and they are a gift to an attacker doing reconnaissance.

## What it is

`GET /api/debug` requires no authentication and returns:

- runtime details (node version, platform, uptime)
- environment facts, including whether `JWT_SECRET` is still the default and
  where the database file lives
- row counts for the main tables
- a listing of uploaded files

There is no role check, no auth, and no reason for it to exist in production.

## How to find it

- **Dynamically:** crawl common paths (`/api/debug`, `/api/status`, `/api/info`,
  `/api/health` variants) without a token. Anything that answers with more
  than "ok" is a lead.
- **In code review:** grep for routes registered before the auth middleware, or
  handlers with no `authenticate`.

## Impact (on this lab's fake data)

It tells an unauthenticated attacker exactly what they are attacking: whether
the JWT secret is default (so forgeable), where the database sits, and how much
data there is to steal. Reconnaissance for every other lesson on this list.

## The fix

Delete it. If you genuinely need a status page, return the minimum ("ok") with
no environment data, gate the detailed version behind admin auth, and ensure
debug features cannot ship to production builds at all.
