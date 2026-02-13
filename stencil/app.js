// Canvas setup
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');

// Set canvas size
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawGuideLines();
}

// Drawing state
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Guide line positions (as percentages of canvas height)
const guideLines = {
    worm: 0.85,    // bottom - solid thin
    grass: 0.65,   // lower normal - solid thin
    plane: 0.45,   // middle - dashed
    sky: 0.25      // top - thick solid
};

// Draw guide lines
function drawGuideLines() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(139, 119, 101, 0.15)'; // Very faint brown
    ctx.lineWidth = 1;
    
    // Worm line (bottom - solid thin)
    ctx.beginPath();
    ctx.moveTo(0, height * guideLines.worm);
    ctx.lineTo(width, height * guideLines.worm);
    ctx.stroke();
    
    // Grass line (lower normal - solid thin)
    ctx.beginPath();
    ctx.moveTo(0, height * guideLines.grass);
    ctx.lineTo(width, height * guideLines.grass);
    ctx.stroke();
    
    // Plane line (middle - dashed)
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height * guideLines.plane);
    ctx.lineTo(width, height * guideLines.plane);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Sky line (top - thick solid)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height * guideLines.sky);
    ctx.lineTo(width, height * guideLines.sky);
    ctx.stroke();
    
    ctx.restore();
}

// Get coordinates relative to canvas
function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
    };
}

// Start drawing
function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
}

// Draw
function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    lastX = coords.x;
    lastY = coords.y;
}

// Stop drawing
function stopDrawing(e) {
    if (isDrawing) {
        e.preventDefault();
    }
    isDrawing = false;
}

// Clear canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuideLines();
}

// Event listeners
// Mouse events
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Touch events (for stylus/finger)
canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', draw, { passive: false });
canvas.addEventListener('touchend', stopDrawing, { passive: false });
canvas.addEventListener('touchcancel', stopDrawing, { passive: false });

// Clear button
clearBtn.addEventListener('click', clearCanvas);

// Initialize
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);
resizeCanvas();
