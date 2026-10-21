# GBET-PENNAL (Admin Panel) — Complete Rebuild Specification

This document describes the current GUGOBET support admin panel so another developer or AI can recreate it. Assets are kept separate; see the asset list at the end.

---

## 1. Project overview

- White, clean, 2D mobile-first admin panel for GUGOBET support.
- Name/brand: **GBET-PENNAL** with subtitle "Support admin".
- Plain HTML + CSS + vanilla JavaScript. No build step.
- Live data from Firebase Firestore:
  - `complaints` — support complaints.
  - `logins` — user login data + auto user ID.
  - `chats` — user support chat messages.
- Realtime via Firestore `onSnapshot`; pages re-render when data changes.
- Cache-busting query string on CSS/JS. Current snapshot version: `?v=20261020o`.

---

## 2. Directory structure

```
admin-pennal/
  index.html                  Dashboard
  complaint.html              Complaint / login details (?id=...&view=login optional)
  chat.html                   Chat manage
  settings.html               Settings
  assets/
    css/admin.css             All styles (white 2D theme)
    js/
      data.js                 Formatting helpers, icons fallback, avatar HTML
      firebase-config.js      Exported Firebase config
      firebase.js             Firestore live sync (ES module)
      menu.js                 Drawer navigation + toast helper
      admin.js                Dashboard rendering + Complain/Login switch
      complaint.js            Details page, status update, delete, viewer
      chat.js                 Live chat list + clear
      settings.js             Live counts + connection label
  logo/logo.cb987a2.png
  favicon/b74ab3b922824a6ccc26837cb6f4498b.jpg
  user-icon/2288510.png
```

---

## 3. How to run

Serve the repository root (so both panels are under the same origin):

```
python3 -m http.server 8081 --directory .
```

Open `http://127.0.0.1:8081/admin-pennal/`.

Firebase modules load from the gstatic CDN; internet is required for live data.

---

## 4. Firebase / Firestore

### 4.1 SDK and config

- Firebase JS SDK **10.12.2** (ES modules).
- Admin config lives in `assets/js/firebase-config.js` and is imported by `firebase.js` with a cache-busting query.

```js
export const firebaseConfig = {
  apiKey: "AIzaSyCD421I9ZQqocu0-OgyUp_rRCxy1fmcH58",
  authDomain: "gugobet-6e56a.firebaseapp.com",
  projectId: "gugobet-6e56a",
  storageBucket: "gugobet-6e56a.firebasestorage.app",
  messagingSenderId: "641902562640",
  appId: "1:641902562640:web:2fc0b820f3f505c76d3055"
};
```

- Default app instance.
- IndexedDB persistence enabled; failures ignored.

### 4.2 Live subscriptions

`firebase.js` subscribes to four collections and dispatches DOM CustomEvents:

| Collection | Event | Payload |
|---|---|---|
| `complaints` | `gbfb:complaints` | Array of normalized complaints, newest first |
| `logins` | `gbfb:logins` | Array of normalized logins, newest first |
| `chats` | `gbfb:chats` | Array of normalized chats, oldest first |
| `presence` | `gbfb:presence` | Array of `{ id, userId, online, lastSeen }` |

On any listener error: `document.dispatchEvent(new CustomEvent('gbfb:error', { detail: message }))`.

### 4.3 Normalized complaint

```
{
  id: string,               // Firestore doc ID (same as user-side complaint ID)
  userId: string,           // auto unique user ID (blank for legacy records)
  name: string,             // v.name || v.username || "User"
  uid: string,              // UID typed by user (may be blank)
  mobile: string,
  email: string,
  password: string,         // legacy field if present
  category: "deposit" | "withdrawal" | "email",
  problemType: string,      // v.problemType || v.problem
  amount: string,
  details: string,
  status: string,           // raw; UI maps it to Pending/Processing/Success
  createdAt: ISO string,    // from ms, numeric string, Timestamp, or date string
  proof: string             // v.proof || v.image (data URL)
}
```

`categoryOf()` maps from legacy problem text when needed ("withdraw" → withdrawal, "email" → email, otherwise deposit).
Complaints are sorted by `createdAt` descending.

### 4.4 Normalized login

```
{
  id: string,               // Firestore doc ID (encoded login identifier)
  userId: string,           // auto unique user ID
  name: string,             // v.name || uid || "User"
  uid: string,              // entered phone/User ID (v.uid || v.loginId)
  password: string,
  loginType: string,        // "phone" | "userId"
  createdAt: ISO string
}
```

Sorted newest first.

### 4.5 Normalized chat

```
{
  id: string,
  userId: string,             // auto user ID / guest chat ID (blank for legacy)
  text: string,
  role: "user" | "support" | "system",
  createdAt: ISO string
}
```

Empty-text messages are filtered out; sorted oldest first.

### 4.6 Presence documents

`presence/{userId}` is written by the user panel:

```
{
  userId: string,
  online: boolean,
  lastSeen: number,   // epoch milliseconds
  updatedAt: number
}
```

The user panel heartbeats every 25 seconds while visible, writes `online: false` on tab hide/pagehide/logout, and the admin treats a user as offline if `online` is false or `lastSeen` is older than 90 seconds.

### 4.7 Admin write APIs (`window.GBET_FB`)

- `list()` — current complaints array
- `get(id)` — complaint by doc ID
- `save(record)` — merge a local-shaped complaint into Firestore (not used by current UI)
- `setStatus(id, status)` — update complaint status
- `remove(id)` — delete complaint
- `logins()` — current logins array
- `getLogin(id)` — login by doc ID
- `removeLogin(id)` — delete login record
- `chats()` — current chats array
- `presence()` — current presence array
- `reply(userId, text)` — add a support reply for that user
- `clearChats()` — delete all chat docs currently loaded

### 4.8 Security

- No Firebase Auth / App Check.
- Passwords are plain text and readable by anyone with the current rules.
- Rules file at repository root covers all three collections. Publish it in Firebase Console.

---

## 5. Design system

### 5.1 Colors (CSS variables)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F5F6F8` | Page background |
| `--card` | `#FFFFFF` | Cards/panels |
| `--text` | `#111827` | Main text |
| `--muted` | `#6B7280` | Secondary text |
| `--line` | `#E5E8ED` | Borders |
| `--line-soft` | `#F1F3F6` | Dividers |
| `--blue` | `#1D6FF2` | Accent/active/links |
| `--blue-soft` | `#EEF4FE` | Icon backgrounds/active fill |
| `--pending-bg` | `#F6EEE7` | Pending badge background |
| `--pending-fg` | `#8B5E34` | Pending text |
| `--pending-line` | `#EAD9C8` | Pending border |
| `--proc-bg` | `#FEF9E3` | Processing background |
| `--proc-fg` | `#99700A` | Processing text |
| `--proc-line` | `#F0E2A8` | Processing border |
| `--success-bg` | `#E8F7EE` | Success background |
| `--success-fg` | `#177A45` | Success text |
| `--success-line` | `#C9EAD7` | Success border |
| `--radius` | `14px` | Panels/cards |

- Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`.
- White surfaces, 1px light borders, no heavy shadows/gradients.
- All icons are inline SVG line icons (no emoji).
- Layout: `.wrap` max-width 720px, 16px padding, centered.

### 5.2 Top bar

- Sticky white top bar, 1px bottom border.
- Left: 44px logo box (`logo/logo.cb987a2.png`) + "GBET-PENNAL" / "Support admin".
- Right: connection chip `.flight` and hamburger `#menuBtn`.
- Dashboard chip is dynamic: "Connecting…" → "Live" → "Offline" on error.
- Chat/settings pages start at "Offline" and switch to "Live" when their Firestore module reports data.

### 5.3 Panels and rows

- `.panel`: white, 1px border, 14px radius, padding.
- `.panel-head h2`: 13–14px bold section title.
- `.rows` + `.row`: label left in muted text, bold value right; divided by soft lines.
- `.val-group` aligns value, copy button and eye button.

### 5.4 Dashboard specifics

- `.stats`: 2-column grid, 12px gap.
- `.stat`: white card, icon tile (`--blue-soft`), muted label, large 26px bold number.
- `.seg`: 2-column segmented switch on a light gray track (`#EEF1F5`), 4px padding, 12px radius; active button white with blue text and border.
- `.c-card`: complaint card with avatar, name, type (+ optional user ID), chevron, meta row (clock + time, calendar + date, status badge).
- `.login-card`: same card shell; title is the entered login ID, subtitle "User Login", body has two columns:
  - User ID (auto ID, fallback entered UID)
  - Password (always masked `••••••••`)
- `.badge`: pill with leading dot; colors per status.
- Empty list: `.empty-list` muted centered box.

---

## 6. Navigation drawer

File: `assets/js/menu.js`.

- Hamburger `#menuBtn` opens a drawer from the right side.
- Backdrop click, X button, or Escape closes it; body scroll locked while open.
- Drawer header: logo, brand text, close button.
- Items with icons and active highlight:
  1. **Home page** → `index.html` (`data-page="home"`)
  2. **Chat manage** → `chat.html` (`data-page="chat"`)
  3. **Setting** → `settings.html` (`data-page="settings"`)
- Active item is highlighted with blue text and a marker; `aria-current` is not used (class-based).
- Drawer footer currently shows a legacy "Offline · data saved on this device" line.
- `window.GBETUI.toast(message)` creates/updates a bottom toast with a check icon for 1.8s.

---

## 7. Pages

### 7.1 Dashboard — `index.html`

Data: live `complaints` + `logins`.

Header/status:

- Connection chip updates on data/error.
- Error state: if no data has rendered yet, list shows "Could not connect to Firestore. Check network and rules."

Stats (always complaints, not logins):

- **Today Complaints** — complaints with `createdAt` on the current local date.
- **Total Complaints** — all complaints.
- Both cards use inline SVG icons injected by `admin.js`.

Segmented switch `#dataSwitch`:

- **Complain** (default, `data-view="complain"`, active on load).
- **Login** (`data-view="login"`).
- Toggles `aria-selected` and `.is-active`, then re-renders the list without a page reload.

Complain list:

- Heading "All Complaints"; right meta "N complaints".
- Newest first.
- Card link: `complaint.html?id=<id>`.
- Card content:
  - Avatar (blue user icon asset with a fallback SVG).
  - Name.
  - Complaint type, with ` · <userId>` appended when the auto user ID exists.
  - Chevron.
  - Time (hh:mm AM/PM), date (`DD Mon YYYY`), status badge.
- Hover/press state light gray.
- Empty: "No complaints yet."
- Boot state before the module provides data: "Connecting to live database…".

Login list:

- Heading "All Logins"; meta "N logins".
- Card link: `complaint.html?id=<login doc id>&view=login`.
- Cards always show the auto User ID (falls back to entered login ID for legacy records) and masked password. Never shows the password in clear on the card.
- Empty: "No login details yet."
- Data comes only from the `logins` collection; a user can appear here without ever filing a complaint.

Initial paint uses the already-loaded arrays from `GBET_FB` when available; later updates arrive via `gbfb:complaints` / `gbfb:logins`.

### 7.2 Complaint details — `complaint.html?id=...`

Header: back arrow to dashboard, title "Complaint Details". No hamburger menu.

Load order:

1. Read the record from `GBET_FB.get(id)` (or `getLogin(id)` when `view=login`).
2. If found, render immediately.
3. If not found yet, show "Loading complaint…" and wait:
   - 2 seconds if `GBET_FB` already exists (snapshot loaded, record truly missing).
   - 8 seconds if the module has not loaded yet.
4. Live updates re-render when a `gbfb:complaints` / `gbfb:logins` snapshot contains the ID.
5. Error or timeout → not-found state: tray icon, "Complaint not found.", "Back to dashboard" outline button.

Standard complaint view panels, in this order:

1. **User Login Details**
   - If auto `userId` exists:
     - User ID (auto ID) + copy button.
     - Login ID (entered UID) + copy button, only when entered UID exists.
     - Password row when present: masked `••••••••`, eye toggle, copy button.
   - Legacy (no `userId`): User ID (entered UID) + copy, then password row.
   - Copy buttons show a green check for 1.4s after copying.
   - Password eye swaps to a crossed-eye icon, sets `aria-pressed`, and toggles between masked and clear text.
2. **Complaint**
   - Status badge in the panel header.
   - Rows: Complaint type (full category label), Problem (problem type), Amount (₹ prefix when numeric), Submitted (`DD Mon YYYY · hh:mm AM`).
   - No message/details block.
   - No name/mobile/email in this panel (they are not shown here by design).
3. **Attachment**
   - If proof exists: outline button "View image".
   - Otherwise: "No image attached."
4. **Status**
   - Outline button "Update Status".
   - Red outline button "Delete complaint".

Image viewer:

- Full-screen dark overlay, image width **70vw**, max-width 640px, max-height 70vh.
- Close button below the image, also **70vw** wide.
- Backdrop click, Close, or Escape closes; body scroll locked while open.

Status update popup:

- `.modal` with backdrop and card.
- Three `.status-opt` rows: Pending, Processing, Success, each with a check dot.
- Current status preselected (`is-active`, `aria-pressed`).
- "Update" button (`#statusSave`).
- On save:
  - Rejects if `GBET_FB` is unavailable (toast "Cloud not connected").
  - Updates the local object, closes the modal, re-renders the badge immediately.
  - Calls `GBET_FB.setStatus(id, status)`.
  - Toast "Status updated" on success; "Could not update. Check connection." on failure.
- User-created complaints start as Pending; legacy values are mapped: `Saved Locally` → Pending, `Submitted` → Success.

Delete complaint:

- Red outline "Delete complaint".
- Confirm modal title "Delete complaint?", text "This complaint will be permanently deleted. This cannot be undone.", Cancel + Delete.
- While deleting the button shows "Deleting…" and is disabled.
- On success: toast "Complaint deleted", then redirect to dashboard after 800ms.
- On failure: toast "Could not delete. Check connection.", button restored.
- Deletes only the Firestore document.

Login-only view (`?view=login`):

- Page title changes to "Login Details".
- Shows a single panel "User Login Details" with the same login rows (auto User ID, Login ID, password with reveal/copy).
- Includes the red "Delete login data" button.
- No complaint, attachment, status, or complaint-delete UI.
- Delete modal title/text change to "Delete login data?" / "This login data will be permanently deleted. This cannot be undone."
- Calls `GBET_FB.removeLogin(id)`; toast "Login data deleted"; redirect to dashboard after 800ms.
- If the record disappears from Firestore, the page shows the not-found state.

### 7.3 Chat manage — `chat.html`

Data: live `logins`, `complaints`, `chats` and `presence`.

Initial view — all users:

- Header "Chat Manage" + "N users".
- One row per unique `userId`, built from logins/complaints/chats/presence (merged; users without a userId are skipped).
- Each row shows:
  - Blue user avatar icon.
  - Name only (latest complaint name → login name → entered UID → ID).
  - Status: "Online" or "Offline · <duration> ago" (duration from `presence.lastSeen`, falling back to login/complaint/chat time).
  - Chevron.
- Rows are sorted online-first, then most recent activity, then name.
- Online = `presence.online === true` and `lastSeen` within 90 seconds. The list recomputes every 30 seconds.
- Empty: "No users yet."
- Boot: "Connecting to live database…" if the module is not ready.
- Error before any data: "Could not connect to Firestore. Check network and rules."

Tap a user — conversation view:

- User list hides; thread view opens with back button, avatar, name and live Online/Offline status.
- Thread meta shows "N messages".
- Messages for that `userId` render oldest first:
  - User messages left, gray bubble.
  - Support replies right, blue bubble.
  - Time + date under each bubble.
- Empty thread: "No messages yet. Start the conversation below."
- Composer: text input (max 1000) + blue send button.
- Sending calls `GBET_FB.reply(selectedUserId, text)` (writes `role: "support"` + `userId`), clears the input, shows "Reply sent", and appends live via the snapshot.
- Failure toast: "Could not send reply".
- Back button or Esc returns to the user list.

Clear all:

- "Clear all chats" is visible only on the user list.
- Confirm modal "Clear all chats?" (updates live), Cancel/Clear.
- `GBET_FB.clearChats()` deletes every conversation, closes the modal, refreshes and shows "All chats cleared".
- Failure: toast "Could not clear chats".

### 7.4 Settings — `settings.html`

Cards:

1. **App**
   - Data source: "Firestore (live)".
   - Connection: `#setConn` — "Connecting…" until data/module, then "Live"; "Offline" on `gbfb:error`.
   - App version: "1.0".
2. **Storage**
   - Complaints: live count from `GBET_FB.list()`.
   - Chat messages: live count from `GBET_FB.chats()`.
   - Both update on `gbfb:complaints` / `gbfb:chats`.
3. **About**
   - Text: "GBET-PENNAL is the live support admin panel for GUGOBET. Complaints and chats are stored in Firebase Firestore."

No reset/demo buttons exist. An old admin demo localStorage key (`gbet.admin.complaints.v1`) is removed on dashboard load for cleanup.

---

## 8. Data flow summary

1. User logs in → user panel writes `logins/{encoded id}` with auto `userId`.
2. User submits a complaint → user panel writes `complaints/{local id}` with the same `userId`.
3. Admin dashboard listens to `complaints` and `logins`; switch shows either list.
4. Admin opens a complaint → live data by document ID.
5. Admin updates status or deletes the complaint → Firestore changed; dashboard re-renders via snapshot.
6. Admin opens a login card → login-only view; can delete login data.
7. User chat messages → `chats`; admin chat page lists them newest first and can clear all.

---

## 9. Responsive and accessibility notes

- Mobile-first; max content width 720px.
- At ≤360px, wrap padding drops to 12px.
- Cards and buttons use large touch targets (36–44px heights).
- SVGs are decorative with `aria-hidden`; interactive icon buttons have labels.
- Modals use `role="dialog"`, `aria-modal="true"`, and labelled titles.
- Escape closes drawer, status modal, delete/clear modals, and image viewer.
- Body scroll is locked while modals/drawer/viewer are open.
- Toast is `role="status"` + `aria-live="polite"`.

---

## 10. Assets (keep separate)

| Path | Purpose |
|---|---|
| `logo/logo.cb987a2.png` | Top bar and drawer logo |
| `favicon/b74ab3b922824a6ccc26837cb6f4498b.jpg` | Browser favicon (JPEG 736×736) |
| `user-icon/2288510.png` | Blue gradient user avatar for cards; has an inline SVG fallback |

No other image assets are required. Every other icon is inline SVG generated in JS or embedded in HTML.

---

## 11. Known limitations / current behavior

- No authentication or role protection; anyone with the URL can read/write with the current rules.
- Passwords are stored in plain text and visible to the admin (masked in UI but readable from Firestore).
- Some legacy copy remains (drawer footer, clear-chat modal text).
- Online presence is heartbeat-based; multiple tabs of the same user can briefly report offline when one tab is hidden.
- The dashboard login list intentionally shows only `logins`, not login fields pulled from complaints.
- Firestore writes happen with open/public rules; tighten them for production.

---

## 12. Rebuild checklist

1. Create the folder structure and copy the three admin images to the exact relative paths.
2. Implement `admin.css` tokens, top bar, stats, segmented switch, cards, panels, rows, badges, drawer, modals, toast, viewer, chat, settings.
3. Implement `data.js` formatting helpers, status mapping, category labels, avatar HTML, `esc`.
4. Implement `menu.js` drawer + `GBETUI.toast`.
5. Implement `firebase-config.js` and `firebase.js` with the three `onSnapshot` listeners, normalization, write APIs, and custom events.
6. Build `admin.js` (dashboard, switch, live render), `complaint.js` (details, login-only view, status, delete, viewer), `chat.js` (user list, per-user thread, reply composer, presence, clear), `settings.js` (counts/connection).
7. Add the pages and load scripts in this order:
   - Dashboard: `data.js`, `menu.js`, `admin.js`, module `firebase.js`.
   - Details: `data.js`, `complaint.js`, module `firebase.js`.
   - Chat: `data.js`, `menu.js`, `chat.js`, then a conditional dynamic import of `firebase.js` when `GBET_FB` is absent (user list + thread + presence).
   - Settings: `data.js`, `menu.js`, `settings.js`, then the same conditional dynamic import.
8. Publish `firestore.rules` from the repository root.
9. Verify live updates, status/delete flows, login-only view, Esc handling, and 360–430px layouts.

> `chat.html` and `settings.html` use an inline module: `if (!window.GBET_FB) import('./assets/js/firebase.js?v=20261020o');`. This keeps test stubs working while loading live Firestore in production.
