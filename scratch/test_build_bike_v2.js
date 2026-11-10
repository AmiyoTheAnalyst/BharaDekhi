const fs = require('fs');

// Load Three.js r128 in Node
const mod = { exports: {} };
new Function('exports', 'module', fs.readFileSync('assets/three.min.js', 'utf8'))(mod.exports, mod);
const THREE = mod.exports;
global.THREE = THREE;

// Dummy canvas for Node texture creation
global.document = {
  createElement: function(tag) {
    if (tag === 'canvas') {
      return {
        width: 256,
        height: 256,
        getContext: function() {
          return {
            clearRect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            bezierCurveTo: () => {},
            arc: () => {},
            stroke: () => {},
            fill: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            createRadialGradient: () => ({ addColorStop: () => {} })
          };
        }
      };
    }
    return {};
  }
};

console.log("Three.js loaded successfully. Testing geometry creation...");

const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.78, 20, 16), new THREE.MeshBasicMaterial());
cranium.scale.set(0.92, 1.04, 0.88);
console.log("Cranium created, vertices:", cranium.geometry.attributes.position.count);

const nose = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 4), new THREE.MeshBasicMaterial());
console.log("Nose created successfully.");
