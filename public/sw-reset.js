(function () {
  var RESET_KEY = "iiiak_identity_recovery_2026_07_17_v1";
  if (!("serviceWorker" in navigator)) return;

  function clearAppCaches() {
    if (!("caches" in window)) return Promise.resolve();
    return caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (key) {
          return key.indexOf("iiiak-") === 0;
        }).map(function (key) {
          return caches.delete(key);
        }));
      })
      .catch(function () {});
  }

  try {
    if (window.localStorage && window.localStorage.getItem(RESET_KEY)) return;
  } catch {}

  navigator.serviceWorker.getRegistrations()
    .then(function (registrations) {
      if (!registrations.length) {
        try { window.localStorage && window.localStorage.setItem(RESET_KEY, "clean"); } catch {}
        return null;
      }
      try { window.localStorage && window.localStorage.setItem(RESET_KEY, "done"); } catch {}
      return Promise.all(registrations.map(function (registration) {
        return registration.unregister().catch(function () {});
      }))
        .then(clearAppCaches)
        .then(function () {
          if (navigator.serviceWorker.controller) window.location.reload();
        });
    })
    .catch(function () {});
})();
