(function () {
  function clone(source) {
    if (!source || !source.isObject3D) return null;
    if (source.children) source.children = source.children.filter(Boolean);
    var sourceLookup = new Map();
    var cloneLookup = new Map();
    var clone = source.clone();
    if (clone && clone.children) clone.children = clone.children.filter(Boolean);

    parallelTraverse(source, clone, function (sourceNode, clonedNode) {
      if (clonedNode && sourceNode) {
        sourceLookup.set(clonedNode, sourceNode);
        cloneLookup.set(sourceNode, clonedNode);
      }
    });

    if (clone && clone.traverse) {
      clone.traverse(function (node) {
        if (!node || !node.isSkinnedMesh) return;
        var clonedMesh = node;
        var sourceMesh = sourceLookup.get(node);
        if (!sourceMesh || !sourceMesh.skeleton) return;
        var sourceBones = sourceMesh.skeleton.bones;

        clonedMesh.skeleton = sourceMesh.skeleton.clone();
        clonedMesh.bindMatrix.copy(sourceMesh.bindMatrix);

        clonedMesh.skeleton.bones = sourceBones.map(function (bone) {
          return cloneLookup.get(bone) || bone;
        });

        clonedMesh.bind(clonedMesh.skeleton, clonedMesh.bindMatrix);
      });
    }

    if (clone && clone.children) clone.children = clone.children.filter(Boolean);
    return clone;
  }

  function parallelTraverse(a, b, callback) {
    if (!a || !b) return;
    callback(a, b);
    if (!a.children || !b.children) return;
    for (var i = 0; i < a.children.length; i++) {
      if (a.children[i] && b.children[i]) {
        parallelTraverse(a.children[i], b.children[i], callback);
      }
    }
  }

  if (typeof THREE !== 'undefined') {
    THREE.SkeletonUtils = THREE.SkeletonUtils || {};
    THREE.SkeletonUtils.clone = clone;
  } else if (typeof window !== 'undefined') {
    window.SkeletonUtils = { clone: clone };
  }
})();
