// js/pages/supplier.js

let restockCart = [];
let html5QrcodeScanner = null;

// Ganti Tab
function switchTab(tabName) {
    ['restock', 'hutang', 'data'].forEach(name => {
        document.getElementById(`view-${name}`).classList.add('hidden');
        document.getElementById(`view-${name}`).classList.remove('block');
        
        const btn = document.getElementById(`tab-${name}`);
        btn.className = 'px-5 py-2.5 rounded-xl bg-slate-50 text-slate-600 font-medium text-sm border border-slate-200 whitespace-nowrap hover:bg-slate-100 transition';
    });

    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    document.getElementById(`view-${tabName}`).classList.add('block');
    document.getElementById(`tab-${tabName}`).className = 'px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm whitespace-nowrap transition';
}

// 1. DATA SUPPLIER
async function loadSuppliers() {
    const list = document.getElementById('supplier-list');
    const select = document.getElementById('supplier-select');
    list.innerHTML = ''; select.innerHTML = '<option value="">Pilih Supplier...</option>';
    
    try {
        const suppliers = await db.suppliers.toArray();
        if (suppliers.length === 0) {
            list.innerHTML = '<p class="text-slate-400 text-sm">Belum ada data supplier.</p>';
        } else {
            suppliers.forEach(s => {
                // Untuk Dropdown Restock
                select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                
                // Untuk Kartu Data Supplier
                list.innerHTML += `
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div class="flex items-center mb-2">
                            <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mr-3"><i data-lucide="truck"></i></div>
                            <div>
                                <h3 class="font-extrabold text-sm text-slate-800">${s.name}</h3>
                                <p class="text-[11px] font-medium text-slate-500"><i data-lucide="phone" class="w-3 h-3 inline mr-1"></i>${s.phone}</p>
                            </div>
                        </div>
                        <p class="text-xs text-slate-500 mt-3 line-clamp-2">${s.address}</p>
                    </div>
                `;
            });
        }
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function openSupplierModal() { document.getElementById('supplier-modal').classList.replace('hidden', 'flex'); }
function closeSupplierModal() { document.getElementById('supplier-modal').classList.replace('flex', 'hidden'); }

async function saveSupplier(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('sup-name').value,
        phone: document.getElementById('sup-phone').value,
        address: document.getElementById('sup-address').value
    };
    await db.suppliers.add(data);
    closeSupplierModal(); document.getElementById('supplier-form').reset(); loadSuppliers();
}

// 2. SCANNER RESTOCK (Gaya Modern)
function toggleScanner() {
    const modal = document.getElementById('scanner-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden'); modal.classList.add('flex');
        
        if(html5QrcodeScanner) html5QrcodeScanner.clear();
        html5QrcodeScanner = new Html5Qrcode("reader");
        
        html5QrcodeScanner.start(
            { facingMode: "environment", focusMode: "continuous" }, 
            { 
                fps: 10, qrbox: { width: 300, height: 150 },
                formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.CODE_128 ]
            }, 
            (decodedText) => {
                html5QrcodeScanner.stop().then(() => {
                    modal.classList.replace('flex', 'hidden');
                    addScannedProductToCart(decodedText);
                });
            }, () => {}
        ).catch(err => { alert("Kamera ditolak."); modal.classList.replace('flex', 'hidden'); });
    } else {
        modal.classList.replace('flex', 'hidden');
        if(html5QrcodeScanner) html5QrcodeScanner.stop();
    }
}

async function addScannedProductToCart(barcode) {
    const product = await db.products.where('barcode').equals(barcode).first() || await db.products.where('barcode').equals(Number(barcode)).first();
    
    if (product) {
        const existing = restockCart.find(i => String(i.barcode) === String(product.barcode));
        if (existing) {
            existing.qty += 1;
        } else {
            // Asumsi harga modal adalah 70% dari harga jual. Bisa diedit manual nanti.
            restockCart.push({ ...product, qty: 1, cost_price: Math.round(product.price * 0.7) });
        }
        updateRestockUI();
    } else {
        alert("Barang tidak dikenali. Tambahkan dulu di Inventori!");
    }
}

function updateRestockUI() {
    const container = document.getElementById('restock-cart');
    let total = 0;
    container.innerHTML = '';
    
    if(restockCart.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-10 text-sm">Keranjang masuk kosong.</div>';
    } else {
        restockCart.forEach((item, index) => {
            const subtotal = item.qty * item.cost_price;
            total += subtotal;
            container.innerHTML += `
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 relative">
                    <button onclick="removeRestockItem(${index})" class="absolute top-2 right-2 text-rose-400 hover:text-rose-600"><i data-lucide="x" class="w-4 h-4"></i></button>
                    <h4 class="font-bold text-sm text-slate-800 mb-1 pr-6">${item.name}</h4>
                    <p class="text-[10px] text-slate-500 mb-2">Sisa stok saat ini: ${item.stock}</p>
                    
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <label class="text-[10px] font-bold text-slate-500 uppercase">Jumlah (+)</label>
                            <input type="number" min="1" value="${item.qty}" onchange="updateRestockInput(${index}, 'qty', this.value)" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-500 uppercase">Harga Modal (Rp)</label>
                            <input type="number" min="0" value="${item.cost_price}" onchange="updateRestockInput(${index}, 'cost_price', this.value)" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-right outline-none text-orange-500">
                        </div>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('restock-total').textContent = `Rp ${total.toLocaleString('id-ID')}`;
    lucide.createIcons();
}

function updateRestockInput(index, field, value) {
    restockCart[index][field] = parseInt(value) || 0;
    updateRestockUI();
}
function removeRestockItem(index) {
    restockCart.splice(index, 1);
    updateRestockUI();
}

// 3. PROSES RESTOCK (LUNAS / TEMPO)
async function processRestock(status) {
    if (restockCart.length === 0) return alert("Keranjang masih kosong!");
    
    const supplierId = document.getElementById('supplier-select').value;
    if (!supplierId) return alert("Pilih Supplier terlebih dahulu!");
    
    let invoiceNo = document.getElementById('invoice-input').value;
    if (!invoiceNo) invoiceNo = 'PO-' + new Date().getTime().toString().slice(-6);

    const total = restockCart.reduce((sum, i) => sum + (i.qty * i.cost_price), 0);
    
    // Tentukan nilai yang dibayar. Jika Tempo (Kasbon), amount_paid = 0.
    const amountPaid = status === 'Lunas' ? total : 0;
    
    // Tanggal jatuh tempo (Default 14 Hari jika Tempo)
    let dueDate = null;
    if (status === 'Tempo') {
        let d = new Date();
        d.setDate(d.getDate() + 14); 
        dueDate = d.toISOString();
    }

    try {
        // Simpan nota pembelian ke database
        const purchaseId = await db.purchases.add({
            invoice_no: invoiceNo, supplier_id: parseInt(supplierId), date: new Date().toISOString(),
            total: total, status: status, amount_paid: amountPaid, due_date: dueDate
        });

        // Simpan rincian barang dan update stok
        for (let item of restockCart) {
            await db.purchase_items.add({
                purchase_id: purchaseId, product_id: item.barcode, name: item.name,
                qty: item.qty, cost_price: item.cost_price, subtotal: item.qty * item.cost_price
            });
            // Update stok Inventori asli
            await db.products.update(item.id, { stock: item.stock + item.qty });
        }

        alert(`Berhasil! Barang masuk disimpan. Status: ${status}`);
        restockCart = []; document.getElementById('invoice-input').value = '';
        updateRestockUI(); loadHutang(); // Refresh Buku Hutang
    } catch (e) { console.error(e); alert("Terjadi kesalahan sistem."); }
}

// 4. BUKU HUTANG (ACCOUNTS PAYABLE)
async function loadHutang() {
    const list = document.getElementById('hutang-list');
    let totalHutang = 0;
    list.innerHTML = '';
    
    try {
        // Ambil data pembelian yang berstatus 'Tempo'
        const hutangData = await db.purchases.where('status').equals('Tempo').toArray();
        
        if(hutangData.length === 0) {
            list.innerHTML = '<div class="col-span-full text-slate-400 text-sm py-4">Tidak ada tagihan hutang berjalan.</div>';
        } else {
            for (let h of hutangData) {
                const sisaTagihan = h.total - h.amount_paid;
                totalHutang += sisaTagihan;
                
                // Cari nama supplier
                const sup = await db.suppliers.get(h.supplier_id);
                const supName = sup ? sup.name : 'Unknown Supplier';
                
                const dueStr = new Date(h.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

                list.innerHTML += `
                    <div class="bg-white border-l-4 border-l-rose-500 p-4 rounded-xl shadow-sm relative">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-extrabold text-sm text-slate-800">${supName}</h4>
                                <p class="text-[10px] font-mono text-slate-500">${h.invoice_no}</p>
                            </div>
                            <span class="bg-rose-100 text-rose-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Jatuh Tempo: ${dueStr}</span>
                        </div>
                        <div class="flex justify-between items-end mt-4">
                            <div>
                                <p class="text-[10px] text-slate-400 font-bold uppercase">Sisa Tagihan</p>
                                <p class="text-lg font-extrabold text-rose-600">Rp ${sisaTagihan.toLocaleString('id-ID')}</p>
                            </div>
                            <button onclick="lunasiHutang(${h.id})" class="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition">Lunasi</button>
                        </div>
                    </div>
                `;
            }
        }
        document.getElementById('total-hutang').textContent = `Rp ${totalHutang.toLocaleString('id-ID')}`;
    } catch (e) { console.error(e); }
}

async function lunasiHutang(purchaseId) {
    if(confirm("Tandai nota ini sebagai LUNAS? Saldo akan tercatat di pengeluaran.")) {
        const p = await db.purchases.get(purchaseId);
        await db.purchases.update(purchaseId, { status: 'Lunas', amount_paid: p.total });
        alert("Nota berhasil dilunasi!");
        loadHutang();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        loadSuppliers();
        loadHutang();
        updateRestockUI();
        lucide.createIcons();
    }
});