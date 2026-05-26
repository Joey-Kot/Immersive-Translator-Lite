(function () {
  'use strict';

  const LAUNCHER_DRAG_THRESHOLD = 4;

  function createUiClient(deps) {
    const CONFIG = deps.config;
    const getRuntimeStatus = deps.getRuntimeStatus;
    const onLauncherClick = deps.onLauncherClick;
    const logInfoIf = deps.logInfoIf;

    /** @type {HTMLDivElement|null} */
    let overlayBox = null;
    /** @type {HTMLButtonElement|null} */
    let launcherButton = null;
    /** @type {'idle'|'hover'|'pressed'} */
    let launcherInteractionState = 'idle';
    /** @type {boolean} */
    let launcherFocused = false;
    /** @type {number|null} */
    let launcherDragPointerId = null;
    /** @type {number} */
    let launcherDragStartClientX = 0;
    /** @type {number} */
    let launcherDragStartClientY = 0;
    /** @type {number} */
    let launcherDragStartLeft = 0;
    /** @type {number} */
    let launcherDragStartTop = 0;
    /** @type {boolean} */
    let launcherDidMoveDuringPointer = false;
    /** @type {boolean} */
    let launcherSuppressNextClick = false;

    function notify(message, level) {
      const title = '[LocalBlockTranslator]';
      const full = `${title} ${message}`;

      if (level === 'error') {
        console.error(full);
      } else if (level === 'warn') {
        console.warn(full);
      }

      if (!document.body) {
        return;
      }

      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.position = 'fixed';
      toast.style.right = '16px';
      toast.style.bottom = '16px';
      toast.style.zIndex = '2147483647';
      toast.style.maxWidth = '420px';
      toast.style.padding = '8px 10px';
      toast.style.borderRadius = '8px';
      toast.style.fontSize = '12px';
      toast.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      toast.style.color = '#fff';
      toast.style.background =
        level === 'error' ? 'rgba(190,30,30,0.95)' : level === 'warn' ? 'rgba(182,110,0,0.95)' : 'rgba(20,20,20,0.9)';
      toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';

      try {
        document.body.appendChild(toast);
      } catch (error) {
        console.warn('[LocalBlockTranslator] Failed to render toast:', error);
        return;
      }
      setTimeout(() => {
        toast.style.transition = 'opacity 160ms ease';
        toast.style.opacity = '0';
        setTimeout(() => {
          toast.remove();
        }, 180);
      }, 1400);
    }

    function createOverlayBox() {
      const box = document.createElement('div');
      box.style.position = 'fixed';
      box.style.zIndex = '2147483647';
      box.style.pointerEvents = 'none';
      box.style.border = '2px dashed #ff6a00';
      box.style.background = 'rgba(255,106,0,0.08)';
      box.style.boxSizing = 'border-box';
      box.style.display = 'none';
      box.style.transition = 'all 0.04s linear';
      return box;
    }

    function mountOverlay() {
      removeOverlay();
      if (!document.body) return;
      overlayBox = createOverlayBox();
      document.body.appendChild(overlayBox);
    }

    function removeOverlay() {
      if (overlayBox && overlayBox.parentNode) {
        overlayBox.parentNode.removeChild(overlayBox);
      }
      overlayBox = null;
    }

    function updateOverlay(targetEl) {
      if (!overlayBox || !targetEl) return;
      const rect = targetEl.getBoundingClientRect();

      if (rect.width < 2 || rect.height < 2) {
        overlayBox.style.display = 'none';
        return;
      }

      overlayBox.style.display = 'block';
      overlayBox.style.left = `${rect.left}px`;
      overlayBox.style.top = `${rect.top}px`;
      overlayBox.style.width = `${rect.width}px`;
      overlayBox.style.height = `${rect.height}px`;
    }

    function hideOverlay() {
      if (overlayBox) {
        overlayBox.style.display = 'none';
      }
    }

    function applyLauncherStyle(state) {
      launcherInteractionState = state || launcherInteractionState;
      if (!launcherButton) return;

      const isSelecting = getRuntimeStatus() === 'selecting';
      const isHover = launcherInteractionState === 'hover';
      const isPressed = launcherInteractionState === 'pressed';

      let background = isSelecting ? '#d93025' : '#1a73e8';
      if (isHover) {
        background = isSelecting ? '#c5221f' : '#1765cc';
      }
      if (isPressed) {
        background = isSelecting ? '#b31412' : '#185abc';
      }

      let elevation = '0 1px 3px rgba(60,64,67,0.30), 0 1px 2px rgba(60,64,67,0.15)';
      if (isHover) {
        elevation = '0 2px 6px rgba(60,64,67,0.30), 0 1px 3px rgba(60,64,67,0.20)';
      }
      if (isPressed) {
        elevation = '0 1px 2px rgba(60,64,67,0.28), 0 1px 1px rgba(60,64,67,0.16)';
      }
      if (launcherFocused) {
        elevation += ', 0 0 0 3px rgba(26,115,232,0.32)';
      }

      launcherButton.style.background = background;
      launcherButton.style.boxShadow = elevation;
      launcherButton.style.transform = isPressed ? 'translateY(1px)' : 'translateY(0)';
    }

    function clampLauncherPosition(left, top) {
      if (!launcherButton) return { left, top };
      const maxLeft = Math.max(0, window.innerWidth - launcherButton.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - launcherButton.offsetHeight);
      const clampedLeft = Math.min(Math.max(left, 0), maxLeft);
      const clampedTop = Math.min(Math.max(top, 0), maxTop);
      return { left: clampedLeft, top: clampedTop };
    }

    function setLauncherPosition(left, top) {
      if (!launcherButton) return;
      const position = clampLauncherPosition(left, top);
      launcherButton.style.left = `${position.left}px`;
      launcherButton.style.top = `${position.top}px`;
      launcherButton.style.right = 'auto';
      launcherButton.style.bottom = 'auto';
    }

    function normalizeLauncherPositionFromRect() {
      if (!launcherButton) return;
      const rect = launcherButton.getBoundingClientRect();
      setLauncherPosition(rect.left, rect.top);
    }

    function releaseLauncherPointerCapture(pointerId) {
      if (!launcherButton) return;
      if (typeof launcherButton.releasePointerCapture !== 'function') return;
      try {
        launcherButton.releasePointerCapture(pointerId);
      } catch (_) {}
    }

    function resetLauncherDragState() {
      launcherDragPointerId = null;
      launcherDragStartClientX = 0;
      launcherDragStartClientY = 0;
      launcherDragStartLeft = 0;
      launcherDragStartTop = 0;
      launcherDidMoveDuringPointer = false;
    }

    function initLauncherButton() {
      if (!CONFIG.showLauncher) return;
      if (launcherButton) return;

      const mount = () => {
        if (!document.body || launcherButton) return;
        launcherButton = document.createElement('button');
        launcherButton.type = 'button';
        launcherButton.textContent = '';
        launcherButton.innerHTML =
          '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M938.666667 981.333333c-17.066667 0-29.866667-8.533333-38.4-25.6l-59.733334-119.466666h-277.333333l-59.733333 119.466666c-8.533333 21.333333-34.133333 29.866667-55.466667 17.066667-25.6-8.533333-34.133333-34.133333-21.333333-51.2l72.533333-140.8 145.066667-290.133333c12.8-21.333333 34.133333-38.4 59.733333-38.4s46.933333 12.8 59.733333 38.4l145.066667 290.133333 72.533333 140.8c8.533333 21.333333 0 46.933333-17.066666 55.466667-12.8 4.266667-17.066667 4.266667-25.6 4.266666z m-332.8-226.133333h192l-98.133334-192-93.866666 192zM85.333333 844.8c-17.066667 0-29.866667-8.533333-38.4-25.6-8.533333-21.333333 0-46.933333 21.333334-55.466667 93.866667-46.933333 179.2-110.933333 247.466666-187.733333-46.933333-64-85.333333-128-110.933333-192-8.533333-21.333333 4.266667-46.933333 25.6-55.466667 21.333333-8.533333 46.933333 4.266667 55.466667 25.6 21.333333 51.2 46.933333 102.4 81.066666 149.333334 59.733333-85.333333 102.4-179.2 128-281.6H85.333333c-25.6 0-42.666667-17.066667-42.666666-42.666667s17.066667-42.666667 42.666666-42.666667h243.2V85.333333c0-25.6 17.066667-42.666667 42.666667-42.666666s42.666667 17.066667 42.666667 42.666666v51.2h238.933333c25.6 0 42.666667 17.066667 42.666667 42.666667s-17.066667 42.666667-42.666667 42.666667h-68.266667c-25.6 128-85.333333 247.466667-162.133333 349.866666l25.6 25.6c17.066667 17.066667 17.066667 42.666667 0 59.733334-17.066667 17.066667-42.666667 17.066667-59.733333 0l-17.066667-17.066667c-72.533333 81.066667-162.133333 149.333333-264.533333 200.533333-8.533333 0-17.066667 4.266667-21.333334 4.266667z" fill="#ffffff"></path></svg>';
        launcherButton.title = 'LocalBlockTranslator launcher';
        launcherButton.setAttribute('aria-label', 'Translate');
        launcherButton.style.position = 'fixed';
        launcherButton.style.right = '16px';
        launcherButton.style.bottom = '16px';
        launcherButton.style.zIndex = '2147483647';
        launcherButton.style.minHeight = '40px';
        launcherButton.style.minWidth = '40px';
        launcherButton.style.width = '40px';
        launcherButton.style.padding = '0';
        launcherButton.style.fontSize = '14px';
        launcherButton.style.fontWeight = '500';
        launcherButton.style.letterSpacing = '0.01em';
        launcherButton.style.lineHeight = '1';
        launcherButton.style.border = 'none';
        launcherButton.style.borderRadius = '999px';
        launcherButton.style.background = '#1a73e8';
        launcherButton.style.color = '#ffffff';
        launcherButton.style.boxShadow = '0 1px 3px rgba(60,64,67,0.30), 0 1px 2px rgba(60,64,67,0.15)';
        launcherButton.style.cursor = 'pointer';
        launcherButton.style.outline = 'none';
        launcherButton.style.userSelect = 'none';
        launcherButton.style.touchAction = 'none';
        launcherButton.style.display = 'inline-flex';
        launcherButton.style.alignItems = 'center';
        launcherButton.style.justifyContent = 'center';
        launcherButton.style.webkitTapHighlightColor = 'transparent';
        launcherButton.style.transition = 'background-color 120ms ease, box-shadow 120ms ease, transform 90ms ease';
        const launcherIcon = launcherButton.querySelector('svg');
        if (launcherIcon) {
          launcherIcon.style.width = '20px';
          launcherIcon.style.height = '20px';
          launcherIcon.style.display = 'block';
          launcherIcon.style.pointerEvents = 'none';
        }
        launcherButton.addEventListener('mouseenter', () => {
          if (launcherDragPointerId !== null) return;
          applyLauncherStyle('hover');
        }, true);
        launcherButton.addEventListener('mouseleave', () => {
          if (launcherDragPointerId !== null) return;
          applyLauncherStyle('idle');
        }, true);
        launcherButton.addEventListener(
          'pointerdown',
          (event) => {
            if (event.button !== 0) return;
            const rect = launcherButton.getBoundingClientRect();
            launcherDragPointerId = event.pointerId;
            launcherDragStartClientX = event.clientX;
            launcherDragStartClientY = event.clientY;
            launcherDragStartLeft = rect.left;
            launcherDragStartTop = rect.top;
            launcherDidMoveDuringPointer = false;
            launcherSuppressNextClick = false;
            setLauncherPosition(rect.left, rect.top);
            if (typeof launcherButton.setPointerCapture === 'function') {
              try {
                launcherButton.setPointerCapture(event.pointerId);
              } catch (_) {}
            }
            event.preventDefault();
            event.stopPropagation();
            applyLauncherStyle('pressed');
          },
          true
        );
        launcherButton.addEventListener(
          'pointermove',
          (event) => {
            if (launcherDragPointerId === null || event.pointerId !== launcherDragPointerId) return;
            const deltaX = event.clientX - launcherDragStartClientX;
            const deltaY = event.clientY - launcherDragStartClientY;
            if (
              !launcherDidMoveDuringPointer &&
              (Math.abs(deltaX) >= LAUNCHER_DRAG_THRESHOLD || Math.abs(deltaY) >= LAUNCHER_DRAG_THRESHOLD)
            ) {
              launcherDidMoveDuringPointer = true;
            }
            if (!launcherDidMoveDuringPointer) return;
            event.preventDefault();
            event.stopPropagation();
            setLauncherPosition(launcherDragStartLeft + deltaX, launcherDragStartTop + deltaY);
            applyLauncherStyle('pressed');
          },
          true
        );
        launcherButton.addEventListener(
          'pointerup',
          (event) => {
            if (launcherDragPointerId === null || event.pointerId !== launcherDragPointerId) return;
            event.preventDefault();
            event.stopPropagation();
            launcherSuppressNextClick = launcherDidMoveDuringPointer;
            releaseLauncherPointerCapture(event.pointerId);
            resetLauncherDragState();
            applyLauncherStyle('hover');
          },
          true
        );
        launcherButton.addEventListener(
          'pointercancel',
          (event) => {
            if (launcherDragPointerId === null || event.pointerId !== launcherDragPointerId) return;
            launcherSuppressNextClick = launcherDidMoveDuringPointer;
            releaseLauncherPointerCapture(event.pointerId);
            resetLauncherDragState();
            applyLauncherStyle('idle');
          },
          true
        );
        launcherButton.addEventListener(
          'focus',
          () => {
            launcherFocused = true;
            applyLauncherStyle(launcherInteractionState);
          },
          true
        );
        launcherButton.addEventListener(
          'blur',
          () => {
            launcherFocused = false;
            applyLauncherStyle(launcherInteractionState);
          },
          true
        );
        launcherButton.addEventListener(
          'click',
          (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (launcherSuppressNextClick) {
              launcherSuppressNextClick = false;
              return;
            }
            onLauncherClick();
          },
          true
        );
        applyLauncherStyle('idle');
        document.body.appendChild(launcherButton);
        normalizeLauncherPositionFromRect();
        window.addEventListener(
          'resize',
          () => {
            if (!launcherButton) return;
            normalizeLauncherPositionFromRect();
          },
          true
        );
        logInfoIf(CONFIG.debugHotkey, '[LocalBlockTranslator] launcher button mounted.');
      };

      if (document.body) {
        mount();
      } else {
        window.addEventListener('load', mount, { once: true });
      }
    }

    function isLauncherTarget(target) {
      if (!launcherButton) return false;
      if (!(target instanceof Node)) return false;
      return target === launcherButton || launcherButton.contains(target);
    }

    return {
      applyLauncherStyle,
      hideOverlay,
      initLauncherButton,
      isLauncherTarget,
      mountOverlay,
      notify,
      removeOverlay,
      updateOverlay
    };
  }

  window.LocalBlockTranslatorUi = {
    createUiClient
  };
})();
