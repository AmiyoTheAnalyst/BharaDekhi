'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ScrollTransitHero — 3D Scroll-Triggered Storytelling Component
 * Designed for Bhara dekhi (Dhaka Transit & Fare Planning Platform)
 * 
 * Features:
 * - 400vh scroll choreography with sticky 100vh Three.js canvas
 * - Non-blocking pointer events (canvas passes through to Leaflet/OSRM map below)
 * - 4 distinct transit stages (Rickshaw, BRTA Bus, Dhaka Metro Rail, Weather Surge)
 * - Responsive mobile positioning & scale adjustments
 * - Strict memory cleanup (geometries, materials, textures, renderer, ScrollTrigger)
 */
export default function ScrollTransitHero() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Scene, Camera & WebGL Renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.2, 7.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Master 3D Transit Group (Container for procedural models or custom GLTF assets)
    const dioramaGroup = new THREE.Group();
    const isMobileInitial = window.innerWidth < 768;
    dioramaGroup.position.set(isMobileInitial ? 0 : 2.2, -0.2, 0);
    dioramaGroup.scale.setScalar(isMobileInitial ? 0.78 : 1.0);
    scene.add(dioramaGroup);

    // Sleek Circular Transit Base Platform
    const baseGeo = new THREE.CylinderGeometry(2.1, 2.3, 0.25, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.1;
    dioramaGroup.add(baseMesh);

    // Glowing Neon Rim Ring on Base
    const ringGeo = new THREE.TorusGeometry(2.15, 0.04, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.98;
    dioramaGroup.add(ringMesh);

    // Stylized 3D Transit Core Hub (Rickshaw / Bus / Metro transitions)
    const coreGeo = new THREE.OctahedronGeometry(1.05, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.15,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.y = 0.25;
    dioramaGroup.add(coreMesh);

    // Orbiting Transit Ring (Metro & Route Track Representation)
    const trackGeo = new THREE.TorusGeometry(1.55, 0.06, 20, 80);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.set(Math.PI / 3, Math.PI / 6, 0);
    trackMesh.position.y = 0.25;
    dioramaGroup.add(trackMesh);

    // Optional: Secondary Inner Gyroscopic Indicator
    const gyroGeo = new THREE.TorusGeometry(1.2, 0.03, 16, 64);
    const gyroMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const gyroMesh = new THREE.Mesh(gyroGeo, gyroMat);
    gyroMesh.rotation.set(-Math.PI / 4, 0, Math.PI / 3);
    gyroMesh.position.y = 0.25;
    dioramaGroup.add(gyroMesh);

    // 3. 3D Rain Particles for Section 4 (Open-Meteo Weather Surge)
    const rainCount = 450;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 14;
      rainPositions[i + 1] = (Math.random() - 0.5) * 10;
      rainPositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.07,
      transparent: true,
      opacity: 0, // Hidden until Section 4
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    scene.add(rainParticles);

    // 4. Studio Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf59e0b, 4.5); // Starts Golden-Amber for Rickshaw
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x14b8a6, 3);
    fillLight.position.set(-4, -2, 3);
    scene.add(fillLight);

    // 5. GSAP Context & ScrollTrigger Choreography
    const ctx = gsap.context(() => {
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
        dioramaGroup.position,
        {
          x: isMobile ? 0 : -2.2,
          y: -0.1,
          z: 0.4,
          ease: 'power1.inOut',
        },
        0
      )
        .to(
          dioramaGroup.rotation,
          {
            y: Math.PI * 1.25,
            z: 0.1,
            ease: 'none',
          },
          0
        )
        .to(ringMat.color, { r: 0.08, g: 0.72, b: 0.65 }, 0) // Shift to Teal
        .to(gyroMat.color, { r: 0.08, g: 0.72, b: 0.65 }, 0)
        .to(keyLight.color, { r: 0.08, g: 0.72, b: 0.65 }, 0);

      // Stage 2 -> Stage 3 (25% - 50% -> 50% - 75%): BRTA Bus to Dhaka Metro Rail (Elevated)
      tl.to(
        dioramaGroup.position,
        {
          x: isMobile ? 0 : 2.1,
          y: 0.45,
          z: 0.8,
          ease: 'power1.inOut',
        },
        1
      )
        .to(
          dioramaGroup.rotation,
          {
            x: 0.35,
            y: Math.PI * 2.5,
            z: -0.15,
            ease: 'none',
          },
          1
        )
        .to(camera.position, { y: 1.5, ease: 'power1.inOut' }, 1)
        .to(ringMat.color, { r: 0.06, g: 0.73, b: 0.5 }, 1) // Shift to Emerald-Cyan
        .to(gyroMat.color, { r: 0.06, g: 0.73, b: 0.5 }, 1)
        .to(keyLight.color, { r: 0.06, g: 0.73, b: 0.5 }, 1);

      // Stage 3 -> Stage 4 (50% - 75% -> 75% - 100%): Metro Rail to Dynamic Weather Surge
      tl.to(
        dioramaGroup.position,
        {
          x: 0,
          y: 0,
          z: 1.6,
          ease: 'power2.out',
        },
        2
      )
        .to(
          dioramaGroup.rotation,
          {
            x: 0.1,
            y: Math.PI * 3.75,
            z: 0,
            ease: 'none',
          },
          2
        )
        .to(rainMat, { opacity: 0.85 }, 2) // Activate 3D rain particles
        .to(ringMat.color, { r: 0.23, g: 0.51, b: 0.96 }, 2) // Shift to Stormy Blue
        .to(gyroMat.color, { r: 0.23, g: 0.51, b: 0.96 }, 2)
        .to(keyLight.color, { r: 0.23, g: 0.51, b: 0.96 }, 2)
        .to(
          canvas,
          {
            opacity: 0.1, // Subtle canvas fade to transition into the map planner below
            ease: 'power2.in',
          },
          2.5
        );
    }, container);

    // 6. Continuous Render Loop with Idle Rotation & Dynamic Rain
    let animationFrameId;
    const animate = () => {
      coreMesh.rotation.y += 0.004;
      trackMesh.rotation.z -= 0.006;
      gyroMesh.rotation.x += 0.005;

      // Animate falling rain when opacity is triggered
      if (rainMat.opacity > 0.01) {
        const positions = rainGeo.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 0.08;
          if (positions[i] < -5) positions[i] = 5;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 7. Responsive Viewport Resize Handler
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      dioramaGroup.scale.setScalar(mobile ? 0.78 : 1.0);
      if (mobile) {
        dioramaGroup.position.x = 0;
      }
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);

    // 8. Strict Memory Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());

      // Dispose Geometries
      baseGeo.dispose();
      ringGeo.dispose();
      coreGeo.dispose();
      trackGeo.dispose();
      gyroGeo.dispose();
      rainGeo.dispose();

      // Dispose Materials
      baseMat.dispose();
      ringMat.dispose();
      coreMat.dispose();
      trackMat.dispose();
      gyroMat.dispose();
      rainMat.dispose();

      // Dispose Renderer
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative bg-slate-950 text-white">
      {/* Sticky 3D Canvas Background — Scoped pointer-events-none ensures Leaflet map stays 100% interactive */}
      <div className="sticky top-0 h-screen w-full overflow-hidden pointer-events-none z-0">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Scrollable Foreground Storytelling Cards (400vh total scroll distance) */}
      <div className="relative z-10 -mt-[100vh] pointer-events-none">
        {/* Section 1: Rickshaw Fare Estimation (0% - 25% Scroll) */}
        <section className="h-screen flex items-center px-6 md:px-16 lg:px-24">
          <div className="max-w-md bg-slate-900/60 backdrop-blur-xl border border-amber-500/30 p-8 rounded-2xl shadow-2xl pointer-events-auto">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-amber-500/20 text-amber-300 rounded-full mb-4">
              Bhara dekhi • Hyper-Local
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Rickshaw Fare Estimation
            </h1>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base">
              Stop overpaying on neighborhood hops. Calculate accurate street-level rickshaw fares across Dhaka before you step outside.
            </p>
          </div>
        </section>

        {/* Section 2: Bus Routes (25% - 50% Scroll) */}
        <section className="h-screen flex items-center justify-end px-6 md:px-16 lg:px-24">
          <div className="max-w-md bg-slate-900/60 backdrop-blur-xl border border-teal-500/30 p-8 rounded-2xl shadow-2xl pointer-events-auto">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-teal-500/20 text-teal-300 rounded-full mb-4">
              Official BRTA Calibration
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Smart Bus Route Discovery
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base">
              Compare city-wide bus routes with distance-verified fares calibrated directly to BRTA per-kilometer rates.
            </p>
          </div>
        </section>

        {/* Section 3: Dhaka Metro Rail (50% - 75% Scroll) */}
        <section className="h-screen flex items-center px-6 md:px-16 lg:px-24">
          <div className="max-w-md bg-slate-900/60 backdrop-blur-xl border border-emerald-500/30 p-8 rounded-2xl shadow-2xl pointer-events-auto">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 rounded-full mb-4">
              MRT Line-6 Rapid Transit
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Metro Rail Route & Fares
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base">
              Bypass Dhaka gridlock. Check station-to-station MRT fares and combine metro hops with last-mile rickshaw connections.
            </p>
          </div>
        </section>

        {/* Section 4: Dynamic Weather Surge & Planner CTA (75% - 100% Scroll) */}
        <section className="h-screen flex items-center justify-center px-6 text-center">
          <div className="max-w-lg bg-slate-900/75 backdrop-blur-xl border border-blue-500/40 p-8 md:p-10 rounded-3xl shadow-2xl pointer-events-auto">
            <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-blue-500/20 text-blue-300 rounded-full mb-4">
              Live Open-Meteo Integration
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Real-Time Weather Surge Pricing
            </h2>
            <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-8">
              Rain in Dhaka changes everything. Bhara dekhi checks live weather data to factor rain surge adjustments into your fare estimates automatically.
            </p>
            <a
              href="#planner"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 active:translate-y-0"
            >
              Launch Route & Fare Planner ↓
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

