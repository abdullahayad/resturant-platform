// Public website copy (ligeta.app): the customer app's privacy policy and
// terms, in English and Arabic. The partner app's own policy and terms stay
// in legal/legal.controller.ts. Keep this in step with what the customer
// app really collects - Google Play's Data safety form is answered from it.

export type Lang = 'en' | 'ar';

export interface Section {
  heading: string;
  body: string[];
}

export const APP_LEGAL_UPDATED: Record<Lang, string> = {
  en: 'November 22, 2026',
  ar: '٢٢ تشرين الثاني ٢٠٢٦',
};

export const APP_PRIVACY: Record<Lang, Section[]> = {
  en: [
    {
      heading: '1. Who we are',
      body: [
        'LiGETA is an app for discovering restaurants, offers and events in Iraq. This policy explains what the LiGETA customer app collects, why, and the choices you have. Restaurants that use the LiGETA partner app are covered by a separate partner privacy policy.',
      ],
    },
    {
      heading: '2. What we collect',
      body: [
        'Without an account: you can browse restaurants, offers and events without signing in. We do not ask for your name or phone number for browsing.',
        'Your account: your mobile number (used to sign in with a one-time code sent on WhatsApp), and the name you choose to show on reviews. Sign-in codes are stored only in scrambled (hashed) form and expire after a few minutes.',
        'What you post: reviews, star ratings, review photos you choose from your gallery, "helpful" votes, reports about reviews, and messages you send to our support team.',
        'Your activity: restaurants and critics you follow, visits recorded when a restaurant scans your visit code, stamp-card rewards a restaurant hands you, event bookings (the name, phone number, party size and notes you enter), and the in-app notifications sent to you.',
        'Location: only when you tap "near me", to sort restaurants by distance. It is used on the spot and is not stored with your account. We never use location in the background.',
        'Device information: a push notification token if you allow notifications, your chosen language, and crash and error reports (device model, operating system and app version) so we can fix problems.',
        'We do not collect payment details - nothing is paid inside the app.',
      ],
    },
    {
      heading: '3. How we use it',
      body: [
        'To sign you in and keep your account secure; to show your reviews and your reviewer level; to send booking requests to the restaurant you chose; to count visits and show restaurants how many customers return; to send the notifications you switched on (booking updates, replies from support, news from restaurants you follow); to answer your support messages; and to keep the platform safe from spam and abuse.',
      ],
    },
    {
      heading: '4. What others can see',
      body: [
        'Public: reviews show the name you chose, your stars, text and photos, and a "verified visit" badge if a restaurant scanned your visit code. If you become a critic, your critic page shows your reviews and follower count.',
        'Restaurants: a restaurant you book with receives the name, phone number, party size and notes you entered for that booking. A restaurant you follow, or that scans your visit code, sees your account name - or only the last four digits of your number if you have not set a name. Restaurants never see your full phone number from reviews. If a restaurant marks that you did not come to a confirmed booking, restaurants you book with later see how many bookings you missed in the last 90 days, and 3 missed bookings in 90 days pause booking for your number until the oldest one is more than 90 days old.',
        'We do not sell your personal information and we do not use it for third-party advertising.',
      ],
    },
    {
      heading: '5. Service providers',
      body: [
        'We use trusted providers only to run the service: cloud hosting and database, file storage for photos, WhatsApp (Meta) to deliver sign-in codes, Expo and Google Firebase to deliver push notifications, and a crash-reporting service. They process data on our behalf and only for that purpose. We may also disclose information where the law requires it.',
      ],
    },
    {
      heading: '6. How long we keep it',
      body: [
        'We keep your account data while your account exists. Sign-in codes are deleted soon after use. When you delete your account, see section 7.',
      ],
    },
    {
      heading: '7. Deleting your account',
      body: [
        'In the app: Profile → Delete account. Without the app: visit ligeta.app/delete-account, confirm your number with a WhatsApp code, and delete.',
        'Deleting removes your account, name, phone number, follows, visits, stamp cards, notifications, support messages, helpful votes and sign-in codes immediately. Reviews you posted stay on the restaurant page so ratings remain fair, but they are no longer linked to your account. Bookings you made remain in the restaurant\'s own booking records.',
      ],
    },
    {
      heading: '8. Security',
      body: [
        'Connections are encrypted (HTTPS), sign-in tokens are signed and can be revoked, and access to customer data inside LiGETA is limited to the team members who need it. No system is perfectly secure, but we take reasonable measures to protect your data.',
      ],
    },
    {
      heading: '9. Children',
      body: ['LiGETA is not intended for children under 13, and we do not knowingly collect their information.'],
    },
    {
      heading: '10. Your choices',
      body: [
        'You can change your name, turn notifications on or off in Profile, deny location or photo access in your phone settings, and delete your account at any time.',
      ],
    },
    {
      heading: '11. Changes',
      body: [
        'We may update this policy. The date at the top shows the latest version; important changes will be announced in the app.',
      ],
    },
    {
      heading: '12. Contact',
      body: ['Questions about privacy: write to us in the app under Profile → Help.'],
    },
  ],
  ar: [
    {
      heading: '١. من نحن',
      body: [
        'ليگيتا تطبيق لاكتشاف المطاعم والعروض والفعاليات في العراق. توضّح هذه السياسة ما يجمعه تطبيق ليگيتا للزبائن، ولماذا، وما الخيارات المتاحة لك. المطاعم التي تستخدم تطبيق ليگيتا للشركاء تخضع لسياسة خصوصية منفصلة.',
      ],
    },
    {
      heading: '٢. ما الذي نجمعه',
      body: [
        'بدون حساب: يمكنك تصفّح المطاعم والعروض والفعاليات دون تسجيل الدخول، ولا نطلب اسمك أو رقمك للتصفّح.',
        'حسابك: رقم هاتفك (لتسجيل الدخول برمز لمرة واحدة يصلك على واتساب)، والاسم الذي تختار إظهاره على تقييماتك. رموز الدخول تُحفظ بشكل مشفّر فقط وتنتهي صلاحيتها خلال دقائق.',
        'ما تنشره: التقييمات والنجوم وصور التقييم التي تختارها من معرضك، وأصوات "مفيد"، والبلاغات عن التقييمات، ورسائلك إلى فريق الدعم.',
        'نشاطك: المطاعم والنقّاد الذين تتابعهم، والزيارات التي تُسجَّل عندما يمسح المطعم رمز زيارتك، ومكافآت بطاقة الختم التي يسلّمها لك المطعم، وحجوزات الفعاليات (الاسم والرقم وعدد الأشخاص والملاحظات التي تكتبها)، والإشعارات المرسلة إليك داخل التطبيق.',
        'الموقع: فقط عندما تضغط "قريب مني" لترتيب المطاعم حسب المسافة. يُستخدم في وقته ولا يُحفظ مع حسابك، ولا نستخدم موقعك في الخلفية أبداً.',
        'معلومات الجهاز: رمز الإشعارات إذا سمحت بها، ولغتك المختارة، وتقارير الأعطال (نوع الجهاز ونظام التشغيل وإصدار التطبيق) لنصلح المشاكل.',
        'لا نجمع أي معلومات دفع، فلا يوجد دفع داخل التطبيق.',
      ],
    },
    {
      heading: '٣. كيف نستخدمها',
      body: [
        'لتسجيل دخولك وحماية حسابك، ولعرض تقييماتك ومستواك كمقيّم، ولإرسال طلبات الحجز إلى المطعم الذي اخترته، ولاحتساب الزيارات وإظهار عدد الزبائن العائدين للمطاعم، ولإرسال الإشعارات التي فعّلتها (تحديثات الحجز، ردود الدعم، أخبار المطاعم التي تتابعها)، وللرد على رسائلك، ولحماية المنصّة من الإزعاج والإساءة.',
      ],
    },
    {
      heading: '٤. ما الذي يراه الآخرون',
      body: [
        'للعامة: تظهر تقييماتك بالاسم الذي اخترته مع النجوم والنص والصور، وشارة "زيارة موثّقة" إذا مسح المطعم رمز زيارتك. إذا أصبحت ناقداً، تعرض صفحتك تقييماتك وعدد متابعيك.',
        'المطاعم: المطعم الذي تحجز فيه يستلم الاسم والرقم وعدد الأشخاص والملاحظات التي كتبتها لذلك الحجز. والمطعم الذي تتابعه أو يمسح رمز زيارتك يرى اسم حسابك، أو آخر أربعة أرقام من رقمك فقط إذا لم تضع اسماً. لا ترى المطاعم رقمك الكامل من التقييمات. إذا أشار مطعم إلى أنك لم تحضر لحجز مؤكد، فإن المطاعم التي تحجز فيها لاحقاً ترى عدد الحجوزات التي لم تحضرها خلال آخر 90 يوماً، و3 حجوزات لم تحضرها خلال 90 يوماً توقف الحجز لرقمك حتى يمضي على أقدمها أكثر من 90 يوماً.',
        'لا نبيع معلوماتك الشخصية ولا نستخدمها لإعلانات جهات أخرى.',
      ],
    },
    {
      heading: '٥. مزوّدو الخدمة',
      body: [
        'نستعين بمزوّدين موثوقين لتشغيل الخدمة فقط: الاستضافة السحابية وقاعدة البيانات، وتخزين الصور، وواتساب (ميتا) لإرسال رموز الدخول، وExpo وGoogle Firebase لإرسال الإشعارات، وخدمة لتقارير الأعطال. يعالجون البيانات نيابةً عنا ولهذا الغرض فقط. وقد نكشف معلومات إذا تطلّب القانون ذلك.',
      ],
    },
    {
      heading: '٦. مدة الاحتفاظ',
      body: ['نحتفظ ببيانات حسابك ما دام الحساب موجوداً. تُحذف رموز الدخول بعد استخدامها بوقت قصير. وعند حذف الحساب، انظر البند ٧.'],
    },
    {
      heading: '٧. حذف حسابك',
      body: [
        'من التطبيق: الملف الشخصي ← حذف الحساب. بدون التطبيق: ادخل إلى ligeta.app/delete-account، وأكّد رقمك برمز واتساب، ثم احذف.',
        'الحذف يزيل فوراً حسابك واسمك ورقمك ومتابعاتك وزياراتك وبطاقات الختم وإشعاراتك ورسائل الدعم وأصوات "مفيد" ورموز الدخول. تبقى التقييمات التي نشرتها في صفحة المطعم حفاظاً على عدالة التقييم، لكنها لا تعود مرتبطة بحسابك. وتبقى حجوزاتك ضمن سجلات الحجز الخاصة بالمطعم.',
      ],
    },
    {
      heading: '٨. الأمان',
      body: [
        'الاتصالات مشفّرة (HTTPS)، ورموز الدخول موقّعة ويمكن إلغاؤها، والوصول إلى بيانات الزبائن داخل ليگيتا مقتصر على أعضاء الفريق الذين يحتاجونه. لا يوجد نظام آمن تماماً، لكننا نتخذ إجراءات معقولة لحماية بياناتك.',
      ],
    },
    {
      heading: '٩. الأطفال',
      body: ['ليگيتا غير موجّه للأطفال دون ١٣ عاماً، ولا نجمع معلوماتهم عن قصد.'],
    },
    {
      heading: '١٠. خياراتك',
      body: ['يمكنك تغيير اسمك، وتشغيل الإشعارات أو إيقافها من الملف الشخصي، ومنع الوصول إلى الموقع أو الصور من إعدادات هاتفك، وحذف حسابك في أي وقت.'],
    },
    {
      heading: '١١. التعديلات',
      body: ['قد نحدّث هذه السياسة. التاريخ في الأعلى يبيّن أحدث نسخة، وسنعلن التغييرات المهمة داخل التطبيق.'],
    },
    {
      heading: '١٢. التواصل',
      body: ['لأي سؤال عن الخصوصية: راسلنا من التطبيق عبر الملف الشخصي ← المساعدة.'],
    },
  ],
};

export const APP_TERMS: Record<Lang, Section[]> = {
  en: [
    {
      heading: '1. Agreement',
      body: [
        'By creating a LiGETA account or using the LiGETA customer app you agree to these terms and to our privacy policy. If you do not agree, please do not use the app.',
      ],
    },
    {
      heading: '2. Your account',
      body: [
        'You sign in with your own mobile number. Keep access to that number and to your phone secure - anyone who can receive your WhatsApp codes can sign in as you. One person, one account.',
      ],
    },
    {
      heading: '3. Restaurant information',
      body: [
        'Menus, prices, opening hours, offers and events are provided by the restaurants themselves. We work to keep them accurate but cannot guarantee them - please confirm important details with the restaurant.',
      ],
    },
    {
      heading: '4. Bookings',
      body: [
        'A booking made in the app is a request sent to the restaurant, which confirms or declines it. Payment, if any, happens at the restaurant. Please cancel in the app if you cannot attend; repeated no-shows may limit your ability to book.',
      ],
    },
    {
      heading: '5. Reviews and photos',
      body: [
        'Reviews must reflect your own real experience. Do not post content that is false, insulting, hateful, sexual, threatening, or that shares other people\'s private information, and only upload photos you took or have the right to share. You keep ownership of what you post, and you give LiGETA permission to display it in the app and on LiGETA pages. We may hide or remove content that breaks these rules, and restaurants can report reviews for us to check.',
      ],
    },
    {
      heading: '6. Fair use',
      body: [
        'Do not create fake accounts or fake visits, manipulate ratings, scrape the service, or try to break its security. We may suspend or block accounts that break these terms.',
      ],
    },
    {
      heading: '7. Notifications',
      body: [
        'With your permission we send notifications about your bookings, support replies, and news from restaurants you follow. You can turn them off at any time in Profile or in your phone settings.',
      ],
    },
    {
      heading: '8. Ending your account',
      body: ['You can delete your account at any time (Profile → Delete account, or ligeta.app/delete-account).'],
    },
    {
      heading: '9. Disclaimer and liability',
      body: [
        'The app is provided "as is". To the extent the law allows, LiGETA is not responsible for a restaurant\'s food, service, prices or decisions, and our liability is limited to direct damages.',
      ],
    },
    {
      heading: '10. Governing law',
      body: ['These terms are governed by the laws of the Republic of Iraq.'],
    },
    {
      heading: '11. Changes and contact',
      body: [
        'We may update these terms; the date at the top shows the latest version and important changes will be announced in the app. Questions: Profile → Help in the app.',
      ],
    },
  ],
  ar: [
    {
      heading: '١. الموافقة',
      body: ['بإنشاء حساب في ليگيتا أو استخدام تطبيق ليگيتا للزبائن فإنك توافق على هذه الشروط وعلى سياسة الخصوصية. إذا لم توافق، يُرجى عدم استخدام التطبيق.'],
    },
    {
      heading: '٢. حسابك',
      body: ['تسجّل الدخول برقم هاتفك الشخصي. حافظ على أمان رقمك وهاتفك، فمن يستطيع استلام رموز واتساب الخاصة بك يستطيع الدخول باسمك. حساب واحد لكل شخص.'],
    },
    {
      heading: '٣. معلومات المطاعم',
      body: ['القوائم والأسعار وأوقات العمل والعروض والفعاليات يقدّمها المطعم نفسه. نسعى لدقتها لكن لا نضمنها، فيُرجى التأكد من التفاصيل المهمة مع المطعم.'],
    },
    {
      heading: '٤. الحجوزات',
      body: ['الحجز من التطبيق طلب يُرسل إلى المطعم، وهو من يؤكّده أو يعتذر عنه. الدفع إن وُجد يكون في المطعم. يُرجى الإلغاء من التطبيق إذا لم تستطع الحضور، فتكرار عدم الحضور قد يقيّد قدرتك على الحجز.'],
    },
    {
      heading: '٥. التقييمات والصور',
      body: [
        'يجب أن يعكس التقييم تجربتك الحقيقية. لا تنشر محتوى كاذباً أو مسيئاً أو يحضّ على الكراهية أو غير لائق أو تهديدياً أو يكشف معلومات خاصة بالآخرين، وارفع فقط صوراً التقطتها أو يحق لك مشاركتها. يبقى ما تنشره ملكاً لك، وتمنح ليگيتا إذناً بعرضه في التطبيق وصفحات ليگيتا. قد نخفي أو نحذف المحتوى المخالف، ويمكن للمطاعم الإبلاغ عن التقييمات لنراجعها.',
      ],
    },
    {
      heading: '٦. الاستخدام العادل',
      body: ['لا تنشئ حسابات أو زيارات مزيّفة، ولا تتلاعب بالتقييمات، ولا تسحب بيانات الخدمة، ولا تحاول اختراق أمانها. قد نوقف أو نحظر الحسابات المخالفة.'],
    },
    {
      heading: '٧. الإشعارات',
      body: ['بإذنك نرسل إشعارات عن حجوزاتك وردود الدعم وأخبار المطاعم التي تتابعها. يمكنك إيقافها في أي وقت من الملف الشخصي أو إعدادات هاتفك.'],
    },
    {
      heading: '٨. إنهاء الحساب',
      body: ['يمكنك حذف حسابك في أي وقت (الملف الشخصي ← حذف الحساب، أو ligeta.app/delete-account).'],
    },
    {
      heading: '٩. إخلاء المسؤولية',
      body: ['يُقدَّم التطبيق "كما هو". وبالقدر الذي يسمح به القانون، ليگيتا غير مسؤولة عن طعام المطعم أو خدمته أو أسعاره أو قراراته، وتقتصر مسؤوليتنا على الأضرار المباشرة.'],
    },
    {
      heading: '١٠. القانون المطبّق',
      body: ['تخضع هذه الشروط لقوانين جمهورية العراق.'],
    },
    {
      heading: '١١. التعديلات والتواصل',
      body: ['قد نحدّث هذه الشروط، والتاريخ في الأعلى يبيّن أحدث نسخة، وسنعلن التغييرات المهمة داخل التطبيق. للأسئلة: الملف الشخصي ← المساعدة داخل التطبيق.'],
    },
  ],
};
