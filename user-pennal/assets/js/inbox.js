/* GUGOBET Support - inbox: simple list, search, filters */
(function () {
  'use strict';

  var body = document.getElementById('inboxBody');
  var searchInput = document.getElementById('searchInput');
  var catFilter = document.getElementById('catFilter');
  var statusFilter = document.getElementById('statusFilter');
  var countLine = document.getElementById('countLine');
  var noticeEl = document.getElementById('storageNotice');

  if (!body) return;

  if (noticeEl) noticeEl.innerHTML = GS.ui.storageWarning();

  var ICONS = {
    tray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
  };

  function esc(s) { return GS.util.escapeHtml(s); }

  function showLoading() {
    body.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading complaints…</p></div>';
    countLine.hidden = true;
  }

  function filtered() {
    var list = GS.complaints.list();
    var q = (searchInput.value || '').trim().toLowerCase();
    var cat = catFilter.value;
    var st = statusFilter.value;

    return list.filter(function (c) {
      if (cat && c.category !== cat) return false;
      if (st && c.status !== st) return false;
      if (!q) return true;
      var hay = [c.id, GS.CATEGORIES[c.category], c.status, c.name, c.uid, c.mobile, c.problemType, c.amount, c.reference, c.userId, c.email]
        .join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }

  function cardHtml(c) {
    var statusClass = 'badge status-' + GS.statusKey(c.status);
    return '<article class="inbox-card" data-id="' + esc(c.id) + '">' +
      '<div class="inbox-top">' +
      '<span class="cat-tag">' + esc(GS.CATEGORIES[c.category]) + '</span>' +
      '<span class="' + statusClass + '">' + esc(c.status) + '</span>' +
      '</div>' +
      '<div class="inbox-meta">' +
      '<span>' + esc(GS.util.fmtDateTime(c.createdAt)) + '</span>' +
      '</div>' +
      '<a class="btn btn-primary inbox-cta" href="complaint.html?id=' + encodeURIComponent(c.id) + '">View Details</a>' +
      '</article>';
  }

  function emptyHtml(kind) {
    if (kind === 'filtered') {
      return '<div class="empty-state">' + ICONS.tray + '<p>No complaints match your search or filters.</p></div>';
    }
    return '<div class="empty-state">' + ICONS.tray + '<p>No complaints saved yet. Submit a complaint to see it here.</p></div>';
  }

  function render() {
    var list = filtered();
    var total = GS.complaints.list().length;
    var filtering = !!(searchInput.value || '').trim() || catFilter.value || statusFilter.value;

    if (!list.length) {
      body.innerHTML = emptyHtml(total ? 'filtered' : 'empty');
      countLine.hidden = true;
      return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) html += cardHtml(list[i]);
    body.innerHTML = '<div class="inbox-list">' + html + '</div>';

    countLine.hidden = false;
    countLine.textContent = list.length + (list.length === 1 ? ' complaint' : ' complaints') +
      (filtering && list.length !== total ? ' of ' + total : '');
  }

  searchInput.addEventListener('input', render);
  catFilter.addEventListener('change', render);
  statusFilter.addEventListener('change', render);

  window.addEventListener('storage', function (e) {
    if (e.key === GS.KEYS.complaints) render();
  });

  showLoading();
  setTimeout(render, 120);
})();
