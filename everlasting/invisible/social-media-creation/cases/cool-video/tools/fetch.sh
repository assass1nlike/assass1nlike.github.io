#!/usr/bin/env bash
# 下载第三方素材到 vendor/（不进 git）：MPFB 扩展、MakeHuman CC0 素材包、CMU 动捕 BVH。
set -e
cd "$(dirname "$0")/.."
mkdir -p vendor/mh vendor/bvh
get() { [ -s "$2" ] || curl -sL --fail --retry 3 -o "$2" "$1"; }
get https://extensions.blender.org/download/sha256:c075b3e9b94b8e5556a5f03f4653602d02ea306de08126e8f55ed6dee28a2dad/add-on-mpfb-v2.0.18.zip vendor/mpfb.zip
# 后缀是授权：cc0 无需署名，ccby 需要在发布时署名 MakeHuman 社区
for p in makehuman_system_assets_cc0 shirts01_cc0 shirts02_ccby shirts03_ccby pants01_cc0 pants02_ccby pants03_ccby          shoes01_cc0 shoes02_ccby shoes03_ccby hair01_cc0 hair02_ccby hair03_ccby hats01_cc0 gloves01_cc0; do
  get https://files.makehumancommunity.org/asset_packs/${p%_*}/$p.zip vendor/mh/$p.zip
done
# CMU 动捕（cgspeed 的 MotionBuilder 友好 BVH 转换版，GitHub 镜像里每条一个 zip）
B=https://raw.githubusercontent.com/Shriinivas/cmubvh/master
for t in 09_01 09_02 09_03 09_04 16_35 16_55 16_08 35_17 \
         85_01 85_06 85_14 85_15 87_01 87_03 87_04 88_01 88_04 88_05 88_06 88_08 89_04 89_05 \
         90_01 90_05 90_08 90_11 90_12 90_14 90_19 90_28; do
  s=$((10#${t%%_*}))
  case $s in 9) q=Sequence-001-009;; 16) q=Sequence-015-019;; 35) q=Sequence-035-039;; 85) q=Sequence-081-085;; *) q=Sequence-086-094;; esac
  d=$(printf %02d $s)
  [ -s vendor/bvh/$t.bvh ] || { get $B/$q/$d/Data/$t.zip vendor/bvh/$t.zip && unzip -qo vendor/bvh/$t.zip -d vendor/bvh && rm vendor/bvh/$t.zip; }
done
du -sh vendor/*
