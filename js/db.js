// js/db.js

// Inisialisasi Database Local menggunakan Dexie
const db = new Dexie("POSPocketDB");

// Skema Database (Menggunakan versi 2 agar me-reset/menimpa versi sebelumnya)
db.version(2).stores({
    products: 'id, barcode, name, category, price, stock, image_url',
    sales: '++id, receipt_no, date, total, payment_method, sync_status', 
    sale_items: '++id, sale_id, product_id, qty, price, subtotal',
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
            image_url: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=200" 
        },
        { 
            id: "P002", 
            barcode: "789012", 
            name: "Air Mineral Nestle 600ml", 
            category: "Beverages", 
            price: 5000, 
            stock: 100, 
            image_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc5e?w=200" 
        },
        { 
            id: "P003", 
            barcode: "345678", 
            name: "Lays Chips Rasa Sapi", 
            category: "Snacks", 
            price: 12000, 
            stock: 30, 
            image_url: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200" 
        },
        { 
            id: "P004", 
            barcode: "901234", 
            name: "Oreo Original Pack", 
            category: "Snacks", 
            price: 8500, 
            stock: 45, 
            image_url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200" 
        }
    ]);
});

// Fungsi Helper (Opsional, untuk mengambil pengaturan aplikasi)
async function getSetting(key, defaultValue = '') {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
}