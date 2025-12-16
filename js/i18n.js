// i18n.js - Simple Internationalization System
// Keeps all UI text in one place for easy localization

const translations = {
    ja: {
        // Sidebar Navigation
        'sidebar.manage': 'カタログ管理',
        'sidebar.order': '注文する',
        'sidebar.entries': 'カタログエントリ',
        'sidebar.orders': '注文エントリ',
        'sidebar.calendar': 'カレンダー',
        'sidebar.history': '推移履歴',
        'sidebar.audit': '監査ログ',
        'sidebar.analytics': 'アナリティクス',
        'sidebar.admin': '管理者パネル',
        
        // Form Labels
        'form.catalog': 'カタログ名',
        'form.receipt_date': '納入日',
        'form.quantity_received': '受領数量',
        'form.delivery_date': '出荷日',
        'form.issue_quantity': '発行数量',
        'form.stock_quantity': '在庫数量',
        'form.distribution': '配布先',
        'form.requester': '依頼者',
        'form.remarks': '備考',
        'form.select': '--選択してください--',
        
        // Buttons
        'btn.insert': 'INSERT',
        'btn.update': 'UPDATE',
        'btn.delete': 'DELETE',
        'btn.search': '検索',
        'btn.export_pdf': 'PDF出力',
        'btn.export_csv': 'CSV出力',
        'btn.clear': 'クリア',
        
        // Section Titles
        'section.manage_catalog': 'カタログの管理',
        'section.place_order': '注文する',
        'section.catalog_entries': 'カタログエントリ',
        'section.order_entries': '注文エントリ',
        'section.calendar': '在庫カレンダー',
        'section.history': '推移履歴',
        'section.audit': '監査ログ',
        'section.analytics': 'アナリティクス',
        'section.admin': '管理者パネル',
        
        // Messages
        'msg.insert_success': 'カタログエントリを登録しました',
        'msg.update_success': 'カタログエントリを更新しました',
        'msg.delete_success': 'カタログエントリを削除しました',
        'msg.order_success': '注文を送信しました',
        'msg.error': 'エラーが発生しました',
        'msg.loading': '読み込み中...',
        'msg.no_results': '結果が見つかりません',
        
        // Labels for Order Form
        'order.catalog': 'カタログ名',
        'order.quantity': '注文数量',
        'order.message': '注文メッセージ',
        'order.requester': '依頼者',
    },
    en: {
        // Sidebar Navigation
        'sidebar.manage': 'Catalog Management',
        'sidebar.order': 'Place Order',
        'sidebar.entries': 'Catalog Entries',
        'sidebar.orders': 'Order Entries',
        'sidebar.calendar': 'Calendar',
        'sidebar.history': 'Movement History',
        'sidebar.audit': 'Audit Log',
        'sidebar.analytics': 'Analytics',
        'sidebar.admin': 'Admin Panel',
        
        // Form Labels
        'form.catalog': 'Catalog Name',
        'form.receipt_date': 'Delivery Date',
        'form.quantity_received': 'Received Quantity',
        'form.delivery_date': 'Shipment Date',
        'form.issue_quantity': 'Issue Quantity',
        'form.stock_quantity': 'Stock Quantity',
        'form.distribution': 'Distribution Destination',
        'form.requester': 'Requester',
        'form.remarks': 'Remarks',
        'form.select': '--Select--',
        
        // Buttons
        'btn.insert': 'INSERT',
        'btn.update': 'UPDATE',
        'btn.delete': 'DELETE',
        'btn.search': 'Search',
        'btn.export_pdf': 'Export PDF',
        'btn.export_csv': 'Export CSV',
        'btn.clear': 'Clear',
        
        // Section Titles
        'section.manage_catalog': 'Catalog Management',
        'section.place_order': 'Place Order',
        'section.catalog_entries': 'Catalog Entries',
        'section.order_entries': 'Order Entries',
        'section.calendar': 'Stock Calendar',
        'section.history': 'Movement History',
        'section.audit': 'Audit Log',
        'section.analytics': 'Analytics',
        'section.admin': 'Admin Panel',
        
        // Messages
        'msg.insert_success': 'Catalog entry registered successfully',
        'msg.update_success': 'Catalog entry updated successfully',
        'msg.delete_success': 'Catalog entry deleted successfully',
        'msg.order_success': 'Order placed successfully',
        'msg.error': 'An error occurred',
        'msg.loading': 'Loading...',
        'msg.no_results': 'No results found',
        
        // Labels for Order Form
        'order.catalog': 'Catalog Name',
        'order.quantity': 'Order Quantity',
        'order.message': 'Order Message',
        'order.requester': 'Requester',
    }
};

// Global i18n state
let i18n = {
    lang: localStorage.getItem('appLanguage') || 'ja',
    
    t(key) {
        return translations[this.lang][key] || key;
    },
    
    setLanguage(lang) {
        if (translations[lang]) {
            this.lang = lang;
            localStorage.setItem('appLanguage', lang);
            return true;
        }
        return false;
    },
    
    getLanguage() {
        return this.lang;
    }
};

// Make globally available
window.i18n = i18n;
