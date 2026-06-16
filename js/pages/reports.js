// js/pages/reports.js

let allSalesData = [];
let filteredSalesData = [];
let salesChartInstance = null; // Menyimpan objek grafik agar bisa di-update/dihapus

// 1. FUNGSI UTAMA: Memuat Data Saat Halaman Dibuka
async function loadReports() {
    try {
        // Ambil SEMUA data penjualan dari database, urutkan dari yang terbaru
        allSalesData = await db.sales.orderBy('date').reverse().toArray();
        
        // Panggil filter 'today' (Hari Ini) secara default saat halaman pertama kali dimuat
        filterByDate('today');
    } catch (error) {
        console.error("Gagal memuat laporan:", error);
        document.getElementById('transaction-list').innerHTML = '<p class="text-center text-rose-500 font-bold py-10">Gagal memuat data.</p>';
    }
}

// 2. FUNGSI FILTER WAKTU & WARNA TOMBOL
function filterByDate(range, btnElement = null) {
    // A. Reset semua warna tombol kembali ke abu-abu (tidak aktif)
    document.querySelectorAll('.date-filter-btn').forEach(btn => {
        btn.className = 'date-filter-btn px-5 py-2 rounded-xl bg-white text-slate-600 font-medium text-sm border border-slate-200 whitespace-nowrap hover:bg-slate-50 transition';
    });

    // B. Tentukan tombol mana yang harus diwarnai Oranye
    let targetBtn = btnElement;
    if (!targetBtn) {
        // Jika dipanggil oleh sistem (bukan klik user), cari berdasarkan atribut data-range
        targetBtn = document.querySelector(`.date-filter-btn[data-range="${range}"]`);
    }
    
    if (targetBtn) {
        targetBtn.className = 'date-filter-btn px-5 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm whitespace-nowrap transition';
    }

    // C. Kalkulasi Rentang Tanggal
    const now = new Date();
    let startDate = new Date();

    if (range === 'today') {
        startDate.setHours(0, 0, 0, 0);
    } else if (range === '7days') {
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    } else if (range === '30days') {
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
    } else if (range === 'all') {
        startDate = new Date('2000-01-01'); // Tarik ke masa lalu untuk ambil semua data
    }

    // D. Saring data berdasarkan tanggal
    filteredSalesData = allSalesData.filter(sale => new Date(sale.date) >= startDate);
    
    // E. Render ulang semua komponen di layar dengan data yang baru disaring
    renderSummary(filteredSalesData);
    renderTransactionList(filteredSalesData);
    renderChart(filteredSalesData, range);
    renderTopProducts(filteredSalesData);
}

// 3. RENDER KARTU RINGKASAN
function renderSummary(sales) {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    document.getElementById('report-total-revenue').textContent = `Rp ${totalRevenue.toLocaleString('id-ID')}`;
    document.getElementById('report-total-sales').textContent = sales.length;
}

// 4. RENDER GRAFIK PENJUALAN (CHART.JS)
function renderChart(sales, range) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    const groupedData = {};
    
    // Siapkan kerangka waktu kosong agar grafik tetap tergambar rapi meski tidak ada penjualan
    if (range === '7days' || range === '30days') {
        let daysCount = range === '7days' ? 7 : 30;
        for (let i = daysCount - 1; i >= 0; i--) {
            let d = new Date();
            d.setDate(d.getDate() - i);
            let dateKey = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            groupedData[dateKey] = 0;
        }
    } else if (range === 'today') {
        // Jika Hari Ini, rentang waktunya per 2 jam (dari jam 8 pagi - 22 malam)
        for (let i = 8; i <= 22; i+=2) { 
            groupedData[`${i}:00`] = 0;
        }
    }

    // Masukkan data penjualan asli ke dalam grup yang sesuai
    sales.forEach(sale => {
        const dateObj = new Date(sale.date);
        let key = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        
        if (range === 'today') {
            let hour = dateObj.getHours();
            hour = hour % 2 === 0 ? hour : hour - 1; // Pembulatan ke angka genap
            key = `${hour}:00`;
        }

        if (groupedData[key] !== undefined) {
            groupedData[key] += sale.total;
        } else {
            groupedData[key] = sale.total; // Untuk filter 'Semua Waktu'
        }
    });

    const labels = Object.keys(groupedData);
    const dataPoints = Object.values(groupedData);

    // Hapus grafik lama sebelum menggambar grafik baru
    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    // Gambar grafik baru menggunakan Chart.js
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pendapatan (Rp)',
                data: dataPoints,
                borderColor: '#ff5722',
                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#ff5722',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Membuat kurva melengkung elegan
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Rp ' + context.raw.toLocaleString('id-ID');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { borderDash: [5, 5], color: '#f1f5f9' },
                    ticks: {
                        font: { size: 10, family: "'Segoe UI', sans-serif" },
                        color: '#94a3b8',
                        callback: function(value) {
                            if(value === 0) return 0;
                            return value >= 1000 ? (value / 1000) + 'k' : value; 
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#94a3b8' }
                }
            }
        }
    });
}

// 5. RENDER PRODUK TERLARIS (LEADERBOARD)
async function renderTopProducts(sales) {
    const listContainer = document.getElementById('top-products-list');
    if(!listContainer) return;
    
    listContainer.innerHTML = '<div class="flex justify-center py-4"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div></div>';

    if (sales.length === 0) {
        listContainer.innerHTML = '<p class="text-slate-400 text-xs text-center py-2">Belum ada penjualan.</p>';
        return;
    }

    try {
        // Ambil ID dari transaksi yang sudah difilter
        const saleIds = sales.map(s => s.id);
        
        // Tarik rincian barang dari database Dexie berdasarkan sale_id
        const items = await db.sale_items.where('sale_id').anyOf(saleIds).toArray();
        
        // Akumulasi jumlah terjual per nama produk
        const productCounts = {};
        items.forEach(item => {
            if (!productCounts[item.name]) {
                productCounts[item.name] = { qty: 0, revenue: 0 };
            }
            productCounts[item.name].qty += item.qty;
            productCounts[item.name].revenue += item.subtotal;
        });

        // Urutkan dari yang terbanyak
        const sortedProducts = Object.entries(productCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5); // Ambil 5 Besar Saja

        listContainer.innerHTML = '';
        sortedProducts.forEach((p, index) => {
            let rankColor = 'text-slate-400 bg-slate-100';
            if(index === 0) rankColor = 'text-amber-600 bg-amber-100 font-extrabold shadow-sm'; // Emas
            else if(index === 1) rankColor = 'text-slate-600 bg-slate-200 font-bold'; // Perak
            else if(index === 2) rankColor = 'text-orange-700 bg-orange-100 font-bold'; // Perunggu

            listContainer.innerHTML += `
                <div class="flex items-center justify-between group">
                    <div class="flex items-center space-x-3 truncate pr-2">
                        <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${rankColor} shrink-0">
                            ${index + 1}
                        </div>
                        <div class="truncate">
                            <p class="text-xs font-bold text-slate-800 truncate">${p.name}</p>
                            <p class="text-[10px] font-medium text-slate-500">Omzet: Rp ${p.revenue.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="text-sm font-extrabold text-emerald-500">${p.qty}</span>
                        <span class="text-[10px] text-slate-400 font-medium ml-1">Terjual</span>
                    </div>
                </div>
                ${index !== sortedProducts.length - 1 ? '<hr class="border-slate-50">' : ''}
            `;
        });
    } catch (error) {
        console.error("Gagal memuat top produk:", error);
    }
}

// 6. RENDER DAFTAR RIWAYAT TRANSAKSI (NOTA)
function renderTransactionList(salesToRender) {
    const listContainer = document.getElementById('transaction-list');
    if(!listContainer) return;
    
    listContainer.innerHTML = '';

    if (salesToRender.length === 0) {
        listContainer.innerHTML = `
            <div class="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
                <div class="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="receipt" class="w-8 h-8 text-slate-300"></i>
                </div>
                <p class="text-slate-500 text-sm font-medium">Belum ada transaksi di periode ini.</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    salesToRender.forEach(sale => {
        const dateObj = new Date(sale.date);
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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
            <div class="text-right">
                <p class="text-sm font-extrabold text-orange-500 mb-1">Rp ${sale.total.toLocaleString('id-ID')}</p>
                <p class="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 inline-block hover:bg-slate-100">Cetak <i data-lucide="printer" class="w-3 h-3 inline"></i></p>
            </div>
        `;
        listContainer.appendChild(itemRow);
    });
    lucide.createIcons();
}

// 7. MODAL CETAK ULANG STRUK
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

        // Menampilkan data (akan muncul NaN atau 0 jika data amount_paid belum ada di versi database lama)
        document.getElementById('reprint-total').textContent = `Rp ${sale.total.toLocaleString('id-ID')}`;
        document.getElementById('reprint-cash').textContent = `Rp ${(sale.amount_paid || sale.total).toLocaleString('id-ID')}`;
        document.getElementById('reprint-change').textContent = `Rp ${(sale.change || 0).toLocaleString('id-ID')}`;

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

// 8. FITUR PENCARIAN NOTA
document.getElementById('search-report')?.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    // Cari dari data yang SEDANG difilter tanggalnya
    const searchedSales = filteredSalesData.filter(sale => 
        sale.receipt_no.toLowerCase().includes(keyword)
    );
    renderTransactionList(searchedSales);
});

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        loadReports();
    }
});
