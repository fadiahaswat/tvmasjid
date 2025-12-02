// --- ERROR HANDLER ---
window.onerror = function(msg, url, line) {
    const overlay = document.getElementById('error-overlay');
    if(overlay) {
        overlay.style.display = 'block';
        overlay.innerHTML += `<p>Error: ${msg} (Line ${line})</p>`;
    }
};

// --- CONFIGURATION ---
const CONFIG = {
    masjidName: "MASJID RAYA AL-FALAH",
    address: "Jl. Merdeka No. 123, Kota Pusat",
    runningText: "Selamat Datang di Masjid Raya Al-Falah • Mohon luruskan shaf • Matikan HP saat sholat berlangsung",
    
    // Durasi tiap slide dalam detik
    duration: { 
        home: 15, 
        nextDetail: 10, 
        scheduleFull: 10, 
        ayat: 15, 
        hadits: 15, 
        info: 10, 
        donation: 10 
    },
    
    // Waktu tunggu (menit) untuk Scheduler Cerdas
    thresholds: { 
        preAdzan: 12,    // Layar Emas
        preIqamah: 10,   // Layar Rose
        inPrayer: 20,    // Layar Hitam
        dzikir: 10,      // Layar Biru (Subuh & Ashar)
        jumatPrep: 30    // Layar Jumat
    },
    
    // Jadwal Sholat Lengkap (8 Waktu)
    // Format 24 Jam HH:MM
    prayerTimes: {
        tahajjud: "03:00",
        imsak: "04:10",
        shubuh: "04:20",
        syuruq: "05:35",
        dzuhur: "11:45",
        ashar: "15:05",
        maghrib: "17:55",
        isya: "19:05"
    }
};

// Konten Ayat & Hadits & Info
const DATA_CONTENT = {
    ayat: [
        { text: "Maka sesungguhnya bersama kesulitan ada kemudahan.", source: "QS. Al-Insyirah: 5" },
        { text: "Dan dirikanlah shalat, tunaikanlah zakat dan ruku'lah beserta orang-orang yang ruku'.", source: "QS. Al-Baqarah: 43" }
    ],
    hadits: [
        { text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain.", source: "HR. Ahmad" },
        { text: "Shalat berjamaah lebih utama 27 derajat daripada shalat sendirian.", source: "HR. Bukhari Muslim" }
    ],
    info: [
        { title: "Kerja Bakti", text: "Akan dilaksanakan kerja bakti membersihkan area masjid pada hari Ahad depan mulai pukul 08:00 WIB." },
        { title: "Penerimaan Zakat", text: "Panitia Amil Zakat Masjid siap menerima penyaluran Zakat, Infaq, dan Shodaqoh anda." }
    ]
};

// --- STATE MANAGEMENT ---
let currentState = { mode: 'NORMAL', slideIndex: 0, subMode: null };
let slideTimer = null;
let els = {};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Ultimate V2...");
    
    // 1. Get Elements
    els = {
        // Shared
        masjidName: document.getElementById('masjid-name'),
        address: document.getElementById('masjid-address'),
        runningText: document.getElementById('running-text'),
        progressBar: document.getElementById('slide-progress'),
        
        // Scene Home Elements
        homeClock: document.getElementById('home-clock'),
        homeDate: document.getElementById('home-date'),
        homeNextName: document.getElementById('home-next-name'),
        homeNextTime: document.getElementById('home-next-time'),
        homePrayerList: document.getElementById('home-prayer-list'),
        
        // Scene Detail Elements
        nextDetailName: document.getElementById('next-detail-name'),
        nextDetailTime: document.getElementById('next-detail-time'),
        
        // Scene Full Schedule
        scheduleGridFull: document.getElementById('schedule-grid-full'),
        
        // Content Elements
        ayatText: document.getElementById('ayat-text'),
        ayatSource: document.getElementById('ayat-source'),
        haditsText: document.getElementById('hadits-text'),
        haditsSource: document.getElementById('hadits-source'),
        infoTitle: document.getElementById('info-title'),
        infoText: document.getElementById('info-text'),
        
        // Countdown Elements
        countdownTitle: document.getElementById('countdown-title'),
        countdownName: document.getElementById('countdown-name'),
        countdownTimer: document.getElementById('countdown-timer'),
        countdownBg: document.getElementById('countdown-bg'),
        
        // Scenes Container
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
            dzikir: document.getElementById('scene-dzikir'),
            jumat: document.getElementById('scene-jumat'),
            kajian: document.getElementById('scene-kajian')
        }
    };

    // 2. Set Static Data
    if(els.masjidName) els.masjidName.textContent = CONFIG.masjidName;
    if(els.address) els.address.textContent = CONFIG.address;
    if(els.runningText) els.runningText.textContent = CONFIG.runningText;

    // 3. Render Static Lists (Home List & Full Grid)
    renderHomePrayerList();
    renderFullScheduleGrid();

    // 4. Start Loops
    updateClock(); // Jalan sekali langsung
    setInterval(updateClock, 1000);
    setInterval(checkSystemState, 1000);

    // 5. Start Slides
    setMode('NORMAL');
});

// --- CORE LOGIC ---

function updateClock() {
    const now = new Date();
    // Update Jam Home
    if(els.homeClock) els.homeClock.textContent = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
    if(els.homeDate) els.homeDate.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Update Next Prayer Info di Home (Realtime)
    updateNextPrayerInfo(now);
}

function updateNextPrayerInfo(now) {
    const next = getNextPrayer(now);
    if(els.homeNextName) els.homeNextName.textContent = next.name;
    if(els.homeNextTime) els.homeNextTime.textContent = next.timeStr;
    
    // Update data untuk scene Detail juga biar sinkron
    if(els.nextDetailName) els.nextDetailName.textContent = next.name;
    if(els.nextDetailTime) els.nextDetailTime.textContent = next.timeStr;
}

function getNextPrayer(now) {
    const curTime = now.getHours() * 60 + now.getMinutes();
    // Filter hanya waktu wajib + Jumat/Syuruq kalau mau, disini kita ambil semua urutan
    // Tapi untuk "Next Prayer" biasanya merujuk ke 5 waktu wajib + Syuruq/Imsak
    // Urutan: Shubuh, Dzuhur, Ashar, Maghrib, Isya
    // Kita cek semua jadwal
    
    let found = null;
    let minDiff = 9999;
    
    // Urutan kunci waktu sholat yg mau ditampilkan sebagai "Next"
    const keys = ['shubuh', 'syuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    
    for (let key of keys) {
        const timeStr = CONFIG.prayerTimes[key];
        const [h, m] = timeStr.split(':').map(Number);
        const pMinutes = h * 60 + m;
        
        if (pMinutes > curTime) {
            if ((pMinutes - curTime) < minDiff) {
                minDiff = pMinutes - curTime;
                found = { name: key.toUpperCase(), timeStr: timeStr };
            }
        }
    }
    
    // Jika tidak ada yg lebih besar (lewat Isya), berarti next is Shubuh Besok
    if (!found) {
        found = { name: 'SHUBUH', timeStr: CONFIG.prayerTimes.shubuh };
    }
    return found;
}

function checkSystemState() {
    const now = new Date();
    const curTime = now.getTime();
    const day = now.getDay();
    const hour = now.getHours();
    
    let activeEvent = null;

    // 1. KAJIAN AHAD (Minggu 06:00-07:00)
    if (day === 0 && hour === 6) {
        activeEvent = { mode: 'KAJIAN' };
    }
    
    // 2. JUMAT (Jumat, 30 min sebelum Dzuhur)
    else if (day === 5) {
        const dzuhurTime = getPrayerDate(CONFIG.prayerTimes.dzuhur);
        if (curTime >= (dzuhurTime - CONFIG.thresholds.jumatPrep * 60000) && curTime < dzuhurTime) {
            activeEvent = { mode: 'JUMAT' };
        }
    }

    // 3. WAKTU SHOLAT HARIAN
    if (!activeEvent) {
        // Hanya cek 5 waktu wajib untuk scheduler event
        const wajib = ['shubuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
        
        for (let name of wajib) {
            const pTime = getPrayerDate(CONFIG.prayerTimes[name]);
            
            const msPreAdzan = CONFIG.thresholds.preAdzan * 60000;
            const msPreIqamah = CONFIG.thresholds.preIqamah * 60000;
            const msInPrayer = CONFIG.thresholds.inPrayer * 60000;
            const msDzikir = CONFIG.thresholds.dzikir * 60000;

            // Pre-Adzan
            if (curTime >= (pTime - msPreAdzan) && curTime < pTime) {
                activeEvent = { mode: 'COUNTDOWN', sub: 'ADZAN', name, target: pTime };
            }
            // Pre-Iqamah
            else if (curTime >= pTime && curTime < (pTime + msPreIqamah)) {
                activeEvent = { mode: 'COUNTDOWN', sub: 'IQAMAH', name, target: pTime + msPreIqamah };
            }
            // Prayer
            else if (curTime >= (pTime + msPreIqamah) && curTime < (pTime + msPreIqamah + msInPrayer)) {
                activeEvent = { mode: 'PRAYER' };
            }
            // Dzikir (Khusus Subuh & Ashar)
            else if ((name === 'shubuh' || name === 'ashar') && 
                     curTime >= (pTime + msPreIqamah + msInPrayer) && 
                     curTime < (pTime + msPreIqamah + msInPrayer + msDzikir)) {
                activeEvent = { mode: 'DZIKIR' };
            }
            
            if (activeEvent) break;
        }
    }

    // Eksekusi Perubahan Mode
    if (activeEvent) {
        setMode(activeEvent.mode, activeEvent);
        // Update Countdown Numbers
        if (activeEvent.mode === 'COUNTDOWN' && els.countdownTimer) {
            const diff = activeEvent.target - curTime;
            const m = Math.floor(diff >
