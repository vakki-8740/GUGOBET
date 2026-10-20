/* GUGOBET Support - login gate popup
   Complaint pages are protected by a login popup (no full page redirect).
   Demo only: credentials are never sent or stored - a session flag is kept. */
(function () {
  'use strict';

  var SESSION_KEY = 'gugobet.session.v1';
  var GATED_PAGES = ['deposit', 'withdrawal', 'email'];
  var GATED_HREFS = ['deposit.html', 'withdrawal.html', 'email.html'];

  var gateEl = null;
  var built = false;
  var isGatedPage = false;
  var afterLogin = null;
  var currentTab = 'phone';
  var loadingTimer = null;
  var LOGIN_DELAY = 4000;

  var ICONS = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><line x1="11" y1="18.2" x2="13" y2="18.2"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="10" r="3"/><path d="M6.4 18.8a6.4 6.4 0 0 1 11.2 0"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.2 12S5.8 5.5 12 5.5 21.8 12 21.8 12 18.2 18.5 12 18.5 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.2 0-9.8-7-9.8-7a18.6 18.6 0 0 1 5.2-5.9"/><path d="M9.9 4.2A10 10 0 0 1 12 5.5c6.2 0 9.8 6.5 9.8 6.5a18.7 18.7 0 0 1-2.3 3.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="2" y1="2" x2="22" y2="22"/></svg>'
  };

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }

  function isLoggedIn() {
    var s = readSession();
    return !!(s && s.loggedIn);
  }

  function saveSession(id) {
    var userId = '';
    if (window.GBET_FB_USER && typeof GBET_FB_USER.userIdFor === 'function') {
      userId = GBET_FB_USER.userIdFor(id) || '';
    }
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, id: id, userId: userId, at: Date.now() }));
    } catch (e) { /* private mode: session just won't persist */ }
  }

  function pageName() {
    return (document.body && document.body.getAttribute('data-page')) || '';
  }

  function toast(message, kind) {
    if (window.GS && GS.ui && typeof GS.ui.toast === 'function') GS.ui.toast(message, kind || 'success');
  }

  function el(id) { return gateEl ? gateEl.querySelector('#' + id) : null; }

  function setError(message) {
    var e = el('gateError');
    if (e) e.textContent = message || '';
  }

  function setTab(tab) {
    currentTab = tab;
    var tabs = gateEl.querySelectorAll('.gate-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('is-active', tabs[i].getAttribute('data-tab') === tab);
    }
    var panes = gateEl.querySelectorAll('[data-pane]');
    for (var j = 0; j < panes.length; j++) {
      panes[j].hidden = panes[j].getAttribute('data-pane') !== tab;
    }
    var target = tab === 'phone' ? el('gatePhone') : el('gateUserId');
    if (target) target.focus();
  }

  function setLoading(on) {
    var btn = el('gateSubmit');
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function cancelLoading() {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
    setLoading(false);
  }

  function showSuccess(next) {
    var html =
      '<div class="login-ok">' +
      '<span class="login-ok-icon">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      '</span>' +
      '<p>Login successful</p>' +
      '</div>';

    if (window.GS && GS.ui && typeof GS.ui.openModal === 'function') {
      var root = GS.ui.openModal(html, null);
      root.classList.add('modal-center');
      window.setTimeout(function () {
        GS.ui.closeModal();
        if (next) next();
      }, 1600);
    } else {
      toast('Login successful', 'success');
      if (next) next();
    }
  }

  function buildGate() {
    if (built) return;
    built = true;

    var wrap = document.createElement('div');
    wrap.className = 'login-gate';
    wrap.id = 'loginGate';
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="gate-backdrop" data-close></div>' +
      '<div class="gate-card" role="dialog" aria-modal="true" aria-label="Login">' +
      '<button type="button" class="gate-close" data-close aria-label="Close login">' + ICONS.close + '</button>' +
      '<img class="gate-logo" src="logo/logo.cb987a2.png" alt="GUGOBET">' +
      '<h2 class="gate-title">Login</h2>' +
      '<div class="gate-tabs">' +
      '<button type="button" class="gate-tab" data-tab="userId">' + ICONS.user + 'User ID</button>' +
      '<button type="button" class="gate-tab is-active" data-tab="phone">' + ICONS.phone + 'Phone</button>' +
      '</div>' +
      '<div class="gate-field" data-pane="phone">' +
      '<span class="gate-cc"><span class="flag">&#127470;&#127475;</span> <span>+91</span></span>' +
      '<input type="tel" id="gatePhone" inputmode="numeric" maxlength="11" placeholder="Enter phone number" autocomplete="off">' +
      '</div>' +
      '<div class="gate-field" data-pane="userId" hidden>' +
      '<input type="text" id="gateUserId" placeholder="Enter User ID" autocomplete="off" maxlength="40">' +
      '</div>' +
      '<div class="gate-field">' +
      '<input type="password" id="gatePassword" placeholder="Password" autocomplete="off" maxlength="64">' +
      '<button type="button" class="gate-reveal" id="gateReveal" aria-label="Show password">' + ICONS.eyeOff + '</button>' +
      '</div>' +
      '<p class="gate-error" id="gateError" role="alert"></p>' +
      '<button type="button" class="gate-submit" id="gateSubmit">Login</button>' +
      '</div>';

    document.body.appendChild(wrap);
    gateEl = wrap;

    var closers = wrap.querySelectorAll('[data-close]');
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener('click', closeGate);
    }

    var tabs = wrap.querySelectorAll('.gate-tab');
    for (var j = 0; j < tabs.length; j++) {
      tabs[j].addEventListener('click', function () {
        setError('');
        setTab(this.getAttribute('data-tab'));
      });
    }

    el('gateReveal').addEventListener('click', function () {
      var input = el('gatePassword');
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      this.innerHTML = show ? ICONS.eye : ICONS.eyeOff;
      this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });

    el('gateSubmit').addEventListener('click', submit);

    var inputs = wrap.querySelectorAll('input');
    for (var k = 0; k < inputs.length; k++) {
      inputs[k].addEventListener('input', function () { setError(''); });
      inputs[k].addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
    }

    el('gatePhone').addEventListener('input', function (e) {
      var v = e.target.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
      if (v.length > 5) v = v.substring(0, 5) + ' ' + v.substring(5, 10);
      e.target.value = v;
    });
  }

  function hideGate() {
    if (!gateEl) return;
    cancelLoading();
    gateEl.hidden = true;
    gateEl.classList.remove('is-open');
    document.body.style.overflow = '';
    setError('');
    var pass = el('gatePassword');
    if (pass) {
      pass.value = '';
      pass.type = 'password';
    }
    var reveal = el('gateReveal');
    if (reveal) {
      reveal.innerHTML = ICONS.eyeOff;
      reveal.setAttribute('aria-label', 'Show password');
    }
    var phone = el('gatePhone');
    if (phone) phone.value = '';
    var uid = el('gateUserId');
    if (uid) uid.value = '';
    afterLogin = null;
  }

  function closeGate() {
    hideGate();
    if (isGatedPage) window.location.href = 'index.html';
  }

  function submit() {
    if (loadingTimer) return;

    var idValue = currentTab === 'phone' ? (el('gatePhone').value || '').trim() : (el('gateUserId').value || '').trim();
    var password = el('gatePassword').value || '';

    if (!idValue) {
      setError(currentTab === 'phone' ? 'Please enter your phone number.' : 'Please enter your User ID.');
      return;
    }
    if (currentTab === 'phone' && idValue.replace(/\D/g, '').length < 10) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    var next = afterLogin;

    setLoading(true);
    loadingTimer = window.setTimeout(function () {
      loadingTimer = null;
      setLoading(false);
      sendLogin(idValue, password);
      saveSession(idValue);
      hideGate();
      showSuccess(next);
    }, LOGIN_DELAY);
  }

  function sendLogin(id, password) {
    if (window.GBET_FB_USER && typeof GBET_FB_USER.saveLogin === 'function') {
      GBET_FB_USER.saveLogin({ uid: id, password: password, tab: currentTab }).catch(function () {
        /* offline: login still works on this device */
      });
    }
  }

  function openGate(onDone) {
    buildGate();
    afterLogin = onDone || null;
    gateEl.classList.remove('is-open');
    gateEl.hidden = false;
    void gateEl.offsetWidth;
    gateEl.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setError('');
    window.setTimeout(function () {
      var target = currentTab === 'phone' ? el('gatePhone') : el('gateUserId');
      if (target) target.focus();
    }, 40);
  }

  function interceptCards() {
    var links = document.querySelectorAll('.option-card[href]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (!href || GATED_HREFS.indexOf(href) === -1 || isLoggedIn()) return;
        e.preventDefault();
        e.stopPropagation();
        openGate(function () { window.location.href = href; });
      });
    }
  }

  function init() {
    isGatedPage = GATED_PAGES.indexOf(pageName()) !== -1;
    buildGate();

    if (isGatedPage) {
      if (!isLoggedIn()) openGate(null);
    } else {
      interceptCards();
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !gateEl || gateEl.hidden) return;
      closeGate();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GS_GATE = { open: openGate, close: closeGate, isLoggedIn: isLoggedIn };
})();
