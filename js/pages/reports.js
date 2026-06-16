// js/pages/reports.js

let allSalesData = [];

async function loadReports() {
    const listContainer = document.getElementById('transaction-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>';

    try {
        // Ambil semua data penjualan dan urutkan dari yang terbaru
        allSalesData = await db.sales.orderBy('date').reverse().toArray();
        
        renderSummary(allSalesData);
        renderTransactionList(allSalesData);

    } catch (error) {
        console.error("Gagal memuat laporan:", error);
        listContainer.innerHTML = '<p class="text-center text-rose-500 font-bold py-10">Gagal memuat data.</p>';
    }
}

function renderSummary(sales) {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = sales.length;

    document.getElementById('report-total-revenue').textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;
    document.getElementById('report-total-sales').textContent = totalTransactions;
}

function renderTransactionList(salesToRender) {
    const listContainer = document.getElementById('transaction-list');
    listContainer.innerHTML = '';

    if (salesToRender.length === 0) {
        listContainer.innerHTML = `
            <div class="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                <div class="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="receipt" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-slate-500 text-sm font-medium">Belum ada transaksi.</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    salesToRender.forEach(sale => {
        // Format Tanggal
        const dateObj = new Date(sale.date);
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        // Warna Badge Pembayaran
        const methodColor = sale.payment_method === 'QRIS' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600';

        const itemRow = document.createElement('div');
        itemRow.className = 'bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between hover:border-orange-300 transition cursor-pointer';
        itemRow.onclick = () => openReprintModal(sale.id);

        itemRow.innerHTML = `
            <div class="flex items-center space-x-4">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
                    <i data-lucide="file-text" class="text-slate-600 w-6 h-6"></i>
                </div>
                <div>
                    <h4 class="text-sm font-extrabold text-slate-800">${sale.receipt_no}</h4>
                    <p class="text-[11px] text-slate-500 font-medium mt-0.5">${dateStr} • ${timeStr}</p>
                    <span class="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${methodColor}">${sale.payment_method}</span>
                </div>
            </div>
            <div class="text-right flex items-center space-x-3">
                <div>
                    <p class="text-sm font-extrabold text-orange-500">Rp ${sale.total.toLocaleString('id-ID')}</p>
                    <p class="text-[10px] text-slate-400 font-bold mt-1">Cetak Ulang <i data-lucide="printer" class="w-3 h-3 inline"></i></p>
                </div>
            </div>
        `;
        listContainer.appendChild(itemRow);
    });
    lucide.createIcons();
}

async function openReprintModal(saleId) {
    try {
        const sale = await db.sales.get(saleId);
        if (!sale) return;

        const saleItems = await db.sale_items.where('sale_id').equals(saleId).toArray();

        const dateObj = new Date(sale.date);
        const dateStr = dateObj.toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        document.getElementById('reprint-no').textContent = sale.receipt_no;
        document.getElementById('reprint-date').textContent = dateStr;
        document.getElementById('reprint-method').textContent = sale.payment_method;
        document.getElementById('reprint-method-label').textContent = sale.payment_method;

        const itemsContainer = document.getElementById('reprint-items');
        itemsContainer.innerHTML = '';
        
        saleItems.forEach(item => {
            itemsContainer.innerHTML += `
                <div class="flex justify-between items-start text-xs">
                    <div class="flex-1 pr-2">
                        <span class="block">${item.name}</span>
                        <span class="text-slate-500">${item.qty} x ${Number(item.price).toLocaleString('id-ID')}</span>
                    </div>
                    <span>${(item.subtotal).toLocaleString('id-ID')}</span>
                </div>
            `;
        });

        document.getElementById('reprint-total').textContent = `Rp ${sale.total.toLocaleString('id-ID')}`;
        document.getElementById('reprint-cash').textContent = `Rp ${sale.amount_paid.toLocaleString('id-ID')}`;
        document.getElementById('reprint-change').textContent = `Rp ${sale.change.toLocaleString('id-ID')}`;

        const modal = document.getElementById('receipt-reprint-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');

    } catch (error) {
        console.error("Gagal memuat detail struk:", error);
    }
}

function closeReprintModal() {
    const modal = document.getElementById('receipt-reprint-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Fitur Pencarian (Berdasarkan No Invoice)
document.getElementById('search-report')?.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filteredSales = allSalesData.filter(sale => 
        sale.receipt_no.toLowerCase().includes(keyword)
    );
    renderTransactionList(filteredSales);
});

// Load data saat halaman dibuka
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        loadReports();
    }
});
