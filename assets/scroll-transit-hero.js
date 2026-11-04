/**
 * ScrollTransitHero — 3D Scroll-Triggered Storytelling for Bhara dekhi
 * Vanilla Three.js + GSAP ScrollTrigger Integration
 * 
 * 4-Stage Scroll Animation:
 * 1. Rickshaw Fare Estimation (0% - 25% scroll): Warm golden-amber street lighting
 * 2. Bus Routes / BRTA Calibrated (25% - 50% scroll): Scrub to left, teal lighting
 * 3. Dhaka Metro Rail (50% - 75% scroll): Elevated right position, emerald-cyan lighting
 * 4. Weather Surge & Map Handoff (75% - 100% scroll): Center zoom, 3D rain particles, electric blue
 */

(function () {
  'use strict';

  let heroScene, heroCamera, heroRenderer;
  let heroDioramaGroup, heroCoreMesh, heroTrackMesh, heroGyroMesh;
  let heroRingMat, heroGyroMat, heroKeyLight, heroRainGeo, heroRainMat, heroRainParticles;
  let heroAnimFrameId = null;
  let heroScrollTriggerInstance = null;
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

    // 1. Scene, Camera & WebGL Renderer
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

    // 2. Master 3D Transit Group
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

    // Glowing Neon Rim Ring on Base (Golden Amber for Rickshaw stage)
    const ringGeo = new THREE.TorusGeometry(2.15, 0.04, 16, 64);
    heroRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
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

    // Secondary Inner Gyroscopic Indicator
    const gyroGeo = new THREE.TorusGeometry(1.2, 0.03, 16, 64);
    heroGyroMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
    });
    heroGyroMesh = new THREE.Mesh(gyroGeo, heroGyroMat);
    heroGyroMesh.rotation.set(-Math.PI / 4, 0, Math.PI / 3);
    heroGyroMesh.position.y = 0.25;
    heroDioramaGroup.add(heroGyroMesh);

    // 3. 3D Rain Particles for Section 4 (Open-Meteo Weather Surge)
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
      opacity: 0, // Hidden until Section 4
    });
    heroRainParticles = new THREE.Points(heroRainGeo, heroRainMat);
    heroScene.add(heroRainParticles);

    // 4. Studio Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    heroScene.add(ambientLight);

    heroKeyLight = new THREE.DirectionalLight(0xf59e0b, 4.5); // Starts Golden-Amber for Rickshaw
    heroKeyLight.position.set(4, 5, 4);
    heroScene.add(heroKeyLight);

    const fillLight = new THREE.DirectionalLight(0x14b8a6, 3);
    fillLight.position.set(-4, -2, 3);
    heroScene.add(fillLight);

    // 5. GSAP ScrollTrigger Choreography
    const isMobile = window.innerWidth < 768;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
      },
    });

    // Stage 1 -> Stage 2 (0% - 25% -> 25% - 50%): Rickshaw to BRTA Bus Routes
    tl.to(
      heroDioramaGroup.position,
      {
        x: isMobile ? 0 : -2.2,
        y: -0.1,
        z: 0.4,
        ease: 'power1.inOut',
      },
      0
    )
      .to(
        heroDioramaGroup.rotation,
        {
          y: Math.PI * 1.25,
          z: 0.1,
          ease: 'none',
        },
        0
      )
      .to(heroRingMat.color, { r: 0.08, g: 0.72, b: 0.65 }, 0) // Shift to Teal
      .to(heroGyroMat.color, { r: 0.08, g: 0.72, b: 0.65 }, 0)
      .to(heroKeyLight.color, { r: 0.08, g: 0.72, b: 0.65 }, 0);

    // Stage 2 -> Stage 3 (25% - 50% -> 50% - 75%): BRTA Bus to Dhaka Metro Rail (Elevated)
    tl.to(
      heroDioramaGroup.position,
      {
        x: isMobile ? 0 : 2.1,
        y: 0.45,
        z: 0.8,
        ease: 'power1.inOut',
      },
      1
    )
      .to(
        heroDioramaGroup.rotation,
        {
          x: 0.35,
          y: Math.PI * 2.5,
          z: -0.15,
          ease: 'none',
        },
        1
      )
      .to(heroCamera.position, { y: 1.5, ease: 'power1.inOut' }, 1)
      .to(heroRingMat.color, { r: 0.06, g: 0.73, b: 0.5 }, 1) // Shift to Emerald-Cyan
      .to(heroGyroMat.color, { r: 0.06, g: 0.73, b: 0.5 }, 1)
      .to(heroKeyLight.color, { r: 0.06, g: 0.73, b: 0.5 }, 1);

    // Stage 3 -> Stage 4 (50% - 75% -> 75% - 100%): Metro Rail to Dynamic Weather Surge
    tl.to(
      heroDioramaGroup.position,
      {
        x: 0,
        y: 0,
        z: 1.6,
        ease: 'power2.out',
      },
      2
    )
      .to(
        heroDioramaGroup.rotation,
        {
          x: 0.1,
          y: Math.PI * 3.75,
          z: 0,
          ease: 'none',
        },
        2
      )
      .to(heroRainMat, { opacity: 0.85 }, 2) // Activate 3D rain particles
      .to(heroRingMat.color, { r: 0.23, g: 0.51, b: 0.96 }, 2) // Shift to Stormy Blue
      .to(heroGyroMat.color, { r: 0.23, g: 0.51, b: 0.96 }, 2)
      .to(heroKeyLight.color, { r: 0.23, g: 0.51, b: 0.96 }, 2)
      .to(
        canvas,
        {
          opacity: 0.12, // Gentle canvas fade for smooth handoff into the planner below
          ease: 'power2.in',
        },
        2.5
      );

    heroScrollTriggerInstance = tl;

    // 6. Continuous Render Loop with Idle Rotation & Dynamic Rain
    function animateHero() {
      if (heroCoreMesh) heroCoreMesh.rotation.y += 0.004;
      if (heroTrackMesh) heroTrackMesh.rotation.z -= 0.006;
      if (heroGyroMesh) heroGyroMesh.rotation.x += 0.005;

      // Animate falling rain when opacity is triggered
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

    // 7. Responsive Viewport Resize Handler
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

  // Auto-init when document is ready if container is present and visible
  document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('scrollTransitHeroSection');
    if (container && !container.classList.contains('hidden')) {
      initScrollTransitHero();
    }
  });
})();
