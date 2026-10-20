
(function () {
  "use strict";

  const LOADING_KEY = "globalPageLoading";
  const SETTINGS_BACK_KEY = "returnedFromSettings";
  const EXIT_DURATION = 350;

  let hideTimer = null;
  let reloadScheduled = false;

  function currentPage() {
    return window.location.pathname
      .split("/")
      .pop()
      .toLowerCase();
  }

  function createLoader() {
    let loader = document.getElementById("globalPageLoader");

    if (!loader && document.body) {
      loader = document.createElement("div");
      loader.id = "globalPageLoader";
      loader.setAttribute("role", "status");
      loader.setAttribute("aria-label", "Loading");

      const spinner = document.createElement("div");
      spinner.className = "loader-spinner";

      loader.appendChild(spinner);
      document.body.appendChild(loader);
    }

    return loader;
  }

  function showPageLoading() {
    try {
      sessionStorage.setItem(LOADING_KEY, "1");
    } catch (error) {}

    const loader = createLoader();

    if (loader) {
      loader.classList.add("active");
    }
  }

  function hidePageLoading() {
    try {
      sessionStorage.removeItem(LOADING_KEY);
    } catch (error) {}

    const loader = document.getElementById("globalPageLoader");

    if (loader) {
      loader.classList.remove("active");
    }

    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function scheduleHide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }

    hideTimer = setTimeout(function () {
      hidePageLoading();
    }, EXIT_DURATION);
  }

  window.showPageLoading = showPageLoading;
  window.hidePageLoading = hidePageLoading;

  const navigationEntry =
    performance.getEntriesByType("navigation")[0];

  const navigationType =
    navigationEntry ? navigationEntry.type : "navigate";

  let shouldShow = false;

  try {
    shouldShow =
      sessionStorage.getItem(LOADING_KEY) === "1";
  } catch (error) {}

  if (
    navigationType === "reload" ||
    navigationType === "back_forward"
  ) {
    shouldShow = true;
  }

  if (currentPage() === "setting.html") {
    try {
      sessionStorage.setItem(SETTINGS_BACK_KEY, "1");
    } catch (error) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    createLoader();

    if (shouldShow) {
      showPageLoading();
    }
  });

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented) return;

    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target;

    if (!target || typeof target.closest !== "function") {
      return;
    }

    const control = target.closest(
      'a[href], [onclick], [data-page]'
    );

    if (!control) return;

    if (
      control.hasAttribute("download") ||
      control.target === "_blank"
    ) {
      return;
    }

    const href = control.getAttribute("href") || "";
    const onclick = control.getAttribute("onclick") || "";

    if (/^javascript:/i.test(href)) {
      if (/history\s*\.\s*(back|forward)\s*\(/i.test(href)) {
        showPageLoading();
      }
      return;
    }

    if (control.matches("a[href]") && href) {
      try {
        const url = new URL(href, window.location.href);

        if (url.origin !== window.location.origin) {
          return;
        }

        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }

        showPageLoading();
        return;
      } catch (error) {
        return;
      }
    }

    const navigationClick =
      /\b(goPage|openPage|goBack|goHelp|logout|goRegister)\s*\(|history\s*\.\s*(back|forward)\s*\(|location\s*\.\s*(href|assign|replace)\b|window\s*\.\s*location\b/i
        .test(onclick);

    if (navigationClick) {
      showPageLoading();
    }
  });

  document.addEventListener("submit", function (event) {
    if (event.defaultPrevented) return;

    const form = event.target;

    if (form.target === "_blank") return;

    showPageLoading();
  });

  window.addEventListener("beforeunload", function () {
    try {
      sessionStorage.setItem(LOADING_KEY, "1");
    } catch (error) {}
  });

  window.addEventListener("load", function () {
    scheduleHide();
  });

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      let returnedFromSettings = false;

      try {
        returnedFromSettings =
          sessionStorage.getItem(SETTINGS_BACK_KEY) === "1";

        if (returnedFromSettings) {
          sessionStorage.removeItem(SETTINGS_BACK_KEY);
        }
      } catch (error) {}

      if (returnedFromSettings && !reloadScheduled) {
        reloadScheduled = true;
        showPageLoading();
        window.location.reload();
        return;
      }

      hidePageLoading();
      return;
    }

    scheduleHide();
  });

  window.addEventListener("pagehide", function () {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  });

})();