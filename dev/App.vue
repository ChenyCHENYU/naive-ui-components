<template>
  <n-config-provider :theme="isDark ? darkTheme : null">
    <n-message-provider>
      <n-layout class="app-layout">
      <n-layout-header class="app-header" bordered>
        <div class="header-content">
          <h1>🚀 Naive UI Components</h1>
          <div class="header-actions">
            <n-button quaternary @click="toggleTheme">
              {{ isDark ? '🌞' : '🌙' }}
            </n-button>
            <n-button
              type="primary"
              @click="activeTab = 'showcase'"
              :secondary="activeTab !== 'showcase'"
            >
              组件展示
            </n-button>
            <n-button
              type="primary"
              @click="activeTab = 'playground'"
              :secondary="activeTab !== 'playground'"
            >
              测试环境
            </n-button>
          </div>
        </div>
      </n-layout-header>

      <n-layout-content class="app-content">
        <!-- 智能组件展示系统 -->
        <SmartShowcase v-if="activeTab === 'showcase'" />
        
        <!-- 原有测试环境 -->
        <div v-else-if="activeTab === 'playground'" class="playground-container">
          <n-alert title="测试环境" type="info" style="margin-bottom: 20px;">
            这是原有的手工测试环境，现在推荐使用上面的「组件展示」进行更高效的测试
          </n-alert>
          
          <div class="test-section">
            <h2>🔥 C_Code 组件测试</h2>
            
            <div class="test-case">
              <h3>基础用法</h3>
              <C_Code
                :code="javascriptCode"
                language="javascript"
                title="JavaScript 示例"
                :show-header="true"
                :show-line-numbers="true"
                :show-fullscreen="true"
                @copy="onCopy"
                @fullscreen="onFullscreen"
              />
            </div>
          </div>
        </div>
      </n-layout-content>
      </n-layout>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { darkTheme, NMessageProvider } from 'naive-ui'
// 使用类型断言解决 .vue 文件的类型声明问题
// @ts-ignore
import SmartShowcase from './components/SmartShowcase.vue'
import C_Code from '../src/components/C_Code/index.vue'

const isDark = ref(false)
function toggleTheme() {
  isDark.value = !isDark.value
}

const activeTab = ref<'showcase' | 'playground'>('showcase')

// 原有测试数据
const javascriptCode = ref('console.log("Hello World");')

// 展示系统数据
const basicCode = ref('console.log("Hello, World!");')
const basicLanguage = ref('javascript')
const basicTitle = ref('JavaScript 示例')
const showHeader = ref(true)
const showLineNumbers = ref(true)
const showFullscreen = ref(true)

const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' }
]

const eventLogs = ref<Array<{time: string, name: string, data: string}>>([])

function onCopy(code: string) {
  console.log('代码已复制:', code.length, '个字符')
}

function onFullscreen(isFullscreen: boolean) {
  console.log('全屏状态:', isFullscreen)
}

function onShowcaseCopy(code: string) {
  addEventLog('copy', '复制了 ' + code.length + ' 个字符')
  console.log('代码已复制:', code)
}

function onShowcaseFullscreen(isFullscreen: boolean) {
  addEventLog('fullscreen', isFullscreen ? '进入全屏' : '退出全屏')
  console.log('全屏状态:', isFullscreen)
}

function addEventLog(name: string, data: string) {
  eventLogs.value.unshift({
    time: new Date().toLocaleTimeString(),
    name: name,
    data: data
  })
  
  if (eventLogs.value.length > 20) {
    eventLogs.value.pop()
  }
}

function clearLogs() {
  eventLogs.value = []
}
</script>

<style scoped>
/* 原有样式 */
.app-layout {
  min-height: 100vh;
}

.app-header {
  padding: 0 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header-content h1 {
  margin: 0;
  font-size: 24px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-content {
  padding: 24px;
}

.playground-container {
  max-width: 1200px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 40px;
}

.test-case {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: var(--n-color-base);
}

.test-case h3 {
  margin-top: 0;
}

/* 展示系统样式 */
.showcase {
  max-width: 1200px;
  margin: 0 auto;
}

.component-section {
  margin-bottom: 40px;
}

.component-section h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
}

.demo-box {
  margin: 30px 0;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.demo-preview {
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.controls {
  margin: 20px 0;
  padding: 15px;
  background: #f0f8ff;
  border-radius: 6px;
}

.control-row {
  display: flex;
  align-items: center;
  margin: 15px 0;
  gap: 10px;
}

.control-row label {
  min-width: 80px;
  font-weight: 500;
  color: #333;
}

.event-section {
  margin-top: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.event-logs {
  max-height: 200px;
  overflow-y: auto;
  margin: 15px 0;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.event-item {
  display: flex;
  gap: 15px;
  padding: 5px 0;
  font-family: monospace;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.event-time {
  color: #666;
  width: 80px;
}

.event-name {
  color: #0066cc;
  font-weight: bold;
  width: 80px;
}

.event-data {
  color: #333;
  flex: 1;
}
</style>