'use strict';

const MESSAGE_TYPES = {
  TOGGLE_SELECTION_MODE: 'TOGGLE_SELECTION_MODE',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  PING_FRAME_STATUS: 'PING_FRAME_STATUS',
  FRAME_READY: 'FRAME_READY',
  CLEAR_REQUEST_CACHE: 'CLEAR_REQUEST_CACHE'
};
const REQUEST_CACHE_STORAGE_PREFIX = 'lit_request_cache_v1_';

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
});
