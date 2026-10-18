
(function () {
  const LOADING_KEY = "globalPageLoading";

  function createLoader() {
    let loader = document.getElementById("globalPageLoader");

    if (!loader) {
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

    createLoader().classList.add("active");
  }

  function hidePageLoading() {
    try {
      sessionStorage.removeItem(LOADING_KEY);
    } catch (error) {}

    const loader = document.getElementById("globalPageLoader");

    if (loader) {
      loader.classList.remove("active");
    }
  }

  window.showPageLoading = showPageLoading;
  window.hidePageLoading = hidePageLoading;

  let shouldShow = false;

  try {
    shouldShow = sessionStorage.getItem(LOADING_KEY) === "1";
  } catch (error) {}

  const navigationEntry =
    performance.getEntriesByType("navigation")[0];

  if (navigationEntry && navigationEntry.type === "reload") {
    shouldShow = true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (shouldShow) {
      createLoader().classList.add("active");
    }
  });

  document.addEventListener("click", function (event) {
    const target = event.target;

    if (!target || typeof target.closest !== "function") return;
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

    const control = target.closest("a[href], [onclick]");
    if (!control) return;

    if (
      control.hasAttribute("download") ||
      control.target === "_blank"
    ) {
      return;
    }

    const href = control.getAttribute("href") || "";
    const onclick = control.getAttribute("onclick") || "";

    if (/^javascript:\s*history\.back\s*\(/i.test(href)) {
      showPageLoading();
      return;
    }

    if (control.matches("a[href]") && href) {
      try {
        const url = new URL(control.href, window.location.href);

        if (url.origin !== window.location.origin) return;

        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash &&
          url.hash !== window.location.hash
        ) {
          return;
        }

        if (url.href !== window.location.href) {
          showPageLoading();
        }

        return;
      } catch (error) {}
    }

    const navigationClick =
      /\b(goPage|openPage|goBack|goHelp|logout)\s*\(|history\s*\.\s*back\s*\(|location\s*\.\s*(href|assign|replace)\b|window\s*\.\s*location\b/i
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

  window.addEventListener("load", function () {
    hidePageLoading();
  });

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      showPageLoading();
      window.location.reload();
    }
  });
})();