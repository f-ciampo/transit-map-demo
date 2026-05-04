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
    const px = Math.floor(p.x);
    const py = Math.floor(p.y);

    //TODO: only add 1 when it is necessary
    let numOfX = Math.ceil(this.canvas.width / TSIZE) + 1;
    let numOfY = Math.ceil(this.canvas.height / TSIZE) + 1;

    const it = performance.now();

    let halfX = Math.floor(numOfX / 2), halfY = Math.floor(numOfY / 2);
    if (p.x - px > 0.5 && numOfX % 2 === 0) halfX--;
    if (p.y - py > 0.5 && numOfY % 2 === 0) halfY--;

    for (let x = 0; x < numOfX; x++) {
      for (let y = 0; y < numOfY; y++) {
        let tx = px + x - halfX;
        let ty = py + y - halfY;
        this.addTile(tx, ty, it);
      }
    }

    this.tiles.forEach(tile => {
      if (
        tile.it !== it &&
        (tile.pos.x < px - halfX - 1 || tile.pos.x > px + (numOfX - halfX) ||
          (tile.pos.y < py - halfY - 1 || tile.pos.y > py + (numOfY - halfY)))
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
      if (ppx.x < -boundsX || ppx.x > boundsY ||
        ppx.y < -boundsX || ppx.y > boundsY) return;

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

