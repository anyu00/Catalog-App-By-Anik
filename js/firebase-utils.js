// Firebase Utilities - CRUD & data operations
// Helper functions for database operations

import { db } from './firebase-config.js';
import { ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// ===== CATALOG OPERATIONS =====

/**
 * Save or update a catalog entry in Firebase
 * @param {string} catalogId - Unique ID for catalog
 * @param {Object} catalogData - { catalogName, catalogItem, catalogPrice, catalogPOS, catalogQty, catalogRemarks }
 */
export function saveCatalog(catalogId, catalogData) {
    const catalogRef = ref(db, 'Catalogs/' + catalogId);
    return set(catalogRef, {
        ...catalogData,
        timestamp: new Date().toISOString()
    });
}

/**
 * Fetch all catalogs from Firebase
 * @returns {Promise<Array>} Array of catalog objects with their IDs
 */
export async function fetchAllCatalogs() {
    const catalogsRef = ref(db, 'Catalogs');
    const snapshot = await get(catalogsRef);
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

/**
 * Delete a catalog entry
 * @param {string} catalogId - ID of catalog to delete
 */
export function deleteCatalog(catalogId) {
    const catalogRef = ref(db, 'Catalogs/' + catalogId);
    return remove(catalogRef);
}

/**
 * Listen to real-time catalog changes
 * @param {Function} callback - Function to call with catalogs data
 */
export function onCatalogsChange(callback) {
    const catalogsRef = ref(db, 'Catalogs');
    return onValue(catalogsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const catalogs = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            callback(catalogs);
        } else {
            callback([]);
        }
    });
}

// ===== ORDER OPERATIONS =====

/**
 * Save or update an order in Firebase
 * @param {string} orderId - Unique ID for order
 * @param {Object} orderData - { orderItem, orderQuantity, orderMessage, orderDate, orderStatus }
 */
export function saveOrder(orderId, orderData) {
    const orderRef = ref(db, 'Orders/' + orderId);
    return set(orderRef, {
        ...orderData,
        timestamp: new Date().toISOString()
    });
}

/**
 * Fetch all orders from Firebase
 * @returns {Promise<Array>} Array of order objects with their IDs
 */
export async function fetchAllOrders() {
    const ordersRef = ref(db, 'Orders');
    const snapshot = await get(ordersRef);
    
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

/**
 * Delete an order
 * @param {string} orderId - ID of order to delete
 */
export function deleteOrder(orderId) {
    const orderRef = ref(db, 'Orders/' + orderId);
    return remove(orderRef);
}

/**
 * Listen to real-time order changes
 * @param {Function} callback - Function to call with orders data
 */
export function onOrdersChange(callback) {
    const ordersRef = ref(db, 'Orders');
    return onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const orders = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            callback(orders);
        } else {
            callback([]);
        }
    });
}

// ===== HELPER FUNCTIONS =====

/**
 * Generate sample catalog data (for testing/demo)
 */
export function generateSampleCatalogs() {
    const samples = [
        { catalogName: "Electronics", catalogItem: "Laptop", catalogPrice: 1200, catalogPOS: "POS001", catalogQty: 5, catalogRemarks: "High-end model" },
        { catalogName: "Electronics", catalogItem: "Mouse", catalogPrice: 25, catalogPOS: "POS002", catalogQty: 50, catalogRemarks: "Wireless" },
        { catalogName: "Office", catalogItem: "Desk Chair", catalogPrice: 350, catalogPOS: "POS003", catalogQty: 10, catalogRemarks: "Ergonomic" }
    ];
    
    samples.forEach((item, idx) => {
        const id = 'catalog_' + Date.now() + '_' + idx;
        saveCatalog(id, item);
    });
}

/**
 * Generate sample order data (for testing/demo)
 */
export function generateSampleOrders() {
    const samples = [
        { orderItem: "Laptop", orderQuantity: 2, orderMessage: "Urgent delivery", orderDate: new Date().toISOString().split('T')[0], orderStatus: "Pending" },
        { orderItem: "Mouse", orderQuantity: 10, orderMessage: "Standard delivery", orderDate: new Date().toISOString().split('T')[0], orderStatus: "Confirmed" }
    ];
    
    samples.forEach((item, idx) => {
        const id = 'order_' + Date.now() + '_' + idx;
        saveOrder(id, item);
    });
}

/**
 * Clear all catalogs (use with caution)
 */
export async function clearAllCatalogs() {
    const catalogsRef = ref(db, 'Catalogs');
    return remove(catalogsRef);
}

/**
 * Clear all orders (use with caution)
 */
export async function clearAllOrders() {
    const ordersRef = ref(db, 'Orders');
    return remove(ordersRef);
}
