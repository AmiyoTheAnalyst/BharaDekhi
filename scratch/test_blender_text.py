import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.object.text_add(location=(0, 0, 0))
obj = bpy.context.active_object
obj.data.body = "BRTC · MIRPUR 10 ⇄ MOTIJHEEL"
bpy.ops.object.convert(target='MESH')
print("Total vertices with Unicode:", len(obj.data.vertices))

bpy.ops.object.text_add(location=(0, 0, 0))
obj2 = bpy.context.active_object
obj2.data.body = "BRTC - MIRPUR 10 <-> MOTIJHEEL"
bpy.ops.object.convert(target='MESH')
print("Total vertices with ASCII:", len(obj2.data.vertices))
