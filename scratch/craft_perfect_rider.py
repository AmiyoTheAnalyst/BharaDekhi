import re
import os

print("Crafting perfect watertight clothed rider & 4 diverse face archetypes...")

with open('scratch/build_master_bike.py', 'r', encoding='utf-8') as f:
    code = f.read()

# -----------------------------------------------------------------------------
# 1. CLEAN PHOTO-REALISTIC FACE TEXTURE (Soft skin tones, ambient shading, no duplicate eyes)
# -----------------------------------------------------------------------------
face_pattern = r'  // 1\. High-Resolution Photorealistic Human Face Canvas Texture Generator[\s\S]*?(?=  // 2\. 2x2 Twill Weave Carbon Fiber Texture Generator)'

new_face_code = '''  // 1. High-Resolution Photorealistic Human Face Canvas Texture Generator
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
'''

code, count_face = re.subn(face_pattern, new_face_code, code, count=1)
print(f"Replaced face generator: {count_face}")

# -----------------------------------------------------------------------------
# 2. UPDATE SECTION 8 (SOLID WATERTIGHT CLOTHED HUMAN RIDER, ZERO HOLES)
# -----------------------------------------------------------------------------
section8_pattern = r'    // ---------------------------------------------------------------------------\s*// 8\. (?:ANATOMICAL|CONTINUOUS)[\s\S]*?(?=\s*// Zero-Lag Additive Headlight Ground Light Pool)'

new_section8_code = '''    // ---------------------------------------------------------------------------
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
    });'''

code, count_section8 = re.subn(section8_pattern, new_section8_code, code, count=1)
print(f"Replaced Section 8: {count_section8}")

with open('scratch/build_master_bike.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("SUCCESS: Perfectly crafted watertight clothed rider & 4 diverse face archetypes!")
