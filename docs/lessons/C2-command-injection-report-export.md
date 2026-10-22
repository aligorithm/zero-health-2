# Lesson C2 — Command injection in report export (server-takeover class)

**Category:** OWASP A03:2021 Injection (operating system command injection).
This is the server-takeover class: the primitive from which full host
compromise follows.
**Health-tech relevance:** Critical. Document generation, image processing,
and OCR pipelines routinely shell out to system tools, and health records
flow into all of them.

> This lab runs on localhost with fabricated data only. The mechanism,
> however, is the real one.

## What it is

`POST /api/reports/:patientId/pdf` renders a patient report to PDF by
shelling out to the system converter (`htmldoc`). The report title — which
defaults to `"<patient full name> medical report"` — is interpolated into a
shell command inside double quotes:

```ts
exec(`htmldoc --format pdf --title "${title}" --out ${outPath} ${htmlPath}`, ...)
```

Two injection paths, both live:

1. **Stored:** patients control their own `full_name` via `PATCH /api/me`.
   A patient who sets their name to `A$(whoami >&2)lia Hart` has code running
   as the API process user the next time any doctor generates a server PDF
   for them.
2. **Direct:** the requesting doctor/admin can pass a crafted `title`.

The endpoint returns the converter log in the response, so the output of
injected commands is visible in the API reply (and in the "Generate PDF
(server)" output box in the portal).

## How to find it

- **In code review:** grep for `child_process` usage (`exec`, `execSync`,
  `spawn` with `shell: true`) and trace every interpolated value back to
  user input. Profile fields that later flow into system calls are the
  classic stored variant.
- **Dynamically:** put `A$(echo MARKER >&2)x` in a patient profile name,
  have a doctor export a server PDF for that patient, and look for `MARKER`
  in the converter log. Command substitution (`$(...)`) fires even inside
  double quotes, as do backticks; redirect to stderr (`>&2`) so the output
  shows up in the converter log even when the tool itself is missing.

## Impact (on this lab's fake data)

Arbitrary command execution as the service account: read the SQLite file,
write a webshell into the uploads directory, pivot to internal services,
install persistence. With command execution, every other control in the app
is irrelevant — including the upload type checks and the API's own
authorization. That is why this is the takeover class.

## The fix

- **Never build shell strings from user data.** Use `execFile`/`spawn` with
  an argument array (no shell), or drop the external tool for a native
  library (PDFKit, puppeteer) with no OS process at all.
- Blocklist filtering of characters is not a fix — encodings and quoting
  games lose that race.
- If a title genuinely must reach a CLI tool, pass it as a single argv
  element, never as part of a command string.
- Defense in depth: run the worker with least privilege, in a sandboxed
  container with no network egress, so a future injection has nowhere to go.
