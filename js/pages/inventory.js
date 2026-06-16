// js/pages/inventory.js

let currentCategoryFilter = 'Semua';
let formBarcodeScanner = null;
let bulkPrintData = [];

function imgErrorLocal(image) {
    image.onerror = "";
    image.src = "https://images.unsplash.com/photo-1584824486509-112e4181f1b6?w=200"; 
    return true;
}

// 1. Generate Kategori Otomatis
async function generateCategoryTabs() {
    try {
        const products = await db.products.toArray();
        const uniqueCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
        const tabsContainer = document.getElementById('category-tabs');
        if (!tabsContainer) return;
        tabsContainer.innerHTML = `<button onclick="filterInventory('Semua', this)" class="inv-cat-btn px-5 py-2 rounded-xl ${currentCategoryFilter === 'Semua' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600'} font-bold text-sm shadow-sm whitespace-nowrap transition">Semua</button>`;
        uniqueCategories.forEach(cat => {
            const isActive = currentCategoryFilter === cat;
            tabsContainer.innerHTML += `<button onclick="filterInventory('${cat}', this)" class="inv-cat-btn px-5 py-2 rounded-xl ${isActive ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'} font-medium text-sm whitespace-nowrap hover:bg-slate-50 transition">${cat}</button>`;
        });
        const datalist = document.getElementById('category-options');
        if (datalist) {
            datalist.innerHTML = '';
            uniqueCategories.forEach(cat => { datalist.innerHTML += `<option value="${cat}"></option>`; });
        }
    } catch (error) { console.error(error); }
}

// 2. Render List Inventori Utama
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
            listContainer.innerHTML = `<div class="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm"><p class="text-slate-400 text-sm font-medium">Tidak ada produk.</p></div>`;
            return;
        }
        filteredProducts.forEach(p => {
            const itemRow = document.createElement('div');
            let stockColorClass = "text-emerald-500"; let stockLabel = "Pcs";
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
    } catch (error) { console.error(error); }
}

function filterInventory(category, btnElement) {
    currentCategoryFilter = category;
    const buttons = document.querySelectorAll('.inv-cat-btn');
    buttons.forEach(btn => btn.className = 'inv-cat-btn px-5 py-2 rounded-xl bg-white text-slate-600 font-medium text-sm border border-slate-200 whitespace-nowrap hover:bg-slate-50 transition');
    if(btnElement) btnElement.className = 'inv-cat-btn px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm whitespace-nowrap transition';
    const searchVal = document.getElementById('search-inventory')?.value || '';
    renderInventoryList(category, searchVal);
}

// 3. Modal Edit / Tambah
function openFormModal(product = null) {
    const modal = document.getElementById('product-form-modal');
    const formTitle = document.getElementById('modal-form-title');
    const deleteBtn = document.getElementById('btn-delete-product');
    const printQrBtn = document.getElementById('btn-print-qr');
    
    modal.classList.remove('hidden'); modal.classList.add('flex');
    document.getElementById('form-file-upload').value = "";
    const btnSubmit = document.querySelector('#product-main-form button[type="submit"]');
    btnSubmit.disabled = false; btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');

    if (product) {
        formTitle.innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 mr-2 text-orange-500"></i> Edit Detail Produk`;
        deleteBtn.classList.remove('hidden'); deleteBtn.classList.add('flex');
        printQrBtn.classList.remove('hidden'); printQrBtn.classList.add('flex');      
        document.getElementById('form-product-id').value = product.id;
        document.getElementById('form-name').value = product.name;
        document.getElementById('form-barcode').value = product.barcode;
        document.getElementById('form-category').value = product.category;
        document.getElementById('form-price').value = product.price;
        document.getElementById('form-stock').value = product.stock;
        document.getElementById('form-image').value = product.image_url || '';
    } else {
        formTitle.innerHTML = `<i data-lucide="box" class="w-5 h-5 mr-2 text-orange-500"></i> Tambah Produk Baru`;
        deleteBtn.classList.remove('flex'); deleteBtn.classList.add('hidden');
        printQrBtn.classList.remove('flex'); printQrBtn.classList.add('hidden');    
        document.getElementById('product-main-form').reset();
        document.getElementById('form-product-id').value = '';
        document.getElementById('form-image').value = '';
    }
    lucide.createIcons();
}

function closeFormModal() {
    document.getElementById('product-form-modal').classList.add('hidden');
    document.getElementById('product-form-modal').classList.remove('flex');
    if (formBarcodeScanner) formBarcodeScanner.stop().catch(e => {});
}

// 4. Scanner Kamera 30FPS
function toggleFormScanner() {
    const modal = document.getElementById('form-scanner-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden'); modal.classList.add('flex');
        formBarcodeScanner = new Html5Qrcode("form-reader");
        formBarcodeScanner.start({ facingMode: "environment" }, { fps: 30, qrbox: { width: 280, height: 120 }, aspectRatio: 1.0 }, 
            (decodedText) => {
                document.getElementById('form-barcode').value = decodedText;
                formBarcodeScanner.stop();
                modal.classList.add('hidden'); modal.classList.remove('flex');
            }, (errorMessage) => {}
        ).catch((err) => {
            alert("Akses kamera ditolak.");
            modal.classList.add('hidden'); modal.classList.remove('flex');
        });
    } else {
        modal.classList.add('hidden'); modal.classList.remove('flex');
        if(formBarcodeScanner) formBarcodeScanner.stop().catch(e => {});
    }
}

// 5. Upload Foto ke Cloud
async function uploadPhotoToDrive() {
    const fileInput = document.getElementById('form-file-upload');
    const imageInput = document.getElementById('form-image');
    const btnSubmit = document.querySelector('#product-main-form button[type="submit"]');
    
    if (fileInput.files.length === 0) return;
    if (!navigator.onLine) { alert("Harus online untuk upload gambar."); return; }

    btnSubmit.disabled = true; btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></i> Uploading...';

    const file = fileInput.files[0];
    imageInput.value = "Mempersiapkan gambar...";

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64Image = e.target.result;
        imageInput.value = "Sedang mengirim ke Google Drive...";
        try {
            const response = await fetch(SHEET_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'upload_image', image: base64Image, mimeType: file.type, fileName: 'PROD_' + new Date().getTime(), subFolder: 'Produk' }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const result = await response.json();
            if (result.status === 'success') imageInput.value = result.url;
            else alert("Gagal mengupload gambar.");
        } catch (error) { alert("Gangguan jaringan."); imageInput.value = ""; } 
        finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false; btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    };
    reader.readAsDataURL(file); 
}

// 6. Simpan Form
async function saveProductForm(e) {
    e.preventDefault();
    if (document.getElementById('form-image').value.includes("Sedang")) return alert("Harap tunggu hingga upload selesai!");

    const id = document.getElementById('form-product-id').value;
    const productData = { 
        id: id || ('P' + new Date().getTime().toString().slice(-4)), 
        barcode: String(document.getElementById('form-barcode').value).trim(), 
        name: document.getElementById('form-name').value, 
        category: document.getElementById('form-category').value.trim(), 
        price: parseInt(document.getElementById('form-price').value) || 0, 
        stock: parseInt(document.getElementById('form-stock').value) || 0, 
        image_url: document.getElementById('form-image').value || "https://images.unsplash.com/photo-1584824486509-112e4181f1b6?w=200" 
    };

    const btnSubmit = document.querySelector('#product-main-form button[type="submit"]');
    const originalText = btnSubmit.innerHTML;

    try {
        if (navigator.onLine) {
            btnSubmit.innerHTML = 'Menyinkronkan ke Cloud...'; btnSubmit.disabled = true;
            const response = await fetch(SHEET_URL, {
                method: 'POST', body: JSON.stringify({ action: 'save_product', product: productData }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });
            const result = await response.json();
            if (result.status !== 'success') throw new Error(result.message || "Ditolak sistem cloud.");
        }

        if (id) await db.products.update(id, productData); else await db.products.add(productData);

        closeFormModal(); await generateCategoryTabs();
        renderInventoryList(currentCategoryFilter, document.getElementById('search-inventory')?.value || '');
    } catch (error) { alert("❌ Gagal Menyimpan! Pastikan Turbo Sync sudah diklik."); } 
    finally { btnSubmit.innerHTML = originalText; btnSubmit.disabled = false; }
}

async function deleteProductForm() {
    const id = document.getElementById('form-product-id').value;
    if (id && confirm("Hapus produk ini?")) {
        await db.products.delete(id); closeFormModal(); await generateCategoryTabs(); renderInventoryList(currentCategoryFilter);
    }
}

// ==========================================
// FITUR BARU: MODAL CETAK MASSAL
// ==========================================
async function openBulkPrintModal() {
    const modal = document.getElementById('bulk-print-modal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
    document.getElementById('search-bulk-print').value = '';
    
    const products = await db.products.toArray();
    bulkPrintData = products.map(p => ({ ...p, printQty: 0 }));
    
    renderBulkPrintList();
    updateBulkTotal();
}

function closeBulkPrintModal() {
    document.getElementById('bulk-print-modal').classList.add('hidden');
    document.getElementById('bulk-print-modal').classList.remove('flex');
}

function renderBulkPrintList(keyword = '') {
    const list = document.getElementById('bulk-print-list');
    list.innerHTML = '';
    
    const filtered = bulkPrintData.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()) || String(p.barcode).includes(keyword));
    
    filtered.forEach(p => {
        const isSelected = p.printQty > 0;
        list.innerHTML += `
            <div class="flex items-center justify-between p-3 border border-slate-100 rounded-xl mb-2 ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50'} transition cursor-pointer" onclick="toggleBulkItem('${p.barcode}')">
                <div class="flex items-center space-x-3">
                    <div class="w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}">
                        ${isSelected ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-800 line-clamp-1">${p.name}</p>
                        <p class="text-[10px] text-slate-500 font-mono">BC: ${p.barcode}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-1" onclick="event.stopPropagation()">
                    <button onclick="updateBulkQty('${p.barcode}', -1)" class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 shadow-sm"><i data-lucide="minus" class="w-3 h-3"></i></button>
                    <input type="number" value="${p.printQty}" class="w-10 h-8 text-center text-sm font-bold text-slate-800 bg-transparent border-none outline-none" readonly>
                    <button onclick="updateBulkQty('${p.barcode}', 1)" class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 shadow-sm"><i data-lucide="plus" class="w-3 h-3"></i></button>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

function toggleBulkItem(barcode) {
    const item = bulkPrintData.find(p => p.barcode === String(barcode));
    if (item) {
        item.printQty = item.printQty > 0 ? 0 : 1;
        renderBulkPrintList(document.getElementById('search-bulk-print').value);
        updateBulkTotal();
    }
}

function updateBulkQty(barcode, change) {
    const item = bulkPrintData.find(p => p.barcode === String(barcode));
    if (item) {
        item.printQty += change;
        if (item.printQty < 0) item.printQty = 0;
        renderBulkPrintList(document.getElementById('search-bulk-print').value);
        updateBulkTotal();
    }
}

function updateBulkTotal() {
    const total = bulkPrintData.reduce((sum, item) => sum + item.printQty, 0);
    document.getElementById('bulk-total-labels').textContent = total;
}

// Eksekusi Cetak (Bisa Massal atau Tunggal)
async function executeBulkPrint(singleItem = null) {
    let itemsToPrint = [];
    if (singleItem) {
        itemsToPrint = [singleItem]; // Paksa hanya cetak barang ini
    } else {
        itemsToPrint = bulkPrintData.filter(p => p.printQty > 0); // Cetak banyak barang
    }
    
    if (itemsToPrint.length === 0) return alert("Pilih minimal satu barang untuk dicetak.");

    let htmlLabels = '';

    for (let item of itemsToPrint) {
        for (let i = 0; i < item.printQty; i++) {
            const qrDiv = document.createElement('div');
            new QRCode(qrDiv, { text: item.barcode, width: 150, height: 150, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
            
            await new Promise(r => setTimeout(r, 10)); 
            const qrImageSrc = qrDiv.querySelector('canvas').toDataURL("image/png");

            htmlLabels += `
                <div class="label-container">
                    <div class="label-name">${item.name}</div>
                    <img src="${qrImageSrc}" class="label-qr" alt="QR Code" />
                    <div class="label-bc">${item.barcode}</div>
                    <div class="label-price">Rp ${Number(item.price).toLocaleString('id-ID')}</div>
                </div>
            `;
        }
    }

    const totalLabels = itemsToPrint.reduce((sum, item) => sum + item.printQty, 0);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Cetak Label QR</title>
            <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; padding: 20px; background: #f8fafc; margin: 0; }
                .label-container { background: white; border: 2px dashed #cbd5e1; padding: 15px; border-radius: 16px; text-align: center; width: 180px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .label-name { font-size: 12px; font-weight: 800; color: #1e293b; margin-bottom: 8px; line-height: 1.2; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .label-qr { width: 120px; height: 120px; margin: 0 auto; border: 1px solid #f1f5f9; padding: 5px; border-radius: 8px; }
                .label-bc { font-size: 10px; color: #64748b; font-family: monospace; margin-top: 5px; letter-spacing: 1px; }
                .label-price { font-size: 16px; font-weight: 900; color: #000; margin-top: 8px; }
                .print-btn-wrapper { width: 100%; display: flex; justify-content: center; margin-bottom: 20px; flex-direction: column; align-items: center; }
                .print-btn { background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 6px rgba(37,99,235,0.2); transition: 0.2s; }
                .print-btn:hover { background: #1d4ed8; }
                .info-text { font-size: 11px; color: #64748b; margin-bottom: 10px; text-align: center; max-width: 400px; }
                
                @media print {
                    @page { margin: 2mm; }
                    body { background: white; padding: 0; margin: 0; gap: 2mm; justify-content: flex-start; }
                    .print-btn-wrapper { display: none; }
                    .label-container { border: 1px solid #000; box-shadow: none; padding: 2mm; width: 46mm; max-width: 100%; border-radius: 2mm; margin: 0; page-break-inside: avoid; }
                    .label-name { font-size: 10px; margin-bottom: 2mm; color: #000; font-weight: bold; white-space: normal; overflow: visible; }
                    .label-qr { width: 34mm; height: 34mm; padding: 0; border: none; display: block; margin: 0 auto; }
                    .label-bc { font-size: 9px; color: #000; margin-top: 1mm; }
                    .label-price { font-size: 13px; margin-top: 2mm; color: #000; font-weight: bold; }
                }
            </style>
        </head>
        <body>
            <div class="print-btn-wrapper">
                <div class="info-text">Pilih ukuran kertas di dialog print. (Kertas A4 = Grid otomatis. Kertas Roll 58mm = Tersusun vertikal).</div>
                <button class="print-btn" onclick="window.print()">Cetak ${totalLabels} Label Sekarang</button>
            </div>
            ${htmlLabels}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.onload = function() { printWindow.focus(); };
}

// 7. Cetak Label Tunggal (Dari Modal Edit)
function printProductQR() {
    const barcode = document.getElementById('form-barcode').value;
    if (!barcode) return alert("Barcode tidak boleh kosong!");
    
    // Kirim objek spesifik agar yang tercetak hanya 1 barang ini
    const singleItem = {
        name: document.getElementById('form-name').value,
        barcode: barcode,
        price: document.getElementById('form-price').value,
        printQty: 1
    };
    executeBulkPrint(singleItem);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof db !== 'undefined') {
        setTimeout(async () => {
            await generateCategoryTabs();
            const allBtn = document.querySelector('.inv-cat-btn');
            if(allBtn) filterInventory('Semua', allBtn); else renderInventoryList('Semua');
        }, 100);

        document.getElementById('search-inventory')?.addEventListener('input', (e) => {
            renderInventoryList(currentCategoryFilter, e.target.value);
        });
    }
});
