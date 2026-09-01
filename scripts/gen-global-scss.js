// ESM 写法
import fs from 'fs'
import { fileURLToPath } from 'url'

// 解决 __dirname / __filename 在 ESM 不能直接用的问题
const outFile = fileURLToPath(
  new URL('../src/styles/global.scss', import.meta.url)
)

// 生成 global.scss
function generateGlobalScss() {
  // Component SCSS is compiled through its owning SFC so Vue can transform
  // scoped selectors. The global entry contains shared variables only.
  const content = "@forward './variables';\n"
  fs.writeFileSync(outFile, content)
  console.log('✅ Generated global.scss with shared variables only')
}

generateGlobalScss()
