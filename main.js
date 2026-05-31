let ZOOMSPEED = 0.3; //TODO: make this independent of fps

let z = 13;

let tileLayers = [];
const TILESURL = 'https://tiles.transit.ar/caba-512/{z}/{x}/{y}.webp';

let tilesCanvas = document.getElementById("tilesCanvas");
let tilesCanvasCtx = initializeCanvas(tilesCanvas);

const minMapLayer = MINZOOM;
for (let z = minMapLayer; z <= MAXVIEWZOOM; z++) {
  tileLayers[z] = new MapLayer(tilesCanvas, z);
}

let mLayer = tileLayers[z];


let stations = [];
let lines = [];

let activePOIs = [];

let z0 = z;
let z1 = z;

let viewLoc = new Coord(22661197 * 4, 40437852 * 4);
let MAP_BOUNDS = new Bbox(-58.53, -34.534, -58.335, -34.70).latLngToVirt();

let prevViewLoc = viewLoc.clone();
let tgtViewLoc = viewLoc.clone();

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

let prevDrawnZ = z0;

let lastTime = performance.now();

let activeSnapGuide = null;
let snapGuides = [];

let fuse;

let mapUpdate = true;

//TODO: add proper search terms for each station
loadData("stationsData.msgpack").then(data => {
  stations = data;
  fuse = new Fuse(stations, {
    keys: ["title"],
    threshold: 0.4,
    ignoreDiacritics: true,
    useExtendedSearch: true,
    getFn: station =>
      station.getProp(MAXZOOM)?.title + ' ' + station.getProp(MAXZOOM)?.lineProps?.name || ""
  });
});
loadDataIntoLines("linesData.msgpack");

async function getSuggestions(text) {
  if (!text.length) return;
  const results = [];

  return fuse.search(text, { limit: 10 }).map(x => ({
    item: x.item,
    text: x.item.getProp(MAXZOOM).title,
    afterText: ' (' + x.item.getProp(MAXZOOM).lineProps.name + ')'
  }));
}

function onAccept(value) {
  const c = value?.item?.getCoord(z);
  if (c) {
    tgtViewLoc.set(c);
    z1 = Math.max(z, MINZOOM + 1);
    selectStation(value.item);
  }
}

const searchBox = new Autocomplete(
  document.getElementById("searchBar"),
  getSuggestions, onAccept,
  "Buscar estaciones...",
  300
);

function render(now) {
  now ??= performance.now();
  const dt = now - lastTime;
  lastTime = now;
  const fps = 1000 / dt;

  controlsUpdate();

  stepZoom(dt);

  tgtViewLoc.snapInsideBbox(MAP_BOUNDS);

  const moved = z !== Math.round(z) || !prevViewLoc.equals(viewLoc);

  mLayer = tileLayers[z0];

  /*TODO: 
    clean up this logic...
    tile positioning seems wrong when mooving while zooming
  */
  mapUpdate = mapUpdate || (moved || !mLayer?.finishedDrawing || windowResized);
  if (mapUpdate) {
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

  if (EDITMAP || mapUpdate) {
    vectorLayer.render(viewLoc, z, z0, z1, stations, lines, activePOIs, selectedNode);
  }

  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  for (const img of refimgs) {
    const l = img.bbox.virtToPx(z, viewLoc);
    overlayCtx.save();
    overlayCtx.setTransform(1, 0, 0, 1, CANVASW / 2, CANVASH / 2);
    overlayCtx.globalAlpha = img.opacity;
    overlayCtx.drawImage(img.img, l.minX, l.minY, l.maxX - l.minX, l.maxY - l.minY);
    overlayCtx.restore();
  }

  if (DEBUG) {
    overlayCtx.save();
    overlayCtx.beginPath();
    overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    if (fps) overlayCtx.fillText(Math.round(fps), 50, 50);
    overlayCtx.fill();
    overlayCtx.restore();
  }

  prevViewLoc.set(viewLoc);

  if (EDITMAP) {
    for (const sg of snapGuides) {
      drawDiagonals(sg.virtToPx(z, viewLoc), overlayCtx, '#aaf');
    }

    if (activeSnapGuide)
      drawDiagonals(activeSnapGuide.virtToPx(z, viewLoc), overlayCtx, '#faa');
  }

  if (windowResized) windowResized = false;

  requestAnimationFrame(render);
}

function drawDiagonals(p, ctx, color = '#aaf') {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, CANVASW / 2, CANVASH / 2);
  ctx.strokeStyle = color;
  ctx.beginPath();

  ctx.moveTo(p.x, -CANVASH / 2);
  ctx.lineTo(p.x, CANVASH / 2);
  ctx.moveTo(-CANVASW / 2, p.y);
  ctx.lineTo(CANVASW / 2, p.y);

  ctx.moveTo(-CANVASW + p.x, -CANVASW + p.y);
  ctx.lineTo(CANVASW + p.x, CANVASW + p.y);
  ctx.moveTo(CANVASW + p.x, -CANVASW + p.y);
  ctx.lineTo(-CANVASW + p.x, CANVASW + p.y);

  ctx.stroke();
  ctx.restore();
}

function handleDrag(d) {
  tgtViewLoc.add(d.pxToVirt(z));
  tgtViewLoc.round();
  viewLocStart.add(d.pxToVirt(z));
  viewLocStart.round();
}

function handleWheel(d) {
  if (z + d > MAXVIEWZOOM || z + d < MINZOOM) return;
  startZoom(d);
}

function selectStation(s) {
  selectedNode = s;
  activePOIs = [];
  searchBox.setHint(
    s.getProp(MAXZOOM)?.title +
    ' (' + s.getProp(MAXZOOM).lineProps.name + ')'
    || ""
  );
  selectedNode = s;
}

function handleClick(m) {
  let dl = Infinity;
  selectedNode = undefined;
  activePOIs = [];
  let clickedStation;
  mapUpdate = true;

  let ds = Infinity;
  for (const s of stations) {
    const dd = s.getCoord(z)?.virtToPx(z, viewLoc).dist(m);
    if (dd < ds && dd < 20) {
      clickedStation = s;
      ds = dd;
    }
  }

  if (clickedStation) {
    selectStation(clickedStation);
    return;
  }

  searchBox.setHint();

  if (z >= MINGEOZOOM) {
    const clickedOnPx = m.pxToVirt(z).add(viewLoc);
    activePOIs = [new POI(0, clickedOnPx, stations)];
  }

  if (!EDITMAP) return;

  if (EDITLINES) {
    selectedLine = undefined;
    for (const l of lines) {
      for (const n of l.nodes) {
        const dd = n.getCoord(z)?.virtToPx(z, viewLoc).dist(m);
        if (dd < dl && dd < 100) {
          activePOIs = [];
          selectedNode = n;
          selectedLine = l;
          dl = dd;
        }
      }
    }
    console.log("selected line: ", selectedLine);
  }
  console.log("selected node: ", selectedNode);
}

function handleKey(key, code) {
  const mouseVirtPos = mousePos.pxToVirt(z).add(viewLoc);
  const shift = key !== key.toLowerCase();
  switch (key) {
    case '+':
      if (z < MAXVIEWZOOM) startZoom(1);
      break;
    case '-':
      if (z > MINZOOM) startZoom(-1);
      break;
  }
  if (!EDITMAP) return;
  selCoord = selectedNode?.getCoord(z);
  switch (key.toLowerCase()) {
    case 'g':
      selCoord?.set(mouseVirtPos);
      if (activeSnapGuide) {
        const sd = 15;
        const snc = selCoord;
        if (virtToPx(z, Math.abs(activeSnapGuide.x - mouseVirtPos.x)) < sd) {
          snc.x = activeSnapGuide.x;
          return;
        }
        if (virtToPx(z, Math.abs(activeSnapGuide.y - mouseVirtPos.y)) < sd) {
          snc.y = activeSnapGuide.y;
          return;
        }
        const screenOff = Math.max(pxToVirt(z, CANVASW), pxToVirt(z, CANVASH));
        const p1 = snc.projectedToLine(
          activeSnapGuide.subedXY(screenOff, screenOff), activeSnapGuide.addedXY(screenOff, screenOff)
        );
        if (virtToPx(z, snc.dist(p1)) < sd) {
          snc.set(p1);
          return;
        }
        const p2 = snc.projectedToLine(
          activeSnapGuide.addedXY(-screenOff, screenOff), activeSnapGuide.addedXY(screenOff, -screenOff)
        );
        if (virtToPx(z, snc.dist(p2)) < sd) {
          snc.set(p2);
          return;
        }
      }
      break;
    case 'a':
      activeSnapGuide = selCoord;
      break;
    case 'ArrowUp':
      if (selectedNode) selCoord.addXY(0, -pxToVirt(z, 0.5));
      break;
    case 'ArrowDown':
      if (selectedNode) selCoord.addXY(0, pxToVirt(z, 0.5));
      break;
    case 'ArrowLeft':
      if (selectedNode) selCoord.addXY(-pxToVirt(z, 0.5), 0);
      break;
    case 'ArrowRight':
      if (selectedNode) selCoord.addXY(pxToVirt(z, 0.5), 0);
      break;
    case 'l':
      EDITLINES = !EDITLINES;
      console.log("EDITLINES: ", EDITLINES);
      break;
    case 'm':
      if (!EDITLINES) return;
      if (selectedNode) selCoord.r += shift ? 100 : 1000;
      break;
    case 'n':
      if (!EDITLINES) return;
      if (selectedNode) selCoord.r += shift ? -100 : -1000;
      break;
    case 'b':
      if (!EDITLINES) return;
      if (selectedNode) selCoord.r = 0;
      break;
    case 'e':
      if (!selectedNode) return;
      let line = selectedLine;
      if (!line) {
        line = new MapLine(selectedNode.getProp(z).lineProps, []);
        const n = line.addCoord(MAXZOOM, selCoord.clone());
        n.minZ = MINZOOM;
        lines.push(line);
      }
      EDITLINES = true;
      selectedNode = line.addCoord(MAXZOOM, mouseVirtPos);
      selectedNode.minZ = MINZOOM;
      console.log("coord: ", selectedNode);
      selectedLine = line;
    case 's':
      if (!shift) {
        for (const sg of snapGuides) {
          const dd = sg?.virtToPx(z, viewLoc).dist(mousePos);
          if (dd < 10) {
            activeSnapGuide = sg;
            return;
          }
        }
        activeSnapGuide = activeSnapGuide ? null : mouseVirtPos;
      } else if (activeSnapGuide) {
        snapGuides.push(activeSnapGuide.clone());
        activeSnapGuide = null;
      }
      break;
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

  const ii = interpolateDisplacement(viewUnderMouse, viewLoc, [stations, activePOIs], z0, z1);
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

function stepZoom(dtMs = 1000 / 60) {
  const frameScale = Math.max(dtMs, 0) * 60 / 1000;
  const zoomSpeed = 1 - Math.pow(1 - ZOOMSPEED, frameScale);
  z = lerp(z, z1, zoomSpeed);

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

function interpolateDisplacement(p, origin, lists, z0, z1, maxPxDist = 1500, k = 3) {
  //inverse distance weighting
  //TODO: only consider the n closest ones instead of culling with distance
  //maybe do everything in virt coords so that zooming in and out doesn't move camera 

  let dx = 0;
  let dy = 0;
  let wsum = 0;

  const p0 = p.virtToPx(z0, origin);

  let hasMovement = false;

  for (const l of lists) {
    for (const s of l) {
      const c0 = s.getCoord(z0);
      const c1 = s.getCoord(z1);
      if (!c0 || !c1) continue;

      const thisHasMovement = c0.dist(c1) > 5;
      if (thisHasMovement) hasMovement = true;

      const px0 = c0.virtToPx(z0, origin);
      const px1 = c1.virtToPx(z1, origin);


      const d = px0.dist(p0);
      if (d > maxPxDist) continue;

      if (d < 20 && thisHasMovement) return px1.subed(px0).pxToVirt(z1);

      const w = 1 / Math.pow(d, k);

      dx += (px1.x - px0.x) * w, dy += (px1.y - px0.y) * w;
      wsum += w;
    }
  }

  dx /= wsum, dy /= wsum;
  if (!hasMovement || wsum === 0) return;

  return new Coord(dx, dy).pxToVirt(z1);
}

render();
