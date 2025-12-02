// --- DATA & KONFIGURASI ---
const CONFIG = {
    masjidName: "MASJID RAYA AL-FALAH",
    address: "Jl. Merdeka No. 123, Kota Pusat",
    runningText: "Selamat Datang di Masjid Raya Al-Falah • Mohon luruskan shaf • Matikan HP",
    duration: { clock: 10, schedule: 10, ayat: 15, info: 10 },
    thresholds: { preAdzan: 10, preIqamah: 10, inPrayer: 15, jumat: 30 },
    prayerTimes: {
        shubuh: "04:20", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    }
};

const CONTENTS = [
    { type: 'ayat', title: 'Ayat Hari Ini', text: 'Maka sesungguhnya bersama kesulitan ada kemudahan.', source: 'QS. Al-Insyirah: 5' },
    { type: 'info', title: 'Info Kajian', text: 'Kajian Rutin Ahad Pagi bersama Ust. Fulan', source: '06:00 WIB' }
];

// --- STATE MANAGEMENT ---
let currentState = { mode: 'NORMAL', slideIndex: 0 };
let slideTimer = null;
let progressInterval = null;

// --- DOM ELEMENTS CONTAINER ---
// Kita isi nanti di dalam init() agar aman
let els = {};

// --- INITIALIZATION ---
// Jalankan script HANYA setelah halaman selesai loading
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("Memulai Smart Masjid...");
        init();
    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        alert("Terjadi Error pada Script: " + error.message);
    }
});

function init() {
    // 1. Ambil Elemen HTML
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

    // 2. Cek apakah ada elemen yang hilang (Debugging)
    for (const [key, element] of Object.entries(els)) {
        if (!element && key !== 'scenes') {
            console.warn(`Elemen ID tidak ditemukan: ${key}`);
        }
    }

    // 3. Set Teks Statis (Jika elemen ada)
    if (els.masjidName) els.masjidName.textContent = CONFIG.masjidName;
    if (els.address) els.address.textContent = CONFIG.address;
    if (els.runningText) els.runningText.textContent = CONFIG.runningText;
    
    // 4. Build Grid Jadwal
    renderScheduleGrid();

    // 5. Start Loops
    updateClock(); // Jalan sekali di awal biar gak nunggu 1 detik
    setInterval(updateClock, 1000);
    setInterval(checkSystemState, 1000); 
    
    // 6. Jalankan Slide Pertama
    // PERBAIKAN: Menggunakan setMode, bukan switchSlide
    console.log("Memulai mode NORMAL...");
    setMode('NORMAL');
}

// --- CORE LOGIC ---

function updateClock() {
    if (!els.clock || !els.date) return;
    
    const now = new Date();
    els.clock.textContent = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
    els.date.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

        // 1. Menuju Adzan
        if (curTime >= (pTime - msPreAdzan) && curTime < pTime) {
            setMode('COUNTDOWN', { title: 'MENUJU ADZAN', name: name.toUpperCase(), target: pTime });
            foundEvent = true; break;
        }
        // 2. Menuju Iqamah
        else if (curTime >= pTime && curTime < (pTime + msPreIqamah)) {
            setMode('COUNTDOWN', { title: 'MENUJU IQAMAH', name: name.toUpperCase(), target: pTime + msPreIqamah });
            foundEvent = true; break;
        }
        // 3. Sholat Berlangsung
        else if (curTime >= (pTime + msPreIqamah) && curTime < (pTime + msPreIqamah + msInPrayer)) {
            setMode('PRAYER');
            foundEvent = true; break;
        }
    }

    if (!foundEvent && currentState.mode !== 'NORMAL') {
        setMode('NORMAL');
    }

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
    
    if (currentState.mode !== mode) {
        currentState.mode = mode;
        if(slideTimer) clearTimeout(slideTimer);
        if(progressInterval) clearInterval(progressInterval);
        if(els.progressBar) els.progressBar.style.width = '0%';
    }

    hideAllScenes();

    if (mode === 'NORMAL') {
        currentState.slideIndex = 0;
        rotateNormalSlides();
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

// --- SLIDE ROTATION (NORMAL MODE) ---
const SLIDES_ORDER = ['clock', 'schedule', 'content'];

function rotateNormalSlides() {
    if (currentState.mode !== 'NORMAL') return;

    const currentSlideKey = SLIDES_ORDER[currentState.slideIndex];
    let duration = 10;

    if (currentSlideKey === 'clock') {
        duration = CONFIG.duration.clock;
        showScene('clock');
    } 
    else if (currentSlideKey === 'schedule') {
        duration = CONFIG.duration.schedule;
        showScene('schedule');
    }
    else if (currentSlideKey === 'content') {
        const content = CONTENTS[Math.floor(Math.random() * CONTENTS.length)];
        duration = CONFIG.duration.ayat;
        
        if (els.contentTitle) {
            els.contentTitle.textContent = content.title;
            els.contentTitle.className = content.type === 'ayat' 
                ? 'text-2xl font-bold uppercase tracking-[0.3em] text-gold-400 mb-8' 
                : 'text-2xl font-bold uppercase tracking-[0.3em] text-cyan-400 mb-8';
        }
        if (els.contentText) els.contentText.textContent = `"${content.text}"`;
        if (els.contentSource) els.contentSource.textContent = content.source;
        
        showScene('content');
    }

    animateProgressBar(duration);

    slideTimer = setTimeout(() => {
        currentState.slideIndex = (currentState.slideIndex + 1) % SLIDES_ORDER.length;
        rotateNormalSlides();
    }, duration * 1000);
}

// --- HELPER FUNCTIONS ---

function hideAllScenes() {
    if (!els.scenes) return;
    Object.values(els.scenes).forEach(el => {
        if (el) el.classList.add('hidden-slide');
    });
}

function showScene(key) {
    hideAllScenes();
    const el = els.scenes ? els.scenes[key] : null;
    if (el) {
        el.classList.remove('hidden-slide');
        el.classList.remove('animate-enter-up');
        void el.offsetWidth; // Trigger reflow
        el.classList.add('animate-enter-up');
    } else {
        console.warn(`Scene tidak ditemukan: ${key}`);
    }
}

function renderScheduleGrid() {
    if (!els.prayerGrid) return;
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
    if (!bar) return;
    
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.style.transition = `width ${durationSeconds}s linear`;
    bar.style.width = '100%';
}
