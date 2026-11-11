with open('sw.js', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('STATIC_ASSETS')
print(text[start:start+1200])
