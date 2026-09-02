import { Controller, Get, Header } from '@nestjs/common';

// Same copy as apps/partner-app/src/lib/legalContent.ts, duplicated here
// rather than shared across packages — this is the publicly hosted version
// app stores require a real URL for; the in-app version is what actually
// governs partner-app usage. Keep both in sync when the content changes.
const LAST_UPDATED = 'September 2, 2026';

interface Section {
  heading: string;
  body: string;
}

const PRIVACY_POLICY: Section[] = [
  {
    heading: '1. Information We Collect',
    body:
      'Account information: your name, email address, phone number, and password (stored as a secure hash, ' +
      'never in plain text). Business information: restaurant name, location, business category, opening ' +
      'hours, menu, photos, and any events or promotions you create. Usage information: actions taken in the ' +
      'partner dashboard, such as sign-ins and content you publish.',
  },
  {
    heading: '2. How We Use Your Information',
    body:
      'We use this information to operate your restaurant account, process your registration and approval ' +
      'status, display your business profile, send you platform announcements and notifications, and ' +
      'maintain the security of the platform.',
  },
  {
    heading: '3. How Information Is Shared',
    body:
      'Your business profile (name, photos, menu, hours, events, promotions, and public reviews) is visible ' +
      'to platform administrators and, once published, is intended to be shown to customers browsing the ' +
      'platform. We do not sell your information to third parties. We may share information with service ' +
      'providers who help us operate the platform (such as hosting and storage providers), or where required ' +
      'by law.',
  },
  {
    heading: '4. Data Security',
    body:
      'Passwords are stored using industry-standard hashing, not as plain text. Access to your account data ' +
      'is protected by authentication tokens with a limited lifetime, and sensitive actions (like changing ' +
      'your password) are restricted to your owner account. No system is perfectly secure, but we take ' +
      'reasonable technical measures to protect your data.',
  },
  {
    heading: '5. Data Retention',
    body:
      'We retain your account and business information for as long as your account is active. If you close ' +
      'your account, we retain the minimum information necessary for legal, security, and record-keeping ' +
      'purposes for a limited period afterward.',
  },
  {
    heading: '6. Your Rights',
    body:
      'You can review and update most of your business information directly from the partner dashboard at ' +
      'any time, including deleting your account entirely from Settings &amp; Staff — for a restaurant owner, ' +
      'this permanently deletes the restaurant’s profile and all associated data; for a staff account, it ' +
      'removes only that staff member’s own access. You can also request access to, correction of, or ' +
      'deletion of your personal information by contacting the platform administrator.',
  },
  {
    heading: '7. Cookies & Similar Technologies',
    body:
      'The admin and partner dashboards use session tokens to keep you signed in. We do not use ' +
      'advertising or third-party tracking cookies.',
  },
  {
    heading: '8. Children’s Privacy',
    body: 'This platform is intended for business use by restaurant owners and staff, not by children.',
  },
  {
    heading: '9. Changes to This Policy',
    body:
      'We may update this privacy policy from time to time. Material changes will be communicated through ' +
      'the partner dashboard’s Announcements section.',
  },
  {
    heading: '10. Contact',
    body: 'Questions about this policy can be directed to the platform administrator through your dashboard.',
  },
];

const TERMS_OF_SERVICE: Section[] = [
  {
    heading: '1. Acceptance of Terms',
    body:
      'By registering a restaurant on this platform, you agree to be bound by these Terms of Service. ' +
      'If you are registering on behalf of a business, you confirm that you have the authority to bind ' +
      'that business to these terms. If you do not agree, do not register or use the platform.',
  },
  {
    heading: '2. What This Platform Does',
    body:
      'This platform lets restaurants in Iraq create and manage a public business profile — menu, photos, ' +
      'opening hours, events, promotions, and customer reviews — from a partner dashboard. New restaurant ' +
      'accounts start as Pending Review and must be approved by a platform administrator before the account ' +
      'gains full access.',
  },
  {
    heading: '3. Account Registration & Accuracy',
    body:
      'You must provide accurate, current information about your restaurant, including its name, contact ' +
      'phone number, location, and business category. You are responsible for keeping this information up ' +
      'to date and for all activity that happens under your account, including any staff accounts you invite.',
  },
  {
    heading: '4. Staff Accounts',
    body:
      'You may invite staff members as Managers or Menu Editors. You are responsible for the actions taken ' +
      'by any staff account you create, and for removing staff access when it is no longer appropriate ' +
      '(for example, when someone leaves your business). Manager accounts have broad access to your ' +
      'restaurant’s data; Menu Editor accounts are limited to menu, gallery, reviews, and chef profile management.',
  },
  {
    heading: '5. Content You Submit',
    body:
      'You retain ownership of the photos, menu items, descriptions, event listings, and promotions you ' +
      'upload ("Restaurant Content"). By submitting Restaurant Content, you grant the platform a license to ' +
      'display it to admins and, in the future, to customers browsing the platform. You are responsible for ' +
      'making sure your Restaurant Content is accurate and that you have the rights to use it (for example, ' +
      'photos you did not take yourself).',
  },
  {
    heading: '6. Promotions',
    body:
      'Discounts and promotions you create are reviewed by a platform administrator before they go live. ' +
      'You are responsible for honoring any discount or offer you publish. The platform may reject or remove ' +
      'a promotion that is misleading, discriminatory, or violates applicable law.',
  },
  {
    heading: '7. Events & Reservations',
    body:
      'If you publish events with reservations enabled, you are responsible for honoring confirmed ' +
      'reservations and for managing capacity accurately. Guest contact details submitted through a ' +
      'reservation may only be used to manage that reservation.',
  },
  {
    heading: '8. Customer Reviews',
    body:
      'Reviews are submitted by customers and are not written or controlled by the platform. You may reply ' +
      'publicly to a review. Reviews may be moderated (flagged or hidden) if they violate platform policy, ' +
      'but the platform is not obligated to remove a review solely because you disagree with it.',
  },
  {
    heading: '9. Prohibited Conduct',
    body:
      'You may not: submit false or misleading business information; post content that is unlawful, ' +
      'defamatory, or infringes someone else’s rights; attempt to manipulate reviews or ratings; use the ' +
      'platform to harass staff, customers, or other restaurants; or attempt to gain unauthorized access to ' +
      'accounts or data that are not yours.',
  },
  {
    heading: '10. Suspension & Termination',
    body:
      'A platform administrator may suspend or reject a restaurant account for violating these terms, ' +
      'submitting inaccurate information, or for other legitimate operational reasons. A suspended account ' +
      'keeps read access to its own data but loses the ability to make changes until reinstated. You may ' +
      'stop using the platform at any time by contacting support, or delete your account directly from ' +
      'Settings &amp; Staff.',
  },
  {
    heading: '11. Fees',
    body:
      'The platform is currently free to use for restaurant partners. If fees are introduced in the future, ' +
      'you will be notified in advance and given the opportunity to review the updated terms before any ' +
      'charge applies.',
  },
  {
    heading: '12. Disclaimers',
    body:
      'The platform is provided "as is." While we aim for high availability, we do not guarantee ' +
      'uninterrupted or error-free service, and we are not responsible for losses arising from platform ' +
      'downtime, third-party actions, or inaccurate information you or a customer submits.',
  },
  {
    heading: '13. Limitation of Liability',
    body:
      'To the extent permitted by law, the platform’s liability for any claim arising from your use of the ' +
      'service is limited to direct damages and does not extend to indirect, incidental, or consequential losses.',
  },
  {
    heading: '14. Governing Law',
    body: 'These terms are governed by the laws of the Republic of Iraq.',
  },
  {
    heading: '15. Changes to These Terms',
    body:
      'We may update these terms from time to time. Material changes will be communicated through the ' +
      'partner dashboard’s Announcements section. Continuing to use the platform after a change takes ' +
      'effect means you accept the updated terms.',
  },
  {
    heading: '16. Contact',
    body: 'Questions about these terms can be directed to the platform administrator through your dashboard.',
  },
];

function renderPage(title: string, sections: Section[]): string {
  const sectionsHtml = sections
    .map((s) => `<section><h2>${s.heading}</h2><p>${s.body}</p></section>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — LiQETA</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px 96px;
    line-height: 1.65;
    color: #1f1a14;
    background: #fdfbf7;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #f2ece3; background: #16130f; }
    .updated { color: #b3a997 !important; }
    a { color: #e0a155 !important; }
  }
  h1 { font-size: 26px; margin-bottom: 4px; }
  .updated { font-size: 13px; color: #6b6255; margin-bottom: 40px; }
  h2 { font-size: 16px; margin-top: 32px; margin-bottom: 8px; }
  p { font-size: 15px; margin: 0; }
  a { color: #c97f2e; }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="updated">Last updated: ${LAST_UPDATED}</p>
  ${sectionsHtml}
</body>
</html>`;
}

@Controller()
export class LegalController {
  @Get('privacy-policy')
  @Header('Content-Type', 'text/html')
  privacyPolicy() {
    return renderPage('Privacy Policy', PRIVACY_POLICY);
  }

  @Get('terms-of-service')
  @Header('Content-Type', 'text/html')
  termsOfService() {
    return renderPage('Terms of Service', TERMS_OF_SERVICE);
  }
}
