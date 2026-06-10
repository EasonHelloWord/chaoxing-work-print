# 学习通作业题目答案打印整理

一个用于学习通/超星作业页面的 Tampermonkey userscript。它可以把作业题目、选项、答案和解析整理成适合打印、保存 PDF 或打包导出的页面。

## 功能

- 在作业详情页导出打印版 HTML、复制文本、打开保存 PDF 的打印页。
- 支持已完成、待批阅、未完成、未交、未做、超时/过期等作业批量导出。
- 无答案作业会自动标注“无答案”，并且不会输出答案或解析。
- 批量导出可按状态筛选，可跳过同名作业，可生成导出清单。
- 批量导出支持 ZIP，批量 PDF 会按每篇作业独立开新页生成打印页并打开浏览器打印窗口。
- 批量 PDF 可启用“打印友好”，自动在估算为奇数页的作业后补空白页，方便双面打印。
- 支持手动勾选将要导出的篇目，提供全选、全不选和刷新列表。

## 安装

1. 安装浏览器脚本管理器，例如 Tampermonkey。
2. 打开仓库中的 `chaoxing-work-print.user.js`。
3. 点击 Raw 或复制脚本内容到 Tampermonkey 新建脚本中保存。
4. 进入学习通课程作业列表或作业详情页，右下角会出现导出面板。

```js
// @homepageURL  https://github.com/EasonHelloWord/chaoxing-work-print
// @supportURL   https://github.com/EasonHelloWord/chaoxing-work-print/issues
// @updateURL    https://raw.githubusercontent.com/EasonHelloWord/chaoxing-work-print/main/chaoxing-work-print.user.js
// @downloadURL  https://raw.githubusercontent.com/EasonHelloWord/chaoxing-work-print/main/chaoxing-work-print.user.js
```

## 使用

### 单个作业

进入作业详情页或作答页后，可以使用：

- `打印版`：打开整理后的打印页面。
- `导出PDF`：打开整理后的打印页面并唤起打印窗口，选择“保存为 PDF”。
- `复制文本`：复制题目、选项、答案和解析文本。
- `下载HTML`：下载当前作业的打印版 HTML。

### 批量导出

进入课程作业列表或课程首页后，可以使用：

- `导出全部页`：按当前筛选和勾选列表导出 ZIP。
- `导出PDF`：按当前筛选和勾选列表生成批量打印页，每篇作业从新页开始，选择“保存为 PDF”。
- 齿轮按钮：展开导出设置。
- 篇目列表：手动勾选或取消某个作业。
- `全选` / `全不选`：快速调整篇目列表。

## 导出设置

导出范围：

- 有答案
- 待批阅
- 未完成
- 超时/过期
- 其他状态

导出选项：

- 跳过同名
- 无答案标注
- 导出清单
- 显示解析
- 打印友好

## 隐私与数据

脚本在浏览器本地运行，不会主动上传题目、答案或账号信息到第三方服务器。批量导出时会在当前登录态下请求学习通页面，以便读取作业列表和详情。

不要把本地 HAR 抓包、课程页面 HTML、导出的 ZIP/PDF 直接提交到公开仓库，这些文件可能包含课程、账号、作业参数或其他隐私信息。本仓库默认通过 `.gitignore` 排除了 `*.har`、`*.zip`、`*.pdf`、`*.html`。

## 开发

本仓库没有构建步骤，主文件就是 userscript。

```bash
npm run check
```

该命令会执行：

```bash
node --check chaoxing-work-print.user.js
```

## 免责声明

本项目仅用于整理和导出你有权限访问的作业页面内容。使用时请遵守学校、课程平台和相关课程的规定。
