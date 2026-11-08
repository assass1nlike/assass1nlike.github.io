"""场景 A：雨后夜晚的霓虹楼顶。在 Blender 里 import 后调用 build()。

布局（米）：主楼 R1 屋面 z=0，x∈[-9,9]，y∈[-6,16]；角色沿 x≈0 朝 -Y 跑，这条通道上不放东西。
-Y 方向隔 4 米是邻楼 R2，屋面低 1.5 米。R1 北侧的楼梯间顶（z=3.2）是 Kai 的起点。
"""
import math
import random

import world as W
import props as PR
import city
from layout import R2_X, R2_Z

R1 = dict(x=(-9, 9), y=(-6, 16), z=0.0)
R2 = dict(x=R2_X, y=(-34, -10), z=R2_Z)
STAIR = dict(x=(-2, 2), y=(7, 11), h=3.2)
STREET = -42.0

CYAN, MAGENTA, AMBER = (0.1, 0.8, 1.0), (1.0, 0.1, 0.5), (1.0, 0.55, 0.2)


def building(name, R):
    x0, x1 = R["x"]; y0, y1 = R["y"]; z = R["z"]
    W.box(name + "_body", ((x0 + x1) / 2, (y0 + y1) / 2, STREET), (x1 - x0, y1 - y0, z - STREET - 0.05),
          city.facade(name + "_fac", cell=(1.8, 3.2), density=0.28, seed=11 if name == "R1" else 17, strength=1.8))
    roof = PR.wet(W.pbr("tarred_gravel", scale=0.5, tint=(0.42, 0.42, 0.46), name=name + "_roofmat"), coverage=0.5)
    W.box(name + "_roof", ((x0 + x1) / 2, (y0 + y1) / 2, z - 0.06), (x1 - x0, y1 - y0, 0.06), roof)
    conc = W.pbr("concrete_wall_008", scale=0.4, tint=(0.5, 0.5, 0.55), name="parapet")
    cap = W.flat((0.25, 0.26, 0.28), rough=0.3, metal=0.9, name="coping")
    t, ph = 0.3, 0.95
    segs = [("w", (x0 + t / 2, (y0 + y1) / 2), (t, y1 - y0)), ("e", (x1 - t / 2, (y0 + y1) / 2), (t, y1 - y0))]
    if name == "R1":       # 南侧中间留出 8 米宽的起跳口
        segs += [("n", ((x0 + x1) / 2, y1 - t / 2), (x1 - x0, t)),
                 ("s1", (x0 + 2.5, y0 + t / 2), (5, t)), ("s2", (x1 - 2.5, y0 + t / 2), (5, t))]
        W.box("R1_lip", (0, y0 + 0.15, z), (8, 0.3, 0.12), conc)
    else:                  # R2 北侧（迎着 Kai 的落点）只留矮压顶；西侧 y∈[-22.4,-16.2] 留出纵身跃下的缺口
        gy0, gy1 = -22.4, -16.2
        segs = [("e", (x1 - t / 2, (y0 + y1) / 2), (t, y1 - y0)), ("s", ((x0 + x1) / 2, y0 + t / 2), (x1 - x0, t)),
                ("w1", (x0 + t / 2, (gy1 + y1) / 2), (t, y1 - gy1)), ("w2", (x0 + t / 2, (y0 + gy0) / 2), (t, gy0 - y0))]
        W.box("R2_lipw", (x0 + 0.15, (gy0 + gy1) / 2, z), (0.3, gy1 - gy0, 0.12), conc)
        W.box("R2_lipn", ((x0 + x1) / 2, y1 - 0.15, z), (x1 - x0, 0.3, 0.12), conc)
    for k, (cx, cy), (sx, sy) in segs:
        W.box(f"{name}_p{k}", (cx, cy, z), (sx, sy, ph), conc)
        W.box(f"{name}_c{k}", (cx, cy, z + ph), (sx + 0.06, sy + 0.06, 0.05), cap)


def dress_r1():
    z = 0.0
    conc = W.pbr("concrete_wall_008", scale=0.4, tint=(0.55, 0.55, 0.6), name="stairconc")
    plate = W.pbr("metal_plate", scale=0.6, tint=(0.6, 0.62, 0.66), metal=0.8)
    rust = W.pbr("rusty_metal_02", scale=0.4, tint=(0.45, 0.36, 0.3), metal=0.5, name="tankmat")
    # 楼梯间
    sx0, sx1 = STAIR["x"]; sy0, sy1 = STAIR["y"]; h = STAIR["h"]
    W.box("stair", ((sx0 + sx1) / 2, (sy0 + sy1) / 2, z), (sx1 - sx0, sy1 - sy0, h - 0.08), conc)
    W.box("stair_top", ((sx0 + sx1) / 2, (sy0 + sy1) / 2, h - 0.08), (sx1 - sx0 + 0.12, sy1 - sy0 + 0.12, 0.08),
          PR.wet(W.pbr("concrete_floor_worn_001", scale=0.6, tint=(0.5, 0.5, 0.55), name="stairtop"), coverage=0.55))
    PR.place(PR.asset("rollershutter_door"), (sx1 + 0.02, (sy0 + sy1) / 2 - 1.0, z), rz=90, scale=0.8)
    PR.place(PR.asset("industrial_wall_lamp"), (sx1 + 0.1, (sy0 + sy1) / 2 + 0.6, 2.5), rz=90)
    PR.point((sx1 + 0.45, (sy0 + sy1) / 2 + 0.6, 2.35), AMBER, 60, 0.05)
    PR.place(PR.asset("security_light"), (sx0 + 0.25, sy0 - 0.05, h - 0.5), rz=180)
    PR.spot((sx0 + 0.25, sy0 - 0.4, h - 0.6), (55, 0, 180), (0.85, 0.92, 1.0), 900, angle=70, blend=0.6)
    for x in (sx0 + 0.4, sx0 + 0.75):
        PR.place(PR.asset("modular_industrial_pipes_01", "modular_industrial_pipes_01_pipe02"), (x, sy1 + 0.12, 0.3))
    PR.place(PR.asset("utility_box_02"), (sx0 + 0.8, sy0 - 0.25, z), rz=180)
    PR.place(PR.asset("power_box_01"), (sx1 - 0.6, sy0 - 0.2, 1.6), rz=180)
    # 水塔
    for k, (dx, dy) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
        W.box(f"tank_leg{k}", (5.5 + dx * 1.2, 10 + dy * 1.2, 0), (0.15, 0.15, 2.6), rust)
    W.cyl("tank", (5.5, 10, 2.6 + 1.5), 1.8, 3.0, rust, verts=48)
    W.cyl("tank_cap", (5.5, 10, 2.6 + 3.1), 1.9, 0.2, rust, verts=48)
    # 东侧空调外机群
    for k, y in enumerate([-4.6, -3.6, -2.6, -0.4, 0.6, 1.6, 3.8, 4.8]):
        PR.place(PR.asset("exterior_aircon_unit", "exterior_aircon_unit" if k % 3 else "exterior_aircon_unit_rusted"),
                 (8.35, y, z), rz=90)
    for x, y in [(5.2, -3.0), (5.2, -1.6), (6.4, -3.0)]:
        PR.place(PR.asset("exterior_aircon_unit", "exterior_aircon_unit"), (x, y, z))
    PR.steam("steam1", (6.0, -0.6, 0.6), radius=0.35, height=7, density=1.5, color=(1, 0.9, 0.95))
    # 西侧风管
    duct = PR.asset("modular_airduct_rectangular_01", "modular_airduct_rectangular_01_single_01")
    for k in range(26):
        PR.place(duct, (-6.6, -4.5 + k * 0.6, 0.55))
        if k % 4 == 0:
            W.box(f"duct_leg{k}", (-6.6, -4.5 + k * 0.6, 0), (0.6, 0.08, 0.55), plate)
    PR.place(PR.asset("modular_airduct_rectangular_01", "modular_airduct_rectangular_01_vent_01"), (-6.6, 2.3, 0.6), rz=90)
    PR.steam("steam2", (-6.0, 2.3, 0.9), radius=0.25, height=5, density=1.0, color=(0.9, 0.95, 1.0))
    # 杂物
    for m, part, x, y, r in [
            ("barrel_03", None, 3.9, 8.6, 10), ("barrel_03", None, 4.3, 7.9, 70), ("Barrel_01", None, 3.3, 8.1, 0),
            ("wooden_crate_01", None, -4.5, 13.5, 20), ("plastic_crate_01", None, -3.9, 13.9, 5),
            ("trashbag", None, -8.2, 6.0, 0), ("trashbag", None, -8.0, 6.6, 50), ("old_tyre", None, 4.2, -4.8, 0),
            ("propane_tank", None, 7.2, 2.6, 0), ("propane_tank", None, 7.5, 2.9, 0), ("utility_box_01", None, -8.4, 9.0, 90),
            ("worn_metal_rack", None, -8.2, 12.0, 90), ("concrete_road_barrier", None, -4.5, -4.8, 15),
            ("metal_trash_can", "metal_trash_can_rust", 7.6, 13.2, 30), ("cardboard_box_01", None, 3.6, 7.2, 30)]:
        PR.place(PR.asset(m, part), (x, y, z), rz=r)
    # 铁丝网围住空调区
    fence = PR.asset("modular_chainlink_fence", "modular_chainlink_fence_double")
    post = PR.asset("modular_chainlink_fence", "modular_chainlink_fence_post")
    for k in range(3):
        PR.place(fence, (4.4, -4.6 + 1.9 * k + 0.95, z), rz=90)
        PR.place(post, (4.4, -4.6 + 1.9 * k, z))
    PR.place(post, (4.4, -4.6 + 1.9 * 3, z))
    # 北侧广告牌
    metal = W.pbr("rusty_metal_02", scale=0.5, tint=(0.4, 0.42, 0.45), metal=0.6)
    W.box("bb_post1", (-6, 15.2, 0), (0.25, 0.25, 8), metal)
    W.box("bb_post2", (2, 15.2, 0), (0.25, 0.25, 8), metal)
    city.ad_screen("bb_screen", (-2, 15.1, 5.6), 180, (9, 4.4), seed=4, strength=4.5)
    W.area("bb_glow", (-2, 13.2, 5.6), (math.radians(90), 0, 0), 8, MAGENTA, 1200)
    # 女儿墙上的霓虹灯条（标出起跳口两侧）
    W.tube("edge_l", [(-9, -5.85, 1.02), (-4, -5.85, 1.02)], 0.025, CYAN, 60)
    W.tube("edge_r", [(4, -5.85, 1.02), (9, -5.85, 1.02)], 0.025, MAGENTA, 60)
    W.tube("edge_w", [(-8.85, -6, 1.02), (-8.85, 16, 1.02)], 0.02, CYAN, 40)
    # 南立面消防梯、跨楼电线
    PR.place(PR.asset("modular_fire_escape"), (-6.5, -6.75, -4.5), rz=180)
    for k in range(5):
        PR.cable(f"wire{k}", (-3 + k * 1.6, -6.0, 1.6 + 0.4 * k), (-4 + k * 2.1, -10.0, 0.4 + 0.3 * k), sag=0.5 + 0.1 * k)


def dress_r2(marks):
    z = R2["z"]
    conc = W.pbr("concrete_wall_008", scale=0.4, tint=(0.5, 0.5, 0.55), name="r2conc")
    for k, x in enumerate([-8, -6.4, -4.8]):
        PR.place(PR.asset("exterior_aircon_unit", "exterior_aircon_unit_rusted" if k == 1 else "exterior_aircon_unit"),
                 (x, -12.0, z), rz=180)
    # Kai 蹬墙后空翻的机房外墙（北面就是蹬墙的墙面）
    wy = marks["wall_y"]
    W.box("r2_block", (0.5, wy - 2.0, z), (6, 4, 3.6), conc)
    W.box("r2_block_cap", (0.5, wy - 2.0, z + 3.6), (6.1, 4.1, 0.1), W.flat((0.25, 0.26, 0.28), rough=0.3, metal=0.9, name="coping"))
    PR.place(PR.asset("industrial_wall_lamp"), (2.6, wy + 0.08, z + 2.7))
    PR.point((2.6, wy + 0.45, z + 2.6), AMBER, 80, 0.05)
    PR.place(PR.asset("power_box_01"), (-1.6, wy + 0.2, z + 1.4))
    W.tube("blk_neon", [(-2.45, wy + 0.03, z + 3.4), (3.45, wy + 0.03, z + 3.4)], 0.025, CYAN, 50)
    # Kai 前空翻转体越过的空调外机
    tx, ty = marks["twist_xy"]
    PR.place(PR.asset("exterior_aircon_unit", "exterior_aircon_unit_rusted"), (tx + 0.2, ty, z), rz=90)
    PR.place(PR.asset("exterior_aircon_unit", "exterior_aircon_unit"), (tx + 0.2, ty + 0.85, z), rz=90)
    PR.place(PR.asset("exterior_aircon_unit", "exterior_aircon_unit"), (tx + 0.2, ty - 0.85, z), rz=90)
    # 西侧缺口两边的霓虹
    W.tube("r2_edge_a", [(R2_X[0] + 0.05, -16.2, z + 1.02), (R2_X[0] + 0.05, -10, z + 1.02)], 0.025, MAGENTA, 60)
    W.tube("r2_edge_b", [(R2_X[0] + 0.05, -34, z + 1.02), (R2_X[0] + 0.05, -22.4, z + 1.02)], 0.025, MAGENTA, 60)
    PR.steam("steam3", (5.5, -18, z + 0.4), radius=0.4, height=6, density=1.2, color=(1, 0.92, 0.95))
    for m, part, x, y, r in [
            ("barrel_03", None, 6.0, -14, 0), ("wooden_crate_01", None, -10, -14.5, 40), ("trashbag", None, -9.5, -15.3, 0),
            ("utility_box_02", None, 7.2, -24, 90), ("old_tyre", None, -4, -27, 0), ("concrete_road_barrier", None, 3, -28, 80)]:
        PR.place(PR.asset(m, part), (x, y, z), rz=r)
    duct = PR.asset("modular_airduct_rectangular_01", "modular_airduct_rectangular_01_single_01")
    for k in range(20):
        PR.place(duct, (-12 + k * 0.6, -31.5, z + 0.5), rz=90)


def neighbors(rng):
    """紧挨着主场景的几栋高楼：给镜头提供近景楼体、霓虹招牌和广告屏。"""
    fac = city.facade("near_fac", cell=(1.6, 3.2), density=0.3, seed=23, strength=2.0)
    fac2 = city.facade("near_fac2", cell=(2.8, 3.6), density=0.22, seed=29, strength=2.4)
    roof = W.flat((0.02, 0.02, 0.025), rough=0.7, name="tower_roof")
    city.tower("nb_e", 36, -2, STREET, 26, 30, 110, fac, rng, roof)
    city.tower("nb_w", -50, 6, STREET, 22, 26, 85, fac2, rng, roof, led=CYAN)
    city.tower("nb_s", 4, -78, STREET, 34, 26, 140, fac2, rng, roof, led=MAGENTA)
    city.tower("nb_n", -6, 52, STREET, 30, 24, 70, fac, rng, roof)
    city.tower("nb_se", 40, -55, STREET, 22, 22, 95, fac, rng, roof)
    city.neon_sign("sign_e", "夜行", (22.8, -8, 10), 90, 9, MAGENTA, strength=30)
    city.neon_sign("sign_e2", "24H拉面", (22.8, 6, 2), 90, 2.2, AMBER, strength=25, vertical=False)
    city.neon_sign("sign_w", "极速", (-38.8, 0, 14), -90, 8, CYAN, strength=30)
    city.ad_screen("ad_s", (4, -64.8, 30), 0, (24, 13), seed=1, strength=5)
    city.ad_screen("ad_e", (22.9, -24, 26), 90, (14, 20), seed=2, strength=4)


def build(seed=3, marks=None):
    rng = random.Random(seed)
    building("R1", R1)
    building("R2", R2)
    dress_r1()
    dress_r2(marks)
    neighbors(rng)
    city.build(seed=seed, keep_clear=((-65, 50), (-95, 65)), street=STREET)
    W.sun((52, 0, 200), 0.25, (0.55, 0.65, 1.0), angle=1.5)      # 很弱的冷色月光
    W.fog(0.0025, (0.75, 0.75, 0.9), size=220, center=(0, -10, 0))
