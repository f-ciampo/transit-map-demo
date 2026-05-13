/*
TODO:
  cleanup
  make zoom granular and consistent across resolutions
  decouple movements from framerate
*/

var overlayCanvas = document.getElementById("overlayCanvas");
initializeCanvas(overlayCanvas);

var overlayCtx = overlayCanvas.getContext("2d");
overlayCtx.strokeStyle = "#f30000ff";

var dragUpdate = new Coord();
var drag = new Coord();

let dragFling = new FlingCoord(0.85, drag);
let dragFlingSmooth = new Coord();

var isDragging = false;
var scale = 0.0;

const DRAG_THRESHOLD = 4;

const pointers = new Map();
let startPos = new Map();
let lastHyp = 0;
let gestureHadMultiTouch = false;
let gestureHadZoomIntent = false;

let wheelDelta = 0;

overlayCanvas.style.touchAction = "none";

overlayCanvas.addEventListener("pointerdown", (e) => {
  overlayCanvas.setPointerCapture(e.pointerId);

  const p = new Coord(e.clientX, e.clientY);
  pointers.set(e.pointerId, p);
  startPos.set(e.pointerId, p.clone());

  if (pointers.size >= 2) gestureHadMultiTouch = true;

  drag.reset();
  dragFling.reset();
  dragFlingSmooth.reset();
  lastDragFling.reset();

  if (pointers.size === 1) {
    dragUpdate.set(p);
  }

  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    lastHyp = a.dist(b);
    dragUpdate.set(a.mid(b));
  }
});

let mousePos = new Coord();
overlayCanvas.addEventListener("mousemove", (e) => {
  mousePos.setXY(e.offsetX - CANVASW / 2, e.offsetY - CANVASH / 2);
})

overlayCanvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;

  const p = pointers.get(e.pointerId);
  p.setXY(e.clientX, e.clientY);

  if (!isDragging) {
    const s = startPos.get(e.pointerId);
    if (!s) return;

    if (p.dist(s) < DRAG_THRESHOLD) return;

    isDragging = true;
    overlayCanvas.style.cursor = "grabbing";
  }

  if (pointers.size === 1) {
    mousePos.setXY(e.offsetX - CANVASW / 2, e.offsetY - CANVASH / 2);
    dragTo(p);
  }

  if (pointers.size === 2) {
    e.preventDefault();

    const [a, b] = [...pointers.values()];
    const d = a.subed(b);
    const pinchDelta = d.hyp() - lastHyp;

    const mid = a.mid(b);

    mousePos.setXY(mid.x - CANVASW / 2, mid.y - CANVASH / 2);

    if (Math.abs(pinchDelta) > 1) gestureHadZoomIntent = true;

    wheelDelta += pinchDelta / TSIZE;// /2;
    console.log(wheelDelta);
    lastHyp = d.hyp();
    dragTo(mid);
  }
});

function dragTo(p) {
  dragUpdate.sub(p);
  drag.add(dragUpdate);
  dragUpdate.set(p);
}
overlayCanvas.addEventListener("pointerup", (e) => {
  overlayCanvas.releasePointerCapture(e.pointerId);

  const wasDragging = isDragging;

  pointers.delete(e.pointerId);
  startPos.delete(e.pointerId);

  if (pointers.size === 0) {
    isDragging = false;
    overlayCanvas.style.cursor = "default";

    if (!wasDragging && !gestureHadMultiTouch && !gestureHadZoomIntent) {
      handleClick(new Coord(e.offsetX - CANVASW / 2, e.offsetY - CANVASH / 2));
    }

    gestureHadMultiTouch = false;
    gestureHadZoomIntent = false;
  }
});

overlayCanvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  wheelDelta += e.deltaY > 0 ? -1 : 1
});

overlayCanvas.addEventListener("pointercancel", cleanup);

function cleanup(e) {
  pointers.delete(e.pointerId);
  startPos.delete(e.pointerId);

  if (pointers.size === 0) {
    isDragging = false;
    gestureHadMultiTouch = false;
    gestureHadZoomIntent = false;
    overlayCanvas.style.cursor = "default";
  }
}

let lastDragFling = new Coord();

function controlsUpdate() {
  const dt = 16;

  if (DEBUG) {
    overlayCtx.clearRect(0, 0, CANVASW, CANVASH);
    overlayCtx.beginPath();
    overlayCtx.rect(0, 0, CANVASW, CANVASH);
    overlayCtx.moveTo(CANVASW / 2, 0);
    overlayCtx.lineTo(CANVASW / 2, CANVASH);
    overlayCtx.moveTo(0, CANVASH / 2);
    overlayCtx.lineTo(CANVASW, CANVASH / 2);
    overlayCtx.fillText(scale, 10, 50);
    overlayCtx.stroke();
    overlayCtx.translate(CANVASW / 2, CANVASH / 2);
  }


  if (isDragging) {
    dragFling.follow();
  }

  lastDragFling.set(dragFlingSmooth);
  dragFling.update(dt);
  dragFlingSmooth.lerp(dragFling, dt / 32);

  if (!dragFlingSmooth.equals(lastDragFling)) {
    handleDrag(dragFlingSmooth.subed(lastDragFling));
  }

  if (Math.abs(wheelDelta) >= 1) {
    handleWheel(wheelDelta > 0 ? 1 : -1);
    wheelDelta = 0;
  }

  if (DEBUG) {
    overlayCtx.beginPath();
    overlayCtx.arc(-dragFling.x, -dragFling.y, 5, 0, 2 * Math.PI);
    overlayCtx.stroke();

    overlayCtx.translate(-CANVASW / 2, -CANVASH / 2);

    overlayCtx.beginPath();
    overlayCtx.arc(mousePos.x, mousePos.y, 10, 0, 2 * Math.PI);
    overlayCtx.stroke();
  }

}

overlayCanvas.tabIndex = 0;
overlayCanvas.addEventListener("keydown", keydownFn, false);
function keydownFn(k) {
  handleKey(k.key, k.code);
}
