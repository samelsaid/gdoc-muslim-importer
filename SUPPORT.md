# Support — Quran & Hadith for Google Docs

## Getting Started

1. Open any Google Doc
2. Click **Quran & Hadith** in the menu bar
3. Select **Open Sidebar**
4. Use the Quran or Hadith section to look up and insert text

## Common Issues

### Menu not showing

- Reload the Google Doc page
- If using manual install, make sure both `Code.gs` and `Sidebar.html` are saved in the Apps Script editor

### "No cursor found" error

- Click somewhere in your document before clicking **Insert into Doc**
- The add-on needs an active cursor position to insert text

### Hadith not found

- Not all hadith numbers exist in every collection. Try a different number or collection.
- Hadith numbers are absolute (not book-relative). For example, Sahih Bukhari hadith 1 is the first hadith in the entire collection.

### hadithapi.com errors

- **"API key required"** — open Settings in the sidebar, enter your hadithapi.com API key, and click Save
- **"Invalid API key"** — verify your key at hadithapi.com/profile, then re-enter it in Settings
- Get a free API key by registering at [hadithapi.com](https://hadithapi.com)

### Scan & Replace not working

- Tags must follow the exact format: `/quran 2:255` or `/hadith bukhari:1`
- Hyphenated collection slugs also work: `/hadith sahih-bukhari:1`
- Make sure there are no extra spaces or formatting in the tag text
- The tag must be plain text, not inside a hyperlink or special formatting

### API errors or timeouts

- The add-on fetches text from external APIs. If you get an error, wait a moment and try again.
- If the issue persists, the API may be temporarily down.
- Try switching hadith sources in Settings if one source is unavailable.

## Settings

Open the sidebar and expand the **Settings** panel at the top to configure:

- **Show translation** — toggle translations on or off (Arabic-only mode)
- **Quran translation** — choose from 15+ translations in multiple languages
- **Hadith source** — fawazahmed0 (free, no setup) or hadithapi.com (free API key, provides grading)
- **Hadith translation** — English or Urdu (Urdu available with hadithapi.com only)

Settings are saved per-user and persist across sessions.

## Supported Hadith Collections

**Both sources:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah

**fawazahmed0 only:** malik

**hadithapi.com only:** mishkat, musnadahmad, silsilasahiha

## Known Issues

- **Mishkat, Musnad Ahmad, and Al-Silsila al-Sahiha return "Hadith not found"** — these collections are listed in the hadithapi.com books catalog but currently have no hadith data available. They will work automatically when hadithapi.com populates them. In the meantime, use the other 6 collections on hadithapi.com or switch to fawazahmed0.
- **Muwatta Malik not available on hadithapi.com** — this collection is only available through the fawazahmed0 source. Switch to fawazahmed0 in Settings to access it.
- **No local test runner** — Google Apps Script has no built-in test framework. All testing is manual in Google Docs.

## Inline Tag Format

| Type | Format | Example |
|------|--------|---------|
| Quran | `/quran surah:ayah` | `/quran 2:255` |
| Hadith | `/hadith collection:number` | `/hadith bukhari:1` |

## Contact

For bugs, feature requests, or other issues:

- **GitHub Issues:** [github.com/samelsaid/gdoc-muslim-importer/issues](https://github.com/samelsaid/gdoc-muslim-importer/issues)
- **Email:** inquiry@nnjasec.com
