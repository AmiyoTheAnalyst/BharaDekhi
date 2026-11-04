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
  let gltfPedTemplates = [];
  let activeMixers = [];
  let isRenderLoopPaused = false;
  let mixerFrameCounter = 0;
  let carArchetypeCounter = 0;

  function createDuskSkyGradientTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    // Rich dusk purple-to-magenta gradient (#1b1035 zenith blending into #5b2245 horizon)
    grad.addColorStop(0.0, '#1b1035');  // Zenith rich purple
    grad.addColorStop(0.35, '#2c123d');
    grad.addColorStop(0.68, '#5b2245'); // Dusk magenta
    grad.addColorStop(0.92, '#7a2858'); // Warm horizon sunset glow
    grad.addColorStop(1.0, '#923368');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // Real 3D GLTF Vehicle & Human Asset Registry
  const gltfCarTemplates = {};
  const gltfHumanTemplates = [];
  const socialPedestrians = [];
  const CAR_TINT_COLORS = [0x0047ab, 0xef4444, 0x84cc16, 0xf8fafc, 0xcbd5e1]; // Royal Blue, Crimson Red, Lime Green, Pearl White, Silver

  function getHeading(dir) {
    if (dir === 'EB') return 0;           // Facing +X (East)
    if (dir === 'WB') return Math.PI;      // Facing -X (West)
    if (dir === 'SB') return -Math.PI / 2; // Facing +Z (South)
    if (dir === 'NB') return Math.PI / 2;  // Facing -Z (North)
    return 0;
  }

  // Replace active live cars/buses/cngs/rickshaws in the scene graph with loaded GLTF models (capped to max 8)
  const MAX_GLTF_CARS = 8;
  function replaceLiveCarsWithGLTF() {
    if (!scene || !vehicleMeshMap) return;
    const carKeys = Object.keys(gltfCarTemplates).filter(k => k !== 'truck');
    if (carKeys.length === 0 && !gltfCarTemplates.truck) return;

    let carIdx = 0;
    let gltfCarCount = 0;

    for (const id in vehicleMeshMap) {
      if (gltfCarCount >= MAX_GLTF_CARS) break;

      const vm = vehicleMeshMap[id];
      if (!vm || !vm.data) continue;
      const vType = vm.data.type;

      const isCar = (vType === 'car' || vType === 'bike');
      const isTruck = (vType === 'bus' && gltfCarTemplates.truck);
      const isCompact = ((vType === 'cng' || vType === 'rickshaw') && (gltfCarTemplates.toycar || carKeys.length > 0));

      if ((isCar || isTruck || isCompact) && !vm.isGLTF) {
        let chosenKey = 'ferrari';
        if (isTruck) {
          chosenKey = 'truck';
        } else if (isCompact && gltfCarTemplates.toycar) {
          chosenKey = 'toycar';
        } else if (carKeys.length > 0) {
          chosenKey = carKeys[carIdx % carKeys.length];
          carIdx++;
        }

        const template = gltfCarTemplates[chosenKey];
        if (!template) continue;

        const gltfClone = template.clone(true);
        const tint = CAR_TINT_COLORS[carIdx % CAR_TINT_COLORS.length];

        // Tint body materials with diverse colors: Royal Blue, Crimson Red, Lime Green, Pearl White, Silver
        gltfClone.traverse(child => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.frustumCulled = true;
            if (child.material) {
              child.material = child.material.clone();
              const nm = (child.name || '').toLowerCase();
              const mn = (child.material.name || '').toLowerCase();
              if (nm.includes('body') || nm.includes('paint') || nm.includes('car') ||
                  mn.includes('body') || nm.includes('paint') || nm.includes('red') || nm.includes('car') ||
                  (!nm.includes('wheel') && !nm.includes('tire') && !nm.includes('glass') && !nm.includes('window') && !nm.includes('glass') && !nm.includes('tire'))) {
                if (child.material.color) {
                  child.material.color.setHex(tint);
                }
              }
            }
          }
        });

        const prevPos = (vm.mesh && vm.mesh.position) ? vm.mesh.position.clone() : new THREE.Vector3();

        // Completely remove old BoxGeometry mesh from scene graph
        if (vm.mesh) {
          scene.remove(vm.mesh);
          vm.mesh.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
              else obj.material.dispose();
            }
          });
        }

        // Situate new real GLTF model
        gltfClone.position.copy(prevPos);
        gltfClone.rotation.y = getHeading(vm.data.dir);
        scene.add(gltfClone);

        vm.mesh = gltfClone;
        vm.isGLTF = true;
        gltfCarCount++;
      }
    }
  }

  // Replace live pedestrians in the scene graph with loaded animated GLTF models (capped to max 6)
  const MAX_GLTF_PEDS = 6;
  function replaceLivePedestriansWithGLTF() {
    if (!scene || gltfHumanTemplates.length === 0) return;
    if (typeof THREE.SkeletonUtils === 'undefined') return;

    let humanIdx = 0;
    let gltfPedCount = 0;

    if (pedMeshMap) {
      for (const key in pedMeshMap) {
        if (gltfPedCount >= MAX_GLTF_PEDS) break;

        const pm = pedMeshMap[key];
        if (!pm || !pm.data || pm.isGLTF) continue;

        const template = gltfHumanTemplates[humanIdx % gltfHumanTemplates.length];
        humanIdx++;
        if (!template || !template.model) continue;

        try {
          const clone = THREE.SkeletonUtils.clone(template.model);
          clone.traverse(child => {
            if (child.isSkinnedMesh || child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              child.frustumCulled = true;
            }
          });

          const mixer = new THREE.AnimationMixer(clone);
          if (template.animations && template.animations.length > 0) {
            const walkClip = template.animations.find(c => /walk|run/i.test(c.name)) || template.animations[0];
            if (walkClip) {
              const action = mixer.clipAction(walkClip);
              action.play();
            }
          }
          activeMixers.push(mixer);

          const prevPos = (pm.mesh && pm.mesh.position) ? pm.mesh.position.clone() : new THREE.Vector3();
          const prevRotY = pm.mesh ? pm.mesh.rotation.y : 0;

          // Completely remove old procedural mesh from scene graph
          if (pm.mesh) {
            scene.remove(pm.mesh);
            pm.mesh.traverse(obj => {
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
              }
            });
          }

          clone.position.copy(prevPos);
          clone.rotation.y = prevRotY;
          scene.add(clone);

          pm.mesh = clone;
          pm.isGLTF = true;
          pm.mixer = mixer;
          gltfPedCount++;
        } catch (err) {
          console.warn('Pedestrian replacement error:', err);
        }
      }
    }

    // Also replace standing sidewalk social group pedestrians (Pose ONCE, NO continuous mixer updates)
    socialPedestrians.forEach(sp => {
      if (!sp || sp.isGLTF || !sp.mesh || !sp.parent) return;
      const template = gltfHumanTemplates[humanIdx % gltfHumanTemplates.length];
      humanIdx++;
      if (!template || !template.model) return;
      try {
        const clone = THREE.SkeletonUtils.clone(template.model);
        clone.traverse(child => {
          if (child.isSkinnedMesh || child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.frustumCulled = true;
          }
        });
        const mixer = new THREE.AnimationMixer(clone);
        if (template.animations && template.animations.length > 0) {
          const idleClip = template.animations.find(c => /idle|stand/i.test(c.name)) || template.animations[0];
          if (idleClip) {
            const action = mixer.clipAction(idleClip);
            action.play();
          }
        }
        mixer.update(0.1); // Update ONCE to pose standing character — DO NOT push into activeMixers[]!

        clone.position.copy(sp.mesh.position);
        clone.rotation.y = sp.mesh.rotation.y;
        sp.parent.remove(sp.mesh);
        sp.mesh.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
        sp.parent.add(clone);
        sp.mesh = clone;
        sp.isGLTF = true;
      } catch (e) {}
    });
  }

  let gltfAssetManagerInitialized = false;
  function initGLTFAssetManager() {
    if (gltfAssetManagerInitialized) return;
    if (typeof THREE.GLTFLoader !== 'function') return;
    gltfAssetManagerInitialized = true;

    try {
      const loader = new THREE.GLTFLoader();
      if (typeof THREE.DRACOLoader === 'function') {
        const draco = new THREE.DRACOLoader();
        draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        loader.setDRACOLoader(draco);
      }

      // 1. Real 3D Sports Cars & Transit Vehicles (.glb)
      const carSources = [
        {
          key: 'ferrari',
          urls: [
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb',
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/ferrari.glb',
            'https://unpkg.com/three@0.128.0/examples/models/gltf/ferrari.glb'
          ],
          targetLength: 46
        },
        {
          key: 'toycar',
          urls: [
            'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/ToyCar/glTF-Binary/ToyCar.glb',
            'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/ToyCar/glTF-Binary/ToyCar.glb'
          ],
          targetLength: 42
        },
        {
          key: 'truck',
          urls: [
            'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
            'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb'
          ],
          targetLength: 68
        }
      ];

      function tryLoadModel(urls, uIdx, onSuccess) {
        if (uIdx >= urls.length) return;
        loader.load(urls[uIdx], (gltf) => {
          onSuccess(gltf);
        }, undefined, () => {
          tryLoadModel(urls, uIdx + 1, onSuccess);
        });
      }

      carSources.forEach(src => {
        tryLoadModel(src.urls, 0, (gltf) => {
          if (gltf && gltf.scene) {
            const rawModel = gltf.scene;

            // Strip expensive physical shaders and textures to guarantee high FPS on PC & mobile
            rawModel.traverse(node => {
              if (node.isMesh) {
                node.castShadow = false;
                node.receiveShadow = false;
                node.frustumCulled = true;

                if (node.material) {
                  const oldMat = Array.isArray(node.material) ? node.material[0] : node.material;
                  const baseCol = oldMat.color ? oldMat.color.clone() : new THREE.Color(0xd1d5db);

                  // Dispose heavy embedded normal/roughness/metalness/transmission textures
                  if (oldMat.map) oldMat.map.dispose();
                  if (oldMat.normalMap) oldMat.normalMap.dispose();
                  if (oldMat.roughnessMap) oldMat.roughnessMap.dispose();
                  if (oldMat.metalnessMap) oldMat.metalnessMap.dispose();
                  if (oldMat.transmissionMap) oldMat.transmissionMap.dispose();
                  if (oldMat.clearcoatMap) oldMat.clearcoatMap.dispose();

                  node.material = new THREE.MeshStandardMaterial({
                    color: baseCol,
                    roughness: 0.35,
                    metalness: 0.30
                  });
                }
              }
            });

            // Compute bounding box
            const b1 = new THREE.Box3().setFromObject(rawModel);
            const sz1 = new THREE.Vector3();
            b1.getSize(sz1);
            if (sz1.z > sz1.x) {
              rawModel.rotation.y = Math.PI / 2; // Orient along +X
            }

            const wrapper = new THREE.Group();
            wrapper.add(rawModel);

            const b2 = new THREE.Box3().setFromObject(wrapper);
            const sz2 = new THREE.Vector3();
            b2.getSize(sz2);

            const maxLen = Math.max(sz2.x, sz2.z);
            const scale = src.targetLength / Math.max(0.1, maxLen);
            wrapper.scale.set(scale, scale, scale);

            const b3 = new THREE.Box3().setFromObject(wrapper);
            wrapper.position.x -= (b3.min.x + b3.max.x) / 2;
            wrapper.position.z -= (b3.min.z + b3.max.z) / 2;
            wrapper.position.y -= b3.min.y; // Wheels sit flush on ground: y = 0

            wrapper.traverse(node => {
              if (node.isMesh) {
                node.castShadow = false;
                node.receiveShadow = false;
                node.frustumCulled = true;
              }
            });

            const templateGroup = new THREE.Group();
            templateGroup.add(wrapper);
            gltfCarTemplates[src.key] = templateGroup;

            // Immediately replace live cars/trucks in scene
            replaceLiveCarsWithGLTF();
          }
        });
      });

      // 2. Real Rigged Animated 3D Humans (.glb)
      const humanSources = [
        {
          key: 'soldier',
          urls: [
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb',
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Soldier.glb',
            'https://unpkg.com/three@0.128.0/examples/models/gltf/Soldier.glb'
          ],
          targetHeight: 12.5
        },
        {
          key: 'michelle',
          urls: [
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Michelle.glb',
            'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/models/gltf/Michelle.glb',
            'https://unpkg.com/three@0.128.0/examples/models/gltf/Michelle.glb'
          ],
          targetHeight: 12.0
        },
        {
          key: 'cesiumman',
          urls: [
            'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
            'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb'
          ],
          targetHeight: 12.0
        }
      ];

      humanSources.forEach(src => {
        tryLoadModel(src.urls, 0, (gltf) => {
          if (gltf && gltf.scene) {
            const rawHuman = gltf.scene;

            // Align forward orientation with coordinate system facing +X
            rawHuman.rotation.y = Math.PI / 2;

            const wrapper = new THREE.Group();
            wrapper.add(rawHuman);

            const box = new THREE.Box3().setFromObject(wrapper);
            const size = new THREE.Vector3();
            box.getSize(size);
            const scale = src.targetHeight / Math.max(0.1, size.y);
            wrapper.scale.set(scale, scale, scale);

            const b2 = new THREE.Box3().setFromObject(wrapper);
            wrapper.position.y -= b2.min.y; // Shoes sit flush on ground: y = 0
            wrapper.position.x -= (b2.min.x + b2.max.x) / 2;
            wrapper.position.z -= (b2.min.z + b2.max.z) / 2;

            wrapper.traverse(node => {
              if (node.isSkinnedMesh || node.isMesh) {
                node.castShadow = false;
                node.receiveShadow = false;
                node.frustumCulled = true;
              }
            });

            const templateGroup = new THREE.Group();
            templateGroup.add(wrapper);

            gltfHumanTemplates.push({
              key: src.key,
              model: templateGroup,
              animations: gltf.animations || []
            });

            // Immediately replace live pedestrians in scene
            replaceLivePedestriansWithGLTF();
          }
        });
      });

    } catch (e) {
      console.warn('initGLTFAssetManager exception:', e);
    }
  }

  // Preload GLTF assets in background as soon as script evaluates
  if (typeof window !== 'undefined') {
    setTimeout(initGLTFAssetManager, 100);
  }

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

    ctx.fillStyle = wallColor || '#0d9488';
    ctx.fillRect(0, 0, 256, 256);

    const floorH = 256 / Math.max(1, floors);
    const colW = 256 / Math.max(1, cols);

    for (let f = 0; f < floors; f++) {
      // Art Deco horizontal floor separator groove
      ctx.fillStyle = 'rgba(0,0,0,0.40)';
      ctx.fillRect(0, f * floorH + floorH - 3, 256, 3);

      for (let c = 0; c < cols; c++) {
        const x = c * colW + colW * 0.16;
        const y = f * floorH + floorH * 0.18;
        const w = colW * 0.68;
        const h = floorH * 0.60;

        // Recessed outer frame
        ctx.fillStyle = 'rgba(10, 15, 26, 0.90)';
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

        // Pseudorandom window illumination (75% lit warm amber, 25% dark glass reflection)
        const hash = Math.sin((f + 1) * 37.1 + (c + 1) * 19.3);
        const isLit = (hash - Math.floor(hash)) > 0.25;

        if (isLit) {
          // Warm interior amber glow (#fde68a / #fef08a)
          const amberCol = winColor || '#fde68a';
          ctx.fillStyle = amberCol;
          ctx.fillRect(x, y, w, h);

          // Subtle warm interior curtain / shade gradient
          const winGrad = ctx.createLinearGradient(x, y, x, y + h);
          winGrad.addColorStop(0.0, 'rgba(254, 240, 138, 0.95)');
          winGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.85)');
          winGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0.70)');
          ctx.fillStyle = winGrad;
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(x, y, w, h);
          // Diagonal glass reflection
          ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
          ctx.beginPath();
          ctx.moveTo(x, y + h);
          ctx.lineTo(x + w * 0.45, y);
          ctx.lineTo(x + w * 0.75, y);
          ctx.lineTo(x + w * 0.30, y + h);
          ctx.fill();
        }

        // 4-Pane Recessed Architectural Window Mullion Grid
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        // Vertical mullion
        ctx.fillRect(x + w / 2 - 0.9, y, 1.8, h);
        // Horizontal mullion
        ctx.fillRect(x, y + h / 2 - 0.9, w, 1.8);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
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

    // 5. Colored PointLight Pool washing down facades and sidewalks
    const neonLight = new THREE.PointLight(neonHex, 1.25, 80);
    neonLight.position.set(0, h1 - 2, (d1 / 2) + 6);
    group.add(neonLight);

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
    const typeIdx = (archetypeIdx !== undefined ? archetypeIdx : (carArchetypeCounter++)) % 6;
    const group = new THREE.Group();
    group.userData.wheels = [];

    // Smooth Aerodynamic Side Profile (THREE.Shape with bezierCurveTo)
    const shape = new THREE.Shape();
    // Start at rear lower bumper / diffuser
    shape.moveTo(-2.1, 0.25);
    // Rear diffuser curve up to decklid
    shape.bezierCurveTo(-2.15, 0.45, -2.1, 0.65, -1.95, 0.75);
    shape.lineTo(-1.5, 0.78);
    // Sloping fastback rear window up to roofline
    shape.bezierCurveTo(-1.3, 0.90, -0.85, 1.25, -0.35, 1.28);
    // Low sleek roofline
    shape.lineTo(0.2, 1.28);
    // Raked aerodynamic windshield
    shape.bezierCurveTo(0.7, 1.22, 1.15, 0.75, 1.35, 0.68);
    // Aggressive sloping hood
    shape.bezierCurveTo(1.55, 0.62, 1.85, 0.48, 2.05, 0.38);
    // Front carbon splitter nose
    shape.lineTo(2.15, 0.28);
    shape.lineTo(2.05, 0.18);
    shape.lineTo(1.65, 0.18);
    // Recessed front wheel well arch
    shape.bezierCurveTo(1.65, 0.65, 0.95, 0.65, 0.95, 0.18);
    shape.lineTo(-0.95, 0.18);
    // Recessed rear wheel well arch
    shape.bezierCurveTo(-0.95, 0.65, -1.65, 0.65, -1.65, 0.18);
    shape.lineTo(-2.1, 0.25);

    const extrudeSettings = {
      depth: 1.7,
      bevelEnabled: true,
      bevelThickness: 0.18,
      bevelSize: 0.15,
      bevelSegments: 8,
      curveSegments: 16
    };
    const bodyGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Center extrusion across Z
    bodyGeo.translate(0, 0, -1.7 / 2);

    // 6 Specific Archetype Parameter Settings
    let bodyColorHex = 0xf8fafc;
    let roughness = 0.20;
    let metalness = 0.60;
    let rimColorHex = 0xd1d5db;
    let darkRimCenter = false;

    if (typeIdx === 0) {
      // 1. Two-Tone Bugatti/Hypercar: Royal Blue #0047ab & Carbon Black shell
      bodyColorHex = 0x0047ab;
      roughness = 0.12;
      metalness = 0.75;
      rimColorHex = 0xe2e8f0;
    } else if (typeIdx === 1) {
      // 2. White Racing Supercar: Glossy pearl white #f8fafc with dual crimson racing stripes
      bodyColorHex = 0xf8fafc;
      roughness = 0.10;
      metalness = 0.35;
      rimColorHex = 0x94a3b8;
    } else if (typeIdx === 2) {
      // 3. Crimson & Black Aero Hypercar: Crimson red #ef4444, aggressive aero & rear spoiler wing
      bodyColorHex = 0xef4444;
      roughness = 0.18;
      metalness = 0.65;
      rimColorHex = 0x27272a;
      darkRimCenter = true;
    } else if (typeIdx === 3) {
      // 4. Lime-Green Neon Coupe: #84cc16, black hood scoop, glowing neon-yellow LED strips
      bodyColorHex = 0x84cc16;
      roughness = 0.22;
      metalness = 0.45;
      rimColorHex = 0x18181b;
      darkRimCenter = true;
    } else if (typeIdx === 4) {
      // 5. Silver Retro Wedge Coupe: #cbd5e1, sharp gullwing silhouette, quad headlights
      bodyColorHex = 0xcbd5e1;
      roughness = 0.25;
      metalness = 0.90;
      rimColorHex = 0xe2e8f0;
    } else {
      // 6. Night Muscle & Street Sedan: Midnight obsidian #0f172a, bright ice-blue xenon quad headlights + SpotLight
      bodyColorHex = 0x0f172a;
      roughness = 0.30;
      metalness = 0.70;
      rimColorHex = 0x94a3b8;
    }

    const carMat = new THREE.MeshStandardMaterial({
      color: bodyColorHex,
      roughness: roughness,
      metalness: metalness
    });

    const bodyMesh = new THREE.Mesh(bodyGeo, carMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Dark Curved Glass Canopy (THREE.Shape Extrusion)
    const canopyShape = new THREE.Shape();
    canopyShape.moveTo(-1.35, 0.76);
    canopyShape.bezierCurveTo(-1.22, 0.88, -0.80, 1.24, -0.32, 1.26);
    canopyShape.lineTo(0.18, 1.26);
    canopyShape.bezierCurveTo(0.68, 1.20, 1.12, 0.74, 1.30, 0.68);
    canopyShape.lineTo(0.85, 0.68);
    canopyShape.bezierCurveTo(0.35, 0.72, -0.65, 0.72, -1.35, 0.76);

    const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, {
      depth: 1.54,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 6,
      curveSegments: 16
    });
    canopyGeo.translate(0, 0, -1.54 / 2);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.08,
      metalness: 0.85
    });
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    group.add(canopyMesh);

    // Archetype-Specific Curved Details:
    if (typeIdx === 0) {
      // Bugatti Two-Tone: Curved C-Pillar side air intakes in Carbon Black
      [-1, 1].forEach(side => {
        const cPillarShape = new THREE.Shape();
        cPillarShape.moveTo(-0.8, 0.3);
        cPillarShape.bezierCurveTo(-0.8, 1.15, 0.2, 1.15, 0.2, 0.95);
        cPillarShape.bezierCurveTo(0.2, 0.45, -0.5, 0.3, -0.8, 0.3);
        const cPillarGeo = new THREE.ExtrudeGeometry(cPillarShape, { depth: 0.08, bevelEnabled: false });
        cPillarGeo.translate(0, 0, side * 0.86);
        const cPillarMesh = new THREE.Mesh(cPillarGeo, new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.8 }));
        group.add(cPillarMesh);
      });
    } else if (typeIdx === 1) {
      // White Racing Supercar: Dual crimson-red racing stripes down hood & roof
      [-0.15, 0.15].forEach(sz => {
        const stripeShape = new THREE.Shape();
        stripeShape.moveTo(0.2, 1.29);
        stripeShape.bezierCurveTo(0.7, 1.23, 1.15, 0.76, 1.35, 0.69);
        stripeShape.bezierCurveTo(1.55, 0.63, 1.85, 0.49, 2.05, 0.39);
        stripeShape.lineTo(2.05, 0.35);
        stripeShape.lineTo(0.2, 1.25);
        const stripeGeo = new THREE.ExtrudeGeometry(stripeShape, { depth: 0.12, bevelEnabled: false });
        stripeGeo.translate(0, 0, sz - 0.06);
        const stripeMesh = new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        group.add(stripeMesh);
      });
    } else if (typeIdx === 2) {
      // Crimson Aero Hypercar: Curved Front Splitter & Elevated Rear GT Wing
      const wingGeo = new THREE.CylinderGeometry(0.08, 0.24, 1.6, 12);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.8 });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.rotation.x = Math.PI / 2;
      wing.position.set(-1.85, 1.05, 0);
      group.add(wing);

      // Dual wing upright stanchions
      [-0.45, 0.45].forEach(wz => {
        const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32, 6), wingMat);
        stanchion.position.set(-1.85, 0.90, wz);
        group.add(stanchion);
      });
    } else if (typeIdx === 3) {
      // Lime-Green Neon Coupe: Black hood scoop & Neon Yellow glowing LED strips
      const scoopGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.38, 8);
      const scoopMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });
      const scoop = new THREE.Mesh(scoopGeo, scoopMat);
      scoop.position.set(0.9, 0.82, 0);
      group.add(scoop);

      // Glowing Neon Yellow LED side skirts
      [-0.86, 0.86].forEach(sideZ => {
        const neonSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 6), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
        neonSkirt.rotation.z = Math.PI / 2;
        neonSkirt.position.set(0, 0.20, sideZ);
        group.add(neonSkirt);
      });
    } else if (typeIdx === 4) {
      // Silver Retro Wedge: Quad rectangular vintage headlights
      [-0.48, 0.48].forEach(hz => {
        const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.20, 8), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
        hl.rotation.x = Math.PI / 2;
        hl.position.set(2.10, 0.38, hz);
        group.add(hl);
      });
    } else if (typeIdx === 5) {
      // Night Muscle Sedan: Bright ice-blue xenon quad headlights casting real SpotLight beam
      [-0.45, 0.45].forEach(hz => {
        const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
        hl.rotation.x = Math.PI / 2;
        hl.position.set(2.12, 0.40, hz);
        group.add(hl);
      });

      // Real Three.js SpotLight casting forward onto asphalt ahead
      const xenonSpot = new THREE.SpotLight(0x60a5fa, 2.8, 140, Math.PI / 6, 0.45, 1.2);
      xenonSpot.position.set(2.2, 0.40, 0);
      xenonSpot.target.position.set(16, 0, 0);
      group.add(xenonSpot);
      group.add(xenonSpot.target);
    }

    // Common Front Headlights & Rear Taillights
    if (typeIdx !== 4 && typeIdx !== 5) {
      [-0.48, 0.48].forEach(hz => {
        const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), vehicleHeadlightMat || new THREE.MeshBasicMaterial({ color: 0xffffff }));
        hl.rotation.x = Math.PI / 2;
        hl.position.set(2.12, 0.38, hz);
        group.add(hl);
      });
    }

    // Rear Ruby-Red LED Taillight Bar
    const tlMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.25, 8), vehicleTaillightMat || new THREE.MeshBasicMaterial({ color: 0xff1744 }));
    tlMesh.rotation.x = Math.PI / 2;
    tlMesh.position.set(-2.08, 0.68, 0);
    group.add(tlMesh);

    // 4 Wheels: 10-Spoke Metallic Alloy Rims (radius 0.30, width 0.18)
    const wheelRadius = 0.30;
    const wheelWidth = 0.18;
    [-0.86, 0.86].forEach(wz => {
      [-1.3, 1.3].forEach(wx => {
        const wheel = create10SpokeAlloyWheel(wheelRadius, wheelWidth, rimColorHex, darkRimCenter);
        wheel.position.set(wx, 0.30, wz);
        group.add(wheel);
        group.userData.wheels.push(wheel);
      });
    });

    // Scale whole car to coordinate scale of scene (Length 42, Width 17, Height 12.8)
    group.scale.set(10, 10, 10);
    return group;
  }
  window.createCurvedSportsCar = createCurvedSportsCar;

  // 3D Canonical Vehicle Builders (all built facing +X direction)
  function create3DVehicle(type, colorHex) {
    const carKeys = Object.keys(gltfCarTemplates).filter(k => k !== 'truck');
    if ((type === 'car' || type === 'bike' || type === 'cng' || type === 'rickshaw') && carKeys.length > 0) {
      const chosenKey = (type === 'cng' || type === 'rickshaw') && gltfCarTemplates.toycar ? 'toycar' : carKeys[Math.floor(Math.random() * carKeys.length)];
      const template = gltfCarTemplates[chosenKey];
      if (template) {
        const clone = template.clone(true);
        const tint = colorHex || CAR_TINT_COLORS[Math.floor(Math.random() * CAR_TINT_COLORS.length)];
        clone.traverse(child => {
          if (child.isMesh && child.material) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = child.material.clone();
            const nm = (child.name || '').toLowerCase();
            const mn = (child.material.name || '').toLowerCase();
            if (nm.includes('body') || nm.includes('paint') || nm.includes('car') ||
                mn.includes('body') || mn.includes('paint') || mn.includes('red') || mn.includes('car') ||
                (!nm.includes('wheel') && !nm.includes('tire') && !nm.includes('glass') && !nm.includes('window') && !mn.includes('glass') && !mn.includes('tire'))) {
              if (child.material.color) {
                child.material.color.setHex(tint);
              }
            }
          }
        });
        clone.userData.isGLTF = true;
        scene.add(clone);
        return clone;
      }
    }
    if (type === 'bus' && gltfCarTemplates.truck) {
      const clone = gltfCarTemplates.truck.clone(true);
      clone.userData.isGLTF = true;
      scene.add(clone);
      return clone;
    }

    if (type === 'car') {
      return createCurvedSportsCar();
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

  // 3D Human Pedestrian Builder — Real Rigged Animated GLTF Humans with Skeletal AnimationMixer
  function create3DPedestrian(p) {
    // 1. Instantiate real rigged animated 3D human (.glb) if templates ready
    if (gltfHumanTemplates.length > 0 && typeof THREE.SkeletonUtils !== 'undefined') {
      const templateIdx = Math.abs(Math.floor((p.id || 0) * 17)) % gltfHumanTemplates.length;
      const template = gltfHumanTemplates[templateIdx];
      if (template && template.model) {
        try {
          const clone = THREE.SkeletonUtils.clone(template.model);
          clone.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          const mixer = new THREE.AnimationMixer(clone);
          if (template.animations && template.animations.length > 0) {
            const walkClip = template.animations.find(c => /walk|run/i.test(c.name)) || template.animations[0];
            if (walkClip) {
              const action = mixer.clipAction(walkClip);
              action.play();
            }
          }
          activeMixers.push(mixer);
          clone.userData.isGLTF = true;
          clone.userData.mixer = mixer;
          scene.add(clone);
          return clone;
        } catch (e) {
          console.warn('Failed to clone GLTF human template:', e);
        }
      }
    }

    // 2. Extruded contoured anatomical spline human (ZERO cylinders or spheres)
    const group = new THREE.Group();
    const humanShape = new THREE.Shape();
    humanShape.moveTo(0, 0);
    humanShape.lineTo(0.5, 0.2);
    humanShape.lineTo(0.45, 4.2);
    humanShape.lineTo(0.85, 5.0);
    humanShape.lineTo(1.05, 7.5);
    humanShape.lineTo(0.4, 8.5);
    humanShape.bezierCurveTo(0.85, 9.2, 0.85, 11.2, 0, 11.4);
    humanShape.bezierCurveTo(-0.85, 11.2, -0.85, 9.2, -0.4, 8.5);
    humanShape.lineTo(-1.05, 7.5);
    humanShape.lineTo(-0.85, 5.0);
    humanShape.lineTo(-0.45, 4.2);
    humanShape.lineTo(-0.5, 0.2);
    humanShape.closePath();

    const humanGeo = new THREE.ExtrudeGeometry(humanShape, {
      depth: 1.2,
      bevelEnabled: true,
      bevelThickness: 0.3,
      bevelSize: 0.2,
      bevelSegments: 4
    });
    humanGeo.center();

    const topPalette = [0x0284c7, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];
    const topColor = p.color ? parseInt(p.color.replace('#', '0x'), 16) : topPalette[Math.abs(Math.floor((p.id || 0) * 7)) % topPalette.length];
    const mesh = new THREE.Mesh(humanGeo, new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.55 }));
    mesh.position.y = 5.8;
    mesh.rotation.y = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    group.userData.isGLTF = false;
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
    scene.fog = new THREE.FogExp2(0x35193d, 0.0011);

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
    renderer.setPixelRatio(window.innerWidth < 768 ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25));
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

    // 4. Lighting: Balanced Sky Hemisphere + Ambient + Angled Directional Sun
    hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.4);
    scene.add(hemiLight);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    sunLight.position.set(300, 500, 250);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 50;
    sunLight.shadow.camera.far = 1400;
    sunLight.shadow.bias = -0.0005;
    const d = 550;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
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
        socialPedestrians.push({ mesh: friend, parent: clusterGroup, isGLTF: !!friend.userData.isGLTF });
      });
      scene.add(clusterGroup);
    });

    // Run immediate replacement if GLTF models were already cached/preloaded
    replaceLiveCarsWithGLTF();
    replaceLivePedestriansWithGLTF();

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
    initGLTFAssetManager();
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
  let lastIsMobile = null;

  window.updateDhakaCrossroads3D = function(dt, trainX, trainState, emergencyWaveActive, ambulanceX, activePhase, isRain, weatherMode) {
    if (!isReady || !renderer || !scene || !camera) return;
    if (isRenderLoopPaused) return;

    // 120Hz Delta-Time Physics (clamped to max 0.05 to avoid frame-skip spikes)
    const delta = clock ? Math.min(clock.getDelta(), 0.05) : (dt || 0.016);

    // 0. Update Active Skeletal Animation Mixers (GLTF Pedestrians) throttled to every 2nd frame
    mixerFrameCounter++;
    if (mixerFrameCounter % 2 === 0) {
      const stepDelta = delta * 2;
      for (let m = 0; m < activeMixers.length; m++) {
        activeMixers[m].update(stepDelta);
      }
    }

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
        scene.background.setHex(isMobileScreen ? 0x24142b : 0x1e0e24);
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
        scene.background.setHex(isMobileScreen ? 0x1f1b29 : 0x16131f);
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
        scene.background.setHex(isMobileScreen ? 0x342238 : 0x27172b);
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
        scene.background.setHex(isMobileScreen ? 0x222836 : 0x1a202c);
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
        scene.background.setHex(0x0284c7);
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
        scene.background.setHex(isMobileScreen ? 0x262e3d : 0x1c2330);
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
        scene.background.setHex(isMobileScreen ? 0x3a1409 : 0x2c0d05);
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
        scene.background.setHex(isMobileScreen ? 0x241620 : 0x1b0f17);
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
        scene.background.setHex(isMobileScreen ? 0x301812 : 0x24100b);
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
        scene.background.setHex(isMobileScreen ? 0x718096 : 0x64748b);
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
        scene.background.setHex(isMobileScreen ? 0x091020 : 0x060c18);
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
        scene.background.setHex(isMobileScreen ? 0x080c16 : 0x050810);
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
        scene.background.setHex(isMobileScreen ? 0x0d1628 : 0x08101e);
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
        } else if (scene.background && scene.background.setHex) {
          scene.background.setHex(isMobileScreen ? 0x1b1035 : 0x140b29);
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

      if (pm.isGLTF) {
        pm.mesh.position.set(posX, 0, posZ);
        pm.mesh.rotation.y = rotY;
      } else {
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
          z: viaductZ + 68
        };
        desiredCamLook = {
          x: trainGroup.position.x + 40,
          y: 46,
          z: viaductZ
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

