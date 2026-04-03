msgpackr.addExtension({
  Class: Coord,
  type: 1,
  write(coord) {
    return [coord.x, coord.y];
  },
  read(data) {
    return new Coord(data[0], data[1]);
  }
});

msgpackr.addExtension({
  Class: Station,
  type: 2,
  write(station) {
    return [station.id, station.coords, station.props];
  },
  read(s) {
    return new Station(s[0], s[1], s[2]);
  }
});

msgpackr.addExtension({
  Class: LineNode,
  type: 3,
  write(ln) {
    return [ln.coords, ln.minZ];
  },
  read(data) {
    return new LineNode(data[0], data[1]);
  }
});

msgpackr.addExtension({
  Class: RCoord,
  type: 4,
  write(coord) {
    return [coord.x, coord.y, coord.r];
  },
  read(data) {
    return new RCoord(data[0], data[1], data[2]);
  }
});

msgpackr.addExtension({
  Class: MapLine,
  type: 5,
  write(ml) {
    return [ml.nodes, ml.lineProps];
  },
  read(data) {
    return new MapLine(data[1], data[0]);
  }
});

msgpackr.addExtension({
  Class: LineProps,
  type: 6,
  write(ml) {
    return [ml.name, ml.lineWidth, ml.color];
  },
  read(data) {
    return new LineProps(data[0], data[1], data[2]);
  }
});

const packr = new msgpackr.Packr({ structuredClone: true });

function saveData(data) {
  const packed = packr.pack(data);
  const blob = new Blob([packed], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.msgpack";
  a.click();
}

async function loadData(location) {
  const res = await fetch(location);
  const buffer = await res.arrayBuffer();
  return packr.unpack(new Uint8Array(buffer));
}
function loadDataIntoStations(location) {
  loadData(location).then(data => stations = data);
}
function loadDataIntoLines(location) {
  loadData(location).then(data => lines = data);
}
let testData;
function loadDataIntoTest(location) {
  loadData(location).then(data => testData = data);
}