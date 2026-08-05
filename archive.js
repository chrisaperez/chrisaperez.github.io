/* Shared helpers for the Creative Archive pages. Depends on PapaParse. */

/* Escape a CSV value before it goes into innerHTML. Necessary now that values
   land inside src="", href="" and alt="" attributes, not just text nodes --
   an unescaped quote breaks the attribute and a leading "<" is parsed as markup. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* Parse a CSV and hand the rows to `onRows`. Rows missing `keyField` are
   dropped, matching how every list on this site skips incomplete entries.
   `errorEl` gets a message if the fetch fails, so a dead CSV shows an error
   rather than leaving "Loading..." on screen forever. */
function loadCsv(path, keyField, onRows, errorEl) {
    Papa.parse(path, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: results => onRows(results.data.filter(r => r[keyField])),
        error: () => {
            if (errorEl) {
                errorEl.innerHTML = `<p class="empty">Could not load ${esc(path)}.</p>`;
            }
        }
    });
}

/* Ratings are frequently blank in the CSVs; only render the "N / 10" badge
   when there is actually a number to show. */
const ratingText = r => (r ?? '').toString().trim() ? `${esc(r).trim()} / 10` : '';

/* Split a semicolon-separated image list into trimmed, non-empty filenames. */
const imageList = s => String(s ?? '').split(';').map(x => x.trim()).filter(Boolean);

const has = v => Boolean((v ?? '').toString().trim());

/* Shared renderer for music.html and movies.html, which differ only in their
   CSV, image directory, creator field and artwork aspect ratio.

   Entries split into two buckets. Anything with both cover art and a rating
   goes into the gallery grid, sorted by rating. Everything else falls into a
   plain text list underneath, so the grid never looks patchy while artwork is
   still being backfilled. A tail entry is only clickable if it has a review --
   otherwise the detail page would have nothing to show. */
function renderGallery(cfg) {
    const galleryEl = document.getElementById('gallery');
    const galleryCount = document.getElementById('gallery-count');
    const tailSection = document.getElementById('tail-section');
    const tailEl = document.getElementById('tail-list');
    const tailCount = document.getElementById('tail-count');

    loadCsv(cfg.csv, 'Slug', rows => {
        const shown = rows.filter(r => has(r.Image) && has(r.Rating));
        const tail = rows.filter(r => !(has(r.Image) && has(r.Rating)));

        shown.sort((a, b) =>
            parseFloat(b.Rating) - parseFloat(a.Rating) || a.Title.localeCompare(b.Title));

        const href = r => `detail.html?type=${cfg.type}&id=${encodeURIComponent(r.Slug)}`;
        const sub = r => [r[cfg.by], r.Year].filter(has).map(esc).join(' &middot; ');

        galleryEl.innerHTML = shown.length ? shown.map(r => `
            <a class="gallery-item" href="${href(r)}">
                <img class="art${cfg.art ? ' ' + cfg.art : ''}" src="${cfg.dir}${encodeURIComponent(r.Image)}"
                     alt="${esc(r.Title)}" loading="lazy">
                <div class="gallery-title">${esc(r.Title)}</div>
                <div class="gallery-meta">${sub(r)}</div>
                <div class="gallery-rating">${ratingText(r.Rating)}</div>
            </a>
        `).join('') : `<p class="empty">${esc(cfg.emptyText)}</p>`;

        galleryCount.textContent = shown.length ? `${shown.length}` : '';

        if (!tail.length) {
            tailSection.hidden = true;
            return;
        }
        tailCount.textContent = `${tail.length}`;
        tailEl.innerHTML = tail.map(r => {
            const label = `${esc(r.Title)} <span class="by">${esc(r[cfg.by])}</span>`;
            const body = has(r.Review) ? `<a href="${href(r)}">${label}</a>` : label;
            const rating = has(r.Rating)
                ? ` <span class="tail-rating">${ratingText(r.Rating)}</span>` : '';
            return `<li>${body}${rating}</li>`;
        }).join('');
    }, galleryEl);
}
