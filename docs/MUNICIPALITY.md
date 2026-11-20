# Participatory Municipality

A fictional municipality demonstrates community reporting, district triage, execution, inspection and local Cara incentives. FORGE's SaaS/Admin conventions provide an RTL application shell, shared UI primitives and Persian formatting. The municipality is an isolated Next.js workspace with Tailwind and strict TypeScript. It does not resolve a FORGE account or call its API.

The uploaded specList.txt defines the product requirements. The master prompt defines the implementation and verification scope.

[ASSUMPTION] One fictional district manager represents the internal execution team for district-owned work. Contractors work on explicitly assigned projects. Formal tender mechanics and all money movements are simulations.

## Architecture and navigation

```text
Hamsade/
├── apps/municipality/
│   ├── app/                    RTL layout, login and /desk routes
│   ├── components/             Shell, shared controls and workspaces
│   ├── domain/                 Types, JSON fixtures, commands and selectors
│   └── e2e/                    Stakeholder and accessibility browser checks
├── apps/{api,web}/              Original FORGE applications
├── packages/{shared,ui,config}/ FORGE formatting and UI primitives
└── docs/MUNICIPALITY.md         Run, reset, and handoff
```

- `apps/municipality/app` contains the Persian RTL layout and App Router entry points.
- `apps/municipality/components` contains the shell, reusable controls and role workspaces.
- `apps/municipality/domain` owns fixture data, calendar conversion, selectors and commands. React Context uses a reducer to publish each successful transaction and a versioned localStorage snapshot to restore it.
- Use teal for primary actions, amber for review, red for errors and slate for neutral operational states. Navigation stays at the inline start on wide screens and collapses into a toggle on smaller screens. Senior mode increases text and control sizes.

| Role       | Dashboard and authorized workspaces                                 |
| ---------- | ------------------------------------------------------------------- |
| Citizen    | Cases, submit report or idea, wallet, shop, learning, participation |
| Inspector  | Assigned cases and inspections, wallet                              |
| District   | District cases and assignments, scoring, district products, wallet  |
| HQ         | City cases, scoring defaults, public transparency, audit, wallet    |
| Contractor | Assigned cases and execution, wallet                                |
| Vendor     | Own products, orders and settlement, wallet                         |
| Instructor | Own courses, attendance and payout, wallet                          |

Everyone can access profile, notifications, search and transparency after choosing a fixture persona. The public-safe summary is also available without sign-in at /transparency. Workspace URLs use /desk/:section. Direct access and command permissions are checked independently. Fixtures and local storage are inspectable by anyone with access to the browser.

## Roadmap

1. Role shell, fixtures and guarded navigation.
2. Civic workflow, scoring, assignment and approval.
3. Cara commerce, course attendance, participation and simulated integrations.
4. Domain and browser verification and stakeholder handoff.

## Fixtures, design and reset

The login screen lists seven fictional personas. Use its role switcher in the same browser tab to share the evolving snapshot between personas. The role, data, and senior-mode preference survive refresh. From **تنظیمات و پروفایل**, choose **بازنشانی داده‌های نمایشی** and confirm to restore the initial snapshot. Export and multi-tab synchronization are outside the demo. Avoid entering real personal information.

`fixtures.json` supplies people, districts, locations, products, courses, notices and events. `data.ts` adds linked cases, sample inspections, versioned scores, attendance, ledger and orders. The operating personas represent District 1. District 2 supplies city-wide reporting and district isolation examples. [ASSUMPTION] Roles have a baseline route matrix, and HQ can activate or deactivate a persona and suspend individual actions within the baseline permission matrix. A suspended action is rejected at the command boundary while read access remains available.

The app uses Vazirmatn, responsive dashboard and card grids, and semantic colors in `app/globals.css`. Base text is 15px, forms use 44px controls, and senior mode raises text and principal controls. The FORGE primitives provide buttons, cards and notices. Municipal components add status badges, score and wallet widgets, a calendar picker, accessible tables, a native modal and live feedback. Document RTL applies to login and all workspaces, and identifiers and codes use bidi isolation.

## Civic workflow and scoring

| Action                | Starting state                | Result                                | Actor and required detail                                                                                 |
| --------------------- | ----------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Submit report or idea | —                             | Registered                            | Citizen provides title, category, district, fixture location, observed date and description               |
| Evaluate              | Registered or unscored review | In review                             | District enters bounded raw values and snapshots the current revision                                     |
| Assign                | Scored review                 | Assigned                              | District picks internal, direct or tender, records reason and an integer contractor price when applicable |
| Record work           | Assigned, in work or rework   | In work                               | Assigned executor enters a progress note and can attach a supporting PDF or image                         |
| Request inspection    | In work                       | Waiting for inspection                | Assigned executor enters supporting progress                                                              |
| Approve               | Waiting for inspection        | Approved                              | Assigned inspector enters checklist, location, date, score and reason                                     |
| Reject output         | Waiting for inspection        | Needs rework                          | Assigned inspector records the same evidence and an explanation                                           |
| Reject case or merge  | Registered or review          | Rejected or merged                    | District records a reason; merge requires a surviving case of the same kind and district                  |
| Confirm quality       | Approved                      | Civic confirmation alongside approval | Citizen records feedback without changing operational status                                              |

Report and idea records retain their kind throughout. The demo uses the same execution gates for each kind. A valid report earns 12 Cara after district evaluation. An idea earns 25 Cara after inspection approval. Votes and context are independent of inspection. Voting pays 2 Cara once per eligible case. A contractor may earn floor(quality ÷ 5) Cara on approval and lose up to 5 available Cara per inspection that requests rework.

Each priority score is `sum(raw × weight) ÷ 100`. Raw values and integer percentages are bounded from zero to 100. The weights must total 100. District-specific revisions take precedence over the city default. Existing cases retain the exact revision and inputs that were used. Public transparency shows only district, category, date, state and score, and omits locations, descriptions, media, and operational notes. The case detail has additional viewer-specific disclosure.

Civil dates use ISO YYYY-MM-DD values and audit timestamps use UTC. The interface converts user dates with `jalaali-js`, accepts Persian and Arabic digits, and displays dates in the Jalali calendar. The calendar uses Asia/Tehran day boundaries for monthly caps.

## Cara, education and mock sync

- The default rate is 1,000 toman per Cara and the default cap is 150 Cara per Jalali month. Ledger balances are summed from integer entries. Checkouts snapshot the rate and use at most floor(eligible toman subtotal ÷ rate) Cara. Top-ups require simulated toman payment and are excluded from the Cara-payable subtotal. Vendor settlement converts the Cara portion using the order's historical rate.
- Checkout validates stock and payable balance together. Successful retries return the original order. Training allows a single payout per course and participant after approved attendance and a passed quiz. A rendered QR encodes the same payload accepted by the attendance input. The manual code works independently of the QR. Course player content is local text.
- `137-8001` is owned by the mock source until import. After import, the district owns status and assignment. Fixture GIS provides district-specific selectable locations with a keyboard-friendly dropdown, without live maps or coordinates. `TOLL-502` creates an eligible simulated payment reward. `PARK-304` is informational. External IDs are deduplicated. A simulated sync failure records no imported ID and can be retried. HQ can review duplicate attempts as fraud flags.
- Report and inspection images and supporting execution attachments stay in the browser snapshot. Execution attachments are downloadable from the permitted timeline. Files are limited to 350 KB. Production needs secure file upload and authorized retrieval.

## Stakeholder walkthrough

1. Run `pnpm install --frozen-lockfile` and `pnpm dev` from Hamsade with Node 24 and pnpm 11.25.0. Open `http://localhost:3001/`.
2. Choose **شهروند** and **ثبت گزارش جدید**. Enter a title and description, choose a fixture pin in District 1, select a Jalali date, and submit. Open **مشاهدهٔ پرونده** and note the case ID.
3. Return to login through **خروج و تغییر نقش**. Choose **مدیر منطقه**, open **گزارش‌ها و پیشنهادها** and the new case. Evaluate it, view the score breakdown, and assign it with a reason using **قرارداد قیمت مستقیم**.
4. Choose **پیمانکار** and open the same case under **پروژه‌ها و قراردادها**. Record progress and send it for inspection.
5. Choose **بازرس کیفیت**, open the case in **صف بازرسی**, fill in the inspection, and request rework. Switch back to contractor, record the fix, and return it to the inspector. Approve the second inspection.
6. Return as citizen and check the approved status and timeline. Confirm quality, and open **کیف پول کارا** to see the 12-Cara report entry. Try a mixed purchase from **فروشگاه شهری**.
7. For training, the instructor opens a course and shows **کد حضور و QR**. As the citizen, enter that code and pass the lesson quiz. As the instructor, approve attendance and pay the reward. Check the citizen wallet.
8. As **مدیر ستاد**, inspect city transparency, ledger and alerts. From the profile, reset the demo when finished.

## Verification and production boundary

Use `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` and `pnpm build`. After building, run `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium pnpm test:e2e --workers=1` where that browser path exists, or install Playwright Chromium and omit the override. The browser runner starts the production app on port 3001.

For a launch, replace the persona picker with verified identity and server-enforced roles, use a transactional and protected financial ledger, secure media and evidence, and implement municipal data retention, privacy and auditing requirements. Integrations, conversions, tenders, settlements and withdrawals in this repository are demonstrations. Default fixtures cover the main demo lifecycle rather than representing actual municipal records.

### Observed checks

- A temporary clean copy installed the frozen lockfile and returned HTTP 200 for the Persian RTL login after the documented `pnpm dev` command.
- Municipal lint, formatting, type checking, and the production build passed. Nine domain tests exercised permissions, district isolation, immutable scoring revisions, rework, Jalali boundaries, mixed checkout, monthly caps, payout deduplication, and mock sync retries.
- Five Chromium tests covered the report lifecycle across four personas, keyboard and viewport checks, mixed settlement, QR attendance and payout, and HQ permissions. Axe found no violations on the tested wallet view. The HQ browser check observed no backend or external HTTP requests.
- The copied FORGE unit suite passed all 15 tests. The legacy NestJS/PostgreSQL deployment is outside the municipal demo verification.
