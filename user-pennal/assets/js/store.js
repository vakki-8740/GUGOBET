/* GUGOBET Support - local storage layer + shared UI utilities */
(function () {
  'use strict';

  var KEYS = {
    complaints: 'gugobet.complaints.v1',
    chat: 'gugobet.chat.v1',
    seq: 'gugobet.seq.v1'
  };

  var CATEGORIES = {
    deposit: 'Deposit Problem',
    withdrawal: 'Withdrawal Problem',
    email: 'Email Verification'
  };

  var STATUSES = {
    pending: 'Pending',
    processing: 'Processing',
    success: 'Success'
  };

  function normalizeStatus(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'processing') return STATUSES.processing;
    if (v === 'success' || v === 'submitted' || v === 'solved') return STATUSES.success;
    return STATUSES.pending;
  }

  var PROOF_LIMIT = 10 * 1024 * 1024; // 10 MB upload limit (images are compressed before storage)

  /* ---------- availability ---------- */

  var storageOK = (function () {
    try {
      var k = '__gs_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function safeParse(raw, fallback) {
    if (raw === null || raw === undefined || raw === '') return fallback;
    try {
      var v = JSON.parse(raw);
      return v === null || v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function errMsg(e) {
    if (!e) return 'Storage error.';
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      return 'Device storage is full. Please delete some old complaints and try again.';
    }
    return 'Could not save data on this device. ' + (e.message || '');
  }

  /* ---------- generic store ---------- */

  var store = {
    available: storageOK,
    get: function (key, fallback) {
      if (!storageOK) return fallback;
      var v = safeParse(localStorage.getItem(key), null);
      return v === null ? fallback : v;
    },
    set: function (key, value) {
      if (!storageOK) {
        return { ok: false, error: 'Local storage is not available in this browser/session.' };
      }
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errMsg(e) };
      }
    }
  };

  /* ---------- helpers ---------- */

  function pad(n, len) {
    n = String(n);
    while (n.length < (len || 2)) n = '0' + n;
    return n;
  }

  function fmtDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return pad(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' +
      pad(h) + ':' + pad(d.getMinutes()) + ' ' + ap;
  }

  function fmtDateShort(d) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return pad(d.getDate()) + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function genId(category) {
    var prefix = { deposit: 'DEP', withdrawal: 'WDR', email: 'EML' }[category] || 'CMP';
    var d = new Date();
    var s = prefix + '-' + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + '-';
    var seq = store.get(KEYS.seq, 0) + 1;
    store.set(KEYS.seq, seq);
    s += pad(seq, 4);
    return s;
  }

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function truncate(str, n) {
    str = String(str || '').replace(/\s+/g, ' ').trim();
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
  }

  function makeSummary(data) {
    var bits = [];
    if (data.name) bits.push(truncate(data.name, 28));
    if (data.mobile) bits.push('Mobile: ' + truncate(data.mobile, 15));
    if (data.uid) bits.push('UID: ' + truncate(data.uid, 22));
    if (data.amount) bits.push('Amount: ' + data.amount);
    if (data.reference) bits.push('Ref: ' + truncate(data.reference, 22));
    if (data.userId) bits.push('User: ' + truncate(data.userId, 22));
    if (data.details) bits.push(truncate(data.details, 90));
    return bits.join(' · ');
  }

  /* ---------- complaints ---------- */

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.id || !raw.category) return null;
    if (!raw.createdAt || isNaN(new Date(raw.createdAt).getTime())) return null;
    return {
      id: String(raw.id),
      category: CATEGORIES[raw.category] ? raw.category : 'deposit',
      createdAt: raw.createdAt,
      name: raw.name ? String(raw.name) : '',
      mobile: raw.mobile ? String(raw.mobile) : '',
      uid: raw.uid ? String(raw.uid) : '',
      problemType: String(raw.problemType || '—'),
      amount: raw.amount ? String(raw.amount) : '',
      reference: raw.reference ? String(raw.reference) : '',
      userId: raw.userId ? String(raw.userId) : '',
      date: raw.date ? String(raw.date) : '',
      paymentMethod: raw.paymentMethod ? String(raw.paymentMethod) : '',
      email: raw.email ? String(raw.email) : '',
      details: String(raw.details || ''),
      proof: typeof raw.proof === 'string' && raw.proof.indexOf('data:image') === 0 ? raw.proof : '',
      status: normalizeStatus(raw.status),
      summary: String(raw.summary || makeSummary(raw))
    };
  }

  var complaints = {
    list: function () {
      var arr = store.get(KEYS.complaints, []);
      if (!Array.isArray(arr)) return [];
      var clean = [];
      for (var i = 0; i < arr.length; i++) {
        var c = normalize(arr[i]);
        if (c) clean.push(c);
      }
      clean.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      return clean;
    },

    get: function (id) {
      var list = complaints.list();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    add: function (data) {
      var now = new Date();
      var record = normalize({
        id: genId(data.category),
        category: data.category,
        createdAt: now.toISOString(),
        name: data.name,
        uid: data.uid,
        mobile: data.mobile,
        problemType: data.problemType,
        amount: data.amount,
        reference: data.reference,
        userId: data.userId,
        email: data.email,
        date: data.date,
        paymentMethod: data.paymentMethod,
        details: data.details,
        proof: data.proof || '',
        status: STATUSES.pending
      });
      if (!record) return { ok: false, error: 'Invalid complaint data.' };

      var arr = store.get(KEYS.complaints, []);
      if (!Array.isArray(arr)) arr = [];
      arr.push(record);

      var res = store.set(KEYS.complaints, arr);
      if (!res.ok) return res;
      return { ok: true, complaint: record };
    },

    remove: function (id) {
      var arr = store.get(KEYS.complaints, []);
      if (!Array.isArray(arr)) arr = [];
      var next = arr.filter(function (c) { return !(c && c.id === id); });
      if (next.length === arr.length) return { ok: false, error: 'Complaint not found.' };
      return store.set(KEYS.complaints, next);
    }
  };

  /* ---------- chat ---------- */

  var chat = {
    list: function () {
      var arr = store.get(KEYS.chat, []);
      if (!Array.isArray(arr)) return [];
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        var m = arr[i];
        if (!m || typeof m !== 'object') continue;
        if (!m.text || !m.createdAt) continue;
        out.push({
          text: String(m.text),
          role: m.role === 'user' ? 'user' : 'system',
          createdAt: m.createdAt
        });
      }
      return out;
    },

    add: function (text, role) {
      var list = chat.list();
      list.push({ text: String(text), role: role === 'user' ? 'user' : 'system', createdAt: new Date().toISOString() });
      return store.set(KEYS.chat, list);
    },

    clear: function () {
      return store.set(KEYS.chat, []);
    }
  };

  /* ---------- toast ---------- */

  var toastWrap = null;

  function ensureToastWrap() {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      toastWrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastWrap);
    }
    return toastWrap;
  }

  function toast(message, type) {
    var wrap = ensureToastWrap();
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = String(message);
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, 3000);
  }

  /* ---------- modal ---------- */

  var modalRoot = null;
  var modalOnClose = null;

  function ensureModalRoot() {
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.className = 'modal-root';
      modalRoot.setAttribute('role', 'dialog');
      modalRoot.setAttribute('aria-modal', 'true');
      document.body.appendChild(modalRoot);
      modalRoot.addEventListener('click', function (e) {
        if (e.target.classList && e.target.classList.contains('modal-backdrop')) closeModal();
      });
    }
    return modalRoot;
  }

  function openModal(html, onClose) {
    var root = ensureModalRoot();
    modalOnClose = onClose || null;
    root.classList.remove('modal-center');
    root.innerHTML = '<div class="modal-backdrop"></div><div class="modal-card">' + html + '</div>';
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    var focusable = root.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus();
    return root;
  }

  function closeModal() {
    if (!modalRoot || !modalRoot.classList.contains('open')) return;
    modalRoot.classList.remove('open');
    modalRoot.classList.remove('modal-center');
    modalRoot.innerHTML = '';
    document.body.style.overflow = '';
    if (modalOnClose) { var fn = modalOnClose; modalOnClose = null; fn(); }
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var html =
        '<h3>' + escapeHtml(opts.title || 'Are you sure?') + '</h3>' +
        '<p class="modal-sub">' + escapeHtml(opts.message || '') + '</p>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-ghost" data-act="cancel">' + escapeHtml(opts.cancelText || 'Cancel') + '</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' + escapeHtml(opts.confirmText || 'Confirm') + '</button>' +
        '</div>';
      var root = openModal(html, function () { resolve(false); });
      root.querySelector('[data-act="cancel"]').addEventListener('click', function () { closeModal(); });
      root.querySelector('[data-act="ok"]').addEventListener('click', function () {
        modalOnClose = null;
        closeModal();
        resolve(true);
      });
    });
  }

  /* ---------- storage warning bar ---------- */

  function storageWarning() {
    if (storageOK) return '';
    return '<div class="notice warn">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
      '<span><strong>Storage unavailable.</strong> This browser is blocking local storage, so complaints cannot be saved on this device.</span>' +
      '</div>';
  }

  /* ---------- offline notice ---------- */

  function initOfflineNotice() {
    window.addEventListener('offline', function () {
      toast('You are offline. Saved data stays on this device.', '');
    });
  }

  window.GS = {
    KEYS: KEYS,
    CATEGORIES: CATEGORIES,
    STATUSES: STATUSES,
    statusKey: function (status) {
      if (status === STATUSES.processing) return 'processing';
      if (status === STATUSES.success) return 'success';
      return 'pending';
    },
    PROOF_LIMIT: PROOF_LIMIT,
    store: store,
    complaints: complaints,
    chat: chat,
    util: {
      pad: pad,
      fmtDateTime: fmtDateTime,
      fmtDateShort: fmtDateShort,
      genId: genId,
      escapeHtml: escapeHtml,
      truncate: truncate,
      makeSummary: makeSummary
    },
    ui: {
      toast: toast,
      openModal: openModal,
      closeModal: closeModal,
      confirmDialog: confirmDialog,
      storageWarning: storageWarning,
      initOfflineNotice: initOfflineNotice
    }
  };
})();
