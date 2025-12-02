// --- CONFIGURATION ---
const CONFIG = {
    // ID KOTA YOGYAKARTA
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', 
    
    masjidName: "MASJID JAMI' MU'ALLIMIN",
    address: "Jl. Letjend. S. Parman No. 68 Wirobrajan, Yogyakarta",
    runningText: "Selamat Datang di Masjid Jami' Mu'allimin • Mohon luruskan shaf • Matikan HP saat sholat berlangsung",
    
    duration: { home: 15, nextDetail: 10, scheduleFull: 10, ayat: 15, hadits: 15, info: 10, donation: 10 },
    thresholds: { preAdzan: 12, preIqamah: 10, inPrayer: 20, dzikir: 10, jumatPrep: 30 },
    
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

    prayerTimes: {},
    currentHijriDate: "" 
};

const DATA_CONTENT = {
    ayat: [
        { text: "Maka sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 5" },
        { text: "Dan dirikanlah shalat, tunaikanlah zakat.", source: "QS. Al-Baqarah: 43" }
    ],
    // Hadits default (jika API gagal)
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
    date.setMinutes(date.getMinutes() - 210);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getFormattedDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- DATA FETCHING FUNCTIONS ---

// 1. Fetch Hadis Random (DIPERBAIKI)
async function fetchRandomHadith() {
    try {
        console.log("[API] Mengambil Hadis Random...");
        const res = await fetch("https://api.myquran.com/v3/hadis/enc/random");
        const json = await res.json();
        
        console.log("[DEBUG] JSON Hadis:", json); // Cek console untuk memastikan

        if (json.status && json.data) {
            // PERBAIKAN: Akses json.data.text.id dan json.data.takhrij
            const textContent = json.data.text ? json.data.text.id : json.data.id;
            const sourceContent = json.data.takhrij || `HR. ${json.data.perawi || 'Unknown'}`;

            const newHadith = {
                text: textContent, 
                source: sourceContent
            };
            
            // Masukkan ke index 0
            DATA_CONTENT.hadits.unshift(newHadith);
            console.log("[API] Hadis berhasil ditambahkan:", newHadith.source);
        }
    } catch (e) {
        console.warn("[API] Gagal ambil hadis. Menggunakan data statis.", e);
    }
}

// 2. Fetch Tanggal Hijriah (DIPERBAIKI)
async function fetchHijriDate(dateString) {
    try {
        const url = `https://api.myquran.com/v3/cal/hijr/${dateString}`;
        console.log("[API] Mengambil Hijriah:", url);
        
        const res = await fetch(url);
        const json = await res.json();
        
        console.log("[DEBUG] JSON Hijriah:", json);

        if (json.status && json.data && json.data.date) {
            const d = json.data.date;
            
            // Cek struktur (kadang API berubah format object/string)
            // Biasanya: { day: "14", month: { en: "Ramadan" }, year: "1446" }
            const day = d.day || "";
            const month = (d.month && d.month.en) ? d.month.en : (d.month || "");
            const year = d.year || "";

            CONFIG.currentHijriDate = `${day} ${month} ${year} H`;
            console.log("[API] Tanggal Hijriah set:", CONFIG.currentHijriDate);
            
            // Force update tampilan
            updateClock();
        }
    } catch (e) {
        console.warn("[API] Gagal ambil Hijriah.", e);
        CONFIG.currentHijriDate = ""; 
    }
}

// 3. Main Schedule Loader
async function loadSchedule() {
    const now = new Date();
    const dateKey = getFormattedDate(now); 
    
    // Key Cache Bulanan (YYYY-MM)
    const [y, m, d] = dateKey.split('-'); 
    const monthKey = `jadwal_bulan_${y}_${m}`; 

    console.log(`[SYSTEM] Load data: ${dateKey}`);

    let monthlyData = localStorage.getItem(monthKey);
    let todaySchedule = null;

    if (monthlyData) {
        try {
            const parsedData = JSON.parse(monthlyData);
            if (parsedData[dateKey]) {
                console.log("[CACHE] Jadwal sholat (Offline).");
                todaySchedule = parsedData[dateKey];
            }
        } catch (e) {
            localStorage.removeItem(monthKey);
        }
    }

    if (!todaySchedule) {
        console.log("[NETWORK] Download Jadwal Bulanan...");
        try {
            // URL Bulanan (Format Strip YYYY-MM)
            const url = `https://api.myquran.com/v3/sholat/jadwal/${CONFIG.cityId}/${y}/${m}`; 
            
            const res = await fetch(url);
            const json = await res.json();
            
            if (json.status && json.data && json.data.jadwal) {
                let storagePayload = {};
                
                if (Array.isArray(json.data.jadwal)) {
                    json.data.jadwal.forEach(day => {
                        storagePayload[day.date] = day; 
                    });
                } else {
                    storagePayload = json.data.jadwal;
                }

                localStorage.setItem(monthKey, JSON.stringify(storagePayload));
                todaySchedule = storagePayload[dateKey];
            }
        } catch (e) {
            console.error("[NETWORK ERROR] Gagal ambil jadwal sholat:", e);
        }
    }

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
        renderHomePrayerList();
        renderFullScheduleGrid();
    } else {
        CONFIG.prayerTimes = { ...CONFIG.defaultPrayerTimes };
        renderHomePrayerList();
        renderFullScheduleGrid();
    }

    // Load Extra Data
    await fetchHijriDate(dateKey); 
    await fetchRandomHadith();
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
    const currentDateString = getFormattedDate(now);
    if (lastDateString !== "" && lastDateString !== currentDateString) {
        console.log("Hari berganti, refresh data...");
        loadSchedule(); 
    }
    lastDateString = currentDateString;

    // Jam
    if(els.homeClock) {
        els.homeClock.textContent = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
    }
    
    // Tanggal (Masehi + Hijriah)
    if(els.homeDate) {
        const masehi = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        // GABUNGKAN DATA DISINI
        if (CONFIG.currentHijriDate) {
            els.homeDate.textContent = `${masehi} / ${CONFIG.currentHijriDate}`;
        } else {
            els.homeDate.textContent = masehi;
        }
    }
    
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
        // Ambil dari DATA_CONTENT (yang sudah diisi API)
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
