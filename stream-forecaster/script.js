document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('forecastChart').getContext('2d');

    // Generate labels for 52 weeks (approx 1 year)
    // Generate labels for 52 weeks (approx 1 year)
    let labels = [];
    const dataPoints = []; // Initialize data points once
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    function generateLabels(startDate) {
        const newLabels = [];
        for (let i = 0; i < 53; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (i * 7));
            // Format: "Jan 1, 2026"
            const label = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
            newLabels.push(label);
        }
        return newLabels;
    }

    // Initialize with today's date
    const today = new Date();
    labels = generateLabels(today);

    // Initialize data points with 0
    for (let i = 0; i < 53; i++) {
        dataPoints.push(0);
    }

    const initialMax = 250000;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(79, 209, 197, 0.4)');
    gradient.addColorStop(1, 'rgba(79, 209, 197, 0.0)');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Projected Daily Streams',
                data: dataPoints,
                borderColor: '#4FD1C5',
                backgroundColor: gradient,
                borderWidth: 2, // Slightly thinner line for elegance
                pointRadius: 5,
                pointHoverRadius: 9,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4FD1C5',
                pointHitRadius: 15, // Easier to grab small points
                fill: true,
                tension: 0.4, // Smooth curve
                cubicInterpolationMode: 'monotone',
                dragData: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: initialMax,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        borderColor: 'rgba(148, 163, 184, 0.2)'
                    },
                    ticks: {
                        color: '#94A3B8',
                        maxTicksLimit: 8
                    }
                },
                x: {
                    grid: {
                        color: (context) => {
                            if (context.index % 4 === 0) return 'rgba(148, 163, 184, 0.15)';
                            return 'transparent';
                        },
                        borderColor: 'rgba(148, 163, 184, 0.2)'
                    },
                    ticks: {
                        color: '#94A3B8',
                        maxTicksLimit: 13, // Show roughly 1 per month
                        maxRotation: 0
                    }
                }
            },
            plugins: {
                dragData: {
                    round: 0,
                    showTooltip: true,
                    onDragStart: function (e, element) {
                        saveHistory();
                        e.target.style.cursor = 'grabbing';
                    },
                    onDrag: function (e, datasetIndex, index, value) {
                        e.target.style.cursor = 'grabbing';
                    },
                    onDragEnd: function (e, datasetIndex, index, value) {
                        e.target.style.cursor = 'default';
                    }
                },
                legend: {
                    display: false // Hide legend to save space
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    displayColors: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 12,
                    yAlign: 'bottom',
                    caretPadding: 16,
                    callbacks: {
                        title: function (tooltipItems) {
                            return tooltipItems[0].label;
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    // State for double-click selection
    let selectionState = {
        firstIndex: null,
        secondIndex: null
    };

    // --- History / Undo-Redo State ---
    const undoStack = [];
    const redoStack = [];
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    function saveHistory() {
        // Save a deep copy of the current data
        const currentData = [...chart.data.datasets[0].data];
        undoStack.push(currentData);
        if (undoStack.length > 50) undoStack.shift(); // Limit history

        // Clear redo stack on new action
        redoStack.length = 0;
        updateHistoryButtons();
    }

    function updateHistoryButtons() {
        undoBtn.disabled = undoStack.length === 0;
        redoBtn.disabled = redoStack.length === 0;
    }

    function undo() {
        if (undoStack.length === 0) return;

        // Save current to redo stack
        redoStack.push([...chart.data.datasets[0].data]);

        // Restore from undo stack
        const previousData = undoStack.pop();
        chart.data.datasets[0].data = previousData;
        chart.update('none');
        updateHistoryButtons();
    }

    function redo() {
        if (redoStack.length === 0) return;

        // Save current to undo stack
        undoStack.push([...chart.data.datasets[0].data]);

        // Restore from redo stack
        const nextData = redoStack.pop();
        chart.data.datasets[0].data = nextData;
        chart.update('none');
        updateHistoryButtons();
    }

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        const isZ = e.key.toLowerCase() === 'z';
        const isY = e.key.toLowerCase() === 'y';
        const cmdOrCtrl = e.metaKey || e.ctrlKey;

        if (cmdOrCtrl && isZ) {
            if (e.shiftKey) redo();
            else undo();
            e.preventDefault();
        } else if (cmdOrCtrl && isY) {
            redo();
            e.preventDefault();
        }
    });

    // Handle initial state
    updateHistoryButtons();

    // Helper to linear interpolate between two points
    function interpolatePoints(startIdx, endIdx, startVal, endVal) {
        saveHistory(); // Save before applying interpolation
        const steps = endIdx - startIdx;
        const valueDiff = endVal - startVal;
        const stepSize = valueDiff / steps;

        for (let i = 1; i < steps; i++) {
            const currentIdx = startIdx + i;
            const newVal = Math.round(startVal + (stepSize * i));
            chart.data.datasets[0].data[currentIdx] = newVal;
        }
        chart.update();
    }

    // Canvas Double Click Listener
    document.getElementById('forecastChart').addEventListener('dblclick', function (event) {
        const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);

        if (points.length) {
            const index = points[0].index;
            const value = chart.data.datasets[0].data[index];

            if (selectionState.firstIndex === null) {
                // Select first point
                selectionState.firstIndex = index;
                // Visual feedback: Highlight first point
                const originalColors = chart.data.datasets[0].pointBackgroundColor;
                // If it's a string (single color), convert to array
                if (typeof originalColors === 'string') {
                    chart.data.datasets[0].pointBackgroundColor = new Array(chart.data.labels.length).fill(originalColors);
                }
                chart.data.datasets[0].pointBackgroundColor[index] = '#FF5722'; // Orange highlight
                chart.update();
                console.log(`Point ${index} selected as START`);
            } else if (selectionState.firstIndex !== null && selectionState.secondIndex === null) {
                // Select second point (must be different)
                if (index !== selectionState.firstIndex) {
                    const startIdx = Math.min(selectionState.firstIndex, index);
                    const endIdx = Math.max(selectionState.firstIndex, index);
                    const startVal = chart.data.datasets[0].data[startIdx];
                    const endVal = chart.data.datasets[0].data[endIdx];

                    console.log(`Point ${index} selected as END. Interpolating ${startIdx} to ${endIdx}...`);

                    // Perform interpolation
                    interpolatePoints(startIdx, endIdx, startVal, endVal);

                    // Reset selection visuals
                    const pointColor = '#ffffff';
                    chart.data.datasets[0].pointBackgroundColor = new Array(chart.data.labels.length).fill(pointColor);

                    // Reset state
                    selectionState.firstIndex = null;
                    selectionState.secondIndex = null;
                    chart.update();
                }
            }
        }
    });

    // Update Max Y-Axis
    document.getElementById('yAxisMax').addEventListener('change', function (e) {
        const newVal = parseInt(e.target.value);
        if (newVal && newVal > 0) {
            chart.options.scales.y.max = newVal;
            chart.update();
        }
    });
    // --- Drawing Logic ---
    console.log("%c [Stream Forecaster] Initializing Drawing Logic... ", "background: #FF5722; color: #fff");

    const overlayCanvas = document.getElementById('overlayCanvas');
    const overlayCtx = overlayCanvas.getContext('2d');
    const chartCanvas = document.getElementById('forecastChart');

    let isDrawing = false;
    let drawingPoints = [];

    // Global state for debugging
    window._drawingState = {
        get isDrawing() { return isDrawing; },
        get points() { return drawingPoints; },
        get chart() { return Chart.getChart(chartCanvas); }
    };

    function resizeOverlay() {
        const activeChart = Chart.getChart(chartCanvas);
        if (!activeChart) return;

        console.log("Resizing overlay:", activeChart.width, "x", activeChart.height);
        overlayCanvas.width = activeChart.width;
        overlayCanvas.height = activeChart.height;
        overlayCanvas.style.width = activeChart.canvas.style.width;
        overlayCanvas.style.height = activeChart.canvas.style.height;
    }

    const resizeObserver = new ResizeObserver(() => resizeOverlay());
    resizeObserver.observe(chartCanvas);
    setTimeout(resizeOverlay, 200);

    function getCanvasCoordinates(e, activeChart) {
        const rect = chartCanvas.getBoundingClientRect();
        const scaleX = activeChart.width / rect.width;
        const scaleY = activeChart.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // Capture events on window to ensure we get them even if stopped on canvas
    window.addEventListener('mousedown', function (e) {
        if (e.target !== chartCanvas && e.target !== overlayCanvas) return;

        const activeChart = Chart.getChart(chartCanvas);
        if (!activeChart) return;

        console.log("Mousedown on chart/overlay. Target:", e.target.id);

        // Strict point detection
        const points = activeChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
        if (points.length > 0) {
            console.log("Point detected, skipping drawing.");
            return;
        }

        console.log("Starting full draw sequence.");
        saveHistory(); // Save state BEFORE drawing
        isDrawing = true;
        drawingPoints = [];
        const coords = getCanvasCoordinates(e, activeChart);
        drawingPoints.push(coords);

        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.beginPath();
        overlayCtx.moveTo(coords.x, coords.y);
        overlayCtx.strokeStyle = '#4FD1C5';
        overlayCtx.lineWidth = 5;
        overlayCtx.lineCap = 'round';
        overlayCtx.lineJoin = 'round';

        chartCanvas.style.cursor = 'crosshair';

        // Prevent text selection and unwanted scrolling
        if (e.cancelable) e.preventDefault();
    }, true); // Use capture phase to be safe

    window.addEventListener('mousemove', function (e) {
        if (!isDrawing) return;

        const activeChart = Chart.getChart(chartCanvas);
        if (!activeChart) return;

        const coords = getCanvasCoordinates(e, activeChart);
        drawingPoints.push(coords);

        overlayCtx.lineTo(coords.x, coords.y);
        overlayCtx.stroke();

        if (e.cancelable) e.preventDefault();
    }, true);

    window.addEventListener('mouseup', function (e) {
        if (!isDrawing) return;
        console.log("Mouseup. Points:", drawingPoints.length);

        isDrawing = false;
        chartCanvas.style.cursor = 'default';

        applyDrawingToChart();

        setTimeout(() => {
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }, 500);
    }, true);

    // Safety: Stop drawing if mouse leaves the window
    document.addEventListener('mouseleave', () => {
        if (isDrawing) {
            isDrawing = false;
            chartCanvas.style.cursor = 'default';
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        }
    });

    function applyDrawingToChart() {
        const activeChart = Chart.getChart(chartCanvas);
        if (!activeChart) return;

        const yScale = activeChart.scales.y;
        if (drawingPoints.length < 2) return;

        drawingPoints.sort((a, b) => a.x - b.x);

        const minDrawX = drawingPoints[0].x;
        const maxDrawX = drawingPoints[drawingPoints.length - 1].x;

        const meta = activeChart.getDatasetMeta(0);
        const data = activeChart.data.datasets[0].data;
        let modified = false;

        meta.data.forEach((element, index) => {
            if (element.x >= minDrawX && element.x <= maxDrawX) {
                const drawnY = getInterpolatedY(element.x, drawingPoints);
                if (drawnY !== null) {
                    const value = yScale.getValueForPixel(drawnY);
                    data[index] = Math.max(0, Math.round(value));
                    modified = true;
                }
            }
        });

        if (modified) {
            console.log("Chart data updated from drawing.");
            activeChart.update('none');
        }
    }

    function getInterpolatedY(targetX, points) {
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            if (targetX >= p1.x && targetX <= p2.x) {
                if (Math.abs(p2.x - p1.x) < 0.1) return p1.y;
                const ratio = (targetX - p1.x) / (p2.x - p1.x);
                return p1.y + ratio * (p2.y - p1.y);
            }
        }
        return null;
    }
    // --- Table Logic ---

    // 1. Weekly Breakdown Table
    const weeklyTableBody = document.querySelector('#weeklyTable tbody');

    function updateWeeklyTable() {
        if (!weeklyTableBody) return;
        weeklyTableBody.innerHTML = '';

        const data = chart.data.datasets[0].data;
        let cumulativeTotal = 0;

        data.forEach((dailyAmount, index) => {
            const weekNum = index + 1;
            const weeklyAmount = dailyAmount * 7;
            cumulativeTotal += weeklyAmount;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${weekNum}</td>
                <td>${weeklyAmount.toLocaleString()}</td>
                <td>${cumulativeTotal.toLocaleString()}</td>
            `;
            weeklyTableBody.appendChild(row);
        });
    }

    // 2. DSP Input Table
    const dspTableBody = document.querySelector('#dspTable tbody');

    // Initial State
    // Initial State
    const dspData = [
        { name: 'Spotify', share: 60, value: 0.0035 },
        { name: 'Apple', share: 10, value: 0.007 },
        { name: 'Amazon', share: 5, value: 0.005 },
        { name: 'YouTube', share: 5, value: 0.0005 },
        { name: 'Other', share: 20, value: 0.0020, isOther: true }
    ];

    function formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    }

    function formatCurrency(num) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }

    let streamsChart = null;
    let revenueChart = null;

    function renderDSPTable() {
        if (!dspTableBody) return;
        dspTableBody.innerHTML = '';

        // Calculate Totals for Analysis
        let totalStreams = 0;
        if (chart && chart.data.datasets[0].data) {
            const data = chart.data.datasets[0].data;
            // Sum of (Daily Value * 7) for all weeks
            totalStreams = data.reduce((acc, daily) => acc + (daily * 7), 0);
        }

        // Arrays for Chart Data
        const labels = [];
        const streamsData = [];
        const revenueData = [];
        let totalRevenue = 0; // Track total revenue

        const colors = [
            '#1DB954', // Spotify Green
            '#FA243C', // Apple Red
            '#FF9900', // Amazon Orange
            '#FF0000', // YouTube Red
            '#9CA3AF', // Other Grey
            '#6366F1', '#EC4899', '#14B8A6' // Extras
        ];

        dspData.forEach((dsp, index) => {
            const row = document.createElement('tr');

            // Calculations
            const shareDecimal = dsp.share / 100;
            const dspStreams = totalStreams * shareDecimal;
            const dspRevenue = dspStreams * dsp.value;

            totalRevenue += dspRevenue; // Accumulate revenue

            // Push to Chart Data
            labels.push(dsp.name);
            streamsData.push(dspStreams);
            revenueData.push(dspRevenue);

            // Name Input (Editable for non-Other, text for Other)
            let nameCellContent;
            if (dsp.isOther) {
                nameCellContent = `<span>${dsp.name}</span>`;
            } else {
                nameCellContent = `<input type="text" class="dsp-name-input" value="${dsp.name}" data-index="${index}">`;
            }

            // Share Input
            const shareInputProps = dsp.isOther ? 'disabled' : `type="number" step="1" min="0" max="100" class="dsp-input share-input" data-index="${index}"`;

            // Value Input
            const valueInputProps = `type="number" step="0.0001" min="0" class="dsp-input value-input" data-index="${index}"`;

            row.innerHTML = `
                <td>${nameCellContent}</td>
                <td><input ${shareInputProps} value="${dsp.share}"></td>
                <td><input ${valueInputProps} value="${dsp.value}"></td>
                <td>${formatNumber(dspStreams)}</td>
                <td>${formatCurrency(dspRevenue)}</td>
            `;
            dspTableBody.appendChild(row);
        });

        // Update Footer Totals
        const totalStreamsEl = document.getElementById('totalStreams');
        const totalRevenueEl = document.getElementById('totalRevenue');
        if (totalStreamsEl) totalStreamsEl.textContent = formatNumber(totalStreams);
        if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);

        // Update Charts
        updatePieCharts(labels, streamsData, revenueData, colors);

        // Add event listeners
        document.querySelectorAll('.dsp-name-input').forEach(input => {
            input.addEventListener('change', handleNameChange);
        });
        document.querySelectorAll('.share-input').forEach(input => {
            input.addEventListener('change', handleShareChange);
        });
        document.querySelectorAll('.value-input').forEach(input => {
            input.addEventListener('change', handleValueChange);
        });
    }

    function updatePieCharts(labels, streamsData, revenueData, colors) {
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: { color: '#fff', boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            let value = context.parsed;
                            let total = context.dataset.data.reduce((a, b) => a + b, 0);
                            let percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                            if (context.chart.canvas.id === 'revenuePieChart') {
                                return `${label}: ${formatCurrency(value)} (${percentage})`;
                            }
                            return `${label}: ${formatNumber(value)} (${percentage})`;
                        }
                    }
                }
            }
        };

        // Streams Chart
        const streamsCtx = document.getElementById('streamsPieChart').getContext('2d');
        if (streamsChart) {
            streamsChart.data.labels = labels;
            streamsChart.data.datasets[0].data = streamsData;
            streamsChart.data.datasets[0].backgroundColor = colors;
            streamsChart.update();
        } else {
            streamsChart = new Chart(streamsCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: streamsData,
                        backgroundColor: colors,
                        borderWidth: 0
                    }]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        title: {
                            display: true,
                            text: 'Streaming Share',
                            color: '#fff',
                            font: { size: 14 }
                        }
                    }
                }
            });
        }

        // Revenue Chart
        const revenueCtx = document.getElementById('revenuePieChart').getContext('2d');
        if (revenueChart) {
            revenueChart.data.labels = labels;
            revenueChart.data.datasets[0].data = revenueData;
            revenueChart.data.datasets[0].backgroundColor = colors;
            revenueChart.update();
        } else {
            revenueChart = new Chart(revenueCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: revenueData,
                        backgroundColor: colors,
                        borderWidth: 0
                    }]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        title: {
                            display: true,
                            text: 'Revenue Share',
                            color: '#fff',
                            font: { size: 14 }
                        }
                    }
                }
            });
        }
    }

    function handleNameChange(e) {
        const index = parseInt(e.target.dataset.index);
        dspData[index].name = e.target.value;
        renderDSPTable(); // Re-render to update charts labels
    }

    function handleShareChange(e) {
        const index = parseInt(e.target.dataset.index);
        let newValue = parseFloat(e.target.value);

        if (isNaN(newValue)) newValue = 0;

        // Update data model
        dspData[index].share = newValue;

        // Recalculate "Other"
        const otherIndex = dspData.findIndex(d => d.isOther);
        if (otherIndex !== -1 && index !== otherIndex) {
            const totalDefinedShare = dspData.reduce((sum, d, i) => {
                return (i !== otherIndex) ? sum + (parseFloat(d.share) || 0) : sum;
            }, 0);

            const remaining = 100 - totalDefinedShare;
            dspData[otherIndex].share = parseFloat(remaining.toFixed(2));
        }

        // Re-render to update calculations and charts
        renderDSPTable();

        // Restore focus is tricky with full re-render, but necessary for chart updates.
        // For better UX, we could update DOM elements directly, but full re-render is robust.
        // Let's try to restore focus.
        const inputs = document.querySelectorAll('.share-input');
        if (inputs[index]) {
            inputs[index].focus();
        }
    }

    function handleValueChange(e) {
        const index = parseInt(e.target.dataset.index);
        let newValue = parseFloat(e.target.value);
        if (isNaN(newValue)) newValue = 0;
        dspData[index].value = newValue;
        renderDSPTable(); // Re-render to update calculations and charts

        const inputs = document.querySelectorAll('.value-input');
        if (inputs[index]) {
            inputs[index].focus();
        }
    }

    // Initialize Tables
    updateWeeklyTable();
    renderDSPTable();

    // Hook into existing updates
    const originalOnDrag = chart.options.plugins.dragData.onDrag;
    const originalOnDragEnd = chart.options.plugins.dragData.onDragEnd;

    chart.options.plugins.dragData.onDrag = function (e, datasetIndex, index, value) {
        if (originalOnDrag) originalOnDrag(e, datasetIndex, index, value);
        updateWeeklyTable();
        renderDSPTable(); // Live update during drag
    };

    chart.options.plugins.dragData.onDragEnd = function (e, datasetIndex, index, value) {
        if (originalOnDragEnd) originalOnDragEnd(e, datasetIndex, index, value);
        updateWeeklyTable();
        renderDSPTable();
    };

    // Hook into Interpolation
    // Note: The interpolatePoints function calls chart.update(), so overriding chart.update handles it.

    // Override chart.update to catch all changes (drag, interpolate, undo/redo, etc.)
    const originalChartUpdate = chart.update;
    chart.update = function (config) {
        originalChartUpdate.call(chart, config);
        updateWeeklyTable();
        renderDSPTable();
    }
    // --- Date Input Logic ---
    const announceDateInput = document.getElementById('announceDate');
    const streetDateInput = document.getElementById('streetDate');

    // Set initial values to today
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Better: If inputs are empty, set to today. If user refreshes, browser might keep values.
    if (!announceDateInput.value) announceDateInput.value = formatDateForInput(today);
    if (!streetDateInput.value) streetDateInput.value = formatDateForInput(today);

    function validateDates() {
        const announceDate = new Date(announceDateInput.value);
        const streetDate = new Date(streetDateInput.value);
        const errorMsg = document.getElementById('dateError');

        if (announceDate > streetDate) {
            announceDateInput.classList.add('input-error');
            streetDateInput.classList.add('input-error');
            errorMsg.style.display = 'block';
        } else {
            announceDateInput.classList.remove('input-error');
            streetDateInput.classList.remove('input-error');
            errorMsg.style.display = 'none';
        }
    }

    announceDateInput.addEventListener('change', function (e) {
        validateDates();
        if (!e.target.value) return;
        const newDateParts = e.target.value.split('-');
        if (newDateParts.length !== 3) return;

        // Create date using local time to avoid timezone shifts
        // Note: new Date(year, monthIndex, day)
        const newDate = new Date(parseInt(newDateParts[0]), parseInt(newDateParts[1]) - 1, parseInt(newDateParts[2]));

        const newLabels = generateLabels(newDate);

        // Update chart labels
        chart.data.labels = newLabels;
        chart.update();

        // Also update legend/tooltip callbacks if necessary (they use 'label' property which we just updated)
    });

    streetDateInput.addEventListener('change', validateDates);

    streetDateInput.addEventListener('change', validateDates);

    // Initial validation
    if (announceDateInput.value && streetDateInput.value) {
        validateDates();
    }

    // --- Typing Effect for Title ---
    const titleText = "Stream Forecaster (BETA)";
    const titleEl = document.getElementById('appTitleText');

    function startTypingTitle() {
        if (!titleEl) return;
        let i = 0;
        const minDelay = 55;
        const maxDelay = 110;

        function tick() {
            titleEl.textContent = titleText.slice(0, i++);
            if (i <= titleText.length) {
                setTimeout(tick, Math.floor(minDelay + Math.random() * (maxDelay - minDelay)));
            } else {
                // Hide cursor after 5 seconds
                setTimeout(() => {
                    const cursor = document.querySelector('.cpmh-cursor');
                    if (cursor) cursor.style.opacity = '0'; // Fade out or hide
                }, 5000);
            }
        }

        // Start after a short delay
        setTimeout(tick, 300);
    }

    startTypingTitle();

});

