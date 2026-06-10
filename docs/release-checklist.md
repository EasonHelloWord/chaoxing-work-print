# Release Checklist

发布到 GitHub 前建议检查：

- [ ] `npm run check` 通过。
- [ ] `chaoxing-work-print.user.js` 顶部 `@version` 已更新。
- [ ] `package.json` 中的版本号与脚本版本一致。
- [ ] `CHANGELOG.md` 已记录本次变化。
- [ ] 没有提交 `*.har`、`*.zip`、`*.pdf`、`*.html` 等本地数据文件。
- [ ] README 中的 GitHub 地址已替换为你的真实仓库地址。

首次发布建议：

```bash
git init
git add .gitignore .editorconfig package.json LICENSE README.md CHANGELOG.md CONTRIBUTING.md docs .github chaoxing-work-print.user.js
git commit -m "Initial release"
git branch -M main
git remote add origin git@github.com:<your-name>/<repo>.git
git push -u origin main
```

如果使用 HTTPS remote：

```bash
git remote add origin https://github.com/<your-name>/<repo>.git
```
