# Vehicle model assets

The hero can load optimized, locally licensed GLB files from this folder. Models not included in the manifest are skipped, and the page reports any missing models.

The hero also includes built-in Three.js models for the cycle rickshaw and CNG auto-rickshaw when their GLB files are not listed in the manifest or fail to load. The rickshaw carries a driver and passengers beneath a blue canopy; the CNG has a yellow body, dark canopy, and driver. Add a licensed GLB for either vehicle to replace its built-in model.

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

After adding a model file, add its exact filename to the `models` array in `manifest.json`. Models should be authored in meters, sit on the ground plane (`Y = 0`), and face local `-Z`. The loader normalizes model length and ground contact; wheel meshes should have names containing `wheel`, `tire`, or `tyre` to animate. Include PBR materials and textures in each GLB, including emissive headlight, taillight, and brake-light materials. Use optimized meshes and textures suitable for mobile; keep each model below 10 MB where possible.

Only add models you have permission to use and redistribute. Record the source and license for each asset in your asset-management records. The Toyota and Honda names describe intended vehicle types and do not imply endorsement.

The hero uses the Three.js r128 GLTFLoader from jsDelivr. A network connection is required to fetch that loader script; the model files themselves are served locally from this folder.
