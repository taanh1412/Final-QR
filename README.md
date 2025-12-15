# Library QR Code Scanner - Book Check-In

A static web application for librarians to scan book QR codes and process check-ins.

## Features

- 🔐 **Secure Login** - Built-in authentication for librarians and admins
- 📱 Camera-based QR code scanning
- 🎨 Modern, premium dark mode UI with glassmorphism
- ✅ Real-time check-in processing
- 📊 Visual feedback for successful/failed check-ins
- 🎥 Multi-camera support
- ⚡ **Auto-configured API** - No manual setup required

## Setup

### Prerequisites

- A modern web browser (Chrome, Edge, Firefox, Safari)
- HTTPS connection or localhost (required for camera access)
- A valid librarian or admin account

### First-Time Use

1. **Open the application**
   - For local testing: Open `index.html` directly in your browser
   - For production: Access via your deployed URL

2. **Sign In**
   - Enter your **email or username**
   - Enter your **password**
   - Click **Sign In**
   - Note: Only librarian and admin accounts have access

3. **Configure Camera** (optional)
   - After logging in, click the ⚙️ settings icon
   - Select your preferred **Camera** (if you have multiple cameras)
   - Click **Save**

4. **Grant Camera Permission**
   - When prompted, allow the browser to access your camera

## Usage

### Logging In

- Use your librarian or admin credentials from the main library system
- The app automatically connects to: `https://shark-app-5kdo2.ondigitalocean.app`
- Your session persists until you explicitly log out

### Checking In Books

1. Click **"Start Camera"** to activate the QR scanner
2. Point your camera at a book's QR code (containing the book item barcode)
3. The scanner will automatically detect and process the code
4. View the check-in result:
   - ✅ Success: Book has been checked in
   - ⚠️ Fine created: If the book was overdue
   - ❌ Error: If check-in failed (e.g., book not loaned out)
5. Click **"Scan Next Book"** to continue

### Camera Controls

- **Start Camera**: Begins scanning for QR codes
- **Stop Camera**: Stops the camera temporarily
- The scanner automatically stops after each successful scan

### Logging Out

- Click the **"Logout"** button in the top right header
- Your session will be cleared and you'll return to the login page

## Technical Details

### Backend Integration

The app connects to your existing backend API:

- **Endpoint**: `POST /api/lendings/checkin`
- **Payload**: `{ "book_item_barcode": "scanned_barcode" }`
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN`

### Response Handling

Successful check-in:
```json
{
  "message": "Book checked in successfully",
  "fine_created": false
}
```

Failed check-in:
```json
{
  "message": "No active lending found for this book item"
}
```

### Data Storage

Settings are stored securely in browser localStorage:
- Backend URL
- Auth token (stored securely, not visible after entry)
- Selected camera ID

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Requires HTTPS or localhost for camera access

## Deployment Notes

### Local Development
- Simply open `index.html` in your browser
- Use `http://localhost:3000` or your local backend URL

### Production Deployment

**IMPORTANT**: Camera access requires HTTPS in production.

**Option 1: Static File Server**
- Upload all files to any static hosting (Vercel, Netlify, GitHub Pages, etc.)
- Ensure HTTPS is enabled

**Option 2: With Your Backend**
- Place files in your backend's public/static directory
- Serve via your backend's static file middleware

**Option 3: Simple HTTP Server**
```bash
# Python 3
python -m http.server 8000

# Node.js (install http-server globally)
npx http-server
```

Then access at: `http://localhost:8000`

### CORS Considerations

If your frontend and backend are on different domains, ensure your backend has CORS enabled:

```javascript
// Express.js example
app.use(cors({
  origin: 'https://your-scanner-app.com',
  credentials: true
}));
```

## Troubleshooting

### Camera Not Working
- Ensure you've granted camera permissions in your browser
- Try using HTTPS instead of HTTP
- Check if another application is using the camera
- Try a different browser (Chrome recommended)

### Authentication Errors (401/403)
- Verify your JWT token is valid and not expired
- Ensure the token has librarian/admin role permissions
- Check the backend URL is correct

### Check-In Failed
- Verify the book is currently loaned out
- Ensure the barcode matches a book item in your system
- Check network connectivity to backend

### QR Code Not Scanning
- Ensure adequate lighting
- Hold the QR code steady
- Try adjusting the distance from the camera
- Make sure the QR code is clearly visible and not damaged

## Security Notes

- Auth tokens are stored in browser localStorage (cleared when you clear browser data)
- Always use HTTPS in production
- Tokens are sent only to the configured backend URL
- No data is sent to third parties

## Support

For issues related to:
- **Backend API**: Check your backend logs and API documentation
- **QR Scanner**: Verify browser compatibility and camera permissions
- **UI/UX**: Clear browser cache and reload the page

---

**Version**: 1.0.0  
**Author**: Library Management System  
**License**: MIT
