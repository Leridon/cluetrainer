const http = require('http');
const https = require('https');

const PORT = 3001;

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.url.startsWith('/maps/')) {
    const targetUrl = `https://runeapps.org${req.url}`;
    
    console.log(`Proxying: ${targetUrl}`);
    
    https.get(targetUrl, (proxyRes) => {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (proxyRes.headers['content-type']) {
        headers['Content-Type'] = proxyRes.headers['content-type'];
      }
      if (proxyRes.headers['content-length']) {
        headers['Content-Length'] = proxyRes.headers['content-length'];
      }
      if (proxyRes.headers['content-encoding']) {
        headers['Content-Encoding'] = proxyRes.headers['content-encoding'];
      }

      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    }).on('error', (e) => {
      console.error('Proxy error:', e.message);
      res.writeHead(500, { 
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      });
      res.end('Proxy error: ' + e.message);
    });
  } else {
    res.writeHead(404, { 
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    });
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`CORS proxy server running on http://localhost:${PORT}`);
  console.log(`Proxying requests from /maps/* to https://runeapps.org/maps/*`);
});
