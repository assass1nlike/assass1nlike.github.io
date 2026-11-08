"""场景 B：黄昏的红砂岩峡谷。在 Blender 里 import 后调用 build()。

布局（米）：台地 M1 顶面 z=0，x∈[-10,10]，y∈[0,45]，崖边在 y=0；角色沿 x≈0 朝 -Y 跑。
峡谷里有一根石柱（layout.PILLAR_*），对面台地 M2 顶面 z=M2_Z、崖边在 y=M2_EDGE。谷底在 z=FLOOR。
太阳在 -Y 方向、很低，Milo 从石柱后空翻下来时是逆光。
"""
import math
import random

import bpy

import world as W
import props as PR
from layout import PILLAR_Y, PILLAR_Z, PILLAR_R, M2_Z, M2_EDGE

FLOOR = -70.0
SUN_ROT = (6, 0, 192)          # 太阳灯欧拉角（度）：仰角很低，从 -Y 略偏西照过来
LIGHTS = dict(key=(1.0, 0.78, 0.6), key_power=350, rim1=(1.0, 0.62, 0.32), rim2=(0.55, 0.7, 1.0), rim_power=700)


def rock_mat(name="canyon_rock", tint=(1.2, 0.6, 0.38), scale=0.1):
    """分层砂岩：cliff_side 贴图三向投影，再乘一层随高度起伏的色带。"""
    m = W.pbr("cliff_side", scale=scale, tint=tint, bump=0.9, name=name)
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N["Principled BSDF"]
    src = b.inputs["Base Color"].links[0].from_socket
    geo = N.new("ShaderNodeNewGeometry")
    wv = N.new("ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "Z"
    wv.inputs["Scale"].default_value = 0.05; wv.inputs["Distortion"].default_value = 4.0
    wv.inputs["Detail"].default_value = 3
    L.new(geo.outputs["Position"], wv.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].color = (0.78, 0.62, 0.55, 1); e[1].color = (1.15, 1.0, 0.9, 1)
    L.new(wv.outputs["Fac"], ramp.inputs["Fac"])
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1
    L.new(src, mix.inputs["A"]); L.new(ramp.outputs["Color"], mix.inputs["B"])
    L.new(mix.outputs["Result"], b.inputs["Base Color"])
    return m


def displaced(name, obj, mat, strength, scale, detail=4, basis="BLENDER_ORIGINAL", levels=6, group=None):
    sub = obj.modifiers.new("sub", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = sub.render_levels = levels
    tex = bpy.data.textures.new(name + "_n", "CLOUDS")
    tex.noise_scale = scale; tex.noise_depth = detail; tex.noise_basis = basis
    d = obj.modifiers.new("disp", "DISPLACE"); d.texture = tex; d.texture_coords = "GLOBAL"; d.strength = strength
    if group:
        d.vertex_group = group
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def prism(name, ring, z_top, z_bottom, lip=0.8):
    """竖直的柱体网格：截面多边形 ring（[(x,y)]），顶面 z_top，底面 z_bottom；
    顶面和顶缘一圈的位移权重为 0（保持平整可落脚），lip 米以下权重为 1（大幅风化）。"""
    import bmesh
    bm = bmesh.new()
    zs = [z_top, z_top - lip, z_bottom]
    rings = [[bm.verts.new((x, y, z)) for x, y in ring] for z in zs]
    n = len(ring)
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(rings[0])
    bm.faces.new(list(reversed(rings[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    vg = o.vertex_groups.new(name="erode")
    vg.add(list(range(n, 3 * n)), 1.0, "REPLACE")
    vg.add(list(range(0, n)), 0.0, "REPLACE")
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    return o


def mesa(name, x, y, z, depth, top_mat, side_mat):
    """台地：可以跑的顶面（细小起伏）+ 往下的岩体（四周大幅位移，像风化的崖壁）。"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, z))
    top = bpy.context.object; top.name = name + "_top"
    top.scale = (x[1] - x[0], y[1] - y[0], 1); bpy.ops.object.transform_apply(scale=True)
    displaced(name + "_t", top, top_mat, 0.05, 1.2, levels=6)
    ring = [(x[0] + 0.1, y[0] + 0.1), (x[1] - 0.1, y[0] + 0.1), (x[1] - 0.1, y[1] - 0.1), (x[0] + 0.1, y[1] - 0.1)]
    body = prism(name + "_body", ring, z - 0.03, z - depth, lip=1.5)
    displaced(name + "_b", body, side_mat, 2.4, 4.0, basis="VORONOI_F2", levels=7, group="erode")


def spire(name, x, y, top, r, mat, cap_mat, bottom=FLOOR, taper=0.65, strength=0.8):
    """石柱：上粗下细、风化的岩柱，顶面平整可落脚。"""
    n = 24
    ring = [(x + r * math.cos(2 * math.pi * i / n), y + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
    o = prism(name, ring, top, bottom, lip=min(0.6, r * 0.3))
    # 下部收细
    for v in o.data.vertices[2 * n:]:
        v.co.x = x + (v.co.x - x) * taper
        v.co.y = y + (v.co.y - y) * taper
    displaced(name, o, mat, strength, 2.0 if r < 4 else 8.0, basis="VORONOI_F2", levels=5, group="erode")
    if cap_mat is not None:
        o.data.materials.append(cap_mat)
        o.data.polygons[2 * n].material_index = 1      # 顶面用落脚的地面材质
    return o


def restyle(coll, mat):
    """扫描模型只用它的形状，材质换成场景统一的砂岩。"""
    for o in coll.objects:
        if o.type == "MESH":
            o.data.materials.clear()
            o.data.materials.append(mat)


def build(seed=7):
    rng = random.Random(seed)
    W.world_hdri("quarry_01_puresky", strength=0.5, rot=170, bg_strength=0.8)
    rock = rock_mat()
    rock2 = rock_mat("canyon_rock2", tint=(1.1, 0.52, 0.32), scale=0.07)
    top_mat = W.pbr("aerial_ground_rock", scale=0.35, tint=(1.15, 0.7, 0.5), name="mesatop", bump=0.6)
    sand = W.pbr("red_sand", scale=0.5, tint=(1.0, 0.7, 0.5), name="sand", bump=0.3)
    mesa("M1", (-12, 12), (0, 60), 0.0, 90, top_mat, rock)
    mesa("M2", (-16, 16), (-60, M2_EDGE), M2_Z, 90, top_mat, rock2)
    spire("pillar", 0, PILLAR_Y, PILLAR_Z, PILLAR_R, rock, top_mat, strength=1.1)
    # 崖边用扫描崖壁做出风化的岩唇
    for k, (mdl, loc, rz, s) in enumerate([
            ("namaqualand_cliff_02", (-7, -0.6, -6.2), 180, 1.0), ("namaqualand_cliff_02", (8, -0.4, -6.8), 175, 1.1),
            ("namaqualand_cliff_01", (-13, 6, -4.6), 95, 1.0),
            ("namaqualand_cliff_02", (2, M2_EDGE + 0.5, M2_Z - 7.3), 0, 1.2), ("namaqualand_cliff_02", (-16, M2_EDGE + 0.2, M2_Z - 6.5), 8, 1.0)]):
        c = PR.asset(mdl)
        restyle(c, rock)
        PR.place(c, loc, rz=rz, scale=s)
    # 远处的台地和石柱，层层退远
    for k in range(26):
        a = rng.uniform(-math.pi, math.pi)
        r = rng.uniform(150, 600)
        x, y = r * math.cos(a), r * math.sin(a) - 40
        if abs(x) < 60 and y < 0 and r < 380:      # 朝落日方向留出开阔视野
            continue
        hh = rng.uniform(45, 120)
        if rng.random() < 0.55:
            spire(f"far{k}", x, y, FLOOR + hh, rng.uniform(5, 16), rock if k % 2 else rock2, None, taper=0.75, strength=3)
        else:
            w, d = rng.uniform(40, 120), rng.uniform(30, 90)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, FLOOR + hh / 2))
            o = bpy.context.object; o.name = f"farmesa{k}"
            o.scale = (w, d, hh); bpy.ops.object.transform_apply(scale=True)
            displaced(f"farmesa{k}", o, rock if k % 2 else rock2, 6, 12, basis="VORONOI_F2", levels=6)
    W.box("floor", (0, -40, FLOOR - 1), (1600, 1600, 1), sand)
    # 台地上的石块、枯树、灌木（避开 x≈0 的跑道）
    for mdl, x, y, z, rz, s in [
            ("namaqualand_boulder_04", -6.5, 8, 0, 20, 1.0), ("namaqualand_boulder_03", 6.8, 14, 0, 70, 1.2),
            ("namaqualand_boulder_02", 5.5, 3.5, 0, 140, 0.9), ("namaqualand_boulder_05", -4.0, 2.5, 0, 0, 1.0),
            ("dead_quiver_trunk", -7.5, 20, 0, 0, 1.6), ("quiver_tree_01", 7.5, 26, 0, 30, 1.5),
            ("wild_rooibos_bush", -5.5, 30, 0, 0, 1.0), ("dry_branches_medium_01", 3.5, 18, 0, 0, 1.0),
            ("namaqualand_boulder_04", 8.0, -14, M2_Z, 0, 1.4), ("namaqualand_boulder_03", -9.0, -20, M2_Z, 50, 1.3),
            ("dead_tree_trunk", -6, -24, M2_Z, 30, 1.0), ("sand_rocks_small_01", 4.0, -19, M2_Z, 0, 1.0),
            ("sand_rocks_small_01", -2.5, 12, 0, 60, 1.0), ("namaqualand_stones_01", 1.5, 6, 0, 30, 1.0)]:
        PR.place(PR.asset(mdl), (x, y, z), rz=rz, scale=s)
    sun = W.sun(SUN_ROT, 5.0, (1.0, 0.6, 0.3), angle=0.6)
    sun.data.volume_factor = 1.0
    W.fog(0.0011, (1.0, 0.82, 0.65), anisotropy=0.75, size=900, center=(0, -30, -20))
