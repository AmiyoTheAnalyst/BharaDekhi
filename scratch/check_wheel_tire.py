with open('create_gta_bus.py', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('_Tire"')
if pos != -1:
    print(text[pos-50:pos+500])
