# GUGOBET User Panel — Complete Rebuild Specification

This document describes the current GUGOBET user support panel so another developer or AI can recreate it from scratch. Assets are intentionally separate: keep all images in the same relative folders described at the end.

---

## 1. Project overview

- Mobile-first support portal for GUGOBET users.
- Dark, iOS-inspired UI.
- Plain HTML + CSS + vanilla JavaScript. No build step, no framework.
- Live data: complaints and chats are written to Firebase Firestore (best effort, offline-safe). Login records are written to Firestore as well.
- Complaint status is synced live from Firestore, so admin updates appear in the user Inbox and details page without a reload.
- Every page is standalone HTML and loads shared CSS/JS with a cache-busting query string (`?v=YYYYMMDDx`).

Current cache version used in this snapshot: `?v=20261020s`.

---

## 2. Directory structure

```
user-pennal/
  index.html                  Home
  deposit.html                Deposit complaint form
  withdrawal.html             Withdrawal complaint form
  email.html                  E-mail verification complaint form
  inbox.html                  Saved complaints list
  complaint.html              Complaint details (?id=DEP-...)
  chat.html                   Online chat
  assets/
    css/
      style.css               Main dark UI
      login-gate.css          Glass login popup
    js/
      store.js                Local storage, complaint model, chat, UI helpers
      app.js                  Header, sidebar, navigation, back stack
      login-gate.js           Login popup, session, login sync
      complaint-form.js       Shared form logic (validation, upload, submit)
      inbox.js                Search/filter/cards
      complaint-view.js       Details page, status modal, delete, viewer
      chat.js                 Chat UI (local + cloud write)
      faq.js                  FAQ accordion
      firebase-sync.js        Firestore writes (ES module)
  banner/file_0000000057f08211ab6db1b5fcc8ac86.png
  logo/logo.cb987a2.png
  option-icons/109500-removebg-preview.png
  option-icons/109501-removebg-preview.png
  option-icons/109502-removebg-preview.png
  option-icons/109503-removebg-preview.png
  login-pop-up/index.html     Legacy stand-alone login mock (not linked by the app)
```

Unused/trashed duplicate images may exist but are not referenced.

---

## 3. How to run

Serve the folder over HTTP:

```
python3 -m http.server 8080 --directory user-pennal
```

Then open `http://127.0.0.1:8080/`.

Firebase modules are loaded from the gstatic CDN, so network access is required for cloud sync. Local storage keeps the app usable offline.

---

## 4. Firebase / Firestore

### 4.1 SDK and config

- Firebase JS SDK **10.12.2** via ES modules from `https://www.gstatic.com/firebasejs/10.12.2/...`.
- Config is embedded inside `assets/js/firebase-sync.js` (not a separate file):

```js
var firebaseConfig = {
  apiKey: "AIzaSyCD421I9ZQqocu0-OgyUp_rRCxy1fmcH58",
  authDomain: "gugobet-6e56a.firebaseapp.com",
  projectId: "gugobet-6e56a",
  storageBucket: "gugobet-6e56a.firebasestorage.app",
  messagingSenderId: "641902562640",
  appId: "1:641902562640:web:2fc0b820f3f505c76d3055"
};
```

- App instance name: `gugobet-user`.
- IndexedDB persistence is enabled with `enableIndexedDbPersistence(db)` and failures are ignored.
- `index.html` also loads this module (so login can sync from Home). Complaint pages load it too.

### 4.2 Collections written by the user panel

`complaints/{id}`

```
{
  userId: "GB-XXXXXX",      // auto-generated stable user ID
  name: string,
  username: string,         // duplicate of name for legacy readers
  uid: string,              // UID typed on the email form (may be empty)
  mobile: string,
  email: string,
  category: "deposit" | "withdrawal" | "email",
  problemType: string,      // e.g. "Deposit Problem"
  problem: string,          // duplicate of problemType
  amount: string,
  details: string,          // normally empty for current forms
  status: "Pending",        // user-created complaints always start Pending
  createdAt: number,        // epoch milliseconds
  date: string,             // toLocaleString('en-IN')
  proof: string,            // data:image/... data URL
  image: string             // duplicate of proof for legacy readers
}
```

Document ID equals the local complaint ID (`DEP-YYMMDD-0001`, `WDR-...`, `EML-...`), so admin sees the same ID.

`logins/{encodeURIComponent(loginId)}`

```
{
  userId: "GB-XXXXXX",      // stable auto ID, same ID reused in complaints
  uid: string,              // phone number or User ID entered at login
  loginId: string,          // duplicate of uid
  name: string,             // duplicate of uid
  password: string,         // plain text (see security warning)
  loginType: "phone" | "userId",
  createdAt: number,        // epoch milliseconds, updated on each login
  date: string              // toLocaleString('en-IN')
}
```

`chats/{autoId}`

```
{
  userId: "GB-XXXXXX",      // chat identity (auto user ID or stable guest ID)
  text: string,
  role: "user" | "support",
  createdAt: number,
  date: string
}
```

Admin support replies use `role: "support"` and the same `userId`, so they are delivered live to that user. Old messages may have no `userId`.

`presence/{userId}` — written by the user panel for the admin chat user list:

```
{
  userId: "GB-XXXXXX",
  online: boolean,
  lastSeen: number,   // epoch milliseconds
  updatedAt: number
}
```

- Heartbeat every 25 seconds while the page is visible.
- `online: false` is written when the tab is hidden, on `pagehide`, and on logout.
- The admin treats a user as offline when `online` is false or `lastSeen` is older than 90 seconds. Guests who never logged in do not write presence.

### 4.3 Unique user ID logic

- Stored locally in `localStorage["gugobet.userids.v1"]` as a map: `{ [loginId]: "GB-XXXXXX" }`.
- Format: `GB-` + 5 chars from base-36 timestamp + 3 random base-36 chars, uppercased.
- On login:
  1. Read the local map.
  2. If no ID exists, generate one and save it immediately.
  3. Read the existing Firestore login document. If it already has a `userId`, reuse that ID (keeps the same ID across devices/reinstalls).
  4. Save/merge the login document with that `userId`.
  5. Store the same `userId` in the session (`gugobet.session.v1`).
- Complaint writes read `GBET_FB_USER.currentUserId()` (session first, then local map) and attach it as `userId`.

### 4.4 Security

- No Firebase Authentication or App Check.
- Passwords are stored as plain text and all collections are publicly readable/writable until strict rules are applied.
- The panel only calls Firestore; no Cloud Functions.

### 4.5 Rules

The repository root contains `firestore.rules` covering `complaints`, `logins`, and `chats`. Publish it in Firebase Console. Current rules validate complaint status/proof size, login `userId`/`uid`/password size, and chat text/role, but reads and deletes are public.

---

## 5. Design system

### 5.1 Colors (CSS variables)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0D10` | Page background |
| `--primary` | `#1E9CD7` | Buttons, active links, focus |
| `--primary-press` | `#1785b8` | Pressed primary |
| `--secondary` | `#182942` | Secondary actions |
| `--text` | `#F4F7FB` | Main text |
| `--muted` | `#9AA7BA` | Labels, dates |
| `--border` | `#242B36` | Card/input borders |
| `--card` | `#12161C` | Cards |
| `--surface` | `#171C24` | Elevated surfaces |
| `--hover` | `#1D242E` | Pressed card |
| `--overlay` | `rgba(0,0,0,0.62)` | Modal backdrop |
| `--danger` | `#FF6369` | Errors/delete |
| `--success` | `#3FCF8E` | Success |
| `--radius-card` | `16px` | Cards |
| `--radius-btn` | `12px` | Buttons |
| `--radius-input` | `12px` | Inputs |
| `--header-h` | `56px` | Sticky header |

- Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Base font size 15px, line-height 1.45.
- Dark color scheme, safe-area insets supported.

### 5.2 Layout

- `.page` and `.chat-page`: `max-width: 720px`, centered, `padding: 18px 14px calc(24px + safe-area-bottom)`.
- Home option cards are full-width and stacked vertically (min-height 152px, 56px icon area, 32px icon art).
- Forms use `.form-card` (16px radius, 1px border, dark card, 14px padding, 12px gap).
- Sticky app header: left menu button, centered title/logo, right inbox button.
- All interactive targets have visible `:focus-visible` outlines.

### 5.3 Components

- `.btn`, `.btn-primary` (blue), `.btn-ghost` (subtle), `.btn-danger`, `.btn-sm`, `.btn-block`.
- `.input`, `.select`, `.textarea` with error state `.field.error`.
- `.upload-box` with file input, icon, label, thumbnail preview, "Image uploaded" badge.
- `.badge.status-pending` (chocolate), `.status-processing` (yellow), `.status-success` (green).
- `.inbox-card` with category tag, status badge, date, 100%-width CTA.
- `.detail-page` with hero, category tag, status, date, `.detail-list` rows.
- Modals via `GS.ui.openModal` (`.modal-root`, centered sent popup).
- Toasts via `GS.ui.toast` (bottom toast, success/error).
- `.notice` info block, `.empty-state`, `.spinner`, `.page-back` + `.back-link`.

### 5.4 Motion

- Page fade/slide in 0.24s.
- Home cards stagger 0.04s each.
- Card press scale 0.98.
- Respect `prefers-reduced-motion` (animations reduced).

---

## 6. Shared shell and navigation

Files: `assets/js/app.js`, `assets/js/faq.js`.

### 6.1 Header

Present on every page:

```html
<header class="app-header">
  <div class="header-left"><button class="icon-btn" id="menuBtn"></button></div>
  <div class="header-center"><img class="brand-logo" src="logo/logo.cb987a2.png"></div>
  <div class="header-right"><a class="icon-btn" id="inboxBtn" href="inbox.html"></a></div>
</header>
```

- Complaint pages replace the centered logo with `.header-title`.
- `complaint.html` has no menu button; it uses a `.page-back` row with `#backBtn` above the content.
- Icons are injected by `app.js` as inline SVGs.

### 6.2 Sidebar

- Built dynamically by `app.js`; slides from the left with an overlay.
- Items: Home, Deposit problem, Withdrawal problem, E-mail verification, Online chat.
- Active item highlighted with `aria-current="page"`.
- Footer contains a note and a **Log out** button (`#logoutBtn`).
- Logout removes `gugobet.session.v1`; on gated pages it redirects to Home.
- Current footer note still says complaints are saved on-device only (legacy copy), even though cloud sync is active.

### 6.3 Back navigation

- `app.js` keeps a short page stack in `sessionStorage["gugobet.nav.stack.v1"]`.
- `.back-link#backBtn` appears above the card on form/detail pages (not inside the header).
- Falls back to `index.html` when there is no history.

### 6.4 FAQ

- Home FAQ accordion; one item opens at a time.
- Chevron rotates; `aria-expanded` updated.

---

## 7. Pages

### 7.1 Home — `index.html`

- Banner image at top (aspect ratio 1774:887).
- Four full-width option cards, each with icon, label and primary CTA:
  1. Deposit problem — "Complain Now" → `deposit.html`
  2. Withdrawal problem — "Complain Now" → `withdrawal.html`
  3. E-mail verification — "Complain Now" → `email.html`
  4. Online chat — "Live Chat" → `chat.html`
- FAQ section with 5 items (how to fill each form, chat, after-submit flow).
- Clicking a gated option card (deposit/withdrawal/email) opens the login gate if the session is missing; after login it continues to the target page.

### 7.2 Login gate — injected popup

Files: `assets/js/login-gate.js`, `assets/css/login-gate.css`.

- Gated pages: `deposit`, `withdrawal`, `email` (`data-page` values). The gate auto-opens on those pages and intercepts gated card taps from Home.
- Glass card on blurred dark backdrop, centered, max-width 95%, width 420px.
- Contents:
  - Close X.
  - GUGOBET logo.
  - Title "Login".
  - Two tabs: **User ID** and **Phone** (Phone is default and active).
  - Phone input with India `+91` prefix, numeric only, formatted as `12345 67890`, maxlength 11.
  - User ID text input (maxlength 40).
  - Password input with eye toggle (show/hide).
  - Inline error line.
  - Full-width "Login" button.
- Validation:
  - Identifier required.
  - Phone must have at least 10 digits.
  - Password required.
  - No server-side credential check; any valid-shaped credentials are accepted.
- Submit behavior:
  - Button enters loading state for **4 seconds**.
  - `sendLogin(id, password)` calls `GBET_FB_USER.saveLogin(...)` (best effort).
  - Session saved to `sessionStorage["gugobet.session.v1"]`:
    ```json
    { "loggedIn": true, "id": "<entered id>", "userId": "GB-XXXXXX", "at": 1790000000000 }
    ```
  - Gate closes and a centered "Login successful" popup appears for 1.6s, then the target action runs.
- Closing the gate on a gated page redirects to Home.
- Session is tab-scoped and cleared by Logout.

### 7.3 Deposit form — `deposit.html`

- Page `data-page="deposit"`, header title "Deposit Problem".
- Form title: "Deposit Problem Complaint".
- Required fields (all marked `*`):
  - User name (max 60)
  - Mobile number (max 15)
  - Email id (valid email, max 120)
  - Deposit amount (positive number, max 12)
  - Payment image upload (required; label "Upload payment image ( max 10 mb )")
- `#backBtn` above the card.
- Submit button: "Submit Now".

### 7.4 Withdrawal form — `withdrawal.html`

- Header "Withdrawal Problem"; form title "Withdrawal Problem Complaint Page".
- Required fields:
  - User name (max 60)
  - Mobile number (max 15)
  - Enter email id (valid email, max 120)
  - Enter withdrawal amount (positive number, max 12)
  - Issue image upload (required; label "Upload issue image ( max 10 mb )")
- Submit: "Submit Now".

### 7.5 E-mail verification form — `email.html`

- Header "E-mail Verification"; form title "E-mail Verification Complaint Page".
- Required fields:
  - User name (max 60)
  - Enter UID (max 40)
  - Mobile number (max 15)
  - Enter email (for Verification) (valid email, max 120)
  - Issue image upload (required; label "Upload issue image ( max 10 mb )")
- Submit: "Submit Now".

### 7.6 Shared form behavior

File: `assets/js/complaint-form.js`, invoked as `GS_FORM({...})` inline at the bottom of each page.

Validation:

- All configured fields are required.
- Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`.
- Amount: parsed as a positive number.
- Max length enforced.
- **Image proof is required.** If missing, the upload field gets `.error` and shows "Please upload the image."; the form does not submit.
- First invalid field is focused and scrolled into view.
- Field errors clear as the user types or selects a valid file.

Upload:

- Accepts `image/*` only.
- Hard limit **10 MB** (`GS.PROOF_LIMIT = 10 * 1024 * 1024`).
- Rejects non-images and oversized files with a toast.
- Client-side compression: decodes the image, downscales so the largest side is at most **1600 px**, then encodes JPEG repeatedly lowering quality until the data URL is at most **~700 KB**. If the browser cannot decode (e.g. jsdom), the raw data URL is used.
- UI: thumbnail preview, filename replaces the label, "Image uploaded" badge, toast "Image uploaded".

Submit flow:

1. Validate.
2. Create a local complaint (`GS.complaints.add`) with a generated ID, status `Pending`, upload data URL, and a locally derived summary.
3. Call `GBET_FB_USER.save(c)` (Firestore `setDoc` with the local ID); failures are ignored.
4. Show a 3-second loading state on the button.
5. Toast "Complaint saved locally.".
6. Centered popup with OK:
   `"Your complain Sent to GUGOBET support center please wait for 30 minites ⌛"`
7. On OK: hide the form, show the success view:
   - Green check mark.
   - "Complaint saved".
   - "Submitted on <date/time>".
   - Info notice: "You can track this complaint in your Inbox using the complaint ID above." (legacy copy; no ID is actually shown).
   - Buttons: "View Inbox" (primary) and "Home" (ghost).

Local storage failure shows an error toast and does not submit.

### 7.7 Inbox — `inbox.html`

Files: `inbox.html`, `assets/js/inbox.js`.

- Header "Inbox"; storage notice area at top.
- Tools:
  - Search input ("Search complaints") across ID, category, status, name, UID, mobile, problem, amount, reference, unique userId, email.
  - Category filter: All categories, Deposit problem, Withdrawal problem, E-mail verification.
  - Status filter: All statuses, Pending, Processing, Success.
- Count line: "N complaints", or "N of M" while filtering.
- Each card is a non-clickable `<article class="inbox-card">`:
  - Category tag.
  - Status badge.
  - Submitted date/time.
  - Full-width primary CTA "View Details" → `complaint.html?id=<id>`.
- Empty states:
  - No saved complaints: "No complaints saved yet. Submit a complaint to see it here."
  - Filtered empty: "No complaints match your search or filters."
- Re-renders on `storage` events; initial skeleton with spinner for ~120ms.

### 7.8 Complaint details — `complaint.html?id=...`

Files: `complaint.html`, `assets/js/complaint-view.js`.

- Header "Complaint Details"; back row above content.
- Loads a complaint from local storage by `id` (only locally saved complaints are visible to the user).
- Live Firestore watchers mirror the admin status into local storage and re-render Inbox/details automatically.
- Not found: tray icon, "Complaint not found on this device.", "Back to Inbox".
- Render:
  - Hero: category tag + status badge.
  - Submitted date/time.
  - Detail rows (only non-empty values): User Name, UID, Mobile, Problem Type, Amount, Reference, Date, Payment Method, User ID, Email, Details.
  - If an image exists: ghost button "View attached image".
  - Actions row: "Status" (ghost) and "Delete" (danger).
- Image viewer:
  - Full-screen dark viewer.
  - Image width **60%** (max-width 640px, max-height 70vh).
  - Close button below the image, same width.
  - Backdrop click or Escape closes.
- Status modal:
  - Title "Complaint Status".
  - Current status + saved-on timestamp.
  - Explanation text per status.
  - Close button.
  - Read-only; the user cannot change status. The shown status updates live when support changes it.
- Delete:
  - Confirm dialog: "Delete complaint?", message "This complaint will be permanently removed from this device and the support center.", buttons Cancel/Delete.
  - On confirm: remove from local storage and delete the Firestore document, toast "Complaint deleted.", redirect to Inbox.
  - If offline, the local copy is still removed and the cloud delete is retried best-effort.

### 7.9 Online chat — `chat.html`

Files: `chat.html`, `assets/js/chat.js`.

- Header "Online Chat".
- Info notice: "**Live chat is connected.** Messages are delivered to the GUGOBET support team."
- Chat bar: hint "Chat history stays on this device." and ghost button "Clear history".
- Chat log:
  - Empty state icon + "No messages yet. Start a chat with support."
  - User messages right-aligned blue bubble, system messages left-aligned, timestamp below.
- Composer: input (max 500) + blue send icon button.
- Send:
  1. Save locally via `GS.chat.add`.
  2. Also `addDoc` to Firestore `chats` with the chat identity (best effort; failures ignored).
  3. Append bubble immediately and scroll to bottom.
- Clear history:
  - Confirm dialog (danger).
  - Clears local chat and deletes this user's Firestore `chats` documents (best effort). The admin "clear all" still clears every conversation.
  - Toast "Chat history cleared."
- Live support replies: the page listens to the user's `chats` documents and appends new admin replies (`role: "support"`) as left-side messages. Remote IDs prevent duplicates, and a clear cutoff stops deleted history from reappearing.
- If the user has not logged in, a stable guest chat ID (`gugobet.chatid.v1`) is generated so support can still reply.
- Cross-tab updates via `storage` event and the `gbfb:chat` event.

---

## 8. Local data model

### 8.1 Keys

| Key | Storage | Purpose |
|---|---|---|
| `gugobet.complaints.v1` | localStorage | Array of complaint records |
| `gugobet.chat.v1` | localStorage | Array of chat messages |
| `gugobet.seq.v1` | localStorage | Incrementing ID sequence |
| `gugobet.nav.stack.v1` | sessionStorage | Back-navigation stack |
| `gugobet.session.v1` | sessionStorage | Login session |
| `gugobet.userids.v1` | localStorage | Login ID → auto user ID map |
| `gugobet.chatid.v1` | localStorage | Stable guest chat identity |
| `gugobet.chatcleared.v1` | localStorage | Timestamp cutoff so cleared replies do not return |

### 8.2 Complaint record

```
{
  id, category, createdAt, name, mobile, uid, problemType, amount,
  reference, userId, date, paymentMethod, email, details,
  proof, status, summary
}
```

- `normalize()` rejects records without `id`, `category`, or a valid `createdAt`.
- `status` is normalized: `processing` → Processing; `success`/`submitted`/`solved` → Success; anything else → Pending.
- `summary` combines name, mobile, UID, amount, reference, userId and details.

### 8.3 ID format

`<PREFIX>-<YY><MM><DD>-<0000>` where prefix is `DEP`, `WDR`, `EML` (fallback `CMP`). Sequence is global across categories. The ID is internal/navigation-only and is not shown to the user.

### 8.4 Storage failure

If localStorage is unavailable or quota is exceeded:

- Show a storage warning notice on form/inbox/detail pages.
- Refuse to submit and show a toast (e.g. "Device storage is full...").

---

## 9. Public JS APIs

`window.GS` from `store.js`:

- `GS.KEYS`
- `GS.CATEGORIES`, `GS.STATUSES`, `GS.PROOF_LIMIT`
- `GS.normalizeStatus`, `GS.statusKey`
- `GS.util`: `escapeHtml`, `fmtDateTime`, `fmtDateShort`, `truncate`, `makeSummary`
- `GS.store`: `available`, `get`, `set`
- `GS.complaints`: `list`, `get`, `add`, `remove`, `updateStatus`, `clear`
- `GS.chat`: `list`, `add`, `clear`
- `GS.ui`: `toast`, `openModal`, `closeModal`, `confirmDialog`, `storageWarning`

`window.GS_GATE`:

- `open(onDone)`, `close()`, `isLoggedIn()`

`window.GBET_FB_USER` (async module, may be absent offline/early):

- `save(record)`
- `saveLogin({ uid, password, tab })`
- `userIdFor(uid)`
- `currentUserId()`
- `chatUserId()` — chat identity (login user ID or stable guest)
- `goOffline()` — mark presence offline (called on logout)
- `deleteComplaint(id)`
- `sendChat(text, role)`
- `clearChats()` — deletes only this user's cloud chat

---

## 10. Accessibility and responsive behavior

- Semantic header/main/section/article/form elements.
- Buttons have labels; icons are `aria-hidden` or labelled.
- Modals use `role="dialog"` and `aria-modal="true"`.
- Focus styles visible; Escape closes modals/gate/viewer.
- `aria-live` on chat log and toasts.
- 380px and 560px breakpoints tune margins, grid gaps, form padding; 900px widens some elements; short landscape screens reduce banner height.
- `prefers-reduced-motion` disables animations.
- Safe-area padding for notches/home indicators.

---

## 11. Assets (keep separate)

Required image files and exact relative paths:

| Path | Purpose |
|---|---|
| `logo/logo.cb987a2.png` | Header/sidebar/login logo and favicon |
| `banner/file_0000000057f08211ab6db1b5fcc8ac86.png` | Home banner |
| `option-icons/109501-removebg-preview.png` | Deposit option icon |
| `option-icons/109502-removebg-preview.png` | Withdrawal option icon |
| `option-icons/109500-removebg-preview.png` | E-mail option icon |
| `option-icons/109503-removebg-preview.png` | Chat option icon |

`login-pop-up/` is an old stand-alone mock and is not required by the live app. The `logo/*.zip` and `.trashed-*` files are unused.

---

## 12. Known limitations / intentional current behavior

- No real authentication; login validates shape only.
- Passwords are stored in plain text in Firestore and are publicly readable with current rules.
- Unique user ID is generated per login identifier on first login; existing older records may have no `userId`.
- All Firestore writes are best effort; the app remains usable offline with local data.
- Online presence is heartbeat-based; two open tabs for the same user can briefly overwrite each other's online state.

---

## 13. Rebuild checklist

1. Create the folder structure and copy the asset files to the exact relative paths.
2. Implement `store.js` keys, complaint normalization, status mapping, IDs, chat, and UI helpers.
3. Build the shared shell (`app.js`): header controls, SVG icons, sidebar, logout, nav stack, back button.
4. Implement the login gate and glass styling; gate the three complaint pages.
5. Implement `complaint-form.js` with required fields, image-required validation, 10 MB limit, compression, 3s submit delay, sent popup, and success view.
6. Build Home (banner, 4 cards, FAQ), the three forms, Inbox (search/filters/cards), details page (status/delete/viewer), and chat.
7. Add `firebase-sync.js` with the config above, auto user ID, login/complaint/chat writes.
8. Publish the Firestore rules from the repository root.
9. Verify at 360–430px width, keyboard focus, Escape handling, and offline local-storage behavior.
