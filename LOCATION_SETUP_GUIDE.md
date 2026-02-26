# Location Accounts Setup Guide

## Overview
The app now supports location-based user accounts. Each office/facility can have its own login account, and users can select their location when placing orders.

## Company Locations (11 Total)

1. **本社・相模事業所** - Headquarters
2. **袋田工場** - Fukuroda Factory  
3. **東京支社** - Tokyo Office
4. **大阪支社** - Osaka Office
5. **札幌営業所** - Sapporo Office
6. **長野営業所** - Nagano Office
7. **相模営業所** - Sagami Office
8. **名古屋営業所** - Nagoya Office
9. **広島営業所** - Hiroshima Office
10. **福岡営業所** - Fukuoka Office
11. **環境機械部** - Environmental Machinery Division

## Setup Methods

### Method 1: Browser Console (Quickest)
This method is easiest for setting up all accounts at once.

#### Steps:
1. Log in as admin to the app
2. Open browser console (F12 or Cmd+Option+J)
3. Paste this command:
   ```javascript
   // First, import the setup function
   import { setupAllLocationAccounts, printLocationCredentials } from './js/location-setup.js';
   
   // Create all location accounts
   await setupAllLocationAccounts();
   
   // Print credentials for documentation
   printLocationCredentials();
   ```

4. Press Enter and wait for completion
5. You'll see results in the console with all credentials

#### Important Notes:
- ✅ Run this only ONCE - if you run it again, you'll get "email already in use" errors
- 🔐 **Temporary passwords**: All accounts use the pattern: `{locationId}-2026-TEMP`
- ⚠️  Users MUST change password on first login
- 📋 Save the credentials shown in console for your records

### Example Account Credentials Generated:

```
📍 本社・相模事業所
〒252-1113
神奈川県綾瀬市上土棚中4-4-34
📧 Email:    honsha-sagami@company-locations.local
🔐 Password: honsha-sagami-2026-TEMP
☎️  Phone:   0467-77-2111
```

(Similar format for all 11 locations)

---

## How Location Accounts Work

### For Users (Customers):

1. **Login**: Use location email and password
   - Example: `honsha-sagami@company-locations.local` / `honsha-sagami-2026-TEMP`

2. **Place Order Tab**: 
   - Location selection appears at top
   - Choose from dropdown (pre-filtered to your assigned location)
   - OR enter custom address if needed
   - Address auto-fills in order modal

3. **Place Order**:
   - Select products
   - Address is pre-filled (can be edited)
   - Submit order with location info attached

4. **Changed Address**:
   - If user selects different location or custom address
   - It's automatically saved to their profile
   - Next order will use the new address by default

---

## Account Login Info

### Email Format
```
{location-id}@company-locations.local
```

### Location IDs
- `honsha-sagami` → 本社・相模事業所
- `fukuroda-factory` → 袋田工場  
- `tokyo-office` → 東京支社
- `osaka-office` → 大阪支社
- `sapporo-office` → 札幌営業所
- `nagano-office` → 長野営業所
- `sagami-office` → 相模営業所
- `nagoya-office` → 名古屋営業所
- `hiroshima-office` → 広島営業所
- `fukuoka-office` → 福岡営業所
- `environmental-dept` → 環境機械部

### Default Password Pattern
```
{location-id}-2026-TEMP

Example:
honsha-sagami-2026-TEMP
tokyo-office-2026-TEMP
osaka-office-2026-TEMP
```

---

## User First-Login Checklist

When users first log in, they should:

- [ ] **Change password** (from TEMP password to secure password)
- [ ] **Verify location** (confirm correct office is selected)
- [ ] **Test order placement** (practice with one test order)
- [ ] **Bookmark the app** (for quick access)

---

## Address Selection on Order Page

### Location Dropdown Option:
- Pre-filled with company location
- Shows full address with postal code, phone, FAX
- Can be changed to another location
- Saved to user profile for next time

### Custom Address Option:
- Enter any address manually
- Useful for branch offices or non-standard locations
- Format: Postal code + Full address + Floor/Building info
- Also saved to user profile

### Address Storage:
```javascript
// Stored in Firebase Users collection:
{
  selectedAddressType: "location" | "custom",
  selectedAddressValue: "location-id" | "custom address string"
}
```

---

## What Gets Updated After Order Placement

When a user places an order:

### User Profile
- `selectedAddressType` updated
- `selectedAddressValue` updated
- `lastLogin` updated

### Order Record
Shows:
- Address used (location or custom)
- AddressType (for tracking which was selected)
- AddressValue (for filtering/reporting)

### Throughout App:
- **Catalog Management** → Orders show correct address
- **Order Entries** → All orders display saved address
- **Analytics** → Can filter by address/location
- **Calendar** → Events show address details
- **Reports** → Can group by location

---

## Troubleshooting

### "Email already in use" error
**Solution**: Accounts already exist. This is normal on subsequent runs.
- Don't run setup twice
- Existing accounts are fine to use

### User can't see location dropdown
**Possible causes:**
- User is logged out (log in with location account)
- Page needs refresh (browser cache issue)
- **Solution**: Clear cache (Ctrl+Shift+Delete) and reload

### Address not saving
**Possible causes:**
- Network issue during save
- Firebase permissions (check database rules)
- **Solution**: Check browser console for errors, retry

### Wrong address showing
**Solution:** Don't worry! Users can:
1. Change it in the location dropdown on the Order page
2. Enter custom address manually
3. It auto-saves for next time

---

## For Administrators

### View All Location Accounts
In browser console:
```javascript
import { COMPANY_LOCATIONS } from './js/locations.js';
console.table(COMPANY_LOCATIONS);
```

### Check User Location Info
In Firebase Console:
1. Go to Realtime Database → Users
2. Click on any user
3. Look for `locationId` and `selectedAddressValue`

### Reset User Address
Edit user profile in Firebase:
- Find user in `Users/{userId}`
- Delete `selectedAddressType` and `selectedAddressValue`
- User will revert to their assigned location on next login

### Add New Location
Edit `js/locations.js`:
1. Add new object to `COMPANY_LOCATIONS` array
2. Rerun account setup script
3. Deploy changes

---

## Firebase Database Structure

### Users Collection:
```
Users/
  {userId}/
    email: "honsha-sagami@company-locations.local"
    displayName: "本社・相模事業所"
    locationId: "honsha-sagami"          ← Assigned location
    selectedAddressType: "location"      ← Current selection
    selectedAddressValue: "honsha-sagami" ← Current value
    role: "user"
    createdAt: "2026-02-26T..."
```

### Orders Collection:
```
Orders/
  {orderId}/
    CatalogName: "JL-1027"
    OrderQuantity: 5
    RequesterAddress: "〒252-1113 神奈川県綾瀬市..."
    AddressType: "location"              ← Track source
    AddressValue: "honsha-sagami"        ← Track location
    OrderDate: "2026-02-26"
```

---

## Security Notes

- ⚠️ Default passwords expire after first login
- Each location has separate account (not shared)
- Orders are tied to user account + location
- Address changes are logged in audit trail
- Firebase rules should restrict to own data only

---

## Quick Reference Commands

### Print all credentials to console:
```javascript
import { printLocationCredentials } from './js/location-setup.js';
printLocationCredentials();
```

### Get location details:
```javascript
import { getLocationById } from './js/locations.js';
const location = getLocationById('tokyo-office');
console.table(location);
```

### List all options for dropdown:
```javascript
import { getLocationOptions } from './js/locations.js';
console.table(getLocationOptions());
```

---

## Support

If you encounter issues:

1. **Check console errors**: F12 → Console tab
2. **Verify network**: Check Firebase connection
3. **Test with admin account**: Some features might need admin
4. **Clear cache**: Ctrl+Shift+Delete (full site data)
5. **Check Firebase rules**: LocationIds might need permission

---

**Created**: February 26, 2026
**Version**: 1.0
**Status**: Ready for deployment
