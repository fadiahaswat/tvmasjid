/**
 * SMART MASJID DIGITAL SIGNAGE V2.5 (Refactored)
 * Fitur: Dzikir Pagi/Petang/Umum, Countdown Warna-warni, Mode Sholat Hening
 */

// --- 1. CONFIGURATION ---
const CONFIG = {
    cityId: '577ef1154f3240ad5b9b413aa7346a1e', 
    masjidName: "MASJID MU'ALLIMIN",
    address: "Yogyakarta, Indonesia",
    
    // Durasi Slide Normal (Detik)
    duration: { 
        home: 15, 
        nextDetail: 10, 
        ayat: 20, 
        hadits: 20,
        dzikir: 20, // Slide dzikir di mode normal
        asmaulHusna: 15, 
        donation: 20
    },

    timeRules: { 
        preAdzan: 15,    
        preIqamah: 10,   // Default (Override di logic)
        inPrayer: 15,    
        dzikir: 6,       // Default 6 menit (Dzuhur, Maghrib, Isya)
        jumatPrep: 45,
        jumatPrayer: 60  
    },
    
    // Jadwal Default (Offline fallback)
    defaultPrayerTimes: {
        tahajjud: "03:00", imsak: "04:10", shubuh: "04:20", syuruq: "05:35",
        dhuha: "06:00", dzuhur: "11:45", ashar: "15:05", maghrib: "17:55", isya: "19:05"
    },

    prayerTimes: {}, 
    currentHijriDate: "..." 
};

// --- 2. DATABASE KONTEN ---

const DATA_CONTENT = {
    ayat: [],   
    hadits: [],
    asmaulHusna: [],
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
    donations: [
        { 
            name: "LAZISMU MADRASAH MU'ALLIMIN MUHAMMADIYAH", 
            number: "3440000348", 
            qr: "qris-bni.png", 
            logo: "bank-bni.png",
            color: "text-orange-500", 
            glow: "bg-orange-500/20"
        },
        { 
            name: "LAZISMU MUALLIMIN YOGYAKARTA", 
            number: "7930030303", 
            qr: "qris-bsi.jpg", 
            logo: "bank-bsi.png",
            color: "text-cyan-400",   
            glow: "bg-cyan-500/20"
        },
        { 
            name: "KL LAZISMU MADRASAH MUALLIMIN", 
            number: "801241004624", 
            qr: "qris-bpd.jpg", 
            logo: "bank-bpd.png",
            color: "text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500", 
            glow: "bg-emerald-500/20"
        }
    ]
};

// A. DATA DZIKIR PAGI (KHUSUS SHUBUH)
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

// B. DATA DZIKIR PETANG (KHUSUS ASHAR)
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

// C. DATA DZIKIR UMUM (DZUHUR, MAGHRIB, ISYA)
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

// --- 4. DATA ASMAUL HUSNA LENGKAP (99) ---
// Disimpan lokal agar tidak perlu download satu-satu
const DATA_ASMAUL_HUSNA_FULL = [
    { arab: "الرَّحْمَنُ", latin: "Ar Rahman", indo: "Yang Maha Pengasih" },
    { arab: "الرَّحِيمُ", latin: "Ar Rahiim", indo: "Yang Maha Penyayang" },
    { arab: "الْمَلِكُ", latin: "Al Malik", indo: "Yang Maha Merajai" },
    { arab: "الْقُدُّوسُ", latin: "Al Quddus", indo: "Yang Maha Suci" },
    { arab: "السَّلاَمُ", latin: "As Salaam", indo: "Yang Maha Memberi Kesejahteraan" },
    { arab: "الْمُؤْمِنُ", latin: "Al Mu'min", indo: "Yang Maha Memberi Keamanan" },
    { arab: "الْمُهَيْمِنُ", latin: "Al Muhaimin", indo: "Yang Maha Pemelihara" },
    { arab: "الْعَزِيزُ", latin: "Al 'Aziz", indo: "Yang Maha Perkasa" },
    { arab: "الْجَبَّارُ", latin: "Al Jabbar", indo: "Yang Maha Kuasa" },
    { arab: "الْمُتَكَبِّرُ", latin: "Al Mutakabbir", indo: "Yang Maha Megah" },
    { arab: "الْخَالِقُ", latin: "Al Khaliq", indo: "Yang Maha Pencipta" },
    { arab: "الْبَارِئُ", latin: "Al Baari'", indo: "Yang Maha Melepaskan" },
    { arab: "الْمُصَوِّرُ", latin: "Al Mushawwir", indo: "Yang Maha Membentuk Rupa" },
    { arab: "الْغَفَّارُ", latin: "Al Ghaffaar", indo: "Yang Maha Pengampun" },
    { arab: "الْقَهَّارُ", latin: "Al Qahhaar", indo: "Yang Maha Memaksa" },
    { arab: "الْوَهَّابُ", latin: "Al Wahhaab", indo: "Yang Maha Pemberi Karunia" },
    { arab: "الرَّزَّاقُ", latin: "Ar Razzaaq", indo: "Yang Maha Pemberi Rezeki" },
    { arab: "الْفَتَّاحُ", latin: "Al Fattaah", indo: "Yang Maha Pembuka Rahmat" },
    { arab: "الْعَلِيمُ", latin: "Al 'Aliim", indo: "Yang Maha Mengetahui" },
    { arab: "الْقَابِضُ", latin: "Al Qaabidh", indo: "Yang Maha Menyempitkan" },
    { arab: "الْبَاسِطُ", latin: "Al Baasith", indo: "Yang Maha Melapangkan" },
    { arab: "الْخَافِضُ", latin: "Al Khaafidh", indo: "Yang Maha Merendahkan" },
    { arab: "الرَّافِعُ", latin: "Ar Raafi'", indo: "Yang Maha Meninggikan" },
    { arab: "الْمُعِزُّ", latin: "Al Mu'izz", indo: "Yang Maha Memuliakan" },
    { arab: "الْمُذِلُّ", latin: "Al Mudzill", indo: "Yang Maha Menghinakan" },
    { arab: "السَّمِيعُ", latin: "As Samii'", indo: "Yang Maha Mendengar" },
    { arab: "الْبَصِيرُ", latin: "Al Bashiir", indo: "Yang Maha Melihat" },
    { arab: "الْحَكَمُ", latin: "Al Hakam", indo: "Yang Maha Menetapkan" },
    { arab: "الْعَدْلُ", latin: "Al 'Adl", indo: "Yang Maha Adil" },
    { arab: "اللَّطِيفُ", latin: "Al Lathiif", indo: "Yang Maha Lembut" },
    { arab: "الْخَبِيرُ", latin: "Al Khabiir", indo: "Yang Maha Mengenal" },
    { arab: "الْحَلِيمُ", latin: "Al Haliim", indo: "Yang Maha Penyantun" },
    { arab: "الْعَظِيمُ", latin: "Al 'Azhiim", indo: "Yang Maha Agung" },
    { arab: "الْغَفُورُ", latin: "Al Ghafuur", indo: "Yang Maha Pengampun" },
    { arab: "الشَّكُورُ", latin: "As Syakuur", indo: "Yang Maha Pembalas Budi" },
    { arab: "الْعَلِيُّ", latin: "Al 'Aliy", indo: "Yang Maha Tinggi" },
    { arab: "الْكَبِيرُ", latin: "Al Kabiir", indo: "Yang Maha Besar" },
    { arab: "الْحَفِيظُ", latin: "Al Hafiizh", indo: "Yang Maha Memelihara" },
    { arab: "الْمُقِيتُ", latin: "Al Muqiit", indo: "Yang Maha Pemberi Kecukupan" },
    { arab: "الْحَسِيبُ", latin: "Al Hasiib", indo: "Yang Maha Membuat Perhitungan" },
    { arab: "الْجَلِيلُ", latin: "Al Jaliil", indo: "Yang Maha Luhur" },
    { arab: "الْكَرِيمُ", latin: "Al Kariim", indo: "Yang Maha Pemurah" },
    { arab: "الرَّقِيبُ", latin: "Ar Raqiib", indo: "Yang Maha Mengawasi" },
    { arab: "الْمُجِيبُ", latin: "Al Mujiib", indo: "Yang Maha Mengabulkan" },
    { arab: "الْوَاسِعُ", latin: "Al Waasi'", indo: "Yang Maha Luas" },
    { arab: "الْحَكِيمُ", latin: "Al Hakiim", indo: "Yang Maha Bijaksana" },
    { arab: "الْوَدُودُ", latin: "Al Waduud", indo: "Yang Maha Mengasihi" },
    { arab: "الْمَجِيدُ", latin: "Al Majiid", indo: "Yang Maha Mulia" },
    { arab: "الْبَاعِثُ", latin: "Al Baa'its", indo: "Yang Maha Membangkitkan" },
    { arab: "الشَّهِيدُ", latin: "As Syahiid", indo: "Yang Maha Menyaksikan" },
    { arab: "الْحَقُّ", latin: "Al Haqq", indo: "Yang Maha Benar" },
    { arab: "الْوَكِيلُ", latin: "Al Wakiil", indo: "Yang Maha Memelihara" },
    { arab: "الْقَوِيُّ", latin: "Al Qawiyyu", indo: "Yang Maha Kuat" },
    { arab: "الْمَتِينُ", latin: "Al Matiin", indo: "Yang Maha Kokoh" },
    { arab: "الْوَلِيُّ", latin: "Al Waliy", indo: "Yang Maha Melindungi" },
    { arab: "الْحَمِيدُ", latin: "Al Hamiid", indo: "Yang Maha Terpuji" },
    { arab: "الْمُحْصِي", latin: "Al Muhshii", indo: "Yang Maha Menghitung" },
    { arab: "الْمُبْدِئُ", latin: "Al Mubdi'", indo: "Yang Maha Memulai" },
    { arab: "الْمُعِيدُ", latin: "Al Mu'iid", indo: "Yang Maha Mengembalikan Kehidupan" },
    { arab: "الْمُحْيِي", latin: "Al Muhyii", indo: "Yang Maha Menghidupkan" },
    { arab: "الْمُمِيتُ", latin: "Al Mumiit", indo: "Yang Maha Mematikan" },
    { arab: "الْحَيُّ", latin: "Al Hayyu", indo: "Yang Maha Hidup" },
    { arab: "الْقَيُّومُ", latin: "Al Qayyuum", indo: "Yang Maha Mandiri" },
    { arab: "الْوَاجِدُ", latin: "Al Waajid", indo: "Yang Maha Penemu" },
    { arab: "الْمَاجِدُ", latin: "Al Maajid", indo: "Yang Maha Mulia" },
    { arab: "الْوَاحِدُ", latin: "Al Waahid", indo: "Yang Maha Tunggal" },
    { arab: "الْأَحَدُ", latin: "Al Ahad", indo: "Yang Maha Esa" },
    { arab: "الصَّمَدُ", latin: "Ash Shamad", indo: "Yang Maha Dibutuhkan" },
    { arab: "الْقَادِرُ", latin: "Al Qaadir", indo: "Yang Maha Menentukan" },
    { arab: "الْمُقْتَدِرُ", latin: "Al Muqtadir", indo: "Yang Maha Berkuasa" },
    { arab: "الْمُقَدِّمُ", latin: "Al Muqaddim", indo: "Yang Maha Mendahulukan" },
    { arab: "الْمُؤَخِّرُ", latin: "Al Mu'akhkhir", indo: "Yang Maha Mengakhirkan" },
    { arab: "الْأَوَّلُ", latin: "Al Awwal", indo: "Yang Maha Awal" },
    { arab: "الْآخِرُ", latin: "Al Aakhir", indo: "Yang Maha Akhir" },
    { arab: "الظَّاهِرُ", latin: "Az Zhaahir", indo: "Yang Maha Nyata" },
    { arab: "الْبَاطِنُ", latin: "Al Baathin", indo: "Yang Maha Ghaib" },
    { arab: "الْوَالِي", latin: "Al Waali", indo: "Yang Maha Memerintah" },
    { arab: "الْمُتَعَالِي", latin: "Al Muta'aalii", indo: "Yang Maha Tinggi" },
    { arab: "الْبَرُّ", latin: "Al Barr", indo: "Yang Maha Penderma" },
    { arab: "التَّوَّابُ", latin: "At Tawwaab", indo: "Yang Maha Penerima Taubat" },
    { arab: "الْمُنْتَقِمُ", latin: "Al Muntaqim", indo: "Yang Maha Pemberi Balasan" },
    { arab: "الْعَفُوُّ", latin: "Al 'Afuww", indo: "Yang Maha Pemaaf" },
    { arab: "الرَّؤُوفُ", latin: "Ar Ra'uuf", indo: "Yang Maha Pengasuh" },
    { arab: "مَالِكُ الْمُلْكِ", latin: "Malikul Mulk", indo: "Yang Maha Penguasa Kerajaan" },
    { arab: "ذُو الْجَلاَلِ وَالْإِكْرَامِ", latin: "Dzul Jalaali Wal Ikraam", indo: "Yang Maha Pemilik Kebesaran dan Kemuliaan" },
    { arab: "الْمُقْسِطُ", latin: "Al Muqsith", indo: "Yang Maha Pemberi Keadilan" },
    { arab: "الْجَامِعُ", latin: "Al Jaami'", indo: "Yang Maha Mengumpulkan" },
    { arab: "الْغَنِيُّ", latin: "Al Ghaniyy", indo: "Yang Maha Kaya" },
    { arab: "الْمُغْنِي", latin: "Al Mughnii", indo: "Yang Maha Pemberi Kekayaan" },
    { arab: "الْمَانِعُ", latin: "Al Maani'", indo: "Yang Maha Mencegah" },
    { arab: "الضَّارُّ", latin: "Ad Dhaarr", indo: "Yang Maha Penimpa Kemudharatan" },
    { arab: "النَّافِعُ", latin: "An Naafi'", indo: "Yang Maha Memberi Manfaat" },
    { arab: "النُّورُ", latin: "An Nuur", indo: "Yang Maha Bercahaya" },
    { arab: "الْهَادِي", latin: "Al Haadi", indo: "Yang Maha Pemberi Petunjuk" },
    { arab: "الْبَدِيعُ", latin: "Al Badii'", indo: "Yang Maha Pencipta" },
    { arab: "الْبَاقِي", latin: "Al Baaqii", indo: "Yang Maha Kekal" },
    { arab: "الْوَارِثُ", latin: "Al Waarits", indo: "Yang Maha Pewaris" },
    { arab: "الرَّشِيدُ", latin: "Ar Rasyiid", indo: "Yang Maha Pandai" },
    { arab: "الصَّبُورُ", latin: "Ash Shabuur", indo: "Yang Maha Sabar" }
];

// Helper: Fungsi Acak
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- 3. STATE & VARIABLES ---
let STATE = { 
    mode: 'NORMAL',      
    overrideType: null,  
    slideIndex: 0, 
    ayatIndex: 0, 
    haditsIndex: 0,
    asmaulHusnaIndex: 0,
    nextPrayer: null,
    activeEventTarget: null,
    donationIndex: 0,
    
    // --- VARIABLES DZIKIR ---
    dzikirIndex: 0,
    dzikirInterval: null
};

let ACTIVE_DZIKIR_DATA = []; // Data Dzikir yang sedang aktif
let els = {}; 
let slideTimer = null; 

// --- 4. HELPER FUNCTIONS ---

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

// Fungsi Ukuran Font Adaptif (Revisi: Lebih Kecil & Proporsional)
// Fungsi Ukuran Font Adaptif (Update agar Asmaul Husna aman)
function getAdaptiveClass(text, type) {
    if (!text) return '';
    const len = text.length;

    if (type === 'arab') {
        // Logika Ukuran Font Arab
        if (len < 60) return 'text-[10vh] lg:text-[14vh] leading-[1.6]'; // Pendek (Asmaul Husna masuk sini)
        if (len < 100) return 'text-[6vh] lg:text-[9vh] leading-[1.8]';
        if (len < 200) return 'text-[4.5vh] lg:text-[6vh] leading-[2]';
        return 'text-[3.5vh] lg:text-[4.5vh] leading-[2.2]'; 
    } else {
        // Latin
        if (len > 300) return 'text-lg leading-snug';
        if (len > 150) return 'text-xl leading-normal';
        return 'text-2xl lg:text-3xl leading-relaxed'; 
    }
}
// --- AUDIO SYSTEM ---
const SFX = {
    beep: new Audio('./audio/beep.mp3'), 
    final: new Audio('./audio/gong.mp3'), 
    lastPlayed: -1 
};

function playCountdownSound(secondsLeft) {
    if (SFX.lastPlayed === secondsLeft) return;

    if (secondsLeft <= 5 && secondsLeft > 0) { 
        SFX.beep.currentTime = 0;
        SFX.beep.play().catch(() => {});
        SFX.lastPlayed = secondsLeft;
    } 
    else if (secondsLeft === 0) { 
        SFX.final.currentTime = 0;
        SFX.final.play().catch(() => {});
        SFX.lastPlayed = secondsLeft;
    }
    else {
        if (secondsLeft > 6) SFX.lastPlayed = -1;
    }
}

// --- 5. DATA FETCHING ---

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

// --- FUNGSI LOAD DATA (VERSI STOK BANYAK / OFFLINE READY) ---
async function loadContentData() {
    const cacheKey = 'smart_masjid_content_v7'; // Versi cache baru
    let loadedFromNet = false;

    // 1. JIKA ONLINE: DOWNLOAD STOK BANYAK
    if (navigator.onLine) {
        try {
            // Kita ambil 150 item (Cukup untuk stok seminggu tanpa ulang)
            // Karena diputar acak (shuffle), pengulangan setelah seminggu tidak akan terasa
            const FETCH_LIMIT = 150; 
            log('loadContent', `Online: Mencoba mengambil ${FETCH_LIMIT} data baru...`);

            // --- A. FETCH AYAT (Batching Request) ---
            const tasksAyat = Array(FETCH_LIMIT).fill(0).map(async (_, i) => {
                // Beri jeda sedikit agar tidak dianggap SPAM oleh server
                await new Promise(r => setTimeout(r, i * 10)); 
                try {
                    const r = await fetch("https://api.myquran.com/v2/quran/ayat/acak");
                    if (!r.ok) return null;
                    const j = await r.json();
                    return j.status ? { 
                        text: j.data.ayat.text.replace(/\n/g, "<br>"), 
                        arabic: j.data.ayat.arab, 
                        source: `QS. ${j.data.info.surat.nama.id}: ${j.data.ayat.ayah}` 
                    } : null;
                } catch { return null; }
            });

            // --- B. FETCH HADITS ---
            const tasksHadits = Array(FETCH_LIMIT).fill(0).map(async (_, i) => {
                await new Promise(r => setTimeout(r, i * 10)); 
                try {
                    const r = await fetch("https://api.myquran.com/v3/hadis/enc/random");
                    if (!r.ok) return null;
                    const j = await r.json();
                    return j.status ? { 
                        text: j.data.text.id.replace(/\n/g, "<br>"), 
                        arabic: j.data.text.ar, 
                        source: j.data.takhrij 
                    } : null;
                } catch { return null; }
            });
            
            // --- C. ASMAUL HUSNA (Dari Data Lokal) ---
            // Kita acak urutannya agar setiap hari beda tampilannya
            const shuffledHusna = shuffleArray([...DATA_ASMAUL_HUSNA_FULL]); 

            // TUNGGU SEMUA DOWNLOAD SELESAI
            const [resAyat, resHadits] = await Promise.all([
                Promise.all(tasksAyat), 
                Promise.all(tasksHadits)
            ]);
            
            // Bersihkan yang gagal download (null)
            const validAyat = resAyat.filter(x => x);
            const validHadits = resHadits.filter(x => x);

            console.log(`Download Selesai: ${validAyat.length} Ayat, ${validHadits.length} Hadits`);

            // Jika berhasil dapat data banyak, SIMPAN KE CACHE
            if (validAyat.length > 20 && validHadits.length > 20) {
                DATA_CONTENT.ayat = validAyat;
                DATA_CONTENT.hadits = validHadits;
                DATA_CONTENT.asmaulHusna = shuffledHusna;
                
                // Simpan ke LocalStorage (Cache Abadi sampai online lagi)
                localStorage.setItem(cacheKey, JSON.stringify({ 
                    ayat: validAyat, 
                    hadits: validHadits,
                    asmaulHusna: shuffledHusna 
                }));
                
                loadedFromNet = true;
                log('loadContent', 'Sukses! Stok data sebulan tersimpan.');
            } else {
                log('loadContent', 'Gagal ambil data banyak, coba pakai cache lama.');
            }

        } catch (e) { console.warn("Fetch content failed", e); }
    }

    // 2. JIKA OFFLINE / GAGAL DOWNLOAD: PAKAI CACHE
    if (!loadedFromNet) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                // Validasi isi cache
                if (parsed.ayat && parsed.ayat.length > 0) DATA_CONTENT.ayat = parsed.ayat;
                if (parsed.hadits && parsed.hadits.length > 0) DATA_CONTENT.hadits = parsed.hadits;
                
                // Asmaul Husna tetap diacak ulang dari data lokal biar fresh
                DATA_CONTENT.asmaulHusna = shuffleArray([...DATA_ASMAUL_HUSNA_FULL]);
                
                log('loadContent', `Offline Mode: Memutar stok ${DATA_CONTENT.ayat.length} Ayat & ${DATA_CONTENT.hadits.length} Hadits.`);
            } catch(e) { 
                console.error("Cache Error", e);
                // Jika cache rusak, minimal isi Asmaul Husna
                DATA_CONTENT.asmaulHusna = shuffleArray([...DATA_ASMAUL_HUSNA_FULL]);
            }
        } else {
            // Cache Kosong & Offline -> Hanya bisa tampilkan Asmaul Husna
            log('loadContent', 'Cache Kosong & Offline. Mode Darurat (Hanya Asmaul Husna).');
            DATA_CONTENT.asmaulHusna = shuffleArray([...DATA_ASMAUL_HUSNA_FULL]);
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
        const rawShubuh = schedule.subuh;
        const shubuhKoreksi = addMinutes(rawShubuh, 8); 
        const imsakKoreksi = addMinutes(shubuhKoreksi, -10); 

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

// --- 6. CORE LOGIC ---

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
            asmaulHusna: document.getElementById('scene-asmaulhusna'),
            donation: document.getElementById('scene-donation'),
            countdown: document.getElementById('scene-countdown'),
            prayer: document.getElementById('scene-prayer'),
            dzikir: document.getElementById('scene-dzikir') // Scene Dzikir
        },

        ahArab: document.getElementById('ah-arab'),
        ahLatin: document.getElementById('ah-latin'),
        ahIndo: document.getElementById('ah-indo'),

        donQr: document.getElementById('don-qr'),
        donLogo: document.getElementById('don-logo'),
        donNumber: document.getElementById('don-number'),
        donName: document.getElementById('don-name'),
        donBgGlow: document.getElementById('don-bg-glow'),

        // DZIKIR ELEMENTS
        dzikirTitleBadge: document.getElementById('dzikir-title'),
        dzikirArab: document.getElementById('dzikir-arabic'),
        dzikirNote: document.getElementById('dzikir-note'),
        dzikirCounter: document.getElementById('dzikir-counter'),
        
        // COUNTDOWN ELEMENTS
        cdTitle: document.getElementById('countdown-title'),
        cdName: document.getElementById('countdown-name'),
        cdTimer: document.getElementById('countdown-timer'),
        cdRealtime: document.getElementById('countdown-realtime'),
        
        // PRAYER ELEMENTS
        prayerBadge: document.getElementById('prayer-badge'),
        prayerTitle: document.getElementById('prayer-title'),
        prayerClock: document.getElementById('prayer-clock-big'),
        prayerArabic: document.getElementById('prayer-arabic'),
        
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
    
    // Update Tanggal
    if(els.dateMasehi) {
        let dateStr = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
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

    // Sound Effect
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

// --- SYSTEM MODE CHECKER ---
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
            
            // Logika Durasi Dinamis
            let durIqamah = CONFIG.timeRules.preIqamah;
            if (name === 'shubuh') durIqamah = 13; 
            if (name === 'isya') durIqamah = 5;

            let durPrayer = CONFIG.timeRules.inPrayer;
            if (now.getDay() === 5 && name === 'dzuhur') {
                durPrayer = CONFIG.timeRules.jumatPrayer;
            }

            // Logika Durasi Dzikir Dinamis
            let durDzikir = CONFIG.timeRules.dzikir; // Default 6 menit
            if (name === 'shubuh' || name === 'ashar') {
                durDzikir = 15; // Shubuh & Ashar: 15 Menit
            }

            const msPreAdzan = CONFIG.timeRules.preAdzan * 60000;
            const msPreIqamah = durIqamah * 60000;
            const msInPrayer = durPrayer * 60000;
            const msDzikir = durDzikir * 60000; 

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
                metaData.name = name;
                break;
            }

            // Cek Mode Dzikir
            if ((name === 'shubuh' || name === 'ashar' || name === 'dzuhur' || name === 'maghrib' || name === 'isya') && curTime >= tEndPrayer && curTime < tEndDzikir) {
                newMode = 'OVERRIDE';
                if (name === 'shubuh') newType = 'DZIKIR_PAGI';
                else if (name === 'ashar') newType = 'DZIKIR_PETANG';
                else newType = 'DZIKIR_UMUM';
                
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

// --- APPLY MODE (TAMPILAN) ---
function applyMode(mode, type, target, meta) {
    STATE.mode = mode;
    STATE.overrideType = type;
    STATE.activeEventTarget = target;

    clearTimeout(slideTimer);
    
    // Reset Interval Dzikir
    if (STATE.dzikirInterval) {
        clearInterval(STATE.dzikirInterval);
        STATE.dzikirInterval = null;
    }

    if(els.progress) els.progress.style.width = '0';
    
    Object.values(els.scenes).forEach(el => {
        if (el) { 
            el.classList.add('hidden-slide');
            el.classList.remove('theme-red', 'theme-yellow', 'theme-khusyu', 'theme-blue', 'theme-gold', 'theme-silver');
        }
    });

    if (mode === 'NORMAL') {
        if(els.header) els.header.style.display = 'grid';
        if(els.footer) els.footer.style.display = 'grid';
        if(els.scenes.home) els.scenes.home.classList.remove('hidden-slide');
        
        STATE.slideIndex = 0;
        renderSlide();
    } 
    else {
        if(els.header) els.header.style.display = 'none';
        if(els.footer) els.footer.style.display = 'none';

        // 1. ADZAN & IQAMAH
        if (type === 'ADZAN' || type === 'IQAMAH') {
            const sc = els.scenes.countdown;
            const glow = document.getElementById('countdown-glow');
            
            if (sc) {
                sc.classList.remove('hidden-slide');

                if (els.cdTimer) els.cdTimer.classList.remove('text-red-500', 'text-yellow-400', 'text-white');
                if (glow) glow.classList.remove('bg-red-600/30', 'bg-yellow-500/30', 'bg-white/10');

                if(els.cdTitle) els.cdTitle.innerText = type === 'ADZAN' ? 'MENUJU ADZAN' : 'MENUJU IQOMAH';
                if(els.cdName) els.cdName.innerText = meta.name ? meta.name.toUpperCase() : 'SHOLAT';
                
                if (type === 'ADZAN') {
                    if(els.cdTimer) els.cdTimer.classList.add('text-red-500'); 
                    if(glow) glow.classList.add('bg-red-600/30'); 
                } else {
                    if(els.cdTimer) els.cdTimer.classList.add('text-yellow-400'); 
                    if(glow) glow.classList.add('bg-yellow-500/30'); 
                }

                if(target) updateOverlayTimer(target - new Date());
                ensureOverlayClock(sc);
            }
        } 
        
        // 2. DZIKIR (PAGI / PETANG / UMUM)
        else if (type === 'DZIKIR_PAGI' || type === 'DZIKIR_PETANG' || type === 'DZIKIR_UMUM') {
            const sd = els.scenes.dzikir;
            if (sd) {
                sd.classList.remove('hidden-slide');

                STATE.dzikirIndex = 0;
                
                if(els.dzikirTitleBadge) {
                    els.dzikirTitleBadge.className = "bg-gold-500/20 border border-gold-500/40 text-gold-300 px-8 py-2 rounded-full text-lg lg:text-xl font-cinzel font-bold uppercase tracking-widest backdrop-blur-md shadow-[0_0_20px_rgba(212,175,55,0.2)]";
                }

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

                renderDzikirItem();
                STATE.dzikirInterval = setInterval(renderDzikirItem, 25000); 
            }
        }
        
        // 3. LAINNYA
        else {
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

function ensureOverlayClock(parentScene) {
    const bigClock = document.getElementById('prayer-clock-big');
    const countdownRealtime = els.cdRealtime; 

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

        if (bigClock && document.body.contains(bigClock)) {
            bigClock.innerText = timeStrWithSeconds;
        }
        if (countdownRealtime && document.body.contains(countdownRealtime)) {
            countdownRealtime.innerText = timeStrWithSeconds;
        }
        if (overlayClock && document.body.contains(overlayClock)) {
            overlayClock.innerText = timeStrSimple;
        }
        requestAnimationFrame(updateThisClock);
    };
    requestAnimationFrame(updateThisClock);
}

// --- UPDATE FUNGSI INI ---
function setupGenericOverlay(type, name) {
    // Default Text
    let badgeText = "SEDANG BERLANGSUNG";
    let titleText = name ? name.toUpperCase() : "SHOLAT";
    // Text Arab Default (Hadits Shaf)
    let arabText = "سَوُّوا صُفُوفَكُمْ , فَإِنَّ تَسْوِيَةَ الصَّفِّ مِنْ تَمَامِ الصَّلاةِ";

    // Kustomisasi
    if (type === 'PRAYER_JUMAT') { 
        badgeText = "KHUTBAH JUMAT";
        titleText = "JUMAT";
        arabText = "إِذَا قُلْتَ لِصَاحِبِكَ يَوْمَ الْجُمُعَةِ أَنْصِتْ وَالإِمَامُ يَخْطُبُ فَقَدْ لَغَوْتَ";
    }
    else if (type === 'KAJIAN') {
        badgeText = "KAJIAN RUTIN";
        titleText = DATA_CONTENT.kajianAhad.title || "KAJIAN";
        arabText = ""; 
    }

    // Terapkan ke Elemen
    if(els.prayerBadge) els.prayerBadge.innerText = badgeText;
    if(els.prayerTitle) els.prayerTitle.innerText = titleText;
    
    if(els.prayerArabic) {
        els.prayerArabic.innerText = arabText;
        // Sembunyikan jika text kosong
        els.prayerArabic.style.display = arabText ? 'block' : 'none';
    }
    
    // BAGIAN TRANSLATE SUDAH DIHAPUS
}

// --- 7. SLIDESHOW SYSTEM ---

const SLIDE_ORDER = ['home', 'nextDetail', 'ayat', 'hadits', 'dzikir', 'asmaulHusna', 'donation'];

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
                els.ayatText.className = `font-sans font-light text-slate-200 italic transition-all duration-500 text-center ${getAdaptiveClass(item.text, 'latin')}`;
                els.ayatArabic.innerText = item.arabic;
                els.ayatArabic.className = `font-serif text-white text-center !text-center dir-rtl drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] transition-all duration-500 w-full px-4 ${getAdaptiveClass(item.arabic, 'arab')}`;
                els.ayatSource.innerText = item.source;
                STATE.ayatIndex++;
            } else skip = true;
        }
        else if (sceneKey === 'hadits') {
            if (DATA_CONTENT.hadits.length > 0) {
                const item = DATA_CONTENT.hadits[STATE.haditsIndex % DATA_CONTENT.hadits.length];
                els.haditsText.innerHTML = `"${item.text}"`;
                els.haditsText.className = `font-sans text-slate-300 italic transition-all duration-500 text-center ${getAdaptiveClass(item.text, 'latin')}`;
                els.haditsArabic.innerText = item.arabic;
                els.haditsArabic.className = `font-serif text-gradient-gold text-center !text-center dir-rtl drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] transition-all duration-500 w-full px-4 ${getAdaptiveClass(item.arabic, 'arab')}`;
                els.haditsSource.innerText = item.source;
                STATE.haditsIndex++;
            } else skip = true;
        }
        // DZIKIR DI MODE SLIDESHOW (Opsional, pakai data pagi)
        else if (sceneKey === 'dzikir') {
            if (DATA_DZIKIR.length > 0) {
                ACTIVE_DZIKIR_DATA = DATA_DZIKIR; // Default ke dzikir pagi
                if(els.dzikirTitleBadge) els.dzikirTitleBadge.innerText = "DZIKIR HARIAN";
                renderDzikirItem();
            } else skip = true;
        }
        else if (sceneKey === 'asmaulHusna') {
            if (DATA_CONTENT.asmaulHusna && DATA_CONTENT.asmaulHusna.length > 0) {
                const item = DATA_CONTENT.asmaulHusna[STATE.asmaulHusnaIndex % DATA_CONTENT.asmaulHusna.length];
                
                // ARAB: Gunakan adaptive class (biasanya masuk kategori pendek <60 char)
                els.ahArab.innerText = item.arab;
                els.ahArab.className = `font-serif text-transparent bg-clip-text bg-gradient-to-b from-gold-100 via-gold-400 to-gold-600 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] dir-rtl text-center transition-all duration-500 ${getAdaptiveClass(item.arab, 'arab')}`;
                
                // LATIN
                els.ahLatin.innerText = item.latin;
                
                // ARTI: Tambahkan tanda kutip & pastikan font Cinzel via class di HTML
                els.ahIndo.innerText = `"${item.indo}"`;

                STATE.asmaulHusnaIndex++;
            } else {
                skip = true;
            }
        }else if (sceneKey === 'donation') {
            if (DATA_CONTENT.donations.length > 0) {
                const item = DATA_CONTENT.donations[STATE.donationIndex % DATA_CONTENT.donations.length];
                els.donQr.src = item.qr;
                els.donLogo.src = item.logo;
                els.donNumber.innerText = item.number;
                els.donName.innerText = item.name;
                els.donNumber.className = `text-6xl lg:text-7xl font-mono font-bold tracking-tighter mb-4 drop-shadow-lg transition-colors duration-500 ${item.color}`;
                els.donBgGlow.className = `absolute top-0 right-0 w-[50vh] h-[50vh] rounded-full blur-[100px] animate-pulse transition-colors duration-1000 ${item.glow}`;
                STATE.donationIndex++;
            } else skip = true;
        }
    } catch(e) {
        console.error("Render Slide Error:", e);
        skip = true;
    }

    const allScenes = ['home', 'nextDetail', 'ayat', 'hadits', 'dzikir', 'asmaulHusna', 'donation'];
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

// --- FUNGSI RENDER DZIKIR (REVISI: STOP SAAT OVERRIDE, LOOP SAAT NORMAL) ---
function renderDzikirItem() {
    // 1. Cek Ketersediaan Data
    if (!ACTIVE_DZIKIR_DATA || ACTIVE_DZIKIR_DATA.length === 0) return;
    
    // 2. LOGIKA KONTROL ALUR (FLOW CONTROL)
    // Kondisi A: Mode OVERRIDE (Habis Sholat) -> Mainkan SEKALI saja lalu STOP
    if (STATE.mode === 'OVERRIDE') {
        // Jika index sudah mencapai atau melebihi jumlah data (artinya sudah selesai 1 putaran)
        if (STATE.dzikirIndex >= ACTIVE_DZIKIR_DATA.length) {
            // Hentikan interval agar tidak ganti-ganti lagi (Freeze di slide terakhir)
            if (STATE.dzikirInterval) {
                clearInterval(STATE.dzikirInterval);
                STATE.dzikirInterval = null;
            }
            return; // Keluar fungsi, jangan update tampilan lagi
        }
    }
    
    // Kondisi B: Mode NORMAL (Slideshow) -> Biarkan jalan terus (Looping otomatis via Modulo di bawah)

    // 3. AMBIL DATA (DENGAN MODULO)
    // Gunakan modulo (%) agar saat mode NORMAL, index 10 kembali ke 0 (Looping)
    const currentIndex = STATE.dzikirIndex % ACTIVE_DZIKIR_DATA.length;
    const item = ACTIVE_DZIKIR_DATA[currentIndex];
    
    // 4. RENDER KE HTML
    // A. Render Teks Arab
    if (els.dzikirArab) {
        els.dzikirArab.innerHTML = item.text;
        
        // --- LOGIKA UKURAN FONT ADAPTIF (SMART TYPOGRAPHY) ---
        const len = item.text.length;
        let fontClass = '';

        if (len < 50) {
            // Pendek (misal: Tasbih/Tahmid) -> Sangat Besar
            fontClass = 'text-[8vh] lg:text-[10vh] leading-[1.4]';
        } 
        else if (len < 150) {
            // Sedang -> Besar
            fontClass = 'text-[6vh] lg:text-[7vh] leading-[1.5]';
        } 
        else if (len < 300) {
            // Panjang (misal: Al-Ikhlas) -> Sedang
            fontClass = 'text-[4.5vh] lg:text-[5.5vh] leading-[1.6]';
        } 
        else if (len < 500) {
            // Sangat Panjang (misal: Sayyidul Istighfar) -> Kecil
            fontClass = 'text-[3.5vh] lg:text-[4.5vh] leading-[1.7]';
        } 
        else {
            // Ekstra Panjang (misal: Ayat Kursi) -> Sangat Kecil
            fontClass = 'text-[3vh] lg:text-[3.5vh] leading-[1.8]';
        }

        // Terapkan class CSS
        els.dzikirArab.className = `font-serif text-white text-center dir-rtl drop-shadow-[0_5px_10px_rgba(0,0,0,0.8)] transition-all duration-500 w-full max-w-7xl mx-auto pb-2 ${fontClass}`;
    }
    
    // B. Render Terjemahan/Note
    if (els.dzikirNote) {
        els.dzikirNote.innerText = item.note;
    }
    
    // C. Render Counter (Contoh: 1 / 33)
    if (els.dzikirCounter) {
        const displayNum = currentIndex + 1;
        els.dzikirCounter.innerText = `${displayNum} / ${ACTIVE_DZIKIR_DATA.length}`;
    }
    
    // 5. NAIKKAN INDEX
    // Kita biarkan index terus bertambah. 
    // - Di mode OVERRIDE: akan di-stop oleh logika di poin 2 saat mencapai max.
    // - Di mode NORMAL: akan terus naik tapi aman karena diambil pakai Modulo (%) di poin 3.
    STATE.dzikirIndex++;
}

// --- 8. INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    log('INIT', 'System Start...');
    initElements();
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
