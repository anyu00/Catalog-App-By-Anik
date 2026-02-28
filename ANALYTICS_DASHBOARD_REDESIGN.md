# Analytics Dashboard Redesign Summary

## Overview
The analytics dashboard has been completely redesigned to provide **admin-focused, customizable, data-rich visualizations** with emphasis on catalog-based and time-based analysis. The new design enables administrators to see maximum data at a glance with flexible configuration options.

## Key Improvements

### 1. **New Grid-Based Layout**
- **Responsive CSS Grid**: `display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr))`
- **Full Width Cards**: Catalog cards span 2 columns for better readability
- **Flexible Spacing**: 20px gap between cards with consistent padding
- **Better Visual Hierarchy**: Improved card headers with icons and styling

### 2. **Expanded Card Portfolio** (10 total cards, up from 7)

#### **Catalog-Based Analytics (3 cards)**
1. **カタログ別在庫** (Stock by Item)
   - Horizontal bar chart showing stock quantity per catalog
   - Displays percentage of total stock in tooltip
   - Sorted by quantity (descending)
   - Width: 2 columns

2. **カタログ別注文** (Orders by Item)
   - Vertical bar chart of order count per catalog
   - Shows demand/popularity of each catalog
   - Width: 2 columns

3. **カタログ比較 (在庫vs注文)** (Catalog Comparison) **[NEW]**
   - Side-by-side comparison of stock vs order count
   - Identifies inventory imbalances at a glance
   - Grouped bar chart for easy correlation
   - Width: 2 columns

#### **Time-Based Analytics (3 cards)**
1. **在庫トレンド** (Stock Trend)
   - Line chart showing total inventory over 30 days
   - Identifies upward/downward trends
   - Width: 2 columns

2. **注文トレンド** (Order Trend) **[NEW]**
   - Line chart of daily order count over time
   - Shows order frequency patterns
   - Useful for capacity planning
   - Width: 2 columns

3. **日次活動** (Daily Activity) **[NEW]**
   - Dual-axis bar chart combining order count and quantity
   - Left Y-axis: order count
   - Right Y-axis: order quantity
   - Width: 2 columns

#### **Threshold & Alert Cards (2 cards)**
1. **在庫不足アイテム (< 閾値)** (Low Stock Items)
   - Color-coded list with progress bars
   - Red (< 25%) = 🔴 Critical
   - Orange (25-100%) = ⚠️ Warning
   - Green (> 100%) = ✓ Sufficient
   - Width: 1 column

2. **販売数の多いアイテム (> 閾値)** (Fast Moving Items)
   - Horizontal bar chart of high-demand items
   - Threshold-based filtering
   - Width: 1 column

#### **Distribution & Requester Cards (2 cards)**
1. **トップリクエスター** (Top Requesters)
   - Doughnut chart of top 10 requesters
   - Shows relative request volume
   - Width: 1 column

2. **配分先分析** (Distribution Analysis)
   - Pie chart of stock distribution by destination
   - Spatial analysis of inventory
   - Width: 1 column

---

## Technical Implementation

### Data Structure
```javascript
const ANALYTICS_CARDS = [
    { 
        key: 'stockByItem',           // Unique identifier
        label: '...',                  // Japanese label
        icon: 'fa-...',               // FontAwesome icon
        category: 'catalog',           // Category for filtering
        width: '2'                     // CSS grid column span
    },
    // ... more cards
];
```

### Responsive Layout CSS
```css
#analyticsCards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    padding: 20px;
}

.analytics-card[style*="grid-column: span 2"] {
    grid-column: span 2;  /* Wide cards span 2 columns */
}
```

### Chart.js Integration
- All charts use `responsive: true` and `maintainAspectRatio: false`
- Container height set to 300px for consistency
- Charts destroyed and recreated on data updates (prevents memory leaks)

### Data Preprocessing
```javascript
// Example: Stock by Catalog aggregation
const byItem = {};
Object.values(catalogData).forEach(e => {
    byItem[e.CatalogName] = (byItem[e.CatalogName] || 0) + Number(e.StockQuantity || 0);
});
// Results in: { "JL-1001": 150, "JL-1002": 200, ... }
```

---

## Customization Features

### Admin Controls
1. **Customize Button**: Opens modal with checkbox list of all cards
2. **Persistence**: Selected cards stored in `localStorage['analyticsSelection']`
3. **Default Behavior**: All cards shown on first visit
4. **Flexible Updates**: Customization takes effect immediately on save

### Date Range Filtering
- **Presets**: Today, Last 7 days, Last 30 days, Last 90 days
- **Custom Range**: Arbitrary date selection via date inputs
- **Dynamic Updates**: Charts update based on selected range
- **Stored in UI**: Range filters read from `#analyticsDateStart`, `#analyticsDateEnd`

```javascript
// Date range determination logic (used in all time-based cards)
let startDate, endDate;
if (dateFrom && dateTo) {
    startDate = new Date(dateFrom);
    endDate = new Date(dateTo);
} else {
    endDate = new Date();
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);  // Default: 30 days
}
```

---

## Usage Flow

### 1. **View Analytics**
- Navigate to "分析" tab
- All enabled cards render automatically
- Charts load with real-time data from Firebase

### 2. **Filter by Date Range**
- Select preset from `analyticsDatePreset` dropdown
- OR manually enter start/end dates
- Charts re-render with filtered data

### 3. **Customize Dashboard**
- Click "カスタマイズ" button
- Check/uncheck cards to show/hide
- Click "保存" to apply (cards saved to localStorage)
- Charts re-render with selected cards only

### 4. **Interpret Graphics**
- **Horizontal bar charts**: Sort by highest values
- **Trend lines**: Identify inflection points
- **Progress bars**: Quick visual status check
- **Doughnut/Pie charts**: Relative proportion analysis

---

## Real-Time Data Integration

### Data Sources
1. **CatalogDB**: Object with all catalog entries and current stock levels
   ```javascript
   CatalogDB = {
       "JL-1001": {
           key: "JL-1001",
           name: "商品名",
           stock: 150,
           entries: { ... }
       },
       ...
   }
   ```

2. **OrdersData**: Global object populated from Firebase Orders/ listener
   ```javascript
   OrdersData = {
       "order1": {
           CatalogName: "JL-1001",
           OrderQuantity: 5,
           OrderDate: "2025-01-20",
           Requester: "田中",
           ...
       },
       ...
   }
   ```

### Real-Time Listeners
```javascript
// Triggered on tab switch to 分析 (Analytics)
setupOrdersListenerForAnalytics()  // Orders/ listener
setupCatalogDBListenerForAnalytics()  // Catalogs/ listener

// When tab becomes visible, automatically re-render
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && analyticsTabVisible) {
        fetchAndRenderAnalytics();
    }
});
```

---

## Chart Configuration Details

### Stock by Item (Horizontal Bar)
```javascript
new Chart(canvas, {
    type: 'bar',
    options: {
        indexAxis: 'y',          // Horizontal bars
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { beginAtZero: true } }
    }
});
```

### Daily Activity (Dual-Axis)
```javascript
scales: {
    y: { position: 'left', title: { text: '注文数' } },
    y1: { position: 'right', title: { text: '注文数量' }, gridLines: false }
}
// Allows comparing two metrics with different scales
```

### Distribution (Pie Chart)
```javascript
new Chart(canvas, {
    type: 'pie',
    options: { legend: { position: 'bottom' } }
});
```

---

## Threshold Configuration

### Global Thresholds (Managed in Admin Settings)
```javascript
analyticsSettings = {
    globalLowStockThreshold: 10,        // Items below this = 在庫不足
    globalHighStockThreshold: 100,      // Items above this = 安全在庫
    globalFastMovingDefinition: 50,     // Items with >= this orders in period
    perItemOverrides: {
        "JL-1001": { lowStock: 5, highStock: 200 },
        // ... per-catalog customization
    }
};
```

### Lookup Function
```javascript
function getItemThreshold(catalogName, type) {
    const override = analyticsSettings.perItemOverrides?.[catalogName];
    if (type === 'low') {
        return override?.lowStock || analyticsSettings.globalLowStockThreshold;
    }
    return override?.highStock || analyticsSettings.globalHighStockThreshold;
}
```

---

## Error Handling

### Graceful Degradation
```javascript
try {
    // Render card
} catch (err) {
    console.error(`Error rendering ${card.key}:`, err);
    container.innerHTML = '<div style="padding:20px;color:#e74c3c;">エラーが発生しました</div>';
}
```

### Empty Data States
```javascript
if (Object.keys(byItem).length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">カタログデータがありません</div>';
    return;
}
```

---

## Performance Optimizations

1. **Chart Destruction**: `window.chartName.destroy()` prevents memory leaks
2. **Event Delegation**: Single listener for tab visibility
3. **Responsive Images**: Charts auto-resize with container
4. **Lazy Loading**: Analytics only render when tab is active
5. **Data Aggregation**: Pre-computed sums reduce loop iterations

---

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **CSS Grid**: Supported in all modern browsers
- **CSS Fallback**: Flex layout as fallback for older browsers
- **Chart.js**: v3.9+ (responsive and accessible)

---

## Future Enhancement Opportunities

1. **Excel Export**: Add button to export analytics to CSV/XLSX
2. **Alert Rules**: Automatic notifications when metrics cross thresholds
3. **Forecasting**: Predict future stock levels based on trends
4. **Comparison Mode**: Compare two date ranges side-by-side
5. **Custom Thresholds**: UI for per-item threshold configuration
6. **Scheduled Reports**: Email analytics summary at regular intervals
7. **Mobile Dashboard**: Simplified card layout for mobile devices

---

## Testing Checklist

- [ ] All 10 cards render without JavaScript errors
- [ ] Grid layout responsive on desktop/tablet/mobile
- [ ] Date range filtering updates all time-based charts
- [ ] Customization modal saves/loads from localStorage
- [ ] Real-time updates when new orders added
- [ ] Empty state messages display when no data
- [ ] Charts destroy/recreate without memory leaks
- [ ] Threshold overrides apply correctly per catalog
- [ ] Percentage tooltips show on bar charts
- [ ] Legend toggles work on pie/doughnut charts

---

## Commits

1. **326c20c**: Enhancement - Redesign analytics dashboard with grid layout
2. **7131b4c**: Fix - Remove typo from analytics customization modal handler

---

## Summary

The redesigned analytics dashboard transforms a basic 7-card layout into a **comprehensive admin tool** with:
- ✅ **10 data-rich visualizations** covering catalogs, trends, and alerts
- ✅ **Responsive grid layout** automatically adapting to screen size
- ✅ **Customizable card visibility** with localStorage persistence
- ✅ **Real-time data sync** from Firebase listeners
- ✅ **Professional styling** with improved accessibility
- ✅ **Sophisticated data aggregation** for actionable insights

This dashboard enables administrators to **make data-driven decisions** by visualizing:
- Which catalogs are overstocked/understocked
- Trending order patterns
- Fast-moving items requiring more stock
- Requester behavior and preferences
- Distribution alignment with demand
