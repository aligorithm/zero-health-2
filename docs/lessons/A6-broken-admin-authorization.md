# Lesson A6 — Broken function-level authorization (admin endpoint)

**Category:** OWASP API5:2023 Broken Function Level Authorization / A01:2021.
**Health-tech relevance:** Admin endpoints expose the whole user population and
configuration. An unguarded one is a single-request path to everyone's account
metadata.

## What it is

`GET /api/admin/users` lives under an `/admin` path and is meant for admins, but
it only calls `authenticate` — it never checks `req.user.role === 'admin'`. Any
logged-in user, including a patient, can call it. "It's under /admin" and "the
UI only shows the link to admins" are not access control; the server must
enforce the check itself.

## How to find it

- **In code review:** every route under an admin/staff prefix must have a
  role assertion in the handler or a shared guard middleware. Grep the admin
  router for the role check; its absence is the finding.
- **Dynamically:** log in as a low-privilege user and request admin paths
  directly (don't rely on the UI to surface them). Client-side route hiding is
  not enforcement.
- **Signal:** authorization decided anywhere other than the server — in the
  frontend router, a hidden menu item, or "security by obscurity" of the URL.

## Impact (on this lab's synthetic data)

A patient retrieves the full synthetic user list. Compounded by A2 below, that
list includes password hashes. The fix closes it entirely.

## The fix

Guard the whole admin surface with a single middleware so no handler can forget:

```js
function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'forbidden' });
}

const admin = express.Router();
admin.use(authenticate, requireRole('admin'));
admin.get('/users', (req, res) => { /* ... safe projection, see A2 ... */ });
app.use('/api/admin', admin);
```

Centralizing the check is the real lesson: per-handler checks are easy to omit,
a router-level guard fails safe.
