# Quran & Hadith -- Google Docs Add-on

Google Apps Script add-on that lets users look up and insert Quran ayahs and Hadith references directly into Google Docs, with formatted Arabic + English output.

## Features

- **Quran lookup** -- Arabic (Uthmani script) + English (Sahih International) side by side
- **Hadith lookup** -- 7 collections with Arabic + English text
- **Sidebar preview** -- preview text before inserting into the document
- **Ayah navigation** -- browse previous/next ayahs in the sidebar
- **Inline tag scanner** -- type `/quran 2:255` or `/hadith bukhari:1` in your document and batch-replace all tags with formatted blocks

## Installation

### From Google Workspace Marketplace (coming soon)

Once published, install with one click from the Marketplace. The add-on will be available in all your Google Docs automatically.

### Manual setup (for personal use)

1. Open any Google Doc
2. Go to **Extensions > Apps Script**
3. Delete any existing code in `Code.gs`, paste the contents of `Code.gs` from this project
4. Click **+** next to Files > **HTML** > name it `Sidebar` (not Sidebar.html, the extension is auto-added)
5. Paste the contents of `Sidebar.html`
6. Click **Save**, then close the Apps Script tab
7. Reload your Google Doc -- you will see a new **Quran & Hadith** menu

## Usage

### Sidebar (interactive)

1. Open the sidebar: **Quran & Hadith** menu > **Open Sidebar**
2. **Quran**: Enter surah number (1-114) and ayah number, click **Look Up**, preview the Arabic + English text, then click **Insert into Doc**
3. **Hadith**: Select a collection from the dropdown, enter the hadith number, click **Look Up**, preview, then **Insert into Doc**
4. Use the Previous / Next buttons to browse ayahs before inserting

### Inline tags (batch mode)

Type tags anywhere in your document, then use **Scan & Replace All Tags** from the menu or sidebar to replace them with formatted blocks.

- Quran: `/quran 2:255` (surah:ayah)
- Hadith: `/hadith bukhari:1` (collection:number)

## Supported Hadith Collections

bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, malik

## Developer Setup

Use [clasp](https://github.com/google/clasp) for local development:

```bash
npm install -g @google/clasp
clasp login
clasp create --type docs --title "Quran & Hadith"
clasp push
```

Update `.clasp.json` with your Apps Script project ID after creation.

## Publishing to Google Workspace Marketplace

1. Create a standard Google Cloud project at [console.cloud.google.com](https://console.cloud.google.com)
2. In the Apps Script editor: **Project Settings > Change project** > enter your Cloud project number
3. In Cloud Console: **APIs & Services > OAuth consent screen** > configure app name, scopes, and contact email
4. Enable **Google Workspace Marketplace SDK** in Cloud Console
5. Configure the SDK: add-on name, description, icons, version number, OAuth scopes
6. Update the `logoUrl` in `appsscript.json` with your actual hosted logo URL
7. Create a privacy policy page (required by Google)
8. Submit for review

## APIs Used

- **Quran**: [Al Quran Cloud API](https://alquran.cloud/api) -- Uthmani script + Sahih International
- **Hadith**: [fawazahmed0 Hadith API](https://github.com/fawazahmed0/hadith-api) via jsDelivr CDN

## License

AGPL-3.0 + Commercial dual license. AGPL for open/non-commercial use, paid commercial license for organizations. 30-day evaluation period at no cost. Contact: inquiry@nnjasec.com
