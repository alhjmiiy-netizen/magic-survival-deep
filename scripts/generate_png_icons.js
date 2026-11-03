import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Table for fast CRC32 computation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data ? data.length : 0;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  if (data && len > 0) {
    data.copy(chunk, 8);
  }
  const toCrc = Buffer.concat([typeBuf, data || Buffer.alloc(0)]);
  const checksum = crc32(toCrc);
  chunk.writeUInt32BE(checksum, 8 + len);
  return chunk;
}

function generateArcaneIconPNG(size, isMaskable = false) {
  const width = size;
  const height = size;
  const cx = width / 2;
  const cy = height / 2;
  const radius = width / 2;
  const safeRadius = isMaskable ? radius * 0.75 : radius * 0.92;

  // Uncompressed raw scanlines: each row has 1 filter byte (0) + width * 4 (RGBA)
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Base background color: Deep cosmic slate/obsidian (#020617 -> #090d16)
      let r = 2;
      let g = 6;
      let b = 23;
      let a = 255;

      // Outer radial glow
      const normDist = dist / radius;
      if (normDist < 1.0) {
        const bgGlow = (1 - normDist) * 0.35;
        r += Math.round(15 * bgGlow);
        g += Math.round(23 * bgGlow);
        b += Math.round(42 * bgGlow);
      }

      // Outer border circle (Gold)
      const ringDist = Math.abs(dist - safeRadius);
      if (ringDist < width * 0.015) {
        r = 245; g = 197; b = 66; // Bright gold
      } else if (Math.abs(dist - safeRadius * 0.75) < width * 0.01) {
        r = 56; g = 189; b = 248; // Cyan ring
      }

      // 8-pointed star wings
      // 8 rays: angle * 4 for 8 symmetrical points
      const rayAngle = Math.abs(Math.cos(angle * 4));
      const rayDist = safeRadius * 0.85 * (0.35 + 0.65 * Math.pow(rayAngle, 12));
      if (dist < rayDist) {
        const factor = 1 - (dist / rayDist);
        r = Math.min(255, r + Math.round(56 * factor + 180 * Math.pow(factor, 3)));
        g = Math.min(255, g + Math.round(189 * factor + 60 * Math.pow(factor, 2)));
        b = Math.min(255, b + Math.round(248 * factor));
      }

      // Central glowing diamond
      const diamondDist = (Math.abs(dx) + Math.abs(dy)) / (safeRadius * 0.38);
      if (diamondDist < 1.0) {
        const coreFactor = 1 - diamondDist;
        r = Math.min(255, r + Math.round(180 * coreFactor + 75 * Math.pow(coreFactor, 2)));
        g = Math.min(255, g + Math.round(230 * coreFactor + 25 * Math.pow(coreFactor, 2)));
        b = Math.min(255, b + Math.round(255 * coreFactor));
      }

      // Brilliant core center
      if (dist < safeRadius * 0.12) {
        const whiteCore = 1 - (dist / (safeRadius * 0.12));
        r = Math.min(255, r + Math.round(255 * whiteCore));
        g = Math.min(255, g + Math.round(255 * whiteCore));
        b = Math.min(255, b + Math.round(255 * whiteCore));
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Deflate compressed IDAT
  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6: RGBA
  ihdrData.writeUInt8(0, 10); // compression 0
  ihdrData.writeUInt8(0, 11); // filter 0
  ihdrData.writeUInt8(0, 12); // interlace 0
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', null);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');

const icon192 = generateArcaneIconPNG(192, false);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
console.log('Generated pwa-192x192.png');

const icon512 = generateArcaneIconPNG(512, false);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
console.log('Generated pwa-512x512.png');

const iconMaskable = generateArcaneIconPNG(512, true);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);
console.log('Generated pwa-maskable-512x512.png');

const appleTouchIcon = generateArcaneIconPNG(180, false);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
console.log('Generated apple-touch-icon.png');

console.log('All icons generated successfully!');
