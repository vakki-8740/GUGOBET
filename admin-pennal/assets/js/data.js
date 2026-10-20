/* GBET-PENNAL - shared helpers (live data comes from Firestore) */
(function () {
  'use strict';

  var CATEGORIES = {
    deposit: 'Deposit Problem',
    withdrawal: 'Withdrawal Problem',
    email: 'Email Verification'
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function statusKey(status) {
    var v = String(status || '').toLowerCase();
    if (v === 'processing') return 'processing';
    if (v === 'success' || v === 'submitted') return 'success';
    return 'pending';
  }

  function statusLabel(status) {
    var k = statusKey(status);
    return k === 'processing' ? 'Processing' : k === 'success' ? 'Success' : 'Pending';
  }

  function isToday(iso) {
    var d = new Date(iso);
    var now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '\u2014';
    return pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '\u2014';
    var h = d.getHours();
    var suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return pad(h) + ':' + pad(d.getMinutes()) + ' ' + suffix;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var AVATAR = 'user-icon/2288510.png';

  function avatarHtml() {
    return '<span class="avatar">' +
      '<svg class="avatar-fb" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<circle cx="12" cy="8" r="3.8"/><path d="M4.2 20.4c0-4 3.5-6.2 7.8-6.2s7.8 2.2 7.8 6.2z"/>' +
      '</svg>' +
      '<img src="' + AVATAR + '" alt="" loading="lazy" onerror="this.remove()">' +
      '</span>';
  }

  window.GBET = {
    isToday: isToday,
    fmtDate: fmtDate,
    fmtTime: fmtTime,
    statusKey: statusKey,
    statusLabel: statusLabel,
    categories: CATEGORIES,
    avatarHtml: avatarHtml,
    esc: esc
  };
})();
