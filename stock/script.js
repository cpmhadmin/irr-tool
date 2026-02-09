window.addEventListener('DOMContentLoaded', () => {

    // -- CONFIG --
    const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRa9qGmhxjHyxoTnzEX4lYEwwsb-H9asPJA_b2TPqNprUUhCkzr57gmREpTsk6mk3bZzU_Fh1vGnXVF/pub?gid=1881877576&single=true&output=csv";

    // Static Cache: This allows the dashboard to work instantly even without a server!
    const CACHED_DATA = [
        { "Artist": "Cate Le Bon", "Title": "Pompeii", "Format": "LP (Vinyl)", "UPC": "184923131512", "Catalog #": "MEX 285", "Warehouse": "MK", "On Hand": "1,666", "Veolcity": "26.6" },
        { "Artist": "The Sword", "Title": "Gods of the Earth", "Format": "LP (Vinyl)", "UPC": "184923007206", "Catalog #": "KRS 123", "Warehouse": "MK", "On Hand": "666", "Veolcity": "6.5" },
        { "Artist": "Connan Mockasin", "Title": "Jassbusters", "Format": "LP (Vinyl)", "UPC": "184923123814", "Catalog #": "MEX 265", "Warehouse": "MK", "On Hand": "647", "Veolcity": "35" },
        { "Artist": "Devendra Banhart", "Title": "Flying Wig", "Format": "LP (Vinyl)", "UPC": "634457141452", "Catalog #": "MEX 315", "Warehouse": "MK", "On Hand": "606", "Veolcity": "4.8" }
    ];

    // -- STATE --
    let rawData = [];
    let filteredData = [];
    let reportWarehouseChartInstance = null;
    let lastRenderView = [];

    // Sort state (table header click)
    const sortState = {
        key: null,        // e.g. 'artist'
        dir: 'asc'        // 'asc' | 'desc'
    };

    // -- ELEMENTS --
    const els = {
        loading: document.getElementById('loading'),
        status: document.getElementById('connection-status'),
        totalOnHand: document.getElementById('total-on-hand'),
        uniqueTitles: document.getElementById('unique-titles'),
        topArtist: document.getElementById('top-artist'),
        intelSummary: document.getElementById('intel-summary'),
        intelRatio: document.getElementById('intel-ratio'),
        intelAlerts: document.getElementById('intel-alerts'),
        tbody: document.getElementById('table-body'),
        table: document.getElementById('stock-table'),
        rowCount: document.getElementById('row-count'),
        searchInput: document.getElementById('search-input'),
        formatFilter: document.getElementById('format-filter'),
        warehouseFilter: document.getElementById('warehouse-filter'),
        resetBtn: document.getElementById('reset-btn'),
        sortableHeaders: Array.from(document.querySelectorAll('th.sortable'))
    };



    const reportEls = {
        overlay: document.getElementById('report-overlay'),
        closeBtn: document.getElementById('report-close'),
        title: document.getElementById('report-title'),
        subtitle: document.getElementById('report-subtitle'),
        kpiMatches: document.getElementById('kpi-matches'),
        kpiTotal: document.getElementById('kpi-total'),
        kpiWarehouses: document.getElementById('kpi-warehouses'),
        list: document.getElementById('report-list'),
        whChartCtx: document.getElementById('reportWarehouseChart')
    };

    // Inline report elements (always visible)
    const inlineReportEls = {
        input: document.getElementById('report-title-input'),
        datalist: document.getElementById('report-title-options'),
        artist: document.getElementById('inline-report-artist'),
        subtitle: document.getElementById('inline-report-subtitle'),
        kpiMatches: document.getElementById('inline-kpi-matches'),
        kpiTotal: document.getElementById('inline-kpi-total'),
        kpiWarehouses: document.getElementById('inline-kpi-warehouses'),
        list: document.getElementById('inline-report-list'),
        whChartCtx: document.getElementById('inlineReportWarehouseChart')
        ,
        formatFilters: document.getElementById('inline-format-filters')
    };
    let inlineReportWarehouseChartInstance = null;

    const inlineReportState = {
        baseMatches: [],
        filteredMatches: [],
        formatsSelected: new Set(),
        activeVariantKey: null
    };
    const titleLookup = {}; // displayString -> { artist, title, upc, catalog, ... }


    function openReportModal() { reportEls.overlay.style.display = 'flex'; }
    function closeReportModal() {
        reportEls.overlay.style.display = 'none';
        if (reportWarehouseChartInstance) { reportWarehouseChartInstance.destroy(); reportWarehouseChartInstance = null; }
    }


    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (reportEls.overlay.style.display !== 'none') closeReportModal();
            if (document.getElementById('guide-overlay').style.display !== 'none') {
                document.getElementById('guide-overlay').style.display = 'none';
            }
        }
    });
    reportEls.closeBtn.addEventListener('click', closeReportModal);
    reportEls.overlay.addEventListener('click', (e) => {
        if (e.target === reportEls.overlay) closeReportModal();
    });

    // User Guide Logic
    const guideOverlay = document.getElementById('guide-overlay');
    const guideBtn = document.getElementById('guide-btn');
    const guideClose = document.getElementById('guide-close');

    if (guideBtn && guideOverlay && guideClose) {
        guideBtn.addEventListener('click', () => { guideOverlay.style.display = 'flex'; });
        guideClose.addEventListener('click', () => { guideOverlay.style.display = 'none'; });
        guideOverlay.addEventListener('click', (e) => {
            if (e.target === guideOverlay) guideOverlay.style.display = 'none';
        });
    }

    // Row click -> drive the *Title Report* (same behavior as the inline module above)
    function focusTitleReportFromRow(item) {
        if (!item) return;
        // Mirror selection in the Title Report input (for user clarity)
        if (inlineReportEls && inlineReportEls.input) {
            inlineReportEls.input.value = String(item.title || '');
        }
        // Populate the same inline report module
        showInlineReport(item);

        // Bring the Title Report into view (subtle, non-jarring)
        const anchor = document.getElementById('title-report-anchor');
        if (anchor && anchor.scrollIntoView) {
            anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    els.tbody.addEventListener('click', (e) => {
        const tr = e.target.closest('tr[data-idx]');
        if (!tr) return;
        const idx = Number(tr.getAttribute('data-idx'));
        const item = lastRenderView[idx];
        if (!item) return;
        focusTitleReportFromRow(item);
    });
    // Redundant delegation (some browsers/extensions can interfere with tbody listeners)
    els.table.addEventListener('click', (e) => {
        const tr = e.target.closest('tbody tr[data-idx]');
        if (!tr) return;
        const idx = Number(tr.getAttribute('data-idx'));
        const item = lastRenderView[idx];
        if (!item) return;
        focusTitleReportFromRow(item);
    });


    // -- INIT --
    init();

    function init() {
        // Table header click sorting
        els.sortableHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const key = th.getAttribute('data-key');
                if (!key) return;

                if (sortState.key === key) {
                    // Toggle direction on second click
                    sortState.dir = (sortState.dir === 'asc') ? 'desc' : 'asc';
                } else {
                    sortState.key = key;
                    sortState.dir = 'asc';
                }

                updateSortUI();
                renderAll();
            });
        });

        // Load from cache first so it works instantly
        if (typeof CACHED_DATA !== 'undefined' && CACHED_DATA.length > 0) {
            processData(CACHED_DATA);
            els.loading.style.display = 'none'; // Show dashboard immediately
            els.status.textContent = "Updating...";
        }

        fetchCSV();

        els.searchInput.addEventListener('input', () => handleFilterChange());
        els.formatFilter.addEventListener('change', () => handleFilterChange());
        els.warehouseFilter.addEventListener('change', () => handleFilterChange());
        els.resetBtn.addEventListener('click', () => {
            els.searchInput.value = '';
            els.formatFilter.value = 'All';
            els.warehouseFilter.value = 'All';
            handleFilterChange();
        });
    }

    function updateSortUI() {
        els.sortableHeaders.forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            const key = th.getAttribute('data-key');
            if (sortState.key === key) {
                th.classList.add(sortState.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
    }

    async function fetchCSV() {
        const proxies = [
            "", // Direct
            "https://api.allorigins.win/raw?url=",
            "https://corsproxy.io/?"
        ];

        for (const proxy of proxies) {
            try {
                const url = proxy ? proxy + encodeURIComponent(CSV_URL) : CSV_URL;
                console.log(`Trying fetch: ${proxy || 'Direct'}`);
                const res = await fetch(url);
                if (!res.ok) throw new Error("Status: " + res.status);
                const text = await res.text();

                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function (results) {
                        processData(results.data);
                        els.loading.style.display = 'none';
                        els.status.textContent = "Live";
                        els.status.style.background = "rgba(79, 209, 197, 0.2)";
                        els.status.style.color = "#4fd1c5";
                    }
                });
                return; // Success
            } catch (e) {
                console.warn(`Failed with ${proxy || 'Direct'}:`, e.message);
            }
        }

        els.loading.style.display = 'none';
        els.status.textContent = "Local Only";
        console.log("Using cached/local data only.");
    }

    function normalizeKey(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/[’‘]/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeArtistKey(s) {
        return normalizeKey(s);
    }

    function normalizeTitleKey(s) {
        return normalizeKey(s)
            .replace(/[“”]/g, '"')
            .replace(/[–—]/g, '-');
    }

    function titleWords(s) {
        const t = normalizeTitleKey(s);
        return t.split(/\s+/)
            .map(w => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, ''))
            .filter(Boolean);
    }

    function pickField(row, candidates) {
        // Prefer exact candidate match, but also allow case-insensitive matches.
        for (const cand of candidates) {
            if (row[cand] != null && String(row[cand]).trim() !== '') return row[cand];
        }
        const keys = Object.keys(row || {});
        for (const cand of candidates) {
            const want = normalizeKey(cand);
            const found = keys.find(k => normalizeKey(k) === want);
            if (found && row[found] != null && String(row[found]).trim() !== '') return row[found];
        }
        return '';
    }

    function toInt(v) {
        const s = String(v || '').replace(/,/g, '').trim();
        const n = parseInt(s, 10);
        return isNaN(n) ? 0 : n;
    }

    function processData(data) {
        rawData = data.map(row => {
            // IMPORTANT: prefer the true "Artist" column, not "Artist no apost"
            const artistVal = pickField(row, ["Artist", "Artist no apost", "Artist (no apost)", "Artist (no apostrophe)", "Artist_no_apost"]);
            const titleVal = pickField(row, ["Title", "Album", "Release Title", "Product Title"]);
            const releaseVal = pickField(row, ["Release", "Release Date", "Street Date", "Street", "ReleaseDate"]);
            const formatVal = pickField(row, ["Format", "WRONG FMT - DO NOT USE", "Format (correct)"]) || "Other";
            const upcVal = pickField(row, ["UPC", "Barcode"]);
            const whseVal = pickField(row, ["Warehouse", "Whse", "WHSE"]);
            const catalogVal = pickField(row, ["Catalog #", "Catalog", "Cat #", "Cat#", "Cat No", "Catalog Number"]);
            const onHandVal = toInt(pickField(row, ["On Hand", "OnHand", "Qty", "Quantity", "Units On Hand"]));

            // New Metrics (v16)
            const velocityVal = parseFloat(pickField(row, ["Velocity", "Veolcity", "Weighted Velocity"]) || 0);
            const monthsSupplyVal = (velocityVal > 0) ? (onHandVal / velocityVal) : 999999;

            return {
                artist: artistVal || "Unknown",
                title: titleVal || "Untitled",
                format: String(formatVal).trim() || "Other",
                upc: upcVal || "",
                warehouse: whseVal || "",
                onHand: onHandVal,
                velocity: velocityVal,
                monthsSupply: monthsSupplyVal,
                catalog: catalogVal || "",
                release: String(releaseVal || '').trim()
            };
        });

        // Populate Format Filter options
        const currentSelectedFormat = els.formatFilter.value;
        els.formatFilter.innerHTML = '<option value="All">All Formats</option>';
        const formats = [...new Set(rawData.map(i => i.format))].filter(Boolean).sort((a, b) => a.localeCompare(b));
        formats.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            els.formatFilter.appendChild(opt);
        });
        els.formatFilter.value = currentSelectedFormat || 'All';

        // Populate Warehouse Filter options
        const currentSelectedWh = els.warehouseFilter.value;
        els.warehouseFilter.innerHTML = '<option value="All">All Warehouses</option>';
        const warehouses = [...new Set(rawData.map(i => i.warehouse))].filter(Boolean).sort((a, b) => a.localeCompare(b));
        warehouses.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.textContent = w;
            els.warehouseFilter.appendChild(opt);
        });
        els.warehouseFilter.value = currentSelectedWh || 'All';

        filteredData = [...rawData];

        // Default sort: On Hand DESC (most stock first)
        if (!sortState.key) {
            sortState.key = 'onHand';
            sortState.dir = 'desc';
            updateSortUI();
        }


        // Build Title Report selector options
        buildTitleSelector(rawData);

        renderAll();
    }

    function handleFilterChange() {
        const query = els.searchInput.value.toLowerCase().trim();
        const selectedFormat = els.formatFilter.value;
        const selectedWarehouse = els.warehouseFilter.value;

        filteredData = rawData.filter(item => {
            const matchesFormat = selectedFormat === 'All' || item.format === selectedFormat;
            if (!matchesFormat) return false;

            const matchesWarehouse = selectedWarehouse === 'All' || item.warehouse === selectedWarehouse;
            if (!matchesWarehouse) return false;

            if (!query) return true;

            // Search across ALL major fields
            const haystack = [
                item.artist,
                item.title,
                item.format,
                item.upc,
                item.catalog,
                item.warehouse,
                String(item.onHand)
            ].join(" ").toLowerCase();

            return haystack.includes(query);
        });

        renderAll();
    }

    function getSortedData(list) {
        if (!sortState.key) return list;

        const key = sortState.key;
        const dir = sortState.dir === 'desc' ? -1 : 1;

        const isNumeric = ['onHand', 'velocity', 'monthsSupply'].includes(key);

        const arr = [...list];
        arr.sort((a, b) => {
            const av = a[key];
            const bv = b[key];

            if (isNumeric) {
                return (Number(av) - Number(bv)) * dir;
            }

            return String(av || '').localeCompare(String(bv || ''), undefined, { sensitivity: 'base' }) * dir;
        });

        return arr;
    }

    function renderAll() {
        renderSummary();
        renderTable();
        renderInventoryIntelligence();
    }

    function renderSummary() {
        const total = filteredData.reduce((acc, item) => acc + item.onHand, 0);
        els.totalOnHand.textContent = total.toLocaleString();

        const unique = new Set(filteredData.map(i => i.title)).size;
        els.uniqueTitles.textContent = unique.toLocaleString();

        const artistVol = {};
        filteredData.forEach(i => {
            artistVol[i.artist] = (artistVol[i.artist] || 0) + i.onHand;
        });
        let topName = "–";
        let max = -1;
        for (const [name, val] of Object.entries(artistVol)) {
            if (val > max) {
                max = val;
                topName = name;
            }
        }
        els.topArtist.textContent = topName;
    }


    function parseReleaseDate(raw) {
        const s = String(raw || '').trim();
        if (!s) return null;

        // Fast path: native parse
        const d0 = new Date(s);
        if (!isNaN(d0.getTime())) return d0;

        // YYYY-MM-DD or YYYY/MM/DD
        let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (m) {
            const y = Number(m[1]), mo = Number(m[2]) - 1, da = Number(m[3]);
            const d = new Date(y, mo, da);
            return isNaN(d.getTime()) ? null : d;
        }

        // MM/DD/YYYY or M/D/YY
        m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
        if (m) {
            let y = Number(m[3]);
            if (y < 100) y += 2000;
            const mo = Number(m[1]) - 1, da = Number(m[2]);
            const d = new Date(y, mo, da);
            return isNaN(d.getTime()) ? null : d;
        }

        return null;
    }

    function monthsSince(dateObj) {
        const ms = Date.now() - dateObj.getTime();
        const days = ms / (1000 * 60 * 60 * 24);
        return days / 30.4375; // average days per month
    }

    function renderInventoryIntelligence() {
        if (!els.intelSummary || !els.intelRatio || !els.intelAlerts) return;

        // Use current filtered view so intelligence reflects what the manager is looking at
        const list = filteredData || [];
        const totalUnits = list.reduce((a, r) => a + (r.onHand || 0), 0);

        let knownUnits = 0;
        let unknownUnits = 0;
        let catalogUnits = 0;
        let frontUnits = 0;

        // Aggregate by UPC (preferred). If missing UPC, fall back to Catalog+Artist+Title+Format.
        const bySku = new Map();

        list.forEach(r => {
            const key = (r.upc && String(r.upc).trim()) ? `UPC:${String(r.upc).trim()}` : `ALT:${r.catalog}|${r.artist}|${r.title}|${r.format}`;
            const cur = bySku.get(key) || {
                artist: r.artist,
                title: r.title,
                format: r.format,
                upc: r.upc || '',
                catalog: r.catalog || '',
                releaseRaw: r.release || '',
                total: 0,
                velocity: 0
            };
            cur.total += (r.onHand || 0);
            // Assume velocity is same for the UPC across warehouses, or sum it?
            // User: "sum up stock by UPC and divide the stock on hand by the velocity"
            // If the CSV rows are per-warehouse, normally velocity is global (sales/month).
            // BUT if velocity differs per row (per warehouse velocity?), we should sum it? 
            // The example table shows velocity per UPC/Warehouse row.
            // "184923131512 ... Ochre Milton Keynes ... 26.6"
            // If there were another warehouse, it might have its own velocity.
            // So yes, we should SUM velocity to get Global Velocity.
            cur.velocity += (r.velocity || 0);

            // Keep a "best" release value if we see one
            if (!cur.releaseRaw && r.release) cur.releaseRaw = r.release;

            bySku.set(key, cur);
        });

        // Compute ratios and alerts on aggregated SKUs
        const alerts = [];
        const now = new Date();

        bySku.forEach(sku => {
            const rd = parseReleaseDate(sku.releaseRaw);
            if (!rd) {
                unknownUnits += sku.total;
                return;
            }

            const ageM = monthsSince(rd);
            knownUnits += sku.total;

            const isCatalog = ageM > 18;
            if (isCatalog) catalogUnits += sku.total;
            else frontUnits += sku.total;

            // Threshold logic
            let threshold = null;
            let rule = null;

            // 1. Critical Low Stock (New v16 Rule)
            // If supply < 3 months and we have some sales velocity
            const monthsSupply = (sku.velocity > 0) ? (sku.total / sku.velocity) : 999999;
            if (monthsSupply < 3 && sku.velocity > 0) {
                // Only flag if we actually have stock? Or even if OOS?
                // User said: "How soon will I run out?"
                // If OOS, supply is 0. So it hits this.
                rule = 'Critical: < 3mo Supply';
                // We treat this as a high priority alert, so we push it.
                alerts.push({
                    ...sku,
                    ageMonths: ageM,
                    rule,
                    total: sku.total // standard prop
                });
                return; // Stop checking other rules for this item? Or allow duplicates? 
                // For now, let's prioritize this alert and skip the "Overstock" alerts below.
            }

            // 2. Overstock / Watchlist Logic
            if (ageM > 18) {
                threshold = 500;
                rule = 'Catalog > 500';
            } else if (ageM <= 6) {
                threshold = 1000;
                rule = '≤ 6mo > 1000';
            } else if (ageM <= 12) {
                threshold = 750;
                rule = '≤ 12mo > 750';
            } else {
                // 12–18 months: still work toward 750 benchmark
                threshold = 750;
                rule = '12–18mo > 750';
            }

            if (threshold != null && sku.total > threshold) {
                alerts.push({
                    ...sku,
                    ageMonths: ageM,
                    rule,
                    threshold
                });
            }
        });

        const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;

        const catalogPct = pct(catalogUnits, knownUnits);
        const frontPct = pct(frontUnits, knownUnits);

        // Summary text
        const totalStr = totalUnits.toLocaleString();
        const unknownStr = unknownUnits ? unknownUnits.toLocaleString() : '0';
        const knownStr = knownUnits.toLocaleString();

        els.intelSummary.innerHTML =
            `Of <b>${totalStr}</b> items on hand, <b>${knownStr}</b> have a usable release date and <b>${unknownStr}</b> do not. ` +
            `Among dated inventory: <b>${catalogPct}%</b> is <b>Catalog</b> (&gt;18 months) and <b>${frontPct}%</b> is <b>Frontlist</b> (≤18 months).`;

        els.intelRatio.textContent = (knownUnits > 0)
            ? `${catalogPct}% / ${frontPct}%`
            : '—';

        // Snapshot for PDF export
        window.__intelState = {
            summaryText: (els.intelSummary.textContent || els.intelSummary.innerText || '').trim(),
            ratioText: (els.intelRatio.textContent || '').trim(),
            alerts: []
        };

        // Alerts rendering (no cutoff; ordered by highest stock)
        els.intelAlerts.innerHTML = '';
        if (alerts.length === 0) {
            const empty = document.createElement('div');
            empty.style.fontSize = '12px';
            empty.style.color = 'var(--text-muted)';
            empty.textContent = 'No high-stock items triggered the current thresholds for this view.';
            els.intelAlerts.appendChild(empty);
            return;
        }

        alerts.sort((a, b) => b.total - a.total);

        alerts.forEach(a => {
            if (window.__intelState && window.__intelState.alerts) {
                window.__intelState.alerts.push({
                    artist: a.artist, title: a.title, format: a.format, catalog: a.catalog, upc: a.upc,
                    ageMonths: a.ageMonths, rule: a.rule, total: a.total
                });
            }
            const row = document.createElement('div');
            row.className = 'report-item';
            row.style.cursor = 'default';
            row.style.opacity = '1';

            const age = (a.ageMonths != null) ? `${a.ageMonths.toFixed(1)} mo` : '—';
            const titleLine = `${a.title}  •  ${a.format}`;
            const metaLine = [
                a.artist ? `Artist: ${a.artist}` : null,
                a.catalog ? `Cat#: ${a.catalog}` : null,
                a.upc ? `UPC: ${a.upc}` : null,
                `Age: ${age}`,
                `Total: ${a.total.toLocaleString()}`
            ].filter(Boolean).join('  •  ');

            row.innerHTML = `
    <div class="report-item-head">
        <div class="report-item-left">
            <div class="report-item-name">${titleLine}</div>
            <div class="report-item-sub">
                <span class="badge ${a.rule.includes('Critical') ? 'badge-danger' : 'badge-warn'}">${a.rule}</span>
            </div>
        </div>
        <div class="report-item-qty">${a.total.toLocaleString()}</div>
    </div>
    <div class="report-item-meta">${metaLine}</div>
`;
            els.intelAlerts.appendChild(row);
        });
    }
    function renderTable() {
        els.rowCount.textContent = filteredData.length.toLocaleString();

        const view = getSortedData(filteredData);

        // Render limit for safety
        const limit = 5000;
        lastRenderView = view.slice(0, limit);

        const html = lastRenderView.map((item, idx) => {
            const shortWhse = String(item.warehouse || '')
                .replace("Ochre Milton Keynes", "Ochre MK")
                .replace("Ochre ", "");

            return `
<tr data-idx="${idx}">
<td class="col-artist">${escapeHtml(item.artist)}</td>
<td class="col-title">${escapeHtml(item.title)}</td>
<td class="col-format"><span style="opacity: 0.7; font-size: 10px; border: 1px solid #4a5568; padding: 2px 4px; border-radius: 4px; display: inline-block;">${escapeHtml(item.format)}</span></td>
<td class="col-upc">${escapeHtml(item.upc)}</td>
<td class="col-catalog">${escapeHtml(item.catalog)}</td>
<td class="col-whse">${escapeHtml(shortWhse)}</td>
<td class="col-velocity col-right">${item.velocity ? Number(item.velocity).toFixed(1) : '–'}</td>
<td class="col-supply col-right">${item.monthsSupply > 9999 ? '∞' : Number(item.monthsSupply).toFixed(1)}</td>
<td class="col-onhand col-right" style="color: #4fd1c5; font-weight: 600;">${Number(item.onHand || 0).toLocaleString()}</td>
</tr>
`;
        }).join('');

        els.tbody.innerHTML = html;
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function escapeAttr(str) {
        return String(str ?? '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function encodeKey(str) {
        try { return btoa(unescape(encodeURIComponent(String(str || '')))); } catch (e) { return ''; }
    }
    function decodeKey(str) {
        try { return decodeURIComponent(escape(atob(String(str || '')))); } catch (e) { return ''; }
    }

    function titlePrefix(title) {
        const words = titleWords(title);
        if (!words.length) return '';
        const first = String(words[0] || '').replace(/[^a-z0-9]/gi, '');
        const p = first.slice(0, 5);
        return (p || first).toLowerCase();
    }

    function groupBy(arr, keyFn) {
        const out = {};
        arr.forEach(x => {
            const k = keyFn(x);
            out[k] = out[k] || [];
            out[k].push(x);
        });
        return out;
    }


    function buildTitleSelector(data) {
        if (!inlineReportEls.datalist || !inlineReportEls.input) return;

        // Create stable display strings; include Artist and (UPC or Catalog) to disambiguate
        const options = [];
        data.forEach(r => {
            const t = String(r.title || '').trim();
            const a = String(r.artist || '').trim();
            if (!t) return;
            const idBit = String(r.upc || r.catalog || '').trim();
            const display = idBit ? `${t} — ${a} • ${idBit}` : `${t} — ${a}`;
            titleLookup[display.toLowerCase()] = r;
            options.push(display);
        });

        // De-dupe, sort
        const uniq = Array.from(new Set(options)).sort((x, y) => x.localeCompare(y));
        inlineReportEls.datalist.innerHTML = uniq.map(v => `<option value="${escapeHtml(v)}"></option>`).join('');

        // Wire input (only once)
        if (!inlineReportEls.input._wired) {
            inlineReportEls.input.addEventListener('input', () => {
                const key = String(inlineReportEls.input.value || '').toLowerCase();
                const row = titleLookup[key];
                if (row) showInlineReport(row);
            });

            // Click-to-focus inside report list (event delegation)
            if (inlineReportEls.list && !inlineReportEls.list._wired) {
                inlineReportEls.list.addEventListener('click', (e) => {
                    const rowEl = e.target && e.target.closest ? e.target.closest('.report-row') : null;
                    if (!rowEl) return;
                    const keyEnc = rowEl.getAttribute('data-key') || '';
                    const key = decodeKey(keyEnc);
                    if (!key) return;
                    inlineReportState.activeVariantKey = key;
                    updateInlineReportView();
                });
                inlineReportEls.list._wired = true;
            }

            // Format filter toggles
            if (inlineReportEls.formatFilters && !inlineReportEls.formatFilters._wired) {
                inlineReportEls.formatFilters.addEventListener('change', (e) => {
                    const cb = e.target;
                    if (!cb || cb.type !== 'checkbox') return;
                    const fmt = String(cb.getAttribute('data-format') || '');
                    if (!fmt) return;
                    if (cb.checked) inlineReportState.formatsSelected.add(fmt);
                    else inlineReportState.formatsSelected.delete(fmt);
                    // Clear active selection if it no longer exists after filtering
                    inlineReportState.activeVariantKey = null;
                    updateInlineReportView();
                });
                inlineReportEls.formatFilters._wired = true;
            }

            inlineReportEls.input._wired = true;
        }
    }


    function renderFormatFilters(formats) {
        if (!inlineReportEls.formatFilters) return;
        const uniq = Array.from(new Set(formats.filter(f => String(f || '').trim()))).sort((a, b) => a.localeCompare(b));
        if (!uniq.length) {
            inlineReportEls.formatFilters.innerHTML = '';
            return;
        }
        // Initialize selection set if empty
        if (!inlineReportState.formatsSelected || inlineReportState.formatsSelected.size === 0) {
            inlineReportState.formatsSelected = new Set(uniq);
        } else {
            // Ensure any new formats default on
            uniq.forEach(f => { if (!inlineReportState.formatsSelected.has(f)) inlineReportState.formatsSelected.add(f); });
            // Remove stale
            Array.from(inlineReportState.formatsSelected).forEach(f => { if (!uniq.includes(f)) inlineReportState.formatsSelected.delete(f); });
        }

        inlineReportEls.formatFilters.innerHTML = `
        <div class="ff-hint">Filter formats in this report:</div>
        ${uniq.map(f => {
            const checked = inlineReportState.formatsSelected.has(f) ? 'checked' : '';
            return `<label class="ff-label"><input type="checkbox" ${checked} data-format="${escapeAttr(f)}" /> ${escapeHtml(f)}</label>`;
        }).join('')}
    `;
    }

    function computeWarehouseAgg(rows) {
        const whAgg = {};
        rows.forEach(r => {
            const w = String(r.warehouse || 'Unknown')
                .replace("Ochre Milton Keynes", "Ochre MK")
                .replace("Ochre ", "");
            whAgg[w] = (whAgg[w] || 0) + (Number(r.onHand) || 0);
        });
        const labels = Object.keys(whAgg);
        const values = Object.values(whAgg);
        return { labels, values };
    }

    function updateInlineReportView() {
        const rows = inlineReportState.baseMatches || [];
        const selectedFormats = inlineReportState.formatsSelected || new Set();

        inlineReportState.filteredMatches = rows.filter(r => {
            const f = String(r.format || '—').trim() || '—';
            return selectedFormats.size === 0 ? true : selectedFormats.has(f);
        });

        const filtered = inlineReportState.filteredMatches;

        const totalStock = filtered.reduce((s, r) => s + (Number(r.onHand) || 0), 0);
        const whOverall = computeWarehouseAgg(filtered);

        // Group by variant key (title+format+catalog)
        const byVariant = groupBy(filtered, r => `${String(r.title || '')}|||${String(r.format || '')}|||${String(r.catalog || '')}`);
        const titleRows = Object.entries(byVariant)
            .map(([k, rows]) => {
                const [t, f, c] = k.split('|||');
                const sum = rows.reduce((s, r) => s + (Number(r.onHand) || 0), 0);
                const byWh = computeWarehouseAgg(rows);
                const whBits = Object.entries(Object.fromEntries(byWh.labels.map((lab, i) => [lab, byWh.values[i]])))
                    .sort((a, b) => b[1] - a[1])
                    .map(([w, v]) => `${w}: ${Number(v || 0).toLocaleString()}`)
                    .join(' • ');
                return { key: k, title: t, format: f || '—', catalog: c || '—', total: sum, whBits, wh: byWh };
            })
            .sort((a, b) => b.total - a.total);

        const uniqueVariantsCount = titleRows.length;
        inlineReportEls.kpiMatches.textContent = String(uniqueVariantsCount);
        inlineReportEls.kpiTotal.textContent = totalStock.toLocaleString();
        inlineReportEls.kpiWarehouses.textContent = String(whOverall.labels.length);

        // PDF state: Title Report snapshot
        pdfState.kpis = { matches: uniqueVariantsCount, total: totalStock, warehouses: whOverall.labels.length };
        pdfState.formatsLabel = selectedFormats.size ? Array.from(selectedFormats).join(', ') : 'All';

        // Rows for PDF (variant-level)
        pdfState.rows = titleRows.map(r => ({
            title: r.title,
            format: r.format,
            catalog: r.catalog,
            upc: (inlineReportState.baseMatches.find(x => String(x.title || '') === String(r.title || '') && String(x.format || '') === String(r.format || '') && String(x.catalog || '') === String(r.catalog || '')) || {}).upc || '',
            total: r.total,
            whBreakdown: r.whBits || '—'
        }));

        // Warehouse totals (overall, filtered)
        pdfState.warehouseOverall = { labels: whOverall.labels, values: whOverall.values };

        // Inventory Intelligence snapshot (most recent render)
        if (window.__intelState) pdfState.intel = window.__intelState;


        // Determine chart focus: active variant, else overall
        let chartLabels = whOverall.labels;
        let chartValues = whOverall.values;

        const activeKey = inlineReportState.activeVariantKey;
        let focusLabel = '';
        if (activeKey) {
            const active = titleRows.find(r => r.key === activeKey);
            if (active) {
                chartLabels = active.wh.labels;
                chartValues = active.wh.values;
                focusLabel = ` • Focus: “${active.title}”`;
            } else {
                inlineReportState.activeVariantKey = null;
            }
        }

        // Render list with active styling / fading
        inlineReportEls.list.innerHTML = titleRows.map(r => {
            const encKey = encodeKey(r.key);
            const isActive = inlineReportState.activeVariantKey === r.key;
            const faded = inlineReportState.activeVariantKey && !isActive;
            const cls = `report-row${isActive ? ' is-active' : ''}${faded ? ' is-faded' : ''}`;
            return `
        <div class="${cls}" data-key="${escapeAttr(encKey)}" title="Click to focus warehouse chart on this title">
            <div>
                <div class="title">${escapeHtml(r.title)} <span style="opacity:0.75; font-weight:500;">• ${escapeHtml(r.format)}</span></div>
                <div class="meta">Catalog: ${escapeHtml(r.catalog)}${r.whBits ? ` • ${escapeHtml(r.whBits)}` : ''}</div>
            </div>
            <div class="qty">${Number(r.total || 0).toLocaleString()}</div>
        </div>
        `;
        }).join('') || `<div style="opacity:0.75; font-size:12px;">No matches found for the current filters.</div>`;

        // Update subtitle to reflect filters/focus
        const selectedFmtLabel = selectedFormats.size ? Array.from(selectedFormats).join(', ') : 'All';
        inlineReportEls.subtitle.textContent = `${inlineReportEls.subtitle._base || ''}${focusLabel} • Formats: ${selectedFmtLabel}`;

        if (inlineReportWarehouseChartInstance) inlineReportWarehouseChartInstance.destroy();
        inlineReportWarehouseChartInstance = new Chart(inlineReportEls.whChartCtx, {
            type: 'bar',
            data: { labels: chartLabels, datasets: [{ data: chartValues }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                    x: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                    y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.06)' } }
                }
            }
        });
    }


    function showInlineReport(selected) {
        const artist = String(selected.artist || '').trim();
        const title = String(selected.title || '').trim();
        const prefix = titlePrefix(title);

        const artistLower = normalizeArtistKey(artist);
        const prefixLower = String(prefix || '').toLowerCase();

        const matches = rawData.filter(r => {
            const a = normalizeArtistKey(r.artist || '');
            const words = titleWords(r.title || '');
            // same artist AND any word in title starts with prefix (handles variants like "Cate Le Bon - Pompeii (CD)")
            const wordMatch = !!prefixLower
                ? words.some(w => String(w).replace(/[^a-z0-9]/gi, '').toLowerCase().startsWith(prefixLower))
                : normalizeTitleKey(r.title || '') === normalizeTitleKey(title);
            return a === artistLower && wordMatch;
        });

        const finalMatches = matches.length ? matches : rawData.filter(r =>
            normalizeArtistKey(r.artist || '') === artistLower &&
            normalizeTitleKey(r.title || '') === normalizeTitleKey(title)
        );

        // Base UI labels
        inlineReportEls.artist.textContent = artist || '(Unknown Artist)';

        // PDF state (selected title)
        pdfState.selected = selected;
        pdfState.artist = artist || '(Unknown Artist)';
        pdfState.title = title || '(Untitled)';
        pdfState.prefix = prefix || '';
        setPdfEnabled(true);
        inlineReportEls.subtitle._base = `Prefix match: “${prefix || '—'}” • Selected title: “${title || '—'}”`;
        inlineReportEls.subtitle.textContent = inlineReportEls.subtitle._base;

        // Store state and render filters
        inlineReportState.baseMatches = finalMatches;
        inlineReportState.activeVariantKey = null;

        const fmts = finalMatches.map(r => String(r.format || '—').trim() || '—');
        renderFormatFilters(fmts);

        // Render full view (list + KPIs + chart)
        updateInlineReportView();
    }



    // =========================
    // Executive PDF Export (Print-to-PDF)
    // =========================
    const pdfEls = {
        btn: document.getElementById('download-pdf-btn'),
        hint: document.getElementById('download-pdf-hint')
    };

    const pdfState = {
        active: false,
        selected: null,
        artist: '',
        title: '',
        prefix: '',
        formatsLabel: '',
        kpis: { matches: 0, total: 0, warehouses: 0 },
        rows: [],
        warehouseOverall: { labels: [], values: [] },
        intel: { summaryText: '', ratioText: '', alerts: [] }
    };

    function setPdfEnabled(on) {
        if (!pdfEls.btn) return;
        pdfState.active = !!on;
        pdfEls.btn.disabled = !pdfState.active;
        if (pdfEls.hint) {
            pdfEls.hint.textContent = pdfState.active
                ? 'PDF is ready — this uses your current Title Report + Inventory Intelligence view.'
                : 'Select a title to enable PDF export.';
        }
    }
    setPdfEnabled(false);

    function formatReleaseAge(releaseRaw) {
        const d = parseReleaseDate(releaseRaw);
        if (!d) return { releaseLine: 'Release Date: —', ageLine: 'On the market: —' };

        const now = new Date();
        const rd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const msPerDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((today - rd) / msPerDay);

        const releaseLine = `Release Date: ${rd.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;

        if (diffDays < 0) {
            const daysUntil = Math.abs(diffDays);
            return { releaseLine, ageLine: `Not Released Yet, ${daysUntil} day${daysUntil === 1 ? '' : 's'} until release` };
        }
        if (diffDays < 30) {
            return { releaseLine, ageLine: `${diffDays} day${diffDays === 1 ? '' : 's'} post street` };
        }
        const months = diffDays / 30.4375;
        if (months < 12) {
            return { releaseLine, ageLine: `On the market for ${months.toFixed(1)} months` };
        }
        const years = months / 12;
        return { releaseLine, ageLine: `On the market for ${years.toFixed(1)} years` };
    }

    function escapeHtmlLite(str) {
        return String(str ?? '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function buildExecutiveReportHtml() {
        const year = new Date().getFullYear();
        const logoUrl = "https://upload.wikimedia.org/wikipedia/en/9/9d/Mexican_Summer_logo.png";

        const sel = pdfState.selected || {};
        const { releaseLine, ageLine } = formatReleaseAge(sel.release || '');

        const reportTitle = "Stock Report";
        const artist = pdfState.artist || (sel.artist || '—');
        const title = pdfState.title || (sel.title || '—');

        const catAnchor = (sel.catalog || '').trim();
        const catAnchorLine = catAnchor ? `Assumed Catalog anchor: ${catAnchor}` : '';

        const kpiHtml = `
      <div class="kpis">
        <div class="kpi"><div class="k">Matched Titles</div><div class="v">${pdfState.kpis.matches}</div></div>
        <div class="kpi"><div class="k">Total Stock</div><div class="v">${Number(pdfState.kpis.total || 0).toLocaleString()}</div></div>
        <div class="kpi"><div class="k">Warehouses</div><div class="v">${pdfState.kpis.warehouses}</div></div>
      </div>
    `;

        const rowsHtml = (pdfState.rows || []).map(r => `
      <tr>
        <td>
          <div class="t">${escapeHtmlLite(r.title)}</div>
          <div class="m">${escapeHtmlLite(r.format)} • Catalog: ${escapeHtmlLite(r.catalog || '—')} • UPC: ${escapeHtmlLite(r.upc || '—')}</div>
        </td>
        <td class="right">${Number(r.total || 0).toLocaleString()}</td>
        <td>${escapeHtmlLite(r.whBreakdown || '—')}</td>
      </tr>
    `).join('') || `<tr><td colspan="3" class="muted">No matches for the current filters.</td></tr>`;

        const whRows = (pdfState.warehouseOverall.labels || []).map((lab, i) => {
            const v = (pdfState.warehouseOverall.values || [])[i] ?? 0;
            return `<tr><td>${escapeHtmlLite(lab)}</td><td class="right">${Number(v || 0).toLocaleString()}</td></tr>`;
        }).join('') || `<tr><td colspan="2" class="muted">—</td></tr>`;

        const intelSummary = escapeHtmlLite(pdfState.intel.summaryText || '—');
        const intelRatio = escapeHtmlLite(pdfState.intel.ratioText || '—');

        const intelAlerts = (pdfState.intel.alerts || []).map(a => {
            const age = (a.ageMonths != null) ? `${Number(a.ageMonths).toFixed(1)} mo` : '—';
            return `
          <tr>
            <td>
              <div class="t">${escapeHtmlLite(a.title)} <span class="muted">• ${escapeHtmlLite(a.format || '—')}</span></div>
              <div class="m">Artist: ${escapeHtmlLite(a.artist || '—')} • Cat#: ${escapeHtmlLite(a.catalog || '—')} • UPC: ${escapeHtmlLite(a.upc || '—')} • Age: ${age} • Rule: ${escapeHtmlLite(a.rule || '—')}</div>
            </td>
            <td class="right">${Number(a.total || 0).toLocaleString()}</td>
          </tr>
        `;
        }).join('') || `<tr><td colspan="2" class="muted">No high-stock items triggered thresholds for this view.</td></tr>`;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escapeHtmlLite(reportTitle)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root{ --text:#0f172a; --muted:#475569; --border:#e2e8f0; }
*{ box-sizing:border-box; }
body{ margin:0; padding:42px 56px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,sans-serif; color:var(--text); background:#fff; }
header{ display:flex; justify-content:space-between; gap:24px; align-items:flex-start; margin-bottom:26px; }
.h1{ font-size:26px; font-weight:800; margin:0; }
.sub{ margin-top:8px; font-size:14px; color:var(--muted); line-height:1.45; }
.logo img{ height:48px; opacity:0.95; }
h2{ font-size:16px; margin:22px 0 10px; padding-bottom:6px; border-bottom:1px solid var(--border); }
.kpis{ display:grid; grid-template-columns: repeat(3, minmax(140px, 1fr)); gap:14px; margin:14px 0 8px; }
.kpi{ border:1px solid var(--border); border-radius:12px; padding:12px 14px; }
.kpi .k{ font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.kpi .v{ font-size:20px; font-weight:800; margin-top:6px; }
table{ width:100%; border-collapse:collapse; font-size:13px; }
th, td{ padding:10px 8px; border-bottom:1px solid var(--border); vertical-align:top; text-align:left; }
th{ font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
.right{ text-align:right; white-space:nowrap; }
.t{ font-weight:700; }
.m{ margin-top:4px; color:var(--muted); font-size:12px; line-height:1.35; }
.muted{ color:var(--muted); }
.two-col{ display:grid; grid-template-columns: 1fr 360px; gap:18px; align-items:start; }
@media print{ body{ padding:38px 48px; } }
@media (max-width:900px){ .two-col{ grid-template-columns:1fr; } }
footer{ margin-top:42px; padding-top:18px; border-top:1px solid var(--border); text-align:center; font-size:12px; color:var(--muted); line-height:1.5; }
</style>
</head>
<body>
<header>
<div>
<div class="h1">${escapeHtmlLite(reportTitle)}</div>
<div class="sub"><b>${escapeHtmlLite(artist)}</b><br/>${escapeHtmlLite(title)}</div>
<div class="sub" style="margin-top:10px;">
  ${escapeHtmlLite(releaseLine)}<br/>
  ${escapeHtmlLite(ageLine)}${catAnchorLine ? `<br/>${escapeHtmlLite(catAnchorLine)}` : ''}
</div>
</div>
<div class="logo"><img src="${logoUrl}" alt="Mexican Summer" /></div>
</header>

<h2>Title Report Detail</h2>
${kpiHtml}

<div class="two-col">
<div>
<table>
  <thead>
    <tr><th>Matching Titles</th><th class="right">Units</th><th>Warehouses</th></tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>
</div>
<div>
<table>
  <thead>
    <tr><th>Stock by Warehouse</th><th class="right">Units</th></tr>
  </thead>
  <tbody>
    ${whRows}
  </tbody>
</table>
</div>
</div>

<h2>Inventory Intelligence</h2>
<div class="m">${intelSummary}</div>
<div class="m" style="margin-top:6px;"><b>Catalog vs Frontlist:</b> ${intelRatio}</div>

<table style="margin-top:12px;">
<thead>
<tr><th>Watchlist (High Stock)</th><th class="right">Units</th></tr>
</thead>
<tbody>
${intelAlerts}
</tbody>
</table>

<footer>
Proprietary and Confidential. For Internal Use Only.<br/>
${year} Mexican Summer, LLC
</footer>
</body>
</html>
    `;
    }

    if (pdfEls.btn) {
        pdfEls.btn.addEventListener('click', () => {
            if (!pdfState.active) return;
            const w = window.open('', '_blank');
            if (!w) { alert('Popup blocked. Please allow popups for this page to export PDF.'); return; }
            const doc = buildExecutiveReportHtml();
            w.document.open();
            w.document.write(doc);
            w.document.close();
            w.onload = () => {
                try { w.focus(); } catch (e) { }
                setTimeout(() => { try { w.print(); } catch (e) { } }, 350);
            };
        });
    }


    function showFullReport(selected) {
        const artist = String(selected.artist || '').trim();
        const title = String(selected.title || '').trim();
        const prefix = titlePrefix(title);

        const artistLower = artist.toLowerCase();
        const matches = rawData.filter(r => {
            const a = String(r.artist || '').toLowerCase();
            const t = String(r.title || '').toLowerCase();
            return a === artistLower && (!!prefix ? t.startsWith(prefix) : t === title.toLowerCase());
        });

        // If prefix match yields nothing (edge cases), fallback to exact-title
        const finalMatches = matches.length ? matches : rawData.filter(r =>
            normalizeArtistKey(r.artist || '') === artistLower &&
            normalizeTitleKey(r.title || '') === normalizeTitleKey(title)
        );

        // KPIs
        const totalStock = finalMatches.reduce((s, r) => s + (Number(r.onHand) || 0), 0);

        const whAgg = {};
        finalMatches.forEach(r => {
            const w = String(r.warehouse || 'Unknown');
            whAgg[w] = (whAgg[w] || 0) + (Number(r.onHand) || 0);
        });
        const whLabels = Object.keys(whAgg);
        const whValues = Object.values(whAgg);

        reportEls.title.textContent = artist || '(Unknown Artist)';
        reportEls.subtitle.textContent = `Prefix match: “${prefix || '—'}” • Selected title: “${title || '—'}”`;
        reportEls.kpiMatches.textContent = String(new Set(finalMatches.map(r => r.title)).size);
        reportEls.kpiTotal.textContent = totalStock.toLocaleString();
        reportEls.kpiWarehouses.textContent = String(whLabels.length);

        // List: group by Title, show totals + warehouse breakdown
        const byTitle = groupBy(finalMatches, r => String(r.title || ''));
        const titleRows = Object.entries(byTitle)
            .map(([t, rows]) => {
                const sum = rows.reduce((s, r) => s + (Number(r.onHand) || 0), 0);
                const byWh = {};
                rows.forEach(r => {
                    const w = String(r.warehouse || 'Unknown').replace("Ochre Milton Keynes", "Ochre MK").replace("Ochre ", "");
                    byWh[w] = (byWh[w] || 0) + (Number(r.onHand) || 0);
                });
                const whBits = Object.entries(byWh)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([w, v]) => `${w}: ${v.toLocaleString()}`)
                    .join(' • ');
                return { title: t, total: sum, whBits };
            })
            .sort((a, b) => b.total - a.total);

        reportEls.list.innerHTML = titleRows.map(r => `
        <div class="report-row">
            <div>
                <div class="title">${escapeHtml(r.title)}</div>
                <div class="meta">${escapeHtml(r.whBits)}</div>
            </div>
            <div class="qty">${Number(r.total || 0).toLocaleString()}</div>
        </div>
    `).join('') || `<div style="opacity:0.75; font-size:12px;">No matches found.</div>`;

        // Chart
        if (reportWarehouseChartInstance) reportWarehouseChartInstance.destroy();
        reportWarehouseChartInstance = new Chart(reportEls.whChartCtx, {
            type: 'bar',
            data: {
                labels: whLabels.map(w => w.replace("Ochre Milton Keynes", "Ochre MK").replace("Ochre ", "")),
                datasets: [{
                    data: whValues
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.06)' } },
                    y: { ticks: { color: '#a0aec0' }, grid: { color: 'rgba(255,255,255,0.06)' } }
                }
            }
        });

        openReportModal();
    }


});
