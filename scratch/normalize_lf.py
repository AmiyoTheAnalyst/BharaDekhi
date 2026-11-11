with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Normalize CRLF to LF
content = content.replace('\r\n', '\n')

with open('index.html', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print('Normalized index.html to LF line endings!')
