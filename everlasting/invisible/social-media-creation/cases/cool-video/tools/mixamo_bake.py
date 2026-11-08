"""在 Blender 里把 vendor/mixamo/*.fbx 的骨骼动画采样成 numpy：build/mixamo/<名字>.npz。
每个文件存：names、rest 时各骨骼的世界旋转/位置、每帧的世界旋转/位置（60 fps）。
blender -b --python tools/mixamo_bake.py [-- 文件名子串 ...]"""
import glob
import os
import sys

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, "vendor", "mixamo")
dst = os.path.join(ROOT, "build", "mixamo")
os.makedirs(dst, exist_ok=True)
pat = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for f in sorted(glob.glob(os.path.join(src, "*.fbx"))):
    stem = os.path.splitext(os.path.basename(f))[0]
    out = os.path.join(dst, stem + ".npz")
    if (pat and not any(p in stem for p in pat)) or os.path.exists(out):
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=f, automatic_bone_orientation=False)
    arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
    act = arm.animation_data.action
    f0, f1 = [int(round(x)) for x in act.frame_range]
    sc = bpy.context.scene
    sc.render.fps = 60
    names = [b.name.split(":")[-1] for b in arm.pose.bones]
    M = arm.matrix_world
    rest_q = np.array([(M @ b.matrix_local).to_quaternion()[:] for b in arm.data.bones])
    rest_p = np.array([(M @ b.matrix_local).translation[:] for b in arm.data.bones])
    Q, P = [], []
    for fr in range(f0, f1 + 1):
        sc.frame_set(fr)
        Q.append([(M @ pb.matrix).to_quaternion()[:] for pb in arm.pose.bones])
        P.append([(M @ pb.matrix).translation[:] for pb in arm.pose.bones])
    parents = [names.index(b.parent.name.split(":")[-1]) if b.parent else -1 for b in arm.data.bones]
    np.savez(out, names=np.array(names), parents=np.array(parents), rest_q=rest_q, rest_p=rest_p,
             q=np.array(Q), p=np.array(P), fps=sc.render.fps)
    print("baked", stem, f1 - f0 + 1)
