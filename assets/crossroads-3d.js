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
        .filter(vm => vm.mesh && vm.data && targetTypes.includes(vm.data.type));
      if (modeName === 'bike') {
        eligible.sort((a, b) => ((a.data && a.data.variantIndex) || 0) - ((b.data && b.data.variantIndex) || 0));
      } else {
        eligible.sort((a, b) => {
          const centerA = a.data.dir === 'SB' || a.data.dir === 'NB' ? 420 : 600;
          const centerB = b.data.dir === 'SB' || b.data.dir === 'NB' ? 420 : 600;
          return Math.abs(a.data.pos - centerA) - Math.abs(b.data.pos - centerB);
        });
      }
      if (eligible.length) {
        if (modeName === 'bike' && activeTargetVehicle && activeTargetVehicle.type === 'bike') {
          const curId = (activeTargetVehicle.data && activeTargetVehicle.data.id) || activeTargetVehicle.id;
          const curIndex = eligible.findIndex(e => e.data && e.data.id === curId);
          const nextIndex = curIndex !== -1 ? (curIndex + 1) % eligible.length : 0;
          return {
            id: eligible[nextIndex].data.id,
            type: eligible[nextIndex].data.type,
            mesh: eligible[nextIndex].mesh,
            data: eligible[nextIndex].data
          };
        }
        return {
          id: eligible[0].data.id,
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
          const carTitle = (activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.modelTitle) ? activeTargetVehicle.mesh.userData.modelTitle : 'Private Car Fleet';
          if (title) title.textContent = carTitle;
          if (sub) sub.textContent = 'Executive Sedan & Luxury SUV Fleet (Base ৳50 · ৳20/km)';
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
      if (modeName === 'bike') {
        // Repeated clicks on Ride-share Bike cycle across motorcycle fleet models & colorways
        activeTargetVehicle = acquireTargetVehicle('bike');
        if (activeTargetVehicle && activeTargetVehicle.data) {
          updateLegendHUD('bike');
          const modePill = document.getElementById('crossroadsModePill');
          const icon = document.getElementById('crossroadsModePillIcon');
          const title = document.getElementById('crossroadsModePillTitle');
          const sub = document.getElementById('crossroadsModePillSub');
          if (modePill && icon && title && sub) {
            modePill.classList.remove('hidden');
            const dirLabel = activeTargetVehicle.data.dir === 'EB' ? 'Eastbound' :
                             activeTargetVehicle.data.dir === 'WB' ? 'Westbound' :
                             activeTargetVehicle.data.dir === 'SB' ? 'Southbound' : 'Northbound';
            const speedKmh = Math.round(activeTargetVehicle.data.speed || 44);
            icon.textContent = '🏍️';
            title.textContent = `${(activeTargetVehicle.mesh && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.modelTitle) || 'Ride-share Sports Bike'} · ${dirLabel}`;
            sub.textContent = `Speed: ${speedKmh} km/h · Rapid Lane Traversal · Base ৳30 + ৳12/km`;
          }
          const pose = getVehicleOrbitPose(activeTargetVehicle);
          focusCamera(pose.position, pose.look, 0.8);
          return;
        }
      }
      if (modeName === 'car') {
        // Repeated clicks on Car cycle across the 4 car models & 16 colorways
        activeTargetVehicle = acquireTargetVehicle('car');
        if (activeTargetVehicle && activeTargetVehicle.data) {
          if (activeTargetVehicle.mesh && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.isCar) {
            swapCarVariant(activeTargetVehicle.mesh);
          }
          updateLegendHUD('car');
          const modePill = document.getElementById('crossroadsModePill');
          const icon = document.getElementById('crossroadsModePillIcon');
          const title = document.getElementById('crossroadsModePillTitle');
          const sub = document.getElementById('crossroadsModePillSub');
          if (modePill && icon && title && sub) {
            modePill.classList.remove('hidden');
            const dirLabel = activeTargetVehicle.data.dir === 'EB' ? 'Eastbound' :
                             activeTargetVehicle.data.dir === 'WB' ? 'Westbound' :
                             activeTargetVehicle.data.dir === 'SB' ? 'Southbound' : 'Northbound';
            const speedKmh = Math.round(activeTargetVehicle.data.speed || 55);
            icon.textContent = '🚗';
            title.textContent = `${(activeTargetVehicle.mesh && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.modelTitle) || 'Private Car'} · ${dirLabel}`;
            sub.textContent = `Speed: ${speedKmh} km/h · Executive Fleet · Base ৳50 + ৳20/km`;
          }
          const pose = getVehicleOrbitPose(activeTargetVehicle);
          focusCamera(pose.position, pose.look, 0.8);
          return;
        }
      }
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
  // 1. Procedural 3D Car Fleet Factory — Pure Three.js (ZERO Blender / ZERO GLB)
  // 4 Iconic Models: Mercedes-AMG GT, Honda Civic/Accord Sedan, Range Rover, Land Cruiser LC300
  // 16 Specified Colorways with Authentic Branded Grilles, Lights & Geometry
  // ---------------------------------------------------------------------------
  const carTextureCache = {};

  function getCarGrilleTexture(carType) {
    if (carTextureCache[carType]) return carTextureCache[carType];
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const ctx = cv.getContext('2d');

    if (carType === 'mercedes_amg') {
      // Panamericana Grille: deep black background, vertical chrome slats, center Mercedes star
      ctx.fillStyle = '#0f1115';
      ctx.fillRect(0, 0, 512, 256);

      // Outer chrome rim
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(8, 8, 496, 240, 36);
      ctx.stroke();

      // Vertical Panamericana chrome slats
      ctx.fillStyle = '#e2e8f0';
      for (let x = 40; x <= 472; x += 32) {
        if (x > 210 && x < 300) continue; // center gap for star
        ctx.fillRect(x, 16, 8, 224);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + 6, 16, 2, 224);
        ctx.fillStyle = '#e2e8f0';
      }

      // Center 3D-effect Mercedes star emblem
      const cx = 256, cy = 128, r = 62;
      ctx.fillStyle = '#0f1115';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      for (let a = 0; a < 3; a++) {
        const ang = -Math.PI / 2 + a * (Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang + 0.18) * (r * 0.3), cy + Math.sin(ang + 0.18) * (r * 0.3));
        ctx.lineTo(cx + Math.cos(ang) * (r * 0.95), cy + Math.sin(ang) * (r * 0.95));
        ctx.lineTo(cx + Math.cos(ang - 0.18) * (r * 0.3), cy + Math.sin(ang - 0.18) * (r * 0.3));
        ctx.closePath();
        ctx.fill();
      }
    } else if (carType === 'honda_sedan') {
      // Honda Fastback Grille: horizontal glossy black bars with upper chrome bar and Honda 'H'
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 256);

      // Upper chrome brow bar
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 512, 38);

      // Horizontal black slatted grille bars
      for (let y = 56; y < 240; y += 32) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(20, y, 472, 14);
        ctx.fillStyle = '#334155';
        ctx.fillRect(20, y, 472, 3);
      }

      // Center Chrome Honda 'H' Logo
      const cx = 256, cy = 128;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.roundRect(cx - 52, cy - 48, 104, 96, 16);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy + 34); ctx.lineTo(cx - 42, cy - 34); ctx.lineTo(cx - 28, cy - 34); ctx.lineTo(cx - 24, cy + 34); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 24, cy + 34); ctx.lineTo(cx + 28, cy - 34); ctx.lineTo(cx + 42, cy - 34); ctx.lineTo(cx + 36, cy + 34); ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - 30, cy - 6, 60, 12);
    } else if (carType === 'range_rover') {
      // Range Rover Grille: Minimalist rectangular grille with horizontal micro-mesh pattern
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 512, 256);

      ctx.strokeStyle = '#b49a75';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, 496, 240);

      // Micro-mesh pattern
      ctx.fillStyle = '#71717a';
      for (let x = 24; x < 488; x += 28) {
        for (let y = 24; y < 232; y += 24) {
          ctx.beginPath();
          ctx.roundRect(x, y, 20, 14, 4);
          ctx.fill();
        }
      }

      // Small Land Rover oval badge in upper right corner
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.ellipse(430, 60, 36, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (carType === 'land_cruiser') {
      // Toyota Land Cruiser LC300 Grille: Massive 4-bar horizontal chrome grille + Toyota triple-oval
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 512, 256);

      // 4 heavy horizontal chrome bars
      const barYs = [28, 80, 136, 192];
      barYs.forEach(by => {
        const barGrad = ctx.createLinearGradient(0, by, 0, by + 34);
        barGrad.addColorStop(0, '#f8fafc');
        barGrad.addColorStop(0.3, '#cbd5e1');
        barGrad.addColorStop(0.7, '#94a3b8');
        barGrad.addColorStop(1, '#475569');
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(16, by, 480, 34, 6);
        ctx.fill();
      });

      // Center Toyota Triple-Oval Emblem
      const cx = 256, cy = 108;
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 64, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 58, 38, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy - 8, 36, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, 18, 32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    carTextureCache[carType] = tex;
    return tex;
  }

  // -------------------------------------------------------------
  // MASTER CAR VARIANT DECK (16 Configurations across 4 Models)
  // -------------------------------------------------------------
  const CAR_VARIANT_DECK = [
    // Model 1: Mercedes-AMG GT Coupe (4 variants)
    {
      id: 'AMG_1',
      modelKey: 'AMG_GT',
      modelTitle: 'Mercedes-AMG GT Coupe (Metallic Silver)',
      carType: 'mercedes_amg',
      bodyColor: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.18,
      roofColor: 0xe2e8f0,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.4,
      width: 1.9,
      height: 1.25,
      wheelRadius: 0.34
    },
    {
      id: 'AMG_2',
      modelKey: 'AMG_GT',
      modelTitle: 'Mercedes-AMG GT Coupe (Glossy Jet Black)',
      carType: 'mercedes_amg',
      bodyColor: 0x111317,
      metalness: 0.80,
      roughness: 0.15,
      roofColor: 0x111317,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.4,
      width: 1.9,
      height: 1.25,
      wheelRadius: 0.34
    },
    {
      id: 'AMG_3',
      modelKey: 'AMG_GT',
      modelTitle: 'Mercedes-AMG GT Coupe (Deep Dark Blue)',
      carType: 'mercedes_amg',
      bodyColor: 0x1e3a8a,
      metalness: 0.75,
      roughness: 0.20,
      roofColor: 0x1e3a8a,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.4,
      width: 1.9,
      height: 1.25,
      wheelRadius: 0.34
    },
    {
      id: 'AMG_4',
      modelKey: 'AMG_GT',
      modelTitle: 'Mercedes-AMG GT Coupe (Pearl White)',
      carType: 'mercedes_amg',
      bodyColor: 0xf8fafc,
      metalness: 0.60,
      roughness: 0.25,
      roofColor: 0xf8fafc,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.4,
      width: 1.9,
      height: 1.25,
      wheelRadius: 0.34
    },

    // Model 2: Honda Civic / Accord Fastback Sedan (4 variants)
    {
      id: 'HONDA_1',
      modelKey: 'HONDA_SEDAN',
      modelTitle: 'Honda Accord Sedan (Urban Gray)',
      carType: 'honda_sedan',
      bodyColor: 0x64748b,
      metalness: 0.50,
      roughness: 0.35,
      roofColor: 0x64748b,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.6,
      width: 1.85,
      height: 1.4,
      wheelRadius: 0.35
    },
    {
      id: 'HONDA_2',
      modelKey: 'HONDA_SEDAN',
      modelTitle: 'Honda Accord Sedan (Glossy Black)',
      carType: 'honda_sedan',
      bodyColor: 0x111317,
      metalness: 0.70,
      roughness: 0.15,
      roofColor: 0x111317,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.6,
      width: 1.85,
      height: 1.4,
      wheelRadius: 0.35
    },
    {
      id: 'HONDA_3',
      modelKey: 'HONDA_SEDAN',
      modelTitle: 'Honda Accord Sedan (Deep Dark Blue)',
      carType: 'honda_sedan',
      bodyColor: 0x1e3a8a,
      metalness: 0.65,
      roughness: 0.20,
      roofColor: 0x1e3a8a,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.6,
      width: 1.85,
      height: 1.4,
      wheelRadius: 0.35
    },
    {
      id: 'HONDA_4',
      modelKey: 'HONDA_SEDAN',
      modelTitle: 'Honda Accord Sedan (Pearl White)',
      carType: 'honda_sedan',
      bodyColor: 0xf8fafc,
      metalness: 0.55,
      roughness: 0.25,
      roofColor: 0xf8fafc,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.6,
      width: 1.85,
      height: 1.4,
      wheelRadius: 0.35
    },

    // Model 3: Range Rover Luxury SUV (4 variants)
    {
      id: 'RR_1',
      modelKey: 'RANGE_ROVER',
      modelTitle: 'Range Rover SUV (Satin Champagne)',
      carType: 'range_rover',
      bodyColor: 0xb49a75,
      metalness: 0.45,
      roughness: 0.30,
      roofColor: 0xb49a75,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 5.0,
      width: 2.0,
      height: 1.8,
      wheelRadius: 0.42
    },
    {
      id: 'RR_2',
      modelKey: 'RANGE_ROVER',
      modelTitle: 'Range Rover SUV (Black & White Contrast)',
      carType: 'range_rover',
      bodyColor: 0x111317,
      metalness: 0.70,
      roughness: 0.15,
      roofColor: 0xf8fafc,
      contrastRoof: true,
      headlightColor: 0xffffff,
      length: 5.0,
      width: 2.0,
      height: 1.8,
      wheelRadius: 0.42
    },
    {
      id: 'RR_3',
      modelKey: 'RANGE_ROVER',
      modelTitle: 'Range Rover SUV (Black & Navy Blue Contrast)',
      carType: 'range_rover',
      bodyColor: 0x111317,
      metalness: 0.70,
      roughness: 0.15,
      roofColor: 0x172554,
      contrastRoof: true,
      headlightColor: 0xffffff,
      length: 5.0,
      width: 2.0,
      height: 1.8,
      wheelRadius: 0.42
    },
    {
      id: 'RR_4',
      modelKey: 'RANGE_ROVER',
      modelTitle: 'Range Rover SUV (Black & Dark Ash Contrast)',
      carType: 'range_rover',
      bodyColor: 0x111317,
      metalness: 0.70,
      roughness: 0.15,
      roofColor: 0x334155,
      contrastRoof: true,
      headlightColor: 0xffffff,
      length: 5.0,
      width: 2.0,
      height: 1.8,
      wheelRadius: 0.42
    },

    // Model 4: Toyota Land Cruiser Prado / LC300 SUV (4 variants)
    {
      id: 'LC_1',
      modelKey: 'LAND_CRUISER',
      modelTitle: 'Toyota Land Cruiser LC300 (Pearl White)',
      carType: 'land_cruiser',
      bodyColor: 0xf1f5f9,
      metalness: 0.55,
      roughness: 0.25,
      roofColor: 0xf1f5f9,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.9,
      width: 1.98,
      height: 1.9,
      wheelRadius: 0.43
    },
    {
      id: 'LC_2',
      modelKey: 'LAND_CRUISER',
      modelTitle: 'Toyota Land Cruiser LC300 (Glossy Black)',
      carType: 'land_cruiser',
      bodyColor: 0x111317,
      metalness: 0.70,
      roughness: 0.15,
      roofColor: 0x111317,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.9,
      width: 1.98,
      height: 1.9,
      wheelRadius: 0.43
    },
    {
      id: 'LC_3',
      modelKey: 'LAND_CRUISER',
      modelTitle: 'Toyota Land Cruiser LC300 (Deep Dark Blue)',
      carType: 'land_cruiser',
      bodyColor: 0x1e3a8a,
      metalness: 0.65,
      roughness: 0.20,
      roofColor: 0x1e3a8a,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.9,
      width: 1.98,
      height: 1.9,
      wheelRadius: 0.43
    },
    {
      id: 'LC_4',
      modelKey: 'LAND_CRUISER',
      modelTitle: 'Toyota Land Cruiser LC300 (Dark Ash Charcoal)',
      carType: 'land_cruiser',
      bodyColor: 0x334155,
      metalness: 0.50,
      roughness: 0.30,
      roofColor: 0x334155,
      contrastRoof: false,
      headlightColor: 0xffffff,
      length: 4.9,
      width: 1.98,
      height: 1.9,
      wheelRadius: 0.43
    }
  ];

  // -------------------------------------------------------------
  // Shared Procedural Driver Silhouette Builder for All 4 Car Models
  // Visible as a refined tinted shadow through 0.65 opacity glass
  // -------------------------------------------------------------
  function buildCarDriver(carType) {
    const driverGroup = new THREE.Group();

    // Dedicated interior & driver materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xc68662, // Warm natural South Asian skin tone
      emissive: 0x3d2218, // Warm subtle self-illumination for cabin visibility
      emissiveIntensity: 0.35,
      roughness: 0.65,
      metalness: 0.05
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111317, // Dark natural hair
      roughness: 0.90,
      metalness: 0.10
    });
    // Emissive / Basic materials for high visibility through tinted glass
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const eyebrowMat = new THREE.MeshBasicMaterial({ color: 0x111317 });
    const beardMat = new THREE.MeshBasicMaterial({ color: 0x111317 });
    const lipMat = new THREE.MeshBasicMaterial({ color: 0x9e4747 }); // Natural dark-pink / brown lip line

    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Dark leather sports/luxury seat
      roughness: 0.65,
      metalness: 0.20
    });
    const steeringMat = new THREE.MeshStandardMaterial({
      color: 0x090a0f, // Leather-wrapped steering wheel
      roughness: 0.60,
      metalness: 0.25
    });
    const silverTrimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.90,
      roughness: 0.20
    });

    let cfg;
    if (carType === 'mercedes_amg') {
      cfg = {
        driverZ: 0.30,
        seatX: -0.15, seatY: 0.54,
        backrestX: -0.32, backrestY: 0.76,
        headrestX: -0.35, headrestY: 1.02,
        dashX: 0.32, dashY: 0.74, dashW: 1.08,
        wheelX: 0.12, wheelY: 0.84, wheelR: 0.095, wheelTilt: 0.38,
        torsoX: -0.10, torsoY: 0.78,
        headX: -0.06, headY: 1.05
      };
    } else if (carType === 'honda_sedan') {
      cfg = {
        driverZ: 0.30,
        seatX: -0.10, seatY: 0.58,
        backrestX: -0.28, backrestY: 0.82,
        headrestX: -0.32, headrestY: 1.08,
        dashX: 0.36, dashY: 0.78, dashW: 1.10,
        wheelX: 0.16, wheelY: 0.88, wheelR: 0.095, wheelTilt: 0.38,
        torsoX: -0.06, torsoY: 0.84,
        headX: -0.02, headY: 1.12
      };
    } else if (carType === 'range_rover') {
      cfg = {
        driverZ: 0.35,
        seatX: 0.05, seatY: 0.90,
        backrestX: -0.15, backrestY: 1.16,
        headrestX: -0.18, headrestY: 1.44,
        dashX: 0.52, dashY: 1.12, dashW: 1.28,
        wheelX: 0.30, wheelY: 1.22, wheelR: 0.105, wheelTilt: 0.35,
        torsoX: 0.08, torsoY: 1.18,
        headX: 0.12, headY: 1.46
      };
    } else {
      // land_cruiser
      cfg = {
        driverZ: 0.35,
        seatX: 0.00, seatY: 0.95,
        backrestX: -0.20, backrestY: 1.24,
        headrestX: -0.24, headrestY: 1.52,
        dashX: 0.48, dashY: 1.18, dashW: 1.28,
        wheelX: 0.26, wheelY: 1.30, wheelR: 0.110, wheelTilt: 0.35,
        torsoX: 0.04, torsoY: 1.26,
        headX: 0.08, headY: 1.54
      };
    }

    const { driverZ, seatX, seatY, backrestX, backrestY, headrestX, headrestY, dashX, dashY, dashW, wheelX, wheelY, wheelR, wheelTilt, torsoX, torsoY, headX, headY } = cfg;

    // -----------------------------------------------------------
    // 0. Soft Warm Cabin Point Light & Dome Fixture (Illuminates Driver)
    // -----------------------------------------------------------
    const cabinLight = new THREE.PointLight(0xffedd5, 0.85, 2.2);
    cabinLight.position.set(headX + 0.10, headY + 0.18, driverZ * 0.65);
    driverGroup.add(cabinLight);

    const domeFixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.010, 8),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    domeFixture.position.set(headX + 0.10, headY + 0.19, driverZ * 0.65);
    driverGroup.add(domeFixture);

    // 1. Interior Bucket Seats (Driver & Passenger)
    [driverZ, -driverZ].forEach(sz => {
      // Cushion
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.34), seatMat);
      cushion.position.set(seatX, seatY, sz);
      driverGroup.add(cushion);

      // Backrest tilted ~10° backward
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.32), seatMat);
      backrest.rotation.z = -0.15;
      backrest.position.set(backrestX, backrestY, sz);
      driverGroup.add(backrest);

      // Headrest
      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), seatMat);
      headrest.position.set(headrestX, headrestY, sz);
      driverGroup.add(headrest);
    });

    // Center Console
    const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.16), seatMat);
    consoleBox.position.set(seatX + 0.10, seatY + 0.05, 0);
    driverGroup.add(consoleBox);

    // 2. Dashboard Console & Instrument Binnacle
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, dashW), seatMat);
    dash.position.set(dashX, dashY, 0);
    driverGroup.add(dash);

    const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), seatMat);
    binnacle.position.set(dashX - 0.06, dashY + 0.09, driverZ);
    driverGroup.add(binnacle);

    // Angled Steering Column
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 8), seatMat);
    column.rotation.z = -0.60;
    column.position.set(wheelX + 0.06, wheelY - 0.05, driverZ);
    driverGroup.add(column);

    // Steering Wheel
    const steeringWheel = new THREE.Mesh(
      new THREE.TorusGeometry(wheelR, 0.014, 8, 20),
      steeringMat
    );
    steeringWheel.position.set(wheelX, wheelY, driverZ);
    steeringWheel.rotation.y = Math.PI / 2;
    steeringWheel.rotation.x = wheelTilt;
    driverGroup.add(steeringWheel);

    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.012, 12), silverTrimMat);
    horn.rotation.z = Math.PI / 2;
    horn.rotation.y = wheelTilt;
    horn.position.set(wheelX, wheelY, driverZ);
    driverGroup.add(horn);

    // 3. Distinct Driver Outfits & Colorways per Car Model
    let outfitMat, collarMat, shirtMat, tieMat, accentMat;

    if (carType === 'mercedes_amg') {
      // Executive dark navy suit with crisp white collar and crimson necktie
      outfitMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Charcoal navy suit
        emissive: 0x0a101d,
        emissiveIntensity: 0.30,
        roughness: 0.65,
        metalness: 0.15
      });
      collarMat = outfitMat;
      shirtMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Crisp white dress shirt
        emissive: 0x64748b,
        emissiveIntensity: 0.35,
        roughness: 0.50,
        metalness: 0.05
      });
      tieMat = new THREE.MeshStandardMaterial({
        color: 0xb91c1c, // Crimson red executive necktie
        emissive: 0x500707,
        emissiveIntensity: 0.40,
        roughness: 0.35,
        metalness: 0.20
      });
      accentMat = silverTrimMat;
    } else if (carType === 'honda_sedan') {
      // Casual-smart polo shirt: vibrant royal blue polo
      outfitMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Royal blue polo
        emissive: 0x02456e,
        emissiveIntensity: 0.35,
        roughness: 0.75,
        metalness: 0.05
      });
      collarMat = new THREE.MeshStandardMaterial({
        color: 0x0369a1, // Deep cobalt blue collar trim
        emissive: 0x01324f,
        emissiveIntensity: 0.30,
        roughness: 0.70,
        metalness: 0.05
      });
      shirtMat = collarMat;
      tieMat = null;
      accentMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc }); // White buttons
    } else if (carType === 'range_rover') {
      // Premium chauffeur / sharp luxury blazer: jet black with gold lapel accents
      outfitMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Jet black luxury blazer
        emissive: 0x080c14,
        emissiveIntensity: 0.30,
        roughness: 0.55,
        metalness: 0.20
      });
      collarMat = outfitMat;
      shirtMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Crisp white dress shirt
        emissive: 0x64748b,
        emissiveIntensity: 0.35,
        roughness: 0.50,
        metalness: 0.05
      });
      tieMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Formal black tie
        emissive: 0x080c14,
        emissiveIntensity: 0.25,
        roughness: 0.40,
        metalness: 0.20
      });
      accentMat = new THREE.MeshStandardMaterial({
        color: 0xd97706, // Gold lapel accents & tie bar
        emissive: 0x78350f,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.85
      });
    } else {
      // land_cruiser: Safari / rugged utility button-down shirt: earthy khaki/brown
      outfitMat = new THREE.MeshStandardMaterial({
        color: 0x78350f, // Warm earthy safari brown
        emissive: 0x3d1704,
        emissiveIntensity: 0.35,
        roughness: 0.80,
        metalness: 0.05
      });
      collarMat = new THREE.MeshStandardMaterial({
        color: 0x5c2b09, // Darker leather/canvas brown collar
        emissive: 0x2e1202,
        emissiveIntensity: 0.30,
        roughness: 0.80,
        metalness: 0.05
      });
      shirtMat = collarMat;
      tieMat = null;
      accentMat = new THREE.MeshStandardMaterial({
        color: 0xb45309, // Amber utility buttons
        emissive: 0x542604,
        emissiveIntensity: 0.35,
        roughness: 0.40,
        metalness: 0.20
      });
    }

    // 4. Seated Human Driver
    // Torso (Tailored jacket / shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.28), outfitMat);
    torso.position.set(torsoX, torsoY, driverZ);
    driverGroup.add(torso);

    // Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 6, 12), collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(torsoX + 0.02, torsoY + 0.17, driverZ);
    driverGroup.add(collar);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.048, 0.08, 10), skinMat);
    neck.position.set(torsoX + 0.03, torsoY + 0.19, driverZ);
    driverGroup.add(neck);

    // Outfit Accessories & Front Detailing
    if (carType === 'mercedes_amg') {
      // Crisp white shirt chest piece
      const shirtInlay = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.08), shirtMat);
      shirtInlay.position.set(torsoX + 0.111, torsoY + 0.07, driverZ);
      driverGroup.add(shirtInlay);

      // Crimson necktie
      const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.024), tieMat);
      tieKnot.position.set(torsoX + 0.118, torsoY + 0.135, driverZ);
      driverGroup.add(tieKnot);

      const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.022), tieMat);
      tieBody.position.set(torsoX + 0.116, torsoY + 0.065, driverZ);
      driverGroup.add(tieBody);

      // Silver tie clip
      const tieClip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.026), accentMat);
      tieClip.position.set(torsoX + 0.119, torsoY + 0.080, driverZ);
      driverGroup.add(tieClip);

      // Suit lapels
      const lLapel = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.16, 0.038), outfitMat);
      lLapel.position.set(torsoX + 0.114, torsoY + 0.07, driverZ + 0.052);
      driverGroup.add(lLapel);

      const rLapel = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.16, 0.038), outfitMat);
      rLapel.position.set(torsoX + 0.114, torsoY + 0.07, driverZ - 0.052);
      driverGroup.add(rLapel);
    } else if (carType === 'honda_sedan') {
      // Casual polo placket & collarbone opening
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.032), shirtMat);
      placket.position.set(torsoX + 0.111, torsoY + 0.08, driverZ);
      driverGroup.add(placket);

      [0.11, 0.07].forEach(yOff => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6), accentMat);
        btn.rotation.z = Math.PI / 2;
        btn.position.set(torsoX + 0.118, torsoY + yOff, driverZ);
        driverGroup.add(btn);
      });

      const vSkin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.04), skinMat);
      vSkin.position.set(torsoX + 0.110, torsoY + 0.145, driverZ);
      driverGroup.add(vSkin);
    } else if (carType === 'range_rover') {
      // Formal white shirt inlay
      const shirtInlay = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.08), shirtMat);
      shirtInlay.position.set(torsoX + 0.111, torsoY + 0.07, driverZ);
      driverGroup.add(shirtInlay);

      // Black formal tie
      const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.024), tieMat);
      tieKnot.position.set(torsoX + 0.118, torsoY + 0.135, driverZ);
      driverGroup.add(tieKnot);

      const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.022), tieMat);
      tieBody.position.set(torsoX + 0.116, torsoY + 0.065, driverZ);
      driverGroup.add(tieBody);

      // Gold lapel accent piping
      const lGold = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.13, 0.008), accentMat);
      lGold.position.set(torsoX + 0.117, torsoY + 0.08, driverZ + 0.042);
      driverGroup.add(lGold);

      const rGold = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.13, 0.008), accentMat);
      rGold.position.set(torsoX + 0.117, torsoY + 0.08, driverZ - 0.042);
      driverGroup.add(rGold);

      // Gold lapel pin / crest
      const goldPin = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 8), accentMat);
      goldPin.rotation.z = Math.PI / 2;
      goldPin.position.set(torsoX + 0.118, torsoY + 0.12, driverZ + 0.068);
      driverGroup.add(goldPin);
    } else {
      // Land Cruiser Safari button placket
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.034), shirtMat);
      placket.position.set(torsoX + 0.111, torsoY + 0.08, driverZ);
      driverGroup.add(placket);

      [0.12, 0.08, 0.04].forEach(yOff => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6), accentMat);
        btn.rotation.z = Math.PI / 2;
        btn.position.set(torsoX + 0.118, torsoY + yOff, driverZ);
        driverGroup.add(btn);
      });

      // Dual chest utility pocket flaps
      const lPocket = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.055), shirtMat);
      lPocket.position.set(torsoX + 0.113, torsoY + 0.07, driverZ + 0.072);
      driverGroup.add(lPocket);

      const rPocket = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.055), shirtMat);
      rPocket.position.set(torsoX + 0.113, torsoY + 0.07, driverZ - 0.072);
      driverGroup.add(rPocket);
    }

    // 5. Head & Procedural Facial Features
    const headGroup = new THREE.Group();
    headGroup.position.set(headX, headY, driverZ);
    driverGroup.add(headGroup);

    // Rounded Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.090, 16, 14), skinMat);
    headGroup.add(head);

    // Dark Stylized Hair (Lifted high onto scalp/crown, leaving forehead & eyes 100% visible)
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
      hairMat
    );
    hair.position.set(-0.012, 0.028, 0);
    hair.rotation.z = 0.35;
    headGroup.add(hair);

    // Hair Style Detail for Honda Civic Driver (Textured Fringe lifted above forehead)
    if (carType === 'honda_sedan') {
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.020, 0.075), hairMat);
      fringe.position.set(0.048, 0.065, 0);
      fringe.rotation.z = -0.20;
      headGroup.add(fringe);
    }

    // High-Visibility Eyes & Eyebrows using MeshBasicMaterial
    [0.030, -0.030].forEach(zOffset => {
      // White sclera sphere
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), eyeWhiteMat);
      eyeWhite.position.set(0.076, 0.018, zOffset);
      headGroup.add(eyeWhite);

      // Dark pupil on anterior eye surface
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 8), eyePupilMat);
      pupil.position.set(0.088, 0.018, zOffset);
      headGroup.add(pupil);

      // Eyebrow bar on forehead
      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.009, 0.028), eyebrowMat);
      eyebrow.position.set(0.078, 0.036, zOffset);
      eyebrow.rotation.x = zOffset > 0 ? -0.06 : 0.06;
      headGroup.add(eyebrow);
    });

    // Protruding Nasal Bridge & Tip
    const noseBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.018, 0.036, 5),
      skinMat
    );
    noseBridge.rotation.z = -0.22;
    noseBridge.position.set(0.086, -0.006, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), skinMat);
    noseTip.position.set(0.093, -0.018, 0);
    headGroup.add(noseTip);

    // Mustache on Upper Lip Line (Directly below nose, above mouth)
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.034), beardMat);
    mustache.position.set(0.088, -0.034, 0);
    headGroup.add(mustache);

    // Dark-Pink / Brown Lip Line (Cleanly positioned below mustache)
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.007, 0.026), lipMat);
    lips.position.set(0.084, -0.048, 0);
    headGroup.add(lips);

    // Ears (Left & Right)
    [0.089, -0.089].forEach(zOffset => {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.008, 8), skinMat);
      ear.rotation.x = Math.PI / 2;
      ear.position.set(-0.010, -0.002, zOffset);
      headGroup.add(ear);
    });

    // Distinct Facial Hair / Grooming Styles per Car Model (Trimmed & Positioned on Lower Jaw/Chin)
    if (carType === 'mercedes_amg') {
      // Subtle lower chin patch (down on chin rim, well below mouth)
      const chinPatch = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, 0.022), beardMat);
      chinPatch.position.set(0.065, -0.076, 0);
      headGroup.add(chinPatch);
    } else if (carType === 'honda_sedan') {
      // Clean modern chin - no dark block
    } else if (carType === 'range_rover') {
      // Sharp manicured jawline beard along jaw sides & chin rim
      const chinBeard = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.014, 0.032), beardMat);
      chinBeard.position.set(0.060, -0.076, 0);
      headGroup.add(chinBeard);

      const jawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.014, 0.012), beardMat);
      jawLeft.position.set(0.030, -0.056, 0.055);
      jawLeft.rotation.y = -0.45;
      headGroup.add(jawLeft);

      const jawRight = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.014, 0.012), beardMat);
      jawRight.position.set(0.030, -0.056, -0.055);
      jawRight.rotation.y = 0.45;
      headGroup.add(jawRight);
    } else {
      // Rugged full safari beard for Land Cruiser
      const chinBeard = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.016, 0.036), beardMat);
      chinBeard.position.set(0.058, -0.076, 0);
      headGroup.add(chinBeard);

      const jawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.016, 0.014), beardMat);
      jawLeft.position.set(0.028, -0.056, 0.055);
      jawLeft.rotation.y = -0.45;
      headGroup.add(jawLeft);

      const jawRight = new THREE.Mesh(new THREE.BoxGeometry(0.060, 0.016, 0.014), beardMat);
      jawRight.position.set(0.028, -0.056, -0.055);
      jawRight.rotation.y = 0.45;
      headGroup.add(jawRight);
    }

    // 6. Arms & Hands Gripping Steering Wheel (10 and 2 o'clock)
    // Left Arm (Outer side)
    const lUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.032, 0.18, 8), outfitMat);
    lUpperArm.position.set(torsoX + 0.06, torsoY + 0.07, driverZ + 0.15);
    lUpperArm.rotation.x = 0.35;
    lUpperArm.rotation.z = -0.55;
    driverGroup.add(lUpperArm);

    const lForeArm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.025, 0.17, 8), outfitMat);
    lForeArm.position.set(wheelX - 0.07, wheelY + 0.01, driverZ + 0.11);
    lForeArm.rotation.x = -0.30;
    lForeArm.rotation.z = -1.10;
    driverGroup.add(lForeArm);

    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), skinMat);
    lHand.position.set(wheelX, wheelY + 0.06, driverZ + 0.07);
    driverGroup.add(lHand);

    // Right Arm (Inner side)
    const rUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.032, 0.18, 8), outfitMat);
    rUpperArm.position.set(torsoX + 0.06, torsoY + 0.07, driverZ - 0.15);
    rUpperArm.rotation.x = -0.35;
    rUpperArm.rotation.z = -0.55;
    driverGroup.add(rUpperArm);

    const rForeArm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.025, 0.17, 8), outfitMat);
    rForeArm.position.set(wheelX - 0.07, wheelY + 0.01, driverZ - 0.11);
    rForeArm.rotation.x = 0.30;
    rForeArm.rotation.z = -1.10;
    driverGroup.add(rForeArm);

    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), skinMat);
    rHand.position.set(wheelX, wheelY + 0.06, driverZ - 0.07);
    driverGroup.add(rHand);

    return driverGroup;
  }

  const buildMercedesDriver = () => buildCarDriver('mercedes_amg');

  // -------------------------------------------------------------
  // Model 1: Mercedes-AMG GT Coupe Builder (Sleek Sports Coupe & 3D Panamericana Grille)
  // -------------------------------------------------------------
  function buildCarMercedesAMGGT(config) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness !== undefined ? config.metalness : 0.82,
      roughness: config.roughness !== undefined ? config.roughness : 0.16
    });
    const darkChassisMat = new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.75, metalness: 0.5 });
    const darkTrimMat = darkChassisMat;
    const blackTrimMat = darkChassisMat;
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.96, roughness: 0.10 });
    const darkMeshMat = new THREE.MeshStandardMaterial({ color: 0x080a0f, roughness: 0.88, metalness: 0.3 });
    const darkGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.10,
      metalness: 0.90,
      transparent: true,
      opacity: 0.65 // Transparent enough to cleanly see seated driver inside
    });
    const glassMat = darkGlassMat;
    const mirrorFaceMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.10
    });

    // 1. Lower Sculpted Body (Beltline Down, Length: 4.40, Width: 1.88, Ground Contact & Arch Cutouts)
    // Profile extends from X = -2.20 to +2.20, Height up to Beltline Y = 0.68
    const bodyLowerShape = new THREE.Shape();
    bodyLowerShape.moveTo(2.18, 0.14);               // Front lower chin / splitter base
    bodyLowerShape.lineTo(2.14, 0.30);               // Front nose lower contour
    bodyLowerShape.lineTo(2.04, 0.55);               // Upper nose header / grille top
    bodyLowerShape.quadraticCurveTo(1.40, 0.65, 0.58, 0.70); // Long sculpted hood
    bodyLowerShape.lineTo(-1.60, 0.74);              // Beltline along side/cabin base
    bodyLowerShape.lineTo(-2.18, 0.76);              // Muscular rear decklid with ducktail lip
    bodyLowerShape.lineTo(-2.20, 0.22);              // Rear bumper tail drop
    bodyLowerShape.lineTo(-1.85, 0.16);              // Rear under-diffuser
    bodyLowerShape.lineTo(-1.73, 0.16);              // Rear wheel arch rear base
    // Rear wheel arch cutout (centered precisely at X = -1.35, clear radius ~0.385)
    bodyLowerShape.bezierCurveTo(-1.70, 0.52, -1.00, 0.52, -0.97, 0.14);
    bodyLowerShape.lineTo(0.97, 0.14);               // Side rocker skirt (ground clearance Y = 0.14)
    // Front wheel arch cutout (centered precisely at X = 1.35, clear radius ~0.385)
    bodyLowerShape.bezierCurveTo(1.00, 0.52, 1.70, 0.52, 1.73, 0.14);
    bodyLowerShape.lineTo(2.18, 0.14);               // Front chin connection

    const bodyLowerGeo = new THREE.ExtrudeGeometry(bodyLowerShape, {
      depth: 1.76,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 4,
      curveSegments: 16
    });
    bodyLowerGeo.translate(0, 0, -1.76 / 2);
    const bodyLowerMesh = new THREE.Mesh(bodyLowerGeo, bodyMat);
    bodyLowerMesh.castShadow = true;
    bodyLowerMesh.receiveShadow = true;
    group.add(bodyLowerMesh);

    // Twin Hood Power Domes (Longitudinal muscular hood creases)
    [-0.26, 0.26].forEach(pz => {
      const dome = new THREE.Mesh(
        new THREE.BoxGeometry(1.20, 0.025, 0.06),
        bodyMat
      );
      dome.rotation.z = -0.10;
      dome.position.set(1.30, 0.63, pz);
      group.add(dome);
    });

    // 2. Low-Slung Tapered Sports Coupe Cabin (Greenhouse / Tumblehome)
    // Cabin width narrows gracefully to ~1.36 (Z in [-0.68, 0.68])
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(0.60, 0.70);                   // Windshield base
    cabinShape.lineTo(-0.06, 1.24);                  // Aggressively raked windshield up to roof peak
    cabinShape.quadraticCurveTo(-0.35, 1.25, -0.58, 1.22); // Curved sports coupe roof
    cabinShape.quadraticCurveTo(-1.20, 1.04, -1.62, 0.75); // Fastback sloping rear window
    cabinShape.lineTo(-1.62, 0.70);
    cabinShape.lineTo(0.60, 0.70);
    cabinShape.closePath();

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.34,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
      curveSegments: 16
    });
    cabinGeo.translate(0, 0, -1.34 / 2);
    const cabinMesh = new THREE.Mesh(cabinGeo, darkGlassMat);
    group.add(cabinMesh);

    // Seated 3D Human Driver & Sports Interior (Visible through glass)
    const driverGroup = buildMercedesDriver();
    group.add(driverGroup);

    // Slim Roof Band (Body-colored center roof spine)
    const roofSpine = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.03, 1.10),
      bodyMat
    );
    roofSpine.position.set(-0.30, 1.245, 0);
    group.add(roofSpine);

    // Sleek A-Pillars & C-Pillars Framing the Windows
    [-0.67, 0.67].forEach(pz => {
      // A-pillar
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.04), bodyMat);
      aPillar.rotation.z = -0.66;
      aPillar.position.set(0.26, 0.98, pz);
      group.add(aPillar);

      // Fastback C-pillar / quarter trim
      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.035, 0.04), bodyMat);
      cPillar.rotation.z = 0.44;
      cPillar.position.set(-1.12, 0.98, pz);
      group.add(cPillar);

      // Chrome Window Surround Trim Blade
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.015, 0.02), chromeMat);
      trim.position.set(-0.46, 0.71, pz * 1.02);
      group.add(trim);
    });

    // -----------------------------------------------------------------
    // 3. TAPERED 3D PANAMERICANA GRILLE (Flush Recessed Fit inside Bumper Aperture)
    // Recessed backward by 0.08 units inside bumper chin (X=2.04), sloped at 15° rake
    // -----------------------------------------------------------------
    const grilleGroup = new THREE.Group();
    const RAKE_RAD = 15 * (Math.PI / 180);
    grilleGroup.position.set(2.04, 0.43, 0);
    grilleGroup.rotation.z = RAKE_RAD; // Tilts upper section backward into nose

    // A. Recessed Dark Cavity (100% Embedded inside front bumper, ZERO gaps)
    const cavityShape = new THREE.Shape();
    cavityShape.moveTo(-0.38, 0.13);
    cavityShape.quadraticCurveTo(0, 0.15, 0.38, 0.13);
    cavityShape.quadraticCurveTo(0.44, 0.02, 0.41, -0.06);
    cavityShape.quadraticCurveTo(0.35, -0.14, 0.24, -0.14);
    cavityShape.quadraticCurveTo(0, -0.15, -0.24, -0.14);
    cavityShape.quadraticCurveTo(-0.35, -0.14, -0.41, -0.06);
    cavityShape.quadraticCurveTo(-0.44, 0.02, -0.38, 0.13);

    const cavityGeo = new THREE.ExtrudeGeometry(cavityShape, {
      depth: 0.18,
      bevelEnabled: false
    });
    cavityGeo.rotateY(-Math.PI / 2);
    const cavityMesh = new THREE.Mesh(cavityGeo, darkMeshMat);
    grilleGroup.add(cavityMesh);

    // B. Streamlined Tapered Chrome Panamericana Outer Bezel Rim
    const rimPoints = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const angle = t * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const z = cosA * (0.38 + 0.04 * (sinA < 0 ? -sinA : sinA * 0.4));
      const y = sinA * 0.14;
      rimPoints.push(new THREE.Vector3(0.015, y, z));
    }
    const rimCurve = new THREE.CatmullRomCurve3(rimPoints, true);
    const rimGeo = new THREE.TubeGeometry(rimCurve, 32, 0.014, 8, true);
    const rimMesh = new THREE.Mesh(rimGeo, chromeMat);
    grilleGroup.add(rimMesh);

    // C. 10 Slender Vertical Chrome Louvers (Panamericana Slats)
    const louverZs = [-0.34, -0.26, -0.19, -0.12, -0.05, 0.05, 0.12, 0.19, 0.26, 0.34];
    louverZs.forEach(lz => {
      const u = Math.abs(lz) / 0.38;
      const louverH = 0.26 * Math.sqrt(Math.max(0.1, 1 - u * u * 0.55));
      const bowX = 0.026 * (1 - u * u);

      const louverGeo = new THREE.CylinderGeometry(0.007, 0.007, louverH, 8);
      const louver = new THREE.Mesh(louverGeo, chromeMat);
      louver.position.set(bowX, 0, lz);
      grilleGroup.add(louver);
    });

    // D. Crisp 3D Mercedes Three-Pointed Star Center Badge
    const badgeGroup = new THREE.Group();
    badgeGroup.position.set(0.038, 0.005, 0);

    const badgeBacking = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.082, 0.012, 24),
      new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.15, metalness: 0.85 })
    );
    badgeBacking.rotation.z = Math.PI / 2;
    badgeGroup.add(badgeBacking);

    const starRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.080, 0.011, 8, 28),
      chromeMat
    );
    starRing.rotation.y = Math.PI / 2;
    starRing.position.x = 0.008;
    badgeGroup.add(starRing);

    const starAngles = [Math.PI / 2, Math.PI / 2 - (2 * Math.PI / 3), Math.PI / 2 + (2 * Math.PI / 3)];
    starAngles.forEach(ang => {
      const armLen = 0.068;
      const armGeo = new THREE.ConeGeometry(0.013, armLen, 4);
      const arm = new THREE.Mesh(armGeo, chromeMat);
      arm.position.set(
        0.012,
        Math.sin(ang) * (armLen * 0.48),
        -Math.cos(ang) * (armLen * 0.48)
      );
      arm.rotation.x = -ang + Math.PI / 2;
      arm.rotation.y = Math.PI / 4;
      badgeGroup.add(arm);
    });

    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.016, 12),
      chromeMat
    );
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = 0.014;
    badgeGroup.add(centerCap);

    grilleGroup.add(badgeGroup);
    group.add(grilleGroup);

    // -----------------------------------------------------------------
    // 4. Sleek Recessed LED Headlamps
    // -----------------------------------------------------------------
    [-0.66, 0.66].forEach(hz => {
      const isLeft = hz > 0;
      const hlGroup = new THREE.Group();
      hlGroup.position.set(2.03, 0.50, hz);
      hlGroup.rotation.y = isLeft ? 0.28 : -0.28;
      hlGroup.rotation.z = 0.18;

      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.11, 0.26),
        darkChassisMat
      );
      hlGroup.add(housing);

      [-0.06, 0.06].forEach(pz => {
        const proj = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.032, 0.06, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        proj.rotation.z = Math.PI / 2;
        proj.position.set(0.08, -0.01, pz);
        hlGroup.add(proj);
      });

      const drl = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.018, 0.26),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
      );
      drl.position.set(0.06, 0.045, 0);
      hlGroup.add(drl);

      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.10, 0.25),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.10,
          metalness: 0.90,
          transparent: true,
          opacity: 0.65
        })
      );
      lens.position.set(0.095, 0, 0);
      hlGroup.add(lens);

      group.add(hlGroup);
    });

    // -----------------------------------------------------------------
    // 5. Front Lower Splitter & Bumper Air Inlets
    // -----------------------------------------------------------------
    const lowerIntake = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.10, 0.86),
      darkMeshMat
    );
    lowerIntake.position.set(2.14, 0.19, 0);
    group.add(lowerIntake);

    const splitter = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.04, 1.84),
      darkChassisMat
    );
    splitter.position.set(2.18, 0.14, 0);
    group.add(splitter);

    const aWingBlade = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 1.10),
      chromeMat
    );
    aWingBlade.position.set(2.21, 0.15, 0);
    group.add(aWingBlade);

    [-0.72, 0.72].forEach(sz => {
      const sideScoop = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.14, 0.24),
        darkMeshMat
      );
      sideScoop.position.set(2.08, 0.26, sz);
      group.add(sideScoop);

      const flick = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.015, 0.22),
        darkChassisMat
      );
      flick.position.set(2.12, 0.26, sz);
      group.add(flick);
    });

    // -------------------------------------------------------------
    // 6. Side Aerodynamics & Compact Door-Mounted Side Mirrors (Box 0.08x0.08x0.12 + Silver Mirror Face)
    // -------------------------------------------------------------
    [-0.72, 0.72].forEach(mz => {
      const isLeft = mz > 0;
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), darkChassisMat);
      stalk.position.set(0.52, 0.73, mz * 0.94);
      group.add(stalk);

      const mirrorPod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), bodyMat);
      mirrorPod.position.set(0.52, 0.74, mz);
      group.add(mirrorPod);

      const mFace = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), mirrorFaceMat);
      mFace.rotation.y = -Math.PI / 2; // Facing rearward in -X
      mFace.position.set(0.47, 0.74, mz + (isLeft ? -0.01 : 0.01));
      group.add(mFace);

      const skirtBlade = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.02, 0.02), chromeMat);
      skirtBlade.position.set(0, 0.15, mz);
      group.add(skirtBlade);
    });

    // -----------------------------------------------------------------
    // 7. Rear Decklid, Taillights, Diffuser & Quad Exhausts
    // -----------------------------------------------------------------
    const tlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 1.48), darkChassisMat);
    tlHousing.position.set(-2.17, 0.68, 0);
    group.add(tlHousing);

    const tlGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.045, 1.44),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    tlGlow.position.set(-2.19, 0.68, 0);
    group.add(tlGlow);

    const rearBadge = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 18), chromeMat);
    rearBadge.rotation.y = Math.PI / 2;
    rearBadge.position.set(-2.19, 0.68, 0);
    group.add(rearBadge);

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 1.76), darkChassisMat);
    diffuser.position.set(-2.14, 0.22, 0);
    group.add(diffuser);

    [-0.30, 0, 0.30].forEach(fx => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.025), darkChassisMat);
      fin.position.set(-2.16, 0.18, fx);
      group.add(fin);
    });

    [-0.68, -0.54, 0.54, 0.68].forEach(ez => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.18, 12), chromeMat);
      tip.rotation.z = Math.PI / 2;
      tip.position.set(-2.23, 0.23, ez);
      group.add(tip);
    });

    // -----------------------------------------------------------------
    // 8. 4 AMG Sport 10-Spoke Alloy Wheels (Charcoal-Black Rubber Tires #1c1e21)
    // -----------------------------------------------------------------
    [-0.86, 0.86].forEach(wz => {
      const fWheel = create10SpokeAlloyWheel(0.34, 0.22, 0xd1d5db, true, 0x1c1e21);
      fWheel.position.set(1.35, 0.34, wz);
      group.add(fWheel);
      group.userData.wheels.push(fWheel);
    });

    [-0.88, 0.88].forEach(wz => {
      const rWheel = create10SpokeAlloyWheel(0.34, 0.22, 0xd1d5db, true, 0x1c1e21);
      rWheel.position.set(-1.35, 0.34, wz);
      group.add(rWheel);
      group.userData.wheels.push(rWheel);
    });

    // Dark Wheel Well Tub Liners
    [-0.83, 0.83].forEach(wz => {
      [-1.35, 1.35].forEach(wx => {
        const tub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.37, 0.37, 0.14, 16, 1, true, 0, Math.PI),
          darkMeshMat
        );
        tub.rotation.x = Math.PI / 2;
        tub.rotation.z = Math.PI;
        tub.position.set(wx, 0.34, wz);
        group.add(tub);
      });
    });

    return group;
  }

  // -------------------------------------------------------------
  // Model 2: Honda Civic / Accord Fastback Sedan Builder
  // -------------------------------------------------------------
  function buildCarHondaSedan(config) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness !== undefined ? config.metalness : 0.60,
      roughness: config.roughness !== undefined ? config.roughness : 0.28
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.60 });
    const blackTrimMat = darkTrimMat;
    const darkChassisMat = darkTrimMat;
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.90, roughness: 0.15 });
    const darkMeshMat = new THREE.MeshStandardMaterial({ color: 0x080a0f, roughness: 0.85, metalness: 0.3 });
    const darkGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.10,
      metalness: 0.90,
      transparent: true,
      opacity: 0.65 // Softly visible driver silhouette
    });
    const glassMat = darkGlassMat;
    const mirrorFaceMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.10
    });

    // 1. Lower Sculpted Sedan Body (Beltline Down, Length: 4.60, Width: 1.82)
    // Profile stops at beltline (Y = 0.76) so window cavities are NOT filled with solid body paint!
    const bodyLowerShape = new THREE.Shape();
    bodyLowerShape.moveTo(2.28, 0.18);               // Front chin / lower bumper
    bodyLowerShape.lineTo(2.24, 0.36);               // Lower bumper face
    bodyLowerShape.lineTo(2.18, 0.62);               // Upper nose header / hood front edge
    bodyLowerShape.quadraticCurveTo(1.40, 0.74, 0.82, 0.76); // Long aerodynamic hood
    bodyLowerShape.lineTo(-1.75, 0.82);              // Beltline along cabin base
    bodyLowerShape.lineTo(-2.26, 0.86);              // Subtle trunk decklid spoiler
    bodyLowerShape.lineTo(-2.30, 0.22);              // Rear bumper tail drop
    bodyLowerShape.lineTo(-1.95, 0.18);              // Under-diffuser rear
    bodyLowerShape.lineTo(-1.82, 0.18);              // Rear wheel arch rear base
    // Rear wheel arch cutout (centered precisely at X = -1.42, clear radius ~0.39)
    bodyLowerShape.bezierCurveTo(-1.80, 0.54, -1.06, 0.54, -1.03, 0.18);
    bodyLowerShape.lineTo(1.03, 0.18);               // Side rocker skirt (ground clearance Y = 0.18)
    // Front wheel arch cutout (centered precisely at X = 1.42, clear radius ~0.39)
    bodyLowerShape.bezierCurveTo(1.06, 0.54, 1.80, 0.54, 1.82, 0.18);
    bodyLowerShape.lineTo(2.28, 0.18);               // Front chin connection

    const bodyLowerGeo = new THREE.ExtrudeGeometry(bodyLowerShape, {
      depth: 1.72,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 4,
      curveSegments: 16
    });
    bodyLowerGeo.translate(0, 0, -1.72 / 2);
    const bodyLowerMesh = new THREE.Mesh(bodyLowerGeo, bodyMat);
    bodyLowerMesh.castShadow = true;
    bodyLowerMesh.receiveShadow = true;
    group.add(bodyLowerMesh);

    // 2. Sedan Greenhouse (Watertight Extruded Tinted Glass Canopy + Roof Panel)
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(0.80, 0.76);                   // Windshield base
    cabinShape.lineTo(0.18, 1.34);                  // A-pillar windshield slope
    cabinShape.lineTo(-0.80, 1.34);                 // Roof line
    cabinShape.lineTo(-1.75, 0.84);                 // Fastback sloping rear window
    cabinShape.lineTo(0.80, 0.76);                  // Beltline base
    cabinShape.closePath();

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.34,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
      curveSegments: 16
    });
    cabinGeo.translate(0, 0, -1.34 / 2);
    const cabinMesh = new THREE.Mesh(cabinGeo, darkGlassMat);
    group.add(cabinMesh);

    // Seated 3D Human Driver Silhouette inside Cabin
    const driverGroup = buildCarDriver('honda_sedan');
    group.add(driverGroup);

    // Body-colored roof panel flush on top
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.035, 1.36),
      bodyMat
    );
    roofPanel.position.set(-0.31, 1.355, 0);
    group.add(roofPanel);

    // A-Pillars, B-Pillars & Fastback C-Pillars Framing the Windows (Terminating flush under roof)
    [-0.67, 0.67].forEach(pz => {
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.035, 0.04), bodyMat);
      aPillar.rotation.z = -0.72;
      aPillar.position.set(0.48, 1.05, pz);
      group.add(aPillar);

      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.035), darkTrimMat);
      bPillar.position.set(-0.30, 1.08, pz * 1.01);
      group.add(bPillar);

      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.035, 0.04), bodyMat);
      cPillar.rotation.z = 0.52;
      cPillar.position.set(-1.26, 1.08, pz);
      group.add(cPillar);

      const wTrim = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.015, 0.02), chromeMat);
      wTrim.position.set(-0.40, 0.78, pz * 1.01);
      group.add(wTrim);
    });

    // 3. Compact Door-Mounted Side Mirrors (Box 0.08x0.08x0.12 + Silver Mirror Face)
    [-0.72, 0.72].forEach(mz => {
      const isLeft = mz > 0;
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), darkTrimMat);
      stalk.position.set(0.70, 0.79, mz * 0.94);
      group.add(stalk);

      const mirrorPod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), bodyMat);
      mirrorPod.position.set(0.70, 0.80, mz);
      group.add(mirrorPod);

      const mFace = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), mirrorFaceMat);
      mFace.rotation.y = -Math.PI / 2; // Facing rearward in -X
      mFace.position.set(0.65, 0.80, mz + (isLeft ? -0.01 : 0.01));
      group.add(mFace);
    });

    // 5. Front Horizontal Grille (Flush Recessed Fit inside Bumper Aperture)
    // Recessed backward by 0.08 units inside bumper opening (X = 2.14)
    const grilleAperture = new THREE.Group();
    grilleAperture.position.set(2.14, 0.54, 0);

    // Embedded Dark Bumper Cavity (extends backward inside bumper)
    const gCavity = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 1.06), darkMeshMat);
    grilleAperture.add(gCavity);

    // Upper Chrome Brow Bar
    const chromeBrow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 1.04), chromeMat);
    chromeBrow.position.set(0.08, 0.10, 0);
    grilleAperture.add(chromeBrow);

    // Horizontal Black Grille Louver Slats
    [-0.04, 0.02].forEach(gy => {
      const gSlat = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 1.00), darkTrimMat);
      gSlat.position.set(0.07, gy, 0);
      grilleAperture.add(gSlat);
    });

    // Center Chrome Honda 'H' Monogram Badge
    const hFrame = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.09, 0.11), chromeMat);
    hFrame.position.set(0.09, 0.02, 0);
    grilleAperture.add(hFrame);

    const hCenter = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.015, 0.06), chromeMat);
    hCenter.position.set(0.09, 0.02, 0);
    grilleAperture.add(hCenter);

    group.add(grilleAperture);

    // 6. Jewel-Eye Horizontal LED Headlights
    [-0.65, 0.65].forEach(hz => {
      const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.34), darkTrimMat);
      hlHousing.position.set(2.18, 0.58, hz);
      group.add(hlHousing);

      const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.28), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlLens.position.set(2.26, 0.58, hz);
      group.add(hlLens);

      const hlDrl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.28), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
      hlDrl.position.set(2.22, 0.63, hz);
      group.add(hlDrl);
    });

    // 7. Rear Connected Full-Width LED Taillight Bar Across Trunk
    const tlBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.40), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    tlBar.position.set(-2.26, 0.86, 0);
    group.add(tlBar);

    // Rear Dual Exhaust Cutouts in Lower Bumper
    [-0.60, 0.60].forEach(ez => {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), chromeMat);
      tip.position.set(-2.28, 0.28, ez);
      group.add(tip);
    });

    // 8. 4 Two-Tone 10-Spoke Diamond-Cut Alloy Wheels (Charcoal-Black Rubber Tires #1c1e21)
    [-0.85, 0.85].forEach(wz => {
      [-1.42, 1.42].forEach(wx => {
        const wheel = create10SpokeAlloyWheel(0.35, 0.20, 0xcbd5e1, false, 0x1c1e21);
        wheel.position.set(wx, 0.35, wz);
        group.add(wheel);
        group.userData.wheels.push(wheel);
      });
    });

    // Dark Wheel Well Tub Liners
    [-0.82, 0.82].forEach(wz => {
      [-1.42, 1.42].forEach(wx => {
        const tub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16, 1, true, 0, Math.PI),
          darkMeshMat
        );
        tub.rotation.x = Math.PI / 2;
        tub.rotation.z = Math.PI;
        tub.position.set(wx, 0.35, wz);
        group.add(tub);
      });
    });

    return group;
  }

  // -------------------------------------------------------------
  // Model 3: Range Rover Luxury SUV Builder
  // -------------------------------------------------------------
  function buildCarRangeRover(config) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness !== undefined ? config.metalness : 0.45,
      roughness: config.roughness !== undefined ? config.roughness : 0.30
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: config.roofColor || config.bodyColor,
      metalness: 0.50,
      roughness: config.contrastRoof ? 0.25 : (config.roughness || 0.30)
    });
    const blackTrimMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.40, metalness: 0.50 });
    const darkTrimMat = blackTrimMat;
    const darkChassisMat = blackTrimMat;
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.80, roughness: 0.25 });
    const darkMeshMat = new THREE.MeshStandardMaterial({ color: 0x080a0f, roughness: 0.85, metalness: 0.3 });
    const darkGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.10,
      metalness: 0.90,
      transparent: true,
      opacity: 0.65 // Softly visible driver silhouette
    });
    const glassMat = darkGlassMat;
    const mirrorFaceMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.10
    });

    // 1. Monolithic Luxury SUV Lower Body (Beltline Down, Length 5.0, Width 1.98, Height up to 1.08)
    const bodyLowerShape = new THREE.Shape();
    bodyLowerShape.moveTo(2.48, 0.30);               // Front chin
    bodyLowerShape.lineTo(2.46, 0.62);               // Bumper front
    bodyLowerShape.lineTo(2.42, 0.98);               // Upper nose header / hood front
    bodyLowerShape.lineTo(0.92, 1.08);               // Flat muscular hood line
    bodyLowerShape.lineTo(-2.44, 1.08);              // Continuous razor-straight waistline to rear corner
    bodyLowerShape.lineTo(-2.44, 0.52);              // Flush upright rear tailgate
    bodyLowerShape.lineTo(-2.20, 0.34);              // High-clearance boat-tail rear bumper taper
    bodyLowerShape.lineTo(-1.95, 0.30);              // Rear arch base
    // Rear wheel arch cutout (centered precisely at X = -1.55, clear radius ~0.47)
    bodyLowerShape.bezierCurveTo(-1.92, 0.72, -1.18, 0.72, -1.15, 0.30);
    bodyLowerShape.lineTo(1.15, 0.30);               // Side sill (ground clearance Y = 0.30)
    // Front wheel arch cutout (centered precisely at X = 1.55, clear radius ~0.47)
    bodyLowerShape.bezierCurveTo(1.18, 0.72, 1.92, 0.72, 1.95, 0.30);
    bodyLowerShape.lineTo(2.48, 0.30);               // Front chin connection

    const bodyLowerGeo = new THREE.ExtrudeGeometry(bodyLowerShape, {
      depth: 1.86,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 12
    });
    bodyLowerGeo.translate(0, 0, -1.86 / 2);
    const bodyLowerMesh = new THREE.Mesh(bodyLowerGeo, bodyMat);
    bodyLowerMesh.castShadow = true;
    bodyLowerMesh.receiveShadow = true;
    group.add(bodyLowerMesh);

    // 2. Luxury SUV Greenhouse (Watertight Extruded Tinted Glass Canopy + Roof Cap)
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(0.88, 1.08);                  // Windshield base at hood
    cabinShape.lineTo(0.42, 1.68);                  // A-pillar rake to roof front
    cabinShape.lineTo(-2.38, 1.66);                 // Long signature floating roofline to rear spoiler
    cabinShape.lineTo(-2.44, 1.08);                 // Sleek near-vertical tailgate rear glass
    cabinShape.lineTo(0.88, 1.08);                  // Beltline bottom
    cabinShape.closePath();

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.68,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
      curveSegments: 12
    });
    cabinGeo.translate(0, 0, -1.68 / 2);
    const cabinMesh = new THREE.Mesh(cabinGeo, darkGlassMat);
    group.add(cabinMesh);

    // Seated 3D Human Driver Silhouette inside Cabin
    const driverGroup = buildCarDriver('range_rover');
    group.add(driverGroup);

    // Floating Roof Cap (Blacked-out pillars & contrast or matching roof)
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.05, 1.72), roofMat);
    roofCap.position.set(-0.98, 1.685, 0);
    group.add(roofCap);

    // Blacked-Out A, B, C, D Pillars (Terminating flush under roof cap)
    [-0.84, 0.84].forEach(pz => {
      // Slanted A-Pillar
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.04), blackTrimMat);
      aPillar.rotation.z = -0.74;
      aPillar.position.set(0.65, 1.38, pz);
      group.add(aPillar);

      // Vertical B-Pillar
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.04), blackTrimMat);
      bPillar.position.set(-0.15, 1.37, pz);
      group.add(bPillar);

      // C-Pillar
      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.04), blackTrimMat);
      cPillar.position.set(-1.25, 1.37, pz);
      group.add(cPillar);

      // Upright D-Pillar (At rear corner edge)
      const dPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 0.04), blackTrimMat);
      dPillar.position.set(-2.38, 1.37, pz);
      group.add(dPillar);
    });

    // 3. Compact Door-Mounted Side Mirrors (Box 0.08x0.08x0.12 + Silver Mirror Face)
    [-0.88, 0.88].forEach(mz => {
      const isLeft = mz > 0;
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), blackTrimMat);
      stalk.position.set(0.80, 1.12, mz * 0.94);
      group.add(stalk);

      const mirrorPod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), blackTrimMat);
      mirrorPod.position.set(0.80, 1.14, mz);
      group.add(mirrorPod);

      const mFace = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), mirrorFaceMat);
      mFace.rotation.y = -Math.PI / 2; // Facing rearward in -X
      mFace.position.set(0.75, 1.14, mz + (isLeft ? -0.01 : 0.01));
      group.add(mFace);
    });

    // 5. Front Minimalist Grille (Flush Recessed Fit inside Bumper Aperture)
    // Recessed backward by 0.08 units inside front aperture (X = 2.38)
    const grilleAperture = new THREE.Group();
    grilleAperture.position.set(2.38, 0.88, 0);

    const gCavity = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 1.24), darkMeshMat);
    grilleAperture.add(gCavity);

    const gSurround = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 1.22), silverMat);
    gSurround.position.set(0.08, 0, 0);
    grilleAperture.add(gSurround);

    const gMeshFace = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.16, 1.16), blackTrimMat);
    gMeshFace.position.set(0.085, 0, 0);
    grilleAperture.add(gMeshFace);

    // Oval Land Rover Green Badge in Corner
    const lrBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.045, 12), new THREE.MeshBasicMaterial({ color: 0x064e3b }));
    lrBadge.rotation.z = Math.PI / 2;
    lrBadge.position.set(0.09, 0.04, 0.44);
    grilleAperture.add(lrBadge);

    group.add(grilleAperture);

    // 6. LED Matrix Projector Headlights
    [-0.74, 0.74].forEach(hz => {
      const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.34), blackTrimMat);
      hlHousing.position.set(2.40, 0.92, hz);
      group.add(hlHousing);

      const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.28), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlLens.position.set(2.48, 0.92, hz);
      group.add(hlLens);
    });

    // 7. Signature Vertical Front Door Graphic Blade
    [-0.99, 0.99].forEach(sz => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.03), silverMat);
      blade.position.set(0.65, 0.88, sz);
      group.add(blade);

      const bladeAccent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.035), blackTrimMat);
      bladeAccent.position.set(0.65, 0.88, sz);
      group.add(bladeAccent);
    });

    // 8. Hidden-Until-Lit Vertical Taillight Strips Flush-Embedded on Rear Corner Edges
    [-0.86, 0.86].forEach(tz => {
      const vertLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.50, 0.045),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      vertLight.position.set(-2.435, 1.36, tz);
      group.add(vertLight);
    });

    // Horizontal Gloss-Black Connecting Bar across Upper Tailgate
    const tailgateBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 1.68), blackTrimMat);
    tailgateBar.position.set(-2.435, 1.60, 0);
    group.add(tailgateBar);

    // 9. 4 Luxury SUV 10-Spoke Alloy Wheels (Charcoal-Black Rubber Tires #1c1e21)
    [-0.92, 0.92].forEach(wz => {
      [-1.55, 1.55].forEach(wx => {
        const wheel = create10SpokeAlloyWheel(0.42, 0.24, 0xd1d5db, false, 0x1c1e21);
        wheel.position.set(wx, 0.42, wz);
        group.add(wheel);
        group.userData.wheels.push(wheel);
      });
    });

    // Dark Wheel Well Tub Liners
    [-0.88, 0.88].forEach(wz => {
      [-1.55, 1.55].forEach(wx => {
        const tub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.45, 0.45, 0.16, 16, 1, true, 0, Math.PI),
          darkMeshMat
        );
        tub.rotation.x = Math.PI / 2;
        tub.rotation.z = Math.PI;
        tub.position.set(wx, 0.42, wz);
        group.add(tub);
      });
    });

    return group;
  }

  // -------------------------------------------------------------
  // Model 4: Toyota Land Cruiser Prado / LC300 SUV Builder
  // -------------------------------------------------------------
  function buildCarLandCruiser(config) {
    const group = new THREE.Group();
    group.userData.wheels = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness !== undefined ? config.metalness : 0.55,
      roughness: config.roughness !== undefined ? config.roughness : 0.25
    });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.90, roughness: 0.15 });
    const blackTrimMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.70 });
    const darkTrimMat = blackTrimMat;
    const darkChassisMat = blackTrimMat;
    const darkMeshMat = new THREE.MeshStandardMaterial({ color: 0x080a0f, roughness: 0.85, metalness: 0.3 });
    const darkGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.10,
      metalness: 0.90,
      transparent: true,
      opacity: 0.65 // Softly visible driver silhouette
    });
    const glassMat = darkGlassMat;
    const mirrorFaceMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.10
    });

    // 1. Robust Off-Road Lower Body (Beltline Down, Length 4.9, Width 1.98, Height up to 1.16)
    const bodyLowerShape = new THREE.Shape();
    bodyLowerShape.moveTo(2.44, 0.36);               // Front lower bumper / skid base
    bodyLowerShape.lineTo(2.42, 0.68);               // Bumper face
    bodyLowerShape.lineTo(2.38, 1.06);               // Upper nose header / hood front
    bodyLowerShape.lineTo(0.88, 1.16);               // High muscular hood line
    bodyLowerShape.lineTo(-2.36, 1.14);              // Waistline along cargo area
    bodyLowerShape.lineTo(-2.42, 0.38);              // Rear bumper tail drop
    bodyLowerShape.lineTo(-2.05, 0.34);              // Rear underbody
    bodyLowerShape.lineTo(-1.90, 0.34);              // Rear arch base
    // Rear wheel arch cutout (centered precisely at X = -1.50, clear radius ~0.48)
    bodyLowerShape.bezierCurveTo(-1.88, 0.74, -1.12, 0.74, -1.10, 0.34);
    bodyLowerShape.lineTo(1.10, 0.34);               // Side sill (ground clearance Y = 0.34)
    // Front wheel arch cutout (centered precisely at X = 1.50, clear radius ~0.48)
    bodyLowerShape.bezierCurveTo(1.12, 0.74, 1.88, 0.74, 1.90, 0.34);
    bodyLowerShape.lineTo(2.44, 0.36);               // Front chin connection

    const bodyLowerGeo = new THREE.ExtrudeGeometry(bodyLowerShape, {
      depth: 1.86,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 12
    });
    bodyLowerGeo.translate(0, 0, -1.86 / 2);
    const bodyLowerMesh = new THREE.Mesh(bodyLowerGeo, bodyMat);
    bodyLowerMesh.castShadow = true;
    bodyLowerMesh.receiveShadow = true;
    group.add(bodyLowerMesh);

    // Twin Power-Dome Hood Ridges
    [-0.35, 0.35].forEach(hz => {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.06, 0.18), bodyMat);
      ridge.position.set(1.65, 1.12, hz);
      group.add(ridge);
    });

    // 2. High Off-Road Greenhouse (Watertight Extruded Tinted Glass Canopy + Roof Panel)
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(0.95, 1.12);                  // Windshield base at hood
    cabinShape.lineTo(0.32, 1.80);                  // A-pillar rake to roof top
    cabinShape.lineTo(-1.90, 1.80);                 // Flat off-road roofline
    cabinShape.lineTo(-2.25, 1.12);                 // Upright SUV tailgate window
    cabinShape.lineTo(0.95, 1.12);                  // Beltline bottom
    cabinShape.closePath();

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.66,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
      curveSegments: 12
    });
    cabinGeo.translate(0, 0, -1.66 / 2);
    const cabinMesh = new THREE.Mesh(cabinGeo, darkGlassMat);
    group.add(cabinMesh);

    // Seated 3D Human Driver Silhouette inside Cabin
    const driverGroup = buildCarDriver('land_cruiser');
    group.add(driverGroup);

    // Body-colored roof panel flush on top
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(2.26, 0.045, 1.68),
      bodyMat
    );
    roofPanel.position.set(-0.78, 1.815, 0);
    group.add(roofPanel);

    // Body-Colored A, B, C, D Pillars (Terminating flush under roof panel)
    [-0.82, 0.82].forEach(pz => {
      // Slanted A-Pillar
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.045, 0.05), bodyMat);
      aPillar.rotation.z = -0.78;
      aPillar.position.set(0.60, 1.46, pz);
      group.add(aPillar);

      // B-Pillar
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.60, 0.05), blackTrimMat);
      bPillar.position.set(-0.25, 1.46, pz);
      group.add(bPillar);

      // C-Pillar
      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.60, 0.05), bodyMat);
      cPillar.position.set(-1.10, 1.46, pz);
      group.add(cPillar);

      // Upright D-Pillar
      const dPillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.60, 0.05), bodyMat);
      dPillar.position.set(-1.85, 1.46, pz);
      group.add(dPillar);
    });

    // 3. Compact Door-Mounted Side Mirrors (Box 0.08x0.08x0.12 + Silver Mirror Face)
    [-0.88, 0.88].forEach(mz => {
      const isLeft = mz > 0;
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), blackTrimMat);
      stalk.position.set(0.76, 1.18, mz * 0.94);
      group.add(stalk);

      const mirrorPod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), chromeMat);
      mirrorPod.position.set(0.76, 1.20, mz);
      group.add(mirrorPod);

      const mFace = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), mirrorFaceMat);
      mFace.rotation.y = -Math.PI / 2; // Facing rearward in -X
      mFace.position.set(0.71, 1.20, mz + (isLeft ? -0.01 : 0.01));
      group.add(mFace);
    });

    // 5. Massive 4-Bar Horizontal Chrome Grille (Flush Recessed Fit inside Bumper Aperture)
    // Recessed backward by 0.08 units inside front aperture (X = 2.34)
    const grilleAperture = new THREE.Group();
    grilleAperture.position.set(2.34, 0.94, 0);

    const gCavity = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 1.30), darkMeshMat);
    grilleAperture.add(gCavity);

    // 4 Heavy Horizontal Chrome Bars
    [-0.12, -0.04, 0.04, 0.12].forEach(by => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 1.26), chromeMat);
      bar.position.set(0.09, by, 0);
      grilleAperture.add(bar);
    });

    // Center Toyota Triple-Oval Chrome Emblem
    const emblemOuter = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.009, 8, 24), chromeMat);
    emblemOuter.rotation.y = Math.PI / 2;
    emblemOuter.position.set(0.11, 0.03, 0);
    grilleAperture.add(emblemOuter);

    const emblemHoriz = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.007, 6, 20), chromeMat);
    emblemHoriz.rotation.y = Math.PI / 2;
    emblemHoriz.scale.set(1, 0.60, 1);
    emblemHoriz.position.set(0.115, 0.03, 0);
    grilleAperture.add(emblemHoriz);

    group.add(grilleAperture);

    // 6. Squared-Off 3-Beam LED Projector Headlights
    [-0.75, 0.75].forEach(hz => {
      const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.34), blackTrimMat);
      hlHousing.position.set(2.36, 0.96, hz);
      group.add(hlHousing);

      const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.28), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hlLens.position.set(2.44, 0.96, hz);
      group.add(hlLens);
    });

    // 7. Front Lower Skid Plate
    const skidPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 1.20), chromeMat);
    skidPlate.position.set(2.40, 0.38, 0);
    group.add(skidPlate);

    // 8. Roof Rails (Left & Right)
    [-0.78, 0.78].forEach(rz => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.20, 8), chromeMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(-0.70, 1.86, rz);
      group.add(rail);

      [-1.6, -0.7, 0.2].forEach(px => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), blackTrimMat);
        post.position.set(px, 1.83, rz);
        group.add(post);
      });
    });

    // 9. Side Running Boards / Steps
    [-1.02, 1.02].forEach(sz => {
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.05, 0.18), chromeMat);
      board.position.set(0, 0.32, sz);
      group.add(board);

      const tread = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.02, 0.14), blackTrimMat);
      tread.position.set(0, 0.35, sz);
      group.add(tread);
    });

    // 10. Rear Upright Tailgate & Blocky LED Taillights
    [-0.78, 0.78].forEach(tz => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.22), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(-2.44, 1.10, tz);
      group.add(tl);
    });

    const badgeBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.90), chromeMat);
    badgeBar.position.set(-2.44, 1.08, 0);
    group.add(badgeBar);

    // 11. 4 Heavy-Duty All-Terrain Off-Road Wheels (Charcoal-Black Rubber Tires #1c1e21)
    [-0.92, 0.92].forEach(wz => {
      [-1.50, 1.50].forEach(wx => {
        const wheel = create10SpokeAlloyWheel(0.43, 0.25, 0x94a3b8, true, 0x1c1e21);
        wheel.position.set(wx, 0.43, wz);
        group.add(wheel);
        group.userData.wheels.push(wheel);
      });
    });

    // Dark Wheel Well Tub Liners
    [-0.88, 0.88].forEach(wz => {
      [-1.50, 1.50].forEach(wx => {
        const tub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.46, 0.16, 16, 1, true, 0, Math.PI),
          darkMeshMat
        );
        tub.rotation.x = Math.PI / 2;
        tub.rotation.z = Math.PI;
        tub.position.set(wx, 0.43, wz);
        group.add(tub);
      });
    });

    return group;
  }

  // -------------------------------------------------------------
  // Master Car Package & Procedural 3D Car Factory
  // -------------------------------------------------------------
  function buildCarPackage(config, variantIndex) {
    const carPackage = new THREE.Group();
    carPackage.userData.wheels = [];

    let carModelGroup;
    if (config.carType === 'mercedes_amg') {
      carModelGroup = buildCarMercedesAMGGT(config);
    } else if (config.carType === 'honda_sedan') {
      carModelGroup = buildCarHondaSedan(config);
    } else if (config.carType === 'range_rover') {
      carModelGroup = buildCarRangeRover(config);
    } else {
      carModelGroup = buildCarLandCruiser(config);
    }

    // Scale entire car package down by 25% (0.75x) to match realistic street proportions
    carModelGroup.scale.setScalar(0.75);
    carModelGroup.position.set(0, 0, 0);

    carPackage.add(carModelGroup);
    carPackage.userData.wheels = carModelGroup.userData.wheels || [];
    carPackage.userData.wheelRadius = (config.wheelRadius || 0.35) * 0.75;
    return carPackage;
  }

  let globalNextCarDeckIndex = 0;

  function createProcedural3DCar(seed, vData) {
    const rootMesh = new THREE.Group();
    rootMesh.userData.isCar = true;

    // Pick variant: if vData.variantIndex specified, use it; else cycle through deck
    let variantIndex;
    if (vData && typeof vData.variantIndex === 'number') {
      variantIndex = vData.variantIndex % CAR_VARIANT_DECK.length;
    } else if (vData && typeof vData.carModelIndex === 'number') {
      variantIndex = (vData.carModelIndex * 4) % CAR_VARIANT_DECK.length;
    } else {
      variantIndex = (globalNextCarDeckIndex++) % CAR_VARIANT_DECK.length;
    }

    const config = CAR_VARIANT_DECK[variantIndex];
    const carPackage = buildCarPackage(config, variantIndex);
    rootMesh.add(carPackage);

    rootMesh.userData.carPackage = carPackage;
    rootMesh.userData.wheels = carPackage.userData.wheels || [];
    rootMesh.userData.wheelRadius = (config.wheelRadius || 0.35) * 10 * 0.75;
    rootMesh.userData.currentVariantIndex = variantIndex;
    rootMesh.userData.modelKey = config.modelKey;
    rootMesh.userData.modelTitle = config.modelTitle;

    // Zero-lag additive headlight ground pool (flat plane at y = 0.02, scaled 0.75x)
    const headGlowMat = new THREE.MeshBasicMaterial({
      map: getRadialGlowTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 0.50,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const headGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.4 * 0.75, 2.2 * 0.75), headGlowMat);
    headGlow.rotation.x = -Math.PI / 2;
    headGlow.position.set(((config.length / 2) + 0.8) * 0.75, 0.02, 0);
    rootMesh.add(headGlow);
    rootMesh.userData.headGlow = headGlow;

    // Coordinate scale matching crossroads traffic grid
    rootMesh.scale.set(10, 10, 10);
    return rootMesh;
  }

  function createAerodynamicCar(archetypeIdx) {
    return createProcedural3DCar(archetypeIdx, { variantIndex: archetypeIdx });
  }

  // Dynamic Car Variant Swapper on Wrap-Around / Respawn
  function swapCarVariant(rootMesh, targetVariantIndex) {
    if (!rootMesh || !rootMesh.userData || !rootMesh.userData.isCar) return;

    let newIndex;
    if (typeof targetVariantIndex === 'number') {
      newIndex = ((targetVariantIndex % CAR_VARIANT_DECK.length) + CAR_VARIANT_DECK.length) % CAR_VARIANT_DECK.length;
    } else {
      newIndex = ((rootMesh.userData.currentVariantIndex || 0) + 1) % CAR_VARIANT_DECK.length;
    }

    const config = CAR_VARIANT_DECK[newIndex];
    if (!config) return;

    // Cleanly remove & dispose old carPackage
    if (rootMesh.userData.carPackage) {
      rootMesh.remove(rootMesh.userData.carPackage);
      rootMesh.userData.carPackage.traverse(obj => {
        if (obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
          } else if (typeof obj.material.dispose === 'function') {
            obj.material.dispose();
          }
        }
      });
    }

    const newCarPackage = buildCarPackage(config, newIndex);
    rootMesh.add(newCarPackage);
    rootMesh.userData.carPackage = newCarPackage;
    rootMesh.userData.wheels = newCarPackage.userData.wheels || [];
    rootMesh.userData.wheelRadius = (config.wheelRadius || 0.35) * 10 * 0.75;
    rootMesh.userData.modelKey = config.modelKey;
    rootMesh.userData.modelTitle = config.modelTitle;
    rootMesh.userData.currentVariantIndex = newIndex;

    if (rootMesh.userData.headGlow) {
      rootMesh.userData.headGlow.position.x = ((config.length / 2) + 0.8) * 0.75;
    }

    if (activeTargetVehicle && activeTargetVehicle.mesh === rootMesh) {
      const title = document.getElementById('crossroadsModePillTitle');
      if (title && activeTargetVehicle.data) {
        const dirLabel = activeTargetVehicle.data.dir === 'EB' ? 'Eastbound' :
                         activeTargetVehicle.data.dir === 'WB' ? 'Westbound' :
                         activeTargetVehicle.data.dir === 'SB' ? 'Southbound' : 'Northbound';
        title.textContent = `${config.modelTitle} · ${dirLabel}`;
      }
    }

    return newIndex;
  }

  window.createProcedural3DCar = createProcedural3DCar;
  window.createAerodynamicCar = createAerodynamicCar;
  window.createCurvedSportsCar = createAerodynamicCar;
  window.swapCarVariant = swapCarVariant;
  window.CAR_VARIANT_DECK = CAR_VARIANT_DECK;
  window.buildCarMercedesAMGGT = buildCarMercedesAMGGT;
  window.buildCarHondaSedan = buildCarHondaSedan;
  window.buildCarRangeRover = buildCarRangeRover;
  window.buildCarLandCruiser = buildCarLandCruiser;

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
  let sharedCngAlponaTexture = null;
  function getCNGSideTexture() {
    if (sharedCngDecalTexture) return sharedCngDecalTexture;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 512, 256);

    // Festive Bunting Garland across roofline
    const flags = 15;
    const fW = 512 / flags;
    const flagColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    for (let i = 0; i < flags; i++) {
      ctx.fillStyle = flagColors[i % flagColors.length];
      ctx.beginPath();
      ctx.moveTo(i * fW, 0);
      ctx.lineTo((i + 1) * fW, 0);
      ctx.lineTo(i * fW + fW / 2, 26);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(512, 0); ctx.stroke();

    // Rear Quarter Panel: "★ FOR HIRE ★" White plaque with red stars & border
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(16, 85, 230, 38);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(16, 85, 230, 38);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ FOR HIRE ★', 131, 104);

    // Lemon-Yellow Band: ONE PARIBAHAN
    ctx.fillStyle = '#facc15';
    ctx.fillRect(16, 130, 230, 34);
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(16, 130, 230, 34);

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('ONE PARIBAHAN', 131, 147);

    // White Dashed Stitch Lines on lower body
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(16, 172, 230, 72);

    // Doors section
    ctx.strokeRect(260, 48, 115, 196);
    ctx.strokeRect(385, 48, 115, 196);
    ctx.setLineDash([]);

    // Shield Stencil on passenger door
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(302, 140); ctx.lineTo(332, 140);
    ctx.lineTo(332, 170); ctx.quadraticCurveTo(317, 195, 317, 200);
    ctx.quadraticCurveTo(317, 195, 302, 170);
    ctx.closePath();
    ctx.fill();

    // Pitcher Stencil on driver door
    ctx.beginPath();
    ctx.arc(442, 150, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(436, 158); ctx.lineTo(448, 158);
    ctx.lineTo(454, 185); ctx.lineTo(430, 185);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(432, 185, 20, 4);

    const texture = new THREE.CanvasTexture(cv);
    texture.minFilter = THREE.LinearFilter;
    sharedCngDecalTexture = texture;
    return sharedCngDecalTexture;
  }
  function getCngSideDecalTexture() {
    return getCNGSideTexture();
  }

  function getCNGAlponaTexture() {
    if (sharedCngAlponaTexture) return sharedCngAlponaTexture;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.0;
    const scallops = 20;
    const sW = 512 / scallops;
    ctx.beginPath();
    for (let i = 0; i < scallops; i++) {
      ctx.arc(i * sW + sW / 2, 28, sW / 2, Math.PI, 0, true);
    }
    ctx.stroke();

    for (let i = 0; i < scallops; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(i * sW + sW / 2, 18, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawAlponaVine(cx, cy, scale, flip) {
      ctx.save();
      ctx.translate(cx, cy);
      if (flip) ctx.scale(-1, 1);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(40 * scale, -25 * scale, 65 * scale, 30 * scale, 110 * scale, -10 * scale);
      ctx.stroke();

      const lColors = ['#ffffff', '#fef08a', '#86efac'];
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        const lx = t * 100 * scale;
        const ly = Math.sin(t * Math.PI) * 20 * scale;
        ctx.fillStyle = lColors[i % lColors.length];
        ctx.beginPath();
        ctx.ellipse(lx, ly, 12 * scale, 5 * scale, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawAlponaVine(256, 120, 1.2, false);
    drawAlponaVine(256, 120, 1.2, true);
    drawAlponaVine(256, 360, 1.2, false);
    drawAlponaVine(256, 360, 1.2, true);

    // Central Mandala
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4.0;
    ctx.beginPath(); ctx.arc(256, 240, 105, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.beginPath(); ctx.arc(256, 240, 92, 0, Math.PI * 2); ctx.stroke();

    const petals = 16;
    for (let p = 0; p < petals; p++) {
      const ang = (p * Math.PI * 2) / petals;
      ctx.save();
      ctx.translate(256, 240);
      ctx.rotate(ang);
      ctx.fillStyle = (p % 2 === 0) ? '#fef08a' : '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 52, 9, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, 24, 5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath(); ctx.arc(256, 240, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(256, 240, 8, 0, Math.PI * 2); ctx.fill();

    // BRTA License Plate
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(80, 410, 352, 70);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(80, 410, 352, 70);

    ctx.fillStyle = '#059669';
    ctx.beginPath(); ctx.arc(120, 445, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath(); ctx.arc(118, 445, 10, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DHAKA METRO - THA', 270, 432);
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.fillText('11-2468', 270, 460);

    const texture = new THREE.CanvasTexture(cv);
    texture.minFilter = THREE.LinearFilter;
    sharedCngAlponaTexture = texture;
    return sharedCngAlponaTexture;
  }

  
  let sharedLungiTexture = null;
  function getLungiTexture() {
    if (sharedLungiTexture) return sharedLungiTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#263d7a';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 16) {
      ctx.strokeStyle = '#172750';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();

      ctx.strokeStyle = '#3d5c9e';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, y + 4); ctx.lineTo(256, y + 4); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(10, 18, 40, 0.4)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.5, 2.5);
    sharedLungiTexture = tex;
    return sharedLungiTexture;
  }

  let sharedGamchaTexture = null;
  function getGamchaTexture() {
    if (sharedGamchaTexture) return sharedGamchaTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#fee2e2';
    ctx.lineWidth = 6;
    for (let x = 0; x < 128; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
    }
    for (let y = 0; y < 128; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
    }
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    for (let x = 12; x < 128; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 4);
    sharedGamchaTexture = tex;
    return sharedGamchaTexture;
  }

  let sharedPullerFaceTexture = null;
  function getPullerFaceTexture() {
    if (sharedPullerFaceTexture) return sharedPullerFaceTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 1. Base Warm Authentic Bengali Bronze Skin Tone
    const skinGrad = ctx.createLinearGradient(0, 0, 0, 512);
    skinGrad.addColorStop(0, '#75402c');
    skinGrad.addColorStop(0.3, '#8e523b');
    skinGrad.addColorStop(0.7, '#854b35');
    skinGrad.addColorStop(1, '#663724');
    ctx.fillStyle = skinGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Culturally Authentic Haircut (natural hairline, neat sideburns, clean neck)
    ctx.fillStyle = '#141416';
    // Crown and top of head (y: 0-180)
    ctx.fillRect(0, 0, 512, 180);
    // Back of head down to nape of neck (y: 180-350)
    ctx.fillRect(0, 180, 148, 170);
    ctx.fillRect(364, 180, 148, 170);

    // Natural curved hairline & sideburns (ends cleanly at mid-ear level y = 255)
    ctx.beginPath();
    ctx.moveTo(148, 350);
    ctx.lineTo(150, 255); // Right sideburn
    ctx.bezierCurveTo(175, 192, 215, 182, 256, 186); // Right forehead arch
    ctx.bezierCurveTo(297, 182, 337, 192, 362, 255); // Left forehead arch
    ctx.lineTo(364, 350); // Left sideburn
    ctx.lineTo(512, 350);
    ctx.lineTo(512, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, 350);
    ctx.closePath();
    ctx.fill();

    // 3. Eyebrows (masculine, defined, slightly angled)
    ctx.strokeStyle = '#141416';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';

    // Left eyebrow (viewer right)
    ctx.beginPath();
    ctx.moveTo(270, 226);
    ctx.quadraticCurveTo(292, 215, 318, 223);
    ctx.stroke();

    // Right eyebrow (viewer left)
    ctx.beginPath();
    ctx.moveTo(242, 226);
    ctx.quadraticCurveTo(220, 215, 194, 223);
    ctx.stroke();

    // 4. Realistic Almond Eyes with warm brown iris and specular catchlight
    [-38, 38].forEach(ox => {
      const ex = 256 + ox;
      const ey = 246;

      // Soft Eye Socket Shadow
      ctx.fillStyle = 'rgba(40, 20, 12, 0.40)';
      ctx.beginPath();
      ctx.ellipse(ex, ey - 2, 20, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sclera (soft natural off-white)
      ctx.fillStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 16, 8.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm Brown Iris
      ctx.fillStyle = '#3a2014';
      ctx.beginPath();
      ctx.arc(ex, ey, 7.0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Specular Catchlight
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + 1.8, ey - 1.8, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Upper Eyelid crease
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 16.5, 8.0, 0, Math.PI * 0.95, Math.PI * 2.05);
      ctx.stroke();
    });

    // 5. Soft Nose Bridge & Nostril Shading (subtle highlight and contour)
    ctx.strokeStyle = 'rgba(70, 35, 20, 0.28)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(253, 230);
    ctx.lineTo(252, 282);
    ctx.stroke();

    // Nostril shadow dots
    ctx.fillStyle = '#381a10';
    ctx.beginPath();
    ctx.ellipse(246, 288, 4.0, 2.2, -0.2, 0, Math.PI * 2);
    ctx.ellipse(266, 288, 4.0, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 6. Authentic Bengali Rickshaw Puller Mustache (full, curved, elegant, matching Image 2)
    ctx.fillStyle = '#141416';
    ctx.beginPath();
    ctx.moveTo(206, 316);
    ctx.quadraticCurveTo(232, 296, 256, 301);
    ctx.quadraticCurveTo(280, 296, 306, 316);
    ctx.quadraticCurveTo(282, 311, 256, 313);
    ctx.quadraticCurveTo(230, 311, 206, 316);
    ctx.closePath();
    ctx.fill();

    // 7. Lips
    ctx.fillStyle = '#7a3c30';
    ctx.beginPath();
    ctx.ellipse(256, 319, 15, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8f4a3d';
    ctx.beginPath();
    ctx.ellipse(256, 327, 13, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft diffused chin crease
    ctx.strokeStyle = 'rgba(60, 30, 18, 0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(256, 336, 12, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    sharedPullerFaceTexture = tex;
    return sharedPullerFaceTexture;
  }

let sharedRickshawArtTexture = null;
  function getRickshawArtTexture() {
    if (sharedRickshawArtTexture) return sharedRickshawArtTexture;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.35, '#1e1b4b');
    grad.addColorStop(0.70, '#831843');
    grad.addColorStop(1, '#db2777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    function drawScallopBorder(inset, r, c1, c2) {
      ctx.fillStyle = c1;
      ctx.strokeStyle = c2;
      ctx.lineWidth = 2.2;
      const step = r * 1.85;
      for (let x = inset; x <= 512 - inset; x += step) {
        ctx.beginPath(); ctx.arc(x, inset, r, 0, Math.PI); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, 512 - inset, r, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      for (let y = inset; y <= 512 - inset; y += step) {
        ctx.beginPath(); ctx.arc(inset, y, r, -Math.PI / 2, Math.PI / 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(512 - inset, y, r, Math.PI / 2, Math.PI * 1.5); ctx.fill(); ctx.stroke();
      }
    }
    drawScallopBorder(14, 11, '#facc15', '#dc2626');
    drawScallopBorder(28, 7, '#38bdf8', '#ffffff');

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(38, 38, 436, 436);

    function drawCornerLotus(cx, cy, rot) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      const pColors = ['#f43f5e', '#ec4899', '#fbbf24', '#34d399'];
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 6);
        ctx.fillStyle = pColors[i];
        ctx.beginPath();
        ctx.ellipse(20, 0, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    drawCornerLotus(48, 48, 0);
    drawCornerLotus(464, 48, Math.PI / 2);
    drawCornerLotus(464, 464, Math.PI);
    drawCornerLotus(48, 464, -Math.PI / 2);

    // Stylized Mayur (Peacock)
    ctx.save();
    ctx.translate(256, 225);
    const feathers = 18;
    for (let f = 0; f < feathers; f++) {
      const ang = Math.PI + (f * Math.PI) / (feathers - 1);
      const fx = Math.cos(ang) * 115;
      const fy = Math.sin(ang) * 100;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = f % 2 === 0 ? '#10b981' : '#06b6d4';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(0, -8, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath(); ctx.arc(0, -8, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#0284c7';
    ctx.beginPath(); ctx.ellipse(0, 28, 34, 42, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(-9, 18);
    ctx.quadraticCurveTo(-22, -22, -11, -44);
    ctx.quadraticCurveTo(-5, -58, 6, -53);
    ctx.quadraticCurveTo(8, -32, 11, 18);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-11, -48); ctx.lineTo(-22, -46); ctx.lineTo(-9, -40); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-3, -46, 3.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(-3, -46, 1.9, 0, Math.PI * 2); ctx.fill();

    for (let c = -1; c <= 1; c++) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(c * 11, -70); ctx.stroke();
      ctx.fillStyle = '#ec4899';
      ctx.beginPath(); ctx.arc(c * 11, -72, 3.8, 0, Math.PI * 2); ctx.fill();
    }

    const lColors = ['#f43f5e', '#fb7185', '#facc15'];
    for (let layer = 0; layer < 3; layer++) {
      const petals = 7;
      ctx.fillStyle = lColors[layer];
      for (let p = 0; p < petals; p++) {
        const pAng = (p - (petals - 1) / 2) * 0.28;
        ctx.save();
        ctx.translate(0, 68 + layer * 6);
        ctx.rotate(pAng);
        ctx.beginPath();
        ctx.ellipse(0, 24 - layer * 5, 13 - layer * 2, 30 - layer * 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(65, 415, 382, 54);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(65, 415, 382, 54);

    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ঢাকা রিকশা আর্ট', 256, 442);

    const texture = new THREE.CanvasTexture(cv);
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
  function create10SpokeAlloyWheel(radius, width, rimColorHex, darkCenter, tireColorHex) {
    const wheelGroup = new THREE.Group();

    // 1. Rubber tire with subtle sidewall bead detail (Dedicated Charcoal-Black #1c1e21)
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
    const tireMat = new THREE.MeshStandardMaterial({
      color: tireColorHex || 0x1c1e21,
      roughness: 0.85,
      metalness: 0.15
    });
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.x = Math.PI / 2;
    wheelGroup.add(tire);

    const tireSidewallMat = new THREE.MeshStandardMaterial({
      color: tireColorHex || 0x1c1e21,
      roughness: 0.85,
      metalness: 0.15
    });
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

  // 3b. Diablo Rosso Sport Tire Sidewall Decal Texture Generator (Cached for 60/90/120 FPS)
  function getSportTireSidewallTexture() {
    if (bikeTextureCache.sidewall) return bikeTextureCache.sidewall;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#16181b';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#22252a';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 256, 218, -Math.PI * 0.42, -Math.PI * 0.08);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 256, 218, Math.PI * 0.58, Math.PI * 0.92);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(-Math.PI * 0.25);
    ctx.fillText('DIABLO ROSSO', 0, -188);
    ctx.restore();

    ctx.save();
    ctx.translate(256, 256);
    ctx.rotate(Math.PI * 0.75);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('200/55 ZR17', 0, -188);
    ctx.restore();

    ctx.strokeStyle = '#2a2d32';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 160, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    bikeTextureCache.sidewall = tex;
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

  // Classic Royal Enfield / Retro Bullet Gold & Red Winged Tank Emblem Texture
  function getBulletWingedEmblemTexture(primaryHex, pinstripeHex) {
    const key = `bulletEmblem_${primaryHex}_${pinstripeHex}`;
    if (bikeTextureCache[key]) return bikeTextureCache[key];
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.clearRect(0, 0, 256, 128);

      const pColStr = '#' + ((pinstripeHex !== undefined ? pinstripeHex : 0xeab308).toString(16).padStart(6, '0'));

      // Outer gold/contrast pinstripe oval
      ctx.save();
      ctx.strokeStyle = pColStr;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(128, 64, 116, 54, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner thin pinstripe
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(128, 64, 106, 46, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Winged badge ribbon (Crimson red wings)
      ctx.fillStyle = '#dc2626';
      // Left wings
      ctx.beginPath();
      ctx.moveTo(128, 64);
      ctx.lineTo(44, 46);
      ctx.lineTo(52, 64);
      ctx.lineTo(40, 72);
      ctx.lineTo(128, 70);
      ctx.closePath();
      ctx.fill();

      // Right wings
      ctx.beginPath();
      ctx.moveTo(128, 64);
      ctx.lineTo(212, 46);
      ctx.lineTo(204, 64);
      ctx.lineTo(216, 72);
      ctx.lineTo(128, 70);
      ctx.closePath();
      ctx.fill();

      // Gold feather accent lines
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      [-10, 0, 8].forEach(dy => {
        ctx.beginPath();
        ctx.moveTo(60, 58 + dy);
        ctx.lineTo(115, 62 + dy * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(196, 58 + dy);
        ctx.lineTo(141, 62 + dy * 0.5);
        ctx.stroke();
      });

      // Center gold shield / crest
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(128, 64, 28, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner crest circle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(128, 64, 16, 0, Math.PI * 2);
      ctx.fill();

      // Gold emblem star
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 64, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      bikeTextureCache[key] = tex;
      return tex;
    } catch (e) {
      return null;
    }
  }


  // Accurate Station-by-Station Y-Z Cross-Section Lofted Mesh Generator (Zero Frenet Twisting!)
  function createLoftedBodyMesh(stations, radSegs, mat) {
    radSegs = radSegs || 24;
    const numStations = stations.length;
    const pos = [];
    const uvs = [];
    const indices = [];

    for (let s = 0; s < numStations; s++) {
      const st = stations[s];
      const u = s / (numStations - 1);
      const ryTop = st.ryTop !== undefined ? st.ryTop : (st.ry !== undefined ? st.ry : 1.0);
      const ryBot = st.ryBot !== undefined ? st.ryBot : (st.ry !== undefined ? st.ry : 1.0);
      const rz = st.rz !== undefined ? st.rz : 1.0;

      for (let j = 0; j <= radSegs; j++) {
        const theta = (j / radSegs) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const ry = cosT >= 0 ? ryTop : ryBot;
        const y = st.center[1] + cosT * ry;
        const z = st.center[2] + sinT * rz;
        const x = st.center[0];

        pos.push(x, y, z);
        uvs.push(j / radSegs, u);
      }
    }

    for (let s = 0; s < numStations - 1; s++) {
      for (let j = 0; j < radSegs; j++) {
        const a = s * (radSegs + 1) + j;
        const b = (s + 1) * (radSegs + 1) + j;
        const c = (s + 1) * (radSegs + 1) + j + 1;
        const d = s * (radSegs + 1) + j + 1;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Solid Articulated Bone Generator (Never twists or inverts!)
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

  // Cached High-Performance Materials for Dual Motorcycles (60/90/120 FPS Rule)
  let _bikeSharedMats = null;
  function getBikeSharedMaterials() {
    if (_bikeSharedMats) return _bikeSharedMats;
    _bikeSharedMats = {
      rubberMat: new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.90 }),
      darkFrameMat: new THREE.MeshStandardMaterial({ color: 0x181a1d, roughness: 0.45, metalness: 0.50 }),
      chromeMat: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.22, metalness: 0.82 }),
      gunmetalEngineMat: new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.38, metalness: 0.65 }),
      bronzeCoverMat: new THREE.MeshStandardMaterial({ color: 0x78563a, roughness: 0.30, metalness: 0.60 }),
      goldAnodizedMat: new THREE.MeshStandardMaterial({ color: 0xd4a024, roughness: 0.22, metalness: 0.82 }),
      darkLeatherMat: new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.80, metalness: 0.05 }),
      discRotorMat: new THREE.MeshStandardMaterial({ map: getDiscRotorTexture(), roughness: 0.25, metalness: 0.85, transparent: true }),
      pearlWhiteMat: new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.18, metalness: 0.15, side: THREE.DoubleSide }),
      matteBlackKneeMat: new THREE.MeshStandardMaterial({ color: 0x1e2124, roughness: 0.85 }),
      smokedVisorMat: new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.10, metalness: 0.20, transparent: true, opacity: 0.80 }),
      glossyBlackMat: new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.15, metalness: 0.30, side: THREE.DoubleSide }),
      crimsonPinstripeMat: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.20 }),
      redRimStripeMat: new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.30, metalness: 0.10 }),
      skinMat: new THREE.MeshStandardMaterial({ color: 0xc8926d, roughness: 0.60, metalness: 0.04 }),
      soleMat: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55, metalness: 0.02 }),
      treadMat: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.05 }),
      whiteMat: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.50 })
    };
    return _bikeSharedMats;
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

  // Explicit Upper-Arch Mudguard Generator with Smooth Normals (y = cy + sin(angle) * r, y > axleY)
  function createUpperArchFender(cx, cy, r, width, startDeg, endDeg, segs, mat, crownDrop) {
    segs = segs || 24;
    crownDrop = crownDrop !== undefined ? crownDrop : 0.08;
    const geo = new THREE.BufferGeometry();
    const pos = [];
    const uvs = [];
    const indices = [];
    const halfW = width / 2;

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const deg = startDeg + t * (endDeg - startDeg);
      const rad = deg * Math.PI / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      const xC = cx + cosR * r;
      const yC = cy + sinR * r;
      const xE = cx + cosR * (r - crownDrop);
      const yE = cy + sinR * (r - crownDrop);

      pos.push(xE, yE, -halfW); // 0
      uvs.push(0, t);
      pos.push(xC, yC, 0);      // 1
      uvs.push(0.5, t);
      pos.push(xE, yE, halfW);  // 2
      uvs.push(1, t);
    }

    for (let i = 0; i < segs; i++) {
      const r0 = i * 3;
      const r1 = (i + 1) * 3;
      indices.push(r0, r1, r0 + 1);
      indices.push(r0 + 1, r1, r1 + 1);
      indices.push(r0 + 1, r1 + 1, r0 + 2);
      indices.push(r0 + 2, r1 + 1, r1 + 2);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  // Anatomical V-Tapered Torso Lofting Function (Lofts smoothly along Y axis from waist to shoulders)
  function createAnatomicalTorso(stations, radSegs, mat) {
    radSegs = radSegs || 24;
    const numStations = stations.length;
    const pos = [];
    const uvs = [];
    const indices = [];

    for (let s = 0; s < numStations; s++) {
      const st = stations[s];
      const v = s / (numStations - 1);
      for (let j = 0; j <= radSegs; j++) {
        const theta = (j / radSegs) * Math.PI * 2;
        const cos = Math.cos(theta); // Depth X
        const sin = Math.sin(theta); // Width Z
        const x = cos * st.rx;
        const y = st.y;
        const z = sin * st.rz;

        pos.push(x, y, z);
        uvs.push(j / radSegs, v);
      }
    }

    for (let s = 0; s < numStations - 1; s++) {
      for (let j = 0; j < radSegs; j++) {
        const a = s * (radSegs + 1) + j;
        const b = (s + 1) * (radSegs + 1) + j;
        const c = (s + 1) * (radSegs + 1) + j + 1;
        const d = s * (radSegs + 1) + j + 1;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // =========================================================================
  // TASK: FULL-FACE HELMET WITH REFLECTIVE SHEEN & 100% SYMMETRICAL 160° VISOR
  // =========================================================================
  let _cachedVisorReflectionTexture = null;
  function getVisorReflectionTexture() {
    if (_cachedVisorReflectionTexture) return _cachedVisorReflectionTexture;
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Base silver-grey tint
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 256, 128);

      // Gradient shadow depth
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 128);
      bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.45)');
      bgGrad.addColorStop(0.5, 'rgba(100, 116, 139, 0.15)');
      bgGrad.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 256, 128);

      // Two crisp diagonal reflection gleam streaks
      ctx.save();
      ctx.rotate(-0.32);

      // Primary gleam band
      const grad1 = ctx.createLinearGradient(-40, 35, 140, 35);
      grad1.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad1.addColorStop(0.5, 'rgba(255, 255, 255, 0.82)');
      grad1.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(-40, 20, 240, 24);

      // Secondary thinner gleam band
      const grad2 = ctx.createLinearGradient(20, 65, 180, 65);
      grad2.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad2.addColorStop(0.5, 'rgba(255, 255, 255, 0.50)');
      grad2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(20, 56, 220, 12);

      ctx.restore();

      _cachedVisorReflectionTexture = new THREE.CanvasTexture(canvas);
      _cachedVisorReflectionTexture.wrapS = THREE.ClampToEdgeWrapping;
      _cachedVisorReflectionTexture.wrapT = THREE.ClampToEdgeWrapping;
      return _cachedVisorReflectionTexture;
    } catch (e) {
      return null;
    }
  }

  // Helper for generating smooth curved aerodynamic bands (visor & chin bar)
  // Perfectly bilaterally symmetrical across forward +X axis (phi = 0)
  function createCurvedHelmetBand(yTop, yBot, rTopX, rTopZ, rBotX, rBotZ, angleSpanRad, segsH, segsV, material) {
    const pos = [];
    const uvs = [];
    const indices = [];
    const halfSpan = angleSpanRad / 2;

    for (let v = 0; v <= segsV; v++) {
      const tv = v / segsV;
      const y = yTop + (yBot - yTop) * tv;
      const rx = rTopX + (rBotX - rTopX) * tv;
      const rz = rTopZ + (rBotZ - rTopZ) * tv;
      for (let h = 0; h <= segsH; h++) {
        const th = h / segsH;
        const phi = -halfSpan + angleSpanRad * th;
        // phi = 0 points STRAIGHT FORWARD along +X (nose axis)
        // phi < 0 points to left (-Z), phi > 0 points to right (+Z)
        const x = rx * Math.cos(phi);
        const z = rz * Math.sin(phi);
        pos.push(x, y, z);
        uvs.push(th, 1 - tv);
      }
    }

    for (let v = 0; v < segsV; v++) {
      for (let h = 0; h < segsH; h++) {
        const a = v * (segsH + 1) + h;
        const b = (v + 1) * (segsH + 1) + h;
        const c = (v + 1) * (segsH + 1) + h + 1;
        const d = v * (segsH + 1) + h + 1;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function createFullFaceHelmet(shellColorHex, cheekTrimColorHex, isCruiser) {
    const helmetGroup = new THREE.Group();

    // Dedicated isolated helmet materials with zero emissive washout and rich saturation
    const shellMat = new THREE.MeshStandardMaterial({
      color: shellColorHex,
      roughness: 0.40,
      metalness: 0.25,
      emissive: 0x000000
    });
    const cheekTrimMat = new THREE.MeshStandardMaterial({
      color: cheekTrimColorHex,
      roughness: 0.45,
      metalness: 0.25,
      emissive: 0x000000
    });
    const visorTex = getVisorReflectionTexture();
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // reflective silver-grey tinted glass
      metalness: 0.85,
      roughness: 0.12,
      map: visorTex || null,
      side: THREE.DoubleSide
    });
    const hingePlateMat = new THREE.MeshStandardMaterial({
      color: 0x26292e, // dark charcoal side hinge plate
      roughness: 0.45,
      metalness: 0.50
    });
    const pivotScrewMat = new THREE.MeshStandardMaterial({
      color: 0x090a0d, // circular black pivot screw button
      roughness: 0.35,
      metalness: 0.75
    });
    const ventMat = new THREE.MeshStandardMaterial({
      color: 0x111317, // black intake vent
      roughness: 0.55,
      metalness: 0.20
    });
    const rubberRimMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10, // black rubber bottom rim
      roughness: 0.90,
      metalness: 0.05
    });

    const helmR = 1.15;

    // 1. Contoured Helmet Shell Dome with flat bottom opening (thetaLength = Math.PI * 0.78)
    const domeGeo = new THREE.SphereGeometry(helmR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.78);
    const domeMesh = new THREE.Mesh(domeGeo, shellMat);
    domeMesh.scale.set(1.08, 1.02, 1.00);
    helmetGroup.add(domeMesh);

    // 2. Sculpted Forward-Jutting Chin Guard Bar with flat bottom rim
    // Spans 160° (Math.PI * 0.888) horizontally, from y = -0.16 down to y = -0.72
    const chinBar = createCurvedHelmetBand(
      -0.16, -0.72,
      helmR * 1.10, helmR * 1.01,
      helmR * 1.05, helmR * 0.95,
      Math.PI * 0.888, 24, 6,
      shellMat
    );
    helmetGroup.add(chinBar);

    // 3. Symmetrical 160° Wrap-Around Curved Visor Shield
    // Centered at 0° along +X (straight forward nose axis), wrapping -80° to +80° symmetrically
    const visorMesh = createCurvedHelmetBand(
      0.20, -0.16,
      helmR * 1.10, helmR * 1.025,
      helmR * 1.12, helmR * 1.025,
      Math.PI * 0.888, 28, 6,
      visorMat
    );
    helmetGroup.add(visorMesh);

    // 4. Front Chin Air Vent: black trapezoidal chin intake vent (#111317) directly below visor
    const ventGroup = new THREE.Group();
    ventGroup.position.set(helmR * 1.09, -0.36, 0);
    ventGroup.rotation.z = -0.16;

    const ventHousing = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.28), ventMat);
    ventGroup.add(ventHousing);

    // Matte black intake scoop recess & center divider
    const ventRecess = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.20), pivotScrewMat);
    ventRecess.position.set(0.04, 0.02, 0);
    ventGroup.add(ventRecess);

    const ventDivider = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.035), ventMat);
    ventDivider.position.set(0.04, 0.01, 0);
    ventGroup.add(ventDivider);

    helmetGroup.add(ventGroup);

    // 5. Lower Cheek / Jaw Trim Panels (darker contoured lower cheek panels)
    [-1, 1].forEach(side => {
      const cheekPanel = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.24, 0.06), cheekTrimMat);
      cheekPanel.position.set(0.06, -0.52, side * (helmR * 0.985));
      cheekPanel.rotation.y = side * 0.08;
      cheekPanel.rotation.z = -0.12;
      helmetGroup.add(cheekPanel);
    });

    // 6. Black Rubber Bottom Base Rim enclosing the bottom neck aperture
    const bottomRim = new THREE.Mesh(new THREE.TorusGeometry(helmR * 0.94, 0.05, 12, 32), rubberRimMat);
    bottomRim.rotation.x = Math.PI / 2;
    bottomRim.scale.set(1.05, 0.96, 1.0);
    bottomRim.position.set(0.02, -0.73, 0);
    helmetGroup.add(bottomRim);

    // 7. Left & Right Side Visor Pivot Hinges with black screw button (#090a0d)
    const hingeAngle = Math.PI * 0.444; // ~80 degrees
    const hingeX = helmR * 1.03 * Math.cos(hingeAngle); // ~0.20
    const hingeZ = helmR * 1.025 * Math.sin(hingeAngle) + 0.02; // ~1.17

    [-1, 1].forEach(side => {
      const hingeGroup = new THREE.Group();
      hingeGroup.position.set(hingeX, 0.02, side * hingeZ);

      // Dark charcoal side hinge plate (#26292e)
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), hingePlateMat);
      plate.rotation.x = Math.PI / 2;
      hingeGroup.add(plate);

      // Circular black pivot screw button (#090a0d)
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 14), pivotScrewMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(0, 0, side * 0.012);
      hingeGroup.add(screw);

      helmetGroup.add(hingeGroup);
    });

    // 8. Aerodynamic Top Crest Fin
    const aeroFin = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.045, 0.06), shellMat);
    aeroFin.position.set(0.06, helmR * 1.02, 0);
    aeroFin.rotation.z = -0.09;
    helmetGroup.add(aeroFin);

    return helmetGroup;
  }

  // =========================================================================
  // TASK: REBUILD 3D BIKER (ANATOMICAL WAIST, FLUSH SADDLE PENETRATION,
  // CLEAN VISIBLE NECK, SYMMETRICAL FULL-FACE HELMET & DISTINCT COLOR PALETTES)
  // =========================================================================
  function buildRealisticBiker(isCruiser, saddlePos, gripLeft, gripRight, pegLeft, pegRight, mats, appearanceSeed, bikeSync) {
    const biker = new THREE.Group();

    // -------------------------------------------------------------------------
    // Task 3: 1:1 Helmet-to-Bike Color Synchronization (Zero Color Mismatch!)
    // Helmet shell matches the motorcycle's exact primary livery color.
    // Outfits vary in curated modern streetwear tones (charcoal, slate, midnight, titanium) with crisp sneakers.
    // -------------------------------------------------------------------------
    const helmShellColor = (bikeSync && bikeSync.helmColor !== undefined)
      ? bikeSync.helmColor
      : (isCruiser ? 0x111317 : 0xf5f6fa);

    const helmCheekColor = (bikeSync && bikeSync.contrastColor !== undefined)
      ? bikeSync.contrastColor
      : 0x181a1d;

    const streetwearPalettes = [
      {
        hoodie: 0x1e293b, // Charcoal slate sweatshirt
        collar: 0x0f172a,
        pants: 0x0f172a,  // Jet-black pants
        shoe: 0xffffff,   // Crisp white sneakers
        stripe: 0x0f172a
      },
      {
        hoodie: 0x27272a, // Dark titanium grey sweatshirt
        collar: 0x18181b,
        pants: 0x1e293b,  // Dark slate cargo pants
        shoe: 0xffffff,   // Crisp white sneakers
        stripe: 0x2563eb
      },
      {
        hoodie: 0x0f172a, // Deep midnight black hoodie
        collar: 0x020617,
        pants: 0x1e293b,  // Charcoal cargo pants
        shoe: 0xf8fafc,   // White sneakers with red accent
        stripe: 0xdc2626
      },
      {
        hoodie: 0x334155, // Slate blue/grey sweatshirt
        collar: 0x1e293b,
        pants: 0x090a0d,  // Black denim
        shoe: 0xffffff,   // Crisp white sneakers
        stripe: 0x475569
      },
      {
        hoodie: 0x3f3f46, // Heather charcoal sweatshirt
        collar: 0x27272a,
        pants: 0x18181b,  // Dark charcoal cargo pants
        shoe: 0xffffff,   // Crisp white sneakers
        stripe: 0x18181b
      }
    ];

    const outfit = (bikeSync && bikeSync.outfit)
      ? bikeSync.outfit
      : streetwearPalettes[Math.abs(appearanceSeed || 0) % streetwearPalettes.length];
    const hoodieColor = outfit.hoodie;
    const collarColor = outfit.collar;
    const pantsColor = outfit.pants;
    const shoeBodyColor = outfit.shoe;
    const shoeStripeColor = outfit.stripe;

    const hoodieMat = new THREE.MeshStandardMaterial({ color: hoodieColor, roughness: 0.72, metalness: 0.04, emissive: 0x000000 });
    const hoodCollarMat = new THREE.MeshStandardMaterial({ color: collarColor, roughness: 0.80, metalness: 0.02, emissive: 0x000000 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.70, metalness: 0.04, emissive: 0x000000 });

    const shoeBodyMat = new THREE.MeshStandardMaterial({ color: shoeBodyColor, roughness: 0.38, metalness: 0.04, emissive: 0x000000 });
    const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.02, emissive: 0x000000 });
    const shoeStripeMat = new THREE.MeshStandardMaterial({ color: shoeStripeColor, roughness: 0.60, emissive: 0x000000 });

    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.60, metalness: 0.15, emissive: 0x000000 });

    // -------------------------------------------------------------------------
    // Task 2: Lock Bum 100% Flush ON Seat Cushion (Zero Floating Gap)
    // Lower hip anchor so bottom of bum penetrates 0.12 units inside the seat cushion
    // -------------------------------------------------------------------------
    const seatTopY = saddlePos[1];
    const glutesRadiusY = 1.05;
    // hipY is placed so bum bottom = hipY - glutesRadiusY === seatTopY - 0.12 (penetrates 0.12 into seat)
    const hipY = seatTopY + glutesRadiusY - 0.12;
    const hipX = saddlePos[0] + 0.18;
    const hipZ = saddlePos[2];

    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(hipX, hipY, hipZ);

    // -------------------------------------------------------------------------
    // Task 1: Eliminate Oval Bulge & Lower-Back Spike (Flat Gut & Rear-Only Glutes)
    // Front-to-back (X) radius reduced by 42% (0.82 vs 1.42). Shifted back so
    // glutes round out ONLY at the rear contour behind spine. Zero gut bulge!
    // -------------------------------------------------------------------------
    const glutesMesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), pantsMat);
    glutesMesh.position.set(-0.35, 0.0, 0); // shifted rearward behind spine
    glutesMesh.scale.set(0.82, 1.0, 1.22);  // 42% narrower in X: rounds out ONLY at rear!
    pelvisGroup.add(glutesMesh);

    // Flat anterior groin/pelvis blending smoothly into the upper thighs
    const groinMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.00, 0.80, 20), pantsMat);
    groinMesh.position.set(0.05, 0.15, 0);
    groinMesh.rotation.z = -0.15;
    pelvisGroup.add(groinMesh);

    biker.add(pelvisGroup);

    // -------------------------------------------------------------------------
    // Task 1 & 2: Flat-Bellied Muscular Torso (~35° Forward Lean, Over Fuel Tank)
    // 0.97x overall trim applied to station dimensions
    // DELETE kangaroo pocket box and spine spikes!
    // -------------------------------------------------------------------------
    const leanAngle = -0.61; // ~35° forward pitch
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(hipX - 0.06, hipY + 0.55, hipZ);
    torsoGroup.rotation.z = leanAngle;

    // Waistband hem overlapping top of hips cleanly (flat natural stomach line)
    const waistband = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.22, 0.35, 24), hoodCollarMat);
    waistband.position.set(0, -0.05, 0);
    torsoGroup.add(waistband);

    // Muscular flat-bellied torso stations:
    // Flat-sloping athletic shoulder & clavicle line (tapering cleanly to neck base)
    const hoodieStations = [
      { y: 0.0, rx: 0.98, rz: 1.48 }, // Flat waist hem: depth 1.96, width 2.96
      { y: 1.2, rx: 1.06, rz: 1.76 }, // Flat abdomen / lower ribs: depth 2.12, width 3.52
      { y: 2.5, rx: 1.22, rz: 2.10 }, // Muscular chest: depth 2.44, width 4.20
      { y: 3.8, rx: 1.18, rz: 2.30 }, // Broad athletic shoulders: depth 2.36, width 4.60
      { y: 4.35, rx: 0.86, rz: 1.40 }, // Flat-sloping clavicle/collarbone line (NOT rounded ball)
      { y: 4.55, rx: 0.62, rz: 0.82 }  // Crew-neck collar opening
    ];
    torsoGroup.add(createAnatomicalTorso(hoodieStations, 24, hoodieMat));

    // Low-profile crew-neck collar ring (tubeRadius = 0.06 only, flush with chest top)
    const crewCollar = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 12, 24), hoodCollarMat);
    crewCollar.rotation.x = Math.PI / 2;
    crewCollar.position.set(0, 4.55, 0);
    torsoGroup.add(crewCollar);

    // Clean, visible cylindrical human neck rising 0.35-0.45 units above collar
    const skinPalette = [0xc58f68, 0xb47b56, 0xd4a373, 0x99613d];
    const skinColor = skinPalette[(appearanceSeed || 0) % skinPalette.length];
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.72, metalness: 0.04 });

    const neckCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.85, 20), skinMat);
    neckCylinder.position.set(0, 4.90, 0);
    torsoGroup.add(neckCylinder);

    // Slim deltoid transitions (radius = 0.30) connecting arms cleanly to shoulder corners
    [-2.15, 2.15].forEach(zSide => {
      const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.30, 16, 12), hoodieMat);
      deltoid.position.set(0.0, 3.85, zSide);
      torsoGroup.add(deltoid);
    });

    biker.add(torsoGroup);

    // -------------------------------------------------------------------------
    // Task 2 Part 2: Proportional Downward-Reaching Arms (Shorter Than Torso)
    // Hands locked 100% on handlebar grips!
    // -------------------------------------------------------------------------
    const shLocalL = new THREE.Vector3(0.0, 3.85, -2.15);
    const shLocalR = new THREE.Vector3(0.0, 3.85, 2.15);
    shLocalL.applyEuler(new THREE.Euler(0, 0, leanAngle)).add(torsoGroup.position);
    shLocalR.applyEuler(new THREE.Euler(0, 0, leanAngle)).add(torsoGroup.position);

    [[-1, shLocalL, gripLeft], [1, shLocalR, gripRight]].forEach(([side, shPos, gripPos]) => {
      const sx = shPos.x;
      const sy = shPos.y;
      const sz = shPos.z;
      const gx = gripPos[0];
      const gy = gripPos[1];
      const gz = gripPos[2];

      const elbowX = sx + (gx - sx) * 0.48 - 0.12;
      const elbowY = sy + (gy - sy) * 0.42 - 0.60;
      const elbowZ = sz + (gz - sz) * 0.45 + side * 0.42;

      const bicepX = sx + (elbowX - sx) * 0.50;
      const bicepY = sy + (elbowY - sy) * 0.50;
      const bicepZ = sz + (elbowZ - sz) * 0.45;

      const wristX = gx - 0.26;
      const wristY = gy + 0.05;
      const wristZ = gz;

      const foreX = elbowX + (wristX - elbowX) * 0.50;
      const foreY = elbowY + (wristY - elbowY) * 0.50;
      const foreZ = elbowZ + (wristZ - elbowZ) * 0.50;

      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx, sy, sz),
        new THREE.Vector3(bicepX, bicepY, bicepZ),
        new THREE.Vector3(elbowX, elbowY, elbowZ),
        new THREE.Vector3(foreX, foreY, foreZ),
        new THREE.Vector3(wristX, wristY, wristZ)
      ]);

      const armTube = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 20, 0.42, 14, false), hoodieMat);
      biker.add(armTube);

      const wristCuff = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 12, 18), hoodCollarMat);
      wristCuff.position.set(wristX, wristY, wristZ);
      wristCuff.rotation.y = Math.PI / 2;
      biker.add(wristCuff);

      const handGroup = new THREE.Group();
      handGroup.position.set(gx, gy, gz);

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.40, 0.46), gloveMat);
      handGroup.add(palm);

      const fingers = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.44, 14), gloveMat);
      fingers.rotation.x = Math.PI / 2;
      fingers.position.set(0.18, -0.06, 0);
      handGroup.add(fingers);

      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.98, 8), mats.chromeMat);
      lever.rotation.x = Math.PI / 2 + (side * 0.12);
      lever.position.set(0.35, 0.05, -side * 0.24);
      handGroup.add(lever);

      biker.add(handGroup);
    });

    // -------------------------------------------------------------------------
    // Task 3: Proportional Legs & Sneakers Locked Flat on Footpegs
    // -------------------------------------------------------------------------
    [[-1, pegLeft], [1, pegRight]].forEach(([side, pegPos]) => {
      const hipLegX = hipX + 0.15;
      const hipLegY = hipY + 0.05;
      const hipLegZ = side * 1.15;

      const px = pegPos[0];
      const py = pegPos[1];
      const pz = pegPos[2];

      let kneeX, kneeY, kneeZ;
      if (isCruiser) {
        kneeX = hipLegX + 2.95;
        kneeY = hipLegY - 1.85;
        kneeZ = side * 1.55;
      } else {
        kneeX = hipLegX + 3.20;
        kneeY = hipLegY - 2.05;
        kneeZ = side * 1.48;
      }

      const ankleX = px;
      const ankleY = py + 0.60;
      const ankleZ = pz;

      const midThighX = hipLegX + (kneeX - hipLegX) * 0.50;
      const midThighY = hipLegY + (kneeY - hipLegY) * 0.45;
      const midThighZ = hipLegZ + (kneeZ - hipLegZ) * 0.50;

      const midCalfX = kneeX + (ankleX - kneeX) * 0.50;
      const midCalfY = kneeY + (ankleY - kneeY) * 0.50;
      const midCalfZ = kneeZ + (ankleZ - kneeZ) * 0.50;

      const legCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(hipLegX, hipLegY, hipLegZ),
        new THREE.Vector3(midThighX, midThighY, midThighZ),
        new THREE.Vector3(kneeX, kneeY, kneeZ),
        new THREE.Vector3(midCalfX, midCalfY, midCalfZ),
        new THREE.Vector3(ankleX, ankleY, ankleZ)
      ]);
      const legTube = new THREE.Mesh(new THREE.TubeGeometry(legCurve, 24, 0.42, 14, false), pantsMat);
      biker.add(legTube);

      const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.50, 16, 12), pantsMat);
      kneeJoint.scale.set(0.68, 0.92, 0.82);
      kneeJoint.position.set(kneeX + 0.12, kneeY, kneeZ);
      biker.add(kneeJoint);

      const pantCuff = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.08, 12, 18), pantsMat);
      pantCuff.position.set(ankleX, ankleY, ankleZ);
      pantCuff.rotation.x = Math.PI / 2;
      biker.add(pantCuff);

      // Sneaker locked flat on footpeg
      const sneakerGroup = new THREE.Group();
      sneakerGroup.position.set(px, py, pz);
      if (isCruiser) sneakerGroup.rotation.z = 0.20;

      const sole = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.24, 0.78), shoeSoleMat);
      sole.position.set(0.32, 0.12, 0);
      sneakerGroup.add(sole);

      const toeBox = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), shoeBodyMat);
      toeBox.scale.set(1.15, 0.68, 0.96);
      toeBox.position.set(0.88, 0.24, 0);
      sneakerGroup.add(toeBox);

      const sneakerUpper = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.52, 0.74), shoeBodyMat);
      sneakerUpper.position.set(0.14, 0.36, 0);
      sneakerGroup.add(sneakerUpper);

      const sneakerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.42, 16), shoeBodyMat);
      sneakerCollar.position.set(-0.10, 0.58, 0);
      sneakerGroup.add(sneakerCollar);

      [-0.39, 0.39].forEach(sz => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.09, 0.04), shoeStripeMat);
        stripe.position.set(0.20, 0.34, sz);
        stripe.rotation.z = 0.12;
        sneakerGroup.add(stripe);
      });

      biker.add(sneakerGroup);
    });

    // -------------------------------------------------------------------------
    // Task 2: Rebuilt 3D Full-Face Helmet (100% Symmetrical Left & Right, Visor Sheen)
    // -------------------------------------------------------------------------
    const headPosLocal = new THREE.Vector3(0, 5.50, 0);
    headPosLocal.applyEuler(new THREE.Euler(0, 0, leanAngle)).add(torsoGroup.position);

    const helmetGroup = createFullFaceHelmet(helmShellColor, helmCheekColor, isCruiser);
    helmetGroup.position.copy(headPosLocal);
    helmetGroup.rotation.z = isCruiser ? -0.06 : -0.16;
    biker.add(helmetGroup);

    return biker;
  }

  // =========================================================================
  // TASK 1: REALISTIC MOTORCYCLE WHEEL & FLOATING WAVE-BRAKE ROTOR FACTORY
  // - Dark charcoal rubber sport tire (#1c1e21, roughness: 0.82) with angled sipes (bump map)
  // - Zero white text, zero red rim stripes
  // - Stepped matte gunmetal alloy rim barrel (#26292e, metalness: 0.60, roughness: 0.35)
  // - 10 slim directionally swept spokes (#22252a)
  // - Floating wave rotor: brushed silver petal ring (#d4d8dd) with drilled holes +
  //   champagne-gold carrier (#b59449) with 9 triangular cutouts & 9 silver bobbins
  // =========================================================================
  function getWaveRotorTexture() {
    if (bikeTextureCache.waveRotor) return bikeTextureCache.waveRotor;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    const cX = 256;
    const cY = 256;
    // Concentric brushed metal track
    for (let r = 155; r <= 232; r += 2) {
      const alpha = 0.14 + Math.sin(r * 1.5) * 0.08;
      ctx.strokeStyle = `rgba(220, 226, 235, ${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cX, cY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Drilled ventilation holes: 18 staggered hole pairs around track
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.0;
    const numPairs = 18;
    for (let i = 0; i < numPairs; i++) {
      const angle = (i / numPairs) * Math.PI * 2;
      const angle2 = angle + 0.045;
      // Hole 1 at outer friction track (r = 212)
      const x1 = cX + Math.cos(angle) * 212;
      const y1 = cY + Math.sin(angle) * 212;
      ctx.beginPath();
      ctx.arc(x1, y1, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hole 2 at inner friction track (r = 175)
      const x2 = cX + Math.cos(angle2) * 175;
      const y2 = cY + Math.sin(angle2) * 175;
      ctx.beginPath();
      ctx.arc(x2, y2, 4.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    bikeTextureCache.waveRotor = tex;
    return tex;
  }

  function getTreadBumpTexture() {
    if (bikeTextureCache.treadBump) return bikeTextureCache.treadBump;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#202020';
    ctx.lineWidth = 4;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x + 16, 45);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 16, 118);
      ctx.lineTo(x, 83);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 8, 60);
      ctx.lineTo(x + 24, 68);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 1);
    bikeTextureCache.treadBump = tex;
    return tex;
  }

  let _cachedWaveRotorGeo = null;
  let _cachedCarrierRotorGeo = null;

  function createWaveRotorMesh() {
    const rotorGroup = new THREE.Group();

    if (!_cachedWaveRotorGeo) {
      const outerR = 1.72;
      const innerR = 1.15;
      const numWaves = 12;
      const waveShape = new THREE.Shape();
      for (let i = 0; i <= numWaves * 8; i++) {
        const theta = (i / (numWaves * 8)) * Math.PI * 2;
        const waveVal = Math.sin(theta * numWaves);
        const r = outerR + waveVal * 0.10;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        if (i === 0) waveShape.moveTo(x, y);
        else waveShape.lineTo(x, y);
      }
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, innerR, 0, Math.PI * 2, true);
      waveShape.holes.push(holePath);

      _cachedWaveRotorGeo = new THREE.ShapeGeometry(waveShape, 24);
      const maxR = 1.90;
      const pos = _cachedWaveRotorGeo.attributes.position;
      const uvs = _cachedWaveRotorGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        uvs.setXY(i, (x / (2 * maxR)) + 0.5, (y / (2 * maxR)) + 0.5);
      }
      _cachedWaveRotorGeo.computeVertexNormals();
    }

    if (!_cachedCarrierRotorGeo) {
      const carrierOuterR = 1.18;
      const carrierInnerR = 0.58;
      const carrierShape = new THREE.Shape();
      carrierShape.absarc(0, 0, carrierOuterR, 0, Math.PI * 2, false);
      const centerHole = new THREE.Path();
      centerHole.absarc(0, 0, carrierInnerR, 0, Math.PI * 2, true);
      carrierShape.holes.push(centerHole);

      const numCutouts = 9;
      for (let c = 0; c < numCutouts; c++) {
        const baseAngle = (c / numCutouts) * Math.PI * 2;
        const dAngle = (Math.PI * 2 / numCutouts) * 0.32;
        const cutout = new THREE.Path();
        const r1 = carrierInnerR + 0.10;
        const r2 = carrierOuterR - 0.10;
        cutout.moveTo(Math.cos(baseAngle - dAngle) * r1, Math.sin(baseAngle - dAngle) * r1);
        cutout.lineTo(Math.cos(baseAngle + dAngle) * r1, Math.sin(baseAngle + dAngle) * r1);
        cutout.lineTo(Math.cos(baseAngle) * r2, Math.sin(baseAngle) * r2);
        cutout.closePath();
        carrierShape.holes.push(cutout);
      }
      _cachedCarrierRotorGeo = new THREE.ShapeGeometry(carrierShape, 16);
      _cachedCarrierRotorGeo.computeVertexNormals();
    }

    // Outer wave ring mesh (brushed silver, 12 wave crests, drilled ventilation holes)
    const waveMat = new THREE.MeshStandardMaterial({
      color: 0xd4d8dd,
      metalness: 0.85,
      roughness: 0.20,
      map: getWaveRotorTexture(),
      side: THREE.DoubleSide
    });
    const waveMesh = new THREE.Mesh(_cachedWaveRotorGeo, waveMat);
    rotorGroup.add(waveMesh);

    // Inner champagne-gold carrier mesh (9 open triangular cutouts)
    const carrierMat = new THREE.MeshStandardMaterial({
      color: 0xb59449,
      metalness: 0.75,
      roughness: 0.28,
      side: THREE.DoubleSide
    });
    const carrierMesh = new THREE.Mesh(_cachedCarrierRotorGeo, carrierMat);
    carrierMesh.position.z = 0.01;
    rotorGroup.add(carrierMesh);

    // 9 Floating Bobbin Rivets connecting carrier to wave ring at radius 1.16
    const bobbinMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.90,
      roughness: 0.18
    });
    const bobbinCenterMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.50,
      roughness: 0.50
    });
    for (let b = 0; b < 9; b++) {
      const bAngle = (b / 9) * Math.PI * 2;
      const bx = Math.cos(bAngle) * 1.16;
      const by = Math.sin(bAngle) * 1.16;

      const bobbin = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.07, 12), bobbinMat);
      bobbin.rotation.x = Math.PI / 2;
      bobbin.position.set(bx, by, 0.02);
      rotorGroup.add(bobbin);

      const bobbinHole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10), bobbinCenterMat);
      bobbinHole.rotation.x = Math.PI / 2;
      bobbinHole.position.set(bx, by, 0.025);
      rotorGroup.add(bobbinHole);
    }

    return rotorGroup;
  }

  function createRealisticMotoWheel(radius, width, isRear, isCruiser) {
    const wheel = new THREE.Group();
    const rimRadius = radius * 0.70;

    // 1. Charcoal-Black Sport Tire (roughness: 0.82, subtle directional shoulder sipes, NO text, NO red stripes)
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e21,
      roughness: 0.82,
      metalness: 0.05,
      bumpMap: getTreadBumpTexture(),
      bumpScale: 0.04
    });
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(radius - width * 0.44, width * 0.44, 20, 36),
      tireMat
    );
    wheel.add(tire);

    // 2. Stepped Matte Gunmetal-Black Alloy Rim Barrel
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x26292e,
      metalness: 0.60,
      roughness: 0.35
    });

    const rimBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius, rimRadius, width * 0.80, 32, 1, true),
      rimMat
    );
    rimBarrel.rotation.x = Math.PI / 2;
    wheel.add(rimBarrel);

    [-1, 1].forEach(side => {
      const rimLip = new THREE.Mesh(
        new THREE.TorusGeometry(rimRadius, 0.075, 10, 32),
        rimMat
      );
      rimLip.position.z = side * (width * 0.40);
      wheel.add(rimLip);

      const stepDrop = new THREE.Mesh(
        new THREE.TorusGeometry(rimRadius * 0.92, 0.06, 8, 32),
        rimMat
      );
      stepDrop.position.z = side * (width * 0.32);
      wheel.add(stepDrop);
    });

    // 3. Center Hub & Axle Bore
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      metalness: 0.65,
      roughness: 0.35
    });
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, width * 0.84, 20),
      hubMat
    );
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);

    const axleBoreMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.85,
      roughness: 0.20
    });
    [-1, 1].forEach(side => {
      const axleCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.30, 0.08, 16),
        axleBoreMat
      );
      axleCap.rotation.x = Math.PI / 2;
      axleCap.position.z = side * (width * 0.43);
      wheel.add(axleCap);

      const centerHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.09, 12),
        new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.70 })
      );
      centerHole.rotation.x = Math.PI / 2;
      centerHole.position.z = side * (width * 0.435);
      wheel.add(centerHole);
    });

    // 4. 10 Slim Directionally Swept Alloy Spokes
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      metalness: 0.58,
      roughness: 0.36
    });
    const numSpokes = 10;
    const spokeLen = rimRadius * 0.94 - 0.58;
    for (let i = 0; i < numSpokes; i++) {
      const baseAngle = (i / numSpokes) * Math.PI * 2;
      const sweepAngle = baseAngle + 0.14;
      const midR = 0.58 + spokeLen * 0.50;

      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, spokeLen, width * 0.22),
        spokeMat
      );
      spoke.position.set(
        Math.cos(sweepAngle) * midR,
        Math.sin(sweepAngle) * midR,
        0
      );
      spoke.rotation.z = sweepAngle - Math.PI / 2;
      wheel.add(spoke);
    }

    // 5. Precision Floating Wave-Brake Rotor Assembly
    const rotorScale = radius / 3.25;
    if (!isRear) {
      [-1, 1].forEach(side => {
        const rotor = createWaveRotorMesh();
        rotor.scale.set(rotorScale, rotorScale, 1);
        rotor.position.z = side * (width * 0.43);
        if (side === -1) rotor.rotation.y = Math.PI;
        wheel.add(rotor);
      });
    } else {
      const rearRotor = createWaveRotorMesh();
      rearRotor.scale.set(rotorScale, rotorScale, 1);
      rearRotor.position.z = width * 0.43;
      wheel.add(rearRotor);

      const sprocketMat = new THREE.MeshStandardMaterial({
        color: 0x27272a,
        metalness: 0.70,
        roughness: 0.30
      });
      const sprocket = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.50, radius * 0.50, 0.12, 32),
        sprocketMat
      );
      sprocket.rotation.x = Math.PI / 2;
      sprocket.position.z = -width * 0.41;
      wheel.add(sprocket);
    }

    return wheel;
  }

  // ===========================================================================
  // AUTHORITATIVE 16-COMBINATION 3D MOTORCYCLE MASTER DECK (BIKE_VARIANT_DECK)
  // Interleaves all 4 distinct motorcycle models (A -> B -> C -> D) across
  // 4 curated colorways each, with 1:1 helmet-to-bike primary & contrast lock,
  // dark streetwear jackets/hoodies, and zero daytime lighting washout.
  // ===========================================================================
  const BIKE_VARIANT_DECK = [
    // --- Round 1 ---
    {
      id: 'A1',
      modelKey: 'A',
      modelTitle: 'Ride-share Sports Bike (Model A Streetfighter - A1 White/Black)',
      name: 'Model A1 (White & Black)',
      primaryColor: 0xf8fafc,
      contrastColor: 0x111317,
      pinstripeColor: 0x111317,
      roughness: 0.42,
      metalness: 0.15,
      helmColor: 0xf8fafc,
      helmContrast: 0x111317,
      outfit: {
        hoodie: 0x1e293b,
        collar: 0x0f172a,
        pants: 0x090a0d,
        shoe: 0xffffff,
        stripe: 0x111317
      }
    },
    {
      id: 'B1',
      modelKey: 'B',
      modelTitle: 'Ride-share Cruiser (Model B Muscle Cruiser - B1 Jet Black/Crimson)',
      name: 'Model B1 (Jet Black & Crimson)',
      primaryColor: 0x111317,
      contrastColor: 0x27272a,
      pinstripeColor: 0xdc2626,
      roughness: 0.45,
      metalness: 0.25,
      helmColor: 0x111317,
      helmContrast: 0xdc2626,
      outfit: {
        hoodie: 0x7f1d1d,
        collar: 0x450a0a,
        pants: 0x18181b,
        shoe: 0xffffff,
        stripe: 0xdc2626
      }
    },
    {
      id: 'C1',
      modelKey: 'C',
      modelTitle: 'Ride-share Classic (Model C Retro Bullet - C1 Charcoal Black/Gold)',
      name: 'Model C1 (Charcoal Black & Gold)',
      primaryColor: 0x1c1917,
      contrastColor: 0x1c1917,
      pinstripeColor: 0xeab308,
      roughness: 0.45,
      metalness: 0.25,
      helmColor: 0x1c1917,
      helmContrast: 0xeab308,
      outfit: {
        hoodie: 0x365314,
        collar: 0x1a2e05,
        pants: 0x1e293b,
        shoe: 0xffffff,
        stripe: 0xeab308
      }
    },
    {
      id: 'D1',
      modelKey: 'D',
      modelTitle: 'Ride-share Chopper (Model D Chrome Chopper - D1 Gloss Black/Chrome)',
      name: 'Model D1 (Gloss Jet Black & Chrome)',
      primaryColor: 0x0f1115,
      contrastColor: 0x1c1e22,
      pinstripeColor: 0x94a3b8,
      roughness: 0.44,
      metalness: 0.28,
      helmColor: 0x0f1115,
      helmContrast: 0x94a3b8,
      outfit: {
        hoodie: 0x1e3a8a,
        collar: 0x172554,
        pants: 0x0f172a,
        shoe: 0xffffff,
        stripe: 0x60a5fa
      }
    },

    // --- Round 2 ---
    {
      id: 'A2',
      modelKey: 'A',
      modelTitle: 'Ride-share Sports Bike (Model A Streetfighter - A2 Crimson Red/Black)',
      name: 'Model A2 (Crimson Red & Black)',
      primaryColor: 0xdc2626,
      contrastColor: 0x111317,
      pinstripeColor: 0x111317,
      roughness: 0.40,
      metalness: 0.20,
      helmColor: 0xdc2626,
      helmContrast: 0x111317,
      outfit: {
        hoodie: 0x334155,
        collar: 0x1e293b,
        pants: 0x111317,
        shoe: 0xffffff,
        stripe: 0xdc2626
      }
    },
    {
      id: 'B2',
      modelKey: 'B',
      modelTitle: 'Ride-share Cruiser (Model B Muscle Cruiser - B2 Matte Navy/Black)',
      name: 'Model B2 (Matte Navy Blue)',
      primaryColor: 0x172554,
      contrastColor: 0x0f172a,
      pinstripeColor: 0x3b82f6,
      roughness: 0.50,
      metalness: 0.20,
      helmColor: 0x172554,
      helmContrast: 0x0f172a,
      outfit: {
        hoodie: 0x111317,
        collar: 0x000000,
        pants: 0x334155,
        shoe: 0xffffff,
        stripe: 0x3b82f6
      }
    },
    {
      id: 'C2',
      modelKey: 'C',
      modelTitle: 'Ride-share Classic (Model C Retro Bullet - C2 Black/Crimson Red)',
      name: 'Model C2 (Black & Crimson Red)',
      primaryColor: 0x111317,
      contrastColor: 0xdc2626,
      pinstripeColor: 0xdc2626,
      roughness: 0.45,
      metalness: 0.22,
      helmColor: 0x111317,
      helmContrast: 0xdc2626,
      outfit: {
        hoodie: 0x1e293b,
        collar: 0x0f172a,
        pants: 0x18181b,
        shoe: 0xffffff,
        stripe: 0xdc2626
      }
    },
    {
      id: 'D2',
      modelKey: 'D',
      modelTitle: 'Ride-share Chopper (Model D Chrome Chopper - D2 Slate Gray/Chrome)',
      name: 'Model D2 (Metallic Slate Gray & Chrome)',
      primaryColor: 0x475569,
      contrastColor: 0x1e293b,
      pinstripeColor: 0x0f172a,
      roughness: 0.46,
      metalness: 0.35,
      helmColor: 0x475569,
      helmContrast: 0x1e293b,
      outfit: {
        hoodie: 0x7f1d1d,
        collar: 0x450a0a,
        pants: 0x0f172a,
        shoe: 0xffffff,
        stripe: 0x94a3b8
      }
    },

    // --- Round 3 ---
    {
      id: 'A3',
      modelKey: 'A',
      modelTitle: 'Ride-share Sports Bike (Model A Streetfighter - A3 Metallic Ash/Black)',
      name: 'Model A3 (Metallic Ash & Black)',
      primaryColor: 0x64748b,
      contrastColor: 0x111317,
      pinstripeColor: 0x06b6d4,
      roughness: 0.44,
      metalness: 0.32,
      helmColor: 0x64748b,
      helmContrast: 0x111317,
      outfit: {
        hoodie: 0x365314,
        collar: 0x1a2e05,
        pants: 0x18181b,
        shoe: 0xffffff,
        stripe: 0x06b6d4
      }
    },
    {
      id: 'B3',
      modelKey: 'B',
      modelTitle: 'Ride-share Cruiser (Model B Muscle Cruiser - B3 Matte Ash Grey)',
      name: 'Model B3 (Matte Ash Grey)',
      primaryColor: 0x52525b,
      contrastColor: 0x111317,
      pinstripeColor: 0x0f172a,
      roughness: 0.52,
      metalness: 0.20,
      helmColor: 0x52525b,
      helmContrast: 0x111317,
      outfit: {
        hoodie: 0x1e3a8a,
        collar: 0x172554,
        pants: 0x111317,
        shoe: 0xffffff,
        stripe: 0xf1f5f9
      }
    },
    {
      id: 'C3',
      modelKey: 'C',
      modelTitle: 'Ride-share Classic (Model C Retro Bullet - C3 Black/Navy Blue)',
      name: 'Model C3 (Black & Navy Blue)',
      primaryColor: 0x111317,
      contrastColor: 0x1e3a8a,
      pinstripeColor: 0xe2e8f0,
      roughness: 0.45,
      metalness: 0.25,
      helmColor: 0x1e3a8a,
      helmContrast: 0x111317,
      outfit: {
        hoodie: 0x334155,
        collar: 0x1e293b,
        pants: 0x0f172a,
        shoe: 0xffffff,
        stripe: 0x38bdf8
      }
    },
    {
      id: 'D3',
      modelKey: 'D',
      modelTitle: 'Ride-share Chopper (Model D Chrome Chopper - D3 Royal Blue/Chrome)',
      name: 'Model D3 (Royal Dark Blue & Chrome)',
      primaryColor: 0x1e3a8a,
      contrastColor: 0x0f172a,
      pinstripeColor: 0x38bdf8,
      roughness: 0.42,
      metalness: 0.30,
      helmColor: 0x1e3a8a,
      helmContrast: 0x38bdf8,
      outfit: {
        hoodie: 0x111317,
        collar: 0x000000,
        pants: 0x1e293b,
        shoe: 0xffffff,
        stripe: 0x38bdf8
      }
    },

    // --- Round 4 ---
    {
      id: 'A4',
      modelKey: 'A',
      modelTitle: 'Ride-share Sports Bike (Model A Streetfighter - A4 Jet Black/Red)',
      name: 'Model A4 (Jet Black & Red)',
      primaryColor: 0x141619,
      contrastColor: 0xdc2626,
      pinstripeColor: 0xdc2626,
      roughness: 0.44,
      metalness: 0.22,
      helmColor: 0x141619,
      helmContrast: 0xdc2626,
      outfit: {
        hoodie: 0x1e293b,
        collar: 0x0f172a,
        pants: 0x111317,
        shoe: 0xffffff,
        stripe: 0xdc2626
      }
    },
    {
      id: 'B4',
      modelKey: 'B',
      modelTitle: 'Ride-share Cruiser (Model B Muscle Cruiser - B4 Gunmetal/Gold)',
      name: 'Model B4 (Ash-Black Gunmetal)',
      primaryColor: 0x27272a,
      contrastColor: 0x18181b,
      pinstripeColor: 0xd4a024,
      roughness: 0.46,
      metalness: 0.35,
      helmColor: 0x27272a,
      helmContrast: 0xd4a024,
      outfit: {
        hoodie: 0x7f1d1d,
        collar: 0x450a0a,
        pants: 0x18181b,
        shoe: 0xffffff,
        stripe: 0xd4a024
      }
    },
    {
      id: 'C4',
      modelKey: 'C',
      modelTitle: 'Ride-share Classic (Model C Retro Bullet - C4 White/Black)',
      name: 'Model C4 (White & Black)',
      primaryColor: 0xf8fafc,
      contrastColor: 0x111317,
      pinstripeColor: 0x111317,
      roughness: 0.42,
      metalness: 0.15,
      helmColor: 0xf8fafc,
      helmContrast: 0x111317,
      outfit: {
        hoodie: 0x365314,
        collar: 0x1a2e05,
        pants: 0x090a0d,
        shoe: 0xffffff,
        stripe: 0x111317
      }
    },
    {
      id: 'D4',
      modelKey: 'D',
      modelTitle: 'Ride-share Chopper (Model D Chrome Chopper - D4 Midnight Navy/Chrome)',
      name: 'Model D4 (Midnight Navy & Chrome)',
      primaryColor: 0x172554,
      contrastColor: 0x0a0f1d,
      pinstripeColor: 0x60a5fa,
      roughness: 0.45,
      metalness: 0.30,
      helmColor: 0x172554,
      helmContrast: 0x60a5fa,
      outfit: {
        hoodie: 0x1e3a8a,
        collar: 0x172554,
        pants: 0x18181b,
        shoe: 0xffffff,
        stripe: 0x60a5fa
      }
    }
  ];

  let globalNextBikeDeckIndex = 8; // Cycle counter across all 16 combinations
  window.BIKE_VARIANT_DECK = BIKE_VARIANT_DECK;

  // ===========================================================================
  // MODEL C: CLASSIC RETRO BULLET STANDARD (ROYAL ENFIELD BULLET STYLE)
  // - Rounded teardrop fuel tank with painted pinstripe loop & gold/red winged emblem
  // - Solo sprung saddle with dual chrome coil springs underneath
  // - Triangular side toolbox cover (pinstripe border & keyhole) & battery box
  // - Deep full-valance curved mudguards (front: 35°-155°, rear: 30°-150°) with stays & tail lamp
  // - Upright black finned single-cylinder engine on silver aluminum crankcase
  // - Horizontal straight chrome peashooter exhaust with reverse-cone tip
  // - Round chrome headlight with upper peak visor & upright handlebars with stem mirrors
  // - Dual angled rear coil-over shocks
  // - 1:1 Helmet-to-bike primary color synchronization
  // ===========================================================================
  function buildBikeModelC(group, selectedLivery, mats, appearanceSeed) {
    const frontX = 8.0;
    const rearX = -8.0;
    const wheelY = 3.25;

    const bikeBodyMat = new THREE.MeshStandardMaterial({
      color: selectedLivery.primaryColor,
      roughness: selectedLivery.roughness || 0.45,
      metalness: selectedLivery.metalness || 0.25,
      emissive: 0x000000,
      side: THREE.DoubleSide
    });

    const contrastMat = new THREE.MeshStandardMaterial({
      color: (selectedLivery.contrastColor !== undefined) ? selectedLivery.contrastColor : selectedLivery.primaryColor,
      roughness: selectedLivery.roughness || 0.45,
      metalness: selectedLivery.metalness || 0.25,
      emissive: 0x000000,
      side: THREE.DoubleSide
    });

    const pinstripeMat = new THREE.MeshStandardMaterial({
      color: selectedLivery.pinstripeColor || 0xeab308,
      roughness: 0.40,
      metalness: 0.20,
      emissive: 0x000000
    });

    // 1. Realistic Wave-Rotor Wheels
    const fWheel = createRealisticMotoWheel(3.25, 1.45, false, false);
    fWheel.position.set(frontX, wheelY, 0);
    group.add(fWheel);
    group.userData.wheels.push(fWheel);

    const rWheel = createRealisticMotoWheel(3.25, 1.70, true, false);
    rWheel.position.set(rearX, wheelY, 0);
    group.add(rWheel);
    group.userData.wheels.push(rWheel);

    // Front Caliper
    const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.42), mats.darkFrameMat);
    fCaliper.position.set(frontX - 1.25, wheelY + 1.25, 0.65);
    group.add(fCaliper);

    // 2. Telescopic Forks & Triple Clamp
    const rakeAngle = 0.38;
    const tripleTreeX = 5.5;
    const tripleTreeY = 8.1;

    const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), mats.chromeMat);
    topClamp.position.set(tripleTreeX, tripleTreeY, 0);
    topClamp.rotation.z = rakeAngle;
    group.add(topClamp);

    const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), mats.chromeMat);
    lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.5, tripleTreeY - Math.cos(rakeAngle) * 1.5, 0);
    lowerClamp.rotation.z = rakeAngle;
    group.add(lowerClamp);

    [-1.15, 1.15].forEach(fz => {
      // Polished lower slider
      const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 3.8, 14), mats.chromeMat);
      slider.position.set(frontX - Math.sin(rakeAngle) * 1.8, wheelY + Math.cos(rakeAngle) * 1.8, fz);
      slider.rotation.z = rakeAngle;
      group.add(slider);

      // Black upper fork shroud / nacelle
      const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 4.0, 16), mats.darkFrameMat);
      shroud.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
      shroud.rotation.z = rakeAngle;
      group.add(shroud);

      // Clean axle spindle
      const smallAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.45, 12), mats.darkFrameMat);
      smallAxle.rotation.x = Math.PI / 2;
      smallAxle.position.set(frontX, wheelY, fz);
      group.add(smallAxle);
    });

    // 3. Deep Full-Valance Front Mudguard (angle = 35° to 155° strictly above wheel axle)
    const fMudguardR = 3.25 + 0.12;
    const frontMudguard = createUpperArchFender(frontX, wheelY, fMudguardR, 1.55, 35, 155, 26, bikeBodyMat, 0.12);
    group.add(frontMudguard);

    // Front mudguard pinstripe
    const fStripeCurve = new THREE.CatmullRomCurve3();
    for (let d = 35; d <= 155; d += 10) {
      const rad = d * Math.PI / 180;
      fStripeCurve.points.push(new THREE.Vector3(frontX + Math.cos(rad) * (fMudguardR + 0.05), wheelY + Math.sin(rad) * (fMudguardR + 0.05), 0));
    }
    const fFenderStripe = new THREE.Mesh(new THREE.TubeGeometry(fStripeCurve, 20, 0.045, 8, false), pinstripeMat);
    group.add(fFenderStripe);

    // Front tubular chrome fender stays
    [-0.85, 0.85].forEach(sz => {
      const radF = 38 * Math.PI / 180;
      const stayFCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(frontX, wheelY, sz * 0.95),
        new THREE.Vector3(frontX + Math.cos(radF) * fMudguardR, wheelY + Math.sin(radF) * fMudguardR, sz * 0.85)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(stayFCurve, 6, 0.06, 6, false), mats.chromeMat));

      const radR = 150 * Math.PI / 180;
      const stayRCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(frontX, wheelY, sz * 0.95),
        new THREE.Vector3(frontX + Math.cos(radR) * fMudguardR, wheelY + Math.sin(radR) * fMudguardR, sz * 0.85)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(stayRCurve, 6, 0.06, 6, false), mats.chromeMat));
    });

    // 4. Deep Full-Valance Rear Mudguard (angle = 25° to 155° on rear wheel)
    const rMudguardR = 3.25 + 0.12;
    const rearMudguard = createUpperArchFender(rearX, wheelY, rMudguardR, 1.65, 25, 155, 28, bikeBodyMat, 0.12);
    group.add(rearMudguard);

    // Rear mudguard pinstripe
    const rStripeCurve = new THREE.CatmullRomCurve3();
    for (let d = 25; d <= 155; d += 10) {
      const rad = d * Math.PI / 180;
      rStripeCurve.points.push(new THREE.Vector3(rearX + Math.cos(rad) * (rMudguardR + 0.05), wheelY + Math.sin(rad) * (rMudguardR + 0.05), 0));
    }
    const rFenderStripe = new THREE.Mesh(new THREE.TubeGeometry(rStripeCurve, 24, 0.045, 8, false), pinstripeMat);
    group.add(rFenderStripe);

    // Rear chrome fender stays to axle
    [-0.90, 0.90].forEach(sz => {
      const radBack = 145 * Math.PI / 180;
      const stayBCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(rearX, wheelY, sz * 0.95),
        new THREE.Vector3(rearX + Math.cos(radBack) * rMudguardR, wheelY + Math.sin(radBack) * rMudguardR, sz * 0.85)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(stayBCurve, 6, 0.06, 6, false), mats.chromeMat));
    });

    // Vintage round chrome tail-lamp housing and red brake light on rear mudguard tip
    const radTip = 148 * Math.PI / 180;
    const tipX = rearX + Math.cos(radTip) * rMudguardR;
    const tipY = wheelY + Math.sin(radTip) * rMudguardR;

    const tailHous = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.32, 16), mats.chromeMat);
    tailHous.rotation.z = Math.PI / 2 - 0.45;
    tailHous.position.set(tipX - 0.12, tipY + 0.08, 0);
    group.add(tailHous);

    const tailLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 })
    );
    tailLens.rotation.y = -Math.PI / 2;
    tailLens.position.set(tipX - 0.28, tipY + 0.08, 0);
    group.add(tailLens);

    const plateBracket = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.55, 0.95), mats.darkFrameMat);
    plateBracket.position.set(tipX - 0.20, tipY - 0.35, 0);
    group.add(plateBracket);

    // 5. Classic Round Chrome Headlight with Upper Chrome Peak Visor
    const hlGroup = new THREE.Group();
    hlGroup.position.set(6.8, 7.8, 0);

    const hlBucket = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 16), mats.darkFrameMat);
    hlBucket.scale.set(0.75, 0.95, 0.95);
    hlGroup.add(hlBucket);

    const hlBezel = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.08, 10, 24), mats.chromeMat);
    hlBezel.rotation.y = Math.PI / 2;
    hlBezel.position.set(0.24, 0, 0);
    hlGroup.add(hlBezel);

    const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 0.92,
      roughness: 0.10
    }));
    hlLens.rotation.y = Math.PI / 2;
    hlLens.position.set(0.25, 0, 0);
    hlGroup.add(hlLens);

    // Classic Upper Chrome Peak Visor Hood over top edge of lens
    const visorHoodShape = new THREE.Shape();
    visorHoodShape.moveTo(0, 0);
    visorHoodShape.quadraticCurveTo(0.45, 0.15, 0.65, 0.0);
    visorHoodShape.quadraticCurveTo(0.30, 0.35, 0, 0.25);
    visorHoodShape.closePath();
    const visorHoodGeo = new THREE.ExtrudeGeometry(visorHoodShape, { depth: 1.35, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04 });
    visorHoodGeo.translate(0, 0, -0.675);
    const visorHood = new THREE.Mesh(visorHoodGeo, mats.chromeMat);
    visorHood.position.set(0.24, 0.70, 0);
    visorHood.rotation.z = -0.15;
    hlGroup.add(visorHood);
    group.add(hlGroup);

    // 6. Upright Chrome Handlebars with Stem Mirrors
    const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.0, 14), mats.chromeMat);
    hBar.rotation.x = Math.PI / 2;
    hBar.position.set(5.5, 8.4, 0);
    group.add(hBar);

    const leftGripPos = [5.3, 8.4, -1.8];
    const rightGripPos = [5.3, 8.4, 1.8];

    [-1.9, 1.9].forEach(mz => {
      const mStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), mats.chromeMat);
      mStem.position.set(5.3, 8.95, mz);
      group.add(mStem);
      const mHead = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 16), mats.chromeMat);
      mHead.rotation.z = Math.PI / 2;
      mHead.position.set(5.3, 9.40, mz);
      group.add(mHead);
    });

    // 7. Classic Single-Downtube Cradle Frame & Extended Under-Seat Subframe Loop
    const frameTubes = [
      [[tripleTreeX - 0.4, tripleTreeY - 0.6, 0], [3.2, 4.2, 0], [1.2, 2.3, 0], [-1.8, 2.3, 0], [-3.8, 4.2, 0]],
      [[3.6, 6.8, 0], [0.8, 6.6, 0], [-2.0, 6.4, 0], [-4.0, 6.2, 0]]
    ];
    frameTubes.forEach(pts => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.18, 8, false), mats.darkFrameMat);
      group.add(tube);
    });

    // Left and right black under-seat subframe rails connecting saddle, shock tops, and rear mudguard
    [-0.95, 0.95].forEach(sz => {
      const subframePts = [
        new THREE.Vector3(-1.2, 6.55, sz * 0.85),
        new THREE.Vector3(-2.4, 6.40, sz),
        new THREE.Vector3(-3.4, 6.30, sz * 1.05),
        new THREE.Vector3(-4.6, 6.20, sz * 1.08), // Top shock mount node
        new THREE.Vector3(-5.6, 6.28, sz * 1.02), // Connecting solidly to rear mudguard arch
        new THREE.Vector3(-6.2, 6.40, sz * 0.92)
      ];
      const sfCurve = new THREE.CatmullRomCurve3(subframePts);
      const sfTube = new THREE.Mesh(new THREE.TubeGeometry(sfCurve, 18, 0.15, 8, false), mats.darkFrameMat);
      group.add(sfTube);
    });

    // Transverse frame cross-member loop bridging left and right subframe rails at the shock top mounts
    const crossShockBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.15, 12), mats.darkFrameMat);
    crossShockBridge.rotation.x = Math.PI / 2;
    crossShockBridge.position.set(-4.6, 6.20, 0);
    group.add(crossShockBridge);

    // 8. Classic Rounded Teardrop Fuel Tank with Pinstripe Loop & Winged Emblem
    const bulletTankStations = [
      { center: [5.2, 7.4, 0],  ryTop: 0.50, ryBot: 0.55, rz: 0.60 },
      { center: [4.0, 8.2, 0],  ryTop: 1.15, ryBot: 1.25, rz: 1.25 },
      { center: [2.4, 8.4, 0],  ryTop: 1.25, ryBot: 1.30, rz: 1.30 },
      { center: [0.8, 7.6, 0],  ryTop: 0.95, ryBot: 1.05, rz: 1.05 },
      { center: [-0.8, 6.7, 0], ryTop: 0.50, ryBot: 0.55, rz: 0.68 }
    ];
    group.add(createLoftedBodyMesh(bulletTankStations, 24, bikeBodyMat));

    // Chrome top gas cap
    const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.10, 18), mats.chromeMat);
    gasCap.position.set(2.6, 9.75, 0);
    gasCap.rotation.z = -0.15;
    group.add(gasCap);

    // Rubber knee grip pads on tank flanks
    [-1.28, 1.28].forEach(kz => {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), mats.matteBlackKneeMat);
      pad.scale.set(1.25, 0.62, 0.12);
      pad.position.set(1.4, 7.6, kz);
      pad.rotation.z = 0.12;
      group.add(pad);
    });

    // Gold & Red Winged Tank Badge Emblem (CanvasTexture) on both flanks
    const emblemTex = getBulletWingedEmblemTexture(selectedLivery.primaryColor, selectedLivery.pinstripeColor);
    const badgeMat = emblemTex
      ? new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
      : pinstripeMat;
    const badgeGeo = new THREE.PlaneGeometry(2.3, 1.15);
    [-1.34, 1.34].forEach(bz => {
      const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
      badgeMesh.position.set(2.4, 8.05, bz);
      if (bz < 0) badgeMesh.rotation.y = Math.PI;
      group.add(badgeMesh);
    });

    // Side contrast pinstripe loop along tank flank
    [-1.35, 1.35].forEach(tz => {
      const pinstripeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.6, 6.9, tz * 0.70),
        new THREE.Vector3(0.8, 7.8, tz * 0.95),
        new THREE.Vector3(2.4, 8.7, tz * 1.05),
        new THREE.Vector3(4.0, 8.4, tz * 1.05),
        new THREE.Vector3(5.0, 7.5, tz * 0.60)
      ]);
      const stripeTube = new THREE.Mesh(new THREE.TubeGeometry(pinstripeCurve, 20, 0.045, 8, false), pinstripeMat);
      group.add(stripeTube);
    });

    // 9. Solo Sprung Saddle with Visible Underneath Coil Springs (seatTopY = 7.25)
    const bulletSaddleStations = [
      { center: [-0.8, 6.75, 0], ryTop: 0.45, ryBot: 0.50, rz: 0.75 },
      { center: [-1.8, 6.70, 0], ryTop: 0.55, ryBot: 0.55, rz: 1.15 },
      { center: [-2.8, 6.85, 0], ryTop: 0.50, ryBot: 0.45, rz: 1.10 },
      { center: [-3.8, 6.80, 0], ryTop: 0.35, ryBot: 0.35, rz: 0.75 }
    ];
    group.add(createLoftedBodyMesh(bulletSaddleStations, 22, mats.matteBlackKneeMat));

    // Solid black cross-brace / frame bracket directly underneath seat springs
    const springCrossBrace = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.05, 12), mats.darkFrameMat);
    springCrossBrace.rotation.x = Math.PI / 2;
    springCrossBrace.position.set(-3.3, 5.60, 0);
    group.add(springCrossBrace);

    // Frame diagonal struts locking spring bracket into the frame triangle above toolbox
    [-0.60, 0.60].forEach(sz => {
      // Strut down to toolbox top rail
      const strutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.3, 5.60, sz),
        new THREE.Vector3(-2.4, 4.80, sz * 0.90)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(strutCurve, 6, 0.12, 6, false), mats.darkFrameMat));
    });

    // Center diagonal tube from spring cross-brace forward to central frame backbone
    const centerStrutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.3, 5.60, 0),
      new THREE.Vector3(-2.2, 5.80, 0)
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(centerStrutCurve, 6, 0.14, 6, false), mats.darkFrameMat));

    // Dual underneath chrome coil springs and solid mounting base cups
    [-0.60, 0.60].forEach(sz => {
      // Base cup on the cross-brace
      const baseCup = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 14), mats.darkFrameMat);
      baseCup.position.set(-3.3, 5.62, sz);
      group.add(baseCup);

      const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.85, 12), mats.chromeMat);
      spring.position.set(-3.3, 6.05, sz);
      group.add(spring);
      for (let r = 0; r < 4; r++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.04, 8, 16), mats.chromeMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(-3.3, 5.75 + r * 0.20, sz);
        group.add(ring);
      }
    });

    // 10. Triangular Side Toolbox (Right) & Battery Box (Left)
    // Right side: Triangular toolbox cover with pinstripe border & keyhole
    const tbShape = new THREE.Shape();
    tbShape.moveTo(-1.2, 5.6);
    tbShape.lineTo(-3.0, 5.6);
    tbShape.lineTo(-2.2, 4.0);
    tbShape.closePath();
    const tbGeo = new THREE.ExtrudeGeometry(tbShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 });
    tbGeo.translate(0, 0, 1.05);
    const tbMesh = new THREE.Mesh(tbGeo, contrastMat);
    group.add(tbMesh);

    const tbPinstripe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.2, 5.6, 1.42),
      new THREE.Vector3(-3.0, 5.6, 1.42),
      new THREE.Vector3(-2.2, 4.0, 1.42),
      new THREE.Vector3(-1.2, 5.6, 1.42)
    ]), 16, 0.035, 6, true), pinstripeMat);
    group.add(tbPinstripe);

    const tbLock = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), mats.chromeMat);
    tbLock.rotation.x = Math.PI / 2;
    tbLock.position.set(-2.15, 5.0, 1.44);
    group.add(tbLock);

    // Left side: Rectangular battery box with chrome securing strap
    const bbMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.45), mats.darkFrameMat);
    bbMesh.position.set(-2.0, 4.8, -1.20);
    group.add(bbMesh);
    const bbStrap = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.45, 0.48), mats.chromeMat);
    bbStrap.position.set(-2.0, 4.8, -1.20);
    group.add(bbStrap);

    // 11. Upright Finned Single-Cylinder Engine & Aluminum Crankcase
    const crankcaseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.70 });
    const cc = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 2.0), crankcaseMat);
    cc.position.set(0.8, 3.6, 0);
    group.add(cc);

    // Polished round clutch inspection cover on right side
    const ccR = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.28, 20), mats.chromeMat);
    ccR.rotation.x = Math.PI / 2;
    ccR.position.set(0.8, 3.6, 1.10);
    group.add(ccR);

    // Round timing cover on left side
    const ccL = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.70, 0.25, 20), crankcaseMat);
    ccL.rotation.x = Math.PI / 2;
    ccL.position.set(0.8, 3.6, -1.10);
    group.add(ccL);

    // Upright cylinder barrel with horizontal black cooling fins
    const cylBlock = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.8, 1.6), mats.darkFrameMat);
    cylBlock.position.set(0.8, 5.2, 0);
    group.add(cylBlock);

    for (let y = 4.4; y <= 5.9; y += 0.28) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 1.9), mats.darkFrameMat);
      fin.position.set(0.8, y, 0);
      group.add(fin);
    }

    // Polished aluminum cylinder head & rocker cover
    const cylHead = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 1.8), crankcaseMat);
    cylHead.position.set(0.8, 6.35, 0);
    group.add(cylHead);

    // Chrome pushrod tube running up the right side
    const pushrod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), mats.chromeMat);
    pushrod.position.set(1.4, 5.3, 0.95);
    group.add(pushrod);

    // Round chrome air cleaner canister behind cylinder
    const airFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.60, 0.35, 18), mats.chromeMat);
    airFilter.rotation.x = Math.PI / 2;
    airFilter.position.set(-0.6, 5.2, 0);
    group.add(airFilter);

    // 12. Peashooter Chrome Exhaust with Reverse-Cone Tip
    const exHeaderPts = [
      new THREE.Vector3(1.6, 6.1, 0.4),
      new THREE.Vector3(2.4, 5.2, 0.6),
      new THREE.Vector3(2.6, 3.6, 0.85),
      new THREE.Vector3(1.6, 2.4, 0.95),
      new THREE.Vector3(-0.2, 2.4, 0.95),
      new THREE.Vector3(-9.6, 2.4, 0.95)
    ];
    const exPipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(exHeaderPts), 28, 0.20, 10, false), mats.chromeMat);
    group.add(exPipe);

    // Peashooter muffler body
    const peaMuffler = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 7.8, 16), mats.chromeMat);
    peaMuffler.rotation.z = Math.PI / 2;
    peaMuffler.position.set(-5.0, 2.4, 0.95);
    group.add(peaMuffler);

    // Reverse-cone peashooter tip
    const peaTip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, 0.85, 14), mats.chromeMat);
    peaTip.rotation.z = Math.PI / 2;
    peaTip.position.set(-9.35, 2.4, 0.95);
    group.add(peaTip);

    // 13. Angled Rear Shocks & Swingarm (Locked directly into subframe rails with bolted eye bosses)
    [-1.05, 1.05].forEach(sz => {
      const swingArm = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.70, 0.38), mats.darkFrameMat);
      swingArm.position.set(-4.5, 3.6, sz);
      swingArm.rotation.z = 0.10;
      group.add(swingArm);
    });

    [-1.15, 1.15].forEach(sz => {
      const botX = -7.8;
      const botY = wheelY + 0.2;
      const botZ = sz;
      const topX = -4.6;
      const topY = 6.20;
      const topZ = sz * 0.90;

      const shockCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(botX, botY, botZ),
        new THREE.Vector3(topX, topY, topZ)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(shockCurve, 12, 0.16, 8, false), mats.chromeMat));

      // 5 chrome coil spring rings around shock body
      for (let i = 0; i < 5; i++) {
        const t = 0.25 + (i / 4) * 0.50;
        const pt = shockCurve.getPoint(t);
        const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 14), mats.chromeMat);
        coilRing.position.copy(pt);
        coilRing.rotation.y = Math.PI / 2;
        group.add(coilRing);
      }

      // Top mounting eye boss (bolted directly into extended subframe rail)
      const topEye = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.38, 16), mats.darkFrameMat);
      topEye.rotation.x = Math.PI / 2;
      topEye.position.set(topX, topY, topZ);
      group.add(topEye);

      const topBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.46, 12), mats.chromeMat);
      topBolt.rotation.x = Math.PI / 2;
      topBolt.position.set(topX, topY, topZ);
      group.add(topBolt);

      // Top shock collar sleeve
      const topCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 14), mats.chromeMat);
      topCollar.rotation.z = Math.atan2(topY - botY, topX - botX) - Math.PI / 2;
      topCollar.position.set(topX - 0.20, topY - 0.25, topZ);
      group.add(topCollar);

      // Bottom mounting eye boss (bolted to swingarm / axle hub)
      const botEye = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 16), mats.darkFrameMat);
      botEye.rotation.x = Math.PI / 2;
      botEye.position.set(botX, botY, botZ);
      group.add(botEye);

      const botBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.44, 12), mats.chromeMat);
      botBolt.rotation.x = Math.PI / 2;
      botBolt.position.set(botX, botY, botZ);
      group.add(botBolt);
    });

    // 14. Mid-mount Footpegs & Seated Biker (Flush on saddle, upright standard posture)
    const saddleAnchor = [-1.8, 7.25, 0];
    const pegPosL = [0.8, 3.8, -1.45];
    const pegPosR = [0.8, 3.8, 1.45];

    [-1, 1].forEach(side => {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 12), mats.darkFrameMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(0.8, 3.6, side * 1.45);
      group.add(peg);
    });

    const bikeSyncC = {
      helmColor: selectedLivery.helmColor !== undefined ? selectedLivery.helmColor : selectedLivery.primaryColor,
      contrastColor: selectedLivery.helmContrast !== undefined ? selectedLivery.helmContrast : selectedLivery.contrastColor,
      outfit: selectedLivery.outfit
    };
    const biker = buildRealisticBiker(false, saddleAnchor, leftGripPos, rightGripPos, pegPosL, pegPosR, mats, appearanceSeed, bikeSyncC);
    group.add(biker);
  }

  // ===========================================================================
  // MODEL D: CLASSIC CHROME V-TWIN CHOPPER / LOW-RIDER (HARLEY DYNA STYLE)
  // - Tall swept-back mini-ape / buckhorn handlebars with two round stem mirrors
  // - Sloping teardrop fuel tank with chrome gas cap
  // - Two-tier stepped saddle (deep scooped rider bucket + rear pillion pad)
  // - Muscular 45° Chrome V-Twin engine with circular chrome center air cleaner in V
  // - Dual separate parallel chrome exhausts side-by-side with slash-cut tips
  // - Silver raked forks with vertical orange rectangular side reflectors & chrome dome headlight
  // - Rear bobbed fender with horizontal chrome fender strut bars & tombstone taillight
  // - 1:1 Helmet-to-bike primary color synchronization
  // ===========================================================================
  function buildBikeModelD(group, selectedLivery, mats, appearanceSeed) {
    const frontX = 8.8;
    const rearX = -8.4;
    const wheelY = 3.25;

    const bikeBodyMat = new THREE.MeshStandardMaterial({
      color: selectedLivery.primaryColor,
      roughness: selectedLivery.roughness || 0.45,
      metalness: selectedLivery.metalness || 0.28,
      emissive: 0x000000,
      side: THREE.DoubleSide
    });

    const pinstripeMat = new THREE.MeshStandardMaterial({
      color: selectedLivery.pinstripeColor || 0x94a3b8,
      roughness: 0.40,
      metalness: 0.20,
      emissive: 0x000000
    });

    // 1. Realistic Wave-Rotor Wheels
    const fWheel = createRealisticMotoWheel(3.25, 1.45, false, true);
    fWheel.position.set(frontX, wheelY, 0);
    group.add(fWheel);
    group.userData.wheels.push(fWheel);

    const rWheel = createRealisticMotoWheel(3.10, 2.20, true, true);
    rWheel.position.set(rearX, 3.10, 0);
    group.add(rWheel);
    group.userData.wheels.push(rWheel);

    // Front Caliper
    const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.45), mats.darkFrameMat);
    fCaliper.position.set(frontX - 1.25, wheelY + 1.20, 0.75);
    group.add(fCaliper);

    // 2. Raked Silver Telescopic Forks & Clamps
    const rakeAngle = 0.52;
    const tripleTreeX = 5.8;
    const tripleTreeY = 8.4;

    const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), mats.chromeMat);
    topClamp.position.set(tripleTreeX, tripleTreeY, 0);
    topClamp.rotation.z = rakeAngle;
    group.add(topClamp);

    const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), mats.chromeMat);
    lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.6, tripleTreeY - Math.cos(rakeAngle) * 1.6, 0);
    lowerClamp.rotation.z = rakeAngle;
    group.add(lowerClamp);

    // Reflector material for fork side reflectors
    const reflectorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      roughness: 0.20
    });

    [-1.15, 1.15].forEach(fz => {
      // Chrome lower sliders
      const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 4.2, 14), mats.chromeMat);
      slider.position.set(frontX - Math.sin(rakeAngle) * 2.0, wheelY + Math.cos(rakeAngle) * 2.0, fz);
      slider.rotation.z = rakeAngle;
      group.add(slider);

      // Polished upper fork stanchions
      const upperFork = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 4.8, 16), mats.chromeMat);
      upperFork.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
      upperFork.rotation.z = rakeAngle;
      group.add(upperFork);

      // Clean axle spindle
      const smallAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 14), mats.darkFrameMat);
      smallAxle.rotation.x = Math.PI / 2;
      smallAxle.position.set(frontX, wheelY, fz);
      group.add(smallAxle);

      // Vertical Orange Rectangular Side Reflectors
      const reflector = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.20), reflectorMat);
      reflector.position.set(7.6, 4.0, fz * 1.18);
      group.add(reflector);
    });

    // 3. Front Mudguard
    const fFenderR = 3.25 + 0.08;
    const fFender = createUpperArchFender(frontX, wheelY, fFenderR, 1.55, 60, 130, 24, bikeBodyMat, 0.08);
    group.add(fFender);

    // 4. Deep Chrome Dome Headlight & Bullet Turn Signals
    const hlGroup = new THREE.Group();
    hlGroup.position.set(tripleTreeX + 1.25, tripleTreeY - 0.45, 0);

    const hlBucket = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), mats.chromeMat);
    hlBucket.scale.set(0.85, 0.95, 0.95);
    hlGroup.add(hlBucket);

    const hlBezel = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 10, 24), mats.chromeMat);
    hlBezel.rotation.y = Math.PI / 2;
    hlBezel.position.set(0.25, 0, 0);
    hlGroup.add(hlBezel);

    const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.92, 24), new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 0.95,
      roughness: 0.08
    }));
    hlLens.rotation.y = Math.PI / 2;
    hlLens.position.set(0.26, 0, 0);
    hlGroup.add(hlLens);
    group.add(hlGroup);

    // Amber bullet turn signals on chrome bracket below headlight
    [-1.4, 1.4].forEach(sz => {
      const sig = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.35, 12), mats.chromeMat);
      sig.rotation.z = Math.PI / 2;
      sig.position.set(tripleTreeX + 0.6, tripleTreeY - 0.7, sz);
      group.add(sig);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.80
      }));
      lens.rotation.y = Math.PI / 2;
      lens.position.set(tripleTreeX + 0.78, tripleTreeY - 0.7, sz);
      group.add(lens);
    });

    // 5. Tall Swept-Back Chrome Mini-Ape / Buckhorn Handlebars & Two Round Mirrors
    const apeCurveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tripleTreeX, tripleTreeY + 0.4, -0.4),
      new THREE.Vector3(tripleTreeX - 0.2, tripleTreeY + 1.2, -1.1),
      new THREE.Vector3(4.6, 9.6, -2.1)
    ]);
    const apeCurveR = new THREE.CatmullRomCurve3([
      new THREE.Vector3(tripleTreeX, tripleTreeY + 0.4, 0.4),
      new THREE.Vector3(tripleTreeX - 0.2, tripleTreeY + 1.2, 1.1),
      new THREE.Vector3(4.6, 9.6, 2.1)
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(apeCurveL, 16, 0.12, 10, false), mats.chromeMat));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(apeCurveR, 16, 0.12, 10, false), mats.chromeMat));

    const leftGripPos = [4.6, 9.6, -2.1];
    const rightGripPos = [4.6, 9.6, 2.1];

    [-2.1, 2.1].forEach(mz => {
      const mStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.80, 8), mats.chromeMat);
      mStem.position.set(4.6, 10.0, mz);
      group.add(mStem);
      const mHead = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), mats.chromeMat);
      mHead.rotation.z = Math.PI / 2;
      mHead.position.set(4.6, 10.4, mz);
      group.add(mHead);
    });

    // 6. Double-Cradle Black Steel Frame
    const cradleTubes = [
      [[tripleTreeX - 0.4, tripleTreeY - 0.6, 1.0], [3.8, 4.2, 1.3], [1.8, 2.3, 1.3], [-2.0, 2.3, 1.3], [-4.2, 3.8, 1.1]],
      [[tripleTreeX - 0.4, tripleTreeY - 0.6, -1.0], [3.8, 4.2, -1.3], [1.8, 2.3, -1.3], [-2.0, 2.3, -1.3], [-4.2, 3.8, -1.1]]
    ];
    cradleTubes.forEach(pts => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.20, 8, false), mats.darkFrameMat);
      group.add(tube);
    });

    // 7. Sloping Teardrop Fuel Tank with Top Chrome Gas Cap
    const chopperTankStations = [
      { center: [5.2, 7.6, 0],  ryTop: 0.50, ryBot: 0.60, rz: 0.65 },
      { center: [3.8, 8.4, 0],  ryTop: 1.15, ryBot: 1.35, rz: 1.35 },
      { center: [2.0, 8.1, 0],  ryTop: 1.10, ryBot: 1.25, rz: 1.25 },
      { center: [0.2, 7.2, 0],  ryTop: 0.80, ryBot: 0.95, rz: 1.00 },
      { center: [-1.2, 6.3, 0], ryTop: 0.45, ryBot: 0.55, rz: 0.70 }
    ];
    group.add(createLoftedBodyMesh(chopperTankStations, 24, bikeBodyMat));

    // Chrome top gas cap
    const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.10, 18), mats.chromeMat);
    gasCap.position.set(3.0, 9.55, 0);
    gasCap.rotation.z = -0.25;
    group.add(gasCap);

    // 8. Muscular 45° Chrome V-Twin Engine & Center Chrome Air Cleaner
    const vTwinGroup = new THREE.Group();
    vTwinGroup.position.set(1.2, 4.5, 0);

    const crankCase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.2), mats.gunmetalEngineMat);
    vTwinGroup.add(crankCase);

    const vAngles = [-0.40, 0.40];
    vAngles.forEach(va => {
      const cylGroup = new THREE.Group();
      cylGroup.rotation.z = va;
      cylGroup.position.set(Math.sin(va) * 0.9, Math.cos(va) * 0.9, 0);

      for (let fy = 0; fy <= 1.8; fy += 0.28) {
        const cFin = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.07, 18), mats.darkFrameMat);
        cFin.position.y = fy;
        cylGroup.add(cFin);
        const iFin = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.22, 16), mats.gunmetalEngineMat);
        iFin.position.y = fy + 0.14;
        cylGroup.add(iFin);
      }

      vTwinGroup.add(cylGroup);

      const rockerHead = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.6), mats.chromeMat);
      rockerHead.rotation.z = va;
      rockerHead.position.set(Math.sin(va) * 2.8, Math.cos(va) * 2.8, 0);
      vTwinGroup.add(rockerHead);

      [-0.55, 0.55].forEach(pz => {
        const pushRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), mats.chromeMat);
        pushRod.rotation.z = va * 1.08;
        pushRod.position.set(Math.sin(va) * 1.35, Math.cos(va) * 1.35, pz * 1.05);
        vTwinGroup.add(pushRod);
      });
    });

    // Prominent circular chrome air cleaner cover in the V between cylinders
    const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.35, 24), mats.chromeMat);
    airCleaner.rotation.x = Math.PI / 2;
    airCleaner.position.set(0.0, 1.3, 1.35);
    vTwinGroup.add(airCleaner);

    // Polished chrome primary cover on left side
    const primaryCover = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 20), mats.chromeMat);
    primaryCover.rotation.x = Math.PI / 2;
    primaryCover.position.set(0.2, -0.2, -1.25);
    vTwinGroup.add(primaryCover);
    group.add(vTwinGroup);

    // 9. Dual Staggered Parallel Chrome Exhausts with Slash-Cut Tips
    const exMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.92, roughness: 0.12 });
    [0.98, 1.28].forEach((pz, idx) => {
      const pipeY = 2.75 + idx * 0.50;
      const pipePts = [
        new THREE.Vector3(2.4, 4.6 - idx * 0.5, 0.55),
        new THREE.Vector3(3.0, 3.5, pz),
        new THREE.Vector3(1.8, pipeY, pz),
        new THREE.Vector3(-4.0, pipeY, pz),
        new THREE.Vector3(-8.8 - idx * 0.4, pipeY, pz)
      ];
      const pipeCurve = new THREE.CatmullRomCurve3(pipePts);
      const exPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 20, 0.22, 10, false), exMat);
      group.add(exPipe);

      const slashTip = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 14), exMat);
      slashTip.rotation.z = Math.PI / 2 - 0.35;
      slashTip.position.set(-8.8 - idx * 0.4, pipeY, pz);
      group.add(slashTip);
    });

    // 10. Two-Tier Stepped Saddle (Rider Bucket + Pillion Pad) (seatTopY = 7.15)
    const dynaSeatStations = [
      { center: [-1.2, 6.70, 0], ryTop: 0.45, ryBot: 0.60, rz: 0.90 },
      { center: [-2.4, 6.60, 0], ryTop: 0.55, ryBot: 0.60, rz: 1.25 },
      { center: [-3.4, 6.85, 0], ryTop: 0.50, ryBot: 0.50, rz: 1.15 },
      { center: [-4.4, 7.30, 0], ryTop: 0.35, ryBot: 0.30, rz: 0.85 },
      { center: [-5.6, 7.30, 0], ryTop: 0.35, ryBot: 0.30, rz: 0.80 },
      { center: [-6.6, 7.20, 0], ryTop: 0.30, ryBot: 0.25, rz: 0.70 }
    ];
    group.add(createLoftedBodyMesh(dynaSeatStations, 24, mats.matteBlackKneeMat));

    // 11. Bobbed Rear Fender with Horizontal Chrome Struts & Taillight
    const dynaFenderStations = [
      { center: [-4.4, 6.10, 0], ryTop: 0.18, ryBot: 0.14, rz: 1.15 },
      { center: [-5.6, 6.35, 0], ryTop: 0.20, ryBot: 0.16, rz: 1.25 },
      { center: [-7.2, 6.55, 0], ryTop: 0.22, ryBot: 0.18, rz: 1.28 },
      { center: [-8.8, 6.50, 0], ryTop: 0.22, ryBot: 0.18, rz: 1.25 },
      { center: [-10.4, 5.75, 0], ryTop: 0.20, ryBot: 0.16, rz: 1.20 },
      { center: [-11.4, 4.40, 0], ryTop: 0.18, ryBot: 0.14, rz: 1.12 }
    ];
    group.add(createLoftedBodyMesh(dynaFenderStations, 24, bikeBodyMat));

    // Horizontal chrome fender strut bars on both sides
    [-1.25, 1.25].forEach(sz => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.26, 0.14), mats.chromeMat);
      strut.position.set(-6.2, 5.5, sz);
      group.add(strut);
    });

    // Angled chrome coil-over shocks with bolted mounting eye bosses
    [-1.22, 1.22].forEach(sz => {
      const botX = -7.6;
      const botY = 3.20;
      const botZ = sz;
      const topX = -4.5;
      const topY = 5.60;
      const topZ = sz * 0.92;

      const shockCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(botX, botY, botZ),
        new THREE.Vector3(topX, topY, topZ)
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(shockCurve, 12, 0.16, 8, false), mats.chromeMat));

      // Chrome coil rings
      for (let i = 0; i < 5; i++) {
        const t = 0.25 + (i / 4) * 0.50;
        const pt = shockCurve.getPoint(t);
        const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 14), mats.chromeMat);
        coilRing.position.copy(pt);
        coilRing.rotation.y = Math.PI / 2;
        group.add(coilRing);
      }

      // Top mounting eye boss & bolt into frame strut
      const topEye = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.38, 16), mats.darkFrameMat);
      topEye.rotation.x = Math.PI / 2;
      topEye.position.set(topX, topY, topZ);
      group.add(topEye);

      const topBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.46, 12), mats.chromeMat);
      topBolt.rotation.x = Math.PI / 2;
      topBolt.position.set(topX, topY, topZ);
      group.add(topBolt);

      // Bottom mounting eye boss & bolt on swingarm
      const botEye = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 16), mats.darkFrameMat);
      botEye.rotation.x = Math.PI / 2;
      botEye.position.set(botX, botY, botZ);
      group.add(botEye);

      const botBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.44, 12), mats.chromeMat);
      botBolt.rotation.x = Math.PI / 2;
      botBolt.position.set(botX, botY, botZ);
      group.add(botBolt);
    });

    // Chrome Tombstone Taillight on rear fender tip
    const tombstoneHl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.45), mats.chromeMat);
    tombstoneHl.position.set(-11.4, 4.4, 0);
    tombstoneHl.rotation.z = -0.45;
    group.add(tombstoneHl);

    const tombstoneLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.45, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 })
    );
    tombstoneLens.position.set(-11.55, 4.45, 0);
    tombstoneLens.rotation.z = -0.45;
    group.add(tombstoneLens);

    // Swingarm
    [-1.15, 1.15].forEach(sz => {
      const cArm = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.70, 0.38), mats.darkFrameMat);
      cArm.position.set(-4.8, 3.4, sz);
      cArm.rotation.z = 0.08;
      group.add(cArm);
    });

    // 12. Forward Footpegs & Seated Biker (Flush in bucket, relaxed cruiser posture)
    const saddleAnchor = [-2.4, 7.15, 0];
    const pegPosL = [2.6, 3.8, -1.6];
    const pegPosR = [2.6, 3.8, 1.6];

    [-1, 1].forEach(side => {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 12), mats.darkFrameMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(2.6, 3.6, side * 1.60);
      group.add(peg);
    });

    const bikeSyncD = {
      helmColor: selectedLivery.helmColor !== undefined ? selectedLivery.helmColor : selectedLivery.primaryColor,
      contrastColor: selectedLivery.helmContrast !== undefined ? selectedLivery.helmContrast : selectedLivery.contrastColor,
      outfit: selectedLivery.outfit
    };
    const biker = buildRealisticBiker(true, saddleAnchor, leftGripPos, rightGripPos, pegPosL, pegPosR, mats, appearanceSeed, bikeSyncD);
    group.add(biker);
  }

  // Master Canonical 4-Model 3D Motorcycle Factory (Pure Three.js - Zero Blender!)
  // Spawns 4 distinct models:
  // - Model A: Muscular Streetfighter / Cafe Racer
  // - Model B: Muscle Cruiser / Power Cruiser
  // - Model C: Classic Retro Bullet Standard (Royal Enfield style)
  // - Model D: Classic Chrome V-Twin Chopper / Low-Rider (Harley Dyna style)
  function buildBikePackage(variantConfig, appearanceSeed) {
    const bikePackage = new THREE.Group();
    bikePackage.userData.wheels = [];
    const group = bikePackage; // Seamless alias for all internal mesh additions

    const modelKey = variantConfig.modelKey;
    const isCruiser = (modelKey === 'B' || modelKey === 'D');
    const mats = getBikeSharedMaterials();

    // Dedicated isolated materials per variant - zero shared mutation, zero daylight washout
    const bikeBodyMat = new THREE.MeshStandardMaterial({
      color: variantConfig.primaryColor,
      roughness: variantConfig.roughness || 0.42,
      metalness: variantConfig.metalness || 0.20,
      emissive: 0x000000,
      side: THREE.DoubleSide
    });

    const contrastMat = new THREE.MeshStandardMaterial({
      color: (variantConfig.contrastColor !== undefined) ? variantConfig.contrastColor : variantConfig.primaryColor,
      roughness: variantConfig.roughness || 0.42,
      metalness: variantConfig.metalness || 0.20,
      emissive: 0x000000,
      side: THREE.DoubleSide
    });

    const pinstripeMat = new THREE.MeshStandardMaterial({
      color: variantConfig.pinstripeColor || 0x111317,
      roughness: 0.40,
      metalness: 0.20,
      emissive: 0x000000
    });

    let leftGripPos, rightGripPos;
    let saddleAnchor = [-1.8, 6.7, 0];
    let pegPosL, pegPosR;

    if (modelKey === 'A') {
      // =======================================================================
      // MODEL A: BLACK & PEARL-WHITE MUSCULAR STREETFIGHTER / CAFE RACER
      // =======================================================================
      const frontX = 8.2;
      const rearX = -8.2;
      const wheelY = 3.25;

      const fWheel = createRealisticMotoWheel(3.25, 1.45, false, false);
      fWheel.position.set(frontX, wheelY, 0);
      group.add(fWheel);
      group.userData.wheels.push(fWheel);

      const rWheel = createRealisticMotoWheel(3.25, 1.80, true, false);
      rWheel.position.set(rearX, wheelY, 0);
      group.add(rWheel);
      group.userData.wheels.push(rWheel);

      // Caliper: dark metallic (ZERO stray tan block)
      const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.42), mats.darkFrameMat);
      fCaliper.position.set(frontX - 1.25, wheelY + 1.25, 0.65);
      group.add(fCaliper);

      const rakeAngle = 0.40;
      const tripleTreeX = 5.6;
      const tripleTreeY = 8.2;

      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), mats.darkFrameMat);
      topClamp.position.set(tripleTreeX, tripleTreeY, 0);
      topClamp.rotation.z = rakeAngle;
      group.add(topClamp);

      const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), mats.darkFrameMat);
      lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.5, tripleTreeY - Math.cos(rakeAngle) * 1.5, 0);
      lowerClamp.rotation.z = rakeAngle;
      group.add(lowerClamp);

      [-1.15, 1.15].forEach(fz => {
        const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 3.8, 14), mats.chromeMat);
        slider.position.set(frontX - Math.sin(rakeAngle) * 1.8, wheelY + Math.cos(rakeAngle) * 1.8, fz);
        slider.rotation.z = rakeAngle;
        group.add(slider);

        const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.40, 4.2, 16), bikeBodyMat);
        shroud.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
        shroud.rotation.z = rakeAngle;
        group.add(shroud);

        // CLEAN AXLE SPINDLE (NO protruding square block)
        const smallAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.45, 12), mats.darkFrameMat);
        smallAxle.rotation.x = Math.PI / 2;
        smallAxle.position.set(frontX, wheelY, fz);
        group.add(smallAxle);
      });

      // 1. MODEL A FRONT MUDGUARD: Sculpted fender over top crown (angle = 65° to 135°)
      // Bridging cleanly between two fork shrouds, with triangular side extensions covering upper fork stanchions
      const frontMudguard = createUpperArchFender(frontX, wheelY, 3.25 + 0.10, 1.65, 65, 135, 24, bikeBodyMat, 0.10);
      group.add(frontMudguard);

      // Triangular side extensions covering fork stanchions
      [-0.85, 0.85].forEach(sz => {
        const sideFlangeGeo = new THREE.BufferGeometry();
        const pts = [
          new THREE.Vector3(frontX - 0.2, wheelY + 3.15, sz),
          new THREE.Vector3(frontX - 1.2, wheelY + 2.30, sz),
          new THREE.Vector3(frontX - 0.1, wheelY + 2.05, sz)
        ];
        sideFlangeGeo.setFromPoints(pts);
        sideFlangeGeo.computeVertexNormals();
        const flange = new THREE.Mesh(sideFlangeGeo, bikeBodyMat);
        group.add(flange);
      });

      // Slatted Headlight with 4 Prominent Vertical Black Grill Slats & Smoked Flyscreen
      const headlightGroup = new THREE.Group();
      headlightGroup.position.set(tripleTreeX + 1.25, tripleTreeY - 0.35, 0);

      const hlBucket = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.80, 0.85, 20), mats.darkFrameMat);
      hlBucket.rotation.z = Math.PI / 2;
      headlightGroup.add(hlBucket);

      const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.88, 24), new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfef08a, emissiveIntensity: 0.95, roughness: 0.10 }));
      hlLens.rotation.y = Math.PI / 2;
      hlLens.position.set(0.44, 0, 0);
      headlightGroup.add(hlLens);

      const hlBezel = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.08, 10, 24), mats.darkFrameMat);
      hlBezel.rotation.y = Math.PI / 2;
      hlBezel.position.set(0.48, 0, 0);
      headlightGroup.add(hlBezel);

      [-0.50, -0.17, 0.17, 0.50].forEach(sz => {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.55, 0.09), mats.darkFrameMat);
        slat.position.set(0.52, 0, sz);
        headlightGroup.add(slat);
      });

      const visorShape = new THREE.Shape();
      visorShape.moveTo(0, 0);
      visorShape.quadraticCurveTo(0.5, 1.4, 0.2, 2.2);
      visorShape.quadraticCurveTo(-0.7, 1.8, -0.6, 0);
      visorShape.closePath();
      const visorGeo = new THREE.ExtrudeGeometry(visorShape, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06 });
      visorGeo.translate(0, 0, -0.8);
      const visorMesh = new THREE.Mesh(visorGeo, mats.smokedVisorMat);
      visorMesh.position.set(-0.25, 0.75, 0);
      visorMesh.rotation.z = -0.42;
      headlightGroup.add(visorMesh);
      group.add(headlightGroup);

      // Drag Bars with Bar-End Mirrors
      const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 14), mats.darkFrameMat);
      hBar.rotation.x = Math.PI / 2;
      hBar.position.set(tripleTreeX + 0.15, tripleTreeY + 0.55, 0);
      group.add(hBar);

      leftGripPos = [tripleTreeX + 0.15, tripleTreeY + 0.55, -1.85];
      rightGripPos = [tripleTreeX + 0.15, tripleTreeY + 0.55, 1.85];

      [-2.25, 2.25].forEach(bz => {
        const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.50, 0.08), mats.darkFrameMat);
        mirrorStem.position.set(tripleTreeX + 0.15, tripleTreeY + 0.30, bz);
        group.add(mirrorStem);
        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16), mats.darkFrameMat);
        mirror.rotation.z = Math.PI / 2;
        mirror.position.set(tripleTreeX + 0.15, tripleTreeY + 0.05, bz);
        group.add(mirror);
      });

      // Tubular Trellis Frame
      const trellisTubes = [
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, 0.95], [2.2, 5.8, 1.25], [-1.2, 4.2, 1.05]],
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, -0.95], [2.2, 5.8, -1.25], [-1.2, 4.2, -1.05]],
        [[3.8, 6.8, 1.05], [1.2, 4.2, 1.15], [-1.2, 4.2, 1.05]],
        [[3.8, 6.8, -1.05], [1.2, 4.2, -1.15], [-1.2, 4.2, -1.05]],
        [[1.8, 6.4, 1.15], [0.4, 5.0, 1.15]],
        [[1.8, 6.4, -1.15], [0.4, 5.0, -1.15]]
      ];
      trellisTubes.forEach(pts => {
        const vPts = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const curve = new THREE.CatmullRomCurve3(vPts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.18, 8, false), mats.darkFrameMat);
        group.add(tube);
      });

      const engineBox = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.2, 2.2), mats.gunmetalEngineMat);
      engineBox.position.set(1.4, 4.6, 0);
      group.add(engineBox);

      for (let y = 3.4; y <= 5.8; y += 0.35) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 2.45), mats.darkFrameMat);
        fin.position.set(1.4, y, 0);
        group.add(fin);
      }

      const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.6, 2.0), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.40, metalness: 0.7 }));
      radiator.position.set(3.8, 4.6, 0);
      group.add(radiator);

      [
        { x: 2.4, y: 4.0, r: 0.70, d: 0.28 },
        { x: 0.9, y: 4.8, r: 0.58, d: 0.24 },
        { x: 1.0, y: 3.6, r: 0.48, d: 0.20 }
      ].forEach(cov => {
        const cMesh = new THREE.Mesh(new THREE.CylinderGeometry(cov.r, cov.r, cov.d, 18), mats.bronzeCoverMat);
        cMesh.rotation.x = Math.PI / 2;
        cMesh.position.set(cov.x, cov.y, 1.15);
        group.add(cMesh);
      });

      // Tightly Contoured Belly Pan (matching primary livery)
      const bellyShape = new THREE.Shape();
      bellyShape.moveTo(3.2, 3.6);
      bellyShape.lineTo(3.4, 2.8);
      bellyShape.lineTo(2.0, 2.3);
      bellyShape.lineTo(0.4, 2.3);
      bellyShape.lineTo(0.2, 3.0);
      bellyShape.lineTo(1.2, 3.6);
      bellyShape.closePath();
      const bellyGeo = new THREE.ExtrudeGeometry(bellyShape, { depth: 1.55, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06 });
      bellyGeo.translate(0, 0, -1.55 / 2);
      const bellyPan = new THREE.Mesh(bellyGeo, contrastMat);
      group.add(bellyPan);

      // Sculpted Muscular Humpback Fuel Tank (matching primary livery)
      const tankStations = [
        { center: [5.4, 7.6, 0],  ryTop: 0.55, ryBot: 0.65, rz: 0.65 },
        { center: [4.4, 8.2, 0],  ryTop: 1.25, ryBot: 1.35, rz: 1.35 },
        { center: [3.2, 8.6, 0],  ryTop: 1.55, ryBot: 1.65, rz: 1.50 },
        { center: [1.8, 8.1, 0],  ryTop: 1.35, ryBot: 1.50, rz: 1.38 },
        { center: [0.4, 7.5, 0],  ryTop: 1.00, ryBot: 1.15, rz: 1.05 },
        { center: [-1.0, 6.9, 0], ryTop: 0.55, ryBot: 0.65, rz: 0.75 }
      ];
      group.add(createLoftedBodyMesh(tankStations, 24, bikeBodyMat));

      const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 18), mats.chromeMat);
      gasCap.position.set(2.8, 10.25, 0);
      gasCap.rotation.z = -0.15;
      group.add(gasCap);

      [-1.22, 1.22].forEach(kz => {
        const padMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), mats.matteBlackKneeMat);
        padMesh.scale.set(1.4, 0.65, 0.14);
        padMesh.position.set(1.0, 7.6, kz);
        padMesh.rotation.z = 0.15;
        group.add(padMesh);
      });

      // Thick Raised Matte-Black Saddle Cushion (#181a1f) - Top surface at seatTopY = 7.70
      const raisedSaddleMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.85 });
      const saddleStations = [
        { center: [-1.0, 7.15, 0], ryTop: 0.52, ryBot: 0.65, rz: 0.98 },
        { center: [-2.2, 7.10, 0], ryTop: 0.65, ryBot: 0.65, rz: 1.28 },
        { center: [-3.4, 7.25, 0], ryTop: 0.55, ryBot: 0.55, rz: 1.18 },
        { center: [-4.4, 7.50, 0], ryTop: 0.45, ryBot: 0.45, rz: 0.95 }
      ];
      group.add(createLoftedBodyMesh(saddleStations, 22, raisedSaddleMat));

      const tailStations = [
        { center: [-4.4, 7.4, 0], ryTop: 0.48, ryBot: 0.38, rz: 0.78 },
        { center: [-5.6, 7.9, 0], ryTop: 0.45, ryBot: 0.32, rz: 0.68 },
        { center: [-7.0, 8.3, 0], ryTop: 0.35, ryBot: 0.25, rz: 0.50 },
        { center: [-8.2, 8.1, 0], ryTop: 0.18, ryBot: 0.15, rz: 0.25 }
      ];
      group.add(createLoftedBodyMesh(tailStations, 20, bikeBodyMat));

      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.65), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 }));
      tailLight.position.set(-8.25, 8.1, 0);
      group.add(tailLight);

      // 2. MODEL A REAR TIRE HUGGER: Forward-facing sport tire hugger mounted to swingarm
      // Covers ONLY upper-front quadrant (angle = 35° to 88° facing engine/exhaust under seat), stopping right at 12 o'clock top crest!
      // Leaves rear half (88° to 180°) and lower half 100% open and exposed!
      const rearHugger = createUpperArchFender(rearX, wheelY, 3.25 + 0.10, 1.85, 35, 88, 20, bikeBodyMat, 0.08);
      group.add(rearHugger);

      // Swingarm mounting bracket for rear hugger
      const huggerBracket = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.35), mats.darkFrameMat);
      huggerBracket.position.set(rearX + 1.8, wheelY + 1.6, 1.0);
      huggerBracket.rotation.z = -0.55;
      group.add(huggerBracket);

      const headerPts = [
        new THREE.Vector3(3.4, 4.6, 0.3),
        new THREE.Vector3(4.0, 3.2, 0.5),
        new THREE.Vector3(2.6, 2.3, 0.8),
        new THREE.Vector3(0.0, 2.5, 0.9),
        new THREE.Vector3(-1.8, 3.4, 0.9),
        new THREE.Vector3(-3.8, 5.2, 0.5),
        new THREE.Vector3(-5.5, 7.2, 0.0)
      ];
      const headerTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(headerPts), 24, 0.22, 10, false), mats.chromeMat);
      group.add(headerTube);

      const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 2.8, 16), mats.darkFrameMat);
      muffler.rotation.z = Math.PI / 2 - 0.15;
      muffler.scale.set(0.85, 1.0, 1.45);
      muffler.position.set(-6.8, 7.6, 0);
      group.add(muffler);

      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.25, 12), mats.bronzeCoverMat);
      endCap.rotation.z = Math.PI / 2 - 0.15;
      endCap.position.set(-8.2, 7.85, 0);
      group.add(endCap);

      [-1.05, 1.05].forEach(sz => {
        const swingArm = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.75, 0.42), mats.darkFrameMat);
        swingArm.position.set(-4.6, 3.7, sz);
        swingArm.rotation.z = 0.14;
        group.add(swingArm);
      });

      saddleAnchor = [-2.2, 7.70, 0];
      pegPosL = [0.4, 4.0, -1.45];
      pegPosR = [0.4, 4.0, 1.45];

      // Footpegs
      [-1, 1].forEach(side => {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 12), mats.darkFrameMat);
        peg.rotation.x = Math.PI / 2;
        peg.position.set(0.4, 3.8, side * 1.45);
        group.add(peg);
      });

      // ATTACH REBUILT FURNISHED BIKER (Sport Tuck - Hips seated firmly on saddle)
      // 1:1 Helmet-to-Bike Color Synchronization
      const bikeSyncA = {
        helmColor: variantConfig.helmColor !== undefined ? variantConfig.helmColor : variantConfig.primaryColor,
        contrastColor: variantConfig.helmContrast !== undefined ? variantConfig.helmContrast : variantConfig.contrastColor,
        outfit: variantConfig.outfit
      };
      const biker = buildRealisticBiker(false, saddleAnchor, leftGripPos, rightGripPos, pegPosL, pegPosR, mats, appearanceSeed, bikeSyncA);
      group.add(biker);

    } else if (modelKey === 'B') {
      // =======================================================================
      // MODEL B: MUSCLE CRUISER (MULTI-COLOR LIVERIES WITH 1:1 HELMET LOCK)
      // =======================================================================
      const frontX = 8.8;
      const rearX = -8.6;
      const wheelY = 3.25;

      const fWheel = createRealisticMotoWheel(3.25, 1.45, false, true);
      fWheel.position.set(frontX, wheelY, 0);
      group.add(fWheel);
      group.userData.wheels.push(fWheel);

      const rWheel = createRealisticMotoWheel(3.10, 2.20, true, true);
      rWheel.position.set(rearX, 3.10, 0);
      group.add(rWheel);
      group.userData.wheels.push(rWheel);

      const fCaliper = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.45), mats.darkFrameMat);
      fCaliper.position.set(frontX - 1.25, wheelY + 1.20, 0.75);
      group.add(fCaliper);

      const rakeAngle = 0.52;
      const tripleTreeX = 5.8;
      const tripleTreeY = 8.4;

      const topClamp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 3.2), mats.chromeMat);
      topClamp.position.set(tripleTreeX, tripleTreeY, 0);
      topClamp.rotation.z = rakeAngle;
      group.add(topClamp);

      const lowerClamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 3.2), mats.chromeMat);
      lowerClamp.position.set(tripleTreeX - Math.sin(rakeAngle) * 1.6, tripleTreeY - Math.cos(rakeAngle) * 1.6, 0);
      lowerClamp.rotation.z = rakeAngle;
      group.add(lowerClamp);

      [-1.15, 1.15].forEach(fz => {
        const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 4.2, 14), mats.chromeMat);
        slider.position.set(frontX - Math.sin(rakeAngle) * 2.0, wheelY + Math.cos(rakeAngle) * 2.0, fz);
        slider.rotation.z = rakeAngle;
        group.add(slider);

        const goldTube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 4.8, 16), mats.goldAnodizedMat);
        goldTube.position.set(tripleTreeX + Math.sin(rakeAngle) * 0.5, tripleTreeY - Math.cos(rakeAngle) * 0.5, fz);
        goldTube.rotation.z = rakeAngle;
        group.add(goldTube);

        // CLEAN AXLE SPINDLE (NO blocky cube sticking out)
        const smallAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 14), mats.darkFrameMat);
        smallAxle.rotation.x = Math.PI / 2;
        smallAxle.position.set(frontX, wheelY, fz);
        group.add(smallAxle);
      });

      // 1. MODEL B FRONT MUDGUARD: Single unified group centered at top crest (angle = 60° to 130°, hugging 0.08 above tread)
      const frontFenderGroup = new THREE.Group();
      const fFenderR = 3.25 + 0.08;
      const fFender = createUpperArchFender(frontX, wheelY, fFenderR, 1.60, 60, 130, 24, bikeBodyMat, 0.08);
      frontFenderGroup.add(fFender);

      // Coordinated pinstripe hugging tightly right on the front fender arch
      const fStripeCurve = new THREE.CatmullRomCurve3();
      for (let d = 60; d <= 130; d += 10) {
        const rad = d * Math.PI / 180;
        fStripeCurve.points.push(new THREE.Vector3(frontX + Math.cos(rad) * (fFenderR + 0.05), wheelY + Math.sin(rad) * (fFenderR + 0.05), 0));
      }
      const fFenderStripe = new THREE.Mesh(new THREE.TubeGeometry(fStripeCurve, 18, 0.045, 8, false), pinstripeMat);
      frontFenderGroup.add(fFenderStripe);
      group.add(frontFenderGroup);

      // Single Round Chrome Headlight
      const hlGroup = new THREE.Group();
      hlGroup.position.set(tripleTreeX + 1.25, tripleTreeY - 0.45, 0);

      const hlBucket = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), mats.darkFrameMat);
      hlBucket.scale.set(0.75, 0.95, 0.95);
      hlGroup.add(hlBucket);

      const hlBezel = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 10, 24), mats.chromeMat);
      hlBezel.rotation.y = Math.PI / 2;
      hlBezel.position.set(0.25, 0, 0);
      hlGroup.add(hlBezel);

      const hlLens = new THREE.Mesh(new THREE.CircleGeometry(0.92, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbeb, emissiveIntensity: 0.95, roughness: 0.08 }));
      hlLens.rotation.y = Math.PI / 2;
      hlLens.position.set(0.26, 0, 0);
      hlGroup.add(hlLens);

      const flyscreenShape = new THREE.Shape();
      flyscreenShape.moveTo(0, 0);
      flyscreenShape.quadraticCurveTo(0.4, 1.8, 0.1, 2.8);
      flyscreenShape.quadraticCurveTo(-0.6, 2.2, -0.5, 0);
      flyscreenShape.closePath();
      const flyscreen = new THREE.Mesh(new THREE.ExtrudeGeometry(flyscreenShape, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05 }).translate(0, 0, -0.7), mats.smokedVisorMat);
      flyscreen.position.set(-0.25, 0.7, 0);
      flyscreen.rotation.z = -0.45;
      hlGroup.add(flyscreen);
      group.add(hlGroup);

      // Wide Flat Chrome T-Bars
      const tBar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 14), mats.chromeMat);
      tBar.rotation.x = Math.PI / 2;
      tBar.position.set(tripleTreeX + 0.10, tripleTreeY + 0.65, 0);
      group.add(tBar);

      leftGripPos = [tripleTreeX + 0.10, tripleTreeY + 0.65, -2.25];
      rightGripPos = [tripleTreeX + 0.10, tripleTreeY + 0.65, 2.25];

      [-2.45, 2.45].forEach(mz => {
        const mStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), mats.chromeMat);
        mStem.position.set(tripleTreeX + 0.10, tripleTreeY + 1.05, mz);
        group.add(mStem);
        const mHead = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.08, 16), mats.chromeMat);
        mHead.rotation.z = Math.PI / 2;
        mHead.position.set(tripleTreeX + 0.10, tripleTreeY + 1.45, mz);
        group.add(mHead);
      });

      // Double-Cradle Black Steel Frame
      const cradleTubes = [
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, 1.0], [3.8, 4.2, 1.3], [1.8, 2.3, 1.3], [-2.0, 2.3, 1.3], [-4.2, 3.8, 1.1]],
        [[tripleTreeX - 0.4, tripleTreeY - 0.6, -1.0], [3.8, 4.2, -1.3], [1.8, 2.3, -1.3], [-2.0, 2.3, -1.3], [-4.2, 3.8, -1.1]]
      ];
      cradleTubes.forEach(pts => {
        const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.20, 8, false), mats.darkFrameMat);
        group.add(tube);
      });

      // Exposed Chrome V-Twin Engine
      const vTwinGroup = new THREE.Group();
      vTwinGroup.position.set(1.2, 4.5, 0);

      const crankCase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 2.2), mats.gunmetalEngineMat);
      vTwinGroup.add(crankCase);

      const vAngles = [-0.40, 0.40];
      vAngles.forEach(va => {
        const cylGroup = new THREE.Group();
        cylGroup.rotation.z = va;
        cylGroup.position.set(Math.sin(va) * 0.9, Math.cos(va) * 0.9, 0);

        for (let fy = 0; fy <= 1.8; fy += 0.28) {
          const cFin = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.07, 18), mats.darkFrameMat);
          cFin.position.y = fy;
          cylGroup.add(cFin);
          const iFin = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.22, 16), mats.gunmetalEngineMat);
          iFin.position.y = fy + 0.14;
          cylGroup.add(iFin);
        }

        vTwinGroup.add(cylGroup);

        const rockerHead = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.6), mats.chromeMat);
        rockerHead.rotation.z = va;
        rockerHead.position.set(Math.sin(va) * 2.8, Math.cos(va) * 2.8, 0);
        vTwinGroup.add(rockerHead);

        [-0.55, 0.55].forEach(pz => {
          const pushRod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), mats.chromeMat);
          pushRod.rotation.z = va * 1.08;
          pushRod.position.set(Math.sin(va) * 1.35, Math.cos(va) * 1.35, pz * 1.05);
          vTwinGroup.add(pushRod);
        });
      });

      const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.32, 20), mats.chromeMat);
      airCleaner.rotation.x = Math.PI / 2;
      airCleaner.position.set(0.0, 1.3, 1.32);
      vTwinGroup.add(airCleaner);

      const primaryCover = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.35, 20), mats.chromeMat);
      primaryCover.rotation.x = Math.PI / 2;
      primaryCover.position.set(0.2, -0.2, 1.25);
      vTwinGroup.add(primaryCover);
      group.add(vTwinGroup);

      // Dual Staggered Chrome Exhaust Pipes
      [0.95, 1.30].forEach((pz, idx) => {
        const pipeY = 2.7 + idx * 0.45;
        const pipePts = [
          new THREE.Vector3(2.4, 4.4 - idx * 0.4, 0.6),
          new THREE.Vector3(3.0, 3.4, pz),
          new THREE.Vector3(1.8, pipeY, pz),
          new THREE.Vector3(-4.0, pipeY, pz),
          new THREE.Vector3(-8.8 - idx * 0.4, pipeY, pz)
        ];
        const pipeCurve = new THREE.CatmullRomCurve3(pipePts);
        const exPipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 20, 0.22, 10, false), mats.chromeMat);
        group.add(exPipe);

        const slashTip = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.65, 14), mats.chromeMat);
        slashTip.rotation.z = Math.PI / 2 - 0.35;
        slashTip.position.set(-8.8 - idx * 0.4, pipeY, pz);
        group.add(slashTip);
      });

      // Teardrop Fuel Tank with Coordinated Pinstripes
      const cruiserTankStations = [
        { center: [5.4, 7.5, 0],  ryTop: 0.50, ryBot: 0.65, rz: 0.65 },
        { center: [4.0, 8.4, 0],  ryTop: 1.20, ryBot: 1.45, rz: 1.40 },
        { center: [2.2, 8.2, 0],  ryTop: 1.15, ryBot: 1.35, rz: 1.30 },
        { center: [0.2, 7.3, 0],  ryTop: 0.90, ryBot: 1.10, rz: 1.05 },
        { center: [-1.4, 6.4, 0], ryTop: 0.50, ryBot: 0.65, rz: 0.72 }
      ];
      group.add(createLoftedBodyMesh(cruiserTankStations, 24, bikeBodyMat));

      // Flush billet gas cap (ZERO vertical grey bar)
      const gasCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.10, 18), mats.chromeMat);
      gasCap.position.set(3.2, 8.85, 0);
      gasCap.rotation.z = -0.25;
      group.add(gasCap);

      [-1.38, 1.38].forEach(tz => {
        const pinstripeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-1.2, 6.5, tz * 0.7),
          new THREE.Vector3(0.4, 7.5, tz * 0.95),
          new THREE.Vector3(2.2, 8.6, tz * 1.05),
          new THREE.Vector3(4.0, 8.7, tz * 1.05),
          new THREE.Vector3(5.2, 7.7, tz * 0.6)
        ]);
        const stripeTube = new THREE.Mesh(new THREE.TubeGeometry(pinstripeCurve, 20, 0.05, 8, false), pinstripeMat);
        group.add(stripeTube);
      });

      // Thick Raised Matte-Black Saddle Cushion (#181a1f) - Top surface at seatTopY = 7.30
      const cruiserSaddleMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.85 });
      const seatStations = [
        { center: [-1.4, 6.75, 0], ryTop: 0.52, ryBot: 0.65, rz: 0.92 }, // meeting tank rear (top Y = 7.27)
        { center: [-2.6, 6.70, 0], ryTop: 0.65, ryBot: 0.65, rz: 1.25 }, // main thick raised cushion directly under glutes (top Y = 7.35)
        { center: [-3.8, 6.80, 0], ryTop: 0.55, ryBot: 0.55, rz: 1.15 }, // gentle lumbar rise (top Y = 7.35)
        { center: [-4.4, 6.65, 0], ryTop: 0.42, ryBot: 0.45, rz: 0.95 }  // meeting rear fender (top Y = 7.07)
      ];
      group.add(createLoftedBodyMesh(seatStations, 22, cruiserSaddleMat));

      // 2. MODEL B REAR MUDGUARD: Sweeping Rear Fender from back of seat to bobbed tail
      // Hugging the top arch of the rear tire, flowing seamlessly into the saddle!
      const fenderStations = [
        { center: [-4.3, 6.08, 0], ryTop: 0.18, ryBot: 0.14, rz: 1.15 },
        { center: [-5.6, 6.35, 0], ryTop: 0.20, ryBot: 0.16, rz: 1.25 },
        { center: [-7.2, 6.55, 0], ryTop: 0.22, ryBot: 0.18, rz: 1.28 },
        { center: [-8.8, 6.50, 0], ryTop: 0.22, ryBot: 0.18, rz: 1.25 },
        { center: [-10.4, 5.75, 0], ryTop: 0.20, ryBot: 0.16, rz: 1.20 },
        { center: [-11.5, 4.40, 0], ryTop: 0.18, ryBot: 0.14, rz: 1.12 }
      ];
      group.add(createLoftedBodyMesh(fenderStations, 24, bikeBodyMat));

      // Coordinated Pinstripes along rear fender flanks
      [-1.18, 1.18].forEach(rz => {
        const rStripeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-4.4, 6.12, rz * 0.75),
          new THREE.Vector3(-6.2, 6.42, rz * 0.95),
          new THREE.Vector3(-8.8, 6.56, rz * 0.98),
          new THREE.Vector3(-10.4, 5.82, rz * 0.95),
          new THREE.Vector3(-11.5, 4.45, rz * 0.80)
        ]);
        const rStripe = new THREE.Mesh(new THREE.TubeGeometry(rStripeCurve, 20, 0.05, 8, false), pinstripeMat);
        group.add(rStripe);
      });

      // Chrome Tombstone Taillight on rear fender tip
      const tombstoneHl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.45), mats.chromeMat);
      tombstoneHl.position.set(-11.5, 4.4, 0);
      tombstoneHl.rotation.z = -0.45;
      group.add(tombstoneHl);

      const tombstoneLens = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.45, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 })
      );
      tombstoneLens.position.set(-11.65, 4.45, 0);
      tombstoneLens.rotation.z = -0.45;
      group.add(tombstoneLens);

      [-1.15, 1.15].forEach(sz => {
        const cArm = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.70, 0.38), mats.darkFrameMat);
        cArm.position.set(-4.8, 3.4, sz);
        cArm.rotation.z = 0.08;
        group.add(cArm);
      });

      saddleAnchor = [-2.6, 7.30, 0];
      pegPosL = [2.8, 3.8, -1.55];
      pegPosR = [2.8, 3.8, 1.55];

      // Forward Footpegs
      [-1, 1].forEach(side => {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.85, 12), mats.darkFrameMat);
        peg.rotation.x = Math.PI / 2;
        peg.position.set(2.8, 3.6, side * 1.55);
        group.add(peg);
      });

      // ATTACH REBUILT FURNISHED BIKER (Cruiser Posture - Deeply nested in saddle)
      // 1:1 Helmet-to-Bike Color Synchronization
      const bikeSyncB = {
        helmColor: variantConfig.helmColor !== undefined ? variantConfig.helmColor : variantConfig.primaryColor,
        contrastColor: variantConfig.helmContrast !== undefined ? variantConfig.helmContrast : variantConfig.contrastColor,
        outfit: variantConfig.outfit
      };
      const biker = buildRealisticBiker(true, saddleAnchor, leftGripPos, rightGripPos, pegPosL, pegPosR, mats, appearanceSeed, bikeSyncB);
      group.add(biker);
    } else if (modelKey === 'C') {
      buildBikeModelC(group, variantConfig, mats, appearanceSeed);
    } else { // modelKey === 'D'
      buildBikeModelD(group, variantConfig, mats, appearanceSeed);
    }

    // World scale permanently locked at 0.60x sweet spot
    const BIKE_WORLD_SCALE = 0.60;
    bikePackage.scale.setScalar(BIKE_WORLD_SCALE);
    bikePackage.position.set(0, 0, 0);

    return bikePackage;
  }

  // Canonical 4-Model 3D Motorcycle Factory
  function createRealisticGTABike(colorHex, appearanceSeed, vData) {
    const root = new THREE.Group();
    root.userData.isBike = true;
    root.userData.wheels = [];

    // Resolve variant index from master 16-combination deck
    let variantIndex;
    if (vData && typeof vData.variantIndex === 'number') {
      variantIndex = ((vData.variantIndex % BIKE_VARIANT_DECK.length) + BIKE_VARIANT_DECK.length) % BIKE_VARIANT_DECK.length;
    } else if (vData && vData.variantId) {
      const foundIdx = BIKE_VARIANT_DECK.findIndex(d => d.id === vData.variantId);
      variantIndex = foundIdx !== -1 ? foundIdx : 0;
    } else if (vData && vData.modelType) {
      const mt = String(vData.modelType).toUpperCase();
      const foundIdx = BIKE_VARIANT_DECK.findIndex(d => d.modelKey === mt);
      variantIndex = foundIdx !== -1 ? foundIdx : (Math.abs(appearanceSeed || 0) % BIKE_VARIANT_DECK.length);
    } else {
      variantIndex = Math.abs(appearanceSeed || 0) % BIKE_VARIANT_DECK.length;
    }

    const variantConfig = BIKE_VARIANT_DECK[variantIndex];
    root.userData.currentVariantIndex = variantIndex;

    const bikePackage = buildBikePackage(variantConfig, appearanceSeed);
    root.add(bikePackage);
    root.userData.bikePackage = bikePackage;

    const BIKE_WORLD_SCALE = 0.60;
    root.userData.wheels = bikePackage.userData.wheels || [];
    root.userData.wheelRadius = 3.25 * BIKE_WORLD_SCALE;
    root.userData.modelKey = variantConfig.modelKey;
    root.userData.modelTitle = variantConfig.modelTitle;

    // Zero-Lag Additive Headlight Ground Light Pool (scaled with vehicle)
    const headGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const headPool = new THREE.Mesh(new THREE.PlaneGeometry(36 * BIKE_WORLD_SCALE, 18 * BIKE_WORLD_SCALE), headGlowMat);
    headPool.rotation.x = -Math.PI / 2;
    const frontOffset = ((variantConfig.modelKey === 'B' || variantConfig.modelKey === 'D') ? 8.8 : 8.0) + 18;
    headPool.position.set(frontOffset * BIKE_WORLD_SCALE, 0.08, 0);
    root.add(headPool);
    root.userData.headPool = headPool;

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(root);
    }
    return root;
  }

  // Pre-Built Dynamic Variant Swapper on Wrap-Around / Respawn
  function swapBikeVariant(rootMesh, targetVariantIndex) {
    if (!rootMesh || !rootMesh.userData || !rootMesh.userData.isBike) return;

    let newIndex;
    if (typeof targetVariantIndex === 'number') {
      newIndex = ((targetVariantIndex % BIKE_VARIANT_DECK.length) + BIKE_VARIANT_DECK.length) % BIKE_VARIANT_DECK.length;
    } else {
      newIndex = ((rootMesh.userData.currentVariantIndex || 0) + 1) % BIKE_VARIANT_DECK.length;
    }

    const variantConfig = BIKE_VARIANT_DECK[newIndex];
    if (!variantConfig) return;

    // Cleanly remove & dispose old bikePackage
    if (rootMesh.userData.bikePackage) {
      rootMesh.remove(rootMesh.userData.bikePackage);
      rootMesh.userData.bikePackage.traverse(obj => {
        if (obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => { if (m && typeof m.dispose === 'function') m.dispose(); });
          } else if (typeof obj.material.dispose === 'function') {
            obj.material.dispose();
          }
        }
      });
    }

    const newBikePackage = buildBikePackage(variantConfig, newIndex);
    rootMesh.add(newBikePackage);
    rootMesh.userData.bikePackage = newBikePackage;
    rootMesh.userData.wheels = newBikePackage.userData.wheels || [];
    rootMesh.userData.wheelRadius = 3.25 * 0.60;
    rootMesh.userData.modelKey = variantConfig.modelKey;
    rootMesh.userData.modelTitle = variantConfig.modelTitle;
    rootMesh.userData.currentVariantIndex = newIndex;

    if (rootMesh.userData.headPool) {
      const BIKE_WORLD_SCALE = 0.60;
      const frontOffset = ((variantConfig.modelKey === 'B' || variantConfig.modelKey === 'D') ? 8.8 : 8.0) + 18;
      rootMesh.userData.headPool.position.set(frontOffset * BIKE_WORLD_SCALE, 0.08, 0);
    }

    if (activeTargetVehicle && activeTargetVehicle.mesh === rootMesh) {
      const title = document.getElementById('crossroadsModePillTitle');
      if (title && activeTargetVehicle.data) {
        const dirLabel = activeTargetVehicle.data.dir === 'EB' ? 'Eastbound' :
                         activeTargetVehicle.data.dir === 'WB' ? 'Westbound' :
                         activeTargetVehicle.data.dir === 'SB' ? 'Southbound' : 'Northbound';
        title.textContent = `${variantConfig.modelTitle} · ${dirLabel}`;
      }
    }

    return newIndex;
  }

  window.buildBikeModelC = buildBikeModelC;
  window.buildBikeModelD = buildBikeModelD;
  window.buildBikePackage = buildBikePackage;
  window.createRealisticGTABike = createRealisticGTABike;
  window.swapBikeVariant = swapBikeVariant;
  window.cycleBikeShowcase = function() {
    if (typeof window.crossroadsFocusMode === 'function') {
      window.crossroadsFocusMode('bike');
    }
  };














  // 3D Canonical Vehicle Builders (all built facing +X direction)
  // ---------------------------------------------------------------------------
  // Authentic Dhaka Cycle Rickshaw & CNG Auto-Rickshaw Factories (Pure Three.js)
  // ---------------------------------------------------------------------------
  function createSmoothBoneSegment(p0, p1, r0, r1, material) {
    const v0 = new THREE.Vector3(p0[0], p0[1], p0[2]);
    const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const dir = new THREE.Vector3().subVectors(v1, v0);
    const len = dir.length();
    if (len < 0.0001) return new THREE.Group();

    const geom = new THREE.CylinderGeometry(r1, r0, len, 12);
    geom.translate(0, len / 2, 0);

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.copy(v0);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    mesh.castShadow = true;
    return mesh;
  }

  function createOrganicTorso(stations, material) {
    const points = stations.map(s => new THREE.Vector3(s.x, s.y, s.z));
    const curve = new THREE.CatmullRomCurve3(points);
    const numSteps = 16;
    const radSteps = 12;

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const pt = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      const sIdx = Math.min(stations.length - 2, Math.floor(t * (stations.length - 1)));
      const frac = (t * (stations.length - 1)) - sIdx;
      const rx = THREE.MathUtils.lerp(stations[sIdx].rx, stations[sIdx + 1].rx, frac);
      const rz = THREE.MathUtils.lerp(stations[sIdx].rz, stations[sIdx + 1].rz, frac);

      let normal = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.y) > 0.95) normal.set(1, 0, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      normal.crossVectors(binormal, tangent).normalize();

      for (let j = 0; j <= radSteps; j++) {
        const theta = (j / radSteps) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);
        const offset = new THREE.Vector3()
          .addScaledVector(normal, cos * rx)
          .addScaledVector(binormal, sin * rz);
        const v = new THREE.Vector3().addVectors(pt, offset);
        positions.push(v.x, v.y, v.z);

        const norm = offset.clone().normalize();
        normals.push(norm.x, norm.y, norm.z);
        uvs.push(j / radSteps, t);
      }
    }

    for (let i = 0; i < numSteps; i++) {
      for (let j = 0; j < radSteps; j++) {
        const a = i * (radSteps + 1) + j;
        const b = (i + 1) * (radSteps + 1) + j;
        const c = (i + 1) * (radSteps + 1) + (j + 1);
        const d = i * (radSteps + 1) + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = true;
    return mesh;
  }

  function createSculptedHumanHead(skinMat, hairMat, options = {}) {
    const headGroup = new THREE.Group();

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), skinMat);
    cranium.scale.set(0.88, 1.05, 0.92);
    headGroup.add(cranium);

    const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.45, 10), skinMat);
    jaw.position.set(0.16, -0.46, 0);
    jaw.rotation.z = -0.22;
    headGroup.add(jaw);

    if (!options.isVeiled) {
      const hairGeom = new THREE.SphereGeometry(0.75, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.52);
      const hair = new THREE.Mesh(hairGeom, hairMat);
      hair.scale.set(0.92, 1.08, 0.96);
      hair.position.set(-0.02, 0.08, 0);
      headGroup.add(hair);

      [-0.66, 0.66].forEach(sz => {
        const sburn = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.30, 0.08), hairMat);
        sburn.position.set(0.05, -0.15, sz);
        headGroup.add(sburn);
      });
    }

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.23, 0.23].forEach(side => {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), eyeWhiteMat);
      eyeW.scale.set(0.5, 0.9, 1.2);
      eyeW.position.set(0.60, 0.08, side);
      headGroup.add(eyeW);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), hairMat);
      iris.position.set(0.66, 0.08, side);
      headGroup.add(iris);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.030, 0.23), hairMat);
      brow.position.set(0.62, 0.20, side);
      brow.rotation.z = -0.15;
      headGroup.add(brow);

      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
      ear.scale.set(0.6, 1.2, 0.35);
      ear.position.set(-0.08, 0.02, side * 0.70);
      headGroup.add(ear);
    });

    const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.28, 8), skinMat);
    noseBridge.rotation.z = -Math.PI / 2 + 0.15;
    noseBridge.position.set(0.66, 0.0, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    noseTip.position.set(0.72, -0.07, 0);
    headGroup.add(noseTip);

    const lipMat = new THREE.MeshStandardMaterial({ color: 0x9f513b, roughness: 0.6 });
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.28), lipMat);
    lips.position.set(0.62, -0.23, 0);
    headGroup.add(lips);

    if (options.mustache) {
      const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 8), hairMat);
      stache.rotation.x = Math.PI / 2;
      stache.position.set(0.68, -0.15, 0);
      headGroup.add(stache);
    }

    if (options.bindi) {
      const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
      bindi.position.set(0.66, 0.24, 0);
      headGroup.add(bindi);
    }

    return headGroup;
  }

  function createRealisticDhakaRickshaw(colorHex, appearanceSeed, vData) {
    const group = new THREE.Group();

    // High quality standard materials
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35, metalness: 0.85 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.95 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.7 });
    const woodFloorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const tealCarriageMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.38, metalness: 0.15 });
    const seatRedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.50 });
    const leatherSeatMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.45 });

    const pullerSkinMat = new THREE.MeshStandardMaterial({ color: 0x9a5c40, roughness: 0.62, metalness: 0.04 });
    const maleSkinMat = new THREE.MeshStandardMaterial({ color: 0xa4684d, roughness: 0.62, metalness: 0.04 });
    const femaleSkinMat = new THREE.MeshStandardMaterial({ color: 0xad7258, roughness: 0.58, metalness: 0.04 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.85 });

    const plumShirtMat = new THREE.MeshStandardMaterial({ color: 0x4a2157, roughness: 0.75 });
    const maleShirtMat = new THREE.MeshStandardMaterial({ color: 0x674786, roughness: 0.70 });
    const malePantMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.72 });
    const femaleSareeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65, side: THREE.DoubleSide });
    const femaleSkirtMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.60 });
    const brownSandalMat = new THREE.MeshStandardMaterial({ color: 0x45220c, roughness: 0.85 });
    const pinkSandalMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.75 });
    const bindiMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
    const femaleLipMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 });

    const hoodArtMat = new THREE.MeshStandardMaterial({
      map: getRickshawArtTexture(),
      roughness: 0.42,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    const lungiMat = new THREE.MeshStandardMaterial({
      map: getLungiTexture(),
      roughness: 0.75,
      side: THREE.DoubleSide
    });

    function createSplineTube(pts, r, mat, segs = 16, radSegs = 8) {
      const vPts = pts.map(p => Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p);
      const curve = new THREE.CatmullRomCurve3(vPts);
      const geo = new THREE.TubeGeometry(curve, segs, r, radSegs, false);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      return mesh;
    }

    function createBone(pA, pB, rA, rB, mat) {
      const vA = new THREE.Vector3(pA[0], pA[1], pA[2]);
      const vB = new THREE.Vector3(pB[0], pB[1], pB[2]);
      const dist = vA.distanceTo(vB);
      if (dist < 0.001) return new THREE.Group();
      const g = new THREE.Group();
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(rB, rA, dist, 12), mat);
      cyl.position.set(0, dist / 2, 0);
      cyl.castShadow = true;
      g.add(cyl);
      const dir = new THREE.Vector3().subVectors(vB, vA).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      g.position.copy(vA);
      g.quaternion.copy(quat);
      return g;
    }

    function createLoftedOrganMesh(stations, radSegs = 20, mat) {
      const numStations = stations.length;
      const pos = [];
      const uvs = [];
      const indices = [];

      for (let s = 0; s < numStations; s++) {
        const st = stations[s];
        const u = s / (numStations - 1);
        for (let j = 0; j <= radSegs; j++) {
          const theta = (j / radSegs) * Math.PI * 2;
          const x = st.center[0] + Math.cos(theta) * st.rx;
          const y = st.center[1];
          const z = st.center[2] + Math.sin(theta) * st.rz;
          pos.push(x, y, z);
          uvs.push(j / radSegs, u);
        }
      }

      for (let s = 0; s < numStations - 1; s++) {
        for (let j = 0; j < radSegs; j++) {
          const a = s * (radSegs + 1) + j;
          const b = (s + 1) * (radSegs + 1) + j;
          const c = (s + 1) * (radSegs + 1) + j + 1;
          const d = s * (radSegs + 1) + j + 1;
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      return mesh;
    }

    // -------------------------------------------------------------------------
    // 1. CHASSIS & WHEELS
    // -------------------------------------------------------------------------
    const wheelRadius = 2.80;
    const tireTubeR = 0.16;
    const wheelZ = 3.25;

    function buildThinBicycleWheel(radius) {
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, tireTubeR, 12, 36), rubberMat);
      tire.castShadow = true;
      wheel.add(tire);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - tireTubeR * 0.75, tireTubeR * 0.70, 8, 36), chromeMat);
      wheel.add(rim);

      // Clean circular hub centered at (0, 0, 0)
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), chromeMat);
      hub.scale.set(1.0, 1.0, 1.35);
      hub.castShadow = true;
      wheel.add(hub);

      const spokeCount = 28;
      const spokeGeo = new THREE.CylinderGeometry(0.022, 0.022, radius * 1.95, 4);
      for (let i = 0; i < spokeCount; i++) {
        const spoke = new THREE.Mesh(spokeGeo, chromeMat);
        const ang = (i * Math.PI) / (spokeCount / 2);
        spoke.rotation.z = ang;
        wheel.add(spoke);
      }
      return wheel;
    }

    const frontAxleX = 6.40;
    const rearAxleX = -5.50;

    const frontWheel = buildThinBicycleWheel(wheelRadius);
    frontWheel.position.set(frontAxleX, wheelRadius, 0);
    group.add(frontWheel);

    const rearWheelL = buildThinBicycleWheel(wheelRadius);
    rearWheelL.position.set(rearAxleX, wheelRadius, -wheelZ);
    group.add(rearWheelL);

    const rearWheelR = buildThinBicycleWheel(wheelRadius);
    rearWheelR.position.set(rearAxleX, wheelRadius, wheelZ);
    group.add(rearWheelR);

    group.userData.wheels = [frontWheel, rearWheelL, rearWheelR];
    group.userData.wheelRadius = wheelRadius;

    // Fenders
    // Front mudguard: attaches at fork crown, sweeping over top crest down the rear side facing the frame
    const fFenderGeo = new THREE.TorusGeometry(wheelRadius + 0.16, 0.18, 8, 28, Math.PI * 0.75);
    const fFender = new THREE.Mesh(fFenderGeo, frameMat);
    fFender.rotation.z = Math.PI * 0.38;
    fFender.position.set(frontAxleX, wheelRadius, 0);
    group.add(fFender);

    // Rear mudguards: top-center upper arch centered at 12 o'clock, shielding upper hemisphere of tires
    [-wheelZ, wheelZ].forEach(z => {
      const rFenderGeo = new THREE.TorusGeometry(wheelRadius + 0.18, 0.18, 8, 28, Math.PI * 0.85);
      const rFender = new THREE.Mesh(rFenderGeo, goldTrimMat);
      rFender.rotation.z = Math.PI * 0.075;
      rFender.position.set(rearAxleX, wheelRadius, z);
      group.add(rFender);
    });

    // -------------------------------------------------------------------------
    // 2. BICYCLE FRAME (PASSES STRICTLY BELOW CROTCH - ZERO CLIPPING!)
    // -------------------------------------------------------------------------
    const bb = [0.60, 2.45, 0];
    const seatPostTop = [-0.50, 5.75, 0];
    const seatTubeMid = [-0.50, 4.20, 0];
    const headTubeBottom = [4.10, 5.60, 0];
    const headTubeTop = [3.90, 6.65, 0];

    group.add(createBone(bb, seatPostTop, 0.22, 0.20, frameMat));
    group.add(createBone(seatTubeMid, [headTubeBottom[0], headTubeBottom[1] - 0.2, 0], 0.20, 0.20, frameMat));
    group.add(createBone(bb, headTubeBottom, 0.22, 0.20, frameMat));
    group.add(createBone(headTubeBottom, headTubeTop, 0.25, 0.25, frameMat));

    group.add(createBone([frontAxleX, wheelRadius, 0], headTubeBottom, 0.22, 0.20, frameMat));
    group.add(createBone(headTubeTop, [3.70, 7.15, 0], 0.18, 0.18, chromeMat));

    const hbarPts = [
      new THREE.Vector3(2.95, 6.95, -1.45),
      new THREE.Vector3(3.40, 7.10, -1.05),
      new THREE.Vector3(3.70, 7.15, 0),
      new THREE.Vector3(3.40, 7.10, 1.05),
      new THREE.Vector3(2.95, 6.95, 1.45)
    ];
    group.add(createSplineTube(hbarPts, 0.12, chromeMat, 20, 8));

    [-1.45, 1.45].forEach(gz => {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.85, 10), rubberMat);
      grip.rotation.x = Math.PI / 2;
      grip.position.set(2.95, 6.95, gz);
      group.add(grip);
    });

    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), goldTrimMat);
    bell.position.set(3.45, 7.35, 0.85);
    group.add(bell);

    [-2.8, 2.8].forEach(z => {
      group.add(createBone(bb, [rearAxleX, wheelRadius, z], 0.18, 0.18, frameMat));
      group.add(createBone([-0.50, 4.60, 0], [rearAxleX, wheelRadius, z], 0.16, 0.16, frameMat));
    });
    group.add(createBone([rearAxleX, wheelRadius, -wheelZ], [rearAxleX, wheelRadius, wheelZ], 0.26, 0.26, frameMat));

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.35, 1.30), rubberMat);
    saddle.position.set(-0.50, 5.85, 0);
    group.add(saddle);

    // -------------------------------------------------------------------------
    // 3. CARRIAGE TUB & FOLDING HOOD
    // -------------------------------------------------------------------------
    const carriageWidth = 6.00;
    const carriageWallZ = 3.00;

    [-1, 1].forEach(side => {
      const sideShape = new THREE.Shape();
      sideShape.moveTo(-7.40, 3.60);
      sideShape.lineTo(-1.60, 3.60);
      sideShape.lineTo(-1.60, 5.10);
      sideShape.lineTo(-3.60, 6.10);
      sideShape.lineTo(-7.40, 6.10);
      sideShape.closePath();

      const sideGeo = new THREE.ExtrudeGeometry(sideShape, {
        depth: 0.26,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.08
      });
      sideGeo.translate(0, 0, side === 1 ? (carriageWallZ - 0.13) : -(carriageWallZ + 0.13));
      const sideWall = new THREE.Mesh(sideGeo, tealCarriageMat);
      sideWall.castShadow = true;
      group.add(sideWall);

      const armPts = [
        new THREE.Vector3(-7.30, 6.25, side * carriageWallZ),
        new THREE.Vector3(-4.80, 7.00, side * carriageWallZ),
        new THREE.Vector3(-2.00, 5.50, side * carriageWallZ)
      ];
      group.add(createSplineTube(armPts, 0.14, woodFloorMat, 16, 8));
    });

    const footboard = new THREE.Mesh(new THREE.BoxGeometry(3.20, 0.32, carriageWidth - 0.2), woodFloorMat);
    footboard.position.set(-2.60, 3.65, 0);
    footboard.castShadow = true;
    group.add(footboard);

    const benchPad = new THREE.Mesh(new THREE.BoxGeometry(3.20, 0.55, carriageWidth - 0.2), leatherSeatMat);
    benchPad.position.set(-5.60, 4.80, 0);
    benchPad.castShadow = true;
    group.add(benchPad);

    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.40, carriageWidth - 0.2), seatRedMat);
    backrest.position.set(-6.90, 6.50, 0);
    backrest.castShadow = true;
    group.add(backrest);

    const backArtPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.20, carriageWidth + 0.1), hoodArtMat);
    backArtPlate.position.set(-7.40, 6.10, 0);
    backArtPlate.castShadow = true;
    group.add(backArtPlate);

    const canopyCenterX = -5.00;
    const canopyBaseY = 8.00;
    const canopyRx = 3.20;
    const canopyRy = 3.20;
    const canopyHalfW = 3.15;

    const segs = 20;
    const posArr = [];
    const uvArr = [];
    const idxArr = [];
    const startAng = Math.PI * 0.12;
    const endAng = Math.PI * 0.94;
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const ang = startAng + (endAng - startAng) * u;
      const x = canopyCenterX + Math.cos(ang) * canopyRx;
      const y = canopyBaseY + Math.sin(ang) * canopyRy;
      posArr.push(x, y, -canopyHalfW);
      posArr.push(x, y, canopyHalfW);
      uvArr.push(u, 0);
      uvArr.push(u, 1);
      if (s < segs) {
        const v = s * 2;
        idxArr.push(v, v + 1, v + 2);
        idxArr.push(v + 1, v + 3, v + 2);
      }
    }
    const canopyGeo = new THREE.BufferGeometry();
    canopyGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    canopyGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    canopyGeo.setIndex(idxArr);
    canopyGeo.computeVertexNormals();

    const canopyMesh = new THREE.Mesh(canopyGeo, hoodArtMat);
    canopyMesh.castShadow = true;
    group.add(canopyMesh);

    [-1, 1].forEach(side => {
      const sz = side * (canopyHalfW - 0.08);
      const hingePt = [-6.80, 6.40, side * carriageWallZ];
      const rib1 = [-6.50, canopyBaseY + canopyRy * 0.65, sz];
      const rib2 = [canopyCenterX, canopyBaseY + canopyRy, sz];
      const rib3 = [canopyCenterX + Math.cos(startAng) * canopyRx, canopyBaseY + Math.sin(startAng) * canopyRy, sz];

      const hingeBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.32, 10), chromeMat);
      hingeBracket.rotation.x = Math.PI / 2;
      hingeBracket.position.set(hingePt[0], hingePt[1], hingePt[2]);
      group.add(hingeBracket);

      group.add(createSplineTube([hingePt, rib1], 0.07, chromeMat, 8, 6));
      group.add(createSplineTube([hingePt, rib2], 0.07, chromeMat, 8, 6));
      group.add(createSplineTube([hingePt, rib3], 0.07, chromeMat, 8, 6));
    });

    const frontRimX = canopyCenterX + Math.cos(startAng) * canopyRx;
    const frontRimY = canopyBaseY + Math.sin(startAng) * canopyRy;
    group.add(createBone([frontRimX, frontRimY, -canopyHalfW], [frontRimX, frontRimY, canopyHalfW], 0.10, 0.10, goldTrimMat));

    // Smooth decorative golden bead trim along front canopy rim (authentic, no downward spikes)
    const tasselCount = 15;
    for (let t = 0; t < tasselCount; t++) {
      const tz = -canopyHalfW + 0.20 + (t * (canopyHalfW * 2 - 0.40) / (tasselCount - 1));
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), goldTrimMat);
      bead.position.set(frontRimX, frontRimY - 0.05, tz);
      group.add(bead);
    }

    // -------------------------------------------------------------------------
    // 4. NATURAL HUMAN HEAD CREATOR
    // -------------------------------------------------------------------------
    function buildRealisticAdultHead(skinMat, isFemale, mustache) {
      const headGroup = new THREE.Group();

      const craniumGeo = new THREE.SphereGeometry(0.56, 24, 20);
      craniumGeo.scale(0.85, 1.08, 0.90);
      const cranium = new THREE.Mesh(craniumGeo, skinMat);
      cranium.castShadow = true;
      headGroup.add(cranium);

      const hairGeo = new THREE.SphereGeometry(0.58, 24, 20);
      hairGeo.scale(0.87, 1.10, 0.92);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(-0.06, 0.06, 0);
      headGroup.add(hair);

      [-0.50, 0.50].forEach(ez => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
        ear.scale.set(0.35, 0.75, 0.45);
        ear.position.set(-0.02, -0.04, ez);
        headGroup.add(ear);
      });

      const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.26, 8), skinMat);
      noseBridge.rotation.z = -Math.PI / 2 + 0.18;
      noseBridge.position.set(0.50, 0.02, 0);
      headGroup.add(noseBridge);

      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.050, 8, 8), skinMat);
      noseTip.position.set(0.56, -0.04, 0);
      headGroup.add(noseTip);

      [-0.07, 0.07].forEach(nz => {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 6), skinMat);
        nostril.position.set(0.52, -0.06, nz);
        headGroup.add(nostril);
      });

      [-0.20, 0.20].forEach(ez => {
        // Expressive white sclera
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        eyeWhite.scale.set(0.65, 0.85, 1.30);
        eyeWhite.position.set(0.48, 0.08, ez);
        headGroup.add(eyeWhite);

        // Dark pupil & lash contour
        const eyeLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.09), hairMat);
        eyeLine.position.set(0.50, 0.08, ez);
        headGroup.add(eyeLine);

        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.038, 0.17), hairMat);
        brow.position.set(0.46, 0.18, ez);
        brow.rotation.z = -0.15;
        headGroup.add(brow);
      });

      const lipMat = isFemale ? femaleLipMat : new THREE.MeshStandardMaterial({ color: 0x8a4734, roughness: 0.6 });
      const lips = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.046, 0.17), lipMat);
      lips.position.set(0.50, -0.18, 0);
      headGroup.add(lips);

      if (mustache) {
        const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.40, 8), hairMat);
        stache.rotation.x = Math.PI / 2;
        stache.position.set(0.53, -0.11, 0);
        headGroup.add(stache);
      }

      if (isFemale) {
        const bindi = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), bindiMat);
        bindi.rotation.z = Math.PI / 2;
        bindi.position.set(0.53, 0.15, 0);
        headGroup.add(bindi);

        const khopa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), hairMat);
        khopa.scale.set(0.8, 1.0, 1.1);
        khopa.position.set(-0.52, -0.12, 0);
        headGroup.add(khopa);
      }

      // Proportional adult scale matching authentic reference illustration
      headGroup.scale.setScalar(1.25);

      return headGroup;
    }

    // -------------------------------------------------------------------------
    // 5. RICKSHAW PULLER (LEAN ATHLETIC BUILD, SEAMLESS LUNGI)
    // -------------------------------------------------------------------------
    const pullerGroup = new THREE.Group();

    const crankR = 1.05;
    const crankGroup = new THREE.Group();
    crankGroup.position.set(bb[0], bb[1], bb[2]);

    // Bottom bracket axle spanning through frame center between left and right crank arms
    const crankAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.85, 12), chromeMat);
    crankAxle.rotation.x = Math.PI / 2;
    crankAxle.position.set(0, 0, 0);
    crankGroup.add(crankAxle);

    // Task 1: Black round chainring disc centered strictly on the bicycle frame plane (Z = 0)
    // Thin axial thickness (0.07) so outer faces sit at Z = ±0.035, cleanly between both legs!
    const blackChainringMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.45,
      metalness: 0.70
    });
    const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.07, 24), blackChainringMat);
    chainring.rotation.x = Math.PI / 2;
    chainring.position.set(0, 0, 0); // Strict Z = 0 frame center plane
    crankGroup.add(chainring);

    // Polished central chainring hub collar on the center plane
    const chainringHub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.11, 16), chromeMat);
    chainringHub.rotation.x = Math.PI / 2;
    chainringHub.position.set(0, 0, 0);
    crankGroup.add(chainringHub);

    // Left crank arm at Z = -0.85
    const crankArmL = new THREE.Mesh(new THREE.BoxGeometry(0.22, crankR, 0.12), chromeMat);
    crankArmL.position.set(0, crankR / 2, -0.85);
    crankGroup.add(crankArmL);

    // Left pedal assembly at Z = -0.85 with inward horizontal spindle pin
    const pedalLGroup = new THREE.Group();
    pedalLGroup.position.set(0, crankR, -0.85);
    const pedalLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.45), rubberMat);
    pedalLMesh.castShadow = true;
    pedalLGroup.add(pedalLMesh);

    const spindleL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 8), chromeMat);
    spindleL.rotation.x = Math.PI / 2;
    spindleL.position.set(0, 0, 0.12);
    pedalLGroup.add(spindleL);
    crankGroup.add(pedalLGroup);

    // Right crank arm at Z = +0.85 (symmetrically outside the black disc face at Z = +0.035)
    const crankArmR = new THREE.Mesh(new THREE.BoxGeometry(0.22, crankR, 0.12), chromeMat);
    crankArmR.position.set(0, -crankR / 2, 0.85);
    crankGroup.add(crankArmR);

    // Right pedal assembly at Z = +0.85 with inward horizontal spindle pin
    const pedalRGroup = new THREE.Group();
    pedalRGroup.position.set(0, -crankR, 0.85);
    const pedalRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.45), rubberMat);
    pedalRMesh.castShadow = true;
    pedalRGroup.add(pedalRMesh);

    const spindleR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 8), chromeMat);
    spindleR.rotation.x = Math.PI / 2;
    spindleR.position.set(0, 0, -0.12);
    pedalRGroup.add(spindleR);
    crankGroup.add(pedalRGroup);

    group.add(crankGroup);
    group.userData.pedalCrank = crankGroup;

    // LOFTED ATHLETIC TORSO IN PLUM SHIRT (#4a2157)
    // Untucked flared hem extending down to Y=5.92 naturally overlaps the lungi waist
    const pullerTorsoStations = [
      { center: [-0.45, 5.92, 0], rx: 0.95, rz: 1.20 }, // untucked flared hem covering pelvis
      { center: [-0.40, 6.30, 0], rx: 0.82, rz: 1.08 },
      { center: [-0.28, 6.85, 0], rx: 0.75, rz: 0.95 },
      { center: [-0.05, 7.50, 0], rx: 0.88, rz: 1.15 },
      { center: [0.25, 8.15, 0],  rx: 0.95, rz: 1.30 },
      { center: [0.55, 8.65, 0],  rx: 0.70, rz: 1.38 }
    ];
    pullerGroup.add(createLoftedOrganMesh(pullerTorsoStations, 20, plumShirtMat));

    // Solid smooth upper-chest / clavicle bridge spanning across shoulders (Z: -1.15 to +1.15)
    const clavicleBridge = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 20, 16),
      plumShirtMat
    );
    clavicleBridge.scale.set(0.66, 0.46, 1.62);
    clavicleBridge.position.set(0.48, 8.62, 0);
    clavicleBridge.rotation.z = -0.32;
    pullerGroup.add(clavicleBridge);

    // Single centered continuous neck column (Z = 0 strictly on symmetry plane)
    const neckAngle = 0.44; // ~25° forward lean
    const pullerNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 1.05, 16),
      pullerSkinMat
    );
    pullerNeck.position.set(0.70, 9.05, 0);
    pullerNeck.rotation.z = -neckAngle;
    pullerGroup.add(pullerNeck);

    // Horizontal collar wrapping around the base of the centered neck cylinder
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.08, 10, 24), plumShirtMat);
    collar.position.set(0.56, 8.76, 0);
    const neckDir = new THREE.Vector3(Math.sin(neckAngle), Math.cos(neckAngle), 0).normalize();
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), neckDir);
    pullerGroup.add(collar);

    const pullerHead = buildRealisticAdultHead(pullerSkinMat, false, true);
    pullerHead.position.set(0.95, 9.60, 0);
    pullerGroup.add(pullerHead);

    [-1, 1].forEach(side => {
      const shoulderPt = [0.45, 8.55, side * 1.15];
      const sleeveEnd = [0.95, 8.05, side * 1.32];
      const elbowPt = [1.70, 7.30, side * 1.55];
      const wristPt = [2.75, 7.02, side * 1.48];
      const gripPt = [2.95, 6.95, side * 1.45];

      // Rounded deltoid shoulder cap sealing sleeve junction
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), plumShirtMat);
      shoulderCap.position.set(shoulderPt[0], shoulderPt[1], shoulderPt[2]);
      pullerGroup.add(shoulderCap);

      pullerGroup.add(createSplineTube([shoulderPt, sleeveEnd], 0.32, plumShirtMat, 8, 8));
      pullerGroup.add(createSplineTube([sleeveEnd, elbowPt, wristPt, gripPt], 0.19, pullerSkinMat, 18, 8));

      // Sculpted hand gripping handlebar
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), pullerSkinMat);
      hand.scale.set(1.2, 0.8, 1.0);
      hand.position.set(2.95, 6.95, side * 1.45);
      hand.rotation.z = -0.15;
      pullerGroup.add(hand);
    });

    // LUNGI: Narrowed waist tucked inside shirt hem + sculpted glutes resting on saddle
    const lenThigh = 2.30;
    const lenShin = 2.35;
    const pullerLegs = [];

    const lungiWrapStations = [
      { center: [-0.48, 6.10, 0], rx: 0.76, rz: 0.98 },
      { center: [-0.50, 5.75, 0], rx: 0.88, rz: 1.12 },
      { center: [-0.48, 5.35, 0], rx: 0.82, rz: 1.05 }
    ];
    pullerGroup.add(createLoftedOrganMesh(lungiWrapStations, 18, lungiMat));

    // Smooth rounded glutes contour resting directly on the saddle
    const lungiSeatCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 14, 12),
      lungiMat
    );
    lungiSeatCap.scale.set(0.95, 0.65, 1.15);
    lungiSeatCap.position.set(-0.50, 5.65, 0);
    pullerGroup.add(lungiSeatCap);

    // Dynamic Pedaling Legs
    [-1, 1].forEach(side => {
      const hipX = -0.42;
      const hipY = 5.85;
      const legZ = side * 0.85;

      const hipPivot = new THREE.Group();
      hipPivot.position.set(hipX, hipY, legZ);
      pullerGroup.add(hipPivot);

      // Seamless rounded hip joint cap in lungi fabric
      const hipCap = new THREE.Mesh(new THREE.SphereGeometry(0.40, 12, 10), lungiMat);
      hipPivot.add(hipCap);

      const lungiThigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.38, lenThigh, 14),
        lungiMat
      );
      lungiThigh.position.set(0, -lenThigh / 2, 0);
      lungiThigh.castShadow = true;
      hipPivot.add(lungiThigh);

      const lungiHem = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 12, 10),
        lungiMat
      );
      lungiHem.position.set(0, -lenThigh, 0);
      hipPivot.add(lungiHem);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -lenThigh, 0);
      hipPivot.add(kneePivot);

      const calfStations = [
        { center: [0, 0, 0],           rx: 0.22, rz: 0.22 },
        { center: [0, -lenShin * 0.25, 0], rx: 0.26, rz: 0.24 },
        { center: [0, -lenShin * 0.65, 0], rx: 0.20, rz: 0.19 },
        { center: [0, -lenShin, 0],       rx: 0.16, rz: 0.16 }
      ];
      kneePivot.add(createLoftedOrganMesh(calfStations, 14, pullerSkinMat));

      const footPivot = new THREE.Group();
      footPivot.position.set(0, -lenShin, 0);
      kneePivot.add(footPivot);

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.16, 0.48), brownSandalMat);
      sandal.position.set(0.25, -0.08, 0);
      footPivot.add(sandal);

      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.52), brownSandalMat);
      strap.position.set(0.15, 0.04, 0);
      footPivot.add(strap);

      pullerLegs.push({
        side: side,
        hipX: hipX,
        hipY: hipY,
        hipPivot: hipPivot,
        kneePivot: kneePivot,
        footPivot: footPivot
      });
    });

    function updatePullerPedaling(phase) {
      if (crankGroup) {
        crankGroup.rotation.z = phase;
        pedalLGroup.rotation.z = -phase;
        pedalRGroup.rotation.z = -phase;
      }

      pullerLegs.forEach(leg => {
        const legAngle = leg.side === -1 ? phase : phase + Math.PI;
        const pedalX = bb[0] - Math.sin(legAngle) * crankR;
        const pedalY = bb[1] + Math.cos(legAngle) * crankR;

        const dx = pedalX - leg.hipX;
        const dy = pedalY - leg.hipY;
        const dist = Math.min(lenThigh + lenShin - 0.02, Math.max(0.5, Math.sqrt(dx * dx + dy * dy)));

        const baseAngle = Math.atan2(dy, dx);
        const cosAlpha = (lenThigh * lenThigh + dist * dist - lenShin * lenShin) / (2 * lenThigh * dist);
        const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

        const thighAngle = baseAngle + alpha;
        const kneeX = leg.hipX + lenThigh * Math.cos(thighAngle);
        const kneeY = leg.hipY + lenThigh * Math.sin(thighAngle);
        const shinAngle = Math.atan2(pedalY - kneeY, pedalX - kneeX);

        leg.hipPivot.rotation.set(0, 0, thighAngle - (-Math.PI / 2));
        leg.kneePivot.rotation.set(0, 0, shinAngle - thighAngle);
        leg.footPivot.rotation.set(0, 0, -(shinAngle - (-Math.PI / 2)));
      });
    }

    group.add(pullerGroup);
    group.userData.updatePedaling = updatePullerPedaling;
    updatePullerPedaling(0);

    // -------------------------------------------------------------------------
    // 6. SEATED PASSENGERS (AUTHENTIC TO 2D VECTOR ART)
    // -------------------------------------------------------------------------
    const passHipX = -5.80;
    const passHipY = 5.25;
    const mZ = -1.30;
    const fZ = 1.30;

    // --- 6.1 MALE PASSENGER (Z = -1.30, Violet Shirt & Blue Pants) ---
    const maleGroup = new THREE.Group();
    maleGroup.position.set(passHipX, passHipY, mZ);

    const mTorsoStations = [
      { center: [0.0, 0.0, 0],  rx: 0.75, rz: 0.95 },
      { center: [0.05, 0.8, 0], rx: 0.80, rz: 1.05 },
      { center: [0.10, 1.8, 0], rx: 0.88, rz: 1.15 },
      { center: [0.12, 2.5, 0], rx: 0.65, rz: 1.25 }
    ];
    maleGroup.add(createLoftedOrganMesh(mTorsoStations, 18, maleShirtMat));

    // Collar seated flush against top of shirt at Y=2.50
    const mCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.22, 14), maleShirtMat);
    mCollar.position.set(0.12, 2.52, 0);
    maleGroup.add(mCollar);

    // Sunk neck cylinder deep into chest station at Y=2.50
    const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 12), maleSkinMat);
    mNeck.position.set(0.12, 2.70, 0);
    maleGroup.add(mNeck);

    const mHead = buildRealisticAdultHead(maleSkinMat, false, true);
    mHead.position.set(0.15, 3.55, 0);
    maleGroup.add(mHead);

    [-0.52, 0.52].forEach(tz => {
      const legPts = [
        [-0.10, 0.0, tz],
        [1.20, 0.05, tz],
        [2.50, 0.0, tz],
        [2.65, -0.75, tz],
        [2.70, -1.55, tz]
      ];
      maleGroup.add(createSplineTube(legPts, 0.30, malePantMat, 20, 8));

      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.50), brownSandalMat);
      sandal.position.set(2.85, -1.58, tz);
      maleGroup.add(sandal);
    });

    [-0.80, 0.80].forEach(az => {
      // Deltoid shoulder cap
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), maleShirtMat);
      shoulderCap.position.set(0.10, 2.30, az);
      maleGroup.add(shoulderCap);

      const armPts = [
        [0.10, 2.30, az],
        [0.85, 1.25, az * 0.95],
        [1.85, 0.50, az * 0.68],
        [2.45, 0.22, az * 0.65]
      ];
      maleGroup.add(createSplineTube(armPts, 0.17, maleSkinMat, 18, 8));

      const sleevePts = [[0.10, 2.30, az], [0.55, 1.80, az * 0.98]];
      maleGroup.add(createSplineTube(sleevePts, 0.26, maleShirtMat, 8, 8));

      // Sculpted hand resting flat on knee
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), maleSkinMat);
      hand.scale.set(1.1, 0.45, 1.4);
      hand.position.set(2.45, 0.26, az * 0.65);
      maleGroup.add(hand);
    });

    group.add(maleGroup);

    // --- 6.2 FEMALE PASSENGER (Z = +1.30, Ochre Saree & Sky Blue Skirt) ---
    const femaleGroup = new THREE.Group();
    femaleGroup.position.set(passHipX, passHipY, fZ);

    const fTorsoStations = [
      { center: [0.0, 0.0, 0],  rx: 0.70, rz: 0.90 },
      { center: [0.05, 0.8, 0], rx: 0.75, rz: 0.98 },
      { center: [0.08, 1.8, 0], rx: 0.82, rz: 1.08 },
      { center: [0.10, 2.4, 0], rx: 0.60, rz: 1.15 }
    ];
    femaleGroup.add(createLoftedOrganMesh(fTorsoStations, 18, femaleSareeMat));

    // Sunk neck cylinder deep into chest station at Y=2.40
    const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.65, 12), femaleSkinMat);
    fNeck.position.set(0.10, 2.62, 0);
    femaleGroup.add(fNeck);

    const fHead = buildRealisticAdultHead(femaleSkinMat, true, false);
    fHead.position.set(0.12, 3.48, 0);
    femaleGroup.add(fHead);

    // ELEGANT SAREE VEIL (GHOMTA): Framing black hair, crown, and shoulders snugly
    const ghomtaRimPts = [
      new THREE.Vector3(-0.15, 2.40, 0.60),
      new THREE.Vector3(-0.05, 3.35, 0.52),
      new THREE.Vector3(0.12, 4.15, 0.25),
      new THREE.Vector3(0.18, 4.22, 0),
      new THREE.Vector3(0.12, 4.15, -0.25),
      new THREE.Vector3(-0.05, 3.35, -0.52),
      new THREE.Vector3(-0.15, 2.40, -0.60)
    ];
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ghomtaRimPts), 24, 0.08, 8, false),
      femaleSareeMat
    ));

    // Shifted cowl forward (+0.12) to seal snug against hair bun and crown
    const ghomtaCowlPts = [
      new THREE.Vector3(0.02, 4.10, 0),
      new THREE.Vector3(-0.23, 3.60, 0),
      new THREE.Vector3(-0.33, 2.80, 0),
      new THREE.Vector3(-0.28, 2.10, 0)
    ];
    const cowlTube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ghomtaCowlPts), 16, 0.45, 12, false),
      femaleSareeMat
    );
    cowlTube.scale.set(0.8, 1.0, 1.15);
    femaleGroup.add(cowlTube);

    const ancholChestPts = [
      new THREE.Vector3(0.55, 0.80, 0.58),
      new THREE.Vector3(0.65, 1.50, 0.18),
      new THREE.Vector3(0.32, 2.30, -0.40),
      new THREE.Vector3(-0.25, 2.20, -0.58)
    ];
    femaleGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ancholChestPts), 16, 0.18, 8, false),
      femaleSareeMat
    ));

    const sareeCurvePts = [
      [-0.10, 0.0, 0],
      [1.20, 0.05, 0],
      [2.50, 0.0, 0],
      [2.65, -0.75, 0],
      [2.70, -1.55, 0]
    ];
    const sareeSkirtTube = createSplineTube(sareeCurvePts, 0.84, femaleSkirtMat, 20, 14);
    sareeSkirtTube.scale.set(1.0, 0.70, 1.05);
    femaleGroup.add(sareeSkirtTube);

    const hemBorder = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 1.75), goldTrimMat);
    hemBorder.position.set(2.60, -1.50, 0);
    femaleGroup.add(hemBorder);

    [-0.42, 0.42].forEach(tz => {
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.15, 0.45), pinkSandalMat);
      sandal.position.set(2.75, -1.58, tz);
      femaleGroup.add(sandal);
    });

    [-0.75, 0.75].forEach(az => {
      // Deltoid saree blouse shoulder cap
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 10), femaleSareeMat);
      shoulderCap.position.set(0.10, 2.25, az);
      femaleGroup.add(shoulderCap);

      const armPts = [
        [0.10, 2.25, az],
        [0.80, 1.20, az * 0.85],
        [1.65, 0.50, az * 0.38],
        [2.20, 0.35, 0]
      ];
      femaleGroup.add(createSplineTube(armPts, 0.15, femaleSkinMat, 18, 8));

      femaleGroup.add(createSplineTube([[0.10, 2.25, az], [0.50, 1.75, az * 0.90]], 0.24, femaleSareeMat, 8, 8));

      [0xdc2626, 0xf59e0b, 0x16a34a].forEach((bColor, bIdx) => {
        const bangle = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.028, 6, 14),
          new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.25, metalness: 0.6 })
        );
        bangle.position.set(1.80 + bIdx * 0.07, 0.44, az * 0.24);
        bangle.rotation.y = Math.PI / 2;
        femaleGroup.add(bangle);
      });
    });

    // Sculpted delicate hands resting gently in lap
    const fHands = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), femaleSkinMat);
    fHands.scale.set(1.2, 0.45, 1.4);
    fHands.position.set(2.25, 0.36, 0);
    femaleGroup.add(fHands);

    group.add(femaleGroup);

    return group;
  }
    // =========================================================================
  // CACHED TEXTURES FOR AUTHENTIC BANGLADESHI CNG AUTO-RICKSHAW
  // =========================================================================
  let cachedCNGLiveryLeft = null;
  let cachedCNGLiveryRight = null;
  let cachedCNGFrontNose = null;
  let cachedCNGGarland = null;

  function getCNGLiveryTexture(isLeft) {
    if (isLeft && cachedCNGLiveryLeft) return cachedCNGLiveryLeft;
    if (!isLeft && cachedCNGLiveryRight) return cachedCNGLiveryRight;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#00a65a';
    ctx.fillRect(0, 0, 1024, 512);

    // Yellow dashed perimeter stitching
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 7;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(20, 20, 984, 472);

    // Wheel arch cutout guideline
    const archCenterX = isLeft ? 705 : 319;
    ctx.beginPath();
    ctx.arc(archCenterX, 512, 230, Math.PI, 0, false);
    ctx.stroke();

    // Slanted banners in the UPPER HALF of the panel
    ctx.save();
    const slantAngle = isLeft ? -0.04 : 0.04;
    ctx.translate(isLeft ? 480 : 544, 110);
    ctx.rotate(slantAngle);

    // Upper Banner: White strip with ★ FOR HIRE ★
    const bW = 680;
    const bH = 74;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-bW / 2, -bH / 2, bW, bH);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#dc2626';
    ctx.setLineDash([]);
    ctx.strokeRect(-bW / 2, -bH / 2, bW, bH);

    ctx.fillStyle = '#dc2626';
    ctx.font = '900 42px "Arial Black", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ FOR HIRE ★', 0, 2);

    // Lower Banner: Bright Neon-Yellow strip with ONE PARIBAHAN
    ctx.translate(0, 84);
    const b2W = 660;
    const b2H = 70;
    ctx.fillStyle = '#d4ff00';
    ctx.fillRect(-b2W / 2, -b2H / 2, b2W, b2H);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#b91c1c';
    ctx.strokeRect(-b2W / 2, -b2H / 2, b2W, b2H);

    ctx.fillStyle = '#b91c1c';
    ctx.font = '900 40px "Arial Black", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ONE PARIBAHAN', 0, 2);

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    if (isLeft) cachedCNGLiveryLeft = tex;
    else cachedCNGLiveryRight = tex;
    return tex;
  }

  function getCNGFrontNoseTexture() {
    if (cachedCNGFrontNose) return cachedCNGFrontNose;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#00a65a';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(18, 18, 476, 476);

    const bandY = 220;
    const bandH = 36;

    ctx.fillStyle = '#facc15';
    const numDots = 14;
    for (let i = 0; i < numDots; i++) {
      const dx = 45 + (i * (512 - 90) / (numDots - 1));
      ctx.beginPath();
      ctx.arc(dx, bandY - 18, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(28, bandY, 456, bandH);

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(28, bandY + bandH, 456, bandH);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(28, bandY + bandH * 2, 456, bandH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(28, bandY, 456, bandH * 3);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    cachedCNGFrontNose = tex;
    return tex;
  }

  function getCNGGarlandTexture() {
    if (cachedCNGGarland) return cachedCNGGarland;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 128);

    const scallops = 16;
    const sW = 1024 / scallops;
    for (let i = 0; i < scallops; i++) {
      const cx = i * sW + sW / 2;
      ctx.beginPath();
      ctx.arc(cx, 15, sW / 2, 0, Math.PI, false);
      ctx.fillStyle = '#ea580c';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, 15, sW / 3, 0, Math.PI, false);
      ctx.fillStyle = '#facc15';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, 42, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(2, 1);
    cachedCNGGarland = tex;
    return tex;
  }

      function createRealisticDhakaCNG(colorHex, appearanceSeed, vData) {
    function createLoftedOrganMesh(stations, radSegs = 20, mat) {
      const numStations = stations.length;
      const pos = [];
      const uvs = [];
      const indices = [];

      for (let s = 0; s < numStations; s++) {
        const st = stations[s];
        const u = s / (numStations - 1);
        for (let j = 0; j <= radSegs; j++) {
          const theta = (j / radSegs) * Math.PI * 2;
          const x = st.center[0] + Math.cos(theta) * st.rx;
          const y = st.center[1];
          const z = st.center[2] + Math.sin(theta) * st.rz;
          pos.push(x, y, z);
          uvs.push(j / radSegs, u);
        }
      }

      for (let s = 0; s < numStations - 1; s++) {
        for (let j = 0; j < radSegs; j++) {
          const a = s * (radSegs + 1) + j;
          const b = (s + 1) * (radSegs + 1) + j;
          const c = (s + 1) * (radSegs + 1) + j + 1;
          const d = s * (radSegs + 1) + j + 1;
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, mat);
    }

    function createContinuousSplineLimb(pts, radii, material, tubSteps = 16, radSteps = 10) {
      const curvePts = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(curvePts);
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const normals = [];
      const uvs = [];
      const indices = [];

      const frames = curve.computeFrenetFrames(tubSteps, false);

      for (let i = 0; i <= tubSteps; i++) {
        const u = i / tubSteps;
        const pt = curve.getPoint(u);
        const N = frames.normals[i];
        const B = frames.binormals[i];

        const segIdx = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
        const segFrac = (u * (pts.length - 1)) - segIdx;
        const r0 = Array.isArray(radii) ? radii[segIdx] : radii;
        const r1 = Array.isArray(radii) ? radii[segIdx + 1] : radii;
        const r = r0 + (r1 - r0) * segFrac;

        for (let j = 0; j <= radSteps; j++) {
          const v = j / radSteps;
          const theta = v * Math.PI * 2;
          const sin = Math.sin(theta);
          const cos = -Math.cos(theta);

          const normal = new THREE.Vector3()
            .addScaledVector(N, cos)
            .addScaledVector(B, sin)
            .normalize();

          const vertex = new THREE.Vector3().copy(pt).addScaledVector(normal, r);

          positions.push(vertex.x, vertex.y, vertex.z);
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(u, v);
        }
      }

      for (let i = 0; i < tubSteps; i++) {
        for (let j = 0; j < radSteps; j++) {
          const a = i * (radSteps + 1) + j;
          const b = (i + 1) * (radSteps + 1) + j;
          const c = (i + 1) * (radSteps + 1) + (j + 1);
          const d = i * (radSteps + 1) + (j + 1);
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      return mesh;
    }

    function buildRealisticAdultHead(skinMat, hairMat, isFemale, mustache, options = {}) {
      const headGroup = new THREE.Group();

      const craniumGeo = new THREE.SphereGeometry(0.56, 20, 18);
      craniumGeo.scale(0.85, 1.08, 0.90);
      const cranium = new THREE.Mesh(craniumGeo, skinMat);
      cranium.castShadow = true;
      headGroup.add(cranium);

      // Varied hairstyle for passenger vs driver
      const hairGeo = new THREE.SphereGeometry(0.58, 20, 18);
      if (options.isYounger) {
        hairGeo.scale(0.88, 1.12, 0.92);
      } else {
        hairGeo.scale(0.87, 1.10, 0.92);
      }
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(-0.06, 0.06, 0);
      headGroup.add(hair);

      [-0.50, 0.50].forEach(ez => {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skinMat);
        ear.scale.set(0.35, 0.75, 0.45);
        ear.position.set(-0.02, -0.04, ez);
        headGroup.add(ear);
      });

      const noseBridge = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.26, 8), skinMat);
      noseBridge.rotation.z = -Math.PI / 2 + 0.18;
      noseBridge.position.set(0.50, 0.02, 0);
      headGroup.add(noseBridge);

      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.050, 8, 8), skinMat);
      noseTip.position.set(0.56, -0.04, 0);
      headGroup.add(noseTip);

      [-0.07, 0.07].forEach(nz => {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 6), skinMat);
        nostril.position.set(0.52, -0.06, nz);
        headGroup.add(nostril);
      });

      [-0.20, 0.20].forEach(ez => {
        const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        eyeWhite.scale.set(0.65, 0.85, 1.30);
        eyeWhite.position.set(0.48, 0.08, ez);
        headGroup.add(eyeWhite);

        const eyeLine = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.09), hairMat);
        eyeLine.position.set(0.50, 0.08, ez);
        headGroup.add(eyeLine);

        const browAngle = options.isYounger ? -0.05 : -0.15;
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.038, 0.17), hairMat);
        brow.position.set(0.46, 0.18, ez);
        brow.rotation.z = browAngle;
        headGroup.add(brow);
      });

      const lipsMat = isFemale ? new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 }) : new THREE.MeshStandardMaterial({ color: 0x8a4734, roughness: 0.6 });
      const lips = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.046, 0.17), lipsMat);
      lips.position.set(0.50, -0.18, 0);
      headGroup.add(lips);

      // Mustache ONLY added when explicitly true (Driver has it; Male Passenger DOES NOT)
      if (mustache) {
        const stache = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.40, 8), hairMat);
        stache.rotation.x = Math.PI / 2;
        stache.position.set(0.53, -0.11, 0);
        headGroup.add(stache);
      }

      if (isFemale) {
        const bindi = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 }));
        bindi.rotation.z = Math.PI / 2;
        bindi.position.set(0.53, 0.15, 0);
        headGroup.add(bindi);

        const khopa = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), hairMat);
        khopa.scale.set(0.8, 1.0, 1.1);
        khopa.position.set(-0.52, -0.12, 0);
        headGroup.add(khopa);
      }

      headGroup.scale.setScalar(1.25);
      return headGroup;
    }

    const root = new THREE.Group();
    root.userData.wheels = [];

    // Inner child wrapper holding the complete 3D CNG + Occupants Package
    // Scaled up by 1.14x (cumulative +14% increase) to match human and traffic proportions
    const cngPackage = new THREE.Group();
    cngPackage.userData.wheels = [];
    const cngGroup = cngPackage;

      // Authentic Materials
      const cngGreenMat = new THREE.MeshStandardMaterial({
        color: 0x00a65a, // Dhaka Emerald Green
        roughness: 0.30,
        metalness: 0.25,
        side: THREE.DoubleSide
      });

      const chassisMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.85,
        metalness: 0.45
      });

      const darkMaskMat = new THREE.MeshStandardMaterial({
        color: 0x22252a, // Signature dark charcoal front fascia bezel
        roughness: 0.40,
        metalness: 0.35
      });

      const canvasSoftTopMat = new THREE.MeshStandardMaterial({
        color: 0x1d3549, // Dhaka slate-blue canvas
        roughness: 0.85,
        metalness: 0.06,
        side: THREE.DoubleSide
      });

      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.14,
        metalness: 0.94
      });

      const rubberTireMat = new THREE.MeshStandardMaterial({
        color: 0x222124,
        roughness: 0.90
      });

      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.35,
        metalness: 0.70
      });

      const yellowStitchMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.30,
        metalness: 0.10
      });

      const indicatorMat = new THREE.MeshStandardMaterial({
        color: 0xd63031, // Red-orange turn indicator
        emissive: 0xb91c1c,
        emissiveIntensity: 0.70,
        roughness: 0.25
      });

      const headlightGlowMat = new THREE.MeshStandardMaterial({
        color: 0xfffdf0,
        emissive: 0xffdf80,
        emissiveIntensity: 0.92,
        roughness: 0.12
      });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xecfdf5,
        transparent: true,
        opacity: 0.42,
        roughness: 0.06,
        transmission: 0.88,
        ior: 1.52,
        reflectivity: 0.65,
        side: THREE.DoubleSide
      });

      const garlandMat = new THREE.MeshStandardMaterial({
        map: getCNGGarlandTexture(),
        transparent: true,
        roughness: 0.40,
        side: THREE.DoubleSide
      });

      const leftLiveryMat = new THREE.MeshStandardMaterial({
        map: getCNGLiveryTexture(true),
        roughness: 0.35,
        metalness: 0.18,
        side: THREE.DoubleSide
      });

      const rightLiveryMat = new THREE.MeshStandardMaterial({
        map: getCNGLiveryTexture(false),
        roughness: 0.35,
        metalness: 0.18,
        side: THREE.DoubleSide
      });

      const frontNoseMat = new THREE.MeshStandardMaterial({
        map: getCNGFrontNoseTexture(),
        roughness: 0.35,
        metalness: 0.18,
        side: THREE.DoubleSide
      });

      // -----------------------------------------------------------------------
      // 1. COMPACT PROPORTIONS & THREE WHEELS (1 Front + 2 Rear)
      // -----------------------------------------------------------------------
      const wheelRadius = 1.85;
      cngGroup.userData.wheelRadius = wheelRadius;
      const frontAxleX = 4.60;
      const rearAxleX = -3.80;
      const rearTrackHalfW = 3.90;

      function buildCNGWheel(pos, isFront = false) {
        const w = new THREE.Group();
        w.position.set(pos[0], pos[1], pos[2]);

        const tire = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius - 0.48, 0.48, 12, 28), rubberTireMat);
        tire.castShadow = true;
        w.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.80, 18), rimMat);
        rim.rotation.x = Math.PI / 2;
        w.add(rim);

        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.88, 14), chassisMat);
        hub.rotation.x = Math.PI / 2;
        w.add(hub);

        const numStuds = 5;
        for (let i = 0; i < numStuds; i++) {
          const angle = (i * Math.PI * 2) / numStuds;
          const studR = 0.90;
          const studL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), yellowStitchMat);
          studL.position.set(Math.cos(angle) * studR, Math.sin(angle) * studR, 0.42);
          w.add(studL);

          const studRMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), yellowStitchMat);
          studRMesh.position.set(Math.cos(angle) * studR, Math.sin(angle) * studR, -0.42);
          w.add(studRMesh);
        }

        cngGroup.userData.wheels.push(w);
        return w;
      }

      const frontWheel = buildCNGWheel([frontAxleX, wheelRadius, 0], true);
      cngGroup.add(frontWheel);

      const rearWheelL = buildCNGWheel([rearAxleX, wheelRadius, -rearTrackHalfW]);
      cngGroup.add(rearWheelL);

      const rearWheelR = buildCNGWheel([rearAxleX, wheelRadius, rearTrackHalfW]);
      cngGroup.add(rearWheelR);

      // -----------------------------------------------------------------------
      // 2. LOWER CHASSIS & FLOORBOARD
      // -----------------------------------------------------------------------
      const floorPan = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.32, 7.8), chassisMat);
      floorPan.position.set(-1.7, 1.45, 0);
      cngGroup.add(floorPan);

      const frontFloorShape = new THREE.Shape();
      frontFloorShape.moveTo(3.4, -3.8);
      frontFloorShape.lineTo(5.2, -1.8);
      frontFloorShape.lineTo(5.2, 1.8);
      frontFloorShape.lineTo(3.4, 3.8);
      frontFloorShape.closePath();
      const frontFloorGeo = new THREE.ExtrudeGeometry(frontFloorShape, { depth: 0.32, bevelEnabled: false });
      const frontFloorMesh = new THREE.Mesh(frontFloorGeo, chassisMat);
      frontFloorMesh.rotation.x = Math.PI / 2;
      frontFloorMesh.position.set(0, 1.61, 0);
      cngGroup.add(frontFloorMesh);

      [-3.95, 3.95].forEach(sz => {
        const sill = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.28, 0.16), cngGreenMat);
        sill.position.set(-0.5, 1.55, sz);
        cngGroup.add(sill);

        const sillStitch = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.05, 0.18), yellowStitchMat);
        sillStitch.position.set(-0.5, 1.68, sz);
        cngGroup.add(sillStitch);
      });

      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 8.2), chassisMat);
      rearBumper.position.set(-7.45, 1.55, 0);
      cngGroup.add(rearBumper);

      [-rearTrackHalfW, rearTrackHalfW].forEach(mz => {
        const rMudflap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1.3), chassisMat);
        rMudflap.position.set(-5.6, 1.25, mz);
        cngGroup.add(rMudflap);
      });
      const fMudflap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 1.1), chassisMat);
      fMudflap.position.set(3.2, 1.15, 0);
      cngGroup.add(fMudflap);

      // -----------------------------------------------------------------------
      // 3. REAR QUARTER PANELS & TAILGATE (LIVERY BANNERS)
      // -----------------------------------------------------------------------
      const panelLen = 4.40;
      const panelH = 4.40;
      const panelMidX = -5.10;
      const panelMidY = 3.80;
      const panelZ = 3.96;

      const leftPanel = new THREE.Mesh(new THREE.PlaneGeometry(panelLen, panelH), leftLiveryMat);
      leftPanel.position.set(panelMidX, panelMidY, -panelZ);
      leftPanel.rotation.y = Math.PI;
      cngGroup.add(leftPanel);

      const leftInner = new THREE.Mesh(new THREE.PlaneGeometry(panelLen, panelH), cngGreenMat);
      leftInner.position.set(panelMidX, panelMidY, -panelZ + 0.02);
      cngGroup.add(leftInner);

      const rightPanel = new THREE.Mesh(new THREE.PlaneGeometry(panelLen, panelH), rightLiveryMat);
      rightPanel.position.set(panelMidX, panelMidY, panelZ);
      cngGroup.add(rightPanel);

      const rightInner = new THREE.Mesh(new THREE.PlaneGeometry(panelLen, panelH), cngGreenMat);
      rightInner.position.set(panelMidX, panelMidY, panelZ - 0.02);
      rightInner.rotation.y = Math.PI;
      cngGroup.add(rightInner);

      [-panelZ, panelZ].forEach(sz => {
        const fuelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.10, 16), chassisMat);
        fuelCap.rotation.x = Math.PI / 2;
        fuelCap.position.set(-6.5, 4.9, sz + (sz > 0 ? 0.06 : -0.06));
        cngGroup.add(fuelCap);
      });

      const rearWall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.40, 7.90), cngGreenMat);
      rearWall.position.set(-7.25, 3.80, 0);
      cngGroup.add(rearWall);

      [-3.1, 3.1].forEach(tz => {
        const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.75), new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          emissive: 0x991b1b,
          emissiveIntensity: 0.6
        }));
        rLight.position.set(-7.42, 3.70, tz);
        cngGroup.add(rLight);

        const aLight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.55), new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xb45309,
          emissiveIntensity: 0.5
        }));
        aLight.position.set(-7.42, 3.32, tz);
        cngGroup.add(aLight);
      });

      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.85, 2.4), new THREE.MeshStandardMaterial({ color: 0x047857 }));
      plate.position.set(-7.42, 2.65, 0);
      cngGroup.add(plate);

      // -----------------------------------------------------------------------
      // 4. CABIN ENTRYWAYS & DRIVER PARTITION (NO YELLOW PILLAR)
      // -----------------------------------------------------------------------
      const dividerWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.80, 7.80), cngGreenMat);
      dividerWall.position.set(-0.65, 3.00, 0);
      cngGroup.add(dividerWall);

      const driverBackrest = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.40, 2.20), new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.70
      }));
      driverBackrest.position.set(-0.46, 3.80, 0);
      cngGroup.add(driverBackrest);

      const roofArchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.65, 4.40, -3.90),
        new THREE.Vector3(-0.65, 7.80, -3.90),
        new THREE.Vector3(-0.65, 9.15, 0),
        new THREE.Vector3(-0.65, 7.80, 3.90),
        new THREE.Vector3(-0.65, 4.40, 3.90)
      ]);
      const roofArchGeo = new THREE.TubeGeometry(roofArchCurve, 24, 0.08, 8, false);
      const roofArchMesh = new THREE.Mesh(roofArchGeo, chassisMat);
      cngGroup.add(roofArchMesh);

      [-3.95, 3.95].forEach(sz => {
        const flagColors = [0xef4444, 0xfacc15, 0x22c55e, 0x3b82f6, 0xf97316];
        const numFlags = 7;
        const spanStart = -2.80;
        const spanEnd = -0.70;
        const flagStep = (spanEnd - spanStart) / (numFlags - 1);

        for (let f = 0; f < numFlags; f++) {
          const fx = spanStart + f * flagStep;
          const fColor = flagColors[f % flagColors.length];
          const flagMat = new THREE.MeshStandardMaterial({ color: fColor, roughness: 0.5, side: THREE.DoubleSide });

          const triShape = new THREE.Shape();
          triShape.moveTo(-0.12, 0);
          triShape.lineTo(0.12, 0);
          triShape.lineTo(0, -0.38);
          triShape.closePath();

          const triMesh = new THREE.Mesh(new THREE.ShapeGeometry(triShape), flagMat);
          triMesh.position.set(fx, 8.45, sz + (sz > 0 ? 0.04 : -0.04));
          if (sz < 0) triMesh.rotation.y = Math.PI;
          cngGroup.add(triMesh);
        }
      });

      // -----------------------------------------------------------------------
      // 5. SEAMLESS FRONT COWL, DARK MASK, DUAL HEADLIGHTS & WINDSHIELD
      // -----------------------------------------------------------------------
      [-1, 1].forEach(side => {
        const sz = side * 3.90;
        const cheekGeo = new THREE.BufferGeometry();
        const cVerts = new Float32Array([
          2.20, 1.60, sz,       3.40, 1.60, sz * 0.95,  3.40, 3.80, sz * 0.95,
          2.20, 1.60, sz,       3.40, 3.80, sz * 0.95,  2.20, 3.40, sz,
          3.40, 1.60, sz * 0.95,5.20, 1.80, sz * 0.65,  5.20, 3.40, sz * 0.65,
          3.40, 1.60, sz * 0.95,5.20, 3.40, sz * 0.65,  3.40, 3.80, sz * 0.95,
          3.40, 3.80, sz * 0.95,5.20, 3.40, sz * 0.65,  5.38, 5.25, sz * 0.63,
          3.40, 3.80, sz * 0.95,5.38, 5.25, sz * 0.63,  4.80, 5.75, sz * 0.82
        ]);
        cheekGeo.setAttribute('position', new THREE.BufferAttribute(cVerts, 3));
        cheekGeo.computeVertexNormals();
        cngGroup.add(new THREE.Mesh(cheekGeo, cngGreenMat));
      });

      const apronGeo = new THREE.BufferGeometry();
      const aVerts = new Float32Array([
        5.20, 3.40, -2.55,    5.38, 3.80, -2.50,    5.38, 3.80, 2.50,
        5.20, 3.40, -2.55,    5.38, 3.80, 2.50,     5.20, 3.40, 2.50,
        5.20, 1.80, -2.50,    5.20, 3.40, -2.55,    5.20, 3.40, 2.50,
        5.20, 1.80, -2.50,    5.20, 3.40, 2.50,     5.20, 1.80, 2.50
      ]);
      apronGeo.setAttribute('position', new THREE.BufferAttribute(aVerts, 3));
      apronGeo.computeVertexNormals();
      cngGroup.add(new THREE.Mesh(apronGeo, cngGreenMat));

      const fFenderCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(3.30, 2.05, 0),
        new THREE.Vector3(3.80, 3.45, 0),
        new THREE.Vector3(4.60, 3.75, 0),
        new THREE.Vector3(5.40, 3.45, 0),
        new THREE.Vector3(5.75, 2.05, 0)
      ]);
      const fFender = new THREE.Mesh(new THREE.TubeGeometry(fFenderCurve, 16, 0.28, 8, false), cngGreenMat);
      fFender.scale.set(1.0, 1.0, 2.2);
      cngGroup.add(fFender);

      const maskW = 4.90;
      const maskH = 1.45;
      const maskMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, maskH, maskW), darkMaskMat);
      maskMesh.position.set(5.38, 4.52, 0);
      cngGroup.add(maskMesh);

      [-1.55, 1.55].forEach(hz => {
        const hHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.24, 18), chromeMat);
        hHousing.rotation.z = Math.PI / 2;
        hHousing.position.set(5.48, 4.52, hz);
        cngGroup.add(hHousing);

        const hLens = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 14), headlightGlowMat);
        hLens.scale.set(0.35, 1.0, 1.0);
        hLens.position.set(5.55, 4.52, hz);
        cngGroup.add(hLens);
      });

      [4.80, 4.52, 4.24].forEach(gy => {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.30), chromeMat);
        slot.position.set(5.54, gy, 0);
        cngGroup.add(slot);
      });

      const cowlUpperGeo = new THREE.BufferGeometry();
      const cuVerts = new Float32Array([
        5.38, 5.25, -2.45,    4.80, 5.75, -3.20,    4.80, 5.75, 3.20,
        5.38, 5.25, -2.45,    4.80, 5.75, 3.20,     5.38, 5.25, 2.45
      ]);
      const cuUvs = new Float32Array([
        0, 0,   0, 1,   1, 1,
        0, 0,   1, 1,   1, 0
      ]);
      cowlUpperGeo.setAttribute('position', new THREE.BufferAttribute(cuVerts, 3));
      cowlUpperGeo.setAttribute('uv', new THREE.BufferAttribute(cuUvs, 2));
      cowlUpperGeo.computeVertexNormals();
      cngGroup.add(new THREE.Mesh(cowlUpperGeo, frontNoseMat));

      [-2.65, 2.65].forEach(iz => {
        const ind = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.70), indicatorMat);
        ind.position.set(4.88, 5.65, iz);
        cngGroup.add(ind);
      });

      // -------------------------------------------------------------------------
      // TASK: 3D CNG FRONT WINDSHIELD FRAME, FLUSH GLASS & OUTER WIPER ASSEMBLY
      // Frame Bounds: Bottom (4.80, 5.75, 0), Top (3.40, 8.75, 0), Width: 6.40 (-3.20 to +3.20)
      // Slant Height = hypot(4.80 - 3.40, 8.75 - 5.75) = 3.3106
      // Exact Frame Pitch Angle = atan2(4.80 - 3.40, 8.75 - 5.75) = 0.4366 rad (ZERO roll/yaw skew)
      // -------------------------------------------------------------------------
      const xBot = 4.80, yBot = 5.75;
      const xTop = 3.40, yTop = 8.75;
      const frameWidth = 6.40;
      const slantHeight = Math.hypot(xBot - xTop, yTop - yBot);
      const tiltAngle = Math.atan2(xBot - xTop, yTop - yBot);
      const wsMidX = (xBot + xTop) * 0.5;
      const wsMidY = (yBot + yTop) * 0.5;

      const wsPillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, slantHeight, 8), cngGreenMat);
      wsPillarL.position.set(wsMidX, wsMidY, -3.20);
      wsPillarL.rotation.z = tiltAngle;
      cngGroup.add(wsPillarL);

      const wsPillarR = wsPillarL.clone();
      wsPillarR.position.z = 3.20;
      cngGroup.add(wsPillarR);

      const wsTopBar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, frameWidth, 8), cngGreenMat);
      wsTopBar.rotation.x = Math.PI / 2;
      wsTopBar.position.set(xTop, yTop, 0);
      cngGroup.add(wsTopBar);

      const wsBottomBar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, frameWidth, 8), cngGreenMat);
      wsBottomBar.rotation.x = Math.PI / 2;
      wsBottomBar.position.set(xBot, yBot, 0);
      cngGroup.add(wsBottomBar);

      // Windshield Assembly Group (Centered & tilted strictly in pitch plane, Z = 0, ZERO roll/yaw)
      const wsGroup = new THREE.Group();
      wsGroup.position.set(wsMidX, wsMidY, 0);
      wsGroup.rotation.set(0, 0, tiltAngle);

      // 1. Semi-Transparent Windshield Glass Pane (Symmetrically flush inside 4 green frame tubes)
      const glassH = slantHeight - 0.08;
      const glassW = frameWidth - 0.08;
      const wsGlass = new THREE.Mesh(new THREE.BoxGeometry(0.03, glassH, glassW), glassMat);
      wsGroup.add(wsGlass);

      // 2. Dark Rubber Gasket Border (#141619) around inner frame perimeter
      const gasketMat = new THREE.MeshStandardMaterial({ color: 0x141619, roughness: 0.90 });
      const gasketThick = 0.038;
      const gasketBorder = 0.06;

      const topGasket = new THREE.Mesh(new THREE.BoxGeometry(gasketThick, gasketBorder, glassW), gasketMat);
      topGasket.position.set(0, glassH * 0.5 - gasketBorder * 0.5, 0);
      wsGroup.add(topGasket);

      const botGasket = new THREE.Mesh(new THREE.BoxGeometry(gasketThick, gasketBorder, glassW), gasketMat);
      botGasket.position.set(0, -glassH * 0.5 + gasketBorder * 0.5, 0);
      wsGroup.add(botGasket);

      const leftGasket = new THREE.Mesh(new THREE.BoxGeometry(gasketThick, glassH, gasketBorder), gasketMat);
      leftGasket.position.set(0, 0, -glassW * 0.5 + gasketBorder * 0.5);
      wsGroup.add(leftGasket);

      const rightGasket = new THREE.Mesh(new THREE.BoxGeometry(gasketThick, glassH, gasketBorder), gasketMat);
      rightGasket.position.set(0, 0, glassW * 0.5 - gasketBorder * 0.5);
      wsGroup.add(rightGasket);

      // 3. Black Windshield Wiper (Mounted flush against outer glass face, swept across driver view)
      const wiperGroup = new THREE.Group();
      // Positioned at bottom-center of the outer glass surface (local X = +0.026, outer face)
      wiperGroup.position.set(0.026, -glassH * 0.5 + 0.16, 0.0);

      // Black wiper motor pivot cap
      const wiperPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), chassisMat);
      wiperPivot.rotation.z = Math.PI / 2;
      wiperGroup.add(wiperPivot);

      // Swept wiper arm + squeegee blade lying flat against the glass surface (rotation around local X keeps it in YZ plane)
      const wiperArmGroup = new THREE.Group();
      wiperArmGroup.rotation.x = -0.32; // ~18° natural parked sweep across windshield

      const wiperArmLen = 1.75;
      const wiperArm = new THREE.Mesh(new THREE.BoxGeometry(0.024, wiperArmLen, 0.032), chassisMat);
      wiperArm.position.set(0.005, wiperArmLen * 0.5, 0);
      wiperArmGroup.add(wiperArm);

      const bladeLen = 1.40;
      const wiperBlade = new THREE.Mesh(new THREE.BoxGeometry(0.018, bladeLen, 0.028), chassisMat);
      wiperBlade.position.set(-0.006, wiperArmLen * 0.55, 0);
      wiperArmGroup.add(wiperBlade);

      wiperGroup.add(wiperArmGroup);
      wsGroup.add(wiperGroup);

      cngGroup.add(wsGroup);

      [-3.25, 3.25].forEach(mz => {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), chassisMat);
        stalk.rotation.z = Math.PI / 2;
        stalk.position.set(3.60, 7.80, mz + (mz > 0 ? 0.28 : -0.28));
        cngGroup.add(stalk);

        const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16), chassisMat);
        mirror.rotation.y = Math.PI / 2;
        mirror.position.set(3.60, 7.80, mz + (mz > 0 ? 0.55 : -0.55));
        cngGroup.add(mirror);

        const mFace = new THREE.Mesh(new THREE.CircleGeometry(0.25, 14), chromeMat);
        mFace.rotation.y = -Math.PI / 2;
        mFace.position.set(3.55, 7.80, mz + (mz > 0 ? 0.55 : -0.55));
        cngGroup.add(mFace);
      });

      // -----------------------------------------------------------------------
      // 6. FITTED DARK SLATE-BLUE CANVAS SOFT-TOP HOOD & SCALLOPED GARLANDS
      // -----------------------------------------------------------------------
      const roofStations = [
        { center: [3.42, 8.80, 0], rx: 0.20, rz: 3.25 },
        { center: [1.60, 9.10, 0], rx: 0.20, rz: 3.85 },
        { center: [-0.65, 9.15, 0], rx: 0.20, rz: 4.00 },
        { center: [-3.20, 9.05, 0], rx: 0.20, rz: 4.00 },
        { center: [-5.80, 8.85, 0], rx: 0.20, rz: 3.95 },
        { center: [-6.85, 8.40, 0], rx: 0.20, rz: 3.90 },
        { center: [-7.35, 6.00, 0], rx: 0.20, rz: 3.90 }
      ];

      const roofGeo = new THREE.BufferGeometry();
      const rPos = [];
      const rUvs = [];
      const rIdx = [];
      const numRStations = roofStations.length;
      const rSegs = 18;

      for (let s = 0; s < numRStations; s++) {
        const st = roofStations[s];
        const u = s / (numRStations - 1);
        for (let j = 0; j <= rSegs; j++) {
          const ang = -Math.PI / 2 + (Math.PI * j) / rSegs;
          const z = Math.sin(ang) * st.rz;
          const y = st.center[1] + Math.cos(ang) * 0.45;
          const x = st.center[0];
          rPos.push(x, y, z);
          rUvs.push(j / rSegs, u);
        }
      }

      for (let s = 0; s < numRStations - 1; s++) {
        for (let j = 0; j < rSegs; j++) {
          const a = s * (rSegs + 1) + j;
          const b = (s + 1) * (rSegs + 1) + j;
          const c = (s + 1) * (rSegs + 1) + (j + 1);
          const d = s * (rSegs + 1) + (j + 1);
          rIdx.push(a, b, d);
          rIdx.push(b, c, d);
        }
      }

      roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
      roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUvs, 2));
      roofGeo.setIndex(rIdx);
      roofGeo.computeVertexNormals();

      const roofMesh = new THREE.Mesh(roofGeo, canvasSoftTopMat);
      cngGroup.add(roofMesh);

      [-3.95, 3.95].forEach(sz => {
        const garlandCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(3.35, 8.75, sz * 0.85),
          new THREE.Vector3(1.60, 9.05, sz),
          new THREE.Vector3(-0.65, 9.12, sz),
          new THREE.Vector3(-3.20, 9.02, sz),
          new THREE.Vector3(-5.80, 8.82, sz),
          new THREE.Vector3(-6.85, 8.35, sz)
        ]);
        const gMesh = new THREE.Mesh(new THREE.TubeGeometry(garlandCurve, 20, 0.12, 6, false), garlandMat);
        cngGroup.add(gMesh);
      });

      // -----------------------------------------------------------------------
      // 7. INTERIOR COCKPIT & CONNECTED T-BAR STEERING COLUMN
      // -----------------------------------------------------------------------
      const driverPedestal = new THREE.Mesh(new THREE.BoxGeometry(1.60, 1.25, 2.20), chassisMat);
      driverPedestal.position.set(0.90, 2.20, 0);
      cngGroup.add(driverPedestal);

      const driverCushion = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.35, 2.10), new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.65
      }));
      driverCushion.position.set(0.90, 2.90, 0);
      cngGroup.add(driverCushion);

      // --- FULLY CONNECTED T-BAR STEERING COLUMN ---
      // 1. Continuous angled steering shaft rising from floor/apron (4.85, 1.35) to handlebar (2.45, 4.35)
      const steerTop = new THREE.Vector3(2.45, 4.35, 0);
      const steerBase = new THREE.Vector3(4.85, 1.35, 0);
      const steerDist = steerTop.distanceTo(steerBase) + 0.25;
      const steerMid = new THREE.Vector3().addVectors(steerTop, steerBase).multiplyScalar(0.5);
      const steerDir = new THREE.Vector3().subVectors(steerBase, steerTop).normalize();

      const stemBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.10, 0.12, steerDist, 14),
        chassisMat
      );
      stemBar.position.copy(steerMid);
      stemBar.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), steerDir);
      cngGroup.add(stemBar);

      // Floor mounting collar locking into floorboard
      const steerBaseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.40, 14), chassisMat);
      steerBaseCollar.position.set(4.80, 1.45, 0);
      cngGroup.add(steerBaseCollar);

      // 2. Central steering yoke / speedometer console housing locking shaft to handlebar
      const yokeConsole = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.36, 0.72),
        chassisMat
      );
      yokeConsole.position.set(2.45, 4.35, 0);
      yokeConsole.rotation.z = 0.24;
      cngGroup.add(yokeConsole);

      const speedoDial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.25 })
      );
      speedoDial.position.set(2.48, 4.54, 0);
      speedoDial.rotation.z = 0.24;
      cngGroup.add(speedoDial);

      // 3. Horizontal handlebar (Z = ±1.20)
      const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 2.40, 12), chassisMat);
      handleBar.rotation.x = Math.PI / 2;
      handleBar.position.set(2.45, 4.35, 0);
      cngGroup.add(handleBar);

      // Ergonomic rubber grips on handlebar ends
      [-1.15, 1.15].forEach(gz => {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.45, 12), rubberTireMat);
        grip.rotation.x = Math.PI / 2;
        grip.position.set(2.45, 4.35, gz);
        cngGroup.add(grip);
      });

      // Rear Passenger Bench Seat
      const passBench = new THREE.Mesh(new THREE.BoxGeometry(2.10, 1.30, 7.60), chassisMat);
      passBench.position.set(-4.60, 2.20, 0);
      cngGroup.add(passBench);

      const passCushion = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.40, 7.50), new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.55
      }));
      passCushion.position.set(-4.60, 2.95, 0);
      cngGroup.add(passCushion);

      const passBackrest = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.10, 7.50), new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.55
      }));
      passBackrest.position.set(-5.65, 4.20, 0);
      cngGroup.add(passBackrest);

      // -----------------------------------------------------------------------
      // 8. DISTINCT HUMAN CHARACTERS: DRIVER (WORK SHIRT) & PASSENGERS (HOODIE & SAREE)
      // -----------------------------------------------------------------------
      const driverSkinMat = new THREE.MeshStandardMaterial({ color: 0x9a5c40, roughness: 0.62 });
      const maleSkinMat = new THREE.MeshStandardMaterial({ color: 0xa4684d, roughness: 0.62 });
      const femaleSkinMat = new THREE.MeshStandardMaterial({ color: 0xad7258, roughness: 0.58 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.85 });

      // DISTINCT DRESS COLORS:
      // Driver: Deep Navy-Slate Work Shirt (#2c3e50)
      const driverShirtMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
      const driverPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });

      // Male Passenger: Rich Burgundy/Crimson Hoodie (#991b1b)
      const maleHoodieMat = new THREE.MeshStandardMaterial({ color: 0x781726, roughness: 0.82 });
      const malePantsMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.75 }); // Royal Blue Jeans

      // Female Passenger: Ochre Saree (#d97706) with Anchol
      const sareeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65, side: THREE.DoubleSide });
      const sareeAncholMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.60, side: THREE.DoubleSide });

      // =======================================================================
      // A. CNG DRIVER (MUSTACHE + NAVY WORK SHIRT + ROLLED SLEEVES + GRIPPING FISTS)
      // =======================================================================
      const driverGroup = new THREE.Group();
      driverGroup.position.set(0.90, 3.10, 0);

      // 1. Torso: Smooth lofted organ mesh with horizontal rings
      const driverTorsoStations = [
        { center: [0.00, 0.25, 0], rx: 0.65, rz: 0.75 },
        { center: [0.18, 1.05, 0], rx: 0.66, rz: 0.74 },
        { center: [0.38, 1.85, 0], rx: 0.70, rz: 0.78 },
        { center: [0.52, 2.45, 0], rx: 0.54, rz: 0.82 }
      ];
      driverGroup.add(createLoftedOrganMesh(driverTorsoStations, 20, driverShirtMat));

      // 2. Solid Upper-Chest / Clavicle Dome (SEALS upper torso and neck seam seamlessly)
      const driverClavicle = new THREE.Mesh(
        new THREE.SphereGeometry(0.72, 20, 16),
        driverShirtMat
      );
      driverClavicle.scale.set(0.78, 0.46, 1.55);
      driverClavicle.position.set(0.50, 2.46, 0);
      driverClavicle.rotation.z = -0.22; // Aligned with torso forward lean
      driverGroup.add(driverClavicle);

      // 3. Centered Neck Column (Deeply embedded into torso dome and head)
      const neckAngle = 0.22;
      const dNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 1.10, 16), driverSkinMat);
      dNeck.position.set(0.58, 2.85, 0);
      dNeck.rotation.z = -neckAngle;
      driverGroup.add(dNeck);

      // Fitted work shirt collar flush around base of neck
      const driverCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.08, 10, 24),
        driverShirtMat
      );
      driverCollar.position.set(0.54, 2.60, 0);
      const dNeckDir = new THREE.Vector3(Math.sin(neckAngle), Math.cos(neckAngle), 0).normalize();
      driverCollar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dNeckDir);
      driverGroup.add(driverCollar);

      // 4. Head with neat black mustache
      const dHead = buildRealisticAdultHead(driverSkinMat, hairMat, false, true, { isYounger: false });
      dHead.position.set(0.68, 3.42, 0);
      driverGroup.add(dHead);

      // 5. Curved Arms with Rolled-up Sleeves & Sculpted Gripping Hands
      [-1, 1].forEach(side => {
        // Deltoid shoulder cap
        const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), driverShirtMat);
        shoulderCap.position.set(0.48, 2.42, side * 0.85);
        driverGroup.add(shoulderCap);

        // Upper arm in work shirt fabric down to elbow
        const dUpperArmPts = [
          [0.48, 2.42, side * 0.85],
          [0.85, 1.95, side * 1.02],
          [1.08, 1.62, side * 1.10]
        ];
        driverGroup.add(createContinuousSplineLimb(dUpperArmPts, [0.28, 0.24, 0.22], driverShirtMat, 10, 8));

        // Rolled-up sleeve cuff
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 16), driverShirtMat);
        cuff.position.set(1.08, 1.62, side * 1.10);
        cuff.rotation.y = Math.PI / 2;
        driverGroup.add(cuff);

        // Exposed skin forearm tapering to wrist with ~20° natural elbow bend
        const dForearmPts = [
          [1.08, 1.62, side * 1.10],
          [1.32, 1.40, side * 1.13],
          [1.48, 1.28, side * 1.15]
        ];
        driverGroup.add(createContinuousSplineLimb(dForearmPts, [0.19, 0.17, 0.15], driverSkinMat, 10, 8));

        // Sculpted gripping hand/fist wrapped directly around the handlebar grip
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), driverSkinMat);
        hand.scale.set(1.10, 0.75, 1.25);
        hand.position.set(1.55, 1.25, side * 1.15);
        hand.rotation.z = -0.15;
        driverGroup.add(hand);
      });

      // 6. Driver seated legs
      [-0.40, 0.40].forEach(lz => {
        const dLegPts = [
          [0.10, 0.20, lz],
          [1.15, 0.20, lz],
          [1.25, -0.70, lz],
          [1.25, -1.45, lz]
        ];
        driverGroup.add(createContinuousSplineLimb(dLegPts, [0.29, 0.25, 0.23, 0.20], driverPantsMat, 12, 8));

        // Shoes resting flat on floorboard
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.38), new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.6
        }));
        shoe.position.set(1.48, -1.50, lz);
        driverGroup.add(shoe);
      });

      cngGroup.add(driverGroup);

      // =======================================================================
      // B. MALE REAR PASSENGER (CLEAN-SHAVEN + BURGUNDY HOODIE + HANDS ON KNEES)
      // =======================================================================
      const maleGroup = new THREE.Group();
      maleGroup.position.set(-4.50, 3.15, -1.80);

      // 1. Torso: Smooth lofted organ mesh in Burgundy Hoodie (#991b1b)
      const maleTorsoStations = [
        { center: [0.00, 0.25, 0], rx: 0.65, rz: 0.75 },
        { center: [0.03, 1.05, 0], rx: 0.66, rz: 0.74 },
        { center: [0.06, 1.85, 0], rx: 0.68, rz: 0.78 },
        { center: [0.08, 2.42, 0], rx: 0.54, rz: 0.80 }
      ];
      maleGroup.add(createLoftedOrganMesh(maleTorsoStations, 20, maleHoodieMat));

      // 2. Kangaroo pocket detail on front of hoodie
      const kPocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.55, 0.92),
        new THREE.MeshStandardMaterial({ color: 0x5c1020, roughness: 0.82 })
      );
      kPocket.position.set(0.46, 1.15, 0);
      maleGroup.add(kPocket);

      // 3. Solid Upper-Chest / Clavicle Dome
      const maleClavicle = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 20, 16),
        maleHoodieMat
      );
      maleClavicle.scale.set(0.78, 0.46, 1.50);
      maleClavicle.position.set(0.08, 2.42, 0);
      maleGroup.add(maleClavicle);

      // 4. SCULPTED 3D HOODIE COLLAR & BACK DRAPE (SEALS neck-to-torso completely)
      const hoodCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.15, 10, 24),
        maleHoodieMat
      );
      hoodCollar.position.set(0.06, 2.58, 0);
      hoodCollar.rotation.x = Math.PI / 2;
      hoodCollar.scale.set(1.10, 0.85, 1.20);
      maleGroup.add(hoodCollar);

      const hoodDrape = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 12),
        maleHoodieMat
      );
      hoodDrape.scale.set(0.55, 0.78, 0.95);
      hoodDrape.position.set(-0.25, 2.38, 0);
      maleGroup.add(hoodDrape);

      // 5. Deeply Sunk Neck Column
      const mNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.26, 1.10, 14), maleSkinMat);
      mNeck.position.set(0.08, 2.80, 0);
      maleGroup.add(mNeck);

      // 6. Clean-shaven younger face (MUSTACHE = FALSE)
      const mHead = buildRealisticAdultHead(maleSkinMat, hairMat, false, false, { isYounger: true });
      mHead.position.set(0.10, 3.42, 0);
      maleGroup.add(mHead);

      // 7. Hoodie arms with ribbed cuffs and sculpted flat hands resting on knees
      [-0.65, 0.65].forEach(az => {
        const mShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), maleHoodieMat);
        mShoulder.position.set(0.08, 2.42, az);
        maleGroup.add(mShoulder);

        const mArmPts = [
          [0.08, 2.42, az],
          [0.72, 1.48, az * 0.85],
          [1.35, 0.64, az * 0.55]
        ];
        maleGroup.add(createContinuousSplineLimb(mArmPts, [0.26, 0.22, 0.19], maleHoodieMat, 10, 8));

        // Ribbed cuff at wrist
        const hCuff = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.045, 8, 16), new THREE.MeshStandardMaterial({ color: 0x5c1020, roughness: 0.82 }));
        hCuff.position.set(1.35, 0.64, az * 0.55);
        hCuff.rotation.y = Math.PI / 2;
        maleGroup.add(hCuff);

        // Sculpted palm resting flat on top of knee
        const mHand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.18), maleSkinMat);
        mHand.position.set(1.48, 0.54, az * 0.55);
        maleGroup.add(mHand);
      });

      // 8. Male legs in royal blue jeans
      [-0.45, 0.45].forEach(lz => {
        const mLegPts = [
          [0.10, 0.20, lz],
          [1.25, 0.20, lz],
          [1.35, -0.65, lz],
          [1.35, -1.45, lz]
        ];
        maleGroup.add(createContinuousSplineLimb(mLegPts, [0.29, 0.25, 0.23, 0.20], malePantsMat, 12, 8));

        const mShoe = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.22, 0.38), new THREE.MeshStandardMaterial({
          color: 0x334155,
          roughness: 0.6
        }));
        mShoe.position.set(1.58, -1.50, lz);
        maleGroup.add(mShoe);
      });

      cngGroup.add(maleGroup);

      // =======================================================================
      // C. FEMALE REAR PASSENGER (OCHRE SAREE + ANCHOL/GHOMTA + BINDI + BANGLES)
      // =======================================================================
      const femaleGroup = new THREE.Group();
      femaleGroup.position.set(-4.50, 3.15, 1.80);

      // 1. Torso: Smooth lofted organ mesh in Saree
      const femaleTorsoStations = [
        { center: [0.00, 0.25, 0], rx: 0.60, rz: 0.70 },
        { center: [0.03, 1.05, 0], rx: 0.62, rz: 0.68 },
        { center: [0.06, 1.85, 0], rx: 0.65, rz: 0.72 },
        { center: [0.08, 2.42, 0], rx: 0.52, rz: 0.75 }
      ];
      femaleGroup.add(createLoftedOrganMesh(femaleTorsoStations, 20, sareeMat));

      // 2. Solid Upper-Chest / Clavicle Dome
      const femaleClavicle = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 20, 16),
        sareeMat
      );
      femaleClavicle.scale.set(0.74, 0.44, 1.45);
      femaleClavicle.position.set(0.08, 2.42, 0);
      femaleGroup.add(femaleClavicle);

      // 3. Deeply Sunk Neck Column
      const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.05, 14), femaleSkinMat);
      fNeck.position.set(0.10, 2.80, 0);
      femaleGroup.add(fNeck);

      // 4. Head with Bindi, Khopa bun and Red Lips
      const fHead = buildRealisticAdultHead(femaleSkinMat, hairMat, true, false);
      fHead.position.set(0.12, 3.42, 0);
      femaleGroup.add(fHead);

      // 5. Saree Cowl / Ghomta draped over back and crown of head
      const ghomtaCurve = [
        [-0.40, 3.75, -0.60],
        [-0.55, 3.40, 0],
        [-0.40, 3.75, 0.60],
        [0.10, 3.90, 0.65],
        [0.10, 3.90, -0.65]
      ];
      femaleGroup.add(createContinuousSplineLimb(ghomtaCurve, 0.22, sareeAncholMat, 12, 8));

      // 6. Saree skirt covering seated thighs and shins
      const skirtPts = [
        [0.05, 0.25, 0],
        [1.35, 0.25, 0],
        [1.45, -0.65, 0],
        [1.45, -1.45, 0]
      ];
      femaleGroup.add(createContinuousSplineLimb(skirtPts, [0.72, 0.75, 0.68, 0.62], sareeMat, 14, 10));

      // 7. Female arms resting softly on lap with bangles
      [-0.65, 0.65].forEach(az => {
        const fShoulder = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), sareeMat);
        fShoulder.position.set(0.10, 2.40, az);
        femaleGroup.add(fShoulder);

        const fArmPts = [
          [0.10, 2.40, az],
          [0.70, 1.40, az * 0.80],
          [1.35, 0.50, az * 0.35]
        ];
        femaleGroup.add(createContinuousSplineLimb(fArmPts, [0.22, 0.18, 0.15], femaleSkinMat, 10, 8));

        [0xdc2626, 0xfacc15].forEach((bColor, bIdx) => {
          const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12), new THREE.MeshStandardMaterial({
            color: bColor,
            roughness: 0.3
          }));
          bangle.position.set(1.15 + bIdx * 0.08, 0.70, az * 0.50);
          bangle.rotation.y = Math.PI / 2;
          femaleGroup.add(bangle);
        });
      });

      const fHands = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), femaleSkinMat);
      fHands.position.set(1.40, 0.48, 0);
      femaleGroup.add(fHands);

      cngGroup.add(femaleGroup);

      // =========================================================================
      // TASK 1: UNIFORMLY SCALE UP 3D CNG PACKAGE BY ADDITIONAL 1.07x (LOCKED AT 1.14x)
      // Inner child wrapper ensures 1.14x scale is permanent & cannot be overwritten.
      // All 3 wheels rest 100% flush on the asphalt road surface (y = 0.0, zero float/sink).
      // =========================================================================
      const CNG_WORLD_SCALE = 1.14;
      cngPackage.scale.setScalar(CNG_WORLD_SCALE);
      cngPackage.position.set(0, 0, 0);
      root.add(cngPackage);

      root.userData.wheels = cngPackage.userData.wheels;
      root.userData.wheelRadius = 1.85 * CNG_WORLD_SCALE;

      return root;
  }

  function create3DVehicle(type, colorHex, appearanceId, vData) {
    if (type === 'car') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      const car = createProcedural3DCar(appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) {
        scene.add(car);
      }
      return car;
    }
    if (type === 'bike') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      const bike = createRealisticGTABike(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) {
        scene.add(bike);
      }
      return bike;
    }
    if (type === 'cng') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      const cng = createRealisticDhakaCNG(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(cng);
      return cng;
    }
    if (type === 'rickshaw') {
      const appearanceSeed = getAppearanceSeed(appearanceId || (vData && vData.id) || type);
      const rick = createRealisticDhakaRickshaw(colorHex, appearanceSeed, vData);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(rick);
      return rick;
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
    return Promise.resolve(null); // Pure Three.js procedural car models preserved
  }

  function loadAllCarModels() {
    return Promise.resolve([]); // Pure Three.js procedural car models preserved
  }

  function loadMetroModel() {
    return Promise.resolve(null); // Pure Three.js procedural model preserved
  }

  function loadPedestriansModel() {
    return loadGLBModel('assets/models/pedestrians.glb');
  }

  function replaceRickshawWithModel(vehicle, prototype) {
    return; // Pure Three.js model preserved
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
    // Pure Three.js procedural dual motorcycles are authoritative
    return;
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
    return; // Pure Three.js model preserved
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
    return; // Pure Three.js procedural car models preserved
  }

  function replaceMetroTrainWithModel(prototype) {
    if (!trainGroup) return;
    return; // Pure Three.js procedural Kawasaki MRT Line-6 model preserved
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

  // =========================================================================
  // AUTHENTIC PROCEDURAL DHAKA METRO RAIL (KAWASAKI MRT LINE-6)
  // Pure Three.js Implementation — Zero External GLB / Zero Blender
  // =========================================================================
  const metroTextureCache = {};

  // Glowing Bengali LED Destination Board: "উত্তরা-মতিঝিল"
  function getMetroDestBoardTexture() {
    if (metroTextureCache.destBoard) return metroTextureCache.destBoard;
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 128;
    const ctx = cv.getContext('2d');

    // High-contrast black LED display background
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 512, 128);

    // Subtle dark LED dot matrix mesh background
    ctx.fillStyle = 'rgba(251, 191, 36, 0.05)';
    for (let x = 6; x < 506; x += 6) {
      for (let y = 6; y < 122; y += 6) {
        ctx.fillRect(x, y, 2.5, 2.5);
      }
    }

    // Outer border with subtle amber glow
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 500, 116);

    // Crisp glowing amber-yellow Bengali text: উত্তরা-মতিঝিল
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px "Hind Siliguri", "Kalpurush", "SolaimanLipi", sans-serif';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('উত্তরা-মতিঝিল', 256, 52);

    // Subtitle English text: UTTARA - MOTIJHEEL
    ctx.font = 'bold 22px sans-serif';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fef08a';
    ctx.fillText('UTTARA ⇄ MOTIJHEEL · MRT LINE-6', 256, 96);

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    metroTextureCache.destBoard = tex;
    return tex;
  }

  // DMTCL Circular Emblem Badge
  function getMetroDmtclLogoTexture() {
    if (metroTextureCache.dmtclLogo) return metroTextureCache.dmtclLogo;
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 256;
    const ctx = cv.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);
    const cx = 128, cy = 128;

    // Outer Bangladesh Bottle-Green circular emblem border
    ctx.fillStyle = '#006a4e';
    ctx.beginPath();
    ctx.arc(cx, cy, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner Crimson Red disc
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(cx, cy, 84, 0, Math.PI * 2);
    ctx.fill();

    // White stylized curved track speed lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy + 24, 60, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy + 38, 48, -Math.PI * 0.78, -Math.PI * 0.22);
    ctx.stroke();

    // Center bold monogram text: DMTCL
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 34px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('DMTCL', cx, cy - 12);

    const tex = new THREE.CanvasTexture(cv);
    metroTextureCache.dmtclLogo = tex;
    return tex;
  }

  // Front Asymmetric Windshield Glass & Wiper Texture
  function getMetroWindshieldTexture() {
    if (metroTextureCache.windshield) return metroTextureCache.windshield;
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const ctx = cv.getContext('2d');

    // Background dark cab glass with subtle blue sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, '#0a1628');
    skyGrad.addColorStop(0.5, '#050a12');
    skyGrad.addColorStop(1, '#020408');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Left pane (emergency exit door glass): x = 16 to 180
    ctx.fillStyle = '#090f1a';
    ctx.fillRect(16, 12, 168, 232);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 12, 168, 232);

    // Single black angled wiper on left emergency glass
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(40, 230);
    ctx.lineTo(130, 90);
    ctx.stroke();

    // Right pane (panoramic driver windshield): x = 200 to 496
    ctx.fillStyle = '#070d17';
    ctx.fillRect(200, 12, 296, 232);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(200, 12, 296, 232);

    // Illuminated cab interior console glow
    const consoleGrad = ctx.createRadialGradient(380, 220, 10, 380, 220, 120);
    consoleGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    consoleGrad.addColorStop(0.6, 'rgba(34, 197, 94, 0.15)');
    consoleGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = consoleGrad;
    ctx.fillRect(200, 140, 296, 104);

    // Green-vested train operator silhouette sitting at controls
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(380, 150, 24, 0, Math.PI * 2);
    ctx.fill();

    // High-vis Bangladesh green/lime safety vest
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(344, 240);
    ctx.lineTo(360, 178);
    ctx.lineTo(400, 178);
    ctx.lineTo(416, 240);
    ctx.closePath();
    ctx.fill();

    // Silver reflective vest stripes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(365, 182); ctx.lineTo(365, 236);
    ctx.moveTo(395, 182); ctx.lineTo(395, 236);
    ctx.stroke();

    // Two parallel angled black wipers on driver windshield
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(270, 235);
    ctx.lineTo(350, 85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(360, 235);
    ctx.lineTo(440, 85);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    metroTextureCache.windshield = tex;
    return tex;
  }

  // High-Resolution Coach Sidewall Texture: Brushed Stainless Steel, Red-Striped Doors & Windows
  function getMetroCoachSideTexture(coachType) {
    const cacheKey = 'coach_' + coachType;
    if (metroTextureCache[cacheKey]) return metroTextureCache[cacheKey];
    if (typeof document === 'undefined') return null;

    const cv = document.createElement('canvas');
    cv.width = 2048;
    cv.height = 512;
    const ctx = cv.getContext('2d');

    // 1. Brushed Stainless Steel Base with Fine Hairlines
    const steelGrad = ctx.createLinearGradient(0, 0, 0, 512);
    steelGrad.addColorStop(0, '#f1f5f9');
    steelGrad.addColorStop(0.3, '#e2e8f0');
    steelGrad.addColorStop(0.7, '#cbd5e1');
    steelGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = steelGrad;
    ctx.fillRect(0, 0, 2048, 512);

    // Fine brushed horizontal metallic grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let y = 50; y < 455; y += 4) {
      ctx.fillRect(0, y, 2048, 1.5);
    }

    // 2. Continuous Bangladesh Bottle-Green Band (#006a4e) along upper sidewall
    ctx.fillStyle = '#006a4e';
    ctx.fillRect(0, 0, 2048, 44);

    // Crisp white accent pin below green band
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 44, 2048, 4);

    // 3. Dark Underframe Chassis Skirt (#1e293b) along bottom
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 455, 2048, 57);

    // 4. Passenger Double Doors (4 pairs per coach) with Vertical Crimson-Red Center Stripe
    const isLead = (coachType === 'lead');
    const isRear = (coachType === 'rear');

    let doorXs = [];
    if (isLead) {
      doorXs = [240, 640, 1040, 1440];
    } else if (isRear) {
      doorXs = [608, 1008, 1408, 1808];
    } else {
      doorXs = [256, 768, 1280, 1792];
    }

    doorXs.forEach(dx => {
      const dw = 154;
      const dh = 335;
      const dy = 120;

      // Outer door frame pocket
      ctx.fillStyle = '#334155';
      ctx.fillRect(dx - dw / 2 - 4, dy - 4, dw + 8, dh + 8);

      // Brushed silver door leaves
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(dx - dw / 2, dy, dw, dh);

      // Bold vertical Crimson-Red Center Safety Stripe (#dc2626) down the door seam
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(dx - 9, dy, 18, dh);

      // Door panel vertical divide split seam
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(dx - 1, dy, 2, dh);

      // Left & right door leaf dark tinted glass windows
      [-42, 42].forEach(offset => {
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(dx + offset - 26, dy + 28, 52, 180, 10);
        ctx.fill();

        // Subtle glass reflection
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Door handles
      ctx.fillStyle = '#475569';
      ctx.fillRect(dx - 22, dy + 225, 4, 32);
      ctx.fillRect(dx + 18, dy + 225, 4, 32);
    });

    // 5. Driver Cab Side Door on Lead and Rear coaches
    if (isLead || isRear) {
      const cdx = isLead ? 1860 : 188;
      const cdw = 85;
      const cdh = 335;
      const cdy = 120;

      ctx.fillStyle = '#334155';
      ctx.fillRect(cdx - cdw / 2 - 3, cdy - 3, cdw + 6, cdh + 6);

      // Metallic bronze/stainless door leaf
      ctx.fillStyle = '#a1a1aa';
      ctx.fillRect(cdx - cdw / 2, cdy, cdw, cdh);

      // Cab side window
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(cdx - 28, cdy + 35, 56, 120, 8);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cab door vertical handle
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cdx + (isLead ? -30 : 26), cdy + 180, 4, 45);
    }

    // 6. Wide Panoramic Tinted Passenger Windows between Doors
    let windowIntervals = [];
    if (isLead) {
      windowIntervals = [[370, 510], [770, 910], [1170, 1310], [1570, 1740]];
    } else if (isRear) {
      windowIntervals = [[310, 478], [738, 878], [1138, 1278], [1538, 1678]];
    } else {
      windowIntervals = [[384, 640], [896, 1152], [1408, 1664]];
    }

    windowIntervals.forEach(([x1, x2]) => {
      const ww = x2 - x1;
      const wh = 175;
      const wy = 135;

      // Window outer rubber gasket
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x1 - 3, wy - 3, ww + 6, wh + 6, 14);
      ctx.fill();

      // Dark tinted glass with blue specular gradient
      const winGrad = ctx.createLinearGradient(x1, wy, x2, wy + wh);
      winGrad.addColorStop(0, '#0a101d');
      winGrad.addColorStop(0.5, '#05070d');
      winGrad.addColorStop(1, '#020407');
      ctx.fillStyle = winGrad;
      ctx.beginPath();
      ctx.roundRect(x1, wy, ww, wh, 12);
      ctx.fill();

      // Subtle warm interior cabin lighting glow inside
      ctx.fillStyle = 'rgba(254, 243, 199, 0.22)';
      ctx.fillRect(x1 + 10, wy + 20, ww - 20, wh - 30);

      // Silhouettes of high-back ergonomic passenger seats
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      const numSeats = Math.max(2, Math.floor(ww / 65));
      for (let s = 0; s < numSeats; s++) {
        const sx = x1 + 18 + s * (ww / numSeats);
        ctx.beginPath();
        ctx.roundRect(sx, wy + 65, 40, 75, [10, 10, 2, 2]);
        ctx.fill();
      }

      // Thin silver center window divider
      ctx.fillStyle = '#64748b';
      ctx.fillRect((x1 + x2) / 2 - 1.5, wy, 3, wh);

      // Small amber-yellow electronic side destination displays above windows
      ctx.fillStyle = '#05070a';
      ctx.fillRect((x1 + x2) / 2 - 60, wy - 42, 120, 24);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect((x1 + x2) / 2 - 60, wy - 42, 120, 24);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('উত্তরা-মতিঝিল', (x1 + x2) / 2, wy - 30);

      // Small DMTCL circular emblem logo beside window
      const logoX = x1 - 32;
      if (logoX > 50 && logoX < 2000) {
        ctx.fillStyle = '#006a4e';
        ctx.beginPath();
        ctx.arc(logoX, wy + 40, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(logoX, wy + 40, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    metroTextureCache[cacheKey] = tex;
    return tex;
  }

  // HVAC Ventilation Louver / Grille Texture
  function getMetroHvacGrilleTexture() {
    if (metroTextureCache.hvacGrille) return metroTextureCache.hvacGrille;
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 64;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 256, 64);

    // 10 slatted horizontal vents with shadow bevels
    for (let y = 6; y < 58; y += 5) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, y, 240, 2.5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(8, y + 2.5, 240, 1.0);
    }

    const tex = new THREE.CanvasTexture(cv);
    metroTextureCache.hvacGrille = tex;
    return tex;
  }

  // -------------------------------------------------------------------------
  // 1. ICONIC TRI-COLOR AERODYNAMIC CAB NOSE (KAWASAKI MRT LINE-6)
  // -------------------------------------------------------------------------
  function createMetroCabNose(direction) {
    const nose = new THREE.Group();
    const isForward = direction >= 0;

    const metroGreenMat = new THREE.MeshStandardMaterial({
      color: 0x006a4e,
      roughness: 0.35,
      metalness: 0.15
    });
    const metroWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.30,
      metalness: 0.10
    });
    const metroRedMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.40,
      metalness: 0.12
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.20,
      metalness: 0.85
    });
    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.50
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0e1726,
      roughness: 0.15,
      metalness: 0.80,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    });
    const headlightLensMat = new THREE.MeshBasicMaterial({
      color: isForward ? 0xffffff : 0xef4444
    });

    // 1. UPPER BOTTLE-GREEN MASK (#006a4e)
    const crownGeo = new THREE.BoxGeometry(6.2, 2.6, 13.56);
    const crown = new THREE.Mesh(crownGeo, metroGreenMat);
    crown.position.set(2.8, 15.1, 0);
    crown.rotation.z = -0.16; // ~9-10° aerodynamic backward rake
    nose.add(crown);

    // Left and right A-pillars wrapping around windshields
    [-6.3, 6.3].forEach(pz => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(5.8, 5.8, 1.2), metroGreenMat);
      pillar.position.set(3.2, 12.2, pz);
      pillar.rotation.z = -0.16;
      nose.add(pillar);
    });

    // Center windshield divider pillar
    const centerDivider = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.0, 0.65), metroGreenMat);
    centerDivider.position.set(3.8, 12.2, -0.6);
    centerDivider.rotation.z = -0.16;
    nose.add(centerDivider);

    // Smooth V-arch contour dipping down below center divider
    const vArch = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 5.2), metroGreenMat);
    vArch.position.set(5.2, 9.8, 0);
    vArch.rotation.z = -0.16;
    nose.add(vArch);

    // Recessed LED Destination Display Box
    const destBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 8.4), new THREE.MeshBasicMaterial({ color: 0x05070a }));
    destBox.position.set(5.8, 14.8, 0);
    destBox.rotation.z = -0.16;
    nose.add(destBox);

    const destTex = getMetroDestBoardTexture();
    if (destTex) {
      const destPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(8.2, 1.8),
        new THREE.MeshBasicMaterial({ map: destTex, transparent: true })
      );
      destPlane.rotation.y = Math.PI / 2;
      destPlane.rotation.x = -0.16;
      destPlane.position.set(6.45, 14.8, 0);
      nose.add(destPlane);
    }

    // Rooftop Horn / Antenna Pods
    [-4.8, 4.8].forEach(hz => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.45), darkChassisMat);
      bracket.position.set(2.4, 16.5, hz);
      nose.add(bracket);

      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, 1.6, 12), chromeMat);
      horn.rotation.z = Math.PI / 2;
      horn.position.set(2.8, 16.8, hz);
      nose.add(horn);
    });

    // 2. ASYMMETRIC WINDSHIELDS & WIPER BLADES
    // Narrower left emergency-exit pane
    const winLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.4, 4.2), glassMat);
    winLeft.position.set(5.4, 12.2, -3.2);
    winLeft.rotation.z = -0.16;
    nose.add(winLeft);

    // Wider right panoramic driver windshield
    const winRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.4, 6.4), glassMat);
    winRight.position.set(5.5, 12.2, 2.6);
    winRight.rotation.z = -0.16;
    nose.add(winRight);

    // Operator cab interior console & silhouette
    const cabDashboard = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 11.0), darkChassisMat);
    cabDashboard.position.set(3.2, 10.2, 0);
    nose.add(cabDashboard);

    const consoleGlow = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.4, 6.0),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    consoleGlow.position.set(3.4, 10.9, 2.6);
    nose.add(consoleGlow);

    const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), darkChassisMat);
    driverHead.position.set(2.6, 12.8, 2.6);
    nose.add(driverHead);

    const driverVest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.8), new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 }));
    driverVest.position.set(2.6, 11.2, 2.6);
    nose.add(driverVest);

    // Wiper 1 on left emergency glass
    const wiperMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const wiper1Arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), wiperMat);
    wiper1Arm.position.set(5.6, 11.8, -3.2);
    wiper1Arm.rotation.z = -0.42;
    nose.add(wiper1Arm);

    // Wipers 2 & 3 (parallel pair) on right driver windshield
    [1.5, 3.8].forEach(wz => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.12), wiperMat);
      wiper.position.set(5.7, 11.9, wz);
      wiper.rotation.z = 0.38;
      nose.add(wiper);
    });

    // 3. MIDDLE BRIGHT-WHITE APRON FACE (#f8fafc)
    const apronGeo = new THREE.BoxGeometry(2.4, 4.6, 13.56);
    const apron = new THREE.Mesh(apronGeo, metroWhiteMat);
    apron.position.set(6.2, 7.6, 0);
    apron.rotation.z = -0.12;
    nose.add(apron);

    // Vertical panel seam for left emergency door
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4.6, 0.08), darkChassisMat);
    seam.position.set(7.35, 7.6, -2.2);
    seam.rotation.z = -0.12;
    nose.add(seam);

    // DMTCL Metro Emblem Badge
    const dmtclTex = getMetroDmtclLogoTexture();
    if (dmtclTex) {
      const emblem = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 20),
        new THREE.MeshBasicMaterial({ map: dmtclTex, transparent: true })
      );
      emblem.rotation.y = Math.PI / 2;
      emblem.rotation.x = -0.12;
      emblem.position.set(7.48, 9.2, 0);
      nose.add(emblem);
    }

    // Twin Pairs of Recessed Circular Headlights (4 total)
    [[-4.5, -3.1], [3.1, 4.5]].forEach(podPair => {
      podPair.forEach(hz => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.45, 18), chromeMat);
        bezel.rotation.z = Math.PI / 2;
        bezel.position.set(7.2, 7.5, hz);
        nose.add(bezel);

        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.25, 16), headlightLensMat);
        lens.rotation.z = Math.PI / 2;
        lens.position.set(7.35, 7.5, hz);
        nose.add(lens);
      });
    });

    // 4. LOWER CRIMSON-RED COWCATCHER SKIRT (#dc2626)
    const skirtGeo = new THREE.BoxGeometry(3.2, 3.4, 13.56);
    const skirt = new THREE.Mesh(skirtGeo, metroRedMat);
    skirt.position.set(5.8, 3.6, 0);
    skirt.rotation.z = -0.18;
    nose.add(skirt);

    // Central Recessed Coupler Bay
    const couplerBay = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 4.2), darkChassisMat);
    couplerBay.position.set(6.6, 3.4, 0);
    nose.add(couplerBay);

    // Scharfenberg Automatic Coupler
    const couplerShank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.8, 12), darkChassisMat);
    couplerShank.rotation.z = Math.PI / 2;
    couplerShank.position.set(7.8, 3.4, 0);
    nose.add(couplerShank);

    const couplerHead = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.4), chromeMat);
    couplerHead.position.set(9.6, 3.4, 0);
    nose.add(couplerHead);

    // Dual flexible pneumatic air brake hoses
    [-1.6, 1.6].forEach(bz => {
      const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(6.8, 4.0, bz),
        new THREE.Vector3(7.4, 2.8, bz * 0.8),
        new THREE.Vector3(8.0, 3.2, bz * 0.6)
      ]);
      const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 8, 0.10, 6, false), darkChassisMat);
      nose.add(hose);
    });

    // Forward Headlight Light Pool (for lead cab)
    if (isForward) {
      const lightPool = new THREE.Mesh(
        new THREE.PlaneGeometry(65, 22),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      lightPool.rotation.x = -Math.PI / 2;
      lightPool.position.set(40, 0.2, 0);
      nose.add(lightPool);
    }

    if (!isForward) {
      nose.rotation.y = Math.PI;
    }
    return nose;
  }

  // Articulated Single-Arm / Diamond High-Speed Pantograph
  function createMetroPantograph() {
    const panto = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.22
    });
    const insulatorMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.45,
      metalness: 0.15
    });
    const carbonShoeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.70
    });

    // 4 terracotta ceramic insulator stacks
    [[-1.8, -2.4], [-1.8, 2.4], [1.8, -2.4], [1.8, 2.4]].forEach(([ix, iz]) => {
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.0, 10), insulatorMat);
      ins.position.set(ix, 0.5, iz);
      panto.add(ins);
    });

    // Base mounting frame bars
    const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.22, 5.4), steelMat);
    baseFrame.position.set(0, 1.0, 0);
    panto.add(baseFrame);

    // Lower articulated arm tubes
    [-1.6, 1.6].forEach(az => {
      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.4, 1.1, az),
        new THREE.Vector3(1.2, 4.4, az * 0.7)
      ]);
      panto.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 8, 0.14, 8, false), steelMat));
    });

    // Upper articulated diamond arm tubes converging to collector head
    [-1.0, 1.0].forEach(az => {
      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.2, 4.4, az),
        new THREE.Vector3(-0.8, 7.8, az * 0.6)
      ]);
      panto.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 8, 0.12, 8, false), steelMat));
    });

    // Upper collector head / contact shoe (touches catenary wire)
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 8.4), steelMat);
    shoe.position.set(-0.8, 7.9, 0);
    panto.add(shoe);

    // Carbon contact strip on top of shoe
    const carbonStrip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 7.8), carbonShoeMat);
    carbonStrip.position.set(-0.8, 8.05, 0);
    panto.add(carbonStrip);

    // Curved drooping horn tips on left and right ends of shoe
    [-4.2, 4.2].forEach(hz => {
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.8, 7.9, hz * 0.95),
        new THREE.Vector3(-0.8, 7.5, hz * 1.05),
        new THREE.Vector3(-0.8, 6.9, hz * 1.08)
      ]);
      panto.add(new THREE.Mesh(new THREE.TubeGeometry(hornCurve, 6, 0.08, 6, false), steelMat));
    });

    return panto;
  }

  // 4-Wheel Mechanical Bogie / Truck riding on rails
  function createMetroBogie() {
    const bogie = new THREE.Group();
    const bogieMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.65,
      roughness: 0.45
    });
    const wheelSteelMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.85,
      roughness: 0.25
    });

    // Central bolster beam
    const bolster = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.8, 10.0), bogieMat);
    bolster.position.set(0, 1.2, 0);
    bogie.add(bolster);

    // Side frames
    [-4.8, 4.8].forEach(sz => {
      const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.9, 0.65), bogieMat);
      sideFrame.position.set(0, 0.9, sz);
      bogie.add(sideFrame);

      // Primary spring coils
      [-2.8, 2.8].forEach(sx => {
        const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 10), bogieMat);
        spring.position.set(sx, 1.2, sz);
        bogie.add(spring);
      });
    });

    // 4 Flanged Steel Wheels & 2 Axles
    [-2.8, 2.8].forEach(wx => {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 8.4, 10), bogieMat);
      axle.rotation.x = Math.PI / 2;
      axle.position.set(wx, 0.9, 0);
      bogie.add(axle);

      [-4.0, 4.0].forEach(wz => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.65, 20), wheelSteelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.9, wz);
        bogie.add(wheel);

        const flange = new THREE.Mesh(new THREE.CylinderGeometry(1.30, 1.30, 0.15, 20), wheelSteelMat);
        flange.rotation.x = Math.PI / 2;
        flange.position.set(wx, 0.9, wz + (wz > 0 ? 0.35 : -0.35));
        bogie.add(flange);
      });
    });

    return bogie;
  }

  // Master Kawasaki MRT Line-6 Stainless Steel Coach Builder
  function createTrainCoach(isLead, isRear, coachIndex) {
    const coach = new THREE.Group();
    const coachType = isLead ? 'lead' : isRear ? 'rear' : 'mid';

    const bodyLength = 68.0;
    const bodyWidth = 13.6;
    const bodyHeight = 14.5;
    const coachCenterY = 9.0;

    const stainlessMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.55,
      roughness: 0.32
    });
    const roofSilverMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.50,
      roughness: 0.35
    });
    const underframeMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.50,
      roughness: 0.70
    });
    const endWallMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.45,
      roughness: 0.40
    });

    const southSideTex = getMetroCoachSideTexture(coachType);
    const northCoachType = isLead ? 'rear' : isRear ? 'lead' : 'mid';
    const northSideTex = getMetroCoachSideTexture(northCoachType);
    let rightSideMat = stainlessMat;
    let leftSideMat = stainlessMat;
    if (southSideTex) {
      rightSideMat = new THREE.MeshStandardMaterial({
        map: southSideTex,
        metalness: 0.55,
        roughness: 0.32
      });
    }
    if (northSideTex) {
      leftSideMat = new THREE.MeshStandardMaterial({
        map: northSideTex,
        metalness: 0.55,
        roughness: 0.32
      });
    }

    // Material face array for BoxGeometry: [+X, -X, +Y, -Y, +Z, -Z]
    const bodyMaterials = [
      endWallMat,      // +X (front end wall)
      endWallMat,      // -X (rear end wall)
      roofSilverMat,   // +Y (top roof)
      underframeMat,   // -Y (bottom chassis)
      rightSideMat,    // +Z (South side flank)
      leftSideMat      // -Z (North side flank)
    ];

    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyLength, bodyHeight, bodyWidth), bodyMaterials);
    bodyMesh.position.set(0, coachCenterY, 0);
    bodyMesh.castShadow = true;
    coach.add(bodyMesh);

    // Corrugated Cambered Roof Cap & Ribs
    const roofArch = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 14, bodyLength, 24, 1, false, Math.PI * 0.38, Math.PI * 0.24),
      roofSilverMat
    );
    roofArch.rotation.z = Math.PI / 2;
    roofArch.position.set(0, coachCenterY + bodyHeight / 2 - 1.2, 0);
    coach.add(roofArch);

    // Longitudinal corrugated roof ribs
    [-4.5, -2.8, -1.0, 1.0, 2.8, 4.5].forEach(rz => {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, bodyLength - 2, 6), roofSilverMat);
      rib.rotation.z = Math.PI / 2;
      rib.position.set(0, coachCenterY + bodyHeight / 2 + 0.6, rz);
      coach.add(rib);
    });

    // Twin Trapezoidal HVAC Air Conditioning Pods
    const hvacGrilleTex = getMetroHvacGrilleTexture();
    [-16, 16].forEach(hx => {
      const hvacGroup = new THREE.Group();
      hvacGroup.position.set(hx, coachCenterY + bodyHeight / 2 + 1.2, 0);

      const hvacBody = new THREE.Mesh(
        new THREE.BoxGeometry(13.6, 1.9, 7.2),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.32, metalness: 0.15 })
      );
      hvacGroup.add(hvacBody);

      // Sloped aerodynamic end caps
      [-6.8, 6.8].forEach(ex => {
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 1.7, 6.8),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35 })
        );
        cap.position.set(ex, 0, 0);
        hvacGroup.add(cap);
      });

      // Side ventilation grilles
      if (hvacGrilleTex) {
        [-3.65, 3.65].forEach(gz => {
          const grille = new THREE.Mesh(
            new THREE.PlaneGeometry(12.0, 1.4),
            new THREE.MeshBasicMaterial({ map: hvacGrilleTex, transparent: true })
          );
          grille.position.set(0, 0, gz);
          if (gz < 0) grille.rotation.y = Math.PI;
          hvacGroup.add(grille);
        });
      }

      coach.add(hvacGroup);
    });

    // Pantograph on Intermediate Coach (coachIndex === 1)
    if (coachIndex === 1) {
      const panto = createMetroPantograph();
      panto.position.set(0, coachCenterY + bodyHeight / 2 + 0.3, 0);
      coach.add(panto);
    }

    // Cab Noses
    if (isLead) {
      const cabNose = createMetroCabNose(1);
      cabNose.position.set(bodyLength / 2, 0, 0);
      coach.add(cabNose);
    } else if (isRear) {
      const cabNose = createMetroCabNose(-1);
      cabNose.position.set(-bodyLength / 2, 0, 0);
      coach.add(cabNose);
    }

    // Accordion Gangway Bellows between coaches
    const bellowsMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.85,
      metalness: 0.10
    });
    const addGangway = (gx) => {
      const gangway = new THREE.Group();
      gangway.position.set(gx, coachCenterY, 0);
      for (let f = -3.2; f <= 3.2; f += 1.1) {
        const fold = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 12.2, 8.8),
          bellowsMat
        );
        fold.position.set(f, 0, 0);
        gangway.add(fold);
      }
      coach.add(gangway);
    };

    if (isLead) {
      addGangway(-bodyLength / 2 - 3.5);
    } else if (isRear) {
      addGangway(bodyLength / 2 + 3.5);
    } else {
      addGangway(-bodyLength / 2 - 3.5);
      addGangway(bodyLength / 2 + 3.5);
    }

    // Two 4-wheel mechanical bogies riding on rails
    const bogie1 = createMetroBogie();
    bogie1.position.set(21, 0, 0);
    coach.add(bogie1);

    const bogie2 = createMetroBogie();
    bogie2.position.set(-21, 0, 0);
    coach.add(bogie2);

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
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, metalness: 0.08 });
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

    // Continuous Weathered Concrete Box-Girder Deck (#94a3b8 / #cbd5e1)
    const beamGeo = new THREE.BoxGeometry(1400, 7, 26);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.78, metalness: 0.12 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, viaductY + 3.5, VIADUCT_Z);
    beam.castShadow = true;
    beam.receiveShadow = true;
    freezeStatic(beam);
    scene.add(beam);

    // Weathered Concrete U-Girder Side Parapet Barrier Walls with Panel Seams
    const parapetMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.80, metalness: 0.10 });
    [-13.0, 13.0].forEach(pz => {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(1400, 3.8, 1.4), parapetMat);
      parapet.position.set(0, viaductY + 7.0 + 1.9, VIADUCT_Z + pz);
      parapet.castShadow = true;
      freezeStatic(parapet);
      scene.add(parapet);
    });

    // Segmented precast concrete panel seams along outer parapet wall
    const parapetSeamMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    for (let sx = -650; sx <= 650; sx += 50) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.8, 0.15), parapetSeamMat);
      seam.position.set(sx, viaductY + 7.0 + 1.9, VIADUCT_Z + 13.78);
      freezeStatic(seam);
      scene.add(seam);
    }

    // Bangladesh Green & Red Ribbon Livery on Outer Parapet Fascia
    const greenRibbonGeo = new THREE.BoxGeometry(1400, 1.8, 0.4);
    const greenRibbonMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    const greenRibbon = new THREE.Mesh(greenRibbonGeo, greenRibbonMat);
    greenRibbon.position.set(0, viaductY + 7.0 + 2.4, VIADUCT_Z + 13.8);
    freezeStatic(greenRibbon);
    scene.add(greenRibbon);

    const redRibbonGeo = new THREE.BoxGeometry(1400, 1.2, 0.4);
    const redRibbonMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const redRibbon = new THREE.Mesh(redRibbonGeo, redRibbonMat);
    redRibbon.position.set(0, viaductY + 7.0 + 0.8, VIADUCT_Z + 13.8);
    freezeStatic(redRibbon);
    scene.add(redRibbon);

    // Dual Glowing Rails (head top surface at viaductY + 7.8 = 49.8)
    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const rail1Geo = new THREE.BoxGeometry(1400, 0.8, 1.4);
    const rail1 = new THREE.Mesh(rail1Geo, railMat);
    rail1.position.set(0, viaductY + 7.4, VIADUCT_Z - 4);
    freezeStatic(rail1);
    scene.add(rail1);

    const rail2Geo = new THREE.BoxGeometry(1400, 0.8, 1.4);
    const rail2 = new THREE.Mesh(rail2Geo, railMat);
    rail2.position.set(0, viaductY + 7.4, VIADUCT_Z + 4);
    freezeStatic(rail2);
    scene.add(rail2);

    // Arched Grey Tubular Steel Overhead Catenary Portal Gantries
    const catenaryMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45, metalness: 0.65 });
    const catenaryXs = [-560, -420, -280, -140, 0, 480, 600];

    catenaryXs.forEach(cx => {
      // Avoid placing gantry inside the station structure (x: 180 .. 440)
      if (cx >= 170 && cx <= 450) return;

      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(cx, viaductY + 7.0, VIADUCT_Z);

      // Left & right tubular steel vertical columns (height 29.0 reaching top of gantry)
      [-12.2, 12.2].forEach(cz => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 29.0, 10), catenaryMat);
        col.position.set(0, 14.5, cz);
        gantryGroup.add(col);
      });

      // Arched / horizontal cross-span truss beam
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 25.0), catenaryMat);
      crossBeam.position.set(0, 28.5, 0);
      gantryGroup.add(crossBeam);

      // Cantilever registration arms & ceramic insulators over tracks
      [-4.0, 4.0].forEach(tz => {
        const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 8), catenaryMat);
        drop.position.set(0, 26.8, tz);
        gantryGroup.add(drop);

        const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
        ins.position.set(0, 26.0, tz);
        gantryGroup.add(ins);
      });

      freezeStatic(gantryGroup);
      scene.add(gantryGroup);
    });

    // Continuous Overhead Catenary Contact Wire Touching Train Pantograph (world Y = 74.65)
    const wireGeo = new THREE.BoxGeometry(1400, 0.12, 0.12);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    const contactWire = new THREE.Mesh(wireGeo, wireMat);
    contactWire.position.set(0, viaductY + 7.0 + 25.65, VIADUCT_Z);
    freezeStatic(contactWire);
    scene.add(contactWire);

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
    trainGroup.position.set(-200, viaductY + 8.05, VIADUCT_Z);

    // Lead Coach (Driving Motor Car, facing forward +X with aerodynamic cab nose)
    const coach1 = createTrainCoach(true, false, 0);
    coach1.position.x = 75;
    trainGroup.add(coach1);

    // Intermediate Coach (Motor Car with articulated high-speed pantograph)
    const coach2 = createTrainCoach(false, false, 1);
    coach2.position.x = 0;
    trainGroup.add(coach2);

    // Rear Coach (Driving Motor Car, facing backward -X with aerodynamic cab nose)
    const coach3 = createTrainCoach(false, true, 2);
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
      // Disabled: Pure Three.js procedural dual motorcycles are authoritative
    }).catch(err => console.warn('Sportbike GLB fallback:', err));

    // Procedural Three.js 4-Model Car Fleet (AMG GT, Accord, Range Rover, LC300) is authoritative (no external GLB needed)

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
            title.textContent = `${(info.mesh && info.mesh.userData && info.mesh.userData.modelTitle) || 'Ride-share Sports Bike'} · ${dirLabel}`;
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

        // Auto-cycle bike models & 16 liveries across the master deck on lane wrap-around / respawn
        if (vm.mesh.userData.isBike && Math.abs(roadDelta) > 200) {
          const nextIdx = (globalNextBikeDeckIndex++) % BIKE_VARIANT_DECK.length;
          swapBikeVariant(vm.mesh, nextIdx);
        }
        // Auto-cycle car models & 16 liveries across the master deck on lane wrap-around / respawn
        if (vm.mesh.userData.isCar && Math.abs(roadDelta) > 200) {
          const nextIdx = (globalNextCarDeckIndex++) % CAR_VARIANT_DECK.length;
          swapCarVariant(vm.mesh, nextIdx);
        }
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
