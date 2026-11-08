"""三个主角：用 MPFB 生成带 cmu_mb 骨架的 MakeHuman 人物，存成 build/chars/<名字>.blend。

blender -b --python src/chars.py -- [名字 ...]
"""
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# phenotype 是 MakeHuman 的宏参数（0..1）；clothes 是 MPFB 素材路径片段；colors 按服装顺序给主色
CHARS = {
    "kai": dict(
        phenotype=dict(gender=1.0, age=0.45, muscle=0.75, weight=0.42, proportions=0.85, height=0.55,
                       race=dict(asian=0.7, caucasian=0.2, african=0.1)),
        hair="short02/short02.mhclo",
        clothes=["elvs_hooded_sweat_jacket1/elvs_hooded_sweat_jacket1.mhclo",
                 "cortu_cargo_pants/cortu_cargo_pants.mhclo",
                 "punkduck_running_shoes_01/punkduck_running_shoes_01.mhclo"],
        colors=[(1.0, 0.33, 0.05), (0.06, 0.06, 0.08), (0.92, 0.92, 0.95)],
        skin="young_asian_male/young_asian_male.mhmat", hair_color=(0.03, 0.025, 0.02)),
    "rin": dict(
        phenotype=dict(gender=0.0, age=0.42, muscle=0.7, weight=0.38, proportions=0.9, height=0.45,
                       cupsize=0.4, race=dict(asian=0.5, caucasian=0.4, african=0.1)),
        hair="ponytail01/ponytail01.mhclo",
        clothes=["punkduck_high_neck_crop_top/punkduck_high_neck_crop_top.mhclo",
                 "toigo_harem_pants/toigo_harem_pants.mhclo",
                 "punkduck_tennis_shoes/punkduck_tennis_shoes.mhclo"],
        colors=[(0.0, 0.75, 0.70), (0.10, 0.04, 0.22), (0.95, 0.95, 0.95)],
        skin="young_asian_female/young_asian_female.mhmat", hair_color=(0.30, 0.03, 0.06)),
    "milo": dict(
        phenotype=dict(gender=1.0, age=0.4, muscle=0.85, weight=0.5, proportions=0.8, height=0.65,
                       race=dict(asian=0.1, caucasian=0.2, african=0.7)),
        hair="afro01/afro01.mhclo",
        clothes=["elvs_male_athletic_tank1/elvs_male_athletic_tank1.mhclo",
                 "mindfront_male_trousers_1/mindfront_male_trousers_1.mhclo",
                 "culturalibre_sneakers/culturalibre_sneakers.mhclo"],
        colors=[(1.0, 0.82, 0.05), (0.16, 0.22, 0.42), (0.9, 0.2, 0.15)],
        skin="young_african_male/young_african_male.mhmat", hair_color=(0.02, 0.015, 0.012)),
}


def build(name):
    from bl_ext.user_default.mpfb.services import HumanService
    c = CHARS[name]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    info = HumanService._create_default_human_info_dict()
    ph = info["phenotype"]
    ph.update({k: v for k, v in c["phenotype"].items() if k != "race"})
    ph["race"].update(c["phenotype"]["race"])
    info.update(name=name, rig="cmu_mb", hair=c["hair"], clothes=list(c["clothes"]),
                eyes="high-poly/high-poly.mhclo", eyebrows="eyebrow001/eyebrow001.mhclo",
                eyelashes="eyelashes01/eyelashes01.mhclo",
                skin_mhmat=c["skin"], skin_material_type="ENHANCED_SSS", eyes_material_type="PROCEDURAL_EYES")
    settings = HumanService.get_default_deserialization_settings()
    settings["subdiv_levels"] = 1
    body = HumanService.deserialize_from_dict(info, settings)
    rig = bpy.data.objects[name]
    os.makedirs(os.path.join(ROOT, "build", "chars"), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "build", "chars", f"{name}.blend"))
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import skel
    skel.export_from_blender(rig, os.path.join(ROOT, "build", "skel", f"{name}.json"))
    print("saved", name, [o.name for o in bpy.data.objects])


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    for n in argv or CHARS:
        build(n)
