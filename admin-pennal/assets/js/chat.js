/* GBET-PENNAL - chat manage (live Firestore chats) */
(function () {
  'use strict';

  var listEl = document.getElementById('chatList');
  var metaEl = document.getElementById('chatMeta');
  var clearBtn = document.getElementById('clearChat');
  var modal = document.getElementById('clearModal');
  var confirmBtn = document.getElementById('clearConfirm');
  var painted = false;

  function remoteChats() {
    return (window.GBET_FB && typeof GBET_FB.chats === 'function') ? GBET_FB.chats() : [];
  }

  function render() {
    var messages = remoteChats().slice();
    messages.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    if (metaEl) metaEl.textContent = messages.length + (messages.length === 1 ? ' message' : ' messages');

    if (!listEl) return;

    if (!messages.length) {
      listEl.innerHTML = '<div class="empty-list">No chat messages yet.</div>';
      painted = true;
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
    painted = true;
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
        render();
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
    }
  }, true);

  document.addEventListener('gbfb:chats', render);

  document.addEventListener('gbfb:error', function () {
    if (painted || !listEl) return;
    listEl.innerHTML = '<div class="empty-list">Could not connect to Firestore. Check network and rules.</div>';
  });

  if (window.GBET_FB) render();
  else if (listEl) listEl.innerHTML = '<div class="empty-list">Connecting to live database\u2026</div>';
})();
