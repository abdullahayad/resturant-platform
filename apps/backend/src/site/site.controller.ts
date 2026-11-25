import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { APP_LEGAL_UPDATED, APP_PRIVACY, APP_TERMS, type Lang, type Section } from './site-content';

// The public website (ligeta.app, and the same pages on api.ligeta.app):
// a home page, the customer app's privacy policy and terms, and a page to
// delete a customer account without the app - Google Play requires that
// link. Plain server-rendered HTML like the legal and review pages; the
// only script is the delete page's, allowed through by the per-request CSP
// nonce (see main.ts). The delete page calls the API on the same host, so
// no CORS is involved.

const ORANGE = '#E8650F';

function langOf(raw?: string): Lang {
  return raw === 'ar' ? 'ar' : 'en';
}

function layout(opts: {
  lang: Lang;
  title: string;
  path: string;
  body: string;
  nonce?: string;
  script?: string;
}): string {
  const { lang, title, path, body, nonce, script } = opts;
  const other: Lang = lang === 'ar' ? 'en' : 'ar';
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} · LiGETA</title>
<meta name="description" content="${t('Discover restaurants, offers and events in Iraq.', 'اكتشف المطاعم والعروض والفعاليات في العراق.')}" />
<style>
  :root { color-scheme: light dark; --bg:#FFF9F3; --card:#FFFFFF; --text:#1F1640; --muted:#6B6585; --line:#EFE6DC; --accent:${ORANGE}; --tint:#FFEBDD; }
  @media (prefers-color-scheme: dark) { :root { --bg:#16131C; --card:#211C2B; --text:#F4F0FA; --muted:#B4ADC4; --line:#332C40; --tint:#3A2618; } }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, sans-serif; background:var(--bg); color:var(--text); line-height:1.7; }
  a { color: var(--accent); }
  header, main, footer { max-width: 760px; margin: 0 auto; padding: 0 20px; }
  header { display:flex; align-items:center; justify-content:space-between; padding-top:20px; padding-bottom:12px; }
  .brand { font-weight:800; font-size:22px; text-decoration:none; color:var(--text); letter-spacing:.5px; }
  .brand span { color: var(--accent); }
  .switch { font-size:14px; text-decoration:none; border:1px solid var(--line); border-radius:999px; padding:4px 12px; color:var(--text); }
  h1 { font-size: 28px; line-height:1.3; margin: 24px 0 4px; }
  h2 { font-size: 17px; margin: 28px 0 6px; }
  p { margin: 0 0 10px; font-size: 15.5px; }
  .muted { color: var(--muted); font-size: 14px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:18px; padding:20px; margin:16px 0; }
  .hero { text-align:center; padding: 40px 0 8px; }
  .hero h1 { font-size: 34px; }
  .hero p { font-size: 17px; color: var(--muted); }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:12px; }
  .grid .card { margin:0; }
  .grid h2 { margin-top:0; }
  label { display:block; font-weight:600; font-size:14.5px; margin: 12px 0 6px; }
  input { width:100%; font-size:18px; padding:12px 14px; border-radius:14px; border:1px solid var(--line); background:var(--bg); color:var(--text); text-align:center; }
  button { width:100%; margin-top:14px; font-size:16px; font-weight:700; padding:14px; border:0; border-radius:14px; background:var(--accent); color:#fff; cursor:pointer; }
  button.danger { background:#C62828; }
  button:disabled { opacity:.55; cursor:default; }
  .error { color:#C62828; font-size:14px; margin-top:10px; min-height:1em; }
  .done { text-align:center; }
  .hidden { display:none; }
  footer { padding-top: 24px; padding-bottom: 48px; border-top:1px solid var(--line); margin-top: 40px; font-size:14px; }
  footer a { margin-inline-end: 14px; display:inline-block; }
</style>
</head>
<body>
<header>
  <a class="brand" href="/?lang=${lang}">Li<span>G</span>ETA</a>
  <a class="switch" href="${path}?lang=${other}">${other === 'ar' ? 'العربية' : 'English'}</a>
</header>
<main>
${body}
</main>
<footer>
  <a href="/app-privacy?lang=${lang}">${t('Privacy policy', 'سياسة الخصوصية')}</a>
  <a href="/app-terms?lang=${lang}">${t('Terms of use', 'شروط الاستخدام')}</a>
  <a href="/delete-account?lang=${lang}">${t('Delete account', 'حذف الحساب')}</a>
  <a href="/privacy-policy">${t('Partner privacy', 'خصوصية الشركاء')}</a>
  <a href="/terms-of-service">${t('Partner terms', 'شروط الشركاء')}</a>
  <p class="muted">&copy; ${new Date().getFullYear()} LiGETA</p>
</footer>
${script && nonce ? `<script nonce="${nonce}">${script}</script>` : ''}
</body>
</html>`;
}

function legalBody(lang: Lang, title: string, sections: Section[]): string {
  const updated = lang === 'ar' ? 'آخر تحديث: ' : 'Last updated: ';
  return `<h1>${title}</h1>
<p class="muted">${updated}${APP_LEGAL_UPDATED[lang]}</p>
${sections.map((s) => `<h2>${s.heading}</h2>${s.body.map((p) => `<p>${p}</p>`).join('')}`).join('\n')}`;
}

export function homePage(lang: Lang): string {
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const body = `<section class="hero">
  <h1>${t('Find your next favourite place to eat', 'اكتشف مكانك المفضّل القادم للأكل')}</h1>
  <p>${t('LiGETA helps you discover restaurants, offers and events in Iraq.', 'ليگيتا يساعدك على اكتشاف المطاعم والعروض والفعاليات في العراق.')}</p>
</section>
<div class="grid">
  <div class="card"><h2>${t('Discover', 'اكتشف')}</h2><p>${t('Search by area, cuisine, mood or what is open now - including late-night spots and healthy dishes.', 'ابحث حسب المنطقة أو المطبخ أو المزاج أو المفتوح الآن، بما فيها أماكن السهر والأطباق الصحية.')}</p></div>
  <div class="card"><h2>${t('Offers and events', 'عروض وفعاليات')}</h2><p>${t("See today's deals and book a seat at live music nights, buffets and more.", 'شاهد عروض اليوم واحجز مكانك في ليالي الموسيقى والبوفيهات وغيرها.')}</p></div>
  <div class="card"><h2>${t('Honest reviews', 'تقييمات صادقة')}</h2><p>${t('Reviews from real visits, verified when the restaurant scans your visit code.', 'تقييمات من زيارات حقيقية، موثّقة عندما يمسح المطعم رمز زيارتك.')}</p></div>
</div>
<div class="card">
  <h2>${t('For restaurants', 'للمطاعم')}</h2>
  <p>${t('Restaurants manage their menu, offers, events, bookings and reviews in the free LiGETA partner app.', 'تدير المطاعم قوائمها وعروضها وفعالياتها وحجوزاتها وتقييماتها من تطبيق ليگيتا للشركاء المجاني.')}</p>
</div>`;
  return layout({ lang, title: t('Discover restaurants in Iraq', 'اكتشف المطاعم في العراق'), path: '/', body });
}

export function appPrivacyPage(lang: Lang): string {
  const title = lang === 'ar' ? 'سياسة الخصوصية - تطبيق الزبائن' : 'Privacy Policy - LiGETA app';
  return layout({ lang, title, path: '/app-privacy', body: legalBody(lang, title, APP_PRIVACY[lang]) });
}

export function appTermsPage(lang: Lang): string {
  const title = lang === 'ar' ? 'شروط الاستخدام - تطبيق الزبائن' : 'Terms of Use - LiGETA app';
  return layout({ lang, title, path: '/app-terms', body: legalBody(lang, title, APP_TERMS[lang]) });
}

// The account-deletion link for the restaurant app's store listings.
export function partnerDeletePage(lang: Lang): string {
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const mail = 'ligeta.support@gmail.com';
  const body = `<h1>${t('Delete your LiGETA restaurant account', 'حذف حساب مطعمك في ليگيتا')}</h1>
<p>${t('This page is for the LiGETA restaurant app (LiGETA Partner).', 'هذه الصفحة خاصة بتطبيق ليگيتا للمطاعم (LiGETA Partner).')}</p>
<div class="card">
  <h2>${t('In the app', 'من التطبيق')}</h2>
  <p>${t('Sign in, open Settings & Staff, scroll to Delete Account and confirm. It happens immediately and cannot be undone.', 'سجّل الدخول وافتح الإعدادات والموظفين، ثم انزل إلى حذف الحساب وأكّد. يتم الحذف فوراً ولا يمكن التراجع عنه.')}</p>
</div>
<div class="card">
  <h2>${t('Without the app', 'بدون التطبيق')}</h2>
  <p>${t('Send an email from your account email address with the restaurant name to', 'أرسل رسالة من بريد حسابك مع اسم المطعم إلى')} <a href="mailto:${mail}?subject=Delete%20restaurant%20account">${mail}</a>. ${t('We may ask you to confirm that the account is yours.', 'قد نطلب منك تأكيد أن الحساب لك.')}</p>
</div>
<div class="card">
  <h2>${t('What gets deleted', 'ما الذي يُحذف')}</h2>
  <p>${t('Owner account: the restaurant profile, menu, gallery entries, events, bookings, offers, reviews, staff accounts, payment account details and verification documents. Staff account: only that staff login; the restaurant stays.', 'حساب المالك: ملف المطعم والقائمة ومعرض الصور والفعاليات والحجوزات والعروض والتقييمات وحسابات الموظفين وبيانات حسابات الدفع ووثائق التحقق. حساب الموظف: يُحذف دخول الموظف فقط ويبقى المطعم.')}</p>
  <p class="muted">${t('Copies of public photos may remain in our file storage after their entries are deleted. Email us to have them erased. Records we must keep for legal or security reasons are explained in the privacy policy.', 'قد تبقى نسخ من الصور العامة في مخزن الملفات بعد حذفها من التطبيق. راسلنا لمسحها. والسجلات التي يجب الاحتفاظ بها لأسباب قانونية أو أمنية موضحة في سياسة الخصوصية.')} <a href="/privacy-policy">${t('Privacy policy', 'سياسة الخصوصية')}</a></p>
</div>`;
  return layout({
    lang,
    title: t('Delete restaurant account', 'حذف حساب المطعم'),
    path: '/partner-delete-account',
    body,
  });
}

export function deleteAccountPage(lang: Lang, nonce: string): string {
  const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  const body = `<h1>${t('Delete your LiGETA account', 'حذف حسابك في ليگيتا')}</h1>
<p>${t('In the app you can do this from Profile → Delete account. Here you can do it without the app: confirm your number with a WhatsApp code, then delete.', 'يمكنك ذلك من التطبيق عبر الملف الشخصي ← حذف الحساب. وهنا يمكنك الحذف بدون التطبيق: أكّد رقمك برمز واتساب ثم احذف.')}</p>
<div class="card">
  <h2>${t('What gets deleted', 'ما الذي يُحذف')}</h2>
  <p>${t('Immediately and permanently: your account, name, phone number, follows, visits, stamp cards, notifications, support messages, helpful votes and sign-in codes.', 'فوراً وبشكل نهائي: حسابك واسمك ورقمك ومتابعاتك وزياراتك وبطاقات الختم وإشعاراتك ورسائل الدعم وأصوات "مفيد" ورموز الدخول.')}</p>
  <p class="muted">${t("Reviews you posted stay on the restaurant page but are no longer linked to you. Bookings remain in the restaurant's own records.", 'تبقى تقييماتك في صفحة المطعم لكنها لا تعود مرتبطة بك. وتبقى الحجوزات في سجلات المطعم.')}</p>
</div>
<div class="card">
  <form id="phoneStep">
    <label for="phone">${t('Your mobile number', 'رقم هاتفك')}</label>
    <input id="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07XX XXX XXXX" maxlength="20" required />
    <button type="submit">${t('Send code on WhatsApp', 'أرسل الرمز على واتساب')}</button>
  </form>
  <form id="codeStep" class="hidden">
    <label for="code">${t('6-digit code from WhatsApp', 'الرمز المكوّن من ٦ أرقام من واتساب')}</label>
    <input id="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="••••••" maxlength="6" required />
    <button type="submit">${t('Confirm', 'تأكيد')}</button>
  </form>
  <div id="confirmStep" class="hidden">
    <p><strong>${t('This cannot be undone.', 'لا يمكن التراجع عن هذا.')}</strong> ${t('Delete the account for', 'حذف الحساب الخاص بالرقم')} <span id="who"></span>?</p>
    <button id="deleteBtn" class="danger" type="button">${t('Delete my account permanently', 'احذف حسابي نهائياً')}</button>
  </div>
  <div id="doneStep" class="hidden done">
    <h2>${t('Your account has been deleted.', 'تم حذف حسابك.')}</h2>
    <p class="muted">${t('You can also remove the app from your phone.', 'يمكنك أيضاً إزالة التطبيق من هاتفك.')}</p>
  </div>
  <p id="error" class="error" role="alert"></p>
</div>`;

  const messages = {
    invalid: t('Please enter a valid Iraqi mobile number.', 'يُرجى إدخال رقم موبايل عراقي صحيح.'),
    wait: t('Too many tries. Please wait a few minutes and try again.', 'محاولات كثيرة. انتظر بضع دقائق وحاول مجدداً.'),
    unavailable: t(
      'WhatsApp codes are not available right now. Please use the app (Profile → Delete account) or try again later.',
      'رموز واتساب غير متاحة حالياً. استخدم التطبيق (الملف الشخصي ← حذف الحساب) أو حاول لاحقاً.',
    ),
    wrong: t('That code is not correct.', 'الرمز غير صحيح.'),
    expired: t('This code has expired. Go back and request a new one.', 'انتهت صلاحية الرمز. ارجع واطلب رمزاً جديداً.'),
    blocked: t(
      'This account cannot sign in. Please contact LiGETA support.',
      'هذا الحساب لا يمكنه الدخول. يُرجى التواصل مع دعم ليگيتا.',
    ),
    failed: t('Something went wrong. Please try again.', 'حدث خطأ. حاول مجدداً.'),
  };

  const script = `(function(){
var M=${JSON.stringify(messages)};
var phone='',token='';
function $(id){return document.getElementById(id);}
function show(id){['phoneStep','codeStep','confirmStep','doneStep'].forEach(function(s){$(s).classList.toggle('hidden',s!==id);});}
function err(m){$('error').textContent=m||'';}
function busy(form,on){var b=form.querySelector('button');if(b)b.disabled=on;}
function call(method,url,body,auth){var h={'Content-Type':'application/json'};if(auth)h.Authorization='Bearer '+auth;return fetch(url,{method:method,headers:h,body:body?JSON.stringify(body):undefined}).then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok){var e=new Error(Array.isArray(j.message)?j.message[0]:(j.message||''));e.status=r.status;throw e;}return j;});});}
function msg(e){if(e.status===429)return M.wait;if(e.status===503)return M.unavailable;if(e.status===403)return M.blocked;if(e.message==='Wrong code')return M.wrong;if(String(e.message).indexOf('expired')>=0)return M.expired;if(e.status===400)return M.invalid;return M.failed;}
$('phoneStep').addEventListener('submit',function(ev){ev.preventDefault();var f=this;phone=$('phone').value.trim();if(!/^(\\+?964|0)?7\\d{9}$/.test(phone.replace(/[\\s-]/g,''))){err(M.invalid);return;}err();busy(f,true);
call('POST','/v1/customer-auth/request-code',{phone:phone}).then(function(){show('codeStep');$('code').focus();}).catch(function(e){err(msg(e));}).then(function(){busy(f,false);});});
$('codeStep').addEventListener('submit',function(ev){ev.preventDefault();var f=this;var code=$('code').value.replace(/\\D/g,'');if(code.length!==6){err(M.wrong);return;}err();busy(f,true);
call('POST','/v1/customer-auth/verify',{phone:phone,code:code}).then(function(r){token=r.token;$('who').textContent=phone;show('confirmStep');}).catch(function(e){err(msg(e));$('code').value='';}).then(function(){busy(f,false);});});
$('deleteBtn').addEventListener('click',function(){var b=this;b.disabled=true;err();
call('DELETE','/v1/customers/me',null,token).then(function(){token='';show('doneStep');}).catch(function(e){err(msg(e));b.disabled=false;});});
})();`;

  return layout({ lang, title: t('Delete account', 'حذف الحساب'), path: '/delete-account', body, nonce, script });
}

@Controller()
export class SiteController {
  @Get('app-privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  appPrivacy(@Query('lang') lang?: string) {
    return appPrivacyPage(langOf(lang));
  }

  @Get('app-terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  appTerms(@Query('lang') lang?: string) {
    return appTermsPage(langOf(lang));
  }

  @Get('partner-delete-account')
  @Header('Content-Type', 'text/html; charset=utf-8')
  partnerDeleteAccount(@Query('lang') lang?: string) {
    return partnerDeletePage(langOf(lang));
  }

  @Get('delete-account')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  deleteAccount(@Query('lang') lang: string | undefined, @Res({ passthrough: true }) res: Response) {
    return deleteAccountPage(langOf(lang), res.locals.cspNonce as string);
  }
}

export { langOf };
