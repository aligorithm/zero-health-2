# Zero Health — Role & Permission Model

Five roles. This table is the *intended* design. Several endpoints deliberately
fail to enforce it; each gap is a numbered lesson in [`lessons/`](lessons/) so
learners can compare "what the policy says" against "what the code does".

| Capability                              | patient | doctor | pharmacist | labtech | admin |
|-----------------------------------------|:-------:|:------:|:----------:|:-------:|:-----:|
| View own record                         |   ✓     |   ✓    |     ✓      |    ✓    |   ✓   |
| View any patient record                 |         |   ✓    |     ✓*     |   ✓*    |   ✓   |
| Create / modify prescription            |         |   ✓    |            |         |   ✓   |
| Dispense / mark prescription filled      |         |        |     ✓      |         |   ✓   |
| Enter / edit lab results                |         |   ✓    |            |    ✓    |   ✓   |
| Message any user                        |         |   ✓    |     ✓      |    ✓    |   ✓   |
| Manage users / assign roles             |         |        |            |         |   ✓   |

\* pharmacist and labtech should see only records relevant to a dispensing or
lab task, not the whole population — a scoping requirement that one lesson shows
being violated.

## Intended enforcement

Authorization is meant to happen in two layers:

1. **Authentication** — `authenticate` middleware verifies the session token and
   populates `req.user` (`id`, `role`, `email`).
2. **Authorization** — each handler checks `req.user.role` and/or object
   ownership (`record.patient_id === req.user.id`) *before* acting.

## Deliberate gaps (teaching map)

| Lesson | Where | Policy says | Code does |
|--------|-------|-------------|-----------|
| A1 | `POST /auth/register` | role is assigned server-side | trusts client `role` |
| A4 | `GET /prescriptions/:id` | owner or clinician only | returns any record |
| A4b | `GET /lab-results/:id` | owner or clinician only | returns any record |
| A5 | `PATCH /prescriptions/:id` | doctor/admin only, audited | any logged-in user may alter |
| A6 | `GET /admin/users` | admin only | any logged-in user may call |
| A2 | `GET /admin/users` | never returns secrets; strong hashing | leaks unsalted SHA-256 hashes |
| L1 | `POST /agent/chat` | user input can't override policy | user input shares instruction channel |
| L2 | `GET /agent/summarize/:id` | record text is untrusted data | record text steers the agent |

The point of the table is that **every** gap is a divergence between this
documented policy and the implementation — which is exactly the artifact a
real security review produces. Learners fix the code until it matches the table.
