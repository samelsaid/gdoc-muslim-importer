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

### Scan & Replace not working

- Tags must follow the exact format: `/quran 2:255` or `/hadith bukhari:1`
- Make sure there are no extra spaces or formatting in the tag text
- The tag must be plain text, not inside a hyperlink or special formatting

### API errors or timeouts

- The add-on fetches text from external APIs. If you get an error, wait a moment and try again.
- If the issue persists, the API may be temporarily down.

## Supported Hadith Collections

bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah, malik

## Inline Tag Format

| Type | Format | Example |
|------|--------|---------|
| Quran | `/quran surah:ayah` | `/quran 2:255` |
| Hadith | `/hadith collection:number` | `/hadith bukhari:1` |

## Contact

For bugs, feature requests, or other issues:

- **GitHub Issues:** [github.com/samelsaid/gdoc-muslim-importer/issues](https://github.com/samelsaid/gdoc-muslim-importer/issues)
- **Email:** inquiry@nnjasec.com
