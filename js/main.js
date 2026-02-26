// MAIN.JS - Complete Application Logic
// Combines all Firebase operations, forms, tables, charts, calendar, and analytics

// ===== IMPORTS =====
import { db } from './firebase-config.js';
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

// ===== GLOBAL STATE =====
let currentUser = null;
let userPermissions = null;
let cartHasChanged = false; // Track if cart has items for beforeunload

// ===== CATALOG NAMES (loaded dynamically from Firebase) =====
let CATALOG_NAMES = [                      
    // Cabinet (Behind)
    "JL-1027", "JL-0127", "JC-20001-5", "JC-5021-7", "JS-10003", "JS-100-2E", "JS-100-2F", 
    "Dairy", "手帳", "JS 10001-3A", "JC-5020-8", "JA-30002", "JC-1026", "JA-30003", "JC-10010-9a",
    // Cabinet (C-6)
    "JL-5026-1A", "JL-5028", "JC-5030-2", "Automatic Shavings Compactor", "JL-5039", "JL-5028-1", 
    "JC-5020-8A", "JC-5022-4B",
    // Cabinet (C-5)
    "JS-10001-3", "ES-100-2", "JC-10003-6", "JC-0815", "JC-0612-3", "JL-0615", "JC-1905-1", 
    "JC-1320-4", "EC-10004-5", "JC-1012-2B", "EC-0612-1"
];

// ===== LOAD CATALOG NAMES FROM FIREBASE =====
async function loadCatalogNamesFromFirebase() {
    try {
        // Build object with ONLY the official catalogs from CATALOG_NAMES
        const defaultsObj = {};
        CATALOG_NAMES.forEach((name, idx) => {
            defaultsObj[`default_${idx}`] = name;
        });
        
        // Overwrite Firebase with only official catalogs
        await set(ref(db, 'CatalogNames'), defaultsObj);
        
        console.log(`Catalog names enforced in Firebase (${CATALOG_NAMES.length} official catalogs):`, CATALOG_NAMES);
        initializeCatalogSelects();
    } catch (error) {
        console.warn('Could not enforce catalog names in Firebase:', error);
        // Fall back to using CATALOG_NAMES directly
        initializeCatalogSelects();
    }
}

// ===== FIREBASE CLOUD MESSAGING (FCM) SETUP =====
async function initializeFCM() {
    try {
        console.log('=== FCM Initialization Started ===');
        
        // Check if notifications are supported
        if (!('serviceWorker' in navigator)) {
            console.log('❌ Service Workers not supported');
            return;
        }
        
        if (!('Notification' in window)) {
            console.log('❌ Notifications not supported');
            return;
        }

        // Check if browser is online
        if (!navigator.onLine) {
            console.log('❌ Browser is offline');
            return;
        }

        console.log('✓ Browser supports notifications');

        // Request notification permission
        if (Notification.permission === 'default') {
            console.log('📱 Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('📱 Permission result:', permission);
            
            if (permission !== 'granted') {
                console.log('❌ User denied notification permission');
                return;
            }
        }

        if (Notification.permission === 'granted') {
            console.log('✓ Notification permission granted');
            
            // Register service worker with correct GitHub Pages path
            try {
                console.log('🔧 Registering Service Worker...');
                
                // Determine the correct base path for GitHub Pages
                const currentPath = window.location.pathname;
                console.log('📍 Current path:', currentPath);
                
                let swPath, scope;
                
                // Check if we're in the repo subdirectory
                if (currentPath.includes('/Catalog-App-By-Anik/')) {
                    // GitHub Pages subdirectory deployment
                    swPath = '/Catalog-App-By-Anik/service-worker.js';
                    scope = '/Catalog-App-By-Anik/';
                } else {
                    // Local or root deployment
                    swPath = '/service-worker.js';
                    scope = '/';
                }
                
                console.log('📝 SW Path:', swPath, '| Scope:', scope);
                
                const registration = await navigator.serviceWorker.register(swPath, { scope });
                console.log('✓ Service Worker registered:', registration.scope);
                
                // Get FCM token
                await getFCMToken();
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        } else {
            console.log('⚠️ Notifications permission:', Notification.permission);
        }
    } catch (error) {
        console.error('❌ FCM initialization error:', error);
    }
}

async function getFCMToken() {
    try {
        console.log('🔑 Getting FCM token...');
        
        const { getMessaging, getToken } = await import(
            'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js'
        );
        
        const messaging = getMessaging();
        
        // Get token with VAPID key
        const token = await getToken(messaging, {
            vapidKey: 'BPi52r-qOAfK0wfZHX1xzM9q8d8N5pQ3X4yZ9vK2mL5sN6oP7qR8sT9uV0wX1yZ2aA3bB4cC5dD6eE7fF8gG9hH0iI1jJ2kK3lL4mM'
        });
        
        if (token) {
            console.log('✓ FCM Token obtained:', token.substring(0, 50) + '...');
            await saveFCMToken(token);
        } else {
            console.log('⚠️ No FCM token generated');
        }
    } catch (error) {
        console.error('❌ Token generation error:', error);
    }
}

async function saveFCMToken(token) {
    try {
        const { httpsCallable } = await import(
            'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js'
        );
        const { functionsClient } = await import('./firebase-config.js');
        
        const saveFCMTokenFn = httpsCallable(functionsClient, 'saveFCMToken');
        
        const result = await saveFCMTokenFn({
            token: token,
            deviceInfo: navigator.userAgent.substring(0, 80)
        });
        
        console.log('✓ FCM token saved to Firebase:', result.data);
        addNotification('通知設定完了', 'プッシュ通知が有効になりました', 'success');
    } catch (error) {
        console.warn('⚠️ Could not save FCM token (notifications may still work via SW):', error);
    }
}

// ===== INITIALIZE CATALOG SELECTS =====
function initializeCatalogSelects() {
    const selects = document.querySelectorAll('#CatalogName, #OrderCatalogName');
    selects.forEach(select => {
        select.innerHTML = '<option value="">--選択してください--</option>';
        CATALOG_NAMES.forEach(name => {
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
        document.getElementById('tab-manageCatalog').style.display = 'block';
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
    document.getElementById('CatalogName').addEventListener('change', async function() {
        const catalogRef = ref(db, 'Catalogs/');
        const snapshot = await get(catalogRef);
        let lastStock = 0;
        if (snapshot.exists()) {
            const data = snapshot.val();
            const entries = Object.values(data).filter(e => e.CatalogName === this.value);
            if (entries.length > 0) {
                entries.sort((a, b) => new Date((a.ReceiptDate || '1970-01-01')) - new Date((b.ReceiptDate || '1970-01-01')));
                lastStock = Number(entries[entries.length - 1].StockQuantity) || 0;
            }
        }
        document.getElementById('StockQuantity').value = lastStock;
        document.getElementById('StockQuantity').readOnly = entries && entries.length > 0;
    });
    
    document.getElementById('Insbtn').addEventListener('click', async function() {
        const form = document.getElementById('catalogEntryForm');
        const data = {
            CatalogName: form.CatalogName.value,
            ReceiptDate: form.ReceiptDate.value,
            QuantityReceived: Number(form.QuantityReceived.value),
            DeliveryDate: form.DeliveryDate.value,
            IssueQuantity: Number(form.IssueQuantity.value),
            StockQuantity: Number(form.StockQuantity.value),
            DistributionDestination: form.DistributionDestination.value,
            RequesterDepartment: form.RequesterDepartment.value,
            Requester: form.Requester.value,
            RequesterAddress: form.RequesterAddress.value,
            Remarks: form.Remarks.value,
        };
        
        if (!data.CatalogName || !data.ReceiptDate || !data.DeliveryDate || !data.DistributionDestination || !data.Requester) {
            alert('必須項目を入力してください');
            return;
        }
        
        try {
            const newId = data.CatalogName + "_" + Date.now();
            await set(ref(db, "Catalogs/" + newId), data);
            await logAuditEvent('ADD_CATALOG', `Added: ${data.CatalogName} (Qty: ${data.StockQuantity})`, currentUser?.email);
            await logMovement(data.CatalogName, 0, data.StockQuantity, 'INITIAL_RECEIPT');
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
let catalogItemsData = {}; // Store catalog items for ordering
let catalogStockData = {}; // Store calculated stock for each catalog
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
        
        addNotification({
            type: 'order',
            priority: 'info',
            title: '📦 一括注文が完了しました',
            message: `${shoppingCart.length}件の注文が登録されました`
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

let catalogImages = {}; // Store catalog images

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
        
        // Set up location selection UI
        setupLocationSelectionUI();
        
        // Load catalog names/items
        const catalogNamesSnapshot = await get(ref(db, 'CatalogNames'));
        if (catalogNamesSnapshot.exists()) {
            catalogItemsData = catalogNamesSnapshot.val();
        }
        
        // Load catalog images
        const imagesSnapshot = await get(ref(db, 'CatalogImages'));
        if (imagesSnapshot.exists()) {
            catalogImages = imagesSnapshot.val();
        }
        
        // Load catalog entries and calculate stock
        const catalogSnapshot = await get(ref(db, 'Catalogs'));
        if (catalogSnapshot.exists()) {
            const catalogData = catalogSnapshot.val();
            calculateStockPerCatalog(catalogData);
        }
        
        renderPlaceOrderProductGrid();
    } catch (error) {
        console.error('Error loading catalog items:', error);
    }
}

function calculateStockPerCatalog(catalogData) {
    // Group entries by catalog name and calculate current stock
    const catalogsByName = {};
    
    Object.entries(catalogData).forEach(([key, entry]) => {
        if (!entry || !entry.CatalogName) return;
        
        const name = entry.CatalogName;
        if (!catalogsByName[name]) catalogsByName[name] = [];
        catalogsByName[name].push({
            ...entry,
            QuantityReceived: Number(entry.QuantityReceived || 0),
            IssueQuantity: Number(entry.IssueQuantity || 0),
            ReceiptDate: entry.ReceiptDate || ''
        });
    });
    
    // Calculate stock for each catalog
    Object.entries(catalogsByName).forEach(([name, entries]) => {
        // Sort by receipt date
        entries.sort((a, b) => new Date(a.ReceiptDate || '1970-01-01') - new Date(b.ReceiptDate || '1970-01-01'));
        
        // Calculate running stock
        let currentStock = 0;
        entries.forEach((entry, i) => {
            const received = entry.QuantityReceived || 0;
            const issued = entry.IssueQuantity || 0;
            currentStock = currentStock + received - issued;
        });
        
        catalogStockData[name] = currentStock;
    });
}

/**
 * Set up location selection UI on the Place Order page
 */
function setupLocationSelectionUI() {
    const container = document.getElementById('locationSelectionContainer');
    if (!container) return;
    
    let html = `
        <div style="background:#f8fafc; padding:16px; border-radius:8px; margin-bottom:20px; border-left:4px solid #2563eb;">
            <h5 style="margin:0 0 12px 0; color:#1e293b; font-size:14px; font-weight:600;">📍 配送先住所を選択</h5>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="radio" name="addressType" value="location" ${selectedAddressType === 'location' ? 'checked' : ''} style="cursor:pointer;" onchange="switchAddressType('location')">
                    <span style="font-size:14px; color:#333;">登録場所から選択</span>
                </label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="radio" name="addressType" value="custom" ${selectedAddressType === 'custom' ? 'checked' : ''} style="cursor:pointer;" onchange="switchAddressType('custom')">
                    <span style="font-size:14px; color:#333;">カスタム住所を入力</span>
                </label>
            </div>
            
            <!-- Location Dropdown -->
            <div id="locationSelectDiv">
                <select id="locationSelect" style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:14px; background:white; margin-bottom:8px;" onchange="updateSelectedAddress()">
                    <option value="">-- 場所を選択してください --</option>
                    ${getLocationOptions().map(opt => `
                        <option value="${opt.id}" ${selectedAddressValue === opt.id ? 'selected' : ''}>
                            ${opt.label}
                        </option>
                    `).join('')}
                </select>
                <div id="locationDetailsDisplay" style="background:#fff; padding:12px; border-radius:6px; border:1px solid #e2e8f0; font-size:13px; color:#666; line-height:1.6; white-space:pre-line;">
                    ${selectedAddressValue && selectedAddressType === 'location' ? formatLocationDetails(selectedAddressValue) : '場所を選択して詳細を表示します'}
                </div>
            </div>
            
            <!-- Custom Address Input -->
            <div id="customAddressDiv" style="display:none;">
                <textarea id="customAddressInput" placeholder="郵便番号、住所、階数などを入力してください" style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:14px; font-family:inherit; min-height:100px;" onchange="updateSelectedAddress()">${selectedAddressType === 'custom' ? (selectedAddressValue || '') : ''}</textarea>
                <small style="color:#999; font-size:12px; display:block; margin-top:6px;">💡 例：〒252-1113 神奈川県綾瀬市上土棚中4-4-34 2階</small>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
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
function updateAddressTypeUI() {
    const locationDiv = document.getElementById('locationSelectDiv');
    const customDiv = document.getElementById('customAddressDiv');
    
    if (selectedAddressType === 'location') {
        locationDiv.style.display = 'block';
        customDiv.style.display = 'none';
    } else {
        locationDiv.style.display = 'none';
        customDiv.style.display = 'block';
    }
}

/**
 * Update selected address (from dropdown or custom input)
 */
window.updateSelectedAddress = function() {
    if (selectedAddressType === 'location') {
        const select = document.getElementById('locationSelect');
        selectedAddressValue = select.value;
        
        // Update details display
        const display = document.getElementById('locationDetailsDisplay');
        if (selectedAddressValue) {
            display.textContent = formatLocationDetails(selectedAddressValue);
        } else {
            display.textContent = '場所を選択して詳細を表示します';
        }
    } else {
        const textarea = document.getElementById('customAddressInput');
        selectedAddressValue = textarea.value;
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
    Object.entries(catalogItemsData).forEach(([key, item]) => {
        if (!item) return;
        
        const catalogName = typeof item === 'string' ? item : (item.name || item.catalogName || key);
        // Get image from catalogImages using the key
        let imageUrl = catalogImages[key] || '';
        
        // Extract image URL from HTML or plain URL
        imageUrl = extractImageUrl(imageUrl);
        
        // Filter by search
        if (searchTerm && !catalogName.toLowerCase().includes(searchTerm)) {
            return;
        }
        
        itemCount++;
        const card = document.createElement('div');
        card.style.cssText = 'cursor:pointer; border:1px solid #ddd; border-radius:8px; padding:12px; background:#fff; transition:all 0.3s ease; text-align:center;';
        card.onmouseover = () => { card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
        card.onmouseout = () => { card.style.boxShadow = 'none'; };
        
        const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE0MCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjcwIiB5PSI3MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5Ij5Ob0ltYWdlPC90ZXh0Pjwvc3ZnPg==';
        
        // Get current stock for this catalog
        const currentStock = catalogStockData[catalogName] || 0;
        const stockStatus = currentStock > 0 ? `在庫: ${currentStock}個` : '絶版';
        const stockColor = currentStock > 0 ? '#16a34a' : '#dc2626';
        
        card.innerHTML = `
            <img src="${imageUrl || placeholderSvg}" style="width:100%; height:140px; object-fit:cover; border-radius:6px; background:#f0f0f0; margin-bottom:10px;" onerror="this.src='${placeholderSvg}'">
            <p style="font-size:0.9rem; font-weight:600; margin:8px 0 5px 0; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${catalogName}</p>
            <p style="font-size:0.85rem; font-weight:600; margin:0; color:${stockColor};">${stockStatus}</p>
        `;
        
        card.addEventListener('click', () => openPlaceOrderModal(key));
        grid.appendChild(card);
    });
    
    noResults.style.display = itemCount === 0 ? 'block' : 'none';
}

function openPlaceOrderModal(itemKey) {
    const item = catalogItemsData[itemKey];
    if (!item) return;
    
    currentOrderItemKey = itemKey;
    const catalogName = typeof item === 'string' ? item : (item.name || item.catalogName || itemKey);
    // Get image from catalogImages using the key
    let imageUrl = catalogImages[itemKey] || '';
    
    // Extract image URL from HTML or plain URL
    imageUrl = extractImageUrl(imageUrl);
    
    document.getElementById('placeOrderModalTitle').textContent = catalogName;
    document.getElementById('placeOrderModalName').textContent = catalogName;
    document.getElementById('placeOrderModalImage').src = imageUrl;
    document.getElementById('placeOrderModalQty').value = 1;
    document.getElementById('placeOrderModalDepartment').value = '';
    document.getElementById('placeOrderModalRequester').value = '';
    
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
    
    // Display current stock from calculated data
    const currentStock = catalogStockData[catalogName] || 0;
    const stockStatus = currentStock > 0 ? `在庫あり: ${currentStock}個` : '絶版';
    document.getElementById('placeOrderModalStock').textContent = stockStatus;
    
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
    
    // Animations and feedback
    input.classList.add('quantity-pop');
    playSound('click');
    triggerHaptic('light');
    setTimeout(() => input.classList.remove('quantity-pop'), 400);
}

function decreaseOrderQty() {
    const input = document.getElementById('placeOrderModalQty');
    input.value = Math.max(1, parseInt(input.value) - 1);
    
    // Animations and feedback
    input.classList.add('quantity-pop');
    playSound('click');
    triggerHaptic('light');
    setTimeout(() => input.classList.remove('quantity-pop'), 400);
}

async function submitPlaceOrder() {
    if (!currentOrderItemKey) {
        alert('エラー: アイテムが選択されていません');
        return;
    }
    
    const item = catalogItemsData[currentOrderItemKey];
    const catalogName = typeof item === 'string' ? item : (item.name || item.catalogName || currentOrderItemKey);
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
            font-size: 72px;
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
            font-size: ${20 + Math.random() * 20}px;
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
        transform: translate(-50%, calc(-50% + 100px));
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 700;
        text-align: center;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
        z-index: 4998;
        animation: slideUpIn 0.5s ease-out;
        pointer-events: none;
    `;
    
    message.innerHTML = `
        <div>🎉 注文が完了しました！</div>
        <div style="font-size: 14px; margin-top: 8px; opacity: 0.95;">
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
function renderCatalogTablesAccordion() {
    const container = document.getElementById('catalogEntriesAccordion');
    container.innerHTML = '';
    
    // Clear search box when rendering new data
    const searchBox = document.getElementById('catalogSearchBox');
    if (searchBox) searchBox.value = '';
    
    const dbRef = ref(db, 'Catalogs/');
    get(dbRef).then((snapshot) => {
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
                    <label style="font-weight: 600; color: #1e293b;">フィルター (依頼者):</label>
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
            
            Object.keys(catalogs).forEach((catName, idx) => {
                let entries = catalogs[catName].slice();
                
                // Apply requester filter
                if (catalogRequesterFilter) {
                    entries = entries.filter(e => e.Requester === catalogRequesterFilter);
                }
                
                // Skip if no entries after filtering
                if (entries.length === 0) return;
                
                // Sort entries
                entries.sort((a, b) => {
                    if (catalogSortState.column === 'ReceiptDate') {
                        const aVal = new Date(a.ReceiptDate || '1970-01-01');
                        const bVal = new Date(b.ReceiptDate || '1970-01-01');
                        return catalogSortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
                    } else if (catalogSortState.column === 'QuantityReceived') {
                        const aVal = Number(a.QuantityReceived || 0);
                        const bVal = Number(b.QuantityReceived || 0);
                        return catalogSortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
                    } else if (catalogSortState.column === 'IssueQuantity') {
                        const aVal = Number(a.IssueQuantity || 0);
                        const bVal = Number(b.IssueQuantity || 0);
                        return catalogSortState.direction === 'asc' ? aVal - bVal : bVal - aVal;
                    }
                    return new Date(a.ReceiptDate || '1970-01-01') - new Date(b.ReceiptDate || '1970-01-01');
                });
                
                let prevStock = null;
                let totalReceived = 0, totalIssued = 0;
                const rowsHtml = entries.map((entry, i) => {
                    const qtyReceived = Number(entry.QuantityReceived || 0);
                    const qtyIssued = Number(entry.IssueQuantity || 0);
                    let stock = (i === 0) ? (qtyReceived - qtyIssued) : (prevStock + qtyReceived - qtyIssued);
                    prevStock = stock;
                    totalReceived += qtyReceived;
                    totalIssued += qtyIssued;
                    
                    return `<tr data-key="${entry._key}">
                        <td data-field="CatalogName" style="font-weight: 600; color: #1e293b;">${entry.CatalogName}</td>
                        <td class="editable" data-field="ReceiptDate">${entry.ReceiptDate}</td>
                        <td class="editable" data-field="QuantityReceived">${entry.QuantityReceived}</td>
                        <td class="editable" data-field="DeliveryDate">${entry.DeliveryDate}</td>
                        <td class="editable" data-field="IssueQuantity">${entry.IssueQuantity}</td>
                        <td><span class="calculated-stock">${stock}</span></td>
                        <td class="editable" data-field="DistributionDestination">${entry.DistributionDestination}</td>
                        <td class="editable" data-field="RequesterDepartment">${entry.RequesterDepartment || '-'}</td>
                        <td class="editable" data-field="Requester">${entry.Requester}</td>
                        <td class="editable" data-field="RequesterAddress">${entry.RequesterAddress || '-'}</td>
                        <td class="editable" data-field="Remarks">${entry.Remarks}</td>
                        <td><button class="btn btn-danger btn-sm delete-row">Delete</button></td>
                    </tr>`;
                }).join('');
                
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
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; cursor: pointer;" data-column="CatalogName">カタログ名</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; cursor: pointer;" data-column="ReceiptDate">納入日 ${catalogSortState.column === 'ReceiptDate' ? (catalogSortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; cursor: pointer;" data-column="QuantityReceived">受領数量 ${catalogSortState.column === 'QuantityReceived' ? (catalogSortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">納品日</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0; cursor: pointer;" data-column="IssueQuantity">発行数量 ${catalogSortState.column === 'IssueQuantity' ? (catalogSortState.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">在庫数量</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">配布先</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">部署名</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">発注者</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">住所</th>
                                    <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">備考</th>
                                    <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 700; color: #64748b; border-bottom: 2px solid #e2e8f0;">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                        <div style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; gap: 8px;">
                            <button class="btn btn-success btn-sm add-catalog-row" data-catalog="${catName}">➕ 新規行を追加</button>
                        </div>
                    </div>
                `;
                
                container.appendChild(section);
                
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
        }
    });
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

$(document).on('click', '.excel-order-table .editable-order', function() {
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

$(document).on('click', '.excel-order-table .delete-order-row', async function() {
    const tr = $(this).closest('tr');
    const key = tr.data('key');
    if (confirm('削除しますか？')) {
        try {
            const snapshot = await get(ref(db, 'Orders/' + key));
            const order = snapshot.val();
            await remove(ref(db, 'Orders/' + key));
            await logAuditEvent('DELETE_ORDER', `Deleted order for: ${order?.CatalogName}`, currentUser?.email);
            renderOrderTablesAccordion();
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
                title: `New order created: ${catalogName}`,
                message: `By ${currentUser?.email}`,
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
    
    CATALOG_NAMES.slice(0, 5).forEach((catName, i) => {
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
    CATALOG_NAMES.slice(0, 5).forEach((catName, i) => {
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
        eventMaxStack: 3,
        dayMaxEvents: 3,
        dayMaxEventRows: true,
        expandRows: false,
        events: function(info, successCallback) {
            const events = [];
            const catalogRef = ref(db, 'Catalogs/');
            onValue(catalogRef, (snapshot) => {
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

function getItemThreshold(catalogName, thresholdType) {
    const override = analyticsSettings.perItemOverrides?.[catalogName];
    if (thresholdType === 'low') {
        return override?.lowStock !== null && override?.lowStock !== undefined ? override.lowStock : analyticsSettings.globalLowStockThreshold;
    }
    return override?.highStock !== null && override?.highStock !== undefined ? override.highStock : analyticsSettings.globalHighStockThreshold;
}

const ANALYTICS_CARDS = [
    { key: 'stockByItem', label: 'カタログ別在庫', icon: 'fa-layer-group' },
    { key: 'ordersByItem', label: 'カタログ別注文', icon: 'fa-list-ol' },
    { key: 'lowStockItems', label: '在庫不足アイテム', icon: 'fa-triangle-exclamation' },
    { key: 'fastMovingItems', label: '販売数の多いアイテム', icon: 'fa-arrow-trend-up' },
    { key: 'stockTrend', label: '在庫トレンド', icon: 'fa-chart-line' },
    { key: 'requesterRankings', label: 'リクエスター顧問', icon: 'fa-ranking-star' },
    { key: 'distributionAnalysis', label: '配分分析', icon: 'fa-pie-chart' },
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

function fetchAndRenderAnalytics() {
    get(ref(db, 'Catalogs/')).then(cSnap => {
        const catalogData = cSnap.exists() ? cSnap.val() : {};
        get(ref(db, 'Orders/')).then(oSnap => {
            const orderData = oSnap.exists() ? oSnap.val() : {};
            
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
            renderAnalyticsDashboard(catalogData, orderData, dateFrom, dateTo);
        });
    });
}

function renderAnalyticsDashboard(catalogData, orderData, dateFrom = null, dateTo = null) {
    const selection = getAnalyticsSelection();
    const container = document.getElementById('analyticsCards');
    container.innerHTML = '';
    
    ANALYTICS_CARDS.forEach(card => {
        if (selection.includes(card.key)) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'glass-card';
            cardDiv.innerHTML = `<h2><i class="fa-solid ${card.icon}"></i> ${card.label}</h2><div id="analytics-${card.key}"></div>`;
            container.appendChild(cardDiv);
            
            if (card.key === 'stockByItem') {
                const byItem = {};
                Object.values(catalogData).forEach(e => { byItem[e.CatalogName] = (byItem[e.CatalogName] || 0) + Number(e.StockQuantity || 0); });
                const ctxId = 'stockByItem-chart';
                const container = document.getElementById('analytics-stockByItem');
                let canvas = document.getElementById(ctxId);
                if (!canvas) {
                    canvas = document.createElement('canvas');
                    canvas.id = ctxId;
                    container.appendChild(canvas); container.appendchild    
                }
                if (window.stockByItemChart) window.stockByItemChart.destroy();
                window.stockByItemChart = new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(byItem),
                        datasets: [{ label: '在庫数量', data: Object.values(byItem), backgroundColor: 'rgba(75,192,192,0.5)' }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            } else if (card.key === 'ordersByItem') {
                const byItem = {};
                Object.values(orderData).forEach(e => { byItem[e.CatalogName] = (byItem[e.CatalogName] || 0) + 1; });
                const ctxId = 'ordersByItem-chart';
                const container = document.getElementById('analytics-ordersByItem');
                let canvas = document.getElementById(ctxId);
                if (!canvas) {
                    canvas = document.createElement('canvas');
                    canvas.id = ctxId;
                    container.appendChild(canvas);
                }
                if (window.ordersByItemChart) window.ordersByItemChart.destroy();
                window.ordersByItemChart = new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(byItem),
                        datasets: [{ label: '注文数', data: Object.values(byItem), backgroundColor: 'rgba(153,102,255,0.5)' }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            } else if (card.key === 'lowStockItems') {
                renderLowStockItems(catalogData);
            } else if (card.key === 'fastMovingItems') {
                renderFastMovingItems(orderData, dateFrom, dateTo);
            } else if (card.key === 'stockTrend') {
                renderStockTrend(catalogData, orderData, dateFrom, dateTo);
            } else if (card.key === 'requesterRankings') {
                renderRequesterRankings(orderData, dateFrom, dateTo);
            } else if (card.key === 'distributionAnalysis') {
                renderDistributionAnalysis(catalogData);
            }
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
    $('#analyticsCustomizeModal').modal('show'); initiate(maximum)
});

document.getElementById('saveAnalyticsCustomize').addEventListener('click', () => {
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

        // Load catalog names from Firebase
        await loadCatalogNamesFromFirebase();

        // Initialize notification system
        initNotificationSystem();
        
        // Initialize Firebase Cloud Messaging for push notifications
        await initializeFCM();

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
        'manageCatalog': { label: 'Manage Catalog', permission: 'manageCatalog' },
        'placeOrder': { label: 'Place Order', permission: 'placeOrder' },
        'catalogEntries': { label: 'Catalog Entries', permission: 'catalogEntries' },
        'orderEntries': { label: 'Order Entries', permission: 'orderEntries' },
        'reports': { label: 'Reports', permission: 'reports' },
        'stockCalendar': { label: 'Stock Calendar', permission: 'stockCalendar' },
        'analytics': { label: 'Analytics', permission: 'analytics' },
        'adminPanel': { label: 'Admin Panel', permission: 'userManagement' },
        'movementHistory': { label: 'Movement History', permission: 'movementHistory' },
        'auditLog': { label: 'Audit Log', permission: 'auditLog' }
    };

    // Filter both sidebar and top nav buttons
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        const tabConfig_item = tabConfig[tabId];
        let shouldShow = true;

        if (tabConfig_item) {
            // For movementHistory and auditLog, don't require explicit permission - show if user is logged in
            if (tabId === 'movementHistory' || tabId === 'auditLog') {
                console.log('Showing tab (always visible):', tabId);
            } else if (permissions[tabConfig_item.permission]) {
                if (permissions[tabConfig_item.permission].read !== true) {
                    shouldShow = false;
                    console.log('Hiding tab (no read):', tabId);
                } else {
                    console.log('Showing tab:', tabId);
                }
            } else {
                shouldShow = false;
                console.log('Hiding tab (no permission):', tabId);
            }
        } else {
            shouldShow = false;
            console.log('Hiding tab (not in config):', tabId);
        }

        btn.style.display = shouldShow ? 'block' : 'none';
    });

    // Make first visible tab active
    let firstVisibleBtn = null;
    document.querySelectorAll('.sidebar-nav-btn:not(.nav-link-btn)').forEach(btn => {
        if (!firstVisibleBtn && btn.style.display !== 'none') {
            firstVisibleBtn = btn;
        }
    });
    
    if (firstVisibleBtn) {
        console.log('Activating first visible tab:', firstVisibleBtn.getAttribute('data-tab'));
        firstVisibleBtn.click();  
    } else {
        console.warn('No visible tabs found!');
    }
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

// ===== BULK OPERATIONS =====

