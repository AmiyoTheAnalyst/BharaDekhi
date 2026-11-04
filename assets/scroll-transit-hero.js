/**
 * ScrollTransitHero — 5-Stage 3D Scroll-Triggered Storytelling for Bhara dekhi
 * Vanilla Three.js + GSAP ScrollTrigger Integration
 * 
 * 5-Stage Scroll Architecture (500vh container, scrub: 1.2):
 * 1. Stage 1 (0% – 20%): Comparison of Bike, CNG, & Car Fare (3-node orbital formation, electric violet & cyan)
 * 2. Stage 2 (20% – 40%): Rickshaw Fare Estimation (Scrub left, collapse pods, warm golden-amber)
 * 3. Stage 3 (40% – 60%): Smart Bus Route Discovery / BRTA Calibrated (Scrub right, vibrant teal)
 * 4. Stage 4 (60% – 80%): Dhaka Metro Rail MRT Line-6 (Elevated left, emerald-cyan neon)
 * 5. Stage 5 (80% – 100%): Dynamic Weather Surge Pricing & Map Handoff (Center zoom, 3D rain particles, electric blue)
 */

(function () {
  'use strict';

  let heroScene, heroCamera, heroRenderer;
  let heroDioramaGroup, heroCoreMesh, heroTrackMesh, heroGyroMesh;
  let heroComparisonPodsGroup, heroBikePod, heroCngPod, heroCarPod;
  let heroRingMat, heroGyroMat, heroKeyLight, heroFillLight, heroRainGeo, heroRainMat, heroRainParticles;
  let heroAnimFrameId = null;
  let heroTimeline = null;
  let isInitialized = false;

  function initScrollTransitHero() {
    const container = document.getElementById('scrollTransitHeroSection');
    const canvas = document.getElementById('scrollTransitHeroCanvas');

    if (!container || !canvas) return;
    if (typeof THREE === 'undefined') {
      console.warn('ScrollTransitHero: THREE is not loaded yet.');
      return;
    }
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('ScrollTransitHero: GSAP or ScrollTrigger is not loaded.');
      return;
    }

    if (isInitialized) {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // 1. Scene, Camera & WebGL Renderer setup
    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    heroCamera.position.set(0, 1.2, 7.5);

    heroRenderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    heroRenderer.setSize(window.innerWidth, window.innerHeight);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Master 3D Transit Group (Diorama Hub)
    heroDioramaGroup = new THREE.Group();
    const isMobileInitial = window.innerWidth < 768;
    heroDioramaGroup.position.set(isMobileInitial ? 0 : 2.2, -0.2, 0);
    heroDioramaGroup.scale.setScalar(isMobileInitial ? 0.78 : 1.0);
    heroScene.add(heroDioramaGroup);

    // Sleek Circular Transit Base Platform
    const baseGeo = new THREE.CylinderGeometry(2.1, 2.3, 0.25, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.1;
    heroDioramaGroup.add(baseMesh);

    // Glowing Neon Rim Ring on Base (Starts Electric Violet for Stage 1 Multi-Mode Comparison)
    const ringGeo = new THREE.TorusGeometry(2.15, 0.04, 16, 64);
    heroRingMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
    const ringMesh = new THREE.Mesh(ringGeo, heroRingMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.98;
    heroDioramaGroup.add(ringMesh);

    // Stylized 3D Transit Core Hub
    const coreGeo = new THREE.OctahedronGeometry(1.05, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.15,
      wireframe: false,
    });
    heroCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    heroCoreMesh.position.y = 0.25;
    heroDioramaGroup.add(heroCoreMesh);

    // Orbiting Transit Ring (Metro & Route Track Representation)
    const trackGeo = new THREE.TorusGeometry(1.55, 0.06, 20, 80);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
    });
    heroTrackMesh = new THREE.Mesh(trackGeo, trackMat);
    heroTrackMesh.rotation.set(Math.PI / 3, Math.PI / 6, 0);
    heroTrackMesh.position.y = 0.25;
    heroDioramaGroup.add(heroTrackMesh);

    // Secondary Gyroscopic Ring
    const gyroGeo = new THREE.TorusGeometry(1.2, 0.03, 16, 64);
    heroGyroMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.8,
      roughness: 0.2,
    });
    heroGyroMesh = new THREE.Mesh(gyroGeo, heroGyroMat);
    heroGyroMesh.rotation.set(-Math.PI / 4, 0, Math.PI / 3);
    heroGyroMesh.position.y = 0.25;
    heroDioramaGroup.add(heroGyroMesh);

    // =========================================================================
    // 3. 3-Node Orbital Comparison Formation (Bike, CNG, Car Pods for Stage 1)
    // =========================================================================
    heroComparisonPodsGroup = new THREE.Group();
    heroComparisonPodsGroup.position.y = 0.25;
    heroDioramaGroup.add(heroComparisonPodsGroup);

    const orbitRadius = 1.75;

    // Node A: Ride-Share Bike Pod (Electric Violet / Purple)
    const bikePodGroup = new THREE.Group();
    const bikePodGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.42, 16);
    const bikePodMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.55,
      metalness: 0.8,
      roughness: 0.2,
    });
    heroBikePod = new THREE.Mesh(bikePodGeo, bikePodMat);
    heroBikePod.rotation.x = Math.PI / 2;
    bikePodGroup.add(heroBikePod);

    const bikeHaloGeo = new THREE.TorusGeometry(0.38, 0.02, 8, 32);
    const bikeHaloMat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd });
    const bikeHalo = new THREE.Mesh(bikeHaloGeo, bikeHaloMat);
    bikeHalo.rotation.x = Math.PI / 2;
    bikePodGroup.add(bikeHalo);

    bikePodGroup.position.set(orbitRadius * Math.cos(0), 0, orbitRadius * Math.sin(0));
    heroComparisonPodsGroup.add(bikePodGroup);

    // Node B: CNG Auto-Rickshaw Pod (Vibrant Emerald / Teal)
    const cngPodGroup = new THREE.Group();
    const cngPodGeo = new THREE.BoxGeometry(0.48, 0.38, 0.38);
    const cngPodMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.5,
      metalness: 0.75,
      roughness: 0.25,
    });
    heroCngPod = new THREE.Mesh(cngPodGeo, cngPodMat);
    cngPodGroup.add(heroCngPod);

    const cngHaloGeo = new THREE.TorusGeometry(0.42, 0.02, 8, 32);
    const cngHaloMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    const cngHalo = new THREE.Mesh(cngHaloGeo, cngHaloMat);
    cngHalo.rotation.x = Math.PI / 2;
    cngPodGroup.add(cngHalo);

    const cngAngle = (2 * Math.PI) / 3;
    cngPodGroup.position.set(orbitRadius * Math.cos(cngAngle), 0, orbitRadius * Math.sin(cngAngle));
    heroComparisonPodsGroup.add(cngPodGroup);

    // Node C: Car / Microbus Pod (Vibrant Cyan / Electric Blue)
    const carPodGroup = new THREE.Group();
    const carPodGeo = new THREE.BoxGeometry(0.62, 0.28, 0.42);
    const carPodMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.55,
      metalness: 0.85,
      roughness: 0.15,
    });
    heroCarPod = new THREE.Mesh(carPodGeo, carPodMat);
    carPodGroup.add(heroCarPod);

    const carHaloGeo = new THREE.TorusGeometry(0.46, 0.02, 8, 32);
    const carHaloMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
    const carHalo = new THREE.Mesh(carHaloGeo, carHaloMat);
    carHalo.rotation.x = Math.PI / 2;
    carPodGroup.add(carHalo);

    const carAngle = (4 * Math.PI) / 3;
    carPodGroup.position.set(orbitRadius * Math.cos(carAngle), 0, orbitRadius * Math.sin(carAngle));
    heroComparisonPodsGroup.add(carPodGroup);

    // 4. 3D Rain Particles for Stage 5 (Open-Meteo Weather Surge)
    const rainCount = 450;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 14;
      rainPositions[i + 1] = (Math.random() - 0.5) * 10;
      rainPositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    heroRainGeo = new THREE.BufferGeometry();
    heroRainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    heroRainMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.07,
      transparent: true,
      opacity: 0, // Hidden until Stage 5
    });
    heroRainParticles = new THREE.Points(heroRainGeo, heroRainMat);
    heroScene.add(heroRainParticles);

    // 5. Studio Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    heroScene.add(ambientLight);

    heroKeyLight = new THREE.DirectionalLight(0x8b5cf6, 4.5); // Starts Electric Violet for Stage 1 Multi-Mode
    heroKeyLight.position.set(4, 5, 4);
    heroScene.add(heroKeyLight);

    heroFillLight = new THREE.DirectionalLight(0x06b6d4, 3.2); // Vibrant Cyan fill
    heroFillLight.position.set(-4, -2, 3);
    heroScene.add(heroFillLight);

    // =========================================================================
    // 6. 5-Stage GSAP ScrollTrigger Choreography (500vh container, scrub: 1.2)
    // =========================================================================
    const isMobile = window.innerWidth < 768;

    heroTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
      },
    });

    // Stage 1 (0% – 20%) -> Stage 2 (20% – 40%):
    // Multi-Mode Comparison (Right) -> Rickshaw Fare Estimation (Left)
    // Collapse 3 comparison pods into hub, shift to warm golden-amber
    heroTimeline
      .to(
        heroDioramaGroup.position,
        {
          x: isMobile ? 0 : -2.2,
          y: -0.15,
          z: 0.35,
          ease: 'power1.inOut',
        },
        0
      )
      .to(
        heroDioramaGroup.rotation,
        {
          y: Math.PI * 0.95,
          z: 0.08,
          ease: 'none',
        },
        0
      )
      .to(
        heroComparisonPodsGroup.scale,
        {
          x: 0.05,
          y: 0.05,
          z: 0.05,
          ease: 'power2.in',
        },
        0
      )
      .to(heroRingMat.color, { r: 0.96, g: 0.62, b: 0.04 }, 0) // Shift to Golden Amber (#f59e0b)
      .to(heroGyroMat.color, { r: 0.96, g: 0.62, b: 0.04 }, 0)
      .to(heroKeyLight.color, { r: 0.96, g: 0.62, b: 0.04 }, 0)
      .to(heroFillLight.color, { r: 0.85, g: 0.45, b: 0.1 }, 0);

    // Stage 2 (20% – 40%) -> Stage 3 (40% – 60%):
    // Rickshaw (Left) -> Smart Bus Route Discovery / BRTA Calibrated (Right)
    // Rotate model, shift lighting to vibrant teal
    heroTimeline
      .to(
        heroDioramaGroup.position,
        {
          x: isMobile ? 0 : 2.2,
          y: -0.05,
          z: 0.5,
          ease: 'power1.inOut',
        },
        1
      )
      .to(
        heroDioramaGroup.rotation,
        {
          y: Math.PI * 2.2,
          z: -0.05,
          ease: 'none',
        },
        1
      )
      .to(heroRingMat.color, { r: 0.08, g: 0.72, b: 0.65 }, 1) // Shift to Vibrant Teal (#14b8a6)
      .to(heroGyroMat.color, { r: 0.08, g: 0.72, b: 0.65 }, 1)
      .to(heroKeyLight.color, { r: 0.08, g: 0.72, b: 0.65 }, 1)
      .to(heroFillLight.color, { r: 0.05, g: 0.6, b: 0.5 }, 1);

    // Stage 3 (40% – 60%) -> Stage 4 (60% – 80%):
    // Bus Routes (Right) -> Dhaka Metro Rail MRT Line-6 (Left & Elevated)
    // Elevate model & camera, shift to emerald-cyan neon
    heroTimeline
      .to(
        heroDioramaGroup.position,
        {
          x: isMobile ? 0 : -2.1,
          y: 0.45,
          z: 0.8,
          ease: 'power1.inOut',
        },
        2
      )
      .to(
        heroDioramaGroup.rotation,
        {
          x: 0.35,
          y: Math.PI * 3.4,
          z: -0.15,
          ease: 'none',
        },
        2
      )
      .to(heroCamera.position, { y: 1.55, ease: 'power1.inOut' }, 2)
      .to(heroRingMat.color, { r: 0.06, g: 0.73, b: 0.5 }, 2) // Shift to Emerald-Cyan (#10b981)
      .to(heroGyroMat.color, { r: 0.06, g: 0.73, b: 0.5 }, 2)
      .to(heroKeyLight.color, { r: 0.06, g: 0.73, b: 0.5 }, 2)
      .to(heroFillLight.color, { r: 0.04, g: 0.65, b: 0.45 }, 2);

    // Stage 4 (60% – 80%) -> Stage 5 (80% – 100%):
    // Metro Rail -> Live Weather Surge Pricing & Map Handoff
    // Center zoom, 3D rain particles, stormy electric blue, and canvas fade
    heroTimeline
      .to(
        heroDioramaGroup.position,
        {
          x: 0,
          y: 0,
          z: 1.6,
          ease: 'power2.out',
        },
        3
      )
      .to(
        heroDioramaGroup.rotation,
        {
          x: 0.1,
          y: Math.PI * 4.6,
          z: 0,
          ease: 'none',
        },
        3
      )
      .to(heroCamera.position, { y: 1.2, ease: 'power1.out' }, 3)
      .to(heroRainMat, { opacity: 0.85 }, 3) // Activate 3D rain particles
      .to(heroRingMat.color, { r: 0.23, g: 0.51, b: 0.96 }, 3) // Shift to Stormy Blue (#3b82f6)
      .to(heroGyroMat.color, { r: 0.23, g: 0.51, b: 0.96 }, 3)
      .to(heroKeyLight.color, { r: 0.23, g: 0.51, b: 0.96 }, 3)
      .to(heroFillLight.color, { r: 0.15, g: 0.4, b: 0.85 }, 3)
      .to(
        canvas,
        {
          opacity: 0.1, // Smooth fade to transition into the Leaflet map planner below
          ease: 'power2.in',
        },
        3.5
      );

    // 7. Continuous Render Loop with Idle Rotation & Dynamic Rain
    function animateHero() {
      if (heroCoreMesh) heroCoreMesh.rotation.y += 0.004;
      if (heroTrackMesh) heroTrackMesh.rotation.z -= 0.006;
      if (heroGyroMesh) heroGyroMesh.rotation.x += 0.005;

      // Orbit the 3 comparison mode pods around the center transit hub
      if (heroComparisonPodsGroup && heroComparisonPodsGroup.scale.x > 0.08) {
        heroComparisonPodsGroup.rotation.y += 0.014;
      }

      // Animate falling rain when triggered in Stage 5
      if (heroRainMat && heroRainMat.opacity > 0.01 && heroRainGeo) {
        const positions = heroRainGeo.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 0.08;
          if (positions[i] < -5) positions[i] = 5;
        }
        heroRainGeo.attributes.position.needsUpdate = true;
      }

      if (heroRenderer && heroScene && heroCamera) {
        heroRenderer.render(heroScene, heroCamera);
      }
      heroAnimFrameId = requestAnimationFrame(animateHero);
    }
    animateHero();

    // 8. Responsive Viewport Resize Handler
    function handleHeroResize() {
      if (!heroCamera || !heroRenderer || !heroDioramaGroup) return;
      const mobile = window.innerWidth < 768;
      heroCamera.aspect = window.innerWidth / window.innerHeight;
      heroCamera.updateProjectionMatrix();
      heroRenderer.setSize(window.innerWidth, window.innerHeight);
      heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      heroDioramaGroup.scale.setScalar(mobile ? 0.78 : 1.0);
      if (mobile) {
        heroDioramaGroup.position.x = 0;
      }
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }
    window.addEventListener('resize', handleHeroResize);

    isInitialized = true;
  }

  // Global smooth scroll helper to the planner
  window.scrollToPlanner = function (event) {
    if (event) event.preventDefault();
    const planner = document.getElementById('planner') || document.getElementById('userPlannerView');
    if (planner) {
      planner.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Expose init helper globally
  window.initScrollTransitHero = initScrollTransitHero;

  // Auto-init on DOMContentLoaded or route activation
  document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('scrollTransitHeroSection');
    if (container && !container.classList.contains('hidden')) {
      initScrollTransitHero();
    }
  });
})();
