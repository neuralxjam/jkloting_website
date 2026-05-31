(function () {
  'use strict';

  function init() {
    var drawer = document.getElementById('jk-drawer');
    if (!drawer) return;

    var openBtn = document.querySelector('[data-jk-drawer-open]');
    var closeEls = drawer.querySelectorAll('[data-jk-drawer-close]');
    var linkEls = drawer.querySelectorAll('.jk-drawer__item');

    function openDrawer() {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('jk-drawer-open');
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('jk-drawer-open');
    }

    if (openBtn) openBtn.addEventListener('click', openDrawer);

    closeEls.forEach(function (el) {
      el.addEventListener('click', closeDrawer);
    });

    // Close after picking a link (so smooth-scroll / navigation isn't blocked by the panel)
    linkEls.forEach(function (el) {
      el.addEventListener('click', function () {
        // small delay lets smooth-scroll start before the drawer animates out
        setTimeout(closeDrawer, 60);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
