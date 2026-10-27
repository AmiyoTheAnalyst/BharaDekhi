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

  // Performance caches & 120 FPS optimization resources
  let whiteMarkMat = null;
  let yellowMarkMat = null;
  let sidewalkMat = null;
  let curbMat = null;
  let treeTrunkGeo = null, treeTrunkMat = null;
  let treeFoliageGeo = null, treeFoliageMat = null;
  let vehicleHeadlightMat = null;
  let vehicleTaillightMat = null;
  let sharedWheelMat = null;
  let sharedWheelGeos = {};
  let sharedBuildingDepthMat = null;
  let lastSignalStateKey = '';

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
    if (!sharedWheelMat) sharedWheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    if (!vehicleHeadlightMat) vehicleHeadlightMat = new THREE.MeshBasicMaterial({ color: 0xfff08a });
    if (!vehicleTaillightMat) vehicleTaillightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

    const group = new THREE.Group();

    if (type === 'bus') {
      const length = 72;
      const width = 22;
      const height = 18;

      const bodyGeo = new THREE.BoxGeometry(length, height, width);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex || 0xdc2626, roughness: 0.4 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = height / 2 + 3;
      body.castShadow = true;
      group.add(body);

      // White Roof Cap
      const roofGeo = new THREE.BoxGeometry(length, 2.5, width);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = height + 3.5;
      group.add(roof);

      // Passenger Windows
      const winGeo = new THREE.BoxGeometry(length * 0.9, 5, width + 0.4);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.y = height * 0.72 + 3;
      group.add(win);

      // Front Destination Board
      const destTex = createSignboardTexture('মিরপুর ১০', 'MIRPUR 10', '#0f172a', '#fef08a', '#38bdf8', '#facc15', 128, 48);
      const destGeo = new THREE.BoxGeometry(1.5, 4.5, 14);
      const dest = new THREE.Mesh(destGeo, new THREE.MeshBasicMaterial({ map: destTex }));
      dest.position.set(length / 2 + 0.5, height * 0.8 + 3, 0);
      group.add(dest);

      // 4 Rubber Wheels
      const wheelGeo = getSharedWheelGeo(4, 2.5, 12);
      [-1, 1].forEach(wz => {
        [-22, 22].forEach(wx => {
          const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 4, wz * (width / 2));
          group.add(wheel);
        });
      });

      // Warm Front Headlights (Facing +X)
      const hlGeo = new THREE.BoxGeometry(1.2, 3, 4);
      [-5, 5].forEach(hz => {
        const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
        hl.position.set(length / 2 + 0.6, 6.5, hz);
        group.add(hl);
      });

      // Red Taillights (Facing -X)
      [-6, 6].forEach(tz => {
        const tlGeo = new THREE.SphereGeometry(1.2, 6, 6);
        const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
        tl.position.set(-length / 2 - 0.5, 6, tz);
        group.add(tl);
      });

    } else if (type === 'car') {
      const length = 42;
      const width = 18;
      const height = 12;

      const bodyGeo = new THREE.BoxGeometry(length, height * 0.6, width);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex || 0xf8fafc, roughness: 0.3, metalness: 0.2 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = height * 0.3 + 3;
      body.castShadow = true;
      group.add(body);

      // Cabin Top
      const cabGeo = new THREE.BoxGeometry(length * 0.55, height * 0.55, width * 0.85);
      const cabMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(-2, height * 0.75 + 3, 0);
      group.add(cab);

      // Glass Windshields
      const glassGeo = new THREE.BoxGeometry(length * 0.52, height * 0.45, width * 0.86);
      const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(-2, height * 0.75 + 3, 0);
      group.add(glass);

      // 4 Wheels
      const wheelGeo = getSharedWheelGeo(3, 1.8, 10);
      [-1, 1].forEach(wz => {
        [-13, 13].forEach(wx => {
          const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(wx, 3, wz * (width / 2));
          group.add(wheel);
        });
      });

      // Front Headlights
      const hlGeo = new THREE.BoxGeometry(1.0, 2.2, 3.2);
      [-5, 5].forEach(hz => {
        const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
        hl.position.set(length / 2 + 0.5, 4.5, hz);
        group.add(hl);
      });

    } else if (type === 'cng') {
      const length = 28;
      const width = 15;
      const height = 14;

      const bodyGeo = new THREE.BoxGeometry(length, height * 0.7, width);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex || 0x16a34a, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = height * 0.35 + 2.5;
      body.castShadow = true;
      group.add(body);

      // Yellow Curved Roof
      const roofGeo = new THREE.CylinderGeometry(width * 0.5, width * 0.5, length, 12, 1, false, 0, Math.PI);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.z = Math.PI / 2;
      roof.position.y = height + 1;
      group.add(roof);

      // 3 Wheels (1 front at +X, 2 rear at -X)
      const wheelGeo = getSharedWheelGeo(2.5, 1.5, 8);
      [-1, 1].forEach(wz => {
        const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(-length / 3, 2.5, wz * (width / 2));
        group.add(wheel);
      });
      const fWheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
      fWheel.rotation.x = Math.PI / 2;
      fWheel.position.set(length / 3, 2.5, 0);
      group.add(fWheel);

      const hlGeo = new THREE.BoxGeometry(1.0, 2.2, 3.0);
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.position.set(length / 2 + 0.5, 4.5, 0);
      group.add(hl);

    } else if (type === 'rickshaw') {
      const length = 32;
      const width = 16;

      // Passenger Hood Canopy (Rear at -X)
      const hoodGeo = new THREE.CylinderGeometry(6, 6, 12, 10, 1, false, 0, Math.PI);
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
      const hood = new THREE.Mesh(hoodGeo, hoodMat);
      hood.rotation.z = Math.PI / 2;
      hood.position.set(-length * 0.25, 10, 0);
      group.add(hood);

      // Passenger Seat Box
      const seatGeo = new THREE.BoxGeometry(length * 0.45, 6, width);
      const seatMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.set(-length * 0.25, 5, 0);
      group.add(seat);

      // Pedaler Figure (Front at +X)
      const pedBodyGeo = new THREE.CylinderGeometry(1.5, 1.8, 8, 8);
      const pedBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
      const pedBody = new THREE.Mesh(pedBodyGeo, pedBodyMat);
      pedBody.position.set(length * 0.15, 8, 0);
      group.add(pedBody);

      const headGeo = new THREE.SphereGeometry(1.6, 8, 8);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(length * 0.15, 13, 0);
      group.add(head);

      // 3 Spoke Wheels (1 front at +X, 2 rear at -X)
      const spkGeo = getSharedWheelGeo(3.5, 1.2, 10);
      [-1, 1].forEach(wz => {
        const w = new THREE.Mesh(spkGeo, sharedWheelMat);
        w.rotation.x = Math.PI / 2;
        w.position.set(-length * 0.3, 3.5, wz * (width / 2));
        group.add(w);
      });
      const fw = new THREE.Mesh(spkGeo, sharedWheelMat);
      fw.rotation.x = Math.PI / 2;
      fw.position.set(length * 0.35, 3.5, 0);
      group.add(fw);

      const hlGeo = new THREE.BoxGeometry(1.0, 2.0, 2.0);
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.position.set(length * 0.45, 5, 0);
      group.add(hl);

    } else if (type === 'bike') {
      const length = 24;
      const width = 8;

      const frameGeo = new THREE.BoxGeometry(length, 4, width);
      const frameMat = new THREE.MeshStandardMaterial({ color: colorHex || 0x38bdf8 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = 5;
      group.add(frame);

      // Rider
      const riderGeo = new THREE.CylinderGeometry(1.2, 1.5, 7, 8);
      const riderMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
      const rider = new THREE.Mesh(riderGeo, riderMat);
      rider.position.set(0, 8.5, 0);
      group.add(rider);

      const helmGeo = new THREE.SphereGeometry(1.6, 8, 8);
      const helmMat = new THREE.MeshStandardMaterial({ color: colorHex || 0x38bdf8 });
      const helm = new THREE.Mesh(helmGeo, helmMat);
      helm.position.set(0, 13, 0);
      group.add(helm);

      // 2 Wheels (Front at +X, Rear at -X)
      const wheelGeo = getSharedWheelGeo(3, 1.2, 8);
      [-length / 3, length / 3].forEach(px => {
        const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(px, 3, 0);
        group.add(wheel);
      });

      const hlGeo = new THREE.BoxGeometry(1.0, 2.0, 2.0);
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.position.set(length / 2 + 0.5, 6, 0);
      group.add(hl);
    }

    scene.add(group);
    return group;
  }

  // 3D Ambulance Builder (Facing +X)
  function create3DAmbulance() {
    const ambGroup = new THREE.Group();
    const length = 52;
    const width = 20;
    const height = 18;

    // White Van Body
    const bodyGeo = new THREE.BoxGeometry(length, height, width);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2 + 3;
    body.castShadow = true;
    ambGroup.add(body);

    // Red Stripe
    const strGeo = new THREE.BoxGeometry(length, 3, width + 0.3);
    const strMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const str = new THREE.Mesh(strGeo, strMat);
    str.position.y = height * 0.45 + 3;
    ambGroup.add(str);

    // Red Cross Decals
    const cross1Geo = new THREE.BoxGeometry(8, 2.5, width + 0.5);
    const cross1 = new THREE.Mesh(cross1Geo, strMat);
    cross1.position.set(-5, height * 0.5 + 3, 0);
    ambGroup.add(cross1);

    const cross2Geo = new THREE.BoxGeometry(2.5, 8, width + 0.5);
    const cross2 = new THREE.Mesh(cross2Geo, strMat);
    cross2.position.set(-5, height * 0.5 + 3, 0);
    ambGroup.add(cross2);

    // Windshield (Front at +X)
    const winGeo = new THREE.BoxGeometry(10, 6, width + 0.2);
    const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(length * 0.35, height * 0.65 + 3, 0);
    ambGroup.add(win);

    // Rooftop Lightbar
    const barGeo = new THREE.BoxGeometry(14, 3, 8);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(0, height + 4.5, 0);
    ambGroup.add(bar);

    // Dual Flashing Strobes: Red & Blue (Active emergency only)
    ambStrobeRed = new THREE.PointLight(0xff0000, 2.5, 120);
    ambStrobeRed.position.set(-4, height + 7, 0);
    ambGroup.add(ambStrobeRed);

    ambStrobeBlue = new THREE.PointLight(0x0066ff, 2.5, 120);
    ambStrobeBlue.position.set(4, height + 7, 0);
    ambGroup.add(ambStrobeBlue);

    // Wheels
    const wheelGeo = getSharedWheelGeo(3.5, 2, 10);
    [-1, 1].forEach(wz => {
      [-16, 16].forEach(wx => {
        const wheel = new THREE.Mesh(wheelGeo, sharedWheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 3.5, wz * (width / 2));
        ambGroup.add(wheel);
      });
    });

    // Front Headlights
    const hlGeo = new THREE.BoxGeometry(1.2, 3, 4);
    [-5, 5].forEach(hz => {
      const hl = new THREE.Mesh(hlGeo, vehicleHeadlightMat);
      hl.position.set(length / 2 + 0.6, 6, hz);
      ambGroup.add(hl);
    });

    ambGroup.visible = false;
    scene.add(ambGroup);
    return ambGroup;
  }

  // 3D Pedestrian Builder
  function create3DPedestrian(p) {
    const group = new THREE.Group();

    // Body Cylinder
    const bodyGeo = new THREE.CylinderGeometry(1.2, 1.5, 6, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: p.color ? parseInt(p.color.replace('#', '0x'), 16) : 0x38bdf8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 5;
    group.add(body);

    // Head Sphere
    const headGeo = new THREE.SphereGeometry(1.3, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 9;
    group.add(head);

    // Umbrella Canopy (for Rainy Atmosphere)
    const umbGeo = new THREE.CylinderGeometry(0.5, 6.5, 3, 12, 1, false, 0, Math.PI * 2);
    const umbMat = new THREE.MeshStandardMaterial({
      color: p.umbrellaColor ? parseInt(p.umbrellaColor.replace('#', '0x'), 16) : 0xdc2626,
      roughness: 0.3
    });
    const umb = new THREE.Mesh(umbGeo, umbMat);
    umb.position.y = 12.5;
    umb.visible = false;
    group.add(umb);
    group.userData.umbrella = umb;

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
    if (dir === 'SB') return Math.PI / 2;  // Facing +Z (South)
    if (dir === 'NB') return -Math.PI / 2; // Facing -Z (North)
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
    camera.position.set(CAM_DEFAULT_POS.x, CAM_DEFAULT_POS.y, CAM_DEFAULT_POS.z);
    camera.lookAt(CAM_DEFAULT_LOOK.x, CAM_DEFAULT_LOOK.y, CAM_DEFAULT_LOOK.z);

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

    // 13. Subtle Rain Particle System (Ready for toggling)
    const rainCount = 600;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 1200;
      rainPositions[i + 1] = Math.random() * 300;
      rainPositions[i + 2] = (Math.random() - 0.5) * 800;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.5,
      transparent: true,
      opacity: 0.5
    });
    rainParticles = new THREE.Points(rainGeo, rainMat);
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
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
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

  window.updateDhakaCrossroads3D = function(dt, trainX, trainState, emergencyWaveActive, ambulanceX, activePhase, isRain) {
    if (!isReady || !renderer || !scene || !camera) return;

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
        let laneZ = v.lane === 1 ? 18 : 48;
        if (emergencyWaveActive && v.pos > ambulanceX - 50 && v.pos < ambulanceX + 260) {
          laneZ += 6; // nudge toward curb for ambulance corridor
        }
        vm.mesh.position.set(v.pos - 600, 0, laneZ);
      } else if (v.dir === 'WB') {
        const laneZ = v.lane === 1 ? -15 : -52;
        vm.mesh.position.set(v.pos - 600, 0, laneZ);
      } else if (v.dir === 'SB') {
        const laneX = v.lane === 1 ? -20 : -58;
        vm.mesh.position.set(laneX, 0, v.pos - 420);
      } else if (v.dir === 'NB') {
        const laneX = v.lane === 1 ? 18 : 56;
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

    // 4. Update Pedestrians
    for (const key in pedMeshMap) {
      const pm = pedMeshMap[key];
      const p = pm.data;
      if (!p || !pm.mesh) continue;

      if (p.isSidewalk) {
        const coord = typeof p.pos !== 'undefined' ? p.pos : p.start;
        if (p.axis === 'H') {
          pm.mesh.position.set(coord - 600, 1, p.y - 420);
          pm.mesh.rotation.y = (p.dirForward !== false) ? 0 : Math.PI;
        } else {
          pm.mesh.position.set(p.x - 600, 1, coord - 420);
          pm.mesh.rotation.y = (p.dirForward !== false) ? Math.PI / 2 : -Math.PI / 2;
        }
      } else {
        // Crosswalk pedestrian
        if (pm.mesh.userData && pm.mesh.userData.umbrella) {
          pm.mesh.userData.umbrella.visible = !!isRain;
        }
        if (p.axis === 'H') {
          const coord = (typeof p.currentCoord !== 'undefined') ? p.currentCoord : p.start;
          pm.mesh.position.set(coord - 600, 1, p.y - 420);
        } else {
          const coord = (typeof p.currentCoord !== 'undefined') ? p.currentCoord : p.start;
          pm.mesh.position.set(p.x - 600, 1, coord - 420);
        }
      }
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

    // 6. Rain Particle System
    if (rainParticles) {
      rainParticles.visible = !!isRain;
      if (isRain) {
        const positions = rainParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 350 * dt;
          if (positions[i] < 0) positions[i] = 300;
        }
        rainParticles.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 7. Interactive Drone Camera Banking & Pitching (Optimized convergence)
    targetCamX = CAM_DEFAULT_POS.x + mouseRelX * 65;
    targetCamY = CAM_DEFAULT_POS.y - mouseRelY * 45;
    const diffX = targetCamX - camera.position.x;
    const diffY = targetCamY - camera.position.y;
    if (Math.abs(diffX) > 0.02 || Math.abs(diffY) > 0.02) {
      camera.position.x += diffX * 0.08;
      camera.position.y += diffY * 0.08;
      camera.lookAt(CAM_DEFAULT_LOOK.x, CAM_DEFAULT_LOOK.y, CAM_DEFAULT_LOOK.z);
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

