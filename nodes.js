class Station {
  constructor(id, coords, props, minZ = MAXZOOM - props.length + 1) {
    this.id = id;
    this.coords = coords;
    this.props = [];
    for (let z = MAXZOOM; z >= minZ; z--) {
      this.setProp(z, props?.[MAXZOOM - z]);
    }
    this.minZ = minZ;
  }
  setProp(z, prop) {
    this.minZ = Math.min(z, this.minZ);
    if (prop) {
      const next = this.getProp(z + 1);
      if (next) prop.__proto__ = next;
    }
    this.props[MAXZOOM - z] = prop;
  }
  setCoord(z, coord) {
    this.minZ = Math.min(z, this.minZ);
    this.coords[MAXZOOM - z] = coord;
  }
  getCoord(z) {
    if (z < this.minZ) return;
    for (let i = MAXZOOM - z; i >= 0; i--) {
      if (this.coords[i]) return this.coords[i];
    }
  }
  getProp(z) {
    if (z < this.minZ) return;
    for (let i = MAXZOOM - z; i >= 0; i--) {
      if (this.props[i]) return this.props[i];
    }
  }
  extendUp() {
    this.coords.push(this.coords.at(-1).clone());
    this.props.push({ ...this.props.at(-1) });
  }
  lightlyExtendUp() {
    this.minZ--;
  }
  clone() {
    const c = new this.constructor(this.id);
    c.coords = this.coords.map(coord => coord?.clone());
    c.minZ = this.minZ;
    for(let i = this.minZ; i <= MAXZOOM; i++) {
      c.setProp(i, this.getProp(i));
    }
    return c;
  }
}

class MapLine {
  constructor(lineProps, nodes) {
    this.nodes = nodes;
    this.lineProps = lineProps;
  }
  extendUp() {
    for (const n of this.nodes) {
      n.extendUp();
    }
  }
  lightlyExtendUp() {
    for (const n of this.nodes) {
      n.lightlyExtendUp();
    }
  }
  addCoord(z, coord) {
    const rc = new RCoord(coord.x, coord.y);
    const ln = new LineNode();
    ln.setCoord(z, rc);
    this.nodes.push(ln);
    return ln;
  }
}

class LineNode {
  constructor(coords = [], minZ = MAXZOOM - coords.length) {
    this.coords = coords;
    this.minZ = minZ;
  }
  getCoord(z) {
    if (z < this.minZ) return;
    for (let i = MAXZOOM - z; i >= 0; i--) {
      if (this.coords[i]) return this.coords[i];
    }
  }
  setCoord(z, coord) {
    this.minZ = Math.min(z, this.minZ);
    this.coords[MAXZOOM - z] = coord;
    return this;
  }
  extendUp() {
    this.setCoord(this.minZ - 1, this.getCoord(this.minZ).clone());
    return this;
  }
  lightlyExtendUp() {
    this.minZ--;
  }
  removeZ(z) {
    if (this.minZ > z) return;
    if (this.coords[MAXZOOM - z]) {
      if (this.minZ === z) this.coords.pop();
      else this.coords[MAXZOOM - z] = undefined;
    }
    if (this.minZ === z) this.minZ++;
  }
  clone() {
    const c = new this.constructor();
    c.coords = this.coords.map(coord => coord?.clone());
    c.minZ = this.minZ;
    return c;
  }
}

class LineProps {
  constructor(name, lineWidth, color) {
    this.name = name;
    this.lineWidth = lineWidth;
    this.color = color;
  }
}