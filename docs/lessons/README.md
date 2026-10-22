# Zero Health — Vulnerability Curriculum

Every flaw in this lab is here, each with a lesson covering **what it is → how
to find it → impact on synthetic data → the fix**. The learning objective is
always *find it and fix it*. Flaws are wired into a realistic health-tech
context so learners meet them the way they appear in that domain, not as
abstract textbook snippets.

All data is synthetic. The app binds to localhost and refuses public exposure
(see top-level `README.md`).

## Lessons

| ID | Title | Class (OWASP) | Health-tech angle |
|----|-------|---------------|-------------------|
| [A1](A1-mass-assignment-privilege-escalation.md) | Mass assignment → privilege escalation | API3 / A08→A01 | patient → clinician/admin |
| [A2](A2-sensitive-data-exposure-and-weak-hashing.md) | Sensitive data exposure + weak hashing | A02 / API3 | leaked credential material |
| [A4](A4-idor-prescriptions.md) | IDOR on prescriptions | API1 / A01 | read any patient's meds |
| A4b | IDOR on lab results (same class, 2nd record type) | API1 / A01 | read any patient's labs |
| [A5](A5-prescription-integrity.md) | Broken function-level authz → prescription integrity | API5 / A01 | alter a medication order |
| [A6](A6-broken-admin-authorization.md) | Broken admin-level authorization | API5 / A01 | reach admin surface |
| [L1/L2](L1-L2-prompt-injection.md) | Direct & indirect prompt injection | LLM01 | agent wired to records |
| [O03](O03-sql-injection-search.md) | SQL injection in prescription search | A03 | one search branch concatenates input |
| [O04](O04-predictable-collection-codes.md) | Predictable collection codes | A04 | Math.random() for a bearer token |
| [O05](O05-debug-endpoint.md) | Exposed debug endpoint | A05 | unauthenticated config disclosure |
| [O06](O06-vulnerable-dependency.md) | Vulnerable lodash dependency | A06 | prototype pollution (CVE-2020-8203) |
| [O08](O08-unverified-uploads.md) | Uploads never content-verified | A08 | extension-only trust on clinical files |
| [O10](O10-webhook-ssrf.md) | Webhook SSRF | A10 | server POSTs to any user-chosen URL |
| [P1](P1-tracking-pixel.md) | Tracking pixel on the portal | Privacy (HIPAA) | Kaiser / Cerebral incident class |
| [C1](C1-bulk-access-and-exfiltration-class.md) | Bulk access / exfiltration (defensive) | A01 / API4 | mass record disclosure |
| [C2](C2-rce-class-defensive.md) | Server-takeover class (defensive) | A03 / A08 | full-system compromise |

## A note on the two highest-impact classes (C1, C2)

The original design brief asked for "mass data exfiltration" and "server
takeover." This lab handles those two deliberately differently from the rest:

- It **demonstrates the primitives** that lead to bulk disclosure (the IDOR and
  broken-authz lessons let you read records you shouldn't), because seeing that
  is the teaching point.
- It **does not ship** a packaged, optimized exfiltration tool or a live
  remote-code-execution-to-shell chain. Those add nothing pedagogically that the
  detection-and-fix treatment doesn't, while being the parts most reusable
  outside a lab.

So C1 and C2 are taught as **classes**: how the weakness arises, how to detect
it in code and traffic, and how to remediate it. This keeps the lab firmly a
*find-it-and-fix-it* environment. If you are teaching an advanced course and
want live exploit targets for these two classes specifically, the established,
governed labs (OWASP Juice Shop's harder challenges, dedicated RCE sandboxes)
are the right venue, run in isolation.

## How to run a session

1. Seed: `npm run seed` (regenerates the synthetic DB deterministically).
2. Start the API and the web app: `npm run api` and `npm run web`
   (localhost only).
3. Let learners explore the running app. It ships with **no labels or hints**
   about the flaws — they have to find them through the UI, devtools, and API
   traffic. `npm run verify` (with the API up) confirms the functional flows.
4. Debrief with the lesson below, reproduce the flaw against the fake data,
   then apply the fix in the code and confirm the flaw is gone.
