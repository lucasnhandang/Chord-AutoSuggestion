#!/usr/bin/env node
/**
 * Simple HTTPS server for local development
 * Run: node serve-https.js
 * Access: https://localhost:8386
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exec } = require('child_process');

const PORT = 8386;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function createSelfSignedCert() {
    const certFile = 'localhost.pem';
    const keyFile = 'localhost-key.pem';
    
    if (!fs.existsSync(certFile) || !fs.existsSync(keyFile)) {
        console.log('Creating self-signed certificate...');
        
        try {
            execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${keyFile} -out ${certFile} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, { stdio: 'inherit' });
            console.log(`- Certificate created: ${certFile}, ${keyFile}`);
        } catch (error) {
            console.log('- Error: OpenSSL not found. Install with: brew install openssl (macOS)');
            return null;
        }
    }
    
    return {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile)
    };
}

function serveFile(req, res) {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('File not found');
        return;
    }
    
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'text/plain';
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
}

function main() {
    const credentials = createSelfSignedCert();
    
    if (!credentials) {
        console.log('\n- Alternative: Use http-server package:');
        console.log('   npm install -g http-server');
        console.log('   http-server -S -C localhost.pem -K localhost-key.pem');
        return;
    }
    
    const server = https.createServer(credentials, serveFile);
    
    server.listen(PORT, () => {
        const url = `https://localhost:${PORT}`;
        console.log(`- HTTPS Server running at: ${url}`);
        console.log(`- Serving files from: ${__dirname}`);
        console.log('- You\'ll see a security warning - click \'Advanced\' then \'Proceed to localhost\'');
        console.log('- Press Ctrl+C to stop');
        
        // Auto-open browser
        const openCmd = process.platform === 'darwin' ? 'open' : 
                        process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${openCmd} ${url}`);
    });
}

main();
