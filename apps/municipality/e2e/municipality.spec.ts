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
  await login(page, 'شهروند');
  await page.getByRole('link', { name: 'ثبت گزارش جدید' }).click();
  await page.getByLabel('عنوان', { exact: true }).fill('آزمون روشنایی محله');
  await page
    .getByLabel('شرح پرونده')
    .fill('مسیر محله پس از غروب روشنایی کافی ندارد.');
  await page.getByRole('button', { name: 'تقویم تاریخ مشاهده' }).click();
  await page.getByRole('button', { name: /^انتخاب /, pressed: true }).click();
  await page.getByLabel('افزودن عکس (اختیاری)').setInputFiles({
    name: 'demo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jc1sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(
    page.getByRole('img', { name: 'پیش‌نمایش تصویر انتخاب‌شده' }),
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
  const open = page.getByRole('button', { name: 'درخواست برداشت آزمایشی' });
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
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
    .filter({ hasText: 'کوپن پارکینگ عمومی' });
  await product.getByRole('button', { name: 'افزودن به سبد' }).click();
  await page.getByRole('button', { name: 'پرداخت ترکیبی' }).click();
  await page.getByLabel('سهم پرداخت با کارا').fill('20');
  await page.getByRole('button', { name: 'صدور رسید آزمایشی' }).click();
  await expect(page.getByRole('dialog')).toContainText(
    '۲۰ کارا + ۲۰٬۰۰۰ تومان',
  );
  await page.keyboard.press('Escape');
  await login(page, 'فروشنده');
  await page.goto('/desk/products');
  const order = page
    .getByRole('row')
    .filter({ hasText: 'کوپن پارکینگ عمومی' })
    .filter({
      has: page.getByRole('cell', { name: '۲۰٬۰۰۰ تومان', exact: true }),
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
