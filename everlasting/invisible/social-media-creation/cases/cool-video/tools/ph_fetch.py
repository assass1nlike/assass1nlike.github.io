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
            "worn_asphalt", "rough_concrete", "cliff_side", "rock_wall_10", "aerial_ground_rock"]
MODELS = ["exterior_aircon_unit", "modular_airduct_circular_01", "modular_airduct_rectangular_01", "modular_chainlink_fence",
          "modular_electric_cables", "modular_fire_escape", "modular_industrial_pipes_01", "modular_metal_gutter",
          "modular_pipes", "metal_trash_can", "barrel_03", "Barrel_01", "cardboard_box_01", "concrete_road_barrier",
          "mounted_fluorescent_lights", "industrial_wall_lamp", "security_light", "power_box_01", "utility_box_01",
          "utility_box_02", "security_camera_01", "plastic_crate_01", "wooden_crate_01", "trashbag", "propane_tank",
          "portable_searchlight", "old_tyre", "rollershutter_door", "street_lamp_01", "worn_metal_rack",
          "ladder_sectioned_01", "modular_urban_apartments_facade", "modular_factory_facade",
          "namaqualand_cliff_01", "namaqualand_cliff_02", "namaqualand_boulder_02", "namaqualand_boulder_03",
          "namaqualand_boulder_04", "namaqualand_boulder_05", "namaqualand_boulder_06", "namaqualand_boulders_01",
          "namaqualand_rocks_01", "namaqualand_stones_01", "coastal_cliff_01", "coastal_cliff_02", "coastal_cliff_04",
          "mountainside", "rock_face_01", "rock_face_02", "rock_07", "rock_09", "boulder_01", "sand_rocks_small_01",
          "dead_tree_trunk", "dead_quiver_trunk", "quiver_tree_01", "wild_rooibos_bush", "dry_branches_medium_01"]
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

for m in MODELS:
    f = files(m)["gltf"]
    res = "2k" if "2k" in f else sorted(f)[0]
    g = f[res]["gltf"]
    d = os.path.join(OUT, "models", m)
    get(g["url"], os.path.join(d, os.path.basename(g["url"])))
    for rel, inc in g.get("include", {}).items():
        get(inc["url"], os.path.join(d, rel))
    print("model", m)
