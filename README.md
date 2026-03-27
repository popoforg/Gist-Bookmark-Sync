# GitHub Gist Bookmark Sync - Chrome 插件

将 Chrome 书签同步到 GitHub Gist，或从 Gist 下载书签到本地。

## 功能特点

- 🔐 安全存储：使用 GitHub Gist 私有存储你的书签
- ⬆️ 一键上传：将本地书签备份到 Gist
- ⬇️ 一键下载：从 Gist 恢复书签到本地
- ⚙️ 灵活配置：自定义 Token、Gist ID 和文件名

## 安装步骤

1. **打开 Chrome 扩展管理页面**
   - 地址栏输入：`chrome://extensions/`
   - 或菜单 → 更多工具 → 扩展程序

2. **启用开发者模式**
   - 点击右上角的"开发者模式"开关

3. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择本插件的文件夹（bookmark 文件夹）

4. **固定扩展**
   - 点击工具栏的拼图图标
   - 找到"GitHub Gist Bookmark Sync"并点击图钉固定

## 使用说明

### 1. 获取 GitHub Token

1. 访问 [GitHub Personal Access Token](https://github.com/settings/tokens)
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 填写描述（如：Bookmark Sync）
4. 勾选 `gist` 权限
5. 点击 "Generate token"
6. **复制并保存 Token**（只显示一次）

### 2. 配置插件

1. 点击浏览器工具栏中的插件图标
2. 在 "GitHub Token" 输入框中粘贴 Token
3. 点击"保存"按钮
4. （可选）Gist ID 可留空，首次上传时会自动创建
5. （可选）文件名默认为 `bookmarks.json`

### 3. 上传书签

- 点击"⬆️ 上传到 Gist"按钮
- 首次上传会自动创建一个新的 Gist
- 上传成功后会显示 Gist ID

### 4. 下载书签

- 确保已填写 Gist ID
- 点击"⬇️ 从 Gist 下载"按钮
- 书签将同步到本地 Chrome

## 文件结构

```
bookmark/
├── manifest.json      # 插件配置文件
├── popup.html         # 弹出界面
├── popup.js           # 主要逻辑
├── styles.css         # 样式文件
└── icons/             # 图标文件
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 注意事项

- ⚠️ 请妥善保管你的 GitHub Token，不要分享给他人
- ⚠️ 下载书签会覆盖本地现有书签，请谨慎操作
- 🔒 插件使用私有 Gist 存储，只有你能访问
- 📦 书签以 JSON 格式存储，便于查看和编辑

## 故障排除

### 上传失败
- 检查 Token 是否正确
- 确认 Token 有 `gist` 权限
- 检查网络连接

### 下载失败
- 确认 Gist ID 正确
- 确认文件名与 Gist 中的文件名一致
- 检查 Gist 是否存在

## 开发

修改代码后，在 `chrome://extensions/` 页面点击刷新按钮重新加载插件。

## 许可证

MIT License
