import os

print("Updating master_bike_code.js to fulfill all test constraints...")

code = r"""  // ---------------------------------------------------------------------------
  // Seamless GTA Motorcycle & Organic Multi-Outfit Rider Factory (Pure Three.js)
  // Zero disconnected cylinders, Parallel-Transport Lofted Limbs, Beveled Fairings
  // ---------------------------------------------------------------------------
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
    ctx.beginPath();
    ctx.moveTo(165, 182);
    ctx.quadraticCurveTo(205, 164, 238, 175);
    ctx.stroke();
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

      const sockGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, 42);
      sockGrad.addColorStop(0, 'rgba(0, 0, 0, 0.26)');
      sockGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = sockGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 27, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#dc8c84';
      ctx.beginPath();
      ctx.arc(cx + (side === -1 ? 25 : -25), cy, 4, 0, Math.PI * 2);
      ctx.fill();

      const irisGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, 13);
      irisGrad.addColorStop(0, '#5a3825');
      irisGrad.addColorStop(0.65, t.eye);
      irisGrad.addColorStop(1, '#110905');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#050302';
      ctx.beginPath();
      ctx.arc(cx, cy, 6.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 3.5, cy - 3.2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 3.2, cy + 2.4, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#18100a';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 27, Math.PI * 0.92, Math.PI * 2.08, false);
      ctx.stroke();

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

    const noseGrad = ctx.createRadialGradient(256, 284, 3, 256, 284, 16);
    noseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    noseGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.arc(256, 284, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c0f0a';
    ctx.beginPath();
    ctx.ellipse(244, 295, 7.5, 4.2, -0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(268, 295, 7.5, 4.2, 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(253, 303, 6, 16);

    ctx.fillStyle = t.lip;
    ctx.beginPath();
    ctx.moveTo(225, 332);
    ctx.quadraticCurveTo(246, 319, 256, 323);
    ctx.quadraticCurveTo(266, 319, 287, 332);
    ctx.quadraticCurveTo(256, 336, 225, 332);
    ctx.fill();

    const lipGrad = ctx.createRadialGradient(256, 342, 4, 256, 342, 24);
    lipGrad.addColorStop(0, '#d6756c');
    lipGrad.addColorStop(1, t.lip);
    ctx.fillStyle = lipGrad;
    ctx.beginPath();
    ctx.moveTo(228, 333);
    ctx.quadraticCurveTo(256, 356, 284, 333);
    ctx.quadraticCurveTo(256, 335, 228, 333);
    ctx.fill();

    ctx.strokeStyle = '#2b120f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(226, 332);
    ctx.quadraticCurveTo(256, 335, 286, 332);
    ctx.stroke();

    const chinGrad = ctx.createRadialGradient(256, 402, 10, 256, 402, 46);
    chinGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    chinGrad.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = chinGrad;
    ctx.beginPath();
    ctx.arc(256, 402, 46, 0, Math.PI * 2);
    ctx.fill();

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

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(128, 128, 52, 0, Math.PI * 2);
    ctx.fill();

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

  // 5. Fukaru Tire Sidewall Texture Generator
  function getFukaruTireTexture() {
    if (bikeTextureCache.fukaru) return bikeTextureCache.fukaru;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);
    ctx.fillStyle = '#111317';
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FUKARU · SPORT RADIAL', 256, 42);
    ctx.fillText('RACING · 190/55 ZR17', 256, 492);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.fukaru = tex;
    return tex;
  }

  // 6. Pinstripe Tank Texture Generator (Cruiser)
  function getPinstripeTankTexture(accentHex) {
    const key = 'pinstripe_' + accentHex;
    if (bikeTextureCache[key]) return bikeTextureCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    const hex = '#' + accentHex.toString(16).padStart(6, '0');
    ctx.strokeStyle = hex;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, 85);
    ctx.bezierCurveTo(80, 25, 180, 25, 236, 85);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 95);
    ctx.bezierCurveTo(85, 40, 175, 40, 236, 95);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache[key] = tex;
    return tex;
  }

  // 7. Grill Headlight Texture Generator (Cafe Racer)
  function getGrillHeadlightTexture() {
    if (bikeTextureCache.grillHl) return bikeTextureCache.grillHl;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, '#fffbeb');
    grad.addColorStop(0.7, '#fef08a');
    grad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    [-34, -18, 0, 18, 34].forEach(offset => {
      ctx.fillRect(64 + offset - 3, 10, 6, 108);
    });
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.grillHl = tex;
    return tex;
  }

  // 8. Shitzu Logo Decal Generator (Hyperbike)
  function getShitzuDecalTexture() {
    if (bikeTextureCache.shitzu) return bikeTextureCache.shitzu;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('SHITZU', 20, 44);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.shitzu = tex;
    return tex;
  }

  // 9. Kanji Decal Generator (Hyperbike)
  function getKanjiDecalTexture() {
    if (bikeTextureCache.kanji) return bikeTextureCache.kanji;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 96px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('隼', 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.kanji = tex;
    return tex;
  }

  // 10. License Plate Generator
  function getBikeLicensePlateTexture() {
    if (bikeTextureCache.plate) return bikeTextureCache.plate;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, 128, 80);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 122, 74);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DHAKA METRO', 64, 28);
    ctx.font = 'bold 24px monospace';
    ctx.fillText('HA-52-91', 64, 58);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.plate = tex;
    return tex;
  }

  function getVarsityBackTexture(jacketHex) {
    const key = 'varsity_' + jacketHex;
    if (bikeTextureCache[key]) return bikeTextureCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R★', 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache[key] = tex;
    return tex;
  }

  // 10 Distinct Automotive Palettes (5 Archetypes x 10 Palettes = 50 Unique Variations)
  const BIKE_PALETTES = [
    // 0: Pearl White & Bronze (Modern / Cafe Racer)
    { name: 'Pearl White & Bronze', fairing: 0xf8fafc, accent: 0x18181b, rim: 0xc2b280, rimLip: 0xd4af37, seat: 0x451a03, frame: 0x18181b, chrome: 0xf1f5f9, caliper: 0xd97706 },
    // 1: Metallic Ducati Red + Silver Rims (Supersport / Streetfighter)
    { name: 'Ducati Red & Silver', fairing: 0xdc2626, accent: 0x111827, rim: 0x94a3b8, rimLip: null, seat: 0x090d16, frame: 0xdc2626, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 2: Shitzu Titanium Silver & Black Kanji + Gunmetal Rims (Hyperbike)
    { name: 'Shitzu Titanium Silver', fairing: 0x94a3b8, accent: 0x0f172a, rim: 0x334155, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 3: Midnight Black & Crimson Pinstripe + Red-Lip Rims (Western Nightblade Cruiser)
    { name: 'Midnight Black & Crimson', fairing: 0x090d16, accent: 0xef4444, rim: 0x111827, rimLip: 0xef4444, seat: 0x18181b, frame: 0x090d16, chrome: 0xd4af37, caliper: 0xd97706 },
    // 4: Yamaha Racing Blue + Gold Rims
    { name: 'Yamaha Racing Blue & Gold', fairing: 0x1d4ed8, accent: 0xf8fafc, rim: 0xd97706, rimLip: 0xf59e0b, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 5: Toxic Kawasaki Emerald Green + Matte Black Rims
    { name: 'Kawasaki Emerald & Black', fairing: 0x16a34a, accent: 0x090d16, rim: 0x18181b, rimLip: 0x22c55e, seat: 0x090d16, frame: 0x16a34a, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 6: Sunset Metallic Orange + Dark Alloy Rims
    { name: 'Sunset Orange & Dark Alloy', fairing: 0xea580c, accent: 0x18181b, rim: 0x475569, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 7: Stealth Matte Graphite + Neon Yellow Accents
    { name: 'Stealth Graphite & Neon', fairing: 0x27272a, accent: 0xeab308, rim: 0x18181b, rimLip: 0xeab308, seat: 0x090d16, frame: 0x18181b, chrome: 0x94a3b8, caliper: 0xeab308 },
    // 8: Deep Royal Purple & Pearl + Chrome Rims
    { name: 'Royal Purple & Chrome', fairing: 0x581c87, accent: 0xf8fafc, rim: 0xe2e8f0, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 9: Championship Gold & Black + Silver Rims
    { name: 'Championship Gold & Silver', fairing: 0xd97706, accent: 0x090d16, rim: 0xcfd8dc, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 }
  ];

  function createRealisticGTABike(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const archetypeIdx = (vData && vData.archetype !== undefined)
      ? (Math.abs(vData.archetype) % 5)
      : Math.abs((appearanceSeed || 0) % 5);

    const isCruiser = (archetypeIdx === 1);
    const isSupersport = (archetypeIdx === 2);
    const isHyperbike = (archetypeIdx === 3);
    const isCafeRacer = (archetypeIdx === 4);
    const isStreetfighter = (archetypeIdx === 0);

    const paletteIdx = (vData && vData.palette !== undefined)
      ? (Math.abs(vData.palette) % BIKE_PALETTES.length)
      : (isCruiser ? 3 : (isSupersport ? 1 : (isHyperbike ? 2 : (isCafeRacer ? 0 : Math.abs(appearanceSeed || 0) % BIKE_PALETTES.length))));

    const palette = BIKE_PALETTES[paletteIdx];
    const fairingColor = (colorHex !== null && colorHex !== undefined) ? colorHex : palette.fairing;

    // 4 Distinct GTA Multi-Outfit Riders
    const outfitIdx = (vData && vData.outfit !== undefined)
      ? (Math.abs(vData.outfit) % 4)
      : (isCruiser ? 0 : (isSupersport ? 1 : (isHyperbike ? 1 : (isCafeRacer ? 2 : Math.abs((appearanceSeed || 0) >> 2) % 4))));

    const OUTFIT_PRESETS = [
      { name: 'GTA Streetfighter', torsoHex: 0x111827, sleeveHex: 0x111827, legHex: 0x1f2937, helmetHex: 0x111827, streetfighter: true },
      { name: 'GTA "R★" Varsity Rider', torsoHex: 0x580b18, sleeveHex: 0x111827, legHex: 0x475569, helmetHex: 0x1e293b, varsity: true },
      { name: 'GTA Scrambler', torsoHex: 0x451a03, sleeveHex: 0x451a03, legHex: 0x1e293b, helmetHex: 0x090d16, cafe: true },
      { name: 'Dhaka Urban Rider', torsoHex: 0x0f172a, sleeveHex: 0x0f172a, legHex: 0x172554, helmetHex: 0x1d4ed8, commuter: true }
    ];
    const outfitCfg = OUTFIT_PRESETS[outfitIdx];

    // Shared Materials
    const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75, metalness: 0.35 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: palette.chrome || 0xf8fafc, roughness: 0.12, metalness: 0.95 });
    const goldForkMat = new THREE.MeshStandardMaterial({ color: (isCruiser || isSupersport) ? 0xd4af37 : 0x94a3b8, roughness: 0.22, metalness: 0.88 });
    const fairingMat = new THREE.MeshStandardMaterial({
      color: fairingColor,
      roughness: isCafeRacer ? 0.35 : 0.15,
      metalness: isCafeRacer ? 0.20 : 0.65
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      map: getCarbonFiberTexture(),
      color: 0x222226,
      roughness: 0.35,
      metalness: 0.45
    });
    const leatherSeatMat = new THREE.MeshStandardMaterial({
      color: palette.seat || (isCafeRacer ? 0x451a03 : 0x18181b),
      roughness: 0.65,
      metalness: 0.10
    });
    const radiatorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.50, metalness: 0.70 });
    const smokedGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.10,
      metalness: 0.80,
      transparent: true,
      opacity: 0.55
    });
    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.94,
      metalness: 0.02
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: palette.rim || 0xcfd8dc,
      roughness: 0.25,
      metalness: 0.85
    });
    const rotorMat = new THREE.MeshStandardMaterial({
      map: getDiscRotorTexture(),
      roughness: 0.25,
      metalness: 0.90,
      side: THREE.DoubleSide
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: palette.caliper || 0xd97706,
      roughness: 0.25,
      metalness: 0.85
    });

    // ---------------------------------------------------------------------------
    // 1. WHEELS & BRAKES (Hollow 10-Spoke / Wire-Spoke / Fat Drag Tire)
    // ---------------------------------------------------------------------------
    const frontWheelX = isCruiser ? 7.6 : 6.4;
    const rearWheelX = isCruiser ? -7.2 : -6.8;
    const wheelY = 3.65;
    group.userData.wheelRadius = 3.25;

    [
      { isRear: false, wx: frontWheelX, wy: wheelY, radius: 3.65, width: 1.15, spokeCount: isCafeRacer ? 36 : 10 },
      { isRear: true,  wx: rearWheelX,  wy: wheelY, radius: isCruiser ? 3.45 : 3.65, width: isCruiser ? 2.10 : 1.45, spokeCount: isCafeRacer ? 36 : 10 }
    ].forEach(spec => {
      const wPivot = new THREE.Group();
      wPivot.position.set(spec.wx, spec.wy, 0);

      // A. Rounded Deep-Black Carbon Rubber Tire
      const tireGeo = new THREE.TorusGeometry(spec.radius, spec.width * 0.48, 20, 36);
      const tireMesh = new THREE.Mesh(tireGeo, tireRubberMat);
      wPivot.add(tireMesh);

      // B. Metallic Alloy Outer Rim Hoop
      const rimHoop = new THREE.Mesh(
        new THREE.CylinderGeometry(spec.radius * 0.78, spec.radius * 0.78, spec.width * 0.88, 28, 1, true),
        rimMat
      );
      rimHoop.rotation.x = Math.PI / 2;
      wPivot.add(rimHoop);

      // C. Central Billet Hub
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, spec.width * 0.95, 18), darkFrameMat);
      hub.rotation.x = Math.PI / 2;
      wPivot.add(hub);

      // D. Open Hollow Spokes
      const spokeGeo = new THREE.CylinderGeometry(0.09, 0.12, spec.radius * 0.70, 8);
      for (let s = 0; s < spec.spokeCount; s++) {
        const angle = (s / spec.spokeCount) * Math.PI * 2;
        const spoke = new THREE.Mesh(spokeGeo, isCafeRacer ? goldForkMat : rimMat);
        spoke.position.set(Math.cos(angle) * (spec.radius * 0.40), Math.sin(angle) * (spec.radius * 0.40), 0);
        spoke.rotation.z = angle + Math.PI / 2;
        wPivot.add(spoke);
      }

      // E. Perforated Stainless Steel Floating Disc Rotors
      [-0.48, 0.48].forEach(sideOffset => {
        if (spec.isRear && sideOffset < 0 && !isCruiser) return;
        const disc = new THREE.Mesh(new THREE.CircleGeometry(spec.radius * 0.62, 24), rotorMat);
        disc.position.z = sideOffset;
        wPivot.add(disc);
      });

      group.add(wPivot);
      group.userData.wheels.push(wPivot);

      // Static Calipers Mounted to Fork/Swingarm
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.48), caliperMat);
      caliper.position.set(spec.wx - (spec.isRear ? -1.05 : 1.05), spec.wy + 0.65, 0.58);
      group.add(caliper);
    });

    // ---------------------------------------------------------------------------
    // 2. FRONT FORKS, TRIPLE TREES & CONTROLS
    // ---------------------------------------------------------------------------
    const forkRake = isCruiser ? 0.38 : (isSupersport ? 0.22 : 0.26);
    [-1, 1].forEach(side => {
      const fz = side * 1.08;
      // Inverted Gold USD Fork Stanchion
      const upperFork = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 4.4, 16), goldForkMat);
      upperFork.rotation.z = -forkRake;
      upperFork.position.set(frontWheelX - 0.75, 6.2, fz);
      group.add(upperFork);

      // Chrome Inner Slider
      const lowerFork = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.8, 16), chromeMat);
      lowerFork.rotation.z = -forkRake;
      lowerFork.position.set(frontWheelX - 0.25, 4.2, fz);
      group.add(lowerFork);

      // Front Fender / Hugger
      const fenderShape = new THREE.Shape();
      fenderShape.moveTo(frontWheelX + 1.8, wheelY + 1.6);
      fenderShape.quadraticCurveTo(frontWheelX, wheelY + 2.8, frontWheelX - 1.8, wheelY + 1.2);
      fenderShape.lineTo(frontWheelX - 1.5, wheelY + 0.9);
      fenderShape.quadraticCurveTo(frontWheelX, wheelY + 2.4, frontWheelX + 1.5, wheelY + 1.3);
      fenderShape.closePath();
      const fenderGeo = new THREE.ExtrudeGeometry(fenderShape, { depth: 1.45, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2 });
      fenderGeo.translate(0, 0, -1.45 / 2);
      group.add(new THREE.Mesh(fenderGeo, isSupersport ? carbonMat : fairingMat));
    });

    // Billet Triple Clamps
    const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 2.45), darkFrameMat);
    topClamp.rotation.z = -forkRake;
    topClamp.position.set(frontWheelX - 1.2, 8.2, 0);
    group.add(topClamp);

    // Handlebars
    [-1, 1].forEach(side => {
      const barY = isCruiser ? 9.8 : (isSupersport ? 8.2 : 8.9);
      const barX = isCruiser ? 3.4 : (isSupersport ? 3.8 : 3.6);
      const bar = createSeamlessLoftedLimb([
        { p: [barX, barY, side * 0.65], rx: 0.14, ry: 0.14 },
        { p: [barX - 0.45, barY - 0.15, side * (isCruiser ? 2.25 : 1.85)], rx: 0.16, ry: 0.16 }
      ], 4, 8, darkFrameMat);
      group.add(bar);

      // Grip & Bar-End Mirror
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.85, 12), darkFrameMat);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(barX - 0.45, barY - 0.15, side * (isCruiser ? 2.25 : 1.85));
      group.add(grip);

      if (isCafeRacer || isStreetfighter) {
        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 14), darkFrameMat);
        mirror.rotation.z = Math.PI / 2;
        mirror.position.set(barX - 0.45, barY - 0.15, side * 2.35);
        group.add(mirror);
      }
    });

    // ---------------------------------------------------------------------------
    // 3. ENGINE, RADIATOR & EXHAUST BY ARCHETYPE
    // ---------------------------------------------------------------------------
    const radMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.65, 2.15), radiatorMat);
    radMesh.position.set(3.4, 5.2, 0);
    radMesh.rotation.z = 0.18;
    group.add(radMesh);

    const crankcase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 2.2), darkFrameMat);
    crankcase.position.set(0.65, 4.4, 0);
    group.add(crankcase);

    [-1, 1].forEach(side => {
      const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.32, 18), chromeMat);
      cover.rotation.x = Math.PI / 2;
      cover.position.set(0.65, 4.3, side * 1.25);
      group.add(cover);
    });

    if (isCruiser) {
      // Photo 2: Authentic 114ci V-Twin with 45° Finned Cylinders & Dual Staggered Pipes
      [-0.42, 0.42].forEach((angle, idx) => {
        const cylBlock = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.85, 1.85), darkFrameMat);
        cylBlock.rotation.z = angle;
        cylBlock.position.set(idx === 0 ? -0.35 : 1.45, 5.5, 0);
        group.add(cylBlock);

        const pushrod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.1, 8), chromeMat);
        pushrod.rotation.z = angle;
        pushrod.position.set(idx === 0 ? -0.20 : 1.60, 5.6, 1.05);
        group.add(pushrod);
      });

      const airCleaner = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.95, 0.45), chromeMat);
      airCleaner.position.set(0.65, 5.6, 1.35);
      group.add(airCleaner);

      [-0.15, 0.55].forEach((ey, pIdx) => {
        const pipe = createSeamlessLoftedLimb([
          { p: [0.85 - pIdx * 0.6, 4.8 + ey * 0.5, 1.25], rx: 0.28, ry: 0.28 },
          { p: [-0.65, 3.8 + ey, 1.35], rx: 0.32, ry: 0.32 },
          { p: [-3.45, 3.6 + ey, 1.38], rx: 0.36, ry: 0.36 },
          { p: [-6.85, 3.7 + ey, 1.42], rx: 0.42, ry: 0.42 }
        ], 8, 12, darkFrameMat);
        group.add(pipe);
      });

    } else if (isCafeRacer) {
      // Photo 4: Genuine Horizontal Boxer-Twin Cylinders Protruding Laterally
      [-1, 1].forEach(side => {
        const boxerCyl = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.35, 1.35), darkFrameMat);
        boxerCyl.position.set(0.65, 4.5, side * 1.85);
        group.add(boxerCyl);

        const valveCover = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.35, 16), chromeMat);
        valveCover.rotation.x = Math.PI / 2;
        valveCover.position.set(0.65, 4.5, side * 2.58);
        group.add(valveCover);

        const wrapMat = new THREE.MeshStandardMaterial({ map: getHeatWrapTexture(), roughness: 0.85 });
        const wrappedHeader = createSeamlessLoftedLimb([
          { p: [1.2, 4.4, side * 1.6], rx: 0.24, ry: 0.24 },
          { p: [0.2, 3.2, side * 1.5], rx: 0.26, ry: 0.26 },
          { p: [-2.2, 3.2, side * 1.4], rx: 0.28, ry: 0.28 }
        ], 6, 10, wrapMat);
        group.add(wrappedHeader);

        const mega = createSeamlessLoftedLimb([
          { p: [-2.2, 3.2, side * 1.4], rx: 0.28, ry: 0.28 },
          { p: [-4.6, 3.8, side * 1.55], rx: 0.52, ry: 0.52 },
          { p: [-6.4, 4.4, side * 1.65], rx: 0.44, ry: 0.44 }
        ], 6, 12, chromeMat);
        group.add(mega);
      });

    } else if (isHyperbike) {
      // Photo 1: Suzuki Hayabusa Dual Massive Megaphone Titanium Canisters (Both Sides!)
      [-1, 1].forEach(side => {
        const mega = createSeamlessLoftedLimb([
          { p: [0.85, 3.2, side * 1.15], rx: 0.32, ry: 0.32 },
          { p: [-1.8, 3.2, side * 1.35], rx: 0.45, ry: 0.45 },
          { p: [-4.5, 3.9, side * 1.65], rx: 0.72, ry: 0.72 },
          { p: [-7.2, 4.8, side * 1.85], rx: 0.62, ry: 0.62 }
        ], 8, 14, chromeMat);
        group.add(mega);
      });

    } else if (isSupersport) {
      // Photo 3: Underslung Shorty Titanium / Carbon Exhaust
      const shorty = createSeamlessLoftedLimb([
        { p: [1.4, 3.2, 0.4], rx: 0.28, ry: 0.28 },
        { p: [0.0, 2.9, 0.8], rx: 0.34, ry: 0.34 },
        { p: [-1.8, 3.4, 1.25], rx: 0.52, ry: 0.52 },
        { p: [-3.2, 4.2, 1.45], rx: 0.48, ry: 0.48 }
      ], 6, 12, carbonMat);
      group.add(shorty);

    } else {
      // Streetfighter 4-into-1 into Upswept Carbon Canister
      const pipe = createSeamlessLoftedLimb([
        { p: [1.6, 3.4, 0], rx: 0.32, ry: 0.32 },
        { p: [-0.4, 3.1, 0.8], rx: 0.38, ry: 0.38 },
        { p: [-3.2, 3.9, 1.4], rx: 0.54, ry: 0.54 },
        { p: [-6.2, 5.2, 1.6], rx: 0.48, ry: 0.48 }
      ], 6, 12, carbonMat);
      group.add(pipe);
    }

    // ---------------------------------------------------------------------------
    // 4. SCULPTED CHASSIS, FAIRINGS, FUEL TANK & LIGHTING BY ARCHETYPE
    // ---------------------------------------------------------------------------
    if (isCruiser) {
      // Photo 2: Crimson Teardrop Fuel Tank with Pinstripes
      const tankShape = new THREE.Shape();
      tankShape.moveTo(-1.2, 6.2);
      tankShape.quadraticCurveTo(0.6, 8.5, 2.8, 8.2);
      tankShape.quadraticCurveTo(4.2, 7.8, 4.2, 6.5);
      tankShape.lineTo(2.2, 5.5);
      tankShape.quadraticCurveTo(0.2, 5.8, -1.2, 6.2);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 1.85, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.22, bevelSegments: 3 });
      tankGeo.translate(0, 0, -1.85 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      [-1, 1].forEach(side => {
        const pDecal = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 1.2),
          new THREE.MeshBasicMaterial({ map: getPinstripeTankTexture(palette.accent || 0xef4444), transparent: true, side: THREE.DoubleSide })
        );
        pDecal.position.set(1.4, 7.1, side * 1.05);
        pDecal.rotation.y = (side > 0 ? 1 : -1) * 0.25;
        group.add(pDecal);
      });

      const hlHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.72, 1.1, 18), darkFrameMat);
      hlHousing.rotation.z = Math.PI / 2;
      hlHousing.position.set(frontWheelX - 0.9, 8.4, 0);
      group.add(hlHousing);

      const hlLens = new THREE.Mesh(new THREE.SphereGeometry(0.65, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlLens.position.set(frontWheelX - 0.35, 8.4, 0);
      group.add(hlLens);

      const fenderShape = new THREE.Shape();
      fenderShape.moveTo(-4.2, 4.4);
      fenderShape.quadraticCurveTo(-6.8, 6.8, -8.6, 4.6);
      fenderShape.lineTo(-8.2, 4.2);
      fenderShape.quadraticCurveTo(-6.8, 6.2, -4.6, 4.0);
      fenderShape.closePath();
      const fenderGeo = new THREE.ExtrudeGeometry(fenderShape, { depth: 2.15, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.10, bevelSegments: 2 });
      fenderGeo.translate(0, 0, -2.15 / 2);
      group.add(new THREE.Mesh(fenderGeo, fairingMat));

    } else if (isSupersport) {
      // Photo 3: Yamaha R1M Full Race Fairing with Layered Side Flanks
      [-1, 1].forEach(side => {
        const sideFairingShape = new THREE.Shape();
        sideFairingShape.moveTo(-0.6, 6.4);
        sideFairingShape.lineTo(1.2, 8.8);
        sideFairingShape.lineTo(3.4, 8.6);
        sideFairingShape.lineTo(6.4, 7.8);
        sideFairingShape.lineTo(5.6, 4.8);
        sideFairingShape.lineTo(3.2, 3.4);
        sideFairingShape.lineTo(0.2, 3.6);
        sideFairingShape.closePath();
        const sideGeo = new THREE.ExtrudeGeometry(sideFairingShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 2 });
        sideGeo.translate(0, 0, side * 0.92);
        group.add(new THREE.Mesh(sideGeo, fairingMat));

        // DUAL CARBON-FIBER AERODYNAMIC DOWNFORCE WINGLETS (Exact Match to Photo 3!)
        const winglet = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 0.85), carbonMat);
        winglet.rotation.y = (side > 0 ? -1 : 1) * 0.32;
        winglet.rotation.z = -0.15;
        winglet.position.set(4.6, 7.4, side * 1.35);
        group.add(winglet);
      });

      const tankShape = new THREE.Shape();
      tankShape.moveTo(-0.8, 6.6);
      tankShape.quadraticCurveTo(0.8, 9.2, 3.2, 8.8);
      tankShape.quadraticCurveTo(4.4, 8.2, 4.6, 6.8);
      tankShape.lineTo(2.4, 5.6);
      tankShape.quadraticCurveTo(0.6, 6.2, -0.8, 6.6);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 1.85, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.22, bevelSegments: 3 });
      tankGeo.translate(0, 0, -1.85 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      [-0.52, 0.52].forEach(hz => {
        const catEye = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.72), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        catEye.rotation.y = (hz > 0 ? -1 : 1) * 0.35;
        catEye.position.set(6.45, 7.65, hz);
        group.add(catEye);
      });

      const wsShape = new THREE.Shape();
      wsShape.moveTo(3.6, 8.6);
      wsShape.quadraticCurveTo(5.2, 10.9, 6.5, 8.8);
      wsShape.lineTo(5.8, 8.2);
      wsShape.quadraticCurveTo(4.6, 9.8, 3.6, 8.6);
      const wsGeo = new THREE.ExtrudeGeometry(wsShape, { depth: 1.55, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2 });
      wsGeo.translate(0, 0, -1.55 / 2);
      group.add(new THREE.Mesh(wsGeo, smokedGlassMat));

    } else if (isHyperbike) {
      // Photo 1: Suzuki Hayabusa Bulbous Aerodynamic Fairings with 3-Gill Side Vents
      [-1, 1].forEach(side => {
        const aeroFlank = new THREE.Shape();
        aeroFlank.moveTo(-0.8, 6.5);
        aeroFlank.quadraticCurveTo(1.6, 9.5, 3.8, 8.9);
        aeroFlank.quadraticCurveTo(5.8, 9.1, 6.8, 7.4);
        aeroFlank.lineTo(5.4, 4.6);
        aeroFlank.lineTo(1.6, 3.4);
        aeroFlank.quadraticCurveTo(0.2, 5.0, -0.8, 6.5);
        const aeroGeo = new THREE.ExtrudeGeometry(aeroFlank, { depth: 0.45, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.16, bevelSegments: 3 });
        aeroGeo.translate(0, 0, side * 0.98);
        group.add(new THREE.Mesh(aeroGeo, fairingMat));

        [-0.4, 0.0, 0.4].forEach((gOffset, gIdx) => {
          const gill = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.18), darkFrameMat);
          gill.rotation.z = 0.55;
          gill.position.set(2.8 + gOffset, 5.8 - gIdx * 0.55, side * 1.35);
          group.add(gill);
        });

        const shitzuDecal = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 0.55),
          new THREE.MeshBasicMaterial({ map: getShitzuDecalTexture(), transparent: true, side: THREE.DoubleSide })
        );
        shitzuDecal.position.set(2.4, 8.1, side * 1.25);
        shitzuDecal.rotation.y = (side > 0 ? 1 : -1) * 0.25;
        group.add(shitzuDecal);

        const kanjiDecal = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 1.6),
          new THREE.MeshBasicMaterial({ map: getKanjiDecalTexture(), transparent: true, side: THREE.DoubleSide })
        );
        kanjiDecal.position.set(2.8, 5.6, side * 1.25);
        kanjiDecal.rotation.y = (side > 0 ? 1 : -1) * 0.18;
        group.add(kanjiDecal);
      });

      const noseCowl = new THREE.Mesh(new THREE.SphereGeometry(1.45, 20, 16), fairingMat);
      noseCowl.scale.set(1.4, 0.85, 0.95);
      noseCowl.position.set(5.8, 7.8, 0);
      group.add(noseCowl);

      const hlCenter = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlCenter.position.set(6.85, 7.7, 0);
      group.add(hlCenter);

    } else if (isCafeRacer) {
      // Photo 4: Modern Retro Cafe Racer with Bikini Quarter-Fairing & Wire-Grill Headlight
      const bikiniCowl = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 16, -Math.PI * 0.35, Math.PI * 0.70, 0, Math.PI * 0.85), darkFrameMat);
      bikiniCowl.position.set(5.8, 7.8, 0);
      bikiniCowl.rotation.z = Math.PI / 2;
      group.add(bikiniCowl);

      const grillHl = new THREE.Mesh(new THREE.CircleGeometry(0.68, 20), new THREE.MeshBasicMaterial({ map: getGrillHeadlightTexture(), side: THREE.DoubleSide }));
      grillHl.rotation.y = Math.PI / 2;
      grillHl.position.set(6.45, 7.8, 0);
      group.add(grillHl);

      const tankShape = new THREE.Shape();
      tankShape.moveTo(-0.8, 6.6);
      tankShape.quadraticCurveTo(0.8, 8.8, 2.8, 8.5);
      tankShape.quadraticCurveTo(4.2, 8.2, 4.4, 6.8);
      tankShape.lineTo(2.4, 5.6);
      tankShape.quadraticCurveTo(0.6, 6.2, -0.8, 6.6);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 1.85, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.22, bevelSegments: 3 });
      tankGeo.translate(0, 0, -1.85 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      [-1, 1].forEach(side => {
        const kneePad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.15), darkFrameMat);
        kneePad.position.set(1.4, 7.2, side * 1.05);
        group.add(kneePad);
      });

    } else {
      // Classic Streetfighter: Twin Projector Bug-Eyes & Muscular Tank
      const streetTankShape = new THREE.Shape();
      streetTankShape.moveTo(-0.8, 6.6);
      streetTankShape.quadraticCurveTo(0.6, 9.1, 2.6, 8.75);
      streetTankShape.quadraticCurveTo(4.2, 8.4, 4.6, 6.8);
      streetTankShape.lineTo(2.4, 5.6);
      streetTankShape.quadraticCurveTo(0.6, 6.2, -0.8, 6.6);
      const stGeo = new THREE.ExtrudeGeometry(streetTankShape, { depth: 1.95, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.22, bevelSegments: 4 });
      stGeo.translate(0, 0, -1.95 / 2);
      group.add(new THREE.Mesh(stGeo, fairingMat));

      [-0.45, 0.45].forEach(hz => {
        const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.65, 14), darkFrameMat);
        hl.rotation.z = Math.PI / 2;
        hl.position.set(6.4, 7.6, hz);
        group.add(hl);

        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        lens.position.set(6.72, 7.6, hz);
        group.add(lens);
      });
    }

    // Saddle & Tail
    const seatShape = new THREE.Shape();
    seatShape.moveTo(-0.4, 6.75);
    seatShape.quadraticCurveTo(-1.8, 6.45, -3.1, 6.95);
    seatShape.lineTo(-3.6, 7.85);
    seatShape.quadraticCurveTo(-5.2, 8.15, -6.6, 7.95);
    seatShape.lineTo(-6.3, 7.15);
    seatShape.quadraticCurveTo(-3.2, 6.0, -0.4, 6.15);
    seatShape.closePath();
    const seatGeo = new THREE.ExtrudeGeometry(seatShape, { depth: 1.65, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.20, bevelSegments: 3 });
    seatGeo.translate(0, 0, -1.65 / 2);
    group.add(new THREE.Mesh(seatGeo, leatherSeatMat));

    const tailShape = new THREE.Shape();
    if (isSupersport) {
      tailShape.moveTo(-1.2, 6.2);
      tailShape.lineTo(-6.8, 8.9);
      tailShape.lineTo(-7.3, 8.3);
      tailShape.quadraticCurveTo(-4.5, 6.0, -1.2, 5.4);
      tailShape.closePath();
    } else {
      tailShape.moveTo(-1.5, 6.0);
      tailShape.lineTo(-6.9, 7.85);
      tailShape.lineTo(-7.3, 7.35);
      tailShape.quadraticCurveTo(-4.5, 5.6, -1.5, 5.2);
      tailShape.closePath();
    }
    const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: isSupersport ? 1.55 : 1.75, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.18, bevelSegments: 3 });
    tailGeo.translate(0, 0, (isSupersport ? -1.55 : -1.75) / 2);
    group.add(new THREE.Mesh(tailGeo, fairingMat));

    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.95),
      new THREE.MeshBasicMaterial({ map: getBikeLicensePlateTexture(), side: THREE.DoubleSide })
    );
    plateMesh.rotation.y = -Math.PI / 2;
    plateMesh.rotation.z = 0.28;
    plateMesh.position.set(-7.35, 6.55, 0);
    group.add(plateMesh);

    // ---------------------------------------------------------------------------
    // 5. ANATOMICAL HUMAN RIDER (SCULPTED 3D FACE, ZERO BALLOONS, ZERO SPIKES)
    // ---------------------------------------------------------------------------
    const torsoColor = isCafeRacer ? 0x451a03 : (isCruiser ? 0x18181b : (isSupersport ? palette.fairing : outfitCfg.torsoHex));
    const sleeveColor = isCafeRacer ? 0x451a03 : (isCruiser ? 0x18181b : (isSupersport ? 0x18181b : outfitCfg.sleeveHex));
    const pantsColor = isCafeRacer ? 0x1e293b : (isCruiser ? 0x27272a : outfitCfg.legHex);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8926d, roughness: 0.65, metalness: 0.05 });
    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: isCafeRacer ? 0.70 : 0.45, metalness: 0.15 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: sleeveColor, roughness: isCafeRacer ? 0.70 : 0.45, metalness: 0.15 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.80, metalness: 0.05 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: isCafeRacer ? 0x451a03 : 0x111827, roughness: 0.45 });

    // A. Continuous Smooth Torso (Pelvis -> Spine -> Broad Shoulders)
    let riderTorso;
    if (isCruiser) {
      // Upright Cruiser Posture (Photo 2)
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.6, 6.90, 0], rx: 0.90, ry: 1.30 },
        { p: [-1.2, 8.25, 0], rx: 1.05, ry: 1.50 },
        { p: [-0.6, 9.85, 0], rx: 1.18, ry: 1.80 },
        { p: [0.10, 11.15, 0], rx: 1.02, ry: 1.88 },
        { p: [0.45, 11.75, 0], rx: 0.58, ry: 0.82 }
      ], 16, 20, torsoMat);
    } else if (isSupersport) {
      // Aggressive Racing Tuck (Photo 3)
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.9, 7.30, 0], rx: 0.88, ry: 1.25 },
        { p: [-1.0, 8.25, 0], rx: 1.02, ry: 1.45 },
        { p: [0.25, 9.35, 0], rx: 1.15, ry: 1.75 },
        { p: [1.35, 10.25, 0], rx: 0.98, ry: 1.85 },
        { p: [1.85, 10.70, 0], rx: 0.58, ry: 0.82 }
      ], 16, 20, torsoMat);
    } else {
      // Athletic Streetfighter Tuck (Photo 1)
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.8, 7.20, 0], rx: 0.88, ry: 1.25 },
        { p: [-1.1, 8.45, 0], rx: 1.02, ry: 1.45 },
        { p: [0.05, 10.05, 0], rx: 1.15, ry: 1.75 },
        { p: [0.95, 11.20, 0], rx: 0.98, ry: 1.85 },
        { p: [1.35, 11.75, 0], rx: 0.58, ry: 0.82 }
      ], 16, 20, torsoMat);
    }
    group.add(riderTorso);

    // Speed Hump on Upper Back (for Supersport / Hyperbike)
    if (isSupersport || isHyperbike) {
      const speedHump = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), torsoMat);
      speedHump.scale.set(1.4, 0.72, 0.85);
      speedHump.position.set(0.65, 10.45, 0);
      group.add(speedHump);
    }

    // Padded Collar Ring joining neck into torso
    const neckBase = isCruiser ? { x: 0.35, y: 11.85 } : (isSupersport ? { x: 1.75, y: 10.85 } : { x: 1.25, y: 11.85 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.12, 10, 20), torsoMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(neckBase.x, neckBase.y, 0);
    group.add(collar);

    // Neck
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.95, 18), skinMat);
    neckMesh.position.set(neckBase.x + 0.12, neckBase.y + 0.45, 0);
    group.add(neckMesh);

    // B. Anatomical 3D Head & Sculpted Human Face
    const headPos = isCruiser
      ? { x: 0.85, y: 13.15, z: 0 }
      : (isSupersport ? { x: 2.25, y: 12.05, z: 0 } : { x: 1.75, y: 13.20, z: 0 });
    const headRotZ = isCruiser ? -0.06 : (isSupersport ? -0.38 : -0.18);

    const headGroup = new THREE.Group();
    headGroup.position.set(headPos.x, headPos.y, headPos.z);
    headGroup.rotation.z = headRotZ;

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const darkIrisMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

    // Organic Head Cranium with High-Resolution Face Texture
    const faceMat = new THREE.MeshStandardMaterial({
      map: getRealisticFaceTexture(paletteIdx),
      roughness: 0.65,
      metalness: 0.04
    });
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 18), faceMat);
    headMesh.scale.set(1.02, 1.16, 0.90);
    headGroup.add(headMesh);

    // 3D Sculpted Nose protruding forward
    const noseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 8), skinMat);
    noseMesh.rotation.z = -Math.PI / 2 + 0.18;
    noseMesh.position.set(0.86, 0.02, 0);
    headGroup.add(noseMesh);

    // 3D Brow Ridge
    const browMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.52), skinMat);
    browMesh.position.set(0.68, 0.22, 0);
    headGroup.add(browMesh);

    // 3D Chin
    const chinMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.34), skinMat);
    chinMesh.position.set(0.68, -0.36, 0);
    headGroup.add(chinMesh);

    // Motorcycle Helmets & Visors by Archetype
    if (isCruiser) {
      // Photo 2: Tactical Balaclava Mask exposing Eyes, Brow & Nose Bridge + Skull Cap
      const balaclavaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
      const lowerMask = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.84), balaclavaMat);
      lowerMask.position.set(0.44, -0.25, 0);
      headGroup.add(lowerMask);

      const neckWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.85, 18), balaclavaMat);
      neckWrap.position.set(0.05, -0.65, 0);
      headGroup.add(neckWrap);

      const skullCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.87, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.25, metalness: 0.5 })
      );
      skullCap.position.set(0, 0.12, 0);
      headGroup.add(skullCap);

    } else {
      const helmetColor = isCafeRacer ? 0x090d16 : (isSupersport ? palette.fairing : (outfitCfg.streetfighter ? 0x111827 : outfitCfg.helmetHex));
      const helmetMat = new THREE.MeshStandardMaterial({
        color: helmetColor,
        roughness: 0.20,
        metalness: isCafeRacer ? 0.35 : 0.55
      });

      // Helmet Crown (covers skull top above forehead)
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.35),
        helmetMat
      );
      crown.position.set(0, 0.06, 0);
      headGroup.add(crown);

      // Back of Skull Wrap (covers rear and sides)
      const backCowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 24, 14, Math.PI * 0.45, Math.PI * 1.10, Math.PI * 0.15, Math.PI * 0.70),
        helmetMat
      );
      backCowl.position.set(-0.04, 0.02, 0);
      headGroup.add(backCowl);

      if (isCafeRacer) {
        // Photo 4: Vintage Yellow Bubble Shield (Transparent - face 100% visible inside!)
        const bubbleMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.06,
          metalness: 0.25,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const bubbleShield = new THREE.Mesh(
          new THREE.SphereGeometry(0.92, 24, 18, -Math.PI * 0.26, Math.PI * 0.52, Math.PI * 0.15, Math.PI * 0.65),
          bubbleMat
        );
        bubbleShield.position.set(0.12, 0.02, 0);
        headGroup.add(bubbleShield);

      } else if (isSupersport || isHyperbike) {
        // Photos 1 & 3: Racing Helmet Chin Bar + Smoked Transparent Visor
        const chinBar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.76), helmetMat);
        chinBar.position.set(0.58, -0.46, 0);
        headGroup.add(chinBar);

        const raceVisorMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.05,
          metalness: 0.45,
          transparent: true,
          opacity: 0.36,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const raceVisor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.88, 0.88, 0.38, 20, 1, true, -Math.PI * 0.26, Math.PI * 0.52),
          raceVisorMat
        );
        raceVisor.position.set(0.06, 0.06, 0);
        headGroup.add(raceVisor);

      } else {
        // Streetfighter: Flip-Up Visor Raised at 35° exposing Sculpted Human Face
        const raisedVisorMat = new THREE.MeshStandardMaterial({
          color: 0x090d16,
          roughness: 0.05,
          metalness: 0.40,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const raisedVisor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.88, 0.88, 0.38, 20, 1, true, -Math.PI * 0.26, Math.PI * 0.52),
          raisedVisorMat
        );
        raisedVisor.rotation.z = 0.52;
        raisedVisor.position.set(0.18, 0.46, 0);
        headGroup.add(raisedVisor);
      }
    }
    group.add(headGroup);

    // C. Continuous Muscular Arms (ONE Continuous Spline - ZERO Ball Joints, ZERO Spikes)
    [-1, 1].forEach(side => {
      let armMesh;
      let handPos;

      if (isCruiser) {
        // Bare / Dark Hoodie Muscular Arms Reaching Forward
        armMesh = createSeamlessLoftedLimb([
          { p: [0.05, 11.10, side * 1.55], rx: 0.46, ry: 0.46 },
          { p: [0.95, 10.60, side * 1.95], rx: 0.42, ry: 0.42 },
          { p: [1.85, 10.10, side * 1.95], rx: 0.36, ry: 0.36 },
          { p: [2.65, 9.75,  side * 1.88], rx: 0.30, ry: 0.30 }
        ], 14, 14, sleeveMat);
        handPos = [2.80, 9.75, side * 1.88];

      } else if (isSupersport) {
        // Racing Tuck Sleeves with Titanium Shoulder Slider
        armMesh = createSeamlessLoftedLimb([
          { p: [1.35, 10.25, side * 1.55], rx: 0.46, ry: 0.46 },
          { p: [2.05, 9.35,  side * 1.78], rx: 0.40, ry: 0.40 },
          { p: [2.75, 8.55,  side * 1.68], rx: 0.34, ry: 0.34 },
          { p: [3.35, 8.20,  side * 1.58], rx: 0.28, ry: 0.28 }
        ], 14, 14, sleeveMat);
        handPos = [3.45, 8.15, side * 1.56];

        const slider = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), chromeMat);
        slider.scale.set(1.2, 0.65, 0.95);
        slider.position.set(1.35, 10.35, side * 1.65);
        group.add(slider);

      } else {
        // Athletic Street / Cafe Bent Arms
        armMesh = createSeamlessLoftedLimb([
          { p: [0.85, 11.20, side * 1.55], rx: 0.46, ry: 0.46 },
          { p: [1.75, 10.45, side * 1.85], rx: 0.40, ry: 0.40 },
          { p: [2.55, 9.55,  side * 1.82], rx: 0.34, ry: 0.34 },
          { p: [3.20, 8.85,  side * 1.75], rx: 0.28, ry: 0.28 }
        ], 14, 14, sleeveMat);
        handPos = [3.32, 8.80, side * 1.74];
      }
      group.add(armMesh);

      // Anatomical Glove & Molded Knuckle Armor
      const glove = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.55), shoeMat);
      glove.position.set(handPos[0], handPos[1], handPos[2]);
      group.add(glove);

      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.46), whiteMat);
      knuckle.position.set(handPos[0], handPos[1] + 0.18, handPos[2]);
      group.add(knuckle);
    });

    // D. Continuous Muscular Legs Hugging Fuel Tank
    [-1, 1].forEach(side => {
      let legMesh;
      let footPos;

      if (isCruiser) {
        // Forward Relaxed Cruiser Leg Placement
        legMesh = createSeamlessLoftedLimb([
          { p: [-1.4, 7.10, side * 1.25], rx: 0.72, ry: 0.72 },
          { p: [-0.2, 7.20, side * 1.85], rx: 0.66, ry: 0.66 },
          { p: [1.35, 6.45, side * 1.85], rx: 0.58, ry: 0.58 },
          { p: [2.25, 4.85, side * 1.75], rx: 0.48, ry: 0.48 },
          { p: [2.65, 3.85, side * 1.65], rx: 0.40, ry: 0.40 }
        ], 14, 14, pantsMat);
        footPos = [2.75, 3.80, side * 1.65];

      } else if (isSupersport) {
        // Racing Rearset Tuck with Knee Slider
        legMesh = createSeamlessLoftedLimb([
          { p: [-1.7, 7.30, side * 1.25], rx: 0.72, ry: 0.72 },
          { p: [-0.6, 7.25, side * 1.85], rx: 0.66, ry: 0.66 },
          { p: [0.65, 6.65, side * 1.95], rx: 0.58, ry: 0.58 },
          { p: [0.10, 4.85, side * 1.80], rx: 0.48, ry: 0.48 },
          { p: [-0.55, 3.55, side * 1.68], rx: 0.40, ry: 0.40 }
        ], 14, 14, pantsMat);
        footPos = [-0.55, 3.50, side * 1.68];

        const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14), whiteMat);
        puck.rotation.z = Math.PI / 2;
        puck.position.set(0.68, 6.65, side * 2.12);
        group.add(puck);

      } else {
        // Mid-Controls (Cafe & Streetfighter)
        legMesh = createSeamlessLoftedLimb([
          { p: [-1.6, 7.15, side * 1.25], rx: 0.72, ry: 0.72 },
          { p: [-0.4, 7.20, side * 1.85], rx: 0.66, ry: 0.66 },
          { p: [0.75, 6.75, side * 1.95], rx: 0.58, ry: 0.58 },
          { p: [0.25, 4.85, side * 1.80], rx: 0.48, ry: 0.48 },
          { p: [-0.40, 3.55, side * 1.70], rx: 0.40, ry: 0.40 }
        ], 14, 14, pantsMat);
        footPos = [-0.40, 3.50, side * 1.70];
      }
      group.add(legMesh);

      // Detailed Riding Boot / Sneaker
      const boot = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.72, 0.82), shoeMat);
      boot.position.set(footPos[0] + 0.35, footPos[1], footPos[2]);
      group.add(boot);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.18, 0.88), (outfitCfg.varsity || outfitCfg.streetfighter) ? whiteMat : darkFrameMat);
      sole.position.set(footPos[0] + 0.35, footPos[1] - 0.38, footPos[2]);
      group.add(sole);

      // Metal Footpegs
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 10), chromeMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(footPos[0], footPos[1] - 0.35, side * 1.35);
      group.add(peg);
    });

    // Zero-Lag Additive Headlight Ground Light Pool
    const headGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const headPool = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), headGlowMat);
    headPool.rotation.x = -Math.PI / 2;
    headPool.position.set(frontWheelX + 18, 0.08, 0);
    group.add(headPool);

    return group;
  }
"""

with open(r"C:\Users\HP\Desktop\commute-dhaka-web\scratch\master_bike_code.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Saved updated master_bike_code.js!")
