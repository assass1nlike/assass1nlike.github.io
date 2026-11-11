"""渲染一个镜头。在 Blender 里运行：

blender -b --python src/render_shot.py -- <镜头名> [--stills 秒,秒,...] [--samples N] [--pct 百分比]

不给 --stills 时渲染整个镜头，帧序号 = round(屏幕时间 × 60)，输出到 build/frames/<镜头名>/。
"""
import argparse
import os
import sys

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path[:0] = [os.path.join(ROOT, "src"), os.path.join(ROOT, "src", "scenes")]
import world as W  # noqa: E402
import shots  # noqa: E402
import demo  # noqa: E402
from skel import Skel  # noqa: E402
from bake import bake  # noqa: E402
from perf import HZ  # noqa: E402
from quat import slerp  # noqa: E402
from camera import FPS, look_at  # noqa: E402

PERFS = {"kai": demo.kai, "milo": demo.milo}
W_RES, H_RES = 1920, 804          # 2.39:1


class Ctx:
    def __init__(self, sk, t, root, q):
        self.sk, self.t, self.root, self.q = sk, t, root, q
        Wr, P, T = sk.fk(root, q)
        self.P, self.T = P, T
        self.C = sk.com(P, T)

    def _k(self, tm):
        k = np.clip((tm - self.t[0]) * HZ, 0, len(self.t) - 1.001)
        i = int(k)
        return i, k - i

    def at(self, bone, tm):
        i, a = self._k(tm)
        b = self.sk.i(bone)
        return self.P[i, b] * (1 - a) + self.P[i + 1, b] * a

    def com(self, tm):
        i, a = self._k(tm)
        return self.C[i] * (1 - a) + self.C[i + 1] * a

    def pose(self, tm):
        i, a = self._k(tm)
        return self.root[i] * (1 - a) + self.root[i + 1] * a, slerp(self.q[i], self.q[i + 1], a)


def optimize(sc):
    """渲染提速：只有太阳、角色的三盏补光和名字以 key_ 开头的灯投影；体积雾只算到 300 米，降低体积采样。"""
    for o in bpy.data.objects:
        if o.type == "LIGHT" and o.data.type != "SUN" and not o.name.startswith(("char_", "key_")):
            o.data.use_shadow = False
    e = sc.eevee
    e.volumetric_end = 300
    e.volumetric_samples = 32
    e.shadow_resolution_scale = 0.5


def compositor(sc):
    ng = bpy.data.node_groups.new("post", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    N, L = ng.nodes, ng.links
    rl = N.new("CompositorNodeRLayers")
    gl = N.new("CompositorNodeGlare")
    gl.inputs["Type"].default_value = "Bloom"
    gl.inputs["Quality"].default_value = "High"
    gl.inputs["Threshold"].default_value = 0.9
    gl.inputs["Strength"].default_value = 0.35
    gl.inputs["Size"].default_value = 0.7
    ld = N.new("CompositorNodeLensdist")
    ld.inputs["Distortion"].default_value = -0.012
    ld.inputs["Dispersion"].default_value = 0.012
    ld.inputs["Fit"].default_value = True
    out = N.new("NodeGroupOutput")
    L.new(rl.outputs["Image"], gl.inputs["Image"])
    L.new(gl.outputs["Image"], ld.inputs["Image"])
    L.new(ld.outputs["Image"], out.inputs[0])
    sc.compositing_node_group = ng
    sc.render.use_compositing = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("shot")
    ap.add_argument("--stills", default="")
    ap.add_argument("--samples", type=int, default=64)
    ap.add_argument("--pct", type=int, default=100)
    ap.add_argument("--tag", default="", help="静帧存到 build/stills/<tag>/")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:])
    S = shots.SHOTS[a.shot]
    W.clear()
    sc = bpy.context.scene
    W.render_settings(sc, w=W_RES, h=H_RES, samples=a.samples)
    sc.render.resolution_percentage = a.pct
    sk = Skel(S["char"])
    P = PERFS[S["char"]](sk)
    solved = getattr(P, "solved", None) or P.solve()
    scene_mod = __import__(S["scene"])
    scene_mod.build(**({"marks": P.marks} if hasattr(P, "marks") else {}))
    rig = W.load_char(S["char"])
    W.char_lights(rig, **getattr(scene_mod, "LIGHTS", {}))
    ctx = Ctx(sk, *solved)
    ramp = S.get("ramp")
    to_sim = (lambda ts: float(ramp(ts))) if ramp else (lambda ts: ts - S.get("shift", 0.0))
    t0, t1 = S["t"]
    f0, f1 = int(round(t0 * FPS)), int(round(t1 * FPS))
    frames = np.arange(f0, f1 + 1)          # 多烘焙一帧，运动模糊要用到后一帧
    sims = [to_sim(f / FPS) for f in frames]
    roots, qs = zip(*[ctx.pose(tm) for tm in sims])
    bake(rig, sk, np.array(roots), np.array(qs), frame0=f0)
    # 相机
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    sc.camera = cam
    cam.rotation_mode = "QUATERNION"
    cam.data.sensor_width = 36
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = S.get("fstop", 2.2)
    cam.data.clip_start = 0.05
    cam.data.clip_end = 3000
    for f, tm in zip(frames, sims):
        loc, tgt, lens, roll = S["cam"](ctx, f / FPS, tm)
        cam.location = loc
        cam.rotation_quaternion = look_at(loc, tgt, roll)
        cam.data.lens = lens
        cam.data.dof.focus_distance = float(np.linalg.norm(ctx.com(tm) - np.asarray(loc)))
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_quaternion", frame=f)
        cam.data.keyframe_insert("lens", frame=f)
        cam.data.dof.keyframe_insert("focus_distance", frame=f)
    compositor(sc)
    optimize(sc)
    out = os.path.join(ROOT, "build", "frames", a.shot)
    os.makedirs(out, exist_ok=True)
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    if a.stills:
        for s in a.stills.split(","):
            f = int(round(float(s) * FPS))
            sc.frame_set(f)
            sc.render.filepath = os.path.join(ROOT, "build", "stills", a.tag, f"{a.shot}_{f}.png")
            bpy.ops.render.render(write_still=True)
    else:
        sc.frame_start, sc.frame_end = f0, f1 - 1
        sc.render.filepath = os.path.join(out, "")
        bpy.ops.render.render(animation=True)


main()
