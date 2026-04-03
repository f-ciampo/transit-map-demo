let ZOOMSPEED = 0.3; //TODO: make this independent of fps

let z = 15;

let tileLayers = [];
const TILESURL = 'https://tiles.transit.ar/caba-11-19/{z}/{x}/{y}.webp';

pmtiles.PMTiles.prototype.getTileImg = async function (z, x, y) {
  const r = await this.getZxy(z, x, y);
  if (!r || !r.data) return null;
  try {
    const blob = new Blob([r.data]);
    return await createImageBitmap(blob);
  } catch (e) {
    return null;
  }
};

//const pm = new pmtiles.PMTiles("https://assets.transit.ar/caba-11-19.pmtiles");
const pm = {
  resolveUrl (z, x, y) {
    return TILESURL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  },
  getTileImg (z, x, y) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = this.resolveUrl(z, x, y);
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  }
};

let tilesCanvas = document.getElementById("tilesCanvas");
let tilesCanvasCtx = initializeCanvas(tilesCanvas);

const minMapLayer = 15;
for (let z = minMapLayer; z <= MAXZOOM; z++) {
  tileLayers[z] = new MapLayer(tilesCanvas, pm, z);
}

let mLayer = tileLayers[z];


let stations = [];
let lines = [];

let z0 = z;
let z1 = z;

let viewLoc = new Coord(22661197 * 2, 40437852 * 2);
let prevViewLoc = viewLoc.clone();
let tgtViewLoc = viewLoc.clone();
const mainLoc0 = new Coord(22661197 * 2, 40437852 * 2);
const mainLoc1 = new Coord(22661497 * 2, 40437852 * 2);

const linesCanvas = document.getElementById("linesCanvas");
initializeCenteredCanvas(linesCanvas);
const nodesCanvas = document.getElementById("nodesCanvas");
initializeCenteredCanvas(nodesCanvas);
const textCanvas = document.getElementById("textCanvas");
initializeCenteredCanvas(textCanvas);

const vectorLayer = new VectorLayer(linesCanvas, nodesCanvas, textCanvas);

let selectedNode;
let selectedLine;

let isZooming = false;

class RefImg {
  constructor(imgUrl, minZ, maxZ, bbox, opacity) {
    this.img = new Image();
    this.img.src = imgUrl;
    this.img.onload = () => {
      console.log('Image loaded:', imgUrl);
    };
    this.minZ = minZ;
    this.maxZ = maxZ;
    this.bbox = bbox;
    this.opacity = opacity;
  }
}
const refimgs = [];

loadDataIntoStations("stationsData.msgpack");
loadDataIntoLines("linesData.msgpack");

let prevDrawnZ = z0;

let lastTime = performance.now();
let fps = 0;

function render(now) {
  controlsUpdate();

  stepZoom();

  const moved = z !== Math.round(z) || !prevViewLoc.equals(viewLoc);

  mLayer = tileLayers[z0];

  /*TODO: 
    clean up this logic...
    tile positioning seems wrong when mooving while zooming
  */
  if (moved || !mLayer?.finishedDrawing) {
    if (z !== Math.round(z)) {
      tilesCanvasCtx.setTransform(1, 0, 0, 1, 0, 0);
      tilesCanvasCtx.clearRect(0, 0, tilesCanvas.width, tilesCanvas.height);

      const t = (z0 === z1) ? 1 : (z - z0) / (z1 - z0);
      prevDrawnZ = z0;
      if (z0 >= minMapLayer) {
        tilesCanvasCtx.globalAlpha = shiftedAfterZoom ? (1 - t) : 1;
        mLayer.renderMap(viewLoc0, z, false);
      }
      if (z1 >= minMapLayer) {
        tilesCanvasCtx.globalAlpha = t;
        tileLayers[z1].renderMap(viewLoc1, z, true);
      }
    } else {
      tilesCanvasCtx.setTransform(1, 0, 0, 1, 0, 0);
      tilesCanvasCtx.clearRect(0, 0, tilesCanvas.width, tilesCanvas.height);

      tilesCanvasCtx.globalAlpha = 1;
      const prevDrawnMLayer = tileLayers[prevDrawnZ];
      if (z >= minMapLayer && !mLayer.allTilesReady && prevDrawnZ !== z) {
        if (prevDrawnMLayer && !shiftedAfterZoom && prevDrawnZ >= minMapLayer) {
          prevDrawnMLayer.renderMap(viewLoc, z, false);
        }
      } else if (prevDrawnMLayer && mLayer !== prevDrawnMLayer) {
        prevDrawnMLayer.clean();
        prevDrawnZ = z1;
      }
      if (z0 >= minMapLayer) {
        mLayer.renderMap(viewLoc, z, true);
      }
    }
  }

  if (moved || !vectorLayer?.finishedDrawing) {
    vectorLayer.render(viewLoc, z, z0, z1, stations, lines, selectedNode);
  }

  for (const img of refimgs) {
    const l = img.bbox.virtToPx(z, viewLoc);
    linesCtx.save();
    linesCtx.globalAlpha = img.opacity;
    linesCtx.drawImage(img.img, l.minX, l.minY, l.maxX - l.minX, l.maxY - l.minY);
    linesCtx.restore();
  }

  if (!DEBUG) {
    fps = 1000 / (now - lastTime);
    lastTime = now;
    overlayCtx.save();
    overlayCtx.beginPath();
    overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (fps) overlayCtx.fillText(Math.round(fps), 50, 50);
    overlayCtx.fill();
    overlayCtx.restore();
  }

  prevViewLoc.set(viewLoc);

  requestAnimationFrame(render);
}

function handleDrag(d) {
  tgtViewLoc.add(d.pxToVirt(z));
  tgtViewLoc.round();
  viewLocStart.add(d.pxToVirt(z));
  viewLocStart.round();
}

function handleWheel(d) {
  if (z + d > MAXZOOM || z + d <= MINZOOM) return;
  console.log("mousePos when handleWheel: ", mousePos);
  startZoom(d);
}

function handleClick(m) {
  if (!EDITMAP) return;
  let d = Infinity;
  selectedNode = undefined;
  selectedLine = undefined;

  if (EDITLINES) {
    for (const l of lines) {
      for (const n of l.nodes) {
        const dd = n.getCoord(z)?.virtToPx(z, viewLoc).dist(m);
        if (dd < d && dd < 100) {
          selectedNode = n;
          selectedLine = l;
          d = dd;
        }
      }
    }
    console.log("selected node: ", selectedNode);
    console.log("selected line: ", selectedLine);
    return;
  }

  for (const s of stations) {
    const dd = s.getCoord(z)?.virtToPx(z, viewLoc).dist(m);
    if (dd < d && dd < 100) {
      selectedNode = s;
      d = dd;
    }
  }
  console.log("selected node: ", selectedNode);
}

function handleKey(key, code) {
  const mouseVirtPos = mousePos.pxToVirt(z).add(viewLoc);
  switch (key) {
    case 'g':
      if (!EDITMAP) return;
      selectedNode.getCoord(z)?.set(mouseVirtPos);
      break;
    case '+':
      if (z >= MAXZOOM) return;
      startZoom(1);
      break;
    case '-':
      if (z <= MINZOOM) return;
      startZoom(-1);
      break;
    case 'l':
      if (!EDITMAP) return;
      EDITLINES = !EDITLINES;
      console.log("EDITLINES: ", EDITLINES);
      break;
    case 'e':
      if (!EDITMAP) return;
      if (!selectedNode) return;
      let line = selectedLine;
      if (!line) {
        line = new MapLine(selectedNode.getProp(z).lineProps, []);
      }
      EDITLINES = true;
      selectedNode = line.addCoordAtZ(mouseVirtPos, z);
      console.log("coord: ", selectedNode);
      selectedLine = line;
      lines.push(line);
  }
}

let viewLocStart = viewLoc.clone();
let mousePosStart = mousePos.clone();

let viewLoc0 = viewLoc.clone();
let viewLoc1 = viewLoc.clone();

let shiftedAfterZoom = false;

function startZoom(d) {
  if (isZooming) return;

  isZooming = true;
  z1 += d;
  z0 = Math.round(z);

  const viewUnderMouse = viewLoc.added(
    mousePos.pxToVirt(z)
  );

  const ii = interpolateDisplacement(viewUnderMouse, stations, z0, z1);
  if (ii) {
    tgtViewLoc.add(ii);
    shiftedAfterZoom = true;
  } else {
    const factor = (Math.pow(2, d) - 1) / Math.pow(2, d);
    tgtViewLoc.add(mousePos.pxToVirt(z).multXY(factor, factor));
    shiftedAfterZoom = false;
  }

  viewLocStart = viewLoc.clone();

  mousePosStart.set(mousePos);
}

function stepZoom() {
  z = lerp(z, z1, ZOOMSPEED);

  const t = (z0 === z1) ? 1 : (z - z0) / (z1 - z0);

  const anchor = mousePosStart;

  const p0 = viewLocStart.added(anchor.pxToVirt(z0));
  const p1 = tgtViewLoc.added(anchor.pxToVirt(z1));

  viewLoc0 = p0.subed(anchor.pxToVirt(z));
  viewLoc1 = p1.subed(anchor.pxToVirt(z));

  const p = p0.lerp(p1, t);

  viewLoc = p.sub(anchor.pxToVirt(z));

  if (Math.abs(z - z1) < 0.005) {
    z = z1;
    z0 = z;
    viewLoc.set(tgtViewLoc);
    isZooming = false;
  }
}

function interpolateDisplacement(p, stations, z0, z1, k = 3) {
  //inverse distance weighting
  //TODO: only consider the n closest ones instead of culling with distance

  let dx = 0;
  let dy = 0;
  let wsum = 0;

  const p0 = p.virtToPx(z0, viewLoc);

  let hasMovement = false;

  for (const s of stations) {
    const c0 = s.getCoord(z0);
    const c1 = s.getCoord(z1);
    if (!c0 || !c1) continue;

    const thisHasMovement = c0.dist(c1) > 5;
    if (thisHasMovement) hasMovement = true;

    const px0 = c0.virtToPx(z0, viewLoc);
    const px1 = c1.virtToPx(z1, viewLoc);


    const d = px0.dist(p0);
    if (d > 1500) continue;

    if (d < 20 && thisHasMovement) return px1.subed(px0).pxToVirt(z1);

    const w = 1 / Math.pow(d, k);

    dx += (px1.x - px0.x) * w, dy += (px1.y - px0.y) * w;
    wsum += w;
  }

  dx /= wsum, dy /= wsum;
  if (!hasMovement || wsum === 0) return;

  return new Coord(dx, dy).pxToVirt(z1);
}

render();

