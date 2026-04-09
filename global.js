const MINZOOM = 12;
const MAXZOOM = 19;
const MAXVIEWZOOM = 18;
const TSIZE = 256;
const WORLD_EXTENT = Math.pow(2, MAXZOOM) * TSIZE;

let DEBUG = false;

let EDITMAP = false;

let EDITLINES = false;

let CANVASH;
let CANVASW;
windowResize();

window.addEventListener('resize', () => windowResize(), false);
function windowResize() {
  CANVASW = window.innerWidth;
  CANVASH = window.innerHeight;
}

function initializeCanvas(canvas, defaults) {
  const ctx = canvas.getContext("2d");
  window.addEventListener('resize', () => 
    fitCanvas(canvas, defaults, ctx), false);
  fitCanvas(canvas);
  return ctx;
}
function fitCanvas(canvas, defaults, ctx) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if(defaults) defaults(ctx);
}

function initializeCenteredCanvas(canvas, defaults) {
  const ctx = canvas.getContext("2d");
  window.addEventListener('resize', () => 
    fitCenteredCanvas(canvas, defaults, ctx), false);
  fitCenteredCanvas(canvas, defaults, ctx);
  return ctx;
}
function fitCenteredCanvas(canvas, defaults, ctx) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if(defaults) defaults(ctx);
}


function lerp(a, b, t) {
  return a + (b - a) * t;
}
