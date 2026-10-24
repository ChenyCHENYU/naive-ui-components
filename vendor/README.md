# SheetJS 构建来源

`xlsx-0.20.3.tgz` 是官方原始发布包，未经修改。SHA-512 与之前 CDN 依赖锁定的值一致：

```text
sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==
```

- 上游：<https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz>
- 官方建议：<https://docs.sheetjs.com/docs/getting-started/installation/frameworks/#vendoring>
- 许可证：Apache-2.0，原文见 `../licenses/SheetJS.txt`。

本地归档仅用于源码安装与构建，不进入 npm 包。运行时代码随库构建为独立 ESM/CJS chunk；基础表单和表格首屏不提前加载它。消费者无需配置 SheetJS、镜像或下载地址。

`bun run check:vendor` 检查归档完整性、真实构建输入及随包许可证。升级时从官方重新获取原始归档，审核上游变更与安全信息，再同步校验值、许可证、锁文件及 Excel 导入/导出回归；不能只修改版本号或关闭完整性检查。
