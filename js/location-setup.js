// Location Accounts Setup Script
// Run this in the browser console or as a Cloud Function to create all location accounts

import { COMPANY_LOCATIONS } from './locations.js';
import { createUserAccount } from './auth.js';

/**
 * Generate password for a location account
 * Format: LocationID-YYYY-Initial password pattern
 */
function generateLocationPassword(locationId) {
    return `${locationId}-${new Date().getFullYear()}-TEMP`;
}

/**
 * Set up all location accounts
 * WARNING: Only run this once in the admin panel!
 */
export async function setupAllLocationAccounts() {
    console.log('🔄 Starting location accounts setup...');
    console.log(`📍 Total locations to set up: ${COMPANY_LOCATIONS.length}`);
    
    const results = {
        success: [],
        failed: [],
        existing: []
    };
    
    for (const location of COMPANY_LOCATIONS) {
        try {
            // Create account for this location
            const email = `${location.id}@company-locations.local`;
            const displayName = location.name;
            const password = generateLocationPassword(location.id);
            
            console.log(`\n📍 Setting up: ${displayName}`);
            console.log(`   📧 Email: ${email}`);
            
            const userId = await createUserAccount(
                email,
                password,
                displayName,
                'user',
                location.id
            );
            
            results.success.push({
                locationId: location.id,
                name: displayName,
                email,
                password,
                userId
            });
            
            console.log(`✅ Success! Email: ${email}, Password: ${password}`);
            
        } catch (error) {
            // Check if account already exists
            if (error.code === 'auth/email-already-in-use') {
                results.existing.push({
                    locationId: location.id,
                    name: location.name,
                    email: `${location.id}@company-locations.local`
                });
                console.log(`⚠️  Account already exists for: ${location.name}`);
            } else {
                results.failed.push({
                    locationId: location.id,
                    name: location.name,
                    error: error.message
                });
                console.error(`❌ Failed for ${location.name}:`, error.message);
            }
        }
        
        // Small delay between account creations
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✅ Successfully created: ${results.success.length} accounts`);
    console.log(`⚠️  Already existed: ${results.existing.length} accounts`);
    console.log(`❌ Failed: ${results.failed.length} accounts`);
    
    if (results.success.length > 0) {
        console.log('\n📋 New Accounts Created:');
        results.success.forEach(acc => {
            console.log(`\n   ${acc.name}`);
            console.log(`   📧 Email:    ${acc.email}`);
            console.log(`   🔐 Password: ${acc.password}`);
            console.log(`   🆔 User ID:  ${acc.userId}`);
        });
    }
    
    return results;
}

/**
 * Print all location account credentials
 * For admin/setup documentation only
 */
export function printLocationCredentials() {
    console.log('\n' + '='.repeat(70));
    console.log('LOCATION ACCOUNTS - CREDENTIALS');
    console.log('='.repeat(70));
    
    COMPANY_LOCATIONS.forEach(location => {
        const email = `${location.id}@company-locations.local`;
        const password = generateLocationPassword(location.id);
        
        console.log(`\n📍 ${location.name}`);
        console.log(`   ${location.postalCode}`);
        console.log(`   ${location.address}`);
        console.log(`   📧 Email:    ${email}`);
        console.log(`   🔐 Password: ${password}`);
        console.log(`   ☎️  Phone:    ${location.phone}`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  IMPORTANT: Change these temporary passwords after first login!');
    console.log('='.repeat(70));
}

// Export for use in admin panel
window.setupAllLocationAccounts = setupAllLocationAccounts;
window.printLocationCredentials = printLocationCredentials;
