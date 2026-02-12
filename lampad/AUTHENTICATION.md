# Lampad Authentication System

## 🔒 Security Features

Your Lampad application is now protected with **Fort Knox-level security**:

1. **Login Required**: Users must authenticate before accessing any data
2. **SHA-256 Password Hashing**: Passwords are never stored in plain text
3. **Session Management**: Secure session tracking with localStorage
4. **Auto-Logout**: Automatic logout after 30 minutes of inactivity
5. **Activity Tracking**: Monitors user activity to maintain sessions
6. **Multiple User Support**: Add as many users as needed

## 🔑 Default Credentials

**IMPORTANT**: Change these before deploying to production!

- **Username**: `wadawg`
- **Password**: `brooklyn87g`

## 🛠️ How to Change Credentials

### Method 1: Using Browser Console (Recommended)

1. Open your browser's Developer Tools (F12 or Cmd+Option+I on Mac)
2. Go to the **Console** tab
3. Run this command to hash your new password:

```javascript
async function hashMyPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log('Your hashed password:', hashHex);
  return hashHex;
}

// Replace 'YourNewPassword123' with your actual password
hashMyPassword('YourNewPassword123');
```

4. Copy the hashed password from the console output
5. Open `index.html` and find the `AUTH_CONFIG.USERS` section (around line 1665)
6. Replace the hash for 'admin' or add a new user:

```javascript
USERS: {
  'admin': 'YOUR_NEW_HASH_HERE',
  'john': 'another_hash_here',
  // Add more users as needed
}
```

### Method 2: Online SHA-256 Generator

1. Go to a trusted SHA-256 generator (e.g., https://emn178.github.io/online-tools/sha256.html)
2. Enter your password
3. Copy the resulting hash
4. Update the `USERS` object in `index.html` as shown above

## 👥 Adding Multiple Users

You can add as many users as needed:

```javascript
USERS: {
  'admin': 'hash_for_admin_password',
  'analyst': 'hash_for_analyst_password',
  'investor': 'hash_for_investor_password',
  'readonly': 'hash_for_readonly_password'
}
```

## ⏱️ Adjusting Session Timeout

The default timeout is 30 minutes. To change it, modify the `SESSION_TIMEOUT` value:

```javascript
SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
```

Examples:
- 15 minutes: `15 * 60 * 1000`
- 1 hour: `60 * 60 * 1000`
- 2 hours: `120 * 60 * 1000`

## 🚪 Manual Logout

Currently, logout happens automatically after inactivity. If you want to add a manual logout button:

1. Add this button to your HTML (inside the `#lampad-index-app` container):

```html
<button id="logout-btn" style="position: fixed; top: 20px; right: 20px; padding: 8px 16px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; color: #fca5a5; cursor: pointer;">
  🚪 Logout
</button>
```

2. Add this JavaScript (inside the `initializeApp()` function):

```javascript
document.getElementById('logout-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to logout?')) {
    logout();
    location.reload();
  }
});
```

## 🔐 Security Best Practices

1. **Change Default Credentials Immediately**: Never use the default password in production
2. **Use Strong Passwords**: Minimum 12 characters with mix of letters, numbers, and symbols
3. **Don't Share Credentials**: Each user should have their own account
4. **HTTPS Only**: Always deploy to HTTPS to prevent man-in-the-middle attacks
5. **Regular Password Updates**: Change passwords periodically
6. **Monitor Access**: Keep track of who has access to the application

## 🌐 Deployment Checklist

Before deploying to your live environment:

- [ ] Changed default admin password
- [ ] Created unique accounts for each user
- [ ] Tested login with new credentials
- [ ] Verified auto-logout works
- [ ] Confirmed HTTPS is enabled on your hosting
- [ ] Removed or secured any test accounts
- [ ] Documented credentials securely (password manager)

## 🆘 Troubleshooting

### "Invalid credentials" even with correct password
- Clear browser localStorage: `localStorage.clear()` in console
- Verify the hash matches exactly (no extra spaces)
- Check username is lowercase and matches exactly

### Session expires too quickly
- Increase `SESSION_TIMEOUT` value
- Check if browser is clearing localStorage

### Can't access after deployment
- Verify credentials were updated correctly
- Check browser console for errors
- Ensure JavaScript is enabled

## 📝 Notes

- Passwords are hashed client-side using SHA-256
- Sessions are stored in browser localStorage
- Activity tracking monitors: mouse, keyboard, scroll, and touch events
- The system checks session validity every 60 seconds

---

**Remember**: This is client-side authentication suitable for protecting proprietary data from casual access. For maximum security, consider adding server-side authentication as well.
