/**
 * SMART MASJID DIGITAL SIGNAGE V2.2 (FIXED & UPGRADED)
 * Fitur: Complex Timeline, Fullscreen Overrides, Robust Error Handling
 */

// --- 1. CONFIGURATION ---
const CONFIG = {
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', // ID Kota Yogyakarta
    masjidName: "MASJID MU'ALLIMIN",
    address: "Yogyakarta, Indonesia",
    
    // Durasi Slide Normal (detik)
    duration: { 
        home: 15, 
        nextDetail: 10, 
        ayat: 20, 
        hadits: 20, 
        info: 15, 
        donation: 15 
    },

    // ATURAN WAKTU (DALAM MENIT)
    timeRules: { 
        preAdzan: 15,    // Countdown Merah sebelum waktu sholat
        preIqamah: 10,   // Countdown Menuju Iqamah (setelah adzan)
        inPrayer: 20,    // Durasi Sholat (Layar Gelap)
        dzikir: 15,      // Durasi Dzikir (Setelah sholat)
        jumatPrep: 45    // Persiapan Jumat sebelum Dzuhur
    },
    
    // Jadwal Default (Fallback)
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

    prayerTimes: {}, 
    currentHijriDate: "..." 
};

// Data Konten
const DATA_CONTENT = {
    ayat: [],   
    hadits: [], 
    infoList: [
        { title: "Layanan Ambulans", desc: "Hubungi sekretariat untuk layanan gratis", icon: "🚑" },
        { title: "Kebersihan", desc: "Jagalah kebersihan area masjid", icon: "✨" }
    ],
    // Konten Override
    kajianAhad: {
        title: "KAJIAN RUTIN AHAD PAGI",
        desc: "Bersama Ust. Fulan | 05:30 - 07:00 WIB",
        sub: "Silakan menempati tempat yang disediakan"
    },
    jumat: {
        title: "SHOLAT JUMAT",
        desc: "Persiapan Sholat Jumat",
        sub: "Mari menyegerakan datang ke masjid"
    }
};

// State Aplikasi
let STATE = { 
    mode: 'NORMAL',      // NORMAL | OVERRIDE
    overrideType: null,  // ADZAN, IQAMAH, PRAYER, DZIKIR, KAJIAN, JUMAT
    slideIndex: 0, 
    ayatIndex: 0, 
    haditsIndex: 0,
    nextPrayer: null,
    activeEventTarget: null
};

let els = {}; 
let slideTimer = null; 

// --- 2. HELPER FUNCTIONS ---

function log(funcName, msg) {
    console.log(`[${new Date().toLocaleTimeString()}] [${funcName}] ${msg}`);
}

function getFormattedDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function calculateTahajjud(shubuhTime) {
    if (!shubuhTime) return "03:00";
    const [h, m] = shubuhTime.split(':').map(Number);
    let date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() - 210); 
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// --- 3. DATA FETCHING ---

async function fetchHijriDate() {
    if (!navigator.onLine) return;
    try {
        const res = await fetch('https://api.myquran.com/v3/cal/today');
        const json = await res.json();
        if (json.status && json.data?.hijr) {
            const h = json.data.hijr;
            CONFIG.currentHijriDate = `${h.day} ${h.monthName} ${h.year} H`;
            updateUIHeader();
        }
    } catch (e) { console.warn("Hijri Fetch Error"); }
}

async function loadContentData() {
    const cacheKey = 'smart_masjid_content_v4';
    let loadedFromNet = false;

    if (navigator.onLine) {
        try {
            // Fetch parallel (Ayat & Hadits)
            const tasksAyat = Array(5).fill(0).map(async () => {
                try {
                    const r = await fetch("https://api.myquran.com/v2/quran/ayat/acak");
                    const j = await r.json();
                    return j.status ? { text: j.data.ayat.text.replace(/\n/g, "<br>"), arabic: j.data.ayat.arab, source: `QS. ${j.data.info.surat.nama.id}: ${j.data.ayat.ayah}` } : null;
                } catch { return null; }
            });
            const tasksHadits = Array(5).fill(0).map(async () => {
                try {
                    const r = await fetch("https://api.myquran.com/v3/hadis/enc/random");
                    const j = await r.json();
                    return j.status ? { text: j.data.text.id.replace(/\n/g, "<br>"), arabic: j.data.text.ar, source: j.data.takhrij } : null;
                } catch { return null; }
            });
            
            const [resAyat, resHadits] = await Promise.all([Promise.all(tasksAyat), Promise.all(tasksHadits)]);
            const validAyat = resAyat.filter(x => x);
            const validHadits = resHadits.filter(x => x);

            if (validAyat.length > 0) {
                DATA_CONTENT.ayat = validAyat;
                DATA_CONTENT.hadits = validHadits;
                localStorage.setItem(cacheKey, JSON.stringify({ ayat: validAyat, hadits: validHadits }));
                loadedFromNet = true;
                log('loadContent', 'Konten diperbarui dari internet');
            }
        } catch (e) { console.warn("Fetch content failed"); }
    }

    if (!loadedFromNet) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                DATA_CONTENT.ayat = parsed.ayat || [];
                DATA_CONTENT.hadits = parsed.hadits || [];
                log('loadContent', 'Konten dimuat dari cache');
            } catch(e) { localStorage.removeItem(cacheKey); }
        }
    }
}

async function loadSchedule() {
    log('loadSchedule', 'Mengambil jadwal...');
    const now = new Date();
    const dateKey = getFormattedDate(now); 
    const cacheKey = `jadwal_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    let schedule = null;

    if (navigator.onLine) {
        try {
            const url = `https://api.myquran.com/v3/sholat/jadwal/${CONFIG.cityId}/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.status && json.data?.jadwal) {
                const monthlyData = json.data.jadwal;
                // Simpan format map
                if (typeof monthlyData === 'object' && monthlyData !== null) {
                    localStorage.setItem(cacheKey, JSON.stringify(monthlyData));
                    if (monthlyData[dateKey]) schedule = monthlyData[dateKey];
                }
            }
        } catch (e) { console.warn("Fetch Schedule Error", e); }
    }

    if (!schedule) {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsedMap = JSON.parse(cachedData);
                if (parsedMap[dateKey]) schedule = parsedMap[dateKey];
            } catch (e) { localStorage.removeItem(cacheKey); }
        }
    }

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
        console.table(CONFIG.prayerTimes);
    } else {
        CONFIG.prayerTimes = { ...CONFIG.defaultPrayerTimes };
    }

    renderFooter();
    fetchHijriDate();
}

// --- 4. CORE LOGIC ---

function initElements() {
    // Mapping Element agar tidak querySelector berulang-ulang
    els = {
        header: document.querySelector('header'),
        footer: document.querySelector('footer'),
        
        clock: document.getElementById('header-clock'),
        dateMasehi: document.getElementById('header-date-masehi'),
        dateHijri: document.getElementById('header-date-hijri'),
        nextName: document.getElementById('header-next-name'),
        countdown: document.getElementById('header-countdown'),
        
        // Element Slide Next Detail (FIX: Ditambahkan disini)
        ndName: document.getElementById('next-detail-name'),
        ndTime: document.getElementById('next-detail-time'),

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
        
        // Overlay Elements
        cdTitle: document.getElementById('countdown-title'),
        cdName: document.getElementById('countdown-name'),
        cdTimer: document.getElementById('countdown-timer'),
        
        prayerTitle: document.querySelector('#scene-prayer h1'),
        prayerSub: document.querySelector('#scene-prayer p:first-of-type'),
        prayerNote: document.querySelector('#scene-prayer p:last-of-type'),
        
        footer: document.getElementById('footer-schedule'),
        progress: document.getElementById('slide-progress'),
        
        // Content Containers
        ayatText: document.getElementById('ayat-text'),
        ayatArabic: document.getElementById('ayat-arabic'),
        ayatSource: document.getElementById('ayat-source'),
        haditsText: document.getElementById('hadits-text'),
        haditsArabic: document.getElementById('hadits-arabic'),
        haditsSource: document.getElementById('hadits-source'),
        infoGrid: document.getElementById('info-grid'),
    };
}

function updateClockAndLogic() {
    const now = new Date();
    
    // 1. Update Jam
    const timeStr = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).replace(/\./g, ':');
    if(els.clock) els.clock.innerText = timeStr;
    if(els.dateMasehi) els.dateMasehi.innerText = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    
    // 2. Kalkulasi Next Prayer
    calculateNextPrayer(now);
    
    // 3. Cek Mode (Normal vs Override)
    checkSystemMode(now);
}

function updateUIHeader() {
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
    
    keys.forEach(k => {
        const [h, m] = CONFIG.prayerTimes[k].split(':').map(Number);
        const pMins = h * 60 + m;
        if (pMins > curMins && (pMins - curMins) < minDiff) {
            minDiff = pMins - curMins;
            found = { name: k, time: CONFIG.prayerTimes[k] };
        }
    });

    // Jika hari ini habis, berarti besok shubuh
    if (!found) found = { name: 'shubuh', time: CONFIG.prayerTimes.shubuh };
    STATE.nextPrayer = found;

    // Update Header Kecil
    if(els.nextName) els.nextName.innerText = found.name.toUpperCase();
    
    // Update Countdown Kecil (-HH:MM:SS)
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

    // FIX: Update Slide Next Detail (Agar tidak error saat slide muncul)
    if(els.ndName) els.ndName.innerText = found.name.toUpperCase();
    if(els.ndTime) els.ndTime.innerText = found.time;

    updateFooterHighlight(found.name);
}

function updateFooterHighlight(activeKey) {
    const items = els.footer.children;
    for (let item of items) {
        item.style.background = '';
        item.style.border = '1px solid transparent';
        item.style.transform = 'scale(1)';
        item.style.boxShadow = 'none';
        
        if (item.dataset.key === activeKey.toLowerCase()) {
            item.style.background = '#14b8a6'; 
            item.style.borderColor = '#2dd4bf';
            item.style.transform = 'scale(1.05)';
            item.style.boxShadow = '0 0 30px rgba(20, 184, 166, 0.4)';
            item.style.zIndex = '10';
        }
    }
}

// --- LOGIKA UTAMA OVERRIDE (TIMELINE) ---
function checkSystemMode(now) {
    if (!STATE.nextPrayer) return; // Belum ada jadwal

    let newMode = 'NORMAL';
    let newType = null;
    let target = null;
    let metaData = {};

    // 1. OVERRIDE: KAJIAN AHAD PAGI (05:30 - 07:00)
    if (now.getDay() === 0) { // 0 = Ahad
        const mins = now.getHours() * 60 + now.getMinutes();
        // 5:30 = 330 mins, 7:00 = 420 mins
        if (mins >= 330 && mins < 420) {
            newMode = 'OVERRIDE';
            newType = 'KAJIAN';
        }
    }

    // 2. TIMELINE SHOLAT 5 WAKTU
    if (newMode === 'NORMAL') {
        // Cek Jumat (45 menit sebelum dzuhur)
        if (now.getDay() === 5) {
            const [zh, zm] = CONFIG.prayerTimes.dzuhur.split(':').map(Number);
            const dzuhurTime = new Date(now);
            dzuhurTime.setHours(zh, zm, 0);
            const jumatStart = new Date(dzuhurTime.getTime() - CONFIG.timeRules.jumatPrep * 60000);
            
            if (now >= jumatStart && now < dzuhurTime) {
                newMode = 'OVERRIDE';
                newType = 'JUMAT';
            }
        }

        const sholatWajib = ['shubuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
        const curTime = now.getTime();

        for (let name of sholatWajib) {
            if (!CONFIG.prayerTimes[name]) continue;
            
            const [h, m] = CONFIG.prayerTimes[name].split(':').map(Number);
            const tAdzan = new Date(now);
            tAdzan.setHours(h, m, 0, 0);
            
            // Hitung Rentang Waktu (Miliseconds)
            const msPreAdzan = CONFIG.timeRules.preAdzan * 60000;
            const msPreIqamah = CONFIG.timeRules.preIqamah * 60000;
            const msInPrayer = CONFIG.timeRules.inPrayer * 60000;
            const msDzikir = CONFIG.timeRules.dzikir * 60000;

            const tStartPreAdzan = tAdzan.getTime() - msPreAdzan;
            const tEndPreIqamah = tAdzan.getTime() + msPreIqamah;
            const tEndPrayer = tEndPreIqamah + msInPrayer;
            const tEndDzikir = tEndPrayer + msDzikir;

            // A. Pre-Adzan (15 Menit Sebelum)
            if (curTime >= tStartPreAdzan && curTime < tAdzan.getTime()) {
                newMode = 'OVERRIDE';
                newType = 'ADZAN';
                target = tAdzan; // Hitung mundur ke Adzan
                metaData = { name };
                break;
            }
            
            // B. Pre-Iqamah (10 Menit Setelah Adzan)
            if (curTime >= tAdzan.getTime() && curTime < tEndPreIqamah) {
                newMode = 'OVERRIDE';
                newType = 'IQAMAH';
                target = new Date(tEndPreIqamah); // Hitung mundur ke Iqamah
                metaData = { name };
                break;
            }

            // C. Sholat (20 Menit Setelah Iqamah)
            if (curTime >= tEndPreIqamah && curTime < tEndPrayer) {
                newMode = 'OVERRIDE';
                newType = 'PRAYER';
                break;
            }

            // D. Dzikir (15 Menit Setelah Sholat - Hanya Subuh & Ashar)
            if ((name === 'shubuh' || name === 'ashar') && curTime >= tEndPrayer && curTime < tEndDzikir) {
                newMode = 'OVERRIDE';
                newType = 'DZIKIR';
                break;
            }
        }
    }

    // TERAPKAN MODE
    if (newMode !== STATE.mode || newType !== STATE.overrideType) {
        log('checkSystemMode', `Change Mode: ${newMode} - ${newType || 'None'}`);
        applyMode(newMode, newType, target, metaData);
    } 
    else if (newMode === 'OVERRIDE' && target) {
        // Update Timer Countdown jika sedang override aktif
        updateOverlayTimer(target - now);
    }
}

function applyMode(mode, type, target, meta) {
    STATE.mode = mode;
    STATE.overrideType = type;
    STATE.activeEventTarget = target;

    // Reset Visuals
    clearTimeout(slideTimer);
    els.progress.style.width = '0';
    Object.values(els.scenes).forEach(el => el.classList.add('hidden-slide'));

    if (mode === 'NORMAL') {
        // Tampilkan Header & Footer
        els.header.style.display = 'grid';
        els.footer.style.display = 'grid';
        els.scenes.home.classList.remove('hidden-slide');
        
        // Resume Slideshow
        STATE.slideIndex = 0;
        renderSlide();
    } 
    else {
        // HIDE HEADER & FOOTER (FULLSCREEN)
        els.header.style.display = 'none';
        els.footer.style.display = 'none';

        if (type === 'ADZAN' || type === 'IQAMAH') {
            els.scenes.countdown.classList.remove('hidden-slide');
            els.cdTitle.innerText = type === 'ADZAN' ? 'MENUJU ADZAN' : 'MENUJU IQOMAH';
            els.cdName.innerText = meta.name ? meta.name.toUpperCase() : 'SHOLAT';
            // Trigger timer update immediately
            if(target) updateOverlayTimer(target - new Date());
        } 
        else {
            // Gunakan Scene Prayer untuk Konten Statis (Prayer, Dzikir, Kajian, Jumat)
            els.scenes.prayer.classList.remove('hidden-slide');
            setupGenericOverlay(type);
        }
    }
}

function updateOverlayTimer(diffMs) {
    if (!els.cdTimer) return;
    const m = Math.floor(diffMs > 0 ? diffMs / 60000 : 0).toString().padStart(2,'0');
    const s = Math.floor(diffMs > 0 ? (diffMs % 60000) / 1000 : 0).toString().padStart(2,'0');
    els.cdTimer.innerText = `${m}:${s}`;
}

function setupGenericOverlay(type) {
    // 1. Buat Jam Realtime di pojok kanan atas (Karena header hilang)
    let overlayClock = document.getElementById('overlay-clock');
    if (!overlayClock) {
        overlayClock = document.createElement('div');
        overlayClock.id = 'overlay-clock';
        // Styling jam kecil
        overlayClock.className = "absolute top-10 right-10 text-4xl font-mono font-bold text-white/50 bg-black/30 px-6 py-2 rounded-full border border-white/10";
        els.scenes.prayer.appendChild(overlayClock);
        // Interval khusus jam overlay
        setInterval(() => {
            const now = new Date();
            overlayClock.innerText = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }).replace('.',':');
        }, 1000);
    }

    // 2. Set Konten Teks
    if (type === 'PRAYER') {
        els.prayerTitle.innerText = "SHOLAT BERLANGSUNG";
        els.prayerTitle.className = "text-[12vh] font-cinzel font-black text-white uppercase tracking-wider mb-12 leading-none";
        els.prayerSub.innerText = "Luruskan & Rapatkan Shaf";
        els.prayerNote.innerText = "Mohon Matikan Alat Komunikasi";
    } 
    else if (type === 'DZIKIR') {
        els.prayerTitle.innerText = "DZIKIR BA'DA SHOLAT";
        els.prayerTitle.className = "text-[8vh] font-cinzel font-black text-brand-400 uppercase tracking-wider mb-8 leading-none";
        els.prayerSub.innerText = "Astaghfirullah...";
        els.prayerNote.innerText = "Harap Tenang & Menjaga Kekhusyukan";
    }
    else if (type === 'KAJIAN') {
        els.prayerTitle.innerText = DATA_CONTENT.kajianAhad.title;
        els.prayerTitle.className = "text-[8vh] font-cinzel font-black text-accent-400 uppercase tracking-wider mb-8 leading-none";
        els.prayerSub.innerText = DATA_CONTENT.kajianAhad.desc;
        els.prayerNote.innerText = DATA_CONTENT.kajianAhad.sub;
    }
    else if (type === 'JUMAT') {
        els.prayerTitle.innerText = DATA_CONTENT.jumat.title;
        els.prayerTitle.className = "text-[10vh] font-cinzel font-black text-brand-500 uppercase tracking-wider mb-8 leading-none";
        els.prayerSub.innerText = DATA_CONTENT.jumat.desc;
        els.prayerNote.innerText = DATA_CONTENT.jumat.sub;
    }
}

// --- 5. SLIDESHOW SYSTEM (NORMAL MODE) ---

const SLIDE_ORDER = ['home', 'nextDetail', 'ayat', 'hadits', 'info', 'donation'];

function renderSlide() {
    if (STATE.mode !== 'NORMAL') return;

    const sceneKey = SLIDE_ORDER[STATE.slideIndex];
    let duration = CONFIG.duration[sceneKey] || 10;
    let skip = false;

    try {
        if (sceneKey === 'ayat') {
            if (DATA_CONTENT.ayat.length > 0) {
                const item = DATA_CONTENT.ayat[STATE.ayatIndex % DATA_CONTENT.ayat.length];
                els.ayatText.innerHTML = `"${item.text}"`;
                els.ayatArabic.innerText = item.arabic;
                els.ayatSource.innerText = item.source;
                STATE.ayatIndex++;
            } else skip = true;
        }
        else if (sceneKey === 'hadits') {
            if (DATA_CONTENT.hadits.length > 0) {
                const item = DATA_CONTENT.hadits[STATE.haditsIndex % DATA_CONTENT.hadits.length];
                els.haditsText.innerHTML = `"${item.text}"`;
                els.haditsArabic.innerText = item.arabic;
                els.haditsSource.innerText = item.source;
                STATE.haditsIndex++;
            } else skip = true;
        }
        else if (sceneKey === 'info') {
            els.infoGrid.innerHTML = '';
            DATA_CONTENT.infoList.forEach(info => {
                const div = document.createElement('div');
                div.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(10px); padding: 1.5rem; border-radius: 1rem; display: flex; gap: 1rem; align-items: start;";
                div.innerHTML = `
                    <div class="text-4xl text-brand-500">${info.icon}</div>
                    <div>
                        <h3 class="text-2xl font-bold text-brand-500 uppercase mb-2 font-cinzel">${info.title}</h3>
                        <p class="text-xl text-slate-300 leading-relaxed font-sans">${info.desc}</p>
                    </div>
                `;
                els.infoGrid.appendChild(div);
            });
        }
    } catch(e) {
        console.error("Render Slide Error:", e);
        skip = true;
    }

    // Hide All Normal Scenes
    const normalScenes = ['home', 'nextDetail', 'ayat', 'hadits', 'info', 'donation'];
    normalScenes.forEach(k => {
        if(els.scenes[k]) els.scenes[k].classList.add('hidden-slide');
    });

    if (!skip) {
        if(els.scenes[sceneKey]) els.scenes[sceneKey].classList.remove('hidden-slide');
        
        els.progress.style.transition = 'none';
        els.progress.style.width = '0';
        setTimeout(() => {
            els.progress.style.transition = `width ${duration}s linear`;
            els.progress.style.width = '100%';
        }, 50);

        slideTimer = setTimeout(() => {
            STATE.slideIndex = (STATE.slideIndex + 1) % SLIDE_ORDER.length;
            renderSlide();
        }, duration * 1000);
    } else {
        // Skip instant
        STATE.slideIndex = (STATE.slideIndex + 1) % SLIDE_ORDER.length;
        renderSlide();
    }
}

function renderFooter() {
    els.footer.innerHTML = '';
    const keys = ['imsak', 'shubuh', 'syuruq', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    keys.forEach(k => {
        const div = document.createElement('div');
        div.dataset.key = k; 
        div.className = "flex flex-col items-center justify-center rounded-xl transition-all duration-300 bg-white/5 border border-white/5";
        div.innerHTML = `<h3>${k}</h3><p>${CONFIG.prayerTimes[k] || '--:--'}</p>`;
        els.footer.appendChild(div);
    });
}

// --- 6. INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    log('INIT', 'System Start...');
    initElements();
    
    updateClockAndLogic();
    setInterval(updateClockAndLogic, 1000);

    await loadSchedule();
    await loadContentData();

    renderSlide();
    
    // Auto refresh jam 12 malam
    setInterval(() => {
        const n = new Date();
        if(n.getHours() === 0 && n.getMinutes() === 0 && n.getSeconds() === 0) {
            location.reload();
        }
    }, 1000);
});
