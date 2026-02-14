# Quran & Hadith -- Google Docs Add-on

Google Apps Script add-on that lets users look up and insert Quran ayahs and Hadith references directly into Google Docs, with formatted Arabic + English output.

## Features

- **Quran lookup** -- Arabic (Uthmani script) + configurable translation (15+ languages)
- **Hadith lookup** -- 10 collections across two sources with Arabic + translation text
- **Dual hadith sources** -- fawazahmed0 (free, no key) or hadithapi.com (free API key, grading info)
- **Translation settings** -- toggle translations on/off, pick from curated Quran translations, choose hadith language
- **Sidebar preview** -- preview text before inserting into the document
- **Ayah navigation** -- browse previous/next ayahs with surah boundary wrapping
- **Hadith navigation** -- browse previous/next hadiths in the sidebar
- **Ayah ranges** -- look up and insert multiple consecutive ayahs (e.g., 2:255-257)
- **Inline tag scanner** -- type `/quran 2:255` or `/hadith bukhari:1` in your document and batch-replace all tags with formatted blocks
- **Hadith grading** -- shows Sahih/Hasan/Da'eef status when using hadithapi.com

## Installation

### From Google Workspace Marketplace (recommended)

1. Open the [Quran & Hadith add-on](https://workspace.google.com/marketplace) in the Google Workspace Marketplace
2. Click **Install**
3. Grant the requested permissions
4. Open any Google Doc -- the **Quran & Hadith** menu will appear automatically

### Manual setup

1. Open any Google Doc
2. Go to **Extensions > Apps Script**
3. Delete any existing code in `Code.gs`, paste the contents of `Code.gs` from this project
4. Click **+** next to Files > **HTML** > name it `Sidebar` (not Sidebar.html, the extension is auto-added)
5. Paste the contents of `Sidebar.html`
6. In the Apps Script editor, go to **Project Settings** (gear icon) > check **Show "appsscript.json" manifest file in editor**
7. Open `appsscript.json` and replace its contents with the `appsscript.json` from this project
8. Click **Save**, then close the Apps Script tab
9. Reload your Google Doc -- you will see a new **Quran & Hadith** menu

## Usage

### Settings

On first use, expand the **Settings** panel at the top of the sidebar to configure:

- **Translation toggle** -- show or hide translations alongside Arabic text
- **Quran translation** -- choose from 15+ translations across multiple languages (default: Sahih International)
- **Hadith source** -- fawazahmed0 (free, no setup) or hadithapi.com (free API key required, provides hadith grading)
- **Hadith translation** -- English or Urdu (Urdu only available with hadithapi.com)
- **API key** -- if using hadithapi.com, paste your key and click **Test** to verify

Settings are saved per-user and persist across sessions.

### Sidebar (interactive)

1. Open the sidebar: **Quran & Hadith** menu > **Open Sidebar**
2. **Quran**: Enter surah number (1-114) and ayah number, click **Look Up**, preview the Arabic + translation text, then click **Insert into Doc**
3. **Hadith**: Select a collection from the dropdown, enter the hadith number, click **Look Up**, preview, then **Insert into Doc**
4. Use the Previous / Next buttons to browse ayahs or hadiths before inserting

### Inline tags (batch mode)

Type tags anywhere in your document, then use **Scan & Replace All Tags** from the menu or sidebar to replace them with formatted blocks.

- Quran: `/quran 2:255` (surah:ayah)
- Hadith: `/hadith bukhari:1` (collection:number)

## Supported Hadith Collections

**Both sources:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah

**fawazahmed0 only:** malik

**hadithapi.com only:** mishkat, musnadahmad, silsilasahiha

## Developer Setup

Use [clasp](https://github.com/google/clasp) for local development:

```bash
npm install -g @google/clasp
clasp login
clasp create --type docs --title "Quran & Hadith"
clasp push
```

Update `.clasp.json` with your Apps Script project ID after creation.

## APIs Used

- **Quran**: [Al Quran Cloud API](https://alquran.cloud/api) -- Uthmani script + configurable translations
- **Hadith (default)**: [fawazahmed0 Hadith API](https://github.com/fawazahmed0/hadith-api) via jsDelivr CDN -- free, no key required
- **Hadith (optional)**: [hadithapi.com](https://hadithapi.com) -- free API key, includes hadith grading (Sahih/Hasan/Da'eef), Urdu translations, extra collections

## License

AGPL-3.0 + Commercial dual license. AGPL for open/non-commercial use, paid commercial license for organizations. 30-day evaluation period at no cost. Contact: inquiry@nnjasec.com
