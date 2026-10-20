/* GBET-PENNAL - settings */
(function () {
  'use strict';

  var KEY = 'gugobet.chat.v1';

  function chatCount() {
    try {
      var arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(arr) ? arr.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function paintCounts() {
    var complaints = document.getElementById('setComplaints');
    var chats = document.getElementById('setChats');
    if (complaints) complaints.textContent = GBET.list().length;
    if (chats) chats.textContent = chatCount();
  }

  var resetBtn = document.getElementById('resetDemo');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      GBET.resetDemo();
      paintCounts();
      if (window.GBETUI) GBETUI.toast('Demo complaints reset');
    });
  }

  paintCounts();
})();
