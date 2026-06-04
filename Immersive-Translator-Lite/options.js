// Copyright (C) 2026 Joey Kot <joey.kot.x@gmail.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed WITHOUT ANY WARRANTY; without even the
// implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See <https://www.gnu.org/licenses/> for more details.

'use strict';

const SHARED_CONFIG = window.LocalBlockTranslatorSharedConfig;
const SETTINGS_SCHEMA_VERSION = SHARED_CONFIG.SETTINGS_SCHEMA_VERSION;
const API_MODES = SHARED_CONFIG.API_MODES;
const DEFAULT_CONFIG_BASE = SHARED_CONFIG.DEFAULT_TRANSLATION_CONFIG;
const FIELD_TYPES = SHARED_CONFIG.FIELD_TYPES;
const MESSAGE_TYPES = {
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  CLEAR_REQUEST_CACHE: 'CLEAR_REQUEST_CACHE',
  API_REQUEST: 'API_REQUEST'
};
const REQUEST_CACHE_STORAGE_PREFIX = SHARED_CONFIG.CONSTANTS.REQUEST_CACHE_STORAGE_PREFIX;

function getDefaultConfig() {
  return SHARED_CONFIG.createDefaultTranslationConfig({ generateUuid });
}

function getDefaultSettings() {
  return SHARED_CONFIG.createDefaultSettings({ generateUuid });
}

const I18N_TEXT = {
  zh: {
    htmlLang: 'zh-CN',
    documentTitle: '沉浸式翻译设置',
    heading: '沉浸式翻译设置',
    subtitle: '配置将通过 chrome.storage.sync 保存，并应用到所有 frame。',
    sectionTitles: {
      system: 'System Settings',
      language: 'Language Settings',
      api: 'API Settings',
      request: 'Request Settings',
      hotkey: 'Hotkey Settings',
      debug: 'Debug Settings'
    },
    buttons: {
      save: '保存设置',
      reset: '重置设置',
      generate: '生成',
      cleanCache: '清空缓存',
      testConnection: '测试连接',
      testingConnection: '测试中',
      importConfig: '导入配置',
      exportConfig: '导出配置',
      googleSync: 'Google Sync',
      syncing: '同步中',
      show: '显示',
      hide: '隐藏',
      cancel: '取消',
      confirmReset: '确认重置',
      confirmImport: '确认导入'
    },
    status: {
      saved: '设置已保存。',
      resetDone: '已恢复默认设置并保存。',
      cacheCleared: '请求缓存已清空。',
      connectionOk: '连接测试成功。',
      connectionFailedPrefix: '连接测试失败',
      connectionMissingConfig: '请先填写 API 端点地址、访问令牌和模型名称。',
      connectionInvalidBaseUrl: 'API 端点地址必须是完整的 http(s) URL。',
      connectionInvalidResponse: 'API 返回格式不符合当前 Provider。',
      configExported: '配置已导出为 JSON。',
      configImported: '配置已导入并保存。',
      configImportCanceled: '已取消导入配置。',
      configImportInvalid: '配置文件不是有效的 JSON 设置。',
      configExportFailedPrefix: '导出配置失败',
      configImportFailedPrefix: '导入配置失败',
      googleSyncDone: '当前本地配置已强制覆盖 chrome.storage.sync。',
      googleSyncFailedPrefix: 'Google Sync 失败',
      saveFailedPrefix: '保存失败',
      cacheClearFailedPrefix: '清空缓存失败',
      initFailedPrefix: '初始化失败',
      apiEndpointPreviewLabel: '完整请求地址',
      apiEndpointPreviewEmpty: '填写 API 端点地址后会显示自动拼接的完整请求地址。',
      qwenEndpointPreviewEmpty:
        'Qwen 需要填写完整 API Endpoint URL，例如纯文本 generation 或多模态 generation 地址。'
    },
    dialogs: {
      resetTitle: '确认重置设置',
      resetConfirm: '确定要将所有配置重置为默认值吗？此操作会立即覆盖当前设置。',
      cleanCacheTitle: '确认清空缓存',
      cleanCacheConfirm: '确定要清空请求缓存吗？此操作会删除所有已缓存翻译结果。',
      importTitle: '确认导入配置',
      importConfirm: '导入 JSON 配置会覆盖当前所有配置。确定要继续吗？'
    },
    labels: {
      enabled: '插件开关',
      uiTheme: '主题',
      apiMode: 'API Provider',
      injectIntoIframes: '在 iframe 中生效',
      apiBaseUrl: 'API 端点地址',
      apiKey: '访问令牌',
      model: '模型名称',
      sourceLang: '源语言',
      targetLang: '目标语言',
      hotkey: '开始/结束选择快捷键',
      selectionMode: '选择模式',
      multipleSelectionMode: '多选模式',
      multipleSelectionModeHotkey: '多选模式按键',
      multipleSelectionMergeRequest: '多选合并请求',
      temperature: 'Temperature',
      maxOutputTokens: '最大输出 Token 数',
      maxConcurrentRequests: 'API 并发请求数',
      requestTimeoutSeconds: 'Request Timeout (Second)',
      maxSegmentsPerRequest: '单次请求最大分段数',
      maxRequestRetries: '最大请求重试次数',
      requestCacheEnabled: '请求缓存',
      requestCacheTimeoutHours: '请求缓存超时（小时）',
      cleanRequestCache: '清空请求缓存',
      outputFormat: '输出格式',
      reasoningEffort: '推理强度',
      reasoningSummary: 'Reasoning Summary',
      googleCacheEnabled: 'Google 缓存',
      deepSeekThinkingEnabled: 'DeepSeek 思考模式',
      qwenThinkingEnabled: 'Qwen Thinking',
      qwenThinkingBudget: 'Thinking Budget',
      promptCacheKey: '提示词缓存键（普通模式）',
      promptCacheKeyPlaceholder: '提示词缓存键（占位符模式）',
      promptCacheRetention: '缓存保留时长',
      structuredOutputAutoFallback: '结构化输出自动降级',
      enableTouchShortcuts: '触控快捷操作',
      threeFingerCancelEnabled: '三指取消',
      doubleTapMaxDelayMs: '双击最大间隔（毫秒）',
      doubleTapMaxMovePx: '双击最大位移（像素）',
      notifyOnDuplicateSelection: '重复选择提醒',
      showLauncher: '显示调试按钮',
      debugHotkey: '热键调试日志',
      debugProcessLog: '流程调试日志',
      debugReorder: '重排调试日志',
      debugRequestLog: 'Request Log',
      debugResponseLog: 'Response Log',
      responseInstructions: '额外系统指令'
    },
    switchTexts: {
      enabled: '启用翻译插件',
      injectIntoIframes: '允许在所有注入 frame 中运行',
      structuredOutputAutoFallback: '结构化输出失败时自动降级一次',
      multipleSelectionMode: '按住多选键可连续选择多个 DOM 块',
      multipleSelectionMergeRequest: '松开多选键后将已选块合并翻译请求',
      requestCacheEnabled: '开启请求结果缓存',
      googleCacheEnabled: '启用 Google System Instructions 缓存',
      deepSeekThinkingEnabled: '启用 DeepSeek thinking',
      qwenThinkingEnabled: '启用 Qwen thinking',
      enableTouchShortcuts: '双击进入、三指取消',
      threeFingerCancelEnabled: '三指触控取消选择模式',
      notifyOnDuplicateSelection: '重复选中时提示',
      showLauncher: '显示页面调试启动按钮',
      debugHotkey: '输出热键调试日志',
      debugProcessLog: '输出分批/校验流程调试日志',
      debugReorder: '输出重排翻译调试日志',
      debugRequestLog: '输出完整请求体 JSON 到控制台',
      debugResponseLog: '输出完整返回值 JSON 到控制台'
    },
    tooltips: {
      qwenApiEndpoint:
        '纯文本模型（如 qwen-plus）：https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation\n多模态模型（如 qwen3.7-plus 或 qwen3-vl-plus）：https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      qwenThinkingBudget:
        '用于 Qwen3.7、Qwen3.6、Qwen3.5、Qwen3-VL、Qwen3 的商业版与开源版模型。',
      reasoningEffort: 'Qwen Provider 下该参数用于控制 DeepSeek-V4 系列的推理力度。'
    },
    placeholders: {
      apiBaseUrl: 'https://api.example.com/v1',
      qwenApiEndpoint:
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    },
    options: {
      uiTheme: {
        system: '跟随系统',
        light: '浅色模式',
        dark: '夜间模式'
      },
      apiMode: {
        responses: 'OpenAI Responses',
        chat_completions: 'OpenAI Completions',
        openai_compatible: 'OpenAI-Compatible',
        deepseek: 'DeepSeek',
        qwen: 'Qwen',
        google: 'Google'
      },
      selectionMode: {
        sticky: '连续选择（sticky）',
        manual: '单次退出（manual）'
      },
      multipleSelectionModeHotkey: {
        Alt: 'Alt',
        Ctrl: 'Ctrl',
        Shift: 'Shift',
        Meta: 'Meta'
      },
      outputFormat: {
        json_schema: '结构化 JSON（推荐）',
        none: '不限制（纯文本）'
      },
      reasoningEffort: {
        none: 'none（关闭）',
        minimal: 'minimal（极低）',
        low: 'low（低）',
        medium: 'medium（中）',
        high: 'high（高）',
        max: 'max（最高）',
        xhigh: 'xhigh（极高）'
      },
      reasoningSummary: {
        auto: 'auto（自动）',
        concise: 'concise（简略）',
        detailed: 'detailed（详细）'
      },
      promptCacheRetention: {
        in_memory: 'in_memory（仅内存）',
        '24h': '24h（24小时）'
      }
    }
  },
  en: {
    htmlLang: 'en',
    documentTitle: 'Immersive Translator Lite Settings',
    heading: 'Immersive Translator Lite Settings',
    subtitle: 'Settings are stored in chrome.storage.sync and applied to every frame.',
    sectionTitles: {
      system: 'System Settings',
      language: 'Language Settings',
      api: 'API Settings',
      request: 'Request Settings',
      hotkey: 'Hotkey Settings',
      debug: 'Debug Settings'
    },
    buttons: {
      save: 'Save Settings',
      reset: 'Reset Settings',
      generate: 'Generate',
      cleanCache: 'Clean Cache',
      testConnection: 'Test Connection',
      testingConnection: 'Testing',
      importConfig: 'Import Config',
      exportConfig: 'Export Config',
      googleSync: 'Google Sync',
      syncing: 'Syncing',
      show: 'Show',
      hide: 'Hide',
      cancel: 'Cancel',
      confirmReset: 'Reset Now',
      confirmImport: 'Import Now'
    },
    status: {
      saved: 'Settings saved.',
      resetDone: 'Settings were reset to defaults and saved.',
      cacheCleared: 'Request cache cleared.',
      connectionOk: 'Connection test succeeded.',
      connectionFailedPrefix: 'Connection test failed',
      connectionMissingConfig: 'Fill in the API endpoint URL, access token, and model name first.',
      connectionInvalidBaseUrl: 'API endpoint URL must be a full http(s) URL.',
      connectionInvalidResponse: 'API response does not match the selected Provider.',
      configExported: 'Config exported as JSON.',
      configImported: 'Config imported and saved.',
      configImportCanceled: 'Config import canceled.',
      configImportInvalid: 'The selected file is not valid JSON settings.',
      configExportFailedPrefix: 'Export config failed',
      configImportFailedPrefix: 'Import config failed',
      googleSyncDone: 'Current local config has overwritten chrome.storage.sync.',
      googleSyncFailedPrefix: 'Google Sync failed',
      saveFailedPrefix: 'Save failed',
      cacheClearFailedPrefix: 'Clear cache failed',
      initFailedPrefix: 'Initialization failed',
      apiEndpointPreviewLabel: 'Full Request URL',
      apiEndpointPreviewEmpty: 'Enter an API endpoint URL to preview the full request URL.',
      qwenEndpointPreviewEmpty:
        'Qwen requires the complete API Endpoint URL, such as the text generation or multimodal generation endpoint.'
    },
    dialogs: {
      resetTitle: 'Confirm Reset',
      resetConfirm: 'Reset all settings to defaults? This will immediately overwrite current settings.',
      cleanCacheTitle: 'Confirm Cache Clear',
      cleanCacheConfirm: 'Clear request cache now? This will remove all cached translation results.',
      importTitle: 'Confirm Import',
      importConfirm: 'Importing JSON config will overwrite all current settings. Continue?'
    },
    labels: {
      enabled: 'Extension Enable',
      uiTheme: 'Theme',
      apiMode: 'API Provider',
      injectIntoIframes: 'Enable in iFrames',
      apiBaseUrl: 'API Endpoint URL',
      apiKey: 'Access Token',
      model: 'Model Name',
      sourceLang: 'Source Language',
      targetLang: 'Target Language',
      hotkey: 'Selection Mode Hotkey',
      selectionMode: 'Selection Mode',
      multipleSelectionMode: 'Multiple Selection Mode',
      multipleSelectionModeHotkey: 'Multiple Selection Mode Hotkey',
      multipleSelectionMergeRequest: 'Multiple Selection Merge Request',
      temperature: 'Temperature',
      maxOutputTokens: 'Max Output Tokens',
      maxConcurrentRequests: 'API Concurrent Requests',
      requestTimeoutSeconds: 'Request Timeout (Second)',
      maxSegmentsPerRequest: 'Max Segments Per Request',
      maxRequestRetries: 'Maximum Request Retries',
      requestCacheEnabled: 'Request Cache',
      requestCacheTimeoutHours: 'Request Cache Timeout (hours)',
      cleanRequestCache: 'Clean Request Cache',
      outputFormat: 'Output Format',
      reasoningEffort: 'Reasoning Effort',
      reasoningSummary: 'Reasoning Summary',
      googleCacheEnabled: 'Google Cache',
      deepSeekThinkingEnabled: 'DeepSeek Thinking',
      qwenThinkingEnabled: 'Qwen Thinking',
      qwenThinkingBudget: 'Thinking Budget',
      promptCacheKey: 'Prompt Cache Key (Normal Mode)',
      promptCacheKeyPlaceholder: 'Prompt Cache Key (Placeholder Mode)',
      promptCacheRetention: 'Cache Retention Duration',
      structuredOutputAutoFallback: 'Structured Output Auto Fallback',
      enableTouchShortcuts: 'Touch Shortcuts',
      threeFingerCancelEnabled: 'Three-Finger Cancel',
      doubleTapMaxDelayMs: 'Double-Tap Max Delay (ms)',
      doubleTapMaxMovePx: 'Double-Tap Max Move (px)',
      notifyOnDuplicateSelection: 'Duplicate Selection Notice',
      showLauncher: 'Show Debug Launcher',
      debugHotkey: 'Hotkey Debug Log',
      debugProcessLog: 'Process Debug Log',
      debugReorder: 'Reorder Debug Log',
      debugRequestLog: 'Request Log',
      debugResponseLog: 'Response Log',
      responseInstructions: 'System Instructions'
    },
    switchTexts: {
      enabled: 'Enable translator extension',
      injectIntoIframes: 'Run in every injected frame',
      structuredOutputAutoFallback: 'Retry once without structured output when unsupported',
      multipleSelectionMode: 'Hold a modifier key to select multiple DOM blocks',
      multipleSelectionMergeRequest: 'Merge selected blocks into one translation dispatch on key release',
      requestCacheEnabled: 'Enable request result cache',
      googleCacheEnabled: 'Enable Google System Instructions cache',
      deepSeekThinkingEnabled: 'Enable DeepSeek thinking',
      qwenThinkingEnabled: 'Enable Qwen thinking',
      enableTouchShortcuts: 'Double-tap to enter, three-finger to cancel',
      threeFingerCancelEnabled: 'Allow three-finger touch to cancel selection mode',
      notifyOnDuplicateSelection: 'Show warning for duplicate selections',
      showLauncher: 'Show page debug launcher button',
      debugHotkey: 'Print hotkey debug logs',
      debugProcessLog: 'Print batching/validation process logs',
      debugReorder: 'Print reorder debug logs',
      debugRequestLog: 'Print full request body JSON to console',
      debugResponseLog: 'Print full response JSON to console'
    },
    tooltips: {
      qwenApiEndpoint:
        'Text models, such as qwen-plus: https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation\nMultimodal models, such as qwen3.7-plus or qwen3-vl-plus: https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      qwenThinkingBudget:
        'For Qwen3.7, Qwen3.6, Qwen3.5, Qwen3-VL, and Qwen3 commercial/open-source models.',
      reasoningEffort: 'For Qwen Provider, this DashScope parameter controls DeepSeek-V4 reasoning effort.'
    },
    placeholders: {
      apiBaseUrl: 'https://api.example.com/v1',
      qwenApiEndpoint:
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    },
    options: {
      uiTheme: {
        system: 'System',
        light: 'Light',
        dark: 'Dark'
      },
      apiMode: {
        responses: 'OpenAI Responses',
        chat_completions: 'OpenAI Completions',
        openai_compatible: 'OpenAI-Compatible',
        deepseek: 'DeepSeek',
        qwen: 'Qwen',
        google: 'Google'
      },
      selectionMode: {
        sticky: 'Sticky (continuous selection)',
        manual: 'Manual (exit after each selection)'
      },
      multipleSelectionModeHotkey: {
        Alt: 'Alt',
        Ctrl: 'Ctrl',
        Shift: 'Shift',
        Meta: 'Meta'
      },
      outputFormat: {
        json_schema: 'Structured JSON (recommended)',
        none: 'Unrestricted (plain text)'
      },
      reasoningEffort: {
        none: 'none (off)',
        minimal: 'minimal',
        low: 'low',
        medium: 'medium',
        high: 'high',
        max: 'max',
        xhigh: 'xhigh'
      },
      reasoningSummary: {
        auto: 'auto',
        concise: 'concise',
        detailed: 'detailed'
      },
      promptCacheRetention: {
        in_memory: 'in_memory (memory only)',
        '24h': '24h'
      }
    }
  }
};

let currentLocale = 'zh';
let isApiKeyVisible = false;

const OPENAI_REASONING_EFFORT_VALUES = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];
const GOOGLE_REASONING_EFFORT_VALUES = ['minimal', 'low', 'medium', 'high'];
const DEEPSEEK_REASONING_EFFORT_VALUES = ['high', 'max'];
const QWEN_REASONING_EFFORT_VALUES = ['high', 'max'];

function normalizeValueByType(rawValue, defaultValue, type) {
  if (type === 'boolean') {
    return typeof rawValue === 'boolean' ? rawValue : defaultValue;
  }

  if (type === 'number') {
    return Number.isFinite(rawValue) ? rawValue : defaultValue;
  }

  return typeof rawValue === 'string' ? rawValue : defaultValue;
}

function normalizeSettings(input) {
  const defaults = getDefaultConfig();
  const source = input && typeof input === 'object' ? input : {};
  const result = {
    version: Number.isFinite(source.version) ? source.version : SETTINGS_SCHEMA_VERSION,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
    uiTheme: ['light', 'dark', 'system'].includes(source.uiTheme) ? source.uiTheme : 'system',
    translationConfig: {}
  };

  const sourceConfig =
    source.translationConfig && typeof source.translationConfig === 'object' ? source.translationConfig : {};

  for (const [key, type] of Object.entries(FIELD_TYPES)) {
    result.translationConfig[key] = normalizeValueByType(sourceConfig[key], defaults[key], type);
  }
  if (!Object.prototype.hasOwnProperty.call(sourceConfig, 'promptCacheKeyPlaceholder')) {
    result.translationConfig.promptCacheKeyPlaceholder = result.translationConfig.promptCacheKey;
  }
  if (!['auto', 'concise', 'detailed'].includes(result.translationConfig.reasoningSummary)) {
    result.translationConfig.reasoningSummary = defaults.reasoningSummary;
  }
  if (!API_MODES.includes(result.translationConfig.apiMode)) {
    result.translationConfig.apiMode = defaults.apiMode;
  }
  if (result.translationConfig.apiMode === 'openai_compatible') {
    result.translationConfig.outputFormat = 'none';
  }
  if (
    !Number.isFinite(result.translationConfig.qwenThinkingBudget) ||
    result.translationConfig.qwenThinkingBudget <= 0
  ) {
    result.translationConfig.qwenThinkingBudget = defaults.qwenThinkingBudget;
  }
  if (!['in_memory', '24h'].includes(result.translationConfig.promptCacheRetention)) {
    result.translationConfig.promptCacheRetention = defaults.promptCacheRetention;
  }
  if (!['Alt', 'Ctrl', 'Shift', 'Meta'].includes(result.translationConfig.multipleSelectionModeHotkey)) {
    result.translationConfig.multipleSelectionModeHotkey = defaults.multipleSelectionModeHotkey;
  }
  if (
    !Number.isFinite(result.translationConfig.requestCacheTimeoutHours) ||
    result.translationConfig.requestCacheTimeoutHours <= 0
  ) {
    result.translationConfig.requestCacheTimeoutHours = defaults.requestCacheTimeoutHours;
  }
  if (
    !Number.isInteger(result.translationConfig.maxConcurrentRequests) ||
    result.translationConfig.maxConcurrentRequests <= 0
  ) {
    result.translationConfig.maxConcurrentRequests = defaults.maxConcurrentRequests;
  }
  if (
    !Number.isInteger(result.translationConfig.maxRequestRetries) ||
    result.translationConfig.maxRequestRetries < 0
  ) {
    result.translationConfig.maxRequestRetries = defaults.maxRequestRetries;
  }

  return result;
}

function getValueForField(field, type) {
  if (type === 'boolean') return Boolean(field.checked);
  if (type === 'number') {
    const parsed = Number(field.value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return field.value;
}

function setFieldValue(field, value, type) {
  if (type === 'boolean') {
    field.checked = Boolean(value);
    return;
  }
  field.value = value == null ? '' : String(value);
  syncCustomSelect(field);
  syncCustomTextarea(field);
}

function detectLocale() {
  const preferred = String(navigator.language || '').toLowerCase();
  return preferred.startsWith('zh') ? 'zh' : 'en';
}

function detectMobileDevice() {
  const uaData = navigator.userAgentData;
  if (uaData && typeof uaData.mobile === 'boolean') {
    return uaData.mobile;
  }

  const hasTouchPoints = Number(navigator.maxTouchPoints) > 0;
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return hasTouchPoints && hasCoarsePointer;
}

function applyTouchSettingsVisibility(isMobileDevice) {
  const touchSettingFields = document.querySelectorAll('[data-touch-setting="true"]');
  for (const field of touchSettingFields) {
    field.hidden = !isMobileDevice;
  }
}

function getTextBundle() {
  return I18N_TEXT[currentLocale] || I18N_TEXT.zh;
}

function getCustomSelectState(select) {
  return select?._customSelectState || null;
}

function getSelectOptionText(select) {
  return select.selectedOptions[0]?.textContent || select.options[0]?.textContent || '';
}

function closeCustomSelect(select) {
  const state = getCustomSelectState(select);
  if (!state) return;
  state.wrapper.classList.remove('open');
  state.button.setAttribute('aria-expanded', 'false');
  state.wrapper.closest('.group-card')?.classList.remove('has-open-select');
}

function closeOtherCustomSelects(currentSelect) {
  for (const select of document.querySelectorAll('select')) {
    if (select !== currentSelect) {
      closeCustomSelect(select);
    }
  }
}

function syncCustomSelect(select) {
  const state = getCustomSelectState(select);
  if (!state) return;

  state.value.textContent = getSelectOptionText(select);
  state.button.disabled = select.disabled;
  state.menu.replaceChildren(
    ...Array.from(select.options).map((option) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'custom-select-option';
      item.dataset.value = option.value;
      item.textContent = option.textContent;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', option.selected ? 'true' : 'false');
      item.disabled = option.disabled;
      item.hidden = option.hidden;
      item.addEventListener('click', () => {
        if (select.value !== option.value) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        syncCustomSelect(select);
        closeCustomSelect(select);
        state.button.focus();
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeCustomSelect(select);
          state.button.focus();
          return;
        }

        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const options = Array.from(state.menu.querySelectorAll('.custom-select-option:not([disabled])'));
        const currentIndex = options.indexOf(item);
        const nextIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? options.length - 1
              : event.key === 'ArrowUp'
                ? Math.max(0, currentIndex - 1)
                : Math.min(options.length - 1, currentIndex + 1);
        options[nextIndex]?.focus();
      });
      return item;
    })
  );
}

function enhanceSelect(select) {
  if (!select || getCustomSelectState(select)) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'custom-select-button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');

  const value = document.createElement('span');
  value.className = 'custom-select-value';

  const arrow = document.createElement('span');
  arrow.className = 'custom-select-arrow';
  arrow.setAttribute('aria-hidden', 'true');

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');

  button.append(value, arrow);
  select.before(wrapper);
  wrapper.append(select, button, menu);
  select.classList.add('native-select');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  select._customSelectState = { wrapper, button, value, menu };

  button.addEventListener('click', () => {
    const isOpen = wrapper.classList.contains('open');
    closeOtherCustomSelects(select);
    wrapper.classList.toggle('open', !isOpen);
    button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    wrapper.closest('.group-card')?.classList.toggle('has-open-select', !isOpen);
  });

  button.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    closeOtherCustomSelects(select);
    wrapper.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    wrapper.closest('.group-card')?.classList.add('has-open-select');

    const selectedOption = stateForSelectOption(menu, true);
    const firstOption = stateForSelectOption(menu, false);
    const optionToFocus = event.key === 'ArrowUp' ? selectedOption || firstOption : firstOption || selectedOption;
    optionToFocus?.focus();
  });

  select.addEventListener('change', () => {
    syncCustomSelect(select);
  });

  syncCustomSelect(select);
}

function stateForSelectOption(menu, selectedOnly) {
  const selector = selectedOnly
    ? '.custom-select-option[aria-selected="true"]:not([disabled])'
    : '.custom-select-option:not([disabled])';
  return menu.querySelector(selector);
}

function enhanceSelects() {
  for (const select of document.querySelectorAll('select')) {
    enhanceSelect(select);
  }
}

function getCustomTextareaState(textarea) {
  return textarea?._customTextareaState || null;
}

function syncCustomTextarea(textarea) {
  const state = getCustomTextareaState(textarea);
  if (!state) return;

  requestAnimationFrame(() => {
    const maxScroll = textarea.scrollHeight - textarea.clientHeight;
    if (maxScroll <= 1) {
      state.wrapper.classList.add('no-scroll');
      state.thumb.style.height = '0px';
      state.thumb.style.transform = 'translateY(0)';
      return;
    }

    state.wrapper.classList.remove('no-scroll');
    const trackHeight = state.track.clientHeight;
    const thumbHeight = Math.max(36, Math.round((textarea.clientHeight / textarea.scrollHeight) * trackHeight));
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const thumbTop = Math.round((textarea.scrollTop / maxScroll) * maxThumbTop);
    state.thumb.style.height = `${thumbHeight}px`;
    state.thumb.style.transform = `translateY(${thumbTop}px)`;
  });
}

function enhanceTextarea(textarea) {
  if (!textarea || getCustomTextareaState(textarea)) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-textarea';

  const track = document.createElement('div');
  track.className = 'custom-textarea-scrollbar';
  track.setAttribute('aria-hidden', 'true');

  const thumb = document.createElement('div');
  thumb.className = 'custom-textarea-thumb';

  textarea.before(wrapper);
  wrapper.append(textarea, track);
  track.append(thumb);
  textarea.classList.add('custom-textarea-input');

  textarea._customTextareaState = { wrapper, track, thumb };

  textarea.addEventListener('scroll', () => syncCustomTextarea(textarea));
  textarea.addEventListener('input', () => syncCustomTextarea(textarea));

  thumb.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startScrollTop = textarea.scrollTop;
    const maxScroll = textarea.scrollHeight - textarea.clientHeight;
    const maxThumbTop = track.clientHeight - thumb.offsetHeight;
    if (maxScroll <= 0 || maxThumbTop <= 0) return;

    const onPointerMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      textarea.scrollTop = startScrollTop + (deltaY / maxThumbTop) * maxScroll;
      syncCustomTextarea(textarea);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      thumb.classList.remove('dragging');
    };

    thumb.classList.add('dragging');
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  });

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => syncCustomTextarea(textarea));
    observer.observe(textarea);
    textarea._customTextareaResizeObserver = observer;
  }

  syncCustomTextarea(textarea);
}

function enhanceTextareas() {
  for (const textarea of document.querySelectorAll('textarea')) {
    enhanceTextarea(textarea);
  }
}

function applySelectOptionTexts(selectId, optionMap) {
  const select = document.getElementById(selectId);
  if (!select || !optionMap) return;
  for (const option of select.options) {
    if (optionMap[option.value]) {
      option.textContent = optionMap[option.value];
    }
  }
  syncCustomSelect(select);
}

function getReasoningEffortValuesForApiMode(apiMode) {
  if (apiMode === 'deepseek') return DEEPSEEK_REASONING_EFFORT_VALUES;
  if (apiMode === 'qwen') return QWEN_REASONING_EFFORT_VALUES;
  if (apiMode === 'google') return GOOGLE_REASONING_EFFORT_VALUES;
  return OPENAI_REASONING_EFFORT_VALUES;
}

function getDefaultReasoningEffortForApiMode(apiMode) {
  if (apiMode === 'deepseek') return 'high';
  if (apiMode === 'qwen') return 'high';
  if (apiMode === 'google') return 'medium';
  return DEFAULT_CONFIG_BASE.reasoningEffort;
}

function applyReasoningEffortOptions(apiMode, preferredValue) {
  const select = document.getElementById('reasoningEffort');
  if (!select) return;

  const values = getReasoningEffortValuesForApiMode(apiMode);
  const labels = getTextBundle().options.reasoningEffort;
  const currentValue = preferredValue ?? select.value;
  select.replaceChildren(
    ...values.map((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = labels[value] || value;
      return option;
    })
  );
  select.value = values.includes(currentValue) ? currentValue : getDefaultReasoningEffortForApiMode(apiMode);
  syncCustomSelect(select);
}

function createHelpTooltip(text) {
  const tooltip = document.createElement('span');
  tooltip.className = 'help-tooltip';
  tooltip.setAttribute('tabindex', '0');
  tooltip.setAttribute('aria-label', text);

  const icon = document.createElement('span');
  icon.className = 'help-tooltip-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '?';

  const bubble = document.createElement('span');
  bubble.className = 'help-tooltip-bubble';
  bubble.setAttribute('role', 'tooltip');
  bubble.textContent = text;

  tooltip.append(icon, bubble);
  return tooltip;
}

function setLabelText(fieldId, text) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const label = field.closest('.field')?.querySelector('.label');
  if (!label) return;
  label.textContent = text;
}

function setLabelTooltip(fieldId, text, tooltipText) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const label = field.closest('.field')?.querySelector('.label');
  if (!label) return;
  label.replaceChildren(document.createTextNode(text), createHelpTooltip(tooltipText));
}

function applyI18n() {
  const text = getTextBundle();
  document.documentElement.lang = text.htmlLang;
  document.title = text.documentTitle;
  document.getElementById('pageTitle').textContent = text.heading;
  document.getElementById('pageSubtitle').textContent = text.subtitle;
  document.getElementById('groupTitleSystem').textContent = text.sectionTitles.system;
  document.getElementById('groupTitleLanguage').textContent = text.sectionTitles.language;
  document.getElementById('groupTitleApi').textContent = text.sectionTitles.api;
  document.getElementById('groupTitleRequest').textContent = text.sectionTitles.request;
  document.getElementById('groupTitleHotkey').textContent = text.sectionTitles.hotkey;
  document.getElementById('groupTitleDebug').textContent = text.sectionTitles.debug;
  document.getElementById('saveBtn').textContent = text.buttons.save;
  document.getElementById('resetBtn').textContent = text.buttons.reset;
  document.getElementById('importConfigBtn').textContent = text.buttons.importConfig;
  document.getElementById('exportConfigBtn').textContent = text.buttons.exportConfig;
  document.getElementById('googleSyncBtn').textContent = text.buttons.googleSync;
  document.getElementById('generatePromptCacheKey').textContent = text.buttons.generate;
  document.getElementById('generatePromptCacheKeyPlaceholder').textContent = text.buttons.generate;
  document.getElementById('cleanRequestCache').textContent = text.buttons.cleanCache;
  document.getElementById('testConnectionBtn').textContent = text.buttons.testConnection;
  document.getElementById('apiEndpointPreviewLabel').textContent = text.status.apiEndpointPreviewLabel;
  document.getElementById('confirmTitle').textContent = text.dialogs.resetTitle;
  document.getElementById('confirmCancelBtn').textContent = text.buttons.cancel;
  document.getElementById('confirmOkBtn').textContent = text.buttons.confirmReset;

  const toggleButton = document.getElementById('toggleApiKey');
  toggleButton.textContent = isApiKeyVisible ? text.buttons.hide : text.buttons.show;

  for (const [fieldId, labelText] of Object.entries(text.labels)) {
    setLabelText(fieldId, labelText);
  }

  for (const [fieldId, switchText] of Object.entries(text.switchTexts)) {
    const field = document.getElementById(fieldId);
    if (!field) continue;
    const wrapper = field.closest('.field');
    const switchLabel = wrapper?.querySelector('.switch-text');
    if (switchLabel) switchLabel.textContent = switchText;
  }

  for (const [fieldId, tooltip] of Object.entries(text.tooltips || {})) {
    if (fieldId === 'reasoningEffort' || fieldId === 'qwenApiEndpoint') continue;
    setLabelTooltip(fieldId, text.labels[fieldId], tooltip);
  }

  document.getElementById('apiBaseUrl').placeholder = text.placeholders.apiBaseUrl;

  applySelectOptionTexts('uiTheme', text.options.uiTheme);
  applySelectOptionTexts('apiMode', text.options.apiMode);
  applySelectOptionTexts('selectionMode', text.options.selectionMode);
  applySelectOptionTexts('multipleSelectionModeHotkey', text.options.multipleSelectionModeHotkey);
  applySelectOptionTexts('outputFormat', text.options.outputFormat);
  applyReasoningEffortOptions(document.getElementById('apiMode')?.value || DEFAULT_CONFIG_BASE.apiMode);
  applySelectOptionTexts('reasoningSummary', text.options.reasoningSummary);
  applySelectOptionTexts('promptCacheRetention', text.options.promptCacheRetention);
}

function openConfirmDialog(message, titleText, okText) {
  const overlay = document.getElementById('confirmOverlay');
  const titleEl = document.getElementById('confirmTitle');
  const messageEl = document.getElementById('confirmMessage');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const okBtn = document.getElementById('confirmOkBtn');

  titleEl.textContent = titleText || getTextBundle().dialogs.resetTitle;
  messageEl.textContent = message;
  okBtn.textContent = okText || getTextBundle().buttons.confirmReset;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  okBtn.focus();

  return new Promise((resolve) => {
    let done = false;

    const cleanup = (result) => {
      if (done) return;
      done = true;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown, true);
      resolve(result);
    };

    const onCancel = () => cleanup(false);
    const onOk = () => cleanup(true);
    const onOverlayClick = (event) => {
      if (event.target === overlay) {
        cleanup(false);
      }
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup(false);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        cleanup(true);
      }
    };

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown, true);
  });
}

function applyTheme(themeMode) {
  const root = document.documentElement;
  if (themeMode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    root.dataset.theme = themeMode;
  }
}

function applyApiModeVisibility(apiMode) {
  applyReasoningEffortOptions(apiMode);
  const text = getTextBundle();
  const isChatCompletions = apiMode === 'chat_completions';
  const isOpenAiCompatible = apiMode === 'openai_compatible';
  const isDeepSeek = apiMode === 'deepseek';
  const isQwen = apiMode === 'qwen';
  const isGoogle = apiMode === 'google';
  const isDeepSeekThinkingOff =
    isDeepSeek && document.getElementById('deepSeekThinkingEnabled')?.checked === false;
  const isQwenThinkingOff =
    isQwen && document.getElementById('qwenThinkingEnabled')?.checked === false;
  const apiBaseUrl = document.getElementById('apiBaseUrl');
  if (apiBaseUrl) {
    apiBaseUrl.placeholder = isQwen ? text.placeholders.qwenApiEndpoint : text.placeholders.apiBaseUrl;
  }
  if (isQwen) {
    setLabelTooltip('apiBaseUrl', text.labels.apiBaseUrl, text.tooltips.qwenApiEndpoint);
  } else {
    setLabelText('apiBaseUrl', text.labels.apiBaseUrl);
  }
  if (isOpenAiCompatible) {
    const outputFormat = document.getElementById('outputFormat');
    if (outputFormat) {
      outputFormat.value = 'none';
      syncCustomSelect(outputFormat);
    }
  }

  const reasoningEffortFields = document.querySelectorAll('[data-reasoning-effort-field="true"]');
  for (const field of reasoningEffortFields) {
    field.hidden = isDeepSeekThinkingOff || isQwenThinkingOff;
    if (isQwen) {
      setLabelTooltip('reasoningEffort', text.labels.reasoningEffort, text.tooltips.reasoningEffort);
    } else {
      setLabelText('reasoningEffort', text.labels.reasoningEffort);
    }
  }

  const responsesOnlyFields = document.querySelectorAll('[data-responses-only="true"]');
  for (const field of responsesOnlyFields) {
    field.hidden = isChatCompletions || isOpenAiCompatible || isDeepSeek || isQwen || isGoogle;
  }

  const googleOnlyFields = document.querySelectorAll('[data-google-only="true"]');
  for (const field of googleOnlyFields) {
    field.hidden = !isGoogle;
  }

  const qwenOnlyFields = document.querySelectorAll('[data-qwen-only="true"]');
  for (const field of qwenOnlyFields) {
    field.hidden = !isQwen;
  }

  const qwenThinkingOnlyFields = document.querySelectorAll('[data-qwen-thinking-only="true"]');
  for (const field of qwenThinkingOnlyFields) {
    field.hidden = !isQwen || isQwenThinkingOff;
  }

  const deepSeekOnlyFields = document.querySelectorAll('[data-deepseek-only="true"]');
  for (const field of deepSeekOnlyFields) {
    field.hidden = !isDeepSeek;
  }

  const noPromptCacheFields = document.querySelectorAll('[data-no-prompt-cache="true"]');
  for (const field of noPromptCacheFields) {
    field.hidden = isGoogle || isDeepSeek || isQwen || isOpenAiCompatible;
  }

  const deepSeekHiddenFields = document.querySelectorAll('[data-deepseek-hidden="true"]');
  for (const field of deepSeekHiddenFields) {
    field.hidden = isDeepSeek || isQwen || isOpenAiCompatible;
  }

  const openAiCompatibleHiddenFields = document.querySelectorAll('[data-openai-compatible-hidden="true"]');
  for (const field of openAiCompatibleHiddenFields) {
    field.hidden = isOpenAiCompatible;
  }

  updateApiEndpointPreview();
}

function showStatus(text, isError) {
  const stack = document.getElementById('status');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : 'success'}`;
  toast.style.setProperty('--toast-index', String(stack.children.length));
  toast.setAttribute('role', isError ? 'alert' : 'status');

  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = isError ? '!' : '✓';

  const message = document.createElement('span');
  message.className = 'toast-message';
  message.textContent = text;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'toast-close';
  closeButton.setAttribute('aria-label', 'Dismiss notification');
  closeButton.textContent = '×';

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.add('leaving');
    window.setTimeout(() => {
      toast.remove();
      updateToastStack();
    }, 180);
  };

  closeButton.addEventListener('click', dismiss);
  toast.append(icon, message, closeButton);
  stack.prepend(toast);
  updateToastStack();

  window.setTimeout(dismiss, 5000);
}

function updateToastStack() {
  const stack = document.getElementById('status');
  if (!stack) return;
  Array.from(stack.children).forEach((toast, index) => {
    const layer = Math.min(index, 3);
    toast.style.setProperty('--toast-index', String(index));
    toast.style.setProperty('--toast-stack-y', `${layer * 13}px`);
    toast.style.setProperty('--toast-stack-inset', `${layer * 5}px`);
    toast.style.setProperty('--toast-expanded-y', `${index * 58}px`);
  });
}

function setConnectionTestState(state) {
  const result = document.getElementById('connectionTestResult');
  result.className = 'connection-test-result';
  result.removeAttribute('title');
  result.removeAttribute('aria-label');

  if (state === 'success') {
    const message = getTextBundle().status.connectionOk;
    result.classList.add('success');
    result.title = message;
    result.setAttribute('aria-label', message);
  } else if (state === 'failed') {
    const message = getTextBundle().status.connectionFailedPrefix;
    result.classList.add('failed');
    result.title = message;
    result.setAttribute('aria-label', message);
  }
}

function updateApiEndpointPreview() {
  const preview = document.getElementById('apiEndpointPreview');
  if (!preview) return;

  const apiBaseUrl = String(document.getElementById('apiBaseUrl')?.value || '').trim();
  const model = String(document.getElementById('model')?.value || '').trim();
  const apiMode = document.getElementById('apiMode')?.value || DEFAULT_CONFIG_BASE.apiMode;
  preview.classList.remove('invalid');

  if (!apiBaseUrl) {
    preview.textContent =
      apiMode === 'qwen'
        ? getTextBundle().status.qwenEndpointPreviewEmpty
        : getTextBundle().status.apiEndpointPreviewEmpty;
    return;
  }

  try {
    validateConnectionTestBaseUrl(apiBaseUrl);
    preview.textContent = buildConnectionTestEndpoint(apiBaseUrl, model, apiMode);
  } catch (error) {
    preview.classList.add('invalid');
    preview.textContent = String(error?.message || error);
  }
}

function generateUuid() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function clearRequestCacheStorage() {
  if (!chrome?.storage?.local) return 0;
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((key) => key.startsWith(REQUEST_CACHE_STORAGE_PREFIX));
  if (!keys.length) return 0;
  await chrome.storage.local.remove(keys);
  return keys.length;
}

async function clearRequestCache() {
  const response = await chrome.runtime
    .sendMessage({
      type: MESSAGE_TYPES.CLEAR_REQUEST_CACHE
    })
    .catch(() => null);
  if (response && response.ok) {
    return Number.isFinite(response.clearedCount) ? response.clearedCount : 0;
  }
  return clearRequestCacheStorage();
}

async function testConnection(config) {
  const apiBaseUrl = String(config.apiBaseUrl || '').trim();
  const apiKey = String(config.apiKey || '').trim();
  const model = String(config.model || '').trim();
  const apiMode = API_MODES.includes(config.apiMode) ? config.apiMode : 'responses';

  if (!apiBaseUrl || !apiKey || !model) {
    throw new Error(getTextBundle().status.connectionMissingConfig);
  }

  const timeoutSeconds = Number.isFinite(config.requestTimeoutSeconds) && config.requestTimeoutSeconds > 0
    ? config.requestTimeoutSeconds
    : DEFAULT_CONFIG_BASE.requestTimeoutSeconds;
  const timeoutMs = timeoutSeconds * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  validateConnectionTestBaseUrl(apiBaseUrl);
  const endpoint = buildConnectionTestEndpoint(apiBaseUrl, model, apiMode);
  const requestBody = buildConnectionTestRequestBody(model, apiMode, config);
  const headers = buildConnectionTestHeaders(apiKey, apiMode);

  try {
    const response = await sendApiRequestViaBackground(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    }, timeoutMs);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const json = await response.json().catch(() => null);
    validateConnectionTestResponse(json, apiMode);
  } finally {
    clearTimeout(timer);
  }
}

async function sendApiRequestViaBackground(endpoint, fetchOptions, timeoutMs) {
  if (!chrome?.runtime?.sendMessage) {
    throw new Error('Extension background API proxy is unavailable.');
  }

  const signal = fetchOptions.signal;
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  let abortHandler = null;
  const abortPromise = new Promise((_, reject) => {
    if (!signal) return;
    abortHandler = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
    signal.addEventListener('abort', abortHandler, { once: true });
  });

  const requestPromise = chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.API_REQUEST,
    payload: {
      endpoint,
      method: fetchOptions.method || 'POST',
      headers: fetchOptions.headers || {},
      body: fetchOptions.body,
      timeoutMs
    }
  });

  let proxyResult = null;
  try {
    proxyResult = await Promise.race(signal ? [requestPromise, abortPromise] : [requestPromise]);
  } finally {
    if (signal && abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
  }

  if (!proxyResult?.ok) {
    throw new Error(proxyResult?.error || 'Extension background API proxy failed.');
  }

  return createProxyResponse(proxyResult.response);
}

function createProxyResponse(responsePayload) {
  const payload = responsePayload && typeof responsePayload === 'object' ? responsePayload : {};
  return {
    ok: Boolean(payload.ok),
    status: Number.isFinite(payload.status) ? payload.status : 0,
    statusText: typeof payload.statusText === 'string' ? payload.statusText : '',
    headers: payload.headers || {},
    async text() {
      return typeof payload.text === 'string' ? payload.text : '';
    },
    async json() {
      if (payload.json !== null && typeof payload.json !== 'undefined') {
        return payload.json;
      }
      const text = typeof payload.text === 'string' ? payload.text : '';
      return JSON.parse(text);
    }
  };
}

function validateConnectionTestBaseUrl(apiBaseUrl) {
  let url = null;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw new Error(getTextBundle().status.connectionInvalidBaseUrl);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(getTextBundle().status.connectionInvalidBaseUrl);
  }
}

function buildConnectionTestEndpoint(apiBaseUrl, model, apiMode) {
  const baseUrl = apiBaseUrl.replace(/\/$/, '');
  if (apiMode === 'google') {
    return `${baseUrl}/${formatGoogleModelPath(model)}:generateContent`;
  }
  if (apiMode === 'qwen') {
    return baseUrl;
  }
  const endpointPath =
    apiMode === 'chat_completions' || apiMode === 'openai_compatible' || apiMode === 'deepseek'
      ? 'chat/completions'
      : 'responses';
  return `${baseUrl}/${endpointPath}`;
}

function formatGoogleModelPath(model) {
  const trimmed = String(model || '').trim().replace(/^\/+/, '');
  return trimmed.startsWith('models/') ? trimmed : `models/${trimmed}`;
}

function buildConnectionTestRequestBody(model, apiMode, config) {
  if (apiMode === 'google') {
    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'ping' }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 16
      }
    };
  }

  if (apiMode === 'qwen') {
    const parameters = {
      result_format: 'message',
      response_format: {
        type: 'text'
      },
      max_completion_tokens: 16,
      enable_thinking: config?.qwenThinkingEnabled === true
    };
    if (config?.qwenThinkingEnabled === true) {
      const thinkingBudget = Number.isFinite(config?.qwenThinkingBudget)
        ? Math.max(1, Math.floor(config.qwenThinkingBudget))
        : DEFAULT_CONFIG_BASE.qwenThinkingBudget;
      const reasoningEffort = String(config?.reasoningEffort || '').trim().toLowerCase();
      parameters.thinking_budget = thinkingBudget;
      parameters.reasoning_effort = reasoningEffort === 'max' ? 'max' : 'high';
      parameters.max_completion_tokens = thinkingBudget + 16;
    }
    if (Number.isFinite(config?.temperature)) {
      parameters.temperature = config.temperature;
    }
    return {
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: 'ping'
          }
        ]
      },
      parameters
    };
  }

  if (apiMode === 'openai_compatible') {
    const requestBody = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'ping'
        }
      ],
      temperature: Number.isFinite(config?.temperature) ? config.temperature : DEFAULT_CONFIG_BASE.temperature,
      max_tokens: 16
    };
    const reasoningEffort = String(config?.reasoningEffort || '').trim().toLowerCase();
    if (reasoningEffort && reasoningEffort !== 'none') {
      requestBody.reasoning_effort = reasoningEffort;
    }
    return requestBody;
  }

  if (apiMode === 'chat_completions' || apiMode === 'deepseek') {
    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: 'ping'
        }
      ],
      ...(apiMode === 'deepseek' ? { max_tokens: 16 } : { max_completion_tokens: 16 })
    };
    if (apiMode === 'deepseek') {
      const reasoningEffort = String(config?.reasoningEffort || '').trim().toLowerCase();
      const thinkingEnabled = config?.deepSeekThinkingEnabled !== false && reasoningEffort !== 'none';
      requestBody.thinking = {
        type: thinkingEnabled ? 'enabled' : 'disabled'
      };
      if (thinkingEnabled) {
        requestBody.reasoning_effort = reasoningEffort === 'max' || reasoningEffort === 'xhigh' ? 'max' : 'high';
      }
    }
    return requestBody;
  }

  return {
    model,
    input: 'ping',
    max_output_tokens: 16
  };
}

function buildConnectionTestHeaders(apiKey, apiMode) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiMode === 'google') {
    headers['x-goog-api-key'] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function validateConnectionTestResponse(json, apiMode) {
  if (!json || typeof json !== 'object') {
    throw new Error(getTextBundle().status.connectionInvalidResponse);
  }

  let isValid = false;
  if (apiMode === 'google') {
    isValid = Array.isArray(json.candidates);
  } else if (apiMode === 'qwen') {
    isValid =
      Array.isArray(json?.output?.choices) &&
      json.output.choices.some((choice) => {
        const message = choice?.message;
        return message && typeof message === 'object' && Object.prototype.hasOwnProperty.call(message, 'content');
      });
    if (!isValid) {
      isValid = typeof json?.output?.text === 'string';
    }
  } else if (apiMode === 'chat_completions' || apiMode === 'openai_compatible' || apiMode === 'deepseek') {
    isValid =
      Array.isArray(json.choices) &&
      json.choices.some((choice) => {
        const message = choice?.message;
        return message && typeof message === 'object' && Object.prototype.hasOwnProperty.call(message, 'content');
      });
  } else {
    isValid =
      typeof json.output_text === 'string' ||
      Array.isArray(json.output) ||
      Object.prototype.hasOwnProperty.call(json, 'output');
  }

  if (!isValid) {
    throw new Error(getTextBundle().status.connectionInvalidResponse);
  }
}

async function readSettings() {
  const result = await chrome.storage.sync.get({ settings: getDefaultSettings() });
  return normalizeSettings(result.settings);
}

function populateForm(settings) {
  setFieldValue(document.getElementById('enabled'), settings.enabled, 'boolean');
  setFieldValue(document.getElementById('uiTheme'), settings.uiTheme, 'string');

  for (const [key, type] of Object.entries(FIELD_TYPES)) {
    const field = document.getElementById(key);
    if (!field) continue;
    setFieldValue(field, settings.translationConfig[key], type);
  }
  applyReasoningEffortOptions(settings.translationConfig.apiMode, settings.translationConfig.reasoningEffort);

  applyTheme(settings.uiTheme);
  applyApiModeVisibility(settings.translationConfig.apiMode);
  updateApiEndpointPreview();
}

function collectFormSettings() {
  const settings = {
    version: SETTINGS_SCHEMA_VERSION,
    enabled: Boolean(document.getElementById('enabled').checked),
    uiTheme: document.getElementById('uiTheme').value,
    translationConfig: {}
  };

  for (const [key, type] of Object.entries(FIELD_TYPES)) {
    const field = document.getElementById(key);
    if (!field) continue;
    const value = getValueForField(field, type);
    settings.translationConfig[key] = value;
  }

  return normalizeSettings(settings);
}

function isObjectRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeImportedSettings(input) {
  if (!isObjectRecord(input)) {
    throw new Error(getTextBundle().status.configImportInvalid);
  }

  if (isObjectRecord(input.translationConfig)) {
    return normalizeSettings(input);
  }

  const hasTranslationConfigFields = Object.keys(FIELD_TYPES).some((key) =>
    Object.prototype.hasOwnProperty.call(input, key)
  );
  if (hasTranslationConfigFields) {
    const currentSettings = collectFormSettings();
    return normalizeSettings({
      ...currentSettings,
      translationConfig: {
        ...currentSettings.translationConfig,
        ...input
      }
    });
  }

  throw new Error(getTextBundle().status.configImportInvalid);
}

function getConfigExportFileName() {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  return `immersive-translator-lite-config-${timestamp}.json`;
}

function exportConfig() {
  const settings = collectFormSettings();
  const blob = new Blob([`${JSON.stringify(settings, null, 2)}\n`], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getConfigExportFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showStatus(getTextBundle().status.configExported, false);
}

async function persistImportedSettings(settings) {
  await chrome.storage.sync.set({ settings });
  populateForm(settings);
  setConnectionTestState('idle');
  showStatus(getTextBundle().status.configImported, false);
  await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SETTINGS_UPDATED,
    settings
  }).catch(() => {});
}

async function importConfigFromFile(file) {
  if (!file) {
    showStatus(getTextBundle().status.configImportCanceled, false);
    return;
  }

  const text = await file.text();
  const parsed = JSON.parse(text);
  const settings = normalizeImportedSettings(parsed);
  await persistImportedSettings(settings);
}

async function saveSettings() {
  const settings = collectFormSettings();
  await chrome.storage.sync.set({ settings });
  applyTheme(settings.uiTheme);
  showStatus(getTextBundle().status.saved, false);
  await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SETTINGS_UPDATED,
    settings
  }).catch(() => {});
}

async function forceGoogleSyncSettings() {
  const settings = collectFormSettings();
  await chrome.storage.sync.set({ settings });
  applyTheme(settings.uiTheme);
  setConnectionTestState('idle');
  showStatus(getTextBundle().status.googleSyncDone, false);
  await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SETTINGS_UPDATED,
    settings
  }).catch(() => {});
}

async function resetSettings() {
  const defaults = normalizeSettings(getDefaultSettings());
  await chrome.storage.sync.set({ settings: defaults });
  populateForm(defaults);
  isApiKeyVisible = false;
  document.getElementById('apiKey').type = 'password';
  document.getElementById('toggleApiKey').textContent = getTextBundle().buttons.show;
  showStatus(getTextBundle().status.resetDone, false);
  await chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.SETTINGS_UPDATED,
    settings: defaults
  }).catch(() => {});
}

function bindUI() {
  const saveButton = document.getElementById('saveBtn');

  saveButton.addEventListener('click', async () => {
    try {
      await saveSettings();
    } catch (error) {
      console.error('[LIT Options] save failed:', error);
      showStatus(`${getTextBundle().status.saveFailedPrefix}: ${String(error?.message || error)}`, true);
    }
  });

  document.getElementById('resetBtn').addEventListener('click', async () => {
    const confirmed = await openConfirmDialog(
      getTextBundle().dialogs.resetConfirm,
      getTextBundle().dialogs.resetTitle
    );
    if (!confirmed) {
      return;
    }
    try {
      await resetSettings();
    } catch (error) {
      console.error('[LIT Options] reset failed:', error);
      showStatus(`${getTextBundle().status.saveFailedPrefix}: ${String(error?.message || error)}`, true);
    }
  });

  document.getElementById('importConfigBtn').addEventListener('click', async () => {
    const text = getTextBundle();
    const confirmed = await openConfirmDialog(
      text.dialogs.importConfirm,
      text.dialogs.importTitle,
      text.buttons.confirmImport
    );
    if (!confirmed) {
      return;
    }
    document.getElementById('importConfigInput').click();
  });

  document.getElementById('importConfigInput').addEventListener('change', async (event) => {
    const input = event.target;
    const file = input.files?.[0] || null;
    input.value = '';
    if (!file) {
      return;
    }

    try {
      await importConfigFromFile(file);
    } catch (error) {
      console.error('[LIT Options] import config failed:', error);
      showStatus(`${getTextBundle().status.configImportFailedPrefix}: ${String(error?.message || error)}`, true);
    }
  });

  document.getElementById('exportConfigBtn').addEventListener('click', () => {
    try {
      exportConfig();
    } catch (error) {
      console.error('[LIT Options] export config failed:', error);
      showStatus(`${getTextBundle().status.configExportFailedPrefix}: ${String(error?.message || error)}`, true);
    }
  });

  document.getElementById('googleSyncBtn').addEventListener('click', async () => {
    const button = document.getElementById('googleSyncBtn');
    const text = getTextBundle();
    button.disabled = true;
    button.textContent = text.buttons.syncing;

    try {
      await forceGoogleSyncSettings();
    } catch (error) {
      console.error('[LIT Options] Google Sync failed:', error);
      showStatus(`${text.status.googleSyncFailedPrefix}: ${String(error?.message || error)}`, true);
    } finally {
      button.disabled = false;
      button.textContent = getTextBundle().buttons.googleSync;
    }
  });

  document.getElementById('toggleApiKey').addEventListener('click', () => {
    const input = document.getElementById('apiKey');
    const button = document.getElementById('toggleApiKey');
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    isApiKeyVisible = reveal;
    button.textContent = reveal ? getTextBundle().buttons.hide : getTextBundle().buttons.show;
  });

  document.getElementById('generatePromptCacheKey').addEventListener('click', () => {
    const input = document.getElementById('promptCacheKey');
    input.value = generateUuid();
  });

  document.getElementById('generatePromptCacheKeyPlaceholder').addEventListener('click', () => {
    const input = document.getElementById('promptCacheKeyPlaceholder');
    input.value = generateUuid();
  });

  document.getElementById('testConnectionBtn').addEventListener('click', async () => {
    const button = document.getElementById('testConnectionBtn');
    const text = getTextBundle();
    setConnectionTestState('idle');
    button.disabled = true;
    button.textContent = text.buttons.testingConnection;

    try {
      await testConnection(collectFormSettings().translationConfig);
      setConnectionTestState('success');
      showStatus(text.status.connectionOk, false);
    } catch (error) {
      console.error('[LIT Options] connection test failed:', error);
      setConnectionTestState('failed');
      showStatus(`${text.status.connectionFailedPrefix}: ${String(error?.message || error)}`, true);
    } finally {
      button.disabled = false;
      button.textContent = getTextBundle().buttons.testConnection;
    }
  });

  for (const fieldId of ['apiBaseUrl', 'apiKey', 'model']) {
    document.getElementById(fieldId).addEventListener('input', () => {
      setConnectionTestState('idle');
      if (fieldId === 'apiBaseUrl' || fieldId === 'model') {
        updateApiEndpointPreview();
      }
    });
  }
  for (const fieldId of ['reasoningEffort', 'deepSeekThinkingEnabled', 'qwenThinkingEnabled']) {
    document.getElementById(fieldId).addEventListener('change', () => {
      applyApiModeVisibility(document.getElementById('apiMode').value);
      setConnectionTestState('idle');
    });
  }

  document.getElementById('cleanRequestCache').addEventListener('click', async () => {
    const confirmed = await openConfirmDialog(
      getTextBundle().dialogs.cleanCacheConfirm,
      getTextBundle().dialogs.cleanCacheTitle
    );
    if (!confirmed) {
      return;
    }
    try {
      const clearedCount = await clearRequestCache();
      showStatus(`${getTextBundle().status.cacheCleared} (${clearedCount})`, false);
    } catch (error) {
      console.error('[LIT Options] clear request cache failed:', error);
      showStatus(`${getTextBundle().status.cacheClearFailedPrefix}: ${String(error?.message || error)}`, true);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOtherCustomSelects(null);
      return;
    }

    if (event.isComposing) return;
    if (event.key.toLowerCase() !== 's') return;
    if (!event.ctrlKey && !event.metaKey) return;

    event.preventDefault();
    saveButton.click();
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('.custom-select')) return;
    closeOtherCustomSelects(null);
  });

  document.getElementById('uiTheme').addEventListener('change', (event) => {
    applyTheme(event.target.value);
  });

  document.getElementById('apiMode').addEventListener('change', (event) => {
    applyApiModeVisibility(event.target.value);
    setConnectionTestState('idle');
    updateApiEndpointPreview();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const mode = document.getElementById('uiTheme').value;
    if (mode === 'system') {
      applyTheme('system');
    }
  });
}

async function init() {
  currentLocale = detectLocale();
  applyTouchSettingsVisibility(detectMobileDevice());
  applyI18n();
  enhanceSelects();
  enhanceTextareas();
  bindUI();
  const settings = await readSettings();
  populateForm(settings);
}

init().catch((error) => {
  console.error('[LIT Options] init failed:', error);
  showStatus(`${getTextBundle().status.initFailedPrefix}: ${String(error?.message || error)}`, true);
});
