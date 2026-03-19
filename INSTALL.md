# How to Install the Tradovate Auto-Cancel Extension

This takes about 2 minutes.

---

## Step 1: Download and Unzip

Download the extension folder to your computer. Put it somewhere permanent 
(like your Documents folder) — Chrome needs to keep accessing it.

Don't put it in Downloads if you regularly clear that folder.

---

## Step 2: Open Chrome Extensions Page

1. Open **Google Chrome**
2. In the address bar, type: `chrome://extensions`
3. Press **Enter**

---

## Step 3: Enable Developer Mode

In the top-right corner of the extensions page, you'll see a toggle that says 
**"Developer mode"**. Turn it **ON**.

This is safe — it just lets you install extensions from a folder instead of 
the Chrome Web Store. Many trading tools are installed this way.

---

## Step 4: Load the Extension

1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. Navigate to the `tradovate-extension` folder you downloaded
3. Select the folder and click **"Open"** (or "Select Folder")

You should see the extension appear with a green icon.

---

## Step 5: Pin It (Optional but Recommended)

1. Click the **puzzle piece icon** in Chrome's toolbar (top-right)
2. Find "Tradovate Auto-Cancel" in the list
3. Click the **pin icon** next to it

Now you'll see the green icon in your toolbar at all times.

---

## Step 6: Open Tradovate

Go to **https://trader.tradovate.com** and log in normally.

The extension activates automatically when it detects you're on Tradovate. 
Click the extension icon to see the status popup — it should show a green 
dot and start receiving WebSocket messages.

---

## How to Use

Once installed, just trade normally. The extension runs silently in the background.

**Click the extension icon** to see:
- Whether it's active (green dot)
- How many positions are open
- How many orders it has canceled
- A log of recent activity

**Toggle it on/off** using the switch in the popup — useful if you want to 
pause it temporarily.

---

## How to Update

If I give you an updated version:
1. Replace the files in the extension folder with the new ones
2. Go to `chrome://extensions`
3. Click the **refresh icon** (circular arrow) on the extension card

---

## How to Remove

1. Go to `chrome://extensions`
2. Find "Tradovate Auto-Cancel"
3. Click **"Remove"**

---

## Troubleshooting

**Extension icon is gray / not working:**
- Make sure you're on `trader.tradovate.com` (not the marketing site)
- Try refreshing the Tradovate page (Ctrl+R or Cmd+R)
- Check that the extension is enabled on the `chrome://extensions` page

**"WS Msgs" counter stays at 0:**
- The WebSocket interceptor might not have loaded in time
- Refresh the Tradovate page — the interceptor needs to load before Tradovate connects

**It's not detecting my positions:**
- Open Chrome DevTools (F12 or Cmd+Option+I)
- Click the "Console" tab
- Look for green "[AutoCancel]" messages
- These will show what the extension is seeing — share them with me if something looks wrong

**It's not finding the "Exit at Mkt & Cxl" button:**
- The extension searches for this button by text content
- If Tradovate renamed it, the extension might not find it
- Check the Console log for error messages and share them with me
