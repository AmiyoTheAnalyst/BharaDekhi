import os

code = '''  function createRealisticGTABike(colorHex, appearanceSeed, vData) {
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
    const fairingMat = new THREE.MeshStandardMaterial({ color: palette.fairing, roughness: 0.18, metalness: 0.52 });
    const darkFrameMat = new THREE.MeshStandardMaterial({ color: palette.frame || 0x18181b, roughness: 0.40, metalness: 0.65 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: palette.chrome || 0xf1f5f9, roughness: 0.08, metalness: 0.95 });
    const radiatorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.82 });
    const leatherSeatMat = new THREE.MeshStandardMaterial({ color: palette.seat || 0x090d16, roughness: 0.62 });
    const smokedGlassMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.05, metalness: 0.35, transparent: true, opacity: 0.42, depthWrite: false });

    // ---------------------------------------------------------------------------
    // 1. WHEEL HARDWARE: HOLLOW SPOKE ALLOY WHEELS WITH DISCS & CALIPERS
    // ---------------------------------------------------------------------------
    function buildBikeWheel(wx, wy, radius, isRear) {
      const wPivot = new THREE.Group();
      wPivot.position.set(wx, wy, 0);

      // Deep matte black vulcanized rubber (Zero blue ambient reflection!)
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.92, metalness: 0.02 });
      const tire = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.55, 0.58, 20, 38), tireMat);
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
      const rimHoop = new THREE.Mesh(new THREE.TorusGeometry(radius - 1.12, 0.18, 14, 32), hoopMat);
      rimHoop.scale.z = isRear ? (isCruiser ? 1.65 : 1.35) : 1.0;
      wPivot.add(rimHoop);

      // Central Hub along Z axle
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, isRear ? 1.4 : 1.1, 18), hoopMat);
      hub.rotation.x = Math.PI / 2;
      wPivot.add(hub);

      // Hollow Spokes (Clear empty space between spokes!)
      let spokeCount = 10;
      let spokeRadius = 0.11;
      if (isHyperbike) { spokeCount = 6; spokeRadius = 0.16; }
      else if (isSupersport) { spokeCount = 5; spokeRadius = 0.14; }
      else if (isCafeRacer || outfitIdx === 2) { spokeCount = 20; spokeRadius = 0.055; }
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

      // Gold Brembo Brake Caliper
      const caliperMat = new THREE.MeshStandardMaterial({ color: palette.caliper || 0xd97706, roughness: 0.25, metalness: 0.85 });
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
      // Massive Dual Megaphone Titanium Canisters (Photo 1)
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
      // Shorty Underslung Akrapovič Titanium Race Exhaust (Photo 3)
      const shortyMuffler = createSeamlessLoftedLimb([
        { p: [1.5, 3.2, 0.9], rx: 0.20, ry: 0.20 },
        { p: [-0.5, 2.7, 1.25], rx: 0.32, ry: 0.32 },
        { p: [-2.8, 3.4, 1.45], rx: 0.48, ry: 0.48 }
      ], 10, 14, chromeMat);
      group.add(shortyMuffler);

    } else {
      // Classic Streetfighter: 4 Chrome Headers into Dual Upswept Mufflers
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
      // Bulbous Aero Nose & Broad Body with SHITZU & Kanji Decals (Photo 1)
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

      // Lower Belly-Pan Chin Spoiler
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
        group.add(kneePad);
      });

    } else {
      // Classic Streetfighter (Photo 1): Twin Projector Lamps & Muscular Tank
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

        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), vehicleHeadlightMat || new THREE.MeshBasicMaterial({ color: 0xffffff }));
        lens.position.set(6.72, 7.6, hz);
        group.add(lens);
      });
    }

    // Handlebars & Controls
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
    // 5. ANATOMICAL HUMAN RIDER (SCULPTED 3D FACE, ZERO BALLOONS, ZERO SPIKES)
    // ---------------------------------------------------------------------------
    const torsoColor = isCafeRacer ? 0x5c3826 : (isCruiser ? 0x18181b : outfitCfg.torsoHex);
    const sleeveColor = isCafeRacer ? 0x5c3826 : (isCruiser ? 0x18181b : outfitCfg.sleeveHex);
    const legColor = isCafeRacer ? 0x1e293b : (isCruiser ? 0x111827 : outfitCfg.legHex);

    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: isCafeRacer ? 0.45 : (outfitCfg.varsity ? 0.65 : 0.35) });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: sleeveColor, roughness: 0.38 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.68 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99872, roughness: 0.52 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: isCafeRacer ? 0x4a2c1d : 0x111827, roughness: 0.45 });

    // A. Continuous Lofted Torso (Pelvis -> Waist -> Spine -> Broad Chest -> Shoulders)
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

    // Varsity Back Graphic (only for Varsity outfit, flush on back)
    if (outfitCfg.varsity && !isCruiser && !isCafeRacer) {
      const backBadge = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 2.1),
        new THREE.MeshStandardMaterial({ map: getVarsityBackTexture(), transparent: true, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false })
      );
      backBadge.rotation.y = -Math.PI / 2;
      backBadge.rotation.z = -0.48;
      backBadge.position.set(-1.12, 9.65, 0);
      group.add(backBadge);
    }

    // B. Neck Connection
    const neckMesh = createSeamlessLoftedLimb([
      { p: [isCruiser ? 0.40 : (isSupersport ? 1.75 : 1.25), isCruiser ? 11.65 : (isSupersport ? 10.65 : 11.65), 0], rx: 0.44, ry: 0.44 },
      { p: [isCruiser ? 0.75 : (isSupersport ? 2.15 : 1.65), isCruiser ? 12.45 : (isSupersport ? 11.45 : 12.55), 0], rx: 0.40, ry: 0.40 }
    ], 6, 12, isCruiser ? darkFrameMat : skinMat);
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
    const pupilGlintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const darkHairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const lipsMat = new THREE.MeshStandardMaterial({ color: 0xb55a52, roughness: 0.45 });

    // 1. Natural Skin Cranium Base (Head radius 0.76 - scaled to 1:7.5 proportion)
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 18), skinMat);
    cranium.scale.set(0.92, 1.05, 0.88);
    headGroup.add(cranium);

    // 2. Defined Brow Ridge
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.58), skinMat);
    brow.position.set(0.60, 0.22, 0);
    headGroup.add(brow);

    // 3. Eyebrows & Almond Eyes (Forward Facing)
    [-1, 1].forEach(side => {
      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.22), darkHairMat);
      eyebrow.position.set(0.66, 0.25, side * 0.20);
      eyebrow.rotation.z = -0.08;
      eyebrow.rotation.y = side * 0.06;
      headGroup.add(eyebrow);

      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), eyeWhiteMat);
      eyeWhite.position.set(0.66, 0.14, side * 0.22);
      headGroup.add(eyeWhite);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), darkIrisMat);
      iris.position.set(0.74, 0.14, side * 0.22);
      headGroup.add(iris);

      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), pupilGlintMat);
      glint.position.set(0.79, 0.16, side * 0.20);
      headGroup.add(glint);

      const upperLid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.20), skinMat);
      upperLid.position.set(0.62, 0.16, side * 0.21);
      headGroup.add(upperLid);
    });

    // 4. 3D Sculpted Nose
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.12), skinMat);
    noseBridge.rotation.z = -0.32;
    noseBridge.position.set(0.66, 0.06, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), skinMat);
    noseTip.position.set(0.88, -0.04, 0);
    headGroup.add(noseTip);

    [-1, 1].forEach(side => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
      nostril.position.set(0.73, -0.08, side * 0.095);
      headGroup.add(nostril);
    });

    // 5. Cheekbones
    [-1, 1].forEach(side => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.14), skinMat);
      cheek.position.set(0.48, -0.02, side * 0.35);
      cheek.rotation.y = side * 0.35;
      cheek.rotation.z = -0.20;
      headGroup.add(cheek);
    });

    // 6. Defined Lips & Chiseled Jawline
    const lipUpper = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.055, 0.26), lipsMat);
    lipUpper.position.set(0.76, -0.18, 0);
    headGroup.add(lipUpper);

    const lipLower = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.24), lipsMat);
    lipLower.position.set(0.74, -0.24, 0);
    headGroup.add(lipLower);

    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.36), skinMat);
    chin.position.set(0.66, -0.38, 0);
    headGroup.add(chin);

    [-1, 1].forEach(side => {
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.12), skinMat);
      jaw.position.set(0.20, -0.30, side * 0.36);
      jaw.rotation.y = side * 0.28;
      headGroup.add(jaw);

      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.26, 0.08), skinMat);
      ear.position.set(-0.04, 0.04, side * 0.42);
      headGroup.add(ear);
    });

    // 7. CONTOURED MOTORCYCLE HELMET (FRAMING FACE WITH WIDE OPEN APERTURE)
    const linerMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.90 });

    if (isCruiser) {
      // Photo 2: Tactical Balaclava Mask with Exposed Eyes, Brow & Nose Bridge
      const balaclavaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
      const lowerMask = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.82), balaclavaMat);
      lowerMask.position.set(0.48, -0.24, 0);
      headGroup.add(lowerMask);

      const neckWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.75, 16), balaclavaMat);
      neckWrap.position.set(0.05, -0.65, 0);
      headGroup.add(neckWrap);

      // Skull-Cap Beanie Half-Helmet
      const beanie = new THREE.Mesh(
        new THREE.SphereGeometry(0.86, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.25, metalness: 0.5 })
      );
      beanie.position.set(0, 0.12, 0);
      headGroup.add(beanie);

    } else {
      // Open-Face or Full-Face with Open Aperture (Photos 1, 3, 4)
      const helmetColor = isCafeRacer ? 0x1e293b : (isSupersport ? palette.fairing : (outfitCfg.streetfighter ? 0x111827 : outfitCfg.helmetHex));
      const helmetMat = new THREE.MeshStandardMaterial({
        color: helmetColor,
        roughness: 0.20,
        metalness: isCafeRacer ? 0.35 : 0.45
      });

      // Helmet Crown (covers skull top above forehead Y >= 0.30)
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.86, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.32),
        helmetMat
      );
      crown.position.set(0, 0.06, 0);
      headGroup.add(crown);

      // Back of Skull Wrap (covers back from X <= 0.15 around occipital bone)
      const backCowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.86, 24, 14, Math.PI * 0.50, Math.PI, Math.PI * 0.15, Math.PI * 0.70),
        helmetMat
      );
      backCowl.position.set(-0.04, 0.02, 0);
      headGroup.add(backCowl);

      // Side Cheek Covers
      [-1, 1].forEach(side => {
        const cheekCover = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.10), helmetMat);
        cheekCover.position.set(0.08, -0.06, side * 0.44);
        headGroup.add(cheekCover);
      });

      // Padded Black Leather Liner Rim framing the opening
      const browLiner = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.042, 8, 24, Math.PI * 0.70), linerMat);
      browLiner.rotation.y = Math.PI / 2;
      browLiner.rotation.z = -Math.PI * 0.35;
      browLiner.position.set(0.12, 0.26, 0);
      headGroup.add(browLiner);

      if (isCafeRacer) {
        // Photo 4: Vintage Yellow Bubble Shield (Transparent - face 100% visible inside!)
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
          new THREE.SphereGeometry(0.88, 22, 16, -Math.PI * 0.26, Math.PI * 0.52, Math.PI * 0.15, Math.PI * 0.65),
          bubbleMat
        );
        bubbleShield.position.set(0.15, 0.02, 0);
        headGroup.add(bubbleShield);

      } else if (isSupersport || isHyperbike) {
        // Photos 1 & 3: Full-Face Chin Bar + High-Transparency Smoked Race Visor
        const chinBar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.72), helmetMat);
        chinBar.position.set(0.60, -0.46, 0);
        headGroup.add(chinBar);

        const raceVisorMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.05,
          metalness: 0.40,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const raceVisor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.86, 0.86, 0.38, 20, 1, true, -Math.PI * 0.28, Math.PI * 0.56),
          raceVisorMat
        );
        raceVisor.position.set(0.06, 0.06, 0);
        headGroup.add(raceVisor);

      } else {
        // Photo 1 & Photo 6: Translucent Visor Tilted UP at 35° exposing Sculpted Human Face
        const visorMat = new THREE.MeshStandardMaterial({
          color: outfitCfg.visorHex || 0x090d16,
          roughness: 0.05,
          metalness: 0.40,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const raisedVisor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.86, 0.86, 0.38, 20, 1, true, -Math.PI * 0.26, Math.PI * 0.52),
          visorMat
        );
        raisedVisor.rotation.z = 0.52;
        raisedVisor.position.set(0.18, 0.46, 0);
        headGroup.add(raisedVisor);

        // Chrome Visor Pivot Screws
        [-0.48, 0.48].forEach(pz => {
          const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), chromeMat);
          screw.rotation.x = Math.PI / 2;
          screw.position.set(0.12, 0.20, pz);
          headGroup.add(screw);
        });
      }
    }

    group.add(headGroup);

    // C. Seamless Ball-Socket Shoulders & Limbs (ZERO Sharp Spikes!)
    [-1, 1].forEach(side => {
      const armMat = (isCruiser ? skinMat : sleeveMat);

      // Smooth Deltoid Shoulder Cap Sphere seamlessly parented at shoulder joint
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.50, 16, 12), armMat);
      shoulderCap.position.set(isCruiser ? 0.05 : (isSupersport ? 1.35 : 0.85), isCruiser ? 11.10 : (isSupersport ? 10.25 : 11.20), side * 1.65);
      group.add(shoulderCap);

      let armMesh;
      let handPos;
      if (isCruiser) {
        // Bare Muscular Arms for Cruiser (Photo 2)
        armMesh = createSeamlessLoftedLimb([
          { p: [0.05, 11.10, side * 1.65], rx: 0.48, ry: 0.48 },
          { p: [0.95, 10.50, side * 2.05], rx: 0.44, ry: 0.44 },
          { p: [1.85, 9.95,  side * 2.00], rx: 0.38, ry: 0.38 },
          { p: [2.65, 9.75,  side * 1.90], rx: 0.32, ry: 0.32 }
        ], 14, 14, skinMat);
        handPos = [2.80, 9.75, side * 1.88];

      } else if (isSupersport) {
        // Racing Tuck Arms (Photo 3)
        armMesh = createSeamlessLoftedLimb([
          { p: [1.35, 10.25, side * 1.65], rx: 0.48, ry: 0.48 },
          { p: [2.05, 9.25,  side * 1.85], rx: 0.42, ry: 0.42 },
          { p: [2.75, 8.45,  side * 1.72], rx: 0.36, ry: 0.36 },
          { p: [3.35, 8.20,  side * 1.58], rx: 0.30, ry: 0.30 }
        ], 14, 14, sleeveMat);
        handPos = [3.45, 8.15, side * 1.56];

      } else {
        // Natural Bent Arms (Photo 1)
        armMesh = createSeamlessLoftedLimb([
          { p: [0.85, 11.20, side * 1.65], rx: 0.48, ry: 0.48 },
          { p: [1.75, 10.35, side * 1.90], rx: 0.42, ry: 0.42 },
          { p: [2.55, 9.45,  side * 1.88], rx: 0.36, ry: 0.36 },
          { p: [3.20, 8.85,  side * 1.78], rx: 0.30, ry: 0.30 }
        ], 14, 14, sleeveMat);
        handPos = [3.32, 8.80, side * 1.76];
      }
      group.add(armMesh);

      // Glove & Curled Fingers on Handlebars
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.40, 12, 10), shoeMat);
      glove.scale.set(1.15, 0.85, 0.95);
      glove.position.set(handPos[0], handPos[1], handPos[2]);
      group.add(glove);

      if (outfitCfg.streetfighter || isSupersport) {
        const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.44), whiteMat);
        knuckle.position.set(handPos[0], handPos[1] + 0.22, handPos[2]);
        group.add(knuckle);
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

      // Knee Slider (Racing Puck for Supersport / Hyperbike)
      if (isSupersport || isHyperbike) {
        const slider = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.28), whiteMat);
        slider.position.set(0.85, 6.75, side * 2.25);
        group.add(slider);
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
'''

with open("scratch/new_bike_code.js", "w", encoding="utf-8") as f:
    f.write(code)

print("Generated scratch/new_bike_code.js successfully.")
