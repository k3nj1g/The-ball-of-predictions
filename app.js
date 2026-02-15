import { generatePrediction } from './predictions.js';

const canvas = document.getElementById('orb-canvas');
const ctx = canvas.getContext('2d');

const nameInput = document.getElementById('name-input');
const predictBtn = document.getElementById('predict-btn');
const errorText = document.getElementById('error-text');
const predictionCard = document.getElementById('prediction-card');
const predictionText = document.getElementById('prediction-text');
const shareControls = document.getElementById('share-controls');
const shareBtn = document.getElementById('share-btn');
const copyBtn = document.getElementById('copy-btn');
const tgLink = document.getElementById('tg-link');
const vkLink = document.getElementById('vk-link');
const xLink = document.getElementById('x-link');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  name: '',
  status: 'idle',
  prediction: null,
  error: null,
  time: 0,
  flashUntil: 0
};

const modeSettings = {
  idle: { pulse: 0.1, glow: 0.7, speed: 0.45, lightningChance: 0.05 },
  thinking: { pulse: 0.55, glow: 1.28, speed: 1.7, lightningChance: 0.3 },
  result: { pulse: 0.18, glow: 0.85, speed: 0.62, lightningChance: 0.08 }
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const size = Math.min(canvas.clientWidth, canvas.clientHeight) || 360;
  canvas.width = size * ratio;
  canvas.height = size * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function drawOrb(timeSec) {
  const size = Math.min(canvas.clientWidth, canvas.clientHeight);
  const center = size / 2;
  const radius = size * 0.33;
  const mode = modeSettings[state.status];
  const pulse = prefersReducedMotion ? 0 : Math.sin(timeSec * (2 + mode.speed)) * radius * mode.pulse * 0.08;
  const thinkingIntensity = state.status === 'thinking' ? 1 : 0;
  const arcFlicker = prefersReducedMotion
    ? 0
    : (Math.sin(timeSec * 24) * 0.5 + Math.sin(timeSec * 41) * 0.35 + Math.random() * 0.25) * thinkingIntensity;

  ctx.clearRect(0, 0, size, size);

  const glowGradient = ctx.createRadialGradient(center, center, radius * 0.2, center, center, radius * 1.3);
  glowGradient.addColorStop(0, `rgba(206, 168, 255, ${(0.45 + arcFlicker * 0.18) * mode.glow})`);
  glowGradient.addColorStop(0.55, `rgba(102, 51, 182, ${(0.36 + arcFlicker * 0.08) * mode.glow})`);
  glowGradient.addColorStop(1, 'rgba(17, 7, 34, 0)');

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(center, center, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  const orbGradient = ctx.createRadialGradient(
    center - radius * 0.28,
    center - radius * 0.28,
    radius * 0.1,
    center,
    center,
    radius + pulse
  );
  orbGradient.addColorStop(0, `rgba(247, 230, 255, ${(0.9 + arcFlicker * 0.12) * mode.glow})`);
  orbGradient.addColorStop(0.3, `rgba(174, 120, 255, ${(0.75 + arcFlicker * 0.18) * mode.glow})`);
  orbGradient.addColorStop(0.7, `rgba(58, 23, 120, ${0.85 * mode.glow})`);
  orbGradient.addColorStop(1, 'rgba(11, 5, 26, 1)');

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius + pulse, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = orbGradient;
  ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);

  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2 + timeSec * mode.speed * 0.15;
    const wave = Math.sin(timeSec * (1.2 + i * 0.02) + i) * radius * 0.18;
    const x = center + Math.cos(angle) * wave;
    const y = center + Math.sin(angle * 1.2) * wave;

    ctx.fillStyle = `rgba(196, 148, 255, ${0.07 * mode.glow})`;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.status === 'thinking' && !prefersReducedMotion) {
    const arcs = 5;
    for (let i = 0; i < arcs; i += 1) {
      const start = timeSec * mode.speed + i * 0.9;
      const sweep = 0.45 + Math.sin(timeSec * 5 + i) * 0.18;
      ctx.beginPath();
      ctx.arc(center, center, radius * (0.45 + i * 0.11), start, start + sweep);
      ctx.strokeStyle = `rgba(223, 189, 255, ${0.18 + Math.abs(arcFlicker) * 0.22})`;
      ctx.lineWidth = 1.4;
      ctx.shadowBlur = 16;
      ctx.shadowColor = 'rgba(187, 156, 255, 0.9)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  if (Math.random() < mode.lightningChance && !prefersReducedMotion) {
    const bolts = state.status === 'thinking' ? 10 : 3;
    for (let i = 0; i < bolts; i += 1) {
      drawLightning(center, center, radius);
    }
  }

  ctx.restore();

  if (state.flashUntil > performance.now()) {
    ctx.fillStyle = 'rgba(238, 222, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(center, center, radius * 1.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLightning(center, centerY, radius) {
  const startAngle = randomBetween(0, Math.PI * 2);
  const endAngle = startAngle + randomBetween(-1, 1);
  const startX = center + Math.cos(startAngle) * randomBetween(radius * 0.1, radius * 0.55);
  const startY = centerY + Math.sin(startAngle) * randomBetween(radius * 0.1, radius * 0.55);
  const endX = center + Math.cos(endAngle) * randomBetween(radius * 0.4, radius * 0.95);
  const endY = centerY + Math.sin(endAngle) * randomBetween(radius * 0.4, radius * 0.95);

  const segments = 8;
  let x = startX;
  let y = startY;

  ctx.beginPath();
  ctx.moveTo(x, y);

  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    const nx = startX + (endX - startX) * t + randomBetween(-6, 6);
    const ny = startY + (endY - startY) * t + randomBetween(-6, 6);
    ctx.lineTo(nx, ny);
    x = nx;
    y = ny;
  }

  ctx.lineTo(endX, endY);
  ctx.strokeStyle = 'rgba(223, 233, 255, 0.75)';
  ctx.lineWidth = 1.2;
  ctx.shadowBlur = 12;
  ctx.shadowColor = 'rgba(170, 196, 255, 0.9)';
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function animationLoop(now) {
  state.time = now / 1000;
  drawOrb(state.time);
  requestAnimationFrame(animationLoop);
}

function setError(message = '') {
  state.error = message;
  errorText.hidden = !message;
  errorText.textContent = message;
}

function sanitizeName(raw) {
  return raw
    .replace(/[^\p{L}\s-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 32);
}

function setStatus(nextStatus) {
  state.status = nextStatus;
  if (nextStatus === 'thinking') {
    state.flashUntil = performance.now() + 260;
    predictBtn.disabled = true;
    predictBtn.textContent = 'Шар размышляет…';
  } else {
    predictBtn.disabled = false;
    predictBtn.textContent = state.prediction ? 'Ещё одно предсказание' : 'Предсказать судьбу';
  }
}

function buildSharePayload() {
  if (!state.prediction) return null;

  const url = window.location.href;
  const text = `${state.prediction.text} — Мой мистический прогноз.`;
  return {
    title: 'Мистический шар',
    text,
    url,
    encodedText: encodeURIComponent(`${text.slice(0, 220)} ${url}`)
  };
}

function updateShareLinks() {
  const payload = buildSharePayload();
  if (!payload) return;

  tgLink.href = `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text.slice(0, 180))}`;
  vkLink.href = `https://vk.com/share.php?url=${encodeURIComponent(payload.url)}&comment=${encodeURIComponent(payload.text.slice(0, 180))}`;
  xLink.href = `https://twitter.com/intent/tweet?text=${payload.encodedText}`;
}

async function runPrediction() {
  const cleanName = sanitizeName(nameInput.value);
  nameInput.value = cleanName;

  if (!cleanName) {
    setError('Введи имя, чтобы шар увидел нить судьбы.');
    predictionCard.hidden = true;
    shareControls.hidden = true;
    return;
  }

  setError('');
  state.name = cleanName;
  setStatus('thinking');

  const delayMs = Math.floor(randomBetween(1500, 3500));
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  state.prediction = generatePrediction(cleanName, true);
  predictionText.textContent = state.prediction.text;
  predictionCard.hidden = false;
  shareControls.hidden = false;
  setStatus('result');
  updateShareLinks();
}

predictBtn.addEventListener('click', runPrediction);
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') runPrediction();
});

shareBtn.addEventListener('click', async () => {
  const payload = buildSharePayload();
  if (!payload) return;

  if (navigator.share) {
    try {
      await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
      return;
    } catch {
      // Ignore and fallback to copy below
    }
  }

  try {
    await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
    copyBtn.textContent = 'Скопировано!';
    setTimeout(() => {
      copyBtn.textContent = 'Скопировать';
    }, 1400);
  } catch {
    setError('Не удалось поделиться. Скопируй текст вручную.');
  }
});

copyBtn.addEventListener('click', async () => {
  const payload = buildSharePayload();
  if (!payload) return;

  try {
    await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
    copyBtn.textContent = 'Скопировано!';
    setTimeout(() => {
      copyBtn.textContent = 'Скопировать';
    }, 1400);
  } catch {
    setError('Буфер обмена недоступен.');
  }
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(animationLoop);
