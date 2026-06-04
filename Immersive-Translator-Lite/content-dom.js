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

  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEXTAREA',
    'INPUT',
    'SELECT',
    'OPTION',
    'BUTTON',
    'SVG',
    'CANVAS'
  ]);

  const REORDER_BLOCK_TAGS = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);
  const REORDER_RISKY_DESCENDANT_TAGS = new Set([
    ...REORDER_BLOCK_TAGS,
    'DIV',
    'UL',
    'OL',
    'PRE',
    'TABLE',
    'THEAD',
    'TBODY',
    'TR',
    'TD',
    'TH',
    'SECTION',
    'ARTICLE',
    'ASIDE',
    'HEADER',
    'FOOTER'
  ]);
  const REORDER_INLINE_TOKEN_TAGS = new Set(['A', 'STRONG', 'EM', 'CODE']);
  const REORDER_BLOCK_SELECTOR = Array.from(REORDER_BLOCK_TAGS).map((tag) => tag.toLowerCase()).join(',');
  const REORDER_RISKY_DESCENDANT_SELECTOR = Array.from(REORDER_RISKY_DESCENDANT_TAGS)
    .map((tag) => tag.toLowerCase())
    .join(',');
  const LINK_ATTR_WHITELIST = ['href', 'title', 'target', 'rel'];

  const DATASET_KEYS = {
    translatedClone: 'tmTranslatedClone',
    inlineTranslated: 'tmInlineTranslated',
    inlineSource: 'tmInlineSource',
    sourceHidden: 'tmSourceHidden',
    sourceDisplay: 'tmSourceDisplay',
    sourceTask: 'tmSourceTask',
    cloneDisplay: 'tmCloneDisplay'
  };

  function createDomClient() {
    const taskMetaMap = new WeakMap();
    const cloneMetaMap = new WeakMap();

    function extractTextSegments(rootElement) {
      const segments = [];
      const nodes = walkTextNodes(rootElement);

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (!isTranslatableTextNode(node, rootElement)) continue;

        const text = normalizeText(node.nodeValue || '');
        if (!text) continue;

        const path = getNodePath(rootElement, node);
        if (!path) continue;

        segments.push({
          id: `seg_${segments.length}`,
          text,
          path,
          index: segments.length
        });
      }

      return segments;
    }

    function walkTextNodes(rootElement) {
      const result = [];
      const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT);

      let current = walker.nextNode();
      while (current) {
        result.push(current);
        current = walker.nextNode();
      }

      return result;
    }

    function isSkippableElement(el) {
      if (!(el instanceof Element)) return false;
      return SKIP_TAGS.has(el.tagName);
    }

    function isTranslatableTextNode(node, rootElement) {
      if (!node || node.nodeType !== Node.TEXT_NODE) return false;
      const raw = node.nodeValue || '';
      const trimmed = raw.trim();

      if (!trimmed) return false;
      if (/^[\p{P}\p{S}\s]+$/u.test(trimmed)) return false;

      const parent = node.parentElement;
      if (!parent) return false;

      if (isInsideSkippableTree(parent, rootElement)) return false;
      if (isHiddenByStyle(parent, rootElement)) return false;

      return true;
    }

    function getNodePath(rootElement, textNode) {
      const path = [];
      let current = textNode;

      while (current && current !== rootElement) {
        const parent = current.parentNode;
        if (!parent) return null;

        const index = Array.prototype.indexOf.call(parent.childNodes, current);
        if (index < 0) return null;

        path.unshift(index);
        current = parent;
      }

      return current === rootElement ? path : null;
    }

    function getNodeByPath(root, path) {
      let current = root;
      for (const index of path) {
        if (!current || !current.childNodes || !current.childNodes[index]) return null;
        current = current.childNodes[index];
      }
      return current;
    }

    function normalizeText(text) {
      return text.replace(/\r/g, '').replace(/\t/g, ' ').trim();
    }

    function extractReorderSegments(rootElement) {
      const rawSegments = [];
      const candidates = collectReorderBlockCandidates(rootElement);

      for (let i = 0; i < candidates.length; i += 1) {
        const blockElement = candidates[i];
        if (isHiddenByStyle(blockElement, rootElement)) continue;

        const blockPath = getNodePath(rootElement, blockElement);
        if (!Array.isArray(blockPath)) continue;

        const linearized = linearizeBlockWithInlinePlaceholders(blockElement);
        if (!linearized.tokens.length) continue;
        if (!stripPlaceholders(linearized.textWithTokens).trim()) continue;
        const reorderRisky = isRiskyReorderBlock(rootElement, blockElement);

        rawSegments.push({
          id: `re_seg_${rawSegments.length}`,
          blockPath,
          reorderRisky,
          textWithTokens: linearized.textWithTokens,
          tokens: linearized.tokens
        });
      }

      const nonOverlapping = [];
      const deepestFirst = rawSegments
        .slice()
        .sort((a, b) => b.blockPath.length - a.blockPath.length || comparePathOrder(a.blockPath, b.blockPath));

      for (const segment of deepestFirst) {
        const isOverlapped = nonOverlapping.some((accepted) => isPathPrefix(segment.blockPath, accepted.blockPath));
        if (!isOverlapped) {
          nonOverlapping.push(segment);
        }
      }

      return nonOverlapping.sort((a, b) => comparePathOrder(a.blockPath, b.blockPath));
    }

    function collectReorderBlockCandidates(rootElement) {
      const candidates = [];
      if (isReorderBlockElement(rootElement)) {
        candidates.push(rootElement);
      }

      const innerBlocks = rootElement.querySelectorAll(REORDER_BLOCK_SELECTOR);
      for (const element of innerBlocks) {
        candidates.push(element);
      }

      return candidates;
    }

    function isReorderBlockElement(element) {
      return element instanceof Element && REORDER_BLOCK_TAGS.has(element.tagName);
    }

    function isRiskyReorderBlock(rootElement, blockElement) {
      if (!(rootElement instanceof Element) || !(blockElement instanceof Element)) return false;
      const innerBlocks = blockElement.querySelectorAll(REORDER_RISKY_DESCENDANT_SELECTOR);
      for (const inner of innerBlocks) {
        if (!(inner instanceof Element)) continue;
        if (isHiddenByStyle(inner, rootElement)) continue;
        return true;
      }
      return false;
    }

    function linearizeBlockWithInlinePlaceholders(blockElement) {
      const textChunks = [];
      const tokens = [];
      const sequence = { value: 1 };
      walkInlineNodesForReorder(blockElement, textChunks, tokens, sequence);

      return {
        textWithTokens: textChunks.join(''),
        tokens
      };
    }

    function walkInlineNodesForReorder(node, textChunks, tokens, sequence) {
      if (!node) return;

      if (node.nodeType === Node.TEXT_NODE) {
        textChunks.push(node.nodeValue || '');
        return;
      }

      if (!(node instanceof Element)) return;
      if (isSkippableElement(node)) return;

      if (node.tagName === 'BR') {
        textChunks.push('\n');
        return;
      }

      if (REORDER_INLINE_TOKEN_TAGS.has(node.tagName)) {
        const tokenId = `PH_${sequence.value}`;
        sequence.value += 1;

        const tokenText = normalizeTokenTextForPlaceholder(node.textContent || '');
        const token = {
          tokenId,
          tagName: node.tagName.toLowerCase(),
          originalText: tokenText
        };

        if (node.tagName === 'A') {
          token.attrs = {};
          for (const attr of LINK_ATTR_WHITELIST) {
            const value = node.getAttribute(attr);
            if (value !== null) {
              token.attrs[attr] = value;
            }
          }
        }

        tokens.push(token);
        textChunks.push(`[[${tokenId}::${tokenText}]]`);
        return;
      }

      const children = Array.from(node.childNodes);
      for (const child of children) {
        walkInlineNodesForReorder(child, textChunks, tokens, sequence);
      }
    }

    function normalizeTokenTextForPlaceholder(text) {
      return (text || '').replace(/\s+/g, ' ').replace(/\]\]/g, '] ]').trim();
    }

    function stripPlaceholders(text) {
      return (text || '').replace(/\[\[PH_\d+::[\s\S]*?\]\]/g, '');
    }

    function comparePathOrder(a, b) {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i += 1) {
        const av = a[i] ?? -1;
        const bv = b[i] ?? -1;
        if (av !== bv) return av - bv;
      }
      return 0;
    }

    function isPathPrefix(prefix, full) {
      if (prefix.length > full.length) return false;
      for (let i = 0; i < prefix.length; i += 1) {
        if (prefix[i] !== full[i]) return false;
      }
      return true;
    }

    function isInsideSkippableTree(el, rootElement) {
      let current = el;
      while (current && current !== rootElement) {
        if (isSkippableElement(current)) return true;
        current = current.parentElement;
      }
      return false;
    }

    function isHiddenByStyle(el, rootElement) {
      let current = el;
      while (current && current !== rootElement.parentElement) {
        const style = window.getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
        current = current.parentElement;
      }
      return false;
    }

    function cloneRootElement(rootElement) {
      return rootElement.cloneNode(true);
    }

    function isCustomElementNode(node) {
      return node instanceof Element && node.tagName.includes('-');
    }

    function isPathInsideCustomElement(rootElement, path) {
      const targetNode = getNodeByPath(rootElement, path);
      if (!targetNode) return false;

      let current = targetNode instanceof Element ? targetNode : targetNode.parentElement;
      while (current && current !== rootElement) {
        if (isCustomElementNode(current)) {
          return true;
        }
        current = current.parentElement;
      }

      return isCustomElementNode(rootElement);
    }

    function shouldFallbackCloneForCustomElement(rootElement, sourceSegments) {
      if (isCustomElementNode(rootElement)) return true;

      for (const source of sourceSegments) {
        if (Array.isArray(source?.path) && isPathInsideCustomElement(rootElement, source.path)) {
          return true;
        }
      }
      return false;
    }

    function resolveFallbackTextMap(sourceSegments, translatedSegments, translatedReorderSegments) {
      const textMap = new Map(translatedSegments.map((item) => [item.id, item.text]));
      if (!Array.isArray(translatedReorderSegments) || !translatedReorderSegments.length) {
        return textMap;
      }

      const sourceIds = new Set(sourceSegments.map((segment) => segment.id));
      for (const item of translatedReorderSegments) {
        if (!item || typeof item.id !== 'string' || typeof item.text !== 'string') continue;
        if (sourceIds.has(item.id)) {
          textMap.set(item.id, item.text);
        }
      }
      return textMap;
    }

    function applyInlineFallbackEntries(targets, textMap, taskId) {
      const entries = [];
      let appliedCount = 0;

      for (const { source, node } of targets) {
        if (!node || node.nodeType !== Node.TEXT_NODE || !(node.parentNode instanceof Element)) {
          continue;
        }

        const translatedText = textMap.get(source.id);
        if (typeof translatedText !== 'string') {
          continue;
        }

        const sourceSpan = document.createElement('span');
        sourceSpan.dataset[DATASET_KEYS.inlineSource] = taskId;
        sourceSpan.textContent = node.nodeValue || '';
        sourceSpan.style.display = 'none';

        const translatedSpan = document.createElement('span');
        translatedSpan.dataset[DATASET_KEYS.inlineTranslated] = taskId;
        translatedSpan.textContent = translatedText;

        const parent = node.parentNode;
        parent.insertBefore(sourceSpan, node);
        parent.insertBefore(translatedSpan, node);
        parent.removeChild(node);

        entries.push({ sourceSpan, translatedSpan });
        appliedCount += 1;
      }

      return {
        appliedCount,
        showingTranslated: true,
        entries
      };
    }

    function applyInlineFallbackTranslation(rootElement, sourceSegments, textMap, taskId) {
      const targets = sourceSegments.map((source) => ({
        source,
        node: getNodeByPath(rootElement, source.path)
      }));
      return applyInlineFallbackEntries(targets, textMap, taskId);
    }

    function toggleInlineFallbackTranslation(meta) {
      if (!meta || !Array.isArray(meta.entries) || !meta.entries.length) return false;
      const nextShowTranslated = !meta.showingTranslated;

      for (const entry of meta.entries) {
        if (!entry) continue;
        if (entry.sourceSpan instanceof Element) {
          entry.sourceSpan.style.display = nextShowTranslated ? 'none' : '';
        }
        if (entry.translatedSpan instanceof Element) {
          entry.translatedSpan.style.display = nextShowTranslated ? '' : 'none';
        }
      }

      meta.showingTranslated = nextShowTranslated;
      return true;
    }

    function restoreInlineFallbackTranslation(meta) {
      if (!meta || !Array.isArray(meta.entries)) return;

      for (const entry of meta.entries) {
        if (!entry || !(entry.sourceSpan instanceof Element)) continue;
        const parent = entry.sourceSpan.parentNode;
        if (!parent) continue;

        const restoredText = document.createTextNode(entry.sourceSpan.textContent || '');
        parent.insertBefore(restoredText, entry.sourceSpan);
        entry.sourceSpan.remove();
        if (entry.translatedSpan instanceof Element && entry.translatedSpan.parentNode) {
          entry.translatedSpan.remove();
        }
      }
    }

    function replaceClonedTextNodes(clonedRoot, sourceSegments, translatedSegments) {
      const translatedMap = new Map(translatedSegments.map((item) => [item.id, item.text]));

      for (const source of sourceSegments) {
        const targetNode = getNodeByPath(clonedRoot, source.path);
        if (!targetNode || targetNode.nodeType !== Node.TEXT_NODE) {
          throw new Error(`Cannot locate text node in clone for id=${source.id}`);
        }

        const translatedText = translatedMap.get(source.id);
        if (typeof translatedText !== 'string') {
          throw new Error(`Missing translated text for id=${source.id}`);
        }

        targetNode.nodeValue = translatedText;
      }
    }

    function buildTranslatedClone(rootElement, sourceSegments, translatedSegments) {
      const clonedRoot = cloneRootElement(rootElement);
      replaceClonedTextNodes(clonedRoot, sourceSegments, translatedSegments);
      return clonedRoot;
    }

    function applyRiskyReorderInlineFallbackToClone(
      clonedRoot,
      sourceSegments,
      translatedSegments,
      reorderSegments,
      translatedReorderSegments,
      taskId
    ) {
      const riskySegments = reorderSegments.filter((segment) => segment?.reorderRisky);
      if (!riskySegments.length) {
        return { appliedCount: 0, riskySegmentCount: 0, mappedByReorderCount: 0 };
      }

      const baselineMap = new Map(translatedSegments.map((item) => [item.id, item.text]));
      const reorderMap = new Map(
        (Array.isArray(translatedReorderSegments) ? translatedReorderSegments : []).map((item) => [item.id, item.text])
      );
      const targetedSourceIds = new Set();
      let mappedByReorderCount = 0;

      for (const segment of riskySegments) {
        const contained = sourceSegments.filter((source) => isPathPrefix(segment.blockPath, source.path));
        if (!contained.length) continue;

        for (const source of contained) {
          targetedSourceIds.add(source.id);
        }

        const reorderedText = reorderMap.get(segment.id);
        if (contained.length === 1 && typeof reorderedText === 'string' && reorderedText.trim()) {
          baselineMap.set(contained[0].id, reorderedText);
          mappedByReorderCount += 1;
        }
      }

      const targets = sourceSegments
        .filter((source) => targetedSourceIds.has(source.id))
        .map((source) => ({
          source,
          node: getNodeByPath(clonedRoot, source.path)
        }));
      const meta = applyInlineFallbackEntries(targets, baselineMap, taskId);
      return {
        appliedCount: meta.appliedCount,
        riskySegmentCount: riskySegments.length,
        mappedByReorderCount
      };
    }

    function applyReorderTranslationsToClone(clonedRoot, reorderSegments, translatedReorderSegments) {
      const translatedMap = new Map(translatedReorderSegments.map((item) => [item.id, item.text]));
      let appliedCount = 0;
      let fallbackCount = 0;
      let intentionalFallbackCount = 0;
      const reasonCounts = {
        riskyFallback: 0,
        missingTranslatedText: 0,
        targetBlockNotFound: 0,
        placeholderMismatch: 0,
        rebuildFailed: 0
      };

      for (const segment of reorderSegments) {
        if (segment?.reorderRisky) {
          fallbackCount += 1;
          intentionalFallbackCount += 1;
          reasonCounts.riskyFallback += 1;
          continue;
        }

        const translatedText = translatedMap.get(segment.id);
        if (typeof translatedText !== 'string') {
          fallbackCount += 1;
          reasonCounts.missingTranslatedText += 1;
          continue;
        }

        const targetBlock = getNodeByPath(clonedRoot, segment.blockPath);
        if (!(targetBlock instanceof Element)) {
          fallbackCount += 1;
          reasonCounts.targetBlockNotFound += 1;
          continue;
        }

        const parsed = parseReorderTranslatedText(translatedText);
        if (!parsed || !validatePlaceholderCoverage(segment.tokens, parsed.placeholders)) {
          fallbackCount += 1;
          reasonCounts.placeholderMismatch += 1;
          continue;
        }

        const rebuiltNodes = rebuildNodesFromParsedReorder(parsed.parts, segment.tokens);
        if (!rebuiltNodes) {
          fallbackCount += 1;
          reasonCounts.rebuildFailed += 1;
          continue;
        }

        targetBlock.replaceChildren(...rebuiltNodes);
        appliedCount += 1;
      }

      return { appliedCount, fallbackCount, intentionalFallbackCount, reasonCounts };
    }

    function parseReorderTranslatedText(translatedText) {
      const parts = [];
      const placeholders = [];
      const regex = /\[\[(PH_\d+)::([\s\S]*?)\]\]/g;
      let lastIndex = 0;
      let match = regex.exec(translatedText);

      while (match) {
        const full = match[0];
        const tokenId = match[1];
        const tokenText = match[2];
        const start = match.index;

        if (start > lastIndex) {
          parts.push({ type: 'text', text: translatedText.slice(lastIndex, start) });
        }

        parts.push({ type: 'token', tokenId, text: tokenText });
        placeholders.push(tokenId);

        lastIndex = start + full.length;
        match = regex.exec(translatedText);
      }

      if (lastIndex < translatedText.length) {
        parts.push({ type: 'text', text: translatedText.slice(lastIndex) });
      }

      return { parts, placeholders };
    }

    function validatePlaceholderCoverage(tokens, placeholders) {
      if (placeholders.length !== tokens.length) return false;
      if (new Set(placeholders).size !== placeholders.length) return false;

      const tokenSet = new Set(tokens.map((token) => token.tokenId));
      for (const id of placeholders) {
        if (!tokenSet.has(id)) return false;
      }
      return true;
    }

    function rebuildNodesFromParsedReorder(parts, tokens) {
      const tokenMap = new Map(tokens.map((token) => [token.tokenId, token]));
      const nodes = [];

      for (const part of parts) {
        if (part.type === 'text') {
          if (part.text) {
            nodes.push(document.createTextNode(part.text));
          }
          continue;
        }

        const token = tokenMap.get(part.tokenId);
        if (!token) return null;

        nodes.push(createTokenElement(token, part.text));
      }

      return nodes;
    }

    function createTokenElement(token, translatedTokenText) {
      const element = document.createElement(token.tagName);

      if (token.tagName === 'a' && token.attrs) {
        for (const attr of LINK_ATTR_WHITELIST) {
          const value = token.attrs[attr];
          if (typeof value === 'string') {
            element.setAttribute(attr, value);
          }
        }
        element.style.color = '#336991';
        element.style.textDecoration = 'underline';
        element.addEventListener('mouseenter', () => {
          element.style.color = '#336991';
          element.style.textDecoration = 'none';
        });
        element.addEventListener('mouseleave', () => {
          element.style.color = '#336991';
          element.style.textDecoration = 'underline';
        });
      }

      const usableText = (translatedTokenText || '').trim() || token.originalText || '';
      element.textContent = usableText;
      return element;
    }

    function markCloneElement(clonedRoot, taskId) {
      clonedRoot.dataset[DATASET_KEYS.translatedClone] = taskId;
    }

    function markSourceElement(rootElement, taskId) {
      rootElement.dataset[DATASET_KEYS.sourceTask] = taskId;
      rootElement.dataset[DATASET_KEYS.sourceHidden] = taskId;
    }

    function markSourceElementInline(rootElement, taskId) {
      rootElement.dataset[DATASET_KEYS.sourceTask] = taskId;
      delete rootElement.dataset[DATASET_KEYS.sourceHidden];
    }

    function insertTranslatedCloneAfter(rootElement, clonedElement) {
      rootElement.insertAdjacentElement('afterend', clonedElement);
    }

    function hideSourceElement(rootElement) {
      if (!(DATASET_KEYS.sourceDisplay in rootElement.dataset)) {
        rootElement.dataset[DATASET_KEYS.sourceDisplay] = rootElement.style.display || '';
      }
      rootElement.style.display = 'none';
    }

    function showSourceElement(rootElement) {
      const previousDisplay = rootElement.dataset[DATASET_KEYS.sourceDisplay] || '';
      rootElement.style.display = previousDisplay;
      delete rootElement.dataset[DATASET_KEYS.sourceDisplay];
      delete rootElement.dataset[DATASET_KEYS.sourceHidden];
    }

    function clearSourceTaskMark(rootElement) {
      delete rootElement.dataset[DATASET_KEYS.sourceTask];
      delete rootElement.dataset[DATASET_KEYS.sourceHidden];
    }

    function restoreSourceIfNeeded(rootElement) {
      if (rootElement.style.display === 'none' || rootElement.dataset[DATASET_KEYS.sourceHidden]) {
        showSourceElement(rootElement);
      }
    }

    function removeExistingTranslatedClone(rootElement) {
      const meta = taskMetaMap.get(rootElement);

      if (meta && meta.mode === 'inline' && meta.inlineMeta) {
        restoreInlineFallbackTranslation(meta.inlineMeta);
      } else if (meta && meta.cloneEl && meta.cloneEl.parentNode) {
        cloneMetaMap.delete(meta.cloneEl);
        meta.cloneEl.parentNode.removeChild(meta.cloneEl);
      } else {
        const taskId = rootElement.dataset[DATASET_KEYS.sourceTask] || rootElement.dataset[DATASET_KEYS.sourceHidden];
        if (taskId && rootElement.nextElementSibling) {
          const maybeClone = rootElement.nextElementSibling;
          if (maybeClone.dataset[DATASET_KEYS.translatedClone] === taskId) {
            cloneMetaMap.delete(maybeClone);
            maybeClone.remove();
          }
        }
      }

      taskMetaMap.delete(rootElement);
      clearSourceTaskMark(rootElement);
    }

    function findAncestorWithDatasetKey(startElement, datasetKey) {
      let current = startElement instanceof Element ? startElement : null;
      while (current) {
        if (current.dataset && current.dataset[datasetKey]) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }

    function resolveTogglePairFromSelection(target) {
      const clonedRoot = findAncestorWithDatasetKey(target, DATASET_KEYS.translatedClone);
      if (clonedRoot) {
        const sourceRoot = cloneMetaMap.get(clonedRoot);
        if (sourceRoot instanceof Element) {
          return { sourceRoot, clonedRoot };
        }
      }

      const sourceRoot = findAncestorWithDatasetKey(target, DATASET_KEYS.sourceTask);
      if (!sourceRoot) return null;

      const meta = taskMetaMap.get(sourceRoot);
      if (!meta || !(meta.cloneEl instanceof Element)) return null;

      return { sourceRoot, clonedRoot: meta.cloneEl };
    }

    function hideCloneElement(clonedRoot) {
      if (!(DATASET_KEYS.cloneDisplay in clonedRoot.dataset)) {
        clonedRoot.dataset[DATASET_KEYS.cloneDisplay] = clonedRoot.style.display || '';
      }
      clonedRoot.style.display = 'none';
    }

    function showCloneElement(clonedRoot) {
      const previousDisplay = clonedRoot.dataset[DATASET_KEYS.cloneDisplay] || '';
      clonedRoot.style.display = previousDisplay;
      delete clonedRoot.dataset[DATASET_KEYS.cloneDisplay];
    }

    function setToggleVisibility(sourceRoot, clonedRoot, showTranslated) {
      const taskId = sourceRoot.dataset[DATASET_KEYS.sourceTask] || clonedRoot.dataset[DATASET_KEYS.translatedClone] || '';

      if (showTranslated) {
        if (taskId) {
          markSourceElement(sourceRoot, taskId);
        }
        hideSourceElement(sourceRoot);
        showCloneElement(clonedRoot);
        return;
      }

      showSourceElement(sourceRoot);
      hideCloneElement(clonedRoot);
    }

    function isElementShown(element) {
      return !!element && element.style.display !== 'none';
    }

    function toggleExistingTranslationPair(target) {
      const inlineSourceRoot = findAncestorWithDatasetKey(target, DATASET_KEYS.sourceTask);
      if (inlineSourceRoot) {
        const inlineMeta = taskMetaMap.get(inlineSourceRoot);
        if (inlineMeta && inlineMeta.mode === 'inline' && inlineMeta.inlineMeta) {
          return toggleInlineFallbackTranslation(inlineMeta.inlineMeta);
        }
      }

      const pair = resolveTogglePairFromSelection(target);
      if (!pair) return false;

      const { sourceRoot, clonedRoot } = pair;
      if (!sourceRoot.isConnected || !clonedRoot.isConnected) {
        if (sourceRoot.isConnected) {
          taskMetaMap.delete(sourceRoot);
        }
        if (clonedRoot instanceof Element) {
          cloneMetaMap.delete(clonedRoot);
        }
        return false;
      }

      const sourceVisible = isElementShown(sourceRoot);
      const cloneVisible = isElementShown(clonedRoot);

      if (sourceVisible === cloneVisible) {
        setToggleVisibility(sourceRoot, clonedRoot, false);
        return true;
      }

      setToggleVisibility(sourceRoot, clonedRoot, sourceVisible);
      return true;
    }

    function registerInlineTask(rootElement, taskId, inlineMeta) {
      taskMetaMap.set(rootElement, {
        taskId,
        mode: 'inline',
        inlineMeta
      });
    }

    function registerCloneTask(rootElement, taskId, clonedElement) {
      taskMetaMap.set(rootElement, {
        taskId,
        mode: 'clone',
        cloneEl: clonedElement
      });
      cloneMetaMap.set(clonedElement, rootElement);
    }

    return {
      applyInlineFallbackTranslation,
      applyReorderTranslationsToClone,
      applyRiskyReorderInlineFallbackToClone,
      buildTranslatedClone,
      extractReorderSegments,
      extractTextSegments,
      hideSourceElement,
      insertTranslatedCloneAfter,
      isSkippableElement,
      markCloneElement,
      markSourceElement,
      markSourceElementInline,
      registerCloneTask,
      registerInlineTask,
      removeExistingTranslatedClone,
      resolveFallbackTextMap,
      restoreSourceIfNeeded,
      shouldFallbackCloneForCustomElement,
      toggleExistingTranslationPair
    };
  }

  window.LocalBlockTranslatorDom = {
    createDomClient
  };
})();
