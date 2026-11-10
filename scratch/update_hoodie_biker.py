import re
import os

with open('scratch/build_master_bike.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update OUTFIT_PRESETS
outfit_pattern = r'const OUTFIT_PRESETS = \[[\s\S]*?\];\s*const outfitCfg = OUTFIT_PRESETS\[outfitIdx\];'

new_outfits = '''const OUTFIT_PRESETS = [
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
    const outfitCfg = OUTFIT_PRESETS[outfitIdx];'''

code, count_outfits = re.subn(outfit_pattern, new_outfits, code, count=1)
print(f"Replaced outfits: {count_outfits}")

# 2. Update Section 8 (Anatomical Human Rider)
section8_pattern = r'    // ---------------------------------------------------------------------------\s*// 8\. ANATOMICAL HUMAN RIDER[\s\S]*?(?=\s*// Zero-Lag Additive Headlight Ground Light Pool)'

new_section8 = '''    // ---------------------------------------------------------------------------
    // 8. ANATOMICAL HUMAN RIDER (CLASSY STREETWEAR HOODIE, CARGO JOGGERS & RETRO SNEAKERS)
    // ---------------------------------------------------------------------------
    // Cohesive Classy Streetwear Materials (Zero disconnected joints!)
    const hoodieColor = (outfitCfg.hoodieHex !== undefined) ? outfitCfg.hoodieHex : outfitCfg.torsoHex;
    const pantsColor = outfitCfg.legHex;
    const shoePrimaryColor = outfitCfg.shoeHex || 0x18181b;
    const shoeAccentColor = outfitCfg.shoeAccentHex || 0xf8fafc;
    const glovesColor = outfitCfg.glovesHex || 0x18181b;

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc8926d, roughness: 0.60, metalness: 0.04 });
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: hoodieColor,
      roughness: 0.85,
      metalness: 0.02
    });
    const ribbedMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hoodieColor).multiplyScalar(0.76),
      roughness: 0.90,
      metalness: 0.01
    });
    const drawstringMat = new THREE.MeshStandardMaterial({
      color: outfitCfg.accentHex || 0xf1f5f9,
      roughness: 0.60,
      metalness: 0.05
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: pantsColor,
      roughness: 0.82,
      metalness: 0.04
    });
    const darkPocketMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(pantsColor).multiplyScalar(0.82),
      roughness: 0.88,
      metalness: 0.02
    });
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoePrimaryColor, roughness: 0.45, metalness: 0.05 });
    const shoeAccentMat = new THREE.MeshStandardMaterial({ color: shoeAccentColor, roughness: 0.35, metalness: 0.05 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55, metalness: 0.02 });
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.05 });
    const glovesMat = new THREE.MeshStandardMaterial({ color: glovesColor, roughness: 0.55, metalness: 0.10 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 });

    // A. Oversized Streetwear Hoodie Torso (Pelvis -> Mid-Spine -> Broad Athletic Chest)
    let riderTorso;
    let shoulderPos;
    if (isCruiser) {
      // Upright Cruiser Stance
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.60, 6.90, 0], rx: 0.95, ry: 1.35 },
        { p: [-1.20, 8.25, 0], rx: 1.10, ry: 1.55 },
        { p: [-0.60, 9.85, 0], rx: 1.25, ry: 1.85 },
        { p: [0.10, 11.15, 0], rx: 1.15, ry: 1.95 },
        { p: [0.45, 11.75, 0], rx: 0.60, ry: 0.85 }
      ], 16, 20, hoodieMat);
      shoulderPos = { x: 0.15, y: 11.20, z: 1.85 };
    } else if (isSupersport) {
      // Aggressive Racing Tuck
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.50, 6.95, 0], rx: 0.92, ry: 1.30 },
        { p: [-0.40, 7.95, 0], rx: 1.10, ry: 1.60 },
        { p: [1.10, 8.95, 0], rx: 1.22, ry: 1.82 },
        { p: [2.30, 9.35, 0], rx: 1.12, ry: 1.90 },
        { p: [2.85, 9.60, 0], rx: 0.58, ry: 0.82 }
      ], 16, 20, hoodieMat);
      shoulderPos = { x: 2.30, y: 9.35, z: 1.82 };
    } else {
      // Standard Sport Riding Tuck (Streetfighter, Cafe Racer & Hyperbike)
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.50, 6.90, 0], rx: 0.92, ry: 1.30 },
        { p: [-0.70, 8.10, 0], rx: 1.10, ry: 1.55 },
        { p: [0.35, 9.40, 0], rx: 1.22, ry: 1.82 },
        { p: [1.35, 10.25, 0], rx: 1.12, ry: 1.90 },
        { p: [1.85, 10.65, 0], rx: 0.58, ry: 0.82 }
      ], 16, 20, hoodieMat);
      shoulderPos = { x: 1.35, y: 10.25, z: 1.85 };
    }
    group.add(riderTorso);

    // Hoodie Front Kangaroo Pouch Pocket
    const pocketGroup = new THREE.Group();
    const pouchX = isCruiser ? -0.40 : (isSupersport ? 1.05 : 0.35);
    const pouchY = isCruiser ? 9.20 : (isSupersport ? 8.45 : 8.85);
    const pouchRotZ = isCruiser ? -0.30 : (isSupersport ? -0.70 : -0.55);
    pocketGroup.position.set(pouchX, pouchY, 0);
    pocketGroup.rotation.z = pouchRotZ;

    const pouchBody = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.85, 1.85), hoodieMat);
    pocketGroup.add(pouchBody);

    // Kangaroo Pocket Slanted Welts / Entry Trim
    [-1, 1].forEach(side => {
      const pocketTrim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.12), ribbedMat);
      pocketTrim.position.set(0.15, 0, side * 0.95);
      pocketTrim.rotation.y = side * 0.25;
      pocketGroup.add(pocketTrim);
    });
    group.add(pocketGroup);

    // Hoodie Bottom Ribbed Hem Gathering (Gathers hoodie fabric over pants)
    const hemP = isCruiser ? [-1.45, 7.35, 0] : (isSupersport ? [-1.20, 7.25, 0] : [-1.30, 7.25, 0]);
    const hemRot = isCruiser ? -0.25 : (isSupersport ? -0.55 : -0.45);
    const hoodieRibHemMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.20, 0.50, 18), ribbedMat);
    hoodieRibHemMesh.position.set(hemP[0], hemP[1], hemP[2]);
    hoodieRibHemMesh.rotation.z = hemRot;
    group.add(hoodieRibHemMesh);

    // Draped Fabric Hood Resting Around Collar & Neck
    const cowlX = shoulderPos.x + 0.15;
    const cowlY = shoulderPos.y + 0.10;
    const cowlRotZ = isCruiser ? -0.25 : (isSupersport ? -0.45 : -0.35);

    // 1. Folded Cowl Ring around neck
    const hoodCowlMesh = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.26, 14, 24), hoodieMat);
    hoodCowlMesh.position.set(cowlX, cowlY, 0);
    hoodCowlMesh.rotation.y = Math.PI / 2;
    hoodCowlMesh.rotation.x = cowlRotZ;
    group.add(hoodCowlMesh);

    // 2. Draped Hood Pouch on Upper Back
    const hoodPouch = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 14), hoodieMat);
    hoodPouch.scale.set(0.85, 0.95, 1.25);
    hoodPouch.position.set(shoulderPos.x - 0.70, shoulderPos.y - 0.15, 0);
    hoodPouch.rotation.z = cowlRotZ + 0.20;
    group.add(hoodPouch);

    // 3. Hanging Streetwear Drawstrings with Silver Metal Aglets
    [-1, 1].forEach(side => {
      const stringX = cowlX + 0.35;
      const stringY = cowlY - 0.50;
      const stringZ = side * 0.42;

      // Cord
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.15, 8), drawstringMat);
      cord.position.set(stringX, stringY, stringZ);
      cord.rotation.z = isSupersport ? -0.35 : -0.15;
      group.add(cord);

      // Silver Metal Aglet Tip
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
      backEmblem.position.set(shoulderPos.x - 1.15, shoulderPos.y - 0.75, 0);
      group.add(backEmblem);
    }

    // B. Anatomical Head with 3D Sculpted Face & Multi-Archetype Helmet
    const headGroup = new THREE.Group();
    headGroup.position.set(
      isCruiser ? 0.65 : (isSupersport ? 3.35 : 2.25),
      isCruiser ? 12.35 : (isSupersport ? 10.15 : 11.25),
      0
    );

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.85, 16), skinMat);
    neck.position.set(-0.25, -0.55, 0);
    neck.rotation.z = isSupersport ? -0.45 : -0.22;
    headGroup.add(neck);

    // Anatomical Head (radius 0.82)
    const headMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 20, 18),
      new THREE.MeshStandardMaterial({
        map: getRealisticFaceTexture(paletteIdx, palette.accent),
        roughness: 0.58,
        metalness: 0.05
      })
    );
    headMesh.rotation.y = -Math.PI / 2;
    headGroup.add(headMesh);

    // 3D Eyes
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const darkIrisMat = new THREE.MeshBasicMaterial({ color: 0x1e1510 });
    [-0.22, 0.22].forEach(ez => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), eyeWhiteMat);
      eyeWhite.position.set(0.68, 0.12, ez);
      headGroup.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), darkIrisMat);
      pupil.position.set(0.76, 0.12, ez);
      headGroup.add(pupil);
    });

    // 3D Sculpted Nose
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

    // Helmets & Visors
    if (isCruiser) {
      // Tactical Balaclava Mask
      const balaclavaMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
      const lowerMask = new THREE.Mesh(new THREE.SphereGeometry(0.82, 20, 14, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.45), balaclavaMat);
      lowerMask.position.set(0, -0.02, 0);
      headGroup.add(lowerMask);

      const skullCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.86, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
        new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.30, metalness: 0.4 })
      );
      skullCap.position.set(0, 0.08, 0);
      headGroup.add(skullCap);

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

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.44),
        helmetMat
      );
      crown.position.set(-0.04, 0.06, 0);
      headGroup.add(crown);

      const rearShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, -Math.PI * 0.65, Math.PI * 1.30, Math.PI * 0.40, Math.PI * 0.50),
        helmetMat
      );
      rearShell.position.set(-0.06, 0.04, 0);
      headGroup.add(rearShell);

      if (isCafeRacer) {
        // Photo 4: Vintage Yellow Bubble Shield
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
        // Photos 1 & 3: Racing Helmet Chin Bar + Smoked Visor
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
        // Streetfighter: Flip-Up Visor Raised at 35°
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

    // C. Natural Classy Streetwear Arms & Sleeves (Wide Dropped Shoulders, Flared Elbows, Ribbed Cuffs)
    [-1, 1].forEach(side => {
      const gripTarget = side === -1 ? leftGripPos : rightGripPos;
      const shX = shoulderPos.x;
      const shY = shoulderPos.y;
      const shZ = side * shoulderPos.z;

      // 1. Relaxed Dropped Shoulder Cap (Seamlessly transitions chest to sleeve)
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), hoodieMat);
      shoulderCap.scale.set(1.15, 0.95, 1.05);
      shoulderCap.position.set(shX, shY, shZ);
      group.add(shoulderCap);

      // 2. Athletic Flared Elbow Position
      // Outward flare: Z extends beyond shoulder and grip to create a relaxed, muscular riding triangle
      let elbowPos;
      if (isCruiser) {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.44, shY - 0.90, side * 2.50];
      } else if (isSupersport) {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.48, shY - 1.20, side * 2.45];
      } else {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.46, shY - 1.05, side * 2.48];
      }

      // 3. Thick Fabric Upper Arm Sleeve (Shoulder -> Elbow)
      group.add(createBoneSegment([shX, shY, shZ], elbowPos, 0.66, 0.54, hoodieMat));

      // 4. Rounded Fabric Elbow Fold
      const elbowCloth = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), hoodieMat);
      elbowCloth.position.set(elbowPos[0], elbowPos[1], elbowPos[2]);
      group.add(elbowCloth);

      // 5. Forearm Sleeve (Elbow -> Wrist)
      const wristPos = [
        gripTarget[0] - 0.22,
        gripTarget[1] - 0.08,
        gripTarget[2] - side * 0.08
      ];
      group.add(createBoneSegment(elbowPos, wristPos, 0.54, 0.46, hoodieMat));

      // 6. Prominent Ribbed Knit Wrist Cuff (Cinches baggy hoodie sleeve at wrist!)
      const cuffDir = new THREE.Vector3().subVectors(
        new THREE.Vector3(wristPos[0], wristPos[1], wristPos[2]),
        new THREE.Vector3(elbowPos[0], elbowPos[1], elbowPos[2])
      ).normalize();
      const cuffCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.44, 16), ribbedMat);
      cuffCyl.position.set(wristPos[0], wristPos[1], wristPos[2]);
      cuffCyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cuffDir);
      group.add(cuffCyl);

      // 7. Leather Riding Gloves Emerging from under the Ribbed Cuff
      const handGroup = new THREE.Group();
      handGroup.position.set(gripTarget[0], gripTarget[1], gripTarget[2]);

      // Palm & Glove Body
      const gloveBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.42, 0.50), glovesMat);
      handGroup.add(gloveBody);

      // Knuckle Armor Plate
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.46), whiteMat);
      knuckle.position.set(-0.02, 0.19, 0);
      handGroup.add(knuckle);

      // Curled Leather Fingers Wrapping Around the Handlebar Tube
      const curledFingers = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.46, 14), glovesMat);
      curledFingers.rotation.x = Math.PI / 2;
      curledFingers.position.set(0.18, -0.08, 0);
      handGroup.add(curledFingers);

      // Brake / Clutch Control Levers extending forward along bar
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), chromeMat);
      lever.rotation.x = Math.PI / 2 + (side * 0.12);
      lever.position.set(0.35, 0.05, -side * 0.25);
      handGroup.add(lever);

      group.add(handGroup);
    });

    // D. Relaxed Cargo Jogger Pants & Two-Tone Retro High-Top Sneakers
    // Completely encasing hips, knees, and ankles under stylish streetwear cloth!
    [-1, 1].forEach(side => {
      let pegPos;
      let kneePos;
      let footRotZ = 0;

      if (isCruiser) {
        // Forward Controls (Photo 2)
        pegPos = [3.20, 3.80, side * 1.55];
        kneePos = [1.20, 5.80, side * 1.65];
        footRotZ = 0.28;
      } else if (isSupersport) {
        // Aggressive Racing Rearsets (Photo 3)
        pegPos = [-0.60, 4.30, side * 1.35];
        kneePos = [0.85, 6.25, side * 1.68];
        footRotZ = -0.25;
      } else {
        // Mid-Controls (Streetfighter, Cafe Racer & Hyperbike)
        pegPos = [0.40, 4.10, side * 1.35];
        kneePos = [1.10, 6.15, side * 1.60];
        footRotZ = 0;
      }

      const hipPos = [-1.40, 6.90, side * 1.15];

      // 1. Relaxed Cotton Pelvis / Seat Volume (Completely covers saddle & hip joint)
      const seatFabric = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 14), pantsMat);
      seatFabric.scale.set(1.20, 0.90, 1.30);
      seatFabric.position.set(hipPos[0], hipPos[1], hipPos[2]);
      group.add(seatFabric);

      // 2. Baggy Cargo Thigh (Hip -> Knee) hugging tank cutouts
      group.add(createBoneSegment(hipPos, kneePos, 0.82, 0.66, pantsMat));

      // 3. 3D Cargo Bellows Flap Pocket on outer thigh
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

      // 4. Natural Fabric Knee Fold (bridges thigh to calf smoothly)
      const kneeFabric = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 14), pantsMat);
      kneeFabric.position.set(kneePos[0], kneePos[1], kneePos[2]);
      group.add(kneeFabric);

      // 5. Tapered Jogger Shin (Knee -> Ankle)
      const anklePos = [pegPos[0], pegPos[1] + 0.55, pegPos[2]];
      group.add(createBoneSegment(kneePos, anklePos, 0.66, 0.50, pantsMat));

      // 6. Elastic Ribbed Jogger Ankle Cuff (Cinches jogger above sneaker collar!)
      const legDir = new THREE.Vector3().subVectors(
        new THREE.Vector3(anklePos[0], anklePos[1], anklePos[2]),
        new THREE.Vector3(kneePos[0], kneePos[1], kneePos[2])
      ).normalize();
      const ankleCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.50, 0.42, 16), ribbedMat);
      ankleCuff.position.set(anklePos[0], anklePos[1], anklePos[2]);
      ankleCuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), legDir);
      group.add(ankleCuff);

      // 7. Metal Knurled Footpeg rigidly mounted to frame
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.95, 12), chromeMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(pegPos[0], pegPos[1] - 0.22, side * (Math.abs(pegPos[2]) - 0.15));
      group.add(peg);

      const pegBracket = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.25), darkFrameMat);
      pegBracket.position.set(pegPos[0] - 0.15, pegPos[1] + 0.15, side * (Math.abs(pegPos[2]) - 0.45));
      group.add(pegBracket);

      // Gear Shifter (Left) / Rear Brake (Right)
      const pedal = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8), chromeMat);
      pedal.rotation.x = Math.PI / 2;
      pedal.position.set(pegPos[0] + 0.85, pegPos[1] - 0.15, side * Math.abs(pegPos[2]));
      group.add(pedal);

      // 8. Classy Two-Tone High-Top Retro Streetwear Sneaker (Jordan / Dunk Silhouette!)
      const sneakerGroup = new THREE.Group();
      sneakerGroup.position.set(pegPos[0], pegPos[1], pegPos[2]);
      sneakerGroup.rotation.z = footRotZ;

      // High-Top Padded Ankle Collar (fits neatly under jogger cuff)
      const highTopCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.75, 14), shoeMat);
      highTopCollar.position.set(0, 0.36, 0);
      sneakerGroup.add(highTopCollar);

      // Thick White / Sail Rubber Cupsole Midsole
      const midsole = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.26, 0.88), soleMat);
      midsole.position.set(0.38, -0.25, 0);
      sneakerGroup.add(midsole);

      // Textured Dark Rubber Outsole Tread
      const outsole = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.08, 0.92), treadMat);
      outsole.position.set(0.38, -0.38, 0);
      sneakerGroup.add(outsole);

      // Main Leather Quarter & Heel Counter
      const shoeQuarter = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.58, 0.84), shoeMat);
      shoeQuarter.position.set(0.08, 0.05, 0);
      sneakerGroup.add(shoeQuarter);

      // Distinct Contrasting Leather Toe Box & Front Mudguard
      const toeBox = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.80), shoeAccentMat);
      toeBox.position.set(0.74, -0.02, 0);
      sneakerGroup.add(toeBox);

      // Padded Tongue & Laced Eyestay
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.46), shoeAccentMat);
      tongue.position.set(0.35, 0.28, 0);
      tongue.rotation.z = -0.30;
      sneakerGroup.add(tongue);

      group.add(sneakerGroup);
    });'''

code, count_section8 = re.subn(section8_pattern, new_section8, code, count=1)
print(f"Replaced Section 8: {count_section8}")

with open('scratch/build_master_bike.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("SUCCESS: Updated scratch/build_master_bike.py!")
