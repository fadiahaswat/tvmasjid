// --- CONFIGURATION ---
const CONFIG = {
    // ID KOTA YOGYAKARTA (UUID v3)
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', 
    
    masjidName: "MASJID JAMI' MU'ALLIMIN",
    address: "Jl. Letjend. S. Parman No. 68 Wirobrajan, Yogyakarta",
    runningText: "Selamat Datang di Masjid Jami' Mu'allimin • Mohon luruskan shaf • Matikan HP saat sholat berlangsung",
    
    duration: { home: 15, nextDetail: 10, scheduleFull: 10, ayat: 15, hadits: 15, info: 10, donation: 10 },
    thresholds: { preAdzan: 12, preIqamah: 10, inPrayer: 20, dzikir: 10, jumatPrep: 30 },
    
    // Fallback Default
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

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
let lastDateString = ""; 

// --- HELPER FUNCTIONS ---

function calculateTahajjud(shubuhTime) {
    if (!shubuhTime) return "03:00";
    const [h, m] = shubuhTime.split(':').map(Number);
    let date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() - 210); // -3.5 Jam
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// --- LOGIKA "OFFLINE FIRST" (Monthly Cache) ---

async function loadSchedule() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`; // Key Hari Ini (YYYY-MM-DD)
    const monthKey = `jadwal_bulan_${y}_${m}`; // Key Cache Bulanan di LocalStorage

    console.log(`[SYSTEM] Memeriksa jadwal untuk: ${dateKey}`);

    // 1. CEK LOCAL STORAGE (Apakah data bulan ini sudah ada?)
    let monthlyData = localStorage.getItem(monthKey);
    let todaySchedule = null;

    if (monthlyData) {
        try {
            const parsedData = JSON.parse(monthlyData);
            if (parsedData[dateKey]) {
                console.log("[CACHE] Data ditemukan di LocalStorage (Offline Mode).");
                todaySchedule = parsedData[dateKey];
            }
        } catch (e) {
            console.error("[CACHE] Data corrupt, akan download ulang.");
            localStorage.removeItem(monthKey);
        }
    }

    // 2. JIKA TIDAK ADA DI STORAGE, FETCH API (1 BULAN)
    if (!todaySchedule) {
        console.log("[NETWORK] Data tidak ada/expired. Mengunduh data 1 BULAN dari API...");
        try {
            // URL Fetch Bulanan: .../jadwal/{id}/{tahun}/{bulan}
            const url = `https://api.myquran.com/v3/sholat/jadwal/${CONFIG.cityId}/${y}-${m}`;
            console.log("Request URL:", url);

            const res = await fetch(url);
            if (!res.ok) throw new Error("Gagal koneksi ke API");

            const json = await res.json();
            
            if (json.status && json.data && json.data.jadwal) {
                // Simpan data sebulan penuh ke LocalStorage
                // API v3 bulanan biasanya mereturn array atau object full. 
                // Kita simpan mentahannya atau diparsing dulu.
                // Jika respon v3 bulanan berbentuk array, kita convert ke object key-date.
                
                let storagePayload = {};
                
                // Normalisasi Data (Jaga-jaga jika API return Array vs Object)
                if (Array.isArray(json.data.jadwal)) {
                    json.data.jadwal.forEach(day => {
                        storagePayload[day.date] = day; // Pastikan API punya field 'date' atau 'tanggal' iso
                    });
                } else {
                    // Jika bentuknya Object { "2025-12-01": {...}, ... }
                    storagePayload = json.data.jadwal;
                }

                // Simpan ke memori browser
                localStorage.setItem(monthKey, JSON.stringify(storagePayload));
                console.log("[CACHE] Data 1 bulan berhasil disimpan!");

                // Ambil data hari ini
                todaySchedule = storagePayload[dateKey];
            }

        } catch (e) {
            console.error("[NETWORK ERROR]", e);
        }
    }

    // 3. APPLY DATA KE CONFIG
    if (todaySchedule) {
        CONFIG.prayerTimes = {
            tahajjud: calculateTahajjud(todaySchedule.subuh),
            imsak: todaySchedule.imsak,
            shubuh: todaySchedule.subuh,
            syuruq: todaySchedule.terbit,
            dhuha: todaySchedule.dhuha,
            dzuhur: todaySchedule.dzuhur,
            ashar: todaySchedule.ashar,
            maghrib: todaySchedule.maghrib,
            isya: todaySchedule.isya
        };
        console.log("Jadwal Aktif:", CONFIG.prayerTimes);
        renderHomePrayerList();
        renderFullScheduleGrid();
    } else {
        console.warn("[SYSTEM] Gagal memuat data (API & Cache mati). Menggunakan Default.");
        CONFIG.prayerTimes = { ...CONFIG.defaultPrayerTimes };
        renderHomePrayerList();
        renderFullScheduleGrid();
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Memulai Sistem...");
        
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
                prayer: document.getElementById('scene-prayer'),
                dzikir: document.getElementById('scene-dzikir')
            }
        };

        if(els.masjidName) els.masjidName.textContent = CONFIG.masjidName;
        if(els.address) els.address.textContent = CONFIG.address;
        if(els.runningText) els.runningText.textContent = CONFIG.runningText;

        // LOAD DATA (Offline First Logic)
        await loadSchedule();

        updateClock(); 
        setInterval(updateClock, 1000);
        setInterval(checkSystemState, 1000);

        setMode('NORMAL');

    } catch(e) { console.error("Init Error:", e); }
});

// --- CORE LOGIC ---

function updateClock() {
    const now = new Date();
    
    // Cek Ganti Hari
    const currentDateString = now.toDateString();
    if (lastDateString !== "" && lastDateString !== currentDateString) {
        console.log("Hari berganti, muat ulang jadwal...");
        // Saat ganti hari, fungsi loadSchedule akan otomatis cek LocalStorage dulu.
        // Jika sudah ada (karena kita fetch sebulan), dia tidak butuh internet.
        // Jika masuk bulan baru (tanggal 1), LocalStorage kosong, baru dia minta internet.
        loadSchedule(); 
    }
    lastDateString = currentDateString;

    if(els.homeClock) els.homeClock.textContent = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
    if(els.homeDate) els.homeDate.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const next = getNextPrayer(now);
    if(next) {
        if(els.homeNextName) els.homeNextName.textContent = next.name;
        if(els.homeNextTime) els.homeNextTime.textContent = next.timeStr;
        if(els.nextDetailName) els.nextDetailName.textContent = next.name;
        if(els.nextDetailTime) els.nextDetailTime.textContent = next.timeStr;
    }
}

function getNextPrayer(now) {
    if (!CONFIG.prayerTimes.shubuh) return null;
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const keys = ['shubuh', 'syuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    let found = null;
    let minDiff = 9999;
    
    keys.forEach(key => {
        if(CONFIG.prayerTimes[key]) {
            const timeParts = CONFIG.prayerTimes[key].split(':');
            const h = parseInt(timeParts[0]);
            const m = parseInt(timeParts[1]);
            const pMinutes = h * 60 + m;
            
            if (pMinutes > curMinutes && (pMinutes - curMinutes) < minDiff) {
                minDiff = pMinutes - curMinutes;
                found = { name: key.toUpperCase(), timeStr: CONFIG.prayerTimes[key] };
            }
        }
    });
    if (!found) found = { name: 'SHUBUH', timeStr: CONFIG.prayerTimes.shubuh };
    return found;
}

function checkSystemState() {
    if (!CONFIG.prayerTimes.shubuh) return;
    const now = new Date();
    const curTime = now.getTime();
    let activeEvent = null;
    const wajib = ['shubuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    
    for (let name of wajib) {
        if(!CONFIG.prayerTimes[name]) continue;
        const timeParts = CONFIG.prayerTimes[name].split(':');
        const pDate = new Date(now);
        pDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
        const pTime = pDate.getTime();
        
        const msPreAdzan = CONFIG.thresholds.preAdzan * 60000;
        const msPreIqamah = CONFIG.thresholds.preIqamah * 60000;
        const msInPrayer = CONFIG.thresholds.inPrayer * 60000;
        const msDzikir = CONFIG.thresholds.dzikir * 60000;

        if (curTime >= (pTime - msPreAdzan) && curTime < pTime) {
            activeEvent = { mode: 'COUNTDOWN', sub: 'ADZAN', name, target: pTime };
        } else if (curTime >= pTime && curTime < (pTime + msPreIqamah)) {
            activeEvent = { mode: 'COUNTDOWN', sub: 'IQAMAH', name, target: pTime + msPreIqamah };
        } else if (curTime >= (pTime + msPreIqamah) && curTime < (pTime + msPreIqamah + msInPrayer)) {
            activeEvent = { mode: 'PRAYER' };
        } else if ((name === 'shubuh' || name === 'ashar') && curTime >= (pTime + msPreIqamah + msInPrayer) && curTime < (pTime + msPreIqamah + msInPrayer + msDzikir)) {
            activeEvent = { mode: 'DZIKIR' };
        }
        if (activeEvent) break;
    }

    if (activeEvent) {
        setMode(activeEvent.mode, activeEvent);
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
    if (currentState.mode === mode) {
        if (mode !== 'COUNTDOWN') return;
        if (mode === 'COUNTDOWN' && currentState.subMode === data.sub) return;
    }
    currentState.mode = mode;
    currentState.subMode = data.sub || null;
    clearTimeout(slideTimer);
    if(els.progressBar) els.progressBar.style.width = '0%';
    Object.values(els.scenes).forEach(el => { if(el) el.classList.add('hidden-slide'); });

    if (mode === 'NORMAL') {
        currentState.slideIndex = 0;
        nextNormalSlide();
    } else {
        let sceneKey = mode.toLowerCase();
        if(mode === 'COUNTDOWN') {
            sceneKey = 'countdown';
            if(els.countdownTitle) els.countdownTitle.textContent = data.sub === 'ADZAN' ? 'MENUJU ADZAN' : 'MENUJU IQAMAH';
            if(els.countdownName) els.countdownName.textContent = data.name.toUpperCase();
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

    if (key === 'ayat' && els.ayatText) {
        const item = DATA_CONTENT.ayat[Math.floor(Math.random() * DATA_CONTENT.ayat.length)];
        els.ayatText.textContent = `"${item.text}"`;
        els.ayatSource.textContent = item.source;
    } else if (key === 'hadits' && els.haditsText) {
        const item = DATA_CONTENT.hadits[Math.floor(Math.random() * DATA_CONTENT.hadits.length)];
        els.haditsText.textContent = `"${item.text}"`;
        els.haditsSource.textContent = item.source;
    } else if (key === 'info' && els.infoTitle) {
        const item = DATA_CONTENT.info[Math.floor(Math.random() * DATA_CONTENT.info.length)];
        els.infoTitle.textContent = item.title;
        els.infoText.textContent = item.text;
    }

    Object.values(els.scenes).forEach(el => { if(el) el.classList.add('hidden-slide'); });
    if(els.scenes[key]) {
        const scene = els.scenes[key];
        scene.classList.remove('hidden-slide');
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

function renderHomePrayerList() {
    if (!els.homePrayerList) return;
    const keys = ['shubuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    els.homePrayerList.innerHTML = '';
    keys.forEach(key => {
        const div = document.createElement('div');
        div.className = "flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5";
        div.innerHTML = `<span class="text-xs text-gray-400 uppercase mb-1">${key}</span><span class="text-xl font-bold text-white">${CONFIG.prayerTimes[key] || '--:--'}</span>`;
        els.homePrayerList.appendChild(div);
    });
}

function renderFullScheduleGrid() {
    if (!els.scheduleGridFull) return;
    els.scheduleGridFull.innerHTML = '';
    const order = ['tahajjud', 'imsak', 'shubuh', 'syuruq', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    order.forEach(name => {
        const time = CONFIG.prayerTimes[name] || '--:--';
        const isWajib = ['shubuh','dzuhur','ashar','maghrib','isya'].includes(name);
        const bgClass = isWajib ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-white/5 border-white/5';
        const textClass = isWajib ? 'text-emerald-400' : 'text-gray-400';
        const div = document.createElement('div');
        div.className = `flex flex-col items-center justify-center p-6 rounded-2xl border ${bgClass}`;
        div.innerHTML = `<span class="text-lg font-bold uppercase tracking-widest mb-2 ${textClass}">${name}</span><span class="text-5xl font-display font-bold text-white">${time}</span>`;
        els.scheduleGridFull.appendChild(div);
    });
}

function animateProgressBar(durationSeconds) {
    const bar = els.progressBar;
    if(!bar) return;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    requestAnimationFrame(() => {
        bar.style.transition = `width ${durationSeconds}s linear`;
        bar.style.width = '100%';
    });
}
