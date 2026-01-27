import * as http from 'http';
import * as url from 'url';

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5555/callback';
const SCOPES = 'read,activity:read_all';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET in environment.');
  console.error('Set them in .env.local or export them before running this script.');
  process.exit(1);
}

const AUTHORIZE_URL = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${SCOPES}`;

async function exchangeCodeForToken(code: string) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`);
  }

  return response.json();
}

async function main() {
  console.log('=== Strava Authorization ===\n');
  console.log('1. Open this URL in your browser:\n');
  console.log(`   ${AUTHORIZE_URL}\n`);
  console.log('2. Authorize the app on Strava');
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
        console.log(`STRAVA_ACCESS_TOKEN=${tokenData.access_token}`);
        console.log(`STRAVA_REFRESH_TOKEN=${tokenData.refresh_token}`);
        console.log(`\nAthlete: ${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`);
        console.log(`Token expires: ${new Date(tokenData.expires_at * 1000).toLocaleString()}`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1>Authorization Successful!</h1>
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
