const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const music = document.getElementById("music");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ================= ASSET ================= */
const bg = new Image();
bg.src = "bg_sky.jpeg";

const planeImg = new Image();
planeImg.src = "pesawat.png";

const turbSafeImg = new Image();
turbSafeImg.src = "turbulence_safe.png";

const turbPanicImg = new Image();
turbPanicImg.src = "turbulence_panic.png";

const explodeImg = new Image();
explodeImg.src = "meledak.png";

const explodeSound = new Audio("ledakan.wav");
explodeSound.volume = 0.8; // atur volume (0.0 - 1.0)


/* ================= CONFIG ================= */
const BEAT_WINDOW = 0.18;
let BPM = 120;

const EXP_FRAME_COUNT = 19;
const EXP_FRAME_SPEED = 3;
const EXP_SCALE = 1.6;

const TURB_HOLD_TIME = 20;

/* ================= HIGH SCORE ================= */
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let highName = localStorage.getItem("highName") || "PLAYER";

/* ================= GAME STATE ================= */
let playing = true;
let crashed = false;
let newRecord = false;

let score = 0;

let gravity = 0.35;
let thrust = 0.6;
let velocity = 0;
let damping = 0.985;
let maxSpeed = 9;

let y = canvas.height / 2;
let hold = false;

let playTime = 0;
let beatSafe = false;
let camShake = 0;

/* ================= TURBULENCE ================= */
let turbulenceState = true;
let turbulenceHold = 0;
let wasInZone = false;

/* ================= PLANE ================= */
const plane = {
  x: canvas.width * 0.3,
  w: 192,
  h: 192
};

/* ================= ZONES ================= */
let zones = [];
let spawnTimer = 0;

/* ================= BACKGROUND ================= */
let bgX = 0;
const bgSpeed = 0.3;

/* ================= EXPLOSION ================= */
let expFrame = 0;
let expTick = 0;
let crashX = 0;
let crashY = 0;

/* ================= INPUT ================= */
function press() {
  hold = true;
  if (music.paused && playing) {
    music.currentTime = 0.01;
    music.play().catch(() => {});
  }
}
function release() { hold = false; }

window.addEventListener("mousedown", press);
window.addEventListener("mouseup", release);
window.addEventListener("touchstart", press);
window.addEventListener("touchend", release);

/* ================= RESET ================= */
function resetGame() {
  y = canvas.height / 2;
  velocity = 0;
  zones = [];
  spawnTimer = 0;

  score = 0;
  BPM = 120;
  playTime = 0;

  crashed = false;
  playing = true;
  newRecord = false;

  expFrame = 0;
  expTick = 0;

  turbulenceState = true;
  turbulenceHold = 0;
  wasInZone = false;

  music.currentTime = 0;
}

/* ================= UPDATE ================= */
function update() {
  if (!playing) return;

  /* BEAT */
  if (!music.paused) {
    const interval = 60 / BPM;
    beatSafe = (music.currentTime % interval) < BEAT_WINDOW;
  } else {
    beatSafe = false;
  }

  /* TURBULENCE SMOOTH */
  if (turbulenceHold > 0) {
    turbulenceHold--;
  } else if (turbulenceState !== beatSafe) {
    turbulenceState = beatSafe;
    turbulenceHold = TURB_HOLD_TIME;
  }

  playTime++;
  if (playTime % (60 * 20) === 0) {
    BPM = Math.min(BPM + 5, 160);
  }

  /* PHYSICS */
  velocity += gravity;
  if (hold) {
    velocity -= thrust;
    camShake = 2;
  }

  velocity *= damping;
  velocity = Math.max(-maxSpeed, Math.min(maxSpeed, velocity));
  y += velocity;

  if (y < 0 || y > canvas.height) crash();

  /* SPAWN TURBULENCE */
  spawnTimer++;
  if (spawnTimer > 120) {
    spawnTimer = 0;
    zones.push({ x: canvas.width, w: 110 + Math.random() * 80 });
  }

  zones.forEach(z => z.x -= 3);
  zones = zones.filter(z => z.x > -200);

  /* CHECK ZONE */
  let inZone = false;

  zones.forEach(z => {
    if (plane.x > z.x && plane.x < z.x + z.w) {
      inZone = true;
      if (!beatSafe) {
        velocity += 0.9;
        camShake = 5;
      }
    }
  });

  /* SCORE: 1 turbulence terlewati */
  if (wasInZone && !inZone) score++;
  wasInZone = inZone;
}

/* ================= CRASH ================= */
function crash() {
  if (crashed) return;

  crashed = true;
  playing = false;

  crashX = plane.x;
  crashY = y;

  music.pause();

    explodeSound.currentTime = 0;
  explodeSound.play().catch(()=>{});


  if (score > highScore) {
    newRecord = true;
    setTimeout(() => {
      const name = prompt("REKOR BARU!\nMasukkan Nama:", "PLAYER");
      highScore = score;
      highName = name ? name.substring(0, 12) : "PLAYER";
      localStorage.setItem("highScore", highScore);
      localStorage.setItem("highName", highName);
    }, 300);
  }

  setTimeout(resetGame, 2200);
}

/* ================= TEXT HELPER ================= */
function drawText(text, x, y, size = 18) {
  ctx.font = `${size}px monospace`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#FFD700";
  ctx.fillText(text, x, y);
}

/* ================= DRAW ================= */
function draw() {
  /* BACKGROUND */
  bgX -= bgSpeed;
  if (bgX <= -bg.width) bgX = 0;
  ctx.drawImage(bg, bgX, 0, bg.width, canvas.height);
  ctx.drawImage(bg, bgX + bg.width, 0, bg.width, canvas.height);

  /* CAMERA */
  const sx = (Math.random() - 0.5) * camShake;
  const sy = (Math.random() - 0.5) * camShake;
  camShake *= 0.85;
  ctx.setTransform(1, 0, 0, 1, sx, sy);

  /* TURBULENCE */
  zones.forEach(z => {
    const img = turbulenceState ? turbSafeImg : turbPanicImg;
    ctx.drawImage(img, z.x, 0, z.w, canvas.height);
  });

  /* PLANE */
  if (!crashed) {
    ctx.save();
    ctx.translate(plane.x, y);
    ctx.rotate(Math.max(-0.4, Math.min(0.4, velocity * 0.05)));
    ctx.drawImage(planeImg, -plane.w/2, -plane.h/2, plane.w, plane.h);
    ctx.restore();
  }

  /* EXPLOSION */
  if (crashed && expFrame < EXP_FRAME_COUNT) {
    expTick++;
    if (expTick % EXP_FRAME_SPEED === 0) expFrame++;

    const fw = explodeImg.width / EXP_FRAME_COUNT;
    const fh = explodeImg.height;
    const size = fh * EXP_SCALE;

    ctx.drawImage(
      explodeImg,
      expFrame * fw, 0, fw, fh,
      crashX - size/2,
      crashY - size/2,
      size,
      size
    );
  }

  ctx.setTransform(1,0,0,1,0,0);

  /* UI */
  drawText(`SKOR: ${score}`, 20, 32);
  drawText(`SKOR TERTINGGI: ${highScore} (${highName})`, 20, 54, 14);
  drawText(`LEWAT 1 TURBULENCE = 1 POINT`, 20, 74, 14);
  drawText(`BPM: ${BPM}`, 20, 96, 14);

  if (!playing) {
    drawText(newRecord ? "REKOR BARU!" : "MELEDAKS", canvas.width/2 - 90, canvas.height/2 - 10, 32);
  }
}

/* ================= LOOP ================= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();



