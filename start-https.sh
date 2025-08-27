#!/bin/bash

# 🔒 Quick HTTPS Server Launcher
# Usage: ./start-https.sh

echo "🚀 Starting HTTPS server for YouTube embed compatibility..."
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found - using Python HTTPS server"
    python3 serve-https.py
elif command -v node &> /dev/null; then
    echo "✅ Node.js found - using Node HTTPS server"
    node serve-https.js
elif command -v http-server &> /dev/null; then
    echo "✅ http-server found - using npm http-server"
    
    # Create certificate if not exists
    if [ ! -f "localhost.pem" ] || [ ! -f "localhost-key.pem" ]; then
        echo "🔐 Creating self-signed certificate..."
        openssl req -x509 -newkey rsa:4096 -keyout localhost-key.pem -out localhost.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    fi
    
    http-server -S -C localhost.pem -K localhost-key.pem -p 8443
else
    echo "❌ No suitable server found. Please install one of:"
    echo "   • Python 3: python3 serve-https.py"
    echo "   • Node.js: node serve-https.js"
    echo "   • npm http-server: npm install -g http-server"
    echo ""
    echo "📖 See setup-https.md for detailed instructions"
fi
