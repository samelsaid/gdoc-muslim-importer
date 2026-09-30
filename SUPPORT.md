# Support — Quran & Hadith Importer for Google Docs

## Getting Started

1. Open any Google Doc
2. Click **Extensions** in the menu bar, then **Quran & Hadith Importer**
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

### sunnah.com

- **"sunnah.com isn't available in this copy of the add-on"** — you're running a manual copy. Use fawazahmed0 or hadithapi.com, or install the add-on from the Marketplace. A manual copy without the key falls back only per your **Fallback source** and **Use the fallback when the default fails** setting: if the fallback is off, or the pair doesn't share numbering for that book, the tag is skipped with this error instead.
- **"Not found: Sahih Muslim 8"** — sunnah.com splits some numbers (8a, 8b...). The add-on tries these automatically; if it still can't find one, check the number on sunnah.com.
- **"Not found: Musnad Ahmad ..."** — sunnah.com has about 1,359 of Musnad Ahmad's 28,199 hadith.
- **"Too many lookups"** — each user can make 60 new sunnah.com lookups a minute. The add-on paces sunnah.com and tafsir.app requests to about one per second, shared by all users of the add-on; **Replace All Tags** waits and retries instead of hitting this limit, so a large document may pause briefly rather than error. It can also appear briefly on a single lookup when many people use the add-on at once.
- **"Not found on hadithapi.com"** for Mishkat al-Masabih or Musnad Ahmad — these two collections return no data on hadithapi.com (see Known Issues below), so a plain `/hadith mishkat:1` or `/hadith musnadahmad:1` tag always routes to sunnah.com instead, even if hadithapi.com is your saved default. Use `sunnah:` to cite it explicitly, for example `/hadith sunnah:mishkat:1`.

### Fallback sources

- **"No fallback: \<source> isn't confirmed to number \<collection> the same way."** — your default source failed, and the fallback source's numbering for that book hasn't been checked against the default's, so the add-on won't risk inserting the wrong hadith. sunnah.com and fawazahmed0 share numbering for Sahih al-Bukhari, Sunan Abi Dawud, Jami' at-Tirmidhi, Sunan an-Nasa'i, and Sunan Ibn Majah only; other pairs and other books never fall back. Cite the fallback source directly with its own prefix (for example `fawaz:muslim:100`) if you want its numbering instead.
- **"The fallback (\<source>) also failed"** — both your default and fallback source failed for this lookup. Try again later, or switch sources in Settings.
- **"The fallback (\<source>) isn't available"** — the fallback source can't be used right now. This happens when sunnah.com was saved as your fallback and the add-on's sunnah.com key later became unavailable. Pick another **Fallback source** in Settings and click **Save Settings**.
- To stop the add-on from trying a fallback at all, uncheck **Use the fallback when the default fails** in Settings; a failed lookup then always shows the default source's own error.

### Tafsir

- **"Unknown tafsir"** — use a listed name, such as `saadi` or `tabari`, or name a source: `/tafsir tafsir.app:<id> 2:255`.
- **"has no ... edition"** — add a language suffix, like `.en`, to the tafsir name.
- **"has no separate entry"** — the work comments on several ayahs together. Try the previous ayah.
- **"is unavailable right now"** — use one of the sources the message lists.
- **"has N ayahs"** — check the ayah reference; you cited an ayah that doesn't exist in that surah.

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
- **Hadith source** — sunnah.com (default, no setup, provides grading), fawazahmed0 (free, no setup), or hadithapi.com (free API key, provides Urdu)
- **Hadith fallback** — the source used automatically when your default source fails, and the toggle that turns this off
- **Hadith translation** — English or Urdu (Urdu available with hadithapi.com only)
- **Tafsir source and fallback** — tafsir.app or quran.com as your default, with the other as the fallback (and its own toggle)

Settings are saved per-user and persist across sessions.

## Supported Hadith Collections

**sunnah.com:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, mishkat, musnadahmad (partial), adab, shamail, riyadussalihin, bulugh, hisn, virtues, thulathiyyat, nawawi, qudsi, dehlawi

**fawazahmed0:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, malik

**hadithapi.com:** bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, mishkat, musnadahmad, silsilasahiha

## Known Issues

- **Mishkat, Musnad Ahmad, and Al-Silsila al-Sahiha return "Hadith not found" on hadithapi.com** — these collections are listed in the hadithapi.com books catalog but currently have no hadith data available there. A plain `/hadith mishkat:...` or `/hadith musnadahmad:...` tag skips hadithapi.com and routes to sunnah.com automatically, even when hadithapi.com is your saved default (Musnad Ahmad coverage on sunnah.com is partial, too). Al-Silsila al-Sahiha isn't on sunnah.com or fawazahmed0, so it stays unavailable until hadithapi.com adds data.
- **Muwatta Malik not available on sunnah.com or hadithapi.com** — this collection is only available through the fawazahmed0 source. Switch to fawazahmed0 in Settings to access it.

## Inline Tag Format

| Type | Format | Example |
|------|--------|---------|
| Quran | `/quran surah:ayah` | `/quran 2:255` |
| Hadith | `/hadith collection:number` | `/hadith bukhari:1` |
| Tafsir | `/tafsir [book] surah:ayah` | `/tafsir saadi 2:255` |

## Contact

For bugs, feature requests, or other issues:

- **GitHub Issues:** [github.com/samelsaid/gdoc-muslim-importer/issues](https://github.com/samelsaid/gdoc-muslim-importer/issues)
- **Email:** inquiry@nnjasec.com
