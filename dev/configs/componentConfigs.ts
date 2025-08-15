// dev/configs/componentConfigs.ts
export interface ComponentDemo {
  title: string
  props: Record<string, any>
  controls?: Record<string, {
    type: 'boolean' | 'string' | 'number' | 'select' | 'textarea'
    placeholder?: string
    min?: number
    max?: number
    rows?: number
    options?: Array<{ label: string; value: any }>
  }>
}

export interface ComponentConfig {
  name: string
  title: string
  description: string
  category: 'display' | 'input' | 'feedback' | 'layout'
  status: 'stable' | 'beta' | 'alpha'
  events: string[]
  demos: ComponentDemo[]
}

// 自动扫描组件并生成配置的辅助函数
export function createComponentConfig(
  name: string,
  title: string,
  description: string,
  category: ComponentConfig['category'],
  demos: ComponentDemo[],
  options: {
    status?: ComponentConfig['status']
    events?: string[]
  } = {}
): ComponentConfig {
  return {
    name,
    title,
    description,
    category,
    status: options.status || 'stable',
    events: options.events || [],
    demos
  }
}

// C_Code 组件配置
export const cCodeConfig = createComponentConfig(
  'C_Code',
  'C_Code 代码展示组件',
  '用于展示代码的组件，支持语法高亮、复制、全屏等功能',
  'display',
  [
    {
      title: '基础用法',
      props: {
        code: 'console.log("Hello, World!");',
        language: 'javascript',
        showHeader: true,
        showLineNumbers: true,
        title: 'JavaScript 示例'
      },
      controls: {
        code: { type: 'textarea', placeholder: '输入代码...', rows: 4 },
        language: { 
          type: 'select', 
          options: [
            { label: 'JavaScript', value: 'javascript' },
            { label: 'TypeScript', value: 'typescript' },
            { label: 'Python', value: 'python' },
            { label: 'HTML', value: 'html' },
            { label: 'CSS', value: 'css' },
            { label: 'Vue', value: 'vue' },
            { label: 'JSON', value: 'json' }
          ]
        },
        showHeader: { type: 'boolean' },
        showLineNumbers: { type: 'boolean' },
        showFullscreen: { type: 'boolean' },
        title: { type: 'string', placeholder: '代码标题...' }
      }
    },
    {
      title: '限制高度',
      props: {
        code: `// 长代码示例，用于测试滚动
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 计算前20个斐波那契数
for (let i = 0; i < 20; i++) {
  console.log(\`fibonacci(\${i}) = \${fibonacci(i)}\`);
}

// ES6+ 特性展示
const asyncFunction = async () => {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
};`,
        language: 'javascript',
        maxHeight: 200,
        title: '限制高度示例',
        showHeader: true,
        showLineNumbers: true
      },
      controls: {
        maxHeight: { type: 'number', min: 100, max: 500 }
      }
    },
    {
      title: '无头部模式',
      props: {
        code: `.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}`,
        language: 'css',
        showHeader: false,
        showLineNumbers: true
      },
      controls: {
        showHeader: { type: 'boolean' },
        showLineNumbers: { type: 'boolean' }
      }
    }
  ],
  { 
    events: ['copy', 'fullscreen', 'click'],
    status: 'stable'
  }
)

// 未来添加更多组件配置...
// export const cIconConfig = createComponentConfig(...)
// export const cButtonConfig = createComponentConfig(...)

// 导出所有配置
export const allComponentConfigs: ComponentConfig[] = [
  cCodeConfig,
  // cIconConfig,
  // cButtonConfig,
  // ... 其他组件
]