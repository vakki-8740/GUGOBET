/* GBET-PENNAL - chat manage: user list + per-user conversation */
(function () {
  'use strict';

  var listEl = document.getElementById('userList');
  var listHead = document.getElementById('listHead');
  var metaEl = document.getElementById('chatMeta');
  var threadView = document.getElementById('threadView');
  var threadBack = document.getElementById('threadBack');
  var threadLog = document.getElementById('threadLog');
  var threadName = document.getElementById('threadName');
  var threadStatus = document.getElementById('threadStatus');
  var threadMeta = document.getElementById('threadMeta');
  var threadForm = document.getElementById('threadForm');
  var threadInput = document.getElementById('threadInput');
  var threadSend = document.getElementById('threadSend');
  var clearBtn = document.getElementById('clearChat');
  var modal = document.getElementById('clearModal');
  var confirmBtn = document.getElementById('clearConfirm');
  var liveChip = document.getElementById('liveChip');

  var selectedUserId = '';
  var cachedUsers = [];
  var painted = false;
  var ONLINE_WINDOW = 90000;

  function esc(s) { return GBET.esc(s); }

  function remote(name) {
    return (window.GBET_FB && typeof GBET_FB[name] === 'function') ? GBET_FB[name]() : [];
  }

  function setLive() {
    if (liveChip) liveChip.textContent = 'Live';
  }

  function ms(value) {
    if (typeof value === 'number') return value;
    var t = Date.parse(value || '');
    return isNaN(t) ? 0 : t;
  }

  function ago(value) {
    var t = ms(value);
    if (!t) return '';
    var diff = Math.max(0, Date.now() - t);
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    return days + 'd ago';
  }

  function buildUsers() {
    var map = {};

    function ensure(id) {
      id = String(id || '').trim();
      if (!id) return null;
      if (!map[id]) map[id] = { id: id, name: '', login: null, lastSeen: 0, presence: null, online: false };
      return map[id];
    }

    remote('logins').forEach(function (login) {
      var id = login.userId || login.uid;
      var user = ensure(id);
      if (!user) return;
      if (!user.login) user.login = login;
      user.lastSeen = Math.max(user.lastSeen, ms(login.createdAt));
    });

    remote('complaints').forEach(function (complaint) {
      var user = ensure(complaint.userId);
      if (!user) return;
      if (complaint.name && !user.name) user.name = complaint.name;
      user.lastSeen = Math.max(user.lastSeen, ms(complaint.createdAt));
    });

    remote('chats').forEach(function (message) {
      var user = ensure(message.userId);
      if (!user) return;
      user.lastSeen = Math.max(user.lastSeen, ms(message.createdAt));
    });

    remote('presence').forEach(function (p) {
      var user = ensure(p.userId);
      if (!user) return;
      user.presence = p;
      user.lastSeen = Math.max(user.lastSeen, ms(p.lastSeen));
    });

    var users = [];
    Object.keys(map).forEach(function (id) {
      var user = map[id];
      if (!user.name) {
        var login = user.login || {};
        var loginName = login.name && login.name !== login.uid ? login.name : '';
        user.name = loginName || login.uid || id;
      }
      var lastSeen = user.presence ? ms(user.presence.lastSeen) : 0;
      user.online = !!(user.presence && user.presence.online &&
        lastSeen && Date.now() - lastSeen < ONLINE_WINDOW);
      user.lastSeen = Math.max(user.lastSeen, lastSeen);
      user.status = user.online
        ? 'Online'
        : 'Offline' + (user.lastSeen ? ' \u00B7 ' + ago(user.lastSeen) : '');
      users.push(user);
    });

    users.sort(function (a, b) {
      if (a.online !== b.online) return a.online ? -1 : 1;
      if (b.lastSeen !== a.lastSeen) return b.lastSeen - a.lastSeen;
      return a.name.localeCompare(b.name);
    });
    return users;
  }

  function statusHtml(user) {
    return '<span class="user-status ' + (user.online ? 'is-online' : 'is-offline') + '">' +
      '<i></i>' + esc(user.status) + '</span>';
  }

  function renderUsers() {
    var users = buildUsers();
    cachedUsers = users;

    if (threadView) threadView.hidden = true;
    if (listEl) listEl.hidden = false;
    if (listHead) listHead.hidden = false;
    if (clearBtn) clearBtn.hidden = false;
    if (metaEl) metaEl.textContent = users.length + (users.length === 1 ? ' user' : ' users');
    if (window.GBET_FB || painted) setLive();

    if (!listEl) return;
    if (!users.length) {
      listEl.innerHTML = window.GBET_FB
        ? '<div class="empty-list">No users yet.</div>'
        : '<div class="empty-list">Connecting to live database\u2026</div>';
      painted = true;
      return;
    }

    var html = '';
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      html += '<button type="button" class="user-row" data-user="' + esc(u.id) + '">' +
        '<span class="user-avatar"><img src="user-icon/2288510.png" alt=""></span>' +
        '<span class="user-main">' +
        '<span class="user-name">' + esc(u.name) + '</span>' +
        statusHtml(u) +
        '</span>' +
        '<span class="user-chevron">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</span>' +
        '</button>';
    }
    listEl.innerHTML = html;
    painted = true;
  }

  function selectedUser() {
    for (var i = 0; i < cachedUsers.length; i++) {
      if (cachedUsers[i].id === selectedUserId) return cachedUsers[i];
    }
    return null;
  }

  function renderThread() {
    var user = selectedUser();
    if (!user) {
      selectedUserId = '';
      renderUsers();
      return;
    }

    cachedUsers = buildUsers();
    user = selectedUser() || user;

    if (listEl) listEl.hidden = true;
    if (listHead) listHead.hidden = true;
    if (clearBtn) clearBtn.hidden = true;
    if (threadView) threadView.hidden = false;
    setLive();

    if (threadName) threadName.textContent = user.name;
    if (threadStatus) {
      threadStatus.className = 'user-status ' + (user.online ? 'is-online' : 'is-offline');
      threadStatus.innerHTML = '<i></i>' + esc(user.status);
    }
    if (threadMeta) {
      var count = remote('chats').filter(function (m) { return m.userId === selectedUserId; }).length;
      threadMeta.textContent = count + (count === 1 ? ' message' : ' messages');
    }

    if (!threadLog) return;
    var messages = remote('chats').filter(function (m) {
      return m.userId === selectedUserId;
    }).sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });

    if (!messages.length) {
      threadLog.innerHTML = '<div class="thread-empty">No messages yet. Start the conversation below.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var mine = m.role === 'support' || m.role === 'system';
      html += '<div class="thread-msg ' + (mine ? 'is-support' : 'is-user') + '">' +
        '<div class="thread-bubble">' + esc(m.text) + '</div>' +
        '<span class="thread-time">' + esc(GBET.fmtTime(m.createdAt)) + ' \u00B7 ' + esc(GBET.fmtDate(m.createdAt)) + '</span>' +
        '</div>';
    }
    threadLog.innerHTML = html;
    threadLog.scrollTop = threadLog.scrollHeight;
  }

  function refresh() {
    cachedUsers = buildUsers();
    if (selectedUserId) {
      var found = false;
      for (var i = 0; i < cachedUsers.length; i++) {
        if (cachedUsers[i].id === selectedUserId) { found = true; break; }
      }
      if (!found) selectedUserId = '';
    }
    if (selectedUserId) renderThread();
    else renderUsers();
  }

  function openUser(id) {
    selectedUserId = String(id || '');
    renderThread();
  }

  function closeThread() {
    selectedUserId = '';
    renderUsers();
  }

  if (listEl) {
    listEl.addEventListener('click', function (e) {
      var row = e.target.closest ? e.target.closest('[data-user]') : null;
      if (row) openUser(row.getAttribute('data-user'));
    });
  }

  if (threadBack) threadBack.addEventListener('click', closeThread);

  if (threadForm) {
    threadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (threadInput && threadInput.value || '').trim();
      if (!text || !selectedUserId) {
        if (threadInput) threadInput.focus();
        return;
      }
      if (!window.GBET_FB || typeof GBET_FB.reply !== 'function') {
        if (window.GBETUI) GBETUI.toast('Cloud not connected');
        return;
      }
      if (threadSend) threadSend.disabled = true;
      GBET_FB.reply(selectedUserId, text).then(function () {
        if (threadSend) threadSend.disabled = false;
        if (threadInput) { threadInput.value = ''; threadInput.focus(); }
        if (window.GBETUI) GBETUI.toast('Reply sent');
        renderThread();
      }, function () {
        if (threadSend) threadSend.disabled = false;
        if (window.GBETUI) GBETUI.toast('Could not send reply');
      });
    });
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    if (confirmBtn) confirmBtn.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  if (clearBtn) clearBtn.addEventListener('click', openModal);

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-close]')) closeModal();
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', function () {
      if (!window.GBET_FB || typeof GBET_FB.clearChats !== 'function') {
        closeModal();
        if (window.GBETUI) GBETUI.toast('Cloud not connected');
        return;
      }
      GBET_FB.clearChats().then(function () {
        closeModal();
        refresh();
        if (window.GBETUI) GBETUI.toast('All chats cleared');
      }, function () {
        if (window.GBETUI) GBETUI.toast('Could not clear chats');
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal && !modal.hidden) {
      e.preventDefault();
      closeModal();
      return;
    }
    if (selectedUserId) {
      e.preventDefault();
      closeThread();
    }
  }, true);

  document.addEventListener('gbfb:chats', refresh);
  document.addEventListener('gbfb:logins', refresh);
  document.addEventListener('gbfb:complaints', refresh);
  document.addEventListener('gbfb:presence', refresh);

  document.addEventListener('gbfb:error', function () {
    if (painted || !listEl) return;
    listEl.innerHTML = '<div class="empty-list">Could not connect to Firestore. Check network and rules.</div>';
  });

  window.setInterval(refresh, 30000);

  if (window.GBET_FB) renderUsers();
  else if (listEl) listEl.innerHTML = '<div class="empty-list">Connecting to live database\u2026</div>';
})();
