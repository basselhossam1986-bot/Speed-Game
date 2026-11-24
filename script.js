
const target = document.getElementById("target");
const gameArea = document.getElementById("gameArea");

const scoreText = document.getElementById("score");
const timeText = document.getElementById("time");
const bestText = document.getElementById("best");
const levelText = document.getElementById("level");
const comboText = document.getElementById("combo");
const progress = document.getElementById("progress");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const soundBtn = document.getElementById("soundBtn");

const achievementsBox = document.getElementById("achievements");
const leaderboardBox = document.getElementById("leaderboard");

let score = 0;
let timeLeft = 30;
let level = 1;
let combo = 0;

let bestScore = Number(localStorage.getItem("speedBest")) || 0;

let gameActive = false;
let paused = false;
let soundEnabled = true;
let timer = null;
let audioContext = null;

bestText.textContent = bestScore;

// ACHIEVEMENTS

const achievements = [
    { id: "first", name: "First Hit", goal: s => s >= 1 },
    { id: "ten", name: "Getting Started", goal: s => s >= 10 },
    { id: "twentyfive", name: "Fast Fingers", goal: s => s >= 25 },
    { id: "fifty", name: "Speed Master", goal: s => s >= 50 },
    { id: "hundred", name: "Legend", goal: s => s >= 100 },
    { id: "level5", name: "Level Hunter", goal: s => s >= 40 }
];

let unlocked = JSON.parse(
    localStorage.getItem("speedAchievements") || "[]"
);

function renderAchievements() {
    achievementsBox.innerHTML = "";

    achievements.forEach(item => {
        const isUnlocked = unlocked.includes(item.id);

        const element = document.createElement("div");
        element.className = "achievement-item " +
            (isUnlocked ? "unlocked" : "locked");

        const name = document.createElement("span");
        name.textContent =
            (isUnlocked ? "🏆 " : "🔒 ") + item.name;

        const status = document.createElement("span");
        status.textContent = isUnlocked ? "UNLOCKED" : "LOCKED";

        element.append(name, status);
        achievementsBox.appendChild(element);
    });
}

function checkAchievements() {
    achievements.forEach(item => {
        if (item.goal(score) && !unlocked.includes(item.id)) {
            unlocked.push(item.id);
            playSound(850, 0.2);
        }
    });

    localStorage.setItem(
        "speedAchievements",
        JSON.stringify(unlocked)
    );

    renderAchievements();
}

// LEADERBOARD

let leaderboard = JSON.parse(
    localStorage.getItem("speedLeaderboard") || "[]"
);

function renderLeaderboard() {
    leaderboardBox.innerHTML = "";

    if (leaderboard.length === 0) {
        leaderboardBox.textContent = "No scores yet. Play a game!";
        return;
    }

    leaderboard.forEach((points, index) => {
        const row = document.createElement("div");
        row.className = "leaderboard-item";

        const rank = document.createElement("span");
        rank.textContent = `#${index + 1}`;

        const label = document.createElement("span");
        label.textContent = "PLAYER";

        const value = document.createElement("strong");
        value.textContent = points;

        row.append(rank, label, value);
        leaderboardBox.appendChild(row);
    });
}

function saveScore() {
    if (score <= 0) return;

    leaderboard.push(score);
    leaderboard.sort((a, b) => b - a);
    leaderboard = leaderboard.slice(0, 5);

    localStorage.setItem(
        "speedLeaderboard",
        JSON.stringify(leaderboard)
    );

    renderLeaderboard();
}

// SOUND

function playSound(frequency = 500, duration = 0.08) {
    if (!soundEnabled) return;

    try {
        const AudioClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioClass) return;

        if (!audioContext) {
            audioContext = new AudioClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.08, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);

    } catch (error) {
        console.log("Audio unavailable");
    }
}

soundBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    soundBtn.textContent = soundEnabled
        ? "🔊 SOUND ON"
        : "🔇 SOUND OFF";

    if (soundEnabled) playSound(650);
});

// SKINS

const skins = {
    blue: ["#38bdf8", "#6366f1"],
    purple: ["#a78bfa", "#7c3aed"],
    red: ["#fb7185", "#e11d48"],
    green: ["#4ade80", "#16a34a"],
    gold: ["#facc15", "#d97706"]
};

let selectedSkin =
    localStorage.getItem("speedSkin") || "blue";

function applySkin(name) {
    if (!skins[name]) name = "blue";

    const colors = skins[name];

    target.style.background =
        `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;

    target.style.boxShadow =
        `0 0 20px ${colors[0]}99`;

    document.querySelectorAll(".skin").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.skin === name
        );
    });

    selectedSkin = name;
    localStorage.setItem("speedSkin", name);
}

document.querySelectorAll(".skin").forEach(button => {
    button.addEventListener("click", () => {
        applySkin(button.dataset.skin);
        playSound(600);
    });
});

// GAME STATS

function updateStats() {
    scoreText.textContent = score;
    timeText.textContent = timeLeft;
    levelText.textContent = level;
    comboText.textContent = `COMBO: ${combo}x`;

    progress.style.width = (timeLeft / 30 * 100) + "%";
}

function moveTarget() {
    const size = Math.max(
        25,
        55 - Math.floor(score / 5) * 4
    );

    target.style.width = size + "px";
    target.style.height = size + "px";

    const maxX = Math.max(0, gameArea.clientWidth - size);
    const maxY = Math.max(0, gameArea.clientHeight - size);

    target.style.left = Math.random() * maxX + "px";
    target.style.top = Math.random() * maxY + "px";
}

// START GAME

function startGame() {
    clearInterval(timer);

    score = 0;
    timeLeft = 30;
    level = 1;
    combo = 0;

    gameActive = true;
    paused = false;

    updateStats();

    overlay.style.display = "none";
    target.style.display = "block";

    pauseBtn.disabled = false;
    pauseBtn.textContent = "PAUSE";

    moveTarget();
    playSound(600);

    timer = setInterval(() => {
        if (!gameActive || paused) return;

        timeLeft--;

        level = Math.floor(score / 10) + 1;

        updateStats();

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// END GAME

function endGame() {
    gameActive = false;
    paused = false;

    clearInterval(timer);

    target.style.display = "none";
    pauseBtn.disabled = true;

    const newRecord = score > bestScore;

    if (newRecord) {
        bestScore = score;
        localStorage.setItem("speedBest", bestScore);
        bestText.textContent = bestScore;
        playSound(1000, 0.35);
    } else {
        playSound(250, 0.3);
    }

    checkAchievements();
    saveScore();

    overlay.style.display = "flex";

    overlayTitle.textContent =
        newRecord && score > 0
            ? "NEW HIGH SCORE!"
            : "GAME OVER!";

    overlayText.textContent =
        `Your Score: ${score} | Level: ${level}`;

    startBtn.textContent = "PLAY AGAIN →";
}

// PAUSE

function pauseGame() {
    if (!gameActive) return;

    paused = !paused;

    if (paused) {
        target.style.display = "none";
        overlay.style.display = "flex";

        overlayTitle.textContent = "GAME PAUSED";
        overlayText.textContent =
            "Take a break. Your game is waiting.";

        startBtn.textContent = "RESUME GAME";
        pauseBtn.textContent = "RESUME";
    } else {
        overlay.style.display = "none";
        target.style.display = "block";

        moveTarget();

        pauseBtn.textContent = "PAUSE";
    }
}

// RESET GAME

function resetGame() {
    clearInterval(timer);
    timer = null;

    score = 0;
    timeLeft = 30;
    level = 1;
    combo = 0;

    gameActive = false;
    paused = false;

    target.style.display = "none";

    overlay.style.display = "flex";
    overlayTitle.textContent = "READY TO PLAY?";
    overlayText.textContent =
        "Hit the target as many times as possible in 30 seconds.";

    startBtn.textContent = "START GAME →";

    pauseBtn.disabled = true;
    pauseBtn.textContent = "PAUSE";

    updateStats();

    playSound(350, 0.12);
}

// TARGET CLICK

target.addEventListener("click", () => {
    if (!gameActive || paused) return;

    score++;
    combo++;

    level = Math.floor(score / 10) + 1;

    if (score % 10 === 0) {
        timeLeft = Math.min(30, timeLeft + 2);
        playSound(900, 0.2);
    } else {
        playSound(450 + Math.min(combo, 20) * 20);
    }

    checkAchievements();
    updateStats();
    moveTarget();
});

// BUTTONS

startBtn.addEventListener("click", () => {
    if (paused) {
        pauseGame();
    } else {
        startGame();
    }
});

pauseBtn.addEventListener("click", pauseGame);

resetBtn.addEventListener("click", resetGame);

// INITIAL SETUP

applySkin(selectedSkin);
renderAchievements();
renderLeaderboard();
updateStats();
