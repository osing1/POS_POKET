// js/db.js

const db = new Dexie("POSPocketDB");

// V5: Tambah tabel customers untuk fitur Member & Kasbon Pelanggan
db.version(5).stores({
    products: 'id, barcode, name, category, price, stock, image_url',
    sales: '++id, receipt_no, date, total, payment_method, amount_paid, change, sync_status', 
    sale_items: '++id, sale_id, product_id, name, qty, price, subtotal',
    suppliers: '++id, name, phone, address',
    purchases: '++id, invoice_no, supplier_id, date, total, status, amount_paid, due_date', 
    purchase_items: '++id, purchase_id, product_id, name, qty, cost_price, subtotal',
    employees: '++id, name, role, pin, phone', // Diperbarui untuk PIN Kasir
    customers: '++id, name, phone, address, points', // Tabel Baru
    attendance: '++id, employee_id, date, check_in, status, sync_status',
    settings: 'key, value'
});

db.on('populate', function () {
    db.products.bulkAdd([
        { id: "P001", barcode: "123456", name: "Red Bull Energy Drink", category: "Beverages", price: 15000, stock: 50, image_url: "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=200" },
        { id: "P002", barcode: "789012", name: "Air Mineral Nestle 600ml", category: "Beverages", price: 5000, stock: 100, image_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc5e?w=200" }
    ]);
    db.employees.add({ name: "Admin Utama", role: "Admin", pin: "1234", phone: "08111" });
});

async function getSetting(key, defaultValue = '') {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
}
