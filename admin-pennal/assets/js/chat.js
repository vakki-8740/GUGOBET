/* GBET-PENNAL - chat manage (reads user panel chat storage) */
(function () {
  'use strict';

  var KEY = 'gugobet.chat.v1';
  var listEl = document.getElementById('chatList');
  var metaEl = document.getElementById('chatMeta');
  var clearBtn = document.getElementById('clearChat');
  var modal = document.getElementById('clearModal');
  var confirmBtn = document.getElementById('clearConfirm');

  function read() {
    try {
      var arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (m) { return m && m.text && m.createdAt; });
    } catch (e) {
      return [];
    }
  }

  function render() {
    var messages = read();
    messages.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    if (metaEl) metaEl.textContent = messages.length + (messages.length === 1 ? ' message' : ' messages');

    if (!messages.length) {
      listEl.innerHTML = '<div class="empty-list">No chat messages found.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var isUser = m.role === 'user';
      html += '<article class="msg-card">' +
        '<div class="msg-top">' +
        '<span class="msg-role ' + (isUser ? 'is-user' : 'is-system') + '">' + (isUser ? 'User' : 'Support') + '</span>' +
        '<span class="msg-time">' + GBET.esc(GBET.fmtTime(m.createdAt)) + ' \u00B7 ' + GBET.esc(GBET.fmtDate(m.createdAt)) + '</span>' +
        '</div>' +
        '<p class="msg-text">' + GBET.esc(m.text) + '</p>' +
        '</article>';
    }
    listEl.innerHTML = html;
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
      try { localStorage.setItem(KEY, '[]'); } catch (e) { /* ignore */ }
      closeModal();
      render();
      if (window.GBETUI) GBETUI.toast('All chats cleared');
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal && !modal.hidden) {
      e.preventDefault();
      closeModal();
    }
  }, true);

  render();
})();
