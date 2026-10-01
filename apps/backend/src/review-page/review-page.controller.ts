import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';

// The page a printed table QR code points to - no app install, no account,
// no login. A customer scans, sees the restaurant's name, taps a star
// rating, optionally types a comment, and submits straight to the existing
// public review-creation endpoint (ReviewsController.create). Everything
// here is plain HTML/CSS/JS with no build step, same as the legal pages and
// the support-session page, since this has to work in any phone's browser
// with nothing pre-installed.
const SUB_RATING_CATEGORIES = ['food', 'service', 'staff', 'ambience'] as const;

function fiveStarButtons(starClass: string): string {
  return [1, 2, 3, 4, 5]
    .map((value) => `<button type="button" class="${starClass}" data-value="${value}">&#9733;</button>`)
    .join('');
}

function renderPage(restaurantId: string, nonce: string): string {
  const safeId = encodeURIComponent(restaurantId);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>LiGETA</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
    padding: 24px;
    color: #1f1a14;
    background: #fdfbf7;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #f2ece3; background: #16130f; }
    .card { background: #221c15 !important; border-color: #3a3226 !important; }
    .sub, .hint { color: #b3a997 !important; }
    input, textarea { background: #16130f !important; border-color: #3a3226 !important; color: #f2ece3 !important; }
    .error { background: #3a241a !important; color: #e0a155 !important; }
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: #ffffff;
    border: 1px solid #ece4d6;
    border-radius: 20px;
    padding: 28px 24px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.08);
  }
  .langToggle {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-bottom: 10px;
  }
  .langBtn {
    border: 1px solid #ece4d6;
    background: transparent;
    color: inherit;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .langBtn.active { background: #c97f2e; color: #fff8f0; border-color: #c97f2e; }
  .logo { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; margin: 0 auto 10px; display: block; }
  h1 { font-size: 19px; margin: 0 0 2px; text-align: center; }
  .sub { font-size: 13.5px; color: #6b6255; text-align: center; margin: 0 0 22px; line-height: 1.5; }
  .stars { display: flex; justify-content: center; gap: 6px; margin-bottom: 20px; direction: ltr; }
  .star {
    font-size: 36px;
    line-height: 1;
    cursor: pointer;
    color: #ece4d6;
    background: none;
    border: none;
    padding: 2px;
  }
  .star.filled { color: #c97f2e; }
  .subRatingsTitle { font-size: 12.5px; font-weight: 700; color: #6b6255; text-transform: uppercase; letter-spacing: 0.04em; margin: 18px 0 10px; }
  .subRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .subLabel { font-size: 13.5px; font-weight: 600; }
  .subStars { display: flex; gap: 2px; direction: ltr; }
  .subStar {
    font-size: 21px;
    line-height: 1;
    cursor: pointer;
    color: #ece4d6;
    background: none;
    border: none;
    padding: 1px;
  }
  .subStar.filled { color: #c97f2e; }
  label { display: block; font-size: 13px; font-weight: 600; margin: 14px 0 6px; }
  input, textarea {
    width: 100%;
    border: 1px solid #ece4d6;
    border-radius: 10px;
    padding: 11px 13px;
    font-size: 14.5px;
    font-family: inherit;
    background: #fdfbf7;
    color: inherit;
  }
  textarea { min-height: 80px; resize: vertical; }
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
    margin-top: 20px;
  }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .hint { margin-top: 14px; font-size: 12px; color: #6b6255; text-align: center; line-height: 1.5; }
  .error {
    background: rgba(201,127,46,0.1);
    color: #c97f2e;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12.5px;
    text-align: center;
    margin-top: 14px;
  }
  .center { text-align: center; }
  .checkmark { font-size: 44px; margin-bottom: 8px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
  <div class="card">
    <div class="langToggle">
      <button class="langBtn" id="langAr" type="button">العربية</button>
      <button class="langBtn" id="langEn" type="button">English</button>
    </div>

    <div id="loading" class="center sub">...</div>

    <div id="notFound" class="center" hidden>
      <h1 id="notFoundTitle"></h1>
      <p class="sub" id="notFoundText"></p>
    </div>

    <form id="form" hidden>
      <img id="logo" class="logo" hidden />
      <h1 id="restaurantName"></h1>
      <p class="sub" id="prompt"></p>

      <div class="stars" id="stars">${fiveStarButtons('star')}</div>

      <div class="subRatingsTitle" id="subRatingsTitle"></div>
      ${SUB_RATING_CATEGORIES.map(
        (category) => `<div class="subRow">
        <span class="subLabel" id="${category}Label"></span>
        <div class="subStars" data-category="${category}">${fiveStarButtons('subStar')}</div>
      </div>`,
      ).join('')}

      <label id="nameLabel" for="reviewerName"></label>
      <input id="reviewerName" maxlength="100" required />

      <label id="textLabel" for="reviewText"></label>
      <textarea id="reviewText" maxlength="2000"></textarea>

      <button type="submit" class="btn" id="submitBtn"></button>
      <div class="error" id="formError" hidden></div>
    </form>

    <div id="success" class="center" hidden>
      <div class="checkmark">&#10003;</div>
      <h1 id="successTitle"></h1>
      <p class="sub" id="successText"></p>
    </div>
  </div>

<script nonce="${nonce}">
(function () {
  var restaurantId = ${JSON.stringify(safeId)};

  var STRINGS = {
    ar: {
      loading: 'جارِ التحميل...',
      notFoundTitle: 'غير متاح',
      notFoundText: 'هذا المطعم غير متاح حاليًا لاستقبال التقييمات.',
      prompt: 'كيف كانت زيارتك؟',
      subRatingsTitle: 'تفاصيل إضافية (اختياري)',
      foodLabel: 'الطعام',
      serviceLabel: 'الخدمة',
      staffLabel: 'الطاقم',
      ambienceLabel: 'الأجواء',
      nameLabel: 'الاسم',
      textLabel: 'تعليق (اختياري)',
      submit: 'إرسال التقييم',
      submitting: 'جارِ الإرسال...',
      pickStarsError: 'الرجاء اختيار تقييم بالنجوم.',
      nameError: 'الرجاء إدخال اسمك.',
      genericError: 'تعذر إرسال التقييم. حاول مرة أخرى.',
      successTitle: 'شكرًا لك!',
      successText: 'تم إرسال تقييمك بنجاح.',
    },
    en: {
      loading: 'Loading...',
      notFoundTitle: 'Not available',
      notFoundText: 'This restaurant is not currently accepting reviews.',
      prompt: 'How was your visit?',
      subRatingsTitle: 'More details (optional)',
      foodLabel: 'Food',
      serviceLabel: 'Service',
      staffLabel: 'Staff',
      ambienceLabel: 'Ambience',
      nameLabel: 'Your name',
      textLabel: 'Comment (optional)',
      submit: 'Submit review',
      submitting: 'Submitting...',
      pickStarsError: 'Please choose a star rating.',
      nameError: 'Please enter your name.',
      genericError: 'Could not submit your review. Please try again.',
      successTitle: 'Thank you!',
      successText: 'Your review has been submitted.',
    },
  };

  var SUB_RATING_CATEGORIES = ['food', 'service', 'staff', 'ambience'];

  var lang = 'ar';
  var rating = 0;
  var subRating = { food: 0, service: 0, staff: 0, ambience: 0 };
  var restaurantData = null;

  var el = {
    loading: document.getElementById('loading'),
    notFound: document.getElementById('notFound'),
    notFoundTitle: document.getElementById('notFoundTitle'),
    notFoundText: document.getElementById('notFoundText'),
    form: document.getElementById('form'),
    logo: document.getElementById('logo'),
    restaurantName: document.getElementById('restaurantName'),
    prompt: document.getElementById('prompt'),
    stars: document.querySelectorAll('.star'),
    subRatingsTitle: document.getElementById('subRatingsTitle'),
    nameLabel: document.getElementById('nameLabel'),
    reviewerName: document.getElementById('reviewerName'),
    textLabel: document.getElementById('textLabel'),
    reviewText: document.getElementById('reviewText'),
    submitBtn: document.getElementById('submitBtn'),
    formError: document.getElementById('formError'),
    success: document.getElementById('success'),
    successTitle: document.getElementById('successTitle'),
    successText: document.getElementById('successText'),
    langAr: document.getElementById('langAr'),
    langEn: document.getElementById('langEn'),
  };

  function applyLanguage() {
    var s = STRINGS[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    el.loading.textContent = s.loading;
    el.notFoundTitle.textContent = s.notFoundTitle;
    el.notFoundText.textContent = s.notFoundText;
    el.prompt.textContent = s.prompt;
    el.subRatingsTitle.textContent = s.subRatingsTitle;
    SUB_RATING_CATEGORIES.forEach(function (category) {
      document.getElementById(category + 'Label').textContent = s[category + 'Label'];
    });
    el.nameLabel.textContent = s.nameLabel;
    el.textLabel.textContent = s.textLabel;
    el.submitBtn.textContent = s.submit;
    el.successTitle.textContent = s.successTitle;
    el.successText.textContent = s.successText;
    el.langAr.classList.toggle('active', lang === 'ar');
    el.langEn.classList.toggle('active', lang === 'en');
    if (restaurantData) {
      el.restaurantName.textContent = lang === 'ar' ? restaurantData.nameAr : restaurantData.nameEn;
    }
  }

  el.langAr.addEventListener('click', function () { lang = 'ar'; applyLanguage(); });
  el.langEn.addEventListener('click', function () { lang = 'en'; applyLanguage(); });

  el.stars.forEach(function (star) {
    star.addEventListener('click', function () {
      rating = parseInt(star.getAttribute('data-value'), 10);
      el.stars.forEach(function (s) {
        s.classList.toggle('filled', parseInt(s.getAttribute('data-value'), 10) <= rating);
      });
    });
  });

  document.querySelectorAll('.subStars').forEach(function (group) {
    var category = group.getAttribute('data-category');
    var subStars = group.querySelectorAll('.subStar');
    subStars.forEach(function (star) {
      star.addEventListener('click', function () {
        subRating[category] = parseInt(star.getAttribute('data-value'), 10);
        subStars.forEach(function (s) {
          s.classList.toggle('filled', parseInt(s.getAttribute('data-value'), 10) <= subRating[category]);
        });
      });
    });
  });

  el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = STRINGS[lang];
    el.formError.hidden = true;

    if (rating < 1) {
      el.formError.textContent = s.pickStarsError;
      el.formError.hidden = false;
      return;
    }
    var name = el.reviewerName.value.trim();
    if (!name) {
      el.formError.textContent = s.nameError;
      el.formError.hidden = false;
      return;
    }

    el.submitBtn.disabled = true;
    el.submitBtn.textContent = s.submitting;

    fetch('/v1/restaurants/' + restaurantId + '/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewerName: name,
        rating: rating,
        foodRating: subRating.food || undefined,
        serviceRating: subRating.service || undefined,
        staffRating: subRating.staff || undefined,
        ambienceRating: subRating.ambience || undefined,
        text: el.reviewText.value.trim() || undefined,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('failed');
        el.form.hidden = true;
        el.success.hidden = false;
      })
      .catch(function () {
        el.formError.textContent = s.genericError;
        el.formError.hidden = false;
        el.submitBtn.disabled = false;
        el.submitBtn.textContent = s.submit;
      });
  });

  applyLanguage();

  fetch('/v1/restaurants/' + restaurantId + '/review-info')
    .then(function (res) {
      if (!res.ok) throw new Error('not found');
      return res.json();
    })
    .then(function (data) {
      restaurantData = data;
      el.loading.hidden = true;
      if (data.logoUrl) {
        el.logo.src = data.logoUrl;
        el.logo.hidden = false;
      }
      applyLanguage();
      el.form.hidden = false;
    })
    .catch(function () {
      el.loading.hidden = true;
      el.notFound.hidden = false;
    });
})();
</script>
</body>
</html>`;
}

@Controller('review')
export class ReviewPageController {
  @Get(':restaurantId')
  @Header('Content-Type', 'text/html')
  reviewPage(@Param('restaurantId') restaurantId: string, @Res({ passthrough: true }) res: Response) {
    return renderPage(restaurantId, res.locals.cspNonce as string);
  }
}
