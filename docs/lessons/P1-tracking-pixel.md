# Lesson P1 — Tracking pixel on the patient portal

**Category:** Impermissible disclosure (HIPAA Privacy) more than a classic
OWASP web flaw. This is the Kaiser (13.4M) and Cerebral (3.2M) incident class:
tracking technologies on health surfaces, sending user behavior to analytics
providers with no business associate agreement.

## What it is

Every portal page view fires a beacon to `POST /api/track` that carries the
page path **and the signed-in identity** (derived from the bearer token).
The events land in an `analytics_events` table: a tidy database of "which
patient viewed which health page and when".

```ts
useEffect(() => {
  if (!pathname) return;
  const token = getToken();
  void fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify({ path: pathname }),
    keepalive: true,
  }).catch(() => {});
}, [pathname]);
```

In real incidents the collector belonged to a third party (ad-tech /
session-replay). Here it points at the app itself, but the pattern is
identical: identity plus health context leaving the product's boundary for
"analytics".

## How to find it

- **Dynamically:** open devtools, browse the portal, and watch the network
  tab for beacon-style requests that carry your identity with every
  navigation.
- **In code review:** audit every outbound request from the frontend: pixels,
  beacons, replay scripts, tag managers. On a health surface each one needs a
  data-protection answer (what is sent, to whom, under what agreement).

## Impact (on this lab's fake data)

A visit to `/portal/records` in the analytics table is disclosure of the fact
that a specific person is a patient. Regulators treat that as reportable, and
both cited incidents came from exactly this: the page path revealed the
sensitive service (mental health, addiction treatment).

## The fix

Remove the pixel, or strip it to truly anonymous, non-identifying events, and
maintain a tracking inventory with a BAA for any processor. The deeper fix is
governance: marketing tooling must never be one click away from the patient
portal.
