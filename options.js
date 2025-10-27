const DEFAULTS = { defaultEasyMinutes: 30, defaultHardMinutes: 60 };

async function load() {
    try {
        const s = await chrome.storage.sync.get(DEFAULTS);
        document.getElementById("default-easy-minutes").value = String(s.defaultEasyMinutes);
        document.getElementById("default-hard-minutes").value = String(s.defaultHardMinutes);
    } catch {
        document.getElementById("default-easy-minutes").value = String(DEFAULTS.defaultEasyMinutes);
        document.getElementById("default-hard-minutes").value = String(DEFAULTS.defaultHardMinutes);
    }
}

async function save() {
    const easy = document.getElementById("default-easy-minutes").value || "30";
    const minutesEasy = Math.max(1, Math.min(180, parseInt(easy, 10) || 30));
    const hard = document.getElementById("default-hard-minutes").value || "60";
    const minutesHard = Math.max(1, Math.min(180, parseInt(hard, 10) || 30));
    await chrome.storage.sync.set({ defaultEasyMinutes: minutesEasy, defaultHardMinutes: minutesHard });

    const el = document.getElementById("status");
    el.textContent = "Saved!";
    setTimeout(() => (el.textContent = ""), 1500);
}

document.getElementById("save").addEventListener("click", save);
load();
