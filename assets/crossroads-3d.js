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

  // Hasan Transit Bus Live Mirror Subsystem
  const hasanBusList = [];
  let mirrorLeftRT = null;
  let mirrorRightRT = null;
  let mirrorCam = null;
  let staticMirrorMat = null;
  let liveLeftMirrorMat = null;
  let liveRightMirrorMat = null;
  let staticMirrorTex = null;
  const _mPos = new THREE.Vector3();
  const _mLook = new THREE.Vector3();
  const _tmpV1 = new THREE.Vector3();
  const _tmpV2 = new THREE.Vector3();
  const _tmpV3 = new THREE.Vector3();
  const _tmpQ1 = new THREE.Quaternion();
  const _tmpQ2 = new THREE.Quaternion();
  const _tmpE1 = new THREE.Euler();
  const _tmpM1 = new THREE.Matrix4();
  const _tmpBox1 = new THREE.Box3();

  // Zero-allocation cached camera pose & orbit math
  const _cachedOrbitPose = {
    position: { x: 0, y: 0, z: 0 },
    look: { x: 0, y: 0, z: 0 }
  };
  const _forwardVec = { x: 0, z: 0 };
  const _rightVec = { x: 0, z: 0 };

  // Reusable scratch objects for gossiping crowd & bench-sitter bone rotations
  const _gossipEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _gossipDelta = new THREE.Quaternion();

  // Reusable scratch objects for rickshaw puller pedaling bones
  const _pedalAxisZ = new THREE.Vector3(0, 0, 1);
  const _pedalQZ = new THREE.Quaternion();

  // Zero-allocation math scratch objects for instancing, wheels & rickshaw pedaling
  const _wheelPos = new THREE.Vector3();
  const _wheelQuat = new THREE.Quaternion();
  const _wheelScale = new THREE.Vector3(1, 1, 1);
  const _wheelMat4 = new THREE.Matrix4();
  const _instPos = new THREE.Vector3();
  const _instQuat = new THREE.Quaternion();
  const _instEuler = new THREE.Euler(0, 0, 0, 'XYZ');
  const _instScale = new THREE.Vector3(1, 1, 1);
  const _instMat4 = new THREE.Matrix4();

  const _legPivot = new THREE.Vector3(1.35, 3.3, 0);
  const _legUp = new THREE.Vector3(0, 1, 0);
  const _legH = new THREE.Vector3();
  const _legP = new THREE.Vector3();
  const _legDiff = new THREE.Vector3();
  const _legDir = new THREE.Vector3();
  const _legNorm = new THREE.Vector3();
  const _legK = new THREE.Vector3();
  const _legThighDir = new THREE.Vector3();
  const _legShinDir = new THREE.Vector3();

  // Overhaul Performance State & Transition Tracking
  let is3DViewActive = true;
  let isCameraTransitioning = false;
  let cameraTransitionUntil = 0;
  let lastInitMs = 0;
  const scenePropBuildQueue = [];
  let propPrecompileDone = false;
  let deferredModeFlusher = null;

  function markCameraTransition(durationSec) {
    const nowMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const durMs = Math.max(150, ((durationSec || 1.2) * 1000) + 120);
    isCameraTransitioning = true;
    cameraTransitionUntil = Math.max(cameraTransitionUntil, nowMs + durMs);
  }

  // Reusable scratch arrays for live mirror render pass to avoid GC churn
  const _allMirrorsToHide = [];
  const _crowdToRestore = [];

  let mirrorFrameCounter = 0;
  let lastActiveMirrorBus = null;
  let activeBusLeftMirrorMesh = null;
  let activeBusRightMirrorMesh = null;

  // Shared Scene Instancing & Batching Registries (Targets < 120 Total Draw Calls)
  const wheelInstancePools = {};
  const instancedHitLookup = new Map();
  let busInstFleet = null;
  let busTemplateWheelPoses = null;
  let busTemplateWheelObj = null;
  let cngInstFleet = null;
  let cngTemplateWheelPoses = null;
  let cngTemplateWheelObj = null;
  let rickshawInstFleet = null;
  let rickTemplateWheelPoses = null;
  let rickTemplateWheelObj = null;
  let rickCrankTemplateMesh = null;
  let rickThighTemplateMesh = null;
  let rickCalfTemplateMesh = null;
  let rickSandTemplateMesh = null;
  let bikeInstFleets = {};
  let signalBulbsInst = null;
  const signalLampMatrices = [];
  let pedShadowInst = null;
  const pedShadowEntries = [];
  let cityFacadeMat = null;
  let streetLightPolesInst = null;
  let streetLightHeadsInst = null;
  let treeTrunksInst = null;
  let treeCanopiesInst = null;

  function initLiveBusMirrors() {
    if (mirrorLeftRT) return;
    mirrorLeftRT = new THREE.WebGLRenderTarget(128, 128, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false
    });
    mirrorLeftRT.texture.generateMipmaps = false;
    mirrorLeftRT.texture.minFilter = THREE.LinearFilter;
    mirrorLeftRT.texture.magFilter = THREE.LinearFilter;

    mirrorRightRT = new THREE.WebGLRenderTarget(128, 128, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: true,
      stencilBuffer: false
    });
    mirrorRightRT.texture.generateMipmaps = false;
    mirrorRightRT.texture.minFilter = THREE.LinearFilter;
    mirrorRightRT.texture.magFilter = THREE.LinearFilter;

    // Flip horizontally so reflections behave like a true physical mirror:
    mirrorLeftRT.texture.wrapS = THREE.RepeatWrapping;
    mirrorLeftRT.texture.repeat.x = -1;
    mirrorLeftRT.texture.offset.x = 1;
    mirrorRightRT.texture.wrapS = THREE.RepeatWrapping;
    mirrorRightRT.texture.repeat.x = -1;
    mirrorRightRT.texture.offset.x = 1;

    mirrorCam = new THREE.PerspectiveCamera(68, 0.55, 0.45, 95);

    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = 64;
      cv.height = 128;
      const ctx = cv.getContext('2d');

      // 1. Daytime Sky Reflection (Top half of mirror)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 70);
      skyGrad.addColorStop(0, '#38bdf8');
      skyGrad.addColorStop(0.55, '#93c5fd');
      skyGrad.addColorStop(1.0, '#e0f2fe');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, 64, 70);

      // Distant city horizon silhouette
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 57, 64, 13);
      ctx.fillStyle = '#475569';
      ctx.fillRect(10, 50, 12, 20);
      ctx.fillRect(26, 46, 14, 24);
      ctx.fillRect(44, 52, 13, 18);

      // 2. Asphalt Roadway Reflection (Bottom half of mirror)
      const roadGrad = ctx.createLinearGradient(0, 70, 0, 128);
      roadGrad.addColorStop(0, '#334155');
      roadGrad.addColorStop(1.0, '#1e293b');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 70, 64, 58);

      // Yellow lane divider line
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(28, 70);
      ctx.lineTo(21, 128);
      ctx.stroke();

      // White outer lane marker
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(48, 70);
      ctx.lineTo(57, 128);
      ctx.stroke();

      // Red bus body reflection along inner edge
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 12, 128);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(10, 0, 2, 128);

      // Trailing vehicle silhouette
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(28, 84, 15, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(29, 90, 3, 2);
      ctx.fillRect(39, 90, 3, 2);

      // Subtle diagonal reflective sheen
      const glare = ctx.createLinearGradient(0, 0, 64, 128);
      glare.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
      glare.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
      glare.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
      glare.addColorStop(0.7, 'rgba(255, 255, 255, 0.10)');
      glare.addColorStop(1.0, 'rgba(255, 255, 255, 0.25)');
      ctx.fillStyle = glare;
      ctx.fillRect(0, 0, 64, 128);

      staticMirrorTex = new THREE.CanvasTexture(cv);
      staticMirrorTex.needsUpdate = true;
    }

    staticMirrorMat = new THREE.MeshBasicMaterial({ map: staticMirrorTex, side: THREE.DoubleSide });
    liveLeftMirrorMat = new THREE.MeshBasicMaterial({ map: mirrorLeftRT.texture, side: THREE.DoubleSide });
    liveRightMirrorMat = new THREE.MeshBasicMaterial({ map: mirrorRightRT.texture, side: THREE.DoubleSide });
  }

  // ---------------------------------------------------------------------------
  // High-FPS Geometry Merging, Texture Downscaling, Material Simplification & Instancing Helpers
  // ---------------------------------------------------------------------------
  const _mergeV = new THREE.Vector3();
  const _mergeN = new THREE.Vector3();
  const _mergeNMat = new THREE.Matrix3();
  const _mergeColor = new THREE.Color();

  function toFastLambertMaterial(mat, opts) {
    if (!mat) return mat;
    const isSkinned = !!(opts && opts.skinning);
    const keepColorHex = (opts && opts.vertexColors) ? 0xffffff : (mat.color ? mat.color.getHex() : 0xffffff);
    if (mat.isMeshBasicMaterial) {
      if (isSkinned && !mat.skinning) {
        mat.skinning = true;
        mat.needsUpdate = true;
      }
      return mat;
    }
    if (mat.isMeshLambertMaterial) {
      if (isSkinned && !mat.skinning) {
        mat.skinning = true;
        mat.needsUpdate = true;
      }
      return mat;
    }
    const params = {
      color: keepColorHex,
      map: mat.map || null,
      emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
      emissiveIntensity: (typeof mat.emissiveIntensity === 'number') ? mat.emissiveIntensity : 0,
      emissiveMap: mat.emissiveMap || null,
      transparent: !!mat.transparent,
      opacity: (typeof mat.opacity === 'number') ? mat.opacity : 1.0,
      alphaTest: mat.alphaTest || 0,
      depthWrite: (mat.depthWrite !== undefined) ? mat.depthWrite : !mat.transparent,
      side: (mat.side !== undefined) ? mat.side : THREE.FrontSide,
      vertexColors: !!(opts && opts.vertexColors) || !!mat.vertexColors,
      skinning: isSkinned || !!mat.skinning,
      morphTargets: !!mat.morphTargets
    };
    const lambert = new THREE.MeshLambertMaterial(params);
    if (mat.name) lambert.name = mat.name;
    lambert.userData = Object.assign({}, mat.userData || {});
    return lambert;
  }

  function mergePiecesToBufferGeometry(pieces, includeUV) {
    if (!pieces || pieces.length === 0) return null;
    const prepared = [];
    let totalVerts = 0;

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!p || !p.geometry) continue;
      const geo = p.geometry;
      const posAttr = geo.attributes.position;
      if (!posAttr || posAttr.count === 0) continue;
      if (!geo.attributes.normal) {
        geo.computeVertexNormals();
      }
      const nrmAttr = geo.attributes.normal;
      const uvAttr = includeUV ? geo.attributes.uv : null;
      const vColorAttr = geo.attributes.color || null;
      const indexAttr = geo.index || null;
      const count = indexAttr ? indexAttr.count : posAttr.count;
      if (count === 0) continue;
      totalVerts += count;
      prepared.push({
        posAttr: posAttr,
        nrmAttr: nrmAttr,
        uvAttr: uvAttr,
        vColorAttr: vColorAttr,
        indexArr: indexAttr ? indexAttr.array : null,
        count: count,
        matrix: p.matrix,
        color: p.color || null,
        uvRect: p.uvRect || null,
        skinBoneIdx: (typeof p.skinBoneIdx === 'number') ? p.skinBoneIdx : -1
      });
    }

    if (totalVerts === 0) return null;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const uvs = includeUV ? new Float32Array(totalVerts * 2) : null;
    const hasSkin = prepared[0] && prepared[0].skinBoneIdx >= 0;
    const skinIndices = hasSkin ? new Uint16Array(totalVerts * 4) : null;
    const skinWeights = hasSkin ? new Float32Array(totalVerts * 4) : null;

    let vCursor = 0;
    for (let i = 0; i < prepared.length; i++) {
      const item = prepared[i];
      const mat4 = item.matrix;
      const me = mat4 ? mat4.elements : null;
      const detNegative = mat4 ? (mat4.determinant() < 0) : false;
      let ne = null;
      if (mat4) {
        _mergeNMat.getNormalMatrix(mat4);
        ne = _mergeNMat.elements;
      }

      if (item.color && item.color.isColor) {
        _mergeColor.copy(item.color);
      } else if (typeof item.color === 'number') {
        _mergeColor.setHex(item.color);
      } else {
        _mergeColor.setHex(0xffffff);
      }
      const cr = _mergeColor.r;
      const cg = _mergeColor.g;
      const cb = _mergeColor.b;

      const posAttr = item.posAttr;
      const nrmAttr = item.nrmAttr;
      const uvAttr = item.uvAttr;
      const vColorAttr = item.vColorAttr;
      const idxArr = item.indexArr;
      const uvRect = item.uvRect;
      const u0 = uvRect ? uvRect[0] : 0;
      const v0 = uvRect ? uvRect[1] : 0;
      const uw = uvRect ? uvRect[2] : 1;
      const vh = uvRect ? uvRect[3] : 1;
      const cCount = item.count;
      const bIdx = item.skinBoneIdx;

      const fastPos = posAttr && !posAttr.isInterleavedBufferAttribute && !posAttr.normalized;
      const fastNrm = nrmAttr && !nrmAttr.isInterleavedBufferAttribute && !nrmAttr.normalized;
      const fastUv = uvAttr && !uvAttr.isInterleavedBufferAttribute && !uvAttr.normalized;
      const fastCol = vColorAttr && !vColorAttr.isInterleavedBufferAttribute && !vColorAttr.normalized;

      const pArr = fastPos ? posAttr.array : null;
      const pStride = posAttr ? posAttr.itemSize : 3;
      const nArr = fastNrm ? nrmAttr.array : null;
      const nStride = nrmAttr ? nrmAttr.itemSize : 3;
      const uArr = fastUv ? uvAttr.array : null;
      const uStride = uvAttr ? uvAttr.itemSize : 2;
      const cArr = fastCol ? vColorAttr.array : null;
      const cStride = vColorAttr ? vColorAttr.itemSize : 3;

      for (let k = 0; k < cCount; k++) {
        // Reverse triangle winding when determinant is negative to preserve FrontSide normals
        const triOffset = k % 3;
        const rawK = detNegative
          ? (triOffset === 1 ? k + 1 : (triOffset === 2 ? k - 1 : k))
          : k;

        if (rawK >= cCount) continue;
        const srcIdx = idxArr ? idxArr[rawK] : rawK;

        let vx, vy, vz;
        if (pArr) {
          const si = srcIdx * pStride;
          vx = pArr[si]; vy = pArr[si + 1]; vz = pArr[si + 2];
        } else {
          vx = posAttr.getX(srcIdx); vy = posAttr.getY(srcIdx); vz = posAttr.getZ(srcIdx);
        }

        const p3 = vCursor * 3;
        if (me) {
          const wDen = me[3] * vx + me[7] * vy + me[11] * vz + me[15];
          const iw = (wDen !== 1 && wDen !== 0) ? (1 / wDen) : 1;
          positions[p3] = (me[0] * vx + me[4] * vy + me[8] * vz + me[12]) * iw;
          positions[p3 + 1] = (me[1] * vx + me[5] * vy + me[9] * vz + me[13]) * iw;
          positions[p3 + 2] = (me[2] * vx + me[6] * vy + me[10] * vz + me[14]) * iw;
        } else {
          positions[p3] = vx;
          positions[p3 + 1] = vy;
          positions[p3 + 2] = vz;
        }

        if (nrmAttr) {
          let nx, ny, nz;
          if (nArr) {
            const si = srcIdx * nStride;
            nx = nArr[si]; ny = nArr[si + 1]; nz = nArr[si + 2];
          } else {
            nx = nrmAttr.getX(srcIdx); ny = nrmAttr.getY(srcIdx); nz = nrmAttr.getZ(srcIdx);
          }
          let tx = nx, ty = ny, tz = nz;
          if (ne) {
            tx = ne[0] * nx + ne[3] * ny + ne[6] * nz;
            ty = ne[1] * nx + ne[4] * ny + ne[7] * nz;
            tz = ne[2] * nx + ne[5] * ny + ne[8] * nz;
          }
          const sqLen = tx * tx + ty * ty + tz * tz;
          if (sqLen > 1e-6) {
            const invLen = 1 / Math.sqrt(sqLen);
            normals[p3] = tx * invLen;
            normals[p3 + 1] = ty * invLen;
            normals[p3 + 2] = tz * invLen;
          } else {
            normals[p3] = 0;
            normals[p3 + 1] = 1;
            normals[p3 + 2] = 0;
          }
        } else {
          normals[p3] = 0;
          normals[p3 + 1] = 1;
          normals[p3 + 2] = 0;
        }

        const hasNonZeroVColor = vColorAttr && (cArr
          ? (cArr[srcIdx * cStride] > 0 || cArr[srcIdx * cStride + 1] > 0 || cArr[srcIdx * cStride + 2] > 0)
          : (vColorAttr.getX(srcIdx) > 0 || vColorAttr.getY(srcIdx) > 0 || vColorAttr.getZ(srcIdx) > 0));

        if (hasNonZeroVColor) {
          if (cArr) {
            const si = srcIdx * cStride;
            colors[p3] = cArr[si] * cr;
            colors[p3 + 1] = cArr[si + 1] * cg;
            colors[p3 + 2] = cArr[si + 2] * cb;
          } else {
            colors[p3] = vColorAttr.getX(srcIdx) * cr;
            colors[p3 + 1] = vColorAttr.getY(srcIdx) * cg;
            colors[p3 + 2] = vColorAttr.getZ(srcIdx) * cb;
          }
        } else {
          colors[p3] = cr;
          colors[p3 + 1] = cg;
          colors[p3 + 2] = cb;
        }

        if (uvs) {
          const p2 = vCursor * 2;
          let u = 0, v = 0;
          if (uArr) {
            const si = srcIdx * uStride;
            u = uArr[si]; v = uArr[si + 1];
          } else if (uvAttr) {
            u = uvAttr.getX(srcIdx); v = uvAttr.getY(srcIdx);
          }
          if (uvRect) {
            uvs[p2] = u0 + u * uw;
            uvs[p2 + 1] = v0 + v * vh;
          } else {
            uvs[p2] = u;
            uvs[p2 + 1] = v;
          }
        }

        if (hasSkin && skinIndices && skinWeights) {
          const p4 = vCursor * 4;
          skinIndices[p4] = bIdx;
          skinIndices[p4 + 1] = 0;
          skinIndices[p4 + 2] = 0;
          skinIndices[p4 + 3] = 0;
          skinWeights[p4] = 1;
          skinWeights[p4 + 1] = 0;
          skinWeights[p4 + 2] = 0;
          skinWeights[p4 + 3] = 0;
        }

        vCursor++;
      }
    }

    const outGeo = new THREE.BufferGeometry();
    outGeo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, vCursor * 3), 3));
    outGeo.setAttribute('normal', new THREE.BufferAttribute(normals.subarray(0, vCursor * 3), 3));
    outGeo.setAttribute('color', new THREE.BufferAttribute(colors.subarray(0, vCursor * 3), 3));
    if (uvs) outGeo.setAttribute('uv', new THREE.BufferAttribute(uvs.subarray(0, vCursor * 2), 2));
    if (hasSkin && skinIndices && skinWeights) {
      outGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices.subarray(0, vCursor * 4), 4));
      outGeo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights.subarray(0, vCursor * 4), 4));
    }
    outGeo.computeBoundingSphere();
    return outGeo;
  }

  function optimizeStaticSubtree(rootGroup, opts) {
    if (!rootGroup || !rootGroup.isObject3D) return rootGroup;
    opts = opts || {};
    const excludeSet = opts.excludeSet || null;
    rootGroup.updateMatrixWorld(true);
    const invRoot = new THREE.Matrix4().copy(rootGroup.matrixWorld).invert();

    const keptObjects = [];
    const litOpaquePieces = [];
    const litDoublePieces = [];
    const basicOpaquePieces = [];
    const transpBuckets = new Map();
    const texturedBuckets = new Map();
    const meshesToDetach = [];

    function walkCollect(node, inExcluded) {
      const isExcluded = inExcluded || (excludeSet && excludeSet.has(node)) || (node.userData && node.userData.noMerge);
      if (isExcluded) {
        if (node !== rootGroup) keptObjects.push(node);
        return;
      }
      if (node.isMesh && !node.isSkinnedMesh && !node.isInstancedMesh && node.geometry && node.material && node.visible !== false) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        const relMat = new THREE.Matrix4().multiplyMatrices(invRoot, node.matrixWorld);
        const geo = node.geometry;

        if (mats.length === 1) {
          const mat = mats[0];
          const isTransp = !!mat.transparent && (mat.opacity < 0.999);
          const isEmissiveGlow = !!(mat.emissive && typeof mat.emissive.getHex === 'function' && mat.emissive.getHex() > 0 && mat.emissiveIntensity >= 0.7 && !mat.map);
          const isBasic = !!mat.isMeshBasicMaterial || isEmissiveGlow;
          if (mat.map) {
            const key = `${mat.map.uuid}|${isBasic ? 'B' : 'L'}|${isTransp ? mat.opacity.toFixed(2) : 'O'}|${mat.side || 0}`;
            let b = texturedBuckets.get(key);
            if (!b) {
              b = {
                map: mat.map,
                isBasic: isBasic,
                transparent: !!mat.transparent,
                opacity: (typeof mat.opacity === 'number') ? mat.opacity : 1.0,
                depthWrite: (mat.depthWrite !== undefined) ? mat.depthWrite : !mat.transparent,
                blending: mat.blending || THREE.NormalBlending,
                side: mat.side !== undefined ? mat.side : THREE.FrontSide,
                pieces: []
              };
              texturedBuckets.set(key, b);
            }
            b.pieces.push({ geometry: geo, matrix: relMat, color: mat.color || 0xffffff });
          } else if (isTransp) {
            const opKey = `${Math.round((mat.opacity || 0.5) * 20)}|${mat.blending || THREE.NormalBlending}|${mat.side || 0}`;
            let b = transpBuckets.get(opKey);
            if (!b) {
              b = { opacity: mat.opacity || 0.5, blending: mat.blending || THREE.NormalBlending, side: mat.side || THREE.FrontSide, pieces: [] };
              transpBuckets.set(opKey, b);
            }
            b.pieces.push({ geometry: geo, matrix: relMat, color: mat.color || 0xffffff });
          } else if (isBasic) {
            const c = isEmissiveGlow ? mat.emissive : (mat.color || 0xffffff);
            basicOpaquePieces.push({ geometry: geo, matrix: relMat, color: c });
          } else if (mat.side === THREE.DoubleSide) {
            litDoublePieces.push({ geometry: geo, matrix: relMat, color: mat.color || 0xffffff });
          } else {
            litOpaquePieces.push({ geometry: geo, matrix: relMat, color: mat.color || 0xffffff });
          }
          meshesToDetach.push(node);
        } else {
          // Multi-material BoxGeometry/sub-groups: split by geometry.groups
          const baseNonIdx = geo.index ? geo.toNonIndexed() : geo;
          const posAttr = baseNonIdx.attributes.position;
          const nrmAttr = baseNonIdx.attributes.normal;
          const uvAttr = baseNonIdx.attributes.uv;
          const groups = (geo.groups && geo.groups.length) ? geo.groups : [{ start: 0, count: posAttr.count, materialIndex: 0 }];
          for (let gi = 0; gi < groups.length; gi++) {
            const grp = groups[gi];
            const mat = mats[grp.materialIndex] || mats[0];
            if (!mat) continue;
            const subGeo = new THREE.BufferGeometry();
            const s = grp.start, e = Math.min(posAttr.count, s + grp.count);
            subGeo.setAttribute('position', new THREE.BufferAttribute(posAttr.array.slice(s * 3, e * 3), 3));
            if (nrmAttr) subGeo.setAttribute('normal', new THREE.BufferAttribute(nrmAttr.array.slice(s * 3, e * 3), 3));
            if (uvAttr) subGeo.setAttribute('uv', new THREE.BufferAttribute(uvAttr.array.slice(s * 2, e * 2), 2));
            const isTransp = !!mat.transparent && (mat.opacity < 0.999);
            const isEmissiveGlow = !!(mat.emissive && typeof mat.emissive.getHex === 'function' && mat.emissive.getHex() > 0 && mat.emissiveIntensity >= 0.7 && !mat.map);
            const isBasic = !!mat.isMeshBasicMaterial || isEmissiveGlow;
            if (mat.map) {
              const key = `${mat.map.uuid}|${isBasic ? 'B' : 'L'}|${isTransp ? mat.opacity.toFixed(2) : 'O'}|${mat.side || 0}`;
              let b = texturedBuckets.get(key);
              if (!b) {
                b = { map: mat.map, isBasic, transparent: !!mat.transparent, opacity: mat.opacity || 1, depthWrite: mat.depthWrite !== false && !mat.transparent, blending: mat.blending || THREE.NormalBlending, side: mat.side || THREE.FrontSide, pieces: [] };
                texturedBuckets.set(key, b);
              }
              b.pieces.push({ geometry: subGeo, matrix: relMat, color: mat.color || 0xffffff });
            } else if (isTransp) {
              const opKey = `${Math.round((mat.opacity || 0.5) * 20)}|${mat.blending || THREE.NormalBlending}|${mat.side || 0}`;
              let b = transpBuckets.get(opKey);
              if (!b) {
                b = { opacity: mat.opacity || 0.5, blending: mat.blending || THREE.NormalBlending, side: mat.side || THREE.FrontSide, pieces: [] };
                transpBuckets.set(opKey, b);
              }
              b.pieces.push({ geometry: subGeo, matrix: relMat, color: mat.color || 0xffffff });
            } else if (isBasic) {
              basicOpaquePieces.push({ geometry: subGeo, matrix: relMat, color: mat.color || 0xffffff });
            } else if (mat.side === THREE.DoubleSide) {
              litDoublePieces.push({ geometry: subGeo, matrix: relMat, color: mat.color || 0xffffff });
            } else {
              litOpaquePieces.push({ geometry: subGeo, matrix: relMat, color: mat.color || 0xffffff });
            }
          }
          if (geo.index) baseNonIdx.dispose();
          meshesToDetach.push(node);
        }
        return;
      }

      if (node.children && node.children.length) {
        const ch = node.children.slice();
        for (let i = 0; i < ch.length; i++) walkCollect(ch[i], false);
      }
    }

    walkCollect(rootGroup, false);

    // Re-attach preserved animated/special objects directly to rootGroup preserving transform
    for (let i = 0; i < keptObjects.length; i++) {
      const k = keptObjects[i];
      if (k.parent !== rootGroup) {
        const relM = new THREE.Matrix4().multiplyMatrices(invRoot, k.matrixWorld);
        k.parent.remove(k);
        rootGroup.add(k);
        relM.decompose(k.position, k.quaternion, k.scale);
        k.updateMatrix();
      }
    }

    // Remove old unmerged meshes & empty groups cleanly
    for (let i = rootGroup.children.length - 1; i >= 0; i--) {
      const c = rootGroup.children[i];
      if (keptObjects.indexOf(c) === -1) rootGroup.remove(c);
    }

    const out = { litOpaque: null, litDouble: null, basicOpaque: null, transpMeshes: [], texturedMeshes: [] };

    if (opts.forceSingleMesh) {
      // Collapse all geometry pieces (even textured/basic/transparent) into 1 vertex-colored MeshLambertMaterial geo (ideal for InstancedMesh wheels)
      const combined = [].concat(litOpaquePieces, litDoublePieces, basicOpaquePieces);
      transpBuckets.forEach(b => { b.pieces.forEach(p => combined.push(p)); });
      texturedBuckets.forEach(b => { b.pieces.forEach(p => combined.push(p)); });
      const g = mergePiecesToBufferGeometry(combined, false);
      if (g) {
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
        m.castShadow = false; m.receiveShadow = false;
        rootGroup.add(m);
        out.litOpaque = m;
      }
      return out;
    }

    if (litOpaquePieces.length || litDoublePieces.length) {
      const combinedLit = litDoublePieces.length ? litOpaquePieces.concat(litDoublePieces) : litOpaquePieces;
      const g = mergePiecesToBufferGeometry(combinedLit, false);
      if (g) {
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
          color: 0xffffff,
          vertexColors: true,
          side: litDoublePieces.length ? THREE.DoubleSide : THREE.FrontSide
        }));
        m.castShadow = false; m.receiveShadow = false;
        rootGroup.add(m);
        out.litOpaque = m;
      }
    }
    if (basicOpaquePieces.length) {
      const g = mergePiecesToBufferGeometry(basicOpaquePieces, false);
      if (g) {
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }));
        m.castShadow = false; m.receiveShadow = false;
        rootGroup.add(m);
        out.basicOpaque = m;
      }
    }
    transpBuckets.forEach(b => {
      const g = mergePiecesToBufferGeometry(b.pieces, false);
      if (g) {
        const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
          color: 0xffffff, vertexColors: true, transparent: true, opacity: b.opacity, depthWrite: false, blending: b.blending, side: b.side
        }));
        m.castShadow = false; m.receiveShadow = false;
        rootGroup.add(m);
        out.transpMeshes.push(m);
      }
    });

    // Optional safe multi-texture Atlas Packer for non-repeating opaque decals/panels on vehicles/train
    if (opts.packTextures && texturedBuckets.size > 1 && typeof document !== 'undefined') {
      const packableGroups = { B: [], L: [] };
      const keptBuckets = [];
      texturedBuckets.forEach(b => {
        const tex = b.map;
        const img = tex && tex.image;
        const w = img ? (img.naturalWidth || img.videoWidth || img.width || 0) : 0;
        const h = img ? (img.naturalHeight || img.videoHeight || img.height || 0) : 0;
        const isRepeatable = tex && (tex.wrapS === THREE.RepeatWrapping || tex.wrapT === THREE.RepeatWrapping) && tex.repeat && (tex.repeat.x !== 1 || tex.repeat.y !== 1);
        let uvOutOfBounds = false;
        if (!uvOutOfBounds && w > 0 && h > 0 && !b.transparent && !isRepeatable) {
          for (let pi = 0; pi < b.pieces.length && !uvOutOfBounds; pi++) {
            const uv = b.pieces[pi].geometry && b.pieces[pi].geometry.attributes.uv;
            if (!uv) { uvOutOfBounds = true; break; }
            for (let ui = 0; ui < uv.count; ui++) {
              const u = uv.getX(ui), v = uv.getY(ui);
              if (u < -0.25 || u > 1.25 || v < -0.25 || v > 1.25) { uvOutOfBounds = true; break; }
            }
          }
        } else {
          uvOutOfBounds = true;
        }
        if (!uvOutOfBounds) {
          packableGroups[b.isBasic ? 'B' : 'L'].push(b);
        } else {
          keptBuckets.push(b);
        }
      });

      ['B', 'L'].forEach(kind => {
        const list = packableGroups[kind];
        if (list.length <= 1) {
          list.forEach(b => keptBuckets.push(b));
          return;
        }
        const cols = list.length <= 4 ? 2 : (list.length <= 9 ? 3 : 4);
        const rows = Math.ceil(list.length / cols);
        const cellW = Math.min(256, Math.floor(1024 / cols));
        const cellH = Math.min(256, Math.floor(1024 / rows));
        const atlasCv = document.createElement('canvas');
        atlasCv.width = cols * cellW;
        atlasCv.height = rows * cellH;
        const actx = atlasCv.getContext('2d');
        const allPieces = [];
        let useDoubleSide = false;

        list.forEach((b, idx) => {
          const gx = idx % cols;
          const gy = Math.floor(idx / cols);
          const x = gx * cellW, y = gy * cellH;
          const pad = 2;
          try {
            actx.drawImage(b.map.image, x + pad, y + pad, cellW - pad * 2, cellH - pad * 2);
          } catch (_) {}
          const u0 = (x + pad) / atlasCv.width;
          const du = (cellW - pad * 2) / atlasCv.width;
          const v0 = 1 - ((y + cellH - pad) / atlasCv.height);
          const dv = (cellH - pad * 2) / atlasCv.height;
          const flipY = (b.map && b.map.flipY === false);
          if (b.side === THREE.DoubleSide) useDoubleSide = true;
          b.pieces.forEach(p => {
            allPieces.push({
              geometry: p.geometry,
              matrix: p.matrix,
              color: p.color,
              uvRect: flipY ? [u0, v0 + dv, du, -dv] : [u0, v0, du, dv]
            });
          });
        });

        const atlasTex = new THREE.CanvasTexture(atlasCv);
        setupCrispCanvasTexture(atlasTex);
        const mergedG = mergePiecesToBufferGeometry(allPieces, true);
        if (mergedG) {
          const sideMode = useDoubleSide ? THREE.DoubleSide : THREE.FrontSide;
          const mat = kind === 'B'
            ? new THREE.MeshBasicMaterial({ map: atlasTex, vertexColors: true, side: sideMode })
            : new THREE.MeshLambertMaterial({ map: atlasTex, vertexColors: true, side: sideMode });
          const mesh = new THREE.Mesh(mergedG, mat);
          mesh.castShadow = false; mesh.receiveShadow = false;
          rootGroup.add(mesh);
          out.texturedMeshes.push(mesh);
        }
      });

      texturedBuckets.clear();
      keptBuckets.forEach((b, idx) => texturedBuckets.set('k_' + idx, b));
    }

    texturedBuckets.forEach(b => {
      const g = mergePiecesToBufferGeometry(b.pieces, true);
      if (g) {
        const mat = b.isBasic
          ? new THREE.MeshBasicMaterial({ map: b.map, vertexColors: true, transparent: b.transparent, opacity: b.opacity, depthWrite: b.depthWrite, blending: b.blending, side: b.side })
          : new THREE.MeshLambertMaterial({ map: b.map, vertexColors: true, transparent: b.transparent, opacity: b.opacity, depthWrite: b.depthWrite, blending: b.blending, side: b.side });
        const m = new THREE.Mesh(g, mat);
        m.castShadow = false; m.receiveShadow = false;
        rootGroup.add(m);
        out.texturedMeshes.push(m);
      }
    });

    return out;
  }

  const instancedFleetEntries = [];
  const rickshawPedalEntries = [];
  let rickCrankPool = null;
  let rickThighPool = null;
  let rickCalfPool = null;
  let rickSandPool = null;

  const sharedWheelGeoTemplates = {};
  function getSharedWheelTemplate(poolKey, wheelTemplateObj) {
    if (sharedWheelGeoTemplates[poolKey]) return sharedWheelGeoTemplates[poolKey];
    if (!wheelTemplateObj) return null;
    const cloneW = wheelTemplateObj.clone(true);
    cloneW.position.set(0, 0, 0);
    cloneW.rotation.set(0, 0, 0);
    cloneW.scale.set(1, 1, 1);
    const out = optimizeStaticSubtree(cloneW, { forceSingleMesh: true });
    const mesh = out.litOpaque || out.litDouble || out.basicOpaque;
    if (!mesh || !mesh.geometry) return null;
    mesh.geometry.computeBoundingSphere();
    sharedWheelGeoTemplates[poolKey] = mesh;
    return mesh;
  }

  function attachWheelsFromTemplate(parentObj, templatePoses, poolKey, wheelTemplateObj, scaleMul) {
    const wheelTmpl = getSharedWheelTemplate(poolKey, wheelTemplateObj) || sharedWheelGeoTemplates[poolKey];
    const wheels = [];
    if (!templatePoses || !parentObj) return wheels;
    for (let i = 0; i < templatePoses.length; i++) {
      const tp = templatePoses[i];
      let wheelMesh;
      if (wheelTmpl && wheelTmpl.geometry && wheelTmpl.material) {
        wheelMesh = new THREE.Mesh(wheelTmpl.geometry, wheelTmpl.material);
      } else {
        wheelMesh = new THREE.Object3D();
      }
      wheelMesh.position.copy(tp.position);
      wheelMesh.rotation.copy(tp.rotation);
      wheelMesh.scale.copy(tp.scale);
      if (scaleMul && scaleMul !== 1) wheelMesh.scale.multiplyScalar(scaleMul);
      wheelMesh.castShadow = false;
      wheelMesh.receiveShadow = false;
      wheelMesh.userData.isWheel = true;
      wheelMesh.userData.noMerge = true;
      wheelMesh.matrixAutoUpdate = true;
      parentObj.add(wheelMesh);
      wheels.push(wheelMesh);
    }
    return wheels;
  }

  function attachWheelPivotsFromTemplatePoses(parentObj, templatePoses, poolKey, scaleMul, capacity, baseRadius) {
    return attachWheelsFromTemplate(parentObj, templatePoses, poolKey, null, scaleMul);
  }

  function createInstancedFleetFromTemplate(templateRoot, capacity) {
    const layers = [];
    templateRoot.traverse(c => {
      if (c.isMesh && !c.isInstancedMesh && c.geometry && c.material) {
        const inst = new THREE.InstancedMesh(c.geometry, c.material, capacity);
        inst.count = 0;
        inst.frustumCulled = false;
        inst.castShadow = false;
        inst.receiveShadow = false;
        if (typeof scene !== 'undefined' && scene && scene.add) scene.add(inst);
        layers.push({ inst: inst });
      }
    });
    const fleet = { capacity: capacity, count: 0, layers: layers, hitInst: layers[0] ? layers[0].inst : null };
    if (fleet.hitInst) instancedHitLookup.set(fleet.hitInst, []);
    return fleet;
  }

  function ensureActiveBusMirrorMeshes() {
    if (activeBusLeftMirrorMesh) return;
    if (!liveLeftMirrorMat || !liveRightMirrorMat) initLiveBusMirrors();
    const mirrorGeo = new THREE.BoxGeometry(0.02, 2.55, 0.62);
    activeBusLeftMirrorMesh = new THREE.Mesh(mirrorGeo, liveLeftMirrorMat);
    activeBusLeftMirrorMesh.visible = false;
    activeBusLeftMirrorMesh.castShadow = false;
    activeBusLeftMirrorMesh.receiveShadow = false;
    activeBusRightMirrorMesh = new THREE.Mesh(mirrorGeo, liveRightMirrorMat);
    activeBusRightMirrorMesh.visible = false;
    activeBusRightMirrorMesh.castShadow = false;
    activeBusRightMirrorMesh.receiveShadow = false;
    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(activeBusLeftMirrorMesh);
      scene.add(activeBusRightMirrorMesh);
    }
  }

  function syncActiveBusMirrorOverlays(activeBus) {
    if (!activeBusLeftMirrorMesh || !activeBusRightMirrorMesh) return;
    if (!activeBus || activeCamMode !== 'bus') {
      activeBusLeftMirrorMesh.visible = false;
      activeBusRightMirrorMesh.visible = false;
      return;
    }
    activeBus.updateMatrixWorld(true);
    // Sync Left mirror (side = +1)
    activeBusLeftMirrorMesh.position.set(36.21, 15.0, 11.40);
    activeBusLeftMirrorMesh.quaternion.setFromEuler(_instEuler.set(0, -0.16, 0));
    activeBusLeftMirrorMesh.position.applyMatrix4(activeBus.matrixWorld);
    activeBusLeftMirrorMesh.quaternion.premultiply(activeBus.quaternion);
    activeBusLeftMirrorMesh.visible = true;

    // Sync Right mirror (side = -1)
    activeBusRightMirrorMesh.position.set(36.21, 15.0, -11.40);
    activeBusRightMirrorMesh.quaternion.setFromEuler(_instEuler.set(0, 0.20, 0));
    activeBusRightMirrorMesh.position.applyMatrix4(activeBus.matrixWorld);
    activeBusRightMirrorMesh.quaternion.premultiply(activeBus.quaternion);
    activeBusRightMirrorMesh.visible = true;
  }

  function syncAllInstancedPools() {
    // 1. Dynamic Instanced Fleets (Buses, CNGs, Rickshaws)
    for (let fi = 0; fi < instancedFleetEntries.length; fi++) {
      const entry = instancedFleetEntries[fi];
      entry.root.updateMatrixWorld(true);
      const m = entry.localScaleObj ? entry.localScaleObj.matrixWorld : entry.root.matrixWorld;
      const layers = entry.fleet.layers;
      for (let li = 0; li < layers.length; li++) {
        layers[li].inst.setMatrixAt(entry.slot, m);
      }
    }
    if (busInstFleet) busInstFleet.layers.forEach(l => { l.inst.instanceMatrix.needsUpdate = true; });
    if (cngInstFleet) cngInstFleet.layers.forEach(l => { l.inst.instanceMatrix.needsUpdate = true; });
    if (rickshawInstFleet) rickshawInstFleet.layers.forEach(l => { l.inst.instanceMatrix.needsUpdate = true; });

    // 4. Ground Contact Shadow Discs (1 InstancedMesh across all pedestrians)
    if (pedShadowInst && pedShadowEntries.length > 0) {
      _instEuler.set(-Math.PI / 2, 0, 0);
      _instQuat.setFromEuler(_instEuler);
      let activeCount = 0;
      for (let si = 0; si < pedShadowEntries.length; si++) {
        const se = pedShadowEntries[si];
        if (!se.root || se.root.visible === false) continue;
        _instPos.set(se.root.position.x, se.root.position.y + 0.015, se.root.position.z);
        _instScale.set(se.scale, se.scale, se.scale);
        _instMat4.compose(_instPos, _instQuat, _instScale);
        pedShadowInst.setMatrixAt(activeCount++, _instMat4);
      }
      pedShadowInst.count = activeCount;
      pedShadowInst.instanceMatrix.needsUpdate = true;
    }

    // 5. Shared Additive Headlight Ground Pools (Cars & Bikes -> 1 InstancedMesh draw call)
    if (headlightGlowPoolInst && headlightGlowEntries.length > 0) {
      let hgCount = 0;
      for (let hi = 0; hi < headlightGlowEntries.length; hi++) {
        const he = headlightGlowEntries[hi];
        if (!he.pivot || !he.owner || he.owner.visible === false) continue;
        he.pivot.updateMatrixWorld(true);
        headlightGlowPoolInst.setMatrixAt(hgCount++, he.pivot.matrixWorld);
      }
      headlightGlowPoolInst.count = hgCount;
      headlightGlowPoolInst.instanceMatrix.needsUpdate = true;
    }
  }

  let headlightGlowPoolInst = null;
  const headlightGlowEntries = [];
  function registerHeadlightGlow(ownerObj, lx, ly, lz, w, d) {
    if (!headlightGlowPoolInst && typeof scene !== 'undefined' && scene && scene.add) {
      const geo = new THREE.PlaneGeometry(1, 1);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        map: getRadialGlowTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      headlightGlowPoolInst = new THREE.InstancedMesh(geo, mat, 20);
      headlightGlowPoolInst.count = 0;
      headlightGlowPoolInst.frustumCulled = false;
      headlightGlowPoolInst.castShadow = false;
      headlightGlowPoolInst.receiveShadow = false;
      scene.add(headlightGlowPoolInst);
    }
    const pv = new THREE.Object3D();
    pv.position.set(lx, ly, lz);
    pv.scale.set(w, 1, d);
    ownerObj.add(pv);
    headlightGlowEntries.push({ owner: ownerObj, pivot: pv });
    return pv;
  }

  function downscaleOversizedPedTexture(tex, maxDim) {
    if (!tex || !tex.image || tex.userData && tex.userData._downscaled512) return tex;
    const limit = maxDim || 512;
    const img = tex.image;
    const w = img.naturalWidth || img.videoWidth || img.width || 0;
    const h = img.naturalHeight || img.videoHeight || img.height || 0;
    if (!w || !h || (w <= limit && h <= limit)) return tex;
    if (typeof document === 'undefined') return tex;

    try {
      const scale = Math.min(limit / w, limit / h);
      const dw = Math.max(2, Math.round(w * scale));
      const dh = Math.max(2, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) return tex;
      ctx.drawImage(img, 0, 0, dw, dh);
      const newTex = new THREE.CanvasTexture(canvas);
      newTex.flipY = (tex.flipY !== undefined) ? tex.flipY : true;
      newTex.encoding = tex.encoding || THREE.sRGBEncoding || 3001;
      newTex.wrapS = tex.wrapS || THREE.ClampToEdgeWrapping;
      newTex.wrapT = tex.wrapT || THREE.ClampToEdgeWrapping;
      newTex.generateMipmaps = true;
      newTex.minFilter = THREE.LinearMipmapLinearFilter;
      newTex.magFilter = THREE.LinearFilter;
      newTex.userData = Object.assign({}, tex.userData || {}, { _downscaled512: true });
      newTex.needsUpdate = true;
      if (typeof tex.dispose === 'function') tex.dispose();
      return newTex;
    } catch (_) {
      return tex;
    }
  }

  function getOrCreateWheelPool(poolKey, radius, builderFn, capacity) {
    if (wheelInstancePools[poolKey]) return wheelInstancePools[poolKey];
    const tmpWheel = builderFn();
    tmpWheel.updateMatrixWorld(true);
    const out = optimizeStaticSubtree(tmpWheel, {});
    const wheelMesh = out.litOpaque || out.litDouble || out.basicOpaque;
    if (!wheelMesh || !wheelMesh.geometry) return null;
    const inst = new THREE.InstancedMesh(wheelMesh.geometry, wheelMesh.material, capacity || 24);
    inst.count = 0;
    inst.frustumCulled = false;
    inst.castShadow = false;
    inst.receiveShadow = false;
    if (typeof scene !== 'undefined' && scene && scene.add) scene.add(inst);
    const pool = {
      key: poolKey,
      inst: inst,
      capacity: capacity || 24,
      entries: [] // [{ pivot, radius }]
    };
    wheelInstancePools[poolKey] = pool;
    return pool;
  }

  function registerInstancedWheel(poolKey, radius, builderFn, pivotParent, lx, ly, lz, capacity) {
    const pool = getOrCreateWheelPool(poolKey, radius, builderFn, capacity);
    const pivot = new THREE.Object3D();
    pivot.position.set(lx, ly, lz);
    pivot.userData.noMerge = true;
    pivotParent.add(pivot);
    if (pool && pool.entries.length < pool.capacity) {
      pool.entries.push({ pivot: pivot, radius: radius });
      pool.inst.count = pool.entries.length;
    }
    return pivot;
  }

  const BLANK_PIXEL_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

  // Safe TextureLoader guard: prevent non-string or undefined url from causing url.search() TypeError
  // and prevent this.path from being prepended to data: and blob: URIs (which triggers 404 network requests)
  if (typeof THREE !== 'undefined' && THREE.TextureLoader && !THREE.TextureLoader.prototype._safeUrlGuardedV3) {
    const origTextureLoaderLoad = THREE.TextureLoader.prototype.load;
    THREE.TextureLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      const isBlank = !(typeof url === 'string' && url.length > 0 && url !== 'undefined' && !url.endsWith('/undefined'));
      const safeUrl = isBlank ? BLANK_PIXEL_DATA_URI : url;

      let tex;
      if (typeof safeUrl === 'string' && (safeUrl.startsWith('data:') || safeUrl.startsWith('blob:'))) {
        const savedPath = this.path;
        this.path = '';
        try {
          tex = origTextureLoaderLoad.call(this, safeUrl, onLoad, onProgress, onError);
        } finally {
          this.path = savedPath;
        }
      } else {
        tex = origTextureLoaderLoad.call(this, safeUrl, onLoad, onProgress, onError);
      }
      if (tex && (isBlank || safeUrl === BLANK_PIXEL_DATA_URI)) {
        tex.userData = tex.userData || {};
        tex.userData.isBlankFallback = true;
      }
      return tex;
    };
    THREE.TextureLoader.prototype._safeUrlGuardedV3 = true;
  }

  // Also guard THREE.ImageLoader directly to ensure this.path is never prepended to data: or blob: URIs
  if (typeof THREE !== 'undefined' && THREE.ImageLoader && !THREE.ImageLoader.prototype._safeDataUriGuarded) {
    const origImageLoaderLoad = THREE.ImageLoader.prototype.load;
    THREE.ImageLoader.prototype.load = function (url, onLoad, onProgress, onError) {
      const isBlank = !(typeof url === 'string' && url.length > 0 && url !== 'undefined' && !url.endsWith('/undefined'));
      let targetUrl = isBlank ? BLANK_PIXEL_DATA_URI : url;

      if (typeof targetUrl === 'string' && (targetUrl.startsWith('data:') || targetUrl.startsWith('blob:'))) {
        const savedPath = this.path;
        this.path = '';
        try {
          return origImageLoaderLoad.call(this, targetUrl, onLoad, onProgress, onError);
        } finally {
          this.path = savedPath;
        }
      }
      return origImageLoaderLoad.call(this, targetUrl, onLoad, onProgress, onError);
    };
    THREE.ImageLoader.prototype._safeDataUriGuarded = true;
  }

  // Safe prototype guard: prevent null or undefined from ever being pushed into Object3D.children
  if (typeof THREE !== 'undefined' && THREE.Object3D && !THREE.Object3D.prototype._safeAddGuardedV3) {
    const origAdd = THREE.Object3D.prototype.add;
    THREE.Object3D.prototype.add = function (...args) {
      const valid = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] && args[i].isObject3D && args[i] !== this) valid.push(args[i]);
      }
      if (this.children && this.children.length) {
        this.children = this.children.filter(Boolean);
      }
      if (!valid.length) return this;
      const res = origAdd.apply(this, valid);
      if (this.children && this.children.length) {
        this.children = this.children.filter(Boolean);
      }
      return res;
    };
    THREE.Object3D.prototype._safeAddGuardedV3 = true;
  }

  // Lightweight sanitizer helper: recursively filters out any falsy/null entries from obj.children
  // and logs a one-time warning with the parent name when a null child is found and purged.
  const warnedPrunedNullMap = new Set();
  function pruneNullChildrenWithReport(root, label) {
    if (!root || !Array.isArray(root.children)) return root;
    let prunedCount = 0;
    const hasInvalid = root.children.some(c => !c || (typeof c.isObject3D !== 'undefined' && !c.isObject3D));
    if (hasInvalid) {
      const parentName = (label ? (label + '::') : '') + (root.name || root.type || 'Object3D');
      const prevLen = root.children.length;
      root.children = root.children.filter(c => Boolean(c) && (typeof c.isObject3D === 'undefined' || c.isObject3D));
      prunedCount += (prevLen - root.children.length);
      if (!warnedPrunedNullMap.has(parentName)) {
        warnedPrunedNullMap.add(parentName);
        console.warn('[SceneGraph] Pruned ' + prunedCount + ' null/invalid child from: ' + parentName);
      }
    }
    for (let i = 0; i < root.children.length; i++) {
      pruneNullChildrenWithReport(root.children[i], label);
    }
    return root;
  }
  const pruneNullChildren = pruneNullChildrenWithReport;
  const purgeNullChildren = pruneNullChildrenWithReport;

  // Camera & Mouse control
  let mouseRelX = 0, mouseRelY = 0;
  const DEFAULT_VEHICLE_YAW = 2.35;
  let vehicleOrbitYaw = DEFAULT_VEHICLE_YAW;
  let vehicleOrbitPitch = 0.28;
  let orbitPointerId = null;
  let lastOrbitPointerX = 0;
  let lastOrbitPointerY = 0;
  let buildingNameCounter = 0;
  const ORBITABLE_VEHICLE_MODES = ['bus', 'bike', 'cng', 'car', 'rickshaw', 'walking'];
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
      badge: 'হাসান পরিবহন (আজিমপুর - উত্তরা)'
    },
    rickshaw: {
      pos: { x: 220, y: 440, z: 460 },
      look: { x: 0, y: 25, z: -35 },
      badge: 'Rickshaw Orbit · Move Pointer'
    },
    walking: {
      pos: { x: 0, y: 52, z: 110 },
      look: { x: 0, y: 6, z: 0 },
      badge: 'Zebra Crosswalk · 360° Orbit'
    }
  };

  const clock = new THREE.Clock();
  let activeCamMode = 'overview';
  let activeTargetVehicle = null;
  let walkingCycleIndex = 0;
  const WALKING_CYCLE_CATEGORIES = ['male', 'female', 'child'];
  const CANONICAL_WALKING_ROSTER = [
    'male_remy',
    'female_ch22',
    'female_salwar',
    'little_boy',
    'male_formal',
    'male_hoodie',
    'male_sweater',
    'male_tshirt'
  ];
  let lastFocusedTemplateId = null;

  const CHARACTER_INFO = {
    male_remy: {
      icon: '🚶‍♂️',
      name: 'Remy (Street Casual)',
      badge: 'Remy (Street Casual)',
      sub: 'Executive commuter crossing zebra stripes · 360° Orbit (Click Walking to cycle) · 0 carbon'
    },
    female_ch22: {
      icon: '🚶‍♀️',
      name: 'Ch22 (Modern Commuter)',
      badge: 'Ch22 (Modern Commuter)',
      sub: 'Urban commuter crossing Mirpur 10 · 360° Orbit (Click Walking to cycle) · 0 carbon'
    },
    female_salwar: {
      icon: '🚶‍♀️',
      name: 'Salwar Kameez Commuter',
      badge: 'Salwar Kameez Commuter',
      sub: 'Traditional South Asian attire commuter · 360° Orbit (Click Walking to cycle) · 0 carbon'
    },
    little_boy: {
      icon: '🧒',
      name: 'School Kid Walker',
      badge: 'School Kid Walker',
      sub: 'Dhaka student crossing zebra stripes · 360° Orbit (Click Walking to cycle) · 0 carbon'
    },
    male_formal: {
      icon: '🚶‍♂️',
      name: 'Formal Office Commuter',
      badge: 'Formal Office Commuter',
      sub: 'Formal business commuter crossing Mirpur 10 · 360° Orbit (Click Walking to cycle) · 0 carbon'
    },
    male_hoodie: {
      icon: '🚶‍♂️',
      name: 'Streetwear Hoodie Walker',
      badge: 'Streetwear Hoodie Walker',
      sub: 'Dhaka youth streetwear commuter · 360° Orbit (Click Walking to cycle) · 0 carbon'
    },
    male_sweater: {
      icon: '🚶‍♂️',
      name: 'Winter Sweater Walker',
      badge: 'Winter Sweater Walker',
      sub: 'Winter casual commuter crossing zebra stripes · 360° Orbit (Click Walking to cycle) · 0 carbon'
    },
    male_tshirt: {
      icon: '🚶‍♂️',
      name: 'Casual T-Shirt Walker',
      badge: 'Casual T-Shirt Walker',
      sub: 'Casual commuter strolling across zebra crosswalk · 360° Orbit (Click Walking to cycle) · 0 carbon'
    }
  };

  function setupCrispCanvasTexture(tex) {
    if (!tex) return tex;
    // Guard: never attempt mipmapping or texture upload on render target textures or textures without valid image
    if (tex.isRenderTargetTexture || !tex.image) {
      tex.generateMipmaps = false;
      return tex;
    }
    const maxAniso = (renderer && renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === 'function')
      ? renderer.capabilities.getMaxAnisotropy()
      : 16;
    tex.anisotropy = Math.max(1, maxAniso);
    if (tex.image && (tex.image.width > 0 && tex.image.height > 0)) {
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    } else {
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
    }
    return tex;
  }

  function acquireTargetWalker(desiredId, advanceCycle = false) {
    if (typeof pedMeshMap === 'undefined') return null;

    // STRICT: Only consider walkers whose Mixamo model is ALREADY spawned, visible === true, and isRiggedMixamo === true
    const readyMixamoPeds = Object.values(pedMeshMap).filter(pm =>
      pm &&
      pm.mesh &&
      pm.mesh.parent &&
      pm.mesh.visible === true &&
      pm.mesh.userData &&
      pm.mesh.userData.isRiggedMixamo &&
      pm.data
    );

    if (!readyMixamoPeds.length) return null;

    const availableIds = new Set(readyMixamoPeds.map(pm => pm.mesh.userData.charId || pm.data.charId || pm.data.templateId));
    const readyIds = CANONICAL_WALKING_ROSTER.filter(id => availableIds.has(id));

    let targetTemplateId = desiredId;

    if (advanceCycle) {
      if (readyIds.length > 0) {
        const curIdx = lastFocusedTemplateId ? readyIds.indexOf(lastFocusedTemplateId) : -1;
        const nextIdx = (curIdx + 1) % readyIds.length;
        targetTemplateId = readyIds[nextIdx];
      } else {
        targetTemplateId = readyMixamoPeds[0].mesh.userData.charId || readyMixamoPeds[0].data.charId;
      }
    } else if (!targetTemplateId) {
      if (lastFocusedTemplateId && availableIds.has(lastFocusedTemplateId)) {
        targetTemplateId = lastFocusedTemplateId;
      } else if (readyIds.length > 0) {
        targetTemplateId = readyIds[0];
      }
    }

    if (targetTemplateId && availableIds.has(targetTemplateId)) {
      lastFocusedTemplateId = targetTemplateId;
    }

    let matching = [];
    if (targetTemplateId) {
      matching = readyMixamoPeds.filter(pm => {
        const pId = pm.mesh.userData.charId || pm.data.charId || pm.data.templateId;
        return pId === targetTemplateId;
      });
    }

    // Fall back to category matching if desiredId was e.g. 'female' or 'male' and didn't match a templateId
    if (!matching.length && desiredId) {
      matching = readyMixamoPeds.filter(pm => {
        const pCat = (pm.mesh.userData && pm.mesh.userData.pedCategory) || pm.data.pedCategory;
        if (desiredId === 'child') return pCat === 'child' || pm.data.isChild;
        if (desiredId === 'female') return pCat === 'female' || pm.data.isFemale;
        if (desiredId === 'male') return pCat === 'male' || (!pm.data.isFemale && !pm.data.isChild);
        return false;
      });
    }

    const candidatePool = matching.length ? matching : readyMixamoPeds;

    // Prefer crosswalk zebra walkers (!isSidewalk) over sidewalk walkers
    const pool = candidatePool.slice().sort((a, b) => {
      const aCross = !a.data.isSidewalk ? 1 : 0;
      const bCross = !b.data.isSidewalk ? 1 : 0;
      return bCross - aCross;
    });

    const chosen = pool[0];
    if (!chosen) return null;

    const actualCharId = (chosen.mesh.userData && chosen.mesh.userData.charId) || chosen.data.charId || targetTemplateId;
    lastFocusedTemplateId = actualCharId;
    const info = CHARACTER_INFO[actualCharId];
    const actualCat = (chosen.mesh.userData && chosen.mesh.userData.pedCategory) || chosen.data.pedCategory || (actualCharId && actualCharId.includes('female') ? 'female' : (actualCharId && actualCharId.includes('boy') ? 'child' : 'male'));
    const actualCharName = (info && info.name) || (chosen.mesh.userData && chosen.mesh.userData.charName) || chosen.data.charName || 'Commuter';

    return {
      id: chosen.data.id || ('ped_' + actualCharId),
      type: 'walking',
      category: actualCat,
      charId: actualCharId,
      templateId: actualCharId,
      charName: actualCharName,
      mesh: chosen.mesh,
      data: chosen.data,
      speed: chosen.data.speed || 12
    };
  }

  function acquireTargetVehicle(modeName, excludeId) {
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
        .filter(vm => vm.mesh && vm.mesh.parent && vm.data && targetTypes.includes(vm.data.type) && (!excludeId || vm.data.id !== excludeId));
      if (modeName === 'bike') {
        eligible.sort((a, b) => {
          const centerA = a.data.dir === 'SB' || a.data.dir === 'NB' ? 420 : 600;
          const centerB = b.data.dir === 'SB' || b.data.dir === 'NB' ? 420 : 600;
          return Math.abs(a.data.pos - centerA) - Math.abs(b.data.pos - centerB);
        });
      } else {
        eligible.sort((a, b) => {
          const centerA = a.data.dir === 'SB' || a.data.dir === 'NB' ? 420 : 600;
          const centerB = b.data.dir === 'SB' || b.data.dir === 'NB' ? 420 : 600;
          return Math.abs(a.data.pos - centerA) - Math.abs(b.data.pos - centerB);
        });
      }
      if (eligible.length) {
        return {
          id: eligible[0].data.id,
          type: eligible[0].data.type,
          mesh: eligible[0].mesh,
          data: eligible[0].data,
          speed: eligible[0].data.speed || (modeName === 'bike' ? 44 : modeName === 'bus' ? 26 : modeName === 'cng' ? 34 : 38)
        };
      }
    } else if (modeName === 'walking') {
      return acquireTargetWalker(lastFocusedTemplateId);
    }

    return null;
  }

  function clearTrackedVehicle() {
    activeCamMode = 'overview';
    activeTargetVehicle = null;
    orbitPointerId = null;
    if (canvasEl) canvasEl.style.touchAction = 'auto';

    const modePill = document.getElementById('crossroadsModePill');
    if (modePill) modePill.classList.add('hidden');

    updateLegendHUD('overview');
    updateCameraModeBadge('overview');

    if (CAM_MODES && CAM_MODES.overview) {
      focusCamera(CAM_MODES.overview.pos, CAM_MODES.overview.look, 1.6);
    }
  }
  window.clearTrackedVehicle = clearTrackedVehicle;

  let lastTrackedHUDUpdate = 0;
  let _lastHUDTitle = null;
  let _lastHUDSub = null;
  let _lastHUDIcon = null;
  let _lastHUDVisible = false;

  function setNodeText(el, text) {
    if (el && el.textContent !== text) {
      el.textContent = text;
    }
  }

  function updateTrackedVehicleHUD(target, force) {
    const now = performance.now();
    if (!force && (now - lastTrackedHUDUpdate < 100)) return; // <= 10 Hz DOM throttle
    lastTrackedHUDUpdate = now;

    if (!target || !target.data) return;
    const modePill = document.getElementById('crossroadsModePill');
    const icon = document.getElementById('crossroadsModePillIcon');
    const title = document.getElementById('crossroadsModePillTitle');
    const sub = document.getElementById('crossroadsModePillSub');
    if (!modePill || !title) return;

    if (!_lastHUDVisible) {
      modePill.classList.remove('hidden');
      _lastHUDVisible = true;
    }
    const dirLabel = target.data.dir === 'EB' ? 'Eastbound' :
                     target.data.dir === 'WB' ? 'Westbound' :
                     target.data.dir === 'SB' ? 'Southbound' : 'Northbound';
    const speedKmh = Math.round(target.data.speed || target.speed || 40);
    const vType = target.type;

    let newIcon = '';
    let newTitle = '';
    let newSub = '';

    if (vType === 'bike') {
      newIcon = '🏍️';
      newTitle = `${(target.mesh && target.mesh.userData && target.mesh.userData.modelTitle) || 'Ride-share Sports Bike'} · ${dirLabel}`;
      newSub = `Speed: ${speedKmh} km/h · Rapid Lane Traversal · Base ৳30 + ৳12/km`;
    } else if (vType === 'cng') {
      newIcon = '🛺';
      newTitle = `CNG Auto-Rickshaw · One Paribahan (${dirLabel})`;
      newSub = `Speed: ${speedKmh} km/h · Reg: ঢাকা মেট্রো-থ ১১-৪৫৬৭ · Base ৳40 + ৳12/km`;
    } else if (vType === 'bus') {
      newIcon = '🚌';
      newTitle = `${(target.mesh && target.mesh.userData && target.mesh.userData.modelTitle) || 'হাসান পরিবহন (আজিমপুর - উত্তরা)'} · ${dirLabel}`;
      newSub = `Speed: ${speedKmh} km/h · আজিমপুর ➔ উত্তরা · Dhaka City Transit Bus`;
    } else if (vType === 'rickshaw') {
      newIcon = '🛺';
      newTitle = `Dhaka Cycle Rickshaw · ${dirLabel}`;
      newSub = `Speed: ${speedKmh} km/h · Traditional Rickshaw Art · Local Mirpur fare ৳25 – ৳50`;
    } else if (vType === 'car') {
      newIcon = '🚗';
      newTitle = `${(target.mesh && target.mesh.userData && target.mesh.userData.modelTitle) || 'Aerodynamic Ride-share Car'} · ${dirLabel}`;
      newSub = `Speed: ${speedKmh} km/h · Executive Fleet · Base ৳50 + ৳20/km`;
    } else if (vType === 'walking' || vType === 'ped') {
      const isReady = target.mesh && target.mesh.visible === true && target.mesh.userData && target.mesh.userData.isRiggedMixamo;
      if (!isReady) {
        newIcon = '🚶';
        newTitle = 'Mirpur 10 Zebra Crosswalk';
        newSub = 'Pedestrian crosswalk · 360° Orbit · Loading commuters...';
      } else {
        const charId = target.charId || (target.mesh && target.mesh.userData && target.mesh.userData.charId);
        const info = CHARACTER_INFO[charId];
        const cat = target.category || (target.data && target.data.pedCategory) || (target.mesh && target.mesh.userData && target.mesh.userData.pedCategory) || 'male';
        const charName = (info && info.name) || target.charName || (target.mesh && target.mesh.userData && target.mesh.userData.charName) || 'Commuter';
        newIcon = (info && info.icon) || (cat === 'female' ? '🚶‍♀️' : cat === 'child' ? '🧒' : '🚶‍♂️');
        const locLabel = target.data?.isSidewalk ? 'Footpath Stroll' : 'Mirpur 10 Zebra Crosswalk';
        newTitle = `${charName} · ${locLabel}`;
        newSub = (info && info.sub) || `Mixamo 3D Rigged Commuter · 360° Orbit (Click Walking to cycle) · 0 carbon`;
      }
    }

    if (icon && newIcon && _lastHUDIcon !== newIcon) {
      icon.textContent = newIcon;
      _lastHUDIcon = newIcon;
    }
    if (newTitle && _lastHUDTitle !== newTitle) {
      title.textContent = newTitle;
      _lastHUDTitle = newTitle;
    }
    if (sub && newSub && _lastHUDSub !== newSub) {
      sub.textContent = newSub;
      _lastHUDSub = newSub;
    }
  }

  function focusCamera(targetPos, targetLook, duration) {
    if (!targetPos || !targetLook) return;
    if (!Number.isFinite(targetPos.x) || !Number.isFinite(targetPos.y) || !Number.isFinite(targetPos.z) ||
        !Number.isFinite(targetLook.x) || !Number.isFinite(targetLook.y) || !Number.isFinite(targetLook.z)) {
      return;
    }
    markCameraTransition(duration || 1.6);
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
    if (!target || !target.mesh || !target.mesh.position) {
      _cachedOrbitPose.position.x = camBasePos.x;
      _cachedOrbitPose.position.y = camBasePos.y;
      _cachedOrbitPose.position.z = camBasePos.z;
      _cachedOrbitPose.look.x = camBaseLook.x;
      _cachedOrbitPose.look.y = camBaseLook.y;
      _cachedOrbitPose.look.z = camBaseLook.z;
      return _cachedOrbitPose;
    }
    const isPed = target.type === 'ped' || target.type === 'walking';
    if (isPed) {
      const isReadyWalker = target.mesh.visible === true && target.mesh.userData && target.mesh.userData.isRiggedMixamo;
      if (!isReadyWalker) {
        if (CAM_MODES && CAM_MODES.walking) {
          _cachedOrbitPose.position.x = CAM_MODES.walking.pos.x;
          _cachedOrbitPose.position.y = CAM_MODES.walking.pos.y;
          _cachedOrbitPose.position.z = CAM_MODES.walking.pos.z;
          _cachedOrbitPose.look.x = CAM_MODES.walking.look.x;
          _cachedOrbitPose.look.y = CAM_MODES.walking.look.y;
          _cachedOrbitPose.look.z = CAM_MODES.walking.look.z;
          return _cachedOrbitPose;
        }
        _cachedOrbitPose.position.x = camBasePos.x;
        _cachedOrbitPose.position.y = camBasePos.y;
        _cachedOrbitPose.position.z = camBasePos.z;
        _cachedOrbitPose.look.x = camBaseLook.x;
        _cachedOrbitPose.look.y = camBaseLook.y;
        _cachedOrbitPose.look.z = camBaseLook.z;
        return _cachedOrbitPose;
      }
    }
    const position = target.mesh.position;
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) {
      _cachedOrbitPose.position.x = camBasePos.x;
      _cachedOrbitPose.position.y = camBasePos.y;
      _cachedOrbitPose.position.z = camBasePos.z;
      _cachedOrbitPose.look.x = camBaseLook.x;
      _cachedOrbitPose.look.y = camBaseLook.y;
      _cachedOrbitPose.look.z = camBaseLook.z;
      return _cachedOrbitPose;
    }

    const safeYaw = Number.isFinite(yaw) ? yaw : DEFAULT_VEHICLE_YAW;
    const safePitch = Number.isFinite(pitch) ? Math.max(0.12, Math.min(0.55, pitch)) : 0.28;
    const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 50;

    const direction = target.data ? target.data.dir : target.dir;
    if (direction === 'EB') {
      _forwardVec.x = 1; _forwardVec.z = 0;
    } else if (direction === 'WB') {
      _forwardVec.x = -1; _forwardVec.z = 0;
    } else if (direction === 'SB') {
      _forwardVec.x = 0; _forwardVec.z = 1;
    } else if (direction === 'NB') {
      _forwardVec.x = 0; _forwardVec.z = -1;
    } else if (target.mesh && typeof target.mesh.rotation?.y === 'number') {
      const ry = target.mesh.rotation.y;
      _forwardVec.x = Math.sin(ry);
      _forwardVec.z = Math.cos(ry);
    } else {
      _forwardVec.x = 0;
      _forwardVec.z = -1;
    }
    _rightVec.x = -_forwardVec.z;
    _rightVec.z = _forwardVec.x;

    const horizontalRadius = safeRadius * Math.cos(safePitch);
    const targetX = position.x;
    const isChildPed = isPed && (target.category === 'child' || (target.data && (target.data.pedCategory === 'child' || target.data.isChild)));
    const targetY = position.y + (target.type === 'bike' ? 4.5 : target.type === 'bus' ? 9.5 : target.type === 'car' ? 4.5 : isPed ? (isChildPed ? 4.8 : 6.2) : 5.5);
    const targetZ = position.z;

    const posX = targetX - _forwardVec.x * horizontalRadius * Math.cos(safeYaw) + _rightVec.x * horizontalRadius * Math.sin(safeYaw);
    const posY = targetY + safeRadius * Math.sin(safePitch);
    const posZ = targetZ - _forwardVec.z * horizontalRadius * Math.cos(safeYaw) + _rightVec.z * horizontalRadius * Math.sin(safeYaw);

    const lookX = targetX;
    const lookY = targetY + (isPed ? 0.5 : target.type === 'bus' ? 2.0 : 1.0);
    const lookZ = targetZ;

    _cachedOrbitPose.position.x = Number.isFinite(posX) ? posX : camBasePos.x;
    _cachedOrbitPose.position.y = Number.isFinite(posY) ? posY : camBasePos.y;
    _cachedOrbitPose.position.z = Number.isFinite(posZ) ? posZ : camBasePos.z;
    _cachedOrbitPose.look.x = Number.isFinite(lookX) ? lookX : camBaseLook.x;
    _cachedOrbitPose.look.y = Number.isFinite(lookY) ? lookY : camBaseLook.y;
    _cachedOrbitPose.look.z = Number.isFinite(lookZ) ? lookZ : camBaseLook.z;
    return _cachedOrbitPose;
  }

  function getVehicleOrbitPose(target) {
    if (!target) {
      _cachedOrbitPose.position.x = camBasePos.x;
      _cachedOrbitPose.position.y = camBasePos.y;
      _cachedOrbitPose.position.z = camBasePos.z;
      _cachedOrbitPose.look.x = camBaseLook.x;
      _cachedOrbitPose.look.y = camBaseLook.y;
      _cachedOrbitPose.look.z = camBaseLook.z;
      return _cachedOrbitPose;
    }
    const yaw = Number.isFinite(vehicleOrbitYaw) ? vehicleOrbitYaw : DEFAULT_VEHICLE_YAW;
    const pitch = Math.max(0.12, Math.min(0.55, Number.isFinite(vehicleOrbitPitch) ? vehicleOrbitPitch : 0.28));
    const baseRadius = target.type === 'car' ? 52
      : target.type === 'bike' ? 36
        : target.type === 'rickshaw' ? 38
          : target.type === 'cng' ? 40
            : (target.type === 'ped' || target.type === 'walking') ? ((target.category === 'child' || (target.data && (target.data.pedCategory === 'child' || target.data.isChild))) ? 28 : 34)
              : 96;
    const fovDeg = (camera && Number.isFinite(camera.fov)) ? camera.fov : 38;
    const aspect = (camera && Number.isFinite(camera.aspect) && camera.aspect > 0) ? camera.aspect : 1.6;
    const horizontalCoverage = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)) * aspect;
    const desktopCoverage = Math.tan(THREE.MathUtils.degToRad(38 / 2)) * 1.6;
    const framingScale = (Number.isFinite(horizontalCoverage) && horizontalCoverage > 0)
      ? Math.max(1, desktopCoverage / horizontalCoverage)
      : 1;

    return getVehicleCameraPose(target, yaw, baseRadius * framingScale, pitch);
  }

  function isOrbitableVehicleMode(modeName) {
    return ORBITABLE_VEHICLE_MODES.includes(modeName);
  }

  function updateCameraModeBadge(modeName) {
    const badge = document.getElementById('crossroadsCamModeBadge');
    if (!badge || !CAM_MODES[modeName]) return;

    let targetText = '';
    const targetType = activeTargetVehicle && activeTargetVehicle.type;
    if (['bike', 'cng', 'car', 'rickshaw', 'bus'].includes(modeName)) {
      targetText = targetType
        ? `${targetType.charAt(0).toUpperCase()}${targetType.slice(1)} · Move Pointer to Orbit`
        : 'Waiting for vehicle';
    } else if (modeName === 'walking') {
      const isReady = activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.mesh.visible === true && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.isRiggedMixamo;
      if (!isReady) {
        targetText = 'Zebra Crosswalk · 360° Orbit';
      } else {
        const charId = activeTargetVehicle.charId || (activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.charId);
        const info = CHARACTER_INFO[charId];
        const label = (info && info.badge) || activeTargetVehicle.charName || 'Mixamo Walker';
        targetText = `${label} · 360° Orbit (Click Walking to cycle)`;
      }
    } else {
      targetText = CAM_MODES[modeName].badge;
    }
    setNodeText(badge, targetText);
  }

  let _lastLegendMode = null;
  function updateLegendHUD(modeName) {
    if (_lastLegendMode !== modeName) {
      _lastLegendMode = modeName;
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
    }

    updateCameraModeBadge(modeName);

    const modePill = document.getElementById('crossroadsModePill');

    if (['metro', 'bus', 'bike', 'cng', 'car', 'rickshaw', 'walking'].includes(modeName)) {
      if (modePill) {
        if (!_lastHUDVisible) {
          modePill.classList.remove('hidden');
          _lastHUDVisible = true;
        }
        const icon = document.getElementById('crossroadsModePillIcon');
        const title = document.getElementById('crossroadsModePillTitle');
        const sub = document.getElementById('crossroadsModePillSub');
        if (modeName === 'metro') {
          setNodeText(icon, '🚆');
          setNodeText(title, 'MRT Line-6 · Mirpur 10 Station');
          setNodeText(sub, 'High-speed electric viaduct bypassing ground gridlock (Base ৳20 · Max ৳100)');
        } else if (modeName === 'bus') {
          setNodeText(icon, '🚌');
          setNodeText(title, 'হাসান পরিবহন (আজিমপুর - উত্তরা)');
          setNodeText(sub, 'Route: আজিমপুর ⇄ উত্তরা · City Transit Bus (Base ৳10 · Student Concession 50%)');
        } else if (modeName === 'rickshaw') {
          setNodeText(icon, '🛺');
          setNodeText(title, 'Dhaka Traditional Cycle Rickshaw');
          setNodeText(sub, 'Zero-emission local trips inside Mirpur sectors & lanes (Typical ৳25 – ৳60)');
        } else if (modeName === 'bike') {
          setNodeText(icon, '🏍️');
          setNodeText(title, 'Ride-share Bike');
          setNodeText(sub, 'Fast ride-share trips through Dhaka traffic.');
        } else if (modeName === 'cng') {
          setNodeText(icon, '🛺');
          setNodeText(title, 'CNG Auto-rickshaw');
          setNodeText(sub, 'Motorized three-wheeler for comfortable local trips.');
        } else if (modeName === 'car') {
          setNodeText(icon, '🚗');
          const carTitle = (activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.modelTitle) ? activeTargetVehicle.mesh.userData.modelTitle : 'Private Car Fleet';
          setNodeText(title, carTitle);
          setNodeText(sub, 'Executive Sedan & Luxury SUV Fleet (Base ৳50 · ৳20/km)');
        } else if (modeName === 'walking') {
          setNodeText(icon, '🚶');
          const isReady = activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.mesh.visible === true && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.isRiggedMixamo;
          if (!isReady) {
            setNodeText(title, 'Zebra Crosswalk · 360° Orbit');
            setNodeText(sub, 'Pedestrian crosswalk & sidewalk strollers · 0 carbon');
          } else {
            const charId = activeTargetVehicle.charId || (activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.charId);
            const info = CHARACTER_INFO[charId];
            const charName = (info && info.name) || activeTargetVehicle.charName || 'Commuter';
            if (icon && info) setNodeText(icon, info.icon);
            setNodeText(title, `${charName} · 360° Orbit`);
            setNodeText(sub, (info && info.sub) || 'Mixamo 3D Rigged Walking Animation · Click Walking to cycle');
          }
        }
      }
    } else {
      if (modePill && _lastHUDVisible) {
        modePill.classList.add('hidden');
        _lastHUDVisible = false;
      }
    }
  }

  window.crossroadsFocusMode = function(modeName) {
    if (typeof window.setCrossroadsViewMode === 'function' && typeof crossroads3DMode !== 'undefined' && !crossroads3DMode) {
      window.setCrossroadsViewMode(true);
    }
    if (typeof deferredModeFlusher === 'function' && modeName && modeName !== 'overview') {
      deferredModeFlusher(modeName);
    }

    if (activeCamMode === modeName && modeName !== 'overview') {
      if (modeName === 'walking') {
        const candidate = acquireTargetWalker(null, true);
        if (candidate && candidate.mesh && candidate.mesh.visible === true && candidate.mesh.userData && candidate.mesh.userData.isRiggedMixamo) {
          activeTargetVehicle = candidate;
          updateLegendHUD('walking');
          updateTrackedVehicleHUD(activeTargetVehicle, true);
          const pose = getVehicleOrbitPose(activeTargetVehicle);
          if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
            focusCamera(pose.position, pose.look, 0.8);
          }
          return;
        }
      }
      if (modeName === 'bike') {
        // Repeated clicks on Ride-share Bike cycle across motorcycle fleet models & colorways
        activeTargetVehicle = acquireTargetVehicle('bike', activeTargetVehicle ? activeTargetVehicle.id : null);
        if (activeTargetVehicle && activeTargetVehicle.data) {
          updateLegendHUD('bike');
          updateTrackedVehicleHUD(activeTargetVehicle, true);
          const pose = getVehicleOrbitPose(activeTargetVehicle);
          if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
            focusCamera(pose.position, pose.look, 0.8);
          }
          return;
        }
      }
      if (modeName === 'car') {
        // Repeated clicks on Car cycle across the 4 car models & 16 colorways
        activeTargetVehicle = acquireTargetVehicle('car', activeTargetVehicle ? activeTargetVehicle.id : null);
        if (activeTargetVehicle && activeTargetVehicle.data) {
          if (activeTargetVehicle.mesh && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.isCar) {
            swapCarVariant(activeTargetVehicle.mesh);
          }
          updateLegendHUD('car');
          updateTrackedVehicleHUD(activeTargetVehicle, true);
          const pose = getVehicleOrbitPose(activeTargetVehicle);
          if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
            focusCamera(pose.position, pose.look, 0.8);
          }
          return;
        }
      }
      clearTrackedVehicle();
      return;
    }

    const targetMode = CAM_MODES[modeName] ? modeName : 'overview';
    activeCamMode = targetMode;
    vehicleOrbitYaw = DEFAULT_VEHICLE_YAW;
    vehicleOrbitPitch = 0.28;

    if (targetMode === 'walking') {
      activeTargetVehicle = acquireTargetWalker(null, true);
    } else if (targetMode !== 'overview') {
      activeTargetVehicle = acquireTargetVehicle(targetMode);
    } else {
      activeTargetVehicle = null;
    }
    if (canvasEl) {
      canvasEl.style.touchAction = isOrbitableVehicleMode(targetMode) ? 'none' : 'auto';
    }

    if (activeTargetVehicle && activeTargetVehicle.data) {
      updateTrackedVehicleHUD(activeTargetVehicle, true);
      const pose = getVehicleOrbitPose(activeTargetVehicle);
      if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
        // Smoothly glide camera to target vehicle/walker without sudden snapping
        focusCamera(pose.position, pose.look, 0.8);
      }
    } else {
      if (CAM_MODES[targetMode]) {
        focusCamera(CAM_MODES[targetMode].pos, CAM_MODES[targetMode].look, 1.2);
      }
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

    // Model 3: Range Rover Luxury SUV (4 Two-Tone Matte Lower / Gloss Black Upper Variants)
    {
      id: 'RR_1',
      modelKey: 'RANGE_ROVER',
      modelTitle: 'Range Rover SUV (Matte White & Gloss Black)',
      carType: 'range_rover',
      bodyColor: 0xf8fafc,
      metalness: 0.10,
      roughness: 0.85,
      roofColor: 0x0f172a,
      contrastRoof: true,
      headlightColor: 0xffffff,
      length: 5.0,
      width: 2.0,
      height: 1.8,
      wheelRadius: 0.42
    },
    {
      id: 'RR_2',
      modelKey: 'RANGE_ROVER',
      modelTitle: 'Range Rover SUV (Matte Gray & Gloss Black)',
      carType: 'range_rover',
      bodyColor: 0x64748b,
      metalness: 0.10,
      roughness: 0.85,
      roofColor: 0x0f172a,
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
      modelTitle: 'Range Rover SUV (Matte Black & Gloss Black)',
      carType: 'range_rover',
      bodyColor: 0x111317,
      metalness: 0.10,
      roughness: 0.90,
      roofColor: 0x0f172a,
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
      modelTitle: 'Range Rover SUV (Matte Blue & Gloss Black)',
      carType: 'range_rover',
      bodyColor: 0x1e3a8a,
      metalness: 0.10,
      roughness: 0.85,
      roofColor: 0x0f172a,
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
    // 0. Soft Warm Cabin Dome Fixture (Self-lit fixture, zero PointLight overhead)
    // -----------------------------------------------------------
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

    // Helper: Connect two 3D points with an oriented, seamless cylinder
    function createConnectingCylinder(p1, p2, radius1, radius2, material) {
      const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
      const v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
      const distance = v1.distanceTo(v2);
      const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radius2, radius1, distance, 14),
        material
      );
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
      cylinder.position.copy(mid);
      cylinder.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3().subVectors(v2, v1).normalize()
      );
      return cylinder;
    }

    // 4. Seated Human Driver - Smooth Contoured Torso & Clavicle Yoke (Rickshaw/CNG Anatomy)
    // Main Contoured Ribcage & Abdomen (Tapered elliptical cylinder: broader chest, tapered waist)
    const mainTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.125, 0.32, 24),
      outfitMat
    );
    mainTorso.scale.set(0.72, 1.0, 1.18); // Depth X: 0.21, Height Y: 0.32, Width Z: 0.34
    mainTorso.position.set(torsoX, torsoY, driverZ);
    driverGroup.add(mainTorso);

    // Rounded Shoulder-Yoke Clavicle Ellipsoid (Capping the top of torso with smooth contour)
    const yokeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.155, 20, 16),
      outfitMat
    );
    yokeMesh.scale.set(0.70, 0.45, 1.20);
    yokeMesh.position.set(torsoX, torsoY + 0.13, driverZ);
    driverGroup.add(yokeMesh);

    // Fitted Collar & Centered Neck Column
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.08, 16), skinMat);
    neck.position.set(torsoX + 0.02, torsoY + 0.19, driverZ);
    driverGroup.add(neck);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20), collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(torsoX + 0.02, torsoY + 0.17, driverZ);
    driverGroup.add(collar);

    // Outfit Accessories & Front Detailing (Contoured to curved chest)
    if (carType === 'mercedes_amg') {
      // Crisp white shirt chest piece
      const shirtInlay = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.16, 0.075), shirtMat);
      shirtInlay.position.set(torsoX + 0.106, torsoY + 0.07, driverZ);
      driverGroup.add(shirtInlay);

      // Crimson necktie
      const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.024), tieMat);
      tieKnot.position.set(torsoX + 0.112, torsoY + 0.135, driverZ);
      driverGroup.add(tieKnot);

      const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.022), tieMat);
      tieBody.position.set(torsoX + 0.110, torsoY + 0.065, driverZ);
      driverGroup.add(tieBody);

      // Silver tie clip
      const tieClip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.005, 0.026), accentMat);
      tieClip.position.set(torsoX + 0.113, torsoY + 0.080, driverZ);
      driverGroup.add(tieClip);

      // Contoured suit lapels angled with chest curvature
      const lLapel = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.038), outfitMat);
      lLapel.position.set(torsoX + 0.108, torsoY + 0.07, driverZ + 0.046);
      lLapel.rotation.y = -0.18;
      driverGroup.add(lLapel);

      const rLapel = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.16, 0.038), outfitMat);
      rLapel.position.set(torsoX + 0.108, torsoY + 0.07, driverZ - 0.046);
      rLapel.rotation.y = 0.18;
      driverGroup.add(rLapel);
    } else if (carType === 'honda_sedan') {
      // Casual polo placket & collarbone opening
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.13, 0.030), shirtMat);
      placket.position.set(torsoX + 0.106, torsoY + 0.08, driverZ);
      driverGroup.add(placket);

      [0.11, 0.07].forEach(yOff => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6), accentMat);
        btn.rotation.z = Math.PI / 2;
        btn.position.set(torsoX + 0.112, torsoY + yOff, driverZ);
        driverGroup.add(btn);
      });

      const vSkin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.04), skinMat);
      vSkin.position.set(torsoX + 0.104, torsoY + 0.145, driverZ);
      driverGroup.add(vSkin);
    } else if (carType === 'range_rover') {
      // Formal white shirt inlay
      const shirtInlay = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.08), shirtMat);
      shirtInlay.position.set(torsoX + 0.106, torsoY + 0.07, driverZ);
      driverGroup.add(shirtInlay);

      // Black formal tie
      const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 0.024), tieMat);
      tieKnot.position.set(torsoX + 0.112, torsoY + 0.135, driverZ);
      driverGroup.add(tieKnot);

      const tieBody = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.12, 0.022), tieMat);
      tieBody.position.set(torsoX + 0.110, torsoY + 0.065, driverZ);
      driverGroup.add(tieBody);

      // Gold lapel accent piping
      const lGold = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.13, 0.008), accentMat);
      lGold.position.set(torsoX + 0.110, torsoY + 0.08, driverZ + 0.040);
      driverGroup.add(lGold);

      const rGold = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.13, 0.008), accentMat);
      rGold.position.set(torsoX + 0.110, torsoY + 0.08, driverZ - 0.040);
      driverGroup.add(rGold);

      // Gold lapel pin / crest
      const goldPin = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 8), accentMat);
      goldPin.rotation.z = Math.PI / 2;
      goldPin.position.set(torsoX + 0.111, torsoY + 0.12, driverZ + 0.062);
      driverGroup.add(goldPin);
    } else {
      // Land Cruiser Safari button placket
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.14, 0.034), shirtMat);
      placket.position.set(torsoX + 0.106, torsoY + 0.08, driverZ);
      driverGroup.add(placket);

      [0.12, 0.08, 0.04].forEach(yOff => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 6), accentMat);
        btn.rotation.z = Math.PI / 2;
        btn.position.set(torsoX + 0.112, torsoY + yOff, driverZ);
        driverGroup.add(btn);
      });

      // Dual chest utility pocket flaps
      const lPocket = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.055), shirtMat);
      lPocket.position.set(torsoX + 0.108, torsoY + 0.07, driverZ + 0.068);
      driverGroup.add(lPocket);

      const rPocket = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.024, 0.055), shirtMat);
      rPocket.position.set(torsoX + 0.108, torsoY + 0.07, driverZ - 0.068);
      driverGroup.add(rPocket);
    }

    // 5. Head & Procedural Facial Features (Rickshaw/CNG Head Architecture)
    const headGroup = new THREE.Group();
    headGroup.position.set(headX, headY, driverZ);
    driverGroup.add(headGroup);

    // Anatomical Cranium (Proportioned after Rickshaw Puller buildRealisticAdultHead)
    const craniumGeo = new THREE.SphereGeometry(0.090, 24, 20);
    craniumGeo.scale(0.85, 1.08, 0.90);
    const head = new THREE.Mesh(craniumGeo, skinMat);
    headGroup.add(head);

    // Full Sculpted Hair Dome (Exact Rickshaw Puller & CNG Driver buildRealisticAdultHead pipeline)
    const hairGeo = new THREE.SphereGeometry(0.093, 24, 20);
    hairGeo.scale(0.87, 1.10, 0.92);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(-0.010, 0.010, 0);
    headGroup.add(hair);

    // Hair Style Detail for Honda Civic Driver (Textured Fringe lifted above forehead)
    if (carType === 'honda_sedan') {
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.016, 0.065), hairMat);
      fringe.position.set(0.048, 0.062, 0);
      fringe.rotation.z = -0.15;
      headGroup.add(fringe);
    }

    // Prominently Visible Anatomical Ears (Matching Rickshaw Puller formula)
    [-0.086, 0.086].forEach(ez => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), skinMat);
      ear.scale.set(0.38, 0.82, 0.55);
      ear.position.set(-0.006, -0.004, ez);
      ear.rotation.y = ez > 0 ? 0.30 : -0.30; // Flared outward naturally for clear visibility
      headGroup.add(ear);
    });

    // High-Visibility Eyes & Eyebrows using MeshBasicMaterial (Coordinates Frozen)
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

    // Protruding Nasal Bridge & Tip (Coordinates Frozen)
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

    // Mustache on Upper Lip Line (Coordinates Frozen)
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.034), beardMat);
    mustache.position.set(0.088, -0.034, 0);
    headGroup.add(mustache);

    // Dark-Pink / Brown Lip Line (Coordinates Frozen)
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.007, 0.026), lipMat);
    lips.position.set(0.084, -0.048, 0);
    headGroup.add(lips);

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

    // 6. Embedded Spherical Shoulder Joints + Two-Segment Articulated Arms (Matching Rickshaw/CNG Pipeline)
    [-1, 1].forEach(side => {
      const shoulderPt = [torsoX + 0.02, torsoY + 0.12, driverZ + side * 0.155];
      const elbowPt = [torsoX + 0.02 + (wheelX - torsoX - 0.02) * 0.48, torsoY - 0.03, driverZ + side * 0.165];
      const handPt = [wheelX, wheelY + 0.05, driverZ + side * 0.075];

      // Deltoid Shoulder Joint Cap (Embedded inside torso yoke - zero air gaps)
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 12), outfitMat);
      shoulderCap.position.set(...shoulderPt);
      driverGroup.add(shoulderCap);

      // Upper Arm Cylinder (Continuous from inside shoulder cap to elbow sphere)
      driverGroup.add(createConnectingCylinder(shoulderPt, elbowPt, 0.036, 0.030, outfitMat));

      // Rounded Elbow Joint Sphere
      const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), outfitMat);
      elbowCap.position.set(...elbowPt);
      driverGroup.add(elbowCap);

      // Forearm Cylinder (Continuous from inside elbow sphere to gripping hand)
      driverGroup.add(createConnectingCylinder(elbowPt, handPt, 0.028, 0.022, outfitMat));

      // Sculpted Gripping Hand on Steering Wheel
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skinMat);
      hand.position.set(...handPt);
      driverGroup.add(hand);
    });

    freezeStatic(driverGroup);
    return driverGroup;
  }

  const buildMercedesDriver = () => buildCarDriver('mercedes_amg');

  // -------------------------------------------------------------
  // Authentic Bangladesh / Dhaka Metro Retroreflective Number Plate
  // High-contrast white face, green security stripe & embossed Bengali registration codes
  // -------------------------------------------------------------
  function createDhakaNumberPlate(isRear = false) {
    const plateGroup = new THREE.Group();
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.80, metalness: 0.20 });
    const whiteFaceMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const greenHeaderMat = new THREE.MeshBasicMaterial({ color: 0x15803d });
    const textMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    // 1. Black mounting bracket
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.118, 0.40), bracketMat);
    plateGroup.add(bracket);

    // 2. High-contrast reflective white plate face
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.096, 0.38), whiteFaceMat);
    face.position.x = isRear ? -0.008 : 0.008;
    plateGroup.add(face);

    // 3. Bangladesh national green header stripe
    const greenStripe = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.020, 0.36), greenHeaderMat);
    greenStripe.position.set(isRear ? -0.010 : 0.010, 0.030, 0);
    plateGroup.add(greenStripe);

    // 4. Embossed dark registration code blocks (ঢাকা মেট্রো-গ ১২-৩৪৫৬)
    // Top line 'ঢাকা মেট্রো'
    [-0.08, 0.08].forEach(tz => {
      const topText = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.12), textMat);
      topText.position.set(isRear ? -0.011 : 0.011, 0.030, tz);
      plateGroup.add(topText);
    });

    // Bottom line: vehicle class code & 6 registration digits
    const classCode = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.026, 0.045), textMat);
    classCode.position.set(isRear ? -0.011 : 0.011, -0.014, -0.12);
    plateGroup.add(classCode);

    const seriesCode = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.026, 0.065), textMat);
    seriesCode.position.set(isRear ? -0.011 : 0.011, -0.014, -0.05);
    plateGroup.add(seriesCode);

    const hyphen = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.008, 0.020), textMat);
    hyphen.position.set(isRear ? -0.011 : 0.011, -0.014, 0.005);
    plateGroup.add(hyphen);

    const regDigits = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.026, 0.110), textMat);
    regDigits.position.set(isRear ? -0.011 : 0.011, -0.014, 0.085);
    plateGroup.add(regDigits);

    if (isRear) {
      // License plate illumination lamp housing above
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.012, 0.10),
        new THREE.MeshBasicMaterial({ color: 0xffedd5 })
      );
      lamp.position.set(-0.012, 0.062, 0);
      plateGroup.add(lamp);
    }

    return plateGroup;
  }

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

    // Front Lower Center Number Plate (Dhaka Metro)
    const frontPlate = createDhakaNumberPlate(false);
    frontPlate.position.set(2.21, 0.28, 0);
    group.add(frontPlate);

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
    // 7. Rear Decklid, Sleek AMG GT Horizontal Taillights, Diffuser & Quad Exhausts
    // -----------------------------------------------------------------
    // High-Mounted 3rd Center LED Brake Light on Ducktail Lip (CHMSL)
    const chmsl = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.020, 0.46),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    chmsl.position.set(-2.20, 0.765, 0);
    group.add(chmsl);

    // Left & Right AMG GT Characteristic Horizontal LED Taillight Clusters
    [-0.54, 0.54].forEach(tz => {
      const isLeft = tz > 0;
      const tlGroup = new THREE.Group();
      // Positioned proudly on the rear shoulder transom, angled around rear corner haunches
      tlGroup.position.set(-2.22, 0.68, tz);
      tlGroup.rotation.y = isLeft ? -0.07 : 0.07;

      // A. Dark Smoked Gloss Housing
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.082, 0.58),
        darkChassisMat
      );
      tlGroup.add(housing);

      // B. Main Vivid Red Neon LED Running Light Bar (Emissive / MeshBasic)
      const redBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.046, 0.54),
        new THREE.MeshBasicMaterial({ color: 0xff1744 })
      );
      redBar.position.set(-0.015, 0, 0);
      tlGroup.add(redBar);

      // C. High-Intensity Bright Inner Optic Core Line
      const opticCore = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.018, 0.50),
        new THREE.MeshBasicMaterial({ color: 0xff6b81 })
      );
      opticCore.position.set(-0.022, 0, 0);
      tlGroup.add(opticCore);

      // D. High-Gloss Smoked Outer Protective Lens
      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.070, 0.56),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.05,
          metalness: 0.90,
          transparent: true,
          opacity: 0.45
        })
      );
      lens.position.set(-0.028, 0, 0);
      tlGroup.add(lens);

      // E. Lower Crystal Reverse / Turn Signal Segment
      const reverseStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.012, 0.42),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      reverseStrip.position.set(-0.018, -0.024, 0);
      tlGroup.add(reverseStrip);

      group.add(tlGroup);
    });

    // Slim Center Gloss-Black Connecting Bar across Trunk Lid
    const centerBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.036, 0.48), darkChassisMat);
    centerBar.position.set(-2.21, 0.68, 0);
    group.add(centerBar);

    // Crisp 3D Mercedes Three-Pointed Star Center Trunk Emblem
    const rearBadgeGroup = new THREE.Group();
    rearBadgeGroup.position.set(-2.235, 0.68, 0);

    const rearStarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.038, 0.006, 8, 24),
      chromeMat
    );
    rearStarRing.rotation.y = Math.PI / 2;
    rearBadgeGroup.add(rearStarRing);

    const rearStarAngles = [Math.PI / 2, Math.PI / 2 - (2 * Math.PI / 3), Math.PI / 2 + (2 * Math.PI / 3)];
    rearStarAngles.forEach(ang => {
      const armLen = 0.032;
      const armGeo = new THREE.ConeGeometry(0.006, armLen, 4);
      const arm = new THREE.Mesh(armGeo, chromeMat);
      arm.position.set(
        -0.004,
        Math.sin(ang) * (armLen * 0.48),
        -Math.cos(ang) * (armLen * 0.48)
      );
      arm.rotation.x = -ang + Math.PI / 2;
      arm.rotation.y = Math.PI / 4;
      rearBadgeGroup.add(arm);
    });
    group.add(rearBadgeGroup);

    // Rear Lower Center Number Plate (Dhaka Metro)
    const rearPlate = createDhakaNumberPlate(true);
    rearPlate.position.set(-2.255, 0.46, 0);
    group.add(rearPlate);

    // Lower Rear Diffuser with Vertical Aero Fins & Quad Exhaust Tips
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 1.76), darkChassisMat);
    diffuser.position.set(-2.16, 0.22, 0);
    group.add(diffuser);

    [-0.30, 0, 0.30].forEach(fx => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.025), darkChassisMat);
      fin.position.set(-2.18, 0.18, fx);
      group.add(fin);
    });

    [-0.68, -0.54, 0.54, 0.68].forEach(ez => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.18, 12), chromeMat);
      tip.rotation.z = Math.PI / 2;
      tip.position.set(-2.26, 0.23, ez);
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

    // Front Lower Center Number Plate (Dhaka Metro)
    const frontPlate = createDhakaNumberPlate(false);
    frontPlate.position.set(2.305, 0.36, 0);
    group.add(frontPlate);

    // -----------------------------------------------------------------
    // 7. Rear Connected Full-Width LED Taillights, Ducktail CHMSL & Bumper Assembly
    // -----------------------------------------------------------------
    // High-Mounted 3rd Brake Light (CHMSL) on Rear Window Base
    const chmsl = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.016, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    chmsl.position.set(-1.78, 0.845, 0);
    group.add(chmsl);

    // Full-Width Connected LED Taillight Bar Across Trunk
    const centerHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.048, 1.06),
      darkTrimMat
    );
    centerHousing.position.set(-2.285, 0.775, 0);
    group.add(centerHousing);

    const centerBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.032, 1.04),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    centerBar.position.set(-2.295, 0.775, 0);
    group.add(centerBar);

    // Left & Right Outer Taillight Clusters (Angled around rear haunches)
    [-0.62, 0.62].forEach(tz => {
      const isLeft = tz > 0;
      const tlGroup = new THREE.Group();
      tlGroup.position.set(-2.295, 0.775, tz);
      tlGroup.rotation.y = isLeft ? -0.05 : 0.05;

      // Dark gloss housing
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.088, 0.32),
        darkTrimMat
      );
      tlGroup.add(housing);

      // Main red LED running light
      const redLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.052, 0.30),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      redLight.position.set(-0.015, 0, 0);
      tlGroup.add(redLight);

      // Bright inner optic core
      const opticCore = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.020, 0.28),
        new THREE.MeshBasicMaterial({ color: 0xff6b81 })
      );
      opticCore.position.set(-0.022, 0, 0);
      tlGroup.add(opticCore);

      // Lower white reverse / crystal lens
      const revLens = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.018, 0.24),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      revLens.position.set(-0.018, -0.024, 0);
      tlGroup.add(revLens);

      // High-gloss outer protective lens
      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.076, 0.31),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.05,
          metalness: 0.90,
          transparent: true,
          opacity: 0.45
        })
      );
      lens.position.set(-0.028, 0, 0);
      tlGroup.add(lens);

      group.add(tlGroup);
    });

    // Center Chrome Honda 'H' Trunk Emblem
    const rearHBadge = new THREE.Group();
    rearHBadge.position.set(-2.315, 0.775, 0);
    const rearHFrame = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.065, 0.075), chromeMat);
    rearHBadge.add(rearHFrame);
    const rearHBar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.045), chromeMat);
    rearHBadge.add(rearHBar);
    group.add(rearHBadge);

    // Rear Lower Center Number Plate (Dhaka Metro)
    const rearPlate = createDhakaNumberPlate(true);
    rearPlate.position.set(-2.355, 0.48, 0);
    group.add(rearPlate);

    // Rear Bumper Lower Red Reflectors
    [-0.62, 0.62].forEach(rz => {
      const reflector = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.022, 0.20),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      reflector.position.set(-2.310, 0.38, rz);
      group.add(reflector);
    });

    // Rear Dual Exhaust Cutouts in Lower Bumper
    [-0.60, 0.60].forEach(ez => {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.16), chromeMat);
      tip.position.set(-2.32, 0.28, ez);
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

    // Dedicated Upper Gloss Black Material (Roof, pillars, upper window framing, mirrors, rear tailgate trim)
    const upperGlossBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.10,
      metalness: 0.90
    });

    // Lower Matte Body Panels (Doors, front fenders, hood sides, rear quarter panels)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: config.bodyColor,
      metalness: config.metalness !== undefined ? config.metalness : 0.10,
      roughness: config.roughness !== undefined ? config.roughness : 0.85
    });
    const roofMat = upperGlossBlackMat;
    const blackTrimMat = upperGlossBlackMat;
    const darkTrimMat = upperGlossBlackMat;
    const darkChassisMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.40, metalness: 0.50 });
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

    // Floating Roof Cap (Always Dark Glossy Black)
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.05, 1.72), upperGlossBlackMat);
    roofCap.position.set(-0.98, 1.685, 0);
    group.add(roofCap);

    // Dark Glossy Black A, B, C, D Pillars (Terminating flush under roof cap)
    [-0.84, 0.84].forEach(pz => {
      // Slanted A-Pillar
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.04), upperGlossBlackMat);
      aPillar.rotation.z = -0.74;
      aPillar.position.set(0.65, 1.38, pz);
      group.add(aPillar);

      // Vertical B-Pillar
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.04), upperGlossBlackMat);
      bPillar.position.set(-0.15, 1.37, pz);
      group.add(bPillar);

      // C-Pillar
      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.04), upperGlossBlackMat);
      cPillar.position.set(-1.25, 1.37, pz);
      group.add(cPillar);

      // Upright D-Pillar (At rear corner edge)
      const dPillar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.56, 0.04), upperGlossBlackMat);
      dPillar.position.set(-2.38, 1.37, pz);
      group.add(dPillar);
    });

    // Upper Window-Line Beltline Trim (Mirror Level Upward, Dark Gloss Black)
    [-0.85, 0.85].forEach(wz => {
      const beltlineTrim = new THREE.Mesh(
        new THREE.BoxGeometry(3.32, 0.025, 0.03),
        upperGlossBlackMat
      );
      beltlineTrim.position.set(-0.76, 1.08, wz);
      group.add(beltlineTrim);
    });

    // 3. Compact Door-Mounted Side Mirrors (Gloss Black Stalk + Pod + Silver Mirror Face)
    [-0.88, 0.88].forEach(mz => {
      const isLeft = mz > 0;
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), upperGlossBlackMat);
      stalk.position.set(0.80, 1.12, mz * 0.94);
      group.add(stalk);

      const mirrorPod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), upperGlossBlackMat);
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

    // Front Lower Center Number Plate (Dhaka Metro)
    const frontPlate = createDhakaNumberPlate(false);
    frontPlate.position.set(2.545, 0.54, 0);
    group.add(frontPlate);

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
    const tailgateBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 1.68), upperGlossBlackMat);
    tailgateBar.position.set(-2.435, 1.60, 0);
    group.add(tailgateBar);

    // Rear Lower Center Number Plate (Dhaka Metro)
    const rearPlate = createDhakaNumberPlate(true);
    rearPlate.position.set(-2.525, 0.56, 0);
    group.add(rearPlate);

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

  // Alias for Range Rover builder
  const buildRangeRover = buildCarRangeRover;
  if (typeof window !== 'undefined') {
    window.buildRangeRover = buildCarRangeRover;
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

    // Front Lower Center Number Plate (Dhaka Metro)
    const frontPlate = createDhakaNumberPlate(false);
    frontPlate.position.set(2.510, 0.54, 0);
    group.add(frontPlate);

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

    // Rear Lower Center Number Plate (Dhaka Metro)
    const rearPlate = createDhakaNumberPlate(true);
    rearPlate.position.set(-2.485, 0.58, 0);
    group.add(rearPlate);

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
  // Master Car Package & Procedural 3D Car Factory (Cached + Pooled Wheels)
  // -------------------------------------------------------------
  const carVariantTemplateCache = {};

  function buildCarPackage(config, variantIndex, reuseWheelSlots) {
    const cacheKey = `${config.carType}|${variantIndex}`;
    let tmpl = carVariantTemplateCache[cacheKey];

    if (!tmpl) {
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
      const rawWheels = carModelGroup.userData.wheels || [];
      const wheelRadius = config.wheelRadius || 0.35;
      const wheelPoses = rawWheels.map(w => ({
        position: w.position.clone(),
        rotation: w.rotation.clone(),
        scale: w.scale.clone()
      }));
      const wTmplObj = rawWheels[0] ? rawWheels[0].clone(true) : null;
      if (wTmplObj) getSharedWheelTemplate('carWheel', wTmplObj);
      rawWheels.forEach(w => { if (w.parent) w.parent.remove(w); });
      optimizeStaticSubtree(carModelGroup, { packTextures: true });
      const cachedMeshes = [];
      carModelGroup.traverse(c => { if (c.isMesh) cachedMeshes.push(c); });
      tmpl = { meshes: cachedMeshes, wheelPoses: wheelPoses, wheelRadius: wheelRadius, wheelTmplObj: wTmplObj };
      carVariantTemplateCache[cacheKey] = tmpl;
    }

    const carPackage = new THREE.Group();
    const carModelWrapper = new THREE.Group();
    carModelWrapper.scale.setScalar(0.75);
    carModelWrapper.position.set(0, 0, 0);
    tmpl.meshes.forEach(m => {
      const cloneM = new THREE.Mesh(m.geometry, m.material);
      cloneM.castShadow = false; cloneM.receiveShadow = false;
      carModelWrapper.add(cloneM);
    });

    carPackage.add(carModelWrapper);
    const carWheels = attachWheelsFromTemplate(carModelWrapper, tmpl.wheelPoses, 'carWheel', tmpl.wheelTmplObj);
    carPackage.userData.wheels = carWheels;
    carPackage.userData.wheelRadius = tmpl.wheelRadius * 0.75;
    return carPackage;
  }

  let globalNextCarDeckIndex = 0;

  function createProcedural3DCar(seed, vData) {
    const rootMesh = new THREE.Group();
    rootMesh.userData.isCar = true;

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
    rootMesh.userData.pooledWheelSlots = carPackage.userData.pooledWheelSlots || [];
    rootMesh.userData.wheelRadius = (config.wheelRadius || 0.35) * 10 * 0.75;
    rootMesh.userData.currentVariantIndex = variantIndex;
    rootMesh.userData.modelKey = config.modelKey;
    rootMesh.userData.modelTitle = config.modelTitle;

    // Pooled additive headlight ground pool (all cars + bikes share 1 draw call)
    rootMesh.userData.headGlow = registerHeadlightGlow(rootMesh, ((config.length / 2) + 0.8) * 0.75, 0.02, 0, 3.4 * 0.75, 2.2 * 0.75);

    rootMesh.scale.set(10, 10, 10);
    return rootMesh;
  }

  function createAerodynamicCar(archetypeIdx) {
    return createProcedural3DCar(archetypeIdx, { variantIndex: archetypeIdx });
  }

  // Dynamic Car Variant Swapper on Wrap-Around / Respawn (Zero geometry dispose/re-alloc!)
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

    if (rootMesh.userData.carPackage) {
      rootMesh.remove(rootMesh.userData.carPackage);
    }

    const newCarPackage = buildCarPackage(config, newIndex, rootMesh.userData.pooledWheelSlots);
    rootMesh.add(newCarPackage);
    rootMesh.userData.carPackage = newCarPackage;
    rootMesh.userData.wheels = newCarPackage.userData.wheels || [];
    rootMesh.userData.pooledWheelSlots = newCarPackage.userData.pooledWheelSlots || rootMesh.userData.pooledWheelSlots;
    rootMesh.userData.wheelRadius = (config.wheelRadius || 0.35) * 10 * 0.75;
    rootMesh.userData.modelKey = config.modelKey;
    rootMesh.userData.modelTitle = config.modelTitle;
    rootMesh.userData.currentVariantIndex = newIndex;

    if (rootMesh.userData.headGlow) {
      rootMesh.userData.headGlow.position.x = ((config.length / 2) + 0.8) * 0.75;
    }

    if (activeTargetVehicle && activeTargetVehicle.mesh === rootMesh) {
      updateTrackedVehicleHUD(activeTargetVehicle, true);
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

  // ===========================================================================
  // 100% PURE THREE.JS PROCEDURAL CITY TRANSIT BUS ("হাসান" | "আজিমপুর - উত্তরা")
  // Two-Tone Red & White Low-Floor Coach, Rooftop HVAC, Divided Windshield,
  // Triple Round Headlights, Bangla Destination LED Sign, Bi-Fold Door & Driver
  // ===========================================================================
  let cachedHasanLedTexture = null;
  function getHasanLedDestinationTexture() {
    if (cachedHasanLedTexture) return cachedHasanLedTexture;
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fbbf24';
    ctx.font = "bold 56px 'Noto Sans Bengali', 'Hind Siliguri', 'Segoe UI', sans-serif";
    ctx.fillText('হাসান পরিবহন', canvas.width / 2, 72);

    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 16;
    ctx.font = "900 104px 'Noto Sans Bengali', 'Hind Siliguri', 'Segoe UI', sans-serif";
    ctx.fillText('আজিমপুর - উত্তরা', canvas.width / 2, 168);

    cachedHasanLedTexture = new THREE.CanvasTexture(canvas);
    setupCrispCanvasTexture(cachedHasanLedTexture);
    return cachedHasanLedTexture;
  }

  let cachedHasanSideTextureLeft = null;
  let cachedHasanSideTextureRight = null;
  function getHasanSideBrandingTexture(isRightSide = false) {
    if (isRightSide && cachedHasanSideTextureRight) return cachedHasanSideTextureRight;
    if (!isRightSide && cachedHasanSideTextureLeft) return cachedHasanSideTextureLeft;
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Subtle dark drop-shadow stroke behind the letters for razor-sharp legibility on mobile
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    ctx.font = "900 128px 'Noto Sans Bengali', 'Hind Siliguri', 'Segoe UI', sans-serif";
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('হাসান   |   আজিমপুর - উত্তরা', canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('হাসান   |   আজিমপুর - উত্তরা', canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    setupCrispCanvasTexture(tex);
    if (isRightSide) cachedHasanSideTextureRight = tex;
    else cachedHasanSideTextureLeft = tex;
    return tex;
  }

  let cachedHasanRearTexture = null;
  function getHasanRearBrandingTexture() {
    if (cachedHasanRearTexture) return cachedHasanRearTexture;
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    ctx.font = "900 128px 'Noto Sans Bengali', 'Hind Siliguri', 'Segoe UI', sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.fillText('হাসান', canvas.width / 2, 140);

    ctx.font = "bold 88px 'Noto Sans Bengali', 'Hind Siliguri', 'Segoe UI', sans-serif";
    ctx.fillText('আজিমপুর - উত্তরা', canvas.width / 2, 280);

    ctx.font = "bold 64px 'Segoe UI', sans-serif";
    ctx.fillStyle = '#facc15';
    ctx.fillText('CITY TRANSIT · ROUTE 12', canvas.width / 2, 400);

    cachedHasanRearTexture = new THREE.CanvasTexture(canvas);
    setupCrispCanvasTexture(cachedHasanRearTexture);
    return cachedHasanRearTexture;
  }

  function createTransitSteelWheel(radius = 4.2, width = 2.6) {
    const wheelGroup = new THREE.Group();

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e21, // Charcoal-black heavy-duty rubber
      roughness: 0.90,
      metalness: 0.10
    });
    const steelRimMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Deep-dish metallic silver steel
      metalness: 0.75,
      roughness: 0.30
    });
    const darkHubMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.75,
      metalness: 0.30
    });
    const darkVentMat = new THREE.MeshBasicMaterial({ color: 0x090a0f });

    // Heavy-duty rubber tire
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, width, 24),
      tireMat
    );
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Outer Deep-Dish Metallic Steel Rim
    const rimRadius = radius * 0.62;
    const rimDepth = width + 0.08;
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius, rimRadius, rimDepth, 24),
      steelRimMat
    );
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    // Deep-Dish Inset Center Cap
    const dishCap = new THREE.Mesh(
      new THREE.CylinderGeometry(rimRadius * 0.78, rimRadius * 0.55, rimDepth + 0.04, 20),
      steelRimMat
    );
    dishCap.rotation.x = Math.PI / 2;
    wheelGroup.add(dishCap);

    // Circular ring of dark ventilation slots
    const numHoles = 8;
    for (let i = 0; i < numHoles; i++) {
      const angle = (i / numHoles) * Math.PI * 2;
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, rimDepth + 0.12, 8),
        darkVentMat
      );
      hole.rotation.x = Math.PI / 2;
      hole.position.set(Math.cos(angle) * (rimRadius * 0.68), Math.sin(angle) * (rimRadius * 0.68), 0);
      wheelGroup.add(hole);
    }

    // Heavy-duty black center axle hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, rimDepth + 0.18, 16),
      darkHubMat
    );
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    // Outer wheel nut ring
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, rimDepth + 0.22, 6), nutMat);
      nut.rotation.x = Math.PI / 2;
      nut.position.set(Math.cos(angle) * 1.25, Math.sin(angle) * 1.25, 0);
      wheelGroup.add(nut);
    }

    return wheelGroup;
  }

  function buildHasanBusDriver() {
    const driverGroup = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xc68662, // Warm South Asian skin tone
      emissive: 0x3d2218,
      emissiveIntensity: 0.35,
      roughness: 0.65,
      metalness: 0.05
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.90,
      metalness: 0.10
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Crisp sky blue transit driver shirt
      emissive: 0x02456e,
      emissiveIntensity: 0.30,
      roughness: 0.70,
      metalness: 0.05
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      emissive: 0x01324f,
      emissiveIntensity: 0.25,
      roughness: 0.70
    });
    const darkPantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.80 });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const eyebrowMat = new THREE.MeshBasicMaterial({ color: 0x111317 });
    const mustacheMat = new THREE.MeshBasicMaterial({ color: 0x111317 });
    const lipMat = new THREE.MeshBasicMaterial({ color: 0x9e4747 });

    const driverX = 29.5;
    const driverY = 10.8;
    const driverZ = 5.5;

    // 1. Tapered Anatomical Torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.3, 4.4, 10),
      shirtMat
    );
    torso.scale.set(0.78, 1.0, 1.18);
    torso.position.set(driverX, driverY + 2.0, driverZ);
    driverGroup.add(torso);

    // Clavicle Yoke Ellipsoid
    const yoke = new THREE.Mesh(new THREE.SphereGeometry(1.55, 10, 8), shirtMat);
    yoke.scale.set(0.72, 0.45, 1.20);
    yoke.position.set(driverX, driverY + 3.8, driverZ);
    driverGroup.add(yoke);

    // Neck & Collar
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.48, 0.8, 12), skinMat);
    neck.position.set(driverX + 0.15, driverY + 4.5, driverZ);
    driverGroup.add(neck);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.16, 8, 16), collarMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(driverX + 0.15, driverY + 4.3, driverZ);
    driverGroup.add(collar);

    // Shirt Placket & Buttons
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.35), collarMat);
    placket.position.set(driverX + 1.18, driverY + 2.2, driverZ);
    driverGroup.add(placket);

    // Seated Legs
    [-1, 1].forEach(side => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 3.4, 12), darkPantsMat);
      leg.rotation.z = Math.PI / 2 - 0.2;
      leg.position.set(driverX + 1.8, driverY + 0.2, driverZ + side * 1.0);
      driverGroup.add(leg);
    });

    // 2. Head & Sculpted Hair Dome
    const headGroup = new THREE.Group();
    headGroup.position.set(driverX + 0.2, driverY + 5.5, driverZ);
    driverGroup.add(headGroup);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(1.22, 10, 8), skinMat);
    cranium.scale.set(0.85, 1.08, 0.90);
    headGroup.add(cranium);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), hairMat);
    hair.scale.set(0.87, 1.10, 0.92);
    hair.position.set(-0.10, 0.10, 0);
    headGroup.add(hair);

    // Ears
    [-1, 1].forEach(ez => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), skinMat);
      ear.scale.set(0.38, 0.82, 0.55);
      ear.position.set(-0.06, -0.04, ez * 1.15);
      headGroup.add(ear);
    });

    // Eyes & Eyebrows
    [0.38, -0.38].forEach(ez => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), eyeWhiteMat);
      eyeWhite.position.set(0.98, 0.18, ez);
      headGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyePupilMat);
      pupil.position.set(1.12, 0.18, ez);
      headGroup.add(pupil);

      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.38), eyebrowMat);
      eyebrow.position.set(1.02, 0.42, ez);
      headGroup.add(eyebrow);
    });

    // Nose Bridge & Tip
    const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.48, 6), skinMat);
    noseBridge.rotation.z = -0.22;
    noseBridge.position.set(1.10, -0.06, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), skinMat);
    noseTip.position.set(1.22, -0.22, 0);
    headGroup.add(noseTip);

    // Mustache & Lips
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.46), mustacheMat);
    mustache.position.set(1.15, -0.42, 0);
    headGroup.add(mustache);

    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.36), lipMat);
    lips.position.set(1.10, -0.58, 0);
    headGroup.add(lips);

    // 3. Deltoid Shoulders, Articulated Arms & Hands on Steering Wheel
    const wheelX = driverX + 3.0;
    const wheelY = driverY + 2.8;

    [-1, 1].forEach(side => {
      const shoulderPt = [driverX + 0.2, driverY + 3.8, driverZ + side * 1.6];
      const elbowPt = [driverX + 1.6, driverY + 2.0, driverZ + side * 1.7];
      const handPt = [wheelX, wheelY + 0.4, driverZ + side * 0.9];

      // Shoulder Cap
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), shirtMat);
      shoulder.position.set(...shoulderPt);
      driverGroup.add(shoulder);

      // Upper Arm Cylinder
      const v1 = new THREE.Vector3(...shoulderPt);
      const v2 = new THREE.Vector3(...elbowPt);
      const armLen1 = v1.distanceTo(v2);
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.46, armLen1, 10), shirtMat);
      upperArm.position.copy(v1.clone().add(v2).multiplyScalar(0.5));
      upperArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
      driverGroup.add(upperArm);

      // Elbow Sphere
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), shirtMat);
      elbow.position.set(...elbowPt);
      driverGroup.add(elbow);

      // Forearm Cylinder
      const v3 = new THREE.Vector3(...handPt);
      const armLen2 = v2.distanceTo(v3);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, armLen2, 10), shirtMat);
      forearm.position.copy(v2.clone().add(v3).multiplyScalar(0.5));
      forearm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v3.clone().sub(v2).normalize());
      driverGroup.add(forearm);

      // Sculpted Gripping Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skinMat);
      hand.position.set(...handPt);
      driverGroup.add(hand);
    });

    // 4. Large Tilted Bus Steering Wheel & Column
    const steeringMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.60, metalness: 0.25 });
    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.22, 6, 14), steeringMat);
    wheelRing.position.set(wheelX, wheelY, driverZ);
    wheelRing.rotation.y = Math.PI / 2;
    wheelRing.rotation.x = 0.65;
    driverGroup.add(wheelRing);

    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12), steeringMat);
    hubCap.rotation.z = Math.PI / 2;
    hubCap.rotation.y = 0.65;
    hubCap.position.set(wheelX, wheelY, driverZ);
    driverGroup.add(hubCap);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.8, 10), steeringMat);
    column.rotation.z = -0.72;
    column.position.set(wheelX + 0.8, wheelY - 1.2, driverZ);
    driverGroup.add(column);

    // Soft Warm Glowing Dome Fixture illuminating Driver (Zero PointLight overhead)
    const domeFixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.15, 10),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    domeFixture.position.set(driverX + 1.0, driverY + 7.5, driverZ);
    driverGroup.add(domeFixture);

    freezeStatic(driverGroup);
    return driverGroup;
  }

  // ===========================================================================
  // Dedicated Procedural Seated Female Bus Passenger Builder
  // (Authentic Dhaka Attire: Salwar Kameez, Saree, Draped Dupatta, Hair Bun & Hijab)
  // ===========================================================================
  function buildFemaleBusPassenger(fDataOrColor, dupattaColor, headwearStyle, hijabColor) {
    let fData = {};
    if (typeof fDataOrColor === 'object' && fDataOrColor !== null) {
      fData = Object.assign({}, fDataOrColor);
    } else {
      fData = {
        outfitColor: fDataOrColor || 0xdb2777,
        dupattaColor: dupattaColor || 0xf8fafc,
        headwearStyle: headwearStyle || 'bun',
        hijabColor: hijabColor || null
      };
    }

    const skinColor = fData.skinColor || 0xd69e72;
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      emissive: 0x2e1810,
      emissiveIntensity: 0.28,
      roughness: 0.60,
      metalness: 0.05
    });

    const outfitMat = new THREE.MeshStandardMaterial({
      color: fData.outfitColor,
      emissive: fData.outfitEmissive || 0x3b0764,
      emissiveIntensity: 0.32,
      roughness: 0.50,
      metalness: 0.08
    });

    const dupattaColorVal = fData.dupattaColor || 0xf8fafc;
    const dupattaMat = new THREE.MeshStandardMaterial({
      color: dupattaColorVal,
      emissive: fData.dupattaEmissive || 0x1f2937,
      emissiveIntensity: 0.25,
      roughness: 0.55
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: fData.hairColor || 0x111317,
      roughness: 0.90,
      metalness: 0.10
    });

    const lipColorVal = fData.lipColor || 0xbe185d;
    const lipMat = new THREE.MeshBasicMaterial({ color: lipColorVal });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const eyebrowMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });

    const femaleGroup = new THREE.Group();

    // 1. Contoured Upper Torso & Shoulders
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.20, 1.05, 3.2, 14), outfitMat);
    torso.scale.set(0.82, 1.0, 1.12);
    torso.position.set(0, 1.8, 0);
    femaleGroup.add(torso);

    const yoke = new THREE.Mesh(new THREE.SphereGeometry(1.28, 14, 10), outfitMat);
    yoke.scale.set(0.78, 0.42, 1.15);
    yoke.position.set(0, 3.2, 0);
    femaleGroup.add(yoke);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 0.75, 10), skinMat);
    neck.position.set(0.1, 3.85, 0);
    femaleGroup.add(neck);

    // Draped Dupatta / Orna Sash across Shoulder and Chest
    const dupattaLoop = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.22, 8, 16), dupattaMat);
    dupattaLoop.rotation.x = Math.PI / 2;
    dupattaLoop.position.set(0.08, 3.65, 0);
    femaleGroup.add(dupattaLoop);

    const dupattaSash = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.5, 0.95), dupattaMat);
    dupattaSash.position.set(0.48, 2.4, 0.55);
    femaleGroup.add(dupattaSash);

    // Saree Pallu or Back Drape
    const dupattaBack = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.70), dupattaMat);
    dupattaBack.position.set(-0.45, 2.2, 0.65);
    femaleGroup.add(dupattaBack);

    // Salwar / Saree Seated Legs Assembly (Thighs to Seat Edge + Knees + Shins to Floor + Shoes)
    const shoeMat = new THREE.MeshStandardMaterial({
      color: fData.shoeColor || 0x18181b, // Elegant dark footwear
      roughness: 0.60,
      metalness: 0.15
    });
    const soleMat = new THREE.MeshBasicMaterial({ color: 0x090a0f });

    [-1, 1].forEach(side => {
      const legZ = side * 0.72;

      // Thigh cylinder extending forward from hip to seat front edge (X = 0.1 to 2.15)
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.44, 2.10, 12), outfitMat);
      thigh.rotation.z = Math.PI / 2 - 0.05;
      thigh.position.set(1.10, 0.22, legZ);
      femaleGroup.add(thigh);

      // Rounded Knee Joint at seat bench edge
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 10), outfitMat);
      knee.position.set(2.15, 0.16, legZ);
      femaleGroup.add(knee);

      // Vertical Lower Shin / Salwar Leg descending ~4.8 units down to floor
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.32, 4.76, 12), outfitMat);
      shin.rotation.z = -0.032;
      shin.position.set(2.225, -2.22, legZ);
      femaleGroup.add(shin);

      // Ankle joint cap
      const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.30, 10, 8), outfitMat);
      ankle.position.set(2.30, -4.60, legZ);
      femaleGroup.add(ankle);

      // Styled Shoe / Sandal resting flat on bus floor (Y_floor = -5.10)
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.44, 0.62), shoeMat);
      shoe.position.set(2.72, -4.86, legZ);
      femaleGroup.add(shoe);

      const shoeToe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), shoeMat);
      shoeToe.scale.set(1.1, 0.75, 1.0);
      shoeToe.position.set(3.40, -4.88, legZ);
      femaleGroup.add(shoeToe);

      const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 0.66), soleMat);
      shoeSole.position.set(2.75, -5.06, legZ);
      femaleGroup.add(shoeSole);
    });

    // 2. Head & Clean Female Facial Features
    const headGroup = new THREE.Group();
    headGroup.position.set(0.12, 4.8, 0);
    femaleGroup.add(headGroup);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 8), skinMat);
    cranium.scale.set(0.85, 1.05, 0.90);
    headGroup.add(cranium);

    // Eyes (Emissive basic material for clear visibility through glass)
    [0.30, -0.30].forEach(ez => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 5), eyeWhiteMat);
      eyeWhite.position.set(0.86, 0.16, ez);
      headGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyePupilMat);
      pupil.position.set(0.98, 0.16, ez);
      headGroup.add(pupil);

      // Delicate arched eyebrow
      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.32), eyebrowMat);
      eyebrow.position.set(0.90, 0.36, ez);
      headGroup.add(eyebrow);
    });

    // Petite Nose
    const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.40, 6), skinMat);
    noseBridge.rotation.z = -0.22;
    noseBridge.position.set(0.96, -0.05, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
    noseTip.position.set(1.05, -0.16, 0);
    headGroup.add(noseTip);

    // Soft Rose / Coral Lips (NO MUSTACHE, NO BEARD)
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.30), lipMat);
    lips.position.set(0.96, -0.46, 0);
    headGroup.add(lips);

    // Small Ears
    [-1, 1].forEach(ez => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.30, 8, 6), skinMat);
      ear.scale.set(0.35, 0.75, 0.45);
      ear.position.set(-0.05, -0.04, ez * 1.02);
      headGroup.add(ear);
    });

    // 3. Hair & Headwear Styles (Style A: Bun vs Style B: Hijab)
    const style = fData.headwearStyle || 'bun';
    if (style === 'hijab' || fData.hijabColor) {
      // Style B: Modest Draped Hijab / Headscarf
      // Cleanly frames the warm skin-tone face — ZERO "snowman" overlap!
      const hijabTone = fData.hijabColor || 0xfef3c7;
      const hijabMat = new THREE.MeshStandardMaterial({
        color: hijabTone,
        emissive: fData.outfitEmissive || 0x1e293b,
        emissiveIntensity: 0.20,
        roughness: 0.55
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: fData.dupattaColor || hijabTone,
        roughness: 0.50
      });

      // Back & Crown Outer Hood: shifted backward along -X (x = -0.32)
      // Covers crown, back of head, and sides/ears without overlapping the front face
      const hijabDome = new THREE.Mesh(new THREE.SphereGeometry(1.16, 10, 8), hijabMat);
      hijabDome.scale.set(0.84, 1.08, 0.94);
      hijabDome.position.set(-0.32, 0.06, 0);
      headGroup.add(hijabDome);

      // Oval Face-Framing Hijab Trim (TorusGeometry in Y-Z face plane)
      // Frames the warm skin-tone face across forehead, cheeks, and under chin
      const faceTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.94, 0.13, 6, 12),
        trimMat
      );
      faceTrim.rotation.y = Math.PI / 2;
      faceTrim.scale.set(0.85, 1.06, 0.92);
      faceTrim.position.set(0.46, -0.02, 0);
      headGroup.add(faceTrim);

      // Forehead undercap trim band (adds realistic tailored look)
      const undercap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.90, 0.18, 10),
        trimMat
      );
      undercap.rotation.z = 0.20;
      undercap.position.set(0.48, 0.76, 0);
      undercap.scale.set(0.82, 1.0, 0.90);
      headGroup.add(undercap);

      // Contoured Neck & Shoulder Drape in femaleGroup
      // Cleanly tucked BELOW the chin (y <= 3.80) to maintain crisp jawline shadow
      const hijabCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.80, 1.45, 1.10, 10), hijabMat);
      hijabCowl.position.set(0.05, 3.25, 0);
      femaleGroup.add(hijabCowl);

      const cowlRim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.16, 6, 10), hijabMat);
      cowlRim.rotation.x = Math.PI / 2;
      cowlRim.position.set(0.06, 3.75, 0);
      femaleGroup.add(cowlRim);

      const cowlFront = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.4, 0.95), hijabMat);
      cowlFront.rotation.z = -0.15;
      cowlFront.position.set(0.52, 2.75, 0);
      femaleGroup.add(cowlFront);

    } else {
      // Style A: Traditional Dark Hair Dome with Back Hair Bun
      const fHair = new THREE.Mesh(new THREE.SphereGeometry(1.10, 10, 8), hairMat);
      fHair.scale.set(0.88, 1.08, 0.94);
      fHair.position.set(-0.08, 0.08, 0);
      headGroup.add(fHair);

      // Rounded hair bun at back of head
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.68, 8, 6), hairMat);
      bun.scale.set(0.75, 0.95, 0.95);
      bun.position.set(-1.08, 0.05, 0);
      headGroup.add(bun);

      // Decorative gold hair pin ring around bun
      const hairPin = new THREE.Mesh(
        new THREE.TorusGeometry(0.48, 0.07, 5, 10),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35, metalness: 0.70 })
      );
      hairPin.rotation.y = Math.PI / 2;
      hairPin.position.set(-0.95, 0.05, 0);
      headGroup.add(hairPin);
    }

    // 4. Deltoid Shoulders, Articulated Arms Resting on Lap
    [-1, 1].forEach(side => {
      const shoulderPt = [0.08, 3.2, side * 1.42];
      const elbowPt = [1.05, 1.8, side * 1.32];
      const handPt = [1.60, 0.8, side * 0.50];

      // Shoulder Cap
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 8), outfitMat);
      shoulder.position.set(...shoulderPt);
      femaleGroup.add(shoulder);

      // Upper Arm
      const v1 = new THREE.Vector3(...shoulderPt);
      const v2 = new THREE.Vector3(...elbowPt);
      const armLen1 = v1.distanceTo(v2);
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.38, armLen1, 8), outfitMat);
      upperArm.position.copy(v1.clone().add(v2).multiplyScalar(0.5));
      upperArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
      femaleGroup.add(upperArm);

      // Elbow Sphere
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.30, 10, 8), outfitMat);
      elbow.position.set(...elbowPt);
      femaleGroup.add(elbow);

      // Forearm
      const v3 = new THREE.Vector3(...handPt);
      const armLen2 = v2.distanceTo(v3);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, armLen2, 8), outfitMat);
      forearm.position.copy(v2.clone().add(v3).multiplyScalar(0.5));
      forearm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v3.clone().sub(v2).normalize());
      femaleGroup.add(forearm);

      // Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), skinMat);
      hand.position.set(...handPt);
      femaleGroup.add(hand);
    });

    // 5. Chic Handbag Resting on Lap
    const bagMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Warm leather handbag
      roughness: 0.65,
      metalness: 0.15
    });
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 1.8), bagMat);
    bag.position.set(1.5, 0.9, 0);
    femaleGroup.add(bag);

    const bagBuckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.35, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 })
    );
    bagBuckle.position.set(1.96, 0.9, 0);
    femaleGroup.add(bagBuckle);

    femaleGroup.traverse(child => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });
    return femaleGroup;
  }
  window.buildFemaleBusPassenger = buildFemaleBusPassenger;

  // ===========================================================================
  // Smooth Anatomical Bus Passenger Builder (12 Distinct Colorful Outfits)
  // Supports buildBusPassenger(outfitColor, hasBeard, isFemale) and buildBusPassenger(pData)
  // ===========================================================================
  function buildBusPassenger(outfitColorOrData, hasBeard, isFemale) {
    let pData = {};
    if (typeof outfitColorOrData === 'object' && outfitColorOrData !== null) {
      pData = Object.assign({}, outfitColorOrData);
    } else {
      pData = {
        outfitColor: outfitColorOrData || 0xdc2626,
        hasBeard: !!hasBeard,
        isFemale: !!isFemale
      };
    }

    if (pData.isFemale) {
      return buildFemaleBusPassenger(pData);
    }

    if (pData.hasMustache === undefined) {
      pData.hasMustache = !pData.isFemale;
    }
    if (pData.isFemale && !pData.dupattaColor) {
      pData.dupattaColor = 0xffffff;
    }
    if (!pData.skinColor) {
      pData.skinColor = pData.isFemale ? 0xd69e72 : 0xc68662;
    }

    const passengerGroup = new THREE.Group();

    const skinColor = pData.skinColor;
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      emissive: 0x2e1810,
      emissiveIntensity: 0.30,
      roughness: 0.65,
      metalness: 0.05
    });

    const outfitMat = new THREE.MeshStandardMaterial({
      color: pData.outfitColor,
      emissive: pData.outfitEmissive || 0x1e293b,
      emissiveIntensity: 0.35,
      roughness: 0.50,
      metalness: 0.08
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: pData.hairColor || 0x111317,
      roughness: 0.90,
      metalness: 0.10
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: pData.isFemale ? (pData.dupattaColor || pData.outfitColor) : 0x1e293b,
      roughness: 0.80
    });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const eyebrowMat = new THREE.MeshBasicMaterial({ color: 0x111317 });
    const mustacheMat = new THREE.MeshBasicMaterial({ color: 0x111317 });
    const lipMat = new THREE.MeshBasicMaterial({ color: 0x9e4747 });

    // 1. Tapered Contoured Torso & Upper Chest Yoke
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.30, 1.15, 3.2, 8), outfitMat);
    torso.scale.set(0.85, 1.0, 1.15);
    torso.position.set(0, 1.8, 0);
    passengerGroup.add(torso);

    const yoke = new THREE.Mesh(new THREE.SphereGeometry(1.35, 8, 6), outfitMat);
    yoke.scale.set(0.80, 0.45, 1.18);
    yoke.position.set(0, 3.2, 0);
    passengerGroup.add(yoke);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.75, 8), skinMat);
    neck.position.set(0.1, 3.85, 0);
    passengerGroup.add(neck);

    // Collar / Dupatta / Scarf
    if (pData.isFemale && pData.dupattaColor) {
      const dupattaMat = new THREE.MeshStandardMaterial({
        color: pData.dupattaColor,
        emissive: pData.outfitEmissive || 0x334155,
        emissiveIntensity: 0.25,
        roughness: 0.60
      });
      const scarfLoop = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.22, 5, 10), dupattaMat);
      scarfLoop.rotation.x = Math.PI / 2;
      scarfLoop.position.set(0.1, 3.75, 0);
      passengerGroup.add(scarfLoop);

      const drape = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.8), dupattaMat);
      drape.position.set(0.45, 2.5, 0.6);
      passengerGroup.add(drape);
    } else {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.14, 5, 10), outfitMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0.1, 3.75, 0);
      passengerGroup.add(collar);
    }

    // Seated Legs Assembly (Thighs to Seat Edge + Knees + Shins to Floor + Shoes)
    const shoeMat = new THREE.MeshStandardMaterial({
      color: pData.shoeColor || 0x18181b,
      roughness: 0.55,
      metalness: 0.20
    });
    const soleMat = new THREE.MeshBasicMaterial({ color: 0x090a0f });

    [-1, 1].forEach(side => {
      const legZ = side * 0.75;

      // Thigh cylinder extending forward from hip to seat front edge (X = 0.1 to 2.15)
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.48, 2.10, 8), pantsMat);
      thigh.rotation.z = Math.PI / 2 - 0.05;
      thigh.position.set(1.10, 0.22, legZ);
      passengerGroup.add(thigh);

      // Rounded Knee Joint at seat bench edge
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), pantsMat);
      knee.position.set(2.15, 0.16, legZ);
      passengerGroup.add(knee);

      // Vertical Lower Shin / Trouser Leg descending ~4.8 units down to floor
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.36, 4.76, 8), pantsMat);
      shin.rotation.z = -0.032;
      shin.position.set(2.225, -2.22, legZ);
      passengerGroup.add(shin);

      // Ankle joint cap
      const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.34, 6, 5), pantsMat);
      ankle.position.set(2.30, -4.60, legZ);
      passengerGroup.add(ankle);

      // Styled Shoe resting flat on bus floor (Y_floor = -5.10)
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.50, 0.72), shoeMat);
      shoe.position.set(2.80, -4.83, legZ);
      passengerGroup.add(shoe);

      const shoeToe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), shoeMat);
      shoeToe.scale.set(1.1, 0.75, 1.05);
      shoeToe.position.set(3.54, -4.85, legZ);
      passengerGroup.add(shoeToe);

      const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.08, 0.76), soleMat);
      shoeSole.position.set(2.82, -5.06, legZ);
      passengerGroup.add(shoeSole);
    });

    // 2. Head, Hair Dome / Cap & Facial Features
    const headGroup = new THREE.Group();
    headGroup.position.set(0.15, 4.8, 0);
    passengerGroup.add(headGroup);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(1.08, 10, 8), skinMat);
    cranium.scale.set(0.85, 1.05, 0.90);
    headGroup.add(cranium);

    if (pData.hasCap) {
      const capMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.60 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 1.02, 0.65, 10), capMat);
      cap.position.set(-0.05, 0.85, 0);
      headGroup.add(cap);
    } else if (pData.isFemale && pData.dupattaColor) {
      const fHair = new THREE.Mesh(new THREE.SphereGeometry(1.12, 10, 8), hairMat);
      fHair.scale.set(0.88, 1.08, 0.94);
      fHair.position.set(-0.08, 0.08, 0);
      headGroup.add(fHair);
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(1.12, 10, 8), hairMat);
      hair.scale.set(0.88, 1.08, 0.92);
      hair.position.set(-0.08, 0.08, 0);
      headGroup.add(hair);
    }

    // Ears
    [-1, 1].forEach(ez => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), skinMat);
      ear.scale.set(0.35, 0.80, 0.50);
      ear.position.set(-0.05, -0.04, ez * 1.05);
      headGroup.add(ear);
    });

    // Eyes & Eyebrows (Emissive basic materials for clear window penetration)
    [0.32, -0.32].forEach(ez => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), eyeWhiteMat);
      eyeWhite.position.set(0.88, 0.16, ez);
      headGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), eyePupilMat);
      pupil.position.set(1.00, 0.16, ez);
      headGroup.add(pupil);

      const eyebrow = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.34), eyebrowMat);
      eyebrow.position.set(0.92, 0.38, ez);
      headGroup.add(eyebrow);
    });

    // Nose
    const noseBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.18, 0.42, 6), skinMat);
    noseBridge.rotation.z = -0.22;
    noseBridge.position.set(0.98, -0.05, 0);
    headGroup.add(noseBridge);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
    noseTip.position.set(1.08, -0.18, 0);
    headGroup.add(noseTip);

    // Lips
    const lips = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.32), lipMat);
    lips.position.set(0.98, -0.48, 0);
    headGroup.add(lips);

    // Optional Mustache
    if (pData.hasMustache) {
      const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.40), mustacheMat);
      mustache.position.set(1.02, -0.34, 0);
      headGroup.add(mustache);
    }

    // Optional Beard
    if (pData.hasBeard) {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.65), mustacheMat);
      beard.position.set(0.85, -0.65, 0);
      headGroup.add(beard);
    }

    // 3. Deltoid Shoulders, Articulated Arms Resting on Lap
    [-1, 1].forEach(side => {
      const shoulderPt = [0.1, 3.2, side * 1.5];
      const elbowPt = [1.1, 1.8, side * 1.4];
      const handPt = [1.7, 0.8, side * 0.55];

      // Shoulder Cap
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.50, 12, 8), outfitMat);
      shoulder.position.set(...shoulderPt);
      passengerGroup.add(shoulder);

      // Upper Arm
      const v1 = new THREE.Vector3(...shoulderPt);
      const v2 = new THREE.Vector3(...elbowPt);
      const armLen1 = v1.distanceTo(v2);
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, armLen1, 8), outfitMat);
      upperArm.position.copy(v1.clone().add(v2).multiplyScalar(0.5));
      upperArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
      passengerGroup.add(upperArm);

      // Elbow Sphere
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), outfitMat);
      elbow.position.set(...elbowPt);
      passengerGroup.add(elbow);

      // Forearm
      const v3 = new THREE.Vector3(...handPt);
      const armLen2 = v2.distanceTo(v3);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, armLen2, 8), outfitMat);
      forearm.position.copy(v2.clone().add(v3).multiplyScalar(0.5));
      forearm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v3.clone().sub(v2).normalize());
      passengerGroup.add(forearm);

      // Resting Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), skinMat);
      hand.position.set(...handPt);
      passengerGroup.add(hand);
    });

    passengerGroup.traverse(child => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });
    return passengerGroup;
  }
  window.buildBusPassenger = buildBusPassenger;

  function buildHasanTransitBus(vData) {
    if (busInstFleet && busTemplateWheelPoses) {
      const wrapper = new THREE.Group();
      wrapper.userData.isBus = true;
      wrapper.userData.wheelRadius = 4.2;
      wrapper.userData.modelTitle = 'হাসান পরিবহন (আজিমপুর - উত্তরা)';
      if (vData) wrapper.userData.vData = vData;
      wrapper.userData.wheels = attachWheelPivotsFromTemplatePoses(wrapper, busTemplateWheelPoses, 'busWheel', 1, 20, 4.2);

      const slot = busInstFleet.count < busInstFleet.capacity ? busInstFleet.count++ : 0;
      busInstFleet.layers.forEach(l => { l.inst.count = busInstFleet.count; });
      wrapper.userData.fleet = busInstFleet;
      wrapper.userData.fleetSlot = slot;
      wrapper.userData.fleetHitInst = busInstFleet.hitInst;
      instancedFleetEntries.push({ root: wrapper, fleet: busInstFleet, slot: slot });

      hasanBusList.push(wrapper);
      return wrapper;
    }

    const group = new THREE.Group();
    group.userData.wheels = [];
    group.userData.wheelRadius = 4.2;
    group.userData.isBus = true;
    group.userData.modelTitle = 'হাসান পরিবহন (আজিমপুর - উত্তরা)';
    if (vData) group.userData.vData = vData;

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Glossy crimson red upper coach shell
      roughness: 0.28,
      metalness: 0.25
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Clean bright white lower skirts
      roughness: 0.30,
      metalness: 0.15
    });
    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.85,
      metalness: 0.20
    });
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x141619,
      roughness: 0.80,
      metalness: 0.20
    });
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.30,
      metalness: 0.65
    });
    const busClearGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
      roughness: 0.08,
      metalness: 0.1,
      depthWrite: false
    });
    group.userData.busClearGlassMat = busClearGlassMat;

    const length = 76.0;
    const width = 22.0;

    // -------------------------------------------------------------
    // 1. Two-Tone Livery & Skirts with Rear Diagonal Sweep
    // -------------------------------------------------------------
    [-1, 1].forEach(side => {
      const skirtShape = new THREE.Shape();
      skirtShape.moveTo(37.0, 2.4);
      skirtShape.lineTo(37.0, 11.2);
      skirtShape.lineTo(-30.6, 11.2);
      skirtShape.lineTo(-37.8, 15.6); // Signature upward diagonal sweep behind rear wheel!
      skirtShape.lineTo(-37.8, 2.4);
      skirtShape.lineTo(-16.0, 2.4);
      // Rear wheel arch cutout (radius 5.4, centered at X = -21.5, Y = 4.2)
      skirtShape.absarc(-21.5, 4.2, 5.4, 0, Math.PI, false);
      skirtShape.lineTo(18.0, 2.4);
      // Front wheel arch cutout (radius 5.4, centered at X = 23.5, Y = 4.2)
      skirtShape.absarc(23.5, 4.2, 5.4, 0, Math.PI, false);
      skirtShape.lineTo(37.0, 2.4);

      const skirtGeo = new THREE.ExtrudeGeometry(skirtShape, { depth: 0.35, bevelEnabled: false });
      const skirtMesh = new THREE.Mesh(skirtGeo, whiteMat);
      skirtMesh.position.z = side > 0 ? 10.65 : -11.0;
      group.add(skirtMesh);

      // Matching red wedge behind rear wheel arch up to window line
      const redWedgeShape = new THREE.Shape();
      redWedgeShape.moveTo(-30.6, 11.2);
      redWedgeShape.lineTo(-30.6, 18.4);
      redWedgeShape.lineTo(-37.8, 18.4);
      redWedgeShape.lineTo(-37.8, 15.6);
      redWedgeShape.closePath();

      const redWedgeGeo = new THREE.ExtrudeGeometry(redWedgeShape, { depth: 0.35, bevelEnabled: false });
      const redWedgeMesh = new THREE.Mesh(redWedgeGeo, redMat);
      redWedgeMesh.position.z = side > 0 ? 10.65 : -11.0;
      group.add(redWedgeMesh);

      // Black Rubber Rocker Rub-Rail along bottom
      const rubRail = new THREE.Mesh(
        new THREE.BoxGeometry(length - 0.4, 0.6, 0.4),
        blackTrimMat
      );
      rubRail.position.set(0, 2.7, side * 10.95);
      group.add(rubRail);

      // Flared Black Wheel Arch Moldings
      [23.5, -21.5].forEach(axleX => {
        const archMolding = new THREE.Mesh(
          new THREE.TorusGeometry(5.4, 0.28, 8, 24, Math.PI),
          blackTrimMat
        );
        archMolding.position.set(axleX, 4.2, side * 11.0);
        group.add(archMolding);
      });

      // Horizontal Seam Grooves along lower white skirt
      [5.6, 8.4].forEach(sy => {
        const seam = new THREE.Mesh(
          new THREE.BoxGeometry(42.0, 0.12, 0.38),
          blackTrimMat
        );
        seam.position.set(1.0, sy, side * 10.9);
        group.add(seam);
      });
    });

    // Front Fascia Panels
    const fApron = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.6, width - 0.4), whiteMat);
    fApron.position.set(37.5, 7.4, 0);
    group.add(fApron);

    const fMidBand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, width - 0.4), redMat);
    fMidBand.position.set(37.3, 11.9, 0);
    group.add(fMidBand);

    const fForehead = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.8, width), redMat);
    fForehead.position.set(36.6, 20.2, 0);
    group.add(fForehead);

    // Rear Fascia Panels with Cutout for Crystal-Clear Rear Window
    const rLower = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.6, width - 0.4), whiteMat);
    rLower.position.set(-37.8, 7.9, 0);
    group.add(rLower);

    const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.4, width - 0.4), redMat);
    rUpper.position.set(-37.8, 20.0, 0);
    group.add(rUpper);

    // Rear Side Corner Pillars flanking the rear window
    [-1, 1].forEach(side => {
      const rPillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.6, 2.4), redMat);
      rPillar.position.set(-37.8, 15.0, side * 9.6);
      group.add(rPillar);
    });

    // Crystal-Clear Rear Window Glass & Frame (depthWrite: false)
    const rGlass = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.4, 16.8), busClearGlassMat);
    rGlass.position.set(-37.85, 15.0, 0);
    group.add(rGlass);

    // Slender Top Header & Bottom Sill Bars for Rear Window (Completely Open Cutout)
    const rGlassTop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 17.2), blackTrimMat);
    rGlassTop.position.set(-37.85, 17.6, 0);
    group.add(rGlassTop);

    const rGlassSill = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 17.2), blackTrimMat);
    rGlassSill.position.set(-37.85, 12.4, 0);
    group.add(rGlassSill);

    // Main Red Roof Cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(length - 0.4, 1.4, width), redMat);
    roof.position.set(-0.2, 22.0, 0);
    group.add(roof);

    // Upper Red Window Header Strips on Both Sides
    [-1, 1].forEach(side => {
      const header = new THREE.Mesh(new THREE.BoxGeometry(length - 0.8, 3.4, 0.45), redMat);
      header.position.set(-0.2, 20.0, side * 10.8);
      group.add(header);
    });

    // Interior Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(73.0, 0.6, 21.0), blackTrimMat);
    floor.position.set(0, 4.4, 0);
    group.add(floor);

    // -------------------------------------------------------------
    // 2. 3-Section Metallic Silver Rooftop HVAC Pod & Exhaust Tip
    // -------------------------------------------------------------
    const hvacGroup = new THREE.Group();
    hvacGroup.position.set(-4.0, 23.4, 0);

    const hvacMain = new THREE.Mesh(new THREE.BoxGeometry(39.0, 2.0, 12.6), silverMat);
    hvacGroup.add(hvacMain);

    [-6.5, 6.5].forEach(divX => {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.1, 12.8), blackTrimMat);
      div.position.set(divX, 0, 0);
      hvacGroup.add(div);
    });

    const hvacNose = new THREE.Mesh(
      new THREE.CylinderGeometry(6.3, 6.3, 2.0, 10, 1, false, 0, Math.PI),
      silverMat
    );
    hvacNose.rotation.y = Math.PI / 2;
    hvacNose.position.set(19.5, 0, 0);
    hvacGroup.add(hvacNose);

    const hvacTail = new THREE.Mesh(
      new THREE.CylinderGeometry(6.3, 6.3, 2.0, 10, 1, false, 0, Math.PI),
      silverMat
    );
    hvacTail.rotation.y = -Math.PI / 2;
    hvacTail.position.set(-19.5, 0, 0);
    hvacGroup.add(hvacTail);

    [-1, 1].forEach(side => {
      [-13.0, 0, 13.0].forEach(lx => {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.1, 0.2), blackTrimMat);
        louver.position.set(lx, 0.1, side * 6.35);
        hvacGroup.add(louver);
      });
    });
    group.add(hvacGroup);

    // Curved Black Exhaust Tailpipe Tip (Top-Rear Left Roof Corner)
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.46, 2.2, 12),
      blackTrimMat
    );
    exhaust.rotation.z = -0.45;
    exhaust.rotation.x = 0.25;
    exhaust.position.set(-36.6, 23.2, 9.4);
    group.add(exhaust);

    // -------------------------------------------------------------
    // 3. Front Fascia, LED Destination Sign & Triple Round Headlights
    // -------------------------------------------------------------
    const ledHousing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.4, 16.4), blackTrimMat);
    ledHousing.position.set(37.4, 20.2, 0);
    group.add(ledHousing);

    const ledTex = getHasanLedDestinationTexture();
    if (ledTex) {
      const ledFace = new THREE.Mesh(
        new THREE.PlaneGeometry(16.0, 3.1),
        new THREE.MeshBasicMaterial({ map: ledTex })
      );
      ledFace.rotation.y = Math.PI / 2;
      ledFace.position.set(37.82, 20.2, 0);
      group.add(ledFace);
    }

    [-8.8, 8.8].forEach(mz => {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.6),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      marker.position.set(37.6, 20.2, mz);
      group.add(marker);
    });

    const fGlass = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.2, 19.6), busClearGlassMat);
    fGlass.position.set(37.2, 15.1, 0);
    group.add(fGlass);

    const fDivider = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.4, 0.35), blackTrimMat);
    fDivider.position.set(37.25, 15.1, 0);
    group.add(fDivider);

    [-4.5, 4.5].forEach(wz => {
      const wiperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 6), blackTrimMat);
      wiperArm.rotation.z = -0.22;
      wiperArm.rotation.y = wz > 0 ? 0.05 : -0.05;
      wiperArm.position.set(37.4, 13.8, wz);
      group.add(wiperArm);
    });

    const hlWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hlAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const hlBezelMat = blackTrimMat;

    [-1, 1].forEach(side => {
      const cluster = [
        { z: 5.8, mat: hlWhiteMat },
        { z: 7.5, mat: hlWhiteMat },
        { z: 9.2, mat: hlAmberMat }
      ];

      cluster.forEach(item => {
        const cz = side * item.z;
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.35, 10), item.mat);
        lens.rotation.z = Math.PI / 2;
        lens.position.set(37.85, 7.8, cz);
        group.add(lens);

        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.12, 6, 10), hlBezelMat);
        bezel.rotation.y = Math.PI / 2;
        bezel.position.set(37.88, 7.8, cz);
        group.add(bezel);
      });
    });

    const fBump = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 22.4), bumperMat);
    fBump.position.set(38.4, 3.6, 0);
    group.add(fBump);

    const fPlateGroup = new THREE.Group();
    fPlateGroup.position.set(39.35, 3.6, 0);
    const fPlateFace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 4.4), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    fPlateGroup.add(fPlateFace);
    const fPlateGreen = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.28, 4.2), new THREE.MeshBasicMaterial({ color: 0x15803d }));
    fPlateGreen.position.set(0.01, 0.38, 0);
    fPlateGroup.add(fPlateGreen);
    const fPlateText = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.35, 3.6), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    fPlateText.position.set(0.01, -0.15, 0);
    fPlateGroup.add(fPlateText);
    group.add(fPlateGroup);

    // Heavy-Duty Commercial Transit Side Mirrors with Live Rear-View Mirror Glass
    initLiveBusMirrors();

    // High-reflectivity mirror glass chrome backing material
    const mirrorChromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.04
    });

    [-1, 1].forEach(side => {
      // 1. Solid Structural Front Corner A-Pillar (Zero clear glass seams, zero air gaps, full structural bus body)
      // Solid structural corner post bridging front windshield (X=37.3) to side window/door line (X=34.5)
      const cornerPillarBlock = new THREE.Mesh(new THREE.BoxGeometry(2.8, 6.6, 1.25), blackTrimMat);
      cornerPillarBlock.position.set(35.9, 15.1, side * 10.35);
      group.add(cornerPillarBlock);

      // Outer flush A-pillar surface providing solid mounting foundation at Z = side * 10.85
      const cornerOuterTrunk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 6.6, 0.45), blackTrimMat);
      cornerOuterTrunk.position.set(36.2, 15.1, side * 10.85);
      group.add(cornerOuterTrunk);

      // Smooth beveled corner wrap meeting the front windshield edge with zero seam
      const cornerWindshieldWrap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.6, 0.8), blackTrimMat);
      cornerWindshieldWrap.position.set(37.0, 15.1, side * 10.20);
      group.add(cornerWindshieldWrap);

      // Lower corner cowl / red waistband continuation (seamless connection to front red mid-band)
      const cornerWaist = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 1.25), redMat);
      cornerWaist.position.set(35.9, 11.9, side * 10.35);
      group.add(cornerWaist);

      // Lower white cowl skirt continuation
      const cornerSkirt = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.2, 1.25), whiteMat);
      cornerSkirt.position.set(35.9, 9.6, side * 10.35);
      group.add(cornerSkirt);

      // Upper corner header / red roof cap continuation
      const cornerHeader = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 1.25), redMat);
      cornerHeader.position.set(35.9, 20.05, side * 10.35);
      group.add(cornerHeader);

      const mirrorGroup = new THREE.Group();

      // 2. Heavy-Duty Commercial Cast Mounting Bases (anchored flush into solid corner A-pillar trunk at Z = side * 10.82)
      const upperFlange = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.55, 0.25), blackTrimMat);
      upperFlange.position.set(36.2, 16.5, side * 10.80);
      mirrorGroup.add(upperFlange);

      const lowerFlange = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.55, 0.25), blackTrimMat);
      lowerFlange.position.set(36.2, 13.5, side * 10.80);
      mirrorGroup.add(lowerFlange);

      // Decorative chrome mounting bolts on base flanges
      [-0.15, 0.15].forEach(by => {
        const uBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.30, 8), silverMat);
        uBolt.rotation.x = Math.PI / 2;
        uBolt.position.set(36.2, 16.5 + by, side * 10.82);
        mirrorGroup.add(uBolt);

        const lBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.30, 8), silverMat);
        lBolt.rotation.x = Math.PI / 2;
        lBolt.position.set(36.2, 13.5 + by, side * 10.82);
        mirrorGroup.add(lBolt);
      });

      // 3. Sturdy Heavy-Duty Support Arms (Firmly span from A-pillar at 10.80 to vertical pivot tube at 11.25)
      const armLength = 0.52;
      const armCenterZ = side * (10.80 + armLength * 0.5);

      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, armLength, 12), blackTrimMat);
      upperArm.rotation.x = Math.PI / 2;
      upperArm.position.set(36.3, 16.5, armCenterZ);
      mirrorGroup.add(upperArm);

      const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, armLength, 12), blackTrimMat);
      lowerArm.rotation.x = Math.PI / 2;
      lowerArm.position.set(36.3, 13.5, armCenterZ);
      mirrorGroup.add(lowerArm);

      // Triangular diagonal reinforcement strut / gusset from lower cowl up to lower arm elbow
      const gusset = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.10, 10), blackTrimMat);
      gusset.rotation.x = side * 0.45;
      gusset.position.set(36.25, 12.5, side * 10.98);
      mirrorGroup.add(gusset);

      // Vertical mounting pivot spindle tube linking upper and lower arms at mirror inner edge
      const pivotTube = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.40, 12), blackTrimMat);
      pivotTube.position.set(36.35, 15.0, side * 11.25);
      mirrorGroup.add(pivotTube);

      // Pivot tube top & bottom cap nuts
      [-1, 1].forEach(capEnd => {
        const capNut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), blackTrimMat);
        capNut.position.set(36.35, 15.0 + capEnd * 1.72, side * 11.25);
        mirrorGroup.add(capNut);
      });

      // 4. Snug Commercial Mirror Pod Assembly (Positioned at Z = side * 11.40, angled inward toward driver)
      const podGroup = new THREE.Group();
      podGroup.position.set(36.4, 15.0, side * 11.40);
      // Inward angle toward driver: negative on driver side (side=1), positive on curbside (side=-1)
      podGroup.rotation.y = side === 1 ? -0.16 : 0.20;

      // Main Mirror Housing (casing)
      const mainHousing = new THREE.Mesh(new THREE.BoxGeometry(0.36, 3.00, 0.76), blackTrimMat);
      mainHousing.position.set(0, 0, 0);
      podGroup.add(mainHousing);

      // Front Aerodynamic Accent Bezel (facing +X road traffic)
      const frontAccent = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 2.80, 0.66),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.20 })
      );
      frontAccent.position.set(0.185, 0, 0);
      podGroup.add(frontAccent);

      // Rear Reflective Chrome Border & Bezel (facing -X rearward toward driver and traffic)
      const mirrorChromeBacking = new THREE.Mesh(new THREE.BoxGeometry(0.02, 2.84, 0.68), mirrorChromeMat);
      mirrorChromeBacking.position.set(-0.182, 0, 0);
      podGroup.add(mirrorChromeBacking);

      // Upper Main Mirror Pane (~70% height, live rear-view road & passing traffic reflection)
      // Solid BoxGeometry prevents backface culling, clipping, and zero-normal culling
      const upperMirror = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.94, 0.62), staticMirrorMat);
      upperMirror.position.set(-0.186, 0.40, 0);
      podGroup.add(upperMirror);

      // Divider Trim Bar between upper and lower panes
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.66), blackTrimMat);
      divider.position.set(-0.188, -0.62, 0);
      podGroup.add(divider);

      // Lower Convex Blind-Spot Mirror Pane (~25% height)
      const lowerMirror = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.64, 0.62), staticMirrorMat);
      lowerMirror.position.set(-0.186, -1.02, 0);
      podGroup.add(lowerMirror);

      mirrorGroup.add(podGroup);

      if (side === 1) {
        group.userData.leftMirrorMeshes = [upperMirror, lowerMirror];
        if (liveLeftMirrorMat) {
          upperMirror.material = liveLeftMirrorMat;
          lowerMirror.material = liveLeftMirrorMat;
        }
      } else {
        group.userData.rightMirrorMeshes = [upperMirror, lowerMirror];
        if (liveRightMirrorMat) {
          upperMirror.material = liveRightMirrorMat;
          lowerMirror.material = liveRightMirrorMat;
        }
      }

      // Zero-lag 120 FPS freeze on all mirror sub-meshes
      mirrorGroup.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }
      });
      mirrorGroup.updateMatrix();
      mirrorGroup.matrixAutoUpdate = false;
      group.add(mirrorGroup);
    });

    // -------------------------------------------------------------
    // 4. Seated Anatomical Bus Driver & Cab Console
    // -------------------------------------------------------------
    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 3.4), blackTrimMat);
    driverSeat.position.set(28.5, 7.8, 5.5);
    group.add(driverSeat);

    const driverBackrest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.8, 3.2), blackTrimMat);
    driverBackrest.rotation.z = -0.15;
    driverBackrest.position.set(27.0, 10.4, 5.5);
    group.add(driverBackrest);

    const dashConsole = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 6.2), blackTrimMat);
    dashConsole.position.set(33.8, 10.4, 5.5);
    group.add(dashConsole);

    const binnacle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 2.8), blackTrimMat);
    binnacle.position.set(33.0, 11.8, 5.5);
    group.add(binnacle);

    const driver = buildHasanBusDriver();
    group.add(driver);

    // -------------------------------------------------------------
    // 5. Side Windows, Bi-Fold Door & Bangla Side Branding
    // -------------------------------------------------------------
    const sideBrandingTex = getHasanSideBrandingTexture(false);
    if (sideBrandingTex) {
      const lSideSign = new THREE.Mesh(
        new THREE.PlaneGeometry(54.0, 2.7),
        new THREE.MeshBasicMaterial({ map: sideBrandingTex, transparent: true })
      );
      lSideSign.position.set(1.0, 19.8, 11.08);
      group.add(lSideSign);

      const rSideSign = new THREE.Mesh(
        new THREE.PlaneGeometry(54.0, 2.7),
        new THREE.MeshBasicMaterial({ map: sideBrandingTex, transparent: true })
      );
      rSideSign.rotation.y = Math.PI;
      rSideSign.position.set(1.0, 19.8, -11.08);
      group.add(rSideSign);
    }

    const windowXs = [18.5, 9.5, 0.5, -8.5, -17.5, -26.5];
    const windowPillarXs = [22.8, 14.0, 5.0, -4.0, -13.0, -22.0, -30.6];

    // Right side (Curbside: 6 windows + Slender Window Mullions + Front Bi-Fold Passenger Door)
    windowXs.forEach(wx => {
      const wPane = new THREE.Mesh(new THREE.BoxGeometry(7.8, 6.4, 0.15), busClearGlassMat);
      wPane.position.set(wx, 15.0, -10.8);
      group.add(wPane);

      const transom = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.16, 0.25), blackTrimMat);
      transom.position.set(wx, 16.6, -10.8);
      group.add(transom);
    });

    windowPillarXs.forEach(px => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.4, 0.35), blackTrimMat);
      pillar.position.set(px, 15.0, -10.8);
      group.add(pillar);
    });

    const rSillRail = new THREE.Mesh(new THREE.BoxGeometry(54.0, 0.25, 0.35), blackTrimMat);
    rSillRail.position.set(1.0, 11.7, -10.8);
    group.add(rSillRail);

    const rTopRail = new THREE.Mesh(new THREE.BoxGeometry(54.0, 0.25, 0.35), blackTrimMat);
    rTopRail.position.set(1.0, 18.3, -10.8);
    group.add(rTopRail);

    // Front Bi-Fold Glass Passenger Entry Door (Curbside — Open Doorway with Clear Glass Leaves)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(31.5, 11.0, -10.85);

    [-3.1, 3.1].forEach(dx => {
      const doorPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 14.8, 0.35), blackTrimMat);
      doorPost.position.set(dx, 0, 0);
      doorGroup.add(doorPost);
    });
    const doorTop = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.35, 0.35), blackTrimMat);
    doorTop.position.set(0, 7.3, 0);
    doorGroup.add(doorTop);

    [-1.45, 1.45].forEach(dx => {
      const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 14.0, 0.15), busClearGlassMat);
      doorLeaf.position.set(dx, 0, 0);
      doorGroup.add(doorLeaf);

      [-1.25, 1.25].forEach(sx => {
        const seal = new THREE.Mesh(new THREE.BoxGeometry(0.10, 14.0, 0.22), blackTrimMat);
        seal.position.set(dx + sx, 0, 0);
        doorGroup.add(seal);
      });
    });
    group.add(doorGroup);

    // Left side (Driver side: 6 windows + Slender Window Mullions + Driver signaling window)
    windowXs.forEach(wx => {
      const wPane = new THREE.Mesh(new THREE.BoxGeometry(7.8, 6.4, 0.15), busClearGlassMat);
      wPane.position.set(wx, 15.0, 10.8);
      group.add(wPane);

      const transom = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.16, 0.25), blackTrimMat);
      transom.position.set(wx, 16.6, 10.8);
      group.add(transom);
    });

    windowPillarXs.forEach(px => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.4, 0.35), blackTrimMat);
      pillar.position.set(px, 15.0, 10.8);
      group.add(pillar);
    });

    const lSillRail = new THREE.Mesh(new THREE.BoxGeometry(54.0, 0.25, 0.35), blackTrimMat);
    lSillRail.position.set(1.0, 11.7, 10.8);
    group.add(lSillRail);

    const lTopRail = new THREE.Mesh(new THREE.BoxGeometry(54.0, 0.25, 0.35), blackTrimMat);
    lTopRail.position.set(1.0, 18.3, 10.8);
    group.add(lTopRail);

    // Driver signaling window (Clear Glass with Slender Frame)
    const dWin = new THREE.Mesh(new THREE.BoxGeometry(6.4, 6.4, 0.15), busClearGlassMat);
    dWin.position.set(31.5, 15.0, 10.8);
    group.add(dWin);

    [-3.1, 3.1].forEach(dx => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.4, 0.35), blackTrimMat);
      post.position.set(31.5 + dx, 15.0, 10.8);
      group.add(post);
    });
    const dTrack = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.15, 0.22), blackTrimMat);
    dTrack.position.set(31.5, 15.0, 10.8);
    group.add(dTrack);

    // -------------------------------------------------------------
    // Bright Interior Bus Lighting (Self-Lit Glowing Ceiling Fixtures & LED Strips)
    // -------------------------------------------------------------
    const ceilingFixtureMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    [16.0, 0.0, -16.0].forEach(lx => {
      const domeFixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.15, 12),
        ceilingFixtureMat
      );
      domeFixture.position.set(lx, 21.0, 0);
      group.add(domeFixture);
    });

    // Continuous glowing ceiling LED diffuser strips
    [-2.2, 2.2].forEach(lz => {
      const ledStrip = new THREE.Mesh(
        new THREE.BoxGeometry(62.0, 0.12, 0.7),
        ceilingFixtureMat
      );
      ledStrip.position.set(0, 21.0, lz);
      group.add(ledStrip);
    });

    // -------------------------------------------------------------
    // Interior Layout: Blue Transit Seats & 12 Distinct Seated Passengers
    // -------------------------------------------------------------
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 });
    const seatBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.40 });

    const passengersData = [
      // Left side window seats (Driver side, Z = 6.8):
      // 1: Female Passenger 1 (Front Window Seat - Dedicated Women's Section behind driver)
      {
        name: 'Female Passenger 1 (Bright Magenta / Rani Pink Salwar Kameez & White Dupatta)',
        outfitColor: 0xdb2777,
        outfitEmissive: 0x831843,
        dupattaColor: 0xf8fafc,
        dupattaEmissive: 0x334155,
        headwearStyle: 'bun',
        skinColor: 0xd69e72,
        lipColor: 0xbe185d,
        isFemale: true
      },
      // 2: Female Passenger 2 (Second Row Window Seat - Dedicated Women's Section)
      {
        name: 'Female Passenger 2 (Mustard Yellow Saree, Maroon Pallu & Cream-White Hijab)',
        outfitColor: 0xeab308,
        outfitEmissive: 0x713f12,
        dupattaColor: 0x881337,
        dupattaEmissive: 0x4c0519,
        hijabColor: 0xfef3c7,
        headwearStyle: 'hijab',
        skinColor: 0xe0ac84,
        lipColor: 0xe11d48,
        isFemale: true
      },
      // 3: Female Passenger 3 (Middle Window Seat)
      {
        name: 'Female Passenger 3 (Emerald / Teal Green Kameez & Peach Coral Dupatta)',
        outfitColor: 0x0d9488,
        outfitEmissive: 0x134e4a,
        dupattaColor: 0xfda4af,
        dupattaEmissive: 0x9f1239,
        headwearStyle: 'bun',
        skinColor: 0xd69e72,
        lipColor: 0xbe185d,
        isFemale: true
      },
      // 4: Male Passenger (Royal Blue Polo)
      { outfitColor: 0x2563eb, outfitEmissive: 0x1e3a8a, skinColor: 0xc68662, hasMustache: false, hasBeard: false, isFemale: false },
      // 5: Male Passenger (Emerald Green Shirt with Beard)
      { outfitColor: 0x059669, outfitEmissive: 0x064e3b, skinColor: 0xc68662, hasMustache: true, hasBeard: true, isFemale: false },
      // 6: Male Passenger (Olive Green Shirt)
      { outfitColor: 0x65a30d, outfitEmissive: 0x365314, skinColor: 0xc68662, hasMustache: true, hasBeard: false, isFemale: false },

      // Right side window seats (Curbside, Z = -6.8):
      // 7: Female Passenger 4 (Opposite Side Front Window Seat right behind entry door)
      {
        name: 'Female Passenger 4 (Royal Purple / Violet Kameez & Lavender-White Hijab)',
        outfitColor: 0x7c3aed,
        outfitEmissive: 0x4c1d95,
        dupattaColor: 0xc084fc,
        dupattaEmissive: 0x581c87,
        hijabColor: 0xede9fe,
        headwearStyle: 'hijab',
        skinColor: 0xe0ac84,
        lipColor: 0xe11d48,
        isFemale: true
      },
      // 8: Male Passenger (Vibrant Orange Shirt)
      { outfitColor: 0xea580c, outfitEmissive: 0x7c2d12, skinColor: 0xc68662, hasMustache: true, hasBeard: true, isFemale: false },
      // 9: Male Passenger (Crisp White Panjabi & Topi)
      { outfitColor: 0xf8fafc, outfitEmissive: 0x334155, skinColor: 0xc68662, hasMustache: true, hasBeard: false, isFemale: false, hasCap: true },
      // 10: Male Passenger (Sky Blue Formal Shirt)
      { outfitColor: 0x0284c7, outfitEmissive: 0x0c4a6e, skinColor: 0xc68662, hasMustache: false, hasBeard: false, isFemale: false },
      // 11: Female Passenger 5 (Rear-Middle Window Seat)
      {
        name: 'Female Passenger 5 (Coral Red / Terracotta Saree & Golden-Beige Dupatta)',
        outfitColor: 0xe11d48,
        outfitEmissive: 0x881337,
        dupattaColor: 0xfde68a,
        dupattaEmissive: 0x78350f,
        headwearStyle: 'bun',
        skinColor: 0xd69e72,
        lipColor: 0xbe185d,
        isFemale: true
      },
      // 12: Male Passenger (Crimson Red Shirt)
      { outfitColor: 0xdc2626, outfitEmissive: 0x7f1d1d, skinColor: 0xc68662, hasMustache: true, hasBeard: false, isFemale: false }
    ];

    windowXs.forEach((sx, idx) => {
      // Left side seat (Driver side):
      const leftSeatCushion = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 7.2), seatMat);
      leftSeatCushion.position.set(sx, 9.4, 6.4);
      group.add(leftSeatCushion);

      const leftSeatBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 7.0), seatMat);
      leftSeatBack.position.set(sx - 1.8, 11.8, 6.4);
      group.add(leftSeatBack);

      const leftSeatBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.6, 3.4), seatBaseMat);
      leftSeatBase.position.set(sx, 6.9, 6.4);
      group.add(leftSeatBase);

      const pLeft = buildBusPassenger(passengersData[idx]);
      pLeft.position.set(sx, 9.8, 6.8);
      pLeft.updateMatrix();
      pLeft.matrixAutoUpdate = false;
      group.add(pLeft);

      // Right side seat (Curbside):
      const rightSeatCushion = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 7.2), seatMat);
      rightSeatCushion.position.set(sx, 9.4, -6.4);
      group.add(rightSeatCushion);

      const rightSeatBack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.4, 7.0), seatMat);
      rightSeatBack.position.set(sx - 1.8, 11.8, -6.4);
      group.add(rightSeatBack);

      const rightSeatBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.6, 3.4), seatBaseMat);
      rightSeatBase.position.set(sx, 6.9, -6.4);
      group.add(rightSeatBase);

      const pRight = buildBusPassenger(passengersData[idx + 6]);
      pRight.position.set(sx, 9.8, -6.8);
      pRight.updateMatrix();
      pRight.matrixAutoUpdate = false;
      group.add(pRight);

      // Vertical yellow safety grab poles along aisle at each seat row
      [-2.8, 2.8].forEach(pz => {
        const vPole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 16.4, 8), poleMat);
        vPole.position.set(sx, 12.8, pz);
        group.add(vPole);
      });
    });

    [-2.8, 2.8].forEach(pz => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 56.0, 6), poleMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(-4.0, 20.2, pz);
      group.add(rail);
    });

    // -------------------------------------------------------------
    // 6. Rear Fascia & Taillights
    // -------------------------------------------------------------
    const rearTex = getHasanRearBrandingTexture();
    if (rearTex) {
      const rBadge = new THREE.Mesh(
        new THREE.PlaneGeometry(11.0, 3.8),
        new THREE.MeshBasicMaterial({ map: rearTex, transparent: true })
      );
      rBadge.rotation.y = -Math.PI / 2;
      rBadge.position.set(-38.15, 20.0, 0);
      group.add(rBadge);
    }

    const rLouver = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.6, 14.0), blackTrimMat);
    rLouver.position.set(-38.12, 8.4, 0);
    group.add(rLouver);

    const tlAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const tlRedMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const tlWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    [-9.2, 9.2].forEach(tz => {
      const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 1.2), tlAmberMat);
      tl1.position.set(-38.15, 11.4, tz);
      group.add(tl1);

      const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 1.2), tlRedMat);
      tl2.position.set(-38.15, 9.6, tz);
      group.add(tl2);

      const tl3 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 1.2), tlWhiteMat);
      tl3.position.set(-38.15, 8.0, tz);
      group.add(tl3);
    });

    const rBump = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 22.4), bumperMat);
    rBump.position.set(-38.6, 3.6, 0);
    group.add(rBump);

    const rPlateGroup = new THREE.Group();
    rPlateGroup.position.set(-39.55, 3.6, 0);
    const rPlateFace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 4.4), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    rPlateGroup.add(rPlateFace);
    const rPlateGreen = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.28, 4.2), new THREE.MeshBasicMaterial({ color: 0x15803d }));
    rPlateGreen.position.set(-0.01, 0.38, 0);
    rPlateGroup.add(rPlateGreen);
    const rPlateText = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.35, 3.6), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    rPlateText.position.set(-0.01, -0.15, 0);
    rPlateGroup.add(rPlateText);
    group.add(rPlateGroup);

    // -------------------------------------------------------------
    // 7. Commercial Transit Deep-Dish Steel Wheels (Ground Locked Y = 0)
    // -------------------------------------------------------------
    const wheelRadius = 4.2;
    const wheelWidth = 2.6;

    [-1, 1].forEach(side => {
      const fWheel = createTransitSteelWheel(wheelRadius, wheelWidth);
      fWheel.position.set(23.5, wheelRadius, side * 10.4);
      group.add(fWheel);
      group.userData.wheels.push(fWheel);

      const rWheel = createTransitSteelWheel(wheelRadius, wheelWidth);
      rWheel.position.set(-21.5, wheelRadius, side * 10.4);
      group.add(rWheel);
      group.userData.wheels.push(rWheel);
    });

    if (!busInstFleet) {
      const rawWheels = group.userData.wheels;
      busTemplateWheelPoses = rawWheels.map(w => ({
        position: w.position.clone(), rotation: w.rotation.clone(), scale: w.scale.clone()
      }));
      busTemplateWheelObj = rawWheels[0] ? rawWheels[0].clone(true) : null;
      if (busTemplateWheelObj) getSharedWheelTemplate('busWheel', busTemplateWheelObj);
      rawWheels.forEach(w => { if (w.parent) w.parent.remove(w); });
      optimizeStaticSubtree(group, { packTextures: true });
      busInstFleet = createInstancedFleetFromTemplate(group, 6);
      ensureActiveBusMirrorMeshes();
    }

    const wrapper = new THREE.Group();
    wrapper.userData.isBus = true;
    wrapper.userData.wheelRadius = wheelRadius;
    wrapper.userData.modelTitle = 'হাসান পরিবহন (আজিমপুর - উত্তরা)';
    if (vData) wrapper.userData.vData = vData;
    wrapper.userData.wheels = attachWheelsFromTemplate(wrapper, busTemplateWheelPoses, 'busWheel', busTemplateWheelObj);

    const slot = busInstFleet.count < busInstFleet.capacity ? busInstFleet.count++ : 0;
    busInstFleet.layers.forEach(l => { l.inst.count = busInstFleet.count; });
    wrapper.userData.fleet = busInstFleet;
    wrapper.userData.fleetSlot = slot;
    wrapper.userData.fleetHitInst = busInstFleet.hitInst;
    instancedFleetEntries.push({ root: wrapper, fleet: busInstFleet, slot: slot });

    hasanBusList.push(wrapper);
    return wrapper;
  }

  window.buildHasanTransitBus = buildHasanTransitBus;
  window.createHasanTransitBus = buildHasanTransitBus;
  window.buildBusPassenger = buildBusPassenger;
  window.buildFemaleBusPassenger = buildFemaleBusPassenger;

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

  // ---------------------------------------------------------------------------
  // 3D Smooth Articulated Anatomical Humans (Men, Women, Boys, Girls & Children)
  // Shared Geometry Cache & Zero-Box Procedural Geometry Engine (120 FPS Pure Three.js)
  // ---------------------------------------------------------------------------
  const pedGeoCache = {};
  function getPedGeo(key, factory) {
    if (!pedGeoCache[key]) pedGeoCache[key] = factory();
    return pedGeoCache[key];
  }

  let pedSharedEyeWhiteMat = null;
  let pedSharedPupilMat = null;
  let pedSharedShadowMat = null;
  let pedSharedFootShadowMat = null;
  function getPedSharedMats() {
    if (!pedSharedEyeWhiteMat) {
      pedSharedEyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      pedSharedPupilMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      pedSharedShadowMat = new THREE.MeshBasicMaterial({
        color: 0x05070a,
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      });
      pedSharedFootShadowMat = new THREE.MeshBasicMaterial({
        color: 0x05070a,
        transparent: true,
        opacity: 0.45,
        depthWrite: false
      });
    }
    return {
      eyeWhite: pedSharedEyeWhiteMat,
      pupil: pedSharedPupilMat,
      shadow: pedSharedShadowMat,
      footShadow: pedSharedFootShadowMat
    };
  }

  function createArticulatedHuman(p, isSocial) {
    const group = new THREE.Group();
    const id = (p && p.id !== undefined) ? p.id : Math.floor(Math.random() * 1000);
    const styleSeed = getAppearanceSeed(id);

    // Authentic South Asian warm skin palette
    const skinPalette = [0xd49b70, 0xc68759, 0xb57348, 0xe0ad85, 0x9e5b32];
    const skinHex = skinPalette[(styleSeed >>> 3) % skinPalette.length];
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinHex,
      roughness: 0.65,
      metalness: 0.05
    });

    // 12 Authentic Dhaka Demographic Archetypes
    const ARCHETYPES = [
      // 0. Executive Adult Man
      {
        type: 'man_exec', isFemale: false, scale: 1.0,
        topColor: 0x0284c7, bottomColor: 0x1e293b, shoeColor: 0x18181b, hairColor: 0x111317,
        hasTie: true, tieColor: 0x991b1b, hasMustache: true, hairStyle: 'crop'
      },
      // 1. Traditional Panjabi Adult Man
      {
        type: 'man_panjabi', isFemale: false, scale: 1.0,
        topColor: 0x059669, bottomColor: 0xf8fafc, shoeColor: 0x451a03, hairColor: 0x24170b,
        hasPanjabiHem: true, hasBeard: true, hasMustache: true, hairStyle: 'crop'
      },
      // 2. Casual Commuter Adult Man
      {
        type: 'man_casual', isFemale: false, scale: 1.0,
        topColor: 0xe11d48, bottomColor: 0x1d4ed8, shoeColor: 0x1e3a8a, hairColor: 0x111317,
        cleanShaven: true, hairStyle: 'crop'
      },
      // 3. Salwar Kameez Adult Woman (Hair Bun Style)
      {
        type: 'woman_salwar', isFemale: true, scale: 0.94,
        topColor: 0xdb2777, bottomColor: 0xf8fafc, shoeColor: 0x18181b, hairColor: 0x111317,
        hasDupatta: true, dupattaColor: 0xfbbf24, hairStyle: 'bun', lipColor: 0xd9385a
      },
      // 4. Salwar Kameez Adult Woman (Open-Face Hijab Style)
      {
        type: 'woman_hijab', isFemale: true, scale: 0.94,
        topColor: 0x8b5cf6, bottomColor: 0xf1f5f9, shoeColor: 0x18181b, hairColor: 0x111317,
        hasHijab: true, hijabColor: 0xfef3c7, lipColor: 0xd9385a
      },
      // 5. Bangladeshi Saree Adult Woman
      {
        type: 'woman_saree', isFemale: true, scale: 0.94,
        topColor: 0xdc2626, bottomColor: 0xdc2626, shoeColor: 0x451a03, hairColor: 0x111317,
        hasSareePallu: true, goldColor: 0xfacc15, hairStyle: 'bun', lipColor: 0xd9385a
      },
      // 6. College / Teen Boy
      {
        type: 'teen_boy', isFemale: false, scale: 0.88,
        topColor: 0xf97316, bottomColor: 0x1e40af, shoeColor: 0x18181b, hairColor: 0x111317,
        hasBackpack: true, backpackColor: 0x1e293b, hairStyle: 'crop'
      },
      // 7. College / Teen Girl
      {
        type: 'teen_girl', isFemale: true, scale: 0.84,
        topColor: 0xfb7185, bottomColor: 0xf8fafc, shoeColor: 0x18181b, hairColor: 0x24170b,
        hasTote: true, toteColor: 0x475569, hairStyle: 'bun', lipColor: 0xd9385a
      },
      // 8. Dhaka School Boy
      {
        type: 'school_boy', isFemale: false, scale: 0.68,
        topColor: 0xf8fafc, bottomColor: 0x1e3a8a, shoeColor: 0x18181b, hairColor: 0x111317,
        hasTie: true, tieColor: 0x1e3a8a, hasBackpack: true, backpackColor: 0x2563eb, hairStyle: 'crop'
      },
      // 9. Dhaka School Girl
      {
        type: 'school_girl', isFemale: true, scale: 0.66,
        topColor: 0xf8fafc, bottomColor: 0x14532d, shoeColor: 0x18181b, hairColor: 0x111317,
        hasSkirt: true, hasPigtails: true, hasBackpack: true, backpackColor: 0xec4899, lipColor: 0xd9385a
      },
      // 10. Casual Kid Boy
      {
        type: 'kid_boy', isFemale: false, scale: 0.64,
        topColor: 0x38bdf8, bottomColor: 0xdc2626, shoeColor: 0x18181b, hairColor: 0x111317,
        hasCap: true, capColor: 0x1e3a8a, hairStyle: 'crop'
      },
      // 11. Casual Kid Girl
      {
        type: 'kid_girl', isFemale: true, scale: 0.62,
        topColor: 0xf43f5e, bottomColor: 0xf43f5e, shoeColor: 0x18181b, hairColor: 0x24170b,
        hasDress: true, hasPigtails: true, hasHairband: true, hairbandColor: 0xfbbf24, lipColor: 0xd9385a
      }
    ];

    let archetype;
    if (p && (p.isChild || p.pedCategory === 'child')) {
      const kidArchetypes = [ARCHETYPES[8], ARCHETYPES[9], ARCHETYPES[10], ARCHETYPES[11]];
      archetype = kidArchetypes[styleSeed % kidArchetypes.length];
    } else if (p && (p.pedCategory === 'female' || p.isFemale)) {
      const femaleArchetypes = [ARCHETYPES[3], ARCHETYPES[4], ARCHETYPES[5], ARCHETYPES[7]];
      archetype = femaleArchetypes[styleSeed % femaleArchetypes.length];
    } else if (p && p.pedCategory === 'male') {
      const maleArchetypes = [ARCHETYPES[0], ARCHETYPES[1], ARCHETYPES[2], ARCHETYPES[6]];
      archetype = maleArchetypes[styleSeed % maleArchetypes.length];
    } else {
      archetype = ARCHETYPES[styleSeed % ARCHETYPES.length];
    }
    const topHex = (p && p.color) ? p.color : archetype.topColor;
    const topMat = new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.60 });
    const bottomMat = new THREE.MeshStandardMaterial({ color: archetype.bottomColor, roughness: 0.70 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: archetype.shoeColor || 0x18181b, roughness: 0.45 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.50 });
    const hairMat = new THREE.MeshStandardMaterial({ color: archetype.hairColor || 0x111317, roughness: 0.80 });
    const sharedMats = getPedSharedMats();

    const lipColorHex = archetype.lipColor || (archetype.isFemale ? 0xd9385a : 0xa3483b);
    const lipMat = new THREE.MeshBasicMaterial({ color: lipColorHex });
    const browMat = new THREE.MeshBasicMaterial({ color: archetype.hairColor || 0x111317 });

    // Base world scaling factor: matches ~10.5 unit height of world sidewalks
    const BASE_SCALE = 9.0;
    const bodyRoot = new THREE.Group();
    const shoulderRatio = archetype.isFemale ? 0.90 : 1.0;
    bodyRoot.scale.set(BASE_SCALE * archetype.scale * shoulderRatio, BASE_SCALE * archetype.scale, BASE_SCALE * archetype.scale);
    group.add(bodyRoot);

    // =========================================================================
    // 1. VISIBLE SHOES & ARTICULATED LEGS (Y = 0.000 Flush Ground Contact)
    // Hip placed at hipY = 0.508, shoeGroup at y = -0.22 inside kneePivot
    // Chain: 0.508 - 0.24 - 0.22 - 0.048 = 0.000 (Bottom of sole sits at exact Y = 0.000)
    // =========================================================================
    function buildLeg(isRight) {
      const legPivot = new THREE.Group();
      legPivot.position.set(isRight ? 0.062 : -0.062, 0.508, 0);

      // Hip Sphere
      const hip = new THREE.Mesh(
        getPedGeo('pedHip', () => new THREE.SphereGeometry(0.048, 8, 8)),
        bottomMat
      );
      legPivot.add(hip);

      // Upper Thigh Cylinder (centered at y = -0.12, reaches down to -0.24)
      const thigh = new THREE.Mesh(
        getPedGeo('pedThigh', () => new THREE.CylinderGeometry(0.048, 0.040, 0.24, 8)),
        bottomMat
      );
      thigh.position.set(0, -0.12, 0);
      legPivot.add(thigh);

      // Articulated Knee Pivot Group (anchored at y = -0.24)
      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.24, 0);
      legPivot.add(kneePivot);

      // Knee Sphere
      const knee = new THREE.Mesh(
        getPedGeo('pedKnee', () => new THREE.SphereGeometry(0.039, 8, 8)),
        bottomMat
      );
      kneePivot.add(knee);

      // Lower Shin Cylinder (centered at y = -0.11, reaches down to -0.22)
      const shin = new THREE.Mesh(
        getPedGeo('pedShin', () => new THREE.CylinderGeometry(0.038, 0.030, 0.22, 8)),
        bottomMat
      );
      shin.position.set(0, -0.11, 0);
      kneePivot.add(shin);

      // Visible 3D Shoe (shoeGroup at y = -0.22 inside kneePivot, attached directly to bottom of shin!)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.22, 0);
      kneePivot.add(shoeGroup);

      // High-Contrast Shoe Colors (#111317 jet black, #451a03 dark brown, #1e3a8a navy, #991b1b burgundy)
      // Shoe Upper: BoxGeometry(0.078, 0.052, 0.145) at (0, -0.012, 0.025)
      const shoeBase = new THREE.Mesh(
        getPedGeo('pedShoeBase', () => new THREE.BoxGeometry(0.078, 0.052, 0.145)),
        shoeMat
      );
      shoeBase.position.set(0, -0.012, 0.025);
      shoeGroup.add(shoeBase);

      // Rounded Toe Cap: SphereGeometry(0.039, 8, 8) at (0, -0.016, 0.090)
      const toeCap = new THREE.Mesh(
        getPedGeo('pedToeCap', () => new THREE.SphereGeometry(0.039, 8, 8)),
        shoeMat
      );
      toeCap.position.set(0, -0.016, 0.090);
      shoeGroup.add(toeCap);

      // Contrasting White / Light-Grey Shoe Sole: BoxGeometry(0.082, 0.016, 0.155) at (0, -0.040, 0.025)
      const shoeSole = new THREE.Mesh(
        getPedGeo('pedShoeSole', () => new THREE.BoxGeometry(0.082, 0.016, 0.155)),
        soleMat
      );
      shoeSole.position.set(0, -0.040, 0.025);
      shoeGroup.add(shoeSole);

      // Tight Dark Contact Shadow Pad directly underneath each shoe sole
      const footShadow = new THREE.Mesh(
        getPedGeo('pedFootShadow', () => new THREE.CircleGeometry(0.055, 8)),
        sharedMats.footShadow
      );
      footShadow.rotation.x = -Math.PI / 2;
      footShadow.position.set(0, -0.047, 0.025);
      shoeGroup.add(footShadow);

      // Articulated Ankle Pivot Group (anchored at y = -0.22 inside kneePivot for mocap heel-to-toe roll)
      const anklePivot = new THREE.Group();
      anklePivot.name = isRight ? 'rightAnklePivot' : 'leftAnklePivot';
      anklePivot.position.set(0, -0.22, 0);
      kneePivot.add(anklePivot);
      anklePivot.add(shoeGroup);
      shoeGroup.position.set(0, 0, 0);

      legPivot.name = isRight ? 'rightLegPivot' : 'leftLegPivot';
      kneePivot.name = isRight ? 'rightKneePivot' : 'leftKneePivot';

      return { legPivot, kneePivot, anklePivot };
    }

    const leftLegData = buildLeg(false);
    const rightLegData = buildLeg(true);

    // =========================================================================
    // 2. PELVIS, TORSO & SHOULDER YOKE (Lowered by -0.016 to match hipY = 0.508)
    // =========================================================================
    bodyRoot.name = 'pedBodyRoot';

    // Pelvis Group (root for pelvic counter-twist, lateral weight shift & hips)
    const pelvisGroup = new THREE.Group();
    pelvisGroup.name = 'pelvisGroup';
    pelvisGroup.position.set(0, 0, 0);
    bodyRoot.add(pelvisGroup);

    // Both legs attached into pelvisGroup for anatomically sound gait articulation
    pelvisGroup.add(leftLegData.legPivot);
    pelvisGroup.add(rightLegData.legPivot);

    // Pelvis / Hips (radius 0.092 to 0.089, tapered by 0.006 to eliminate waist clipping notch)
    const pelvis = new THREE.Mesh(
      getPedGeo('pedPelvis', () => new THREE.CylinderGeometry(0.092, 0.089, 0.10, 10)),
      bottomMat
    );
    pelvis.position.set(0, 0.519, 0);
    pelvisGroup.add(pelvis);

    // Traditional Lower Garments
    if (archetype.hasPanjabiHem) {
      const kurtaHem = new THREE.Mesh(
        getPedGeo('pedKurtaHem', () => new THREE.CylinderGeometry(0.118, 0.145, 0.26, 10)),
        topMat
      );
      kurtaHem.position.set(0, 0.388, 0);
      pelvisGroup.add(kurtaHem);
    } else if (archetype.hasSareePallu) {
      const sareeDrape = new THREE.Mesh(
        getPedGeo('pedSareeDrape', () => new THREE.CylinderGeometry(0.110, 0.140, 0.44, 10)),
        bottomMat
      );
      sareeDrape.position.set(0, 0.298, 0);
      pelvisGroup.add(sareeDrape);
    } else if (archetype.hasSkirt || archetype.hasDress) {
      const skirt = new THREE.Mesh(
        getPedGeo('pedSkirt', () => new THREE.CylinderGeometry(0.112, 0.155, 0.24, 10)),
        bottomMat
      );
      skirt.position.set(0, 0.388, 0);
      pelvisGroup.add(skirt);
    }

    // Upper Torso Group (nested inside pelvisGroup for spine counter-twist & breathing)
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'upperTorso';
    torsoGroup.position.set(0, 0, 0);
    pelvisGroup.add(torsoGroup);

    // Torso / Shirt: Radius 0.122 to 0.114 (Widened lower hem by 0.006 to eliminate waist clipping)
    const torso = new THREE.Mesh(
      getPedGeo('pedTorso', () => new THREE.CylinderGeometry(0.122, 0.114, 0.34, 12)),
      topMat
    );
    torso.scale.set(1.08, 1.0, 0.74);
    torso.position.set(0, 0.719, 0);
    torsoGroup.add(torso);

    // Rounded Shoulder Yoke: Centered at y = 0.889, top reaches 0.933
    const yoke = new THREE.Mesh(
      getPedGeo('pedYoke', () => new THREE.SphereGeometry(0.122, 12, 10)),
      topMat
    );
    yoke.scale.set(1.08, 0.36, 0.74);
    yoke.position.set(0, 0.889, 0);
    torsoGroup.add(yoke);

    // Attire Accessories
    if (archetype.hasTie) {
      const tieMat = new THREE.MeshStandardMaterial({ color: archetype.tieColor || 0x991b1b, roughness: 0.5 });
      const tie = new THREE.Mesh(
        getPedGeo('pedTie', () => new THREE.BoxGeometry(0.034, 0.20, 0.012)),
        tieMat
      );
      tie.position.set(0, 0.748, 0.092);
      torsoGroup.add(tie);
    }
    if (archetype.hasDupatta) {
      const dupattaMat = new THREE.MeshStandardMaterial({ color: archetype.dupattaColor || 0xfbbf24, roughness: 0.55 });
      const dupattaLoop = new THREE.Mesh(
        getPedGeo('pedDupattaLoop', () => new THREE.TorusGeometry(0.105, 0.028, 8, 16)),
        dupattaMat
      );
      dupattaLoop.rotation.x = Math.PI / 2;
      dupattaLoop.position.set(0, 0.878, 0);
      torsoGroup.add(dupattaLoop);

      const dupattaSash = new THREE.Mesh(
        getPedGeo('pedDupattaSash', () => new THREE.BoxGeometry(0.048, 0.28, 0.028)),
        dupattaMat
      );
      dupattaSash.rotation.z = -0.28;
      dupattaSash.position.set(0.05, 0.728, 0.092);
      torsoGroup.add(dupattaSash);
    }
    if (archetype.hasSareePallu) {
      const goldMat = new THREE.MeshStandardMaterial({ color: archetype.goldColor || 0xfacc15, roughness: 0.4, metalness: 0.4 });
      const pallu = new THREE.Mesh(
        getPedGeo('pedSareePallu', () => new THREE.CylinderGeometry(0.040, 0.060, 0.34, 8)),
        goldMat
      );
      pallu.rotation.z = -0.32;
      pallu.position.set(0.04, 0.748, 0.095);
      torsoGroup.add(pallu);
    }
    if (archetype.hasBackpack) {
      const packMat = new THREE.MeshStandardMaterial({ color: archetype.backpackColor || 0x1e293b, roughness: 0.7 });
      const packGroup = new THREE.Group();
      packGroup.position.set(0, 0.728, -0.11);

      // Main rounded body
      const packBody = new THREE.Mesh(
        getPedGeo('pedBackpackBody', () => new THREE.BoxGeometry(0.15, 0.18, 0.09)),
        packMat
      );
      packGroup.add(packBody);

      // Curved top dome
      const packDome = new THREE.Mesh(
        getPedGeo('pedBackpackDome', () => new THREE.CylinderGeometry(0.045, 0.045, 0.15, 8)),
        packMat
      );
      packDome.rotation.z = Math.PI / 2;
      packDome.position.set(0, 0.09, 0);
      packGroup.add(packDome);

      // Ergonomic shoulder straps wrapping over shoulders
      const strapMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
      [-0.05, 0.05].forEach(sx => {
        const strap = new THREE.Mesh(
          getPedGeo('pedBackpackStrap', () => new THREE.BoxGeometry(0.022, 0.20, 0.05)),
          strapMat
        );
        strap.position.set(sx, 0.04, 0.04);
        packGroup.add(strap);
      });

      torsoGroup.add(packGroup);
    } else if (archetype.hasTote) {
      const toteMat = new THREE.MeshStandardMaterial({ color: archetype.toteColor || 0x475569, roughness: 0.7 });
      const tote = new THREE.Mesh(
        getPedGeo('pedTote', () => new THREE.BoxGeometry(0.07, 0.18, 0.15)),
        toteMat
      );
      tote.position.set(-0.15, 0.668, 0.04);
      torsoGroup.add(tote);
    }

    // Articulated Arms (Pivoting at shoulders x = ±0.145, y = 0.879)
    let leftElbowPivot = null;
    let rightElbowPivot = null;
    let rightHandMesh = null;

    function buildArm(isRight) {
      const armPivot = new THREE.Group();
      armPivot.name = isRight ? 'rightArmPivot' : 'leftArmPivot';
      armPivot.position.set(isRight ? 0.145 : -0.145, 0.879, 0);

      // Embedded Spherical Shoulder Cap
      const shoulderCap = new THREE.Mesh(
        getPedGeo('pedShoulderCap', () => new THREE.SphereGeometry(0.044, 8, 6)),
        topMat
      );
      armPivot.add(shoulderCap);

      // Upper Arm Cylinder (centered at y = -0.09, reaches down to -0.18)
      const upperArm = new THREE.Mesh(
        getPedGeo('pedUpperArm', () => new THREE.CylinderGeometry(0.036, 0.031, 0.18, 8)),
        topMat
      );
      upperArm.position.set(0, -0.09, 0);
      armPivot.add(upperArm);

      if (isRight) {
        // Articulated Right Elbow Pivot Group at y = -0.18 inside rightArmPivot
        rightElbowPivot = new THREE.Group();
        rightElbowPivot.name = 'rightElbowPivot';
        rightElbowPivot.position.set(0, -0.18, 0);
        armPivot.add(rightElbowPivot);

        // Elbow Sphere at (0, 0, 0)
        const elbow = new THREE.Mesh(
          getPedGeo('pedElbowR', () => new THREE.SphereGeometry(0.030, 8, 6)),
          topMat
        );
        rightElbowPivot.add(elbow);

        // Forearm Cylinder centered at (0, -0.085, 0)
        const forearm = new THREE.Mesh(
          getPedGeo('pedForearmR', () => new THREE.CylinderGeometry(0.029, 0.024, 0.17, 8)),
          skinMat
        );
        forearm.position.set(0, -0.085, 0);
        rightElbowPivot.add(forearm);

        // Right Hand Sphere at (0, -0.175, 0)
        rightHandMesh = new THREE.Mesh(
          getPedGeo('pedRightHand', () => new THREE.SphereGeometry(0.029, 8, 6)),
          skinMat
        );
        rightHandMesh.position.set(0, -0.175, 0);
        rightElbowPivot.add(rightHandMesh);

        // Default dry resting elbow angle
        rightElbowPivot.rotation.set(-0.22, 0, 0);
      } else {
        // Articulated Left Elbow Pivot Group at y = -0.18 inside leftArmPivot
        leftElbowPivot = new THREE.Group();
        leftElbowPivot.name = 'leftElbowPivot';
        leftElbowPivot.position.set(0, -0.18, 0);
        armPivot.add(leftElbowPivot);

        const elbow = new THREE.Mesh(
          getPedGeo('pedElbow', () => new THREE.SphereGeometry(0.030, 8, 6)),
          topMat
        );
        leftElbowPivot.add(elbow);

        const forearm = new THREE.Mesh(
          getPedGeo('pedForearm', () => new THREE.CylinderGeometry(0.029, 0.024, 0.17, 8)),
          skinMat
        );
        forearm.position.set(0, -0.085, 0);
        leftElbowPivot.add(forearm);

        const hand = new THREE.Mesh(
          getPedGeo('pedHand', () => new THREE.SphereGeometry(0.028, 8, 6)),
          skinMat
        );
        hand.position.set(0, -0.175, 0);
        leftElbowPivot.add(hand);

        leftElbowPivot.rotation.set(-0.18, 0, 0);
      }

      return armPivot;
    }

    const leftArmPivot = buildArm(false);
    const rightArmPivot = buildArm(true);
    torsoGroup.add(leftArmPivot);
    torsoGroup.add(rightArmPivot);

    // Procedural Overhead Rain Umbrella (Canopy apex at Y = 1.434, Hand grip at Y = 0.723)
    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.position.set(0, 0, 0);

    // Domed Overhead Canopy (apex at Y = 1.434, rim at Y = 1.234, leaves clean gap above head)
    const umbrellaCanopy = new THREE.Mesh(
      getPedGeo('pedUmbrellaCanopy', () => new THREE.SphereGeometry(0.38, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.38)),
      new THREE.MeshStandardMaterial({
        color: [0x1e293b, 0x0f172a, 0x1e3a8a, 0x7f1d1d][styleSeed % 4],
        roughness: 0.35,
        side: THREE.DoubleSide
      })
    );
    umbrellaCanopy.position.set(0, 1.134, 0.03);
    umbrellaGroup.add(umbrellaCanopy);

    // Top Finial Tip at Y = 1.464
    const finial = new THREE.Mesh(
      getPedGeo('pedUmbrellaFinial', () => new THREE.CylinderGeometry(0.008, 0.004, 0.06, 6)),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
    );
    finial.position.set(0, 1.464, 0.03);
    umbrellaGroup.add(finial);

    // Vertical Metal Shaft (extends from hand grip at (0.106, 0.723, 0.247) up to canopy (0, 1.434, 0.03))
    const pHand = new THREE.Vector3(0.106, 0.723, 0.247);
    const pCanopy = new THREE.Vector3(0, 1.434, 0.03);
    const shaftVec = new THREE.Vector3().subVectors(pCanopy, pHand);
    const shaftMid = new THREE.Vector3().addVectors(pHand, pCanopy).multiplyScalar(0.5);

    const shaftMesh = new THREE.Mesh(
      getPedGeo('pedUmbrellaShaft', () => new THREE.CylinderGeometry(0.008, 0.008, 0.75, 6)),
      new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.2 })
    );
    shaftMesh.position.copy(shaftMid);
    shaftMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shaftVec.clone().normalize());
    umbrellaGroup.add(shaftMesh);

    // Curved J-Handle Grip at Hand (hooks neatly below hand from y = 0.723 down to 0.673)
    const jHandle = new THREE.Mesh(
      getPedGeo('pedUmbrellaHandle', () => new THREE.TorusGeometry(0.022, 0.008, 6, 10, Math.PI)),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 })
    );
    jHandle.rotation.z = Math.PI;
    jHandle.position.set(0.106, 0.698, 0.247);
    umbrellaGroup.add(jHandle);

    umbrellaGroup.visible = false;

    // =========================================================================
    // 3. CONNECTED NECK & HEAD (Y = 0.90 to Y = 1.18 — ZERO FLOATING HEAD GAP!)
    // =========================================================================
    // Neck Cylinder: Centered at (0, 0.939, 0), embedded firmly into shoulder yoke at 0.933
    const neck = new THREE.Mesh(
      getPedGeo('pedNeck', () => new THREE.CylinderGeometry(0.036, 0.042, 0.08, 8)),
      skinMat
    );
    neck.name = 'neck';
    neck.position.set(0, 0.939, 0);
    torsoGroup.add(neck);

    // Shirt Collar Ring: Encircles neck base right at shoulders
    const collarRing = new THREE.Mesh(
      getPedGeo('pedCollar', () => new THREE.TorusGeometry(0.044, 0.012, 6, 12)),
      topMat
    );
    collarRing.name = 'collarRing';
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.set(0, 0.924, 0);
    torsoGroup.add(collarRing);

    // Head Group: Positioned at y = 1.059 (chin at 0.954 overlaps neck top at 0.979 — ZERO GAP!)
    const headGroup = new THREE.Group();
    headGroup.name = 'headGroup';
    headGroup.position.set(0, 1.059, 0);
    torsoGroup.add(headGroup);

    // Head Sphere: Radius 0.10, scaled (0.92, 1.05, 0.95), front skin surface at z ≈ 0.095
    const head = new THREE.Mesh(
      getPedGeo('pedHead', () => new THREE.SphereGeometry(0.10, 14, 12)),
      skinMat
    );
    head.scale.set(0.92, 1.05, 0.95);
    head.position.set(0, 0, 0);
    headGroup.add(head);

    // =========================================================================
    // 4. NATURAL SCULPTED HAIR & OPEN-FACE HIJAB (100% Exposed Warm Skin Face)
    // =========================================================================
    if (archetype.hasHijab) {
      const hijabMat = new THREE.MeshStandardMaterial({
        color: archetype.hijabColor || 0xfef3c7,
        roughness: 0.75
      });
      // 1. Back & Crown Hijab Hood (Shifted backward on -Z, covers back/crown/sides only)
      const hijabHood = new THREE.Mesh(
        getPedGeo('pedHijabHood', () => new THREE.SphereGeometry(0.106, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65)),
        hijabMat
      );
      hijabHood.rotation.x = -0.58;
      hijabHood.position.set(0, 0.008, -0.024);
      headGroup.add(hijabHood);

      // 2. Oval Face-Framing Hijab Trim (Torus neatly framing forehead hairline, cheekbones & chin)
      const faceRing = new THREE.Mesh(
        getPedGeo('pedHijabRing', () => new THREE.TorusGeometry(0.088, 0.015, 8, 16)),
        hijabMat
      );
      faceRing.scale.set(0.88, 1.06, 0.72);
      faceRing.position.set(0, 0.002, 0.056);
      headGroup.add(faceRing);

      // 3. Under-Chin Neck & Chest Drape (Placed on bodyRoot strictly BELOW chin)
      const shoulderDrape = new THREE.Mesh(
        getPedGeo('pedHijabDrape', () => new THREE.CylinderGeometry(0.062, 0.125, 0.12, 12)),
        hijabMat
      );
      shoulderDrape.position.set(0, 0.908, -0.005);
      bodyRoot.add(shoulderDrape);
    } else if (archetype.hasCap) {
      const capMat = new THREE.MeshStandardMaterial({ color: archetype.capColor || 0x1e3a8a, roughness: 0.6 });
      const capDome = new THREE.Mesh(
        getPedGeo('pedCapDome', () => new THREE.SphereGeometry(0.104, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45)),
        capMat
      );
      capDome.rotation.x = -0.20;
      capDome.position.set(0, 0.018, -0.008);
      headGroup.add(capDome);

      const capBrim = new THREE.Mesh(
        getPedGeo('pedCapBrim', () => new THREE.CylinderGeometry(0.075, 0.075, 0.010, 8, 1, false, 0, Math.PI)),
        capMat
      );
      capBrim.rotation.x = 0.20;
      capBrim.position.set(0, 0.015, 0.082);
      headGroup.add(capBrim);
    } else {
      // Natural Two-Part Hair Sculpture: Uncovered Forehead + Full Back/Side Coverage
      const crownHair = new THREE.Mesh(
        getPedGeo('pedCrownHair', () => new THREE.SphereGeometry(0.104, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.42)),
        hairMat
      );
      crownHair.rotation.x = -0.42;
      crownHair.position.set(0, 0.018, -0.010);
      headGroup.add(crownHair);

      const backHair = new THREE.Mesh(
        getPedGeo('pedBackHair', () => new THREE.SphereGeometry(0.103, 12, 10)),
        hairMat
      );
      backHair.scale.set(0.93, 0.96, 0.82);
      backHair.position.set(0, -0.005, -0.022);
      headGroup.add(backHair);

      if (archetype.hairStyle === 'bun') {
        const bun = new THREE.Mesh(
          getPedGeo('pedBun', () => new THREE.SphereGeometry(0.048, 10, 10)),
          hairMat
        );
        bun.position.set(0, 0.010, -0.105);
        headGroup.add(bun);
      }

      if (archetype.hasPigtails) {
        [-0.105, 0.105].forEach(xPig => {
          const pigtail = new THREE.Mesh(
            getPedGeo('pedPigtail', () => new THREE.SphereGeometry(0.034, 8, 6)),
            hairMat
          );
          pigtail.position.set(xPig, 0.010, -0.028);
          headGroup.add(pigtail);
        });
        if (archetype.hasHairband) {
          const bandMat = new THREE.MeshStandardMaterial({ color: archetype.hairbandColor || 0xfbbf24, roughness: 0.5 });
          const hairband = new THREE.Mesh(
            getPedGeo('pedHairband', () => new THREE.TorusGeometry(0.105, 0.012, 6, 14)),
            bandMat
          );
          hairband.rotation.x = Math.PI / 2;
          hairband.position.set(0, 0.018, 0.010);
          headGroup.add(hairband);
        }
      }
    }

    // =========================================================================
    // 5. FLUSH-MOUNTED FACIAL FEATURES (Directly on Skin Surface at z ≈ 0.088–0.095)
    // =========================================================================
    // Eyes: White Sclera Spheres Embedded into Face + Dark Pupils
    [-0.032, 0.032].forEach((xEye, sideIdx) => {
      const eye = new THREE.Mesh(
        getPedGeo('pedEye', () => new THREE.SphereGeometry(0.012, 6, 6)),
        sharedMats.eyeWhite
      );
      eye.position.set(xEye, 0.012, 0.086);
      headGroup.add(eye);

      const pupil = new THREE.Mesh(
        getPedGeo('pedPupil', () => new THREE.SphereGeometry(0.006, 6, 6)),
        sharedMats.pupil
      );
      pupil.position.set(xEye, 0.012, 0.094);
      headGroup.add(pupil);

      // Flush Eyebrows
      const brow = new THREE.Mesh(
        getPedGeo('pedBrow', () => new THREE.BoxGeometry(0.024, 0.005, 0.005)),
        browMat
      );
      brow.position.set(xEye, 0.032, 0.090);
      brow.rotation.z = sideIdx === 0 ? -0.08 : 0.08;
      headGroup.add(brow);
    });

    // Flush Rounded Nose Bridge (ZERO cone spike!)
    const nose = new THREE.Mesh(
      getPedGeo('pedNose', () => new THREE.SphereGeometry(0.011, 6, 6)),
      skinMat
    );
    nose.scale.set(0.75, 1.25, 0.85);
    nose.position.set(0, -0.006, 0.094);
    headGroup.add(nose);

    // Subtle Flush Lips (ZERO protruding pink block!)
    const lips = new THREE.Mesh(
      getPedGeo('pedLips', () => new THREE.BoxGeometry(0.024, 0.007, 0.006)),
      lipMat
    );
    lips.position.set(0, -0.036, 0.088);
    headGroup.add(lips);

    // Flush Ears
    [-0.092, 0.092].forEach(xEar => {
      const ear = new THREE.Mesh(
        getPedGeo('pedEar', () => new THREE.SphereGeometry(0.016, 6, 6)),
        skinMat
      );
      ear.scale.set(0.5, 1.1, 0.7);
      ear.position.set(xEar, 0.00, -0.005);
      headGroup.add(ear);
    });

    // Adult Men Facial Hair (Flush mustache / beard)
    if (archetype.hasMustache) {
      const mustache = new THREE.Mesh(
        getPedGeo('pedMustache', () => new THREE.BoxGeometry(0.038, 0.008, 0.008)),
        hairMat
      );
      mustache.position.set(0, -0.024, 0.092);
      headGroup.add(mustache);
    }
    if (archetype.hasBeard) {
      const beard = new THREE.Mesh(
        getPedGeo('pedBeard', () => new THREE.CylinderGeometry(0.032, 0.022, 0.045, 8)),
        hairMat
      );
      beard.position.set(0, -0.075, 0.068);
      headGroup.add(beard);
    }

    // Auto-clamp every pedestrian's shoe soles to exact Y = 0.000 using THREE.Box3 (Zero Floating)
    leftLegData.legPivot.rotation.set(0, 0, 0);
    rightLegData.legPivot.rotation.set(0, 0, 0);
    leftLegData.kneePivot.rotation.set(0, 0, 0);
    rightLegData.kneePivot.rotation.set(0, 0, 0);
    leftLegData.anklePivot.rotation.set(0, 0, 0);
    rightLegData.anklePivot.rotation.set(0, 0, 0);
    bodyRoot.updateMatrixWorld(true);

    const bbox = new THREE.Box3().setFromObject(bodyRoot);
    const shoeBottomY = bbox.min.y;
    bodyRoot.position.y -= shoeBottomY; // Shifts bodyRoot down so the bottom of the white shoe soles sits at exact Y = 0.000
    bodyRoot.userData.groundedBaseY = bodyRoot.position.y;

    // Consolidate ~38 articulated procedural parts into ONE single vertex-colored SkinnedMesh (1 draw call)
    const boneDefs = [
      { obj: bodyRoot },
      { obj: pelvisGroup },
      { obj: torsoGroup },
      { obj: headGroup },
      { obj: leftLegData.legPivot },
      { obj: leftLegData.kneePivot },
      { obj: leftLegData.anklePivot },
      { obj: rightLegData.legPivot },
      { obj: rightLegData.kneePivot },
      { obj: rightLegData.anklePivot },
      { obj: leftArmPivot },
      { obj: leftElbowPivot },
      { obj: rightArmPivot },
      { obj: rightElbowPivot }
    ];
    const bones = [];
    const objToBoneIdx = new Map();
    for (let bi = 0; bi < boneDefs.length; bi++) {
      const targetObj = boneDefs[bi].obj;
      if (!targetObj) {
        bones.push(new THREE.Bone());
        continue;
      }
      const bone = new THREE.Bone();
      targetObj.add(bone);
      bones.push(bone);
      objToBoneIdx.set(targetObj, bi);
    }

    bodyRoot.updateMatrixWorld(true);
    const invBodyRoot = new THREE.Matrix4().copy(bodyRoot.matrixWorld).invert();
    const skinPieces = [];
    const meshesToStrip = [];

    bodyRoot.traverse(node => {
      if (node.isMesh && !node.isSkinnedMesh && node.geometry && node.material) {
        let cur = node.parent;
        let bIdx = 0;
        while (cur && cur !== group) {
          if (objToBoneIdx.has(cur)) {
            bIdx = objToBoneIdx.get(cur);
            break;
          }
          cur = cur.parent;
        }
        const relMat = new THREE.Matrix4().multiplyMatrices(invBodyRoot, node.matrixWorld);
        const col = (node.material && node.material.color) ? node.material.color : 0xffffff;
        skinPieces.push({
          geometry: node.geometry,
          matrix: relMat,
          color: col,
          skinBoneIdx: bIdx
        });
        meshesToStrip.push(node);
      }
    });

    for (let mi = 0; mi < meshesToStrip.length; mi++) {
      const m = meshesToStrip[mi];
      if (m.parent) m.parent.remove(m);
    }

    const mergedBodyGeo = mergePiecesToBufferGeometry(skinPieces, false);
    if (mergedBodyGeo) {
      mergedBodyGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.65);
      const skinMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        vertexColors: true,
        skinning: true
      });
      const skinnedBody = new THREE.SkinnedMesh(mergedBodyGeo, skinMat);
      skinnedBody.castShadow = false;
      skinnedBody.receiveShadow = false;
      skinnedBody.frustumCulled = true;
      skinnedBody.userData.isPedestrian = true;
      bodyRoot.updateMatrixWorld(true);
      const skel = new THREE.Skeleton(bones);
      skinnedBody.bind(skel);
      bodyRoot.add(skinnedBody);
    }

    // Optimize rain umbrella into 1 single vertex-colored mesh and attach after skinning
    optimizeStaticSubtree(umbrellaGroup);
    umbrellaGroup.traverse(c => {
      if (c.isMesh) {
        c.castShadow = false;
        c.receiveShadow = false;
      }
    });
    bodyRoot.add(umbrellaGroup);

    // Register shared InstancedMesh ground contact shadow disc (all walkers share 1 draw call)
    const shadowScale = BASE_SCALE * archetype.scale * 0.13;
    registerPedShadowDisc(group, shadowScale);

    // Drive with AnimationMixer (Mocap Keyframe Clips)
    ensureSharedMocapClips();
    const mixer = new THREE.AnimationMixer(bodyRoot);
    const walkAction = mixer.clipAction(sharedMocapWalkClip);
    const idleAction = mixer.clipAction(sharedMocapIdleClip);
    walkAction.setLoop(THREE.LoopRepeat);
    idleAction.setLoop(THREE.LoopRepeat);
    walkAction.play();

    // Save pivot references for live walking kinematics
    group.userData.pelvisGroup = pelvisGroup;
    group.userData.upperTorsoGroup = torsoGroup;
    group.userData.torso = torsoGroup;
    group.userData.headGroup = headGroup;
    group.userData.leftLegPivot = leftLegData.legPivot;
    group.userData.leftLeg = leftLegData.legPivot;
    group.userData.rightLegPivot = rightLegData.legPivot;
    group.userData.rightLeg = rightLegData.legPivot;
    group.userData.leftKneePivot = leftLegData.kneePivot;
    group.userData.leftKnee = leftLegData.kneePivot;
    group.userData.leftAnklePivot = leftLegData.anklePivot;
    group.userData.rightAnklePivot = rightLegData.anklePivot;
    group.userData.leftArmPivot = leftArmPivot;
    group.userData.leftArm = leftArmPivot;
    group.userData.leftElbowPivot = leftElbowPivot;
    group.userData.leftElbow = leftElbowPivot;
    group.userData.rightArmPivot = rightArmPivot;
    group.userData.rightArm = rightArmPivot;
    group.userData.rightElbowPivot = rightElbowPivot;
    group.userData.rightElbow = rightElbowPivot;
    group.userData.rightHand = rightHandMesh;
    group.userData.bodyRoot = bodyRoot;
    group.userData.umbrella = umbrellaGroup;
    group.userData.pedScale = archetype.scale;
    group.userData.baseScale = BASE_SCALE;
    group.userData.isPedestrian = true;
    const cat = (p && (p.isChild || p.pedCategory === 'child')) ? 'child' : ((p && (p.pedCategory === 'female' || p.isFemale || archetype.isFemale)) ? 'female' : 'male');
    group.userData.pedCategory = cat;
    if (p) {
      p.pedCategory = cat;
    }
    group.userData.mixer = mixer;
    group.userData.walkAction = walkAction;
    group.userData.idleAction = idleAction;
    group.userData.currentAction = 'walk';

    boneDefs.forEach(bd => {
      if (bd.obj) bd.obj.matrixAutoUpdate = true;
    });
    umbrellaGroup.matrixAutoUpdate = true;

    if (isSocial) {
      walkAction.stop();
      idleAction.play();
      group.userData.currentAction = 'idle';
      leftLegData.legPivot.rotation.x = (Math.random() - 0.5) * 0.16;
      rightLegData.legPivot.rotation.x = -leftLegData.legPivot.rotation.x;
      leftArmPivot.rotation.z = 0.06 + Math.random() * 0.08;
      rightArmPivot.rotation.z = -0.06 - Math.random() * 0.08;
      leftLegData.kneePivot.rotation.x = Math.max(0, -leftLegData.legPivot.rotation.x * 0.4);
      rightLegData.kneePivot.rotation.x = Math.max(0, -rightLegData.legPivot.rotation.x * 0.4);
    }

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(group);
    }
    return group;
  }
  window.createArticulatedHuman = createArticulatedHuman;

  function registerPedShadowDisc(rootObj, worldRadiusScale) {
    if (!rootObj) return;
    if (!pedShadowInst && typeof scene !== 'undefined' && scene && scene.add) {
      const geo = new THREE.CircleGeometry(1.0, 12);
      const mats = getPedSharedMats();
      pedShadowInst = new THREE.InstancedMesh(geo, mats.shadow, 48);
      pedShadowInst.count = 0;
      pedShadowInst.frustumCulled = false;
      pedShadowInst.castShadow = false;
      pedShadowInst.receiveShadow = false;
      scene.add(pedShadowInst);
    }
    for (let i = 0; i < pedShadowEntries.length; i++) {
      if (pedShadowEntries[i].root === rootObj) {
        pedShadowEntries[i].scale = worldRadiusScale;
        return;
      }
    }
    pedShadowEntries.push({ root: rootObj, scale: worldRadiusScale });
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
    if (obj.isMesh) {
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
    if (obj.children && obj.children.length > 0) {
      for (let i = 0; i < obj.children.length; i++) {
        freezeStatic(obj.children[i]);
      }
    }
  }

  // Texture generator helpers (Cached & Atlas-ready)
  const signboardTextureCache = {};
  function drawSignboardToCtx(ctx, dx, dy, cw, ch, title, subtitle, bgColor, textColor, subColor, borderColor) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.fillStyle = bgColor || '#0f172a';
    ctx.fillRect(0, 0, cw, ch);

    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = Math.max(2, Math.floor(ch * 0.06));
      ctx.strokeRect(2, 2, cw - 4, ch - 4);
    }

    ctx.fillStyle = textColor || '#ffffff';
    ctx.font = 'bold ' + Math.floor(ch * 0.42) + "px 'Noto Sans Bengali', 'Hind Siliguri', 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, cw / 2, subtitle ? ch * 0.38 : ch / 2, cw - 12);

    if (subtitle) {
      ctx.fillStyle = subColor || '#38bdf8';
      ctx.font = 'bold ' + Math.floor(ch * 0.25) + "px 'Segoe UI', sans-serif";
      ctx.fillText(subtitle, cw / 2, ch * 0.76, cw - 12);
    }
    ctx.restore();
  }

  function createSignboardTexture(title, subtitle, bgColor, textColor, subColor, borderColor, width, height) {
    const cacheKey = `${title}|${subtitle}|${bgColor}|${textColor}|${subColor}|${borderColor}|${width}|${height}`;
    if (signboardTextureCache[cacheKey]) return signboardTextureCache[cacheKey];
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(512, (width || 256));
    canvas.height = Math.min(128, (height || 64));
    const ctx = canvas.getContext('2d');
    drawSignboardToCtx(ctx, 0, 0, canvas.width, canvas.height, title, subtitle, bgColor, textColor, subColor, borderColor);

    const texture = new THREE.CanvasTexture(canvas);
    setupCrispCanvasTexture(texture);
    signboardTextureCache[cacheKey] = texture;
    return texture;
  }

  const windowFacadeTextureCache = {};
  function drawWindowFacadeToCtx(ctx, dx, dy, size, floors, cols, winColor, wallColor) {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.fillStyle = wallColor || '#0d9488';
    ctx.fillRect(0, 0, size, size);

    const fCount = Math.max(1, floors);
    const cCount = Math.max(1, cols);
    const floorH = size / fCount;
    const colW = size / cCount;
    const s = size / 512;

    for (let f = 0; f < fCount; f++) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, f * floorH + floorH - Math.max(1.5, 6 * s), size, Math.max(1.5, 6 * s));

      for (let c = 0; c < cCount; c++) {
        const x = c * colW + colW * 0.15;
        const y = f * floorH + floorH * 0.16;
        const w = colW * 0.70;
        const h = floorH * 0.64;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);

        const hash = Math.sin((f + 1) * 37.1 + (c + 1) * 19.3);
        const isLit = (hash - Math.floor(hash)) > 0.25;

        if (isLit) {
          ctx.fillStyle = winColor || '#fde68a';
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.80)';
          ctx.fillRect(x + w * 0.5 - 0.75, y, 1.5, h);
          ctx.fillRect(x, y + h * 0.45 - 0.75, w, 1.5);
        } else {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
          ctx.fillRect(x, y, w * 0.55, h * 0.35);
          ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
          ctx.fillRect(x + w * 0.5 - 0.75, y, 1.5, h);
        }
      }
    }
    ctx.restore();
  }

  function createWindowFacadeTexture(floors, cols, winColor, wallColor) {
    const key = `${floors}|${cols}|${winColor}|${wallColor}`;
    if (windowFacadeTextureCache[key]) return windowFacadeTextureCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    drawWindowFacadeToCtx(ctx, 0, 0, 256, floors, cols, winColor, wallColor);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    windowFacadeTextureCache[key] = texture;
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
  let cachedRoadCanvasTex = null;
  function createRoadCanvasTexture() {
    if (cachedRoadCanvasTex) return cachedRoadCanvasTex;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Base Slate-Charcoal Asphalt Surface + Tiled 128x128 Pattern Grain (< 2ms)
    const grainTile = document.createElement('canvas');
    grainTile.width = 128;
    grainTile.height = 128;
    const gctx = grainTile.getContext('2d');
    gctx.fillStyle = '#1e242b';
    gctx.fillRect(0, 0, 128, 128);
    gctx.fillStyle = 'rgba(255, 255, 255, 0.024)';
    for (let i = 0; i < 360; i++) {
      gctx.fillRect((Math.random() * 128) | 0, (Math.random() * 128) | 0, 1, 1);
    }
    gctx.fillStyle = 'rgba(0, 0, 0, 0.045)';
    for (let i = 0; i < 420; i++) {
      gctx.fillRect((Math.random() * 128) | 0, (Math.random() * 128) | 0, 2, 2);
    }
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat') || '#1e242b';
    ctx.fillRect(0, 0, 1024, 1024);

    const cx = 512, cy = 512;
    const scale = 0.64; // 1024 / 1600

    const toPx = (wx) => cx + wx * scale;
    const toPy = (wz) => cy + wz * scale;

    // 2. Darker Tire-Wear Paths in Lane Centers
    ctx.fillStyle = 'rgba(15, 20, 28, 0.45)';
    [18, 48, -15, -52].forEach(wz => {
      const py = toPy(wz);
      ctx.fillRect(0, py - 6, toPx(-140), 12);
      ctx.fillRect(toPx(140), py - 6, 1024 - toPx(140), 12);
    });
    [-20, -58, 18, 56].forEach(wx => {
      const px = toPx(wx);
      ctx.fillRect(px - 6, 0, 12, toPy(-115));
      ctx.fillRect(px - 6, toPy(115), 12, 1024 - toPy(115));
    });

    // 3. Double Yellow Center Lines (Non-glowing #f59e0b)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;

    // East-West double center line
    [-2.5, 2.5].forEach(offset => {
      const py = toPy(offset);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(toPx(-140), py);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toPx(140), py);
      ctx.lineTo(1024, py);
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
      ctx.lineTo(px, 1024);
      ctx.stroke();
    });

    // 4. White Dashed Outer Lane Divider Markings
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([10, 9]);

    [38, -38].forEach(wz => {
      const py = toPy(wz);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(toPx(-140), py);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(toPx(140), py);
      ctx.lineTo(1024, py);
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
      ctx.lineTo(px, 1024);
      ctx.stroke();
    });

    ctx.setLineDash([]); // Reset dash

    // 5. Solid White Stop Bars
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(toPx(-135) - 2, toPy(0), 4, (78 * scale));
    ctx.fillRect(toPx(135) - 2, toPy(-78), 4, (78 * scale));
    ctx.fillRect(toPx(-78), toPy(-105) - 2, (78 * scale), 4);
    ctx.fillRect(toPx(0), toPy(105) - 2, (78 * scale), 4);

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
    ctx.lineWidth = 1.8;
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
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(boxX1, boxY1, boxW, boxH);
    ctx.restore();

    // 8. Directional White Lane Markings (Straight, Left, Right turn arrows)
    function drawRoadArrow(px, py, angleRad, type) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angleRad);
      ctx.scale(0.5, 0.5);
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#f8fafc';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (type === 'straight') {
        ctx.fillRect(-3.2, -8, 6.4, 28);
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
        ctx.fillRect(-3, -8, 6, 28);
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(11, -8);
        ctx.lineTo(-11, -8);
        ctx.closePath();
        ctx.fill();
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
        ctx.fillRect(-3, -8, 6, 28);
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(11, -8);
        ctx.lineTo(-11, -8);
        ctx.closePath();
        ctx.fill();
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

    [-210, -320].forEach(x => {
      drawRoadArrow(toPx(x), toPy(18), Math.PI / 2, 'straight-right');
      drawRoadArrow(toPx(x), toPy(48), Math.PI / 2, 'straight-left');
    });
    [210, 320].forEach(x => {
      drawRoadArrow(toPx(x), toPy(-18), -Math.PI / 2, 'straight-right');
      drawRoadArrow(toPx(x), toPy(-48), -Math.PI / 2, 'straight-left');
    });
    [-170, -270].forEach(z => {
      drawRoadArrow(toPx(-20), toPy(z), Math.PI, 'straight-right');
      drawRoadArrow(toPx(-58), toPy(z), Math.PI, 'straight-left');
    });
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
      ctx.fillStyle = '#14181f';
      ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
      ctx.strokeStyle = '#0a0d12';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
    });

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
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    cachedRoadCanvasTex = texture;
    return texture;
  }

  // Sidewalk Corners with Curbs & Pedestrian Safety Railings (Batched into 1 merged draw call)
  let railingMat = null;
  let pendingSidewalkPieces = null;
  function beginSidewalkBatch() {
    pendingSidewalkPieces = [];
  }
  function flushSidewalkBatch() {
    if (!pendingSidewalkPieces || pendingSidewalkPieces.length === 0) return null;
    const geo = mergePiecesToBufferGeometry(pendingSidewalkPieces, false);
    pendingSidewalkPieces = null;
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    if (typeof scene !== 'undefined' && scene && scene.add) scene.add(mesh);
    return mesh;
  }

  function addSidewalkCorner(w, d, x, z) {
    const swColor = 0x2d333b;
    const curbColor = 0x3e4652;
    const railColor = 0xfacc15;
    const cornerSignZ = z > 0 ? 1 : -1;
    const cornerSignX = x > 0 ? 1 : -1;
    const railX = cornerSignX * 138;
    const railZ = cornerSignZ * 108;
    const postGeo = getPedGeo('swRailPost', () => new THREE.CylinderGeometry(0.35, 0.35, 6, 6));
    const barGeo = getPedGeo('swRailBar', () => new THREE.CylinderGeometry(0.24, 0.24, 26, 6));

    if (pendingSidewalkPieces) {
      const mSw = new THREE.Matrix4().makeTranslation(x, 1, z);
      pendingSidewalkPieces.push({ geometry: new THREE.BoxGeometry(w, 2, d), matrix: mSw, color: swColor });

      const mCurb = new THREE.Matrix4().makeTranslation(x, 1.025, z > 0 ? z - d / 2 : z + d / 2);
      pendingSidewalkPieces.push({ geometry: new THREE.BoxGeometry(w, 2.05, 3), matrix: mCurb, color: curbColor });

      [-12, 0, 12].forEach(pOff => {
        const mp = new THREE.Matrix4().makeTranslation(railX + (cornerSignX > 0 ? -Math.abs(pOff) : Math.abs(pOff)), 5, railZ);
        pendingSidewalkPieces.push({ geometry: postGeo, matrix: mp, color: railColor });
      });
      [4.5, 7.2].forEach(by => {
        const mb = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
        mb.setPosition(railX - cornerSignX * 6, by, railZ);
        pendingSidewalkPieces.push({ geometry: barGeo, matrix: mb, color: railColor });
      });
      return;
    }

    if (!sidewalkMat) sidewalkMat = new THREE.MeshLambertMaterial({ color: swColor });
    if (!curbMat) curbMat = new THREE.MeshLambertMaterial({ color: curbColor });
    if (!railingMat) railingMat = new THREE.MeshLambertMaterial({ color: railColor });

    const sw = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), sidewalkMat);
    sw.position.set(x, 1, z);
    freezeStatic(sw);
    scene.add(sw);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(w, 2.05, 3), curbMat);
    curb.position.set(x, 1.025, z > 0 ? z - d / 2 : z + d / 2);
    freezeStatic(curb);
    scene.add(curb);

    const railGroup = new THREE.Group();
    [-12, 0, 12].forEach(pOff => {
      const post = new THREE.Mesh(postGeo, railingMat);
      post.position.set(railX + (cornerSignX > 0 ? -Math.abs(pOff) : Math.abs(pOff)), 5, railZ);
      railGroup.add(post);
    });
    [4.5, 7.2].forEach(by => {
      const bar = new THREE.Mesh(barGeo, railingMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(railX - cornerSignX * 6, by, railZ);
      railGroup.add(bar);
    });
    freezeStatic(railGroup);
    scene.add(railGroup);
  }

  // Multi-Layered Organic Dhaka Trees (Batched across 2 InstancedMeshes: 40 trunks + 200 spheres = 2 calls!)
  let organicTreeMats = null;
  const TREE_GREENS = [0x16a34a, 0x22c55e, 0x15803d, 0x4ade80];
  let treeCanopyBaseGeo = null;
  function addTree(x, z) {
    if (!treeTrunksInst && typeof scene !== 'undefined' && scene && scene.add) {
      if (!treeTrunkGeo) treeTrunkGeo = new THREE.CylinderGeometry(0.7, 1.0, 8, 8);
      if (!treeCanopyBaseGeo) treeCanopyBaseGeo = new THREE.SphereGeometry(1.0, 12, 8);
      const tMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      treeTrunksInst = new THREE.InstancedMesh(treeTrunkGeo, tMat, 48);
      treeTrunksInst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(48 * 3), 3);
      treeTrunksInst.count = 0;
      treeTrunksInst.castShadow = false;
      treeTrunksInst.receiveShadow = false;
      treeTrunksInst.matrixAutoUpdate = false;
      treeTrunksInst.updateMatrix();
      scene.add(treeTrunksInst);

      const cMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x0b2a14, emissiveIntensity: 0.25 });
      treeCanopiesInst = new THREE.InstancedMesh(treeCanopyBaseGeo, cMat, 240);
      treeCanopiesInst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(240 * 3), 3);
      treeCanopiesInst.count = 0;
      treeCanopiesInst.castShadow = false;
      treeCanopiesInst.receiveShadow = false;
      treeCanopiesInst.matrixAutoUpdate = false;
      treeCanopiesInst.updateMatrix();
      scene.add(treeCanopiesInst);
    }

    const trunkIdx = treeTrunksInst.count;
    if (trunkIdx < 48) {
      _instPos.set(x, 6, z);
      _instQuat.identity();
      _instScale.set(1, 1, 1);
      _instMat4.compose(_instPos, _instQuat, _instScale);
      treeTrunksInst.setMatrixAt(trunkIdx, _instMat4);
      _mergeColor.setHex(0x4a2e18);
      treeTrunksInst.setColorAt(trunkIdx, _mergeColor);
      treeTrunksInst.count = trunkIdx + 1;
      treeTrunksInst.instanceMatrix.needsUpdate = true;
      if (treeTrunksInst.instanceColor) treeTrunksInst.instanceColor.needsUpdate = true;
    }

    const clusters = [
      { x: 0, y: 12.0, z: 0, r: 2.8, m: 0 },
      { x: -1.4, y: 11.2, z: 1.1, r: 2.3, m: 1 },
      { x: 1.4, y: 11.4, z: -1.0, r: 2.2, m: 2 },
      { x: -1.0, y: 11.7, z: -1.2, r: 2.1, m: 3 },
      { x: 1.2, y: 12.4, z: 1.0, r: 2.0, m: 1 }
    ];
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      const ci = treeCanopiesInst.count;
      if (ci >= 240) break;
      _instPos.set(x + c.x, c.y, z + c.z);
      _instQuat.identity();
      _instScale.set(c.r, c.r, c.r);
      _instMat4.compose(_instPos, _instQuat, _instScale);
      treeCanopiesInst.setMatrixAt(ci, _instMat4);
      _mergeColor.setHex(TREE_GREENS[c.m % TREE_GREENS.length]);
      treeCanopiesInst.setColorAt(ci, _mergeColor);
      treeCanopiesInst.count = ci + 1;
    }
    treeCanopiesInst.instanceMatrix.needsUpdate = true;
    if (treeCanopiesInst.instanceColor) treeCanopiesInst.instanceColor.needsUpdate = true;
  }

  // Realistic Dhaka Rooftop Texture (Cached singletons)
  const roofTextureCache = {};
  function getRoofCanvasTexture(baseColorHex) {
    if (!roofTextureCache[baseColorHex]) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = baseColorHex || '#475569';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 128; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
      }
      for (let y = 0; y <= 128; y += 16) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 124, 124);

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      roofTextureCache[baseColorHex] = tex;
    }
    return roofTextureCache[baseColorHex];
  }

  // Unified Mirpur 10 City Batching & Atlas Engine (17 buildings -> 4 draw calls total!)
  let activeCityCollector = null;
  function beginCityBatch() {
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 1024;
    fCanvas.height = 1024;
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 1024;
    sCanvas.height = 512;

    activeCityCollector = {
      facadeCanvas: fCanvas,
      facadeCtx: fCanvas.getContext('2d'),
      facadeSlotMap: {},
      nextFacadeSlot: 0,
      signCanvas: sCanvas,
      signCtx: sCanvas.getContext('2d'),
      signSlotMap: {},
      nextSignSlot: 0,
      facadePieces: [],
      signPieces: [],
      opaquePieces: [],
      neonPieces: []
    };
  }

  function allocFacadeUvRect(col, floors, cols, winColor, wallColor) {
    const key = `${floors}|${cols}|${winColor}|${wallColor}`;
    if (col.facadeSlotMap[key]) return col.facadeSlotMap[key];
    const slotIdx = Math.min(63, col.nextFacadeSlot++);
    const gx = slotIdx % 8;
    const gy = Math.floor(slotIdx / 8);
    const cell = 128;
    drawWindowFacadeToCtx(col.facadeCtx, gx * cell, gy * cell, cell, floors, cols, winColor, wallColor);
    const pad = 2;
    const u0 = (gx * cell + pad) / 1024;
    const du = (cell - pad * 2) / 1024;
    const v0 = 1 - ((gy + 1) * cell - pad) / 1024;
    const dv = (cell - pad * 2) / 1024;
    const rect = [u0, v0, du, dv];
    col.facadeSlotMap[key] = rect;
    return rect;
  }

  function allocSignUvRect(col, title, subtitle, bgColor, textColor, subColor, borderColor) {
    const key = `${title}|${subtitle}|${bgColor}|${textColor}|${subColor}|${borderColor}`;
    if (col.signSlotMap[key]) return col.signSlotMap[key];
    const slotIdx = Math.min(23, col.nextSignSlot++);
    const gx = slotIdx % 4;
    const gy = Math.floor(slotIdx / 4);
    const cw = 256, ch = 85;
    drawSignboardToCtx(col.signCtx, gx * cw, gy * ch, cw, ch, title, subtitle, bgColor, textColor, subColor, borderColor);
    const pad = 2;
    const u0 = (gx * cw + pad) / 1024;
    const du = (cw - pad * 2) / 1024;
    const v0 = 1 - ((gy + 1) * ch - pad) / 512;
    const dv = (ch - pad * 2) / 512;
    const rect = [u0, v0, du, dv];
    col.signSlotMap[key] = rect;
    return rect;
  }

  function extractBoxFaceNonIdx(w, h, d, faceIndices) {
    const box = new THREE.BoxGeometry(w, h, d);
    const nonIdx = box.toNonIndexed();
    box.dispose();
    const pos = nonIdx.attributes.position.array;
    const nrm = nonIdx.attributes.normal.array;
    const uv = nonIdx.attributes.uv.array;
    const vertsPerFace = 6;
    const total = faceIndices.length * vertsPerFace;
    const pArr = new Float32Array(total * 3);
    const nArr = new Float32Array(total * 3);
    const uArr = new Float32Array(total * 2);
    for (let i = 0; i < faceIndices.length; i++) {
      const srcV = faceIndices[i] * vertsPerFace;
      const dstV = i * vertsPerFace;
      pArr.set(pos.subarray(srcV * 3, (srcV + vertsPerFace) * 3), dstV * 3);
      nArr.set(nrm.subarray(srcV * 3, (srcV + vertsPerFace) * 3), dstV * 3);
      uArr.set(uv.subarray(srcV * 2, (srcV + vertsPerFace) * 2), dstV * 2);
    }
    nonIdx.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uArr, 2));
    return g;
  }

  function pushBoxSignToCity(worldMatrix, w, h, d, title, subtitle, bg, textCol, subCol, border) {
    if (!activeCityCollector) return;
    const col = activeCityCollector;
    const rect = allocSignUvRect(col, title, subtitle, bg, textCol, subCol, border);
    // Front (+Z=4) and Back (-Z=5) carry the signboard canvas
    const faceGeo = extractBoxFaceNonIdx(w, h, d, [4, 5]);
    col.signPieces.push({ geometry: faceGeo, matrix: worldMatrix, color: 0xffffff, uvRect: rect });
    // Edge frame (+X/-X/+Y/-Y)
    const rimGeo = extractBoxFaceNonIdx(w, h, d, [0, 1, 2, 3]);
    const frameCol = bg || '#0f172a';
    _mergeColor.set(frameCol);
    col.opaquePieces.push({ geometry: rimGeo, matrix: worldMatrix, color: _mergeColor.clone() });
  }

  function flushCityBatch() {
    if (!activeCityCollector) return;
    const col = activeCityCollector;
    activeCityCollector = null;

    if (col.facadePieces.length > 0) {
      const fTex = new THREE.CanvasTexture(col.facadeCanvas);
      fTex.minFilter = THREE.LinearFilter;
      fTex.needsUpdate = true;
      const fGeo = mergePiecesToBufferGeometry(col.facadePieces, true);
      if (fGeo) {
        cityFacadeMat = new THREE.MeshLambertMaterial({
          map: fTex,
          color: 0xffffff,
          emissive: new THREE.Color(0xfbbf24),
          emissiveMap: fTex,
          emissiveIntensity: 0.40
        });
        const fMesh = new THREE.Mesh(fGeo, cityFacadeMat);
        freezeStatic(fMesh);
        scene.add(fMesh);
      }
      col.facadePieces.forEach(p => { if (p.geometry) p.geometry.dispose(); });
    }

    if (col.signPieces.length > 0) {
      const sTex = new THREE.CanvasTexture(col.signCanvas);
      setupCrispCanvasTexture(sTex);
      const sGeo = mergePiecesToBufferGeometry(col.signPieces, true);
      if (sGeo) {
        const sMesh = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ map: sTex }));
        freezeStatic(sMesh);
        scene.add(sMesh);
      }
      col.signPieces.forEach(p => { if (p.geometry) p.geometry.dispose(); });
    }

    if (col.opaquePieces.length > 0) {
      const oGeo = mergePiecesToBufferGeometry(col.opaquePieces, false);
      if (oGeo) {
        const oMesh = new THREE.Mesh(oGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
        freezeStatic(oMesh);
        scene.add(oMesh);
      }
    }

    if (col.neonPieces.length > 0) {
      const nGeo = mergePiecesToBufferGeometry(col.neonPieces, false);
      if (nGeo) {
        const nMesh = new THREE.Mesh(nGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }));
        freezeStatic(nMesh);
        scene.add(nMesh);
      }
    }
  }

  // 3D Building Builder — Batched City Architecture when activeCityCollector is present
  function create3DBuilding(config) {
    const {
      x, z, width, depth, height,
      wallColor, sideColor, roofColor,
      floors, cols, winColor,
      signboard, waterTank, antenna
    } = config;

    buildingNameCounter += 1;
    const displayName = config.name || `MIRPUR BLOCK ${String(buildingNameCounter).padStart(2, '0')}`;
    const numFloors = floors || 4;
    const vcColors = ['#a7f3d0', '#0d9488', '#fda4af', '#fef3c7'];
    const chosenWallColor = wallColor || vcColors[Math.abs(Math.floor(x * 0.05 + z * 0.03)) % vcColors.length];
    const chosenSideColor = sideColor || chosenWallColor;
    const chosenWinColor = winColor || '#fde68a';

    const h1 = height * 0.36;
    const h2 = height * 0.40;
    const h3 = height * 0.24;
    const w1 = width;
    const d1 = depth;
    const w2 = Math.max(16, width * 0.88);
    const d2 = Math.max(16, depth * 0.88);
    const w3 = Math.max(12, width * 0.74);
    const d3 = Math.max(12, depth * 0.74);
    const isSouth = z > 0;
    const roofHexStr = roofColor || (isSouth ? '#52525b' : '#3f3f46');

    if (activeCityCollector) {
      const col = activeCityCollector;
      const bRootM = new THREE.Matrix4().makeTranslation(x, 0, z);
      const pushTier = (tw, th, td, ty, frontF, frontC, sideF, sideC) => {
        const m = new THREE.Matrix4().makeTranslation(0, ty, 0);
        m.premultiply(bRootM);
        const fRect = allocFacadeUvRect(col, frontF, frontC, chosenWinColor, chosenWallColor);
        const sRect = allocFacadeUvRect(col, sideF, sideC, chosenWinColor, chosenSideColor);
        col.facadePieces.push({ geometry: extractBoxFaceNonIdx(tw, th, td, [4, 5]), matrix: m, color: 0xffffff, uvRect: fRect });
        col.facadePieces.push({ geometry: extractBoxFaceNonIdx(tw, th, td, [0, 1]), matrix: m, color: 0xffffff, uvRect: sRect });
        _mergeColor.set(roofHexStr);
        col.opaquePieces.push({ geometry: extractBoxFaceNonIdx(tw, th, td, [2]), matrix: m, color: _mergeColor.clone() });
      };

      pushTier(w1, h1, d1, h1 / 2, Math.max(1, Math.round(numFloors * 0.36)), cols || 4, Math.max(1, Math.round(numFloors * 0.36)), Math.max(2, Math.floor((cols || 4) * 0.6)));
      pushTier(w2, h2, d2, h1 + h2 / 2, Math.max(1, Math.round(numFloors * 0.40)), Math.max(2, (cols || 4) - 1), Math.max(1, Math.round(numFloors * 0.40)), Math.max(2, Math.floor((cols || 4) * 0.5)));
      pushTier(w3, h3, d3, h1 + h2 + h3 / 2, Math.max(1, Math.round(numFloors * 0.24)), Math.max(2, (cols || 4) - 2), Math.max(1, Math.round(numFloors * 0.24)), Math.max(2, Math.floor((cols || 4) * 0.4)));

      const addOpBox = (bw, bh, bd, lx, ly, lz, hex, rx = 0) => {
        const lm = new THREE.Matrix4().makeRotationX(rx);
        lm.setPosition(x + lx, ly, z + lz);
        col.opaquePieces.push({ geometry: new THREE.BoxGeometry(bw, bh, bd), matrix: lm, color: hex });
      };
      addOpBox(w1 + 3.5, 1.6, d1 + 3.5, 0, h1, 0, 0x1e293b);
      addOpBox(w2 + 2.5, 1.4, d2 + 2.5, 0, h1 + h2, 0, 0x334155);
      _mergeColor.set(chosenWallColor);
      addOpBox(w3 + 1.6, 2.4, d3 + 1.6, 0, height + 1.2, 0, _mergeColor.getHex());
      addOpBox(w3 * 0.55, 4.8, d3 * 0.55, 0, height + 2.4, 0, 0x334155);

      const neonPalette = [0xff007f, 0x00f5d4, 0x39ff14, 0xfacc15];
      const neonHex = neonPalette[Math.abs(Math.floor((x * 11 + z * 17) / 100)) % neonPalette.length];
      const frontZ1 = isSouth ? (-(d1 + 3.5) / 2) : ((d1 + 3.5) / 2);
      const frontZ2 = isSouth ? (-(d2 + 2.5) / 2) : ((d2 + 2.5) / 2);
      const frontZ3 = isSouth ? (-(d3 + 1.8) / 2) : ((d3 + 1.8) / 2);

      const addNeonCyl = (r, len, lx, ly, lz, rotZ, hex) => {
        const lm = rotZ ? new THREE.Matrix4().makeRotationZ(rotZ) : new THREE.Matrix4();
        lm.setPosition(x + lx, ly, z + lz);
        col.neonPieces.push({ geometry: new THREE.CylinderGeometry(r, r, len, 6), matrix: lm, color: hex });
      };
      addNeonCyl(0.42, w1 + 3.2, 0, h1 + 0.8, frontZ1, Math.PI / 2, neonHex);
      addNeonCyl(0.38, w2 + 2.2, 0, h1 + h2 + 0.7, frontZ2, Math.PI / 2, neonHex);
      addNeonCyl(0.34, w3 + 1.4, 0, height + 0.5, frontZ3, Math.PI / 2, neonHex);
      [-w2 / 2 + 0.5, w2 / 2 - 0.5].forEach(px => {
        addNeonCyl(0.32, h2, px, h1 + h2 / 2, isSouth ? (-d2 / 2 - 0.3) : (d2 / 2 + 0.3), 0, neonHex);
      });

      const acGeo = getPedGeo('bldgACUnit', () => new THREE.BoxGeometry(3.6, 2.4, 2.0));
      for (let f = 1; f < Math.min(numFloors, 4); f++) {
        const sideX = (f % 2 === 0) ? (w1 / 2 - 6) : (-w1 / 2 + 6);
        const lm = new THREE.Matrix4().makeTranslation(x + sideX, f * (h1 / 2) + 2.0, z + frontZ1 + (isSouth ? -1.0 : 1.0));
        col.opaquePieces.push({ geometry: acGeo, matrix: lm, color: 0x94a3b8 });
      }

      if (waterTank) {
        const tm = new THREE.Matrix4().makeTranslation(x - w3 * 0.25, height + 9, z - d3 * 0.15);
        col.opaquePieces.push({ geometry: getPedGeo('bldgTank', () => new THREE.CylinderGeometry(7, 7, 12, 12)), matrix: tm, color: 0x0284c7 });
        const legGeo = getPedGeo('bldgTankLeg', () => new THREE.CylinderGeometry(0.7, 0.7, 5, 6));
        [-3.5, 3.5].forEach(lx => {
          [-3.5, 3.5].forEach(lz => {
            col.opaquePieces.push({ geometry: legGeo, matrix: new THREE.Matrix4().makeTranslation(x - w3 * 0.25 + lx, height + 2.5, z - d3 * 0.15 + lz), color: 0x475569 });
          });
        });
      }

      if (antenna) {
        col.opaquePieces.push({ geometry: getPedGeo('bldgAnt', () => new THREE.CylinderGeometry(0.5, 1.0, 26, 6)), matrix: new THREE.Matrix4().makeTranslation(x + w3 * 0.25, height + 13, z - d3 * 0.15), color: 0x94a3b8 });
        col.neonPieces.push({ geometry: getPedGeo('bldgBeacon', () => new THREE.SphereGeometry(1.6, 6, 6)), matrix: new THREE.Matrix4().makeTranslation(x + w3 * 0.25, height + 26, z - d3 * 0.15), color: 0xff1744 });
      }

      const buildingSign = signboard || {
        text: displayName, sub: 'Mirpur 10 · Dhaka', bg: '#0f172a', textCol: '#fff7ed', subCol: '#fbbf24', border: '#fb923c',
        w: Math.min(110, Math.max(50, w1 * 0.78)), h: 13, y: 13
      };
      const signZ = isSouth ? (-(d1 / 2) - 2.0) : ((d1 / 2) + 2.0);
      const sw = buildingSign.w || (w1 * 0.75), sh = buildingSign.h || 16;
      const sm = new THREE.Matrix4().makeRotationY(isSouth ? Math.PI : 0);
      sm.setPosition(x + (buildingSign.ox || 0), buildingSign.y || 15, z + signZ);
      pushBoxSignToCity(sm, sw, sh, 2.5, buildingSign.text, buildingSign.sub, buildingSign.bg, buildingSign.textCol, buildingSign.subCol, buildingSign.border);

      if (isSouth) {
        const sm2 = new THREE.Matrix4().makeTranslation(x + (buildingSign.ox || 0), (buildingSign.y || 15) + 4, z + (d1 / 2) + 2.0);
        pushBoxSignToCity(sm2, sw, sh, 2.5, buildingSign.text, buildingSign.sub, buildingSign.bg, buildingSign.textCol, buildingSign.subCol, buildingSign.border);
      }
      if (buildingSign.awnCol) {
        const awnZ = isSouth ? (-(d1 / 2) - 4.5) : ((d1 / 2) + 4.5);
        addOpBox(sw + 3, 2.8, 8, buildingSign.ox || 0, (buildingSign.y || 15) + sh / 2 + 1.4, awnZ, buildingSign.awnCol, isSouth ? -0.25 : 0.25);
      }
      return { position: new THREE.Vector3(x, 0, z), add: function() {} };
    }

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const frontTex1 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.36)), cols || 4, chosenWinColor, chosenWallColor);
    const frontTex2 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.40)), Math.max(2, (cols || 4) - 1), chosenWinColor, chosenWallColor);
    const frontTex3 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.24)), Math.max(2, (cols || 4) - 2), chosenWinColor, chosenWallColor);
    const sideTex1 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.36)), Math.max(2, Math.floor((cols || 4) * 0.6)), chosenWinColor, chosenSideColor);
    const sideTex2 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.40)), Math.max(2, Math.floor((cols || 4) * 0.5)), chosenWinColor, chosenSideColor);
    const sideTex3 = createWindowFacadeTexture(Math.max(1, Math.round(numFloors * 0.24)), Math.max(2, Math.floor((cols || 4) * 0.4)), chosenWinColor, chosenSideColor);

    function createTierMaterials(frontT, sideT) {
      const frontM = new THREE.MeshLambertMaterial({ map: frontT, emissive: new THREE.Color(0xfbbf24), emissiveMap: frontT, emissiveIntensity: 0.45 });
      const sideM = new THREE.MeshLambertMaterial({ map: sideT, emissive: new THREE.Color(0xfbbf24), emissiveMap: sideT, emissiveIntensity: 0.35 });
      const roofT = getRoofCanvasTexture(roofHexStr);
      const roofM = new THREE.MeshLambertMaterial({ map: roofT });
      const botM = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      return [sideM, sideM, roofM, botM, frontM, frontM];
    }

    const tier1Mesh = new THREE.Mesh(new THREE.BoxGeometry(w1, h1, d1), createTierMaterials(frontTex1, sideTex1));
    tier1Mesh.position.y = h1 / 2;
    group.add(tier1Mesh);
    const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(w1 + 3.5, 1.6, d1 + 3.5), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    canopyMesh.position.y = h1;
    group.add(canopyMesh);
    const tier2Mesh = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), createTierMaterials(frontTex2, sideTex2));
    tier2Mesh.position.y = h1 + h2 / 2;
    group.add(tier2Mesh);
    const cornice2 = new THREE.Mesh(new THREE.BoxGeometry(w2 + 2.5, 1.4, d2 + 2.5), new THREE.MeshLambertMaterial({ color: 0x334155 }));
    cornice2.position.y = h1 + h2;
    group.add(cornice2);
    const tier3Mesh = new THREE.Mesh(new THREE.BoxGeometry(w3, h3, d3), createTierMaterials(frontTex3, sideTex3));
    tier3Mesh.position.y = h1 + h2 + h3 / 2;
    group.add(tier3Mesh);
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(w3 + 1.6, 2.4, d3 + 1.6), new THREE.MeshLambertMaterial({ color: chosenWallColor }));
    parapet.position.y = height + 1.2;
    group.add(parapet);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w3 * 0.55, 4.8, d3 * 0.55), new THREE.MeshLambertMaterial({ color: 0x334155 }));
    crown.position.y = height + 2.4;
    group.add(crown);

    const neonPalette = [0xff007f, 0x00f5d4, 0x39ff14, 0xfacc15];
    const neonHex = neonPalette[Math.abs(Math.floor((x * 11 + z * 17) / 100)) % neonPalette.length];
    const neonMat = new THREE.MeshBasicMaterial({ color: neonHex });
    const frontZ1 = isSouth ? (-(d1 + 3.5) / 2) : ((d1 + 3.5) / 2);
    const frontZ2 = isSouth ? (-(d2 + 2.5) / 2) : ((d2 + 2.5) / 2);
    const frontZ3 = isSouth ? (-(d3 + 1.8) / 2) : ((d3 + 1.8) / 2);
    const neonStrip1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, w1 + 3.2, 6), neonMat);
    neonStrip1.rotation.z = Math.PI / 2; neonStrip1.position.set(0, h1 + 0.8, frontZ1); group.add(neonStrip1);
    const neonStrip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, w2 + 2.2, 6), neonMat);
    neonStrip2.rotation.z = Math.PI / 2; neonStrip2.position.set(0, h1 + h2 + 0.7, frontZ2); group.add(neonStrip2);
    const neonStrip3 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, w3 + 1.4, 6), neonMat);
    neonStrip3.rotation.z = Math.PI / 2; neonStrip3.position.set(0, height + 0.5, frontZ3); group.add(neonStrip3);

    freezeStatic(group);
    if (typeof scene !== 'undefined' && scene && scene.add) scene.add(group);
    return group;
  }

  // 3D Traffic Signal Post Builder (Posts batched + 12 lamps instanced = 2 draw calls total!)
  let pendingSignalPostPieces = null;
  function beginSignalBatch() {
    pendingSignalPostPieces = [];
    signalLampMatrices.length = 0;
  }
  function flushSignalBatch() {
    if (pendingSignalPostPieces && pendingSignalPostPieces.length > 0) {
      const geo = mergePiecesToBufferGeometry(pendingSignalPostPieces, false);
      pendingSignalPostPieces = null;
      if (geo) {
        const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
        freezeStatic(mesh);
        scene.add(mesh);
      }
    }
    if (!signalBulbsInst && signalLampMatrices.length > 0 && typeof scene !== 'undefined' && scene && scene.add) {
      const lampGeo = new THREE.CircleGeometry(1.8, 12);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      signalBulbsInst = new THREE.InstancedMesh(lampGeo, lampMat, Math.max(12, signalLampMatrices.length));
      signalBulbsInst.count = signalLampMatrices.length;
      signalBulbsInst.castShadow = false;
      signalBulbsInst.receiveShadow = false;
      signalBulbsInst.matrixAutoUpdate = false;
      signalBulbsInst.updateMatrix();
      for (let i = 0; i < signalLampMatrices.length; i++) {
        signalBulbsInst.setMatrixAt(i, signalLampMatrices[i]);
        _mergeColor.setHex(i % 3 === 0 ? 0x200508 : (i % 3 === 1 ? 0x261a02 : 0x02210f));
        signalBulbsInst.setColorAt(i, _mergeColor);
      }
      signalBulbsInst.instanceMatrix.needsUpdate = true;
      if (signalBulbsInst.instanceColor) signalBulbsInst.instanceColor.needsUpdate = true;
      scene.add(signalBulbsInst);
    }
  }

  function createTrafficSignalPost(x, z, rotY) {
    const rotM = new THREE.Matrix4().makeRotationY(rotY || 0);
    rotM.setPosition(x, 0, z);
    const poleGeo = getPedGeo('sigPole', () => new THREE.CylinderGeometry(1.2, 1.5, 32, 8));
    const boxGeo = getPedGeo('sigBox', () => new THREE.BoxGeometry(7, 18, 5));
    const hoodGeo = getPedGeo('sigHood', () => new THREE.BoxGeometry(5.5, 1.2, 4));

    if (pendingSignalPostPieces) {
      pendingSignalPostPieces.push({ geometry: poleGeo, matrix: new THREE.Matrix4().makeTranslation(0, 16, 0).premultiply(rotM), color: 0x1e293b });
      pendingSignalPostPieces.push({ geometry: boxGeo, matrix: new THREE.Matrix4().makeTranslation(0, 26, 0).premultiply(rotM), color: 0x090d16 });
      [32.5, 27.5, 22.5].forEach(hy => {
        pendingSignalPostPieces.push({ geometry: hoodGeo, matrix: new THREE.Matrix4().makeTranslation(0, hy, 2.5).premultiply(rotM), color: 0x090d16 });
      });

      const baseIdx = signalLampMatrices.length;
      [31, 26, 21].forEach(ly => {
        const lm = new THREE.Matrix4().makeTranslation(0, ly, 2.6).premultiply(rotM);
        signalLampMatrices.push(lm);
      });

      const makeBulbProxy = (instIdx, initHex) => {
        const proxyCol = new THREE.Color(initHex);
        return {
          color: {
            setHex: function(hex) {
              proxyCol.setHex(hex);
              if (signalBulbsInst) {
                signalBulbsInst.setColorAt(instIdx, proxyCol);
                if (signalBulbsInst.instanceColor) signalBulbsInst.instanceColor.needsUpdate = true;
              }
            }
          }
        };
      };
      return {
        red: makeBulbProxy(baseIdx, 0x200508),
        yellow: makeBulbProxy(baseIdx + 1, 0x261a02),
        green: makeBulbProxy(baseIdx + 2, 0x02210f)
      };
    }

    const sigGroup = new THREE.Group();
    sigGroup.position.set(x, 0, z);
    sigGroup.rotation.y = rotY || 0;
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x090d16 });
    const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 16; sigGroup.add(pole);
    const box = new THREE.Mesh(boxGeo, boxMat); box.position.set(0, 26, 0); sigGroup.add(box);
    const lampGeo = new THREE.CircleGeometry(1.8, 12);
    const rMat = new THREE.MeshBasicMaterial({ color: 0x200508 });
    const yMat = new THREE.MeshBasicMaterial({ color: 0x261a02 });
    const gMat = new THREE.MeshBasicMaterial({ color: 0x02210f });
    [31, 26, 21].forEach((ly, i) => {
      const m = new THREE.Mesh(lampGeo, i === 0 ? rMat : (i === 1 ? yMat : gMat));
      m.position.set(0, ly, 2.6); sigGroup.add(m);
      const h = new THREE.Mesh(hoodGeo, boxMat);
      h.position.set(0, ly + 1.5, 2.5); sigGroup.add(h);
    });
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

    const bikePackage = getOptimizedBikePackage(variantConfig, appearanceSeed);
    root.add(bikePackage);
    root.userData.bikePackage = bikePackage;

    const BIKE_WORLD_SCALE = 0.60;
    root.userData.wheels = bikePackage.userData.wheels || [];
    root.userData.pooledWheelSlots = bikePackage.userData.pooledWheelSlots || [];
    root.userData.wheelRadius = 3.25 * BIKE_WORLD_SCALE;
    root.userData.modelKey = variantConfig.modelKey;
    root.userData.modelTitle = variantConfig.modelTitle;

    const frontOffset = ((variantConfig.modelKey === 'B' || variantConfig.modelKey === 'D') ? 8.8 : 8.0) + 18;
    root.userData.headPool = registerHeadlightGlow(root, frontOffset * BIKE_WORLD_SCALE, 0.08, 0, 36 * BIKE_WORLD_SCALE, 18 * BIKE_WORLD_SCALE);

    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(root);
    }
    return root;
  }

  const bikeVariantTemplateCache = {};
  function getOptimizedBikePackage(variantConfig, appearanceSeed, reuseWheelSlots) {
    const cacheKey = String(variantConfig.id || variantConfig.modelKey);
    let tmpl = bikeVariantTemplateCache[cacheKey];
    if (!tmpl) {
      const built = buildBikePackage(variantConfig, appearanceSeed);
      const rawWheels = built.userData.wheels || [];
      const wheelPoses = rawWheels.map(w => ({
        position: w.position.clone(),
        rotation: w.rotation.clone(),
        scale: w.scale.clone()
      }));
      const wTmplObjF = rawWheels[0] ? rawWheels[0].clone(true) : null;
      const wTmplObjR = (rawWheels[1] || rawWheels[0]) ? (rawWheels[1] || rawWheels[0]).clone(true) : null;
      if (wTmplObjF) getSharedWheelTemplate('bikeWheelF_' + cacheKey, wTmplObjF);
      if (wTmplObjR) getSharedWheelTemplate('bikeWheelR_' + cacheKey, wTmplObjR);
      rawWheels.forEach(w => { if (w.parent) w.parent.remove(w); });
      optimizeStaticSubtree(built, { packTextures: true });
      const cachedMeshes = [];
      built.traverse(c => { if (c.isMesh) cachedMeshes.push(c); });
      tmpl = { meshes: cachedMeshes, wheelPoses: wheelPoses, wTmplObjF, wTmplObjR };
      bikeVariantTemplateCache[cacheKey] = tmpl;
    }

    const pkg = new THREE.Group();
    pkg.scale.setScalar(0.60);
    pkg.position.set(0, 0, 0);
    tmpl.meshes.forEach(m => {
      const cloneM = new THREE.Mesh(m.geometry, m.material);
      cloneM.castShadow = false; cloneM.receiveShadow = false;
      pkg.add(cloneM);
    });
    const bikeWheels = [];
    if (tmpl.wheelPoses && tmpl.wheelPoses[0]) {
      const fw = attachWheelsFromTemplate(pkg, [tmpl.wheelPoses[0]], 'bikeWheelF_' + cacheKey, tmpl.wTmplObjF);
      if (fw[0]) bikeWheels.push(fw[0]);
    }
    if (tmpl.wheelPoses && tmpl.wheelPoses[1]) {
      const rw = attachWheelsFromTemplate(pkg, [tmpl.wheelPoses[1]], 'bikeWheelR_' + cacheKey, tmpl.wTmplObjR);
      if (rw[0]) bikeWheels.push(rw[0]);
    }
    pkg.userData.wheels = bikeWheels;
    return pkg;
  }

  // Pre-Built Dynamic Variant Swapper on Wrap-Around / Respawn (Zero geometry dispose/re-alloc!)
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

    if (rootMesh.userData.bikePackage) {
      rootMesh.remove(rootMesh.userData.bikePackage);
    }

    const newBikePackage = getOptimizedBikePackage(variantConfig, newIndex, rootMesh.userData.pooledWheelSlots);
    rootMesh.add(newBikePackage);
    rootMesh.userData.bikePackage = newBikePackage;
    rootMesh.userData.wheels = newBikePackage.userData.wheels || [];
    rootMesh.userData.pooledWheelSlots = newBikePackage.userData.pooledWheelSlots || rootMesh.userData.pooledWheelSlots;
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
      updateTrackedVehicleHUD(activeTargetVehicle, true);
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
    if (rickshawInstFleet && rickTemplateWheelPoses) {
      const bb = [0.60, 2.45, 0], crankR = 1.05, lenThigh = 2.30, lenShin = 2.35, wheelRadius = 2.80;
      const wrapper = new THREE.Group();
      wrapper.userData.isRickshaw = true;
      wrapper.userData.wheelRadius = wheelRadius;
      wrapper.userData.wheels = attachWheelsFromTemplate(wrapper, rickTemplateWheelPoses, 'rickWheel', rickTemplateWheelObj);

      const slot = rickshawInstFleet.count < rickshawInstFleet.capacity ? rickshawInstFleet.count++ : 0;
      rickshawInstFleet.layers.forEach(l => { l.inst.count = rickshawInstFleet.count; });
      wrapper.userData.fleet = rickshawInstFleet;
      wrapper.userData.fleetSlot = slot;
      wrapper.userData.fleetHitInst = rickshawInstFleet.hitInst;
      instancedFleetEntries.push({ root: wrapper, fleet: rickshawInstFleet, slot: slot });

      const wCrank = new THREE.Object3D();
      wCrank.position.set(bb[0], bb[1], bb[2]);
      wCrank.userData.noMerge = true;
      wCrank.matrixAutoUpdate = true;
      if (rickCrankTemplateMesh) {
        const cMesh = new THREE.Mesh(rickCrankTemplateMesh.geometry, rickCrankTemplateMesh.material);
        cMesh.userData.noMerge = true;
        wCrank.add(cMesh);
      }
      wrapper.add(wCrank);
      wrapper.userData.pedalCrank = wCrank;

      const wLegs = [];
      [-1, 1].forEach((side) => {
        const hipX = -0.42, hipY = 5.85, legZ = side * 0.85;
        const hipP = new THREE.Object3D(); hipP.position.set(hipX, hipY, legZ);
        hipP.userData.noMerge = true; hipP.matrixAutoUpdate = true;
        if (rickThighTemplateMesh) {
          const tm = new THREE.Mesh(rickThighTemplateMesh.geometry, rickThighTemplateMesh.material);
          tm.userData.noMerge = true;
          hipP.add(tm);
        }
        wrapper.add(hipP);

        const kneeP = new THREE.Object3D(); kneeP.position.set(0, -lenThigh, 0);
        kneeP.userData.noMerge = true; kneeP.matrixAutoUpdate = true;
        if (rickCalfTemplateMesh) {
          const cm = new THREE.Mesh(rickCalfTemplateMesh.geometry, rickCalfTemplateMesh.material);
          cm.userData.noMerge = true;
          kneeP.add(cm);
        }
        hipP.add(kneeP);

        const footP = new THREE.Object3D(); footP.position.set(0, -lenShin, 0);
        footP.userData.noMerge = true; footP.matrixAutoUpdate = true;
        if (rickSandTemplateMesh) {
          const sm = new THREE.Mesh(rickSandTemplateMesh.geometry, rickSandTemplateMesh.material);
          sm.userData.noMerge = true;
          footP.add(sm);
        }
        kneeP.add(footP);

        wLegs.push({ side, hipX, hipY, hipPivot: hipP, kneePivot: kneeP, footPivot: footP });
      });

      wrapper.userData.updatePedaling = function(phase) {
        wCrank.rotation.z = phase;
        for (let i = 0; i < wLegs.length; i++) {
          const leg = wLegs[i];
          const legAngle = leg.side === -1 ? phase : phase + Math.PI;
          const pedalX = bb[0] - Math.sin(legAngle) * crankR;
          const pedalY = bb[1] + Math.cos(legAngle) * crankR;
          const dx = pedalX - leg.hipX, dy = pedalY - leg.hipY;
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
        }
      };
      wrapper.userData.updatePedaling(0);

      return wrapper;
    }

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
    const fHands = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), femaleSkinMat);
    fHands.scale.set(1.2, 0.45, 1.4);
    fHands.position.set(2.25, 0.36, 0);
    femaleGroup.add(fHands);

    group.add(femaleGroup);

    if (!rickshawInstFleet) {
      const refLeg = pullerLegs[0];
      if (crankGroup && !rickCrankTemplateMesh) {
        const crankCopy = crankGroup.clone(true);
        crankCopy.position.set(0, 0, 0); crankCopy.rotation.set(0, 0, 0);
        const co = optimizeStaticSubtree(crankCopy, { forceSingleMesh: true });
        if (co.litOpaque) rickCrankTemplateMesh = co.litOpaque;
      }
      if (refLeg && refLeg.hipPivot && !rickThighTemplateMesh) {
        const thighTmp = new THREE.Group();
        refLeg.hipPivot.children.forEach(ch => { if (ch !== refLeg.kneePivot) thighTmp.add(ch.clone(true)); });
        const to = optimizeStaticSubtree(thighTmp, { forceSingleMesh: true });
        if (to.litOpaque) rickThighTemplateMesh = to.litOpaque;
      }
      if (refLeg && refLeg.kneePivot && !rickCalfTemplateMesh) {
        const calfTmp = new THREE.Group();
        refLeg.kneePivot.children.forEach(ch => { if (ch !== refLeg.footPivot) calfTmp.add(ch.clone(true)); });
        const co2 = optimizeStaticSubtree(calfTmp, { forceSingleMesh: true });
        if (co2.litOpaque) rickCalfTemplateMesh = co2.litOpaque;
      }
      if (refLeg && refLeg.footPivot && !rickSandTemplateMesh) {
        const sandTmp = refLeg.footPivot.clone(true);
        sandTmp.position.set(0, 0, 0); sandTmp.rotation.set(0, 0, 0);
        const so = optimizeStaticSubtree(sandTmp, { forceSingleMesh: true });
        if (so.litOpaque) rickSandTemplateMesh = so.litOpaque;
      }

      const rawWheels = group.userData.wheels || [];
      rickTemplateWheelPoses = rawWheels.map(w => ({
        position: w.position.clone(), rotation: w.rotation.clone(), scale: w.scale.clone()
      }));
      rickTemplateWheelObj = rawWheels[0] ? rawWheels[0].clone(true) : null;
      if (rickTemplateWheelObj) getSharedWheelTemplate('rickWheel', rickTemplateWheelObj);
      rawWheels.forEach(w => { if (w.parent) w.parent.remove(w); });
      if (crankGroup && crankGroup.parent) crankGroup.parent.remove(crankGroup);
      pullerLegs.forEach(lg => { if (lg.hipPivot && lg.hipPivot.parent) lg.hipPivot.parent.remove(lg.hipPivot); });

      optimizeStaticSubtree(group, { packTextures: true });
      rickshawInstFleet = createInstancedFleetFromTemplate(group, 8);
    }

    const wrapper = new THREE.Group();
    wrapper.userData.isRickshaw = true;
    wrapper.userData.wheelRadius = wheelRadius;
    wrapper.userData.wheels = attachWheelPivotsFromTemplatePoses(wrapper, rickTemplateWheelPoses, 'rickWheel', 1, 24, wheelRadius);

    const slot = rickshawInstFleet.count < rickshawInstFleet.capacity ? rickshawInstFleet.count++ : 0;
    rickshawInstFleet.layers.forEach(l => { l.inst.count = rickshawInstFleet.count; });
    wrapper.userData.fleet = rickshawInstFleet;
    wrapper.userData.fleetSlot = slot;
    wrapper.userData.fleetHitInst = rickshawInstFleet.hitInst;
    instancedFleetEntries.push({ root: wrapper, fleet: rickshawInstFleet, slot: slot });

    // Lightweight hierarchy-only pedaling pivots driving rickCrankPool / rickThighPool / rickCalfPool / rickSandPool
    const wCrank = new THREE.Object3D();
    wCrank.position.set(bb[0], bb[1], bb[2]);
    wrapper.add(wCrank);
    wrapper.userData.pedalCrank = wCrank;

    const wLegs = [];
    const baseLimbCount = rickshawPedalEntries.length * 2;
    [-1, 1].forEach((side, li) => {
      const hipX = -0.42, hipY = 5.85, legZ = side * 0.85;
      const hipP = new THREE.Object3D(); hipP.position.set(hipX, hipY, legZ); wrapper.add(hipP);
      const kneeP = new THREE.Object3D(); kneeP.position.set(0, -lenThigh, 0); hipP.add(kneeP);
      const footP = new THREE.Object3D(); footP.position.set(0, -lenShin, 0); kneeP.add(footP);
      wLegs.push({ side, hipX, hipY, hipPivot: hipP, kneePivot: kneeP, footPivot: footP, limbSlot: baseLimbCount + li });
    });
    if (rickCrankPool) rickCrankPool.count = rickshawPedalEntries.length + 1;
    if (rickThighPool) rickThighPool.count = baseLimbCount + wLegs.length;
    if (rickCalfPool) rickCalfPool.count = baseLimbCount + wLegs.length;
    if (rickSandPool) rickSandPool.count = baseLimbCount + wLegs.length;

    rickshawPedalEntries.push({ crankGroup: wCrank, crankSlot: rickshawPedalEntries.length, legs: wLegs });

    wrapper.userData.updatePedaling = function(phase) {
      wCrank.rotation.z = phase;
      for (let i = 0; i < wLegs.length; i++) {
        const leg = wLegs[i];
        const legAngle = leg.side === -1 ? phase : phase + Math.PI;
        const pedalX = bb[0] - Math.sin(legAngle) * crankR;
        const pedalY = bb[1] + Math.cos(legAngle) * crankR;
        const dx = pedalX - leg.hipX, dy = pedalY - leg.hipY;
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
      }
    };
    wrapper.userData.updatePedaling(0);

    return wrapper;
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
    if (cngInstFleet && cngTemplateWheelPoses) {
      const CNG_WORLD_SCALE = 1.14;
      const wheelRadius = 1.85;
      const root = new THREE.Group();
      const pkgPivot = new THREE.Group();
      pkgPivot.scale.setScalar(CNG_WORLD_SCALE);
      pkgPivot.position.set(0, 0, 0);
      root.add(pkgPivot);

      const cngWheels = attachWheelsFromTemplate(pkgPivot, cngTemplateWheelPoses, 'cngWheel', cngTemplateWheelObj);
      const slot = cngInstFleet.count < cngInstFleet.capacity ? cngInstFleet.count++ : 0;
      cngInstFleet.layers.forEach(l => { l.inst.count = cngInstFleet.count; });
      root.userData.fleet = cngInstFleet;
      root.userData.fleetSlot = slot;
      root.userData.fleetHitInst = cngInstFleet.hitInst;
      instancedFleetEntries.push({ root: root, localScaleObj: pkgPivot, fleet: cngInstFleet, slot: slot });

      root.userData.wheels = cngWheels;
      root.userData.wheelRadius = wheelRadius * CNG_WORLD_SCALE;
      return root;
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

      const glassMat = new THREE.MeshLambertMaterial({
        color: 0xecfdf5,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
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
      if (!cngInstFleet) {
        const rawWheels = cngPackage.userData.wheels || [];
        cngTemplateWheelPoses = rawWheels.map(w => ({
          position: w.position.clone(), rotation: w.rotation.clone(), scale: w.scale.clone()
        }));
        cngTemplateWheelObj = rawWheels[0] ? rawWheels[0].clone(true) : null;
        if (cngTemplateWheelObj) getSharedWheelTemplate('cngWheel', cngTemplateWheelObj);
        rawWheels.forEach(w => { if (w.parent) w.parent.remove(w); });
        optimizeStaticSubtree(cngPackage, { packTextures: true });
        cngInstFleet = createInstancedFleetFromTemplate(cngPackage, 8);
      }

      const pkgPivot = new THREE.Group();
      pkgPivot.scale.setScalar(CNG_WORLD_SCALE);
      pkgPivot.position.set(0, 0, 0);
      root.add(pkgPivot);

      const pooledWheels = attachWheelPivotsFromTemplatePoses(pkgPivot, cngTemplateWheelPoses, 'cngWheel', 1, 24, wheelRadius);
      const slot = cngInstFleet.count < cngInstFleet.capacity ? cngInstFleet.count++ : 0;
      cngInstFleet.layers.forEach(l => { l.inst.count = cngInstFleet.count; });
      root.userData.fleet = cngInstFleet;
      root.userData.fleetSlot = slot;
      root.userData.fleetHitInst = cngInstFleet.hitInst;
      instancedFleetEntries.push({ root: root, localScaleObj: pkgPivot, fleet: cngInstFleet, slot: slot });

      root.userData.wheels = pooledWheels;
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
    if (type === 'bus') {
      const bus = buildHasanTransitBus(vData);
      if (typeof scene !== 'undefined' && scene && scene.add) scene.add(bus);
      return bus;
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
      return buildHasanTransitBus(vData);
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
        const legs = person.userData.pedalLegs;
        for (let i = 0; i < legs.length; i++) {
          const leg = legs[i];
          const legPhase = phase + (leg.side > 0 ? 0 : Math.PI);
          _legP.set(1.45 * Math.cos(legPhase), 1.45 * Math.sin(legPhase), leg.side * 1.12)
            .add(_legPivot)
            .sub(person.position);

          _legH.set(leg.hip[0], leg.hip[1], leg.hip[2]);
          _legDiff.subVectors(_legP, _legH);
          const D = Math.max(0.6, Math.min(_legDiff.length(), leg.lenThigh + leg.lenShin - 0.05));

          const cosAlpha = Math.max(-1, Math.min(1, (leg.lenThigh * leg.lenThigh + D * D - leg.lenShin * leg.lenShin) / (2 * leg.lenThigh * D)));
          const alpha = Math.acos(cosAlpha);

          _legDir.copy(_legDiff).normalize();
          _legNorm.set(-_legDir.y, _legDir.x, 0).normalize();
          if (_legNorm.x < 0) _legNorm.negate();

          _legK.copy(_legH)
            .addScaledVector(_legDir, leg.lenThigh * Math.cos(alpha))
            .addScaledVector(_legNorm, leg.lenThigh * Math.sin(alpha));

          _legThighDir.subVectors(_legK, _legH).normalize();
          leg.thigh.position.copy(_legH).add(_legK).multiplyScalar(0.5);
          leg.thigh.quaternion.setFromUnitVectors(_legUp, _legThighDir);

          _legShinDir.subVectors(_legP, _legK).normalize();
          leg.shin.position.copy(_legK).add(_legP).multiplyScalar(0.5);
          leg.shin.quaternion.setFromUnitVectors(_legUp, _legShinDir);

          leg.shoe.position.set(_legP.x + 0.15, _legP.y, _legP.z);
        }
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
    return Promise.resolve(null); // Pure Three.js procedural Hasan Transit Bus is authoritative (zero GLB)
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

  // =========================================================================
  // RIGGED .GLB BASE MESHES & MIXAMO MOCAP PEDESTRIAN SUBSYSTEM
  // Supports ped-male.glb, ped-female.glb, ped-child.glb with AnimationMixer
  // and 100% seamless fallback to procedural pedestrians.
  // =========================================================================
  const riggedGLBPromises = {};
  const riggedPedPrototypes = { male: null, female: null, child: null };
  let activeRiggedWalkerCount = 0;

  // Fallback SkeletonUtils clone helper to guarantee skeleton cloning even without CDN
  if (typeof THREE !== 'undefined' && !THREE.SkeletonUtils) {
    THREE.SkeletonUtils = {
      clone: function (source) {
        if (!source || !source.isObject3D) return null;
        pruneNullChildren(source);
        const sourceLookup = new Map();
        const cloneLookup = new Map();
        const clone = source.clone();
        pruneNullChildren(clone);
        function parallelTraverse(a, b) {
          if (!a || !b) return;
          sourceLookup.set(b, a);
          cloneLookup.set(a, b);
          for (let i = 0; i < a.children.length; i++) {
            if (a.children[i] && b.children && b.children[i]) {
              parallelTraverse(a.children[i], b.children[i]);
            }
          }
        }
        parallelTraverse(source, clone);
        clone.traverse(node => {
          if (!node || !node.isSkinnedMesh) return;
          if (node.morphTargetDictionary !== undefined) {
            node.morphTargetDictionary = Object.assign({}, node.morphTargetDictionary);
          }
          const skeleton = node.skeleton;
          if (!skeleton) return;
          const orderedBones = [];
          for (let i = 0; i < skeleton.bones.length; ++i) {
            const clonedBone = cloneLookup.get(skeleton.bones[i]);
            orderedBones.push(clonedBone || skeleton.bones[i]);
          }
          node.bind(new THREE.Skeleton(orderedBones, skeleton.boneInverses), node.matrixWorld);
        });
        pruneNullChildren(clone);
        return clone;
      }
    };
  } else if (typeof THREE !== 'undefined' && THREE.SkeletonUtils && typeof THREE.SkeletonUtils.clone === 'function' && !THREE.SkeletonUtils._pruneSafeWrapped) {
    const origSkeletonClone = THREE.SkeletonUtils.clone;
    THREE.SkeletonUtils.clone = function (source) {
      if (!source || !source.isObject3D) return null;
      pruneNullChildren(source);
      const res = origSkeletonClone.call(this, source);
      if (res) pruneNullChildren(res);
      return res;
    };
    THREE.SkeletonUtils._pruneSafeWrapped = true;
  }

  function loadRiggedGLBModel(path) {
    if (!riggedGLBPromises[path]) {
      riggedGLBPromises[path] = new Promise((resolve, reject) => {
        if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader !== 'function') {
          const err = new Error('Three.js GLTFLoader is unavailable');
          console.error('[Pedestrians]', err);
          reject(err);
          return;
        }
        const loader = new THREE.GLTFLoader();
        if (typeof THREE.DRACOLoader === 'function') {
          try {
            const dracoLoader = new THREE.DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
            loader.setDRACOLoader(dracoLoader);
          } catch (e) {
            console.error('[Pedestrians] DRACOLoader init error:', e);
          }
        }
        loader.load(
          path,
          gltf => {
            if (!gltf || !gltf.scene) {
              const parseErr = new Error(`Failed to parse scene from ${path}`);
              console.error('[Pedestrians]', parseErr);
              reject(parseErr);
              return;
            }
            purgeNullChildren(gltf.scene);
            resolve({ scene: gltf.scene, animations: gltf.animations || [] });
          },
          undefined,
          err => {
            console.error(`[Pedestrians] GLTFLoader error for ${path}:`, err);
            reject(err);
          }
        );
      });
    }
    return riggedGLBPromises[path];
  }

  function cloneRiggedModel(source) {
    if (!source || !source.isObject3D) return null;
    pruneNullChildren(source);
    let clone = null;
    if (typeof THREE !== 'undefined' && THREE.SkeletonUtils && typeof THREE.SkeletonUtils.clone === 'function') {
      try {
        clone = THREE.SkeletonUtils.clone(source);
      } catch (e) {
        console.error('[Pedestrians] THREE.SkeletonUtils.clone error:', e);
      }
    }
    if (!clone) {
      // High-fidelity fallback clone for SkinnedMesh and bones
      const cloneLookup = new Map();
      clone = source.clone(false);
      cloneLookup.set(source, clone);

      function parallelTraverse(a, b) {
        if (!a || !b) return;
        pruneNullChildren(a);
        for (let i = 0; i < a.children.length; i++) {
          const childA = a.children[i];
          if (!childA || !childA.isObject3D) continue;
          const childB = childA.clone(false);
          cloneLookup.set(childA, childB);
          if (childB && childB.isObject3D) b.add(childB);
          parallelTraverse(childA, childB);
        }
      }
      parallelTraverse(source, clone);

      source.traverse(node => {
        if (!node || !node.isSkinnedMesh) return;
        const clonedMesh = cloneLookup.get(node);
        if (!clonedMesh || !node.skeleton) return;
        const skeleton = node.skeleton;
        const orderedBones = [];
        for (let i = 0; i < skeleton.bones.length; i++) {
          const clonedBone = cloneLookup.get(skeleton.bones[i]);
          orderedBones.push(clonedBone || skeleton.bones[i]);
        }
        clonedMesh.bind(new THREE.Skeleton(orderedBones, skeleton.boneInverses), clonedMesh.matrixWorld);
      });
    }
    if (clone) {
      pruneNullChildren(clone);
      clone.traverse(child => {
        if (child.isMesh || child.isSkinnedMesh) {
          child.frustumCulled = false;
          child.visible = true;
        }
      });
    }
    return clone;
  }

  // =========================================================================
  // SHARED MOCAP-DERIVED ANIMATION CLIPS (AnimationMixer Keyframe Gait)
  // Normalized 1.0s Walk Cycle + 3.2s Traffic-Check Idle Loop
  // =========================================================================
  let sharedMocapWalkClip = null;
  let sharedMocapIdleClip = null;

  function ensureSharedMocapClips() {
    if (sharedMocapWalkClip && sharedMocapIdleClip) return;
    if (typeof THREE === 'undefined') return;

    // 1.0-second normalized mocap gait cycle with Double-Peak Knee Flexion & Ankle Roll
    const wTimes = [0, 0.12, 0.25, 0.38, 0.50, 0.62, 0.75, 0.88, 1.0];
    const wTracks = [
      // Asymmetric hip swing (60% stance / 40% swing)
      new THREE.NumberKeyframeTrack('leftLegPivot.rotation[x]', wTimes, [-0.46, -0.28, 0.0, 0.22, 0.34, 0.10, -0.20, -0.42, -0.46], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightLegPivot.rotation[x]', wTimes, [0.34, 0.10, -0.20, -0.42, -0.46, -0.28, 0.0, 0.22, 0.34], THREE.InterpolateSmooth),
      // Double-peak knee flexion: 0.18 rad shock absorption at t=0.12, 0.88 rad peak swing at t=0.62
      new THREE.NumberKeyframeTrack('leftKneePivot.rotation[x]', wTimes, [0.05, 0.18, 0.06, 0.14, 0.48, 0.88, 0.65, 0.16, 0.05], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightKneePivot.rotation[x]', wTimes, [0.48, 0.88, 0.65, 0.16, 0.05, 0.18, 0.06, 0.14, 0.48], THREE.InterpolateSmooth),
      // Heel-to-toe ankle roll: dorsiflexion (-0.18 rad) -> flat (0.0 rad) -> toe-off (+0.28 rad)
      new THREE.NumberKeyframeTrack('leftAnklePivot.rotation[x]', wTimes, [-0.18, 0.0, 0.0, 0.15, 0.28, 0.08, -0.06, -0.14, -0.18], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightAnklePivot.rotation[x]', wTimes, [0.28, 0.08, -0.06, -0.14, -0.18, 0.0, 0.0, 0.15, 0.28], THREE.InterpolateSmooth),
      // Pelvis & upper torso counter-twist (±0.10 rad)
      new THREE.NumberKeyframeTrack('pelvisGroup.rotation[y]', wTimes, [-0.10, -0.05, 0.0, 0.06, 0.10, 0.05, 0.0, -0.06, -0.10], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('upperTorso.rotation[y]', wTimes, [0.09, 0.04, 0.0, -0.05, -0.09, -0.04, 0.0, 0.05, 0.09], THREE.InterpolateSmooth),
      // Lateral pelvic weight shift (±0.04 rad)
      new THREE.NumberKeyframeTrack('pelvisGroup.rotation[z]', wTimes, [0.0, 0.03, 0.04, 0.02, 0.0, -0.03, -0.04, -0.02, 0.0], THREE.InterpolateSmooth),
      // Head counter-stabilization
      new THREE.NumberKeyframeTrack('headGroup.rotation[y]', wTimes, [-0.08, -0.04, 0.0, 0.04, 0.08, 0.04, 0.0, -0.04, -0.08], THREE.InterpolateSmooth),
      // Counter arm swing
      new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', wTimes, [0.32, 0.18, 0.0, -0.22, -0.36, -0.20, 0.0, 0.20, 0.32], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', wTimes, [-0.36, -0.20, 0.0, 0.20, 0.32, 0.18, 0.0, -0.22, -0.36], THREE.InterpolateSmooth),
      // Natural elbow flexion lag (-0.55 rad forward, -0.18 rad backswing)
      new THREE.NumberKeyframeTrack('leftElbowPivot.rotation[x]', wTimes, [-0.18, -0.24, -0.34, -0.48, -0.55, -0.42, -0.28, -0.20, -0.18], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightElbowPivot.rotation[x]', wTimes, [-0.55, -0.42, -0.28, -0.20, -0.18, -0.24, -0.34, -0.48, -0.55], THREE.InterpolateSmooth)
    ];
    sharedMocapWalkClip = new THREE.AnimationClip('mocapWalkClip', 1.0, wTracks);

    // 3.2-second curb-waiting idle loop with traffic check head turns (left +0.32 rad, right -0.32 rad)
    const iTimes = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2];
    const iTracks = [
      new THREE.NumberKeyframeTrack('headGroup.rotation[y]', iTimes, [0.0, 0.18, 0.32, 0.16, 0.0, -0.16, -0.32, -0.18, 0.0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('upperTorso.rotation[x]', iTimes, [0.0, 0.012, 0.022, 0.012, 0.0, 0.012, 0.022, 0.012, 0.0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('upperTorso.position[y]', iTimes, [0.0, 0.004, 0.008, 0.004, 0.0, 0.004, 0.008, 0.004, 0.0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('pelvisGroup.rotation[z]', iTimes, [0.015, 0.025, 0.030, 0.015, -0.015, -0.025, -0.030, -0.015, 0.015], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('leftLegPivot.rotation[x]', iTimes, [0, 0, 0, 0, 0, 0, 0, 0, 0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightLegPivot.rotation[x]', iTimes, [0, 0, 0, 0, 0, 0, 0, 0, 0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('leftKneePivot.rotation[x]', iTimes, [0, 0, 0, 0, 0, 0, 0, 0, 0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightKneePivot.rotation[x]', iTimes, [0, 0, 0, 0, 0, 0, 0, 0, 0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('leftAnklePivot.rotation[x]', iTimes, [0, 0, 0, 0, 0, 0, 0, 0, 0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightAnklePivot.rotation[x]', iTimes, [0, 0, 0, 0, 0, 0, 0, 0, 0], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', iTimes, [0.02, 0.01, 0.0, -0.01, 0.02, 0.01, 0.0, -0.01, 0.02], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', iTimes, [-0.01, 0.0, 0.02, 0.01, -0.01, 0.0, 0.02, 0.01, -0.01], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('leftElbowPivot.rotation[x]', iTimes, [-0.18, -0.16, -0.15, -0.16, -0.18, -0.16, -0.15, -0.16, -0.18], THREE.InterpolateSmooth),
      new THREE.NumberKeyframeTrack('rightElbowPivot.rotation[x]', iTimes, [-0.18, -0.16, -0.15, -0.16, -0.18, -0.16, -0.15, -0.16, -0.18], THREE.InterpolateSmooth)
    ];
    sharedMocapIdleClip = new THREE.AnimationClip('mocapIdleClip', 3.2, iTracks);
  }

  function setPedAnimState(pedMesh, nextState) {
    if (!pedMesh || !pedMesh.userData || !pedMesh.userData.mixer) return;
    const ud = pedMesh.userData;
    if (ud.currentAction === nextState) return;
    const walkAction = ud.walkAction;
    const idleAction = ud.idleAction;
    const prevAction = ud.currentAction === 'walk' ? walkAction : (ud.currentAction === 'idle' ? idleAction : null);
    const nextAction = nextState === 'walk' ? walkAction : idleAction;

    if (nextAction) {
      nextAction.reset().play();
      if (prevAction && prevAction !== nextAction && typeof prevAction.crossFadeTo === 'function') {
        prevAction.crossFadeTo(nextAction, 0.3, true);
      }
    }
    ud.currentAction = nextState;
  }

  // =========================================================================
  // MIXAMO MULTI-CHARACTER ROSTER & NORMALIZATION PIPELINE
  // Normalizes bone names (mixamorig\d* -> standard), auto-scales Box3 height,
  // grounds shoe soles at Y = 0.000, and falls back broken/missing textures.
  // Proportions strictly derived from the 3D BRTA Bus (busHeight = 24.47 world units).
  // =========================================================================
  const BRTA_BUS_HEIGHT = 24.47;
  const TARGET_PED_HEIGHTS = {
    male: 13.0,   // Adult Males (5'10"–6'0"): ~half bus height, head well above 8-unit railing
    female: 11.5, // Adult Females (5'2"–5'3"): proportional commuter height
    child: 8.5    // School Kid (little_boy, 3'8"–4'0"): clearly shorter than adults, head just clearing railing
  };
  const BENCH_SEAT_TOP_Y = 3.15; // Exact top Y surface of sidewalk bench seat (~25% of 13-unit adult height, ~43cm park bench)
  const BENCH_SEAT_FRONT_Z = 2.20; // Exact front-most Z edge of front wooden seat slat
  const BENCH_SEAT_DEPTH = 3.35; // Realistic bench seat depth (~3.2–3.5 units) from backrest front face to front slat edge
  const BENCH_SEAT_Y = BENCH_SEAT_TOP_Y;

  const CHARACTER_ROSTER = [
    { id: 'male_remy', category: 'male', format: 'glb', walkPath: 'assets/models/ped-male-walk.glb', idlePath: 'assets/models/ped-male-idle.glb', height: TARGET_PED_HEIGHTS.male, name: 'Remy (Street Casual)' },
    { id: 'female_ch22', category: 'female', format: 'glb', walkPath: 'assets/models/ped-female-walk.glb', idlePath: 'assets/models/ped-female-idle.glb', height: TARGET_PED_HEIGHTS.female, name: 'Ch22 (Modern Commuter)' },
    { id: 'female_salwar', category: 'female', format: 'fbx', path: 'assets/models/ped-female-salwar.fbx', height: TARGET_PED_HEIGHTS.female, name: 'Salwar Kameez Commuter' },
    { id: 'little_boy', category: 'child', format: 'fbx', path: 'assets/models/ped-little-boy.fbx', height: TARGET_PED_HEIGHTS.child, name: 'School Kid Walker' },
    { id: 'male_formal', category: 'male', format: 'fbx', path: 'assets/models/ped-male-formal.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Formal Office Commuter' },
    { id: 'male_hoodie', category: 'male', format: 'fbx', path: 'assets/models/ped-male-hoodie.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Streetwear Hoodie Walker' },
    { id: 'male_sweater', category: 'male', format: 'fbx', path: 'assets/models/ped-male-sweater.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Winter Sweater Walker' },
    { id: 'male_tshirt', category: 'male', format: 'fbx', path: 'assets/models/ped-male-tshirt.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Casual T-Shirt Walker' }
  ];

  function isFallbackTexture(map) {
    if (!map) return true;
    if (map.userData && map.userData.isBlankFallback) return true;
    const img = map.image;
    if (img) {
      const src = (typeof img.src === 'string') ? img.src : '';
      if (src === BLANK_PIXEL_DATA_URI) return true;
      if (src && src.startsWith('data:image') && src.length < 500) return true;
      if (src && (/\.dds($|\?)/i.test(src) || src.includes('undefined'))) return true;
      if (img.complete && typeof img.naturalWidth === 'number' && img.naturalWidth > 0 && img.naturalWidth <= 2) {
        return true;
      }
      // Embedded blob: textures or external diffuse URLs decode asynchronously — NEVER wipe when width is 0 or !complete
      return false;
    }
    return false;
  }

  const riggedPedLibrary = {};
  const sharedMixamoClips = {
    maleWalk: null,
    maleIdle: null,
    femaleWalk: null,
    femaleIdle: null
  };

  // Authentic Dhaka Streetwear Color Combinations (for clothing material variations)
  const DHAKA_STREET_PALETTES = [
    { primary: 0x1e3a8a, secondary: 0x334155 }, // Navy blue & Dark Charcoal
    { primary: 0x881337, secondary: 0x1e293b }, // Deep Maroon & Slate
    { primary: 0x3f6212, secondary: 0xfef3c7 }, // Olive green & Warm Cream
    { primary: 0xb45309, secondary: 0x1e3a8a }, // Mustard amber & Deep Navy
    { primary: 0x0f766e, secondary: 0x475569 }, // Teal & Steel Gray
    { primary: 0x9a3412, secondary: 0x1e293b }, // Rust terracotta & Charcoal
    { primary: 0x38bdf8, secondary: 0x1e3a8a }, // Sky blue & Classic Denim
    { primary: 0x1d4ed8, secondary: 0x64748b }, // Denim blue & Light Slate
    { primary: 0x475569, secondary: 0x0f172a }, // Charcoal slate & Obsidian
    { primary: 0xd97706, secondary: 0x334155 }, // Spiced saffron & Dark Gray
    { primary: 0x059669, secondary: 0xf1f5f9 }, // Emerald green & Clean White
    { primary: 0x7c3aed, secondary: 0x1e293b }  // Royal violet & Dark Navy
  ];

  // Authentic Dhaka Salwar Kameez Rich Palette Pairs (Upper Kameez & Lower Salwar + Dupatta Trim)
  const DHAKA_SALWAR_PALETTES = [
    { top: 0x0f766e, bottom: 0xcbb99d, trim: 0xd97706 }, // Deep teal kameez & warm beige salwar (never pure white)
    { top: 0x881337, bottom: 0xcbb99d, trim: 0xb45309 }, // Maroon & warm beige
    { top: 0xb45309, bottom: 0x1e3a5f, trim: 0x881337 }, // Mustard & navy
    { top: 0x1e3a8a, bottom: 0xcbb99d, trim: 0x38bdf8 }, // Navy & warm beige
    { top: 0xe11d48, bottom: 0x2f3542, trim: 0xfbbf24 }, // Coral & charcoal
    { top: 0x059669, bottom: 0x4a5d3f, trim: 0xfef08a }  // Emerald & olive
  ];

  function isExplicitClothingName(str) {
    if (!str) return false;
    const n = str.toLowerCase();
    if (/skin|face|head|body|hair|eye|lash|brow|teeth|mouth|tongue|cornea|tear|glass/i.test(n)) {
      return false;
    }
    return /cloth|shirt|pant|tshirt|hoodie|sweater|jacket|suit|trouser|salwar|kameez|dress|skirt|vest|top|bottom|coat/i.test(n);
  }

  function applyDhakaClothingVariations(characterGroup, seed) {
    if (!characterGroup) return;
    const gName = ((characterGroup.name || '') + ' ' + (characterGroup.userData?.charId || '')).toLowerCase();
    if (gName.includes('little_boy') || gName.includes('boy')) return;

    if (gName.includes('salwar')) {
      const salwarPal = DHAKA_SALWAR_PALETTES[Math.abs(seed) % DHAKA_SALWAR_PALETTES.length];
      characterGroup.traverse(node => {
        if (!node || (!node.isMesh && !node.isSkinnedMesh) || !node.material) return;
        const isArr = Array.isArray(node.material);
        const mats = isArr ? node.material.slice() : [node.material];
        for (let i = 0; i < mats.length; i++) {
          const origMat = mats[i];
          if (!origMat) continue;
          const newMat = origMat.clone();
          newMat.roughness = 0.85;
          newMat.metalness = 0.0;
          if (newMat.emissive && typeof newMat.emissive.setHex === 'function') newMat.emissive.setHex(0x000000);
          newMat.emissiveIntensity = 0;
          newMat.side = THREE.FrontSide;

          const matName = (origMat.name || '').toLowerCase();
          if (/cornea/i.test(matName)) {
            newMat.color.setHex(0x111827); // Dark pupil
            newMat.transparent = true;
            newMat.opacity = 0.95;
          } else if (/eye/i.test(matName) && !/eyelash/i.test(matName)) {
            newMat.color.setHex(0xf8fafc); // Clean white sclera
          } else if (/teeth/i.test(matName)) {
            newMat.color.setHex(0xf1f5f9); // Clean white teeth
          } else if (/tongue|mouth/i.test(matName)) {
            newMat.color.setHex(0x991b1b); // Tongue
          } else if (/hair|eyelash|scalp|tail/i.test(matName)) {
            newMat.color.setHex(0x1e1612); // Dark natural brown-black (0x1e1612)
          } else if (/skin|head|arm|leg|nail/i.test(matName)) {
            newMat.color.setHex(0xc68662); // Warm South Asian skin tone (0xc68662, roughness 0.85)
          } else if (/lambert2|uppr|top|kameez/i.test(matName)) {
            newMat.color.setHex(salwarPal.top); // Upper kameez: rich Dhaka color
          } else if (/lambert3|lowr|bottom|salwar/i.test(matName)) {
            newMat.color.setHex(salwarPal.bottom); // Lower salwar: matching rich contrasting color (NEVER white)
          } else if (/lambert4|dupatta|border/i.test(matName)) {
            newMat.color.setHex(salwarPal.trim);
          } else if (/shoe|foot/i.test(matName) || matName.includes('shoe')) {
            newMat.color.setHex(0x2b1d14); // Shoes/feet: dark leather brown/charcoal (0x2b1d14)
          } else {
            newMat.color.setHex(salwarPal.top);
          }
          newMat.needsUpdate = true;
          mats[i] = newMat;
        }
        node.material = isArr ? mats : mats[0];
      });
      return;
    }

    const palette = DHAKA_STREET_PALETTES[Math.abs(seed) % DHAKA_STREET_PALETTES.length];
    let pieceIndex = 0;

    characterGroup.traverse(node => {
      if (!node || (!node.isMesh && !node.isSkinnedMesh)) return;
      if (!node.material) return;

      const isArr = Array.isArray(node.material);
      const mats = isArr ? node.material.slice() : [node.material];

      for (let i = 0; i < mats.length; i++) {
        const origMat = mats[i];
        if (!origMat) continue;

        // 1. NEVER tint textured materials: set color to 0xe8e8e8 so diffuse texture atlas remains natural & bright without daytime blowout
        if (origMat.map && !isFallbackTexture(origMat.map)) {
          if (origMat.color) origMat.color.setHex(0xe8e8e8);
          if (origMat.emissive && typeof origMat.emissive.setHex === 'function') origMat.emissive.setHex(0x000000);
          origMat.emissiveIntensity = 0;
          if (origMat.isMeshPhongMaterial || origMat.type === 'MeshPhongMaterial') {
            if (origMat.specular && typeof origMat.specular.setHex === 'function') origMat.specular.setHex(0x181818);
            origMat.shininess = 6;
          } else if (origMat.isMeshStandardMaterial || origMat.type === 'MeshStandardMaterial') {
            origMat.roughness = 0.88;
            origMat.metalness = 0.0;
          }
          origMat.side = THREE.FrontSide;
          continue;
        }

        // 2. Only untextured clothing-only materials receive randomized Dhaka street colors
        const matName = (origMat.name || '') + ' ' + (origMat.id || '');
        const meshName = node.name || '';
        const isClothing = isExplicitClothingName(matName) || isExplicitClothingName(meshName);
        const isExcluded = /skin|face|head|body|hair|eye|lash|brow|teeth|mouth|tongue|cornea|tear|glass/i.test(matName + ' ' + meshName);

        if (!isClothing || isExcluded) {
          continue;
        }

        const newMat = origMat.clone();
        newMat.roughness = 0.88;
        newMat.metalness = 0.0;
        if (newMat.emissive && typeof newMat.emissive.setHex === 'function') newMat.emissive.setHex(0x000000);
        newMat.emissiveIntensity = 0;
        if (newMat.isMeshPhongMaterial || newMat.type === 'MeshPhongMaterial') {
          if (newMat.specular && typeof newMat.specular.setHex === 'function') newMat.specular.setHex(0x181818);
          newMat.shininess = 6;
        }
        newMat.side = THREE.FrontSide;

        const colorToApply = (pieceIndex % 2 === 0) ? palette.primary : palette.secondary;
        pieceIndex++;

        if (newMat.color) {
          newMat.color.setHex(colorToApply);
        }
        mats[i] = newMat;
      }
      node.material = isArr ? mats : mats[0];
    });
  }

  function normalizeClipTracks(clip) {
    if (!clip || !clip.tracks) return clip;
    const cloned = clip.clone();
    const cleanTracks = [];
    cloned.tracks.forEach(track => {
      // Strip mixamorig prefixes (e.g. mixamorig:Hips.position -> Hips.position, mixamorigHips -> Hips)
      track.name = track.name.replace(/^mixamorig\d*[:_]?/i, '');
      if (/Hips\.position$/i.test(track.name)) {
        // Strip Hips.position root translation to keep gait grounded across all heights
        return;
      }
      cleanTracks.push(track);
    });
    cloned.tracks = cleanTracks;
    return cloned;
  }

  function stripRootMotion(clip) {
    return normalizeClipTracks(clip);
  }

  function normalizeCharacterTemplate(modelRoot, targetHeight, charId) {
    if (!modelRoot) return null;

    const isChild = (charId === 'little_boy') ||
      (modelRoot.name && modelRoot.name.includes('little_boy')) ||
      (typeof targetHeight === 'number' && Math.abs(targetHeight - TARGET_PED_HEIGHTS.child) < 0.5);

    const isSalwar = (charId === 'female_salwar') ||
      (modelRoot.name && modelRoot.name.includes('salwar'));

    const isCh22 = (charId === 'female_ch22') ||
      (modelRoot.name && modelRoot.name.includes('female_ch22')) ||
      (modelRoot.name && modelRoot.name.includes('ch22'));

    // Separate shoes from salwar pants on CC_Base_Teeth2 before traversing
    if (isSalwar) {
      modelRoot.traverse(node => {
        if (!node || (!node.isMesh && !node.isSkinnedMesh) || !node.material) return;
        if (node.name === 'CC_Base_Teeth2' && Array.isArray(node.material)) {
          const mats = node.material.slice();
          const shoeMat = (mats[2] ? mats[2].clone() : new THREE.MeshStandardMaterial());
          shoeMat.name = 'salwar_shoe_mat';
          shoeMat.color.setHex(0x2b1d14); // Dark leather brown/charcoal
          shoeMat.roughness = 0.85;
          shoeMat.metalness = 0.0;
          mats.push(shoeMat);
          const shoeMatIdx = mats.length - 1;
          node.material = mats;

          if (node.geometry && node.geometry.groups && node.geometry.attributes && node.geometry.attributes.position) {
            const pos = node.geometry.attributes.position;
            node.geometry.groups.forEach(g => {
              if (g.materialIndex === 2) {
                let minY = Infinity;
                for (let i = g.start; i < g.start + g.count; i++) {
                  const y = pos.getY(i);
                  if (y < minY) minY = y;
                }
                if (minY < 0.9) {
                  g.materialIndex = shoeMatIdx;
                }
              }
            });
          }
        }
      });
    }

    if (isChild) {
      const matSummary = [];
      modelRoot.traverse(node => {
        if (node.isMesh || node.isSkinnedMesh) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m, idx) => {
            matSummary.push({
              node: node.name,
              slot: idx,
              mat: m ? m.name : 'null',
              hasMap: !!(m && m.map && !isFallbackTexture(m.map)),
              color: m && m.color ? m.color.getHexString() : null
            });
          });
        }
      });
      console.log('[little_boy mats]', JSON.stringify(matSummary));
    }

    // 1. Strip bone name prefixes, drop heavy secondary PBR maps, downscale diffuse > 512px, convert to MeshLambertMaterial, enable safe frustum culling
    modelRoot.traverse(node => {
      if (node.isBone) {
        node.name = node.name.replace(/^mixamorig\d*[:_]?/i, '');
      }
      if (node.isMesh || node.isSkinnedMesh) {
        const rawNodeName = (node.name || '').toLowerCase();
        if (/teeth|tongue|eyelash|cornea|eyeao|tear/i.test(rawNodeName)) {
          node.userData.isMicroFaceDetail = true;
        }
        node.castShadow = false;
        node.receiveShadow = false;
        node.frustumCulled = true;
        node.visible = true;
        if (node.geometry) {
          if (!node.geometry.boundingSphere) node.geometry.computeBoundingSphere();
          if (node.geometry.boundingSphere) {
            node.geometry.boundingSphere.radius = Math.max(node.geometry.boundingSphere.radius, 2.6);
          }
        }

        const origMats = Array.isArray(node.material) ? node.material : [node.material];
        const newMats = origMats.map(mat => {
          if (!mat) return mat;

          if (isCh22 || isChild) {
            if (mat.map && mat.map.userData) {
              mat.map.userData.isBlankFallback = false;
            }
          } else if (isSalwar || isFallbackTexture(mat.map)) {
            mat.map = null;
          }

          // Drop & dispose expensive secondary maps so Mixamo characters shade in a single fast diffuse pass
          ['normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'specularMap', 'aoMap', 'emissiveMap'].forEach(slot => {
            if (mat[slot]) {
              if (typeof mat[slot].dispose === 'function' && mat[slot] !== mat.map) {
                mat[slot].dispose();
              }
              mat[slot] = null;
            }
          });

          // Downscale oversized embedded character textures (> 512x512) to 512x512 CanvasTexture
          if (mat.map) {
            mat.map = downscaleOversizedPedTexture(mat.map, 512);
          }

          if (mat.emissive && typeof mat.emissive.setHex === 'function') {
            mat.emissive.setHex(0x000000);
          }
          mat.emissiveIntensity = 0;

          mat.visible = true;
          mat.side = THREE.FrontSide;
          if (typeof mat.opacity === 'number' && mat.opacity < 0.1) {
            mat.opacity = 1.0;
          }
          if (mat.alphaTest && mat.alphaTest > 0.5) {
            mat.alphaTest = 0.0;
          }
          if (mat.transparent && mat.opacity >= 0.99 && !mat.map) {
            mat.transparent = false;
          }

          if (isChild) {
            if (node.geometry) {
              if (node.geometry.deleteAttribute) node.geometry.deleteAttribute('color');
              else if (node.geometry.removeAttribute) node.geometry.removeAttribute('color');
            }
            mat.vertexColors = false;
            mat.color.setHex(0xffffff);
            if (mat.transparent) {
              mat.depthWrite = false;
            }
          } else if (mat.map) {
            mat.color.setHex(0xe8e8e8);
          } else {
            const matName = (mat.name || '').toLowerCase();
            const nodeName = rawNodeName;
            const combinedName = (nodeName + ' ' + matName).toLowerCase();

            if (isCh22) {
              if (/hair|brow/i.test(combinedName)) {
                mat.color.setHex(0x1e1612);
              } else if (/eye|lash/i.test(combinedName)) {
                mat.color.setHex(0x111827);
              } else if (/shirt|top/i.test(combinedName)) {
                mat.color.setHex(0x0f766e);
              } else if (/pant|jean|trouser/i.test(combinedName)) {
                mat.color.setHex(0x1e3a8a);
              } else if (/shoe|sneaker|foot/i.test(combinedName)) {
                mat.color.setHex(0x27272a);
              } else {
                mat.color.setHex(0xc68662);
              }
            } else if (isSalwar) {
              if (/cornea/i.test(matName)) {
                mat.color.setHex(0x111827);
                mat.transparent = true;
                mat.opacity = 0.95;
              } else if (/eye/i.test(matName) && !/eyelash/i.test(matName)) {
                mat.color.setHex(0xf8fafc);
              } else if (/teeth/i.test(matName)) {
                mat.color.setHex(0xf1f5f9);
              } else if (/tongue|mouth/i.test(matName)) {
                mat.color.setHex(0x991b1b);
              } else if (/hair|eyelash|scalp|tail/i.test(matName)) {
                mat.color.setHex(0x1e1612);
              } else if (/skin|head|arm|leg|nail/i.test(matName)) {
                mat.color.setHex(0xc68662);
              } else if (/lambert2|uppr|top|kameez/i.test(matName)) {
                mat.color.setHex(0x0f766e);
              } else if (/lambert3|lowr|bottom|salwar/i.test(matName)) {
                mat.color.setHex(0xcbb99d);
              } else if (/lambert4|dupatta|border/i.test(matName)) {
                mat.color.setHex(0xd97706);
              } else if (/shoe|foot/i.test(matName) || matName.includes('shoe')) {
                mat.color.setHex(0x2b1d14);
              } else {
                mat.color.setHex(0x0f766e);
              }
            } else {
              if (/skin|face|head|body|arm|leg/i.test(combinedName)) {
                mat.color.setHex(0xc68662);
              } else if (/hair|brow/i.test(combinedName)) {
                mat.color.setHex(0x1a1512);
              } else {
                mat.color.setHex(0x1e3a8a);
              }
            }
          }

          const lambertMat = toFastLambertMaterial(mat, { skinning: !!node.isSkinnedMesh, vertexColors: false });
          lambertMat.needsUpdate = true;
          return lambertMat;
        });

        node.material = Array.isArray(node.material) ? newMats : newMats[0];
      }
    });

    // 2. Wrap modelRoot inside a clean THREE.Group wrapper if not already wrapped
    if (modelRoot.parent) {
      modelRoot.parent.remove(modelRoot);
    }
    const wrapper = new THREE.Group();
    wrapper.name = (charId || modelRoot.name || 'char') + '_normalized_wrapper';
    wrapper.userData.charId = charId || null;
    wrapper.add(modelRoot);

    // 3. Measure raw bounds
    modelRoot.scale.set(1, 1, 1);
    modelRoot.position.set(0, 0, 0);
    modelRoot.rotation.set(0, 0, 0);
    modelRoot.updateMatrixWorld(true);
    wrapper.updateMatrixWorld(true);

    const rawBox = new THREE.Box3().setFromObject(modelRoot);
    let rawHeight = rawBox.max.y - rawBox.min.y;
    if (!Number.isFinite(rawHeight) || rawHeight <= 0.001) {
      rawHeight = targetHeight;
    }

    // 4. Normalize template to target height strictly proportional to busHeight
    const unitScale = targetHeight / rawHeight;
    modelRoot.scale.setScalar(unitScale);
    modelRoot.position.set(0, 0, 0);
    modelRoot.updateMatrixWorld(true);

    // 5. Ground shoe soles flush at Y = 0.000 and center horizontally inside wrapper
    const scaledBox = new THREE.Box3().setFromObject(modelRoot);
    modelRoot.position.y = -scaledBox.min.y;
    const midX = (scaledBox.min.x + scaledBox.max.x) * 0.5;
    const midZ = (scaledBox.min.z + scaledBox.max.z) * 0.5;
    if (Math.abs(midX) > 0.5) modelRoot.position.x = -midX;
    if (Math.abs(midZ) > 0.5) modelRoot.position.z = -midZ;
    modelRoot.updateMatrixWorld(true);
    wrapper.updateMatrixWorld(true);

    wrapper.userData.groundedBaseY = 0;
    wrapper.userData.modelScale = unitScale;
    wrapper.userData.targetHeight = targetHeight;
    modelRoot.userData.groundedBaseY = modelRoot.position.y;
    modelRoot.userData.modelScale = unitScale;
    modelRoot.userData.targetHeight = targetHeight;

    wrapper.traverse(child => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.frustumCulled = false;
        child.visible = true;
      }
    });

    pruneNullChildren(wrapper);
    return wrapper;
  }

  function cloneRiggedCharacter(sourceScene, seed) {
    if (!sourceScene || !sourceScene.isObject3D) return null;
    pruneNullChildren(sourceScene);
    let cloned = null;
    if (typeof THREE !== 'undefined' && THREE.SkeletonUtils && typeof THREE.SkeletonUtils.clone === 'function') {
      try {
        cloned = THREE.SkeletonUtils.clone(sourceScene);
      } catch (e) {
        console.warn('[Pedestrians] SkeletonUtils.clone fallback:', e);
      }
    }
    if (!cloned) {
      cloned = cloneRiggedModel(sourceScene);
    }
    if (!cloned) return null;

    pruneNullChildren(cloned);
    applyDhakaClothingVariations(cloned, seed || Math.floor(Math.random() * 1000));
    pruneNullChildren(cloned);
    const isBoyCloned = ((cloned.name || '') + ' ' + (cloned.userData?.charId || '') + ' ' + (sourceScene.name || '') + ' ' + (sourceScene.userData?.charId || '')).toLowerCase().includes('boy');
    cloned.traverse(child => {
      if (child.isMesh || child.isSkinnedMesh) {
        child.frustumCulled = false;
        child.visible = true;
        child.castShadow = false;
        child.receiveShadow = false;
        if (isBoyCloned && child.geometry) {
          if (child.geometry.deleteAttribute) child.geometry.deleteAttribute('color');
          else if (child.geometry.removeAttribute) child.geometry.removeAttribute('color');
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (!mat) return;
          mat.side = THREE.FrontSide;
          if (mat.emissive && typeof mat.emissive.setHex === 'function') mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          if (isBoyCloned) {
            mat.vertexColors = false;
            mat.color.setHex(0xffffff);
            if (mat.transparent) {
              mat.depthWrite = false;
            }
            mat.needsUpdate = true;
          } else if (mat.map) {
            mat.color.setHex(0xe8e8e8); // Preserves diffuse map without daytime blowout
            mat.needsUpdate = true;
          }
          if (mat.isMeshPhongMaterial || mat.type === 'MeshPhongMaterial') {
            if (mat.specular && typeof mat.specular.setHex === 'function') mat.specular.setHex(0x181818);
            mat.shininess = 6;
          } else if (mat.isMeshStandardMaterial || mat.type === 'MeshStandardMaterial') {
            mat.roughness = 0.88;
            mat.metalness = 0.0;
          }
        });
      }
    });

    // Safety Catch: on ALL 8 character models, force realistic matte colors on any unmapped near-white material
    cloned.traverse(node => {
      if (!node || (!node.isMesh && !node.isSkinnedMesh) || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(mat => {
        if (!mat) return;
        if (!mat.map && mat.color) {
          if (mat.color.r > 0.92 && mat.color.g > 0.92 && mat.color.b > 0.92) {
            const matName = (mat.name || '').toLowerCase();
            const nodeName = (node.name || '').toLowerCase();
            const comb = matName + ' ' + nodeName;
            if (!/eye|sclera|teeth|cornea|collar/i.test(comb)) {
              if (/skin|face|head|body|arm|leg|hand|neck/i.test(comb)) {
                mat.color.setHex(0xc68662);
                mat.roughness = 0.85;
              } else if (/shoe|foot|boot|sneaker/i.test(comb)) {
                mat.color.setHex(0x2b1d14);
                mat.roughness = 0.85;
              } else {
                mat.color.setHex(0x1e3a8a); // Rich navy garment fallback
                mat.roughness = 0.88;
              }
              mat.needsUpdate = true;
            }
          }
        }
      });
    });

    return cloned;
  }

  // Shuffled round-robin pool across all 8 character templates
  let characterBag = [];
  let bagIndex = 0;
  let lastAssignedTemplateId = null;

  function refillCharacterBag() {
    const allAvailable = Object.values(riggedPedLibrary).filter(t => t && t.scene);
    if (!allAvailable.length) return [];
    const templates = allAvailable.slice();
    // Fisher-Yates shuffle
    for (let i = templates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = templates[i];
      templates[i] = templates[j];
      templates[j] = temp;
    }
    // Prevent first item in new bag from repeating the last assigned template
    if (templates.length > 1 && lastAssignedTemplateId && templates[0].id === lastAssignedTemplateId) {
      const swapIdx = 1 + Math.floor(Math.random() * (templates.length - 1));
      const temp = templates[0];
      templates[0] = templates[swapIdx];
      templates[swapIdx] = temp;
    }
    return templates;
  }

  function getNextRoundRobinTemplate(preferredCategory, previousNeighborId) {
    const allAvailable = Object.values(riggedPedLibrary).filter(t => t && t.scene);
    if (!allAvailable.length) return null;

    if (!characterBag.length) {
      characterBag = refillCharacterBag();
      bagIndex = 0;
    }

    let chosenIdx = -1;
    if (preferredCategory) {
      for (let offset = 0; offset < characterBag.length; offset++) {
        const idx = (bagIndex + offset) % characterBag.length;
        const candidate = characterBag[idx];
        if (candidate.category === preferredCategory && candidate.id !== previousNeighborId && candidate.id !== lastAssignedTemplateId) {
          chosenIdx = idx;
          break;
        }
      }
      if (chosenIdx === -1) {
        for (let offset = 0; offset < characterBag.length; offset++) {
          const idx = (bagIndex + offset) % characterBag.length;
          const candidate = characterBag[idx];
          if (candidate.category === preferredCategory && candidate.id !== previousNeighborId) {
            chosenIdx = idx;
            break;
          }
        }
      }
    }

    if (chosenIdx === -1) {
      for (let offset = 0; offset < characterBag.length; offset++) {
        const idx = (bagIndex + offset) % characterBag.length;
        const candidate = characterBag[idx];
        if (candidate.id !== previousNeighborId && candidate.id !== lastAssignedTemplateId) {
          chosenIdx = idx;
          break;
        }
      }
    }
    if (chosenIdx === -1) {
      chosenIdx = bagIndex % characterBag.length;
    }

    const chosen = characterBag[chosenIdx];
    characterBag.splice(chosenIdx, 1);
    if (bagIndex >= characterBag.length) bagIndex = 0;

    lastAssignedTemplateId = chosen.id;
    return chosen;
  }

  function getTemplateForCategory(category, preferredId, seed) {
    if (preferredId && riggedPedLibrary[preferredId]) {
      return riggedPedLibrary[preferredId];
    }
    return getNextRoundRobinTemplate(category, null);
  }

  function loadMixamoGLBModel(walkPath, idlePath) {
    const walkPromise = loadRiggedGLBModel(walkPath);
    const idlePromise = idlePath ? loadRiggedGLBModel(idlePath).catch(err => {
      console.warn(`[Pedestrians] Optional idle GLB skipped from ${idlePath}:`, err);
      return null;
    }) : Promise.resolve(null);

    return Promise.all([walkPromise, idlePromise]).then(([walkRes, idleRes]) => {
      if (!walkRes || !walkRes.scene) {
        throw new Error(`Invalid walk GLB loaded from ${walkPath}`);
      }
      const animations = [];
      if (walkRes.animations && walkRes.animations.length > 0) {
        const walkClip = walkRes.animations.find(c => /walk/i.test(c.name)) || walkRes.animations[0];
        const normWalk = normalizeClipTracks(walkClip);
        normWalk.name = 'walk';
        animations.push(normWalk);
      }
      if (idleRes && idleRes.animations && idleRes.animations.length > 0) {
        const idleClip = idleRes.animations.find(c => /idle|stand/i.test(c.name)) || idleRes.animations[0];
        const normIdle = normalizeClipTracks(idleClip);
        normIdle.name = 'idle';
        animations.push(normIdle);
      }
      return { scene: walkRes.scene, animations: animations };
    }).catch(err => {
      console.error(`[Pedestrians] Failed to load GLB model from ${walkPath}:`, err);
      throw err;
    });
  }

  function loadRiggedPedestrian(type) {
    const glbPath = type === 'female' ? 'assets/models/ped-female-walk.glb' : 'assets/models/ped-male-walk.glb';
    const idlePath = type === 'female' ? 'assets/models/ped-female-idle.glb' : 'assets/models/ped-male-idle.glb';
    return loadMixamoGLBModel(glbPath, idlePath).then(res => {
      if (res && res.scene) {
        riggedPedPrototypes[type] = res;
      }
      return res;
    });
  }

  const pedSpawnQueue = [];
  let pedPrecompileDone = false;
  let lastAssignedWalkerId = null;

  let tier1SpawnDone = false;
  let pedPipelineStartTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  let tier2StreamingStarted = false;

  let fbxLoadingManager = null;
  function getFBXLoadingManager() {
    if (fbxLoadingManager) return fbxLoadingManager;
    if (typeof THREE === 'undefined' || typeof THREE.LoadingManager !== 'function') {
      return null;
    }
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      if (typeof url !== 'string' || !url || url === 'undefined' || url.endsWith('/undefined')) {
        return BLANK_PIXEL_DATA_URI;
      }
      let cleanUrl = url;
      if (cleanUrl.startsWith('undefinedblob:')) cleanUrl = cleanUrl.replace(/^undefined/, '');
      if (cleanUrl.startsWith('undefineddata:')) cleanUrl = cleanUrl.replace(/^undefined/, '');
      if (cleanUrl.includes('blob:')) {
        return cleanUrl.slice(cleanUrl.indexOf('blob:'));
      }
      if (cleanUrl.includes('data:image')) {
        return cleanUrl.slice(cleanUrl.indexOf('data:image'));
      }
      if (cleanUrl.startsWith('blob:') || cleanUrl.startsWith('data:')) {
        return cleanUrl;
      }
      let decoded = cleanUrl;
      try { decoded = decodeURI(cleanUrl); } catch (_) {}
      if (/[A-Za-z]:[\\/]/.test(cleanUrl) || /[A-Za-z]:[\\/]/.test(decoded) ||
          decoded.endsWith('/undefined') ||
          /\.dds($|\?)/i.test(cleanUrl) || /\.dds($|\?)/i.test(decoded)) {
        return BLANK_PIXEL_DATA_URI;
      }
      return cleanUrl;
    });
    manager.onError = function () {
      // Silent error handler for missing FBX textures
    };
    fbxLoadingManager = manager;
    return fbxLoadingManager;
  }

  const CROSSWALK_SLOT_ASSIGNMENTS = {
    ped_n1: { templateId: 'male_remy', zone: 'North', side: 'West', corner: 'NW', isTier1: true },
    ped_n2: { templateId: 'female_salwar', zone: 'North', side: 'East', corner: 'NE', isTier1: false },
    ped_s1: { templateId: 'male_formal', zone: 'South', side: 'West', corner: 'SW', isTier1: false },
    ped_s2: { templateId: 'female_ch22', zone: 'South', side: 'East', corner: 'SE', isTier1: true },
    ped_w1: { templateId: 'little_boy', zone: 'West', side: 'North', corner: 'NW', isTier1: false },
    ped_w2: { templateId: 'male_hoodie', zone: 'West', side: 'South', corner: 'SW', isTier1: false },
    ped_e1: { templateId: 'male_sweater', zone: 'East', side: 'North', corner: 'NE', isTier1: false },
    ped_e2: { templateId: 'male_tshirt', zone: 'East', side: 'South', corner: 'SE', isTier1: false }
  };

  const fbxModels = [
    { id: 'female_salwar', category: 'female', path: 'assets/models/ped-female-salwar.fbx', height: TARGET_PED_HEIGHTS.female, name: 'Salwar Kameez Commuter' },
    { id: 'little_boy', category: 'child', path: 'assets/models/ped-little-boy.fbx', height: TARGET_PED_HEIGHTS.child, name: 'School Kid Walker' },
    { id: 'male_hoodie', category: 'male', path: 'assets/models/ped-male-hoodie.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Streetwear Hoodie Walker' },
    { id: 'male_sweater', category: 'male', path: 'assets/models/ped-male-sweater.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Winter Sweater Walker' },
    { id: 'male_formal', category: 'male', path: 'assets/models/ped-male-formal.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Formal Office Commuter' },
    { id: 'male_tshirt', category: 'male', path: 'assets/models/ped-male-tshirt.fbx', height: TARGET_PED_HEIGHTS.male, name: 'Casual T-Shirt Walker' }
  ];

  function loadFBXTemplate(def) {
    if (typeof THREE === 'undefined' || typeof THREE.FBXLoader !== 'function') {
      console.error('[Tier 2 Failed]', def.id, new Error('FBXLoader is not available'));
      return Promise.resolve(null);
    }
    return new Promise(resolve => {
      try {
        const manager = getFBXLoadingManager();
        const loader = manager ? new THREE.FBXLoader(manager) : new THREE.FBXLoader();
        loader.load(def.path, async fbx => {
          try {
            if (!fbx) {
              console.error('[Tier 2 Failed]', def.id, new Error('Null FBX loaded'));
              resolve(null);
              return;
            }
            pruneNullChildren(fbx);
            const normScene = normalizeCharacterTemplate(fbx, def.height, def.id);
            const sceneToStore = normScene || fbx;
            pruneNullChildren(sceneToStore);
            await decodeTemplateTextures(sceneToStore);

            const isFem = (def.category === 'female');
            const walkClip = isFem ? (sharedMixamoClips.femaleWalk || sharedMixamoClips.maleWalk) : sharedMixamoClips.maleWalk;
            const idleClip = isFem ? (sharedMixamoClips.femaleIdle || sharedMixamoClips.maleIdle) : sharedMixamoClips.maleIdle;
            const anims = [];
            if (walkClip) anims.push(walkClip);
            if (idleClip) anims.push(idleClip);

            riggedPedLibrary[def.id] = {
              id: def.id,
              category: def.category,
              name: def.name,
              scene: sceneToStore,
              animations: anims,
              height: def.height
            };
            if (def.category === 'child') {
              riggedPedPrototypes.child = riggedPedLibrary[def.id];
            }

            sceneToStore.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(sceneToStore);
            const h = box.max.y - box.min.y;
            console.log('[Pedestrians] Normalized', def.id, 'height:', h.toFixed(2), 'minY:', box.min.y.toFixed(2));
            console.log('[Tier 2 Loaded]', def.id);
            resolve(riggedPedLibrary[def.id]);
          } catch (innerErr) {
            console.error('[Tier 2 Failed]', def.id, innerErr);
            resolve(null);
          }
        }, undefined, err => {
          console.error('[Tier 2 Failed]', def.id, err);
          resolve(null);
        });
      } catch (e) {
        console.error('[Tier 2 Failed]', def.id, e);
        resolve(null);
      }
    });
  }

  function assignTemplateToUnspawnedEntities(template) {
    if (!template || !template.scene) return;

    // 1. Bench sitters waiting for this character or category
    if (typeof gossipingCrowd !== 'undefined' && gossipingCrowd && gossipingCrowd.length) {
      for (let i = 0; i < gossipingCrowd.length; i++) {
        const sitter = gossipingCrowd[i];
        if (sitter && (sitter.isPlaceholder || !sitter.isSkinned)) {
          const matchesChar = (sitter.preferredCharId === template.id);
          const matchesCat = (!sitter.preferredCharId && sitter.category === template.category);
          if (matchesChar || matchesCat) {
            spawnOneRiggedBenchHuman(sitter);
          }
        }
      }
    }

    // 2. Crosswalk walker slots strictly reserved for this Tier 2 template
    if (typeof pedMeshMap !== 'undefined') {
      for (const k in pedMeshMap) {
        const pm = pedMeshMap[k];
        if (!pm || !pm.mesh || !pm.data) continue;
        const slotDef = CROSSWALK_SLOT_ASSIGNMENTS[pm.data.id];
        if (slotDef && slotDef.templateId === template.id) {
          if (!pm.mesh.userData || !pm.mesh.userData.isRiggedMixamo) {
            spawnOneRiggedWalker(k, pm, template.id);
          }
        }
      }
    }
  }

  function scheduleTier2Streaming() {
    if (tier2StreamingStarted) return;
    tier2StreamingStarted = true;
    setTimeout(streamFBXSequentially, 150);
  }

  async function streamFBXSequentially() {
    console.info('[Pedestrians] Tier 2: Initiating sequential background FBX streaming (1 model at a time)...');
    const waitUntilCameraSettled = async () => {
      while (isCameraTransitioning || isRenderLoopPaused || !is3DViewActive || (typeof document !== 'undefined' && document.hidden)) {
        await new Promise(res => setTimeout(res, 80));
      }
    };

    for (let i = 0; i < fbxModels.length; i++) {
      await waitUntilCameraSettled();
      const def = fbxModels[i];
      try {
        const loaded = await loadFBXTemplate(def);
        if (loaded) {
          await waitUntilCameraSettled();
          assignTemplateToUnspawnedEntities(loaded);
        }
      } catch (err) {
        console.error('[Tier 2 Failed]', def.id, err);
      }

      // Yield cleanly between FBX downloads so camera transitions stay silky smooth
      await new Promise(res => setTimeout(res, 110));
    }
    console.info(`[Pedestrians] Tier 2 Complete: All Mixamo character templates active (${Object.keys(riggedPedLibrary).length} total).`);
    if (typeof scene !== 'undefined' && scene) {
      pruneNullChildren(scene);
    }

    const activeMixamoWalkers = Object.values(pedMeshMap)
      .filter(pm => pm && pm.mesh && pm.mesh.visible === true && pm.mesh.userData && pm.mesh.userData.isRiggedMixamo)
      .map(pm => ({
        templateId: pm.mesh.userData.charId || pm.data.charId || pm.data.templateId,
        zone: pm.mesh.userData.zone || pm.data.zone || 'Crosswalk'
      }));
    console.log('[Pedestrians] Active unique Mixamo templates:', [...new Set(activeMixamoWalkers.map(w => w.templateId))]);
    console.log('[Pedestrians] Crosswalk pairing check:', activeMixamoWalkers.map(w => `${w.zone}:${w.templateId}`));
  }

  function assignGLBToUnspawnedWalkers(charId) {
    if (typeof pedMeshMap === 'undefined') return;
    const template = riggedPedLibrary[charId];
    if (!template || !template.scene) return;

    for (const k in pedMeshMap) {
      const pm = pedMeshMap[k];
      if (!pm || !pm.mesh || !pm.data) continue;
      const slotDef = CROSSWALK_SLOT_ASSIGNMENTS[pm.data.id];
      if (slotDef && slotDef.isTier1 && slotDef.templateId === charId) {
        if (!pm.mesh.userData || !pm.mesh.userData.isRiggedMixamo) {
          spawnOneRiggedWalker(k, pm, slotDef.templateId);
        }
      }
    }

    // Also check bench sitters for female_ch22 (NE bench has female_ch22)
    if (typeof gossipingCrowd !== 'undefined' && gossipingCrowd && gossipingCrowd.length) {
      for (let i = 0; i < gossipingCrowd.length; i++) {
        const sitter = gossipingCrowd[i];
        if (sitter && (sitter.isPlaceholder || !sitter.isSkinned) && sitter.preferredCharId === charId) {
          spawnOneRiggedBenchHuman(sitter);
        }
      }
    }
  }

  function spawnTier1InitialBatch() {
    if (typeof pedMeshMap === 'undefined' || !Object.keys(pedMeshMap).length) {
      setTimeout(spawnTier1InitialBatch, 16);
      return;
    }

    // Stop Tier 1 from hogging all walker slots:
    // When Tier 1 loads first, spawn ONLY 2 initial walkers: 1 male_remy on Crosswalk A (ped_n1 on North zebra),
    // and 1 female_ch22 on Crosswalk B (ped_s2 on South zebra) - NEVER two identical Remys standing or walking together.
    // Reserve the remaining Mixamo walker slots strictly for the 6 Tier 2 templates.
    let initialSpawned = 0;
    for (const k in pedMeshMap) {
      const pm = pedMeshMap[k];
      if (!pm || !pm.data) continue;
      const slotDef = CROSSWALK_SLOT_ASSIGNMENTS[pm.data.id];
      if (slotDef && slotDef.isTier1) {
        if (riggedPedLibrary[slotDef.templateId]) {
          if (spawnOneRiggedWalker(k, pm, slotDef.templateId)) {
            initialSpawned++;
          }
        }
      }
    }

    // Also seat female_ch22 on bench if ready
    if (typeof gossipingCrowd !== 'undefined' && gossipingCrowd && gossipingCrowd.length) {
      for (let i = 0; i < gossipingCrowd.length; i++) {
        const sitter = gossipingCrowd[i];
        if (sitter && (sitter.isPlaceholder || !sitter.isSkinned) && sitter.preferredCharId && riggedPedLibrary[sitter.preferredCharId]) {
          spawnOneRiggedBenchHuman(sitter);
        }
      }
    }

    if (typeof scene !== 'undefined' && scene) {
      pruneNullChildren(scene);
    }

    const elapsedMs = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - pedPipelineStartTime;
    window.__dhakaPedFirstVisibleMs = elapsedMs;
    console.info(`[Pedestrians] Tier 1 First-Paint: ${initialSpawned} crosswalk walkers visible on zebra stripes in ${elapsedMs.toFixed(1)}ms!`);

    // If walking camera is active, immediately focus on first visible walker
    if (activeCamMode === 'walking') {
      const readyWalker = acquireTargetWalker();
      if (readyWalker) {
        activeTargetVehicle = readyWalker;
        updateTrackedVehicleHUD(activeTargetVehicle, true);
        const pose = getVehicleOrbitPose(activeTargetVehicle);
        if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
          focusCamera(pose.position, pose.look, 0.8);
        }
      }
    }

    // Schedule Tier 2 silent background streaming ONLY AFTER Tier 1 walkers are visible and rendered
    scheduleTier2Streaming();
  }

  function handleGLBTemplateLoaded(charId) {
    if (!tier1SpawnDone) {
      tier1SpawnDone = true;
      spawnTier1InitialBatch();
    } else {
      assignGLBToUnspawnedWalkers(charId);
    }
  }

  async function decodeTemplateTextures(obj) {
    if (!obj) return;
    const promises = [];
    obj.traverse(node => {
      if ((node.isMesh || node.isSkinnedMesh) && node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (let i = 0; i < mats.length; i++) {
          const mat = mats[i];
          if (!mat) continue;
          const tex = mat.map;
          if (tex && tex.image && typeof tex.image.decode === 'function') {
            promises.push(tex.image.decode().catch(() => {}));
          }
        }
      }
    });
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
    // Downscale any deferred-decoded diffuse map > 512px to <= 512x512 CanvasTexture
    obj.traverse(node => {
      if ((node.isMesh || node.isSkinnedMesh) && node.material) {
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        for (let i = 0; i < mats.length; i++) {
          const mat = mats[i];
          if (mat && mat.map) {
            mat.map = downscaleOversizedPedTexture(mat.map, 512);
            mat.needsUpdate = true;
          }
        }
      }
    });
  }

  function loadAllRiggedPedestrians() {
    console.info('[Pedestrians] Initializing Mixamo two-tier fast-load pipeline...');
    pedPipelineStartTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    ensureSharedMocapClips();

    // 1. Load GLB templates FIRST on startup, completely independent of the 6 FBX files
    const remyPromise = loadMixamoGLBModel(
      'assets/models/ped-male-walk.glb',
      'assets/models/ped-male-idle.glb'
    ).then(async res => {
      if (res && res.scene) {
        const normScene = normalizeCharacterTemplate(res.scene, TARGET_PED_HEIGHTS.male, 'male_remy');
        const sceneToStore = normScene || res.scene;
        pruneNullChildren(sceneToStore);
        await decodeTemplateTextures(sceneToStore);
        riggedPedLibrary.male_remy = {
          id: 'male_remy',
          category: 'male',
          name: 'Remy (Street Casual)',
          scene: sceneToStore,
          animations: res.animations,
          height: TARGET_PED_HEIGHTS.male
        };
        riggedPedPrototypes.male = riggedPedLibrary.male_remy;
        if (res.animations && res.animations.length) {
          sharedMixamoClips.maleWalk = res.animations.find(c => c.name === 'walk') || res.animations[0];
          sharedMixamoClips.maleIdle = res.animations.find(c => c.name === 'idle') || res.animations[1] || sharedMixamoClips.maleWalk;
        }
        sceneToStore.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(sceneToStore);
        const h = box.max.y - box.min.y;
        console.log('[Pedestrians] Normalized male_remy height:', h.toFixed(2), 'minY:', box.min.y.toFixed(2));
        console.info('[Pedestrians] Loaded male_remy template');
        handleGLBTemplateLoaded('male_remy');
      }
      return res;
    }).catch(err => {
      console.warn('[Pedestrians] Error loading male_remy GLB:', err);
      return null;
    });

    const ch22Promise = loadMixamoGLBModel(
      'assets/models/ped-female-walk.glb',
      'assets/models/ped-female-idle.glb'
    ).then(async res => {
      if (res && res.scene) {
        const normScene = normalizeCharacterTemplate(res.scene, TARGET_PED_HEIGHTS.female, 'female_ch22');
        const sceneToStore = normScene || res.scene;
        pruneNullChildren(sceneToStore);
        await decodeTemplateTextures(sceneToStore);
        riggedPedLibrary.female_ch22 = {
          id: 'female_ch22',
          category: 'female',
          name: 'Ch22 (Modern Commuter)',
          scene: sceneToStore,
          animations: res.animations,
          height: TARGET_PED_HEIGHTS.female
        };
        riggedPedPrototypes.female = riggedPedLibrary.female_ch22;
        if (res.animations && res.animations.length) {
          sharedMixamoClips.femaleWalk = res.animations.find(c => c.name === 'walk') || res.animations[0];
          sharedMixamoClips.femaleIdle = res.animations.find(c => c.name === 'idle') || res.animations[1] || sharedMixamoClips.femaleWalk;
        }
        sceneToStore.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(sceneToStore);
        const h = box.max.y - box.min.y;
        console.log('[Pedestrians] Normalized female_ch22 height:', h.toFixed(2), 'minY:', box.min.y.toFixed(2));
        console.info('[Pedestrians] Loaded female_ch22 template');
        handleGLBTemplateLoaded('female_ch22');
      }
      return res;
    }).catch(err => {
      console.warn('[Pedestrians] Error loading female_ch22 GLB:', err);
      return null;
    });

    // The millisecond the FIRST GLB finishes, Tier 1 is active (do NOT wait for all 8 files)
    return Promise.race([remyPromise, ch22Promise]);
  }

  function loadPedestriansModel() {
    return loadAllRiggedPedestrians();
  }

  const loggedSpawnedCheck = {};
  function enforceWalkerWorldScale(spawnedRoot, targetHeight, id) {
    if (!spawnedRoot || !spawnedRoot.isObject3D) return;
    spawnedRoot.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(spawnedRoot);
    let currentH = box.max.y - box.min.y;
    if (Number.isFinite(currentH) && currentH > 0.05 && Number.isFinite(targetHeight) && targetHeight > 0) {
      if (Math.abs(currentH - targetHeight) > 0.3) {
        const scaleMultiplier = targetHeight / currentH;
        spawnedRoot.scale.multiplyScalar(scaleMultiplier);
        spawnedRoot.updateMatrixWorld(true);
      }

      box = new THREE.Box3().setFromObject(spawnedRoot);
      if (!loggedSpawnedCheck[id]) {
        loggedSpawnedCheck[id] = true;
        console.log('[Spawned Walker World Check]', id, 'worldHeight:', box.getSize(new THREE.Vector3()).y.toFixed(2), 'worldMinY:', box.min.y.toFixed(2));
      }
    }
  }

  function createRiggedPedestrian(p, protoData, typeName, measuredHeight, preferredCharId) {
    const type = (typeName === 'female') ? 'female' : (typeName === 'child' ? 'child' : 'male');
    const pSeed = (p && typeof p.id === 'number') ? p.id : (p && typeof p.id === 'string' ? (parseInt(p.id.replace(/\D/g, ''), 10) || 0) : 0);
    const template = getTemplateForCategory(type, preferredCharId, pSeed) || protoData;
    if (!template || !template.scene) return null;

    const sourceScene = template.scene;
    const animations = template.animations || [];
    const riggedModel = cloneRiggedCharacter(sourceScene, pSeed);
    if (!riggedModel) return null;
    purgeNullChildren(riggedModel);

    const wrapper = new THREE.Group();
    wrapper.name = 'mixamo-ped-' + (template.id || type);
    wrapper.visible = true;
    riggedModel.visible = true;
    wrapper.frustumCulled = false;
    riggedModel.frustumCulled = false;

    // The template was already normalized once to targetHeight and grounded at y=0 inside its clean THREE.Group wrapper.
    // Keep clone.scale.set(1, 1, 1) and position at (0, 0, 0)
    riggedModel.position.set(0, 0, 0);
    riggedModel.rotation.set(0, 0, 0);
    riggedModel.scale.set(1, 1, 1);
    wrapper.add(riggedModel);
    wrapper.scale.set(1, 1, 1);
    wrapper.updateMatrixWorld(true);

    // Target total heights strictly proportional to busHeight (male: 13.0, female: 11.5, child: 8.5)
    const targetHeight = (type === 'female') ? TARGET_PED_HEIGHTS.female : (type === 'child' ? TARGET_PED_HEIGHTS.child : TARGET_PED_HEIGHTS.male);
    enforceWalkerWorldScale(wrapper, targetHeight, template.id || type);
    const unitScale = (riggedModel.userData && riggedModel.userData.modelScale) || (sourceScene.userData && sourceScene.userData.modelScale) || 1.0;

    wrapper.traverse(node => {
      if (node.isMesh || node.isSkinnedMesh) {
        node.frustumCulled = false;
        node.visible = true;
        node.castShadow = false;
        node.receiveShadow = false;
      }
    });

    riggedModel.userData.groundedBaseY = 0;
    riggedModel.userData.modelScale = unitScale;
    riggedModel.userData.targetHeight = targetHeight;
    wrapper.userData.groundedBaseY = 0;
    wrapper.userData.modelScale = unitScale;
    wrapper.userData.targetHeight = targetHeight;

    wrapper.matrixAutoUpdate = true;
    riggedModel.matrixAutoUpdate = true;

    // Locate RightHand bone for rain umbrella
    let rightHandBone = null;
    riggedModel.traverse(node => {
      if (!node) return;
      node.matrixAutoUpdate = true;
      if (node.isBone && /RightHand$/i.test(node.name)) {
        if (!rightHandBone) rightHandBone = node;
      }
    });

    // Monsoon rain umbrella
    const umbrella = new THREE.Group();
    umbrella.name = 'mixamo-umbrella';
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, side: THREE.DoubleSide });
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.70, 0.28, 12, 1, true), canopyMat);
    canopy.position.y = 0.95;
    umbrella.add(canopy);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.05, 8), shaftMat);
    shaft.position.y = 0.45;
    umbrella.add(shaft);
    umbrella.visible = false;

    const umbrellaScaleFactor = (targetHeight / 1.70);
    if (rightHandBone) {
      umbrella.scale.setScalar(umbrellaScaleFactor / (unitScale || 1));
      umbrella.position.set(0, 0, 0);
      umbrella.rotation.set(0, 0, 0);
      rightHandBone.add(umbrella);
    } else {
      umbrella.scale.setScalar(umbrellaScaleFactor);
      umbrella.position.set(0.3 * umbrellaScaleFactor, targetHeight * 0.55, 0);
      riggedModel.add(umbrella);
    }

    // Register shared InstancedMesh ground contact shadow disc (all pedestrians share 1 draw call)
    const shadowScale = (targetHeight / 13.0) * 16.0 * 0.13;
    registerPedShadowDisc(wrapper, shadowScale);

    // AnimationMixer with normalized mocap clips
    let mixer = null;
    let walkAction = null;
    let idleAction = null;

    let activeAnims = (animations && animations.length > 0) ? animations.slice() : [];
    if (!activeAnims.length) {
      const isFem = (type === 'female');
      const wClip = isFem ? (sharedMixamoClips.femaleWalk || sharedMixamoClips.maleWalk) : sharedMixamoClips.maleWalk;
      const iClip = isFem ? (sharedMixamoClips.femaleIdle || sharedMixamoClips.maleIdle) : sharedMixamoClips.maleIdle;
      if (wClip) activeAnims.push(wClip);
      if (iClip) activeAnims.push(iClip);
    }

    if (activeAnims.length > 0) {
      mixer = new THREE.AnimationMixer(riggedModel);
      const walkClip = activeAnims.find(c => /walk/i.test(c.name)) || activeAnims[0];
      const idleClip = activeAnims.find(c => /idle|stand/i.test(c.name)) || (activeAnims.length > 1 ? activeAnims[1] : activeAnims[0]);

      if (walkClip) {
        walkAction = mixer.clipAction(walkClip);
        walkAction.setLoop(THREE.LoopRepeat);
        if (type === 'child') walkAction.timeScale = 1.35;
      }
      if (idleClip) {
        idleAction = mixer.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat);
      }

      const isCurrentlyMoving = p && (p.isMoving || (p.currentCoord !== undefined && Math.abs(p.currentCoord - (p.start || 0)) > 2 && !p.isPausedForVehicle));
      const initAction = isCurrentlyMoving ? (walkAction || idleAction) : (idleAction || walkAction);
      if (initAction) {
        initAction.play();
        wrapper.userData.currentAction = (initAction === walkAction ? 'walk' : 'idle');
      }
    }

    wrapper.userData.isRigged = true;
    wrapper.userData.isRiggedMixamo = true;
    wrapper.userData.pedCategory = type;
    wrapper.userData.charId = template.id || type;
    wrapper.userData.charName = template.name || type;
    wrapper.userData.mixer = mixer;
    wrapper.userData.walkAction = walkAction;
    wrapper.userData.idleAction = idleAction;
    wrapper.userData.umbrella = umbrella;
    wrapper.userData.bodyRoot = riggedModel;
    wrapper.userData.isPedestrian = true;

    if (p) {
      p.mesh = wrapper;
      p.group = wrapper;
      p.isRiggedMixamo = true;
      p.pedCategory = type;
      p.charId = template.id || type;
      p.charName = template.name || type;
    }

    purgeNullChildren(wrapper);
    activeRiggedWalkerCount++;
    return wrapper;
  }

  function spawnOneRiggedWalker(key, pm, forceTemplateId) {
    if (!pm || !pm.mesh || !pm.data) return false;
    const p = pm.data;
    const slotDef = CROSSWALK_SLOT_ASSIGNMENTS[p.id];
    const targetTemplateId = forceTemplateId || (slotDef && slotDef.templateId) || p.charId;

    let template = targetTemplateId ? riggedPedLibrary[targetTemplateId] : null;
    if (!template || !template.scene) return false;

    // Never tear down or rebuild an already spawned walker with the correct template
    if (pm.mesh.userData && pm.mesh.userData.isRiggedMixamo && pm.mesh.userData.mixer && pm.mesh.userData.charId === template.id) {
      return true;
    }

    const type = template.category;
    const targetHeight = (type === 'female') ? TARGET_PED_HEIGHTS.female : (type === 'child' ? TARGET_PED_HEIGHTS.child : TARGET_PED_HEIGHTS.male);

    try {
      const oldMesh = pm.mesh;
      oldMesh.updateMatrixWorld(true);

      const wrapper = createRiggedPedestrian(p, template, type, targetHeight, template.id);
      if (wrapper && wrapper.isObject3D) {
        wrapper.position.copy(oldMesh.position);
        wrapper.rotation.copy(oldMesh.rotation);
        wrapper.scale.set(1, 1, 1);

        if (oldMesh.userData) {
          if (oldMesh.userData.lastX !== undefined) wrapper.userData.lastX = oldMesh.userData.lastX;
          if (oldMesh.userData.lastZ !== undefined) wrapper.userData.lastZ = oldMesh.userData.lastZ;
          if (oldMesh.userData.targetRotY !== undefined) wrapper.userData.targetRotY = oldMesh.userData.targetRotY;
          if (oldMesh.userData.currentRotY !== undefined) wrapper.userData.currentRotY = oldMesh.userData.currentRotY;
          if (oldMesh.userData.currentGroundY !== undefined) wrapper.userData.currentGroundY = oldMesh.userData.currentGroundY;
        }

        const parent = oldMesh.parent || (typeof scene !== 'undefined' ? scene : null);
        if (parent) {
          parent.remove(oldMesh);
          parent.add(wrapper);
          pruneNullChildren(parent);
        }
        enforceWalkerWorldScale(wrapper, targetHeight, template.id || type);

        wrapper.visible = true;
        pm.mesh = wrapper;
        p.mesh = wrapper;
        p.group = wrapper;
        p.isRiggedMixamo = true;
        p.pedCategory = type;
        p.charId = template.id;
        p.templateId = template.id;
        wrapper.userData.isRiggedMixamo = true;
        wrapper.userData.pedCategory = type;
        wrapper.userData.charId = template.id;
        wrapper.userData.templateId = template.id;

        if (slotDef) {
          p.zone = slotDef.zone;
          p.side = slotDef.side;
          p.corner = slotDef.corner;
          wrapper.userData.zone = slotDef.zone;
          wrapper.userData.side = slotDef.side;
          wrapper.userData.corner = slotDef.corner;
        }

        if (typeof activeTargetVehicle !== 'undefined' && activeTargetVehicle) {
          if (activeTargetVehicle === p || activeTargetVehicle.mesh === oldMesh || activeTargetVehicle.data === p) {
            activeTargetVehicle.mesh = wrapper;
            activeTargetVehicle.category = type;
            activeTargetVehicle.charId = template.id;
            activeTargetVehicle.templateId = template.id;
            activeTargetVehicle.charName = template.name;
            if (activeTargetVehicle.data) {
              activeTargetVehicle.data.pedCategory = type;
              activeTargetVehicle.data.charId = template.id;
              activeTargetVehicle.data.templateId = template.id;
            }
          }
        }
        return true;
      }
    } catch (err) {
      console.error(`[Pedestrians] Failed to spawn walker ${key}:`, err);
    }
    return false;
  }

  const PROCEDURAL_SIDEWALK_IDS = ['ped_sw1', 'ped_sw2', 'ped_sw3', 'ped_sw4', 'ped_vsw1', 'ped_vsw2'];

  function instantiatePedestrian(p) {
    // 1. Dedicated outer sidewalk stroll lanes use authentic procedural Three.js Dhaka walkers
    // Queue asynchronously onto pedSpawnQueue so initial 2D->3D toggle opens in <200ms with zero hitch
    if (p && p.isSidewalk && PROCEDURAL_SIDEWALK_IDS.includes(p.id)) {
      const placeholder = new THREE.Group();
      placeholder.name = 'ped-pending-' + p.id;
      placeholder.visible = false;
      placeholder.userData.isPlaceholder = true;
      placeholder.userData.isPedestrian = true;
      if (typeof scene !== 'undefined' && scene && scene.add) {
        scene.add(placeholder);
      }
      p.mesh = placeholder;
      p.group = placeholder;
      pedSpawnQueue.push(() => {
        const proceduralMesh = createArticulatedHuman(p, false);
        if (proceduralMesh && proceduralMesh.isObject3D) {
          proceduralMesh.position.copy(placeholder.position);
          proceduralMesh.rotation.copy(placeholder.rotation);
          proceduralMesh.visible = true;
          if (typeof scene !== 'undefined' && scene && scene.add) {
            scene.add(proceduralMesh);
          }
          if (typeof scene !== 'undefined' && scene && placeholder.parent) {
            placeholder.parent.remove(placeholder);
          }
          p.mesh = proceduralMesh;
          p.group = proceduralMesh;
          for (const k in pedMeshMap) {
            if (pedMeshMap[k] && pedMeshMap[k].data === p) {
              pedMeshMap[k].mesh = proceduralMesh;
              break;
            }
          }
        }
      });
      return placeholder;
    }

    // 2. Invisible placeholder group for crosswalk slots (Mixamo only, NEVER pop in procedural walkers on crosswalks)
    // and for non-selected sidewalk slots
    const placeholder = new THREE.Group();
    placeholder.name = 'ped-placeholder-' + (p?.id || 'unknown');
    placeholder.visible = false;
    placeholder.userData.isPlaceholder = true;
    placeholder.userData.isPedestrian = true;
    if (typeof scene !== 'undefined' && scene && scene.add) {
      scene.add(placeholder);
    }
    if (p) {
      p.mesh = placeholder;
      p.group = placeholder;
    }
    return placeholder;
  }

  // =========================================================================
  // DHAKA SIDEWALK PUBLIC BENCHES & GOSSIPING CROWD SUBSYSTEM
  // Authentic slatted teak wood benches with forged iron armrests & legs.
  // Hosts seated Mixamo character pairs chatting, nodding, and gesturing.
  // =========================================================================
  function createDhakaSidewalkBench() {
    const bench = new THREE.Group();
    bench.name = 'dhaka-sidewalk-bench';

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Warm teak wood stain
      roughness: 0.68,
      metalness: 0.05
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Forged cast-iron dark charcoal
      roughness: 0.45,
      metalness: 0.82
    });

    const benchWidth = 18.0;
    const seatTopY = BENCH_SEAT_TOP_Y; // 3.15 world units (~25% of 13-unit adult height, ~43cm park bench)
    const slatThick = 0.40;
    const seatSlatY = seatTopY - slatThick * 0.5; // 2.95 (so top surface is exactly 3.15)
    const slatDepth = 1.0;
    const slatGeo = new THREE.BoxGeometry(benchWidth, slatThick, slatDepth);

    // 3 Wooden Seat Slats:
    // Back slat: z = -0.60 (depth -1.10 to -0.10)
    // Middle slat: z = 0.55 (depth 0.05 to 1.05)
    // Front slat: z = 1.70 (depth 1.20 to 2.20) -> front-most Z edge = 2.20
    [-0.60, 0.55, 1.70].forEach(zOff => {
      const slat = new THREE.Mesh(slatGeo, woodMat);
      slat.position.set(0, seatSlatY, zOff);
      bench.add(slat);
    });

    // 2 Wooden Backrest Slats (tilted ~8°, backrest front face at z = -1.15)
    // Seat depth from backrest front face (-1.15) to front slat edge (2.20) = 3.35 units
    const backSlatGeo = new THREE.BoxGeometry(benchWidth, 0.85, 0.35);
    [
      { y: 4.60, z: -1.35 },
      { y: 5.80, z: -1.55 }
    ].forEach(cfg => {
      const backSlat = new THREE.Mesh(backSlatGeo, woodMat);
      backSlat.position.set(0, cfg.y, cfg.z);
      backSlat.rotation.x = -0.14;
      bench.add(backSlat);
    });

    // Cast-Iron Side Legs, Horizontal Beams, and Armrests
    [-8.5, 8.5].forEach(sideX => {
      const legGroup = new THREE.Group();
      legGroup.position.set(sideX, 0, 0);

      // Front leg (touches sidewalk at y=0 up to seat bottom at y=2.75)
      const fLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, seatSlatY, 8), ironMat);
      fLeg.position.set(0, seatSlatY * 0.5, 1.55);
      legGroup.add(fLeg);

      // Back leg & backrest support (from y=0 up to y=6.0, tilted)
      const bLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 6.0, 8), ironMat);
      bLeg.position.set(0, 3.0, -1.45);
      bLeg.rotation.x = -0.14;
      legGroup.add(bLeg);

      // Horizontal seat support beam directly under wooden slats
      const sBeam = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.32, 3.6), ironMat);
      sBeam.position.set(0, seatSlatY - 0.25, 0.55);
      legGroup.add(sBeam);

      // Curved armrest (top surface at y = 4.25 = seatTopY + 1.10)
      const armrest = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.28, 3.4), ironMat);
      armrest.position.set(0, seatTopY + 1.10, 0.55);
      legGroup.add(armrest);

      // Armrest vertical strut
      const armStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.10, 6), ironMat);
      armStrut.position.set(0, seatTopY + 0.55, 1.55);
      legGroup.add(armStrut);

      bench.add(legGroup);
    });

    // Measure and store exact bench-local coordinates on bench.userData
    bench.userData.seatTopY = BENCH_SEAT_TOP_Y;     // 3.15
    bench.userData.seatFrontZ = BENCH_SEAT_FRONT_Z; // 2.20
    bench.userData.seatDepth = BENCH_SEAT_DEPTH;   // 3.35

    bench.scale.set(1, 1, 1);
    optimizeStaticSubtree(bench);
    freezeStatic(bench);
    return bench;
  }

  function aimBoneInCharacterSpace(bone, childBone, targetDirCharSpace, rootObj) {
    if (!bone || !rootObj) return;
    rootObj.updateMatrixWorld(true);

    const boneWorldPos = new THREE.Vector3();
    bone.getWorldPosition(boneWorldPos);

    let worldDir;
    if (childBone) {
      const childWorldPos = new THREE.Vector3();
      childBone.getWorldPosition(childWorldPos);
      worldDir = new THREE.Vector3().subVectors(childWorldPos, boneWorldPos);
    } else {
      // If a rig has no toe bone, derive forward direction in world space from bone orientation
      const forwardLocal = new THREE.Vector3(0, 0, 1).applyQuaternion(bone.quaternion);
      if (bone.parent) {
        forwardLocal.applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()));
      }
      worldDir = forwardLocal;
    }

    const rootWorldQuat = new THREE.Quaternion();
    rootObj.getWorldQuaternion(rootWorldQuat);
    const rootWorldQuatInv = rootWorldQuat.clone().invert();

    const currentDir = worldDir.clone().applyQuaternion(rootWorldQuatInv);
    if (currentDir.lengthSq() < 1e-6) return;
    currentDir.normalize();

    const targetDir = targetDirCharSpace.clone().normalize();
    const deltaCharQuat = new THREE.Quaternion().setFromUnitVectors(currentDir, targetDir);

    let localDelta;
    if (bone.parent && bone.parent !== rootObj) {
      const parentWorldQuat = new THREE.Quaternion();
      bone.parent.getWorldQuaternion(parentWorldQuat);
      const parentRelQuat = rootWorldQuatInv.clone().multiply(parentWorldQuat);
      const parentRelQuatInv = parentRelQuat.clone().invert();
      localDelta = parentRelQuatInv.multiply(deltaCharQuat).multiply(parentRelQuat);
    } else {
      localDelta = deltaCharQuat;
    }

    bone.quaternion.premultiply(localDelta);
    bone.updateMatrixWorld(true);
  }

  function extractCharacterBones(characterGroup) {
    const bones = {};
    characterGroup.traverse(node => {
      if (node.isBone) {
        const cleanName = node.name.replace(/^mixamorig\d*[:_]?/i, '');
        if (!bones[cleanName]) {
          bones[cleanName] = node;
        }
      }
    });
    return bones;
  }

  function applySeatedPoseToRiggedModel(characterModel, seatIdx, totalInBench, isChild = false, isFemale = false, benchObj = null, bIdx = 0, charId = null) {
    if (!characterModel || !characterModel.isObject3D) return {};

    // 1. Stop any walking mixer & ensure no animation overrides seated pose
    if (characterModel.userData) {
      if (characterModel.userData.mixer) {
        try { characterModel.userData.mixer.stopAllAction(); } catch (_) {}
        characterModel.userData.mixer = null;
      }
      characterModel.userData.walkAction = null;
      characterModel.userData.idleAction = null;
    }

    // Cache restQuat once for bind-pose preservation
    characterModel.traverse(node => {
      if (node.isBone && !node.userData.restQuat) {
        node.userData.restQuat = node.quaternion.clone();
      }
    });

    // Reset all bones to restQuat before applying seated pose
    characterModel.traverse(node => {
      if (node.isBone && node.userData.restQuat) {
        node.quaternion.copy(node.userData.restQuat);
      }
    });
    characterModel.position.set(0, 0, 0);
    characterModel.rotation.set(0, 0, 0);
    characterModel.updateMatrixWorld(true);

    const bones = extractCharacterBones(characterModel);

    // 2. Character-space bone aiming top-down (parent before child)
    // Torso: upright with relaxed 5-8° recline toward -Z against bench backrest
    if (bones.Spine && (bones.Neck || bones.Head || bones.Spine1)) {
      aimBoneInCharacterSpace(bones.Spine, bones.Neck || bones.Head || bones.Spine1, new THREE.Vector3(0, 0.995, -0.10), characterModel);
    }
    if (bones.Spine1 && (bones.Neck || bones.Head)) {
      aimBoneInCharacterSpace(bones.Spine1, bones.Neck || bones.Head, new THREE.Vector3(0, 0.995, -0.06), characterModel);
    }

    // Upper arms: drop completely out of T-pose down and slightly forward along (±0.22, -0.92, 0.30)
    if (bones.LeftArm && bones.LeftForeArm) {
      aimBoneInCharacterSpace(bones.LeftArm, bones.LeftForeArm, new THREE.Vector3(0.22, -0.92, 0.30), characterModel);
    }
    if (bones.RightArm && bones.RightForeArm) {
      aimBoneInCharacterSpace(bones.RightArm, bones.RightForeArm, new THREE.Vector3(-0.22, -0.92, 0.30), characterModel);
    }

    // Forearms: bend forward and inward onto thighs/lap along (∓0.20, -0.35, 0.91)
    if (bones.LeftForeArm && bones.LeftHand) {
      aimBoneInCharacterSpace(bones.LeftForeArm, bones.LeftHand, new THREE.Vector3(-0.20, -0.35, 0.91), characterModel);
    }
    if (bones.RightForeArm && bones.RightHand) {
      aimBoneInCharacterSpace(bones.RightForeArm, bones.RightHand, new THREE.Vector3(0.20, -0.35, 0.91), characterModel);
    }

    // 3. Exact Bench-Local Coordinate Alignment
    const seatTopY = (benchObj && benchObj.userData && typeof benchObj.userData.seatTopY === 'number')
      ? benchObj.userData.seatTopY
      : BENCH_SEAT_TOP_Y;
    const seatFrontZ = (benchObj && benchObj.userData && typeof benchObj.userData.seatFrontZ === 'number')
      ? benchObj.userData.seatFrontZ
      : BENCH_SEAT_FRONT_Z;

    // Find bench container reference for bench-local coordinate transformations
    let benchRef = benchObj && benchObj.isObject3D ? benchObj : null;
    if (!benchRef && characterModel.parent && characterModel.parent.parent && characterModel.parent.parent.isObject3D) {
      benchRef = characterModel.parent.parent;
    }
    if (benchRef) {
      benchRef.updateMatrixWorld(true);
    }

    const benchInv = new THREE.Matrix4();
    if (benchRef) {
      benchInv.copy(benchRef.matrixWorld).invert();
    }

    const _vTemp = new THREE.Vector3();
    function getBenchLocal(obj) {
      if (!obj) return new THREE.Vector3();
      obj.getWorldPosition(_vTemp);
      if (benchRef) {
        _vTemp.applyMatrix4(benchInv);
      }
      return _vTemp.clone();
    }

    // Center hips horizontally inside group
    characterModel.updateMatrixWorld(true);
    const rootInv = characterModel.matrixWorld.clone().invert();
    const hPos = new THREE.Vector3();
    if (bones.Hips) bones.Hips.getWorldPosition(hPos).applyMatrix4(rootInv);
    characterModel.position.x = -hPos.x;
    characterModel.updateMatrixWorld(true);

    const charHeight = (characterModel.userData && characterModel.userData.targetHeight)
      || (isChild ? TARGET_PED_HEIGHTS.child : (isFemale ? TARGET_PED_HEIGHTS.female : TARGET_PED_HEIGHTS.male));

    const leftToe = bones.LeftToeBase || bones.LeftToe_End || bones.LeftToe;
    const rightToe = bones.RightToeBase || bones.RightToe_End || bones.RightToe;

    let pitchY = -0.05;
    let finalKneeZ = 0;
    let finalThighBottomY = 0;
    let finalFootBottomY = 0;

    for (let iter = 0; iter < 5; iter++) {
      const pitchZ = Math.sqrt(Math.max(0.1, 1 - 0.06 * 0.06 - pitchY * pitchY));

      // Thighs: aim forward and very slightly outward/downward along (±0.06, pitchY, pitchZ)
      if (bones.LeftUpLeg && bones.LeftLeg) {
        aimBoneInCharacterSpace(bones.LeftUpLeg, bones.LeftLeg, new THREE.Vector3(0.06, pitchY, pitchZ), characterModel);
      }
      if (bones.RightUpLeg && bones.RightLeg) {
        aimBoneInCharacterSpace(bones.RightUpLeg, bones.RightLeg, new THREE.Vector3(-0.06, pitchY, pitchZ), characterModel);
      }

      // Shins: aim straight down and slightly forward along (0, -0.98, 0.18) — NEVER backward
      if (bones.LeftLeg && bones.LeftFoot) {
        aimBoneInCharacterSpace(bones.LeftLeg, bones.LeftFoot, new THREE.Vector3(0, -0.98, 0.18), characterModel);
      }
      if (bones.RightLeg && bones.RightFoot) {
        aimBoneInCharacterSpace(bones.RightLeg, bones.RightFoot, new THREE.Vector3(0, -0.98, 0.18), characterModel);
      }

      // Feet: aim horizontally forward along (0, -0.05, 0.99) so shoe soles sit flat on sidewalk
      if (bones.LeftFoot) {
        aimBoneInCharacterSpace(bones.LeftFoot, leftToe, new THREE.Vector3(0, -0.05, 0.99), characterModel);
      }
      if (bones.RightFoot) {
        aimBoneInCharacterSpace(bones.RightFoot, rightToe, new THREE.Vector3(0, -0.05, 0.99), characterModel);
      }

      characterModel.updateMatrixWorld(true);

      // Z-Alignment: Compute kneeZ and shift characterModel.position.z so knee sits 0.65 units IN FRONT OF seatFrontZ
      const leftKneeL = getBenchLocal(bones.LeftLeg);
      const rightKneeL = getBenchLocal(bones.RightLeg);
      const kneeZ = (leftKneeL.z + rightKneeL.z) * 0.5;

      const groupRotY = (characterModel.parent && characterModel.parent.rotation) ? characterModel.parent.rotation.y : 0;
      const cosAngle = Math.max(0.5, Math.cos(groupRotY));
      const targetKneeZ = seatFrontZ + 0.65;
      const deltaZ = (targetKneeZ - kneeZ) / cosAngle;
      characterModel.position.z += deltaZ;
      characterModel.updateMatrixWorld(true);

      // Re-measure knees after Z-alignment
      const leftKneeL2 = getBenchLocal(bones.LeftLeg);
      const rightKneeL2 = getBenchLocal(bones.RightLeg);
      finalKneeZ = (leftKneeL2.z + rightKneeL2.z) * 0.5;
      const kneeLocalY = Math.min(leftKneeL2.y, rightKneeL2.y);

      // Y-Alignment: Estimate thigh underside Y and shift characterModel.position.y so thighs sit flush on top of seatTopY + 0.08
      const hipsL = getBenchLocal(bones.Hips);
      const thighThickness = charHeight * 0.055;
      const thighBottomY = Math.min(hipsL.y, kneeLocalY) - thighThickness;

      const targetThighY = seatTopY + 0.08;
      const deltaY = targetThighY - thighBottomY;
      characterModel.position.y += deltaY;
      characterModel.updateMatrixWorld(true);

      finalThighBottomY = targetThighY;

      // Re-measure foot bottom Y (ankle minus sole thickness ~charHeight * 0.04)
      const leftFootL = getBenchLocal(bones.LeftFoot);
      const rightFootL = getBenchLocal(bones.RightFoot);
      const ankleLocalY = Math.min(leftFootL.y, rightFootL.y);

      let toeLocalY = ankleLocalY;
      if (leftToe && rightToe) {
        toeLocalY = Math.min(getBenchLocal(leftToe).y, getBenchLocal(rightToe).y);
      }
      const soleOffset = charHeight * 0.04;
      finalFootBottomY = Math.min(ankleLocalY - soleOffset, toeLocalY - charHeight * 0.025);

      // If foot soles sit within 0.00–0.15 of sidewalk (or if child whose legs naturally hang), alignment is complete!
      if (finalFootBottomY <= 0.15 || isChild) {
        break;
      }

      // If feet hover (> 0.15), pitch thighs downward slightly more to reach sidewalk
      pitchY -= 0.035;
    }

    // Save seatedQuat on all posed bones for safe conversational animation
    characterModel.traverse(node => {
      if (node.isBone) {
        node.userData.seatedQuat = node.quaternion.clone();
      }
    });

    // Requirement 4: Log one compact line per bench sitter
    console.log(`[Bench Sitter ${charId || (isChild ? 'child' : (isFemale ? 'female' : 'male'))} b${bIdx} s${seatIdx}] seatTopY: ${seatTopY.toFixed(2)}, seatFrontZ: ${seatFrontZ.toFixed(2)}, finalKneeZ: ${finalKneeZ.toFixed(2)}, finalThighBottomY: ${finalThighBottomY.toFixed(2)}, finalFootBottomY: ${finalFootBottomY.toFixed(2)}`);

    return bones;
  }

  const gossipingCrowd = [];

  function spawnSeatedBenchHuman(preferredCharId, bIdx, seatIdx, totalInBench, benchMesh = null, benchGroup = null, xOff = null) {
    const seed = bIdx * 10 + seatIdx;
    let template = preferredCharId ? riggedPedLibrary[preferredCharId] : null;
    if (!template) {
      const targetCat = preferredCharId?.includes('female') ? 'female' : (preferredCharId?.includes('boy') ? 'child' : 'male');
      template = getTemplateForCategory(targetCat, null, seed);
    }

    const group = new THREE.Group();
    group.name = `seated-human-${bIdx}-${seatIdx}`;

    // Monsoon rain umbrella (Lightweight single MeshLambertMaterial subtree)
    const umbrella = new THREE.Group();
    umbrella.name = 'bench-umbrella';
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x0f172a, side: THREE.DoubleSide });
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(5.0, 2.0, 12, 1, true), canopyMat);
    canopy.position.y = 7.0;
    umbrella.add(canopy);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7.8, 6), shaftMat);
    shaft.position.y = 3.5;
    umbrella.add(shaft);
    optimizeStaticSubtree(umbrella);
    umbrella.visible = false;
    umbrella.position.set(1.2, 0.5, 0.8);
    group.add(umbrella);

    const neighborAngle = (seatIdx === 0) ? 0.26 : ((seatIdx === 1 && totalInBench === 3) ? 0.0 : -0.26);
    group.rotation.y = neighborAngle;

    if (benchGroup && typeof xOff === 'number') {
      group.position.set(xOff, 0, 0);
      benchGroup.add(group);
      benchGroup.updateMatrixWorld(true);
    }

    if (template && template.scene) {
      const riggedModel = cloneRiggedCharacter(template.scene, seed);
      if (riggedModel && riggedModel.isObject3D) {
        group.add(riggedModel);
        pruneNullChildren(group);
        const isChild = (preferredCharId && preferredCharId.includes('boy')) || (template && template.category === 'child');
        const isFemale = (preferredCharId && preferredCharId.includes('female')) || (template && template.category === 'female');
        const bones = applySeatedPoseToRiggedModel(riggedModel, seatIdx, totalInBench, isChild, isFemale, benchMesh || benchGroup, bIdx, template.id);

        return {
          group: group,
          benchIdx: bIdx,
          seatIdx: seatIdx,
          totalInBench: totalInBench,
          preferredCharId: preferredCharId,
          charId: template.id,
          category: template.category,
          isProcedural: false,
          isSkinned: true,
          benchMesh: benchMesh,
          bones: {
            head: bones.Head,
            neck: bones.Neck,
            spine: bones.Spine1 || bones.Spine,
            gestureForeArm: (seatIdx === 0 ? bones.RightForeArm : bones.LeftForeArm),
            otherForeArm: (seatIdx === 0 ? bones.LeftForeArm : bones.RightForeArm),
            gestureHand: (seatIdx === 0 ? bones.RightHand : bones.LeftHand)
          },
          baseRot: {
            headX: 0.04, headY: 0, headZ: 0,
            spineX: 0.08, spineY: 0,
            foreArmX: 0.75
          },
          cycleOffset: bIdx * 2.3 + seatIdx * 3.7,
          umbrella: umbrella
        };
      }
    }

    // Invisible placeholder for bench-sitter until template loads and queue spawns character
    // NEVER show old blocky procedural humans
    group.visible = false;
    return {
      group: group,
      benchIdx: bIdx,
      seatIdx: seatIdx,
      totalInBench: totalInBench,
      preferredCharId: preferredCharId,
      charId: 'placeholder',
      category: preferredCharId?.includes('female') ? 'female' : 'male',
      isProcedural: false,
      isSkinned: false,
      isPlaceholder: true,
      benchMesh: benchMesh,
      bones: null,
      baseRot: null,
      cycleOffset: bIdx * 2.3 + seatIdx * 3.7,
      umbrella: umbrella
    };
  }

  const _sitterWorldPos = new THREE.Vector3();

  function updateGossipingCrowd(time, delta, isRain = false) {
    if (!gossipingCrowd || !gossipingCrowd.length) return;

    const rainActive = Boolean(isRain);
    const qEuler = _gossipEuler;
    const qDelta = _gossipDelta;

    for (let i = 0; i < gossipingCrowd.length; i++) {
      const person = gossipingCrowd[i];
      if (!person || !person.group || !person.group.isObject3D || !person.group.visible) continue;

      if (person.umbrella) {
        person.umbrella.visible = rainActive;
      }

      // Distance LOD: skip updating bench-sitters farther than 160 units from camera;
      // In Tier Low, throttle distant bench-sitters (> 100 units) to every 3rd frame
      if (typeof camera !== 'undefined' && camera && person.group) {
        person.group.getWorldPosition(_sitterWorldPos);
        const distToCam = _sitterWorldPos.distanceTo(camera.position);
        if (distToCam > 160) {
          continue;
        }
        if (currentTier === 'low' && distToCam > 100) {
          person._gossipCadence = ((person._gossipCadence || 0) + 1) % 3;
          if (person._gossipCadence !== 0) continue;
        }
      }

      const { bones, baseRot, cycleOffset, seatIdx, totalInBench, isProcedural } = person;
      if (!bones) continue;

      const groupTime = time * 0.75 + cycleOffset;
      const isSpeaker = (seatIdx === 0) ? (Math.sin(groupTime) > 0.0) : (Math.sin(groupTime) <= 0.0);
      const intensity = Math.abs(Math.sin(groupTime));

      const neighborTurn = (seatIdx === 0) ? 0.32 : ((seatIdx === 1 && totalInBench === 3) ? (Math.sin(time * 0.5 + cycleOffset) * 0.3) : -0.32);

      if (!isProcedural) {
        // Safe Rigged Mixamo Gossiping with Quaternion deltas (Zero Euler / T-Pose Resets)
        // 1. Head: gentle turn toward neighbor + light conversational nod and tilt
        if (bones.head && bones.head.userData && bones.head.userData.seatedQuat) {
          const nod = isSpeaker
            ? (Math.sin(time * 4.5) * 0.08 * intensity + Math.sin(time * 2.2) * 0.04)
            : ((Math.sin(time * 1.5) > 0.3) ? (Math.sin(time * 1.5) * 0.05) : 0);
          const turn = neighborTurn + (isSpeaker ? Math.sin(time * 1.2) * 0.05 : Math.sin(time * 0.8) * 0.03);
          const tilt = isSpeaker ? (Math.sin(time * 1.8) * 0.04 * intensity) : 0;

          qEuler.set(nod, turn, tilt, 'YXZ');
          qDelta.setFromEuler(qEuler);
          bones.head.quaternion.copy(bones.head.userData.seatedQuat).multiply(qDelta);
        }

        // 2. Neck: subtle sympathetic turn
        if (bones.neck && bones.neck.userData && bones.neck.userData.seatedQuat) {
          const turn = neighborTurn * 0.3;
          qEuler.set(0, turn, 0, 'YXZ');
          qDelta.setFromEuler(qEuler);
          bones.neck.quaternion.copy(bones.neck.userData.seatedQuat).multiply(qDelta);
        }

        // 3. Spine: subtle torso sway and breathing recline
        if (bones.spine && bones.spine.userData && bones.spine.userData.seatedQuat) {
          const swayLean = isSpeaker ? (Math.sin(time * 1.2) * 0.03 * intensity) : (Math.sin(time * 0.8) * 0.015);
          const swayTurn = neighborTurn * (isSpeaker ? 0.15 : 0.08);

          qEuler.set(swayLean, swayTurn, 0, 'YXZ');
          qDelta.setFromEuler(qEuler);
          bones.spine.quaternion.copy(bones.spine.userData.seatedQuat).multiply(qDelta);
        }

        // 4. Gesture Forearm: small conversational lift & turn when speaking
        if (bones.gestureForeArm && bones.gestureForeArm.userData && bones.gestureForeArm.userData.seatedQuat) {
          if (isSpeaker) {
            const gesturePitch = Math.sin(time * 3.2) * 0.16 * intensity + 0.08;
            const gestureYaw = Math.cos(time * 2.8) * 0.10 * intensity;
            qEuler.set(gesturePitch, gestureYaw, 0, 'YXZ');
            qDelta.setFromEuler(qEuler);
            bones.gestureForeArm.quaternion.copy(bones.gestureForeArm.userData.seatedQuat).multiply(qDelta);
          } else {
            bones.gestureForeArm.quaternion.copy(bones.gestureForeArm.userData.seatedQuat);
          }
        }

        // 5. Gesture Hand: subtle wrist accent
        if (bones.gestureHand && bones.gestureHand.userData && bones.gestureHand.userData.seatedQuat) {
          if (isSpeaker) {
            const handRoll = Math.sin(time * 3.5) * 0.15 * intensity;
            qEuler.set(0, 0, handRoll, 'YXZ');
            qDelta.setFromEuler(qEuler);
            bones.gestureHand.quaternion.copy(bones.gestureHand.userData.seatedQuat).multiply(qDelta);
          } else {
            bones.gestureHand.quaternion.copy(bones.gestureHand.userData.seatedQuat);
          }
        }

        // 6. Non-gesturing Forearm: keep resting cleanly on lap
        if (bones.otherForeArm && bones.otherForeArm.userData && bones.otherForeArm.userData.seatedQuat) {
          bones.otherForeArm.quaternion.copy(bones.otherForeArm.userData.seatedQuat);
        }

        if (person.group) {
          person.group.traverse(node => {
            if (node && node.isSkinnedMesh && node.skeleton) {
              node.skeleton.update();
            }
          });
        }
      } else {
        // Procedural seated human fallback
        if (bones.head) {
          if (isSpeaker) {
            const nod = Math.sin(time * 4.5) * 0.09 * intensity + Math.sin(time * 2.2) * 0.05;
            const tilt = Math.sin(time * 1.8) * 0.05 * intensity;
            bones.head.rotation.x = baseRot.headX + nod;
            bones.head.rotation.y = baseRot.headY + neighborTurn + Math.sin(time * 1.2) * 0.06;
            bones.head.rotation.z = baseRot.headZ + tilt;
          } else {
            const listenerNod = (Math.sin(time * 1.5) > 0.3) ? (Math.sin(time * 1.5) * 0.06) : 0;
            bones.head.rotation.x = baseRot.headX + listenerNod;
            bones.head.rotation.y = baseRot.headY + neighborTurn + Math.sin(time * 0.8) * 0.03;
            bones.head.rotation.z = baseRot.headZ;
          }
        }

        if (bones.spine) {
          const lean = isSpeaker ? (Math.sin(time * 1.2) * 0.04 * intensity + 0.04) : (Math.sin(time * 0.8) * 0.02);
          bones.spine.rotation.x = baseRot.spineX + lean;
          bones.spine.rotation.y = baseRot.spineY + (isSpeaker ? neighborTurn * 0.4 : neighborTurn * 0.2);
        }

        if (bones.gestureForeArm) {
          if (isSpeaker) {
            const gesture = (Math.sin(time * 3.2) * 0.22 + 0.15) * intensity;
            bones.gestureForeArm.rotation.x = baseRot.foreArmX + gesture;
            if (bones.gestureHand) bones.gestureHand.rotation.z = Math.sin(time * 3.5) * 0.18 * intensity;
          } else {
            bones.gestureForeArm.rotation.x = baseRot.foreArmX;
            if (bones.gestureHand) bones.gestureHand.rotation.z = 0;
          }
        }
      }
    }
  }

  function spawnOneRiggedBenchHuman(p) {
    if (!p || !p.group || !p.group.isObject3D) return;
    if (!p.isPlaceholder && p.charId === p.preferredCharId && p.isSkinned) return;

    const targetId = p.preferredCharId;
    const template = targetId ? riggedPedLibrary[targetId] : null;
    if (!template || !template.scene) return;

    try {
      const seed = p.benchIdx * 10 + p.seatIdx;
      const riggedModel = cloneRiggedCharacter(template.scene, seed);
      if (!riggedModel || !riggedModel.isObject3D) return;

      const toRemove = [];
      p.group.children.forEach(c => {
        if (c && c !== p.umbrella) toRemove.push(c);
      });
      toRemove.forEach(c => {
        if (c && c.isObject3D) p.group.remove(c);
      });

      p.group.add(riggedModel);
      pruneNullChildren(p.group);

      const isChild = (template && template.category === 'child') || (p.preferredCharId && p.preferredCharId.includes('boy'));
      const isFemale = (template && template.category === 'female') || (p.preferredCharId && p.preferredCharId.includes('female'));
      const benchGroup = p.group.parent;
      const benchMesh = p.benchMesh || (benchGroup ? benchGroup.children.find(c => c.name === 'dhaka-sidewalk-bench') : null);
      if (benchGroup) benchGroup.updateMatrixWorld(true);
      const bones = applySeatedPoseToRiggedModel(riggedModel, p.seatIdx, p.totalInBench, isChild, isFemale, benchMesh || benchGroup, p.benchIdx, template.id);

      p.charId = template.id;
      p.category = template.category;
      p.isProcedural = false;
      p.isSkinned = true;
      p.isPlaceholder = false;
      p.bones = {
        head: bones.Head,
        neck: bones.Neck,
        spine: bones.Spine1 || bones.Spine,
        gestureForeArm: (p.seatIdx === 0 ? bones.RightForeArm : bones.LeftForeArm),
        otherForeArm: (p.seatIdx === 0 ? bones.LeftForeArm : bones.RightForeArm),
        gestureHand: (p.seatIdx === 0 ? bones.RightHand : bones.LeftHand)
      };
      p.baseRot = {
        headX: 0.04, headY: 0, headZ: 0,
        spineX: 0.08, spineY: 0,
        foreArmX: 0.75
      };
      p.group.visible = true;
      riggedModel.visible = true;
    } catch (err) {
      console.warn('[Pedestrians] Failed to spawn bench human to rigged:', err);
    }
  }

  function upgradeGossipingHumansToRigged() {
    if (!gossipingCrowd || !gossipingCrowd.length) return;
    for (let i = 0; i < gossipingCrowd.length; i++) {
      spawnOneRiggedBenchHuman(gossipingCrowd[i]);
    }

    for (let i = 0; i < gossipingCrowd.length; i++) {
      if (gossipingCrowd[i] && gossipingCrowd[i].group) {
        pruneNullChildren(gossipingCrowd[i].group);
      }
    }
    if (typeof scene !== 'undefined' && scene) {
      pruneNullChildren(scene);
    }
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

    let childGuard1 = 0;
    while (vehicle.children.length && ++childGuard1 < 50) vehicle.remove(vehicle.children[0]);
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
      if (thighL && thighL.userData.initQuat) {
        _pedalQZ.setFromAxisAngle(_pedalAxisZ, sinL * 0.38);
        thighL.quaternion.copy(thighL.userData.initQuat).multiply(_pedalQZ);
      }
      if (shinL && shinL.userData.initQuat) {
        _pedalQZ.setFromAxisAngle(_pedalAxisZ, cosL * 0.45);
        shinL.quaternion.copy(shinL.userData.initQuat).multiply(_pedalQZ);
      }
      if (thighR && thighR.userData.initQuat) {
        _pedalQZ.setFromAxisAngle(_pedalAxisZ, -sinL * 0.38);
        thighR.quaternion.copy(thighR.userData.initQuat).multiply(_pedalQZ);
      }
      if (shinR && shinR.userData.initQuat) {
        _pedalQZ.setFromAxisAngle(_pedalAxisZ, -cosL * 0.45);
        shinR.quaternion.copy(shinR.userData.initQuat).multiply(_pedalQZ);
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

    let childGuard1 = 0;
    while (vehicle.children.length && ++childGuard1 < 50) vehicle.remove(vehicle.children[0]);
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

    let childGuard1 = 0;
    while (vehicle.children.length && ++childGuard1 < 50) vehicle.remove(vehicle.children[0]);
    vehicle.add(model);
    vehicle.userData.wheels = wheels;
    vehicle.userData.wheelRadius = 2.6;
  }

  function replaceBusWithModel(vehicle, prototype) {
    return; // Pure Three.js procedural Hasan Transit Bus model preserved (zero GLB)
  }

  function replaceCarWithModel(vehicle, prototype) {
    return; // Pure Three.js procedural car models preserved
  }

  function replaceMetroTrainWithModel(prototype) {
    if (!trainGroup) return;
    return; // Pure Three.js procedural Kawasaki MRT Line-6 model preserved
  }

  function replacePedestriansWithModel(prototype) {
    return; // Pure Three.js smooth procedural humans preserved (zero GLB)
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
      let pedGuard = 0;
      while (pedEntry.mesh.children.length && ++pedGuard < 50) pedEntry.mesh.remove(pedEntry.mesh.children[0]);
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
      wSub.userData.noMerge = true;
      wSub.userData.isWheel = true;
      wSub.matrixAutoUpdate = true;
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
    ambStrobeRed.userData.noMerge = true;
    ambGroup.add(ambStrobeRed);

    ambStrobeBlue = new THREE.PointLight(0x0066ff, 2.5, 120);
    ambStrobeBlue.position.set(4, 22.5, 0);
    ambStrobeBlue.userData.noMerge = true;
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

    // Ambulance wheels preserved as direct child meshes
    optimizeStaticSubtree(ambGroup, { packTextures: true });

    ambGroup.visible = false;
    scene.add(ambGroup);
    return ambGroup;
  }

  // 3D Human Pedestrian Builder — Rigged Base Meshes or Articulated Procedural Pedestrians
  function create3DPedestrian(p) {
    return instantiatePedestrian(p);
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
    cv.width = 1024;
    cv.height = 256;
    const ctx = cv.getContext('2d');

    // High-contrast black LED display background
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, cv.width, cv.height);

    // Subtle dark LED dot matrix mesh background
    ctx.fillStyle = 'rgba(251, 191, 36, 0.05)';
    for (let x = 12; x < 1012; x += 12) {
      for (let y = 12; y < 244; y += 12) {
        ctx.fillRect(x, y, 5, 5);
      }
    }

    // Outer border with subtle amber glow
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, 1000, 232);

    // Crisp glowing amber-yellow Bengali text: উত্তরা-মতিঝিল
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 104px "Noto Sans Bengali", "Hind Siliguri", "Kalpurush", sans-serif';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('উত্তরা-মতিঝিল', cv.width / 2, 104);

    // Subtitle English text: UTTARA - MOTIJHEEL
    ctx.font = 'bold 44px sans-serif';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fef08a';
    ctx.fillText('UTTARA ⇄ MOTIJHEEL · MRT LINE-6', cv.width / 2, 192);

    const tex = new THREE.CanvasTexture(cv);
    setupCrispCanvasTexture(tex);
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
    setupCrispCanvasTexture(tex);
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
    setupCrispCanvasTexture(tex);
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
    setupCrispCanvasTexture(tex);
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
    setupCrispCanvasTexture(tex);
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
    hasanBusList.length = 0;
    initLiveBusMirrors();

    // 1. Fog & Background (Dusk Sky Gradient: #1b1035 zenith to #5b2245 horizon)
    duskSkyTexture = createDuskSkyGradientTexture();
    scene.background = duskSkyTexture;
    scene.fog = new THREE.FogExp2(0x2e1538, 0.00020);

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

    // 3. Renderer (High performance WebGL, zero preserveDrawingBuffer, zero stencil overhead)
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      stencil: false
    });
    renderer.setSize(width, height, false);
    const isMobileClient = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const targetPixelRatio = isMobileClient ? Math.min(dpr, 1.0) : Math.min(dpr, 1.25);
    currentAdaptivePixelRatio = targetPixelRatio;
    renderer.setPixelRatio(targetPixelRatio);

    // High 120+ FPS performance: rely on lightweight InstancedMesh ground contact shadow discs (zero shadow render passes)
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.autoUpdate = false;

    if (typeof THREE.SRGBColorSpace !== 'undefined') {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } else if (typeof THREE.sRGBEncoding !== 'undefined') {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    // Pause WebGL rendering loop when off-screen (e.g. scrolled down to #planner)
    if (typeof IntersectionObserver !== 'undefined' && containerEl) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isRenderLoopPaused = !entry.isIntersecting;
          if (!isRenderLoopPaused) {
            lastFrameTime = 0;
          }
        });
      }, { threshold: 0.05 });
      observer.observe(containerEl);
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

    // Intersection Corner PointLights (Lightweight immediate glow on Frame 1)
    [[-135, 24, -100], [135, 24, -100], [-135, 24, 100], [135, 24, 100]].forEach(pos => {
      const streetGlow = new THREE.PointLight(0xffbd66, 1.25, 135, 2);
      streetGlow.position.set(pos[0], pos[1], pos[2]);
      cornerPointLights.push(streetGlow);
      scene.add(streetGlow);
    });

    // 5. Ground & Road Network (Fast 1024x1024 MeshLambertMaterial)
    const roadTex = createRoadCanvasTexture();
    const roadMat = new THREE.MeshLambertMaterial({
      map: roadTex,
      color: 0xffffff
    });
    roadMaterial = roadMat;
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const ground = new THREE.Mesh(groundGeo, roadMat);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    ground.receiveShadow = false;
    ground.matrixAutoUpdate = false;
    ground.updateMatrix();
    scene.add(ground);

    // Sidewalk Corners (All 4 corners + curbs + yellow railings merged into 1 draw call!)
    beginSidewalkBatch();
    addSidewalkCorner(480, 260, -350, -210);
    addSidewalkCorner(480, 260, 350, -210);
    addSidewalkCorner(480, 260, -350, 210);
    addSidewalkCorner(480, 260, 350, 210);
    flushSidewalkBatch();

    // 6. Elevated Metro Rail Viaduct & Station Superstructure (Batched into <= 5 draw calls!)
    const viaductY = 42;
    const viaductRoot = new THREE.Group();

    const pierXCoords = [-520, -350, -180, 0, 480];
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    pierXCoords.forEach(px => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(18, viaductY, 18), pierMat);
      col.position.set(px, viaductY / 2, VIADUCT_Z);
      viaductRoot.add(col);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(32, 6, 28), pierMat);
      cap.position.set(px, viaductY - 3, VIADUCT_Z);
      viaductRoot.add(cap);
    });

    const beamMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8 });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1400, 7, 26), beamMat);
    beam.position.set(0, viaductY + 3.5, VIADUCT_Z);
    viaductRoot.add(beam);

    [-13.0, 13.0].forEach(pz => {
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(1400, 3.8, 1.4), beamMat);
      parapet.position.set(0, viaductY + 7.0 + 1.9, VIADUCT_Z + pz);
      viaductRoot.add(parapet);
    });

    const parapetSeamMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    const seamGeo = new THREE.BoxGeometry(0.8, 3.8, 0.15);
    for (let sx = -650; sx <= 650; sx += 50) {
      const seam = new THREE.Mesh(seamGeo, parapetSeamMat);
      seam.position.set(sx, viaductY + 7.0 + 1.9, VIADUCT_Z + 13.78);
      viaductRoot.add(seam);
    }

    const greenRibbon = new THREE.Mesh(new THREE.BoxGeometry(1400, 1.8, 0.4), new THREE.MeshBasicMaterial({ color: 0x16a34a }));
    greenRibbon.position.set(0, viaductY + 7.0 + 2.4, VIADUCT_Z + 13.8);
    viaductRoot.add(greenRibbon);

    const redRibbon = new THREE.Mesh(new THREE.BoxGeometry(1400, 1.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    redRibbon.position.set(0, viaductY + 7.0 + 0.8, VIADUCT_Z + 13.8);
    viaductRoot.add(redRibbon);

    const railMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    [-4, 4].forEach(rz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1400, 0.8, 1.4), railMat);
      rail.position.set(0, viaductY + 7.4, VIADUCT_Z + rz);
      viaductRoot.add(rail);
    });

    const catenaryMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const insMat = new THREE.MeshLambertMaterial({ color: 0xb45309 });
    const catenaryXs = [-560, -420, -280, -140, 0, 480, 600];
    catenaryXs.forEach(cx => {
      if (cx >= 170 && cx <= 450) return;
      const gantryGroup = new THREE.Group();
      gantryGroup.position.set(cx, viaductY + 7.0, VIADUCT_Z);
      [-12.2, 12.2].forEach(cz => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 29.0, 8), catenaryMat);
        col.position.set(0, 14.5, cz);
        gantryGroup.add(col);
      });
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 25.0), catenaryMat);
      crossBeam.position.set(0, 28.5, 0);
      gantryGroup.add(crossBeam);
      [-4.0, 4.0].forEach(tz => {
        const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 6), catenaryMat);
        drop.position.set(0, 26.8, tz);
        gantryGroup.add(drop);
        const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 6), insMat);
        ins.position.set(0, 26.0, tz);
        gantryGroup.add(ins);
      });
      viaductRoot.add(gantryGroup);
    });

    const contactWire = new THREE.Mesh(new THREE.BoxGeometry(1400, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0x334155 }));
    contactWire.position.set(0, viaductY + 7.0 + 25.65, VIADUCT_Z);
    viaductRoot.add(contactWire);

    const stationGroup = new THREE.Group();
    stationGroup.position.set(310, viaductY, VIADUCT_Z);

    const stFloor = new THREE.Mesh(new THREE.BoxGeometry(260, 8, 54), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
    stFloor.position.set(0, 4, 0);
    stationGroup.add(stFloor);

    const platLight = new THREE.Mesh(new THREE.BoxGeometry(240, 1.5, 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    platLight.position.set(0, 8.5, 10);
    stationGroup.add(platLight);

    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 28, 260, 24, 1, false, 0, Math.PI),
      new THREE.MeshLambertMaterial({ color: 0x0284c7, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide })
    );
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.position.set(0, 14, 0);
    stationGroup.add(canopy);

    const stSignTex = createSignboardTexture('মিরপুর ১০', 'Mirpur 10', '#020617', '#ffffff', '#38bdf8', '#00f2fe', 380, 80);
    const stSign = new THREE.Mesh(new THREE.BoxGeometry(160, 24, 3), new THREE.MeshBasicMaterial({ map: stSignTex }));
    stSign.position.set(-20, 22, 28);
    stationGroup.add(stSign);

    const boardingTex = createSignboardTexture('● BOARDING', 'MRT LINE 6', '#020617', '#4ade80', '#22c55e', '#22c55e', 256, 64);
    boardingBadgeMesh = new THREE.Mesh(new THREE.BoxGeometry(75, 18, 2), new THREE.MeshBasicMaterial({ map: boardingTex }));
    boardingBadgeMesh.position.set(95, 22, 28);
    boardingBadgeMesh.visible = false;
    boardingBadgeMesh.userData.noMerge = true;
    stationGroup.add(boardingBadgeMesh);

    const stairs = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 70), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
    stairs.position.set(-110, -18, 55);
    stairs.rotation.x = 0.55;
    stationGroup.add(stairs);

    const tactilePaving = new THREE.Mesh(new THREE.BoxGeometry(240, 0.4, 2.2), new THREE.MeshLambertMaterial({ color: 0xfacc15 }));
    tactilePaving.position.set(0, 8.2, 11);
    stationGroup.add(tactilePaving);

    const trussMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    for (let tx = -100; tx <= 100; tx += 40) {
      const archTruss = new THREE.Mesh(new THREE.CylinderGeometry(28.2, 28.2, 1.2, 18, 1, false, 0, Math.PI), trussMat);
      archTruss.rotation.z = Math.PI / 2;
      archTruss.rotation.y = Math.PI / 2;
      archTruss.position.set(tx, 14, 0);
      stationGroup.add(archTruss);
    }

    const nextTrainTex = createSignboardTexture('● ট্রেন আসছে: ২ মিনিট', 'NEXT TRAIN: 2 MIN', '#020617', '#38bdf8', '#4ade80', '#00f2fe', 256, 64);
    const nextTrainMesh = new THREE.Mesh(new THREE.BoxGeometry(90, 16, 2), new THREE.MeshBasicMaterial({ map: nextTrainTex }));
    nextTrainMesh.position.set(-85, 20, 2);
    stationGroup.add(nextTrainMesh);

    viaductRoot.add(stationGroup);
    optimizeStaticSubtree(viaductRoot, { packTextures: true, excludeSet: new Set([boardingBadgeMesh]) });
    freezeStatic(viaductRoot);
    scene.add(viaductRoot);

    // 7. 3D Metro Rail 3-Coach Train (Deferred to Frame 1 or flushed on-demand in 'metro' focus!)
    let trainBuilt = false;
    const buildTrainJob = () => {
      if (trainBuilt || trainGroup) { trainBuilt = true; buildTrainJob._done = true; return; }
      trainBuilt = true;
      buildTrainJob._done = true;
      trainGroup = new THREE.Group();
      trainGroup.position.set(-200, viaductY + 8.05, VIADUCT_Z);
      const coach1 = createTrainCoach(true, false, 0); coach1.position.x = 75; trainGroup.add(coach1);
      const coach2 = createTrainCoach(false, false, 1); coach2.position.x = 0; trainGroup.add(coach2);
      const coach3 = createTrainCoach(false, true, 2); coach3.position.x = -75; trainGroup.add(coach3);
      optimizeStaticSubtree(trainGroup, { packTextures: true });
      scene.add(trainGroup);
    };

    // 8. 4 3D Traffic Signal Posts (Posts merged + 12 lamps instanced = 2 calls!)
    beginSignalBatch();
    signalLamps.nw = createTrafficSignalPost(-140, -110, 0);
    signalLamps.ne = createTrafficSignalPost(140, -110, Math.PI);
    signalLamps.sw = createTrafficSignalPost(-140, 110, -Math.PI / 2);
    signalLamps.se = createTrafficSignalPost(140, 110, Math.PI / 2);
    flushSignalBatch();

    // 9. Instantiate 3D Vehicle Fleet (Immediate Car #0 on Frame 0 -> <200ms opening! Rest staggered 1 job/frame across Frames 1-6)
    scenePropBuildQueue.length = 0;
    scenePropBuildQueue.push(buildTrainJob);

    const deferredByType = { bus: [], cng: [], rickshaw: [], bike: [], car: [] };
    const secondaryVehicleJobs = [];
    if (vehiclesData && Array.isArray(vehiclesData)) {
      let carBuiltImmediate = 0;
      vehiclesData.forEach(v => {
        const measuredHalf = (v.type === 'bus' ? 38.6 : (v.type === 'car' ? 22.0 : (v.type === 'cng' ? 16.0 : (v.type === 'rickshaw' ? 17.0 : 18.0))));
        v.halfLength = measuredHalf;
        const colorHex = (v.color || v.bikeColor) ? parseInt((v.bikeColor || v.color).replace('#', '0x'), 16) : null;

        // Only first car builds synchronously on Frame 0 so initial 2D->3D switch renders immediately (<200ms)
        const buildImmediate = (v.type === 'car' && carBuiltImmediate === 0);
        if (v.type === 'car') carBuiltImmediate++;

        if (buildImmediate) {
          const mesh = create3DVehicle(v.type, colorHex, v.id, v);
          mesh.rotation.y = getHeading(v.dir);
          mesh.userData.previousRoadPosition = v.pos;
          mesh.userData.halfLength = measuredHalf;
          vehicleMeshMap[v.id] = { mesh: mesh, data: v };
          if (mesh.userData && mesh.userData.fleetHitInst && instancedHitLookup.has(mesh.userData.fleetHitInst)) {
            instancedHitLookup.get(mesh.userData.fleetHitInst)[mesh.userData.fleetSlot] = {
              kind: 'vehicle', id: v.id, type: v.type || 'car', data: v, mesh: mesh
            };
          }
        } else {
          const placeholder = new THREE.Group();
          placeholder.visible = false;
          placeholder.rotation.y = getHeading(v.dir);
          placeholder.userData.previousRoadPosition = v.pos;
          placeholder.userData.halfLength = measuredHalf;
          if (v.type === 'car') placeholder.userData.isCar = true;
          if (v.type === 'bike') placeholder.userData.isBike = true;
          if (v.type === 'bus') placeholder.userData.isBus = true;
          if (v.type === 'cng') placeholder.userData.isCNG = true;
          if (v.type === 'rickshaw') placeholder.userData.isRickshaw = true;
          scene.add(placeholder);
          vehicleMeshMap[v.id] = { mesh: placeholder, data: v };

          let upgraded = false;
          const upgradeFn = () => {
            if (upgraded) return;
            upgraded = true;
            const realMesh = create3DVehicle(v.type, colorHex, v.id, v);
            realMesh.position.copy(placeholder.position);
            realMesh.rotation.copy(placeholder.rotation);
            realMesh.userData.previousRoadPosition = placeholder.userData.previousRoadPosition;
            realMesh.userData.halfLength = measuredHalf;
            scene.remove(placeholder);
            vehicleMeshMap[v.id].mesh = realMesh;
            if (realMesh.userData && realMesh.userData.fleetHitInst && instancedHitLookup.has(realMesh.userData.fleetHitInst)) {
              instancedHitLookup.get(realMesh.userData.fleetHitInst)[realMesh.userData.fleetSlot] = {
                kind: 'vehicle', id: v.id, type: v.type || 'car', data: v, mesh: realMesh
              };
            }
            if (activeTargetVehicle && (activeTargetVehicle.id === v.id || (activeTargetVehicle.data && activeTargetVehicle.data.id === v.id))) {
              activeTargetVehicle.mesh = realMesh;
            }
          };
          placeholder.userData.buildOnDemand = upgradeFn;
          if (deferredByType[v.type]) deferredByType[v.type].push(upgradeFn);
          else secondaryVehicleJobs.push(upgradeFn);
        }
      });
    }

    // Stagger Bus fleet (Frame 2), CNG fleet (Frame 3), Rickshaw fleet (Frame 4), First Bike + Secondary Vehicles (Frames 5-8)
    const fleetBatchJobs = [];
    ['bus', 'cng', 'rickshaw'].forEach(t => {
      const fns = deferredByType[t];
      if (fns && fns.length > 0) {
        const job = () => {
          if (job._done) return;
          job._done = true;
          for (let i = 0; i < fns.length; i++) fns[i]();
          syncAllInstancedPools();
        };
        fleetBatchJobs.push(job);
      }
    });
    if (deferredByType.bike.length > 0) {
      const firstBike = deferredByType.bike.shift();
      const job = () => { if (job._done) return; job._done = true; firstBike(); };
      fleetBatchJobs.push(job);
    }
    const remSecondary = deferredByType.car.concat(deferredByType.bike, secondaryVehicleJobs);
    for (let vi = 0; vi < remSecondary.length; vi += 2) {
      const a = remSecondary[vi], b = remSecondary[vi + 1];
      const job = () => { if (job._done) return; job._done = true; if (a) a(); if (b) b(); };
      fleetBatchJobs.push(job);
    }

    deferredModeFlusher = (modeName) => {
      if (modeName === 'metro') {
        buildTrainJob();
        return;
      }
      const list = deferredByType[modeName];
      if (list && list.length > 0) {
        for (let i = 0; i < list.length; i++) list[i]();
        list.length = 0;
        syncAllInstancedPools();
      }
    };

    // 10. Instantiate 3D Emergency Ambulance (EB -> Heading 0)
    ambulanceGroup = create3DAmbulance();

    // 11. Instantiate 3D Pedestrians (Tier 1 GLB + Articulated SkinnedMesh Walkers staggered in pedSpawnQueue)
    activeRiggedWalkerCount = 0;
    loadAllRiggedPedestrians();

    if (pedestriansData && Array.isArray(pedestriansData)) {
      let adultCounter = 0;
      pedestriansData.forEach((p, idx) => {
        if (p.id === 'ped_w1' || idx === 4 || p.isChild) {
          p.pedCategory = 'child'; p.isChild = true; p.gender = 'child';
        } else {
          const cat = (adultCounter % 2 === 0) ? 'male' : 'female';
          adultCounter++;
          p.pedCategory = cat; p.gender = cat; p.isFemale = (cat === 'female');
        }
        const mesh = create3DPedestrian(p);
        pedMeshMap['ped_' + idx] = { mesh: mesh, data: p };
      });
    }

    // 12. Enqueue staggered vehicle fleets (1/frame) followed by streetlights, trees, skyline & benches
    for (let fi = 0; fi < fleetBatchJobs.length; fi++) {
      scenePropBuildQueue.push(fleetBatchJobs[fi]);
    }

    // Chunk 1: 12 Instanced Streetlights (2 draw calls) + Overhead Utility Cables (1 merged mesh)
    scenePropBuildQueue.push(() => {
      const lightCoords = [
        [-135, 26, -100], [135, 26, -100], [-135, 26, 100], [135, 26, 100],
        [-320, 26, -100], [-480, 26, -100], [-320, 26, 100], [-480, 26, 100],
        [320, 26, -100], [480, 26, -100], [320, 26, 100], [480, 26, 100]
      ];
      streetLightPolesInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.2, 1.5, 26, 8), new THREE.MeshLambertMaterial({ color: 0x334155 }), lightCoords.length);
      streetLightHeadsInst = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 3, 7), new THREE.MeshBasicMaterial({ color: 0xfef08a }), lightCoords.length);
      lightCoords.forEach((pos, idx) => {
        _instPos.set(pos[0], 13, pos[2]); _instQuat.identity(); _instScale.set(1, 1, 1); _instMat4.compose(_instPos, _instQuat, _instScale);
        streetLightPolesInst.setMatrixAt(idx, _instMat4);
        _instPos.set(pos[0], 26, pos[2]); _instMat4.compose(_instPos, _instQuat, _instScale);
        streetLightHeadsInst.setMatrixAt(idx, _instMat4);
      });
      streetLightPolesInst.instanceMatrix.needsUpdate = true;
      streetLightHeadsInst.instanceMatrix.needsUpdate = true;
      freezeStatic(streetLightPolesInst); freezeStatic(streetLightHeadsInst);
      scene.add(streetLightPolesInst); scene.add(streetLightHeadsInst);

      const cableGroup = new THREE.Group();
      const cableMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      const cableSpans = [
        [[-150, 48, -170], [-162, 38, -10], [-150, 46, 140]],
        [[-148, 49, -168], [-160, 39, -5], [-148, 47, 142]],
        [[-146, 47, -172], [-158, 37, -15], [-146, 45, 138]],
        [[150, 48, -170], [162, 38, -10], [150, 46, 140]],
        [[148, 49, -168], [160, 39, -5], [148, 47, 142]],
        [[146, 47, -172], [158, 37, -15], [146, 45, 138]],
        [[-140, 52, -160], [-25, 42, -15], [140, 48, 140]],
        [[-600, 44, VIADUCT_Z + 13.5], [0, 44, VIADUCT_Z + 13.5], [600, 44, VIADUCT_Z + 13.5]]
      ];
      cableSpans.forEach(pts => {
        const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])));
        cableGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.24, 4, false), cableMat));
      });
      optimizeStaticSubtree(cableGroup);
      freezeStatic(cableGroup);
      scene.add(cableGroup);
    });

    // Chunk 2: All 40 Trees (Instanced into 2 draw calls)
    scenePropBuildQueue.push(() => {
      [-520, -460, -390, -310, -230, -170, 170, 230, 310, 390, 460, 520].forEach(tx => {
        addTree(tx, -88);
        addTree(tx, 88);
      });
      [-260, -220, -180, -140, 140, 180, 220, 260].forEach(tz => {
        addTree(-118, tz);
        addTree(118, tz);
      });
    });

    // Chunk 3: NW & NE Skyline Buildings & Landmarks into unified City Batch
    scenePropBuildQueue.push(() => {
      beginCityBatch();
      create3DBuilding({ x: -490, z: -210, width: 34, depth: 40, height: 115, wallColor: '#8da6b6', sideColor: '#405966', floors: 6, cols: 2, winColor: '#f3ddb0', antenna: true });
      create3DBuilding({ x: -360, z: -210, width: 200, depth: 65, height: 90, wallColor: '#b97863', sideColor: '#633f38', floors: 4, cols: 6, winColor: '#f1d9a8', signboard: { text: 'ঢাকা বেকারি', sub: 'Dhaka Bakery', bg: '#0f172a', textCol: '#ffffff', border: '#fbbf24', w: 85, h: 18, ox: -45, y: 15, awnCol: 0xb45309 } });
      if (activeCityCollector) {
        const smPharm = new THREE.Matrix4().makeTranslation(-360 + 45, 15, -210 + (65 / 2) + 1.5);
        pushBoxSignToCity(smPharm, 85, 18, 2.5, 'গ্রীন ফার্মেসি', 'Pharmacy', '#0f172a', '#ffffff', '#6ee7b7', '#10b981');
        const smBb = new THREE.Matrix4().makeTranslation(-360, 90 + 32, -210);
        pushBoxSignToCity(smBb, 150, 46, 4, 'ঢাকা আমাদের শহর', 'DHAKA OUR CITY', '#042f2e', '#fde047', '#34d399', '#10b981');
        const legGeo = getPedGeo('bbLegGeo', () => new THREE.CylinderGeometry(1.2, 1.2, 28, 6));
        [-60, -20, 20, 60].forEach(lx => {
          activeCityCollector.opaquePieces.push({ geometry: legGeo, matrix: new THREE.Matrix4().makeTranslation(-360 + lx, 90 + 14, -210), color: 0x475569 });
        });
      }
      create3DBuilding({ x: -225, z: -210, width: 80, depth: 60, height: 110, wallColor: '#6f9887', sideColor: '#3e5b53', floors: 5, cols: 3, winColor: '#f2dfb6', waterTank: true, antenna: true, signboard: { text: 'মিরপুর ১০ শপিং কমপ্লেক্স', sub: 'Shopping Complex', bg: '#0369a1', textCol: '#ffffff', border: '#38bdf8', w: 74, h: 16, y: 14 } });
      create3DBuilding({ x: -150, z: -205, width: 68, depth: 55, height: 95, wallColor: '#bba77e', sideColor: '#62563f', floors: 4, cols: 3, winColor: '#f4dfaa', antenna: true, signboard: { text: 'বিকাশ ও নগদ এজেন্ট', sub: 'bKash & Nagad Agent', bg: '#be185d', textCol: '#ffffff', border: '#f43f5e', w: 64, h: 16, y: 14 } });
      create3DBuilding({ x: 150, z: -205, width: 68, depth: 55, height: 95, wallColor: '#8e829b', sideColor: '#51495e', floors: 4, cols: 3, winColor: '#ead9bd', antenna: true, signboard: { text: 'ফ্যাশন কর্নার', sub: 'Fashion Corner', bg: '#0f172a', textCol: '#ffffff', border: '#d946ef', w: 62, h: 16, y: 14, awnCol: 0x701a75 } });
      create3DBuilding({ x: 230, z: -210, width: 75, depth: 60, height: 100, wallColor: '#5d8d89', sideColor: '#344f50', floors: 4, cols: 3, winColor: '#e9dbb9', waterTank: true, signboard: { text: 'ঢাকা ব্যাংক এটিএম 🏧', sub: 'Dhaka Bank ATM 24/7', bg: '#065f46', textCol: '#facc15', border: '#10b981', w: 68, h: 16, y: 14, awnCol: 0x0f766e } });
      create3DBuilding({ x: 315, z: -215, width: 85, depth: 60, height: 115, wallColor: '#ad7180', sideColor: '#5d3d4a', floors: 5, cols: 4, winColor: '#f3d9aa', waterTank: true, antenna: true, signboard: { text: 'সুপার শপ', sub: 'Super Shop', bg: '#0f172a', textCol: '#fef08a', border: '#ff2a54', w: 76, h: 16, y: 14, awnCol: 0xbe123c } });
      create3DBuilding({ x: 430, z: -200, width: 130, depth: 75, height: 135, wallColor: '#728ca8', sideColor: '#3d5067', floors: 6, cols: 5, winColor: '#eeddbb', antenna: true });
      if (activeCityCollector) {
        pushBoxSignToCity(new THREE.Matrix4().makeTranslation(430, 135 + 12, -200 + (75 / 2) - 10), 105, 22, 3, 'মিরপুর প্লাজা', 'MIRPUR PLAZA', '#0369a1', '#ffffff', '#00f2fe', '#00f2fe');
      }
    });

    // Chunk 4: SW & SE Buildings + Flush City Batch (Total City = 4 draw calls!)
    scenePropBuildQueue.push(() => {
      create3DBuilding({ x: -490, z: 235, width: 34, depth: 36, height: 32, wallColor: '#b98983', sideColor: '#604745', floors: 2, cols: 2, winColor: '#f2d9a9' });
      create3DBuilding({ x: -360, z: 235, width: 140, depth: 40, height: 36, wallColor: '#8c9870', sideColor: '#4d5744', floors: 2, cols: 5, winColor: '#f0dcb0', waterTank: true, antenna: true, signboard: { text: 'হাজী বিরিয়ানি ও নান্না কাবাব', sub: 'Authentic Dhaka Biryani', bg: '#78350f', textCol: '#fef08a', border: '#f59e0b', w: 88, h: 14, ox: -20, y: 12, awnCol: 0xb45309 } });
      create3DBuilding({ x: -225, z: 225, width: 55, depth: 32, height: 18, wallColor: '#8f8067', sideColor: '#534b3e', floors: 1, cols: 2, winColor: '#f1dda9', signboard: { text: 'চায়ের টং', sub: 'Traditional Tea Stall', bg: '#78350f', textCol: '#fef08a', border: '#fbbf24', w: 46, h: 10, y: 9, awnCol: 0xb45309 } });
      create3DBuilding({ x: -150, z: 225, width: 65, depth: 34, height: 30, wallColor: '#bd9a5c', sideColor: '#665334', floors: 2, cols: 3, winColor: '#f4dfaa', waterTank: true, signboard: { text: 'সোনালী জুয়েলার্স', sub: 'Sonali Jewelers', bg: '#0f172a', textCol: '#fde047', border: '#fbbf24', w: 56, h: 12, y: 11, awnCol: 0xb45309 } });
      create3DBuilding({ x: 165, z: 225, width: 85, depth: 36, height: 32, wallColor: '#9b7c88', sideColor: '#584650', floors: 2, cols: 3, winColor: '#f0dcad', antenna: true, signboard: { text: 'জনতা ফার্মেসি ✚', sub: 'Clinic & Medicine', bg: '#065f46', textCol: '#ffffff', border: '#10b981', w: 75, h: 12, y: 12, awnCol: 0x047857 } });
      create3DBuilding({ x: 320, z: 235, width: 140, depth: 40, height: 32, wallColor: '#657d95', sideColor: '#354454', floors: 2, cols: 4, winColor: '#efdbb2', waterTank: true, antenna: true });
      if (activeCityCollector) {
        const smSeBb = new THREE.Matrix4().makeRotationX(-0.22);
        smSeBb.setPosition(320, 36, 235);
        pushBoxSignToCity(smSeBb, 120, 24, 2.5, 'সবাই মিলে একটি ভালো ঢাকা', 'TOWARDS A SMARTER COMMUTE', '#172554', '#ffffff', '#38bdf8', '#00f2fe');
      }
      create3DBuilding({ x: 450, z: 235, width: 45, depth: 38, height: 36, wallColor: '#769aa0', sideColor: '#40565d', floors: 2, cols: 2, winColor: '#f0ddb3', antenna: true });
      flushCityBatch();
    });

    // Chunk 5: Sidewalk Benches & Gossiping Crowd Sitters
    scenePropBuildQueue.push(() => {
      const benchLocations = [
        { id: 'bench_nw', pos: [-160, 2.005, -125], rotY: Math.PI / 4, people: ['male_formal', 'female_salwar'] },
        { id: 'bench_ne', pos: [165, 2.005, -125], rotY: -Math.PI / 4, people: ['male_hoodie', 'female_ch22'] },
        { id: 'bench_sw', pos: [-165, 2.005, 125], rotY: 3 * Math.PI / 4, people: ['male_sweater', 'little_boy'] }
      ];
      benchLocations.forEach((bDef, bIdx) => {
        const benchGroup = new THREE.Group();
        benchGroup.position.set(bDef.pos[0], bDef.pos[1], bDef.pos[2]);
        benchGroup.rotation.y = bDef.rotY;
        const benchMesh = createDhakaSidewalkBench();
        if (benchMesh && benchMesh.isObject3D) benchGroup.add(benchMesh);
        benchGroup.userData.seatTopY = benchMesh.userData.seatTopY;
        benchGroup.userData.seatFrontZ = benchMesh.userData.seatFrontZ;
        benchGroup.userData.seatDepth = benchMesh.userData.seatDepth;

        const count = bDef.people.length;
        const xOffsets = (count === 2) ? [-4.8, 4.8] : [-6.8, 0.0, 6.8];
        bDef.people.forEach((preferredCharId, sIdx) => {
          const xOff = xOffsets[sIdx];
          const seatedPerson = spawnSeatedBenchHuman(preferredCharId, bIdx, sIdx, count, benchMesh, benchGroup, xOff);
          if (seatedPerson && seatedPerson.group && seatedPerson.group.isObject3D) {
            if (seatedPerson.group.parent !== benchGroup) {
              seatedPerson.group.position.set(xOff, 0, 0);
              benchGroup.add(seatedPerson.group);
            }
            gossipingCrowd.push(seatedPerson);
            socialPedestrians.push({ mesh: seatedPerson.group, parent: benchGroup });
          }
        });
        pruneNullChildren(benchGroup);
        if (benchGroup && benchGroup.isObject3D) scene.add(benchGroup);
      });
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

    // 14. Interactive Mouse Tracking (Zero Layout Thrashing with Cached Container Rect)
    let containerRect = null;
    function updateContainerRect() {
      if (containerEl) {
        containerRect = containerEl.getBoundingClientRect();
      }
    }
    updateContainerRect();
    window.addEventListener('scroll', updateContainerRect, { passive: true });

    containerEl.addEventListener('pointermove', (e) => {
      if (!containerRect || containerRect.width === 0) {
        updateContainerRect();
        if (!containerRect || !containerRect.width) return;
      }
      mouseRelX = (e.clientX - containerRect.left) / containerRect.width - 0.5;
      mouseRelY = (e.clientY - containerRect.top) / containerRect.height - 0.5;

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
    // Interactive 3D Raycaster & Object Telemetry HUD (Throttled & Non-Recursive)
    // -------------------------------------------------------------
    let lastRaycastTime = 0;
    const clickRaycaster = new THREE.Raycaster();
    const clickMouseVec = new THREE.Vector2();

    function handleSceneRaycastClick(clientX, clientY) {
      if (!renderer || !camera || !scene || !canvasEl) return;
      const now = performance.now();
      if (now - lastRaycastTime < 100) return; // 100ms raycast throttle
      lastRaycastTime = now;

      const rect = canvasEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      clickMouseVec.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      clickRaycaster.setFromCamera(clickMouseVec, camera);

      const candidateMeshes = [];
      const hitMap = new Map();

      // 1. Direct & Nested Vehicle hull meshes + Instanced Vehicle Fleets (Bus, CNG, Rickshaw)
      for (const vId in vehicleMeshMap) {
        const entry = vehicleMeshMap[vId];
        if (entry && entry.mesh && entry.mesh.visible !== false) {
          const m = entry.mesh;
          if (m.userData && m.userData.fleetHitInst) continue;
          let foundHull = null;
          m.traverse(child => {
            if (!foundHull && child.isMesh && !child.isInstancedMesh) foundHull = child;
          });
          if (foundHull) {
            candidateMeshes.push(foundHull);
            hitMap.set(foundHull, {
              kind: 'vehicle',
              id: vId,
              type: entry.data.type || 'car',
              data: entry.data,
              mesh: entry.mesh
            });
          }
        }
      }
      instancedHitLookup.forEach((slotTable, instMesh) => {
        if (instMesh && instMesh.visible !== false && slotTable.length > 0) {
          candidateMeshes.push(instMesh);
        }
      });

      // 2. Metro Train
      if (trainGroup && trainGroup.visible !== false) {
        for (let ci = 0; ci < trainGroup.children.length; ci++) {
          const child = trainGroup.children[ci];
          if (child.isMesh) {
            candidateMeshes.push(child);
            hitMap.set(child, {
              kind: 'metro',
              id: 'train_mrt6',
              type: 'metro',
              mesh: trainGroup
            });
            break;
          }
        }
      }

      // 3. Ambulance
      if (ambulanceGroup && ambulanceGroup.visible) {
        for (let ci = 0; ci < ambulanceGroup.children.length; ci++) {
          const child = ambulanceGroup.children[ci];
          if (child.isMesh) {
            candidateMeshes.push(child);
            hitMap.set(child, {
              kind: 'ambulance',
              id: 'emergency_ambulance',
              type: 'ambulance',
              mesh: ambulanceGroup
            });
            break;
          }
        }
      }

      // 4. Pedestrians: pick primary body mesh or SkinnedMesh
      for (const pId in pedMeshMap) {
        const entry = pedMeshMap[pId];
        if (entry && entry.mesh && entry.mesh.visible !== false) {
          let foundMesh = null;
          entry.mesh.traverse(c => {
            if (!foundMesh && (c.isMesh || c.isSkinnedMesh) && c.visible && !c.name?.includes('shadow') && !c.name?.includes('umbrella')) {
              foundMesh = c;
            }
          });
          if (foundMesh) {
            candidateMeshes.push(foundMesh);
            hitMap.set(foundMesh, {
              kind: 'walking',
              id: pId,
              type: 'walking',
              data: entry.data,
              mesh: entry.mesh
            });
          }
        }
      }

      const intersects = clickRaycaster.intersectObjects(candidateMeshes, false);
      if (intersects && intersects.length > 0) {
        const hit = intersects[0];
        let info = null;
        if (hit.instanceId !== undefined && instancedHitLookup.has(hit.object)) {
          info = instancedHitLookup.get(hit.object)[hit.instanceId] || null;
        } else {
          info = hitMap.get(hit.object);
        }
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
        updateTrackedVehicleHUD(activeTargetVehicle, true);

        const pose = getVehicleOrbitPose(activeTargetVehicle);
        if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
          focusCamera(pose.position, pose.look, 1.4);
        }

      } else if (info.kind === 'metro') {
        window.crossroadsFocusMode('metro');
      } else if (info.kind === 'walking') {
        const charId = (info.mesh && info.mesh.userData && info.mesh.userData.charId) || (info.data && (info.data.charId || info.data.templateId));
        if (charId) lastFocusedTemplateId = charId;
        const cat = (info.data && info.data.pedCategory) || (info.mesh && info.mesh.userData && info.mesh.userData.pedCategory) || (charId && charId.includes('female') ? 'female' : (charId && charId.includes('boy') ? 'child' : 'male'));
        const charName = (info.mesh && info.mesh.userData && info.mesh.userData.charName) || (info.data && info.data.charName) || (CHARACTER_INFO[charId] && CHARACTER_INFO[charId].name);
        activeCamMode = 'walking';
        activeTargetVehicle = {
          id: info.id,
          type: 'walking',
          category: cat,
          charId: charId,
          templateId: charId,
          charName: charName,
          mesh: info.mesh,
          data: info.data,
          speed: info.data ? info.data.speed : 12
        };
        if (canvasEl) canvasEl.style.touchAction = 'none';
        updateLegendHUD('walking');
        updateTrackedVehicleHUD(activeTargetVehicle, true);
        const pose = getVehicleOrbitPose(activeTargetVehicle);
        if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
          focusCamera(pose.position, pose.look, 1.4);
        }
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
      e.stopPropagation();

      const step = Math.PI / 8; // 22.5° per keypress for smooth 360° orbiting
      vehicleOrbitYaw += (e.key === 'ArrowLeft' ? step : -step);
      while (vehicleOrbitYaw > Math.PI) vehicleOrbitYaw -= Math.PI * 2;
      while (vehicleOrbitYaw < -Math.PI) vehicleOrbitYaw += Math.PI * 2;

      const immediatePose = getVehicleOrbitPose(activeTargetVehicle);
      if (Number.isFinite(immediatePose.position.x) && Number.isFinite(immediatePose.look.x)) {
        camera.position.x = immediatePose.position.x;
        camera.position.y = immediatePose.position.y;
        camera.position.z = immediatePose.position.z;
        currentCamLook.x = immediatePose.look.x;
        currentCamLook.y = immediatePose.look.y;
        currentCamLook.z = immediatePose.look.z;
        camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
      }
    });

    window.addEventListener('resize', onResize);
    if (typeof ResizeObserver !== 'undefined' && containerEl) {
      const ro = new ResizeObserver(() => {
        onResize();
      });
      ro.observe(containerEl);
    }

    syncAllInstancedPools();
    purgeNullChildren(scene);
    pruneNullChildrenWithReport(scene, 'initial-build');
    isReady = true;
  }

  function onResize() {
    if (!renderer || !camera) return;
    if (typeof updateContainerRect === 'function') {
      updateContainerRect();
    }
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
      const isMobileClient = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      let targetPixelRatio = isMobileClient ? Math.min(dpr, 1.0) : Math.min(dpr, 1.25);
      if (currentTier === 'medium') targetPixelRatio = isMobileClient ? Math.min(dpr, 0.85) : Math.min(dpr, 1.0);
      else if (currentTier === 'low') targetPixelRatio = Math.min(dpr, 0.75);
      currentAdaptivePixelRatio = targetPixelRatio;
      renderer.setPixelRatio(targetPixelRatio);
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

    const initT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    isInitialized = true;
    scene = new THREE.Scene();
    buildScene(vehiclesData, pedestriansData);
    lastInitMs = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - initT0;
  };

  window.setCrossroads3DActive = function(active) {
    is3DViewActive = !!active;
    if (is3DViewActive) {
      isRenderLoopPaused = false;
      lastFrameTime = 0;
    }
  };

  window.isDhakaCrossroads3DReady = function() {
    return isReady;
  };

  window.resizeDhakaCrossroads3D = function() {
    isRenderLoopPaused = false;
    lastFrameTime = 0;
    onResize();
  };

  window.getDhakaCrossroads3DMetrics = function() {
    return {
      fps: Math.round(currentFps),
      avgFrameTimeMs: parseFloat(avgFrameTimeMs.toFixed(2)),
      initMs: parseFloat((lastInitMs || 0).toFixed(1)),
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
  let lastFrameTime = 0;
  let frameTimeEMA = 16.6;
  let currentTier = 'high';
  let lastTierDowngradeTime = 0;
  let tierFrameCounter = 0;
  let currentAdaptivePixelRatio = 0;
  let detectedNativeHz = 60;
  const hzSampleDeltas = [];

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isRenderLoopPaused = true;
      } else {
        isRenderLoopPaused = false;
        lastFrameTime = 0;
      }
    });
  }

  window.resetCrossroads3DTime = function() {
    lastFrameTime = 0;
  };

  window.updateDhakaCrossroads3D = function(dt, trainX, trainState, emergencyWaveActive, ambulanceX, activePhase, isRain, weatherMode) {
    if (!isReady || !renderer || !scene || !camera) return;
    if (!is3DViewActive || isRenderLoopPaused || (typeof document !== 'undefined' && document.hidden)) {
      lastFrameTime = 0;
      return;
    }

    try {

    // 1. Native Uncapped Refresh-Rate Loop (60/90/120/144/165/240 FPS) with Clamped Delta-Time
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (!lastFrameTime || (now - lastFrameTime) > 1000) {
      lastFrameTime = now - 16.667;
    }
    const rawDelta = now - lastFrameTime;
    const dtFromPerf = rawDelta / 1000;
    lastFrameTime = now;
    const delta = Math.min(Math.max(dtFromPerf, 0.001), 0.05);
    isCameraTransitioning = (now < cameraTransitionUntil);

    // Spread non-essential static props (streetlights, trees, skyline batches, benches) across initial frames (zero freeze)
    if (scenePropBuildQueue.length > 0 && !isCameraTransitioning) {
      while (scenePropBuildQueue.length > 0 && scenePropBuildQueue[0] && scenePropBuildQueue[0]._done) {
        scenePropBuildQueue.shift();
      }
      if (scenePropBuildQueue.length > 0) {
        const propJob = scenePropBuildQueue.shift();
        if (typeof propJob === 'function') {
          try { propJob(); } catch (err) { console.warn('[3D Prop Queue]', err); }
        }
      }
      if (scenePropBuildQueue.length === 0 && !propPrecompileDone && renderer && scene && camera) {
        pruneNullChildrenWithReport(scene, 'deferred-props-settled');
        propPrecompileDone = true;
        try { renderer.compile(scene, camera); } catch (_) {}
      }
    }

    // Process background streaming pedestrian spawn queue ONLY when camera is not actively gliding
    if (pedSpawnQueue.length > 0 && !isCameraTransitioning) {
      const job = pedSpawnQueue.shift();
      if (typeof job === 'function') {
        try { job(); } catch (err) { console.warn('[Pedestrians] Spawn job error:', err); }
      }
      if (pedSpawnQueue.length === 0 && !pedPrecompileDone && renderer && scene && camera) {
        pedPrecompileDone = true;
        try {
          renderer.compile(scene, camera);
        } catch (_) {}
      }
    }

    // 2. Real-Time Adaptive Performance Scaler (Auto-Detects 60/90/120/144/165/240 Hz Displays)
    const rawDeltaMs = rawDelta;
    if (rawDeltaMs > 2.0 && rawDeltaMs < 35.0) {
      hzSampleDeltas.push(rawDeltaMs);
      if (hzSampleDeltas.length >= 25) {
        const sorted = hzSampleDeltas.slice().sort((a, b) => a - b);
        const cleanMin = sorted[Math.floor(sorted.length * 0.15)];
        if (cleanMin <= 4.6) {
          detectedNativeHz = 240;
        } else if (cleanMin <= 6.2) {
          detectedNativeHz = 165;
        } else if (cleanMin <= 7.4) {
          detectedNativeHz = 144;
        } else if (cleanMin <= 9.2) {
          detectedNativeHz = 120;
        } else if (cleanMin <= 12.2) {
          detectedNativeHz = 90;
        } else {
          detectedNativeHz = 60;
        }
        if (hzSampleDeltas.length > 75) {
          hzSampleDeltas.splice(0, 35);
        }
      }
    }

    const frameDurationMs = dtFromPerf * 1000;
    frameTimeEMA = frameTimeEMA * 0.95 + frameDurationMs * 0.05;
    const nativeBudgetMs = 1000 / detectedNativeHz;

    tierFrameCounter++;
    if (tierFrameCounter >= 45) {
      tierFrameCounter = 0;
      let newTier = currentTier;

      if (frameTimeEMA > 21.0) {
        newTier = 'low';
      } else if (frameTimeEMA > nativeBudgetMs * 1.20) {
        newTier = (currentTier === 'low' && frameTimeEMA > 18.0) ? 'low' : 'medium';
      } else {
        if (now - lastTierDowngradeTime >= 3000) {
          if (frameTimeEMA <= nativeBudgetMs * 1.05) {
            newTier = 'high';
          } else if (currentTier === 'low' && frameTimeEMA <= 18.0) {
            newTier = 'medium';
          }
        }
      }

      if (newTier !== currentTier) {
        if ((newTier === 'low' && currentTier !== 'low') || (newTier === 'medium' && currentTier === 'high')) {
          lastTierDowngradeTime = now;
        }
        currentTier = newTier;
      }

      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const isMob = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
      let targetPR = isMob ? Math.min(dpr, 1.0) : Math.min(dpr, 1.25);
      if (currentTier === 'medium') {
        targetPR = isMob ? Math.min(dpr, 0.85) : Math.min(dpr, 1.0);
      } else if (currentTier === 'low') {
        targetPR = Math.min(dpr, 0.75);
      }

      if (Math.abs(currentAdaptivePixelRatio - targetPR) > 0.01) {
        currentAdaptivePixelRatio = targetPR;
        if (renderer && typeof renderer.setPixelRatio === 'function') {
          renderer.setPixelRatio(targetPR);
        }
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

      // 2. Calibrate Building Window Emissive Glow directly on unified cityFacadeMat (zero scene traversal!)
      if (cityFacadeMat) {
        if (currentMode === 'fog_night' || currentMode === 'night_overcast') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.36 : 0.28;
        } else if (currentMode === 'fog_sunset' || currentMode === 'sunset_overcast') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.32 : 0.24;
        } else if (currentMode === 'fog_sunrise' || currentMode === 'sunrise_overcast') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.22 : 0.16;
        } else if (currentMode === 'morning_overcast' || currentMode === 'fog_day') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.14 : 0.10;
        } else if (currentMode === 'day_overcast') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.10 : 0.08;
        } else if (currentMode === 'sun') {
          cityFacadeMat.emissiveIntensity = 0.05;
        } else if (currentMode === 'rain') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.40 : 0.32;
        } else if (currentMode === 'sunset') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.32 : 0.25;
        } else if (currentMode === 'sunrise') {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.22 : 0.18;
        } else {
          cityFacadeMat.emissiveIntensity = isMobileScreen ? 0.42 : 0.35;
        }
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
          scene.fog.density = 0.00018;
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
          scene.fog.density = isMobileScreen ? 0.00022 : 0.00025;
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
          scene.fog.density = isMobileScreen ? 0.00028 : 0.00030;
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
          scene.fog.density = isMobileScreen ? 0.00020 : 0.00024;
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
          scene.fog.density = 0.00010;
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
          scene.fog.density = isMobileScreen ? 0.00018 : 0.00022;
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
          scene.fog.density = 0.00016;
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
          scene.fog.density = isMobileScreen ? 0.00022 : 0.00026;
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
          scene.fog.density = isMobileScreen ? 0.00028 : 0.00030;
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
          scene.fog.density = isMobileScreen ? 0.00026 : 0.00030;
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
          scene.fog.density = isMobileScreen ? 0.00026 : 0.00030;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0x94a3b8);
          hemiLight.groundColor.setHex(0x141d2b);
          hemiLight.intensity = isMobileScreen ? 0.90 : 0.80;
        }
        if (sunLight) {
          sunLight.color.setHex(0x94a3b8);
          sunLight.intensity = isMobileScreen ? 0.95 : 0.88;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x64748b : 0x546274);
          ambientLight.intensity = isMobileScreen ? 0.75 : 0.68;
        }
      } else if (currentMode === 'night_overcast') {
        // Nighttime Overcast: dark atmospheric night with clearly visible city elements
        setSceneBackgroundColor(isMobileScreen ? 0x080c16 : 0x050810);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x0d1422 : 0x090e18);
          scene.fog.density = isMobileScreen ? 0.00020 : 0.00025;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0x94a3b8);
          hemiLight.groundColor.setHex(0x141d2b);
          hemiLight.intensity = isMobileScreen ? 0.90 : 0.80;
        }
        if (sunLight) {
          sunLight.color.setHex(0x94a3b8);
          sunLight.intensity = isMobileScreen ? 0.95 : 0.88;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0x64748b : 0x546274);
          ambientLight.intensity = isMobileScreen ? 0.95 : 0.88;
        }
      } else if (currentMode === 'rain') {
        setSceneBackgroundColor(isMobileScreen ? 0x0d1628 : 0x08101e);
        if (scene.fog) {
          scene.fog.color.setHex(isMobileScreen ? 0x121e36 : 0x0d172b);
          scene.fog.density = isMobileScreen ? 0.00024 : 0.00028;
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
          scene.fog.density = isMobileScreen ? 0.00015 : 0.00018;
        }
        if (hemiLight) {
          hemiLight.color.setHex(0xf472b6);
          hemiLight.groundColor.setHex(0x2a1a38);
          hemiLight.intensity = isMobileScreen ? 1.15 : 1.05;
        }
        if (sunLight) {
          sunLight.color.setHex(0xf472b6);
          sunLight.intensity = isMobileScreen ? 0.95 : 0.88;
        }
        if (ambientLight) {
          ambientLight.color.setHex(isMobileScreen ? 0xa78bfa : 0x8b5cf6);
          ambientLight.intensity = isMobileScreen ? 0.95 : 0.88;
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

      // Center 3D mesh precisely from 2D coordinates so front bumper halts exactly at the stop bar before zebra crossings:
      const hLen = (v.dir === 'EB' || v.dir === 'WB') ? ((v.w || 44) * 0.5) : ((v.h || 44) * 0.5);
      const halfLen = v.halfLength || (vm.mesh.userData && vm.mesh.userData.halfLength) || (v.type === 'bus' ? 39.5 : (v.type === 'car' ? 25.0 : 18.0));

      if (v.dir === 'EB') {
        const laneZ = (typeof v.currentLaneY !== 'undefined') ? (v.currentLaneY - 420) : (v.lane === 1 ? 18 : 48);
        let posX = (v.pos + hLen) - 600;
        // Stop Bar is at X = -135. Zebra Crossing is X in [-131, -109]. Front bumper is posX + halfLen.
        // If stopping or before the crosswalk, clamp front bumper strictly before -136.5 (5.5 units before zebra stripes)
        if (posX < -90 && (v.speed < 2.0 || (posX + halfLen > -136.5 && posX < -105))) {
          posX = Math.min(posX, -136.5 - halfLen);
        }
        vm.mesh.position.set(posX, bounce, laneZ);
        vm.mesh.rotation.y = getHeading(v.dir);
        vm.mesh.rotation.z = -tiltZ;
      } else if (v.dir === 'WB') {
        const laneZ = (typeof v.currentLaneY !== 'undefined') ? (v.currentLaneY - 420) : (v.lane === 1 ? -15 : -52);
        let posX = (v.pos + hLen) - 600;
        // Stop Bar is at X = +135. Zebra Crossing is X in [109, 131]. Heading Math.PI points -X. Front bumper is posX - halfLen.
        if (posX > 90 && (v.speed < 2.0 || (posX - halfLen < 136.5 && posX > 105))) {
          posX = Math.max(posX, 136.5 + halfLen);
        }
        vm.mesh.position.set(posX, bounce, laneZ);
        vm.mesh.rotation.y = getHeading(v.dir);
        vm.mesh.rotation.z = tiltZ;
      } else if (v.dir === 'SB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? -20 : -58);
        let posZ = (v.pos + hLen) - 420;
        // Stop Bar is at Z = -105. Zebra Crossing is Z in [-103, -81]. Front bumper is posZ + halfLen.
        if (posZ < -70 && (v.speed < 2.0 || (posZ + halfLen > -106.5 && posZ < -80))) {
          posZ = Math.min(posZ, -106.5 - halfLen);
        }
        vm.mesh.position.set(laneX, bounce, posZ);
        vm.mesh.rotation.y = getHeading(v.dir);
        vm.mesh.rotation.x = tiltZ;
      } else if (v.dir === 'NB') {
        const laneX = (typeof v.currentLaneX !== 'undefined') ? (v.currentLaneX - 600) : (v.lane === 1 ? 18 : 56);
        let posZ = (v.pos + hLen) - 420;
        // Stop Bar is at Z = +105. Zebra Crossing is Z in [81, 103]. Front bumper is posZ - halfLen.
        if (posZ > 70 && (v.speed < 2.0 || (posZ - halfLen < 106.5 && posZ > 80))) {
          posZ = Math.max(posZ, 106.5 + halfLen);
        }
        vm.mesh.position.set(laneX, bounce, posZ);
        vm.mesh.rotation.y = getHeading(v.dir);
        vm.mesh.rotation.x = -tiltZ;
      }
      // Roll wheels by the distance the vehicle actually travelled this frame.
      const previousPosition = vm.mesh.userData ? vm.mesh.userData.previousRoadPosition : undefined;
      const roadDelta = Number.isFinite(previousPosition) ? v.pos - previousPosition : 0;
      if (vm.mesh.userData) vm.mesh.userData.previousRoadPosition = v.pos;

      // Safe lifecycle hook on vehicle removal / recycling / boundary wrap-around
      const isTracked = activeTargetVehicle && (
        activeTargetVehicle.mesh === vm.mesh ||
        (activeTargetVehicle.data && activeTargetVehicle.data.id === v.id) ||
        activeTargetVehicle.id === v.id
      );

      const isNearBoundary = (
        (v.dir === 'EB' && v.pos > 1240) ||
        (v.dir === 'WB' && v.pos < -100) ||
        (v.dir === 'SB' && v.pos > 690) ||
        (v.dir === 'NB' && v.pos < 160)
      );

      if (isTracked && Math.abs(roadDelta) > 180) {
        // Keep tracking the same vehicle through lane wrap-around; instantly snap camera pose so there is no flying across the city
        const wrapPose = getVehicleOrbitPose(activeTargetVehicle);
        if (Number.isFinite(wrapPose.position.x) && Number.isFinite(wrapPose.look.x)) {
          camera.position.x = wrapPose.position.x;
          camera.position.y = wrapPose.position.y;
          camera.position.z = wrapPose.position.z;
          currentCamLook.x = wrapPose.look.x;
          currentCamLook.y = wrapPose.look.y;
          currentCamLook.z = wrapPose.look.z;
          camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
        }
      }

      if (vm.mesh.userData && vm.mesh.userData.wheels) {
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
      // Ambulance visibility automatically propagates to parented child wheels
    }

    // 4. Update Pedestrians with Realistic Forward Walking Kinematics & Rain Umbrellas
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
        isMoving = Math.abs(coord - p.start) > 2 && !p.isPausedForVehicle;
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
      // Forward heading orientation:
      // Crosswalk pedestrians strictly face across the road toward p.end (never flipped 180° by wrap-around snap):
      let targetRotY = 0;
      if (!p.isSidewalk) {
        if (p.axis === 'H') {
          targetRotY = (p.end > p.start) ? (Math.PI / 2) : (-Math.PI / 2);
        } else {
          targetRotY = (p.end > p.start) ? 0 : Math.PI;
        }
        pm.mesh.userData.targetRotY = targetRotY;
      } else {
        if (dispDist > 0.001 && dispDist < 10) {
          targetRotY = Math.atan2(dX, dZ);
          pm.mesh.userData.targetRotY = targetRotY;
        } else if (typeof pm.mesh.userData.targetRotY === 'undefined') {
          targetRotY = (p.axis === 'H') ? ((p.end > p.start) ? (Math.PI / 2) : (-Math.PI / 2)) : ((p.end > p.start) ? 0 : Math.PI);
          pm.mesh.userData.targetRotY = targetRotY;
        } else {
          targetRotY = pm.mesh.userData.targetRotY;
        }
      }

      // Drive Every Pedestrian with THREE.AnimationMixer (Mocap Gait Keyframe Clips or Direct Mixamo)
      if (pm.mesh.userData && pm.mesh.userData.mixer) {
        const mixer = pm.mesh.userData.mixer;
        const walkAction = pm.mesh.userData.walkAction;
        const idleAction = pm.mesh.userData.idleAction;

        setPedAnimState(pm.mesh, isMoving ? 'walk' : 'idle');
        if (isMoving && walkAction) {
          // Sync walk animation playback speed: walkAction.timeScale = ped.speed * 0.75
          const speedFactor = Math.max(0.4, Math.min(2.5, (p.speed || 1.0) * 0.75));
          walkAction.timeScale = speedFactor;
        }

        // Distance LOD based on adaptive quality tier:
        // Tier High: near <= 140 animated every frame, > 140 throttled to 2nd frame
        // Tier Medium: near <= 110 animated every frame, > 110 throttled to 2nd frame (accumulating dt)
        // Tier Low: near <= 85 animated every frame, > 85 throttled to 3rd frame (accumulating dt)
        const walkerDist = camera ? pm.mesh.position.distanceTo(camera.position) : 0;
        let nearThreshold = 140;
        let distCadence = 2;
        if (currentTier === 'low') {
          nearThreshold = 85;
          distCadence = 3;
        } else if (currentTier === 'medium') {
          nearThreshold = 110;
          distCadence = 2;
        }

        if (walkerDist <= nearThreshold) {
          if (pm.mesh.userData._lodAccDelta) {
            mixer.update(Math.min(delta + pm.mesh.userData._lodAccDelta, 0.15));
            pm.mesh.userData._lodAccDelta = 0;
          } else {
            mixer.update(Math.min(delta, 0.1));
          }
        } else {
          pm.mesh.userData._lodFrameCount = ((pm.mesh.userData._lodFrameCount || 0) + 1) % distCadence;
          pm.mesh.userData._lodAccDelta = (pm.mesh.userData._lodAccDelta || 0) + delta;
          if (pm.mesh.userData._lodFrameCount === 0) {
            const stepDelta = Math.min(pm.mesh.userData._lodAccDelta, 0.3);
            pm.mesh.userData._lodAccDelta = 0;
            mixer.update(stepDelta);
          }
        }

        // Toggle micro facial meshes (teeth/tongue/eyelash/cornea) cleanly beyond 75 units
        const showMicroFace = (walkerDist <= 75);
        if (pm.mesh.userData._lastMicroFaceVisible !== showMicroFace) {
          pm.mesh.userData._lastMicroFaceVisible = showMicroFace;
          pm.mesh.traverse(mc => {
            if (mc.userData && mc.userData.isMicroFaceDetail) mc.visible = showMicroFace;
          });
        }

        // Keep grounded stance contact flush at exact Y = 0.000 (groundedBaseY)
        if (pm.mesh.userData.bodyRoot && pm.mesh.userData.bodyRoot.userData.groundedBaseY !== undefined) {
          pm.mesh.userData.bodyRoot.position.y = pm.mesh.userData.bodyRoot.userData.groundedBaseY;
        }

        // Lock right arm & elbow to hold umbrella during rain (procedural humans only)
        if (!p.isRiggedMixamo && !(pm.mesh.userData && pm.mesh.userData.isRiggedMixamo) && isRain && pm.mesh.userData.umbrella) {
          if (pm.mesh.userData.rightArmPivot) {
            pm.mesh.userData.rightArmPivot.rotation.set(-0.42, 0, -0.16);
          }
          if (pm.mesh.userData.rightElbowPivot) {
            pm.mesh.userData.rightElbowPivot.rotation.set(-1.18, 0.28, 0);
          }
        }
      }

      // Smooth 180° turnaround heading interpolation (frame-rate independent exponential damping)
      if (typeof pm.mesh.userData.currentRotY === 'undefined') {
        pm.mesh.userData.currentRotY = targetRotY;
      }
      let rotDiff = targetRotY - pm.mesh.userData.currentRotY;
      if (Number.isFinite(rotDiff)) {
        let guard = 0;
        while (rotDiff > Math.PI && ++guard < 10) rotDiff -= Math.PI * 2;
        guard = 0;
        while (rotDiff < -Math.PI && ++guard < 10) rotDiff += Math.PI * 2;
        pm.mesh.userData.currentRotY += rotDiff * (1 - Math.exp(-14 * delta));
      } else {
        pm.mesh.userData.currentRotY = targetRotY;
      }

      // Exact Top Surface Heights: Sidewalk slab top is Y = 2.0, Road plane is Y = 0.0
      const SIDEWALK_TOP_Y = 2.0;
      const ROAD_TOP_Y = 0.0;
      let onSidewalk = false;
      if (p.isSidewalk) {
        onSidewalk = true;
      } else if (!isMoving) {
        // Crosswalk pedestrians waiting at curb are always on top of sidewalk
        onSidewalk = true;
      } else {
        // While crossing, on curb slab if at the ends, on asphalt road in the middle
        onSidewalk = (p.axis === 'V') ? (Math.abs(posZ) >= 79) : (Math.abs(posX) >= 107);
      }
      const targetGroundY = onSidewalk ? (SIDEWALK_TOP_Y + 0.005) : (ROAD_TOP_Y + 0.005);
      if (typeof pm.mesh.userData.currentGroundY === 'undefined') {
        pm.mesh.userData.currentGroundY = targetGroundY;
      }
      pm.mesh.userData.currentGroundY += (targetGroundY - pm.mesh.userData.currentGroundY) * (1 - Math.exp(-12 * delta));

      pm.mesh.position.set(posX, pm.mesh.userData.currentGroundY, posZ);
      pm.mesh.rotation.y = pm.mesh.userData.currentRotY;
    }

    // 13. Gossiping Sidewalk Benches Crowd & Idle Social Groups
    updateGossipingCrowd(now * 0.001, delta, isRain);
    if (socialPedestrians && socialPedestrians.length) {
      const socialIdleTime = now * 0.002;
      for (let sIdx = 0; sIdx < socialPedestrians.length; sIdx++) {
        const sm = socialPedestrians[sIdx].mesh;
        if (!sm || !sm.userData) continue;
        const breath = Math.sin(socialIdleTime + sIdx * 1.7) * 0.03;
        if (sm.userData.torso) sm.userData.torso.rotation.z = breath;
        if (sm.userData.umbrella) sm.userData.umbrella.visible = !!isRain;
        if (sm.userData.rightArm) {
          if (isRain && sm.userData.umbrella) {
            sm.userData.rightArm.rotation.set(-0.42, 0, -0.16);
            if (sm.userData.rightElbow) sm.userData.rightElbow.rotation.set(-1.18, 0.28, 0);
          } else {
            sm.userData.rightArm.rotation.set(0, 0, -0.06);
            if (sm.userData.rightElbow) sm.userData.rightElbow.rotation.set(-0.22, 0, 0);
          }
        }
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
          const fallDist = rainSpeeds[i] * delta;
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

    // Dynamic Road Wetness & Specular Sheen (Exponential Damping)
    if (roadMaterial && roadMaterial.isMeshStandardMaterial) {
      const targetRoughness = isRain ? 0.45 : 0.85;
      const targetMetalness = isRain ? 0.20 : 0.05;
      const roadDamp = 1 - Math.exp(-3.0 * delta);
      roadMaterial.roughness += (targetRoughness - roadMaterial.roughness) * roadDamp;
      roadMaterial.metalness += (targetMetalness - roadMaterial.metalness) * roadDamp;
    }

    // Sync all InstancedMesh vehicle fleets, pedaling limbs, wheels & pedestrian shadow discs in one pass
    syncAllInstancedPools();

    // 7. Dynamic GTA-5 Third-Person Chase Camera & Aerial Drone Hover
    idleDroneTime += delta;

    if (activeCamMode !== 'overview') {
      if (!activeTargetVehicle) {
        activeTargetVehicle = acquireTargetVehicle(activeCamMode);
        if (activeTargetVehicle) updateCameraModeBadge(activeCamMode);
      }

      // Guard: never allow activeTargetVehicle to point to a detached mesh
      if (activeTargetVehicle && (!activeTargetVehicle.mesh || !activeTargetVehicle.mesh.parent)) {
        const fallbackTarget = acquireTargetVehicle(activeCamMode, activeTargetVehicle.id);
        if (fallbackTarget && fallbackTarget.mesh && fallbackTarget.mesh.parent) {
          activeTargetVehicle = fallbackTarget;
          updateTrackedVehicleHUD(fallbackTarget, true);
        } else {
          clearTrackedVehicle();
        }
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
      } else if (activeCamMode === 'walking' || (activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.mesh.parent && activeTargetVehicle.data)) {
        if (activeCamMode === 'walking') {
          // If activeTargetVehicle is not yet rigged or not visible, re-acquire as soon as a rigged walker is ready
          if (!activeTargetVehicle || !activeTargetVehicle.mesh || activeTargetVehicle.mesh.visible !== true || !activeTargetVehicle.mesh.userData || !activeTargetVehicle.mesh.userData.isRiggedMixamo) {
            const readyWalker = acquireTargetWalker(lastFocusedTemplateId);
            if (readyWalker && readyWalker.mesh && readyWalker.mesh.visible === true && readyWalker.mesh.userData && readyWalker.mesh.userData.isRiggedMixamo) {
              activeTargetVehicle = readyWalker;
              updateTrackedVehicleHUD(activeTargetVehicle, true);
              const pose = getVehicleOrbitPose(activeTargetVehicle);
              if (Number.isFinite(pose.position.x) && Number.isFinite(pose.look.x)) {
                focusCamera(pose.position, pose.look, 0.8);
              }
            }
          }
        }
        if (activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.mesh.parent && activeTargetVehicle.mesh.visible === true && activeTargetVehicle.mesh.userData && (activeCamMode !== 'walking' || activeTargetVehicle.mesh.userData.isRiggedMixamo)) {
          updateTrackedVehicleHUD(activeTargetVehicle, false); // 10 Hz throttled HUD update
          const pose = getVehicleOrbitPose(activeTargetVehicle);
          desiredCamPos = pose.position;
          desiredCamLook = pose.look;
        } else if (activeCamMode === 'walking') {
          desiredCamPos = CAM_MODES.walking.pos;
          desiredCamLook = CAM_MODES.walking.look;
        }
      }

      if (desiredCamPos && desiredCamLook &&
          Number.isFinite(desiredCamPos.x) && Number.isFinite(desiredCamPos.y) && Number.isFinite(desiredCamPos.z) &&
          Number.isFinite(desiredCamLook.x) && Number.isFinite(desiredCamLook.y) && Number.isFinite(desiredCamLook.z)) {
        // Silky-smooth 120Hz exponential damping: 1 - Math.exp(-lambda * delta)
        const safeDt = Math.max(0.0001, Math.min(delta, 0.05));
        const camLerp = 1 - Math.exp(-6 * safeDt);
        const lookLerp = 1 - Math.exp(-8 * safeDt);

        const newCamX = camera.position.x + (desiredCamPos.x - camera.position.x) * camLerp;
        const newCamY = camera.position.y + (desiredCamPos.y - camera.position.y) * camLerp;
        const newCamZ = camera.position.z + (desiredCamPos.z - camera.position.z) * camLerp;

        const newLookX = currentCamLook.x + (desiredCamLook.x - currentCamLook.x) * lookLerp;
        const newLookY = currentCamLook.y + (desiredCamLook.y - currentCamLook.y) * lookLerp;
        const newLookZ = currentCamLook.z + (desiredCamLook.z - currentCamLook.z) * lookLerp;

        if (Number.isFinite(newCamX) && Number.isFinite(newCamY) && Number.isFinite(newCamZ) &&
            Number.isFinite(newLookX) && Number.isFinite(newLookY) && Number.isFinite(newLookZ)) {
          camera.position.x = newCamX;
          camera.position.y = newCamY;
          camera.position.z = newCamZ;
          currentCamLook.x = newLookX;
          currentCamLook.y = newLookY;
          currentCamLook.z = newLookZ;

          // Guard against camera position and look target coinciding (which creates NaN in lookAt)
          const distSq = (newCamX - newLookX) ** 2 + (newCamY - newLookY) ** 2 + (newCamZ - newLookZ) ** 2;
          if (distSq > 0.01) {
            camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
          }
        } else if (activeTargetVehicle) {
          const emergencyPose = getVehicleOrbitPose(activeTargetVehicle);
          if (Number.isFinite(emergencyPose.position.x) && Number.isFinite(emergencyPose.look.x)) {
            camera.position.x = emergencyPose.position.x;
            camera.position.y = emergencyPose.position.y;
            camera.position.z = emergencyPose.position.z;
            currentCamLook.x = emergencyPose.look.x;
            currentCamLook.y = emergencyPose.look.y;
            currentCamLook.z = emergencyPose.look.z;
            camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
          }
        }
      } else {
        const safeDt = Math.max(0.0001, Math.min(delta, 0.05));
        const camLerp = 1 - Math.exp(-5 * safeDt);
        if (Number.isFinite(camBasePos.x) && Number.isFinite(camera.position.x)) {
          camera.position.x += (camBasePos.x - camera.position.x) * camLerp;
          camera.position.y += (camBasePos.y - camera.position.y) * camLerp;
          camera.position.z += (camBasePos.z - camera.position.z) * camLerp;
        }
        if (Number.isFinite(camBaseLook.x) && Number.isFinite(currentCamLook.x)) {
          currentCamLook.x += (camBaseLook.x - currentCamLook.x) * camLerp;
          currentCamLook.y += (camBaseLook.y - currentCamLook.y) * camLerp;
          currentCamLook.z += (camBaseLook.z - currentCamLook.z) * camLerp;
        }
        const distSq = (camera.position.x - currentCamLook.x) ** 2 + (camera.position.y - currentCamLook.y) ** 2 + (camera.position.z - currentCamLook.z) ** 2;
        if (distSq > 0.01 && Number.isFinite(currentCamLook.x)) {
          camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
        }
      }
    } else {
      // Overview mode: 3/4 aerial drone hover with figure-8 sway and mouse parallax
      const driftX = Math.sin(idleDroneTime * 0.45) * 7.5;
      const driftY = Math.cos(idleDroneTime * 0.35) * 4.0;
      const driftZ = Math.sin(idleDroneTime * 0.28) * 5.5;

      const parallaxScale = isMobileScreen ? 25 : 65;
      const targetCamX = camBasePos.x + mouseRelX * parallaxScale + driftX;
      const targetCamY = camBasePos.y - mouseRelY * (parallaxScale * 0.7) + driftY;
      const targetCamZ = camBasePos.z + driftZ;

      const safeDt = Math.max(0.0001, Math.min(delta, 0.05));
      const lerpFactor = 1 - Math.exp(-5 * safeDt);
      if (Number.isFinite(targetCamX) && Number.isFinite(camera.position.x)) {
        camera.position.x += (targetCamX - camera.position.x) * lerpFactor;
        camera.position.y += (targetCamY - camera.position.y) * lerpFactor;
        camera.position.z += (targetCamZ - camera.position.z) * lerpFactor;
      }
      if (Number.isFinite(camBaseLook.x) && Number.isFinite(currentCamLook.x)) {
        currentCamLook.x += (camBaseLook.x - currentCamLook.x) * lerpFactor;
        currentCamLook.y += (camBaseLook.y - currentCamLook.y) * lerpFactor;
        currentCamLook.z += (camBaseLook.z - currentCamLook.z) * lerpFactor;
      }
      const distSq = (camera.position.x - currentCamLook.x) ** 2 + (camera.position.y - currentCamLook.y) ** 2 + (camera.position.z - currentCamLook.z) ** 2;
      if (distSq > 0.01 && Number.isFinite(currentCamLook.x)) {
        camera.lookAt(currentCamLook.x, currentCamLook.y, currentCamLook.z);
      }
    }

    if (chaseCamLight) {
      if (activeCamMode !== 'overview' && activeTargetVehicle) {
        chaseCamLight.position.copy(camera.position);
        chaseCamLight.intensity = isMobileScreen ? 1.4 : 1.15;
      } else {
        chaseCamLight.intensity = 0;
      }
    }

    // Directional shadow map throttling (if enabled)
    if (renderer && renderer.shadowMap && renderer.shadowMap.enabled && !renderer.shadowMap.autoUpdate) {
      if (perfFrameCount % 3 === 0) {
        renderer.shadowMap.needsUpdate = true;
      }
    }

    // 7.5. Live Rear-View Mirror Rendering: STRICTLY when camera is actively focused on a Bus
    if (renderer && scene && mirrorLeftRT && mirrorRightRT && mirrorCam) {
      const isBusCloseUp = (activeCamMode === 'bus' && activeTargetVehicle && activeTargetVehicle.mesh && activeTargetVehicle.mesh.userData && activeTargetVehicle.mesh.userData.isBus);
      const activeBus = isBusCloseUp ? activeTargetVehicle.mesh : null;
      syncActiveBusMirrorOverlays(activeBus);

      if (activeBus) {
        mirrorFrameCounter++;
        const mirrorCadence = currentTier === 'low' ? 6 : 4;
        if (mirrorFrameCounter % mirrorCadence === 0) {
          const updateLeft = ((mirrorFrameCounter / mirrorCadence) % 2 === 0);
          const targetRT = updateLeft ? mirrorLeftRT : mirrorRightRT;
          const sideSign = updateLeft ? 1 : -1;

          _mPos.set(36.2, 15.0, sideSign * 11.40);
          activeBus.localToWorld(_mPos);
          _mLook.set(36.2 - 25.0, 14.5, sideSign * (11.40 + 1.2));
          activeBus.localToWorld(_mLook);

          mirrorCam.position.copy(_mPos);
          mirrorCam.lookAt(_mLook);

          if (activeBusLeftMirrorMesh) activeBusLeftMirrorMesh.visible = false;
          if (activeBusRightMirrorMesh) activeBusRightMirrorMesh.visible = false;

          _crowdToRestore.length = 0;
          if (typeof pedMeshMap !== 'undefined') {
            for (const pk in pedMeshMap) {
              const pm = pedMeshMap[pk];
              if (pm && pm.mesh && pm.mesh.visible) {
                pm.mesh.visible = false;
                _crowdToRestore.push(pm.mesh);
              }
            }
          }
          if (typeof gossipingCrowd !== 'undefined') {
            for (let gi = 0; gi < gossipingCrowd.length; gi++) {
              const gp = gossipingCrowd[gi];
              if (gp && gp.group && gp.group.visible) {
                gp.group.visible = false;
                _crowdToRestore.push(gp.group);
              }
            }
          }

          const prevRT = renderer.getRenderTarget();
          try {
            renderer.setRenderTarget(targetRT);
            renderer.render(scene, mirrorCam);
          } catch (e) {
            // Graceful render guard
          } finally {
            renderer.setRenderTarget(prevRT);
            if (activeBusLeftMirrorMesh) activeBusLeftMirrorMesh.visible = true;
            if (activeBusRightMirrorMesh) activeBusRightMirrorMesh.visible = true;
            for (let ci = 0; ci < _crowdToRestore.length; ci++) {
              if (_crowdToRestore[ci]) _crowdToRestore[ci].visible = true;
            }
          }
        }
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
    } catch (err) {
      console.error('[3D Loop Guard]', err);
      if (typeof activeCamMode !== 'undefined' && activeCamMode !== 'overview' && typeof clearTrackedVehicle === 'function') {
        clearTrackedVehicle();
      }
    }
  };

  // Expose clean read-only inspection object window.__crossroadsPerf
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, '__crossroadsPerf', {
      get: function() {
        return {
          detectedHz: detectedNativeHz,
          fps: Math.round(currentFps || (1000 / Math.max(1, frameTimeEMA))),
          frameMs: parseFloat(frameTimeEMA.toFixed(2)),
          initMs: parseFloat((lastInitMs || 0).toFixed(1)),
          drawCalls: renderer && renderer.info ? renderer.info.render.calls : 0,
          triangles: renderer && renderer.info ? renderer.info.render.triangles : 0,
          textures: renderer && renderer.info ? renderer.info.memory.textures : 0,
          geometries: renderer && renderer.info ? renderer.info.memory.geometries : 0,
          pixelRatio: parseFloat((renderer && renderer.getPixelRatio ? renderer.getPixelRatio() : (currentAdaptivePixelRatio || 1)).toFixed(2)),
          qualityTier: currentTier
        };
      },
      configurable: true,
      enumerable: true
    });
  }

  window.replaceCNGWithModel = replaceCNGWithModel;
  window.replaceBusWithModel = replaceBusWithModel;
  window.replaceRickshawWithModel = replaceRickshawWithModel;
  window.replaceBikeWithModel = replaceBikeWithModel;

})();
