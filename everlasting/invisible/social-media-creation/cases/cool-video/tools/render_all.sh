#!/usr/bin/env bash
# 依次渲染若干镜头（完整帧序列），每个镜头的耗时记到 build/render.log。
# bash tools/render_all.sh [采样数] 镜头名 ...
cd "$(dirname "$0")/.."
S=$1; shift
for s in "$@"; do
  t=$(date +%s)
  D:/tools/blender/blender.exe -b --python src/render_shot.py -- $s --samples $S > build/render_$s.log 2>&1
  echo "$s $(( $(date +%s) - t ))s $(ls build/frames/$s | wc -l) frames" >> build/render.log
done
