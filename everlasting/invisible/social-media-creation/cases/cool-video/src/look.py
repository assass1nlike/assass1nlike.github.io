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
        if part == "body":
            o.data.materials.clear()
            o.data.materials.append(skin(c["skin"]))
            continue
        mat = o.material_slots[0].material if o.material_slots else None
        if mat is None:
            continue
        if any(part in cl for cl in c["clothes"]):
            i = [j for j, cl in enumerate(c["clothes"]) if part in cl][0]
            recolor(mat, c["colors"][i])
        elif c["hair"].startswith(part):
            recolor(mat, c["hair_color"], rough=0.45, sheen=0.6, detail=0.8)
        elif part.startswith("eyebrow") or part.startswith("eyelashes"):
            recolor(mat, c["hair_color"], rough=0.6, sheen=0.0, detail=0.3)
        if mat.blend_method != "OPAQUE" or part.startswith(("eyebrow", "eyelashes")) or c["hair"].startswith(part):
            mat.surface_render_method = "DITHERED"
