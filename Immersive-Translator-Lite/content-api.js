(function () {
  'use strict';

  const DEFAULT_PROMPT_CACHE_KEY = '188f6fd3-49ea-4f63-ae50-b87cf9574a1a';
  const DEFAULT_PROMPT_CACHE_KEY_PLACEHOLDER = 'eecc9c28-f3c4-4c1c-b8c0-7722c19faeaf';
  const DEFAULT_PROMPT_CACHE_RETENTION = '24h';
  const DEFAULT_REASONING_EFFORT = 'medium';
  const DEFAULT_REASONING_SUMMARY = 'auto';
  const DEFAULT_OUTPUT_FORMAT = 'json_schema';
  const DEFAULT_STRUCTURED_OUTPUT_AUTO_FALLBACK = true;
  const GOOGLE_SYSTEM_CACHE_STORAGE_PREFIX = 'lit_google_system_cache_v1_';
  const API_MODES = window.LocalBlockTranslatorSharedConfig?.API_MODES || [
    'responses',
    'chat_completions',
    'openai_compatible',
    'deepseek',
    'google'
  ];
  const MESSAGE_TYPES = {
    API_REQUEST: 'API_REQUEST'
  };

  function createApiClient(deps) {
    const CONFIG = deps.config;
    const sha256Hex = deps.sha256Hex;
    const getErrorMessage = deps.getErrorMessage;
    const notify = deps.notify;
    let googleSystemCacheUnavailable = false;

    function resetRuntimeState() {
      googleSystemCacheUnavailable = false;
    }

    async function buildTranslationRequestBody(prompt, instructions, options) {
      const apiMode = normalizeApiMode(CONFIG.apiMode);
      const opts = options || {};
      const isPlaceholderMode = opts.placeholderRules === true;
      const promptCacheKeyNormal = (CONFIG.promptCacheKey || '').trim() || DEFAULT_PROMPT_CACHE_KEY;
      const promptCacheKeyPlaceholder =
        (CONFIG.promptCacheKeyPlaceholder || '').trim() || DEFAULT_PROMPT_CACHE_KEY_PLACEHOLDER;
      const promptCacheKey = isPlaceholderMode ? promptCacheKeyPlaceholder : promptCacheKeyNormal;
      const promptCacheRetention =
        (CONFIG.promptCacheRetention || '').trim() || DEFAULT_PROMPT_CACHE_RETENTION;
      const reasoningEffort = (CONFIG.reasoningEffort || '').trim() || DEFAULT_REASONING_EFFORT;
      const reasoningSummary = (CONFIG.reasoningSummary || '').trim() || DEFAULT_REASONING_SUMMARY;
      const outputFormat = (CONFIG.outputFormat || '').trim() || DEFAULT_OUTPUT_FORMAT;

      if (apiMode === 'google') {
        const requestBody = {
          contents: buildGoogleContents(prompt),
          generationConfig: buildGoogleGenerationConfig(outputFormat, reasoningEffort)
        };

        await attachGoogleSystemInstruction(requestBody, instructions);
        return requestBody;
      }

      if (apiMode === 'chat_completions') {
        const requestBody = {
          model: CONFIG.model,
          messages: buildChatCompletionsMessages(prompt, instructions),
          prompt_cache_key: promptCacheKey,
          prompt_cache_retention: promptCacheRetention,
          reasoning_effort: reasoningEffort,
          temperature: CONFIG.temperature,
          max_completion_tokens: CONFIG.maxOutputTokens
        };

        if (outputFormat === 'json_schema') {
          requestBody.response_format = {
            type: 'json_schema',
            json_schema: buildChatCompletionsJsonSchema()
          };
        }

        return requestBody;
      }

      if (apiMode === 'openai_compatible') {
        const requestBody = {
          model: CONFIG.model,
          messages: buildOpenAiCompatibleMessages(prompt, instructions),
          temperature: CONFIG.temperature,
          max_tokens: CONFIG.maxOutputTokens
        };

        if (reasoningEffort && reasoningEffort !== 'none') {
          requestBody.reasoning_effort = reasoningEffort;
        }

        return requestBody;
      }

      if (apiMode === 'deepseek') {
        const requestBody = {
          model: CONFIG.model,
          messages: buildDeepSeekMessages(prompt, instructions),
          thinking: buildDeepSeekThinking(reasoningEffort),
          temperature: CONFIG.temperature,
          max_tokens: CONFIG.maxOutputTokens
        };
        const deepSeekReasoningEffort = !isDeepSeekThinkingEnabled(reasoningEffort)
          ? ''
          : buildDeepSeekReasoningEffort(reasoningEffort);
        if (deepSeekReasoningEffort) {
          requestBody.reasoning_effort = deepSeekReasoningEffort;
        }

        requestBody.response_format = {
          type: outputFormat === 'json_schema' ? 'json_object' : 'text'
        };

        return requestBody;
      }

      const requestBody = {
        model: CONFIG.model,
        instructions,
        input: prompt,
        prompt_cache_key: promptCacheKey,
        prompt_cache_retention: promptCacheRetention,
        reasoning: {
          effort: reasoningEffort,
          summary: reasoningSummary
        },
        temperature: CONFIG.temperature,
        max_output_tokens: CONFIG.maxOutputTokens
      };

      if (outputFormat === 'json_schema') {
        requestBody.text = {
          format: buildTranslationJsonSchemaFormat()
        };
      }

      return requestBody;
    }

    async function callTranslationAPI(requestBody) {
      if (!CONFIG.apiKey) {
        throw new Error('CONFIG.apiKey is empty. Please set your API key first.');
      }

      const controller = new AbortController();
      const timeoutMs = getRequestTimeoutMs();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const apiMode = normalizeApiMode(CONFIG.apiMode);
      const endpoint = buildTranslationEndpoint(apiMode);

      try {
        const json = await postTranslationRequest(endpoint, controller.signal, requestBody, { apiMode });
        const content = extractTranslationOutputText(json, apiMode);
        if (!content) {
          throw new Error(`${getApiModeDisplayName(apiMode)} response missing output text`);
        }

        return content;
      } catch (error) {
        if (shouldRetryWithoutGoogleThinking(error, requestBody, apiMode)) {
          const fallbackBody = cloneWithoutGoogleThinking(requestBody);
          console.warn('[LocalBlockTranslator] Google thinkingConfig unsupported, retrying once without thinking config');
          const json = await postTranslationRequest(endpoint, controller.signal, fallbackBody, { apiMode });
          const content = extractTranslationOutputText(json, apiMode);
          if (!content) {
            throw new Error(`${getApiModeDisplayName(apiMode)} response missing output text`);
          }
          return content;
        }

        if (!shouldRetryWithoutStructuredOutput(error, requestBody)) {
          throw error;
        }

        const fallbackBody = cloneWithoutStructuredOutput(requestBody);
        notify('Structured output unsupported by endpoint. Falling back to plain JSON mode once.', 'warn');
        console.warn('[LocalBlockTranslator] structured output unsupported, retrying once without structured output config');
        const json = await postTranslationRequest(endpoint, controller.signal, fallbackBody, { apiMode });
        const content = extractTranslationOutputText(json, apiMode);
        if (!content) {
          throw new Error(`${getApiModeDisplayName(apiMode)} response missing output text`);
        }
        return content;
      } finally {
        clearTimeout(timer);
      }
    }

    function buildChatCompletionsMessages(prompt, instructions) {
      const messages = [];
      const instructionText = String(instructions || '').trim();
      if (instructionText) {
        messages.push({
          role: 'developer',
          content: instructionText
        });
      }
      messages.push({
        role: 'user',
        content: extractChatCompletionsUserContent(prompt)
      });
      return messages;
    }

    function buildDeepSeekMessages(prompt, instructions) {
      const messages = [];
      const instructionText = String(instructions || '').trim();
      if (instructionText) {
        messages.push({
          role: 'system',
          content: instructionText
        });
      }
      messages.push({
        role: 'user',
        content: extractChatCompletionsUserContent(prompt)
      });
      return messages;
    }

    function buildOpenAiCompatibleMessages(prompt, instructions) {
      const messages = [];
      const instructionText = String(instructions || '').trim();
      if (instructionText) {
        messages.push({
          role: 'system',
          content: instructionText
        });
      }
      messages.push({
        role: 'user',
        content: extractChatCompletionsUserContent(prompt)
      });
      return messages;
    }

    function buildDeepSeekThinking(reasoningEffort) {
      return {
        type: isDeepSeekThinkingEnabled(reasoningEffort) ? 'enabled' : 'disabled'
      };
    }

    function isDeepSeekThinkingEnabled(reasoningEffort) {
      if (CONFIG.deepSeekThinkingEnabled === false) return false;
      return String(reasoningEffort || '').trim().toLowerCase() !== 'none';
    }

    function buildDeepSeekReasoningEffort(reasoningEffort) {
      const effort = String(reasoningEffort || '').trim().toLowerCase();
      if (effort === 'none') return '';
      return effort === 'max' || effort === 'xhigh' ? 'max' : 'high';
    }

    function extractChatCompletionsUserContent(prompt) {
      if (typeof prompt === 'string') {
        return prompt;
      }

      const chunks = [];
      if (Array.isArray(prompt)) {
        for (const message of prompt) {
          collectTextContent(message?.content, chunks);
          if (typeof message?.text === 'string') {
            chunks.push(message.text);
          }
        }
      } else if (prompt && typeof prompt === 'object') {
        collectTextContent(prompt.content, chunks);
        if (typeof prompt.text === 'string') {
          chunks.push(prompt.text);
        }
      }

      const text = chunks.join('\n').trim();
      if (text) {
        return text;
      }

      try {
        return JSON.stringify(prompt);
      } catch {
        return String(prompt || '');
      }
    }

    function collectTextContent(content, chunks) {
      if (typeof content === 'string') {
        chunks.push(content);
        return;
      }
      if (!Array.isArray(content)) {
        return;
      }
      for (const item of content) {
        if (typeof item === 'string') {
          chunks.push(item);
        } else if (typeof item?.text === 'string') {
          chunks.push(item.text);
        }
      }
    }

    function normalizeApiMode(apiMode) {
      return API_MODES.includes(apiMode) ? apiMode : 'responses';
    }

    function buildGoogleContents(prompt) {
      return [
        {
          role: 'user',
          parts: [
            {
              text: extractChatCompletionsUserContent(prompt)
            }
          ]
        }
      ];
    }

    function buildGoogleGenerationConfig(outputFormat, reasoningEffort) {
      const generationConfig = {
        temperature: CONFIG.temperature,
        maxOutputTokens: CONFIG.maxOutputTokens,
        thinkingConfig: buildGoogleThinkingConfig(reasoningEffort)
      };

      if (outputFormat === 'json_schema') {
        generationConfig.responseMimeType = 'application/json';
        generationConfig.responseSchema = buildGoogleResponseSchema();
      }

      return generationConfig;
    }

    function buildGoogleThinkingConfig(reasoningEffort) {
      const effort = String(reasoningEffort || '').trim().toLowerCase();
      const levelMap = {
        none: 'minimal',
        minimal: 'minimal',
        low: 'low',
        medium: 'medium',
        high: 'high',
        xhigh: 'high'
      };
      return {
        thinkingLevel: levelMap[effort] || 'medium'
      };
    }

    function buildGoogleResponseSchema() {
      return {
        type: 'OBJECT',
        additionalProperties: false,
        required: ['segments'],
        properties: {
          segments: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              additionalProperties: false,
              properties: {
                id: { type: 'STRING' },
                text: { type: 'STRING' }
              },
              required: ['id', 'text']
            }
          }
        }
      };
    }

    function buildGoogleSystemInstruction(instructions) {
      return {
        parts: [
          {
            text: String(instructions || '')
          }
        ]
      };
    }

    async function attachGoogleSystemInstruction(requestBody, instructions) {
      const instructionText = String(instructions || '').trim();
      if (!instructionText) return;

      if (CONFIG.googleCacheEnabled === false || googleSystemCacheUnavailable) {
        requestBody.systemInstruction = buildGoogleSystemInstruction(instructionText);
        return;
      }

      try {
        const cacheName = await resolveGoogleSystemCacheName(instructionText);
        if (cacheName) {
          requestBody.cachedContent = cacheName;
          return;
        }
      } catch (error) {
        if (isGoogleCacheEndpointUnsupportedError(error)) {
          googleSystemCacheUnavailable = true;
        }
        console.warn('[LocalBlockTranslator] Google system instruction cache unavailable, falling back:', error);
      }

      requestBody.systemInstruction = buildGoogleSystemInstruction(instructionText);
    }

    function isGoogleCacheEndpointUnsupportedError(error) {
      const message = getErrorMessage(error).toLowerCase();
      return (
        message.includes('api http 404') ||
        (message.includes('cachedcontents') && message.includes('invalid url')) ||
        (message.includes('cachedcontents') && message.includes('not found'))
      );
    }

    async function resolveGoogleSystemCacheName(instructionText) {
      if (!chrome?.storage?.local) return '';

      const signature = await buildGoogleSystemCacheSignature(instructionText);
      const storageKey = `${GOOGLE_SYSTEM_CACHE_STORAGE_PREFIX}${signature}`;
      const stored = await chrome.storage.local.get(storageKey);
      const entry = stored[storageKey];
      if (isValidGoogleSystemCacheEntry(entry)) {
        return entry.name;
      }

      if (entry) {
        await chrome.storage.local.remove(storageKey).catch(() => {});
      }

      const created = await createGoogleSystemCache(instructionText);
      if (!created?.name) return '';

      const expiresAt = parseGoogleCacheExpiresAt(created.expireTime);
      await chrome.storage.local.set({
        [storageKey]: {
          name: created.name,
          model: formatGoogleModelPath(CONFIG.model),
          signature,
          expireTime: created.expireTime || '',
          expiresAt
        }
      });
      return created.name;
    }

    async function buildGoogleSystemCacheSignature(instructionText) {
      const raw = JSON.stringify({
        model: formatGoogleModelPath(CONFIG.model),
        instructions: instructionText,
        retention: resolveGoogleCacheRetention()
      });
      return sha256Hex(raw);
    }

    function isValidGoogleSystemCacheEntry(entry) {
      if (!entry || typeof entry !== 'object') return false;
      if (typeof entry.name !== 'string' || !entry.name.startsWith('cachedContents/')) return false;
      if (entry.model !== formatGoogleModelPath(CONFIG.model)) return false;
      if (!Number.isFinite(entry.expiresAt)) return false;
      return Date.now() < entry.expiresAt - 60 * 1000;
    }

    async function createGoogleSystemCache(instructionText) {
      const endpoint = buildGoogleCacheEndpoint();
      const requestBody = {
        model: formatGoogleModelPath(CONFIG.model),
        systemInstruction: buildGoogleSystemInstruction(instructionText)
      };
      const ttl = buildGoogleCacheTtl();
      if (ttl) {
        requestBody.ttl = ttl;
      }

      const controller = new AbortController();
      const timeoutMs = getRequestTimeoutMs();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await postTranslationRequest(endpoint, controller.signal, requestBody, {
          apiMode: 'google'
        });
      } finally {
        clearTimeout(timer);
      }
    }

    function resolveGoogleCacheRetention() {
      return (CONFIG.promptCacheRetention || '').trim() || DEFAULT_PROMPT_CACHE_RETENTION;
    }

    function buildGoogleCacheTtl() {
      const retention = resolveGoogleCacheRetention();
      if (retention === 'in_memory') {
        return '';
      }

      const hourMatch = retention.match(/^(\d+(?:\.\d+)?)h$/i);
      if (hourMatch) {
        return `${Math.max(1, Math.round(Number(hourMatch[1]) * 60 * 60))}s`;
      }

      const secondMatch = retention.match(/^(\d+(?:\.\d+)?)s$/i);
      if (secondMatch) {
        return `${Math.max(1, Math.round(Number(secondMatch[1])))}s`;
      }

      return '86400s';
    }

    function parseGoogleCacheExpiresAt(expireTime) {
      const parsed = Date.parse(String(expireTime || ''));
      if (Number.isFinite(parsed)) {
        return parsed;
      }

      const ttl = buildGoogleCacheTtl();
      const match = ttl.match(/^(\d+)s$/);
      const fallbackSeconds = match ? Number(match[1]) : 3600;
      return Date.now() + Math.max(1, fallbackSeconds) * 1000;
    }

    function formatGoogleModelPath(model) {
      const trimmed = String(model || '').trim().replace(/^\/+/, '');
      return trimmed.startsWith('models/') ? trimmed : `models/${trimmed}`;
    }

    function buildGoogleCacheEndpoint() {
      return `${CONFIG.apiBaseUrl.replace(/\/$/, '')}/cachedContents`;
    }

    function buildGoogleGenerateContentEndpoint() {
      return `${CONFIG.apiBaseUrl.replace(/\/$/, '')}/${formatGoogleModelPath(CONFIG.model)}:generateContent`;
    }

    function buildTranslationJsonSchemaFormat() {
      return {
        type: 'json_schema',
        ...buildChatCompletionsJsonSchema()
      };
    }

    function buildChatCompletionsJsonSchema() {
      return {
        name: 'translation_segments_v1',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['segments'],
          properties: {
            segments: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' }
                },
                required: ['id', 'text']
              }
            }
          }
        }
      };
    }

    function buildTranslationEndpoint(apiMode) {
      if (apiMode === 'google') {
        return buildGoogleGenerateContentEndpoint();
      }
      const endpointPath =
        apiMode === 'chat_completions' || apiMode === 'openai_compatible' || apiMode === 'deepseek'
          ? 'chat/completions'
          : 'responses';
      return `${CONFIG.apiBaseUrl.replace(/\/$/, '')}/${endpointPath}`;
    }

    async function postTranslationRequest(endpoint, signal, requestBody, options) {
      const opts = options || {};
      const apiMode = normalizeApiMode(opts.apiMode || CONFIG.apiMode);
      if (CONFIG.debugRequestLog) {
        console.info('[LocalBlockTranslator] request body JSON:\n' + JSON.stringify(requestBody, null, 2));
      }

      const fetchOptions = {
        method: 'POST',
        headers: buildApiRequestHeaders(apiMode),
        body: JSON.stringify(requestBody)
      };
      if (signal) {
        fetchOptions.signal = signal;
      }

      const response = await sendApiRequestViaBackground(endpoint, fetchOptions, getRequestTimeoutMs());

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`API HTTP ${response.status}: ${errText.slice(0, 600)}`);
      }

      const json = await response.json();
      if (CONFIG.debugResponseLog) {
        console.info('[LocalBlockTranslator] response JSON:\n' + JSON.stringify(json, null, 2));
      }
      return json;
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

    function buildApiRequestHeaders(apiMode) {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (apiMode === 'google') {
        headers['x-goog-api-key'] = CONFIG.apiKey;
      } else {
        headers.Authorization = `Bearer ${CONFIG.apiKey}`;
      }
      return headers;
    }

    function getRequestTimeoutMs() {
      const timeoutSeconds = Number.isFinite(CONFIG.requestTimeoutSeconds) && CONFIG.requestTimeoutSeconds > 0
        ? CONFIG.requestTimeoutSeconds
        : 60;
      return timeoutSeconds * 1000;
    }

    function shouldRetryWithoutStructuredOutput(error, requestBody) {
      const autoFallbackEnabled =
        CONFIG.structuredOutputAutoFallback ?? DEFAULT_STRUCTURED_OUTPUT_AUTO_FALLBACK;
      if (!autoFallbackEnabled) return false;
      if (!hasStructuredOutputConfig(requestBody)) return false;
      if (!(error instanceof Error)) return false;

      return isStructuredOutputUnsupportedMessage(error.message);
    }

    function shouldRetryWithoutGoogleThinking(error, requestBody, apiMode) {
      if (apiMode !== 'google') return false;
      if (!requestBody?.generationConfig?.thinkingConfig) return false;
      if (!(error instanceof Error)) return false;
      return isGoogleThinkingUnsupportedMessage(error.message);
    }

    function isGoogleThinkingUnsupportedMessage(message) {
      if (typeof message !== 'string') return false;
      const lower = message.toLowerCase();
      const mentionsThinking =
        lower.includes('thinkingconfig') ||
        lower.includes('thinking_config') ||
        lower.includes('thinkinglevel') ||
        lower.includes('thinking level') ||
        lower.includes('thinkingbudget') ||
        lower.includes('thinking budget');
      const mentionsUnsupported =
        lower.includes('unknown') ||
        lower.includes('unsupported') ||
        lower.includes('not supported') ||
        lower.includes('invalid') ||
        lower.includes('unrecognized');
      return mentionsThinking && mentionsUnsupported;
    }

    function hasStructuredOutputConfig(requestBody) {
      return Boolean(
        requestBody &&
        (
          (requestBody.text && requestBody.text.format) ||
          requestBody.response_format ||
          requestBody.generationConfig?.responseSchema ||
          requestBody.generationConfig?.responseJsonSchema
        )
      );
    }

    function isStructuredOutputUnsupportedMessage(message) {
      if (typeof message !== 'string') return false;
      const lower = message.toLowerCase();
      const mentionsStructuredParam =
        lower.includes('text.format') ||
        lower.includes('json_schema') ||
        lower.includes('responsemime') ||
        lower.includes('responseschema') ||
        lower.includes('response_mime') ||
        lower.includes('response_schema') ||
        lower.includes('response_format') ||
        lower.includes('structured output');
      const mentionsUnsupported =
        lower.includes('unknown parameter') ||
        lower.includes('unsupported') ||
        lower.includes('not supported') ||
        lower.includes('invalid parameter') ||
        lower.includes('unrecognized');
      return mentionsStructuredParam && mentionsUnsupported;
    }

    function cloneWithoutStructuredOutput(requestBody) {
      const fallbackBody = { ...requestBody };
      delete fallbackBody.text;
      delete fallbackBody.response_format;
      if (fallbackBody.generationConfig) {
        fallbackBody.generationConfig = { ...fallbackBody.generationConfig };
        delete fallbackBody.generationConfig.responseMimeType;
        delete fallbackBody.generationConfig.responseSchema;
        delete fallbackBody.generationConfig.responseJsonSchema;
        delete fallbackBody.generationConfig._responseJsonSchema;
      }
      return fallbackBody;
    }

    function cloneWithoutGoogleThinking(requestBody) {
      const fallbackBody = { ...requestBody };
      if (fallbackBody.generationConfig) {
        fallbackBody.generationConfig = { ...fallbackBody.generationConfig };
        delete fallbackBody.generationConfig.thinkingConfig;
      }
      return fallbackBody;
    }

    function isRetryableTranslationError(error) {
      if (isApiKeyMissingError(error)) return false;

      const statusCode = extractApiHttpStatus(error);
      if (statusCode !== null) {
        if ([400, 401, 403, 404].includes(statusCode)) return false;
        if (statusCode === 429 || statusCode >= 500) return true;
      }

      if (error && typeof error === 'object' && error.name === 'AbortError') {
        return true;
      }

      const message = getErrorMessage(error).toLowerCase();
      if (!message) return false;

      if (message.includes('segment length mismatch')) return true;
      if (message.includes('failed to parse translation json array')) return true;
      if (message.includes('invalid structured output')) return true;
      if (message.includes('failed to fetch')) return true;
      if (message.includes('networkerror') || message.includes('network error')) return true;
      if (message.includes('timeout')) return true;

      return false;
    }

    function isApiKeyMissingError(error) {
      const message = getErrorMessage(error);
      return message.includes('CONFIG.apiKey is empty');
    }

    function extractApiHttpStatus(error) {
      const message = getErrorMessage(error);
      const match = message.match(/api http\s+(\d{3})/i);
      if (!match) return null;
      const parsed = Number(match[1]);
      return Number.isInteger(parsed) ? parsed : null;
    }

    function getApiModeDisplayName(apiMode) {
      if (apiMode === 'chat_completions') return 'OpenAI Completions API';
      if (apiMode === 'openai_compatible') return 'OpenAI-Compatible API';
      if (apiMode === 'deepseek') return 'DeepSeek API';
      if (apiMode === 'google') return 'Google API';
      return 'OpenAI Responses API';
    }

    function extractTranslationOutputText(json, apiMode) {
      if (apiMode === 'chat_completions' || apiMode === 'openai_compatible' || apiMode === 'deepseek') {
        return extractChatCompletionsOutputText(json);
      }
      if (apiMode === 'google') {
        return extractGoogleOutputText(json);
      }
      return extractResponsesOutputText(json);
    }

    function extractChatCompletionsOutputText(json) {
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content === 'string') {
        return content.trim();
      }
      if (!Array.isArray(content)) {
        return '';
      }

      const chunks = [];
      for (const item of content) {
        if (typeof item === 'string') {
          chunks.push(item);
        } else if (item?.type === 'text' && typeof item.text === 'string') {
          chunks.push(item.text);
        } else if (typeof item?.text === 'string') {
          chunks.push(item.text);
        }
      }
      return chunks.join('\n').trim();
    }

    function extractGoogleOutputText(json) {
      const candidates = Array.isArray(json?.candidates) ? json.candidates : [];
      const chunks = [];
      for (const candidate of candidates) {
        const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
        for (const part of parts) {
          if (part?.thought === true) continue;
          if (typeof part?.text === 'string') {
            chunks.push(part.text);
          }
        }
        if (chunks.length) break;
      }
      return chunks.join('\n').trim();
    }

    function extractResponsesOutputText(json) {
      if (typeof json?.output_text === 'string' && json.output_text.trim()) {
        return json.output_text;
      }

      const outputJson = extractResponsesOutputJson(json);
      if (outputJson !== null) {
        try {
          return JSON.stringify(outputJson);
        } catch {
          // Ignore and continue to other extraction paths.
        }
      }

      if (!Array.isArray(json?.output)) return '';

      const chunks = [];
      for (const item of json.output) {
        if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
        for (const contentItem of item.content) {
          if (contentItem?.type === 'output_text' && typeof contentItem?.text === 'string') {
            chunks.push(contentItem.text);
          }
        }
      }

      return chunks.join('\n').trim();
    }

    function extractResponsesOutputJson(json) {
      if (!Array.isArray(json?.output)) return null;

      for (const item of json.output) {
        if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
        for (const contentItem of item.content) {
          if (contentItem?.type === 'output_json' && contentItem?.json !== undefined) {
            return contentItem.json;
          }
        }
      }

      return null;
    }

    return {
      buildTranslationRequestBody,
      callTranslationAPI,
      isRetryableTranslationError,
      normalizeApiMode,
      resetRuntimeState
    };
  }

  window.LocalBlockTranslatorApi = {
    createApiClient
  };
})();
