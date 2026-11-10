# -*- coding: utf-8 -*-
with open("scratch/build_master_bike.py", "r", encoding="utf-8") as f:
    text = f.read()

old_block = """    // Number Plate Mesh (Centered at Z = 0, Facing backwards towards -X)
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.85),
      new THREE.MeshBasicMaterial({ map: getBikeLicensePlateTexture(), side: THREE.DoubleSide })
    );
    plateMesh.position.set(-0.76, -0.85, 0);
    plateMesh.rotation.order = 'YXZ';
    plateMesh.rotation.y = -Math.PI / 2;
    plateMesh.rotation.x = -0.22; // Level horizontally!
    tailTidy.add(plateMesh);"""

new_block = """    // Number Plate Mesh (Centered at Z = 0, Mounted directly onto plateFrame face)
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.85),
      new THREE.MeshBasicMaterial({ map: getBikeLicensePlateTexture(), side: THREE.DoubleSide })
    );
    plateMesh.position.set(0, 0, 0.045);
    plateFrame.add(plateMesh);"""

assert old_block in text, "old_block not found in build_master_bike.py!"
text = text.replace(old_block, new_block)

with open("scratch/build_master_bike.py", "w", encoding="utf-8") as f:
    f.write(text)

print("SUCCESS: Updated plateMesh to be a direct child of plateFrame!")
