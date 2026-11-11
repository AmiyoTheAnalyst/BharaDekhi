with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    text = f.read()

# In buildScene:
old_bs_size = """    let width = canvasEl.clientWidth;
    let height = canvasEl.clientHeight;
    if (!width || !height || width <= 0 || height <= 0) {
      if (containerEl && containerEl.clientWidth > 0 && containerEl.clientHeight > 0) {
        width = containerEl.clientWidth;
        height = containerEl.clientHeight;
      } else if (window.innerWidth > 0 && window.innerHeight > 0) {
        width = window.innerWidth;
        height = window.innerHeight;
      } else {
        width = 1200;
        height = 700;
      }
    }"""

new_bs_size = """    let width = 0, height = 0;
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
    }"""

# In onResize:
old_resize_size = """  function onResize() {
    if (!renderer || !camera || !canvasEl) return;
    let width = canvasEl.clientWidth;
    let height = canvasEl.clientHeight;
    if (!width || !height || width <= 0 || height <= 0) {
      if (containerEl && containerEl.clientWidth > 0 && containerEl.clientHeight > 0) {
        width = containerEl.clientWidth;
        height = containerEl.clientHeight;
      } else if (window.innerWidth > 0 && window.innerHeight > 0) {
        width = window.innerWidth;
        height = window.innerHeight;
      }
    }"""

new_resize_size = """  function onResize() {
    if (!renderer || !camera) return;
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
    }"""

if old_bs_size in text:
    text = text.replace(old_bs_size, new_bs_size, 1)
    print('Updated buildScene sizing in crossroads-3d.js!')
else:
    print('Could not find old_bs_size')

if old_resize_size in text:
    text = text.replace(old_resize_size, new_resize_size, 1)
    print('Updated onResize sizing in crossroads-3d.js!')
else:
    print('Could not find old_resize_size')

# Also in crossroads-3d.js: when window.resizeDhakaCrossroads3D is called, ensure isRenderLoopPaused is reset to false
old_resize_export = """  window.resizeDhakaCrossroads3D = function() {
    onResize();
  };"""

new_resize_export = """  window.resizeDhakaCrossroads3D = function() {
    isRenderLoopPaused = false;
    onResize();
  };"""

if old_resize_export in text:
    text = text.replace(old_resize_export, new_resize_export, 1)
    print('Updated resizeDhakaCrossroads3D export in crossroads-3d.js!')
else:
    print('Could not find old_resize_export')

with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
    f.write(text)
