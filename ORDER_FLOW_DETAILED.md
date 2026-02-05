# Order Flow Troubleshooting Guide

## Complete Order Data Flow

### 1. ORDER PLACEMENT (注文する Page)
```
User fills form:
├── Catalog: Selected from grid
├── Quantity: 数量
├── Department: 部署名
├── Requester: 発注者 (REQUIRED)
├── Address: 住所
└── Message: メモ

↓

addToCart() stores in shoppingCart array:
{
  catalogName: "JL-1027",
  quantity: 5,
  department: "IT部",
  requester: "田中",
  address: "東京都渋谷区",
  message: "...",
  itemKey: "...",
  addedAt: "2025-02-05T..."
}

↓

updateCartUI() displays cart items with new fields
```

### 2. CHECKOUT (カートに追加 → 一括注文)
```
checkoutCart() creates Orders in Firebase:

for each cart item:
  POST to /Orders/{orderId}
  {
    CatalogName: item.catalogName,
    OrderQuantity: item.quantity,
    RequesterDepartment: item.department,    ← NEW FIELD
    Requester: item.requester,
    RequesterAddress: item.address,          ← NEW FIELD
    Message: item.message,
    OrderDate: "2025-02-05",
    CreatedAt: "2025-02-05T...",
    Fulfilled: false
  }

↓ Triggers Cloud Function:
  notifyAdminsOfNewOrder()
  ├── Fetch AdminTokens
  ├── Send FCM message with order data
  └── Auto-remove invalid tokens
```

### 3. DISPLAY IN 注文エントリ

#### View 1: カタログ別 (By Catalog)
```
renderOrderTablesAccordion():
├── GET /Orders/
├── Group by CatalogName
├── Filter by Requester (発注者)
└── Display table:
    ├── カタログ名
    ├── 注文数量
    ├── 部署名         ← NEW
    ├── 発注者         ← UPDATED LABEL
    ├── 住所           ← NEW
    ├── メッセージ
    └── 操作

Features:
- Expandable sections per catalog
- Add/Delete/Edit order rows
- Update fields in Firebase
```

#### View 2: 日付別 (By Date)
```
renderOrdersByDate():
├── GET /Orders/
├── Group by CreatedAt (YYYY-MM-DD)
├── Sort descending (newest first)
└── Display collapsible sections:
    ├── Date header with stats
    │   └── Count, Total Qty, Fulfilled count
    └── Orders list with:
        ├── Catalog name
        ├── Quantity • Department • Requester • Address
        ├── Fulfillment checkbox
        └── Status badge (✅ Complete / ⏳ Pending)

Features:
- Toggle fulfillment status
- Color-coded (green/red)
- Real-time updates
```

---

## ✅ Quality Checklist

- [x] Order data structure complete (all 9 fields)
- [x] Cart display shows department + requester + address
- [x] Checkout saves all fields to Firebase
- [x] Cloud Function includes new fields in notifications
- [x] Catalog-based table headers updated
- [x] Catalog-based table rows display new fields
- [x] Date-based view displays new fields
- [x] Sample data generation includes new fields
- [x] CSV/PDF exports include new fields
- [x] All filter labels updated (依頼者 → 発注者)
- [x] All form labels updated (依頼者 → 発注者)

---

## 🧪 Manual Testing Steps

1. **Hard Reload**
   ```
   Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   ```

2. **Clear Cache** (if needed)
   ```
   DevTools → Application → Cache Storage → Delete all
   ```

3. **Test Order Placement**
   - Click "注文する"
   - Select any catalog
   - Fill all fields:
     - 数量: 3
     - 部署名: 営業部
     - 発注者: 佐藤
     - 住所: 大阪府
   - Click "カートに追加"
   - Verify cart shows all fields

4. **Test Checkout**
   - Click "一括注文"
   - Wait for success message
   - Check browser console for errors

5. **Test Display**
   - Go to "注文エントリ"
   - Check "カタログ別" tab:
     - Expand a catalog section
     - Verify all 5 new columns appear
     - Verify data matches what you entered
   - Check "日付別" tab:
     - Find today's date section
     - Verify order shows with all fields
     - Try checkbox to mark fulfilled

6. **Test Notifications** (Admin only)
   - Keep browser open
   - Place new order from another browser/device
   - Watch for push notification
   - Click notification to navigate to orders

7. **Test Exports**
   - Click "CSV Export"
   - Verify new columns in downloaded file
   - Click "PDF Export"
   - Verify new fields in PDF

---

## 🔍 Debugging

If orders don't appear:

### Check 1: Browser Console
```javascript
// View all orders
firebase.database().ref('Orders/').get().then(snap => {
  console.log('All Orders:', snap.val());
});

// View last created order
firebase.database().ref('Orders/').limitToLast(1).get().then(snap => {
  console.log('Latest Order:', snap.val());
});
```

### Check 2: Network Tab
- Click "一括注文"
- Open DevTools → Network
- Look for successful POST to Firebase
- Check response has order data

### Check 3: Firebase Console
- Go to https://console.firebase.google.com
- Select project: catalog-app-by-anik
- Go to Realtime Database
- Check Orders node
- Verify fields are being saved

### Check 4: Local Storage
```javascript
// View cart data before checkout
console.log(localStorage);
console.log(sessionStorage);
```

---

## 📊 Order Fields Reference

| Field | Type | Required | Source | Display |
|-------|------|----------|--------|---------|
| CatalogName | string | Yes | Selected product | カタログ名 |
| OrderQuantity | number | Yes | User input | 注文数量 |
| RequesterDepartment | string | No | User input | 部署名 |
| Requester | string | Yes | User input | 発注者 |
| RequesterAddress | string | No | User input | 住所 |
| Message | string | No | User input | メッセージ |
| OrderDate | string | Auto | Date.now() | - (internal) |
| CreatedAt | timestamp | Auto | Date.now() | Used for grouping |
| Fulfilled | boolean | Auto | false | Status |

---

## 🚀 Recent Changes (2025-02-05)

1. Added RequesterDepartment, RequesterAddress fields to:
   - Order form (index.html)
   - Cart data structure (addToCart)
   - Checkout creation (checkoutCart)
   - Order table display (renderOrderTablesAccordion)
   - Date-based view (renderOrdersByDate)
   - Cloud Function (index.js)
   - Sample data generation
   - CSV/PDF exports

2. Updated labels:
   - 依頼者 → 発注者 everywhere
   - フィルター (依頼者) → フィルター (発注者)

3. Updated tables to show:
   - カタログ別: 5 new columns
   - 日付別: Department, Requester, Address inline

---

## 📝 File Changes Summary

**index.html**
- Form fields: Added RequesterDepartment, RequesterAddress
- Modal fields: Added placeOrderModalDepartment, placeOrderModalAddress
- Event detail modal: Added eventRequesterDepartment, eventRequesterAddress

**js/main.js**
- addToCart(): Added department, address parameters
- submitPlaceOrder(): Collect 6 fields instead of 2
- checkoutCart(): Save all fields to Firebase
- renderOrderTablesAccordion(): Updated table with 5 new columns
- renderOrdersByDate(): Already shows new fields inline
- Sample data: Added departments and addresses

**js/i18n.js**
- Updated translations for 依頼者 → 発注者
- Added translations for 部署名 and 住所

**functions/index.js**
- notifyAdminsOfNewOrder(): Include new fields in notification data

---

## ✨ Next Steps

If everything works:
1. Test with actual users
2. Monitor push notifications
3. Check export formats match requirements
4. Train users on new fields

If issues remain:
1. Check browser console for errors
2. Verify Firebase rules allow Orders write
3. Check Cloud Function logs in Firebase Console
4. Use "Generate Sample Orders" button to test display
