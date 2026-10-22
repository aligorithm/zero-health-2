# Real-World Health Sector Incidents (Instructor Reference)

Publicly reported incidents and breach statistics that map onto this lab's
lessons. Use them to connect what students find in the lab to events that
actually happened. Sources are public reporting, primarily the HIPAA Journal's
tracking of the HHS OCR breach portal ("Wall of Shame") and breach news.

Statistics current as of October 2026 reporting.

## The landscape

- Between October 2009 and mid-2026, **7,600+ breaches of 500+ records** were
  reported to OCR, exposing the PHI of **more than 1 billion individuals**
  (roughly 3x the US population).
- 2025 set a record: **772 large breaches** (~2.1 per day). Hacking/IT
  incidents account for **over 80%** of large breaches.
- Business associates (clearinghouses, billing, analytics vendors) are a
  growing share, and when they fall, the blast radius is enormous.
  Source: https://www.hipaajournal.com/healthcare-data-breach-statistics/

## Notable incidents and what they teach here

| Incident | Scale | What happened | Maps to |
|---|---|---|---|
| **Change Healthcare (2024)** | 192.7M individuals, largest ever | Ransomware at a clearinghouse used by thousands of providers; payments and claims nationwide froze | Supply-chain concentration + ransomware (C2 defensive lesson) |
| **Anthem (2015)** | 78.8M | Attackers compromised credentials and exfiltrated a member database over weeks | Credential compromise, detection gap, data minimization |
| **Conduent (2025)** | 62.2M | Business associate breach, third-largest ever | Third-party/supply chain (C1/C2) |
| **DentaQuest (2026)** | 15M | Hacking/IT incident at a dental benefits administrator | Current-events anchor for access control lessons |
| **Welltok (2023)** | 14.8M | Vulnerability in a messaging vendor exposed patient data | Vendor software flaws |
| **Kaiser (2024)** | 13.4M | Web tracking pixels on portal pages transmitted data to advertisers without a BAA | Unauthorized disclosure via third-party scripts (A-class thinking: data leaving the app) |
| **Cerebral (2023)** | 3.2M | Tracking pixels disclosed sensitive mental-health usage data | Same pixel class |
| **Ascension (2024)** | 5.5M | Ransomware disrupted care delivery for weeks | Availability as a patient-safety issue (C2) |

## Pattern mapping to this lab

- **IDOR / broken object-level authorization (A4, A4b)**: the everyday version
  of what breach reports file as "unauthorized access/disclosure". Healthcare
  consistently reports tens of thousands of sub-500-record breaches per year,
  most of them unauthorized access and disclosure, not ransomware.
- **Weak cryptography (A2)**: legacy hashing and hardcoded secrets remain a
  finding in real audits; exposed credential material turns a minor breach
  into a credential-stuffing campaign.
- **Broken function-level authorization (A5, A6)**: privileged endpoints
  without role checks are how "hacking" often starts in practice: a low-value
  foothold plus one open admin surface.
- **Prompt injection (L1, L2)**: as health platforms wire assistants to
  records and scheduling (like Zero Agent's chat booking), untrusted content
  in the instruction channel becomes a governance problem, not just a chat
  curiosity.

## Incidents that inspired flaws in this lab

- **Kaiser (2024) and Cerebral (2023)**: tracking technologies on patient
  surfaces transmitting identity-linked usage to advertisers. Inspired
  lesson P1, the portal analytics beacon.
- **Welltok (2023)**: breach through a vulnerable third-party component.
  Inspired lesson O06, the pinned vulnerable lodash dependency.
- **Change Healthcare (2024) / Anthem (2015)**: attacker reconnaissance
  against a misconfigured, unmonitored estate. Inspired lesson O05 (debug
  disclosure) and the audit-logging gaps.
- **General health SaaS bug-bounty findings**: webhook and callback SSRF.
  Inspired lesson O10.
- **Document-generation command injection** (the v1 lab's own PDF flaw, and
  a recurring bug-bounty pattern in file/export pipelines): inspired lesson
  C2, the server-side PDF export.

## Sources

- HIPAA Journal, Healthcare Data Breach Statistics (updated Oct 15, 2026):
  https://www.hipaajournal.com/healthcare-data-breach-statistics/
- HIPAA Journal, breach news category:
  https://www.hipaajournal.com/category/hipaa-breach-news/
- HHS OCR breach portal ("Wall of Shame"):
  https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf
