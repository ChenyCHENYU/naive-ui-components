<template>
  <div class="component-showcase">
    <div class="header">
      <h1>🚀 智能组件展示</h1>
      <div class="selector">
        <select v-model="selectedComponent">
          <option value="">选择组件 ({{ componentCount }}个)</option>
          <option v-for="name in componentNames" :key="name" :value="name">
            {{ name }}
          </option>
        </select>
        <button @click="scanComponents" :disabled="scanning">
          {{ scanning ? "扫描中..." : "🔍 扫描组件" }}
        </button>
      </div>
    </div>

    <!-- 组件预览 -->
    <div
      v-if="selectedComponent && availableComponents[selectedComponent]"
      class="preview"
    >
      <h3>{{ selectedComponent }}</h3>
      <div class="component-wrapper">
        <component
          :is="availableComponents[selectedComponent]"
          v-bind="getPropsForComponent(selectedComponent)"
          :key="selectedComponent"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty">
      <p>{{ selectedComponent ? "组件不存在" : "请选择一个组件" }}</p>
      <button
        v-if="!selectedComponent"
        @click="scanComponents"
        class="primary-btn"
      >
        开始扫描
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, shallowRef, nextTick, watch } from "vue";

// 扩展 ImportMeta 类型
declare global {
  interface ImportMeta {
    glob: (pattern: string) => Record<string, () => Promise<any>>;
  }
}

// 响应式数据
const availableComponents = shallowRef<Record<string, any>>({});
const selectedComponent = ref("");
const scanning = ref(false);

// 计算属性
const componentNames = computed(() => Object.keys(availableComponents.value));
const componentCount = computed(() => componentNames.value.length);

// 组件属性生成函数 - 纯函数，避免响应式缓存问题
function getPropsForComponent(componentName: string): Record<string, any> {
  if (!componentName) return {};

  console.log("🎛️ 为组件生成属性:", componentName);

  // 精确匹配已知组件
  switch (componentName) {
    case "C_Code":
      return {
        code: 'console.log("Hello World!");',
        language: "javascript",
        showHeader: true,
        showLineNumbers: true,
        title: "代码示例",
      };

    case "C_Icon":
      return {
        name: "mdi:home",
        size: 24,
        color: "#1890ff",
      };

    default:
      // 通用推断逻辑
      const name = componentName.toLowerCase();

      if (name.includes("code")) {
        return {
          code: 'console.log("示例代码");',
          language: "javascript",
        };
      }

      if (name.includes("icon")) {
        return {
          name: "mdi:star",
          size: 20,
        };
      }

      if (name.includes("button")) {
        return {
          text: "按钮",
          type: "primary",
        };
      }

      if (name.includes("input")) {
        return {
          placeholder: "请输入...",
        };
      }

      // 最通用的属性
      return {};
  }
}

// 监听组件选择变化
watch(selectedComponent, (newComponent) => {
  if (newComponent) {
    console.log("🔄 切换到组件:", newComponent);
    console.log("📋 组件存在:", !!availableComponents.value[newComponent]);
    console.log("🎛️ 组件属性:", getPropsForComponent(newComponent));
  }
});

// 扫描组件
async function scanComponents() {
  scanning.value = true;
  console.log("🔍 开始扫描组件...");

  try {
    // 完全清空
    availableComponents.value = {};
    selectedComponent.value = "";

    let componentModules: Record<string, () => Promise<any>> = {};

    // 尝试不同路径
    try {
      componentModules = import.meta.glob("../../src/components/*/index.vue");
      if (Object.keys(componentModules).length > 0) {
        console.log("✅ 使用路径: ../../src/components/*/index.vue");
      }
    } catch (error) {
      console.log("❌ 路径1失败");
    }

    if (Object.keys(componentModules).length === 0) {
      try {
        componentModules = import.meta.glob("../src/components/*/index.vue");
        if (Object.keys(componentModules).length > 0) {
          console.log("✅ 使用路径: ../src/components/*/index.vue");
        }
      } catch (error) {
        console.log("❌ 路径2失败");
      }
    }

    if (Object.keys(componentModules).length === 0) {
      try {
        componentModules = import.meta.glob("./src/components/*/index.vue");
        if (Object.keys(componentModules).length > 0) {
          console.log("✅ 使用路径: ./src/components/*/index.vue");
        }
      } catch (error) {
        console.log("❌ 路径3失败");
      }
    }

    const moduleKeys = Object.keys(componentModules);
    console.log("📂 发现组件文件:", moduleKeys);

    if (moduleKeys.length === 0) {
      console.error("未找到任何组件文件");
      return;
    }

    // 临时存储
    const tempComponents: Record<string, any> = {};

    // 加载所有组件
    for (const [path, loader] of Object.entries(componentModules)) {
      try {
        const componentName = path.match(/\/([^/]+)\/index\.vue$/)?.[1];
        if (!componentName) continue;

        console.log(`🔄 加载组件: ${componentName}`);
        const module = await loader();

        if (module?.default) {
          tempComponents[componentName] = module.default;
          console.log(`✅ 成功: ${componentName}`);
        } else {
          console.warn(`⚠️ ${componentName} 无默认导出`);
        }
      } catch (error) {
        console.error(`❌ 加载失败:`, error);
      }
    }

    // 一次性更新
    availableComponents.value = tempComponents;
    await nextTick();

    // 自动选择第一个
    const names = Object.keys(tempComponents);
    if (names.length > 0) {
      selectedComponent.value = names[0];
      console.log("🎯 自动选择:", names[0]);
    }

    console.log(`🎉 扫描完成: ${names.length} 个组件`);
  } catch (error) {
    console.error("❌ 扫描失败:", error);
  } finally {
    scanning.value = false;
  }
}
</script>

<style scoped>
.component-showcase {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  color: #333;
  margin-bottom: 20px;
}

.selector {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  min-width: 200px;
}

button {
  padding: 8px 16px;
  border: 1px solid #1890ff;
  background: #1890ff;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background: #40a9ff;
}

button:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.primary-btn {
  padding: 12px 24px;
  font-size: 16px;
}

.preview {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
}

.preview h3 {
  margin-bottom: 20px;
  color: #333;
}

.component-wrapper {
  padding: 20px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px dashed #ddd;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty p {
  margin-bottom: 20px;
  font-size: 16px;
}

.debug-panel {
  margin-top: 20px;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 10px;
}

.debug-panel summary {
  cursor: pointer;
  font-weight: bold;
  color: #666;
  padding: 5px;
}

.debug-content {
  margin-top: 10px;
  padding: 10px;
  background: white;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.4;
}

.debug-content p {
  margin: 5px 0;
  word-break: break-all;
}
</style>
