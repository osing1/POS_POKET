// js/pages/inventory.js

let currentCategoryFilter = 'Semua';
let formBarcodeScanner = null;

function imgErrorLocal(image) {
    image.onerror = "";
    image.src = "https://images.unsplash.com/photo-1584824486509-112e4181f1b6?w=200"; 
    return true;
}

// ==========================================
// FITUR BARU: GENERATE TAB KATEGORI OTOMATIS
// ==========================================
async function generateCategoryTabs() {
    try {
        const products = await db.products.toArray();
        // Ambil semua kategori unik dari database
        const uniqueCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
        
        const tabsContainer = document.getElementById('category-tabs');
        if (!tabsContainer) return;

        // Reset isi tab, mulai dengan tab 'Semua'
        tabsContainer.innerHTML = `<button onclick="filterInventory('Semua', this)" class="inv-cat-btn px-5 py-2 rounded-xl ${currentCategoryFilter === 'Semua' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'} font-bold text-sm shadow-sm whitespace-nowrap transition">Semua</button>`;

        // Tambahkan tab untuk setiap kategori unik
        uniqueCategories.forEach(cat => {
            const isActive = currentCategoryFilter === cat;
            tabsContainer.innerHTML += `<button onclick="filterInventory('${cat}', this)" class="inv-cat-btn px-5 py-2 rounded-xl ${isActive ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'} font-medium text-sm whitespace-nowrap hover:bg-slate-50 transition">${cat}</button>`;
        });

        // Update juga opsi di Datalist Form
        const datalist = document.getElementById('category-options');
        if (datalist) {
            datalist.innerHTML = '';
            uniqueCategories.forEach(cat => {
                datalist.innerHTML += `<option value="${cat}"></option>`;
            });
        }
    } catch (error) {
        console.error("Gagal generate kategori:", error);
    }
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
            if (p.stock <= 0) { stockColorClass = "text-rose-500 font-extrabold"; stockLabel = "Habis"; } 
            else if (p.stock <= 5) { stockColorClass = "text-orange-500 font-bold"; stockLabel = "Menipis"; }

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
    buttons.forEach(btn => {
        btn.className = 'inv-cat-btn px-5 py-2 rounded-xl bg-white text-slate-600 font-medium text-sm border border-slate-200 whitespace-nowrap hover:bg-slate-50 transition';
    });
    if(btnElement) {
        btnElement.className = 'inv-cat-btn px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm whitespace-nowrap transition';
    }
    
    const searchVal = document.getElementById('search-inventory')?.value || '';
    renderInventoryList(category, searchVal);
}

// 3. Kontrol Modal Form (Tambah / Edit)
function openFormModal(product = null) {
    const modal = document.getElementById('product-form-modal');
    const formTitle = document.getElementById('modal-form-title');
    const deleteBtn = document.getElementById('btn-delete-product');
    const printQrBtn = document.getElementById('btn-print-qr');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('form-file-upload').value = "";

    // Buka kunci tombol jika sebelumnya error
    const btnSubmit = document.querySelector('#product-main-form button[type="submit"]');
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');

    if (product) {
        formTitle.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 mr-2 text-orange-500"></i> Edit Detail Produk`;
        deleteBtn.classList.remove('hidden');
        deleteBtn.classList.add('flex');
        printQrBtn.classList.remove('hidden'); 
        printQrBtn.classList.add('flex');      

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
        printQrBtn.classList.remove('flex');   
        printQrBtn.classList.add('hidden');    
        
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

// 4. PERBAIKAN: Kamera Scanner (30 FPS & Bentuk Persegi Panjang)
function toggleFormScanner() {
    const modal = document.getElementById('form-scanner-modal');
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        formBarcodeScanner = new Html5Qrcode("form-reader");
        formBarcodeScanner.start(
            { facingMode: "environment" }, 
            { 
                fps: 30, // Dipercepat 3x lipat
                qrbox: { width: 280, height: 120 }, // Bentuk persegi panjang standar barcode
                aspectRatio: 1.0 
            }, 
            (decodedText) => {
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

// 5. PERBAIKAN: Kunci Tombol Sepenuhnya Saat Upload Foto
async function uploadPhotoToDrive() {
    const fileInput = document.getElementById('form-file-upload');
    const imageInput = document.getElementById('form-image');
    const btnSubmit = document.querySelector('#product-main-form button[type="submit"]');
    
    if (fileInput.files.length === 0) return;
    if (!navigator.onLine) {
        alert("❌ Harus online untuk mengupload gambar.");
        fileInput.value = "";
        return;
    }

    // KUNCI TOMBOL SECARA INSTAN
    btnSubmit.disabled = true;
    btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></i> Uploading...';

    const file = fileInput.files[0];
    imageInput.value = "Mempersiapkan gambar...";

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        imageInput.value = "Sedang mengirim ke Google Drive (Mohon tunggu)...";
        try {
            const response = await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'upload_image',
                    image: base64Image,
                    mimeType: file.type,
                    fileName: 'PROD_' + new Date().getTime() + '_' + file.name,
                    subFolder: 'Produk'
                }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                imageInput.value = result.url;
            } else {
                alert("Gagal mengupload gambar.");
                imageInput.value = "";
            }
        } catch (error) {
            console.error(error);
            alert("Gangguan jaringan. Gagal upload.");
            imageInput.value = "";
        } finally {
            // BUKA KUNCI TOMBOL SETELAH SELESAI
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    };
    reader.readAsDataURL(file); 
}

// 6. PERBAIKAN: Pengaman Ganda Pada Simpan Form
async function saveProductForm(e) {
    e.preventDefault();

    // Cek pengaman ganda: Pastikan gambar tidak dalam status loading
    const imageVal = document.getElementById('form-image').value;
    if (imageVal.includes("Sedang")) {
        alert("Harap tunggu hingga proses upload gambar selesai!");
        return;
    }

    const id = document.getElementById('form-product-id').value;
    const name = document.getElementById('form-name').value;
    const barcode = String(document.getElementById('form-barcode').value).trim();
    const category = document.getElementById('form-category').value.trim(); // Trim untuk kategori kustom
    const price = parseInt(document.getElementById('form-price').value) || 0;
    const stock = parseInt(document.getElementById('form-stock').value) || 0;
    const image_url = imageVal || "https://images.unsplash.com/photo-1584824486509-112e4181f1b6?w=200";

    const finalId = id || ('P' + new Date().getTime().toString().slice(-4));
    const productData = { id: finalId, barcode, name, category, price, stock, image_url };

    const btnSubmit = document.querySelector('#product-main-form button[type="submit"]');
    const originalText = btnSubmit.innerHTML;

    try {
        if (navigator.onLine) {
            btnSubmit.innerHTML = 'Menyinkronkan ke Cloud...';
            btnSubmit.disabled = true;

            const response = await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'save_product', product: productData }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });

            const result = await response.json();
            if (result.status !== 'success') {
                throw new Error(result.message || "Google Sheets menolak menyimpan data.");
            }
        }

        if (id) await db.products.update(id, productData);
        else await db.products.add(productData);

        closeFormModal();
        
        // Perbarui Tab Kategori jika ada kategori baru
        await generateCategoryTabs();
        
        const searchVal = document.getElementById('search-inventory')?.value || '';
        renderInventoryList(currentCategoryFilter, searchVal);

    } catch (error) {
        console.error("Detail Kegagalan:", error);
        alert("❌ Gagal Menyimpan!\n\nPastikan Anda sudah klik Turbo Sync sebelumnya, atau cek koneksi internet.");
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
            await db.products.delete(id);
            closeFormModal();
            await generateCategoryTabs();
            renderInventoryList(currentCategoryFilter);
        } catch (error) { console.error(error); }
    }
}

// ==========================================
// FITUR BARU: CETAK LABEL QR CODE PRODUK (Support 58mm & A4)
// ==========================================
function printProductQR() {
    const name = document.getElementById('form-name').value;
    const barcode = document.getElementById('form-barcode').value;
    const price = document.getElementById('form-price').value;

    if (!barcode) return alert("Barcode tidak boleh kosong!");

    const tempContainer = document.createElement('div');
    
    new QRCode(tempContainer, {
        text: barcode,
        width: 150,
        height: 150,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        const qrCanvas = tempContainer.querySelector('canvas');
        const qrImageSrc = qrCanvas.toDataURL("image/png");

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Label_QR_${barcode}</title>
                <style>
                    /* CSS Tampilan Web (Sebelum Print) */
                    body { font-family: 'Segoe UI', system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; background: #f8fafc; margin: 0; }
                    .label-container { background: white; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 16px; text-align: center; width: 220px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                    .label-name { font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 10px; line-height: 1.2; text-transform: uppercase; }
                    .label-qr { width: 150px; height: 150px; margin: 0 auto; border: 1px solid #f1f5f9; padding: 5px; border-radius: 8px; }
                    .label-bc { font-size: 10px; color: #64748b; font-family: monospace; margin-top: 5px; letter-spacing: 1px; }
                    .label-price { font-size: 20px; font-weight: 900; color: #000; margin-top: 10px; }
                    .print-btn { background: #0f172a; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; margin-bottom: 20px; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.2s; }
                    .print-btn:hover { background: #334155; }
                    .info-text { font-size: 11px; color: #64748b; margin-bottom: 20px; max-width: 300px; text-align: center; }
                    
                    /* CSS Khusus Printer (A4 & Thermal 58mm) */
                    @media print {
                        @page { 
                            margin: 2mm; /* Margin minimal agar thermal tidak terpotong */
                        }
                        body { 
                            background: white; 
                            padding: 0; 
                            margin: 0; 
                            display: block; /* Matikan flex agar A4 mencetak dari pojok kiri atas */
                        }
                        .print-btn, .info-text { display: none; }
                        
                        .label-container { 
                            border: 1px solid #000; /* Garis batas potong stiker */
                            box-shadow: none; 
                            padding: 2mm; 
                            width: 46mm; /* Area cetak aman untuk printer 58mm */
                            max-width: 100%;
                            border-radius: 2mm; 
                            margin: 0;
                            page-break-inside: avoid;
                        }
                        .label-name { font-size: 11px; margin-bottom: 3mm; color: #000; font-weight: bold; }
                        .label-qr { width: 36mm; height: 36mm; padding: 0; border: none; display: block; margin: 0 auto; }
                        .label-bc { font-size: 9px; color: #000; margin-top: 1mm; }
                        .label-price { font-size: 14px; margin-top: 2mm; color: #000; font-weight: bold; }
                    }
                </style>
            </head>
            <body>
                <div class="info-text">Silakan pilih ukuran kertas pada dialog print. Pilih <b>Roll Paper 58mm</b> untuk printer kasir, atau <b>A4</b> untuk printer biasa.</div>
                <button class="print-btn" onclick="window.print()">Cetak Label Sekarang</button>
                <div class="label-container">
                    <div class="label-name">${name}</div>
                    <img src="${qrImageSrc}" class="label-qr" alt="QR Code" />
                    <div class="label-bc">${barcode}</div>
                    <div class="label-price">Rp ${Number(price).toLocaleString('id-ID')}</div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        printWindow.onload = function() {
            printWindow.focus();
        };
    }, 300);
}

// ==========================================
// FIX BUG BLANK ON LOAD: Memastikan DB Siap Sebelum Render
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof db !== 'undefined') {
        // Tunggu sedikit agar Dexie siap (opsional untuk perangkat lambat)
        setTimeout(async () => {
            await generateCategoryTabs();
            
            // Set paksa tombol 'Semua' aktif secara visual
            const allBtn = document.querySelector('.inv-cat-btn');
            if(allBtn) filterInventory('Semua', allBtn);
            else renderInventoryList('Semua');
            
        }, 100);

        document.getElementById('search-inventory')?.addEventListener('input', (e) => {
            renderInventoryList(currentCategoryFilter, e.target.value);
        });
    }
});
