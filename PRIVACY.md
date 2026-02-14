# Privacy Policy — Quran & Hadith for Google Docs

**Last updated:** February 13, 2026

## Overview

Quran & Hadith for Google Docs ("the Add-on") is a Google Docs add-on that lets users look up and insert Quran ayahs and Hadith references into their documents. It is developed and maintained by NNJAsec ("we", "us").

## Data We Collect

**No personal data.** The Add-on does not collect, transmit, or share any personal information with us or any third party.

## Data We Store Locally

The Add-on stores your preferences using Google Apps Script's `PropertiesService` (per-user, within Google's infrastructure). This includes:

- **Translation preferences** (e.g., which Quran translation edition, hadith translation language)
- **Hadith source selection** (fawazahmed0 or hadithapi.com)
- **hadithapi.com API key** (if you choose to use that source)

This data is stored in your Google account's script properties, not on our servers. Only you and the Add-on can access it.

## How the Add-on Works

- The Add-on runs entirely within your Google Docs environment.
- When you look up a Quran ayah or Hadith, the Add-on makes API requests to third-party services to retrieve the text:
  - **Al Quran Cloud API** (`api.alquran.cloud`) — for Quran text
  - **fawazahmed0 Hadith API** via jsDelivr (`cdn.jsdelivr.net`) — for Hadith text (default source, no API key required)
  - **hadithapi.com** (`hadithapi.com`) — optional alternative Hadith source (requires a free API key you obtain directly from hadithapi.com)
- These requests contain only the surah/ayah number or hadith collection/number you entered. If you use hadithapi.com, your API key is included in requests to that service. No other personal information is included.
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

The Add-on has no backend, no database, and no server-side storage of its own. User preferences are stored in Google Apps Script's `PropertiesService` within your Google account. It does not use cookies, analytics, or tracking of any kind.

## Third-Party Services

The Add-on communicates with the following third-party APIs solely to retrieve religious text:

- [Al Quran Cloud](https://alquran.cloud) — [Privacy Policy](https://alquran.cloud/privacy-policy)
- [jsDelivr CDN](https://www.jsdelivr.com) — [Privacy Policy](https://www.jsdelivr.com/privacy-policy-jsdelivr-net)
- [hadithapi.com](https://hadithapi.com) (optional, user-enabled) — contact hadithapi.com for their privacy policy

We do not control these services and recommend reviewing their privacy policies.

## Children's Privacy

The Add-on does not knowingly collect any information from anyone, including children under 13.

## Changes to This Policy

We may update this policy from time to time. Changes will be posted at this URL with an updated date.

## Contact

For questions about this privacy policy, contact us at **inquiry@nnjasec.com**.
