const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");

const threshold = document.getElementById("threshold");
const cellSize = document.getElementById("cellSize");
const contrast = document.getElementById("contrast");
const angle = document.getElementById("angle");
const density = document.getElementById("density");

const thresholdValue = document.getElementById("thresholdValue");
const cellSizeValue = document.getElementById("cellSizeValue");
const contrastValue = document.getElementById("contrastValue");
const angleValue = document.getElementById("angleValue");
const densityValue = document.getElementById("densityValue");

const invert = document.getElementById("invert");
const laserMode = document.getElementById("laserMode");
const compareMode = document.getElementById("compareMode");

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const sourceCanvas = document.getElementById("sourceCanvas");
const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
const alphaCanvas = document.getElementById("alphaCanvas");
const alphaCtx = alphaCanvas.getContext("2d");
const originalCanvas = document.getElementById("originalCanvas");
const originalCtx = originalCanvas.getContext("2d");

const emptyState = document.getElementById("emptyState");
const originalBox = document.getElementById("originalBox");
const compareWrap = document.getElementById("compareWrap");
const imageInfo = document.getElementById("imageInfo");

const jpgBtn = document.getElementById("jpgBtn");
const pngBtn = document.getElementById("pngBtn");
const dxfBtn = document.getElementById("dxfBtn");
const resetBtn = document.getElementById("resetBtn");
const shapeButtons = [...document.querySelectorAll(".shape-btn")];

let img = null;
let currentShape = "dots";
let renderTimer = null;

fileInput.addEventListener("change", (e) => handleFile(e.target.files?.[0]));

["dragenter", "dragover"].forEach((name) => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach((name) => {
  dropZone.addEventListener(name, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});
dropZone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files?.[0]));

[
  [threshold, thresholdValue, v => v],
  [cellSize, cellSizeValue, v => `${v} px`],
  [contrast, contrastValue, v => v],
  [angle, angleValue, v => `${v}°`],
  [density, densityValue, v => `${v}%`],
].forEach(([input, output, format]) => {
  input.addEventListener("input", () => {
    output.value = format(input.value);
    queueRender();
  });
});

[invert, laserMode].forEach(el => el.addEventListener("change", render));

compareMode.addEventListener("change", () => {
  originalBox.hidden = !compareMode.checked;
  compareWrap.classList.toggle("compare-on", compareMode.checked);
});

shapeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    shapeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentShape = btn.dataset.shape;
    render();
  });
});

resetBtn.addEventListener("click", resetControls);
jpgBtn.addEventListener("click", exportJPG);
pngBtn.addEventListener("click", exportTransparentPNG);
dxfBtn.addEventListener("click", exportDXF);

function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("請選擇圖片檔案。");
    return;
  }

  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    img = image;

    const maxDimension = 2400;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));

    sourceCanvas.width = originalCanvas.width = canvas.width = alphaCanvas.width = w;
    sourceCanvas.height = originalCanvas.height = canvas.height = alphaCanvas.height = h;

    sourceCtx.clearRect(0, 0, w, h);
    sourceCtx.drawImage(image, 0, 0, w, h);

    originalCtx.clearRect(0, 0, w, h);
    originalCtx.drawImage(image, 0, 0, w, h);

    emptyState.hidden = true;
    canvas.hidden = false;
    [jpgBtn, pngBtn, dxfBtn, resetBtn].forEach(b => b.disabled = false);

    imageInfo.textContent =
      `${image.naturalWidth} × ${image.naturalHeight}px` +
      (scale < 1 ? `（處理尺寸 ${w} × ${h}px）` : "");

    render();
    URL.revokeObjectURL(url);
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    alert("圖片讀取失敗。");
  };

  image.src = url;
}

function resetControls() {
  threshold.value = 128;
  cellSize.value = 8;
  contrast.value = 0;
  angle.value = 45;
  density.value = 100;
  invert.checked = false;
  laserMode.checked = false;
  compareMode.checked = false;

  thresholdValue.value = 128;
  cellSizeValue.value = "8 px";
  contrastValue.value = 0;
  angleValue.value = "45°";
  densityValue.value = "100%";

  currentShape = "dots";
  shapeButtons.forEach((b) => b.classList.toggle("active", b.dataset.shape === "dots"));
  originalBox.hidden = true;
  compareWrap.classList.remove("compare-on");

  render();
}

function queueRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 25);
}

function render() {
  if (!img) return;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const data = sourceCtx.getImageData(0, 0, w, h).data;

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";

  const baseSize = parseInt(cellSize.value, 10);
  const densityFactor = parseInt(density.value, 10) / 100;
  const size = Math.max(2, Math.round(baseSize / densityFactor));
  const t = parseInt(threshold.value, 10);
  const c = parseInt(contrast.value, 10);
  const ang = parseInt(angle.value, 10) * Math.PI / 180;
  const isLaser = laserMode.checked;

  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const brightness = cellBrightness(data, w, h, x, y, size, c);
      let darkness = 1 - brightness / 255;
      darkness = clamp(darkness + ((t - 128) / 128) * 0.55, 0, 1);

      if (isLaser) {
        // 雷雕模式：去掉極細節、提高可雕刻性。
        darkness = darkness < 0.16 ? 0 : darkness;
        darkness = darkness > 0.86 ? 1 : darkness;
      }

      if (invert.checked) darkness = 1 - darkness;
      if (darkness < 0.035) continue;

      drawCell(x, y, size, darkness, currentShape, ang, isLaser);
    }
  }

  ctx.restore();
}

function cellBrightness(data, w, h, startX, startY, size, contrastAmount) {
  let total = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(size / 4));

  for (let y = startY; y < Math.min(startY + size, h); y += step) {
    for (let x = startX; x < Math.min(startX + size, w); x += step) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      const factor = (259 * (contrastAmount + 255)) / (255 * (259 - contrastAmount));
      gray = factor * (gray - 128) + 128;

      total += clamp(gray, 0, 255);
      count++;
    }
  }
  return total / Math.max(1, count);
}

function drawCell(x, y, size, darkness, shape, ang, laser) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const minFeature = laser ? 1.4 : 0;

  if (shape === "dots") {
    const maxR = size * 0.72;
    const radius = Math.max(minFeature / 2, Math.sqrt(darkness) * maxR);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (shape === "square") {
    const side = Math.max(minFeature, Math.sqrt(darkness) * size * 1.08);
    ctx.fillRect(cx - side / 2, cy - side / 2, side, side);
    return;
  }

  if (shape === "diamond") {
    const half = Math.max(minFeature / 2, Math.sqrt(darkness) * size * 0.82);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half, 0);
    ctx.lineTo(0, half);
    ctx.lineTo(-half, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (shape === "lines") {
    const lineWidth = Math.max(minFeature, darkness * size * 0.75);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "square";
    const span = size * 1.6;
    ctx.beginPath();
    ctx.moveTo(-span / 2, 0);
    ctx.lineTo(span / 2, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function exportJPG() {
  if (!img) return;
  // JPG 不支援透明，使用白底。
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const octx = out.getContext("2d");
  octx.fillStyle = "#fff";
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(canvas, 0, 0);

  downloadDataURL(out.toDataURL("image/jpeg", 0.95), "halftone-black-white.jpg");
}

function exportTransparentPNG() {
  if (!img) return;

  alphaCanvas.width = canvas.width;
  alphaCanvas.height = canvas.height;
  alphaCtx.clearRect(0, 0, alphaCanvas.width, alphaCanvas.height);

  const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = alphaCtx.createImageData(canvas.width, canvas.height);

  for (let i = 0; i < src.data.length; i += 4) {
    const gray = (src.data[i] + src.data[i+1] + src.data[i+2]) / 3;
    const alpha = 255 - gray;

    out.data[i] = 0;
    out.data[i+1] = 0;
    out.data[i+2] = 0;
    out.data[i+3] = alpha;
  }

  alphaCtx.putImageData(out, 0, 0);
  downloadDataURL(alphaCanvas.toDataURL("image/png"), "halftone-transparent.png");
}

function exportDXF() {
  if (!img) return;

  const w = canvas.width;
  const h = canvas.height;

  // 為避免節點爆量，DXF 邊界採縮小二值圖追蹤。
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  const temp = document.createElement("canvas");
  temp.width = sw;
  temp.height = sh;
  const tctx = temp.getContext("2d", { willReadFrequently: true });
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(canvas, 0, 0, sw, sh);

  const imgData = tctx.getImageData(0, 0, sw, sh).data;
  const binary = new Uint8Array(sw * sh);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      const gray = (imgData[i] + imgData[i+1] + imgData[i+2]) / 3;
      binary[y * sw + x] = gray < 128 ? 1 : 0;
    }
  }

  const segments = marchingSquaresSegments(binary, sw, sh);
  const polylines = chainSegments(segments);

  // 將座標還原為原圖像素，Y 軸反轉成 CAD 習慣方向。
  const invScale = 1 / scale;
  const dxf = buildDXF(polylines, invScale, h);

  const blob = new Blob([dxf], { type: "application/dxf;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "halftone-outline.dxf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function marchingSquaresSegments(bin, w, h) {
  const segments = [];
  const at = (x, y) => (x >= 0 && x < w && y >= 0 && y < h) ? bin[y*w+x] : 0;

  // 每個黑色像素若鄰邊為白色，就把該邊加入輪廓。
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;

      if (!at(x, y-1)) segments.push([[x, y], [x+1, y]]);
      if (!at(x+1, y)) segments.push([[x+1, y], [x+1, y+1]]);
      if (!at(x, y+1)) segments.push([[x+1, y+1], [x, y+1]]);
      if (!at(x-1, y)) segments.push([[x, y+1], [x, y]]);
    }
  }
  return segments;
}

function chainSegments(segments) {
  const key = p => `${p[0]},${p[1]}`;
  const map = new Map();

  segments.forEach((seg, idx) => {
    const k = key(seg[0]);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(idx);
  });

  const used = new Uint8Array(segments.length);
  const lines = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;

    const line = [segments[i][0], segments[i][1]];
    used[i] = 1;
    let current = segments[i][1];

    while (true) {
      const candidates = map.get(key(current)) || [];
      const nextIndex = candidates.find(idx => !used[idx]);
      if (nextIndex === undefined) break;

      used[nextIndex] = 1;
      current = segments[nextIndex][1];
      line.push(current);

      if (line.length > 4 && key(current) === key(line[0])) break;
      if (line.length > 200000) break;
    }

    if (line.length >= 3) lines.push(simplifyPolyline(line, 0.7));
  }
  return lines;
}

function simplifyPolyline(points, tolerance) {
  if (points.length <= 3) return points;

  const out = [points[0]];
  let last = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dx = p[0] - last[0];
    const dy = p[1] - last[1];
    if (Math.hypot(dx, dy) >= tolerance) {
      out.push(p);
      last = p;
    }
  }

  out.push(points[points.length - 1]);
  return out;
}

function buildDXF(polylines, scale, originalHeight) {
  const out = [];
  out.push("0","SECTION","2","HEADER","0","ENDSEC");
  out.push("0","SECTION","2","ENTITIES");

  for (const pts of polylines) {
    if (pts.length < 2) continue;

    out.push("0","LWPOLYLINE");
    out.push("8","HALFTONE");
    out.push("90", String(pts.length));
    out.push("70", keyPointEqual(pts[0], pts[pts.length - 1]) ? "1" : "0");

    for (const p of pts) {
      const x = p[0] * scale;
      const y = originalHeight - p[1] * scale;
      out.push("10", x.toFixed(3));
      out.push("20", y.toFixed(3));
    }
  }

  out.push("0","ENDSEC","0","EOF");
  return out.join("\n");
}

function keyPointEqual(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1];
}

function downloadDataURL(dataURL, filename) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  a.click();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
