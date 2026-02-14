# Privacy Policy — Quran & Hadith for Google Docs

**Last updated:** February 13, 2026

## Overview

Quran & Hadith for Google Docs ("the Add-on") is a Google Docs add-on that lets users look up and insert Quran ayahs and Hadith references into their documents. It is developed and maintained by NNJAsec ("we", "us").

## Data We Collect

**None.** The Add-on does not collect, store, transmit, or share any personal data or user information.

## How the Add-on Works

- The Add-on runs entirely within your Google Docs environment.
- When you look up a Quran ayah or Hadith, the Add-on makes API requests to third-party services to retrieve the text:
  - **Al Quran Cloud API** (`api.alquran.cloud`) — for Quran text
  - **fawazahmed0 Hadith API** via jsDelivr (`cdn.jsdelivr.net`) — for Hadith text
- These requests contain only the surah/ayah number or hadith collection/number you entered. No personal information is included in these requests.
- Retrieved text is inserted directly into your Google Doc. No data is sent to or stored on our servers.

## Google User Data

The Add-on requests the following Google OAuth scopes:

| Scope | Purpose |
|-------|---------|
| `documents.currentonly` | Read and write content in the current Google Doc (to insert formatted text at your cursor) |
| `script.external_request` | Make HTTP requests to the Quran and Hadith APIs listed above |
| `script.container.ui` | Display the sidebar interface within Google Docs |

The Add-on accesses your document **only** to insert text you explicitly request. It does not read, scan, or exfiltrate any existing document content beyond what is necessary to locate your cursor position.

## Data Storage

The Add-on has no backend, no database, and no server-side storage. It does not use cookies, local storage, analytics, or tracking of any kind.

## Third-Party Services

The Add-on communicates with the following third-party APIs solely to retrieve religious text:

- [Al Quran Cloud](https://alquran.cloud) — [Privacy Policy](https://alquran.cloud/privacy-policy)
- [jsDelivr CDN](https://www.jsdelivr.com) — [Privacy Policy](https://www.jsdelivr.com/privacy-policy-jsdelivr-net)

We do not control these services and recommend reviewing their privacy policies.

## Children's Privacy

The Add-on does not knowingly collect any information from anyone, including children under 13.

## Changes to This Policy

We may update this policy from time to time. Changes will be posted at this URL with an updated date.

## Contact

For questions about this privacy policy, contact us at **inquiry@nnjasec.com**.
