// js/db.js

// Inisialisasi Database Local menggunakan Dexie
const db = new Dexie("POSPocketDB");

// Skema Database (Naikkan ke Versi 3 untuk menambahkan kolom amount_paid, change, dan name)
db.version(3).stores({
    products: 'id, barcode, name, category, price, stock, image_url',
    sales: '++id, receipt_no, date, total, payment_method, amount_paid, change, sync_status', 
    sale_items: '++id, sale_id, product_id, name, qty, price, subtotal',
    suppliers: '++id, name, phone, address',
    employees: 'id, name, role, division',
    attendance: '++id, employee_id, date, check_in, status, sync_status',
    settings: 'key, value'
});

// Auto-Populate: Menyuntikkan data dummy saat database pertama kali dibuat/kosong
db.on('populate', function () {
    db.products.bulkAdd([
        { 
            id: "P001", 
            barcode: "123456", 
            name: "Red Bull Energy Drink", 
            category: "Beverages", 
            price: 15000, 
            stock: 50, 
            image_url: "https://lh3.googleusercontent.com/d/1MxWuHNDOlDcHKBT2Id-Jo6COZFSHnHoa" 
        },
        { 
            id: "P002", 
            barcode: "789012", 
            name: "Air Mineral Nestle 600ml", 
            category: "Beverages", 
            price: 5000, 
            stock: 100, 
            image_url: "https://lh3.googleusercontent.com/d/1SiIwqPy4q6f25CzmkR3qYDmCN991nFZM" 
        },
        { 
            id: "P003", 
            barcode: "345678", 
            name: "Lays Chips Rasa Sapi", 
            category: "Snacks", 
            price: 12000, 
            stock: 30, 
            image_url: "https://lh3.googleusercontent.com/d/1A2_KYyqhxRWcGNi-1KAEcMQxy4clP5yT" 
        },
        { 
            id: "P004", 
            barcode: "901234", 
            name: "Oreo Original Pack", 
            category: "Snacks", 
            price: 8500, 
            stock: 45, 
            image_url: "https://lh3.googleusercontent.com/d/1IOMeyvPPYORPcldVrqmcZbPIWCJyUG22" 
        }
    ]);
    db.suppliers.add({ name: "PT. Gudang Utama", phone: "08123456789", address: "Jl. Industri No 1" });
});

// Fungsi Helper (Opsional, untuk mengambil pengaturan aplikasi)
async function getSetting(key, defaultValue = '') {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
}
