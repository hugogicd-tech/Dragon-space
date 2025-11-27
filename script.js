// ==== CANVAS, ESTADO Y HUD ====
const canvas = document.getElementById('dragonCanvas');
const ctx = canvas.getContext('2d');

const hudScore = document.getElementById('score');
const recordsList = document.getElementById('records');
const gameOverPanel = document.getElementById('gameOver');
const msgLost = document.getElementById('msgLost');
const msgRetry = document.getElementById('msgRetry');
const retryBtn = document.getElementById('retryBtn');

const pauseMenu = document.getElementById('pauseMenu');
const pauseBest = document.getElementById('pauseBest');
const pauseRecordsList = document.getElementById('pauseRecords');
const pauseScoresBox = document.getElementById('pauseScores');
const resumeBtn = document.getElementById('resumeBtn');
const scoresBtn = document.getElementById('scoresBtn');

// Controles móviles
const mobileControls = document.getElementById('mobileControls');
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnPause = document.getElementById('btnPause');

// Panel lateral de ajustes
const settingsDrawer = document.getElementById('settingsDrawer');
const drawerToggle = document.getElementById('drawerToggle');
const controlModeInputs = document.querySelectorAll('input[name="controlMode"]');
const reducedEffectsToggle = document.getElementById('reducedEffects');

// Aviso de ayuda
const settingsHint = document.getElementById('settingsHint');
const hintClose = document.getElementById('hintClose');

// Sprite personalizado para la cabeza
const dragonSprite = new Image();
dragonSprite.src = 'imagen-estrella-punt-out.png';

let spriteReady = false;
dragonSprite.onload = () => (spriteReady = true);

const state = {
    inputMode: 'keyboard',
    touchPointer: { active: false, targetX: null, targetY: null },
    reducedEffects: false,
    touchDevice: false,
    isMobile: false,
    width: window.innerWidth,
    height: window.innerHeight,
    pointer: { x: window.innerWidth * 0.2, y: window.innerHeight * 0.7 },
    velocity: { x: 0, y: 0 },
    segments: [],
    particles: [],
    explosionParticles: [],
    stars: [],
    obstacles: [],
    controls: { left: false, right: false, up: false, down: false },
    time: 0,
    gameOver: false,
    paused: false,
    score: 0,
    lastTimestamp: performance.now(),
    records: [],
    recentScores: [],
    currentScrollSpeed: 1.6,
    currentStarSpeed: 0.5,
    currentObstacleSpeed: 0.8
};

const config = {
    segmentCount: 30,
    segmentLength: 12,
    waveAmplitude: 12,
    waveFrequency: 0.22,
    headRadius: 12,
    particlePool: 120,
    particleSpawnRate: 0.8,

    baseScrollSpeed: 1.6,
    maxScrollSpeed: 4.6,
    baseStarSpeed: 0.5,
    maxStarSpeed: 1.4,
    baseObstacleSpeed: 0.8,
    maxObstacleSpeed: 3.2,
    baseObstacleCount: 4,
    maxObstacleCount: 12,
    maxObstacleCountMobile: 8,
    difficultyRampTime: 120
};

// ==== DETECCIÓN Y CONFIGURACIÓN DE CONTROLES ====
function detectMobile() {
    const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const narrowViewport = window.innerWidth <= 820;
    const userAgentMobile = /android|iphone|ipad|ipod|windows phone|kindle/i.test(navigator.userAgent);
    return touchCapable && (narrowViewport || userAgentMobile);
}

let mobileControlsReady = false;
function ensureMobileControls() {
    if (mobileControlsReady) return;
    setupMobileControls();
    mobileControlsReady = true;
}

function setInputMode(mode) {
    state.inputMode = mode;
    state.isMobile = mode === 'touch';

    document.body.classList.toggle('show-cursor', mode === 'keyboard');

    if (mode === 'touch') {
        ensureMobileControls();
        if (mobileControls) mobileControls.classList.remove('hidden');
        if (btnPause) btnPause.classList.remove('hidden');
        state.controls.left = state.controls.right = state.controls.up = state.controls.down = false;
    } else {
        if (mobileControls) mobileControls.classList.add('hidden');
        if (btnPause) btnPause.classList.add('hidden');
        state.touchPointer.active = false;
        state.touchPointer.targetX = null;
        state.touchPointer.targetY = null;
    }

    controlModeInputs.forEach((input) => {
        input.checked = input.value === mode;
    });

    if (settingsDrawer) {
        if (mode === 'keyboard') {
            settingsDrawer.classList.add('open');
        } else {
            settingsDrawer.classList.remove('open');
        }
    }
}

// ==== EVENTOS DE CONTROL (TECLADO) ====
function handleKey(e, isDown) {
    if (state.inputMode === 'touch') return;

    const key = e.key.toLowerCase();

    if (
        state.gameOver &&
        isDown &&
        (key === 'enter' ||
            key === 'arrowleft' ||
            key === 'arrowright' ||
            key === 'arrowup' ||
            key === 'arrowdown')
    ) {
        hideGameOverPanel();
        resetGame();
        return;
    }

    if (key === 'enter' && isDown && !state.gameOver) {
        state.paused ? resumeGame() : pauseGame();
        return;
    }

    if (state.paused) return;

    const map = {
        arrowleft: 'left', a: 'left',
        arrowright: 'right', d: 'right',
        arrowup: 'up', w: 'up',
        arrowdown: 'down', s: 'down'
    };

    if (map[key]) {
        state.controls[map[key]] = isDown;
        e.preventDefault();
    }
}

window.addEventListener('keydown', (e) => handleKey(e, true));
window.addEventListener('keyup', (e) => handleKey(e, false));

// ==== EVENTOS TÁCTILES / PUNTERO (MÓVIL) ====
function setupMobileControls() {
    if (!mobileControls) return;

    const bindDirectional = (btn, direction) => {
        if (!btn) return;

        const activate = (e) => {
            e.preventDefault();
            state.controls[direction] = true;
        };
        const deactivate = (e) => {
            e.preventDefault();
            state.controls[direction] = false;
        };

        btn.addEventListener('touchstart', activate, { passive: false });
        btn.addEventListener('pointerdown', activate);

        ['touchend', 'touchcancel', 'pointerup', 'pointercancel', 'pointerleave'].forEach((evt) =>
            btn.addEventListener(evt, deactivate, { passive: false })
        );
    };

    bindDirectional(btnUp, 'up');
    bindDirectional(btnDown, 'down');
    bindDirectional(btnLeft, 'left');
    bindDirectional(btnRight, 'right');

    if (btnPause) {
        const togglePause = (e) => {
            e.preventDefault();
            if (state.gameOver) return;
            state.paused ? resumeGame() : pauseGame();
        };
        btnPause.addEventListener('touchstart', togglePause, { passive: false });
        btnPause.addEventListener('pointerdown', togglePause);
    }
}

function canvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * state.width;
    const y = ((e.clientY - rect.top) / rect.height) * state.height;
    return {
        x: Math.max(60, Math.min(state.width - 60, x)),
        y: Math.max(60, Math.min(state.height - 60, y))
    };
}

let activePointerId = null;

canvas.addEventListener('pointerdown', (e) => {
    if (state.inputMode !== 'touch') return;
    if (e.pointerType === 'mouse' && !state.touchDevice) return;

    activePointerId = e.pointerId;
    canvas.setPointerCapture(activePointerId);
    const { x, y } = canvasCoordinates(e);
    state.touchPointer = { active: true, targetX: x, targetY: y };
});

canvas.addEventListener('pointermove', (e) => {
    if (state.inputMode !== 'touch') return;
    if (!state.touchPointer.active || e.pointerId !== activePointerId) return;

    const { x, y } = canvasCoordinates(e);
    state.touchPointer.targetX = x;
    state.touchPointer.targetY = y;
});

function stopPointerControl(e) {
    if (state.inputMode !== 'touch') return;
    if (e.pointerId !== activePointerId) return;
    state.touchPointer.active = false;
    state.touchPointer.targetX = null;
    state.touchPointer.targetY = null;
    activePointerId = null;
}

canvas.addEventListener('pointerup', stopPointerControl);
canvas.addEventListener('pointercancel', stopPointerControl);

// ==== EVENTOS GENERALES Y PANEL DE AJUSTES ====
drawerToggle?.addEventListener('click', () => {
    settingsDrawer.classList.toggle('open');
    if (settingsDrawer.classList.contains('open')) {
        settingsHint?.classList.add('hidden');
    }
});

controlModeInputs.forEach((input) => {
    input.addEventListener('change', () => setInputMode(input.value));
});

reducedEffectsToggle?.addEventListener('change', (e) => {
    state.reducedEffects = e.target.checked;
    initStars();
    const target = state.reducedEffects
        ? config.baseObstacleCount
        : Math.round(lerp(config.baseObstacleCount, config.maxObstacleCount, difficultyFactor()));
    syncObstacleCount(target);
});

window.addEventListener('resize', () => {
    resizeCanvas();
    const autoMode = detectMobile() ? 'touch' : 'keyboard';
    if (!settingsDrawer || !settingsDrawer.classList.contains('open')) {
        setInputMode(autoMode);
    }
});

retryBtn.addEventListener('click', () => {
    hideGameOverPanel();
    resetGame();
});

retryBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    hideGameOverPanel();
    resetGame();
});

resumeBtn.addEventListener('click', () => resumeGame());
resumeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    resumeGame();
});

scoresBtn.addEventListener('click', () => {
    pauseScoresBox.classList.toggle('hidden');
});
scoresBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    pauseScoresBox.classList.toggle('hidden');
});

// === BLOQUE DEL MENSAJE DE AYUDA ===
hintClose?.addEventListener('click', () => {
    settingsHint.classList.add('hidden');
});

if (settingsHint) {
    setTimeout(() => {
        settingsHint.classList.add('hidden');
    }, 12000);
}

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    state.width = window.innerWidth;
    state.height = window.innerHeight;

    if (settingsDrawer && state.isMobile && !settingsDrawer.classList.contains('open')) {
        settingsDrawer.style.transform = '';
    }

    initStars();
}
resizeCanvas();

// ==== RESET & HUD ====
function resetGame() {
    state.pointer.x = state.width * 0.2;
    state.pointer.y = Math.min(state.height - 120, state.height * 0.7);
    state.velocity.x = state.velocity.y = 0;
    state.time = 0;
    state.score = 0;
    state.gameOver = false;
    state.paused = false;
    pauseMenu.classList.add('hidden');
    pauseScoresBox.classList.add('hidden');
    state.currentScrollSpeed = config.baseScrollSpeed;
    state.currentStarSpeed = config.baseStarSpeed;
    state.currentObstacleSpeed = config.baseObstacleSpeed;
    state.lastTimestamp = performance.now();
    state.particles = [];
    state.explosionParticles = [];
    canvas.classList.remove('hit');
    Object.keys(state.controls).forEach((k) => (state.controls[k] = false));
    initSegments();
    initStars();
    initObstacles(config.baseObstacleCount);
    updateHUD();
}

function updateHUD() {
    hudScore.textContent = state.score.toFixed(1);
}

function updateRecords() {
    recordsList.innerHTML = state.records
        .map((value) => `<li>${value.toFixed(1)}s</li>`)
        .join('');
}

function showGameOverPanel() {
    gameOverPanel.classList.remove('hidden');
    msgLost.classList.remove('hidden');
    msgRetry.classList.add('hidden');
    retryBtn.classList.add('hidden');

    setTimeout(() => {
        msgLost.classList.add('hidden');
        msgRetry.classList.remove('hidden');
        retryBtn.classList.remove('hidden');
    }, 1200);
}

function hideGameOverPanel() {
    gameOverPanel.classList.add('hidden');
    msgLost.classList.remove('hidden');
    msgRetry.classList.add('hidden');
    retryBtn.classList.add('hidden');
}

// ==== PAUSA ====
function pauseGame() {
    if (state.paused || state.gameOver) return;
    state.paused = true;
    updatePausePanel();
    pauseMenu.classList.remove('hidden');
}

function resumeGame() {
    if (!state.paused) return;
    state.paused = false;
    pauseMenu.classList.add('hidden');
    pauseScoresBox.classList.add('hidden');
    state.lastTimestamp = performance.now();
}

function updatePausePanel() {
    const best = state.records[0] ?? state.score;
    pauseBest.textContent = (best || 0).toFixed(1);
    const entries = state.recentScores.slice(-5).reverse();
    pauseRecordsList.innerHTML = entries.length
        ? entries.map((v) => `<li>${v.toFixed(1)}s</li>`).join('')
        : '<li>–</li>';
}

// ==== DIFICULTAD DINÁMICA ====
const lerp = (a, b, t) => a + (b - a) * t;

function difficultyFactor() {
    return Math.min(1, state.score / config.difficultyRampTime);
}

function updateDifficulty() {
    const factor = difficultyFactor();
    state.currentScrollSpeed = lerp(config.baseScrollSpeed, config.maxScrollSpeed, factor);
    state.currentStarSpeed = lerp(config.baseStarSpeed, config.maxStarSpeed, factor);
    state.currentObstacleSpeed = lerp(config.baseObstacleSpeed, config.maxObstacleSpeed, factor);

    const maxCount = state.reducedEffects ? config.maxObstacleCountMobile : config.maxObstacleCount;
    const targetCount = Math.round(
        lerp(config.baseObstacleCount, maxCount, factor)
    );
    syncObstacleCount(targetCount);
}

function syncObstacleCount(target) {
    while (state.obstacles.length < target) {
        state.obstacles.push(createObstacle(state.width + Math.random() * state.width));
    }
    while (state.obstacles.length > target) {
        state.obstacles.pop();
    }
}

// ==== FONDO Y OBSTÁCULOS ====
function initStars() {
    const baseCount = state.reducedEffects ? 120 : 220;
    const areaFactor = Math.min(1, (state.width * state.height) / 700000);
    const targetStars = Math.round(baseCount * (0.75 + areaFactor * 0.6));

    state.stars = Array.from({ length: targetStars }, () => ({
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        size: Math.random() * 1.2 + 0.3,
        parallax: Math.random() * 0.8 + 0.4,
        twinkle: Math.random() * Math.PI * 2
    }));
}

const obstacleTypes = [
    {
        type: 'meteor',
        color: '#c96a3b',
        highlights: ['#ffb287', '#ff9560'],
        craterColor: 'rgba(0,0,0,0.45)'
    },
    {
        type: 'comet',
        color: '#1ac8ff',
        coreColor: '#ffff',
        tailColor: 'rgba(26, 200, 255, 0.28)'
    },
    {
        type: 'star',
        color: '#ffd966',
        glowColor: 'rgba(255, 217, 102, 0.65)',
        spikes: 12
    },
    {
        type: 'satellite',
        color: '#bfc4de',
        panelColor: '#4f6cff',
        antennaColor: '#ffc857'
    },
    {
        type: 'nebula',
        color: '#a57bff',
        accent: '#ff6fd8'
    }
];

function buildObstacleAssets(type, radius) {
    const assets = {};

    switch (type.type) {
        case 'meteor': {
            const sides = 8;
            const irregularity = 0.35;
            assets.points = [];
            for (let i = 0; i < sides; i++) {
                const angle = (Math.PI * 2 * i) / sides;
                const r = radius * (1 - irregularity + Math.random() * irregularity);
                assets.points.push({
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r
                });
            }
            assets.craters = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => {
                const angle = Math.random() * Math.PI * 2;
                const dist = radius * 0.25 + Math.random() * radius * 0.35;
                const size = radius * (0.12 + Math.random() * 0.15);
                return {
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    r: size
                };
            });
            break;
        }
        case 'comet': {
            assets.tailGradient = ctx.createLinearGradient(-radius * 3, 0, radius, 0);
            assets.tailGradient.addColorStop(0, 'rgba(26, 200, 255, 0)');
            assets.tailGradient.addColorStop(0.6, type.tailColor);
            assets.tailGradient.addColorStop(1, type.coreColor);
            break;
        }
        case 'star': {
            const spikes = type.spikes ?? 10;
            const inner = radius * 0.45;
            const outer = radius * 0.95;
            assets.points = [];
            for (let i = 0; i < spikes * 2; i++) {
                const r = i % 2 === 0 ? outer : inner;
                const angle = (Math.PI * i) / spikes;
                assets.points.push({
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r
                });
            }
            assets.glowGradient = ctx.createRadialGradient(0, 0, inner * 0.2, 0, 0, outer * 1.4);
            assets.glowGradient.addColorStop(0, type.coreColor ?? '#fff6d3');
            assets.glowGradient.addColorStop(1, type.glowColor ?? 'rgba(255,246,211,0)');
            break;
        }
        case 'satellite': {
            assets.bodyWidth = radius * 1.3;
            assets.bodyHeight = radius * 0.7;
            assets.panelWidth = radius * 0.55;
            assets.panelHeight = radius * 0.75;
            assets.antennaHeight = radius * 1.4;
            break;
        }
        case 'nebula': {
            assets.gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.8);
            assets.gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            assets.gradient.addColorStop(0.35, type.color);
            assets.gradient.addColorStop(0.75, type.accent);
            assets.gradient.addColorStop(1, 'rgba(0,0,0,0)');
            break;
        }
    }
    return assets;
}

function resetObstacle(obstacle, xStart) {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const radius = 20 + Math.random() * 16;

    obstacle.x = xStart;
    obstacle.y = Math.random() * state.height * 0.9 + 40;
    obstacle.radius = radius;
    obstacle.angle = Math.random() * Math.PI * 2;
    obstacle.baseSpeed = 0.6 + Math.random();
    obstacle.type = type;
    obstacle.renderData = buildObstacleAssets(type, radius);
    return obstacle;
}

function createObstacle(xStart) {
    return resetObstacle({}, xStart);
}

function initObstacles(count) {
    state.obstacles = [];
    for (let i = 0; i < count; i++) {
        state.obstacles.push(createObstacle(state.width + Math.random() * state.width));
    }
}

function updateStars() {
    for (const star of state.stars) {
        star.x -= state.currentScrollSpeed * (0.5 + star.parallax * state.currentStarSpeed);
        star.twinkle += 0.03;
        if (star.x < -10) {
            star.x = state.width + 10;
            star.y = Math.random() * state.height;
        }
    }
}

function drawStars() {
    ctx.save();
    ctx.fillStyle = '#05030d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const star of state.stars) {
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(star.twinkle));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff';
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

function updateObstacles() {
    for (const obs of state.obstacles) {
        obs.angle += 0.02;
        const speed = state.currentScrollSpeed + obs.baseSpeed * state.currentObstacleSpeed;
        obs.x -= speed;
        obs.y += Math.sin(state.time * 0.01 + obs.angle) * 0.6;

        if (obs.x + obs.radius < -40) {
            resetObstacle(obs, state.width + Math.random() * state.width);
        }
    }
}

function drawObstacles() {
    for (const obs of state.obstacles) {
        ctx.save();
        ctx.translate(obs.x, obs.y);
        ctx.rotate(obs.angle);

        const type = obs.type;

        switch (type.type) {
            case 'meteor': {
                const pts = obs.renderData.points;
                ctx.fillStyle = type.color;
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(pts[i].x, pts[i].y);
                }
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = type.highlights[0];
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[2].x, pts[2].y);
                ctx.stroke();

                ctx.strokeStyle = type.highlights[1];
                ctx.beginPath();
                ctx.moveTo(pts[3].x, pts[3].y);
                ctx.lineTo(pts[5].x, pts[5].y);
                ctx.stroke();

                ctx.fillStyle = type.craterColor;
                for (const crater of obs.renderData.craters) {
                    ctx.beginPath();
                    ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }

            case 'comet': {
                ctx.fillStyle = obs.renderData.tailGradient;
                ctx.beginPath();
                ctx.moveTo(-obs.radius * 3, -obs.radius * 0.4);
                ctx.quadraticCurveTo(-obs.radius * 1.5, -obs.radius * 0.8, obs.radius, 0);
                ctx.quadraticCurveTo(-obs.radius * 1.5, obs.radius * 0.8, -obs.radius * 3, obs.radius * 0.4);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = type.coreColor;
                ctx.beginPath();
                ctx.arc(0, 0, obs.radius * 0.9, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, obs.radius * 0.6, Math.PI * 0.1, Math.PI * 1.1);
                ctx.stroke();
                break;
            }

            case 'star': {
                ctx.fillStyle = obs.renderData.glowGradient;
                ctx.beginPath();
                ctx.arc(0, 0, obs.radius * 1.3, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = type.color;
                const points = obs.renderData.points;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#ffff';
                ctx.beginPath();
                ctx.arc(0, 0, obs.radius * 0.25, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'satellite': {
                const data = obs.renderData;
                ctx.fillStyle = type.panelColor;
                ctx.fillRect(
                    -data.bodyWidth / 2 - data.panelWidth,
                    -data.panelHeight / 2,
                    data.panelWidth,
                    data.panelHeight
                );
                ctx.fillRect(
                    data.bodyWidth / 2,
                    -data.panelHeight / 2,
                    data.panelWidth,
                    data.panelHeight
                );

                ctx.fillStyle = type.color;
                ctx.fillRect(
                    -data.bodyWidth / 2,
                    -data.bodyHeight / 2,
                    data.bodyWidth,
                    data.bodyHeight
                );

                ctx.fillStyle = '#2f3b68';
                ctx.fillRect(
                    -data.bodyWidth / 2 + 6,
                    -data.bodyHeight / 2 + 6,
                    data.bodyWidth - 12,
                    data.bodyHeight - 12
                );

                ctx.strokeStyle = type.antennaColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -data.bodyHeight / 2);
                ctx.lineTo(0, -data.bodyHeight / 2 - data.antennaHeight * 0.4);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-data.bodyWidth * 0.2, -data.bodyHeight / 2 - data.antennaHeight * 0.2);
                ctx.lineTo(data.bodyWidth * 0.2, -data.bodyHeight / 2 - data.antennaHeight * 0.2);
                ctx.stroke();
                break;
            }

            case 'nebula': {
                ctx.fillStyle = obs.renderData.gradient;
                ctx.beginPath();
                ctx.arc(0, 0, obs.radius * 1.6, 0, Math.PI * 2);
                ctx.fill();

                ctx.globalAlpha = 0.65;
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.beginPath();
                ctx.arc(-obs.radius * 0.3, -obs.radius * 0.25, obs.radius * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
        }

        ctx.restore();
    }
}

// ==== CONSTRUCCIÓN DEL DRAGÓN ====
function initSegments() {
    state.segments = [];
    for (let i = 0; i < config.segmentCount; i++) {
        state.segments.push({
            x: state.pointer.x,
            y: state.pointer.y,
            angle: 0,
            offset: i * 0.35
        });
    }
}

function updatePlayer() {
    const marginX = 80;
    const marginY = 80;

    if (state.inputMode === 'touch') {
        const followStrength = state.reducedEffects ? 0.12 : 0.18;
        const maxSpeed = state.reducedEffects ? 6 : 7.2;
        const friction = 0.84;

        if (state.touchPointer.active && state.touchPointer.targetX !== null) {
            const dx = state.touchPointer.targetX - state.pointer.x;
            const dy = state.touchPointer.targetY - state.pointer.y;
            state.velocity.x += dx * followStrength * 0.06;
            state.velocity.y += dy * followStrength * 0.06;
        } else {
            state.velocity.x *= friction;
            state.velocity.y *= friction;
        }

        state.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, state.velocity.x));
        state.velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, state.velocity.y));
    } else {
        const accel = 0.45;
        const maxSpeed = 5.2;
        const friction = 0.9;
        const drift = 0.03;

        state.velocity.x = (state.velocity.x + drift) * friction;
        state.velocity.y *= friction;

        if (state.controls.left) state.velocity.x -= accel;
        if (state.controls.right) state.velocity.x += accel;
        if (state.controls.up) state.velocity.y -= accel;
        if (state.controls.down) state.velocity.y += accel;

        state.velocity.x = Math.max(-maxSpeed, Math.min(maxSpeed, state.velocity.x));
        state.velocity.y = Math.max(-maxSpeed, Math.min(maxSpeed, state.velocity.y));
    }

    state.pointer.x += state.velocity.x;
    state.pointer.y += state.velocity.y;

    if (state.pointer.x < marginX) {
        state.pointer.x = marginX;
        state.velocity.x = 0;
    }
    if (state.pointer.x > state.width - marginX) {
        state.pointer.x = state.width - marginX;
        state.velocity.x = 0;
    }
    if (state.pointer.y < marginY) {
        state.pointer.y = marginY;
        state.velocity.y = 0;
    }
    if (state.pointer.y > state.height - marginY) {
        state.pointer.y = state.height - marginY;
        state.velocity.y = 0;
    }

    state.segments[0].x = state.pointer.x;
    state.segments[0].y = state.pointer.y;

    for (let i = 1; i < state.segments.length; i++) {
        const prev = state.segments[i - 1];
        const seg = state.segments[i];
        const dx = prev.x - seg.x;
        const dy = prev.y - seg.y;
        const angle = Math.atan2(dy, dx);

        seg.x = prev.x - Math.cos(angle) * config.segmentLength;
        seg.y = prev.y - Math.sin(angle) * config.segmentLength;
        seg.angle = angle;
    }
}

// ==== PARTÍCULAS ====
class Ember {
    constructor(x, y, vx, vy, life, color) {
        this.reset(x, y, vx, vy, life, color);
    }
    reset(x, y, vx, vy, life, color) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.color = color;
        this.size = Math.random() * 3 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 1;
        this.vx *= 0.96;
        this.vy = this.vy * 0.96 + 0.02;
        return this.life > 0;
    }
    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
        ctx.shadowColor = `rgba(${this.color}, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

function spawnTrailParticles(x, y) {
    if (Math.random() > config.particleSpawnRate || state.gameOver) return;
    if (state.reducedEffects && Math.random() > 0.4) return;

    const color = Math.random() > 0.5 ? '255, 43, 118' : '0, 255, 255';
    const ember = state.particles.find((p) => p.life <= 0);
    const vx = -state.currentScrollSpeed * 0.3 + (Math.random() - 0.5);
    const vy = (Math.random() - 0.5) * 1.2;

    const life = Math.random() * 40 + 20;
    if (ember) {
        ember.reset(x, y, vx, vy, life, color);
    } else if (state.particles.length < config.particlePool) {
        state.particles.push(new Ember(x, y, vx, vy, life, color));
    }
}

function spawnExplosion(x, y) {
    const count = state.reducedEffects ? 20 : 40;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        state.explosionParticles.push(
            new Ember(
                x,
                y,
                Math.cos(angle) * (Math.random() * 4 + 1),
                Math.sin(angle) * (Math.random() * 4 + 1),
                Math.random() * 40 + 30,
                '255, 120, 80'
            )
        );
    }
}

// ==== COLISIONES Y SCORE ====
function checkCollisions() {
    if (state.gameOver) return;
    const head = state.segments[0];

    for (const obs of state.obstacles) {
        const dx = head.x - obs.x;
        const dy = head.y - obs.y;
        const dist = Math.hypot(dx, dy);
        if (dist < obs.radius + config.headRadius * 0.6) {
            handleGameOver(head.x, head.y);
            break;
        }
    }
}

function handleGameOver(x, y) {
    state.gameOver = true;
    state.paused = false;
    pauseMenu.classList.add('hidden');
    pauseScoresBox.classList.add('hidden');
    canvas.classList.add('hit');
    spawnExplosion(x, y);

    state.records.push(state.score);
    state.records.sort((a, b) => b - a);
    state.records = state.records.slice(0, 5);
    state.recentScores.push(state.score);
    state.recentScores = state.recentScores.slice(-5);

    updateRecords();
    showGameOverPanel();
}

// ==== RENDER DEL DRAGÓN ====
function renderDragon() {
    const { segments, time } = state;

    for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        const next = segments[i + 1];
        const progress = i / segments.length;
        const sway = Math.sin(state.time * 0.01) * 6;
        const wave =
            Math.sin(time * config.waveFrequency * 0.8 + seg.offset) *
            config.waveAmplitude * 0.8 * (1 - progress) +
            sway * (1 - progress);
        const normalAngle = seg.angle + Math.PI / 2;

        const x1 = seg.x + Math.cos(normalAngle) * wave;
        const y1 = seg.y + Math.sin(normalAngle) * wave;
        const x2 = next.x + Math.cos(normalAngle) * wave * 0.6;
        const y2 = next.y + Math.sin(normalAngle) * wave * 0.6;

        const width = Math.max(2, 18 * Math.exp(-progress * 2.2));

        const gradient = ctx.createLinearGradient(seg.x, seg.y, next.x, next.y);
        gradient.addColorStop(0, 'rgba(255, 56, 129, 0.9)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.4 * (1 - progress)).toFixed(3)})`;
        ctx.lineWidth = width * 0.45;
        ctx.stroke();

        spawnTrailParticles(x2, y2);
    }
}

function renderHead() {
    const head = state.segments[0];
    const neck = state.segments[1];
    const angle = Math.atan2(head.y - neck.y, head.x - neck.x);

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);

    if (spriteReady) {
        const scale = 0.05;
        const w = dragonSprite.width * scale;
        const h = dragonSprite.height * scale;
        ctx.drawImage(dragonSprite, -w / 2, -h / 2, w, h);
    } else {
        ctx.fillStyle = '#ffff';
        ctx.beginPath();
        ctx.arc(0, 0, config.headRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ==== LOOP PRINCIPAL ====
function pruneParticles(list) {
    for (let i = list.length - 1; i >= 0; i--) {
        if (!list[i].update()) {
            const lastIndex = list.length - 1;
            if (i !== lastIndex) {
                list[i] = list[lastIndex];
            }
            list.pop();
        }
    }
}

function updateParticles() {
    pruneParticles(state.particles);
    pruneParticles(state.explosionParticles);
}

function drawParticles() {
    for (const particle of state.particles) particle.draw(ctx);
    for (const particle of state.explosionParticles) particle.draw(ctx);
}

function render() {
    const now = performance.now();
    const delta = now - state.lastTimestamp;
    state.lastTimestamp = now;

    if (state.paused) {
        requestAnimationFrame(render);
        return;
    }

    if (!state.gameOver) {
        state.score += delta / 1000;
        updateHUD();
        updateDifficulty();
    }

    updateStars();
    drawStars();

    ctx.fillStyle = 'rgba(5, 3, 13, 0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateObstacles();
    drawObstacles();

    if (!state.gameOver) updatePlayer();
    updateParticles();
    checkCollisions();

    renderDragon();
    drawParticles();
    renderHead();

    state.time += 1;
    requestAnimationFrame(render);
}

// ==== INICIALIZACIÓN ====
const detectedMobile = detectMobile();
state.touchDevice = detectedMobile;
setInputMode(detectedMobile ? 'touch' : 'keyboard');

// Basado en partes del proyecto "Dragon-space" (Apache License 2.0)
// Modificaciones propias por Hugo Ibañez Sanchez, 2025.
resetGame();
render();
updateRecords();