/* GUGOBET Support - shared shell: sidebar, navigation, icons */
(function () {
  'use strict';

  var SVG = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><polyline points="15 17 20 12 15 7"/><line x1="20" y1="12" x2="9" y2="12"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>',
    deposit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M12 13v4"/><path d="M10 15h4"/></svg>',
    withdrawal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 7v2M12 15v2"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  };

  var MENU = [
    { key: 'home', href: 'index.html', label: 'Home', icon: SVG.home },
    { key: 'deposit', href: 'deposit.html', label: 'Deposit problem', icon: SVG.deposit },
    { key: 'withdrawal', href: 'withdrawal.html', label: 'Withdrawal problem', icon: SVG.withdrawal },
    { key: 'email', href: 'email.html', label: 'E-mail verification', icon: SVG.mail },
    { key: 'chat', href: 'chat.html', label: 'Online chat', icon: SVG.chat }
  ];

  var sidebar, overlay, menuBtn;

  function currentPage() {
    return document.body.getAttribute('data-page') || 'home';
  }

  function buildSidebar() {
    var active = currentPage();
    var items = '';
    for (var i = 0; i < MENU.length; i++) {
      var m = MENU[i];
      items +=
        '<a class="menu-item' + (m.key === active ? ' active' : '') + '" href="' + m.href + '"' +
        (m.key === active ? ' aria-current="page"' : '') + '>' +
        m.icon + '<span>' + m.label + '</span></a>';
    }

    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('hidden', 'hidden');

    sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.setAttribute('aria-label', 'Navigation menu');
    sidebar.setAttribute('aria-hidden', 'true');
    sidebar.innerHTML =
      '<div class="sidebar-head">' +
      '<img src="logo/logo.cb987a2.png" alt="GUGOBET" class="brand-logo">' +
      '<button type="button" class="icon-btn" data-close aria-label="Close menu">' + SVG.close + '</button>' +
      '</div>' +
      '<nav class="menu">' + items + '</nav>' +
      '<div class="sidebar-foot">' +
      '<p class="sidebar-note">Complaints are sent to the GUGOBET support team. You can track their status in your Inbox.</p>' +
      '<button type="button" class="menu-logout" id="logoutBtn">' + SVG.logout + '<span>Log out</span></button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    overlay.addEventListener('click', closeMenu);
    sidebar.addEventListener('click', function (e) {
      var close = e.target.closest ? e.target.closest('[data-close]') : null;
      if (close) { closeMenu(); return; }
      var logout = e.target.closest ? e.target.closest('#logoutBtn') : null;
      if (logout) { doLogout(); return; }
      var link = e.target.closest ? e.target.closest('a') : null;
      if (link) closeMenu();
    });
  }

  function doLogout() {
    try { sessionStorage.removeItem('gugobet.session.v1'); } catch (e) { /* ignore */ }
    closeMenu();
    if (window.GS && GS.ui && typeof GS.ui.toast === 'function') GS.ui.toast('Logged out', 'success');

    var page = document.body.getAttribute('data-page') || '';
    if (page === 'deposit' || page === 'withdrawal' || page === 'email') {
      window.location.href = 'index.html';
    }
  }

  function openMenu() {
    if (!sidebar) return;
    overlay.removeAttribute('hidden');
    // force reflow so the transition runs
    void overlay.offsetWidth;
    overlay.classList.add('open');
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    if (!sidebar) return;
    overlay.classList.remove('open');
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    setTimeout(function () {
      if (!overlay.classList.contains('open')) overlay.setAttribute('hidden', 'hidden');
    }, 260);
  }

  var SITE_PAGES = ['index.html', 'deposit.html', 'withdrawal.html', 'email.html', 'chat.html', 'inbox.html', 'complaint.html'];
  var NAV_KEY = 'gugobet.nav.stack.v1';

  function currentFile() {
    var f = '';
    try { f = (window.location.pathname || '').split('/').pop() || ''; } catch (e) { f = ''; }
    if (SITE_PAGES.indexOf(f) === -1) f = 'index.html';
    return f;
  }

  function readStack() {
    try {
      var s = JSON.parse(window.sessionStorage.getItem(NAV_KEY));
      if (!Array.isArray(s)) return [];
      return s.filter(function (p) { return SITE_PAGES.indexOf(p) !== -1; });
    } catch (e) {
      return [];
    }
  }

  function writeStack(stack) {
    try { window.sessionStorage.setItem(NAV_KEY, JSON.stringify(stack.slice(-30))); } catch (e) { /* ignore */ }
  }

  /* Keeps a small history stack so the back button works even when
     document.referrer is unavailable (file:// URLs). */
  function trackVisit() {
    var cur = currentFile();
    var stack = readStack();
    var top = stack[stack.length - 1];
    var below = stack[stack.length - 2];

    if (top === cur) { return; }
    if (below === cur) { stack.pop(); }        // user came back
    else { stack.push(cur); }                  // new navigation
    writeStack(stack);
  }

  function backTarget() {
    var cur = currentFile();
    var stack = readStack();
    if (stack[stack.length - 1] === cur) stack.pop();
    var prev = stack[stack.length - 1];
    if (prev && prev !== cur && SITE_PAGES.indexOf(prev) !== -1) {
      writeStack(stack);
      return prev;
    }
    writeStack(stack);
    return 'index.html';
  }

  function initHeader() {
    menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
      menuBtn.innerHTML = SVG.menu;
      menuBtn.setAttribute('aria-label', 'Open menu');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.addEventListener('click', openMenu);
    }

    var backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.innerHTML = SVG.back;
      backBtn.setAttribute('aria-label', 'Go back');
      backBtn.addEventListener('click', function () {
        window.location.href = backTarget();
      });
    }

    var inboxBtn = document.getElementById('inboxBtn');
    if (inboxBtn && !inboxBtn.querySelector('svg')) inboxBtn.innerHTML = SVG.inbox;
  }

  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.modal-root.open')) {
        window.GS && GS.ui.closeModal();
      } else if (sidebar && sidebar.classList.contains('open')) {
        closeMenu();
      }
    });
  }

  function boot() {
    if (!window.GS) return;
    trackVisit();
    buildSidebar();
    initHeader();
    initKeyboard();
    GS.ui.initOfflineNotice();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.GS_NAV = {
    openMenu: openMenu,
    closeMenu: closeMenu,
    icons: SVG,
    backTarget: backTarget,
    trackVisit: trackVisit
  };
})();
