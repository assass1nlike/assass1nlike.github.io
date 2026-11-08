"""在 Blender 里把运动数据（root, q 按帧）写成骨架关键帧。"""
import numpy as np


def bake(rig, sk, root, q, frame0=1):
    import bpy
    rig.animation_data_clear()
    pbs = [rig.pose.bones[n] for n in sk.names]
    for pb in pbs:
        pb.rotation_mode = "QUATERNION"
    qb = sk.to_blender(q)
    lb = sk.root_to_blender(root)
    hips = rig.pose.bones["Hips"]
    act = bpy.data.actions.new(rig.name + "_act")
    rig.animation_data_create()
    rig.animation_data.action = act
    nf = len(root)
    frames = np.arange(nf, dtype=np.float32) + frame0
    # 直接写 F-Curve，比逐帧 keyframe_insert 快得多
    for bi, pb in enumerate(pbs):
        path = pb.path_from_id("rotation_quaternion")
        for c in range(4):
            _curve(act, rig, path, c, frames, qb[:, bi, c], pb.name)
    path = hips.path_from_id("location")
    for c in range(3):
        _curve(act, rig, path, c, frames, lb[:, c], "Hips")


def _curve(act, rig, path, idx, frames, vals, group):
    fc = None
    try:
        fc = act.fcurves.new(path, index=idx, action_group=group)
    except AttributeError:
        # Blender 5 的分层 action：通过 channelbag 建曲线
        slot = act.slots.new(id_type="OBJECT", name=rig.name) if not act.slots else act.slots[0]
        rig.animation_data.action_slot = slot
        layer = act.layers[0] if act.layers else act.layers.new("L")
        strip = layer.strips[0] if layer.strips else layer.strips.new(type="KEYFRAME")
        cb = strip.channelbag(slot, ensure=True)
        fc = cb.fcurves.new(path, index=idx)
    fc.keyframe_points.add(len(frames))
    co = np.empty(2 * len(frames), np.float32)
    co[0::2] = frames; co[1::2] = vals
    fc.keyframe_points.foreach_set("co", co)
    fc.keyframe_points.foreach_set("interpolation", np.full(len(frames), 1, np.int32))  # LINEAR
    fc.update()
