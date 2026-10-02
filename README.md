# ProjectBackupTool

Windows 桌面版项目备份工具：把项目文件夹压缩为 LZ4 备份文件，支持浏览、恢复、删除，并可通过 KDE Connect 将备份发送到手机或平板。

技术栈：**Tauri 2 + Vue 3 + TypeScript**；压缩使用 **lz4_flex**（tar 归档 + LZ4 帧流，扩展名 `.lz4`）。

## 功能

- 配置 Windows / Android / Web 三个项目根目录，分别列出其中的一级子目录作为可备份项目；项目面板右侧可切换查看不同种类
- 备份：整个项目文件夹打包压缩到备份目录，被占用或不可读的文件自动跳过并汇总提示
- 备份时若项目根目录存在 `.gitignore`，按 Git 规则过滤掉被忽略的构建产物（支持 `*.log`、`build/`、取反 `!` 等规则，子目录中的嵌套 `.gitignore` 同样生效）；`.git` 版本库目录随备份保留
- 恢复：自动判定恢复到 Windows / Android / Web 根目录；目标已存在时先将原文件夹移入回收站
- 删除备份文件；在资源管理器中定位项目、备份目录或备份文件
- 右键备份记录 →「发送到」列出已配对且在线的 KDE Connect 设备并发送文件
- 压缩参数（块大小 / 块模式 / 内容与块校验和）可在设置中调整

备份目录：「文档\Projects-Backup」。

配置文件：`config.toml`（TOML 格式），位于 Tauri 应用配置目录 `%APPDATA%\com.projectbackup.tool\`。

## 目录结构

```
src/                 前端（Vue 3 + TypeScript + Vite）
  components/        标题栏、工具栏、项目面板、备份面板、操作栏、设置、弹层
  store/             状态、操作流程、提示与对话框
  lib/               命令封装、格式化辅助
  styles/            设计变量与样式
src-tauri/           后端（Rust）
  src/commands.rs    Tauri 命令层（前后端接口）
  src/archive.rs     tar + lz4_flex 压缩与解压
  src/config.rs      TOML 配置读写
  src/kdeconnect.rs  kdeconnect-cli 设备发现与发送
```

## 开发

```bash
npm install
npm run tauri dev     # 开发调试
npm run tauri build   # 打包发布
```