'use strict';

const MESSAGE_TYPES = {
  TOGGLE_SELECTION_MODE: 'TOGGLE_SELECTION_MODE',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  PING_FRAME_STATUS: 'PING_FRAME_STATUS',
  FRAME_READY: 'FRAME_READY',
  CLEAR_REQUEST_CACHE: 'CLEAR_REQUEST_CACHE',
  API_REQUEST: 'API_REQUEST'
};
const REQUEST_CACHE_STORAGE_PREFIX = 'lit_request_cache_v1_';
const API_REQUEST_TIMEOUT_MS = 120000;

async function sendToggleToAllFrames(tabId) {
  let frames = [];
  try {
    frames = await chrome.webNavigation.getAllFrames({ tabId });
  } catch (error) {
    console.warn('[LIT Background] getAllFrames failed:', error);
  }

  if (!frames.length) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.TOGGLE_SELECTION_MODE });
    } catch (error) {
      console.warn('[LIT Background] sendMessage fallback failed:', error);
    }
    return;
  }

  await Promise.all(
    frames.map(async (frame) => {
      try {
        await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.TOGGLE_SELECTION_MODE }, { frameId: frame.frameId });
      } catch (error) {
        console.debug(`[LIT Background] frame ${frame.frameId} ignored:`, error?.message || error);
      }
    })
  );
}

async function broadcastMessageToAllFrames(message) {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch (error) {
    console.warn('[LIT Background] tabs.query failed:', error);
    return;
  }

  await Promise.all(
    tabs.map(async (tab) => {
      if (!tab?.id) return;

      let frames = [];
      try {
        frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      } catch (error) {
        console.debug('[LIT Background] getAllFrames failed in broadcast:', error?.message || error);
      }

      if (!frames.length) {
        try {
          await chrome.tabs.sendMessage(tab.id, message);
        } catch (_) {}
        return;
      }

      await Promise.all(
        frames.map(async (frame) => {
          try {
            await chrome.tabs.sendMessage(tab.id, message, { frameId: frame.frameId });
          } catch (_) {}
        })
      );
    })
  );
}

async function clearRequestCacheStorage() {
  if (!chrome?.storage?.local) return 0;
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((key) => key.startsWith(REQUEST_CACHE_STORAGE_PREFIX));
  if (!keys.length) return 0;
  await chrome.storage.local.remove(keys);
  return keys.length;
}

function validateApiRequestPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid API request payload');
  }

  const endpoint = String(payload.endpoint || '').trim();
  let url = null;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('Invalid API endpoint URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('API endpoint must use http or https');
  }

  const method = String(payload.method || 'POST').toUpperCase();
  if (!['GET', 'POST'].includes(method)) {
    throw new Error(`Unsupported API request method: ${method}`);
  }

  const headers = payload.headers && typeof payload.headers === 'object' ? payload.headers : {};
  const sanitizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof key !== 'string' || !key.trim()) continue;
    if (typeof value === 'undefined' || value === null) continue;
    sanitizedHeaders[key] = String(value);
  }

  const timeoutMs = Number.isFinite(payload.timeoutMs) && payload.timeoutMs > 0
    ? Math.min(payload.timeoutMs, API_REQUEST_TIMEOUT_MS)
    : API_REQUEST_TIMEOUT_MS;

  return {
    endpoint: url.href,
    method,
    headers: sanitizedHeaders,
    body: typeof payload.body === 'undefined' ? undefined : payload.body,
    timeoutMs
  };
}

async function proxyApiRequest(payload) {
  const request = validateApiRequestPayload(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const fetchOptions = {
      method: request.method,
      headers: request.headers,
      signal: controller.signal
    };

    if (request.method !== 'GET' && typeof request.body !== 'undefined') {
      fetchOptions.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }

    const response = await fetch(request.endpoint, fetchOptions);
    const responseText = await response.text().catch(() => '');
    let json = null;
    let jsonParseError = '';
    if (responseText) {
      try {
        json = JSON.parse(responseText);
      } catch (error) {
        jsonParseError = String(error?.message || error);
      }
    }

    return {
      ok: true,
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        text: responseText,
        json,
        jsonParseError
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.name === 'AbortError'
        ? `API request timed out after ${request.timeoutMs}ms`
        : String(error?.message || error)
    };
  } finally {
    clearTimeout(timer);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await sendToggleToAllFrames(tab.id);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === MESSAGE_TYPES.FRAME_READY) {
    const tabId = sender?.tab?.id;
    const frameId = sender?.frameId;
    console.info(
      `[LIT Background] frame ready tab=${tabId ?? 'n/a'} frame=${frameId ?? 'n/a'} top=${Boolean(message.isTopFrame)} url=${String(message.frameUrl || '')}`
    );
    return;
  }

  if (message.type === MESSAGE_TYPES.SETTINGS_UPDATED) {
    sendResponse({ ok: true });
    return;
  }

  if (message.type === MESSAGE_TYPES.CLEAR_REQUEST_CACHE) {
    (async () => {
      const clearedCount = await clearRequestCacheStorage();
      await broadcastMessageToAllFrames({ type: MESSAGE_TYPES.CLEAR_REQUEST_CACHE });
      sendResponse({ ok: true, clearedCount });
    })().catch((error) => {
      console.error('[LIT Background] clear cache failed:', error);
      sendResponse({ ok: false, error: String(error?.message || error) });
    });
    return true;
  }

  if (message.type === MESSAGE_TYPES.API_REQUEST) {
    proxyApiRequest(message.payload)
      .then(sendResponse)
      .catch((error) => {
        console.error('[LIT Background] API proxy failed:', error);
        sendResponse({ ok: false, error: String(error?.message || error) });
      });
    return true;
  }
});
