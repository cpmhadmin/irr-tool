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
    gradient.addColorStop(0, 'rgba(76, 175, 80, 0.5)');
    gradient.addColorStop(1, 'rgba(76, 175, 80, 0.0)');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Projected Daily Streams',
                data: dataPoints,
                borderColor: '#4caf50',
                backgroundColor: gradient,
                borderWidth: 2, // Slightly thinner line for elegance
                pointRadius: 4, // Smaller default radius
                pointHoverRadius: 8, // Easy to grab
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4caf50',
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
                        color: '#444',
                        borderColor: '#555'
                    },
                    ticks: {
                        color: '#aaa',
                        maxTicksLimit: 8
                    }
                },
                x: {
                    grid: {
                        color: (context) => {
                            // Only show grid line if it's the first week of a month (approx)
                            // This depends on the label string we generated
                            // A simple heuristic: show every 4th grid line slightly clearer
                            if (context.index % 4 === 0) return '#444';
                            return 'transparent'; // Hide intermediate vertical lines
                        },
                        borderColor: '#555'
                    },
                    ticks: {
                        color: '#aaa',
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

    // Helper to linear interpolate between two points
    function interpolatePoints(startIdx, endIdx, startVal, endVal) {
        const steps = endIdx - startIdx;
        const valueDiff = endVal - startVal;
        const stepSize = valueDiff / steps;

        for (let i = 1; i < steps; i++) {
            const currentIdx = startIdx + i;
            // Linear interpolation
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
});
