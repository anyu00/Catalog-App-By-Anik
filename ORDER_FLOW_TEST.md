# Order Flow Test Checklist

## Data Collection & Placement
- [x] **Place Order Modal** collects:
  - Catalog name (selected from product grid)
  - Quantity
  - Department (部署名)
  - Requester (発注者) - REQUIRED
  - Address (住所)
  - Message (optional)

- [x] **Cart Display** shows:
  - Catalog name
  - Department | Requester | Address
  - Quantity controls
  - Message preview

- [x] **Checkout** creates orders with:
  ```javascript
  {
    CatalogName: item.catalogName,
    OrderQuantity: item.quantity,
    RequesterDepartment: item.department,
    Requester: item.requester,
    RequesterAddress: item.address,
    Message: item.message,
    OrderDate: date,
    CreatedAt: timestamp,
    Fulfilled: false
  }
  ```

## Display in Tables

### 1. Catalog-Based View (カタログ別)
- [ ] Table headers: カタログ名, 注文数量, 部署名, 発注者, 住所, メッセージ, 操作
- [ ] Rows show all order fields correctly
- [ ] Filter by 発注者 works
- [ ] Add new order button works

### 2. Date-Based View (日付別)
- [ ] Grouped by CreatedAt date
- [ ] Shows: 数量 • 部署 • 発注 • 住所
- [ ] Fulfillment checkbox works
- [ ] Color codes: green (fulfilled) / red (pending)

## Notifications
- [ ] Cloud Function notifyAdminsOfNewOrder triggered
- [ ] Notification includes order details
- [ ] Admin receives push notification

## Exports
- [ ] CSV export includes new columns
- [ ] PDF export includes new fields

---

## Testing Steps:
1. Hard reload browser
2. Go to "注文する" page
3. Select a catalog
4. Fill in ALL fields:
   - 数量: 5
   - 部署名: IT部
   - 発注者: 田中
   - 住所: 東京都渋谷区
5. Add to cart
6. Checkout
7. Go to "注文エントリ" page
8. Verify order appears in カタログ別 and 日付別 views
9. Check all fields are displayed correctly
