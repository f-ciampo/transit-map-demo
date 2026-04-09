
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
  constructor(tileFetcher, z) {
    this.z = z;
    this.tiles = new Map();
    this.tileFetcher = tileFetcher;

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

  async fetchTileBitmap(x, y) {
    const r = await this.tileFetcher.getTileImg(this.z, x, y);
    if (r) return r;
    return null;
  }

  add(x, y, key = this._key(x, y)) {
    const tile = {
      loaded: false,
      failed: false,
      img: null
    };

    this.tiles.set(key, tile);

    this.fetchTileBitmap(x, y)
      .then(bitmap => {
        const t = this.tiles.get(key);
        if (!t) return;

        t.img = bitmap;
        t.loaded = true;

        if (!t.fadeStart) {
          t.fadeStart = performance.now();
        }
      })
      .catch(() => {
        const t = this.tiles.get(key);
        if (t) t.failed = true;
      });
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
      (CANVASW / TSIZE + 1) *
      (CANVASH / TSIZE + 1) *
      3;
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
  constructor(canvas, pm, z) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.z = z;

    this.tiles = new Tiles(pm, z);

    this.resetTransform();

    this.lastP = new Coord();
  }

  resetTransform() {
    this.tiles.calculateMaxTiles();
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "20px sans-serif";
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
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
        const img = tile?.img;//this.tiles.img(tx, ty, update);

        let fullyDrawn = false;

        if (tile?.loaded && img) {
          let alpha = 1;

          if (tile?.fadeStart) {
            const elapsed = now - tile.fadeStart;
            alpha = Math.min(pAlpha, elapsed / FADE_MILLIS);
          }
          if (alpha < 0.99) {
            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(img, xloc, yloc, TSIZE + 1, TSIZE + 1);
            this.ctx.globalAlpha = pAlpha;
          } else {
            alpha = 1;
            this.ctx.drawImage(img, xloc, yloc, TSIZE + 1, TSIZE + 1);
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

    this.finishedDrawing = loc.equals(this.lastP) && this.allTilesReady;

    this.allTilesReady = allReady || !update;
    this.lastP.set(loc);
  }
}

