const $ = (id) => document.getElementById(id);

const modeGate = $("modeGate");
const mainApp = $("mainApp");
const backModeBtn = $("backModeBtn");
const modeDesc = $("modeDesc");
const enterModeButtons = [...document.querySelectorAll("[data-enter-mode]")];

const fileInput = $("fileInput");
const dropZone = $("dropZone");
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const sourceCanvas = $("sourceCanvas");
const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
const alphaCanvas = $("alphaCanvas");
const alphaCtx = alphaCanvas.getContext("2d");

const emptyState = $("emptyState");
const imageInfo = $("imageInfo");
const resultLabel = $("resultLabel");
const toggleOriginalBtn = $("toggleOriginalBtn");
const previewViewport = $("previewViewport");
const canvasStage = $("canvasStage");
const zoomOutBtn = $("zoomOutBtn");
const zoomResetBtn = $("zoomResetBtn");
const zoomInBtn = $("zoomInBtn");

const jpgBtn = $("jpgBtn");
const pngBtn = $("pngBtn");
const dxfBtn = $("dxfBtn");
const resetBtn = $("resetBtn");

const threshold = $("threshold");
const cellSize = $("cellSize");
const contrast = $("contrast");
const angle = $("angle");
const density = $("density");
const thresholdValue = $("thresholdValue");
const cellSizeValue = $("cellSizeValue");
const contrastValue = $("contrastValue");
const angleValue = $("angleValue");
const densityValue = $("densityValue");

const edgeSensitivity = $("edgeSensitivity");
const lineWidth = $("lineWidth");
const smooth = $("smooth");
const detailFilter = $("detailFilter");
const edgeSensitivityValue = $("edgeSensitivityValue");
const lineWidthValue = $("lineWidthValue");
const smoothValue = $("smoothValue");
const detailFilterValue = $("detailFilterValue");
const majorOutline = $("majorOutline");

const invert = $("invert");
const outlineMode = $("outlineMode");
const outlineControls = $("outlineControls");
const outlineExpand = $("outlineExpand");
const outlineExpandValue = $("outlineExpandValue");
const halftoneControls = $("halftoneControls");
const lineartControls = $("lineartControls");

const shapeButtons = [...document.querySelectorAll(".shape-btn")];

let img = null;
let currentMode = window.LASERTOOL_SELECTED_MODE || null;
let currentShape = "dots";
let renderTimer = null;
let showingOriginal = false;
let previewScale = 1;
let previewOffsetX = 0;
let previewOffsetY = 0;
let previewDragging = false;
let previewNeedsInitialFit = false;
let previewDragStartX = 0;
let previewDragStartY = 0;
let previewDragOriginX = 0;
let previewDragOriginY = 0;

// 模式按鈕由 index.html 的 LASERTOOL_ENTER() 直接處理。
window.addEventListener("lasertool-mode-change", (event) => {
  const mode = event.detail?.mode;
  if (!mode) return;
  currentMode = mode;
  const isHalftone = mode === "halftone";
  halftoneControls.hidden = !isHalftone;
  lineartControls.hidden = isHalftone;
  resultLabel.textContent = isHalftone ? "網點結果" : "黑線稿結果";
  modeDesc.textContent = isHalftone ? "目前模式：網點模式" : "目前模式：黑線稿模式";
  render();
});

backModeBtn.addEventListener("click", () => {
  mainApp.hidden = true;
  modeGate.hidden = false;
});

function enterMode(mode) {
  currentMode = mode;
  modeGate.hidden = true;
  mainApp.hidden = false;

  const isHalftone = mode === "halftone";
  halftoneControls.hidden = !isHalftone;
  lineartControls.hidden = isHalftone;
  resultLabel.textContent = isHalftone ? "網點結果" : "黑線稿結果";
  modeDesc.textContent = isHalftone ? "目前模式：網點模式" : "目前模式：黑線稿模式";

  render();
}

toggleOriginalBtn.addEventListener("click", () => {
  if (!img) return;
  showingOriginal = !showingOriginal;
  toggleOriginalBtn.classList.toggle("active", showingOriginal);
  toggleOriginalBtn.textContent = showingOriginal ? "返回處理結果" : "查看原圖";
  resultLabel.textContent = showingOriginal
    ? "原圖"
    : (currentMode === "halftone" ? "網點結果" : "黑線稿結果");

  if (showingOriginal) {
    const pad = getOutputPadding();
    setOutputCanvasSize();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(sourceCanvas,pad,pad);
  } else {
    render();
  }
});


function applyPreviewTransform() {
  canvasStage.style.transform = `translate(${previewOffsetX}px, ${previewOffsetY}px) scale(${previewScale})`;
  zoomResetBtn.textContent = `${Math.round(previewScale * 100)}%`;
}

function resetPreviewTransform(fit = true) {
  if (!previewViewport || !canvas.width || !canvas.height) return;

  if (fit && sourceCanvas.width && sourceCanvas.height) {
    // 匯入圖片時，以「原圖內容」而不是整個預留畫布來計算適合大小。
    // 這樣即使已預留 50% 外框空間，主圖一開始也不會顯得太小。
    const margin = 28;
    const vw = Math.max(1, previewViewport.clientWidth - margin * 2);
    const vh = Math.max(1, previewViewport.clientHeight - margin * 2);

    previewScale = Math.min(
      1,
      vw / sourceCanvas.width,
      vh / sourceCanvas.height
    );

    const pad = getOutputPadding();

    // 將「原圖區域」置中在預覽視窗，而不是把整張擴大後畫布置中。
    previewOffsetX =
      previewViewport.clientWidth / 2 -
      (pad + sourceCanvas.width / 2) * previewScale;

    previewOffsetY =
      previewViewport.clientHeight / 2 -
      (pad + sourceCanvas.height / 2) * previewScale;
  } else {
    // 100%：維持原尺寸，但仍以原圖內容置中。
    previewScale = 1;
    const pad = getOutputPadding();

    previewOffsetX =
      previewViewport.clientWidth / 2 -
      (pad + sourceCanvas.width / 2);

    previewOffsetY =
      previewViewport.clientHeight / 2 -
      (pad + sourceCanvas.height / 2);
  }

  applyPreviewTransform();
}

function setPreviewScale(nextScale, anchorX = null, anchorY = null) {
  if (!previewViewport) return;
  const oldScale = previewScale;
  const newScale = Math.max(0.1, Math.min(5, nextScale));
  const rect = previewViewport.getBoundingClientRect();
  const ax = anchorX ?? rect.width / 2;
  const ay = anchorY ?? rect.height / 2;
  const contentX = (ax - previewOffsetX) / oldScale;
  const contentY = (ay - previewOffsetY) / oldScale;
  previewScale = newScale;
  previewOffsetX = ax - contentX * newScale;
  previewOffsetY = ay - contentY * newScale;
  applyPreviewTransform();
}

zoomInBtn.addEventListener("click", () => setPreviewScale(previewScale * 1.2));
zoomOutBtn.addEventListener("click", () => setPreviewScale(previewScale / 1.2));
zoomResetBtn.addEventListener("click", () => resetPreviewTransform(false));

previewViewport.addEventListener("wheel", e => {
  if (!img) return;
  e.preventDefault();
  const rect = previewViewport.getBoundingClientRect();
  const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
  setPreviewScale(previewScale * factor, e.clientX - rect.left, e.clientY - rect.top);
},{passive:false});

previewViewport.addEventListener("pointerdown", e => {
  if (!img) return;
  previewDragging = true;
  previewViewport.classList.add("dragging");
  previewDragStartX = e.clientX;
  previewDragStartY = e.clientY;
  previewDragOriginX = previewOffsetX;
  previewDragOriginY = previewOffsetY;
  previewViewport.setPointerCapture(e.pointerId);
});

previewViewport.addEventListener("pointermove", e => {
  if (!previewDragging) return;
  previewOffsetX = previewDragOriginX + (e.clientX - previewDragStartX);
  previewOffsetY = previewDragOriginY + (e.clientY - previewDragStartY);
  applyPreviewTransform();
});

function endPreviewDrag(e){
  if (!previewDragging) return;
  previewDragging = false;
  previewViewport.classList.remove("dragging");
  try { previewViewport.releasePointerCapture(e.pointerId); } catch(_) {}
}
previewViewport.addEventListener("pointerup", endPreviewDrag);
previewViewport.addEventListener("pointercancel", endPreviewDrag);
window.addEventListener("resize", () => {
  if (img) resetPreviewTransform(true);
});

fileInput.addEventListener("change", e => handleFile(e.target.files?.[0]));

["dragenter","dragover"].forEach(name => dropZone.addEventListener(name, e => {
  e.preventDefault();
  dropZone.classList.add("dragover");
}));
["dragleave","drop"].forEach(name => dropZone.addEventListener(name, e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
}));
dropZone.addEventListener("drop", e => handleFile(e.dataTransfer.files?.[0]));

[
  [threshold, thresholdValue, v => v],
  [cellSize, cellSizeValue, v => `${v} px`],
  [contrast, contrastValue, v => v],
  [angle, angleValue, v => `${v}°`],
  [density, densityValue, v => `${v}%`],
  [edgeSensitivity, edgeSensitivityValue, v => v],
  [lineWidth, lineWidthValue, v => v],
  [smooth, smoothValue, v => v],
  [detailFilter, detailFilterValue, v => v]
].forEach(([input, output, fmt]) => {
  input.addEventListener("input", () => {
    output.value = fmt(input.value);
    queueRender();
  });
});

[invert, majorOutline].forEach(el => el.addEventListener("change", render));

outlineMode.addEventListener("change", () => {
  outlineControls.hidden = !outlineMode.checked;
  render();
});

outlineExpand.addEventListener("input", () => {
  outlineExpandValue.value = `${outlineExpand.value}%`;
  queueRender();
});



shapeButtons.forEach(btn => btn.addEventListener("click", () => {
  currentShape = btn.dataset.shape;
  shapeButtons.forEach(b => b.classList.toggle("active", b === btn));
  render();
}));

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
    previewNeedsInitialFit = true;
    const maxDimension = 2400;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));

    [sourceCanvas, canvas, alphaCanvas].forEach(c => {
      c.width = w;
      c.height = h;
    });

    sourceCtx.clearRect(0,0,w,h);
    sourceCtx.drawImage(image,0,0,w,h);

    emptyState.hidden = true;
    canvas.hidden = false;
    [jpgBtn,pngBtn,dxfBtn,resetBtn,toggleOriginalBtn,zoomOutBtn,zoomResetBtn,zoomInBtn].forEach(b => b.disabled = false);

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
  showingOriginal = false;
  toggleOriginalBtn.classList.remove("active");
  toggleOriginalBtn.textContent = "查看原圖";
  threshold.value = 128;
  cellSize.value = 8;
  contrast.value = 0;
  angle.value = 45;
  density.value = 100;

  edgeSensitivity.value = 90;
  lineWidth.value = 2;
  smooth.value = 1;
  detailFilter.value = 2;

  thresholdValue.value = 128;
  cellSizeValue.value = "8 px";
  contrastValue.value = 0;
  angleValue.value = "45°";
  densityValue.value = "100%";

  edgeSensitivityValue.value = 90;
  lineWidthValue.value = 2;
  smoothValue.value = 1;
  detailFilterValue.value = 2;

  invert.checked = false;
  outlineMode.checked = false;
  outlineControls.hidden = true;
  outlineExpand.value = 5;
  outlineExpandValue.value = "5%";
  majorOutline.checked = false;

  currentShape = "dots";
  shapeButtons.forEach(b => b.classList.toggle("active", b.dataset.shape === "dots"));


  render();
}

function queueRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 30);
}

function getOutlineExpandPixels() {
  if (!sourceCanvas.width || !sourceCanvas.height) return 0;

  // 使用整張圖片「短邊」作為百分比基準。
  // 例如 1000×600 圖片設定 10%，外擴距離 = 60px。
  const percent = Math.max(0, +outlineExpand.value) / 100;
  const base = Math.min(sourceCanvas.width, sourceCanvas.height);
  return Math.max(1, Math.round(base * percent));
}

function getOutputPadding() {
  if (!sourceCanvas.width || !sourceCanvas.height) return 0;

  // 圖片匯入時就一次預留最大可外擴範圍。
  // 外擴比例從 1% 調到 50% 時，畫布尺寸與圖片位置都保持固定。
  const maxPercent = Math.max(0, +(outlineExpand.max || 50)) / 100;
  const base = Math.min(sourceCanvas.width, sourceCanvas.height);
  const maxExpand = Math.round(base * maxPercent);

  // 額外保留 8px，避免最外圈貼邊。
  return maxExpand + 8;
}

function setOutputCanvasSize() {
  if (!sourceCanvas.width || !sourceCanvas.height) return 0;
  const pad = getOutputPadding();
  const targetW = sourceCanvas.width + pad * 2;
  const targetH = sourceCanvas.height + pad * 2;
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  return pad;
}

function updateImageInfo() {
  if (!sourceCanvas.width || !sourceCanvas.height) return;
  imageInfo.textContent = `${sourceCanvas.width} × ${sourceCanvas.height}px｜預留畫布 ${canvas.width} × ${canvas.height}px`;
}

function render() {
  if (!img || !currentMode) return;

  // v6.12：任何處理結果繪製前，都先建立正確的預留畫布尺寸。
  // 避免第一次匯入仍使用原圖尺寸，造成處理結果被裁切到右下角。
  setOutputCanvasSize();
  updateImageInfo();

  showingOriginal = false;
  toggleOriginalBtn.classList.remove("active");
  toggleOriginalBtn.textContent = "查看原圖";
  resultLabel.textContent = currentMode === "halftone" ? "網點結果" : "黑線稿結果";
  if (currentMode === "lineart") renderLineArt();
  else renderHalftone();
  if (previewNeedsInitialFit) {
    previewNeedsInitialFit = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resetPreviewTransform(true));
    });
  }
}

function renderHalftone() {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const pad = getOutputPadding();
  const data = sourceCtx.getImageData(0,0,w,h).data;

  ctx.save();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.translate(pad,pad);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";

  const baseSize = +cellSize.value;
  const densityFactor = +density.value / 100;
  const size = Math.max(2, Math.round(baseSize / densityFactor));
  const t = +threshold.value;
  const c = +contrast.value;
  const ang = +angle.value * Math.PI / 180;

  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const brightness = cellBrightness(data,w,h,x,y,size,c);
      let darkness = 1 - brightness / 255;
      darkness = clamp(darkness + ((t - 128) / 128) * 0.55, 0, 1);

      if (invert.checked) darkness = 1 - darkness;
      if (darkness < 0.035) continue;

      drawCell(x,y,size,darkness,currentShape,ang,false);
    }
  }

  ctx.restore();
  if (outlineMode.checked) applyExpandedOutline();
}

function renderLineArt() {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const src = sourceCtx.getImageData(0,0,w,h);
  let gray = rgbaToGray(src.data,w,h);

  const blurRadius = +smooth.value;
  if (blurRadius > 0) gray = boxBlur(gray,w,h,blurRadius);

  const edges = sobel(gray,w,h);
  const thresholdValue = +edgeSensitivity.value;
  const detail = +detailFilter.value;
  let binary = new Uint8Array(w*h);

  for (let i = 0; i < edges.length; i++) {
    binary[i] = edges[i] >= thresholdValue ? 1 : 0;
  }

  if (detail > 0) {
    binary = removeSparse(binary,w,h,detail);
  }

  if (majorOutline.checked) {
    binary = keepStrongNeighborhood(binary,w,h);
  }

  const thickness = +lineWidth.value;
  if (thickness > 1) {
    binary = dilate(binary,w,h,thickness - 1);
  }

  const pad = getOutputPadding();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const out = ctx.createImageData(w,h);
  for (let i = 0; i < binary.length; i++) {
    const isBlack = invert.checked ? !binary[i] : !!binary[i];
    const v = isBlack ? 0 : 255;
    const p = i*4;
    out.data[p] = v;
    out.data[p+1] = v;
    out.data[p+2] = v;
    out.data[p+3] = 255;
  }

  ctx.putImageData(out,pad,pad);
  if (outlineMode.checked) applyExpandedOutline();
}

function applyExpandedOutline() {
  const w = canvas.width, h = canvas.height;
  if (!w || !h) return;

  /*
   * v6.2：
   * 外框不再從「網點/線稿處理結果」抓輪廓，
   * 而是固定從原始圖片抓最外層主體輪廓。
   * 因此調整臨界值、網點大小、對比、密度等參數時，
   * 中間的黑白細節不會再產生新的外框。
   */
  const pad = getOutputPadding();
  const subject = buildSubjectMaskFromSource(w,h,pad);

  // 先移除非常小的雜點，但保留文字的筆畫。
  let grouped = removeTinyComponents(subject,w,h);

  // v6.3：把彼此相近的主圖、標題與副標文字視為同一個整體。
  // 先向外膨脹讓相近元件接在一起，再只保留最大的「整體群組」，
  // 最後縮回去，這樣文字也會被外框包進去。
  const groupRadius = Math.max(8, Math.min(28, Math.round(Math.min(w,h) / 32)));
  grouped = binaryDilate(grouped,w,h,groupRadius);
  grouped = keepLargestComponent(grouped,w,h);
  grouped = binaryErode(grouped,w,h,groupRadius);

  // 再做一次小幅閉運算，補起字與圖形邊緣的小缺口。
  const bridgeRadius = Math.max(2, Math.min(5, Math.round(Math.min(w,h) / 420)));
  grouped = binaryDilate(grouped,w,h,bridgeRadius);
  grouped = binaryErode(grouped,w,h,bridgeRadius);

  // 將整個群組內部視為實心區域，只留下最外圍輪廓。
  // 內部圖案、文字孔洞、眼睛、網點等不會另外描框。
  const outerSolid = fillInternalHoles(grouped,w,h);

  const expand = getOutlineExpandPixels();
  const dist = distanceFromSolid(outerSolid,w,h);

  // 單一外框固定約 2 px。
  const lineWidth = 2;
  const outer = expand + lineWidth / 2;
  const inner = Math.max(0, expand - lineWidth / 2);

  const out = ctx.getImageData(0,0,w,h);

  // 外框永遠限制在圖片畫布內。
  // 保留 1px 安全邊界，避免線條貼到邊緣時被瀏覽器/匯出裁切。
  const safeMargin = 1;

  for (let i=0; i<outerSolid.length; i++) {
    if (outerSolid[i]) continue;

    const x = i % w;
    const y = (i / w) | 0;

    if (
      x < safeMargin ||
      y < safeMargin ||
      x >= w - safeMargin ||
      y >= h - safeMargin
    ) continue;

    const d = dist[i];
    if (d >= inner && d <= outer) {
      const p=i*4;
      out.data[p]=0;
      out.data[p+1]=0;
      out.data[p+2]=0;
      out.data[p+3]=255;
    }
  }
  ctx.putImageData(out,0,0);
}

function buildSubjectMaskFromSource(outW,outH,pad=0) {
  const sw = sourceCanvas.width, sh = sourceCanvas.height;
  const src = sourceCtx.getImageData(0,0,sw,sh).data;
  const mask = new Uint8Array(outW*outH);
  const samples = [[0,0],[sw-1,0],[0,sh-1],[sw-1,sh-1]];
  let br=0,bg=0,bb=0,ba=0;
  for (const [x,y] of samples) {
    const p=(y*sw+x)*4;
    br+=src[p]; bg+=src[p+1]; bb+=src[p+2]; ba+=src[p+3];
  }
  br/=4; bg/=4; bb/=4; ba/=4;
  const transparentBackground = ba < 80;
  for (let y=0; y<sh; y++) {
    for (let x=0; x<sw; x++) {
      const si=y*sw+x, sp=si*4;
      const a=src[sp+3];
      let isSubject=0;
      if (transparentBackground) {
        isSubject = a > 24 ? 1 : 0;
      } else if (a >= 24) {
        const dr=src[sp]-br, dg=src[sp+1]-bg, db=src[sp+2]-bb;
        const colorDistance=Math.sqrt(dr*dr+dg*dg+db*db);
        isSubject = colorDistance > 22 ? 1 : 0;
      }
      if (isSubject) {
        const ox=x+pad, oy=y+pad;
        if (ox>=0 && ox<outW && oy>=0 && oy<outH) mask[oy*outW+ox]=1;
      }
    }
  }
  return mask;
}

function removeTinyComponents(mask,w,h) {
  const seen = new Uint8Array(mask.length);
  const q = new Int32Array(mask.length);
  const out = new Uint8Array(mask.length);

  // 門檻故意很低：只移除零碎噪點，保留中文字、英文字母與細線。
  const minArea = Math.max(3, Math.round((w*h) / 180000));

  for (let i=0; i<mask.length; i++) {
    if (!mask[i] || seen[i]) continue;

    let head=0, tail=0;
    q[tail++]=i;
    seen[i]=1;
    const component=[];

    while (head<tail) {
      const idx=q[head++];
      component.push(idx);
      const x=idx%w, y=(idx/w)|0;

      const neighbors=[
        idx-1, idx+1, idx-w, idx+w,
        idx-w-1, idx-w+1, idx+w-1, idx+w+1
      ];

      for (const ni of neighbors) {
        if (ni<0 || ni>=mask.length || seen[ni] || !mask[ni]) continue;
        const nx=ni%w, ny=(ni/w)|0;
        if (Math.abs(nx-x)>1 || Math.abs(ny-y)>1) continue;
        seen[ni]=1;
        q[tail++]=ni;
      }
    }

    if (component.length >= minArea) {
      for (const idx of component) out[idx]=1;
    }
  }

  return out;
}

function keepLargestComponent(mask,w,h) {
  const seen = new Uint8Array(mask.length);
  const q = new Int32Array(mask.length);
  let best = [];

  for (let i=0; i<mask.length; i++) {
    if (!mask[i] || seen[i]) continue;

    let head=0, tail=0;
    q[tail++]=i;
    seen[i]=1;
    const component=[];

    while (head<tail) {
      const idx=q[head++];
      component.push(idx);
      const x=idx%w, y=(idx/w)|0;

      const neighbors=[
        idx-1, idx+1, idx-w, idx+w,
        idx-w-1, idx-w+1, idx+w-1, idx+w+1
      ];

      for (const ni of neighbors) {
        if (ni<0 || ni>=mask.length || seen[ni] || !mask[ni]) continue;
        const nx=ni%w, ny=(ni/w)|0;
        if (Math.abs(nx-x)>1 || Math.abs(ny-y)>1) continue;
        seen[ni]=1;
        q[tail++]=ni;
      }
    }

    if (component.length > best.length) best = component;
  }

  // 若沒有主體，直接回傳原 mask。
  if (!best.length) return mask;

  const out = new Uint8Array(mask.length);
  for (const i of best) out[i]=1;
  return out;
}

function fillInternalHoles(mask,w,h) {
  // 從畫布四邊的白色區域做 flood fill。
  // 能連到畫布邊緣的白色屬於「外部」；其餘白色都視為主體內部孔洞並填滿。
  const outside = new Uint8Array(mask.length);
  const qx = new Int32Array(mask.length);
  const qy = new Int32Array(mask.length);
  let head = 0, tail = 0;

  const push = (x,y) => {
    if (x<0 || x>=w || y<0 || y>=h) return;
    const i=y*w+x;
    if (mask[i] || outside[i]) return;
    outside[i]=1;
    qx[tail]=x; qy[tail]=y; tail++;
  };

  for (let x=0; x<w; x++) { push(x,0); push(x,h-1); }
  for (let y=0; y<h; y++) { push(0,y); push(w-1,y); }

  while (head < tail) {
    const x=qx[head], y=qy[head]; head++;
    push(x-1,y); push(x+1,y); push(x,y-1); push(x,y+1);
  }

  const out = new Uint8Array(mask.length);
  for (let i=0; i<mask.length; i++) {
    out[i] = mask[i] || !outside[i] ? 1 : 0;
  }
  return out;
}

function smoothFloatMask(src,w,h,radius,passes) {
  let cur = new Float32Array(src);
  for (let p=0; p<passes; p++) {
    cur = boxBlurHorizontal(cur,w,h,radius);
    cur = boxBlurVertical(cur,w,h,radius);
  }
  return cur;
}

function boxBlurHorizontal(src,w,h,r) {
  const out = new Float32Array(src.length);
  for (let y=0; y<h; y++) {
    let sum=0, count=0;
    for (let x=-r; x<=r; x++) if (x>=0 && x<w) { sum+=src[y*w+x]; count++; }
    for (let x=0; x<w; x++) {
      out[y*w+x]=sum/count;
      const remove=x-r, add=x+r+1;
      if (remove>=0) { sum-=src[y*w+remove]; count--; }
      if (add<w) { sum+=src[y*w+add]; count++; }
    }
  }
  return out;
}

function boxBlurVertical(src,w,h,r) {
  const out = new Float32Array(src.length);
  for (let x=0; x<w; x++) {
    let sum=0, count=0;
    for (let y=-r; y<=r; y++) if (y>=0 && y<h) { sum+=src[y*w+x]; count++; }
    for (let y=0; y<h; y++) {
      out[y*w+x]=sum/count;
      const remove=y-r, add=y+r+1;
      if (remove>=0) { sum-=src[remove*w+x]; count--; }
      if (add<h) { sum+=src[add*w+x]; count++; }
    }
  }
  return out;
}

function distanceFromSolid(mask,w,h) {
  const INF=1e9, SQRT2=Math.SQRT2;
  const d=new Float32Array(mask.length);
  for (let i=0;i<d.length;i++) d[i]=mask[i]?0:INF;

  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=y*w+x;
    let v=d[i];
    if (x>0) v=Math.min(v,d[i-1]+1);
    if (y>0) v=Math.min(v,d[i-w]+1);
    if (x>0&&y>0) v=Math.min(v,d[i-w-1]+SQRT2);
    if (x+1<w&&y>0) v=Math.min(v,d[i-w+1]+SQRT2);
    d[i]=v;
  }
  for (let y=h-1;y>=0;y--) for (let x=w-1;x>=0;x--) {
    const i=y*w+x;
    let v=d[i];
    if (x+1<w) v=Math.min(v,d[i+1]+1);
    if (y+1<h) v=Math.min(v,d[i+w]+1);
    if (x+1<w&&y+1<h) v=Math.min(v,d[i+w+1]+SQRT2);
    if (x>0&&y+1<h) v=Math.min(v,d[i+w-1]+SQRT2);
    d[i]=v;
  }
  return d;
}

function binaryDilate(src,w,h,radius) {
  let current = src;
  for (let pass=0; pass<radius; pass++) {
    const out = new Uint8Array(current.length);
    for (let y=0; y<h; y++) {
      for (let x=0; x<w; x++) {
        let hit=0;
        for (let yy=-1; yy<=1 && !hit; yy++) {
          const ny=y+yy;
          if (ny<0 || ny>=h) continue;
          for (let xx=-1; xx<=1; xx++) {
            const nx=x+xx;
            if (nx<0 || nx>=w) continue;
            if (current[ny*w+nx]) { hit=1; break; }
          }
        }
        out[y*w+x]=hit;
      }
    }
    current=out;
  }
  return current;
}

function binaryErode(src,w,h,radius) {
  let current=src;
  for (let pass=0; pass<radius; pass++) {
    const out=new Uint8Array(current.length);
    for (let y=0; y<h; y++) {
      for (let x=0; x<w; x++) {
        let keep=1;
        for (let yy=-1; yy<=1 && keep; yy++) {
          const ny=y+yy;
          for (let xx=-1; xx<=1; xx++) {
            const nx=x+xx;
            if (nx<0 || nx>=w || ny<0 || ny>=h || !current[ny*w+nx]) {
              keep=0; break;
            }
          }
        }
        out[y*w+x]=keep;
      }
    }
    current=out;
  }
  return current;
}

function rgbaToGray(data,w,h) {
  const out = new Float32Array(w*h);
  for (let i=0,j=0;i<data.length;i+=4,j++) {
    out[j] = 0.2126*data[i] + 0.7152*data[i+1] + 0.0722*data[i+2];
  }
  return out;
}

function boxBlur(src,w,h,radius) {
  const tmp = new Float32Array(w*h);
  const out = new Float32Array(w*h);
  const size = radius*2+1;

  for (let y=0;y<h;y++) {
    let sum = 0;
    for (let x=-radius;x<=radius;x++) {
      const xx = clamp(x,0,w-1);
      sum += src[y*w+xx];
    }
    for (let x=0;x<w;x++) {
      tmp[y*w+x] = sum/size;
      const xOut = clamp(x-radius,0,w-1);
      const xIn = clamp(x+radius+1,0,w-1);
      sum += src[y*w+xIn] - src[y*w+xOut];
    }
  }

  for (let x=0;x<w;x++) {
    let sum = 0;
    for (let y=-radius;y<=radius;y++) {
      const yy = clamp(y,0,h-1);
      sum += tmp[yy*w+x];
    }
    for (let y=0;y<h;y++) {
      out[y*w+x] = sum/size;
      const yOut = clamp(y-radius,0,h-1);
      const yIn = clamp(y+radius+1,0,h-1);
      sum += tmp[yIn*w+x] - tmp[yOut*w+x];
    }
  }

  return out;
}

function sobel(gray,w,h) {
  const out = new Float32Array(w*h);

  for (let y=1;y<h-1;y++) {
    for (let x=1;x<w-1;x++) {
      const i = y*w+x;
      const a = gray[(y-1)*w+(x-1)], b = gray[(y-1)*w+x], c = gray[(y-1)*w+(x+1)];
      const d = gray[y*w+(x-1)],     f = gray[y*w+(x+1)];
      const g = gray[(y+1)*w+(x-1)], h1= gray[(y+1)*w+x], i2= gray[(y+1)*w+(x+1)];

      const gx = -a - 2*d - g + c + 2*f + i2;
      const gy = -a - 2*b - c + g + 2*h1 + i2;
      out[i] = Math.hypot(gx,gy);
    }
  }

  return out;
}

function removeSparse(src,w,h,level) {
  const out = new Uint8Array(src.length);
  const minNeighbors = Math.min(7, Math.max(1, level));

  for (let y=1;y<h-1;y++) {
    for (let x=1;x<w-1;x++) {
      const i=y*w+x;
      if (!src[i]) continue;

      let n=0;
      for (let yy=-1;yy<=1;yy++) {
        for (let xx=-1;xx<=1;xx++) {
          if (!(xx===0&&yy===0)) n += src[(y+yy)*w+(x+xx)];
        }
      }

      out[i] = n >= minNeighbors ? 1 : 0;
    }
  }

  return out;
}

function keepStrongNeighborhood(src,w,h) {
  const out = new Uint8Array(src.length);

  for (let y=2;y<h-2;y++) {
    for (let x=2;x<w-2;x++) {
      const i=y*w+x;
      if (!src[i]) continue;

      let n=0;
      for (let yy=-2;yy<=2;yy++) {
        for (let xx=-2;xx<=2;xx++) {
          n += src[(y+yy)*w+(x+xx)];
        }
      }

      out[i] = n >= 4 ? 1 : 0;
    }
  }

  return out;
}

function dilate(src,w,h,radius) {
  let current = src;

  for (let pass=0;pass<radius;pass++) {
    const out = new Uint8Array(current.length);

    for (let y=1;y<h-1;y++) {
      for (let x=1;x<w-1;x++) {
        let hit=0;

        for (let yy=-1;yy<=1&&!hit;yy++) {
          for (let xx=-1;xx<=1;xx++) {
            if (current[(y+yy)*w+(x+xx)]) {
              hit=1;
              break;
            }
          }
        }

        out[y*w+x]=hit;
      }
    }

    current=out;
  }

  return current;
}

function cellBrightness(data,w,h,startX,startY,size,contrastAmount) {
  let total=0,count=0;
  const step=Math.max(1,Math.floor(size/4));

  for(let y=startY;y<Math.min(startY+size,h);y+=step){
    for(let x=startX;x<Math.min(startX+size,w);x+=step){
      const i=(y*w+x)*4;
      let gray=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2];
      const factor=(259*(contrastAmount+255))/(255*(259-contrastAmount));
      gray=factor*(gray-128)+128;
      total+=clamp(gray,0,255);
      count++;
    }
  }

  return total/Math.max(1,count);
}

function drawCell(x,y,size,darkness,shape,ang,laser){
  const cx=x+size/2, cy=y+size/2;
  const minFeature=laser?1.4:0;

  if(shape==="dots"){
    const r=Math.max(minFeature/2,Math.sqrt(darkness)*size*0.72);
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fill();
    return;
  }

  if(shape==="square"){
    const side=Math.max(minFeature,Math.sqrt(darkness)*size*1.08);
    ctx.fillRect(cx-side/2,cy-side/2,side,side);
    return;
  }

  if(shape==="diamond"){
    const half=Math.max(minFeature/2,Math.sqrt(darkness)*size*0.82);
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(0,-half);
    ctx.lineTo(half,0);
    ctx.lineTo(0,half);
    ctx.lineTo(-half,0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if(shape==="lines"){
    const lw=Math.max(minFeature,darkness*size*0.75);
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(ang);
    ctx.lineWidth=lw;
    ctx.lineCap="square";
    const span=size*1.6;
    ctx.beginPath();
    ctx.moveTo(-span/2,0);
    ctx.lineTo(span/2,0);
    ctx.stroke();
    ctx.restore();
  }
}

function exportJPG(){
  if(!img)return;

  const out=document.createElement("canvas");
  out.width=canvas.width;
  out.height=canvas.height;

  const octx=out.getContext("2d");
  octx.fillStyle="#fff";
  octx.fillRect(0,0,out.width,out.height);
  octx.drawImage(canvas,0,0);

  downloadDataURL(
    out.toDataURL("image/jpeg",0.95),
    currentMode==="lineart" ? "lineart.jpg" : "halftone-black-white.jpg"
  );
}

function exportTransparentPNG(){
  if(!img)return;

  alphaCanvas.width=canvas.width;
  alphaCanvas.height=canvas.height;
  alphaCtx.clearRect(0,0,alphaCanvas.width,alphaCanvas.height);

  const src=ctx.getImageData(0,0,canvas.width,canvas.height);
  const out=alphaCtx.createImageData(canvas.width,canvas.height);

  for(let i=0;i<src.data.length;i+=4){
    const gray=(src.data[i]+src.data[i+1]+src.data[i+2])/3;
    const a=255-gray;

    out.data[i]=0;
    out.data[i+1]=0;
    out.data[i+2]=0;
    out.data[i+3]=a;
  }

  alphaCtx.putImageData(out,0,0);

  downloadDataURL(
    alphaCanvas.toDataURL("image/png"),
    currentMode==="lineart" ? "lineart-transparent.png" : "halftone-transparent.png"
  );
}

function exportDXF(){
  if(!img)return;

  const w=canvas.width,h=canvas.height;
  const maxSide=900;
  const scale=Math.min(1,maxSide/Math.max(w,h));
  const sw=Math.max(1,Math.round(w*scale));
  const sh=Math.max(1,Math.round(h*scale));

  const temp=document.createElement("canvas");
  temp.width=sw;
  temp.height=sh;

  const tctx=temp.getContext("2d",{willReadFrequently:true});
  tctx.imageSmoothingEnabled=false;
  tctx.drawImage(canvas,0,0,sw,sh);

  const imgData=tctx.getImageData(0,0,sw,sh).data;
  const binary=new Uint8Array(sw*sh);

  for(let y=0;y<sh;y++){
    for(let x=0;x<sw;x++){
      const i=(y*sw+x)*4;
      const gray=(imgData[i]+imgData[i+1]+imgData[i+2])/3;
      binary[y*sw+x]=gray<128?1:0;
    }
  }

  const segments=outlineSegments(binary,sw,sh);
  const polylines=chainSegments(segments);
  const dxf=buildDXF(polylines,1/scale,h);

  const blob=new Blob([dxf],{type:"application/dxf;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=currentMode==="lineart" ? "lineart-outline.dxf" : "halftone-outline.dxf";
  a.click();

  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function outlineSegments(bin,w,h){
  const seg=[];
  const at=(x,y)=>(x>=0&&x<w&&y>=0&&y<h)?bin[y*w+x]:0;

  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      if(!at(x,y))continue;
      if(!at(x,y-1))seg.push([[x,y],[x+1,y]]);
      if(!at(x+1,y))seg.push([[x+1,y],[x+1,y+1]]);
      if(!at(x,y+1))seg.push([[x+1,y+1],[x,y+1]]);
      if(!at(x-1,y))seg.push([[x,y+1],[x,y]]);
    }
  }

  return seg;
}

function chainSegments(segments){
  const key=p=>`${p[0]},${p[1]}`;
  const map=new Map();

  segments.forEach((s,idx)=>{
    const k=key(s[0]);
    if(!map.has(k))map.set(k,[]);
    map.get(k).push(idx);
  });

  const used=new Uint8Array(segments.length);
  const lines=[];

  for(let i=0;i<segments.length;i++){
    if(used[i])continue;

    const line=[segments[i][0],segments[i][1]];
    used[i]=1;
    let current=segments[i][1];

    while(true){
      const c=map.get(key(current))||[];
      const ni=c.find(idx=>!used[idx]);

      if(ni===undefined)break;

      used[ni]=1;
      current=segments[ni][1];
      line.push(current);

      if(line.length>4&&key(current)===key(line[0]))break;
      if(line.length>200000)break;
    }

    if(line.length>=3)lines.push(line);
  }

  return lines;
}

function buildDXF(polylines,scale,originalHeight){
  const out=["0","SECTION","2","HEADER","0","ENDSEC","0","SECTION","2","ENTITIES"];

  for(const pts of polylines){
    if(pts.length<2)continue;

    out.push(
      "0","LWPOLYLINE",
      "8","LASERTOOL",
      "90",String(pts.length),
      "70",pointEqual(pts[0],pts[pts.length-1])?"1":"0"
    );

    for(const p of pts){
      const x=p[0]*scale;
      const y=originalHeight-p[1]*scale;

      out.push(
        "10",x.toFixed(3),
        "20",y.toFixed(3)
      );
    }
  }

  out.push("0","ENDSEC","0","EOF");
  return out.join("\n");
}

function pointEqual(a,b){
  return a&&b&&a[0]===b[0]&&a[1]===b[1];
}

function downloadDataURL(url,name){
  const a=document.createElement("a");
  a.href=url;
  a.download=name;
  a.click();
}

function clamp(v,min,max){
  return Math.min(max,Math.max(min,v));
}
