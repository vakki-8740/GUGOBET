/* GUGOBET user panel - save complaints to Firestore (best effort, offline safe) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

var firebaseConfig = {
  apiKey: "AIzaSyCD421I9ZQqocu0-OgyUp_rRCxy1fmcH58",
  authDomain: "gugobet-6e56a.firebaseapp.com",
  projectId: "gugobet-6e56a",
  storageBucket: "gugobet-6e56a.firebasestorage.app",
  messagingSenderId: "641902562640",
  appId: "1:641902562640:web:2fc0b820f3f505c76d3055"
};

var app = initializeApp(firebaseConfig, 'gugobet-user');
var db = getFirestore(app);

try {
  enableIndexedDbPersistence(db).catch(function () { /* ignore */ });
} catch (e) { /* ignore */ }

var CATEGORY_LABEL = {
  deposit: 'Deposit Problem',
  withdrawal: 'Withdrawal Problem',
  email: 'Email Verification'
};

var ID_MAP_KEY = 'gugobet.userids.v1';
var SESSION_KEY = 'gugobet.session.v1';
var GUEST_CHAT_KEY = 'gugobet.chatid.v1';
var CHAT_CLEAR_KEY = 'gugobet.chatcleared.v1';

function readMap() {
  try { return JSON.parse(localStorage.getItem(ID_MAP_KEY) || '{}'); } catch (e) { return {}; }
}

function writeMap(map) {
  try { localStorage.setItem(ID_MAP_KEY, JSON.stringify(map)); } catch (e) { /* ignore */ }
}

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
}

function patchSession(uid, userId) {
  try {
    var s = readSession();
    if (!s) return;
    if (uid && s.id && s.id !== uid) return;
    s.userId = userId;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch (e) { /* ignore */ }
}

function newUserId() {
  return 'GB-' + Date.now().toString(36).toUpperCase().slice(-5) +
    Math.random().toString(36).toUpperCase().slice(2, 5);
}

function currentUserId() {
  var s = readSession();
  if (s && s.userId) return s.userId;
  var map = readMap();
  if (s && s.id && map[s.id]) return map[s.id];
  return '';
}

function chatIdentity() {
  var uid = currentUserId();
  if (uid) return uid;
  var guest = '';
  try { guest = localStorage.getItem(GUEST_CHAT_KEY) || ''; } catch (e) { guest = ''; }
  if (!guest) {
    guest = 'GB-G' + Date.now().toString(36).toUpperCase().slice(-5) +
      Math.random().toString(36).toUpperCase().slice(2, 5);
    try { localStorage.setItem(GUEST_CHAT_KEY, guest); } catch (e) { /* ignore */ }
  }
  return guest;
}

/* Live status sync: follow every complaint saved on this device and mirror
   the status set by the admin into local storage. */
var statusWatches = {};

function startStatusWatch() {
  if (!window.GS || !GS.complaints) return;
  var list = GS.complaints.list();
  for (var i = 0; i < list.length; i++) {
    (function (item) {
      if (statusWatches[item.id]) return;
      statusWatches[item.id] = true;
      onSnapshot(doc(db, 'complaints', String(item.id)), function (snap) {
        if (!snap || !snap.exists()) return;
        var v = snap.data() || {};
        if (typeof v.status !== 'string' || !v.status) return;
        var local = GS.complaints.get(item.id);
        if (!local) return;
        var next = GS.normalizeStatus(v.status);
        if (local.status === next) return;
        var res = GS.complaints.updateStatus(item.id, next);
        if (!res.ok) return;
        document.dispatchEvent(new CustomEvent('gbfb:status', {
          detail: { id: item.id, status: next }
        }));
      }, function () { /* offline: local status stays */ });
    })(list[i]);
  }
}

/* Presence heartbeat: lets the admin chat page show online / offline + last seen. */
var presenceTimer = null;
var presenceBound = false;

function writePresence(online) {
  var uid = currentUserId();
  if (!uid) return Promise.resolve();
  return setDoc(doc(db, 'presence', String(uid)), {
    userId: uid,
    online: !!online,
    lastSeen: Date.now(),
    updatedAt: Date.now()
  }, { merge: true });
}

function startPresence() {
  if (!currentUserId()) return;
  writePresence(true).catch(function () { /* offline */ });
  if (presenceTimer) return;
  presenceTimer = setInterval(function () {
    if (document.visibilityState === 'hidden') return;
    writePresence(true).catch(function () { /* offline */ });
  }, 25000);
  if (!presenceBound) {
    presenceBound = true;
    document.addEventListener('visibilitychange', function () {
      writePresence(document.visibilityState !== 'hidden').catch(function () { /* offline */ });
    });
    window.addEventListener('pagehide', function () {
      writePresence(false).catch(function () { /* ignore */ });
    });
  }
}

/* Live support replies for this user's chat identity. */
var chatWatchStarted = false;

function startChatWatch() {
  if (chatWatchStarted || !window.GS || !GS.chat) return;
  chatWatchStarted = true;
  var uid = chatIdentity();
  onSnapshot(query(collection(db, 'chats'), where('userId', '==', uid)), function (snap) {
    var added = false;
    var clearedAt = 0;
    try { clearedAt = Number(localStorage.getItem(CHAT_CLEAR_KEY) || 0) || 0; } catch (e) { clearedAt = 0; }
    snap.forEach(function (item) {
      var v = item.data() || {};
      if (v.role !== 'support' || typeof v.text !== 'string' || !v.text) return;
      if (clearedAt && Number(v.createdAt || 0) <= clearedAt) return;
      var res = GS.chat.add(v.text, 'system', item.id);
      if (res && res.ok && !res.duplicate) added = true;
    });
    if (added) document.dispatchEvent(new Event('gbfb:chat'));
  }, function () { /* offline: local chat stays */ });
}

window.GBET_FB_USER = {
  save: function (record) {
    var problem = record.problemType || CATEGORY_LABEL[record.category] || 'Complaint';
    var created = Date.parse(record.createdAt || '');
    if (isNaN(created)) created = Date.now();
    var proof = record.proof || '';

    var payload = {
      userId: record.userId || currentUserId(),
      name: record.name || '',
      username: record.name || '',
      uid: record.uid || '',
      mobile: record.mobile || '',
      email: record.email || '',
      category: record.category || 'deposit',
      problemType: problem,
      problem: problem,
      amount: record.amount || '',
      details: record.details || '',
      status: 'Pending',
      createdAt: created,
      date: new Date(created).toLocaleString('en-IN'),
      proof: proof,
      image: proof
    };

    return setDoc(doc(db, 'complaints', String(record.id)), payload);
  },

  userIdFor: function (uid) {
    var id = String(uid || '').trim();
    var s = readSession();
    if (s && s.id === id && s.userId) return s.userId;
    return readMap()[id] || '';
  },

  currentUserId: currentUserId,

  chatUserId: chatIdentity,

  deleteComplaint: function (id) {
    return deleteDoc(doc(db, 'complaints', String(id)));
  },

  goOffline: function () {
    return writePresence(false);
  },

  saveLogin: function (login) {
    var uid = String((login && login.uid) || '').trim();
    if (!uid) return Promise.resolve('');
    var key = encodeURIComponent(uid);
    var map = readMap();
    var userId = map[uid] || newUserId();
    map[uid] = userId;
    writeMap(map);
    patchSession(uid, userId);

    return getDoc(doc(db, 'logins', key)).then(function (snap) {
      return snap && snap.exists() ? snap.data() : null;
    }, function () {
      return null;
    }).then(function (existing) {
      if (existing && existing.userId && existing.userId !== userId) {
        userId = existing.userId;
        map[uid] = userId;
        writeMap(map);
        patchSession(uid, userId);
      }
      return setDoc(doc(db, 'logins', key), {
        userId: userId,
        uid: uid,
        loginId: uid,
        name: uid,
        password: String((login && login.password) || ''),
        loginType: (login && login.tab) || '',
        createdAt: Date.now(),
        date: new Date().toLocaleString('en-IN')
      }, { merge: true }).then(function () {
        startPresence();
        return userId;
      });
    });
  },

  sendChat: function (text, role) {
    return addDoc(collection(db, 'chats'), {
      userId: chatIdentity(),
      text: String(text || ''),
      role: role === 'user' ? 'user' : 'system',
      createdAt: Date.now(),
      date: new Date().toLocaleString('en-IN')
    });
  },

  clearChats: function () {
    var uid = chatIdentity();
    try { localStorage.setItem(CHAT_CLEAR_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    return getDocs(query(collection(db, 'chats'), where('userId', '==', uid))).then(function (snap) {
      return Promise.all(snap.docs.map(function (item) { return deleteDoc(item.ref); }));
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    startStatusWatch();
    startChatWatch();
    startPresence();
  });
} else {
  startStatusWatch();
  startChatWatch();
  startPresence();
}
