const $ = id => document.getElementById(id);

const fileInput=$("fileInput"), dropZone=$("dropZone");
const canvas=$("canvas"), ctx=canvas.getContext("2d",{willReadFrequently:true});
const sourceCanvas=$("sourceCanvas"), sourceCtx=sourceCanvas.getContext("2d",{willReadFrequently:true});
const alphaCanvas=$("alphaCanvas"), alphaCtx=alphaCanvas.getContext("2d");
const originalCanvas=$("originalCanvas"), originalCtx=originalCanvas.getContext("2d");

const threshold=$("threshold"),cellSize=$("cellSize"),contrast=$("contrast"),angle=$("angle"),density=$("density");
const thresholdValue=$("thresholdValue"),cellSizeValue=$("cellSizeValue"),contrastValue=$("contrastValue"),angleValue=$("angleValue"),densityValue=$("densityValue");

const edgeSensitivity=$("edgeSensitivity"),lineWidth=$("lineWidth"),smooth=$("smooth"),detailFilter=$("detailFilter");
const edgeSensitivityValue=$("edgeSensitivityValue"),lineWidthValue=$("lineWidthValue"),smoothValue=$("smoothValue"),detailFilterValue=$("detailFilterValue");
const majorOutline=$("majorOutline"),invert=$("invert"),laserMode=$("laserMode"),compareMode=$("compareMode");

const halftoneControls=$("halftoneControls"),lineartControls=$("lineartControls");
const modeButtons=[...document.querySelectorAll(".mode-btn")];
const shapeButtons=[...document.querySelectorAll(".shape-btn")];
const presetButtons=[...document.querySelectorAll(".preset-btn")];

const emptyState=$("emptyState"),canvasStage=$("canvasStage"),comparePane=$("comparePane");
const imageInfo=$("imageInfo"),resultLabel=$("resultLabel"),canvasTag=$("canvasTag");
const jpgBtn=$("jpgBtn"),pngBtn=$("pngBtn"),dxfBtn=$("dxfBtn"),resetBtn=$("resetBtn");
const zoomInBtn=$("zoomInBtn"),zoomOutBtn=$("zoomOutBtn"),fitBtn=$("fitBtn"),zoomValue=$("zoomValue"),stage=$("stage");

let img=null,currentMode="halftone",currentShape="dots",renderTimer=null,zoom=1;

fileInput.addEventListener("change",e=>handleFile(e.target.files?.[0]));
["dragenter","dragover"].forEach(n=>dropZone.addEventListener(n,e=>{e.preventDefault();dropZone.classList.add("dragover")}));
["dragleave","drop"].forEach(n=>dropZone.addEventListener(n,e=>{e.preventDefault();dropZone.classList.remove("dragover")}));
dropZone.addEventListener("drop",e=>handleFile(e.dataTransfer.files?.[0]));

[
 [threshold,thresholdValue,v=>v],[cellSize,cellSizeValue,v=>`${v} px`],[contrast,contrastValue,v=>v],
 [angle,angleValue,v=>`${v}°`],[density,densityValue,v=>`${v}%`],
 [edgeSensitivity,edgeSensitivityValue,v=>v],[lineWidth,lineWidthValue,v=>v],
 [smooth,smoothValue,v=>v],[detailFilter,detailFilterValue,v=>v]
].forEach(([i,o,f])=>i.addEventListener("input",()=>{o.value=f(i.value);queueRender()}));

[invert,laserMode,majorOutline].forEach(el=>el.addEventListener("change",render));
compareMode.addEventListener("change",()=>{comparePane.hidden=!compareMode.checked;fitView()});

modeButtons.forEach(btn=>btn.addEventListener("click",()=>setMode(btn.dataset.mode)));
shapeButtons.forEach(btn=>btn.addEventListener("click",()=>{
 currentShape=btn.dataset.shape;
 shapeButtons.forEach(b=>b.classList.toggle("active",b===btn));
 render();
}));

presetButtons.forEach(btn=>btn.addEventListener("click",()=>applyPreset(btn.dataset.preset)));

jpgBtn.addEventListener("click",exportJPG);
pngBtn.addEventListener("click",exportTransparentPNG);
dxfBtn.addEventListener("click",exportDXF);
resetBtn.addEventListener("click",resetControls);

zoomInBtn.addEventListener("click",()=>setZoom(zoom*1.15));
zoomOutBtn.addEventListener("click",()=>setZoom(zoom/1.15));
fitBtn.addEventListener("click",fitView);

function setMode(mode){
 currentMode=mode;
 modeButtons.forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
 halftoneControls.hidden=mode!=="halftone";
 lineartControls.hidden=mode!=="lineart";
 resultLabel.textContent=mode==="halftone"?"網點結果":"黑線稿結果";
 canvasTag.textContent=resultLabel.textContent;
 render();
}

function applyPreset(type){
 if(type==="photo"){
   setMode("halftone");
   threshold.value=132;cellSize.value=8;contrast.value=12;angle.value=45;density.value=105;
   currentShape="dots";laserMode.checked=false;invert.checked=false;
 }else if(type==="line"){
   setMode("lineart");
   edgeSensitivity.value=82;lineWidth.value=2;smooth.value=2;detailFilter.value=2;
   majorOutline.checked=false;laserMode.checked=false;invert.checked=false;
 }else if(type==="laser"){
   setMode("lineart");
   edgeSensitivity.value=105;lineWidth.value=2;smooth.value=2;detailFilter.value=3;
   majorOutline.checked=true;laserMode.checked=true;invert.checked=false;
 }else if(type==="dxf"){
   setMode("lineart");
   edgeSensitivity.value=120;lineWidth.value=1;smooth.value=3;detailFilter.value=4;
   majorOutline.checked=true;laserMode.checked=true;invert.checked=false;
 }
 syncOutputs();
 shapeButtons.forEach(b=>b.classList.toggle("active",b.dataset.shape===currentShape));
 render();
}

function syncOutputs(){
 thresholdValue.value=threshold.value;
 cellSizeValue.value=`${cellSize.value} px`;
 contrastValue.value=contrast.value;
 angleValue.value=`${angle.value}°`;
 densityValue.value=`${density.value}%`;
 edgeSensitivityValue.value=edgeSensitivity.value;
 lineWidthValue.value=lineWidth.value;
 smoothValue.value=smooth.value;
 detailFilterValue.value=detailFilter.value;
}

function handleFile(file){
 if(!file)return;
 if(!file.type.startsWith("image/")){alert("請選擇圖片檔案。");return}
 const url=URL.createObjectURL(file),image=new Image();
 image.onload=()=>{
   img=image;
   const maxDim=2400,scale=Math.min(1,maxDim/Math.max(image.naturalWidth,image.naturalHeight));
   const w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
   [sourceCanvas,originalCanvas,canvas,alphaCanvas].forEach(c=>{c.width=w;c.height=h});
   sourceCtx.drawImage(image,0,0,w,h);originalCtx.drawImage(image,0,0,w,h);
   emptyState.hidden=true;canvasStage.hidden=false;
   [jpgBtn,pngBtn,dxfBtn,resetBtn,zoomInBtn,zoomOutBtn,fitBtn].forEach(b=>b.disabled=false);
   imageInfo.textContent=`${image.naturalWidth} × ${image.naturalHeight}px`+(scale<1?`（處理 ${w} × ${h}px）`:"");
   render();fitView();URL.revokeObjectURL(url);
 };
 image.onerror=()=>{URL.revokeObjectURL(url);alert("圖片讀取失敗。")};
 image.src=url;
}

function resetControls(){
 currentShape="dots";setMode("halftone");
 threshold.value=128;cellSize.value=8;contrast.value=0;angle.value=45;density.value=100;
 edgeSensitivity.value=90;lineWidth.value=2;smooth.value=1;detailFilter.value=2;
 majorOutline.checked=false;invert.checked=false;laserMode.checked=false;compareMode.checked=false;
 comparePane.hidden=true;syncOutputs();
 shapeButtons.forEach(b=>b.classList.toggle("active",b.dataset.shape==="dots"));
 render();fitView();
}

function queueRender(){clearTimeout(renderTimer);renderTimer=setTimeout(render,30)}
function render(){if(!img)return;currentMode==="lineart"?renderLineArt():renderHalftone()}

function renderHalftone(){
 const w=sourceCanvas.width,h=sourceCanvas.height,data=sourceCtx.getImageData(0,0,w,h).data;
 ctx.save();ctx.clearRect(0,0,w,h);ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.fillStyle="#000";ctx.strokeStyle="#000";
 const size=Math.max(2,Math.round(+cellSize.value/(+density.value/100))),t=+threshold.value,c=+contrast.value,ang=+angle.value*Math.PI/180,isLaser=laserMode.checked;
 for(let y=0;y<h;y+=size)for(let x=0;x<w;x+=size){
   const brightness=cellBrightness(data,w,h,x,y,size,c);
   let darkness=1-brightness/255;
   darkness=clamp(darkness+((t-128)/128)*.55,0,1);
   if(isLaser){darkness=darkness<.16?0:darkness;darkness=darkness>.86?1:darkness}
   if(invert.checked)darkness=1-darkness;
   if(darkness<.035)continue;
   drawCell(x,y,size,darkness,currentShape,ang,isLaser);
 }
 ctx.restore();
}

function renderLineArt(){
 const w=sourceCanvas.width,h=sourceCanvas.height,src=sourceCtx.getImageData(0,0,w,h);
 let gray=rgbaToGray(src.data,w,h);
 if(+smooth.value>0)gray=boxBlur(gray,w,h,+smooth.value);
 const edges=sobel(gray,w,h),thr=+edgeSensitivity.value;
 let binary=new Uint8Array(w*h);
 for(let i=0;i<edges.length;i++)binary[i]=edges[i]>=thr?1:0;
 if(+detailFilter.value>0)binary=removeSparse(binary,w,h,+detailFilter.value);
 if(majorOutline.checked)binary=keepStrongNeighborhood(binary,w,h);
 if(+lineWidth.value>1)binary=dilate(binary,w,h,+lineWidth.value-1);
 if(laserMode.checked)binary=removeSparse(binary,w,h,2);
 const out=ctx.createImageData(w,h);
 for(let i=0;i<binary.length;i++){
   const isBlack=invert.checked?!binary[i]:!!binary[i],v=isBlack?0:255,p=i*4;
   out.data[p]=out.data[p+1]=out.data[p+2]=v;out.data[p+3]=255;
 }
 ctx.putImageData(out,0,0);
}

function rgbaToGray(data,w,h){const out=new Float32Array(w*h);for(let i=0,j=0;i<data.length;i+=4,j++)out[j]=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];return out}
function boxBlur(src,w,h,r){const tmp=new Float32Array(w*h),out=new Float32Array(w*h),s=r*2+1;for(let y=0;y<h;y++){let sum=0;for(let x=-r;x<=r;x++)sum+=src[y*w+clamp(x,0,w-1)];for(let x=0;x<w;x++){tmp[y*w+x]=sum/s;sum+=src[y*w+clamp(x+r+1,0,w-1)]-src[y*w+clamp(x-r,0,w-1)]}}for(let x=0;x<w;x++){let sum=0;for(let y=-r;y<=r;y++)sum+=tmp[clamp(y,0,h-1)*w+x];for(let y=0;y<h;y++){out[y*w+x]=sum/s;sum+=tmp[clamp(y+r+1,0,h-1)*w+x]-tmp[clamp(y-r,0,h-1)*w+x]}}return out}
function sobel(g,w,h){const o=new Float32Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const a=g[(y-1)*w+x-1],b=g[(y-1)*w+x],c=g[(y-1)*w+x+1],d=g[y*w+x-1],f=g[y*w+x+1],gg=g[(y+1)*w+x-1],hh=g[(y+1)*w+x],ii=g[(y+1)*w+x+1];const gx=-a-2*d-gg+c+2*f+ii,gy=-a-2*b-c+gg+2*hh+ii;o[y*w+x]=Math.hypot(gx,gy)}return o}
function removeSparse(src,w,h,level){const out=new Uint8Array(src.length),minN=Math.min(7,Math.max(1,level));for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!src[i])continue;let n=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if(xx||yy)n+=src[(y+yy)*w+x+xx];out[i]=n>=minN?1:0}return out}
function keepStrongNeighborhood(src,w,h){const out=new Uint8Array(src.length);for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;if(!src[i])continue;let n=0;for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++)n+=src[(y+yy)*w+x+xx];out[i]=n>=4?1:0}return out}
function dilate(src,w,h,r){let cur=src;for(let p=0;p<r;p++){const out=new Uint8Array(cur.length);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let hit=0;for(let yy=-1;yy<=1&&!hit;yy++)for(let xx=-1;xx<=1;xx++)if(cur[(y+yy)*w+x+xx]){hit=1;break}out[y*w+x]=hit}cur=out}return cur}

function cellBrightness(data,w,h,sx,sy,size,c){let total=0,count=0,step=Math.max(1,Math.floor(size/4));for(let y=sy;y<Math.min(sy+size,h);y+=step)for(let x=sx;x<Math.min(sx+size,w);x+=step){const i=(y*w+x)*4;let g=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];const factor=(259*(c+255))/(255*(259-c));g=factor*(g-128)+128;total+=clamp(g,0,255);count++}return total/Math.max(1,count)}
function drawCell(x,y,size,d,shape,ang,laser){const cx=x+size/2,cy=y+size/2,min=laser?1.4:0;if(shape==="dots"){const r=Math.max(min/2,Math.sqrt(d)*size*.72);ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();return}if(shape==="square"){const s=Math.max(min,Math.sqrt(d)*size*1.08);ctx.fillRect(cx-s/2,cy-s/2,s,s);return}if(shape==="diamond"){const h=Math.max(min/2,Math.sqrt(d)*size*.82);ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(h,0);ctx.lineTo(0,h);ctx.lineTo(-h,0);ctx.closePath();ctx.fill();ctx.restore();return}const lw=Math.max(min,d*size*.75);ctx.save();ctx.translate(cx,cy);ctx.rotate(ang);ctx.lineWidth=lw;ctx.lineCap="square";const sp=size*1.6;ctx.beginPath();ctx.moveTo(-sp/2,0);ctx.lineTo(sp/2,0);ctx.stroke();ctx.restore()}

function setZoom(v){zoom=clamp(v,.15,3);canvasStage.style.transform=`scale(${zoom})`;zoomValue.textContent=`${Math.round(zoom*100)}%`}
function fitView(){if(!img)return;requestAnimationFrame(()=>{const available=Math.max(200,stage.clientWidth-70),cols=compareMode.checked?2:1,gap=compareMode.checked?18:0,target=(available-gap)/cols;setZoom(Math.min(1,target/canvas.width))})}

function exportJPG(){if(!img)return;const out=document.createElement("canvas");out.width=canvas.width;out.height=canvas.height;const c=out.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,out.width,out.height);c.drawImage(canvas,0,0);downloadDataURL(out.toDataURL("image/jpeg",.95),currentMode==="lineart"?"lineart.jpg":"halftone.jpg")}
function exportTransparentPNG(){if(!img)return;alphaCanvas.width=canvas.width;alphaCanvas.height=canvas.height;const src=ctx.getImageData(0,0,canvas.width,canvas.height),out=alphaCtx.createImageData(canvas.width,canvas.height);for(let i=0;i<src.data.length;i+=4){const g=(src.data[i]+src.data[i+1]+src.data[i+2])/3;out.data[i]=out.data[i+1]=out.data[i+2]=0;out.data[i+3]=255-g}alphaCtx.putImageData(out,0,0);downloadDataURL(alphaCanvas.toDataURL("image/png"),currentMode==="lineart"?"lineart-transparent.png":"halftone-transparent.png")}
function exportDXF(){if(!img)return;const w=canvas.width,h=canvas.height,maxSide=900,scale=Math.min(1,maxSide/Math.max(w,h)),sw=Math.max(1,Math.round(w*scale)),sh=Math.max(1,Math.round(h*scale)),tmp=document.createElement("canvas");tmp.width=sw;tmp.height=sh;const tc=tmp.getContext("2d",{willReadFrequently:true});tc.imageSmoothingEnabled=false;tc.drawImage(canvas,0,0,sw,sh);const d=tc.getImageData(0,0,sw,sh).data,bin=new Uint8Array(sw*sh);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4;bin[y*sw+x]=((d[i]+d[i+1]+d[i+2])/3)<128?1:0}const dxf=buildDXF(chainSegments(outlineSegments(bin,sw,sh)),1/scale,h),blob=new Blob([dxf],{type:"application/dxf;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=currentMode==="lineart"?"lineart-outline.dxf":"halftone-outline.dxf";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function outlineSegments(bin,w,h){const seg=[],at=(x,y)=>(x>=0&&x<w&&y>=0&&y<h)?bin[y*w+x]:0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!at(x,y))continue;if(!at(x,y-1))seg.push([[x,y],[x+1,y]]);if(!at(x+1,y))seg.push([[x+1,y],[x+1,y+1]]);if(!at(x,y+1))seg.push([[x+1,y+1],[x,y+1]]);if(!at(x-1,y))seg.push([[x,y+1],[x,y]])}return seg}
function chainSegments(segments){const key=p=>`${p[0]},${p[1]}`,map=new Map();segments.forEach((s,i)=>{const k=key(s[0]);if(!map.has(k))map.set(k,[]);map.get(k).push(i)});const used=new Uint8Array(segments.length),lines=[];for(let i=0;i<segments.length;i++){if(used[i])continue;const line=[segments[i][0],segments[i][1]];used[i]=1;let cur=segments[i][1];while(true){const cand=map.get(key(cur))||[],ni=cand.find(j=>!used[j]);if(ni===undefined)break;used[ni]=1;cur=segments[ni][1];line.push(cur);if(line.length>4&&key(cur)===key(line[0]))break;if(line.length>200000)break}if(line.length>=3)lines.push(line)}return lines}
function buildDXF(lines,scale,oh){const out=["0","SECTION","2","HEADER","0","ENDSEC","0","SECTION","2","ENTITIES"];for(const pts of lines){out.push("0","LWPOLYLINE","8","LASERTOOL","90",String(pts.length),"70",pointEqual(pts[0],pts[pts.length-1])?"1":"0");for(const p of pts)out.push("10",(p[0]*scale).toFixed(3),"20",(oh-p[1]*scale).toFixed(3))}out.push("0","ENDSEC","0","EOF");return out.join("\n")}
function pointEqual(a,b){return a&&b&&a[0]===b[0]&&a[1]===b[1]}
function downloadDataURL(url,name){const a=document.createElement("a");a.href=url;a.download=name;a.click()}
function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
