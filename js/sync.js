// js/sync.js

// URL hasil deploy Google Apps Script Anda (PASTIKAN URL INI BENAR)
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxJp-TZz0Lf6ZrZhTEbHyO7P8eWfSjTuxppJAaxvcYRAV4yhCbLFoWOVrzIqcLAFQM/exec";

// 1. Fungsi Utama Sinkronisasi (Dukung Mode Senyap / Auto-Sync)
async function turboSync(isSilent = false) {
    // Cek koneksi internet browser sebelum memanggil fetch
    if (!navigator.onLine) {
        if (!isSilent) alert("❌ Tidak ada koneksi internet. Anda dalam Mode Offline.");
        return;
    }

    try {
        if (!isSilent) console.log("Memulai Turbo Sync (Manual)...");
        
        // A. Tarik & Kirim Data Penjualan Offline ke Cloud
        await syncSalesToCloud(isSilent);

        // B. Tarik Data Produk Terbaru dari Sheet
        const response = await fetch(SHEET_URL);
        const result = await response.json();
        
        if (result.status === "success") {
            // Perbarui database lokal
            await db.products.clear();
            await db.products.bulkAdd(result.data);
            
            if (!isSilent) {
                console.log("Sync Produk Berhasil! Total: " + result.data.length);
                alert("✅ Turbo Sync Selesai! Data Produk & Penjualan telah diperbarui.");
            }
            
            // C. Refresh Layar Kasir secara otomatis (Jika sedang di halaman sale.html)
            if(typeof renderProducts === "function") {
                const searchInput = document.getElementById('search-input');
                // Hanya refresh grid jika kasir TIDAK sedang mengetik di kolom pencarian
                if(!searchInput || !searchInput.value) { 
                    const activeBtn = document.querySelector('.cat-btn.bg-orange-500');
                    const cat = activeBtn ? activeBtn.innerText.trim() : 'Semua';
                    renderProducts(cat);
                }
            }
        }
    } catch (error) {
        console.error("Gagal sinkronisasi.", error);
        if (!isSilent) alert("❌ Gagal terhubung ke Cloud. Pastikan koneksi stabil.");
    }
}

// 2. Fungsi Kirim Data Penjualan (POST)
async function syncSalesToCloud(isSilent = false) {
    try {
        // Cari transaksi yang belum dikirim (sync_status = 0)
        const unsyncedSales = await db.sales.where('sync_status').equals(0).toArray();
        if(unsyncedSales.length === 0) return; // Skip jika tidak ada transaksi baru

        // Gabungkan transaksi dengan item belanjaannya
        for(let sale of unsyncedSales) {
            sale.items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
        }

        if (!isSilent) console.log(`Mengirim ${unsyncedSales.length} transaksi ke Cloud...`);

        // Kirim data ke Google Sheets via POST
        const response = await fetch(SHEET_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'sync_sales', data: unsyncedSales }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        });

        const result = await response.json();

        if(result.status === 'success') {
            // Jika sukses dicatat di Sheet, ubah status lokal menjadi 1 (Terkirim)
            for(let sale of unsyncedSales) {
                await db.sales.update(sale.id, { sync_status: 1 });
            }
            if (!isSilent) console.log('Semua transaksi offline berhasil dicatat di Sheet!');
        }

    } catch (error) {
        console.error("Gagal mengirim transaksi ke Cloud:", error);
    }
}

// ==========================================
// TRIGGER OTOMATIS (AUTO-SYNC DI LATAR BELAKANG)
// ==========================================

// A. Auto-Sync Berdasarkan Waktu (Setiap 5 Menit = 300000 ms)
setInterval(() => {
    if (navigator.onLine) {
        console.log("[Auto-Sync] Menjalankan sinkronisasi senyap di latar belakang...");
        turboSync(true); // true = mode senyap (tanpa alert)
    }
}, 60000); 

// B. Auto-Sync Saat Sinyal Kembali Terhubung
window.addEventListener('online', () => {
    console.log("[Auto-Sync] Jaringan terhubung kembali. Memulai sinkronisasi...");
    turboSync(true); // Langsung kirim data offline yang nyangkut
});