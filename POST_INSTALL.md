# Quran & Hadith Importer — Installed Successfully

Jazakallahu khairan for installing Quran & Hadith Importer for Google Docs!

## Quick Start

1. Open any **Google Doc**
2. Click **Extensions** in the menu bar, then **Quran & Hadith Importer**
3. Select **Open Sidebar**

## Configure Settings (optional)

Expand the **Settings** panel at the top of the sidebar to:

- Toggle translation display on/off
- Choose your preferred Quran translation (15+ languages available)
- Switch between hadith sources (sunnah.com, fawazahmed0, or hadithapi.com) and pick a fallback source for when your default fails
- Switch between tafsir sources (tafsir.app or quran.com) and pick its fallback the same way
- Select hadith translation language (English or Urdu)

Settings are saved and persist across sessions. Fallbacks are on by default; turn either off with its **Use the fallback when the default fails** checkbox.

## Look Up & Insert

- **Quran**: Enter a surah (1-114) and ayah number, click **Look Up** to preview, then **Insert into Doc**
- **Hadith**: Pick a collection, enter a hadith number, click **Look Up** to preview, then **Insert into Doc**
- Use **Previous/Next** buttons to navigate between ayahs or hadiths

Both insert formatted blocks with Arabic text and your chosen translation.

## Inline Tags

Type tags directly in your document and replace them all at once:

```
/quran 2:255
/quran 2:255-257
/hadith bukhari:1
```

Then click **Replace All Tags** from the sidebar, or **Extensions > Quran & Hadith Importer > Scan & Replace Tags** from the menu, to convert them into formatted blocks. The sidebar's **Tag cheat sheet** (inside Inline Tag Scanner) lists more tag examples, including source prefixes like `fawaz:` and `hadithapi:`.

## Supported Collections

**Default (sunnah.com):** 18 collections, including Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Mishkat al-Masabih, and Musnad Ahmad (partial), with hadith grading

**fawazahmed0 (free, no key):** Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasai, Ibn Majah, Malik

**With hadithapi.com (your own free key):** adds Al-Silsila al-Sahiha (plus Urdu translations); Mishkat al-Masabih and Musnad Ahmad aren't available there yet, so those tags use sunnah.com automatically

## Need Help?

- **Support:** [github.com/samelsaid/gdoc-muslim-importer/blob/main/SUPPORT.md](https://github.com/samelsaid/gdoc-muslim-importer/blob/main/SUPPORT.md)
- **Email:** inquiry@nnjasec.com
