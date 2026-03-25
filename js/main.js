// MAIN.JS - Complete Application Logic
// Combines all Firebase operations, forms, tables, charts, calendar, and analytics

// ===== IMPORTS =====
import { db } from './firebase-config.js';
import { messaging } from './firebase-config.js';
import { initNotificationSystem, addNotification } from './notifications-firebase.js';
import { onAuthStateChanged, getCurrentUser, logoutUser, updateLastLogin, getUserLocation, getUserSelectedAddress, setUserSelectedAddress } from './auth.js';
import { getUserPermissions, canUserAction, getUserAccessiblePages, isAdmin } from './permissions.js';
import { initAdminPanel } from './admin.js';
import { COMPANY_LOCATIONS, getLocationById, getLocationOptions, formatLocationAddress } from './locations.js';
import { ref, set, get, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// ===== UTILITY FUNCTIONS =====
/**
 * Extract image URL from HTML or plain URL
 * Handles both plain URLs and HTML img tags (e.g., from imgbb HTML full linked format)
 */
function extractImageUrl(input) {
    if (!input) return '';
    
    // If it's already a plain URL (starts with http)
    if (input.trim().startsWith('http')) {
        return input.trim();
    }
    
    // Try to extract from HTML img tag
    const imgMatch = input.match(/src=["']([^"']+)["']/);
    if (imgMatch && imgMatch[1]) {
        return imgMatch[1].trim();
    }
    
    // Try to extract from href in anchor tag
    const hrefMatch = input.match(/href=["']([^"']+)["']/);
    if (hrefMatch && hrefMatch[1]) {
        return hrefMatch[1].trim();
    }
    
    // Return as-is if no extraction worked
    return input.trim();
}

// ===== FCM PUSH NOTIFICATION INITIALIZATION =====
/**
 * Initialize Firebase Cloud Messaging for push notifications
 * Gets FCM token and saves it to Firebase so Cloud Functions can send messages
 * 
 * Note: FCM requires service worker which doesn't work reliably on GitHub Pages subdirectories.
 * In-app notifications work perfectly - notifications show immediately when tab is open.
 * When tab is closed, notifications are stored in Firebase and show on next app open.
 */
async function initializeFCM(user) {
    try {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.log('ℹ️ Browser does not support notifications');
            return;
        }

        // Request notification permission if not already granted
        if (Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('📢 Notification permission:', permission);
            } catch (error) {
                console.warn('⚠️ Could not request notification permission:', error.message);
            }
        }

        // Attempt FCM initialization (optional, for closed-tab notifications)
        // This is best-effort and not required for core functionality
        if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
            try {
                // Try to get service worker registrations
                const registrations = await navigator.serviceWorker.getRegistrations();
                if (registrations.length > 0) {
                    console.log('✅ Service Worker found, attempting FCM...');
                    
                    const { getToken } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js");
                    
                    try {
                        const token = await Promise.race([
                            getToken(messaging, {
                                vapidKey: 'BMhCCqFRZq0AQZDNe95Sf-yxTJg4HjAfTXGQJpXpPlVnLJ-sLZAULZaJYLeRBr3-9-RzYqCWaGFkqPkXQj9CcEk'
                            }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                        ]);

                        if (token) {
                            console.log('🔑 FCM Token received');
                            
                            await set(ref(db, `AdminTokens/${user.uid}`), {
                                fcmToken: token,
                                email: user.email,
                                savedAt: new Date().toISOString(),
                                deviceInfo: navigator.userAgent
                            });
                            
                            console.log('✅ Push notifications enabled (closed-tab alerts)');
                        }
                    } catch (error) {
                        console.log('ℹ️ FCM unavailable:', error.message);
                        console.log('💡 In-app notifications will work when tab is open');
                    }
                } else {
                    console.log('ℹ️ Service Worker not registered - in-app notifications only');
                }
            } catch (error) {
                console.log('ℹ️ Service Worker registration check failed - in-app notifications only');
            }
        } else {
            console.log('ℹ️ Notification permission not granted - notifications disabled');
        }
    } catch (error) {
        console.error('⚠️ Error in initializeFCM:', error.message);
        console.log('ℹ️ App will use in-app notifications (tab must be open)');
    }
}

// ===== UTILITY FUNCTIONS =====
/**
 * Extract image URL from HTML or plain URL
 * Handles both plain URLs and HTML img tags (e.g., from imgbb HTML full linked format)
 */

// ===== GLOBAL STATE =====
let currentUser = null;
let userPermissions = null;
let cartHasChanged = false; // Track if cart has items for beforeunload

// ===== UNIFIED CATALOG DATABASE =====
// Single source of truth for all catalog data: names, images, and stock
let CatalogDB = {}; // { catalogKey: { key, name, image, stock, entries: [...] }, ... }

// Default catalog names (used only for initial seeding)
const DEFAULT_CATALOG_NAMES = [                      
    "JL-1027", "JL-0127", "JC-20001-5", "JC-5021-7", "JS-10003", "JS-100-2E", "JS-100-2F", 
    "Dairy", "手帳", "JS 10001-3A", "JC-5020-8", "JA-30002", "JC-1026", "JA-30003", "JC-10010-9a",
    "JL-5026-1A", "JL-5028", "JC-5030-2", "Automatic Shavings Compactor", "JL-5039", "JL-5028-1", 
    "JC-5020-8A", "JC-5022-4B",
    "JS-10001-3", "ES-100-2", "JC-10003-6", "JC-0815", "JC-0612-3", "JL-0615", "JC-1905-1", 
    "JC-1320-4", "EC-10004-5", "JC-1012-2B", "EC-0612-1"
];

const CATALOG_NAME_ENRICHMENTS = {
    "JL-1027": "HE-YA パック",
    "JL-0127": "双方向回転圧力補償ピストンポンプ",
    "JC-20001-5": "グローバルネットワーク 製造・販売・サービス",
    "JC-5021-7": "自動切屑圧縮機「キリコ」",
    "JS-10003": "油圧回路記号 JIS B 0125-1984 と YUKEN 油圧機器",
    "JS-100-2E": "Basic Hydraulics and Components",
    "JS 10001-3A": "双方向回転圧力補償ピストンポンプ",
    "JC-5020-8": "油圧の環境関連機器",
    "JA-30002": "YUKEN KOGYO CO., LTD CORPORATE PROFILE",
    "JC-1026": "標準油圧ユニット",
    "JA-30003": "YUKEN KOGYO CO., LTD CORPORATE PROFILE",
    "JC-10010-9a": "Products Guide",
    "JL-5026-1A": "マルチコンパクタ",
    "JL-5028": "ドラム缶コンパクタ",
    "JC-5030-2": "自動マルチコンパクタ",
    "JL-5039": "自動マルチコンパクタ ASR シリーズ AC サーボモータ駆動ポンプ搭載",
    "JL-5028-1": "ドラム缶コンパクタ YB-25D F形",
    "JC-5020-8A": "油圧の環境関連機器",
    "JC-5022-4B": "自動 PET ボトル減容機 YB シリーズ",
    "JS-10001-3": "油圧機器／油圧作動原理図例集",
    "ES-100-2": "Basic Hydraulics and Components",
    "JC-10003-6": "工作機械用油圧機器",
    "JC-0612-3": "高速リニアサーボ弁",
    "JL-0615": "ダブルモータ直動形リニアサーボ弁",
    "JC-1905-1": "ASR シリーズ AC サーボモータ駆動ポンプ",
    "JC-1320-4": "比例電磁式制御機器",
    "EC-10004-5": "Hydraulic Equipment",
    "JC-1012-2B": "標準油圧ユニット",
    "EC-0612-1": "High-Speed linear Servo Valves"
};

function getEnrichedCatalogName(rawName) {
    const name = String(rawName || '').trim();
    if (!name) return '';

    const description = CATALOG_NAME_ENRICHMENTS[name];
    if (!description) return name;

    // Keep existing enriched names untouched
    if (name.includes(' - ') || name.includes('｜') || name.includes('|')) {
        return name;
    }

    return `${name} - ${description}`;
}

async function enrichCatalogNamesAcrossApp() {
    try {
        const namesSnapshot = await get(ref(db, 'CatalogNames'));
        if (!namesSnapshot.exists()) return;

        const namesData = namesSnapshot.val() || {};
        const rootUpdates = {};
        const renamePairs = [];

        Object.entries(namesData).forEach(([key, currentName]) => {
            const oldName = String(currentName || '').trim();
            const enrichedName = getEnrichedCatalogName(oldName);

            if (enrichedName && enrichedName !== oldName) {
                rootUpdates[`CatalogNames/${key}`] = enrichedName;
                renamePairs.push({ oldName, enrichedName });
            }
        });

        if (renamePairs.length === 0) {
            return;
        }

        const [catalogsSnapshot, ordersSnapshot] = await Promise.all([
            get(ref(db, 'Catalogs')),
            get(ref(db, 'Orders'))
        ]);

        if (catalogsSnapshot.exists()) {
            const catalogs = catalogsSnapshot.val() || {};
            Object.entries(catalogs).forEach(([entryKey, entry]) => {
                if (!entry || !entry.CatalogName) return;

                const match = renamePairs.find(pair => pair.oldName === String(entry.CatalogName).trim());
                if (match) {
                    rootUpdates[`Catalogs/${entryKey}/CatalogName`] = match.enrichedName;
                }
            });
        }

        if (ordersSnapshot.exists()) {
            const orders = ordersSnapshot.val() || {};
            Object.entries(orders).forEach(([orderKey, order]) => {
                if (!order || !order.CatalogName) return;

                const match = renamePairs.find(pair => pair.oldName === String(order.CatalogName).trim());
                if (match) {
                    rootUpdates[`Orders/${orderKey}/CatalogName`] = match.enrichedName;
                }
            });
        }

        await update(ref(db), rootUpdates);
        console.log(`[CATALOG ENRICH] Updated ${renamePairs.length} catalog names across app`);
    } catch (error) {
        console.warn('[CATALOG ENRICH] Error enriching catalog names:', error);
    }
}

// Get sorted list of catalog names from unified DB
function getCatalogNames() {
    return Object.values(CatalogDB)
        .map(cat => cat.name)
        .filter(name => name && name.trim().length > 0)
        .sort();
}

// ===== LOAD AND SYNC CATALOG DATA FROM FIREBASE =====
async function loadCatalogNamesFromFirebase() {
    try {
        const snapshot = await get(ref(db, 'CatalogNames'));
        const existing = snapshot.exists() ? snapshot.val() : null;

        if (!existing || Object.keys(existing).length === 0) {
            // Seed defaults only when CatalogNames is empty
            const defaultsObj = {};
            DEFAULT_CATALOG_NAMES.forEach((name, idx) => {
                defaultsObj[`default_${idx}`] = name;
            });
            await set(ref(db, 'CatalogNames'), defaultsObj);
            console.log(`[CATALOG SYNC] Seeded firebase with ${DEFAULT_CATALOG_NAMES.length} default catalogs`);
            // Build CatalogDB from defaults
            DEFAULT_CATALOG_NAMES.forEach((name, idx) => {
                const key = `default_${idx}`;
                CatalogDB[key] = { key, name, image: '', stock: 0, entries: [] };
            });
        } else {
            // Build CatalogDB from existing CatalogNames
            console.log('[CATALOG SYNC] Loading catalog names from Firebase');
            Object.entries(existing).forEach(([key, name]) => {
                if (!CatalogDB[key]) {
                    CatalogDB[key] = { key, name, image: '', stock: 0, entries: [] };
                } else {
                    CatalogDB[key].name = name;
                }
            });
        }

        initializeCatalogSelects();
    } catch (error) {
        console.warn('[CATALOG SYNC] Error loading catalog names:', error);
        initializeCatalogSelects();
    }
}

// ===== INITIALIZE CATALOG SELECTS =====
function initializeCatalogSelects() {
    const selects = document.querySelectorAll('#CatalogName, #OrderCatalogName');
    const names = getCatalogNames();
    
    selects.forEach(select => {
        select.innerHTML = '<option value="">--選択してください--</option>';
        names.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    });
}

// ===== TAB SWITCHING =====
function initTabSwitching() {
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-section').forEach(tab => tab.style.display = 'none');
            const tabName = this.getAttribute('data-tab');
            const tab = document.getElementById('tab-' + tabName);
            if (tab) tab.style.display = 'block';
            
            // Lazy-load expensive components
            if (tabName === 'stockCalendar' && !window.calendarInitialized) {
                initializeCalendar();
                window.calendarInitialized = true;
            }
            if (tabName === 'catalogEntries') {
                renderCatalogTablesAccordion();
                setTimeout(() => initCatalogSearch(), 100);
            }
            if (tabName === 'orderEntries') {
                setupOrderViewToggle();
                renderOrderTablesAccordion();
            }
            if (tabName === 'placeOrder') {
                loadPlaceOrderProducts();
            }
            if (tabName === 'analytics') {
                document.getElementById('analyticsDateRangeCard').style.display = 'block';
                fetchAndRenderAnalytics();
            } else {
                const dateCard = document.getElementById('analyticsDateRangeCard');
                if (dateCard) dateCard.style.display = 'none';
            }
        });
    });
    
    // Default display handled by filterTabsByPermissions instead of hardcoding here
    const topNavBtns = document.querySelectorAll('.nav-link-btn');
        topNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                
                // Hide all tabs
                document.querySelectorAll('.tab-section').forEach(t => t.style.display = 'none');
                
                // Show selected tab
                const tabElement = document.getElementById('tab-' + tab);
                if (tabElement) tabElement.style.display = 'block';
                
                // Update active states
                topNavBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.sidebar-nav-btn').forEach(b => {
                    if (b.getAttribute('data-tab') === tab) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
                
                // Lazy-load expensive components
                if (tab === 'stockCalendar' && !window.calendarInitialized) {
                    initializeCalendar();
                    window.calendarInitialized = true;
                }
                if (tab === 'catalogEntries') {
                    renderCatalogTablesAccordion();
                    setTimeout(() => initCatalogSearch(), 100);
                }
                if (tab === 'orderEntries') {
                    setupOrderViewToggle();
                    renderOrderTablesAccordion();
                }
                if (tab === 'analytics') {
                    document.getElementById('analyticsDateRangeCard').style.display = 'block';
                    fetchAndRenderAnalytics();
                } else {
                    const dateCard = document.getElementById('analyticsDateRangeCard');
                    if (dateCard) dateCard.style.display = 'none';
                }
            });
        });
    document.getElementById('analyticsDateRangeCard').style.display = 'none';
}

// ===== CATALOG FORM =====
function initCatalogForm() {
    document.getElementById('Insbtn').addEventListener('click', async function() {
        const form = document.getElementById('catalogEntryForm');
        const data = {
            CatalogName: form.CatalogName.value,
            ReceiptDate: form.ReceiptDate.value,
            QuantityReceived: Number(form.QuantityReceived.value),
            Remarks: form.Remarks.value,
            // Keep compatibility fields for downstream calculations and renderers.
            IssueQuantity: 0,
            StockQuantity: Number(form.QuantityReceived.value),
            Discontinued: false,
        };
        
        if (!data.CatalogName || !data.ReceiptDate || !data.QuantityReceived) {
            alert('必須項目を入力してください');
            return;
        }
        
        try {
            const newId = data.CatalogName + "_" + Date.now();
            await set(ref(db, "Catalogs/" + newId), data);
            await logAuditEvent('ADD_CATALOG', `Added: ${data.CatalogName} (Qty: ${data.QuantityReceived})`, currentUser?.email);
            await logMovement(data.CatalogName, 0, data.QuantityReceived, 'INITIAL_RECEIPT');
            alert("カタログエントリを登録しました");
            form.reset();
            renderCatalogTablesAccordion();
            setTimeout(() => initCatalogSearch(), 100);
            updateKPIs();
        } catch (error) {
            alert("エラー: " + error);
        }
    });
}

// ===== SOUND & HAPTIC FEEDBACK FUNCTIONS =====
function playSound(type = 'click') {
    // Create sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    
    if (type === 'click') {
        // Short beep sound
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = 800;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'success') {
        // Success sound - rising pitch
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'error') {
        // Error sound - descending pitch
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

function triggerHaptic(pattern = 'light') {
    // Vibration API support check
    if (!navigator.vibrate && !navigator.webkitVibrate) return;
    
    const vibrate = navigator.vibrate || navigator.webkitVibrate;
    
    if (pattern === 'light') {
        vibrate.call(navigator, 20);
    } else if (pattern === 'medium') {
        vibrate.call(navigator, [30, 30, 30]);
    } else if (pattern === 'success') {
        vibrate.call(navigator, [50, 100, 50, 100, 50]);
    }
}

function createSuccessAnimation(button) {
    // Add scale animation
    button.classList.add('order-submit-btn-anim');
    
    // Create burst particles (emojis)
    const emojis = ['🎉', '✨', '🎊', '⭐', '🚀'];
    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.className = 'success-burst-particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * (window.innerHeight / 2);
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.animation = 'success-burst 0.8s ease-out forwards';
        particle.style.animationDelay = (i * 0.05) + 's';
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
    
    // Remove animation class
    setTimeout(() => button.classList.remove('order-submit-btn-anim'), 400);
}

// ===== PLACE ORDER - PRODUCT GRID (AMAZON-STYLE) =====
// All catalog data now stored in unified CatalogDB
let currentOrderItemKey = null; // Track current item being ordered
let userAssignedLocationId = null; // User's assigned location from their account
let selectedAddressType = 'location'; // 'location' or 'custom'
let selectedAddressValue = null; // Location ID or custom address string


// ===== SHOPPING CART STATE =====
let shoppingCart = []; // Array of cart items

/**
 * Add item to shopping cart
 */
function addToCart(catalogName, quantity, department, requester, address, message, itemKey) {
    // Check if item already in cart with same requester and department
    const existingIndex = shoppingCart.findIndex(item => 
        item.catalogName === catalogName && 
        item.requester === requester &&
        item.department === department
    );
    
    const isFirstItem = shoppingCart.length === 0;
    
    if (existingIndex >= 0) {
        // Update quantity if same item, requester and department
        shoppingCart[existingIndex].quantity += parseInt(quantity);
    } else {
        // Add new item to cart
        shoppingCart.push({
            catalogName,
            quantity: parseInt(quantity),
            department: department || '未指定',
            requester: requester || '未指定',
            address: address || '',
            message: message || '',
            itemKey,
            addressType: selectedAddressType,
            addressValue: selectedAddressValue,
            addedAt: new Date().toISOString()
        });
    }
    
    // Mark that cart has changed
    cartHasChanged = true;
    
    updateCartUI();
    playSound('success');
    triggerHaptic('light');
    
    // Show toast notification
    showAddToCartToast(catalogName, quantity);
    
    // Auto-open cart sidebar on first item
    if (isFirstItem) {
        setTimeout(() => {
            const cartLink = document.querySelector('[data-tab="placeOrder"]');
            if (cartLink) {
                cartLink.click();
            }
            // Show helpful message
            showCheckoutPrompt();
        }, 300);
    }
}

/**
 * Remove item from cart by index
 */
function removeFromCart(index) {
    if (index >= 0 && index < shoppingCart.length) {
        shoppingCart.splice(index, 1);
        updateCartUI();
        playSound('click');
    }
}

/**
 * Update cart item quantity
 */
function updateCartQty(index, newQty) {
    newQty = parseInt(newQty);
    if (newQty > 0 && index >= 0 && index < shoppingCart.length) {
        shoppingCart[index].quantity = newQty;
        updateCartUI();
    }
}

/**
 * Clear entire shopping cart
 */
function clearCart() {
    if (shoppingCart.length === 0) {
        alert('カートは空です');
        return;
    }
    
    if (confirm('本当にカートをクリアしますか？')) {
        shoppingCart = [];
        updateCartUI();
        playSound('click');
    }
}

/**
 * Update cart UI display
 */
function updateCartUI() {
    const cartBadge = document.getElementById('cartBadge');
    const cartList = document.getElementById('cartItemsList');
    const totalItems = document.getElementById('cartTotalItems');
    const totalQty = document.getElementById('cartTotalQty');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    
    // Update badge
    cartBadge.textContent = shoppingCart.length;
    
    // Update totals
    totalItems.textContent = shoppingCart.length;
    const totalQtyValue = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
    totalQty.textContent = totalQtyValue;
    
    // Update cart items display
    if (shoppingCart.length === 0) {
        cartList.innerHTML = '<p style="text-align:center; color:#999; padding:20px; margin:0;">カートは空です</p>';
        checkoutBtn.disabled = true;
        checkoutBtn.classList.remove('cart-pulse'); // Remove pulse animation
    } else {
        cartList.innerHTML = shoppingCart.map((item, index) => `
            <div style="background:#fff; padding:10px; margin-bottom:8px; border-radius:6px; border-left:3px solid #2563eb; font-size:0.85rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.9rem;">
                            ${item.catalogName}
                        </div>
                        <div style="color:#666; font-size:0.8rem; margin-top:2px;">
                            部署: ${item.department} | 発注: ${item.requester}
                            ${item.address ? `| 住所: ${item.address}` : ''}
                        </div>
                    </div>
                    <button style="background:none; border:none; color:#dc2626; cursor:pointer; font-weight:600; font-size:14px; padding:0; width:20px; height:20px; display:flex; align-items:center; justify-content:center; flex-shrink:0;" onclick="removeFromCart(${index})" title="削除">×</button>
                </div>
                <div style="display:flex; align-items:center; gap:4px; margin-bottom:4px;">
                    <button type="button" class="btn btn-sm btn-outline-secondary" style="padding:2px 4px; font-size:11px;" onclick="updateCartQty(${index}, ${Math.max(1, item.quantity - 1)})">−</button>
                    <input type="number" value="${item.quantity}" style="width:40px; text-align:center; padding:3px; border:1px solid #ddd; border-radius:4px; font-size:0.8rem;" onchange="updateCartQty(${index}, parseInt(this.value) || 1)" min="1">
                    <button type="button" class="btn btn-sm btn-outline-secondary" style="padding:2px 4px; font-size:11px;" onclick="updateCartQty(${index}, ${item.quantity + 1})">+</button>
                    <span style="font-weight:600; color:#2563eb; flex:1; text-align:right; font-size:0.9rem;">${item.quantity}個</span>
                </div>
                ${item.message ? `<div style="font-size:0.75rem; color:#666; margin-top:4px; padding-top:4px; border-top:1px solid #eee;">📝 ${item.message.substring(0, 30)}${item.message.length > 30 ? '...' : ''}</div>` : ''}
            </div>
        `).join('');
        checkoutBtn.disabled = false;
        checkoutBtn.classList.add('cart-pulse'); // Add pulse animation to draw attention
    }
}

/**
 * Checkout - submit all cart items as orders
 */
async function checkoutCart() {
    if (shoppingCart.length === 0) {
        alert('カートは空です');
        return;
    }
    
    try {
        const checkoutBtn = document.getElementById('cartCheckoutBtn');
        const originalText = checkoutBtn.innerHTML;
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 処理中...';
        
        // Get current user
        const user = getCurrentUser();
        
        // Submit all orders
        const orderIds = [];
        const now = new Date();
        for (const item of shoppingCart) {
            const orderId = item.catalogName + "_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
            const orderData = {
                CatalogName: item.catalogName,
                OrderQuantity: item.quantity,
                RequesterDepartment: item.department,
                Requester: item.requester,
                RequesterAddress: item.address,
                Message: item.message,
                AddressType: item.addressType,
                AddressValue: item.addressValue,
                OrderDate: now.toISOString().split('T')[0],
                CreatedAt: now.toISOString(),
                UserEmail: user?.email || 'unknown',  // Track which user placed order
                Status: '注文受付',  // Initial status: pending
                StatusHistory: [{
                    status: '注文受付',
                    timestamp: now.toISOString(),
                    changedBy: user?.email || 'system'
                }],
                Fulfilled: false
            };
            
            await set(ref(db, "Orders/" + orderId), orderData);
            orderIds.push(orderId);
        }
        
        // Log audit
        await logAuditEvent(
            'CHECKOUT_ORDERS',
            `Batch checkout: ${shoppingCart.length} orders, ${shoppingCart.reduce((s, i) => s + i.quantity, 0)} items`,
            currentUser?.email
        );
        
        // Success feedback
        createSuccessAnimation(checkoutBtn);
        playSound('success');
        triggerHaptic('success');
        
        // ✓ NEW: Build detailed order information for notification
        const ordersDetails = shoppingCart.map((item, idx) => ({
            catalogName: item.catalogName,
            quantity: item.quantity,
            department: item.department,
            requester: item.requester,
            address: item.address,
            message: item.message,
            addressType: item.addressType,
            addressValue: item.addressValue
        }));
        
        addNotification({
            type: 'order',
            priority: 'info',
            title: '📦 一括注文が完了しました',
            message: `${shoppingCart.length}件の注文が登録されました`,
            details: {
                items: shoppingCart.length,
                date: new Date().toLocaleDateString('ja-JP'),
                requester: currentUser?.email || 'Unknown',
                orderIds: orderIds,  // ✓ NEW: Pass order IDs for linking
                orders: ordersDetails  // ✓ NEW: Pass all order details
            }
        });
        
        // Show celebration animation
        showOrderConfirmationCelebration(shoppingCart.length);
        
        alert(`✅ ${shoppingCart.length}件の注文を一括登録しました！`);
        
        // Clear cart and reset tracking
        const itemsCount = shoppingCart.length;
        shoppingCart = [];
        cartHasChanged = false;
        updateCartUI();
        
        // Refresh orders in background (but stay on current page for access control)
        // Some users may only have access to placeOrder page
        await new Promise(resolve => setTimeout(resolve, 500));
        if (window.renderOrderTablesAccordion) window.renderOrderTablesAccordion();
        
        // DO NOT auto-switch tabs - stay on placeOrder page
        // Customers may only have access to this page depending on their role
        
        // Restore button
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = originalText;
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('エラー: ' + error.message);
        const checkoutBtn = document.getElementById('cartCheckoutBtn');
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = '<i class="fa-solid fa-check"></i> 一括注文';
    }
}

/**
 * ✓ NEW: Navigate to 台帳 page and highlight specific order rows
 * @param {Array<string>} orderIds - Order IDs to highlight
 */
function navigateToTaichouAndHighlightOrders(orderIds) {
    if (!orderIds || orderIds.length === 0) {
        console.warn('No order IDs provided');
        return;
    }
    
    // Store order IDs to highlight when page loads
    window.highlightOrderIds = orderIds;
    
    // Click the catalogEntries tab to navigate
    const tabBtn = document.querySelector('[data-tab="catalogEntries"]');
    if (tabBtn) {
        tabBtn.click();
        
        // After tab switches, scroll and highlight orders
        setTimeout(() => {
            highlightOrderRows(orderIds);
        }, 300);
    } else {
        console.warn('catalogEntries tab not found');
    }
}

/**
 * ✓ NEW: Highlight order rows in the unified 台帳 table
 * @param {Array<string>} orderIds - Order IDs to highlight
 */
function highlightOrderRows(orderIds) {
    if (!orderIds || orderIds.length === 0) return;
    
    // Find all table rows with order-type data
    const rows = document.querySelectorAll('table tbody tr[data-type="order"]');
    
    let highlightedCount = 0;
    rows.forEach(row => {
        const rowKey = row.getAttribute('data-key');
        
        // Check if this row's key is in our orderIds list
        if (orderIds.includes(rowKey)) {
            // Add highlight animation
            row.style.background = 'linear-gradient(90deg, #fef3c7 0%, #fef08a 100%)';
            row.style.boxShadow = '0 0 8px rgba(251, 191, 36, 0.4)';
            row.style.animation = 'pulse 2s infinite';
            
            // Scroll to first highlighted row
            if (highlightedCount === 0) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            highlightedCount++;
            
            // Remove highlight after 5 seconds
            setTimeout(() => {
                row.style.animation = 'none';
                row.style.background = '#eff6ff';
                row.style.boxShadow = 'none';
            }, 5000);
        }
    });
    
    console.log(`✅ Highlighted ${highlightedCount} order row(s)`);
}

/**
 * ✓ NEW: Add pulse animation to CSS if not already present
 */
function ensureHighlightAnimation() {
    let styleEl = document.getElementById('highlight-animation-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'highlight-animation-style';
        styleEl.innerHTML = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(styleEl);
    }
}

// Call on load
ensureHighlightAnimation();


async function loadPlaceOrderProducts() {
    try {
        // Load user's location (if they have one assigned to their account)
        const currentUser = getCurrentUser();
        if (currentUser) {
            userAssignedLocationId = await getUserLocation(currentUser.uid);
            const userAddress = await getUserSelectedAddress(currentUser.uid);
            selectedAddressType = userAddress.type;
            selectedAddressValue = userAddress.value;
        }
        
        console.log('[CATALOG LOAD] Starting catalog data load...');
        
        // Load and build unified catalog database
        const namesSnapshot = await get(ref(db, 'CatalogNames'));
        const imagesSnapshot = await get(ref(db, 'CatalogImages'));
        const catalogsSnapshot = await get(ref(db, 'Catalogs'));
        const ordersSnapshot = await get(ref(db, 'Orders'));
        
        // Initialize CatalogDB from CatalogNames
        if (namesSnapshot.exists()) {
            Object.entries(namesSnapshot.val()).forEach(([key, name]) => {
                if (!CatalogDB[key]) {
                    CatalogDB[key] = { key, name, image: '', stock: 0, entries: [] };
                }
                CatalogDB[key].name = name;
            });
            console.log('[CATALOG LOAD] Loaded', Object.keys(namesSnapshot.val()).length, 'catalog names');
        }
        
        // Add images to CatalogDB
        if (imagesSnapshot.exists()) {
            Object.entries(imagesSnapshot.val()).forEach(([key, image]) => {
                if (CatalogDB[key]) {
                    CatalogDB[key].image = image;
                }
            });
            console.log('[CATALOG LOAD] Loaded', Object.keys(imagesSnapshot.val()).length, 'catalog images');
        }
        
        // Add entries and calculate stock for CatalogDB
        if (catalogsSnapshot.exists()) {
            const catalogData = catalogsSnapshot.val();
            const stockByName = {};
            
            // Group entries by catalog name and calculate stock
            Object.entries(catalogData).forEach(([entryKey, entry]) => {
                if (!entry || !entry.CatalogName) return;
                const name = entry.CatalogName;
                
                // Store entry in CatalogDB by key (if key exists in CatalogDB)
                Object.entries(CatalogDB).forEach(([catKey, catData]) => {
                    if (catData.name === name) {
                        if (!catData.entries) catData.entries = [];
                        catData.entries.push({ ...entry, _key: entryKey });
                    }
                });
                
                // Track stock per name (ledger-compatible: received only here)
                if (!stockByName[name]) stockByName[name] = { received: 0, issued: 0 };
                stockByName[name].received += Number(entry.QuantityReceived || 0);
                stockByName[name].issued += Number(entry.IssueQuantity || 0);
            });
            
            // Update stock in CatalogDB (will subtract orders below)
            Object.entries(CatalogDB).forEach(([key, catData]) => {
                if (stockByName[catData.name]) {
                    // Ledger uses inventory receipts and orders, not IssueQuantity.
                    catData.stock = stockByName[catData.name].received;
                    catData._stockBase = catData.stock; // store base before order subtraction
                }
            });
            
            console.log('[CATALOG LOAD] Loaded', Object.keys(catalogData).length, 'catalog entries');
        }
        
        // Load Orders and subtract OrderQuantity from stock to match ledger 在庫残数
        if (ordersSnapshot.exists()) {
            window.Orders = ordersSnapshot.val() || {};
            console.log('[CATALOG LOAD] Loaded', Object.keys(window.Orders).length, 'orders for popularity');
            
            // Subtract order quantities from stock
            const orderedByName = {};
            Object.entries(window.Orders).forEach(([orderId, order]) => {
                if (!order || !order.CatalogName) return;
                orderedByName[order.CatalogName] = (orderedByName[order.CatalogName] || 0) + Number(order.OrderQuantity || 0);
            });
            Object.entries(CatalogDB).forEach(([key, catData]) => {
                catData.stock = (catData.stock || 0) - (orderedByName[catData.name] || 0);
            });
        } else {
            window.Orders = {};
        }
        
        renderPlaceOrderProductGrid();
        setupCatalogRealTimeListener();
    } catch (error) {
        console.error('[CATALOG LOAD] Error loading catalog items:', error);
    }
}

// ===== CATALOG MANAGEMENT CRUD =====
/**
 * Setup real-time listener for catalog changes in Firebase
 * Updates the unified CatalogDB whenever any catalog data changes
 */
function setupCatalogRealTimeListener() {
    console.log('[SYNC SETUP] Initializing real-time catalog listeners');
    
    const catalogNamesRef = ref(db, 'CatalogNames');
    const catalogImagesRef = ref(db, 'CatalogImages');
    const catalogsRef = ref(db, 'Catalogs');

    // Listen for catalog name changes
    onValue(catalogNamesRef, (snapshot) => {
        console.log('[SYNC LISTENER] Catalog names changed');
        if (snapshot.exists()) {
            const names = snapshot.val();
            Object.entries(names).forEach(([key, name]) => {
                if (!CatalogDB[key]) {
                    CatalogDB[key] = { key, name, image: '', stock: 0, entries: [] };
                }
                CatalogDB[key].name = name;
            });
        }
        
        initializeCatalogSelects();
        syncAllPages();
    }, (error) => {
        console.warn('[SYNC LISTENER] Error on catalog names:', error);
    });

    // Listen for catalog image changes
    onValue(catalogImagesRef, (snapshot) => {
        console.log('[SYNC LISTENER] Catalog images changed');
        if (snapshot.exists()) {
            const images = snapshot.val();
            Object.entries(images).forEach(([key, image]) => {
                if (CatalogDB[key]) {
                    CatalogDB[key].image = image;
                }
            });
        }
        
        renderPlaceOrderProductGrid();
    }, (error) => {
        console.warn('[SYNC LISTENER] Error on catalog images:', error);
    });

    // Listen for catalog entry and stock changes
    onValue(catalogsRef, (snapshot) => {
        console.log('[SYNC LISTENER] Catalog entries changed');
        
        if (snapshot.exists()) {
            const catalogData = snapshot.val();
            const stockByName = {};
            const discontinuedByName = {}; // ✓ NEW: Track discontinued status
            
            // Reset entries in CatalogDB
            Object.values(CatalogDB).forEach(cat => cat.entries = []);
            
            // Group entries and calculate stock
            Object.entries(catalogData).forEach(([entryKey, entry]) => {
                if (!entry || !entry.CatalogName) return;
                
                const name = entry.CatalogName;
                
                // Find matching catalog by name and add entry
                Object.entries(CatalogDB).forEach(([catKey, catData]) => {
                    if (catData.name === name) {
                        catData.entries.push({ ...entry, _key: entryKey });
                    }
                });
                
                // Calculate stock base (ledger-compatible: receipts only)
                if (!stockByName[name]) stockByName[name] = { received: 0, issued: 0 };
                stockByName[name].received += Number(entry.QuantityReceived || 0);
                stockByName[name].issued += Number(entry.IssueQuantity || 0);
                
                // ✓ NEW: Track discontinued flag (if ANY entry is discontinued, mark it)
                if (entry.Discontinued === true) {
                    discontinuedByName[name] = true;
                }
            });
            
            // Update stock and discontinued in CatalogDB (base: received only)
            Object.entries(CatalogDB).forEach(([key, catData]) => {
                if (stockByName[catData.name]) {
                    catData._stockBase = stockByName[catData.name].received;
                } else {
                    catData._stockBase = 0;
                }
                // ✓ NEW: Set discontinued flag
                catData.discontinued = discontinuedByName[catData.name] || false;
            });
        } else {
            // No catalog entries - reset all stocks
            Object.values(CatalogDB).forEach(cat => {
                cat._stockBase = 0;
                cat.stock = 0;
                cat.entries = [];
                cat.discontinued = false; // ✓ NEW: Reset discontinued flag
            });
        }
        
        // Apply current order quantities to get final stock matching ledger 在庫残数
        _applyOrderStockToAllCatalogs();
        syncAllPages();
    }, (error) => {
        console.warn('[SYNC LISTENER] Error on catalog entries:', error);
    });

    // Listen for Orders changes to keep stock in sync with ledger
    const ordersRef = ref(db, 'Orders');
    onValue(ordersRef, (snapshot) => {
        console.log('[SYNC LISTENER] Orders changed - updating stock to match ledger');
        window.Orders = snapshot.exists() ? snapshot.val() : {};
        _applyOrderStockToAllCatalogs();
        syncAllPages();
    }, (error) => {
        console.warn('[SYNC LISTENER] Error on orders:', error);
    });
}

// Helper: subtract all OrderQuantity totals from base stock so order page matches ledger 在庫残数
function _applyOrderStockToAllCatalogs() {
    const orderedByName = {};
    if (window.Orders) {
        Object.entries(window.Orders).forEach(([orderId, order]) => {
            if (!order || !order.CatalogName) return;
            orderedByName[order.CatalogName] = (orderedByName[order.CatalogName] || 0) + Number(order.OrderQuantity || 0);
        });
    }
    Object.entries(CatalogDB).forEach(([key, catData]) => {
        const base = catData._stockBase !== undefined ? catData._stockBase : (catData.stock || 0);
        catData.stock = base - (orderedByName[catData.name] || 0);
    });
}

/**
 * Sync all pages when any catalog data changes
 */
function syncAllPages() {
    console.log('[SYNC ALL] Syncing Place Order, Catalog Entries, and Order Entries pages');
    renderPlaceOrderProductGrid();
    if (window.renderCatalogTablesAccordion) {
        window.renderCatalogTablesAccordion();
    }
    if (window.renderOrderTablesAccordion) {
        window.renderOrderTablesAccordion();
    }
}

/**
 * Set up location selection UI on the Place Order page
 */
function setupLocationSelectionUI() {
    const locationSelect = document.getElementById('locationSelect');
    if (!locationSelect) return;
    
    // Populate location dropdown with options
    const options = getLocationOptions();
    locationSelect.innerHTML = '<option value="">事業所を選択...</option>';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.id;
        option.textContent = opt.label;
        if (selectedAddressValue === opt.id) {
            option.selected = true;
        }
        locationSelect.appendChild(option);
    });
    
    // Set address type radio buttons
    const locationRadio = document.getElementById('addressTypeLocation');
    const customRadio = document.getElementById('addressTypeCustom');
    if (selectedAddressType === 'custom') {
        customRadio.checked = true;
    } else {
        locationRadio.checked = true;
    }
    
    // Set custom address value if applicable
    const customAddressInput = document.getElementById('customAddressInput');
    if (selectedAddressType === 'custom' && selectedAddressValue) {
        customAddressInput.value = selectedAddressValue;
    }
    
    // Update location details preview
    if (selectedAddressType === 'location' && selectedAddressValue) {
        updateLocationPreview(selectedAddressValue);
    }
    
    // Update UI based on address type
    updateAddressTypeUI();
}

/**
 * Format location details for display
 */
function formatLocationDetails(locationId) {
    const location = getLocationById(locationId);
    if (!location) return '情報がありません';
    
    return `${location.name}
${location.postalCode} ${location.address}
TEL: ${location.phone}
FAX: ${location.fax}`;
}

/**
 * Switch between location dropdown and custom address input
 */
window.switchAddressType = function(type) {
    selectedAddressType = type;
    updateAddressTypeUI();
    updateSelectedAddress();
};

/**
 * Update address type UI visibility
 */
/**
 * Update location preview with formatted details
 */
function updateLocationPreview(locationId) {
    const preview = document.getElementById('locationDetailsPreview');
    if (!preview) return;
    
    if (locationId) {
        const details = formatLocationDetails(locationId);
        preview.innerHTML = details.replace(/\n/g, '<br>');
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

function updateAddressTypeUI() {
    const locationDiv = document.getElementById('locationDropdownContainer');
    const customDiv = document.getElementById('customAddressContainer');
    
    if (selectedAddressType === 'location') {
        if (locationDiv) locationDiv.style.display = 'block';
        if (customDiv) customDiv.style.display = 'none';
    } else {
        if (locationDiv) locationDiv.style.display = 'none';
        if (customDiv) customDiv.style.display = 'block';
    }
}

/**
 * Update selected address (from dropdown or custom input)
 */
window.updateSelectedAddress = function() {
    if (selectedAddressType === 'location') {
        const select = document.getElementById('locationSelect');
        selectedAddressValue = select.value;
        
        // Update location preview
        updateLocationPreview(selectedAddressValue);
        
        // Update address field with formatted location address
        const addressField = document.getElementById('placeOrderModalAddress');
        if (addressField) {
            if (selectedAddressValue) {
                const location = getLocationById(selectedAddressValue);
                if (location) {
                    addressField.value = formatLocationAddress(location);
                }
            } else {
                addressField.value = '';
            }
        }
    } else {
        const textarea = document.getElementById('customAddressInput');
        selectedAddressValue = textarea.value;
        
        // Update address field with custom address
        const addressField = document.getElementById('placeOrderModalAddress');
        if (addressField) {
            addressField.value = selectedAddressValue || '';
        }
    }
    
    // Save to user profile
    const currentUser = getCurrentUser();
    if (currentUser && selectedAddressValue) {
        setUserSelectedAddress(currentUser.uid, selectedAddressType, selectedAddressValue);
    }
};

function renderPlaceOrderProductGrid() {
    const grid = document.getElementById('placeOrderProductGrid');
    const noResults = document.getElementById('placeOrderNoResults');
    const searchTerm = (document.getElementById('placeOrderSearchInput')?.value || '').toLowerCase();
    
    grid.innerHTML = '';
    let itemCount = 0;
    
    // Count orders for each catalog from the Orders data
    const orderCounts = {};
    Object.values(window.Orders || {}).forEach(order => {
        const catalogName = order.CatalogName;
        if (catalogName) {
            orderCounts[catalogName] = (orderCounts[catalogName] || 0) + 1;
        }
    });
    
    // Sort catalogs by popularity (order count descending), then alphabetically for zero-count items
    const sortedCatalogs = Object.entries(CatalogDB)
        .sort(([keyA, catalogA], [keyB, catalogB]) => {
            const nameA = catalogA.name || keyA;
            const nameB = catalogB.name || keyB;
            const countA = orderCounts[nameA] || 0;
            const countB = orderCounts[nameB] || 0;
            
            // Sort by order count descending
            if (countA !== countB) {
                return countB - countA;
            }
            
            // If same order count, sort alphabetically
            return nameA.localeCompare(nameB, 'ja');
        });
    
    // Render sorted catalogs
    sortedCatalogs.forEach(([key, catalogData]) => {
        if (!catalogData) return;
        
        const catalogName = catalogData.name || key;
        const imageUrl = extractImageUrl(catalogData.image || '');
        
        // Filter by search
        if (searchTerm && !catalogName.toLowerCase().includes(searchTerm)) {
            return;
        }
        
        itemCount++;
        const card = document.createElement('div');
        card.style.cssText = 'position:relative; cursor:pointer; border:1px solid #ddd; border-radius:8px; padding:12px; background:#fff; transition:all 0.3s ease; text-align:center;';
        card.onmouseover = () => { 
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; 
            const overlay = card.querySelector('.catalog-card-overlay');
            if (overlay) overlay.style.display = 'block';
        };
        card.onmouseout = () => { 
            card.style.boxShadow = 'none';
            const overlay = card.querySelector('.catalog-card-overlay');
            if (overlay) overlay.style.display = 'none';
        };
        
        const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjcwIiB5PSI3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5Ij5Ob0ltYWdlPC90ZXh0Pjwvc3ZnPg==';
        
        // Get stock directly from unified CatalogDB
        const currentStock = catalogData.stock || 0;
        const stockStatus = currentStock > 0 ? `在庫: ${currentStock}部` : '絶版';
        const stockColor = currentStock > 0 ? '#16a34a' : '#dc2626';
        
        // Get order count for display
        const orderCount = orderCounts[catalogName] || 0;
        const orderCountDisplay = orderCount > 0 ? `<p style="font-size:0.85rem; font-weight:700; color:#666; margin:4px 0 0 0;">注文数${orderCount}件</p>` : '';
        
        // Check if user is admin
        const userIsAdmin = userPermissions && userPermissions.role === 'admin';
        
        card.innerHTML = `
            <img src="${imageUrl || placeholderSvg}" style="width:100%; height:140px; object-fit:cover; border-radius:6px; background:#f0f0f0; margin-bottom:10px;" onerror="this.src='${placeholderSvg}'">
            <p style="font-size:0.9rem; font-weight:600; margin:8px 0 5px 0; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${catalogName}</p>
            <p style="font-size:1.1rem; font-weight:700; margin:0; color:${stockColor};">${stockStatus}</p>
            ${orderCountDisplay}
            ${userIsAdmin ? `
                <div class="catalog-card-overlay" style="display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); border-radius:8px; display:flex; gap:8px; align-items:center; justify-content:center; z-index:10;">
                    <button onclick="openEditCatalogModal('${key}', '${catalogName.replace(/'/g, "\\'")}'); event.stopPropagation();" style="padding:6px 12px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">編集</button>
                    <button onclick="deleteCatalogFromCard('${key}'); event.stopPropagation();" style="padding:6px 12px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">削除</button>
                </div>
            ` : ''}
        `;
        
        card.addEventListener('click', () => openPlaceOrderModal(key));
        grid.appendChild(card);
    });
    
    noResults.style.display = itemCount === 0 ? 'block' : 'none';
}

/**
 * Delete catalog from product card (for admins)
 */
async function deleteCatalogFromCard(catalogKey) {
    const catalogData = CatalogDB[catalogKey];
    if (!catalogData) return;
    
    const catalogName = catalogData.name;
    const confirmed = confirm(`本当に「${catalogName}」を削除しますか？このカタログに関連するすべてのエントリも削除されます。`);
    if (!confirmed) return;
    
    try {
        console.log('[DELETE CARD] Starting delete for:', catalogName, 'key:', catalogKey);
        
        // Delete from CatalogNames
        await remove(ref(db, `CatalogNames/${catalogKey}`));
        console.log('[DELETE CARD] Deleted from CatalogNames');
        
        // Delete all catalog entries with this name
        const catalogsRef = ref(db, 'Catalogs');
        const snapshot = await get(catalogsRef);
        if (snapshot.exists()) {
            const catalogEntries = snapshot.val();
            const toDelete = [];
            
            Object.entries(catalogEntries).forEach(([key, entry]) => {
                if (entry && entry.CatalogName === catalogName) {
                    toDelete.push(key);
                }
            });
            
            console.log('[DELETE CARD] Found', toDelete.length, 'entries to delete');
            for (const key of toDelete) {
                await remove(ref(db, `Catalogs/${key}`));
            }
            console.log('[DELETE CARD] Deleted all related entries');
        }
        
        // Delete all orders with this name
        const ordersRef = ref(db, 'Orders');
        const ordersSnapshot = await get(ordersRef);
        if (ordersSnapshot.exists()) {
            const orders = ordersSnapshot.val();
            const toDeleteOrders = [];
            
            Object.entries(orders).forEach(([key, order]) => {
                if (order && order.CatalogName === catalogName) {
                    toDeleteOrders.push(key);
                }
            });
            
            console.log('[DELETE CARD] Found', toDeleteOrders.length, 'orders to delete');
            for (const key of toDeleteOrders) {
                await remove(ref(db, `Orders/${key}`));
            }
        }
        
        // Delete image if exists
        try {
            await remove(ref(db, `CatalogImages/${catalogKey}`));
            console.log('[DELETE CARD] Deleted image');
        } catch (e) {
            console.log('[DELETE CARD] Image not found (OK)');
        }
        
        // Remove from local CatalogDB
        delete CatalogDB[catalogKey];
        
        showAddToCartToast('カタログが削除されました ✓: ' + catalogName, 1);
        syncAllPages();
    } catch (error) {
        console.error('[DELETE CARD] ERROR:', error);
        console.error('[DELETE CARD] Error code:', error.code);
        showAddToCartToast('削除エラー: ' +error.message, 0);
    }
}

/**
 * Edit catalog from product card  (for admins)
 */
function openEditCatalogModal(catalogKey, catalogName) {
    const newName = prompt('新しいカタログ名を入力:', catalogName);
    if (newName === null || newName.trim() === '') {
        return;
    }
    
    editCatalogNameFromCard(catalogKey, newName);
}

/**
 * Edit catalog name from product card (for admins)
 */
async function editCatalogNameFromCard(catalogKey, newName) {
    if (!newName || newName.trim() === '') {
        showAddToCartToast('カタログ名を入力してください', 0);
        return;
    }
    
    try {
        const sanitizedName = newName.trim();
        const catalogData = CatalogDB[catalogKey];
        if (!catalogData) {
            showAddToCartToast('カタログが見つかりません', 0);
            return;
        }
        
        const currentName = catalogData.name;
        console.log('[EDIT CARD] Starting edit:', currentName, '->', sanitizedName);
        
        // Check if new name already exists
        if (sanitizedName !== currentName && Object.values(CatalogDB).some(c => c.name === sanitizedName)) {
            console.warn('[EDIT CARD] New name already exists');
            showAddToCartToast('このカタログ名は既に存在します', 0);
            return;
        }
        
        // Update catalog name in Firebase
        console.log('[EDIT CARD] Writing to Firebase:', catalogKey, '=', sanitizedName);
        await set(ref(db, `CatalogNames/${catalogKey}`), sanitizedName);
        console.log('[EDIT CARD] Successfully updated CatalogNames');
        
        // Update all catalog entries with the old name
        const catalogsRef = ref(db, 'Catalogs');
        const snapshot = await get(catalogsRef);
        if (snapshot.exists()) {
            const catalogEntries = snapshot.val();
            const updateBatch = {};
            
            Object.entries(catalogEntries).forEach(([entryKey, entry]) => {
                if (entry && entry.CatalogName === currentName) {
                    updateBatch[entryKey] = { ...entry, CatalogName: sanitizedName };
                }
            });
            
            if (Object.keys(updateBatch).length > 0) {
                console.log('[EDIT CARD] Updating', Object.keys(updateBatch).length, 'entries');
                await update(catalogsRef, updateBatch);
                console.log('[EDIT CARD] Entries updated');
            }
        }

        // Update all orders with the old catalog name
        const ordersRef = ref(db, 'Orders');
        const ordersSnapshot = await get(ordersRef);
        if (ordersSnapshot.exists()) {
            const ordersData = ordersSnapshot.val();
            const orderUpdateBatch = {};
            
            Object.entries(ordersData).forEach(([orderKey, order]) => {
                if (order && order.CatalogName === currentName) {
                    orderUpdateBatch[orderKey] = { ...order, CatalogName: sanitizedName };
                }
            });
            
            if (Object.keys(orderUpdateBatch).length > 0) {
                console.log('[EDIT CARD] Updating', Object.keys(orderUpdateBatch).length, 'orders with new catalog name');
                await update(ordersRef, orderUpdateBatch);
                console.log('[EDIT CARD] Orders updated with new catalog name');
            }
        }
        
        showAddToCartToast('カタログが更新されました ✓: ' + sanitizedName, 1);
        syncAllPages();
    } catch (error) {
        console.error('[EDIT CARD] ERROR:', error);
        console.error('[EDIT CARD] Error code:', error.code);
        showAddToCartToast('編集エラー: ' + error.message, 0);
    }
}

function openPlaceOrderModal(itemKey) {
    const catalogData = CatalogDB[itemKey];
    if (!catalogData) return;
    
    currentOrderItemKey = itemKey;
    const catalogName = catalogData.name || itemKey;
    const imageUrl = extractImageUrl(catalogData.image || '');
    
    document.getElementById('placeOrderModalTitle').textContent = catalogName;
    document.getElementById('placeOrderModalName').textContent = catalogName;
    document.getElementById('placeOrderModalImage').src = imageUrl;
    document.getElementById('placeOrderModalQty').value = 1;
    document.getElementById('placeOrderModalDepartment').value = '';
    document.getElementById('placeOrderModalRequester').value = '';
    
    // Initialize location selection UI in modal
    setupLocationSelectionUI();
    
    // Pre-fill address from selected location or custom address
    let defaultAddress = '';
    if (selectedAddressType === 'location' && selectedAddressValue) {
        const location = getLocationById(selectedAddressValue);
        if (location) {
            defaultAddress = formatLocationAddress(location);
        }
    } else if (selectedAddressType === 'custom' && selectedAddressValue) {
        defaultAddress = selectedAddressValue;
    }
    document.getElementById('placeOrderModalAddress').value = defaultAddress;
    document.getElementById('placeOrderModalMessage').value = '';
    
    // ✓ NEW: Display enhanced stock status and validate availability
    const currentStock = CatalogDB[itemKey]?.stock || 0;
    const isDiscontinued = CatalogDB[itemKey]?.discontinued || false;
    const submitBtn = document.getElementById('placeOrderSubmitBtn');
    const stockStatusElement = document.getElementById('placeOrderModalStock');
    
    let stockStatus = '';
    let isAvailable = true;
    
    if (isDiscontinued) {
        stockStatus = '⚠️ 廃止品';
        isAvailable = false;
    } else if (currentStock === 0) {
        stockStatus = '⚠️ 絶版 (在庫なし)';
        isAvailable = false;
    } else if (currentStock < 5) {
        stockStatus = `⚠️ 在庫わずか: ${currentStock}個`;
        isAvailable = true; // Still available but low stock warning
    } else {
        stockStatus = `✅ 在庫あり: ${currentStock}個`;
        isAvailable = true;
    }
    
    stockStatusElement.textContent = stockStatus;
    stockStatusElement.style.fontWeight = '700';
    stockStatusElement.style.padding = '8px 12px';
    stockStatusElement.style.borderRadius = '6px';
    
    if (!isAvailable) {
        stockStatusElement.style.background = '#fee2e2';
        stockStatusElement.style.color = '#dc2626';
    } else if (currentStock < 5) {
        stockStatusElement.style.background = '#fef3c7';
        stockStatusElement.style.color = '#d97706';
    } else {
        stockStatusElement.style.background = '#dcfce7';
        stockStatusElement.style.color = '#16a34a';
    }
    
    // ✓ NEW: Disable/Enable submit button based on availability
    submitBtn.disabled = !isAvailable;
    if (isAvailable) {
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    } else {
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.title = 'この商品は注文できません。商品企画室にお問い合わせください。';
    }
    
    // Show modal and backdrop
    document.getElementById('placeOrderModalBackdrop').style.display = 'block';
    document.getElementById('placeOrderModal').style.display = 'block';
}

function closePlaceOrderModal() {
    document.getElementById('placeOrderModal').style.display = 'none';
    document.getElementById('placeOrderModalBackdrop').style.display = 'none';
    currentOrderItemKey = null;
}

function increaseOrderQty() {
    const input = document.getElementById('placeOrderModalQty');
    input.value = Math.max(1, parseInt(input.value) + 1);
    
    // ✓ NEW: Check if quantity now exceeds stock
    validateQuantityAgainstStock();
    
    // Animations and feedback
    input.classList.add('quantity-pop');
    playSound('click');
    triggerHaptic('light');
    setTimeout(() => input.classList.remove('quantity-pop'), 400);
}

function decreaseOrderQty() {
    const input = document.getElementById('placeOrderModalQty');
    input.value = Math.max(1, parseInt(input.value) - 1);
    
    // ✓ NEW: Check if quantity is now valid
    validateQuantityAgainstStock();
    
    // Animations and feedback
    input.classList.add('quantity-pop');
    playSound('click');
    triggerHaptic('light');
    setTimeout(() => input.classList.remove('quantity-pop'), 400);
}

/**
 * ✓ NEW: Validate quantity against current stock and update button state
 */
function validateQuantityAgainstStock() {
    if (!currentOrderItemKey) return;
    
    const quantity = parseInt(document.getElementById('placeOrderModalQty').value) || 1;
    const catalogData = CatalogDB[currentOrderItemKey];
    const currentStock = catalogData?.stock || 0;
    const isDiscontinued = catalogData?.discontinued || false;
    const submitBtn = document.getElementById('placeOrderSubmitBtn');
    
    // If discontinued, stay disabled
    if (isDiscontinued) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        return;
    }
    
    // If out of stock, stay disabled
    if (currentStock === 0) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        return;
    }
    
    // If quantity exceeds stock, disable button
    if (quantity > currentStock) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.title = `在庫が不足しています (${currentStock}個のみ)`;
    } else {
        // All good, enable button
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.title = '注文確認';
    }
}

/**
 * Validate cart item availability (stock and discontinued status)
 * @returns {isValid: boolean, reason: string}
 */
function validateCartItemAvailability(itemKey, requestedQuantity) {
    const item = CatalogDB[itemKey];
    
    if (!item) {
        return { isValid: false, reason: 'カタログが見つかりません' };
    }
    
    const catalogName = item.name;
    const currentStock = item.stock || 0;
    const isDiscontinued = item.discontinued || false;
    
    // Check if discontinued
    if (isDiscontinued) {
        return { 
            isValid: false, 
            reason: `「${catalogName}」は廃止品です。\n\n商品企画室にお問い合わせください。`,
            type: 'discontinued'
        };
    }
    
    // Check if out of stock (絶版)
    if (currentStock === 0) {
        return { 
            isValid: false, 
            reason: `「${catalogName}」は現在絶版です。\n\n商品企画室にお問い合わせください。`,
            type: 'out_of_stock'
        };
    }
    
    // Check if insufficient inventory
    if (currentStock < requestedQuantity) {
        return { 
            isValid: false, 
            reason: `「${catalogName}」の在庫は${currentStock}冊(枚)のため、ご要求の数量をお渡しすることができません。（ご要求数:${requestedQuantity}冊(枚)）\n\n商品企画室にお問い合わせください。`,
            type: 'insufficient_stock'
        };
    }
    
    // All checks passed
    return { isValid: true, reason: '' };
}

/**
 * Show inventory validation error modal
 */
function showInventoryValidationError(message) {
    // Create error modal if it doesn't exist
    if (!document.getElementById('inventoryValidationErrorModal')) {
        const modal = document.createElement('div');
        modal.id = 'inventoryValidationErrorModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="border: 2px solid #dc2626; border-radius: 12px;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-bottom: 2px solid #dc2626;">
                        <h5 class="modal-title" style="color: #dc2626; font-weight: 700;">
                            <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>申し訳ございません
                        </h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 24px; color: #1e293b; font-size: 15px; line-height: 1.6;">
                        <p id="inventoryValidationErrorMessage" style="margin: 0; white-space: pre-wrap;"></p>
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid #e2e8f0; padding: 16px;">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">閉じる</button>
                        <a href="mailto:shohin@example.com" class="btn btn-primary">
                            <i class="fas fa-envelope" style="margin-right: 8px;"></i>商品企画室に連絡
                        </a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Update message and show modal
    document.getElementById('inventoryValidationErrorMessage').textContent = message;
    $('#inventoryValidationErrorModal').modal('show');
}

async function submitPlaceOrder() {
    if (!currentOrderItemKey) {
        alert('エラー: アイテムが選択されていません');
        return;
    }
    
    const item = CatalogDB[currentOrderItemKey];
    const catalogName = item?.name || currentOrderItemKey;
    const quantity = parseInt(document.getElementById('placeOrderModalQty').value);
    const department = document.getElementById('placeOrderModalDepartment').value.trim();
    const requester = document.getElementById('placeOrderModalRequester').value.trim();
    const address = document.getElementById('placeOrderModalAddress').value.trim();
    const message = document.getElementById('placeOrderModalMessage').value.trim();
    
    if (!requester) {
        alert('発注者を入力してください');
        return;
    }
    
    if (quantity < 1) {
        alert('注文数量を入力してください');
        return;
    }
    
    // ✓ NEW: Validate inventory availability
    const validation = validateCartItemAvailability(currentOrderItemKey, quantity);
    if (!validation.isValid) {
        showInventoryValidationError(validation.reason);
        playSound('error');
        triggerHaptic('error');
        return; // Block adding to cart
    }
    
    try {
        // Add to cart with new fields
        addToCart(catalogName, quantity, department, requester, address, message, currentOrderItemKey);
        
        // Update button feedback
        const submitBtn = document.getElementById('placeOrderSubmitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> カートに追加しました！';
        
        setTimeout(() => {
            submitBtn.innerHTML = originalText;
        }, 1500);
        
        alert(`✅ "${catalogName}" × ${quantity}個をカートに追加しました！`);
        closePlaceOrderModal();
        
    } catch (error) {
        console.error('Add to cart error:', error);
        alert('エラー: ' + error.message);
    }
}

// ===== SMART CHECKOUT FEATURES =====

/**
 * Show toast notification when item added to cart
 */
function showAddToCartToast(catalogName, quantity) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
        font-size: 14px;
        font-weight: 600;
        z-index: 999;
        animation: slideInRight 0.3s ease-out;
        max-width: 280px;
    `;
    toast.innerHTML = `
        ✅ <strong>${catalogName}</strong> ×${quantity}個<br>
        カートに追加しました！
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.animate([
            { opacity: '1', transform: 'translateX(0)' },
            { opacity: '0', transform: 'translateX(300px)' }
        ], 300).onfinish = () => toast.remove();
    }, 2000);
}

/**
 * Show helpful checkout prompt when first item added
 */
function showCheckoutPrompt() {
    const prompt = document.createElement('div');
    prompt.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        color: #1e293b;
        padding: 16px;
        border-radius: 8px;
        border: 2px solid #2563eb;
        box-shadow: 0 10px 25px rgba(37, 99, 235, 0.2);
        font-size: 13px;
        font-weight: 600;
        z-index: 999;
        animation: slideInDown 0.3s ease-out;
        max-width: 280px;
    `;
    prompt.innerHTML = `
        <div style="color:#2563eb; margin-bottom:6px;">🛒 カートに追加</div>
        <div style="color:#666; margin-bottom:8px;">下の「一括注文」ボタンを押して注文を確定してください</div>
        <button onclick="this.parentElement.style.display='none'" style="background:none; border:none; color:#999; cursor:pointer; font-size:18px; position:absolute; top:5px; right:5px; padding:0; width:24px; height:24px;">✕</button>
    `;
    document.body.appendChild(prompt);
    
    setTimeout(() => {
        if (prompt.parentElement) {
            prompt.animate([
                { opacity: '1', transform: 'translateY(0)' },
                { opacity: '0', transform: 'translateY(-300px)' }
            ], 300).onfinish = () => prompt.remove();
        }
    }, 4000);
}

/**
 * Show celebration animation when order is placed successfully
 */
function showOrderConfirmationCelebration(itemCount) {
    // Create celebration container
    const celebration = document.createElement('div');
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 5000;
        pointer-events: none;
    `;
    
    celebration.innerHTML = `
        <div style="
            font-size: 187px;
            font-weight: 700;
            color: #10b981;
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            animation: celebrateScale 0.6s ease-out;
            text-align: center;
        ">✅</div>
    `;
    
    document.body.appendChild(celebration);
    
    // Create confetti particles
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        const emoji = ['🎉', '🎊', '✨', '🎈', '🎁'][Math.floor(Math.random() * 5)];
        confetti.textContent = emoji;
        confetti.style.cssText = `
            position: fixed;
            font-size: ${53 + Math.random() * 53}px;
            left: 50%;
            top: 50%;
            pointer-events: none;
            z-index: 4999;
            animation: confettiFall ${2 + Math.random() * 1}s linear forwards;
            transform-origin: 50% 50%;
        `;
        
        const angle = (Math.PI * 2 * i) / 30;
        const distance = 100;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        confetti.style.setProperty('--tx', tx + 'px');
        confetti.style.setProperty('--ty', ty + 'px');
        
        document.body.appendChild(confetti);
    }
    
    // Success message
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, calc(-50% + 267px));
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 53px 107px;
        border-radius: 32px;
        font-size: 48px;
        font-weight: 700;
        text-align: center;
        box-shadow: 0 27px 80px rgba(16, 185, 129, 0.4);
        z-index: 4998;
        animation: slideUpIn 0.5s ease-out;
        pointer-events: none;
    `;
    
    message.innerHTML = `
        <div>🎉 注文が完了しました！</div>
        <div style="font-size: 37px; margin-top: 21px; opacity: 0.95;">
            ${itemCount}件の注文を受け付けました
        </div>
    `;
    document.body.appendChild(message);
    
    // Keep celebration visible longer (10 seconds) so customer can fully appreciate it
    setTimeout(() => {
        celebration.remove();
        message.remove();
        document.querySelectorAll('[style*="confettiFall"]').forEach(el => el.remove());
    }, 10000);
}

/**
 * Warn user if leaving page with items in cart
 */
function setupCartWarning() {
    window.addEventListener('beforeunload', (e) => {
        if (cartHasChanged && shoppingCart.length > 0) {
            e.preventDefault();
            e.returnValue = `${shoppingCart.length}件のカート内容があります。本当に離脱しますか？`;
            return e.returnValue;
        }
    });
}

// ===== MAKE PLACE ORDER FUNCTIONS GLOBAL =====
window.openPlaceOrderModal = openPlaceOrderModal;
window.closePlaceOrderModal = closePlaceOrderModal;
window.increaseOrderQty = increaseOrderQty;
window.decreaseOrderQty = decreaseOrderQty;
window.submitPlaceOrder = submitPlaceOrder;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQty = updateCartQty;
window.clearCart = clearCart;
window.checkoutCart = checkoutCart;
window.updateCartUI = updateCartUI;
window.navigateToTaichouAndHighlightOrders = navigateToTaichouAndHighlightOrders;  // ✓ NEW

// ===== ORDER FORM =====
function initOrderForm() {
    // New product grid handles orders
    const placeOrderSearch = document.getElementById('placeOrderSearchInput');
    if (placeOrderSearch) {
        placeOrderSearch.addEventListener('input', () => {
            renderPlaceOrderProductGrid();
        });
    }
    
    // Close modal on backdrop click
    const backdrop = document.getElementById('placeOrderModalBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', closePlaceOrderModal);
    }
}

// ===== SORTING & FILTERING STATE =====
let catalogSortState = { column: null, direction: 'asc' };
let catalogRequesterFilter = null;
let orderRequesterFilter = null;
let auditDateRange = { from: null, to: null };
let movementDateRange = { from: null, to: null };
let expandedCatalogSections = new Set(); // Track which accordion sections are expanded

// ===== UTILITY: Get unique values from array =====
function getUniqueValues(data, field) {
    const values = new Set();
    Object.values(data).forEach(item => {
        if (item[field]) values.add(item[field]);
    });
    return Array.from(values).sort();
}

// ===== UTILITY: Filter by date range =====
function isInDateRange(timestamp, fromDate, toDate) {
    const date = new Date(timestamp);
    
    if (fromDate) {
        const from = new Date(fromDate);
        if (date < from) return false;
    }
    
    if (toDate) {
        const to = new Date(toDate);
        // Include the entire toDate day
        to.setHours(23, 59, 59, 999);
        if (date > to) return false;
    }
    
    return true;
}

// ===== RENDER CATALOG TABLES ACCORDION =====
// ===== UNIFIED 台帳: INVENTORY + ORDERS IN SINGLE TABLE =====
async function renderCatalogTablesAccordion() {
    const container = document.getElementById('catalogEntriesAccordion');
    if (!container) return;
    
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">📂 データを読み込み中...</div>';
    
    try {
        // Fetch both Catalogs (inventory) and Orders
        const [catalogSnapshot, ordersSnapshot] = await Promise.all([
            get(ref(db, 'Catalogs/')),
            get(ref(db, 'Orders/'))
        ]);
        
        const catalogData = catalogSnapshot.exists() ? catalogSnapshot.val() : {};
        const ordersData = ordersSnapshot.exists() ? ordersSnapshot.val() : {};
        
        // Group by catalog name: { catalogName: [ { type: 'inventory'|'order', data... } ] }
        const catalogs = {};
        let allRequesters = new Set();
        
        // Add INVENTORY entries
        Object.entries(catalogData).forEach(([key, entry]) => {
            if (!entry || !entry.CatalogName) return;
            const catName = entry.CatalogName;
            if (!catalogs[catName]) catalogs[catName] = [];
            catalogs[catName].push({
                _type: 'inventory',
                _key: key,
                ...entry,
                _date: entry.ReceiptDate || '1970-01-01',
                _quantity: Number(entry.QuantityReceived || 0)
            });
            if (entry.Requester) allRequesters.add(entry.Requester);
        });
        
        // Add ORDER entries
        Object.entries(ordersData).forEach(([key, order]) => {
            if (!order || !order.CatalogName) return;
            const catName = order.CatalogName;
            if (!catalogs[catName]) catalogs[catName] = [];
            catalogs[catName].push({
                _type: 'order',
                _key: key,
                ...order,
                _date: order.CreatedAt ? order.CreatedAt.split('T')[0] : order.OrderDate || '1970-01-01',
                _quantity: -(Number(order.OrderQuantity || 0)) // Negative for orders
            });
            if (order.Requester) allRequesters.add(order.Requester);
        });
        
        // Build filter UI
        const filterHtml = `
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                <label style="font-weight: 600; color: #1e293b;">🔍 フィルター (依頼者):</label>
                <select id="catalogRequesterSelect" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; background: white;">
                    <option value="">すべて表示</option>
                    ${Array.from(allRequesters).sort().map(r => `<option value="${r}">${r}</option>`).join('')}
                </select>
            </div>
        `;
        container.innerHTML = filterHtml;
        
        const filterSelect = container.querySelector('#catalogRequesterSelect');
        if (filterSelect) {
            filterSelect.value = catalogRequesterFilter || '';
            filterSelect.addEventListener('change', (e) => {
                catalogRequesterFilter = e.target.value;
                renderCatalogTablesAccordion();
            });
        }
        
        // Render each catalog section
        Object.keys(catalogs).sort().forEach((catName) => {
            let entries = catalogs[catName].slice();
            
            // Apply requester filter
            if (catalogRequesterFilter) {
                entries = entries.filter(e => e.Requester === catalogRequesterFilter);
            }
            
            if (entries.length === 0) return;
            
            // Sort by date (newest first)
            entries.sort((a, b) => new Date(b._date) - new Date(a._date));
            
            // Calculate running stock
            let runningStock = 0;
            let totalReceived = 0, totalOrdered = 0, totalInventoryItems = 0;
            
            const rowsHtml = entries.map((entry) => {
                // Update running stock
                runningStock += entry._quantity;
                
                if (entry._type === 'inventory') {
                    totalReceived += entry._quantity;
                    totalInventoryItems++;
                }
                if (entry._type === 'order') {
                    totalOrdered += Math.abs(entry._quantity);
                }
                
                // Get status color
                const statusColor = {
                    '注文受付': '#bfdbfe',
                    '発送済み': '#fcd34d',
                    '完了': '#bbf7d0',
                    'キャンセル': '#fecaca'
                }[entry.Status] || '#f0f0f0';
                
                // Type badge
                const typeBadge = entry._type === 'inventory' 
                    ? '<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">📦 在庫</span>'
                    : '<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">📄 注文</span>';
                
                // Row for INVENTORY
                if (entry._type === 'inventory') {
                    return `<tr data-key="${entry._key}" data-type="inventory" style="background: #f9fafb;">
                        <td style="padding: 10px 12px;">${typeBadge}</td>
                        <td style="padding: 10px 12px; font-weight: 600; color: #1e293b; cursor: pointer;" class="editable" data-field="CatalogName">${entry.CatalogName}</td>
                        <td style="padding: 10px 12px; cursor: pointer;" class="editable" data-field="ReceiptDate">${entry._date}</td>
                        <td style="padding: 10px 12px; color: #059669; font-weight: 700; cursor: pointer;" class="editable" data-field="QuantityReceived">+${entry._quantity}</td>
                        <td style="padding: 10px 12px;">-</td>
                        <td style="padding: 10px 12px;">-</td>
                        <td style="padding: 10px 12px;">-</td>
                        <td style="padding: 10px 12px;">-</td>
                        <td style="padding: 10px 12px;">-</td>
                        <td style="padding: 10px 12px; color: #2563eb; font-weight: 700;">${runningStock}</td>
                        <td style="padding: 10px 12px;">-</td>
                        <td style="padding: 10px 12px;">-</td>
                        <td style="padding: 10px 12px; text-align: center;"><button class="btn btn-danger btn-sm delete-inv-row" data-key="${entry._key}">🗑️</button></td>
                    </tr>`;
                }
                
                // Row for ORDER
                return `<tr data-key="${entry._key}" data-type="order" style="background: #eff6ff;">
                    <td style="padding: 10px 12px;">${typeBadge}</td>
                    <td style="padding: 10px 12px; font-weight: 600; color: #1e293b; cursor: pointer;" class="editable-order" data-field="CatalogName">${entry.CatalogName}</td>
                    <td style="padding: 10px 12px; cursor: pointer;" class="editable-order" data-field="CreatedAt">${entry._date}</td>
                    <td style="padding: 10px 12px; color: #ef4444; font-weight: 700; cursor: pointer;" class="editable-order" data-field="OrderQuantity">-${Math.abs(entry._quantity)}</td>
                    <td style="padding: 10px 12px; cursor: pointer;" class="editable-order" data-field="RequesterDepartment">${entry.RequesterDepartment || '-'}</td>
                    <td style="padding: 10px 12px; cursor: pointer;" class="editable-order" data-field="Requester">${entry.Requester || '-'}</td>
                    <td style="padding: 10px 12px; cursor: pointer;" class="editable-order" data-field="RequesterAddress">${entry.RequesterAddress || '-'}</td>
                    <td style="padding: 10px 12px; cursor: pointer;" class="editable-order" data-field="Message">${entry.Message || '-'}</td>
                    <td style="padding: 10px 12px; cursor: pointer;" class="editable-order" data-field="DistributionDestination">${entry.DistributionDestination || '-'}</td>
                    <td style="padding: 10px 12px; color: #2563eb; font-weight: 700;">${runningStock}</td>
                    <td style="padding: 10px 12px;">
                        <select class="order-status-select form-control form-control-sm" data-key="${entry._key}" 
                                style="background: ${statusColor}; border: 1px solid #cbd5e1; padding: 4px 8px; font-size: 12px; font-weight: 600;">
                            <option value="注文受付" ${entry.Status === '注文受付' ? 'selected' : ''}>注文受付</option>
                            <option value="発送済み" ${entry.Status === '発送済み' ? 'selected' : ''}>発送済み</option>
                            <option value="完了" ${entry.Status === '完了' ? 'selected' : ''}>完了</option>
                            <option value="キャンセル" ${entry.Status === 'キャンセル' ? 'selected' : ''}>キャンセル</option>
                        </select>
                    </td>
                    <td style="padding: 10px 12px;">
                        <input type="text" class="tracking-id-input form-control form-control-sm" data-key="${entry._key}" 
                               value="${entry.TrackingId || ''}" placeholder="TRK-..."
                               style="padding: 4px 8px; font-size: 12px;">
                    </td>
                    <td style="padding: 10px 12px; text-align: center;"><button class="btn btn-danger btn-sm delete-order-row" data-key="${entry._key}">🗑️</button></td>
                </tr>`;
            }).join('');
            
            // Total row
            const totalRow = `<tr style="background: linear-gradient(90deg, #f0f4f8 0%, #e8f1f8 100%); border-top: 2px solid #2563eb; font-weight: 700; color: #1e293b;">
                <td colspan="3" style="padding: 12px 16px;">💰 合計 (在庫: ${totalInventoryItems})</td>
                <td style="padding: 12px 16px; color: #059669;">+${totalReceived}</td>
                <td colspan="5" style="padding: 12px 16px; text-align: center;">-</td>
                <td style="padding: 12px 16px; color: #2563eb; font-weight: 700;">${totalReceived - totalOrdered}</td>
                <td colspan="3" style="padding: 12px 16px; text-align: center;">-</td>
            </tr>`;
                
                const section = document.createElement('div');
                section.className = 'catalog-section';
                section.innerHTML = `
                    <div class="catalog-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f0f4f8; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; margin-bottom: 12px; user-select: none;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                            <i class="fas fa-chevron-down" style="transition: transform 0.2s; font-size: 14px; color: #64748b;"></i>
                            <i class='fa-solid fa-box' style="color: #2563eb;"></i>
                            <span style="font-weight: 600; color: #1e293b; font-size: 15px;">${catName}</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 13px;">(${entries.length} entries)</span>
                        </div>
                    </div>
                    <div class="catalog-table-wrapper" style="display: ${expandedCatalogSections.has(catName) ? 'block' : 'none'}; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px;">
                        <table class="glass-table excel-table" data-catalog="${catName}" style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f8fafc;">
                                <tr>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">タイプ</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; cursor: pointer;" data-column="CatalogName">カタログ名</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; cursor: pointer;" data-column="Date">日付 ${catalogSortState.column === 'Date' ? (catalogSortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; cursor: pointer;" data-column="Quantity">数量 ${catalogSortState.column === 'Quantity' ? (catalogSortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">部署</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">注文者</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">住所</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">メモ</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">配布先</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">在庫残数</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">ステータス</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">追跡ID</th>
                                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                                ${totalRow}
                            </tbody>
                        </table>
                        <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 8px;">
                            <button class="btn btn-success btn-sm add-catalog-row" data-catalog="${catName}">➕ 新規行を追加</button>
                        </div>
                    </div>
                `;
                
                container.appendChild(section);
                
                // Delete inventory row
                section.querySelectorAll('.delete-inv-row').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm('この在庫を削除しますか?')) return;
                        const key = btn.getAttribute('data-key');
                        try {
                            await remove(ref(db, `Catalogs/${key}`));
                            showToast('在庫を削除しました', 'success');
                            await renderCatalogTablesAccordion();
                        } catch (err) {
                            console.error('Delete inventory error:', err);
                            showToast('削除に失敗しました', 'error');
                        }
                    });
                });
                
                // Delete order row
                section.querySelectorAll('.delete-order-row').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm('この注文を削除しますか?')) return;
                        const key = btn.getAttribute('data-key');
                        try {
                            await remove(ref(db, `Orders/${key}`));
                            showToast('注文を削除しました', 'success');
                            await renderCatalogTablesAccordion();
                        } catch (err) {
                            console.error('Delete order error:', err);
                            showToast('削除に失敗しました', 'error');
                        }
                    });
                });
                
                // Order status change
                section.querySelectorAll('.order-status-select').forEach(select => {
                    select.addEventListener('change', async (e) => {
                        const key = select.getAttribute('data-key');
                        const newStatus = select.value;
                        try {
                            const updateData = {
                                Status: newStatus,
                                LastStatusUpdate: new Date().toISOString()
                            };
                            await update(ref(db, `Orders/${key}`), updateData);
                            showToast(`ステータスを「${newStatus}」に更新しました`, 'success');
                            // Update MyPage mirror data
                            await update(ref(db, `MyPage/Orders/${key}`), updateData);
                        } catch (err) {
                            console.error('Status update error:', err);
                            showToast('更新に失敗しました', 'error');
                        }
                    });
                });
                
                // Tracking ID save on blur
                section.querySelectorAll('.tracking-id-input').forEach(input => {
                    input.addEventListener('blur', async (e) => {
                        const key = input.getAttribute('data-key');
                        const trackingId = input.value.trim();
                        try {
                            await update(ref(db, `Orders/${key}`), {
                                TrackingId: trackingId || null,
                                LastTrackingUpdate: new Date().toISOString()
                            });
                            // Update MyPage mirror data
                            await update(ref(db, `MyPage/Orders/${key}`), {
                                TrackingId: trackingId || null,
                                LastTrackingUpdate: new Date().toISOString()
                            });
                        } catch (err) {
                            console.error('Tracking ID update error:', err);
                        }
                    });
                });
                
                // Add click handler to header
                const header = section.querySelector('.catalog-header');
                const wrapper = section.querySelector('.catalog-table-wrapper');
                const chevron = header.querySelector('.fa-chevron-down');
                
                header.addEventListener('click', () => {
                    const isHidden = wrapper.style.display === 'none';
                    wrapper.style.display = isHidden ? 'block' : 'none';
                    chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                    // Update expanded state
                    if (isHidden) {
                        expandedCatalogSections.add(catName);
                    } else {
                        expandedCatalogSections.delete(catName);
                    }
                });
                
                // Restore chevron rotation if expanded
                if (expandedCatalogSections.has(catName)) {
                    chevron.style.transform = 'rotate(180deg)';
                }
                
                // Add column header click handlers for sorting
                const headers = section.querySelectorAll('thead th[data-column]');
                headers.forEach(th => {
                    th.addEventListener('click', () => {
                        const column = th.getAttribute('data-column');
                        if (catalogSortState.column === column) {
                            catalogSortState.direction = catalogSortState.direction === 'asc' ? 'desc' : 'asc';
                        } else {
                            catalogSortState.column = column;
                            catalogSortState.direction = 'asc';
                        }
                        renderCatalogTablesAccordion();
                    });
                });
            });
        } catch (err) {
            console.error('Error rendering catalog tables:', err);
            container.innerHTML = `<div style="padding: 20px; color: #dc2626; background: #fee2e2; border-radius: 8px;">❌ エラーが発生しました: ${err.message}</div>`;
        }
} 

// ===== SEARCH CATALOG ENTRIES =====
function initCatalogSearch() {
    const searchBox = document.getElementById('catalogSearchBox');
    if (!searchBox) return;
    
    searchBox.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const sections = document.querySelectorAll('.catalog-section');
        let visibleSections = 0;
        
        sections.forEach(section => {
            const header = section.querySelector('.catalog-header');
            const catName = header ? header.textContent.toLowerCase() : '';
            const table = section.querySelector('.catalog-table-wrapper table');
            
            if (!table) {
                section.style.display = 'none';
                return;
            }
            
            const rows = table.querySelectorAll('tbody tr');
            let visibleRows = 0;
            
            rows.forEach(row => {
                if (searchTerm === '') {
                    row.style.display = '';
                    visibleRows++;
                } else {
                    const rowText = row.textContent.toLowerCase();
                    const matches = rowText.includes(searchTerm);
                    row.style.display = matches ? '' : 'none';
                    if (matches) visibleRows++;
                }
            });
            
            // Show/hide section based on visible rows or catalog name match
            const catalogMatches = catName.includes(searchTerm);
            section.style.display = (visibleRows > 0 || catalogMatches) ? '' : 'none';
            
            if ((visibleRows > 0 || catalogMatches) && searchTerm !== '') {
                // Auto-expand section if search results found
                const wrapper = section.querySelector('.catalog-table-wrapper');
                const chevron = section.querySelector('.fa-chevron-down');
                if (wrapper && visibleRows > 0) {
                    wrapper.style.display = 'block';
                    if (chevron) chevron.style.transform = 'rotate(180deg)';
                }
            }
            
            if (visibleRows > 0 || catalogMatches) {
                visibleSections++;
            }
        });
        
        // Show no results message if needed
        const container = document.getElementById('catalogEntriesAccordion');
        if (visibleSections === 0 && searchTerm !== '') {
            if (!document.getElementById('noSearchResults')) {
                const noResults = document.createElement('div');
                noResults.id = 'noSearchResults';
                noResults.style.cssText = 'text-align: center; color: #999; padding: 30px; font-size: 16px;';
                noResults.innerHTML = `<i class="fas fa-search" style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;"></i><p>No items found matching "${searchTerm}"</p>`;
                container.appendChild(noResults);
            }
        } else {
            const noResults = document.getElementById('noSearchResults');
            if (noResults) noResults.remove();
        }
    });
}

// ===== RENDER ORDER TABLES ACCORDION =====
function renderOrderTablesAccordion() {
    const container = document.getElementById('orderEntriesAccordion');
    container.innerHTML = '';
    const orderRef = ref(db, 'Orders/');
    get(orderRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const catalogs = {};
            
            // Collect all requesters for filter dropdown
            let allRequesters = new Set();
            
            for (const key in data) {
                const catName = data[key].CatalogName;
                if (!catalogs[catName]) catalogs[catName] = [];
                catalogs[catName].push({ ...data[key], _key: key });
                if (data[key].Requester) allRequesters.add(data[key].Requester);
            }
            
            // Add requester filter dropdown at the top
            const filterHtml = `
                <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                    <label style="font-weight: 600; color: #1e293b;">フィルター (発注者):</label>
                    <select id="orderRequesterSelect" style="padding: 8px 12px; border: 1px solid #fbbf24; border-radius: 6px; font-size: 14px; background: white;">
                        <option value="">すべて表示</option>
                        ${Array.from(allRequesters).sort().map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>
            `;
            container.innerHTML = filterHtml;
            
            const filterSelect = container.querySelector('#orderRequesterSelect');
            if (filterSelect) {
                filterSelect.value = orderRequesterFilter || '';
                filterSelect.addEventListener('change', (e) => {
                    orderRequesterFilter = e.target.value;
                    renderOrderTablesAccordion();
                });
            }
            
            Object.keys(catalogs).forEach((catName, idx) => {
                let entries = catalogs[catName].slice();
                
                // Apply requester filter
                if (orderRequesterFilter) {
                    entries = entries.filter(e => e.Requester === orderRequesterFilter);
                }
                
                // Skip if no entries after filtering
                if (entries.length === 0) return;
                
                const section = document.createElement('div');
                section.className = 'order-section';
                section.innerHTML = `
                    <div class="order-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; cursor: pointer; margin-bottom: 12px; user-select: none;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                            <i class="fas fa-chevron-down" style="transition: transform 0.2s; font-size: 14px; color: #b45309;"></i>
                            <i class='fa-solid fa-cart-shopping' style="color: #f59e0b;"></i>
                            <span style="font-weight: 600; color: #1e293b; font-size: 15px;">${catName}</span>
                            <span style="margin-left: auto; color: #64748b; font-size: 13px;">(${entries.length} orders)</span>
                        </div>
                    </div>
                    <div class="order-table-wrapper" style="display: none; overflow-x: auto; border: 1px solid #fbbf24; border-radius: 8px; margin-bottom: 16px;">
                        <table class="glass-table excel-order-table" data-catalog="${catName}" style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #fffbeb;">
                                <tr>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #92400e; border-bottom: 2px solid #fbbf24;">カタログ名</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #92400e; border-bottom: 2px solid #fbbf24;">注文数量</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #92400e; border-bottom: 2px solid #fbbf24;">部署名</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #92400e; border-bottom: 2px solid #fbbf24;">発注者</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #92400e; border-bottom: 2px solid #fbbf24;">住所</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #92400e; border-bottom: 2px solid #fbbf24;">メッセージ</th>
                                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 700; color: #92400e; border-bottom: 2px solid #fbbf24;">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${entries.map(entry => `
                                    <tr data-key="${entry._key}" style="border-bottom: 1px solid #fef3c7;">
                                        <td data-field="CatalogName" style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${entry.CatalogName}</td>
                                        <td class="editable-order" data-field="OrderQuantity" style="padding: 12px 16px;">${entry.OrderQuantity}</td>
                                        <td class="editable-order" data-field="RequesterDepartment" style="padding: 12px 16px;">${entry.RequesterDepartment || '-'}</td>
                                        <td class="editable-order" data-field="Requester" style="padding: 12px 16px;">${entry.Requester}</td>
                                        <td class="editable-order" data-field="RequesterAddress" style="padding: 12px 16px;">${entry.RequesterAddress || '-'}</td>
                                        <td style="padding: 12px 16px;"><div style='max-width:320px;overflow-x:auto;'>${entry.Message || ''}</div></td>
                                        <td style="padding: 12px 16px; text-align: center;"><button class="btn btn-danger btn-sm delete-order-row">Delete</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div style="padding: 12px 16px; background: #fffbeb; border-top: 1px solid #fbbf24; display: flex; gap: 8px;">
                            <button class="btn btn-success btn-sm add-order-row" data-catalog="${catName}">➕ 新規注文を追加</button>
                        </div>
                    </div>
                `;
                
                container.appendChild(section);
                
                // Add click handler to header
                const header = section.querySelector('.order-header');
                const wrapper = section.querySelector('.order-table-wrapper');
                const chevron = header.querySelector('.fa-chevron-down');
                
                header.addEventListener('click', () => {
                    const isHidden = wrapper.style.display === 'none';
                    wrapper.style.display = isHidden ? 'block' : 'none';
                    chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            });
        }
    });
}

// ===== RENDER ORDER ENTRIES BY DATE (WITH FULFILLMENT CHECKBOX) =====
function renderOrdersByDate() {
    const container = document.getElementById('orderEntriesByDateContainer');
    container.innerHTML = '';
    const orderRef = ref(db, 'Orders/');
    
    get(orderRef).then((snapshot) => {
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="color:#999;">注文がありません</p>';
            return;
        }
        
        const data = snapshot.val();
        const ordersByDate = {};
        
        // Group orders by date
        for (const key in data) {
            const order = data[key];
            // Extract date from order timestamp or use today
            let orderDate = 'No Date';
            if (order.CreatedAt) {
                orderDate = order.CreatedAt.split('T')[0]; // YYYY-MM-DD format
            } else if (order.OrderDate) {
                orderDate = order.OrderDate;
            }
            
            if (!ordersByDate[orderDate]) {
                ordersByDate[orderDate] = [];
            }
            
            ordersByDate[orderDate].push({
                ...order,
                _key: key,
                _fulfilled: order.Fulfilled === true
            });
        }
        
        // Sort dates in descending order (newest first)
        const sortedDates = Object.keys(ordersByDate).sort().reverse();
        
        let html = '<div style="display: grid; gap: 20px;">';
        
        sortedDates.forEach(date => {
            const orders = ordersByDate[date];
            const totalQty = orders.reduce((sum, o) => sum + (o.OrderQuantity || 0), 0);
            const fulfilledCount = orders.filter(o => o._fulfilled).length;
            
            // Format date nicely
            const dateObj = new Date(date + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'short'
            });
            
            html += `
                <div style="border: 2px solid #ddd; border-radius: 12px; overflow: hidden; background: white;">
                    <div style="background: #f3f4f6; padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" class="date-header" data-date="${date}">
                        <div>
                            <h3 style="margin: 0; color: #1e293b; font-size: 18px;">${formattedDate}</h3>
                            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">
                                合計: ${orders.length} 件 • 合計数量: ${totalQty} • 完了: ${fulfilledCount}/${orders.length}
                            </p>
                        </div>
                        <div style="font-size: 24px;">
                            <i class="fas fa-chevron-down date-chevron" style="transition: transform 0.3s;"></i>
                        </div>
                    </div>
                    <div style="padding: 16px; display: none; max-height: 600px; overflow-y: auto;" class="date-orders">
            `;
            
            orders.forEach(order => {
                const bgColor = order._fulfilled ? '#f0fdf4' : '#fef2f2';
                const borderColor = order._fulfilled ? '#22c55e' : '#ef4444';
                const textColor = order._fulfilled ? '#15803d' : '#991b1b';
                
                html += `
                    <div style="background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 12px; margin-bottom: 10px; border-radius: 6px; display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" class="order-fulfill-checkbox" data-key="${order._key}" ${order._fulfilled ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                        <div style="flex: 1;">
                            <p style="margin: 0; font-weight: 600; color: #1e293b;">${order.CatalogName}</p>
                            <p style="margin: 4px 0 0 0; color: ${textColor}; font-size: 14px;">
                                数量: ${order.OrderQuantity} • 部署: ${order.RequesterDepartment || 'N/A'} • 発注: ${order.Requester || 'N/A'} • 住所: ${order.RequesterAddress || 'N/A'}
                            </p>
                        </div>
                        <div style="color: ${textColor}; font-weight: 700; text-align: center; min-width: 60px;">
                            ${order._fulfilled ? '✅ 完了' : '⏳ 未完了'}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Add click handlers for date headers
        container.querySelectorAll('.date-header').forEach(header => {
            header.addEventListener('click', function() {
                const ordersDiv = this.nextElementSibling;
                const chevron = this.querySelector('.date-chevron');
                const isHidden = ordersDiv.style.display === 'none';
                ordersDiv.style.display = isHidden ? 'block' : 'none';
                chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            });
        });
        
        // Add handlers for fulfillment checkboxes
        container.querySelectorAll('.order-fulfill-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', async function() {
                const orderKey = this.dataset.key;
                const isFulfilled = this.checked;
                
                try {
                    await update(ref(db, `Orders/${orderKey}`), {
                        Fulfilled: isFulfilled,
                        FulfilledAt: isFulfilled ? new Date().toISOString() : null
                    });
                    
                    // Re-render to update colors
                    renderOrdersByDate();
                } catch (error) {
                    console.error('Error updating fulfillment status:', error);
                    alert('更新に失敗しました');
                }
            });
        });
    });
}

// ===== SETUP VIEW TOGGLE BUTTONS =====
function setupOrderViewToggle() {
    const viewByCatalogBtn = document.getElementById('viewByCatalogBtn');
    const viewByDateBtn = document.getElementById('viewByDateBtn');
    const catalogAccordion = document.getElementById('orderEntriesAccordion');
    const dateContainer = document.getElementById('orderEntriesByDateContainer');
    
    if (!viewByCatalogBtn || !viewByDateBtn) return;
    
    viewByCatalogBtn.addEventListener('click', () => {
        catalogAccordion.style.display = 'block';
        dateContainer.style.display = 'none';
        viewByCatalogBtn.style.background = '#3b82f6';
        viewByDateBtn.style.background = '#6b7280';
        renderOrderTablesAccordion();
    });
    
    viewByDateBtn.addEventListener('click', () => {
        catalogAccordion.style.display = 'none';
        dateContainer.style.display = 'block';
        viewByCatalogBtn.style.background = '#6b7280';
        viewByDateBtn.style.background = '#3b82f6';
        renderOrdersByDate();
    });
}

// ===== INLINE EDITING (Tables) =====
$(document).on('click', '.excel-table .editable', function() {
    if ($(this).find('input').length) return;
    const td = $(this);
    const oldValue = td.text();
    const field = td.data('field');
    const key = td.closest('tr').data('key');
    const input = $('<input type="text" class="form-control form-control-sm">').val(oldValue);
    td.empty().append(input);
    input.focus();
    
    function saveEdit() {
        const newValue = input.val();
        if (newValue !== oldValue) {
            update(ref(db, 'Catalogs/' + key), { [field]: newValue }).then(() => {
                td.text(newValue).addClass('cell-updated');
                setTimeout(() => td.removeClass('cell-updated'), 800);
            });
        } else {
            td.text(oldValue);
        }
    }
    
    input.on('keydown', function(e) {
        if (e.key === 'Enter') saveEdit();
        else if (e.key === 'Escape') td.text(oldValue);
    }).on('blur', saveEdit);
});

$(document).on('click', '.excel-table .delete-row', async function() {
    const tr = $(this).closest('tr');
    const key = tr.data('key');
    if (confirm('削除しますか？')) {
        try {
            const snapshot = await get(ref(db, 'Catalogs/' + key));
            const catalog = snapshot.val();
            await remove(ref(db, 'Catalogs/' + key));
            await logAuditEvent('DELETE_CATALOG', `Deleted: ${catalog?.CatalogName}`, currentUser?.email);
            renderCatalogTablesAccordion();
            updateKPIs();
        } catch (error) {
            console.error('Delete error:', error);
        }
    }
});

$(document).on('click', '.excel-table .editable-order', function() {
    if ($(this).find('input').length) return;
    const td = $(this);
    const oldValue = td.text();
    const field = td.data('field');
    const key = td.closest('tr').data('key');
    const input = $('<input type="text" class="form-control form-control-sm">').val(oldValue);
    td.empty().append(input);
    input.focus();
    
    function saveEdit() {
        const newValue = input.val();
        if (newValue !== oldValue) {
            update(ref(db, 'Orders/' + key), { [field]: newValue }).then(() => {
                td.text(newValue).addClass('cell-updated');
                setTimeout(() => td.removeClass('cell-updated'), 800);
            });
        } else {
            td.text(oldValue);
        }
    }
    
    input.on('keydown', function(e) {
        if (e.key === 'Enter') saveEdit();
        else if (e.key === 'Escape') td.text(oldValue);
    }).on('blur', saveEdit);
});

$(document).on('click', '.excel-table .delete-order-row', async function() {
    const tr = $(this).closest('tr');
    const key = tr.data('key');
    if (confirm('削除しますか？')) {
        try {
            const snapshot = await get(ref(db, 'Orders/' + key));
            const order = snapshot.val();
            await remove(ref(db, 'Orders/' + key));
            await logAuditEvent('DELETE_ORDER', `Deleted order for: ${order?.CatalogName}`, currentUser?.email);
            await renderCatalogTablesAccordion();
        } catch (error) {
            console.error('Delete error:', error);
        }
    }
});

// ===== ADD ROW BUTTONS =====
$(document).on('click', '.add-catalog-row', function() {
    const catalogName = $(this).data('catalog');
    if (!catalogName) {
        alert('カタログ名を取得できません');
        return;
    }
    
    const newEntry = {
        CatalogName: catalogName,
        ReceiptDate: new Date().toISOString().split('T')[0],
        QuantityReceived: 0,
        DeliveryDate: '',
        IssueQuantity: 0,
        StockQuantity: 0,
        DistributionDestination: '',
        Requester: currentUser?.email || '',
        Remarks: ''
    };
    
    try {
        push(ref(db, 'Catalogs/'), newEntry).then(() => {
            logAuditEvent('CREATE_CATALOG', `Added new catalog entry: ${catalogName}`, currentUser?.email);
            renderCatalogTablesAccordion();
        });
    } catch (error) {
        console.error('Add catalog error:', error);
        alert('エラーが発生しました: ' + error.message);
    }
});

$(document).on('click', '.add-order-row', function() {
    const catalogName = $(this).data('catalog');
    if (!catalogName) {
        alert('カタログ名を取得できません');
        return;
    }
    
    const newOrder = {
        CatalogName: catalogName,
        OrderQuantity: 1,
        Requester: currentUser?.email || '',
        OrderDate: new Date().toISOString().split('T')[0],
        Message: ''
    };
    
    try {
        push(ref(db, 'Orders/'), newOrder).then((result) => {
            addNotification({
                type: 'ORDER',
                priority: 'normal',
                title: `📦 新しい注文が作成されました`,
                message: `${catalogName}`,
                details: {
                    catalogName: catalogName,
                    quantity: 1,
                    requester: currentUser?.email || 'Unknown',
                    date: new Date().toLocaleDateString('ja-JP')
                },
                timestamp: Date.now()
            });
            logAuditEvent('CREATE_ORDER', `Added new order for: ${catalogName}`, currentUser?.email);
            renderOrderTablesAccordion();
        });
    } catch (error) {
        console.error('Add order error:', error);
        alert('エラーが発生しました: ' + error.message);
    }
});

// ===== CELL HIGHLIGHTING FEATURE =====
const cellHighlights = {}; // Store cell highlights: { "key_field": "colorHex" }

$(document).on('contextmenu', '.editable, .editable-order', function(e) {
    e.preventDefault();
    const td = $(this);
    const key = td.closest('tr').data('key');
    const field = td.data('field');
    const cellId = key + '_' + field;
    
    const colors = [
        { name: 'クリア', value: null, color: '#ffffff' },
        { name: '黄色', value: '#fef08a', color: '#fef08a' },
        { name: 'ブルー', value: '#bfdbfe', color: '#bfdbfe' },
        { name: 'グリーン', value: '#bbf7d0', color: '#bbf7d0' },
        { name: 'ピンク', value: '#fbcfe8', color: '#fbcfe8' },
        { name: 'オレンジ', value: '#fed7aa', color: '#fed7aa' }
    ];
    
    // Remove existing menu
    $('.highlight-menu').remove();
    
    let menuHtml = '<div style="position: fixed; background: white; border: 1px solid #999; border-radius: 6px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 10000; min-width: 160px; padding: 4px;" class="highlight-menu">';
    colors.forEach(c => {
        menuHtml += `<div style="padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; border-radius: 4px;" class="highlight-option" data-color="${c.value || ''}" onmouseover="this.style.backgroundColor='#f0f0f0';" onmouseout="this.style.backgroundColor='transparent';">
            <div style="width: 18px; height: 18px; border: 1px solid #ccc; background: ${c.color}; border-radius: 3px;"></div>
            ${c.name}
        </div>`;
    });
    menuHtml += '</div>';
    
    const $menu = $(menuHtml).appendTo('body');
    $menu.css({
        left: e.pageX + 'px',
        top: e.pageY + 'px'
    });
    
    $(document).one('click', function() {
        $menu.remove();
    });
    
    $menu.find('.highlight-option').on('click', function() {
        const color = $(this).data('color');
        cellHighlights[cellId] = color || null;
        
        if (color) {
            td.css('background-color', color);
        } else {
            td.css('background-color', '');
        }
        
        localStorage.setItem('cellHighlights', JSON.stringify(cellHighlights));
        $menu.remove();
    });
});

// Restore highlights on render
function restoreCellHighlights() {
    Object.keys(cellHighlights).forEach(cellId => {
        const parts = cellId.lastIndexOf('_');
        if (parts === -1) return;
        const key = cellId.substring(0, parts);
        const field = cellId.substring(parts + 1);
        const color = cellHighlights[cellId];
        
        if (color) {
            $(`.editable[data-field="${field}"], .editable-order[data-field="${field}"]`).each(function() {
                if ($(this).closest('tr').data('key') === key) {
                    $(this).css('background-color', color);
                }
            });
        }
    });
}

// Load highlights from localStorage on page load
function loadCellHighlights() {
    const saved = localStorage.getItem('cellHighlights');
    if (saved) {
        Object.assign(cellHighlights, JSON.parse(saved));
        restoreCellHighlights();
    }
}

// Call on page load
loadCellHighlights();

// ===== ROW HIGHLIGHTING =====
$(document).on('click', 'tr', function(e) {
    if (e.ctrlKey || e.metaKey) {
        $(this).toggleClass('row-highlight');
        if ($(this).hasClass('row-highlight')) {
            $(this).css('background-color', '#e0e7ff');
        } else {
            $(this).css('background-color', '');
        }
    }
});

// ===== DATA MANAGEMENT BUTTONS =====
document.getElementById('deleteAllCatalogBtn').addEventListener('click', () => {
    if (confirm('本当に全てのカタログデータを削除しますか？')) {
        remove(ref(db, 'Catalogs/')).then(() => {
            alert('削除しました');
            renderCatalogTablesAccordion();
        });
    }
});

document.getElementById('deleteAllOrderBtn').addEventListener('click', () => {
    if (confirm('本当に全ての注文データを削除しますか？')) {
        remove(ref(db, 'Orders/')).then(() => {
            alert('削除しました');
            renderOrderTablesAccordion();
        });
    }
});

// ===== EXPORT BUTTONS =====
document.getElementById('exportCatalogCSV')?.addEventListener('click', async () => {
    try {
        const snapshot = await get(ref(db, 'Catalogs/'));
        if (!snapshot.exists()) {
            alert('No data to export');
            return;
        }
        const data = snapshot.val();
        const tableData = [['カタログ名', '納入日', '受領数量', '出荷日', '発行数量', '在庫数量', '配布先', '部署名', '発注者', '住所', '備考']];
        for (const entry of Object.values(data)) {
            tableData.push([
                entry.CatalogName,
                entry.ReceiptDate,
                entry.QuantityReceived,
                entry.DeliveryDate,
                entry.IssueQuantity,
                entry.StockQuantity,
                entry.DistributionDestination,
                entry.RequesterDepartment || '',
                entry.Requester,
                entry.RequesterAddress || '',
                entry.Remarks
            ]);
        }
        exportToCSV('catalog-export.csv', tableData);
        window.showToast('✅ Catalog exported to CSV', 'success');
    } catch (error) {
        console.error('Export error:', error);
        window.showToast('❌ Export failed', 'error');
    }
});

document.getElementById('exportCatalogPDF')?.addEventListener('click', async () => {
    try {
        const snapshot = await get(ref(db, 'Catalogs/'));
        if (!snapshot.exists()) {
            alert('No data to export');
            return;
        }
        const data = snapshot.val();
        const tableData = [['カタログ名', '納入日', '受領数量', '出荷日', '発行数量', '在庫数量', '配布先', '部署名', '発注者', '住所']];
        for (const entry of Object.values(data)) {
            tableData.push([
                entry.CatalogName,
                entry.ReceiptDate,
                entry.QuantityReceived,
                entry.DeliveryDate,
                entry.IssueQuantity,
                entry.StockQuantity,
                entry.DistributionDestination,
                entry.RequesterDepartment || '',
                entry.Requester,
                entry.RequesterAddress || ''
            ]);
        }
        exportToPDF('catalog-export.pdf', 'Catalog Entries Report', tableData);
        window.showToast('✅ Catalog exported to PDF', 'success');
    } catch (error) {
        console.error('Export error:', error);
        window.showToast('❌ Export failed', 'error');
    }
});

document.getElementById('exportOrderCSV')?.addEventListener('click', async () => {
    try {
        const snapshot = await get(ref(db, 'Orders/'));
        if (!snapshot.exists()) {
            alert('No data to export');
            return;
        }
        const data = snapshot.val();
        const tableData = [['カタログ名', '注文数量', '部署名', '発注者', '住所', 'メッセージ', '注文日']];
        for (const entry of Object.values(data)) {
            tableData.push([
                entry.CatalogName,
                entry.OrderQuantity,
                entry.RequesterDepartment || '',
                entry.Requester,
                entry.RequesterAddress || '',
                entry.Message,
                entry.OrderDate
            ]);
        }
        exportToCSV('orders-export.csv', tableData);
        window.showToast('✅ Orders exported to CSV', 'success');
    } catch (error) {
        console.error('Export error:', error);
        window.showToast('❌ Export failed', 'error');
    }
});

document.getElementById('exportOrderPDF')?.addEventListener('click', async () => {
    try {
        const snapshot = await get(ref(db, 'Orders/'));
        if (!snapshot.exists()) {
            alert('No data to export');
            return;
        }
        const data = snapshot.val();
        const tableData = [['カタログ名', '注文数量', '依頼者', 'メッセージ', '注文日']];
        for (const entry of Object.values(data)) {
            tableData.push([
                entry.CatalogName,
                entry.OrderQuantity,
                entry.Requester,
                entry.Message,
                entry.OrderDate
            ]);
        }
        exportToPDF('orders-export.pdf', 'Orders Report', tableData);
        window.showToast('✅ Orders exported to PDF', 'success');
    } catch (error) {
        console.error('Export error:', error);
        window.showToast('❌ Export failed', 'error');
    }
});

// Export Audit Log
document.getElementById('exportAuditCSV')?.addEventListener('click', async () => {
    try {
        const snapshot = await get(ref(db, 'AuditLog/'));
        if (!snapshot.exists()) {
            window.showToast('No audit data to export', 'warning');
            return;
        }
        const data = snapshot.val();
        const logs = [];
        Object.values(data).forEach(log => logs.push(log));
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const tableData = [['Timestamp', 'Action', 'Details', 'User']];
        logs.forEach(log => {
            tableData.push([
                new Date(log.timestamp).toLocaleString('ja-JP'),
                log.action,
                log.details,
                log.userId
            ]);
        });
        exportToCSV('audit-log.csv', tableData);
        window.showToast('✅ Audit log exported', 'success');
    } catch (error) {
        console.error('Export error:', error);
        window.showToast('❌ Export failed', 'error');
    }
});

// Export Movement History
document.getElementById('exportMovementCSV')?.addEventListener('click', async () => {
    try {
        const snapshot = await get(ref(db, 'MovementHistory/'));
        if (!snapshot.exists()) {
            window.showToast('No movement data to export', 'warning');
            return;
        }
        const data = snapshot.val();
        const movements = [];
        Object.values(data).forEach(m => movements.push(m));
        movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const tableData = [['Timestamp', 'Item', 'Old Stock', 'New Stock', 'Change', 'Action']];
        movements.forEach(m => {
            tableData.push([
                new Date(m.timestamp).toLocaleString('ja-JP'),
                m.catalogName,
                m.oldStock,
                m.newStock,
                m.change,
                m.action
            ]);
        });
        exportToCSV('movement-history.csv', tableData);
        window.showToast('✅ Movement history exported', 'success');
    } catch (error) {
        console.error('Export error:', error);
        window.showToast('❌ Export failed', 'error');
    }
});

document.getElementById('generateSampleCatalogBtn').addEventListener('click', () => {
    const destinations = ["東京工場", "大阪工場", "名古屋工場"];
    const departments = ["IT部", "営業部", "企画部"];
    const requesters = ["田中", "佐藤", "鈴木"];
    const addresses = ["東京都港区", "大阪府大阪市", "愛知県名古屋市"];
    let count = 0;
    
    Object.keys(CatalogDB).slice(0, 5).forEach((catKey, i) => {
        const catName = CatalogDB[catKey]?.name || catKey;
        for (let j = 0; j < 3; j++) {
            const baseDate = new Date(2025, 5, 1 + j);
            const entry = {
                CatalogName: catName,
                ReceiptDate: baseDate.toISOString().slice(0, 10),
                QuantityReceived: Math.floor(Math.random() * 100) + 10,
                DeliveryDate: new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                IssueQuantity: Math.floor(Math.random() * 50),
                StockQuantity: 50,
                DistributionDestination: destinations[i % destinations.length],
                RequesterDepartment: departments[i % departments.length],
                Requester: requesters[i % requesters.length],
                RequesterAddress: addresses[i % addresses.length],
                Remarks: j === 0 ? "初回入庫" : ""
            };
            set(ref(db, "Catalogs/" + catName + "_" + j + "_" + Date.now()), entry);
            count++;
        }
    });
    alert('サンプルデータ(' + count + '件)を生成しました');
    renderCatalogTablesAccordion();
    updateKPIs();
});

document.getElementById('generateSampleOrderBtn').addEventListener('click', () => {
    const departments = ["IT部", "営業部", "企画部"];
    const requesters = ["田中", "佐藤", "鈴木"];
    const addresses = ["東京都港区", "大阪府大阪市", "愛知県名古屋市"];
    const now = Date.now();
    Object.keys(CatalogDB).slice(0, 5).forEach((catKey, i) => {
        const catName = CatalogDB[catKey]?.name || catKey;
        for (let j = 0; j < 2; j++) {
            const order = {
                CatalogName: catName,
                OrderQuantity: Math.floor(Math.random() * 50) + 1,
                RequesterDepartment: departments[i % departments.length],
                Requester: requesters[i % requesters.length],
                RequesterAddress: addresses[i % addresses.length],
                Message: `注文 ${i + 1}`,
                OrderDate: '2025-07-01',
                CreatedAt: new Date().toISOString(),
                Fulfilled: false
            };
            set(ref(db, "Orders/" + catName + "_" + (now + i + j)), order);
        }
    });
    alert('サンプル注文データを生成しました');
    renderOrderTablesAccordion();
});

// ===== CALENDAR =====
function initializeCalendar() {
    const calendarEl = document.getElementById('stockCalendarContent');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { 
            left: 'prev,next today', 
            center: 'title', 
            right: 'dayGridMonth,timeGridWeek,timeGridDay' 
        },
        height: 'auto',
        contentHeight: 'auto',
        eventMaxStack: 1,
        dayMaxEvents: 1,
        dayMaxEventRows: 1,
        expandRows: false,
        moreLinkClick: 'day',
        moreLinkContent: function(args) {
            return `+${args.num}件`;
        },
        eventContent: function(arg) {
            const title = arg.event.title || '';
            const issueQty = arg.event.extendedProps?.issueQuantity;
            const qtyText = issueQty ? ` (${issueQty})` : '';
            return { html: `<div class="calendar-compact-event">${title}${qtyText}</div>` };
        },
        events: function(info, successCallback) {
            const catalogRef = ref(db, 'Catalogs/');
            onValue(catalogRef, (snapshot) => {
                const events = [];
                if (snapshot.exists()) {
                    Object.values(snapshot.val()).forEach(entry => {
                        events.push({
                            title: entry.CatalogName,
                            start: entry.DeliveryDate,
                            backgroundColor: '#232946',
                            borderColor: '#232946',
                            textColor: '#ffffff',
                            extendedProps: {
                                catalogName: entry.CatalogName,
                                receiptDate: entry.ReceiptDate,
                                quantityReceived: entry.QuantityReceived,
                                deliveryDate: entry.DeliveryDate,
                                issueQuantity: entry.IssueQuantity,
                                stock: entry.StockQuantity,
                                distributionDestination: entry.DistributionDestination,
                                requesterDepartment: entry.RequesterDepartment,
                                requester: entry.Requester,
                                requesterAddress: entry.RequesterAddress,
                                remarks: entry.Remarks || 'N/A'
                            }
                        });
                    });
                }
                successCallback(events);
            });
        },
        eventClick: function(info) {
            showCalendarEventModal(info.event);
        },
        eventDidMount: function(info) {
            // Add custom styling to event elements
            info.el.style.cursor = 'pointer';
            info.el.classList.add('calendar-event-professional');
        }
    });
    calendar.render();
    
    // Add custom styling for the calendar container
    const calendarContainer = document.getElementById('stockCalendarContent');
    if (calendarContainer) {
        calendarContainer.style.borderRadius = '8px';
        calendarContainer.style.overflow = 'hidden';
        calendarContainer.style.boxShadow = '0 4px 12px rgba(35, 41, 70, 0.1)';
    }
}

function showCalendarEventModal(event) {
    const modal = document.getElementById('calendarEventModal');
    const props = event.extendedProps;
    
    document.getElementById('eventModalTitle').textContent = props.catalogName || 'Event Details';
    document.getElementById('eventCatalogName').textContent = props.catalogName || '--';
    document.getElementById('eventReceiptDate').textContent = props.receiptDate || '--';
    document.getElementById('eventQuantityReceived').textContent = props.quantityReceived || '--';
    document.getElementById('eventDeliveryDate').textContent = props.deliveryDate || '--';
    document.getElementById('eventIssueQuantity').textContent = props.issueQuantity || '--';
    document.getElementById('eventStockQty').textContent = props.stock || '--';
    document.getElementById('eventDistributionDestination').textContent = props.distributionDestination || '--';
    document.getElementById('eventRequesterDepartment').textContent = props.requesterDepartment || '--';
    document.getElementById('eventRequester').textContent = props.requester || '--';
    document.getElementById('eventRequesterAddress').textContent = props.requesterAddress || '--';
    document.getElementById('eventRemarks').textContent = props.remarks || '--';
    
    modal.style.display = 'flex';
}

function closeCalendarEventModal() {
    const modal = document.getElementById('calendarEventModal');
    modal.style.display = 'none';
}

// ===== ANALYTICS =====
let analyticsSettings = {
    globalLowStockThreshold: 10,
    globalHighStockThreshold: 100,
    globalFastMovingDefinition: 50,
    perItemOverrides: {}
};

async function loadAnalyticsSettings() {
    try {
        const settingsRef = ref(db, 'Settings/Analytics/');
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            analyticsSettings = snapshot.val();
        }
    } catch (error) {
        console.log('Analytics settings not yet configured');
    }
}

// Setup real-time listener for analytics settings changes
function setupAnalyticsSettingsListener() {
    const settingsRef = ref(db, 'Settings/Analytics/');
    onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            analyticsSettings = snapshot.val();
            console.log('[ANALYTICS] Settings updated in real-time');
            
            // Auto-refresh analytics if tab is visible
            const analyticsTab = document.getElementById('tab-analytics');
            if (analyticsTab && analyticsTab.style.display !== 'none') {
                console.log('[ANALYTICS] Auto-refreshing due to settings change');
                fetchAndRenderAnalytics();
            }
        }
    }, (error) => {
        console.error('[ANALYTICS] Error listening to settings:', error);
    });
}

function getItemThreshold(catalogName, thresholdType) {
    const override = analyticsSettings.perItemOverrides?.[catalogName];
    if (thresholdType === 'low') {
        return override?.lowStock !== null && override?.lowStock !== undefined ? override.lowStock : analyticsSettings.globalLowStockThreshold;
    }
    return override?.highStock !== null && override?.highStock !== undefined ? override.highStock : analyticsSettings.globalHighStockThreshold;
}

const ANALYTICS_CARDS = [
    // **CATALOG-BASED ANALYTICS** (most important)
    { key: 'stockByItem', label: 'カタログ別在庫', icon: 'fa-layer-group', category: 'catalog', width: '2' },
    { key: 'ordersByItem', label: 'カタログ別注文', icon: 'fa-list-ol', category: 'catalog', width: '2' },
    { key: 'catalogComparison', label: 'カタログ比較 (在庫vs注文)', icon: 'fa-object-group', category: 'catalog', width: '2' },
    
    // **TIME-BASED ANALYTICS**
    { key: 'stockTrend', label: '在庫トレンド', icon: 'fa-chart-line', category: 'timebased', width: '2' },
    { key: 'orderTrend', label: '注文トレンド', icon: 'fa-chart-area', category: 'timebased', width: '2' },
    { key: 'dailyActivity', label: '日次活動', icon: 'fa-calendar-days', category: 'timebased', width: '2' },
    
    // **THRESHOLD & ALERTS**
    { key: 'lowStockItems', label: '在庫不足アイテム (< 閾値)', icon: 'fa-triangle-exclamation', category: 'alerts', width: '1' },
    { key: 'fastMovingItems', label: '販売数の多いアイテム (> 閾値)', icon: 'fa-arrow-trend-up', category: 'alerts', width: '1' },
    
    // **DISTRIBUTION & REQUESTER**
    { key: 'requesterRankings', label: 'トップリクエスター', icon: 'fa-ranking-star', category: 'requesters', width: '1' },
    { key: 'distributionAnalysis', label: '配分先分析', icon: 'fa-pie-chart', category: 'distribution', width: '1' },
];

function getAnalyticsSelection() {
    const stored = localStorage.getItem('analyticsSelection');
    const defaultSelection = ANALYTICS_CARDS.map(c => c.key);
    
    if (!stored) {
        return defaultSelection;
    }
    
    // Parse stored selection and filter to only include cards that exist
    try {
        const parsed = JSON.parse(stored);
        const validKeys = ANALYTICS_CARDS.map(c => c.key);
        return parsed.filter(key => validKeys.includes(key));
    } catch {
        return defaultSelection;
    }
}

// Store Orders data globally for analytics
let OrdersData = {};

function fetchAndRenderAnalytics() {
    // Use CatalogDB for catalog data (already has real-time sync)
    const catalogData = {};
    Object.values(CatalogDB).forEach(catalogInfo => {
        if (catalogInfo.entries) {
            Object.entries(catalogInfo.entries).forEach(([key, entry]) => {
                catalogData[key] = {
                    ...entry,
                    CatalogName: catalogInfo.name,
                    StockQuantity: entry.StockQuantity || catalogInfo.stock || 0
                };
            });
        }
    });
    
    // Use OrdersData for orders (synced by listener)
    const orderData = OrdersData;
    
    // Get date range from UI
    const preset = document.getElementById('analyticsDatePreset')?.value;
    let dateFrom = null;
    let dateTo = null;
    
    if (preset === 'custom') {
        dateFrom = document.getElementById('analyticsDateStart')?.value;
        dateTo = document.getElementById('analyticsDateEnd')?.value;
    } else if (preset) {
        const days = parseInt(preset);
        dateTo = new Date();
        dateFrom = new Date(dateTo);
        dateFrom.setDate(dateFrom.getDate() - days);
        // Format to YYYY-MM-DD
        dateFrom = dateFrom.toISOString().split('T')[0];
        dateTo = dateTo.toISOString().split('T')[0];
    }
    
    console.log('Analytics date range:', { dateFrom, dateTo });
    console.log('Analytics using CatalogDB entries:', Object.keys(catalogData).length);
    console.log('Analytics using Orders:', Object.keys(orderData).length);
    renderAnalyticsDashboard(catalogData, orderData, dateFrom, dateTo);
}

// Setup real-time listener for Orders data
function setupOrdersListenerForAnalytics() {
    const ordersRef = ref(db, 'Orders/');
    onValue(ordersRef, (snapshot) => {
        OrdersData = snapshot.exists() ? snapshot.val() : {};
        console.log('[ANALYTICS] Orders data updated:', Object.keys(OrdersData).length);
        
        // Auto-refresh analytics if tab is visible
        const analyticsTab = document.getElementById('tab-analytics');
        if (analyticsTab && analyticsTab.style.display !== 'none') {
            console.log('[ANALYTICS] Auto-refreshing due to Orders change');
            fetchAndRenderAnalytics();
        }
    }, (error) => {
        console.error('[ANALYTICS] Error listening to Orders:', error);
    });
}

// Setup listener for CatalogDB changes to refresh analytics
function setupCatalogDBListenerForAnalytics() {
    const catalogsRef = ref(db, 'Catalogs/');
    onValue(catalogsRef, (snapshot) => {
        console.log('[ANALYTICS] Catalogs changed, CatalogDB will be updated by main listener');
        
        // Auto-refresh analytics if tab is visible
        const analyticsTab = document.getElementById('tab-analytics');
        if (analyticsTab && analyticsTab.style.display !== 'none') {
            console.log('[ANALYTICS] Auto-refreshing due to Catalogs change');
            // Small delay to ensure CatalogDB is updated
            setTimeout(() => {
                fetchAndRenderAnalytics();
            }, 100);
        }
    }, (error) => {
        console.error('[ANALYTICS] Error listening to Catalogs:', error);
    });
}

function renderAnalyticsDashboard(catalogData, orderData, dateFrom = null, dateTo = null) {
    const selection = getAnalyticsSelection();
    const container = document.getElementById('analyticsCards');
    container.innerHTML = '';
    
    // Build container HTML with proper grid layout
    let gridHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; padding: 20px;">';
    
    ANALYTICS_CARDS.forEach(card => {
        if (selection.includes(card.key)) {
            // Determine column span based on card width (1 = 1 col, 2 = 2 cols)
            const colSpan = card.width === '2' ? 2 : 1;
            const style = colSpan === 2 ? 'style="grid-column: span 2;"' : '';
            
            gridHTML += `
                <div class="glass-card analytics-card" ${style}>
                    <div class="analytics-card-header">
                        <h3><i class="fa-solid ${card.icon}"></i> ${card.label}</h3>
                    </div>
                    <div id="analytics-${card.key}" class="analytics-card-content"></div>
                </div>
            `;
        }
    });
    
    gridHTML += '</div>';
    container.innerHTML = gridHTML;
    
    // Render each selected card
    ANALYTICS_CARDS.forEach(card => {
        if (selection.includes(card.key)) {
            // Dispatch rendering based on card type
            try {
                if (card.key === 'stockByItem') {
                    renderStockByItem(catalogData);
                } else if (card.key === 'ordersByItem') {
                    renderOrdersByItem(orderData);
                } else if (card.key === 'catalogComparison') {
                    renderCatalogComparison(catalogData, orderData);
                } else if (card.key === 'stockTrend') {
                    renderStockTrend(catalogData, orderData, dateFrom, dateTo);
                } else if (card.key === 'orderTrend') {
                    renderOrderTrend(orderData, dateFrom, dateTo);
                } else if (card.key === 'dailyActivity') {
                    renderDailyActivity(orderData, dateFrom, dateTo);
                } else if (card.key === 'lowStockItems') {
                    renderLowStockItems(catalogData);
                } else if (card.key === 'fastMovingItems') {
                    renderFastMovingItems(orderData, dateFrom, dateTo);
                } else if (card.key === 'requesterRankings') {
                    renderRequesterRankings(orderData, dateFrom, dateTo);
                } else if (card.key === 'distributionAnalysis') {
                    renderDistributionAnalysis(catalogData);
                }
            } catch (err) {
                console.error(`Error rendering ${card.key}:`, err);
                const container = document.getElementById(`analytics-${card.key}`);
                if (container) {
                    container.innerHTML = '<div style="padding:20px;color:#e74c3c;">エラーが発生しました</div>';
                }
            }
        }
    });
}

// Stock by Item - Horizontal bar chart
function renderStockByItem(catalogData) {
    const byItem = {};
    let totalStock = 0;
    
    Object.values(catalogData).forEach(e => {
        const stock = Number(e.StockQuantity || 0);
        byItem[e.CatalogName] = (byItem[e.CatalogName] || 0) + stock;
        totalStock += stock;
    });
    
    const container = document.getElementById('analytics-stockByItem');
    
    if (Object.keys(byItem).length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">カタログデータがありません</div>';
        return;
    }
    
    const sorted = Object.entries(byItem)
        .map(([name, qty]) => ({ name, quantity: qty }))
        .sort((a, b) => b.quantity - a.quantity);
    
    const ctxId = 'stockByItem-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    container.style.position = 'relative';
    container.style.height = '300px';
    
    if (window.stockByItemChart) window.stockByItemChart.destroy();
    
    window.stockByItemChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: sorted.map(item => item.name),
            datasets: [{
                label: '在庫数量',
                data: sorted.map(item => item.quantity),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: {
                        afterLabel: function(context) {
                            const total = sorted.reduce((sum, item) => sum + item.quantity, 0);
                            const percent = ((context.parsed.x / total) * 100).toFixed(1);
                            return `(${percent}%)`;
                        }
                    }
                }
            },
            scales: { x: { beginAtZero: true } }
        }
    });
}

// Orders by Item - Vertical bar chart
function renderOrdersByItem(orderData) {
    const byItem = {};
    Object.values(orderData).forEach(e => { 
        byItem[e.CatalogName] = (byItem[e.CatalogName] || 0) + 1; 
    });
    
    const container = document.getElementById('analytics-ordersByItem');
    
    if (Object.keys(byItem).length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">注文データがありません</div>';
        return;
    }
    
    const sorted = Object.entries(byItem)
        .map(([name, cnt]) => ({ name, count: cnt }))
        .sort((a, b) => b.count - a.count);
    
    const ctxId = 'ordersByItem-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    container.style.position = 'relative';
    container.style.height = '300px';
    
    if (window.ordersByItemChart) window.ordersByItemChart.destroy();
    
    window.ordersByItemChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: sorted.map(item => item.name),
            datasets: [{
                label: '注文数',
                data: sorted.map(item => item.count),
                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                borderColor: 'rgb(153, 102, 255)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Catalog Comparison - Stock vs Orders side by side
function renderCatalogComparison(catalogData, orderData) {
    const catalogStock = {};
    const catalogOrders = {};
    
    Object.values(catalogData).forEach(item => {
        const stock = Number(item.StockQuantity || 0);
        catalogStock[item.CatalogName] = (catalogStock[item.CatalogName] || 0) + stock;
    });
    
    Object.values(orderData).forEach(order => {
        catalogOrders[order.CatalogName] = (catalogOrders[order.CatalogName] || 0) + 1;
    });
    
    const allCatalogs = new Set([...Object.keys(catalogStock), ...Object.keys(catalogOrders)]);
    const labels = Array.from(allCatalogs).sort();
    
    const container = document.getElementById('analytics-catalogComparison');
    
    if (labels.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">データがありません</div>';
        return;
    }
    
    const ctxId = 'catalogComparison-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    container.style.position = 'relative';
    container.style.height = '300px';
    
    if (window.catalogComparisonChart) window.catalogComparisonChart.destroy();
    
    window.catalogComparisonChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '在庫数量',
                    data: labels.map(cat => catalogStock[cat] || 0),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 1
                },
                {
                    label: '注文数',
                    data: labels.map(cat => catalogOrders[cat] || 0),
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    borderColor: 'rgb(153, 102, 255)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'top' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Low Stock Items - Shows items below threshold
function renderLowStockItems(catalogData) {
    const container = document.getElementById('analytics-lowStockItems');
    
    const lowStockItems = [];
    Object.values(catalogData).forEach(item => {
        const itemThreshold = getItemThreshold(item.CatalogName, 'low');
        const currentStock = Number(item.StockQuantity || 0);
        if (currentStock < itemThreshold) {
            lowStockItems.push({
                name: item.CatalogName,
                current: currentStock,
                threshold: itemThreshold,
                percentage: Math.round((currentStock / itemThreshold) * 100)
            });
        }
    });
    
    lowStockItems.sort((a, b) => a.percentage - b.percentage);
    
    if (lowStockItems.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">✓ すべてのアイテムが十分な在庫を持っています</div>';
        return;
    }
    
    let html = '<div style="max-height:400px;overflow-y:auto;">';
    lowStockItems.forEach(item => {
        const bgColor = item.percentage < 25 ? '#fff3cd' : '#f8f9fa';
        const borderColor = item.percentage < 25 ? '#f08c00' : '#dc3545';
        const statusIcon = item.percentage < 25 ? '🔴 緊急' : '⚠️ 警告';
        html += `
            <div style="padding:12px;margin-bottom:8px;background:${bgColor};border-left:4px solid ${borderColor};border-radius:4px;">
                <div style="font-weight:600;margin-bottom:4px;">${item.name} ${statusIcon}</div>
                <div style="font-size:0.9rem;color:#666;">現在: ${item.current} / 閾値: ${item.threshold}</div>
                <div style="margin-top:6px;background:#ddd;height:8px;border-radius:4px;overflow:hidden;">
                    <div style="background:${borderColor};height:100%;width:${item.percentage}%;transition:width 0.3s;"></div>
                </div>
                <div style="font-size:0.85rem;margin-top:4px;color:#666;text-align:right;">${item.percentage}%</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Fast Moving Items - Shows items with high demand in last 30 days
function renderFastMovingItems(orderData, dateFrom = null, dateTo = null) {
    const fastMovingDefinition = analyticsSettings.globalFastMovingDefinition;
    
    // Use custom date range if provided, otherwise use 30 days
    let rangeStart, rangeEnd;
    if (dateFrom && dateTo) {
        rangeStart = new Date(dateFrom);
        rangeEnd = new Date(dateTo);
        rangeEnd.setHours(23, 59, 59, 999);
    } else {
        rangeEnd = new Date();
        rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() - 30);
    }
    
    const itemDemand = {};
    Object.values(orderData).forEach(order => {
        const orderDate = new Date(order.OrderDate || new Date());
        if (orderDate >= rangeStart && orderDate <= rangeEnd) {
            const catalogName = order.CatalogName;
            itemDemand[catalogName] = (itemDemand[catalogName] || 0) + Number(order.OrderQuantity || 0);
        }
    });
    
    const fastMoving = Object.entries(itemDemand)
        .filter(([name, qty]) => qty >= fastMovingDefinition)
        .map(([name, qty]) => ({ name, quantity: qty }))
        .sort((a, b) => b.quantity - a.quantity);
    
    const container = document.getElementById('analytics-fastMovingItems');
    
    if (fastMoving.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">選択期間で販売数が多いアイテムはありません</div>';
        return;
    }
    
    const ctxId = 'fastMoving-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    if (window.fastMovingChart) window.fastMovingChart.destroy();
    
    window.fastMovingChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: fastMoving.map(item => item.name),
            datasets: [{
                label: '過去30日間の注文数',
                data: fastMoving.map(item => item.quantity),
                backgroundColor: 'rgba(34, 197, 94, 0.6)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

// Stock Trend - Shows inventory changes over time
function renderStockTrend(catalogData, orderData, dateFrom = null, dateTo = null) {
    const container = document.getElementById('analytics-stockTrend');
    
    // Determine date range
    let startDate, endDate;
    if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
    } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Calculate daily stock levels for the date range
    const dailyStock = {};
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = daysDiff; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        let totalStock = 0;
        Object.values(catalogData).forEach(item => {
            totalStock += Number(item.StockQuantity || 0);
        });
        
        // Adjust for orders before this date (approximation)
        Object.values(orderData).forEach(order => {
            const orderDate = new Date(order.OrderDate || endDate);
            if (orderDate < date) {
                totalStock += Number(order.OrderQuantity || 0);
            }
        });
        
        dailyStock[dateStr] = totalStock;
    }
    
    const dates = Object.keys(dailyStock);
    const stocks = Object.values(dailyStock);
    
    const ctxId = 'stockTrend-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    if (window.stockTrendChart) window.stockTrendChart.destroy();
    
    window.stockTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })),
            datasets: [{
                label: '総在庫数',
                data: stocks,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Requester Rankings - Shows top requesters
function renderRequesterRankings(orderData, dateFrom = null, dateTo = null) {
    // Determine date range
    let startDate, endDate;
    if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
    } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    
    const requesterCount = {};
    Object.values(orderData).forEach(order => {
        const orderDate = new Date(order.OrderDate || new Date());
        if (orderDate >= startDate && orderDate <= endDate) {
            const requester = order.Requester || '未指定';
            requesterCount[requester] = (requesterCount[requester] || 0) + 1;
        }
    });
    
    const rankings = Object.entries(requesterCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    const container = document.getElementById('analytics-requesterRankings');
    
    if (rankings.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">注文データがありません</div>';
        return;
    }
    
    const ctxId = 'requester-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    if (window.requesterChart) window.requesterChart.destroy();
    
    const colors = ['#f87171', '#fb923c', '#facc15', '#86efac', '#67e8f9', '#60a5fa', '#a78bfa'];
    
    window.requesterChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: rankings.map(r => r.name),
            datasets: [{
                data: rankings.map(r => r.count),
                backgroundColor: rankings.map((_, i) => colors[i % colors.length])
            }]
        },
        options: {
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

// Distribution Analysis - Shows where stock is distributed
function renderDistributionAnalysis(catalogData) {
    const distributionMap = {};
    Object.values(catalogData).forEach(item => {
        const destination = item.DistributionDestination || '未指定';
        distributionMap[destination] = (distributionMap[destination] || 0) + Number(item.StockQuantity || 0);
    });
    
    const container = document.getElementById('analytics-distributionAnalysis');
    
    if (Object.keys(distributionMap).length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">配分データがありません</div>';
        return;
    }
    
    const ctxId = 'distribution-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    if (window.distributionChart) window.distributionChart.destroy();
    
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#74b9ff'];
    
    window.distributionChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: Object.keys(distributionMap),
            datasets: [{
                data: Object.values(distributionMap),
                backgroundColor: Object.keys(distributionMap).map((_, i) => colors[i % colors.length])
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Order Trend - Shows order count changes over time
function renderOrderTrend(orderData, dateFrom = null, dateTo = null) {
    const container = document.getElementById('analytics-orderTrend');
    
    // Determine date range
    let startDate, endDate;
    if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
    } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Calculate daily order counts
    const dailyOrders = {};
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = daysDiff; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyOrders[dateStr] = 0;
    }
    
    Object.values(orderData).forEach(order => {
        const orderDate = new Date(order.OrderDate || new Date());
        if (orderDate >= startDate && orderDate <= endDate) {
            const dateStr = orderDate.toISOString().split('T')[0];
            if (dailyOrders.hasOwnProperty(dateStr)) {
                dailyOrders[dateStr]++;
            }
        }
    });
    
    const dates = Object.keys(dailyOrders).sort();
    const counts = dates.map(d => dailyOrders[d]);
    
    const ctxId = 'orderTrend-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    container.style.position = 'relative';
    container.style.height = '300px';
    
    if (window.orderTrendChart) window.orderTrendChart.destroy();
    
    window.orderTrendChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })),
            datasets: [{
                label: '日次注文数',
                data: counts,
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'rgb(139, 92, 246)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

// Daily Activity - Shows order quantity and count per day
function renderDailyActivity(orderData, dateFrom = null, dateTo = null) {
    const container = document.getElementById('analytics-dailyActivity');
    
    // Determine date range
    let startDate, endDate;
    if (dateFrom && dateTo) {
        startDate = new Date(dateFrom);
        endDate = new Date(dateTo);
    } else {
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Aggregate by date
    const dailyActivity = {};
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = daysDiff; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyActivity[dateStr] = { orders: 0, quantity: 0 };
    }
    
    Object.values(orderData).forEach(order => {
        const orderDate = new Date(order.OrderDate || new Date());
        if (orderDate >= startDate && orderDate <= endDate) {
            const dateStr = orderDate.toISOString().split('T')[0];
            if (dailyActivity.hasOwnProperty(dateStr)) {
                dailyActivity[dateStr].orders++;
                dailyActivity[dateStr].quantity += Number(order.OrderQuantity || 0);
            }
        }
    });
    
    const dates = Object.keys(dailyActivity).sort();
    
    const ctxId = 'dailyActivity-chart';
    let canvas = document.getElementById(ctxId);
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = ctxId;
        container.appendChild(canvas);
    }
    container.style.position = 'relative';
    container.style.height = '300px';
    
    if (window.dailyActivityChart) window.dailyActivityChart.destroy();
    
    window.dailyActivityChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: dates.map(d => new Date(d).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })),
            datasets: [
                {
                    label: '注文数',
                    data: dates.map(d => dailyActivity[d].orders),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: '注文数量',
                    data: dates.map(d => dailyActivity[d].quantity),
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: {
                y: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: '注文数' } },
                y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, title: { display: true, text: '注文数量' }, grid: { drawOnChartArea: false } }
            }
        }
    });
}

// Analytics customization modal
document.getElementById('analyticsCustomizeForm').innerHTML = ANALYTICS_CARDS.map(card =>
    `<div class="form-check">
        <input class="form-check-input" type="checkbox" value="${card.key}" id="chk${card.key}">
        <label class="form-check-label" for="chk${card.key}">${card.label}</label>
    </div>`
).join('');

document.getElementById('customizeAnalyticsBtn').addEventListener('click', () => {
    const selection = getAnalyticsSelection();
    document.querySelectorAll('#analyticsCustomizeForm input').forEach(chk => {
        chk.checked = selection.includes(chk.value);
    });
    $('#analyticsCustomizeModal').modal('show');
});

document.getElementById('saveAnalyticsCustomize').addEventListener('click', () => {
    const selected = [];
    document.querySelectorAll('#analyticsCustomizeForm input:checked').forEach(chk => {
        selected.push(chk.value);
    });
    if (selected.length === 0) {
        alert('少なくとも1つ選択してください');
        return;
    }
    localStorage.setItem('analyticsSelection', JSON.stringify(selected));
    $('#analyticsCustomizeModal').modal('hide');
    fetchAndRenderAnalytics();
});

// Date range filter
document.getElementById('analyticsDatePreset').addEventListener('change', function() {
    if (this.value === 'custom') {
        document.getElementById('analyticsDateStart').style.display = 'block';
        document.getElementById('analyticsDateEnd').style.display = 'block';
        document.getElementById('analyticsDateDash').style.display = 'block';
    } else {
        document.getElementById('analyticsDateStart').style.display = 'none';
        document.getElementById('analyticsDateEnd').style.display = 'none';
        document.getElementById('analyticsDateDash').style.display = 'none';
        fetchAndRenderAnalytics();
    }
});

// Add handlers for custom analytics date range
document.getElementById('analyticsDateStart')?.addEventListener('change', fetchAndRenderAnalytics);
document.getElementById('analyticsDateEnd')?.addEventListener('change', fetchAndRenderAnalytics);

// ===== MOBILE HAMBURGER TOGGLE =====
function initMobileToggle() {
    const toggle = document.getElementById('hamburgerToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    });
    
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    });
}

// ===== LANGUAGE SWITCHING =====
function initLanguageToggle() {
    console.log('Initializing language toggle...');
    const langJABtn = document.getElementById('langJA');
    const langENBtn = document.getElementById('langEN');
    
    if (!langJABtn || !langENBtn) {
        console.error('Language buttons not found in DOM');
        return;
    }
    
    console.log('Language buttons found, setting up listeners');
    
    // Set initial active button
    updateLanguageButtonState();
    
    langJABtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Japanese button clicked');
        i18n.setLanguage('ja');
        updateLanguageButtonState();
        updateUILanguage();
    });
    
    langENBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('English button clicked');
        i18n.setLanguage('en');
        updateLanguageButtonState();
        updateUILanguage();
    });
    
    console.log('Language toggle initialized');
}

function updateLanguageButtonState() {
    const lang = i18n.getLanguage();
    const langJABtn = document.getElementById('langJA');
    const langENBtn = document.getElementById('langEN');
    
    if (!langJABtn || !langENBtn) return;
    
    if (lang === 'ja') {
        langJABtn.style.backgroundColor = '#2563eb';
        langJABtn.style.color = 'white';
        langENBtn.style.backgroundColor = 'transparent';
        langENBtn.style.color = '#64748b';
    } else {
        langENBtn.style.backgroundColor = '#2563eb';
        langENBtn.style.color = 'white';
        langJABtn.style.backgroundColor = 'transparent';
        langJABtn.style.color = '#64748b';
    }
}

function updateUILanguage() {
    console.log('Updating UI language to:', i18n.getLanguage());
    
    // Update sidebar buttons with icons
    const sidebarBtns = document.querySelectorAll('.sidebar-nav-btn:not(.topnav-btn)');
    const btnKeys = ['sidebar.manage', 'sidebar.order', 'sidebar.entries', 'sidebar.orders', 
                     'sidebar.calendar', 'sidebar.history', 'sidebar.audit', 'sidebar.analytics', 'sidebar.admin'];
    
    sidebarBtns.forEach((btn, idx) => {
        if (btnKeys[idx]) {
            const icon = btn.querySelector('i');
            if (icon) {
                btn.innerHTML = icon.outerHTML + ' ' + i18n.t(btnKeys[idx]);
            } else {
                btn.textContent = i18n.t(btnKeys[idx]);
            }
        }
    });
    
    // Update top navigation buttons
    const topNavBtns = document.querySelectorAll('.topnav-btn');
    const topBtnTranslations = {
        'manageCatalog': 'section.manage_catalog',
        'placeOrder': 'section.place_order',
        'catalogEntries': 'section.catalog_entries',
        'orderEntries': 'section.order_entries',
        'stockCalendar': 'section.calendar',
        'auditLog': 'section.audit',
        'movementHistory': 'section.history',
        'analytics': 'section.analytics',
        'adminPanel': 'section.admin',
    };
    
    topNavBtns.forEach((btn) => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId && topBtnTranslations[tabId]) {
            btn.textContent = i18n.t(topBtnTranslations[tabId]);
        }
    });
    
    // Update section titles
    const sectionUpdates = {
        'tab-manageCatalog': 'section.manage_catalog',
        'tab-placeOrder': 'section.place_order',
        'tab-catalogEntries': 'section.catalog_entries',
        'tab-orderEntries': 'section.order_entries',
        'tab-stockCalendar': 'section.calendar',
        'tab-movementHistory': 'section.history',
        'tab-auditLog': 'section.audit',
        'tab-analytics': 'section.analytics',
        'tab-adminPanel': 'section.admin',
    };
    
    for (const [tabId, key] of Object.entries(sectionUpdates)) {
        const tab = document.getElementById(tabId);
        if (tab) {
            const h2 = tab.querySelector('h2');
            if (h2) h2.textContent = i18n.t(key);
        }
    }
    
    // Update form labels
    const labelUpdates = {
        'CatalogName': 'form.catalog_name',
        'ReceiptDate': 'form.receipt_date',
        'QuantityReceived': 'form.quantity_received',
        'DeliveryDate': 'form.delivery_date',
        'IssueQuantity': 'form.issue_quantity',
        'StockQuantity': 'form.stock_quantity',
        'DistributionDestination': 'form.distribution',
        'Requester': 'form.requester',
        'Remarks': 'form.remarks',
    };
    
    for (const [fieldId, key] of Object.entries(labelUpdates)) {
        const label = document.querySelector(`label[for="${fieldId}"]`);
        if (label) label.textContent = i18n.t(key);
    }
    
    // Update order form labels
    const orderLabels = {
        'OrderCatalogName': 'order.catalog_name',
        'OrderQuantity': 'order.order_quantity',
        'Requester': 'form.requester',
        'OrderMessage': 'order.message',
    };
    
    for (const [fieldId, key] of Object.entries(orderLabels)) {
        const label = document.querySelector(`label[for="${fieldId}"]`);
        if (label) label.textContent = i18n.t(key);
    }
    
    // Update buttons
    const btnUpdates = {
        'Insbtn': 'btn.insert',
        'Updbtn': 'btn.update',
        'Delbtn': 'btn.delete',
        'orderbtn': 'btn.submit',
    };
    
    for (const [btnId, key] of Object.entries(btnUpdates)) {
        const btn = document.getElementById(btnId);
        if (btn) btn.textContent = i18n.t(key);
    }
    
    // Update select placeholders
    const catalogSelects = document.querySelectorAll('#CatalogName, #OrderCatalogName');
    catalogSelects.forEach(select => {
        const firstOption = select.querySelector('option[value=""]');
        if (firstOption) {
            firstOption.textContent = i18n.t('form.placeholder_select');
        }
    });
    
    // Update table headers dynamically when they're rendered
    setTimeout(() => {
        const tableHeaders = document.querySelectorAll('th');
        tableHeaders.forEach(th => {
            const text = th.textContent.trim();
            const keyMap = {
                'カタログ名': 'table.catalog_name',
                'Catalog Name': 'table.catalog_name',
                '納入日': 'table.delivery_date',
                'Delivery Date': 'table.delivery_date',
                '受領数量': 'table.quantity_received',
                'Received Qty': 'table.quantity_received',
                '出荷日': 'table.shipment_date',
                'Shipment Date': 'table.shipment_date',
                '発行数量': 'table.issue_quantity',
                'Issue Qty': 'table.issue_quantity',
                '在庫数量': 'table.stock_quantity',
                'Stock Qty': 'table.stock_quantity',
                '配布先': 'table.distribution',
                'Distribution': 'table.distribution',
                '依頼者': 'table.requester',
                'Requester': 'table.requester',
                '備考': 'table.remarks',
                'Remarks': 'table.remarks',
            };
            
            if (keyMap[text]) {
                th.textContent = i18n.t(keyMap[text]);
            }
        });
    }, 100);
}

// ===== INITIALIZE ON DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state before initializing app
    onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = 'login.html';
            return;
        }

        // Store current user globally
        currentUser = user;

        // Update last login timestamp
        await updateLastLogin(user.uid);

        // Fetch user permissions
        userPermissions = await getUserPermissions(user.uid);

        if (!userPermissions) {
            console.error('Failed to load user permissions');
            showNotification('Error loading permissions. Please refresh the page.', 'error');
            return;
        }

        // Small delay to ensure permissions are fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        // Filter tabs based on permissions
        await filterTabsByPermissions(userPermissions);

        // Display user info
        updateUserDisplay(user);

        // Initialize language toggle
        initLanguageToggle();
        
        // Apply current language to all UI elements
        updateUILanguage();

        // Load analytics settings
        await loadAnalyticsSettings();
        
        // Setup real-time listener for analytics settings
        setupAnalyticsSettingsListener();
        
        // Setup real-time listeners for analytics data
        setupOrdersListenerForAnalytics();
        setupCatalogDBListenerForAnalytics();

        // Load catalog names from Firebase
        await loadCatalogNamesFromFirebase();
        await enrichCatalogNamesAcrossApp();

        // Initialize notification system
        initNotificationSystem();
        
        // Initialize FCM for push notifications (when tab is closed)
        await initializeFCM(user);
        
        // Initialize app components
        initializeCatalogSelects();
        initTabSwitching();
        initCatalogForm();
        initOrderForm();
        initMobileToggle();
        initAdminPanel();
        setupCartWarning(); // Warn if leaving with cart items
        updateKPIs();
        setInterval(updateKPIs, 30000); // Update KPIs every 30 seconds
        
        // Wire calendar event modal close button
        const closeEventModalBtn = document.getElementById('closeEventModal');
        if (closeEventModalBtn) {
            closeEventModalBtn.addEventListener('click', closeCalendarEventModal);
        }
        
        // Close modal when clicking outside of it
        const calendarEventModal = document.getElementById('calendarEventModal');
        if (calendarEventModal) {
            calendarEventModal.addEventListener('click', (e) => {
                if (e.target === calendarEventModal) {
                    closeCalendarEventModal();
                }
            });
        }
        
        // Wire tab click events for audit log and movement history
        document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tab = this.getAttribute('data-tab');
                if (tab === 'auditLog') {
                    setTimeout(renderAuditLog, 100);
                } else if (tab === 'movementHistory') {
                    setTimeout(renderMovementHistory, 100);
                }
            });
        });

        // Setup logout handler
        setupLogoutHandler();

        console.log('✓ Application initialized | User:', user.email);
    });  
});

// ===== FILTER TABS BY PERMISSIONS =====
async function filterTabsByPermissions(permissions) {
    console.log('Filtering tabs with permissions:', permissions);
    
    const tabConfig = {
        'manageCatalog': { label: '登録', permission: 'manageCatalog', icon: '📦' },
        'placeOrder': { label: '注文', permission: 'placeOrder', icon: '📝' },
        'catalogEntries': { label: '台帳', permission: 'catalogEntries', icon: '📋' },
        'orderEntries': { label: '注文台帳', permission: 'orderEntries', icon: '📄' },
        'reports': { label: 'Reports', permission: 'reports', icon: '📊' },
        'stockCalendar': { label: 'カレンダー', permission: 'stockCalendar', icon: '📅' },
        'analytics': { label: '分析', permission: 'analytics', icon: '📈' },
        'adminPanel': { label: '設定', permission: 'userManagement', icon: '⚙️' },
        'movementHistory': { label: '履歴', permission: 'movementHistory', icon: '📜' },
        'auditLog': { label: '監査', permission: 'auditLog', icon: '📑' }
    };

    // Track accessibility for debugging
    const accessibleTabs = [];
    const lockedTabs = [];

    // Filter both sidebar and top nav buttons
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        const tabConfig_item = tabConfig[tabId];
        let hasReadAccess = false;
        let isLocked = false;
        let lockReason = '';

        if (tabConfig_item) {
            // Check permission normally for all tabs (including movementHistory and auditLog)
            if (permissions[tabConfig_item.permission]) {
                if (permissions[tabConfig_item.permission].read === true) {
                    hasReadAccess = true;
                } else {
                    isLocked = true;
                    lockReason = 'READ';
                }
            } else {
                isLocked = true;
                lockReason = 'READ';
            }
        } else {
            isLocked = true;
            lockReason = 'UNKNOWN';
        }

        if (hasReadAccess) {
            btn.style.display = 'block';
            btn.classList.remove('tab-locked');
            accessibleTabs.push(tabId);
        } else if (isLocked) {
            btn.style.display = 'block';
            btn.classList.add('tab-locked');
            btn.setAttribute('title', `🔒 Locked - You don't have READ access to this section`);
            lockedTabs.push(tabId);
            
            // Prevent navigation to locked tab
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showLockedTabMessage(tabId, tabConfig_item?.label || tabId, lockReason);
                return false;
            }, true);
        }
    });

    // Log access summary
    console.log(`📊 Tab Access Summary: ${accessibleTabs.length} accessible, ${lockedTabs.length} locked`);
    console.log(`   ✓ Accessible: ${accessibleTabs.join(', ')}`);
    console.log(`   🔒 Locked: ${lockedTabs.join(', ')}`);

    // Apply same locked state to topnav buttons
    document.querySelectorAll('.topnav-btn').forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        const tabConfig_item = tabConfig[tabId];
        let hasReadAccess = false;

        if (tabConfig_item) {
            // Check permission normally for all tabs
            if (permissions[tabConfig_item.permission] && permissions[tabConfig_item.permission].read === true) {
                hasReadAccess = true;
            }
        }

        if (hasReadAccess) {
            btn.classList.remove('tab-locked');
        } else {
            btn.classList.add('tab-locked');
            btn.setAttribute('title', `🔒 Locked - You don't have READ access to this section`);
        }
    });

    // Also apply locked state to topnav buttons
    document.querySelectorAll('.topnav-btn').forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        if (btn.classList.contains('tab-locked')) {
            // Prevent navigation to locked tab
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabConfig_item = tabConfig[tabId];
                const lockReason = 'READ';
                showLockedTabMessage(tabId, tabConfig_item?.label || tabId, lockReason);
                return false;
            }, true);
        }
    });

    // Auto-click Order (注文) tab on login if accessible, otherwise first accessible tab
    console.log('🔍 Looking for Order (注文) button to auto-click...');
    
    // Try to find placeOrder button specifically
    const placeOrderBtn = document.querySelector('.sidebar-nav-btn[data-tab="placeOrder"]:not(.tab-locked)');
    
    if (placeOrderBtn) {
        console.log('✅ Order button found and accessible - auto-clicking');
        setTimeout(() => {
            placeOrderBtn.click();
        }, 100);
    } else {
        console.log('⚠️ Order button not accessible, finding first accessible tab...');
        // Order page not accessible - find first accessible tab
        let firstVisibleBtn = null;
        const sidebarBtns = document.querySelectorAll('.sidebar-nav-btn:not(.nav-link-btn)');
        
        for (const btn of sidebarBtns) {
            if (!btn.classList.contains('tab-locked')) {
                firstVisibleBtn = btn;
                break;
            }
        }
        
        if (firstVisibleBtn) {
            const tabId = firstVisibleBtn.getAttribute('data-tab');
            console.log('✅ Activating first accessible tab:', tabId);
            firstVisibleBtn.click();  
        } else {
            // User has NO accessible tabs - show helpful message
            console.warn('❌ User has no accessible tabs');
            showNoAccessMessage();
        }
    }
}

// ===== SHOW NO ACCESS MESSAGE =====
function showNoAccessMessage() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
    `;

    // Create message box
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 40px;
        max-width: 450px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: slideUp 0.4s ease;
    `;

    const message = `
        <div style="font-size: 4em; margin-bottom: 20px;">🔐</div>
        <h2 style="color: #dc2626; margin: 0 0 16px 0; font-size: 22px; font-weight: 600;">No Access</h2>
        <p style="color: #666; margin: 0 0 12px 0; font-size: 15px; line-height: 1.6;">
            You don't have access to any sections yet.
        </p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 4px; margin: 20px 0; text-align: left; font-size: 13px; color: #333;">
            <strong>What you need to do:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                <li>Contact your administrator</li>
                <li>Request permissions to access sections</li>
                <li>Once granted, log out and back in</li>
            </ul>
        </div>
        <button id="logoutNoAccess" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 28px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.2s ease;
            margin-top: 10px;
        " onmouseover="this.style.background='#1e40af'" onmouseout="this.style.background='#2563eb'">
            Log Out
        </button>
    `;

    messageBox.innerHTML = message;
    modal.appendChild(messageBox);
    document.body.appendChild(modal);

    // Log out on button click
    document.getElementById('logoutNoAccess').addEventListener('click', () => {
        auth.signOut();
    });
}

// ===== SHOW LOCKED TAB MESSAGE =====
function showLockedTabMessage(tabId, tabLabel, lockReason) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease;
    `;

    // Create message box
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: slideUp 0.3s ease;
    `;

    const lockIcon = lockReason === 'READ' ? '📖' : '🔒';
    const message = `
        <div style="font-size: 3em; margin-bottom: 16px;">${lockIcon}</div>
        <h2 style="color: #1e40af; margin: 0 0 12px 0; font-size: 20px;">Access Restricted</h2>
        <p style="color: #666; margin: 0 0 24px 0; font-size: 14px;">
            You don't have access to <strong>${tabLabel}</strong>
        </p>
        <p style="color: #999; margin: 0 0 24px 0; font-size: 13px;">
            Required Permission: <strong>${lockReason} Access</strong>
        </p>
        <div style="background: #f0f4ff; border-left: 4px solid #2563eb; padding: 12px; border-radius: 4px; margin-bottom: 24px; text-align: left; font-size: 13px; color: #333;">
            <strong>What you can do:</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                <li>Contact your administrator</li>
                <li>Request access to this section</li>
                <li>Review available features</li>
            </ul>
        </div>
        <button id="closeLockedModal" style="
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s ease;
        " onmouseover="this.style.background='#1e40af'" onmouseout="this.style.background='#2563eb'">
            Got It
        </button>
    `;

    messageBox.innerHTML = message;
    modal.appendChild(messageBox);
    document.body.appendChild(modal);

    // Close on button click
    document.getElementById('closeLockedModal').addEventListener('click', () => {
        modal.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => modal.remove(), 200);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
        }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => modal.remove(), 200);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// ===== UPDATE USER DISPLAY =====
function updateUserDisplay(user) {
    const userEmail = document.getElementById('userEmail');
    const userRole = document.getElementById('userRole');
    const userEmailInline = document.getElementById('userEmailInline');
    const userRoleInline = document.getElementById('userRoleInline');
    const userAvatar = document.getElementById('userAvatar');

    // Create avatar with initials (Notion-style)
    if (userAvatar) {
        const initials = user.email.split('@')[0].substring(0, 2).toUpperCase();
        
        // Color palette
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E', '#6C7A89'];
        
        // Generate consistent color based on email
        const colorIndex = user.email.charCodeAt(0) % colors.length;
        const bgColor = colors[colorIndex];
        
        // Create canvas avatar
        const canvas = document.createElement('canvas');
        canvas.width = 36;
        canvas.height = 36;
        const ctx = canvas.getContext('2d');
        
        // Draw circle background
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(18, 18, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw initials
        ctx.font = 'bold 14px Poppins, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, 18, 18);
        
        userAvatar.src = canvas.toDataURL();
        userAvatar.style.backgroundColor = bgColor;
    }

    if (userEmail) {
        userEmail.textContent = user.email;
    }
    if (userEmailInline) {
        userEmailInline.textContent = user.email;
    }

    if ((userRole || userRoleInline) && currentUser) {
        // Set role display (will be updated with actual role from database)
        if (userRole) userRole.textContent = 'Loading...';
        if (userRoleInline) userRoleInline.textContent = 'Loading...';

        // Fetch actual role from database
        const userRef = ref(db, `Users/${user.uid}`);
        get(userRef).then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const roleText = userData.role === 'admin' ? 'Admin' : 'User';
                if (userRole) {
                    userRole.textContent = roleText;
                }
                if (userRoleInline) {
                    userRoleInline.textContent = roleText;
                }
            }
        });
    }
}

// ===== LOGOUT HANDLER =====
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (confirm('Are you sure you want to logout?')) {
                try {
                    await logoutUser();
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    showNotification('Logout failed. Please try again.', 'error');
                }
            }
        });
    }
    
    const logoutBtnTop = document.getElementById('logoutBtnTop');
    if (logoutBtnTop) {
        logoutBtnTop.addEventListener('click', async (e) => {
            e.preventDefault();

            if (confirm('Are you sure you want to logout?')) {
                try {
                    await logoutUser();
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    showNotification('Logout failed. Please try again.', 'error');
                } 
            }
        });
    }  
}

// ===== NOTIFICATION HELPER =====
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#eef'};
        color: ${type === 'error' ? '#c33' : type === 'success' ? '#3c3' : '#33c'};
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
} // the possible tasks that has to be done

// ===== RICH TEXT FORMATTING =====
window.formatOrderMsg = function(cmd) {
    const msgDiv = document.getElementById('OrderMessage');
    msgDiv.focus();
    document.execCommand(cmd, false, null);
};

// ===== EXPORT FUNCTIONS =====
function exportToCSV(filename, tableData) {
    const csv = tableData.map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function exportToPDF(filename, title, tableData) {
    let html = `<h2>${title}</h2><table border="1"><thead><tr>`;
    if (tableData.length > 0) {
        tableData[0].forEach(header => html += `<th>${header}</th>`);
        html += '</tr></thead><tbody>';
        tableData.slice(1).forEach(row => {
            html += '<tr>';
            row.forEach(cell => html += `<td>${cell}</td>`);
            html += '</tr>';
        });
    }
    html += '</tbody></table>';
    const newWindow = window.open('', '', 'height=600,width=1000');
    newWindow.document.write(html);
    newWindow.document.close();
    setTimeout(() => newWindow.print(), 250);
}

// ===== KPI CALCULATOR =====
async function updateKPIs() {
    try {
        const catalogRef = ref(db, 'ManageCatalog');
        const entriesRef = ref(db, 'ManageCatalogEntries');
        const snapshot = await get(catalogRef);
        const entriesSnapshot = await get(entriesRef);
        
        let totalCatalogs = 0;
        let totalItems = 0;
        let distributionMap = {};
        let pendingCount = 0;
        
        // Count catalogs and total items in stock
        if (snapshot.exists()) {
            const catalogs = snapshot.val();
            totalCatalogs = Object.keys(catalogs).length;
            
            for (const [key, catalog] of Object.entries(catalogs)) {
                totalItems += parseInt(catalog.Stock || 0);
            }
        }
        
        // Count pending distributions and track most distributed
        if (entriesSnapshot.exists()) {
            const entries = entriesSnapshot.val();
            
            for (const [key, entry] of Object.entries(entries)) {
                const catalogName = entry.CatalogName || 'Unknown';
                distributionMap[catalogName] = (distributionMap[catalogName] || 0) + (parseInt(entry.IssueQuantity) || 0);
                
                // Count as pending if delivery date is in future
                const deliveryDate = new Date(entry.DeliveryDate);
                if (deliveryDate > new Date()) {
                    pendingCount++;
                }
            }
        }
        
        // Find most distributed catalog
        let mostDist = '-';
        let maxCount = 0;
        for (const [name, count] of Object.entries(distributionMap)) {
            if (count > maxCount) {
                maxCount = count;
                mostDist = name.substring(0, 20);
            }
        }
        
        // Update KPI elements only if they exist
        if (document.getElementById('kpiTotalCatalogs')) {
            document.getElementById('kpiTotalCatalogs').textContent = totalCatalogs;
        }
        if (document.getElementById('kpiTotalItems')) {
            document.getElementById('kpiTotalItems').textContent = totalItems;
        }
        if (document.getElementById('kpiPendingDist')) {
            document.getElementById('kpiPendingDist').textContent = pendingCount;
        }
        if (document.getElementById('kpiMostDist')) {
            document.getElementById('kpiMostDist').textContent = mostDist;
        }
    } catch (error) {
        console.error('Error updating KPIs:', error);
    }
}

// ===== STOCK LEVEL MONITORING & NOTIFICATIONS =====
// ===== AUDIT LOG =====
async function logAuditEvent(action, details, userId = 'unknown') {
    try {
        const timestamp = new Date().toISOString();
        const auditEntry = {
            action,
            details,
            userId,
            timestamp
        };
        await set(ref(db, `AuditLog/${Date.now()}`), auditEntry);
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

async function renderAuditLog() {
    try {
        const snapshot = await get(ref(db, 'AuditLog'));
        const container = document.getElementById('auditLogContent');
        if (!container) return;
        
        container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No audit entries yet</p>';
            return;
        }
        
        const logs = [];
        snapshot.forEach(child => {
            logs.push({ id: child.key, ...child.val() });
        });
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Add date range filter
        const filterHtml = `
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                <label style="font-weight: 600; color: #1e293b;">期間フィルター:</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="date" id="auditFromDate" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
                    <span style="color: #999;">から</span>
                    <input type="date" id="auditToDate" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
                    <button id="auditClearDate" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-size: 12px;">クリア</button>
                </div>
            </div>
        `;
        container.innerHTML = filterHtml;
        
        // Set current filter values
        const fromInput = container.querySelector('#auditFromDate');
        const toInput = container.querySelector('#auditToDate');
        const clearBtn = container.querySelector('#auditClearDate');
        
        if (auditDateRange.from) fromInput.value = auditDateRange.from;
        if (auditDateRange.to) toInput.value = auditDateRange.to;
        
        fromInput.addEventListener('change', () => {
            auditDateRange.from = fromInput.value;
            renderAuditLog();
        });
        
        toInput.addEventListener('change', () => {
            auditDateRange.to = toInput.value;
            renderAuditLog();
        });
        
        clearBtn.addEventListener('click', () => {
            auditDateRange.from = null;
            auditDateRange.to = null;
            renderAuditLog();
        });
        
        // Filter logs by date range
        const filteredLogs = logs.filter(log => 
            isInDateRange(log.timestamp, auditDateRange.from, auditDateRange.to)
        );
        
        const tableHtml = `
            <table class="glass-table" style="width: 100%;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>User</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredLogs.length > 0 ? filteredLogs.map(log => `
                        <tr>
                            <td style="font-size: 13px;">${new Date(log.timestamp).toLocaleString('ja-JP')}</td>
                            <td><strong>${log.action}</strong></td>
                            <td style="font-size: 13px;">${log.details}</td>
                            <td style="font-size: 13px;">${log.userId}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">フィルター条件に合うレコードがありません</td></tr>'}
                </tbody>
            </table>
        `;
        container.innerHTML += tableHtml;
    } catch (error) {
        console.error('Error rendering audit log:', error);
    }
}

// ===== MOVEMENT HISTORY =====
async function logMovement(catalogName, oldStock, newStock, action) {
    try {
        const timestamp = new Date().toISOString();
        const movement = {
            catalogName,
            oldStock: Number(oldStock),
            newStock: Number(newStock),
            change: Number(newStock) - Number(oldStock),
            action,
            timestamp
        };
        await set(ref(db, `MovementHistory/${Date.now()}`), movement);
        await logAuditEvent('INVENTORY_CHANGE', `${catalogName}: ${oldStock} → ${newStock}`, currentUser?.email);
    } catch (error) {
        console.error('Movement log error:', error);
    }
}

async function renderMovementHistory() {
    try {
        const snapshot = await get(ref(db, 'MovementHistory'));
        const container = document.getElementById('movementHistoryContent');
        if (!container) return;
        
        container.innerHTML = '';
        if (!snapshot.exists()) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No movement history yet</p>';
            return;
        }
        
        const movements = [];
        snapshot.forEach(child => {
            movements.push({ id: child.key, ...child.val() });
        });
        movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Add date range filter
        const filterHtml = `
            <div style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                <label style="font-weight: 600; color: #1e293b;">期間フィルター:</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="date" id="movementFromDate" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
                    <span style="color: #999;">から</span>
                    <input type="date" id="movementToDate" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px;">
                    <button id="movementClearDate" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-size: 12px;">クリア</button>
                </div>
            </div>
        `;
        container.innerHTML = filterHtml;
        
        // Set current filter values
        const fromInput = container.querySelector('#movementFromDate');
        const toInput = container.querySelector('#movementToDate');
        const clearBtn = container.querySelector('#movementClearDate');
        
        if (movementDateRange.from) fromInput.value = movementDateRange.from;
        if (movementDateRange.to) toInput.value = movementDateRange.to;
        
        fromInput.addEventListener('change', () => {
            movementDateRange.from = fromInput.value;
            renderMovementHistory();
        });
        
        toInput.addEventListener('change', () => {
            movementDateRange.to = toInput.value;
            renderMovementHistory();
        });
        
        clearBtn.addEventListener('click', () => {
            movementDateRange.from = null;
            movementDateRange.to = null;
            renderMovementHistory();
        });
        
        // Filter movements by date range
        const filteredMovements = movements.filter(m => 
            isInDateRange(m.timestamp, movementDateRange.from, movementDateRange.to)
        );
        
        const tableHtml = `
            <table class="glass-table" style="width: 100%;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th>Timestamp</th>
                        <th>Item</th>
                        <th>Old Stock</th>
                        <th>New Stock</th>
                        <th>Change</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredMovements.length > 0 ? filteredMovements.map(m => {
                        const changeColor = m.change > 0 ? '#10b981' : m.change < 0 ? '#ef4444' : '#999';
                        return `
                            <tr>
                                <td style="font-size: 13px;">${new Date(m.timestamp).toLocaleString('ja-JP')}</td>
                                <td><strong>${m.catalogName?.substring(0, 40)}</strong></td>
                                <td>${m.oldStock}</td>
                                <td>${m.newStock}</td>
                                <td style="color: ${changeColor}; font-weight: 600;">${m.change > 0 ? '+' : ''}${m.change}</td>
                                <td style="font-size: 13px;">${m.action}</td>
                            </tr>
                        `;
                    }).join('') : '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #999;">フィルター条件に合うレコードがありません</td></tr>'}
                </tbody>
            </table>
        `;
        container.innerHTML += tableHtml;
    } catch (error) {
        console.error('Error rendering movement history:', error);
    }
}


/**
 * Convert hex color to RGB string format (r, g, b)
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

/**
 * Open My Page - Professional Order Tracking Dashboard (White Background)
 */
async function openMyPage() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            alert('ユーザー情報が見つかりません');
            return;
        }
        
        // Switch to My Page tab
        const tabs = document.querySelectorAll('.tab-section');
        tabs.forEach(tab => tab.style.display = 'none');
        const myPageTab = document.getElementById('tab-myPage');
        if (myPageTab) {
            myPageTab.style.display = 'block';
        }
        
        // Fetch user data from Firebase
        const userRef = ref(db, `Users/${currentUser.uid}`);
        const userSnapshot = await get(userRef);
        
        let userData = {};
        if (userSnapshot.exists()) {
            userData = userSnapshot.val();
        }
        
        // Fetch all orders for this user
        const ordersRef = ref(db, 'Orders');
        const ordersSnapshot = await get(ordersRef);
        let userOrders = [];
        
        if (ordersSnapshot.exists()) {
            const allOrders = ordersSnapshot.val();
            // Filter orders by current user's email
            userOrders = Object.entries(allOrders)
                .filter(([_, order]) => order.UserEmail === currentUser.email || order.Requester === currentUser.email)
                .map(([orderId, order]) => ({
                    orderId,
                    ...order
                }))
                .sort((a, b) => new Date(b.CreatedAt || b.OrderDate) - new Date(a.CreatedAt || a.OrderDate));
        }
        
        // Calculate statistics
        const totalOrders = userOrders.length;
        const completedOrders = userOrders.filter(o => o.Status === '完了').length;
        const shippedOrders = userOrders.filter(o => o.Status === '発送済み').length;
        const pendingOrders = userOrders.filter(o => o.Status === '注文受付').length;
        const cancelledOrders = userOrders.filter(o => o.Status === 'キャンセル').length;
        const totalQuantity = userOrders.reduce((sum, o) => sum + (o.OrderQuantity || 0), 0);
        
        // Render My Page content
        const myPageContent = document.getElementById('myPageContent');
        
        // Add CSS animations
        const animationStyle = `
            <style>
                @keyframes statusPulse {
                    0% { box-shadow: 0 0 0 0 rgba(var(--status-rgb), 0.7); }
                    50% { box-shadow: 0 0 0 8px rgba(var(--status-rgb), 0); }
                    100% { box-shadow: 0 0 0 0 rgba(var(--status-rgb), 0); }
                }
                @keyframes statusGlow {
                    0%, 100% { filter: brightness(1); box-shadow: 0 4px 12px rgba(var(--status-rgb), 0.4); }
                    50% { filter: brightness(1.1); box-shadow: 0 6px 20px rgba(var(--status-rgb), 0.6); }
                }
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .status-badge {
                    animation: statusGlow 2s ease-in-out infinite;
                }
            </style>
        `;
        
        // Build professional header
        const headerHtml = `
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); 
                        padding: 40px 30px; border-radius: 16px; margin-bottom: 30px; 
                        box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap;">
                    <div>
                        <h1 style="margin: 0 0 8px 0; font-size: 32px; color: white; font-weight: 700;">
                            📦 マイページ
                        </h1>
                        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 15px;">
                            Welcome back, <strong>${currentUser.email.split('@')[0]}</strong>
                        </p>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 12px 16px; border-radius: 8px; 
                               backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);">
                        <div style="font-size: 28px; color: white; font-weight: 700;">${totalOrders}</div>
                        <div style="color: rgba(255,255,255,0.9); font-size: 12px; margin-top: 4px;">総注文数</div>
                    </div>
                </div>
            </div>
        `;
        
        // Build statistics cards
        const statsHtml = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e8f5e9 100%);
                           border: 1px solid #86efac; 
                           padding: 18px; border-radius: 12px; transition: all 0.3s ease;
                           cursor: default; text-align: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);">
                    <div style="font-size: 11px; color: #16a34a; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                        ✓ 完了
                    </div>
                    <div style="font-size: 28px; color: #15803d; font-weight: 700;">${completedOrders}</div>
                    <div style="font-size: 12px; color: #4b5563; margin-top: 4px; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block;">
                        ${totalOrders > 0 ? Math.round(completedOrders / totalOrders * 100) : 0}%
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
                           border: 1px solid #fcd34d; 
                           padding: 18px; border-radius: 12px; transition: all 0.3s ease;
                           cursor: default; text-align: center; box-shadow: 0 2px 8px rgba(249, 158, 11, 0.1);">
                    <div style="font-size: 11px; color: #b45309; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                        📦 発送
                    </div>
                    <div style="font-size: 28px; color: #92400e; font-weight: 700;">${shippedOrders}</div>
                    <div style="font-size: 12px; color: #4b5563; margin-top: 4px; background: rgba(249, 158, 11, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block;">
                        ${totalOrders > 0 ? Math.round(shippedOrders / totalOrders * 100) : 0}%
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                           border: 1px solid #93c5fd; 
                           padding: 18px; border-radius: 12px; transition: all 0.3s ease;
                           cursor: default; text-align: center; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);">
                    <div style="font-size: 11px; color: #1e40af; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                        ⏳ 処理中
                    </div>
                    <div style="font-size: 28px; color: #1e3a8a; font-weight: 700;">${pendingOrders}</div>
                    <div style="font-size: 12px; color: #4b5563; margin-top: 4px; background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block;">
                        ${totalOrders > 0 ? Math.round(pendingOrders / totalOrders * 100) : 0}%
                    </div>
                </div>
                
                <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                           border: 1px solid #fecaca; 
                           padding: 18px; border-radius: 12px; transition: all 0.3s ease;
                           cursor: default; text-align: center; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);">
                    <div style="font-size: 11px; color: #b91c1c; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                        ✕ キャンセル
                    </div>
                    <div style="font-size: 28px; color: #7f1d1d; font-weight: 700;">${cancelledOrders}</div>
                    <div style="font-size: 12px; color: #4b5563; margin-top: 4px; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px; display: inline-block;">
                        ${totalOrders > 0 ? Math.round(cancelledOrders / totalOrders * 100) : 0}%
                    </div>
                </div>
            </div>
        `;
        
        // Build account info section
        const accountInfoHtml = `
            <div style="background: #f9fafb; border: 1px solid #e5e7eb;
                       border-radius: 12px; padding: 24px; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle" style="font-size: 22px; color: #3b82f6;"></i>
                    アカウント詳細
                </h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
                    <div style="background: #fff; padding: 14px; border-radius: 8px; border-left: 3px solid #3b82f6; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
                            📧 メールアドレス
                        </div>
                        <div style="font-size: 14px; color: #1f2937; font-weight: 500; word-break: break-word;">${currentUser.email}</div>
                    </div>
                    
                    <div style="background: #fff; padding: 14px; border-radius: 8px; border-left: 3px solid #10b981; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
                            📅 登録日
                        </div>
                        <div style="font-size: 14px; color: #1f2937; font-weight: 500;">
                            ${currentUser.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString('ja-JP') : 'Unknown'}
                        </div>
                    </div>
                    
                    <div style="background: #fff; padding: 14px; border-radius: 8px; border-left: 3px solid #f59e0b; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
                            🕐 最終ログイン
                        </div>
                        <div style="font-size: 14px; color: #1f2937; font-weight: 500;">
                            ${currentUser.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('ja-JP') : 'Unknown'}
                        </div>
                    </div>
                    
                    <div style="background: #fff; padding: 14px; border-radius: 8px; border-left: 3px solid #8b5cf6; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">
                            📊 総品数
                        </div>
                        <div style="font-size: 14px; color: #1f2937; font-weight: 500;">
                            ${totalQuantity}部
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Build orders section
        let ordersHtml = '';
        if (userOrders.length > 0) {
            const ordersTableHtml = userOrders.map((order, idx) => {
                const orderDate = order.CreatedAt ? new Date(order.CreatedAt) : (order.OrderDate ? new Date(order.OrderDate) : new Date());
                const statusColor = {
                    '注文受付': '#3b82f6',
                    'キャンセル': '#ef4444',
                    '発送済み': '#f59e0b',
                    '完了': '#10b981',
                    'pending': '#3b82f6',
                    'cancelled': '#ef4444',
                    'shipped': '#f59e0b',
                    'completed': '#10b981'
                }[order.Status] || '#6b7280';
                
                const statusBgLight = {
                    '注文受付': '#eff6ff',
                    'キャンセル': '#fef2f2',
                    '発送済み': '#fffbeb',
                    '完了': '#f0fdf4',
                    'pending': '#eff6ff',
                    'cancelled': '#fef2f2',
                    'shipped': '#fffbeb',
                    'completed': '#f0fdf4'
                }[order.Status] || '#f3f4f6';
                
                const statusTextDark = {
                    '注文受付': '#1e3a8a',
                    'キャンセル': '#7f1d1d',
                    '発送済み': '#92400e',
                    '完了': '#15803d',
                    'pending': '#1e3a8a',
                    'cancelled': '#7f1d1d',
                    'shipped': '#92400e',
                    'completed': '#15803d'
                }[order.Status] || '#374151';
                
                const statusEmoji = {
                    '注文受付': '📝',
                    'キャンセル': '❌',
                    '発送済み': '📦',
                    '完了': '✓'
                }[order.Status] || '❓';
                
                // Build status history timeline
                const statusHistory = order.StatusHistory && Array.isArray(order.StatusHistory) ? order.StatusHistory : 
                                     (order.Status ? [{status: order.Status, timestamp: order.CreatedAt || order.OrderDate, changedBy: 'system'}] : []);
                
                const statusTimelineHtml = statusHistory.map((entry, i) => {
                    const statusDate = new Date(entry.timestamp);
                    const histColor = {
                        '注文受付': '#3b82f6',
                        'キャンセル': '#ef4444',
                        '発送済み': '#f59e0b',
                        '完了': '#10b981'
                    }[entry.status] || '#6b7280';
                    
                    const histEmoji = {
                        '注文受付': '📝',
                        'キャンセル': '❌',
                        '発送済み': '📦',
                        '完了': '✓'
                    }[entry.status] || '❓';
                    
                    return `
                        <div style="display: flex; gap: 12px; padding: 10px 0; ${i < statusHistory.length - 1 ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
                            <div style="width: 32px; height: 32px; background: ${histColor}; border-radius: 50%; flex-shrink: 0; 
                                       display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px ${histColor}44; color: white;">
                                ${histEmoji}
                            </div>
                            <div style="flex: 1; padding-top: 4px;">
                                <div style="color: #1f2937; font-size: 14px; font-weight: 600;">${entry.status}</div>
                                <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">
                                    ${statusDate.toLocaleDateString('ja-JP')} ${statusDate.toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                const progressPercent = (statusHistory.length / 4) * 100;
                
                return `
                    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; 
                                margin-bottom: 16px; animation: slideInUp 0.5s ease-out backwards; 
                                animation-delay: ${idx * 0.08}s;
                                transition: all 0.3s ease; cursor: pointer;
                                box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
                             onmouseover="this.style.borderColor='#3b82f6'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.15)'"
                             onmouseout="this.style.borderColor='#e5e7eb'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.1)'">
                        
                        <!-- Header Row -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <span style="font-size: 24px;">${statusEmoji}</span>
                                    <h4 style="margin: 0; color: #1f2937; font-size: 16px; font-weight: 700;">${order.CatalogName}</h4>
                                </div>
                                <div style="display: grid; grid-template-columns: auto auto auto; gap: 20px; font-size: 13px;">
                                    <div>
                                        <span style="color: #6b7280; font-weight: 600;">注文ID</span>
                                        <div style="color: #374151; font-family: monospace; font-size: 12px; margin-top: 2px;">${order.orderId}</div>
                                    </div>
                                    <div>
                                        <span style="color: #6b7280; font-weight: 600;">数量</span>
                                        <div style="color: #1f2937; font-weight: 600; margin-top: 2px;">${order.OrderQuantity}部</div>
                                    </div>
                                    <div>
                                        <span style="color: #6b7280; font-weight: 600;">部署</span>
                                        <div style="color: #374151; margin-top: 2px;">${order.RequesterDepartment || '-'}</div>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div class="status-badge" style="background: ${statusBgLight}; color: ${statusTextDark}; padding: 8px 14px; border: 2px solid ${statusColor}; border-radius: 8px; 
                                           font-size: 13px; font-weight: 700; box-shadow: 0 4px 12px ${statusColor}44; margin-bottom: 8px;
                                           --status-rgb: ${hexToRgb(statusColor)};">
                                    ${order.Status || '注文受付'}
                                </div>
                                <div style="font-size: 12px; color: #6b7280;">
                                    ${orderDate.toLocaleDateString('ja-JP')}
                                </div>
                            </div>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div style="margin: 12px 0; background: #e5e7eb; height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; background: linear-gradient(90deg, ${statusColor}, ${statusColor}dd); width: ${progressPercent}%; transition: width 0.8s ease;"></div>
                        </div>
                        
                        <!-- Status Timeline -->
                        <div style="margin: 16px 0; padding: 12px; background: ${statusBgLight}; 
                                   border-left: 3px solid ${statusColor}; border-radius: 6px;">
                            <div style="font-size: 11px; color: ${statusTextDark}; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                                📋 ステータス推移
                            </div>
                            ${statusTimelineHtml}
                        </div>
                        
                        <!-- Additional Details -->
                        <div style="padding-top: 12px; border-top: 1px solid #e5e7eb;">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; font-size: 12px;">
                                <div>
                                    <span style="color: #6b7280; font-weight: 600;">配布先</span>
                                    <div style="color: #374151; margin-top: 4px;">${order.DistributionDestination || '-'}</div>
                                </div>
                                <div>
                                    <span style="color: #6b7280; font-weight: 600;">住所</span>
                                    <div style="color: #374151; margin-top: 4px; word-break: break-word;">${order.RequesterAddress || '-'}</div>
                                </div>
                                ${order.TrackingId ? `
                                    <div>
                                        <span style="color: #6b7280; font-weight: 600;">🔗 追跡ID</span>
                                        <div style="color: #3b82f6; margin-top: 4px; font-family: monospace; cursor: pointer; font-weight: 600;" 
                                             onclick="openTrackingLink('${order.TrackingId}', '${order.TrackingService || 'other'}')">
                                            ${order.TrackingId}
                                        </div>
                                    </div>
                                ` : ''}
                                <div>
                                    <span style="color: #6b7280; font-weight: 600;">備考</span>
                                    <div style="color: #374151; margin-top: 4px;">${order.Message ? order.Message.substring(0, 30) + (order.Message.length > 30 ? '...' : '') : '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            ordersHtml = `
                <div>
                    <h3 style="color: #1f2937; margin: 0 0 18px 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-box-open" style="color: #3b82f6; font-size: 20px;"></i>
                        注文一覧
                        <span style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                            ${userOrders.length}件
                        </span>
                    </h3>
                    ${ordersTableHtml}
                </div>
            `;
        } else {
            ordersHtml = `
                <div style="background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 12px; padding: 50px 30px; 
                           text-align: center; margin: 30px 0;">
                    <i class="fas fa-inbox" style="font-size: 56px; color: #d1d5db; margin-bottom: 16px; display: block; opacity: 0.7;"></i>
                    <h3 style="color: #6b7280; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">注文履歴がありません</h3>
                    <p style="color: #9ca3af; margin: 0; font-size: 14px;">新しい注文を作成して、ここで追跡できます</p>
                </div>
            `;
        }
        
        myPageContent.innerHTML = `
            ${animationStyle}
            <div style="padding: 30px 20px; color: #1f2937; background: #ffffff;">
                ${headerHtml}
                ${totalOrders > 0 ? statsHtml : ''}
                ${accountInfoHtml}
                ${ordersHtml}
            </div>
        `;
        
        // Smooth scroll to My Page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error opening My Page:', error);
        const myPageContent = document.getElementById('myPageContent');
        myPageContent.innerHTML = `
            <div style="padding: 30px 20px; color: #991b1b; background: #fef2f2;
                       border: 1px solid #fecaca; border-radius: 12px; margin: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700;">❌ エラーが発生しました</h3>
                <p style="margin: 0; font-size: 14px; color: #dc2626;">${error.message}</p>
            </div>
        `;
    }
}

// ===== BULK OPERATIONS =====

// Export functions to global scope for HTML inline event handlers
window.openEditCatalogModal = openEditCatalogModal;
window.deleteCatalogFromCard = deleteCatalogFromCard;
window.editCatalogNameFromCard = editCatalogNameFromCard;
window.renderPlaceOrderProductGrid = renderPlaceOrderProductGrid;
window.renderCatalogTablesAccordion = renderCatalogTablesAccordion;
window.renderOrderTablesAccordion = renderOrderTablesAccordion;
window.openPlaceOrderModal = openPlaceOrderModal;
window.closePlaceOrderModal = closePlaceOrderModal;
window.increaseOrderQty = increaseOrderQty;
window.decreaseOrderQty = decreaseOrderQty;
window.submitPlaceOrder = submitPlaceOrder;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartUI = updateCartUI;
window.openMyPage = openMyPage;
