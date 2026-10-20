/* GBET-PENNAL - shared menu drawer + toast */
(function () {
  'use strict';

  var ICONS = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.2 12 3.5l8.5 6.7"/><path d="M5.5 9.2V20h13V9.2"/><path d="M9.8 20v-5.4h4.4V20"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.5a8 8 0 0 1-8.5 8 9 9 0 0 1-3.4-.7L3.5 20l1.3-4.6a8 8 0 1 1 15.7-3.9z"/><line x1="8.5" y1="11.5" x2="15.5" y2="11.5"/><line x1="8.5" y1="8" x2="13" y2="8"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 15.5v-2l-7.5-4.6V3.6a1.6 1.6 0 0 0-3.2 0v5.3L3.3 13.5v2l7.5-2.3v4.6l-2.3 1.6v1.4l3.9-1.1 3.9 1.1v-1.4l-2.3-1.6v-4.6z"/></svg>'
  };

  var NAV = [
    { key: 'home', label: 'Home page', href: 'index.html', icon: ICONS.home },
    { key: 'chat', label: 'Chat manage', href: 'chat.html', icon: ICONS.chat },
    { key: 'settings', label: 'Setting', href: 'settings.html', icon: ICONS.settings }
  ];

  var page = (document.body && document.body.getAttribute('data-page')) || '';
  var drawer = null;

  function build() {
    if (drawer) return;

    var items = '';
    for (var i = 0; i < NAV.length; i++) {
      var n = NAV[i];
      items += '<a class="drawer-item' + (n.key === page ? ' is-active' : '') + '" href="' + n.href + '" data-nav="' + n.key + '">' +
        '<span class="drawer-ic">' + n.icon + '</span>' +
        '<span class="drawer-label">' + n.label + '</span>' +
        '<span class="drawer-mark"></span>' +
        '</a>';
    }

    drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.id = 'adminDrawer';
    drawer.hidden = true;
    drawer.innerHTML =
      '<div class="drawer-backdrop" data-drawer-close></div>' +
      '<aside class="drawer-panel" role="dialog" aria-modal="true" aria-label="Menu">' +
      '<div class="drawer-head">' +
      '<span class="brand-logo"><img src="logo/logo.cb987a2.png" alt="GBET logo"></span>' +
      '<div class="brand-text"><strong>GBET-PENNAL</strong><span>Support admin</span></div>' +
      '<button type="button" class="modal-x" data-drawer-close aria-label="Close menu">' + ICONS.close + '</button>' +
      '</div>' +
      '<nav class="drawer-nav">' + items + '</nav>' +
      '<div class="drawer-foot">' + ICONS.plane + '<span>Offline · data saved on this device</span></div>' +
      '</aside>';

    document.body.appendChild(drawer);

    drawer.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-drawer-close]')) close();
    });
  }

  function open() {
    build();
    drawer.hidden = false;
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var active = drawer.querySelector('.drawer-item.is-active');
    if (active) active.focus();
  }

  function close() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    drawer.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  var menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.innerHTML = ICONS.menu;
    menuBtn.setAttribute('aria-label', 'Open menu');
    menuBtn.addEventListener('click', open);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && !drawer.hidden) {
      e.preventDefault();
      close();
    }
  }, true);

  /* ---- toast ---- */

  var toastEl = null;
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      toastEl.innerHTML = ICONS.check + '<span></span>';
      document.body.appendChild(toastEl);
    }
    var span = toastEl.querySelector('span');
    if (span) span.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('show');
    }, 1800);
  }

  window.GBETUI = { toast: toast, closeMenu: close };
})();
