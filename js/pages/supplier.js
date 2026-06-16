// js/pages/supplier.js

let restockCart = [];
let html5QrcodeScanner = null;

// ==========================================
// GANTI TAB ANTARMUKA
// ==========================================
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

// ==========================================
// 1. DATA SUPPLIER
// ==========================================
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
                select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
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

// ==========================================
// 2. SCANNER RESTOCK (Deteksi Barcode Ritel)
// ==========================================
function toggleScanner() {
    const modal = document.getElementById('scanner-modal');
    if (!modal) return;
    
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden'); modal.classList.add('flex');
        
        if(html5QrcodeScanner) html5QrcodeScanner.clear();
        html5QrcodeScanner = new Html5Qrcode("reader");
        
        html5QrcodeScanner.start(
            { facingMode: "environment", focusMode: "continuous" }, 
            { 
                fps: 10, 
                qrbox: { width: 300, height: 150 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39
                ]
            }, 
            (decodedText) => {
                html5QrcodeScanner.stop().then(() => {
                    modal.classList.replace('flex', 'hidden');
                    addScannedProductToCart(decodedText);
                });
            }, () => {}
        ).catch(err => { alert("Akses Kamera ditolak."); modal.classList.replace('flex', 'hidden'); });
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
            // Prediksi Harga Modal (70% dari Harga Jual) - Bisa diubah manual oleh Kasir
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
                            <input type="number" min="1" value="${item.qty}" onchange="updateRestockInput(${index}, 'qty', this.value)" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-center outline-none focus:border-orange-400">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-slate-500 uppercase">Modal Satuan (Rp)</label>
                            <input type="number" min="0" value="${item.cost_price}" onchange="updateRestockInput(${index}, 'cost_price', this.value)" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-right outline-none text-orange-500 focus:border-orange-400">
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

// ==========================================
// 3. PROSES SIMPAN BARANG MASUK (DP/CICIL)
// ==========================================
async function processRestock() {
    if (restockCart.length === 0) return alert("Keranjang masih kosong!");
    
    const supplierId = document.getElementById('supplier-select').value;
    if (!supplierId) return alert("Pilih Supplier terlebih dahulu!");
    
    let invoiceNo = document.getElementById('invoice-input').value;
    if (!invoiceNo) invoiceNo = 'PO-' + new Date().getTime().toString().slice(-6);

    const totalTagihan = restockCart.reduce((sum, i) => sum + (i.qty * i.cost_price), 0);
    
    // Ambil uang DP yang diketik kasir (Jika kosong, artinya 0)
    let amountPaid = parseInt(document.getElementById('restock-pay-input').value) || 0;
    
    if(amountPaid > totalTagihan) { amountPaid = totalTagihan; }

    let status = 'Tempo';
    let dueDate = null;
    
    if (amountPaid >= totalTagihan) {
        status = 'Lunas';
    } else {
        let d = new Date();
        d.setDate(d.getDate() + 14); // Jatuh tempo 14 hari
        dueDate = d.toISOString();
    }

    try {
        const purchaseId = await db.purchases.add({
            invoice_no: invoiceNo, supplier_id: parseInt(supplierId), date: new Date().toISOString(),
            total: totalTagihan, status: status, amount_paid: amountPaid, due_date: dueDate
        });

        for (let item of restockCart) {
            await db.purchase_items.add({
                purchase_id: purchaseId, product_id: item.barcode, name: item.name,
                qty: item.qty, cost_price: item.cost_price, subtotal: item.qty * item.cost_price
            });
            // Update Stok Asli
            await db.products.update(item.id, { stock: item.stock + item.qty });
        }

        let pesan = status === 'Lunas' ? "LUNAS!" : `HUTANG (DP: Rp ${amountPaid.toLocaleString('id-ID')})`;
        alert(`Berhasil! Barang masuk tersimpan.\nStatus: ${pesan}`);
        
        restockCart = []; 
        document.getElementById('invoice-input').value = '';
        document.getElementById('restock-pay-input').value = '';
        updateRestockUI(); loadHutang(); 
    } catch (e) { console.error(e); alert("Terjadi kesalahan sistem."); }
}

// ==========================================
// 4. BUKU HUTANG (ACCOUNTS PAYABLE)
// ==========================================
async function loadHutang() {
    const list = document.getElementById('hutang-list');
    let totalHutang = 0;
    list.innerHTML = '';
    
    try {
        const hutangData = await db.purchases.where('status').equals('Tempo').toArray();
        
        if(hutangData.length === 0) {
            list.innerHTML = '<div class="col-span-full text-slate-400 text-sm py-4">Tidak ada tagihan hutang berjalan.</div>';
        } else {
            for (let h of hutangData) {
                const sisaTagihan = h.total - h.amount_paid;
                totalHutang += sisaTagihan;
                
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
                            <span class="bg-rose-100 text-rose-600 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Tempo: ${dueStr}</span>
                        </div>
                        <div class="mt-3 mb-4 bg-slate-50 p-2 rounded-lg text-xs">
                            <div class="flex justify-between text-slate-500 mb-1"><span>Total Beli:</span> <span>Rp ${h.total.toLocaleString('id-ID')}</span></div>
                            <div class="flex justify-between text-emerald-600 font-bold border-b border-slate-200 pb-1 mb-1"><span>Telah Dibayar:</span> <span>Rp ${h.amount_paid.toLocaleString('id-ID')}</span></div>
                            <div class="flex justify-between font-extrabold text-rose-600 mt-1"><span>SISA HUTANG:</span> <span>Rp ${sisaTagihan.toLocaleString('id-ID')}</span></div>
                        </div>
                        <div class="flex justify-end">
                            <button onclick="bayarHutang(${h.id}, ${sisaTagihan})" class="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition shadow-sm flex items-center">
                                <i data-lucide="wallet" class="w-3 h-3 mr-1.5"></i> Bayar Cicilan / Lunas
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        document.getElementById('total-hutang').textContent = `Rp ${totalHutang.toLocaleString('id-ID')}`;
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

async function bayarHutang(purchaseId, sisaTagihan) {
    let inputCicilan = prompt(`Masukkan nominal yang akan dibayarkan (Sisa Hutang: Rp ${sisaTagihan.toLocaleString('id-ID')}):`);
    
    if (inputCicilan === null || inputCicilan === "") return;
    
    let nominalDibayar = parseInt(inputCicilan);
    if (isNaN(nominalDibayar) || nominalDibayar <= 0) return alert("Nominal tidak valid!");

    try {
        const p = await db.purchases.get(purchaseId);
        let newAmountPaid = p.amount_paid + nominalDibayar;
        let newStatus = 'Tempo';

        if (newAmountPaid >= p.total) {
            newAmountPaid = p.total;
            newStatus = 'Lunas';
            alert("Nota ini telah LUNAS!");
        } else {
            alert(`Berhasil masuk cicilan Rp ${nominalDibayar.toLocaleString('id-ID')}. Sisa hutang: Rp ${(p.total - newAmountPaid).toLocaleString('id-ID')}`);
        }

        await db.purchases.update(purchaseId, { status: newStatus, amount_paid: newAmountPaid });
        loadHutang(); 
    } catch (error) { console.error("Gagal membayar hutang:", error); }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        loadSuppliers(); loadHutang(); updateRestockUI();
        lucide.createIcons();
    }
});
