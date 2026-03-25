# Notification and Order Data Architecture

## 1. NOTIFICATION CREATION LOGIC

### addNotification() Function
**Location:** [js/notifications-firebase.js](js/notifications-firebase.js#L340)

```javascript
export async function addNotification(notification) {
    console.log('📢 FIREBASE Notification added:', notification);
    
    try {
        // Get all admin emails
        const adminEmails = await getAllAdminEmails();
        
        if (adminEmails.length === 0) {
            console.warn('No admin users found to notify');
            return;
        }
        
        const fullNotif = {
            type: notification.type,
            priority: notification.priority,
            title: notification.title,
            message: notification.message,
            details: notification.details || null,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        // Send notification to all admins
        const notificationPromises = adminEmails.map(async (adminEmail) => {
            const encodedEmail = encodeEmail(adminEmail);
            const notificationsRef = ref(db, `Notifications/${encodedEmail}`);
            const newNotifRef = push(notificationsRef);
            await set(newNotifRef, fullNotif);
            console.log(`✅ Notification sent to admin: ${adminEmail}`);
        });
        
        await Promise.all(notificationPromises);
    } catch (error) {
        console.error('Error adding notification:', error);
    }
}
```

### Notification Object Structure
**Properties:**
- `type` - Category: 'order', 'ORDER', 'stock', 'users'
- `priority` - Level: 'critical', 'warning', 'info', 'normal'
- `title` - Display title (supports emoji)
- `message` - Main notification text
- `details` - Optional object with contextual data (see examples below)
- `timestamp` - ISO string of creation time (auto-added)
- `read` - Boolean flag (default: false)

---

## 2. ORDER DATA MODEL

### Order Storage Path
**Firebase Location:** `Orders/{orderId}`

### Order Data Structure
**Created in:** [js/main.js - checkoutCart() function](js/main.js#L721)

```javascript
const orderData = {
    CatalogName: item.catalogName,              // Name of product
    OrderQuantity: item.quantity,               // Quantity ordered
    RequesterDepartment: item.department,       // Department name
    Requester: item.requester,                  // Person name
    RequesterAddress: item.address,             // Address details
    Message: item.message,                      // Special message
    AddressType: item.addressType,              // Type: "address", "location", etc
    AddressValue: item.addressValue,            // Address value reference
    OrderDate: now.toISOString().split('T')[0],// Date YYYY-MM-DD
    CreatedAt: now.toISOString(),               // Full creation timestamp
    UserEmail: user?.email || 'unknown',        // Tracks which user placed order
    Status: '注文受付',                         // Current status (pending = '注文受付')
    StatusHistory: [{
        status: '注文受付',
        timestamp: now.toISOString(),
        changedBy: user?.email || 'system'
    }],
    Fulfilled: false                            // Completion flag
};
```

### Order ID Format
- Pattern: `{CatalogName}_{Timestamp}_{RandomString}`
- Example: `ProductX_1679123456789_abc3d5f`

### Additional Order Fields in Code
When orders are displayed/manipulated, these fields may also be present:
- `OrderId` - Generated ID
- `Fulfilled` - Boolean completion status
- `StatusHistory` - Array of status changes with timestamps

---

## 3. NOTIFICATION-TO-ORDER LINKAGE

### How Notifications Reference Orders

Notifications **DO NOT directly store Order IDs** in the current implementation. Instead, they maintain the relationship through the **details object**:

#### Example 1: Batch Checkout Notification
**Location:** [js/main.js - checkoutCart()](js/main.js#L758)

```javascript
addNotification({
    type: 'order',
    priority: 'info',
    title: '📦 一括注文が完了しました',
    message: `${shoppingCart.length}件の注文が登録されました`,
    details: {
        items: shoppingCart.length,           // Number of items
        date: new Date().toLocaleDateString('ja-JP'),
        requester: currentUser?.email || 'Unknown'
    }
});
```

#### Example 2: Single Order Creation Notification
**Location:** [js/main.js - line 2782](js/main.js#L2782)

```javascript
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
```

### Current Limitation
**⚠️ No Direct Order-Notification Link:**
- Order IDs are NOT stored in notification.details
- Notifications reference orders textually (by product name, count)
- To find which orders triggered a notification, you would need to:
  1. Check the notification timestamp
  2. Query orders created around that time
  3. Match product names and requester email

---

## 4. NOTIFICATION DISPLAY TEMPLATE/HTML

### Notification Center Container
**Location:** [js/notifications-firebase.js - createNotificationPanel()](js/notifications-firebase.js#L87)

```html
<div id="notificationCenter" style="
    position:fixed;
    top:60px;
    right:0;
    width:100%;
    max-width:360px;
    height:calc(100vh - 60px);
    background:#fff;
    border-left:1px solid #e5e7eb;
    box-shadow:-2px 0 8px rgba(0,0,0,0.1);
    z-index:9999;
    display:none;
    flex-direction:column;
    animation:slideIn 0.3s ease-out;
">
    <!-- Header Section -->
    <div style="
        padding:16px;
        border-bottom:1px solid #e5e7eb;
        display:flex;
        justify-content:space-between;
        align-items:center;
        background:#f9fafb;
    ">
        <h3 style="margin:0;font-size:18px;font-weight:600;white-space:nowrap;">通知</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="notifMarkAllRead" class="btn btn-sm btn-outline-secondary" style="padding:4px 8px;font-size:11px;white-space:nowrap;">既読</button>
            <button id="notifClearBtn" class="btn btn-sm btn-outline-danger" style="padding:4px 8px;font-size:11px;color:#dc2626;border-color:#dc2626;white-space:nowrap;">クリア</button>
            <button id="notifCloseBtn" class="btn btn-sm btn-outline-secondary" style="padding:4px 8px;font-size:11px;width:32px;">×</button>
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
        <button class="notif-filter-btn active" data-filter="all">すべて</button>
        <button class="notif-filter-btn" data-filter="orders">注文</button>
        <button class="notif-filter-btn" data-filter="users">ユーザー</button>
    </div>
    
    <!-- Notifications List (dynamically populated) -->
    <div id="notificationsList" style="flex:1;overflow-y:auto;padding:0;"></div>
    
    <!-- Empty State -->
    <div id="notificationsEmpty" style="
        flex:1;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#999;
        font-size:14px;
    ">通知はありません</div>
</div>
```

### Individual Notification Item Rendering
**Location:** [js/notifications-firebase.js - renderNotificationItem()](js/notifications-firebase.js#L450)

```javascript
// Returns HTML like:
<div class="notification-item" data-id="{notif.id}" style="
    padding:12px 16px;
    border-bottom:1px solid #e5e7eb;
    background:{bgColor};                    // Varies by priority
    border-left:3px solid {borderColor};     // Color-coded by priority
    transition:background 0.2s;
    display:flex;
    gap:12px;
    align-items:flex-start;
">
    <div style="font-size:24px;flex-shrink:0;">{icon}</div>  <!-- 📦, 📝, 👤, etc -->
    <div style="flex:1;min-width:0;">
        <div style="font-weight:600;margin-bottom:4px;color:#1f2937;">{notif.title}</div>
        <div style="font-size:13px;color:#666;margin-bottom:6px;word-break:break-word;">{notif.message}</div>
        {detailsHTML}  <!-- Optional context info -->
        <div style="font-size:11px;color:#999;margin-top:6px;">{timeAgo}</div>
    </div>
    <div style="display:flex;gap:4px;flex-shrink:0;">
        {unreadIndicator}  <!-- Blue dot if unread -->
        <button class="notif-delete-btn">×</button>
    </div>
</div>
```

### Styling Color Mapping
```javascript
const colors = {
    critical: '#fecaca',      // Light red background
    warning: '#fed7aa',       // Light orange background
    info: '#bfdbfe'           // Light blue background
};

const borderColors = {
    critical: '#dc2626',      // Red left border
    warning: '#f59e0b',       // Orange left border
    info: '#3b82f6'           // Blue left border
};

const icons = {
    stock: '📦',
    order: '📝',
    ORDER: '📝',
    user: '👤'
};
```

### Details Section HTML (Optional)
```javascript
// Rendered only if notif.details exists
<div style="margin-top:8px; padding:8px; background:#f1f5f9; border-radius:4px; font-size:12px; line-height:1.6;">
    {conditionally includes:}
    <div><strong>カタログ:</strong> {details.catalogName}</div>
    <div><strong>数量:</strong> {details.quantity}</div>
    <div><strong>注文者:</strong> {details.requester}</div>
    <div><strong>日付:</strong> {details.date}</div>
    <div><strong>場所:</strong> {details.location}</div>
    <div><strong>アイテム数:</strong> {details.items}</div>
</div>
```

### Trigger Button (HTML)
**Location:** [index.html - line 98](index.html#L98)

```html
<button class="icon-btn" title="Notifications">
    <i class="fas fa-bell"></i>
</button>
```

---

## 5. NOTIFICATION STORAGE IN FIREBASE

### Firebase Structure
```
Database/
├── Notifications/
│   ├── user_at_example_com/           (encoded email)
│   │   ├── {pushId1}: {notification}
│   │   ├── {pushId2}: {notification}
│   │   └── ...
│   └── admin_at_company_com/          (encoded email)
│       ├── {pushId1}: {notification}
│       └── ...
└── Orders/
    ├── {orderId1}: {orderData}
    ├── {orderId2}: {orderData}
    └── ...
```

### Key Points
- Notifications are stored **per admin user** (encoded email as path)
- Email encoding: `user@example.com` → `user_at_example_com`
- Each notification gets a unique Firebase push ID
- Real-time listener updates UI when new notifications arrive

---

## 6. NOTIFICATION LIFECYCLE

### Creation Flow
1. **Order Placed** → User calls `checkoutCart()` or creates single order
2. **Order Data Saved** → Firebase `Orders/{orderId}` collection updated
3. **Notification Triggered** → `addNotification()` called with order details
4. **Admin Query** → System retrieves all admin emails from `Users` collection
5. **Broadcast** → Notification saved to each admin's `Notifications/{email}/{pushId}`
6. **Real-time Update** → Admin listener receives update, displays badge count
7. **Display** → Notification renders in notification center with priority color coding

### Display Flow
1. User clicks bell icon
2. `toggleNotificationCenter()` opens side panel
3. `renderNotifications()` fetches from `notificationsData` array
4. Notifications grouped by "New" (today) vs "Earlier" (before today)
5. Each notification rendered with:
   - Priority-based background color
   - Type-based icon (📦, 📝, 👤)
   - Title and message
   - Optional details box
   - Time ago indicator
   - Unread indicator (blue dot)
   - Delete button

### State Management
- **notificationsData[]** - In-memory array of notification objects
- **notificationBadgeCount** - Count of unread notifications
- **currentUserEmail** - Current logged-in user email
- **notificationsListener** - Real-time Firebase listener reference

---

## 7. KEY FUNCTIONS

| Function | Location | Purpose |
|----------|----------|---------|
| `addNotification()` | notifications-firebase.js:340 | Create and broadcast notification to admins |
| `initNotificationSystem()` | notifications-firebase.js:68 | Initialize UI, listeners, permissions |
| `loadNotificationsFromFirebase()` | notifications-firebase.js:330 | Set up real-time listener on user's notifications |
| `renderNotifications()` | notifications-firebase.js:363 | Build HTML and display notification list |
| `renderNotificationItem()` | notifications-firebase.js:450 | Create single notification item HTML |
| `markAsRead()` | notifications-firebase.js:495 | Update notification read status in Firebase |
| `deleteNotification()` | notifications-firebase.js:510 | Remove notification from Firebase and UI |
| `filterNotifications()` | notifications-firebase.js:515 | Filter by type (all/orders/users) |

---

## 8. CURRENT USAGE EXAMPLES

### In checkoutCart() - Line 758
**Trigger:** User completes batch order checkout
```javascript
addNotification({
    type: 'order',
    priority: 'info',
    title: '📦 一括注文が完了しました',
    message: `${shoppingCart.length}件の注文が登録されました`,
    details: {
        items: shoppingCart.length,
        date: new Date().toLocaleDateString('ja-JP'),
        requester: currentUser?.email || 'Unknown'
    }
});
```

### In Quick Add Order - Line 2782
**Trigger:** User adds single product to orders
```javascript
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
```

---

## 9. INTEGRATION NOTES

### How to Extend
To add Order ID tracking to notifications:
1. Capture `orderId` when creating orders in `checkoutCart()`
2. Add to `notification.details.orderId` or `notification.details.orderIds[]` for batch
3. Modify `renderNotificationItem()` to display or link to order ID
4. Consider adding a click handler to navigate to order details

### Current Gaps
- ❌ No direct Order ID in notification details
- ❌ No click-to-order-details functionality
- ⚠️ Notifications only sent to admins (from `Users` collection with `role === 'admin'`)
- ⚠️ No persistence of notification-order relationship for historical queries
