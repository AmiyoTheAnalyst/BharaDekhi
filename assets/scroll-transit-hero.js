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

  // Master Scene Groups
  let masterGroup, roadGroup, vehicleGroup, metroGroup, weatherGroup;
  let carMesh, cngMesh, bikeMesh, rickshawMesh, busMesh, trainMesh;
  let rainParticles = null;
  let studioSpotlight = null;

  // Camera animation target values
  let currentCamPos = { x: 30, y: 18, z: 46 };
  let targetCamPos  = { x: 30, y: 18, z: 46 };
  let currentLookAt  = { x: 0, y: 5, z: 0 };
  let targetLookAt   = { x: 0, y: 5, z: 0 };
  let targetSpotPos  = { x: 0, y: 6, z: 0 };

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
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width * 1.02, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);
    return wheel;
  }

  // 1. Aerodynamic Sports Car
  function buildCar() {
    const car = new THREE.Group();
    // Body lower chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.75, 1.9), carPaintMat);
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
    // Lower body (Green)
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 1.5), cngGreenMat);
    base.position.y = 0.65;
    cng.add(base);
    // Yellow Curved Canopy
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 1.45), cngYellowMat);
    roof.position.set(-0.25, 1.4, 0);
    cng.add(roof);
    // Windshield
    const ws = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.3), glassMat);
    ws.position.set(0.78, 1.25, 0);
    cng.add(ws);
    // Front Single Wheel + Dual Rear Wheels
    const wF = createWheel(0.32, 0.2); wF.position.set(1.1, 0.32, 0); cng.add(wF);
    const wRL = createWheel(0.32, 0.2); wRL.position.set(-0.9, 0.32, 0.75); cng.add(wRL);
    const wRR = createWheel(0.32, 0.2); wRR.position.set(-0.9, 0.32, -0.75); cng.add(wRR);
    // Front Round Headlight
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    hl.rotation.z = Math.PI / 2;
    hl.position.set(1.4, 0.75, 0);
    cng.add(hl);
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
    // Tricycle frame
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), chromeMat);
    frame.rotation.z = Math.PI / 2;
    frame.position.set(0.2, 0.6, 0);
    rickshaw.add(frame);
    // Passenger Seat Bench
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 }));
    seatBase.position.set(-0.5, 0.7, 0);
    rickshaw.add(seatBase);
    // Authentic Curved Rickshaw Hood (Red with gold trim)
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.25, 12, 1, false, 0, Math.PI), rickshawHoodMat);
    hood.rotation.z = -Math.PI / 2;
    hood.position.set(-0.65, 1.35, 0);
    rickshaw.add(hood);
    // Hood Gold Trim
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.3), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.5 }));
    trim.position.set(-0.15, 1.35, 0);
    rickshaw.add(trim);
    // Front Bicycle Wheel (Thin Spoke)
    const wF = createWheel(0.42, 0.1); wF.position.set(1.2, 0.42, 0); rickshaw.add(wF);
    // Rear Dual Carriage Wheels
    const wRL = createWheel(0.44, 0.1); wRL.position.set(-0.5, 0.44, 0.7); rickshaw.add(wRL);
    const wRR = createWheel(0.44, 0.1); wRR.position.set(-0.5, 0.44, -0.7); rickshaw.add(wRR);
    // Handlebars
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.75), chromeMat);
    hb.position.set(0.95, 1.2, 0);
    rickshaw.add(hb);
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

  function buildScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);
    scene.fog = new THREE.FogExp2(0x020408, 0.012);

    initMaterials();

    masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xdbeafe, 1.25);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020408, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(40, 60, 40);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 1.8);
    rimLight.position.set(-40, 30, -30);
    scene.add(rimLight);

    studioSpotlight = new THREE.SpotLight(0x67e8f9, 4.0, 70, Math.PI / 4, 0.45, 1.2);
    studioSpotlight.position.set(0, 35, 15);
    studioSpotlight.target.position.set(0, 0, 0);
    scene.add(studioSpotlight);
    scene.add(studioSpotlight.target);

    // Asphalt Ground
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.85, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    masterGroup.add(ground);

    // Road Markings (Grid Lines)
    const grid = new THREE.GridHelper(120, 24, 0x0284c7, 0x1e293b);
    grid.position.y = 0.02;
    masterGroup.add(grid);

    // Vehicles Group
    vehicleGroup = new THREE.Group();
    masterGroup.add(vehicleGroup);

    // Stage 1 Fleet: Car, CNG & Bike side-by-side
    carMesh = buildCar();
    carMesh.position.set(5.5, 0, 2);
    vehicleGroup.add(carMesh);

    cngMesh = buildCNG();
    cngMesh.position.set(0, 0, 2);
    vehicleGroup.add(cngMesh);

    bikeMesh = buildBike();
    bikeMesh.position.set(-4.5, 0, 2);
    vehicleGroup.add(bikeMesh);

    // Stage 2: Rickshaw
    rickshawMesh = buildRickshaw();
    rickshawMesh.position.set(-16, 0, -4);
    vehicleGroup.add(rickshawMesh);

    // Stage 3: BRTA City Bus
    busMesh = buildBus();
    busMesh.position.set(16, 0, -6);
    vehicleGroup.add(busMesh);

    // Stage 4: Metro Rail Elevated Viaduct
    metroGroup = buildMetro();
    metroGroup.position.set(0, 0, -18);
    masterGroup.add(metroGroup);

    // Stage 5: Rain Particles
    rainParticles = buildRain();
    masterGroup.add(rainParticles);
  }

  // Camera & Studio Lighting Choreography across the 5 Stages
  function applyScrollChoreography(progress) {
    const p = Math.max(0, Math.min(1, progress));

    if (p < 0.20) {
      // Stage 1: Comparison of Bike, CNG & Car Fare
      const stg = p / 0.20;
      targetCamPos = {
        x: 18 - stg * 8,
        y: 11 - stg * 2,
        z: 22 - stg * 4
      };
      targetLookAt = { x: 0.5, y: 1.2, z: 2 };
      targetSpotPos = { x: 0, y: 1.5, z: 2 };
      if (studioSpotlight) studioSpotlight.color.setHex(0x38bdf8);
      if (rainParticles) rainParticles.material.opacity = 0;

    } else if (p < 0.40) {
      // Stage 2: Rickshaw Fare Estimation
      const stg = (p - 0.20) / 0.20;
      targetCamPos = {
        x: 10 - stg * 22,
        y: 9 - stg * 1.5,
        z: 18 - stg * 6
      };
      targetLookAt = {
        x: 0.5 - stg * 16.5,
        y: 1.2,
        z: 2 - stg * 6
      };
      targetSpotPos = { x: -16, y: 1.5, z: -4 };
      if (studioSpotlight) studioSpotlight.color.setHex(0xf59e0b);
      if (rainParticles) rainParticles.material.opacity = 0;

    } else if (p < 0.60) {
      // Stage 3: Smart Bus Route Discovery (BRTA Calibrated)
      const stg = (p - 0.40) / 0.20;
      targetCamPos = {
        x: -12 + stg * 36,
        y: 7.5 + stg * 4,
        z: 12 + stg * 8
      };
      targetLookAt = {
        x: -16 + stg * 32,
        y: 1.2 + stg * 1.5,
        z: -4 - stg * 2
      };
      targetSpotPos = { x: 16, y: 2.5, z: -6 };
      if (studioSpotlight) studioSpotlight.color.setHex(0xef4444);
      if (rainParticles) rainParticles.material.opacity = 0;

    } else if (p < 0.80) {
      // Stage 4: Dhaka Metro Rail MRT Line-6
      const stg = (p - 0.60) / 0.20;
      targetCamPos = {
        x: 24 - stg * 24,
        y: 11.5 + stg * 14,
        z: 20 + stg * 4
      };
      targetLookAt = {
        x: 16 - stg * 16,
        y: 2.7 + stg * 12.5,
        z: -6 - stg * 12
      };
      targetSpotPos = { x: 0, y: 15, z: -18 };
      if (studioSpotlight) studioSpotlight.color.setHex(0x10b981);
      if (rainParticles) rainParticles.material.opacity = 0;

    } else {
      // Stage 5: Weather Surge Pricing & Multimodal Overview
      const stg = (p - 0.80) / 0.20;
      targetCamPos = {
        x: 0 + stg * 32,
        y: 25.5 + stg * 16,
        z: 24 + stg * 28
      };
      targetLookAt = {
        x: 0,
        y: 15.2 - stg * 10,
        z: -18 + stg * 10
      };
      targetSpotPos = { x: 0, y: 5, z: -5 };
      if (studioSpotlight) studioSpotlight.color.setHex(0x60a5fa);
      if (rainParticles) rainParticles.material.opacity = Math.min(0.85, stg * 1.1);
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
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    if (isRenderPaused || !renderer || !scene || !camera) return;

    const delta = clock ? Math.min(clock.getDelta(), 0.05) : 0.016;

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

    // Gentle Metro Train Glide
    if (trainMesh) {
      trainMesh.position.x = (trainMesh.position.x + delta * 2.5);
      if (trainMesh.position.x > 18) trainMesh.position.x = -18;
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
    if (!canvasEl) return;

    clock = new THREE.Clock();
    buildScene();

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
    if (typeof THREE.ACESFilmicToneMapping !== 'undefined') {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    }

    // Pause render loop when user scrolls completely past the hero into #planner
    if (typeof IntersectionObserver !== 'undefined' && containerEl) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          isRenderPaused = !e.isIntersecting;
        });
      }, { threshold: 0.02 });
      obs.observe(containerEl);
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

})();

