# Quran & Hadith Importer -- Google Docs Add-on

Google Apps Script add-on that lets users look up and insert Quran ayahs and Hadith references directly into Google Docs, with formatted Arabic + English output.

## Features

- **Quran lookup** -- Arabic (Uthmani script) + configurable translation (15+ languages)
- **Hadith lookup** -- 20 collections across three sources with Arabic + translation text
- **Three hadith sources** -- sunnah.com (default, no setup, grades, 18 collections), fawazahmed0 (free, no key), or hadithapi.com (your own free key, Urdu)
- **Citation links** -- sunnah.com hadith insert with a reference line that links to the hadith on sunnah.com
- **Grade colors** -- choose which grades get which color, or turn coloring off, separately for the sidebar and the document
- **Replace all tags** -- replace every `/quran` and `/hadith` tag in the document, with progress and a summary of anything skipped
- **Fallback sources** -- pick a fallback hadith source and a fallback tafsir source; when your default fails, the fallback serves the request automatically (you can turn this off)
- **Tafsir** -- insert tafsir from tafsir.app (default) or quran.com; the tag picks the work, language, and source
- **Translation settings** -- toggle translations on/off, pick from curated Quran translations, choose hadith language
- **Sidebar preview** -- preview text before inserting into the document
- **Ayah navigation** -- browse previous/next ayahs with surah boundary wrapping
- **Hadith navigation** -- browse previous/next hadiths in the sidebar
- **Ayah ranges** -- look up and insert multiple consecutive ayahs (e.g., 2:255-257)
- **Inline tag scanner** -- type `/quran 2:255`, `/hadith bukhari:1`, or `/tafsir saadi 2:255` in your document and batch-replace all tags with formatted blocks

## Installation

### From Google Workspace Marketplace (recommended)

1. Open the [Quran & Hadith Importer add-on](https://workspace.google.com/marketplace) in the Google Workspace Marketplace
2. Click **Install**
3. Grant the requested permissions
4. Open any Google Doc -- the **Quran & Hadith Importer** menu appears automatically under **Extensions**

### Manual setup

1. Open any Google Doc
2. Go to **Extensions > Apps Script**
3. Delete any existing code in `Code.gs`, then paste the contents of `Code.gs` from this project
4. Click **+** next to Files > **Script** six times and create `Text`, `Http`, `Sunnah`, `Grades`, `Tags`, and `Tafsir` (the `.gs` extension is added for you); paste each file's contents
5. Click **+** next to Files > **HTML**, name it `Sidebar`, and paste the contents of `Sidebar.html`
6. In the Apps Script editor, go to **Project Settings** (gear icon) > check **Show "appsscript.json" manifest file in editor**
7. Open `appsscript.json` and replace its contents with the `appsscript.json` from this project
8. Click the project name at the top of the editor (**Untitled project** by default) and rename it to `Quran & Hadith Importer`; the menu takes this name
9. Click **Save**, then close the Apps Script tab
10. Reload your Google Doc -- you will see a new **Quran & Hadith Importer** menu under **Extensions**

sunnah.com needs NNJAsec's API key, which is set only in the published add-on. A manual copy shows fawazahmed0 and hadithapi.com only.

## Usage

### Settings

On first use, expand the **Settings** panel at the top of the sidebar to configure:

- **Translation toggle** -- show or hide translations alongside Arabic text
- **Quran translation** -- choose from 15+ translations across multiple languages (default: Sahih International)
- **Hadith source** -- sunnah.com (default, no setup, provides grading), fawazahmed0 (free, no setup), or hadithapi.com (free API key required, provides Urdu)
- **Hadith fallback** -- the source used when your default hadith source fails; on by default, and only runs for a book both sources number the same way
- **Hadith translation** -- English or Urdu (Urdu only available with hadithapi.com)
- **API key** -- if using hadithapi.com, paste your key and click **Test** to verify
- **Tafsir source and fallback** -- tafsir.app is the default with quran.com as the fallback (or the reverse); the fallback runs only when the default fails for the whole request

Settings are saved per-user and persist across sessions.

### Sidebar (interactive)

1. Open the sidebar: **Extensions > Quran & Hadith Importer > Open Sidebar**
2. **Quran**: Enter surah number (1-114) and ayah number, click **Look Up**, preview the Arabic + translation text, then click **Insert into Doc**
3. **Hadith**: Select a collection from the dropdown, enter the hadith number, click **Look Up**, preview, then **Insert into Doc**
4. Use the Previous / Next buttons to browse ayahs or hadiths before inserting

### Inline tags (batch mode)

Type tags anywhere in your document, then use **Extensions > Quran & Hadith Importer > Scan & Replace Tags**, or the sidebar's **Replace All Tags**, to replace them with formatted blocks. The sidebar's collapsible **Tag cheat sheet** (in the Inline Tag Scanner section) lists every example below with the source it resolves to.

- Quran: `/quran 2:255` (surah:ayah), or `/quran 2:255-257` for a range
- Hadith: `/hadith muslim:8a` (standard citation format: sunnah.com numbering; the letter is optional)
- A specific source's numbering: `/hadith fawaz:muslim:100` or `/hadith hadithapi:muslim:100`

The citation picks the source: a letter (8a) means sunnah.com, and a collection only one source has goes to that source. **Settings > Default source** decides only when a citation fits more than one source. fawazahmed0 numbers Bukhari, Abu Dawud, Tirmidhi, Nasa'i, and Ibn Majah the same way as sunnah.com; Sahih Muslim differs, so use `fawaz:` to cite fawazahmed0's Muslim numbers.

A prefix (`fawaz:`, `hadithapi:`, `sunnah:`) always picks that source with no fallback. Without a prefix, if your default source fails, **Settings > Fallback source** serves the tag instead, but only for a book both sources number the same way (Sahih al-Bukhari, Sunan Abi Dawud, Jami' at-Tirmidhi, Sunan an-Nasa'i, Sunan Ibn Majah for the sunnah.com/fawazahmed0 pair) and only when **Use the fallback when the default fails** is on. Otherwise the tag is skipped and the error lists other ways to cite that collection. A fallback-served result is marked "(fallback from \<source>)" in the preview's reference line; **Replace All Tags** counts fallback-served tags in its summary ("N used the fallback source.").

### Tafsir tags

- `/tafsir 2:255` -- your default book (Settings > Tafsir; Tafsir al-Sa'di unless changed)
- `/tafsir tabari 2:255` -- a named work; `/tafsir saadi 2:255-257` -- up to 10 ayahs
- `/tafsir ibn-kathir.en 2:255` -- a language edition (`.ar`, `.en`, `.ur`, ...)
- `/tafsir quran.com:saadi 2:255` -- a specific source; with a source prefix, that source's own ID also works (`/tafsir tafsir.app:aysar-altafasir 2:255`)

A work on several sources uses your default tafsir source; a work in several languages uses your default language. When your default source fails for the whole request and **Settings > Tafsir > Use the fallback when the default fails** is on, the fallback source serves it instead (if it has the same work in the same language) and the Tafsir row in the sidebar preview is marked "(fallback from \<source>)". A source prefix (`/tafsir quran.com:saadi 2:255`) always picks that source with no fallback. Full text is inserted unless you set a character limit in Settings.

The add-on paces sunnah.com and tafsir.app requests to about one per second, shared across all users, so **Replace All Tags** may pause briefly on large documents.

## Supported Hadith Collections

**sunnah.com:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, mishkat, musnadahmad (partial), adab, shamail, riyadussalihin, bulugh, hisn, virtues, thulathiyyat, nawawi, qudsi, dehlawi

**fawazahmed0:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, malik

**hadithapi.com:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, mishkat, musnadahmad, silsilasahiha

sunnah.com numbers some hadith with letters (`muslim:8a`) or as pairs (`shamail` "5, 6"). Type the number you have; the add-on finds the matching entry and tells you what it found.

## Developer Setup

Use [clasp](https://github.com/google/clasp) for local development:

```bash
npm install -g @google/clasp
clasp login
clasp create --type docs --title "Quran & Hadith Importer"
clasp push
```

Update `.clasp.json` with your Apps Script project ID after creation.

## APIs Used

- **Quran**: [Al Quran Cloud API](https://alquran.cloud/api) -- Uthmani script + configurable translations
- **Hadith (default)**: sunnah.com -- grading, 18 collections; runs on NNJAsec's key, published add-on only
- **Hadith**: [fawazahmed0 Hadith API](https://github.com/fawazahmed0/hadith-api) via jsDelivr CDN -- free, no key required
- **Hadith (optional)**: [hadithapi.com](https://hadithapi.com) -- free API key, includes hadith grading (Sahih/Hasan/Da'eef), Urdu translations, extra collections
- **Tafsir (default)**: [tafsir.app](https://tafsir.app) -- Arabic, 50+ classical works, no key
- **Tafsir (optional)**: [quran.com](https://quran.com) (`api.quran.com`) -- several languages, no key

## License

AGPL-3.0 + Commercial dual license. AGPL for open/non-commercial use, paid commercial license for organizations. 30-day evaluation period at no cost. Contact: inquiry@nnjasec.com
