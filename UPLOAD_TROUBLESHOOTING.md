# Upload Troubleshooting Guide

## How to Debug the Upload

### Step 1: Open Developer Console
1. Open your browser
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Go to http://localhost:3000

### Step 2: Watch Initialization
You should see these logs appear immediately:

```
[AppController] Initializing...
[AppController] Loading HTML partials...
[AppController] Loaded upload partial
[AppController] All partials loaded, initializing modules...
[UploadModule] Initializing - dropzone: true fileInput: true uploadBtn: true clearFilesBtn: true
[UploadModule] All elements found, attaching event listeners...
[UploadModule] Initialization complete - all listeners attached
```

**If you DON'T see these logs**, the HTML partials aren't loading properly.

---

### Step 3: Test File Selection
1. Click on the dropzone or the "Upload Files" button area
2. Select 1 file (PDF, TXT, or DOCX)
3. Watch console for:

```
[UploadModule] Files selected: 1
[UploadModule] handleFiles() called with 1 files
[UploadModule] Added file: yourfile.pdf
[UploadModule] updateFileList() - rendering 1 files
```

**If no logs appear:**
- Event listeners aren't attached properly
- Try refreshing page and check initialization logs

---

### Step 4: Test Upload
1. Click the "Upload 1 File" button
2. Watch console for:

```
[UploadModule] Upload button clicked
[UploadModule] uploadFiles() called with 1 files
[UploadModule] FormData created with 1 files
[UploadModule] Sending XHR to /api/materials/upload-combined
[UploadModule] Upload progress: 10%
[UploadModule] Upload progress: 50%
[UploadModule] Upload progress: 100%
[UploadModule] XHR load event - status: 201
[UploadModule] Upload response: { success: true, material: {...} }
[UploadModule] Reloading materials
```

---

## What Each Log Means

| Log | Meaning | What to Check |
|-----|---------|---------------|
| `Initializing - dropzone: false` | HTML element not found | Upload HTML didn't load from `/html/upload.html` |
| `Upload button clicked` | Button event fired | Good - listener is working |
| `uploadFiles() called with 0 files` | No files selected | Select files first before clicking upload |
| `XHR load event - status: 404` | Upload endpoint not found | Server routing issue |
| `XHR load event - status: 500` | Server error | Check server console for error |
| `XHR load event - status: 201` | Success! | Wait for response parsing |
| `Upload response: { success: true...` | Success message | Files uploaded! |
| `CRITICAL: Missing required DOM elements!` | Init failed completely | Something blocked element creation |

---

## Common Problems & Solutions

### Problem: "Upload button clicked" but no upload progress
**Cause**: XHR.send() failed silently  
**Solution**: 
- Check Network tab (F12 → Network)
- Look for POST request to `/api/materials/upload-combined`
- Check if it shows red (failed)

### Problem: "XHR load event - status: 500"
**Cause**: Backend server error  
**Solution**:
- Check server terminal for error messages
- Common: File parser failing, missing dependencies
- Try uploading a simple .txt file first

### Problem: "XHR load event - status: 201" but "Error parsing response"
**Cause**: Response body isn't valid JSON  
**Solution**:
- Check Network tab → Response tab
- Look at what the server actually returned
- May need to check file parsing service

### Problem: No logs appear at all when clicking button
**Cause**: Event listener not attached  
**Solution**:
- Refresh page completely (Ctrl+Shift+R)
- Check if initialization logs appear
- If not, HTML partial loading failed

---

## Server Logs to Check

In your terminal where `npm run dev` is running, you should see:

```
=== UPLOAD COMBINED SOURCES DEBUG ===
Files received: 1
Title: Untitled Material
Processing 1 files for combined material "Untitled Material"
Creating single material record...
✓ Created material ID: abc123, Title: "filename.pdf"
✓ Stored X embeddings for material abc123 (1 source file(s))
=== UPLOAD COMBINED SUCCESS ===
One material created from 1 files
```

**If you see errors like:**
- `Error processing file` - File parser failed
- `Failed to extract content` - File couldn't be read
- `Error uploading combined sources` - Unexpected error

Check the specific error message in the terminal.

---

## Network Tab Debugging

1. Open DevTools (F12)
2. Go to **Network** tab
3. Try uploading files
4. Find the POST request to `/api/materials/upload-combined`
5. Click on it and check:

**Request:**
- Method: POST
- URL: http://localhost:3000/api/materials/upload-combined
- Body: Should show FormData with files

**Response:**
- Status: Should be 201
- Headers: Should have Content-Type: application/json
- Response: Should show JSON with success: true

---

## Test Checklist

Use this checklist to verify each step works:

- [ ] Page loads and displays upload tab
- [ ] Console shows AppController initialization logs
- [ ] Console shows UploadModule initialization with all elements found
- [ ] Can click dropzone and open file picker
- [ ] Selected file appears in file list with name and size
- [ ] "Upload Files" button changes text to "Upload 1 File"
- [ ] "Upload Files" button is no longer disabled (not grayed out)
- [ ] Click button triggers "[UploadModule] Upload button clicked" log
- [ ] Progress bar appears and shows percentage
- [ ] Console shows "XHR load event - status: 201"
- [ ] Success notification appears
- [ ] File list clears
- [ ] Materials tab shows uploaded material

---

## Quick Test with curl (Terminal)

If you have a test file, try this in PowerShell:

```powershell
$file = "C:\path\to\test.txt"
$uri = "http://localhost:3000/api/materials/upload-combined"
$form = @{ files = Get-Item $file }
Invoke-WebRequest -Uri $uri -Method Post -Form $form
```

If this works, the backend is fine and the issue is frontend-only.

---

## Report Template

When reporting an issue, include:

1. **Last console log before it stops**: Copy the exact log message
2. **Browser/OS**: Chrome/Firefox/Safari, Windows/Mac/Linux
3. **File size**: Is the file small (< 5MB)?
4. **File type**: PDF/TXT/DOCX?
5. **Repeatable**: Does it happen every time?
6. **Screenshot**: Of console showing the logs
7. **Server logs**: Any error messages in the terminal?

