# Lesson C2 — Server-takeover class (defensive)

**Category:** A03 Injection (command/template) / A08 Software &amp; Data Integrity
(unsafe deserialization), leading to remote code execution.
**Health-tech relevance:** RCE on a platform host is the worst case — it sits
above every application-level control.

> This lesson is taught **defensively only**. The lab ships **no** live
> RCE-to-shell target. Remote code execution is the one class where a working,
> realistic exploit chain is far more reusable against real systems than it is
> useful for teaching, and the detect-and-fix treatment covers the learning
> objective fully. For hands-on RCE practice specifically, use a dedicated,
> isolated, governed sandbox built for it.

## How server takeover arises (recognition, not recipe)

The common roots, at the level you need to *spot and prevent* them:

- **OS command injection** — user-influenced data reaches a shell
  (`exec`/`system`/backticks) without being passed as separated arguments.
  Red flag: string concatenation into a shell command.
- **Unsafe deserialization** — untrusted bytes are deserialized into live
  objects by a deserializer that can instantiate arbitrary types / trigger
  side effects. Red flag: native deserialization of request data.
- **Server-side template injection** — user input is rendered *as* a template
  rather than *as data within* a template.
- **Unrestricted file upload + execution** — an uploaded file lands somewhere
  the server will execute it.
- **Dependency / supply-chain** — a known-vulnerable or tampered package.

## How to find it

- **Code review:** grep for shell execution, native deserialization, template
  compilation, and file writes to executable paths that take request-derived
  input. Trace the data from request to sink.
- **Dependencies:** run SCA (e.g. `npm audit`, lockfile review); watch for
  unpinned or unexpected packages.
- **Signal:** any path where *data* can become *code*.

## The fixes

1. **Never pass user data to a shell.** Use parameterized APIs / `execFile`
   with an argument array; avoid the shell entirely where possible.
2. **Don't deserialize untrusted input** with powerful deserializers; use data
   formats (JSON) parsed into plain structures, with schema validation.
3. **Treat templates as code** — never compile user input as a template; pass
   it as bound data.
4. **Constrain uploads** — store outside the webroot, randomize names, never
   serve as executable, validate type/size.
5. **Patch and pin dependencies**; adopt SCA in CI.
6. **Least privilege + isolation** — run the service as an unprivileged user in
   a container so that even a failure is contained (defense in depth).

The objective is to eliminate every path where request data can reach an
execution sink, and to contain the blast radius if one is ever missed.
