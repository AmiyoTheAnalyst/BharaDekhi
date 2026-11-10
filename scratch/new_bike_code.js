  // ---------------------------------------------------------------------------
  // Seamless GTA Motorcycle & Organic Multi-Outfit Rider Factory (Pure Three.js)
  // 5 GTA V Archetypes, 10 Automotive Palettes, Sculpted 3D Human Face & Multi-Outfits
  // ---------------------------------------------------------------------------
  const bikeTextureCache = {};

  function getVarsityBackTexture() {
    if (bikeTextureCache.varsity) return bikeTextureCache.varsity;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    // Bold White "R★" emblem on back (Photo 8)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 120px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', 104, 115);
    ctx.font = '900 70px "Segoe UI Symbol", sans-serif';
    ctx.fillText('★', 168, 145);

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.varsity = tex;
    return tex;
  }

  function getBikeLicensePlateTexture() {
    if (bikeTextureCache.plate) return bikeTextureCache.plate;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 80);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 76);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOS SANTOS', 64, 18);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 28px "Consolas", monospace';
    ctx.fillText('UF82 ISK', 64, 56);
    bikeTextureCache.plate = new THREE.CanvasTexture(canvas);
    return bikeTextureCache.plate;
  }

  function getFukaruTireTexture() {
    if (bikeTextureCache.fukaru) return bikeTextureCache.fukaru;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 24px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = ['FUKARU', '• RACING •', 'FUKARU', '• SPORT RADIAL •'];
    for (let i = 0; i < words.length; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.fillText(words[i], 0, -210);
      ctx.restore();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.fukaru = tex;
    return tex;
  }

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

  function getPinstripeTankTexture(colorHex) {
    const key = 'stripe_' + colorHex;
    if (bikeTextureCache[key]) return bikeTextureCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);

    ctx.strokeStyle = '#' + new THREE.Color(colorHex).getHexString();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(10, 80);
    ctx.bezierCurveTo(80, 20, 180, 20, 246, 80);
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

  // 10 Distinct Automotive Palettes (5 Archetypes x 10 Palettes = 50 Unique Variations)
  const BIKE_PALETTES = [
    // 0: Pearl White & Carbon + Bronze Rims (Modern / Cafe Racer)
    { name: 'Pearl White & Bronze', fairing: 0xf8fafc, accent: 0x18181b, rim: 0xc2b280, rimLip: null, seat: 0x18181b, frame: 0x27272a, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 1: Metallic Ducati Red + Silver Rims (Supersport / Streetfighter)
    { name: 'Ducati Red & Silver', fairing: 0xdc2626, accent: 0x111827, rim: 0x94a3b8, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 2: Shitzu Titanium Silver & Black Kanji + Gunmetal Rims (Hyperbike)
    { name: 'Shitzu Titanium Silver', fairing: 0x94a3b8, accent: 0x0f172a, rim: 0x334155, rimLip: null, seat: 0x090d16, frame: 0x1e293b, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 3: Midnight Black & Crimson Pinstripe + Red-Lip Rims (Western Nightblade Cruiser)
    { name: 'Midnight Black & Crimson', fairing: 0x090d16, accent: 0xef4444, rim: 0x111827, rimLip: 0xef4444, seat: 0x18181b, frame: 0x111827, chrome: 0x94a3b8, caliper: 0xef4444 },
    // 4: Yamaha Racing Blue + Gold Rims
    { name: 'Yamaha Racing Blue & Gold', fairing: 0x1d4ed8, accent: 0xf8fafc, rim: 0xd97706, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 5: Toxic Kawasaki Emerald Green + Matte Black Rims
    { name: 'Kawasaki Emerald & Black', fairing: 0x16a34a, accent: 0x090d16, rim: 0x18181b, rimLip: null, seat: 0x090d16, frame: 0x0f172a, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 6: Sunset Metallic Orange + Dark Alloy Rims
    { name: 'Sunset Orange & Dark Alloy', fairing: 0xea580c, accent: 0x18181b, rim: 0x475569, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 7: Stealth Matte Graphite + Neon Yellow Accents
    { name: 'Stealth Graphite & Neon', fairing: 0x27272a, accent: 0xeab308, rim: 0x18181b, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0x64748b, caliper: 0xeab308 },
    // 8: Deep Royal Purple & Pearl + Chrome Rims
    { name: 'Royal Purple & Chrome', fairing: 0x581c87, accent: 0xf8fafc, rim: 0xe2e8f0, rimLip: null, seat: 0x1e1b4b, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 9: Championship Gold & Black + Silver Rims
    { name: 'Championship Gold & Silver', fairing: 0xd97706, accent: 0x090d16, rim: 0xcfd8dc, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 }
  ];

  function createRealisticGTABike(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const archetypeIdx = (vData && vData.archetype !== undefined)
      ? (Math.abs(vData.archetype) % 5)
      : Math.abs((appearanceSeed || 0) % 5);

    // Default authentic palette for each archetype
    const defaultArchetypePalettes = [1, 3, 1, 2, 0];
    const paletteIdx = (vData && vData.palette !== undefined)
      ? (Math.abs(vData.palette) % 10)
      : defaultArchetypePalettes[archetypeIdx];

    const palette = Object.assign({}, BIKE_PALETTES[paletteIdx]);
    if (vData && vData.bikeColor && vData.palette === undefined && vData.archetype === undefined) {
      palette.fairing = parseInt(vData.bikeColor.replace('#', '0x'), 16);
    } else if (colorHex && colorHex !== 0x2563eb && vData && vData.palette === undefined && vData.archetype === undefined) {
      palette.fairing = colorHex;
    }

    const outfitIdx = (vData && vData.outfit !== undefined)
      ? (Math.abs(vData.outfit) % 4)
      : Math.abs((appearanceSeed || 0) % 4);

    const outfitConfigs = [
      // 0: Streetfighter (Black Leather + White Tee + Biker Jeans + Knuckle Armor)
      { name: 'GTA Streetfighter', torsoHex: 0x111827, sleeveHex: 0x111827, legHex: 0x1f2937, helmetHex: 0x090d16, visorHex: 0x020617, shorts: false, varsity: false, streetfighter: true },
      // 1: "R★" Varsity Rider (Burgundy Varsity + Black Sleeves + Track Pants)
      { name: 'GTA "R★" Varsity Rider', torsoHex: 0x580b18, sleeveHex: 0x111827, legHex: 0x475569, helmetHex: 0x1d4ed8, visorHex: 0x0f172a, shorts: false, varsity: true, streetfighter: false },
      // 2: Scrambler (Heather-Grey Sweatshirt + Khaki Cargo Shorts + Chrome Visor)
      { name: 'GTA Scrambler', torsoHex: 0x9ca3af, sleeveHex: 0x9ca3af, legHex: 0xbfa071, helmetHex: 0xe2e8f0, visorHex: 0xcfd8dc, shorts: true, varsity: false, streetfighter: false },
      // 3: Dhaka Urban Rider (Emerald/Dark Olive Jacket + Dark Indigo Jeans + Cobalt Helmet)
      { name: 'Dhaka Urban Rider', torsoHex: 0x064e3b, sleeveHex: 0x064e3b, legHex: 0x172554, helmetHex: 0x0284c7, visorHex: 0x090d16, shorts: false, varsity: false, streetfighter: false }
    ];
    const outfitCfg = outfitConfigs[outfitIdx];

    const isStreetfighter = (archetypeIdx === 0);
    const isCruiser       = (archetypeIdx === 1);
    const isSupersport    = (archetypeIdx === 2);
    const isHyperbike     = (archetypeIdx === 3);
    const isCafeRacer     = (archetypeIdx === 4);

    // Materials
    const fairingMat = new THREE.MeshStandardMaterial({ color: palette.fairing, roughness: 0.16, metalness: 0.45 });
    const darkFrameMat = new THREE.MeshStandardMaterial({ color: palette.frame || 0x18181b, roughness: 0.35, metalness: 0.75 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: palette.chrome || 0xe2e8f0, roughness: 0.12, metalness: 0.92 });
    const radiatorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.85 });
    const leatherSeatMat = new THREE.MeshStandardMaterial({ color: palette.seat || 0x090d16, roughness: 0.55 });
    const smokedGlassMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.48, depthWrite: false });

    // ---------------------------------------------------------------------------
    // 1. WHEEL HARDWARE: HOLLOW SPOKE ALLOY WHEELS WITH DISCS & CALIPERS
    // ---------------------------------------------------------------------------
    function buildBikeWheel(wx, wy, radius, isRear) {
      const wPivot = new THREE.Group();
      wPivot.position.set(wx, wy, 0);

      // Deep matte black vulcanized rubber
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.92, metalness: 0.04 });
      const tire = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.55, 0.58, 18, 36), tireMat);
      tire.scale.z = isRear ? (isCruiser ? 1.75 : 1.45) : 1.05;
      wPivot.add(tire);

      // Archetype 4: Fukaru White Lettering Sidewalls
      if (isCafeRacer) {
        [-1, 1].forEach(side => {
          const fukaruRing = new THREE.Mesh(
            new THREE.RingGeometry(radius - 0.95, radius - 0.18, 28),
            new THREE.MeshBasicMaterial({ map: getFukaruTireTexture(), transparent: true, side: THREE.DoubleSide })
          );
          fukaruRing.position.z = side * (isRear ? 0.90 : 0.65);
          wPivot.add(fukaruRing);
        });
      }

      // Outer Alloy Rim Hoop (with red-lip pinstripe for Western Nightblade Cruiser)
      const hoopMat = (isCruiser && palette.rimLip && isRear)
        ? new THREE.MeshStandardMaterial({ color: palette.rimLip, roughness: 0.2, metalness: 0.85 })
        : new THREE.MeshStandardMaterial({ color: palette.rim, roughness: 0.22, metalness: 0.82 });
      const rimHoop = new THREE.Mesh(new THREE.TorusGeometry(radius - 1.12, 0.18, 12, 32), hoopMat);
      rimHoop.scale.z = isRear ? (isCruiser ? 1.65 : 1.35) : 1.0;
      wPivot.add(rimHoop);

      // Central Hub along Z axle
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, isRear ? 1.4 : 1.1, 16), hoopMat);
      hub.rotation.x = Math.PI / 2;
      wPivot.add(hub);

      // Hollow Spokes
      let spokeCount = 10;
      let spokeRadius = 0.11;
      if (isHyperbike) { spokeCount = 6; spokeRadius = 0.16; }
      else if (isSupersport) { spokeCount = 5; spokeRadius = 0.14; }
      else if (outfitIdx === 2) { spokeCount = 24; spokeRadius = 0.05; }
      const spokeLen = (radius - 1.18) * 2;
      for (let i = 0; i < spokeCount; i++) {
        const ang = (i / spokeCount) * Math.PI;
        const spk = new THREE.Mesh(new THREE.CylinderGeometry(spokeRadius, spokeRadius, spokeLen, 8), hoopMat);
        spk.rotation.z = ang;
        spk.position.z = (i % 2 === 0 ? 1 : -1) * 0.12;
        wPivot.add(spk);
      }

      // Perforated Steel Brake Rotors
      const discSides = isRear ? [0.58] : [-0.48, 0.48];
      discSides.forEach(dz => {
        const rotor = new THREE.Mesh(new THREE.RingGeometry(0.55, 1.35, 24), chromeMat);
        rotor.position.z = dz;
        wPivot.add(rotor);
      });

      group.add(wPivot);
      group.userData.wheels.push(wPivot);

      // Brake Caliper
      const caliperMat = new THREE.MeshStandardMaterial({ color: palette.caliper || 0xd97706, roughness: 0.25, metalness: 0.8 });
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.45), caliperMat);
      caliper.position.set(wx - (isRear ? -0.95 : 0.95), wy + 0.55, isRear ? 0.62 : 0.52);
      group.add(caliper);
    }

    // Axle positions: Cruiser has longer wheelbase & rake
    const frontAxleX = isCruiser ? 7.8 : 6.8;
    const rearAxleX = -6.8;
    buildBikeWheel(frontAxleX, 3.25, 3.25, false);
    buildBikeWheel(rearAxleX, 3.25, isCruiser ? 3.35 : 3.30, true);
    group.userData.wheelRadius = 3.25;

    // ---------------------------------------------------------------------------
    // 2. FRONT SUSPENSION, FORKS & MUDGUARD
    // ---------------------------------------------------------------------------
    [-0.85, 0.85].forEach(fz => {
      const forkTubeMat = isCruiser
        ? new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.15, metalness: 0.9 })
        : darkFrameMat;

      const forkTube = createSeamlessLoftedLimb([
        { p: [frontAxleX, 3.25, fz], rx: 0.20, ry: 0.20 },
        { p: [frontAxleX - 1.4, 5.80, fz], rx: 0.22, ry: 0.22 },
        { p: [isCruiser ? 3.8 : 3.5, isCruiser ? 9.6 : 9.25, fz], rx: 0.28, ry: 0.28 }
      ], 10, 12, forkTubeMat);
      group.add(forkTube);

      const lowerSlider = createSeamlessLoftedLimb([
        { p: [frontAxleX, 3.25, fz], rx: 0.21, ry: 0.21 },
        { p: [frontAxleX - 1.3, 5.60, fz], rx: 0.21, ry: 0.21 }
      ], 6, 12, chromeMat);
      group.add(lowerSlider);

      // Archetype 4: Thick White Aerodynamic Fork Shrouds
      if (isCafeRacer) {
        const shroud = createSeamlessLoftedLimb([
          { p: [frontAxleX - 1.4, 5.80, fz], rx: 0.42, ry: 0.42 },
          { p: [frontAxleX - 2.8, 8.20, fz], rx: 0.46, ry: 0.46 },
          { p: [3.5, 9.25, fz], rx: 0.40, ry: 0.40 }
        ], 10, 14, fairingMat);
        group.add(shroud);
      }
    });

    // Front Fender
    if (isHyperbike) {
      // Deep bulbous wind-tunnel aero fender enclosing upper front tire
      const deepFenderShape = new THREE.Shape();
      deepFenderShape.moveTo(frontAxleX - 2.2, 4.4);
      deepFenderShape.quadraticCurveTo(frontAxleX, 7.3, frontAxleX + 2.2, 4.6);
      deepFenderShape.lineTo(frontAxleX + 1.8, 4.2);
      deepFenderShape.quadraticCurveTo(frontAxleX, 6.7, frontAxleX - 1.8, 4.0);
      deepFenderShape.closePath();
      const deepGeo = new THREE.ExtrudeGeometry(deepFenderShape, { depth: 1.65, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 3 });
      deepGeo.translate(0, 0, -1.65 / 2);
      group.add(new THREE.Mesh(deepGeo, fairingMat));
    } else if (!isCruiser) {
      const fenderShape = new THREE.Shape();
      fenderShape.moveTo(5.2, 5.6);
      fenderShape.quadraticCurveTo(6.8, 6.85, 8.2, 5.5);
      fenderShape.lineTo(7.9, 5.15);
      fenderShape.quadraticCurveTo(6.8, 6.35, 5.5, 5.15);
      fenderShape.closePath();
      const fenderGeo = new THREE.ExtrudeGeometry(fenderShape, { depth: 1.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3 });
      fenderGeo.translate(0, 0, -1.35 / 2);
      group.add(new THREE.Mesh(fenderGeo, fairingMat));
    }

    // ---------------------------------------------------------------------------
    // 3. ENGINE & EXHAUST ARCHITECTURES
    // ---------------------------------------------------------------------------
    if (isCruiser) {
      // 45-Degree V-Twin Engine Block (Photo 2)
      const crankcase = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.4, 16), darkFrameMat);
      crankcase.rotation.x = Math.PI / 2;
      crankcase.position.set(0.6, 4.1, 0);
      group.add(crankcase);

      const cylF = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.90, 2.1, 14), radiatorMat);
      cylF.rotation.z = -0.40;
      cylF.position.set(1.5, 5.2, 0);
      group.add(cylF);

      const cylR = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.90, 2.1, 14), radiatorMat);
      cylR.rotation.z = 0.40;
      cylR.position.set(-0.3, 5.2, 0);
      group.add(cylR);

      const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.45, 16), chromeMat);
      airCleaner.rotation.x = Math.PI / 2;
      airCleaner.position.set(0.6, 5.4, 1.35);
      group.add(airCleaner);

      const cruiserPipe1 = createSeamlessLoftedLimb([
        { p: [1.8, 4.8, 1.05], rx: 0.18, ry: 0.18 },
        { p: [1.2, 2.8, 1.25], rx: 0.18, ry: 0.18 },
        { p: [-2.5, 2.7, 1.35], rx: 0.22, ry: 0.22 },
        { p: [-7.2, 2.7, 1.45], rx: 0.35, ry: 0.35 }
      ], 12, 12, darkFrameMat);
      group.add(cruiserPipe1);

      const cruiserPipe2 = createSeamlessLoftedLimb([
        { p: [0.0, 4.8, 1.05], rx: 0.18, ry: 0.18 },
        { p: [-0.6, 3.4, 1.25], rx: 0.18, ry: 0.18 },
        { p: [-3.2, 3.3, 1.35], rx: 0.22, ry: 0.22 },
        { p: [-7.4, 3.3, 1.45], rx: 0.35, ry: 0.35 }
      ], 12, 12, darkFrameMat);
      group.add(cruiserPipe2);

    } else if (isCafeRacer) {
      // Under-Seat High Exhaust Wrapped in Heat-Shield Wrap (Photo 4)
      const wrapMat = new THREE.MeshStandardMaterial({ color: 0xdcd1b4, roughness: 0.85 });
      const engineBlock = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.35, 2.5, 16), darkFrameMat);
      engineBlock.rotation.x = Math.PI / 2;
      engineBlock.position.set(0.8, 4.3, 0);
      group.add(engineBlock);

      [-1, 1].forEach(side => {
        const wrappedPipe = createSeamlessLoftedLimb([
          { p: [2.2, 4.8, side * 0.7], rx: 0.18, ry: 0.18 },
          { p: [1.2, 3.1, side * 0.95], rx: 0.20, ry: 0.20 },
          { p: [-1.2, 4.2, side * 1.15], rx: 0.22, ry: 0.22 },
          { p: [-3.8, 5.8, side * 1.05], rx: 0.32, ry: 0.32 },
          { p: [-6.8, 6.2, side * 0.95], rx: 0.35, ry: 0.35 }
        ], 14, 12, wrapMat);
        group.add(wrappedPipe);
      });

    } else if (isHyperbike) {
      // Massive Dual Megaphone Black Canisters extending past rear axle (Photo 5)
      [-1, 1].forEach(side => {
        const megaMuffler = createSeamlessLoftedLimb([
          { p: [1.2, 3.0, side * 0.95], rx: 0.20, ry: 0.20 },
          { p: [-2.0, 3.2, side * 1.35], rx: 0.35, ry: 0.35 },
          { p: [-5.5, 3.9, side * 1.55], rx: 0.65, ry: 0.65 },
          { p: [-8.4, 4.4, side * 1.60], rx: 0.72, ry: 0.72 }
        ], 14, 16, darkFrameMat);
        group.add(megaMuffler);
      });

    } else if (isSupersport) {
      // Shorty Underslung Race Exhaust (Photo 3)
      const shortyMuffler = createSeamlessLoftedLimb([
        { p: [1.5, 3.2, 0.9], rx: 0.20, ry: 0.20 },
        { p: [-0.5, 2.7, 1.25], rx: 0.32, ry: 0.32 },
        { p: [-2.8, 3.4, 1.45], rx: 0.48, ry: 0.48 }
      ], 10, 14, chromeMat);
      group.add(shortyMuffler);

    } else {
      // Classic Streetfighter: 4 Chrome Headers into Dual Upswept Brushed Aluminum Mufflers (Photo 1)
      const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.5, 2.8), radiatorMat);
      radiator.position.set(3.85, 5.6, 0);
      radiator.rotation.z = -0.32;
      group.add(radiator);

      const engineBlock = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.35, 2.5, 16), darkFrameMat);
      engineBlock.rotation.x = Math.PI / 2;
      engineBlock.position.set(0.8, 4.3, 0);
      group.add(engineBlock);

      [-0.75, -0.25, 0.25, 0.75].forEach(hz => {
        const headerPipe = createSeamlessLoftedLimb([
          { p: [2.4, 5.0, hz], rx: 0.14, ry: 0.14 },
          { p: [2.9, 3.6, hz * 0.9], rx: 0.14, ry: 0.14 },
          { p: [1.2, 2.75, hz * 0.8], rx: 0.15, ry: 0.15 },
          { p: [-1.8, 2.85, (hz < 0 ? -1.1 : 1.1)], rx: 0.18, ry: 0.18 }
        ], 14, 10, chromeMat);
        group.add(headerPipe);
      });

      [-1, 1].forEach(side => {
        const muffler = createSeamlessLoftedLimb([
          { p: [-1.8, 2.85, side * 1.1], rx: 0.22, ry: 0.22 },
          { p: [-3.6, 3.45, side * 1.45], rx: 0.48, ry: 0.48 },
          { p: [-7.4, 4.65, side * 1.55], rx: 0.52, ry: 0.52 }
        ], 12, 16, chromeMat);
        group.add(muffler);
      });
    }

    // Rear Swingarm & Frame Spars
    [-1, 1].forEach(side => {
      const swingarm = createSeamlessLoftedLimb([
        { p: [-1.2, 4.1, side * 0.95], rx: 0.28, ry: 0.42 },
        { p: [-6.8, 3.25, side * 0.95], rx: 0.22, ry: 0.32 }
      ], 6, 10, radiatorMat);
      group.add(swingarm);
    });

    // ---------------------------------------------------------------------------
    // 4. CHASSIS, FAIRINGS, FUEL TANK & LIGHTS
    // ---------------------------------------------------------------------------
    if (isCruiser) {
      // Teardrop Cruiser Fuel Tank with Curved Pinstripe Lines (Photo 2)
      const tankShape = new THREE.Shape();
      tankShape.moveTo(-1.2, 6.2);
      tankShape.quadraticCurveTo(0.4, 8.4, 2.6, 8.2);
      tankShape.quadraticCurveTo(3.8, 7.8, 3.9, 6.6);
      tankShape.lineTo(1.8, 5.6);
      tankShape.quadraticCurveTo(0.2, 5.8, -1.2, 6.2);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 1.85, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.2, bevelSegments: 4 });
      tankGeo.translate(0, 0, -1.85 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      // Pinstripe Decal on Tank Sides
      [-1, 1].forEach(side => {
        const pDecal = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 1.2),
          new THREE.MeshBasicMaterial({ map: getPinstripeTankTexture(palette.accent || 0xef4444), transparent: true, side: THREE.DoubleSide })
        );
        pDecal.position.set(1.4, 7.1, side * 1.05);
        pDecal.rotation.y = (side > 0 ? 1 : -1) * 0.25;
        group.add(pDecal);
      });

      // Bikini Cowl over Single Round Projector Headlight
      const bikiniCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.72, 1.1, 16), fairingMat);
      bikiniCowl.rotation.z = Math.PI / 2;
      bikiniCowl.position.set(4.2, 8.8, 0);
      group.add(bikiniCowl);

      const hlBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.3, 18), chromeMat);
      hlBezel.rotation.z = Math.PI / 2;
      hlBezel.position.set(4.8, 8.8, 0);
      group.add(hlBezel);

      const hlLens = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), vehicleHeadlightMat || new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlLens.position.set(4.95, 8.8, 0);
      group.add(hlLens);

      // Low Bobbed Rear Fender hugging rear tire
      const bobbedShape = new THREE.Shape();
      bobbedShape.moveTo(-4.5, 4.4);
      bobbedShape.quadraticCurveTo(-6.8, 6.8, -8.2, 4.6);
      bobbedShape.lineTo(-7.9, 4.2);
      bobbedShape.quadraticCurveTo(-6.8, 6.2, -4.8, 4.0);
      bobbedShape.closePath();
      const bobbedGeo = new THREE.ExtrudeGeometry(bobbedShape, { depth: 1.85, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 3 });
      bobbedGeo.translate(0, 0, -1.85 / 2);
      group.add(new THREE.Mesh(bobbedGeo, fairingMat));

    } else if (isSupersport) {
      // Full Faceted Geometric Race Fairing with Triangular Air Extractors (Photo 3)
      const raceFairingShape = new THREE.Shape();
      raceFairingShape.moveTo(-1.2, 6.2);
      raceFairingShape.lineTo(0.5, 8.7);
      raceFairingShape.lineTo(3.2, 8.5);
      raceFairingShape.lineTo(6.8, 7.8);
      raceFairingShape.lineTo(5.8, 5.0);
      raceFairingShape.lineTo(3.5, 3.2);
      raceFairingShape.lineTo(-0.8, 3.4);
      raceFairingShape.closePath();
      const rfGeo = new THREE.ExtrudeGeometry(raceFairingShape, { depth: 1.95, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.18, bevelSegments: 3 });
      rfGeo.translate(0, 0, -1.95 / 2);
      group.add(new THREE.Mesh(rfGeo, fairingMat));

      // Triangular Recessed Air Extractors on Fairing Flanks
      [-1, 1].forEach(side => {
        const ventShape = new THREE.Shape();
        ventShape.moveTo(2.2, 5.2);
        ventShape.lineTo(3.8, 6.4);
        ventShape.lineTo(3.4, 4.8);
        ventShape.closePath();
        const ventGeo = new THREE.ExtrudeGeometry(ventShape, { depth: 0.2, bevelEnabled: false });
        ventGeo.translate(0, 0, side * 1.02);
        group.add(new THREE.Mesh(ventGeo, darkFrameMat));
      });

      // Slanted Cat-Eye Projector Headlights
      [-0.52, 0.52].forEach(hz => {
        const catEye = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.62), vehicleHeadlightMat || new THREE.MeshBasicMaterial({ color: 0xffffff }));
        catEye.rotation.y = (hz > 0 ? -1 : 1) * 0.35;
        catEye.position.set(6.75, 7.65, hz);
        group.add(catEye);
      });

      // Tall Raked Bubble Windscreen
      const wsShape = new THREE.Shape();
      wsShape.moveTo(3.8, 8.8);
      wsShape.quadraticCurveTo(5.2, 10.8, 6.6, 8.6);
      wsShape.lineTo(5.9, 8.2);
      wsShape.quadraticCurveTo(4.8, 9.8, 3.8, 8.8);
      const wsGeo = new THREE.ExtrudeGeometry(wsShape, { depth: 1.55, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 3 });
      wsGeo.translate(0, 0, -1.55 / 2);
      group.add(new THREE.Mesh(wsGeo, smokedGlassMat));

    } else if (isHyperbike) {
      // Bulbous Aero Nose & Broad Body with SHITZU & Kanji Decals (Photo 5)
      const aeroShape = new THREE.Shape();
      aeroShape.moveTo(-1.2, 6.4);
      aeroShape.quadraticCurveTo(1.2, 9.4, 3.4, 8.9);
      aeroShape.quadraticCurveTo(5.8, 9.2, 6.9, 7.4);
      aeroShape.lineTo(5.6, 4.8);
      aeroShape.lineTo(1.8, 3.6);
      aeroShape.quadraticCurveTo(0.2, 5.2, -1.2, 6.4);
      const aeroGeo = new THREE.ExtrudeGeometry(aeroShape, { depth: 2.15, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25, bevelSegments: 4 });
      aeroGeo.translate(0, 0, -2.15 / 2);
      group.add(new THREE.Mesh(aeroGeo, fairingMat));

      // SHITZU Decals on Tank
      [-1, 1].forEach(side => {
        const shitzuDecal = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 0.55),
          new THREE.MeshBasicMaterial({ map: getShitzuDecalTexture(), transparent: true, side: THREE.DoubleSide })
        );
        shitzuDecal.position.set(2.4, 8.1, side * 1.18);
        shitzuDecal.rotation.y = (side > 0 ? 1 : -1) * 0.25;
        group.add(shitzuDecal);

        // Kanji "死" Decal on Lower Fairing Flank
        const kanjiDecal = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 1.6),
          new THREE.MeshBasicMaterial({ map: getKanjiDecalTexture(), transparent: true, side: THREE.DoubleSide })
        );
        kanjiDecal.position.set(2.8, 5.6, side * 1.18);
        kanjiDecal.rotation.y = (side > 0 ? 1 : -1) * 0.18;
        group.add(kanjiDecal);
      });

    } else if (isCafeRacer) {
      // Modern Cafe Racer / Pegassi Vortex (Photo 4)
      const grillHl = new THREE.Mesh(
        new THREE.CircleGeometry(0.68, 20),
        new THREE.MeshBasicMaterial({ map: getGrillHeadlightTexture(), side: THREE.DoubleSide })
      );
      grillHl.rotation.y = Math.PI / 2;
      grillHl.position.set(6.65, 7.8, 0);
      group.add(grillHl);

      const hlBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.45, 20), darkFrameMat);
      hlBezel.rotation.z = Math.PI / 2;
      hlBezel.position.set(6.45, 7.8, 0);
      group.add(hlBezel);

      // White Lower Belly-Pan Chin Spoiler
      const chinShape = new THREE.Shape();
      chinShape.moveTo(3.6, 4.6);
      chinShape.lineTo(2.2, 3.1);
      chinShape.lineTo(0.2, 3.2);
      chinShape.lineTo(1.8, 4.4);
      chinShape.closePath();
      const chinGeo = new THREE.ExtrudeGeometry(chinShape, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 3 });
      chinGeo.translate(0, 0, -1.6 / 2);
      group.add(new THREE.Mesh(chinGeo, fairingMat));

      // Fuel Tank with Black Rubber Knee Grip Pads
      const tankShape = new THREE.Shape();
      tankShape.moveTo(-0.8, 6.6);
      tankShape.quadraticCurveTo(0.8, 8.95, 2.8, 8.65);
      tankShape.quadraticCurveTo(4.2, 8.35, 4.6, 6.8);
      tankShape.lineTo(2.4, 5.6);
      tankShape.quadraticCurveTo(0.6, 6.2, -0.8, 6.6);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 1.95, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.22, bevelSegments: 4 });
      tankGeo.translate(0, 0, -1.95 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      [-1, 1].forEach(side => {
        const kneePad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.15), darkFrameMat);
        kneePad.position.set(1.4, 7.2, side * 1.15);
        kneePad.rotation.z = 0.22;
        group.add(kneePad);
      });

    } else {
      // Classic Streetfighter: Sculpted tank + Twin Round Chrome Headlights (Photo 1)
      const tankShape = new THREE.Shape();
      tankShape.moveTo(-0.8, 6.6);
      tankShape.quadraticCurveTo(0.8, 8.95, 2.8, 8.65);
      tankShape.quadraticCurveTo(4.2, 8.35, 4.6, 6.8);
      tankShape.lineTo(2.4, 5.6);
      tankShape.quadraticCurveTo(0.6, 6.2, -0.8, 6.6);
      const tankGeo = new THREE.ExtrudeGeometry(tankShape, { depth: 1.95, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.22, bevelSegments: 4 });
      tankGeo.translate(0, 0, -1.95 / 2);
      group.add(new THREE.Mesh(tankGeo, fairingMat));

      [-0.56, 0.56].forEach(hz => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.40, 16), chromeMat);
        bezel.rotation.z = Math.PI / 2;
        bezel.position.set(6.85, 7.45, hz);
        group.add(bezel);

        const hlLens = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 12), vehicleHeadlightMat || new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hlLens.position.set(7.04, 7.45, hz);
        group.add(hlLens);
      });
    }

    // Handlebars
    [-1, 1].forEach(side => {
      const barX = isCruiser ? 3.4 : (isSupersport ? 3.6 : 3.55);
      const barY = isCruiser ? 9.6 : (isSupersport ? 8.4 : 9.05);
      const bar = createSeamlessLoftedLimb([
        { p: [barX, barY, side * 0.65], rx: 0.12, ry: 0.12 },
        { p: [barX - 0.45, barY - 0.2, side * (isCruiser ? 2.25 : 1.95)], rx: 0.14, ry: 0.14 }
      ], 4, 8, darkFrameMat);
      group.add(bar);
    });

    // Saddle & Tail
    const seatShape = new THREE.Shape();
    seatShape.moveTo(-0.4, 6.75);
    seatShape.quadraticCurveTo(-1.8, 6.45, -3.1, 6.95);
    seatShape.lineTo(-3.6, 7.85);
    seatShape.quadraticCurveTo(-5.2, 8.15, -6.6, 7.95);
    seatShape.lineTo(-6.3, 7.15);
    seatShape.quadraticCurveTo(-3.2, 6.0, -0.4, 6.15);
    seatShape.closePath();
    const seatGeo = new THREE.ExtrudeGeometry(seatShape, { depth: 1.65, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.20, bevelSegments: 4 });
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
    const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: isSupersport ? 1.55 : 1.75, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.18, bevelSegments: 4 });
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
    // 5. ANATOMICAL HUMAN RIDER (V-TAPER TORSO, SCULPTED 3D FACE & BARE/CLOTHED LIMBS)
    // ---------------------------------------------------------------------------
    const torsoMat = new THREE.MeshStandardMaterial({ color: outfitCfg.torsoHex, roughness: outfitCfg.varsity ? 0.65 : 0.35 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: outfitCfg.sleeveHex, roughness: 0.38 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: outfitCfg.legHex, roughness: 0.68 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd49b72, roughness: 0.58 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.45 });

    // A. Continuous Lofted Torso (Pelvis -> Waist -> Spine -> Broad Chest -> Broad Shoulders)
    // ZERO floating egg, ZERO floating toruses!
    let riderTorso;
    if (isCruiser) {
      // Upright Cruising Posture (Photo 2)
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

    // Varsity Back Graphic (only for Varsity outfit, flush on back, zero floating hip loop!)
    if (outfitCfg.varsity && !isCruiser) {
      const backBadge = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 2.1),
        new THREE.MeshStandardMaterial({ map: getVarsityBackTexture(), transparent: true, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false })
      );
      backBadge.rotation.y = -Math.PI / 2;
      backBadge.rotation.z = -0.48;
      backBadge.position.set(-1.12, 9.65, 0);
      group.add(backBadge);
    }

    // B. Neck & Head Position
    const neckMesh = createSeamlessLoftedLimb([
      { p: [isCruiser ? 0.40 : (isSupersport ? 1.75 : 1.25), isCruiser ? 11.65 : (isSupersport ? 10.65 : 11.65), 0], rx: 0.44, ry: 0.44 },
      { p: [isCruiser ? 0.75 : (isSupersport ? 2.15 : 1.65), isCruiser ? 12.45 : (isSupersport ? 11.45 : 12.55), 0], rx: 0.40, ry: 0.40 }
    ], 6, 12, skinMat);
    group.add(neckMesh);

    // Head Group with Sculpted 3D Face
    const headPos = isCruiser
      ? { x: 0.95, y: 13.10, z: 0 }
      : (isSupersport ? { x: 2.35, y: 12.10, z: 0 } : { x: 1.85, y: 13.25, z: 0 });
    const headRotZ = isCruiser ? -0.08 : (isSupersport ? -0.42 : -0.20);

    const headGroup = new THREE.Group();
    headGroup.position.set(headPos.x, headPos.y, headPos.z);
    headGroup.rotation.z = headRotZ;

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const darkIrisMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const darkHairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const lipsMat = new THREE.MeshStandardMaterial({ color: 0xa85b51, roughness: 0.50 });

    // 1. Anatomical Skin Cranium Base (Head radius 0.78, scaled)
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.78, 20, 18), skinMat);
    cranium.scale.set(0.90, 1.05, 0.92);
    headGroup.add(cranium);

    // 2. Brow Ridge
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.68), skinMat);
    brow.position.set(0.72, 0.28, 0);
    headGroup.add(brow);

    // 3. Sculpted 3D Nose
    const noseGeo = new THREE.ConeGeometry(0.14, 0.38, 4);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(0.84, 0.06, 0);
    headGroup.add(nose);

    // 4. Jaw & Chin
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.72), skinMat);
    jaw.position.set(0.42, -0.30, 0);
    headGroup.add(jaw);

    const chin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skinMat);
    chin.position.set(0.68, -0.36, 0);
    headGroup.add(chin);

    // 5. White Sclera Eyes + Dark Irises (sitting cleanly on surface) & Eyebrows
    [-1, 1].forEach(side => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), eyeWhiteMat);
      eyeWhite.position.set(0.72, 0.18, side * 0.25);
      headGroup.add(eyeWhite);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), darkIrisMat);
      iris.position.set(0.81, 0.18, side * 0.25);
      headGroup.add(iris);

      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.24), darkHairMat);
      eyebrow.position.set(0.74, 0.30, side * 0.26);
      eyebrow.rotation.z = -0.06;
      headGroup.add(eyebrow);
    });

    // 6. Defined Lips & Facial Hair
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.34), lipsMat);
    lips.position.set(0.76, -0.15, 0);
    headGroup.add(lips);

    if (isCruiser || isCafeRacer || outfitCfg.streetfighter) {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.64), darkHairMat);
      beard.position.set(0.52, -0.36, 0);
      headGroup.add(beard);
    }

    // 7. Headwear Framing (Leaving Face Wide Open & Fully Visible!)
    if (isCruiser) {
      // Photo 2: Tactical Black Balaclava Mask with Exposed Eye Band
      const balaclavaMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
      const lowerMask = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.82), balaclavaMat);
      lowerMask.position.set(0.55, -0.22, 0);
      headGroup.add(lowerMask);

      const balaclavaNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.75, 16), balaclavaMat);
      balaclavaNeck.position.set(0.05, -0.65, 0);
      headGroup.add(balaclavaNeck);

      const cruiserHelmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.45),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.25, metalness: 0.5 })
      );
      cruiserHelmet.position.set(0, 0.12, 0);
      headGroup.add(cruiserHelmet);

      const skullEmblem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.22), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 }));
      skullEmblem.position.set(0.84, 0.42, 0);
      headGroup.add(skullEmblem);

    } else if (isSupersport) {
      // Photo 3: Full-Face Aerodynamic Race Helmet with Open Front & Translucent Visor
      const raceHelmetMat = new THREE.MeshStandardMaterial({ color: outfitCfg.helmetHex || palette.fairing, roughness: 0.15, metalness: 0.35 });
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.94, 22, 18, Math.PI * 0.38, Math.PI * 1.24, 0, Math.PI * 0.82),
        raceHelmetMat
      );
      headGroup.add(shell);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.94, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.35),
        raceHelmetMat
      );
      headGroup.add(crown);

      const chinBar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.38, 0.92), raceHelmetMat);
      chinBar.position.set(0.62, -0.42, 0);
      headGroup.add(chinBar);

      const visorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.40, side: THREE.DoubleSide });
      const visorGeo = new THREE.CylinderGeometry(0.98, 0.98, 0.46, 20, 1, true, -Math.PI * 0.32, Math.PI * 0.64);
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0.04, 0.12, 0);
      headGroup.add(visor);

    } else if (isCafeRacer) {
      // Photo 4: Vintage Open-Face Helmet with Forehead Goggles
      const cafeHelmetMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.4 });
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.94, 22, 18, Math.PI * 0.38, Math.PI * 1.24, 0, Math.PI * 0.82),
        cafeHelmetMat
      );
      headGroup.add(shell);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.94, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.35),
        cafeHelmetMat
      );
      headGroup.add(crown);

      const linerMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
      const liner = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.06, 8, 24), linerMat);
      liner.rotation.y = Math.PI / 2;
      liner.position.set(0.28, -0.05, 0);
      headGroup.add(liner);

      const goggleBand = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.05, 6, 20), linerMat);
      goggleBand.rotation.y = Math.PI / 2;
      goggleBand.position.set(-0.02, 0.35, 0);
      headGroup.add(goggleBand);

      [-0.24, 0.24].forEach(gz => {
        const goggleBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14), darkFrameMat);
        goggleBezel.rotation.z = Math.PI / 2;
        goggleBezel.position.set(0.82, 0.36, gz);
        headGroup.add(goggleBezel);

        const gLens = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 }));
        gLens.position.set(0.88, 0.36, gz);
        headGroup.add(gLens);
      });

    } else {
      // Photo 1 & Photo 6: Open-Face Helmet with Raised Visor exposing Sculpted Human Face
      const openHelmetMat = new THREE.MeshStandardMaterial({
        color: outfitCfg.helmetHex,
        roughness: outfitCfg.streetfighter ? 0.35 : 0.18,
        metalness: 0.3
      });

      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.94, 22, 18, Math.PI * 0.38, Math.PI * 1.24, 0, Math.PI * 0.85),
        openHelmetMat
      );
      headGroup.add(shell);

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.94, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.35),
        openHelmetMat
      );
      headGroup.add(crown);

      const linerMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
      const liner = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.06, 8, 24), linerMat);
      liner.rotation.y = Math.PI / 2;
      liner.position.set(0.28, -0.05, 0);
      headGroup.add(liner);

      const chinStrap = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.04, 6, 16), darkFrameMat);
      chinStrap.rotation.x = Math.PI / 2;
      chinStrap.position.set(0.28, -0.42, 0);
      headGroup.add(chinStrap);

      const visorMat = new THREE.MeshStandardMaterial({
        color: outfitCfg.visorHex || 0x090d16,
        roughness: 0.04,
        metalness: 0.6,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide
      });
      const raisedVisor = new THREE.Mesh(
        new THREE.CylinderGeometry(1.02, 1.02, 0.44, 20, 1, true, -Math.PI * 0.30, Math.PI * 0.60),
        visorMat
      );
      raisedVisor.rotation.z = 0.45;
      raisedVisor.position.set(0.25, 0.52, 0);
      headGroup.add(raisedVisor);
    }

    group.add(headGroup);

    // C. Limbs & Arms
    [-1, 1].forEach(side => {
      if (isCruiser) {
        // Bare Muscular Arms for Cruiser (Photo 2)
        const bareArm = createSeamlessLoftedLimb([
          { p: [0.05, 11.10, side * 1.75], rx: 0.54, ry: 0.54 },
          { p: [0.95, 10.50, side * 2.15], rx: 0.50, ry: 0.50 },
          { p: [1.85, 9.95,  side * 2.10], rx: 0.44, ry: 0.44 },
          { p: [2.65, 9.75,  side * 1.95], rx: 0.36, ry: 0.36 }
        ], 14, 14, skinMat);
        group.add(bareArm);

        const glove = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), darkFrameMat);
        glove.scale.set(1.1, 0.85, 0.95);
        glove.position.set(2.80, 9.75, side * 1.92);
        group.add(glove);

      } else if (isSupersport) {
        // Racing Tuck Arms (Photo 3)
        const raceArm = createSeamlessLoftedLimb([
          { p: [1.35, 10.25, side * 1.65], rx: 0.52, ry: 0.52 },
          { p: [2.05, 9.25,  side * 1.90], rx: 0.46, ry: 0.46 },
          { p: [2.75, 8.45,  side * 1.75], rx: 0.40, ry: 0.40 },
          { p: [3.35, 8.20,  side * 1.60], rx: 0.34, ry: 0.34 }
        ], 14, 14, sleeveMat);
        group.add(raceArm);

        const glove = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), shoeMat);
        glove.position.set(3.45, 8.15, side * 1.58);
        group.add(glove);

      } else {
        // Natural Bent Arms (Photo 1)
        const armMesh = createSeamlessLoftedLimb([
          { p: [0.85, 11.20, side * 1.65], rx: 0.52, ry: 0.52 },
          { p: [1.75, 10.35, side * 1.95], rx: 0.46, ry: 0.46 },
          { p: [2.55, 9.45,  side * 1.92], rx: 0.40, ry: 0.40 },
          { p: [3.20, 8.85,  side * 1.82], rx: 0.34, ry: 0.34 }
        ], 14, 14, sleeveMat);
        group.add(armMesh);

        const glove = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 10), shoeMat);
        glove.scale.set(1.15, 0.85, 0.95);
        glove.position.set(3.32, 8.80, side * 1.80);
        group.add(glove);

        if (outfitCfg.streetfighter) {
          const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.48), whiteMat);
          knuckle.position.set(3.30, 9.10, side * 1.80);
          group.add(knuckle);
        }
      }
    });

    // D. Legs & Boots Hugging the Outside of the Motorcycle
    [-1, 1].forEach(side => {
      if (outfitCfg.shorts && !isCruiser) {
        // Scrambler Cargo Shorts & Bare Calves
        const shortThigh = createSeamlessLoftedLimb([
          { p: [-1.6, 7.10, side * 1.35], rx: 0.72, ry: 0.72 },
          { p: [-0.4, 7.15, side * 1.95], rx: 0.68, ry: 0.68 },
          { p: [0.75, 6.75, side * 2.05], rx: 0.62, ry: 0.62 }
        ], 10, 14, pantsMat);
        group.add(shortThigh);

        const bareCalf = createSeamlessLoftedLimb([
          { p: [0.75, 6.75, side * 2.05], rx: 0.54, ry: 0.54 },
          { p: [-0.15, 5.15, side * 1.92], rx: 0.46, ry: 0.46 },
          { p: [-0.95, 3.65, side * 1.78], rx: 0.36, ry: 0.36 }
        ], 10, 14, skinMat);
        group.add(bareCalf);

      } else {
        // Full Riding Pants hugging outside the tank flank
        const fullLeg = createSeamlessLoftedLimb([
          { p: [-1.6, 7.10, side * 1.35], rx: 0.72, ry: 0.72 },
          { p: [-0.4, 7.15, side * 1.95], rx: 0.66, ry: 0.66 },
          { p: [0.75, 6.75, side * 2.05], rx: 0.58, ry: 0.58 },
          { p: [-0.15, 5.15, side * 1.92], rx: 0.48, ry: 0.48 },
          { p: [-0.95, 3.65, side * 1.78], rx: 0.38, ry: 0.38 }
        ], 18, 14, pantsMat);
        group.add(fullLeg);
      }

      // Footwear / Biker Boots planted on footpegs
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(-0.95, 3.35, side * 1.78);
      shoeGroup.rotation.z = -0.32;

      const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.72, 0.85), shoeMat);
      shoeUpper.position.set(0.2, 0.15, 0);
      shoeGroup.add(shoeUpper);

      const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.90), isCruiser ? darkFrameMat : whiteMat);
      shoeSole.position.set(0.2, -0.22, 0);
      shoeGroup.add(shoeSole);
      group.add(shoeGroup);

      // Footpeg
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.95, 10), darkFrameMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(-1.05, 3.10, side * 1.65);
      group.add(peg);
    });

    // Additive Ground Headlight Pool
    const headGlowMat = new THREE.MeshBasicMaterial({
      map: getRadialGlowTexture(),
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const headGlow = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), headGlowMat);
    headGlow.rotation.x = -Math.PI / 2;
    headGlow.position.set(16, 0.03, 0);
    group.add(headGlow);

    scene.add(group);
    return group;
  }
  window.createRealisticGTABike = createRealisticGTABike;
