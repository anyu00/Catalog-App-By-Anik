// i18n.js - Complete Internationalization System
// All UI text in English and Japanese
// Version: 1.0 - Full bilingual support

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
        
        // Form Labels - Catalog Management
        'form.catalog_name': 'カタログ名',
        'form.receipt_date': '納入日',
        'form.quantity_received': '受領数量',
        'form.delivery_date': '出荷日',
        'form.issue_quantity': '発行数量',
        'form.stock_quantity': '在庫数量',
        'form.distribution': '配布先',
        'form.requester_department': '部署名',
        'form.requester': '発注者',
        'form.requester_address': '住所',
        'form.remarks': '備考',
        'form.placeholder_select': '--選択してください--',
        'form.placeholder_text': 'テキストを入力...',
        'form.placeholder_number': '数値を入力...',
        'form.placeholder_message': 'メッセージを入力...',
        
        // Order Form
        'order.title': '注文する',
        'order.catalog_name': 'カタログ名',
        'order.order_quantity': '注文数量',
        'order.requester_department': '部署名',
        'order.requester': '発注者',
        'order.requester_address': '住所',
        'order.message': '注文メッセージ',
        
        // Buttons
        'btn.insert': 'INSERT',
        'btn.update': 'UPDATE',
        'btn.delete': 'DELETE',
        'btn.submit': '送信',
        'btn.cancel': 'キャンセル',
        'btn.search': '検索',
        'btn.clear': 'クリア',
        'btn.export_pdf': 'PDF出力',
        'btn.export_csv': 'CSV出力',
        'btn.logout': 'ログアウト',
        'btn.save': '保存',
        'btn.close': '閉じる',
        'btn.back': '戻る',
        
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
        
        // Table Headers
        'table.catalog_name': 'カタログ名',
        'table.delivery_date': '納入日',
        'table.quantity_received': '受領数量',
        'table.shipment_date': '出荷日',
        'table.issue_quantity': '発行数量',
        'table.stock_quantity': '在庫数量',
        'table.distribution': '配布先',
        'table.requester_department': '部署名',
        'table.requester': '発注者',
        'table.requester_address': '住所',
        'table.remarks': '備考',
        'table.actions': 'アクション',
        'table.date': '日付',
        'table.quantity': '数量',
        'table.status': 'ステータス',
        'table.email': 'メール',
        'table.role': 'ロール',
        
        // Messages & Alerts
        'msg.insert_success': 'カタログエントリを登録しました',
        'msg.update_success': 'カタログエントリを更新しました',
        'msg.delete_success': 'カタログエントリを削除しました',
        'msg.order_success': '注文を送信しました',
        'msg.error': 'エラーが発生しました',
        'msg.loading': '読み込み中...',
        'msg.no_results': '結果が見つかりません',
        'msg.fill_required': '必須フィールドを入力してください',
        'msg.confirm_delete': 'このエントリを削除してもよろしいですか？',
        'msg.confirm_logout': 'ログアウトしてもよろしいですか？',
        'msg.empty_table': 'エントリがありません',
        
        // Admin Panel
        'admin.title': 'ユーザー管理',
        'admin.users': 'ユーザー',
        'admin.roles': 'ロール',
        'admin.permissions': '権限',
        'admin.email': 'メール',
        'admin.role': 'ロール',
        'admin.add_user': 'ユーザーを追加',
        'admin.edit_user': 'ユーザーを編集',
        'admin.delete_user': 'ユーザーを削除',
        'admin.save': '保存',
        'admin.cancel': 'キャンセル',
        
        // User Roles
        'role.admin': '管理者',
        'role.user': 'ユーザー',
        'role.viewer': '閲覧者',
        
        // Calendar & Events
        'cal.title': 'イベント詳細',
        'cal.event': 'イベント',
        'cal.date': '日付',
        'cal.details': '詳細',
        'cal.no_events': 'スケジュール済みのイベントはありません',
        
        // Search & Filter
        'search.placeholder': '検索...',
        'filter.date_from': '開始日',
        'filter.date_to': '終了日',
        'filter.catalog': 'カタログでフィルタ',
        'filter.requester': '発注者でフィルタ',
        
        // Analytics
        'analytics.title': 'アナリティクス',
        'analytics.period': '期間を選択',
        'analytics.from': '開始',
        'analytics.to': '終了',
        'analytics.total_orders': '合計注文数',
        'analytics.total_quantity': '合計数量',
        'analytics.top_catalogs': 'トップカタログ',
        'analytics.trend': 'トレンド',
        
        // Movement & Audit
        'movement.title': '推移履歴',
        'movement.type': 'タイプ',
        'movement.quantity': '数量',
        'audit.title': '監査ログ',
        'audit.action': 'アクション',
        'audit.user': 'ユーザー',
        'audit.details': '詳細',
        
        // Validation & Errors
        'error.auth_failed': '認証に失敗しました',
        'error.unauthorized': 'アクセスが拒否されました',
        'error.network': 'ネットワークエラー',
        'error.database': 'データベースエラー',
        'error.required_field': 'このフィールドは必須です',
        'error.invalid_date': '無効な日付です',
        'error.invalid_quantity': '無効な数量です',
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
        
        // Form Labels - Catalog Management
        'form.catalog_name': 'Catalog Name',
        'form.receipt_date': 'Delivery Date',
        'form.quantity_received': 'Received Quantity',
        'form.delivery_date': 'Shipment Date',
        'form.issue_quantity': 'Issue Quantity',
        'form.stock_quantity': 'Stock Quantity',
        'form.distribution': 'Distribution Destination',
        'form.requester': 'Requester',
        'form.remarks': 'Remarks',
        'form.placeholder_select': '--Select--',
        'form.placeholder_text': 'Enter text...',
        'form.placeholder_number': 'Enter number...',
        'form.placeholder_message': 'Enter message...',
        
        // Order Form
        'order.title': 'Place Order',
        'order.catalog_name': 'Catalog Name',
        'order.order_quantity': 'Order Quantity',
        'order.requester': 'Requester',
        'order.message': 'Order Message',
        
        // Buttons
        'btn.insert': 'INSERT',
        'btn.update': 'UPDATE',
        'btn.delete': 'DELETE',
        'btn.submit': 'Submit',
        'btn.cancel': 'Cancel',
        'btn.search': 'Search',
        'btn.clear': 'Clear',
        'btn.export_pdf': 'Export PDF',
        'btn.export_csv': 'Export CSV',
        'btn.logout': 'Logout',
        'btn.save': 'Save',
        'btn.close': 'Close',
        'btn.back': 'Back',
        
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
        
        // Table Headers
        'table.catalog_name': 'Catalog Name',
        'table.delivery_date': 'Delivery Date',
        'table.quantity_received': 'Received Qty',
        'table.shipment_date': 'Shipment Date',
        'table.issue_quantity': 'Issue Qty',
        'table.stock_quantity': 'Stock Qty',
        'table.distribution': 'Distribution',
        'table.requester': 'Requester',
        'table.remarks': 'Remarks',
        'table.actions': 'Actions',
        'table.date': 'Date',
        'table.quantity': 'Quantity', 
        'table.status': 'Status',
        'table.email': 'Email',
        'table.role': 'Role',
        
        // Messages & Alerts
        'msg.insert_success': 'Catalog entry registered successfully',
        'msg.update_success': 'Catalog entry updated successfully',
        'msg.delete_success': 'Catalog entry deleted successfully',
        'msg.order_success': 'Order placed successfully',
        'msg.error': 'An error occurred',
        'msg.loading': 'Loading...',
        'msg.no_results': 'No results found',
        'msg.fill_required': 'Please fill in all required fields',
        'msg.confirm_delete': 'Are you sure you want to delete this entry?',
        'msg.confirm_logout': 'Are you sure you want to logout?',
        'msg.empty_table': 'No entries found',
        
        // Admin Panel
        'admin.title': 'User Management',
        'admin.users': 'Users',
        'admin.roles': 'Roles',
        'admin.permissions': 'Permissions',
        'admin.email': 'Email',
        'admin.role': 'Role',
        'admin.add_user': 'Add User',
        'admin.edit_user': 'Edit User',
        'admin.delete_user': 'Delete User',
        'admin.save': 'Save',
        'admin.cancel': 'Cancel',  
        
        // User Roles
        'role.admin': 'Administrator',
        'role.user': 'User',
        'role.viewer': 'Viewer',
        
        // Calendar & Events
        'cal.title': 'Event Details',
        'cal.event': 'Event',
        'cal.date': 'Date',
        'cal.details': 'Details',
        'cal.no_events': 'No events scheduled',
        
        // Search & Filter
        'search.placeholder': 'Search...',
        'filter.date_from': 'From Date',
        'filter.date_to': 'To Date',
        'filter.catalog': 'Filter by Catalog',
        'filter.requester': 'Filter by Requester',
        
        // Analytics
        'analytics.title': 'Analytics',
        'analytics.period': 'Select Date Range',
        'analytics.from': 'From',
        'analytics.to': 'To',
        'analytics.total_orders': 'Total Orders',
        'analytics.total_quantity': 'Total Quantity',
        'analytics.top_catalogs': 'Top Catalogs',
        'analytics.trend': 'Trend',
        
        // Movement & Audit
        'movement.title': 'Movement History',
        'movement.type': 'Type',
        'movement.quantity': 'Quantity',
        'audit.title': 'Audit Log',
        'audit.action': 'Action',
        'audit.user': 'User',
        'audit.details': 'Details',
        
        // Validation & Errors
        'error.auth_failed': 'Authentication failed',
        'error.unauthorized': 'Unauthorized access',
        'error.network': 'Network error',
        'error.database': 'Database error',
        'error.required_field': 'This field is required',
        'error.invalid_date': 'Invalid date',
        'error.invalid_quantity': 'Invalid quantity',
    }
};

// Global i18n state
const i18n = {
    lang: localStorage.getItem('appLanguage') || 'ja',
    
    t(key) {
        const result = translations[this.lang]?.[key];
        if (!result) {
            console.warn(`Translation missing for key: ${key}`);
        }
        return result || key;
    },
    
    setLanguage(lang) {
        if (translations[lang]) {
            this.lang = lang;
            localStorage.setItem('appLanguage', lang);
            console.log(`Language changed to: ${lang}`);
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
console.log('i18n loaded. Current language:', i18n.getLanguage());
