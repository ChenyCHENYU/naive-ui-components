---
'@robot-admin/naive-ui-components': patch
---

修复 C_ActionBar 换行未作用于组内按钮的问题，并让紧凑配置在行内模式下通过默认按钮间距即时生效。显式 gap 保持优先，透传按钮尺寸与图标尺寸同步。
