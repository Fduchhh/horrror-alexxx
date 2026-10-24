import * as THREE from 'three';

/**
 * Procedural texture generator for high-detail realistic asylum horror graphics.
 * Generates canvas textures with SRGBColorSpace and repeat wrapping.
 */

// Helper to create canvas
function createOffscreenCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

// 1. Grungy Peeling Hospital Wall Texture (Mint/Institutional Green with mold, cracks, peeling plaster)
export function createHospitalWallTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createOffscreenCanvas(512, 512);

  // Base institutional plaster color (pale dirty sage/green)
  ctx.fillStyle = '#4a554a';
  ctx.fillRect(0, 0, 512, 512);

  // Gradient for vertical dampness / grime rising from baseboard and ceiling
  const dampGrad = ctx.createLinearGradient(0, 0, 0, 512);
  dampGrad.addColorStop(0, 'rgba(25, 30, 25, 0.7)');
  dampGrad.addColorStop(0.2, 'rgba(45, 55, 45, 0.2)');
  dampGrad.addColorStop(0.7, 'rgba(45, 55, 45, 0.2)');
  dampGrad.addColorStop(1, 'rgba(20, 22, 18, 0.85)');
  ctx.fillStyle = dampGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Wall molding divider strip (halfway up typical Soviet/old asylum walls)
  ctx.fillStyle = '#2d372e';
  ctx.fillRect(0, 320, 512, 8);
  ctx.fillStyle = '#1e241f';
  ctx.fillRect(0, 328, 512, 4);

  // Upper wall slightly lighter aged cream, lower wall darker damp green
  ctx.fillStyle = 'rgba(180, 185, 160, 0.25)';
  ctx.fillRect(0, 0, 512, 320);

  // Mildew & water leak drips
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 512;
    const len = 40 + Math.random() * 180;
    const dripGrad = ctx.createLinearGradient(x, 0, x, len);
    dripGrad.addColorStop(0, 'rgba(18, 22, 16, 0.8)');
    dripGrad.addColorStop(1, 'rgba(30, 35, 25, 0)');
    ctx.fillStyle = dripGrad;
    ctx.fillRect(x - 2, 0, 4 + Math.random() * 6, len);
  }

  // Peeling paint patches exposing cracked plaster
  for (let p = 0; p < 8; p++) {
    const px = Math.random() * 450 + 20;
    const py = Math.random() * 450 + 20;
    const pw = 30 + Math.random() * 60;
    const ph = 20 + Math.random() * 40;

    // Exposed substrate (dirty raw concrete/brick)
    ctx.fillStyle = '#262420';
    ctx.beginPath();
    ctx.ellipse(px, py, pw, ph, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();

    // Peeling curled edge highlight
    ctx.strokeStyle = '#6e7a68';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fine crack lines inside patch
    ctx.strokeStyle = '#141210';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - pw * 0.5, py);
    ctx.lineTo(px + pw * 0.5, py + (Math.random() - 0.5) * 15);
    ctx.stroke();
  }

  // Noise / grain overlay
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 28;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 2. Dirty Asylum Checkered Linoleum Tile Floor with Scuffs and Stains
export function createHospitalFloorTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createOffscreenCanvas(512, 512);

  const tileSize = 64;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      const isWhite = ((x / tileSize) + (y / tileSize)) % 2 === 0;

      // Off-white aged ceramic / dark sickly greenish-gray tile
      ctx.fillStyle = isWhite ? '#7d857a' : '#2b302c';
      ctx.fillRect(x, y, tileSize, tileSize);

      // Inner tile gradient (subtle wear in center)
      const grad = ctx.createRadialGradient(x + tileSize / 2, y + tileSize / 2, 5, x + tileSize / 2, y + tileSize / 2, tileSize * 0.7);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Dirty tile grout line
      ctx.strokeStyle = '#121513';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, tileSize, tileSize);
    }
  }

  // Drag marks & scuffs (stretcher / wheelchair wheels)
  ctx.strokeStyle = 'rgba(15, 18, 15, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(80, 0);
  ctx.bezierCurveTo(90, 200, 140, 350, 160, 512);
  ctx.moveTo(180, 0);
  ctx.bezierCurveTo(190, 200, 240, 350, 260, 512);
  ctx.stroke();

  // Dark blood stain / puddle dried
  const bloodGrad = ctx.createRadialGradient(340, 280, 10, 340, 280, 90);
  bloodGrad.addColorStop(0, 'rgba(60, 5, 5, 0.85)');
  bloodGrad.addColorStop(0.6, 'rgba(40, 8, 8, 0.6)');
  bloodGrad.addColorStop(0.9, 'rgba(30, 10, 10, 0.3)');
  bloodGrad.addColorStop(1, 'rgba(20, 10, 10, 0)');
  ctx.fillStyle = bloodGrad;
  ctx.beginPath();
  ctx.arc(340, 280, 90, 0, Math.PI * 2);
  ctx.fill();

  // Blood splatters
  for (let s = 0; s < 12; s++) {
    const sx = 340 + (Math.random() - 0.5) * 160;
    const sy = 280 + (Math.random() - 0.5) * 160;
    ctx.fillStyle = 'rgba(70, 8, 8, 0.75)';
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 3. Stained Hospital Ceiling Acoustic Tile Texture
export function createHospitalCeilingTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createOffscreenCanvas(256, 256);

  // Dirty yellowish-gray plaster tile
  ctx.fillStyle = '#2d2e2b';
  ctx.fillRect(0, 0, 256, 256);

  // Metal suspension T-bar grid borders
  ctx.strokeStyle = '#181917';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);

  // Acoustic tile pinholes
  ctx.fillStyle = '#161715';
  for (let i = 0; i < 400; i++) {
    const px = Math.random() * 250 + 3;
    const py = Math.random() * 250 + 3;
    ctx.fillRect(px, py, 1.5, 1.5);
  }

  // Water damage stain rings
  const stainGrad = ctx.createRadialGradient(150, 110, 10, 150, 110, 75);
  stainGrad.addColorStop(0, 'rgba(80, 60, 25, 0.45)');
  stainGrad.addColorStop(0.8, 'rgba(65, 50, 20, 0.35)');
  stainGrad.addColorStop(0.95, 'rgba(45, 35, 15, 0.6)'); // darker edge ring of water stain
  stainGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = stainGrad;
  ctx.beginPath();
  ctx.arc(150, 110, 75, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 4. Rusty Locker Texture with Ventilation Louvers (for hiding closets)
export function createLockerDoorTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createOffscreenCanvas(256, 512);

  // Oxidized dark army greenish steel
  ctx.fillStyle = '#323a34';
  ctx.fillRect(0, 0, 256, 512);

  // Bevel outer frame
  ctx.strokeStyle = '#1d221e';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 256, 512);

  // Rust patches
  for (let r = 0; r < 6; r++) {
    const rx = Math.random() * 200 + 20;
    const ry = Math.random() * 450 + 20;
    const rustGrad = ctx.createRadialGradient(rx, ry, 5, rx, ry, 35);
    rustGrad.addColorStop(0, 'rgba(90, 35, 12, 0.7)');
    rustGrad.addColorStop(0.7, 'rgba(65, 25, 10, 0.4)');
    rustGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rustGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, 35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ventilation Louvers (Top Area) - essential for looking through!
  const louverYStart = 50;
  for (let l = 0; l < 8; l++) {
    const ly = louverYStart + l * 14;
    // Slit cutout (dark interior)
    ctx.fillStyle = '#080a08';
    ctx.fillRect(60, ly, 136, 6);
    // Metal lip highlight
    ctx.fillStyle = '#556157';
    ctx.fillRect(60, ly + 6, 136, 2);
  }

  // Ventilation Louvers (Bottom Area)
  const louverYBottom = 380;
  for (let l = 0; l < 6; l++) {
    const ly = louverYBottom + l * 14;
    ctx.fillStyle = '#080a08';
    ctx.fillRect(60, ly, 136, 6);
    ctx.fillStyle = '#556157';
    ctx.fillRect(60, ly + 6, 136, 2);
  }

  // Metal Locker Handle / Keyhole
  ctx.fillStyle = '#151715';
  ctx.fillRect(210, 240, 24, 50);
  ctx.fillStyle = '#8a948c';
  ctx.fillRect(214, 250, 16, 26);
  ctx.fillStyle = '#050605';
  ctx.fillRect(220, 260, 4, 8); // keyhole

  // Bloody hand claw scratch on door
  ctx.strokeStyle = '#631010';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(85, 220); ctx.lineTo(95, 290);
  ctx.moveTo(105, 215); ctx.lineTo(120, 305);
  ctx.moveTo(125, 222); ctx.lineTo(140, 298);
  ctx.stroke();

  // Noise
  const imgData = ctx.getImageData(0, 0, 256, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 5. Heavy Hospital Iron Door with Barred Glass Window & Room Label
export function createHospitalDoorTexture(label: string, warning = ''): THREE.CanvasTexture {
  const [canvas, ctx] = createOffscreenCanvas(256, 512);

  // Heavy steel door surface
  ctx.fillStyle = '#34383c';
  ctx.fillRect(0, 0, 256, 512);

  // Rust gradient at the bottom
  const rustGrad = ctx.createLinearGradient(0, 380, 0, 512);
  rustGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  rustGrad.addColorStop(1, 'rgba(80, 30, 12, 0.65)');
  ctx.fillStyle = rustGrad;
  ctx.fillRect(0, 380, 256, 132);

  // Reinforced iron door frame
  ctx.strokeStyle = '#1a1d20';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, 256, 512);

  // Upper Barred Glass Inspection Window
  ctx.fillStyle = '#0c1014';
  ctx.fillRect(48, 60, 160, 150);
  ctx.strokeStyle = '#5a626a';
  ctx.lineWidth = 6;
  ctx.strokeRect(48, 60, 160, 150);

  // Iron window security bars
  ctx.strokeStyle = '#808992';
  ctx.lineWidth = 4;
  for (let bx = 78; bx <= 180; bx += 26) {
    ctx.beginPath();
    ctx.moveTo(bx, 60);
    ctx.lineTo(bx, 210);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(48, 135);
  ctx.lineTo(208, 135);
  ctx.stroke();

  // Room Sign Plaque
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(40, 240, 176, 50);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 240, 176, 50);

  // Text on Sign
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 270);

  if (warning) {
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(warning, 128, 284);
  }

  // Steel Handle plate
  ctx.fillStyle = '#1e2329';
  ctx.fillRect(205, 310, 32, 64);
  ctx.fillStyle = '#7a8590';
  ctx.fillRect(212, 325, 18, 14);

  // Scratch marks & grunge
  ctx.strokeStyle = '#1f1412';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const sx = Math.random() * 200 + 20;
    const sy = Math.random() * 200 + 300;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 20 + Math.random() * 30, sy + (Math.random() - 0.5) * 40);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 6. Medical Chart / Asylum File on Clipboard
export function createClipboardTexture(patientName: string): THREE.CanvasTexture {
  const [canvas, ctx] = createOffscreenCanvas(256, 256);

  // Brown wood clipboard
  ctx.fillStyle = '#4a2f18';
  ctx.fillRect(0, 0, 256, 256);

  // Aged yellowed paper
  ctx.fillStyle = '#e8dec2';
  ctx.fillRect(16, 24, 224, 218);

  // Top metal clip
  ctx.fillStyle = '#8a949e';
  ctx.fillRect(80, 12, 96, 28);
  ctx.fillStyle = '#475569';
  ctx.fillRect(92, 18, 72, 8);

  // Red hospital stamp "ОСОБО ОПАСЕН / ISOLATED"
  ctx.save();
  ctx.translate(140, 140);
  ctx.rotate(-0.25);
  ctx.strokeStyle = 'rgba(185, 28, 28, 0.7)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-65, -18, 130, 36);
  ctx.fillStyle = 'rgba(185, 28, 28, 0.8)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ОСОБО ОПАСЕН', 0, 5);
  ctx.restore();

  // Document text lines
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ИСТОРИЯ БОЛЕЗНИ № 674', 28, 62);
  ctx.font = '9px monospace';
  ctx.fillText(`Пациент: ${patientName}`, 28, 80);
  ctx.fillText('Диагноз: Острая паранойя', 28, 96);
  ctx.fillText('Статус: Сбежал из палаты', 28, 112);

  // Scribbled handwritten notes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  for (let l = 160; l < 220; l += 14) {
    ctx.beginPath();
    ctx.moveTo(28, l);
    ctx.lineTo(220, l + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 7. Monster Deformed Flesh & Bloody Gauze Bandages Texture
export function createMonsterFleshTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = createOffscreenCanvas(256, 256);

  // Sickly ashen grey-green flesh
  ctx.fillStyle = '#424844';
  ctx.fillRect(0, 0, 256, 256);

  // Blackened necrotized veins
  ctx.strokeStyle = '#181f1b';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    let vx = Math.random() * 256;
    let vy = Math.random() * 256;
    ctx.moveTo(vx, vy);
    for (let s = 0; s < 4; s++) {
      vx += (Math.random() - 0.5) * 50;
      vy += (Math.random() - 0.5) * 50;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }

  // Bloody bandage wrapping strips
  for (let b = 0; b < 256; b += 42) {
    ctx.fillStyle = 'rgba(190, 180, 160, 0.55)';
    ctx.fillRect(0, b, 256, 24);

    // Blood soaking into bandage
    const bloodX = 30 + Math.random() * 180;
    const bGrad = ctx.createRadialGradient(bloodX, b + 12, 3, bloodX, b + 12, 35);
    bGrad.addColorStop(0, 'rgba(110, 12, 12, 0.85)');
    bGrad.addColorStop(0.7, 'rgba(70, 8, 8, 0.6)');
    bGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bGrad;
    ctx.fillRect(0, b, 256, 24);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
