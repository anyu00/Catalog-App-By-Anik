# QUICK START - Set Up Location Accounts

## 1️⃣ In Browser Console (Fastest Method)

```javascript
import { setupAllLocationAccounts, printLocationCredentials } from './js/location-setup.js';
await setupAllLocationAccounts();
printLocationCredentials();
```

**That's it!** All 11 location accounts are created in seconds.

---

## 2️⃣ Account Credentials Format

After setup, you'll get accounts like:

| Location | Email | Password |
|----------|-------|----------|
| 本社・相模事業所 | honsha-sagami@company-locations.local | honsha-sagami-2026-TEMP |
| 東京支社 | tokyo-office@company-locations.local | tokyo-office-2026-TEMP |
| 袋田工場 | fukuroda-factory@company-locations.local | fukuroda-factory-2026-TEMP |
| 大阪支社 | osaka-office@company-locations.local | osaka-office-2026-TEMP |
| 札幌営業所 | sapporo-office@company-locations.local | sapporo-office-2026-TEMP |
| 長野営業所 | nagano-office@company-locations.local | nagano-office-2026-TEMP |
| 相模営業所 | sagami-office@company-locations.local | sagami-office-2026-TEMP |
| 名古屋営業所 | nagoya-office@company-locations.local | nagoya-office-2026-TEMP |
| 広島営業所 | hiroshima-office@company-locations.local | hiroshima-office-2026-TEMP |
| 福岡営業所 | fukuoka-office@company-locations.local | fukuoka-office-2026-TEMP |
| 環境機械部 | environmental-dept@company-locations.local | environmental-dept-2026-TEMP |

---

## 3️⃣ How Users Will Operate

### Login
```
Email: honsha-sagami@company-locations.local
Password: honsha-sagami-2026-TEMP (change on first login)
```

### Place Order
1. Go to「注文する」(Place Order) tab
2. Location selection appears at top:
   - **Location Dropdown**: Show all 11 locations
   - **Custom Address**: Free text entry
3. Select location (or custom address)
4. Choose catalogs
5. Address auto-fills in order form
6. Submit order ✅

### Address Updated
- If location changed: Saved to user profile
- Next order defaults to new location
- Custom address option always available

---

## 4️⃣ Testing Checklist

After setup, test with one location account:

```
✅ 1. Log in with location account
   Email: honsha-sagami@company-locations.local
   Password: honsha-sagami-2026-TEMP

✅ 2. Check Place Order tab
   - Location dropdown should show all 11 options
   - Location should be pre-selected (本社・相模事業所)
   - Address details should display

✅ 3. Change location in dropdown
   - Address should update instantly
   - Custom option available

✅ 4. Enter custom address
   - Switch to "カスタム住所を入力"
   - Type test address
   - Should save to profile

✅ 5. Place test order
   - Select a product
   - Address pre-filled
   - Complete order
   - Should see success message

✅ 6. Log out and back in
   - Changed address should persist
   - Dropdown should show last selected location
```

---

## 5️⃣ What's Automatically Handled

Once accounts are created:

### When User Logs In:
- ✅ Location automatically loaded from profile
- ✅ Last selected address restored
- ✅ Place Order page initialized with address selection

### When User Places Order:
- ✅ Address pre-filled in order form
- ✅ AddressType saved (location vs custom)
- ✅ AddressValue saved (location-id or custom address)
- ✅ Across entire app uses saved address

### In Admin Panels:
- ✅ Orders show which location/address used
- ✅ Analytics can filter by location
- ✅ Movement history shows location
- ✅ Calendar events include location details

---

## 6️⃣ Troubleshooting

**"Email already in use"**
- Normal! Don't run setup twice. Existing accounts are fine.

**Location dropdown not showing**
- Refresh page (Ctrl+R)
- Check logged in with location account (not admin)
- Clear cache (Ctrl+Shift+Delete)

**Address not saving**
- Check browser console (F12) for errors
- Verify Firebase is running
- Try again - network might be slow

**Wrong address in order**
- No problem! User can change location in dropdown anytime
- Just make different selection for next order
- Saved automatically

---

## 7️⃣ Password Management

### First Login:
- Use temporary password: `{location-id}-2026-TEMP`
- User MUST change password (security best practice)

### Reset Password:
- If needed, use Firebase Console:
  1. Go to Authentication tab
  2. Find user by email
  3. Click "..." menu → Reset Password
  4. User gets email with reset link

### Password Policy:
- Min 8 characters (Firebase default)
- Can be changed by user anytime
- Admins can reset via Firebase Console

---

## 8️⃣ Database Changes

New fields added to users:
```javascript
locationId: "honsha-sagami"              // Assigned location
selectedAddressType: "location"          // last selection type
selectedAddressValue: "honsha-sagami"    // last selected value
```

New fields in orders:
```javascript
AddressType: "location"                  // how address was chosen
AddressValue: "honsha-sagami"            // location-id or custom address
```

---

## ⚡ One-Command Setup

```javascript
import('./js/location-setup.js').then(m => m.setupAllLocationAccounts()).then(r => import('./js/location-setup.js').then(m => m.printLocationCredentials()))
```

Copy this one line, paste in console, press Enter. Done! 🎉

---

## 📞 Support
See LOCATION_SETUP_GUIDE.md for detailed information
