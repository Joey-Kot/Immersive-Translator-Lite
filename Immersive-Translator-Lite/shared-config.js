(function () {
  'use strict';

  const SETTINGS_SCHEMA_VERSION = 1;
  const API_MODES = ['responses', 'chat_completions', 'openai_compatible', 'deepseek', 'google'];
  const DEFAULT_PROMPT_CACHE_KEY = '188f6fd3-49ea-4f63-ae50-b87cf9574a1a';
  const DEFAULT_PROMPT_CACHE_KEY_PLACEHOLDER = '111acfce-6ac6-4373-bdcb-61455403f3af';

  const DEFAULT_RESPONSE_INSTRUCTIONS = [
    '## Core Requirements',
    '- The translation must be faithful to the original meaning, intent, tone, style, and level of formality.',
    '- The output should read naturally and idiomatically in Target Language, avoiding stiff or overly literal phrasing.',
    '- Do not add information, omit meaningful content, summarize, explain, annotate, or rewrite beyond what is necessary for a natural translation.',
    '- Output only the translation itself.',
    '',
    '## Formatting Preservation',
    '- Preserve the original formatting as much as possible, including:',
    '  - paragraphs',
    '  - line breaks',
    '  - headings',
    '  - bullet points',
    '  - numbering',
    '  - indentation',
    '  - Markdown syntax',
    '  - emphasis such as **bold**, *italic*, and `inline code`',
    '  - emojis',
    '  - quotation marks and punctuation patterns when meaningful',
    '- Do not convert lists into paragraphs or paragraphs into lists unless required by the source format.',
    '',
    '## Terminology and Named Entities',
    '- **Established Translations First**: For proper nouns, named entities, and domain-specific terms, prefer official, standard, or widely accepted translations whenever available.',
    '- **Priority Order**: When choosing how to render a term, follow this order where applicable:',
    '  1. official translation',
    '  2. widely accepted conventional translation',
    '  3. context-appropriate descriptive translation',
    '  4. transliteration or original form',
    '- **Named Entities**: Handle person names, place names, organizations, brands, products, works, and document titles using the most recognized form in the target language. Do not switch between multiple renderings of the same entity without a contextual reason.',
    '- **Technical and Domain Terms**: Use the standard translation commonly used in the relevant field. If the original term, abbreviation, or acronym is more natural or more widely used in professional target-language contexts, retain it.',
    '- **UI Labels and Fixed Strings**: For interface text such as buttons, menus, settings, field names, and status labels, prefer concise, conventional translations that match common target-language product usage.',
    '- **Acronyms and Abbreviations**: Preserve well-known acronyms or abbreviations when they are commonly used as-is; otherwise translate or expand them only when necessary for clarity and naturalness.',
    '- **Consistency**: Keep recurring names, terms, labels, and concepts translated consistently throughout the text, unless a different rendering is clearly required by context.',
    '- **Disambiguation by Context**: If a term has multiple possible translations, choose the one that best fits the subject matter, domain, and local context. Do not force a generic translation when a domain-specific one is more accurate.',
    '- **Avoid Over-translation**: Do not translate identifiers, version names, model names, branded capitalization, or stylized naming unless there is a clear established equivalent in the target language.',
    '',
    '## Cultural and Stylistic Adaptation',
    '- Adapt idioms, slang, metaphors, colloquialisms, and culture-specific references into natural target-language equivalents when doing so best preserves the original meaning, tone, and effect.',
    '- Preserve the source text’s rhetorical function and expressive force, including humor, irony, sarcasm, understatement, exaggeration, persuasion, and emotional intensity.',
    '- Match the original register, voice, and interpersonal stance, including formality, politeness, distance, friendliness, and professionalism.',
    '- Prefer effect-equivalent translation over literal form when a literal rendering would sound unnatural, obscure, or misleading in the target language.',
    '- When no close cultural or stylistic equivalent exists, use the clearest accurate rendering rather than forcing localization or inventing a culturally specific substitute.',
    '- Do not over-domesticate the text: preserve culturally marked elements when they are important to the setting, identity, perspective, or authorial voice.',
    '- Preserve meaningful stylistic features such as emphasis, repetition, parallelism, brevity, and rhythm where they materially contribute to the reading experience.',
    '',
    '## Sentence Handling',
    '- You may split overly long or syntactically dense sentences into shorter Target Language sentences for readability.',
    '- However, do not alter the original meaning, emphasis, logical relationships, or sequence of ideas.',
    '- Do not over-fragment sentences if the original flow is better preserved as a whole.',
    '',
    '## Special Content Handling',
    '- Do not unnecessarily alter or translate the following unless context clearly requires it:',
    '  - URLs',
    '  - email addresses',
    '  - file paths',
    '  - code snippets',
    '  - variable names',
    '  - function names',
    '  - placeholders such as `{name}`, `%s`, `{{user}}`, and `<tag>`',
    '  - markup tags',
    '- Translate surrounding natural-language content normally while preserving the structure of these elements.',
    '',
    '## Numbers, Dates, and Units',
    '- Preserve all numerical information accurately.',
    '- Keep dates, times, units, versions, and currency values precise.',
    '- Convert formatting only when doing so improves readability in Target Language without changing meaning.',
    '',
    '## Ambiguity and Context Limits',
    '- If the source text is ambiguous, preserve the ambiguity where possible rather than resolving it unnecessarily.',
    '- When multiple interpretations are possible, choose the one best supported by the immediate text, subject matter, and local context.',
    '- If the ambiguity is intentional or materially relevant, retain it rather than forcing a more specific interpretation in the target language.',
    '- Do not introduce certainty, specificity, relationships, or implications that are not supported by the source text.',
    '- If the source text is fragmentary, elliptical, or lacks sufficient context, translate only what is explicitly present without inventing missing information.',
    '- Use conservative inference only when necessary for a grammatical and natural translation, and keep such inference to the minimum required by the target language.',
    '- When pronouns, references, or omitted elements are unclear, do not resolve them more explicitly than the source justifies.',
    '- If uncertainty cannot be fully resolved, prefer the most neutral and context-compatible rendering over a more specific but less certain one.',
    '',
    '## Output Rules',
    '- Do not add titles, prefaces, explanations, notes, or quotation marks unless they are present in the source text.'
  ].join('\n');

  const DEFAULT_TRANSLATION_CONFIG = {
    apiMode: 'responses',
    apiBaseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-xxx',
    model: 'gpt-5.4-mini',
    sourceLang: 'Any Language',
    targetLang: 'Chinese Simplified',
    responseInstructions: DEFAULT_RESPONSE_INSTRUCTIONS,
    googleCacheEnabled: true,
    deepSeekThinkingEnabled: true,
    promptCacheKey: DEFAULT_PROMPT_CACHE_KEY,
    promptCacheKeyPlaceholder: DEFAULT_PROMPT_CACHE_KEY_PLACEHOLDER,
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
    requestTimeoutSeconds: 60,
    temperature: 0,
    maxOutputTokens: 128000,
    injectIntoIframes: true
  };

  const FIELD_TYPES = {
    apiMode: 'string',
    apiBaseUrl: 'string',
    apiKey: 'string',
    model: 'string',
    sourceLang: 'string',
    targetLang: 'string',
    responseInstructions: 'string',
    googleCacheEnabled: 'boolean',
    deepSeekThinkingEnabled: 'boolean',
    promptCacheKey: 'string',
    promptCacheKeyPlaceholder: 'string',
    promptCacheRetention: 'string',
    reasoningEffort: 'string',
    reasoningSummary: 'string',
    outputFormat: 'string',
    maxSegmentsPerRequest: 'number',
    maxConcurrentRequests: 'number',
    maxRequestRetries: 'number',
    structuredOutputAutoFallback: 'boolean',
    requestCacheEnabled: 'boolean',
    requestCacheTimeoutHours: 'number',
    hotkey: 'string',
    multipleSelectionMode: 'boolean',
    multipleSelectionModeHotkey: 'string',
    multipleSelectionMergeRequest: 'boolean',
    enableTouchShortcuts: 'boolean',
    doubleTapMaxDelayMs: 'number',
    doubleTapMaxMovePx: 'number',
    threeFingerCancelEnabled: 'boolean',
    debugHotkey: 'boolean',
    debugProcessLog: 'boolean',
    debugReorder: 'boolean',
    debugRequestLog: 'boolean',
    debugResponseLog: 'boolean',
    showLauncher: 'boolean',
    selectionMode: 'string',
    notifyOnDuplicateSelection: 'boolean',
    scriptBuildId: 'string',
    requestTimeoutSeconds: 'number',
    temperature: 'number',
    maxOutputTokens: 'number',
    injectIntoIframes: 'boolean'
  };

  const CONSTANTS = {
    DEFAULT_RESPONSE_INSTRUCTIONS,
    DEFAULT_MAX_SEGMENTS_PER_REQUEST: DEFAULT_TRANSLATION_CONFIG.maxSegmentsPerRequest,
    DEFAULT_MAX_CONCURRENT_REQUESTS: DEFAULT_TRANSLATION_CONFIG.maxConcurrentRequests,
    DEFAULT_MAX_REQUEST_RETRIES: DEFAULT_TRANSLATION_CONFIG.maxRequestRetries,
    DEFAULT_HOTKEY: DEFAULT_TRANSLATION_CONFIG.hotkey,
    DEFAULT_REQUEST_CACHE_TIMEOUT_HOURS: DEFAULT_TRANSLATION_CONFIG.requestCacheTimeoutHours,
    RETRY_BASE_DELAY_MS: 500,
    RETRY_MAX_DELAY_MS: 5000,
    REQUEST_CACHE_STORAGE_PREFIX: 'lit_request_cache_v1_'
  };

  function createDefaultTranslationConfig(options) {
    const config = { ...DEFAULT_TRANSLATION_CONFIG };
    const generateUuid = options?.generateUuid;
    if (typeof generateUuid === 'function') {
      config.promptCacheKey = generateUuid();
      config.promptCacheKeyPlaceholder = generateUuid();
    }
    return config;
  }

  function createDefaultSettings(options) {
    return {
      version: SETTINGS_SCHEMA_VERSION,
      enabled: true,
      uiTheme: 'system',
      translationConfig: createDefaultTranslationConfig(options)
    };
  }

  window.LocalBlockTranslatorSharedConfig = {
    SETTINGS_SCHEMA_VERSION,
    API_MODES,
    DEFAULT_RESPONSE_INSTRUCTIONS,
    DEFAULT_TRANSLATION_CONFIG,
    FIELD_TYPES,
    CONSTANTS,
    createDefaultTranslationConfig,
    createDefaultSettings
  };
})();
