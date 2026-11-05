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
    { key: 'bike', file: 'bike.glb', targetLength: 2.2, lane: 0 },
    { key: 'cng', file: 'cng-auto-rickshaw.glb', targetLength: 3.2, lane: 1 },
    { key: 'corolla', file: 'toyota-corolla.glb', targetLength: 4.5, lane: 2 },
    { key: 'camry', file: 'toyota-camry.glb', targetLength: 4.9, lane: 3 },
    { key: 'prius', file: 'toyota-prius.glb', targetLength: 4.5, lane: 0 },
    { key: 'axio', file: 'toyota-axio.glb', targetLength: 4.3, lane: 1 },
    { key: 'noah', file: 'toyota-noah.glb', targetLength: 4.8, lane: 2 },
    { key: 'civic', file: 'honda-civic.glb', targetLength: 4.7, lane: 3 },
    { key: 'city', file: 'honda-city.glb', targetLength: 4.4, lane: 0 },
    { key: 'vezel', file: 'honda-vezel.glb', targetLength: 4.5, lane: 1 },
    { key: 'crv', file: 'honda-cr-v.glb', targetLength: 4.7, lane: 2 },
    { key: 'sports', file: 'sports-coupe.glb', targetLength: 4.5, lane: 3 },
    { key: 'rickshaw', file: 'cycle-rickshaw.glb', targetLength: 3.2, lane: 0 },
    { key: 'bus', file: 'dhaka-city-bus.glb', targetLength: 9, lane: 2 },
    { key: 'metro', file: 'mrt-line-6-train.glb', targetLength: 18, lane: 1 }
  ];

  // Materials Cache
  let carPaintMat, glassMat, tireMat, rimMat, chromeMat;
  let cngGreenMat, cngYellowMat, rickshawHoodMat, busRedMat, busWhiteMat, metroSilverMat;

  function initMaterials() {
    carPaintMat = new THREE.MeshStandardMaterial({ color: 0x0047ab, roughness: 0.25, metalness: 0.45 });
    glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });
    tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.05 });
    rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.8 });
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
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);

    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x64707a, roughness: 0.48, metalness: 0.72 });
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width * 0.58, 16), rotorMat);
    rotor.rotation.z = Math.PI / 2;
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
        const direction = new THREE.Vector3(0, Math.cos(angle), Math.sin(angle));
        position.set(side * (width / 2 + 0.012), Math.cos(angle) * radius * 0.43, Math.sin(angle) * radius * 0.43);
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        matrix.compose(position, quaternion, scale);
        spokes.setMatrixAt(spokeIndex++, matrix);
      }
    }
    spokes.instanceMatrix.needsUpdate = true;
    wheel.add(spokes);

    const lipGeometry = new THREE.TorusGeometry(radius * 0.72, radius * 0.035, 5, 24);
    const sidewallGeometry = new THREE.TorusGeometry(radius * 0.82, radius * 0.018, 5, 24);
    const sidewallMat = new THREE.MeshStandardMaterial({ color: 0x34383d, roughness: 0.76 });
    for (const side of [-1, 1]) {
      const lip = new THREE.Mesh(lipGeometry, rimMat);
      lip.rotation.y = Math.PI / 2;
      lip.position.x = side * (width / 2 + 0.012);
      wheel.add(lip);

      const sidewall = new THREE.Mesh(sidewallGeometry, sidewallMat);
      sidewall.rotation.y = Math.PI / 2;
      sidewall.position.x = side * width * 0.37;
      wheel.add(sidewall);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.21, radius * 0.21, width * 1.12, 12), chromeMat);
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.12, radius * 0.12, width * 1.18, 12), rimMat);
    centerCap.rotation.z = Math.PI / 2;
    wheel.add(centerCap);

    wheel.name = 'vehicle-wheel';
    wheel.userData.isRollingWheel = true;
    wheel.userData.wheelRadius = radius;
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
    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.35), hlMat);
    hlL.position.set(2.2, 0.65, 0.65);
    car.add(hlL);
    const hlR = hlL.clone();
    hlR.position.set(2.2, 0.65, -0.65);
    car.add(hlR);
    // Wheels
    const wFL = createWheel(0.38, 0.26); wFL.position.set(1.3, 0.38, 0.95); car.add(wFL);
    const wFR = createWheel(0.38, 0.26); wFR.position.set(1.3, 0.38, -0.95); car.add(wFR);
    const wBL = createWheel(0.38, 0.26); wBL.position.set(-1.3, 0.38, 0.95); car.add(wBL);
    const wBR = createWheel(0.38, 0.26); wBR.position.set(-1.3, 0.38, -0.95); car.add(wBR);
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

  // 3. Sport Motorcycle / Bike
  function buildBike() {
    const bike = new THREE.Group();
    // Frame & Tank
    const tank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }));
    tank.position.set(0, 0.85, 0);
    bike.add(tank);
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.4), tireMat);
    seat.position.set(-0.55, 0.95, 0);
    bike.add(seat);
    // Fork & Handlebars
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), chromeMat);
    fork.rotation.z = -0.3;
    fork.position.set(0.7, 0.65, 0);
    bike.add(fork);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.9), chromeMat);
    hBar.position.set(0.65, 1.15, 0);
    bike.add(hBar);
    // Wheels
    const wF = createWheel(0.35, 0.16); wF.position.set(0.9, 0.35, 0); bike.add(wF);
    const wB = createWheel(0.35, 0.16); wB.position.set(-0.85, 0.35, 0); bike.add(wB);
    return bike;
  }

  // 4. Iconic Dhaka Cycle Rickshaw
  function buildRickshaw() {
    const rickshaw = new THREE.Group();
    const frame = new THREE.MeshStandardMaterial({ color: 0x292d31, metalness: 0.7, roughness: 0.34 });
    const carriage = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.7 });
    const blueCanopy = new THREE.MeshStandardMaterial({ color: 0x0878d1, roughness: 0.66, side: THREE.DoubleSide });
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

    addSeatedPassenger(rickshaw, 0.02, 0.87, 0, 0x713b70, 0x3146a6);
    addSeatedPassenger(rickshaw, -1.02, 1.0, -0.36, 0xc58a43, 0x35a6a6);
    addSeatedPassenger(rickshaw, -1.02, 1.0, 0.36, 0x7256a8, 0x278caa);
    return rickshaw;
  }

  // 5. BRTA City Transit Bus
  function buildBus() {
    const bus = new THREE.Group();
    // Lower red half
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.2, 2.4), busRedMat);
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
    // Wheels (Dual rear)
    const wF1 = createWheel(0.5, 0.3); wF1.position.set(2.8, 0.5, 1.2); bus.add(wF1);
    const wF2 = createWheel(0.5, 0.3); wF2.position.set(2.8, 0.5, -1.2); bus.add(wF2);
    const wR1 = createWheel(0.5, 0.3); wR1.position.set(-2.5, 0.5, 1.2); bus.add(wR1);
    const wR2 = createWheel(0.5, 0.3); wR2.position.set(-2.5, 0.5, -1.2); bus.add(wR2);
    return bus;
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

    const ambient = new THREE.AmbientLight(0x7183b8, 0.85);
    scene.add(ambient);
    const hemiLight = new THREE.HemisphereLight(0x5169c7, 0x11101f, 1.15);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xc3d8ff, 1.3);
    keyLight.position.set(-25, 50, 30);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(768, 768);
    keyLight.shadow.camera.left = -38;
    keyLight.shadow.camera.right = 38;
    keyLight.shadow.camera.top = 45;
    keyLight.shadow.camera.bottom = -45;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 120;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x5d46ff, 1.7);
    rimLight.position.set(35, 25, -50);
    scene.add(rimLight);
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
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffc66e });
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
        if (lampIndex % 2 === 0) {
          const light = new THREE.PointLight(0xffbd66, 2.0, 19, 2);
          light.position.set(lampX - side * 0.92, 5.95, z);
          cityGroup.add(light);
        }
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
      0xb99578, 0x8c9b82, 0x768ca1, 0xb27873, 0x9b8ba6, 0x69918a,
      0xc1aa80, 0x7f8972, 0xa98570, 0x778698, 0x9d7e82, 0x739185,
      0xb0a18a, 0x8c7c69, 0x7f96a1, 0xa08c68, 0x8b7b91, 0x7c9080
    ].map(color => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.68,
      metalness: 0.2,
      emissive: color,
      emissiveIntensity: 0.16
    }));
    const buildingNames = [
      'Gulshan Heights', 'Dhanmondi Plaza', 'Mirpur Tower', 'Motijheel House',
      'Karwan Bazar', 'Tejgaon Point', 'Uttara Square', 'Banani Arcade',
      'Shapla Market', 'Lalbagh Plaza', 'Bijoy Sarani', 'Bashundhara View',
      'Farmgate Center', 'Hatirjheel House', 'New Market', 'Mohakhali Tower',
      'Azimpur Court', 'Paltan Building'
    ];
    const buildingSignColors = ['#8f5f45', '#426d66', '#685f86', '#974f53', '#4a657c'];
    function createBuildingSignTexture(name, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 112;
      const context = canvas.getContext('2d');
      if (!context) return null;

      context.fillStyle = '#171521';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = color;
      context.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
      context.strokeStyle = '#ffe0a6';
      context.lineWidth = 5;
      context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      context.fillStyle = '#fff4dc';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = 'bold 42px Segoe UI, sans-serif';
      while (context.measureText(name).width > canvas.width - 42) {
        const fontSize = Number(context.font.match(/\d+/)[0]) - 2;
        if (fontSize < 22) break;
        context.font = `bold ${fontSize}px Segoe UI, sans-serif`;
      }
      context.fillText(name, canvas.width / 2, canvas.height / 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      return texture;
    }
    const towerEdgeMaterials = [
      new THREE.MeshBasicMaterial({ color: 0xd7b879 }),
      new THREE.MeshBasicMaterial({ color: 0x73aaa0 }),
      new THREE.MeshBasicMaterial({ color: 0xc88377 })
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
            towerMaterials[towerCount % towerMaterials.length]
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
              const colorIndex = Math.random() < 0.13
                ? 2
                : (Math.random() < 0.42 ? 1 : 0);
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

          const buildingName = `${buildingNames[towerCount % buildingNames.length]} ${String(towerCount + 1).padStart(2, '0')}`;
          const signTexture = createBuildingSignTexture(
            buildingName,
            buildingSignColors[towerCount % buildingSignColors.length]
          );
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
    const windowColors = [0xf3d19b, 0xc9d8e6, 0xe2c3bd];
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
      bus: 'city bus'
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
      const model = spec.key === 'bike' ? buildBike()
        : spec.key === 'cng' ? buildCNG()
          : spec.key === 'rickshaw' ? buildRickshaw()
            : spec.key === 'bus' ? buildBus()
              : carColors[spec.key] ? buildCar(carColors[spec.key]) : null;
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
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      actor.add(model);
      traffic.loaded = true;
      builtInModels.push(builtInLabels[spec.key]);
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

    setVehicleAssetStatus('Checking local 3D vehicle assets…', false);
    fetch('assets/models/manifest.json')
      .then(response => {
        if (!response.ok) throw new Error(`Model manifest returned HTTP ${response.status}.`);
        return response.json();
      })
      .then(manifest => {
        if (generation !== assetLoadGeneration) return;
        if (!manifest || !Array.isArray(manifest.models) || !manifest.models.every(file => typeof file === 'string')) {
          throw new Error('Model manifest must contain a string array named "models".');
        }

        const available = new Set(manifest.models);
        const allowedFiles = new Set(vehicleAssetSpecs.map(spec => spec.file));
        const invalidFiles = manifest.models.filter(file => !allowedFiles.has(file));
        if (invalidFiles.length) {
          throw new Error(`Model manifest contains unsupported files: ${invalidFiles.join(', ')}.`);
        }

        const laneDefinitions = [
          { x: -2.05, direction: 1 },
          { x: -5.55, direction: 1 },
          { x: 2.05, direction: -1 },
          { x: 5.55, direction: -1 }
        ];
        const laneCounts = [0, 0, 0, 0];
        vehicleAssetSpecs.forEach(spec => {
          if (spec.key !== 'metro') laneCounts[spec.lane]++;
        });
        const laneOffsets = [0, 0, 0, 0];

        vehicleAssetSpecs.forEach(spec => {
          const shouldUseBuiltIn = spec.key !== 'metro'
            && (!available.has(spec.file) || !loader);
          if (!available.has(spec.file) && !shouldUseBuiltIn) {
            unavailable.push(spec.file);
            completed++;
            return;
          }

          const path = `assets/models/${spec.file}`;
          const lane = laneDefinitions[spec.lane];
          const slot = laneOffsets[spec.lane]++;
          const laneSpacing = 152 / Math.max(1, laneCounts[spec.lane]);
          const elevated = spec.key === 'metro';
          const distance = elevated ? -82 : 55 - slot * laneSpacing;
          const actor = new THREE.Group();
          if (!elevated) {
            const shadow = new THREE.Mesh(
              new THREE.PlaneGeometry(spec.targetLength * 0.82, spec.key === 'bike' ? 0.9 : 1.7),
              new THREE.MeshBasicMaterial({ color: 0x03070b, transparent: true, opacity: 0.42, depthWrite: false })
            );
            shadow.rotation.x = -Math.PI / 2;
            shadow.position.y = 0.025;
            actor.add(shadow);
          }
          actor.position.set(elevated ? 17 : lane.x, elevated ? 8.85 : 0, distance);
          actor.rotation.y = lane.direction > 0 ? Math.PI : 0;
          cityGroup.add(actor);
          const traffic = {
            mesh: actor,
            key: spec.key,
            lane: elevated ? 17 : lane.x,
            laneIndex: spec.lane,
            direction: lane.direction,
            distance,
            speed: elevated ? 7.2 : 5.8 + spec.lane * 0.3,
            wheelNodes: [],
            wheelRadius: 0,
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
                console.warn(`Bhara dekhi hero: ${spec.file} has no measurable geometry; using the built-in ${builtInLabels[spec.key] || spec.key} model.`);
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
              if (object.userData.isRollingWheel) {
                traffic.wheelNodes.push(object);
                traffic.wheelRadius = object.userData.wheelRadius;
              }
              if (/wheel|tire|tyre/i.test(object.name)) traffic.wheelNodes.push(object);
            });
            actor.add(model);
            traffic.wheelRadius = spec.key === 'bike' ? 0.34 : 0.48;
            traffic.loaded = true;
            loaded++;
            completed++;
            updateVehicleAssetStatus();
          }, undefined, error => {
            if (generation !== assetLoadGeneration) return;
            if (attachBuiltInModel(spec, actor, traffic)) {
              completed++;
              console.warn(`Bhara dekhi hero: ${path} failed to load; using the built-in ${builtInLabels[spec.key] || spec.key} model.`, error);
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
      })
      .catch(error => {
        if (generation !== assetLoadGeneration) return;
        setVehicleAssetStatus('Could not read assets/models/manifest.json. Check the vehicle asset setup.', true);
        console.error('Bhara dekhi hero: failed to read vehicle asset manifest.', error);
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
    storyStageCards.forEach((card, index) => {
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
      card.style.transform = `translateY(${(1 - visibility) * 14}px) scale(${0.985 + visibility * 0.015})`;
      card.style.pointerEvents = visibility >= 0.5 ? 'auto' : 'none';
      card.style.zIndex = String(Math.round(visibility * 10));
      card.inert = visibility < 0.5;
      card.setAttribute('aria-hidden', visibility < 0.5 ? 'true' : 'false');
      const cardContent = card.querySelector('.story-hero-card');
      if (cardContent) cardContent.style.pointerEvents = visibility >= 0.5 ? 'auto' : 'none';
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
    renderer.setPixelRatio(width < 768 ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25));
    masterGroup.scale.setScalar(width < 768 ? 0.78 : 1);
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    if (isRenderPaused || !renderer || !scene || !camera) return;

    const delta = clock ? Math.min(clock.getDelta(), 0.05) : 0.016;
    cityTraffic.forEach(vehicle => {
      const laneSpeed = vehicle.speed + Math.sin(clock.elapsedTime * 0.22 + vehicle.laneIndex) * 0.35;
      vehicle.distance += laneSpeed * vehicle.direction * delta;
      const upperBound = vehicle.key === 'metro' ? 25 : 60;
      const lowerBound = vehicle.key === 'metro' ? -82 : -105;
      if (vehicle.distance > upperBound) vehicle.distance = lowerBound;
      if (vehicle.distance < lowerBound) vehicle.distance = upperBound;
      vehicle.mesh.position.z = vehicle.distance;
      if (vehicle.loaded && vehicle.wheelNodes.length) {
        const rotation = laneSpeed * delta / vehicle.wheelRadius;
        vehicle.wheelNodes.forEach(wheel => {
          wheel.rotation.x += vehicle.direction > 0 ? rotation : -rotation;
        });
      }
    });

    const cityPulse = 0.64 + Math.sin(clock.elapsedTime * 1.5) * 0.08;
    cityWindowMaterials.forEach(material => {
      material.opacity = cityPulse;
    });

    // Smooth Damped Camera Interpolation (Silky 120 FPS feel)
    const factor = Math.min(1.0, delta * 7.0);
    currentCamPos.x += (targetCamPos.x - currentCamPos.x) * factor;
    currentCamPos.y += (targetCamPos.y - currentCamPos.y) * factor;
    currentCamPos.z += (targetCamPos.z - currentCamPos.z) * factor;

    currentLookAt.x += (targetLookAt.x - currentLookAt.x) * factor;
    currentLookAt.y += (targetLookAt.y - currentLookAt.y) * factor;
    currentLookAt.z += (targetLookAt.z - currentLookAt.z) * factor;

    camera.position.set(currentCamPos.x, currentCamPos.y, currentCamPos.z);
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    if (studioSpotlight) {
      studioSpotlight.target.position.set(targetSpotPos.x, targetSpotPos.y, targetSpotPos.z);
    }

    // Monsoon Rain particle fall in Stage 5
    if (rainParticles && rainParticles.material.opacity > 0.02) {
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
    storyStageCards = Array.from(document.querySelectorAll('#storyHeroCardsContainer > section'));
    applyScrollChoreography(0);

    const width = canvasEl.clientWidth || window.innerWidth;
    const height = canvasEl.clientHeight || window.innerHeight;
    const aspect = width / height;

    camera = new THREE.PerspectiveCamera(width < 768 ? 54 : 38, aspect, 0.5, 500);
    camera.position.set(currentCamPos.x, currentCamPos.y, currentCamPos.z);
    camera.lookAt(currentLookAt.x, currentLookAt.y, currentLookAt.z);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(width < 768 ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
