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
    currentStroke: [], // Array of {x, y} points
    fadingStrokes: [], // Array of {points: [], opacity: 1}
    completedLetters: [], // Array of booleans or letters
    showGuide: true
};

const CVC_WORDS = [
    'FOX', 'BOX', 'TOP', 'MOP', 'HOP',
    'CAT', 'DOG', 'BAT', 'HAT', 'MAT',
    'RAT', 'SAT', 'FAT', 'RUN', 'FUN',
    'SUN', 'PIG', 'WIG', 'BIG', 'DIG',
    'BUG', 'HUG', 'MUG', 'RUG', 'TUG',
    'HEN', 'MEN', 'PEN', 'TEN', 'DEN'
];

// Configuration
const CONFIG = {
    // 70% of drawn points must be inside the letter pixels
    tolerance: 0.70,
    fadeSpeed: 0.05,
    fontFamily: '"Arial Rounded MT Bold", "Arial", sans-serif',
    guideColor: 'rgba(139, 119, 101, 0.15)',

    // Layout calculated on resize
    letterSize: 0,
    baseline: 0,
    startX: 0,
    letterPadding: 15 // px between letters
};

// Guide line positions (percentages)
const GUIDES = {
    worm: 0.85,
    grass: 0.65,
    plane: 0.45,
    sky: 0.25
};

// Initialization
function init() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial size

    // Input Events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', drawStroke);
    canvas.addEventListener('mouseup', endDrawing);
    canvas.addEventListener('mouseout', endDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawStroke, { passive: false });
    canvas.addEventListener('touchend', endDrawing, { passive: false });
    canvas.addEventListener('touchcancel', endDrawing, { passive: false });

    // Controls
    clearBtn.addEventListener('click', () => {
        resetWord(); // Resets current word progress
    });

    newWordBtn.addEventListener('click', startNewWord);

    // Initial Word
    startNewWord();

    // Start Loop
    requestAnimationFrame(gameLoop);
}

function startNewWord() {
    // Pick a word different from current if possible
    let newWord = GAME_STATE.word;
    while (newWord === GAME_STATE.word) {
        newWord = CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];
    }
    GAME_STATE.word = newWord;
    resetWord();

    // Re-calculate centering since word length changed
    calculateLayout();
}

function resetWord() {
    GAME_STATE.letterIndex = 0;
    GAME_STATE.fadingStrokes = [];
    GAME_STATE.currentStroke = [];
    GAME_STATE.completedLetters = new Array(GAME_STATE.word.length).fill(false);
}

// Resize & Calculations
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Resize Hit Canvas (Match physical pixels)
    hitCanvas.width = canvas.width;
    hitCanvas.height = canvas.height;
    // hitCtx default transform is identity, which matches physical pixels

    calculateLayout();
}

function calculateLayout() {
    const rect = canvas.getBoundingClientRect();
    const canvasHeight = rect.height;

    // Font sizing
    // Sky (0.25) to Grass (0.65) = 0.40 height
    const bodyHeight = (GUIDES.grass - GUIDES.sky) * canvasHeight;
    // Set font size relative to body height (approx 1.5x to cover ascenders/descenders)
    CONFIG.letterSize = Math.floor(bodyHeight * 1.8);
    CONFIG.baseline = Math.floor(canvasHeight * GUIDES.grass);

    // Measure word to center it
    ctx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;

    let totalWidth = 0;
    for (let char of GAME_STATE.word) {
        totalWidth += ctx.measureText(char).width + CONFIG.letterPadding;
    }
    totalWidth -= CONFIG.letterPadding; // Remove last padding

    CONFIG.startX = (rect.width - totalWidth) / 2;
}

// Drawing Loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    drawGuideLines();
    drawWordStencil();
    drawCompletedLetters();
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

    // Sky
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(0, height * GUIDES.sky);
    ctx.lineTo(width, height * GUIDES.sky);
    ctx.stroke();

    // Plane (Dashed)
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.moveTo(0, height * GUIDES.plane);
    ctx.lineTo(width, height * GUIDES.plane);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grass
    ctx.beginPath();
    ctx.moveTo(0, height * GUIDES.grass);
    ctx.lineTo(width, height * GUIDES.grass);
    ctx.stroke();

    // Worm
    ctx.beginPath();
    ctx.moveTo(0, height * GUIDES.worm);
    ctx.lineTo(width, height * GUIDES.worm);
    ctx.stroke();

    ctx.restore();
}

function getLetterX(index) {
    ctx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;
    let x = CONFIG.startX;
    for (let i = 0; i < index; i++) {
        x += ctx.measureText(GAME_STATE.word[i]).width + CONFIG.letterPadding;
    }
    return x;
}

function drawWordStencil() {
    if (!GAME_STATE.word) return;

    ctx.save();
    ctx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;
    ctx.textBaseline = 'alphabetic';

    for (let i = 0; i < GAME_STATE.word.length; i++) {
        // Don't draw stencil if already completed (optional, keeping it for now looks cleaner)
        if (GAME_STATE.completedLetters[i]) continue;

        // If it's the current target, slight highlight
        if (i === GAME_STATE.letterIndex) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Darker gray for active target
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Very faint for others
        }

        ctx.fillText(GAME_STATE.word[i], getLetterX(i), CONFIG.baseline);
    }
    ctx.restore();
}

function drawCompletedLetters() {
    ctx.save();
    ctx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#2c3e50'; // Ink color (Dark Blue/Grey)

    for (let i = 0; i < GAME_STATE.word.length; i++) {
        if (GAME_STATE.completedLetters[i]) {
            ctx.fillText(GAME_STATE.word[i], getLetterX(i), CONFIG.baseline);
        }
    }
    ctx.restore();
}

function drawCurrentStroke() {
    if (GAME_STATE.currentStroke.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = '#2c3e50'; // Ink color
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = GAME_STATE.currentStroke;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
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
        // Fade to red-ish
        ctx.strokeStyle = `rgba(200, 80, 80, ${item.opacity})`;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const points = item.points;
        if (points.length > 0) {
            ctx.moveTo(points[0].x, points[0].y);
            for (let j = 1; j < points.length; j++) {
                ctx.lineTo(points[j].x, points[j].y);
            }
            ctx.stroke();
        }
    }
}

// Input Handling
function getCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    e.preventDefault();
    if (GAME_STATE.letterIndex >= GAME_STATE.word.length) return;

    GAME_STATE.isDrawing = true;
    GAME_STATE.currentStroke = [];
    const coords = getCoords(e);
    GAME_STATE.currentStroke.push(coords);
}

function drawStroke(e) {
    if (!GAME_STATE.isDrawing) return;
    e.preventDefault();
    const coords = getCoords(e);
    GAME_STATE.currentStroke.push(coords);
}

function endDrawing(e) {
    if (!GAME_STATE.isDrawing) return;
    e.preventDefault();
    GAME_STATE.isDrawing = false;
    validateStroke();
}

function validateStroke() {
    const points = GAME_STATE.currentStroke;
    if (points.length < 5) return; // Ignore accidental taps

    const dpr = window.devicePixelRatio || 1;

    // 1. Setup Hit Canvas
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);

    // Save/Scale for drawing the target letter
    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;
    hitCtx.textBaseline = 'alphabetic';
    hitCtx.fillStyle = '#FFFFFF'; // White (nonzero)

    const targetX = getLetterX(GAME_STATE.letterIndex);
    const letter = GAME_STATE.word[GAME_STATE.letterIndex];
    hitCtx.fillText(letter, targetX, CONFIG.baseline);
    hitCtx.restore();

    // 2. Check overlap
    // Optimization: Get image data for the drawing bounding box only
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let p of points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }

    // Pad bounding box
    const padding = 10;
    const bx = Math.floor((minX - padding) * dpr);
    const by = Math.floor((minY - padding) * dpr);
    const bw = Math.ceil((maxX - minX + padding * 2) * dpr);
    const bh = Math.ceil((maxY - minY + padding * 2) * dpr);

    // Handle edge cases (off screen)
    if (bx < 0 || by < 0 || bx + bw > hitCanvas.width || by + bh > hitCanvas.height) {
        // Fallback to simple check or just fail
        // For simplicity, let's just create a safe getters
    }

    // Actually, getting full canvas data for just point checking is slow
    // But getting small chunks is fast.
    // Let's just check each point individually but simpler: only check if we are inside the letter's roughly bounding box first?
    // No, precise check is needed.

    let hits = 0;
    let totalPoints = 0;

    // We can't easily grab a buffer for arbitrary points without constructing a mask
    // But checking 1x1 pixels is slow. 
    // Compromise: Grab the data for the LETTER's bounding box and check points against relative coords.
    // That's complex math.

    // FASTEST MVP WAY: Check every 3rd point. 1x1 getImageData is actually okay-ish for < 100 calls on modern devices.
    // Let's try it.

    const sampleRate = 3;
    for (let i = 0; i < points.length; i += sampleRate) {
        const pt = points[i];
        const px = Math.floor(pt.x * dpr);
        const py = Math.floor(pt.y * dpr);

        // Safety check
        if (px < 0 || py < 0 || px >= hitCanvas.width || py >= hitCanvas.height) continue;

        const alpha = hitCtx.getImageData(px, py, 1, 1).data[3];
        if (alpha > 50) hits++; // Hit
        totalPoints++;
    }

    const accuracy = totalPoints > 0 ? (hits / totalPoints) : 0;

    if (accuracy >= CONFIG.tolerance) {
        // Success
        GAME_STATE.completedLetters[GAME_STATE.letterIndex] = true;
        GAME_STATE.letterIndex++;

        // Word complete?
        if (GAME_STATE.letterIndex >= GAME_STATE.word.length) {
            setTimeout(startNewWord, 800);
        }
    } else {
        // Fail
        GAME_STATE.fadingStrokes.push({
            points: [...GAME_STATE.currentStroke],
            opacity: 1.0
        });
    }

    GAME_STATE.currentStroke = [];
}

window.addEventListener('load', init);
