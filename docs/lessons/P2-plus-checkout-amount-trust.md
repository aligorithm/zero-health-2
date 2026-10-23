# Lesson P2 — Client-trusted price in Plus checkout

**Category:** Business logic / insecure design (A04 family), on the
subscription payments surface.
**Health-tech relevance:** High. Health platforms increasingly sell
subscriptions (premium tiers, telehealth credits). Payment amount handling is
exactly where "amount tampering" bugs live in real products.

## What it is

`POST /api/subscription/checkout` computes the charge from the selected plan
($5 monthly, $50 annual) — unless the client sends its own `amount`:

```ts
const amount = typeof b.amount === 'number' && b.amount > 0 ? b.amount : PLUS_PRICES[plan];
```

A request with `{ "plan": "annual", "amount": 0.01, card_number: ... }` buys
a full year of Plus for one cent. The subscription period is then granted
from the plan, not from what was actually paid.

## How to find it

- **Dynamically:** capture a legitimate checkout request, replay it with a
  modified or added `amount` field, and compare what was charged vs what was
  granted.
- **In code review:** any money-moving endpoint where a quantity, price, or
  currency crosses a trust boundary from the client. Grep for `req.body` near
  `amount`, `price`, `currency`, `quantity`.

## Impact (on this lab's fake data)

Revenue bypass: unlimited Plus for a cent, repeated at will. In a real
product this is direct financial loss and billing-report poisoning.

## The fix

- Derive the amount **server-side from the plan** only. Never read `amount`
  (or currency, or quantity) from the request body.
- Validate amount > 0, currency matches the merchant account, and reject
  unknown fields at the schema level.
- Reconcile granted entitlement against the **payment record's** amount (from
  the provider), not the request.
