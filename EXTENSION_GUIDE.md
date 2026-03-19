# Tradovate Auto-Cancel Chrome Extension

## What This Is

A Chrome extension that automatically cancels leftover orders when your position closes on Tradovate. Built specifically for Apex Trader Funding copy-trade group accounts where bracket orders don't work.

---

## The Problem It Solves

When you trade with Tradovate's group/copy-trade feature across multiple Apex accounts, bracket orders aren't supported. So you manually set your SL (stop loss) and TP (take profit) as two separate orders.

The danger: if your SL hits first, the TP limit order stays active. If price then reverses and reaches your TP level, that stale TP order fills and you're now in a brand new position you never intended to take. The same thing happens in reverse — if your TP hits, the SL stays active.

This extension watches your position. The instant it goes to zero, it clicks the "Exit at Mkt & Cxl" button for you — the same button you'd click manually, just faster. Any leftover orders on that instrument get removed before they can accidentally fill.

---

## How It Actually Works (Under the Hood)

The extension is a Chrome content script — a small program that runs inside the Tradovate web page. Here's what it does every single second:

1. **Reads the page text.** It scans the visible text on the Tradovate page looking for the word "POSITION" followed by a value on the next line. Tradovate displays this in the header area as something like `POSITION 20@97.43` (you're in a trade) or `POSITION 0` (you're flat).

2. **Parses the position value.** It extracts the number from formats like `20@97.43` → 20 (long 20 contracts), `-40@6770.25` → -40 (short 40 contracts), or just `0` (flat).

3. **Remembers the previous value.** It compares what it sees now to what it saw one second ago.

4. **Detects transitions.** If the position went from something non-zero (like 20) to zero, that means a trade just closed — either your SL, your TP, or you closed it manually.

5. **Clicks the button.** It searches the page for any button or link containing the text "Exit at Mkt & Cxl" and programmatically clicks it. To Tradovate's servers, this looks identical to you clicking it with your mouse.

6. **Enters a 5-second cooldown.** After clicking, it waits 5 seconds before checking again to avoid accidentally triggering twice on the same close.

The extension also detects when you switch instrument tabs (like going from MCLK6 to MESM6) and resets its tracking so it doesn't confuse a tab switch for a position close.

**What it does NOT do:**
- It never makes API calls to Tradovate
- It never places orders — it can only cancel
- It never logs into anything
- It doesn't send data anywhere
- It doesn't modify the Tradovate page in any visible way

---

## What's In the Extension (File by File)

The extension is a folder containing these files:

### manifest.json
This is the Chrome extension's ID card. It tells Chrome:
- The extension's name and version
- Which websites it's allowed to run on (`*.tradovate.com`)
- What permissions it needs (`storage` — to save the activity log and settings between popup opens)
- Which script to inject into the page (`content.js`)
- What to show when you click the icon (`popup.html`)

### content.js
This is the brain of the extension. It's the script that runs inside the Tradovate page and does the actual position monitoring and button clicking. It contains:
- **findPosition()** — scans the page for the POSITION value
- **findInstrument()** — finds the current instrument symbol (like MCLK6)
- **clickExitButton()** — finds and clicks the "Exit at Mkt & Cxl" button
- **check()** — the main loop that runs every second and ties it all together
- **log()** — records activity so you can see what happened in the popup

### popup.html
This is the popup window that appears when you click the extension icon in the toolbar. It shows:
- A green/yellow status dot
- How many times it has canceled orders
- Which instruments have open positions
- A scrollable activity log

### popup.js
This is the code that makes the popup work. It reads the saved state (written by content.js) and displays it. It also handles the ON/OFF toggle. It refreshes every second while the popup is open.

### icons/
The green circle icons that appear in Chrome's toolbar and extension pages.

---

## Installation

### Step 1: Download the Extension

Download the `tradovate-extension.zip` file and unzip it.

**Where to put it:** Choose a permanent location like your Documents folder. Don't leave it in Downloads if you regularly clear that folder. Chrome needs to keep accessing these files — if you delete or move the folder, the extension breaks.

**Why a folder and not the Chrome Web Store?** The Chrome Web Store has a review process that takes weeks and costs a $5 developer fee. Loading it as an "unpacked" extension from a folder does the exact same thing — this is how most custom trading tools are installed.

### Step 2: Open Chrome's Extension Manager

Open Google Chrome and type this into the address bar:

```
chrome://extensions
```

Press Enter.

**What this is:** This is Chrome's built-in page for managing extensions. Every extension you've ever installed shows up here. It's not a website — it's a Chrome internal page (that's why the URL starts with `chrome://` instead of `https://`).

### Step 3: Enable Developer Mode

In the top-right corner of the extensions page, find the toggle labeled **"Developer mode"** and turn it **ON**.

**What this does:** By default, Chrome only lets you install extensions from the Chrome Web Store. Developer mode unlocks the ability to load extensions from a local folder on your computer. The name sounds technical but it's completely safe — it just means "let me install my own stuff." Many trading tools, ad blockers, and productivity extensions are installed this way.

**Why it's safe:** The extension can only access websites you've given it permission for (in our case, `*.tradovate.com`). It can't access your other tabs, your files, your passwords, or anything else. Chrome's permission system enforces this.

### Step 4: Load the Extension

Click the **"Load unpacked"** button that appeared after enabling Developer mode. Navigate to the `tradovate-extension` folder you unzipped in Step 1 and select it.

**What "Load unpacked" means:** A normal Chrome extension is packaged into a single `.crx` file (like a zip file). "Unpacked" means you're loading it directly from the raw files in a folder instead. Chrome reads the `manifest.json` file in that folder to understand what the extension does.

You should see the extension appear on the page with the green icon, the name "Tradovate Auto-Cancel", and version 3.0.0.

### Step 5: Pin It to Your Toolbar

Click the **puzzle piece icon** (🧩) in Chrome's toolbar (top-right, next to the address bar). Find "Tradovate Auto-Cancel" in the dropdown and click the **pin icon** next to it.

**Why pin it:** By default, Chrome hides extensions behind the puzzle icon. Pinning it puts the green icon directly in your toolbar so you can click it anytime to check the status without digging through menus.

### Step 6: Open Tradovate and Refresh

Go to **https://trader.tradovate.com** and log in. If Tradovate was already open, press **Cmd+R** (Mac) or **Ctrl+R** (Windows) to refresh the page.

**Why you need to refresh:** The extension's content script (`content.js`) gets injected when a page loads. If Tradovate was already open when you installed the extension, the script wasn't there yet. Refreshing the page makes Chrome inject the script fresh.

### Step 7: Verify It's Working

Click the green extension icon in your toolbar. You should see:

- **Green dot** under STATUS — means the script is running and reading the page
- **Activity log** showing "Starting monitor..." and "Monitoring: [instrument] | position: [value]"
- If you have a trade open, the instrument name appears as a blue chip under OPEN POSITIONS

**If the dot is yellow** and the log says "Open Tradovate and refresh the page":
- Make sure you're on `trader.tradovate.com` (not the marketing site `www.tradovate.com`)
- Try refreshing the page again with Cmd+R

---

## How to Use It

### Normal Trading (One Instrument)

Just trade normally. Keep Tradovate open in Chrome with the instrument you're trading. The extension runs silently.

When your SL or TP hits (or you close manually), the extension detects the position going to zero and clicks "Exit at Mkt & Cxl" within about 1 second. The leftover order is removed.

You don't need to do anything. You don't need to click anything. You don't even need to have the popup open — the script runs in the background as long as the Tradovate tab is open.

### Two Instruments at Once (Rare)

If you have trades on two instruments simultaneously, open a second Chrome **window** (Cmd+N on Mac). Log into Tradovate in that window and navigate to the second instrument. Each window runs its own copy of the extension independently.

**Why a separate window instead of a tab:** Chrome throttles background tabs to save battery and CPU. A tab you're not looking at might only run its script once every 30-60 seconds instead of every second. A separate window stays active even when it's behind another window. This ensures both instruments are monitored in real time.

### Stepping Away from Your Computer

If you need to leave your computer with a trade open (going to the gym, etc.):

1. Open **Terminal** (Cmd+Space, type "Terminal", press Enter)
2. Type `caffeinate` and press Enter
3. Leave that Terminal window open

**What caffeinate does:** It's a built-in Mac command that prevents your Mac from going to sleep. As long as that Terminal window is open, your screen might turn off but Chrome keeps running and the extension keeps watching. Close the Terminal window (or press Ctrl+C in it) to let your Mac sleep again.

---

## Updating the Extension

If you receive an updated version:

1. Unzip the new download
2. Replace the old `tradovate-extension` folder with the new one (same location)
3. Go to `chrome://extensions`
4. Find "Tradovate Auto-Cancel" and click the **refresh icon** (circular arrow) on its card
5. Refresh any open Tradovate tabs with Cmd+R

---

## Removing the Extension

1. Go to `chrome://extensions`
2. Find "Tradovate Auto-Cancel"
3. Click **"Remove"**
4. Delete the folder from your computer if you want

---

## When You Buy New Accounts

When you blow your Apex accounts and buy new ones, **nothing changes**. The extension reads the Tradovate web page directly — it doesn't care about account numbers, account names, or how many accounts you have. As long as you're logged into Tradovate and have a chart open, it works.

---

## Troubleshooting

### Extension icon is gray
The extension only activates on `trader.tradovate.com`. If you're on a different site, the icon will be gray. Navigate to Tradovate and it should activate.

### Popup shows yellow dot / "No activity"
- Refresh the Tradovate page (Cmd+R)
- Make sure you're on `trader.tradovate.com` not `www.tradovate.com`
- Check that the extension is enabled at `chrome://extensions`

### It detected the close but didn't cancel
- The "Exit at Mkt & Cxl" button might not have been visible or loaded. Make sure the trading controls (Buy Mkt, Sell Mkt, etc.) are visible at the top of the chart — the Exit button lives near them.
- If you see "Exit button not found!" in the log, the button's text might have changed in a Tradovate update. Let me know and I'll update the extension.

### It says "Switched to unknown" a lot
This happens when the extension can't find a futures symbol on the current view — usually during page transitions, loading screens, or when viewing a non-trading page. It recovers automatically once you're back on a chart.

### Chrome says "This extension may have been corrupted"
Go to `chrome://extensions`, remove the extension, and reinstall it from the folder. This sometimes happens after Chrome updates.

### After a Chrome update the extension stopped working
Go to `chrome://extensions` and check if it's still enabled. Chrome occasionally disables developer-mode extensions after updates. Just toggle it back on and refresh Tradovate.

---

## Apex Trader Funding Compliance

This extension functions as a trade management tool — similar to the ATM (Advanced Trade Management) strategies that Apex explicitly encourages. From Apex's own support page:

> "Apex encourages the use of ATM strategies, which automate stop-loss and profit-target levels."

The extension only cancels orders — it never places trades. It's doing exactly what a bracket order would do (cancel the other side when one fills), except Tradovate's group orders don't support brackets.

That said, Apex's rules around automation can be interpreted broadly, so it's recommended to email their support and describe what the tool does before using it on PA or Live accounts. For evaluation accounts, the rules are generally less strict.

---

## Technical Details (For the Curious)

- **Extension type:** Chrome Manifest V3 content script
- **Permissions:** `storage` (for saving activity log), host access to `*.tradovate.com`
- **How it reads data:** Parses `document.body.innerText` — the visible text on the page
- **How it clicks:** `document.querySelectorAll('button')` to find the button, then `.click()` to press it
- **Check frequency:** Every 1000ms (1 second)
- **Cooldown after cancel:** 5000ms (5 seconds)
- **Page load delay:** Waits 3 seconds after page load before starting (gives Tradovate time to render)
- **No network requests:** The extension makes zero HTTP requests. It only reads the DOM and clicks elements.
- **No background service worker:** Everything runs inside the Tradovate page context. When the tab closes, the script stops. When you open Tradovate again, it starts fresh.
