const http = require('http');
const fs = require('fs');
http.createServer((req, res) => {
  fs.readFile(__dirname + '/index.html', (err, data) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}).listen(8125, () => console.log('up'));
