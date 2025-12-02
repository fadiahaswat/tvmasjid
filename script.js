// --- CONFIGURATION ---
const CONFIG = {
    // ID KOTA YOGYAKARTA (UUID v3)
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
    // Data default (akan digeser oleh API)
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
    date.setMinutes(date.getMinutes() - 210); // -3.5 jam
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getFormattedDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// --- DATA FETCHING FUNCTIONS ---

// 1. Fetch Hadis Random (FIXED STRICT MODE)
async function fetchRandomHadith() {
    try {
        console.log("[API] Mengambil Hadis Random...");
        const res = await fetch("https://api.myquran.com/v3/hadis/enc/random");
        const json = await res.json();
        
        console.log("[DEBUG] JSON Hadis:", json); 

        // Cek struktur JSON sesuai yang Anda kirim
        if (json.status && json.data && json.data.text && json.data.text.id) {
            
            // 1. Ambil Teks Indonesia (data.text.id)
            const textContent = json.data.text.id;
            
            // 2. Ambil Takhrij/Sumber (data.takhrij)
            const sourceContent = json.data.takhrij || "Hadits Shahih";

            const newHadith = {
                text: textContent, 
                source: sourceContent
            };
            
            // Masukkan ke index 0 agar langsung muncul di slide berikutnya
            DATA_CONTENT.hadits.unshift(newHadith);
            console.log("[API] Hadis berhasil ditambahkan:", sourceContent);
        } else {
            console.warn("[API] Struktur JSON Hadis berbeda dari ekspektasi.");
        }
    } catch (e) {
        console.warn("[API] Gagal ambil hadis. Menggunakan data statis.", e);
    }
}

// 2. Fetch Tanggal Hijriah
async function fetchHijriDate(dateString) {
    try {
        const url = `https://api.myquran.com/v3/cal/hijr/${dateString}`;
        console.log("[API] Mengambil Hijriah:", url);
        
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.status && json.data && json.data.date) {
            const d = json.data.date;
            
            const day = d.day || "";
            // Handle jika month object atau string
            const month = (d.month && d.month.en) ? d.month.en : (d.month || "");
            const year = d.year || "";

            CONFIG.currentHijriDate = `${day} ${month} ${year} H`;
            console.log("[API] Tanggal Hijriah set:", CONFIG.currentHijriDate);
            
            updateClock();
        }
    } catch (e) {
        console.warn("[API] Gagal ambil Hijriah.", e);
    }
}

// 3. Main Schedule Loader
async function loadSchedule() {
    const now = new Date();
    const dateKey = getFormattedDate(now); 
    
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
            
            // Clock & Date
            homeClock: document.getElementById('home-clock'),
            homeClockReflect: document.getElementById('home-clock-reflect'),
            homeDate: document.getElementById('home-date'),
            
            // Next Prayer Widget
            homeNextName: document.getElementById('home-next-name'),
            homeNextTime: document.getElementById('home-next-time'),
            homePrayerList: document.getElementById('home-prayer-list'),
            
            // Detail Scene
            nextDetailName: document.getElementById('next-detail-name'),
            nextDetailTime: document.getElementById('next-detail-time'),
            
            // Full Schedule
            scheduleGridFull: document.getElementById('schedule-grid-full'),
            
            // Content
            ayatText: document.getElementById('ayat-text'),
            ayatSource: document.getElementById('ayat-source'),
            haditsText: document.getElementById('hadits-text'),
            haditsSource: document.getElementById('hadits-source'),
            infoTitle: document.getElementById('info-title'),
            infoText: document.getElementById('info-text'),
            
            // Countdown
            countdownTitle: document.getElementById('countdown-title'),
            countdownName: document.getElementById('countdown-name'),
            countdownTimer: document.getElementById('countdown-timer'),
            countdownBg: document.getElementById('countdown-bg'),
            
            // Scenes List
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

    // JAM (Utama + Refleksi)
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' });
    if(els.homeClock) els.homeClock.textContent = timeStr;
    if(els.homeClockReflect) els.homeClockReflect.textContent = timeStr;
    
    // TANGGAL (Masehi + Hijriah)
    if(els.homeDate) {
        const masehi = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        if (CONFIG.currentHijriDate) {
            els.homeDate.textContent = `${masehi} • ${CONFIG.currentHijriDate}`;
        } else {
            els.homeDate.textContent = masehi;
        }
    }
    
    const next = getNextPrayer(now);
    if(next) {
        if(els.homeNextName) els.homeNextName.textContent = next.name;
        if(els.homeNextTime) els.homeNextTime.textContent = next.timeStr;
        if(els.nextDetailName) els.nextDetailName.textContent = next.name;
        if(els
