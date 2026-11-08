"""角色材质：把 MakeHuman 素材的贴图换成卡通化的纯色（保留贴图的明暗细节和法线），皮肤用带次表面散射的材质。"""
import bpy
import numpy as np


def _lum_mean(img):
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    a = px[:, 3] > 0.5
    lum = px[a, :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32) if a.any() else np.array([0.5])
    return float(max(lum.mean(), 0.05))


def recolor(mat, color, rough=0.75, sheen=0.35, detail=0.6):
    """底色 = color × (1 - detail + detail × 贴图亮度/平均亮度)：衣服褶皱、缝线还在，但颜色统一成角色的主色。"""
    nt = mat.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N["Principled BSDF"]
    tex = N.get("diffuseTexture")
    bw = N.new("ShaderNodeRGBToBW")
    mr = N.new("ShaderNodeMath"); mr.operation = "MULTIPLY_ADD"
    m = _lum_mean(tex.image) if tex and tex.image else 0.5
    mr.inputs[1].default_value = detail / m
    mr.inputs[2].default_value = 1.0 - detail
    mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs["A"].default_value = (*color, 1.0)
    if tex:
        L.new(tex.outputs["Color"], bw.inputs["Color"])
        L.new(bw.outputs["Val"], mr.inputs[0])
        L.new(mr.outputs["Value"], mix.inputs["B"])
    else:
        mix.inputs["B"].default_value = (1, 1, 1, 1)
    L.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Sheen Weight"].default_value = sheen
    bsdf.inputs["Sheen Tint"].default_value = (*color, 1.0)
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.3


def skin(color):
    m = bpy.data.materials.new("skin")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = 0.5
    b.inputs["Subsurface Weight"].default_value = 0.25
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.02
    b.inputs["Coat Weight"].default_value = 0.08
    return m


def apply(name, c):
    for o in bpy.data.objects:
        if not o.name.startswith(name + ".") or o.type != "MESH":
            continue
        part = o.name[len(name) + 1:]
        if part in ("body", "high-poly"):      # 皮肤和眼睛用 MPFB 自带的次表面散射皮肤、程序化眼球
            continue
        mat = o.material_slots[0].material if o.material_slots else None
        if mat is None:
            continue
        if any(part in cl for cl in c["clothes"]):
            i = [j for j, cl in enumerate(c["clothes"]) if part in cl][0]
            recolor(mat, c["colors"][i], rough=0.82, sheen=0.5, detail=0.75)
            # 衣服沿法线外扩几毫米，避免大幅度动作时身体从衣服里穿出来；鞋子贴脚不需要
            if "shoe" not in part and "sneaker" not in part:
                d = o.modifiers.new("inflate", "DISPLACE")
                d.strength = 0.007 if i == 0 else 0.005; d.mid_level = 0.0
                o.modifiers.move(o.modifiers.find("inflate"), 1)   # 放在骨骼变形之后、细分之前
        elif c["hair"].startswith(part):
            recolor(mat, c["hair_color"], rough=0.45, sheen=0.6, detail=0.8)
        elif part.startswith("eyebrow") or part.startswith("eyelashes"):
            recolor(mat, c["hair_color"], rough=0.6, sheen=0.0, detail=0.3)
        if mat.blend_method != "OPAQUE" or part.startswith(("eyebrow", "eyelashes")) or c["hair"].startswith(part):
            mat.surface_render_method = "DITHERED"


def toon(name, outline=0.006, steps=(0.18, 0.55), rim=0.6):
    """卡通渲染：漫反射光照量化成三档明暗 + 边缘光，外加反向外壳描边。"""
    ink = bpy.data.materials.get("ink")
    if ink is None:
        ink = bpy.data.materials.new("ink"); ink.use_nodes = True
        b = ink.node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = (0.01, 0.01, 0.015, 1); b.inputs["Roughness"].default_value = 1
        ink.use_backface_culling = True
    for o in bpy.data.objects:
        if not o.name.startswith(name + ".") or o.type != "MESH" or not o.material_slots:
            continue
        for slot in o.material_slots:
            m = slot.material
            if m is None or m.get("toon"):
                continue
            m["toon"] = 1
            N, L = m.node_tree.nodes, m.node_tree.links
            b = N.get("Principled BSDF")
            if b is None:
                continue
            base = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].links else None
            dif = N.new("ShaderNodeBsdfDiffuse")
            if base:
                L.new(base, dif.inputs["Color"])
            else:
                dif.inputs["Color"].default_value = b.inputs["Base Color"].default_value
            # 只量化光照强度：用白色漫反射算明暗，再乘回底色
            white = N.new("ShaderNodeBsdfDiffuse"); white.inputs["Color"].default_value = (1, 1, 1, 1)
            s2r = N.new("ShaderNodeShaderToRGB"); L.new(white.outputs[0], s2r.inputs[0])
            bw = N.new("ShaderNodeRGBToBW"); L.new(s2r.outputs["Color"], bw.inputs[0])
            ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
            e = ramp.color_ramp.elements
            e[0].position = 0.0; e[0].color = (0.22, 0.2, 0.3, 1)
            e[1].position = steps[0]; e[1].color = (0.62, 0.6, 0.65, 1)
            e3 = e.new(steps[1]); e3.color = (1.0, 1.0, 1.0, 1)
            L.new(bw.outputs[0], ramp.inputs[0])
            mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"
            mul.inputs["Factor"].default_value = 1
            L.new(ramp.outputs["Color"], mul.inputs["A"])
            if base:
                L.new(base, mul.inputs["B"])
            else:
                mul.inputs["B"].default_value = b.inputs["Base Color"].default_value
            lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
            rr = N.new("ShaderNodeMath"); rr.operation = "GREATER_THAN"; rr.inputs[1].default_value = 0.6
            L.new(lw.outputs["Facing"], rr.inputs[0])
            rimc = N.new("ShaderNodeMix"); rimc.data_type = "RGBA"; rimc.blend_type = "ADD"
            L.new(rr.outputs[0], rimc.inputs["Factor"]); L.new(mul.outputs["Result"], rimc.inputs["A"])
            rimc.inputs["B"].default_value = (rim, rim, rim, 1)
            em = N.new("ShaderNodeEmission"); L.new(rimc.outputs["Result"], em.inputs["Color"])
            out = N["Material Output"]
            alpha = b.inputs["Alpha"].links[0].from_socket if b.inputs["Alpha"].links else None
            if alpha:
                tr = N.new("ShaderNodeBsdfTransparent"); mx = N.new("ShaderNodeMixShader")
                L.new(alpha, mx.inputs[0]); L.new(tr.outputs[0], mx.inputs[1]); L.new(em.outputs[0], mx.inputs[2])
                L.new(mx.outputs[0], out.inputs["Surface"])
            else:
                L.new(em.outputs[0], out.inputs["Surface"])
        part = o.name[len(name) + 1:]
        if outline and not part.startswith(("eyebrow", "eyelashes", "high-poly")):
            o.data.materials.append(ink)
            sol = o.modifiers.new("outline", "SOLIDIFY")
            sol.thickness = -outline if part != "body" else -outline * 0.8
            sol.use_flip_normals = True
            sol.material_offset = len(o.material_slots) - 1
            sol.use_rim = False
