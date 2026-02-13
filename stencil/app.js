// Canvas setup
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const newWordBtn = document.getElementById('newWordBtn');

// Offscreen canvas for hit testing
const hitCanvas = document.createElement('canvas');
const hitCtx = hitCanvas.getContext('2d', { willReadFrequently: true });

// Game State
const GAME_STATE = {
    word: '',
    letterIndex: 0,
    isDrawing: false,
    currentStroke: [],
    fadingStrokes: [],
    currentLetterStrokes: [],
    completedLetters: [],
    totalPathLength: 0 // Total length of the letter path
};

// Simplified Vector Paths (0-1 coordinate space)
// Each letter is an array of strokes. Each stroke is an array of [x, y] points.
const LETTER_PATHS = {
    'A': [
        [[0.5, 0], [0.1, 1]],   // Left diagonal
        [[0.5, 0], [0.9, 1]],   // Right diagonal
        [[0.25, 0.6], [0.75, 0.6]] // Crossbar
    ],
    'B': [
        [[0.1, 0], [0.1, 1]],   // Spine
        [[0.1, 0], [0.6, 0], [0.8, 0.15], [0.6, 0.5], [0.1, 0.5]], // Top loop
        [[0.1, 0.5], [0.6, 0.5], [0.9, 0.75], [0.6, 1], [0.1, 1]]  // Bottom loop
    ],
    'C': [
        [[0.8, 0.2], [0.5, 0], [0.1, 0.5], [0.5, 1], [0.8, 0.8]] // Curve
    ],
    'F': [
        [[0.1, 0], [0.1, 1]],   // Spine
        [[0.1, 0], [0.8, 0]],   // Top bar
        [[0.1, 0.5], [0.6, 0.5]] // Middle bar
    ],
    'O': [
        // simplified circle as 8 points
        [[0.5, 0], [0.2, 0.1], [0, 0.5], [0.2, 0.9], [0.5, 1], [0.8, 0.9], [1, 0.5], [0.8, 0.1], [0.5, 0]]
    ],
    'X': [
        [[0.1, 0], [0.9, 1]],   // Diagonal 1
        [[0.9, 0], [0.1, 1]]    // Diagonal 2
    ],
    'T': [
        [[0.5, 0], [0.5, 1]],   // Spine
        [[0.1, 0], [0.9, 0]]    // Top bar
    ],
    'H': [
        [[0.1, 0], [0.1, 1]],   // Left leg
        [[0.9, 0], [0.9, 1]],   // Right leg
        [[0.1, 0.5], [0.9, 0.5]] // Crossbar
    ],
    'P': [
        [[0.1, 0], [0.1, 1]],   // Spine
        [[0.1, 0], [0.7, 0], [0.9, 0.25], [0.7, 0.5], [0.1, 0.5]] // Loop
    ],
    'R': [
        [[0.1, 0], [0.1, 1]], // Spine
        [[0.1, 0], [0.7, 0], [0.9, 0.25], [0.7, 0.5], [0.1, 0.5]], // Top Loop
        [[0.4, 0.5], [0.9, 1]] // Leg
    ],
    'M': [
        [[0.1, 1], [0.1, 0]], // Left leg up
        [[0.1, 0], [0.5, 0.6]], // Mid down
        [[0.5, 0.6], [0.9, 0]], // Mid up
        [[0.9, 0], [0.9, 1]] // Right leg down
    ],
    'S': [
        [[0.8, 0.1], [0.5, 0], [0.2, 0.1], [0.1, 0.3], [0.5, 0.5], [0.9, 0.7], [0.8, 0.9], [0.5, 1], [0.2, 0.9]]
    ]
    // Add more as needed
};

// Words that only use defined letters
const VALID_WORDS = [
    'FOX', 'BOX', 'CAT', 'BAT', 'HAT', 'FAT', 'SAT', 'RAT', 'MAT', 'PAT', 'TAP', 'MAP', 'HOT', 'POT', 'TOP', 'POP', 'HOP', 'MOP', 'COT', 'TOT', 'ROT', 'LOT', 'BOT'
].filter(w => w.split('').every(c => LETTER_PATHS[c])); // Safety filter

// Configuration
const CONFIG = {
    visualStrokeWidth: 4,      // Thin lines for the letter skeleton
    hitToleranceWidth: 55,     // Very wide invisible stroke for checking accuracy (The Halo)

    // COMPLETION LOGIC:
    // We check how much of the (wide) path area is painted.
    // Since the path is wide, filling it roughly is easier.
    completionThreshold: 0.65, // Needs to cover 65% of the "wide" tolerance zone area

    accuracyThreshold: 0.1, // Not used directly in new logic, implicit in hitToleranceWidth

    fadeSpeed: 0.08,
    guideColor: 'rgba(139, 119, 101, 0.15)',

    // Layout
    letterSize: 0,
    baseline: 0,
    startX: 0,
    letterPadding: 30
};

const GUIDES = {
    worm: 0.85,
    grass: 0.65,
    plane: 0.45,
    sky: 0.25
};

function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawStroke);
    canvas.addEventListener('mouseup', endDrawing);
    canvas.addEventListener('mouseout', endDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawStroke, { passive: false });
    canvas.addEventListener('touchend', endDrawing, { passive: false });
    canvas.addEventListener('touchcancel', endDrawing, { passive: false });

    clearBtn.addEventListener('click', resetWord);
    newWordBtn.addEventListener('click', startNewWord);

    startNewWord();
    requestAnimationFrame(gameLoop);
}

function startNewWord() {
    let newWord = GAME_STATE.word;
    while (newWord === GAME_STATE.word) {
        newWord = VALID_WORDS[Math.floor(Math.random() * VALID_WORDS.length)];
    }
    GAME_STATE.word = newWord;
    GAME_STATE.letterIndex = 0;

    resetForNewLetter();
    calculateLayout();
}

function resetForNewLetter() {
    GAME_STATE.fadingStrokes = [];
    GAME_STATE.currentStroke = [];
    GAME_STATE.currentLetterStrokes = [];

    if (GAME_STATE.letterIndex === 0) {
        GAME_STATE.completedLetters = new Array(GAME_STATE.word.length).fill(false);
    }

    calculateTargetArea();
}

function resetWord() {
    startNewWord(); // Just pick a new one or restart
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    hitCanvas.width = canvas.width;
    hitCanvas.height = canvas.height;

    calculateLayout();
}

function calculateLayout() {
    const rect = canvas.getBoundingClientRect();
    const canvasHeight = rect.height;

    // Logic coordinates
    const top = GUIDES.sky * canvasHeight;
    const bottom = GUIDES.grass * canvasHeight;
    const h = bottom - top;

    CONFIG.letterSize = h; // Height of capital letter
    CONFIG.baseline = top;

    // Calculate total width
    const w = CONFIG.letterSize * 0.7; // Aspect ratio approx
    const totalW = (w + CONFIG.letterPadding) * GAME_STATE.word.length - CONFIG.letterPadding;

    CONFIG.startX = (rect.width - totalW) / 2;

    calculateTargetArea();
}

function calculateTargetArea() {
    if (GAME_STATE.letterIndex >= GAME_STATE.word.length) return;

    const letter = GAME_STATE.word[GAME_STATE.letterIndex];
    const path = LETTER_PATHS[letter];
    if (!path) return;

    const dpr = window.devicePixelRatio || 1;
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
    hitCtx.save();
    hitCtx.scale(dpr, dpr);

    const x = getLetterX(GAME_STATE.letterIndex);
    const y = CONFIG.baseline;
    const s = CONFIG.letterSize;
    const w = s * 0.7;

    // Draw the "Ideal" wide path (The Target Area)
    hitCtx.lineCap = 'round';
    hitCtx.lineJoin = 'round';
    hitCtx.lineWidth = CONFIG.hitToleranceWidth;
    hitCtx.strokeStyle = 'red';

    hitCtx.beginPath();
    path.forEach(stroke => {
        hitCtx.moveTo(x + stroke[0][0] * w, y + stroke[0][1] * s);
        for (let i = 1; i < stroke.length; i++) {
            hitCtx.lineTo(x + stroke[i][0] * w, y + stroke[i][1] * s);
        }
    });
    hitCtx.stroke();
    hitCtx.restore();

    // Count pixels
    const pixelData = hitCtx.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;
    let count = 0;
    for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 20) count++;
    }
    GAME_STATE.totalLetterPixels = count;
}

function getLetterX(index) {
    const w = CONFIG.letterSize * 0.7;
    return CONFIG.startX + index * (w + CONFIG.letterPadding);
}

// Rendering
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    drawGuideLines();
    drawWordPaths();
    drawCurrentLetterStrokes();
    drawFadingStrokes();
    drawCurrentStroke();

    requestAnimationFrame(gameLoop);
}

function drawGuideLines() {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = CONFIG.guideColor;

    [GUIDES.sky, GUIDES.grass, GUIDES.worm].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, height * y);
        ctx.lineTo(width, height * y);
        ctx.stroke();
    });

    // Plane (dashed)
    ctx.beginPath();
    ctx.setLineDash([8, 8]);
    ctx.moveTo(0, height * GUIDES.plane);
    ctx.lineTo(width, height * GUIDES.plane);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
}

function drawWordPaths() {
    if (!GAME_STATE.word) return;

    const s = CONFIG.letterSize;
    const w = s * 0.7;

    for (let i = 0; i < GAME_STATE.word.length; i++) {
        if (GAME_STATE.completedLetters[i]) {
            ctx.strokeStyle = '#2c3e50'; // Completed
            ctx.lineWidth = CONFIG.visualStrokeWidth + 1; // Slightly bolder
        } else if (i === GAME_STATE.letterIndex) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'; // Active Target (Grey)
            ctx.lineWidth = CONFIG.visualStrokeWidth;
        } else {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'; // Inactive (Faint)
            ctx.lineWidth = CONFIG.visualStrokeWidth;
        }

        const letter = GAME_STATE.word[i];
        const path = LETTER_PATHS[letter];
        if (!path) continue;

        const lx = getLetterX(i);
        const ly = CONFIG.baseline;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        path.forEach(stroke => {
            ctx.moveTo(lx + stroke[0][0] * w, ly + stroke[0][1] * s);
            for (let k = 1; k < stroke.length; k++) {
                ctx.lineTo(lx + stroke[k][0] * w, ly + stroke[k][1] * s);
            }
        });
        ctx.stroke();
    }
}

function drawCurrentLetterStrokes() {
    if (GAME_STATE.currentLetterStrokes.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = CONFIG.visualStrokeWidth + 2; // Ink slightly thicker than template
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let stroke of GAME_STATE.currentLetterStrokes) {
        if (stroke.length === 0) continue;
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
}

function drawCurrentStroke() {
    if (GAME_STATE.currentStroke.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = CONFIG.visualStrokeWidth + 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = GAME_STATE.currentStroke;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
}

function drawFadingStrokes() {
    for (let i = GAME_STATE.fadingStrokes.length - 1; i >= 0; i--) {
        const item = GAME_STATE.fadingStrokes[i];
        item.opacity -= CONFIG.fadeSpeed;

        if (item.opacity <= 0) {
            GAME_STATE.fadingStrokes.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        ctx.strokeStyle = `rgba(200, 80, 80, ${item.opacity})`;
        ctx.lineWidth = CONFIG.visualStrokeWidth + 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const points = item.points;
        if (points.length > 0) {
            ctx.moveTo(points[0].x, points[0].y);
            for (let j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
        }
    }
}

// Interactions
function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDrawing(e) {
    e.preventDefault();
    if (GAME_STATE.letterIndex >= GAME_STATE.word.length) return;

    GAME_STATE.isDrawing = true;
    GAME_STATE.currentStroke = [];
    GAME_STATE.currentStroke.push(getCoords(e));
}

function drawStroke(e) {
    if (!GAME_STATE.isDrawing) return;
    e.preventDefault();
    GAME_STATE.currentStroke.push(getCoords(e));
}

function endDrawing(e) {
    if (!GAME_STATE.isDrawing) return;
    e.preventDefault();
    GAME_STATE.isDrawing = false;
    validateStroke();
}

function validateStroke() {
    const points = GAME_STATE.currentStroke;
    if (points.length < 5) return;

    const dpr = window.devicePixelRatio || 1;

    const letter = GAME_STATE.word[GAME_STATE.letterIndex];
    if (!letter || !LETTER_PATHS[letter]) return;

    const path = LETTER_PATHS[letter];
    const lx = getLetterX(GAME_STATE.letterIndex);
    const ly = CONFIG.baseline;
    const s = CONFIG.letterSize;
    const w = s * 0.7;

    // 1. Is the stroke inside the Halo?
    // We check this by drawing the halo on hitCanvas and checking overlap
    // Re-draw halo just to be safe
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.lineCap = 'round';
    hitCtx.lineJoin = 'round';
    hitCtx.lineWidth = CONFIG.hitToleranceWidth;
    hitCtx.strokeStyle = 'red';

    hitCtx.beginPath();
    path.forEach(stroke => {
        hitCtx.moveTo(lx + stroke[0][0] * w, ly + stroke[0][1] * s);
        for (let k = 1; k < stroke.length; k++) {
            hitCtx.lineTo(lx + stroke[k][0] * w, ly + stroke[k][1] * s);
        }
    });
    hitCtx.stroke();
    hitCtx.restore();

    // Check points
    let hits = 0;
    let total = 0;
    const sample = 3;
    for (let i = 0; i < points.length; i += sample) {
        const px = Math.floor(points[i].x * dpr);
        const py = Math.floor(points[i].y * dpr);
        if (px >= 0 && py >= 0 && px < hitCanvas.width && py < hitCanvas.height) {
            const alpha = hitCtx.getImageData(px, py, 1, 1).data[3];
            if (alpha > 50) hits++;
            total++;
        }
    }

    const accuracy = total > 0 ? hits / total : 0;

    if (accuracy < 0.6) { // Must keep 60% of stroke inside the halo
        GAME_STATE.fadingStrokes.push({ points: [...points], opacity: 1.0 });
        GAME_STATE.currentStroke = [];
        return;
    }

    // Stroke is valid! Keep it.
    GAME_STATE.currentLetterStrokes.push([...points]);
    GAME_STATE.currentStroke = [];

    checkCoverage();
}

function checkCoverage() {
    const dpr = window.devicePixelRatio || 1;

    // 1. Draw Halo (Red)
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
    hitCtx.save();
    hitCtx.scale(dpr, dpr);

    const letter = GAME_STATE.word[GAME_STATE.letterIndex];
    const path = LETTER_PATHS[letter];
    const lx = getLetterX(GAME_STATE.letterIndex);
    const ly = CONFIG.baseline;
    const s = CONFIG.letterSize;
    const w = s * 0.7;

    hitCtx.lineCap = 'round';
    hitCtx.lineJoin = 'round';
    hitCtx.lineWidth = CONFIG.hitToleranceWidth;
    hitCtx.strokeStyle = 'red';

    hitCtx.beginPath();
    path.forEach(stroke => {
        hitCtx.moveTo(lx + stroke[0][0] * w, ly + stroke[0][1] * s);
        for (let k = 1; k < stroke.length; k++) hitCtx.lineTo(lx + stroke[k][0] * w, ly + stroke[k][1] * s);
    });
    hitCtx.stroke();
    hitCtx.restore();

    // 2. Draw User Strokes (Blue) with composite 'source-in'
    // This leaves only blue where it overlaps red
    hitCtx.globalCompositeOperation = 'source-in';
    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.strokeStyle = 'blue';
    // IMPORTANT: The user's painting brush for coverage should be roughly same size as halo?
    // No, smaller than halo, but big enough to fill it if they trace center.
    // If halo is 55, user brush should be ~35-40 to make it "fillable".
    hitCtx.lineWidth = CONFIG.hitToleranceWidth * 0.8;
    hitCtx.lineCap = 'round';
    hitCtx.lineJoin = 'round';

    hitCtx.beginPath();
    for (let stroke of GAME_STATE.currentLetterStrokes) {
        if (stroke.length === 0) continue;
        hitCtx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) hitCtx.lineTo(stroke[i].x, stroke[i].y);
    }
    hitCtx.stroke();
    hitCtx.restore();

    hitCtx.globalCompositeOperation = 'source-over';

    // 3. Count pixels
    const pixelData = hitCtx.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;
    let coveredCount = 0;
    for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 20) coveredCount++;
    }

    const coverage = coveredCount / GAME_STATE.totalLetterPixels;
    // console.log("Coverage:", coverage);

    if (coverage > CONFIG.completionThreshold) {
        completeLetter();
    }
}

function completeLetter() {
    GAME_STATE.completedLetters[GAME_STATE.letterIndex] = true;
    GAME_STATE.letterIndex++;

    resetForNewLetter();

    if (GAME_STATE.letterIndex >= GAME_STATE.word.length) {
        setTimeout(startNewWord, 800);
    }
}

window.addEventListener('load', init);
