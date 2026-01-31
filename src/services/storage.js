// src/services/storage.js
export const StorageService = {
    getData: (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
    saveData: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    
    getSuppliers: () => StorageService.getData('gif4_suppliers'),
    saveSupplier: (supplier) => {
        let suppliers = StorageService.getSuppliers();
        const index = suppliers.findIndex(s => s.id === supplier.id || s.name === supplier.name);
        if (index >= 0) suppliers[index] = { ...suppliers[index], ...supplier }; else suppliers.push(supplier);
        StorageService.saveData('gif4_suppliers', suppliers);
        return suppliers;
    },
    deleteSupplier: (id) => {
        const s = StorageService.getSuppliers().filter(x => x.id !== id);
        StorageService.saveData('gif4_suppliers', s); return s;
    },
    deleteSale: (id) => {
        const s = StorageService.getData('gif4_sales').filter(x => x.id !== id);
        StorageService.saveData('gif4_sales', s); return s;
    },
    deleteExpense: (id) => {
        const e = StorageService.getData('gif4_expenses').filter(x => x.id !== id);
        StorageService.saveData('gif4_expenses', e); return e;
    }
};
