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
// High-res points for curves
const LETTER_PATHS = {
    'A': [
        [[0.5, 0], [0.1, 1]],   // Left diagonal
        [[0.5, 0], [0.9, 1]],   // Right diagonal
        [[0.25, 0.6], [0.75, 0.6]] // Crossbar
    ],
    'B': [
        [[0.1, 0], [0.1, 1]],   // Spine
        // Top loop (smooth arc)
        [[0.1, 0], [0.5, 0], [0.7, 0.1], [0.8, 0.25], [0.7, 0.4], [0.5, 0.5], [0.1, 0.5]],
        // Bottom loop
        [[0.1, 0.5], [0.5, 0.5], [0.75, 0.6], [0.85, 0.75], [0.75, 0.9], [0.5, 1], [0.1, 1]]
    ],
    'C': [
        // Smooth C curve (counter-clockwise from top-right)
        [[0.85, 0.2], [0.7, 0.05], [0.5, 0], [0.3, 0.05], [0.15, 0.2], [0.1, 0.5], [0.15, 0.8], [0.3, 0.95], [0.5, 1], [0.7, 0.95], [0.85, 0.8]]
    ],
    'F': [
        [[0.15, 0], [0.15, 1]],   // Spine
        [[0.15, 0], [0.85, 0]],   // Top bar
        [[0.15, 0.5], [0.75, 0.5]] // Middle bar
    ],
    'O': [
        // Smooth Oval (24 points)
        Array.from({ length: 25 }, (_, i) => {
            const angle = (i / 24) * Math.PI * 2; // 0 to 2PI
            // x = 0.5 + 0.4 * cos(theta - PI/2) -> start top (0,-1)
            // y = 0.5 + 0.5 * sin(theta - PI/2)
            const theta = angle - Math.PI / 2;
            return [0.5 + 0.45 * Math.cos(theta), 0.5 + 0.5 * Math.sin(theta)];
        })
    ],
    'X': [
        [[0.15, 0], [0.85, 1]],   // Diagonal 1
        [[0.85, 0], [0.15, 1]]    // Diagonal 2
    ],
    'T': [
        [[0.5, 0], [0.5, 1]],   // Spine
        [[0.1, 0], [0.9, 0]]    // Bar
    ],
    'H': [
        [[0.2, 0], [0.2, 1]],   // Left leg
        [[0.8, 0], [0.8, 1]],   // Right leg
        [[0.2, 0.5], [0.8, 0.5]] // Crossbar
    ],
    'P': [
        [[0.15, 0], [0.15, 1]],   // Spine
        // Loop
        [[0.15, 0], [0.6, 0], [0.8, 0.1], [0.85, 0.25], [0.8, 0.4], [0.6, 0.5], [0.15, 0.5]]
    ],
    'R': [
        [[0.15, 0], [0.15, 1]], // Spine
        // Top Loop
        [[0.15, 0], [0.6, 0], [0.8, 0.1], [0.85, 0.25], [0.8, 0.4], [0.6, 0.5], [0.15, 0.5]],
        // Leg (can be curved or straight, straight is clearer for R usually)
        [[0.5, 0.5], [0.85, 1]]
    ],
    'M': [
        [[0.1, 1], [0.1, 0]], // Left leg up
        [[0.1, 0], [0.5, 0.8]], // Mid down
        [[0.5, 0.8], [0.9, 0]], // Mid up
        [[0.9, 0], [0.9, 1]] // Right leg down
    ],
    'S': [
        // Smooth S curve (Bezier-like approximation)
        // Top arc (right to left)
        [
            [0.85, 0.15], [0.7, 0.05], [0.5, 0], [0.3, 0.05], [0.15, 0.15],
            [0.1, 0.25], [0.15, 0.35], [0.3, 0.45], [0.5, 0.5], // Cross over
            [0.7, 0.55], [0.85, 0.65], [0.9, 0.75], // Bottom curve start
            [0.85, 0.9], [0.7, 0.95], [0.5, 1], [0.3, 0.95], [0.15, 0.85]
        ]
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
    hitToleranceWidth: 60,     // Widened 40->60: Very forgiving on "wobble"

    // COMPLETION LOGIC:
    // Reduced significantly to 0.40 (40% area coverage).
    // Since the halo is very wide (60px), filling 40% of that huge area with a thin pen is actually quite a lot of work.
    completionThreshold: 0.40,

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
    const letter = GAME_STATE.word[GAME_STATE.letterIndex];
    if (!letter || !LETTER_PATHS[letter]) return;

    const path = LETTER_PATHS[letter];
    const lx = getLetterX(GAME_STATE.letterIndex);
    const ly = CONFIG.baseline;
    const s = CONFIG.letterSize;
    const w = s * 0.7;

    // We must pass EVERY stroke in the letter
    // e.g. 'A' has 3 strokes. All 3 must be covered > 50%
    const STROKE_THRESHOLD = 0.50;
    let allStrokesPassed = true;

    for (let i = 0; i < path.length; i++) {
        const strokeSegment = path[i];

        // 1. Clear & Setup
        hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
        hitCtx.save();
        hitCtx.scale(dpr, dpr);
        hitCtx.lineCap = 'round';
        hitCtx.lineJoin = 'round';

        // 2. Draw Target Stroke (Red)
        // Draw slightly wider than user pen to ensure good denominator
        hitCtx.lineWidth = CONFIG.hitToleranceWidth;
        hitCtx.strokeStyle = 'red';

        hitCtx.beginPath();
        hitCtx.moveTo(lx + strokeSegment[0][0] * w, ly + strokeSegment[0][1] * s);
        for (let k = 1; k < strokeSegment.length; k++) {
            hitCtx.lineTo(lx + strokeSegment[k][0] * w, ly + strokeSegment[k][1] * s);
        }
        hitCtx.stroke();

        // Calculate Bounding Box for Optimization (Logic coords)
        let minX = strokeSegment[0][0], maxX = strokeSegment[0][0];
        let minY = strokeSegment[0][1], maxY = strokeSegment[0][1];
        for (let k = 1; k < strokeSegment.length; k++) {
            minX = Math.min(minX, strokeSegment[k][0]);
            maxX = Math.max(maxX, strokeSegment[k][0]);
            minY = Math.min(minY, strokeSegment[k][1]);
            maxY = Math.max(maxY, strokeSegment[k][1]);
        }

        // Convert to Pixel coords for pixel reading
        const pad = CONFIG.hitToleranceWidth;
        // px start/end
        const pStartX = (lx + minX * w) - pad;
        const pStartY = (ly + minY * s) - pad;
        const pWidth = (maxX - minX) * w + (pad * 2);
        const pHeight = (maxY - minY) * s + (pad * 2);

        // 3. Draw User Paint (Blue) with 'source-in'
        hitCtx.globalCompositeOperation = 'source-in';
        hitCtx.strokeStyle = 'blue';
        // User paint is thinner
        hitCtx.lineWidth = CONFIG.hitToleranceWidth * 0.5;

        hitCtx.beginPath();
        // Draw ALL user strokes to see if ANY cover this segment
        for (let uStroke of GAME_STATE.currentLetterStrokes) {
            if (uStroke.length === 0) continue;
            hitCtx.moveTo(uStroke[0].x, uStroke[0].y);
            for (let u = 1; u < uStroke.length; u++) hitCtx.lineTo(uStroke[u].x, uStroke[u].y);
        }
        hitCtx.stroke();

        hitCtx.restore(); // restores scale/composite

        // 4. Count Pixels (Red vs Blue is handled by source-in, we just count non-transparent)
        // We need denominator? 
        // Logic: 
        // We need to know how many pixels "Red" had vs how many "Blue" kept.
        // Actually, 'source-in' replaces everything. We lose the Red count.
        // Better approach:
        //  a. Draw Red -> Count Red (Denominator)
        //  b. Draw Blue (source-in) -> Count Blue (Numerator)

        // Let's redo step 2/3 carefully.

        // RE-DRAW RED just to count it (or we could use math estimation, but pixel counting is safer for curves)
        // To be efficient, we scan the bounding box once? No.
        // Let's allow a slightly less optimized but correct 2-pass approach.
    }

    // RE-IMPLEMENTING LOOP FOR CORRECTNESS with 2-pass pixel count
    // (This overrides the loop above for clean code injection)

    for (let i = 0; i < path.length; i++) {
        const strokeSegment = path[i];

        // PASS 1: Count Target Pixels
        hitCtx.globalCompositeOperation = 'source-over';
        hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
        hitCtx.save();
        hitCtx.scale(dpr, dpr);
        hitCtx.lineCap = 'round';
        hitCtx.lineJoin = 'round';
        hitCtx.lineWidth = CONFIG.hitToleranceWidth;
        hitCtx.strokeStyle = 'red';

        hitCtx.beginPath();
        hitCtx.moveTo(lx + strokeSegment[0][0] * w, ly + strokeSegment[0][1] * s);
        for (let k = 1; k < strokeSegment.length; k++) hitCtx.lineTo(lx + strokeSegment[k][0] * w, ly + strokeSegment[k][1] * s);
        hitCtx.stroke();
        hitCtx.restore();

        // Calc Bounds
        let minX = strokeSegment[0][0], maxX = strokeSegment[0][0];
        let minY = strokeSegment[0][1], maxY = strokeSegment[0][1];
        for (let k = 1; k < strokeSegment.length; k++) {
            minX = Math.min(minX, strokeSegment[k][0]);
            maxX = Math.max(maxX, strokeSegment[k][0]);
            minY = Math.min(minY, strokeSegment[k][1]);
            maxY = Math.max(maxY, strokeSegment[k][1]);
        }
        const bX = Math.floor((lx + minX * w - CONFIG.hitToleranceWidth) * dpr);
        const bY = Math.floor((ly + minY * s - CONFIG.hitToleranceWidth) * dpr);
        const bW = Math.ceil(((maxX - minX) * w + CONFIG.hitToleranceWidth * 2) * dpr);
        const bH = Math.ceil(((maxY - minY) * s + CONFIG.hitToleranceWidth * 2) * dpr);

        const safeBX = Math.max(0, bX);
        const safeBY = Math.max(0, bY);
        const safeBW = Math.min(hitCanvas.width - safeBX, bW);
        const safeBH = Math.min(hitCanvas.height - safeBY, bH);

        if (safeBW <= 0 || safeBH <= 0) continue; // Offscreen?

        const pixels1 = hitCtx.getImageData(safeBX, safeBY, safeBW, safeBH).data;
        let targetCount = 0;
        for (let p = 3; p < pixels1.length; p += 4) { if (pixels1[p] > 20) targetCount++; }

        // PASS 2: Count Overlap
        hitCtx.save();
        hitCtx.scale(dpr, dpr);
        hitCtx.globalCompositeOperation = 'source-in';
        hitCtx.strokeStyle = 'blue';
        hitCtx.lineWidth = CONFIG.hitToleranceWidth * 0.5; // User brush size
        hitCtx.lineCap = 'round';
        hitCtx.lineJoin = 'round';

        hitCtx.beginPath();
        for (let uStroke of GAME_STATE.currentLetterStrokes) {
            if (uStroke.length === 0) continue;
            hitCtx.moveTo(uStroke[0].x, uStroke[0].y);
            for (let u = 1; u < uStroke.length; u++) hitCtx.lineTo(uStroke[u].x, uStroke[u].y);
        }
        hitCtx.stroke();
        hitCtx.restore();

        const pixels2 = hitCtx.getImageData(safeBX, safeBY, safeBW, safeBH).data;
        let coveredCount = 0;
        for (let p = 3; p < pixels2.length; p += 4) { if (pixels2[p] > 20) coveredCount++; }

        // CHECK
        if (targetCount > 0) {
            const ratio = coveredCount / targetCount;
            // console.log(`Segment ${i}: ${Math.floor(ratio*100)}%`);
            if (ratio < STROKE_THRESHOLD) {
                allStrokesPassed = false;
                break; // Fail early
            }
        }
    }

    if (allStrokesPassed) {
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
