# Privacy Policy — Quran & Hadith Importer

**Last updated:** October 3, 2026

## Overview

Quran & Hadith Importer ("the Add-on") is a Google Docs add-on that lets users look up and insert Quran ayahs, hadith, and tafsir into their documents. It is developed and maintained by NNJAsec LLC ("we", "us").

## Summary

- The Add-on has no servers of its own. It runs inside Google Docs on Google's Apps Script platform.
- It reads your open document only to find your cursor and, when you run **Replace All Tags**, to find `/quran`, `/hadith`, and `/tafsir` tags.
- It sends only the reference you asked for (for example, `bukhari 1` or `2:255`) to the text sources listed below. No other document text leaves Google.
- It does not collect personal information, and it uses no cookies, analytics, or tracking.

## Google user data

### What the Add-on accesses

The Add-on requests these Google OAuth scopes:

| Scope | What the Add-on does with it |
|-------|------------------------------|
| `documents.currentonly` | Works only on the document it's open in. Reads the cursor position to insert text there. When you run **Replace All Tags** (or **Scan & Replace Tags** from the menu), reads the document's text to find tags and replaces each tag with the text it asks for. |
| `script.external_request` | Requests Quran, hadith, and tafsir text from the sources listed under "Text sources". |
| `script.container.ui` | Shows the sidebar and the add-on menu inside Google Docs. |

The Add-on can't open, list, or change any other file in your Google Drive.

### How the Add-on uses it

- Document text is read in memory to find tags. It is never stored and never sent to us.
- From each tag, only the reference itself (for example, `bukhari:1`) is sent, to the text service that serves it.
- No one at NNJAsec reads your documents.

### Sharing, transfer, and disclosure

| Who receives it | What they receive | Why |
|-----------------|-------------------|-----|
| The text services listed under "Text sources" | Only the reference you asked for: a hadith collection and number, a surah and ayah, or a tafsir work and ayah, whether you typed it in the sidebar or it came from a tag in your document. hadithapi.com also receives your own hadithapi.com API key, if you use that source. | To retrieve the text you asked to insert |
| Google, which runs the Add-on on its Apps Script platform | The data the Add-on handles while it runs, its stored preferences and caches, and its error logs | To run the Add-on. Google handles this data under the [Google Privacy Policy](https://policies.google.com/privacy). |
| NNJAsec LLC | Error logs only (see "What the Add-on stores") | To find and fix errors |

We don't share, sell, rent, or transfer Google user data to anyone else, including advertisers, data brokers, and information resellers. We don't use it for advertising or to train AI or machine-learning models. We would disclose the error logs we hold only if the law requires it.

### Limited Use

The Add-on's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## What the Add-on stores, and for how long

Everything is stored in Google's Apps Script and Google Cloud services. NNJAsec has no servers or databases.

| What | Where | How long |
|------|-------|----------|
| Your preferences: sources, translations, tafsir and grade settings, and your hadithapi.com API key if you add one | Apps Script user properties, private to your Google account and this Add-on | Until you change them |
| Quran, hadith, and tafsir text the Add-on retrieved (public religious text, nothing about you) | Apps Script cache | Up to 6 hours |
| Counters that pace requests to each text service | Apps Script cache | Up to 2 minutes |
| A marker, tied to the document's ID, that lets **Scan & Replace Tags** in the menu start a run in the sidebar | Apps Script cache, per user | Up to 1 minute, removed as soon as the sidebar reads it |
| Error logs: the error message, which may include the reference that failed (for example, "Not found: Sahih Muslim 99999"), and the name of the text service | NNJAsec's Google Cloud project (Cloud Logging) | 30 days, Cloud Logging's default |

## How we protect your data

- **Encryption in transit.** Every request to a text service uses HTTPS. The Add-on's manifest allows requests only to the text services' addresses, so it can't send data anywhere else.
- **Encryption at rest.** Preferences, caches, and logs are stored on Google's infrastructure, which encrypts data at rest.
- **Least access.** The `documents.currentonly` scope limits the Add-on to the document it's open in. It can't open, list, or change other files in your Google Drive.
- **Private preferences.** Apps Script user properties can be read only by the Add-on running under your account. NNJAsec can't read your preferences or your hadithapi.com key.
- **Protected API keys.** Your hadithapi.com key appears as a masked field in **Settings** and is sent only to hadithapi.com. NNJAsec's sunnah.com key stays on Google's servers and is never sent to your browser.
- **Data minimization.** Document text is processed in memory and never stored. Only the reference itself leaves Google, and the text cache holds only public religious text.
- **Restricted access.** Only NNJAsec's developer account can change the Add-on's code or settings or read its error logs.
- **Open source.** The Add-on's code is public at [github.com/samelsaid/gdoc-muslim-importer](https://github.com/samelsaid/gdoc-muslim-importer), so anyone can check how it handles data.

## Text sources

To get text, the Add-on sends only the reference you asked for (for example, `bukhari 1` or `2:255`) to one of these services:

- [Al Quran Cloud](https://alquran.cloud): Quran text and translations
- [sunnah.com](https://sunnah.com): hadith (the default)
- [fawazahmed0 Hadith API](https://github.com/fawazahmed0/hadith-api), served by [jsDelivr](https://www.jsdelivr.com): hadith
- [hadithapi.com](https://hadithapi.com): hadith, only if you add your own API key, which is sent with each request
- [tafsir.app](https://tafsir.app) and [quran.com](https://quran.com): tafsir

Your settings and tag prefixes decide which service gets a request. If you turn on a fallback source, the same reference may also go to that source. Each service has its own privacy practices.

## Removing your data

- To remove your hadithapi.com key, clear the **API Key** field and click **Save Settings**.
- To revoke the Add-on's access to your Google account, open [Third-party apps & services](https://myaccount.google.com/connections) in your Google Account and remove **Quran & Hadith Importer**. After that, the Add-on can't run for you or read your saved preferences.
- Cached text expires on its own within 6 hours, and error logs within 30 days.

## Children's privacy

The Add-on does not knowingly collect any information from anyone, including children under 13.

## Changes to this policy

We may update this policy. Changes are posted at this URL with a new "Last updated" date.

## Contact

For questions about this privacy policy, email **inquiry@nnjasec.com**.
