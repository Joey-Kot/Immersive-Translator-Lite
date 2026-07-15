# Immersive Translator Lite

一个独特设计的沉浸式网页翻译工具，当前维护版本为 **Chrome Extension**，油猴脚本 / UserScript 版本已不再维护。

## 1. 支持功能及特性

Chrome 插件版是目前推荐使用的版本，主要支持：

- **多 Provider 支持**：可在设置页选择 `OpenAI Responses`、`OpenAI Completions`、`OpenAI-Compatible`、`DeepSeek`、`Qwen`、`Google`。
- **完整设置页**：按 `System / Language / API / Request / Hotkey / Debug` 分组管理配置。
- **连接测试**：可在模型配置旁直接测试 API 连通性，成功后显示绿色勾选状态。
- **配置导入导出**：支持 JSON 格式导入/导出配置；导入前会二次确认，避免误覆盖当前配置。
- **块级按需翻译**：进入选择模式后，点击页面块即可就地翻译，不需要整页盲翻。
- **原文/译文切换**：已翻译区域再次点击可在原文和译文之间切换。
- **多选批处理**：按住多选修饰键连续选择多个 DOM 块，松开后统一发起翻译。
- **分批与并发控制**：可配置单次请求最大分段数、API 并发请求数、请求超时与最大重试次数。
- **请求结果缓存**：可缓存分批翻译结果，重复翻译相同内容时减少 API 请求。
- **Provider 缓存能力**：OpenAI、Google 支持显式缓存开关。
- **结构化输出与自动降级**：默认使用结构化输出提升稳定性，不兼容时可自动降级重试。
- **复杂 DOM 兼容**：对 custom elements 和高风险重排块自动启用 fallback，降低页面结构错位概率。
- **移动端手势**：支持双击进入选择模式、三指取消（油猴脚本+移动端使用）。
- **调试能力**：可分别开启流程日志、请求日志、响应日志、热键日志和重排日志。

## 2. 设计思路

### 2.1 特性及优点

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

### 2.2 为什么这样设计

- **可回退**：翻译结果与原文共存，用户可随时切回原文，失败时也便于恢复。
- **映射正确**：文本提取时记录 `id + path`，回填时按路径定位，减少“译文串位”。
- **接口兼容**：默认走结构化输出；端点不支持时可自动降级重试。
- **性能可控**：超出 `maxSegmentsPerRequest` 自动拆分，并可通过 `maxConcurrentRequests` 控制并发数量。
- **重复请求可削减**：请求缓存基于 `segments + model + 语言方向 + 指令 + placeholder` 生成键，避免同请求重复请求。
- **缓存收益可持续**：请求前缀尽量保持稳定且足够长，便于命中 Prompt Cache。
- **调试效率**：把日志按热键/流程/reorder/请求/响应拆分，按需开启，不污染控制台。

### 2.3 核心流程与实现方式

1. **进入与退出选择模式**
- 键盘热键默认 `Alt+KeyA` 进入/退出。
- `Esc` 或鼠标右键点击可退出选择模式。
- 触屏默认支持双击进入、三指取消（油猴脚本+移动端使用）。
- 新增指针取消手势：右键或 `Ctrl+左键` 可快速取消选择模式。
- 多选模式开启时，按住多选修饰键（默认 `Alt`）并点击可连续收集多个块，松开按键后批量翻译。

2. **文本提取与路径建模**
- 遍历可翻译文本节点，跳过 `SCRIPT/STYLE/NOSCRIPT/INPUT/TEXTAREA/...` 等区域。
- 为每段文本生成 `seg_x`，并记录到根节点的 `path`，用于后续精确替换。

3. **翻译请求与结果校验**
- 按配置构建对应 Provider 的请求，默认结构化输出。
- 分段超阈值时自动分批，并按配置的并发上限执行，再合并校验。
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

## 3. 安装方式

### 3.1 Chrome Web Store 安装（推荐）

- 商店地址：<https://chromewebstore.google.com/detail/immersive-translator-lite/mohbgokiimlhljckgcgidegkalglnlek>

### 3.2 Chrome 扩展安装（开发者模式）

1. 打开 `chrome://extensions`。
2. 右上角开启“开发者模式（Developer mode）”。
3. 点击“加载已解压的扩展程序（Load unpacked）”。
4. 选择目录：`Immersive-Translator-Lite`。
5. 打开扩展的 `Options` 页面，填写 API 与翻译参数后保存。

扩展设置页已按 `System / Language / API / Request / Hotkey / Debug` 分组，便于快速定位配置项。

## 4. 使用方式

### 4.1 首次配置

至少配置以下 3 项：

- `apiBaseUrl`
- `apiKey`
- `model`

Chrome 插件版还可以在设置页选择 `API Provider`，当前支持：

- `OpenAI Responses`
- `OpenAI Completions`
- `OpenAI-Compatible`
- `DeepSeek`
- `Qwen`
- `Google`

### 4.2 快捷键与手势

默认快捷操作：

- `Alt+KeyA` 或点击插件图标：进入/退出选择模式
- `Esc`、右键或 `Ctrl+左键`：退出选择模式
- 按住多选键（默认 `Alt`）并连续点击多个块：加入批量选择
- 松开多选键：触发批量翻译（可配置为合并请求）

手势触控（仅油猴脚本移动端可用）：

- 双击：进入/退出选择模式
- 三指触控：取消选择模式

### 4.3 典型使用流程

1. 进入选择模式。
2. 点击需要翻译的页面块。
3. 等待右下角 Toast 显示 `Translated N segment(s).`。
4. 再次点击同一区域，在原文/译文之间切换。

### 4.4 特殊配置说明

**Qwen Provider 说明：**

- `Qwen` 走 DashScope REST 接口，请在 `API Endpoint URL` 中填写完整 endpoint，而不是 base URL。
- 纯文本模型（如 `qwen-plus`）使用：
  `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- 多模态模型（如 `qwen3.7-plus` 或 `qwen3-vl-plus`）使用：
  `https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- `Qwen Thinking` 默认关闭；开启后会发送 `enable_thinking`、`thinking_budget`，其中 `Thinking Budget` 默认 `0`。
- Qwen 模式下的 `Reasoning Effort` 会发送为 DashScope `reasoning_effort`，该参数用于控制 DeepSeek-V4 系列推理力度。
- Qwen 的结构化输出不支持 JSON Schema；当 `Output Format` 选择结构化 JSON 时，插件会使用 `response_format: { "type": "json_object" }`，并在系统提示词末尾追加 JSON 输出格式要求。

## 5. 许可证

本项目采用 GNU General Public License v3.0 或更高版本（GPL-3.0-or-later）发布。详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。

## 6. 故障排查

### 6.1 按快捷键没反应

- 检查扩展是否启用。
- 检查热键是否被系统或浏览器占用。
- 尝试改成 `Ctrl+Shift+KeyA` 等组合。

### 6.2 提示 `CONFIG.apiKey is empty`

- 在配置中填入有效 Bearer Token。

### 6.3 提示 HTTP 4xx/5xx

- 检查 `apiBaseUrl` 是否可达。
- 检查模型名与接口权限。
- 打开控制台查看具体错误体。
- `400/401/403/404` 默认不会重试；`429/5xx` 会按 `maxRequestRetries` 进行指数退避重试。

### 6.4 译文结构异常

- 优先使用 `outputFormat: 'json_schema'`。
- 保持 `temperature: 0`。
- 确认 `structuredOutputAutoFallback` 已开启。

### 6.5 custom element 页面显示异常

- 当前已内置 `inline fallback`，会在检测到 custom elements 时自动启用。
- 若仍异常，建议先开启 `debugProcessLog` 和 `debugResponseLog`，再复现并查看控制台日志定位问题。

### 6.6 多选后未触发翻译

- 确认 `multipleSelectionMode` 已开启。
- 确认当前按下的是配置中的 `multipleSelectionModeHotkey`。
- 部分系统会拦截 `Alt/Meta`，可改为 `Ctrl` 或 `Shift` 再测试。

### 6.7 请求缓存相关疑问

- 修改了提示词、模型、源/目标语言后，缓存键会变化，旧缓存不会命中，属于预期行为。
- 如需立即回源重译，可在选项页点击“清空请求缓存”。

### 6.8 看起来有“两次请求”是否正常

- 若当前选中块提取到了 `reorder` 片段，链路会先发一次主翻译请求，再发一次 `reorder` 增强请求。
- 两次请求的输入并不相同：主翻译针对文本节点分段，`reorder` 针对带占位符的块级片段。
- 目的不是重复翻译，而是用第二次结果改善内联标签语序与回填稳定性；若未命中 `reorder` 片段，则不会触发第二次请求。
