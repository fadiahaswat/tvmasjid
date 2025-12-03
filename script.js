// --- CONFIGURATION ---
const CONFIG = {
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', 
    masjidName: "MASJID JAMI' MU'ALLIMIN",
    address: "Jl. Letjend. S. Parman No. 68 Wirobrajan, Yogyakarta",
    runningText: "Selamat Datang di Masjid Jami' Mu'allimin • Mohon luruskan shaf • Matikan HP saat sholat berlangsung • Jagalah kebersihan masjid",
    
    // Durasi (detik)
    duration: { home: 15, nextDetail: 10, scheduleFull: 10, ayat: 25, hadits: 25, info: 15, donation: 15 },
    
    // Thresholds (menit)
    thresholds: { preAdzan: 12, preIqamah: 10, inPrayer: 20, dzikir: 10, jumatPrep: 30 },
    
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

    prayerTimes: {},
    currentHijriDate: "..." 
};

// --- BATCH CONFIG ---
// Kita mulai dengan 10 dulu biar ringan dan tidak timeout
const CONTENT_BATCH_SIZE_TOTAL = 10; 

// --- CONTENT STORE ---
const DATA_CONTENT = {
    ayat: [
        { text: "Maka sesungguhnya bersama kesulitan ada kemudahan.", arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", source: "QS. Al-Insyirah: 5" },
        { text: "Dan dirikanlah shalat, tunaikanlah zakat.", arabic: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ", source: "QS. Al-Baqarah: 43" }
    ],
    hadits: [
        { text: "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain.", arabic: "خَيْرُ الناسِ أَنْفَعُهُمْ لِلناسِ", source: "HR. Ahmad", grade: "Hasan", hikmah: null }
    ],
    infoList: [
        { title: "Kajian Ahad Pagi", time: "Ahad, 06:00 - 07:00 WIB", desc: "Tafsir Jalalain bersama Ust. Fulan", icon: "📖", color: "text-cyan-300" },
        { title: "Tahajjud Berjamaah", time: "Setiap Malam Jumat", desc: "Mulai pukul 03:00 WIB dilanjutkan Sahur Bersama", icon: "🌙", color: "text-emerald-300" },
        { title: "Jumat Berkah", time: "Jumat, 11:00 WIB", desc: "Berbagi Nasi Bungkus untuk Jamaah & Dhuafa", icon: "🍱", color: "text-gold-300" },
        { title: "TPA Anak-Anak", time: "Senin - Kamis, 16:00", desc: "Belajar Al-Qur'an, Fiqih, dan Akhlak", icon: "🧒", color: "text-rose-300" }
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

// --- HELPERS ---

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

// --- FETCHERS (DENGAN LOGGING) ---

async function fetchSingleRandomAyat() {
    try {
        const res = await fetch("https://api.myquran.com/v2/quran/ayat/acak");
        const json = await res.json();
        if (json.status && json.data?.ayat) {
            const ayat = json.data.ayat;
            const info = json.data.info.surat;
            const textId = (ayat.text || "").replace(/\n/g, "<br>");
            return { text: textId, arabic: ayat.arab || "", source: `QS. ${info.nama.id} (${info.id}): ${ayat.ayah}` };
        }
        return null;
    } catch (e) { 
        console.warn("[API ERROR] Ayat:", e);
        return null; 
    }
}

async function fetchSingleRandomHadith() {
    try {
        const res = await fetch("https://api.myquran.com/v3/hadis/enc/random");
        const json = await res.json();
        if (json.status && json.data?.text) {
            const d = json.data;
            let indoText = (d.text?.id || "").replace(/\n/g, "<br>");
            let sourceName = (d.takhrij || "Muttafaq Alaihi").replace("Diriwayatkan oleh", "").trim();
            return { text: indoText, arabic: d.text?.ar || "", source: sourceName, grade: d.grade || "", hikmah: d.hikmah || null };
        }
        return null;
    } catch (e) { 
        console.warn("[API ERROR] Hadis:", e);
        return null; 
    }
}

async function fetchHijriDate(dateString) {
    try {
        console.log(`[API] Fetching Hijri for: ${dateString}`);
        const res = await fetch(`https://api.myquran.com/v3/cal/hijr/${dateString}`);
        const json = await res.json();
        
        console.log("[API] Hijri Response:", json);

        if (json.status && json.data?.date) {
            const d = json.data.date;
            // Handle struktur data yang mungkin beda
            const dDay = d.day || "";
            const dMonth = (typeof d.month === 'object') ? d.month.en : d.month;
            const dYear = d.year || "";
            
            CONFIG.currentHijriDate = `${dDay} ${dMonth} ${dYear} H`;
            console.log("[SYSTEM] Hijriah Updated:", CONFIG.currentHijriDate);
            
            // Langsung update UI
            if(els.headerDateHijri) els.headerDateHijri.textContent = CONFIG.currentHijriDate;
            if(els.homeDateHijri) els.homeDateHijri.textContent = CONFIG.currentHijriDate;
        }
    } catch (e) { console.error("[API ERROR] Hijri:", e); }
}

// --- LOADERS ---

async function loadMonthlyContent() {
    const now = new Date();
    const monthKey = `batch_content_${now.getFullYear()}_${now.getMonth()}`;
    let cached = localStorage.getItem(monthKey);

    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed.ayat && parsed.hadits && parsed.ayat.length > 0) {
                DATA_CONTENT.ayat = parsed.ayat;
                DATA_CONTENT.hadits = parsed.hadits;
                console.log("[CACHE] Konten batch loaded from storage.");
                return;
            }
        } catch(e) { localStorage.removeItem(monthKey); }
    }
    
    console.log("[API] Downloading New Content Batch...");
    
    // Gunakan loop sederhana dulu untuk debugging, Promise.all kadang fail jika satu request fail
    let newAyats = [];
    let newHadits = [];

    // Ambil 5 Ayat
    for (let i = 0; i < 5; i++) {
        const a = await fetchSingleRandomAyat();
        if(a) newAyats.push(a);
    }
    
    // Ambil 5 Hadis
    for (let i = 0; i < 5; i++) {
        const h = await fetchSingleRandomHadith();
        if(h) newHadits.push(h);
    }
    
    if (newAyats.length > 0) DATA_CONTENT.ayat = newAyats;
    if (newHadits.length > 0) DATA_CONTENT.hadits = newHadits;
    
    if (newAyats.length > 0 || newHadits.length > 0) {
        localStorage.setItem(monthKey, JSON.stringify({ ayat: DATA_CONTENT.ayat, hadits: DATA_CONTENT.hadits }));
        console.log(`[API] Batch Success: ${newAyats.length} Ayat, ${newHadits.length} Hadis`);
    } else {
        console.warn("[API] Batch failed, using default data.");
    }
}

async function loadSchedule() {
    const now = new Date();
    const dateKey = getFormattedDate(now);
    const monthKey = `jadwal_${now.getFullYear()}_${now.getMonth()+1}`;
    
    let monthlyData = localStorage.getItem(monthKey);
    let todaySchedule = null;

    if (monthlyData) {
        try {
            const parsed = JSON.parse(monthlyData);
            if (parsed[dateKey]) todaySchedule = parsed[dateKey];
        } catch (e) { localStorage.removeItem(monthKey); }
    }

    if (!todaySchedule) {
        try {
            console.log("[API] Fetching Schedule...");
            // Gunakan format YYYY-MM (Strip)
            const y = now.getFullYear();
            const m = String(now.getMonth()+1).padStart(2,'0');
            const d = String(now.getDate()).padStart(2,'0');
            
            // Coba Fetch Bulanan
            const url = `https://api.myquran.com/v3/sholat/jadwal/${CONFIG.cityId}/${y}-${m}`;
            const res = await fetch(url);
            const json = await res.json();
            
            console.log("[API] Schedule Response:", json);

            if (json.status && json.data?.jadwal) {
                let storage = {};
                if (Array.isArray(json.data.jadwal)) {
                    json.data.jadwal.forEach(day => storage[day.date] = day);
                } else {
                    // Fallback jika API return object single (kadang terjadi di v3 jika parameter hari salah)
                    storage[json.data.jadwal.date] = json.data.jadwal;
                }
                localStorage.setItem(monthKey, JSON.stringify(storage));
                todaySchedule = storage[dateKey];
            } else {
                // Fallback Harian jika Bulanan Gagal
                console.warn("[API] Bulanan gagal/kosong, coba harian...");
                const urlDaily = `https://api.myquran.com/v3/sholat/jadwal/${CONFIG.cityId}/${y}-${m}-${d}`;
                const resDaily = await fetch(urlDaily);
                const jsonDaily = await resDaily.json();
                if(jsonDaily.status && jsonDaily.data?.jadwal) {
                    todaySchedule = jsonDaily.data.jadwal;
                }
            }
        } catch (e) { console.error("[API ERROR] Schedule:", e); }
    }

    if (todaySchedule) {
        console.log("[SYSTEM] Schedule Data Loaded:", todaySchedule);
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
    } else {
        console.warn("[SYSTEM] Using Default Schedule.");
        CONFIG.prayerTimes = { ...CONFIG.defaultPrayerTimes };
    }
    
    renderFooterSchedule(); 
    
    // Panggil Fetcher Lainnya
    await fetchHijriDate(dateKey);
    await loadMonthlyContent();
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("🚀 Starting Smart Masjid System...");
        
        els = {
            // Header
            headerClock: document.getElementById('header-clock'),
            headerDateMasehi: document.getElementById('header-date-masehi'),
            headerDateHijri: document.getElementById('header-date-hijri'),
            headerNextName: document.getElementById('header-next-name'),
            headerCountdown: document.getElementById('header-countdown'),
            
            // Home
            homeDateMasehi: document.getElementById('home-date-masehi'),
            homeDateHijri: document.getElementById('home-date-hijri'),
            homeNextName: document.getElementById('home-next-name'),
            homeNextTime: document.getElementById('home-next-time'),
            homePrayerList: document.getElementById('home-prayer-list'),
            
            // Next Detail
            nextDetailName: document.getElementById('next-detail-name'),
            nextDetailTime: document.getElementById('next-detail-time'),
            
            // Content
            ayatText: document.getElementById('ayat-text'),
            ayatArabic: document.getElementById('ayat-arabic'),
            ayatSource: document.getElementById('ayat-source'),
            haditsText: document.getElementById('hadits-text'),
            haditsArabic: document.getElementById('hadits-arabic'),
            haditsSource: document.getElementById('hadits-source'),
            infoGrid: document.getElementById('info-grid'),
            
            // Countdown
            countdownTitle: document.getElementById('countdown-title'),
            countdownName: document.getElementById('countdown-name'),
            countdownTimer: document.getElementById('countdown-timer'),
            
            // Footer
            footerSchedule: document.getElementById('footer-schedule'),
            progressBar: document.getElementById('slide-progress'),
            runningText: document.getElementById('running-text'),
            runningTextDup: document.getElementById('running-text-duplicate'),
            
            scenes: {
                home: document.getElementById('scene-home'),
                nextDetail: document.getElementById('scene-next-detail'),
                ayat: document.getElementById('scene-ayat'),
                hadits: document.getElementById('scene-hadits'),
                info: document.getElementById('scene-info'),
                donation: document.getElementById('scene-donation'),
                countdown: document.getElementById('scene-countdown'),
                prayer: document.getElementById('scene-prayer')
            }
        };

        // SET RUNNING TEXT LANGSUNG (Debugging: Pastikan ini jalan)
        if(els.runningText) {
            console.log("[UI] Setting Running Text 1...");
            els.runningText.textContent = CONFIG.runningText;
        } else {
            console.error("[UI ERROR] Element #running-text not found!");
        }
        
        if(els.runningTextDup) {
            console.log("[UI] Setting Running Text 2...");
            els.runningTextDup.textContent = CONFIG.runningText;
        }

        await loadSchedule();
        updateClock();
        setInterval(updateClock, 1000);
        setInterval(checkSystemState, 1000);
        setMode('NORMAL');

    } catch(e) { console.error("Init Error", e); }
});

// --- CORE LOGIC ---
function updateClock() {
    const now = new Date();
    const currentDateString = getFormattedDate(now);
    if (lastDateString !== "" && lastDateString !== currentDateString) {
        console.log("[SYSTEM] New Day Detected. Refreshing...");
        loadSchedule();
        currentState.currentAyatIndex = 0;
        currentState.currentHadithIndex = 0;
    }
    lastDateString = currentDateString;

    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const masehiDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    if(els.headerClock) els.headerClock.textContent = timeStr;
    if(els.headerDateMasehi) els.headerDateMasehi.textContent = masehiDate;
    if(els.headerDateHijri) els.headerDateHijri.textContent = CONFIG.currentHijriDate;
    
    if(els.homeDateMasehi) els.homeDateMasehi.textContent = masehiDate;
    if(els.homeDateHijri) els.homeDateHijri.textContent = CONFIG.currentHijriDate;

    const next = getNextPrayer(now);
    if(next) {
        const [h, m] = next.timeStr.split(':').map(Number);
        let targetTime = new Date(now);
        targetTime.setHours(h, m, 0, 0);
        if (targetTime < now) targetTime.setDate(targetTime.getDate() + 1);
        
        const diff = targetTime - now;
        const hh = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const mm = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const ss = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        
        if(els.headerCountdown) els.headerCountdown.textContent = `-${hh}:${mm}:${ss}`;
        if(els.headerNextName) els.headerNextName.textContent = next.name;
        
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
            const [h, m] = CONFIG.prayerTimes[key].split(':').map(Number);
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
        const [h, m] = CONFIG.prayerTimes[name].split(':').map(Number);
        const pDate = new Date(now);
        pDate.setHours(h, m, 0, 0);
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
        }
        if(els.scenes[sceneKey]) els.scenes[sceneKey].classList.remove('hidden-slide');
    }
}

const SLIDES_ORDER = ['home', 'nextDetail', 'ayat', 'hadits', 'info', 'donation'];

function nextNormalSlide() {
    if (currentState.mode !== 'NORMAL') return;
    const key = SLIDES_ORDER[currentState.slideIndex];
    let duration = CONFIG.duration[key] || 10;

    if (key === 'ayat' && els.ayatText) {
        const item = DATA_CONTENT.ayat[currentState.currentAyatIndex % DATA_CONTENT.ayat.length];
        if (els.ayatArabic) els.ayatArabic.textContent = item.arabic || "";
        els.ayatText.innerHTML = `"${item.text}"`;
        els.ayatSource.textContent = item.source;
        currentState.currentAyatIndex++;
    } 
    else if (key === 'hadits' && els.haditsText) {
        const item = DATA_CONTENT.hadits[currentState.currentHadithIndex % DATA_CONTENT.hadits.length];
        if (els.haditsArabic) els.haditsArabic.textContent = item.arabic || "";
        let contentHTML = `"${item.text}"`;
        if (item.hikmah) contentHTML += `<br><br><span class="text-3xl text-emerald-400 font-sans tracking-wide block mt-4 pt-4 border-t border-emerald-500/30">💡 Hikmah: ${item.hikmah}</span>`;
        els.haditsText.innerHTML = contentHTML;
        let sourceInfo = item.source;
        if (item.grade) sourceInfo += ` • (${item.grade})`;
        els.haditsSource.textContent = sourceInfo;
        currentState.currentHadithIndex++;
    }
    else if (key === 'info' && els.infoGrid) {
        els.infoGrid.innerHTML = '';
        DATA_CONTENT.infoList.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-white/5 border border-white/10 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-md transform hover:scale-105 transition duration-500 hover:bg-white/10";
            card.innerHTML = `
                <div class="text-4xl bg-white/10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg">${item.icon}</div>
                <div>
                    <h3 class="text-2xl font-bold ${item.color || 'text-white'} mb-1">${item.title}</h3>
                    <p class="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">${item.time}</p>
                    <p class="text-lg text-gray-300 leading-snug">${item.desc}</p>
                </div>
            `;
            els.infoGrid.appendChild(card);
        });
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

function renderFooterSchedule() {
    if (!els.footerSchedule) return;
    const keys = ['tahajjud', 'imsak', 'shubuh', 'syuruq', 'dhuha', 'dzuhur', 'ashar', 'maghrib', 'isya'];
    els.footerSchedule.innerHTML = '';
    
    keys.forEach(key => {
        const div = document.createElement('div');
        const now = new Date();
        const next = getNextPrayer(now);
        const isNext = next && next.name === key.toUpperCase();
        
        const activeClass = isNext ? "bg-emerald-600 border-emerald-400 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-10" : "bg-white/5 border-white/5 opacity-70 hover:opacity-100";
        const textClass = isNext ? "text-white" : "text-gray-400";
        const timeClass = isNext ? "text-white font-black" : "text-emerald-400";

        div.className = `flex flex-col items-center justify-center rounded-2xl border h-full transition-all duration-500 transform ${activeClass}`;
        div.innerHTML = `
            <span class="text-[0.6rem] uppercase tracking-widest font-bold mb-0.5 ${textClass}">${key}</span>
            <span class="text-lg font-mono ${timeClass}">${CONFIG.prayerTimes[key] || '--:--'}</span>
        `;
        els.footerSchedule.appendChild(div);
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
