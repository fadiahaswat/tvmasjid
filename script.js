/**
 * SMART MASJID DIGITAL SIGNAGE V2.4 (Final Tuned)
 * Fitur: Iqamah Dinamis, Scene Sholat Hening + Jam, Tema Warna Tegas
 */

// --- 1. CONFIGURATION ---
const CONFIG = {
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', 
    masjidName: "MASJID MU'ALLIMIN",
    address: "Yogyakarta, Indonesia",
    
    // Durasi Slide Normal
    // Tambahkan durasi donation
    duration: { 
        home: 15, 
        nextDetail: 10, 
        ayat: 20, 
        hadits: 20,
        asmaulHusna: 15, // <--- TAMBAHKAN INI (Durasi 15 detik)
        donation: 20 // Durasi slide donasi
    },

    timeRules: { 
        preAdzan: 15,    
        preIqamah: 10,   // Default 10 menit (Akan di-override khusus Shubuh & Isya)
        inPrayer: 20,    
        dzikir: 15,      
        jumatPrep: 45,
        jumatPrayer: 60  
    },
    
    // Jadwal Default (Jaga-jaga jika offline)
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
    asmaulHusna: [], // <--- TAMBAHKAN INI
    kajianAhad: {
        title: "KAJIAN RUTIN AHAD PAGI",
        desc: "Bersama Ust. Fulan | 05:30 - 07:00 WIB",
        sub: "Silakan menempati tempat yang disediakan"
    },
    jumat: {
        title: "SHOLAT JUMAT",
        desc: "Persiapan Sholat Jumat",
        sub: "Mari menyegerakan datang ke masjid"
    },
    // DATA DONASI FINAL (Sesuai Request)
    donations: [
        { 
            // 1. BNI (Oranye)
            name: "LAZISMU MADRASAH MU'ALLIMIN MUHAMMADIYAH", 
            number: "3440000348", 
            qr: "qris-bni.png", 
            logo: "bank-bni.png",
            color: "text-orange-500", // Class Tailwind untuk Oranye
            glow: "bg-orange-500/20"  // Warna pendar background
        },
        { 
            // 2. BSI (Cyan)
            name: "LAZISMU MUALLIMIN YOGYAKARTA", 
            number: "7930030303", 
            qr: "qris-bsi.jpg", 
            logo: "bank-bsi.png",
            color: "text-cyan-400",   // Class Tailwind untuk Cyan
            glow: "bg-cyan-500/20"
        },
        { 
            // 3. BPD DIY Syariah (Biru & Hijau)
            // Kita pakai gradient text agar dapat nuansa Biru-Hijaunya
            name: "KL LAZISMU MADRASAH MUALLIMIN", 
            number: "801241004624", 
            qr: "qris-bpd.jpg", 
            logo: "bank-bpd.png",
            color: "text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500", // Gradient Biru ke Hijau
            glow: "bg-emerald-500/20"
        }
    ]
};

let STATE = { 
    mode: 'NORMAL',      
    overrideType: null,  
    slideIndex: 0, 
    ayatIndex: 0, 
    haditsIndex: 0,
    asmaulHusnaIndex: 0, // <--- TAMBAHKAN INI
    nextPrayer: null,
    activeEventTarget: null,
    donationIndex: 0,
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

function addMinutes(timeStr, minutesToAdd) {
    if (!timeStr) return "00:00";
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// --- AUDIO SYSTEM (OFFLINE FRIENDLY) ---
// Pastikan file audio ada di folder ./audio/
const SFX = {
    beep: new Audio('./audio/beep.mp3'), // Suara bip pendek
    final: new Audio('./audio/gong.mp3'), // Suara masuk waktu
    lastPlayed: -1 
};

function playCountdownSound(secondsLeft) {
    if (SFX.lastPlayed === secondsLeft) return;

    if (secondsLeft <= 5 && secondsLeft > 0) { // Bunyi di 5,4,3,2,1
        SFX.beep.currentTime = 0;
        SFX.beep.play().catch(() => {});
        SFX.lastPlayed = secondsLeft;
    } 
    else if (secondsLeft === 0) { // Bunyi Gong di 0
        SFX.final.currentTime = 0;
        SFX.final.play().catch(() => {});
        SFX.lastPlayed = secondsLeft;
    }
    else {
        if (secondsLeft > 6) SFX.lastPlayed = -1;
    }
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
    const cacheKey = 'smart_masjid_content_v5'; // Bump version
    let loadedFromNet = false;

    if (navigator.onLine) {
        try {
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
            
            // ... (kode tasksAyat dan tasksHadits yg sudah ada biarkan) ...

            // --- TAMBAHAN BARU: Fetch Asmaul Husna ---
            const tasksHusna = Array(5).fill(0).map(async () => {
                try {
                    const r = await fetch("https://api.myquran.com/v2/husna/acak");
                    const j = await r.json();
                    // Struktur API: j.data.arab, j.data.latin, j.data.indo
                    return j.status ? j.data : null;
                } catch { return null; }
            });

            // Update Promise.all agar menunggu tasksHusna juga
            const [resAyat, resHadits, resHusna] = await Promise.all([
                Promise.all(tasksAyat), 
                Promise.all(tasksHadits),
                Promise.all(tasksHusna) // <--- Tambah ini
            ]);
            
            const validAyat = resAyat.filter(x => x);
            const validHadits = resHadits.filter(x => x);
            const validHusna = resHusna.filter(x => x); // <--- Tambah ini

            if (validAyat.length > 0) {
                DATA_CONTENT.ayat = validAyat;
                DATA_CONTENT.hadits = validHadits;
                DATA_CONTENT.asmaulHusna = validHusna; // <--- Simpan ke Data Content
                
                // Simpan cache juga
                localStorage.setItem(cacheKey, JSON.stringify({ 
                    ayat: validAyat, 
                    hadits: validHadits,
                    asmaulHusna: validHusna // <--- Tambah ke cache
                }));
                
                loadedFromNet = true;
                log('loadContent', 'Konten diperbarui dari internet');
                
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
        // --- LOGIKA KOREKSI WAKTU ---
        const rawShubuh = schedule.subuh;
        const shubuhKoreksi = addMinutes(rawShubuh, 8); // Shubuh +8 menit
        const imsakKoreksi = addMinutes(shubuhKoreksi, -10); // Imsak 10 menit sebelum shubuh

        CONFIG.prayerTimes = {
            tahajjud: calculateTahajjud(shubuhKoreksi),
            imsak: imsakKoreksi,      
            shubuh: shubuhKoreksi,    
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
    els = {
        header: document.querySelector('header'),
        footer: document.querySelector('footer'),
        
        clock: document.getElementById('header-clock'),
        dateMasehi: document.getElementById('header-date-masehi'),
        dateHijri: document.getElementById('header-date-hijri'),
        nextName: document.getElementById('header-next-name'),
        countdown: document.getElementById('header-countdown'),
        
        ndName: document.getElementById('next-detail-name'),
        ndCountdown: document.getElementById('next-detail-countdown'),
        ndTarget: document.getElementById('next-detail-target'),

        scenes: {
            home: document.getElementById('scene-home'),
            nextDetail: document.getElementById('scene-next-detail'),
            ayat: document.getElementById('scene-ayat'),
            hadits: document.getElementById('scene-hadits'),
            asmaulHusna: document.getElementById('scene-asmaulhusna'), // <--- Tambah scene ini
            donation: document.getElementById('scene-donation'), // <-- Jangan lupa ini
            countdown: document.getElementById('scene-countdown'),
            prayer: document.getElementById('scene-prayer')
        },

        // Tambahkan selector elemen text Asmaul Husna
        ahArab: document.getElementById('ah-arab'),
        ahLatin: document.getElementById('ah-latin'),
        ahIndo: document.getElementById('ah-indo'),

        // Elemen Donasi Baru
        donQr: document.getElementById('don-qr'),
        donLogo: document.getElementById('don-logo'),
        donNumber: document.getElementById('don-number'),
        donName: document.getElementById('don-name'),
        donBgGlow: document.getElementById('don-bg-glow'), // Untuk efek pendar warna
        
        cdTitle: document.getElementById('countdown-title'),
        cdName: document.getElementById('countdown-name'),
        cdTimer: document.getElementById('countdown-timer'),
        
        prayerTitle: document.querySelector('#scene-prayer h1'),
        prayerSub: document.querySelector('#scene-prayer p:first-of-type'),
        prayerNote: document.querySelector('#scene-prayer p:last-of-type'),
        
        footer: document.getElementById('footer-schedule'),
        progress: document.getElementById('slide-progress'),
        
        ayatText: document.getElementById('ayat-text'),
        ayatArabic: document.getElementById('ayat-arabic'),
        ayatSource: document.getElementById('ayat-source'),
        haditsText: document.getElementById('hadits-text'),
        haditsArabic: document.getElementById('hadits-arabic'),
        haditsSource: document.getElementById('hadits-source')
    };
}

function updateClockAndLogic() {
    const now = new Date();
    
    // Update Jam
    const timeStr = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).replace(/\./g, ':');
    if(els.clock) els.clock.innerText = timeStr;
    
    // Update Tanggal (Masehi) - KOREKSI HARI
    if(els.dateMasehi) {
        let dateStr = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        
        // Ganti kata 'Minggu' menjadi 'Ahad'
        dateStr = dateStr.replace('Minggu', 'Ahad');
        
        els.dateMasehi.innerText = dateStr;
    }
    
    calculateNextPrayer(now);
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

    if (!found) found = { name: 'shubuh', time: CONFIG.prayerTimes.shubuh };
    STATE.nextPrayer = found;

    // Hitung Countdown
    const [targetH, targetM] = found.time.split(':').map(Number);
    let targetDate = new Date(now);
    targetDate.setHours(targetH, targetM, 0, 0);
    if (targetDate < now) targetDate.setDate(targetDate.getDate() + 1);
    
    const diffMs = targetDate - now;
    const hh = Math.floor(diffMs / 3600000).toString().padStart(2,'0');
    const mm = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2,'0');
    const ss = Math.floor((diffMs % 60000) / 1000).toString().padStart(2,'0');
    const countdownString = `-${hh}:${mm}:${ss}`;

    // Sound Effect Trigger
    playCountdownSound(Math.floor(diffMs / 1000));

    // Update UI
    if(els.nextName) els.nextName.innerText = found.name.toUpperCase();
    if(els.countdown) els.countdown.innerText = countdownString;
    
    if(els.ndName) els.ndName.innerText = found.name.toUpperCase();
    if(els.ndCountdown) els.ndCountdown.innerText = countdownString;
    if(els.ndTarget) els.ndTarget.innerText = found.time; 

    updateFooterHighlight(found.name);
}

function updateFooterHighlight(activeKey) {
    const items = els.footer.children;
    for (let item of items) {
        item.classList.remove('schedule-active');
        item.style.background = '';
        item.style.borderColor = '';
        item.style.boxShadow = '';
        item.style.transform = '';
        
        if (item.dataset.key === activeKey.toLowerCase()) {
            item.classList.add('schedule-active');
        }
    }
}

function checkSystemMode(now) {
    if (!STATE.nextPrayer) return;

    let newMode = 'NORMAL';
    let newType = null;
    let target = null;
    let metaData = {};

    // 1. Cek Kajian Ahad Pagi
    if (now.getDay() === 0) { 
        const mins = now.getHours() * 60 + now.getMinutes();
        if (mins >= 330 && mins < 420) {
            newMode = 'OVERRIDE';
            newType = 'KAJIAN';
        }
    }

    if (newMode === 'NORMAL') {
        // 2. Cek Persiapan Jumat
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
            
            // --- LOGIKA DURASI DINAMIS ---
            let durIqamah = CONFIG.timeRules.preIqamah; // Default 10
            if (name === 'shubuh') durIqamah = 13; // Request: Shubuh 13 menit
            if (name === 'isya') durIqamah = 5;    // Request: Isya 5 menit

            let durPrayer = CONFIG.timeRules.inPrayer;
            if (now.getDay() === 5 && name === 'dzuhur') {
                durPrayer = CONFIG.timeRules.jumatPrayer; // Jumat 60 menit
            }

            const msPreAdzan = CONFIG.timeRules.preAdzan * 60000;
            const msPreIqamah = durIqamah * 60000;
            const msInPrayer = durPrayer * 60000;
            const msDzikir = CONFIG.timeRules.dzikir * 60000;

            const tStartPreAdzan = tAdzan.getTime() - msPreAdzan;
            const tEndPreIqamah = tAdzan.getTime() + msPreIqamah;
            const tEndPrayer = tEndPreIqamah + msInPrayer;
            const tEndDzikir = tEndPrayer + msDzikir;

            if (curTime >= tStartPreAdzan && curTime < tAdzan.getTime()) {
                newMode = 'OVERRIDE';
                newType = 'ADZAN';
                target = tAdzan;
                metaData = { name };
                break;
            }
            
            if (curTime >= tAdzan.getTime() && curTime < tEndPreIqamah) {
                newMode = 'OVERRIDE';
                newType = 'IQAMAH';
                target = new Date(tEndPreIqamah);
                metaData = { name };
                break;
            }

            if (curTime >= tEndPreIqamah && curTime < tEndPrayer) {
                newMode = 'OVERRIDE';
                newType = 'PRAYER';
                if (now.getDay() === 5 && name === 'dzuhur') metaData.isJumat = true; 
                break;
            }

            if ((name === 'shubuh' || name === 'ashar') && curTime >= tEndPrayer && curTime < tEndDzikir) {
                newMode = 'OVERRIDE';
                newType = 'DZIKIR';
                break;
            }
        }
    }

    if (newMode !== STATE.mode || newType !== STATE.overrideType) {
        log('checkSystemMode', `Change Mode: ${newMode} - ${newType || 'None'}`);
        applyMode(newMode, newType, target, metaData);
    } 
    else if (newMode === 'OVERRIDE' && target) {
        updateOverlayTimer(target - now);
    }
}

function applyMode(mode, type, target, meta) {
    STATE.mode = mode;
    STATE.overrideType = type;
    STATE.activeEventTarget = target;

    clearTimeout(slideTimer);
    els.progress.style.width = '0';
    Object.values(els.scenes).forEach(el => {
        el.classList.add('hidden-slide');
        // Reset class tema
        el.classList.remove('theme-red', 'theme-yellow', 'theme-khusyu', 'theme-blue', 'theme-gold', 'theme-silver');
    });

    if (mode === 'NORMAL') {
        els.header.style.display = 'grid';
        els.footer.style.display = 'grid';
        els.scenes.home.classList.remove('hidden-slide');
        
        STATE.slideIndex = 0;
        renderSlide();
    } 
    else {
        els.header.style.display = 'none';
        els.footer.style.display = 'none';

        // --- PENGATURAN TEMA WARNA & DISPLAY ---
        
        if (type === 'ADZAN') {
            const sc = els.scenes.countdown;
            sc.classList.remove('hidden-slide');
            sc.classList.add('theme-red'); // MERAH
            
            els.cdTitle.innerText = 'MENUJU ADZAN';
            els.cdName.innerText = meta.name ? meta.name.toUpperCase() : 'SHOLAT';
            
            if(target) updateOverlayTimer(target - new Date());
            ensureOverlayClock(sc);
        } 
        else if (type === 'IQAMAH') {
            const sc = els.scenes.countdown;
            sc.classList.remove('hidden-slide');
            sc.classList.add('theme-yellow'); // KUNING
            
            els.cdTitle.innerText = 'MENUJU IQOMAH';
            els.cdName.innerText = meta.name ? meta.name.toUpperCase() : 'SHOLAT';
            
            if(target) updateOverlayTimer(target - new Date());
            ensureOverlayClock(sc);
        } 
        else {
            // Scene Prayer / Info
            const sp = els.scenes.prayer;
            sp.classList.remove('hidden-slide');
            
            if (type === 'PRAYER') {
                // SHOLAT: TEMA GELAP (KHUSYU) + JAM
                sp.classList.add('theme-khusyu'); 
                ensureOverlayClock(sp); // REQUEST BARU: TAMPILKAN JAM
                
                if (meta && meta.isJumat) {
                    setupGenericOverlay('PRAYER_JUMAT');
                } else {
                    setupGenericOverlay('PRAYER');
                }
            }
            else if (type === 'DZIKIR') {
                sp.classList.add('theme-blue'); // BIRU
                setupGenericOverlay('DZIKIR');
                ensureOverlayClock(sp);
            }
            else if (type === 'KAJIAN') {
                sp.classList.add('theme-silver'); // SILVER
                setupGenericOverlay('KAJIAN');
                ensureOverlayClock(sp);
            }
            else if (type === 'JUMAT') { 
                sp.classList.add('theme-gold'); // EMAS
                setupGenericOverlay('JUMAT');
                ensureOverlayClock(sp);
            }
        }
    }
}

function updateOverlayTimer(diffMs) {
    if (!els.cdTimer) return;
    const secondsLeft = Math.floor(diffMs / 1000);
    playCountdownSound(secondsLeft);

    const m = Math.floor(diffMs > 0 ? diffMs / 60000 : 0).toString().padStart(2,'0');
    const s = Math.floor(diffMs > 0 ? (diffMs % 60000) / 1000 : 0).toString().padStart(2,'0');
    els.cdTimer.innerText = `${m}:${s}`;
}

// Fungsi Menempelkan Jam Kecil
function ensureOverlayClock(parentScene) {
    let clock = parentScene.querySelector('.overlay-clock-widget');
    
    if (!clock) {
        clock = document.createElement('div');
        // Style: Transparan Hitam Elegan
        clock.className = "overlay-clock-widget absolute top-8 right-8 text-3xl font-mono font-bold text-white/80 bg-black/40 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg z-[100]";
        parentScene.appendChild(clock);
        
        const updateThisClock = () => {
            if (!document.body.contains(clock)) return;
            const now = new Date();
            clock.innerText = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }).replace('.',':');
            requestAnimationFrame(updateThisClock);
        };
        requestAnimationFrame(updateThisClock);
    }
}

function setupGenericOverlay(type) {
    if (type === 'PRAYER') {
        els.prayerTitle.innerText = "SHOLAT BERLANGSUNG";
        els.prayerSub.innerText = "Luruskan Shaf"; 
        els.prayerNote.innerText = "Mohon non-aktifkan HP & menjaga ketenangan";
    } 
    else if (type === 'PRAYER_JUMAT') { 
        els.prayerTitle.innerText = "KHUTBAH JUMAT";
        els.prayerSub.innerText = "Harap Menyimak";
        els.prayerNote.innerText = "Barangsiapa berbicara saat khutbah, maka sia-sialah Jumatnya";
    }
    else if (type === 'DZIKIR') {
        els.prayerTitle.innerText = "DZIKIR BA'DA SHOLAT";
        els.prayerSub.innerText = "Astaghfirullah...";
        els.prayerNote.innerText = "Harap Tenang & Menjaga Kekhusyukan";
    }
    else if (type === 'KAJIAN') {
        els.prayerTitle.innerText = DATA_CONTENT.kajianAhad.title;
        els.prayerSub.innerText = DATA_CONTENT.kajianAhad.desc;
        els.prayerNote.innerText = DATA_CONTENT.kajianAhad.sub;
    }
    else if (type === 'JUMAT') { 
        els.prayerTitle.innerText = DATA_CONTENT.jumat.title;
        els.prayerSub.innerText = DATA_CONTENT.jumat.desc;
        els.prayerNote.innerText = DATA_CONTENT.jumat.sub;
    }
}

// --- 5. SLIDESHOW SYSTEM (NORMAL MODE) ---

// Masukkan 'asmaulHusna' setelah 'hadits'
const SLIDE_ORDER = ['home', 'nextDetail', 'ayat', 'hadits', 'asmaulHusna', 'donation'];
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
            // ... (setelah blok if sceneKey === 'hadits') ...

        else if (sceneKey === 'asmaulHusna') {
            if (DATA_CONTENT.asmaulHusna && DATA_CONTENT.asmaulHusna.length > 0) {
                const item = DATA_CONTENT.asmaulHusna[STATE.asmaulHusnaIndex % DATA_CONTENT.asmaulHusna.length];
    
                // Masukkan data ke HTML
                els.ahArab.innerText = item.arab;
                els.ahLatin.innerText = item.latin;
                els.ahIndo.innerText = `"${item.indo}"`;
    
                STATE.asmaulHusnaIndex++;
            } else {
                skip = true;
            }
        }

    // ... (lanjut ke else if sceneKey === 'donation') ...
        else if (sceneKey === 'donation') {
            if (DATA_CONTENT.donations.length > 0) {
                const item = DATA_CONTENT.donations[STATE.donationIndex % DATA_CONTENT.donations.length];
                
                // Set Data Gambar & Teks
                els.donQr.src = item.qr;
                els.donLogo.src = item.logo;
                els.donNumber.innerText = item.number;
                els.donName.innerText = item.name;
                
                // Set Warna Kustom (Sesuai Bank)
                // Reset class dulu, lalu tambah class bawaan + warna bank
                els.donNumber.className = `text-6xl lg:text-7xl font-mono font-bold tracking-tighter mb-4 drop-shadow-lg transition-colors duration-500 ${item.color}`;
                
                // Set Warna Glow Background
                els.donBgGlow.className = `absolute top-0 right-0 w-[50vh] h-[50vh] rounded-full blur-[100px] animate-pulse transition-colors duration-1000 ${item.glow}`;

                STATE.donationIndex++;
            } else {
                skip = true;
            }
        }
    } catch(e) {
        console.error("Render Slide Error:", e);
        skip = true;
    }

    const normalScenes = ['home', 'nextDetail', 'ayat', 'hadits', 'asmaulHusna', 'donation']; // Tambahkan disini juga
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
        div.className = "flex flex-col items-center justify-center rounded-xl transition-all duration-500 relative overflow-hidden group border border-transparent";
        
        div.innerHTML = `
            <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <h3 class="relative z-10 text-[10px] lg:text-xs text-slate-400 uppercase tracking-[0.2em] font-cinzel font-bold mb-1 group-hover:text-gold-400">
                ${k}
            </h3>
            <p class="relative z-10 text-2xl lg:text-4xl text-white font-mono font-bold tracking-tighter leading-none group-hover:text-cyan-400 transition-colors">
                ${CONFIG.prayerTimes[k] || '--:--'}
            </p>
        `;
        els.footer.appendChild(div);
    });
}

// --- 6. INIT ---

document.addEventListener('DOMContentLoaded', async () => {
    log('INIT', 'System Start...');
    initElements();
    
    // Unlock Audio Context (Klik pertama kali untuk mengizinkan suara)
    document.addEventListener('click', function() {
        SFX.beep.play().then(() => { SFX.beep.pause(); SFX.beep.currentTime=0; }).catch(()=>{});
    }, { once: true });

    updateClockAndLogic();
    setInterval(updateClockAndLogic, 1000);

    await loadSchedule();
    await loadContentData();

    renderSlide();
    
    setInterval(() => {
        const n = new Date();
        if(n.getHours() === 0 && n.getMinutes() === 0 && n.getSeconds() === 0) {
            location.reload();
        }
    }, 1000);
});
