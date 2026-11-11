const fs = require('fs');
const code = fs.readFileSync('assets/crossroads-3d.js', 'utf8');

// Minimal Three.js mock or load Three.js
global.window = global;
global.document = {
  createElement: (tag) => {
    return {
      getContext: () => ({
        fillRect: () => {},
        strokeRect: () => {},
        drawImage: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        bezierCurveTo: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        measureText: () => ({ width: 10 }),
        fillText: () => {}
      }),
      width: 256,
      height: 256
    };
  },
  getElementById: () => null,
  body: { classList: { toggle: () => {} } }
};

global.THREE = require('../assets/three.min.js');
if (!global.THREE.Clock && global.window.THREE) global.THREE = global.window.THREE;
eval(code);

console.log('Testing create3DVehicle(rickshaw)...');
try {
  const r = window.create3DVehicle('rickshaw', null, 'rick_1', { type: 'rickshaw', dir: 'EB', pos: 600 });
  console.log('Rickshaw created successfully!', !!r);
} catch (e) {
  console.error('Rickshaw creation failed:', e);
}

console.log('Testing create3DVehicle(cng)...');
try {
  const c = window.create3DVehicle('cng', 0x059669, 'cng_1', { type: 'cng', dir: 'EB', pos: 600 });
  console.log('CNG created successfully!', !!c);
} catch (e) {
  console.error('CNG creation failed:', e);
}

console.log('Testing create3DVehicle(bus)...');
try {
  const b = window.create3DVehicle('bus', 0xdc2626, 'bus_1', { type: 'bus', dir: 'EB', pos: 600 });
  console.log('Bus created successfully!', !!b);
} catch (e) {
  console.error('Bus creation failed:', e);
}

console.log('Testing createArticulatedHuman(0)...');
try {
  const h = window.createArticulatedHuman(0);
  console.log('Human created successfully!', !!h);
} catch (e) {
  console.error('Human creation failed:', e);
}
