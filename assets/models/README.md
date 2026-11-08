# Vehicle model assets

The hero can load optimized, locally licensed GLB files from this folder. Models not included in the manifest are skipped, and the page reports any missing models.

The hero also includes built-in Three.js models for the cycle rickshaw and CNG auto-rickshaw when their GLB files are not listed in the manifest or fail to load. The CNG retains its built-in model. The cycle rickshaw is authored in Blender and replaces the built-in rickshaw when its GLB loads successfully; its fallback remains available if loading fails.

Use these exact filenames:

| File | Hero vehicle |
| --- | --- |
| `bike.glb` | Stage 1 ride-share bike |
| `cng-auto-rickshaw.glb` | Stage 1 CNG auto-rickshaw |
| `toyota-corolla.glb` | Stage 1 car and Toyota Corolla |
| `toyota-camry.glb` | Toyota Camry |
| `toyota-prius.glb` | Toyota Prius |
| `toyota-axio.glb` | Toyota Axio |
| `toyota-noah.glb` | Toyota Noah |
| `honda-civic.glb` | Honda Civic |
| `honda-city.glb` | Honda City |
| `honda-vezel.glb` | Honda Vezel |
| `honda-cr-v.glb` | Honda CR-V |
| `sports-coupe.glb` | Additional sports-car traffic |
| `cycle-rickshaw.glb` | Stage 2 cycle rickshaw |
| `dhaka-city-bus.glb` | Stage 3 Dhaka bus |
| `mrt-line-6-train.glb` | Stage 4 MRT Line-6 train |

After adding a model file, add its exact filename to the `models` array in `manifest.json`. Models should be authored in meters, sit on the ground plane (`Y = 0`), and face local `-Z`. The cycle-rickshaw integration maps the Blender-authored model's local `+X` travel direction to the simulator's `+X` direction, normalizes its ground contact and 26-unit length, and animates its three named wheel pivots and pedal crank. Other vehicle models should use the hero's `-Z` convention and wheel names containing `wheel`, `tire`, or `tyre`. Include PBR materials and textures in each GLB, including emissive headlight, taillight, and brake-light materials. Use optimized meshes and textures suitable for mobile; keep each model below 10 MB where possible.

## Cycle rickshaw asset record

- `cycle-rickshaw.glb` is an original asset authored for BharaDekhi in Blender.
- Its editable source and export script are `create_cycle_rickshaw.py`; no third-party model or texture assets are used.
- The GLB is included in the repository manifest and remains subject to the repository's applicable distribution terms.

Only add models you have permission to use and redistribute. Record the source and license for each asset in your asset-management records. The Toyota and Honda names describe intended vehicle types and do not imply endorsement.

The hero uses the Three.js r128 GLTFLoader from jsDelivr. A network connection is required to fetch that loader script; the model files themselves are served locally from this folder.
