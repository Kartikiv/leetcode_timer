// background.js (MV3 service worker)
async function getActiveLeetCodeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url) return null;
    if (!/^https:\/\/leetcode\.(com|cn)\//.test(tab.url)) return null;
    return tab;
}

async function sendToAllFrames(tabId, payload) {
    // Enumerate frames to target each explicitly
    const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => []);
    if (!frames || !frames.length) {
        // Fallback: try top frame only
        try {
            const res = await chrome.tabs.sendMessage(tabId, payload);
            return Boolean(res && res.ok);
        } catch {
            return false;
        }
    }

    let anyAck = false;
    for (const f of frames) {
        try {
            const res = await chrome.tabs.sendMessage(tabId, payload, { frameId: f.frameId });
            if (res && res.ok) anyAck = true;
        } catch {
            // ignore: frame may not have the content script yet
        }
    }
    return anyAck;
}

async function ensureContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            files: ["content.js"]
        });
        return true;
    } catch (e) {
        console.warn("[LeetCode Timer] Failed to inject content.js:", e);
        return false;
    }
}
async function getAllFramesSafe(tabId) {
    try {
        return await chrome.webNavigation.getAllFrames({ tabId });
    } catch {
        return [{ frameId: 0 }];
    }
}

// Try to toggle block comment inside the page's MAIN world.
// Returns true if any frame succeeded.
async function runBlockCommentInMainWorld(tabId, { retries = 2, delayMs = 400 } = {}) {
    // Function executed in the page
    function _toggleBlockCommentInPage() {
        try {
            const m = window.monaco && window.monaco.editor;
            if (!m) return false;

            const list = (m.getEditors && m.getEditors()) || [];
            let ed = list.find(e => e.hasTextFocus && e.hasTextFocus()) || list[0];

            if (ed && ed.getAction) {
                const a = ed.getAction('editor.action.blockComment');
                if (a && a.run) { a.run(); return true; }
            }
            if (ed && ed.trigger) {
                ed.trigger('keyboard', 'editor.action.blockComment');
                return true;
            }
        } catch (e) {}
        return false;
    }

    async function tryOnce() {
        const frames = await getAllFramesSafe(tabId);
        // Run in all frames; succeed if any frame returns true
        const results = await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            world: 'MAIN',
            func: _toggleBlockCommentInPage
        }).catch(() => []);

        return results?.some(r => r?.result === true) ?? false;
    }

    for (let i = 0; i <= retries; i++) {
        const ok = await tryOnce();
        if (ok) return true;
        if (i < retries) {
            await new Promise(res => setTimeout(res, delayMs));
        }
    }
    return false;
}


chrome.commands.onCommand.addListener(async (command) => {
    try {
        const tab = await getActiveLeetCodeTab();
        if (!tab) return;
        if (command === 'block-comment') {
            const ok = await runBlockCommentInMainWorld(tab.id, { retries: 3, delayMs: 350 });
            console.log(`[LeetCode Timer] block-comment ${ok ? 'succeeded' : 'failed'}.`);
            return;
        }
        const payload = { type: "LC_TIMER_CMD", command };

        // 1) try broadcast
        let ok = await sendToAllFrames(tab.id, payload);

        // 2) if no ACK, inject then retry once
        if (!ok) {
            console.log("[LeetCode Timer] No ACK from content script. Injecting and retrying…");
            const injected = await ensureContentScript(tab.id);
            if (injected) ok = await sendToAllFrames(tab.id, payload);
        }

        // Optional: log result
        console.log(`[LeetCode Timer] Command "${command}" ${ok ? "delivered" : "not handled"}.`);
    } catch (e) {
        console.error("[LeetCode Timer] onCommand error:", e);
    }
});
