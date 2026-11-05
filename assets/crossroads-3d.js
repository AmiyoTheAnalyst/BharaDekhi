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
  let vehicleOrbitYaw = 2.0;
  let vehicleOrbitPitch = 0.2;
  let orbitPointerId = null;
  let lastOrbitPointerX = 0;
  let lastOrbitPointerY = 0;
  let buildingNameCounter = 0;
  const ORBITABLE_VEHICLE_MODES = ['bus', 'bike', 'cng', 'car', 'rickshaw'];
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
    bike: {
      pos: { x: 220, y: 440, z: 460 },
      look: { x: 0, y: 25, z: -35 },
      badge: 'Bike Orbit · Move Pointer'
    },
    cng: {
      pos: { x: 220, y: 440, z: 460 },
      look: { x: 0, y: 25, z: -35 },
      badge: 'CNG Orbit · Move Pointer'
    },
    car: {
      pos: { x: 220, y: 440, z: 460 },
      look: { x: 0, y: 25, z: -35 },
      badge: 'Car Orbit · Move Pointer'
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
      pos: { x: 220, y: 440, z: 460 },
      look: { x: 0, y: 25, z: -35 },
      badge: 'Rickshaw Orbit · Move Pointer'
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

    let targetTypes = [];
    if (['bike', 'cng', 'car'].includes(modeName)) {
      targetTypes = [modeName];
    } else if (modeName === 'bus') {
      targetTypes = ['bus'];
    } else if (modeName === 'rickshaw') {
      targetTypes = ['rickshaw'];
    }

    if (targetTypes.length) {
      const eligible = Object.values(vehicleMeshMap)
        .filter(vm => vm.mesh && vm.data && targetTypes.includes(vm.data.type))
        .sort((a, b) => {
          const centerA = a.data.dir === 'SB' || a.data.dir === 'NB' ? 420 : 600;
          const centerB = b.data.dir === 'SB' || b.data.dir === 'NB' ? 420 : 600;
          return Math.abs(a.data.pos - centerA) - Math.abs(b.data.pos - centerB);
        });
      if (eligible.length) {
        return {
          type: eligible[0].data.type,
          mesh: eligible[0].mesh,
          data: eligible[0].data
        };
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

  function getVehicleCameraPose(target, yaw, radius, pitch) {
    const position = target.mesh.position;
    const direction = target.data ? target.data.dir : target.dir;
    const forward = direction === 'EB' ? { x: 1, z: 0 }
      : direction === 'WB' ? { x: -1, z: 0 }
        : direction === 'SB' ? { x: 0, z: 1 }
          : { x: 0, z: -1 };
    const right = { x: -forward.z, z: forward.x };
    const horizontalRadius = radius * Math.cos(pitch);
    const targetX = position.x + forward.x * 5;
    const targetY = position.y + 6;
    const targetZ = position.z + forward.z * 5;

    return {
      position: {
        x: targetX - forward.x * horizontalRadius * Math.cos(yaw) + right.x * horizontalRadius * Math.sin(yaw),
        y: targetY + radius * Math.sin(pitch),
        z: targetZ - forward.z * horizontalRadius * Math.cos(yaw) + right.z * horizontalRadius * Math.sin(yaw)
      },
      look: {
        x: targetX + forward.x * 8,
        y: targetY,
        z: targetZ + forward.z * 8
      }
    };
  }

  function getVehicleOrbitPose(target) {
    const yaw = vehicleOrbitYaw;
    const pitch = vehicleOrbitPitch + (target.type === 'rickshaw' ? 0.06 : 0);
    const radius = target.type === 'car' ? 62
      : target.type === 'bike' ? 38
        : target.type === 'rickshaw' ? 46
          : target.type === 'cng' ? 48
            : 82;

    return getVehicleCameraPose(target, yaw, radius, pitch);
  }

  function isOrbitableVehicleMode(modeName) {
    return ORBITABLE_VEHICLE_MODES.includes(modeName);
  }

  function updateCameraModeBadge(modeName) {
    const badge = document.getElementById('crossroadsCamModeBadge');
    if (!badge || !CAM_MODES[modeName]) return;

    const targetType = activeTargetVehicle && activeTargetVehicle.type;
    if (['bike', 'cng', 'car', 'rickshaw', 'bus'].includes(modeName)) {
      badge.textContent = targetType
        ? `${targetType.charAt(0).toUpperCase()}${targetType.slice(1)} · Move Pointer to Orbit`
        : 'Waiting for vehicle';
    } else {
      badge.textContent = CAM_MODES[modeName].badge;
    }
  }

  function updateLegendHUD(modeName) {
    ['metro', 'bus', 'bike', 'cng', 'car', 'rickshaw', 'walking'].forEach(m => {
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

    updateCameraModeBadge(modeName);

    const modePill = document.getElementById('crossroadsModePill');

    if (['metro', 'bus', 'bike', 'cng', 'car', 'rickshaw', 'walking'].includes(modeName)) {
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
        } else if (modeName === 'bike') {
          if (icon) icon.textContent = '🏍️';
          if (title) title.textContent = 'Ride-share Bike';
          if (sub) sub.textContent = 'Fast ride-share trips through Dhaka traffic.';
        } else if (modeName === 'cng') {
          if (icon) icon.textContent = '🛺';
          if (title) title.textContent = 'CNG Auto-rickshaw';
          if (sub) sub.textContent = 'Motorized three-wheeler for comfortable local trips.';
        } else if (modeName === 'car') {
          if (icon) icon.textContent = '🚗';
          if (title) title.textContent = 'Ride-share Car';
          if (sub) sub.textContent = 'Private car trips with a comfortable ride.';
        } else if (modeName === 'walking') {
          if (icon) icon.textContent = '🚶';
          if (title) title.textContent = 'Zebra Crossings & Pedestrian Walkway';
          if (sub) sub.textContent = 'Synchronized pedestrian signals across Mirpur 10 Crossroads (0 carbon, 0 taka)';
        }
      }
    } else {
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
      orbitPointerId = null;
      if (canvasEl) canvasEl.style.touchAction = 'auto';
      focusCamera(CAM_MODES.overview.pos, CAM_MODES.overview.look, 1.6);
      updateLegendHUD('overview');
      return;
    }

    const targetMode = CAM_MODES[modeName] ? modeName : 'overview';
    activeCamMode = targetMode;
    vehicleOrbitYaw = 2.0;
    vehicleOrbitPitch = 0.2;

    if (targetMode !== 'overview') {
      activeTargetVehicle = acquireTargetVehicle(targetMode);
    } else {
      activeTargetVehicle = null;
    }
    if (canvasEl) {
      canvasEl.style.touchAction = isOrbitableVehicleMode(targetMode) ? 'none' : 'auto';
    }

    if (activeTargetVehicle && activeTargetVehicle.data) {
      const pose = getVehicleOrbitPose(activeTargetVehicle);
      focusCamera(pose.position, pose.look, 1.6);
    } else {
      focusCamera(CAM_MODES[targetMode].pos, CAM_MODES[targetMode].look, 1.6);
    }
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
  let alloyRimMat = null;
  let tireSidewallMat = null;
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

    const sideGlassMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.18,
      metalness: 0.35,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    });
    const sideWindowShapes = [
      [[0.02, 1.05], [-0.18, 0.79], [-0.72, 0.78], [-0.72, 1.08]],
      [[-0.28, 1.08], [-0.79, 1.07], [-1.03, 1.01], [-1.72, 0.80], [-0.87, 0.78]]
    ];
    [-0.79, 0.79].forEach(side => {
      sideWindowShapes.forEach(points => {
        const windowShape = new THREE.Shape();
        windowShape.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(point => windowShape.lineTo(point[0], point[1]));
        windowShape.closePath();
        const windowPane = new THREE.Mesh(new THREE.ShapeGeometry(windowShape), sideGlassMat);
        windowPane.position.z = side;
        group.add(windowPane);
      });

      const windowDivider = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.39, 0.035),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.45, roughness: 0.4 })
      );
      windowDivider.position.set(-0.74, 0.90, side);
      group.add(windowDivider);
    });

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

    // Four road-ready tires with modeled alloy rims on both visible sides.
    [-0.82, 0.82].forEach(wz => {
      [-1.3, 1.3].forEach(wx => {
        const wheel = create10SpokeAlloyWheel(0.32, 0.20, 0xcbd5e1, false);
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
    group.userData.wheelRadius = 3.2;
    return group;
  }
  window.createAerodynamicCar = createAerodynamicCar;
  window.createCurvedSportsCar = createAerodynamicCar;

  // ---------------------------------------------------------------------------
  // 2. Articulated Multi-Part Procedural Humans — ZERO Box Cylinders, ZERO GLTF
  // Lifelike stride kinetics using articulated limbs (userData: leftLeg, rightLeg, leftArm, rightArm)
  // ---------------------------------------------------------------------------
  function getAppearanceSeed(id) {
    const text = String(id);
    let seed = 2166136261;
    for (let index = 0; index < text.length; index++) {
      seed = Math.imul(seed ^ text.charCodeAt(index), 16777619);
    }
    return seed >>> 0;
  }

  function createArticulatedHuman(p, isSocial) {
    const group = new THREE.Group();
    const id = (p && p.id !== undefined) ? p.id : Math.floor(Math.random() * 1000);
    const styleSeed = getAppearanceSeed(id);
    const styleIdx = styleSeed % 8;

    const skinPalette = [0xc58f68, 0xb47b56, 0xd4a373, 0x99613d];
    const skinHex = skinPalette[(styleSeed >>> 3) % skinPalette.length];
    const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.7 });

    const outfits = [
      { top: 0xeab308, bottom: 0x1d4ed8, hair: 0x1e293b },
      { top: 0xf43f5e, bottom: 0x18181b, hair: 0x1c1917 },
      { top: 0xf8fafc, bottom: 0x78716c, hair: 0x292524 },
      { top: 0x2563eb, bottom: 0x334155, hair: 0x0f172a },
      { top: 0x15803d, bottom: 0xe7d7b1, hair: 0x292016, longTop: true },
      { top: 0xb45309, bottom: 0x374151, hair: 0x211c1a, longTop: true },
      { top: 0xdb2777, bottom: 0x7c3aed, hair: 0x211c1a, scarf: true },
      { top: 0x0f766e, bottom: 0x78350f, hair: 0x292016 }
    ];
    const outfit = outfits[styleIdx];
    const topColor = outfit.top;
    const bottomColor = outfit.bottom;
    const hairColor = outfit.hair;

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
    if (outfit.longTop) {
      const tunic = new THREE.Mesh(new THREE.BoxGeometry(2.45, 3.5, 1.42), topMat);
      tunic.position.y = 6.35;
      group.add(tunic);
    }

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
    head.scale.set(
      0.9 + ((styleSeed >>> 9) % 4) * 0.06,
      0.92 + ((styleSeed >>> 11) % 3) * 0.08,
      0.92 + ((styleSeed >>> 13) % 3) * 0.08
    );
    head.position.y = 9.5;
    group.add(head);

    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.35 });
    const irisMat = new THREE.MeshStandardMaterial({
      color: [0x211c1a, 0x3f2a1d, 0x243b53, 0x4b3621][(styleSeed >>> 12) % 4],
      roughness: 0.42
    });
    const browMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const eyeRadius = 0.13 + ((styleSeed >>> 15) % 3) * 0.025;
    const eyeSpacing = 0.27 + ((styleSeed >>> 17) % 3) * 0.045;
    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 8, 6), eyeWhiteMat);
      eye.scale.set(1, 1.25, 0.55);
      eye.position.set(side * eyeSpacing, 9.58, 0.64);
      group.add(eye);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), irisMat);
      iris.position.set(side * eyeSpacing, 9.57, 0.72);
      group.add(iris);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(eyeSpacing * 1.2, 0.09, 0.12), browMat);
      brow.position.set(side * eyeSpacing, 9.82, 0.66);
      brow.rotation.z = side * (styleSeed % 2 ? 0.08 : -0.08);
      group.add(brow);
    });

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.13 + ((styleSeed >>> 19) % 3) * 0.025, 0.28 + ((styleSeed >>> 21) % 3) * 0.06, 5),
      skinMat
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 9.37, 0.72);
    group.add(nose);

    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x6b3030, roughness: 0.8 });
    const mouthWidth = 0.22 + ((styleSeed >>> 23) % 4) * 0.04;
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(mouthWidth, 0.075, 0.1), mouthMat);
    mouth.position.set(0, 9.08, 0.66);
    group.add(mouth);

    // Distinct hairstyles and headwear.
    if (outfit.scarf) {
      const headScarf = new THREE.Mesh(new THREE.SphereGeometry(0.88, 8, 6), topMat);
      headScarf.scale.set(1.05, 1.08, 1.12);
      headScarf.position.set(0, 9.92, -0.25);
      group.add(headScarf);
      const drape = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.2, 0.30), topMat);
      drape.position.set(0, 8.55, -0.78);
      group.add(drape);
    } else if (styleIdx === 0) {
      const capDome = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.55, 1.35), hairMat);
      capDome.position.y = 10.2;
      group.add(capDome);
      const capBrim = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.75), hairMat);
      capBrim.position.set(0, 10.0, 0.85);
      group.add(capBrim);
    } else if (styleIdx === 1 || styleIdx === 7) {
      const afro = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.5), hairMat);
      afro.position.y = 10.3;
      group.add(afro);
    } else if (styleIdx === 2 || styleIdx === 4) {
      const fade = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.5, 1.35), hairMat);
      fade.position.y = 10.25;
      group.add(fade);
    } else {
      const longHair = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.4), hairMat);
      longHair.position.set(0, 9.8, -0.15);
      group.add(longHair);
    }

    if (styleIdx === 4 || styleIdx === 7) {
      const sideburns = [-1, 1].map(side => {
        const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.22), hairMat);
        sideburn.position.set(side * 0.58, 9.32, 0.43);
        group.add(sideburn);
        return sideburn;
      });
      group.userData.sideburns = sideburns;
    }

    if (!outfit.scarf && styleSeed % 4 !== 0) {
      const beardMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.92 });
      if (styleSeed % 3 === 0) {
        const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.16), beardMat);
        moustache.position.set(0, 9.2, 0.7);
        group.add(moustache);
      } else {
        const beardHeight = styleSeed % 2 === 0 ? 0.42 : 0.72;
        const beard = new THREE.Mesh(new THREE.BoxGeometry(0.82, beardHeight, 0.18), beardMat);
        beard.position.set(0, 9.0 - beardHeight * 0.25, 0.68);
        group.add(beard);
        const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.16), beardMat);
        moustache.position.set(0, 9.2, 0.7);
        group.add(moustache);
      }
    }

    const heightScale = [0.86, 0.93, 1, 1.07, 1.14][(styleSeed >>> 5) % 5];
    const widthScale = 0.94 + ((styleSeed >>> 8) % 4) * 0.04;
    group.scale.set(widthScale, heightScale, widthScale);

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

    buildingNameCounter += 1;
    const displayName = config.name || `MIRPUR BLOCK ${String(buildingNameCounter).padStart(2, '0')}`;
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
        emissiveIntensity: 0.22
      });
      const sideM = new THREE.MeshStandardMaterial({
        map: sideT,
        roughness: 0.45,
        metalness: 0.20,
        emissive: new THREE.Color(0xfbbf24),
        emissiveMap: sideT,
        emissiveIntensity: 0.16
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
    {
      const buildingSign = signboard || {
        text: displayName,
        sub: 'Mirpur 10 · Dhaka',
        bg: '#0f172a',
        textCol: '#fff7ed',
        subCol: '#fbbf24',
        border: '#fb923c',
        tw: 256,
        th: 64,
        w: Math.min(110, Math.max(50, w1 * 0.78)),
        h: 13,
        y: 13
      };
      const sTex = createSignboardTexture(buildingSign.text, buildingSign.sub, buildingSign.bg, buildingSign.textCol, buildingSign.subCol, buildingSign.border, buildingSign.tw, buildingSign.th);
      const sGeo = new THREE.BoxGeometry(buildingSign.w || (w1 * 0.75), buildingSign.h || 16, 2.5);
      const sMat = new THREE.MeshBasicMaterial({ map: sTex });
      const signMesh = new THREE.Mesh(sGeo, sMat);
      signMesh.position.set(buildingSign.ox || 0, buildingSign.y || 15, (d1 / 2) + 2.0);
      group.add(signMesh);

      if (buildingSign.awnCol) {
        const awnGeo = new THREE.BoxGeometry((buildingSign.w || (w1 * 0.75)) + 3, 2.8, 8);
        const awnMat = new THREE.MeshStandardMaterial({ color: buildingSign.awnCol, roughness: 0.5 });
        const awn = new THREE.Mesh(awnGeo, awnMat);
        awn.position.set(buildingSign.ox || 0, (buildingSign.y || 15) + (buildingSign.h || 16) / 2 + 1.4, (d1 / 2) + 4.5);
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

    // 1. Rubber tire with subtle sidewall bead detail.
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    if (!sharedWheelMat) sharedWheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const tireMat = sharedWheelMat;
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    wheelGroup.add(tire);

    if (!tireSidewallMat) tireSidewallMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.7 });
    [-1, 1].forEach(side => {
      const bead = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.80, radius * 0.025, 5, 24),
        tireSidewallMat
      );
      bead.position.z = side * width * 0.36;
      wheelGroup.add(bead);
    });

    // 2. Metallic Outer Rim Lip
    const rimGeo = new THREE.CylinderGeometry(radius * 0.74, radius * 0.72, width + 0.03, 20);
    if (!alloyRimMat) {
      alloyRimMat = new THREE.MeshStandardMaterial({
        color: rimColorHex || 0xd1d5db,
        metalness: 0.85,
        roughness: 0.25
      });
    }
    const rimMat = alloyRimMat;
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
    [-1, 1].forEach(side => {
      for (let s = 0; s < 10; s++) {
        const angle = s * (Math.PI * 2 / 10);
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        const dist = radius * 0.48;
        spoke.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, side * ((width / 2) + 0.015));
        spoke.rotation.z = angle + Math.PI / 2;
        wheelGroup.add(spoke);
      }
    });

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
  function create3DVehicle(type, colorHex, appearanceId, vData) {
    if (type === 'car') {
      const car = createAerodynamicCar();
      scene.add(car);
      return car;
    }
    const appearanceSeed = getAppearanceSeed(appearanceId || type);
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
      group.userData.wheelRadius = radius;
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

    function addVehicleBeam(start, end, radius, material) {
      const from = new THREE.Vector3(start[0], start[1], start[2]);
      const to = new THREE.Vector3(end[0], end[1], end[2]);
      const direction = to.clone().sub(from);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, direction.length(), 7),
        material
      );
      beam.position.copy(from.add(to).multiplyScalar(0.5));
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      group.add(beam);
      return beam;
    }

    function addSeatedFigure(x, y, z, shirtColor, trouserColor, reaching, reachDistance = 3.8, pedalY = null) {
      const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
      const trousers = new THREE.MeshStandardMaterial({ color: trouserColor, roughness: 0.82 });
      const skin = new THREE.MeshStandardMaterial({ color: 0xb87958, roughness: 0.9 });
      const hair = new THREE.MeshStandardMaterial({ color: 0x211c1a, roughness: 0.95 });
      const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), shirt);
      torso.scale.set(1.05, 1.65, 0.9);
      torso.position.set(x, y + 2.0, z);
      group.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.92, 10, 8), skin);
      head.position.set(x + 0.2, y + 4.25, z);
      group.add(head);
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.94, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
      hairCap.position.set(x + 0.2, y + 4.42, z);
      group.add(hairCap);

      const armTarget = reaching ? [x + reachDistance, y + 2.0, z] : [x + 0.8, y + 1.3, z];
      addVehicleBeam([x + 0.2, y + 2.7, z - 0.62], armTarget, 0.34, shirt);
      addVehicleBeam([x + 0.2, y + 2.7, z + 0.62], armTarget, 0.34, shirt);
      if (pedalY !== null) {
        [-1, 1].forEach(side => {
          addVehicleBeam([x - 0.15, y + 1.15, z + side * 0.42], [x + 1.1, y - 0.2, z + side * 0.8], 0.45, trousers);
          addVehicleBeam([x + 1.1, y - 0.2, z + side * 0.8], [x + 0.2, pedalY + 0.35, side * 2.2], 0.38, trousers);
        });
        return;
      }
      addVehicleBeam([x - 0.15, y + 1.15, z - 0.42], [x + 1.15, y + 0.45, z - 0.42], 0.45, trousers);
      addVehicleBeam([x + 1.15, y + 0.45, z - 0.42], [x + 2.2, y + 0.45, z - 0.42], 0.38, trousers);
      addVehicleBeam([x - 0.15, y + 1.15, z + 0.42], [x + 1.15, y + 0.45, z + 0.42], 0.45, trousers);
      addVehicleBeam([x + 1.15, y + 0.45, z + 0.42], [x + 2.2, y + 0.45, z + 0.42], 0.38, trousers);
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

      // Dhaka Transit green accent on the red passenger body.
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

      // Red roof cap with a lighter edge above the passenger windows.
      const roofGeo = new THREE.BoxGeometry(length, 2.5, width);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.38 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 20.8;
      group.add(roof);

      const cabinGlassMat = new THREE.MeshStandardMaterial({
        color: 0x9bdcf5,
        roughness: 0.24,
        metalness: 0.12,
        transparent: true,
        opacity: 0.36,
        depthWrite: false
      });

      // Seats and riders sit behind separate large windows on both sides.
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88 });
      const passengerColors = [0xf59e0b, 0x0f766e, 0x7c3aed, 0xe11d48, 0x2563eb];
      [-25, -13, -1, 11, 23].forEach((x, index) => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.2, 13), seatMat);
        seat.position.set(x, 13.8, 0);
        group.add(seat);

        const torso = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 3.2, 3.5),
          new THREE.MeshStandardMaterial({ color: passengerColors[index], roughness: 0.82 })
        );
        torso.position.set(x, 16.1, 0);
        group.add(torso);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(1.25, 9, 7),
          new THREE.MeshStandardMaterial({ color: [0xb47b56, 0xd4a373, 0x99613d][index % 3], roughness: 0.82 })
        );
        head.position.set(x, 18.5, 0);
        group.add(head);
      });

      const windowXs = [-27, -16, -5, 6, 17, 28];
      [-1, 1].forEach(side => {
        windowXs.forEach(x => {
          const window = new THREE.Mesh(new THREE.BoxGeometry(9.4, 4.9, 0.3), cabinGlassMat);
          window.position.set(x, 16.6, side * (width / 2 + 0.12));
          group.add(window);
        });

        const lowerWindowRail = new THREE.Mesh(
          new THREE.BoxGeometry(length * 0.92, 0.55, 0.7),
          bodyMat
        );
        lowerWindowRail.position.set(0, 13.9, side * (width / 2));
        group.add(lowerWindowRail);
      });

      // Front Windshield
      const fWinGeo = new THREE.BoxGeometry(0.35, 6.6, width * 0.88);
      const fWin = new THREE.Mesh(fWinGeo, cabinGlassMat);
      fWin.position.set(length / 2 + 0.12, 16.5, 0);
      group.add(fWin);

      const driverTorso = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 3.4, 3.8),
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.82 })
      );
      driverTorso.position.set(31, 15.8, 0);
      group.add(driverTorso);
      const driverHead = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 9, 7),
        new THREE.MeshStandardMaterial({ color: 0xb87958, roughness: 0.82 })
      );
      driverHead.position.set(31, 18.4, 0);
      group.add(driverHead);

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

      // Bangladesh-style green auto-rickshaw body and enclosed passenger cabin.
      const bodyGeo = new THREE.BoxGeometry(20, 4.0, width - 1);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x159447, roughness: 0.45 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(-2, 4.2, 0);
      body.castShadow = true;
      group.add(body);

      const yellowTrimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42 });
      const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 0.3), yellowTrimMat);
      [-1, 1].forEach(side => {
        const stripe = sideStripe.clone();
        stripe.position.set(-2, 7.1, side * (width / 2 + 0.08));
        group.add(stripe);
      });

      // Passenger bench and driver seating.
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

      // Flat covered roof leaves the side openings clear so riders remain visible.
      const roofGeo = new THREE.BoxGeometry(22, 1.5, width);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x176b38, roughness: 0.58 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(-2, 13.2, 0);
      group.add(roof);
      const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(22.5, 0.55, width + 0.5), yellowTrimMat);
      roofTrim.position.set(-2, 12.35, 0);
      group.add(roofTrim);

      // Yellow brow and dark front glass.
      const visorGeo = new THREE.BoxGeometry(2.0, 0.8, width - 1.2);
      const visor = new THREE.Mesh(visorGeo, yellowTrimMat);
      visor.position.set(8.2, 12.8, 0);
      group.add(visor);

      // Tinted windshield and side windows.
      const winGeo = new THREE.BoxGeometry(1.2, 5.6, width - 2.5);
      const winMat = new THREE.MeshStandardMaterial({
        color: 0xa5dfec,
        roughness: 0.24,
        metalness: 0.15,
        transparent: true,
        opacity: 0.28,
        depthWrite: false
      });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(7.0, 10.2, 0);
      group.add(win);

      [-1, 1].forEach(side => {
        const sideWindowGeo = new THREE.BoxGeometry(12.5, 4.5, 0.24);
        const sideWindow = new THREE.Mesh(sideWindowGeo, winMat);
        sideWindow.position.set(-2, 10.1, side * (width / 2 + 0.1));
        group.add(sideWindow);

        const pillarGeo = new THREE.BoxGeometry(0.8, 5.4, 0.65);
        [-8, -2.2, 3.8].forEach(x => {
          const pillar = new THREE.Mesh(pillarGeo, bodyMat);
          pillar.position.set(x, 10.0, side * (width / 2 + 0.15));
          group.add(pillar);
        });

        const yellowDoor = new THREE.Mesh(new THREE.BoxGeometry(4.0, 3.6, 0.34), yellowTrimMat);
        yellowDoor.position.set(-5.3, 5.0, side * (width / 2 + 0.15));
        group.add(yellowDoor);
      });

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

      // Driver and front round headlamp.
      const driverShirts = [0xe7e5df, 0x166534, 0x7c2d12, 0x1d4ed8];
      const driverTrousers = [0x303743, 0x292524, 0x334155, 0x44403c];
      addSeatedFigure(
        2.2,
        5.7,
        0,
        driverShirts[appearanceSeed % driverShirts.length],
        driverTrousers[(appearanceSeed >>> 3) % driverTrousers.length],
        true
      );
      const passengerShirts = [0xeab308, 0xdb2777];
      passengerShirts.forEach((shirtColor, index) => {
        addSeatedFigure(
          index === 0 ? -9.0 : -3.5,
          5.5,
          2.8,
          shirtColor,
          index === 0 ? 0x334155 : 0x1f2937,
          false
        );
      });
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
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x202431, metalness: 0.72, roughness: 0.32 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd9e4ff, metalness: 0.78, roughness: 0.24 });
      const blackRubber = new THREE.MeshStandardMaterial({ color: 0x11131b, roughness: 0.88 });
      const turquoise = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.38, metalness: 0.12 });
      const turquoiseLight = new THREE.MeshStandardMaterial({ color: 0x5eead4, roughness: 0.4 });
      const orange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42, metalness: 0.12 });
      const orangeLight = new THREE.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.4 });
      const magenta = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.42, emissive: 0x4a102b, emissiveIntensity: 0.24 });

      function addBeam(parent, start, end, radius, material, segments = 8) {
        const from = new THREE.Vector3(start[0], start[1], start[2]);
        const to = new THREE.Vector3(end[0], end[1], end[2]);
        const direction = to.clone().sub(from);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, direction.length(), segments),
          material
        );
        beam.position.copy(from.add(to).multiplyScalar(0.5));
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        parent.add(beam);
        return beam;
      }

      function addBlockLimb(parent, start, end, width, depth, material) {
        const from = new THREE.Vector3(start[0], start[1], start[2]);
        const to = new THREE.Vector3(end[0], end[1], end[2]);
        const direction = to.clone().sub(from);
        const limb = new THREE.Mesh(
          new THREE.BoxGeometry(width, direction.length(), depth),
          material
        );
        limb.position.copy(from.add(to).multiplyScalar(0.5));
        limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
        parent.add(limb);
        return limb;
      }

      function createRickshawPerson(role, outfit, position, options = {}) {
        const person = new THREE.Group();
        person.position.set(position[0], position[1], position[2]);
        const height = role === 'driver' ? 1.08 : outfit.gender === 'female' ? 1.02 : 0.94;
        person.scale.setScalar(height);
        person.userData.rickshawRole = role;
        person.userData.rickshawGender = outfit.gender || (role === 'driver' ? 'male' : 'unspecified');
        const shirt = new THREE.MeshStandardMaterial({ color: outfit.shirt, roughness: 0.68 });
        const pants = new THREE.MeshStandardMaterial({ color: outfit.pants, roughness: 0.72 });
        const skin = new THREE.MeshStandardMaterial({ color: outfit.skin || 0xd58c69, roughness: 0.78 });
        const hair = new THREE.MeshStandardMaterial({ color: 0x211c25, roughness: 0.82 });
        const shoe = new THREE.MeshStandardMaterial({ color: 0x211a23, roughness: 0.7 });
        const faceDetail = new THREE.MeshStandardMaterial({ color: 0x211821, roughness: 0.8 });
        const scarf = outfit.scarf ? new THREE.MeshStandardMaterial({ color: outfit.scarf, roughness: 0.72 }) : null;

        function box(size, at, material, rotationZ = 0) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
          mesh.position.set(at[0], at[1], at[2]);
          mesh.rotation.z = rotationZ;
          person.add(mesh);
          return mesh;
        }

        box([2.9, 4.0, 2.7], [0, 3.2, 0], shirt, role === 'driver' ? -0.12 : 0);
        box([2.35, 0.46, 2.5], [-0.05, 1.12, 0], pants);
        box([0.72, 0.8, 0.82], [0.16, 5.25, 0], skin);
        box([1.9, 2.15, 1.82], [0.24, 6.56, 0], skin);
        box([2.04, 0.62, 1.94], [-0.04, 7.76, 0], hair);
        box([0.62, 1.2, 1.88], [-0.73, 6.55, 0], hair);

        const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.45 });
        for (const side of [-1, 1]) {
          box([0.12, 0.25, 0.22], [1.205, 6.77, side * 0.48], eyeWhite);
          box([0.1, 0.19, 0.12], [1.28, 6.77, side * 0.48], faceDetail);
          box([0.15, 0.09, 0.3], [1.23, 7.02, side * 0.49], hair);
        }
        box([0.22, 0.3, 0.22], [1.33, 6.42, 0], skin);
        box([0.09, 0.1, 0.55], [1.29, 6.12, 0], faceDetail);
        if (role === 'driver' || outfit.mustache) {
          box([0.18, 0.16, 0.68], [1.31, 6.3, 0], hair);
        }

        if (scarf) {
          box([1.2, 1.6, 2.1], [-0.48, 6.82, 0], scarf);
          box([1.1, 1.75, 0.46], [0.65, 6.56, -0.91], scarf, -0.14);
          box([1.1, 1.75, 0.46], [0.65, 6.56, 0.91], scarf, -0.14);
          box([0.78, 3.2, 2.06], [-0.58, 4.42, 0], scarf, -0.12);
        }

        if (role === 'driver') {
          const pedalLegs = [];
          const handleTargets = options.handleTargets;
          for (const side of [-1, 1]) {
            const shoulder = [0.45, 4.45, side * 1.0];
            const elbow = [2.65, 3.62, side * 1.45];
            const hand = handleTargets[side < 0 ? 0 : 1];
            addBlockLimb(person, shoulder, elbow, 0.9, 0.88, shirt);
            addBlockLimb(person, elbow, hand, 0.72, 0.72, shirt);
            const glove = new THREE.MeshStandardMaterial({ color: outfit.skin || 0xd58c69, roughness: 0.74 });
            box([0.72, 0.54, 0.72], hand, glove);
          }

          for (const side of [-1, 1]) {
            const knee = side < 0 ? [2.3, 0.75, -0.88] : [1.0, 0.8, 0.85];
            const pedal = side < 0 ? [1.81, 1.7, -1.12] : [1.81, 4.9, 1.12];
            addBlockLimb(person, [-0.2, 1.55, side * 0.58], knee, 1.2, 1.1, pants);
            const shin = addBlockLimb(person, knee, pedal, 0.95, 0.9, pants);
            const shoeMesh = box([1.18, 0.56, 0.76], [pedal[0] + 0.52, pedal[1] - 0.02, pedal[2]], shoe);
            pedalLegs.push({
              knee,
              side,
              shin,
              shoe: shoeMesh,
              initialLength: shin.geometry.parameters.height
            });
          }
          person.userData.pedalLegs = pedalLegs;
        } else {
          for (const side of [-1, 1]) {
            const shoulder = [0.2, 4.42, side * 0.77];
            const elbow = [1.28, 3.25, side * 0.9];
            const hand = [2.1, 2.05, side * 0.86];
            addBlockLimb(person, shoulder, elbow, 0.72, 0.74, shirt);
            addBlockLimb(person, elbow, hand, 0.62, 0.64, skin);
            box([0.56, 0.42, 0.62], hand, skin);

            const knee = [1.3, 0.3, side * 0.72];
            const ankle = [2.15, -0.88, side * 0.72];
            addBlockLimb(person, [-0.1, 1.1, side * 0.46], knee, 1.05, 0.94, pants);
            addBlockLimb(person, knee, ankle, 0.84, 0.82, pants);
            box([1.14, 0.46, 0.74], [ankle[0] + 0.45, ankle[1] - 0.06, ankle[2]], shoe);
          }
        }
        group.add(person);
        return person;
      }

      function updatePedalingLegs(person, phase) {
        const pivot = new THREE.Vector3(1.35, 3.3, 0);
        const axis = new THREE.Vector3(0, 0, 1);
        person.userData.pedalLegs.forEach(leg => {
          const pedalTarget = new THREE.Vector3(0.46, leg.side * 1.6, leg.side * 1.12)
            .applyAxisAngle(axis, phase)
            .add(pivot)
            .sub(person.position);
          const knee = new THREE.Vector3(leg.knee[0], leg.knee[1], leg.knee[2]);
          const direction = pedalTarget.clone().sub(knee);
          leg.shin.position.copy(knee).add(pedalTarget).multiplyScalar(0.5);
          leg.shin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
          leg.shin.scale.y = direction.length() / leg.initialLength;
          leg.shoe.position.set(pedalTarget.x + 0.52, pedalTarget.y - 0.02, pedalTarget.z);
        });
      }

      function createSpokedWheel(radius, width, position) {
        const wheel = new THREE.Group();
        wheel.position.set(position[0], position[1], position[2]);
        group.userData.wheelRadius = radius;
        const tire = new THREE.Mesh(
          new THREE.TorusGeometry(radius, width * 0.72, 10, 28),
          blackRubber
        );
        wheel.add(tire);
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(radius - width * 0.72, 0.075, 6, 28),
          chromeMat
        );
        wheel.add(rim);

        const spokeCount = 18;
        const spokeGeometry = new THREE.CylinderGeometry(0.045, 0.045, 1, 5);
        const spokes = new THREE.InstancedMesh(spokeGeometry, chromeMat, spokeCount * 2);
        const spokeMatrix = new THREE.Matrix4();
        const spokePosition = new THREE.Vector3();
        const spokeRotation = new THREE.Quaternion();
        const spokeScale = new THREE.Vector3(1, 1, 1);
        let spokeIndex = 0;
        for (let spoke = 0; spoke < spokeCount; spoke++) {
          const angle = spoke * Math.PI * 2 / spokeCount;
          const endpoint = [
            Math.cos(angle) * (radius - width * 0.9),
            Math.sin(angle) * (radius - width * 0.9),
            0
          ];
          for (const side of [-1, 1]) {
            const from = new THREE.Vector3(0, 0, side * 0.13);
            const to = new THREE.Vector3(endpoint[0], endpoint[1], side * 0.13);
            const direction = to.clone().sub(from);
            spokePosition.copy(from).add(to).multiplyScalar(0.5);
            spokeRotation.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
            spokeScale.y = direction.length();
            spokeMatrix.compose(spokePosition, spokeRotation, spokeScale);
            spokes.setMatrixAt(spokeIndex++, spokeMatrix);
          }
        }
        spokes.instanceMatrix.needsUpdate = true;
        wheel.add(spokes);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.48, 10), chromeMat);
        hub.rotation.x = Math.PI / 2;
        wheel.add(hub);
        const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.58, 8), orangeLight);
        centerCap.rotation.x = Math.PI / 2;
        wheel.add(centerCap);
        wheel.userData.rickshawWheel = true;
        group.add(wheel);
        group.userData.wheels.push(wheel);
        return wheel;
      }

      function addMudguard(centerX, centerY, centerZ, radius, side) {
        const inset = radius + 0.72;
        const points = [];
        for (let step = 0; step <= 16; step++) {
          const angle = Math.PI * step / 16;
          points.push(new THREE.Vector3(
            centerX + Math.cos(angle) * inset,
            centerY + Math.sin(angle) * inset,
            centerZ
          ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const guard = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.52, 6, false), orange);
        group.add(guard);
        const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.58), orange);
        sidePlate.position.set(centerX, centerY + radius + 0.7, centerZ + side * 0.4);
        group.add(sidePlate);
      }

      group.userData.rickshawOccupants = [];

      const frontHub = [10.5, 4.58, 0];
      const rearHub = [-7.8, 4.58, 7.3];
      const wheelRadius = 4.1;
      createSpokedWheel(wheelRadius, 0.48, frontHub);
      createSpokedWheel(wheelRadius, 0.48, [-7.8, 4.58, -7.3]);
      createSpokedWheel(wheelRadius, 0.48, rearHub);
      addMudguard(-7.8, 4.58, -7.3, wheelRadius, -1);
      addMudguard(-7.8, 4.58, 7.3, wheelRadius, 1);

      const framePoints = [
        [[10.5, 4.58, 0], [1.35, 3.3, 0]],
        [[1.35, 3.3, 0], [-1.6, 6.1, 0]],
        [[-1.6, 6.1, 0], [-7.8, 4.58, 0]],
        [[-1.6, 6.1, 0], [0.35, 6.8, 0]],
        [[1.35, 3.3, 0], [0.35, 6.8, 0]],
        [[-7.8, 4.58, -7.3], [-6.6, 7.0, -7.3]],
        [[-7.8, 4.58, 7.3], [-6.6, 7.0, 7.3]],
        [[-6.6, 7.0, -7.3], [-6.6, 7.0, 7.3]],
        [[-1.6, 6.1, 0], [-6.6, 7.0, 0]]
      ];
      framePoints.forEach(([start, end], index) => {
        addBeam(group, start, end, index < 5 ? 0.28 : 0.36, index < 5 ? frameMat : turquoiseLight);
      });

      const crank = new THREE.Group();
      crank.position.set(1.35, 3.3, 0);
      const crankAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.8, 8), chromeMat);
      crankAxle.rotation.x = Math.PI / 2;
      crank.add(crankAxle);
      for (const side of [-1, 1]) {
        const crankArm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.75, 0.34), frameMat);
        crankArm.position.set(0, side * 0.85, side * 1.12);
        crank.add(crankArm);
        const pedal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.48, 0.92), orange);
        pedal.position.set(0.46, side * 1.6, side * 1.12);
        crank.add(pedal);
      }
      group.add(crank);
      group.userData.pedalCrank = crank;

      const lowerTub = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.6, 13.6), turquoise);
      lowerTub.position.set(-6.6, 6.8, 0);
      group.add(lowerTub);
      const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(10.5, 1.7, 0.48), turquoiseLight);
      for (const side of [-1, 1]) {
        const panel = sidePanel.clone();
        panel.position.set(-6.6, 7.82, side * 6.95);
        group.add(panel);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.36, 0.55), magenta);
        rail.position.set(-6.6, 9.13, side * 7.0);
        group.add(rail);

        const ornamentColors = [orangeLight, magenta, turquoise];
        for (let motif = 0; motif < 3; motif++) {
          const x = -10.0 + motif * 3.35;
          const flower = new THREE.Mesh(
            new THREE.TorusGeometry(0.72, 0.12, 5, 10),
            ornamentColors[motif]
          );
          flower.position.set(x, 7.82, side * 7.22);
          if (side < 0) flower.rotation.y = Math.PI;
          group.add(flower);
          const jewel = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.36, 0),
            motif === 1 ? orangeLight : magenta
          );
          jewel.position.set(x, 7.82, side * 7.28);
          group.add(jewel);
        }
      }
      const rearPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 13.7), orange);
      rearPanel.position.set(-12.75, 8.05, 0);
      group.add(rearPanel);

      const benchBase = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.8, 12.6), turquoiseLight);
      benchBase.position.set(-6.8, 8.55, 0);
      group.add(benchBase);
      const benchCushion = new THREE.Mesh(
        new THREE.BoxGeometry(8.7, 0.55, 11.8),
        new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.7 })
      );
      benchCushion.position.set(-6.7, 9.16, 0);
      group.add(benchCushion);
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.05, 4.0, 12.8), orange);
      backrest.position.set(-11.65, 10.1, 0);
      group.add(backrest);
      const backrestInset = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.1, 11.4), turquoise);
      backrestInset.position.set(-11.08, 10.14, 0);
      group.add(backrestInset);

      const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 3.4), blackRubber);
      driverSeat.position.set(0.2, 6.65, 0);
      group.add(driverSeat);
      const seatPost = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.3, 0.5), frameMat);
      seatPost.position.set(-0.2, 5.7, 0);
      group.add(seatPost);

      const steeringPivot = [8.8, 8.9, 0];
      addBeam(group, [10.3, 4.75, -1.1], steeringPivot, 0.34, chromeMat);
      addBeam(group, [10.3, 4.75, 1.1], steeringPivot, 0.34, frameMat);
      const handleTargets = [
        [8.25, 9.25, -2.5],
        [8.25, 9.25, 2.5]
      ];
      addBeam(group, handleTargets[0], handleTargets[1], 0.3, chromeMat);
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x16141c, roughness: 0.8 });
      handleTargets.forEach(target => {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.48, 0.72), gripMat);
        grip.position.set(target[0], target[1], target[2]);
        group.add(grip);
      });
      const headlight = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 0.8, 10),
        vehicleHeadlightMat
      );
      headlight.rotation.x = Math.PI / 2;
      headlight.position.set(9.05, 7.15, 0);
      group.add(headlight);

      const driver = createRickshawPerson('driver', {
        shirt: 0x7625a9,
        pants: 0x4549df,
        skin: 0xe9a17c,
        gender: 'male',
        mustache: true
      }, [0.15, 5.25, 0], { handleTargets: handleTargets.map(point => [point[0] - 0.15, point[1] - 5.25, point[2]]) });
      group.userData.rickshawOccupants.push(driver);
      group.userData.updatePedaling = phase => updatePedalingLegs(driver, phase);
      group.userData.updatePedaling(0);

      const malePassenger = createRickshawPerson('passenger', {
        shirt: 0x7432b3,
        pants: 0x168be0,
        skin: 0xe9a17c,
        gender: 'male',
        mustache: true
      }, [-7.6, 8.65, -3.2]);
      const femalePassenger = createRickshawPerson('passenger', {
        shirt: 0xf28a1c,
        pants: 0x36b7d5,
        skin: 0xeeb38d,
        scarf: 0xffa51e,
        gender: 'female'
      }, [-7.6, 8.65, 3.2]);
      group.userData.rickshawOccupants.push(malePassenger, femalePassenger);

      const canopyBaseY = 12.8;
      const canopyCenterX = -6.0;
      const canopyRadiusX = 7.4;
      const canopyRadiusY = 7.0;
      const canopyHalfWidth = 8.2;
      const canopyPalette = [
        0x075be8, 0x0879ff, 0x1264f5, 0x1997ff, 0x064bd1, 0x1685f3
      ];
      const canopySegments = 12;
      const canopyPositions = [];
      const canopyColors = [];
      const canopyIndices = [];
      for (let segment = 0; segment < canopySegments; segment++) {
        const start = Math.PI * segment / canopySegments;
        const end = Math.PI * (segment + 1) / canopySegments;
        const vertices = [
          canopyCenterX + Math.cos(start) * canopyRadiusX, canopyBaseY + Math.sin(start) * canopyRadiusY, -canopyHalfWidth,
          canopyCenterX + Math.cos(end) * canopyRadiusX, canopyBaseY + Math.sin(end) * canopyRadiusY, -canopyHalfWidth,
          canopyCenterX + Math.cos(end) * canopyRadiusX, canopyBaseY + Math.sin(end) * canopyRadiusY, canopyHalfWidth,
          canopyCenterX + Math.cos(start) * canopyRadiusX, canopyBaseY + Math.sin(start) * canopyRadiusY, canopyHalfWidth
        ];
        const vertexOffset = segment * 4;
        const color = new THREE.Color(canopyPalette[segment % canopyPalette.length]);
        canopyPositions.push(...vertices);
        for (let vertex = 0; vertex < 4; vertex++) {
          canopyColors.push(color.r, color.g, color.b);
        }
        canopyIndices.push(
          vertexOffset, vertexOffset + 1, vertexOffset + 2,
          vertexOffset, vertexOffset + 2, vertexOffset + 3
        );
      }
      const canopyGeometry = new THREE.BufferGeometry();
      canopyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(canopyPositions, 3));
      canopyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(canopyColors, 3));
      canopyGeometry.setIndex(canopyIndices);
      canopyGeometry.computeVertexNormals();
      const canopy = new THREE.Mesh(
        canopyGeometry,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.36,
          metalness: 0.08,
          side: THREE.DoubleSide,
          emissive: 0x063887,
          emissiveIntensity: 0.08
        })
      );
      canopy.castShadow = true;
      group.add(canopy);
      const canopyRibMat = new THREE.MeshStandardMaterial({ color: 0x202c48, metalness: 0.62, roughness: 0.3 });
      for (let rib = 0; rib <= 6; rib++) {
        const angle = Math.PI * rib / 6;
        const points = [];
        for (let step = 0; step <= 12; step++) {
          const across = -canopyHalfWidth + 2 * canopyHalfWidth * step / 12;
          const lift = Math.sqrt(Math.max(0, 1 - (across / canopyHalfWidth) ** 2));
          points.push([
            canopyCenterX + Math.cos(angle) * canopyRadiusX,
            canopyBaseY + Math.sin(angle) * canopyRadiusY * lift,
            across
          ]);
        }
        const ribCurve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
        group.add(new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 14, 0.105, 5, false), canopyRibMat));
      }
      const canopyHem = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.55, canopyHalfWidth * 2 + 0.5),
        new THREE.MeshStandardMaterial({ color: 0x0879ff, roughness: 0.36, metalness: 0.08 })
      );
      canopyHem.position.set(canopyCenterX - canopyRadiusX, canopyBaseY, 0);
      group.add(canopyHem);

      const canopyTrimMat = new THREE.MeshStandardMaterial({ color: 0xff4fa3, roughness: 0.42, emissive: 0x4a102b, emissiveIntensity: 0.18 });
      for (const side of [-1, 1]) {
        const trimPoints = [];
        for (let step = 0; step <= canopySegments; step++) {
          const angle = Math.PI * step / canopySegments;
          trimPoints.push(new THREE.Vector3(
            canopyCenterX + Math.cos(angle) * canopyRadiusX,
            canopyBaseY + Math.sin(angle) * canopyRadiusY,
            side * (canopyHalfWidth + 0.08)
          ));
        }
        const trimCurve = new THREE.CatmullRomCurve3(trimPoints);
        group.add(new THREE.Mesh(new THREE.TubeGeometry(trimCurve, 24, 0.13, 5, false), canopyTrimMat));
      }
      const tasselMat = new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.62, emissive: 0x4a3208, emissiveIntensity: 0.12 });
      for (let tassel = 0; tassel < 9; tassel++) {
        const z = -canopyHalfWidth + 2 * canopyHalfWidth * tassel / 8;
        const fringe = new THREE.Mesh(
          new THREE.ConeGeometry(0.2, 0.75, 5),
          tasselMat
        );
        fringe.rotation.z = Math.PI;
        fringe.position.set(canopyCenterX - canopyRadiusX, canopyBaseY - 0.48, z);
        group.add(fringe);
      }

      group.userData.rickshawPedalPhase = 0;

    } else if (type === 'bike') {
      // 8 Diverse High-Contrast Bike & Biker Palettes
      // Palette 0 is an exact match to the user's reference image:
      // Crimson Red Sports Bike, Red Helmet with Silver Visor, Royal Blue T-Shirt, Denim Jeans!
      const bikePalettes = [
        { bike: 0xdc2626, helmet: 0xdc2626, shirt: 0x2563eb, pants: 0x1e3a8a, visor: 0xf1f5f9, caliper: 0xf59e0b }, // 1. Crimson & Royal Blue (Exact Match)
        { bike: 0x0284c7, helmet: 0xf8fafc, shirt: 0xf97316, pants: 0x1e293b, visor: 0xe0f2fe, caliper: 0xdc2626 }, // 2. Electric Cyan & Saffron
        { bike: 0x16a34a, helmet: 0x22c55e, shirt: 0x18181b, pants: 0x1e3a8a, visor: 0xf1f5f9, caliper: 0xfacc15 }, // 3. Kawasaki Green & Stealth Black
        { bike: 0xf59e0b, helmet: 0xf59e0b, shirt: 0xef4444, pants: 0x1e3a8a, visor: 0xe0f2fe, caliper: 0xd1d5db }, // 4. Saffron Gold & Crimson
        { bike: 0x9333ea, helmet: 0x9333ea, shirt: 0x10b981, pants: 0x334155, visor: 0xf1f5f9, caliper: 0xf59e0b }, // 5. Purple Beast & Mint
        { bike: 0xeab308, helmet: 0xfacc15, shirt: 0xf8fafc, pants: 0x0f172a, visor: 0xf8fafc, caliper: 0xdc2626 }, // 6. Cyber Yellow & White
        { bike: 0xf8fafc, helmet: 0xdc2626, shirt: 0x0284c7, pants: 0x1e3a8a, visor: 0xf1f5f9, caliper: 0xdc2626 }, // 7. Pearl White & Sky Blue
        { bike: 0x27272a, helmet: 0x18181b, shirt: 0xfacc15, pants: 0x0f172a, visor: 0xfde047, caliper: 0xdc2626 }  // 8. Matte Stealth & Gold
      ];
      const palette = bikePalettes[appearanceSeed % bikePalettes.length];
      const parseHex = (hexStr, fallback) => {
        if (!hexStr) return fallback;
        if (typeof hexStr === 'number') return hexStr;
        return parseInt(hexStr.replace('#', '0x'), 16);
      };
      const activeBikeColor = vData && vData.bikeColor ? parseHex(vData.bikeColor, palette.bike) : (colorHex || palette.bike);
      const activeHelmetColor = vData && vData.helmetColor ? parseHex(vData.helmetColor, palette.helmet) : (colorHex ? colorHex : palette.helmet);
      const activeShirtColor = vData && vData.shirtColor ? parseHex(vData.shirtColor, palette.shirt) : palette.shirt;
      const activePantsColor = vData && vData.pantsColor ? parseHex(vData.pantsColor, palette.pants) : palette.pants;
      const activeVisorColor = vData && vData.visorColor ? parseHex(vData.visorColor, palette.visor) : palette.visor;
      const activeSkinColor = vData && vData.skinColor ? parseHex(vData.skinColor, 0xdf9b76) : 0xdf9b76;

      const bikePaint = new THREE.MeshStandardMaterial({
        color: activeBikeColor,
        roughness: 0.25,
        metalness: 0.35
      });
      const darkPaint = new THREE.MeshStandardMaterial({ color: 0x090d12, roughness: 0.45, metalness: 0.2 });
      const silverMetal = new THREE.MeshStandardMaterial({ color: 0xcfd6df, roughness: 0.22, metalness: 0.85 });
      const caliperMat = new THREE.MeshStandardMaterial({ color: palette.caliper, roughness: 0.3, metalness: 0.4 });
      const windscreenMat = new THREE.MeshPhysicalMaterial({
        color: 0xbae6fd,
        roughness: 0.08,
        metalness: 0.2,
        transparent: true,
        opacity: 0.78
      });

      // Biker Materials
      const shirtMat = new THREE.MeshStandardMaterial({ color: activeShirtColor, roughness: 0.65 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: activePantsColor, roughness: 0.78 });
      const skinMat = new THREE.MeshStandardMaterial({ color: activeSkinColor, roughness: 0.8 });
      const helmetMat = new THREE.MeshStandardMaterial({ color: activeHelmetColor, roughness: 0.2, metalness: 0.15 });
      const visorMat = new THREE.MeshStandardMaterial({ color: activeVisorColor, roughness: 0.15, metalness: 0.55 });

      function addFairing(points, material, depth, bevel) {
        const shape = new THREE.Shape();
        shape.moveTo(points[0][0], points[0][1]);
        points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
        shape.closePath();
        const fairing = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: bevel,
          bevelThickness: bevel
        }), material);
        fairing.position.z = -depth / 2;
        fairing.castShadow = true;
        group.add(fairing);
        return fairing;
      }

      // 1. Aerodynamic Front Nose Cowl & Fairings
      addFairing([
        [2.0, 5.1], [3.8, 6.8], [7.2, 8.2], [11.0, 7.8],
        [12.2, 5.8], [9.8, 4.8], [6.2, 4.8], [3.8, 5.0]
      ], bikePaint, 3.6, 0.22);

      // Mid-chassis fairing
      addFairing([
        [-5.8, 5.1], [-4.6, 7.0], [-2.7, 7.55], [0.8, 7.0],
        [2.5, 5.35], [0.7, 4.85], [-3.6, 4.8]
      ], bikePaint, 3.6, 0.2);

      // Lower aero belly-pan
      addFairing([
        [-5.0, 5.25], [-3.8, 6.55], [-1.5, 6.7], [0.9, 6.1],
        [1.9, 5.25], [-0.2, 4.95], [-3.5, 4.95]
      ], darkPaint, 3.72, 0.12);

      // Front Clear Sports Windscreen
      const windscreenShape = new THREE.Shape();
      windscreenShape.moveTo(6.8, 8.1);
      windscreenShape.lineTo(9.8, 7.8);
      windscreenShape.lineTo(8.2, 10.4);
      windscreenShape.lineTo(5.8, 9.6);
      windscreenShape.closePath();
      const windscreenMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(windscreenShape, {
        depth: 2.8,
        bevelEnabled: false
      }), windscreenMat);
      windscreenMesh.position.z = -1.4;
      group.add(windscreenMesh);

      // 2. Sculpted Aerodynamic Fuel Tank with Knee Indents & Racing Filler Cap
      const tankShape = new THREE.Shape();
      tankShape.moveTo(-2.2, 7.2);
      tankShape.lineTo(-1.0, 8.8);
      tankShape.lineTo(1.8, 9.1);
      tankShape.lineTo(4.4, 8.1);
      tankShape.lineTo(4.4, 6.7);
      tankShape.lineTo(1.6, 6.6);
      tankShape.lineTo(-2.2, 7.0);
      tankShape.closePath();
      const tankMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(tankShape, {
        depth: 3.3,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: 0.28,
        bevelThickness: 0.25
      }), bikePaint);
      tankMesh.position.z = -1.65;
      group.add(tankMesh);

      // Matte Black Knee Traction Pads on Tank Sides
      [-1, 1].forEach(side => {
        const kneePad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.12), darkPaint);
        kneePad.position.set(0.6, 7.8, side * 1.95);
        kneePad.rotation.z = -0.15;
        group.add(kneePad);
      });

      // Aircraft-Style Billet Aluminum Gas Cap
      const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.14, 16), silverMetal);
      tankCap.position.set(0.8, 9.42, 0);
      group.add(tankCap);
      const tankCapBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 12), darkPaint);
      tankCapBolt.position.set(0.8, 9.44, 0);
      group.add(tankCapBolt);

      // 3. Ergonomic Contoured Rider Saddle & Upswept Pillion
      const seatShape = new THREE.Shape();
      seatShape.moveTo(-5.4, 7.4);
      seatShape.lineTo(-2.0, 7.2);
      seatShape.lineTo(-1.8, 6.6);
      seatShape.lineTo(-5.6, 6.7);
      seatShape.closePath();
      const seatMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(seatShape, {
        depth: 2.7,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.18,
        bevelThickness: 0.18
      }), darkPaint);
      seatMesh.position.z = -1.35;
      group.add(seatMesh);

      // 4. Sharply Upswept Rear Tail Cowl
      const tailShape = new THREE.Shape();
      tailShape.moveTo(-7.8, 7.2);
      tailShape.lineTo(-11.5, 8.8);
      tailShape.lineTo(-12.0, 8.0);
      tailShape.lineTo(-8.5, 6.5);
      tailShape.closePath();
      const tailCowl = new THREE.Mesh(new THREE.ExtrudeGeometry(tailShape, {
        depth: 2.4,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.15,
        bevelThickness: 0.15
      }), bikePaint);
      tailCowl.position.z = -1.2;
      group.add(tailCowl);

      // Black Rear Mudguard & License Plate Hanger
      const plateHanger = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.6, 1.4), darkPaint);
      plateHanger.position.set(-11.6, 6.6, 0);
      plateHanger.rotation.z = 0.35;
      group.add(plateHanger);

      // 5. Engine Block & Silver Crankcase Detail
      const engine = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.4, 2.8), silverMetal);
      engine.position.set(-0.2, 3.9, 0);
      group.add(engine);
      for (let fin = 0; fin < 5; fin++) {
        const coolingFin = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 3.0), darkPaint);
        coolingFin.position.set(-0.2, 2.8 + fin * 0.44, 0);
        group.add(coolingFin);
      }
      // Circular Crankcase Cover (Iconic circle visible on side of engine in image)
      [-1, 1].forEach(side => {
        const crankCover = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16), silverMetal);
        crankCover.rotation.x = Math.PI / 2;
        crankCover.position.set(0.6, 3.6, side * 1.5);
        group.add(crankCover);
        const crankCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.38, 12), darkPaint);
        crankCenter.rotation.x = Math.PI / 2;
        crankCenter.position.set(0.6, 3.6, side * 1.5);
        group.add(crankCenter);
      });

      // 6. Silver Exhaust Pipe with Upswept Muffler
      [-1, 1].forEach(side => {
        addVehicleBeam([-8.2, 3.2, side * 1.2], [-1.2, 4.6, side * 1.2], 0.24, silverMetal);
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.65, 8.0, 12), silverMetal);
        exhaust.rotation.z = Math.PI / 2 - 0.14;
        exhaust.position.set(-4.5, 2.9, side * 1.7);
        group.add(exhaust);
        const mufflerTip = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12), darkPaint);
        mufflerTip.rotation.z = Math.PI / 2 - 0.14;
        mufflerTip.position.set(-8.5, 3.5, side * 1.7);
        group.add(mufflerTip);
      });

      // 7. Alloy Sports Wheels with Ventilated Disc Rotors & Calipers
      [-8.0, 8.0].forEach((wheelX) => {
        addVehicleWheel(wheelX, 3.0, 0, 3.0, 1.1);
        [-1, 1].forEach(side => {
          // Disc Brake Rotor
          const rotor = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.16, 20), silverMetal);
          rotor.rotation.x = Math.PI / 2;
          rotor.position.set(wheelX, 3.0, side * 0.68);
          group.add(rotor);
          // Brake Caliper
          const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.28), caliperMat);
          caliper.position.set(wheelX + 1.2, 3.5, side * 0.72);
          group.add(caliper);
          // Center Wheel Hub
          const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.26, 12), darkPaint);
          hub.rotation.x = Math.PI / 2;
          hub.position.set(wheelX, 3.0, side * 0.8);
          group.add(hub);
        });
        const fender = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), bikePaint);
        fender.scale.set(3.75, 0.65, 1.25);
        fender.position.set(wheelX, 5.25, 0);
        group.add(fender);
      });

      // 8. Front Inverted Suspension Forks, Clip-On Bars & Twin Headlights
      [-1, 1].forEach(side => {
        addVehicleBeam([5.0, 8.3, side * 1.05], [8.1, 3.2, side * 0.9], 0.24, silverMetal);
        const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), darkPaint);
        mirrorStem.rotation.z = -0.45;
        mirrorStem.position.set(5.2, 10.1, side * 1.8);
        group.add(mirrorStem);
        const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 6), darkPaint);
        mirror.scale.set(0.45, 0.72, 1.2);
        mirror.position.set(5.8, 11.1, side * 2.0);
        group.add(mirror);
        const headlamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.05, 1.0), vehicleHeadlightMat);
        headlamp.position.set(11.2, 6.7, side * 0.55);
        group.add(headlamp);
      });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5.4), darkPaint);
      bar.position.set(5.2, 9.0, 0);
      group.add(bar);

      // 9. CNC BILLET ALUMINUM REARSETS (FOOTRESTS & CONTROLS ON BOTH SIDES)
      [-1, 1].forEach(side => {
        // Rearset Mounting Bracket Plate bolted to the frame behind the engine
        const rearsetPlate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.22), silverMetal);
        rearsetPlate.position.set(-2.8, 4.8, side * 1.55);
        rearsetPlate.rotation.z = 0.22;
        group.add(rearsetPlate);

        // Triangular Heel Guard (protects boot from swingarm and chain)
        const heelGuardShape = new THREE.Shape();
        heelGuardShape.moveTo(-0.7, -0.6);
        heelGuardShape.lineTo(0.7, -0.2);
        heelGuardShape.lineTo(0.3, 0.9);
        heelGuardShape.closePath();
        const heelGuard = new THREE.Mesh(new THREE.ExtrudeGeometry(heelGuardShape, {
          depth: 0.1,
          bevelEnabled: true,
          bevelSegments: 1,
          bevelSize: 0.05,
          bevelThickness: 0.05
        }), silverMetal);
        heelGuard.position.set(-3.1, 4.6, side * 1.72);
        heelGuard.rotation.y = side === 1 ? 0 : Math.PI;
        group.add(heelGuard);

        // Knurled Rider Footrest Peg extending outward on Z-axis
        const footpeg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.88, 14), silverMetal);
        footpeg.rotation.x = Math.PI / 2;
        footpeg.position.set(-2.8, 4.3, side * 2.05);
        group.add(footpeg);

        // Knurled grip grooves on the footpeg
        for (let ring = -1; ring <= 1; ring++) {
          const gripRing = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), darkPaint);
          gripRing.rotation.x = Math.PI / 2;
          gripRing.position.set(-2.8, 4.3, side * (2.05 + ring * 0.22));
          group.add(gripRing);
        }

        // Outer End Cap / Crash Slider on Footpeg tip
        const pegEndCap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 14), darkPaint);
        pegEndCap.rotation.x = Math.PI / 2;
        pegEndCap.position.set(-2.8, 4.3, side * 2.5);
        group.add(pegEndCap);

        // Foot Controls (Gear Shift Lever on Left side, Rear Brake Pedal on Right side)
        const leverArm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.14), silverMetal);
        leverArm.position.set(-2.0, 4.15, side * 1.95);
        leverArm.rotation.z = -0.15;
        group.add(leverArm);
        const toePeg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 10), darkPaint);
        toePeg.rotation.x = Math.PI / 2;
        toePeg.position.set(-1.4, 4.05, side * 2.05);
        group.add(toePeg);

        // Folded Passenger (Pillion) Rear Footpegs on Subframe
        const pillionBracket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.18), darkPaint);
        pillionBracket.position.set(-6.8, 6.2, side * 1.48);
        pillionBracket.rotation.z = 0.55;
        group.add(pillionBracket);
        const pillionPeg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 10), silverMetal);
        pillionPeg.rotation.z = 0.4;
        pillionPeg.position.set(-6.9, 6.1, side * 1.7);
        group.add(pillionPeg);
      });

      // 10. THE BIKER (RIDER) - Natural Sportbike Tuck Posture with Legs ON the Footrests
      // Pelvis / Hips firmly seated on the rider saddle
      const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 12), pantsMat);
      pelvis.scale.set(1.4, 1.15, 1.35);
      pelvis.position.set(-3.5, 7.8, 0);
      group.add(pelvis);

      // Torso leaning forward in aerodynamic racing posture (~38° tuck)
      const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 12), shirtMat);
      torso.scale.set(1.45, 2.3, 1.35);
      torso.position.set(-1.0, 9.8, 0);
      torso.rotation.z = -0.65;
      group.add(torso);

      // Head Base / Neck
      const riderNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 1.2, 10), skinMat);
      riderNeck.position.set(1.1, 11.4, 0);
      riderNeck.rotation.z = -0.3;
      group.add(riderNeck);

      // Aerodynamic Full-Face Helmet with Chin Bar & Rear Spoiler
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(1.4, 18, 14), helmetMat);
      helmet.scale.set(1.26, 1.15, 1.12);
      helmet.position.set(1.9, 12.6, 0);
      helmet.rotation.z = -0.22;
      group.add(helmet);

      // Sculpted Aerodynamic Chin Bar
      const chinBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.75, 1.7), helmetMat);
      chinBar.position.set(2.6, 12.0, 0);
      chinBar.rotation.z = -0.35;
      group.add(chinBar);

      // Aerodynamic Rear Helmet Spoiler Lip
      const helmetSpoiler = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.28, 1.5), darkPaint);
      helmetSpoiler.position.set(0.7, 13.0, 0);
      helmetSpoiler.rotation.z = 0.25;
      group.add(helmetSpoiler);

      // Tinted Aerodynamic Sports Visor with Silver Reflection Sheen
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 1.76), visorMat);
      visor.position.set(2.9, 12.55, 0);
      visor.rotation.z = -0.22;
      group.add(visor);

      // Biker Arms & Gloved Hands gripping Handlebars
      [-1, 1].forEach(side => {
        // Upper arm in T-Shirt sleeve
        addVehicleBeam([-0.6, 10.7, side * 1.2], [1.9, 10.1, side * 1.6], 0.52, shirtMat);
        // Bare forearm reaching forward to the clip-on bars
        addVehicleBeam([1.9, 10.1, side * 1.6], [4.9, 9.1, side * 1.85], 0.38, skinMat);
        // Gloved hand wrapping around handlebar grip
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.55), darkPaint);
        hand.position.set(5.0, 9.1, side * 1.85);
        group.add(hand);

        // ==============================================================
        // BIKER LEGS ON THE FOOTRESTS (Strict User Requirement)
        // ==============================================================
        // 1. Thigh: Runs forward and down from hip, snugly hugging the tank
        addVehicleBeam([-3.2, 7.6, side * 0.95], [-0.8, 6.1, side * 1.68], 0.58, pantsMat);

        // 2. Knee Joint: Formed at the front of the tank with knee slider puck
        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), pantsMat);
        knee.position.set(-0.8, 6.1, side * 1.68);
        group.add(knee);
        const kneeSlider = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.18), darkPaint);
        kneeSlider.position.set(-0.8, 6.0, side * (1.68 + 0.52));
        kneeSlider.rotation.z = -0.3;
        group.add(kneeSlider);

        // 3. Shin / Calf: Angles BACKWARD and DOWNWARD directly to the footrest peg!
        addVehicleBeam([-0.8, 6.1, side * 1.68], [-2.8, 4.7, side * 1.95], 0.50, pantsMat);

        // 4. Ankle Joint
        const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), darkPaint);
        ankle.position.set(-2.8, 4.7, side * 1.95);
        group.add(ankle);

        // 5. Riding Boot: Firmly planted on the footrest peg!
        // Sole rests right on the knurled footpeg at X = -2.8, Y = 4.3!
        const bootGroup = new THREE.Group();
        bootGroup.position.set(-2.3, 4.45, side * 2.05);

        // Boot Main Upper
        const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.75), darkPaint);
        bootUpper.position.set(-0.15, 0.28, 0);
        bootUpper.rotation.z = -0.12;
        bootGroup.add(bootUpper);

        // High-Traction Rubber Boot Sole
        const bootSole = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.24, 0.78), new THREE.MeshStandardMaterial({
          color: 0x111317,
          roughness: 0.9
        }));
        bootSole.position.set(-0.15, -0.12, 0);
        bootSole.rotation.z = -0.12;
        bootGroup.add(bootSole);

        // Boot Heel Block (Locks onto the rear of the footpeg)
        const bootHeel = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.35, 0.76), new THREE.MeshStandardMaterial({
          color: 0x171923,
          roughness: 0.85
        }));
        bootHeel.position.set(-0.7, -0.25, 0);
        bootGroup.add(bootHeel);

        // Racing Toe-Slider on Outer Edge of Boot
        const toeSlider = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.16), silverMetal);
        toeSlider.position.set(0.65, -0.05, side * 0.36);
        bootGroup.add(toeSlider);

        group.add(bootGroup);
      });

      // 11. Glowing Ruby Red LED Taillight at Rear Tip
      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 2.0), vehicleTaillightMat);
      tailLight.position.set(-12.1, 8.2, 0);
      group.add(tailLight);
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

      if (Math.abs(pos[0]) === 135 && Math.abs(pos[2]) === 100) {
        const streetGlow = new THREE.PointLight(0xffbd66, 1.25, 135, 2);
        streetGlow.position.set(pos[0], 24, pos[2]);
        cornerPointLights.push(streetGlow);
        scene.add(streetGlow);
      }
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
      wallColor: '#8da6b6', sideColor: '#405966',
      floors: 6, cols: 2, winColor: '#f3ddb0',
      antenna: true
    });

    const nwComplex = create3DBuilding({
      x: -360, z: -210, width: 200, depth: 65, height: 90,
      wallColor: '#b97863', sideColor: '#633f38',
      floors: 4, cols: 6, winColor: '#f1d9a8',
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
      wallColor: '#6f9887', sideColor: '#3e5b53',
      floors: 5, cols: 3, winColor: '#f2dfb6',
      waterTank: true, antenna: true
    });

    create3DBuilding({
      x: -150, z: -205, width: 68, depth: 55, height: 95,
      wallColor: '#bba77e', sideColor: '#62563f',
      floors: 4, cols: 3, winColor: '#f4dfaa',
      antenna: true,
      signboard: { text: 'ঢাকা বুক ডিপো', sub: 'Book Depot', bg: '#0f172a', textCol: '#ffffff', border: '#fbbf24', w: 62, h: 16, y: 14 }
    });

    // Northeast Quadrant
    create3DBuilding({
      x: 150, z: -205, width: 68, depth: 55, height: 95,
      wallColor: '#8e829b', sideColor: '#51495e',
      floors: 4, cols: 3, winColor: '#ead9bd',
      antenna: true,
      signboard: { text: 'ফ্যাশন কর্নার', sub: 'Fashion Corner', bg: '#0f172a', textCol: '#ffffff', border: '#d946ef', w: 62, h: 16, y: 14, awnCol: 0x701a75 }
    });

    create3DBuilding({
      x: 230, z: -210, width: 75, depth: 60, height: 100,
      wallColor: '#5d8d89', sideColor: '#344f50',
      floors: 4, cols: 3, winColor: '#e9dbb9',
      waterTank: true,
      signboard: { text: 'বাংলা টেক', sub: 'Bangla Tech', bg: '#0f172a', textCol: '#00f2fe', border: '#00f2fe', w: 68, h: 16, y: 14, awnCol: 0x0f766e }
    });

    create3DBuilding({
      x: 315, z: -215, width: 85, depth: 60, height: 115,
      wallColor: '#ad7180', sideColor: '#5d3d4a',
      floors: 5, cols: 4, winColor: '#f3d9aa',
      waterTank: true, antenna: true,
      signboard: { text: 'সুপার শপ', sub: 'Super Shop', bg: '#0f172a', textCol: '#fef08a', border: '#ff2a54', w: 76, h: 16, y: 14, awnCol: 0xbe123c }
    });

    // NE-4 Mirpur Plaza Landmark High-Rise
    const plaza = create3DBuilding({
      x: 430, z: -200, width: 130, depth: 75, height: 135,
      wallColor: '#728ca8', sideColor: '#3d5067',
      floors: 6, cols: 5, winColor: '#eeddbb',
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
      wallColor: '#b98983', sideColor: '#604745',
      floors: 4, cols: 2, winColor: '#f2d9a9'
    });

    create3DBuilding({
      x: -360, z: 185, width: 200, depth: 65, height: 80,
      wallColor: '#8c9870', sideColor: '#4d5744',
      floors: 3, cols: 6, winColor: '#f0dcb0',
      waterTank: true, antenna: true
    });

    create3DBuilding({
      x: -225, z: 180, width: 75, depth: 55, height: 85,
      wallColor: '#8f8067', sideColor: '#534b3e',
      floors: 3, cols: 3, winColor: '#f1dda9',
      antenna: true,
      signboard: { text: 'চায়ের টং', sub: 'Traditional Tea Stall', bg: '#78350f', textCol: '#fef08a', border: '#fbbf24', w: 68, h: 16, y: 14, awnCol: 0xb45309 }
    });

    create3DBuilding({
      x: -150, z: 175, width: 75, depth: 55, height: 82,
      wallColor: '#bd9a5c', sideColor: '#665334',
      floors: 3, cols: 3, winColor: '#f4dfaa',
      waterTank: true,
      signboard: { text: 'সোনালী জুয়েলার্স', sub: 'Sonali Jewelers', bg: '#0f172a', textCol: '#fde047', border: '#fbbf24', w: 68, h: 16, y: 14, awnCol: 0xb45309 }
    });

    // Southeast Quadrant
    create3DBuilding({
      x: 165, z: 175, width: 110, depth: 60, height: 85,
      wallColor: '#9b7c88', sideColor: '#584650',
      floors: 3, cols: 4, winColor: '#f0dcad',
      antenna: true,
      signboard: { text: 'জনতা ফার্মেসি ✚', sub: 'Clinic & Medicine', bg: '#065f46', textCol: '#ffffff', border: '#10b981', w: 100, h: 16, y: 14, awnCol: 0x047857 }
    });

    const seBillboardBldg = create3DBuilding({
      x: 320, z: 185, width: 180, depth: 65, height: 85,
      wallColor: '#657d95', sideColor: '#354454',
      floors: 3, cols: 5, winColor: '#efdbb2',
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
      wallColor: '#769aa0', sideColor: '#40565d',
      floors: 4, cols: 2, winColor: '#f0ddb3',
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
        const colorHex = (v.color || v.bikeColor) ? parseInt((v.bikeColor || v.color).replace('#', '0x'), 16) : null;
        const mesh = create3DVehicle(v.type, colorHex, v.id, v);
        mesh.rotation.y = getHeading(v.dir);
        mesh.userData.previousRoadPosition = v.pos;
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
    containerEl.addEventListener('pointermove', (e) => {
      const rect = containerEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseRelX = (e.clientX - rect.left) / rect.width - 0.5;
      mouseRelY = (e.clientY - rect.top) / rect.height - 0.5;

      if (e.pointerType === 'mouse' && orbitPointerId === null &&
          isOrbitableVehicleMode(activeCamMode) && activeTargetVehicle) {
        vehicleOrbitYaw = 2.0 + mouseRelX * Math.PI * 2;
        vehicleOrbitPitch = Math.max(-0.25, Math.min(0.85, 0.2 - mouseRelY * 0.9));
      }

      if (e.pointerId === orbitPointerId && activeTargetVehicle) {
        vehicleOrbitYaw -= (e.clientX - lastOrbitPointerX) * 0.012;
        vehicleOrbitPitch = Math.max(-0.25, Math.min(0.85,
          vehicleOrbitPitch + (e.clientY - lastOrbitPointerY) * 0.006));
        lastOrbitPointerX = e.clientX;
        lastOrbitPointerY = e.clientY;
      }
    }, { passive: true });

    containerEl.addEventListener('pointerleave', () => {
      mouseRelX = 0;
      mouseRelY = 0;
    }, { passive: true });

    canvasEl.style.touchAction = 'auto';
    canvasEl.addEventListener('pointerdown', (e) => {
      if (!isOrbitableVehicleMode(activeCamMode)) return;
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      if (!activeTargetVehicle) activeTargetVehicle = acquireTargetVehicle(activeCamMode);
      if (!activeTargetVehicle) return;

      e.preventDefault();
      orbitPointerId = e.pointerId;
      lastOrbitPointerX = e.clientX;
      lastOrbitPointerY = e.clientY;
      canvasEl.setPointerCapture(e.pointerId);
    });

    const endVehicleOrbit = (e) => {
      if (e.pointerId !== orbitPointerId) return;
      orbitPointerId = null;
      if (canvasEl.hasPointerCapture(e.pointerId)) {
        canvasEl.releasePointerCapture(e.pointerId);
      }
    };
    canvasEl.addEventListener('pointerup', endVehicleOrbit);
    canvasEl.addEventListener('pointercancel', endVehicleOrbit);
    canvasEl.addEventListener('lostpointercapture', (e) => {
      if (e.pointerId === orbitPointerId) orbitPointerId = null;
    });
    canvasEl.addEventListener('contextmenu', (e) => {
      if (isOrbitableVehicleMode(activeCamMode)) e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      if (!isOrbitableVehicleMode(activeCamMode) || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      const target = e.target;
      if (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (!activeTargetVehicle) activeTargetVehicle = acquireTargetVehicle(activeCamMode);
      if (!activeTargetVehicle) return;

      e.preventDefault();
      vehicleOrbitYaw += e.key === 'ArrowLeft' ? Math.PI / 4 : -Math.PI / 4;
    });

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
      textures: renderer && renderer.info ? renderer.info.memory.textures : 0,
      focusedVehicle: activeTargetVehicle
        ? { type: activeTargetVehicle.type, direction: activeTargetVehicle.data?.dir || activeTargetVehicle.dir || null }
        : null,
      cameraPosition: camera
        ? {
            x: parseFloat(camera.position.x.toFixed(1)),
            y: parseFloat(camera.position.y.toFixed(1)),
            z: parseFloat(camera.position.z.toFixed(1))
          }
        : null
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
      // Roll wheels by the distance the vehicle actually travelled this frame.
      if (vm.mesh.userData && vm.mesh.userData.wheels) {
        const previousPosition = vm.mesh.userData.previousRoadPosition;
        const roadDelta = Number.isFinite(previousPosition) ? v.pos - previousPosition : 0;
        vm.mesh.userData.previousRoadPosition = v.pos;
        const forwardDelta = (v.dir === 'EB' || v.dir === 'SB') ? roadDelta : -roadDelta;
        const wheelRadius = vm.mesh.userData.wheelRadius || 3;
        const rollAngle = Math.abs(forwardDelta) < 100 ? forwardDelta / wheelRadius : 0;
        vm.mesh.userData.wheels.forEach(w => {
          w.rotation.z += rollAngle;
        });
        if (vm.mesh.userData.pedalCrank) {
          vm.mesh.userData.pedalCrank.rotation.z -= Math.abs(rollAngle) * 0.72;
          if (vm.mesh.userData.updatePedaling) {
            vm.mesh.userData.updatePedaling(vm.mesh.userData.pedalCrank.rotation.z);
          }
        }
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
          rotY = (p.dirForward !== false) ? Math.PI / 2 : -Math.PI / 2;
        } else {
          posX = p.x - 600;
          posZ = coord - 420;
          rotY = (p.dirForward !== false) ? 0 : Math.PI;
        }
      } else {
        // Crosswalk pedestrian
        coord = (typeof p.currentCoord !== 'undefined') ? p.currentCoord : p.start;
        isMoving = Math.abs(coord - p.start) > 2;
        if (p.axis === 'H') {
          posX = coord - 600;
          posZ = p.y - 420;
          rotY = (p.end > p.start) ? Math.PI / 2 : -Math.PI / 2;
        } else {
          posX = p.x - 600;
          posZ = coord - 420;
          rotY = (p.end > p.start) ? 0 : Math.PI;
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
      if (!activeTargetVehicle) {
        activeTargetVehicle = acquireTargetVehicle(activeCamMode);
        if (activeTargetVehicle) updateCameraModeBadge(activeCamMode);
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
        const pose = getVehicleOrbitPose(activeTargetVehicle);
        desiredCamPos = pose.position;
        desiredCamLook = pose.look;
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
