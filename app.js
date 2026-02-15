import { generatePrediction } from './predictions.js';

const canvas = document.getElementById('orb-canvas');
const ctx = canvas.getContext('2d');

const nameInput = document.getElementById('name-input');
const predictBtn = document.getElementById('predict-btn');
const errorText = document.getElementById('error-text');
const predictionCard = document.getElementById('prediction-card');
const predictionText = document.getElementById('prediction-text');
const shareControls = document.getElementById('share-controls');
const exportBtn = document.getElementById('export-btn');
const shareBtn = document.getElementById('share-btn');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  name: '',
  status: 'idle',
  prediction: null,
  error: null,
  time: 0,
  flashUntil: 0,
  chargeUntil: 0,
  resultBurstUntil: 0
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
  const nowMs = performance.now();
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
  const currentRadius = radius + pulse;
  ctx.beginPath();
  ctx.arc(center, center, currentRadius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = orbGradient;
  ctx.fillRect(center - currentRadius, center - currentRadius, currentRadius * 2, currentRadius * 2);

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
    const ringCount = 4;
    for (let i = 0; i < ringCount; i += 1) {
      const ringOffset = (timeSec * 0.9 + i * 0.35) % 1;
      const ringRadius = radius * (0.2 + ringOffset * 0.9);
      ctx.beginPath();
      ctx.arc(center, center, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(208, 178, 255, ${0.18 * (1 - ringOffset)})`;
      ctx.lineWidth = 1.1 + (1 - ringOffset) * 1.2;
      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(176, 140, 255, 0.8)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

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

  if (state.chargeUntil > nowMs && !prefersReducedMotion) {
    const chargeLeft = (state.chargeUntil - nowMs) / 800;
    ctx.fillStyle = `rgba(235, 218, 255, ${0.18 + chargeLeft * 0.3})`;
    ctx.beginPath();
    ctx.arc(center, center, radius * (1 + (1 - chargeLeft) * 0.25), 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.flashUntil > nowMs) {
    ctx.fillStyle = 'rgba(238, 222, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(center, center, radius * 1.08, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.resultBurstUntil > nowMs && !prefersReducedMotion) {
    const burstLeft = (state.resultBurstUntil - nowMs) / 450;
    ctx.fillStyle = `rgba(250, 240, 255, ${0.32 * burstLeft})`;
    ctx.beginPath();
    ctx.arc(center, center, radius * (1.15 + (1 - burstLeft) * 0.4), 0, Math.PI * 2);
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

function updateShareControls() {
  const hasPrediction = Boolean(state.prediction);
  shareControls.hidden = !hasPrediction;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let offsetY = y;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, offsetY);
      line = `${words[i]} `;
      offsetY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, offsetY);
  return offsetY + lineHeight;
}

function createArtifactCanvas() {
  const size = 1080;
  const height = 1350;
  const padding = 90;
  const artifact = document.createElement('canvas');
  artifact.width = size;
  artifact.height = height;
  const actx = artifact.getContext('2d');

  const gradient = actx.createRadialGradient(size * 0.3, height * 0.2, 40, size * 0.5, height * 0.45, height);
  gradient.addColorStop(0, '#2a1146');
  gradient.addColorStop(0.5, '#110a22');
  gradient.addColorStop(1, '#06060a');
  actx.fillStyle = gradient;
  actx.fillRect(0, 0, size, height);

  actx.strokeStyle = 'rgba(206, 180, 255, 0.28)';
  actx.lineWidth = 2;
  actx.beginPath();
  actx.ellipse(size * 0.5, height * 0.34, 340, 330, Math.PI / 8, 0, Math.PI * 2);
  actx.stroke();

  const orbSize = 620;
  const orbX = (size - orbSize) / 2;
  const orbY = 140;
  const orbCenterX = orbX + orbSize / 2;
  const orbCenterY = orbY + orbSize / 2;
  const orbGlow = actx.createRadialGradient(
    orbCenterX,
    orbCenterY,
    orbSize * 0.15,
    orbCenterX,
    orbCenterY,
    orbSize * 0.62
  );
  orbGlow.addColorStop(0, 'rgba(170, 130, 255, 0.35)');
  orbGlow.addColorStop(1, 'rgba(80, 40, 160, 0)');
  actx.fillStyle = orbGlow;
  actx.beginPath();
  actx.arc(orbCenterX, orbCenterY, orbSize * 0.5, 0, Math.PI * 2);
  actx.fill();

  actx.drawImage(canvas, orbX, orbY, orbSize, orbSize);

  actx.fillStyle = '#f6f2ff';
  actx.textAlign = 'center';
  actx.font = '52px "Cinzel Decorative", serif';
  actx.fillText('Шепот шара', size / 2, orbY + orbSize + 90);

  actx.fillStyle = 'rgba(238, 230, 255, 0.9)';
  actx.textAlign = 'left';
  actx.font = '36px "Cormorant Garamond", serif';
  const textX = padding;
  const textY = orbY + orbSize + 150;
  const lineHeight = 48;
  const maxWidth = size - padding * 2;
  wrapText(actx, state.prediction.text, textX, textY, maxWidth, lineHeight);

  actx.fillStyle = 'rgba(206, 184, 255, 0.65)';
  actx.font = '26px "Cormorant Garamond", serif';
  actx.textAlign = 'center';
  actx.fillText('the-ball-of-predictions', size / 2, height - 60);

  return artifact;
}

async function exportArtifact() {
  if (!state.prediction) return;
  const artifact = createArtifactCanvas();
  const dataUrl = artifact.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `mystic-orb-${state.prediction.id}.png`;
  link.click();
}

async function shareArtifact() {
  if (!state.prediction) return;
  if (!navigator.share || !navigator.canShare) {
    await exportArtifact();
    return;
  }
  const artifact = createArtifactCanvas();
  const blob = await new Promise((resolve) => artifact.toBlob(resolve, 'image/png'));
  if (!blob) {
    setError('Не удалось собрать артефакт для шаринга.');
    return;
  }
  const file = new File([blob], 'mystic-orb.png', { type: 'image/png' });
  if (!navigator.canShare({ files: [file] })) {
    await exportArtifact();
    return;
  }
  try {
    await navigator.share({
      files: [file],
      title: 'Шепот шара',
      text: state.prediction.text
    });
  } catch (err) {
    setError('Шаринг отменен или недоступен.');
  }
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
    state.chargeUntil = performance.now() + 800;
    predictBtn.disabled = true;
    predictBtn.textContent = 'Шар размышляет…';
  } else {
    predictBtn.disabled = false;
    predictBtn.textContent = state.prediction ? 'Ещё одно предсказание' : 'Предсказать судьбу';
  }
  if (nextStatus === 'result') {
    state.resultBurstUntil = performance.now() + 450;
  }
}

async function runPrediction() {
  const cleanName = sanitizeName(nameInput.value);
  nameInput.value = cleanName;

  if (!cleanName) {
    setError('Введи имя, чтобы шар увидел нить судьбы.');
    predictionCard.hidden = true;
    predictionCard.classList.remove('is-visible');
    updateShareControls();
    return;
  }

  setError('');
  state.name = cleanName;
  if (shareControls) {
    shareControls.hidden = true;
  }
  setStatus('thinking');

  const delayMs = Math.floor(randomBetween(1500, 3500));
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  state.prediction = generatePrediction(cleanName, true);
  predictionText.textContent = state.prediction.text;
  predictionCard.hidden = false;
  predictionCard.classList.remove('is-visible');
  requestAnimationFrame(() => {
    predictionCard.classList.add('is-visible');
  });
  updateShareControls();
  setStatus('result');
}

predictBtn.addEventListener('click', runPrediction);
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') runPrediction();
});
exportBtn.addEventListener('click', exportArtifact);
if (shareBtn) {
  shareBtn.addEventListener('click', shareArtifact);
  if (!navigator.share || !navigator.canShare) {
    shareBtn.hidden = true;
  }
}

updateShareControls();

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(animationLoop);
