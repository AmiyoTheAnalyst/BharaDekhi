/**
 * BharaDekhi — Dhaka Mirpur 10 Crossroads
 * Genuine 3D Miniature Diorama Engine using Three.js (WebGL)
 * 
 * Target Architecture:
 * - Upright extruded 3D buildings standing perpendicular to ground with real depth walls,
 *   illuminated window facades, rooftop water tanks on steel legs, antennas with blinking beacons,
 *   shop awnings, and authentic Bengali signboards.
 * - Elevated Metro Rail viaduct with concrete piers, cantilever hammerhead caps, continuous
 *   box-girder beam with Bangladesh green & red ribbon stripes, dual cyan rails, and Mirpur 10 Station
 *   with arched translucent canopy and platform boarding badge.
 * - 3-coach Metro Rail train with headlights and passenger windows.
 * - Road network with asphalt plane, white dashed lane markings, yellow stop lines, zebra crosswalks,
 *   sidewalk slabs with yellow/black curbs, miniature trees, and 4 corner streetlights with point lights.
 * - Complete 3D vehicle fleet (Buses, Cars, CNGs, Rickshaws, Bikes, Ambulance with flashing strobes).
 * - 4 Corner 3D traffic signal posts synchronized with live signal phases.
 * - Interactive aerial drone camera with smooth mouse banking & parallax.
 */

(function() {
  'use strict';

  let scene, camera, renderer;
  let canvasEl, containerEl;
  let isInitialized = false;
  let isReady = false;

  // Scene elements
  let sunLight, ambientLight;
  let cornerPointLights = [];
  let trainGroup, boardingBadgeMesh;
  let ambulanceGroup, ambStrobeRed, ambStrobeBlue;
  let signalLamps = {
    nw: {}, ne: {}, sw: {}, se: {}
  };
  let vehicleMeshMap = {};
  let pedMeshMap = {};
  let rainParticles = null;

  // Camera & Mouse control
  let mouseRelX = 0, mouseRelY = 0;
  let targetCamX = -20, targetCamY = 420;
  const CAM_DEFAULT_POS = { x: -20, y: 420, z: 500 };
  const CAM_DEFAULT_LOOK = { x: 0, y: 25, z: -35 };
  let camBasePos = { x: -20, y: 420, z: 500 };
  let camBaseLook = { x: 0, y: 25, z: -35 };

  function updateCameraFraming(aspect) {
    if (!camera) return;
    const baseFov = 38;
    if (aspect < 1.15) {
      // Portrait / vertical mobile and small tablet displays (aspect < 1.15)
      // Smoothly scale FOV and zoom distance to keep all crossroads, roads, viaduct and buildings visible
      const portraitFactor = Math.max(0, Math.min(1, (1.15 - aspect) / 0.70));
      camera.fov = baseFov + portraitFactor * 10;
      const zoomFactor = 1 + portraitFactor * 0.42;

      const lookY = 25 + portraitFactor * 12;
      const lookZ = -35;
      camBaseLook.x = 0;
      camBaseLook.y = lookY;
      camBaseLook.z = lookZ;

      camBasePos.x = -20;
      camBasePos.y = lookY + (420 - 25) * zoomFactor;
      camBasePos.z = lookZ + (500 - (-35)) * zoomFactor;

      camera.position.set(camBasePos.x, camBasePos.y, camBasePos.z);
      camera.lookAt(camBaseLook.x, camBaseLook.y, camBaseLook.z);
    } else {
      // Landscape / Desktop / Wide displays
      camera.fov = baseFov;
      camBasePos.x = CAM_DEFAULT_POS.x;
      camBasePos.y = CAM_DEFAULT_POS.y;
      camBasePos.z = CAM_DEFAULT_POS.z;
      camBaseLook.x = CAM_DEFAULT_LOOK.x;
      camBaseLook.y = CAM_DEFAULT_LOOK.y;
      camBaseLook.z = CAM_DEFAULT_LOOK.z;
      camera.position.set(camBasePos.x, camBasePos.y, camBasePos.z);
      camera.lookAt(camBaseLook.x, camBaseLook.y, camBaseLook.z);
    }
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  // Performance caches & 120 FPS optimization resources
  let whiteMarkMat = null;
  let yellowMarkMat = null;
  let sidewalkMat = null;
  let curbMat = null;
  let treeTrunkGeo = null, treeTrunkMat = null;
  let treeFoliageGeo = null, treeFoliageMat = null;
  let vehicleHeadlightMat = null;
  let vehicleTaillightMat = null;
  let vehicleIndicatorMat = null;
  let vehicleGlassMat = null;
  let vehicleBumperMat = null;
  let sharedWheelMat = null;
  let sharedRimMat = null;
  let sharedWheelGeos = {};
  let sharedFleshMat = null;
  let sharedPantsMat = null;
  let sharedShoeMat = null;
  let sharedHairMat = null;
  let sharedPedTorsoGeo = null;
  let sharedPedNeckGeo = null;
  let sharedPedHeadGeo = null;
  let sharedPedHairGeo = null;
  let sharedPedLegGeo = null;
  let sharedPedFootGeo = null;
  let sharedPedArmGeo = null;
  let sharedPedHandGeo = null;
  let sharedUmbShaftGeo = null;
  let sharedUmbCanopyGeo = null;
  let sharedUmbTipGeo = null;
  let sharedUmbHandleGeo = null;
  let sharedUmbShaftMat = null;
  let sharedBuildingDepthMat = null;
  let lastSignalStateKey = '';
  let roadMaterial = null;
  let rainSpeeds = null;
  let rainLengths = null;
  const rainCount = 1200;

  function getSharedBuildingDepthMat() {
    if (!sharedBuildingDepthMat) {
      sharedBuildingDepthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    }
    return sharedBuildingDepthMat;
  }

  // Performance telemetry & adaptive quality regulator
  let perfFrameCount = 0;
  let perfTotalCpuMs = 0;
  let perfLastSampleTime = performance.now();
  let currentFps = 120;
  let avgFrameTimeMs = 8.33;

  function getSharedWheelGeo(radius, height, segments) {
    const key = `${radius}_${height}_${segments}`;
    if (!sharedWheelGeos[key]) {
      sharedWheelGeos[key] = new THREE.CylinderGeometry(radius, radius, height, segments);
    }
    return sharedWheelGeos[key];
  }

  function freezeStatic(obj) {
    if (!obj) return;
    obj.matrixAutoUpdate = false;
    obj.updateMatrix();
    if (obj.children && obj.children.length > 0) {
      for (let i = 0; i < obj.children.length; i++) {
        freezeStatic(obj.children[i]);
      }
    }
  }

  // Texture generator helpers
  function createSignboardTexture(title, subtitle, bgColor, textColor, subColor, borderColor, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width || 256;
    canvas.height = height || 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = Math.max(3, Math.floor(canvas.height * 0.06));
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    }

    ctx.fillStyle = textColor;
    ctx.font = 'bold ' + Math.floor(canvas.height * 0.44) + "px 'Noto Sans Bengali', 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, subtitle ? canvas.height * 0.38 : canvas.height / 2);

    if (subtitle) {
      ctx.fillStyle = subColor || '#38bdf8';
      ctx.font = 'bold ' + Math.floor(canvas.height * 0.26) + "px 'Segoe UI', sans-serif";
      ctx.fillText(subtitle, canvas.width / 2, canvas.height * 0.76);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  function createWindowFacadeTexture(floors, cols, winColor, wallColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, 256, 256);

    const floorH = 256 / floors;
    const colW = 256 / cols;

    for (let f = 0; f < floors; f++) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, f * floorH + floorH - 4, 256, 4);

      for (let c = 0; c < cols; c++) {
        const x = c * colW + colW * 0.18;
        const y = f * floorH + floorH * 0.22;
        const w = colW * 0.64;
        const h = floorH * 0.52;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

        ctx.fillStyle = winColor;
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x + w / 2 - 1, y, 2, h);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // Road Marking Batcher: Combines all static lane dashes, stop lines, and zebra crosswalks into 2 unified draw calls
  class RoadMarkingBatcher {
    constructor() {
      this.positions = [];
      this.indices = [];
      this.vertCount = 0;
    }

    addRect(w, l, cx, cz) {
      const hw = w / 2;
      const hl = l / 2;
      const y = 0.25;
      const baseIdx = this.vertCount;

      this.positions.push(
        cx - hw, y, cz - hl,
        cx + hw, y, cz - hl,
        cx + hw, y, cz + hl,
        cx - hw, y, cz + hl
      );

      this.indices.push(
        baseIdx, baseIdx + 2, baseIdx + 1,
        baseIdx, baseIdx + 3, baseIdx + 2
      );

      this.vertCount += 4;
    }

    buildMesh(material) {
      if (this.positions.length === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
      geo.setIndex(this.indices);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, material);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      return mesh;
    }
  }

  // Road Markings Helper
  function addRoadMarking(w, l, x, z, color) {
    if (!whiteMarkMat) whiteMarkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    if (!yellowMarkMat) yellowMarkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const markGeo = new THREE.PlaneGeometry(w, l);
    const markMat = color === 0xfacc15 ? yellowMarkMat : whiteMarkMat;
    const m = new THREE.Mesh(markGeo, markMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.25, z);
    m.matrixAutoUpdate = false;
    m.updateMatrix();
    scene.add(m);
    return m;
  }

  function addCrosswalk(isVertical, cx, cz, length, width) {
    const stripes = 12;
    for (let i = 0; i < stripes; i++) {
      if (isVertical) {
        const z = cz - length / 2 + (i + 0.5) * (length / stripes);
        addRoadMarking(width, (length / stripes) * 0.6, cx, z, 0xffffff);
      } else {
        const x = cx - length / 2 + (i + 0.5) * (length / stripes);
        addRoadMarking((length / stripes) * 0.6, width, x, cz, 0xffffff);
      }
    }
  }

  // Sidewalk Corners with Curbs
  function addSidewalkCorner(w, d, x, z) {
    if (!sidewalkMat) sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    if (!curbMat) curbMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 });

    const swGeo = new THREE.BoxGeometry(w, 2, d);
    const sw = new THREE.Mesh(swGeo, sidewalkMat);
    sw.position.set(x, 1, z);
    sw.receiveShadow = true;
    sw.matrixAutoUpdate = false;
    sw.updateMatrix();
    scene.add(sw);

    const curbGeo = new THREE.BoxGeometry(w, 2.5, 3);
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(x, 1.25, z > 0 ? z - d / 2 : z + d / 2);
    curb.matrixAutoUpdate = false;
    curb.updateMatrix();
    scene.add(curb);
  }

  // Miniature Trees
  function addTree(x, z) {
    if (!treeTrunkGeo) treeTrunkGeo = new THREE.CylinderGeometry(1.2, 1.8, 10, 8);
    if (!treeTrunkMat) treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    if (!treeFoliageGeo) treeFoliageGeo = new THREE.SphereGeometry(7.5, 10, 10);
    if (!treeFoliageMat) treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 2, z);

    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    trunk.position.y = 5;
    treeGroup.add(trunk);

    const foliage = new THREE.Mesh(treeFoliageGeo, treeFoliageMat);
    foliage.position.y = 12;
    foliage.scale.set(1, 1.2, 1);
    treeGroup.add(foliage);

    freezeStatic(treeGroup);
    scene.add(treeGroup);
  }

  // 3D Building Builder
  function create3DBuilding(config) {
    const {
      x, z, width, depth, height,
      wallColor, sideColor, roofColor,
      floors, cols, winColor,
      signboard, waterTank, antenna
    } = config;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const frontTex = createWindowFacadeTexture(floors || 4, cols || 4, winColor || '#fef08a', wallColor);
    const sideTex = createWindowFacadeTexture(floors || 4, Math.max(2, Math.floor((cols || 4) * 0.6)), winColor || '#fef08a', sideColor || wallColor);

    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      roughness: 0.6,
      metalness: 0.1,
      emissive: new THREE.Color(winColor || 0xfef08a),
      emissiveMap: frontTex,
      emissiveIntensity: 0.45
    });
    const sideMat = new THREE.MeshStandardMaterial({
      map: sideTex,
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(winColor || 0xfef08a),
      emissiveMap: sideTex,
      emissiveIntensity: 0.35
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofColor || 0x1e293b,
      roughness: 0.8
    });
    const bottomMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const materials = [
      sideMat,   // px
      sideMat,   // nx
      roofMat,   // py (Roof)
      bottomMat, // ny
      frontMat,  // pz (Front)
      sideMat    // nz
    ];

    const bldgGeo = new THREE.BoxGeometry(width, height, depth);
    const bldg = new THREE.Mesh(bldgGeo, materials);
    bldg.position.y = height / 2;
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    bldg.customDepthMaterial = getSharedBuildingDepthMat();
    group.add(bldg);

    // Rooftop Parapet Rim
    const rimGeo = new THREE.BoxGeometry(width + 2, 3, depth + 2);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = height + 1.5;
    group.add(rim);

    // Rooftop Water Tank
    if (waterTank) {
      const tankGeo = new THREE.CylinderGeometry(8, 8, 14, 16);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4 });
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(-width * 0.25, height + 10, -depth * 0.15);
      group.add(tank);

      const legGeo = new THREE.CylinderGeometry(0.8, 0.8, 6, 6);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      [-4, 4].forEach(lx => {
        [-4, 4].forEach(lz => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(-width * 0.25 + lx, height + 3, -depth * 0.15 + lz);
          group.add(leg);
        });
      });
    }

    // Rooftop Radio/Cell Antenna with Flashing Obstacle Beacon
    if (antenna) {
      const antGeo = new THREE.CylinderGeometry(0.6, 1.2, 28, 8);
      const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(width * 0.25, height + 14, -depth * 0.15);
      group.add(ant);

      const beaconGeo = new THREE.SphereGeometry(1.8, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(width * 0.25, height + 28, -depth * 0.15);
      group.add(beacon);
    }

    // Shop Signboard and Awning
    if (signboard) {
      const sTex = createSignboardTexture(signboard.text, signboard.sub, signboard.bg, signboard.textCol, signboard.subCol, signboard.border, signboard.tw, signboard.th);
      const sGeo = new THREE.BoxGeometry(signboard.w, signboard.h, 2.5);
      const sMat = new THREE.MeshBasicMaterial({ map: sTex });
      const signMesh = new THREE.Mesh(sGeo, sMat);
      signMesh.position.set(signboard.ox || 0, signboard.y || 16, (depth / 2) + 1.5);
      group.add(signMesh);

      const awnGeo = new THREE.BoxGeometry(signboard.w + 4, 3, 10);
      const awnMat = new THREE.MeshStandardMaterial({ color: signboard.awnCol || 0xb45309, roughness: 0.5 });
      const awn = new THREE.Mesh(awnGeo, awnMat);
      awn.position.set(signboard.ox || 0, (signboard.y || 16) + signboard.h / 2 + 1.5, (depth / 2) + 5);
      awn.rotation.x = 0.25;
      group.add(awn);
    }

    freezeStatic(group);
    scene.add(group);
    return group;
  }

  // 3D Traffic Signal Post Builder
  function createTrafficSignalPost(x, z, rotY) {
    const sigGroup = new THREE.Group();
    sigGroup.position.set(x, 0, z);
    sigGroup.rotation.y = rotY || 0;

    const poleGeo = new THREE.CylinderGeometry(1.2, 1.5, 32, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 16;
    sigGroup.add(pole);

    const boxGeo = new THREE.BoxGeometry(7, 18, 5);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(0, 26, 0);
    sigGroup.add(box);

    const hoodGeo = new THREE.BoxGeometry(5.5, 1.2, 4);
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x090d16 });

    // 3 Lamps: Red (top), Yellow (mid), Green (bot)
    const lampGeo = new THREE.CircleGeometry(1.8, 16);

    const rMat = new THREE.MeshBasicMaterial({ color: 0x200508 });
    const rLamp = new THREE.Mesh(lampGeo, rMat);
    rLamp.position.set(0, 31, 2.6);
    sigGroup.add(rLamp);

    const rHood = new THREE.Mesh(hoodGeo, hoodMat);
    rHood.position.set(0, 32.5, 2.5);
    sigGroup.add(rHood);

    const yMat = new THREE.MeshBasicMaterial({ color: 0x261a02 });
    const yLamp = new THREE.Mesh(lampGeo, yMat);
    yLamp.position.set(0, 26, 2.6);
    sigGroup.add(yLamp);

    const yHood = new THREE.Mesh(hoodGeo, hoodMat);
    yHood.position.set(0, 27.5, 2.5);
    sigGroup.add(yHood);

    const gMat = new THREE.MeshBasicMaterial({ color: 0x02210f });
    const gLamp = new THREE.Mesh(lampGeo, gMat);
    gLamp.position.set(0, 21, 2.6);
    sigGroup.add(gLamp);

    const gHood = new THREE.Mesh(hoodGeo, hoodMat);
    gHood.position.set(0, 22.5, 2.5);
    sigGroup.add(gHood);

    freezeStatic(sigGroup);
    scene.add(sigGroup);
    return { group: sigGroup, red: rMat, yellow: yMat, green: gMat };
  }

  // 3D Canonical Vehicle Builders (all built facing +X direction)
  function create3DVehicle(type, colorHex) {
    if (!sharedWheelMat) sharedWheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    if (!sharedRimMat) sharedRimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.35, metalness: 0.75 });
    if (!vehicleHeadlightMat) vehicleHeadlightMat = new THREE.MeshBasicMaterial({ color: 0xfff08a });
    if (!vehicleTaillightMat) vehicleTaillightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    if (!vehicleIndicatorMat) vehicleIndicatorMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    if (!vehicleGlassMat) vehicleGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.6 });
    if (!vehicleBumperMat) vehicleBumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const group = new THREE.Group();

    if (type === 'bus') {
      const length = 76;
      const width = 22;
      const height = 22;

      // Lower Chassis Body
      const bodyGeo = new THREE.BoxGeometry(length, 10, width);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex || 0xdc2626, roughness: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 8;
      body.castShadow = true;
      group.add(body);

      // Dhaka Transit Green Accent Stripe
      const strGeo = new THREE.BoxGeometry(length + 0.4, 1.8, width + 0.4);
      const strMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
      const str = new THREE.Mesh(strGeo, strMat);
      str.position.y = 12.2;
      group.add(str);

      // Upper Passenger Cabin with Windows
      const cabGeo = new THREE.BoxGeometry(length * 0.98, 7.5, width * 0.96);
      const cabMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.y = 16.5;
      group.add(cab);

      // White Aerodynamic Roof Cap
      const roofGeo = new THREE.BoxGeometry(length, 2.5, width);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 20.8;
      group.add(roof);

      // Passenger Side Glass Windows
      const winGeo = new THREE.BoxGeometry(length * 0.88, 5, width + 0.4);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.y = 16.5;
      group.add(win);

      // Front Windshield
      const fWinGeo = new THREE.BoxGeometry(1.4, 7.0, width * 0.9);
      const fWin = new THREE.Mesh(fWinGeo, winMat);
      fWin.position.set(length / 2 - 0.2, 16.5, 0);
      group.add(fWin);

      // Front Destination LED Route Board (Mirpur 10)
      const destTex = createSignboardTexture('মিরপুর ১০', 'MIRPUR 10', '#0f172a', '#fef08a', '#38bdf8', '#facc15', 128, 48);
      const destGeo = new THREE.BoxGeometry(1.5, 4.2, 14);
      const dest = new THREE.Mesh(destGeo, new THREE.MeshBasicMaterial({ map: destTex }));
      dest.position.set(length / 2 + 0.4, 19.5, 0);
      group.add(dest);

      // Heavy Duty Bumpers & License Plate
      const fBumpGeo = new THREE.BoxGeometry(2.0, 3.6, width + 0.8);
      const fBump = new THREE.Mesh(fBumpGeo, vehicleBumperMat);
      fBump.position.set(length / 2 + 0.8, 4.0, 0);
      group.add(fBump);

      const rBumpGeo = new THREE.BoxGeometry(2.0, 3.6, width + 0.8);
      const rBump = new THREE.Mesh(rBumpGeo, vehicleBumperMat);
      rBump.position.set(-length / 2 - 0.8, 4.0, 0);
      group.add(rBump);

      // Left & Right Side Mirrors
      const mirrorGeo = new THREE.BoxGeometry(1.6, 3.2, 1.2);
      [-1, 1].forEach(side => {
        const mirror = new THREE.Mesh(mirrorGeo, vehicleBumperMat);
        mirror.position.set(length / 2 - 2, 15, side * (width / 2 + 1.6));
        group.add(mirror);
      });

      // 4 Wheels touching ground (radius 4.0, center y = 4.0)
      const wheelGeo = getSharedWheelGeo(4.0, 2.2, 12);
      const rimGeo = getSharedWheelGeo(2.2, 2.3, 10);

      [-1, 1].forEach(wz => {
        [-23, 23].forEach(wx => {
          const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 4.0, wz * (width / 2));
          group.add(wheel);

          const rim = new THREE.Mesh(rimGeo, sharedRimMat);
          rim.rotation.x = Math.PI / 2;
          rim.position.set(wx, 4.0, wz * (width / 2));
          group.add(rim);
        });
      });

      // Front Headlight Clusters (White beam + Amber Indicator)
      const hlGeo = new THREE.BoxGeometry(1.2, 2.8, 3.6);
      [-6, 6].forEach(hz => {
        const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
        hl.position.set(length / 2 + 0.7, 6.5, hz);
        group.add(hl);
      });

      // Red Taillight Bars
      const tlGeo = new THREE.BoxGeometry(1.2, 4.5, 2.5);
      [-7, 7].forEach(tz => {
        const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
        tl.position.set(-length / 2 - 0.7, 7.5, tz);
        group.add(tl);
      });

    } else if (type === 'car') {
      const length = 44;
      const width = 18;
      const height = 13;

      // Sedan Aerodynamic Contoured Body: Hood, Cabin, Trunk
      const hoodGeo = new THREE.BoxGeometry(14, 4.5, width - 0.4);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex || 0xf8fafc, roughness: 0.3, metalness: 0.25 });
      const hood = new THREE.Mesh(hoodGeo, bodyMat);
      hood.position.set(13, 4.8, 0);
      group.add(hood);

      const cabinGeo = new THREE.BoxGeometry(18, 6.2, width - 1.2);
      const cabin = new THREE.Mesh(cabinGeo, bodyMat);
      cabin.position.set(-2, 8.8, 0);
      cabin.castShadow = true;
      group.add(cabin);

      const trunkGeo = new THREE.BoxGeometry(11, 4.2, width - 0.4);
      const trunk = new THREE.Mesh(trunkGeo, bodyMat);
      trunk.position.set(-15, 4.8, 0);
      group.add(trunk);

      // Glass Windshields & Windows
      const winGeo = new THREE.BoxGeometry(17, 4.2, width - 0.8);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(-2, 9.2, 0);
      group.add(win);

      // Front Grille & Bumpers
      const fBumpGeo = new THREE.BoxGeometry(1.6, 2.8, width);
      const fBump = new THREE.Mesh(fBumpGeo, vehicleBumperMat);
      fBump.position.set(length / 2 - 1, 3.5, 0);
      group.add(fBump);

      const rBumpGeo = new THREE.BoxGeometry(1.6, 2.8, width);
      const rBump = new THREE.Mesh(rBumpGeo, vehicleBumperMat);
      rBump.position.set(-length / 2 + 1, 3.5, 0);
      group.add(rBump);

      // Side Mirrors
      const mirrorGeo = new THREE.BoxGeometry(1.2, 1.8, 1.4);
      [-1, 1].forEach(side => {
        const mirror = new THREE.Mesh(mirrorGeo, vehicleBumperMat);
        mirror.position.set(5.5, 8.0, side * (width / 2 + 0.8));
        group.add(mirror);
      });

      // 4 Wheels touching ground (radius 3.0, center y = 3.0)
      const wheelGeo = getSharedWheelGeo(3.0, 1.8, 10);
      const rimGeo = getSharedWheelGeo(1.6, 1.9, 8);
      [-1, 1].forEach(wz => {
        [-13, 13].forEach(wx => {
          const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 3.0, wz * (width / 2));
          group.add(wheel);

          const rim = new THREE.Mesh(rimGeo, sharedRimMat);
          rim.rotation.x = Math.PI / 2;
          rim.position.set(wx, 3.0, wz * (width / 2));
          group.add(rim);
        });
      });

      // Front Headlights
      const hlGeo = new THREE.BoxGeometry(1.0, 2.2, 3.2);
      [-5, 5].forEach(hz => {
        const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
        hl.position.set(length / 2 - 0.8, 5.0, hz);
        group.add(hl);
      });

      // Rear Taillights
      const tlGeo = new THREE.BoxGeometry(1.0, 2.0, 3.0);
      [-5, 5].forEach(tz => {
        const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
        tl.position.set(-length / 2 + 0.8, 5.2, tz);
        group.add(tl);
      });

    } else if (type === 'cng') {
      const length = 30;
      const width = 16;
      const height = 16;

      // Dark Green Metal Lower Cabin
      const bodyGeo = new THREE.BoxGeometry(20, 6.8, width - 1);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex || 0x15803d, roughness: 0.45 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(-2, 5.8, 0);
      body.castShadow = true;
      group.add(body);

      // Passenger Bench Seat inside cabin
      const pSeatGeo = new THREE.BoxGeometry(7.5, 3.2, width - 2.5);
      const pSeatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const pSeat = new THREE.Mesh(pSeatGeo, pSeatMat);
      pSeat.position.set(-6.5, 5.5, 0);
      group.add(pSeat);

      // Driver Seat
      const dSeatGeo = new THREE.BoxGeometry(4.0, 3.2, 9);
      const dSeat = new THREE.Mesh(dSeatGeo, pSeatMat);
      dSeat.position.set(1.5, 5.5, 0);
      group.add(dSeat);

      // Signature Dhaka Yellow Curved Canvas Dome Roof
      const roofGeo = new THREE.CylinderGeometry(width * 0.52, width * 0.52, 22, 14, 1, false, 0, Math.PI);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.z = Math.PI / 2;
      roof.position.set(-2, 13.2, 0);
      group.add(roof);

      // Front Sun Visor brow over windshield
      const visorGeo = new THREE.BoxGeometry(2.0, 0.8, width - 1.2);
      const visor = new THREE.Mesh(visorGeo, roofMat);
      visor.position.set(8.2, 12.8, 0);
      group.add(visor);

      // Front Windshield Frame and Tinted Glass
      const winGeo = new THREE.BoxGeometry(1.2, 5.6, width - 2.5);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(7.0, 10.2, 0);
      group.add(win);

      // Side Wire Safety Grill Mesh / Cage Doors (Both flanks)
      const grillGeo = new THREE.BoxGeometry(13.5, 5.5, width + 0.3);
      const grillMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, wireframe: true });
      const grill = new THREE.Mesh(grillGeo, grillMat);
      grill.position.set(-2, 10.0, 0);
      group.add(grill);

      // Front Single Wheel Fork & Handlebars
      const forkGeo = new THREE.CylinderGeometry(0.7, 0.7, 6.2, 8);
      const fork = new THREE.Mesh(forkGeo, vehicleBumperMat);
      fork.position.set(9.5, 5.6, 0);
      group.add(fork);

      const hbarGeo = new THREE.BoxGeometry(1.0, 0.8, 8);
      const hbar = new THREE.Mesh(hbarGeo, vehicleBumperMat);
      hbar.position.set(7.2, 8.5, 0);
      group.add(hbar);

      // 3 Wheels touching ground (1 front at +X, 2 rear at -X; radius 2.6, center y = 2.6)
      const wheelGeo = getSharedWheelGeo(2.6, 1.4, 8);
      const rimGeo = getSharedWheelGeo(1.4, 1.5, 8);

      // Front Wheel
      const fWheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
      fWheel.rotation.x = Math.PI / 2;
      fWheel.position.set(9.5, 2.6, 0);
      group.add(fWheel);

      const fRim = new THREE.Mesh(rimGeo, sharedRimMat);
      fRim.rotation.x = Math.PI / 2;
      fRim.position.set(9.5, 2.6, 0);
      group.add(fRim);

      // Rear Wheels
      [-1, 1].forEach(wz => {
        const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(-7.5, 2.6, wz * (width / 2));
        group.add(wheel);

        const rim = new THREE.Mesh(rimGeo, sharedRimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(-7.5, 2.6, wz * (width / 2));
        group.add(rim);
      });

      // Front Round Chrome Headlamp
      const hlGeo = new THREE.CylinderGeometry(1.3, 1.3, 1.4, 8);
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.rotation.z = Math.PI / 2;
      hl.position.set(11.2, 6.2, 0);
      group.add(hl);

      // Front Amber Turn Signal Indicators
      const indGeo = new THREE.BoxGeometry(0.8, 1.2, 1.2);
      [-4.8, 4.8].forEach(iz => {
        const ind = new THREE.Mesh(indGeo, vehicleIndicatorMat);
        ind.position.set(9.2, 5.8, iz);
        group.add(ind);
      });

      // Rear Taillights & Number Plate
      const tlGeo = new THREE.BoxGeometry(0.8, 1.8, 2.5);
      const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
      tl.position.set(-12.4, 5.5, 0);
      group.add(tl);

    } else if (type === 'rickshaw') {
      const length = 34;
      const width = 18;

      // 1. Rear Passenger Wooden Upholstered Seat Box
      const seatGeo = new THREE.BoxGeometry(11, 4.2, width - 2);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.set(-6.5, 5.8, 0);
      group.add(seat);

      // Passenger Backrest
      const backGeo = new THREE.BoxGeometry(1.6, 7.2, width - 2.5);
      const backMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.6 });
      const back = new THREE.Mesh(backGeo, backMat);
      back.position.set(-11.5, 9.5, 0);
      group.add(back);

      // Left & Right Armrests
      const armGeo = new THREE.BoxGeometry(9.5, 1.4, 1.2);
      [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(armGeo, seatMat);
        arm.position.set(-6.5, 8.8, side * (width / 2 - 1.2));
        group.add(arm);
      });

      // 2. Decorative Folk-Art Backplate (Rickshaw Art Plate)
      const plateGeo = new THREE.BoxGeometry(0.8, 6.8, width - 2);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(-12.5, 8.2, 0);
      group.add(plate);

      // Traditional Art Border Accent
      const borderGeo = new THREE.BoxGeometry(0.9, 1.0, width - 1.6);
      const borderMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
      const border = new THREE.Mesh(borderGeo, borderMat);
      border.position.set(-12.5, 11.4, 0);
      group.add(border);

      // 3. Passenger Curved Folding Hood Canopy (Rear at -X)
      const hoodGeo = new THREE.CylinderGeometry(7.4, 7.4, width - 2.2, 14, 1, false, 0, Math.PI);
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 });
      const hood = new THREE.Mesh(hoodGeo, hoodMat);
      hood.rotation.z = Math.PI / 2;
      hood.position.set(-6.2, 13.2, 0);
      group.add(hood);

      // Canopy folding rib braces
      const ribGeo = new THREE.BoxGeometry(6.5, 0.4, 0.5);
      const ribMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.7 });
      [-1, 1].forEach(side => {
        const rib = new THREE.Mesh(ribGeo, ribMat);
        rib.position.set(-6.2, 13.2, side * (width / 2 - 0.9));
        group.add(rib);
      });

      // 4. Slanted Tubular Bicycle Frame
      const frameGeo = new THREE.CylinderGeometry(0.5, 0.5, 11, 8);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.rotation.z = Math.PI / 3.2;
      frame.position.set(4.2, 5.8, 0);
      group.add(frame);

      // Rear carriage connecting support tubes
      const stayGeo = new THREE.CylinderGeometry(0.4, 0.4, 9, 6);
      [-1, 1].forEach(side => {
        const stay = new THREE.Mesh(stayGeo, frameMat);
        stay.rotation.y = side * 0.5;
        stay.position.set(-2.5, 4.8, side * 4.0);
        group.add(stay);
      });

      // 5. Crank, Chain & Foot Pedals
      const bbGeo = new THREE.CylinderGeometry(0.6, 0.6, 4.4, 8);
      const bb = new THREE.Mesh(bbGeo, frameMat);
      bb.rotation.x = Math.PI / 2;
      bb.position.set(1.6, 3.2, 0);
      group.add(bb);

      const pedalGeo = new THREE.BoxGeometry(0.6, 0.4, 1.6);
      [-1, 1].forEach(side => {
        const pedal = new THREE.Mesh(pedalGeo, vehicleBumperMat);
        pedal.position.set(1.6, 3.2, side * 2.5);
        group.add(pedal);
      });

      // 6. Bicycle Saddle
      const saddleGeo = new THREE.BoxGeometry(3.0, 1.0, 2.2);
      const saddleMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
      const saddle = new THREE.Mesh(saddleGeo, saddleMat);
      saddle.position.set(0.5, 7.2, 0);
      group.add(saddle);

      // 7. Pedaler Figure (Torso, Head with Gamcha, Arms reaching handlebars)
      const pedBodyGeo = new THREE.BoxGeometry(2.4, 4.0, 2.2);
      const pedBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
      const pedBody = new THREE.Mesh(pedBodyGeo, pedBodyMat);
      pedBody.position.set(1.4, 9.4, 0);
      pedBody.rotation.z = -0.1;
      group.add(pedBody);

      const headGeo = new THREE.SphereGeometry(1.3, 8, 8);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(1.6, 12.8, 0);
      group.add(head);

      // Gamcha / Scarf wrap around head
      const gamchaGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.6, 8);
      const gamchaMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const gamcha = new THREE.Mesh(gamchaGeo, gamchaMat);
      gamcha.position.set(1.6, 13.0, 0);
      group.add(gamcha);

      // Pedaler Arms reaching handlebars
      const pArmGeo = new THREE.BoxGeometry(3.8, 0.7, 0.7);
      [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(pArmGeo, pedBodyMat);
        arm.position.set(4.6, 9.2, side * 2.0);
        group.add(arm);
      });

      // 8. Handlebars & Brass Bell
      const forkGeo = new THREE.CylinderGeometry(0.5, 0.5, 7.0, 6);
      const fork = new THREE.Mesh(forkGeo, frameMat);
      fork.position.set(9.5, 6.2, 0);
      group.add(fork);

      const barGeo = new THREE.BoxGeometry(0.9, 0.8, 7.5);
      const bar = new THREE.Mesh(barGeo, vehicleBumperMat);
      bar.position.set(8.0, 9.2, 0);
      group.add(bar);

      const bellGeo = new THREE.SphereGeometry(0.6, 6, 6);
      const bellMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85 });
      const bell = new THREE.Mesh(bellGeo, bellMat);
      bell.position.set(8.2, 9.8, 2.0);
      group.add(bell);

      // 9. 3 Spoke Wheels touching ground (1 front bicycle wheel at +X, 2 large rear carriage wheels at -X)
      // Front wheel touches ground: radius 3.5, center y = 3.5
      const fWheelGeo = getSharedWheelGeo(3.5, 0.9, 10);
      const fw = new THREE.Mesh(fWheelGeo, sharedWheelMat);
      fw.rotation.x = Math.PI / 2;
      fw.position.set(10.5, 3.5, 0);
      group.add(fw);

      const fRimGeo = getSharedWheelGeo(2.0, 1.0, 8);
      const fRim = new THREE.Mesh(fRimGeo, sharedRimMat);
      fRim.rotation.x = Math.PI / 2;
      fRim.position.set(10.5, 3.5, 0);
      group.add(fRim);

      // Rear wheels touch ground: radius 4.5, center y = 4.5
      const rWheelGeo = getSharedWheelGeo(4.5, 1.1, 12);
      const rRimGeo = getSharedWheelGeo(2.6, 1.2, 10);
      [-1, 1].forEach(wz => {
        const w = new THREE.Mesh(rWheelGeo, sharedWheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(-7.5, 4.5, wz * (width / 2 - 0.5));
        group.add(w);

        const rim = new THREE.Mesh(rRimGeo, sharedRimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(-7.5, 4.5, wz * (width / 2 - 0.5));
        group.add(rim);
      });

      // Front Brass Headlamp & Rear Safety Reflector
      const hlGeo = new THREE.BoxGeometry(1.2, 1.8, 1.8);
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.position.set(11.6, 5.2, 0);
      group.add(hl);

      const tlGeo = new THREE.BoxGeometry(0.6, 1.5, 1.5);
      const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
      tl.position.set(-13.2, 5.5, 0);
      group.add(tl);

    } else if (type === 'bike') {
      const length = 26;
      const width = 8;

      // 1. Double-Cradle Tubular Steel Frame
      const frameGeo = new THREE.CylinderGeometry(0.45, 0.45, 11, 8);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.rotation.z = Math.PI / 3.4;
      frame.position.set(2.8, 5.5, 0);
      group.add(frame);

      // Streamlined Sculpted Fuel Tank
      const tankGeo = new THREE.BoxGeometry(8.5, 3.4, 4.4);
      const tankMat = new THREE.MeshStandardMaterial({ color: colorHex || 0x38bdf8, roughness: 0.3 });
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(1.5, 6.8, 0);
      group.add(tank);

      // Metallic Engine Block with Cooling Fins
      const engGeo = new THREE.BoxGeometry(6.2, 3.2, 3.8);
      const eng = new THREE.Mesh(engGeo, vehicleBumperMat);
      eng.position.set(0.5, 3.8, 0);
      group.add(eng);

      // Chrome Exhaust Pipe & Muffler (Right side)
      const exhGeo = new THREE.CylinderGeometry(0.35, 0.45, 10, 8);
      const exhMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.2 });
      const exh = new THREE.Mesh(exhGeo, exhMat);
      exh.rotation.z = Math.PI / 2;
      exh.position.set(-3.5, 2.2, -2.3);
      group.add(exh);

      // 2. Commuter Seat & Commuter Rider Figure
      const seatGeo = new THREE.BoxGeometry(10.5, 1.8, 4.0);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.set(-3.2, 6.4, 0);
      group.add(seat);

      // Commuter Rider with Helmet (leaning naturally forward)
      const riderGeo = new THREE.BoxGeometry(2.4, 4.6, 2.4);
      const riderMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const rider = new THREE.Mesh(riderGeo, riderMat);
      rider.position.set(-1.2, 9.4, 0);
      rider.rotation.z = -0.15;
      group.add(rider);

      const helmGeo = new THREE.SphereGeometry(1.5, 8, 8);
      const helmMat = new THREE.MeshStandardMaterial({ color: colorHex || 0x38bdf8, roughness: 0.2 });
      const helm = new THREE.Mesh(helmGeo, helmMat);
      helm.position.set(-0.5, 13.2, 0);
      group.add(helm);

      // Rider Arms extending to handlebars
      const rArmGeo = new THREE.BoxGeometry(3.6, 0.7, 0.7);
      [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(rArmGeo, riderMat);
        arm.position.set(2.2, 9.0, side * 2.0);
        group.add(arm);
      });

      // 3. Front Telescopic Fork & Handlebars with Dual Mirrors
      const forkGeo = new THREE.CylinderGeometry(0.45, 0.45, 7.2, 6);
      const fork = new THREE.Mesh(forkGeo, vehicleBumperMat);
      fork.rotation.z = -0.25;
      fork.position.set(6.8, 6.0, 0);
      group.add(fork);

      const barGeo = new THREE.BoxGeometry(0.8, 0.8, 6.8);
      const bar = new THREE.Mesh(barGeo, vehicleBumperMat);
      bar.position.set(5.6, 9.0, 0);
      group.add(bar);

      // Dual Rearview Mirrors
      const mirGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
      [-1, 1].forEach(side => {
        const mir = new THREE.Mesh(mirGeo, vehicleBumperMat);
        mir.position.set(5.8, 9.8, side * 3.6);
        group.add(mir);
      });

      // 4. Wheels with Mudguards touching ground (radius 3.0, center y = 3.0)
      const wheelGeo = getSharedWheelGeo(3.0, 1.1, 10);
      const rimGeo = getSharedWheelGeo(1.6, 1.2, 8);

      [-8.0, 8.0].forEach(px => {
        const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(px, 3.0, 0);
        group.add(wheel);

        const rim = new THREE.Mesh(rimGeo, sharedRimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(px, 3.0, 0);
        group.add(rim);
      });

      // Front Mudguard
      const fFendGeo = new THREE.BoxGeometry(4.5, 0.8, 1.8);
      const fFend = new THREE.Mesh(fFendGeo, vehicleBumperMat);
      fFend.position.set(8.0, 4.6, 0);
      group.add(fFend);

      // 5. Lighting
      const hlGeo = new THREE.BoxGeometry(1.2, 1.8, 1.8);
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.position.set(9.0, 6.4, 0);
      group.add(hl);

      const tlGeo = new THREE.BoxGeometry(0.8, 1.4, 1.4);
      const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
      tl.position.set(-9.0, 5.5, 0);
      group.add(tl);
    }

    scene.add(group);
    return group;
  }

  // 3D Ambulance Builder (High-Roof Emergency Van facing +X)
  function create3DAmbulance() {
    const ambGroup = new THREE.Group();
    const length = 54;
    const width = 22;
    const height = 22;

    // White High-Roof Van Body
    const bodyGeo = new THREE.BoxGeometry(length, 14, width);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 10;
    body.castShadow = true;
    ambGroup.add(body);

    // Aerodynamic High-Roof Cap
    const capGeo = new THREE.BoxGeometry(length - 2, 3.0, width - 0.8);
    const cap = new THREE.Mesh(capGeo, bodyMat);
    cap.position.y = 18.2;
    ambGroup.add(cap);

    // Bold Reflective Red Emergency Stripes
    const strGeo = new THREE.BoxGeometry(length + 0.4, 3.2, width + 0.4);
    const strMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const str = new THREE.Mesh(strGeo, strMat);
    str.position.y = 10.5;
    ambGroup.add(str);

    // Red Crescent / Medical Cross Decals on Sides
    const cross1Geo = new THREE.BoxGeometry(8, 2.5, width + 0.6);
    const cross1 = new THREE.Mesh(cross1Geo, strMat);
    cross1.position.set(-4, 11, 0);
    ambGroup.add(cross1);

    const cross2Geo = new THREE.BoxGeometry(2.5, 8, width + 0.6);
    const cross2 = new THREE.Mesh(cross2Geo, strMat);
    cross2.position.set(-4, 11, 0);
    ambGroup.add(cross2);

    // Sloped Front Windshield
    const winGeo = new THREE.BoxGeometry(2.0, 6.5, width - 1.2);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(length / 2 - 2, 13.5, 0);
    ambGroup.add(win);

    // Front Chrome Grille & Bumper
    const fBumpGeo = new THREE.BoxGeometry(2.2, 3.5, width + 0.6);
    const fBump = new THREE.Mesh(fBumpGeo, vehicleBumperMat);
    fBump.position.set(length / 2 + 0.8, 4.0, 0);
    ambGroup.add(fBump);

    // Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(1.4, 2.5, 1.2);
    [-1, 1].forEach(side => {
      const mirror = new THREE.Mesh(mirrorGeo, vehicleBumperMat);
      mirror.position.set(length / 2 - 3, 12, side * (width / 2 + 1.2));
      ambGroup.add(mirror);
    });

    // Rooftop Emergency Lightbar
    const barGeo = new THREE.BoxGeometry(16, 2.2, 9);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, 20.2, 0);
    ambGroup.add(bar);

    // Dual High-Intensity Flashing Strobes (Red & Blue)
    ambStrobeRed = new THREE.PointLight(0xff0000, 2.5, 120);
    ambStrobeRed.position.set(-4, 22.5, 0);
    ambGroup.add(ambStrobeRed);

    ambStrobeBlue = new THREE.PointLight(0x0066ff, 2.5, 120);
    ambStrobeBlue.position.set(4, 22.5, 0);
    ambGroup.add(ambStrobeBlue);

    // 4 Heavy-Duty Wheels touching ground (radius 3.5, center y = 3.5)
    const wheelGeo = getSharedWheelGeo(3.5, 2.0, 10);
    const rimGeo = getSharedWheelGeo(1.8, 2.1, 8);
    [-1, 1].forEach(wz => {
      [-16, 16].forEach(wx => {
        const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 3.5, wz * (width / 2));
        ambGroup.add(wheel);

        const rim = new THREE.Mesh(rimGeo, sharedRimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(wx, 3.5, wz * (width / 2));
        ambGroup.add(rim);
      });
    });

    // Front Headlights
    const hlGeo = new THREE.BoxGeometry(1.2, 2.8, 3.8);
    [-6, 6].forEach(hz => {
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.position.set(length / 2 + 0.8, 6.5, hz);
      ambGroup.add(hl);
    });

    // Rear Taillights
    const tlGeo = new THREE.BoxGeometry(1.0, 4.5, 2.0);
    [-7, 7].forEach(tz => {
      const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
      tl.position.set(-length / 2 - 0.2, 8.0, tz);
      ambGroup.add(tl);
    });

    ambGroup.visible = false;
    scene.add(ambGroup);
    return ambGroup;
  }

  // 3D Human Pedestrian Builder (Articulated Torso, Head, Limbs with Visible Hands, Rain Umbrella)
  function create3DPedestrian(p) {
    if (!sharedFleshMat) sharedFleshMat = new THREE.MeshStandardMaterial({ color: 0xf6d8ae, roughness: 0.6 });
    if (!sharedPantsMat) sharedPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    if (!sharedShoeMat) sharedShoeMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.8 });
    if (!sharedHairMat) sharedHairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    if (!sharedUmbShaftMat) sharedUmbShaftMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    if (!sharedPedTorsoGeo) sharedPedTorsoGeo = new THREE.BoxGeometry(2.4, 4.2, 1.8);
    if (!sharedPedNeckGeo) sharedPedNeckGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.8, 8);
    if (!sharedPedHeadGeo) sharedPedHeadGeo = new THREE.SphereGeometry(1.25, 10, 10);
    if (!sharedPedHairGeo) sharedPedHairGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.6, 10);
    if (!sharedPedLegGeo) sharedPedLegGeo = new THREE.BoxGeometry(0.85, 3.8, 0.95);
    if (!sharedPedFootGeo) sharedPedFootGeo = new THREE.BoxGeometry(0.9, 0.8, 1.6);
    if (!sharedPedArmGeo) sharedPedArmGeo = new THREE.BoxGeometry(0.7, 3.2, 0.75);
    if (!sharedPedHandGeo) sharedPedHandGeo = new THREE.BoxGeometry(0.65, 0.8, 0.7);

    if (!sharedUmbCanopyGeo) sharedUmbCanopyGeo = new THREE.CylinderGeometry(0.4, 5.8, 2.8, 14, 1, false, 0, Math.PI * 2);
    if (!sharedUmbTipGeo) sharedUmbTipGeo = new THREE.CylinderGeometry(0.12, 0.25, 0.8, 6);
    if (!sharedUmbShaftGeo) sharedUmbShaftGeo = new THREE.CylinderGeometry(0.12, 0.12, 9.2, 6);
    if (!sharedUmbHandleGeo) sharedUmbHandleGeo = new THREE.TorusGeometry(0.6, 0.12, 6, 10, Math.PI);

    const group = new THREE.Group();

    // 1. Clothed Torso (Shirt / Kurta / Top)
    const torsoMat = new THREE.MeshStandardMaterial({
      color: p.color ? parseInt(p.color.replace('#', '0x'), 16) : 0x38bdf8,
      roughness: 0.6
    });
    const torso = new THREE.Mesh(sharedPedTorsoGeo, torsoMat);
    torso.position.y = 6.3;
    torso.castShadow = true;
    group.add(torso);

    // 2. Head with Flesh Tone, Neck & Hair / Cap
    const neck = new THREE.Mesh(sharedPedNeckGeo, sharedFleshMat);
    neck.position.y = 8.6;
    group.add(neck);

    const head = new THREE.Mesh(sharedPedHeadGeo, sharedFleshMat);
    head.position.y = 9.8;
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(sharedPedHairGeo, sharedHairMat);
    hair.position.y = 10.4;
    group.add(hair);

    // 3. Articulated Legs with Shoes Touching Ground
    // Left Leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.7, 4.2, 0);
    const leftLeg = new THREE.Mesh(sharedPedLegGeo, sharedPantsMat);
    leftLeg.position.y = -1.9;
    leftLeg.castShadow = true;
    leftLegGroup.add(leftLeg);

    const leftFoot = new THREE.Mesh(sharedPedFootGeo, sharedShoeMat);
    leftFoot.position.set(0, -3.8, 0.35);
    leftLegGroup.add(leftFoot);
    group.add(leftLegGroup);

    // Right Leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.7, 4.2, 0);
    const rightLeg = new THREE.Mesh(sharedPedLegGeo, sharedPantsMat);
    rightLeg.position.y = -1.9;
    rightLeg.castShadow = true;
    rightLegGroup.add(rightLeg);

    const rightFoot = new THREE.Mesh(sharedPedFootGeo, sharedShoeMat);
    rightFoot.position.set(0, -3.8, 0.35);
    rightLegGroup.add(rightFoot);
    group.add(rightLegGroup);

    // 4. Articulated Arms with Visible Hands
    // Left Arm
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-1.65, 7.8, 0);
    const leftArm = new THREE.Mesh(sharedPedArmGeo, torsoMat);
    leftArm.position.y = -1.6;
    leftArmGroup.add(leftArm);

    const leftHand = new THREE.Mesh(sharedPedHandGeo, sharedFleshMat);
    leftHand.position.set(0, -3.4, 0);
    leftArmGroup.add(leftHand);
    group.add(leftArmGroup);

    // Right Arm (Umbrella holding arm)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(1.65, 7.8, 0);
    const rightArm = new THREE.Mesh(sharedPedArmGeo, torsoMat);
    rightArm.position.y = -1.6;
    rightArmGroup.add(rightArm);

    const rightHand = new THREE.Mesh(sharedPedHandGeo, sharedFleshMat);
    rightHand.position.set(0, -3.4, 0);
    rightArmGroup.add(rightHand);
    group.add(rightArmGroup);

    // 5. Rain Umbrella (Canopy, Ferrule, Central Shaft, Handle)
    const umbGroup = new THREE.Group();
    const umbColorHex = p.umbrellaColor ? parseInt(p.umbrellaColor.replace('#', '0x'), 16) : 0xdc2626;
    const umbCanopyMat = new THREE.MeshStandardMaterial({ color: umbColorHex, roughness: 0.35 });

    // Canopy overhead (apex at y = 14.0, bottom at y = 12.6, well clear of head at y = 11.0)
    const canopy = new THREE.Mesh(sharedUmbCanopyGeo, umbCanopyMat);
    canopy.position.set(0.6, 14.0, 0);
    canopy.castShadow = true;
    umbGroup.add(canopy);

    // Apex ferrule tip
    const tip = new THREE.Mesh(sharedUmbTipGeo, sharedUmbShaftMat);
    tip.position.set(0.6, 15.8, 0);
    umbGroup.add(tip);

    // Slender central shaft from canopy to hand (length 9.2, center at y = 9.4)
    const shaft = new THREE.Mesh(sharedUmbShaftGeo, sharedUmbShaftMat);
    shaft.position.set(0.6, 9.4, 0);
    umbGroup.add(shaft);

    // Curved J-handle at the bottom
    const handle = new THREE.Mesh(sharedUmbHandleGeo, sharedUmbShaftMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0.3, 4.8, 0);
    umbGroup.add(handle);

    umbGroup.visible = false;
    group.add(umbGroup);

    // Store references for walking animations & weather response
    group.userData.umbrella = umbGroup;
    group.userData.leftLeg = leftLegGroup;
    group.userData.rightLeg = rightLegGroup;
    group.userData.leftArm = leftArmGroup;
    group.userData.rightArm = rightArmGroup;

    scene.add(group);
    return group;
  }

  // Metro Train Coach Builder (Facing +X)
  function createTrainCoach(isLead) {
    const coach = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(68, 16, 14);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 8;
    body.castShadow = true;
    coach.add(body);

    const grGeo = new THREE.BoxGeometry(68, 2.5, 14.3);
    const grMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    const gr = new THREE.Mesh(grGeo, grMat);
    gr.position.y = 7;
    coach.add(gr);

    const rdGeo = new THREE.BoxGeometry(68, 1.8, 14.3);
    const rdMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const rd = new THREE.Mesh(rdGeo, rdMat);
    rd.position.y = 5;
    coach.add(rd);

    const winGeo = new THREE.BoxGeometry(60, 4.5, 14.4);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.y = 11;
    coach.add(win);

    if (isLead) {
      const hl = new THREE.PointLight(0xfef08a, 1.6, 120);
      hl.position.set(36, 6, 0);
      coach.add(hl);

      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfff08a });
      const hlGeo = new THREE.BoxGeometry(1.2, 3, 3);
      [-4, 4].forEach(hz => {
        const hlMesh = new THREE.Mesh(hlGeo, hlMat);
        hlMesh.position.set(35, 6, hz);
        coach.add(hlMesh);
      });
    }
    return coach;
  }

  // Heading helper for 4 cardinal directions
  function getHeading(dir) {
    if (dir === 'EB') return 0;           // Facing +X (East)
    if (dir === 'WB') return Math.PI;      // Facing -X (West)
    if (dir === 'SB') return -Math.PI / 2; // Facing +Z (South)
    if (dir === 'NB') return Math.PI / 2;  // Facing -Z (North)
    return 0;
  }

  // -------------------------------------------------------------
  // Primary Scene Construction
  // -------------------------------------------------------------
  function buildScene(vehiclesData, pedestriansData) {
    // 1. Fog & Background
    scene.background = new THREE.Color(0x040814);
    scene.fog = new THREE.FogExp2(0x060e20, 0.0005);

    // 2. Camera: Isometric Drone Aerial 3/4 Perspective
    let width = canvasEl.clientWidth;
    let height = canvasEl.clientHeight;
    if (!width || !height || width <= 0 || height <= 0) {
      if (containerEl && containerEl.clientWidth > 0 && containerEl.clientHeight > 0) {
        width = containerEl.clientWidth;
        height = containerEl.clientHeight;
      } else if (window.innerWidth > 0 && window.innerHeight > 0) {
        width = window.innerWidth;
        height = window.innerHeight;
      } else {
        width = 1200;
        height = 700;
      }
    }
    const aspect = (width > 0 && height > 0) ? (width / height) : (1200 / 700);

    camera = new THREE.PerspectiveCamera(38, aspect, 10, 4000);
    updateCameraFraming(aspect);

    // 3. Renderer (High performance WebGL with optimal pixel ratio for 120 FPS)
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // 4. Lighting: Ambient + Directional Sun + Corner Streetlights
    ambientLight = new THREE.AmbientLight(0x38bdf8, 0.7);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    sunLight.position.set(-260, 500, 320);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 1400;
    sunLight.shadow.bias = -0.0005;
    const d = 550;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // 4 Corner Streetlights
    const cornerLightCoords = [
      [-135, 26, -100],
      [135, 26, -100],
      [-135, 26, 100],
      [135, 26, 100]
    ];
    cornerLightCoords.forEach(pos => {
      const pl = new THREE.PointLight(0xfef08a, 1.5, 260);
      pl.position.set(pos[0], pos[1], pos[2]);
      scene.add(pl);
      cornerPointLights.push(pl);

      const poleGeo = new THREE.CylinderGeometry(1.2, 1.5, 26, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(pos[0], 13, pos[2]);
      freezeStatic(pole);
      scene.add(pole);

      const lampHeadGeo = new THREE.BoxGeometry(7, 3, 7);
      const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const head = new THREE.Mesh(lampHeadGeo, lampHeadMat);
      head.position.set(pos[0], 26, pos[2]);
      freezeStatic(head);
      scene.add(head);
    });

    // 5. Ground & Road Network
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85 });
    roadMaterial = roadMat;
    const groundGeo = new THREE.PlaneGeometry(1600, 1200);
    const ground = new THREE.Mesh(groundGeo, roadMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.matrixAutoUpdate = false;
    ground.updateMatrix();
    scene.add(ground);

    // Lane Dividers & Crosswalks (Batched into 2 draw calls for 120 FPS performance)
    const yellowBatcher = new RoadMarkingBatcher();
    const whiteBatcher = new RoadMarkingBatcher();

    for (let x = -600; x < 600; x += 32) {
      if (Math.abs(x) > 115) {
        yellowBatcher.addRect(16, 2.5, x, 0);   // Center yellow
        whiteBatcher.addRect(14, 1.8, x, 38);   // White outer
        whiteBatcher.addRect(14, 1.8, x, -38);  // White outer
      }
    }
    for (let z = -450; z < 350; z += 32) {
      if (Math.abs(z) > 85) {
        yellowBatcher.addRect(2.5, 16, 0, z);   // Center yellow
        whiteBatcher.addRect(1.8, 14, 45, z);   // White outer
        whiteBatcher.addRect(1.8, 14, -45, z);  // White outer
      }
    }

    // Stop Lines (EB: x=-135, WB: x=135, SB: z=-105, NB: z=105)
    whiteBatcher.addRect(160, 4, -135, 0);
    whiteBatcher.addRect(160, 4, 135, 0);
    whiteBatcher.addRect(4, 220, 0, -105);
    whiteBatcher.addRect(4, 220, 0, 105);

    // 4 Zebra Crosswalks
    function addBatchCrosswalk(isVertical, cx, cz, length, width) {
      const stripes = 12;
      for (let i = 0; i < stripes; i++) {
        if (isVertical) {
          const z = cz - length / 2 + (i + 0.5) * (length / stripes);
          whiteBatcher.addRect(width, (length / stripes) * 0.6, cx, z);
        } else {
          const x = cx - length / 2 + (i + 0.5) * (length / stripes);
          whiteBatcher.addRect((length / stripes) * 0.6, width, x, cz);
        }
      }
    }
    addBatchCrosswalk(true, -120, 0, 160, 20);
    addBatchCrosswalk(true, 120, 0, 160, 20);
    addBatchCrosswalk(false, 0, -92, 220, 20);
    addBatchCrosswalk(false, 0, 92, 220, 20);

    if (!whiteMarkMat) whiteMarkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    if (!yellowMarkMat) yellowMarkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    const yellowMesh = yellowBatcher.buildMesh(yellowMarkMat);
    const whiteMesh = whiteBatcher.buildMesh(whiteMarkMat);
    if (yellowMesh) scene.add(yellowMesh);
    if (whiteMesh) scene.add(whiteMesh);

    // Sidewalk Corners
    addSidewalkCorner(480, 260, -350, -210);
    addSidewalkCorner(480, 260, 350, -210);
    addSidewalkCorner(480, 260, -350, 210);
    addSidewalkCorner(480, 260, 350, 210);

    // Miniature Trees along Sidewalks
    [-460, -310, -170, 170, 310, 460].forEach(tx => {
      addTree(tx, -88);
      addTree(tx, 88);
    });
    [-220, -140, 140, 220].forEach(tz => {
      addTree(-118, tz);
      addTree(118, tz);
    });

    // 6. Elevated Metro Rail Viaduct Superstructure
    const viaductZ = -332;
    const viaductY = 42;

    const pierXCoords = [-520, -350, -180, 0, 480];
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    pierXCoords.forEach(px => {
      const colGeo = new THREE.BoxGeometry(18, viaductY, 18);
      const col = new THREE.Mesh(colGeo, pierMat);
      col.position.set(px, viaductY / 2, viaductZ);
      col.castShadow = true;
      col.receiveShadow = true;
      freezeStatic(col);
      scene.add(col);

      // Cantilever Hammerhead Cap
      const capGeo = new THREE.BoxGeometry(32, 6, 28);
      const cap = new THREE.Mesh(capGeo, pierMat);
      cap.position.set(px, viaductY - 3, viaductZ);
      cap.castShadow = true;
      freezeStatic(cap);
      scene.add(cap);
    });

    // Continuous Box-Girder Beam
    const beamGeo = new THREE.BoxGeometry(1400, 7, 26);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, viaductY + 3.5, viaductZ);
    beam.castShadow = true;
    beam.receiveShadow = true;
    freezeStatic(beam);
    scene.add(beam);

    // Bangladesh Green & Red Ribbon Livery
    const greenRibbonGeo = new THREE.BoxGeometry(1400, 2, 0.6);
    const greenRibbonMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    const greenRibbon = new THREE.Mesh(greenRibbonGeo, greenRibbonMat);
    greenRibbon.position.set(0, viaductY + 5, viaductZ + 13.3);
    freezeStatic(greenRibbon);
    scene.add(greenRibbon);

    const redRibbonGeo = new THREE.BoxGeometry(1400, 1.5, 0.6);
    const redRibbonMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const redRibbon = new THREE.Mesh(redRibbonGeo, redRibbonMat);
    redRibbon.position.set(0, viaductY + 3, viaductZ + 13.3);
    freezeStatic(redRibbon);
    scene.add(redRibbon);

    // Dual Glowing Rails
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const rail1Geo = new THREE.BoxGeometry(1400, 1.2, 1.8);
    const rail1 = new THREE.Mesh(rail1Geo, railMat);
    rail1.position.set(0, viaductY + 7.6, viaductZ - 4);
    freezeStatic(rail1);
    scene.add(rail1);

    const rail2Geo = new THREE.BoxGeometry(1400, 1.2, 1.8);
    const rail2 = new THREE.Mesh(rail2Geo, railMat);
    rail2.position.set(0, viaductY + 7.6, viaductZ + 4);
    freezeStatic(rail2);
    scene.add(rail2);

    // Mirpur 10 Station Structure (x: 180 .. 440)
    const stationGroup = new THREE.Group();
    stationGroup.position.set(310, viaductY, viaductZ);

    const stFloorGeo = new THREE.BoxGeometry(260, 8, 54);
    const stFloorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const stFloor = new THREE.Mesh(stFloorGeo, stFloorMat);
    stFloor.position.set(0, 4, 0);
    stFloor.castShadow = true;
    stationGroup.add(stFloor);

    // Platform Strip Light
    const platLightGeo = new THREE.BoxGeometry(240, 1.5, 2);
    const platLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const platLight = new THREE.Mesh(platLightGeo, platLightMat);
    platLight.position.set(0, 8.5, 10);
    stationGroup.add(platLight);

    // Arched Glass Canopy
    const canopyGeo = new THREE.CylinderGeometry(28, 28, 260, 32, 1, false, 0, Math.PI);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.position.set(0, 14, 0);
    stationGroup.add(canopy);

    // Station Signboard
    const stSignTex = createSignboardTexture('মিরপুর ১০', 'Mirpur 10', '#020617', '#ffffff', '#38bdf8', '#00f2fe', 380, 80);
    const stSignGeo = new THREE.BoxGeometry(160, 24, 3);
    const stSignMat = new THREE.MeshBasicMaterial({ map: stSignTex });
    const stSign = new THREE.Mesh(stSignGeo, stSignMat);
    stSign.position.set(-20, 22, 28);
    stationGroup.add(stSign);

    // Station Boarding Badge
    const boardingTex = createSignboardTexture('● BOARDING', 'MRT LINE 6', '#020617', '#4ade80', '#22c55e', '#22c55e', 256, 64);
    const boardingGeo = new THREE.BoxGeometry(75, 18, 2);
    const boardingMat = new THREE.MeshBasicMaterial({ map: boardingTex });
    boardingBadgeMesh = new THREE.Mesh(boardingGeo, boardingMat);
    boardingBadgeMesh.position.set(95, 22, 28);
    boardingBadgeMesh.visible = false;
    stationGroup.add(boardingBadgeMesh);

    // Ground Escalator / Stairs
    const stairsGeo = new THREE.BoxGeometry(16, 2, 70);
    const stairsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const stairs = new THREE.Mesh(stairsGeo, stairsMat);
    stairs.position.set(-110, -18, 55);
    stairs.rotation.x = 0.55;
    stationGroup.add(stairs);

    freezeStatic(stationGroup);
    scene.add(stationGroup);

    // 7. 3D Metro Rail 3-Coach Train
    trainGroup = new THREE.Group();
    trainGroup.position.set(-200, viaductY + 7.5, viaductZ);

    const coach1 = createTrainCoach(true);
    coach1.position.x = 75;
    trainGroup.add(coach1);

    const coach2 = createTrainCoach(false);
    coach2.position.x = 0;
    trainGroup.add(coach2);

    const coach3 = createTrainCoach(false);
    coach3.position.x = -75;
    trainGroup.add(coach3);

    scene.add(trainGroup);

    // 8. 4 Quadrants of Extruded 3D Buildings
    // Northwest Quadrant
    create3DBuilding({
      x: -490, z: -210, width: 34, depth: 40, height: 115,
      wallColor: '#0284c7', sideColor: '#082f49',
      floors: 6, cols: 2, winColor: '#a5f3fc',
      antenna: true
    });

    const nwComplex = create3DBuilding({
      x: -360, z: -210, width: 200, depth: 65, height: 90,
      wallColor: '#ea580c', sideColor: '#431407',
      floors: 4, cols: 6, winColor: '#fef08a',
      signboard: { text: 'ঢাকা বেকারি', sub: 'Dhaka Bakery', bg: '#0f172a', textCol: '#ffffff', border: '#fbbf24', w: 85, h: 18, ox: -45, y: 15, awnCol: 0xb45309 }
    });
    const pharmTex = createSignboardTexture('গ্রীন ফার্মেসি', 'Pharmacy', '#0f172a', '#ffffff', '#6ee7b7', '#10b981', 256, 64);
    const pharmGeo = new THREE.BoxGeometry(85, 18, 2.5);
    const pharmMesh = new THREE.Mesh(pharmGeo, new THREE.MeshBasicMaterial({ map: pharmTex }));
    pharmMesh.position.set(45, 15, (65 / 2) + 1.5);
    nwComplex.add(pharmMesh);

    // Standing 3D Billboard: "ঢাকা আমাদের শহর"
    const bbTex = createSignboardTexture('ঢাকা আমাদের শহর', 'DHAKA OUR CITY', '#042f2e', '#fde047', '#34d399', '#10b981', 512, 128);
    const bbGeo = new THREE.BoxGeometry(150, 46, 4);
    const bbMat = new THREE.MeshBasicMaterial({ map: bbTex });
    const billboard = new THREE.Mesh(bbGeo, bbMat);
    billboard.position.set(0, 90 + 32, 0);
    nwComplex.add(billboard);

    const bbLegGeo = new THREE.CylinderGeometry(1.2, 1.2, 28, 8);
    const bbLegMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    [-60, -20, 20, 60].forEach(lx => {
      const leg = new THREE.Mesh(bbLegGeo, bbLegMat);
      leg.position.set(lx, 90 + 14, 0);
      nwComplex.add(leg);
    });
    freezeStatic(nwComplex);

    create3DBuilding({
      x: -225, z: -210, width: 80, depth: 60, height: 110,
      wallColor: '#0d9488', sideColor: '#134e4a',
      floors: 5, cols: 3, winColor: '#fef08a',
      waterTank: true, antenna: true
    });

    create3DBuilding({
      x: -150, z: -205, width: 68, depth: 55, height: 95,
      wallColor: '#f59e0b', sideColor: '#451a03',
      floors: 4, cols: 3, winColor: '#fef08a',
      antenna: true,
      signboard: { text: 'ঢাকা বুক ডিপো', sub: 'Book Depot', bg: '#0f172a', textCol: '#ffffff', border: '#fbbf24', w: 62, h: 16, y: 14 }
    });

    // Northeast Quadrant
    create3DBuilding({
      x: 150, z: -205, width: 68, depth: 55, height: 95,
      wallColor: '#a855f7', sideColor: '#2e1065',
      floors: 4, cols: 3, winColor: '#f5d0fe',
      antenna: true,
      signboard: { text: 'ফ্যাশন কর্নার', sub: 'Fashion Corner', bg: '#0f172a', textCol: '#ffffff', border: '#d946ef', w: 62, h: 16, y: 14, awnCol: 0x701a75 }
    });

    create3DBuilding({
      x: 230, z: -210, width: 75, depth: 60, height: 100,
      wallColor: '#14b8a6', sideColor: '#042f2e',
      floors: 4, cols: 3, winColor: '#a5f3fc',
      waterTank: true,
      signboard: { text: 'বাংলা টেক', sub: 'Bangla Tech', bg: '#0f172a', textCol: '#00f2fe', border: '#00f2fe', w: 68, h: 16, y: 14, awnCol: 0x0f766e }
    });

    create3DBuilding({
      x: 315, z: -215, width: 85, depth: 60, height: 115,
      wallColor: '#f43f5e', sideColor: '#4c0519',
      floors: 5, cols: 4, winColor: '#fef08a',
      waterTank: true, antenna: true,
      signboard: { text: 'সুপার শপ', sub: 'Super Shop', bg: '#0f172a', textCol: '#fef08a', border: '#ff2a54', w: 76, h: 16, y: 14, awnCol: 0xbe123c }
    });

    // NE-4 Mirpur Plaza Landmark High-Rise
    const plaza = create3DBuilding({
      x: 430, z: -200, width: 130, depth: 75, height: 135,
      wallColor: '#0284c7', sideColor: '#082f49',
      floors: 6, cols: 5, winColor: '#67e8f9',
      antenna: true
    });
    const plTex = createSignboardTexture('মিরপুর প্লাজা', 'MIRPUR PLAZA', '#0369a1', '#ffffff', '#00f2fe', '#00f2fe', 380, 80);
    const plGeo = new THREE.BoxGeometry(105, 22, 3);
    const plSign = new THREE.Mesh(plGeo, new THREE.MeshBasicMaterial({ map: plTex }));
    plSign.position.set(0, 135 + 12, (75 / 2) - 10);
    plaza.add(plSign);
    freezeStatic(plaza);

    // Southwest Quadrant
    create3DBuilding({
      x: -490, z: 185, width: 34, depth: 40, height: 85,
      wallColor: '#fb7185', sideColor: '#4c0519',
      floors: 4, cols: 2, winColor: '#fef08a'
    });

    create3DBuilding({
      x: -360, z: 185, width: 200, depth: 65, height: 80,
      wallColor: '#14b8a6', sideColor: '#042f2e',
      floors: 3, cols: 6, winColor: '#fef08a',
      waterTank: true, antenna: true
    });

    create3DBuilding({
      x: -225, z: 180, width: 75, depth: 55, height: 85,
      wallColor: '#8b5cf6', sideColor: '#2e1065',
      floors: 3, cols: 3, winColor: '#f5d0fe',
      antenna: true,
      signboard: { text: 'চায়ের টং', sub: 'Traditional Tea Stall', bg: '#78350f', textCol: '#fef08a', border: '#fbbf24', w: 68, h: 16, y: 14, awnCol: 0xb45309 }
    });

    create3DBuilding({
      x: -150, z: 175, width: 75, depth: 55, height: 82,
      wallColor: '#f59e0b', sideColor: '#451a03',
      floors: 3, cols: 3, winColor: '#fef08a',
      waterTank: true,
      signboard: { text: 'সোনালী জুয়েলার্স', sub: 'Sonali Jewelers', bg: '#0f172a', textCol: '#fde047', border: '#fbbf24', w: 68, h: 16, y: 14, awnCol: 0xb45309 }
    });

    // Southeast Quadrant
    create3DBuilding({
      x: 165, z: 175, width: 110, depth: 60, height: 85,
      wallColor: '#f43f5e', sideColor: '#4c0519',
      floors: 3, cols: 4, winColor: '#fef08a',
      antenna: true,
      signboard: { text: 'জনতা ফার্মেসি ✚', sub: 'Clinic & Medicine', bg: '#065f46', textCol: '#ffffff', border: '#10b981', w: 100, h: 16, y: 14, awnCol: 0x047857 }
    });

    const seBillboardBldg = create3DBuilding({
      x: 320, z: 185, width: 180, depth: 65, height: 85,
      wallColor: '#1e3a8a', sideColor: '#0f172a',
      floors: 3, cols: 5, winColor: '#38bdf8',
      waterTank: true, antenna: true
    });
    const seBbTex = createSignboardTexture('সবাই মিলে একটি ভালো ঢাকা', 'TOWARDS A SMARTER COMMUTE', '#172554', '#ffffff', '#38bdf8', '#00f2fe', 512, 128);
    const seBbGeo = new THREE.BoxGeometry(160, 42, 3);
    const seBbSign = new THREE.Mesh(seBbGeo, new THREE.MeshBasicMaterial({ map: seBbTex }));
    seBbSign.position.set(0, 46, (65 / 2) + 2);
    seBillboardBldg.add(seBbSign);
    freezeStatic(seBillboardBldg);

    create3DBuilding({
      x: 450, z: 185, width: 45, depth: 45, height: 95,
      wallColor: '#0ea5e9', sideColor: '#082f49',
      floors: 4, cols: 2, winColor: '#a5f3fc',
      antenna: true
    });

    // 9. 4 3D Traffic Signal Posts at Corners
    signalLamps.nw = createTrafficSignalPost(-140, -110, 0);
    signalLamps.ne = createTrafficSignalPost(140, -110, Math.PI);
    signalLamps.sw = createTrafficSignalPost(-140, 110, -Math.PI / 2);
    signalLamps.se = createTrafficSignalPost(140, 110, Math.PI / 2);

    // 10. Instantiate 3D Vehicle Fleet from Simulation Data
    if (vehiclesData && Array.isArray(vehiclesData)) {
      vehiclesData.forEach(v => {
        const colorHex = v.color ? parseInt(v.color.replace('#', '0x'), 16) : null;
        const mesh = create3DVehicle(v.type, colorHex);
        mesh.rotation.y = getHeading(v.dir);
        vehicleMeshMap[v.id] = {
          mesh: mesh,
          data: v
        };
      });
    }

    // 11. Instantiate 3D Emergency Ambulance (EB -> Heading 0)
    ambulanceGroup = create3DAmbulance();

    // 12. Instantiate 3D Pedestrians
    if (pedestriansData && Array.isArray(pedestriansData)) {
      pedestriansData.forEach((p, idx) => {
        const mesh = create3DPedestrian(p);
        pedMeshMap['ped_' + idx] = {
          mesh: mesh,
          data: p
        };
      });
    }

    // 13. Realistic Slanted Rain Line Segments System (Pooled & Lightweight)
    const rainPositions = new Float32Array(rainCount * 6); // 2 vertices per streak = 6 floats
    rainSpeeds = new Float32Array(rainCount);
    rainLengths = new Float32Array(rainCount);
    const windSlantX = -3.5;
    const windSlantZ = -1.8;

    for (let i = 0; i < rainCount; i++) {
      const idx = i * 6;
      const rx = (Math.random() - 0.5) * 1250;
      const ry = Math.random() * 320;
      const rz = (Math.random() - 0.5) * 850;
      const rlen = 16 + Math.random() * 8;
      rainSpeeds[i] = 340 + Math.random() * 120;
      rainLengths[i] = rlen;

      // Vertex 1: Top
      rainPositions[idx] = rx;
      rainPositions[idx + 1] = ry;
      rainPositions[idx + 2] = rz;

      // Vertex 2: Slanted Bottom
      rainPositions[idx + 3] = rx + windSlantX;
      rainPositions[idx + 4] = ry - rlen;
      rainPositions[idx + 5] = rz + windSlantZ;
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.36,
      depthWrite: false
    });
    rainParticles = new THREE.LineSegments(rainGeo, rainMat);
    rainParticles.visible = false;
    scene.add(rainParticles);

    // 14. Interactive Mouse Tracking
    containerEl.addEventListener('mousemove', (e) => {
      const rect = containerEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseRelX = (e.clientX - rect.left) / rect.width - 0.5;
      mouseRelY = (e.clientY - rect.top) / rect.height - 0.5;
    }, { passive: true });

    containerEl.addEventListener('mouseleave', () => {
      mouseRelX = 0;
      mouseRelY = 0;
    }, { passive: true });

    window.addEventListener('resize', onResize);
    if (typeof ResizeObserver !== 'undefined' && containerEl) {
      const ro = new ResizeObserver(() => {
        onResize();
      });
      ro.observe(containerEl);
    }

    // Warm-up shader precompilation to eliminate runtime shader compilation stutter
    if (renderer && renderer.compile) {
      if (ambulanceGroup) ambulanceGroup.visible = true;
      if (rainParticles) rainParticles.visible = true;
      renderer.compile(scene, camera);
      if (ambulanceGroup) ambulanceGroup.visible = false;
      if (rainParticles) rainParticles.visible = false;
    }

    isReady = true;
  }

  function onResize() {
    if (!renderer || !camera || !canvasEl) return;
    let width = canvasEl.clientWidth;
    let height = canvasEl.clientHeight;
    if (!width || !height || width <= 0 || height <= 0) {
      if (containerEl && containerEl.clientWidth > 0 && containerEl.clientHeight > 0) {
        width = containerEl.clientWidth;
        height = containerEl.clientHeight;
      } else if (window.innerWidth > 0 && window.innerHeight > 0) {
        width = window.innerWidth;
        height = window.innerHeight;
      }
    }
    if (width > 0 && height > 0) {
      const aspect = width / height;
      updateCameraFraming(aspect);
      renderer.setSize(width, height, false);
    }
  }

  // -------------------------------------------------------------
  // Public API Exposed to Window
  // -------------------------------------------------------------
  window.initDhakaCrossroads3D = function(canvasId, containerId, vehiclesData, pedestriansData) {
    if (isInitialized) return;
    canvasEl = document.getElementById(canvasId);
    containerEl = document.getElementById(containerId);
    if (!canvasEl || !containerEl || typeof THREE === 'undefined') return;

    isInitialized = true;
    scene = new THREE.Scene();
    buildScene(vehiclesData, pedestriansData);
  };

  window.isDhakaCrossroads3DReady = function() {
    return isReady;
  };

  window.resizeDhakaCrossroads3D = function() {
    onResize();
  };

  window.getDhakaCrossroads3DMetrics = function() {
    return {
      fps: Math.round(currentFps),
      avgFrameTimeMs: parseFloat(avgFrameTimeMs.toFixed(2)),
      pixelRatio: renderer ? (renderer.getPixelRatio ? renderer.getPixelRatio() : 1) : 1,
      drawCalls: renderer && renderer.info ? renderer.info.render.calls : 0,
      triangles: renderer && renderer.info ? renderer.info.render.triangles : 0,
      geometries: renderer && renderer.info ? renderer.info.memory.geometries : 0,
      textures: renderer && renderer.info ? renderer.info.memory.textures : 0
    };
  };

  let strobeTimer = 0;
  let lastWeatherMode = null;

  window.updateDhakaCrossroads3D = function(dt, trainX, trainState, emergencyWaveActive, ambulanceX, activePhase, isRain, weatherMode) {
    if (!isReady || !renderer || !scene || !camera) return;

    // Atmospheric Weather Mode Transition (Sunrise, Sun, Sunset, Night, Fog Day, Fog Night, Rain)
    const currentMode = weatherMode || containerEl?.dataset?.crossroadsWeather || (isRain ? 'rain' : 'night');
    if (currentMode !== lastWeatherMode) {
      lastWeatherMode = currentMode;
      if (currentMode === 'sunrise') {
        scene.background.setHex(0x311b38);
        if (scene.fog) {
          scene.fog.color.setHex(0xf472b6);
          scene.fog.density = 0.0006;
        }
        if (sunLight) {
          sunLight.color.setHex(0xffaa88);
          sunLight.intensity = 1.35;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0xfbcfe8);
          ambientLight.intensity = 0.70;
        }
      } else if (currentMode === 'sunrise_overcast') {
        scene.background.setHex(0x1a1921);
        if (scene.fog) {
          scene.fog.color.setHex(0x322830);
          scene.fog.density = 0.0012;
        }
        if (sunLight) {
          sunLight.color.setHex(0xfb7185);
          sunLight.intensity = 0.80;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x3b3340);
          ambientLight.intensity = 0.55;
        }
      } else if (currentMode === 'fog_sunrise') {
        scene.background.setHex(0x2e1f2f);
        if (scene.fog) {
          scene.fog.color.setHex(0x7c4d5a);
          scene.fog.density = 0.0022;
        }
        if (sunLight) {
          sunLight.color.setHex(0xfed7aa);
          sunLight.intensity = 0.85;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0xfbcfe8);
          ambientLight.intensity = 0.70;
        }
      } else if (currentMode === 'morning_overcast') {
        scene.background.setHex(0x1e2129);
        if (scene.fog) {
          scene.fog.color.setHex(0x282e38);
          scene.fog.density = 0.0013;
        }
        if (sunLight) {
          sunLight.color.setHex(0x94a3b8);
          sunLight.intensity = 0.75;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x333b47);
          ambientLight.intensity = 0.55;
        }
      } else if (currentMode === 'sun') {
        scene.background.setHex(0x0284c7);
        if (scene.fog) {
          scene.fog.color.setHex(0x0284c7);
          scene.fog.density = 0.0004;
        }
        if (sunLight) {
          sunLight.color.setHex(0xffeedd);
          sunLight.intensity = 1.6;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x7dd3fc);
          ambientLight.intensity = 0.75;
        }
      } else if (currentMode === 'day_overcast') {
        scene.background.setHex(0x12151b);
        if (scene.fog) {
          scene.fog.color.setHex(0x1f232b);
          scene.fog.density = 0.0014;
        }
        if (sunLight) {
          sunLight.color.setHex(0x64748b);
          sunLight.intensity = 0.70;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x272c36);
          ambientLight.intensity = 0.50;
        }
      } else if (currentMode === 'sunset') {
        scene.background.setHex(0x311006);
        if (scene.fog) {
          scene.fog.color.setHex(0x431407);
          scene.fog.density = 0.0006;
        }
        if (sunLight) {
          sunLight.color.setHex(0xff7722);
          sunLight.intensity = 1.35;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0xfb923c);
          ambientLight.intensity = 0.7;
        }
      } else if (currentMode === 'sunset_overcast') {
        scene.background.setHex(0x20141d);
        if (scene.fog) {
          scene.fog.color.setHex(0x3a2228);
          scene.fog.density = 0.0013;
        }
        if (sunLight) {
          sunLight.color.setHex(0xea580c);
          sunLight.intensity = 0.85;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x4a2a2d);
          ambientLight.intensity = 0.50;
        }
      } else if (currentMode === 'fog_sunset') {
        scene.background.setHex(0x2a1510);
        if (scene.fog) {
          scene.fog.color.setHex(0x7c2d12);
          scene.fog.density = 0.0024;
        }
        if (sunLight) {
          sunLight.color.setHex(0xea580c);
          sunLight.intensity = 0.80;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0xc2410c);
          ambientLight.intensity = 0.55;
        }
      } else if (currentMode === 'fog_day') {
        scene.background.setHex(0x94a3b8);
        if (scene.fog) {
          scene.fog.color.setHex(0xb0c4de);
          scene.fog.density = 0.0022;
        }
        if (sunLight) {
          sunLight.color.setHex(0xe2e8f0);
          sunLight.intensity = 0.9;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x94a3b8);
          ambientLight.intensity = 0.85;
        }
      } else if (currentMode === 'fog_night') {
        scene.background.setHex(0x050914);
        if (scene.fog) {
          scene.fog.color.setHex(0x0a1120);
          scene.fog.density = 0.0025;
        }
        if (sunLight) {
          sunLight.color.setHex(0x60a5fa);
          sunLight.intensity = 0.42;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x1e293b);
          ambientLight.intensity = 0.52;
        }
      } else if (currentMode === 'rain') {
        scene.background.setHex(0x0a1120);
        if (scene.fog) {
          scene.fog.color.setHex(0x0f172a);
          scene.fog.density = 0.0012;
        }
        if (sunLight) {
          sunLight.color.setHex(0x60a5fa);
          sunLight.intensity = 0.65;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x1e293b);
          ambientLight.intensity = 0.6;
        }
      } else if (currentMode === 'night_overcast') {
        scene.background.setHex(0x090b10);
        if (scene.fog) {
          scene.fog.color.setHex(0x111622);
          scene.fog.density = 0.0015;
        }
        if (sunLight) {
          sunLight.color.setHex(0x475569);
          sunLight.intensity = 0.40;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x181e29);
          ambientLight.intensity = 0.35;
        }
      } else { // night
        scene.background.setHex(0x040814);
        if (scene.fog) {
          scene.fog.color.setHex(0x060e20);
          scene.fog.density = 0.0005;
        }
        if (sunLight) {
          sunLight.color.setHex(0x93c5fd);
          sunLight.intensity = 0.45;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0x1e293b);
          ambientLight.intensity = 0.55;
        }
      }
    }

    // 1. Update Metro Train position & Boarding badge
    if (trainGroup) {
      trainGroup.position.x = trainX - 600;
    }
    if (boardingBadgeMesh) {
      boardingBadgeMesh.visible = (trainState === 'boarding');
    }

    // 2. Update Live Vehicles with physically accurate lane coordinates
    for (const id in vehicleMeshMap) {
      const vm = vehicleMeshMap[id];
      const v = vm.data;
      if (!v || !vm.mesh) continue;

      if (v.dir === 'EB') {
        const laneZ = (typeof v.currentLaneY !== 'undefined') ? (v.currentLaneY - 420) : (v.lane === 1 ? 18 : 48);
        vm.mesh.position.set(v.pos - 600, 0, laneZ);
      } else if (v.dir === 'WB') {
        const laneZ = (typeof v.currentLaneY !== 'undefined') ? (v.currentLaneY - 420) : (v.lane === 1 ? -15 : -52);
        vm.mesh.position.set(v.pos - 600, 0, laneZ);
      } else if (v.dir === 'SB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? -20 : -58);
        vm.mesh.position.set(laneX, 0, v.pos - 420);
      } else if (v.dir === 'NB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? 18 : 56);
        vm.mesh.position.set(laneX, 0, v.pos - 420);
      }
    }

    // 3. Update Ambulance
    if (ambulanceGroup) {
      if (emergencyWaveActive && ambulanceX > -170 && ambulanceX < 1350) {
        ambulanceGroup.visible = true;
        ambulanceGroup.position.set(ambulanceX - 600, 0, 18);

        // Flashing Strobe Lights
        strobeTimer += dt * 18;
        const isRed = Math.floor(strobeTimer) % 2 === 0;
        if (ambStrobeRed) ambStrobeRed.intensity = isRed ? 3.0 : 0.2;
        if (ambStrobeBlue) ambStrobeBlue.intensity = isRed ? 0.2 : 3.0;
      } else {
        ambulanceGroup.visible = false;
        if (ambStrobeRed && ambStrobeRed.intensity > 0) ambStrobeRed.intensity = 0;
        if (ambStrobeBlue && ambStrobeBlue.intensity > 0) ambStrobeBlue.intensity = 0;
      }
    }

    // 4. Update Pedestrians with Coordinated Arm/Leg Walking Animations & Rain Umbrellas
    for (const key in pedMeshMap) {
      const pm = pedMeshMap[key];
      const p = pm.data;
      if (!p || !pm.mesh) continue;

      // Umbrellas toggle on during rain for ALL pedestrians
      if (pm.mesh.userData && pm.mesh.userData.umbrella) {
        pm.mesh.userData.umbrella.visible = !!isRain;
      }

      let coord = 0;
      let isMoving = true;
      let rotY = 0;
      let posX = 0, posZ = 0;

      if (p.isSidewalk) {
        coord = typeof p.pos !== 'undefined' ? p.pos : p.start;
        isMoving = true;
        if (p.axis === 'H') {
          posX = coord - 600;
          posZ = p.y - 420;
          rotY = (p.dirForward !== false) ? 0 : Math.PI;
        } else {
          posX = p.x - 600;
          posZ = coord - 420;
          rotY = (p.dirForward !== false) ? -Math.PI / 2 : Math.PI / 2;
        }
      } else {
        // Crosswalk pedestrian
        coord = (typeof p.currentCoord !== 'undefined') ? p.currentCoord : p.start;
        isMoving = Math.abs(coord - p.start) > 2;
        if (p.axis === 'H') {
          posX = coord - 600;
          posZ = p.y - 420;
          rotY = (p.end > p.start) ? 0 : Math.PI;
        } else {
          posX = p.x - 600;
          posZ = coord - 420;
          rotY = (p.end > p.start) ? -Math.PI / 2 : Math.PI / 2;
        }
      }

      const walkPhase = coord * 0.22;
      const legAngle = isMoving ? Math.sin(walkPhase) * 0.45 : 0;
      const armAngle = isMoving ? Math.sin(walkPhase) * 0.4 : 0;
      const bob = isMoving ? Math.abs(Math.sin(walkPhase * 2)) * 0.4 : 0;

      if (pm.mesh.userData.leftLeg) pm.mesh.userData.leftLeg.rotation.x = legAngle;
      if (pm.mesh.userData.rightLeg) pm.mesh.userData.rightLeg.rotation.x = -legAngle;
      if (pm.mesh.userData.leftArm) pm.mesh.userData.leftArm.rotation.x = -armAngle;

      if (pm.mesh.userData.rightArm) {
        if (isRain) {
          // Hand raised holding umbrella shaft upright
          pm.mesh.userData.rightArm.rotation.x = -0.55;
          pm.mesh.userData.rightArm.rotation.z = 0.2;
        } else {
          pm.mesh.userData.rightArm.rotation.x = armAngle;
          pm.mesh.userData.rightArm.rotation.z = 0;
        }
      }

      pm.mesh.position.set(posX, 1 + bob, posZ);
      pm.mesh.rotation.y = rotY;
    }

    // 5. Update Traffic Signal Lights (Cached to eliminate redundant material uniform updates)
    if (activePhase) {
      const isEmergencyGreenWave = emergencyWaveActive && ambulanceX >= -100 && ambulanceX <= 780;
      const isNSGreen = !isEmergencyGreenWave && activePhase.nsLight === 'green';
      const isNSYellow = !isEmergencyGreenWave && activePhase.nsLight === 'yellow';
      const isNSRed = isEmergencyGreenWave || activePhase.nsLight === 'red';

      const isEWGreen = isEmergencyGreenWave || activePhase.ewLight === 'green';
      const isEWYellow = !isEmergencyGreenWave && activePhase.ewLight === 'yellow';
      const isEWRed = !isEmergencyGreenWave && activePhase.ewLight === 'red';

      const sigKey = `${isNSGreen ? 1 : 0}${isNSYellow ? 1 : 0}${isNSRed ? 1 : 0}_${isEWGreen ? 1 : 0}${isEWYellow ? 1 : 0}${isEWRed ? 1 : 0}`;
      if (sigKey !== lastSignalStateKey) {
        lastSignalStateKey = sigKey;

        const R_ON = 0xff1744, R_OFF = 0x200508;
        const Y_ON = 0xffea00, Y_OFF = 0x261a02;
        const G_ON = 0x00e676, G_OFF = 0x02210f;

        // NW & NE: N-S approaches
        [signalLamps.nw, signalLamps.ne].forEach(sig => {
          if (!sig) return;
          sig.red.color.setHex(isNSRed ? R_ON : R_OFF);
          sig.yellow.color.setHex(isNSYellow ? Y_ON : Y_OFF);
          sig.green.color.setHex(isNSGreen ? G_ON : G_OFF);
        });

        // SW & SE: E-W approaches
        [signalLamps.sw, signalLamps.se].forEach(sig => {
          if (!sig) return;
          sig.red.color.setHex(isEWRed ? R_ON : R_OFF);
          sig.yellow.color.setHex(isEWYellow ? Y_ON : Y_OFF);
          sig.green.color.setHex(isEWGreen ? G_ON : G_OFF);
        });
      }
    }

    // 6. Realistic Slanted Rain Streaks & Wet Asphalt Transition
    if (rainParticles) {
      rainParticles.visible = !!isRain;
      if (isRain && rainSpeeds && rainLengths) {
        const positions = rainParticles.geometry.attributes.position.array;
        const windSlantX = -3.5;
        const windSlantZ = -1.8;
        for (let i = 0; i < rainCount; i++) {
          const idx = i * 6;
          const fallDist = rainSpeeds[i] * dt;
          positions[idx + 1] -= fallDist;
          positions[idx + 4] = positions[idx + 1] - rainLengths[i];
          if (positions[idx + 1] < 0) {
            const rx = (Math.random() - 0.5) * 1250;
            const ry = 280 + Math.random() * 40;
            const rz = (Math.random() - 0.5) * 850;
            positions[idx] = rx;
            positions[idx + 1] = ry;
            positions[idx + 2] = rz;
            positions[idx + 3] = rx + windSlantX;
            positions[idx + 4] = ry - rainLengths[i];
            positions[idx + 5] = rz + windSlantZ;
          }
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Dynamic Road Wetness & Specular Sheen during Rain
    if (roadMaterial) {
      const targetRoughness = isRain ? 0.28 : 0.85;
      const targetMetalness = isRain ? 0.18 : 0.04;
      roadMaterial.roughness += (targetRoughness - roadMaterial.roughness) * Math.min(1, dt * 3.0);
      roadMaterial.metalness += (targetMetalness - roadMaterial.metalness) * Math.min(1, dt * 3.0);
    }

    // 7. Interactive Drone Camera Banking & Pitching (Optimized convergence)
    targetCamX = camBasePos.x + mouseRelX * 65;
    targetCamY = camBasePos.y - mouseRelY * 45;
    const diffX = targetCamX - camera.position.x;
    const diffY = targetCamY - camera.position.y;
    if (Math.abs(diffX) > 0.02 || Math.abs(diffY) > 0.02) {
      camera.position.x += diffX * 0.08;
      camera.position.y += diffY * 0.08;
      camera.lookAt(camBaseLook.x, camBaseLook.y, camBaseLook.z);
    }

    // 8. Render Scene & Measure Performance
    const renderT0 = performance.now();
    renderer.render(scene, camera);
    const renderTimeMs = performance.now() - renderT0;

    // Performance telemetry
    perfFrameCount++;
    perfTotalCpuMs += renderTimeMs;
    const nowTime = performance.now();
    if (nowTime - perfLastSampleTime >= 500) {
      currentFps = (perfFrameCount * 1000) / (nowTime - perfLastSampleTime);
      avgFrameTimeMs = perfTotalCpuMs / perfFrameCount;
      perfFrameCount = 0;
      perfTotalCpuMs = 0;
      perfLastSampleTime = nowTime;
    }
  };

})();

