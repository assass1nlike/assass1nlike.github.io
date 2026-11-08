"""在 Blender 里运行：把 vendor/mh/*.zip 素材包解压到 MPFB 的用户数据目录。
blender -b --python tools/mh_install.py"""
import glob, os, zipfile
from bl_ext.user_default.mpfb.services import LocationService, AssetService
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dst = LocationService.get_user_data()
for z in sorted(glob.glob(os.path.join(root, "vendor", "mh", "*.zip"))):
    with zipfile.ZipFile(z) as f:
        f.extractall(dst)
    print("installed", os.path.basename(z))
print("user data:", dst, os.listdir(dst))
