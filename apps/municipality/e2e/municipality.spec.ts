import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function login(page: Page, role: string) {
  await page.goto('/');
  await page.getByRole('radio', { name: role }).check();
  await page.getByRole('button', { name: 'ورود به پیشخوان' }).click();
  await expect(page).toHaveURL(/\/desk\/home$/);
}

test('citizen to district to contractor to inspector with rework', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
  await login(page, 'شهروند');
  await page.getByRole('link', { name: 'ثبت گزارش جدید' }).click();
  await page.getByLabel('عنوان', { exact: true }).fill('آزمون روشنایی محله');
  await page
    .getByLabel('شرح پرونده')
    .fill('مسیر محله پس از غروب روشنایی کافی ندارد.');
  await page.getByRole('button', { name: 'تقویم تاریخ مشاهده' }).click();
  await page.getByRole('button', { name: /^انتخاب /, pressed: true }).click();
  await page.getByLabel('افزودن عکس یا ویدیو (اختیاری)').setInputFiles({
    name: 'demo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(
    page.getByRole('img', { name: 'پیش‌نمایش رسانهٔ انتخاب‌شده' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'ثبت پرونده' }).click();
  await page.getByRole('link', { name: 'مشاهدهٔ پرونده' }).click();
  await expect(page).toHaveURL(/\/desk\/cases\/M-\d+$/);
  const record = page.url();
  await expect(
    page.getByRole('heading', { name: 'آزمون روشنایی محله' }),
  ).toBeVisible();
  await login(page, 'مدیر منطقه');
  await page.goto('/desk/cases/M-1030');
  await expect(
    page.getByRole('heading', { name: 'پرونده در دسترس نیست' }),
  ).toBeVisible();
  await page.goto(record);
  await page.getByRole('button', { name: 'ثبت امتیاز و بررسی' }).click();
  await expect(
    page.getByRole('heading', { name: 'امتیاز اولویت' }),
  ).toBeVisible();
  await page.getByLabel('شرح و دلیل ارجاع').fill('ارجاع به پیمانکار روشنایی');
  await page.getByRole('button', { name: 'ثبت ارجاع' }).click();
  await expect(page.getByRole('button', { name: 'ثبت ارجاع' })).toHaveCount(0);
  await login(page, 'پیمانکار');
  await page.goto(record);
  const progress = async () => {
    await page.getByLabel('شرح پیشرفت').fill('چراغ‌ها نصب و کنترل شدند.');
    await page.getByLabel('سند کار (PDF یا تصویر، اختیاری)').setInputFiles({
      name: 'work-note.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%%EOF'),
    });
    await page.getByRole('button', { name: 'ذخیرهٔ پیشرفت' }).click();
    await expect(
      page.getByRole('link', { name: 'work-note.pdf' }).last(),
    ).toHaveAttribute('download', 'work-note.pdf');
    await page.getByRole('button', { name: 'ارسال برای بازرسی' }).click();
    await expect(
      page.getByRole('heading', { name: 'ثبت پیشرفت اجرا' }),
    ).toHaveCount(0);
  };
  await progress();
  await login(page, 'بازرس کیفیت');
  await page.goto(record);
  await page
    .getByLabel('دلیل و شرح نتیجه')
    .fill('سیم‌کشی بخشی از مسیر نیاز به بازبینی دارد.');
  await page.getByRole('button', { name: 'رد نتیجه و درخواست اصلاح' }).click();
  await expect(
    page.getByRole('heading', { name: 'سوابق کیفیت و اصلاح' }),
  ).toBeVisible();
  await login(page, 'پیمانکار');
  await page.goto(record);
  await progress();
  await login(page, 'بازرس کیفیت');
  await page.goto(record);
  await page
    .getByLabel('دلیل و شرح نتیجه')
    .fill('تمام چراغ‌ها دوباره بررسی و تأیید شدند.');
  await page.getByRole('button', { name: 'تأیید نتیجه' }).click();
  await expect(page.locator('.page-title .badge')).toHaveText('تأیید شده');
  await login(page, 'شهروند');
  await page.goto(record);
  await expect(
    page.getByText('سیم‌کشی بخشی از مسیر نیاز به بازبینی دارد.'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'تأیید کیفیت از سوی شهروند' }).click();
  await expect(
    page.getByText('کیفیت تأیید شد', { exact: false }),
  ).toBeVisible();
  await page.goto('/desk/progress');
  await expect(
    page.getByText('۷۵ امتیاز تجربه', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('چالش تکمیل شد', { exact: true })).toBeVisible();
  await expect(
    page.getByText('پاداش مأموریت از گزارش تا نتیجه', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('۷۵ امتیاز تجربه', { exact: true }),
  ).toBeVisible();
  await page.goto('/desk/wallet');
  await expect(page.getByText('اعتبار گزارش معتبر')).toBeVisible();
  await page.reload();
  await expect(page.getByText('اعتبار گزارش معتبر')).toBeVisible();
  await page.goto('/desk/audit');
  await expect(
    page.getByRole('heading', { name: 'دسترسی به این بخش محدود است' }),
  ).toBeVisible();
});

test('responsive navigation, dialog keyboard behavior and accessibility', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto('/desk/audit');
  await expect(
    page.getByRole('heading', { name: 'ابتدا نقش خود را انتخاب کنید' }),
  ).toBeVisible();
  await login(page, 'شهروند');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const menu = page.getByRole('button', { name: 'باز کردن منو' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await page
    .getByRole('navigation', { name: 'ناوبری اصلی' })
    .getByRole('link', { name: 'کیف پول کارا' })
    .click();
  await expect(page.getByRole('button', { name: /برداشت/ })).toHaveCount(0);
  await page.goto('/desk/shop');
  await page
    .locator('.product-card')
    .filter({ hasText: 'کوپن پارکینگ طرف قرارداد' })
    .getByRole('button', { name: 'افزودن به سبد' })
    .click();
  const open = page.getByRole('button', { name: 'پرداخت ترکیبی' });
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await page.goto('/desk/wallet');
  const failures = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(failures.violations).toEqual([]);
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 820 });
    await page.goto('/desk/home');
    await expect(
      page.getByRole('heading', { name: 'پیشخوان شهروندی' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
});

test('mixed purchase and settlement keep the original rate', async ({
  page,
}) => {
  await login(page, 'شهروند');
  await page.goto('/desk/shop');
  const product = page
    .locator('.product-card')
    .filter({ hasText: 'کوپن پارکینگ طرف قرارداد' });
  await product.getByRole('button', { name: 'افزودن به سبد' }).click();
  await page.getByRole('button', { name: 'پرداخت ترکیبی' }).click();
  await page.getByLabel('سهم پرداخت با کارا').fill('20');
  await page.getByRole('button', { name: 'صدور رسید آزمایشی' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    '۲۰ کارا + ۸۰٬۰۰۰ تومان',
  );
  await page.keyboard.press('Escape');
  await login(page, 'فروشنده');
  await page.goto('/desk/products');
  const order = page
    .getByRole('row')
    .filter({ hasText: 'کوپن پارکینگ طرف قرارداد' })
    .filter({
      has: page.getByRole('cell', { name: '۸۰٬۰۰۰ تومان', exact: true }),
    });
  await order.getByRole('button', { name: 'تسویهٔ آزمایشی' }).click();
  await expect(order).toContainText('تسویه شد');
});

test('instructor QR, quiz and payout reach the citizen wallet', async ({
  page,
}) => {
  await login(page, 'مدرس');
  await page.goto('/desk/courses');
  const course = page.locator('.ui-panel').filter({
    has: page.getByRole('heading', { name: 'تفکیک پسماند از خانه' }),
  });
  await course.getByRole('button', { name: 'کد حضور و QR' }).click();
  await expect(
    page.getByRole('img', { name: 'کد QR حضور در جلسه' }),
  ).toBeVisible();
  const payload = await page.locator('.attendance-code code').innerText();
  await page.keyboard.press('Escape');
  await login(page, 'شهروند');
  await page.goto('/desk/training');
  await course.getByRole('button', { name: 'ورود به درس' }).click();
  await page.getByRole('button', { name: 'پخش درس' }).click();
  await expect(
    page.getByText('پسماند خشک و تمیز را از پسماند تر جدا کنید.'),
  ).toBeVisible();
  await page.getByLabel('کد حضور یا متن QR').fill(payload);
  await page.getByRole('button', { name: 'ثبت حضور' }).click();
  await page.getByLabel('پسماند خشک تمیز را جدا کنیم؟').selectOption('yes');
  await page.getByRole('button', { name: 'ثبت آزمون' }).click();
  await expect(page.getByRole('dialog')).toContainText('آزمون: قبول');
  await page.keyboard.press('Escape');
  await login(page, 'مدرس');
  await page.goto('/desk/courses');
  await course.getByRole('button', { name: 'تأیید حضور' }).click();
  await course.getByRole('button', { name: 'پرداخت پاداش کارا' }).click();
  await expect(course).toContainText('پرداخت شد');
  await expect(
    course.getByRole('button', { name: 'پرداخت پاداش کارا' }),
  ).toBeDisabled();
  await login(page, 'شهروند');
  await page.goto('/desk/wallet');
  await expect(page.getByText('پاداش دورهٔ تفکیک پسماند از خانه')).toBeVisible();
});

test('HQ can scope access and search stays within the municipality app', async ({
  page,
  baseURL,
}) => {
  const serviceRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      ['https:', 'http:'].includes(url.protocol) &&
      (url.origin !== baseURL || url.pathname.startsWith('/api/'))
    )
      serviceRequests.push(url.href);
  });
  await page.goto('/transparency');
  await expect(
    page.getByRole('heading', { name: 'شفافیت شهری' }),
  ).toBeVisible();
  await expect(page.getByText('خیابان آبان')).toHaveCount(0);
  await login(page, 'مدیر ستاد');
  await expect(
    page.getByRole('heading', { name: 'نمای مناطق شهر' }),
  ).toBeVisible();
  await page.goto('/desk/audit');
  const citizen = page
    .getByRole('row')
    .filter({ has: page.getByRole('checkbox', { name: 'ثبت پرونده' }) });
  await citizen.getByRole('checkbox', { name: 'ثبت پرونده' }).uncheck();
  await login(page, 'شهروند');
  await page.goto('/desk/submit');
  await page
    .getByLabel('عنوان', { exact: true })
    .fill('گزارش برای بررسی دسترسی');
  await page
    .getByLabel('شرح پرونده')
    .fill('این پرونده نباید با مجوز غیرفعال ثبت شود.');
  await page.getByRole('button', { name: 'ثبت پرونده' }).click();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'این مجوز برای نقش فعلی غیرفعال است.' }),
  ).toBeVisible();
  await page.goto('/desk/search');
  await page.getByLabel('عبارت جست‌وجو').fill('روشنایی');
  await expect(
    page.getByRole('link', { name: 'روشنایی خیابان آبان' }),
  ).toBeVisible();
  expect(serviceRequests).toEqual([]);
});

test('progress is discoverable and demo ranking consent persists', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await login(page, 'شهروند');
  await page.getByRole('link', { name: 'مشاهدهٔ نشان‌ها و مأموریت‌ها' }).click();
  await expect(
    page.getByRole('heading', { name: 'پیشرفت مشارکت', exact: true }),
  ).toBeVisible();
  const preference = page.getByRole('checkbox', {
    name: 'نمایش جایگاه من در جدول نمونه',
  });
  const ownRow = page.getByRole('cell', { name: 'شما', exact: true });
  await expect(preference).not.toBeChecked();
  await expect(ownRow).toHaveCount(0);
  await preference.check();
  await expect(ownRow).toBeVisible();
  await page.reload();
  await expect(preference).toBeChecked();
  await preference.uncheck();
  await expect(ownRow).toHaveCount(0);
  const failures = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(failures.violations).toEqual([]);
  await login(page, 'فروشنده');
  await page.goto('/desk/progress');
  await expect(
    page.getByRole('heading', { name: 'دسترسی به این بخش محدود است' }),
  ).toBeVisible();
});

test('a neighbor uploads video proof and receives Cara only after inspection', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'از گزارش تا نتیجه، با هم.' }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/کاراشهر/);
  await login(page, 'شهروند');
  await expect(
    page.getByRole('heading', { name: 'گزارش‌های من' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'مسائل محلهٔ من' }),
  ).toBeVisible();
  await expect(page.locator('.topbar')).toContainText('منطقه ۲، ناحیه ۵');
  const title = 'پاکسازی مسیر پیاده‌روی بوستان سپید';
  await page.getByRole('link', { name: title, exact: true }).click();
  await expect(
    page.getByRole('progressbar', { name: 'پیشرفت ' + title }),
  ).toHaveAttribute('value', '25');
  await page.getByRole('button', { name: 'انجام این کار را می‌پذیرم' }).click();
  await page
    .getByLabel('شرح کار انجام‌شده')
    .fill('زباله‌های سبک از مسیر پیاده‌روی پاکسازی شد.');
  await page
    .getByLabel('عکس یا ویدیوی مدرک رفع مسئله')
    .setInputFiles(
      fileURLToPath(
        new URL('./fixtures/volunteer-proof.webm', import.meta.url),
      ),
    );
  await expect(page.locator('video')).toBeVisible();
  await page.getByRole('button', { name: 'ارسال مدرک برای تأیید' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'پیشرفت ' + title }),
  ).toHaveAttribute('value', '85');
  await page.goto('/desk/wallet');
  await expect(
    page.getByText('پاداش رفع مسئلهٔ محله', { exact: true }),
  ).toHaveCount(0);
  await login(page, 'بازرس کیفیت');
  await page.goto('/desk/inspection/M-1050');
  const proof = page.locator('video[aria-label="رسانهٔ رفع مسئله"]');
  await expect(proof).toBeVisible();
  await expect
    .poll(() => proof.evaluate((node: HTMLVideoElement) => node.videoWidth))
    .toBe(32);
  await page
    .getByLabel('دلیل و شرح نتیجه')
    .fill('پاکسازی مسیر با مدرک ارسالی تأیید شد.');
  await page.getByRole('button', { name: 'تأیید نتیجه' }).click();
  await expect(
    page.getByRole('progressbar', { name: 'پیشرفت ' + title }),
  ).toHaveAttribute('value', '100');
  await login(page, 'شهروند');
  await page.goto('/desk/wallet');
  await expect(
    page.getByText('پاداش رفع مسئلهٔ محله', { exact: true }),
  ).toBeVisible();
  await page.goto('/transparency');
  await expect(
    page.getByRole('heading', { name: 'شهروند برتر' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ناحیهٔ برتر' })).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
});

test('event participation awards XP after attendance and shows the emergency lesson', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'));
  await login(page, 'شهروند');
  await page.goto('/desk/community');
  const event = page
    .getByRole('row')
    .filter({ hasText: 'پاکسازی داوطلبانهٔ محله' });
  await event.getByRole('button', { name: 'ثبت‌نام در رویداد' }).click();
  await expect(event).toContainText('در انتظار تأیید حضور');
  await login(page, 'مدیر منطقه');
  await page.goto('/desk/community');
  await event.getByRole('button', { name: 'تأیید حضور شهروند' }).click();
  await expect(event).toContainText('حضور تأیید شد');
  await login(page, 'شهروند');
  await page.goto('/desk/progress');
  await expect(
    page.getByText('حضور تأییدشده در رویداد', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('۲۰ امتیاز تجربه', { exact: true }),
  ).toBeVisible();
  await page.goto('/desk/training');
  const lesson = page.locator('.ui-panel').filter({
    has: page.getByRole('heading', { name: 'در زمان جنگ چه کار کنیم؟' }),
  });
  await lesson.getByRole('button', { name: 'ورود به درس' }).click();
  await page.getByRole('button', { name: 'پخش درس' }).click();
  await expect(
    page.getByText(/هشدارها و دستورهای امدادی را از منابع رسمی دنبال کنید/),
  ).toBeVisible();
});

test('the citizen can buy a Shahrvand coupon and record one use at a parking partner', async ({
  page,
}) => {
  await login(page, 'شهروند');
  await page.goto('/desk/shop');
  const item = page
    .locator('.product-card')
    .filter({ hasText: 'کوپن خرید فروشگاه شهروند' });
  await expect(item).toContainText('۵۰۰٬۰۰۰ تومان');
  await item.getByRole('button', { name: 'افزودن به سبد' }).click();
  await page.getByRole('button', { name: 'پرداخت ترکیبی' }).click();
  await page.getByRole('button', { name: 'صدور رسید آزمایشی' }).click();
  await expect(page.getByRole('dialog')).toContainText('ثبت شد');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: 'کوپن خرید فروشگاه شهروند', level: 3 }),
  ).toBeVisible();
  const coupon = page
    .locator('.ui-panel')
    .filter({ has: page.getByText('O-100/parking/1', { exact: true }) })
    .last();
  await coupon.getByLabel('پذیرندهٔ کوپن').selectOption('parking-5');
  await coupon.getByRole('button', { name: 'ثبت استفادهٔ آزمایشی' }).click();
  await expect(coupon).toContainText('مصرف شد');
  await page.reload();
  await expect(coupon).toContainText('پارکینگ طرف قرارداد نمونهٔ ناحیهٔ ۵');
  await expect(
    coupon.getByRole('button', { name: 'ثبت استفادهٔ آزمایشی' }),
  ).toHaveCount(0);
});
