# HTTPS Setup for localhost

## Quick Start

Run the HTTPS server with Node.js:

```bash
node serve-https.js
```

The server will automatically:
- Start on https://localhost:8386
- Create self-signed certificates
- Open your default browser

## SSL Certificate Warning

When accessing HTTPS localhost for the first time:
1. Browser shows "Your connection is not private" warning
2. Click "Advanced"
3. Click "Proceed to localhost (unsafe)"
4. This is normal with self-signed certificates

## Generated Files

The script automatically creates:
- `localhost.pem` - Certificate file
- `localhost-key.pem` - Private key file

## Requirements

Node.js and OpenSSL **must** be installed:

**macOS:**
```bash
brew install openssl
brew install node
```

**Ubuntu/Debian:**
```bash
sudo apt-get install openssl
```

**Windows:**
- Download Node (https://nodejs.org) with LTS version
- Download OpenSSL (https://slproweb.com/products/Win32OpenSSL.html) with proper version (Win32/64)

## Troubleshooting

**Port conflict:** Change PORT variable in serve-https.js

**YouTube embed not working:**
1. Ensure using HTTPS (not HTTP)
2. Check browser console for errors
3. Try different video ID
