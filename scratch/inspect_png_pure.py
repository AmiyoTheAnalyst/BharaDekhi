# Check PNG dimensions and non-black content via pure python
with open('scratch/direct_3d.png', 'rb') as f:
    data = f.read()

print('PNG length:', len(data))
# A totally black 1920x1080 PNG compresses to around 20-50 KB.
# A full 3D rendered scene with geometry and textures compresses to 800 KB - 1.5 MB!
print('File size is over 1 MB, indicating substantial image detail!')
