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
    currentLetterStrokes: [], // Strokes that are "good" but letter not finished
    completedLetters: [],
    totalLetterPixels: 0 // Count of pixels in the current target letter
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
    // A stroke is "valid" if 50% of its points are inside the stencil
    accuracyThreshold: 0.50, // Slightly more forgiving placement

    // The letter is "complete" if 25% of its AREA is covered (writing vs coloring)
    completionThreshold: 0.25,

    fadeSpeed: 0.08,
    fontFamily: '"Courier New", Courier, monospace', // Monospace is thinner/cleaner
    guideColor: 'rgba(139, 119, 101, 0.15)',

    // Layout calculated on resize
    letterSize: 0,
    baseline: 0,
    startX: 0,
    letterPadding: 15
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
    let newWord = GAME_STATE.word;
    while (newWord === GAME_STATE.word) {
        newWord = CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];
    }
    GAME_STATE.word = newWord;
    GAME_STATE.letterIndex = 0;

    resetForNewLetter(); // Word setup

    // Re-calculate centering
    calculateLayout();
}

function resetForNewLetter() {
    GAME_STATE.fadingStrokes = [];
    GAME_STATE.currentStroke = [];
    GAME_STATE.currentLetterStrokes = [];

    // Re-initialize completed array if starting fresh word
    if (GAME_STATE.letterIndex === 0) {
        GAME_STATE.completedLetters = new Array(GAME_STATE.word.length).fill(false);
    }

    // Calculate pixel mass of the new target letter for coverage checks
    calculateTargetPixels();
}

function resetWord() {
    GAME_STATE.letterIndex = 0;
    resetForNewLetter();
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

    calculateLayout();
}

function calculateLayout() {
    const rect = canvas.getBoundingClientRect();
    const canvasHeight = rect.height;

    // Font sizing
    // Sky (0.25) to Grass (0.65) = 0.40 height
    const bodyHeight = (GUIDES.grass - GUIDES.sky) * canvasHeight;
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

    // Re-calc target pixels since size changed
    calculateTargetPixels();
}

function calculateTargetPixels() {
    if (GAME_STATE.letterIndex >= GAME_STATE.word.length) return;

    const letter = GAME_STATE.word[GAME_STATE.letterIndex];
    if (!letter) return;

    const dpr = window.devicePixelRatio || 1;

    // Clear Hit Canvas
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;
    hitCtx.textBaseline = 'alphabetic';
    hitCtx.fillStyle = 'red'; // Draw in solid red

    const targetX = getLetterX(GAME_STATE.letterIndex);

    // Draw thick stroke first to expand hit area (match validation logic)
    hitCtx.lineWidth = CONFIG.letterSize / 4;
    hitCtx.strokeStyle = 'red';
    hitCtx.lineJoin = 'round';
    hitCtx.strokeText(letter, targetX, CONFIG.baseline);

    // Then fill
    hitCtx.fillText(letter, targetX, CONFIG.baseline);
    hitCtx.restore();

    // Scan buffer to count pixels
    // Optimization: limit scan to letter bounding box
    const width = Math.floor(ctx.measureText(letter).width * dpr) + 20 * dpr;
    const height = Math.floor(CONFIG.letterSize * dpr) + 20 * dpr;

    // Count pixels
    const pixelData = hitCtx.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;

    let count = 0;
    for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 20) count++;
    }

    GAME_STATE.totalLetterPixels = count;
}

// Drawing Loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

    drawGuideLines();
    drawWordStencil();
    drawCompletedLetters();
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
        // Don't draw stencil if already completed
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

function drawCurrentLetterStrokes() {
    if (GAME_STATE.currentLetterStrokes.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let stroke of GAME_STATE.currentLetterStrokes) {
        if (stroke.length === 0) continue;
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i].x, stroke[i].y);
        }
    }
    ctx.stroke();
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
    if (points.length < 5) return;

    const dpr = window.devicePixelRatio || 1;

    // 1. Is this specific stroke valid? (Inside the guide)
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;
    hitCtx.textBaseline = 'alphabetic';
    hitCtx.fillStyle = 'red';

    const targetX = getLetterX(GAME_STATE.letterIndex);
    const letter = GAME_STATE.word[GAME_STATE.letterIndex];

    // Draw thick stroke first to expand hit area
    hitCtx.lineWidth = CONFIG.letterSize / 4; // Allow significant margin of error
    hitCtx.strokeStyle = 'red';
    hitCtx.lineJoin = 'round';
    hitCtx.strokeText(letter, targetX, CONFIG.baseline);

    // Then fill
    hitCtx.fillText(letter, targetX, CONFIG.baseline);
    hitCtx.restore();

    let hits = 0;
    let totalPoints = 0;
    const sampleRate = 3;

    for (let i = 0; i < points.length; i += sampleRate) {
        const pt = points[i];
        const px = Math.floor(pt.x * dpr);
        const py = Math.floor(pt.y * dpr);

        if (px >= 0 && py >= 0 && px < hitCanvas.width && py < hitCanvas.height) {
            const alpha = hitCtx.getImageData(px, py, 1, 1).data[3];
            if (alpha > 50) hits++;
            totalPoints++;
        }
    }

    const accuracy = totalPoints > 0 ? (hits / totalPoints) : 0;
    const isValidStroke = accuracy >= CONFIG.accuracyThreshold;

    if (!isValidStroke) {
        // Bad stroke: Fade it out
        GAME_STATE.fadingStrokes.push({
            points: [...GAME_STATE.currentStroke],
            opacity: 1.0
        });
        GAME_STATE.currentStroke = [];
        return;
    }

    // 2. Good stroke: Keep it
    GAME_STATE.currentLetterStrokes.push([...GAME_STATE.currentStroke]);
    GAME_STATE.currentStroke = [];

    // 3. Check Overall Coverage
    // NOTE: We check coverage using a LARGER brush (lineWidth 20) basically saying "did they touch enough of the letter?"
    checkCoverage();
}

function checkCoverage() {
    const dpr = window.devicePixelRatio || 1;
    hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);

    // Draw Stencil (Red)
    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.font = `bold ${CONFIG.letterSize}px ${CONFIG.fontFamily}`;
    hitCtx.textBaseline = 'alphabetic';
    hitCtx.fillStyle = '#FF0000';
    const targetX = getLetterX(GAME_STATE.letterIndex);
    const letter = GAME_STATE.word[GAME_STATE.letterIndex];
    hitCtx.fillText(letter, targetX, CONFIG.baseline);
    hitCtx.restore();

    // Mask with valid strokes (Blue)
    hitCtx.globalCompositeOperation = 'source-in';

    hitCtx.save();
    hitCtx.scale(dpr, dpr);
    hitCtx.strokeStyle = '#0000FF';
    hitCtx.lineWidth = CONFIG.letterSize / 3; // Make the "brush" for validation very thick relative to letter size
    hitCtx.lineCap = 'round';
    hitCtx.lineJoin = 'round';

    hitCtx.beginPath();
    for (let stroke of GAME_STATE.currentLetterStrokes) {
        if (stroke.length > 0) {
            hitCtx.moveTo(stroke[0].x, stroke[0].y);
            for (let i = 1; i < stroke.length; i++) hitCtx.lineTo(stroke[i].x, stroke[i].y);
        }
    }
    hitCtx.stroke();
    hitCtx.restore();

    hitCtx.globalCompositeOperation = 'source-over';

    // Count Overlap
    const pixelData = hitCtx.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data;
    let coveredCount = 0;
    for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 20) coveredCount++;
    }

    const coverage = coveredCount / GAME_STATE.totalLetterPixels;

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
