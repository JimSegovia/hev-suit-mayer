import bpy, bmesh, math
from mathutils import Vector

# Protector de antebrazo HEV, low poly. Todas las caras son planas (trapecios o rectángulos),
# así que cada una puede cortarse como una pieza de cartón.
# Medidas en cm; al final todo se pasa a metros. Eje del brazo = Z: muñeca abajo, codo arriba.
# El frente mira a -Y. La espalda es una placa plana que une las dos aletas: la pieza da la vuelta completa.
LARGO = 24            # largo del antebrazo
MUNECA_C = 16         # contorno de muñeca
ANTEBRAZO_C = 23      # contorno de antebrazo (lado del codo)
HOLGURA = 3           # se suma al contorno para que entre sobre la ropa
RATIO = 0.75          # profundidad / ancho de la sección
# Vértices de la sección (grados desde el frente): 7 paneles. Los extremos (±125°) son las aletas.
ANGULOS = [-125, -100, -55, -24, 24, 55, 100, 125]
ALETA = 1.45          # las aletas traseras (±125°) salen hacia atrás y afuera; entre ellas va la placa trasera
# Anillos (altura z, escala): banda oscura bajo la muñeca, biseles de cada extremo.
ANILLOS = [(-1.5, 0.84), (0, 0.88), (1.2, 1.0), (4.0, 1.0), (19.0, 1.0), (21.5, 1.0), (24, 0.86)]
FILA_PANEL, COL_PANEL = 3, 3     # cara grande central (z=4 a z=19)
MARCO, HUECO = 0.5, 0.5          # borde y profundidad del panel hundido

NARANJA, OSCURO, GRIS = 0, 1, 2


def semieje(perimetro, r):
    """Semieje mayor de una elipse con ese perímetro (aprox. de Ramanujan)."""
    return perimetro / (math.pi * (3 * (1 + r) - math.sqrt((3 + r) * (1 + 3 * r))))


def material(nombre, color):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.diffuse_color = color
    return m


def build(nombre="antebrazo_hev", origen=(0.4, 0, 0)):
    bm = bmesh.new()
    n = len(ANGULOS)

    anillos = []
    for z, f in ANILLOS:
        c = (MUNECA_C + (ANTEBRAZO_C - MUNECA_C) * min(max(z / LARGO, 0), 1) + HOLGURA) * f
        a = semieje(c, RATIO)
        fila = []
        for j, t in enumerate(ANGULOS):
            k = ALETA if j in (0, n - 1) else 1.0
            r = math.radians(t)
            fila.append(bm.verts.new((k * a * math.sin(r), -k * a * RATIO * math.cos(r), z)))
        anillos.append(fila)

    caras = {}
    for i in range(len(anillos) - 1):
        for j in range(n):
            j2 = (j + 1) % n      # la última cara (j = n-1) es la placa trasera
            f = bm.faces.new((anillos[i][j], anillos[i][j2], anillos[i + 1][j2], anillos[i + 1][j]))
            f.material_index = OSCURO if i == 0 else NARANJA
            caras[(i, j)] = f

    # Panel central hundido (oscuro). Las paredes salen paralelas a los bordes, así que siguen planas.
    panel = caras[(FILA_PANEL, COL_PANEL)]
    pared = bmesh.ops.inset_region(bm, faces=[panel], thickness=MARCO, depth=-HUECO, use_even_offset=True)
    for f in pared["faces"]:
        f.material_index = OSCURO
    panel.material_index = OSCURO
    # El inset deja caras sin área en los bordes laterales: se eliminan.
    vacias = [f for f in bm.faces if f.calc_area() < 1e-6]
    bmesh.ops.delete(bm, geom=vacias, context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context="EDGES")
    bm.normal_update()

    # Sistema de coordenadas sobre el fondo del panel: t = 0..1 a lo largo, s = -1..1 a lo ancho.
    vs = sorted(panel.verts, key=lambda v: v.co.z)
    bl, br = sorted(vs[:2], key=lambda v: v.co.x)
    tl, tr = sorted(vs[2:], key=lambda v: v.co.x)
    Z = panel.normal.copy()

    def pt(t, s, alt=0.0):
        c = ((bl.co + br.co) / 2).lerp((tl.co + tr.co) / 2, t)
        w = ((br.co - bl.co) / 2).lerp((tr.co - tl.co) / 2, t)
        return c + w * s + Z * alt

    def prisma(base, h, encoge, mat):
        """Bloque levantado sobre la superficie: tapa + paredes, sin base. `base` va en sentido antihorario."""
        c = sum(base, Vector()) / len(base)
        arriba = [c + (p - c) * encoge + Z * h for p in base]
        bv = [bm.verts.new(p) for p in base]
        tv = [bm.verts.new(p) for p in arriba]
        fs = [bm.faces.new(tv)]
        for i in range(len(base)):
            j = (i + 1) % len(base)
            fs.append(bm.faces.new((bv[i], bv[j], tv[j], tv[i])))
        for f in fs:
            f.material_index = mat
        return arriba

    # Placa con tres botones apilados (arriba del panel).
    PLACA_H = 0.2
    prisma([pt(0.68, -0.80), pt(0.68, 0.80), pt(0.96, 0.80), pt(0.96, -0.80)], PLACA_H, 0.94, GRIS)
    for k in range(3):
        t1 = 0.935 - k * 0.095
        t0 = t1 - 0.065
        prisma([pt(t0, -0.62, PLACA_H), pt(t0, 0.62, PLACA_H), pt(t1, 0.62, PLACA_H), pt(t1, -0.62, PLACA_H)],
               0.35, 0.85, GRIS)
    # Nervio central que se angosta hacia abajo.
    prisma([pt(0.08, -0.25), pt(0.08, 0.25), pt(0.62, 0.55), pt(0.62, -0.55)], 0.3, 0.8, GRIS)

    bmesh.ops.scale(bm, vec=Vector((0.01, 0.01, 0.01)), verts=bm.verts)
    mesh = bpy.data.meshes.new(nombre)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material("naranja_HEV", (0.95, 0.5, 0.1, 1)))
    mesh.materials.append(material("panel_oscuro", (0.08, 0.08, 0.09, 1)))
    mesh.materials.append(material("gris_HEV", (0.3, 0.3, 0.33, 1)))
    obj = bpy.data.objects.new(nombre, mesh)
    obj.location = origen
    obj.show_wire = True
    bpy.context.scene.collection.objects.link(obj)
    return obj
