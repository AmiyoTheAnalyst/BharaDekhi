with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Safeguard initMap
old_init_map = """    function initMap() {
      map = L.map('map', { zoomControl: false }).setView([23.7500, 90.4050], 12);"""
new_init_map = """    function initMap() {
      if (typeof L === 'undefined' || !document.getElementById('map')) return;
      map = L.map('map', { zoomControl: false }).setView([23.7500, 90.4050], 12);"""

if old_init_map in text:
    text = text.replace(old_init_map, new_init_map, 1)
    print('Safeguarded initMap in index.html!')
else:
    print('Could not find old_init_map, checking text around initMap')

# 2. Safeguard updateRoute pickupMarker/dropMarker
old_marker_update = """      pickupMarker.setLatLng([pLoc.lat, pLoc.lng]).setPopupContent(`${getLocalizedText('Pickup')}: ${getLocalizedLocationName(pLoc.name)}`);
      dropMarker.setLatLng([dLoc.lat, dLoc.lng]).setPopupContent(`${getLocalizedText('Destination')}: ${getLocalizedLocationName(dLoc.name)}`);
      triggerPinBounce(pickupMarker);
      triggerPinBounce(dropMarker);"""
new_marker_update = """      if (typeof pickupMarker !== 'undefined' && pickupMarker && typeof dropMarker !== 'undefined' && dropMarker) {
        pickupMarker.setLatLng([pLoc.lat, pLoc.lng]).setPopupContent(`${getLocalizedText('Pickup')}: ${getLocalizedLocationName(pLoc.name)}`);
        dropMarker.setLatLng([dLoc.lat, dLoc.lng]).setPopupContent(`${getLocalizedText('Destination')}: ${getLocalizedLocationName(dLoc.name)}`);
        triggerPinBounce(pickupMarker);
        triggerPinBounce(dropMarker);
      }"""

if old_marker_update in text:
    text = text.replace(old_marker_update, new_marker_update, 1)
    print('Safeguarded marker update in updateRoute!')
else:
    print('Could not find old_marker_update')

# 3. Enhance setCrossroadsViewMode to ensure simulation and datasets are initialized
old_set_view_mode = """      if (crossroads3DMode) {
        // 1. Make 3D canvas visible with cinematic cubic-bezier crossfade
        if (canvas3d) canvas3d.style.display = 'block';
        setTimeout(() => {
          if (crossroads3DMode && stageWrapper) stageWrapper.style.display = 'none';
        }, 550);

        // 2. Initialize 3D scene once if not already initialized
        const isReady = typeof window.isDhakaCrossroads3DReady === 'function' && window.isDhakaCrossroads3DReady();
        if (!isReady && typeof window.initDhakaCrossroads3D === 'function' && crossroadsVehiclesData && crossroadsPedestriansData) {
          window.initDhakaCrossroads3D('dhakaCrossroads3dCanvas', 'dhakaCrossroadsContainer', crossroadsVehiclesData, crossroadsPedestriansData);
        }

        // 3. Resize WebGL drawing buffer and update camera aspect ratio
        if (typeof window.resizeDhakaCrossroads3D === 'function') {
          window.resizeDhakaCrossroads3D();
        }
      }"""

new_set_view_mode = """      if (crossroads3DMode) {
        // 1. Ensure crossroads simulation and vehicle datasets are initialized
        if (!dhakaCrossroadsInitialized || !crossroadsVehiclesData || !crossroadsPedestriansData) {
          if (typeof initDhakaCrossroadsSimulation === 'function') {
            initDhakaCrossroadsSimulation();
          }
        }

        // 2. Make 3D canvas visible with cinematic cubic-bezier crossfade
        if (canvas3d) {
          canvas3d.style.display = 'block';
          canvas3d.style.opacity = '1';
        }
        setTimeout(() => {
          if (crossroads3DMode && stageWrapper) stageWrapper.style.display = 'none';
        }, 550);

        // 3. Initialize 3D scene once if not already initialized
        const isReady = typeof window.isDhakaCrossroads3DReady === 'function' && window.isDhakaCrossroads3DReady();
        if (!isReady && typeof window.initDhakaCrossroads3D === 'function') {
          window.initDhakaCrossroads3D('dhakaCrossroads3dCanvas', 'dhakaCrossroadsContainer', crossroadsVehiclesData, crossroadsPedestriansData);
        }

        // 4. Resize WebGL drawing buffer and update camera aspect ratio
        if (typeof window.resizeDhakaCrossroads3D === 'function') {
          window.resizeDhakaCrossroads3D();
        }
      }"""

if old_set_view_mode in text:
    text = text.replace(old_set_view_mode, new_set_view_mode, 1)
    print('Enhanced setCrossroadsViewMode in index.html!')
else:
    print('Could not find old_set_view_mode')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(text)
