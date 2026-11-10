// ---------------------------------------------------------------------------
  // Seamless GTA Motorcycle & Organic Multi-Outfit Rider Factory (Pure Three.js)
  // 5 GTA V Archetypes, 10 Automotive Palettes, Sculpted 3D Human Face & Multi-Outfits
  // ---------------------------------------------------------------------------
  const bikeTextureCache = {};

  // 1. High-Resolution Photorealistic Human Face Canvas Texture Generator
  // Natural skin tones with soft ambient occlusion, cheek blush & forehead lighting
  function getRealisticFaceTexture(toneIdx, eyeColorHex, beardStyle) {
    const tones = [
      { skin: '#dfad87', shadow: '#b57a52', blush: '#c76e63', highlight: '#fae3d2' }, // Light-Medium Warm
      { skin: '#c8926d', shadow: '#9e6745', blush: '#b05e54', highlight: '#e2b391' }, // Medium South Asian
      { skin: '#9e6a4b', shadow: '#77472b', blush: '#8f473d', highlight: '#ba8564' }, // Warm Deep Olive
      { skin: '#d29b74', shadow: '#a66e4a', blush: '#be6b5e', highlight: '#ebc09f' }  // Golden Amber Tan
    ];
    const t = tones[(toneIdx || 0) % tones.length];
    const bStyle = (beardStyle !== undefined) ? (Math.abs(beardStyle) % 4) : ((toneIdx || 0) % 4);
    const key = 'face_' + ((toneIdx || 0) % tones.length) + '_b' + bStyle;
    if (bikeTextureCache[key]) return bikeTextureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base Natural Skin
    ctx.fillStyle = t.skin;
    ctx.fillRect(0, 0, 512, 512);

    // Soft Ambient Facial Shading around temples, cheeks, and jawline
    const ambGrad = ctx.createRadialGradient(256, 256, 80, 256, 256, 250);
    ambGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    ambGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.0)');
    ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Forehead Soft Light Center
    const foreGrad = ctx.createRadialGradient(256, 120, 15, 256, 120, 110);
    foreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
    foreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = foreGrad;
    ctx.fillRect(150, 40, 212, 140);

    // Subtle Cheek Blush on both sides
    [-1, 1].forEach(side => {
      const bx = side === -1 ? 190 : 322;
      const blushGrad = ctx.createRadialGradient(bx, 280, 4, bx, 280, 50);
      blushGrad.addColorStop(0, 'rgba(180, 80, 70, 0.15)');
      blushGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = blushGrad;
      ctx.beginPath();
      ctx.arc(bx, 280, 50, 0, Math.PI * 2);
      ctx.fill();
    });

    // Jawline Contour Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.moveTo(160, 320);
    ctx.quadraticCurveTo(256, 440, 352, 320);
    ctx.quadraticCurveTo(365, 380, 256, 460);
    ctx.quadraticCurveTo(145, 380, 160, 320);
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
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UF82 ISK', 128, 66);
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
    const fairingColor = (vData && vData.customColor) ? vData.customColor : palette.fairing;

    const outfitIdx = (vData && vData.outfit !== undefined)
      ? (Math.abs(vData.outfit) % 4)
      : (isCruiser ? 0 : (isSupersport ? 1 : (isHyperbike ? 1 : (isCafeRacer ? 2 : Math.abs((appearanceSeed || 0) >> 2) % 4))));

    const OUTFIT_PRESETS = [
      {
        name: 'GTA Streetfighter',
        hoodieHex: 0x18181b,
        accentHex: 0xf8fafc,
        legHex: 0x27272a,
        shoeHex: 0x18181b,
        shoeAccentHex: 0xf8fafc,
        helmetHex: 0x111827,
        glovesHex: 0x18181b,
        torsoHex: 0x18181b,
        sleeveHex: 0x18181b,
        streetfighter: true
      },
      {
        name: 'GTA "R★" Varsity Rider',
        hoodieHex: 0x475569,
        accentHex: 0xf1f5f9,
        legHex: 0x1e293b,
        shoeHex: 0x580b18,
        shoeAccentHex: 0xf8fafc,
        helmetHex: 0x1e293b,
        glovesHex: 0x1e293b,
        torsoHex: 0x475569,
        sleeveHex: 0x475569,
        varsity: true
      },
      {
        name: 'GTA Scrambler',
        hoodieHex: 0x334138,
        accentHex: 0xd1d5db,
        legHex: 0x374151,
        shoeHex: 0xd97706,
        shoeAccentHex: 0xf8fafc,
        helmetHex: 0x090d16,
        glovesHex: 0x451a03,
        torsoHex: 0x334138,
        sleeveHex: 0x334138,
        cafe: true
      },
      {
        name: 'Dhaka Urban Rider',
        hoodieHex: 0x4c0519,
        accentHex: 0xffffff,
        legHex: 0x18181b,
        shoeHex: 0x991b1b,
        shoeAccentHex: 0xf8fafc,
        helmetHex: 0x1d4ed8,
        glovesHex: 0x18181b,
        torsoHex: 0x4c0519,
        sleeveHex: 0x4c0519,
        commuter: true
      }
    ];
    const outfitCfg = OUTFIT_PRESETS[outfitIdx];

    // Shared Materials
    const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.45 });
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
    // 1. WHEEL SPECIFICATIONS & BUILDER
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
        const discCenter = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius * 0.95, rimRadius * 0.95, tireWidth * 0.45, 24), darkFrameMat);
        discCenter.rotation.x = Math.PI / 2;
        wheelGroup.add(discCenter);
        for (let i = 0; i < 5; i++) {
          const slot = new THREE.Mesh(new THREE.BoxGeometry(rimRadius * 0.55, 0.45, tireWidth * 0.5), chromeMat);
          slot.rotation.z = (i / 5) * Math.PI;
          wheelGroup.add(slot);
        }
      } else if (isWireSpoke) {
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

    const frontWheelRadius = 3.25;
    const rearWheelRadius = isCruiser ? 3.10 : 3.25;
    const frontTireWidth = 1.25;
    const rearTireWidth = isCruiser ? 2.65 : (isHyperbike ? 1.95 : 1.65);

    const frontWheelX = isCruiser ? 9.8 : (isHyperbike ? 8.9 : 8.5);
    const rearWheelX = isCruiser ? -9.2 : -8.5;
    const wheelCenterY = 3.25;

    const isWireSpoke = isCafeRacer;
    const isFatDrag = isCruiser;

    // Front Wheel Assembly
    const wheelFront = buildHollowMotorcycleWheel(frontWheelRadius, frontTireWidth, false, isWireSpoke, false);
    wheelFront.position.set(frontWheelX, wheelCenterY, 0);
    group.add(wheelFront);
    const wPivot = wheelFront;
    group.userData.wheels.push(wPivot);

    // Rear Wheel Assembly
    const wheelRear = buildHollowMotorcycleWheel(rearWheelRadius, rearTireWidth, true, isWireSpoke, isFatDrag);
    wheelRear.position.set(rearWheelX, wheelCenterY, 0);
    group.add(wheelRear);
    group.userData.wheels.push(wheelRear);

    group.userData.wheelRadius = 3.25;

    // Brake Calipers (Mounted statically to fork bottoms and swingarm axle bracket)
    const caliperF = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.15, 0.55), caliperMat);
    caliperF.position.set(frontWheelX - 1.2, wheelCenterY + 1.2, frontTireWidth * 0.45);
    group.add(caliperF);

    const caliperR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.55), caliperMat);
    caliperR.position.set(rearWheelX + 1.1, wheelCenterY + 1.0, rearTireWidth * 0.42);
    group.add(caliperR);

    // ---------------------------------------------------------------------------
    // 2. CONNECTED STRUCTURAL SWINGARM & REAR MONO-SHOCK (Zero Disconnected Wheels!)
    // ---------------------------------------------------------------------------
    const swingarmPivotX = -1.4;
    const swingarmPivotY = 4.2;
    const swingarmDx = rearWheelX - swingarmPivotX;
    const swingarmDy = wheelCenterY - swingarmPivotY;
    const swingarmLen = Math.sqrt(swingarmDx * swingarmDx + swingarmDy * swingarmDy);
    const swingarmAngle = Math.atan2(swingarmDy, swingarmDx);

    // Heavy-duty Dual Aluminum Box-Section Swingarm Spars
    [-1, 1].forEach(side => {
      const armZ = side * (rearTireWidth * 0.48 + 0.22);
      const armSpar = new THREE.Mesh(new THREE.BoxGeometry(swingarmLen, 0.72, 0.38), darkFrameMat);
      armSpar.position.set(swingarmPivotX + swingarmDx * 0.5, swingarmPivotY + swingarmDy * 0.5, armZ);
      armSpar.rotation.z = swingarmAngle;
      group.add(armSpar);

      // Billet Axle Adjustment Blocks at Rear Dropouts
      const axleBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.42), chromeMat);
      axleBlock.position.set(rearWheelX, wheelCenterY, armZ);
      group.add(axleBlock);
    });

    // Swingarm Transverse Cross-Member & Frame Pivot Gusset
    const swingCross = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, rearTireWidth * 1.15), darkFrameMat);
    swingCross.position.set(swingarmPivotX - 0.5, swingarmPivotY + 0.1, 0);
    group.add(swingCross);

    // Rear Mono-Shock Suspension (Coil Spring & Damper Unit)
    const shockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 14), chromeMat);
    shockBody.rotation.z = 0.58;
    shockBody.position.set(-2.2, 5.2, 0);
    group.add(shockBody);

    const springMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.6 });
    for (let c = -0.7; c <= 0.7; c += 0.28) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 8, 18), springMat);
      coil.rotation.z = 0.58;
      coil.position.set(-2.2 - Math.sin(0.58) * c, 5.2 + Math.cos(0.58) * c, 0);
      group.add(coil);
    }

    // Drive Chain & Rear Wheel Sprocket (Left Side)
    const sprocket = new THREE.Mesh(new THREE.CircleGeometry(1.55, 24), darkFrameMat);
    sprocket.position.set(rearWheelX, wheelCenterY, -rearTireWidth * 0.46);
    group.add(sprocket);

    const chainTop = new THREE.Mesh(new THREE.BoxGeometry(swingarmLen * 0.95, 0.18, 0.14), chromeMat);
    chainTop.rotation.z = swingarmAngle;
    chainTop.position.set(swingarmPivotX + swingarmDx * 0.5, swingarmPivotY + swingarmDy * 0.5 + 0.55, -rearTireWidth * 0.46);
    group.add(chainTop);

    const chainBottom = new THREE.Mesh(new THREE.BoxGeometry(swingarmLen * 0.95, 0.18, 0.14), chromeMat);
    chainBottom.rotation.z = swingarmAngle;
    chainBottom.position.set(swingarmPivotX + swingarmDx * 0.5, swingarmPivotY + swingarmDy * 0.5 - 0.55, -rearTireWidth * 0.46);
    group.add(chainBottom);

    // ---------------------------------------------------------------------------
    // Helper: Solid Articulated Bone Generator (Zero Frenet Inversion or Torsion Singularities!)
    // ---------------------------------------------------------------------------
    function createBoneSegment(p0, p1, r0, r1, material) {
      const v0 = new THREE.Vector3(p0[0], p0[1], p0[2]);
      const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
      const dir = new THREE.Vector3().subVectors(v1, v0);
      const len = dir.length();
      if (len < 0.001) return new THREE.Group();
      const mid = new THREE.Vector3().addVectors(v0, v1).multiplyScalar(0.5);

      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 16), material);
      cyl.position.copy(mid);

      const unitY = new THREE.Vector3(0, 1, 0);
      cyl.quaternion.setFromUnitVectors(unitY, dir.clone().normalize());
      return cyl;
    }

    // ---------------------------------------------------------------------------
    // 3. FRONT FORKS & INTEGRATED STEERING HEADSTOCK (Zero Disconnected Forks!)
    // ---------------------------------------------------------------------------
    const tripleTreeX = isCruiser ? 6.2 : (isHyperbike ? 5.9 : 5.8);
    const tripleTreeY = isCruiser ? 8.6 : (isHyperbike ? 8.1 : 8.0);
    const forkOffsetZ = 1.05;

    // Mathematical colinear line from wheel axle to top clamp
    const forkDx = tripleTreeX - frontWheelX;
    const forkDy = tripleTreeY - wheelCenterY;
    const totalForkLength = Math.hypot(forkDx, forkDy);
    const forkRakeAngle = Math.atan2(-forkDx, forkDy);
    const forkDirX = forkDx / totalForkLength;
    const forkDirY = forkDy / totalForkLength;

    // Steering Headstock Tube (Structural frame junction)
    const headstock = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.6, 16), darkFrameMat);
    headstock.position.set(tripleTreeX - forkDirX * 0.7, tripleTreeY - forkDirY * 0.7, 0);
    headstock.rotation.z = forkRakeAngle;
    group.add(headstock);

    // Lower & Upper Triple Clamps bridging forks to headstock
    const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 2.75), darkFrameMat);
    lowerClamp.position.set(tripleTreeX - forkDirX * 1.15, tripleTreeY - forkDirY * 1.15, 0);
    lowerClamp.rotation.z = forkRakeAngle;
    group.add(lowerClamp);

    const topClamp = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.38, 2.75), darkFrameMat);
    topClamp.position.set(tripleTreeX, tripleTreeY, 0);
    topClamp.rotation.z = forkRakeAngle;
    group.add(topClamp);

    // Continuous Inverted USD Fork Legs (Seamless overlap, ZERO overshoot, ZERO disconnection!)
    const lenUpper = totalForkLength * 0.58;
    const lenLower = totalForkLength * 0.58;
    const upperMidX = tripleTreeX - forkDirX * (lenUpper * 0.5);
    const upperMidY = tripleTreeY - forkDirY * (lenUpper * 0.5);
    const lowerMidX = frontWheelX + forkDirX * (lenLower * 0.5);
    const lowerMidY = wheelCenterY + forkDirY * (lenLower * 0.5);

    [-1, 1].forEach(side => {
      const fz = side * forkOffsetZ;

      // Lower Inner Chrome Sliders (connected to wheel axle)
      const lowerFork = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, lenLower, 16), chromeMat);
      lowerFork.position.set(lowerMidX, lowerMidY, fz);
      lowerFork.rotation.z = forkRakeAngle;
      group.add(lowerFork);

      // Upper Outer Stanchions (gold or dark, clamping to triple clamps)
      const upperFork = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, lenUpper, 16), goldForkMat);
      upperFork.position.set(upperMidX, upperMidY, fz);
      upperFork.rotation.z = forkRakeAngle;
      group.add(upperFork);

      // Billet Axle Clamps clamping around wheel axle & slider
      const axleClamp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.42), darkFrameMat);
      axleClamp.position.set(frontWheelX, wheelCenterY, fz);
      group.add(axleClamp);
    });

    // Front Fender
    const fenderGeo = new THREE.CylinderGeometry(frontWheelRadius + 0.35, frontWheelRadius + 0.35, frontTireWidth * 1.15, 20, 1, true, -Math.PI * 0.35, Math.PI * 0.70);
    fenderGeo.rotateX(Math.PI / 2);
    const fender = new THREE.Mesh(fenderGeo, (isSupersport || isHyperbike) ? carbonMat : fairingMat);
    fender.position.set(frontWheelX, wheelCenterY, 0);
    group.add(fender);

    // ---------------------------------------------------------------------------
    // 4. MAIN TWIN-SPAR PERIMETER FRAME (Connecting Steering Head to Swingarm Pivot!)
    // ---------------------------------------------------------------------------
    [-1, 1].forEach(side => {
      const frameSpar = createSeamlessLoftedLimb([
        { p: [tripleTreeX - 0.4, tripleTreeY - 0.45, side * 1.25], rx: 0.45, ry: 0.75 },
        { p: [2.6, 5.9, side * 1.35], rx: 0.55, ry: 0.85 },
        { p: [0.6, 5.2, side * 1.35], rx: 0.60, ry: 0.85 },
        { p: [swingarmPivotX, swingarmPivotY, side * 1.25], rx: 0.65, ry: 0.90 }
      ], 14, 16, darkFrameMat);
      group.add(frameSpar);
    });

    // Handlebars & Grips (Mounted to Upper Triple Clamp with ZERO duplicate smokestacks!)
    let leftGripPos, rightGripPos;
    if (isCruiser) {
      // Wide Drag Bars with Low Billet Risers (height 0.45, NOT 4.2 units!)
      [-0.65, 0.65].forEach(rz => {
        const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 10), darkFrameMat);
        riser.position.set(tripleTreeX - 0.05, tripleTreeY + 0.22, rz);
        group.add(riser);
      });
      const dragBar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.2, 14), chromeMat);
      dragBar.rotation.x = Math.PI / 2;
      dragBar.position.set(tripleTreeX - 0.05, tripleTreeY + 0.45, 0);
      group.add(dragBar);

      leftGripPos = [tripleTreeX - 0.05, tripleTreeY + 0.45, -1.95];
      rightGripPos = [tripleTreeX - 0.05, tripleTreeY + 0.45, 1.95];

      // Round Under-Bar Mirrors
      [-1, 1].forEach(side => {
        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.08, 14), darkFrameMat);
        mirror.rotation.z = Math.PI / 2;
        mirror.position.set(tripleTreeX, tripleTreeY + 0.25, side * 2.15);
        group.add(mirror);
      });
    } else {
      // Clip-on Racing Handlebars directly clamped to fork tubes below top clamp
      [-1, 1].forEach(side => {
        const clipOn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.45, 12), darkFrameMat);
        clipOn.rotation.x = Math.PI / 2 + (side * 0.15);
        clipOn.rotation.z = -0.14;
        clipOn.position.set(tripleTreeX - 0.12, tripleTreeY - 0.15, side * 1.55);
        group.add(clipOn);
      });
      leftGripPos = [tripleTreeX - 0.18, tripleTreeY - 0.18, -1.75];
      rightGripPos = [tripleTreeX - 0.18, tripleTreeY - 0.18, 1.75];
    }

    // ---------------------------------------------------------------------------
    // 5. ENGINE & FULLY CONNECTED EXHAUST SYSTEM
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

      // Low Swept Staggered Dual Black Slash-Cut Exhausts connecting to engine cylinders!
      [-0.45, 0.45].forEach((ey, idx) => {
        // Front header from cylinder down
        const header = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 2.6, 12), darkFrameMat);
        header.rotation.z = 0.45;
        header.position.set(1.4, 4.2 + ey * 0.4, 1.30 + idx * 0.12);
        group.add(header);

        // Main pipe running back along swingarm
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 8.2, 16), darkFrameMat);
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

      // Heat-Shield Wrapped Exhaust Headers & Reverse Cone Muffler (Connected!)
      const wrapMat = new THREE.MeshStandardMaterial({ map: getHeatWrapTexture(), roughness: 0.85 });
      const headerL = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.0, 12), wrapMat);
      headerL.rotation.z = 0.55;
      headerL.position.set(1.8, 3.8, -1.25);
      group.add(headerL);

      const pipeLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 6.2, 14), wrapMat);
      pipeLeft.rotation.z = Math.PI / 2 + 0.12;
      pipeLeft.position.set(-2.4, 3.5, -1.25);
      group.add(pipeLeft);

      const muffler = new THREE.Mesh(new THREE.ConeGeometry(0.55, 3.6, 16), darkFrameMat);
      muffler.rotation.z = -Math.PI / 2 + 0.18;
      muffler.position.set(-6.2, 4.2, -1.35);
      group.add(muffler);

    } else if (isHyperbike) {
      // Photo 1: Suzuki Hayabusa Finned Radiator + DUAL Megaphone Titanium Canisters
      const radMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.8, 2.6), radiatorMat);
      radMesh.position.set(4.4, 4.6, 0);
      group.add(radMesh);

      [-1, 1].forEach(side => {
        const header = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.6, 12), chromeMat);
        header.rotation.z = 0.45;
        header.position.set(2.2, 3.6, side * 1.25);
        group.add(header);

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
      // Inline-4 Engine Core
      const engineCase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 2.4), darkFrameMat);
      engineCase.position.set(0.6, 4.4, 0);
      group.add(engineCase);

      const rad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 2.4), radiatorMat);
      rad.position.set(4.2, 4.8, 0);
      group.add(rad);

      // 4 Chrome Header Pipes sweeping tightly from engine to collector
      for (let i = 0; i < 4; i++) {
        const hz = -0.85 + i * 0.57;
        const header = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 10), chromeMat);
        header.rotation.z = 0.58;
        header.position.set(2.4, 4.2, hz);
        group.add(header);
      }

      // Under-Engine Collector Pipe (Bridging headers to mid-pipe!)
      const collector = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 3.4, 14), chromeMat);
      collector.rotation.z = Math.PI / 2;
      collector.position.set(0.8, 3.0, 0.45);
      group.add(collector);

      // Mid-Pipe curving up-back to muffler inlet
      const midPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 2.8, 14), chromeMat);
      midPipe.rotation.z = Math.PI / 2 + 0.32;
      midPipe.position.set(-1.8, 3.6, 1.25);
      group.add(midPipe);

      // Exhaust Muffler (Connected directly to mid-pipe!)
      const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 4.8, 16), (isSupersport ? carbonMat : chromeMat));
      muffler.rotation.z = Math.PI / 2 + 0.28;
      muffler.position.set(-5.0, 4.8, 1.45);
      group.add(muffler);

      // Muffler Mounting Hanger Bracket to Subframe
      const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.25), darkFrameMat);
      hanger.position.set(-4.5, 5.6, 1.45);
      group.add(hanger);
    }

    // ---------------------------------------------------------------------------
    // 6. BODYWORK, FAIRINGS, FUEL TANK & SADDLE
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

      // Aggressive Front Nose Cowl with Smoked Bubble Screen (Bridging seamlessly to headstock)
      const noseShape = new THREE.Shape();
      noseShape.moveTo(2.6, 6.4);
      noseShape.lineTo(6.8, 7.8);
      noseShape.lineTo(7.2, 7.4);
      noseShape.lineTo(5.8, 5.8);
      noseShape.lineTo(2.6, 5.2);
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

      [-1.19, 1.19].forEach(side => {
        for (let g = 0; g < 3; g++) {
          const gill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.12), darkFrameMat);
          gill.rotation.z = -0.32;
          gill.position.set(2.4 + g * 0.8, 5.6 - g * 0.35, side);
          group.add(gill);
        }
      });

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

    // Saddle & Subframe
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

    // Tail Cowl
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

    // ---------------------------------------------------------------------------
    // 7. TAIL TIDY & PERFECTLY CENTERED LICENSE PLATE (Z = 0, LEVEL HORIZONTALLY)
    // ---------------------------------------------------------------------------
    // Integrated Rear Red LED Brake Light Strip
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 1.45), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
    tailLight.position.set(-7.35, isSupersport ? 8.25 : 7.45, 0);
    group.add(tailLight);

    // Structural Matte Black Tail-Tidy Fender Bracket
    const tailTidy = new THREE.Group();
    tailTidy.position.set(-7.2, isSupersport ? 8.0 : 7.2, 0);

    const bracketArm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.12, 0.38), darkFrameMat);
    bracketArm.rotation.z = 0.55;
    bracketArm.position.set(-0.35, -0.45, 0);
    tailTidy.add(bracketArm);

    // Number Plate Backing Frame (Centered at Z = 0)
    const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 0.08), darkFrameMat);
    plateFrame.position.set(-0.72, -0.85, 0);
    plateFrame.rotation.order = 'YXZ';
    plateFrame.rotation.y = -Math.PI / 2;
    plateFrame.rotation.x = -0.22; // Upward tilt, 0 sideways roll!
    tailTidy.add(plateFrame);

    // Number Plate Mesh (Centered at Z = 0, Mounted directly onto plateFrame face)
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.85),
      new THREE.MeshBasicMaterial({ map: getBikeLicensePlateTexture(), side: THREE.DoubleSide })
    );
    plateMesh.position.set(0, 0, 0.045);
    plateFrame.add(plateMesh);

    // Plate Illumination Lamp Pod
    const plateLamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.32), darkFrameMat);
    plateLamp.position.set(-0.65, -0.35, 0);
    tailTidy.add(plateLamp);

    // Rear Mini LED Turn Signal Stalks (Left & Right, perfectly symmetrical)
    [-1, 1].forEach(side => {
      const indicator = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 8), darkFrameMat);
      indicator.rotation.x = Math.PI / 2;
      indicator.position.set(-0.62, -0.65, side * 0.95);
      tailTidy.add(indicator);

      const indLens = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      indLens.position.set(-0.62, -0.65, side * 1.25);
      tailTidy.add(indLens);
    });

    group.add(tailTidy);

    // ---------------------------------------------------------------------------
    // 8. CONTINUOUS SOLID CLOTHED HUMAN RIDER (ZERO HOLES, ORGANIC LOFTS & CLASSY STREETWEAR)
    // ---------------------------------------------------------------------------
    const hoodieColor = (outfitCfg.hoodieHex !== undefined) ? outfitCfg.hoodieHex : outfitCfg.torsoHex;
    const pantsColor = outfitCfg.legHex;
    const shoePrimaryColor = outfitCfg.shoeHex || 0x18181b;
    const shoeAccentColor = outfitCfg.shoeAccentHex || 0xf8fafc;
    const glovesColor = outfitCfg.glovesHex || 0x18181b;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8926d, roughness: 0.60, metalness: 0.04 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x140a04, roughness: 0.85, metalness: 0.05 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0xb35d53, roughness: 0.45, metalness: 0.05 });
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: hoodieColor,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
    const ribbedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hoodieColor).multiplyScalar(0.74),
      roughness: 0.90,
      metalness: 0.01,
      side: THREE.DoubleSide
    });
    const drawstringMat = new THREE.MeshStandardMaterial({
      color: outfitCfg.accentHex || 0xf1f5f9,
      roughness: 0.60,
      metalness: 0.05
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: pantsColor,
      roughness: 0.82,
      metalness: 0.04,
      side: THREE.DoubleSide
    });
    const darkPocketMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(pantsColor).multiplyScalar(0.80),
      roughness: 0.88,
      metalness: 0.02
    });
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoePrimaryColor, roughness: 0.45, metalness: 0.05 });
    const shoeAccentMat = new THREE.MeshStandardMaterial({ color: shoeAccentColor, roughness: 0.35, metalness: 0.05 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55, metalness: 0.02 });
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.05 });
    const glovesMat = new THREE.MeshStandardMaterial({ color: glovesColor, roughness: 0.55, metalness: 0.10 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 });

    // A. SOLID WATERTIGHT TORSO & NECK (Continuous from saddle straight into helmet: ZERO HOLES!)
    let riderTorso;
    let shoulderPos;
    let headPosition;

    if (isCruiser) {
      // Upright Cruiser Posture (Photo 2)
      headPosition = [0.65, 12.35, 0];
      shoulderPos = { x: 0.10, y: 11.00, z: 1.85 };
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.60, 6.90, 0], rx: 1.15, ry: 1.45 },
        { p: [-1.20, 8.20, 0], rx: 1.25, ry: 1.65 },
        { p: [-0.60, 9.70, 0], rx: 1.35, ry: 1.95 },
        { p: [0.10, 11.00, 0], rx: 1.30, ry: 2.10 },
        { p: [0.35, 11.60, 0], rx: 1.05, ry: 1.55 },
        { p: [0.55, 12.00, 0], rx: 0.75, ry: 0.95 },
        { p: [0.65, 12.35, 0], rx: 0.65, ry: 0.75 }
      ], 16, 24, hoodieMat);

    } else if (isSupersport) {
      // Aggressive Racing Tuck (Photo 3)
      headPosition = [3.35, 10.15, 0];
      shoulderPos = { x: 2.30, y: 9.35, z: 1.85 };
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.50, 6.95, 0], rx: 1.10, ry: 1.40 },
        { p: [-0.40, 7.95, 0], rx: 1.20, ry: 1.65 },
        { p: [1.10, 8.95, 0], rx: 1.30, ry: 1.95 },
        { p: [2.30, 9.35, 0], rx: 1.25, ry: 2.10 },
        { p: [2.80, 9.65, 0], rx: 1.00, ry: 1.50 },
        { p: [3.10, 9.90, 0], rx: 0.72, ry: 0.90 },
        { p: [3.35, 10.15, 0], rx: 0.65, ry: 0.75 }
      ], 16, 24, hoodieMat);

    } else {
      // Standard Sport Riding Tuck (Streetfighter, Cafe Racer & Hyperbike)
      headPosition = [2.25, 11.25, 0];
      shoulderPos = { x: 1.35, y: 10.25, z: 1.85 };
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.50, 6.90, 0], rx: 1.10, ry: 1.40 },
        { p: [-0.70, 8.10, 0], rx: 1.20, ry: 1.65 },
        { p: [0.35, 9.40, 0], rx: 1.30, ry: 1.95 },
        { p: [1.35, 10.25, 0], rx: 1.25, ry: 2.10 },
        { p: [1.80, 10.65, 0], rx: 1.00, ry: 1.50 },
        { p: [2.05, 10.95, 0], rx: 0.72, ry: 0.90 },
        { p: [2.25, 11.25, 0], rx: 0.65, ry: 0.75 }
      ], 16, 24, hoodieMat);
    }
    group.add(riderTorso);

    // Solid Internal Neck Core bridging chest to head (Short & sealed inside collar)
    const solidNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.55, 16), skinMat);
    solidNeck.position.set(headPosition[0] - 0.12, headPosition[1] - 0.45, 0);
    solidNeck.rotation.z = isSupersport ? -0.45 : (isCruiser ? -0.15 : -0.28);
    group.add(solidNeck);

    // Hoodie High Collar Rim (Encircles neck base, completely sealing chest)
    const collarRim = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 0.30, 18), ribbedMat);
    collarRim.position.set(headPosition[0] - 0.18, headPosition[1] - 0.58, 0);
    collarRim.rotation.z = isSupersport ? -0.45 : (isCruiser ? -0.15 : -0.28);
    group.add(collarRim);

    // Solid Contoured Hood Fold on Upper Back (NO TORUS, ZERO HOLES!)
    const hoodFold = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 14), hoodieMat);
    hoodFold.scale.set(0.95, 0.65, 1.30);
    hoodFold.position.set(shoulderPos.x - 0.60, shoulderPos.y - 0.05, 0);
    hoodFold.rotation.z = isSupersport ? -0.45 : (isCruiser ? -0.15 : -0.28);
    group.add(hoodFold);

    // Hanging Streetwear Drawstrings with Silver Metal Aglets
    [-1, 1].forEach(side => {
      const stringX = shoulderPos.x + 0.45;
      const stringY = shoulderPos.y - 0.35;
      const stringZ = side * 0.42;

      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.15, 8), drawstringMat);
      cord.position.set(stringX, stringY, stringZ);
      cord.rotation.z = isSupersport ? -0.35 : -0.15;
      group.add(cord);

      const aglet = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 8), chromeMat);
      aglet.position.set(stringX - 0.05, stringY - 0.62, stringZ);
      aglet.rotation.z = isSupersport ? -0.35 : -0.15;
      group.add(aglet);
    });

    // Varsity "R*" Back Emblem Decal
    if (outfitCfg.varsity) {
      const backEmblem = new THREE.Mesh(
        new THREE.PlaneGeometry(1.65, 1.65),
        new THREE.MeshBasicMaterial({ map: getVarsityBackTexture(hoodieColor), transparent: true, side: THREE.DoubleSide })
      );
      backEmblem.rotation.order = 'YXZ';
      backEmblem.rotation.y = -Math.PI / 2;
      backEmblem.rotation.x = isSupersport ? 0.35 : 0.22;
      backEmblem.position.set(shoulderPos.x - 1.05, shoulderPos.y - 0.70, 0);
      group.add(backEmblem);
    }

    // B. ANATOMICAL HEAD & DIVERSE 3D FACIAL STRUCTURES
    // 4 Distinct Styles: 0: Clean-Shaven, 1: Designer Stubble, 2: Full Biker Beard, 3: Sculpted Goatee
    const headGroup = new THREE.Group();
    headGroup.position.set(headPosition[0], headPosition[1], headPosition[2]);

    const beardStyleIdx = outfitIdx % 4;

    // Anatomical Head Sphere (radius 0.82)
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 20, 18),
      new THREE.MeshStandardMaterial({
        map: getRealisticFaceTexture(paletteIdx, palette.accent, beardStyleIdx),
        roughness: 0.58,
        metalness: 0.05
      })
    );
    headMesh.rotation.y = -Math.PI / 2;
    headGroup.add(headMesh);

    // Realistic Almond-Shaped 3D Eyes (White Sclera + Dark Iris Pupil)
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const darkIrisMat = new THREE.MeshBasicMaterial({ color: 0x1e1510 });
    [-0.22, 0.22].forEach(ez => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), eyeWhiteMat);
      eyeWhite.position.set(0.68, 0.12, ez);
      headGroup.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), darkIrisMat);
      pupil.position.set(0.76, 0.12, ez);
      headGroup.add(pupil);

      // Upper Eyelid Crease
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8), hairMat);
      lid.rotation.x = Math.PI / 2;
      lid.position.set(0.71, 0.22, ez);
      headGroup.add(lid);
    });

    // 3D Contoured Eyebrows
    [-0.22, 0.22].forEach(ez => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.22), hairMat);
      brow.position.set(0.67, 0.26, ez);
      brow.rotation.y = (ez < 0 ? -0.15 : 0.15);
      headGroup.add(brow);
    });

    // 3D Sculpted Nose (Bridge, Tip, Nostrils)
    const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 12), skinMat);
    noseBridge.rotation.z = -Math.PI / 2 + 0.14;
    noseBridge.position.set(0.79, -0.02, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skinMat);
    noseTip.position.set(0.83, -0.05, 0);
    headGroup.add(noseTip);

    // Natural Sculpted Lips
    const upperLip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), lipMat);
    upperLip.rotation.x = Math.PI / 2;
    upperLip.position.set(0.78, -0.22, 0);
    headGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.20, 10), lipMat);
    lowerLip.rotation.x = Math.PI / 2;
    lowerLip.position.set(0.76, -0.27, 0);
    headGroup.add(lowerLip);

    // Sculpted Chin & Jaw
    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skinMat);
    chin.position.set(0.68, -0.36, 0);
    headGroup.add(chin);

    // 3D Contoured Ears on both sides
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skinMat);
      ear.scale.set(0.8, 1.3, 0.4);
      ear.position.set(0.06, 0.02, side * 0.78);
      headGroup.add(ear);
    });

    // DIVERSE 3D FACIAL HAIR ARCHETYPES
    if (beardStyleIdx === 0) {
      // Style 0: 100% Clean-Shaven (Smooth chiseled jaw, zero beard/mustache)
      // Chin cleft highlight
      const cleft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.02), skinMat);
      cleft.position.set(0.78, -0.36, 0);
      headGroup.add(cleft);

    } else if (beardStyleIdx === 1) {
      // Style 1: Designer 5 O'Clock Stubble (Subtle dark stubble chin & jaw accent)
      const stubbleMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.90, transparent: true, opacity: 0.45 });
      const stubbleChin = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), stubbleMat);
      stubbleChin.position.set(0.69, -0.36, 0);
      headGroup.add(stubbleChin);

    } else if (beardStyleIdx === 2) {
      // Style 2: Full Groomed Biker Beard & Connected Mustache
      const beardMat = new THREE.MeshStandardMaterial({ color: 0x140a04, roughness: 0.85 });
      
      // Full Chin Beard
      const chinBeard = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), beardMat);
      chinBeard.scale.set(1.15, 1.25, 1.45);
      chinBeard.position.set(0.68, -0.38, 0);
      headGroup.add(chinBeard);

      // Connected Mustache arching over upper lip
      const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 12), beardMat);
      stache.rotation.x = Math.PI / 2;
      stache.position.set(0.80, -0.19, 0);
      headGroup.add(stache);

// Jawline beard blends naturally from chin to ears

    } else {
      // Style 3: Sculpted Goatee & Stylized Mustache (Clean Cheeks)
      const goateeMat = new THREE.MeshStandardMaterial({ color: 0x180d05, roughness: 0.85 });
      
      const goatee = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), goateeMat);
      goatee.scale.set(1.1, 1.2, 0.9);
      goatee.position.set(0.72, -0.36, 0);
      headGroup.add(goatee);

      const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12), goateeMat);
      stache.rotation.x = Math.PI / 2;
      stache.position.set(0.79, -0.19, 0);
      headGroup.add(stache);
    }

    // CLEAN HELMET FRAMING (NO BLACK BAR ACROSS MOUTH, NO CHINBAR CUTTING NOSE!)
    if (isCruiser) {
      // Cruiser Sleek Half-Shell Skull-Cap & Raised Aviator Goggles
      const skullCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.86, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.44),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.30, metalness: 0.40 })
      );
      skullCap.position.set(0, 0.08, 0);
      headGroup.add(skullCap);

      const goggleMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.20, metalness: 0.85 });
      const goggleLens = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.10, metalness: 0.90 });
      [-0.24, 0.24].forEach(gz => {
        const frame = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.05, 8, 16), goggleMat);
        frame.rotation.y = Math.PI / 2;
        frame.position.set(0.70, 0.32, gz);
        headGroup.add(frame);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 14), goggleLens);
        lens.rotation.y = Math.PI / 2;
        lens.position.set(0.72, 0.32, gz);
        headGroup.add(lens);
      });

    } else {
      // Motorcycle Helmet with Raised Polycarbonate Visor
      const helmetColor = isCafeRacer ? 0x090d16 : (isSupersport ? palette.fairing : (outfitCfg.streetfighter ? 0x111827 : outfitCfg.helmetHex));
      const helmetMat = new THREE.MeshStandardMaterial({
        color: helmetColor,
        roughness: 0.20,
        metalness: isCafeRacer ? 0.35 : 0.60
      });

      // Helmet Dome (Crown)
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.44),
        helmetMat
      );
      crown.position.set(-0.04, 0.06, 0);
      headGroup.add(crown);

      // Rear Skull Shell
      const rearShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, -Math.PI * 0.65, Math.PI * 1.30, Math.PI * 0.40, Math.PI * 0.50),
        helmetMat
      );
      rearShell.position.set(-0.06, 0.04, 0);
      headGroup.add(rearShell);

      if (isCafeRacer) {
        // Transparent Yellow Bubble Shield
        const bubbleMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          roughness: 0.06,
          metalness: 0.25,
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const bubbleShield = new THREE.Mesh(
          new THREE.SphereGeometry(0.92, 24, 18, -Math.PI * 0.26, Math.PI * 0.52, Math.PI * 0.15, Math.PI * 0.65),
          bubbleMat
        );
        bubbleShield.position.set(0.12, 0.02, 0);
        headGroup.add(bubbleShield);

      } else {
        // Raised Polycarbonate Visor flipped up cleanly above brow
        const raisedVisorMat = new THREE.MeshStandardMaterial({
          color: 0x090d16,
          roughness: 0.05,
          metalness: 0.40,
          transparent: true,
          opacity: 0.42,
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

        // Chrome Visor Pivot Screws on sides
        [-1, 1].forEach(side => {
          const pivotScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), chromeMat);
          pivotScrew.rotation.x = Math.PI / 2;
          pivotScrew.position.set(0.08, 0.22, side * 0.89);
          headGroup.add(pivotScrew);
        });
      }
    }
    group.add(headGroup);

    // C. ROBUST SOLID CLOTH SLEEVES & HANDS (ZERO TWISTING, ZERO HOLES!)
    [-1, 1].forEach(side => {
      const gripTarget = side === -1 ? leftGripPos : rightGripPos;
      const shX = shoulderPos.x;
      const shY = shoulderPos.y;
      const shZ = side * shoulderPos.z;

      // Athletic Flared Elbow Position
      let elbowPos;
      if (isCruiser) {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.44, shY - 0.90, side * 2.45];
      } else if (isSupersport) {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.48, shY - 1.20, side * 2.42];
      } else {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.46, shY - 1.05, side * 2.45];
      }

      const wristPos = [
        gripTarget[0] - 0.22,
        gripTarget[1] - 0.08,
        gripTarget[2] - side * 0.08
      ];

      // Dropped Shoulder Sleeve Cap (Blends torso to upper sleeve seamlessly)
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.76, 16, 14), hoodieMat);
      shoulderCap.scale.set(1.10, 0.95, 1.05);
      shoulderCap.position.set(shX, shY, shZ);
      group.add(shoulderCap);

      // Upper Arm Fabric Sleeve (Capped cylinder, never twists or inverts!)
      group.add(createBoneSegment([shX, shY, shZ], elbowPos, 0.74, 0.62, hoodieMat));

      // Elbow Cloth Fold (Smooth rounded spherical sleeve fold)
      const elbowFold = new THREE.Mesh(new THREE.SphereGeometry(0.63, 16, 14), hoodieMat);
      elbowFold.position.set(elbowPos[0], elbowPos[1], elbowPos[2]);
      group.add(elbowFold);

      // Forearm Fabric Sleeve (Elbow -> Wrist)
      group.add(createBoneSegment(elbowPos, wristPos, 0.62, 0.48, hoodieMat));

      // Ribbed Knit Wrist Cuff clamping onto wrist
      const cuffDir = new THREE.Vector3().subVectors(
        new THREE.Vector3(wristPos[0], wristPos[1], wristPos[2]),
        new THREE.Vector3(elbowPos[0], elbowPos[1], elbowPos[2])
      ).normalize();
      const cuffCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.42, 16), ribbedMat);
      cuffCyl.position.set(wristPos[0], wristPos[1], wristPos[2]);
      cuffCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cuffDir);
      group.add(cuffCyl);

      // Leather Riding Gloves securely gripping handlebars
      const handGroup = new THREE.Group();
      handGroup.position.set(gripTarget[0], gripTarget[1], gripTarget[2]);

      const gloveBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.50), glovesMat);
      handGroup.add(gloveBody);

      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.46), whiteMat);
      knuckle.position.set(-0.02, 0.19, 0);
      handGroup.add(knuckle);

      const curledFingers = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.46, 14), glovesMat);
      curledFingers.rotation.x = Math.PI / 2;
      curledFingers.position.set(0.18, -0.08, 0);
      handGroup.add(curledFingers);

      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), chromeMat);
      lever.rotation.x = Math.PI / 2 + (side * 0.12);
      lever.position.set(0.35, 0.05, -side * 0.25);
      handGroup.add(lever);

      group.add(handGroup);
    });

    // D. SOLID RELAXED CARGO JOGGER PANTS & RETRO SNEAKERS (ZERO GAPS!)
    [-1, 1].forEach(side => {
      let pegPos;
      let kneePos;
      let footRotZ = 0;

      if (isCruiser) {
        pegPos = [3.20, 3.80, side * 1.55];
        kneePos = [1.20, 5.80, side * 1.65];
        footRotZ = 0.28;
      } else if (isSupersport) {
        pegPos = [-0.60, 4.30, side * 1.35];
        kneePos = [0.85, 6.25, side * 1.68];
        footRotZ = -0.25;
      } else {
        pegPos = [0.40, 4.10, side * 1.35];
        kneePos = [1.10, 6.15, side * 1.60];
        footRotZ = 0;
      }

      const hipPos = [-1.40, 6.90, side * 1.15];
      const anklePos = [pegPos[0], pegPos[1] + 0.55, pegPos[2]];

      // Solid Pelvis / Saddle Seat Base (Completely covers seat and hip joints)
      const seatMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 14), pantsMat);
      seatMesh.scale.set(1.25, 0.90, 1.35);
      seatMesh.position.set(hipPos[0], hipPos[1], hipPos[2]);
      group.add(seatMesh);

      // Baggy Cargo Thigh (Hip -> Knee) hugging tank cutouts
      group.add(createBoneSegment(hipPos, kneePos, 0.85, 0.70, pantsMat));

      // Natural Bent Knee Cloth Fold
      const kneeFold = new THREE.Mesh(new THREE.SphereGeometry(0.70, 16, 14), pantsMat);
      kneeFold.position.set(kneePos[0], kneePos[1], kneePos[2]);
      group.add(kneeFold);

      // Tapered Jogger Shin (Knee -> Ankle)
      group.add(createBoneSegment(kneePos, anklePos, 0.70, 0.52, pantsMat));

      // 3D Cargo Flap Pocket mounted flush on outer thigh
      const pocketThighX = hipPos[0] + (kneePos[0] - hipPos[0]) * 0.55;
      const pocketThighY = hipPos[1] + (kneePos[1] - hipPos[1]) * 0.55;
      const pocketThighZ = side * (Math.abs(kneePos[2]) + 0.38);

      const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 0.28), pantsMat);
      cargoPocket.position.set(pocketThighX, pocketThighY, pocketThighZ);
      cargoPocket.rotation.z = Math.atan2(kneePos[1] - hipPos[1], kneePos[0] - hipPos[0]);
      group.add(cargoPocket);

      const pocketFlap = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.22, 0.32), darkPocketMat);
      pocketFlap.position.set(pocketThighX, pocketThighY + 0.32, pocketThighZ);
      pocketFlap.rotation.z = cargoPocket.rotation.z;
      group.add(pocketFlap);

      // Elastic Jogger Ankle Cuff
      const legDir = new THREE.Vector3().subVectors(
        new THREE.Vector3(anklePos[0], anklePos[1], anklePos[2]),
        new THREE.Vector3(kneePos[0], kneePos[1], kneePos[2])
      ).normalize();
      const ankleCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.50, 0.42, 16), ribbedMat);
      ankleCuff.position.set(anklePos[0], anklePos[1], anklePos[2]);
      ankleCuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legDir);
      group.add(ankleCuff);

      // Metal Knurled Footpeg
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.95, 12), chromeMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(pegPos[0], pegPos[1] - 0.22, side * (Math.abs(pegPos[2]) - 0.15));
      group.add(peg);

      const pegBracket = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.25), darkFrameMat);
      pegBracket.position.set(pegPos[0] - 0.15, pegPos[1] + 0.15, side * (Math.abs(pegPos[2]) - 0.45));
      group.add(pegBracket);

      // Two-Tone Retro High-Top Sneaker
      const sneakerGroup = new THREE.Group();
      sneakerGroup.position.set(pegPos[0], pegPos[1], pegPos[2]);
      sneakerGroup.rotation.z = footRotZ;

      const highTopCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.75, 14), shoeMat);
      highTopCollar.position.set(0, 0.36, 0);
      sneakerGroup.add(highTopCollar);

      const midsole = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.26, 0.88), soleMat);
      midsole.position.set(0.38, -0.25, 0);
      sneakerGroup.add(midsole);

      const outsole = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.08, 0.92), treadMat);
      outsole.position.set(0.38, -0.38, 0);
      sneakerGroup.add(outsole);

      const shoeQuarter = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.84), shoeMat);
      shoeQuarter.position.set(0.08, 0.05, 0);
      sneakerGroup.add(shoeQuarter);

      const toeBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.80), shoeAccentMat);
      toeBox.position.set(0.74, -0.02, 0);
      sneakerGroup.add(toeBox);

      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.46), shoeAccentMat);
      tongue.position.set(0.35, 0.28, 0);
      tongue.rotation.z = -0.30;
      sneakerGroup.add(tongue);

      group.add(sneakerGroup);
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
