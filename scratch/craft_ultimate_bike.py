import os
import re

print("Starting bike code generator...")
output_file = r"C:\Users\HP\Desktop\commute-dhaka-web\scratch\generated_bike_module.js"

code = r'''
  // ===========================================================================
  // ULTRA-REALISTIC GTA V MOTORCYCLE & ORGANIC MULTI-OUTFIT RIDER SYSTEM
  // Authentic Digital Twins for 5 GTA Reference Archetypes:
  // 0: Streetfighter / Urban Commuter (Trellis Frame, Bug-Eye Projectors, 4-into-1)
  // 1: Western Nightblade Cruiser (Photo 2: Crimson Teardrop, Gold Forks, V-Twin, Fat Tire)
  // 2: Yamaha R1M Supersport (Photo 3: Candy Red Race Fairings, Carbon Winglets, Cat-Eyes)
  // 3: Suzuki Hayabusa Hyperbike (Photo 1: Silver Bulbous Aero, Dual Megaphones, Low Tuck)
  // 4: Modern Retro Cafe Racer (Photo 4: White Tank/Knee Pads, Boxer-Twin, Yellow Bubble)
  // ===========================================================================

  const bikeTextureCache = {};

  // 1. High-Resolution Photorealistic Human Face Canvas Texture Generator
  function getRealisticFaceTexture(toneIdx) {
    const tones = [
      { skin: '#dfad87', shadow: '#b57a52', brow: '#25160d', lip: '#b35d53', eye: '#3d2516' }, // Light-Medium
      { skin: '#c8926d', shadow: '#9e6745', brow: '#1a1008', lip: '#9e524b', eye: '#24140a' }, // Medium South Asian
      { skin: '#9e6a4b', shadow: '#77472b', brow: '#110905', lip: '#7d403a', eye: '#190e08' }  // Warm Deep Olive
    ];
    const t = tones[(toneIdx || 0) % tones.length];
    const key = 'face_' + ((toneIdx || 0) % tones.length);
    if (bikeTextureCache[key]) return bikeTextureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base Natural Skin
    ctx.fillStyle = t.skin;
    ctx.fillRect(0, 0, 512, 512);

    // Soft Ambient Shading around temples, cheeks, and jaw
    const ambGrad = ctx.createRadialGradient(256, 256, 80, 256, 256, 250);
    ambGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    ambGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.0)');
    ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Forehead Light Center
    const foreGrad = ctx.createRadialGradient(256, 120, 15, 256, 120, 110);
    foreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
    foreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = foreGrad;
    ctx.fillRect(150, 40, 212, 140);

    // Eyebrows (Natural Hair Arch)
    ctx.strokeStyle = t.brow;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    // Left Eyebrow
    ctx.beginPath();
    ctx.moveTo(165, 182);
    ctx.quadraticCurveTo(205, 164, 238, 175);
    ctx.stroke();
    // Right Eyebrow
    ctx.beginPath();
    ctx.moveTo(347, 182);
    ctx.quadraticCurveTo(307, 164, 274, 175);
    ctx.stroke();

    // Eyebrow individual hair strokes
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 20; i++) {
      const lx = 170 + i * 3.3;
      const arc = Math.sin((i / 20) * Math.PI) * 11;
      ctx.beginPath();
      ctx.moveTo(lx, 182 - arc);
      ctx.lineTo(lx + 4, 172 - arc);
      ctx.stroke();
      const rx = 342 - i * 3.3;
      ctx.beginPath();
      ctx.moveTo(rx, 182 - arc);
      ctx.lineTo(rx - 4, 172 - arc);
      ctx.stroke();
    }

    // Eyes (Almond Shape with Sclera, Iris, Pupil, Catchlights)
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 204 : 308;
      const cy = 216;

      // Soft eye socket depression
      const sockGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 42);
      sockGrad.addColorStop(0, 'rgba(0, 0, 0, 0.26)');
      sockGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = sockGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.fill();

      // Sclera (White of Eye)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 27, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner Eye Corner Pink (Canthus)
      ctx.fillStyle = '#dc8c84';
      ctx.beginPath();
      ctx.arc(cx + (side === -1 ? 25 : -25), cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Iris (Sharp Circular Hazel / Warm Brown)
      const irisGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, 13);
      irisGrad.addColorStop(0, '#5a3825');
      irisGrad.addColorStop(0.65, t.eye);
      irisGrad.addColorStop(1, '#110905');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();

      // Pupil (Deep Black)
      ctx.fillStyle = '#050302';
      ctx.beginPath();
      ctx.arc(cx, cy, 6.2, 0, Math.PI * 2);
      ctx.fill();

      // Catchlights (Dual Directional Reflections looking forward at road)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 3.5, cy - 3.2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 3.2, cy + 2.4, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Upper Eyelash Line & Crease
      ctx.strokeStyle = '#18100a';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 27, Math.PI * 0.92, Math.PI * 2.08, false);
      ctx.stroke();

      // Eyelid skin fold
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(cx, cy - 9, 25, Math.PI * 0.90, Math.PI * 2.10, false);
      ctx.stroke();
    });

    // Nose Bridge Shading & Highlights
    const noseShade = ctx.createLinearGradient(235, 185, 277, 185);
    noseShade.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
    noseShade.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    noseShade.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    ctx.fillStyle = noseShade;
    ctx.beginPath();
    ctx.moveTo(250, 182);
    ctx.lineTo(245, 276);
    ctx.lineTo(238, 292);
    ctx.lineTo(274, 292);
    ctx.lineTo(267, 276);
    ctx.lineTo(262, 182);
    ctx.closePath();
    ctx.fill();

    // Nose Tip Highlight Sphere
    const noseGrad = ctx.createRadialGradient(256, 284, 3, 256, 284, 16);
    noseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    noseGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.arc(256, 284, 16, 0, Math.PI * 2);
    ctx.fill();

    // Flared Nostrils
    ctx.fillStyle = '#1c0f0a';
    ctx.beginPath();
    ctx.ellipse(244, 295, 7.5, 4.2, -0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(268, 295, 7.5, 4.2, 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Philtrum Groove
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(253, 303, 6, 16);

    // Natural Lips
    // Upper Lip with Cupid's Bow
    ctx.fillStyle = t.lip;
    ctx.beginPath();
    ctx.moveTo(225, 332);
    ctx.quadraticCurveTo(246, 319, 256, 323);
    ctx.quadraticCurveTo(266, 319, 287, 332);
    ctx.quadraticCurveTo(256, 336, 225, 332);
    ctx.fill();

    // Lower Full Lip
    const lipGrad = ctx.createRadialGradient(256, 342, 4, 256, 342, 24);
    lipGrad.addColorStop(0, '#d6756c');
    lipGrad.addColorStop(1, t.lip);
    ctx.fillStyle = lipGrad;
    ctx.beginPath();
    ctx.moveTo(228, 333);
    ctx.quadraticCurveTo(256, 356, 284, 333);
    ctx.quadraticCurveTo(256, 335, 228, 333);
    ctx.fill();

    // Lip Seam
    ctx.strokeStyle = '#2b120f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(226, 332);
    ctx.quadraticCurveTo(256, 335, 286, 332);
    ctx.stroke();

    // Chin Highlight & Shadow
    const chinGrad = ctx.createRadialGradient(256, 402, 10, 256, 402, 46);
    chinGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    chinGrad.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = chinGrad;
    ctx.beginPath();
    ctx.arc(256, 402, 46, 0, Math.PI * 2);
    ctx.fill();

    // 5 O'Clock Stubble Shadow (Authentic Biker Mature Face Texture)
    ctx.fillStyle = 'rgba(22, 18, 16, 0.16)';
    ctx.beginPath();
    ctx.moveTo(165, 308);
    ctx.quadraticCurveTo(208, 385, 256, 432);
    ctx.quadraticCurveTo(304, 385, 347, 308);
    ctx.quadraticCurveTo(312, 450, 256, 465);
    ctx.quadraticCurveTo(200, 450, 165, 308);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache[key] = tex;
    return tex;
  }

  // 2. Carbon-Fiber Twill Weave Texture Generator
  function getCarbonFiberTexture() {
    if (bikeTextureCache.carbon) return bikeTextureCache.carbon;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) {
      for (let x = 0; x < 64; x += 8) {
        ctx.fillStyle = ((x / 8 + y / 8) % 2 === 0) ? '#28282c' : '#101012';
        ctx.fillRect(x, y, 8, 8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x + 8, y);
        ctx.lineTo(x + 8, y + 2);
        ctx.lineTo(x + 2, y + 8);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    bikeTextureCache.carbon = tex;
    return tex;
  }

  // 3. Perforated Stainless Steel Floating Disc Rotor Texture Generator
  function getDiscRotorTexture() {
    if (bikeTextureCache.rotor) return bikeTextureCache.rotor;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Concentric Brushed Stainless Steel
    const grad = ctx.createRadialGradient(128, 128, 40, 128, 128, 126);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.35, '#cbd5e1');
    grad.addColorStop(0.70, '#f1f5f9');
    grad.addColorStop(0.92, '#94a3b8');
    grad.addColorStop(1.0, '#334155');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 126, 0, Math.PI * 2);
    ctx.fill();

    // Center cutout
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(128, 128, 52, 0, Math.PI * 2);
    ctx.fill();

    // 4 Concentric Rings of Cross-Drilled Ventilation Holes
    ctx.fillStyle = '#090d16';
    [68, 84, 100, 114].forEach((radius, ringIdx) => {
      const holeCount = 18 + ringIdx * 4;
      for (let i = 0; i < holeCount; i++) {
        const angle = (i / holeCount) * Math.PI * 2 + (ringIdx * 0.15);
        const hx = 128 + Math.cos(angle) * radius;
        const hy = 128 + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Floating Rotor Gold Rivet Buttons
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = 128 + Math.cos(angle) * 58;
      const ry = 128 + Math.sin(angle) * 58;
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(rx - 1, ry - 1, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.rotor = tex;
    return tex;
  }

  // 4. Heat-Shield Exhaust Wrap Texture Generator (Cafe Racer)
  function getHeatWrapTexture() {
    if (bikeTextureCache.heatWrap) return bikeTextureCache.heatWrap;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8c765a';
    ctx.fillRect(0, 0, 128, 128);

    // Diagonal woven wraps
    ctx.strokeStyle = '#5a4933';
    ctx.lineWidth = 4;
    for (let i = -128; i < 256; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 128, 128);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let i = -128; i < 256; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i + 2, 0);
      ctx.lineTo(i + 130, 128);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    bikeTextureCache.heatWrap = tex;
    return tex;
  }
'''

with open(output_file, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Wrote base textures to {output_file}")
