import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { normalizePhone } from '../src/common/phone';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const storageBucket = process.env.STORAGE_BUCKET ?? 'restaurant-platform';
const storageEndpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
// See storage.service.ts — providers like R2 serve public reads from a
// different host than the S3 API endpoint used to write objects.
const storagePublicUrl = process.env.STORAGE_PUBLIC_URL ?? storageEndpoint;
const s3 = new S3Client({
  endpoint: storageEndpoint,
  region: process.env.STORAGE_REGION ?? 'us-east-1',
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? 'restaurant',
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? 'restaurant123',
  },
});

// Small solid-color placeholder JPEGs so seeded gallery photos render as
// something other than a broken-image icon. Real partners upload real photos.
const placeholderColors: Record<string, string> = {
  amber: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
};

async function uploadPlaceholder(key: string): Promise<string> {
  const buffer = Buffer.from(placeholderColors.amber, 'base64');
  await s3.send(
    new PutObjectCommand({ Bucket: storageBucket, Key: key, Body: buffer, ContentType: 'image/jpeg' }),
  );
  return process.env.STORAGE_PUBLIC_URL ? `${storagePublicUrl}/${key}` : `${storagePublicUrl}/${storageBucket}/${key}`;
}

const businessTypes = [
  ['Restaurant', 'مطعم'],
  ['Cafe Bakery', 'مقهى ومخبز'],
  ['Dessert Shop', 'محل حلويات'],
  ['Ice Cream Shop', 'محل آيس كريم'],
  ['Food Truck', 'عربة طعام'],
  ['Juice Bar', 'بار عصائر'],
  ['Tea House', 'بيت شاي'],
  ['Steak House', 'مطعم ستيك'],
  ['Fast Food', 'وجبات سريعة'],
  ['Fine Dining', 'مطعم راقٍ'],
];

const foodCategories = [
  ['Fast Food', 'وجبات سريعة'],
  ['Shawarma', 'شاورما'],
  ['Burger', 'برغر'],
  ['BBQ', 'باربكيو'],
  ['Grill', 'مشاوي'],
  ['Pizza', 'بيتزا'],
  ['Breakfast', 'فطور'],
  ['Buffet', 'بوفيه'],
  ['Kebab', 'كباب'],
  ['Rice and Meat', 'رز ولحم'],
  ['Asian Food', 'طعام آسيوي'],
  ['Healthy', 'صحي'],
  ['Traditional Iraqi', 'عراقي تقليدي'],
  ['Quzi', 'قوزي'],
  ['Masgouf', 'مسكوف'],
  ['Dolma', 'دولمة'],
  ['Seafood', 'مأكولات بحرية'],
  ['Desserts', 'حلويات'],
  ['Drinks', 'مشروبات'],
];

// Order here is the menu's serving order (starters → soup → mains → sides →
// dessert → drinks) — sortOrder drives both the Menu Management picker and
// the Photo Gallery's per-category tabs, and is editable from Master Data.
const menuCategories = [
  ['Appetizer', 'مقبلات'],
  ['Soup', 'شوربة'],
  ['Grill', 'مشاوي'],
  ['BBQ', 'باربكيو'],
  ['Main Course', 'طبق رئيسي'],
  ['Side Dish', 'طبق جانبي'],
  ['Sweet', 'حلويات'],
  ['Drink', 'مشروبات'],
];

const facilities = [
  ['Parking', 'موقف سيارات'],
  ['WiFi', 'واي فاي'],
  ['Outdoor Seating', 'جلسة خارجية'],
  ['Delivery', 'توصيل'],
  ['Family Section', 'قسم عائلي'],
  ['Air Conditioning', 'تكييف'],
  ['Wheelchair Accessible', 'مناسب لذوي الإعاقة'],
  ['Card Payment', 'دفع بالبطاقة'],
  ['Shisha', 'شيشة'],
  ['Kids Area', 'منطقة أطفال'],
];

const eventTypes: [string, string, string][] = [
  ['Buffet Night', 'ليلة البوفيه', '🍽️'],
  ['Live Music', 'موسيقى حية', '🎸'],
  ['Singer Night', 'ليلة المطرب', '🎤'],
  ['Karaoke', 'كاريوكي', '🎶'],
  ['Sports Screening', 'عرض رياضي', '📺'],
  ['Holiday Special', 'عرض العطلة', '🎉'],
  ["Chef's Table", 'طاولة الشيف', '👨‍🍳'],
];

// Each province/district also carries a 2-letter code — the first/second
// segment of every restaurant code in it (e.g. "BG" + "KR" -> BGKR001). Must
// match what the restaurant_code_scheme migration assigns to these same
// names, so a fresh seed and a migrated existing database land on the same
// codes.
const provinces: Record<string, { code: string; districts: [string, string, string][] }> = {
  'Baghdad|بغداد': {
    code: 'BG',
    districts: [
      ['Karkh', 'الكرخ', 'KR'],
      ['Rusafa', 'الرصافة', 'RS'],
      ['Kadhimiya', 'الكاظمية', 'KD'],
    ],
  },
  'Basra|البصرة': {
    code: 'BS',
    districts: [
      ['Basra Center', 'مركز البصرة', 'BC'],
      ['Zubair', 'الزبير', 'ZB'],
    ],
  },
  'Erbil|أربيل': {
    code: 'EB',
    districts: [
      ['Erbil Center', 'مركز أربيل', 'EC'],
      ['Ankawa', 'عنكاوا', 'AN'],
    ],
  },
  'Najaf|النجف': {
    code: 'NJ',
    districts: [
      ['Najaf Center', 'مركز النجف', 'NC'],
      ['Kufa', 'الكوفة', 'KF'],
    ],
  },
  'Sulaymaniyah|السليمانية': {
    code: 'SU',
    districts: [['Sulaymaniyah Center', 'مركز السليمانية', 'SC']],
  },
};

async function seedList(
  model: { count: () => Promise<number>; createMany: (args: unknown) => Promise<unknown> },
  rows: string[][],
) {
  if ((await model.count()) > 0) return;
  await model.createMany({
    data: rows.map(([nameEn, nameAr], index) => ({ nameEn, nameAr, sortOrder: index })),
  });
}

async function main() {
  await seedList(db.businessType, businessTypes);
  await seedList(db.foodCategory, foodCategories);
  await seedList(db.menuCategory, menuCategories);
  await seedList(db.facility, facilities);

  if ((await db.eventType.count()) === 0) {
    await db.eventType.createMany({
      data: eventTypes.map(([nameEn, nameAr, icon], index) => ({ nameEn, nameAr, icon, sortOrder: index })),
    });
    console.log('Seeded event types.');
  }

  if ((await db.province.count()) === 0) {
    let sortOrder = 0;
    for (const [key, { code, districts }] of Object.entries(provinces)) {
      const [nameEn, nameAr] = key.split('|');
      await db.province.create({
        data: {
          nameEn,
          nameAr,
          code,
          sortOrder: sortOrder++,
          districts: {
            create: districts.map(([dNameEn, dNameAr, dCode], index) => ({
              nameEn: dNameEn,
              nameAr: dNameAr,
              code: dCode,
              sortOrder: index,
            })),
          },
        },
      });
    }
  }

  if ((await db.adminUser.count()) === 0) {
    await db.adminUser.create({
      data: {
        email: 'admin@platform.iq',
        passwordHash: await bcrypt.hash('AdminPass123', 10),
        fullName: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Seeded admin login: admin@platform.iq / AdminPass123');
  }

  if ((await db.restaurant.count({ where: { ownerEmail: 'demo@restaurant.iq' } })) === 0) {
    const [businessType] = await db.businessType.findMany({ take: 1 });
    const [foodCategory] = await db.foodCategory.findMany({ take: 1 });
    const [province] = await db.province.findMany({ take: 1, include: { districts: { take: 1 } } });

    await db.restaurant.create({
      data: {
        // Matches the province/district picked just above (first province,
        // first district - Baghdad/Karkh as currently seeded) so a fresh
        // database's demo restaurant already has a code in the new scheme.
        codeNumber: `${province?.code ?? 'XX'}${province?.districts[0]?.code ?? 'XX'}001`,
        nameEn: 'Demo Restaurant',
        nameAr: 'مطعم تجريبي',
        phone: '07700000000',
        ownerEmail: 'demo@restaurant.iq',
        ownerPasswordHash: await bcrypt.hash('DemoPass123', 10),
        status: 'APPROVED',
        reviewedAt: new Date(),
        provinceId: province?.id,
        districtId: province?.districts[0]?.id,
        businessTypes: businessType ? { create: [{ businessTypeId: businessType.id }] } : undefined,
        foodCategories: foodCategory ? { create: [{ foodCategoryId: foodCategory.id }] } : undefined,
      },
    });
    console.log('Seeded partner login: demo@restaurant.iq / DemoPass123');
  }

  const demoRestaurant = await db.restaurant.findUnique({ where: { ownerEmail: 'demo@restaurant.iq' } });
  if (demoRestaurant && (await db.review.count({ where: { restaurantId: demoRestaurant.id } })) === 0) {
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    // food/staff/ambience trend up over the last 30 days, service trends down —
    // mirrors the "Category Scores & 30-Day Trends" reference design.
    const demoReviews = [
      { reviewerName: 'Ahmed K.', rating: 4, foodRating: 4, serviceRating: 5, staffRating: 4, ambienceRating: 4, days: 55, text: 'Solid meal, service was excellent.' },
      { reviewerName: 'Zainab R.', rating: 5, foodRating: 5, serviceRating: 5, staffRating: 4, ambienceRating: 4, days: 50, text: 'Loved the grill platter.' },
      { reviewerName: 'Hassan M.', rating: 4, foodRating: 4, serviceRating: 4, staffRating: 5, ambienceRating: 5, days: 48, text: 'Staff went out of their way to help us.' },
      { reviewerName: 'Noor A.', rating: 3, foodRating: 4, serviceRating: 5, staffRating: 4, ambienceRating: 4, days: 44, text: 'Good but a bit pricey.' },
      { reviewerName: 'Karim S.', rating: 5, foodRating: 5, serviceRating: 4, staffRating: 5, ambienceRating: 5, days: 40, text: 'Everything about this place is great.' },
      { reviewerName: 'Rania F.', rating: 4, foodRating: 4, serviceRating: 5, staffRating: 4, ambienceRating: 4, days: 35, text: 'Consistent quality every visit.' },
      { reviewerName: 'Bilal H.', rating: 5, foodRating: 5, serviceRating: 5, staffRating: 5, ambienceRating: 5, days: 33, text: 'Perfect evening out with the family.' },
      { reviewerName: 'Dina K.', rating: 4, foodRating: 4, serviceRating: 4, staffRating: 4, ambienceRating: 4, days: 32, text: 'Reliable neighborhood spot.' },
      { reviewerName: 'Fadi N.', rating: 5, foodRating: 5, serviceRating: 4, staffRating: 5, ambienceRating: 4, days: 25, text: 'Best kebab in town, generous portions.' },
      { reviewerName: 'Huda J.', rating: 5, foodRating: 5, serviceRating: 5, staffRating: 5, ambienceRating: 5, days: 20, text: 'Flawless from start to finish.' },
      { reviewerName: 'Iman T.', rating: 4, foodRating: 4, serviceRating: 4, staffRating: 5, ambienceRating: 4, days: 18, text: 'Great hospitality, will be back.' },
      { reviewerName: 'Jassim O.', rating: 4, foodRating: 5, serviceRating: 4, staffRating: 4, ambienceRating: 5, days: 15, text: 'Lovely ambience, great for dates.' },
      { reviewerName: 'Sara M.', rating: 5, foodRating: 4, serviceRating: 5, staffRating: 5, ambienceRating: 4, days: 12, text: 'Great food, service was excellent this time.' },
      { reviewerName: 'Lina B.', rating: 5, foodRating: 5, serviceRating: 4, staffRating: 5, ambienceRating: 5, days: 10, text: 'Family favorite, we come every week.' },
      { reviewerName: 'Yusuf A.', rating: 4, foodRating: 4, serviceRating: 5, staffRating: 4, ambienceRating: 4, days: 8, text: 'Decent, would order again.' },
      { reviewerName: 'Marwan Q.', rating: 5, foodRating: 5, serviceRating: 5, staffRating: 5, ambienceRating: 5, days: 5, text: 'Ten out of ten, no notes.' },
      { reviewerName: 'Omar T.', rating: 3, foodRating: 4, serviceRating: 4, staffRating: 5, ambienceRating: 4, days: 3, moderationStatus: 'FLAGGED' as const, text: 'Order was wrong once but staff fixed it fast.' },
      { reviewerName: 'Layla H.', rating: 5, foodRating: 5, serviceRating: 4, staffRating: 4, ambienceRating: 5, days: 1, text: 'Family favorite, we come every week.' },
    ];

    await db.review.createMany({
      data: demoReviews.map((r) => ({
        restaurantId: demoRestaurant.id,
        reviewerName: r.reviewerName,
        rating: r.rating,
        foodRating: r.foodRating,
        serviceRating: r.serviceRating,
        staffRating: r.staffRating,
        ambienceRating: r.ambienceRating,
        text: r.text,
        moderationStatus: r.moderationStatus,
        createdAt: daysAgo(r.days),
      })),
    });
    console.log(`Seeded ${demoReviews.length} demo reviews.`);
  }

  if (demoRestaurant && (await db.dish.count({ where: { restaurantId: demoRestaurant.id } })) === 0) {
    const categoryByName = Object.fromEntries(
      (await db.menuCategory.findMany()).map((c) => [c.nameEn, c.id]),
    );

    const demoDishes = [
      { nameEn: 'Hummus Plate', nameAr: 'صحن حمص', price: 4000, category: 'Appetizer' },
      { nameEn: 'Lentil Soup', nameAr: 'شوربة عدس', price: 3000, category: 'Soup' },
      { nameEn: 'Chicken Tikka', nameAr: 'دجاج مشوي', price: 12000, category: 'Grill', mostOrdered: true },
      { nameEn: 'Mixed BBQ Platter', nameAr: 'طبق باربكيو مشكل', price: 18000, category: 'BBQ', mostOrdered: true },
      { nameEn: 'Lamb Quzi', nameAr: 'قوزي لحم', price: 20000, category: 'Main Course' },
      { nameEn: 'Grilled Vegetables', nameAr: 'خضار مشوية', price: 5000, category: 'Side Dish' },
      { nameEn: 'Baklava', nameAr: 'بقلاوة', price: 4000, category: 'Sweet' },
      { nameEn: 'Fresh Lemon Mint', nameAr: 'ليمون بالنعناع', price: 3000, category: 'Drink' },
    ];

    const createdDishes: { id: string; nameEn: string }[] = [];
    for (const d of demoDishes) {
      const photoUrl = await uploadPlaceholder(`dishes/${randomUUID()}.jpg`);
      const created = await db.dish.create({
        data: {
          restaurantId: demoRestaurant.id,
          nameEn: d.nameEn,
          nameAr: d.nameAr,
          price: d.price,
          menuCategoryId: categoryByName[d.category],
          isMostOrdered: d.mostOrdered ?? false,
          photoUrl,
        },
      });
      createdDishes.push({ id: created.id, nameEn: created.nameEn });
    }
    console.log(`Seeded ${demoDishes.length} demo dishes.`);

    const dishId = (nameEn: string) => createdDishes.find((d) => d.nameEn === nameEn)!.id;
    const galleryPhotos = [
      { album: 'FOOD' as const, dishId: dishId('Chicken Tikka'), key: 'gallery/food-1.jpg' },
      { album: 'FOOD' as const, dishId: dishId('Mixed BBQ Platter'), key: 'gallery/food-2.jpg' },
      { album: 'FOOD' as const, dishId: dishId('Hummus Plate'), key: 'gallery/food-3.jpg' },
      { album: 'MENU' as const, caption: 'Paper menu, page 1', key: 'gallery/menu-1.jpg' },
      { album: 'AMBIENCE' as const, ambienceSubCategory: 'OUTDOOR' as const, caption: 'Garden seating', key: 'gallery/ambience-1.jpg' },
      { album: 'AMBIENCE' as const, ambienceSubCategory: 'INDOOR' as const, caption: 'Main dining hall', key: 'gallery/ambience-2.jpg' },
    ];

    for (const g of galleryPhotos) {
      const url = await uploadPlaceholder(g.key);
      await db.galleryPhoto.create({
        data: {
          restaurantId: demoRestaurant.id,
          album: g.album,
          url,
          caption: 'caption' in g ? g.caption : undefined,
          dishId: 'dishId' in g ? g.dishId : undefined,
          ambienceSubCategory: 'ambienceSubCategory' in g ? g.ambienceSubCategory : undefined,
        },
      });
    }
    console.log(`Seeded ${galleryPhotos.length} demo gallery photos.`);
  }

  if (demoRestaurant && (await db.restaurantEvent.count({ where: { restaurantId: demoRestaurant.id } })) === 0) {
    const buffetType = await db.eventType.findFirst({ where: { nameEn: 'Buffet Night' } });
    const musicType = await db.eventType.findFirst({ where: { nameEn: 'Live Music' } });
    const chefType = await db.eventType.findFirst({ where: { nameEn: "Chef's Table" } });

    const inDays = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

    await db.restaurantEvent.createMany({
      data: [
        {
          restaurantId: demoRestaurant.id,
          eventTypeId: buffetType!.id,
          titleEn: 'Ramadan Buffet Night',
          titleAr: 'ليلة بوفيه رمضان',
          descriptionEn: 'All-you-can-eat traditional Iraqi dishes.',
          descriptionAr: 'بوفيه مفتوح من الأطباق العراقية التقليدية.',
          price: 25000,
          capacity: 40,
          isRecurring: false,
          eventDate: inDays(10),
        },
        {
          restaurantId: demoRestaurant.id,
          eventTypeId: musicType!.id,
          titleEn: 'Friday Live Music',
          titleAr: 'موسيقى حية كل جمعة',
          descriptionEn: 'Live oud and vocals every Friday evening.',
          descriptionAr: 'عزف عود وغناء حي مساء كل جمعة.',
          isRecurring: true,
          recurringDayOfWeek: 5,
          recurringTime: '20:00',
        },
        {
          restaurantId: demoRestaurant.id,
          eventTypeId: chefType!.id,
          titleEn: "Chef's Table Experience",
          titleAr: 'تجربة طاولة الشيف',
          descriptionEn: 'A curated multi-course tasting menu with the head chef.',
          descriptionAr: 'قائمة تذوق متعددة الأطباق مع الشيف الرئيسي.',
          price: 60000,
          capacity: 8,
          isRecurring: false,
          eventDate: inDays(20),
        },
      ],
    });
    console.log('Seeded 3 demo events.');
  }

  if (demoRestaurant && (await db.chefTableBooking.count({ where: { restaurantId: demoRestaurant.id } })) === 0) {
    const buffetEvent = await db.restaurantEvent.findFirst({
      where: { restaurantId: demoRestaurant.id, titleEn: 'Ramadan Buffet Night' },
    });
    const chefEvent = await db.restaurantEvent.findFirst({
      where: { restaurantId: demoRestaurant.id, titleEn: "Chef's Table Experience" },
    });

    if (buffetEvent && chefEvent) {
      await db.chefTableBooking.createMany({
        data: [
          {
            restaurantId: demoRestaurant.id,
            eventId: buffetEvent.id,
            guestName: 'Mustafa Ali',
            guestPhone: '07709991234',
            guestPhoneNormalized: normalizePhone('07709991234'),
            partySize: 6,
            reservationDate: buffetEvent.eventDate!,
            status: 'CONFIRMED',
            idempotencyKey: randomUUID(),
          },
          {
            restaurantId: demoRestaurant.id,
            eventId: buffetEvent.id,
            guestName: 'Rasha Kamal',
            guestPhone: '07709995678',
            guestPhoneNormalized: normalizePhone('07709995678'),
            partySize: 4,
            reservationDate: buffetEvent.eventDate!,
            status: 'PENDING',
            idempotencyKey: randomUUID(),
          },
          {
            restaurantId: demoRestaurant.id,
            eventId: chefEvent.id,
            guestName: 'Firas Nabil',
            guestPhone: '07709998765',
            guestPhoneNormalized: normalizePhone('07709998765'),
            partySize: 2,
            reservationDate: chefEvent.eventDate!,
            status: 'PENDING',
            notes: 'Anniversary dinner, window seat if possible.',
            idempotencyKey: randomUUID(),
          },
        ],
      });
      console.log('Seeded 3 demo reservations.');
    }
  }

  if ((await db.loyaltyTier.count()) === 0) {
    await db.loyaltyTier.createMany({
      data: [
        {
          labelEn: 'Silver',
          labelAr: 'فضي',
          thresholdCount: 3,
          rewardEn: '10% off your next visit',
          rewardAr: 'خصم 10% على زيارتك القادمة',
          sortOrder: 1,
        },
        {
          labelEn: 'Gold',
          labelAr: 'ذهبي',
          thresholdCount: 6,
          rewardEn: 'A free dessert on your next visit',
          rewardAr: 'حلوى مجانية في زيارتك القادمة',
          sortOrder: 2,
        },
      ],
    });
    console.log('Seeded 2 demo loyalty tiers.');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
