import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PreviewService } from './preview.service';

// The public JSON data endpoint the HTML shell below fetches client-side -
// stays under the normal /v1 prefix (no external link depends on this
// exact path the way it does on the HTML page's own URL), unauthenticated,
// gated inside PreviewService.getPublic on the restaurant actually being
// live.
@Controller('restaurants')
export class PublicRestaurantDataController {
  constructor(private readonly preview: PreviewService) {}

  @Get(':id/public-page')
  getPublicPage(@Param('id') id: string) {
    return this.preview.getPublic(id);
  }
}

// The page a shared link / Featured listing / QR code points to - no app
// install, no account, no login. Same low-tech pattern as every other
// public page in this codebase (legal, support-session, review): a plain
// template-literal string, no view engine, no build step. Data is fetched
// client-side from the endpoint above, same approach review-page.controller.ts
// already uses, rather than server-rendering it directly into the HTML.
const SECTION_IDS = ['menu', 'gallery', 'chefs', 'events', 'reviews'] as const;

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
    margin: 0;
    color: #1f1a14;
    background: #fdfbf7;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #f2ece3; background: #16130f; }
    .card, header { background: #221c15 !important; border-color: #3a3226 !important; }
    .sub, .muted { color: #b3a997 !important; }
    .pill { background: #3a3226 !important; }
  }
  .wrap { max-width: 640px; margin: 0 auto; padding: 0 16px 48px; }
  header {
    background: #ffffff;
    border-bottom: 1px solid #ece4d6;
    padding: 20px 16px;
    text-align: center;
    position: relative;
  }
  .langToggle { position: absolute; top: 14px; inset-inline-end: 14px; display: flex; gap: 6px; }
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
  .logo { width: 72px; height: 72px; border-radius: 18px; object-fit: cover; margin: 0 auto 10px; display: block; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { font-size: 13.5px; color: #6b6255; margin: 0; }
  .featuredBadge, .verifiedBadge {
    display: inline-block;
    margin-top: 10px;
    margin-inline-end: 6px;
    font-size: 11.5px;
    font-weight: 700;
    border-radius: 999px;
    padding: 3px 12px;
    letter-spacing: 0.03em;
  }
  .featuredBadge { background: #c97f2e; color: #fff8f0; }
  .verifiedBadge { background: #2e7d4f; color: #f0fff6; }
  .ratingRow { margin-top: 10px; font-size: 14px; font-weight: 700; }
  section { margin-top: 28px; }
  h2 { font-size: 16px; margin: 0 0 12px; }
  .card {
    background: #ffffff;
    border: 1px solid #ece4d6;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 10px;
  }
  .row { display: flex; gap: 12px; align-items: center; }
  .thumb { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: #ece4d6; }
  .title { font-weight: 700; font-size: 14.5px; }
  .muted { color: #6b6255; font-size: 12.5px; }
  .price { font-weight: 700; font-size: 14px; }
  .priceOld { text-decoration: line-through; color: #6b6255; font-size: 12px; margin-inline-end: 6px; }
  .pill {
    display: inline-block;
    background: #f3eee4;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 600;
    margin-top: 4px;
  }
  .galleryGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .galleryGrid img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; }
  .hoursRow { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .stars { color: #c97f2e; letter-spacing: 1px; }
  .center { text-align: center; padding: 60px 16px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
  <div id="loading" class="center sub">...</div>
  <div id="notFound" class="center" hidden>
    <h1 id="notFoundTitle"></h1>
    <p class="sub" id="notFoundText"></p>
  </div>

  <div id="page" hidden>
    <header>
      <div class="langToggle">
        <button class="langBtn" id="langAr" type="button">العربية</button>
        <button class="langBtn" id="langEn" type="button">English</button>
      </div>
      <img id="logo" class="logo" hidden />
      <h1 id="restaurantName"></h1>
      <p class="sub" id="locationLine"></p>
      <div class="ratingRow" id="ratingRow" hidden></div>
      <div id="verifiedBadge" class="verifiedBadge" hidden></div>
      <div id="featuredBadge" class="featuredBadge" hidden></div>
    </header>

    <div class="wrap">
      <section id="menuSection" hidden>
        <h2 id="menuTitle"></h2>
        <div id="menuList"></div>
      </section>

      <section id="gallerySection" hidden>
        <h2 id="galleryTitle"></h2>
        <div class="galleryGrid" id="galleryGrid"></div>
      </section>

      <section id="chefsSection" hidden>
        <h2 id="chefsTitle"></h2>
        <div id="chefsList"></div>
      </section>

      <section id="eventsSection" hidden>
        <h2 id="eventsTitle"></h2>
        <div id="eventsList"></div>
      </section>

      <section id="hoursSection" hidden>
        <h2 id="hoursTitle"></h2>
        <div class="card" id="hoursCard"></div>
      </section>

      <section id="reviewsSection" hidden>
        <h2 id="reviewsTitle"></h2>
        <div id="reviewsList"></div>
      </section>
    </div>
  </div>

<script nonce="${nonce}">
(function () {
  var restaurantId = ${JSON.stringify(safeId)};
  var sectionIds = ${JSON.stringify(SECTION_IDS)};

  var STRINGS = {
    ar: {
      loading: 'جارِ التحميل...',
      notFoundTitle: 'غير متاح',
      notFoundText: 'هذا المطعم غير متاح حاليًا.',
      featured: 'مميز',
      verified: 'موثّق ✓',
      menuTitle: 'القائمة',
      galleryTitle: 'الصور',
      chefsTitle: 'الطهاة',
      eventsTitle: 'الفعاليات القادمة',
      hoursTitle: 'ساعات العمل',
      reviewsTitle: 'التقييمات',
      reviewsCount: 'تقييم',
      noReviews: 'لا توجد تقييمات بعد.',
      closed: 'مغلق',
      days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    },
    en: {
      loading: 'Loading...',
      notFoundTitle: 'Not available',
      notFoundText: 'This restaurant is not currently available.',
      featured: 'Featured',
      verified: 'Verified ✓',
      menuTitle: 'Menu',
      galleryTitle: 'Photos',
      chefsTitle: 'Chefs',
      eventsTitle: 'Upcoming Events',
      hoursTitle: 'Opening Hours',
      reviewsTitle: 'Reviews',
      reviewsCount: 'reviews',
      noReviews: 'No reviews yet.',
      closed: 'Closed',
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
  };

  var lang = 'ar';
  var data = null;

  var el = {
    loading: document.getElementById('loading'),
    notFound: document.getElementById('notFound'),
    notFoundTitle: document.getElementById('notFoundTitle'),
    notFoundText: document.getElementById('notFoundText'),
    page: document.getElementById('page'),
    langAr: document.getElementById('langAr'),
    langEn: document.getElementById('langEn'),
    logo: document.getElementById('logo'),
    restaurantName: document.getElementById('restaurantName'),
    locationLine: document.getElementById('locationLine'),
    ratingRow: document.getElementById('ratingRow'),
    featuredBadge: document.getElementById('featuredBadge'),
    verifiedBadge: document.getElementById('verifiedBadge'),
    menuSection: document.getElementById('menuSection'),
    menuTitle: document.getElementById('menuTitle'),
    menuList: document.getElementById('menuList'),
    gallerySection: document.getElementById('gallerySection'),
    galleryTitle: document.getElementById('galleryTitle'),
    galleryGrid: document.getElementById('galleryGrid'),
    chefsSection: document.getElementById('chefsSection'),
    chefsTitle: document.getElementById('chefsTitle'),
    chefsList: document.getElementById('chefsList'),
    eventsSection: document.getElementById('eventsSection'),
    eventsTitle: document.getElementById('eventsTitle'),
    eventsList: document.getElementById('eventsList'),
    hoursSection: document.getElementById('hoursSection'),
    hoursTitle: document.getElementById('hoursTitle'),
    hoursCard: document.getElementById('hoursCard'),
    reviewsSection: document.getElementById('reviewsSection'),
    reviewsTitle: document.getElementById('reviewsTitle'),
    reviewsList: document.getElementById('reviewsList'),
  };

  function name(obj) {
    return obj ? (lang === 'ar' ? obj.nameAr : obj.nameEn) : '';
  }

  function stars(rating) {
    var full = Math.round(rating);
    var out = '';
    for (var i = 1; i <= 5; i++) out += i <= full ? '\\u2605' : '\\u2606';
    return out;
  }

  function renderMenu() {
    el.menuList.innerHTML = '';
    if (!data.dishes.length) { el.menuSection.hidden = true; return; }
    data.dishes.forEach(function (d) {
      var card = document.createElement('div');
      card.className = 'card row';
      var priceHtml = d.discountedPrice
        ? '<span class="priceOld">' + Number(d.price).toLocaleString() + '</span><span class="price">' + Number(d.discountedPrice).toLocaleString() + ' IQD</span>'
        : '<span class="price">' + Number(d.price).toLocaleString() + ' IQD</span>';
      card.innerHTML =
        (d.photoUrl ? '<img class="thumb" src="' + d.photoUrl + '" />' : '') +
        '<div><div class="title">' + name(d) + '</div>' + priceHtml + '</div>';
      el.menuList.appendChild(card);
    });
  }

  function renderGallery() {
    el.galleryGrid.innerHTML = '';
    if (!data.galleryPhotos.length) { el.gallerySection.hidden = true; return; }
    data.galleryPhotos.slice(0, 9).forEach(function (p) {
      var img = document.createElement('img');
      img.src = p.url;
      el.galleryGrid.appendChild(img);
    });
  }

  function renderChefs() {
    el.chefsList.innerHTML = '';
    if (!data.chefProfiles.length) { el.chefsSection.hidden = true; return; }
    data.chefProfiles.forEach(function (c) {
      var card = document.createElement('div');
      card.className = 'card row';
      card.innerHTML =
        (c.photoUrl ? '<img class="thumb" src="' + c.photoUrl + '" />' : '') +
        '<div><div class="title">' + c.name + '</div>' +
        (c.speciality ? '<div class="muted">' + c.speciality + '</div>' : '') + '</div>';
      el.chefsList.appendChild(card);
    });
  }

  function renderEvents() {
    el.eventsList.innerHTML = '';
    if (!data.events.length) { el.eventsSection.hidden = true; return; }
    data.events.forEach(function (e) {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="title">' + name(e) + '</div>';
      el.eventsList.appendChild(card);
    });
  }

  function renderHours() {
    el.hoursCard.innerHTML = '';
    if (!data.openingHours.length) { el.hoursSection.hidden = true; return; }
    var s = STRINGS[lang];
    data.openingHours.forEach(function (h) {
      var row = document.createElement('div');
      row.className = 'hoursRow';
      var time = h.isClosed ? s.closed : (h.openTime || '?') + ' - ' + (h.closeTime || '?');
      row.innerHTML = '<span>' + s.days[h.dayOfWeek] + '</span><span class="muted">' + time + '</span>';
      el.hoursCard.appendChild(row);
    });
  }

  function renderReviews() {
    var s = STRINGS[lang];
    el.reviewsList.innerHTML = '';
    if (!data.reviews.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = s.noReviews;
      el.reviewsList.appendChild(empty);
      return;
    }
    data.reviews.forEach(function (r) {
      var card = document.createElement('div');
      card.className = 'card';
      var photosHtml = (r.photos || [])
        .map(function (p) { return '<img class="thumb" src="' + p.url + '" style="margin-inline-end:6px" />'; })
        .join('');
      card.innerHTML =
        '<div class="stars">' + stars(r.rating) + '</div>' +
        '<div class="title">' + r.reviewerName + '</div>' +
        (r.text ? '<p class="muted">' + r.text + '</p>' : '') +
        (photosHtml ? '<div class="row">' + photosHtml + '</div>' : '') +
        (r.reply ? '<p class="pill">' + r.reply.text + '</p>' : '');
      el.reviewsList.appendChild(card);
    });
  }

  function render() {
    var s = STRINGS[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    el.langAr.classList.toggle('active', lang === 'ar');
    el.langEn.classList.toggle('active', lang === 'en');

    el.restaurantName.textContent = name(data);
    var locationParts = [name(data.district), name(data.province)].filter(Boolean);
    el.locationLine.textContent = locationParts.join(' \\u00b7 ');
    if (data.logoUrl) { el.logo.src = data.logoUrl; el.logo.hidden = false; }

    if (data.totalReviews > 0) {
      el.ratingRow.hidden = false;
      el.ratingRow.innerHTML = '<span class="stars">' + stars(data.overallAverage) + '</span> ' +
        data.overallAverage + ' (' + data.totalReviews + ' ' + s.reviewsCount + ')';
    }
    el.featuredBadge.hidden = !data.isFeatured;
    el.featuredBadge.textContent = s.featured;
    el.verifiedBadge.hidden = !data.isVerified;
    el.verifiedBadge.textContent = s.verified;

    el.menuTitle.textContent = s.menuTitle;
    el.galleryTitle.textContent = s.galleryTitle;
    el.chefsTitle.textContent = s.chefsTitle;
    el.eventsTitle.textContent = s.eventsTitle;
    el.hoursTitle.textContent = s.hoursTitle;
    el.reviewsTitle.textContent = s.reviewsTitle;

    sectionIds.forEach(function (id) { document.getElementById(id + 'Section').hidden = false; });
    el.hoursSection.hidden = false;

    renderMenu();
    renderGallery();
    renderChefs();
    renderEvents();
    renderHours();
    renderReviews();
  }

  el.langAr.addEventListener('click', function () { lang = 'ar'; render(); });
  el.langEn.addEventListener('click', function () { lang = 'en'; render(); });

  el.loading.textContent = STRINGS.ar.loading;

  fetch('/v1/restaurants/' + restaurantId + '/public-page')
    .then(function (res) {
      if (!res.ok) throw new Error('not found');
      return res.json();
    })
    .then(function (json) {
      data = json;
      el.loading.hidden = true;
      el.page.hidden = false;
      render();
    })
    .catch(function () {
      el.loading.hidden = true;
      el.notFoundTitle.textContent = STRINGS.ar.notFoundTitle;
      el.notFoundText.textContent = STRINGS.ar.notFoundText;
      el.notFound.hidden = false;
    });
})();
</script>
</body>
</html>`;
}

@Controller('restaurant')
export class PublicRestaurantPageController {
  @Get(':id')
  @Header('Content-Type', 'text/html')
  page(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    return renderPage(id, res.locals.cspNonce as string);
  }
}
