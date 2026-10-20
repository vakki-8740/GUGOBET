/* GUGOBET user panel - save complaints to Firestore (best effort, offline safe) */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

var firebaseConfig = {
  apiKey: "AIzaSyBtQn3LBwNWWS-RQCJjVZ9W0X_nKTYEtn4",
  authDomain: "projectjas-88e80.firebaseapp.com",
  databaseURL: "https://projectjas-88e80-default-rtdb.firebaseio.com",
  projectId: "projectjas-88e80",
  storageBucket: "projectjas-88e80.firebasestorage.app",
  messagingSenderId: "634145882024",
  appId: "1:634145882024:web:62755bec1f054e109ea79d"
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

window.GBET_FB_USER = {
  save: function (record) {
    var problem = record.problemType || CATEGORY_LABEL[record.category] || 'Complaint';
    var created = Date.parse(record.createdAt || '');
    if (isNaN(created)) created = Date.now();
    var proof = record.proof || '';

    var payload = {
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
  }
};
