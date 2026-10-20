/* GBET-PENNAL - dashboard */
(function () {
  'use strict';

  var ICONS = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="3"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="3" y1="9.5" x2="21" y2="9.5"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z"/><path d="m3 12.5 9 4.5 9-4.5"/><path d="m3 17.5 9 4.5 9-4.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 5 16 12 9 19"/></svg>'
  };

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

  function paint(list) {
    var listEl = document.getElementById('complaintList');
    var metaEl = document.getElementById('listMeta');

    var today = 0;
    for (var t = 0; t < list.length; t++) if (GBET.isToday(list[t].createdAt)) today++;

    document.getElementById('todayCount').textContent = today;
    document.getElementById('totalCount').textContent = list.length;

    if (metaEl) metaEl.textContent = list.length + (list.length === 1 ? ' complaint' : ' complaints');

    if (!listEl) return;

    if (!list.length) {
      listEl.innerHTML = '<div class="empty-list">No complaints found.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < list.length; i++) html += card(list[i]);
    listEl.innerHTML = html;
  }

  function localList() { return GBET.list(); }

  paint(localList());

  document.addEventListener('gbfb:complaints', function (e) {
    var remote = e.detail || [];
    paint(remote.length ? remote : localList());
  });

  var iconCalendar = document.getElementById('iconCalendar');
  if (iconCalendar) iconCalendar.innerHTML = ICONS.calendar;
  var iconLayers = document.getElementById('iconLayers');
  if (iconLayers) iconLayers.innerHTML = ICONS.layers;
})();
