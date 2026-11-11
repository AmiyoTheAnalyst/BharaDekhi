from PIL import Image

im = Image.open('C:/Users/HP/.gemini/antigravity/brain/a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8/.user_uploaded/media_1794230095663_671c23a3.webp')
print('Image 2 size:', im.size, im.format, im.mode)
# Also check media_1794230059083_8e03e40e.jpg
im1 = Image.open('C:/Users/HP/.gemini/antigravity/brain/a2d3aea8-cfe9-491c-9b42-9d7a3c2c4ed8/.user_uploaded/media_1794230059083_8e03e40e.jpg')
print('Image 1 size:', im1.size, im1.format, im1.mode)
