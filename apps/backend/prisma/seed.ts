import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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

const menuCategories = [
  ['Soup', 'شوربة'],
  ['Appetizer', 'مقبلات'],
  ['Grill', 'مشاوي'],
  ['Main Course', 'طبق رئيسي'],
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

const provinces: Record<string, string[][]> = {
  'Baghdad|بغداد': [
    ['Karkh', 'الكرخ'],
    ['Rusafa', 'الرصافة'],
    ['Kadhimiya', 'الكاظمية'],
  ],
  'Basra|البصرة': [
    ['Basra Center', 'مركز البصرة'],
    ['Zubair', 'الزبير'],
  ],
  'Erbil|أربيل': [
    ['Erbil Center', 'مركز أربيل'],
    ['Ankawa', 'عنكاوا'],
  ],
  'Najaf|النجف': [
    ['Najaf Center', 'مركز النجف'],
    ['Kufa', 'الكوفة'],
  ],
  'Sulaymaniyah|السليمانية': [['Sulaymaniyah Center', 'مركز السليمانية']],
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

  if ((await db.province.count()) === 0) {
    let sortOrder = 0;
    for (const [key, districts] of Object.entries(provinces)) {
      const [nameEn, nameAr] = key.split('|');
      await db.province.create({
        data: {
          nameEn,
          nameAr,
          sortOrder: sortOrder++,
          districts: {
            create: districts.map(([dNameEn, dNameAr], index) => ({
              nameEn: dNameEn,
              nameAr: dNameAr,
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
        codeNumber: '#IRQ-00001',
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
