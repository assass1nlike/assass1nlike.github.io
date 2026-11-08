"""《晚星》里任务时间线的出处：地球、火星位置用 JPL 行星近似轨道根数（1800–2050 年适用）按开普勒方程计算。

用法：python physics.py   打印发射窗口、到达、合日、返航窗口、各时刻的通信延迟，并写出 data/mission.json。
转移轨道按霍曼转移近似：飞行时间取以出发时地球、到达时火星日心距为近、远日点的椭圆的半个周期。
"""
import json
import math
from datetime import date, timedelta
from pathlib import Path

AU_LIGHT_MIN = 499.004784 / 60          # 1 天文单位的光行时间（分钟）
J2000 = date(2000, 1, 1) + timedelta(hours=12)
# a, e, I, L, 近日点经度, 升交点经度 及其每世纪变化率（JPL Table 1）
ELEM = {
    "earth": ([1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
              [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]),
    "mars": ([1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
             [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]),
}


def pos(body, d):
    T = ((d - J2000).days) / 36525
    el, rate = ELEM[body]
    a, e, I, L, wbar, Om = (x + r * T for x, r in zip(el, rate))
    M = math.radians((L - wbar + 180) % 360 - 180)
    E = M
    for _ in range(30):
        E -= (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
    xp, yp = a * (math.cos(E) - e), a * math.sqrt(1 - e * e) * math.sin(E)
    w, Om, I = math.radians(wbar - Om), math.radians(Om), math.radians(I)
    x = (math.cos(w) * math.cos(Om) - math.sin(w) * math.sin(Om) * math.cos(I)) * xp + \
        (-math.sin(w) * math.cos(Om) - math.cos(w) * math.sin(Om) * math.cos(I)) * yp
    y = (math.cos(w) * math.sin(Om) + math.sin(w) * math.cos(Om) * math.cos(I)) * xp + \
        (-math.sin(w) * math.sin(Om) + math.cos(w) * math.cos(Om) * math.cos(I)) * yp
    return x, y


def lon(p):
    return math.degrees(math.atan2(p[1], p[0])) % 360


def dist(d):
    (x1, y1), (x2, y2) = pos("earth", d), pos("mars", d)
    return math.hypot(x2 - x1, y2 - y1)


def delay(d):
    return dist(d) * AU_LIGHT_MIN


def hohmann_days(r1, r2):
    a = (r1 + r2) / 2
    return 365.25 * a ** 1.5 / 2


def lead(d):
    """火星领先地球的日心经度（度，-180~180）。"""
    return (lon(pos("mars", d)) - lon(pos("earth", d)) + 180) % 360 - 180


def sun_angle(d):
    """从火星看，地球与太阳的角距（度）；正值表示地球在太阳东边，日落后出现在西方天空，是“晚星”。"""
    m, e = pos("mars", d), pos("earth", d)
    to_sun = math.atan2(-m[1], -m[0])
    to_earth = math.atan2(e[1] - m[1], e[0] - m[0])
    return math.degrees((to_earth - to_sun + math.pi) % (2 * math.pi) - math.pi)


def scan(d0, days, f):
    return [(d0 + timedelta(i), f(d0 + timedelta(i))) for i in range(days)]


def main():
    # 发射：选一个出发日，使霍曼转移到达时正好碰上火星
    best = None
    for d, _ in scan(date(2032, 6, 1), 700, lambda d: 0):
        r1 = math.hypot(*pos("earth", d))
        for _ in range(3):
            tof = hohmann_days(r1, math.hypot(*pos("mars", d + timedelta(days=round(hohmann_days(r1, 1.52))))))
        arr = d + timedelta(days=round(tof))
        miss = abs((lon(pos("mars", arr)) - (lon(pos("earth", d)) + 180)) % 360)
        miss = min(miss, 360 - miss)
        if best is None or miss < best[0]:
            best = (miss, d, arr, tof)
    _, launch, arrive, tof = best
    print(f"发射 {launch}，飞行 {tof:.0f} 天，到达 {arrive}（转移角误差 {best[0]:.1f}°）")
    print(f"  发射时通信延迟 {delay(launch) * 60:.1f} 秒；到达时 {delay(arrive):.1f} 分钟")
    # 合日：从地球看火星最靠近太阳（日心经度差 180°）
    conj = min(scan(arrive, 900, lambda d: abs(abs(lead(d)) - 180)), key=lambda x: x[1])[0]
    print(f"合日 {conj}（到达后第 {(conj - arrive).days} 天），延迟 {delay(conj):.1f} 分钟")
    # 返航：从火星出发、霍曼转移回地球，要求出发时地球领先火星约 75°
    ret = None
    for d, _ in scan(conj, 900, lambda d: 0):
        r1 = math.hypot(*pos("mars", d))
        tof2 = hohmann_days(r1, 1.0)
        back = d + timedelta(days=round(tof2))
        miss = abs((lon(pos("earth", back)) - (lon(pos("mars", d)) + 180)) % 360)
        miss = min(miss, 360 - miss)
        if ret is None or miss < ret[0]:
            ret = (miss, d, back, tof2)
    _, leave, home, tof2 = ret
    print(f"返航 {leave}（在火星停留 {(leave - arrive).days} 天），飞行 {tof2:.0f} 天，回到地球 {home}")
    print(f"整个任务 {(home - launch).days} 天")
    # 晚星：到达后哪些日子，地球在火星的黄昏天空里
    eve = [(d, a) for d, a in scan(arrive, (leave - arrive).days, sun_angle)]
    runs, cur = [], None
    for d, a in eve:
        ok = a > 15
        if ok and cur is None:
            cur = d
        if not ok and cur is not None:
            runs.append((cur, d)); cur = None
    if cur:
        runs.append((cur, leave))
    for a, b in runs:
        print(f"地球是火星的晚星（日落后在西方天空，离太阳 >15°）：{a} → {b}")
    for d in (arrive, conj, leave):
        print(f"  {d}：地球离太阳 {sun_angle(d):+.0f}°，距离 {dist(d):.2f} AU，延迟 {delay(d):.1f} 分钟")
    out = {"launch": str(launch), "arrive": str(arrive), "conj": str(conj), "leave": str(leave), "home": str(home),
           "tof": round(tof), "tof_back": round(tof2), "delay_arrive": delay(arrive), "delay_conj": delay(conj),
           "evening": [[str(a), str(b)] for a, b in runs]}
    (Path(__file__).parent / "data" / "mission.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
