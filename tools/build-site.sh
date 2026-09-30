#!/bin/sh
# Generates site/privacy.md, site/terms.md, and site/support.md from the
# repo-root PRIVACY.md, TERMS.md, and SUPPORT.md. Generated files are
# gitignored: the repo-root docs stay the single source of truth.
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$ROOT_DIR/site"

mkdir -p "$SITE_DIR/assets"

# args: source_basename dest_basename title permalink
build_page() {
  src="$ROOT_DIR/$1"
  dest="$SITE_DIR/$2"
  title="$3"
  permalink="$4"

  if [ ! -f "$src" ]; then
    echo "build-site.sh: missing $src" >&2
    exit 1
  fi

  {
    printf -- '---\n'
    printf 'layout: default\n'
    printf 'title: "%s"\n' "$title"
    printf 'permalink: "%s"\n' "$permalink"
    printf -- '---\n\n'
    printf '{%% raw %%}\n'
    # Drop only the first line that starts with "# " (the H1); the layout
    # already shows the title. Never drop an H2+ line.
    awk '!d && /^# /{d=1;next}1' "$src"
    printf '\n{%% endraw %%}\n'
  } > "$dest"
}

# Rewrite links that point at the repo's other .md docs to site URLs. Runs
# after the {% raw %} wrap, which is fine: {% raw %} only stops Liquid tags
# from being interpreted, not this script's own sed pass over the file.
rewrite_md_links() {
  file="$1"
  sed -i.bak -E \
    -e 's/\(PRIVACY\.md(#[^)]*)?\)/(\/privacy\/\1)/g' \
    -e 's/\(TERMS\.md(#[^)]*)?\)/(\/terms\/\1)/g' \
    -e 's/\(SUPPORT\.md(#[^)]*)?\)/(\/support\/\1)/g' \
    -e 's/\(README\.md(#[^)]*)?\)/(\/\1)/g' \
    "$file"
  rm -f "$file.bak"
}

build_page PRIVACY.md privacy.md "Privacy policy" "/privacy/"
build_page TERMS.md terms.md "Terms of service" "/terms/"
build_page SUPPORT.md support.md "Support" "/support/"

for f in "$SITE_DIR/privacy.md" "$SITE_DIR/terms.md" "$SITE_DIR/support.md"; do
  rewrite_md_links "$f"
done

cp "$ROOT_DIR/muslim_importer_icon_128.png" "$SITE_DIR/assets/muslim_importer_icon_128.png"
cp "$ROOT_DIR/muslim_importer_icon_32.png" "$SITE_DIR/assets/muslim_importer_icon_32.png"

echo "build-site.sh: generated site/privacy.md, site/terms.md, site/support.md, and copied icons"
