// Notifications System - Integrated with existing bell button
// Real-time alerts for admins

let notificationsData = [];
let notificationBadgeCount = 0;

// Initialize Notification Center
export function initNotificationSystem() {
    createNotificationPanel();
    loadNotificationsFromStorage();
    setupNotificationListeners();
    displayBadgeCount();
    
    // Hook existing bell button
    const existingBell = document.querySelector('button[title="Notifications"]');
    if (existingBell) {
        existingBell.addEventListener('click', toggleNotificationCenter);
    }
    
    // Setup button listeners
    setTimeout(() => {
        const markAllBtn = document.getElementById('notifMarkAllRead');
        const closeBtn = document.getElementById('notifCloseBtn');
        const clearBtn = document.getElementById('notifClearBtn');
        
        if (markAllBtn) markAllBtn.addEventListener('click', markAllAsRead);
        if (closeBtn) closeBtn.addEventListener('click', toggleNotificationCenter);
        if (clearBtn) clearBtn.addEventListener('click', clearAllNotifications);
    }, 100);
}

function createNotificationPanel() {
    if (document.getElementById('notificationCenter')) return;
    
    const html = `
        <div id="notificationCenter" style="
            position:fixed;
            top:60px;
            right:0;
            width:360px;
            height:calc(100vh - 60px);
            background:#fff;
            border-left:1px solid #e5e7eb;
            box-shadow:-2px 0 8px rgba(0,0,0,0.1);
            z-index:9999;
            display:none;
            flex-direction:column;
            animation:slideIn 0.3s ease-out;
        ">
            <!-- Header -->
            <div style="
                padding:16px;
                border-bottom:1px solid #e5e7eb;
                display:flex;
                justify-content:space-between;
                align-items:center;
                background:#f9fafb;
            ">
                <h3 style="margin:0;font-size:18px;font-weight:600;">通知</h3>
                <div style="display:flex;gap:8px;">
                    <button id="notifMarkAllRead" class="btn btn-sm btn-outline-secondary" style="padding:4px 8px;font-size:12px;">すべて既読</button>
                    <button id="notifClearBtn" class="btn btn-sm btn-outline-danger" style="padding:4px 8px;font-size:12px;color:#dc2626;border-color:#dc2626;">クリア</button>
                    <button id="notifCloseBtn" class="btn btn-sm btn-outline-secondary" style="padding:4px 8px;font-size:12px;">×</button>
                </div>
            </div>
            
            <!-- Filter Tabs -->
            <div style="
                padding:12px 16px;
                display:flex;
                gap:8px;
                border-bottom:1px solid #e5e7eb;
                overflow-x:auto;
                background:#fafbfc;
            ">
                <button class="notif-filter-btn active" data-filter="all" style="
                    padding:6px 12px;
                    border:none;
                    background:#2563eb;
                    color:#fff;
                    border-radius:20px;
                    font-size:12px;
                    cursor:pointer;
                    white-space:nowrap;
                ">すべて</button>
                <button class="notif-filter-btn" data-filter="stock" style="
                    padding:6px 12px;
                    border:1px solid #d1d5db;
                    background:#fff;
                    border-radius:20px;
                    font-size:12px;
                    cursor:pointer;
                    white-space:nowrap;
                ">在庫</button>
                <button class="notif-filter-btn" data-filter="orders" style="
                    padding:6px 12px;
                    border:1px solid #d1d5db;
                    background:#fff;
                    border-radius:20px;
                    font-size:12px;
                    cursor:pointer;
                    white-space:nowrap;
                ">注文</button>
                <button class="notif-filter-btn" data-filter="users" style="
                    padding:6px 12px;
                    border:1px solid #d1d5db;
                    background:#fff;
                    border-radius:20px;
                    font-size:12px;
                    cursor:pointer;
                    white-space:nowrap;
                ">ユーザー</button>
            </div>
            
            <!-- Notifications List -->
            <div id="notificationsList" style="
                flex:1;
                overflow-y:auto;
                padding:0;
            "></div>
            
            <!-- Empty State -->
            <div id="notificationsEmpty" style="
                flex:1;
                display:flex;
                align-items:center;
                justify-content:center;
                color:#9ca3af;
                text-align:center;
            ">
                <div>
                    <div style="font-size:48px;margin-bottom:8px;">🔔</div>
                    <div>通知はありません</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', html);
    
    // Event Listeners
    document.getElementById('notifCloseBtn').addEventListener('click', closeNotificationCenter);
    document.getElementById('notifMarkAllRead').addEventListener('click', markAllAsRead);
    
    document.querySelectorAll('.notif-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterNotifications(btn.dataset.filter));
    });
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

    `;
    document.head.appendChild(style);
}

function toggleNotificationCenter() {
    const center = document.getElementById('notificationCenter');
    center.style.display = center.style.display === 'none' ? 'flex' : 'none';
    if (center.style.display === 'flex') {
        renderNotifications('all');
    }
}

function closeNotificationCenter() {
    document.getElementById('notificationCenter').style.display = 'none';
}

export function addNotification(notification) {
    const id = Date.now().toString();
    const fullNotif = {
        id,
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
    };
    
    notificationsData.unshift(fullNotif);
    notificationBadgeCount++;
    
    // Keep only last 50 notifications
    if (notificationsData.length > 50) {
        notificationsData = notificationsData.slice(0, 50);
    }
    
    saveNotificationsToStorage();
    displayBadgeCount();
    
    // Auto-open center for critical notifications
    if (fullNotif.priority === 'critical') {
        setTimeout(() => {
            document.getElementById('notificationCenter').style.display = 'flex';
            renderNotifications('all');
        }, 500);
    }
    
    return fullNotif;
}



function renderNotifications(filter = 'all') {
    const listContainer = document.getElementById('notificationsList');
    const emptyState = document.getElementById('notificationsEmpty');
    
    let filtered = notificationsData;
    if (filter !== 'all') {
        filtered = notificationsData.filter(n => n.type === filter);
    }
    
    if (filtered.length === 0) {
        listContainer.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Group by New/Earlier
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const newNotifs = filtered.filter(n => new Date(n.timestamp) >= today);
    const earlierNotifs = filtered.filter(n => new Date(n.timestamp) < today);
    
    let html = '';
    
    if (newNotifs.length > 0) {
        html += '<div style="padding:0;"><div style="padding:12px 16px;font-weight:600;font-size:13px;color:#666;background:#f9fafb;">新規</div>';
        newNotifs.forEach(notif => {
            html += renderNotificationItem(notif);
        });
        html += '</div>';
    }
    
    if (earlierNotifs.length > 0) {
        html += '<div style="padding:0;"><div style="padding:12px 16px;font-weight:600;font-size:13px;color:#666;background:#f9fafb;margin-top:8px;">以前</div>';
        earlierNotifs.forEach(notif => {
            html += renderNotificationItem(notif);
        });
        html += '</div>';
    }
    
    listContainer.innerHTML = html;
    
    // Add event listeners
    listContainer.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            markAsRead(id);
        });
    });
    
    // Add delete button listeners
    listContainer.querySelectorAll('.notif-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            deleteNotification(id);
        });
    });}

function renderNotificationItem(notif) {
    const colors = {
        critical: '#fecaca',
        warning: '#fed7aa',
        info: '#bfdbfe'
    };
    
    const borderColors = {
        critical: '#dc2626',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        stock: '📦',
        order: '📝',
        user: '👤'
    };
    
    const bgColor = notif.read ? '#fff' : colors[notif.priority];
    const borderColor = borderColors[notif.priority];
    
    return `
        <div class="notification-item" data-id="${notif.id}" style="
            padding:12px 16px;
            border-bottom:1px solid #e5e7eb;
            background:${bgColor};
            border-left:3px solid ${borderColor};
            transition:background 0.2s;
            display:flex;
            gap:12px;
            align-items:flex-start;
        " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='${bgColor}'">
            <div style="font-size:24px;flex-shrink:0;">${icons[notif.type] || '🔔'}</div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;margin-bottom:4px;color:#1f2937;">${notif.title}</div>
                <div style="font-size:13px;color:#666;margin-bottom:6px;word-break:break-word;">${notif.message}</div>
                <div style="font-size:11px;color:#999;">${getTimeAgo(notif.timestamp)}</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
                ${!notif.read ? '<div style="width:8px;height:8px;background:#2563eb;border-radius:50%;margin-top:6px;"></div>' : ''}
                <button class="notif-delete-btn" data-id="${notif.id}" style="
                    background:none;
                    border:none;
                    color:#dc2626;
                    cursor:pointer;
                    font-size:14px;
                    padding:0 4px;
                    margin-top:2px;
                ">×</button>
            </div>
        </div>
    `;
}

function filterNotifications(filter) {
    // Update active button
    document.querySelectorAll('.notif-filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.style.background = '#2563eb';
            btn.style.color = '#fff';
            btn.style.border = 'none';
        } else {
            btn.style.background = '#fff';
            btn.style.color = '#1f2937';
            btn.style.border = '1px solid #d1d5db';
        }
    });
    
    renderNotifications(filter);
}

function markAsRead(id) {
    const notif = notificationsData.find(n => n.id === id);
    if (notif && !notif.read) {
        notif.read = true;
        notificationBadgeCount = Math.max(0, notificationBadgeCount - 1);
        saveNotificationsToStorage();
        displayBadgeCount();
        renderNotifications('all');
    }
}

function markAllAsRead() {
    notificationsData.forEach(n => n.read = true);
    notificationBadgeCount = 0;
    saveNotificationsToStorage();
    displayBadgeCount();
    renderNotifications('all');
}

function clearAllNotifications() {
    if (confirm('すべての通知を削除してもよろしいですか?')) {
        notificationsData = [];
        notificationBadgeCount = 0;
        saveNotificationsToStorage();
        displayBadgeCount();
        renderNotifications('all');
    }
}

function deleteNotification(id) {
    const index = notificationsData.findIndex(n => n.id === id);
    if (index !== -1) {
        const notif = notificationsData[index];
        if (!notif.read) {
            notificationBadgeCount = Math.max(0, notificationBadgeCount - 1);
        }
        notificationsData.splice(index, 1);
        saveNotificationsToStorage();
        displayBadgeCount();
        renderNotifications('all');
    }
}

function displayBadgeCount() {
    const existingBell = document.querySelector('button[title="Notifications"]');
    if (!existingBell) return;
    
    // Remove existing badge if any
    let badge = existingBell.querySelector('.notif-badge');
    if (badge) badge.remove();
    
    if (notificationBadgeCount > 0) {
        const badgeHtml = document.createElement('span');
        badgeHtml.className = 'notif-badge';
        badgeHtml.textContent = notificationBadgeCount > 99 ? '99+' : notificationBadgeCount;
        badgeHtml.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            background: #dc2626;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 600;
        `;
        existingBell.style.position = 'relative';
        existingBell.appendChild(badgeHtml);
    }
}

function saveNotificationsToStorage() {
    localStorage.setItem('appNotifications', JSON.stringify(notificationsData));
}

function loadNotificationsFromStorage() {
    const stored = localStorage.getItem('appNotifications');
    if (stored) {
        try {
            notificationsData = JSON.parse(stored);
            notificationBadgeCount = notificationsData.filter(n => !n.read).length;
            displayBadgeCount();
        } catch (e) {
            console.error('Error loading notifications:', e);
        }
    }
}

function setupNotificationListeners() {
    // This will be called from main.js when monitoring catalogs/orders
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return '今';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`;
    return `${Math.floor(seconds / 86400)}日前`;
}
