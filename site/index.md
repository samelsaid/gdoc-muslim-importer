---
layout: default
permalink: /
---

{% if site.marketplace_url and site.marketplace_url != "" %}
<a class="btn" href="{{ site.marketplace_url }}">Install from Google Workspace Marketplace</a>
{% endif %}

## What it does

Look up an ayah, hadith, or tafsir in the sidebar and insert it at your cursor. Or type tags like `/hadith bukhari:1` as you write, then replace them all at once.

Hadith comes from sunnah.com (with grades), fawazahmed0, or hadithapi.com. Tafsir comes from tafsir.app and quran.com. Pick a default and a fallback source, and color-code hadith grades.

{% if site.screenshots.size > 0 %}
## Screenshots

<div class="screens">
{% for shot in site.screenshots %}
  <img src="{{ '/assets/screenshots/' | append: shot | relative_url }}" alt="{{ site.title }} screenshot">
{% endfor %}
</div>
{% endif %}

## Your data

{{ site.title }} works only on the document you have open. It sends only the reference you ask for, not your document text. Nothing is stored on our servers. Read the [privacy policy]({{ '/privacy/' | relative_url }}) for the full details.
