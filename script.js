// --- CONFIGURATION ---
const CONFIG = {
    // ID KOTA YOGYAKARTA (UUID v3)
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', 
    
    masjidName: "MASJID JAMI' MU'ALLIMIN",
    address: "Jl. Letjend. S. Parman No. 68 Wirobrajan, Yogyakarta",
    runningText: "Selamat Datang di Masjid Jami' Mu'allimin • Mohon luruskan shaf • Matikan HP saat sholat berlangsung",
    
    duration: { home: 15, nextDetail: 10, scheduleFull: 10, ayat: 25, hadits: 20, info: 10, donation: 10 },
    thresholds: { preAdzan: 12, preIqamah: 10, inPrayer: 20, dzikir: 10, jumatPrep: 30 },
    
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

    prayerTimes: {},
    currentHijriDate: "" 
};

// --- BATCH CONFIGURATION ---
const CONTENT_BATCH_SIZE_TOTAL = 60; 

// --- DATA CONTENT (DEFAULT/FALLBACK) ---
const DATA_CONTENT = {
    ayat: [
        { text: "Maka sesungguhnya bersama kesulitan ada kemudahan.", arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", source: "QS. Al-Insyirah: 5" },
        { text: "Dan dirikanlah shalat, tunaikanlah zakat.", arabic: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ", source: "QS. Al-Baqarah: 43" }
    ],
    hadits: [
        { text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain.", arabic: "خَيْرُ الناسِ أَنْفَعُهُمْ لِلناسِ", source: "HR. Ahmad", grade: "Hasan", hikmah: null }
    ],
    info: [
        { title: "Kerja Bakti", text: "Kerja bakti hari Ahad depan pukul 08:00 WIB." },
        { title: "Laporan Kas", text: "Saldo kas masjid saat ini Rp 15.000.000." }
    ]
};

// --- STATE MANAGEMENT ---
let currentState = { 
    mode: null, 
    slideIndex: 0, 
    subMode: null, 
    currentAyatIndex: 0, 
    currentHadithIndex: 0 
};
let slideTimer = null;
let els = {};
let lastDateString = ""; 

// --- BLOCK 1: SIMPLE HELPERS ---

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

// --- BLOCK 2: INDEPENDENT FETCHERS ---

async function fetchSingleRandomAyat() {
    try {
        const url = "https://api.myquran.com/v2/quran/ayat/acak";
        const res = await fetch(url);
        const json = await res.json();

        if (json.status && json.data?.ayat) {
            const ayat = json.data.ayat;
            const info = json.data.info.surat;
            const textId = (ayat.text || "").replace(/\n/g, "<br>");
            return {
                text: textId,
                arabic: ayat.arab || "",
                source: `QS. ${info.nama.id} (${info.id}): ${ayat.ayah}` 
            };
        }
        return null;
    } catch (e) { return null; }
}

async function fetchSingleRandomHadith() {
    try {
        const res = await fetch("https://api.myquran.com/v3/hadis/enc/random");
        const json = await res.json();
        
        if (json.status && json.data?.text) {
            const d = json.data;
            const arabicText = d.text?.ar || "";
            let indoText = d.text?.id || "";
            indoText = indoText.replace(/\n/g, "<br>");
            let sourceName = d.takhrij || "Muttafaq Alaihi";
            sourceName = sourceName.replace("Diriwayatkan oleh", "").trim();

            return {
                text: indoText,
                arabic: arabicText,
                source: sourceName,
                grade: d.grade || "",
                hikmah: d.hikmah || null
            };
        }
        return null;
    } catch (e) { return null; }
}

async function fetchHijriDate(dateString) {
    try {
        const url = `https://api.myquran.com/v3/cal/hijr/${dateString}`;
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.status && json.data?.date) {
            const d = json.data.date;
            const day = d.day || "";
            const month = (d.month?.en) ? d.month.en : (d.month || "");
            const year = d.year || "";

            CONFIG.currentHijriDate = `${day} ${month} ${year} H`;
            updateClock();
        }
    } catch (e) { console.warn("[API] Gagal ambil Hijriah.", e); }
}

// --- BLOCK 3: COMPLEX LOADERS ---

async function loadMonthlyContent() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const monthKey = `monthly_content_${y}_${m}`; 

    let cachedContent = localStorage.getItem(monthKey);

    if (cachedContent) {
        try {
            const parsed = JSON.parse(cachedContent);
            if (parsed.ayat && parsed.hadits) {
                DATA_CONTENT.ayat = parsed.ayat;
                DATA_CONTENT.hadits = parsed.hadits;
                console.log("[CACHE] Konten bulanan dimuat dari cache.");
                return; 
            }
        } catch(e) { localStorage.removeItem(monthKey); }
    }
    
    console.log(`[API] Mengunduh batch konten baru...`);
    const ayatPromises = Array(CONTENT_BATCH_SIZE_TOTAL).fill(0).map(() => fetchSingleRandomAyat());
    const hadithPromises = Array(CONTENT_BATCH_SIZE_TOTAL).fill(0).map(() => fetchSingleRandomHadith());

    const [newAyatBatch, newHadithBatch] = await Promise.all([
        Promise.all(ayatPromises),
        Promise.all(hadithPromises)
    ]);
    
    const finalAyat = newAyatBatch.filter(item => item !== null);
    const finalHadith = newHadithBatch.filter(item => item !== null);
    
    if (finalAyat.length > 0 || finalHadith.length > 0) {
        if (finalAyat.length > 0) DATA_CONTENT.ayat = finalAyat;
        if (finalHadith.length > 0) DATA_CONTENT.hadits = finalHadith;
        const payload = JSON.stringify({ ayat: DATA_CONTENT.ayat, hadits: DATA_CONTENT.hadits });
        localStorage.setItem(monthKey, payload);
    }
}

async function loadSchedule() {
    const now = new Date();
    const dateKey = getFormattedDate(now); 
    const [y, m, d] = dateKey.split('-'); 
    const monthKey = `jadwal_bulan_${y}_${m}`; 

    let monthlyData = localStorage.getItem(monthKey);
    let todaySchedule = null;

    if (monthlyData) {
        try {
            const parsedData = JSON.parse(monthlyData);
            if (parsedData[dateKey]) todaySchedule = parsedData[dateKey];
        } catch (e) { localStorage.removeItem(monthKey); }
    }

    if (!todaySchedule) {
        try {
            const url = `https://api.myquran.com/v3/sholat/jadwal/${CONFIG.cityId}/${y}/${m}`; 
            const res = await fetch(url);
            const json = await res.json();
            
            if (json.status && json.data?.jadwal) {
                let storagePayload = {};
                if (Array.isArray(json.data.jadwal)) {
                    json.data.jadwal.forEach(day => { storagePayload[day.date] = day; });
                } else {
                    storagePayload = json.data.jadwal;
                }
                localStorage.setItem(monthKey, JSON.stringify(storagePayload));
                todaySchedule = storagePayload[dateKey];
            }
        } catch (e) { console.error("[NETWORK ERROR] Gagal ambil jadwal sholat:", e); }
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

    await fetchHijriDate(dateKey); 
    await loadMonthlyContent(); 
}

// --- BLOCK 4: CORE LOGIC & RENDERING ---

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("Memulai Sistem...");
        
        els = {
            // HEADER ELEMENTS (NEW)
            headerClock: document.getElementById('header-clock'),
            headerDate: document.getElementById('header-date'),
            headerNextName: document.getElementById('header-next-name'),
            headerCountdown: document.getElementById('header-countdown'),
            
            masjidName: document.getElementById('masjid-name'), // Note: di HTML baru diganti Logo, tapi mungkin ID masih ada
            address: document.getElementById('masjid-address'), // Note: di HTML baru diganti Logo, tapi mungkin ID masih ada
            runningText: document.getElementById('running-text'),
            progressBar: document.getElementById('slide-progress'),
            
            homeNextName: document.getElementById('home-next-name'),
            homeNextTime: document.getElementById('home-next-time'),
            homePrayerList: document.getElementById('home-prayer-list'),
            nextDetailName: document.getElementById('next-detail-name'),
            nextDetailTime: document.getElementById('next-detail-time'),
            scheduleGridFull: document.getElementById('schedule-grid-full'),
            
            ayatText: document.getElementById('ayat-text'),
            ayatArabic: document.getElementById('ayat-arabic'), 
            ayatSource: document.getElementById('ayat-source'),
            
            haditsText: document.getElementById('hadits-text'),
            haditsArabic: document.getElementById('hadits-arabic'),
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
                dzikir: document.getElementById('scene-dzikir'),
                jumat: document.getElementById('scene-jumat'),
                kajian: document.getElementById('scene-kajian')
            }
        };

        if(els.runningText) els.runningText.textContent = CONFIG.runningText;

        await loadSchedule();

        updateClock(); 
        setInterval(updateClock, 1000);
        setInterval(checkSystemState, 1000);

        setMode('NORMAL');

    } catch(e) { console.error("Init Error:", e); }
});

function updateClock() {
    const now = new Date();
    
    const currentDateString = getFormattedDate(now);
    if (lastDateString !== "" && lastDateString !== currentDateString) {
        loadSchedule(); 
        currentState.currentAyatIndex = 0;
        currentState.currentHadithIndex = 0;
    }
    lastDateString = currentDateString;

    // UPDATE CLOCK (Header)
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if(els.headerClock) els.headerClock.textContent = timeStr;
    
    // UPDATE DATE (Header)
    if(els.headerDate) {
        const masehi = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (CONFIG.currentHijriDate) {
            els.headerDate.textContent = `${masehi} • ${CONFIG.currentHijriDate}`;
        } else {
            els.headerDate.textContent = masehi;
        }
    }
    
    // HEADER COUNTDOWN LOGIC
    const next = getNextPrayer(now);
    if(next) {
        // Update Names
        if(els.headerNextName) els.headerNextName.textContent = next.name;
        if(els.homeNextName) els.homeNextName.textContent = next.name;
        if(els.homeNextTime) els.homeNextTime.textContent = next.timeStr;
        if(els.nextDetailName) els.nextDetailName.textContent = next.name;
        if(els.nextDetailTime) els.nextDetailTime.textContent = next.timeStr;

        // Calculate Header Countdown
        const [h, m] = next.timeStr.split(':').map(Number);
        let targetTime = new Date(now);
        targetTime.setHours(h, m, 0, 0);
        
        if (targetTime < now) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const diff = targetTime - now;
        const hh = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const mm = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const ss = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        
        if(els.headerCountdown) {
            els.headerCountdown.textContent = `-${hh}:${mm}:${ss}`;
        }
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
                els.countdownTimer.className = "text-[16vh] font-mono font-bold leading-none tracking-widest text-gold-400";
            } else {
                els.countdownTitle.className = "text-5xl font-bold uppercase tracking-widest mb-6 text-emerald-400 animate-pulse";
                els.countdownTimer.className = "text-[16vh] font-mono font-bold leading-none tracking-widest text-emerald-400";
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

    // --- RENDERING AYAT ---
    if (key === 'ayat' && els.ayatText) {
        const totalAyat = DATA_CONTENT.ayat.length;
        const item = DATA_CONTENT.ayat[currentState.currentAyatIndex % totalAyat];
        
        if (totalAyat > 0) {
            if (els.ayatArabic) els.ayatArabic.textContent = item.arabic || "";
            els.ayatText.innerHTML = `"${item.text}"`;
            els.ayatSource.textContent = item.source;
            currentState.currentAyatIndex = (currentState.currentAyatIndex + 1) % totalAyat;
        } else {
            els.ayatText.innerHTML = '"Gagal memuat ayat acak."';
            els.ayatSource.textContent = 'Membutuhkan koneksi internet untuk fetch bulanan.';
        }
    } 
    
    // --- RENDERING HADITS ---
    else if (key === 'hadits' && els.haditsText) {
        const totalHadith = DATA_CONTENT.hadits.length;
        const item = DATA_CONTENT.hadits[currentState.currentHadithIndex % totalHadith];
        
        if (totalHadith > 0) {
            if (els.haditsArabic) els.haditsArabic.textContent = item.arabic || "";
            let contentHTML = `"${item.text}"`;
            if (item.hikmah) {
                contentHTML += `<br><br><span class="text-3xl text-emerald-400 font-sans tracking-wide block mt-4 pt-4 border-t border-emerald-500/30">💡 Hikmah: ${item.hikmah}</span>`;
            }
            els.haditsText.innerHTML = contentHTML;
            
            let sourceInfo = item.source;
            if (item.grade) sourceInfo += ` • (${item.grade})`;
            els.haditsSource.textContent = sourceInfo;
            currentState.currentHadithIndex = (currentState.currentHadithIndex + 1) % totalHadith;
        } else {
             els.haditsText.innerHTML = '"Gagal memuat hadis acak."';
             els.haditsSource.textContent = 'Membutuhkan koneksi internet untuk fetch bulanan.';
        }
    } 
    
    // --- RENDERING INFO/DONATION ---
    else if (key === 'info' && els.infoTitle) {
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
        div.className = "flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent relative group overflow-hidden transition-all duration-300 hover:bg-white/10";
        div.innerHTML = `
            <div class="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <span class="text-[0.65rem] text-emerald-400/80 uppercase tracking-widest mb-1 font-bold z-10">${key}</span>
            <span class="text-xl font-display font-bold text-white z-10 drop-shadow-md">${CONFIG.prayerTimes[key] || '--:--'}</span>
        `;
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
        const baseClass = "flex flex-col items-center justify-center p-5 rounded-2xl border backdrop-blur-sm relative overflow-hidden transition-transform duration-500 hover:scale-105";
        const colorClass = isWajib 
            ? "bg-gradient-to-br from-emerald-950/50 to-emerald-900/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
            : "bg-white/5 border-white/5";
        const titleColor = isWajib ? "text-emerald-400 text-glow-emerald" : "text-gray-400";
        const timeColor = isWajib ? "text-white" : "text-gray-300";
        const div = document.createElement('div');
        div.className = `${baseClass} ${colorClass}`;
        const glowEffect = isWajib ? `<div class="absolute -top-10 -right-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>` : '';
        div.innerHTML = `
            ${glowEffect}
            <span class="text-sm font-bold uppercase tracking-[0.2em] mb-2 ${titleColor} z-10">${name}</span>
            <span class="text-4xl font-display font-bold ${timeColor} z-10 tracking-tight">${time}</span>
        `;
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
