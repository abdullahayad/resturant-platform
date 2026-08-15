import 'dotenv/config';
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
