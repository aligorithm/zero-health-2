# Lesson O08 — Uploads are never content-verified

**Category:** OWASP A08:2021 Software and Data Integrity Failures.
**Health-tech relevance:** High. Lab images, message attachments, and scanned
documents are core health features, and they arrive from users.

## What it is

The upload pipeline (lab result images, message attachments) decides
everything from the **file extension**: the multer `fileFilter` checks
`path.extname(file.originalname)`, files are stored with a random name plus
that extension, and `/api/files/:filename` serves them back with the
content-type implied by the same extension.

No step verifies the **content**: no magic-byte check that the PNG is actually
a PNG, no malware scanning, no re-encoding. A polyglot or mislabeled file is
stored and served as-is, and the system's trust in the data rests entirely on
a client-supplied string.

## How to find it

- **Dynamically:** upload a non-image with an image extension (the filter
  rejects mismatched extensions, so craft content that does not match its
  type) and observe what gets stored and served.
- **In code review:** look for upload handling where the only validation is
  the extension or the declared MIME type, and where files are served back
  with the stored name's content-type.

## Impact (on this lab's fake data)

Integrity of the medical record: a "result image" is clinical evidence, and
nothing guarantees the bytes were ever what the extension claims. In real
systems, unverified uploads feed malware distribution and evidence tampering.

## The fix

Verify magic bytes server-side, sniff the real type (e.g., `file-type`),
reject on mismatch, optionally re-encode images, scan with AV, and serve from
a separate unprivileged origin with `Content-Security-Policy` and
`X-Content-Type-Options: nosniff`.
