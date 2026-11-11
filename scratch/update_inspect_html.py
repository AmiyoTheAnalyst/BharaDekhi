with open('scratch/inspect_visuals.html', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>',
    '<script src="../assets/GLTFLoader.js"></script>'
)

with open('scratch/inspect_visuals.html', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated inspect_visuals.html to use local GLTFLoader.js")
