document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('forecastChart').getContext('2d');

    // Generate labels for 52 weeks (approx 1 year)
    const labels = [];
    const dataPoints = [];
    const today = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // We'll generate a point for every week (every 7 days)
    for (let i = 0; i < 53; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + (i * 7));

        // Format: "Jan 1, 2026"
        const label = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
        labels.push(label);
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
});
