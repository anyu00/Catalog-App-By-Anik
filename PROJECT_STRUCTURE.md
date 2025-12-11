# 📂 Project Structure Guide

## Directory Tree (Final Version)

```
WebDevPro/
└── Basics/
    ├── 📄 index.html                    ← Main HTML file (130 lines)
    │   ├─ CDN libraries (jQuery, Bootstrap, etc)
    │   ├─ <div class="sidebar"> 
    │   ├─ <div class="main-content-shell">
    │   └─ <script type="module" src="js/main.js">
    │
    ├── 📁 css/
    │   └── 📄 styles.css               ← All CSS styles (400 lines)
    │       ├─ Gradient background
    │       ├─ Glass effect (glass-card, glass-table)
    │       ├─ Sidebar + Icon buttons
    │       ├─ Forms (form-group, form-control)
    │       ├─ Tables (glass-table, cell-updated)
    │       └─ @media (max-width: 900px) 
    │           ├─ Hamburger menu (position: fixed)
    │           ├─ sidebar.open (slide-in)
    │           ├─ mobile-overlay
    │           └─ Responsive layout
    │
    ├── 📁 js/
    │   ├── 📄 main.js                  ← Main app logic (550 lines)
    │   │   ├─ Firebase initialization (firebaseConfig, initializeApp, getDatabase)
    │   │   ├─ Tab switching (initTabSwitching)
    │   │   ├─ Catalog form (initCatalogForm)
    │   │   │   ├─ Input validation
    │   │   │   ├─ Firebase set (new save)
    │   │   │   └─ Form reset
    │   │   ├─ Order form (initOrderForm)
    │   │   │   ├─ Rich text support
    │   │   │   └─ Firebase set
    │   │   ├─ Table rendering (renderCatalogTablesAccordion, renderOrderTablesAccordion)
    │   │   │   ├─ Accordion UI
    │   │   │   ├─ onValue (real-time sync)
    │   │   │   └─ Excel-style calculation (cumulative stock)
    │   │   ├─ Inline editing ($(document).on('click', '.editable'))
    │   │   │   ├─ Cell click → input display
    │   │   │   ├─ Enter/Escape key handling
    │   │   │   └─ Firebase update
    │   │   ├─ Data deletion (delete-row, delete-order-row)
    │   │   ├─ Sample data generation (generateSampleCatalogBtn)
    │   │   ├─ Delete all data (deleteAllCatalogBtn, deleteAllOrderBtn)
    │   │   ├─ Analytics dashboard (renderAnalyticsDashboard)
    │   │   │   ├─ Total stock (totalStock)
    │   │   │   ├─ Total orders (totalOrders)
    │   │   │   ├─ Average order quantity (avgOrderQty)
    │   │   │   ├─ Chart rendering (Chart.js)
    │   │   │   │   ├─ stockByItem (bar chart)
    │   │   │   │   └─ ordersByItem (bar chart)
    │   │   │   └─ Customization modal
    │   │   ├─ Date filter (analyticsDatePreset)
    │   │   ├─ Calendar (initializeCalendar)
    │   │   │   ├─ FullCalendar initialization
    │   │   │   ├─ Event loading
    │   │   │   └─ Click handlers
    │   │   ├─ Mobile menu (initMobileToggle)
    │   │   │   ├─ Hamburger button
    │   │   │   ├─ sidebar.classList.toggle('open')
    │   │   │   └─ overlay.classList.toggle('show')
    │   │   └─ Rich text formatting (formatOrderMsg)
    │   │
    │   ├── 📄 firebase-config.js       ← Firebase config (19 lines)
    │   │   ├─ firebaseConfig object
    │   │   ├─ initializeApp(firebaseConfig)
    │   │   └─ export { db }
    │   │
    │   ├── 📄 firebase-utils.js        ← CRUD helper functions (150 lines) 
    │   │   ├─ saveCatalog(id, data)
    │   │   ├─ fetchAllCatalogs()
    │   │   ├─ deleteCatalog(id)
    │   │   ├─ onCatalogsChange(callback)
    │   │   ├─ saveOrder(id, data)
    │   │   ├─ fetchAllOrders()
    │   │   ├─ deleteOrder(id)
    │   │   ├─ onOrdersChange(callback)
    │   │   ├─ generateSampleCatalogs()
    │   │   ├─ generateSampleOrders()
    │   │   ├─ clearAllCatalogs()
    │   │   └─ clearAllOrders()
    │   │
    │   └── 📄 app.js                  ← Tab switching & initialization (100 lines)
    │       ├─ initTabSwitching()
    │       ├─ initDataManagement()
    │       └─ initApp()
    │
    ├── 📁 src/ (Reserved for future)
    │   └── pages/ (Reserved for future)
    │       └── dashboard.html (empty)
    │
    ├── 📚 Documentation
    ├── 📄 README.md                   ← Usage & features
    ├── 📄 MODULARIZATION_SUMMARY.md   ← Modularization details
    └── 📄 COMPLETION_CHECKLIST.md     ← Completion checklist
```

---

## 📊 File Size List

| File | Lines | Purpose |
|------|-------|---------|
| index.html | 130 | HTML Markup |
| css/styles.css | 400 | CSS Styles |
| js/main.js | 550 | Main Logic |
| js/firebase-config.js | 19 | Firebase Config |
| js/firebase-utils.js | 150 | CRUD Helpers |
| js/app.js | 100 | Initialization |
| **Total** | **1,360** | **All** |

---

## 🎯 File Responsibilities & Relationships

### Execution Flow

```
1. Browser loads index.html
   ↓
2. External libraries load (jQuery, Bootstrap, Chart.js, FullCalendar)
   ↓
3. CSS loads (css/styles.css)
   ↓
4. JavaScript executes (js/main.js)
   ↓
5. DOMContentLoaded event fires
   ↓
6. Firebase initialization (firebaseConfig)
   ↓
7. UI event listeners setup
   ├─ Tab click → switch tab
   ├─ Form submit → save to Firebase
   ├─ Table cell click → inline edit
   ├─ Button click → delete/generate data
   ├─ Hamburger → toggle menu
   └─ Date selection → update analytics
   ↓
8. Firebase real-time listeners (onValue)
   → Auto-update tables
   ↓
9. App fully initialized ✅
```

### Dependency Diagram

```
index.html (Entry point)
│
├── External libraries CDN
│   ├─ jQuery
│   ├─ Bootstrap
│   ├─ Chart.js
│   ├─ FullCalendar
│   └─ Font Awesome
│
├── css/styles.css (Styling)
│
└── js/main.js (Main app)
    │
    └── Firebase SDK (CDN)
        ├─ firebase-app.js
        └─ firebase-database.js
        
Note: firebase-config.js, firebase-utils.js, app.js 
are templates for future expansion (not currently in use)
```

---

## 🔄 Data Flow

### Catalog Addition Flow

```
User input (Form)
    ↓
Validation (js/main.js initCatalogForm)
    ↓
Firebase set() execution
    ↓
Save to Realtime Database (Catalogs/ path)
    ↓
onValue listener triggers
    ↓
renderCatalogTablesAccordion() executes
    ↓
UI auto-updates (accordion table)
    ↓
User sees confirmation ✅
```

### Order Addition Flow

```
User input (Form)
    ↓
Rich text processing (bold, italic)
    ↓
Validation (js/main.js initOrderForm)
    ↓
Firebase set() execution
    ↓
Save to Realtime Database (Orders/ path)
    ↓
onValue listener triggers
    ↓
renderOrderTablesAccordion() executes
    ↓
UI auto-updates (accordion table)
    ↓
User sees confirmation ✅
```

### Analytics Dashboard Update Flow

```
User clicks "Analytics" tab
    ↓
fetchAndRenderAnalytics() executes
    ↓
Firebase get() retrieves data (Catalogs/, Orders/)
    ↓
Data processing
    ├─ Calculate total stock
    ├─ Aggregate chart data
    ├─ Apply date filter
    └─ Load customization state from localStorage
    ↓
renderAnalyticsDashboard() executes
    ↓
Render each card
    ├─ Display metrics (totalStock, totalOrders)
    └─ Draw charts with Chart.js
    ↓
UI updates ✅
```

---

## 🎨 UI Structure

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ index.html <body>                                       │
├────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────┐  ┌──────────────────────────────────┐ │
│ │   SIDEBAR    │  │    MAIN CONTENT AREA            │ │
│ │              │  │                                 │ │
│ │ Catalog Mgmt │  │  glass-topbar (hamburger btn)  │ │
│ │              │  │  ┌─────────────────────────────┐│ │
│ │ • Catalogs   │  │  │ glass-main-content       ││ │
│ │ • Orders     │  │  │                           ││ │
│ │ • Entries    │  │  │ glass-cards (flexible)  ││ │
│ │ • ...        │  │  │                           ││ │
│ │ • Reports    │  │  │ [glass-card]            ││ │
│ │ • Calendar   │  │  │ ┌─────────────────────┐  ││ │
│ │ • Analytics  │  │  │ │  TAB-SECTION       │  ││ │
│ │              │  │  │ │                     │  ││ │
│ │ [icons]      │  │  │ │  Only active shown  │  ││ │
│ │              │  │  │ │  by CSS display     │  ││ │
│ │              │  │  │ └─────────────────────┘  ││ │
│ │              │  │  │ [glass-card]            ││ │
│ │              │  │  │ ...                     ││ │
│ └──────────────┘  │  └─────────────────────────────┘│ │
│                   │                                 │ │
└─────────────────────────────────────────────────────┘ │
  ↑                                                      │
  sidebar (width: 240px)                                │
                                                  
mobile-overlay (shown on screens < 900px)
```

### Tab Sections

```
glass-card (tab-section) × 7
├─ #tab-manageCatalog (form)
├─ #tab-placeOrder (form with rich-text)
├─ #tab-catalogEntries (accordion tables)
├─ #tab-orderEntries (accordion tables)
├─ #tab-reports (chart canvas)
├─ #tab-stockCalendar (calendar div)
└─ #tab-analytics (cards with charts)
    ├─ dateRangeCard (filter)
    └─ analyticsCards (flexible cards)
```

---

## 🔑 Key Concepts

### 1. **Modularity**
- Single file with multiple responsibilities → hard to maintain
- Multiple files, each with one responsibility → easy to maintain

### 2. **Real-Time Data Synchronization**
```javascript
onValue(ref(db, 'Catalogs/'), (snapshot) => {
    // Runs automatically whenever Firebase data changes
    if (snapshot.exists()) {
        const data = snapshot.val();
        renderCatalogTablesAccordion();
    }
});
```

### 3. **Event-Driven Programming**
```javascript
button.addEventListener('click', () => {
    // User action → event handler execution
});
```

### 4. **Responsive Design**
```css
@media (max-width: 900px) {
    /* Styles for mobile screen sizes */
}
```

---

## 📌 Important Paths (Firebase Realtime Database)

### Database Structure

```
Firebase Realtime Database
│
├── Catalogs/
│   ├── "CatalogA_1234567890" : {
│   │   CatalogName: "CatalogA",
│   │   ReceiptDate: "2025-07-01",
│   │   QuantityReceived: 50,
│   │   DeliveryDate: "2025-07-05",
│   │   IssueQuantity: 10,
│   │   StockQuantity: 40,
│   │   DistributionDestination: "Tokyo Factory",
│   │   Requester: "Tanaka",
│   │   Remarks: "Initial Stock"
│   │ }
│   ├── "CatalogB_1234567891" : { ... }
│   └── "CatalogC_1234567892" : { ... }
│
└── Orders/
    ├── "CatalogA_1234567900" : {
    │   CatalogName: "CatalogA",
    │   OrderQuantity: 5,
    │   Requester: "Sato",
    │   Message: "<b>Urgent</b>",
    │   OrderDate: "2025-07-01"
    │ }
    ├── "CatalogB_1234567901" : { ... }
    └── "CatalogC_1234567902" : { ... }
```

---

## 🚀 Execution Image

### Initial Page Load
```
1. Browser loads index.html
2. External libraries load from CDN
3. CSS applied (gradient background visible)
4. js/main.js executes
5. Connect to Firebase
6. Fetch data & render UI
→ App fully initialized ✅
```

### User Action Sequence

```
User: Click "Catalog Management" tab
↓
JavaScript: classList.remove('active') & classList.add('active')
↓
CSS: .sidebar-nav-btn.active { background: #e0eafc; }
↓
UI: Button color changes (user feedback)

User: Fill form & click "INSERT" button
↓
JavaScript: Validation & Firebase set()
↓
Firebase: Data saved to Catalogs/ path
↓
JavaScript: onValue listener triggered
↓
JavaScript: renderCatalogTablesAccordion()
↓
UI: New row added to table (auto-updated)
→ User: Sees success message ✅
```

---

## 📚 Reference Links

### Important Definitions
- CSS class list in `css/styles.css`
- Function list in `js/main.js`
- Firebase Security Rules (managed separately in future)

### Dependent Libraries
- jQuery 3.5.1 - DOM manipulation & events
- Bootstrap 4.5.2 - UI components
- Chart.js - Graph rendering
- FullCalendar 5.11.0 - Calendar UI
- Font Awesome 6.4.2 - Icons
- Firebase SDK 10.14.1 - Database

---

## 📝 Summary

This guide provides a comprehensive overview of the project structure for beginners.
For detailed information, refer to README.md and code comments in each file.

**Project Status:** ✅ Fully modularized and documented
**Language:** English
**Last Updated:** December 1, 2025
