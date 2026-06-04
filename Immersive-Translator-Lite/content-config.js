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

(function () {
  'use strict';

  const SHARED_CONFIG = window.LocalBlockTranslatorSharedConfig;
  const SETTINGS_SCHEMA_VERSION = SHARED_CONFIG.SETTINGS_SCHEMA_VERSION;
  const API_MODES = SHARED_CONFIG.API_MODES;
  const DEFAULT_CONFIG = SHARED_CONFIG.DEFAULT_TRANSLATION_CONFIG;
  const FIELD_TYPES = SHARED_CONFIG.FIELD_TYPES;
  const CONSTANTS = SHARED_CONFIG.CONSTANTS;

  function createConfigClient() {
    const config = { ...DEFAULT_CONFIG };
    const runtimeSettings = {
      version: SETTINGS_SCHEMA_VERSION,
      enabled: true,
      uiTheme: 'system'
    };

    function buildDefaultSettingsPayload() {
      return SHARED_CONFIG.createDefaultSettings();
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
      for (const key of Object.keys(FIELD_TYPES)) {
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
      if (!API_MODES.includes(normalized.apiMode)) {
        normalized.apiMode = DEFAULT_CONFIG.apiMode;
      }
      if (normalized.apiMode === 'openai_compatible') {
        normalized.outputFormat = 'none';
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
