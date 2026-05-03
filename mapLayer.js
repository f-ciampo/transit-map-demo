
/*
TODO:
It sometimes crashes on phone
Caching could be better, need to check what the pmtiles lib does under the hood
It breaks when resizing the window
When zooming in the borders, it seems to redraw tiles that it had already drawn
*/
const DEBUGTILES = false;
const FADE_MILLIS = 200;

class Tiles {
  constructor(z) {
    this.z = z;
    this.tiles = new Map();

    this.blankImage = document.createElement("canvas");
    this.blankImage.width = TSIZE;
    this.blankImage.height = TSIZE;

    this.allTilesReady = false;

    this.calculateMaxTiles();

    this.finishedDrawing = false;
  }

  _key(x, y) {
    return `${x}/${y}`;
  }

  resolveUrl(z, x, y) {
    return TILESURL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  }

  add(x, y, key = this._key(x, y)) {
    const tile = {
      loaded: false,
      failed: false,
      img: null
    };

    const controller = new AbortController();
    const signal = controller.signal;
    const img = new Image();
    img.src = this.resolveUrl(this.z, x, y);

    img.onload = () => {
      tile.img = img;
      tile.loaded = true;
      tile.fadeStart = performance.now();
      console.log("img loaded");
    }
    img.onerror = () => tile.failed = true;

    tile.cancel = () => {
      controller.abort();
    };

    this.tiles.set(key, tile);
    
    this.clean();
  }

  tile(x, y, update) {
    const key = this._key(x, y);
    let tile = this.tiles.get(key);

    if (!update) return tile;

    if (!tile) {
      this.add(x, y, key);
    } else {
      this.tiles.delete(key);
      this.tiles.set(key, tile);
    }

    return tile;
  }

  clean() {
    while (this.tiles.size > this.maxTiles) {
      const oldestKey = this.tiles.keys().next().value;
      const tile = this.tiles.get(oldestKey);

      // is this necessary, or does the lib/browser manage it?
      if (tile?.img?.close) tile.img.close();

      this.tiles.delete(oldestKey);
    }
  }

  calculateMaxTiles() {
    this.maxTiles =
      (Math.ceil(CANVASW / TSIZE) + 3) *
      (Math.ceil(CANVASH / TSIZE) + 3) *
      2;
  }

  reset() {
    for (const tile of this.tiles.values()) {
      if (tile.img?.close) tile.img.close();
    }

    this.tiles.clear();
    this.allTilesReady = false;
  }
}

class MapLayer {
  constructor(canvas, z) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.z = z;

    this.tiles = new Tiles(z);

    this.resetTransform();

    this.lastP = new Coord();
  }

  resetTransform() {
    this.numOfX = Math.ceil(CANVASW / TSIZE);
    if (this.numOfX % 2 === 0) this.numOfX++;
    this.numOfY = Math.ceil(CANVASH / TSIZE);
    if (this.numOfY % 2 === 0) this.numOfY++;
    this.tiles.calculateMaxTiles();
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "20px sans-serif";
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(CANVASW / 2, CANVASH / 2);
  }

  clean() {
    this.tiles.reset();
  }

  needsRendering(loc, z, update) {
    return loc.equals(this.lastP) && this.allTilesReady;
  }

  renderMap(loc, z, update) {
    if (windowResized) this.resetTransform();

    const p = loc.virtToTile(this.z);

    const scale = Math.pow(2, z - this.z);

    let allReady = true;

    let numOfX = Math.ceil(this.canvas.width / TSIZE);
    if (numOfX % 2 === 0) numOfX++;

    let numOfY = Math.ceil(this.canvas.height / TSIZE);
    if (numOfY % 2 === 0) numOfY++;

    this.ctx.setTransform(scale, 0, 0, scale,
      this.canvas.width / 2,
      this.canvas.height / 2);

    const px = Math.floor(p.x);
    const py = Math.floor(p.y);
    const pxOff = (p.x - px) * TSIZE;
    const pyOff = (p.y - py) * TSIZE;

    const pAlpha = this.ctx.globalAlpha;

    const now = performance.now()

    for (let x = -1; x < numOfX + 1; x++) {
      for (let y = -1; y < numOfY + 1; y++) {
        const xloc = x * TSIZE - (numOfX - 1) * TSIZE / 2 - pxOff;
        const yloc = y * TSIZE - (numOfY - 1) * TSIZE / 2 - pyOff;

        let tx = px + x - (numOfX - 1) / 2;
        let ty = py + y - (numOfY - 1) / 2;

        //TODO: make it only one access
        const tile = this.tiles.tile(tx, ty, update);
      
        let fullyDrawn = false;

        if (tile?.loaded) {
          let alpha = 1;

          if (tile?.fadeStart) {
            const elapsed = now - tile.fadeStart;
            alpha = Math.min(pAlpha, elapsed / FADE_MILLIS);
          }
          if (alpha < 0.99) {
            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(tile.img, xloc, yloc, TSIZE + 1, TSIZE + 1);
            this.ctx.globalAlpha = pAlpha;
          } else {
            alpha = 1;
            this.ctx.drawImage(tile.img, xloc, yloc, TSIZE + 1, TSIZE + 1);
            fullyDrawn = true;
          }
        }

        if (!tile || !fullyDrawn || tile.failed) allReady = false;

        if (DEBUGTILES) {
          this.ctx.strokeRect(xloc, yloc, TSIZE, TSIZE);
          this.ctx.fillText([tx, ty].toString(), xloc + TSIZE / 2, yloc + TSIZE / 2);
        }
      }
    }

    this.finishedDrawing = loc.equals(this.lastP) && this.allTilesReady && !windowResized;

    this.allTilesReady = allReady || !update;
    this.lastP.set(loc);
  }
}

