# Lesson O10 — Webhook SSRF

**Category:** OWASP A10:2021 Server-Side Request Forgery.
**Health-tech relevance:** Medium-high. Health platforms integrate with
everything (pharmacy systems, lab dashboards, EHR sync), and webhooks are the
cheapest integration, so this class shows up in nearly every health SaaS bug
bounty.

## What it is

Any authenticated user can point their notification webhook at any URL:

```ts
router.post('/settings/webhook', authenticate, (req, res) => {
  // no host allowlist, no scheme restriction beyond http(s), no private-range block
  ...
});
```

When that user receives a message, the **server** POSTs event data to the
registered URL. Because the request originates from the server, the user can
make the application talk to hosts it should never talk to: localhost
services, internal admin panels, cloud metadata endpoints, other patients'
hooked URLs.

## How to find it

- **Dynamically:** register a webhook pointing at a local listener you
  control, send yourself a message, and watch the server's request arrive.
  Then try internal-looking targets and observe there is no blocking.
- **In code review:** find every place the server fetches a user-influenced
  URL (webhooks, "import by URL", avatar fetchers) and check for allowlists.

## Impact (on this lab's fake data)

The server can be used to reach internal-only services, and message metadata
leaves to attacker-chosen destinations. In a real deployment the metadata
endpoint alone (`169.254.169.254` on cloud) can leak credentials for the whole
environment.

## The fix

Validate the destination before storing it and again before firing: allowlist
schemes and domains, resolve DNS and reject private/link-local/loopback
ranges, use a network egress policy, and consider signing payloads instead of
trusting the callback host.
