// js/pages/pos.js

let cart = [];
let html5QrcodeScanner = null;
let currentCheckoutTotal = 0;

function imgError(image) {
    image.onerror = "";
    image.src = "https://images.unsplash.com/photo-1584824486509-112e4181f1b6?w=200"; 
    return true;
}

function changeCategory(category, btnElement) {
    const allBtns = document.querySelectorAll('.cat-btn');
    allBtns.forEach(btn => btn.className = 'cat-btn px-5 py-2 rounded-xl bg-slate-50 text-slate-600 font-medium text-sm border border-slate-200 whitespace-nowrap hover:bg-slate-100 transition');
    btnElement.className = 'cat-btn px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm whitespace-nowrap transition';
    renderProducts(category);
}

async function renderProducts(categoryFilter = 'Semua') {
    const grid = document.getElementById('product-grid'); 
    if (!grid) return; 
    grid.innerHTML = '<div class="col-span-full flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>';

    try {
        let products = categoryFilter === 'Semua' 
            ? await db.products.toArray() 
            : await db.products.where('category').equals(categoryFilter).toArray();
        renderFilteredProducts(products);
    } catch (error) { console.error(error); }
}

function renderFilteredProducts(products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = ''; 

    if (products.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center mt-20"><div class="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"><i data-lucide="package-x" class="w-10 h-10 text-slate-400"></i></div><p class="text-slate-500 font-medium text-sm">Produk tidak ditemukan.</p></div>';
        lucide.createIcons();
        return;
    }

    products.forEach(p => {
        // PERBAIKAN: Konversi ke String agar tipe data Number dari DB cocok dengan String di HTML
        const inCart = cart.find(item => String(item.barcode) === String(p.barcode));
        const card = document.createElement('div');
        
        card.className = `bg-white rounded-2xl p-3 shadow-sm border flex flex-col relative h-full transition-all duration-200 ${inCart ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-100 hover:border-slate-300 hover:shadow-md'}`;

        card.innerHTML = `
            <span class="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur text-slate-800 text-[10px] font-extrabold px-2 py-1 rounded-md shadow-sm border border-slate-100">Rp ${Number(p.price).toLocaleString('id-ID')}</span>
            
            <div onclick='openProductPreview(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="h-28 w-full bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2 overflow-hidden relative cursor-pointer group">
                <div class="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><i data-lucide="eye" class="text-slate-700 w-6 h-6"></i></div>
                <img src="${p.image_url}" onerror="imgError(this);" class="max-h-full object-contain mix-blend-multiply transition-transform group-hover:scale-110 duration-300" alt="${p.name}">
            </div>
            
            <h3 class="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mb-3 px-1">${p.name}</h3>
            <div class="mt-auto"></div>
            
            ${inCart ? `
            <div class="flex items-center justify-between bg-orange-50 rounded-xl p-1 border border-orange-200 h-9">
                <button onclick="updateQty('${p.barcode}', -1)" class="w-8 h-full bg-white text-orange-500 rounded-lg font-bold shadow-sm hover:bg-orange-100 flex items-center justify-center transition"><i data-lucide="minus" class="w-4 h-4"></i></button>
                <span class="text-sm font-extrabold text-slate-800">${inCart.qty}</span>
                <button onclick="updateQty('${p.barcode}', 1)" class="w-8 h-full bg-orange-500 text-white rounded-lg font-bold shadow-sm hover:bg-orange-600 flex items-center justify-center transition"><i data-lucide="plus" class="w-4 h-4"></i></button>
            </div>
            ` : `
            <button onclick='addToCart(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="w-full h-9 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-sm tracking-wide">Tambah</button>
            `}
        `;
        grid.appendChild(card);
    });
    lucide.createIcons(); 
}

function addToCart(product) {
    // PERBAIKAN: Tambahkan String()
    const existing = cart.find(item => String(item.barcode) === String(product.barcode));
    if (!existing) cart.push({ ...product, qty: 1 });
    else existing.qty += 1;
    updateCartUI();
    refreshCurrentGrid();
    closeProductModal(); 
}

function updateQty(barcode, change) {
    // PERBAIKAN: Tambahkan String() dan pastikan change adalah integer
    const item = cart.find(item => String(item.barcode) === String(barcode));
    if (item) {
        item.qty += parseInt(change);
        if (item.qty <= 0) cart = cart.filter(i => String(i.barcode) !== String(barcode)); 
    }
    updateCartUI();
    refreshCurrentGrid();
}

function refreshCurrentGrid() {
    const searchInput = document.getElementById('search-input');
    if(searchInput && searchInput.value) { 
        triggerSearch(searchInput.value); 
    } else {
        const activeBtn = document.querySelector('.cat-btn.bg-orange-500');
        const currentCategory = activeBtn ? activeBtn.innerText.trim() : 'Semua';
        renderProducts(currentCategory);
    }
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    currentCheckoutTotal = totalPrice; 

    document.getElementById('mobile-cart-badge').textContent = totalItems;
    document.getElementById('mobile-cart-badge').style.display = totalItems > 0 ? 'flex' : 'none';
    document.getElementById('total-price').textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
    document.getElementById('desktop-item-count').textContent = `${totalItems} Item`;

    const cartContainer = document.getElementById('cart-container');
    cartContainer.innerHTML = ''; 

    if (cart.length === 0) {
        cartContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400"><i data-lucide="shopping-cart" class="w-12 h-12 mb-3 opacity-30"></i><p class="text-sm font-medium">Keranjang masih kosong</p></div>`;
    } else {
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'bg-white p-3 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]';
            cartItem.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1 pr-2">
                        <h4 class="text-sm font-bold text-slate-800 line-clamp-1">${item.name}</h4>
                        <p class="text-[10px] text-slate-500 font-medium">Rp ${Number(item.price).toLocaleString('id-ID')} / pcs</p>
                    </div>
                    <button onclick="updateQty('${item.barcode}', -${item.qty})" class="text-red-400 hover:text-red-600 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
                <div class="flex items-center justify-between border-t border-slate-50 pt-2">
                    <div class="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                        <button onclick="updateQty('${item.barcode}', -1)" class="w-7 h-7 bg-white text-slate-600 rounded shadow-sm flex items-center justify-center hover:text-orange-500 transition"><i data-lucide="minus" class="w-3 h-3"></i></button>
                        <span class="text-xs font-bold w-8 text-center text-slate-800">${item.qty}</span>
                        <button onclick="updateQty('${item.barcode}', 1)" class="w-7 h-7 bg-white text-slate-600 rounded shadow-sm flex items-center justify-center hover:text-orange-500 transition"><i data-lucide="plus" class="w-3 h-3"></i></button>
                    </div>
                    <p class="text-sm font-extrabold text-orange-500">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</p>
                </div>
            `;
            cartContainer.appendChild(cartItem);
        });
    }
    lucide.createIcons(); 
}

function openProductPreview(p) {
    document.getElementById('product-modal').classList.remove('hidden');
    document.getElementById('product-modal').classList.add('flex');
    setTimeout(() => { document.getElementById('product-modal-content').classList.remove('translate-y-full'); }, 10);
    document.getElementById('preview-img').src = p.image_url;
    document.getElementById('preview-name').textContent = p.name;
    document.getElementById('preview-category').textContent = p.category;
    document.getElementById('preview-barcode').innerHTML = `<i data-lucide="barcode" class="w-3 h-3 inline mr-1"></i>${p.barcode}`;
    document.getElementById('preview-price').textContent = `Rp ${Number(p.price).toLocaleString('id-ID')}`;
    document.getElementById('preview-stock').textContent = `${p.stock} Pcs`;
    document.getElementById('preview-add-btn').onclick = () => addToCart(p);
    lucide.createIcons();
}

function closeProductModal() {
    document.getElementById('product-modal-content').classList.add('translate-y-full');
    setTimeout(() => {
        document.getElementById('product-modal').classList.add('hidden');
        document.getElementById('product-modal').classList.remove('flex');
    }, 300);
}

let currentPaymentMethod = 'Cash'; // Default metode pembayaran

// 4. Modul Pembayaran (Checkout)
function processPayment() {
    if(cart.length === 0) return alert('Keranjang masih kosong!');
    
    const cartPanel = document.getElementById('cart-panel');
    if (cartPanel && cartPanel.classList.contains('cart-slide-up')) toggleMobileCart();

    document.getElementById('checkout-modal').classList.remove('hidden');
    document.getElementById('checkout-modal').classList.add('flex');
    document.getElementById('checkout-total').textContent = `Rp ${currentCheckoutTotal.toLocaleString('id-ID')}`;
    
    // Reset ke metode Tunai secara default saat modal dibuka
    selectPaymentMethod('Cash');
    
    // Buat Tombol Uang Cepat
    const quickCashContainer = document.getElementById('quick-cash-buttons');
    quickCashContainer.innerHTML = '';
    const quickAmounts = [currentCheckoutTotal, 50000, 100000, 200000];
    const uniqueAmounts = [...new Set(quickAmounts)].filter(a => a >= currentCheckoutTotal).slice(0, 3);
    
    uniqueAmounts.forEach(amount => {
        const btn = document.createElement('button');
        btn.className = "bg-orange-50 border border-orange-200 text-orange-600 font-bold py-2 rounded-lg text-sm hover:bg-orange-100 transition";
        btn.textContent = amount === currentCheckoutTotal ? "Uang Pas" : `${(amount/1000)}k`;
        btn.onclick = () => {
            document.getElementById('cash-input').value = amount;
            calculateChange();
        };
        quickCashContainer.appendChild(btn);
    });
    
    lucide.createIcons();
}

function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    const btnCash = document.getElementById('btn-pay-cash');
    const btnQris = document.getElementById('btn-pay-qris');
    const secCash = document.getElementById('section-cash');
    const secQris = document.getElementById('section-qris');
    const btnComplete = document.getElementById('btn-complete-pay');

    if (method === 'Cash') {
        // Styling Tab
        btnCash.className = "flex-1 py-2.5 bg-white shadow-sm rounded-lg text-sm font-bold text-slate-800 transition";
        btnQris.className = "flex-1 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition";
        // Tampilkan Form Tunai
        secCash.classList.remove('hidden');
        secCash.classList.add('block');
        secQris.classList.remove('flex');
        secQris.classList.add('hidden');
        
        // Reset Kalkulasi
        document.getElementById('cash-input').value = '';
        calculateChange(); 
    } else {
        // Styling Tab
        btnQris.className = "flex-1 py-2.5 bg-white shadow-sm rounded-lg text-sm font-bold text-slate-800 transition";
        btnCash.className = "flex-1 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition";
        // Tampilkan Form QRIS
        secQris.classList.remove('hidden');
        secQris.classList.add('flex');
        secCash.classList.remove('block');
        secCash.classList.add('hidden');
        
        // Karena QRIS otomatis uang pas, langsung aktifkan tombol selesai
        btnComplete.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg transition flex justify-center items-center cursor-pointer";
        btnComplete.style.pointerEvents = 'auto';
    }
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.add('hidden');
    document.getElementById('checkout-modal').classList.remove('flex');
}

function calculateChange() {
    if (currentPaymentMethod !== 'Cash') return;

    const cashInput = parseInt(document.getElementById('cash-input').value) || 0;
    const change = cashInput - currentCheckoutTotal;
    const changeElement = document.getElementById('checkout-change');
    const btnComplete = document.getElementById('btn-complete-pay');

    if (cashInput >= currentCheckoutTotal) {
        changeElement.textContent = `Rp ${change.toLocaleString('id-ID')}`;
        changeElement.className = "text-2xl font-extrabold text-emerald-600";
        btnComplete.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg transition flex justify-center items-center cursor-pointer";
        btnComplete.style.pointerEvents = 'auto';
    } else {
        changeElement.textContent = `Kurang Rp ${Math.abs(change).toLocaleString('id-ID')}`;
        changeElement.className = "text-lg font-bold text-red-500";
        btnComplete.className = "w-full bg-slate-300 text-slate-500 font-bold py-4 rounded-xl transition flex justify-center items-center pointer-events-none";
        btnComplete.style.pointerEvents = 'none';
    }
}

async function completeTransaction() {
    // Logika nilai berdasarkan metode pembayaran
    let cashInput = currentCheckoutTotal;
    let change = 0;
    let paymentText = 'QRIS';

    if (currentPaymentMethod === 'Cash') {
        cashInput = parseInt(document.getElementById('cash-input').value) || 0;
        change = cashInput - currentCheckoutTotal;
        paymentText = 'Tunai';
    }
    
    const receiptNo = 'INV-' + new Date().getTime().toString().slice(-6);
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    const dateStr = new Date().toLocaleString('id-ID', options);

    try {
        const saleId = await db.sales.add({
            receipt_no: receiptNo,
            date: new Date().toISOString(),
            total: currentCheckoutTotal,
            payment_method: paymentText, // Masuk ke Database
            amount_paid: cashInput,
            change: change,
            sync_status: 0 
        });

        for (let item of cart) {
            await db.sale_items.add({
                sale_id: saleId,
                product_id: item.barcode, 
                name: item.name,
                qty: item.qty,
                price: item.price,
                subtotal: item.price * item.qty
            });
            const prod = await db.products.where('barcode').equals(item.barcode).first() || await db.products.where('barcode').equals(Number(item.barcode)).first();
            if(prod) await db.products.update(prod.id, {stock: prod.stock - item.qty});
        }

        // Generate Struk Visual
        document.getElementById('rcpt-no').textContent = receiptNo;
        document.getElementById('rcpt-date').textContent = dateStr;
        
        // Sesuaikan teks metode pembayaran di struk
        const rcptMethodElements = document.querySelectorAll('.receipt-method-text');
        if(rcptMethodElements.length > 0) {
            rcptMethodElements.forEach(el => el.textContent = paymentText);
        }

        const rcptItems = document.getElementById('rcpt-items');
        rcptItems.innerHTML = '';
        cart.forEach(item => {
            rcptItems.innerHTML += `
                <div class="flex justify-between items-start">
                    <div class="flex-1 pr-2">
                        <span class="block">${item.name}</span>
                        <span class="text-slate-500">${item.qty} x ${Number(item.price).toLocaleString('id-ID')}</span>
                    </div>
                    <span>${(item.price * item.qty).toLocaleString('id-ID')}</span>
                </div>
            `;
        });

        document.getElementById('rcpt-total').textContent = `Rp ${currentCheckoutTotal.toLocaleString('id-ID')}`;
        document.getElementById('rcpt-cash').textContent = `Rp ${cashInput.toLocaleString('id-ID')}`;
        document.getElementById('rcpt-change').textContent = `Rp ${change.toLocaleString('id-ID')}`;

        cart = [];
        closeCheckout();
        updateCartUI();
        refreshCurrentGrid();

        document.getElementById('receipt-modal').classList.remove('hidden');
        document.getElementById('receipt-modal').classList.add('flex');

        // Picu Sync Otomatis
        if (navigator.onLine && typeof syncSalesToCloud === 'function') {
            syncSalesToCloud(true);
        }

    } catch (error) {
        console.error("Gagal memproses transaksi:", error);
        alert("Terjadi kesalahan saat memproses data.");
    }
}

function closeReceipt() {
    document.getElementById('receipt-modal').classList.add('hidden');
    document.getElementById('receipt-modal').classList.remove('flex');
}

function toggleMobileCart() {
    const cartPanel = document.getElementById('cart-panel');
    const overlay = document.getElementById('cart-overlay');
    if (cartPanel.classList.contains('cart-slide-down')) {
        cartPanel.classList.replace('cart-slide-down', 'cart-slide-up');
        overlay.classList.remove('hidden');
    } else {
        cartPanel.classList.replace('cart-slide-up', 'cart-slide-down');
        overlay.classList.add('hidden');
    }
}

function toggleScanner() {
    const modal = document.getElementById('scanner-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        html5QrcodeScanner = new Html5Qrcode("reader");
        html5QrcodeScanner.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: {width: 250, height: 250} }, 
            (decodedText) => {
                html5QrcodeScanner.stop();
                toggleScanner();
                cariDanTambahProdukByBarcode(decodedText);
            },
            (errorMessage) => {}
        ).catch((err) => {
            alert("Izin kamera ditolak atau kamera tidak ditemukan.");
            toggleScanner();
        });
    } else {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        if(html5QrcodeScanner) html5QrcodeScanner.stop().catch(e => console.log(e));
    }
}

async function cariDanTambahProdukByBarcode(barcode) {
    // Cari produk menggunakan konversi longgar
    const allProducts = await db.products.toArray();
    const product = allProducts.find(p => String(p.barcode) === String(barcode));
    
    if(product) addToCart(product);
    else alert(`Produk dengan barcode ${barcode} tidak ditemukan.`);
}

async function triggerSearch(keyword) {
    keyword = keyword.toLowerCase();
    const allProducts = await db.products.toArray();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(keyword) || String(p.barcode).includes(keyword));
    renderFilteredProducts(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        renderProducts();
        updateCartUI();
        document.getElementById('search-input')?.addEventListener('input', (e) => triggerSearch(e.target.value));
    }
});