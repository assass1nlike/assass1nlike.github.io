"""故事里所有相对论数字的出处。单位：年、光年，c = 1。

用法：python physics.py   打印各个关键时刻的数字，并写出 data/physics.json 供画面里的仪表读数使用。
"""
import json
import math
from pathlib import Path

import numpy as np

G = 9.80665 * (365.25 * 86400) ** 2 / 9.4607e15   # 1 g 换算成 光年/年²，约 1.03
D = 470.0               # 地球到望舒
T_SIGNAL = 2287.0       # 地球收到望舒的信号
T_DEPART = 2301.0       # 夸父号出发
STAY = 1.0              # 在望舒停留（地球系）
V_ALIEN = 0.5           # 望舒飞船的速度
T_ALIEN_LAUNCH = T_SIGNAL - D   # 望舒在发信号的同时派出飞船


def leg(tau):
    """一次“前半程加速、后半程减速”的航行，给定已过的船时 tau，返回 (已飞距离, 已过地球时, 速度)。"""
    half = math.acosh(1 + G * D / 2) / G
    if tau <= half:
        r = G * tau
        return (math.cosh(r) - 1) / G, math.sinh(r) / G, math.tanh(r)
    x, t, _ = leg(half)
    r = G * (2 * half - tau)
    return 2 * x - (math.cosh(r) - 1) / G, 2 * t - math.sinh(r) / G, math.tanh(r)


HALF = math.acosh(1 + G * D / 2) / G
TAU_LEG = 2 * HALF
T_LEG = 2 * leg(HALF)[1]
T_ARRIVE = T_DEPART + T_LEG
T_LEAVE = T_ARRIVE + STAY
T_HOME = T_LEAVE + T_LEG


def solve(f, a, b):
    for _ in range(200):
        m = (a + b) / 2
        if f(a) * f(m) <= 0:
            b = m
        else:
            a = m
    return (a + b) / 2


def main():
    out = {}
    print(f"1 g = {G:.4f} 光年/年²")
    print(f"单程：船时 {TAU_LEG:.2f} 年，地球时 {T_LEG:.1f} 年；最大速度时 γ = {math.cosh(G * HALF):.1f}")
    for tau in (1, 2, 3, HALF):
        x, t, v = leg(tau)
        print(f"  船时 {tau:5.2f} 年：v = {v:.6f} c，已飞 {x:6.1f} 光年，地球过了 {t:6.1f} 年")
    print(f"抵达望舒：{T_ARRIVE:.0f} 年；离开：{T_LEAVE:.0f} 年；回到地球：{T_HOME:.0f} 年，共 {T_HOME - T_DEPART:.0f} 年，"
          f"船时 {2 * TAU_LEG:.1f} + 停留 {STAY:.0f} 年")

    # 去程收到的地球消息：抵达时收到的光发自 T_ARRIVE - D
    print(f"去程 {TAU_LEG:.1f} 年里收到的地球消息跨度：{T_ARRIVE - D - T_DEPART:.1f} 年")
    print(f"回程 {TAU_LEG:.1f} 年里收到的地球消息跨度：{T_HOME - (T_LEAVE - D):.0f} 年")

    # 与望舒飞船交会：x_human(t) = 470 - 0.5 (t - T_ALIEN_LAUNCH)
    def gap(tau):
        x, t, _ = leg(tau)
        return x - (D - V_ALIEN * (T_DEPART + t - T_ALIEN_LAUNCH))
    tau_meet = solve(gap, 0, HALF)
    x_m, t_m, v_m = leg(tau_meet)
    rap = math.atanh(v_m) + math.atanh(V_ALIEN)
    gam_rel = math.cosh(rap)
    beta_rel = math.tanh(rap)
    t_alien_earth = T_ALIEN_LAUNCH + D / V_ALIEN
    warn = 1.0 * (1 - beta_rel) * 365.25 * 24 * 60   # 1 光年外发出的信标比飞船早到多少分钟
    print(f"交会：船时 {tau_meet:.2f} 年，地球纪年 {T_DEPART + t_m:.0f}，距地球 {x_m:.0f} 光年；"
          f"夸父号 v = {v_m:.6f} c")
    print(f"  相对速度 {beta_rel:.7f} c，相对 γ = {gam_rel:.0f}；1 光年外的信标只比飞船早到 {warn:.1f} 分钟")
    print(f"望舒飞船到达地球：{t_alien_earth:.0f} 年")

    # 回程中什么时候看到望舒飞船抵达地球：地球在 t_e 发出的光，在船时 tau 被收到
    def seen(tau):
        x, t, _ = leg(tau)
        dist_from_earth = D - x
        return (T_LEAVE + t - dist_from_earth) - t_alien_earth
    tau_seen = solve(seen, 0, TAU_LEG)
    print(f"回程船时 {tau_seen:.2f} 年看到望舒飞船着陆的画面，那时地球纪年 {T_LEAVE + leg(tau_seen)[1]:.0f}")

    # 重逢：望舒船长与夸父号船员各自经历的时间
    alien_age = (t_alien_earth - (T_DEPART + t_m)) * math.sqrt(1 - V_ALIEN ** 2) + (T_HOME - t_alien_earth)
    human_age = (TAU_LEG - tau_meet) + STAY + TAU_LEG
    print(f"从交会到重逢：望舒船长经历 {alien_age:.0f} 年，夸父号船员经历 {human_age:.1f} 年")

    # 1 克反物质湮灭
    e = 2e-3 * 299792458 ** 2
    print(f"1 g 反物质 + 1 g 正物质湮灭：{e:.2e} J = {e / 4.184e12:.0f} 千吨 TNT（广岛原子弹约 15 千吨）")

    # 仪表读数：一次航程每 0.01 年船时一个采样
    taus = np.linspace(0, TAU_LEG, 1201)
    rows = [leg(t) for t in taus]
    out = {
        "g": G, "tau_leg": TAU_LEG, "t_leg": T_LEG, "half": HALF,
        "t_depart": T_DEPART, "t_arrive": T_ARRIVE, "t_leave": T_LEAVE, "t_home": T_HOME,
        "tau_meet": tau_meet, "t_meet": T_DEPART + t_m, "x_meet": x_m, "v_meet": v_m, "beta_rel": beta_rel, "gamma_rel": gam_rel,
        "d": D, "t_signal": T_SIGNAL, "v_alien": V_ALIEN, "t_alien_launch": T_ALIEN_LAUNCH, "t_alien_earth": t_alien_earth,
        "leg": {"tau": taus.round(4).tolist(), "x": [round(r[0], 4) for r in rows], "t": [round(r[1], 4) for r in rows],
                "v": [r[2] for r in rows]},
    }
    (Path(__file__).parent / "data" / "physics.json").write_text(json.dumps(out), encoding="utf-8")


if __name__ == "__main__":
    main()
