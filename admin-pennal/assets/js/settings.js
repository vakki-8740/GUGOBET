/* GBET-PENNAL - settings (live Firestore) */
(function () {
  'use strict';

  function countComplaints() {
    return (window.GBET_FB && typeof GBET_FB.list === 'function') ? GBET_FB.list().length : 0;
  }

  function countChats() {
    return (window.GBET_FB && typeof GBET_FB.chats === 'function') ? GBET_FB.chats().length : 0;
  }

  function paintCounts() {
    var complaints = document.getElementById('setComplaints');
    var chats = document.getElementById('setChats');
    var conn = document.getElementById('setConn');
    if (complaints) complaints.textContent = countComplaints();
    if (chats) chats.textContent = countChats();
    if (conn) conn.textContent = window.GBET_FB ? 'Live' : 'Connecting\u2026';
  }

  document.addEventListener('gbfb:complaints', paintCounts);
  document.addEventListener('gbfb:chats', paintCounts);
  document.addEventListener('gbfb:error', function () {
    var conn = document.getElementById('setConn');
    if (conn) conn.textContent = 'Offline';
  });

  paintCounts();
})();
