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
  let sunLight, ambientLight, hemiLight;
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
  let targetCamX = 220, targetCamY = 440;
  const CAM_DEFAULT_POS = { x: 220, y: 440, z: 460 };
  const CAM_DEFAULT_LOOK = { x: 0, y: 25, z: -35 };
  const VIADUCT_Z = -332;
  let camBasePos = { x: 220, y: 440, z: 460 };
  let camBaseLook = { x: 0, y: 25, z: -35 };
  let currentCamLook = { x: 0, y: 25, z: -35 };
  let idleDroneTime = 0;

  // Multimodal Camera Choreography Presets
  const CAM_MODES = {
    overview: {
      pos: { x: 220, y: 440, z: 460 },
      look: { x: 0, y: 25, z: -35 },
      badge: 'Drone View'
    },
    cng_bike_car: {
      pos: { x: 75, y: 38, z: 120 },
      look: { x: 5, y: 14, z: 10 },
      badge: 'Tracking Vehicles'
    },
    metro: {
      pos: { x: -160, y: 140, z: 165 },
      look: { x: 10, y: 105, z: -25 },
      badge: 'MRT-6 Viaduct'
    },
    bus: {
      pos: { x: -95, y: 42, z: 135 },
      look: { x: -15, y: 18, z: 20 },
      badge: 'BRTA Bus Lane'
    },
    rickshaw: {
      pos: { x: 50, y: 30, z: 85 },
      look: { x: 15, y: 8, z: -5 },
      badge: 'Cycle Rickshaw'
    },
    walking: {
      pos: { x: 0, y: 52, z: 110 },
      look: { x: 0, y: 6, z: 0 },
      badge: 'Zebra Crosswalk'
    }
  };

  const clock = new THREE.Clock();
  let activeCamMode = 'overview';
  let activeTargetVehicle = null;

  function acquireTargetVehicle(modeName) {
    if (modeName === 'metro') {
      if (trainGroup) {
        return { type: 'metro', mesh: trainGroup, dir: 'EB', speed: 78 };
      }
      return null;
    }

    if (modeName === 'cng_bike_car') {
      const eligible = Object.values(vehicleMeshMap).filter(vm => {
        const t = vm.data?.type;
        return (t === 'car' || t === 'cng' || t === 'bike') && Math.abs((vm.data?.pos || 0) - 600) < 550;
      });
      if (eligible.length > 0) {
        eligible.sort((a, b) => Math.abs((a.data?.pos || 0) - 600) - Math.abs((b.data?.pos || 0) - 600));
        return { type: eligible[0].data.type, mesh: eligible[0].mesh, data: eligible[0].data };
      }
    } else if (modeName === 'bus') {
      const eligible = Object.values(vehicleMeshMap).filter(vm => {
        return vm.data?.type === 'bus' && Math.abs((vm.data?.pos || 0) - 600) < 550;
      });
      if (eligible.length > 0) {
        eligible.sort((a, b) => Math.abs((a.data?.pos || 0) - 600) - Math.abs((b.data?.pos || 0) - 600));
        return { type: 'bus', mesh: eligible[0].mesh, data: eligible[0].data };
      }
    } else if (modeName === 'rickshaw') {
      const eligible = Object.values(vehicleMeshMap).filter(vm => {
        return vm.data?.type === 'rickshaw' && Math.abs((vm.data?.pos || 0) - 600) < 550;
      });
      if (eligible.length > 0) {
        eligible.sort((a, b) => Math.abs((a.data?.pos || 0) - 600) - Math.abs((b.data?.pos || 0) - 600));
        return { type: 'rickshaw', mesh: eligible[0].mesh, data: eligible[0].data };
      }
    } else if (modeName === 'walking') {
      const eligible = Object.values(pedMeshMap).filter(pm => pm.mesh && pm.data);
      if (eligible.length > 0) {
        return { type: 'ped', mesh: eligible[0].mesh, data: eligible[0].data };
      }
    }

    return null;
  }

  function focusCamera(targetPos, targetLook, duration) {
    if (typeof gsap !== 'undefined') {
      gsap.killTweensOf(camBasePos);
      gsap.killTweensOf(camBaseLook);
      gsap.to(camBasePos, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: duration || 1.6,
        ease: 'power2.inOut'
      });
      gsap.to(camBaseLook, {
        x: targetLook.x,
        y: targetLook.y,
        z: targetLook.z,
        duration: duration || 1.6,
        ease: 'power2.inOut'
      });
    } else {
      camBasePos.x = targetPos.x;
      camBasePos.y = targetPos.y;
      camBasePos.z = targetPos.z;
      camBaseLook.x = targetLook.x;
      camBaseLook.y = targetLook.y;
      camBaseLook.z = targetLook.z;
    }
  }

  function updateLegendHUD(modeName) {
    ['metro', 'bus', 'cng_bike_car', 'rickshaw', 'walking'].forEach(m => {
      const btn = document.getElementById(`legendBtn_${m}`);
      if (!btn) return;
      if (m === modeName) {
        btn.classList.add('bg-sky-500/25', 'border-sky-400', 'shadow-[0_0_12px_rgba(56,189,248,0.4)]');
        btn.classList.remove('border-transparent');
      } else {
        btn.classList.remove('bg-sky-500/25', 'border-sky-400', 'shadow-[0_0_12px_rgba(56,189,248,0.4)]');
        btn.classList.add('border-transparent');
      }
    });

    const badge = document.getElementById('crossroadsCamModeBadge');
    if (badge && CAM_MODES[modeName]) {
      badge.textContent = CAM_MODES[modeName].badge;
    }

    const fareCard = document.getElementById('crossroadsFareComparisonCard');
    const modePill = document.getElementById('crossroadsModePill');

    if (modeName === 'cng_bike_car') {
      if (modePill) modePill.classList.add('hidden');
      if (fareCard) fareCard.classList.remove('hidden');
    } else if (['metro', 'bus', 'rickshaw', 'walking'].includes(modeName)) {
      if (fareCard) fareCard.classList.add('hidden');
      if (modePill) {
        modePill.classList.remove('hidden');
        const icon = document.getElementById('crossroadsModePillIcon');
        const title = document.getElementById('crossroadsModePillTitle');
        const sub = document.getElementById('crossroadsModePillSub');
        if (modeName === 'metro') {
          if (icon) icon.textContent = '🚆';
          if (title) title.textContent = 'MRT Line-6 · Mirpur 10 Station';
          if (sub) sub.textContent = 'High-speed electric viaduct bypassing ground gridlock (Base ৳20 · Max ৳100)';
        } else if (modeName === 'bus') {
          if (icon) icon.textContent = '🚌';
          if (title) title.textContent = 'BRTA & Dhaka City Bus Network';
          if (sub) sub.textContent = 'Route 12, Mirpur 10 ⇄ Motijheel / Uttara (Base ৳10 · Student Concession 50%)';
        } else if (modeName === 'rickshaw') {
          if (icon) icon.textContent = '🛺';
          if (title) title.textContent = 'Dhaka Traditional Cycle Rickshaw';
          if (sub) sub.textContent = 'Zero-emission local trips inside Mirpur sectors & lanes (Typical ৳25 – ৳60)';
        } else if (modeName === 'walking') {
          if (icon) icon.textContent = '🚶';
          if (title) title.textContent = 'Zebra Crossings & Pedestrian Walkway';
          if (sub) sub.textContent = 'Synchronized pedestrian signals across Mirpur 10 Crossroads (0 carbon, 0 taka)';
        }
      }
    } else {
      if (fareCard) fareCard.classList.add('hidden');
      if (modePill) modePill.classList.add('hidden');
    }
  }

  window.crossroadsFocusMode = function(modeName) {
    if (typeof window.setCrossroadsViewMode === 'function' && typeof crossroads3DMode !== 'undefined' && !crossroads3DMode) {
      window.setCrossroadsViewMode(true);
    }

    if (activeCamMode === modeName && modeName !== 'overview') {
      activeCamMode = 'overview';
      activeTargetVehicle = null;
      focusCamera(CAM_MODES.overview.pos, CAM_MODES.overview.look, 1.6);
      updateLegendHUD('overview');
      return;
    }

    const targetMode = CAM_MODES[modeName] ? modeName : 'overview';
    activeCamMode = targetMode;

    if (targetMode !== 'overview') {
      activeTargetVehicle = acquireTargetVehicle(targetMode);
    } else {
      activeTargetVehicle = null;
    }

    focusCamera(CAM_MODES[targetMode].pos, CAM_MODES[targetMode].look, 1.6);
    updateLegendHUD(targetMode);
  };

  window.crossroadsResetCamera = function() {
    scrollProgressCameraActive = false;
    window.crossroadsFocusMode('overview');
  };

  let scrollProgressCameraActive = false;
  window.crossroadsSetScrollProgress = function(progress) {
    if (!camera) return;
    scrollProgressCameraActive = true;
    const p = Math.max(0, Math.min(1, progress));

    let fromPos, toPos, fromLook, toLook, stageP;

    if (p < 0.2) {
      stageP = p / 0.2;
      fromPos = { x: 120, y: 140, z: 230 };
      toPos   = { x: 90,  y: 130, z: 190 };
      fromLook = { x: 0, y: 12, z: 15 };
      toLook   = { x: -10, y: 10, z: 5 };
    } else if (p < 0.4) {
      stageP = (p - 0.2) / 0.2;
      fromPos = { x: 90,  y: 130, z: 190 };
      toPos   = { x: -180, y: 135, z: 170 };
      fromLook = { x: -10, y: 10, z: 5 };
      toLook   = { x: -70, y: 10, z: 45 };
    } else if (p < 0.6) {
      stageP = (p - 0.4) / 0.2;
      fromPos = { x: -180, y: 135, z: 170 };
      toPos   = { x: 270, y: 210, z: 150 };
      fromLook = { x: -70, y: 10, z: 45 };
      toLook   = { x: 45, y: 16, z: -15 };
    } else if (p < 0.8) {
      stageP = (p - 0.6) / 0.2;
      fromPos = { x: 270, y: 210, z: 150 };
      toPos   = { x: 90, y: 280, z: -110 };
      fromLook = { x: 45, y: 16, z: -15 };
      toLook   = { x: 0, y: 92, z: -165 };
    } else {
      stageP = (p - 0.8) / 0.2;
      fromPos = { x: 90, y: 280, z: -110 };
      toPos   = { x: CAM_DEFAULT_POS.x, y: CAM_DEFAULT_POS.y, z: CAM_DEFAULT_POS.z };
      fromLook = { x: 0, y: 92, z: -165 };
      toLook   = { x: CAM_DEFAULT_LOOK.x, y: CAM_DEFAULT_LOOK.y, z: CAM_DEFAULT_LOOK.z };
    }

    const curCamX = fromPos.x + (toPos.x - fromPos.x) * stageP;
    const curCamY = fromPos.y + (toPos.y - fromPos.y) * stageP;
    const curCamZ = fromPos.z + (toPos.z - fromPos.z) * stageP;

    const curLookX = fromLook.x + (toLook.x - fromLook.x) * stageP;
    const curLookY = fromLook.y + (toLook.y - fromLook.y) * stageP;
    const curLookZ = fromLook.z + (toLook.z - fromLook.z) * stageP;

    const isMobile = (typeof window !== 'undefined' && window.innerWidth < 768);
    const aspect = (typeof window !== 'undefined' && window.innerHeight > 0) ? (window.innerWidth / window.innerHeight) : 1;
    const aspectCorrection = isMobile ? (1 / Math.min(aspect, 0.85)) : 1;

    camera.position.set(curCamX * aspectCorrection, curCamY * aspectCorrection, curCamZ * aspectCorrection);
    camera.lookAt(curLookX, curLookY, curLookZ);
  };

  function updateCameraFraming(aspect) {
    if (!camera) return;
    const isMobile = (typeof window !== 'undefined' && window.innerWidth < 768);
    const baseFov = isMobile ? 60 : 38;

    if (isMobile || aspect < 1.15) {
      const portraitCompensation = 1 / Math.min(aspect, 0.85);
      camera.fov = baseFov;

      const lookY = 25;
      const lookZ = -35;
      camBaseLook.x = 0;
      camBaseLook.y = lookY;
      camBaseLook.z = lookZ;

      camBasePos.x = CAM_DEFAULT_POS.x * portraitCompensation;
      camBasePos.y = CAM_DEFAULT_POS.y * portraitCompensation;
      camBasePos.z = CAM_DEFAULT_POS.z * portraitCompensation;

      if (activeCamMode === 'overview' && !scrollProgressCameraActive) {
        camera.position.set(camBasePos.x, camBasePos.y, camBasePos.z);
        camera.lookAt(camBaseLook.x, camBaseLook.y, camBaseLook.z);
      }
    } else {
      camera.fov = baseFov;
      if (activeCamMode === 'overview' && !scrollProgressCameraActive) {
        camBasePos.x = CAM_DEFAULT_POS.x;
        camBasePos.y = CAM_DEFAULT_POS.y;
        camBasePos.z = CAM_DEFAULT_POS.z;
        camBaseLook.x = CAM_DEFAULT_LOOK.x;
        camBaseLook.y = CAM_DEFAULT_LOOK.y;
        camBaseLook.z = CAM_DEFAULT_LOOK.z;
        camera.position.set(camBasePos.x, camBasePos.y, camBasePos.z);
        camera.lookAt(camBaseLook.x, camBaseLook.y, camBaseLook.z);
      }
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

  // Dusk Sky & Vice City Neon Palette Assets
  let duskSkyTexture = null;
  let isRenderLoopPaused = false;
  let carArchetypeCounter = 0;
  const socialPedestrians = [];

  function createDuskSkyGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    // Synthwave / Vice City dusk gradient: #1e0f2e blending into #592148 at horizon
    grad.addColorStop(0.0, '#1e0f2e');  // Zenith deep twilight indigo/purple
    grad.addColorStop(0.38, '#2d123d');
    grad.addColorStop(0.70, '#592148'); // Rich radiant magenta/rose dusk
    grad.addColorStop(0.88, '#70224d');
    grad.addColorStop(1.0, '#592148');  // Warm horizon dusk glow
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // 10-Spoke Metallic Alloy Rim Canvas Texture (128x128)
  let cachedRimTexture = null;
  function getMultiSpokeRimTexture() {
    if (cachedRimTexture) return cachedRimTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const cx = 64, cy = 64;

    // Dark gunmetal base disc
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();

    // Chrome outer lip
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 57, 0, Math.PI * 2);
    ctx.stroke();

    // 10 Radial Metallic Spokes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI * 2) / 10;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * 53, cy + Math.sin(angle) * 53);
      ctx.stroke();
    }

    // Chrome center hub
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    cachedRimTexture = new THREE.CanvasTexture(canvas);
    return cachedRimTexture;
  }

  // Zero-Lag Radial Ground Glow Texture (128x128) for soft additive ground light pools
  let cachedRadialGlowTexture = null;
  function getRadialGlowTexture() {
    if (cachedRadialGlowTexture) return cachedRadialGlowTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(0.70, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    cachedRadialGlowTexture = new THREE.CanvasTexture(canvas);
    return cachedRadialGlowTexture;
  }

  function getHeading(dir) {
    if (dir === 'EB') return 0;           // Facing +X (East)
    if (dir === 'WB') return Math.PI;      // Facing -X (West)
    if (dir === 'SB') return -Math.PI / 2; // Facing +Z (South)
    if (dir === 'NB') return Math.PI / 2;  // Facing -Z (North)
    return 0;
  }

  // ---------------------------------------------------------------------------
  // 1. Aerodynamic Extruded Sports & Street Car Factory — ZERO BoxGeometry
  // 4 Specific Archetypes: Lime-Green i8, Silver DeLorean, White Hypercar, Night Muscle
  // ---------------------------------------------------------------------------
  function createAerodynamicCar(archetypeIdx) {
    const typeIdx = (archetypeIdx !== undefined ? archetypeIdx : (carArchetypeCounter++)) % 4;
    const group = new THREE.Group();
    group.userData.wheels = [];

    // Smooth aerodynamic 2D side profile extruded along Z (Facing canonical +X)
    const shape = new THREE.Shape();
    // Front splitter & nose
    shape.moveTo(2.1, 0.18);
    shape.lineTo(2.0, 0.52);
    // Sloped aerodynamic hood
    shape.quadraticCurveTo(1.1, 0.68, 0.7, 0.72);
    // Raked windshield
    shape.lineTo(0.1, 1.18);
    // Swept curved aerodynamic roofline
    shape.quadraticCurveTo(-0.6, 1.22, -1.1, 1.12);
    // Fastback rear glass
    shape.lineTo(-1.95, 0.78);
    // Integrated decklid spoiler
    shape.lineTo(-2.1, 0.85);
    // Rear diffuser
    shape.lineTo(-2.1, 0.22);
    // Recessed rear wheel arch
    shape.bezierCurveTo(-1.7, 0.55, -0.9, 0.55, -0.85, 0.18);
    shape.lineTo(0.85, 0.18);
    // Recessed front wheel arch
    shape.bezierCurveTo(0.9, 0.55, 1.7, 0.55, 1.75, 0.18);
    shape.lineTo(2.1, 0.18);

    const extrudeSettings = {
      depth: 1.55,
      bevelEnabled: true,
      bevelThickness: 0.14,
      bevelSize: 0.12,
      bevelSegments: 4,
      curveSegments: 16
    };
    const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bodyGeo.translate(0, 0, -1.55 / 2);

    let bodyColorHex = 0x84cc16;
    let roughness = 0.25;
    let metalness = 0.65;
    let headlightColor = 0xffffff;

    if (typeIdx === 0) {
      // 1. Lime-Green Neon i8 Coupe: Toxic lime-green (#84cc16), black hood scoop, #facc15 daytime LED strips
      bodyColorHex = 0x84cc16;
      roughness = 0.25;
      metalness = 0.65;
      headlightColor = 0xfacc15;
    } else if (typeIdx === 1) {
      // 2. Silver Retro DeLorean Wedge Coupe: Brushed stainless silver (#cbd5e1), sharp wedge cabin, quad headlights
      bodyColorHex = 0xcbd5e1;
      roughness = 0.35;
      metalness = 0.80;
      headlightColor = 0xe0f2fe;
    } else if (typeIdx === 2) {
      // 3. White & Carbon Hypercar: High-gloss pearl white (#f8fafc), carbon splitter, #60a5fa ice-blue LED headlights
      bodyColorHex = 0xf8fafc;
      roughness = 0.15;
      metalness = 0.20;
      headlightColor = 0x60a5fa;
    } else {
      // 4. Night Muscle Sedan: Deep midnight black/navy (#0f172a), 4 ice-blue circular xenon headlights (#38bdf8), 3 red blower lights
      bodyColorHex = 0x0f172a;
      roughness = 0.30;
      metalness = 0.70;
      headlightColor = 0x38bdf8;
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColorHex,
      roughness: roughness,
      metalness: metalness
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(bodyMesh);

    // Dark Smoked Glass Windshield & Cabin Canopy (Extruded Contour)
    const glassShape = new THREE.Shape();
    glassShape.moveTo(0.12, 1.15);
    glassShape.quadraticCurveTo(-0.55, 1.18, -1.05, 1.09);
    glassShape.lineTo(-1.85, 0.78);
    glassShape.lineTo(-1.3, 0.75);
    glassShape.quadraticCurveTo(0.2, 0.72, 0.65, 0.72);
    glassShape.closePath();
    const glassGeo = new THREE.ExtrudeGeometry(glassShape, {
      depth: 1.48,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 2
    });
    glassGeo.translate(0, 0, -1.48 / 2);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    group.add(glassMesh);

    // Archetype-Specific Custom Features
    if (typeIdx === 0) {
      // 1. Lime-Green i8: Matte black carbon hood scoop & glowing #facc15 LED daytime running light strips
      const scoopGeo = new THREE.BoxGeometry(0.45, 0.12, 0.55);
      const scoopMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
      const scoop = new THREE.Mesh(scoopGeo, scoopMat);
      scoop.position.set(1.1, 0.75, 0);
      group.add(scoop);

      [-0.52, 0.52].forEach(hz => {
        const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.38), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        ledStrip.position.set(2.05, 0.45, hz);
        group.add(ledStrip);
      });
    } else if (typeIdx === 1) {
      // 2. Silver DeLorean: Rear window louvers & quad square vintage headlights
      [-1.3, -1.5, -1.7].forEach(lx => {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 1.15), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        louver.position.set(lx, 0.95 - (lx + 1.3) * 0.15, 0);
        group.add(louver);
      });
      [-0.56, -0.38, 0.38, 0.56].forEach(hz => {
        const qHl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
        qHl.position.set(2.06, 0.45, hz);
        group.add(qHl);
      });
    } else if (typeIdx === 2) {
      // 3. White & Carbon Hypercar: Carbon splitter & ice-blue LED headlights
      const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 1.62), new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2 }));
      splitter.position.set(2.12, 0.20, 0);
      group.add(splitter);

      [-0.48, 0.48].forEach(hz => {
        const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
        hl.rotation.x = Math.PI / 2;
        hl.position.set(2.08, 0.45, hz);
        group.add(hl);
      });
    } else {
      // 4. Night Muscle: 4 ice-blue xenon headlights & dual hood scoop with 3 glowing red blower lights (#ef4444)
      [-0.56, -0.40, 0.40, 0.56].forEach(hz => {
        const xHl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        xHl.rotation.x = Math.PI / 2;
        xHl.position.set(2.08, 0.44, hz);
        group.add(xHl);
      });
      const blowerScoop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.20, 0.65), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 }));
      blowerScoop.position.set(1.0, 0.80, 0);
      group.add(blowerScoop);
      [-0.15, 0, 0.15].forEach(bz => {
        const blowerLight = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        blowerLight.rotation.x = Math.PI / 2;
        blowerLight.position.set(1.28, 0.81, bz);
        group.add(blowerLight);
      });
    }

    // Rear Ruby-Red LED Taillight Bar
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const tlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.25), tlMat);
    tlMesh.position.set(-2.08, 0.72, 0);
    group.add(tlMesh);

    // 4 Wheels: 10-Spoke Metallic Alloy Rims via Canvas Texture
    const rimTex = getMultiSpokeRimTexture();
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const rimFaceMat = new THREE.MeshBasicMaterial({ map: rimTex });
    const wheelMats = [tireMat, rimFaceMat, rimFaceMat];
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.20, 16);

    [-0.82, 0.82].forEach(wz => {
      [-1.3, 1.3].forEach(wx => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMats);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.32, wz);
        group.add(wheel);
        group.userData.wheels.push(wheel);
      });
    });

    // Zero-Lag Additive Headlight Ground Light Pool (Flat transparent plane at y = 0.02)
    const headGlowMat = new THREE.MeshBasicMaterial({
      map: getRadialGlowTexture(),
      color: headlightColor,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const headGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), headGlowMat);
    headGlow.rotation.x = -Math.PI / 2;
    headGlow.position.set(3.2, 0.02, 0);
    group.add(headGlow);

    // Coordinate scale matching crossroads traffic grid (Length ~42, Width ~17, Height ~12.5)
    group.scale.set(10, 10, 10);
    return group;
  }
  window.createAerodynamicCar = createAerodynamicCar;
  window.createCurvedSportsCar = createAerodynamicCar;

  // ---------------------------------------------------------------------------
  // 2. Articulated Multi-Part Procedural Humans — ZERO Box Cylinders, ZERO GLTF
  // Lifelike stride kinetics using articulated limbs (userData: leftLeg, rightLeg, leftArm, rightArm)
  // ---------------------------------------------------------------------------
  function createArticulatedHuman(p, isSocial) {
    const group = new THREE.Group();
    const id = (p && p.id !== undefined) ? p.id : Math.floor(Math.random() * 1000);
    const styleIdx = Math.abs(Math.floor(id * 13)) % 4;

    const skinPalette = [0xc58f68, 0xb47b56, 0xd4a373, 0x99613d];
    const skinHex = skinPalette[Math.abs(Math.floor(id * 7)) % skinPalette.length];
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.7 });

    // 4 Modern Streetwear Outfits
    let topColor = 0xeab308;    // 0: Yellow cricket jersey
    let bottomColor = 0x1d4ed8; // Blue denim
    let hairColor = 0x1e293b;

    if (styleIdx === 1) {
      topColor = 0xf43f5e;      // 1: Coral street hoodie
      bottomColor = 0x18181b;   // Black cargo
      hairColor = 0x1c1917;
    } else if (styleIdx === 2) {
      topColor = 0xf8fafc;      // 2: White open shirt over graphic teal tee
      bottomColor = 0x78716c;   // Khaki cargo
      hairColor = 0x292524;
    } else if (styleIdx === 3) {
      topColor = 0x2563eb;      // 3: Denim jacket / vest
      bottomColor = 0x334155;   // Slate pants
      hairColor = 0x0f172a;
    }

    const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.6 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: bottomColor, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }); // White sneakers
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });

    // 1. Hips / Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.1), bottomMat);
    pelvis.position.y = 5.2;
    group.add(pelvis);

    // 2. Sculpted Torso / Chest
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.6, 1.3), topMat);
    torso.position.y = 7.0;
    group.add(torso);

    // 3. Two Articulated 2-Segment Legs terminating in White Sneakers
    function createLeg(xOffset) {
      const legPivot = new THREE.Group();
      legPivot.position.set(xOffset, 4.8, 0);

      // Thigh
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.2, 0.80), bottomMat);
      thigh.position.y = -1.1;
      legPivot.add(thigh);

      // Calf / Shin
      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.66, 2.2, 0.74), bottomMat);
      calf.position.y = -3.2;
      legPivot.add(calf);

      // White Streetwear Sneaker
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.65, 1.35), shoeMat);
      shoe.position.set(0, -4.5, 0.22);
      legPivot.add(shoe);

      return legPivot;
    }

    const leftLeg = createLeg(-0.52);
    const rightLeg = createLeg(0.52);
    group.add(leftLeg);
    group.add(rightLeg);

    // 4. Two Articulated Swinging Arms
    function createArm(xOffset) {
      const armPivot = new THREE.Group();
      armPivot.position.set(xOffset, 8.1, 0);

      // Upper arm sleeve
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.6, 0.60), topMat);
      upper.position.y = -0.8;
      armPivot.add(upper);

      // Forearm
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.50, 1.5, 0.52), skinMat);
      forearm.position.y = -2.3;
      armPivot.add(forearm);

      // Hand
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.55, 0.44), skinMat);
      hand.position.y = -3.2;
      armPivot.add(hand);

      return armPivot;
    }

    const leftArm = createArm(-1.42);
    const rightArm = createArm(1.42);
    group.add(leftArm);
    group.add(rightArm);

    // 5. Head & Distinct Hair Style
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 0.6, 8), skinMat);
    neck.position.y = 8.6;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.3, 1.25), skinMat);
    head.position.y = 9.5;
    group.add(head);

    // Distinct hairstyles: 0=Baseball cap, 1=Afro curls, 2=Short fade, 3=Long dark hair
    if (styleIdx === 0) {
      const capDome = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.55, 1.35), hairMat);
      capDome.position.y = 10.2;
      group.add(capDome);
      const capBrim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.75), hairMat);
      capBrim.position.set(0, 10.0, 0.85);
      group.add(capBrim);
    } else if (styleIdx === 1) {
      const afro = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.5), hairMat);
      afro.position.y = 10.3;
      group.add(afro);
    } else if (styleIdx === 2) {
      const fade = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.5, 1.35), hairMat);
      fade.position.y = 10.25;
      group.add(fade);
    } else {
      const longHair = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.4), hairMat);
      longHair.position.set(0, 9.8, -0.15);
      group.add(longHair);
    }

    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;

    if (isSocial) {
      leftLeg.rotation.x = (Math.random() - 0.5) * 0.2;
      rightLeg.rotation.x = -leftLeg.rotation.x;
      leftArm.rotation.z = 0.08 + Math.random() * 0.12;
      rightArm.rotation.z = -0.08 - Math.random() * 0.12;
    }

    scene.add(group);
    return group;
  }
  window.createArticulatedHuman = createArticulatedHuman;

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
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base wall facade color
    ctx.fillStyle = wallColor || '#0d9488';
    ctx.fillRect(0, 0, 512, 512);

    const floorH = 512 / Math.max(1, floors);
    const colW = 512 / Math.max(1, cols);

    for (let f = 0; f < floors; f++) {
      // Art Deco horizontal floor separator groove
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, f * floorH + floorH - 6, 512, 6);

      for (let c = 0; c < cols; c++) {
        const x = c * colW + colW * 0.15;
        const y = f * floorH + floorH * 0.16;
        const w = colW * 0.70;
        const h = floorH * 0.64;

        // Recessed outer casement frame
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(x - 4, y - 4, w + 8, h + 8);

        // Pseudorandom illumination: 75% lit, 25% dark
        const hash = Math.sin((f + 1) * 37.1 + (c + 1) * 19.3);
        const isLit = (hash - Math.floor(hash)) > 0.25;

        if (isLit) {
          // Warm interior amber/yellow & peach glow
          const winGrad = ctx.createLinearGradient(x, y, x, y + h);
          winGrad.addColorStop(0.0, '#fef08a'); // Warm yellow
          winGrad.addColorStop(0.55, '#fed7aa'); // Soft peach
          winGrad.addColorStop(1.0, '#f59e0b'); // Amber
          ctx.fillStyle = winGrad;
          ctx.fillRect(x, y, w, h);

          // Casement Window Mullions (Multi-pane window bars)
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.lineWidth = 3;
          // Vertical mullion bar
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w / 2, y + h);
          ctx.stroke();
          // Horizontal mullion bar
          ctx.beginPath();
          ctx.moveTo(x, y + h * 0.45);
          ctx.lineTo(x + w, y + h * 0.45);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(x, y, w, h);

          // Multi-pane mullions on dark glass
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w / 2, y + h);
          ctx.moveTo(x, y + h * 0.45);
          ctx.lineTo(x + w, y + h * 0.45);
          ctx.stroke();

          // Subtle sky reflection
          ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
          ctx.beginPath();
          ctx.moveTo(x, y + h);
          ctx.lineTo(x + w * 0.5, y);
          ctx.lineTo(x + w * 0.8, y);
          ctx.lineTo(x + w * 0.3, y + h);
          ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  // Procedural 2048x2048 Matte Slate Asphalt Road Network Texture (Zero z-fighting, Zero light bleed, 1 draw call)
  function createRoadCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Base Slate-Charcoal Asphalt Surface
    ctx.fillStyle = '#1e242b';
    ctx.fillRect(0, 0, 2048, 2048);

    // Subtle Asphalt Grain Noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.022)';
    for (let i = 0; i < 16000; i++) {
      const rx = (Math.random() * 2048) | 0;
      const ry = (Math.random() * 2048) | 0;
      ctx.fillRect(rx, ry, 1, 1);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    for (let i = 0; i < 20000; i++) {
      const rx = (Math.random() * 2048) | 0;
      const ry = (Math.random() * 2048) | 0;
      ctx.fillRect(rx, ry, 2, 2);
    }

    const cx = 1024, cy = 1024;
    const scale = 1.28; // 2048 / 1600

    const toPx = (wx) => cx + wx * scale;
    const toPy = (wz) => cy + wz * scale;

    // 2. Darker Tire-Wear Paths in Lane Centers
    ctx.fillStyle = 'rgba(15, 20, 28, 0.45)';
    [18, 48, -15, -52].forEach(wz => {
      const py = toPy(wz);
      ctx.fillRect(0, py - 12, toPx(-140), 24);
      ctx.fillRect(toPx(140), py - 12, 2048 - toPx(140), 24);
    });
    [-20, -58, 18, 56].forEach(wx => {
      const px = toPx(wx);
      ctx.fillRect(px - 12, 0, 24, toPy(-115));
      ctx.fillRect(px - 12, toPy(115), 24, 2048 - toPy(115));
    });

    // 3. Double Yellow Center Lines (Non-glowing #f59e0b)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;

    // East-West double center line
    [-2.5, 2.5].forEach(offset => {
      const py = toPy(offset);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(toPx(-140), py);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toPx(140), py);
      ctx.lineTo(2048, py);
      ctx.stroke();
    });

    // North-South double center line
    [-2.5, 2.5].forEach(offset => {
      const px = toPx(offset);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, toPy(-115));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px, toPy(115));
      ctx.lineTo(px, 2048);
      ctx.stroke();
    });

    // 4. White Dashed Outer Lane Divider Markings
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([20, 18]);

    [38, -38].forEach(wz => {
      const py = toPy(wz);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(toPx(-140), py);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toPx(140), py);
      ctx.lineTo(2048, py);
      ctx.stroke();
    });

    [45, -45].forEach(wx => {
      const px = toPx(wx);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, toPy(-115));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px, toPy(115));
      ctx.lineTo(px, 2048);
      ctx.stroke();
    });

    ctx.setLineDash([]); // Reset dash

    // 5. Solid White Stop Bars
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(toPx(-135) - 3, toPy(0), 6, (78 * scale));
    ctx.fillRect(toPx(135) - 3, toPy(-78), 6, (78 * scale));
    ctx.fillRect(toPx(-78), toPy(-105) - 3, (78 * scale), 6);
    ctx.fillRect(toPx(0), toPy(105) - 3, (78 * scale), 6);

    // 6. 12 Clean Zebra Crosswalk Stripes on All 4 Approaches
    const drawZebra = (isVertical, cxWorld, czWorld, lengthWorld, widthWorld) => {
      const stripes = 12;
      const stripeThickness = (lengthWorld / stripes) * 0.58 * scale;
      const stripeLen = widthWorld * scale;
      for (let i = 0; i < stripes; i++) {
        if (isVertical) {
          const wz = (czWorld - lengthWorld / 2 + (i + 0.5) * (lengthWorld / stripes));
          const px = toPx(cxWorld) - stripeLen / 2;
          const py = toPy(wz) - stripeThickness / 2;
          ctx.fillRect(px, py, stripeLen, stripeThickness);
        } else {
          const wx = (cxWorld - lengthWorld / 2 + (i + 0.5) * (lengthWorld / stripes));
          const px = toPx(wx) - stripeThickness / 2;
          const py = toPy(czWorld) - stripeLen / 2;
          ctx.fillRect(px, py, stripeThickness, stripeLen);
        }
      }
    };

    drawZebra(true, -120, 0, 160, 22);
    drawZebra(true, 120, 0, 160, 22);
    drawZebra(false, 0, -92, 220, 22);
    drawZebra(false, 0, 92, 220, 22);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  // Sidewalk Corners with Curbs
  function addSidewalkCorner(w, d, x, z) {
    if (!sidewalkMat) sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.05 });
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

  // Multi-Layered Organic Dhaka Trees (Textured trunk + 4–5 overlapping foliage clusters in rich natural greens)
  let organicTreeMats = null;
  function addTree(x, z) {
    if (!treeTrunkGeo) treeTrunkGeo = new THREE.CylinderGeometry(1.2, 1.8, 10, 8);
    if (!treeTrunkMat) treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.95 });
    if (!organicTreeMats) {
      organicTreeMats = [
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.80 }),
        new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.90 }),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.80 })
      ];
    }

    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 2, z);

    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    trunk.position.y = 5;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const clusters = [
      { x: 0, y: 13, z: 0, r: 6.8, m: 0 },
      { x: -3.2, y: 11.5, z: 2.5, r: 5.2, m: 1 },
      { x: 3.0, y: 11.8, z: -2.0, r: 5.0, m: 2 },
      { x: -2.2, y: 12.2, z: -2.8, r: 4.8, m: 3 },
      { x: 2.5, y: 13.5, z: 2.2, r: 4.6, m: 1 }
    ];

    clusters.forEach(c => {
      const geo = new THREE.SphereGeometry(c.r, 8, 8);
      const mat = organicTreeMats[c.m % organicTreeMats.length];
      const cluster = new THREE.Mesh(geo, mat);
      cluster.position.set(c.x, c.y, c.z);
      cluster.castShadow = true;
      treeGroup.add(cluster);
    });

    freezeStatic(treeGroup);
    scene.add(treeGroup);
  }

  // 3D Building Builder — GTA Vice City Definitive Edition Art-Deco & Modern Multi-Tier Architecture
  function create3DBuilding(config) {
    const {
      x, z, width, depth, height,
      wallColor, sideColor, roofColor,
      floors, cols, winColor,
      signboard, waterTank, antenna
    } = config;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const numFloors = floors || 4;
    const floorHeight = height / numFloors;

    // Vice City Pastel & Vibrant Palette
    const vcColors = ['#a7f3d0', '#0d9488', '#fda4af', '#fef3c7'];
    const chosenWallColor = wallColor || vcColors[Math.abs(Math.floor(x * 0.05 + z * 0.03)) % vcColors.length];
    const chosenSideColor = sideColor || chosenWallColor;
    const chosenWinColor = winColor || '#fde68a';

    // Stepped Multi-Tier Art Deco Architecture:
    // Tier 1: Base / Podium (Ground to 36% height) with ground-floor overhang
    // Tier 2: Mid Tower (36% to 76% height) stepped back slightly with vertical pilasters
    // Tier 3: Setback Upper Crown (76% to 100% height) with decorative Art Deco crown parapet
    const h1 = height * 0.36;
    const h2 = height * 0.40;
    const h3 = height * 0.24;

    const w1 = width;
    const d1 = depth;
    const w2 = Math.max(16, width * 0.88);
    const d2 = Math.max(16, depth * 0.88);
    const w3 = Math.max(12, width * 0.74);
    const d3 = Math.max(12, depth * 0.74);

    const frontTex1 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.36)), cols || 4, chosenWinColor, chosenWallColor);
    const frontTex2 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.40)), Math.max(2, (cols || 4) - 1), chosenWinColor, chosenWallColor);
    const frontTex3 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.24)), Math.max(2, (cols || 4) - 2), chosenWinColor, chosenWallColor);

    const sideTex1 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.36)), Math.max(2, Math.floor((cols || 4) * 0.6)), chosenWinColor, chosenSideColor);
    const sideTex2 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.40)), Math.max(2, Math.floor((cols || 4) * 0.5)), chosenWinColor, chosenSideColor);
    const sideTex3 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.24)), Math.max(2, Math.floor((cols || 4) * 0.4)), chosenWinColor, chosenSideColor);

    function createTierMaterials(frontT, sideT) {
      const frontM = new THREE.MeshStandardMaterial({
        map: frontT,
        roughness: 0.35,
        metalness: 0.25,
        emissive: new THREE.Color(0xfbbf24),
        emissiveMap: frontT,
        emissiveIntensity: 0.65
      });
      const sideM = new THREE.MeshStandardMaterial({
        map: sideT,
        roughness: 0.45,
        metalness: 0.20,
        emissive: new THREE.Color(0xfbbf24),
        emissiveMap: sideT,
        emissiveIntensity: 0.45
      });
      const roofM = new THREE.MeshStandardMaterial({ color: roofColor || 0x0f172a, roughness: 0.75, metalness: 0.2 });
      const botM = new THREE.MeshBasicMaterial({ color: 0x000000 });
      return [sideM, sideM, roofM, botM, frontM, sideM];
    }

    // Tier 1: Base Podium
    const tier1Mesh = new THREE.Mesh(new THREE.BoxGeometry(w1, h1, d1), createTierMaterials(frontTex1, sideTex1));
    tier1Mesh.position.y = h1 / 2;
    tier1Mesh.castShadow = true;
    tier1Mesh.receiveShadow = true;
    tier1Mesh.customDepthMaterial = getSharedBuildingDepthMat();
    group.add(tier1Mesh);

    // Ground Floor Overhang Canopy with architectural depth
    const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(w1 + 3.5, 1.6, d1 + 3.5), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }));
    canopyMesh.position.y = h1;
    canopyMesh.castShadow = true;
    group.add(canopyMesh);

    // Tier 2: Stepped Mid Tower
    const tier2Mesh = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), createTierMaterials(frontTex2, sideTex2));
    tier2Mesh.position.y = h1 + h2 / 2;
    tier2Mesh.castShadow = true;
    tier2Mesh.receiveShadow = true;
    tier2Mesh.customDepthMaterial = getSharedBuildingDepthMat();
    group.add(tier2Mesh);

    // Tier 2 Setback Cornice Slab
    const cornice2 = new THREE.Mesh(new THREE.BoxGeometry(w2 + 2.5, 1.4, d2 + 2.5), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
    cornice2.position.y = h1 + h2;
    group.add(cornice2);

    // Tier 3: Setback Upper Crown
    const tier3Mesh = new THREE.Mesh(new THREE.BoxGeometry(w3, h3, d3), createTierMaterials(frontTex3, sideTex3));
    tier3Mesh.position.y = h1 + h2 + h3 / 2;
    tier3Mesh.castShadow = true;
    tier3Mesh.receiveShadow = true;
    tier3Mesh.customDepthMaterial = getSharedBuildingDepthMat();
    group.add(tier3Mesh);

    // Decorative Art Deco Stepped Spire / Crown Top
    const crownGeo = new THREE.BoxGeometry(w3 * 0.65, 4.2, d3 * 0.65);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = height + 2.1;
    group.add(crown);

    // Neon Tube Building Trim & Vertical Pilasters (Vice City Definitive Edition)
    // Bright emissive neon tubes: Hot Pink (#ff007f), Electric Cyan (#00f5d4), Neon Lime (#39ff14), Warm Gold (#facc15)
    const neonPalette = [0xff007f, 0x00f5d4, 0x39ff14, 0xfacc15];
    const neonHex = neonPalette[Math.abs(Math.floor((x * 11 + z * 17) / 100)) % neonPalette.length];
    const neonMat = new THREE.MeshBasicMaterial({ color: neonHex });

    // 1. Ground Overhang Neon Tube Trim
    const neonStrip1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, w1 + 3.2, 8), neonMat);
    neonStrip1.rotation.z = Math.PI / 2;
    neonStrip1.position.set(0, h1 + 0.8, (d1 + 3.5) / 2);
    group.add(neonStrip1);

    // 2. Mid-Tier Roofline Neon Tube
    const neonStrip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, w2 + 2.2, 8), neonMat);
    neonStrip2.rotation.z = Math.PI / 2;
    neonStrip2.position.set(0, h1 + h2 + 0.7, (d2 + 2.5) / 2);
    group.add(neonStrip2);

    // 3. Crown Roofline Neon Tube
    const neonStrip3 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, w3 + 1.4, 8), neonMat);
    neonStrip3.rotation.z = Math.PI / 2;
    neonStrip3.position.set(0, height + 0.5, (d3 + 1.8) / 2);
    group.add(neonStrip3);

    // 4. Vertical Art Deco Pilasters (corner neon tubes)
    [-w2 / 2 + 0.5, w2 / 2 - 0.5].forEach(px => {
      const pilasterNeon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, h2, 8), neonMat);
      pilasterNeon.position.set(px, h1 + h2 / 2, d2 / 2 + 0.3);
      group.add(pilasterNeon);
    });

    // 5. Zero-Lag Additive Sidewalk Ground Light Pool (No PointLight)
    const glowPlaneGeo = new THREE.PlaneGeometry(w1 * 1.3, d1 * 1.1);
    const glowMat = new THREE.MeshBasicMaterial({
      map: getRadialGlowTexture(),
      color: neonHex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowPlane = new THREE.Mesh(glowPlaneGeo, glowMat);
    glowPlane.rotation.x = -Math.PI / 2;
    glowPlane.position.set(0, 0.02, (d1 / 2) + 8);
    group.add(glowPlane);

    // 3D AC outdoor condenser units on exterior walls
    const acGeo = new THREE.BoxGeometry(3.6, 2.4, 2.0);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    for (let f = 1; f < Math.min(numFloors, 4); f++) {
      const ac = new THREE.Mesh(acGeo, acMat);
      const sideX = (f % 2 === 0) ? (w1 / 2 - 6) : (-w1 / 2 + 6);
      ac.position.set(sideX, f * (h1 / 2) + 2.0, d1 / 2 + 1.0);
      group.add(ac);
    }

    // Rooftop Water Tank
    if (waterTank) {
      const tankGeo = new THREE.CylinderGeometry(7, 7, 12, 16);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4 });
      const tank = new THREE.Mesh(tankGeo, tankMat);
      tank.position.set(-w3 * 0.25, height + 9, -d3 * 0.15);
      group.add(tank);

      const legGeo = new THREE.CylinderGeometry(0.7, 0.7, 5, 6);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      [-3.5, 3.5].forEach(lx => {
        [-3.5, 3.5].forEach(lz => {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(-w3 * 0.25 + lx, height + 2.5, -d3 * 0.15 + lz);
          group.add(leg);
        });
      });
    }

    // Rooftop Radio/Cell Antenna with Flashing Obstacle Beacon
    if (antenna) {
      const antGeo = new THREE.CylinderGeometry(0.5, 1.0, 26, 8);
      const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(w3 * 0.25, height + 13, -d3 * 0.15);
      group.add(ant);

      const beaconGeo = new THREE.SphereGeometry(1.6, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(w3 * 0.25, height + 26, -d3 * 0.15);
      group.add(beacon);
    }

    // Authentic Signboard and Awning
    if (signboard) {
      const sTex = createSignboardTexture(signboard.text, signboard.sub, signboard.bg, signboard.textCol, signboard.subCol, signboard.border, signboard.tw, signboard.th);
      const sGeo = new THREE.BoxGeometry(signboard.w || (w1 * 0.75), signboard.h || 16, 2.5);
      const sMat = new THREE.MeshBasicMaterial({ map: sTex });
      const signMesh = new THREE.Mesh(sGeo, sMat);
      signMesh.position.set(signboard.ox || 0, signboard.y || 15, (d1 / 2) + 2.0);
      group.add(signMesh);

      if (signboard.awnCol) {
        const awnGeo = new THREE.BoxGeometry((signboard.w || (w1 * 0.75)) + 3, 2.8, 8);
        const awnMat = new THREE.MeshStandardMaterial({ color: signboard.awnCol, roughness: 0.5 });
        const awn = new THREE.Mesh(awnGeo, awnMat);
        awn.position.set(signboard.ox || 0, (signboard.y || 15) + (signboard.h || 16) / 2 + 1.4, (d1 / 2) + 4.5);
        awn.rotation.x = 0.25;
        group.add(awn);
      }
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

  // ---------------------------------------------------------------------------
  // 10-Spoke Metallic Alloy Wheel Builder (Zero BoxGeometry)
  // ---------------------------------------------------------------------------
  function create10SpokeAlloyWheel(radius, width, rimColorHex, darkCenter) {
    const wheelGroup = new THREE.Group();

    // 1. Rubber Tire (Cylinder oriented to roll around Z)
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    const tireMat = sharedWheelMat || new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    wheelGroup.add(tire);

    // 2. Metallic Outer Rim Lip
    const rimGeo = new THREE.CylinderGeometry(radius * 0.74, radius * 0.72, width + 0.03, 20);
    const rimMat = new THREE.MeshStandardMaterial({
      color: rimColorHex || 0xd1d5db,
      metalness: 0.85,
      roughness: 0.25
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    // 3. Central Hub & Lug Circle
    const hubGeo = new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, width + 0.06, 12);
    const hubMat = new THREE.MeshStandardMaterial({
      color: darkCenter ? 0x18181b : (rimColorHex || 0xd1d5db),
      metalness: 0.90,
      roughness: 0.20
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    // 4. 10 Radial Metallic Alloy Spokes
    const spokeGeo = new THREE.CylinderGeometry(radius * 0.045, radius * 0.04, radius * 0.52, 6);
    for (let s = 0; s < 10; s++) {
      const angle = s * (Math.PI * 2 / 10);
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      const dist = radius * 0.48;
      spoke.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, (width / 2) + 0.015);
      spoke.rotation.z = angle + Math.PI / 2;
      wheelGroup.add(spoke);
    }

    // 5. Internal Brake Rotor Disc
    const rotorGeo = new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width * 0.45, 16);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.3 });
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.rotation.x = Math.PI / 2;
    wheelGroup.add(rotor);

    return wheelGroup;
  }

  // ---------------------------------------------------------------------------
  // Curved Aerodynamic Sports Car Factory — ZERO BoxGeometry
  // 6 Diverse Archetypes (Bugatti, White Racing, Crimson Aero, Lime Neon, Silver Wedge, Night Muscle)
  // ---------------------------------------------------------------------------
  function createCurvedSportsCar(archetypeIdx) {
    return createAerodynamicCar(archetypeIdx);
  }
  window.createCurvedSportsCar = createCurvedSportsCar;

  // 3D Canonical Vehicle Builders (all built facing +X direction)
  function create3DVehicle(type, colorHex) {
    if (type === 'car') {
      const car = createAerodynamicCar();
      scene.add(car);
      return car;
    }
    if (!sharedWheelMat) sharedWheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    if (!sharedRimMat) sharedRimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.35, metalness: 0.75 });
    if (!vehicleHeadlightMat) vehicleHeadlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    if (!vehicleTaillightMat) vehicleTaillightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    if (!vehicleIndicatorMat) vehicleIndicatorMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    if (!vehicleGlassMat) vehicleGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.6 });
    if (!vehicleBumperMat) vehicleBumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    const group = new THREE.Group();
    group.userData.wheels = [];

    function addVehicleWheel(wX, wY, wZ, radius, thickness) {
      const wGeo = getSharedWheelGeo(radius, thickness, 10);
      const rGeo = getSharedWheelGeo(radius * 0.55, thickness + 0.1, 8);
      const wMesh = new THREE.Mesh(wGeo, sharedWheelMat);
      wMesh.rotation.x = Math.PI / 2;
      const rMesh = new THREE.Mesh(rGeo, sharedRimMat);
      rMesh.rotation.x = Math.PI / 2;

      const wSub = new THREE.Group();
      wSub.position.set(wX, wY, wZ);
      wSub.add(wMesh);
      wSub.add(rMesh);
      group.add(wSub);
      group.userData.wheels.push(wSub);
    }

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
      [-1, 1].forEach(wz => {
        [-23, 23].forEach(wx => {
          addVehicleWheel(wx, 4.0, wz * (width / 2), 4.0, 2.2);
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
      // Front Wheel
      addVehicleWheel(9.5, 2.6, 0, 2.6, 1.4);
      // Rear Wheels
      [-1, 1].forEach(wz => {
        addVehicleWheel(-7.5, 2.6, wz * (width / 2), 2.6, 1.4);
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
      addVehicleWheel(10.5, 3.5, 0, 3.5, 0.9);

      // Rear wheels touch ground: radius 4.5, center y = 4.5
      [-1, 1].forEach(wz => {
        addVehicleWheel(-7.5, 4.5, wz * (width / 2 - 0.5), 4.5, 1.1);
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
      [-8.0, 8.0].forEach(px => {
        addVehicleWheel(px, 3.0, 0, 3.0, 1.1);
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
    ambGroup.userData.wheels = [];
    const length = 54;
    const width = 22;
    const height = 22;

    function addAmbWheel(wX, wY, wZ, radius, thickness) {
      const wGeo = getSharedWheelGeo(radius, thickness, 10);
      const rGeo = getSharedWheelGeo(radius * 0.55, thickness + 0.1, 8);
      const wMesh = new THREE.Mesh(wGeo, sharedWheelMat);
      wMesh.rotation.x = Math.PI / 2;
      const rMesh = new THREE.Mesh(rGeo, sharedRimMat);
      rMesh.rotation.x = Math.PI / 2;
      const wSub = new THREE.Group();
      wSub.position.set(wX, wY, wZ);
      wSub.add(wMesh);
      wSub.add(rMesh);
      ambGroup.add(wSub);
      ambGroup.userData.wheels.push(wSub);
    }

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
    [-1, 1].forEach(wz => {
      [-16, 16].forEach(wx => {
        addAmbWheel(wx, 3.5, wz * (width / 2), 3.5, 2.0);
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

  // 3D Human Pedestrian Builder — Articulated Procedural Pedestrians
  function create3DPedestrian(p) {
    return createArticulatedHuman(p, false);
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
    // 1. Fog & Background (Dusk Sky Gradient: #1b1035 zenith to #5b2245 horizon)
    duskSkyTexture = createDuskSkyGradientTexture();
    scene.background = duskSkyTexture;
    scene.fog = new THREE.FogExp2(0x2e1538, 0.008);

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

    // 3. Renderer (High performance WebGL locked to 120 FPS with capped pixel ratio)
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(window.innerWidth < 768 ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.shadowMap.enabled = false;
    if (typeof THREE.ACESFilmicToneMapping !== 'undefined') {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    }

    // Pause WebGL rendering loop when off-screen (e.g. scrolled down to #planner)
    if (typeof IntersectionObserver !== 'undefined' && containerEl) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isRenderLoopPaused = !entry.isIntersecting;
        });
      }, { threshold: 0.05 });
      observer.observe(containerEl);
    }

    // Procedural PBR Environment reflections for automotive paint and glass
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const envScene = new THREE.Scene();
      const envHemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.2);
      envScene.add(envHemi);
      const envMap = pmrem.fromScene(envScene).texture;
      scene.environment = envMap;
      pmrem.dispose();
    } catch (e) {
      console.warn('PMREM fallback', e);
    }

    // 4. Lighting: Only 1 HemisphereLight + 1 DirectionalLight (shadowMap disabled)
    hemiLight = new THREE.HemisphereLight(0xd8b4fe, 0x1e0f2e, 1.25);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xffedd5, 1.75);
    sunLight.position.set(300, 500, 250);
    sunLight.castShadow = false;
    scene.add(sunLight);

    // Streetlights along Crossroads & Sidewalks (Clean physical fixtures without harsh ground spotlights)
    const cornerLightCoords = [
      // 4 Intersection corners
      [-135, 26, -100],
      [135, 26, -100],
      [-135, 26, 100],
      [135, 26, 100],
      // West road sidewalks
      [-320, 26, -100],
      [-480, 26, -100],
      [-320, 26, 100],
      [-480, 26, 100],
      // East road sidewalks
      [320, 26, -100],
      [480, 26, -100],
      [320, 26, 100],
      [480, 26, 100]
    ];
    cornerLightCoords.forEach(pos => {
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

    // 5. Ground & Road Network (Procedural Canvas Matte Slate Asphalt)
    const roadTex = createRoadCanvasTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.85,
      metalness: 0.05
    });
    roadMaterial = roadMat;
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const ground = new THREE.Mesh(groundGeo, roadMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.matrixAutoUpdate = false;
    ground.updateMatrix();
    scene.add(ground);

    // Sidewalk Corners
    addSidewalkCorner(480, 260, -350, -210);
    addSidewalkCorner(480, 260, 350, -210);
    addSidewalkCorner(480, 260, -350, 210);
    addSidewalkCorner(480, 260, 350, 210);

    // Miniature Decorative Trees along Sidewalks
    [-520, -460, -390, -310, -230, -170, 170, 230, 310, 390, 460, 520].forEach(tx => {
      addTree(tx, -88);
      addTree(tx, 88);
    });
    [-260, -220, -180, -140, 140, 180, 220, 260].forEach(tz => {
      addTree(-118, tz);
      addTree(118, tz);
    });

    // 6. Elevated Metro Rail Viaduct Superstructure
    const viaductY = 42;

    const pierXCoords = [-520, -350, -180, 0, 480];
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    pierXCoords.forEach(px => {
      const colGeo = new THREE.BoxGeometry(18, viaductY, 18);
      const col = new THREE.Mesh(colGeo, pierMat);
      col.position.set(px, viaductY / 2, VIADUCT_Z);
      col.castShadow = true;
      col.receiveShadow = true;
      freezeStatic(col);
      scene.add(col);

      // Cantilever Hammerhead Cap
      const capGeo = new THREE.BoxGeometry(32, 6, 28);
      const cap = new THREE.Mesh(capGeo, pierMat);
      cap.position.set(px, viaductY - 3, VIADUCT_Z);
      cap.castShadow = true;
      freezeStatic(cap);
      scene.add(cap);
    });

    // Continuous Box-Girder Beam
    const beamGeo = new THREE.BoxGeometry(1400, 7, 26);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, viaductY + 3.5, VIADUCT_Z);
    beam.castShadow = true;
    beam.receiveShadow = true;
    freezeStatic(beam);
    scene.add(beam);

    // Bangladesh Green & Red Ribbon Livery
    const greenRibbonGeo = new THREE.BoxGeometry(1400, 2, 0.6);
    const greenRibbonMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    const greenRibbon = new THREE.Mesh(greenRibbonGeo, greenRibbonMat);
    greenRibbon.position.set(0, viaductY + 5, VIADUCT_Z + 13.3);
    freezeStatic(greenRibbon);
    scene.add(greenRibbon);

    const redRibbonGeo = new THREE.BoxGeometry(1400, 1.5, 0.6);
    const redRibbonMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const redRibbon = new THREE.Mesh(redRibbonGeo, redRibbonMat);
    redRibbon.position.set(0, viaductY + 3, VIADUCT_Z + 13.3);
    freezeStatic(redRibbon);
    scene.add(redRibbon);

    // Dual Glowing Rails
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const rail1Geo = new THREE.BoxGeometry(1400, 1.2, 1.8);
    const rail1 = new THREE.Mesh(rail1Geo, railMat);
    rail1.position.set(0, viaductY + 7.6, VIADUCT_Z - 4);
    freezeStatic(rail1);
    scene.add(rail1);

    const rail2Geo = new THREE.BoxGeometry(1400, 1.2, 1.8);
    const rail2 = new THREE.Mesh(rail2Geo, railMat);
    rail2.position.set(0, viaductY + 7.6, VIADUCT_Z + 4);
    freezeStatic(rail2);
    scene.add(rail2);

    // Mirpur 10 Station Structure (x: 180 .. 440)
    const stationGroup = new THREE.Group();
    stationGroup.position.set(310, viaductY, VIADUCT_Z);

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
    trainGroup.position.set(-200, viaductY + 7.5, VIADUCT_Z);

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

    // 8. 4 Quadrants of Extruded 3D Buildings (Vibrant Dhaka Architecture)
    // Northwest Quadrant
    create3DBuilding({
      x: -490, z: -210, width: 34, depth: 40, height: 115,
      wallColor: '#0284c7', sideColor: '#082f49',
      floors: 6, cols: 2, winColor: '#bae6fd',
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
      floors: 4, cols: 3, winColor: '#bae6fd',
      antenna: true,
      signboard: { text: 'ফ্যাশন কর্নার', sub: 'Fashion Corner', bg: '#0f172a', textCol: '#ffffff', border: '#d946ef', w: 62, h: 16, y: 14, awnCol: 0x701a75 }
    });

    create3DBuilding({
      x: 230, z: -210, width: 75, depth: 60, height: 100,
      wallColor: '#14b8a6', sideColor: '#042f2e',
      floors: 4, cols: 3, winColor: '#bae6fd',
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
      floors: 6, cols: 5, winColor: '#bae6fd',
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
      floors: 3, cols: 3, winColor: '#bae6fd',
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
      floors: 3, cols: 5, winColor: '#bae6fd',
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
      floors: 4, cols: 2, winColor: '#bae6fd',
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

    // 13. Standing Sidewalk Social Groups (Diverse Street Life)
    const socialSpots = [
      [-160, -125, 0],
      [165, -125, Math.PI / 3],
      [-165, 125, -Math.PI / 4],
      [160, 125, Math.PI]
    ];
    socialSpots.forEach((loc, gIdx) => {
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(loc[0], 0, loc[1]);
      clusterGroup.rotation.y = loc[2];

      [-2.4, 2.4].forEach((offset, pIdx) => {
        const friend = create3DPedestrian({
          id: 950 + gIdx * 10 + pIdx,
          color: pIdx === 0 ? '#10b981' : '#f59e0b',
          x: loc[0] + offset,
          y: loc[1]
        });
        friend.position.set(offset, 0, (pIdx === 0 ? 1 : -1) * 1.5);
        friend.rotation.y = (pIdx === 0 ? Math.PI * 0.7 : -Math.PI * 0.3);
        clusterGroup.add(friend);
        socialPedestrians.push({ mesh: friend, parent: clusterGroup });
      });
      scene.add(clusterGroup);
    });

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

  function setSceneBackgroundColor(color) {
    if (scene.background && scene.background.isColor) {
      scene.background.setHex(color);
    } else {
      scene.background = new THREE.Color(color);
    }
  }

  let strobeTimer = 0;
  let lastWeatherMode = null;
  let lastIsMobile = null;

  window.updateDhakaCrossroads3D = function(dt, trainX, trainState, emergencyWaveActive, ambulanceX, activePhase, isRain, weatherMode) {
    if (!isReady || !renderer || !scene || !camera) return;
    if (isRenderLoopPaused) return;

    // 120Hz Delta-Time Physics (clamped to max 0.05 to avoid frame-skip spikes)
    const delta = clock ? Math.min(clock.getDelta(), 0.05) : (dt || 0.016);

    // Atmospheric Weather Mode Transition (Sunrise, Sun, Sunset, Night, Fog Day, Fog Night, Rain)
    const currentMode = weatherMode || containerEl?.dataset?.crossroadsWeather || (isRain ? 'rain' : 'night');
    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 768;

    if (currentMode !== lastWeatherMode || isMobileScreen !== lastIsMobile) {
      lastWeatherMode = currentMode;
      lastIsMobile = isMobileScreen;

      // 1. Calibrate Streetlights (Corner & Sidewalk PointLights) across all 15 conditions
      if (cornerPointLights && cornerPointLights.length) {
        let baseIntensity = 1.0;
        let lightColor = 0xfef08a;

        if (currentMode === 'fog_night') {
          baseIntensity = isMobileScreen ? 1.20 : 1.05;
        } else if (currentMode === 'night_overcast') {
          baseIntensity = isMobileScreen ? 1.25 : 1.10;
        } else if (currentMode === 'fog_sunset') {
          baseIntensity = isMobileScreen ? 1.15 : 0.95;
          lightColor = 0xfeb272;
        } else if (currentMode === 'sunset_overcast') {
          baseIntensity = isMobileScreen ? 1.10 : 0.90;
          lightColor = 0xfeb272;
        } else if (currentMode === 'fog_sunrise') {
          baseIntensity = isMobileScreen ? 0.95 : 0.75;
          lightColor = 0xffedd5;
        } else if (currentMode === 'sunrise_overcast') {
          baseIntensity = isMobileScreen ? 0.85 : 0.65;
          lightColor = 0xffedd5;
        } else if (currentMode === 'morning_overcast') {
          baseIntensity = isMobileScreen ? 0.55 : 0.40;
        } else if (currentMode === 'fog_day') {
          baseIntensity = isMobileScreen ? 0.60 : 0.45;
          lightColor = 0xfef9c3;
        } else if (currentMode === 'day_overcast') {
          baseIntensity = isMobileScreen ? 0.40 : 0.25;
        } else if (currentMode === 'sun') {
          baseIntensity = isMobileScreen ? 0.35 : 0.20;
        } else if (currentMode === 'rain') {
          baseIntensity = isMobileScreen ? 1.35 : 1.20;
        } else if (currentMode === 'sunset') {
          baseIntensity = isMobileScreen ? 1.05 : 0.85;
          lightColor = 0xfeb272;
        } else if (currentMode === 'sunrise') {
          baseIntensity = isMobileScreen ? 0.85 : 0.65;
          lightColor = 0xffedd5;
        } else { // night
          baseIntensity = isMobileScreen ? 1.40 : 1.25;
        }

        cornerPointLights.forEach(pl => {
          pl.intensity = baseIntensity;
          pl.color.setHex(lightColor);
        });
      }

      // 2. Calibrate Building Window Emissive Glow through fog and clouds
      if (scene) {
        scene.traverse(obj => {
          if (obj.isMesh && obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach(mat => {
              if (mat && mat.emissiveMap) {
                if (currentMode === 'fog_night' || currentMode === 'night_overcast') {
                  mat.emissiveIntensity = isMobileScreen ? 0.36 : 0.28;
                } else if (currentMode === 'fog_sunset' || currentMode === 'sunset_overcast') {
                  mat.emissiveIntensity = isMobileScreen ? 0.32 : 0.24;
                } else if (currentMode === 'fog_sunrise' || currentMode === 'sunrise_overcast') {
                  mat.emissiveIntensity = isMobileScreen ? 0.22 : 0.16;
                } else if (currentMode === 'morning_overcast' || currentMode === 'fog_day') {
                  mat.emissiveIntensity = isMobileScreen ? 0.14 : 0.10;
                } else if (currentMode === 'day_overcast') {
                  mat.emissiveIntensity = isMobileScreen ? 0.10 : 0.08;
                } else if (currentMode === 'sun') {
                  mat.emissiveIntensity = 0.05;
                } else if (currentMode === 'rain') {
                  mat.emissiveIntensity = isMobileScreen ? 0.40 : 0.32;
                } else if (currentMode === 'sunset') {
                  mat.emissiveIntensity = isMobileScreen ? 0.32 : 0.25;
                } else if (currentMode === 'sunrise') {
                  mat.emissiveIntensity = isMobileScreen ? 0.22 : 0.18;
                } else { // night
                  mat.emissiveIntensity = isMobileScreen ? 0.42 : 0.35;
                }
              }
            });
          }
        });
      }

      // 3. Vehicle headlight cluster tint calibration
      if (vehicleHeadlightMat) {
        if (currentMode === 'fog_night' || currentMode === 'fog_sunset' || currentMode === 'fog_sunrise') {
          vehicleHeadlightMat.color.setHex(0xfffae6);
        } else {
          vehicleHeadlightMat.color.setHex(0xffffff);
        }
      }

      // 4. Environmental Sky, Fog, SunLight, and AmbientLight Calibration across all 15 modes
      if (currentMode === 'sunrise') {
        setSceneBackgroundColor(isMobileScreen ? 0x24142b : 0x1e0e24);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0xa84370 : 0x863359);
          scene.fog.density = 0.0006;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xfed7aa);
          hemiLight.groundColor.setHex(0x2a1728);
          hemiLight.intensity = isMobileScreen ? 1.30 : 1.20;
        }
        if (sunLight) {
          sunLight.color.setHex(0xffaa88);
          sunLight.intensity = isMobileScreen ? 1.50 : 1.40;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0xfbcfe8);
          ambientLight.intensity = isMobileScreen ? 0.80 : 0.72;
        }
      } else if (currentMode === 'sunrise_overcast') {
        setSceneBackgroundColor(isMobileScreen ? 0x1f1b29 : 0x16131f);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x3d3242 : 0x2d2433);
          scene.fog.density = isMobileScreen ? 0.0008 : 0.0010;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xddd6fe);
          hemiLight.groundColor.setHex(0x282030);
          hemiLight.intensity = isMobileScreen ? 1.15 : 1.05;
        }
        if (sunLight) {
          sunLight.color.setHex(0xf472b6);
          sunLight.intensity = isMobileScreen ? 1.10 : 0.95;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x6b5b7b : 0x544761);
          ambientLight.intensity = isMobileScreen ? 0.75 : 0.65;
        }
      } else if (currentMode === 'fog_sunrise') {
        setSceneBackgroundColor(isMobileScreen ? 0x342238 : 0x27172b);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x754757 : 0x613745);
          scene.fog.density = isMobileScreen ? 0.0011 : 0.0013;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xfed7aa);
          hemiLight.groundColor.setHex(0x35222f);
          hemiLight.intensity = isMobileScreen ? 1.20 : 1.10;
        }
        if (sunLight) {
          sunLight.color.setHex(0xfed7aa);
          sunLight.intensity = isMobileScreen ? 1.15 : 1.00;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x8a5a6e : 0x73485b);
          ambientLight.intensity = isMobileScreen ? 0.75 : 0.68;
        }
      } else if (currentMode === 'morning_overcast') {
        setSceneBackgroundColor(isMobileScreen ? 0x222836 : 0x1a202c);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x333d4f : 0x27303f);
          scene.fog.density = isMobileScreen ? 0.0008 : 0.0009;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xcbd5e1);
          hemiLight.groundColor.setHex(0x1e2530);
          hemiLight.intensity = isMobileScreen ? 1.20 : 1.10;
        }
        if (sunLight) {
          sunLight.color.setHex(0xa0aec0);
          sunLight.intensity = isMobileScreen ? 1.15 : 1.00;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x64748b : 0x475569);
          ambientLight.intensity = isMobileScreen ? 0.78 : 0.70;
        }
      } else if (currentMode === 'sun') {
        setSceneBackgroundColor(0x0284c7);
        if (scene.fog) {
          scene.fog.color.setHex(0x0284c7);
          scene.fog.density = 0.0004;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xe0f2fe);
          hemiLight.groundColor.setHex(0x1e293b);
          hemiLight.intensity = 1.40;
        }
        if (sunLight) {
          sunLight.color.setHex(0xfffbeb);
          sunLight.intensity = 1.80;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0xffffff);
          ambientLight.intensity = isMobileScreen ? 0.85 : 0.80;
        }
      } else if (currentMode === 'day_overcast') {
        setSceneBackgroundColor(isMobileScreen ? 0x262e3d : 0x1c2330);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x3f4a5c : 0x303a49);
          scene.fog.density = isMobileScreen ? 0.0007 : 0.0008;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xcbd5e1);
          hemiLight.groundColor.setHex(0x1e2530);
          hemiLight.intensity = isMobileScreen ? 1.25 : 1.15;
        }
        if (sunLight) {
          sunLight.color.setHex(0xcbd5e1);
          sunLight.intensity = isMobileScreen ? 1.20 : 1.05;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x64748b : 0x475569);
          ambientLight.intensity = isMobileScreen ? 0.80 : 0.72;
        }
      } else if (currentMode === 'sunset') {
        setSceneBackgroundColor(isMobileScreen ? 0x3a1409 : 0x2c0d05);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x66220d : 0x4d1607);
          scene.fog.density = 0.0006;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xfed7aa);
          hemiLight.groundColor.setHex(0x331a10);
          hemiLight.intensity = isMobileScreen ? 1.25 : 1.15;
        }
        if (sunLight) {
          sunLight.color.setHex(0xff7722);
          sunLight.intensity = isMobileScreen ? 1.55 : 1.45;
        }
        if (ambientLight) {
          ambientLight.color.setHex(0xfb923c);
          ambientLight.intensity = isMobileScreen ? 0.82 : 0.72;
        }
      } else if (currentMode === 'sunset_overcast') {
        setSceneBackgroundColor(isMobileScreen ? 0x241620 : 0x1b0f17);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x422633 : 0x321a25);
          scene.fog.density = isMobileScreen ? 0.0008 : 0.0010;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xfbcfe8);
          hemiLight.groundColor.setHex(0x261922);
          hemiLight.intensity = isMobileScreen ? 1.15 : 1.05;
        }
        if (sunLight) {
          sunLight.color.setHex(0xea580c);
          sunLight.intensity = isMobileScreen ? 1.10 : 0.95;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x6e4350 : 0x58343f);
          ambientLight.intensity = isMobileScreen ? 0.72 : 0.65;
        }
      } else if (currentMode === 'fog_sunset') {
        setSceneBackgroundColor(isMobileScreen ? 0x301812 : 0x24100b);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x6b2b18 : 0x542011);
          scene.fog.density = isMobileScreen ? 0.0011 : 0.0013;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xfed7aa);
          hemiLight.groundColor.setHex(0x331b14);
          hemiLight.intensity = isMobileScreen ? 1.20 : 1.10;
        }
        if (sunLight) {
          sunLight.color.setHex(0xf97316);
          sunLight.intensity = isMobileScreen ? 1.20 : 1.05;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x7e3723 : 0x662919);
          ambientLight.intensity = isMobileScreen ? 0.75 : 0.66;
        }
      } else if (currentMode === 'fog_day') {
        setSceneBackgroundColor(isMobileScreen ? 0x718096 : 0x64748b);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x94a3b8 : 0x8293a7);
          scene.fog.density = isMobileScreen ? 0.0010 : 0.0012;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xe2e8f0);
          hemiLight.groundColor.setHex(0x334155);
          hemiLight.intensity = isMobileScreen ? 1.30 : 1.20;
        }
        if (sunLight) {
          sunLight.color.setHex(0xe2e8f0);
          sunLight.intensity = isMobileScreen ? 1.10 : 0.95;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x94a3b8 : 0x718096);
          ambientLight.intensity = isMobileScreen ? 0.82 : 0.74;
        }
      } else if (currentMode === 'fog_night') {
        // Nighttime Fog: realistic atmospheric fog with depth, diffusion, and subtle volumetric glow
        setSceneBackgroundColor(isMobileScreen ? 0x091020 : 0x060c18);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x0d182d : 0x0a1426);
          scene.fog.density = isMobileScreen ? 0.0010 : 0.0012;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0x94a3b8);
          hemiLight.groundColor.setHex(0x141d2b);
          hemiLight.intensity = isMobileScreen ? 0.90 : 0.80;
        }
        if (sunLight) {
          sunLight.color.setHex(0x94a3b8);
          sunLight.intensity = isMobileScreen ? 0.70 : 0.60;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x334155 : 0x283344);
          ambientLight.intensity = isMobileScreen ? 0.70 : 0.62;
        }
      } else if (currentMode === 'night_overcast') {
        // Nighttime Overcast: dark atmospheric night with clearly visible city elements
        setSceneBackgroundColor(isMobileScreen ? 0x080c16 : 0x050810);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x0d1422 : 0x090e18);
          scene.fog.density = isMobileScreen ? 0.0008 : 0.0010;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0x94a3b8);
          hemiLight.groundColor.setHex(0x141d2b);
          hemiLight.intensity = isMobileScreen ? 0.90 : 0.80;
        }
        if (sunLight) {
          sunLight.color.setHex(0x64748b);
          sunLight.intensity = isMobileScreen ? 0.65 : 0.55;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x334155 : 0x283344);
          ambientLight.intensity = isMobileScreen ? 0.70 : 0.62;
        }
      } else if (currentMode === 'rain') {
        setSceneBackgroundColor(isMobileScreen ? 0x0d1628 : 0x08101e);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x121e36 : 0x0d172b);
          scene.fog.density = isMobileScreen ? 0.0009 : 0.0011;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0x94a3b8);
          hemiLight.groundColor.setHex(0x1e293b);
          hemiLight.intensity = isMobileScreen ? 1.10 : 1.00;
        }
        if (sunLight) {
          sunLight.color.setHex(0x60a5fa);
          sunLight.intensity = isMobileScreen ? 1.05 : 0.95;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x334155 : 0x243248);
          ambientLight.intensity = isMobileScreen ? 0.78 : 0.70;
        }
      } else { // night (clear) & Vice City Dusk Skyline
        if (duskSkyTexture) {
          scene.background = duskSkyTexture;
        } else if (scene.background && scene.background.isColor) {
          setSceneBackgroundColor(isMobileScreen ? 0x1b1035 : 0x140b29);
        }
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x3d173d : 0x2d122e);
          scene.fog.density = isMobileScreen ? 0.0006 : 0.0007;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xf472b6);
          hemiLight.groundColor.setHex(0x1e102d);
          hemiLight.intensity = isMobileScreen ? 1.05 : 0.95;
        }
        if (sunLight) {
          sunLight.color.setHex(0xec4899);
          sunLight.intensity = isMobileScreen ? 0.90 : 0.80;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x8b5cf6 : 0x6d28d9);
          ambientLight.intensity = isMobileScreen ? 0.75 : 0.68;
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

    // 2. Update Live Vehicles with physically accurate lane coordinates, suspension bounce & subtle tilt
    for (const id in vehicleMeshMap) {
      const vm = vehicleMeshMap[id];
      const v = vm.data;
      if (!v || !vm.mesh) continue;

      const bounce = Math.sin((v.pos || 0) * 0.12) * 0.25;
      const tiltZ = Math.sin((v.pos || 0) * 0.08) * 0.012;

      if (v.dir === 'EB') {
        const laneZ = (typeof v.currentLaneY !== 'undefined') ? (v.currentLaneY - 420) : (v.lane === 1 ? 18 : 48);
        vm.mesh.position.set(v.pos - 600, bounce, laneZ);
        vm.mesh.rotation.z = -tiltZ;
      } else if (v.dir === 'WB') {
        const laneZ = (typeof v.currentLaneY !== 'undefined') ? (v.currentLaneY - 420) : (v.lane === 1 ? -15 : -52);
        vm.mesh.position.set(v.pos - 600, bounce, laneZ);
        vm.mesh.rotation.z = tiltZ;
      } else if (v.dir === 'SB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? -20 : -58);
        vm.mesh.position.set(laneX, bounce, v.pos - 420);
        vm.mesh.rotation.x = tiltZ;
      } else if (v.dir === 'NB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? 18 : 56);
        vm.mesh.position.set(laneX, bounce, v.pos - 420);
        vm.mesh.rotation.x = -tiltZ;
      }
      // Rolling wheels animation (proportional to vehicle movement)
      if (vm.mesh.userData && vm.mesh.userData.wheels) {
        const rollSpeed = (v.speed || 30) * delta * 1.5;
        vm.mesh.userData.wheels.forEach(w => {
          w.rotation.z -= rollSpeed;
        });
      }
    }

    // 3. Update Ambulance
    if (ambulanceGroup) {
      if (emergencyWaveActive && ambulanceX > -170 && ambulanceX < 1350) {
        ambulanceGroup.visible = true;
        ambulanceGroup.position.set(ambulanceX - 600, 0, 18);

        // Rolling ambulance wheels
        if (ambulanceGroup.userData && ambulanceGroup.userData.wheels) {
          const ambRoll = 55 * delta * 1.5;
          ambulanceGroup.userData.wheels.forEach(w => {
            w.rotation.z -= ambRoll;
          });
        }

        // Flashing Strobe Lights
        strobeTimer += delta * 18;
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

    // Dynamic Road Wetness & Specular Sheen (Matte Slate Asphalt)
    if (roadMaterial) {
      const targetRoughness = isRain ? 0.45 : 0.85;
      const targetMetalness = isRain ? 0.20 : 0.05;
      roadMaterial.roughness += (targetRoughness - roadMaterial.roughness) * Math.min(1, dt * 3.0);
      roadMaterial.metalness += (targetMetalness - roadMaterial.metalness) * Math.min(1, dt * 3.0);
    }

    // 7. Dynamic GTA-5 Third-Person Chase Camera & Aerial Drone Hover
    idleDroneTime += delta;

    if (activeCamMode !== 'overview') {
      // Acquire active vehicle target if needed
      if (!activeTargetVehicle || (activeTargetVehicle.data && Math.abs((activeTargetVehicle.data.pos || 0) - 600) > 600)) {
        activeTargetVehicle = acquireTargetVehicle(activeCamMode);
      }

      let desiredCamPos = null;
      let desiredCamLook = null;

      if (activeCamMode === 'metro' && trainGroup) {
        // High-speed chase of Dhaka Metro Rail (MRT Line 6) on elevated viaduct
        desiredCamPos = {
          x: trainGroup.position.x - 90,
          y: 72,
          z: VIADUCT_Z + 68
        };
        desiredCamLook = {
          x: trainGroup.position.x + 40,
          y: 46,
          z: VIADUCT_Z
        };
      } else if (activeCamMode === 'walking') {
        if (!activeTargetVehicle) activeTargetVehicle = acquireTargetVehicle('walking');
        if (activeTargetVehicle && activeTargetVehicle.mesh) {
          const pPos = activeTargetVehicle.mesh.position;
          desiredCamPos = {
            x: pPos.x - 24,
            y: pPos.y + 18,
            z: pPos.z + 32
          };
          desiredCamLook = {
            x: pPos.x,
            y: pPos.y + 4,
            z: pPos.z
          };
        }
      } else if (activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.data) {
        // GTA-5 Third-Person Follow: Positioned behind vehicle bumper, looking ahead through windshield
        const vPos = activeTargetVehicle.mesh.position;
        const vDir = activeTargetVehicle.data.dir;

        if (vDir === 'EB') {
          // Eastbound (+X)
          desiredCamPos = { x: vPos.x - 52, y: vPos.y + 24, z: vPos.z + mouseRelX * 10 };
          desiredCamLook = { x: vPos.x + 36, y: vPos.y + 5, z: vPos.z };
        } else if (vDir === 'WB') {
          // Westbound (-X)
          desiredCamPos = { x: vPos.x + 52, y: vPos.y + 24, z: vPos.z - mouseRelX * 10 };
          desiredCamLook = { x: vPos.x - 36, y: vPos.y + 5, z: vPos.z };
        } else if (vDir === 'SB') {
          // Southbound (+Z)
          desiredCamPos = { x: vPos.x + mouseRelX * 10, y: vPos.y + 24, z: vPos.z - 52 };
          desiredCamLook = { x: vPos.x, y: vPos.y + 5, z: vPos.z + 36 };
        } else {
          // Northbound (-Z)
          desiredCamPos = { x: vPos.x - mouseRelX * 10, y: vPos.y + 24, z: vPos.z + 52 };
          desiredCamLook = { x: vPos.x, y: vPos.y + 5, z: vPos.z - 36 };
        }
      }

      if (desiredCamPos && desiredCamLook) {
        // Silky-smooth 120Hz exponential damping: 1 - Math.exp(-k * delta)
        const camLerp = 1 - Math.exp(-6 * delta);
        const lookLerp = 1 - Math.exp(-8 * delta);

        camera.position.x += (desiredCamPos.x - camera.position.x) * camLerp;
        camera.position.y += (desiredCamPos.y - camera.position.y) * camLerp;
        camera.position.z += (desiredCamPos.z - camera.position.z) * camLerp;

        currentCamLook.x += (desiredCamLook.x - currentCamLook.x) * lookLerp;
        currentCamLook.y += (desiredCamLook.y - currentCamLook.y) * lookLerp;
        currentCamLook.z += (desiredCamLook.z - currentCamLook.z) * lookLerp;

        camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
      } else {
        const camLerp = 1 - Math.exp(-5 * delta);
        camera.position.x += (camBasePos.x - camera.position.x) * camLerp;
        camera.position.y += (camBasePos.y - camera.position.y) * camLerp;
        camera.position.z += (camBasePos.z - camera.position.z) * camLerp;
        currentCamLook.x += (camBaseLook.x - currentCamLook.x) * camLerp;
        currentCamLook.y += (camBaseLook.y - currentCamLook.y) * camLerp;
        currentCamLook.z += (camBaseLook.z - currentCamLook.z) * camLerp;
        camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
      }
    } else {
      // Overview mode: 3/4 aerial drone hover with figure-8 sway and mouse parallax
      const driftX = Math.sin(idleDroneTime * 0.45) * 7.5;
      const driftY = Math.cos(idleDroneTime * 0.35) * 4.0;
      const driftZ = Math.sin(idleDroneTime * 0.28) * 5.5;

      const parallaxScale = isMobileScreen ? 25 : 65;
      targetCamX = camBasePos.x + mouseRelX * parallaxScale + driftX;
      targetCamY = camBasePos.y - mouseRelY * (parallaxScale * 0.7) + driftY;
      const targetCamZ = camBasePos.z + driftZ;

      const lerpFactor = 1 - Math.exp(-5 * delta);
      camera.position.x += (targetCamX - camera.position.x) * lerpFactor;
      camera.position.y += (targetCamY - camera.position.y) * lerpFactor;
      camera.position.z += (targetCamZ - camera.position.z) * lerpFactor;

      currentCamLook.x += (camBaseLook.x - currentCamLook.x) * lerpFactor;
      currentCamLook.y += (camBaseLook.y - currentCamLook.y) * lerpFactor;
      currentCamLook.z += (camBaseLook.z - currentCamLook.z) * lerpFactor;

      camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
    }

    // 8. Crisp Direct WebGL Render (No Blur or Washout)
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
