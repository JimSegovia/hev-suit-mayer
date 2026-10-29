import bpy, bmesh, os

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)

# Tubo hueco low poly: 7 caras laterales, sin tapas ni grosor (cada cara = una pieza de cartón).
SIDES, RADIUS, HEIGHT = 7, 0.10, 0.30   # metros

bpy.ops.wm.read_factory_settings(use_empty=True)
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=SIDES,
                      radius1=RADIUS, radius2=RADIUS, depth=HEIGHT)
mesh = bpy.data.meshes.new("tubo_7_caras")
bm.to_mesh(mesh); bm.free()
obj = bpy.data.objects.new("tubo_7_caras", mesh)
bpy.context.scene.collection.objects.link(obj)
obj.location.z = HEIGHT / 2          # apoyado en el suelo
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=True)
print("CARAS:", len(mesh.polygons), "VERTICES:", len(mesh.vertices),
      "ARISTAS:", len(mesh.edges), "TAPAS:", sum(len(p.vertices) != 4 for p in mesh.polygons))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(AQUI, "tubo_7_caras.blend"))
bpy.ops.wm.obj_export(filepath=os.path.join(RAIZ, "models", "tubo-7-caras.obj"), export_materials=False)
