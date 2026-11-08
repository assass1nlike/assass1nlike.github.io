"""场景 A：夜晚霓虹楼顶。在 Blender 里 import 后调用 build()。

布局（米）：主楼顶 R1 的屋面在 z=0，x∈[-9,9]，y∈[-6,16]，角色大体朝 -Y 跑；
-Y 方向隔 4 米是邻楼 R2，屋面低 1.5 米；R1 上有楼梯间（可以蹬墙）、水塔、空调外机、广告牌。
四周是程序生成的高楼，窗户随机亮灯；街道在 z=-42。
"""
import math
import random

import bpy

import world as W

R1 = dict(x=(-9, 9), y=(-6, 16), z=0.0)
R2 = dict(x=(-30, 8), y=(-34, -10), z=-1.5)
STAIR = dict(x=(-2, 2), y=(7, 11), h=3.2)          # 楼梯间：Kai 站在顶上，从南沿 y=7 前空翻下来
STREET = -42.0


def windows_mat(name, lit=(1.0, 0.62, 0.3), wall=(0.012, 0.014, 0.02), seed=0, density=0.3, strength=1.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N, L = m.node_tree.nodes, m.node_tree.links
    b = N["Principled BSDF"]
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ"); L.new(geo.outputs["Position"], sep.inputs[0])
    add = N.new("ShaderNodeMath"); add.operation = "ADD"
    L.new(sep.outputs["X"], add.inputs[0]); L.new(sep.outputs["Y"], add.inputs[1])
    comb = N.new("ShaderNodeCombineXYZ")
    off = N.new("ShaderNodeMath"); off.operation = "MULTIPLY_ADD"; off.inputs[1].default_value = 1 / 3.0
    off.inputs[2].default_value = seed * 13.7
    zz = N.new("ShaderNodeMath"); zz.operation = "MULTIPLY"; zz.inputs[1].default_value = 1 / 3.3
    L.new(add.outputs[0], off.inputs[0]); L.new(off.outputs[0], comb.inputs["X"])
    L.new(sep.outputs["Z"], zz.inputs[0]); L.new(zz.outputs[0], comb.inputs["Y"])
    br = N.new("ShaderNodeTexBrick")
    br.offset = 0.0; br.squash = 1.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = 1.0; br.inputs["Row Height"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.22; br.inputs["Mortar Smooth"].default_value = 0.05
    br.inputs["Bias"].default_value = 1 - density * 2   # 越大越多暗窗
    br.inputs["Color1"].default_value = (*lit, 1); br.inputs["Color2"].default_value = (0, 0, 0, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    L.new(comb.outputs[0], br.inputs["Vector"])
    L.new(br.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = strength
    b.inputs["Base Color"].default_value = (*wall, 1)
    b.inputs["Roughness"].default_value = 0.25
    b.inputs["Metallic"].default_value = 0.6
    return m


def city(rng):
    mats = [windows_mat(f"win{i}", lit=c, seed=i, density=d) for i, (c, d) in enumerate(
        [((1.0, 0.62, 0.3), 0.3), ((0.55, 0.75, 1.0), 0.35), ((1.0, 0.85, 0.6), 0.2), ((0.9, 0.4, 1.0), 0.15), ((0.3, 0.9, 1.0), 0.25)])]
    for i in range(700):
        r = 60 + rng.random() ** 0.7 * 700
        a = rng.uniform(0, 2 * math.pi)
        x, y = r * math.cos(a), r * math.sin(a)
        if abs(x) < 35 and -55 < y < 45:
            continue
        w, d = rng.uniform(14, 34), rng.uniform(14, 34)
        # 近处的楼大多比主楼矮，远处才有摩天楼，这样能看见天际线
        if r < 220:     # 近处的楼顶都在主楼屋面以下
            h = rng.uniform(12, 40)
        else:
            h = rng.uniform(30, 80) + (rng.random() ** 2) * 240
        W.box(f"tower{i}", (x, y, STREET), (w, d, h), rng.choice(mats))
        if rng.random() < 0.25:    # 楼顶红色航标灯
            W.cyl(f"beacon{i}", (x, y, STREET + h + 1.5), 0.3, 0.6, W.flat((1, 0.05, 0.02), emit=40))


def build(seed=3):
    rng = random.Random(seed)
    W.world_hdri("shanghai_bund", strength=0.15, rot=40, bg_strength=0.35)
    roof = W.pbr("tarred_gravel", scale=0.5, tint=(0.55, 0.55, 0.6))
    conc = W.pbr("concrete_wall_008", scale=0.4, tint=(0.6, 0.62, 0.68))
    metal = W.pbr("rusty_metal_02", scale=0.5, tint=(0.5, 0.55, 0.6), metal=0.6)
    plate = W.pbr("metal_plate", scale=0.6, tint=(0.7, 0.72, 0.75), metal=0.8)
    # 两栋楼本体
    for name, R in (("R1", R1), ("R2", R2)):
        x0, x1 = R["x"]; y0, y1 = R["y"]; z = R["z"]
        W.box(name + "_body", ((x0 + x1) / 2, (y0 + y1) / 2, STREET), (x1 - x0, y1 - y0, z - STREET), windows_mat(name + "_win", seed=7, density=0.3))
        W.box(name + "_roof", ((x0 + x1) / 2, (y0 + y1) / 2, z - 0.05), (x1 - x0 - 0.02, y1 - y0 - 0.02, 0.06), roof)
        # 女儿墙（-Y 侧留出跳跃口，只做两段矮墙）
        t, ph = 0.3, 0.9
        W.box(name + "_pw", (x0 + t / 2, (y0 + y1) / 2, z), (t, y1 - y0, ph), conc, bevel=0.02)
        W.box(name + "_pe", (x1 - t / 2, (y0 + y1) / 2, z), (t, y1 - y0, ph), conc, bevel=0.02)
        W.box(name + "_pn", ((x0 + x1) / 2, y1 - t / 2, z), (x1 - x0, t, ph), conc, bevel=0.02)
        W.box(name + "_ps1", (x0 + 2.5, y0 + t / 2, z), (5, t, ph), conc, bevel=0.02)
        W.box(name + "_ps2", (x1 - 2.5, y0 + t / 2, z), (5, t, ph), conc, bevel=0.02)
        # 屋面边沿一圈的低矮压顶（跳跃口处）
        W.box(name + "_lip", ((x0 + x1) / 2, y0 + 0.15, z), (x1 - x0 - 10, 0.3, 0.12), conc, bevel=0.01)
    # 楼梯间
    sx0, sx1 = STAIR["x"]; sy0, sy1 = STAIR["y"]
    W.box("stair", ((sx0 + sx1) / 2, (sy0 + sy1) / 2, 0), (sx1 - sx0, sy1 - sy0, STAIR["h"]), conc, bevel=0.03)
    W.box("stair_door", (sx1 + 0.01, (sy0 + sy1) / 2, 0), (0.04, 1.0, 2.1), plate)
    W.box("stair_lamp", (sx1 + 0.08, (sy0 + sy1) / 2, 2.4), (0.12, 0.4, 0.12), W.flat((1, 0.7, 0.4), emit=30))
    W.box("stair_lip", ((sx0 + sx1) / 2, (sy0 + sy1) / 2, STAIR["h"] - 0.08), (sx1 - sx0 + 0.1, sy1 - sy0 + 0.1, 0.08), conc)
    bpy.ops.object.light_add(type="POINT", location=(sx1 + 0.5, (sy0 + sy1) / 2, 2.3))
    bpy.context.object.data.energy = 120; bpy.context.object.data.color = (1, 0.65, 0.35)
    # 水塔
    for k, (dx, dy) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
        W.box(f"tank_leg{k}", (5.5 + dx * 1.2, 9 + dy * 1.2, 0), (0.15, 0.15, 2.6), metal)
    W.cyl("tank", (5.5, 9, 2.6 + 1.5), 1.8, 3.0, W.pbr("rusty_metal_02", scale=0.4, tint=(0.45, 0.35, 0.3), metal=0.5, name="tankmat"), verts=40)
    # 空调外机
    for k, (x, y) in enumerate([(-6, -2), (-6, -0.6), (-7.5, 4), (5, 1), (6.4, 1), (5, -3.5), (-5, 12)]):
        W.box(f"ac{k}", (x, y, 0), (1.2, 0.8, 1.0), plate, bevel=0.03)
        W.cyl(f"acfan{k}", (x, y, 1.01), 0.32, 0.02, W.flat((0.05, 0.05, 0.06), rough=0.4), verts=20)
    # 广告牌：钢架 + 霓虹灯管
    W.box("bb_post1", (-6, 15.2, 0), (0.25, 0.25, 7), metal)
    W.box("bb_post2", (2, 15.2, 0), (0.25, 0.25, 7), metal)
    W.box("bb_panel", (-2, 15.3, 3.6), (9, 0.2, 3.6), W.flat((0.02, 0.02, 0.03), rough=0.4))
    W.tube("neon_frame", [(-6.3, 15.1, 3.7), (2.3, 15.1, 3.7), (2.3, 15.1, 7.1), (-6.3, 15.1, 7.1), (-6.3, 15.1, 3.7)], 0.04, (1.0, 0.1, 0.55), 60)
    zig = [(-5.5 + i * 0.75, 15.05, 4.6 + (1.2 if i % 2 else 0)) for i in range(11)]
    W.tube("neon_zig", zig, 0.035, (0.1, 0.85, 1.0), 70)
    W.area("bb_glow", (-2, 13.5, 5.2), (math.radians(90), 0, math.radians(180)), 8, (1.0, 0.3, 0.7), 1500)
    # 女儿墙上的霓虹灯条（-Y 侧边缘，标出起跳口）
    W.tube("edge_l", [(-9, -5.95, 0.92), (-4, -5.95, 0.92)], 0.025, (0.1, 0.85, 1.0), 50)
    W.tube("edge_r", [(4, -5.95, 0.92), (9, -5.95, 0.92)], 0.025, (1.0, 0.1, 0.55), 50)
    # 主光：冷色月光 + 品红/青色环境补光
    W.sun((50, 0, 200), 0.35, (0.55, 0.65, 1.0), angle=2)
    # 两侧低角度的霓虹色轮廓光（模拟周围广告牌的反光）
    W.area("rim_c", (-12, -8, 2.5), (math.radians(80), 0, math.radians(-55)), 6, (0.1, 0.7, 1.0), 900)
    W.area("rim_m", (12, -6, 2.0), (math.radians(80), 0, math.radians(55)), 6, (1.0, 0.15, 0.55), 900)
    city(rng)
    W.fog(0.0015, (0.7, 0.75, 1.0), size=1600, center=(0, 0, 0))
