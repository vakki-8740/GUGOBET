/* GBET-PENNAL - offline demo data (no network, no backend) */
(function () {
  'use strict';

  var KEY = 'gbet.admin.complaints.v1';
  var USER_KEY = 'gugobet.complaints.v1';

  var CATEGORIES = {
    deposit: 'Deposit Problem',
    withdrawal: 'Withdrawal Problem',
    email: 'Email Verification'
  };

  function at(dayOffset, hours, minutes) {
    var d = new Date();
    d.setDate(d.getDate() - dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

  function proof(amount) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760">' +
      '<rect width="600" height="760" fill="#ffffff"/>' +
      '<rect width="600" height="104" fill="#0f172a"/>' +
      '<text x="40" y="64" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="bold" fill="#ffffff">GBET PAY</text>' +
      '<text x="40" y="160" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#6b7280">PAYMENT RECEIPT</text>' +
      '<text x="40" y="252" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#6b7280">Amount paid</text>' +
      '<text x="40" y="316" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="bold" fill="#111827">' + amount + '</text>' +
      '<rect x="40" y="366" width="520" height="1" fill="#e5e7eb"/>' +
      '<text x="40" y="414" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#6b7280">Status</text>' +
      '<text x="560" y="414" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#177a45">SUCCESS</text>' +
      '<text x="40" y="462" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#6b7280">Method</text>' +
      '<text x="560" y="462" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#111827">UPI</text>' +
      '<text x="40" y="510" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#6b7280">Reference</text>' +
      '<text x="560" y="510" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#111827">UTR8392017755</text>' +
      '<rect x="40" y="580" width="520" height="112" rx="12" fill="#e8f7ee"/>' +
      '<text x="300" y="628" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#177a45">Payment completed</text>' +
      '<text x="300" y="660" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#177a45">This is a demo attachment</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var DEMO = [
    {
      id: 'CMP-261020-1001',
      name: 'Rahul Sharma',
      uid: 'GB772341',
      mobile: '9876543210',
      email: 'rahul.sharma@mail.com',
      password: 'Rahul@1234',
      category: 'deposit',
      problemType: 'Deposit not credited',
      amount: '2,500',
      details: 'Maine 2,500 ka deposit UPI se kiya tha, paisa cut ho gaya lekin wallet balance nahi aaya. Please check karke credit karein.',
      status: 'Pending',
      createdAt: at(0, 10, 24),
      proof: proof('2,500')
    },
    {
      id: 'CMP-261020-1002',
      name: 'Priya Verma',
      uid: 'GB551902',
      mobile: '9123456780',
      email: 'priya.verma@mail.com',
      password: 'Priya#2026',
      category: 'withdrawal',
      problemType: 'Withdrawal stuck',
      amount: '7,000',
      details: 'Withdrawal request 7,000 ki thi, 6 ghante ho gaye lekin paisa bank account me nahi aaya.',
      status: 'Processing',
      createdAt: at(0, 9, 12),
      proof: ''
    },
    {
      id: 'CMP-261020-1003',
      name: 'Aman Khan',
      uid: 'GB903114',
      mobile: '9988776655',
      email: 'aman.khan@mail.com',
      password: 'Aman@786',
      category: 'email',
      problemType: 'Email verification failed',
      amount: '',
      details: 'Email verification link open nahi ho raha, dobara send karne ki request hai.',
      status: 'Success',
      createdAt: at(0, 8, 5),
      proof: proof('0')
    },
    {
      id: 'CMP-261019-1004',
      name: 'Neha Singh',
      uid: 'GB664410',
      mobile: '9012345678',
      email: 'neha.singh@mail.com',
      password: 'Neha@123',
      category: 'deposit',
      problemType: 'UPI payment failed',
      amount: '1,200',
      details: 'UPI se payment karte waqt transaction failed dikha, lekin account se paisa cut ho gaya.',
      status: 'Processing',
      createdAt: at(1, 21, 40),
      proof: ''
    },
    {
      id: 'CMP-261017-1005',
      name: 'Vikas Yadav',
      uid: 'GB128760',
      mobile: '9345678120',
      email: 'vikas.yadav@mail.com',
      password: 'Vikas@2026',
      category: 'withdrawal',
      problemType: 'Bank account not updated',
      amount: '15,000',
      details: 'Naya bank account add nahi ho raha, withdrawal 15,000 pending hai. Kripya help karein.',
      status: 'Pending',
      createdAt: at(3, 14, 32),
      proof: ''
    }
  ];

  function read(key, fallback) {
    try {
      var raw = JSON.parse(localStorage.getItem(key) || 'null');
      return raw == null ? fallback : raw;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function seed() {
    var stored = read(KEY, null);
    if (!Array.isArray(stored) || !stored.length) {
      write(KEY, DEMO);
      return DEMO.slice();
    }
    return stored;
  }

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

  function fromUserPanel(c) {
    if (!c || !c.id) return null;
    return {
      id: String(c.id),
      name: c.name || 'User',
      uid: c.uid || '',
      mobile: c.mobile || '',
      email: c.email || '',
      password: '',
      category: c.category || 'deposit',
      problemType: c.problemType && c.problemType !== '\u2014' ? c.problemType : (CATEGORIES[c.category] || 'Complaint'),
      amount: c.amount ? String(c.amount) : '',
      details: c.details || c.reference || '',
      status: c.status || 'Pending',
      createdAt: c.createdAt || new Date().toISOString(),
      proof: c.proof || ''
    };
  }

  function list() {
    var all = seed().slice();

    var shared = read(USER_KEY, []);
    if (Array.isArray(shared)) {
      var seen = {};
      for (var i = 0; i < all.length; i++) seen[all[i].id] = true;
      for (var j = 0; j < shared.length; j++) {
        var mapped = fromUserPanel(shared[j]);
        if (mapped && !seen[mapped.id]) {
          all.push(mapped);
          seen[mapped.id] = true;
        }
      }
    }

    all.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return all;
  }

  function get(id) {
    var all = list();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }


  function setStatus(id, status) {
    var label = statusLabel(status);
    var changed = false;

    var arr = read(KEY, []);
    if (!Array.isArray(arr)) arr = [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) { arr[i].status = label; changed = true; }
    }
    if (changed) write(KEY, arr);

    var shared = read(USER_KEY, []);
    if (Array.isArray(shared)) {
      var sharedChanged = false;
      for (var j = 0; j < shared.length; j++) {
        if (shared[j].id === id) { shared[j].status = label; sharedChanged = true; }
      }
      if (sharedChanged) { write(USER_KEY, shared); changed = true; }
    }

    return changed;
  }

  function isToday(iso) {
    var d = new Date(iso);
    var now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

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
    list: list,
    get: get,
    isToday: isToday,
    todayCount: function () {
      var all = list();
      var n = 0;
      for (var i = 0; i < all.length; i++) if (isToday(all[i].createdAt)) n++;
      return n;
    },
    fmtDate: fmtDate,
    fmtTime: fmtTime,
    statusKey: statusKey,
    statusLabel: statusLabel,
    setStatus: setStatus,
    categories: CATEGORIES,
    avatarHtml: avatarHtml,
    esc: esc,
    resetDemo: function () { write(KEY, DEMO); }
  };
})();
