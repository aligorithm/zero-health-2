# Lesson C1 — Bulk access / data exfiltration (defensive)

**Category:** A01 Broken Access Control aggregated / API4 Unrestricted Resource
Consumption.
**Health-tech relevance:** The headline breach scenario — not one record, but
the whole population.

> This lesson is taught **defensively**. The lab demonstrates the *primitive*
> (via the IDOR lessons A4/A4b, you can read a record you shouldn't), but it
> intentionally ships no packaged mass-extraction tool. The value is in
> recognizing and closing the conditions that let one bug scale.

## How bulk disclosure actually happens

Mass exfiltration is rarely one exotic bug. It's an ordinary access-control flaw
(A4/A4b/A6) combined with the *absence of controls that would contain it*:

- **Enumerable identifiers** — sequential integer ids let a single IDOR become
  "retrieve record 1, 2, 3, …".
- **No per-actor authorization on list/detail endpoints** — the server returns
  whatever id is asked for.
- **No rate limiting or quota** — thousands of requests draw no friction.
- **No pagination caps** — a single call returns unbounded rows.
- **No detection** — no audit log, no anomaly alerting on unusual read volume.

Each on its own is minor; together they turn one flaw into a breach.

## How to find it

- **Code review:** list/detail endpoints lacking an ownership/role scope; any
  `SELECT` without a `WHERE` tying rows to the caller; no `LIMIT`/pagination;
  no rate-limit middleware; no audit write on reads of sensitive data.
- **Traffic review:** can one authenticated session read records across many
  subjects with no throttling and no alert? That's the exposure.

## The fixes (containment in layers)

1. **Authorize every object and list** by the caller (close A4/A4b/A6).
2. **Non-enumerable ids** (UUIDs) so records can't be walked — hardening, not a
   substitute for authorization.
3. **Rate limiting and quotas** per user/IP on sensitive endpoints.
4. **Pagination with hard caps** on any list endpoint.
5. **Audit logging + anomaly detection** on bulk/sensitive reads, so unusual
   volume is visible and attributable.
6. **Minimize what each endpoint returns** (field-level projection; see A2).

The exam question for any sensitive read path: *"if one account turned
malicious, what stops it from pulling everything, and what would notice?"*
