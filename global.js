const MINZOOM = 11;
const MAXZOOM = 19;
const MAXVIEWZOOM = 17;
const TSIZE = 512;
const WORLD_EXTENT = Math.pow(2, MAXZOOM) * TSIZE;

let DEBUG = false;

let EDITMAP = false;

let EDITLINES = false;

let CANVASH;
let CANVASW;

let windowResized = false;
windowResize();

const DPR = window.devicePixelRatio || 1;

window.addEventListener('resize', () => windowResize(), false);
function windowResize() {
  windowResized = true;
  CANVASW = window.innerWidth;
  CANVASH = window.innerHeight;
}

function initializeCanvas(canvas, defaults = function () { }) {
  const ctx = canvas.getContext("2d");

  window.addEventListener('resize', () =>
    fitCanvas(canvas, defaults, ctx), false);
  fitCanvas(canvas, defaults, ctx);
  return ctx;
}
function fitCanvas(canvas, defaults, ctx) {
  canvas.width = window.innerWidth * DPR;
  canvas.height = window.innerHeight * DPR;

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(
    DPR, 0, 0, DPR, 0, 0);
  if (defaults) defaults(ctx);
}

function initializeCenteredCanvas(canvas, defaults) {
  const ctx = canvas.getContext("2d");
  window.addEventListener('resize', () =>
    fitCenteredCanvas(canvas, defaults, ctx), false);
  fitCenteredCanvas(canvas, defaults, ctx);
  return ctx;
}
function fitCenteredCanvas(canvas, defaults, ctx) {
  canvas.width = window.innerWidth * DPR;
  canvas.height = window.innerHeight * DPR;

  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  ctx.setTransform(
    DPR, 0, 0, DPR, canvas.width / (2 * DPR), canvas.height / (2 * DPR));
  if (defaults) defaults(ctx);
}


function lerp(a, b, t) {
  return a + (b - a) * t;
}
