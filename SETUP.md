# Panic Button Setup Guide

This adds a remote panic button to your Tradovate Auto-Cancel extension.
You'll have a webpage on your phone that can trigger "Exit at Mkt & Cxl" on your laptop.

Total time: about 10 minutes.

---

## What you need before starting

- Your Tradovate Auto-Cancel extension already installed
- A Firebase project with Google Auth and Firestore enabled (you've already done this)
- A Netlify account (you already have one)
- Your Firebase Web API Key (from Project Settings in the Firebase console)

---

## Step 1: Update the Chrome Extension

Replace the files in your `tradovate-extension` folder with the new versions:

- `manifest.json` (updated — adds Firestore permission)
- `content.js` (updated — adds panic signal polling + position reporting)
- `popup.html` (updated — adds settings panel)
- `popup.js` (updated — handles settings)

Keep your `icons/` folder as-is — those files haven't changed.

Then go to `chrome://extensions`, find Tradovate Auto-Cancel, and click the
**refresh icon** (circular arrow). Refresh any open Tradovate tabs with Cmd+R.

---

## Step 2: Configure the Extension

1. Click the Auto-Cancel extension icon in your toolbar
2. At the bottom, click **Settings**
3. Enter your **Firebase Project ID**: `xqueue-69d9e`
4. Enter your **Firebase Web API Key** (from Firebase console → Project Settings → scroll down to "Your apps" → the `apiKey` value)
5. Click **Save**

The dot next to "Remote Panic Button" should turn green and say "Connected to Firebase."

---

## Step 3: Set Firestore Security Rules

Go to the Firebase console → Firestore Database → Rules tab.

Replace whatever is there with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Positions: extension writes freely, only you can read
    match /positions/{doc} {
      allow write: if true;
      allow read: if request.auth != null;
    }

    // Panic signals: only you can write (must be logged in), extension reads freely
    match /signals/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

**What this means:**
- Your extension can push position data and read panic signals (no login needed)
- The panic page can read positions and send panic signals (requires Google login)
- Nobody can trigger exits without logging into your Google account

### Optional: Lock it to your specific Google account

After you log in to the panic page for the first time, open the browser console
(F12 → Console) and type: `firebase.auth().currentUser.uid`

Copy that UID, then update the signals rule to:

```
match /signals/{doc} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.uid == 'YOUR_UID_HERE';
}
```

This means even if someone else somehow logged into the page, they couldn't trigger exits.

---

## Step 4: Deploy the Panic Page to Netlify

1. Go to **app.netlify.com**
2. At the bottom of the Sites page, you'll see a drag-and-drop area
3. Drag the `panic` folder (the one containing `index.html`) onto it
4. Netlify will deploy it and give you a URL like `random-name-123.netlify.app`
5. Optional: go to Site Settings → Domain management → change to a custom name

---

## Step 5: Set Up Your Phone

1. Open the Netlify URL on your phone's browser
2. First time: enter your Firebase Project ID and API Key, tap Continue
3. Tap "Sign in with Google" and log into the same Google account
4. Bookmark the page / add it to your home screen

**To add to iPhone home screen:**
- Open the page in Safari
- Tap the share button (square with arrow)
- Tap "Add to Home Screen"
- It'll look and feel like a native app

---

## Step 6: Test It

1. Open Tradovate on your laptop with a chart visible
2. Check the extension popup — it should show the instrument under "Open Positions"
3. Open the panic page on your phone — you should see the same instrument as a red circle
4. Tap the circle → confirm → check Tradovate

If you have a trade open, it will actually click Exit. For testing, you can:
- Open Tradovate without a trade — the panic page should show "No active positions"
- Open a trade on the sim account to test the full flow

---

## How it works (summary)

1. Extension scans Tradovate every second (same as before)
2. Extension pushes current instrument + contract count to Firestore every 5 seconds
3. Panic page shows those positions as red circles in real-time
4. When you tap a circle and confirm, the panic page writes a signal to Firestore
5. Extension polls for that signal every 3 seconds
6. When it sees the signal, it clicks "Exit at Mkt & Cxl" (same button as always)
7. Extension resets the signal so it doesn't re-trigger

Maximum delay from tap to click: about 3 seconds (one poll cycle).

---

## Multiple instruments

If you have two Chrome windows open on different instruments, both run the extension
independently. Both push their positions to Firestore, so the panic page shows all of them.

- Tap a specific circle → only that instrument's window clicks Exit
- Tap "EXIT ALL" → all windows click Exit

---

## Troubleshooting

**Panic page shows "No active positions":**
- Make sure Tradovate is open and the extension popup shows a green dot
- Check the extension popup Settings — the dot should be green ("Connected to Firebase")
- Positions take up to 5 seconds to appear after opening a trade

**Extension popup says "Not configured":**
- Click Settings and enter your Firebase Project ID and API Key
- Make sure you click Save

**Google Sign-In fails:**
- Make sure Google auth is enabled in Firebase console → Authentication → Sign-in method
- The panic page domain (your-site.netlify.app) needs to be in the authorized domains list:
  Firebase console → Authentication → Settings → Authorized domains → Add your Netlify URL

**Signal sent but nothing happened:**
- Make sure Tradovate tab is open and active (not minimized)
- Check the extension popup log for any errors
- The "Exit at Mkt & Cxl" button must be visible on the Tradovate page

**Position data is stale (shows old instruments):**
- Positions auto-clean after 30 seconds of no updates
- If you closed Tradovate, wait 30 seconds and refresh the panic page
