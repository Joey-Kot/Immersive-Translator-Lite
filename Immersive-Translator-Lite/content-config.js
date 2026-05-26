(function () {
  'use strict';

  const SETTINGS_SCHEMA_VERSION = 1;

  const DEFAULT_CONFIG = {
    apiMode: 'responses',
    apiBaseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-xxx',
    model: 'gpt-5.1',
    sourceLang: 'Any Language',
    targetLang: 'Chinese Simplified',
    responseInstructions: '',
    geminiCacheEnabled: true,
    deepSeekThinkingEnabled: true,
    promptCacheKey: '188f6fd3-49ea-4f63-ae50-b87cf9574a1a',
    promptCacheKeyPlaceholder: '111acfce-6ac6-4373-bdcb-61455403f3af',
    promptCacheRetention: '24h',
    reasoningEffort: 'none',
    reasoningSummary: 'auto',
    outputFormat: 'json_schema',
    maxSegmentsPerRequest: 50,
    maxConcurrentRequests: 10,
    maxRequestRetries: 3,
    structuredOutputAutoFallback: true,
    requestCacheEnabled: true,
    requestCacheTimeoutHours: 24,
    hotkey: 'Alt+KeyA',
    multipleSelectionMode: true,
    multipleSelectionModeHotkey: 'Alt',
    multipleSelectionMergeRequest: true,
    enableTouchShortcuts: true,
    doubleTapMaxDelayMs: 280,
    doubleTapMaxMovePx: 24,
    threeFingerCancelEnabled: true,
    debugHotkey: false,
    debugProcessLog: true,
    debugReorder: false,
    debugRequestLog: false,
    debugResponseLog: false,
    showLauncher: false,
    selectionMode: 'sticky',
    notifyOnDuplicateSelection: true,
    scriptBuildId: '',
    requestTimeoutMs: 60000,
    temperature: 0,
    maxOutputTokens: 128000,
    injectIntoIframes: true
  };

  const CONSTANTS = {
    DEFAULT_MAX_SEGMENTS_PER_REQUEST: 50,
    DEFAULT_MAX_CONCURRENT_REQUESTS: 10,
    DEFAULT_MAX_REQUEST_RETRIES: 3,
    DEFAULT_HOTKEY: 'Alt+KeyA',
    DEFAULT_REQUEST_CACHE_TIMEOUT_HOURS: 24,
    RETRY_BASE_DELAY_MS: 500,
    RETRY_MAX_DELAY_MS: 5000,
    REQUEST_CACHE_STORAGE_PREFIX: 'lit_request_cache_v1_'
  };

  function createConfigClient() {
    const config = { ...DEFAULT_CONFIG };
    const runtimeSettings = {
      version: SETTINGS_SCHEMA_VERSION,
      enabled: true,
      uiTheme: 'system'
    };

    function buildDefaultSettingsPayload() {
      return {
        version: SETTINGS_SCHEMA_VERSION,
        enabled: true,
        uiTheme: 'system',
        translationConfig: { ...DEFAULT_CONFIG }
      };
    }

    function normalizeValueByType(rawValue, defaultValue) {
      if (typeof defaultValue === 'boolean') {
        return typeof rawValue === 'boolean' ? rawValue : defaultValue;
      }
      if (typeof defaultValue === 'number') {
        return Number.isFinite(rawValue) ? rawValue : defaultValue;
      }
      if (typeof defaultValue === 'string') {
        return typeof rawValue === 'string' ? rawValue : defaultValue;
      }
      return defaultValue;
    }

    function normalizeTranslationConfig(input) {
      const source = input && typeof input === 'object' ? input : {};
      const normalized = {};
      for (const key of Object.keys(DEFAULT_CONFIG)) {
        normalized[key] = normalizeValueByType(source[key], DEFAULT_CONFIG[key]);
      }
      if (!Object.prototype.hasOwnProperty.call(source, 'promptCacheKeyPlaceholder')) {
        normalized.promptCacheKeyPlaceholder = normalized.promptCacheKey;
      }
      if (!Number.isFinite(normalized.requestCacheTimeoutHours) || normalized.requestCacheTimeoutHours <= 0) {
        normalized.requestCacheTimeoutHours = CONSTANTS.DEFAULT_REQUEST_CACHE_TIMEOUT_HOURS;
      }
      if (!Number.isInteger(normalized.maxRequestRetries) || normalized.maxRequestRetries < 0) {
        normalized.maxRequestRetries = CONSTANTS.DEFAULT_MAX_REQUEST_RETRIES;
      }
      if (!Number.isInteger(normalized.maxConcurrentRequests) || normalized.maxConcurrentRequests <= 0) {
        normalized.maxConcurrentRequests = CONSTANTS.DEFAULT_MAX_CONCURRENT_REQUESTS;
      }
      if (!['responses', 'chat_completions', 'deepseek', 'gemini'].includes(normalized.apiMode)) {
        normalized.apiMode = DEFAULT_CONFIG.apiMode;
      }
      if (!['Alt', 'Ctrl', 'Shift', 'Meta'].includes(normalized.multipleSelectionModeHotkey)) {
        normalized.multipleSelectionModeHotkey = DEFAULT_CONFIG.multipleSelectionModeHotkey;
      }
      return normalized;
    }

    function normalizeSettingsPayload(rawSettings) {
      const base = buildDefaultSettingsPayload();
      const candidate = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
      const translationConfig = normalizeTranslationConfig(candidate.translationConfig);
      const uiTheme = ['light', 'dark', 'system'].includes(candidate.uiTheme) ? candidate.uiTheme : base.uiTheme;
      return {
        version: Number.isFinite(candidate.version) ? candidate.version : base.version,
        enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : base.enabled,
        uiTheme,
        translationConfig
      };
    }

    function applySettingsPayload(settings) {
      const normalized = normalizeSettingsPayload(settings);
      runtimeSettings.version = normalized.version;
      runtimeSettings.enabled = normalized.enabled;
      runtimeSettings.uiTheme = normalized.uiTheme;
      Object.assign(config, normalized.translationConfig);
      return normalized;
    }

    async function loadSettingsFromStorage() {
      if (!chrome?.storage?.sync) {
        return applySettingsPayload(buildDefaultSettingsPayload());
      }

      const defaultSettings = buildDefaultSettingsPayload();
      const stored = await chrome.storage.sync.get({ settings: defaultSettings });
      return applySettingsPayload(stored.settings || defaultSettings);
    }

    return {
      config,
      runtimeSettings,
      constants: CONSTANTS,
      buildDefaultSettingsPayload,
      normalizeTranslationConfig,
      normalizeSettingsPayload,
      applySettingsPayload,
      loadSettingsFromStorage
    };
  }

  window.LocalBlockTranslatorConfig = {
    createConfigClient
  };
})();
