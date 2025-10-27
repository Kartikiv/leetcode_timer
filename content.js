// content.js
(function () {
    // ---------- State ----------
    let timerInterval = null;
    let startTime = null;
    let baseDuration = 30 * 60 * 1000;
    let customDuration = null;
    let alerted20 = false;
    let alerted10 = false;
    let userInteracted = false;
    let lastTick = 0;
    let pausedRemaining = null; // ⬅️ add this


    // NEW: settings cache
    let storedEasyDefaultMinutes = 30;
    let storedHardDefaultMinutes = 30;

    // ---------- Helpers ----------
    const ms = (m) => m * 60 * 1000;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    function persist() {}

    async function loadSettings() {
        try {
            const s = await chrome.storage?.sync?.get?.({ defaultEasyMinutes: 30 });
            storedEasyDefaultMinutes = Math.max(1, Math.min(180, parseInt((s?.defaultEasyMinutes ?? 30), 10)));
            const s1 = await chrome.storage?.sync?.get?.({ defaultHardMinutes: 60 });
            storedHardDefaultMinutes = Math.max(1, Math.min(180, parseInt((s1?.defaultHardMinutes ?? 60), 10)));
        } catch {
            storedEasyDefaultMinutes = 30;
            storedHardDefaultMinutes = 60;
        }
    }
    function injectCSS() {
        if (document.getElementById("leetcode-timer-style")) return;
        const style = document.createElement("style");
        style.id = "leetcode-timer-style";
        style.textContent = `
      #leetcode-timer { 
        margin: 8px 0 12px 0; 
      }
      .timer-container { 
        display: flex; 
        align-items: center; 
        gap: 10px; 
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 8px;
        backdrop-filter: blur(4px);
      }
      .timer-display { 
        font-weight: 700; 
        font-size: 16px; 
        padding: 6px 12px; 
        border-radius: 6px; 
        background: rgba(15, 23, 42, 0.5);
        color: #10b981; 
        min-width: 70px; 
        text-align: center;
        font-variant-numeric: tabular-nums;
        transition: color 0.3s ease, background 0.3s ease;
      }
      .timer-display.warning {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }
      .timer-display.danger {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
      }
      .timer-controls { 
        display: flex; 
        align-items: center; 
        gap: 6px; 
      }
      .timer-input { 
        width: 64px; 
        padding: 6px 10px; 
        border: 1px solid rgba(229, 231, 235, 0.5); 
        border-radius: 6px; 
        font-size: 13px;
        background: rgba(255, 255, 255, 0.9);
        color: #1f2937;
        font-weight: 500;
        text-align: center;
        transition: border-color 0.2s;
      }
      .timer-input:focus {
        outline: none;
        border-color: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
      }
      .timer-btn { 
        padding: 6px 12px; 
        border: 1px solid rgba(16, 185, 129, 0.4);
        border-radius: 6px; 
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        cursor: pointer; 
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s;
      }
      .timer-btn:hover { 
        background: rgba(16, 185, 129, 0.2);
        border-color: #10b981;
        transform: translateY(-1px);
      }
      .timer-btn:active {
        transform: translateY(0);
      }
      .timer-flash { 
        position: fixed; 
        inset: 0; 
        background: rgba(239, 68, 68, 0.25);
        pointer-events: none; 
        animation: timerFlash 600ms ease; 
        z-index: 2147483647; 
      }
      @keyframes timerFlash { 
        0% { opacity: 0 } 
        25% { opacity: 1 } 
        50% { opacity: 0.5 }
        75% { opacity: 1 }
        100% { opacity: 0 } 
      }
      .timer-timeup-overlay { 
        position: fixed; 
        inset: 0; 
        background: rgba(239, 68, 68, 0.9);
        color: #fff; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 18px; 
        font-weight: 800; 
        z-index: 2147483647;
        backdrop-filter: blur(8px);
      }
      .timer-timeup-box { 
        background: rgba(0, 0, 0, 0.3); 
        padding: 20px 28px; 
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
    `;
        document.head.appendChild(style);
    }

    function findSubmitArea() {
        const submitBtn = document.querySelector('[data-e2e-locator="console-submit-button"]');
        if (submitBtn && submitBtn.parentElement) return submitBtn.parentElement;

        const altWrap = document.querySelector('.css-1h3ow9y-Wrapper');
        if (altWrap) return altWrap;

        const anySubmit = [...document.querySelectorAll('button, [class*="submit"]')].find(
            el => /submit/i.test(el.textContent || "")
        );
        return anySubmit?.parentElement || null;
    }

    function readDifficulty() {
        const byAttr = document.querySelector('[diff]');
        if (byAttr) return (byAttr.getAttribute('diff') || '').toLowerCase();

        const candidates = [
            ...document.querySelectorAll('[class*="difficulty"], [data-e2e-locator*="difficulty"], span, div')
        ];
        for (const el of candidates) {
            const t = (el.textContent || '').trim().toLowerCase();
            if (t === 'easy' || t === 'medium' || t === 'hard') return t;
        }
        return null;
    }

    function getDurationDefault() {
        if (storedHardDefaultMinutes &&storedEasyDefaultMinutes && Number.isFinite(storedEasyDefaultMinutes) && Number.isFinite(storedEasyDefaultMinutes)) {
            const d = readDifficulty();
            if (d === 'hard') return ms(storedHardDefaultMinutes);
            return ms(storedEasyDefaultMinutes);
        }else {
            const d = readDifficulty();
            if (d === 'hard') return ms(60);
            return ms(30);
        }
    }

    function currentDuration() {
        return customDuration ?? baseDuration;
    }

    function formatTime(msLeft) {
        const totalSec = Math.ceil(msLeft / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function setDisplayColor(el, msLeft) {
        const dur = currentDuration();
        const pct = (msLeft / dur) * 100;

        el.classList.remove('warning', 'danger');

        if (pct <= 10) {
            el.classList.add('danger');
        } else if (pct <= 20) {
            el.classList.add('warning');
        }
    }

    function showFlash() {
        const flash = document.createElement('div');
        flash.className = 'timer-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 600);
    }

    function beep() {
        if (!userInteracted) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.35, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } catch {}
    }

    function showTimeUp() {
        const overlay = document.createElement('div');
        overlay.className = 'timer-timeup-overlay';
        overlay.innerHTML = `<div class="timer-timeup-box">⏰ Time's up. Take a breath, then submit or move on.</div>`;
        document.body.appendChild(overlay);
    }

    // ---------- UI ----------
    function createTimerUI() {
        if (document.getElementById('leetcode-timer')) return;

        const anchor = findSubmitArea();

        const timerDiv = document.createElement('div');
        timerDiv.id = 'leetcode-timer';

        const defaultMs = currentDuration();
        timerDiv.innerHTML = `
      <div class="timer-container" role="group" aria-label="Problem timer">
        <div class="timer-display" aria-live="polite">${formatTime(defaultMs)}</div>
        <div class="timer-controls">
          <input type="number" id="timer-minutes" class="timer-input" min="1" max="180" value="${Math.floor(defaultMs/60000)}" placeholder="Min" aria-label="Timer minutes">
          <button id="timer-start" class="timer-btn" aria-label="Start or Pause timer">Start</button>
          <button id="timer-reset" class="timer-btn" aria-label="Reset timer">Reset</button>
        </div>
      </div>
    `;

        if (anchor) {
            anchor.insertAdjacentElement('beforebegin', timerDiv);
        } else {
            // Fallback: mount at top of body so the widget always exists
            document.body.prepend(timerDiv);
        }

        document.getElementById('timer-start').addEventListener('click', () => {
            userInteracted = true;
            toggleTimer();
        });
        document.getElementById('timer-reset').addEventListener('click', () => {
            userInteracted = true;
            resetTimer({ keepCustom: true });
        });
        document.getElementById('timer-minutes').addEventListener('change', (e) => {
            const minutes = clamp(parseInt(e.target.value || '0', 10), 1, 180);
            e.target.value = String(minutes);
            customDuration = ms(minutes);
            if (!timerInterval) updateDisplay(customDuration);
        });
    }

    function updateDisplay(msLeft) {
        const disp = document.querySelector('.timer-display');
        if (!disp) return;
        disp.textContent = formatTime(msLeft);
        setDisplayColor(disp, msLeft);
    }

    function getTimeLeft() {
        // If running: compute from startTime
        if (startTime) {
            const elapsed = Date.now() - startTime;
            return Math.max(0, currentDuration() - elapsed);
        }
        // If paused: return frozen remaining
        if (pausedRemaining !== null) return pausedRemaining;

        // If never started or after reset:
        return currentDuration();
    }


    // ---------- Timer control ----------
    function startTimer() {
        if (!startTime) {
            if (pausedRemaining !== null) {
                // resume from paused snapshot
                startTime = Date.now() - (currentDuration() - pausedRemaining);
                pausedRemaining = null;
            } else {
                // first start
                startTime = Date.now();
            }
        } else {
            // already had a startTime: rebase using current remaining
            startTime = Date.now() - (currentDuration() - getTimeLeft());
        }

        if (timerInterval) clearInterval(timerInterval);
        lastTick = Date.now();

        timerInterval = setInterval(() => {
            const now = Date.now();
            if (now - lastTick < 90) return;
            lastTick = now;

            const timeLeft = getTimeLeft();
            updateDisplay(timeLeft);

            const pct = (timeLeft / currentDuration()) * 100;

            if (pct <= 20 && pct > 10 && !alerted20) { showFlash(); beep(); alerted20 = true; }
            if (pct <= 10 && pct > 0 && !alerted10) { showFlash(); beep(); alerted10 = true; }
            if (timeLeft <= 0) {
                stopTimer();
                showFlash(); beep();
                showTimeUp();
                persist?.(true);
            }
        }, 120);
        setStartBtnLabel('Pause');
    }


    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;

        // Freeze remaining time so it doesn't keep ticking down
        pausedRemaining = getTimeLeft();
        startTime = null;

        // Keep the frozen time on screen
        updateDisplay(pausedRemaining);
        setStartBtnLabel('Start');
    }


    function setStartBtnLabel(text) {
        const btn = document.getElementById('timer-start');
        if (btn) btn.textContent = text;
    }

    function toggleTimer() {
        if (timerInterval) stopTimer();
        else startTimer();
    }

    function resetTimer({ keepCustom = false } = {}) {
        stopTimer();
        startTime = null;
        pausedRemaining = null; // ⬅️ clear pause snapshot
        alerted20 = false;
        alerted10 = false;

        if (!keepCustom) {
            customDuration = null;
            baseDuration = getDurationDefault();
            const inp = document.getElementById('timer-minutes');
            if (inp) inp.value = String(Math.floor(baseDuration / 60000));
        }
        updateDisplay(currentDuration());
    }


    window.addEventListener('keydown', (e) => {
        // ignore if user is typing in an input other than the editor
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;

        if (e.shiftKey && e.altKey && e.key === '1') {
            e.preventDefault();
            userInteracted = true;
            customDuration = 60 * 60 * 1000;
            const inp = document.getElementById('timer-minutes');
            if (inp) inp.value = '60';
            resetTimer({ keepCustom: true });
            setTimeout(startTimer, 50);
        }

        if (e.shiftKey && e.altKey && e.key === '2') {
            e.preventDefault();
            userInteracted = true;
            customDuration = 30 * 60 * 1000;
            const inp = document.getElementById('timer-minutes');
            if (inp) inp.value = '30';
            resetTimer({ keepCustom: true });
            setTimeout(startTimer, 50);
        }
    }, true);
    // ---------- Commands bridge (from background.js) ----------
    (function setupCommandBridge() {
        function runAction(action) {
            try { userInteracted = true; } catch {}
            if (action === "set-60-start") {
                customDuration = 60 * 60 * 1000;
                const inp = document.getElementById("timer-minutes");
                if (inp) inp.value = "60";
                resetTimer({ keepCustom: true });
                setTimeout(startTimer, 50);
            } else if (action === "set-30-start") {
                customDuration = 30 * 60 * 1000;
                const inp = document.getElementById("timer-minutes");
                if (inp) inp.value = "30";
                resetTimer({ keepCustom: true });
                setTimeout(startTimer, 50);
            } else if (action === "toggle") {
                toggleTimer();
            } else if (action === "reset") {
                resetTimer({ keepCustom: true });
            }
        }

        if (chrome?.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
                if (msg?.type === "LC_TIMER_CMD") {
                    runAction(msg.command);
                    // *** IMPORTANT: ACK so background knows it worked
                    try { sendResponse({ ok: true }); } catch {}
                    return true;
                }
            });
        }
    })();

    // ---------- React/iframes safety ----------
    const mo = new MutationObserver(() => {
        if (!document.getElementById('leetcode-timer')) {
            createTimerUI();
        }
    });

   async function boot() {
        injectCSS();
        await loadSettings();
        baseDuration = getDurationDefault();
        createTimerUI();
       const inp = document.getElementById('timer-minutes');
       if (inp) inp.value = String(Math.floor(baseDuration / 60000));
        setTimeout(() => {
            startTimer();
        }, 1000);
        const target = document.body;
        if (target) mo.observe(target, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 300));
    } else {
        setTimeout(boot, 300);
    }

    window.addEventListener('beforeunload', () => stopTimer());
})();
