#  LeetCode Timer Extension

A lightweight Chrome extension that automatically starts a **problem-solving timer on LeetCode**.
Designed to help you improve time discipline and simulate real coding interview conditions.

---

## Features

 **Auto-start Timer**
Automatically detects when you open a LeetCode problem and starts the timer.

 **Configurable Default Duration**
Choose your preferred default time per problem (e.g. 20 min, 30 min, 60 min) in the **Settings page**.
This setting is remembered across sessions.

 **Custom Timer per Problem**
Manually set a custom duration directly from the LeetCode page.

 **Visual & Audio Alerts**

* 20 % remaining → amber warning
* 10 % remaining → red alert + subtle beep + flash effect
* Time-up overlay when the timer hits zero

 **Keyboard Shortcuts**

| Shortcut                     | Action                                            |
|------------------------------|---------------------------------------------------|
| **Ctrl + Shift + 1**         | Set timer to 60 min and start                     |
| **Ctrl + Shift + 2**         | Set timer to 30 min and start                     |
| **Ctrl + Shift + Y**         | Pause / Resume                                    |
| **Ctrl + Shift + U**         | Reset timer                                       |
| **Ctrl+Shift+L**             | Toggle Block Comments (no default Shortcut in LC) |
| *(customizable in manifest)* |                                                   |

 **Persistent Pause**
Pausing the timer keeps the remaining time intact even if you switch tabs.

 **Difficulty-Aware Defaults**
Optionally adjust default time based on problem difficulty (Easy – 30 min, Hard – 60 min).

 **Clean, Non-Intrusive UI**
Appears above the “Run / Submit” area, styled to match LeetCode’s interface.

---

##  Installation (Developer Mode)

1. Clone or download this repo.
2. Open **chrome://extensions**.
3. Enable **Developer mode** (top-right).
4. Click **Load unpacked** and select your project folder.
5. Open any LeetCode problem page (e.g. `https://leetcode.com/problems/two-sum/`).
6. The timer widget should appear automatically.

---

##  Settings Page

Access your **default timer settings**:

1. Go to `chrome://extensions`.
2. Find **LeetCode Timer → Details → Extension options**.
3. Set your preferred **default minutes** (e.g. 25).
4. Click **Save**.

Your default time will automatically apply to new problems.

---

##  Project Structure

```
LeetCode-Timer/
│
├── manifest.json           # Chrome extension manifest (MV3)
├── background.js           # Handles global keyboard commands
├── content.js              # Injected into LeetCode pages – main timer logic
├── options.html            # Settings page UI
├── options.js              # JS for saving/loading settings
├── options.css             # Styling for the settings page
├── icon48.png
└── icon128.png
```

---

## How It Works

* `content.js` is injected into LeetCode problem pages (`/problems/*`).
* The script adds a timer widget above the submit area and starts counting down.
* `background.js` listens for keyboard shortcuts defined in `manifest.json`.
* The Options page uses Chrome Storage Sync API to persist your default duration.

---

##  Troubleshooting

* **Timer not showing?**
  Reload the page or open a specific problem URL, not the problem list.

* **Shortcuts not working?**

    * Ensure the LeetCode tab is active and focused.
    * Check `chrome://extensions/shortcuts` to verify your shortcut keys.

* **Settings not saving?**
  Re-open the options page via the extension’s *Details → Extension options* button, not from a `file:///` path.

---

## ️ Permissions Used

| Permission              | Reason                                              |
| ----------------------- | --------------------------------------------------- |
| `storage`               | To save default timer settings                      |
| `scripting`             | To inject scripts dynamically                       |
| `tabs`, `webNavigation` | To detect and send commands to active LeetCode tabs |
| `host_permissions`      | For `leetcode.com` and `leetcode.cn`                |

---

##  Tech Stack

* **Manifest V3**
* **Chrome Storage Sync API**
* **Vanilla JS + CSS**
* **Non-blocking async event handling**

---

##  Future Ideas

*  Session history and statistics (average solve time per difficulty)
*  Custom alert sounds
*  Theme matching (light/dark auto-detection)
*  Sync with LeetCode account stats

---

##  Author

**Sai Kartik Ivaturi**
Chrome Extension | JavaScript | Automation | Software Engineering
[GitHub @Kartikiv](https://github.com/Kartikiv)

