"""Scheibehenne, Greifeneder & Todd (2010) 元分析的 63 个数据点，结果写到 meta.json 供画面使用。

数据逐条抄自论文 Table 1（作者、年份、效应量 d、方差 s2、小/大选项数、样本量）。
d > 0 表示“选项多反而更糟”（选择过载），d < 0 表示“选项多更好”；标注“0b”的按论文记为 0。
脚本用 DerSimonian-Laird 随机效应模型重算均值，检验抄录是否正确
（论文报告 D = 0.02，95% CI −0.09～0.12，tau2 = 0.12，Q(62) = 192）。
s2 在表里只保留两位小数，所以重算结果只会近似一致。
"""
import json
from pathlib import Path

import numpy as np

# (作者, 年份, d, s2, 小选项数, 大选项数, 样本量, 选的东西)
ROWS = [
    ("Alleman et al.", 2007, -.24, .08, "6", "24", 52, "Monetary gambles"),
    ("Berger, Draganska, and Simonson", 2007, -.52, .05, "13", "30", 90, "Chocolates"),
    ("Chernev", 2003, -.36, .09, "4", "16", 45, "Chocolates"),
    ("Chernev", 2003, .72, .09, "4", "16", 43, "Chocolates"),
    ("Chernev", 2003, -.33, .12, "4", "16", 34, "Chocolates"),
    ("Chernev", 2003, .57, .10, "4", "16", 41, "Chocolates"),
    ("Chernev", 2003, -.28, .05, "6", "24", 81, "Various products"),
    ("Chernev", 2003, .47, .05, "6", "24", 86, "Various products"),
    ("Diehl and Poynor", 2007, .54, .06, "60", "300", 65, "Wallpapers"),
    ("Diehl and Poynor", 2007, .32, .02, "8", "32", 165, "Camcorders"),
    ("Effron and Lepper", 2007, -.48, .26, "10", "15", 16, "Jelly beans"),
    ("Fasolo, Carmeci, and Misuraca", 2009, .06, .06, "6", "24", 64, "Mobile phones"),
    ("Fasolo, Carmeci, and Misuraca", 2009, -.26, .03, "6", "24", 120, "Mobile phones"),
    ("Gao and Simonson", 2008, -.67, .09, "10", "50", 43, "Jelly beans"),
    ("Gao and Simonson", 2008, .22, .09, "10", "50", 43, "Jelly beans"),
    ("Gingras", 2003, -.60, .05, "10", "30", 89, "Food dishes"),
    ("Gingras", 2003, 0.0, .07, "6", "24", 30, "Vacation packages"),
    ("Gingras", 2003, 0.0, .07, "6", "24", 31, "Vacation packages"),
    ("Gingras", 2003, 0.0, .07, "5", "21", 61, "Candy bars"),
    ("Gingras", 2003, .52, .06, "6", "30", 69, "Chocolates"),
    ("Greifeneder", 2008, -.20, .05, "6", "30", 80, "Chocolates"),
    ("Greifeneder, Scheibehenne, and Kleber", 2010, -.12, .10, "6", "30", 80, "Pencils"),
    ("Greifeneder, Scheibehenne, and Kleber", 2010, .81, .11, "6", "30", 80, "Pencils"),
    ("Greifeneder, Scheibehenne, and Kleber", 2010, -.28, .08, "6", "30", 52, "mp3 player"),
    ("Greifeneder, Scheibehenne, and Kleber", 2010, .54, .08, "6", "30", 52, "mp3 player"),
    ("Haynes", 2009, .48, .06, "3", "10", 69, "Various products"),
    ("Haynes and Olson", 2007, -.05, .06, "5", "20", 72, "Various products"),
    ("Inbar et al.", 2008, .08, .19, "6", "30", 21, "Chocolates"),
    ("Inbar et al.", 2008, 1.21, .23, "6", "30", 21, "Chocolates"),
    ("Inbar et al.", 2008, -.12, .07, "6", "30", 56, "Chocolates"),
    ("Iyengar and Lepper", 2000, .88, .06, "6", "30", 67, "Chocolates"),
    ("Iyengar and Lepper", 2000, .77, .02, "6", "24", 249, "Jam"),
    ("Kahn and Wansink", 2004, 0.0, .22, "6", "24", 18, "Jelly beans"),
    ("Kahn and Wansink", 2004, -1.89, .32, "6", "24", 18, "Jelly beans"),
    ("Kahn and Wansink", 2004, 0.0, .09, "6", "24", 46, "Jelly beans"),
    ("Kahn and Wansink", 2004, -.94, .10, "6", "24", 46, "Jelly beans"),
    ("Kahn and Wansink", 2004, 0.0, .07, "6", "24", 54, "Jelly beans"),
    ("Kahn and Wansink", 2004, -.82, .08, "6", "24", 54, "Jelly beans"),
    ("Kilchherr, Wanke, and Messner", 2008, -.02, .10, "12", "72", 40, "Sundaes"),
    ("Kleinschmidt", 2008, -.17, .07, "3", "12", 60, "Chocolates"),
    ("Kleinschmidt", 2008, .05, .07, "6", "24", 61, "Chocolates"),
    ("Lenton, Fasolo, and Todd", 2008, -.09, .04, "4", "20", 89, "Dating partner"),
    ("Lenton and Stewart", 2007, .04, .06, "4", "64", 68, "Dating partner"),
    ("Lin and Wu", 2006, .08, .05, "6", "16", 82, "Chocolates"),
    ("Mogilner, Rudnick, and Iyengar", 2008, .64, .09, "5", "50", 60, "Coffee"),
    ("Mogilner, Rudnick, and Iyengar", 2008, .09, .09, "5", "50", 60, "Coffee"),
    ("Olivola and Schwartz", 2006, -.43, .09, "4", "20", 48, "Magazines"),
    ("Reutskaja", 2008, 0.0, .07, "10", "30", 60, "Gift boxes"),
    ("Reutskaja and Hogarth", 2009, .68, .07, "10", "30", 60, "Gift boxes"),
    ("Scheibehenne", 2008, .02, .01, "6", "24", 504, "Jam"),
    ("Scheibehenne", 2008, -.27, .06, "6", "30", 66, "Jelly beans"),
    ("Scheibehenne", 2008, -.08, .01, "3", "12", 280, "Red wine"),
    ("Scheibehenne, Greifeneder, and Todd", 2009, -.31, .07, "2", "30", 60, "Charities"),
    ("Scheibehenne, Greifeneder, and Todd", 2009, -.04, .07, "5", "40", 57, "Charities"),
    ("Scheibehenne, Greifeneder, and Todd", 2009, -.16, .04, "5", "40 & 80", 112, "Charities"),
    ("Scheibehenne, Greifeneder, and Todd", 2009, .39, .04, "5", "40 & 80", 119, "Charities"),
    ("Scheibehenne, Greifeneder, and Todd", 2009, -.17, .03, "6", "30", 80, "Classical music"),
    ("Scheibehenne, Greifeneder, and Todd", 2009, -.05, .02, "6", "30", 87, "Classical music"),
    ("Scheibehenne, Greifeneder, and Todd", 2009, -.11, .05, "5", "30", 80, "Restaurants"),
    ("Scheibehenne and Todd", 2009, .00, .02, "6", "63", 191, "Mutual funds"),
    ("Shah and Wolford", 2007, .77, .05, "6-12", "14-20", 80, "Pens"),
    ("Sollner and Newell", 2009, -.22, .07, "3", "18", 57, "Perfume"),
    ("Sollner and Newell", 2009, -.82, .14, "3", "30", 32, "Sun cream"),
]


def dersimonian_laird(d, v):
    w = 1 / v
    fixed = np.sum(w * d) / np.sum(w)
    q = float(np.sum(w * (d - fixed) ** 2))
    k = len(d)
    tau2 = max(0.0, (q - (k - 1)) / (np.sum(w) - np.sum(w ** 2) / np.sum(w)))
    ws = 1 / (v + tau2)
    mean = float(np.sum(ws * d) / np.sum(ws))
    se = float(np.sqrt(1 / np.sum(ws)))
    return {"mean": mean, "lo": mean - 1.96 * se, "hi": mean + 1.96 * se, "tau2": tau2, "Q": q,
            "I2": max(0.0, (q - (k - 1)) / q)}


def main():
    d = np.array([r[2] for r in ROWS])
    v = np.array([r[3] for r in ROWS])
    assert len(ROWS) == 63
    re = dersimonian_laird(d, v)
    out = {
        "source": "Scheibehenne, Greifeneder & Todd (2010), JCR 37(3), Table 1",
        "paper": {"mean": 0.02, "lo": -0.09, "hi": 0.12, "k": 63, "experiments": 50, "N": 5036, "I2": 0.68},
        "recomputed": {k: round(x, 4) for k, x in re.items()},
        "n_total": int(sum(r[6] for r in ROWS)),
        "n_positive": int(np.sum(d > 0)), "n_negative": int(np.sum(d < 0)), "n_zero": int(np.sum(d == 0)),
        "studies": [{"author": r[0], "year": r[1], "d": r[2], "s2": r[3], "small": r[4], "large": r[5],
                     "n": r[6], "item": r[7]} for r in ROWS],
    }
    Path(__file__).with_name("meta.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: out[k] for k in ["recomputed", "n_total", "n_positive", "n_negative", "n_zero"]}, indent=1))


if __name__ == "__main__":
    main()
