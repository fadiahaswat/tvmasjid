// --- ERROR HANDLER ---
window.onerror = function(msg, url, line, col, error) {
    const overlay = document.getElementById('error-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        overlay.innerHTML += `<p>Error: ${msg} <br> Line: ${line}</p>`;
    }
    return false;
};

// --- CONFIG ---
const CONFIG = {
    masjidName: "MASJID RAYA AL-FALAH",
    address: "Jl. Merdeka No. 123, Kota Pusat",
    runningText: "Selamat Datang di Masjid Raya Al-Falah • Mohon luruskan shaf • Matikan HP",
    duration: { clock: 10, schedule: 10, ayat: 15 },
    thresholds: { preAdzan: 10, preIqamah: 10, inPrayer: 15 },
    prayerTimes: {
        shubuh: "04:20", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    }
};

const CONTENTS = [
    { type: 'ayat', title: 'Ayat Hari Ini', text: 'Maka sesungguhnya bersama kesulitan ada kemudahan.', source: 'QS. Al-Insyirah: 5' },
    { type: 'info', title: 'Info Kajian', text: 'Kajian Rutin Ahad Pagi bersama Ust. Fulan', source: '06:00 WIB' }
];

// --- STATE ---
let currentState = { mode: 'NORMAL', slideIndex: 0 }; // Start 0 (Clock)
let slideTimer = null;
let els = {};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Ready. Initializing...");
    
    // 1. Get Elements
    els = {
        clock: document.getElementById('clock-main'),
        date: document.getElementById('date-main'),
        masjidName: document.getElementById('masjid-name'),
        address: document.getElementById('masjid-address'),
        runningText: document.getElementById('running-text'),
        progressBar: document.getElementById('slide-progress'),
        scenes: {
            clock: document.getElementById('scene-clock'),
            schedule: document.getElementById('scene-schedule'),
            content: document.getElementById('scene-content'),
            countdown: document.getElementById('scene-countdown'),
            prayer: document.getElementById('scene-prayer')
        },
        prayerGrid: document.getElementById('prayer-grid'),
        contentTitle: document.getElementById('content-title'),
        contentText: document.getElementById('content-text'),
        contentSource: document.getElementById('content-source'),
        countdownTitle: document.getElementById('countdown-title'),
        countdownName: document.getElementById('countdown-name'),
        countdownTimer: document.getElementById('countdown-timer')
    };

    // 2. Set Text
    if(els.masjidName) els.masjidName.textContent = CONFIG.masjidName;
    if(els.address) els.address.textContent = CONFIG.address;
    if(els.runningText) els.runningText.textContent = CONFIG.runningText;

    // 3. Render Grid
    renderScheduleGrid();

    // 4. Start Logic
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(checkSystemState, 1000);

    // 5. Start Slide Rotation
    console.log("Starting Slide Rotation...");
    animateProgressBar(CONFIG.duration.clock);
    slideTimer = setTimeout(() => {
        nextSlide();
    }, CONFIG.duration.clock * 1000);
});

// --- CORE FUNCTIONS ---

function updateClock() {
    const now = new Date();
    if(els.clock) els.clock.textContent = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
    if(els.date) els.date.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function checkSystemState() {
    const now = new Date();
    const curTime = now.getTime();
    let foundEvent = false;

    for (let [name, time] of Object.entries(CONFIG.prayerTimes)) {
        const [h, m] = time.split(':').map(Number);
        const pDate = new Date(now); 
        pDate.setHours(h, m, 0, 0);
        const pTime = pDate.getTime();

        const msPreAdzan = CONFIG.thresholds.preAdzan * 60000;
        const msPreIqamah = CONFIG.thresholds.preIqamah * 60000;
        const msInPrayer = CONFIG.thresholds.inPrayer * 60000;

        if (curTime >= (pTime - msPreAdzan) && curTime < pTime) {
            setMode('COUNTDOWN', { title: 'MENUJU ADZAN', name: name.toUpperCase(), target: pTime });
            foundEvent = true; break;
        }
        else if (curTime >= pTime && curTime < (pTime + msPreIqamah)) {
            setMode('COUNTDOWN', { title: 'MENUJU IQAMAH', name: name.toUpperCase(), target: pTime + msPreIqamah });
            foundEvent = true; break;
        }
        else if (curTime >= (pTime + msPreIqamah) && curTime < (pTime + msPreIqamah + msInPrayer)) {
            setMode('PRAYER');
            foundEvent = true; break;
        }
    }

    if (!foundEvent && currentState.mode !== 'NORMAL') {
        setMode('NORMAL');
    }

    // Update Countdown Timer Text
    if (currentState.mode === 'COUNTDOWN' && currentState.target && els.countdownTimer) {
        const diff = currentState.target - curTime;
        if (diff > 0) {
            const min = Math.floor(diff / 60000).toString().padStart(2,'0');
            const sec = Math.floor((diff % 60000) / 1000).toString().padStart(2,'0');
            els.countdownTimer.textContent = `${min}:${sec}`;
        } else {
            els.countdownTimer.textContent = "00:00";
        }
    }
}

function setMode(mode, data = {}) {
    if (currentState.mode === mode && mode !== 'COUNTDOWN') return;
    
    console.log(`Change Mode to: ${mode}`);
    currentState.mode = mode;
    clearTimeout(slideTimer);
    if(els.progressBar) els.progressBar.style.width = '0%';

    if (mode === 'NORMAL') {
        currentState.slideIndex = 0; // Reset ke Clock
        showScene('clock');
        startNormalRotation(CONFIG.duration.clock);
    } 
    else if (mode === 'COUNTDOWN') {
        currentState.target = data.target;
        if(els.countdownTitle) els.countdownTitle.textContent = data.title;
        if(els.countdownName) els.countdownName.textContent = data.name;
        showScene('countdown');
    } 
    else if (mode === 'PRAYER') {
        showScene('prayer');
    }
}

const SLIDES_ORDER = ['clock', 'schedule', 'content'];

function startNormalRotation(duration) {
    animateProgressBar(duration);
    slideTimer = setTimeout(() => {
        nextSlide();
    }, duration * 1000);
}

function nextSlide() {
    if (currentState.mode !== 'NORMAL') return;

    currentState.slideIndex = (currentState.slideIndex + 1) % SLIDES_ORDER.length;
    const key = SLIDES_ORDER[currentState.slideIndex];
    let duration = 10;

    console.log(`Showing slide: ${key}`);

    if (key === 'clock') duration = CONFIG.duration.clock;
    else if (key === 'schedule') duration = CONFIG.duration.schedule;
    else if (key === 'content') {
        duration = CONFIG.duration.ayat;
        const content = CONTENTS[Math.floor(Math.random() * CONTENTS.length)];
        if(els.contentTitle) els.contentTitle.textContent = content.title;
        if(els.contentText) els.contentText.textContent = `"${content.text}"`;
        if(els.contentSource) els.contentSource.textContent = content.source;
    }

    showScene(key);
    startNormalRotation(duration);
}

function showScene(key) {
    // Hide all
    Object.values(els.scenes).forEach(el => {
        if(el) el.classList.add('hidden-slide');
    });
    
    // Show one
    const el = els.scenes[key];
    if (el) {
        el.classList.remove('hidden-slide');
        // Re-trigger animation
        el.classList.remove('animate-enter-up');
        void el.offsetWidth; 
        el.classList.add('animate-enter-up');
    }
}

function renderScheduleGrid() {
    if(!els.prayerGrid) return;
    els.prayerGrid.innerHTML = '';
    Object.entries(CONFIG.prayerTimes).forEach(([name, time]) => {
        const div = document.createElement('div');
        div.className = "flex flex-col items-center justify-center p-6 rounded-2xl glass-panel border border-white/5";
        div.innerHTML = `
            <span class="text-xl font-bold uppercase tracking-widest mb-1 text-gray-400">${name}</span>
            <span class="text-5xl font-display font-bold text-white">${time}</span>
        `;
        els.prayerGrid.appendChild(div);
    });
}

function animateProgressBar(durationSeconds) {
    const bar = els.progressBar;
    if(!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth; // Force Reflow
    bar.style.transition = `width ${durationSeconds}s linear`;
    bar.style.width = '100%';
}
