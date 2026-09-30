# Privacy Policy — Quran & Hadith Importer

**Last updated:** September 29, 2026

## Overview

Quran & Hadith Importer ("the Add-on") is a Google Docs add-on that lets users look up and insert Quran ayahs, hadith, and tafsir into their documents. It is developed and maintained by NNJAsec LLC ("we", "us").

## Summary

- The Add-on has no servers of its own. It runs inside Google Docs on Google's Apps Script platform.
- It reads your open document only to find your cursor and, when you run **Replace All Tags**, to find `/quran`, `/hadith`, and `/tafsir` tags. Document text is never sent anywhere.
- It sends only the reference you asked for (for example, `bukhari 1` or `2:255`) to the text sources listed below.
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

- Document text is read in memory to find tags and is never stored, logged, or sent to us or to any text source.
- The only data sent to a text source is the reference itself: a hadith collection and number, a surah and ayah, or a tafsir work and ayah.
- The Add-on doesn't sell, share, or transfer Google user data, and doesn't use it for advertising.

### Limited Use

The Add-on's use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## What the Add-on stores

Everything is stored inside Google's Apps Script services. We have no servers.

- Your preferences (sources, translations, tafsir and grade settings, and your hadithapi.com key if you add one), in your Google account's Apps Script storage.
- Short-lived caches: retrieved text for up to 6 hours, and counters that pace requests. They contain nothing about you.
- Error codes from failed requests, in the developer's logs. No document text.

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
- Cached text expires on its own within 6 hours.

## Children's privacy

The Add-on does not knowingly collect any information from anyone, including children under 13.

## Changes to this policy

We may update this policy. Changes are posted at this URL with a new "Last updated" date.

## Contact

For questions about this privacy policy, email **inquiry@nnjasec.com**.
