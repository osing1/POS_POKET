// js/app.js

// 1. Inisialisasi Lucide Icons
lucide.createIcons();

// 2. Gesture Swipe untuk pindah halaman (HP/Tablet)
let touchstartX = 0;
let touchendX = 0;

function handleGesture() {
    const minSwipeDistance = 75; // Minimal geseran
    if (touchendX < touchstartX - minSwipeDistance) {
        // Swipe Kiri (Maju ke menu selanjutnya)
        console.log('Swiped Left');
        // Logika navigasi array halaman: ['index.html', 'inventory.html', 'sale.html']
    }
    if (touchendX > touchstartX + minSwipeDistance) {
        // Swipe Kanan (Mundur)
        console.log('Swiped Right');
    }
}

document.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    handleGesture();
});

// 3. Multi Bahasa (Contoh Implementasi Sederhana)
const langMap = {
    'id': { 'hello': 'Halo,', 'home': 'Beranda', 'sale': 'Kasir' },
    'en': { 'hello': 'Hello,', 'home': 'Home', 'sale': 'POS' }
};

function setLanguage(lang) {
    localStorage.setItem('pos_lang', lang);
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (langMap[lang] && langMap[lang][key]) {
            el.innerText = langMap[lang][key];
        }
    });
}