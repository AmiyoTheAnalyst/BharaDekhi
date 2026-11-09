
import bpy
bpy.ops.object.text_add(location=(0, 0, 0))
txt = bpy.context.active_object
txt.data.body = 'VIP TRANSIT'
txt.data.size = 0.2
txt.data.extrude = 0.02
print('Text object created successfully:', txt.name, txt.data.body)
