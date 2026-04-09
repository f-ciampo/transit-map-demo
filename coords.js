function wdExtentPx(z) {
  return Math.pow(2, z) * TSIZE;
}

function pxToVirt(z, px) {
  return px / wdExtentPx(z) * WORLD_EXTENT;
}
function virtToPx(z, v) {
  return v * wdExtentPx(z) / WORLD_EXTENT;
}
function virtToTile(z, v) {
  return v / WORLD_EXTENT * Math.pow(2, z);
}

function latToVirtY(lat) {
  const t = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180;
  const m = Math.log(Math.tan(Math.PI / 4 + t / 2));
  return (1 - m / Math.PI) * 0.5 * WORLD_EXTENT;
}

function lngToVirtX(lng) {
  return (lng + 180) / 360 * WORLD_EXTENT;
}

class Coord {
  constructor(x = 0.0, y = 0.0) {
    this.x = x, this.y = y;
  }
  add(coord) {
    this.x += coord.x, this.y += coord.y;
    return this;
  }
  addXY(x, y) {
    this.x += x, this.y += y;
    return this;
  }
  added(coord) {
    return new this.constructor(this.x + coord.x, this.y + coord.y);
  }
  addedXY(x, y) {
    return new this.constructor(this.x + x, this.y + y);
  }
  sub(coord) {
    this.x -= coord.x, this.y -= coord.y;
    return this;
  }
  subXY(x, y) {
    this.x -= x, this.y -= y;
    return this;
  }
  subed(coord) {
    return new this.constructor(this.x - coord.x, this.y - coord.y);
  }
  subedXY(x, y) {
    return new this.constructor(this.x - x, this.y - y);
  }
  mult(coord) {
    this.x *= coord.x, this.y *= coord.y;
    return this;
  }
  multXY(x, y) {
    this.x *= x, this.y *= y;
    return this;
  }
  multed(coord) {
    return new this.constructor(this.x * coord.x, this.y * coord.y);
  }
  multedXY(x, y) {
    return new this.constructor(this.x * x, this.y * y);
  }
  div(coord) {
    this.x /= coord.x, this.y /= coord.y;
    return this;
  }
  divXY(x, y) {
    this.x /= x, this.y /= y;
    return this;
  }
  dived(coord) {
    return new this.constructor(this.x / coord.x, this.y / coord.y);
  }
  divedXY(x, y) {
    return new this.constructor(this.x / x, this.y / y);
  }
  reset() {
    this.x = this.y = 0.0;
    return this;
  }
  set(coord) {
    this.x = coord.x, this.y = coord.y;
    return this;
  }
  setXY(x, y) {
    this.x = x, this.y = y;
    return this;
  }
  dist(coord) {
    const dx = coord.x - this.x, dy = coord.y - this.y;
    return Math.hypot(dx, dy);
  }
  distXY(x, y) {
    const dx = x - this.x, dy = y - this.y;
    return Math.hypot(dx, dy);
  }
  hyp() {
    return Math.hypot(this.x, this.y);
  }
  len() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  mid(coord) {
    return new this.constructor(
      (this.x + coord.x) / 2,
      (this.y + coord.y) / 2
    );
  }
  midXY(x, y) {
    return new this.constructor(
      (this.x + x) / 2,
      (this.y + y) / 2
    );
  }
  round(multiple) {
    if (multiple) {
      this.x = multiple * Math.round(this.x / multiple);
      this.y = multiple * Math.round(this.y / multiple);
    } else {
      this.x = Math.round(this.x), this.y = Math.round(this.y);
    }
    return this;
  }
  clone() {
    return new this.constructor(this.x, this.y);
  }
  lerp(coord, ease) {
    this.x += (coord.x - this.x) * ease;
    this.y += (coord.y - this.y) * ease;
    if (Math.abs(coord.x - this.x) < 1E-4)
      this.x = coord.x;
    if (Math.abs(coord.y - this.y) < 1E-4)
      this.y = coord.y;
    return this;
  }
  projectedToLine(lineStart, lineEnd) {
    const x1 = lineStart.x;
    const y1 = lineStart.y;

    const x2 = lineEnd.x;
    const y2 = lineEnd.y;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return new Coord(x1, y1);
    }

    let t = ((this.x - x1) * dx + (this.y - y1) * dy) / lengthSq;

    t = Math.max(0, Math.min(1, t));

    return new Coord(
      x1 + t * dx,
      y1 + t * dy
    );
  }
  snapInsideBbox(bbox) {
    if (this.x < bbox.minX) this.x = bbox.minX;
    if (this.y < bbox.minY) this.y = bbox.minY;
    if (this.x > bbox.maxX) this.x = bbox.maxX;
    if (this.y > bbox.maxY) this.y = bbox.maxY;
    return this;
  }
  equals(coord, precision = 1E-6) {
    if (!coord) return false;
    return (Math.abs(coord.x - this.x) < precision &&
      Math.abs(coord.y - this.y) < precision);
  }
  pxToVirt(z, tgt = new this.constructor()) {
    tgt.setXY(pxToVirt(z, this.x), pxToVirt(z, this.y));
    return tgt;
  }
  virtToPx(z, viewLoc, tgt = new this.constructor()) {
    if (viewLoc) {
      tgt.setXY(virtToPx(z, this.x - viewLoc.x),
                virtToPx(z, this.y - viewLoc.y));
    } else {
      tgt.setXY(virtToPx(z, this.x), virtToPx(z, this.y));
    }
    return tgt;
  }
  virtToTile(z, tgt = new this.constructor()) {
    tgt.setXY(virtToTile(z, this.x), virtToTile(z, this.y));
    tgt.z = z;
    return tgt;
  }
  latLngToVirt() {
    return new this.constructor(lngToVirtX(this.x), latToVirtY(this.y));
  }
  toBbox() {
    return { minX: this.x, minY: this.y, maxX: this.x, maxY: this.y };
  }
  bboxMinX() {
    return this.x;
  }
  bboxMinY() {
    return this.y;
  }
  isPxInView(margins = 0) {
    return this.x > -CANVASW / 2 - margins &&
      this.x < CANVASW / 2 + margins &&
      this.y > -CANVASH / 2 - margins &&
      this.y < CANVASH / 2 + margins;
  }
}

class RCoord extends Coord {
  constructor(x = 0, y = 0, r = 0) {
    super(x, y);
    this.r = r;
  }

  clone() {
    return new this.constructor(this.x, this.y, this.r);
  }
}

class FlingCoord extends Coord {
  constructor(friction, tgt) {
    super();
    this.tgt = tgt;
    this.friction = friction;
    this.vel = new Coord();
  }
  follow() {
    if (this.equals(this.tgt, 1E-3)) {
      this.set(this.tgt);
      this.vel.reset();
    } else this.vel.set(this.tgt.subed(this));
  }
  reset() {
    super.reset();
    this.vel.reset();
  }
  update(dt) {
    const f = Math.pow(this.friction, dt / 16);
    this.add(this.vel);
    this.vel.multXY(f, f);
  }
}

class Bbox {
  constructor(minX = 0.0, minY = 0.0, maxX = 0.0, maxY = 0.0) {
    this.minX = minX, this.minY = minY;
    this.maxX = maxX, this.maxY = maxY;
  }
  set(minX = 0.0, minY = 0.0, maxX = 0.0, maxY = 0.0) {
    this.minX = minX, this.minY = minY;
    this.maxX = maxX, this.maxY = maxY;
  }
  clone() {
    return new Bbox(this.minX, this.minY, this.maxX, this.maxY);
  }
  addXY(x, y) {
    this.minX += x, this.maxX += x;
    this.minY += y, this.maxY += y;
  }
  scale(f) {
    const cx = (this.minX + this.maxX) / 2;
    const cy = (this.minY + this.maxY) / 2;
    const hw = (this.maxX - this.minX) / 2 * f;
    const hh = (this.maxY - this.minY) / 2 * f;
    this.minX = cx - hw;
    this.maxX = cx + hw;
    this.minY = cy - hh;
    this.maxY = cy + hh;
    return this;
  }
  scaled(f) {
    return this.clone().scale(f);
  }
  contains(c) {
    return (this.minX <= c.x && c.x <= this.maxX &&
      this.minY <= c.y && c.y <= this.maxY);
  }
  containsXY(x, y) {
    return (this.minX <= x && x <= this.maxX &&
      this.minY <= y && y <= this.maxY);
  }
  overlapsBbox(bbox) {
    if (!bbox) return;
    return (
      this.minX <= bbox.maxX &&
      this.maxX >= bbox.minX &&
      this.minY <= bbox.maxY &&
      this.maxY >= bbox.minY
    );
  }
  round() {
    this.minX = Math.floor(this.minX);
    this.minY = Math.floor(this.minY);
    this.maxX = Math.ceil(this.maxX);
    this.maxY = Math.ceil(this.maxY);
    return this;
  }
  setFromView(z, viewLoc) {
    const dx = pxToVirt(z, CANVASW / 2), dy = pxToVirt(z, CANVASH / 2);
    this.minX = viewLoc.x - dx;
    this.maxX = viewLoc.x + dx;
    this.minY = viewLoc.y - dy;
    this.maxY = viewLoc.y + dy;
    return this;
  }
  virtToPx(z, viewLoc = new Coord()) {
    return new Bbox(
      virtToPx(z, this.minX - viewLoc.x), virtToPx(z, this.minY - viewLoc.y),
      virtToPx(z, this.maxX - viewLoc.x), virtToPx(z, this.maxY - viewLoc.y)
    );
  }
  latLngToVirt() {
    return new Bbox(
      lngToVirtX(this.minX), latToVirtY(this.minY),
      lngToVirtX(this.maxX), latToVirtY(this.maxY)
    );
  }
}
