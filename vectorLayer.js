class VectorLayer {
  constructor(linesCanvas, nodesCanvas, textCanvas) {
    this.linesCanvas = linesCanvas;
    this.nodesCanvas = nodesCanvas;
    this.textCanvas = textCanvas;
    this.lCtx = linesCanvas.getContext("2d");
    this.nCtx = nodesCanvas.getContext("2d");
    this.tCtx = textCanvas.getContext("2d");

    this.renderMargins = 200;

    this.defaults();

    this.prev = {};

    this.finishedDrawing = false;
  }
  defaults() {
    this.lCtx.lineCap = "round";
    this.lCtx.lineJoin = "round";

    this.tCtx.font = "18px 'D-DIN Regular'";
    this.tCtx.textBaseline = "top";
    this.tCtx.textAlign = "center";
    this.tCtx.fillStyle = "#222222";
    this.tCtx.strokeStyle = "#FFFFFF";
  }

  clear() {
    this.lCtx.clearRect(
      -this.linesCanvas.width / 2,
      -this.linesCanvas.height / 2,
      this.linesCanvas.width,
      this.linesCanvas.height
    );
    this.nCtx.clearRect(
      -this.nodesCanvas.width / 2,
      -this.nodesCanvas.height / 2,
      this.nodesCanvas.width,
      this.nodesCanvas.height
    );
    this.tCtx.clearRect(
      -this.textCanvas.width / 2,
      -this.textCanvas.height / 2,
      this.textCanvas.width,
      this.textCanvas.height
    );
  }

  getNodePx(node, z, z0, z1, t, loc) {
    const c0 = node.getCoord(z0);
    const c1 = node.getCoord(z1);

    if (!c0 || !c1) return;

    const p = new Coord(
      lerp(c0.x, c1.x, t), lerp(c0.y, c1.y, t)
    );
    return p.virtToPx(z, loc);
  }

  getNodeRadius(node, z0, z1, t) {
    const r0 = node.getCoord(z0)?.r ?? 0;
    const r1 = node.getCoord(z1)?.r ?? r0;
    return lerp(r0, r1, t);
  }

  render(loc, viewZ, z0, z1, stations, lines, selected) {
    if (windowResized) this.defaults();

    const t = (z0 === z1) ? 1 : (viewZ - z0) / (z1 - z0);

    this.clear();

    for (const s of stations) {
      this.renderStation(s, viewZ, z0, z1, t, loc, selected);
    }

    const debugNodes = [];

    for (const l of lines) {
      this.renderLine(l, viewZ, z0, z1, t, loc, selected);

      if (!EDITLINES) continue;
      let curr;
      for (const n of l.nodes) {
        curr = this.getNodePx(n, viewZ, z0, z1, t, loc);
        if (!curr) continue;
        this.lCtx.beginPath();
        this.lCtx.strokeStyle = '#ff0000';
        this.lCtx.fillStyle = n === selected ? '#ff0000' : '#ffffff';
        this.lCtx.lineWidth = 2;
        this.lCtx.arc(curr.x, curr.y, 5, 0, Math.PI * 2);
        this.lCtx.stroke();
        this.lCtx.fill();
      }
      for (const n of debugNodes) {
        this.lCtx.beginPath();
        this.lCtx.fillStyle = '#ffaa00';
        this.lCtx.lineWidth = 0;
        this.lCtx.arc(n.x, n.y, 5, 0, Math.PI * 2);
        this.lCtx.fill();
      }
    }
    this.lCtx.globalAlpha = 1;


    this.finishedDrawing =
      loc.equals(this.prev?.loc) && viewZ === this.prev.viewZ &&
      z0 === this.prev.z0 && z1 === this.prev.z1 && selected === this.prev.selected &&
      stations?.length > 0 && lines?.length > 0;
    this.prev = { loc, viewZ, z0, z1, selected };
  }
  renderLine(l, viewZ, z0, z1, t, loc, selected) {
    const props = l.lineProps;
    this.lCtx.lineWidth = props.lineWidth;
    this.lCtx.strokeStyle = props.color;

    let curr = this.getNodePx(l.nodes[0], viewZ, z0, z1, t, loc);
    if (!curr) return;

    this.lCtx.beginPath();
    this.lCtx.moveTo(curr.x, curr.y);

    let prev = curr;
    let pendingNodes = 0;

    let prevNode = l.nodes[0];

    for (let i = 1; i < l.nodes.length; i++) {
      curr = this.getNodePx(l.nodes[i], viewZ, z0, z1, t, loc);

      if (!curr) {
        pendingNodes++;
        continue;
      } else pendingNodes = 0;

      const r = virtToPx(z, (this.getNodeRadius(prevNode, z0, z1, t)));

      if (!r) {
        this.lCtx.lineTo(
          prev.x, prev.y,
        );
      } else {
        this.lCtx.arcTo(
          prev.x, prev.y,
          curr.x, curr.y,
          r
        );
      }

      prev = curr;
      prevNode = l.nodes[i];
    }

    if (curr) this.lCtx.lineTo(curr.x, curr.y);
    this.lCtx.stroke();

  }
  renderStation(s, viewZ, z0, z1, t, loc, selected) {
    const coord = this.getNodePx(s, viewZ, z0, z1, t, loc);
    if (!coord) return;

    if (!coord.isPxInView(this.renderMargins)) return;

    const fillStyle = s === selected ? "#FF8888" : "#FFFFFF";

    const props = s.getProp(z0);
    if (!props) {
      this.nCtx.beginPath();
      this.nCtx.fillStyle = fillStyle;
      this.nCtx.arc(coord.x, coord.y, 3, 0, Math.PI * 2);
      this.nCtx.fill();
      return;
    }


    const lineProps = props.lineProps;

    const strokeStyle = lineProps?.color ? lineProps.color : "#000000";
    const r = lineProps?.lineWidth ? lineProps.lineWidth / 2 - 1 : 3;

    this.nCtx.beginPath();
    this.nCtx.fillStyle = fillStyle;
    this.nCtx.strokeStyle = strokeStyle;
    this.nCtx.lineWidth = 6;
    this.nCtx.arc(coord.x, coord.y, r, 0, Math.PI * 2);
    this.nCtx.stroke();
    this.nCtx.fill();

    const props1 = s.getProp(z1);
    if (props === props1) {
      this.renderStationText(coord, props);
    } else {
      //TODO: clean this up with a general function
      const hold = 0.1;
      const tA = Math.max(0, (t - hold) / (1 - hold));
      const tB = Math.max(0, (1 - t - hold) / (1 - hold));

      const fadeA = Math.pow(tA, 2);
      const fadeB = Math.pow(tB, 2);

      const minSep = 0.7;
      const separation = minSep + (1 - minSep) * (Math.abs(t - 0.5) * 2);

      this.tCtx.globalAlpha = fadeA * separation;
      this.renderStationText(coord, props1);

      this.tCtx.globalAlpha = fadeB * separation;
      this.renderStationText(coord, props);

      this.tCtx.globalAlpha = 1;
    }
  }
  renderStationText(coord, props) {
    if (props?.title) {
      this.tCtx.save();
      this.tCtx.translate(coord.x, coord.y);
      this.tCtx.lineWidth = 5;

      const r = props.titleRot;
      let x = 0, y = 8;

      if (props.titlePos)
        x = props.titlePos.x, y = props.titlePos.y;

      if (props.textAlign)
        this.tCtx.textAlign = props.textAlign;
      if (props.textBaseline)
        this.tCtx.textBaseline = props.textBaseline;

      if (r) {
        this.tCtx.rotate(r);
        if (r > Math.PI * 0.5 && r < Math.PI * 1.5) {
          //this.tCtx.textAlign = "right";
          this.tCtx.scale(-1, -1);
          x = -x;
        }
      }

      this.tCtx.fillStyle = props.lineProps?.textColor ?? "#000000";
      this.tCtx.outlinedTextMultiline(props.title, x, y, 22);
      this.tCtx.restore();
    }
  }
}

CanvasRenderingContext2D.prototype.outlinedTextMultiline = function (
  text,
  x,
  y,
  lineHeight = 20
) {
  const lines = text.split("\n");
  const totalHeight = (lines.length - 1) * lineHeight;

  let startY = y;

  switch (this.textBaseline) {
    case "top":
      startY = y;
      break;
    case "middle":
      startY = y - totalHeight / 2;
      break;
    case "bottom":
      startY = y - totalHeight;
      break;
    case "alphabetic":
    default:
      startY = y - totalHeight;
      break;
  }

  lines.forEach((line, i) => {
    this.strokeText(line, x, startY + i * lineHeight);
    this.fillText(line, x, startY + i * lineHeight);
  });
};