import os
import subprocess
import re

# Update test_narrow_rickshaw.py with refined arm bend and hand grip
with open('scratch/test_narrow_rickshaw.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the arm creation block with refined natural bent elbow and seamless gripping hand
old_arms = """    // 2. Arms: CONNECTED DIRECTLY FROM SHOULDER TO HANDLEBAR GRIP
    [-1, 1].forEach(side => {
      const shoulderPt = [1.85, 10.4, side * 1.35];
      const elbowPt = [3.80, 9.40, side * 1.65];
      const handPt = [6.20, 9.80, side * 1.80];

      // Sleeve covering upper arm near shoulder
      const sleeve = createBone(shoulderPt, [2.70, 9.95, side * 1.48], 0.44, 0.48, plumShirtMat);
      pullerGroup.add(sleeve);

      // Upper arm bare skin below sleeve down to elbow
      const upperArm = createBone([2.60, 10.0, side * 1.47], elbowPt, 0.32, 0.36, pullerSkinMat);
      pullerGroup.add(upperArm);

      // Elbow joint
      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), pullerSkinMat);
      elbowJoint.position.set(elbowPt[0], elbowPt[1], elbowPt[2]);
      pullerGroup.add(elbowJoint);

      // Forearm from elbow to wrist
      const wristPt = [5.85, 9.75, side * 1.78];
      const forearm = createBone(elbowPt, wristPt, 0.26, 0.32, pullerSkinMat);
      pullerGroup.add(forearm);

      // Hand grasping around the handlebar grip
      const handGroup = new THREE.Group();
      handGroup.position.set(handPt[0], handPt[1], handPt[2]);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.38), pullerSkinMat);
      palm.rotation.z = 0.20;
      handGroup.add(palm);

      const fingers = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10, 1, true, 0, Math.PI * 1.2), pullerSkinMat);
      fingers.rotation.x = Math.PI / 2;
      handGroup.add(fingers);

      pullerGroup.add(handGroup);
    });"""

new_arms = """    // 2. Arms: Natural bent cyclist posture gripping handlebars seamlessly
    [-1, 1].forEach(side => {
      const shoulderPt = [1.85, 10.4, side * 1.35];
      const elbowPt = [3.60, 9.15, side * 2.05]; // Flared outward and dropped for ~35° natural elbow bend
      const gripCenter = [6.20, 9.80, side * 1.80];

      // Sleeve cuff covering upper arm
      const sleeveEnd = [2.70, 9.85, side * 1.62];
      const sleeve = createBone(shoulderPt, sleeveEnd, 0.46, 0.50, plumShirtMat);
      pullerGroup.add(sleeve);

      // Upper arm bare skin from sleeve to elbow
      const upperArm = createBone([2.60, 9.90, side * 1.60], elbowPt, 0.34, 0.38, pullerSkinMat);
      pullerGroup.add(upperArm);

      // Smooth spherical elbow joint
      const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), pullerSkinMat);
      elbowJoint.position.set(elbowPt[0], elbowPt[1], elbowPt[2]);
      pullerGroup.add(elbowJoint);

      // Forearm reaching directly into the hand wrapping the handlebar grip
      const wristPt = [5.90, 9.75, side * 1.82];
      const forearm = createBone(elbowPt, wristPt, 0.28, 0.34, pullerSkinMat);
      pullerGroup.add(forearm);

      // Natural grasping hand wrapping firmly over the handlebar grip
      const handGroup = new THREE.Group();
      handGroup.position.set(gripCenter[0], gripCenter[1], gripCenter[2]);

      // Palm & back of hand
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.38, 0.44), pullerSkinMat);
      palm.position.set(-0.08, 0.06, 0);
      palm.rotation.z = -0.15;
      handGroup.add(palm);

      // Curled fingers wrapping around rubber grip
      const fingers = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.42, 12, 1, false, -Math.PI * 0.25, Math.PI * 1.35),
        pullerSkinMat
      );
      fingers.rotation.x = Math.PI / 2;
      handGroup.add(fingers);

      // Knuckle ridge
      const knuckles = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.40, 8), pullerSkinMat);
      knuckles.rotation.x = Math.PI / 2;
      knuckles.position.set(0.04, 0.18, 0);
      handGroup.add(knuckles);

      pullerGroup.add(handGroup);
    });"""

if old_arms in code:
    code = code.replace(old_arms, new_arms)
    print("Replaced arms successfully in python code")
else:
    print("Could not find exact old_arms string!")

with open('scratch/test_narrow_rickshaw.py', 'w', encoding='utf-8') as f:
    f.write(code)
