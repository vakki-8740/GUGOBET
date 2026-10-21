/* GUGOBET Support - online chat (local demo mode) */
(function () {
  'use strict';

  var log = document.getElementById('chatLog');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var clearBtn = document.getElementById('clearChatBtn');

  if (!log || !form || !input) return;

  function esc(s) { return GS.util.escapeHtml(s); }

  function renderEmpty() {
    log.innerHTML =
      '<div class="chat-empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<p>No messages yet. Start a chat with support.</p>' +
      '</div>';
  }

  function appendMsg(m, animate) {
    var empty = log.querySelector('.chat-empty');
    if (empty) empty.remove();

    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (m.role === 'user' ? 'user' : 'system');
    if (!animate) wrap.style.animation = 'none';

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = m.text;

    var time = document.createElement('div');
    time.className = 'time';
    time.textContent = GS.util.fmtDateTime(m.createdAt);

    wrap.appendChild(bubble);
    wrap.appendChild(time);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }

  function renderAll() {
    var list = GS.chat.list();
    if (!list.length) { renderEmpty(); return; }
    log.innerHTML = '';
    for (var i = 0; i < list.length; i++) appendMsg(list[i], false);
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = (input.value || '').trim();
    if (!text) { input.focus(); return; }

    var res = GS.chat.add(text, 'user');
    if (!res.ok) {
      GS.ui.toast(res.error || 'Message could not be saved.', 'error');
      return;
    }

    if (window.GBET_FB_USER && typeof GBET_FB_USER.sendChat === 'function') {
      GBET_FB_USER.sendChat(text, 'user').catch(function () {
        /* offline: message is still saved on this device */
      });
    }

    appendMsg({ text: text, role: 'user', createdAt: new Date().toISOString() }, true);
    input.value = '';
    input.focus();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      GS.ui.confirmDialog({
        title: 'Clear chat history?',
        message: 'All saved messages on this device will be deleted.',
        confirmText: 'Clear',
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        var res = GS.chat.clear();
        if (!res.ok) { GS.ui.toast(res.error || 'Could not clear chat.', 'error'); return; }
        if (window.GBET_FB_USER && typeof GBET_FB_USER.clearChats === 'function') {
          GBET_FB_USER.clearChats().catch(function () { /* offline */ });
        }
        renderEmpty();
        GS.ui.toast('Chat history cleared.', 'success');
      });
    });
  }

  window.addEventListener('storage', function (e) {
    if (e.key === GS.KEYS.chat) renderAll();
  });

  document.addEventListener('gbfb:chat', renderAll);

  renderAll();
})();
