with open('create_gta_bus.py', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('Banner_Text')
print(text[start-200:start+600])
