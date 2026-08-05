# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static personal website deployed via GitHub Pages at `chrisaperez.github.io` (remote: `chrisaperez/chrisaperez.github.io`). There is **no build step, no package manager, no test suite, and no dependencies installed locally** — every file in the repo root is served as-is from `main`.

## Development

```bash
python3 -m http.server 8000   # then open http://localhost:8000/index.html
```

A local server is required, not `file://` — every page except `index.html` and `nontechnical.html` fetches CSV data at runtime via XHR, which same-origin policy blocks on `file://`.

Deploy = push to `main`. GitHub Pages serves the repo root directly.

## Architecture

Two themes, deliberately opposed:

- **`index.html`** — the landing page / résumé. Neon Genesis Evangelion–inspired "NERV terminal" theme (black, orange/red, monospace, CRT scanline overlay). Fully self-contained: embeds its own CSS and JS, hardcodes all content, loads nothing from CDN. **Do not point it at `archive.css`.** Two mechanisms drive it:
  - **Scroll reveal**: `body` is `min-height: 180vh` purely so there is scroll distance. A scroll listener toggles `body.scrolled` past 50px, and CSS under `body.scrolled` cross-fades the fixed landing panel out and the fixed `#main-content` terminal in. The scroll never moves content — everything is `position: fixed`.
  - **Tabs**: `.tab-btn[data-tab]` buttons map to `.tab-pane` panels by id, with arrow-key navigation. The last sidebar item is an `<a>` to `nontechnical.html` styled as a tab, so it is deliberately excluded from `querySelectorAll('button.tab-btn')`.

- **The Creative Archive** — everything else. Light serif theme (`#fdfbf7` / Georgia), sharing `archive.css` and `archive.js`. `nontechnical.html` is a static hub of four link cards; each collection is its own page, and one detail page serves all three collections.

```
index.html
  └─ nontechnical.html ............ static hub, no JS, no CDN
       ├─ essays.html ............. essays/manifest.csv → essay.html?file=<Filename>
       │    └─ essay.html ......... PDF iframe or marked-rendered .md
       ├─ music.html ............. music.csv  ┐
       ├─ movies.html ............ movies.csv ├→ detail.html?type=<t>&id=<Slug>
       └─ food.html .............. food.csv   ┘
```

`archive.css` holds the shared palette, typography, and every card/grid/gallery class. Page-specific overrides go in a small inline `<style>` block (see `detail.html`). `archive.js` holds `esc()`, `loadCsv()`, `ratingText()`, `imageList()`, `has()`, and `renderGallery()` — the gallery renderer shared by `music.html` and `movies.html`, which differ only by config object.

External libs are loaded from CDN on the CSV-backed pages: **PapaParse** everywhere, plus **marked** on `essay.html`.

### The gallery / long-tail split

`music.html`, `movies.html`, and `food.html` all partition their rows the same way:

- **Gallery** — rows that have *both* artwork and a rating. Sorted by rating descending. Rendered as image cards linking to `detail.html`.
- **Long tail** — everything else, as a plain two-column text list underneath. A tail row links to its detail page only if it has a `Review`; otherwise it is plain text, because the detail page would have nothing to show.

This is intentional: most rows in `music.csv` are catalog entries with no review and no cover yet. The split keeps the grid looking finished while the backlog gets filled in, so **an empty gallery is the expected state for a collection whose artwork has not been added**, not a bug.

## Content is data, not markup

Adding content means editing a CSV. `Slug` is the join key between a list page and `detail.html` — it must be unique within its file, URL-safe, and stable (changing one breaks any link to it).

- `music.csv` — `Slug,Title,Artist,Year,Rating,Review,FavoriteTrack,Image`
- `movies.csv` — `Slug,Title,Director,Year,Rating,Review,FavoriteScene,Image`
- `food.csv` — `Slug,Establishment,Location,Cuisine,Rating,Review,Dishes,Images`
- `essays/manifest.csv` — `Filename,Title,Author,Class,Professor,Date`. Adding an essay means dropping the file in `essays/` **and** adding a manifest row; `Filename` is the join key.

Rules the renderers depend on:

- `Image` / `Images` holds a **bare filename**, resolved against `images/albums/`, `images/movies/`, or `images/food/`. Empty means no artwork.
- `food.csv`'s `Images` is **semicolon-separated**. The first filename is the card thumbnail; the rest appear in a photo strip on the detail page. The other two CSVs take a single filename.
- Rows missing their key field (`Slug` / `Filename`) are silently skipped, so trailing blank lines are harmless.
- Quotes inside a field must be RFC 4180 doubled (`""like this""`) — the migrated album reviews rely on this.
- Files must be **UTF-8 with LF endings**. `media.csv` historically carried a stray cp1252 byte that rendered as a replacement character; don't reintroduce one by editing in a non-UTF-8 editor.

CSV values are escaped with `esc()` before interpolation, so raw HTML in a cell now renders as literal text rather than markup. This is why `De Cora <3` displays correctly.

## Images

```
images/albums/   images/movies/   images/food/
```

Every image is committed to the repo, so **every image is permanent** — git keeps deleted binaries forever, and `.git` is already disproportionately large from earlier binary churn. Resize before committing: aim for ≤600px on the long edge and ≤150KB. macOS has `sips` built in:

```bash
sips -Z 600 -s format jpeg ~/Downloads/cover.png --out images/albums/kind-of-blue.jpg
```

Then set that filename in the row's `Image` column. Aspect ratios are enforced in CSS via `object-fit: cover`, so source images need not be pre-cropped: albums are square, movie posters `2/3` (`.art.poster`), food photos `4/3` (`.art.wide`).

## Known rough edges

- `index.html` links `assets/favicon.svg`, but the `assets/` directory does not exist in the repo — that request 404s.
- `media.csv` was split into `music.csv` + `movies.csv` and deleted. Slugs for the seven CJK-titled albums fell back to `album-<n>` because they transliterate to an empty string; rename them if better slugs are wanted, remembering that this breaks existing links.
- `Year` is empty on every migrated row — it was never in the original data and was deliberately not invented.
