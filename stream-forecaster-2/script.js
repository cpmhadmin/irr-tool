document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    const confidenceCtx = document.getElementById('confidenceChart').getContext('2d');
    const chartCanvas = document.getElementById('forecastChart');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const overlayCtx = overlayCanvas.getContext('2d');

    // EXTREMELY IMPORTANT: Overlay stays transparent to events. 
    // All events are handled by the chartCanvas or window.
    overlayCanvas.style.pointerEvents = 'none';
    chartCanvas.style.cursor = 'crosshair';

    let labels = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const undoStack = [];
    const redoStack = [];
    let selectionIndex = null;
    let isDrawing = false;
    let drawingPoints = [];

    function generateLabels(startDate) {
        const newLabels = [];
        for (let i = 0; i < 53; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (i * 7));
            newLabels.push(`${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
        }
        return newLabels;
    }

    const today = new Date();
    labels = generateLabels(today);
    const dataPoints = new Array(53).fill(0);
    const p5Points = new Array(53).fill(0);
    const p95Points = new Array(53).fill(0);

    const initialMax = 250000;
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(79, 209, 197, 0.4)');
    gradient.addColorStop(1, 'rgba(79, 209, 197, 0.0)');

    // 1. Main Forecast Chart
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Projected Daily Streams',
                data: dataPoints,
                borderColor: '#4FD1C5',
                backgroundColor: gradient,
                borderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 9,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4FD1C5',
                pointHitRadius: 15, // Large enough to grab but small enough to draw around
                fill: true,
                tension: 0.4,
                cubicInterpolationMode: 'monotone',
                dragData: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: initialMax, ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                x: { ticks: { color: '#94A3B8', maxRotation: 0, maxTicksLimit: 13 }, grid: { color: (c) => c.index % 4 === 0 ? 'rgba(148, 163, 184, 0.15)' : 'transparent' } }
            },
            plugins: {
                dragData: {
                    round: 0,
                    onDragStart: (e) => { saveHistory(); chartCanvas.style.cursor = 'grabbing'; },
                    onDrag: () => { chart.update('none'); },
                    onDragEnd: () => { chartCanvas.style.cursor = 'crosshair'; chart.update(); }
                },
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
    window.forecastChartInstance = chart; // For debugging

    // 2. Confidence Chart
    const confidenceChart = new Chart(confidenceCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'P95 (High)', data: new Array(53).fill(0), borderColor: '#4FD1C5', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false, tension: 0.4 },
                { label: 'Mean Forecast', data: new Array(53).fill(0), borderColor: '#F6AD55', borderWidth: 3, pointRadius: 0, fill: false, tension: 0.4 },
                { label: 'P5 (Low)', data: new Array(53).fill(0), borderColor: '#FCA5A5', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, fill: false, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: initialMax, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            },
            plugins: { legend: { display: true, labels: { color: '#94a3b8' } } }
        }
    });

    function saveHistory() {
        undoStack.push([...chart.data.datasets[0].data]);
        if (undoStack.length > 50) undoStack.shift();
        redoStack.length = 0;
        updateBtns();
    }

    function updateBtns() {
        const u = document.getElementById('undoBtn'), r = document.getElementById('redoBtn');
        if (u) u.disabled = undoStack.length === 0;
        if (r) r.disabled = redoStack.length === 0;
    }

    function getCoords(e) {
        const r = chartCanvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (chart.width / r.width), y: (e.clientY - r.top) * (chart.height / r.height) };
    }

    function resize() {
        overlayCanvas.width = chart.width; overlayCanvas.height = chart.height;
        overlayCanvas.style.width = chart.canvas.style.width; overlayCanvas.style.height = chart.canvas.style.height;
    }
    window.addEventListener('resize', resize);
    setTimeout(resize, 500);

    // --- INTERACTION LOGIC (Capture Phase to intercept dragData plugin) ---
    chartCanvas.addEventListener('mousedown', function (e) {
        // Check for points using Chart.js API
        const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);

        if (points.length > 0) {
            // WE HIT A POINT: Do nothing and let the dragData plugin handle it
            return;
        }

        // NO HIT: Start drawing, and STOP propagation so the plugin doesn't try to handle it
        e.stopImmediatePropagation();
        saveHistory();
        isDrawing = true;
        drawingPoints = [];
        const c = getCoords(e);
        drawingPoints.push(c);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.beginPath(); overlayCtx.moveTo(c.x, c.y);
        overlayCtx.strokeStyle = '#4FD1C5';
        overlayCtx.lineWidth = 4 * (chart.width / chartCanvas.clientWidth);
        overlayCtx.lineCap = 'round'; overlayCtx.lineJoin = 'round';
    }, true); // TRUE = CAPTURE PHASE

    window.addEventListener('mousemove', function (e) {
        if (!isDrawing) {
            // Change cursor if hovering a point
            const points = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
            chartCanvas.style.cursor = points.length > 0 ? 'pointer' : 'crosshair';
            return;
        }
        const c = getCoords(e);
        drawingPoints.push(c);
        overlayCtx.lineTo(c.x, c.y);
        overlayCtx.stroke();
    });

    window.addEventListener('mouseup', function () {
        if (!isDrawing) return;
        isDrawing = false;
        applyDrawing();
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    });

    function applyDrawing() {
        if (drawingPoints.length < 2) return;
        const yScale = chart.scales.y;
        const meta = chart.getDatasetMeta(0);
        drawingPoints.sort((a, b) => a.x - b.x);
        let mod = false;
        meta.data.forEach((p, i) => {
            for (let j = 0; j < drawingPoints.length - 1; j++) {
                const p1 = drawingPoints[j], p2 = drawingPoints[j + 1];
                if (p.x >= p1.x && p.x <= p2.x) {
                    const y = p1.y + (p.x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x);
                    chart.data.datasets[0].data[i] = Math.max(0, Math.round(yScale.getValueForPixel(y)));
                    mod = true; break;
                }
            }
        });
        if (mod) chart.update();
    }

    // Interpolation (using capture to be safe)
    chartCanvas.addEventListener('dblclick', function (e) {
        const pts = chart.getElementsAtEventForMode(e, 'nearest', { intersect: false }, false);
        if (pts.length) {
            const idx = pts[0].index;
            if (selectionIndex === null) {
                selectionIndex = idx;
                const colors = new Array(53).fill('#ffffff'); colors[idx] = '#FF5722';
                chart.data.datasets[0].pointBackgroundColor = colors;
                chart.update('none');
            } else {
                if (selectionIndex !== idx) {
                    saveHistory();
                    const s = Math.min(selectionIndex, idx), end = Math.max(selectionIndex, idx);
                    const v1 = chart.data.datasets[0].data[s], v2 = chart.data.datasets[0].data[end];
                    for (let i = 1; i < (end - s); i++) chart.data.datasets[0].data[s + i] = Math.round(v1 + (v2 - v1) * (i / (end - s)));
                }
                selectionIndex = null;
                chart.data.datasets[0].pointBackgroundColor = '#ffffff';
                chart.update();
            }
        }
    }, true);

    // --- Monte Carlo ---
    function runMonteCarlo() {
        const sims = parseInt(document.getElementById('mcSims').value) || 500;
        const sigma = (parseFloat(document.getElementById('mcSigma').value) || 20) / 100 / Math.sqrt(52);
        const base = chart.data.datasets[0].data;
        const paths = [];
        for (let s = 0; s < sims; s++) {
            const p = new Array(53); let m = 1.0;
            for (let w = 0; w < 53; w++) {
                let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random();
                m *= (1 + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
                p[w] = Math.max(0, Math.round(base[w] * m));
            }
            paths.push(p);
        }
        for (let w = 0; w < 53; w++) {
            const vals = paths.map(p => p[w]).sort((a, b) => a - b);
            p5Points[w] = vals[Math.floor(sims * 0.05)];
            p95Points[w] = vals[Math.floor(sims * 0.95)];
        }
        confidenceChart.data.datasets[0].data = [...p95Points];
        confidenceChart.data.datasets[1].data = [...base];
        confidenceChart.data.datasets[2].data = [...p5Points];
        confidenceChart.update('none');
    }

    const originalUpdate = chart.update;
    chart.update = function (config) {
        runMonteCarlo();
        originalUpdate.call(chart, config);
        updateWeeklyTable();
        renderDSPTable();
    };

    // --- Tables & DSPs ---
    const dspData = [
        { name: 'Spotify', share: 60, value: 0.0035 }, { name: 'Apple', share: 10, value: 0.007 },
        { name: 'Amazon', share: 5, value: 0.005 }, { name: 'YouTube', share: 5, value: 0.0005 },
        { name: 'Other', share: 20, value: 0.0020, isOther: true }
    ];

    function updateWeeklyTable() {
        const b = document.querySelector('#weeklyTable tbody'); if (!b) return;
        b.innerHTML = ''; let cP5 = 0, cM = 0, cP95 = 0;
        chart.data.datasets[0].data.forEach((d, i) => {
            const m = d * 7, p5 = p5Points[i] * 7, p95 = p95Points[i] * 7;
            b.innerHTML += `<tr><td>${i + 1}</td><td>${p5.toLocaleString()}</td><td>${(cP5 += p5).toLocaleString()}</td>
                <td style="color:var(--accent-teal)">${m.toLocaleString()}</td><td style="color:var(--accent-teal)">${(cM += m).toLocaleString()}</td>
                <td>${p95.toLocaleString()}</td><td>${(cP95 += p95).toLocaleString()}</td></tr>`;
        });
    }

    let sC = null, rC = null;
    function renderDSPTable() {
        const b = document.querySelector('#dspTable tbody'); if (!b) return;
        b.innerHTML = ''; const totS = chart.data.datasets[0].data.reduce((a, b) => a + b * 7, 0);
        let totR = 0; const ss = [], rs = [];
        dspData.forEach((d, i) => {
            const s = totS * (d.share / 100), r = s * d.value; totR += r; ss.push(s); rs.push(r);
            b.innerHTML += `<tr><td>${d.isOther ? d.name : `<input type="text" class="dsp-name-input" value="${d.name}" data-index="${i}">`}</td>
                <td><input type="number" class="dsp-input share-input" value="${d.share}" data-index="${i}" ${d.isOther ? 'disabled' : ''}></td>
                <td><input type="number" step="0.0001" class="dsp-input value-input" value="${d.value}" data-index="${i}"></td>
                <td>${Math.round(s).toLocaleString()}</td><td>$${r.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>`;
        });
        document.getElementById('totalStreams').textContent = Math.round(totS).toLocaleString();
        document.getElementById('totalRevenue').textContent = `$${totR.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        const cfg = (d, t) => ({ type: 'pie', data: { labels: dspData.map(x => x.name), datasets: [{ data: d, backgroundColor: ['#1DB954', '#FA243C', '#FF9900', '#FF0000', '#9CA3AF'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff' } }, title: { display: true, text: t, color: '#fff' } } } });
        if (!sC) { sC = new Chart(document.getElementById('streamsPieChart'), cfg(ss, 'Streaming Share')); rC = new Chart(document.getElementById('revenuePieChart'), cfg(rs, 'Revenue Share')); }
        else { sC.data.datasets[0].data = ss; sC.update(); rC.data.datasets[0].data = rs; rC.update(); }
    }

    document.addEventListener('change', (e) => {
        if (e.target.id === 'yAxisMax') {
            const val = parseInt(e.target.value);
            if (val > 0) {
                chart.options.scales.y.max = val;
                confidenceChart.options.scales.y.max = val;
                chart.update(); confidenceChart.update();
            }
            return;
        }
        const i = parseInt(e.target.dataset.index);
        if (e.target.classList.contains('share-input')) {
            dspData[i].share = parseFloat(e.target.value) || 0; const o = dspData.findIndex(x => x.isOther);
            dspData[o].share = 100 - dspData.reduce((s, x, idx) => idx !== o ? s + x.share : s, 0);
        } else if (e.target.classList.contains('value-input')) dspData[i].value = parseFloat(e.target.value) || 0;
        else if (e.target.classList.contains('dsp-name-input')) dspData[i].name = e.target.value;
        renderDSPTable();
    });

    renderDSPTable(); updateWeeklyTable(); chart.update();

    // Typing Title
    const title = "Stream Forecaster (BETA)", tEl = document.getElementById('appTitleText'), cur = document.querySelector('.cpmh-cursor');
    if (tEl) {
        let i = 0; const tk = () => {
            tEl.textContent = title.slice(0, i++);
            if (i <= title.length) setTimeout(tk, 70);
            else if (cur) {
                setTimeout(() => {
                    cur.style.opacity = '0';
                    setTimeout(() => { cur.style.display = 'none'; }, 1000);
                }, 3000);
            }
        }; setTimeout(tk, 300);
    }
});
