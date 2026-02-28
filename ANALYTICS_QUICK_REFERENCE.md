# Analytics Dashboard - Quick Reference Card

## 🎯 What's New

✅ **10 Analytics Cards** (up from 7)  
✅ **Grid Responsive Layout** (auto-adapts to screen)  
✅ **3 New Visualizations** (Catalog Comparison, Order Trend, Daily Activity)  
✅ **Customizable Display** (toggle cards on/off)  
✅ **Real-Time Data** (live updates from Firebase)

---

## 📊 The 10 Cards at a Glance

### Catalog Analytics (Top Row - Full Width Cards)
```
█ Stock by Item       │ Orders by Item      │ Catalog Comparison
  Inventory levels    │ Demand by item      │ Stock vs Orders
```

### Time Trends (Middle Row - Full Width Cards)
```
█ Stock Trend         │ Order Trend         │ Daily Activity
  30-day inventory    │ Daily order count   │ Orders + quantity
```

### Alerts & Behavior (Bottom Row - Compact Cards)
```
█ Low Stock    │ Fast Moving  │ Top Requesters │ Distribution
  Alert list   │ High demand  │ Rankings       │ Location map
```

---

## 🎮 How to Use

### View Analytics
1. Click **分析** (Analytics) tab
2. All data loads automatically
3. Charts update in real-time

### Filter by Date
```
【プリセット選択】 ▼
 ├ 今月
 ├ 過去7日
 ├ 過去30日
 ├ 過去90日
 └ カスタム範囲
```
→ Charts update instantly

### Customize Cards
1. Click **カスタマイズ** button
2. Check/uncheck cards
3. Click **保存**
4. Your selection saves automatically

---

## 📈 Quick Interpretation Guide

| Chart Type | Look For | What It Means |
|-----------|----------|---------------|
| **Horizontal Bar** | Bar length | Longer = higher value |
| **Vertical Bar** | Bar height | Taller = higher value |
| **Line Chart** | Trend direction | ↑ up = increase; → flat = stable |
| **Progress Bar** | Red vs Green | Green ✓ good; Red 🔴 alert |
| **Doughnut** | Slice size | Bigger slice = larger portion |

---

## 🚨 Alert Meanings

### In "Low Stock Items" Card

```
🔴 Urgent (Red)       ⚠️ Warning (Orange)   ✓ Sufficient (Green)
< 25% of threshold    25-100% of threshold  > 100% of threshold
Order IMMEDIATELY     Monitor closely       All good
```

---

## 💡 Common Uses

### "When should I reorder?"
→ Check **Low Stock Items** (🔴 = order now)

### "Is demand increasing?"
→ Check **Order Trend** (line going 📈)

### "Which items are popular?"
→ Check **Fast Moving Items** (longest bars)

### "Is stock running out?"
→ Check **Stock Trend** (line going 📉)

### "Who orders the most?"
→ Check **Top Requesters** (largest slice)

---

## ⚙️ Configuration (Admin Only)

### Default Thresholds
```
Low Stock:       < 10 units
High Stock:      > 100 units
Fast Moving:     > 50 orders/30 days
```

To change, contact your system administrator.

---

## 🔄 Data Sources

- **Stock Data**: From カタログ情報 page
- **Order Data**: From カタログ注文 entries
- **Updates**: In real-time from Firebase
- **Sync**: Automatic when switching to Analytics tab

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| No data showing | Switch tabs and back; Verify catalog entries exist |
| Charts look wrong | Click another card then back; Try refreshing |
| Date filter not working | Check dates in correct order (start < end) |
| Customization not saving | Enable browser localStorage; Refresh page |

---

## 📚 Full Documentation

- **Technical Details**: ANALYTICS_DASHBOARD_REDESIGN.md
- **User Guide**: ANALYTICS_USER_GUIDE.md
- **Completion Report**: ANALYTICS_COMPLETION_REPORT.md

---

## 🎯 Key Features

✅ **Responsive**: Works on desktop, tablet, mobile  
✅ **Real-Time**: Data updates automatically  
✅ **Customizable**: Show/hide cards as needed  
✅ **Smart Layout**: Wide cards (2 cols) vs compact cards (1 col)  
✅ **Date Range Filtering**: Presets or custom dates  
✅ **Error Handling**: Graceful fallback if data missing  

---

## 📱 Mobile View

All cards stack into single column automatically  
Touch-friendly customization modal  
Charts scale responsively  

---

## 🔐 Data Privacy

- Your customization (card selection) saved locally only
- All users see same real-time data
- No data export/sharing without admin approval

---

## 🚀 Performance

- Charts pre-computed (not live calculations)
- Data aggregated efficiently
- Memory leaks prevented (charts destroyed/recreated safely)
- Real-time updates throttled to tab visibility

---

**Created**: 2025-01-22  
**Version**: 2.0 (Grid-based redesign)  
**Status**: ✅ Active & Maintained
