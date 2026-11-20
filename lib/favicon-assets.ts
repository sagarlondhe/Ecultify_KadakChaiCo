import { deflateSync } from 'node:zlib';

const SIZE = 64;
const SCALE = 3;
const SOURCE_SIZE = SIZE * SCALE;
type Color = readonly [number, number, number, number];

const colors = {
  background: [73, 43, 29, 255],
  steam: [233, 182, 93, 255],
  cupBorder: [215, 162, 78, 255],
  cup: [247, 237, 218, 255],
  tea: [200, 135, 57, 255],
} satisfies Record<string, Color>;

function setPixel(
  pixels: Buffer,
  x: number,
  y: number,
  color: Color
): void {
  if (x < 0 || y < 0 || x >= SOURCE_SIZE || y >= SOURCE_SIZE) return;
  const offset = (y * SOURCE_SIZE + x) * 4;
  pixels.set(color, offset);
}

function drawShape(
  pixels: Buffer,
  contains: (x: number, y: number) => boolean,
  color: Color
): void {
  for (let y = 0; y < SOURCE_SIZE; y += 1) {
    for (let x = 0; x < SOURCE_SIZE; x += 1) {
      if (contains((x + 0.5) / SCALE, (y + 0.5) / SCALE)) {
        setPixel(pixels, x, y, color);
      }
    }
  }
}

function fillEllipse(
  pixels: Buffer,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: Color
): void {
  drawShape(
    pixels,
    (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1,
    color
  );
}

function fillPolygon(
  pixels: Buffer,
  points: readonly (readonly [number, number])[],
  color: Color
): void {
  drawShape(pixels, (x, y) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (
        (yi > y) !== (yj > y) &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }, color);
}

function strokePath(
  pixels: Buffer,
  points: readonly (readonly [number, number])[],
  width: number,
  color: Color
): void {
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const minX = Math.floor((Math.min(x1, x2) - width) * SCALE);
    const maxX = Math.ceil((Math.max(x1, x2) + width) * SCALE);
    const minY = Math.floor((Math.min(y1, y2) - width) * SCALE);
    const maxY = Math.ceil((Math.max(y1, y2) + width) * SCALE);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const px = (x + 0.5) / SCALE;
        const py = (y + 0.5) / SCALE;
        const projection = Math.max(
          0,
          Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared)
        );
        const nearestX = x1 + projection * dx;
        const nearestY = y1 + projection * dy;
        if ((px - nearestX) ** 2 + (py - nearestY) ** 2 <= (width / 2) ** 2) {
          setPixel(pixels, x, y, color);
        }
      }
    }
  }
}

function bezier(
  start: readonly [number, number],
  control1: readonly [number, number],
  control2: readonly [number, number],
  end: readonly [number, number]
): readonly (readonly [number, number])[] {
  return Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    const inverse = 1 - t;
    return [
      inverse ** 3 * start[0] +
        3 * inverse ** 2 * t * control1[0] +
        3 * inverse * t ** 2 * control2[0] +
        t ** 3 * end[0],
      inverse ** 3 * start[1] +
        3 * inverse ** 2 * t * control1[1] +
        3 * inverse * t ** 2 * control2[1] +
        t ** 3 * end[1],
    ];
  });
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc ^= data[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

export function createFaviconPng(): Buffer {
  const source = Buffer.alloc(SOURCE_SIZE * SOURCE_SIZE * 4);
  drawShape(
    source,
    (x, y) => {
      const dx = Math.max(8 - x, 0, x - 56);
      const dy = Math.max(8 - y, 0, y - 56);
      return dx * dx + dy * dy <= 10 * 10;
    },
    colors.background
  );

  fillEllipse(source, 45, 37, 8, 7, colors.steam);
  fillEllipse(source, 44.5, 37, 4.5, 4.5, colors.background);
  strokePath(
    source,
    bezier([24, 21], [20, 17], [28, 15], [24, 10]),
    2.8,
    colors.steam
  );
  strokePath(
    source,
    bezier([33, 20], [29, 16], [37, 14], [33, 9]),
    2.8,
    colors.steam
  );
  strokePath(
    source,
    bezier([42, 21], [38, 17], [46, 15], [42, 10]),
    2.8,
    colors.steam
  );
  fillPolygon(
    source,
    [
      [15, 26],
      [44, 26],
      [41, 47],
      [38, 50],
      [21, 50],
      [18, 47],
    ],
    colors.cupBorder
  );
  fillPolygon(
    source,
    [
      [17, 27],
      [42, 27],
      [39, 46],
      [37, 48],
      [22, 48],
      [20, 46],
    ],
    colors.cup
  );
  fillEllipse(source, 29.5, 27.1, 12.5, 2.5, colors.tea);
  strokePath(source, [[18, 54], [42, 54]], 2.8, colors.steam);

  const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const row = y * (SIZE * 4 + 1);
    for (let x = 0; x < SIZE; x += 1) {
      const outputOffset = row + 1 + x * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        let total = 0;
        for (let sy = 0; sy < SCALE; sy += 1) {
          for (let sx = 0; sx < SCALE; sx += 1) {
            const sourceOffset =
              (((y * SCALE + sy) * SOURCE_SIZE + x * SCALE + sx) * 4) +
              channel;
            total += source[sourceOffset];
          }
        }
        raw[outputOffset + channel] = Math.round(total / (SCALE * SCALE));
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function createFaviconIco(): Buffer {
  const png = createFaviconPng();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = SIZE;
  header[7] = SIZE;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18);
  return Buffer.concat([header, png]);
}
