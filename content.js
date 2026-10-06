(() => {
  const PORTAL_SELECTOR = "[data-floating-ui-portal]";
  const LOCK_ATTRS = ["data-scroll-locked", "data-body-scroll-lock"];
  const LOCK_CLASS_RE =
    /(scroll-?lock|no-?scroll|overflow-?hidden|with-scroll-bars-hidden|block-interactivity|ReactModal__Body--open)/i;

  let scheduled = false;
  let cleaning = false;

  function removePortals() {
    document.querySelectorAll(PORTAL_SELECTOR).forEach((node) => node.remove());
  }

  function stripLockMarkers(el) {
    for (const attr of LOCK_ATTRS) {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    }
    if (!el.classList || el.classList.length === 0) return;
    [...el.classList].forEach((name) => {
      if (LOCK_CLASS_RE.test(name)) el.classList.remove(name);
    });
  }

  function isLocked(el) {
    const style = getComputedStyle(el);
    return (
      style.overflow === "hidden" ||
      style.overflowY === "hidden" ||
      (el === document.body && style.position === "fixed") ||
      LOCK_ATTRS.some((attr) => el.hasAttribute(attr)) ||
      [...(el.classList || [])].some((name) => LOCK_CLASS_RE.test(name))
    );
  }

  function forceScrollable(el) {
    if (!el) return;
    stripLockMarkers(el);
    if (!isLocked(el)) return;

    el.style.setProperty("overflow", "auto", "important");
    el.style.setProperty("overflow-x", "hidden", "important");
    el.style.setProperty("overflow-y", "auto", "important");
    el.style.removeProperty("padding-right");
    el.style.removeProperty("padding-left");
    el.style.removeProperty("margin-right");

    if (el === document.body && (el.style.position === "fixed" || getComputedStyle(el).position === "fixed")) {
      const top = parseInt(el.style.top || "0", 10);
      el.style.setProperty("position", "static", "important");
      el.style.removeProperty("top");
      el.style.removeProperty("width");
      if (!Number.isNaN(top) && top < 0) window.scrollTo(0, Math.abs(top));
    }
  }

  function unlockScroll() {
    forceScrollable(document.documentElement);
    forceScrollable(document.body);
    document
      .querySelectorAll('#root, #app, [class*="App_"], [class*="Page_"], main')
      .forEach((el) => forceScrollable(el));
  }

  function clean() {
    if (cleaning) return;
    cleaning = true;
    try {
      removePortals();
      unlockScroll();
    } finally {
      cleaning = false;
    }
  }

  function scheduleClean() {
    if (scheduled || cleaning) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      clean();
    });
  }

  clean();

  const observer = new MutationObserver(scheduleClean);
  const startObserver = () => {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", ...LOCK_ATTRS],
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      clean();
      startObserver();
    });
  } else {
    startObserver();
  }

  window.addEventListener("load", () => {
    clean();
    let ticks = 0;
    const burst = setInterval(() => {
      clean();
      if (++ticks >= 40) clearInterval(burst);
    }, 500);
  });

  window.addEventListener("popstate", scheduleClean);
  setInterval(clean, 2000);
})();
