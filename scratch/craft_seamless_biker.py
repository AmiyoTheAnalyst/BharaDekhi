import re
import os

print("Crafting seamless watertight biker & diverse faces...")

with open('scratch/build_master_bike.py', 'r', encoding='utf-8') as f:
    code = f.read()

# -----------------------------------------------------------------------------
# 1. REPLACE getRealisticFaceTexture WITH DIVERSE MULTI-FACE GENERATOR
# (Clean Shaven, 5 O'Clock Stubble, Full Groomed Beard, Styled Mustache/Goatee)
# -----------------------------------------------------------------------------
face_pattern = r'  // 1\. High-Resolution Photorealistic Human Face Canvas Texture Generator[\s\S]*?(?=  // 2\. 2x2 Twill Weave Carbon Fiber Texture Generator)'

new_face_code = '''  // 1. High-Resolution Photorealistic Human Face Canvas Texture Generator
  // Generates 4 Distinct Facial Archetypes:
  // - Style 0: Clean-Shaven Sharp Model (Youthful, Chiseled Jaw, Natural Lips, ZERO facial hair)
  // - Style 1: Trimmed 5 O'Clock Designer Stubble (Classic Urban Rider / Streetfighter)
  // - Style 2: Full Groomed Biker Beard & Mustache (Rugged Classic / Cruiser)
  // - Style 3: Sculpted Goatee & Stylized Mustache (Vintage Cafe Racer / Modern Stylist)
  function getRealisticFaceTexture(toneIdx, eyeColorHex, beardStyle) {
    const tones = [
      { skin: '#dfad87', shadow: '#b57a52', brow: '#25160d', lip: '#b35d53', eye: '#3d2516', highlight: '#fae3d2' }, // Light-Medium Warm
      { skin: '#c8926d', shadow: '#9e6745', brow: '#1a1008', lip: '#9e524b', eye: '#24140a', highlight: '#e2b391' }, // Medium South Asian
      { skin: '#9e6a4b', shadow: '#77472b', brow: '#110905', lip: '#7d403a', eye: '#190e08', highlight: '#ba8564' }, // Warm Deep Olive
      { skin: '#d29b74', shadow: '#a66e4a', brow: '#1f130a', lip: '#a6564e', eye: '#2c1a0e', highlight: '#ebc09f' }  // Golden Amber Tan
    ];
    const t = tones[(toneIdx || 0) % tones.length];
    const bStyle = (beardStyle !== undefined) ? (Math.abs(beardStyle) % 4) : ((toneIdx || 0) % 4);
    const key = 'face_' + ((toneIdx || 0) % tones.length) + '_b' + bStyle + '_' + (eyeColorHex || 'def');
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
    ambGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    ambGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.0)');
    ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Forehead Light Center
    const foreGrad = ctx.createRadialGradient(256, 120, 15, 256, 120, 110);
    foreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    foreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = foreGrad;
    ctx.fillRect(150, 40, 212, 140);

    // Natural Brow Ridge Shading & Arches
    ctx.strokeStyle = t.brow;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(175, 184);
    ctx.quadraticCurveTo(215, 168, 246, 178);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(337, 184);
    ctx.quadraticCurveTo(297, 168, 266, 178);
    ctx.stroke();

    // Individual Brow Hair Strokes
    ctx.lineWidth = 2.0;
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

    // Realistic Almond-Shaped Eyes (Sclera, Iris, Pupil, Dual Catchlights)
    [-1, 1].forEach(side => {
      const cx = side === -1 ? 216 : 296;
      const cy = 215;

      // Eye Socket Shadow
      const sockGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 38);
      sockGrad.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
      sockGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = sockGrad;
      ctx.fillRect(cx - 36, cy - 30, 72, 60);

      // Upper Eyelid Crease
      ctx.strokeStyle = t.shadow;
      ctx.lineWidth = 2.2;
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

      // Tear Duct Pink Accent
      ctx.fillStyle = 'rgba(220, 100, 100, 0.45)';
      ctx.beginPath();
      ctx.arc(side === -1 ? cx + 20 : cx - 20, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Iris with Layered Radial Depth
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

      // Studio Reflection Catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 3.2, cy - 3.2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 3.0, cy + 2.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Upper Eyelash Line
      ctx.strokeStyle = '#150a04';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy);
      ctx.quadraticCurveTo(cx, cy - 14, cx + 24, cy);
      ctx.stroke();
    });

    // Sculpted Nose Bridge & Nostril Wings
    const noseShade = ctx.createLinearGradient(236, 180, 276, 180);
    noseShade.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
    noseShade.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
    noseShade.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
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
    noseTip.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
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

    // Philtrum Column
    ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
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

    // Central Lip Highlight
    const lipShine = ctx.createRadialGradient(256, 332, 2, 256, 332, 14);
    lipShine.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
    lipShine.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = lipShine;
    ctx.beginPath();
    ctx.ellipse(256, 332, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // DIVERSE FACIAL HAIR & FACIAL STRUCTURES
    if (bStyle === 0) {
      // -------------------------------------------------------------
      // STYLE 0: CLEAN-SHAVEN (Youthful, Chiseled Jawline, ZERO Beard)
      // -------------------------------------------------------------
      // Clean Jawline Contour & Cleft Chin Highlight
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(175, 340);
      ctx.quadraticCurveTo(256, 440, 337, 340);
      ctx.stroke();

      const chinGlow = ctx.createRadialGradient(256, 375, 4, 256, 375, 30);
      chinGlow.addColorStop(0, t.highlight);
      chinGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = chinGlow;
      ctx.beginPath();
      ctx.arc(256, 375, 30, 0, Math.PI * 2);
      ctx.fill();

    } else if (bStyle === 1) {
      // -------------------------------------------------------------
      // STYLE 1: 5 O'CLOCK DESIGNER STUBBLE (Trimmed Shadow & Stippling)
      // -------------------------------------------------------------
      ctx.fillStyle = 'rgba(15, 10, 8, 0.22)';
      ctx.beginPath();
      ctx.moveTo(172, 315);
      ctx.quadraticCurveTo(256, 425, 340, 315);
      ctx.quadraticCurveTo(356, 360, 256, 440);
      ctx.quadraticCurveTo(154, 360, 172, 315);
      ctx.fill();

      // Upper lip stubble
      ctx.fillStyle = 'rgba(15, 10, 8, 0.18)';
      ctx.beginPath();
      ctx.moveTo(226, 308);
      ctx.quadraticCurveTo(256, 298, 286, 308);
      ctx.quadraticCurveTo(256, 318, 226, 308);
      ctx.fill();

    } else if (bStyle === 2) {
      // -------------------------------------------------------------
      // STYLE 2: FULL GROOMED BIKER BEARD & CONNECTED MUSTACHE
      // -------------------------------------------------------------
      // Full Jaw Beard Base
      ctx.fillStyle = '#140a04';
      ctx.beginPath();
      ctx.moveTo(165, 295);
      ctx.quadraticCurveTo(185, 360, 220, 425);
      ctx.quadraticCurveTo(256, 455, 292, 425);
      ctx.quadraticCurveTo(327, 360, 347, 295);
      ctx.quadraticCurveTo(320, 375, 256, 395);
      ctx.quadraticCurveTo(192, 375, 165, 295);
      ctx.closePath();
      ctx.fill();

      // Full Natural Mustache
      ctx.fillStyle = '#180d05';
      ctx.beginPath();
      ctx.moveTo(218, 306);
      ctx.quadraticCurveTo(256, 294, 294, 306);
      ctx.quadraticCurveTo(304, 332, 284, 338);
      ctx.quadraticCurveTo(256, 322, 228, 338);
      ctx.quadraticCurveTo(208, 332, 218, 306);
      ctx.closePath();
      ctx.fill();

      // Soft feathered hair stroke texture on beard edge
      ctx.strokeStyle = '#23150d';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 35; i++) {
        const bx = 175 + i * 4.6;
        const by = 380 + Math.sin((i / 35) * Math.PI) * 45;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + (i % 2 === 0 ? 3 : -3), by + 8);
        ctx.stroke();
      }

    } else {
      // -------------------------------------------------------------
      // STYLE 3: SCULPTED GOATEE & STYLIZED MUSTACHE (Clean Cheeks)
      // -------------------------------------------------------------
      // Chin Goatee & Soul Patch
      ctx.fillStyle = '#1a0e06';
      ctx.beginPath();
      ctx.moveTo(234, 348);
      ctx.quadraticCurveTo(256, 340, 278, 348);
      ctx.quadraticCurveTo(285, 400, 256, 425);
      ctx.quadraticCurveTo(227, 400, 234, 348);
      ctx.closePath();
      ctx.fill();

      // Styled Mustache
      ctx.fillStyle = '#1a0e06';
      ctx.beginPath();
      ctx.moveTo(222, 308);
      ctx.quadraticCurveTo(256, 298, 290, 308);
      ctx.quadraticCurveTo(300, 326, 282, 330);
      ctx.quadraticCurveTo(256, 320, 230, 330);
      ctx.quadraticCurveTo(212, 326, 222, 308);
      ctx.closePath();
      ctx.fill();
    }

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
# 2. REPLACE SECTION 8 (SOLID WATERTIGHT CLOTHED HUMAN BODY, ZERO HOLES)
# - Continuous Torso & Neck lofted straight into the helmet (zero neck hole!)
# - Continuous Lofted Sleeves (zero shoulder/elbow balls, zero chopstick tubes!)
# - Continuous Lofted Cargo Joggers (zero hip/knee balls!)
# - Solid Contoured Hood Fold (NO TORUS HOLE!)
# - Cleanly Framed Helmet & Ears (NO BLACK MUSTACHE BAR / CHINBAR!)
# -----------------------------------------------------------------------------
section8_pattern = r'    // ---------------------------------------------------------------------------\s*// 8\. ANATOMICAL HUMAN RIDER[\s\S]*?(?=\s*// Zero-Lag Additive Headlight Ground Light Pool)'

new_section8_code = '''    // ---------------------------------------------------------------------------
    // 8. CONTINUOUS SOLID CLOTHED HUMAN RIDER (ZERO HOLES, ORGANIC LOFTS & CLASSY STREETWEAR)
    // ---------------------------------------------------------------------------
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
      color: new THREE.Color(hoodieColor).multiplyScalar(0.74),
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

    // A. CONTINUOUS SOLID TORSO & NECK (Lofted completely from saddle into helmet: ZERO HOLES!)
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

    // Solid Contoured Draped Hood Fold on Upper Back (NO TORUS, ZERO HOLES!)
    const hoodFoldPoints = [
      { p: [shoulderPos.x - 0.20, shoulderPos.y + 0.15, 0], rx: 0.58, ry: 0.88 },
      { p: [shoulderPos.x - 0.60, shoulderPos.y - 0.12, 0], rx: 0.66, ry: 0.96 },
      { p: [shoulderPos.x - 1.00, shoulderPos.y - 0.45, 0], rx: 0.52, ry: 0.78 }
    ];
    const hoodFoldMesh = createSeamlessLoftedLimb(hoodFoldPoints, 14, 16, hoodieMat);
    group.add(hoodFoldMesh);

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

    // B. ANATOMICAL HEAD & DIVERSE 3D HUMAN FACES (CLEAN-SHAVEN, STUBBLE, BEARD, GOATEE)
    const headGroup = new THREE.Group();
    headGroup.position.set(headPosition[0], headPosition[1], headPosition[2]);

    // Head Mesh with Diverse Realistic Facial Canvas (mapped cleanly, radius 0.82)
    const beardStyleIdx = outfitIdx % 4; // 0: Clean-shaven, 1: Stubble, 2: Full Beard, 3: Goatee
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

    // Realistic 3D Eyes (White Sclera + Dark Iris Pupil)
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

    // 3D Sculpted Nose (Bridge & Nostril Bulb)
    const noseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 14), skinMat);
    noseMesh.rotation.z = -Math.PI / 2 + 0.12;
    noseMesh.position.set(0.78, -0.02, 0);
    headGroup.add(noseMesh);

    // 3D Brow Ridge
    const browMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.46), skinMat);
    browMesh.position.set(0.66, 0.18, 0);
    headGroup.add(browMesh);

    // 3D Contoured Ears on both sides
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), skinMat);
      ear.scale.set(0.8, 1.3, 0.4);
      ear.position.set(0.06, 0.02, side * 0.78);
      headGroup.add(ear);
    });

    // Helmet & Visor Framing (NO BLACK MUSTACHE BAR / CHINBAR COVERING THE MOUTH!)
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
        frame.position.set(0.72, 0.30, gz);
        headGroup.add(frame);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.18, 14), goggleLens);
        lens.rotation.y = Math.PI / 2;
        lens.position.set(0.74, 0.30, gz);
        headGroup.add(lens);
      });

    } else {
      // Sport / Cafe / Streetfighter Motorcycle Helmet with Raised/Clean Visor
      const helmetColor = isCafeRacer ? 0x090d16 : (isSupersport ? palette.fairing : (outfitCfg.streetfighter ? 0x111827 : outfitCfg.helmetHex));
      const helmetMat = new THREE.MeshStandardMaterial({
        color: helmetColor,
        roughness: 0.20,
        metalness: isCafeRacer ? 0.35 : 0.60
      });

      // Helmet Shell Crown (top dome)
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.44),
        helmetMat
      );
      crown.position.set(-0.04, 0.06, 0);
      headGroup.add(crown);

      // Rear Shell (wraps back of skull & nape)
      const rearShell = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 28, 16, -Math.PI * 0.65, Math.PI * 1.30, Math.PI * 0.40, Math.PI * 0.50),
        helmetMat
      );
      rearShell.position.set(-0.06, 0.04, 0);
      headGroup.add(rearShell);

      // Padded Black Comfort Liner along helmet rim
      const padLiner = new THREE.Mesh(
        new THREE.TorusGeometry(0.84, 0.08, 10, 24, Math.PI * 1.4),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 })
      );
      padLiner.rotation.x = Math.PI / 2 + 0.15;
      padLiner.position.set(-0.05, 0.04, 0);
      headGroup.add(padLiner);

      if (isCafeRacer) {
        // Photo 4: Vintage Yellow Bubble Shield (Transparent, 100% visible face underneath)
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
        // Raised Polycarbonate Visor (Flipped up at 35° so human face is 100% clean & visible!)
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

    // C. CONTINUOUS LOFTED SLEEVES & NATURAL HANDS (ZERO DISCONNECTED SPHERES!)
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

      // Continuous Lofted Fabric Sleeve (Shoulder -> Upper Arm -> Flared Elbow -> Forearm -> Wrist)
      const sleevePoints = [
        { p: [shX, shY, side * 1.85], rx: 0.78, ry: 0.78 },
        { p: [shX + (elbowPos[0] - shX) * 0.45, shY + (elbowPos[1] - shY) * 0.45, side * 2.22], rx: 0.68, ry: 0.68 },
        { p: [elbowPos[0], elbowPos[1], side * 2.45], rx: 0.62, ry: 0.62 },
        { p: [elbowPos[0] + (wristPos[0] - elbowPos[0]) * 0.55, elbowPos[1] + (wristPos[1] - elbowPos[1]) * 0.55, side * 2.15], rx: 0.54, ry: 0.54 },
        { p: [wristPos[0], wristPos[1], wristPos[2]], rx: 0.45, ry: 0.45 }
      ];
      const sleeveMesh = createSeamlessLoftedLimb(sleevePoints, 16, 18, hoodieMat);
      group.add(sleeveMesh);

      // Ribbed Knit Wrist Cuff clamping onto wrist
      const cuffDir = new THREE.Vector3().subVectors(
        new THREE.Vector3(wristPos[0], wristPos[1], wristPos[2]),
        new THREE.Vector3(elbowPos[0], elbowPos[1], elbowPos[2])
      ).normalize();
      const cuffCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.42, 16), ribbedMat);
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

    // D. CONTINUOUS RELAXED CARGO JOGGERS & RETRO SNEAKERS (ZERO BALL JOINTS!)
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

      // Continuous Lofted Cargo Jogger Leg (Pelvis -> Thigh -> Knee -> Shin -> Ankle)
      const legPoints = [
        { p: [hipPos[0], hipPos[1], side * 1.15], rx: 0.95, ry: 0.95 },
        { p: [hipPos[0] + (kneePos[0] - hipPos[0]) * 0.35, hipPos[1] + (kneePos[1] - hipPos[1]) * 0.35, side * 1.45], rx: 0.85, ry: 0.85 },
        { p: [hipPos[0] + (kneePos[0] - hipPos[0]) * 0.70, hipPos[1] + (kneePos[1] - hipPos[1]) * 0.70, side * 1.60], rx: 0.78, ry: 0.78 },
        { p: [kneePos[0], kneePos[1], kneePos[2]], rx: 0.70, ry: 0.70 },
        { p: [kneePos[0] + (anklePos[0] - kneePos[0]) * 0.50, kneePos[1] + (anklePos[1] - kneePos[1]) * 0.50, side * 1.48], rx: 0.60, ry: 0.60 },
        { p: [anklePos[0], anklePos[1], anklePos[2]], rx: 0.48, ry: 0.48 }
      ];
      const legMesh = createSeamlessLoftedLimb(legPoints, 16, 18, pantsMat);
      group.add(legMesh);

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

print("SUCCESS: Updated scratch/build_master_bike.py with continuous organic lofts and diverse facial archetypes!")
