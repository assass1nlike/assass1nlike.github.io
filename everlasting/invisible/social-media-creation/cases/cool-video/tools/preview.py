"""在 Blender 里预览一段运动：低分辨率渲染若干帧并拼成联系表。
blender -b build/chars/<名字>.blend --python tools/preview.py -- <运动.npz> <输出.jpg> [列数] [帧间隔] [相机: side|front|top]
"""
import math
import os
import sys

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
from skel import Skel
from bake import bake

argv = sys.argv[sys.argv.index("--") + 1:]
npz, out = argv[0], argv[1]
cols = int(argv[2]) if len(argv) > 2 else 6
step = int(argv[3]) if len(argv) > 3 else 6
view = argv[4] if len(argv) > 4 else "side"
d = np.load(npz)
rig = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
sk = Skel(rig.name)
bake(rig, sk, d["root"], d["q"])
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "MATERIAL"
sc.display.shading.show_shadows = True
sc.render.resolution_x, sc.render.resolution_y = 480, 480
r = d["root"]
lo, hi = r.min(0), r.max(0)
c = (lo + hi) / 2
ext = max(hi - lo) / 2 + 1.4
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0))
bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = "ORTHO"
cam.data.ortho_scale = 3.4
off = {"side": (12, 0, 0), "front": (0, -12, 0), "top": (0, 0, 12), "persp": (8, -8, 3)}[view]
cam.location = (c[0] + off[0], c[1] + off[1], max(c[2], 1.0) + off[2])
dirv = -np.array(off, float); dirv /= np.linalg.norm(dirv)
cam.rotation_euler = (bpy.app.version and __import__("mathutils").Vector(dirv).to_track_quat("-Z", "Y").to_euler())
sc.camera = cam
nf = len(r)
frames = list(range(0, nf, step))[: cols * 4]
tmp = os.path.join(ROOT, "build", "tmp_prev")
os.makedirs(tmp, exist_ok=True)
paths = []
for k, f in enumerate(frames):
    sc.frame_set(f + 1)
    cam.location = (r[f, 0] + off[0], r[f, 1] + off[1], r[f, 2] + off[2])
    sc.render.filepath = os.path.join(tmp, f"{k:03d}.png")
    bpy.ops.render.render(write_still=True)
    paths.append(sc.render.filepath)
import subprocess  # Blender 自带的 Python 没有 PIL，拼图交给 autovideo 环境
subprocess.run([r"D:/anaconda/envs/autovideo/python.exe", os.path.join(ROOT, "tools", "sheet.py"), out, str(cols)] + paths, check=True)
