const fs = require('fs');
const timestamp = Date.now();

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
    /<script src="script.js\?v=.*?">/,
    `<script src="script.js?v=${timestamp}">`
);
fs.writeFileSync('index.html', html);
