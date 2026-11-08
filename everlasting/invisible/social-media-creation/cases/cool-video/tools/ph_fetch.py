"""从 Poly Haven（CC0）下载 HDRI 和 PBR 贴图到 vendor/ph/。
python tools/ph_fetch.py"""
import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "vendor", "ph")
HDRIS = {"shanghai_bund": "4k", "rooftop_night": "4k", "quarry_01_puresky": "4k", "table_mountain_2_puresky": "4k",
         "kloofendal_48d_partly_cloudy_puresky": "4k", "modern_buildings_night": "4k"}
TEXTURES = ["tarred_gravel", "concrete_wall_008", "brushed_concrete", "rusty_metal_02", "metal_plate",
            "red_sandstone_wall", "rock_face_03", "red_sand", "sandstone_cracks", "aerial_rocks_02",
            "concrete_tiles", "precast_concrete_wall", "hexagonal_concrete_paving", "concrete_floor_worn_001",
            "worn_asphalt", "rough_concrete"]
MAPS = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "Displacement": "disp"}


def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "cool-video-fetch"})
    with urllib.request.urlopen(req) as r, open(path, "wb") as f:
        f.write(r.read())


def files(asset):
    req = urllib.request.Request(f"https://api.polyhaven.com/files/{asset}", headers={"User-Agent": "cool-video-fetch"})
    return json.loads(urllib.request.urlopen(req).read().decode("utf-8"))


for h, res in HDRIS.items():
    f = files(h)["hdri"][res]["exr"]
    get(f["url"], os.path.join(OUT, "hdri", f"{h}.exr"))
    print("hdri", h)
for t in TEXTURES:
    f = files(t)
    for k, short in MAPS.items():
        if k in f:
            get(f[k]["2k"]["jpg"]["url"], os.path.join(OUT, "tex", t, f"{short}.jpg"))
    print("tex", t)
