const DEBUGTILES = false;
const FADE_MILLIS = 200;

class MapLayer {
  constructor(canvas, z) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.z = z;

    this.tiles = new Map();

    this.resetTransform();

    this.lastP = new Coord();
  }

  resetTransform() {
    this.numOfX = Math.ceil(CANVASW / TSIZE);
    if (this.numOfX % 2 === 0) this.numOfX++;
    this.numOfY = Math.ceil(CANVASH / TSIZE);
    if (this.numOfY % 2 === 0) this.numOfY++;
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
    this.tiles.forEach((tile) => {
      tile.cancel();
    });
  }

  needsRendering(loc, z, update) {
    return loc.equals(this.lastP) && this.allTilesReady;
  }

  resolveTileUrl(z, x, y) {
    return TILESURL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  }

  addTile(tx, ty, it) {
    const key = `${tx}/${ty}`;
    let tile = this.tiles.get(key);
    if (tile) {
      tile.it = it;
      return;
    }
    tile = {
      it: it,
      pos: new Coord(tx, ty),
      loaded: false,
      failed: false,
      img: null,
      fadeStart: it
    };

    const img = new Image();

    img.src = this.resolveTileUrl(this.z, tx, ty);

    img.onload = () => {
      tile.img = img;
      tile.loaded = true;
      tile.fadeStart = performance.now();
    };

    img.onerror = () => tile.failed = true;

    tile.cancel = () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
      this.tiles.delete(key);
    };

    this.tiles.set(key, tile);
  }

  getTiles(loc) {
    const p = loc.virtToTile(this.z);

    const tilesWide = CANVASW / TSIZE;
    const tilesHigh = CANVASH / TSIZE;

    const minX = Math.floor(p.x - tilesWide / 2);
    const maxX = Math.ceil(p.x + tilesWide / 2);

    const minY = Math.floor(p.y - tilesHigh / 2);
    const maxY = Math.ceil(p.y + tilesHigh / 2);

    console.log(tilesWide, tilesHigh);

    const it = performance.now();

    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        this.addTile(tx, ty, it);
      }
    }

    this.tiles.forEach(tile => {
      if (
        tile.it !== it &&
        (
          tile.pos.x < minX - 1 ||
          tile.pos.x > maxX + 1 ||
          tile.pos.y < minY - 1 ||
          tile.pos.y > maxY + 1
        )
      ) {
        tile.cancel();
      }
    });
  }

  renderMap(loc, z, update) {
    if (windowResized) this.resetTransform();

    this.getTiles(loc);

    const scale = Math.pow(2, z - this.z);

    let allReady = true;

    this.ctx.setTransform(scale, 0, 0, scale,
      this.canvas.width / 2,
      this.canvas.height / 2);

    const pAlpha = this.ctx.globalAlpha;

    const now = performance.now()

    const boundsX = CANVASW / scale / 2 + TSIZE, boundsY = CANVASH / scale / 2 + TSIZE;

    this.tiles.forEach((tile, key) => {
      const ppx = tile.pos.tileToPx(this.z, loc);
      if (ppx.x < -boundsX || ppx.x > boundsX ||
        ppx.y < -boundsY || ppx.y > boundsY) return;

      let fullyDrawn = false;

      if (tile?.loaded) {
        let alpha = 1;

        if (tile?.fadeStart) {
          const elapsed = now - tile.fadeStart;
          alpha = Math.min(pAlpha, elapsed / FADE_MILLIS);
        }
        if (alpha < 0.99) {
          this.ctx.globalAlpha = alpha;
          this.ctx.drawImage(tile.img, ppx.x, ppx.y, TSIZE + 1, TSIZE + 1);
          this.ctx.globalAlpha = pAlpha;
        } else {
          alpha = 1;
          this.ctx.drawImage(tile.img, ppx.x, ppx.y, TSIZE + 1, TSIZE + 1);
          fullyDrawn = true;
        }

      }

      if (!tile || !fullyDrawn || tile.failed) allReady = false;

      if (DEBUGTILES) {
        this.ctx.strokeRect(ppx.x, ppx.y, TSIZE, TSIZE);
        this.ctx.fillText(
          [tile.pos.x, tile.pos.y].toString(),
          ppx.x + TSIZE / 2, ppx.y + TSIZE / 2
        );
      }
    });

    this.finishedDrawing = loc.equals(this.lastP) && this.allTilesReady && !windowResized;

    this.allTilesReady = allReady || !update;
    this.lastP.set(loc);
  }
}

