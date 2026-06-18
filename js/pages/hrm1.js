// js/pages/hrm.js

// Ganti Tab
function switchTab(tabName) {
    ['karyawan', 'pelanggan', 'piutang'].forEach(name => {
        document.getElementById(`view-${name}`).classList.add('hidden');
        document.getElementById(`view-${name}`).classList.remove('block');
        
        const btn = document.getElementById(`tab-${name}`);
        btn.className = 'px-5 py-2.5 rounded-xl bg-slate-50 text-slate-600 font-medium text-sm border border-slate-200 whitespace-nowrap hover:bg-slate-100 transition';
    });

    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    document.getElementById(`view-${tabName}`).classList.add('block');
    document.getElementById(`tab-${tabName}`).className = 'px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm whitespace-nowrap transition';
}

// =====================================
// 1. MANAJEMEN KARYAWAN (Kasir & Admin)
// =====================================
async function loadEmployees() {
    const list = document.getElementById('employee-list');
    list.innerHTML = '';
    
    try {
        const employees = await db.employees.toArray();
        if (employees.length === 0) {
            list.innerHTML = '<p class="text-slate-400 text-sm">Belum ada data karyawan.</p>';
        } else {
            employees.forEach(emp => {
                const roleColor = emp.role === 'Admin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600';
                list.innerHTML += `
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative">
                        <button onclick="deleteEmployee(${emp.id})" class="absolute top-3 right-3 text-slate-300 hover:text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        <div class="flex items-center mb-3">
                            <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mr-3 font-bold text-slate-500 text-lg">${emp.name.charAt(0)}</div>
                            <div>
                                <h3 class="font-extrabold text-sm text-slate-800">${emp.name}</h3>
                                <span class="inline-block mt-0.5 text-[9px] font-bold px-2 py-0.5 rounded-md ${roleColor}">${emp.role}</span>
                            </div>
                        </div>
                        <div class="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                            <p class="text-[10px] text-slate-400 font-bold uppercase mb-0.5">PIN Akses Shift</p>
                            <p class="text-sm font-mono font-bold text-slate-700 tracking-[0.2em]">${emp.pin || '****'}</p>
                        </div>
                    </div>
                `;
            });
        }
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function openEmployeeModal() { document.getElementById('employee-modal').classList.replace('hidden', 'flex'); }
function closeEmployeeModal() { document.getElementById('employee-modal').classList.replace('flex', 'hidden'); }

async function saveEmployee(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('emp-name').value,
        role: document.getElementById('emp-role').value,
        pin: document.getElementById('emp-pin').value
    };
    await db.employees.add(data);
    closeEmployeeModal(); document.getElementById('employee-form').reset(); loadEmployees();
}

async function deleteEmployee(id) {
    if(confirm("Hapus data karyawan ini?")) {
        await db.employees.delete(id); loadEmployees();
    }
}

// =====================================
// 2. MANAJEMEN PELANGGAN (Member)
// =====================================
async function loadCustomers(keyword = '') {
    const list = document.getElementById('customer-list');
    list.innerHTML = '';
    
    try {
        const customers = await db.customers.toArray();
        const filtered = customers.filter(c => c.name.toLowerCase().includes(keyword.toLowerCase()));

        if (filtered.length === 0) {
            list.innerHTML = '<p class="text-slate-400 text-sm">Tidak ada pelanggan ditemukan.</p>';
        } else {
            filtered.forEach(cust => {
                list.innerHTML += `
                    <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div class="flex items-start justify-between mb-2">
                            <div>
                                <h3 class="font-extrabold text-sm text-slate-800">${cust.name}</h3>
                                <p class="text-[11px] font-medium text-slate-500"><i data-lucide="phone" class="w-3 h-3 inline mr-1"></i>${cust.phone}</p>
                            </div>
                            <button onclick="deleteCustomer(${cust.id})" class="text-slate-300 hover:text-rose-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                        <p class="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">${cust.address || '-'}</p>
                    </div>
                `;
            });
        }
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function openCustomerModal() { document.getElementById('customer-modal').classList.replace('hidden', 'flex'); }
function closeCustomerModal() { document.getElementById('customer-modal').classList.replace('flex', 'hidden'); }

async function saveCustomer(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        address: document.getElementById('cust-address').value,
        points: 0 // Default poin 0
    };
    await db.customers.add(data);
    closeCustomerModal(); document.getElementById('customer-form').reset(); loadCustomers();
}

async function deleteCustomer(id) {
    if(confirm("Hapus data pelanggan ini?")) {
        await db.customers.delete(id); loadCustomers();
    }
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        loadEmployees();
        loadCustomers();
        lucide.createIcons();
    }
});
