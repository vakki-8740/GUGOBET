/* GBET-PENNAL - complaint details */
(function () {
  'use strict';

  var ICONS = {
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.2 12S5.8 5.5 12 5.5 21.8 12 21.8 12 18.2 18.5 12 18.5 2.2 12 2.2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.2 0-9.8-7-9.8-7a18.6 18.6 0 0 1 5.2-5.9"/><path d="M9.9 4.2A10 10 0 0 1 12 5.5c6.2 0 9.8 6.5 9.8 6.5a18.7 18.7 0 0 1-2.3 3.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.6"/><polyline points="21 15.5 16 10.5 5 21"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.2"/><path d="M5.5 15H4.8A1.8 1.8 0 0 1 3 13.2V4.8A1.8 1.8 0 0 1 4.8 3h8.4A1.8 1.8 0 0 1 15 4.8v.7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    tray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
  };

  var esc = GBET.esc;
  var mount = document.getElementById('detailView');

  function money(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    return /^[0-9]/.test(v) ? '\u20B9' + v : v;
  }

  function row(label, value) {
    if (!value) return '';
    return '<div class="row"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  }

  function statusBadge(status) {
    return '<span class="badge st-' + GBET.statusKey(status) + '">' + GBET.statusLabel(status) + '</span>';
  }

  function notFound() {
    mount.innerHTML =
      '<div class="not-found">' + ICONS.tray +
      '<p>Complaint not found.</p>' +
      '<a class="btn-outline" href="index.html">Back to dashboard</a>' +
      '</div>';
  }

  function render(c) {
    var type = c.problemType || GBET.categories[c.category] || 'Complaint';
    var category = GBET.categories[c.category] || 'Complaint';
    var amount = money(c.amount);

    var complaintRows =
      row('Complaint type', category) +
      row('Problem', type) +
      row('Amount', amount) +
      row('Submitted', GBET.fmtDate(c.createdAt) + ' \u00B7 ' + GBET.fmtTime(c.createdAt));

    var loginRows =
      '<div class="row"><span>User ID</span><span class="val-group">' +
      '<b class="val">' + esc(c.uid || '\u2014') + '</b>' +
      (c.uid ? '<button type="button" class="copy-btn" data-copy="uid" aria-label="Copy user ID">' + ICONS.copy + '</button>' : '') +
      '</span></div>';

    var passwordRow = '';
    if (c.password) {
      passwordRow =
        '<div class="row"><span>Password</span>' +
        '<span class="val-group">' +
        '<b class="pass-val" data-pass>\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022</b>' +
        '<button type="button" class="eye-btn" data-eye aria-label="Show password" aria-pressed="false">' + ICONS.eye + '</button>' +
        '<button type="button" class="copy-btn" data-copy="password" aria-label="Copy password">' + ICONS.copy + '</button>' +
        '</span></div>';
    }

    var attachment = c.proof
      ? '<button type="button" class="btn-outline" id="viewImage">' + ICONS.image + 'View image</button>'
      : '<p class="attach-empty">No image attached.</p>';

    mount.innerHTML =
      '<section class="panel">' +
      '<div class="panel-head"><h2>User Login Details</h2></div>' +
      '<div class="rows">' + loginRows + passwordRow + '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Complaint</h2>' + statusBadge(c.status) + '</div>' +
      '<div class="rows">' + complaintRows + '</div>' +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Attachment</h2></div>' +
      attachment +
      '</section>' +

      '<section class="panel">' +
      '<div class="panel-head"><h2>Status</h2></div>' +
      '<button type="button" class="btn-outline" id="openStatus">' + ICONS.refresh + 'Update Status</button>' +
      '</section>';

    var passEl = mount.querySelector('[data-pass]');
    var eyeBtn = mount.querySelector('[data-eye]');
    if (eyeBtn) {
      var shown = false;
      eyeBtn.addEventListener('click', function () {
        shown = !shown;
        passEl.textContent = shown ? c.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
        eyeBtn.innerHTML = shown ? ICONS.eyeOff : ICONS.eye;
        eyeBtn.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
        eyeBtn.setAttribute('aria-pressed', shown ? 'true' : 'false');
      });
    }

    var copyButtons = mount.querySelectorAll('[data-copy]');
    for (var i = 0; i < copyButtons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var value = btn.getAttribute('data-copy') === 'password' ? c.password : c.uid;
          copyText(value, btn);
        });
      })(copyButtons[i]);
    }

    var viewBtn = document.getElementById('viewImage');
    if (viewBtn) viewBtn.addEventListener('click', function () { openViewer(c.proof); });

    var statusBtn = document.getElementById('openStatus');
    if (statusBtn) statusBtn.addEventListener('click', openStatusModal);
  }


  /* ---- copy to clipboard (offline friendly) ---- */

  function copyText(text, btn) {
    var value = String(text == null ? '' : text);

    function done() {
      btn.classList.add('is-copied');
      btn.innerHTML = ICONS.check;
      window.setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.innerHTML = ICONS.copy;
      }, 1400);
    }

    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      try { ta.select(); } catch (e) { /* ignore */ }
      try { if (document.execCommand) document.execCommand('copy'); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
      done();
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(value).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---- image viewer: image at 70% of the screen, close below ---- */

  var viewer = document.getElementById('viewer');
  var viewerImg = viewer ? viewer.querySelector('.viewer-img') : null;
  var viewerClose = viewer ? viewer.querySelector('.viewer-close') : null;

  function openViewer(src) {
    if (!viewer || !src) return;
    viewerImg.src = src;
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    if (viewerClose) viewerClose.focus();
  }

  function closeViewer() {
    if (!viewer || viewer.hidden) return;
    viewer.hidden = true;
    viewerImg.removeAttribute('src');
    document.body.style.overflow = '';
  }

  if (viewer) {
    viewer.addEventListener('click', function (e) {
      var closer = e.target.closest ? e.target.closest('[data-close]') : null;
      if (closer) closeViewer();
    });
  }

  /* ---- status update popup ---- */

  var statusModal = document.getElementById('statusModal');
  var statusSave = document.getElementById('statusSave');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  var selectedStatus = 'Pending';

  function paintStatusOptions() {
    if (!statusModal) return;
    var opts = statusModal.querySelectorAll('.status-opt');
    for (var i = 0; i < opts.length; i++) {
      var active = opts[i].getAttribute('data-status') === selectedStatus;
      opts[i].classList.toggle('is-active', active);
      opts[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function openStatusModal() {
    if (!statusModal || !complaint) return;
    selectedStatus = GBET.statusLabel(complaint.status);
    paintStatusOptions();
    statusModal.hidden = false;
    document.body.style.overflow = 'hidden';
    var active = statusModal.querySelector('.status-opt.is-active');
    if (active) active.focus();
  }

  function closeStatusModal() {
    if (!statusModal || statusModal.hidden) return;
    statusModal.hidden = true;
    if (viewer && !viewer.hidden) return;
    document.body.style.overflow = '';
  }

  function showToast(message) {
    if (!toastEl) return;
    var text = toastEl.querySelector('span');
    if (text) text.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('show');
    }, 1800);
  }

  if (statusModal) {
    statusModal.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-close]')) closeStatusModal();
    });

    var opts = statusModal.querySelectorAll('.status-opt');
    for (var i = 0; i < opts.length; i++) {
      (function (opt) {
        opt.addEventListener('click', function () {
          selectedStatus = opt.getAttribute('data-status');
          paintStatusOptions();
        });
      })(opts[i]);
    }
  }

  if (statusSave) {
    statusSave.addEventListener('click', function () {
      if (!complaint) return;

      var cloud = window.GBET_FB && typeof GBET_FB.setStatus === 'function';
      var local = GBET.setStatus(complaint.id, selectedStatus);

      if (!local && !cloud) {
        showToast('Could not update status');
        return;
      }

      complaint.status = selectedStatus;
      closeStatusModal();
      render(complaint);
      showToast('Status updated');

      if (cloud) {
        GBET_FB.setStatus(complaint.id, selectedStatus).catch(function () {
          showToast('Saved locally (cloud offline)');
        });
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (statusModal && !statusModal.hidden) {
      e.preventDefault();
      closeStatusModal();
      return;
    }
    if (viewer && !viewer.hidden) {
      e.preventDefault();
      closeViewer();
    }
  }, true);

  var id = '';
  try { id = new URLSearchParams(window.location.search).get('id') || ''; } catch (e) { id = ''; }

  var complaint = id ? GBET.get(id) : null;
  var missTimer = null;

  if (complaint) {
    render(complaint);
  } else {
    mount.innerHTML = '<div class="empty-list">Loading complaint\u2026</div>';
    missTimer = window.setTimeout(function () {
      if (!complaint) notFound();
    }, 2000);
  }

  document.addEventListener('gbfb:complaints', function (e) {
    var remote = e.detail || [];
    for (var i = 0; i < remote.length; i++) {
      if (remote[i].id === id) {
        complaint = remote[i];
        if (missTimer) { window.clearTimeout(missTimer); missTimer = null; }
        render(complaint);
        return;
      }
    }
  });
})();
