import { appPrivacyPage, appTermsPage, deleteAccountPage, homePage, langOf } from './site.controller';

describe('public site pages', () => {
  it('falls back to English for anything but ar', () => {
    expect(langOf('ar')).toBe('ar');
    expect(langOf('fr')).toBe('en');
    expect(langOf(undefined)).toBe('en');
  });

  it('renders Arabic pages right-to-left', () => {
    expect(appPrivacyPage('ar')).toContain('dir="rtl"');
    expect(appTermsPage('en')).toContain('dir="ltr"');
  });

  it('stamps the request nonce on the delete page script and calls the API on the same host', () => {
    const html = deleteAccountPage('en', 'abc123');
    expect(html).toContain('<script nonce="abc123">');
    expect(html).toContain("'/v1/customer-auth/request-code'");
    expect(html).toContain("'/v1/customers/me'");
  });

  it('home page links to every legal page', () => {
    const html = homePage('en');
    for (const href of ['/app-privacy', '/app-terms', '/delete-account', '/privacy-policy', '/terms-of-service']) {
      expect(html).toContain(href);
    }
  });
});
