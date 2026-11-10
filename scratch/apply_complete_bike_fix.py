# -*- coding: utf-8 -*-
import sys

REPLACEMENT_CODE = r'''    // ---------------------------------------------------------------------------
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
    const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 1.55), darkFrameMat);
    plateFrame.position.set(-0.72, -0.85, 0);
    plateFrame.rotation.order = 'YXZ';
    plateFrame.rotation.y = -Math.PI / 2;
    plateFrame.rotation.x = -0.22; // Upward tilt, 0 sideways roll!
    tailTidy.add(plateFrame);

    // Number Plate Mesh (Centered at Z = 0, Facing backwards towards -X)
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.85),
      new THREE.MeshBasicMaterial({ map: getBikeLicensePlateTexture(), side: THREE.DoubleSide })
    );
    plateMesh.position.set(-0.76, -0.85, 0);
    plateMesh.rotation.order = 'YXZ';
    plateMesh.rotation.y = -Math.PI / 2;
    plateMesh.rotation.x = -0.22; // Level horizontally!
    tailTidy.add(plateMesh);

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
    // 8. ANATOMICAL HUMAN RIDER (NATURAL HANDS, LEGS & ATHLETIC TUCK)
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

    // A. Continuous Smooth Torso (Pelvis -> Spine -> Broad Shoulders)
    let riderTorso;
    let shoulderPos;
    if (isCruiser) {
      // Upright Cruiser Posture (Photo 2)
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.6, 6.90, 0], rx: 0.90, ry: 1.30 },
        { p: [-1.2, 8.25, 0], rx: 1.05, ry: 1.50 },
        { p: [-0.6, 9.85, 0], rx: 1.18, ry: 1.80 },
        { p: [0.10, 11.15, 0], rx: 1.02, ry: 1.88 },
        { p: [0.45, 11.75, 0], rx: 0.58, ry: 0.82 }
      ], 16, 20, torsoMat);
      shoulderPos = { x: 0.15, y: 11.20, z: 1.50 };
    } else if (isSupersport) {
      // Aggressive Racing Tuck (Photo 3)
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.5, 6.95, 0], rx: 0.88, ry: 1.25 },
        { p: [-0.4, 7.95, 0], rx: 1.05, ry: 1.55 },
        { p: [1.10, 8.95, 0], rx: 1.15, ry: 1.75 },
        { p: [2.30, 9.35, 0], rx: 1.02, ry: 1.85 },
        { p: [2.85, 9.60, 0], rx: 0.55, ry: 0.78 }
      ], 16, 20, torsoMat);
      shoulderPos = { x: 2.25, y: 9.40, z: 1.52 };

      // Aerodynamic Racing Leathers Speed Hump (Photo 3)
      const hump = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 16), torsoMat);
      hump.rotation.z = -1.25;
      hump.position.set(0.65, 8.85, 0);
      group.add(hump);

    } else {
      // Standard Sport Riding Tuck (Streetfighter & Cafe Racer - Photos 1 & 4)
      riderTorso = createSeamlessLoftedLimb([
        { p: [-1.5, 6.90, 0], rx: 0.88, ry: 1.25 },
        { p: [-0.7, 8.10, 0], rx: 1.05, ry: 1.50 },
        { p: [0.35, 9.40, 0], rx: 1.15, ry: 1.75 },
        { p: [1.35, 10.25, 0], rx: 1.02, ry: 1.85 },
        { p: [1.85, 10.65, 0], rx: 0.55, ry: 0.78 }
      ], 16, 20, torsoMat);
      shoulderPos = { x: 1.35, y: 10.25, z: 1.50 };
    }
    group.add(riderTorso);

    // Varsity "R*" Back Emblem Decal
    if (outfitCfg.varsity) {
      const backEmblem = new THREE.Mesh(
        new THREE.PlaneGeometry(1.65, 1.65),
        new THREE.MeshBasicMaterial({ map: getVarsityBackTexture(torsoColor), transparent: true, side: THREE.DoubleSide })
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

    // C. Natural Anatomical Arms & Hands Securely Gripping Handlebars
    [-1, 1].forEach(side => {
      const gripTarget = side === -1 ? leftGripPos : rightGripPos;
      const shX = shoulderPos.x;
      const shY = shoulderPos.y;
      const shZ = side * shoulderPos.z;

      // Deltoid Shoulder Cap blending into jacket (matching sleeveMat, NO black ball!)
      const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 14), sleeveMat);
      deltoid.position.set(shX, shY, shZ);
      group.add(deltoid);

      if (isSupersport) {
        // Titanium Outer Shoulder Slider
        const slider = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), chromeMat);
        slider.scale.set(1.2, 0.65, 0.95);
        slider.position.set(shX + 0.1, shY + 0.15, shZ + side * 0.15);
        group.add(slider);
      }

      // Natural Elbow Position
      let elbowPos;
      if (isCruiser) {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.45, shY - 0.75, shZ + side * 0.35];
      } else if (isSupersport) {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.52, shY - 1.25, shZ + side * 0.32];
      } else {
        elbowPos = [shX + (gripTarget[0] - shX) * 0.48, shY - 1.10, shZ + side * 0.30];
      }

      // Upper Arm Bone (Shoulder -> Elbow)
      group.add(createBoneSegment([shX, shY, shZ], elbowPos, 0.50, 0.40, sleeveMat));

      // Elbow Joint Sphere
      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.40, 14, 12), sleeveMat);
      elbowJoint.position.set(elbowPos[0], elbowPos[1], elbowPos[2]);
      group.add(elbowJoint);

      // Forearm Bone (Elbow -> Wrist)
      const wristPos = [
        gripTarget[0] - 0.20,
        gripTarget[1] - 0.05,
        gripTarget[2] - side * 0.08
      ];
      group.add(createBoneSegment(elbowPos, wristPos, 0.40, 0.32, sleeveMat));

      // Gloved Hand wrapping FIRMLY around handlebar grip
      const handGroup = new THREE.Group();
      handGroup.position.set(gripTarget[0], gripTarget[1], gripTarget[2]);

      // Palm & Glove Body
      const gloveBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.40, 0.48), shoeMat);
      handGroup.add(gloveBody);

      // Knuckle Armor Plate
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.44), whiteMat);
      knuckle.position.set(-0.02, 0.18, 0);
      handGroup.add(knuckle);

      // Curled Fingers Wrapping Around the Handlebar Tube
      const curledFingers = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.44, 12), shoeMat);
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

    // D. Natural Legs & Boots Solidly Planted on Footpegs
    [-1, 1].forEach(side => {
      let pegPos;
      let kneePos;
      let footRotZ = 0;

      if (isCruiser) {
        // Forward Controls (Photo 2)
        pegPos = [3.2, 3.8, side * 1.55];
        kneePos = [1.2, 5.8, side * 1.62];
        footRotZ = 0.28;
      } else if (isSupersport) {
        // Aggressive Racing Rearsets (Photo 3)
        pegPos = [-0.6, 4.3, side * 1.35];
        kneePos = [0.85, 6.25, side * 1.65];
        footRotZ = -0.25;
      } else {
        // Mid-Controls (Cafe & Streetfighter)
        pegPos = [0.4, 4.1, side * 1.35];
        kneePos = [1.1, 6.15, side * 1.55];
        footRotZ = 0;
      }

      const hipPos = [-1.4, 6.9, side * 1.15];

      // Hip Joint Sphere
      const hipSphere = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 12), pantsMat);
      hipSphere.position.set(hipPos[0], hipPos[1], hipPos[2]);
      group.add(hipSphere);

      // Muscular Thigh Bone (Hip -> Knee) hugging tank cutouts!
      group.add(createBoneSegment(hipPos, kneePos, 0.72, 0.58, pantsMat));

      // Knee Joint Sphere
      const kneeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 12), pantsMat);
      kneeSphere.position.set(kneePos[0], kneePos[1], kneePos[2]);
      group.add(kneeSphere);

      // Outer Knee Slider Puck (Supersport)
      if (isSupersport) {
        const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14), whiteMat);
        puck.rotation.z = Math.PI / 2;
        puck.position.set(kneePos[0], kneePos[1], side * (Math.abs(kneePos[2]) + 0.35));
        group.add(puck);
      }

      // Calf / Shin Bone (Knee -> Ankle)
      const anklePos = [pegPos[0], pegPos[1] + 0.45, pegPos[2]];
      group.add(createBoneSegment(kneePos, anklePos, 0.58, 0.40, pantsMat));

      // Ankle Joint Sphere
      const ankleSphere = new THREE.Mesh(new THREE.SphereGeometry(0.40, 12, 10), pantsMat);
      ankleSphere.position.set(anklePos[0], anklePos[1], anklePos[2]);
      group.add(ankleSphere);

      // Metal Footpeg rigidly mounted to frame bracket
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

      // Detailed Motorcycle Riding Boot (Planting directly ON TOP OF FOOTPEG!)
      const bootGroup = new THREE.Group();
      bootGroup.position.set(pegPos[0], pegPos[1], pegPos[2]);
      bootGroup.rotation.z = footRotZ;

      const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.36, 0.90, 14), shoeMat);
      bootShaft.position.set(0, 0.40, 0);
      bootGroup.add(bootShaft);

      const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.65, 0.78), shoeMat);
      bootFoot.position.set(0.38, 0.02, 0);
      bootGroup.add(bootFoot);

      const bootSole = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.18, 0.84), isCruiser ? darkFrameMat : whiteMat);
      bootSole.position.set(0.38, -0.32, 0);
      bootGroup.add(bootSole);

      group.add(bootGroup);
    });
'''

with open("scratch/build_master_bike.py", "r", encoding="utf-8") as f:
    orig = f.read()

start_marker = "    // ---------------------------------------------------------------------------\n    // 3. FRONT FORKS & INTEGRATED STEERING HEADSTOCK (Zero Disconnected Forks!)"
end_marker = "    // Zero-Lag Additive Headlight Ground Light Pool"

idx_start = orig.find(start_marker)
if idx_start == -1:
    print("ERROR: start_marker not found!")
    sys.exit(1)

idx_end = orig.find(end_marker)
if idx_end == -1:
    print("ERROR: end_marker not found!")
    sys.exit(1)

new_content = orig[:idx_start] + REPLACEMENT_CODE + "\n" + orig[idx_end:]

with open("scratch/build_master_bike.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print("SUCCESS: Updated scratch/build_master_bike.py with anatomical limbs, colinear forks, and level license plate!")
