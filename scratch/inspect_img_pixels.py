from PIL import Image
import numpy as np

img = Image.open('scratch/direct_3d.png')
arr = np.array(img)
print('Shape:', arr.shape)
print('Min:', arr.min(), 'Max:', arr.max(), 'Mean:', arr.mean())

# Check center region (where the 3D scene should be)
h, w, c = arr.shape
center = arr[h//4:3*h//4, w//4:3*w//4]
print('Center region mean:', center.mean(), 'min:', center.min(), 'max:', center.max())
