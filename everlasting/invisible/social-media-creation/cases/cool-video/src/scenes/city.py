"""夜景城市：程序化的楼群、逐格随机亮灯的窗户、LED 灯带、广告屏、霓虹招牌、高度雾、天空。在 Blender 里使用。"""
import math
import os
import random

import bpy

import world as W

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_m = {}


def facade(name, cell=(1.6, 3.3), density=0.32, glass=(0.012, 0.016, 0.024), strength=2.2, seed=0,
           warm=(1.0, 0.62, 0.32), cool=(0.62, 0.78, 1.0), band=0.0):
    """楼体立面：每扇窗由 (所在格子, seed) 决定是否亮、色温和亮度；窗间是深色玻璃幕墙，顶面是深色屋面。"""
    key = (name,)
    if key in _m:
        return _m[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N["Principled BSDF"]
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Position"], sep.inputs[0])
    u = N.new("ShaderNodeMath"); u.operation = "ADD"
    L.new(sep.outputs["X"], u.inputs[0]); L.new(sep.outputs["Y"], u.inputs[1])
    us = N.new("ShaderNodeMath"); us.operation = "DIVIDE"; us.inputs[1].default_value = cell[0]
    vs = N.new("ShaderNodeMath"); vs.operation = "DIVIDE"; vs.inputs[1].default_value = cell[1]
    L.new(u.outputs[0], us.inputs[0]); L.new(sep.outputs["Z"], vs.inputs[0])
    fu = N.new("ShaderNodeMath"); fu.operation = "FLOOR"; L.new(us.outputs[0], fu.inputs[0])
    fv = N.new("ShaderNodeMath"); fv.operation = "FLOOR"; L.new(vs.outputs[0], fv.inputs[0])
    cid = N.new("ShaderNodeCombineXYZ")
    L.new(fu.outputs[0], cid.inputs["X"]); L.new(fv.outputs[0], cid.inputs["Y"]); cid.inputs["Z"].default_value = seed
    wn = N.new("ShaderNodeTexWhiteNoise"); wn.noise_dimensions = "3D"
    L.new(cid.outputs[0], wn.inputs["Vector"])
    rgb = N.new("ShaderNodeSeparateColor"); L.new(wn.outputs["Color"], rgb.inputs[0])
    lit = N.new("ShaderNodeMath"); lit.operation = "GREATER_THAN"; lit.inputs[1].default_value = 1 - density
    L.new(rgb.outputs["Red"], lit.inputs[0])
    # 窗洞形状
    pu = N.new("ShaderNodeMath"); pu.operation = "FRACT"; L.new(us.outputs[0], pu.inputs[0])
    pv = N.new("ShaderNodeMath"); pv.operation = "FRACT"; L.new(vs.outputs[0], pv.inputs[0])

    def inside(src, lo, hi):
        a = N.new("ShaderNodeMath"); a.operation = "GREATER_THAN"; a.inputs[1].default_value = lo
        c = N.new("ShaderNodeMath"); c.operation = "LESS_THAN"; c.inputs[1].default_value = hi
        L.new(src.outputs[0], a.inputs[0]); L.new(src.outputs[0], c.inputs[0])
        mm = N.new("ShaderNodeMath"); mm.operation = "MULTIPLY"
        L.new(a.outputs[0], mm.inputs[0]); L.new(c.outputs[0], mm.inputs[1])
        return mm
    iu = inside(pu, 0.08, 0.92); iv = inside(pv, 0.2, 0.88)
    mul = inside(pu, 0.485, 0.515)          # 竖向窗框把一格分成两扇
    nm = N.new("ShaderNodeMath"); nm.operation = "SUBTRACT"; nm.inputs[0].default_value = 1
    L.new(mul.outputs[0], nm.inputs[1])
    win0 = N.new("ShaderNodeMath"); win0.operation = "MULTIPLY"
    L.new(iu.outputs[0], win0.inputs[0]); L.new(iv.outputs[0], win0.inputs[1])
    win = N.new("ShaderNodeMath"); win.operation = "MULTIPLY"
    L.new(win0.outputs[0], win.inputs[0]); L.new(nm.outputs[0], win.inputs[1])
    # 亮窗按随机亮度发光；其余窗户是很暗的一层（拉着窗帘、走廊灯），让立面有纹理而不是一片黑
    dim = N.new("ShaderNodeMath"); dim.operation = "MULTIPLY_ADD"; dim.inputs[1].default_value = 0.035
    dim.inputs[2].default_value = 0.008
    L.new(rgb.outputs["Blue"], dim.inputs[0])
    lvl = N.new("ShaderNodeMix"); lvl.data_type = "FLOAT"
    L.new(lit.outputs[0], lvl.inputs["Factor"]); L.new(dim.outputs[0], lvl.inputs["A"]); lvl.inputs["B"].default_value = 1.0
    on = N.new("ShaderNodeMath"); on.operation = "MULTIPLY"
    L.new(win.outputs[0], on.inputs[0]); L.new(lvl.outputs["Result"], on.inputs[1])
    # 立面 vs 屋顶
    nsep = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Normal"], nsep.inputs[0])
    nabs = N.new("ShaderNodeMath"); nabs.operation = "ABSOLUTE"; L.new(nsep.outputs["Z"], nabs.inputs[0])
    side = N.new("ShaderNodeMath"); side.operation = "LESS_THAN"; side.inputs[1].default_value = 0.5
    L.new(nabs.outputs[0], side.inputs[0])
    on2 = N.new("ShaderNodeMath"); on2.operation = "MULTIPLY"
    L.new(on.outputs[0], on2.inputs[0]); L.new(side.outputs[0], on2.inputs[1])
    # 颜色：冷暖随机，亮度随机，窗内从下往上稍亮（窗帘/顶灯）
    col = N.new("ShaderNodeMix"); col.data_type = "RGBA"
    L.new(rgb.outputs["Green"], col.inputs["Factor"])
    col.inputs["A"].default_value = (*warm, 1); col.inputs["B"].default_value = (*cool, 1)
    br = N.new("ShaderNodeMapRange"); br.inputs["To Min"].default_value = 0.25; br.inputs["To Max"].default_value = 1.6
    L.new(rgb.outputs["Blue"], br.inputs["Value"])
    grad = N.new("ShaderNodeMapRange"); grad.inputs["To Min"].default_value = 0.55; grad.inputs["To Max"].default_value = 1.1
    L.new(pv.outputs[0], grad.inputs["Value"])
    s1 = N.new("ShaderNodeMath"); s1.operation = "MULTIPLY"; L.new(br.outputs["Result"], s1.inputs[0]); L.new(grad.outputs["Result"], s1.inputs[1])
    s2 = N.new("ShaderNodeMath"); s2.operation = "MULTIPLY"; L.new(s1.outputs[0], s2.inputs[0]); L.new(on2.outputs[0], s2.inputs[1])
    s3 = N.new("ShaderNodeMath"); s3.operation = "MULTIPLY"; s3.inputs[1].default_value = strength
    L.new(s2.outputs[0], s3.inputs[0])
    L.new(col.outputs["Result"], b.inputs["Emission Color"])
    L.new(s3.outputs[0], b.inputs["Emission Strength"])
    b.inputs["Base Color"].default_value = (*glass, 1)
    b.inputs["Metallic"].default_value = 0.4
    rough = N.new("ShaderNodeMix"); rough.data_type = "FLOAT"
    L.new(side.outputs[0], rough.inputs["Factor"])
    rough.inputs["A"].default_value = 0.8; rough.inputs["B"].default_value = 0.18
    L.new(rough.outputs["Result"], b.inputs["Roughness"])
    _m[key] = m
    return m


def neon_sign_texture(text, path, vertical=True, size=96):
    """白字黑底的招牌贴图（用 autovideo 环境的 PIL 生成，已存在就跳过）。"""
    if os.path.exists(path):
        return path
    import subprocess
    code = (
        "import sys\nfrom PIL import Image, ImageDraw, ImageFont, ImageFilter\n"
        "t, p, v, s = sys.argv[1], sys.argv[2], sys.argv[3] == '1', int(sys.argv[4])\n"
        "f = ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc', s)\n"
        "n = len(t); pad = s // 3\n"
        "W, H = (s + 2 * pad, n * s + 2 * pad) if v else (n * s + 2 * pad, s + 2 * pad)\n"
        "im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)\n"
        "for i, ch in enumerate(t):\n"
        "    x, y = (pad, pad + i * s) if v else (pad + i * s, pad)\n"
        "    d.text((x, y - s // 8), ch, font=f, fill=255)\n"
        "d.rectangle([3, 3, W - 4, H - 4], outline=255, width=max(2, s // 24))\n"
        "im.save(p)\n")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run([r"D:/anaconda/envs/autovideo/python.exe", "-c", code, text, path, "1" if vertical else "0", str(size)], check=True)
    return path


def neon_sign(name, text, loc, rz, height, color, strength=25, vertical=True):
    """霓虹招牌：发光字贴图在一块薄板上，背后一盏同色面光照亮墙面。"""
    path = neon_sign_texture(text, os.path.join(ROOT, "build", "tex", f"sign_{name}.png"), vertical)
    img = bpy.data.images.load(path)
    w, h = img.size
    sx, sz = height * w / h, height
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=(math.radians(90), 0, math.radians(rz)))
    o = bpy.context.object
    o.name = name
    o.scale = (sx, sz, 1)
    m = bpy.data.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N["Principled BSDF"]
    t = N.new("ShaderNodeTexImage"); t.image = img
    b.inputs["Base Color"].default_value = (0.01, 0.01, 0.012, 1)
    b.inputs["Emission Color"].default_value = (*color, 1)
    mm = N.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; mm.inputs[1].default_value = strength
    L.new(t.outputs["Color"], mm.inputs[0]); L.new(mm.outputs[0], b.inputs["Emission Strength"])
    o.data.materials.append(m)
    # 背板
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=(0, 0, math.radians(rz)))
    bk = bpy.context.object
    bk.scale = (sx + 0.15, 0.12, sz + 0.15)
    from mathutils import Vector, Matrix
    back = Matrix.Rotation(math.radians(rz), 3, "Z") @ Vector((0, 0.07, 0))
    bk.location = Vector(loc) + back
    bk.data.materials.append(W.flat((0.02, 0.02, 0.025), rough=0.4))
    fwd = Matrix.Rotation(math.radians(rz), 3, "Z") @ Vector((0, -1.2, 0))
    W.area(name + "_glow", Vector(loc) + fwd, (math.radians(90), 0, math.radians(rz + 180)), max(sx, sz), color, strength * sx * sz * 18)
    return o


def ad_screen(name, loc, rz, size, seed=0, strength=6.0):
    """楼体上的大块 LED 广告屏：大色块渐变 + 扫描线。"""
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=(math.radians(90), 0, math.radians(rz)))
    o = bpy.context.object
    o.name = name
    o.scale = (size[0], size[1], 1)
    m = bpy.data.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    wv = N.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 1.2; wv.inputs["Distortion"].default_value = 6
    wv.inputs["Detail"].default_value = 3
    L.new(tc.outputs["UV"], wv.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    rng = random.Random(seed)
    pal = [(1.0, 0.1, 0.5), (0.1, 0.8, 1.0), (1.0, 0.55, 0.1), (0.5, 0.2, 1.0), (0.1, 1.0, 0.6)]
    rng.shuffle(pal)
    ramp.color_ramp.elements[0].color = (*pal[0], 1); ramp.color_ramp.elements[1].color = (*pal[1], 1)
    mid = ramp.color_ramp.elements.new(0.5); mid.color = (*pal[2], 1)
    L.new(wv.outputs["Fac"], ramp.inputs["Fac"])
    sl = N.new("ShaderNodeTexWave"); sl.wave_type = "BANDS"; sl.bands_direction = "Y"
    sl.inputs["Scale"].default_value = 120
    L.new(tc.outputs["UV"], sl.inputs["Vector"])
    scan = N.new("ShaderNodeMapRange"); scan.inputs["To Min"].default_value = 0.65
    L.new(sl.outputs["Fac"], scan.inputs["Value"])
    mm = N.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; mm.inputs[1].default_value = strength
    L.new(scan.outputs["Result"], mm.inputs[0])
    L.new(ramp.outputs["Color"], b.inputs["Emission Color"]); L.new(mm.outputs[0], b.inputs["Emission Strength"])
    b.inputs["Base Color"].default_value = (0, 0, 0, 1)
    o.data.materials.append(m)
    return o


def tower(name, x, y, z0, w, d, h, mat, rng, roof_mat, led=None, batch=None):
    """一栋楼：主体 + 0~2 级退台 + 楼顶设备，可选四角 LED 灯带和航标灯。batch 为 None 时单独成一个物体。"""
    own = batch is None
    B = W.Batch(name) if own else batch
    B.box((x, y, z0), (w, d, h), mat)
    top = z0 + h
    cw, cd = w, d
    for k in range(rng.choice([0, 0, 1, 1, 2])):
        cw *= rng.uniform(0.6, 0.85); cd *= rng.uniform(0.6, 0.85)
        hh = h * rng.uniform(0.08, 0.25)
        B.box((x + rng.uniform(-0.1, 0.1) * w, y + rng.uniform(-0.1, 0.1) * d, top), (cw, cd, hh), mat)
        top += hh
    for k in range(rng.randint(1, 4)):       # 楼顶机房、水箱
        bw, bd, bh = rng.uniform(2, 6), rng.uniform(2, 6), rng.uniform(1.5, 4)
        B.box((x + rng.uniform(-0.3, 0.3) * cw, y + rng.uniform(-0.3, 0.3) * cd, top), (bw, bd, bh), roof_mat)
    if rng.random() < 0.35:                  # 天线和航标灯
        ah = rng.uniform(6, 25)
        B.box((x, y, top), (0.5, 0.5, ah), roof_mat)
        B.box((x, y, top + ah), (0.9, 0.9, 0.7), W.flat((1, 0.04, 0.02), emit=60, name="beacon"))
    if led:
        for sx_ in (-1, 1):
            for sy_ in (-1, 1):
                B.box((x + sx_ * (w / 2 + 0.03), y + sy_ * (d / 2 + 0.03), z0), (0.12, 0.12, h),
                      W.flat(led, emit=7, name=f"led_{led}"))
    if own:
        B.flush()
    return top


def sky():
    """深蓝到地平线附近偏紫的夜空，地平线下方是城市灯光的暖色反照。"""
    w = bpy.data.worlds.new("night")
    bpy.context.scene.world = w
    w.use_nodes = True
    N, L = w.node_tree.nodes, w.node_tree.links
    N.clear()
    tc = N.new("ShaderNodeTexCoord")
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = N.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position = 0.40; e[0].color = (0.08, 0.035, 0.03, 1)
    e[1].position = 1.0; e[1].color = (0.002, 0.003, 0.012, 1)
    h = e.new(0.5); h.color = (0.06, 0.03, 0.07, 1)
    h2 = e.new(0.6); h2.color = (0.012, 0.012, 0.035, 1)
    # Generated 坐标的 z 分量在 world 里是 0..1（-1..1 映射过来）
    L.new(sep.outputs["Z"], ramp.inputs["Fac"])
    bg = N.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = 1.0
    L.new(ramp.outputs["Color"], bg.inputs["Color"])
    out = N.new("ShaderNodeOutputWorld"); L.new(bg.outputs[0], out.inputs[0])
    return w


def height_fog(center, size, density=0.02, falloff=25.0, z0=-40.0, color=(0.85, 0.8, 1.0)):
    """高度雾：密度 = density × exp(-(z - z0)/falloff)。"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.object
    o.name = "height_fog"
    o.scale = size
    m = bpy.data.materials.new("height_fog"); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    N.remove(N["Principled BSDF"])
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Position"], sep.inputs[0])
    a = N.new("ShaderNodeMath"); a.operation = "SUBTRACT"; a.inputs[1].default_value = z0
    L.new(sep.outputs["Z"], a.inputs[0])
    b = N.new("ShaderNodeMath"); b.operation = "MULTIPLY"; b.inputs[1].default_value = -1 / falloff
    L.new(a.outputs[0], b.inputs[0])
    e = N.new("ShaderNodeMath"); e.operation = "EXPONENT"; L.new(b.outputs[0], e.inputs[0])
    c = N.new("ShaderNodeMath"); c.operation = "MULTIPLY"; c.inputs[1].default_value = density
    L.new(e.outputs[0], c.inputs[0])
    v = N.new("ShaderNodeVolumePrincipled"); v.inputs["Color"].default_value = (*color, 1)
    v.inputs["Anisotropy"].default_value = 0.5
    L.new(c.outputs[0], v.inputs["Density"])
    L.new(v.outputs[0], N["Material Output"].inputs["Volume"])
    o.data.materials.append(m)
    o.visible_shadow = False
    return o


def build(seed=3, keep_clear=((-35, 15), (-60, 45)), street=-42.0, extent=900):
    """keep_clear：((x0,x1),(y0,y1)) 这片区域里不放楼（主场景的位置）。"""
    rng = random.Random(seed)
    sky()
    roof = W.flat((0.02, 0.02, 0.025), rough=0.7, name="tower_roof")
    mats = [facade(f"fac{i}", cell=c, density=d, seed=i, strength=s) for i, (c, d, s) in enumerate([
        ((1.6, 3.3), 0.30, 2.2), ((2.4, 3.6), 0.22, 2.6), ((1.2, 3.0), 0.35, 1.8), ((3.2, 4.0), 0.18, 3.0),
        ((1.8, 3.4), 0.42, 1.6)])]
    leds = [(0.1, 0.85, 1.0), (1.0, 0.1, 0.55), (0.6, 0.2, 1.0)]
    (cx0, cx1), (cy0, cy1) = keep_clear
    n = 0
    batch = W.Batch("city")
    for i in range(900):
        r = 55 + rng.random() ** 0.75 * extent
        a = rng.uniform(0, 2 * math.pi)
        x, y = r * math.cos(a), r * math.sin(a)
        w, d = rng.uniform(14, 36), rng.uniform(14, 36)
        if cx0 - w / 2 < x < cx1 + w / 2 and cy0 - d / 2 < y < cy1 + d / 2:
            continue
        if r < 200:
            h = rng.uniform(15, 40) - street * 0.0
        else:
            h = rng.uniform(35, 90) + rng.random() ** 2 * 260
        led = rng.choice(leds) if (rng.random() < 0.12 and h > 80) else None
        tower(f"t{i}", x, y, street, w, d, h, rng.choice(mats), rng, roof, led, batch=batch)
        n += 1
    batch.flush()
    # 街道层的暖色灯光，从下往上照亮雾
    for k in range(10):
        a = k / 10 * 2 * math.pi
        x, y = 140 * math.cos(a), 140 * math.sin(a)
        W.area(f"street{k}", (x, y, street + 2), (math.pi, 0, 0), 120, (1.0, 0.5, 0.22), 1.5e5)
    height_fog((0, 0, street + 100), (2400, 2400, 240), density=0.0035, falloff=45, z0=street)
    return n
