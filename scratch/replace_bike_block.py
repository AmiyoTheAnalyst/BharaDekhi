import os

js_path = r"c:\Users\HP\Desktop\commute-dhaka-web\assets\crossroads-3d.js"
with open(js_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = None
end_idx = None

for idx, line in enumerate(lines):
    if "} else if (type === 'bike') {" in line and start_idx is None:
        start_idx = idx
    if start_idx is not None and idx > start_idx:
        if line.strip() == "}":
            # Check next lines to confirm end of vehicle builder
            if idx + 2 < len(lines) and "scene.add(group);" in lines[idx + 2]:
                end_idx = idx
                break

print(f"Found block from line {start_idx + 1} to {end_idx + 1}")

replacement = """    } else if (type === 'bike') {
      const activeColor = (vData && (vData.bikeColor || vData.color))
        ? parseInt((vData.bikeColor || vData.color).replace('#', '0x'), 16)
        : (colorHex || 0x0066f5);
      const bikePaint = new THREE.MeshStandardMaterial({
        color: activeColor,
        roughness: 0.18,
        metalness: 0.65
      });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.85 });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
      const rimMat = new THREE.MeshStandardMaterial({ color: activeColor, roughness: 0.2, metalness: 0.85 });

      // Hollow 5-spoke wheels placeholder
      [-6.5, 6.5].forEach(wx => {
        const wPivot = new THREE.Group();
        wPivot.position.set(wx, 3.2, 0);
        const tireMesh = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.75, 14, 28), tireMat);
        tireMesh.rotation.y = Math.PI / 2;
        wPivot.add(tireMesh);
        const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.25, 10, 24), rimMat);
        rimMesh.rotation.y = Math.PI / 2;
        wPivot.add(rimMesh);
        const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 12), rimMat);
        hubMesh.rotation.x = Math.PI / 2;
        wPivot.add(hubMesh);
        for (let i = 0; i < 5; i++) {
          const ang = i * (Math.PI * 2 / 5);
          const spk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.0, 8), rimMat);
          spk.position.set(Math.cos(ang) * 1.35, Math.sin(ang) * 1.35, 0);
          spk.rotation.z = ang + Math.PI / 2;
          wPivot.add(spk);
        }
        group.add(wPivot);
        group.userData.wheels.push(wPivot);
      });
      group.userData.wheelRadius = 3.2;

      // Aerodynamic sculpted frame
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(13.5, 3.4, 3.0), bikePaint);
      chassis.position.set(0.5, 5.4, 0);
      group.add(chassis);

      // Sleek fuel tank
      const tank = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 3.6), bikePaint);
      tank.position.set(2.2, 7.8, 0);
      group.add(tank);

      // Aerodynamic nose fairing & LED headlights
      const nose = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.5, 4), bikePaint);
      nose.rotation.z = -Math.PI / 2;
      nose.position.set(7.8, 7.6, 0);
      group.add(nose);

      // Dark smoked windscreen
      const ws = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 2.6), new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.4
      }));
      ws.position.set(5.8, 9.4, 0);
      ws.rotation.z = -0.45;
      group.add(ws);

      // Upswept dual exhaust mufflers
      [-1.8, 1.8].forEach(my => {
        const muf = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 4.5, 12), new THREE.MeshStandardMaterial({
          color: 0xcfd6df,
          roughness: 0.2,
          metalness: 0.9
        }));
        muf.position.set(-5.5, 5.5, my);
        muf.rotation.z = 0.45;
        group.add(muf);
      });

      // Seated rider in sport tuck (Outfit A: black leather jacket, dark jeans, full-face helmet)
      const jacket = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.8, 3.2), frameMat);
      jacket.position.set(0.8, 8.8, 0);
      jacket.rotation.z = -0.42;
      group.add(jacket);

      const helmet = new THREE.Mesh(new THREE.SphereGeometry(1.6, 18, 14), frameMat);
      helmet.scale.set(1.1, 0.95, 1.0);
      helmet.position.set(3.4, 12.0, 0);
      group.add(helmet);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.7), new THREE.MeshStandardMaterial({
        color: 0x020617,
        roughness: 0.05,
        metalness: 0.9
      }));
      visor.position.set(4.3, 12.0, 0);
      group.add(visor);

      // Ruby LED taillight
      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.8), vehicleTaillightMat);
      tailLight.position.set(-6.8, 7.8, 0);
      group.add(tailLight);
    }
"""

new_lines = lines[:start_idx] + [replacement] + lines[end_idx + 1:]
with open(js_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Successfully replaced procedural bike block! Total lines: {len(new_lines)}")
