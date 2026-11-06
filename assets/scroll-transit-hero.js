/**
 * Bhara dekhi — 3D Scroll-Triggered Storytelling Transit Hero
 * Genuine Three.js 3D Multimodal Studio Scene linked to GSAP ScrollTrigger
 * 
 * Features:
 * - 5-Stage 3D Camera & Lighting Choreography:
 *   Stage 1 (0% - 20%): Comparison of Bike, CNG & Car Fare (Spotlights Bike, CNG & Car)
 *   Stage 2 (20% - 40%): Rickshaw Fare Estimation (Focuses on iconic Dhaka cycle rickshaw)
 *   Stage 3 (40% - 60%): Smart Bus Route Discovery (BRTA Calibrated red-and-white city bus)
 *   Stage 4 (60% - 80%): Dhaka Metro Rail MRT Line-6 (Elevated viaduct and MRT-6 train)
 *   Stage 5 (80% - 100%): Weather Surge Pricing & Overview (Monsoon rain surge & fleet overview)
 * - 120 FPS delta-time physics, high-performance PBR materials, zero layout blocking
 * - Automatically pauses render loop via IntersectionObserver when scrolled off-screen
 */

(function() {
  'use strict';

  let scene, camera, renderer, clock;
  let canvasEl, containerEl;
  let isReady = false;
  let isRenderPaused = false;
  let animId = null;
  let intersectionObserver = null;
  let storyStageCards = [];
  let cityGroup = null;
  let cityTraffic = [];
  let asphaltTexture = null;
  let cityNeonMaterials = [];
  let cityWindowMaterials = [];
  let vehicleAssetStatusEl = null;
  let assetLoadGeneration = 0;

  // Master Scene Groups
  let masterGroup, roadGroup, vehicleGroup, metroGroup, weatherGroup;
  let carMesh, cngMesh, bikeMesh, rickshawMesh, busMesh, trainMesh;
  let comparisonHub, comparisonRing;
  let sceneModelTracks = [];
  let rainParticles = null;
  let studioSpotlight = null;

  // Camera animation target values
  let currentCamPos = { x: 0, y: 10, z: 25 };
  let targetCamPos  = { x: 0, y: 10, z: 25 };
  let currentLookAt  = { x: 0, y: 2, z: 0 };
  let targetLookAt   = { x: 0, y: 2, z: 0 };
  let targetSpotPos  = { x: 0, y: 2, z: 0 };
  const cameraPoses = [
    { position: { x: 0, y: 13, z: 34 }, lookAt: { x: 0, y: 5, z: -13 } },
    { position: { x: -8, y: 11, z: 30 }, lookAt: { x: -2, y: 7, z: -25 } },
    { position: { x: 0, y: 17, z: 35 }, lookAt: { x: 0, y: 10, z: -38 } },
    { position: { x: 8, y: 16, z: 37 }, lookAt: { x: 1, y: 9, z: -49 } },
    { position: { x: 0, y: 23, z: 43 }, lookAt: { x: 0, y: 9, z: -61 } }
  ];
  const stageLightColors = [0x06b6d4, 0xf59e0b, 0x14b8a6, 0x10b981, 0x3b82f6]
    .map(color => new THREE.Color(color));
  const interpolatedLightColor = new THREE.Color();
  const vehicleAssetSpecs = [
    // Lane 0: West Inner (Southbound, towards camera, direction: 1, x: -2.05) - Fast mix: Bikes, Sedans, Coupes
    { key: 'bike_w1', type: 'bike', file: 'bike.glb', targetLength: 2.2, lane: 0, speed: 7.2, color: 0x0066f5 }, // Electric Blue (Mascot Match)
    { key: 'corolla_w1', type: 'corolla', file: 'toyota-corolla.glb', targetLength: 4.5, lane: 0, speed: 6.2, color: 0x0047ab },
    { key: 'prius_w1', type: 'prius', file: 'toyota-prius.glb', targetLength: 4.5, lane: 0, speed: 6.0, color: 0x10b981 },
    { key: 'bike_w2', type: 'bike', file: 'bike.glb', targetLength: 2.2, lane: 0, speed: 7.4, color: 0x111827 }, // Stealth Black (Dark -> White Attire!)
    { key: 'city_w1', type: 'city', file: 'honda-city.glb', targetLength: 4.4, lane: 0, speed: 6.3, color: 0x387d83 },
    { key: 'sports_w1', type: 'sports', file: 'sports-coupe.glb', targetLength: 4.5, lane: 0, speed: 6.8, color: 0xd34f8b },
    { key: 'bike_w3', type: 'bike', file: 'bike.glb', targetLength: 2.2, lane: 0, speed: 7.1, color: 0xea580c }, // Vibrant Orange
    { key: 'civic_w1', type: 'civic', file: 'honda-civic.glb', targetLength: 4.7, lane: 0, speed: 6.4, color: 0xf8fafc },
    { key: 'camry_w1', type: 'camry', file: 'toyota-camry.glb', targetLength: 4.9, lane: 0, speed: 6.1, color: 0x1e3a8a },

    // Lane 1: West Outer (Southbound, towards camera, direction: 1, x: -5.55) - Local & Transit: CNGs, Rickshaws, Microbus, Buses
    { key: 'cng_w1', type: 'cng', file: 'cng-auto-rickshaw.glb', targetLength: 3.2, lane: 1, speed: 5.4, color: 0x16a34a },
    { key: 'rickshaw_w1', type: 'rickshaw', file: 'cycle-rickshaw.glb', targetLength: 3.2, lane: 1, speed: 4.2, color: 0x0878d1 },
    { key: 'axio_w1', type: 'axio', file: 'toyota-axio.glb', targetLength: 4.3, lane: 1, speed: 5.7, color: 0xe2e8f0 },
    { key: 'cng_w2', type: 'cng', file: 'cng-auto-rickshaw.glb', targetLength: 3.2, lane: 1, speed: 5.3, color: 0x16a34a },
    { key: 'noah_w1', type: 'noah', file: 'toyota-noah.glb', targetLength: 4.8, lane: 1, speed: 5.5, color: 0x64748b },
    { key: 'rickshaw_w2', type: 'rickshaw', file: 'cycle-rickshaw.glb', targetLength: 3.2, lane: 1, speed: 4.0, color: 0xd97706 },
    { key: 'vezel_w1', type: 'vezel', file: 'honda-vezel.glb', targetLength: 4.5, lane: 1, speed: 5.8, color: 0x334155 },
    { key: 'cng_w3', type: 'cng', file: 'cng-auto-rickshaw.glb', targetLength: 3.2, lane: 1, speed: 5.2, color: 0x16a34a },
    { key: 'bus_w1', type: 'bus', file: 'dhaka-city-bus.glb', targetLength: 9.0, lane: 1, speed: 5.0, color: 0xef4444 },

    // Lane 2: East Inner (Northbound, away from camera, direction: -1, x: 2.05) - Fast mix: Sedans, Bikes, BRTA Bus, SUVs
    { key: 'corolla_e1', type: 'corolla', file: 'toyota-corolla.glb', targetLength: 4.5, lane: 2, speed: 6.2, color: 0xe9a33b },
    { key: 'bike_e1', type: 'bike', file: 'bike.glb', targetLength: 2.2, lane: 2, speed: 7.3, color: 0xf8fafc }, // White Superbike
    { key: 'bus_e1', type: 'bus', file: 'dhaka-city-bus.glb', targetLength: 9.0, lane: 2, speed: 5.1, color: 0x059669 },
    { key: 'civic_e1', type: 'civic', file: 'honda-civic.glb', targetLength: 4.7, lane: 2, speed: 6.5, color: 0xd95146 },
    { key: 'prius_e1', type: 'prius', file: 'toyota-prius.glb', targetLength: 4.5, lane: 2, speed: 6.0, color: 0x61a178 },
    { key: 'bike_e2', type: 'bike', file: 'bike.glb', targetLength: 2.2, lane: 2, speed: 7.2, color: 0x172554 }, // Navy Blue (Dark -> Light Attire!)
    { key: 'crv_e1', type: 'crv', file: 'honda-cr-v.glb', targetLength: 4.7, lane: 2, speed: 6.0, color: 0x95764a },
    { key: 'sports_e1', type: 'sports', file: 'sports-coupe.glb', targetLength: 4.5, lane: 2, speed: 6.7, color: 0x8b5cf6 },
    { key: 'city_e1', type: 'city', file: 'honda-city.glb', targetLength: 4.4, lane: 2, speed: 6.3, color: 0x0284c7 },

    // Lane 3: East Outer (Northbound, away from camera, direction: -1, x: 5.55) - Local & Transit: CNGs, Rickshaws, Microbus, Buses, Sedans
    { key: 'cng_e1', type: 'cng', file: 'cng-auto-rickshaw.glb', targetLength: 3.2, lane: 3, speed: 5.3, color: 0x16a34a },
    { key: 'camry_e1', type: 'camry', file: 'toyota-camry.glb', targetLength: 4.9, lane: 3, speed: 5.7, color: 0x4c79bd },
    { key: 'rickshaw_e1', type: 'rickshaw', file: 'cycle-rickshaw.glb', targetLength: 3.2, lane: 3, speed: 4.1, color: 0xec4899 },
    { key: 'bus_e2', type: 'bus', file: 'dhaka-city-bus.glb', targetLength: 9.0, lane: 3, speed: 5.0, color: 0xd95146 },
    { key: 'cng_e2', type: 'cng', file: 'cng-auto-rickshaw.glb', targetLength: 3.2, lane: 3, speed: 5.4, color: 0x16a34a },
    { key: 'noah_e1', type: 'noah', file: 'toyota-noah.glb', targetLength: 4.8, lane: 3, speed: 5.6, color: 0x9a668f },
    { key: 'rickshaw_e2', type: 'rickshaw', file: 'cycle-rickshaw.glb', targetLength: 3.2, lane: 3, speed: 3.9, color: 0x10b981 },
    { key: 'vezel_e1', type: 'vezel', file: 'honda-vezel.glb', targetLength: 4.5, lane: 3, speed: 5.8, color: 0xb1b5bf },
    { key: 'cng_e3', type: 'cng', file: 'cng-auto-rickshaw.glb', targetLength: 3.2, lane: 3, speed: 5.2, color: 0x16a34a },

    // Elevated MRT Line-6 Viaduct (Skyway, x: 17, y: 8.85) - High-speed electric trains
    { key: 'metro_1', type: 'metro', file: 'mrt-line-6-train.glb', targetLength: 18, lane: 4, speed: 8.5 },
    { key: 'metro_2', type: 'metro', file: 'mrt-line-6-train.glb', targetLength: 18, lane: 4, speed: 8.5 }
  ];

  // Materials Cache
  let carPaintMat, glassMat, tireMat, rimMat, chromeMat;
  let cngGreenMat, cngYellowMat, rickshawHoodMat, busRedMat, busWhiteMat, metroSilverMat;

  function initMaterials() {
    carPaintMat = new THREE.MeshStandardMaterial({ color: 0x0047ab, roughness: 0.25, metalness: 0.45 });
    glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
    tireMat = new THREE.MeshStandardMaterial({ color: 0x090d12, roughness: 0.94, metalness: 0.02 });
    rimMat = new THREE.MeshStandardMaterial({
      color: 0xaab8c8,
      roughness: 0.28,
      metalness: 0.72,
      emissive: 0x172b40,
      emissiveIntensity: 0.4
    });
    chromeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.9 });

    cngGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.35, metalness: 0.25 });
    cngYellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.15 });
    rickshawHoodMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5, metalness: 0.1 });
    busRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.2 });
    busWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
    metroSilverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.65 });
  }

  function createWheel(radius, width) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), tireMat);
    tire.rotation.x = Math.PI / 2;
    wheel.add(tire);

    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x64707a, roughness: 0.48, metalness: 0.72 });
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width * 0.58, 16), rotorMat);
    rotor.rotation.x = Math.PI / 2;
    wheel.add(rotor);

    const spokeGeometry = new THREE.CylinderGeometry(radius * 0.035, radius * 0.035, radius * 0.52, 6);
    const spokes = new THREE.InstancedMesh(spokeGeometry, rimMat, 20);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    let spokeIndex = 0;
    for (const side of [-1, 1]) {
      for (let spoke = 0; spoke < 10; spoke++) {
        const angle = spoke * Math.PI / 5;
        const direction = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
        position.set(
          Math.cos(angle) * radius * 0.43,
          Math.sin(angle) * radius * 0.43,
          side * (width / 2 + 0.012)
        );
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        matrix.compose(position, quaternion, scale);
        spokes.setMatrixAt(spokeIndex++, matrix);
      }
    }
    spokes.instanceMatrix.needsUpdate = true;
    wheel.add(spokes);

    const lipGeometry = new THREE.TorusGeometry(radius * 0.72, radius * 0.035, 5, 24);
    const sidewallGeometry = new THREE.TorusGeometry(radius * 0.82, radius * 0.018, 5, 24);
    const sidewallMat = new THREE.MeshStandardMaterial({ color: 0x394553, roughness: 0.62, metalness: 0.18 });
    for (const side of [-1, 1]) {
      const lip = new THREE.Mesh(lipGeometry, rimMat);
      lip.position.z = side * (width / 2 + 0.012);
      wheel.add(lip);

      const sidewall = new THREE.Mesh(sidewallGeometry, sidewallMat);
      sidewall.position.z = side * width * 0.37;
      wheel.add(sidewall);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.21, radius * 0.21, width * 1.12, 12), chromeMat);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.12, radius * 0.12, width * 1.18, 12), rimMat);
    centerCap.rotation.x = Math.PI / 2;
    wheel.add(centerCap);

    wheel.name = 'vehicle-wheel';
    wheel.userData.isRollingWheel = true;
    wheel.userData.wheelRadius = radius;
    wheel.userData.rollingAxis = 'z';
    return wheel;
  }

  function addVehicleBeam(parent, start, end, radius, material) {
    const from = new THREE.Vector3(start[0], start[1], start[2]);
    const to = new THREE.Vector3(end[0], end[1], end[2]);
    const direction = to.clone().sub(from);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 8),
      material
    );
    beam.position.copy(from.add(to).multiplyScalar(0.5));
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(beam);
    return beam;
  }

  function addSeatedPassenger(parent, x, y, z, shirtColor, trouserColor) {
    const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.78 });
    const trousers = new THREE.MeshStandardMaterial({ color: trouserColor, roughness: 0.82 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xb87958, roughness: 0.9 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x211c1a, roughness: 0.95 });
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), shirt);
    torso.scale.set(0.9, 1.25, 0.8);
    torso.position.set(x + 0.03, y + 0.35, z);
    torso.rotation.z = -0.12;
    parent.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), skin);
    head.position.set(x + 0.1, y + 0.76, z);
    parent.add(head);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), hair);
    hairCap.position.copy(head.position);
    hairCap.position.y += 0.035;
    parent.add(hairCap);

    addVehicleBeam(parent, [x + 0.12, y + 0.47, z], [x + 0.42, y + 0.2, z], 0.055, shirt);
    addVehicleBeam(parent, [x - 0.04, y + 0.45, z], [x + 0.22, y + 0.18, z], 0.05, shirt);
    addVehicleBeam(parent, [x, y + 0.12, z], [x + 0.2, y - 0.13, z], 0.075, trousers);
    addVehicleBeam(parent, [x + 0.2, y - 0.13, z], [x + 0.48, y - 0.16, z], 0.065, trousers);
    const shoe = new THREE.MeshStandardMaterial({ color: 0x30251f, roughness: 0.86 });
    addVehicleBeam(parent, [x + 0.43, y - 0.16, z], [x + 0.56, y - 0.16, z], 0.045, shoe);
  }

  function createRoadWheel(radius, width) {
    const wheel = new THREE.Group();
    const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.88 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xb9c2c9, metalness: 0.66, roughness: 0.35 });
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 20), tireMaterial);
    tire.rotation.x = Math.PI / 2;
    wheel.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, width * 1.08, 16), metalMaterial);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, width * 1.12, 12), metalMaterial);
    cap.rotation.x = Math.PI / 2;
    wheel.add(cap);
    wheel.name = 'vehicle-wheel';
    wheel.userData.isRollingWheel = true;
    wheel.userData.wheelRadius = radius;
    wheel.userData.rollingAxis = 'z';
    return wheel;
  }

  function createRickshawWheel(radius) {
    const wheel = new THREE.Group();
    const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.88 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.32 });
    const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 7, 24), tireMaterial);
    wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.88, 0.018, 5, 24), metalMaterial);
    wheel.add(rim);
    for (let side of [-1, 1]) {
      for (let spoke = 0; spoke < 10; spoke++) {
        const angle = spoke * Math.PI / 5;
        const edgeX = Math.cos(angle) * radius * 0.88;
        const edgeY = Math.sin(angle) * radius * 0.88;
        addVehicleBeam(wheel, [0, 0, side * 0.035], [edgeX, edgeY, side * 0.035], 0.009, metalMaterial);
      }
    }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 10), metalMaterial);
    axle.rotation.x = Math.PI / 2;
    wheel.add(axle);
    wheel.name = 'rickshaw-wheel';
    wheel.userData.isRollingWheel = true;
    wheel.userData.wheelRadius = radius;
    wheel.userData.rollingAxis = 'z';
    return wheel;
  }

  // 1. Aerodynamic Sports Car
  function buildCar(colorHex) {
    const car = new THREE.Group();
    // Body lower chassis
    const bodyMaterial = carPaintMat.clone();
    if (colorHex) bodyMaterial.color.setHex(colorHex);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 1.9), bodyMaterial);
    body.position.y = 0.55;
    car.add(body);
    // Cabin canopy
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.65, 1.6), glassMat);
    cabin.position.set(-0.2, 1.15, 0);
    car.add(cabin);
    // Headlights (Front, +X)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), hlMat);
    hlL.position.set(2.2, 0.65, 0.65);
    car.add(hlL);
    const hlR = hlL.clone();
    hlR.position.set(2.2, 0.65, -0.65);
    car.add(hlR);
    // Ruby Taillights (Rear, -X)
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.38), tlMat);
    tlL.position.set(-2.2, 0.65, 0.65);
    car.add(tlL);
    const tlR = tlL.clone();
    tlR.position.set(-2.2, 0.65, -0.65);
    car.add(tlR);
    // Wheels
    const wFL = createWheel(0.43, 0.34); wFL.position.set(1.3, 0.43, 0.95); car.add(wFL);
    const wFR = createWheel(0.43, 0.34); wFR.position.set(1.3, 0.43, -0.95); car.add(wFR);
    const wBL = createWheel(0.43, 0.34); wBL.position.set(-1.3, 0.43, 0.95); car.add(wBL);
    const wBR = createWheel(0.43, 0.34); wBR.position.set(-1.3, 0.43, -0.95); car.add(wBR);
    return car;
  }

  // 2. Dhaka CNG Auto-Rickshaw
  function buildCNG() {
    const cng = new THREE.Group();
    const yellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42, metalness: 0.12 });
    const darkCanopy = new THREE.MeshStandardMaterial({ color: 0x35383a, roughness: 0.72 });
    const canopyEdge = new THREE.MeshStandardMaterial({ color: 0x55585a, roughness: 0.64 });
    const window = new THREE.MeshStandardMaterial({ color: 0x17202a, roughness: 0.22, metalness: 0.18 });
    const lamp = new THREE.MeshStandardMaterial({ color: 0xfff0a3, emissive: 0xffbd38, emissiveIntensity: 0.5 });
    const trimMetal = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.28 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.78, 0.68, 1.4), yellow);
    body.position.set(-0.02, 0.58, 0);
    cng.add(body);

    const frontCowl = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.7, 1.28), yellow);
    frontCowl.position.set(0.92, 0.91, 0);
    frontCowl.rotation.z = -0.12;
    cng.add(frontCowl);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.66, 1.13), window);
    windshield.position.set(1.18, 1.34, 0);
    windshield.rotation.z = -0.2;
    cng.add(windshield);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.16, 1.4), canopyEdge);
    roof.position.set(-0.2, 2.0, 0);
    cng.add(roof);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), darkCanopy);
    canopy.scale.set(0.92, 0.5, 0.72);
    canopy.position.set(-0.22, 1.82, 0);
    cng.add(canopy);

    for (const side of [-1, 1]) {
      const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.45, 0.045), window);
      sideWindow.position.set(-0.22, 1.55, side * 0.7);
      cng.add(sideWindow);
      const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.43, 0.08), yellow);
      lowerPanel.position.set(-0.76, 0.89, side * 0.71);
      cng.add(lowerPanel);
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.17, 0.035),
        new THREE.MeshStandardMaterial({ color: 0xfff7dc, roughness: 0.6 })
      );
      badge.position.set(-0.77, 0.91, side * 0.76);
      cng.add(badge);
    }

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 1.34), trimMetal);
    bumper.position.set(1.38, 0.45, 0);
    cng.add(bumper);
    for (const side of [-1, 1]) {
      const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), lamp);
      headlight.scale.set(0.7, 0.75, 1);
      headlight.position.set(1.32, 0.78, side * 0.48);
      cng.add(headlight);
    }

    // Taillights (Rear, -X) - Ruby Red
    const cngTlMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.22), cngTlMat);
      tl.position.set(-1.42, 0.65, side * 0.52);
      cng.add(tl);
    }

    const frontWheel = createRoadWheel(0.31, 0.17);
    frontWheel.position.set(1.02, 0.32, 0);
    cng.add(frontWheel);
    for (const side of [-1, 1]) {
      const rearWheel = createRoadWheel(0.31, 0.17);
      rearWheel.position.set(-0.94, 0.32, side * 0.63);
      cng.add(rearWheel);
    }

    const driverSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.15, 0.58),
      new THREE.MeshStandardMaterial({ color: 0x292d31, roughness: 0.88 })
    );
    driverSeat.position.set(0.43, 1.0, 0);
    cng.add(driverSeat);
    addSeatedPassenger(cng, 0.32, 0.92, 0, 0xe7e5df, 0x303743);
    const steering = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 12), trimMetal);
    steering.position.set(0.85, 1.13, 0);
    steering.rotation.y = Math.PI / 2;
    cng.add(steering);
    return cng;
  }

  // 3. Sport Motorcycle / Bike with Athletic Biker (Exact Match to Mascot Reference Image)
  function buildBike(colorHex) {
    const bike = new THREE.Group();
    const activeColor = colorHex || 0x0066f5; // Electric Blue

    function isDarkColor(col) {
      let r, g, b;
      if (typeof col === 'string') {
        const hex = col.replace('#', '');
        const num = parseInt(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex, 16);
        r = (num >> 16) & 255;
        g = (num >> 8) & 255;
        b = num & 255;
      } else if (typeof col === 'number') {
        r = (col >> 16) & 255;
        g = (col >> 8) & 255;
        b = col & 255;
      } else {
        return false;
      }
      const lum = (0.299 * r + 0.587 * g + 0.114 * b);
      return lum < 100 || col === 0x111827 || col === 0x18181b || col === 0x090d12 || col === 0x172554 || col === 0x1e3a8a;
    }

    const bikeIsDark = isDarkColor(activeColor);

    // Mascot Character Palettes based on reference image & dark bike contrast rule:
    // "if the bike color is dark then the bikers attire should be light colour."
    let shirtColor = bikeIsDark ? 0xf8fafc : 0xf97316; // Crisp Pure White on dark bikes, Vibrant Orange on others
    let helmetColor = activeColor === 0x0066f5 ? 0x1b4332 : activeColor; // Retro Moto Green on blue bike (reference match!), or matching accent
    let pantsColor = bikeIsDark ? 0xcbd5e1 : 0x18181b; // Light Grey / Slate Khaki on dark bikes, Charcoal Slim Jeans on others
    let shoeColor = bikeIsDark ? 0xffffff : 0x64748b;  // Crisp White on dark bikes, Lavender-Grey Sneaker on others

    const bikeMat = new THREE.MeshStandardMaterial({ color: activeColor, roughness: 0.18, metalness: 0.35 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.16, metalness: 0.25, side: THREE.DoubleSide });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.22 }); // Warm cream racing stripe
    const sunglassFrameMat = new THREE.MeshStandardMaterial({ color: 0x090d12, roughness: 0.22, metalness: 0.35 });
    const sunglassLensMat = new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.04, metalness: 0.96 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.5 });
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xcfd6df, roughness: 0.2, metalness: 0.85 });
    const goldForkMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.22, metalness: 0.88 });
    const sportsHlMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });

    // Sculpted Fuel Tank with Narrow Waist (depth: 0.40)
    const tank = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.44, 0.40), bikeMat);
    tank.position.set(0.12, 0.86, 0);
    bike.add(tank);

    // Front Nose Fairing & Smoke Windscreen
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.44), bikeMat);
    nose.position.set(0.68, 0.88, 0);
    bike.add(nose);
    const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.36), new THREE.MeshStandardMaterial({
      color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.7
    }));
    windscreen.position.set(0.62, 1.14, 0);
    windscreen.rotation.z = -0.35;
    bike.add(windscreen);

    // Upswept Tail Cowl & Stepped Saddle
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 0.36), bikeMat);
    tail.position.set(-0.78, 1.0, 0);
    tail.rotation.z = 0.24;
    bike.add(tail);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.34), darkMat);
    seat.position.set(-0.32, 0.94, 0);
    bike.add(seat);

    // Engine Block, Silver Crankcase & Right-Side Polished Canister Muffler
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.38), silverMat);
    engine.position.set(0.08, 0.52, 0);
    bike.add(engine);
    for (const side of [-1, 1]) {
      const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 12), silverMat);
      crank.rotation.x = Math.PI / 2;
      crank.position.set(0.12, 0.5, side * 0.21);
      bike.add(crank);

      if (side === 1) {
        // Large Stainless Steel Upswept Canister Muffler
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 1.15, 12), silverMat);
        exhaust.rotation.z = Math.PI / 2 - 0.24;
        exhaust.position.set(-0.48, 0.46, 0.26);
        bike.add(exhaust);
      }
    }

    // Front Inverted Gold USD Suspension Forks (Signature Feature)
    for (const side of [-1, 1]) {
      const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.92, 10), goldForkMat);
      fork.rotation.z = -0.3;
      fork.position.set(0.7, 0.65, side * 0.14);
      bike.add(fork);
    }
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.82), darkMat);
    hBar.position.set(0.62, 1.08, 0);
    bike.add(hBar);

    // Twin Slanted Ice-Cyan LED Headlights
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.16), sportsHlMat);
      hl.position.set(0.96, 0.88, side * 0.12);
      hl.rotation.y = side * 0.22;
      bike.add(hl);
    }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.18), new THREE.MeshBasicMaterial({ color: 0xff1e27 }));
    tl.position.set(-1.12, 1.05, 0);
    bike.add(tl);

    // Alloy Sports Wheels with Disc Brake Rotors
    const wF = createWheel(0.35, 0.16); wF.position.set(0.9, 0.35, 0); bike.add(wF);
    const wB = createWheel(0.35, 0.16); wB.position.set(-0.85, 0.35, 0); bike.add(wB);

    // BIKER: Leaning forward in aggressive athletic racing tuck posture (~40° lean)
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.65 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.82 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdf9b76, roughness: 0.75 });
    const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.18, metalness: 0.05 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0c10 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.7 });

    // CNC Billet Rearset Footrests on both sides (Z = side * 0.24 to 0.36)
    for (const side of [-1, 1]) {
      const rearset = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.04), silverMat);
      rearset.position.set(-0.24, 0.52, side * 0.24);
      bike.add(rearset);

      const footpeg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.20, 10), silverMat);
      footpeg.rotation.x = Math.PI / 2;
      footpeg.position.set(-0.24, 0.48, side * 0.32);
      bike.add(footpeg);

      const pegTip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 10), darkMat);
      pegTip.rotation.x = Math.PI / 2;
      pegTip.position.set(-0.24, 0.48, side * 0.40);
      bike.add(pegTip);
    }

    // Torso Leaning Forward
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.26, 0.36), shirtMat);
    torso.position.set(-0.06, 1.22, 0);
    torso.rotation.z = -0.52;
    bike.add(torso);

    // RETRO OPEN-FACE MOTO HELMET WITH SCULPTED FACE & SUNGLASSES (Exact Reference Image Match)
    const helmetGroup = new THREE.Group();
    helmetGroup.position.set(0.24, 1.48, 0);
    helmetGroup.rotation.z = -0.15;

    // 1. Character Head & Face with Warm Skin Tone (Positioned forward in the face opening)
    const faceMesh = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 14), skinMat);
    faceMesh.scale.set(0.92, 1.15, 1.05);
    faceMesh.position.set(0.04, -0.01, 0);
    helmetGroup.add(faceMesh);

    // Cute Rounded Sculpted Nose
    const charNose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
    charNose.scale.set(1.25, 0.95, 0.95);
    charNose.position.set(0.21, -0.01, 0);
    helmetGroup.add(charNose);

    // Friendly Smile Mouth
    const smileGeom = new THREE.TorusGeometry(0.06, 0.008, 6, 12, Math.PI * 0.75);
    const smile = new THREE.Mesh(smileGeom, darkMat);
    smile.rotation.y = Math.PI / 2;
    smile.rotation.x = -Math.PI * 0.12;
    smile.position.set(0.19, -0.065, 0);
    helmetGroup.add(smile);

    // 2. Cool Sunglasses ("put a sunglass")
    const sunglassBridge = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, 0.19), sunglassFrameMat);
    sunglassBridge.position.set(0.22, 0.035, 0);
    helmetGroup.add(sunglassBridge);

    [-1, 1].forEach(side => {
      // Dark Tinted Polarized Lens
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.07, 0.085), sunglassLensMat);
      lens.position.set(0.21, 0.035, side * 0.07);
      lens.rotation.y = side * 0.16;
      helmetGroup.add(lens);

      // Outer Beveled Sunglass Frame Border
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.082, 0.095), sunglassFrameMat);
      frame.position.set(0.205, 0.035, side * 0.07);
      frame.rotation.y = side * 0.16;
      helmetGroup.add(frame);

      // Sunglass Temple Arm
      const templeArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.012), sunglassFrameMat);
      templeArm.position.set(0.10, 0.038, side * 0.12);
      templeArm.rotation.y = side * 0.16;
      helmetGroup.add(templeArm);

      // Silver Metal Hinge Rivet on Temple Corner
      const hingePin = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.014, 8), silverMat);
      hingePin.rotation.z = Math.PI / 2;
      hingePin.position.set(0.21, 0.06, side * 0.115);
      helmetGroup.add(hingePin);
    });

    // 3. Retro Open-Face 3/4 Motorcycle Helmet Shell (100% Full Rear Enclosure)
    // Primary Full Helmet Shell (Seamlessly covers Top Crown, Entire Back/Occiput, and Side Flanks)
    const helmetShellGeom = new THREE.SphereGeometry(
      0.245,
      24,
      20,
      -Math.PI * 0.65,
      Math.PI * 1.30,
      0,
      Math.PI * 0.78
    );
    const helmetShell = new THREE.Mesh(helmetShellGeom, helmetMat);
    helmetShell.position.set(-0.02, 0.01, 0);
    helmetGroup.add(helmetShell);

    // Deep Rear Cranium & Nape Protective Cowl (Down to the collar, completely enclosing the back of the head!)
    const rearOcciputGeom = new THREE.CylinderGeometry(
      0.24, 0.22, 0.24, 20, 1, false,
      -Math.PI * 0.85, Math.PI * 1.70
    );
    const rearOcciputShell = new THREE.Mesh(rearOcciputGeom, helmetMat);
    rearOcciputShell.position.set(-0.025, -0.07, 0);
    helmetGroup.add(rearOcciputShell);

    // Lower Rim Rubber Trim / Neck Gasket Bead
    const neckGasketGeom = new THREE.TorusGeometry(0.225, 0.014, 6, 20, Math.PI * 1.28);
    const neckGasket = new THREE.Mesh(neckGasketGeom, darkMat);
    neckGasket.rotation.x = Math.PI / 2;
    neckGasket.rotation.z = Math.PI * 0.86;
    neckGasket.position.set(-0.03, -0.15, 0);
    helmetGroup.add(neckGasket);

    // Side Cheek Guards Framing the Face Opening
    [-1, 1].forEach(side => {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.20, 0.035), helmetMat);
      cheek.position.set(0.03, -0.035, side * 0.22);
      helmetGroup.add(cheek);

      // Chrome Opening Rim Trim along cheek
      const cheekTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.20, 8), silverMat);
      cheekTrim.position.set(0.105, -0.035, side * 0.225);
      helmetGroup.add(cheekTrim);
    });

    // Front Brow Visor Peak / Overhang Lip
    const browPeak = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.31), helmetMat);
    browPeak.position.set(0.16, 0.14, 0);
    browPeak.rotation.z = -0.15;
    helmetGroup.add(browPeak);

    // Chrome Brow Rim Trim
    const browTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.31, 8), silverMat);
    browTrim.rotation.z = Math.PI / 2;
    browTrim.position.set(0.18, 0.13, 0);
    helmetGroup.add(browTrim);

    // Bold Cream/White Racing Center Stripe (Running over the Crown AND down the entire Back)
    const browStripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.032, 0.082), stripeMat);
    browStripe.position.set(0.165, 0.14, 0);
    browStripe.rotation.z = -0.15;
    helmetGroup.add(browStripe);

    const crownStripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.022, 0.082), stripeMat);
    crownStripe.position.set(-0.02, 0.25, 0);
    crownStripe.rotation.z = 0.05;
    helmetGroup.add(crownStripe);

    // Upper Rear Racing Stripe
    const upperRearStripe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.22, 0.082), stripeMat);
    upperRearStripe.position.set(-0.255, 0.13, 0);
    upperRearStripe.rotation.z = 0.28;
    helmetGroup.add(upperRearStripe);

    // Lower Rear Racing Stripe
    const lowerRearStripe = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.24, 0.082), stripeMat);
    lowerRearStripe.position.set(-0.235, -0.05, 0);
    lowerRearStripe.rotation.z = -0.42;
    helmetGroup.add(lowerRearStripe);

    // Classic 3 Brow Snap Studs
    [-0.10, 0, 0.10].forEach(z => {
      const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.016, 8), silverMat);
      snap.rotation.z = Math.PI / 2;
      snap.position.set(0.185, 0.145, z);
      helmetGroup.add(snap);
    });

    bike.add(helmetGroup);

    // Bare Forearms Reaching to Handlebars & Legs on Footrests (Completely outside and 100% visible)
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.08), skinMat);
      arm.position.set(0.34, 1.15, side * 0.22);
      arm.rotation.z = -0.42;
      bike.add(arm);

      // Thigh hugging the outside of the tank
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.14), pantsMat);
      thigh.position.set(-0.06, 0.92, side * 0.28);
      thigh.rotation.z = -0.55;
      bike.add(thigh);

      // Knee joint
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), pantsMat);
      knee.position.set(0.08, 0.80, side * 0.28);
      bike.add(knee);

      // Shin angling back-down directly to the footrest peg
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.12), pantsMat);
      shin.position.set(-0.14, 0.64, side * 0.32);
      shin.rotation.z = -0.62;
      bike.add(shin);

      // Casual Riding Sneaker: resting squarely on footpeg at X = -0.24, Y = 0.48
      const bootGroup = new THREE.Group();
      bootGroup.position.set(-0.20, 0.50, side * 0.32);
      const sneakerUpper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.12), shoeMat);
      sneakerUpper.position.set(0, 0.02, 0);
      bootGroup.add(sneakerUpper);
      const sneakerSole = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.13), whiteMat);
      sneakerSole.position.set(0, -0.03, 0);
      bootGroup.add(sneakerSole);
      bike.add(bootGroup);
    }

    return bike;
  }

  // 4. Iconic Dhaka Cycle Rickshaw
  function buildRickshaw(hoodColorHex) {
    const rickshaw = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: 0x292d31, metalness: 0.7, roughness: 0.34 });
    const carriage = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 });
    const blueCanopy = new THREE.MeshStandardMaterial({
      color: hoodColorHex || 0x0878d1,
      roughness: 0.66,
      side: THREE.DoubleSide
    });
    const canopyTrim = new THREE.MeshStandardMaterial({ color: 0xf4c95d, metalness: 0.35, roughness: 0.44 });
    const cushion = new THREE.MeshStandardMaterial({ color: 0x28a7a5, roughness: 0.72 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 1.26), cushion);
    seat.position.set(-0.82, 1.0, 0);
    rickshaw.add(seat);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.64, 1.3), carriage);
    seatBack.position.set(-1.3, 1.3, 0);
    rickshaw.add(seatBack);
    const carriageBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 1.45), carriage);
    carriageBase.position.set(-0.82, 0.76, 0);
    rickshaw.add(carriageBase);

    const frontCenter = [1.32, 0.43, 0];
    const rearNear = [-1.0, 0.43, 0.73];
    const rearFar = [-1.0, 0.43, -0.73];
    addVehicleBeam(rickshaw, frontCenter, [0.15, 0.53, 0], 0.045, frame);
    addVehicleBeam(rickshaw, [0.15, 0.53, 0], rearNear, 0.045, frame);
    addVehicleBeam(rickshaw, [0.15, 0.53, 0], rearFar, 0.045, frame);
    addVehicleBeam(rickshaw, [0.15, 0.53, 0], [0.08, 1.04, 0], 0.04, frame);
    addVehicleBeam(rickshaw, [0.08, 1.04, 0], [-0.31, 1.04, 0], 0.045, frame);
    addVehicleBeam(rickshaw, [-0.82, 0.86, 0], [-0.82, 0.45, 0], 0.045, frame);

    const frontWheel = createRickshawWheel(0.43);
    frontWheel.position.copy(new THREE.Vector3(frontCenter[0], frontCenter[1], frontCenter[2]));
    rickshaw.add(frontWheel);
    for (const point of [rearNear, rearFar]) {
      const rearWheel = createRickshawWheel(0.42);
      rearWheel.position.set(point[0], point[1], point[2]);
      rickshaw.add(rearWheel);
    }

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), blueCanopy);
    canopy.scale.set(0.95, 0.42, 0.86);
    canopy.position.set(-0.88, 2.02, 0);
    rickshaw.add(canopy);
    const rearCurtain = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 1.65), blueCanopy);
    rearCurtain.position.set(-1.68, 1.84, 0);
    rickshaw.add(rearCurtain);
    for (const side of [-1, 1]) {
      addVehicleBeam(rickshaw, [-1.56, 1.32, side * 0.67], [-1.5, 2.02, side * 0.63], 0.025, canopyTrim);
      addVehicleBeam(rickshaw, [-0.26, 1.35, side * 0.67], [-0.3, 2.03, side * 0.63], 0.025, canopyTrim);
      addVehicleBeam(rickshaw, [-0.88, 1.55, side * 0.7], [-0.88, 2.02, side * 0.82], 0.014, canopyTrim);
    }
    addVehicleBeam(rickshaw, [1.0, 1.04, -0.38], [1.0, 1.04, 0.38], 0.035, frame);
    addVehicleBeam(rickshaw, [1.0, 1.04, 0], [0.98, 0.55, 0], 0.035, frame);
    addVehicleBeam(rickshaw, [-0.28, 0.95, -0.4], [-0.28, 0.95, 0.4], 0.035, frame);

    // Rear Reflector / Taillight
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), new THREE.MeshBasicMaterial({ color: 0xff1e27 }));
    tl.position.set(-1.72, 0.82, 0);
    rickshaw.add(tl);

    addSeatedPassenger(rickshaw, 0.02, 0.87, 0, 0x713b70, 0x3146a6);
    addSeatedPassenger(rickshaw, -1.02, 1.0, -0.36, 0xc58a43, 0x35a6a6);
    addSeatedPassenger(rickshaw, -1.02, 1.0, 0.36, 0x7256a8, 0x278caa);
    return rickshaw;
  }

  // 5. BRTA City Transit Bus
  function buildBus(colorHex) {
    const bus = new THREE.Group();
    // Lower body
    const lowerBodyMat = busRedMat.clone();
    if (colorHex) lowerBodyMat.color.setHex(colorHex);
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.2, 2.4), lowerBodyMat);
    lowerBody.position.y = 1.0;
    bus.add(lowerBody);
    // Upper cream white half with windows
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(8.3, 1.1, 2.35), busWhiteMat);
    upperBody.position.set(0, 2.1, 0);
    bus.add(upperBody);
    // Window stripe
    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.55, 2.42), glassMat);
    winStrip.position.set(0, 2.05, 0);
    bus.add(winStrip);
    // Green Destination Board
    const destBoard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 1.4), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 }));
    destBoard.position.set(4.2, 2.45, 0);
    bus.add(destBoard);
    // Headlights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.45), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hlL.position.set(4.25, 0.8, 0.85);
    bus.add(hlL);
    const hlR = hlL.clone();
    hlR.position.set(4.25, 0.8, -0.85);
    bus.add(hlR);
    // Taillights (Rear, -X) - Ruby Red
    const busTlMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.38), busTlMat);
    tlL.position.set(-4.26, 0.9, 0.88);
    bus.add(tlL);
    const tlR = tlL.clone();
    tlR.position.set(-4.26, 0.9, -0.88);
    bus.add(tlR);
    // Wheels (Dual rear)
    const wF1 = createWheel(0.5, 0.3); wF1.position.set(2.8, 0.5, 1.2); bus.add(wF1);
    const wF2 = createWheel(0.5, 0.3); wF2.position.set(2.8, 0.5, -1.2); bus.add(wF2);
    const wR1 = createWheel(0.5, 0.3); wR1.position.set(-2.5, 0.5, 1.2); bus.add(wR1);
    const wR2 = createWheel(0.5, 0.3); wR2.position.set(-2.5, 0.5, -1.2); bus.add(wR2);
    return bus;
  }

  // 6a. MRT Line-6 Train (Dedicated traffic model for viaduct)
  function buildMetroTrainOnly() {
    const train = new THREE.Group();
    const trainMat = metroSilverMat || new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.65 });
    for (let c = -1; c <= 1; c++) {
      const coach = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.4, 2.6), trainMat);
      body.position.y = 1.4;
      coach.add(body);
      const win = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.8, 2.66), glassMat);
      win.position.set(0, 1.6, 0);
      coach.add(win);
      const dStripe = new THREE.Mesh(
        new THREE.BoxGeometry(7.22, 0.2, 2.64),
        new THREE.MeshStandardMaterial({ color: 0x006a4e, roughness: 0.3 })
      );
      dStripe.position.set(0, 0.9, 0);
      coach.add(dStripe);
      const rStripe = new THREE.Mesh(
        new THREE.BoxGeometry(7.22, 0.1, 2.65),
        new THREE.MeshStandardMaterial({ color: 0xf42a41, roughness: 0.3 })
      );
      rStripe.position.set(0, 0.72, 0);
      coach.add(rStripe);
      coach.position.x = c * 7.8;
      train.add(coach);
    }
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.9), hlMat);
    hl.position.set(11.45, 1.3, 0);
    train.add(hl);
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.9), tlMat);
    tl.position.set(-11.45, 1.3, 0);
    train.add(tl);
    return train;
  }

  // 6. Elevated MRT Line-6 Viaduct & Train
  function buildMetro() {
    const metro = new THREE.Group();
    // Concrete Piers
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const pier1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 12, 12), pierMat);
    pier1.position.set(-10, 6, 0);
    metro.add(pier1);
    const pier2 = pier1.clone();
    pier2.position.set(10, 6, 0);
    metro.add(pier2);

    // Continuous Box-Girder Viaduct
    const girder = new THREE.Mesh(new THREE.BoxGeometry(32, 1.4, 4.2), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 }));
    girder.position.set(0, 12.7, 0);
    metro.add(girder);

    // Bangladesh Green & Red Ribbon Stripe
    const stripeG = new THREE.Mesh(new THREE.BoxGeometry(32, 0.25, 4.28), new THREE.MeshStandardMaterial({ color: 0x006a4e, roughness: 0.4 }));
    stripeG.position.set(0, 12.8, 0);
    metro.add(stripeG);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(32, 0.15, 4.3), new THREE.MeshStandardMaterial({ color: 0xf42a41, roughness: 0.4 }));
    stripeR.position.set(0, 12.5, 0);
    metro.add(stripeR);

    // Cyan Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8 });
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(32, 0.12, 0.15), railMat);
    r1.position.set(0, 13.48, -0.9);
    metro.add(r1);
    const r2 = r1.clone();
    r2.position.set(0, 13.48, 0.9);
    metro.add(r2);

    // 3-Car Metro Train
    const train = new THREE.Group();
    for (let c = -1; c <= 1; c++) {
      const coach = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.4, 2.6), metroSilverMat);
      body.position.y = 1.4;
      coach.add(body);
      // Windows
      const win = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.8, 2.66), glassMat);
      win.position.set(0, 1.6, 0);
      coach.add(win);
      // Green Door Stripe
      const dStripe = new THREE.Mesh(new THREE.BoxGeometry(7.22, 0.2, 2.64), new THREE.MeshStandardMaterial({ color: 0x006a4e, roughness: 0.3 }));
      dStripe.position.set(0, 0.9, 0);
      coach.add(dStripe);
      coach.position.x = c * 7.8;
      train.add(coach);
    }
    // Headlights on front coach
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.9), hlMat);
    hl.position.set(11.45, 1.3, 0);
    train.add(hl);

    train.position.set(0, 13.5, 0);
    metro.add(train);
    trainMesh = train;
    return metro;
  }

  // 7. Monsoon Rain Particle System
  function buildRain() {
    const particleCount = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i]     = (Math.random() - 0.5) * 80;
      positions[i + 1] = Math.random() * 45;
      positions[i + 2] = (Math.random() - 0.5) * 80;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.35,
      transparent: true,
      opacity: 0.0
    });

    const rain = new THREE.Points(geometry, mat);
    return rain;
  }

  function createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const image = context.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const grain = 24 + Math.floor(Math.random() * 22);
      image.data[i] = grain;
      image.data[i + 1] = grain + 2;
      image.data[i + 2] = grain + 8;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    context.globalAlpha = 0.34;
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      context.fillStyle = i % 3 === 0 ? '#8590a0' : '#080b12';
      context.beginPath();
      context.ellipse(x, y, 1 + Math.random() * 8, 1 + Math.random() * 3, Math.random(), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 0.16;
    context.strokeStyle = '#090c14';
    context.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (Math.random() - 0.5) * 28, y + 6 + Math.random() * 32);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 48);
    texture.anisotropy = 4;
    return texture;
  }

  function createVehicleEnvironment() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const sky = context.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#101a32');
    sky.addColorStop(0.52, '#526179');
    sky.addColorStop(0.55, '#171d2b');
    sky.addColorStop(1, '#05070d');
    context.fillStyle = sky;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * canvas.width;
      const y = 235 + Math.random() * 100;
      const light = i % 4 === 0 ? '#ffbd79' : (i % 3 === 0 ? '#75d9ff' : '#d6d7dc');
      context.fillStyle = light;
      context.globalAlpha = 0.25 + Math.random() * 0.65;
      context.fillRect(x, y, 2 + Math.random() * 7, 2 + Math.random() * 15);
    }
    context.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  function buildScene() {
    cityTraffic = [];
    cityNeonMaterials = [];
    cityWindowMaterials = [];
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050817);
    scene.fog = new THREE.FogExp2(0x080d20, 0.0045);
    scene.environment = createVehicleEnvironment();
    masterGroup = new THREE.Group();
    scene.add(masterGroup);
    cityGroup = new THREE.Group();
    masterGroup.add(cityGroup);

    const ambient = new THREE.AmbientLight(0x7183b8, 0.95);
    scene.add(ambient);
    const hemiLight = new THREE.HemisphereLight(0x5169c7, 0x11101f, 1.2);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xc3d8ff, 1.35);
    keyLight.position.set(-25, 50, 30);
    if (!isLowEndDevice) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(512, 512);
      keyLight.shadow.camera.left = -38;
      keyLight.shadow.camera.right = 38;
      keyLight.shadow.camera.top = 45;
      keyLight.shadow.camera.bottom = -45;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 120;
    }
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x5d46ff, 1.6);
    rimLight.position.set(35, 25, -50);
    scene.add(rimLight);
    const streetFillLight = new THREE.DirectionalLight(0xffbd66, 0.45);
    streetFillLight.position.set(-15, 12, 10);
    scene.add(streetFillLight);
    studioSpotlight = new THREE.SpotLight(0x14b8a6, 2.8, 110, Math.PI / 3, 0.5, 1.1);
    studioSpotlight.position.set(0, 38, 22);
    studioSpotlight.target.position.set(0, 6, -25);
    scene.add(studioSpotlight);
    scene.add(studioSpotlight.target);

    const groundGeo = new THREE.PlaneGeometry(180, 190);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x101522,
      roughness: 0.52,
      metalness: 0.35
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    cityGroup.add(ground);

    asphaltTexture = createAsphaltTexture();
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(17, 170),
      new THREE.MeshStandardMaterial({
        color: 0x657080,
        map: asphaltTexture,
        roughness: 0.76,
        metalness: 0.12
      })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -24);
    road.receiveShadow = true;
    cityGroup.add(road);

    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x24283a, roughness: 0.72 });
    const curbMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6 });
    [-1, 1].forEach(side => {
      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, 170), sidewalkMat);
      sidewalk.position.set(side * 10.1, 0.08, -24);
      cityGroup.add(sidewalk);

      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 170), curbMat);
      curb.position.set(side * 8.55, 0.24, -24);
      cityGroup.add(curb);
    });

    const laneMat = new THREE.MeshStandardMaterial({ color: 0xd9d3ba, roughness: 0.8 });
    for (let z = 55; z > -105; z -= 8) {
      [-3.9, 3.9].forEach(x => {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 3.1), laneMat);
        dash.position.set(x, 0.035, z);
        cityGroup.add(dash);
      });
    }
    const centerLineMat = new THREE.MeshStandardMaterial({ color: 0xf1c84b, roughness: 0.72 });
    [-0.12, 0.12].forEach(x => {
      const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 170), centerLineMat);
      centerLine.position.set(x, 0.035, -24);
      cityGroup.add(centerLine);
    });
    for (let crossingZ = 48; crossingZ > -100; crossingZ -= 48) {
      for (let stripe = -7; stripe <= 7; stripe++) {
        const marking = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.025, 3.8), laneMat);
        marking.position.set(stripe, 0.04, crossingZ);
        cityGroup.add(marking);
      }
    }

    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x273b4d,
      roughness: 0.17,
      metalness: 0.32,
      transparent: true,
      opacity: 0.48
    });
    for (let i = 0; i < 24; i++) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(0.45 + Math.random() * 1.15, 10),
        puddleMat
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.scale.y = 0.25 + Math.random() * 0.35;
      puddle.position.set((Math.random() - 0.5) * 15, 0.026, -104 + Math.random() * 160);
      cityGroup.add(puddle);
    }

    const streetFixtureMat = new THREE.MeshStandardMaterial({ color: 0x353b47, roughness: 0.65, metalness: 0.5 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd17a });
    const lampPoleGeo = new THREE.CylinderGeometry(0.07, 0.11, 6.4, 8);
    const lampHeadGeo = new THREE.BoxGeometry(0.95, 0.13, 0.24);
    for (let lampIndex = 0; lampIndex < 7; lampIndex++) {
      const z = 48 - lampIndex * 24;
      for (const side of [-1, 1]) {
        const lampX = side * 9.15;
        const pole = new THREE.Mesh(lampPoleGeo, streetFixtureMat);
        pole.position.set(lampX, 3.2, z);
        cityGroup.add(pole);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.08), streetFixtureMat);
        arm.position.set(lampX - side * 0.47, 6.25, z);
        cityGroup.add(arm);
        const lamp = new THREE.Mesh(lampHeadGeo, lampGlowMat);
        lamp.position.set(lampX - side * 0.92, 6.18, z);
        cityGroup.add(lamp);
      }
    }

    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x493326, roughness: 0.9 });
    const treeCanopyMat = new THREE.MeshStandardMaterial({ color: 0x164b3b, roughness: 0.86 });
    for (let treeIndex = 0; treeIndex < 12; treeIndex++) {
      const z = 38 - treeIndex * 15;
      const side = treeIndex % 2 === 0 ? -1 : 1;
      const x = side * (11.8 + (treeIndex % 3) * 0.45);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.4, 7), treeTrunkMat);
      trunk.position.set(x, 1.2, z);
      cityGroup.add(trunk);
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), treeCanopyMat);
      canopy.position.set(x, 3.1, z);
      cityGroup.add(canopy);
    }

    const towerMaterials = [
      0x37404a, 0x292f39, 0x595b5e, 0x344047, 0x464049, 0x68696a,
      0x303944, 0x55464a, 0x3a4850, 0x4c4a4e, 0x5d6266, 0x3b4842,
      0x514649, 0x394550, 0x49464c, 0x605b54, 0x35474a, 0x4d4850
    ].map(color => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.56,
      metalness: 0.34,
      emissive: 0x080b10,
      emissiveIntensity: 0.08
    }));
    const glassTowerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x58a5b8,
      roughness: 0.18,
      metalness: 0.3,
      transparent: true,
      opacity: 0.38,
      emissive: 0x0b2433,
      emissiveIntensity: 0.2
    });
    const buildingNames = [
      'Gulshan Heights', 'Dhanmondi Plaza', 'Mirpur Tower', 'Motijheel House',
      'Karwan Bazar', 'Tejgaon Point', 'Uttara Square', 'Banani Arcade',
      'Shapla Market', 'Lalbagh Plaza', 'Bijoy Sarani', 'Bashundhara View',
      'Farmgate Center', 'Hatirjheel House', 'New Market', 'Mohakhali Tower',
      'Azimpur Court', 'Paltan Building'
    ];
    const cachedSignTextures = [];
    function getBuildingSignTexture(index) {
      const idx = index % 5;
      if (cachedSignTextures[idx]) return cachedSignTextures[idx];
      const signConfigs = [
        { name: 'Gulshan Heights', color: '#594b70' },
        { name: 'Dhanmondi Plaza', color: '#35656a' },
        { name: 'Mirpur Tower', color: '#80505f' },
        { name: 'Motijheel House', color: '#3e5e80' },
        { name: 'Uttara Square', color: '#87664e' }
      ];
      const config = signConfigs[idx];
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.fillStyle = '#171521';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = config.color;
      context.fillRect(4, 4, canvas.width - 8, canvas.height - 8);
      context.strokeStyle = '#ffe0a6';
      context.lineWidth = 3;
      context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
      context.fillStyle = '#fff4dc';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = 'bold 24px Segoe UI, sans-serif';
      context.fillText(config.name, canvas.width / 2, canvas.height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      cachedSignTextures[idx] = texture;
      return texture;
    }
    const towerEdgeMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x617786 }),
      new THREE.MeshBasicMaterial({ color: 0x627c76 }),
      new THREE.MeshBasicMaterial({ color: 0x806d7b })
    ];
    const windowCounts = [0, 0, 0];
    const windowPlacements = [[], [], []];
    let towerCount = 0;

    for (let row = 0; row < 7; row++) {
      const z = 22 - row * 17;
      for (const side of [-1, 1]) {
        const buildingCount = row < 2 ? 3 : 4;
        for (let col = 0; col < buildingCount; col++) {
          const width = 4.5 + Math.random() * 4.5;
          const depth = 5.5 + Math.random() * 5;
          const height = 8 + Math.random() * (row === 0 ? 13 : 25);
          const x = side * (14.2 + col * 8 + Math.random() * 2.5);
          const building = new THREE.Group();
          building.position.set(x, 0, z + (Math.random() - 0.5) * 7);
          cityGroup.add(building);

          const body = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            towerCount === 0 ? glassTowerMaterial : towerMaterials[towerCount % towerMaterials.length]
          );
          body.position.y = height / 2;
          building.add(body);

          const roof = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.72, 0.32, depth * 0.72),
            towerEdgeMaterials[(row + col + side + 3) % towerEdgeMaterials.length]
          );
          roof.position.y = height + 0.16;
          building.add(roof);

          const faceX = -side * (width / 2 + 0.055);
          const windowColumns = Math.max(2, Math.floor(depth / 1.5));
          const floors = Math.floor(height / 2.1);
          for (let floor = 0; floor < floors; floor++) {
            for (let window = 0; window < windowColumns; window++) {
              if (Math.random() < 0.28) continue;
              const colorIndex = Math.random() < 0.1
                ? 2
                : (Math.random() < 0.28 ? 1 : 0);
              const windowZ = (window - (windowColumns - 1) / 2) * 1.35;
              const windowY = 1.25 + floor * 2.05;
              windowPlacements[colorIndex].push([
                building.position.x + faceX,
                windowY,
                building.position.z + windowZ
              ]);
              windowCounts[colorIndex]++;
            }
          }

          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, height * 0.82, 0.16),
            towerEdgeMaterials[(row + col) % towerEdgeMaterials.length]
          );
          stripe.position.set(faceX, height * 0.51, depth * 0.32);
          building.add(stripe);

          const signTexture = getBuildingSignTexture(towerCount);
          if (signTexture) {
            const sign = new THREE.Mesh(
              new THREE.PlaneGeometry(Math.min(depth * 0.84, 6.8), 1.5),
              new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide })
            );
            sign.position.set(faceX * 1.02, Math.min(height - 1.2, Math.max(2.5, height * 0.3)), 0);
            sign.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
            building.add(sign);
          }

          if (height > 18 && col % 2 === 0) {
            const antenna = new THREE.Mesh(
              new THREE.CylinderGeometry(0.045, 0.11, 3.2, 6),
              towerEdgeMaterials[(row + col + 1) % towerEdgeMaterials.length]
            );
            antenna.position.y = height + 1.75;
            building.add(antenna);
          }
          towerCount++;
        }
      }
    }

    const windowGeometry = new THREE.BoxGeometry(0.07, 0.68, 0.82);
    const windowColors = [0xd8c9a7, 0x9dc6ca, 0xc3a8c0];
    cityWindowMaterials = windowColors.map(color => new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72
    }));
    windowPlacements.forEach((placements, index) => {
      const windows = new THREE.InstancedMesh(windowGeometry, cityWindowMaterials[index], placements.length);
      const matrix = new THREE.Matrix4();
      placements.forEach(([x, y, z], placementIndex) => {
        matrix.makeTranslation(x, y, z);
        windows.setMatrixAt(placementIndex, matrix);
      });
      windows.instanceMatrix.needsUpdate = true;
      cityGroup.add(windows);
    });

    const skywayMaterial = new THREE.MeshStandardMaterial({
      color: 0x292d42,
      roughness: 0.42,
      metalness: 0.55,
      emissive: 0x11152b,
      emissiveIntensity: 0.55
    });
    const skyway = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.55, 115), skywayMaterial);
    skyway.position.set(17, 8.5, -31);
    cityGroup.add(skyway);
    const skywayEdge = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.09, 115),
      new THREE.MeshBasicMaterial({ color: 0xff4fac })
    );
    skywayEdge.position.set(14.75, 8.25, -31);
    cityGroup.add(skywayEdge);
    for (let z = 35; z > -94; z -= 22) {
      const support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.56, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x35384c, roughness: 0.6, metalness: 0.35 })
      );
      support.position.set(17, 4.25, z);
      cityGroup.add(support);
    }

    const sign = new THREE.Group();
    sign.position.set(-15.8, 13, -35);
    sign.rotation.y = Math.PI / 2;
    cityGroup.add(sign);
    const signPanel = new THREE.Mesh(
      new THREE.BoxGeometry(8, 3.6, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x10162b,
        emissive: 0x122554,
        emissiveIntensity: 0.9,
        metalness: 0.45
      })
    );
    sign.add(signPanel);
    const signFrame = new THREE.Mesh(
      new THREE.BoxGeometry(8.25, 3.85, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x31d7e8, wireframe: true })
    );
    sign.position.z -= 0.22;
    sign.add(signFrame);
    const signSupport = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 6, 8),
      skywayMaterial
    );
    signSupport.position.set(-15.8, 9.8, -35);
    cityGroup.add(signSupport);

    cityNeonMaterials = towerEdgeMaterials.concat(curbMat);
    cityGroup.userData.towerCount = towerCount;
    cityGroup.userData.windowCount = windowCounts.reduce((sum, count) => sum + count, 0);
    cityGroup.userData.skyway = skyway;

    vehicleGroup = cityGroup;
    sceneModelTracks = [];
    comparisonRing = null;
    comparisonHub = null;
    rainParticles = buildRain();
    rainParticles.material.opacity = 0;
    rainParticles.position.set(0, 0, -24);
    cityGroup.add(rainParticles);
  }

  function setVehicleAssetStatus(message, isError) {
    if (!vehicleAssetStatusEl) return;
    vehicleAssetStatusEl.textContent = message;
    vehicleAssetStatusEl.classList.toggle('text-amber-200', Boolean(isError));
    vehicleAssetStatusEl.classList.toggle('text-sky-200/80', !isError);
  }

  function loadVehicleAssets() {
    if (!window.THREE) {
      setVehicleAssetStatus('Three.js unavailable. The 3D transit scene cannot load.', true);
      console.error('Bhara dekhi hero: THREE is unavailable.');
      return;
    }

    const generation = ++assetLoadGeneration;
    const loader = THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
    let completed = 0;
    let loaded = 0;
    const unavailable = [];
    const builtInModels = [];
    const builtInLabels = {
      bike: 'motorbike',
      cng: 'CNG auto-rickshaw',
      corolla: 'colorful cars',
      camry: 'colorful cars',
      prius: 'colorful cars',
      axio: 'colorful cars',
      noah: 'colorful cars',
      civic: 'colorful cars',
      city: 'colorful cars',
      vezel: 'colorful cars',
      crv: 'colorful cars',
      sports: 'colorful cars',
      rickshaw: 'passenger cycle rickshaw',
      bus: 'city bus',
      metro: 'MRT Line-6 train'
    };

    function attachBuiltInModel(spec, actor, traffic) {
      const carColors = {
        corolla: 0xe9a33b,
        camry: 0x4c79bd,
        prius: 0x61a178,
        axio: 0xe4ddca,
        noah: 0x9a668f,
        civic: 0xd95146,
        city: 0x387d83,
        vezel: 0xb1b5bf,
        crv: 0x95764a,
        sports: 0xd34f8b
      };
      const baseKey = spec.type || spec.key.split('_')[0];
      const color = spec.color || carColors[baseKey] || 0x0047ab;

      let model = null;
      if (baseKey === 'bike') {
        model = buildBike(color);
      } else if (baseKey === 'cng') {
        model = buildCNG();
      } else if (baseKey === 'rickshaw') {
        model = buildRickshaw(color);
      } else if (baseKey === 'bus') {
        model = buildBus(color);
      } else if (baseKey === 'metro') {
        model = buildMetroTrainOnly();
      } else {
        model = buildCar(color);
      }
      if (!model) return false;

      model.rotation.y = Math.PI / 2;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const modelLength = Math.max(size.x, size.z);
      if (!Number.isFinite(modelLength) || modelLength <= 0) {
        console.error(`Bhara dekhi hero: built-in ${spec.key} model has no measurable geometry.`);
        return false;
      }

      const scale = spec.targetLength / modelLength;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse(object => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
        if (object.userData.isRollingWheel) {
          traffic.wheelNodes.push(object);
          object.userData.wheelRadius *= scale;
        }
      });
      actor.add(model);
      traffic.wheelRadius = baseKey === 'bike' ? 0.34 : 0.48;
      traffic.loaded = true;
      builtInModels.push(builtInLabels[baseKey] || 'Dhaka transit');
      loaded++;
      return true;
    }

    function updateVehicleAssetStatus() {
      if (completed !== vehicleAssetSpecs.length) {
        setVehicleAssetStatus(`Loading vehicle models… ${loaded} of ${vehicleAssetSpecs.length} found.`, false);
        return;
      }
      const builtInSummary = builtInModels.length
        ? ` Built-in local models: ${Array.from(new Set(builtInModels)).join(', ')}.`
        : '';
      if (unavailable.length) {
        setVehicleAssetStatus(
          `${loaded} of ${vehicleAssetSpecs.length} vehicle visuals ready.${builtInSummary} Add missing GLB files in assets/models/; see assets/models/README.md.`,
          true
        );
      } else {
        setVehicleAssetStatus(`All ${vehicleAssetSpecs.length} vehicle visuals ready.${builtInSummary}`, false);
      }
    }

    function spawnTrafficFleet(available) {
      if (generation !== assetLoadGeneration) return;

      const laneDefinitions = [
        { x: -2.05, direction: 1 },  // West inner (Southbound, towards camera)
        { x: -5.55, direction: 1 },  // West outer (Southbound, towards camera)
        { x: 2.05, direction: -1 },  // East inner (Northbound, away from camera)
        { x: 5.55, direction: -1 }   // East outer (Northbound, away from camera)
      ];
      const activeSpecs = isLowEndDevice
        ? vehicleAssetSpecs.filter((spec, idx) => idx % 2 === 0 || spec.key.startsWith('metro'))
        : vehicleAssetSpecs;
      const laneCounts = [0, 0, 0, 0, 0];
      activeSpecs.forEach(spec => {
        const laneIdx = spec.lane !== undefined ? spec.lane : 0;
        laneCounts[laneIdx]++;
      });
      const laneOffsets = [0, 0, 0, 0, 0];
      const lanePhaseStagger = [0, 4.6, 9.2, 13.8, 35.0];

      activeSpecs.forEach(spec => {
        const isElevated = spec.lane === 4 || spec.key.startsWith('metro');
        const shouldUseBuiltIn = !available.has(spec.file) || !loader;
        if (!available.has(spec.file) && !shouldUseBuiltIn) {
          unavailable.push(spec.file);
          completed++;
          return;
        }

        const path = `assets/models/${spec.file}`;
        const laneIdx = isElevated ? 4 : spec.lane;
        const lane = isElevated ? { x: 17, direction: 1 } : laneDefinitions[laneIdx];
        const slot = laneOffsets[laneIdx]++;
        const countInLane = Math.max(1, laneCounts[laneIdx]);
        const laneSpacing = 165 / countInLane;

        let distance;
        if (isElevated) {
          distance = -82 + slot * 65;
        } else {
          const rawOffset = slot * laneSpacing + lanePhaseStagger[laneIdx];
          distance = 58 - (rawOffset % 165);
        }

        const actor = new THREE.Group();
        if (!isElevated) {
          const shadow = new THREE.Mesh(
            new THREE.PlaneGeometry(spec.targetLength * 0.82, (spec.type === 'bike') ? 0.9 : 1.7),
            new THREE.MeshBasicMaterial({ color: 0x03070b, transparent: true, opacity: 0.42, depthWrite: false })
          );
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = 0.025;
          actor.add(shadow);
        }
        actor.position.set(isElevated ? 17 : lane.x, isElevated ? 8.85 : 0, distance);
        actor.rotation.y = lane.direction > 0 ? Math.PI : 0;
        cityGroup.add(actor);

        const traffic = {
          mesh: actor,
          key: spec.key,
          type: spec.type || spec.key.split('_')[0],
          lane: isElevated ? 17 : lane.x,
          laneIndex: laneIdx,
          direction: lane.direction,
          distance,
          speed: spec.speed || (isElevated ? 8.5 : 5.8 + laneIdx * 0.3),
          wheelNodes: [],
          wheelRadius: 0.45,
          loaded: false
        };
        cityTraffic.push(traffic);

        if (shouldUseBuiltIn) {
          if (attachBuiltInModel(spec, actor, traffic)) {
            completed++;
            updateVehicleAssetStatus();
            return;
          }
          unavailable.push(`${spec.file} (built-in model failed)`);
          completed++;
          updateVehicleAssetStatus();
          return;
        }

        if (!loader) {
          unavailable.push(`${spec.file} (GLTFLoader unavailable)`);
          completed++;
          updateVehicleAssetStatus();
          return;
        }

        loader.load(path, gltf => {
          if (generation !== assetLoadGeneration) {
            disposeObjectResources(gltf.scene);
            return;
          }
          const model = gltf.scene;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const modelLength = Math.max(size.x, size.z);
          if (!Number.isFinite(modelLength) || modelLength <= 0) {
            disposeObjectResources(model);
            if (attachBuiltInModel(spec, actor, traffic)) {
              completed++;
              console.warn(`Bhara dekhi hero: ${spec.file} has no measurable geometry; using built-in model.`);
              updateVehicleAssetStatus();
              return;
            }
            unavailable.push(`${spec.file} (empty model)`);
            completed++;
            updateVehicleAssetStatus();
            console.error(`Bhara dekhi hero: ${spec.file} has no measurable geometry.`);
            return;
          }
          const scale = spec.targetLength / modelLength;
          model.scale.setScalar(scale);
          model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
          model.traverse(object => {
            if (object.isMesh) {
              object.castShadow = true;
              object.receiveShadow = true;
            }
            if (object.userData.isRollingWheel || /wheel|tire|tyre/i.test(object.name)) {
              traffic.wheelNodes.push(object);
              if (object.userData.wheelRadius) traffic.wheelRadius = object.userData.wheelRadius;
            }
          });
          actor.add(model);
          traffic.wheelRadius = (spec.type === 'bike') ? 0.34 : 0.48;
          traffic.loaded = true;
          loaded++;
          completed++;
          updateVehicleAssetStatus();
        }, undefined, error => {
          if (generation !== assetLoadGeneration) return;
          if (attachBuiltInModel(spec, actor, traffic)) {
            completed++;
            console.warn(`Bhara dekhi hero: ${path} failed to load; using built-in model.`, error);
            updateVehicleAssetStatus();
            return;
          }
          unavailable.push(`${spec.file} (load error)`);
          completed++;
          console.error(`Bhara dekhi hero: failed to load ${path}.`, error);
          updateVehicleAssetStatus();
        });
      });
      updateVehicleAssetStatus();
    }

    setVehicleAssetStatus('Checking local 3D vehicle assets…', false);
    fetch('assets/models/manifest.json')
      .then(response => {
        if (!response.ok) throw new Error(`Model manifest returned HTTP ${response.status}.`);
        return response.json();
      })
      .then(manifest => {
        if (generation !== assetLoadGeneration) return;
        const available = (manifest && Array.isArray(manifest.models)) ? new Set(manifest.models) : new Set();
        spawnTrafficFleet(available);
      })
      .catch(error => {
        if (generation !== assetLoadGeneration) return;
        console.warn('Bhara dekhi hero: reading manifest failed or offline; using built-in procedural models for full 38-vehicle traffic fleet.', error);
        spawnTrafficFleet(new Set());
      });
  }

  function disposeObjectResources(root) {
    root.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        Object.values(material).forEach(value => {
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    });
  }

  // Camera & Studio Lighting Choreography across the 5 Stages
  function applyScrollChoreography(progress) {
    const p = Math.max(0, Math.min(1, progress));
    const stagePosition = p * 5;
    const stageIndex = Math.min(3, Math.floor(stagePosition));
    const stageProgress = p >= 0.8 ? 1 : stagePosition - stageIndex;
    const mix = (from, to) => from + (to - from) * stageProgress;
    const fromCamera = cameraPoses[stageIndex];
    const toCamera = cameraPoses[stageIndex + 1];
    targetCamPos = {
      x: mix(fromCamera.position.x, toCamera.position.x),
      y: mix(fromCamera.position.y, toCamera.position.y),
      z: mix(fromCamera.position.z, toCamera.position.z)
    };
    targetLookAt = {
      x: mix(fromCamera.lookAt.x, toCamera.lookAt.x),
      y: mix(fromCamera.lookAt.y, toCamera.lookAt.y),
      z: mix(fromCamera.lookAt.z, toCamera.lookAt.z)
    };

    sceneModelTracks.forEach(({ mesh, poses }) => {
      const from = poses[stageIndex];
      const to = poses[stageIndex + 1];
      mesh.position.set(mix(from.x, to.x), mix(from.y, to.y), mix(from.z, to.z));
      const scale = mix(from.scale, to.scale);
      mesh.scale.setScalar(scale);
      mesh.rotation.y = mix(from.rotation || 0, to.rotation || 0);
    });

    const lightPosition = p * 5;
    const lightStageIndex = Math.min(4, Math.floor(lightPosition));
    const lightProgress = lightStageIndex === 4
      ? 0
      : Math.max(0, Math.min(1, (lightPosition - lightStageIndex - 0.8) / 0.2));
    interpolatedLightColor.copy(stageLightColors[lightStageIndex]);
    if (lightProgress > 0) {
      interpolatedLightColor.lerp(stageLightColors[lightStageIndex + 1], lightProgress);
    }
    if (studioSpotlight) studioSpotlight.color.copy(interpolatedLightColor);
    if (comparisonRing) comparisonRing.material.color.copy(interpolatedLightColor);
    cityNeonMaterials.forEach(material => material.color.copy(interpolatedLightColor));

    const activeCardPosition = p * 5;
    storyStageCards.forEach((item, index) => {
      const card = item.el;
      const content = item.content;
      const transitionHalfWidth = 0.08;
      const clamp = value => Math.max(0, Math.min(1, value));
      let visibility = 1;
      if (index > 0) {
        visibility = Math.min(
          visibility,
          clamp((activeCardPosition - index + transitionHalfWidth) / (transitionHalfWidth * 2))
        );
      }
      if (index < 4) {
        visibility = Math.min(
          visibility,
          clamp((index + 1 + transitionHalfWidth - activeCardPosition) / (transitionHalfWidth * 2))
        );
      }
      card.style.opacity = visibility.toFixed(3);
      card.style.transform = `translate3d(0, ${(1 - visibility) * 14}px, 0) scale(${0.985 + visibility * 0.015})`;
      const isVisible = visibility >= 0.5;
      if (item.lastVisible !== isVisible) {
        item.lastVisible = isVisible;
        card.style.pointerEvents = isVisible ? 'auto' : 'none';
        card.style.zIndex = isVisible ? '10' : '0';
        card.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
        if (content) content.style.pointerEvents = isVisible ? 'auto' : 'none';
      }
    });

    targetSpotPos = {
      x: mix(fromCamera.lookAt.x, toCamera.lookAt.x),
      y: mix(fromCamera.lookAt.y + 2, toCamera.lookAt.y + 2),
      z: mix(fromCamera.lookAt.z, toCamera.lookAt.z)
    };
    if (rainParticles) rainParticles.material.opacity = p < 0.8 ? 0 : Math.min(0.85, ((p - 0.8) / 0.2) * 1.1);
    if (canvasEl) {
      const fadeProgress = Math.max(0, Math.min(1, (p - 0.85) / 0.15));
      canvasEl.style.opacity = (1 - fadeProgress * 0.9).toFixed(3);
    }
  }

  function onResize() {
    if (!renderer || !camera || !canvasEl) return;
    const width = canvasEl.clientWidth || (containerEl && containerEl.clientWidth) || window.innerWidth;
    const height = canvasEl.clientHeight || (containerEl && containerEl.clientHeight) || window.innerHeight;
    if (width <= 0 || height <= 0) return;

    camera.aspect = width / height;
    camera.fov = width < 768 ? 54 : 38;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(isLowEndDevice ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 1.5));
    masterGroup.scale.setScalar(width < 768 ? 0.78 : 1);
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    if (isRenderPaused || !renderer || !scene || !camera) return;

    const delta = clock ? Math.min(clock.getDelta(), 0.05) : 0.016;
    cityTraffic.forEach(vehicle => {
      const isElevated = vehicle.laneIndex === 4 || vehicle.type === 'metro';
      const speedVariation = isElevated ? 0 : Math.sin(clock.elapsedTime * 0.22 + vehicle.laneIndex) * 0.35;
      const laneSpeed = vehicle.speed + speedVariation;
      vehicle.distance += laneSpeed * vehicle.direction * delta;
      const upperBound = isElevated ? 45 : 62;
      const lowerBound = isElevated ? -95 : -108;
      if (vehicle.distance > upperBound) vehicle.distance = lowerBound;
      if (vehicle.distance < lowerBound) vehicle.distance = upperBound;
      vehicle.mesh.position.z = vehicle.distance;
      if (vehicle.loaded && vehicle.wheelNodes.length && vehicle.distance > -75 && vehicle.distance < 40) {
        const rotation = laneSpeed * delta;
        vehicle.wheelNodes.forEach(wheel => {
          const radius = wheel.userData.wheelRadius || vehicle.wheelRadius;
          const axis = wheel.userData.rollingAxis || 'x';
          wheel.rotation[axis] += rotation / radius;
        });
      }
    });

    // Smooth Exponential Damping for Camera (Framerate-independent 120 FPS feel)
    const damping = 1.0 - Math.exp(-8.5 * delta);
    currentCamPos.x += (targetCamPos.x - currentCamPos.x) * damping;
    currentCamPos.y += (targetCamPos.y - currentCamPos.y) * damping;
    currentCamPos.z += (targetCamPos.z - currentCamPos.z) * damping;

    currentLookAt.x += (targetLookAt.x - currentLookAt.x) * damping;
    currentLookAt.y += (targetLookAt.y - currentLookAt.y) * damping;
    currentLookAt.z += (targetLookAt.z - currentLookAt.z) * damping;

    camera.position.set(currentCamPos.x, currentCamPos.y, currentCamPos.z);
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    if (studioSpotlight) {
      studioSpotlight.target.position.set(targetSpotPos.x, targetSpotPos.y, targetSpotPos.z);
    }

    // Monsoon Rain particle fall in Stage 5
    if (rainParticles && rainParticles.material.opacity > 0.04) {
      const positions = rainParticles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 32;
        if (positions[i] < 0) positions[i] = 45;
      }
      rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  window.initScrollTransitHero = function(canvasId, containerId) {
    if (isReady) {
      onResize();
      return;
    }

    canvasEl = document.getElementById(canvasId || 'scrollTransitHeroCanvas');
    containerEl = document.getElementById(containerId || 'plannerScrollHero');
    vehicleAssetStatusEl = document.getElementById('heroVehicleAssetStatus');
    if (!canvasEl) return;

    clock = new THREE.Clock();
    initMaterials();
    buildScene();
    loadVehicleAssets();
    storyStageCards = Array.from(document.querySelectorAll('#storyHeroCardsContainer > section')).map(section => ({
      el: section,
      content: section.querySelector('.story-hero-card'),
      lastVisible: null
    }));
    applyScrollChoreography(0);

    const width = canvasEl.clientWidth || window.innerWidth;
    const height = canvasEl.clientHeight || window.innerHeight;
    const aspect = width / height;

    camera = new THREE.PerspectiveCamera(width < 768 ? 54 : 38, aspect, 0.5, 500);
    camera.position.set(currentCamPos.x, currentCamPos.y, currentCamPos.z);
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: !isLowEndDevice,
      alpha: false,
      powerPreference: 'high-performance',
      precision: isLowEndDevice ? 'mediump' : 'highp'
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(isLowEndDevice ? Math.min(window.devicePixelRatio || 1, 1.15) : Math.min(window.devicePixelRatio || 1, 1.5));
    if (!isLowEndDevice) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      renderer.shadowMap.enabled = false;
    }
    if (typeof THREE.ACESFilmicToneMapping !== 'undefined') {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    }

    // Pause render loop when user scrolls completely past the hero into #planner
    if (typeof IntersectionObserver !== 'undefined' && containerEl) {
      intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          isRenderPaused = !e.isIntersecting;
          if (isRenderPaused && animId !== null) {
            cancelAnimationFrame(animId);
            animId = null;
          } else if (!isRenderPaused && animId === null) {
            animate();
          }
        });
      }, { threshold: 0.02 });
      intersectionObserver.observe(containerEl);
    }

    window.addEventListener('resize', onResize);
    isReady = true;
    animate();
  };

  window.scrollTransitHeroSetProgress = function(progress) {
    applyScrollChoreography(progress);
  };

  window.resizeScrollTransitHero = function() {
    onResize();
  };

  window.destroyScrollTransitHero = function() {
    if (animId !== null) cancelAnimationFrame(animId);
    animId = null;
    window.removeEventListener('resize', onResize);
    if (intersectionObserver) intersectionObserver.disconnect();
    intersectionObserver = null;
    storyStageCards = [];
    cityTraffic = [];
    cityNeonMaterials = [];
    cityWindowMaterials = [];
    cityGroup = null;
    vehicleAssetStatusEl = null;
    assetLoadGeneration++;
    if (window.ScrollTrigger && containerEl) {
      ScrollTrigger.getAll()
        .filter(trigger => trigger.trigger instanceof Element && containerEl.contains(trigger.trigger))
        .forEach(trigger => trigger.kill());
    }
    if (scene) {
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (!object.material) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          Object.values(material).forEach(value => {
            if (value && value.isTexture) value.dispose();
          });
          material.dispose();
        });
      });
      if (scene.environment) scene.environment.dispose();
    }
    if (renderer) renderer.dispose();
    isReady = false;
  };

})();
