# Analytics Dashboard - User Guide

## Overview
The **Analytics Dashboard** provides real-time insights into inventory levels, order patterns, and distribution metrics. All data is automatically synced from the Catalog Entry system and updates in real-time.

---

## Accessing Analytics

1. Navigate to the **分析** (Analytics) tab in the main menu
2. Charts load automatically with current data
3. All 10 analytics cards display by default

---

## Dashboard Structure

### Catalog Overview (Top Row)
The first three cards show catalog-focused metrics:

#### 1️⃣ **カタログ別在庫** (Stock by Item)
- **What it shows**: How much stock each catalog currently has
- **Use it to**: Identify which items have the most/least inventory
- **Reading tip**: Items on the right have higher stock levels
- **Insight**: Longer bars = better supply; short bars = stock running low

#### 2️⃣ **カタログ別注文** (Orders by Item)
- **What it shows**: How many orders each item has received
- **Use it to**: Understand demand for each catalog
- **Reading tip**: Taller bars = more orders; popular items need more stock
- **Insight**: Match order volume with stock levels

#### 3️⃣ **カタログ比較 (在庫vs注文)** (Catalog Comparison)
- **What it shows**: Side-by-side comparison of stock vs order count
- **Use it to**: Spot imbalances (high orders but low stock, or vice versa)
- **Reading tip**: 
  - 青 (Blue) = Stock quantity
  - 紫 (Purple) = Order count
- **Insight**: Balance inventory with demand

---

### Time-Based Trends (Middle Row)
The next three cards show patterns over time:

#### 4️⃣ **在庫トレンド** (Stock Trend)
- **What it shows**: Total inventory levels over the last 30 days
- **Use it to**: Track if stock is increasing, decreasing, or stable
- **Reading tip**: 
  - Line going up = more stock being added
  - Line going down = more orders being fulfilled
  - Flat line = balanced in/out flow
- **Insight**: Identify seasonal patterns or supply disruptions

#### 5️⃣ **注文トレンド** (Order Trend)
- **What it shows**: Number of orders per day
- **Use it to**: Forecast demand and plan resources
- **Reading tip**: Spikes = busy days; valleys = slow periods
- **Insight**: Plan staff/resources around peak demand days

#### 6️⃣ **日次活動** (Daily Activity)
- **What it shows**: Both order count AND order quantity per day
- **Use it to**: Understand daily workload (two metrics at once)
- **Reading tip**: 
  - 青 bars = number of orders
  - 緑 bars = total quantity ordered
- **Insight**: Some days have many small orders vs few large orders

---

### Alerts & Thresholds (Bottom Left)
Two cards that flag items needing attention:

#### 7️⃣ **在庫不足アイテム** (Low Stock Items)
- **What it shows**: Items below the safe stock level
- **Colors**:
  - 🔴 **Red (Critical)**: < 25% of threshold
  - ⚠️ **Orange (Warning)**: 25-100% of threshold
  - ✓ **Green**: Not shown (sufficient stock)
- **Use it to**: Know when to reorder immediately
- **Progress bar**: Shows how depleted the item is
- **Example**: 
  ```
  JL-1002 🔴 緊急
  現在: 3 / 閾値: 10
  [==         ] 30%
  ```

#### 8️⃣ **販売数の多いアイテム** (Fast Moving Items)
- **What it shows**: Items with high sales velocity
- **Use it to**: Identify what's popular right now
- **Reading tip**: Longer bars = faster moving items
- **Insight**: Keep these items well-stocked

---

### Distribution & Behavior (Bottom Right)
Two cards analyzing broader patterns:

#### 9️⃣ **トップリクエスター** (Top Requesters)
- **What it shows**: Who's ordering the most (in a ranked doughnut chart)
- **Use it to**: Track key customers/departments
- **Reading tip**: Slice size = relative order volume
- **Insight**: Prioritize service to top requesters

#### 🔟 **配分先分析** (Distribution Analysis)
- **What it shows**: Where inventory goes (by destination/department)
- **Use it to**: Optimize distribution and allocation
- **Reading tip**: Larger slices = larger allocations
- **Insight**: Align stock with department demand

---

## Using Filters

### Date Range Selection

At the top of the dashboard, use the **日付範囲** (Date Range) selector:

```
【プリセット選択】 ▼
 - 今月
 - 過去7日
 - 過去30日
 - 過去90日
 - カスタム範囲
```

**Effects**:
- Changes all time-based cards (Stock Trend, Order Trend, Daily Activity)
- Threshold cards are unaffected (lock to current snapshot)
- All charts update instantly when selection changes

**Custom Range**:
1. Select "カスタム範囲" from dropdown
2. Click start date input
3. Click end date input
4. Charts update automatically

---

## Customizing Your View

### Show/Hide Cards

1. Click **カスタマイズ** button (top right)
2. Modal opens with checklist of all 10 cards
3. Check/uncheck cards to show/hide
4. Click **保存** to apply

```
☑ カタログ別在庫
☑ カタログ別注文
☑ カタログ比較
☐ 在庫トレンド    (hidden)
☑ 注文トレンド
```

Your selection is saved: next time you visit, your custom layout loads automatically.

---

## Interpreting the Data

### What Each Chart Type Means

| Chart Type | What to Look For | Healthy Signal |
|----------|------------------|-----------------|
| **Bar Chart** | Length/height of bars | Even distribution across items |
| **Line Chart** | Direction of line | Slight upward or flat trend |
| **Progress Bar** | Red vs green fill | Mostly green (above threshold) |
| **Doughnut/Pie** | Slice sizes | No single item dominates (unless intentional) |
| **Dual-axis** | Two bar sets together | Values scale appropriately |

---

## Common Scenarios

### Scenario 1: "Stock is Running Low on JL-1002"
1. Look at **在庫不足アイテム** - See 🔴 Critical alert
2. Check **カタログ別注文** - Is it a popular item? (Long bar = yes)
3. Check **注文トレンド** - Is demand increasing? (Line trending up = yes)
4. **Action**: If popular + increasing demand → reorder immediately

### Scenario 2: "Daily Workload Is Very High"
1. Check **日次活動** - Are both bars tall?
2. Check **注文トレンド** - Is today an outlier? (Spike = yes)
3. **Action**: Plan extra staff for these peak days

### Scenario 3: "One Item Never Gets Ordered"
1. Check **カタログ別注文** - Is the bar very short or missing?
2. Check **販売数の多いアイテム** - Is it listed? (No = not fast-moving)
3. **Action**: Review if item is still needed; optimize shelf space

### Scenario 4: "Stock Levels Keep Dropping"
1. Check **在庫トレンド** - Is line going down? (Yes = depletion)
2. Check **注文トレンド** - Are orders increasing? (Yes = explain depletion)
3. **Action**: Increase reorder rate Or reduce allocation

---

## Real-Time Updates

The dashboard **automatically updates** when:
- ✅ New orders are added (Orders/ listener)
- ✅ Stock quantities change (Catalogs/ listener)
- ✅ You switch to the Analytics tab
- ✅ You change the date range

**No manual refresh needed** - all data flows in real-time from the database.

---

## Threshold Configuration

### Default Thresholds
```
在庫不足 (Low Stock):        10 units
高在庫 (High Stock):        100 units
販売数の多い (Fast Moving):   50+ orders/30 days
```

### Custom Thresholds (Admin Only)
Contact your administrator to adjust per-item thresholds if needed. Thresholds are stored in:
```
Settings/Analytics/perItemOverrides/{CatalogName}
```

---

## Tips & Tricks

### 💡 Tip 1: Use Presets for Quick Decisions
- **Last 7 days**: Check if this week is unusual
- **Last 30 days**: Typical monthly pattern
- **Last 90 days**: Seasonal trends

### 💡 Tip 2: Check Two Charts Together
- **Stock vs Orders** + **Stock Trend** → Understand if sufficient stock will last
- **Daily Activity** + **Order Trend** → Identify peak workload days
- **Low Stock** + **Fast Moving** → Prioritize reorders

### 💡 Tip 3: Export Data (Future)
The ability to export charts as images or CSV files is coming soon. Currently, you can screenshot cards for sharing.

### 💡 Tip 4: Set Bookmarks
Bookmark your preferred date range by modifying URL after selection (future enhancement).

---

## Troubleshooting

### ❌ No Data Showing
- **Check 1**: Switch to another tab, then back to Analytics to refresh
- **Check 2**: Verify catalog entries exist in カタログ情報 page
- **Check 3**: Check browser console (F12) for errors

### ❌ Charts Look Wrong
- **Fix**: Click another card, then click back - charts may redraw
- **Still wrong**: Try clearing localStorage and refreshing

### ❌ Date Filter Not Working
- **Check**: Dates are in correct order (start before end)
- **Try**: Click preset button instead of custom range

### ❌ Customization Not Saving
- **Check**: Browser localStorage is enabled
- **Try**: Open browser dev tools > Application > localStorage and verify 'analyticsSelection' key exists

---

## Frequently Asked Questions

**Q: Can I export the data?**  
A: Not yet - coming in a future update. For now, you can screenshot or manually copy numbers.

**Q: Why are threshold cards not affected by date range?**  
A: Because thresholds compare to live current stock, not historical data. Low/Fast-Moving status always shows against today's inventory.

**Q: Are other users seeing the same data?**  
A: Yes, all admins see identical real-time data from the shared Firebase database. Customizations (card selection) are per-user.

**Q: What if the data is wrong?**  
A: Analytics source data from:
- **Stock**: カタログ情報 page → CatalogDB cache → Analytics
- **Orders**: カタログ注文 entries → Firebase Orders/ → Analytics
Check the source data pages to verify accuracy there.

---

## Contact & Support

For analytics customization or issues:
1. Verify data in source pages (Catalogs, Orders)
2. Check admin settings for threshold values
3. Review [ANALYTICS_DASHBOARD_REDESIGN.md](./ANALYTICS_DASHBOARD_REDESIGN.md) for technical details
4. Contact system administrator if major issues persist

---

**Last Updated**: 2025-01-22  
**Dashboard Version**: 2.0 (Grid-based redesign with 10 cards)
