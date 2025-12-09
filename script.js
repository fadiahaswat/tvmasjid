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
        inPrayer: 15,    
        dzikir: 6,      // Default 6 menit (Untuk Dzuhur, Maghrib, Isya)
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

// --- 1. DATA DZIKIR PAGI (KHUSUS SHUBUH) ---
const DATA_DZIKIR = [
    { text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ<br>اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ", note: "Ayat Kursi - Dibaca 1x" },
    { text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ<br>قُلْ هُوَ اللَّهُ أَحَدٌ ۞ اللَّهُ الصَّمَدُ ۞ لَمْ يَلِدْ وَلَمْ يُولَدْ ۞ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ", note: "QS. Al-Ikhlas - Dibaca 3x" },
    { text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ<br>قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۞ مِنْ شَرِّ مَا خَلَقَ ۞ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۞ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۞ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ", note: "QS. Al-Falaq - Dibaca 3x" },
    { text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ<br>قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۞ مَلِكِ النَّاسِ ۞ إِلَهِ النَّاسِ ۞ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۞ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۞ مِنَ الْجِنَّةِ وَالنَّاسِ", note: "QS. An-Nas - Dibaca 3x" },
    { text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ", note: "Dibaca 1x" },
    { text: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ", note: "Dibaca 1x" },
    { text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", note: "Sayyidul Istighfar" },
    { text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ<br>اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ", note: "Dibaca 3x" },
    { text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي", note: "Dibaca 1x" },
    { text: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ", note: "Dibaca 1x" },
    { text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", note: "Dibaca 3x" },
    { text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا", note: "Dibaca 3x" },
    { text: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ", note: "Dibaca 1x" },
    { text: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ", note: "Dibaca 1x" },
    { text: "سُبْحَانَ اللهِ وَبِحَمْدِهِ : عَدَدَ خَلْقِهِ ، وَرِضَا نَفْسِهِ ، وَزِنَةَ عَرْشِهِ ، وَمِدَادَ كَلِمَاتِهِ", note: "Dibaca 3x" }
];

// --- 2. DATA DZIKIR PETANG (KHUSUS ASHAR) ---
const DATA_DZIKIR_PETANG = [
    { text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ<br>اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ", note: "Ayat Kursi - Dibaca 1x" },
    { text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ<br>قُلْ هُوَ اللَّهُ أَحَدٌ ۞ اللَّهُ الصَّمَدُ ۞ لَمْ يَلِدْ وَلَمْ يُولَدْ ۞ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ", note: "QS. Al-Ikhlas - Dibaca 3x" },
    { text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ<br>قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۞ مِنْ شَرِّ مَا خَلَقَ ۞ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۞ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۞ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ", note: "QS. Al-Falaq - Dibaca 3x" },
    { text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ<br>قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۞ مَلِكِ النَّاسِ ۞ إِلَهِ النَّاسِ ۞ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۞ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۞ مِنَ الْجِنَّةِ وَالنَّاسِ", note: "QS. An-Nas - Dibaca 3x" },
    { text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ", note: "Dibaca 1x" },
    { text: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ", note: "Dibaca 1x" },
    { text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", note: "Sayyidul Istighfar" },
    { text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ<br>اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ", note: "Dibaca 3x" },
    { text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي", note: "Dibaca 1x" },
    { text: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَى نَفْسِي سُوءًا أَوْ أَجُرَّهُ إِلَى مُسْلِمٍ", note: "Dibaca 1x" },
    { text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", note: "Dibaca 3x" },
    { text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا", note: "Dibaca 3x" },
    { text: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ أَبَدًا", note: "Dibaca 1x" },
    { text: "أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ", note: "Dibaca 1x" },
    { text: "أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", note: "Dibaca 3x" },
    { text: "سُبْحَانَ اللهِ وَبِحَمْدِهِ", note: "Dibaca 100x" }
];

// --- 3. DATA DZIKIR UMUM (DZUHUR, MAGHRIB, ISYA) ---
const DATA_DZIKIR_UMUM = [
    { text: "أَسْتَغْفِرُ اللهَ (٣x)<br>اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", note: "Istighfar & Doa Keselamatan" },
    { text: "اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ", note: "Doa Ketetapan Allah" },
    { text: "سُبْحَانَ اللَّهِ (٣٣x) <br> الْحَمْدُ لِلَّهِ (٣٣x) <br> اللَّهُ أَكْبَرُ (٣٣x)", note: "Tasbih, Tahmid, Takbir" },
    { text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", note: "Tahlil" },
    { text: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ", note: "Tahlil & Pujian" },
    { text: "لَا إِلَهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ", note: "Memurnikan Agama" },
    { text: "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ كَمَا يُحِبُّ رَبُّنَا وَيَرْضَى<br>اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", note: "Pujian & Shalawat" },
    { text: "اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا<br>اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا", note: "Doa Orang Tua & Rezeki" },
    { text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى<br>اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ", note: "Doa Petunjuk & Syukur" },
    { text: "اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلًا<br>رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَى وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَدْخِلْنِي بِرَحْمَتِكَ فِي عِبَادِكَ الصَّالِحِينَ", note: "Doa Kemudahan & Syukur Nikmat" },
    { text: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ<br>رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", note: "Doa Sapu Jagat" },
    { text: "سُبْحَانَ رَبِّكَ رَبِّ الْعِزَّةِ عَمَّا يَصِفُونَ وَسَلَامٌ عَلَى الْمُرْسَلِينَ وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", note: "Penutup" }
];

// VARIABEL GLOBAL PENTING
let ACTIVE_DZIKIR_DATA = []; 
STATE.dzikirInterval = null;
STATE.dzikirIndex = 0;

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

// Fungsi untuk menentukan ukuran font secara adaptif
// --- REVISI FUNGSI UKURAN FONT (Lebih Kecil & Proporsional) ---
function getAdaptiveClass(text, type) {
    if (!text) return '';
    const len = text.length;

    if (type === 'arab') {
        // Logika Baru: Ukuran disesuaikan agar tidak memenuhi layar
        // Pendek (< 60 karakter): Besar tapi wajar
        if (len < 60) return 'text-[7vh] lg:text-[9vh] leading-[1.6]'; 
        
        // Sedang (< 100 karakter): Menengah
        if (len < 100) return 'text-[5vh] lg:text-[7vh] leading-[1.8]';
        
        // Panjang (< 200 karakter): Kecil agar muat
        if (len < 200) return 'text-[4vh] lg:text-[5vh] leading-[2]';
        
        // Sangat Panjang: Lebih kecil lagi
        return 'text-[3vh] lg:text-[4vh] leading-[2.2]'; 
    } else {
        // Untuk teks Latin
        if (len > 300) return 'text-lg leading-snug';
        if (len > 150) return 'text-xl leading-normal';
        return 'text-2xl lg:text-3xl leading-relaxed'; 
    }
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
    const cacheKey = 'smart_masjid_content_v5'; 
    let loadedFromNet = false;

    // 1. COBA AMBIL DARI INTERNET
    if (navigator.onLine) {
        try {
            // Fetch Ayat
            const tasksAyat = Array(5).fill(0).map(async () => {
                try {
                    const r = await fetch("https://api.myquran.com/v2/quran/ayat/acak");
                    const j = await r.json();
                    return j.status ? { text: j.data.ayat.text.replace(/\n/g, "<br>"), arabic: j.data.ayat.arab, source: `QS. ${j.data.info.surat.nama.id}: ${j.data.ayat.ayah}` } : null;
                } catch { return null; }
            });

            // Fetch Hadits
            const tasksHadits = Array(5).fill(0).map(async () => {
                try {
                    const r = await fetch("https://api.myquran.com/v3/hadis/enc/random");
                    const j = await r.json();
                    return j.status ? { text: j.data.text.id.replace(/\n/g, "<br>"), arabic: j.data.text.ar, source: j.data.takhrij } : null;
                } catch { return null; }
            });
            
            // Fetch Asmaul Husna
            const tasksHusna = Array(5).fill(0).map(async () => {
                try {
                    const r = await fetch("https://api.myquran.com/v2/husna/acak");
                    const j = await r.json();
                    return j.status ? j.data : null;
                } catch { return null; }
            });

            // Tunggu Semua Selesai
            const [resAyat, resHadits, resHusna] = await Promise.all([
                Promise.all(tasksAyat), 
                Promise.all(tasksHadits),
                Promise.all(tasksHusna)
            ]);
            
            const validAyat = resAyat.filter(x => x);
            const validHadits = resHadits.filter(x => x);
            const validHusna = resHusna.filter(x => x);

            if (validAyat.length > 0) {
                DATA_CONTENT.ayat = validAyat;
                DATA_CONTENT.hadits = validHadits;
                DATA_CONTENT.asmaulHusna = validHusna;
                
                // Simpan ke Cache
                localStorage.setItem(cacheKey, JSON.stringify({ 
                    ayat: validAyat, 
                    hadits: validHadits,
                    asmaulHusna: validHusna 
                }));
                
                loadedFromNet = true;
                log('loadContent', 'Konten diperbarui dari internet');
            }

        } catch (e) { 
            console.warn("Fetch content failed", e); 
        } // <--- BAGIAN INI YANG TADI HILANG (Penutup Try/Catch)
    }

    // 2. JIKA GAGAL/OFFLINE, AMBIL DARI CACHE
    if (!loadedFromNet) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                DATA_CONTENT.ayat = parsed.ayat || [];
                DATA_CONTENT.hadits = parsed.hadits || [];
                DATA_CONTENT.asmaulHusna = parsed.asmaulHusna || [];
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

        // --- UPDATE ---
        dzikirTitleBadge: document.getElementById('dzikir-title'), // Ambil ID Badge Dzikir
        dzikirArab: document.getElementById('dzikir-arabic'),
        dzikirNote: document.getElementById('dzikir-note'),
        dzikirCounter: document.getElementById('dzikir-counter'),
        
        cdTitle: document.getElementById('countdown-title'),
        cdName: document.getElementById('countdown-name'),
        cdTimer: document.getElementById('countdown-timer'),
        cdRealtime: document.getElementById('countdown-realtime'),
        
        // --- TAMBAHKAN / UPDATE BAGIAN PRAYER INI ---
        prayerBadge: document.getElementById('prayer-badge'),
        prayerTitle: document.getElementById('prayer-title'),
        prayerClock: document.getElementById('prayer-clock-big'),
        prayerArabic: document.getElementById('prayer-arabic'),
        prayerTranslate: document.getElementById('prayer-translate'),
        
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
            if (name === 'shubuh') durIqamah = 13; // Shubuh 13 menit
            if (name === 'isya') durIqamah = 5;    // Isya 5 menit

            let durPrayer = CONFIG.timeRules.inPrayer;
            if (now.getDay() === 5 && name === 'dzuhur') {
                durPrayer = CONFIG.timeRules.jumatPrayer; // Jumat 60 menit
            }

            // --- UPDATE LOGIKA DURASI DZIKIR ---
            let durDzikir = CONFIG.timeRules.dzikir; // Default 6 menit (Dzuhur, Maghrib, Isya)
            if (name === 'shubuh' || name === 'ashar') {
                durDzikir = 15; // Khusus Shubuh & Ashar jadi 15 menit
            }

            const msPreAdzan = CONFIG.timeRules.preAdzan * 60000;
            const msPreIqamah = durIqamah * 60000;
            const msInPrayer = durPrayer * 60000;
            const msDzikir = durDzikir * 60000; // Gunakan durasi dinamis

            const tStartPreAdzan = tAdzan.getTime() - msPreAdzan;
            const tEndPreIqamah = tAdzan.getTime() + msPreIqamah;
            const tEndPrayer = tEndPreIqamah + msInPrayer;
            const tEndDzikir = tEndPrayer + msDzikir;

            // 1. Cek Adzan
            if (curTime >= tStartPreAdzan && curTime < tAdzan.getTime()) {
                newMode = 'OVERRIDE';
                newType = 'ADZAN';
                target = tAdzan;
                metaData = { name };
                break;
            }
            
            // 2. Cek Iqamah
            if (curTime >= tAdzan.getTime() && curTime < tEndPreIqamah) {
                newMode = 'OVERRIDE';
                newType = 'IQAMAH';
                target = new Date(tEndPreIqamah);
                metaData = { name };
                break;
            }

            // 3. Cek Sholat Berlangsung
            if (curTime >= tEndPreIqamah && curTime < tEndPrayer) {
                newMode = 'OVERRIDE';
                newType = 'PRAYER';
                if (now.getDay() === 5 && name === 'dzuhur') metaData.isJumat = true; 
                metaData.name = name; // Kirim nama sholat ke metadata
                break;
            }

            // 4. Cek Dzikir (UPDATE: Mencakup semua sholat)
            if ((name === 'shubuh' || name === 'ashar' || name === 'dzuhur' || name === 'maghrib' || name === 'isya') && curTime >= tEndPrayer && curTime < tEndDzikir) {
                newMode = 'OVERRIDE';
                
                if (name === 'shubuh') {
                    newType = 'DZIKIR_PAGI';
                } else if (name === 'ashar') {
                    newType = 'DZIKIR_PETANG';
                } else {
                    newType = 'DZIKIR_UMUM';
                }
                
                metaData = { name };
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
// --- GANTI FUNGSI applyMode DI SCRIPT.JS DENGAN INI ---

// --- FUNGSI applyMode VERSI ANTI-ERROR ---

function applyMode(mode, type, target, meta) {
    STATE.mode = mode;
    STATE.overrideType = type;
    STATE.activeEventTarget = target;

    clearTimeout(slideTimer);
    
    // Cek dulu apakah progress bar ada
    if(els.progress) els.progress.style.width = '0';
    
    // FIX: Tambahkan pengecekan (el && el.classList) agar tidak error jika elemen hilang
    Object.values(els.scenes).forEach(el => {
        if (el) { 
            el.classList.add('hidden-slide');
            // Reset class tema background lama
            el.classList.remove('theme-red', 'theme-yellow', 'theme-khusyu', 'theme-blue', 'theme-gold', 'theme-silver');
        }
    });

    // Helper: Reset warna timer & glow
    const resetCountdownColors = () => {
        const timer = els.cdTimer;
        const glow = document.getElementById('countdown-glow');
        
        // Cek jika timer ada sebelum menghapus class
        if (timer) {
            timer.classList.remove('text-red-500', 'text-yellow-400', 'text-white');
        }
        // Hapus class warna background glow
        if(glow) glow.classList.remove('bg-red-600/30', 'bg-yellow-500/30', 'bg-white/10');
    };

    if (mode === 'NORMAL') {
        if(els.header) els.header.style.display = 'grid';
        if(els.footer) els.footer.style.display = 'grid';
        
        // Pastikan scene home ada sebelum diakses
        if(els.scenes.home) els.scenes.home.classList.remove('hidden-slide');
        
        STATE.slideIndex = 0;
        renderSlide();
    } 
    else {
        if(els.header) els.header.style.display = 'none';
        if(els.footer) els.footer.style.display = 'none';

        if (type === 'ADZAN' || type === 'IQAMAH') {
            const sc = els.scenes.countdown;
            const glow = document.getElementById('countdown-glow');
            
            if (sc) {
                sc.classList.remove('hidden-slide');
                resetCountdownColors();

                // Set Judul Badge
                if(els.cdTitle) els.cdTitle.innerText = type === 'ADZAN' ? 'MENUJU ADZAN' : 'MENUJU IQOMAH';
                
                // Set Nama Sholat
                if(els.cdName) els.cdName.innerText = meta.name ? meta.name.toUpperCase() : 'SHOLAT';
                
                // --- LOGIKA WARNA ---
                if (type === 'ADZAN') {
                    // WARNA MERAH (PRE-ADZAN)
                    if(els.cdTimer) els.cdTimer.classList.add('text-red-500'); // Merah terang
                    if(glow) glow.classList.add('bg-red-600/30'); // Cahaya belakang merah
                } else {
                    // WARNA KUNING EMAS (PRE-IQAMAH)
                    if(els.cdTimer) els.cdTimer.classList.add('text-yellow-400'); // Kuning emas
                    if(glow) glow.classList.add('bg-yellow-500/30'); // Cahaya belakang emas
                }

                if(target) updateOverlayTimer(target - new Date());
                ensureOverlayClock(sc);
            }
        } 
        // ... (bagian atas applyMode sama)

        else {
            // Bagian Prayer, Dzikir, dll
            const sp = els.scenes.prayer;
            if (sp) {
                sp.classList.remove('hidden-slide');
                
                // Ambil nama sholat dari meta data
                const prayerName = meta && meta.name ? meta.name : '';

                if (type === 'PRAYER') {
                    sp.classList.add('theme-khusyu'); 
                    ensureOverlayClock(sp);
                    
                    if (meta && meta.isJumat) {
                        setupGenericOverlay('PRAYER_JUMAT', 'JUMAT');
                    } else {
                        // FIX: Kirim prayerName ke fungsi setup
                        setupGenericOverlay('PRAYER', prayerName);
                    }
                }
                // ... (di dalam fungsi applyMode bagian else mode != NORMAL) ...

        // --- GANTI BLOK LOGIKA DZIKIR ---
        else if (type === 'DZIKIR_PAGI' || type === 'DZIKIR_PETANG' || type === 'DZIKIR_UMUM') {
            const sd = els.scenes.dzikir;
            if (sd) {
                sd.classList.remove('hidden-slide');
                
                // Reset styling badge
                if(els.dzikirTitleBadge) {
                    els.dzikirTitleBadge.className = "bg-gold-500/20 border border-gold-500/40 text-gold-300 px-8 py-2 rounded-full text-lg lg:text-xl font-cinzel font-bold uppercase tracking-widest backdrop-blur-md shadow-[0_0_20px_rgba(212,175,55,0.2)]";
                }

                // Pilih Data & Judul
                if (type === 'DZIKIR_PAGI') {
                    ACTIVE_DZIKIR_DATA = DATA_DZIKIR;
                    if(els.dzikirTitleBadge) els.dzikirTitleBadge.innerText = "DZIKIR PAGI";
                } 
                else if (type === 'DZIKIR_PETANG') {
                    ACTIVE_DZIKIR_DATA = DATA_DZIKIR_PETANG;
                    if(els.dzikirTitleBadge) els.dzikirTitleBadge.innerText = "DZIKIR PETANG";
                } 
                else {
                    ACTIVE_DZIKIR_DATA = DATA_DZIKIR_UMUM;
                    if(els.dzikirTitleBadge) els.dzikirTitleBadge.innerText = "DZIKIR SHOLAT";
                }

                // Jalankan Render
                renderDzikirItem();
                
                // Putar otomatis setiap 25 detik
                STATE.dzikirInterval = setInterval(renderDzikirItem, 25000); 
            }
        }
        
        else {
             // Sisa Prayer (Tinggal copy paste bagian prayer lama)
             const sp = els.scenes.prayer;
             if (sp) {
                sp.classList.remove('hidden-slide');
                const prayerName = meta && meta.name ? meta.name : '';

                if (type === 'PRAYER') {
                    sp.classList.add('theme-khusyu'); 
                    ensureOverlayClock(sp);
                    if (meta && meta.isJumat) setupGenericOverlay('PRAYER_JUMAT', 'JUMAT');
                    else setupGenericOverlay('PRAYER', prayerName);
                }
                // (Hapus else if type === 'DZIKIR' yang lama karena sudah diganti diatas)
                else if (type === 'KAJIAN') {
                    sp.classList.add('theme-silver');
                    setupGenericOverlay('KAJIAN', 'AHAD PAGI');
                    ensureOverlayClock(sp);
                }
                else if (type === 'JUMAT') { 
                    sp.classList.add('theme-gold');
                    setupGenericOverlay('JUMAT', 'JUMAT');
                    ensureOverlayClock(sp);
                }
             }
        }
                else if (type === 'KAJIAN') {
                    sp.classList.add('theme-silver');
                    setupGenericOverlay('KAJIAN', 'AHAD PAGI');
                    ensureOverlayClock(sp);
                }
                else if (type === 'JUMAT') { 
                    sp.classList.add('theme-gold');
                    setupGenericOverlay('JUMAT', 'JUMAT');
                    ensureOverlayClock(sp);
                }
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

// Fungsi Update Jam saat Sholat
// --- UPDATE FUNGSI INI ---
function ensureOverlayClock(parentScene) {
    const bigClock = document.getElementById('prayer-clock-big');
    
    // Timer Realtime di Scene Countdown (YANG BARU)
    const countdownRealtime = els.cdRealtime; 

    // Update Jam Kecil (Overlay Widget) - Untuk scene lain selain Countdown
    let overlayClock = parentScene.querySelector('.overlay-clock-widget');
    if (!overlayClock && parentScene.id !== 'scene-prayer' && parentScene.id !== 'scene-countdown') { 
        overlayClock = document.createElement('div');
        overlayClock.className = "overlay-clock-widget absolute bottom-8 text-lg font-mono font-bold text-white/10 tracking-widest";
        parentScene.appendChild(overlayClock);
    }

    const updateThisClock = () => {
        const now = new Date();
        const timeStrWithSeconds = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).replace(/\./g, ':');
        const timeStrSimple = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }).replace(/\./g, ':');

        // 1. Update Jam Besar (Scene Prayer)
        if (bigClock && document.body.contains(bigClock)) {
            bigClock.innerText = timeStrWithSeconds;
        }

        // 2. Update Jam Realtime (Scene Countdown - BARU)
        if (countdownRealtime && document.body.contains(countdownRealtime)) {
            countdownRealtime.innerText = timeStrWithSeconds;
        }

        // 3. Update Jam Overlay (Scene Lain)
        if (overlayClock && document.body.contains(overlayClock)) {
            overlayClock.innerText = timeStrSimple;
        }

        requestAnimationFrame(updateThisClock);
    };
    requestAnimationFrame(updateThisClock);
}

// --- GANTI FUNGSI setupGenericOverlay DENGAN INI ---

function setupGenericOverlay(type, name) {
    // Default Text (Untuk Sholat Wajib)
    let badgeText = "SEDANG BERLANGSUNG";
    let titleText = name ? name.toUpperCase() : "SHOLAT";
    let arabText = "سَوُّوا صُفُوفَكُمْ , فَإِنَّ تَسْوِيَةَ الصَّفِّ مِنْ تَمَامِ الصَّلاةِ";
    let transText = '"Luruskanlah shaf kalian, karena lurusnya shaf adalah bagian dari kesempurnaan sholat"';

    // Kustomisasi berdasarkan tipe event
    if (type === 'PRAYER_JUMAT') { 
        badgeText = "KHUTBAH JUMAT";
        titleText = "JUMAT";
        arabText = "إِذَا قُلْتَ لِصَاحِبِكَ يَوْمَ الْجُمُعَةِ أَنْصِتْ وَالإِمَامُ يَخْطُبُ فَقَدْ لَغَوْتَ";
        transText = '"Jika engkau berkata pada temanmu \'Diamlah\' di hari Jumat saat imam berkhutbah, maka sia-sialah Jumatmu"';
    }
    else if (type === 'DZIKIR') {
        badgeText = "BA'DA SHOLAT";
        titleText = "DZIKIR & DOA";
        arabText = "أَسْتَغْفِرُ اللهَ... أَسْتَغْفِرُ اللهَ... أَسْتَغْفِرُ اللهَ";
        transText = '"Harap Tenang & Menjaga Kekhusyukan Jamaah Lain"';
    }
    else if (type === 'KAJIAN') {
        badgeText = "KAJIAN RUTIN";
        titleText = DATA_CONTENT.kajianAhad.title || "KAJIAN";
        arabText = ""; // Kosongkan jika tidak ada
        transText = DATA_CONTENT.kajianAhad.desc + " | " + DATA_CONTENT.kajianAhad.sub;
    }

    // Terapkan ke Elemen (Pakai pengecekan if(el) agar aman)
    if(els.prayerBadge) els.prayerBadge.innerText = badgeText;
    if(els.prayerTitle) els.prayerTitle.innerText = titleText;
    
    if(els.prayerArabic) {
        els.prayerArabic.innerText = arabText;
        els.prayerArabic.style.display = arabText ? 'block' : 'none';
    }
    
    if(els.prayerTranslate) els.prayerTranslate.innerText = transText;
}
// --- 5. SLIDESHOW SYSTEM (NORMAL MODE) ---

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
                
                // 1. UPDATE: TEKS ARTI (TERJEMAHAN) DINAMIS
                // Menggunakan getAdaptiveClass(..., 'latin') agar ukuran menyesuaikan panjang teks
                els.ayatText.innerHTML = `"${item.text}"`;
                els.ayatText.className = `font-sans font-light text-slate-200 italic transition-all duration-500 text-center ${getAdaptiveClass(item.text, 'latin')}`;

                // 2. TEKS ARAB (Sudah Benar)
                els.ayatArabic.innerText = item.arabic;
                els.ayatArabic.className = `font-serif text-white text-center !text-center dir-rtl drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] transition-all duration-500 w-full px-4 ${getAdaptiveClass(item.arabic, 'arab')}`;
                
                els.ayatSource.innerText = item.source;
                STATE.ayatIndex++;
            } else skip = true;
        }
        else if (sceneKey === 'hadits') {
            if (DATA_CONTENT.hadits.length > 0) {
                const item = DATA_CONTENT.hadits[STATE.haditsIndex % DATA_CONTENT.hadits.length];
                
                // 1. UPDATE: TEKS ARTI (TERJEMAHAN) DINAMIS
                els.haditsText.innerHTML = `"${item.text}"`;
                els.haditsText.className = `font-sans text-slate-300 italic transition-all duration-500 text-center ${getAdaptiveClass(item.text, 'latin')}`;
                
                // 2. TEKS ARAB (Sudah Benar)
                els.haditsArabic.innerText = item.arabic;
                els.haditsArabic.className = `font-serif text-gradient-gold text-center !text-center dir-rtl drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] transition-all duration-500 w-full px-4 ${getAdaptiveClass(item.arabic, 'arab')}`;
                
                els.haditsSource.innerText = item.source;
                STATE.haditsIndex++;
            } else skip = true;
        }
        else if (sceneKey === 'asmaulHusna') {
            if (DATA_CONTENT.asmaulHusna && DATA_CONTENT.asmaulHusna.length > 0) {
                const item = DATA_CONTENT.asmaulHusna[STATE.asmaulHusnaIndex % DATA_CONTENT.asmaulHusna.length];
    
                // Bagian ini sudah OK (Jarak & Tengah)
                els.ahArab.innerText = item.arab;
                els.ahArab.className = `font-serif text-transparent bg-clip-text bg-gradient-to-b from-gold-100 via-gold-400 to-gold-600 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] dir-rtl text-center !text-center transition-all duration-500 mt-24 ${getAdaptiveClass(item.arab, 'arab')}`;
                
                els.ahLatin.innerText = item.latin;
                els.ahIndo.innerText = `"${item.indo}"`;
    
                STATE.asmaulHusnaIndex++;
            } else {
                skip = true;
            }
        }
        else if (sceneKey === 'donation') {
            if (DATA_CONTENT.donations.length > 0) {
                const item = DATA_CONTENT.donations[STATE.donationIndex % DATA_CONTENT.donations.length];
                
                els.donQr.src = item.qr;
                els.donLogo.src = item.logo;
                els.donNumber.innerText = item.number;
                els.donName.innerText = item.name;
                
                els.donNumber.className = `text-6xl lg:text-7xl font-mono font-bold tracking-tighter mb-4 drop-shadow-lg transition-colors duration-500 ${item.color}`;
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

    const allScenes = ['home', 'nextDetail', 'ayat', 'hadits', 'asmaulHusna', 'donation'];
    allScenes.forEach(k => {
        if(els.scenes[k]) els.scenes[k].classList.add('hidden-slide');
    });

    if (!skip) {
        if(els.scenes[sceneKey]) els.scenes[sceneKey].classList.remove('hidden-slide');
        
        if(els.progress) {
            els.progress.style.transition = 'none';
            els.progress.style.width = '0';
            setTimeout(() => {
                els.progress.style.transition = `width ${duration}s linear`;
                els.progress.style.width = '100%';
            }, 50);
        }

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

function renderDzikirItem() {
    // Pastikan ada data aktif
    if (!ACTIVE_DZIKIR_DATA || ACTIVE_DZIKIR_DATA.length === 0) return;
    
    const item = ACTIVE_DZIKIR_DATA[STATE.dzikirIndex % ACTIVE_DZIKIR_DATA.length];
    
    if(els.dzikirArab) {
        els.dzikirArab.innerHTML = item.text;
        // Gunakan getAdaptiveClass agar ukuran font menyesuaikan
        els.dzikirArab.className = `font-serif text-white text-center dir-rtl drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] transition-all duration-500 w-full px-8 leading-relaxed ${getAdaptiveClass(item.text, 'arab')}`;
    }
    
    if(els.dzikirNote) els.dzikirNote.innerText = item.note;
    
    if(els.dzikirCounter) {
        const currentNum = (STATE.dzikirIndex % ACTIVE_DZIKIR_DATA.length) + 1;
        els.dzikirCounter.innerText = `${currentNum} / ${ACTIVE_DZIKIR_DATA.length}`;
    }
    
    STATE.dzikirIndex++;
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
