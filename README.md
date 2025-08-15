# @agile-team/naive-ui-components


基于 Naive UI 的 Vue 3 组件库，提供高质量的业务组件。

## 📦 安装

```bash
npm install @agile-team/naive-ui-components
```

必需的对等依赖：
```bash
npm install vue@^3.3.0 naive-ui@^2.35.0
```

## 🚀 快速开始

### 全局注册（推荐）

```typescript
// main.ts
import { createApp } from 'vue'
import NaiveUIComponents from '@agile-team/naive-ui-components'
import '@agile-team/naive-ui-components/style'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

### 按需导入

```vue
<script setup lang="ts">
import { C_Icon, C_Code } from '@agile-team/naive-ui-components'
import '@agile-team/naive-ui-components/style'
</script>

<template>
  <C_Icon name="mdi:home" size="24" />
  <C_Code language="javascript" :code="'console.log(\"Hello World\")'" />
</template>
```

### 使用示例

```vue
<template>
  <div class="demo">
    <!-- 图标组件 -->
    <C_Icon name="mdi:heart" size="32" color="red" clickable @click="handleClick" />
    
    <!-- 代码高亮组件 -->
    <C_Code 
      language="javascript" 
      :code="jsCode" 
      :line-numbers="true"
      theme="github-dark"
    />
  </div>
</template>

<script setup lang="ts">
const jsCode = `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
`

const handleClick = () => {
  console.log('图标被点击了!')
}
</script>
```

## 📚 文档

完整的组件文档和使用指南请访问：

**🔗 [组件库文档](https://www.tzagileteam.com/robot/components/preface)**

文档包含：
- 所有组件的详细使用方法
- API 参考和属性说明
- 交互式示例和代码演示
- 最佳实践和设计指南

## 🛠️ 开发和维护

### 项目结构

```
src/
├── components/           # 组件目录
│   ├── C_Icon/          # 图标组件
│   │   ├── index.vue    # 组件主文件
│   │   ├── index.ts     # 导出文件
│   │   └── index.scss   # 样式文件
│   └── C_Code/          # 代码高亮组件
├── hooks/               # 公共 hooks
├── plugins/             # 插件
└── index.ts            # 入口文件
```

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/your-username/naive-ui-components.git
cd naive-ui-components

# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 本地测试
npm run playground

# 构建
npm run build
```

### 添加新组件

1. **创建组件目录**
   ```bash
   src/components/C_YourComponent/
   ├── index.vue        # 组件主文件
   ├── index.ts         # 导出文件
   └── index.scss       # 样式文件（可选）
   ```

2. **组件模板**
   ```vue
   <!-- index.vue -->
   <template>
     <div class="c-your-component">
       <!-- 组件内容 -->
     </div>
   </template>

   <script lang="ts" setup>
   export interface YourComponentProps {
     /** 属性描述 */
     someProp?: string
   }

   const props = withDefaults(defineProps<YourComponentProps>(), {
     someProp: 'default'
   })

   const emit = defineEmits<{
     change: [value: string]
   }>()
   </script>
   ```

3. **导出文件**
   ```typescript
   // index.ts
   import C_YourComponent from "./index.vue";

   export default C_YourComponent;
   export { C_YourComponent };
   export type { YourComponentProps } from "./index.vue";
   ```

4. **注册组件**
   在 `src/index.ts` 中添加：
   ```typescript
   import C_YourComponent from "./components/C_YourComponent/index.vue";

   const components: Component[] = [C_Code, C_Icon, C_YourComponent];

   export { C_Code, C_Icon, C_YourComponent };
   export type { YourComponentProps } from "./components/C_YourComponent/index.vue";
   ```

### 开发规范

- **命名规范**：组件使用 `C_` 前缀，采用 PascalCase
- **类型安全**：为所有 props 定义 TypeScript 接口
- **样式规范**：使用 SCSS，遵循 BEM 命名约定
- **文档要求**：为新组件编写使用文档和示例

### 提交和发布

```bash
# 提交代码
git add .
git commit -m "feat: add C_YourComponent"

# 更新版本
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0

# 构建并发布
npm run build
npm publish
```

## 🤝 参与贡献

我们欢迎社区贡献！如果您想参与组件库的开发：

### 贡献方式

1. **报告问题**：在 GitHub Issues 中报告 bug 或提出功能建议
2. **提交 PR**：修复 bug 或添加新功能
3. **完善文档**：改进文档或添加使用示例
4. **分享组件**：贡献新的通用组件

### 贡献流程

1. Fork 仓库到您的 GitHub 账户
2. 创建功能分支：`git checkout -b feature/new-component`
3. 开发和测试您的更改
4. 提交代码：`git commit -m "feat: add new component"`
5. 推送分支：`git push origin feature/new-component`
6. 创建 Pull Request

### 贡献指南

- 遵循现有的代码风格和命名规范
- 为新功能添加测试用例
- 更新相关文档
- 确保所有测试通过
- 详细描述您的更改

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🔗 相关链接

- [组件库文档](https://www.tzagileteam.com/robot/components/preface)
- [GitHub 仓库](https://github.com/your-username/naive-ui-components)
- [NPM 包](https://www.npmjs.com/package/@agile-team/naive-ui-components)
- [问题反馈](https://github.com/your-username/naive-ui-components/issues)

---

如果您在使用过程中遇到问题，请查看[文档](https://www.tzagileteam.com/robot/components/preface)或在 GitHub 上提交 issue。