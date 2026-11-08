"""场景搭建的公共工具：材质（Poly Haven 贴图、按世界坐标投影）、几何体、灯光、渲染设置。在 Blender 里运行。"""
import math
import os

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PH = os.path.join(ROOT, "vendor", "ph")


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def render_settings(sc, w=1920, h=1080, samples=32, fps=60, blur=True):
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.fps = fps
    e = sc.eevee
    e.taa_render_samples = samples
    e.use_raytracing = True
    e.ray_tracing_options.resolution_scale = "2"
    e.use_shadows = True
    e.shadow_ray_count = 2
    e.use_volumetric_shadows = True
    e.volumetric_tile_size = "8"
    e.fast_gi_method = "GLOBAL_ILLUMINATION"
    sc.render.use_motion_blur = blur
    sc.render.motion_blur_shutter = 0.5
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Punchy"
    sc.render.film_transparent = False


def world_hdri(name, strength=1.0, rot=0.0, bg_strength=None):
    w = bpy.data.worlds.new("world")
    bpy.context.scene.world = w
    w.use_nodes = True
    N, L = w.node_tree.nodes, w.node_tree.links
    N.clear()
    tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value[2] = math.radians(rot)
    env = N.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(PH, "hdri", f"{name}.exr"))
    L.new(tc.outputs["Generated"], mp.inputs["Vector"]); L.new(mp.outputs["Vector"], env.inputs["Vector"])
    out = N.new("ShaderNodeOutputWorld")
    if bg_strength is None:
        bg = N.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = strength
        L.new(env.outputs["Color"], bg.inputs["Color"]); L.new(bg.outputs[0], out.inputs[0])
    else:
        # 光照强度和背景可见亮度分开
        b1 = N.new("ShaderNodeBackground"); b1.inputs["Strength"].default_value = strength
        b2 = N.new("ShaderNodeBackground"); b2.inputs["Strength"].default_value = bg_strength
        lp = N.new("ShaderNodeLightPath"); mix = N.new("ShaderNodeMixShader")
        L.new(env.outputs["Color"], b1.inputs["Color"]); L.new(env.outputs["Color"], b2.inputs["Color"])
        L.new(lp.outputs["Is Camera Ray"], mix.inputs[0]); L.new(b1.outputs[0], mix.inputs[1]); L.new(b2.outputs[0], mix.inputs[2])
        L.new(mix.outputs[0], out.inputs[0])
    return w


_mats = {}


def pbr(tex, scale=1.0, tint=(1, 1, 1), rough_mul=1.0, bump=0.4, name=None, metal=0.0, emission=None):
    """用 Poly Haven 贴图做材质。贴图按世界坐标三向投影（BOX），scale 是每米重复次数。"""
    key = name or f"{tex}_{scale}_{tint}_{rough_mul}"
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N["Principled BSDF"]
    geo = N.new("ShaderNodeNewGeometry")
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (scale, scale, scale)
    L.new(geo.outputs["Position"], mp.inputs["Vector"])
    d = os.path.join(PH, "tex", tex)

    def img(fn, color=True):
        n = N.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(os.path.join(d, fn), check_existing=True)
        if not color:
            n.image.colorspace_settings.name = "Non-Color"
        n.projection = "BOX"; n.projection_blend = 0.25
        L.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n
    dif = img("diff.jpg")
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs["B"].default_value = (*tint, 1)
    L.new(dif.outputs["Color"], mix.inputs["A"]); L.new(mix.outputs["Result"], b.inputs["Base Color"])
    if os.path.exists(os.path.join(d, "rough.jpg")):
        r = img("rough.jpg", False)
        mm = N.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; mm.inputs[1].default_value = rough_mul
        L.new(r.outputs["Color"], mm.inputs[0]); L.new(mm.outputs[0], b.inputs["Roughness"])
    if os.path.exists(os.path.join(d, "disp.jpg")) and bump:
        h = img("disp.jpg", False)
        bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.02
        L.new(h.outputs["Color"], bp.inputs["Height"]); L.new(bp.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Metallic"].default_value = metal
    if emission:
        b.inputs["Emission Color"].default_value = (*emission[0], 1)
        b.inputs["Emission Strength"].default_value = emission[1]
    _mats[key] = m
    return m


def flat(color, rough=0.5, metal=0.0, emit=0.0, name=None):
    key = name or f"flat_{color}_{rough}_{metal}_{emit}"
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(key)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = (*color, 1)
        b.inputs["Emission Strength"].default_value = emit
    _mats[key] = m
    return m


def box(name, loc, size, mat, bevel=0.0, coll=None):
    """loc 是底面中心，size = (x, y, z)。"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], loc[2] + size[2] / 2))
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL"); m.width = bevel; m.segments = 2
    o.data.materials.append(mat)
    if coll:
        for c in o.users_collection:
            c.objects.unlink(o)
        coll.objects.link(o)
    return o


class Batch:
    """大量方块合并成每种材质一个网格：比逐个 bpy.ops 创建快几个数量级，渲染也更省。"""

    _F = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]

    def __init__(self, name):
        self.name = name
        self.parts = {}

    def box(self, loc, size, mat):
        """loc 是底面中心。"""
        x, y, z = loc
        sx, sy, sz = size[0] / 2, size[1] / 2, size[2]
        v, f = self.parts.setdefault(mat.name, ([], []))
        n = len(v)
        v += [(x - sx, y - sy, z), (x + sx, y - sy, z), (x + sx, y + sy, z), (x - sx, y + sy, z),
              (x - sx, y - sy, z + sz), (x + sx, y - sy, z + sz), (x + sx, y + sy, z + sz), (x - sx, y + sy, z + sz)]
        f += [tuple(n + i for i in q) for q in self._F]

    def flush(self):
        out = []
        for mname, (v, f) in self.parts.items():
            me = bpy.data.meshes.new(f"{self.name}_{mname}")
            me.from_pydata(v, [], f)
            me.update()
            o = bpy.data.objects.new(me.name, me)
            bpy.context.scene.collection.objects.link(o)
            o.data.materials.append(bpy.data.materials[mname])
            out.append(o)
        self.parts = {}
        return out


def cyl(name, loc, r, h, mat, verts=24, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    o.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return o


def tube(name, pts, r, color, strength):
    """霓虹灯管：沿折线的发光圆管。"""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 3
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (*c, 1)
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(flat(color, emit=strength, name=f"neon_{name}"))
    return o


def area(name, loc, rot, size, color, power):
    bpy.ops.object.light_add(type="AREA", location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    o.data.size = size; o.data.color = color; o.data.energy = power
    return o


def sun(rot, energy, color=(1, 1, 1), angle=1.0):
    bpy.ops.object.light_add(type="SUN", rotation=[math.radians(a) for a in rot])
    o = bpy.context.object
    o.data.energy = energy; o.data.color = color; o.data.angle = math.radians(angle)
    return o


def fog(density=0.01, color=(1, 1, 1), anisotropy=0.3, size=200, center=(0, 0, 0)):
    """整个场景的体积雾：一个大立方体里放 Principled Volume。"""
    bpy.ops.mesh.primitive_cube_add(size=size, location=center)
    o = bpy.context.object; o.name = "fog"
    m = bpy.data.materials.new("fog"); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N["Principled BSDF"])
    v = N.new("ShaderNodeVolumePrincipled")
    v.inputs["Density"].default_value = density
    v.inputs["Color"].default_value = (*color, 1)
    v.inputs["Anisotropy"].default_value = anisotropy
    L.new(v.outputs[0], N["Material Output"].inputs["Volume"])
    o.data.materials.append(m)
    o.visible_shadow = False
    return o


def load_char(name, loc=(0, 0, 0)):
    """把角色 blend 里的对象追加进当前场景，返回骨架对象。"""
    path = os.path.join(ROOT, "build", "chars", f"{name}.blend")
    with bpy.data.libraries.load(path) as (src, dst):
        dst.objects = [n for n in src.objects]
    rig = None
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    for o in dst.objects:
        coll.objects.link(o)
        if o.type == "ARMATURE":
            rig = o
    import sys
    sys.path.insert(0, os.path.join(ROOT, "src"))
    import chars, look
    look.apply(name, chars.CHARS[name])
    return rig


def char_lights(rig, key=(1.0, 0.9, 0.82), key_power=450, rim1=(0.2, 0.75, 1.0), rim2=(1.0, 0.25, 0.6), rim_power=1400,
                key_dir=(-0.6, -1.0, 0.7)):
    """跟随角色的三点光：主光从镜头一侧斜上方照脸和身体正面，两盏彩色轮廓光从身后两侧勾边。
    灯挂在 Hips 骨骼的位置上但不跟着旋转（翻转时光的方向保持在世界坐标里）。"""
    from mathutils import Vector
    hips = rig.pose.bones["Hips"]
    anchor = bpy.data.objects.new("light_anchor", None)
    bpy.context.scene.collection.objects.link(anchor)
    c = anchor.constraints.new("COPY_LOCATION"); c.target = rig; c.subtarget = "Hips"
    out = []
    for nm, d, col, pw, sz in (("key", key_dir, key, key_power, 1.2), ("rim1", (1.3, 1.0, 0.6), rim1, rim_power, 0.8),
                               ("rim2", (-1.3, 1.1, 0.4), rim2, rim_power, 0.8)):
        v = Vector(d).normalized() * 3.0
        bpy.ops.object.light_add(type="AREA", location=v)
        L = bpy.context.object; L.name = "char_" + nm
        L.data.size = sz; L.data.color = col; L.data.energy = pw
        L.data.volume_factor = 0.0          # 跟随角色的补光不照亮雾，免得在空中散成光团
        L.parent = anchor
        L.rotation_euler = (-v).to_track_quat("-Z", "Y").to_euler()
        out.append(L)
    return out
