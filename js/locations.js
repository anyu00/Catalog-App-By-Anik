// Location Configuration
// Defines all company locations with contact information

export const COMPANY_LOCATIONS = [
    {
        id: 'honsha-sagami',
        name: '本社・相模事業所',
        postalCode: '〒252-1113',
        address: '神奈川県綾瀬市上土棚中4-4-34',
        phone: '0467-77-2111',
        fax: '0467-77-3330',
        email: 'honsha@example.com',
        prefecture: '神奈川県'
    },
    {
        id: 'fukurodta-factory',
        name: '袋田工場',
        postalCode: '〒319-3521',
        address: '茨城県久慈郡大子町北田気65',
        phone: '0295-72-0425',
        fax: '0295-72-4195',
        email: 'fukuroda@example.com',
        prefecture: '茨城県'
    },
    {
        id: 'tokyo-office',
        name: '東京支社',
        postalCode: '〒105-0012',
        address: '東京都港区芝大門1-4-8（浜松町清和ビル8F）',
        phone: '03-3432-2111',
        fax: '03-3436-2344',
        email: 'tokyo@example.com',
        prefecture: '東京都'
    },
    {
        id: 'osaka-office',
        name: '大阪支社',
        postalCode: '〒550-0011',
        address: '大阪府大阪市西区阿波座1-4-4（野村不動産四ッ橋ビル）',
        phone: '06-6537-0030',
        fax: '06-6537-0078',
        email: 'osaka@example.com',
        prefecture: '大阪府'
    },
    {
        id: 'sapporo-office',
        name: '札幌営業所',
        postalCode: '〒060-0806',
        address: '北海道札幌市北区北六条西6-2-11（第3山崎ビル）',
        phone: '011-756-6890',
        fax: '011-757-2210',
        email: 'sapporo@example.com',
        prefecture: '北海道'
    },
    {
        id: 'nagano-office',
        name: '長野営業所',
        postalCode: '〒386-0002',
        address: '長野県上田市大字住吉569-8',
        phone: '0268-27-7631',
        fax: '0268-25-1629',
        email: 'nagano@example.com',
        prefecture: '長野県'
    },
    {
        id: 'sagami-office',
        name: '相模営業所',
        postalCode: '〒252-1113',
        address: '神奈川県綾瀬市上土棚中4-4-34',
        phone: '0467-68-4030',
        fax: '0467-68-4031',
        email: 'sagami@example.com',
        prefecture: '神奈川県'
    },
    {
        id: 'nagoya-office',
        name: '名古屋営業所',
        postalCode: '〒450-0002',
        address: '愛知県名古屋市中村区名駅4-26-22（名駅ビル）',
        phone: '052-582-2201',
        fax: '052-565-0966',
        email: 'nagoya@example.com',
        prefecture: '愛知県'
    },
    {
        id: 'hiroshima-office',
        name: '広島営業所',
        postalCode: '〒730-0037',
        address: '広島県広島市中区中町7-23（住友生命広島平和大通り第二ビル）',
        phone: '082-248-2008',
        fax: '082-248-2006',
        email: 'hiroshima@example.com',
        prefecture: '広島県'
    },
    {
        id: 'fukuoka-office',
        name: '福岡営業所',
        postalCode: '〒812-0016',
        address: '福岡県福岡市博多区博多駅南3-1-1（博多南マークビル）',
        phone: '092-473-2221',
        fax: '092-481-6412',
        email: 'fukuoka@example.com',
        prefecture: '福岡県'
    },
    {
        id: 'environmental-dept',
        name: '環境機械部',
        postalCode: '〒252-1113',
        address: '神奈川県綾瀬市上土棚中4-4-34',
        phone: '0467-68-4010',
        fax: '0467-68-4012',
        email: 'env-machine@example.com',
        prefecture: '神奈川県'
    }
];

/**
 * Get location by ID
 */
export function getLocationById(locationId) {
    return COMPANY_LOCATIONS.find(loc => loc.id === locationId);
}

/**
 * Format location for display
 */
export function formatLocationAddress(location) {
    return `${location.name}\n${location.postalCode}\n${location.address}`;
}

/**
 * Get all location names for dropdown
 */
export function getLocationOptions() {
    return COMPANY_LOCATIONS.map(loc => ({
        id: loc.id,
        label: `${loc.name}`,
        value: loc.id
    }));
}
