"""风格对比：同一画面渲染写实化 PBR 与卡通描边两种角色材质。
blender -b --python tools/styletest.py -- <pbr|toon> <输出.png> [帧]"""
import math, os, sys
import bpy, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path[:0] = [os.path.join(ROOT, "src"), os.path.join(ROOT, "src", "scenes")]
import world as W, rooftop, look
from skel import Skel
from bake import bake
argv = sys.argv[sys.argv.index("--") + 1:]
style, out = argv[0], argv[1]
frame = int(argv[2]) if len(argv) > 2 else 70
W.clear()
sc = bpy.context.scene
W.render_settings(sc, samples=int(os.environ.get("SAMPLES", 48)), blur=False)
sc.render.resolution_percentage = int(os.environ.get("PCT", 100))
rooftop.build()
rig = W.load_char("kai")
if style == "toon":
    look.toon("kai")
W.char_lights(rig)
d = np.load(os.path.join(ROOT, "build", "try1.npz"))
root = d["root"].copy(); root[:, 1] += -2.0
bake(rig, Skel("kai"), root, d["q"])
sc.frame_set(frame)
from mathutils import Vector
bpy.ops.object.camera_add(location=(4.2, 0.6, 0.7))
cam = bpy.context.object; cam.data.lens = 32; sc.camera = cam
tgt = Vector((0, -2.0, 1.8))
cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.dof.use_dof = True; cam.data.dof.focus_distance = (tgt - cam.location).length; cam.data.dof.aperture_fstop = 2.8
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
