# Immersive Translator Lite

一个轻量的沉浸式网页翻译工具，支持 **UserScript** 和 **Chrome Extension** 两种形态。核心目标是：

- 尽量不破坏原页面结构
- 在页面内就地切换原文/译文
- 基于 OpenAI Responses API 做可控、可校验的翻译

## 1. 设计思路

### 1.1 特性及优点

- **块级翻译、按需请求**：选中哪个块就翻译哪个块，避免整页盲翻带来的噪声和开销。
- **结构稳定**：主路径采用“克隆替换 + 原文保留”，尽量减少对原始 DOM 的侵入。
- **语序友好**：内联标签支持占位符重排（reorder enhancement），减少链接、强调等元素错位。
- **重排更稳定**：对包含复杂后代结构的高风险块，自动跳过块级重排并回退到 inline fallback，降低结构错位风险。
- **复杂页面兼容**：遇到 custom elements 自动启用 `inline fallback`，降低克隆方案在 Web Components 页面上的冲突概率。
- **可利用 Token 输入缓存**：通过 Prompt Cache 复用固定前缀，减少重复发送翻译规则带来的输入开销。
- **请求结果缓存**：可缓存分批翻译结果（按内容与上下文哈希），在重复翻译同类片段时减少重复请求。
- **可观测性增强**：新增流程日志、请求日志、响应日志，可快速定位提取、分批、请求与回填问题。
- **移动端可用**：支持双击进入选择模式、三指取消，兼顾触屏场景。
- **多选批处理**：支持按住修饰键连续选择多个 DOM 块，松开后统一发起翻译（可配置为合并请求或并行逐块请求）。

### 1.2 为什么这样设计

- **可回退**：翻译结果与原文共存，用户可随时切回原文，失败时也便于恢复。
- **映射正确**：文本提取时记录 `id + path`，回填时按路径定位，减少“译文串位”。
- **接口兼容**：默认走 `json_schema` 结构化输出；端点不支持时可自动降级重试。
- **性能可控**：超出 `maxSegmentsPerRequest` 自动拆分并发，提升长块翻译稳定性。
- **重复请求可削减**：请求缓存基于 `segments + model + 语言方向 + 指令 + placeholder` 生成键，避免同请求重复请求。
- **缓存收益可持续**：请求前缀尽量保持稳定且足够长，便于命中 Prompt Cache。
- **调试效率**：把日志按热键/流程/reorder/请求/响应拆分，按需开启，不强制污染控制台。

### 1.3 核心流程与实现方式

1. **进入与退出选择模式**
- 键盘热键默认 `Alt+KeyA` 进入/退出。
- `Esc` 或鼠标右键点击可退出选择模式。
- 触屏默认支持双击进入、三指取消。
- 新增指针取消手势：右键或 `Ctrl+左键` 可快速取消选择模式。
- 多选模式开启时，按住多选修饰键（默认 `Alt`）并点击可连续收集多个块，松开按键后批量翻译。

2. **文本提取与路径建模**
- 遍历可翻译文本节点，跳过 `SCRIPT/STYLE/NOSCRIPT/INPUT/TEXTAREA/...` 等区域。
- 为每段文本生成 `seg_x`，并记录到根节点的 `path`，用于后续精确替换。

3. **翻译请求与结果校验**
- 按配置构建 Responses API 请求，默认结构化输出。
- 分段超阈值时自动分批并发，再合并校验。
- 当命中内联占位符重排场景时，会在主翻译（`main translation`）之后追加一次重排增强请求（`reorder translation`）。这是设计内的双阶段链路：前者负责基线译文，后者用于优化带链接/强调等内联标签的语序，并非重复请求。
- 校验项包括：长度一致、`id` 完整、不重复、顺序可重建。
- 可开启请求结果缓存：命中时直接复用缓存译文，未命中才发起请求；缓存项按 TTL（小时）自动过期。
- 选项页支持“一键清空请求缓存”，会同步广播到各页面 frame。
- `Prompt Cache` 支持普通模式与占位符模式分别使用不同缓存键（`promptCacheKey` / `promptCacheKeyPlaceholder`）。
- `Prompt Cache` 生效前提：翻译规则前缀要固定且足够长；默认内置提示词已满足该条件。

4. **渲染分支与切换机制**
- **普通 DOM**：构建译文克隆节点，插入源节点后方并隐藏原文。
- **custom elements 场景**：自动切到 `inline fallback`，在原节点内部插入“原文 span / 译文 span”做显示切换。
- **reorder 风险块场景**：检测到复杂后代结构时，块级重排会主动回退到 inline fallback，减少误替换。
- 已翻译区域再次点击可在原文/译文之间切换。
- 新任务开始前会清理旧翻译痕迹，避免重复堆叠。

---

## 2. 安装方式

### 2.1 Chrome 扩展安装（开发者模式）

1. 打开 `chrome://extensions`。
2. 右上角开启“开发者模式（Developer mode）”。
3. 点击“加载已解压的扩展程序（Load unpacked）”。
4. 选择目录：`Immersive-Translator-Lite`。
5. 打开扩展的 `Options` 页面，填写 API 与翻译参数后保存。

说明：扩展设置页已按 `System / Language / API / Request / Hotkey / Debug` 分组，便于快速定位配置项。

### 2.2 UserScript 安装

支持任何兼容 UserScript 的扩展，常见包括：

- Tampermonkey
- Violentmonkey
- ScriptCat
- Greasemonkey（部分新 API 行为可能有差异）

通用步骤：

1. 浏览器安装任一脚本管理器扩展。
2. 新建脚本。
3. 将 `lite_immersive_translation.js` 全量粘贴后保存。
4. 配置 API 参数并启用脚本。
5. 刷新目标网页。

### 2.3 匹配范围

默认是全站匹配：

- UserScript：`@match *://*/*`
- Chrome Extension：`"matches": ["<all_urls>"]`

建议按需收敛到目标域名，减少误触发。

---

## 3. 使用方式

### 3.1 首次配置

至少配置以下 3 项：

- `apiBaseUrl`
- `apiKey`
- `model`

推荐最小配置示例：

```js
const CONFIG = {
  apiBaseUrl: 'https://api.example.com/v1',
  apiKey: 'sk-xxxx',
  model: 'gpt-5.1',
  sourceLang: 'Any Language',
  targetLang: 'Chinese Simplified',
  hotkey: 'Alt+KeyA',
  promptCacheKey: '188f6fd3-49ea-4f63-ae50-b87cf9574a1a',
  promptCacheKeyPlaceholder: '111acfce-6ac6-4373-bdcb-61455403f3af',
  debugProcessLog: true
};
```

### 3.2 快捷键与手势

默认快捷操作：

- `Alt+KeyA` 或 点击插件图标：进入/退出选择模式
- `Esc`、右键或 `Ctrl+左键`：退出选择模式
- 按住多选键（默认 `Alt`）并连续点击多个块：加入批量选择
- 松开多选键：触发批量翻译（可配置为合并请求）

手势触控（仅移动端可用）：

- 双击：进入/退出选择模式
- 三指触控：取消选择模式

### 3.3 典型使用流程

1. 进入选择模式。
2. 点击需要翻译的页面块。
3. 等待右下角 Toast 显示 `Translated N segment(s).`。
4. 再次点击同一区域，在原文/译文之间切换。

### 3.4 常用配置项说明

高频项：

- `targetLang`：目标语言（如 `Chinese Simplified`）。
- `responseInstructions`：额外系统翻译要求；留空时使用默认规则。
- `selectionMode`：
  - `sticky`：连续选择（默认）
  - `manual`：每次翻译后退出选择模式
- `multipleSelectionMode`：是否启用按修饰键连续多选。
- `multipleSelectionModeHotkey`：多选修饰键（`Alt` / `Ctrl` / `Shift` / `Meta`）。
- `multipleSelectionMergeRequest`：松开多选键后，是否将多个块合并成一次翻译调度（内部仍会按 `maxSegmentsPerRequest` 分批）。
- `notifyOnDuplicateSelection`：重复选中同一正在翻译块时是否提示。
- `requestTimeoutMs`：单次请求超时毫秒。
- `maxSegmentsPerRequest`：单次请求最多携带的段数，超限会自动分批。
- `requestCacheEnabled`：是否启用请求结果缓存。
- `requestCacheTimeoutHours`：请求缓存过期时间（小时）。
- 选项页支持 `Clean Request Cache / 清空请求缓存`，用于主动失效全部缓存。
- `temperature`：翻译建议 `0`。
- `outputFormat`：
  - `json_schema`（默认，结构最稳）
  - `none`（不强制结构化）
- `structuredOutputAutoFallback`：结构化输出失败时自动降级重试。
- `promptCacheKey`：普通翻译请求使用的 Prompt Cache 键。
- `promptCacheKeyPlaceholder`：占位符重排请求使用的 Prompt Cache 键。
- `Prompt Cache` 使用前提：翻译规则前缀需要稳定且长度足够（过短或频繁变化会降低命中率）；默认内置提示词通常已足够长。
- `showLauncher`：右下角显示 `Translate` 调试按钮（独立开关，不依赖 `debugHotkey`）。
- `debugProcessLog`：输出分批、校验、合并、fallback 等流程日志。
- `debugRequestLog`：输出完整请求体 JSON。
- `debugResponseLog`：输出完整响应 JSON。
- `debugHotkey` / `debugReorder`：分别控制热键与重排相关调试日志。

---

## 4. 注意事项

- 必须配置 `apiKey`，否则请求前会直接报错。
- 若接口不兼容 `text.format`，建议保持 `structuredOutputAutoFallback: true`。
- 页面动态更新频繁时，建议先在小范围块上验证效果。
- 遇到强交互区域可再次点击切回原文，再调整选择范围重试。

---

## 5. 故障排查

### 5.1 按快捷键没反应

- 检查脚本/扩展是否启用。
- 检查热键是否被系统或浏览器占用。
- 尝试改成 `Ctrl+Shift+KeyA` 等组合。

### 5.2 提示 `CONFIG.apiKey is empty`

- 在配置中填入有效 Bearer Token。

### 5.3 提示 HTTP 4xx/5xx

- 检查 `apiBaseUrl` 是否可达。
- 检查模型名与接口权限。
- 打开控制台查看具体错误体。

### 5.4 译文结构异常

- 优先使用 `outputFormat: 'json_schema'`。
- 保持 `temperature: 0`。
- 确认 `structuredOutputAutoFallback` 已开启。

### 5.5 custom element 页面显示异常

- 当前已内置 `inline fallback`，会在检测到 custom elements 时自动启用。
- 若仍异常，建议先开启 `debugProcessLog` 和 `debugResponseLog`，再复现并查看控制台日志定位问题。

### 5.6 多选后未触发翻译

- 确认 `multipleSelectionMode` 已开启。
- 确认当前按下的是配置中的 `multipleSelectionModeHotkey`。
- 部分系统会拦截 `Alt/Meta`，可改为 `Ctrl` 或 `Shift` 再测试。

### 5.7 请求缓存相关疑问

- 修改了提示词、模型、源/目标语言后，缓存键会变化，旧缓存不会命中，属于预期行为。
- 如需立即回源重译，可在选项页点击“清空请求缓存”。

### 5.8 看起来有“两次请求”是否正常

- 若当前选中块提取到了 `reorder` 片段，链路会先发一次主翻译请求，再发一次 `reorder` 增强请求。
- 两次请求的输入并不相同：主翻译针对文本节点分段，`reorder` 针对带占位符的块级片段。
- 目的不是重复翻译，而是用第二次结果改善内联标签语序与回填稳定性；若未命中 `reorder` 片段，则不会触发第二次请求。
