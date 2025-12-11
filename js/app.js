// Main Application Logic - Tab switching, initialization, and core event listeners

import { db } from './firebase-config.js';
import { fetchAllCatalogs, fetchAllOrders, onCatalogsChange, onOrdersChange, generateSampleCatalogs, generateSampleOrders, clearAllCatalogs, clearAllOrders } from './firebase-utils.js';

/**
 * Initialize all sidebar button click handlers and tab switching
 */
export function initTabSwitching() {
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Hide all tabs
            document.querySelectorAll('.tab-section').forEach(tab => tab.style.display = 'none');
            
            // Show selected tab
            const tabName = this.getAttribute('data-tab');
            const tabElement = document.getElementById('tab-' + tabName);
            if (tabElement) {
                tabElement.style.display = 'block';
            }
            
            // Trigger tab-specific initialization
            onTabSwitch(tabName); 
        });
    });
    
    // Show first tab by default
    document.getElementById('tab-manageCatalog').style.display = 'block';
}

/**
 * Handle tab-specific initialization when tab is switched
 */
function onTabSwitch(tabName) {
    // Lazy-load expensive components only when tab is opened
    if (tabName === 'stockCalendar') {
        // Calendar init handled in separate module
        if (window.initializeCalendar && !window.calendarInitialized) {
            window.initializeCalendar();
            window.calendarInitialized = true;
        }
    }
    if (tabName === 'orderEntries') {
        if (window.renderOrderTablesAccordion) window.renderOrderTablesAccordion();
    }   
    if (tabName === 'catalogEntries') {
        if (window.renderCatalogTablesAccordion) window.renderCatalogTablesAccordion();
    }
    if (tabName === 'analytics') {
        document.getElementById('analyticsDateRangeCard').style.display = 'block';
        if (window.fetchAndRenderAnalytics) window.fetchAndRenderAnalytics();
    } else {
        const dateCard = document.getElementById('analyticsDateRangeCard');
        if (dateCard) dateCard.style.display = 'none';
    }
}

/**
 * Initialize sample data & delete buttons 
 */
export function initDataManagement() {
    document.getElementById('deleteAllCatalogBtn')?.addEventListener('click', () => {
        if (confirm('本当に全てのカタログデータを削除しますか？')) {
            clearAllCatalogs().then(() => {
                alert('カタログデータを削除しました');
                if (window.renderCatalogTablesAccordion) window.renderCatalogTablesAccordion();
            }).catch(e => alert('削除に失敗: ' + e));
        }
    });
    
    document.getElementById('deleteAllOrderBtn')?.addEventListener('click', () => {
        if (confirm('本当に全ての注文データを削除しますか？')) {
            clearAllOrders().then(() => {
                alert('注文データを削除しました');
                if (window.renderOrderTablesAccordion) window.renderOrderTablesAccordion();
            }).catch(e => alert('削除に失敗: ' + e));
        }
    });
    
    document.getElementById('generateSampleCatalogBtn')?.addEventListener('click', () => {
        generateSampleCatalogs();
        alert('サンプルカタログデータを生成しました');
        if (window.renderCatalogTablesAccordion) window.renderCatalogTablesAccordion();
    });
    
    document.getElementById('generateSampleOrderBtn')?.addEventListener('click', () => {
        generateSampleOrders();
        alert('サンプル注文データを生成しました');
        if (window.renderOrderTablesAccordion) window.renderOrderTablesAccordion();
    });
}

/**
 * Main app initialization - call this when DOM is loaded
 */
export function initApp() {
    initTabSwitching();
    initDataManagement();
    console.log('カタログ管理ダッシュボード initialized');
}
