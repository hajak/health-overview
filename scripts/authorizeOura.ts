import * as http from 'http';
import * as url from 'url';

const CLIENT_ID = process.env.OURA_CLIENT_ID;
const CLIENT_SECRET = process.env.OURA_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:5555/callback';
const SCOPES = 'personal daily heartrate workout tag session spo2';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('=== Oura Setup Instructions ===\n');
  console.log('1. Go to https://cloud.ouraring.com/oauth/applications');
  console.log('2. Click "New Application"');
  console.log('3. Fill in:');
  console.log('   - App Name: Health Overview');
  console.log('   - Redirect URIs: http://localhost:5555/callback');
  console.log('4. After creation, copy Client ID and Client Secret');
  console.log('5. Add to .env.local:');
  console.log('   OURA_CLIENT_ID=your_client_id');
  console.log('   OURA_CLIENT_SECRET=your_client_secret');
  console.log('\n6. Run this script again: pnpm oura:auth');
  process.exit(1);
}

const AUTHORIZE_URL = `https://cloud.ouraring.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}`;

async function exchangeCodeForToken(code: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
  });

  const response = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  console.log('=== Oura Authorization ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(`   ${AUTHORIZE_URL}\n`);
  console.log('2. Authorize the app on Oura');
  console.log('3. You will be redirected back here\n');
  console.log('Waiting for callback...\n');

  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '', true);

    if (parsedUrl.pathname === '/callback') {
      const code = parsedUrl.query.code as string;

      if (!code) {
        res.writeHead(400);
        res.end('Missing authorization code');
        return;
      }

      try {
        console.log('Received authorization code, exchanging for token...');
        const tokenData = await exchangeCodeForToken(code);

        console.log('\n=== Authorization Successful ===\n');
        console.log('Add these to your .env.local:\n');
        console.log(`OURA_ACCESS_TOKEN=${tokenData.access_token}`);
        if (tokenData.refresh_token) {
          console.log(`OURA_REFRESH_TOKEN=${tokenData.refresh_token}`);
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1>Oura Authorization Successful!</h1>
              <p>You can close this window and check the terminal.</p>
            </body>
          </html>
        `);

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);

      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500);
        res.end('Token exchange failed');
      }
    }
  });

  server.listen(5555, () => {
    console.log('Listening on http://localhost:5555');
  });
}

main();
