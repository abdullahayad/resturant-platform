import { Controller, Get, Header, Query } from '@nestjs/common';

// "Manage as this restaurant" - the admin portal's QR points here rather
// than straight at the app's own ligetapartner:// link, because most phone
// camera QR scanners only special-case http(s) links (a raw custom-scheme
// QR just shows as plain text on most phones), and pasting a custom scheme
// into a browser's address bar isn't reliably handed off to an app either.
// A real link tap on an actual webpage is what Android reliably hands off
// to whichever app registered the scheme, so this page exists purely to be
// that tap target. The token is read server-side and baked directly into
// the page, rather than parsed from the URL client-side, so there's no
// dependency on how any particular browser/router handles query strings.
function renderPage(token: string | undefined): string {
  const safeToken = token ? encodeURIComponent(token) : null;
  const deepLink = safeToken ? `ligetapartner://support?token=${safeToken}` : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Open Support Session — LiGETA</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
    padding: 24px;
    box-sizing: border-box;
    color: #1f1a14;
    background: #fdfbf7;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #f2ece3; background: #16130f; }
    .card { background: #221c15 !important; border-color: #3a3226 !important; }
    .sub { color: #b3a997 !important; }
    .error { background: #3a241a !important; color: #e0a155 !important; }
  }
  .card {
    width: 100%;
    max-width: 380px;
    background: #ffffff;
    border: 1px solid #ece4d6;
    border-radius: 20px;
    padding: 28px 24px;
    text-align: center;
    box-shadow: 0 12px 32px rgba(0,0,0,0.08);
  }
  .eyebrow {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #c97f2e;
    background: rgba(201,127,46,0.12);
    padding: 5px 12px;
    border-radius: 999px;
  }
  h1 { font-size: 20px; margin: 14px 0 6px; }
  .sub { font-size: 13.5px; color: #6b6255; line-height: 1.5; margin: 0 0 22px; }
  .btn {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border: none;
    border-radius: 12px;
    padding: 15px 18px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    background: #c97f2e;
    color: #fff8f0;
    text-decoration: none;
  }
  .hint { margin-top: 16px; font-size: 12px; color: #6b6255; line-height: 1.5; }
  .error {
    background: rgba(201,127,46,0.1);
    color: #c97f2e;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12.5px;
  }
</style>
</head>
<body>
  <div class="card">
    <span class="eyebrow">Admin Support Session</span>
    ${
      deepLink
        ? `<h1>Continue to the app</h1>
    <p class="sub">Tap below to open the LiGETA Restaurant app, signed in as this restaurant.</p>
    <a class="btn" href="${deepLink}">Open LiGETA Restaurant</a>
    <p class="hint">If nothing happens, make sure the LiGETA Restaurant app is installed on this phone, then try again.</p>`
        : `<h1>Link expired or invalid</h1>
    <p class="error">This session link is missing or no longer valid — go back to the admin portal and generate a new QR code.</p>`
    }
  </div>
</body>
</html>`;
}

@Controller()
export class SupportSessionPageController {
  @Get('support-session')
  @Header('Content-Type', 'text/html')
  supportSession(@Query('token') token?: string) {
    return renderPage(token);
  }
}
