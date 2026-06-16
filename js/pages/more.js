// js/pages/more.js

// Saat halaman dimuat, cek status pengaturan terakhir dari database
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();

    if (typeof db !== 'undefined') {
        try {
            // Ambil status PPN
            const ppnSetting = await getSetting('enable_ppn', 'false');
            document.getElementById('toggle-ppn').checked = (ppnSetting === 'true');

            // Ambil status PIN Lockscreen
            const pinSetting = await getSetting('enable_pinlock', 'false');
            document.getElementById('toggle-pin').checked = (pinSetting === 'true');
            
        } catch (error) {
            console.error("Gagal memuat pengaturan:", error);
        }
    }
});

// Menyimpan perubahan Toggle ke dalam tabel db.settings
async function toggleSetting(key, isChecked) {
    const stringValue = isChecked ? 'true' : 'false';
    try {
        await db.settings.put({ key: key, value: stringValue });
        
        // Notifikasi visual kecil
        let status = isChecked ? "Diaktifkan" : "Dimatikan";
        let feature = key === 'enable_ppn' ? "Pajak PPN 11%" : "Kunci Layar (PIN)";
        console.log(`${feature} telah ${status}.`);
        
    } catch (error) {
        console.error(`Gagal menyimpan pengaturan ${key}:`, error);
        alert("Gagal menyimpan pengaturan.");
    }
}

// Fitur Bahaya: Menghapus seluruh isi Database Lokal
async function wipeDatabase() {
    let konfirmasi1 = confirm("⚠️ PERINGATAN BAHAYA!\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA (Barang, Penjualan, Hutang)?");
    
    if (konfirmasi1) {
        let konfirmasi2 = confirm("Data yang dihapus tidak bisa dikembalikan kecuali Anda sudah melakukan Turbo Sync ke Cloud. Tetap hapus?");
        
        if (konfirmasi2) {
            try {
                // Menghapus database Dexie
                await db.delete();
                alert("Database berhasil dikosongkan. Aplikasi akan dimuat ulang.");
                // Reload halaman agar Dexie membuat ulang database kosong dari awal
                window.location.href = "index.html";
            } catch (error) {
                console.error("Gagal menghapus database:", error);
                alert("Terjadi kesalahan saat menghapus data.");
            }
        }
    }
}