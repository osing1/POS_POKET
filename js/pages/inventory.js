// js/pages/inventory.js

let currentCategoryFilter = 'Semua';
let formBarcodeScanner = null;

function imgErrorLocal(image) {
    image.onerror = "";
    image.src = "https://images.unsplash.com/photo-1584824486509-112e4181f1b6?w=200"; 
    return true;
}

// 1. Memuat dan Merender List Inventori
async function renderInventoryList(category = 'Semua', keyword = '') {
    const listContainer = document.getElementById('inventory-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="col-span-full flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>';

    try {
        let products = await db.products.toArray();
        keyword = keyword.toLowerCase();

        let filteredProducts = products.filter(p => {
            const matchCategory = (category === 'Semua' || p.category === category);
            const matchKeyword = (p.name.toLowerCase().includes(keyword) || String(p.barcode).includes(keyword));
            return matchCategory && matchKeyword;
        });

        listContainer.innerHTML = '';

        if (filteredProducts.length === 0) {
            listContainer.innerHTML = `
                <div class="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                    <p class="text-slate-400 text-sm font-medium">Tidak ada produk dalam daftar inventori ini.</p>
                </div>`;
            return;
        }

        filteredProducts.forEach(p => {
            const itemRow = document.createElement('div');
            
            let stockColorClass = "text-emerald-500";
            let stockLabel = "Pcs";
            if (p.stock <= 0) {
                stockColorClass = "text-rose-500 font-extrabold";
                stockLabel = "Habis";
            } else if (p.stock <= 5) {
                stockColorClass = "text-orange-500 font-bold";
                stockLabel = "Menipis";
            }

            itemRow.className = 'glass-card p-3.5 flex items-center justify-between hover:border-orange-300 transition-all duration-200 cursor-pointer bg-white';
            itemRow.onclick = () => openFormModal(p);

            itemRow.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center p-1.5 border border-slate-100 overflow-hidden shrink-0">
                        <img src="${p.image_url}" onerror="imgErrorLocal(this);" class="max-h-full object-contain mix-blend-multiply" alt="Img">
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-slate-800 line-clamp-1">${p.name}</h3>
                        <p class="text-[11px] text-slate-400 font-mono mt-0.5">BC: ${p.barcode} <span class="mx-1 text-slate-200">|</span> ${p.category}</p>
                        <p class="text-xs font-bold text-orange-500 mt-1">Rp ${Number(p.price).toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div class="text-right pr-2 shrink-0">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Stok</span>
                    <p class="text-base font-extrabold ${stockColorClass}">${p.stock} <span class="text-[10px] font-medium text-slate-400">${stockLabel}</span></p>
                </div>
            `;
            listContainer.appendChild(itemRow);
        });

        lucide.createIcons();
    } catch (error) {
        console.error("Gagal memuat daftar inventori:", error);
    }
}

// 2. Kontrol Filter Kategori
function filterInventory(category, btnElement) {
    currentCategoryFilter = category;
    const buttons = document.querySelectorAll('.inv-cat-btn');
    buttons.forEach(btn => btn.className = 'inv-cat-btn px-5 py-2 rounded-xl bg-white text-slate-600 font-medium text-sm border border-slate-200 whitespace-nowrap hover:bg-slate-50 transition');
    btnElement.className = 'inv-cat-btn px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm whitespace-nowrap transition';
    
    const searchVal = document.getElementById('search-inventory')?.value || '';
    renderInventoryList(category, searchVal);
}

// 3. Kontrol Modal Form (Tambah / Edit)
function openFormModal(product = null) {
    const modal = document.getElementById('product-form-modal');
    const formTitle = document.getElementById('modal-form-title');
    const deleteBtn = document.getElementById('btn-delete-product');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Reset input file pilihan gambar setiap kali buka modal
    document.getElementById('form-file-upload').value = "";

    if (product) {
        formTitle.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 mr-2 text-orange-500"></i> Edit Detail Produk`;
        deleteBtn.classList.remove('hidden');
        deleteBtn.classList.add('flex');

        document.getElementById('form-product-id').value = product.id;
        document.getElementById('form-name').value = product.name;
        document.getElementById('form-barcode').value = product.barcode;
        document.getElementById('form-category').value = product.category;
        document.getElementById('form-price').value = product.price;
        document.getElementById('form-stock').value = product.stock;
        document.getElementById('form-image').value = product.image_url || '';
    } else {
        formTitle.innerHTML = `<i data-lucide="box" class="w-5 h-5 mr-2 text-orange-500"></i> Tambah Produk Baru`;
        deleteBtn.classList.remove('flex');
        deleteBtn.classList.add('hidden');
        
        document.getElementById('product-main-form').reset();
        document.getElementById('form-product-id').value = '';
        document.getElementById('form-image').value = '';
    }
    lucide.createIcons();
}

function closeFormModal() {
    const modal = document.getElementById('product-form-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if (formBarcodeScanner) {
        formBarcodeScanner.stop().catch(e => console.log(e));
    }
}

// 4. FITUR BARU: Kamera Scanner Otomatis Khusus Form Input Barcode
function toggleFormScanner() {
    const modal = document.getElementById('form-scanner-modal');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        formBarcodeScanner = new Html5Qrcode("form-reader");
        formBarcodeScanner.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: {width: 250, height: 250} }, 
            (decodedText) => {
                // Saat barcode barang terbaca, isi langsung ke input field barcode
                document.getElementById('form-barcode').value = decodedText;
                formBarcodeScanner.stop();
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            },
            (errorMessage) => {}
        ).catch((err) => {
            alert("Akses kamera ditolak atau tidak ditemukan.");
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        });
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if(formBarcodeScanner) formBarcodeScanner.stop().catch(e => console.log(e));
    }
}

// 5. FITUR BARU: Upload Foto Langsung ke Google Drive -> Output Link LH3
async function uploadPhotoToDrive() {
    const fileInput = document.getElementById('form-file-upload');
    const imageInput = document.getElementById('form-image');
    
    if (fileInput.files.length === 0) return;
    if (!navigator.onLine) {
        alert("❌ Harus online untuk mengupload gambar langsung ke Google Drive.");
        fileInput.value = "";
        return;
    }

    const file = fileInput.files[0];
    imageInput.value = "Sedang mengupload ke Google Drive...";

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        
        try {
            // Tembak file ke Google Apps Script doPost
            const response = await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'upload_image',
                    image: base64Image,
                    mimeType: file.type,
                    fileName: 'POS_PROD_' + new Date().getTime() + '_' + file.name
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                // Set input gambar dengan format LH3 yang dikembalikan Google Drive
                imageInput.value = result.url;
                console.log("Gambar berhasil tersimpan di Drive: " + result.url);
            } else {
                alert("Gagal mengupload gambar ke Drive.");
                imageInput.value = "";
            }
        } catch (error) {
            console.error("Error Upload:", error);
            alert("Terjadi gangguan jaringan saat mengupload foto.");
            imageInput.value = "";
        }
    };
    reader.readAsDataURL(file); // Konversi gambar menjadi format Base64
}

// 6. Proses Simpan Form (Insert / Update)
// Ganti fungsi saveProductForm di js/pages/inventory.js dengan versi aman ini:

async function saveProductForm(e) {
    e.preventDefault();

    const id = document.getElementById('form-product-id').value;
    const name = document.getElementById('form-name').value;
    const barcode = String(document.getElementById('form-barcode').value).trim();
    const category = document.getElementById('form-category').value;
    const price = parseInt(document.getElementById('form-price').value) || 0;
    const stock = parseInt(document.getElementById('form-stock').value) || 0;
    const image_url = document.getElementById('form-image').value || "https://images.unsplash.com/photo-1584824486509-112e4181f1b6?w=200";

    // PENTING: Jika id kosong (produk baru), buat ID baru. Jika ada, pakai ID lama.
    const finalId = id || ('P' + new Date().getTime().toString().slice(-4));

    const productData = { 
        id: finalId, 
        barcode, 
        name, 
        category, 
        price, 
        stock, 
        image_url 
    };

    const btnSubmit = document.querySelector('#product-main-form button[type="submit"]');
    const originalText = btnSubmit.innerHTML;

    try {
        // 1. JIKA ONLINE, WAJIB SUKSES DI GOOGLE SHEETS TERLEBIH DAHULU
        if (navigator.onLine) {
            btnSubmit.innerHTML = 'Menyinkronkan ke Cloud...';
            btnSubmit.disabled = true;

            const response = await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'save_product', product: productData }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });

            const result = await response.json();
            
            // Jika Apps Script mengirimkan status error, hentikan proses dan lempar ke blok catch
            if (result.status !== 'success') {
                throw new Error(result.message || "Google Sheets menolak menyimpan data.");
            }
            console.log("✅ Google Sheets berhasil diperbarui!");
        }

        // 2. JIKA CLOUD SUKSES (ATAU SEDANG OFFLINE), BARU SIMPAN KE DEXIE DB LOKAL
        if (id) {
            await db.products.update(id, productData);
        } else {
            await db.products.add(productData);
        }

        // 3. TUTUP MODAL DAN REFRESH TAMPILAN
        closeFormModal();
        const searchVal = document.getElementById('search-inventory')?.value || '';
        renderInventoryList(currentCategoryFilter, searchVal);

        alert("✅ Data barang dan foto berhasil diperbarui di Lokal & Cloud!");

    } catch (error) {
        // Jika terjadi kegagalan di Google Sheets, popup ini akan memberi tahu letak kesalahannya
        console.error("Detail Kegagalan Sinkronisasi:", error);
        alert("❌ Gagal Menyimpan ke Cloud!\n\nPenyebab: " + error.message + "\n\nPerubahan dibatalkan agar data tetap sinkron.");
    } finally {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
    }
}

// 7. Proses Hapus Produk Lokal
async function deleteProductForm() {
    const id = document.getElementById('form-product-id').value;
    if (!id) return;

    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
        try {
            // PERBAIKAN: Hapus parseInt()
            await db.products.delete(id);
            closeFormModal();
            const searchVal = document.getElementById('search-inventory')?.value || '';
            renderInventoryList(currentCategoryFilter, searchVal);
        } catch (error) { console.error(error); }
    }
}
