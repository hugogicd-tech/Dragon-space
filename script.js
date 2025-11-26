// ===================== CANVAS, ESTADO Y HUD =====================
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

// Sprite personalizado para la cabeza
const dragonSprite = new Image();
dragonSprite.src = 'imagen-estrella-punt-out.png';

let spriteReady = false;
dragonSprite.onload = () => (spriteReady = true);

const state = {
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
    currentObstacleSpeed: 0.8,
    isMobile: false
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
    difficultyRampTime: 120
};


// ===================== EVENTOS DE CONTROL (TECLADO) =====================
function handleKey(e, isDown) {
    if (state.isMobile) return; // Ignorar teclado en móvil

    const key = e.key.toLowerCase();

    // Reiniciar tras perder
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

    // Pausa con Enter
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

// ===================== EVENTOS TÁCTILES (MÓVIL) =====================
function setupMobileControls() {
    const setControl = (btn, direction, value) => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            state.controls[direction] = value;
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            state.controls[direction] = false;
        });
        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            state.controls[direction] = false;
        });
    };

    setControl(btnUp, 'up', true);
    setControl(btnDown, 'down', true);
    setControl(btnLeft, 'left', true);
    setControl(btnRight, 'right', true);

    btnPause.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (state.gameOver) return;
        state.paused ? resumeGame() : pauseGame();
    });
}

if (state.isMobile) {
    setupMobileControls();
}

// ===================== EVENTOS GENERALES =====================
window.addEventListener('resize', () => {
    resizeCanvas();
    state.isMobile = detectMobile();
    if (state.isMobile) {
        mobileControls.classList.remove('hidden');
    } else {
        mobileControls.classList.add('hidden');
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

function resizeCanvas() {
    canvas.width = state.width = window.innerWidth;
    canvas.height = state.height = window.innerHeight;
}
resizeCanvas();

// ===================== RESET & HUD =====================
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

// ===================== PAUSA =====================
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

// ===================== DIFICULTAD DINÁMICA =====================
const lerp = (a, b, t) => a + (b - a) * t;

function difficultyFactor() {
    return Math.min(1, state.score / config.difficultyRampTime);
}

function updateDifficulty() {
    const factor = difficultyFactor();
    state.currentScrollSpeed = lerp(config.baseScrollSpeed, config.maxScrollSpeed, factor);
    state.currentStarSpeed = lerp(config.baseStarSpeed, config.maxStarSpeed, factor);
    state.currentObstacleSpeed = lerp(config.baseObstacleSpeed, config.maxObstacleSpeed, factor);

    const targetCount = Math.round(
        lerp(config.baseObstacleCount, config.maxObstacleCount, factor)
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
// ===================== FONDO Y OBSTÁCULOS =====================
function initStars() {
    state.stars = Array.from({ length: 220 }, () => ({
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
        coreColor: '#ffffff',
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
        ctx.fillStyle = '#ffffff';
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

                ctx.fillStyle = '#ffffff';
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
// ===================== CONSTRUCCIÓN DEL DRAGÓN =====================
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

    state.pointer.x += state.velocity.x;
    state.pointer.y += state.velocity.y;

    const marginX = 80;
    const marginY = 80;
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



// ===================== PARTÍCULAS =====================
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
    for (let i = 0; i < 40; i++) {
        const angle = (Math.PI * 2 * i) / 40;
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

// ===================== COLISIONES Y SCORE =====================
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

// ===================== RENDER DEL DRAGÓN =====================
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
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, config.headRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ===================== LOOP PRINCIPAL =====================
function updateParticles() {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        if (!state.particles[i].update()) state.particles.splice(i, 1);
    }
    for (let i = state.explosionParticles.length - 1; i >= 0; i--) {
        if (!state.explosionParticles[i].update()) state.explosionParticles.splice(i, 1);
    }
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
// Basado en partes del proyecto "Dragon-space" (Apache License 2.0)
// Modificaciones propias por Hugo Ibañez Sanchez, 2025.
resetGame();
render();
updateRecords();