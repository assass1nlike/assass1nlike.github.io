"""场景道具与特效：Poly Haven 模型实例化、灯光、湿地面、蒸汽。在 Blender 里使用。"""
import glob
import math
import os

import bpy
from mathutils import Vector

from world import PH

_assets = {}


def asset(model, part=None, recenter=False):
    """导入 Poly Haven 模型（同一模型只导入一次），返回一个不进场景的集合，供 place() 实例化。
    part 给定时只取这个部件；part 或 recenter 时把包围盒底面中心挪到原点。"""
    key = (model, part)
    if key in _assets:
        return _assets[key]
    if model not in _assets:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=glob.glob(os.path.join(PH, "models", model, "*.gltf"))[0])
        objs = [o for o in bpy.data.objects if o not in before]
        for o in objs:
            for c in list(o.users_collection):
                c.objects.unlink(o)
        _assets[model] = objs
    objs = _assets[model]
    pick = [o for o in objs if o.type == "MESH" and (part is None or o.name.split(".")[0] == part)]
    if not pick:
        raise KeyError(f"{model}/{part}")
    off = Vector((0, 0, 0))
    if part is not None or recenter:
        lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
        for o in pick:
            for c in o.bound_box:
                w = o.matrix_world @ Vector(c)
                lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
        off = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    coll = bpy.data.collections.new(f"A_{model}_{part or 'all'}")
    for o in pick:
        c = o.copy()
        mw = o.matrix_world.copy()
        c.parent = None
        c.matrix_world = mw
        c.location = c.location - off
        coll.objects.link(c)
    _assets[key] = coll
    return coll


def place(coll, loc, rz=0.0, scale=1.0, rx=0.0, ry=0.0, name=None):
    o = bpy.data.objects.new(name or coll.name, None)
    o.instance_type = "COLLECTION"
    o.instance_collection = coll
    o.location = loc
    o.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
    o.scale = (scale,) * 3 if not hasattr(scale, "__len__") else tuple(scale)
    bpy.context.scene.collection.objects.link(o)
    return o


def point(loc, color, power, radius=0.1, name="pt"):
    bpy.ops.object.light_add(type="POINT", location=loc)
    o = bpy.context.object
    o.name = name
    o.data.energy = power; o.data.color = color; o.data.shadow_soft_size = radius
    return o


def spot(loc, rot, color, power, angle=45, blend=0.4, radius=0.05, name="spot"):
    bpy.ops.object.light_add(type="SPOT", location=loc, rotation=[math.radians(a) for a in rot])
    o = bpy.context.object
    o.name = name
    o.data.energy = power; o.data.color = color
    o.data.spot_size = math.radians(angle); o.data.spot_blend = blend; o.data.shadow_soft_size = radius
    return o


def wet(mat, puddle_scale=0.35, coverage=0.45, darken=0.55):
    """改成雨后的湿地面：整体粗糙度降低，噪声遮罩处是几乎镜面、颜色更深、法线平整的积水。"""
    N, L = mat.node_tree.nodes, mat.node_tree.links
    b = N["Principled BSDF"]
    geo = N.new("ShaderNodeNewGeometry")
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = puddle_scale
    nz.inputs["Detail"].default_value = 6
    nz.inputs["Roughness"].default_value = 0.6
    L.new(geo.outputs["Position"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position = coverage; e[0].color = (0, 0, 0, 1)
    e[1].position = coverage + 0.06; e[1].color = (1, 1, 1, 1)
    L.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    mr = N.new("ShaderNodeMath"); mr.operation = "MULTIPLY"; mr.inputs[1].default_value = 0.55
    if b.inputs["Roughness"].links:
        L.new(b.inputs["Roughness"].links[0].from_socket, mr.inputs[0])
    else:
        mr.inputs[0].default_value = b.inputs["Roughness"].default_value
    mix_r = N.new("ShaderNodeMix"); mix_r.data_type = "FLOAT"
    L.new(ramp.outputs["Color"], mix_r.inputs["Factor"]); L.new(mr.outputs[0], mix_r.inputs["A"])
    mix_r.inputs["B"].default_value = 0.02
    L.new(mix_r.outputs["Result"], b.inputs["Roughness"])
    mix_c = N.new("ShaderNodeMix"); mix_c.data_type = "RGBA"; mix_c.blend_type = "MULTIPLY"
    L.new(ramp.outputs["Color"], mix_c.inputs["Factor"])
    if b.inputs["Base Color"].links:
        L.new(b.inputs["Base Color"].links[0].from_socket, mix_c.inputs["A"])
    else:
        mix_c.inputs["A"].default_value = b.inputs["Base Color"].default_value
    mix_c.inputs["B"].default_value = (darken, darken, darken, 1)
    L.new(mix_c.outputs["Result"], b.inputs["Base Color"])
    if b.inputs["Normal"].links:
        mix_n = N.new("ShaderNodeMix"); mix_n.data_type = "VECTOR"
        L.new(ramp.outputs["Color"], mix_n.inputs["Factor"])
        L.new(b.inputs["Normal"].links[0].from_socket, mix_n.inputs["A"])
        L.new(geo.outputs["Normal"], mix_n.inputs["B"])
        L.new(mix_n.outputs["Result"], b.inputs["Normal"])
    return mat


def steam(name, loc, radius=0.5, height=6.0, density=1.2, color=(1, 1, 1)):
    """通风口冒出的蒸汽：竖直圆柱体积，越往上越宽越淡，内部用噪声打散。"""
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=1, depth=2, location=(loc[0], loc[1], loc[2] + height / 2))
    o = bpy.context.object
    o.name = name
    o.scale = (radius * 3, radius * 3, height / 2)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N["Principled BSDF"])
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
    cxy = N.new("ShaderNodeCombineXYZ")
    L.new(sep.outputs["X"], cxy.inputs["X"]); L.new(sep.outputs["Y"], cxy.inputs["Y"])
    r = N.new("ShaderNodeVectorMath"); r.operation = "LENGTH"; L.new(cxy.outputs[0], r.inputs[0])
    hz = N.new("ShaderNodeMapRange"); hz.inputs["From Min"].default_value = -1; hz.inputs["From Max"].default_value = 1
    L.new(sep.outputs["Z"], hz.inputs["Value"])                    # 0 底 → 1 顶
    wdt = N.new("ShaderNodeMapRange"); wdt.inputs["To Min"].default_value = 0.3; wdt.inputs["To Max"].default_value = 1.0
    L.new(hz.outputs["Result"], wdt.inputs["Value"])
    q = N.new("ShaderNodeMath"); q.operation = "DIVIDE"
    L.new(r.outputs["Value"], q.inputs[0]); L.new(wdt.outputs["Result"], q.inputs[1])
    fall = N.new("ShaderNodeMapRange")
    fall.inputs["From Min"].default_value = 0.1; fall.inputs["From Max"].default_value = 1.0
    fall.inputs["To Min"].default_value = 1.0; fall.inputs["To Max"].default_value = 0.0
    L.new(q.outputs[0], fall.inputs["Value"])
    top = N.new("ShaderNodeMath"); top.operation = "SUBTRACT"; top.inputs[0].default_value = 1.0
    L.new(hz.outputs["Result"], top.inputs[1])
    nz = N.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 2.5; nz.inputs["Detail"].default_value = 8; nz.inputs["Distortion"].default_value = 0.8
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    nr = N.new("ShaderNodeMapRange"); nr.inputs["From Min"].default_value = 0.42; nr.inputs["From Max"].default_value = 0.72
    L.new(nz.outputs["Fac"], nr.inputs["Value"])
    m1 = N.new("ShaderNodeMath"); m1.operation = "MULTIPLY"
    L.new(fall.outputs["Result"], m1.inputs[0]); L.new(top.outputs[0], m1.inputs[1])
    m2 = N.new("ShaderNodeMath"); m2.operation = "MULTIPLY"
    L.new(m1.outputs[0], m2.inputs[0]); L.new(nr.outputs["Result"], m2.inputs[1])
    m3 = N.new("ShaderNodeMath"); m3.operation = "MULTIPLY"; m3.inputs[1].default_value = density
    L.new(m2.outputs[0], m3.inputs[0])
    v = N.new("ShaderNodeVolumePrincipled")
    v.inputs["Color"].default_value = (*color, 1); v.inputs["Anisotropy"].default_value = 0.4
    L.new(m3.outputs[0], v.inputs["Density"])
    L.new(v.outputs[0], N["Material Output"].inputs["Volume"])
    o.data.materials.append(m)
    o.visible_shadow = False
    return o


def cable(name, a, b, sag=0.6, r=0.012, color=(0.02, 0.02, 0.02)):
    """两点之间下垂的电线。"""
    from world import flat
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY")
    n = 16
    sp.points.add(n)
    a = Vector(a); b = Vector(b)
    for i in range(n + 1):
        u = i / n
        p = a.lerp(b, u)
        p.z -= sag * 4 * u * (1 - u)
        sp.points[i].co = (*p, 1)
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(flat(color, rough=0.5))
    return o
