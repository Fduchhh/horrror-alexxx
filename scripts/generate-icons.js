import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, drawFn) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    // calculate CRC32
    const toCrc = Buffer.concat([typeBuf, data]);
    let crc = 0xffffffff;
    for (let i = 0; i < toCrc.length; i++) {
      crc ^= toCrc[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function horrorPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background dark vignette
  let r = 10;
  let g = 11;
  let b = 15;
  let a = 255;

  if (dist < 0.85) {
    const redGlow = Math.max(0, 1 - dist / 0.85);
    r = Math.min(255, Math.floor(r + redGlow * 120));
    g = Math.min(255, Math.floor(g + redGlow * 15));
    b = Math.min(255, Math.floor(b + redGlow * 15));
  }

  // Draw door / locker outline
  const doorLeft = 0.28 * w;
  const doorRight = 0.72 * w;
  const doorTop = 0.18 * h;
  const doorBottom = 0.84 * h;

  if (x >= doorLeft && x <= doorRight && y >= doorTop && y <= doorBottom) {
    const border = 8 * (w / 512);
    if (x <= doorLeft + border || x >= doorRight - border || y <= doorTop + border || y >= doorBottom - border) {
      // Iron frame
      r = 90; g = 95; b = 105;
    } else {
      // Door body
      r = 30; g = 32; b = 38;

      // Window area with vertical bars
      const winTop = 0.25 * h;
      const winBottom = 0.48 * h;
      const winLeft = 0.35 * w;
      const winRight = 0.65 * w;

      if (x >= winLeft && x <= winRight && y >= winTop && y <= winBottom) {
        // Window dark interior
        r = 12; g = 12; b = 16;
        // Bars
        const barStep = (winRight - winLeft) / 4;
        for (let bIdx = 1; bIdx < 4; bIdx++) {
          const bx = winLeft + bIdx * barStep;
          if (Math.abs(x - bx) < 3 * (w / 512)) {
            r = 120; g = 125; b = 135;
          }
        }
        // Glowing red horror eyes in the dark window
        const eye1x = 0.45 * w;
        const eye2x = 0.55 * w;
        const eyey = 0.36 * h;
        const d1 = Math.hypot(x - eye1x, y - eyey);
        const d2 = Math.hypot(x - eye2x, y - eyey);
        if (d1 < 7 * (w / 512) || d2 < 7 * (w / 512)) {
          r = 255; g = 30; b = 30;
        }
        if (d1 < 3 * (w / 512) || d2 < 3 * (w / 512)) {
          r = 255; g = 240; b = 150;
        }
      }

      // Locker slats
      const slatTop = 0.54 * h;
      const slatBottom = 0.78 * h;
      if (y >= slatTop && y <= slatBottom) {
        const slatIdx = Math.floor((y - slatTop) / (12 * (h / 512)));
        if ((y - slatTop) % (12 * (h / 512)) < 3 * (h / 512)) {
          r = 15; g = 15; b = 18;
        }
      }
    }
  }

  // Cross symbol in bottom area
  const cx0 = 0.5 * w;
  const cy0 = 0.80 * h;
  const cw = 20 * (w / 512);
  const ch = 34 * (h / 512);
  if ((Math.abs(x - cx0) < cw / 2 && Math.abs(y - cy0) < ch / 2) ||
      (Math.abs(y - cy0) < cw / 2 && Math.abs(x - cx0) < ch / 2)) {
    r = 185; g = 28; b = 28;
  }

  return [r, g, b, a];
}

fs.writeFileSync('public/pwa-192x192.png', createPng(192, 192, (x, y, w, h) => horrorPixel(x, y, w, h, false)));
fs.writeFileSync('public/pwa-512x512.png', createPng(512, 512, (x, y, w, h) => horrorPixel(x, y, w, h, false)));
fs.writeFileSync('public/pwa-maskable-512x512.png', createPng(512, 512, (x, y, w, h) => horrorPixel(x, y, w, h, true)));
fs.writeFileSync('public/apple-touch-icon.png', createPng(180, 180, (x, y, w, h) => horrorPixel(x, y, w, h, false)));
console.log('PWA PNG icons generated successfully!');
