with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix line 20455 to have the safety guard
old_line = 'lucide.createIcons();\n      loadAdminDownloadMetrics();'
new_line = 'if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();\n      loadAdminDownloadMetrics();'

if old_line in text:
    print('Found bare lucide call at line 20455!')
    text = text.replace(old_line, new_line, 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print('Safeguarded line 20455!')
else:
    print('Checking text around bootApp')
    pos = text.find('async function bootApp()')
    print(text[pos:pos+200])
