**论文阅读**：PDF-XChange Editor

**火狐浏览器暗色阅读**：Dark Reader 插件

**有粗细的笔写字**：Win+R，输入 `services.msc` 然后选择 Wacom Professional Service，右键启动

**给 typora 更多功能的 typora plugin**：

1. 从 https://github.com/obgnail/typora_plugin/releases/latest 下载最新压缩包并解压。

2. 打开 Typora 安装目录，找到包含 `window.html` 的文件夹，正式版通常是 `resources`。

3. 把解压得到的 `plugin` 文件夹复制进去。

4. 进入 `plugin/bin`，右键 `install_windows.ps1`，选择“使用 PowerShell 运行”，然后重启 Typora。

5. 如果插件还没加载成功，在 PowerShell 中执行：

   ```
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Typora\resources\plugin\bin\install_windows.ps1"
   ```

   出现管理员权限提示时允许，确认脚本显示 `Plugin installed successfully!`.

**让 typora 的背景为更深的黑色**：

1. 打开 Typora 自身的偏好设置 → 外观 → 打开主题文件夹。

2. 新建 `base.user.css`；如果已有这个文件，就在末尾追加：

   ```css
   :root {
     --bg-color: #181818;
     --side-bar-bg-color: #181818;
   }
   
   html, body, content, #write, #typora-sidebar {
     background-color: #181818 !important;
   }
   ```

3. 保存并重启 Typora 即可

去防御性表达：https://github.com/Kiterlin/anti-defensive-writing
