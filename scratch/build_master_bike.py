# -*- coding: utf-8 -*-
"""
Generates the complete, pristine Three.js motorcycle & anatomical human rider factory.
"""

CODE = r'''// ---------------------------------------------------------------------------
  // Seamless GTA Motorcycle & Organic Multi-Outfit Rider Factory (Pure Three.js)
  // 5 GTA V Archetypes, 10 Automotive Palettes, Sculpted 3D Human Face & Multi-Outfits
  // ---------------------------------------------------------------------------
  const bikeTextureCache = {};

  // 1. High-Resolution Photorealistic Human Face Canvas Texture Generator
  function getRealisticFaceTexture(toneIdx, eyeColorHex) {
    const tones = [
      { skin: '#dfad87', shadow: '#b57a52', brow: '#25160d', lip: '#b35d53', eye: '#3d2516' }, // Light-Medium
      { skin: '#c8926d', shadow: '#9e6745', brow: '#1a1008', lip: '#9e524b', eye: '#24140a' }, // Medium South Asian
      { skin: '#9e6a4b', shadow: '#77472b', brow: '#110905', lip: '#7d403a', eye: '#190e08' }  // Warm Deep Olive
    ];
    const t = tones[(toneIdx || 0) % tones.length];
    const key = 'face_' + ((toneIdx || 0) % tones.length) + '_' + (eyeColorHex || 'def');
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
    ambGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    ambGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.0)');
    ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
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
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(175, 184);
    ctx.quadraticCurveTo(215, 168, 246, 178);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(337, 184);
    ctx.quadraticCurveTo(297, 168, 266, 178);
    ctx.stroke();

    // Eyebrow individual hair strokes
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 18; i++) {
      const lx = 178 + i * 3.6;
      const arc = Math.sin((i / 18) * Math.PI) * 9;
      ctx.beginPath();
      ctx.moveTo(lx, 184 - arc);
      ctx.lineTo(lx + 4, 174 - arc);
      ctx.stroke();
      const rx = 334 - i * 3.6;
      ctx.beginPath();
      ctx.moveTo(rx, 184 - arc);
      ctx.lineTo(rx - 4, 174 - arc);
      ctx.stroke();
    }

    // Eyes (Almond Shape with Sclera, Iris, Pupil, Catchlights)
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 216 : 296;
      const cy = 215;

      const sockGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 38);
      sockGrad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
      sockGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = sockGrad;
      ctx.fillRect(cx - 36, cy - 30, 72, 60);

      // Upper eyelid crease line
      ctx.strokeStyle = t.shadow;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy - 8);
      ctx.quadraticCurveTo(cx, cy - 18, cx + 24, cy - 8);
      ctx.stroke();

      // Sclera (Off-white)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx - 22, cy);
      ctx.quadraticCurveTo(cx - 2, cy - 13, cx + 22, cy);
      ctx.quadraticCurveTo(cx + 2, cy + 11, cx - 22, cy);
      ctx.closePath();
      ctx.fill();

      // Tear duct pink accent
      ctx.fillStyle = 'rgba(220, 100, 100, 0.45)';
      ctx.beginPath();
      ctx.arc(side === -1 ? cx + 20 : cx - 20, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Iris (Rich layered hazel/brown)
      const irisGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 11);
      irisGrad.addColorStop(0, '#5a3820');
      irisGrad.addColorStop(0.7, t.eye);
      irisGrad.addColorStop(1, '#110804');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 10.5, 0, Math.PI * 2);
      ctx.fill();

      // Dark Limbal Ring
      ctx.strokeStyle = '#0a0502';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Deep Black Pupil
      ctx.fillStyle = '#060301';
      ctx.beginPath();
      ctx.arc(cx, cy, 5.2, 0, Math.PI * 2);
      ctx.fill();

      // Dual High-Key Catchlights (Studio reflections)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 3.2, cy - 3.2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 3.0, cy + 2.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Upper Eyelash line (Bold dark contour)
      ctx.strokeStyle = '#150a04';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy);
      ctx.quadraticCurveTo(cx, cy - 14, cx + 24, cy);
      ctx.stroke();
    });

    // Sculpted Nose Bridge Shading & Nostrils
    const noseShade = ctx.createLinearGradient(236, 180, 276, 180);
    noseShade.addColorStop(0, 'rgba(0, 0, 0, 0.20)');
    noseShade.addColorStop(0.5, 'rgba(255, 255, 255, 0.14)');
    noseShade.addColorStop(1, 'rgba(0, 0, 0, 0.20)');
    ctx.fillStyle = noseShade;
    ctx.beginPath();
    ctx.moveTo(248, 185);
    ctx.lineTo(242, 275);
    ctx.lineTo(270, 275);
    ctx.lineTo(264, 185);
    ctx.closePath();
    ctx.fill();

    // Nose Tip Highlight & Bulb
    const noseTip = ctx.createRadialGradient(256, 274, 2, 256, 274, 16);
    noseTip.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
    noseTip.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = noseTip;
    ctx.beginPath();
    ctx.arc(256, 274, 16, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#1c0c05';
    ctx.beginPath();
    ctx.ellipse(240, 284, 6.5, 4.0, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(272, 284, 6.5, 4.0, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Philtrum
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(252, 290, 8, 22);

    // Natural Sculpted Lips with Defined Vermilion Border
    ctx.fillStyle = t.lip;
    ctx.beginPath();
    ctx.moveTo(222, 322);
    ctx.quadraticCurveTo(242, 312, 256, 316);
    ctx.quadraticCurveTo(270, 312, 290, 322);
    ctx.quadraticCurveTo(256, 328, 222, 322);
    ctx.fill();

    ctx.fillStyle = '#83342a';
    ctx.beginPath();
    ctx.moveTo(224, 324);
    ctx.quadraticCurveTo(256, 345, 288, 324);
    ctx.quadraticCurveTo(256, 326, 224, 324);
    ctx.fill();

    // Lip highlight
    const lipShine = ctx.createRadialGradient(256, 332, 2, 256, 332, 14);
    lipShine.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
    lipShine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = lipShine;
    ctx.beginPath();
    ctx.ellipse(256, 332, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Masculine 5 O'Clock Stubble Shadow along jaw & chin
    ctx.fillStyle = 'rgba(15, 10, 8, 0.20)';
    ctx.beginPath();
    ctx.moveTo(170, 310);
    ctx.quadraticCurveTo(256, 420, 342, 310);
    ctx.quadraticCurveTo(360, 360, 256, 435);
    ctx.quadraticCurveTo(152, 360, 170, 310);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    tex.generateMipmaps = true;
    bikeTextureCache[key] = tex;
    return tex;
  }

  // 2. 2x2 Twill Weave Carbon Fiber Texture Generator
  function getCarbonFiberTexture() {
    if (bikeTextureCache.carbon) return bikeTextureCache.carbon;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1c1c1f';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#2f2f35';
    for (let y = 0; y < 64; y += 8) {
      for (let x = 0; x < 64; x += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 8, 8);
          ctx.fillStyle = '#3a3a42';
          ctx.fillRect(x + 1, y + 1, 6, 2);
          ctx.fillStyle = '#2f2f35';
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    bikeTextureCache.carbon = tex;
    return tex;
  }

  // 3. Perforated Steel Disc Brake Rotor Texture Generator
  function getDiscRotorTexture() {
    if (bikeTextureCache.discRotor) return bikeTextureCache.discRotor;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    for (let r = 50; r < 120; r += 7) {
      ctx.beginPath();
      ctx.arc(128, 128, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const r = 65 + (i % 5) * 11;
      const x = 128 + Math.cos(angle) * r;
      const y = 128 + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.discRotor = tex;
    return tex;
  }

  // 4. Heat-Wrapped Exhaust Texture Generator (Cafe Racer)
  function getHeatWrapTexture() {
    if (bikeTextureCache.heatWrap) return bikeTextureCache.heatWrap;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#5c4d3c';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#786650';
    for (let y = 0; y < 64; y += 8) {
      ctx.fillRect(0, y, 64, 4);
      ctx.fillStyle = '#3a2f24';
      ctx.fillRect(0, y + 4, 64, 1.5);
      ctx.fillStyle = '#786650';
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    bikeTextureCache.heatWrap = tex;
    return tex;
  }

  // 5. Tire Tread & Fukaru Sidewall Texture Generator
  function getFukaruTireTexture() {
    if (bikeTextureCache.fukaruTire) return bikeTextureCache.fukaruTire;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FUKARU   RACE   RADIAL', 256, 64);

    ctx.fillStyle = '#eab308';
    ctx.fillRect(60, 58, 28, 12);
    ctx.fillRect(424, 58, 28, 12);

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.fukaruTire = tex;
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

    const col = '#' + (accentHex || 0xef4444).toString(16).padStart(6, '0');
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 64);
    ctx.bezierCurveTo(80, 20, 180, 20, 246, 64);
    ctx.bezierCurveTo(180, 108, 80, 108, 10, 64);
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 64);
    ctx.bezierCurveTo(85, 32, 175, 32, 231, 64);
    ctx.bezierCurveTo(175, 96, 85, 96, 25, 64);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache[key] = tex;
    return tex;
  }

  // 7. Stone Guard Headlight Grill Texture (Cafe Racer)
  function getGrillHeadlightTexture() {
    if (bikeTextureCache.grillHeadlight) return bikeTextureCache.grillHeadlight;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffdfa';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3.5;
    for (let x = 20; x <= 108; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 15);
      ctx.lineTo(x, 113);
      ctx.stroke();
    }
    for (let y = 20; y <= 108; y += 16) {
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(113, y);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.grillHeadlight = tex;
    return tex;
  }

  // 8. License Plate Texture Generator
  function getBikeLicensePlateTexture() {
    if (bikeTextureCache.plate) return bikeTextureCache.plate;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 122, 58);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UF82 ISK', 64, 34);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.plate = tex;
    return tex;
  }

  // 9. Shitzu Decal Texture Generator
  function getShitzuDecalTexture() {
    if (bikeTextureCache.shitzu) return bikeTextureCache.shitzu;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 32px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHITZU', 128, 28);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(40, 48, 176, 4);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.shitzu = tex;
    return tex;
  }

  // 10. Kanji Decal Texture Generator
  function getKanjiDecalTexture() {
    if (bikeTextureCache.kanji) return bikeTextureCache.kanji;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px "Yu Gothic", "MS Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('死', 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.kanji = tex;
    return tex;
  }

  // 11. Back Varsity "R*" Texture Generator
  function getVarsityBackTexture(jacketHex) {
    const key = 'varsity_' + jacketHex;
    if (bikeTextureCache[key]) return bikeTextureCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 120px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', 104, 115);
    ctx.font = '900 70px "Segoe UI Symbol", sans-serif';
    ctx.fillText('★', 168, 145);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache[key] = tex;
    return tex;
  }

  // Parallel-Transport Lofting Helper for Organic Limbs & Torso
  function createSeamlessLoftedLimb(crossSections, radialSegs, pathSegs, material) {
    radialSegs = radialSegs || 16;
    pathSegs = pathSegs || 20;

    const points = crossSections.map(c => new THREE.Vector3(c.p[0], c.p[1], c.p[2]));
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    function getInterpolatedRadius(u) {
      const n = crossSections.length - 1;
      const idx = Math.min(Math.floor(u * n), n - 1);
      const t = (u * n) - idx;
      const cA = crossSections[idx];
      const cB = crossSections[idx + 1];
      return {
        rx: THREE.MathUtils.lerp(cA.rx, cB.rx, t),
        ry: THREE.MathUtils.lerp(cA.ry, cB.ry, t)
      };
    }

    const frames = curve.computeFrenetFrames(pathSegs, false);
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= pathSegs; i++) {
      const u = i / pathSegs;
      const P = curve.getPointAt(u);
      const rad = getInterpolatedRadius(u);
      const N = frames.normals[i];
      const B = frames.binormals[i];

      for (let j = 0; j <= radialSegs; j++) {
        const v = j / radialSegs;
        const theta = v * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        const vx = P.x + (N.x * cos * rad.rx) + (B.x * sin * rad.ry);
        const vy = P.y + (N.y * cos * rad.rx) + (B.y * sin * rad.ry);
        const vz = P.z + (N.z * cos * rad.rx) + (B.z * sin * rad.ry);

        vertices.push(vx, vy, vz);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < pathSegs; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const a = i * (radialSegs + 1) + j;
        const b = (i + 1) * (radialSegs + 1) + j;
        const c = (i + 1) * (radialSegs + 1) + (j + 1);
        const d = i * (radialSegs + 1) + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // 10 Automotive Palettes for GTA V Motorcycles
  const BIKE_PALETTES = [
    // 0: Pearl White & Brushed Bronze (Modern Cafe Racer - Photo 4)
    { name: 'Pearl White & Bronze', fairing: 0xf8fafc, accent: 0x18181b, rim: 0xb45309, rimLip: null, seat: 0x451a03, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 1: Candy Apple Red & Gloss Black (Yamaha R1M Supersport - Photo 3)
    { name: 'Candy Red & Gloss Black', fairing: 0xbe123c, accent: 0x090d16, rim: 0x090d16, rimLip: 0xef4444, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 2: Liquid Titanium Silver & Gunmetal (Suzuki Hayabusa - Photo 1)
    { name: 'Titanium Silver & Gunmetal', fairing: 0xc0c7d0, accent: 0x18181b, rim: 0x334155, rimLip: null, seat: 0x090d16, frame: 0x1e293b, chrome: 0xf1f5f9, caliper: 0xd97706 },
    // 3: Crimson Candy & Matte Black (Western Nightblade Muscle Cruiser - Photo 2)
    { name: 'Nightblade Crimson & Black', fairing: 0x881337, accent: 0x18181b, rim: 0x18181b, rimLip: 0x881337, seat: 0x18181b, frame: 0x18181b, chrome: 0xd4af37, caliper: 0xd4af37 },
    // 4: Stealth Matte Charcoal (Streetfighter Biker)
    { name: 'Stealth Matte Charcoal', fairing: 0x1e293b, accent: 0x38bdf8, rim: 0x090d16, rimLip: 0x0284c7, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 5: Emerald Green & Gold
    { name: 'Emerald Green & Gold', fairing: 0x065f46, accent: 0xf8fafc, rim: 0xd97706, rimLip: null, seat: 0x451a03, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 6: Deep Sapphire Blue & Black
    { name: 'Sapphire Blue & Black', fairing: 0x1d4ed8, accent: 0x090d16, rim: 0x090d16, rimLip: 0x3b82f6, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 7: Nardo Grey & Acid Green
    { name: 'Nardo Grey & Acid Green', fairing: 0x64748b, accent: 0x84cc16, rim: 0x090d16, rimLip: 0x84cc16, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0x84cc16 },
    // 8: Royal Purple & Chrome
    { name: 'Royal Purple & Chrome', fairing: 0x581c87, accent: 0xf8fafc, rim: 0xe2e8f0, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 9: Championship Gold & Silver
    { name: 'Championship Gold & Silver', fairing: 0xd97706, accent: 0x090d16, rim: 0xcfd8dc, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 }
  ];

  // Master Canonical GTA V Motorcycle & Rider Builder
  function createRealisticGTABike(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    // 5 Distinct GTA V Motorcycle Archetypes
    // 0: Streetfighter (Twin Bug-Eye Projectors, Trellis Frame, Flip-Up Visor)
    // 1: Western Nightblade Cruiser (Crimson/Black Teardrop Tank, V-Twin, Gold USD Forks, Fat Rear Drag Wheel - Photo 2)
    // 2: Yamaha R1M Supersport (Candy Red, Carbon Winglets, Racing Tuck, Speed Hump - Photo 3)
    // 3: Suzuki Hayabusa Hyperbike (Titanium Silver, Dual Megaphones, 3 Aero Gills - Photo 1)
    // 4: Modern Cafe Racer (Glacier White Tank, Boxer-Twin, Heat-Wrapped Exhaust, Yellow Bubble Shield - Photo 4)
    const archetypeIdx = (vData && vData.archetype !== undefined)
      ? (Math.abs(vData.archetype) % 5)
      : Math.abs((appearanceSeed || 0) % 5);

    const isCruiser = (archetypeIdx === 1);
    const isSupersport = (archetypeIdx === 2);
    const isHyperbike = (archetypeIdx === 3);
    const isCafeRacer = (archetypeIdx === 4);
    const isStreetfighter = (archetypeIdx === 0);

    // Color Palette Selection (Archetypes have iconic default colors matching photos!)
    const paletteIdx = (vData && vData.palette !== undefined)
      ? (Math.abs(vData.palette) % BIKE_PALETTES.length)
      : (isCruiser ? 3 : (isSupersport ? 1 : (isHyperbike ? 2 : (isCafeRacer ? 0 : Math.abs(appearanceSeed || 0) % BIKE_PALETTES.length))));

    const palette = BIKE_PALETTES[paletteIdx];
    // DO NOT allow generic ride-share blue (#2563eb) to overwrite signature archetype colors!
    const fairingColor = (vData && vData.customColor) ? vData.customColor : palette.fairing;

    // 4 Distinct GTA Multi-Outfit Riders
    const outfitIdx = (vData && vData.outfit !== undefined)
      ? (Math.abs(vData.outfit) % 4)
      : (isCruiser ? 0 : (isSupersport ? 1 : (isHyperbike ? 1 : (isCafeRacer ? 2 : Math.abs((appearanceSeed || 0) >> 2) % 4))));

    const OUTFIT_PRESETS = [
      { name: 'GTA Streetfighter', torsoHex: 0x18181b, sleeveHex: 0x18181b, legHex: 0x1f2937, helmetHex: 0x111827, streetfighter: true },
      { name: 'GTA "R★" Varsity Rider', torsoHex: 0x580b18, sleeveHex: 0x18181b, legHex: 0x334155, helmetHex: 0x1e293b, varsity: true },
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
      roughness: isCafeRacer ? 0.32 : 0.15,
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
      color: palette.rim || 0x090d16,
      roughness: 0.30,
      metalness: 0.82
    });
    const discMat = new THREE.MeshStandardMaterial({
      map: getDiscRotorTexture(),
      roughness: 0.25,
      metalness: 0.88
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: palette.caliper || 0xd97706,
      roughness: 0.35,
      metalness: 0.70
    });

    // ---------------------------------------------------------------------------
    // 1. WHEEL BUILDER (HOLLOW 10-SPOKE ALLOY / WIRE BRONZE / FAT DRAG REAR)
    // ---------------------------------------------------------------------------
    function buildHollowMotorcycleWheel(wheelRadius, tireWidth, isRear, isWireSpoke, isFatDrag) {
      const wheelGroup = new THREE.Group();
      const rimRadius = wheelRadius * 0.72;

      // Tire Torus (Tread)
      const tireGeo = new THREE.TorusGeometry(wheelRadius - tireWidth * 0.45, tireWidth * 0.45, 18, 36);
      const tireMesh = new THREE.Mesh(tireGeo, tireRubberMat);
      wheelGroup.add(tireMesh);

      // Inner Rim Band
      const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth * 0.75, 32, 1, true);
      rimGeo.rotateX(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(rimGeo, rimMat));

      // Rim Outer Lip Accent Ring
      if (palette.rimLip) {
        const lipMat = new THREE.MeshBasicMaterial({ color: palette.rimLip });
        [-1, 1].forEach(side => {
          const lipGeo = new THREE.TorusGeometry(rimRadius + 0.05, 0.08, 8, 32);
          const lip = new THREE.Mesh(lipGeo, lipMat);
          lip.position.z = side * (tireWidth * 0.38);
          wheelGroup.add(lip);
        });
      }

      // Central Hub
      const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.22, wheelRadius * 0.22, tireWidth * 0.82, 18);
      hubGeo.rotateX(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(hubGeo, darkFrameMat));

      // Spokes Construction
      if (isFatDrag && isRear) {
        // Western Nightblade Solid Contrast-Cut Disc (Photo 2)
        const discCenter = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius * 0.95, rimRadius * 0.95, tireWidth * 0.45, 24), darkFrameMat);
        discCenter.rotation.x = Math.PI / 2;
        wheelGroup.add(discCenter);
        for (let i = 0; i < 5; i++) {
          const slot = new THREE.Mesh(new THREE.BoxGeometry(rimRadius * 0.55, 0.45, tireWidth * 0.5), chromeMat);
          slot.rotation.z = (i / 5) * Math.PI;
          wheelGroup.add(slot);
        }
      } else if (isWireSpoke) {
        // Cafe Racer Bronze 36-Wire Cross Lacing (Photo 4)
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.9 });
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, rimRadius * 0.85, 6);
          const spoke = new THREE.Mesh(spokeGeo, wireMat);
          spoke.position.set(Math.cos(angle) * (rimRadius * 0.48), Math.sin(angle) * (rimRadius * 0.48), (i % 2 === 0 ? 0.3 : -0.3) * (tireWidth * 0.35));
          spoke.rotation.z = angle + ((i % 2 === 0) ? 0.35 : -0.35);
          wheelGroup.add(spoke);
        }
      } else {
        // Hollow 10-Spoke Alloy Star Wheels (5 Pairs)
        for (let i = 0; i < 5; i++) {
          const baseAngle = (i / 5) * Math.PI * 2;
          [-0.10, 0.10].forEach(offset => {
            const spokeAngle = baseAngle + offset;
            const spokeGeo = new THREE.BoxGeometry(0.24, rimRadius * 0.82, tireWidth * 0.28);
            const spoke = new THREE.Mesh(spokeGeo, rimMat);
            spoke.position.set(Math.cos(spokeAngle) * (rimRadius * 0.45), Math.sin(spokeAngle) * (rimRadius * 0.45), 0);
            spoke.rotation.z = spokeAngle - Math.PI / 2;
            wheelGroup.add(spoke);
          });
        }
      }

      // Perforated Floating Steel Brake Discs & Brembo Caliper
      [-1, 1].forEach(side => {
        if (!isRear || side === 1) {
          const rotor = new THREE.Mesh(new THREE.CircleGeometry(wheelRadius * 0.60, 24), discMat);
          rotor.position.z = side * (tireWidth * 0.42);
          wheelGroup.add(rotor);
        }
      });

      return wheelGroup;
    }

    // Wheel Base Specifications
    const frontWheelRadius = 3.25;
    const rearWheelRadius = isCruiser ? 3.10 : 3.25;
    const frontTireWidth = 1.25;
    const rearTireWidth = isCruiser ? 2.65 : (isHyperbike ? 1.95 : 1.65); // Massive 240 drag tire for Cruiser!

    const frontWheelX = isCruiser ? 9.8 : (isHyperbike ? 8.9 : 8.5);
    const rearWheelX = isCruiser ? -9.2 : -8.5;
    const wheelCenterY = 3.25;

    // Build Wheels
    const isWireSpoke = isCafeRacer;
    const isFatDrag = isCruiser;

    const wheelFront = buildHollowMotorcycleWheel(frontWheelRadius, frontTireWidth, false, isWireSpoke, false);
    wheelFront.position.set(frontWheelX, wheelCenterY, 0);
    group.add(wheelFront);
    const wPivot = wheelFront;
    group.userData.wheels.push(wPivot);

    const wheelRear = buildHollowMotorcycleWheel(rearWheelRadius, rearTireWidth, true, isWireSpoke, isFatDrag);
    wheelRear.position.set(rearWheelX, wheelCenterY, 0);
    group.add(wheelRear);
    group.userData.wheels.push(wheelRear);

    group.userData.wheelRadius = 3.25;

    // Brake Calipers (Mounted statically to forks and swingarm)
    const caliperF = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.15, 0.55), caliperMat);
    caliperF.position.set(frontWheelX - 1.2, wheelCenterY + 1.2, frontTireWidth * 0.45);
    group.add(caliperF);

    const caliperR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.55), caliperMat);
    caliperR.position.set(rearWheelX + 1.1, wheelCenterY + 1.0, rearTireWidth * 0.42);
    group.add(caliperR);

    // ---------------------------------------------------------------------------
    // 2. FRONT FORKS & STEERING HEAD
    // ---------------------------------------------------------------------------
    const forkAngle = isCruiser ? 0.38 : (isCafeRacer ? 0.28 : 0.25);
    const forkLength = isCruiser ? 12.8 : 10.6;
    const tripleTreeY = isCruiser ? 8.6 : 8.0;
    const tripleTreeX = isCruiser ? 6.2 : 5.8;

    [-1, 1].forEach(side => {
      // Lower Gold Fork Sliders
      const lowerFork = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, forkLength * 0.55, 16), goldForkMat);
      lowerFork.rotation.z = -forkAngle;
      lowerFork.position.set(frontWheelX - Math.sin(forkAngle) * (forkLength * 0.25), wheelCenterY + Math.cos(forkAngle) * (forkLength * 0.25), side * 1.05);
      group.add(lowerFork);

      // Upper Stanchions / Triple Trees
      const upperFork = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, forkLength * 0.50, 16), darkFrameMat);
      upperFork.rotation.z = -forkAngle;
      upperFork.position.set(tripleTreeX + Math.sin(forkAngle) * 0.8, tripleTreeY - Math.cos(forkAngle) * 0.8, side * 1.05);
      group.add(upperFork);
    });

    // Front Fender Hugger
    const fenderGeo = new THREE.CylinderGeometry(frontWheelRadius + 0.35, frontWheelRadius + 0.35, frontTireWidth * 1.15, 20, 1, true, -Math.PI * 0.35, Math.PI * 0.70);
    fenderGeo.rotateX(Math.PI / 2);
    const fender = new THREE.Mesh(fenderGeo, (isSupersport || isHyperbike) ? carbonMat : fairingMat);
    fender.position.set(frontWheelX, wheelCenterY, 0);
    group.add(fender);

    // Triple Tree Clamp & Handlebars
    const topClamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 2.8), darkFrameMat);
    topClamp.position.set(tripleTreeX, tripleTreeY, 0);
    group.add(topClamp);

    if (isCruiser) {
      // Photo 2: Wide Drag Bars with 4" Risers
      const barRiserL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 10), darkFrameMat);
      barRiserL.position.set(tripleTreeX + 0.2, tripleTreeY + 0.5, -0.65);
      group.add(barRiserL);
      const barRiserR = barRiserL.clone();
      barRiserR.position.z = 0.65;
      group.add(barRiserR);

      const dragBar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.8, 12), darkFrameMat);
      dragBar.rotation.x = Math.PI / 2;
      dragBar.position.set(tripleTreeX + 0.2, tripleTreeY + 0.95, 0);
      group.add(dragBar);

      // Round Under-Bar Cruiser Mirrors
      [-1, 1].forEach(side => {
        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.10, 14), darkFrameMat);
        mirror.rotation.z = Math.PI / 2;
        mirror.position.set(tripleTreeX + 0.3, tripleTreeY + 0.6, side * 2.05);
        group.add(mirror);
      });

    } else {
      // Clip-on Racing Bars
      [-1, 1].forEach(side => {
        const clipOn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.45, 10), darkFrameMat);
        clipOn.rotation.x = Math.PI / 2 + (side * 0.18);
        clipOn.rotation.z = -0.15;
        clipOn.position.set(tripleTreeX + 0.1, tripleTreeY - 0.1, side * 1.55);
        group.add(clipOn);
      });
    }

    // ---------------------------------------------------------------------------
    // 3. ENGINE & EXHAUST BY ARCHETYPE
    // ---------------------------------------------------------------------------
    if (isCruiser) {
      // Photo 2: Western Nightblade 114ci V-Twin Engine
      const crankCase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 2.2), darkFrameMat);
      crankCase.position.set(0.6, 4.2, 0);
      group.add(crankCase);

      const vAngles = [-0.38, 0.38];
      vAngles.forEach(va => {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.90, 2.2, 16), darkFrameMat);
        cyl.rotation.z = va;
        cyl.position.set(0.6 + Math.sin(va) * 1.5, 4.4 + Math.cos(va) * 1.5, 0);
        group.add(cyl);

        for (let f = -0.8; f <= 0.8; f += 0.32) {
          const fin = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.06, 16), chromeMat);
          fin.rotation.z = va;
          fin.position.set(cyl.position.x - Math.cos(va) * f, cyl.position.y + Math.sin(va) * f, 0);
          group.add(fin);
        }

        const pushrod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), chromeMat);
        pushrod.rotation.z = va;
        pushrod.position.set(cyl.position.x + 0.6, cyl.position.y, 1.05);
        group.add(pushrod);
      });

      // Air Cleaner Round Pod
      const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.45, 18), darkFrameMat);
      airCleaner.rotation.x = Math.PI / 2;
      airCleaner.position.set(0.6, 5.2, 1.25);
      group.add(airCleaner);

      // Low Swept Staggered Dual Black Slash-Cut Exhausts (Photo 2)
      [-0.45, 0.45].forEach((ey, idx) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 9.2, 16), darkFrameMat);
        pipe.rotation.z = Math.PI / 2 + 0.06;
        pipe.position.set(-2.8, 3.4 + ey * 0.7, 1.35 + idx * 0.12);
        group.add(pipe);
      });

    } else if (isCafeRacer) {
      // Photo 4: Horizontal Boxer-Twin Engine with Chrome Valve Covers
      const boxerCase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.0), darkFrameMat);
      boxerCase.position.set(0.6, 4.2, 0);
      group.add(boxerCase);

      [-1, 1].forEach(side => {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 16), darkFrameMat);
        cyl.rotation.x = Math.PI / 2;
        cyl.position.set(0.6, 4.4, side * 1.85);
        group.add(cyl);

        for (let f = -0.6; f <= 0.6; f += 0.28) {
          const fin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 16), darkFrameMat);
          fin.rotation.x = Math.PI / 2;
          fin.position.set(0.6, 4.4, side * 1.85 + f);
          group.add(fin);
        }

        const cover = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 0.35), chromeMat);
        cover.position.set(0.6, 4.4, side * 2.85);
        group.add(cover);
      });

      // Photo 4: Heat-Shield Wrapped Exhaust Headers & Brushed Black Reverse Cone Muffler
      const wrapMat = new THREE.MeshStandardMaterial({ map: getHeatWrapTexture(), roughness: 0.85 });
      const pipeLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 7.5, 14), wrapMat);
      pipeLeft.rotation.z = Math.PI / 2 + 0.12;
      pipeLeft.position.set(-2.4, 3.6, -1.25);
      group.add(pipeLeft);

      const muffler = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.8, 16), darkFrameMat);
      muffler.rotation.z = -Math.PI / 2 + 0.18;
      muffler.position.set(-6.8, 4.5, -1.45);
      group.add(muffler);

    } else if (isHyperbike) {
      // Photo 1: Suzuki Hayabusa Finned Radiator + DUAL Megaphone Titanium Canisters
      const radMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.8, 2.6), radiatorMat);
      radMesh.position.set(4.4, 4.6, 0);
      group.add(radMesh);

      [-1, 1].forEach(side => {
        // Massive Dual Titanium Exhaust Canisters (Left and Right)
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 6.8, 18), chromeMat);
        can.rotation.z = Math.PI / 2 + 0.24;
        can.position.set(-5.6, 4.9, side * 1.65);
        group.add(can);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.50, 0.8, 18), darkFrameMat);
        tip.rotation.z = Math.PI / 2 + 0.24;
        tip.position.set(-8.8, 5.7, side * 1.65);
        group.add(tip);
      });

    } else {
      // Inline-4 Cylinder Mechanical Core
      const engineCase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 2.4), darkFrameMat);
      engineCase.position.set(0.6, 4.4, 0);
      group.add(engineCase);

      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 2.4), radiatorMat);
      rad.position.set(4.2, 4.8, 0);
      group.add(rad);

      // 4 Chrome Header Pipes Merging into Single Upswept Muffler
      for (let i = 0; i < 4; i++) {
        const hz = -0.9 + i * 0.6;
        const header = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.8, 10), chromeMat);
        header.rotation.z = 0.32;
        header.position.set(3.4, 3.6, hz);
        group.add(header);
      }

      const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.36, 5.2, 16), (isSupersport ? carbonMat : chromeMat));
      muffler.rotation.z = Math.PI / 2 + 0.28;
      muffler.position.set(-5.2, 4.8, 1.45);
      group.add(muffler);
    }

    // ---------------------------------------------------------------------------
    // 4. BODYWORK, FAIRINGS, FUEL TANK & SADDLE
    // ---------------------------------------------------------------------------
    if (isCruiser) {
      // Photo 2: Crimson Teardrop Fuel Tank with Pinstripes
      const tankShape = new THREE.Shape();
      tankShape.moveTo(-1.2, 6.2);
      tankShape.quadraticCurveTo(0.4, 8.6, 2.6, 8.4);
      tankShape.quadraticCurveTo(4.4, 7.8, 4.8, 6.4);
      tankShape.lineTo(2.4, 5.4);
      tankShape.quadraticCurveTo(0.6, 5.8, -1.2, 6.2);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 2.1, bevelEnabled: true, bevelThickness: 0.38, bevelSize: 0.28, bevelSegments: 4 });
      tankGeo.translate(0, 0, -2.1 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      // Side Pinstripe Decal Panels
      [-1.06, 1.06].forEach(pz => {
        const stripePlane = new THREE.Mesh(
          new THREE.PlaneGeometry(3.6, 1.8),
          new THREE.MeshBasicMaterial({ map: getPinstripeTankTexture(palette.accent || 0xef4444), transparent: true, side: THREE.DoubleSide })
        );
        stripePlane.position.set(1.8, 7.2, pz);
        group.add(stripePlane);
      });

      // Front Round Cruiser Bullet Headlight
      const hlMesh = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), darkFrameMat);
      hlMesh.rotation.z = -Math.PI / 2;
      hlMesh.position.set(6.6, 7.5, 0);
      group.add(hlMesh);

      const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.68, 18), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlLens.rotation.y = Math.PI / 2;
      hlLens.position.set(7.1, 7.5, 0);
      group.add(hlLens);

    } else if (isSupersport) {
      // Photo 3: Yamaha R1M Candy Red Aerodynamic Fairings & Carbon Winglets
      const tankShape = new THREE.Shape();
      tankShape.moveTo(-1.2, 6.4);
      tankShape.quadraticCurveTo(0.2, 9.2, 2.6, 8.9);
      tankShape.quadraticCurveTo(4.2, 8.6, 4.8, 6.8);
      tankShape.lineTo(2.4, 5.6);
      tankShape.quadraticCurveTo(0.6, 6.0, -1.2, 6.4);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 1.95, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25, bevelSegments: 4 });
      tankGeo.translate(0, 0, -1.95 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      // Aggressive Front Nose Cowl with Smoked Bubble Screen
      const noseShape = new THREE.Shape();
      noseShape.moveTo(3.2, 6.4);
      noseShape.lineTo(6.8, 7.8);
      noseShape.lineTo(7.2, 7.4);
      noseShape.lineTo(5.8, 5.8);
      noseShape.lineTo(3.4, 4.8);
      noseShape.closePath();
      const noseGeo = new THREE.ExtrudeGeometry(noseShape, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.22, bevelSegments: 3 });
      noseGeo.translate(0, 0, -2.2 / 2);
      group.add(new THREE.Mesh(noseGeo, fairingMat));

      // Smoked Bubble Windscreen
      const screen = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.2, 16, 1, true, -Math.PI * 0.45, Math.PI * 0.90), smokedGlassMat);
      screen.rotation.z = -0.58;
      screen.position.set(6.2, 8.8, 0);
      group.add(screen);

      // Photo 3: Dual Carbon Fiber Aerodynamic Winglets
      [-1, 1].forEach(side => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.2), carbonMat);
        wing.rotation.x = side * 0.22;
        wing.rotation.z = -0.28;
        wing.position.set(6.2, 7.2, side * 1.55);
        group.add(wing);
      });

      // Twin Cat-Eye LED Projector Slits
      [-0.48, 0.48].forEach(hz => {
        const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        slit.rotation.y = Math.PI / 2;
        slit.position.set(7.22, 7.5, hz);
        group.add(slit);
      });

    } else if (isHyperbike) {
      // Photo 1: Suzuki Hayabusa Bulbous Aerodynamic Fairings with 3 Gill Vents
      const busaShape = new THREE.Shape();
      busaShape.moveTo(-1.6, 6.2);
      busaShape.quadraticCurveTo(0.2, 9.4, 2.8, 9.0);
      busaShape.quadraticCurveTo(5.2, 8.6, 6.4, 6.8);
      busaShape.quadraticCurveTo(4.8, 4.6, 1.8, 4.2);
      busaShape.lineTo(-1.6, 5.2);
      busaShape.closePath();
      const busaGeo = new THREE.ExtrudeGeometry(busaShape, { depth: 2.35, bevelEnabled: true, bevelThickness: 0.45, bevelSize: 0.35, bevelSegments: 4 });
      busaGeo.translate(0, 0, -2.35 / 2);
      group.add(new THREE.Mesh(busaGeo, fairingMat));

      // Triple Aero Gills
      [-1.19, 1.19].forEach(side => {
        for (let g = 0; g < 3; g++) {
          const gill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.12), darkFrameMat);
          gill.rotation.z = -0.32;
          gill.position.set(2.4 + g * 0.8, 5.6 - g * 0.35, side);
          group.add(gill);
        }
      });

      // Center Cyclops High-Beam Projector
      const hlCenter = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }));
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

      // Black Ribbed Knee Pads on Tank (Photo 4)
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

    // Tail License Plate
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
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8926d, roughness: 0.60, metalness: 0.04 });
    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: isCafeRacer ? 0.70 : 0.45, metalness: 0.15 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: sleeveColor, roughness: isCafeRacer ? 0.70 : 0.45, metalness: 0.15 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.80, metalness: 0.05 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: isCafeRacer ? 0x451a03 : 0x111827, roughness: 0.45 });

    // A. Continuous Smooth Torso (Pelvis -> Spine -> Muscular Broad Shoulders)
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

    // Speed Hump on Upper Back (Supersport / Hyperbike)
    if (isSupersport || isHyperbike) {
      const speedHump = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), torsoMat);
      speedHump.scale.set(1.4, 0.72, 0.85);
      speedHump.position.set(0.65, 10.45, 0);
      group.add(speedHump);
    }

    // Padded Collar Ring joining neck into torso
    const neckBase = isCruiser ? { x: 0.35, y: 11.75 } : (isSupersport ? { x: 1.75, y: 10.70 } : { x: 1.25, y: 11.70 });
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.12, 10, 20), torsoMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(neckBase.x, neckBase.y, 0);
    group.add(collar);

    // Neck (Short, natural forward inclination)
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.70, 18), skinMat);
    neckMesh.position.set(neckBase.x + 0.08, neckBase.y + 0.35, 0);
    group.add(neckMesh);

    // B. Anatomical 3D Head & Sculpted Human Face
    const headPos = isCruiser
      ? { x: 0.65, y: 12.80, z: 0 }
      : (isSupersport ? { x: 2.15, y: 11.85, z: 0 } : { x: 1.65, y: 12.85, z: 0 });
    const headRotZ = isCruiser ? -0.06 : (isSupersport ? -0.38 : -0.18);

    const headGroup = new THREE.Group();
    headGroup.position.set(headPos.x, headPos.y, headPos.z);
    headGroup.rotation.z = headRotZ;

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const darkIrisMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

    // Organic Head Cranium with High-Resolution Face Texture
    const faceMat = new THREE.MeshStandardMaterial({
      map: getRealisticFaceTexture(paletteIdx),
      roughness: 0.58,
      metalness: 0.04
    });
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 18), faceMat);
    headMesh.scale.set(0.96, 1.12, 0.94);
    headGroup.add(headMesh);

    // 3D Sculpted Nose protruding naturally forward
    const noseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 12), skinMat);
    noseMesh.rotation.z = -Math.PI / 2 + 0.12;
    noseMesh.position.set(0.78, -0.02, 0);
    headGroup.add(noseMesh);

    // 3D Brow Ridge
    const browMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.48), skinMat);
    browMesh.position.set(0.66, 0.18, 0);
    headGroup.add(browMesh);

    // 3D Chin
    const chinMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinMat);
    chinMesh.position.set(0.64, -0.34, 0);
    headGroup.add(chinMesh);

    // Motorcycle Helmets & Visors by Archetype
    if (isCruiser) {
      // Photo 2: Tactical Balaclava Mask exposing Eyes, Brow & Nose Bridge + Skull Cap
      const balaclavaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
      // Lower mask wrapping chin and jaw
      const lowerMask = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 14, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.45), balaclavaMat);
      lowerMask.position.set(0, -0.02, 0);
      headGroup.add(lowerMask);

      // Skull Cap
      const skullCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.86, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.30, metalness: 0.4 })
      );
      skullCap.position.set(0, 0.08, 0);
      headGroup.add(skullCap);

      // Aviator / Tactical Goggles rested on brow
      const goggleMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.8 });
      const goggleLens = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
      [-0.24, 0.24].forEach(gz => {
        const frame = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.05, 8, 16), goggleMat);
        frame.rotation.y = Math.PI / 2;
        frame.position.set(0.72, 0.28, gz);
        headGroup.add(frame);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 14), goggleLens);
        lens.rotation.y = Math.PI / 2;
        lens.position.set(0.74, 0.28, gz);
        headGroup.add(lens);
      });

    } else {
      const helmetColor = isCafeRacer ? 0x090d16 : (isSupersport ? palette.fairing : (outfitCfg.streetfighter ? 0x111827 : outfitCfg.helmetHex));
      const helmetMat = new THREE.MeshStandardMaterial({
        color: helmetColor,
        roughness: 0.20,
        metalness: isCafeRacer ? 0.35 : 0.60
      });

      // Helmet Crown (covers skull top above forehead)
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.44),
        helmetMat
      );
      crown.position.set(-0.04, 0.06, 0);
      headGroup.add(crown);

      // Rear Helmet Shell (protecting occiput and back of neck)
      const rearShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, -Math.PI * 0.65, Math.PI * 1.30, Math.PI * 0.40, Math.PI * 0.50),
        helmetMat
      );
      rearShell.position.set(-0.06, 0.04, 0);
      headGroup.add(rearShell);

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
          color: isHyperbike ? 0x94a3b8 : 0x0f172a,
          roughness: 0.05,
          metalness: isHyperbike ? 0.85 : 0.45,
          transparent: true,
          opacity: 0.48,
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
        raisedVisor.rotation.z = 0.55;
        raisedVisor.position.set(0.18, 0.44, 0);
        headGroup.add(raisedVisor);
      }
    }
    group.add(headGroup);

    // C. Continuous Muscular Arms & Organic Shoulder Deltoids
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

        // Shoulder Deltoid Cap
        const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), sleeveMat);
        deltoid.position.set(0.05, 11.10, side * 1.55);
        group.add(deltoid);

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

        const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), sleeveMat);
        deltoid.position.set(0.85, 11.20, side * 1.55);
        group.add(deltoid);
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

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(group);
    }
    return group;
  }

  window.createRealisticGTABike = createRealisticGTABike;
'''

with open("scratch/master_bike_code.js", "w", encoding="utf-8") as f:
    f.write(CODE)
print("SUCCESS: Wrote scratch/master_bike_code.js")
