/**
 * SMART MASJID DIGITAL SIGNAGE V2.0
 * Fitur: Network First Strategy, Auto Cache, Debug Console
 */

// --- 1. CONFIGURATION & STATE ---
const CONFIG = {
    // ID Kota Yogyakarta (MyQuran API)
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', 
    masjidName: "MASJID JAMI' MU'ALLIMIN",
    address: "Jalan Letjend. S. Parman No. 68 Wirobrajan, Yogyakarta",
    
    // Durasi Slide (detik)
    duration: { 
        home: 15, 
        nextDetail: 10, 
        ayat: 20, 
        hadits: 20, 
        info: 15, 
        donation: 15 
    },

    // Threshold Waktu (menit) untuk Trigger Mode
    thresholds: { 
        preAdzan: 10,    // Muncul countdown merah sebelum adzan
        preIqamah: 10,   // Durasi hitung mundur iqomah setelah adzan
        inPrayer: 10,    // Durasi mode "Sholat Berlangsung" (layar gelap)
        dzikir: 5        // Durasi mode Dzikir setelah sholat
    },
    
    // Jadwal Default (Jika internet mati & cache kosong)
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

    prayerTimes: {}, // Akan diisi oleh LoadSchedule
    currentHijriDate: "..." 
};

// Penyimpanan Data Konten
const DATA_CONTENT = {
    ayat: [],   // Akan diisi fetch/cache
    hadits: [], // Akan diisi fetch/cache
    infoList: [
        { title: "Kajian Ahad Pagi", desc: "Tafsir Jalalain bersama Ust. Fulan", icon: "📖" },
        { title: "Jumat Berkah", desc: "Makan siang gratis untuk jamaah Jumat", icon: "🍱" },
        { title: "Layanan Ambulans", desc: "Hubungi sekretariat untuk layanan gratis", icon: "🚑" },
        { title: "Kebersihan", desc: "Jagalah kebersihan area masjid", icon: "✨" }
    ]
};

// State Aplikasi
let STATE = { 
    mode: 'NORMAL',      // NORMAL | COUNTDOWN | PRAYER
    subMode: null,       // ADZAN | IQAMAH
    slideIndex: 0, 
    ayatIndex: 0, 
    haditsIndex: 0,
    nextPrayer: null
};

// Cache DOM Elements
let els = {}; 
let slideTimer = null; // Timer Slide

// --- 2. HELPER FUNCTIONS ---

function log(funcName, msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const style = type === 'error' ? 'color: red; font-weight: bold;' : 
                  type === 'success' ? 'color: green; font-weight: bold;' : 'color: cyan;';
    console.log(`%c[${timestamp}] [${funcName}] ${msg}`, style);
}

function getFormattedDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0'); // 01, 02, ... 12
    const d = String(dateObj.getDate()).padStart(2, '0');      // 01, 02, ... 31
    return `${y}-${m}-${d}`;
}

function calculateTahajjud(shubuhTime) {
    if (!shubuhTime) return "03:00";
    const [h, m] = shubuhTime.split(':').map(Number);
    let date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() - 210); // 3.5 jam sebelum subuh
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// --- 3. DATA FETCHING (NETWORK FIRST) ---

async function fetchHijriDate() {
    log('fetchHijriDate', 'Memulai request...');
    if (!navigator.onLine) {
        log('fetchHijriDate', 'Offline. Skip.', 'error');
        return;
    }
    try {
        const res = await fetch('https://api.myquran.com/v3/cal/today');
        const json = await res.json();
        if (json.status && json.data?.hijr) {
            const h = json.data.hijr;
            CONFIG.currentHijriDate = `${h.day} ${h.monthName} ${h.year} H`;
            log('fetchHijriDate', `Sukses: ${CONFIG.currentHijriDate}`, 'success');
            updateUIHeader();
        }
    } catch (e) { log('fetchHijriDate', 'Gagal ambil data', 'error'); }
}

async function fetchRandomAyat() {
    try {
        const res = await fetch("https://api.myquran.com/v2/quran/ayat/acak");
        const json = await res.json();
        if (json.status && json.data?.ayat) {
            const d = json.data;
            return { 
                text: d.ayat.text.replace(/\n/g, "<br>"), 
                arabic: d.ayat.arab, 
                source: `QS. ${d.info.surat.nama.id}: ${d.ayat.ayah}` 
            };
        }
    } catch (e) { return null; }
}

async function fetchRandomHadith() {
    try {
        const res = await fetch("https://api.myquran.com/v3/hadis/enc/random");
        const json = await res.json();
        if (json.status && json.data?.text) {
            const d = json.data;
            return { 
                text: d.text.id.replace(/\n/g, "<br>"), 
                arabic: d.text.ar, 
                source: (d.takhrij || "Hadits").replace("Diriwayatkan oleh", "").trim() 
            };
        }
    } catch (e) { return null; }
}

async function loadContentData() {
    log('loadContentData', 'Memeriksa konten (Ayat/Hadits)...');
    const cacheKey = 'smart_masjid_content_v3';
    let loadedFromNet = false;

    // 1. NETWORK ATTEMPT
    if (navigator.onLine) {
        log('loadContentData', 'Online. Mencoba unduh data baru (Batch 5 item)...');
        try {
            // Ambil 5 ayat & 5 hadits sekaligus (Parallel)
            const tasksAyat = Array(5).fill(0).map(fetchRandomAyat);
            const tasksHadits = Array(5).fill(0).map(fetchRandomHadith);
            
            const [resAyat, resHadits] = await Promise.all([Promise.all(tasksAyat), Promise.all(tasksHadits)]);
            
            const validAyat = resAyat.filter(x => x);
            const validHadits = resHadits.filter(x => x);

            if (validAyat.length > 0 && validHadits.length > 0) {
                DATA_CONTENT.ayat = validAyat;
                DATA_CONTENT.hadits = validHadits;
                
                // Simpan Cache
                localStorage.setItem(cacheKey, JSON.stringify({ ayat: validAyat, hadits: validHadits }));
                log('loadContentData', 'Sukses unduh & update cache.', 'success');
                loadedFromNet = true;
            }
        } catch (e) {
            log('loadContentData', 'Gagal unduh batch.', 'error');
        }
    }

    // 2. CACHE FALLBACK
    if (!loadedFromNet) {
        log('loadContentData', 'Menggunakan Cache...', 'info');
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                DATA_CONTENT.ayat = parsed.ayat || [];
                DATA_CONTENT.hadits = parsed.hadits || [];
                log('loadContentData', `Loaded from Cache: ${DATA_CONTENT.ayat.length} Ayat`, 'success');
            } catch (e) { log('loadContentData', 'Cache Corrupt', 'error'); }
        } else {
            log('loadContentData', 'Cache Kosong & Offline. Slide Ayat akan diskip.', 'error');
        }
    }
}

async function loadSchedule() {
    log('loadSchedule', 'Memulai pemuatan jadwal sholat...');
    const now = new Date();
    const dateKey = getFormattedDate(now); // Format: "2025-12-05"
    
    // Key Cache: jadwal_2025_12
    const cacheKey = `jadwal_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let schedule = null;

    // --- 1. NETWORK ATTEMPT ---
    if (navigator.onLine) {
        log('loadSchedule', 'Online. Fetch API...');
        try {
            // URL: .../2025-12
            const url = `https://api.myquran.com/v3/sholat/jadwal/${CONFIG.cityId}/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            const res = await fetch(url);
            const json = await res.json();

            // Cek apakah struktur sesuai dengan contoh yang Anda berikan
            if (json.status && json.data?.jadwal) {
                const monthlyData = json.data.jadwal; // Ini adalah OBJECT, bukan Array
                
                // KARENA DATA DARI API SUDAH BERUPA MAP { "2025-12-01": {...} }
                // KITA BISA LANGSUNG SIMPAN KE CACHE
                
                // Validasi sedikit: pastikan ini Object dan bukan Array kosong
                if (typeof monthlyData === 'object' && monthlyData !== null) {
                    localStorage.setItem(cacheKey, JSON.stringify(monthlyData));
                    
                    // Ambil data hari ini langsung menggunakan key tanggal
                    if (monthlyData[dateKey]) {
                        schedule = monthlyData[dateKey];
                        log('loadSchedule', 'Sukses: Data hari ini ditemukan di API', 'success');
                    } else {
                        log('loadSchedule', `Data untuk tanggal ${dateKey} tidak ada di respon API`, 'error');
                    }
                }
            }
        } catch (e) {
            log('loadSchedule', 'Gagal Fetch API: ' + e, 'error');
        }
    }

    // --- 2. CACHE FALLBACK ---
    if (!schedule) {
        log('loadSchedule', 'Cek LocalStorage...', 'info');
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsedMap = JSON.parse(cachedData);
                // Karena struktur cache kita sekarang sama persis dengan API (Object Map)
                // Kita tinggal panggil key-nya
                if (parsedMap[dateKey]) {
                    schedule = parsedMap[dateKey];
                    log('loadSchedule', 'Berhasil load dari Cache', 'success');
                } else {
                    log('loadSchedule', 'Cache ada tapi data tanggal ini tidak ditemukan', 'error');
                }
            } catch (e) {
                log('loadSchedule', 'Cache Corrupt', 'error');
            }
        }
    }

    // --- 3. APPLY DATA ---
    if (schedule) {
        CONFIG.prayerTimes = {
            tahajjud: calculateTahajjud(schedule.subuh),
            imsak: schedule.imsak,
            shubuh: schedule.subuh,
            syuruq: schedule.terbit,
            dhuha: schedule.dhuha,
            dzuhur: schedule.dzuhur,
            ashar: schedule.ashar,
            maghrib: schedule.maghrib,
            isya: schedule.isya
        };
        // Debug di console untuk memastikan
        console.log("Jadwal Terpasang:", CONFIG.prayerTimes);
    } else {
        log('loadSchedule', 'Gagal total. Menggunakan Default.', 'error');
        CONFIG.prayerTimes = { ...CONFIG.defaultPrayerTimes };
    }

    renderFooter();
    fetchHijriDate();
}

// --- 4. CORE LOGIC (CLOCK & SLIDESHOW) ---

function initElements() {
    log('initElements', 'Mapping DOM Elements...');
    els = {
        clock: document.getElementById('header-clock'),
        dateMasehi: document.getElementById('header-date-masehi'),
        dateHijri: document.getElementById('header-date-hijri'),
        nextName: document.getElementById('header-next-name'),
        countdown: document.getElementById('header-countdown'),
        
        // Scenes
        scenes: {
            home: document.getElementById('scene-home'),
            nextDetail: document.getElementById('scene-next-detail'),
            ayat: document.getElementById('scene-ayat'),
            hadits: document.getElementById('scene-hadits'),
            info: document.getElementById('scene-info'),
            donation: document.getElementById('scene-donation'),
            countdown: document.getElementById('scene-countdown'),
            prayer: document.getElementById('scene-prayer')
        },
        
        // Dynamic Content Containers
        ayatText: document.getElementById('ayat-text'),
        ayatArabic: document.getElementById('ayat-arabic'),
        ayatSource: document.getElementById('ayat-source'),
        haditsText: document.getElementById('hadits-text'),
        haditsArabic: document.getElementById('hadits-arabic'),
        haditsSource: document.getElementById('hadits-source'),
        infoGrid: document.getElementById('info-grid'),
        footer: document.getElementById('footer-schedule'),
        progress: document.getElementById('slide-progress'),
        
        // Countdown Overlay
        cdTitle: document.getElementById('countdown-title'),
        cdName: document.getElementById('countdown-name'),
        cdTimer: document.getElementById('countdown-timer')
    };
}

function updateClockAndLogic() {
    // Fungsi ini dipanggil setiap detik (setInterval)
    const now = new Date();
    
    // 1. Update Jam Header
    if(els.clock) els.clock.innerText = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).replace(/\./g, ':');
    if(els.dateMasehi) els.dateMasehi.innerText = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    
    // 2. Hitung Next Prayer
    calculateNextPrayer(now);
    
    // 3. Cek apakah masuk waktu Countdown/Sholat
    checkSystemMode(now);
}

function updateUIHeader() {
    log('updateUIHeader', 'Updating Hijri UI');
    if(els.dateHijri) els.dateHijri.innerText = CONFIG.currentHijriDate;
    const homeHijri = document.getElementById('home-date-hijri');
    if(homeHijri) homeHijri.innerText = CONFIG.currentHijriDate;
}

function calculateNextPrayer(now) {
    if (!CONFIG.prayerTimes.shubuh) return;
    
    const curMins = now.getHours() * 60 + now.getMinutes();
    const keys = ['shubuh', 'syuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    
    let found = null;
    let minDiff = 99999;
    
    // Loop cari waktu terdekat yg belum lewat hari ini
    keys.forEach(k => {
        const [h, m] = CONFIG.prayerTimes[k].split(':').map(Number);
        const pMins = h * 60 + m;
        if (pMins > curMins && (pMins - curMins) < minDiff) {
            minDiff = pMins - curMins;
            found = { name: k, time: CONFIG.prayerTimes[k], diffMins: minDiff };
        }
    });

    // Kalau hari ini habis, berarti besok subuh
    if (!found) {
        found = { name: 'shubuh', time: CONFIG.prayerTimes.shubuh, diffMins: 999 }; // Diff dummy
    }

    STATE.nextPrayer = found;

    // Update Header Next
    if(els.nextName) els.nextName.innerText = found.name.toUpperCase();
    
    // Update Header Countdown (-HH:MM:SS)
    if(els.countdown) {
        const [targetH, targetM] = found.time.split(':').map(Number);
        let targetDate = new Date(now);
        targetDate.setHours(targetH, targetM, 0);
        if (targetDate < now) targetDate.setDate(targetDate.getDate() + 1);
        
        const diffMs = targetDate - now;
        const hh = Math.floor(diffMs / 3600000).toString().padStart(2,'0');
        const mm = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2,'0');
        const ss = Math.floor((diffMs % 60000) / 1000).toString().padStart(2,'0');
        els.countdown.innerText = `-${hh}:${mm}:${ss}`;
    }

    // Update DOM Element khusus Next Detail Slide (jika ada)
    const ndName = document.getElementById('next-detail-name');
    const ndTime = document.getElementById('next-detail-time');
    if(ndName) ndName.innerText = found.name.toUpperCase();
    if(ndTime) ndTime.innerText = found.time;

    updateFooterHighlight(found.name);
}

function updateFooterHighlight(activeKey) {
    const items = els.footer.children;
    for (let item of items) {
        // Reset style
        item.style.background = '';
        item.style.border = '1px solid transparent';
        item.style.transform = 'scale(1)';
        item.style.boxShadow = 'none';
        
        // Highlight active
        // Kita simpan key di attribute data-key saat render
        if (item.dataset.key === activeKey.toLowerCase()) {
            item.style.background = '#14b8a6'; // Teal
            item.style.borderColor = '#2dd4bf';
            item.style.transform = 'scale(1.05)';
            item.style.boxShadow = '0 0 30px rgba(20, 184, 166, 0.4)';
            item.style.zIndex = '10';
        }
    }
}

function checkSystemMode(now) {
    if (!STATE.nextPrayer) return;

    // Hitung ulang diff dalam milidetik akurat
    const [h, m] = STATE.nextPrayer.time.split(':').map(Number);
    let pDate = new Date(now);
    pDate.setHours(h, m, 0, 0);
    
    // Logika Threshold
    const diffMs = pDate - now;
    const diffMins = diffMs / 60000;

    // 1. Mode Countdown Menuju Adzan
    if (diffMins > 0 && diffMins <= CONFIG.thresholds.preAdzan && STATE.nextPrayer.name !== 'syuruq') {
        if (STATE.mode !== 'COUNTDOWN' || STATE.subMode !== 'ADZAN') {
            log('checkSystemMode', `Masuk Mode Countdown ADZAN (${STATE.nextPrayer.name})`, 'info');
            changeMode('COUNTDOWN', { sub: 'ADZAN', name: STATE.nextPrayer.name, target: pDate });
        }
        // Update Timer Overlay
        updateOverlayTimer(diffMs);
        return;
    }

    // 2. Mode Countdown Iqomah (Simulasi: Anggaplah pDate sudah lewat, kita tambah durasi iqomah)
    // *Catatan: Logic iqomah butuh trigger setelah adzan selesai, disini kita simplifikasi:
    // Jika waktu sekarang > waktu sholat && waktu sekarang < waktu sholat + iqomah
    const iqomahDate = new Date(pDate.getTime() + (CONFIG.thresholds.preIqamah * 60000));
    if (now >= pDate && now < iqomahDate && STATE.nextPrayer.name !== 'syuruq') {
        if (STATE.mode !== 'COUNTDOWN' || STATE.subMode !== 'IQAMAH') {
            log('checkSystemMode', 'Masuk Mode Countdown IQAMAH', 'info');
            changeMode('COUNTDOWN', { sub: 'IQAMAH', name: STATE.nextPrayer.name, target: iqomahDate });
        }
        updateOverlayTimer(iqomahDate - now);
        return;
    }

    // 3. Mode Sholat (Layar Gelap)
    const prayerEndDate = new Date(iqomahDate.getTime() + (CONFIG.thresholds.inPrayer * 60000));
    if (now >= iqomahDate && now < prayerEndDate && STATE.nextPrayer.name !== 'syuruq') {
        if (STATE.mode !== 'PRAYER') {
            log('checkSystemMode', 'Masuk Mode PRAYER (Layar Gelap)', 'info');
            changeMode('PRAYER');
        }
        return;
    }

    // 4. Normal Mode
    if (STATE.mode !== 'NORMAL') {
        log('checkSystemMode', 'Kembali ke Mode NORMAL', 'info');
        changeMode('NORMAL');
    }
}

function updateOverlayTimer(diffMs) {
    if (!els.cdTimer) return;
    const m = Math.floor(diffMs / 60000).toString().padStart(2,'0');
    const s = Math.floor((diffMs % 60000) / 1000).toString().padStart(2,'0');
    els.cdTimer.innerText = `${m}:${s}`;
}

function changeMode(newMode, data = {}) {
    STATE.mode = newMode;
    STATE.subMode = data.sub || null;

    // Hide All Overlays first
    els.scenes.countdown.classList.add('hidden-slide');
    els.scenes.prayer.classList.add('hidden-slide');
    
    // Stop Slideshow Timer sementara
    clearTimeout(slideTimer);
    els.progress.style.width = '0';

    if (newMode === 'NORMAL') {
        // Resume Slideshow
        STATE.slideIndex = 0;
        renderSlide();
    } 
    else if (newMode === 'COUNTDOWN') {
        els.scenes.countdown.classList.remove('hidden-slide');
        els.cdTitle.innerText = data.sub === 'ADZAN' ? 'MENUJU ADZAN' : 'MENUJU IQOMAH';
        els.cdName.innerText = data.name.toUpperCase();
    }
    else if (newMode === 'PRAYER') {
        els.scenes.prayer.classList.remove('hidden-slide');
    }
}

// --- 5. SLIDESHOW SYSTEM ---

const SLIDE_ORDER = ['home', 'nextDetail', 'ayat', 'hadits', 'info', 'donation'];

function renderSlide() {
    if (STATE.mode !== 'NORMAL') return;

    const sceneKey = SLIDE_ORDER[STATE.slideIndex];
    log('renderSlide', `Menampilkan Slide: ${sceneKey}`);

    let duration = CONFIG.duration[sceneKey] || 10;
    let skip = false;

    // Logic Spesifik per Slide
    if (sceneKey === 'ayat') {
        if (DATA_CONTENT.ayat.length > 0) {
            const item = DATA_CONTENT.ayat[STATE.ayatIndex % DATA_CONTENT.ayat.length];
            els.ayatText.innerHTML = `"${item.text}"`;
            els.ayatArabic.innerText = item.arabic;
            els.ayatSource.innerText = item.source;
            STATE.ayatIndex++;
        } else { skip = true; log('renderSlide', 'Skip Ayat (Data Kosong)'); }
    }
    else if (sceneKey === 'hadits') {
        if (DATA_CONTENT.hadits.length > 0) {
            const item = DATA_CONTENT.hadits[STATE.haditsIndex % DATA_CONTENT.hadits.length];
            els.haditsText.innerHTML = `"${item.text}"`;
            els.haditsArabic.innerText = item.arabic;
            els.haditsSource.innerText = item.source;
            STATE.haditsIndex++;
        } else { skip = true; log('renderSlide', 'Skip Hadits (Data Kosong)'); }
    }
    else if (sceneKey === 'info') {
        els.infoGrid.innerHTML = '';
        DATA_CONTENT.infoList.forEach(info => {
            const div = document.createElement('div');
            div.className = 'bg-white/5 p-6 rounded-2xl border border-white/10 flex gap-4 items-start';
            div.innerHTML = `
                <div class="text-4xl text-brand-500">${info.icon}</div>
                <div>
                    <h3 class="text-2xl font-bold text-brand-500 uppercase mb-2">${info.title}</h3>
                    <p class="text-xl text-slate-300 leading-relaxed">${info.desc}</p>
                </div>
            `;
            els.infoGrid.appendChild(div);
        });
    }

    // Hide All Scenes
    Object.values(els.scenes).forEach(el => el.classList.add('hidden-slide'));

    if (!skip) {
        // Show Current
        els.scenes[sceneKey].classList.remove('hidden-slide');
        
        // Animate Progress Bar
        els.progress.style.transition = 'none';
        els.progress.style.width = '0';
        setTimeout(() => {
            els.progress.style.transition = `width ${duration}s linear`;
            els.progress.style.width = '100%';
        }, 50);

        // Schedule Next
        slideTimer = setTimeout(() => {
            STATE.slideIndex = (STATE.slideIndex + 1) % SLIDE_ORDER.length;
            renderSlide();
        }, duration * 1000);
    } else {
        // Instant Next if Skipped
        STATE.slideIndex = (STATE.slideIndex + 1) % SLIDE_ORDER.length;
        renderSlide();
    }
}

function renderFooter() {
    log('renderFooter', 'Rendering 8 Kolom Jadwal...');
    els.footer.innerHTML = '';
    const keys = ['imsak', 'shubuh', 'syuruq', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    
    keys.forEach(k => {
        const div = document.createElement('div');
        div.dataset.key = k; // Untuk selector highlight nanti
        // Setup class dasar
        div.className = "flex flex-col items-center justify-center rounded-xl transition-all duration-300 bg-white/5 border border-white/5";
        
        div.innerHTML = `
            <h3>${k}</h3>
            <p>${CONFIG.prayerTimes[k] || '--:--'}</p>
        `;
        els.footer.appendChild(div);
    });
}


// --- 6. INITIALIZATION ---

document.addEventListener('DOMContentLoaded', async () => {
    log('INIT', 'Aplikasi Dimulai...');
    
    initElements();
    
    // 1. Start Clock segera agar tidak kosong
    updateClockAndLogic();
    setInterval(updateClockAndLogic, 1000);

    // 2. Load Data (Parallel)
    await loadSchedule();
    await loadContentData();

    // 3. Start Slideshow
    renderSlide();
    
    // 4. Auto Refresh Refresh Halaman Jam 00:00 untuk update jadwal baru
    setInterval(() => {
        const n = new Date();
        if(n.getHours() === 0 && n.getMinutes() === 0 && n.getSeconds() === 0) {
            location.reload();
        }
    }, 1000);
});
