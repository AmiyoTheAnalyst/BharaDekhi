/**
 * Bhara dekhi — Dhaka Mirpur 10 Crossroads
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
  let sunLight, ambientLight, hemiLight, chaseCamLight;
  let cornerPointLights = [];
  let trainGroup, boardingBadgeMesh;
  let ambulanceGroup, ambStrobeRed, ambStrobeBlue;
  let signalLamps = {
    nw: {}, ne: {}, sw: {}, se: {}
  };
  let vehicleMeshMap = {};
  let pedMeshMap = {};
  let rainParticles = null;
  const gltfModelPromises = {};

  // Camera & Mouse control
  let mouseRelX = 0, mouseRelY = 0;
  const DEFAULT_VEHICLE_YAW = 2.35;
  let vehicleOrbitYaw = DEFAULT_VEHICLE_YAW;
  let vehicleOrbitPitch = 0.28;
  let orbitPointerId = null;
  let lastOrbitPointerX = 0;
  let lastOrbitPointerY = 0;
  let buildingNameCounter = 0;
  const ORBITABLE_VEHICLE_MODES = ['bus', 'bike', 'cng', 'car', 'rickshaw'];
  let targetCamX = 220, targetCamY = 460;
  const CAM_DEFAULT_POS = { x: 220, y: 460, z: 460 };
  const CAM_DEFAULT_LOOK = { x: 0, y: 20, z: -30 };
  const VIADUCT_Z = -332;
  let camBasePos = { x: 220, y: 460, z: 460 };
  let camBaseLook = { x: 0, y: 20, z: -30 };
  let currentCamLook = { x: 0, y: 20, z: -30 };
  let idleDroneTime = 0;

  // Multimodal Camera Choreography Presets
  const CAM_MODES = {
    overview: {
      pos: { x: 220, y: 460, z: 460 },
      look: { x: 0, y: 20, z: -30 },
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
    const targetX = position.x;
    const targetY = position.y + (target.type === 'bike' ? 4.5 : target.type === 'bus' ? 9.5 : target.type === 'car' ? 4.5 : 5.5);
    const targetZ = position.z;

    return {
      position: {
        x: targetX - forward.x * horizontalRadius * Math.cos(yaw) + right.x * horizontalRadius * Math.sin(yaw),
        y: targetY + radius * Math.sin(pitch),
        z: targetZ - forward.z * horizontalRadius * Math.cos(yaw) + right.z * horizontalRadius * Math.sin(yaw)
      },
      look: {
        x: targetX,
        y: targetY + (target.type === 'bus' ? 2.0 : 1.0),
        z: targetZ
      }
    };
  }

  function getVehicleOrbitPose(target) {
    const yaw = vehicleOrbitYaw;
    const pitch = Math.max(0.12, Math.min(0.55, vehicleOrbitPitch));
    const baseRadius = target.type === 'car' ? 52
      : target.type === 'bike' ? 36
        : target.type === 'rickshaw' ? 38
          : target.type === 'cng' ? 40
            : 96;
    const horizontalCoverage = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const desktopCoverage = Math.tan(THREE.MathUtils.degToRad(38 / 2)) * 1.6;
    const framingScale = horizontalCoverage > 0 ? Math.max(1, desktopCoverage / horizontalCoverage) : 1;

    return getVehicleCameraPose(target, yaw, baseRadius * framingScale, pitch);
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
    vehicleOrbitYaw = DEFAULT_VEHICLE_YAW;
    vehicleOrbitPitch = 0.28;

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
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      currentCamLook.x = pose.look.x;
      currentCamLook.y = pose.look.y;
      currentCamLook.z = pose.look.z;
      camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
      focusCamera(pose.position, pose.look, 0.3);
    } else {
      focusCamera(CAM_MODES[targetMode].pos, CAM_MODES[targetMode].look, 1.2);
    }
    updateLegendHUD(targetMode);
  };

  window.crossroadsResetCamera = function() {
    scrollProgressCameraActive = false;
    window.crossroadsFocusMode('overview');
  };

  window.crossroadsSetOrbit = function(yaw, pitch) {
    if (yaw !== undefined) vehicleOrbitYaw = yaw;
    if (pitch !== undefined) vehicleOrbitPitch = pitch;
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

  // Builds a single, continuous, gap-free organic mesh along 3D control points with varying radii
  function createSeamlessLoftedLimb(stations, tubularSegments, radialSegments, material) {
    const pts = stations.map(s => new THREE.Vector3(s.p[0], s.p[1], s.p[2]));
    const curve = new THREE.CatmullRomCurve3(pts);
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    function sampleProfile(t) {
      const scaled = t * (stations.length - 1);
      const idx = Math.min(Math.floor(scaled), stations.length - 2);
      const frac = scaled - idx;
      const s0 = stations[idx];
      const s1 = stations[idx + 1];
      return {
        rx: s0.rx + (s1.rx - s0.rx) * frac,
        ry: (s0.ry || s0.rx) + ((s1.ry || s1.rx) - (s0.ry || s0.rx)) * frac
      };
    }

    let prevT = curve.getTangent(0).normalize();
    let normal = Math.abs(prevT.y) > 0.9
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    let binormal = new THREE.Vector3().crossVectors(prevT, normal).normalize();
    normal.crossVectors(binormal, prevT).normalize();
    const rotQuat = new THREE.Quaternion();

    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments;
      const center = curve.getPoint(u);
      const curT = curve.getTangent(u).normalize();
      if (i > 0) {
        rotQuat.setFromUnitVectors(prevT, curT);
        normal.applyQuaternion(rotQuat).normalize();
        binormal.crossVectors(curT, normal).normalize();
        prevT.copy(curT);
      }
      const prof = sampleProfile(u);
      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * Math.PI * 2;
        const cosV = Math.cos(v);
        const sinV = Math.sin(v);
        const offset = new THREE.Vector3()
          .addScaledVector(normal, cosV * prof.rx)
          .addScaledVector(binormal, sinV * prof.ry);
        const vx = center.x + offset.x;
        const vy = center.y + offset.y;
        const vz = center.z + offset.z;
        positions.push(vx, vy, vz);
        offset.normalize();
        normals.push(offset.x, offset.y, offset.z);
        uvs.push(j / radialSegments, u);
      }
    }

    const ringStride = radialSegments + 1;
    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * ringStride + j;
        const b = (i + 1) * ringStride + j;
        const c = (i + 1) * ringStride + (j + 1);
        const d = i * ringStride + (j + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    return mesh;
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
      { top: 0xf8fafc, bottom: 0xe2e8f0, hair: 0x1e293b, panjabi: true, shoe: 0x18181b },
      { top: 0x1e3a8a, bottom: 0xf1f5f9, hair: 0x0f172a, panjabi: true, shoe: 0x27272a },
      { top: 0xdc2626, bottom: 0xb91c1c, hair: 0x18181b, saree: true, gold: 0xfacc15, shoe: 0x451a03 },
      { top: 0x059669, bottom: 0x047857, hair: 0x1e293b, salwar: true, scarf: true, shoe: 0x334155 },
      { top: 0x0284c7, bottom: 0x1e293b, hair: 0x18181b, polo: true, shoe: 0xf8fafc },
      { top: 0x374151, bottom: 0x1f2937, hair: 0x090d16, hoodie: true, shoe: 0xe11d48 },
      { top: 0xdb2777, bottom: 0xf8fafc, hair: 0x18181b, kurti: true, scarf: true, shoe: 0xd97706 },
      { top: 0x38bdf8, bottom: 0x334155, hair: 0x1c1917, executive: true, shoe: 0x18181b }
    ];
    const outfit = outfits[styleIdx];
    const topColor = outfit.top;
    const bottomColor = outfit.bottom;
    const hairColor = outfit.hair;

    const topMat = new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.6 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: bottomColor, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: outfit.shoe || 0xf8fafc, roughness: 0.4 });
    const goldMat = new THREE.MeshStandardMaterial({ color: outfit.gold || 0xfacc15, roughness: 0.35, metalness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });

    // 1. Hips / Pelvis
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.1), bottomMat);
    pelvis.position.y = 5.2;
    group.add(pelvis);

    // 2. Sculpted Torso & Authentic Dhaka Clothing
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.6, 1.3), topMat);
    torso.position.y = 7.0;
    group.add(torso);

    if (outfit.panjabi) {
      // Long knee-length Panjabi tunic with side slits and mandarin collar
      const tunic = new THREE.Mesh(new THREE.BoxGeometry(2.45, 3.8, 1.42), topMat);
      tunic.position.y = 5.5;
      group.add(tunic);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.45, 12), topMat);
      collar.position.y = 8.5;
      group.add(collar);
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 0.15), goldMat);
      placket.position.set(0, 7.2, 0.72);
      group.add(placket);
    } else if (outfit.saree) {
      // Graceful Bengali Saree with draped pallu over shoulder & golden hem
      const sareeDrape = new THREE.Mesh(new THREE.BoxGeometry(2.65, 3.2, 1.45), topMat);
      sareeDrape.position.y = 6.2;
      group.add(sareeDrape);
      const pallu = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.5, 0.32), goldMat);
      pallu.position.set(0.35, 6.8, 0.72);
      pallu.rotation.z = -0.22;
      group.add(pallu);
      const sareeBorder = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.35, 1.48), goldMat);
      sareeBorder.position.y = 4.4;
      group.add(sareeBorder);
    } else if (outfit.salwar || outfit.kurti) {
      // Salwar Kameez / Kurti with draped dupatta scarf
      const tunic = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.4, 1.38), topMat);
      tunic.position.y = 5.8;
      group.add(tunic);
      const dupatta = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.2, 0.35), goldMat);
      dupatta.position.set(0, 7.4, 0.72);
      group.add(dupatta);
    } else if (outfit.hoodie) {
      // Modern Streetwear Hoodie with front kangaroo pocket
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.35), bottomMat);
      pocket.position.set(0, 6.3, 0.72);
      group.add(pocket);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), topMat);
      hood.position.set(0, 8.2, -0.65);
      group.add(hood);
    } else if (outfit.executive || outfit.polo) {
      // Collared Shirt / Polo with button placket
      const collar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 1.35), topMat);
      collar.position.y = 8.35;
      group.add(collar);
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.12), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
      placket.position.set(0, 7.3, 0.70);
      group.add(placket);
    }

    // 3. Two Articulated Continuous Lofted Legs terminating in White Sneakers
    function createLeg(xOffset) {
      const legPivot = new THREE.Group();
      legPivot.position.set(xOffset, 4.8, 0);

      // Continuous lofted leg (Hip -> Thigh -> Knee -> Calf/Shin -> Ankle)
      const legMesh = createSeamlessLoftedLimb([
        { p: [0, 0, 0], rx: 0.45, ry: 0.45 },
        { p: [0, -1.8, 0.04], rx: 0.38, ry: 0.38 },
        { p: [0, -2.4, 0.02], rx: 0.34, ry: 0.34 },
        { p: [0, -4.0, 0], rx: 0.30, ry: 0.30 }
      ], 10, 10, bottomMat);
      legPivot.add(legMesh);

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

    // 4. Two Articulated Continuous Lofted Swinging Arms
    function createArm(xOffset) {
      const armPivot = new THREE.Group();
      armPivot.position.set(xOffset, 8.1, 0);

      // Upper arm sleeve lofted
      const sleeveMesh = createSeamlessLoftedLimb([
        { p: [0, 0, 0], rx: 0.36, ry: 0.36 },
        { p: [0, -1.5, 0], rx: 0.32, ry: 0.32 }
      ], 6, 10, topMat);
      armPivot.add(sleeveMesh);

      // Natural skin forearm and hand lofted
      const forearmMesh = createSeamlessLoftedLimb([
        { p: [0, -1.5, 0], rx: 0.28, ry: 0.28 },
        { p: [0, -2.7, 0], rx: 0.24, ry: 0.24 },
        { p: [0, -3.3, 0.04], rx: 0.20, ry: 0.25 }
      ], 8, 10, skinMat);
      armPivot.add(forearmMesh);

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

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(group);
    }
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

  // ---------------------------------------------------------------------------
  // Reusable Procedural Dhaka Textures (Cached singletons, 0 file requests)
  // ---------------------------------------------------------------------------
  let sharedCurbTexture = null;
  function getCurbCanvasTexture() {
    if (sharedCurbTexture) return sharedCurbTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    // Alternating 45-degree Dhaka municipal safety hazard stripes
    ctx.fillStyle = '#facc15'; // Dhaka municipal yellow
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#1e293b'; // Charcoal dark stripe
    const stripeW = 16;
    for (let x = -32; x < 160; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 16, 0);
      ctx.lineTo(x + 16 + 18, 32);
      ctx.lineTo(x + 18, 32);
      ctx.closePath();
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 1);
    sharedCurbTexture = texture;
    return sharedCurbTexture;
  }

  let sharedCngDecalTexture = null;
  function getCngSideDecalTexture() {
    if (sharedCngDecalTexture) return sharedCngDecalTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Emerald Green background
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 256, 128);

    // Upper Diamond Wire Mesh Area
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.8;
    const meshStep = 16;
    for (let x = -64; x < 320; x += meshStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 64, 64);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 64, 0);
      ctx.stroke();
    }

    // Mid white banner: "★ FOR HIRE ★"
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(10, 68, 236, 26);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 68, 236, 26);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ FOR HIRE ★', 128, 81);

    // Lower Lemon-Yellow Band: "ONE PARIBAHAN · MIRPUR 10"
    ctx.fillStyle = '#facc15';
    ctx.fillRect(10, 98, 236, 24);
    ctx.fillStyle = '#14532d';
    ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
    ctx.fillText('ONE PARIBAHAN · MIRPUR 10', 128, 110);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    sharedCngDecalTexture = texture;
    return sharedCngDecalTexture;
  }

  let sharedRickshawArtTexture = null;
  function getRickshawArtTexture() {
    if (sharedRickshawArtTexture) return sharedRickshawArtTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    // Traditional Rickshaw Tinplate Art: Turquoise / Midnight Blue base with gold rim
    const grad = ctx.createLinearGradient(0, 0, 256, 160);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#db2777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 160);

    // Decorative Gold Filigree Border
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 244, 148);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, 232, 136);

    // Stylized Peacock / Floral Motifs
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(128, 70, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(128, 70, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(128, 70, 12, 0, Math.PI * 2);
    ctx.fill();

    // Authentic Bengali Typography: "ঢাকা"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ঢাকা', 128, 124);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    sharedRickshawArtTexture = texture;
    return sharedRickshawArtTexture;
  }

  let sharedRollerShutterTexture = null;
  function getRollerShutterTexture() {
    if (sharedRollerShutterTexture) return sharedRollerShutterTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Galvanized Corrugated Metal Rollup Shutter
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 128, 128);

    const slatH = 8;
    for (let y = 0; y < 128; y += slatH) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, y, 128, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, y + 3, 128, 3);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, y + 6, 128, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);
    sharedRollerShutterTexture = texture;
    return sharedRollerShutterTexture;
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

    // 7. Yellow Box Junction Cross-Hatch Grid (Mirpur 10 Intersection Center)
    const boxX1 = toPx(-120);
    const boxX2 = toPx(120);
    const boxY1 = toPy(-92);
    const boxY2 = toPy(92);
    const boxW = boxX2 - boxX1;
    const boxH = boxY2 - boxY1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(boxX1, boxY1, boxW, boxH);
    ctx.clip();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.42)';
    ctx.lineWidth = 3.2;
    const dStep = 32 * scale;
    for (let x = boxX1 - boxH * 1.5; x < boxX2 + boxH * 1.5; x += dStep) {
      ctx.beginPath();
      ctx.moveTo(x, boxY1);
      ctx.lineTo(x + boxH, boxY2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, boxY2);
      ctx.lineTo(x + boxH, boxY1);
      ctx.stroke();
    }
    // Solid Yellow Perimeter Box
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4.5;
    ctx.strokeRect(boxX1, boxY1, boxW, boxH);
    ctx.restore();

    // 8. Directional White Lane Markings (Straight, Left, Right turn arrows)
    function drawRoadArrow(px, py, angleRad, type) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angleRad);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (type === 'straight') {
        // Arrow stem
        ctx.fillRect(-3.2, -8, 6.4, 28);
        // Pointed head
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(12, -8);
        ctx.lineTo(5, -8);
        ctx.lineTo(5, -6);
        ctx.lineTo(-5, -6);
        ctx.lineTo(-5, -8);
        ctx.lineTo(-12, -8);
        ctx.closePath();
        ctx.fill();
      } else if (type === 'straight-left') {
        // Straight stem
        ctx.fillRect(-3, -8, 6, 28);
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(11, -8);
        ctx.lineTo(-11, -8);
        ctx.closePath();
        ctx.fill();
        // Left turn branch
        ctx.lineWidth = 5.2;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(-2, -6, -14, -10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-22, -10);
        ctx.lineTo(-12, -18);
        ctx.lineTo(-12, -2);
        ctx.closePath();
        ctx.fill();
      } else if (type === 'straight-right') {
        // Straight stem
        ctx.fillRect(-3, -8, 6, 28);
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(11, -8);
        ctx.lineTo(-11, -8);
        ctx.closePath();
        ctx.fill();
        // Right turn branch
        ctx.lineWidth = 5.2;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(2, -6, 14, -10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(22, -10);
        ctx.lineTo(12, -18);
        ctx.lineTo(12, -2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Eastbound approaches (traffic moving +X)
    [-210, -320].forEach(x => {
      drawRoadArrow(toPx(x), toPy(18), Math.PI / 2, 'straight-right');
      drawRoadArrow(toPx(x), toPy(48), Math.PI / 2, 'straight-left');
    });

    // Westbound approaches (traffic moving -X)
    [210, 320].forEach(x => {
      drawRoadArrow(toPx(x), toPy(-18), -Math.PI / 2, 'straight-right');
      drawRoadArrow(toPx(x), toPy(-48), -Math.PI / 2, 'straight-left');
    });

    // Southbound approaches (traffic moving +Z)
    [-170, -270].forEach(z => {
      drawRoadArrow(toPx(-20), toPy(z), Math.PI, 'straight-right');
      drawRoadArrow(toPx(-58), toPy(z), Math.PI, 'straight-left');
    });

    // Northbound approaches (traffic moving -Z)
    [170, 270].forEach(z => {
      drawRoadArrow(toPx(18), toPy(z), 0, 'straight-right');
      drawRoadArrow(toPx(56), toPy(z), 0, 'straight-left');
    });

    // 9. Realistic Tarmac Repair Patches & Cast-Iron Utility Manholes
    const roadPatches = [
      { x: -240, z: 24, w: 42, h: 22 },
      { x: 260, z: -32, w: 38, h: 26 },
      { x: -35, z: -190, w: 28, h: 36 },
      { x: 32, z: 210, w: 30, h: 32 }
    ];
    roadPatches.forEach(p => {
      const px = toPx(p.x);
      const py = toPy(p.z);
      const pw = p.w * scale;
      const ph = p.h * scale;
      ctx.fillStyle = '#14181f'; // Fresh dark asphalt patch
      ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
      ctx.strokeStyle = '#0a0d12'; // Tar sealant boundary
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
    });

    // Cast-iron Manhole Covers
    const manholes = [
      { x: -170, z: 32 },
      { x: 180, z: -34 },
      { x: -38, z: -150 },
      { x: 36, z: 160 }
    ];
    manholes.forEach(m => {
      const px = toPx(m.x);
      const py = toPy(m.z);
      const r = 5.2 * scale;
      ctx.fillStyle = '#26303c';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  // Sidewalk Corners with Curbs & Pedestrian Safety Railings
  let railingMat = null;
  function addSidewalkCorner(w, d, x, z) {
    if (!sidewalkMat) sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.05 });
    if (!curbMat) curbMat = new THREE.MeshStandardMaterial({ map: getCurbCanvasTexture(), roughness: 0.65, metalness: 0.1 });
    if (!railingMat) railingMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.4 });

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

    // Dhaka Corner Steel Pedestrian Safety Guardrail
    const railGroup = new THREE.Group();
    const cornerSignZ = z > 0 ? 1 : -1;
    const cornerSignX = x > 0 ? 1 : -1;
    const railX = cornerSignX * 138;
    const railZ = cornerSignZ * 108;

    // Safety Posts
    const postGeo = new THREE.CylinderGeometry(0.35, 0.35, 6, 6);
    [-12, 0, 12].forEach(pOff => {
      const post = new THREE.Mesh(postGeo, railingMat);
      post.position.set(railX + (cornerSignX > 0 ? -Math.abs(pOff) : Math.abs(pOff)), 5, railZ);
      railGroup.add(post);
    });
    // Double Crossbars
    const barGeo = new THREE.CylinderGeometry(0.24, 0.24, 26, 6);
    [4.5, 7.2].forEach(by => {
      const bar = new THREE.Mesh(barGeo, railingMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(railX - cornerSignX * 6, by, railZ);
      railGroup.add(bar);
    });
    freezeStatic(railGroup);
    scene.add(railGroup);
  }

  // Multi-Layered Organic Dhaka Trees (Textured trunk + 4–5 overlapping foliage clusters in rich natural greens)
  let organicTreeMats = null;
  function addTree(x, z) {
    if (!treeTrunkGeo) treeTrunkGeo = new THREE.CylinderGeometry(0.7, 1.0, 8, 8);
    if (!treeTrunkMat) treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.85 });
    if (!organicTreeMats) {
      organicTreeMats = [
        new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65, metalness: 0.0, emissive: new THREE.Color(0x0e3a1d), emissiveIntensity: 0.32 }),
        new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.60, metalness: 0.0, emissive: new THREE.Color(0x134825), emissiveIntensity: 0.30 }),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.70, metalness: 0.0, emissive: new THREE.Color(0x0c3118), emissiveIntensity: 0.35 }),
        new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.60, metalness: 0.0, emissive: new THREE.Color(0x1a522d), emissiveIntensity: 0.28 })
      ];
    }

    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 2, z);

    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    trunk.position.y = 4;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const clusters = [
      { x: 0, y: 10.0, z: 0, r: 2.8, m: 0 },
      { x: -1.4, y: 9.2, z: 1.1, r: 2.3, m: 1 },
      { x: 1.4, y: 9.4, z: -1.0, r: 2.2, m: 2 },
      { x: -1.0, y: 9.7, z: -1.2, r: 2.1, m: 3 },
      { x: 1.2, y: 10.4, z: 1.0, r: 2.0, m: 1 }
    ];

    clusters.forEach(c => {
      const geo = new THREE.SphereGeometry(c.r, 14, 10);
      const mat = organicTreeMats[c.m % organicTreeMats.length];
      const cluster = new THREE.Mesh(geo, mat);
      cluster.position.set(c.x, c.y, c.z);
      cluster.castShadow = true;
      treeGroup.add(cluster);
    });

    freezeStatic(treeGroup);
    scene.add(treeGroup);
  }

  // Realistic Dhaka Rooftop Texture (Paving tiles, gravel texture, parapet border, subtle warm emissive)
  const roofTextureCache = {};
  function getRoofCanvasTexture(baseColorHex) {
    if (!roofTextureCache[baseColorHex]) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = baseColorHex || '#475569';
      ctx.fillRect(0, 0, 256, 256);

      // Paving tile grid
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      for (let y = 0; y <= 256; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }

      // Parapet border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 248, 248);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      roofTextureCache[baseColorHex] = tex;
    }
    return roofTextureCache[baseColorHex];
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

    const isSouth = z > 0;

    function createTierMaterials(frontT, sideT) {
      const frontM = new THREE.MeshStandardMaterial({
        map: frontT,
        roughness: 0.35,
        metalness: 0.25,
        emissive: new THREE.Color(0xfbbf24),
        emissiveMap: frontT,
        emissiveIntensity: 0.55
      });
      const sideM = new THREE.MeshStandardMaterial({
        map: sideT,
        roughness: 0.45,
        metalness: 0.20,
        emissive: new THREE.Color(0xfbbf24),
        emissiveMap: sideT,
        emissiveIntensity: 0.40
      });
      const roofT = getRoofCanvasTexture(roofColor || (isSouth ? '#52525b' : '#3f3f46'));
      const roofM = new THREE.MeshStandardMaterial({
        map: roofT,
        roughness: 0.55,
        metalness: 0.15,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.12
      });
      const botM = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      return [sideM, sideM, roofM, botM, frontM, frontM];
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

    // Parapet ledge around the roof perimeter
    const parapetGeo = new THREE.BoxGeometry(w3 + 1.6, 2.4, d3 + 1.6);
    const parapetMat = new THREE.MeshStandardMaterial({ color: chosenWallColor, roughness: 0.5 });
    const parapet = new THREE.Mesh(parapetGeo, parapetMat);
    parapet.position.y = height + 1.2;
    group.add(parapet);

    // Decorative Art Deco Stepped Spire / Lift Penthouse
    const crownGeo = new THREE.BoxGeometry(w3 * 0.55, 4.8, d3 * 0.55);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = height + 2.4;
    group.add(crown);

    // Neon Tube Building Trim & Vertical Pilasters (Vice City Definitive Edition)
    const neonPalette = [0xff007f, 0x00f5d4, 0x39ff14, 0xfacc15];
    const neonHex = neonPalette[Math.abs(Math.floor((x * 11 + z * 17) / 100)) % neonPalette.length];
    const neonMat = new THREE.MeshBasicMaterial({ color: neonHex });

    const frontZ1 = isSouth ? (-(d1 + 3.5) / 2) : ((d1 + 3.5) / 2);
    const frontZ2 = isSouth ? (-(d2 + 2.5) / 2) : ((d2 + 2.5) / 2);
    const frontZ3 = isSouth ? (-(d3 + 1.8) / 2) : ((d3 + 1.8) / 2);

    // 1. Ground Overhang Neon Tube Trim
    const neonStrip1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, w1 + 3.2, 8), neonMat);
    neonStrip1.rotation.z = Math.PI / 2;
    neonStrip1.position.set(0, h1 + 0.8, frontZ1);
    group.add(neonStrip1);

    // 2. Mid-Tier Roofline Neon Tube
    const neonStrip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, w2 + 2.2, 8), neonMat);
    neonStrip2.rotation.z = Math.PI / 2;
    neonStrip2.position.set(0, h1 + h2 + 0.7, frontZ2);
    group.add(neonStrip2);

    // 3. Crown Roofline Neon Tube
    const neonStrip3 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, w3 + 1.4, 8), neonMat);
    neonStrip3.rotation.z = Math.PI / 2;
    neonStrip3.position.set(0, height + 0.5, frontZ3);
    group.add(neonStrip3);

    // 4. Vertical Art Deco Pilasters (corner neon tubes)
    [-w2 / 2 + 0.5, w2 / 2 - 0.5].forEach(px => {
      const pilasterNeon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, h2, 8), neonMat);
      pilasterNeon.position.set(px, h1 + h2 / 2, isSouth ? (-d2 / 2 - 0.3) : (d2 / 2 + 0.3));
      group.add(pilasterNeon);
    });

    // 3D AC outdoor condenser units on exterior walls
    const acGeo = new THREE.BoxGeometry(3.6, 2.4, 2.0);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    for (let f = 1; f < Math.min(numFloors, 4); f++) {
      const ac = new THREE.Mesh(acGeo, acMat);
      const sideX = (f % 2 === 0) ? (w1 / 2 - 6) : (-w1 / 2 + 6);
      ac.position.set(sideX, f * (h1 / 2) + 2.0, frontZ1 + (isSouth ? -1.0 : 1.0));
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
      const signZ = isSouth ? (-(d1 / 2) - 2.0) : ((d1 / 2) + 2.0);
      signMesh.position.set(buildingSign.ox || 0, buildingSign.y || 15, signZ);
      signMesh.rotation.y = isSouth ? Math.PI : 0;
      group.add(signMesh);

      if (isSouth) {
        const southSign = signMesh.clone();
        southSign.position.set(buildingSign.ox || 0, (buildingSign.y || 15) + 4, (d1 / 2) + 2.0);
        southSign.rotation.y = 0;
        group.add(southSign);
      }

      if (buildingSign.awnCol) {
        const awnGeo = new THREE.BoxGeometry((buildingSign.w || (w1 * 0.75)) + 3, 2.8, 8);
        const awnMat = new THREE.MeshStandardMaterial({ color: buildingSign.awnCol, roughness: 0.5 });
        const awn = new THREE.Mesh(awnGeo, awnMat);
        const awnZ = isSouth ? (-(d1 / 2) - 4.5) : ((d1 / 2) + 4.5);
        awn.position.set(buildingSign.ox || 0, (buildingSign.y || 15) + (buildingSign.h || 16) / 2 + 1.4, awnZ);
        awn.rotation.x = isSouth ? -0.25 : 0.25;
        group.add(awn);
      }
    }

    freezeStatic(group);
    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(group);
    }
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

// ---------------------------------------------------------------------------
  // Seamless GTA Motorcycle & Organic Multi-Outfit Rider Factory (Pure Three.js)
  // 5 GTA V Archetypes, 10 Automotive Palettes, Sculpted 3D Human Face & Multi-Outfits
  // ---------------------------------------------------------------------------
  const bikeTextureCache = {};

  // 1. High-Resolution Photorealistic Human Face Canvas Texture Generator
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
  // 2. 2x2 Twill Weave Carbon Fiber Texture Generator
  function getCarbonFiberTexture() {
    if (bikeTextureCache.carbon) return bikeTextureCache.carbon;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1c1c1f';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#2f2f35';
    for (let y = 0; y < 64; y += 8) {
      for (let x = 0; x < 64; x += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 8, 8);
          ctx.fillStyle = '#3a3a42';
          ctx.fillRect(x + 1, y + 1, 6, 2);
          ctx.fillStyle = '#2f2f35';
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    bikeTextureCache.carbon = tex;
    return tex;
  }

  // 3. Perforated Steel Disc Brake Rotor Texture Generator
  function getDiscRotorTexture() {
    if (bikeTextureCache.discRotor) return bikeTextureCache.discRotor;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    for (let r = 50; r < 120; r += 7) {
      ctx.beginPath();
      ctx.arc(128, 128, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const r = 65 + (i % 5) * 11;
      const x = 128 + Math.cos(angle) * r;
      const y = 128 + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.discRotor = tex;
    return tex;
  }

  // Photo 1 Aerodynamic Helmet Painted Swoop & Spine Texture Generator
  function getAerodynamicHelmetTexture(shellHex, decalHex) {
    const key = `helmet_${shellHex}_${decalHex}`;
    if (bikeTextureCache[key]) return bikeTextureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Glossy vibrant shell
    ctx.fillStyle = '#' + new THREE.Color(shellHex).getHexString();
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Black aerodynamic center spine stripe (over the top crown)
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(225, 1024);
    ctx.lineTo(287, 1024);
    ctx.lineTo(295, 450);
    ctx.lineTo(217, 450);
    ctx.closePath();
    ctx.fill();

    // 3. Signature White/Silver Aerodynamic Curved Swoop Graphic Decal (Photo 1)
    ctx.strokeStyle = '#' + new THREE.Color(decalHex).getHexString();
    ctx.lineWidth = 42;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Right side swoop: curves from above visor up over crown down to rear
    ctx.beginPath();
    ctx.moveTo(330, 620);
    ctx.bezierCurveTo(420, 880, 520, 840, 620, 640);
    ctx.stroke();

    // Left side swoop
    ctx.beginPath();
    ctx.moveTo(182, 620);
    ctx.bezierCurveTo(92, 880, 0, 840, 0, 750);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(1024, 750);
    ctx.bezierCurveTo(1000, 840, 932, 880, 842, 620);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    bikeTextureCache[key] = tex;
    return tex;
  }

  // 4. Heat-Wrapped Exhaust Texture Generator (Cafe Racer)
  function getHeatWrapTexture() {
    if (bikeTextureCache.heatWrap) return bikeTextureCache.heatWrap;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#5c4d3c';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#786650';
    for (let y = 0; y < 64; y += 8) {
      ctx.fillRect(0, y, 64, 4);
      ctx.fillStyle = '#3a2f24';
      ctx.fillRect(0, y + 4, 64, 1.5);
      ctx.fillStyle = '#786650';
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 6);
    bikeTextureCache.heatWrap = tex;
    return tex;
  }

  // 5. Tire Tread & Fukaru Sidewall Texture Generator
  function getFukaruTireTexture() {
    if (bikeTextureCache.fukaruTire) return bikeTextureCache.fukaruTire;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FUKARU   RACE   RADIAL', 256, 64);

    ctx.fillStyle = '#eab308';
    ctx.fillRect(60, 58, 28, 12);
    ctx.fillRect(424, 58, 28, 12);

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.fukaruTire = tex;
    return tex;
  }

  // 6. Pinstripe Tank Texture Generator (Cruiser)
  function getPinstripeTankTexture(accentHex) {
    const key = 'pinstripe_' + accentHex;
    if (bikeTextureCache[key]) return bikeTextureCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);

    const col = '#' + (accentHex || 0xef4444).toString(16).padStart(6, '0');
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 64);
    ctx.bezierCurveTo(80, 20, 180, 20, 246, 64);
    ctx.bezierCurveTo(180, 108, 80, 108, 10, 64);
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 64);
    ctx.bezierCurveTo(85, 32, 175, 32, 231, 64);
    ctx.bezierCurveTo(175, 96, 85, 96, 25, 64);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache[key] = tex;
    return tex;
  }

  // 7. Stone Guard Headlight Grill Texture (Cafe Racer)
  function getGrillHeadlightTexture() {
    if (bikeTextureCache.grillHeadlight) return bikeTextureCache.grillHeadlight;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fffdfa';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 3.5;
    for (let x = 20; x <= 108; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 15);
      ctx.lineTo(x, 113);
      ctx.stroke();
    }
    for (let y = 20; y <= 108; y += 16) {
      ctx.beginPath();
      ctx.moveTo(15, y);
      ctx.lineTo(113, y);
      ctx.stroke();
    }
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.grillHeadlight = tex;
    return tex;
  }

  // 8. License Plate Texture Generator
  function getBikeLicensePlateTexture() {
    if (bikeTextureCache.plate) return bikeTextureCache.plate;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UF82 ISK', 128, 66);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache.plate = tex;
    return tex;
  }

  // 9. Shitzu Decal Texture Generator
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

  // 10. Kanji Decal Texture Generator
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

  // 11. Back Varsity "R*" Texture Generator
  function getVarsityBackTexture(jacketHex) {
    const key = 'varsity_' + jacketHex;
    if (bikeTextureCache[key]) return bikeTextureCache[key];
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 900 120px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', 104, 115);
    ctx.font = '900 70px "Segoe UI Symbol", sans-serif';
    ctx.fillText('★', 168, 145);
    const tex = new THREE.CanvasTexture(canvas);
    bikeTextureCache[key] = tex;
    return tex;
  }

  // Parallel-Transport Lofting Helper for Organic Limbs & Torso
  function createSeamlessLoftedLimb(crossSections, radialSegs, pathSegs, material) {
    radialSegs = radialSegs || 16;
    pathSegs = pathSegs || 20;

    const points = crossSections.map(c => new THREE.Vector3(c.p[0], c.p[1], c.p[2]));
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    function getInterpolatedRadius(u) {
      const n = crossSections.length - 1;
      const idx = Math.min(Math.floor(u * n), n - 1);
      const t = (u * n) - idx;
      const cA = crossSections[idx];
      const cB = crossSections[idx + 1];
      return {
        rx: THREE.MathUtils.lerp(cA.rx, cB.rx, t),
        ry: THREE.MathUtils.lerp(cA.ry, cB.ry, t)
      };
    }

    const frames = curve.computeFrenetFrames(pathSegs, false);
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= pathSegs; i++) {
      const u = i / pathSegs;
      const P = curve.getPointAt(u);
      const rad = getInterpolatedRadius(u);
      const N = frames.normals[i];
      const B = frames.binormals[i];

      for (let j = 0; j <= radialSegs; j++) {
        const v = j / radialSegs;
        const theta = v * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        const vx = P.x + (N.x * cos * rad.rx) + (B.x * sin * rad.ry);
        const vy = P.y + (N.y * cos * rad.rx) + (B.y * sin * rad.ry);
        const vz = P.z + (N.z * cos * rad.rx) + (B.z * sin * rad.ry);

        vertices.push(vx, vy, vz);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < pathSegs; i++) {
      for (let j = 0; j < radialSegs; j++) {
        const a = i * (radialSegs + 1) + j;
        const b = (i + 1) * (radialSegs + 1) + j;
        const c = (i + 1) * (radialSegs + 1) + (j + 1);
        const d = i * (radialSegs + 1) + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // 10 Automotive Palettes for GTA V Motorcycles
  const BIKE_PALETTES = [
    // 0: Pearl White & Brushed Bronze (Modern Cafe Racer - Photo 4)
    { name: 'Pearl White & Bronze', fairing: 0xf8fafc, accent: 0x18181b, rim: 0xb45309, rimLip: null, seat: 0x451a03, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 1: Candy Apple Red & Gloss Black (Yamaha R1M Supersport - Photo 3)
    { name: 'Candy Red & Gloss Black', fairing: 0xbe123c, accent: 0x090d16, rim: 0x090d16, rimLip: 0xef4444, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 2: Liquid Titanium Silver & Gunmetal (Suzuki Hayabusa - Photo 1)
    { name: 'Titanium Silver & Gunmetal', fairing: 0xc0c7d0, accent: 0x18181b, rim: 0x334155, rimLip: null, seat: 0x090d16, frame: 0x1e293b, chrome: 0xf1f5f9, caliper: 0xd97706 },
    // 3: Crimson Candy & Matte Black (Western Nightblade Muscle Cruiser - Photo 2)
    { name: 'Nightblade Crimson & Black', fairing: 0x881337, accent: 0x18181b, rim: 0x18181b, rimLip: 0x881337, seat: 0x18181b, frame: 0x18181b, chrome: 0xd4af37, caliper: 0xd4af37 },
    // 4: Stealth Matte Charcoal (Streetfighter Biker)
    { name: 'Stealth Matte Charcoal', fairing: 0x1e293b, accent: 0x38bdf8, rim: 0x090d16, rimLip: 0x0284c7, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 },
    // 5: Emerald Green & Gold
    { name: 'Emerald Green & Gold', fairing: 0x065f46, accent: 0xf8fafc, rim: 0xd97706, rimLip: null, seat: 0x451a03, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 6: Deep Sapphire Blue & Black
    { name: 'Sapphire Blue & Black', fairing: 0x1d4ed8, accent: 0x090d16, rim: 0x090d16, rimLip: 0x3b82f6, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 7: Nardo Grey & Acid Green
    { name: 'Nardo Grey & Acid Green', fairing: 0x64748b, accent: 0x84cc16, rim: 0x090d16, rimLip: 0x84cc16, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0x84cc16 },
    // 8: Royal Purple & Chrome
    { name: 'Royal Purple & Chrome', fairing: 0x581c87, accent: 0xf8fafc, rim: 0xe2e8f0, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xf8fafc, caliper: 0xd97706 },
    // 9: Championship Gold & Silver
    { name: 'Championship Gold & Silver', fairing: 0xd97706, accent: 0x090d16, rim: 0xcfd8dc, rimLip: null, seat: 0x090d16, frame: 0x18181b, chrome: 0xe2e8f0, caliper: 0xd97706 }
  ];

  // Master Canonical GTA V Motorcycle & Rider Builder
  function createRealisticGTABike(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const archetypeIdx = (vData && vData.archetype !== undefined)
      ? (Math.abs(vData.archetype) % 5)
      : Math.abs((appearanceSeed || 0) % 5);

    const isCruiser = (archetypeIdx === 1);
    const isSupersport = (archetypeIdx === 2);
    const isHyperbike = (archetypeIdx === 3);
    const isCafeRacer = (archetypeIdx === 4);
    const isStreetfighter = (archetypeIdx === 0);

    const paletteIdx = (vData && vData.palette !== undefined)
      ? (Math.abs(vData.palette) % BIKE_PALETTES.length)
      : (isCruiser ? 3 : (isSupersport ? 1 : (isHyperbike ? 2 : (isCafeRacer ? 0 : Math.abs(appearanceSeed || 0) % BIKE_PALETTES.length))));

    const palette = BIKE_PALETTES[paletteIdx];
    const fairingColor = (vData && vData.customColor) ? vData.customColor : palette.fairing;

    const outfitIdx = (vData && vData.outfit !== undefined)
      ? (Math.abs(vData.outfit) % 4)
      : (isCruiser ? 0 : (isSupersport ? 1 : (isHyperbike ? 1 : (isCafeRacer ? 2 : Math.abs((appearanceSeed || 0) >> 2) % 4))));

    const OUTFIT_PRESETS = [
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
    const outfitCfg = OUTFIT_PRESETS[outfitIdx];

    // Shared Materials
    const darkFrameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.65, metalness: 0.45 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: palette.chrome || 0xf8fafc, roughness: 0.12, metalness: 0.95 });
    const goldForkMat = new THREE.MeshStandardMaterial({ color: (isCruiser || isSupersport) ? 0xd4af37 : 0x94a3b8, roughness: 0.22, metalness: 0.88 });
    const fairingMat = new THREE.MeshStandardMaterial({
      color: fairingColor,
      roughness: isCafeRacer ? 0.32 : 0.15,
      metalness: isCafeRacer ? 0.20 : 0.65
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      map: getCarbonFiberTexture(),
      color: 0x222226,
      roughness: 0.35,
      metalness: 0.45
    });
    const leatherSeatMat = new THREE.MeshStandardMaterial({
      color: palette.seat || (isCafeRacer ? 0x451a03 : 0x18181b),
      roughness: 0.65,
      metalness: 0.10
    });
    const radiatorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.50, metalness: 0.70 });
    const smokedGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.10,
      metalness: 0.80,
      transparent: true,
      opacity: 0.55
    });
    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.94,
      metalness: 0.02
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: palette.rim || 0x090d16,
      roughness: 0.30,
      metalness: 0.82
    });
    const discMat = new THREE.MeshStandardMaterial({
      map: getDiscRotorTexture(),
      roughness: 0.25,
      metalness: 0.88
    });
    const caliperMat = new THREE.MeshStandardMaterial({
      color: palette.caliper || 0xd97706,
      roughness: 0.35,
      metalness: 0.70
    });

    // ---------------------------------------------------------------------------
    // 1. WHEEL SPECIFICATIONS & BUILDER
    // ---------------------------------------------------------------------------
    function buildHollowMotorcycleWheel(wheelRadius, tireWidth, isRear, isWireSpoke, isFatDrag) {
      const wheelGroup = new THREE.Group();
      const rimRadius = wheelRadius * 0.72;

      // Tire Torus (Tread)
      const tireGeo = new THREE.TorusGeometry(wheelRadius - tireWidth * 0.45, tireWidth * 0.45, 18, 36);
      const tireMesh = new THREE.Mesh(tireGeo, tireRubberMat);
      wheelGroup.add(tireMesh);

      // Inner Rim Band
      const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth * 0.75, 32, 1, true);
      rimGeo.rotateX(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(rimGeo, rimMat));

      // Rim Outer Lip Accent Ring
      if (palette.rimLip) {
        const lipMat = new THREE.MeshBasicMaterial({ color: palette.rimLip });
        [-1, 1].forEach(side => {
          const lipGeo = new THREE.TorusGeometry(rimRadius + 0.05, 0.08, 8, 32);
          const lip = new THREE.Mesh(lipGeo, lipMat);
          lip.position.z = side * (tireWidth * 0.38);
          wheelGroup.add(lip);
        });
      }

      // Central Hub
      const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.22, wheelRadius * 0.22, tireWidth * 0.82, 18);
      hubGeo.rotateX(Math.PI / 2);
      wheelGroup.add(new THREE.Mesh(hubGeo, darkFrameMat));

      // Spokes Construction
      if (isFatDrag && isRear) {
        const discCenter = new THREE.Mesh(new THREE.CylinderGeometry(rimRadius * 0.95, rimRadius * 0.95, tireWidth * 0.45, 24), darkFrameMat);
        discCenter.rotation.x = Math.PI / 2;
        wheelGroup.add(discCenter);
        for (let i = 0; i < 5; i++) {
          const slot = new THREE.Mesh(new THREE.BoxGeometry(rimRadius * 0.55, 0.45, tireWidth * 0.5), chromeMat);
          slot.rotation.z = (i / 5) * Math.PI;
          wheelGroup.add(slot);
        }
      } else if (isWireSpoke) {
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.3, metalness: 0.9 });
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, rimRadius * 0.85, 6);
          const spoke = new THREE.Mesh(spokeGeo, wireMat);
          spoke.position.set(Math.cos(angle) * (rimRadius * 0.48), Math.sin(angle) * (rimRadius * 0.48), (i % 2 === 0 ? 0.3 : -0.3) * (tireWidth * 0.35));
          spoke.rotation.z = angle + ((i % 2 === 0) ? 0.35 : -0.35);
          wheelGroup.add(spoke);
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const baseAngle = (i / 5) * Math.PI * 2;
          [-0.10, 0.10].forEach(offset => {
            const spokeAngle = baseAngle + offset;
            const spokeGeo = new THREE.BoxGeometry(0.24, rimRadius * 0.82, tireWidth * 0.28);
            const spoke = new THREE.Mesh(spokeGeo, rimMat);
            spoke.position.set(Math.cos(spokeAngle) * (rimRadius * 0.45), Math.sin(spokeAngle) * (rimRadius * 0.45), 0);
            spoke.rotation.z = spokeAngle - Math.PI / 2;
            wheelGroup.add(spoke);
          });
        }
      }

      // Perforated Floating Steel Brake Discs & Brembo Caliper
      [-1, 1].forEach(side => {
        if (!isRear || side === 1) {
          const rotor = new THREE.Mesh(new THREE.CircleGeometry(wheelRadius * 0.60, 24), discMat);
          rotor.position.z = side * (tireWidth * 0.42);
          wheelGroup.add(rotor);
        }
      });

      return wheelGroup;
    }

    const frontWheelRadius = 3.25;
    const rearWheelRadius = isCruiser ? 3.10 : 3.25;
    const frontTireWidth = 1.25;
    const rearTireWidth = isCruiser ? 2.65 : (isHyperbike ? 1.95 : 1.65);

    const frontWheelX = isCruiser ? 9.8 : (isHyperbike ? 8.9 : 8.5);
    const rearWheelX = isCruiser ? -9.2 : -8.5;
    const wheelCenterY = 3.25;

    const isWireSpoke = isCafeRacer;
    const isFatDrag = isCruiser;

    // Front Wheel Assembly
    const wheelFront = buildHollowMotorcycleWheel(frontWheelRadius, frontTireWidth, false, isWireSpoke, false);
    wheelFront.position.set(frontWheelX, wheelCenterY, 0);
    group.add(wheelFront);
    const wPivot = wheelFront;
    group.userData.wheels.push(wPivot);

    // Rear Wheel Assembly
    const wheelRear = buildHollowMotorcycleWheel(rearWheelRadius, rearTireWidth, true, isWireSpoke, isFatDrag);
    wheelRear.position.set(rearWheelX, wheelCenterY, 0);
    group.add(wheelRear);
    group.userData.wheels.push(wheelRear);

    group.userData.wheelRadius = 3.25;

    // Brake Calipers (Mounted statically to fork bottoms and swingarm axle bracket)
    const caliperF = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.15, 0.55), caliperMat);
    caliperF.position.set(frontWheelX - 1.2, wheelCenterY + 1.2, frontTireWidth * 0.45);
    group.add(caliperF);

    const caliperR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.55), caliperMat);
    caliperR.position.set(rearWheelX + 1.1, wheelCenterY + 1.0, rearTireWidth * 0.42);
    group.add(caliperR);

    // ---------------------------------------------------------------------------
    // 2. CONNECTED STRUCTURAL SWINGARM & REAR MONO-SHOCK (Zero Disconnected Wheels!)
    // ---------------------------------------------------------------------------
    const swingarmPivotX = -1.4;
    const swingarmPivotY = 4.2;
    const swingarmDx = rearWheelX - swingarmPivotX;
    const swingarmDy = wheelCenterY - swingarmPivotY;
    const swingarmLen = Math.sqrt(swingarmDx * swingarmDx + swingarmDy * swingarmDy);
    const swingarmAngle = Math.atan2(swingarmDy, swingarmDx);

    // Heavy-duty Dual Aluminum Box-Section Swingarm Spars
    [-1, 1].forEach(side => {
      const armZ = side * (rearTireWidth * 0.48 + 0.22);
      const armSpar = new THREE.Mesh(new THREE.BoxGeometry(swingarmLen, 0.72, 0.38), darkFrameMat);
      armSpar.position.set(swingarmPivotX + swingarmDx * 0.5, swingarmPivotY + swingarmDy * 0.5, armZ);
      armSpar.rotation.z = swingarmAngle;
      group.add(armSpar);

      // Billet Axle Adjustment Blocks at Rear Dropouts
      const axleBlock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.42), chromeMat);
      axleBlock.position.set(rearWheelX, wheelCenterY, armZ);
      group.add(axleBlock);
    });

    // Swingarm Transverse Cross-Member & Frame Pivot Gusset
    const swingCross = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, rearTireWidth * 1.15), darkFrameMat);
    swingCross.position.set(swingarmPivotX - 0.5, swingarmPivotY + 0.1, 0);
    group.add(swingCross);

    // Rear Mono-Shock Suspension (Coil Spring & Damper Unit)
    const shockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 14), chromeMat);
    shockBody.rotation.z = 0.58;
    shockBody.position.set(-2.2, 5.2, 0);
    group.add(shockBody);

    const springMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.6 });
    for (let c = -0.7; c <= 0.7; c += 0.28) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 8, 18), springMat);
      coil.rotation.z = 0.58;
      coil.position.set(-2.2 - Math.sin(0.58) * c, 5.2 + Math.cos(0.58) * c, 0);
      group.add(coil);
    }

    // Drive Chain & Rear Wheel Sprocket (Left Side)
    const sprocket = new THREE.Mesh(new THREE.CircleGeometry(1.55, 24), darkFrameMat);
    sprocket.position.set(rearWheelX, wheelCenterY, -rearTireWidth * 0.46);
    group.add(sprocket);

    const chainTop = new THREE.Mesh(new THREE.BoxGeometry(swingarmLen * 0.95, 0.18, 0.14), chromeMat);
    chainTop.rotation.z = swingarmAngle;
    chainTop.position.set(swingarmPivotX + swingarmDx * 0.5, swingarmPivotY + swingarmDy * 0.5 + 0.55, -rearTireWidth * 0.46);
    group.add(chainTop);

    const chainBottom = new THREE.Mesh(new THREE.BoxGeometry(swingarmLen * 0.95, 0.18, 0.14), chromeMat);
    chainBottom.rotation.z = swingarmAngle;
    chainBottom.position.set(swingarmPivotX + swingarmDx * 0.5, swingarmPivotY + swingarmDy * 0.5 - 0.55, -rearTireWidth * 0.46);
    group.add(chainBottom);

    // ---------------------------------------------------------------------------
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
    const plateFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 0.08), darkFrameMat);
    plateFrame.position.set(-0.72, -0.85, 0);
    plateFrame.rotation.order = 'YXZ';
    plateFrame.rotation.y = -Math.PI / 2;
    plateFrame.rotation.x = -0.22; // Upward tilt, 0 sideways roll!
    tailTidy.add(plateFrame);

    // Number Plate Mesh (Centered at Z = 0, Mounted directly onto plateFrame face)
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.85),
      new THREE.MeshBasicMaterial({ map: getBikeLicensePlateTexture(), side: THREE.DoubleSide })
    );
    plateMesh.position.set(0, 0, 0.045);
    plateFrame.add(plateMesh);

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
    const headGroup = new THREE.Group();
    headGroup.position.set(headPosition[0], headPosition[1], headPosition[2]);

    const beardStyleIdx = outfitIdx % 4;

    if (isCruiser) {
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

      // DIVERSE 3D FACIAL HAIR ARCHETYPES (Cruiser Biker Culture)
      if (beardStyleIdx === 0) {
        const cleft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.02), skinMat);
        cleft.position.set(0.78, -0.36, 0);
        headGroup.add(cleft);
      } else if (beardStyleIdx === 1) {
        const stubbleMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.90, transparent: true, opacity: 0.45 });
        const stubbleChin = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), stubbleMat);
        stubbleChin.position.set(0.69, -0.36, 0);
        headGroup.add(stubbleChin);
      } else if (beardStyleIdx === 2) {
        const beardMat = new THREE.MeshStandardMaterial({ color: 0x140a04, roughness: 0.85 });
        const chinBeard = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), beardMat);
        chinBeard.scale.set(1.15, 1.25, 1.45);
        chinBeard.position.set(0.68, -0.38, 0);
        headGroup.add(chinBeard);
        const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 12), beardMat);
        stache.rotation.x = Math.PI / 2;
        stache.position.set(0.80, -0.19, 0);
        headGroup.add(stache);
      } else {
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
      // Aerodynamic Full-Face Sports Motorcycle Helmet (Photo 1 Matching Aerodynamic Shell)
      const HELMET_PRESETS = [
        { shell: 0x2563eb, decal: 0xf8fafc }, // Photo 1 Electric Cobalt Blue!
        { shell: 0xea580c, decal: 0xf8fafc }, // Photo 1 Neon Flame Orange hoodie match!
        { shell: 0xdc2626, decal: 0xf8fafc }, // Candy Sport Red
        { shell: 0xf8fafc, decal: 0x18181b }, // Pearl Arctic White
        { shell: 0x18181b, decal: 0x22c55e }, // Stealth Black & Lime
        { shell: 0x059669, decal: 0xf8fafc }, // Kawasaki Emerald Green
        { shell: 0x6366f1, decal: 0xf8fafc }, // Deep Royal Purple
        { shell: 0xeab308, decal: 0x18181b }  // Solar Track Yellow
      ];
      const hSeed = (typeof appearanceSeed !== 'undefined') ? appearanceSeed : 0;
      const hPreset = HELMET_PRESETS[Math.abs(hSeed) % HELMET_PRESETS.length];
      const tex = getAerodynamicHelmetTexture(hPreset.shell, hPreset.decal);

      const helmetMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.12,
        metalness: 0.45
      });
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.03,
        metalness: 0.94,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide
      });
      const darkVentMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.35,
        metalness: 0.60
      });
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xd9e4ff,
        roughness: 0.15,
        metalness: 0.88
      });

      // 1. Aerodynamic Contoured Shell (Elongated oval sportbike helmet profile)
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.88, 36, 28),
        helmetMat
      );
      shell.scale.set(1.22, 1.05, 0.90);
      shell.position.set(-0.04, 0.04, 0);
      headGroup.add(shell);

      // 2. Aerodynamic Rear Ducktail Spoiler Lip (Photo 1)
      const spoiler = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.10, 1.05),
        helmetMat
      );
      spoiler.position.set(-0.84, 0.18, 0);
      spoiler.rotation.z = -0.32;
      headGroup.add(spoiler);

      // 3. Molded Chin Guard Bar (Flush with shell)
      const chinBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.86, 0.80, 0.42, 28, 1, false, -Math.PI * 0.35, Math.PI * 0.70),
        helmetMat
      );
      chinBar.scale.set(1.18, 1.0, 0.88);
      chinBar.position.set(0.18, -0.26, 0);
      chinBar.rotation.z = 0.08;
      headGroup.add(chinBar);

      // Chin Air Intake Grille
      const chinVent = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.14, 0.36),
        darkVentMat
      );
      chinVent.position.set(1.08, -0.25, 0);
      headGroup.add(chinVent);

      // Top Ram-Air Intake Scoop
      const topVent = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.08, 0.26),
        darkVentMat
      );
      topVent.position.set(0.14, 0.96, 0);
      topVent.rotation.z = -0.12;
      headGroup.add(topVent);

      // 4. Dark Smoke / Iridescent Tinted Curved Visor (Photo 1)
      const visor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.91, 0.88, 0.46, 28, 1, true, -Math.PI * 0.35, Math.PI * 0.70),
        visorMat
      );
      visor.scale.set(1.18, 1.0, 0.88);
      visor.position.set(0.19, 0.10, 0);
      headGroup.add(visor);

      // Visor Hinge Pivot Discs
      [-1, 1].forEach(side => {
        const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 16), chromeMat);
        pivot.rotation.x = Math.PI / 2;
        pivot.position.set(0.06, 0.12, side * 0.82);
        headGroup.add(pivot);
      });

      // Bottom Neck Padded Collar
      const neckSeal = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.10, 10, 24),
        darkVentMat
      );
      neckSeal.rotation.x = Math.PI / 2;
      neckSeal.scale.set(1.18, 0.88, 1.0);
      neckSeal.position.set(-0.05, -0.44, 0);
      headGroup.add(neckSeal);
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
    });

    // Zero-Lag Additive Headlight Ground Light Pool
    const headGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const headPool = new THREE.Mesh(new THREE.PlaneGeometry(36, 18), headGlowMat);
    headPool.rotation.x = -Math.PI / 2;
    headPool.position.set(frontWheelX + 18, 0.08, 0);
    group.add(headPool);

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(group);
    }
    return group;
  }

  window.createRealisticGTABike = createRealisticGTABike;














  // 3D Canonical Vehicle Builders (all built facing +X direction)
  function create3DVehicle(type, colorHex, appearanceId, vData) {
    if (type === 'car') {
      const car = createAerodynamicCar();
      scene.add(car);
      return car;
    }
    if (type === 'bike') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      if (sportbikePrototypeModel) {
        const bikeGroup = new THREE.Group();
        replaceBikeWithModel(bikeGroup, sportbikePrototypeModel, colorHex, appearanceSeed);
        if (typeof scene !== 'undefined' && scene && scene.add) scene.add(bikeGroup);
        return bikeGroup;
      }
      const bike = createRealisticGTABike(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) {
        scene.add(bike);
      }
      return bike;
    }
    if (type === 'cng' && cngPrototypeModel) {
      const cngGroup = new THREE.Group();
      replaceCNGWithModel(cngGroup, cngPrototypeModel);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(cngGroup);
      return cngGroup;
    }
    if (type === 'rickshaw' && rickshawPrototypeModel) {
      const rickGroup = new THREE.Group();
      replaceRickshawWithModel(rickGroup, rickshawPrototypeModel);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(rickGroup);
      return rickGroup;
    }
    if (type === 'bus' && busPrototypeModel) {
      const busGroup = new THREE.Group();
      replaceBusWithModel(busGroup, busPrototypeModel);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(busGroup);
      return busGroup;
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
      if (busPrototypeModel) {
        replaceBusWithModel(group, busPrototypeModel);
        return group;
      }
      const length = 76;
      const width = 22;
      const height = 23;

      // 1. Lower White Body Shell (Photo 3 Color Combination)
      const lowerGeo = new THREE.BoxGeometry(length, 9.2, width);
      const lowerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.05 });
      const lowerBody = new THREE.Mesh(lowerGeo, lowerMat);
      lowerBody.position.y = 8.6;
      lowerBody.castShadow = true;
      group.add(lowerBody);

      // Lower Black Protective Rocker Trim Skirt
      const rockerGeo = new THREE.BoxGeometry(length + 0.2, 1.4, width + 0.2);
      const rocker = new THREE.Mesh(rockerGeo, vehicleBumperMat);
      rocker.position.y = 4.7;
      group.add(rocker);

      // 2. Upper Red Window Header & Roof (Photo 3 Color Combination)
      const upperHeaderGeo = new THREE.BoxGeometry(length, 2.6, width + 0.1);
      const redMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.25, metalness: 0.15 });
      const upperHeader = new THREE.Mesh(upperHeaderGeo, redMat);
      upperHeader.position.y = 20.2;
      group.add(upperHeader);

      const roofGeo = new THREE.BoxGeometry(length, 1.8, width);
      const roof = new THREE.Mesh(roofGeo, redMat);
      roof.position.y = 22.0;
      group.add(roof);

      // Rooftop Streamlined AC Unit Pod in Silver/White (Matching Photos 2 & 3!)
      const acPodMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.35 });
      const acPodGeo = new THREE.BoxGeometry(length * 0.55, 2.6, width * 0.65);
      const acPod = new THREE.Mesh(acPodGeo, acPodMat);
      acPod.position.set(-2, 23.8, 0);
      group.add(acPod);

      // 3. Panoramic Tinted Window Glass
      const cabinGlassMat = new THREE.MeshStandardMaterial({
        color: 0x9bdcf5,
        roughness: 0.15,
        metalness: 0.15,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      });

      // 4. Interior Layout: Driver with Steering Wheel + Commuters with Blue Seats & Yellow Stanchions
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.75 }); // Blue transit seats
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.35 }); // Safety yellow poles
      const passengerPalette = [0xf97316, 0x0284c7, 0x8b5cf6, 0xec4899, 0x22c55e, 0xfacc15];
      const passengerPositions = [-28, -18, -8, 2, 12, 22];

      passengerPositions.forEach((px, idx) => {
        // High-back transit seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 14), seatMat);
        seat.position.set(px, 13.8, 0);
        group.add(seat);

        // Vertical yellow stanchion grab pole
        [-1, 1].forEach(pside => {
          const vPole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 12, 6), poleMat);
          vPole.position.set(px, 15.5, pside * 3.8);
          group.add(vPole);
        });

        // Seated Passenger Figure
        const pShirt = new THREE.MeshStandardMaterial({ color: passengerPalette[idx % passengerPalette.length], roughness: 0.75 });
        const pSkin = new THREE.MeshStandardMaterial({ color: [0xb87958, 0xd4a373, 0xa1623e][idx % 3], roughness: 0.8 });
        
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.8, 3.6), pShirt);
        torso.position.set(px, 16.8, idx % 2 === 0 ? 3.5 : -3.5);
        group.add(torso);

        // Head
        const pHead = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 8), pSkin);
        pHead.position.set(px, 19.5, idx % 2 === 0 ? 3.5 : -3.5);
        group.add(pHead);
      });

      // Front Bus Driver with Angled Steering Wheel
      const driverShirt = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 });
      const driverSkin = new THREE.MeshStandardMaterial({ color: 0xb87958, roughness: 0.8 });
      const dTorso = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.8, 4.0), driverShirt);
      dTorso.position.set(30, 16.5, -3.2);
      group.add(dTorso);
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), driverSkin);
      dHead.position.set(30, 19.2, -3.2);
      group.add(dHead);

      // Steering Wheel
      const steeringGeo = new THREE.TorusGeometry(1.8, 0.24, 8, 16);
      const steeringMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
      const steeringWheel = new THREE.Mesh(steeringGeo, steeringMat);
      steeringWheel.position.set(33.2, 17.5, -3.2);
      steeringWheel.rotation.y = Math.PI / 2;
      steeringWheel.rotation.x = 0.55;
      group.add(steeringWheel);

      // Panoramic Continuous Side Window Bays
      const windowXs = [-29, -17, -5, 7, 19, 30];
      [-1, 1].forEach(side => {
        windowXs.forEach(wx => {
          const winMesh = new THREE.Mesh(new THREE.BoxGeometry(10.2, 5.8, 0.35), cabinGlassMat);
          winMesh.position.set(wx, 16.5, side * (width / 2 + 0.12));
          group.add(winMesh);

          // Vertical Black Window Mullion
          const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.2, 0.5), vehicleBumperMat);
          mullion.position.set(wx + 5.5, 16.5, side * (width / 2 + 0.14));
          group.add(mullion);
        });
      });

      // Front Windshield
      const fWin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 7.2, width * 0.92), cabinGlassMat);
      fWin.position.set(length / 2 + 0.12, 16.8, 0);
      group.add(fWin);

      // Front Destination LED Route Board: "VIP 27 · MIRPUR 10"
      const destTex = createSignboardTexture('VIP 27 · MIRPUR 10', 'VIP TRANSIT', '#090d16', '#fbbf24', '#f59e0b', '#fbbf24', 256, 64);
      const destGeo = new THREE.BoxGeometry(1.6, 4.2, 16);
      const dest = new THREE.Mesh(destGeo, new THREE.MeshBasicMaterial({ map: destTex }));
      dest.position.set(length / 2 + 0.45, 20.8, 0);
      group.add(dest);

      // Rear Heavy Bumper
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, width + 0.8), vehicleBumperMat);
      rBump.position.set(-length / 2 - 0.8, 4.0, 0);
      group.add(rBump);

      // Left & Right Side Rearview Mirrors on Extended Stalks
      [-1, 1].forEach(side => {
        const mirrorStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.2, 6), vehicleBumperMat);
        mirrorStalk.position.set(length / 2 - 1, 16.5, side * (width / 2 + 1.6));
        group.add(mirrorStalk);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.6, 1.2), vehicleBumperMat);
        mirror.position.set(length / 2 - 1, 16.5, side * (width / 2 + 2.4));
        group.add(mirror);
      });

      // 4 Heavy-Duty Bus Wheels touching ground (radius 4.2, center y = 4.2)
      [-1, 1].forEach(wz => {
        [-23, 23].forEach(wx => {
          addVehicleWheel(wx, 4.2, wz * (width / 2), 4.2, 2.4);
        });
      });

      // Front Triple-Beam Round Headlights (Exact Match to Photos 2 & 3!)
      [-1, 1].forEach(side => {
        [6.0, 7.6, 9.2].forEach(hz => {
          const hl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.0, 12), vehicleHeadlightMat);
          hl.rotation.z = Math.PI / 2;
          hl.position.set(length / 2 + 0.6, 7.8, side * hz);
          group.add(hl);
        });
      });

      // Vertical Rear Triple Taillight Clusters
      [-8, 8].forEach(tz => {
        const tlRed = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.8), vehicleTaillightMat);
        tlRed.position.set(-length / 2 - 0.6, 8.5, tz);
        group.add(tlRed);
        const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.6, 1.8), vehicleIndicatorMat);
        tlAmber.position.set(-length / 2 - 0.6, 6.2, tz);
        group.add(tlAmber);
      });

    } else if (type === 'cng') {
      if (cngPrototypeModel) {
        replaceCNGWithModel(group, cngPrototypeModel);
        return group;
      }
      const length = 31;
      const width = 16.5;

      // 1. Bangladesh-Style Emerald Green Auto-Rickshaw Body (Exact Match to Picture 3)
      const bodyGeo = new THREE.BoxGeometry(20, 4.5, width - 1.2);
      const cngGreenMat = new THREE.MeshStandardMaterial({
        color: 0x15803d, // Rich Dhaka CNG Emerald Green
        roughness: 0.35,
        metalness: 0.22
      });
      const body = new THREE.Mesh(bodyGeo, cngGreenMat);
      body.position.set(-2, 4.4, 0);
      body.castShadow = true;
      group.add(body);

      // Yellow Lower Rocker Panel & Side Trim
      const yellowTrimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
      const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 0.35), yellowTrimMat);
      [-1, 1].forEach(side => {
        const stripe = sideStripe.clone();
        stripe.position.set(-2, 6.8, side * (width / 2 + 0.08));
        group.add(stripe);
      });

      // 2. Side Door Panels with Protective Diamond Wire Mesh & "FOR HIRE / ONE PARIBAHAN" Decals
      const decalMat = new THREE.MeshBasicMaterial({
        map: getCngSideDecalTexture(),
        transparent: true,
        side: THREE.DoubleSide
      });
      [-1, 1].forEach(side => {
        const doorPanel = new THREE.Mesh(new THREE.PlaneGeometry(16, 8.5), decalMat);
        doorPanel.position.set(-2.5, 8.8, side * (width / 2 + 0.18));
        if (side < 0) doorPanel.rotation.y = Math.PI;
        group.add(doorPanel);
      });

      // 3. Festive Colorful Dangling Triangular Bunting Flags (Matching Picture 3 Under Visor)
      const buntingColors = [0xef4444, 0xfacc15, 0x2563eb, 0xf97316, 0x22c55e];
      for (let f = 0; f < 7; f++) {
        const bz = -width / 2 + 2.2 + (f * (width - 4.4) / 6);
        const flagGeo = new THREE.ConeGeometry(0.7, 1.8, 3);
        const flagMat = new THREE.MeshBasicMaterial({ color: buntingColors[f % buntingColors.length] });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.rotation.z = Math.PI;
        flag.position.set(7.8, 12.0, bz);
        group.add(flag);
      }

      // 4. Passenger Bench & Driver Seating
      const pSeatGeo = new THREE.BoxGeometry(7.5, 3.2, width - 2.5);
      const pSeatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const pSeat = new THREE.Mesh(pSeatGeo, pSeatMat);
      pSeat.position.set(-6.5, 5.5, 0);
      group.add(pSeat);

      // Driver Seat
      const dSeatGeo = new THREE.BoxGeometry(4.2, 3.2, 9);
      const dSeat = new THREE.Mesh(dSeatGeo, pSeatMat);
      dSeat.position.set(1.5, 5.5, 0);
      group.add(dSeat);

      // 5. Sculpted Dark Green / Black Leather Canopy with Scalloped Yellow Border
      const canopyGeo = new THREE.BoxGeometry(22.5, 2.2, width);
      const canopyMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.65 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(-2, 13.5, 0);
      group.add(canopy);

      const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(23.0, 0.65, width + 0.5), yellowTrimMat);
      roofTrim.position.set(-2, 12.4, 0);
      group.add(roofTrim);

      // Front Visor Brow
      const visorGeo = new THREE.BoxGeometry(2.4, 0.9, width - 1.0);
      const visor = new THREE.Mesh(visorGeo, yellowTrimMat);
      visor.position.set(8.5, 13.0, 0);
      group.add(visor);

      // Tinted Front Windshield
      const winGeo = new THREE.BoxGeometry(1.2, 5.6, width - 2.5);
      const winMat = new THREE.MeshStandardMaterial({
        color: 0xa5dfec,
        roughness: 0.22,
        metalness: 0.15,
        transparent: true,
        opacity: 0.32,
        depthWrite: false
      });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(7.2, 10.2, 0);
      group.add(win);

      // 6. Front Single Wheel Fork with Coiled Suspension Spring
      const forkGeo = new THREE.CylinderGeometry(0.75, 0.75, 6.4, 8);
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.85, roughness: 0.25 });
      const fork = new THREE.Mesh(forkGeo, chromeMat);
      fork.position.set(9.8, 5.6, 0);
      group.add(fork);

      // Handlebars
      const hbarGeo = new THREE.BoxGeometry(1.0, 0.8, 8.5);
      const hbar = new THREE.Mesh(hbarGeo, vehicleBumperMat);
      hbar.position.set(7.5, 8.6, 0);
      group.add(hbar);

      // Digital Fare Meter Box on Dashboard (Mirpur 10 Standard)
      const meterGeo = new THREE.BoxGeometry(1.2, 1.2, 2.0);
      const meterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const meter = new THREE.Mesh(meterGeo, meterMat);
      meter.position.set(7.8, 9.4, 2.4);
      group.add(meter);
      const meterLed = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 1.2), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      meterLed.position.set(7.25, 9.4, 2.4);
      group.add(meterLed);

      // 7. Wheels: 1 Front (at +X), 2 Rear (at -X; radius 2.6, center y = 2.6)
      addVehicleWheel(9.8, 2.6, 0, 2.6, 1.4);
      [-1, 1].forEach(wz => {
        addVehicleWheel(-7.8, 2.6, wz * (width / 2), 2.6, 1.4);
      });

      // Rear Mounted Spare Tire on Back Hatch (Signature Dhaka CNG Feature)
      const spareTire = new THREE.Mesh(getSharedWheelGeo(2.4, 1.2, 10), sharedWheelMat);
      spareTire.rotation.y = Math.PI / 2;
      spareTire.position.set(-12.8, 6.2, 0);
      group.add(spareTire);
      const spareCap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 8), yellowTrimMat);
      spareCap.rotation.z = Math.PI / 2;
      spareCap.position.set(-12.8, 6.2, 0);
      group.add(spareCap);

      // 8. Seated Driver & Seated Passengers
      const driverShirts = [0xf8fafc, 0x166534, 0x1d4ed8, 0x7c2d12];
      const driverTrousers = [0x334155, 0x292524, 0x1e293b, 0x475569];
      addSeatedFigure(
        2.2,
        5.7,
        0,
        driverShirts[appearanceSeed % driverShirts.length],
        driverTrousers[(appearanceSeed >>> 3) % driverTrousers.length],
        true
      );
      // Seated Passengers
      const passengerShirts = [0xf59e0b, 0xdb2777];
      passengerShirts.forEach((shirtColor, index) => {
        addSeatedFigure(
          index === 0 ? -9.0 : -3.5,
          5.5,
          2.6,
          shirtColor,
          index === 0 ? 0x334155 : 0x1f2937,
          false
        );
      });

      // 9. Chrome Front Round Headlight with Polished Bezel Ring (Matching Picture 3)
      const hlCasingGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.6, 16);
      const hlCasing = new THREE.Mesh(hlCasingGeo, chromeMat);
      hlCasing.rotation.z = Math.PI / 2;
      hlCasing.position.set(11.4, 6.2, 0);
      group.add(hlCasing);

      const hlLensGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.4, 16);
      const hlLens = new THREE.Mesh(hlLensGeo, vehicleHeadlightMat);
      hlLens.rotation.z = Math.PI / 2;
      hlLens.position.set(12.2, 6.2, 0);
      group.add(hlLens);

      // Front Amber Turn Signal Indicators on Fenders
      [-5.0, 5.0].forEach(iz => {
        const ind = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 1.2), vehicleIndicatorMat);
        ind.position.set(9.4, 5.8, iz);
        group.add(ind);
      });

      // Rear Taillights & Bengali Number Plate: "ঢাকা মেট্রো-থ ১১-৪৫৬৭"
      const tlGeo = new THREE.BoxGeometry(0.8, 1.8, 2.5);
      const tl = new THREE.Mesh(tlGeo, vehicleTaillightMat);
      tl.position.set(-12.4, 4.8, 0);
      group.add(tl);

    } else if (type === 'rickshaw') {
      if (rickshawPrototypeModel) {
        replaceRickshawWithModel(group, rickshawPrototypeModel);
        return group;
      }
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
            const hip = [-0.10, 1.85, side * 0.58];
            const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.48, 2.7, 10), pants); // Folded blue lungi
            const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.36, 2.7, 10), skin);   // Bare calf
            const shoeMesh = box([1.18, 0.42, 0.65], [0, 0, 0], shoe);                            // Sandal
            person.add(thigh);
            person.add(shin);
            pedalLegs.push({
              hip,
              side,
              thigh,
              shin,
              shoe: shoeMesh,
              lenThigh: 2.7,
              lenShin: 2.7
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
          const legPhase = phase + (leg.side > 0 ? 0 : Math.PI);
          const pedalTarget = new THREE.Vector3(1.45 * Math.cos(legPhase), 1.45 * Math.sin(legPhase), leg.side * 1.12)
            .add(pivot)
            .sub(person.position);

          const H = new THREE.Vector3(leg.hip[0], leg.hip[1], leg.hip[2]);
          const P = pedalTarget;
          const diff = P.clone().sub(H);
          const D = Math.max(0.6, Math.min(diff.length(), leg.lenThigh + leg.lenShin - 0.05));

          const cosAlpha = Math.max(-1, Math.min(1, (leg.lenThigh * leg.lenThigh + D * D - leg.lenShin * leg.lenShin) / (2 * leg.lenThigh * D)));
          const alpha = Math.acos(cosAlpha);

          const dir = diff.clone().normalize();
          let norm = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
          if (norm.x < 0) norm.negate();

          const K = H.clone().addScaledVector(dir, leg.lenThigh * Math.cos(alpha)).addScaledVector(norm, leg.lenThigh * Math.sin(alpha));

          const thighDir = K.clone().sub(H);
          leg.thigh.position.copy(H).add(K).multiplyScalar(0.5);
          leg.thigh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), thighDir.normalize());

          const shinDir = P.clone().sub(K);
          leg.shin.position.copy(K).add(P).multiplyScalar(0.5);
          leg.shin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shinDir.normalize());

          leg.shoe.position.set(P.x + 0.15, P.y, P.z);
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
        shirt: 0x6b21a8,
        pants: 0x1d4ed8,
        skin: 0xb87958,
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

      // Traditional Hand-Painted Dhaka Rickshaw Art Tinplate Backboard
      const artPlateGeo = new THREE.BoxGeometry(0.35, 7.2, 14.6);
      const artPlateMat = new THREE.MeshStandardMaterial({
        map: getRickshawArtTexture(),
        roughness: 0.35,
        metalness: 0.25
      });
      const artPlate = new THREE.Mesh(artPlateGeo, artPlateMat);
      artPlate.position.set(-11.5, 6.2, 0);
      group.add(artPlate);

    } else if (type === 'bike') {
      const bike = createRealisticGTABike(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) {
        scene.add(bike);
      }
      return bike;
    }

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(group);
    }
    return group;
  }
  window.create3DVehicle = create3DVehicle;

  function loadGLBModel(path) {
    if (!gltfModelPromises[path]) {
      gltfModelPromises[path] = new Promise((resolve, reject) => {
        if (typeof THREE.GLTFLoader !== 'function') {
          reject(new Error('Three.js GLTFLoader is unavailable'));
          return;
        }
        new THREE.GLTFLoader().load(
          path,
          gltf => resolve(gltf.scene),
          undefined,
          reject
        );
      });
    }
    return gltfModelPromises[path];
  }

  function loadCycleRickshawModel() {
    return loadGLBModel('assets/models/cycle-rickshaw.glb?v=20261111-pic3');
  }

  let sportbikePrototypeModel = null;
  let cngPrototypeModel = null;
  let rickshawPrototypeModel = null;

  function loadSportbikeModel() {
    return loadGLBModel('assets/models/sportbike-rider.glb?v=20261111-pic8');
  }

  function loadCNGModel() {
    return loadGLBModel('assets/models/cng-autorickshaw.glb?v=20261111-pic4');
  }

  let busPrototypeModel = null;

  function loadBusModel() {
    return loadGLBModel('assets/models/dhaka-bus.glb?v=20261111-brtc');
  }

  const carModelFiles = [
    'assets/models/car-sedan.glb?v=20261109-1',
    'assets/models/car-muscle.glb?v=20261109-1',
    'assets/models/car-delorean.glb?v=20261109-1',
    'assets/models/car-hypercar.glb?v=20261109-1'
  ];

  function loadCarModel() {
    return loadGLBModel('assets/models/private-car.glb?v=20261109-1');
  }

  function loadAllCarModels() {
    return Promise.all(
      carModelFiles.map(file =>
        loadGLBModel(file).catch(err => {
          console.warn('Failed loading ' + file + ', using fallback:', err);
          return loadCarModel();
        })
      )
    );
  }

  function loadMetroModel() {
    return loadGLBModel('assets/models/dhaka-metro.glb');
  }

  function loadPedestriansModel() {
    return loadGLBModel('assets/models/pedestrians.glb');
  }

  function replaceRickshawWithModel(vehicle, prototype) {
    vehicle.scale.set(1, 1, 1);
    const model = prototype.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const dimensions = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(dimensions.x) || dimensions.x <= 0 || !Number.isFinite(bounds.min.y)) {
      throw new Error('The Blender cycle-rickshaw model has invalid dimensions');
    }

    const scale = 26 / dimensions.x;
    model.scale.setScalar(scale);
    model.position.set(
      -(bounds.min.x + bounds.max.x) * scale / 2,
      -bounds.min.y * scale,
      -(bounds.min.z + bounds.max.z) * scale / 2
    );

    const wheels = [];
    let pedalCrank = null;
    model.traverse(node => {
      const name = node.name.toLowerCase();
      if (/^wheel_(front|rear_(left|right))$/.test(name)) wheels.push(node);
      if (name === 'pedal_crank') pedalCrank = node;
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    if (wheels.length !== 3) {
      throw new Error(`The Blender cycle-rickshaw model must contain three named wheel pivots; found ${wheels.length}`);
    }

    while (vehicle.children.length) vehicle.remove(vehicle.children[0]);
    vehicle.add(model);
    vehicle.userData.wheels = wheels;
    vehicle.userData.wheelRadius = 3.65;
    vehicle.userData.pedalCrank = pedalCrank;

    const thighL = model.getObjectByName('Puller_Thigh_L');
    const shinL = model.getObjectByName('Puller_Shin_L');
    const thighR = model.getObjectByName('Puller_Thigh_R');
    const shinR = model.getObjectByName('Puller_Shin_R');

    [thighL, shinL, thighR, shinR].forEach(bone => {
      if (bone) bone.userData.initQuat = bone.quaternion.clone();
    });

    vehicle.userData.updatePedaling = function(phase) {
      if (pedalCrank) pedalCrank.rotation.z = phase;
      const sinL = Math.sin(phase);
      const cosL = Math.cos(phase);
      const qZ = new THREE.Quaternion();
      if (thighL && thighL.userData.initQuat) {
        qZ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), sinL * 0.38);
        thighL.quaternion.copy(thighL.userData.initQuat).multiply(qZ);
      }
      if (shinL && shinL.userData.initQuat) {
        qZ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), cosL * 0.45);
        shinL.quaternion.copy(shinL.userData.initQuat).multiply(qZ);
      }
      if (thighR && thighR.userData.initQuat) {
        qZ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -sinL * 0.38);
        thighR.quaternion.copy(thighR.userData.initQuat).multiply(qZ);
      }
      if (shinR && shinR.userData.initQuat) {
        qZ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -cosL * 0.45);
        shinR.quaternion.copy(shinR.userData.initQuat).multiply(qZ);
      }
    };
  }

  function replaceBikeWithModel(vehicle, prototype, bikeColor, seed) {
    vehicle.scale.set(1, 1, 1);
    const model = prototype.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const dimensions = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(dimensions.x) || dimensions.x <= 0 || !Number.isFinite(bounds.min.y)) return;

    const scale = 23 / dimensions.x;
    model.scale.setScalar(scale);
    model.position.set(
      -(bounds.min.x + bounds.max.x) * scale / 2,
      -bounds.min.y * scale,
      -(bounds.min.z + bounds.max.z) * scale / 2
    );

    const wheels = [];
    const outfitIndex = Math.abs((seed || 0) % 4);
    const outfitPacks = [
      { jacket: 0x18181b, shirt: 0xf8fafc, jeans: 0x1e293b }, // Outfit A: Streetfighter Biker
      { jacket: 0x7f1d1d, shirt: 0xf8fafc, jeans: 0x27272a }, // Outfit B: Varsity Jacket
      { jacket: 0x475569, shirt: 0xf8fafc, jeans: 0x334155 }, // Outfit C: Urban Streetwear
      { jacket: 0x065f46, shirt: 0xfef08a, jeans: 0x172554 }  // Outfit D: Dhaka Commuter
    ];
    const outfit = outfitPacks[outfitIndex];

    const helmetColors = [
      0x0066f5, // Picture 8 Electric Cobalt Blue
      0xf97316, // Sunset Orange
      0xdc2626, // Crimson Red
      0x18181b, // Matte Black
      0x059669, // Emerald Green
      0x7c3aed, // Royal Purple
      0xf8fafc, // Pearl White
      0xeab308  // Track Yellow
    ];
    const riderHelmetColor = helmetColors[Math.abs((seed || 0) % helmetColors.length)];

    model.traverse(node => {
      const name = (node.name || '').toLowerCase();
      if (name === 'wheel_f' || name === 'wheel_r' || name === 'wheel_front' || name === 'wheel_rear') {
        wheels.push(node);
      }
      if (node.isMesh && node.material) {
        const matName = node.material.name || '';
        if (bikeColor && (matName.includes('Fairing_YamahaBlue') || matName.includes('Fairing_Blue') || matName.includes('Rim_'))) {
          node.material = node.material.clone();
          node.material.color.setHex(bikeColor);
        }
        if (matName.includes('Helmet_BlueGloss') || matName.includes('Helmet_Shell') || matName.includes('Helmet_Paint')) {
          node.material = node.material.clone();
          node.material.color.setHex(riderHelmetColor);
        }
        if (matName.includes('Helmet_CyanStripe') || matName.includes('Helmet_Decal')) {
          node.material = node.material.clone();
          node.material.color.setHex(0xf8fafc); // Crisp Picture 8 contrasting swoop stripe
        }
        if (matName.includes('Rider_LeatherJacket') || matName.includes('Rider_BlackLeather')) {
          node.material = node.material.clone();
          node.material.color.setHex(outfit.jacket);
        }
        if (matName.includes('Rider_CrewTShirt') || matName.includes('Rider_WhiteTShirt')) {
          node.material = node.material.clone();
          node.material.color.setHex(outfit.shirt);
        }
        if (matName.includes('Rider_IndigoJeans') || matName.includes('Rider_DarkJeans')) {
          node.material = node.material.clone();
          node.material.color.setHex(outfit.jeans);
        }
        if (matName.toLowerCase().includes('windscreen') || matName.toLowerCase().includes('glass') || matName.toLowerCase().includes('windshield') || matName.toLowerCase().includes('visor')) {
          node.material = node.material.clone();
          node.material.transparent = true;
          node.material.opacity = 0.38;
          node.material.depthWrite = false;
        }
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    while (vehicle.children.length) vehicle.remove(vehicle.children[0]);
    vehicle.add(model);
    vehicle.userData.wheels = wheels;
    vehicle.userData.wheelRadius = 3.0;
  }

  function replaceCNGWithModel(vehicle, prototype) {
    vehicle.scale.set(1, 1, 1);
    const model = prototype.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const dimensions = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(dimensions.x) || dimensions.x <= 0 || !Number.isFinite(bounds.min.y)) return;

    const scale = 31 / dimensions.x;
    model.scale.setScalar(scale);
    model.position.set(
      -(bounds.min.x + bounds.max.x) * scale / 2,
      -bounds.min.y * scale,
      -(bounds.min.z + bounds.max.z) * scale / 2
    );

    const wheels = [];
    model.traverse(node => {
      const name = (node.name || '').toLowerCase();
      if (name === 'wheel_front' || name === 'wheel_rear_left' || name === 'wheel_rear_right' || name === 'wheel_rear_l' || name === 'wheel_rear_r') wheels.push(node);
      if (node.isMesh && node.material) {
        const matName = (node.material.name || '').toLowerCase();
        if (matName.includes('glass') || name.includes('glass') || matName.includes('windshield') || name.includes('windshield') || matName.includes('window') || name.includes('window')) {
          node.material = node.material.clone();
          node.material.transparent = true;
          node.material.opacity = 0.65;
          node.material.roughness = 0.08;
          node.material.metalness = 0.15;
          node.material.depthWrite = false;
        }
      }
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    while (vehicle.children.length) vehicle.remove(vehicle.children[0]);
    vehicle.add(model);
    vehicle.userData.wheels = wheels;
    vehicle.userData.wheelRadius = 2.6;
  }

  function replaceBusWithModel(vehicle, prototype) {
    vehicle.scale.set(1, 1, 1);
    const model = prototype.clone(true);

    // Auto-orient model along canonical +X heading
    const initialBounds = new THREE.Box3().setFromObject(model);
    const initDim = initialBounds.getSize(new THREE.Vector3());
    if (initDim.z > initDim.x) {
      // In Blender, front is -Y (which maps to +Z in GLTF export_yup=True) and rear is +Y.
      // Rotating by Math.PI / 2 around Y turns +Z to +X (canonical forward motion).
      model.rotation.y = Math.PI / 2;
    }

    const orienter = new THREE.Group();
    orienter.add(model);

    const bounds = new THREE.Box3().setFromObject(orienter);
    const dimensions = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(dimensions.x) || dimensions.x <= 0 || !Number.isFinite(bounds.min.y)) return;

    const scale = 76 / dimensions.x;
    orienter.scale.setScalar(scale);
    orienter.position.set(
      -(bounds.min.x + bounds.max.x) * scale / 2,
      -bounds.min.y * scale,
      -(bounds.min.z + bounds.max.z) * scale / 2
    );

    const wheels = [];
    model.traverse(node => {
      const name = (node.name || '').toLowerCase();
      if (name === 'wheel_fl' || name === 'wheel_fr' || name === 'wheel_rl' || name === 'wheel_rr') {
        wheels.push(node);
      }
      if (node.isMesh && node.material) {
        const matName = (node.material.name || '').toLowerCase();
        if (matName.includes('glass') || name.includes('glass') || matName.includes('windshield') || name.includes('windshield') || matName.includes('window') || name.includes('window')) {
          node.material = node.material.clone();
          node.material.transparent = true;
          node.material.opacity = 0.55;
          node.material.roughness = 0.08;
          node.material.metalness = 0.15;
          node.material.depthWrite = false;
        }
      }
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    while (vehicle.children.length) vehicle.remove(vehicle.children[0]);
    vehicle.add(orienter);
    vehicle.userData.wheels = wheels;
    vehicle.userData.wheelRadius = 3.3;
  }

  function replaceCarWithModel(vehicle, prototype) {
    vehicle.scale.set(1, 1, 1);
    const model = prototype.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const dimensions = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(dimensions.x) || dimensions.x <= 0 || !Number.isFinite(bounds.min.y)) return;

    const scale = 46 / dimensions.x;
    model.scale.setScalar(scale);
    model.position.set(
      -(bounds.min.x + bounds.max.x) * scale / 2,
      -bounds.min.y * scale,
      -(bounds.min.z + bounds.max.z) * scale / 2
    );

    const wheels = [];
    model.traverse(node => {
      const name = (node.name || '').toLowerCase();
      if (name === 'wheel_fl' || name === 'wheel_fr' || name === 'wheel_rl' || name === 'wheel_rr') {
        wheels.push(node);
      }
      if (node.isMesh && node.material) {
        const matName = (node.material.name || '').toLowerCase();
        if (matName.includes('glass') || name.includes('glass') || matName.includes('windshield') || name.includes('windshield') || matName.includes('window') || name.includes('window')) {
          node.material = node.material.clone();
          node.material.transparent = true;
          node.material.opacity = 0.65;
          node.material.roughness = 0.08;
          node.material.metalness = 0.15;
          node.material.depthWrite = false;
        }
      }
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    while (vehicle.children.length) vehicle.remove(vehicle.children[0]);
    vehicle.add(model);
    vehicle.userData.wheels = wheels;
    vehicle.userData.wheelRadius = 3.3;
  }

  function replaceMetroTrainWithModel(prototype) {
    if (!trainGroup) return;
    const bounds = new THREE.Box3().setFromObject(prototype);
    const dimensions = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(dimensions.x) || dimensions.x <= 0) return;

    const scale = 72 / dimensions.x;
    while (trainGroup.children.length) trainGroup.remove(trainGroup.children[0]);

    [-75, 0, 75].forEach(xOffset => {
      const coach = prototype.clone(true);
      coach.scale.setScalar(scale);
      coach.position.set(xOffset - (bounds.min.x + bounds.max.x) * scale / 2, -bounds.min.y * scale, -(bounds.min.z + bounds.max.z) * scale / 2);
      coach.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });
      trainGroup.add(coach);
    });
  }

  function replacePedestriansWithModel(prototype) {
    const maleProto = prototype.getObjectByName('Pedestrian_Male') || prototype;
    const femaleProto = prototype.getObjectByName('Pedestrian_Female') || prototype;

    Object.values(pedMeshMap).forEach((pedEntry, idx) => {
      if (!pedEntry || !pedEntry.mesh) return;
      const isFemale = idx % 2 === 1;
      const charProto = isFemale ? femaleProto : maleProto;
      const clone = charProto.clone(true);
      const bounds = new THREE.Box3().setFromObject(clone);
      const dims = bounds.getSize(new THREE.Vector3());
      if (dims.y > 0) {
        const scale = 16 / dims.y;
        clone.scale.setScalar(scale);
        clone.rotation.y = -Math.PI / 2; // Aligns GLTF model forward (+X) to canonical forward (+Z)
        clone.position.set(0, -bounds.min.y * scale, 0);
      }
      clone.traverse(n => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
          if (n.material) {
            const matName = (n.material.name || '').toLowerCase();
            const outfitColors = [
              { panjabi: 0xf8fafc, pajama: 0xe2e8f0, saree: 0xdc2626, gold: 0xfacc15 },
              { panjabi: 0x1e3a8a, pajama: 0xf1f5f9, saree: 0x059669, gold: 0xfde047 },
              { panjabi: 0x065f46, pajama: 0xfef08a, saree: 0x7c3aed, gold: 0xfacc15 },
              { panjabi: 0x7c2d12, pajama: 0xe2e8f0, saree: 0xdb2777, gold: 0xfde047 },
              { panjabi: 0x312e81, pajama: 0xf1f5f9, saree: 0xe11d48, gold: 0xfacc15 },
              { panjabi: 0x475569, pajama: 0x1e293b, saree: 0x0d9488, gold: 0xfde047 }
            ];
            const pal = outfitColors[idx % outfitColors.length];
            n.material = n.material.clone();
            if (matName.includes('panjabi')) n.material.color.setHex(pal.panjabi);
            if (matName.includes('pajama')) n.material.color.setHex(pal.pajama);
            if (matName.includes('saree') && !matName.includes('gold')) n.material.color.setHex(pal.saree);
            if (matName.includes('gold')) n.material.color.setHex(pal.gold);
          }
        }
      });
      while (pedEntry.mesh.children.length) pedEntry.mesh.remove(pedEntry.mesh.children[0]);
      pedEntry.mesh.add(clone);
    });
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
    let width = 0, height = 0;
    if (containerEl && containerEl.clientWidth > 0 && containerEl.clientHeight > 0) {
      width = containerEl.clientWidth;
      height = containerEl.clientHeight;
    } else if (canvasEl && canvasEl.clientWidth > 0 && canvasEl.clientHeight > 0) {
      width = canvasEl.clientWidth;
      height = canvasEl.clientHeight;
    } else if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      width = 1200;
      height = 700;
    }
    const aspect = (width > 0 && height > 0) ? (width / height) : (1200 / 700);

    camera = new THREE.PerspectiveCamera(38, aspect, 10, 4000);
    updateCameraFraming(aspect);

    // 3. Renderer (High performance WebGL locked to 120 FPS with capped pixel ratio)
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 768 ? 1.5 : 2));
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

    // 4. Lighting: AmbientLight + HemisphereLight + DirectionalLight
    ambientLight = new THREE.AmbientLight(0x64748b, 0.95);
    scene.add(ambientLight);

    hemiLight = new THREE.HemisphereLight(0xd8b4fe, 0x1e0f2e, 1.25);
    scene.add(hemiLight);

    chaseCamLight = new THREE.PointLight(0xfff1dc, 0, 160);
    scene.add(chaseCamLight);

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

    // Platform Edge Yellow Tactile Warning Paving Strip
    const tactilePaving = new THREE.Mesh(
      new THREE.BoxGeometry(240, 0.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
    );
    tactilePaving.position.set(0, 8.2, 11);
    stationGroup.add(tactilePaving);

    // Structural Space-Frame Steel Canopy Trusses (Arched ribs under roof)
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    for (let tx = -100; tx <= 100; tx += 40) {
      const archTruss = new THREE.Mesh(
        new THREE.CylinderGeometry(28.2, 28.2, 1.2, 24, 1, false, 0, Math.PI),
        trussMat
      );
      archTruss.rotation.z = Math.PI / 2;
      archTruss.rotation.y = Math.PI / 2;
      archTruss.position.set(tx, 14, 0);
      stationGroup.add(archTruss);
    }

    // Bilingual Passenger Information LED Display: "● ট্রেন আসছে: ২ মিনিট"
    const nextTrainTex = createSignboardTexture('● ট্রেন আসছে: ২ মিনিট', 'NEXT TRAIN: 2 MIN', '#020617', '#38bdf8', '#4ade80', '#00f2fe', 256, 64);
    const nextTrainMesh = new THREE.Mesh(new THREE.BoxGeometry(90, 16, 2), new THREE.MeshBasicMaterial({ map: nextTrainTex }));
    nextTrainMesh.position.set(-85, 20, 2);
    stationGroup.add(nextTrainMesh);

    freezeStatic(stationGroup);
    scene.add(stationGroup);

    // Tangled Overhead Utility Cables (Dhaka Street Signature Skyline)
    function createDhakaOverheadCables() {
      const cableGroup = new THREE.Group();
      const cableMat = new THREE.MeshBasicMaterial({ color: 0x111827 });

      const cableSpans = [
        // Northwest corner crossing to Southwest corner
        [[-150, 48, -170], [-162, 38, -10], [-150, 46, 140]],
        [[-148, 49, -168], [-160, 39, -5], [-148, 47, 142]],
        [[-146, 47, -172], [-158, 37, -15], [-146, 45, 138]],
        // Northeast corner crossing to Southeast corner
        [[150, 48, -170], [162, 38, -10], [150, 46, 140]],
        [[148, 49, -168], [160, 39, -5], [148, 47, 142]],
        [[146, 47, -172], [158, 37, -15], [146, 45, 138]],
        // Diagonal street crossing NW to SE
        [[-140, 52, -160], [-25, 42, -15], [140, 48, 140]],
        // Viaduct utility conduit bundle along the metro box girder
        [[-600, 44, VIADUCT_Z + 13.5], [0, 44, VIADUCT_Z + 13.5], [600, 44, VIADUCT_Z + 13.5]]
      ];

      cableSpans.forEach(pts => {
        const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
        const cableGeo = new THREE.TubeGeometry(curve, 20, 0.24, 4, false);
        const cableMesh = new THREE.Mesh(cableGeo, cableMat);
        cableGroup.add(cableMesh);
      });

      freezeStatic(cableGroup);
      scene.add(cableGroup);
    }
    createDhakaOverheadCables();

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
      waterTank: true, antenna: true,
      signboard: { text: 'মিরপুর ১০ শপিং কমপ্লেক্স', sub: 'Shopping Complex', bg: '#0369a1', textCol: '#ffffff', border: '#38bdf8', w: 74, h: 16, y: 14 }
    });

    create3DBuilding({
      x: -150, z: -205, width: 68, depth: 55, height: 95,
      wallColor: '#bba77e', sideColor: '#62563f',
      floors: 4, cols: 3, winColor: '#f4dfaa',
      antenna: true,
      signboard: { text: 'বিকাশ ও নগদ এজেন্ট', sub: 'bKash & Nagad Agent', bg: '#be185d', textCol: '#ffffff', border: '#f43f5e', w: 64, h: 16, y: 14 }
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
      signboard: { text: 'ঢাকা ব্যাংক এটিএম 🏧', sub: 'Dhaka Bank ATM 24/7', bg: '#065f46', textCol: '#facc15', border: '#10b981', w: 68, h: 16, y: 14, awnCol: 0x0f766e }
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

    // Southwest Quadrant (Low-rise vibrant street shops)
    create3DBuilding({
      x: -490, z: 235, width: 34, depth: 36, height: 32,
      wallColor: '#b98983', sideColor: '#604745',
      floors: 2, cols: 2, winColor: '#f2d9a9'
    });

    create3DBuilding({
      x: -360, z: 235, width: 140, depth: 40, height: 36,
      wallColor: '#8c9870', sideColor: '#4d5744',
      floors: 2, cols: 5, winColor: '#f0dcb0',
      waterTank: true, antenna: true,
      signboard: { text: 'হাজী বিরিয়ানি ও নান্না কাবাব', sub: 'Authentic Dhaka Biryani', bg: '#78350f', textCol: '#fef08a', border: '#f59e0b', w: 88, h: 14, ox: -20, y: 12, awnCol: 0xb45309 }
    });

    create3DBuilding({
      x: -225, z: 225, width: 55, depth: 32, height: 18,
      wallColor: '#8f8067', sideColor: '#534b3e',
      floors: 1, cols: 2, winColor: '#f1dda9',
      signboard: { text: 'চায়ের টং', sub: 'Traditional Tea Stall', bg: '#78350f', textCol: '#fef08a', border: '#fbbf24', w: 46, h: 10, y: 9, awnCol: 0xb45309 }
    });

    create3DBuilding({
      x: -150, z: 225, width: 65, depth: 34, height: 30,
      wallColor: '#bd9a5c', sideColor: '#665334',
      floors: 2, cols: 3, winColor: '#f4dfaa',
      waterTank: true,
      signboard: { text: 'সোনালী জুয়েলার্স', sub: 'Sonali Jewelers', bg: '#0f172a', textCol: '#fde047', border: '#fbbf24', w: 56, h: 12, y: 11, awnCol: 0xb45309 }
    });

    // Southeast Quadrant (Low-rise vibrant street shops)
    create3DBuilding({
      x: 165, z: 225, width: 85, depth: 36, height: 32,
      wallColor: '#9b7c88', sideColor: '#584650',
      floors: 2, cols: 3, winColor: '#f0dcad',
      antenna: true,
      signboard: { text: 'জনতা ফার্মেসি ✚', sub: 'Clinic & Medicine', bg: '#065f46', textCol: '#ffffff', border: '#10b981', w: 75, h: 12, y: 12, awnCol: 0x047857 }
    });

    const seBillboardBldg = create3DBuilding({
      x: 320, z: 235, width: 140, depth: 40, height: 32,
      wallColor: '#657d95', sideColor: '#354454',
      floors: 2, cols: 4, winColor: '#efdbb2',
      waterTank: true, antenna: true
    });
    const seBbTex = createSignboardTexture('সবাই মিলে একটি ভালো ঢাকা', 'TOWARDS A SMARTER COMMUTE', '#172554', '#ffffff', '#38bdf8', '#00f2fe', 512, 128);
    const seBbGeo = new THREE.BoxGeometry(120, 24, 2.5);
    const seBbSign = new THREE.Mesh(seBbGeo, new THREE.MeshBasicMaterial({ map: seBbTex }));
    seBbSign.position.set(0, 36, 0);
    seBbSign.rotation.x = -0.22;
    seBillboardBldg.add(seBbSign);
    freezeStatic(seBillboardBldg);

    create3DBuilding({
      x: 450, z: 235, width: 45, depth: 38, height: 36,
      wallColor: '#769aa0', sideColor: '#40565d',
      floors: 2, cols: 2, winColor: '#f0ddb3',
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
    // Asynchronously load and integrate Blender 5.2 GTA V-Grade 3D models with fallback
    loadCycleRickshawModel().then(prototype => {
      rickshawPrototypeModel = prototype;
      Object.values(vehicleMeshMap).forEach(vehicle => {
        if (vehicle.data && vehicle.data.type === 'rickshaw') {
          replaceRickshawWithModel(vehicle.mesh, prototype);
        }
      });
    }).catch(err => console.warn('Cycle Rickshaw GLB fallback:', err));

    loadCNGModel().then(prototype => {
      cngPrototypeModel = prototype;
      Object.values(vehicleMeshMap).forEach(vehicle => {
        if (vehicle.data && vehicle.data.type === 'cng') {
          replaceCNGWithModel(vehicle.mesh, prototype);
        }
      });
    }).catch(err => console.warn('CNG GLB fallback:', err));

    loadBusModel().then(prototype => {
      busPrototypeModel = prototype;
      Object.values(vehicleMeshMap).forEach(vehicle => {
        if (vehicle.data && vehicle.data.type === 'bus') {
          replaceBusWithModel(vehicle.mesh, prototype);
        }
      });
    }).catch(err => console.warn('Bus GLB fallback:', err));

    loadSportbikeModel().then(prototype => {
      sportbikePrototypeModel = prototype;
      Object.values(vehicleMeshMap).forEach(vehicle => {
        if (vehicle.data && vehicle.data.type === 'bike') {
          const colorHex = (vehicle.data.color || vehicle.data.bikeColor) ? parseInt((vehicle.data.bikeColor || vehicle.data.color).replace('#', '0x'), 16) : null;
          const appearanceSeed = getAppearanceSeed(vehicle.data.id || vehicle.data.type);
          replaceBikeWithModel(vehicle.mesh, prototype, colorHex, appearanceSeed);
        }
      });
    }).catch(err => console.warn('Sportbike GLB fallback:', err));

    loadAllCarModels().then(carPrototypes => {
      let carCounter = 0;
      Object.values(vehicleMeshMap).forEach(vehicle => {
        if (vehicle.data && vehicle.data.type === 'car') {
          const proto = carPrototypes[carCounter % carPrototypes.length];
          carCounter++;
          replaceCarWithModel(vehicle.mesh, proto);
        }
      });
    }).catch(err => console.warn('Car GLB fallback:', err));

    loadMetroModel().then(prototype => {
      replaceMetroTrainWithModel(prototype);
    }).catch(err => console.warn('Metro GLB fallback:', err));

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
        vehicleOrbitYaw = DEFAULT_VEHICLE_YAW + mouseRelX * Math.PI * 1.5;
        vehicleOrbitPitch = Math.max(0.12, Math.min(0.75, 0.28 - mouseRelY * 0.5));
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

    let pointerDownStartX = 0;
    let pointerDownStartY = 0;
    let pointerDownStartTime = 0;

    canvasEl.style.touchAction = 'auto';
    canvasEl.addEventListener('pointerdown', (e) => {
      pointerDownStartX = e.clientX;
      pointerDownStartY = e.clientY;
      pointerDownStartTime = performance.now();

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
      const elapsed = performance.now() - pointerDownStartTime;
      const dist = Math.hypot(e.clientX - pointerDownStartX, e.clientY - pointerDownStartY);

      if (e.pointerId === orbitPointerId) {
        orbitPointerId = null;
        if (canvasEl.hasPointerCapture(e.pointerId)) {
          canvasEl.releasePointerCapture(e.pointerId);
        }
      }

      // If user tapped or clicked without dragging, raycast to select clicked object/vehicle!
      if (dist < 8 && elapsed < 400) {
        handleSceneRaycastClick(e.clientX, e.clientY);
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

    // -------------------------------------------------------------
    // Interactive 3D Raycaster & Object Telemetry HUD
    // -------------------------------------------------------------
    function handleSceneRaycastClick(clientX, clientY) {
      if (!renderer || !camera || !scene || !canvasEl) return;
      const rect = canvasEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const candidateMeshes = [];
      const hitMap = new Map();

      // 1. Vehicles
      Object.keys(vehicleMeshMap).forEach(vId => {
        const entry = vehicleMeshMap[vId];
        if (entry && entry.mesh && entry.mesh.visible !== false) {
          entry.mesh.traverse(child => {
            if (child.isMesh) {
              candidateMeshes.push(child);
              hitMap.set(child, {
                kind: 'vehicle',
                id: vId,
                type: entry.data.type || 'car',
                data: entry.data,
                mesh: entry.mesh
              });
            }
          });
        }
      });

      // 2. Metro Train
      if (trainGroup && trainGroup.visible !== false) {
        trainGroup.traverse(child => {
          if (child.isMesh) {
            candidateMeshes.push(child);
            hitMap.set(child, {
              kind: 'metro',
              id: 'train_mrt6',
              type: 'metro',
              mesh: trainGroup
            });
          }
        });
      }

      // 3. Ambulance
      if (ambulanceGroup && ambulanceGroup.visible) {
        ambulanceGroup.traverse(child => {
          if (child.isMesh) {
            candidateMeshes.push(child);
            hitMap.set(child, {
              kind: 'ambulance',
              id: 'emergency_ambulance',
              type: 'ambulance',
              mesh: ambulanceGroup
            });
          }
        });
      }

      // 4. Pedestrians
      Object.keys(pedMeshMap).forEach(pId => {
        const entry = pedMeshMap[pId];
        if (entry && entry.mesh) {
          entry.mesh.traverse(child => {
            if (child.isMesh) {
              candidateMeshes.push(child);
              hitMap.set(child, {
                kind: 'walking',
                id: pId,
                type: 'walking',
                data: entry.data,
                mesh: entry.mesh
              });
            }
          });
        }
      });

      const intersects = raycaster.intersectObjects(candidateMeshes, false);
      if (intersects && intersects.length > 0) {
        const hit = intersects[0];
        const info = hitMap.get(hit.object);
        if (info) {
          onInteractiveObjectSelected(info);
        }
      }
    }

    function onInteractiveObjectSelected(info) {
      if (!info) return;

      if (info.kind === 'vehicle') {
        const vType = info.type;
        activeCamMode = vType;
        activeTargetVehicle = {
          id: info.id,
          type: vType,
          mesh: info.mesh,
          data: info.data,
          speed: info.data.speed || (vType === 'bike' ? 44 : vType === 'bus' ? 26 : vType === 'cng' ? 34 : 38)
        };
        if (canvasEl) canvasEl.style.touchAction = isOrbitableVehicleMode(vType) ? 'none' : 'auto';
        updateLegendHUD(vType);

        const modePill = document.getElementById('crossroadsModePill');
        const icon = document.getElementById('crossroadsModePillIcon');
        const title = document.getElementById('crossroadsModePillTitle');
        const sub = document.getElementById('crossroadsModePillSub');

        if (modePill && icon && title && sub) {
          modePill.classList.remove('hidden');
          const dirLabel = info.data.dir === 'EB' ? 'Eastbound' : info.data.dir === 'WB' ? 'Westbound' : info.data.dir === 'SB' ? 'Southbound' : 'Northbound';
          const speedKmh = Math.round(activeTargetVehicle.speed);

          if (vType === 'bike') {
            icon.textContent = '🏍️';
            title.textContent = `Ride-share Sports Bike · ${dirLabel}`;
            sub.textContent = `Speed: ${speedKmh} km/h · Rapid Lane Traversal · Base ৳30 + ৳12/km`;
          } else if (vType === 'cng') {
            icon.textContent = '🛺';
            title.textContent = `CNG Auto-Rickshaw · One Paribahan (${dirLabel})`;
            sub.textContent = `Speed: ${speedKmh} km/h · Reg: ঢাকা মেট্রো-থ ১১-৪৫৬৭ · Base ৳40 + ৳12/km`;
          } else if (vType === 'bus') {
            icon.textContent = '🚌';
            title.textContent = `BRTA City Transit Bus · ${dirLabel}`;
            sub.textContent = `Speed: ${speedKmh} km/h · Mirpur 10 ➔ Motijheel · Fare ৳10 – ৳35`;
          } else if (vType === 'rickshaw') {
            icon.textContent = '🛺';
            title.textContent = `Dhaka Cycle Rickshaw · ${dirLabel}`;
            sub.textContent = `Speed: ${speedKmh} km/h · Traditional Rickshaw Art · Local Mirpur fare ৳25 – ৳50`;
          } else if (vType === 'car') {
            icon.textContent = '🚗';
            title.textContent = `Aerodynamic Ride-share Car · ${dirLabel}`;
            sub.textContent = `Speed: ${speedKmh} km/h · AC Ride · Base ৳60 + ৳18/km`;
          }
        }

        const pose = getVehicleOrbitPose(activeTargetVehicle);
        focusCamera(pose.position, pose.look, 1.4);

      } else if (info.kind === 'metro') {
        window.crossroadsFocusMode('metro');
      } else if (info.kind === 'walking') {
        window.crossroadsFocusMode('walking');
      } else if (info.kind === 'ambulance') {
        const modePill = document.getElementById('crossroadsModePill');
        const icon = document.getElementById('crossroadsModePillIcon');
        const title = document.getElementById('crossroadsModePillTitle');
        const sub = document.getElementById('crossroadsModePillSub');
        if (modePill && icon && title && sub) {
          modePill.classList.remove('hidden');
          icon.textContent = '🚨';
          title.textContent = 'Emergency Cardiac Ambulance';
          sub.textContent = 'Priority Green Wave Active · High-Intensity Strobes · Emergency Lane Clear';
        }
      }
    }

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
    if (!renderer || !camera) return;
    let width = 0, height = 0;
    if (containerEl && containerEl.clientWidth > 0 && containerEl.clientHeight > 0) {
      width = containerEl.clientWidth;
      height = containerEl.clientHeight;
    } else if (canvasEl && canvasEl.clientWidth > 0 && canvasEl.clientHeight > 0) {
      width = canvasEl.clientWidth;
      height = canvasEl.clientHeight;
    } else if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerHeight > 0) {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    if (width > 0 && height > 0) {
      const aspect = width / height;
      updateCameraFraming(aspect);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 768 ? 1.5 : 2));
      renderer.setSize(width, height, false);
      if (activeTargetVehicle && isOrbitableVehicleMode(activeCamMode) && !scrollProgressCameraActive) {
        const pose = getVehicleOrbitPose(activeTargetVehicle);
        focusCamera(pose.position, pose.look, 0.2);
      }
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
    isRenderLoopPaused = false;
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
          ambientLight.color.setHex(isMobileScreen ? 0x475569 : 0x3b4759);
          ambientLight.intensity = isMobileScreen ? 0.92 : 0.85;
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
          ambientLight.color.setHex(isMobileScreen ? 0x475569 : 0x3b4759);
          ambientLight.intensity = isMobileScreen ? 0.92 : 0.85;
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
          ambientLight.intensity = isMobileScreen ? 0.90 : 0.82;
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
        vm.mesh.rotation.y = getHeading(v.dir);
        vm.mesh.rotation.z = -tiltZ;
      } else if (v.dir === 'WB') {
        const laneZ = (typeof v.currentLaneY !== 'undefined') ? (v.currentLaneY - 420) : (v.lane === 1 ? -15 : -52);
        vm.mesh.position.set(v.pos - 600, bounce, laneZ);
        vm.mesh.rotation.y = getHeading(v.dir);
        vm.mesh.rotation.z = tiltZ;
      } else if (v.dir === 'SB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? -20 : -58);
        vm.mesh.position.set(laneX, bounce, v.pos - 420);
        vm.mesh.rotation.y = getHeading(v.dir);
        vm.mesh.rotation.x = tiltZ;
      } else if (v.dir === 'NB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? 18 : 56);
        vm.mesh.position.set(laneX, bounce, v.pos - 420);
        vm.mesh.rotation.y = getHeading(v.dir);
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
        const forwardRoll = (Math.abs(roadDelta) < 100 && Math.abs(roadDelta) > 0) ? (Math.abs(roadDelta) / wheelRadius) : 0;
        vm.mesh.userData.wheels.forEach(w => {
          w.rotation.z -= forwardRoll;
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
      let posX = 0, posZ = 0;

      if (p.isSidewalk) {
        coord = typeof p.pos !== 'undefined' ? p.pos : p.start;
        isMoving = true;
        if (p.axis === 'H') {
          posX = coord - 600;
          posZ = p.y - 420;
        } else {
          posX = p.x - 600;
          posZ = coord - 420;
        }
      } else {
        // Crosswalk pedestrian
        coord = (typeof p.currentCoord !== 'undefined') ? p.currentCoord : p.start;
        isMoving = Math.abs(coord - p.start) > 2;
        if (p.axis === 'H') {
          posX = coord - 600;
          posZ = p.y - 420;
        } else {
          posX = p.x - 600;
          posZ = coord - 420;
        }
      }

      // Dynamic forward orientation vector from frame displacement:
      const lastX = pm.mesh.userData.lastX !== undefined ? pm.mesh.userData.lastX : posX;
      const lastZ = pm.mesh.userData.lastZ !== undefined ? pm.mesh.userData.lastZ : posZ;
      const dX = posX - lastX;
      const dZ = posZ - lastZ;
      pm.mesh.userData.lastX = posX;
      pm.mesh.userData.lastZ = posZ;

      const dispDist = Math.hypot(dX, dZ);
      let targetRotY = (typeof pm.mesh.userData.targetRotY !== 'undefined') ? pm.mesh.userData.targetRotY : 0;
      if (dispDist > 0.001) {
        targetRotY = Math.atan2(dX, dZ);
        pm.mesh.userData.targetRotY = targetRotY;
      } else if (typeof pm.mesh.userData.targetRotY === 'undefined') {
        if (p.axis === 'H') {
          targetRotY = (p.end > p.start) ? Math.PI / 2 : -Math.PI / 2;
        } else {
          targetRotY = (p.end > p.start) ? 0 : Math.PI;
        }
        pm.mesh.userData.targetRotY = targetRotY;
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

      // Smooth 180° turnaround heading interpolation so pedestrians turn around naturally
      if (typeof pm.mesh.userData.currentRotY === 'undefined') {
        pm.mesh.userData.currentRotY = targetRotY;
      }
      let rotDiff = targetRotY - pm.mesh.userData.currentRotY;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      pm.mesh.userData.currentRotY += rotDiff * Math.min(1.0, delta * 12);

      pm.mesh.position.set(posX, 1 + bob, posZ);
      pm.mesh.rotation.y = pm.mesh.userData.currentRotY;
      
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

    if (chaseCamLight) {
      if (activeCamMode !== 'overview' && activeTargetVehicle) {
        chaseCamLight.position.copy(camera.position);
        chaseCamLight.intensity = isMobileScreen ? 1.4 : 1.15;
      } else {
        chaseCamLight.intensity = 0;
      }
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

  window.replaceCNGWithModel = replaceCNGWithModel;
  window.replaceBusWithModel = replaceBusWithModel;
  window.replaceRickshawWithModel = replaceRickshawWithModel;
  window.replaceBikeWithModel = replaceBikeWithModel;

})();
