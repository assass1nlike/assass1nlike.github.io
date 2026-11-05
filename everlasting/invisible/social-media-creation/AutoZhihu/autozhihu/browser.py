"""本机 Chrome + 独立的持久化 profile（browser/），登录一次后长期复用。"""
import time
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

from .common import PROFILE


@contextmanager
def open_browser(headless=False):
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(PROFILE),
            channel="chrome",
            headless=headless,
            viewport={"width": 1280, "height": 900},
            locale="zh-CN",
            ignore_default_args=["--enable-automation"],
            args=["--disable-blink-features=AutomationControlled"],
        )
        try:
            yield ctx
        finally:
            ctx.close()


def logged_in(ctx):
    return any(c["name"] == "z_c0" for c in ctx.cookies("https://www.zhihu.com"))


def login(timeout=600):
    """打开知乎登录页，等用户扫码/输入，检测到登录 cookie 后退出。"""
    with open_browser() as ctx:
        if logged_in(ctx):
            print("已登录")
            return True
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto("https://www.zhihu.com/signin")
        print("请在弹出的 Chrome 窗口里登录知乎……")
        end = time.time() + timeout
        while time.time() < end:
            if logged_in(ctx):
                time.sleep(3)
                print("登录成功")
                return True
            time.sleep(2)
        print("等待登录超时")
        return False
