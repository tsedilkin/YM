(() => {
  if (window.__ymUnfreezePage) return;
  window.__ymUnfreezePage = true;

  // Блокируем preventDefault у scroll-lock библиотек (react-remove-scroll и т.п.)
  const passThrough = (event) => {
    event.stopImmediatePropagation();
  };

  ["wheel", "touchmove", "mousewheel", "DOMMouseScroll"].forEach((type) => {
    window.addEventListener(type, passThrough, { capture: true, passive: true });
    document.addEventListener(type, passThrough, { capture: true, passive: true });
  });

  const originalPreventDefault = Event.prototype.preventDefault;
  Event.prototype.preventDefault = function patchedPreventDefault() {
    const type = this.type;
    if (
      type === "wheel" ||
      type === "touchmove" ||
      type === "mousewheel" ||
      type === "DOMMouseScroll"
    ) {
      return;
    }
    return originalPreventDefault.apply(this, arguments);
  };

  const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function patchedSetProperty(
    key,
    value,
    priority
  ) {
    const name = String(key).toLowerCase();
    const val = String(value ?? "").toLowerCase();
    const isRootStyle =
      this === document.documentElement?.style || this === document.body?.style;

    if (
      isRootStyle &&
      (name === "overflow" || name === "overflow-y" || name === "overflow-x") &&
      val.includes("hidden")
    ) {
      return originalSetProperty.call(this, key, "auto", "important");
    }
    return originalSetProperty.apply(this, arguments);
  };

  const blockOverflowAssignment = (element) => {
    if (!element) return;
    try {
      const style = element.style;
      const desc = Object.getOwnPropertyDescriptor(
        CSSStyleDeclaration.prototype,
        "overflow"
      );
      if (!desc || !desc.set) return;

      Object.defineProperty(style, "overflow", {
        configurable: true,
        enumerable: true,
        get() {
          return desc.get.call(this);
        },
        set(value) {
          if (String(value).toLowerCase().includes("hidden")) {
            return desc.set.call(this, "auto");
          }
          return desc.set.call(this, value);
        },
      });
    } catch (_) {
      /* ignore */
    }
  };

  const attach = () => {
    blockOverflowAssignment(document.documentElement);
    blockOverflowAssignment(document.body);
  };

  attach();
  document.addEventListener("DOMContentLoaded", attach);
})();
