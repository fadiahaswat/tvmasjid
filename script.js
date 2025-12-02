// --- CONFIGURATION ---
const CONFIG = {
    // ID Kota (1638 = Yogyakarta). Cari ID kota lain di: https://api.myquran.com/v2/sholat/kota/cari/{nama_kota}
    cityId: '1638', 
    
    masjidName: "MASJID JAMI' MU'ALLIMIN",
    address: "Jl. Letjend. S. Parman No. 68 Wirobrajan, Yogyakarta",
    runningText: "Selamat Datang di Masjid Jami' Mu'allimin • Mohon luruskan shaf • Matikan HP saat sholat berlangsung",
    
    // Durasi tiap slide (detik)
    duration: { 
        home: 15, nextDetail: 10, scheduleFull: 10, ayat: 15, 
        hadits: 15, info: 10, donation: 10 
    },
    
    // Waktu tunggu (menit)
    thresholds: { 
        preAdzan: 12, preIqamah: 10, inPrayer: 20, 
        dzikir: 10, jumatPrep: 30 
    },
    
    // Jadwal Default (Fallback jika API Gagal)
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

    // Container untuk menampung jadwal aktif (akan diisi oleh API)
    prayerTimes: {} 
};

const DATA_CONTENT = {
    ayat: [
        { text: "Maka sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 5" },
        { text: "Dan dirikanlah shalat, tunaikanlah zakat.", source: "QS. Al-Baqarah: 43" }
    ],
    hadits: [
        { text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain.", source: "HR. Ahmad" },
        { text: "Shalat berjamaah lebih utama 27 derajat.", source: "HR. Bukhari Muslim" }
    ],
    info: [
        { title: "Kerja Bakti", text: "Kerja bakti hari Ahad depan pukul 08:00 WIB." },
        { title: "Laporan Kas", text: "Saldo kas masjid saat ini Rp 15.000.000." }
    ]
};

// --- STATE MANAGEMENT ---
let currentState = { mode: null, slideIndex: 0, subMode: null };
let slideTimer = null;
let els = {};
let lastDateString = ""; // Untuk cek pergantian hari

// --- API & LOGIC HELPERS ---

// Hitung Tahajjud (Subuh - 3 jam 30 menit)
function calculateTahajjud(shubuhTime) {
    if (!shubuhTime) return "03:00";
    const [h, m] = shubuhTime.split(':').map(Number);
    let date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() - 210); // Kurangi 210 menit
    
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

// Fetch Data API
async function fetchSchedule() {
    console.log("Mengambil data jadwal sholat...");
    try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const d = now.getDate();

        // API Request
        const res = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${CONFIG.cityId}/${y}/${m}/${d}`);
        const json = await res.json();

        if (json.status && json.data && json.data.jadwal) {
            const data = json.data.jadwal;
            
            // Mapping Data API ke Config
            CONFIG.prayerTimes = {
                tahajjud: calculateTahajjud(data.subuh),
                imsak: data.imsak,
                shubuh: data.subuh,
                syuruq: data.terbit,
                dhuha: data.dhuha,
                dzuhur: data.dzuhur,
                ashar: data.ashar,
                maghrib: data.maghrib,
                isya: data.isya
            };
            console.log("Jadwal Updated:", CONFIG.prayerTimes);
        } else {
            throw new Error("Data API tidak valid");
        }
    } catch (e) {
        console.error("Gagal ambil jadwal, gunakan default.", e);
        CONFIG.prayerTimes = { ...CONFIG.defaultPrayerTimes };
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Memulai Sistem...");
        
        // 1. Ambil Elemen DOM
        els = {
            masjidName: document.getElementById('masjid-name'),
            address: document.getElementById('masjid-address'),
            runningText: document.getElementById('running-text'),
            progressBar: document.getElementById('slide-progress'),
            
            homeClock: document.getElementById('home-clock'),
            homeDate: document.getElementById('home-date'),
            homeNextName: document.getElementById('home-next-name'),
            homeNextTime: document.getElementById('home-next-time'),
            homePrayerList: document.getElementById('home-prayer-list'),
            
            nextDetailName: document.getElementById('next-detail-name'),
            nextDetailTime: document.getElementById('next-detail-time'),
            scheduleGridFull: document.getElementById('schedule-grid-full'),
            
            ayatText: document.getElementById('ayat-text'),
            ayatSource: document.getElementById('ayat-source'),
            haditsText: document.getElementById('hadits-text'),
            haditsSource: document.getElementById('hadits-source'),
            infoTitle: document.getElementById('info-title'),
            infoText: document.getElementById('info-text'),
            
            countdownTitle: document.getElementById('countdown-title'),
            countdownName: document.getElementById('countdown-name'),
            countdownTimer: document.getElementById('countdown-timer'),
            countdownBg: document.getElementById('countdown-bg'),
            
            scenes: {
                home: document.getElementById('scene-home'),
                nextDetail: document.getElementById('scene-next-detail'),
                scheduleFull: document.getElementById('scene-schedule-full'),
                ayat: document.getElementById('scene-ayat'),
                hadits: document.getElementById('scene-hadits'),
                info: document.getElementById('scene-info'),
                donation: document.getElementById('scene-donation'),
                countdown: document.getElementById('scene-countdown'),
                // Scene khusus di bawah ini opsional jika belum ada di HTML
                prayer: document.getElementById('scene-prayer'),
                dzikir: document.getElementById('scene-dzikir')
            }
        };

        // 2. Set Info Dasar Static
        if(els.masjidName) els.masjidName.textContent = CONFIG.masjidName;
        if(els.address) els.address.textContent = CONFIG.address;
        if(els.runningText) els.runningText.textContent = CONFIG.runningText;

        // 3. Ambil Jadwal Sholat (Async)
        await fetchSchedule();

        // 4. Render UI Jadwal
        renderHomePrayerList();
        renderFullScheduleGrid();

        // 5. Start Loops
        updateClock(); // Jalankan sekali agar tidak delay 1 detik
        setInterval(updateClock, 1000);
        setInterval(checkSystemState, 1000);

        // 6. Start Slide
        console.log("Menjalankan Slide Pertama...");
        setMode('NORMAL');

    } catch(e) {
        console.error("Init Error:", e);
    }
});

// --- CORE LOGIC ---

function updateClock() {
    const now = new Date();
    
    // Logic Auto-Refresh saat ganti hari
    const currentDateString = now.toDateString();
    if (lastDateString !== "" && lastDateString !== currentDateString) {
        console.log("Hari berganti, refresh jadwal...");
        fetchSchedule().then(() => {
            renderHomePrayerList();
            renderFullScheduleGrid();
        });
    }
    lastDateString = currentDateString;

    // Update UI Jam & Tanggal
    if(els.homeClock) els.homeClock.textContent = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
    if(els.homeDate) els.homeDate.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    // Update Next Prayer Info
    const next = getNextPrayer(now);
    if(next) {
        if(els.homeNextName) els.homeNextName.textContent = next.name;
        if(els.homeNextTime) els.homeNextTime.textContent = next.timeStr;
        if(els.nextDetailName) els.nextDetailName.textContent = next.name;
        if(els.nextDetailTime) els.nextDetailTime.textContent = next.timeStr;
    }
}

function getNextPrayer(now) {
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    // Urutan pengecekan waktu
    const keys = ['shubuh', 'syuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    
    let found = null;
    let minDiff = 9999;
    
    keys.forEach(key => {
        if(CONFIG.prayerTimes[key]) {
            const [h, m] = CONFIG.prayerTimes[key].split(':').map(Number);
            const pMinutes = h * 60 + m;
            
            if (pMinutes > curMinutes && (pMinutes - curMinutes) < minDiff) {
                minDiff = pMinutes - curMinutes;
                found = { name: key.toUpperCase(), timeStr: CONFIG.prayerTimes[key] };
            }
        }
    });

    if (!found && CONFIG.prayerTimes.shubuh) {
        // Jika lewat Isya, tampilkan Shubuh (besok)
        found = { name: 'SHUBUH', timeStr: CONFIG.prayerTimes.shubuh };
    }
    return found;
}

function checkSystemState() {
    const now = new Date();
    const curTime = now.getTime();
    let activeEvent = null;

    // Cek 5 Waktu Wajib Saja untuk trigger Adzan/Iqamah
    const wajib = ['shubuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    
    for (let name of wajib) {
        if(!CONFIG.prayerTimes[name]) continue;
        
        const [h, m] = CONFIG.prayerTimes[name].split(':').map(Number);
        const pDate = new Date(now);
        pDate.setHours(h, m, 0, 0);
        const pTime = pDate.getTime();
        
        const msPreAdzan = CONFIG.thresholds.preAdzan * 60000;
        const msPreIqamah = CONFIG.thresholds.preIqamah * 60000;
        const msInPrayer = CONFIG.thresholds.inPrayer * 60000;
        const msDzikir = CONFIG.thresholds.dzikir * 60000;

        // Logika Status
        if (curTime >= (pTime - msPreAdzan) && curTime < pTime) {
            activeEvent = { mode: 'COUNTDOWN', sub: 'ADZAN', name, target: pTime };
        } else if (curTime >= pTime && curTime < (pTime + msPreIqamah)) {
            activeEvent = { mode: 'COUNTDOWN', sub: 'IQAMAH', name, target: pTime + msPreIqamah };
        } else if (curTime >= (pTime + msPreIqamah) && curTime < (pTime + msPreIqamah + msInPrayer)) {
            activeEvent = { mode: 'PRAYER' };
        } else if ((name === 'shubuh' || name === 'ashar') && 
                   curTime >= (pTime + msPreIqamah + msInPrayer) && 
                   curTime < (pTime + msPreIqamah + msInPrayer + msDzikir)) {
            activeEvent = { mode: 'DZIKIR' };
        }
        
        if (activeEvent) break;
    }

    if (activeEvent) {
        setMode(activeEvent.mode, activeEvent);
        // Update Countdown Realtime
        if (activeEvent.mode === 'COUNTDOWN' && els.countdownTimer) {
            const diff = activeEvent.target - curTime;
            const m = Math.floor(diff > 0 ? diff / 60000 : 0).toString().padStart(2,'0');
            const s = Math.floor(diff > 0 ? (diff % 60000) / 1000 : 0).toString().padStart(2,'0');
            els.countdownTimer.textContent = `${m}:${s}`;
        }
    } else {
        setMode('NORMAL');
    }
}

function setMode(mode, data = {}) {
    // Hindari re-render jika mode sama
    if (currentState.mode === mode) {
        if (mode !== 'COUNTDOWN') return;
        if (mode === 'COUNTDOWN' && currentState.subMode === data.sub) return;
    }

    currentState.mode = mode;
    currentState.subMode = data.sub || null;

    clearTimeout(slideTimer);
    if(els.progressBar) els.progressBar.style.width = '0%';

    // Sembunyikan Semua Scene
    Object.values(els.scenes).forEach(el => { if(el) el.classList.add('hidden-slide'); });

    // Tampilkan Scene Aktif
    if (mode === 'NORMAL') {
        currentState.slideIndex = 0;
        nextNormalSlide();
    } else {
        // Mode Khusus (Countdown/Prayer/dll)
        let sceneKey = mode.toLowerCase();
        
        // Handle Tampilan Countdown
        if(mode === 'COUNTDOWN') {
            sceneKey = 'countdown';
            if(els.countdownTitle) els.countdownTitle.textContent = data.sub === 'ADZAN' ? 'MENUJU ADZAN' : 'MENUJU IQAMAH';
            if(els.countdownName) els.countdownName.textContent = data.name.toUpperCase();
            
            // Ubah Warna Tema Countdown
            if(data.sub === 'ADZAN') {
                els.countdownTitle.className = "text-5xl font-bold uppercase tracking-widest mb-6 text-gold-400 animate-pulse";
                els.countdownTimer.className = "text-[18vh] font-mono font-bold leading-none tracking-widest text-gold-400";
                if(els.countdownBg) els.countdownBg.className = "absolute inset-0 z-0 bg-gradient-to-br from-gold-900/50 to-black transition-all duration-1000";
            } else {
                els.countdownTitle.className = "text-5xl font-bold uppercase tracking-widest mb-6 text-emerald-400 animate-pulse";
                els.countdownTimer.className = "text-[18vh] font-mono font-bold leading-none tracking-widest text-emerald-400";
                if(els.countdownBg) els.countdownBg.className = "absolute inset-0 z-0 bg-gradient-to-br from-emerald-900/50 to-black transition-all duration-1000";
            }
        }
        
        if(els.scenes[sceneKey]) els.scenes[sceneKey].classList.remove('hidden-slide');
    }
}

const SLIDES_ORDER = ['home', 'nextDetail', 'scheduleFull', 'ayat', 'hadits', 'info', 'donation'];

function nextNormalSlide() {
    if (currentState.mode !== 'NORMAL') return;

    const key = SLIDES_ORDER[currentState.slideIndex];
    let duration = CONFIG.duration[key] || 10;

    // Isi Konten Dinamis untuk Slide Tertentu
    if (key === 'ayat' && els.ayatText) {
        const item = DATA_CONTENT.ayat[Math.floor(Math.random() * DATA_CONTENT.ayat.length)];
        els.ayatText.textContent = `"${item.text}"`;
        els.ayatSource.textContent = item.source;
    } 
    else if (key === 'hadits' && els.haditsText) {
        const item = DATA_CONTENT.hadits[Math.floor(Math.random() * DATA_CONTENT.hadits.length)];
        els.haditsText.textContent = `"${item.text}"`;
        els.haditsSource.textContent = item.source;
    }
    else if (key === 'info' && els.infoTitle) {
        const item = DATA_CONTENT.info[Math.floor(Math.random() * DATA_CONTENT.info.length)];
        els.infoTitle.textContent = item.title;
        els.infoText.textContent = item.text;
    }

    // Tampilkan Scene
    Object.values(els.scenes).forEach(el => { if(el) el.classList.add('hidden-slide'); });
    
    if(els.scenes[key]) {
        const scene = els.scenes[key];
        scene.classList.remove('hidden-slide');
        // Restart Animation Effect
        scene.classList.remove('animate-enter-up');
        void scene.offsetWidth; 
        scene.classList.add('animate-enter-up');
    }

    animateProgressBar(duration);

    slideTimer = setTimeout(() => {
        currentState.slideIndex = (currentState.slideIndex + 1) % SLIDES_ORDER.length;
        nextNormalSlide();
    }, duration * 1000);
}

// Render Jadwal di Halaman Utama (5 Waktu)
function renderHomePrayerList() {
    if (!els.homePrayerList) return;
    const keys = ['shubuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    els.homePrayerList.innerHTML = '';
    
    keys.forEach(key => {
        const div = document.createElement('div');
        div.className = "flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5";
        div.innerHTML = `
            <span class="text-xs text-gray-400 uppercase mb-1">${key}</span>
            <span class="text-xl font-bold text-white">${CONFIG.prayerTimes[key] || '--:--'}</span>
        `;
        els.homePrayerList.appendChild(div);
    });
}

// Render Jadwal Lengkap (Termasuk Tahajjud, Imsak, dll)
function renderFullScheduleGrid() {
    if (!els.scheduleGridFull) return;
    els.scheduleGridFull.innerHTML = '';
    
    // Urutan tampilan di grid
    const order = ['tahajjud', 'imsak', 'shubuh', 'syuruq', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    
    order.forEach(name => {
        const time = CONFIG.prayerTimes[name] || '--:--';
        const isWajib = ['shubuh','dzuhur','ashar','maghrib','isya'].includes(name);
        
        const bgClass = isWajib ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-white/5 border-white/5';
        const textClass = isWajib ? 'text-emerald-400' : 'text-gray-400';
        
        const div = document.createElement('div');
        div.className = `flex flex-col items-center justify-center p-6 rounded-2xl border ${bgClass}`;
        div.innerHTML = `
            <span class="text-lg font-bold uppercase tracking-widest mb-2 ${textClass}">${name}</span>
            <span class="text-5xl font-display font-bold text-white">${time}</span>
        `;
        els.scheduleGridFull.appendChild(div);
    });
}

function animateProgressBar(durationSeconds) {
    const bar = els.progressBar;
    if(!bar) return;
    
    // Reset instan
    bar.style.transition = 'none';
    bar.style.width = '0%';
    
    // Force Reflow
    void bar.offsetWidth;
    
    // Start Animation
    requestAnimationFrame(() => {
        bar.style.transition = `width ${durationSeconds}s linear`;
        bar.style.width = '100%';
    });
}
