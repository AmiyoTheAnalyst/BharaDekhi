'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * ScrollTransitHero — 3D Scroll-Triggered Storytelling Hero for Bhara dekhi
 * 
 * 5-Stage Storytelling Architecture:
 * 1. Stage 1 (0% - 20%): Comparison of Bike, CNG & Car Fare (Orbital 3-node showcase)
 * 2. Stage 2 (20% - 40%): Rickshaw Fare Estimation (Dhaka cycle rickshaw spotlight)
 * 3. Stage 3 (40% - 60%): Smart Bus Route Discovery (BRTA calibrated city bus)
 * 4. Stage 4 (60% - 80%): Dhaka Metro Rail (MRT Line-6 elevated viaduct & train)
 * 5. Stage 5 (80% - 100%): Weather Surge Pricing & Map Handoff (Monsoon rain particles & CTA)
 */
export default function ScrollTransitHero({ plannerId = 'planner', onLaunchPlanner }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register GSAP ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId = null;
    let clock = new THREE.Clock();

    // -------------------------------------------------------------
    // 1. Scene, Camera & Renderer Initialization
    // -------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Slate-950
    scene.fog = new THREE.FogExp2(0x020617, 0.018);

    const getWidth = () => canvas.clientWidth || window.innerWidth || 1200;
    const getHeight = () => canvas.clientHeight || window.innerHeight || 800;

    const camera = new THREE.PerspectiveCamera(
      window.innerWidth < 768 ? 54 : 38,
      getWidth() / getHeight(),
      0.1,
      1000
    );
    camera.position.set(0, 12, 32);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(getWidth(), getHeight(), false);
    renderer.setPixelRatio(window.innerWidth < 768 ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.35));
    if (typeof THREE.ACESFilmicToneMapping !== 'undefined') {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    }

    // -------------------------------------------------------------
    // 2. Studio Lighting Setup (Dynamically Scrubbed Across Stages)
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x8b5cf6, 0x020617, 0.9);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(30, 45, 30);
    scene.add(dirLight);

    const studioSpot = new THREE.SpotLight(0x06b6d4, 4.5, 90, Math.PI / 4, 0.45, 1.2);
    studioSpot.position.set(0, 32, 12);
    studioSpot.target.position.set(0, 0, 0);
    scene.add(studioSpot);
    scene.add(studioSpot.target);

    // -------------------------------------------------------------
    // 3. Procedural 3D Transit Geometry & Scene Graph
    // -------------------------------------------------------------
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Stage 1: 3-Node Orbital Comparison Hub (Bike, CNG, Car Pods)
    const orbitalHubGroup = new THREE.Group();
    masterGroup.add(orbitalHubGroup);

    // Glowing Central Transit Hub Core
    const hubCoreGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.35, 32);
    const hubCoreMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.3,
      metalness: 0.8
    });
    const hubCore = new THREE.Mesh(hubCoreGeo, hubCoreMat);
    orbitalHubGroup.add(hubCore);

    // Pulsing Neon Rings around hub
    const ringGeo = new THREE.RingGeometry(3.2, 3.45, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, side: THREE.DoubleSide });
    const hubRing = new THREE.Mesh(ringGeo, ringMat);
    hubRing.rotation.x = -Math.PI / 2;
    hubRing.position.y = 0.05;
    orbitalHubGroup.add(hubRing);

    // Vehicle Materials Cache
    const carMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.2, metalness: 0.5 });
    const cngMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.35, metalness: 0.2 });
    const bikeMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const rickshawHoodMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const busMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.3 });
    const metroMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.25, metalness: 0.7 });

    function createWheel(r, w) {
      const g = new THREE.CylinderGeometry(r, r, w, 16);
      const m = new THREE.Mesh(g, wheelMat);
      m.rotation.z = Math.PI / 2;
      return m;
    }

    // Node 1: Car Pod
    const carPod = new THREE.Group();
    const carBody = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.65, 1.7), carMat);
    carBody.position.y = 0.45;
    carPod.add(carBody);
    const carCabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.4), glassMat);
    carCabin.position.set(-0.2, 0.95, 0);
    carPod.add(carCabin);
    carPod.position.set(0, 0, 4.2);
    orbitalHubGroup.add(carPod);

    // Node 2: CNG Pod
    const cngPod = new THREE.Group();
    const cngBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.3), cngMat);
    cngBody.position.y = 0.5;
    cngPod.add(cngBody);
    const cngRoof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.25), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    cngRoof.position.set(-0.2, 1.15, 0);
    cngPod.add(cngRoof);
    cngPod.position.set(-3.6, 0, -2.1);
    orbitalHubGroup.add(cngPod);

    // Node 3: Bike Pod
    const bikePod = new THREE.Group();
    const bikeBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.45), bikeMat);
    bikeBody.position.y = 0.65;
    bikePod.add(bikeBody);
    const wFront = createWheel(0.35, 0.12);
    wFront.position.set(0.7, 0.35, 0);
    bikePod.add(wFront);
    const wBack = createWheel(0.35, 0.12);
    wBack.position.set(-0.7, 0.35, 0);
    bikePod.add(wBack);
    bikePod.position.set(3.6, 0, -2.1);
    orbitalHubGroup.add(bikePod);

    // Stage 2: Rickshaw Mesh
    const rickshawGroup = new THREE.Group();
    const rSeat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.65, 1.3), rickshawHoodMat);
    rSeat.position.set(-0.4, 1.1, 0);
    rickshawGroup.add(rSeat);
    const rHood = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.35, 16, 1, false, 0, Math.PI), rickshawHoodMat);
    rHood.rotation.z = -Math.PI / 2;
    rHood.position.set(-0.4, 1.6, 0);
    rickshawGroup.add(rHood);
    rickshawGroup.position.set(0, -20, 0); // Staged off-screen until scroll
    masterGroup.add(rickshawGroup);

    // Stage 3: BRTA City Bus
    const busGroup = new THREE.Group();
    const busBody = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.8, 2.0), busMat);
    busBody.position.y = 1.3;
    busGroup.add(busBody);
    const busWindows = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.6, 2.05), glassMat);
    busWindows.position.y = 1.55;
    busGroup.add(busWindows);
    busGroup.position.set(0, -20, 0);
    masterGroup.add(busGroup);

    // Stage 4: Metro Rail Elevated Viaduct & Train
    const metroGroup = new THREE.Group();
    const viaductPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 8, 16), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    viaductPillar.position.set(0, 0, 0);
    metroGroup.add(viaductPillar);
    const viaductTrack = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 2.8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    viaductTrack.position.set(0, 4.2, 0);
    metroGroup.add(viaductTrack);
    const trainCoach = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.5, 2.2), metroMat);
    trainCoach.position.set(0, 5.25, 0);
    metroGroup.add(trainCoach);
    metroGroup.position.set(0, -20, 0);
    masterGroup.add(metroGroup);

    // Stage 5: Falling Rain Particles
    const rainCount = 900;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3 + 0] = (Math.random() - 0.5) * 50;
      rainPos[i * 3 + 1] = Math.random() * 35;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.18,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    masterGroup.add(rainParticles);

    // -------------------------------------------------------------
    // Live Bidirectional Dhaka Traffic Road (Both sides of road)
    // -------------------------------------------------------------
    const trafficGroup = new THREE.Group();
    scene.add(trafficGroup);

    // 4-Lane Asphalt Road
    const roadMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 140),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 })
    );
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, -0.05, 0);
    trafficGroup.add(roadMesh);

    // Center divider double yellow line
    [-0.15, 0.15].forEach(x => {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 140),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, -0.04, 0);
      trafficGroup.add(line);
    });

    // Dashed lane lines at x: -3.8 and +3.8
    for (let z = 65; z > -75; z -= 7) {
      [-3.8, 3.8].forEach(x => {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.12, 3.2),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(x, -0.04, z);
        trafficGroup.add(dash);
      });
    }

    // Live Traffic Fleet: 16 vehicles running in both directions on both sides
    const trafficVehicles = [];
    const laneX = [-5.6, -1.9, 1.9, 5.6];
    const laneDir = [1, 1, -1, -1]; // West lanes move +Z (towards camera), East lanes move -Z (away from camera)
    const liveTrafficSpecs = [
      // West Side (Southbound, towards camera, direction: 1)
      { lane: 0, type: 'cng', color: 0x16a34a, speed: 6.2, z: 45 },
      { lane: 1, type: 'bike', color: 0xef4444, speed: 8.0, z: 32 },
      { lane: 0, type: 'car', color: 0x3b82f6, speed: 6.8, z: 18 },
      { lane: 1, type: 'car', color: 0x10b981, speed: 7.0, z: 2 },
      { lane: 0, type: 'rickshaw', color: 0xf59e0b, speed: 4.8, z: -14 },
      { lane: 1, type: 'bike', color: 0x38bdf8, speed: 8.2, z: -28 },
      { lane: 0, type: 'bus', color: 0xd95146, speed: 5.6, z: -44 },
      { lane: 1, type: 'car', color: 0xf8fafc, speed: 7.2, z: -58 },

      // East Side (Northbound, away from camera, direction: -1)
      { lane: 2, type: 'car', color: 0xe9a33b, speed: 7.1, z: 42 },
      { lane: 3, type: 'cng', color: 0x16a34a, speed: 6.0, z: 26 },
      { lane: 2, type: 'bike', color: 0xef4444, speed: 8.3, z: 12 },
      { lane: 3, type: 'bus', color: 0x059669, speed: 5.4, z: -4 },
      { lane: 2, type: 'car', color: 0x8b5cf6, speed: 6.9, z: -18 },
      { lane: 3, type: 'rickshaw', color: 0xec4899, speed: 4.6, z: -34 },
      { lane: 2, type: 'bike', color: 0x06b6d4, speed: 8.1, z: -48 },
      { lane: 3, type: 'cng', color: 0x16a34a, speed: 6.1, z: -64 }
    ];

    liveTrafficSpecs.forEach(spec => {
      const vGroup = new THREE.Group();
      let vMesh;
      if (spec.type === 'bike') {
        vMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1.8), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.3 }));
        vMesh.position.y = 0.35;
      } else if (spec.type === 'cng') {
        vMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 2.4), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.4 }));
        vMesh.position.y = 0.6;
      } else if (spec.type === 'rickshaw') {
        vMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2.2), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.5 }));
        vMesh.position.y = 0.55;
      } else if (spec.type === 'bus') {
        vMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 7.5), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.3 }));
        vMesh.position.y = 1.0;
      } else {
        vMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.0), new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.25, metalness: 0.4 }));
        vMesh.position.y = 0.5;
      }
      vGroup.add(vMesh);

      // Headlight (white)
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.1), hlMat);
      hl.position.set(0, 0.4, laneDir[spec.lane] > 0 ? 1.5 : -1.5);
      vGroup.add(hl);

      // Taillight (ruby red)
      const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.1), tlMat);
      tl.position.set(0, 0.4, laneDir[spec.lane] > 0 ? -1.5 : 1.5);
      vGroup.add(tl);

      vGroup.position.set(laneX[spec.lane], 0, spec.z);
      trafficGroup.add(vGroup);

      trafficVehicles.push({
        group: vGroup,
        direction: laneDir[spec.lane],
        speed: spec.speed,
        z: spec.z
      });
    });

    // -------------------------------------------------------------
    // 4. GSAP ScrollTrigger Choreography (500vh Scrubbed Timeline)
    // -------------------------------------------------------------
    const isMobile = window.innerWidth < 768;

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        onUpdate: (self) => {
          const p = self.progress;
          // Fade canvas out at the very end (85% - 100%) for a seamless handoff to #planner
          if (canvas) {
            if (p > 0.85) {
              const fade = (p - 0.85) / 0.15;
              canvas.style.opacity = Math.max(0.1, 1.0 - fade * 0.9).toString();
            } else {
              canvas.style.opacity = '1.0';
            }
          }
        }
      }
    });

    // Master Group Coordinates Across 5 Stages
    // Stage 1 (0.00 - 0.20): Comparison of Bike, CNG, Car (Right, x: 2.2 or 0 on mobile)
    masterGroup.position.set(isMobile ? 0 : 2.2, 0, 0);
    masterGroup.rotation.set(0.1, 0.4, 0);

    // Stage 2: Rickshaw (Left, x: -2.2)
    timeline.to(masterGroup.position, {
      x: isMobile ? 0 : -2.2,
      y: 0,
      z: 0,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.20);
    timeline.to(masterGroup.rotation, {
      y: Math.PI * 0.85,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.20);
    timeline.to(studioSpot.color, {
      r: 0.96, g: 0.62, b: 0.07, // Warm golden-amber 0xf59e0b
      duration: 0.6
    }, 0.20);
    timeline.to(orbitalHubGroup.position, { y: -15, duration: 0.5 }, 0.20);
    timeline.to(rickshawGroup.position, { y: 0, duration: 0.5 }, 0.20);

    // Stage 3: BRTA Bus (Right, x: 2.2)
    timeline.to(masterGroup.position, {
      x: isMobile ? 0 : 2.2,
      y: 0,
      z: 0,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.40);
    timeline.to(masterGroup.rotation, {
      y: Math.PI * 2.0,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.40);
    timeline.to(studioSpot.color, {
      r: 0.08, g: 0.72, b: 0.65, // Vibrant teal 0x14b8a6
      duration: 0.6
    }, 0.40);
    timeline.to(rickshawGroup.position, { y: -15, duration: 0.5 }, 0.40);
    timeline.to(busGroup.position, { y: 0, duration: 0.5 }, 0.40);

    // Stage 4: Metro Rail Elevated (Left & Elevated, x: -2.1, y: 0.45, z: 0.8)
    timeline.to(masterGroup.position, {
      x: isMobile ? 0 : -2.1,
      y: 0.45,
      z: 0.8,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.60);
    timeline.to(masterGroup.rotation, {
      y: Math.PI * 2.65,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.60);
    timeline.to(studioSpot.color, {
      r: 0.06, g: 0.73, b: 0.51, // Sleek emerald-cyan 0x10b981
      duration: 0.6
    }, 0.60);
    timeline.to(busGroup.position, { y: -15, duration: 0.5 }, 0.60);
    timeline.to(metroGroup.position, { y: 0, duration: 0.5 }, 0.60);

    // Stage 5: Weather Surge & Map Handoff (Center Zoom, x: 0, z: 1.6)
    timeline.to(masterGroup.position, {
      x: 0,
      y: -0.2,
      z: 1.6,
      duration: 1,
      ease: 'power1.inOut'
    }, 0.80);
    timeline.to(studioSpot.color, {
      r: 0.23, g: 0.51, b: 0.96, // Stormy electric blue 0x3b82f6
      duration: 0.6
    }, 0.80);
    timeline.to(rainMat, {
      opacity: 0.75,
      duration: 0.5
    }, 0.80);

    // Card Fade/Slide In Animations
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      gsap.fromTo(card,
        { opacity: index === 0 ? 1 : 0, y: index === 0 ? 0 : 40, scale: index === 0 ? 1 : 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card.parentElement,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play reverse play reverse'
          }
        }
      );
    });

    // -------------------------------------------------------------
    // 5. Responsive Resize & 120 FPS Render Loop
    // -------------------------------------------------------------
    const onResize = () => {
      if (!canvas || !renderer || !camera) return;
      const w = getWidth();
      const h = getHeight();
      camera.aspect = w / h;
      camera.fov = w < 768 ? 54 : 38;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(w < 768 ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.35));
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);

      // Gentle orbital spin for Stage 1 hub
      if (orbitalHubGroup.position.y > -5) {
        orbitalHubGroup.rotation.y += delta * 0.45;
      }

      // Falling rain particle motion
      if (rainMat.opacity > 0.05) {
        const pos = rainGeo.attributes.position.array;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] -= delta * 36;
          if (pos[i] < -2) pos[i] = 30;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }

      // Animate live traffic vehicles running on both sides of the road
      trafficVehicles.forEach(tv => {
        tv.z += tv.direction * tv.speed * delta;
        if (tv.direction > 0 && tv.z > 65) tv.z = -75;
        if (tv.direction < 0 && tv.z < -75) tv.z = 65;
        tv.group.position.z = tv.z;
      });

      renderer.render(scene, camera);
    };
    animate();

    // -------------------------------------------------------------
    // 6. Complete Memory & Resource Cleanup
    // -------------------------------------------------------------
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      ScrollTrigger.getAll().forEach(t => t.kill());

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  const handleLaunchPlanner = () => {
    if (typeof onLaunchPlanner === 'function') {
      onLaunchPlanner();
      return;
    }
    const el = document.getElementById(plannerId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#/plan-trip';
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[500vh] bg-slate-950 select-none overflow-x-hidden"
      aria-label="Bhara dekhi 3D Transit Storytelling Hero"
    >
      {/* Sticky 100vh Three.js Viewport (pointer-events-none preserves full Leaflet map interactivity) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden pointer-events-none z-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* 5-Stage Storytelling Foreground Cards Container */}
      <div className="relative z-10 -mt-[100vh] pointer-events-none flex flex-col">

        {/* Stage 1 (0% - 20%): Comparison of Bike, CNG & Car Fare (Left Card) */}
        <section className="h-screen w-full flex items-center justify-start p-6 md:p-16">
          <div
            ref={el => cardRefs.current[0] = el}
            className="pointer-events-auto max-w-lg rounded-3xl bg-slate-950/85 border border-sky-500/40 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span>⚡ Bhara dekhi • Multi-Mode Comparison</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Comparison of Bike, CNG &amp; Car Fare
            </h3>
            <p className="text-sm md:text-base text-slate-300 font-medium mt-3 leading-relaxed">
              Compare instant side-by-side fare estimates for Ride-Share Bikes, CNG Auto-Rickshaws, and Cars across Dhaka traffic before you book. Choose the right ride for your budget, speed, or comfort.
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-md">
                🏍️ Bike (Fastest) · ৳12/km
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-md">
                🛺 CNG (Balanced) · ৳15/km
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-sky-500/50 text-sky-300 text-xs font-bold shadow-md">
                🚗 Car (Comfort) · ৳22/km
              </span>
            </div>
          </div>
        </section>

        {/* Stage 2 (20% - 40%): Rickshaw Fare Estimation (Right Card) */}
        <section className="h-screen w-full flex items-center justify-end p-6 md:p-16">
          <div
            ref={el => cardRefs.current[1] = el}
            className="pointer-events-auto max-w-lg rounded-3xl bg-slate-950/85 border border-amber-500/40 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span>🛺 Bhara dekhi • Hyper-Local Transit</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Rickshaw Fare Estimation
            </h3>
            <p className="text-sm md:text-base text-slate-300 font-medium mt-3 leading-relaxed">
              Instant, street-calibrated fare estimates for Dhaka's iconic cycle rickshaws. Perfect for short neighbourhood hops, alleyway shortcuts, and local market trips with fair bargaining benchmarks.
            </p>
            <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-amber-200">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">Base: ৳25</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">Short Hop: ~৳30-50</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">Fair Negotiation</span>
            </div>
          </div>
        </section>

        {/* Stage 3 (40% - 60%): Smart Bus Route Discovery (Left Card) */}
        <section className="h-screen w-full flex items-center justify-start p-6 md:p-16">
          <div
            ref={el => cardRefs.current[2] = el}
            className="pointer-events-auto max-w-lg rounded-3xl bg-slate-950/85 border border-teal-500/40 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span>🚌 Bhara dekhi • Public Transit</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Smart Bus Route Discovery (BRTA Calibrated)
            </h3>
            <p className="text-sm md:text-base text-slate-300 font-medium mt-3 leading-relaxed">
              BRTA-calibrated per-kilometer government fare rates across Dhaka's major bus corridors. Discover direct routes, interchange hubs, and predictable fares across Mirpur, Farmgate, and Motijheel.
            </p>
            <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-teal-200">
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30">BRTA Rate: ৳2.45/km</span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30">Min Fare: ৳10</span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30">Multi-Stop Hubs</span>
            </div>
          </div>
        </section>

        {/* Stage 4 (60% - 80%): Dhaka Metro Rail (MRT Line-6) (Right Card) */}
        <section className="h-screen w-full flex items-center justify-end p-6 md:p-16">
          <div
            ref={el => cardRefs.current[3] = el}
            className="pointer-events-auto max-w-lg rounded-3xl bg-slate-950/85 border border-emerald-500/40 p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span>🚆 Bhara dekhi • Rapid Transit</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Dhaka Metro Rail (MRT Line-6)
            </h3>
            <p className="text-sm md:text-base text-slate-300 font-medium mt-3 leading-relaxed">
              Bypass ground traffic with high-speed elevated transit. Accurate station-to-station fares from Uttara North to Motijheel, complete with Single Journey tickets and Rapid Pass 10% discounts.
            </p>
            <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-emerald-200">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30">Base: ৳20</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30">Rapid Pass -10%</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30">Zero Traffic</span>
            </div>
          </div>
        </section>

        {/* Stage 5 (80% - 100%): Weather Surge Pricing & Planner CTA (Center Card) */}
        <section className="h-screen w-full flex items-center justify-center p-6 md:p-16 text-center">
          <div
            ref={el => cardRefs.current[4] = el}
            className="pointer-events-auto max-w-xl mx-auto rounded-3xl bg-slate-950/90 border border-indigo-500/50 p-6 md:p-10 backdrop-blur-2xl shadow-2xl transition-all duration-300"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3">
              <span>🌧️ Bhara dekhi • Weather Intelligence</span>
            </div>
            <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
              Real-Time Weather Surge Pricing
            </h3>
            <p className="text-sm md:text-base text-slate-300 font-medium mt-3 leading-relaxed max-w-md mx-auto">
              Monsoon downpours and waterlogging in Dhaka can spike rickshaw and CNG rates by up to 1.4×. Stay ahead with live weather surge detection and smart transit alternatives.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleLaunchPlanner}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base shadow-2xl shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span>Launch Route &amp; Fare Planner &rarr;</span>
              </button>
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}

