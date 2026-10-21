/* GUGOBET Support - complaint details page (?id=...) */
(function () {
  'use strict';

  var mount = document.getElementById('complaintView');
  if (!mount) return;

  var noticeEl = document.getElementById('storageNotice');
  if (noticeEl) noticeEl.innerHTML = GS.ui.storageWarning();

  var ICONS = {
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    tray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
  };

  function esc(s) { return GS.util.escapeHtml(s); }

  function queryId() {
    try { return new URLSearchParams(window.location.search).get('id') || ''; } catch (e) { return ''; }
  }

  function row(k, v) {
    if (!v || v === '\u2014') return '';
    return '<div class="detail-item"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
  }

  function notFound() {
    mount.innerHTML =
      '<div class="empty-state">' + ICONS.tray +
      '<p>Complaint not found on this device.</p>' +
      '<a class="btn btn-primary" href="inbox.html">Back to Inbox</a>' +
      '</div>';
  }

  function render(c) {
    var statusClass = 'badge status-' + GS.statusKey(c.status);

    var html =
      '<section class="detail-page">' +
      '<div class="detail-hero">' +
      '<span class="cat-tag">' + esc(GS.CATEGORIES[c.category]) + '</span>' +
      '<span class="' + statusClass + '">' + esc(c.status) + '</span>' +
      '</div>' +
      '<p class="detail-date">' + esc(GS.util.fmtDateTime(c.createdAt)) + '</p>' +
      '<div class="detail-list">' +
      row('User Name', c.name) +
      row('UID', c.uid) +
      row('Mobile', c.mobile) +
      row('Problem Type', c.problemType) +
      row('Amount', c.amount) +
      row('Reference', c.reference) +
      row('Date', c.date) +
      row('Payment Method', c.paymentMethod) +
      row('User ID', c.userId) +
      row('Email', c.email) +
      row('Details', c.details) +
      '</div>' +
      (c.proof ? '<button type="button" class="btn btn-ghost btn-block proof-open" data-act="proof">' + ICONS.image + 'View attached image</button>' : '') +
      '<div class="modal-actions detail-actions">' +
      '<button type="button" class="btn btn-ghost" data-act="status">Status</button>' +
      '<button type="button" class="btn btn-danger" data-act="delete">Delete</button>' +
      '</div>' +
      '</section>';

    mount.innerHTML = html;

    var proofBtn = mount.querySelector('[data-act="proof"]');
    if (proofBtn) proofBtn.addEventListener('click', function () { openProof(c.proof); });

    mount.querySelector('[data-act="status"]').addEventListener('click', function () { openStatus(c); });
    mount.querySelector('[data-act="delete"]').addEventListener('click', function () { askDelete(c); });
  }

  function openStatus(c) {
    var explanation = c.status === GS.STATUSES.success
      ? 'This complaint has been marked as resolved by the support team.'
      : c.status === GS.STATUSES.processing
        ? 'Your complaint is being reviewed by the support team.'
        : 'Your complaint is pending and waiting to be reviewed by the support team.';

    var html =
      '<h3>Complaint Status</h3>' +
      '<div class="detail-list">' +
      '<div class="detail-item"><span class="k">Current status</span><span class="v">' + esc(c.status) + '</span></div>' +
      '<div class="detail-item"><span class="k">Saved on</span><span class="v">' + esc(GS.util.fmtDateTime(c.createdAt)) + '</span></div>' +
      '</div>' +
      '<div class="notice" style="margin-top:14px;">' + ICONS.info + '<span>' + esc(explanation) + '</span></div>' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn btn-primary btn-block" data-act="close">Close</button>' +
      '</div>';

    var root = GS.ui.openModal(html, null);
    root.querySelector('[data-act="close"]').addEventListener('click', GS.ui.closeModal);
  }

  function askDelete(c) {
    GS.ui.confirmDialog({
      title: 'Delete complaint?',
      message: 'This complaint will be permanently removed from this device and the support center.',
      confirmText: 'Delete',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      var res = GS.complaints.remove(c.id);
      if (!res.ok) {
        GS.ui.toast(res.error || 'Could not delete the complaint.', 'error');
        return;
      }
      if (window.GBET_FB_USER && typeof GBET_FB_USER.deleteComplaint === 'function') {
        GBET_FB_USER.deleteComplaint(c.id).catch(function () { /* offline: local copy is gone */ });
      }
      GS.ui.toast('Complaint deleted.', 'success');
      window.location.href = 'inbox.html';
    });
  }

  /* ---- image viewer (60% width, close button below) ---- */

  var viewer = null;

  function buildViewer() {
    if (viewer) return;
    viewer = document.createElement('div');
    viewer.className = 'proof-viewer';
    viewer.hidden = true;
    viewer.innerHTML =
      '<div class="proof-backdrop" data-close></div>' +
      '<div class="proof-stage">' +
      '<img class="proof-img" alt="Complaint attachment">' +
      '<button type="button" class="proof-close" data-close>Close</button>' +
      '</div>';
    document.body.appendChild(viewer);

    viewer.addEventListener('click', function (e) {
      var closer = e.target.closest ? e.target.closest('[data-close]') : null;
      if (closer) closeProof();
    });
  }

  function openProof(src) {
    buildViewer();
    viewer.querySelector('.proof-img').src = src;
    viewer.hidden = false;
    viewer.querySelector('.proof-close').focus();
  }

  function closeProof() {
    if (!viewer || viewer.hidden) return;
    viewer.hidden = true;
    viewer.querySelector('.proof-img').removeAttribute('src');
    if (!document.querySelector('.modal-root.open')) document.body.style.overflow = '';
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !viewer || viewer.hidden) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    closeProof();
  }, true);

  /* ---- boot ---- */

  var id = queryId();
  var list = GS.complaints.list();
  var complaint = null;

  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) { complaint = list[i]; break; }
  }

  if (!complaint) notFound();
  else render(complaint);

  function refreshComplaint() {
    if (!complaint) return;
    var updated = GS.complaints.get(complaint.id);
    if (!updated) return;
    var changed = updated.status !== complaint.status;
    complaint = updated;
    if (changed && document.querySelector('.modal-root.open')) GS.ui.closeModal();
    render(complaint);
    if (changed) GS.ui.toast('Status updated: ' + complaint.status, 'success');
  }

  document.addEventListener('gbfb:status', function (e) {
    if (!complaint || !e.detail || e.detail.id !== complaint.id) return;
    refreshComplaint();
  });

  window.addEventListener('storage', function (e) {
    if (e.key === GS.KEYS.complaints) refreshComplaint();
  });
})();
