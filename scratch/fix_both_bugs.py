# Fix line 3905 in assets/crossroads-3d.js
with open('assets/crossroads-3d.js', 'r', encoding='utf-8') as f:
    text = f.read()

old_code = "const hPreset = HELMET_PRESETS[Math.abs(seed) % HELMET_PRESETS.length];"
new_code = "const hSeed = (typeof appearanceSeed !== 'undefined') ? appearanceSeed : 0;\n      const hPreset = HELMET_PRESETS[Math.abs(hSeed) % HELMET_PRESETS.length];"

if old_code in text:
    text = text.replace(old_code, new_code, 1)
    with open('assets/crossroads-3d.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Fixed line 3905 in crossroads-3d.js!')
else:
    print('Could not find old_code in crossroads-3d.js')

# Fix line 12459 in index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_lucide = "icon.setAttribute('data-lucide', 'play');\n        icon.className = 'w-3.5 h-3.5 text-blue-600 fill-blue-600';\n      }\n      lucide.createIcons();"
new_lucide = "icon.setAttribute('data-lucide', 'play');\n        icon.className = 'w-3.5 h-3.5 text-blue-600 fill-blue-600';\n      }\n      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();"

if old_lucide in html:
    html = html.replace(old_lucide, new_lucide, 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Fixed line 12459 in index.html!')
else:
    print('Could not find old_lucide in index.html')
