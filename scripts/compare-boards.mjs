// Side-by-side comparisons: the board's reference screenshot (left) beside the built site (right),
// written to qa/compare/<name>.png. Uses the running dev server so dev-only state pages are available.
// Usage: npm run dev (in another terminal), then node scripts/compare-boards.mjs [name ...]
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { root } from './lib/serve.mjs';

const BASE = process.env.BASE ?? 'http://localhost:4321';
const refDir = join(root, '..', 'design-handoff', 'reference-screens');
const out = join(root, 'qa', 'compare');
mkdirSync(out, { recursive: true });

const openMega = (key) => async (page) => {
  await page.locator(`[data-mega-trigger="${key}"]`).click();
  await page.waitForTimeout(400);
};

/** Each entry: board reference (optionally a crop of it) vs a capture of the built page. */
const comparisons = [
  { name: '01-site-header', board: 'SiteHeader', ref: 'SiteHeader.jpg', url: '/404', width: 1440, clip: { x: 0, y: 0, width: 1440, height: 133 } },
  { name: '02-mega-panel-campus', board: 'MegaPanel (menuKey: campus)', ref: 'MegaPanel.jpg', url: '/404', width: 1440, prepare: openMega('campus'), selector: '#mega-campus' },
  { name: '03-header-search-open', board: 'ShellHeader · D Search open', ref: 'ShellHeader.jpg', refCrop: { left: 0, top: 2475, width: 1440, height: 355 }, url: '/404', width: 1440,
    prepare: async (p) => { await p.locator('[data-search-trigger]').click(); await p.waitForTimeout(400); }, clip: { x: 0, y: 44, width: 1440, height: 89 + 266 } },
  { name: '04-header-over-hero', board: 'ShellHeader · A Top of page, transparent over the hero', ref: 'ShellHeader.jpg', refCrop: { left: 0, top: 345, width: 1440, height: 700 }, url: '/dev/shell-hero', width: 1440, clip: { x: 0, y: 0, width: 1440, height: 700 } },
  { name: '05-mobile-header', board: 'MobileHeader', ref: 'MobileHeader.jpg', url: '/404', width: 390, height: 844, clip: { x: 0, y: 0, width: 390, height: 65 } },
  { name: '06-mobile-header-over-hero', board: 'MobileShell · A Over the hero', ref: 'MobileShell.jpg', refCrop: { left: 0, top: 360, width: 390, height: 555 }, url: '/dev/shell-hero', width: 390, height: 844, clip: { x: 0, y: 0, width: 390, height: 555 } },
  { name: '07-mobile-search-open', board: 'MobileShell · B2 Search open', ref: 'MobileShell.jpg', refCrop: { left: 0, top: 1440, width: 390, height: 330 }, url: '/404', width: 390, height: 844,
    prepare: async (p) => { await p.locator('[data-search-trigger]').click(); await p.waitForTimeout(400); }, clip: { x: 0, y: 0, width: 390, height: 330 } },
  { name: '08-mobile-menu', board: 'MobileMenu (Learning open)', ref: 'MobileMenu.jpg', url: '/dev/shell-hero', width: 390, height: 909,
    prepare: async (p) => { await p.locator('[data-menu-trigger]').click(); await p.waitForTimeout(500); }, clip: { x: 0, y: 0, width: 390, height: 909 } },
  { name: '09-footer', board: 'Footer', ref: 'Footer.jpg', url: '/404', width: 1440, selector: 'footer.site-footer' },
  { name: '10-mobile-footer', board: 'MobileFooter', ref: 'MobileFooter.jpg', url: '/404', width: 390, height: 844, selector: 'footer.site-footer' },
  { name: '11-404-desktop', board: 'NotFoundDesktop', ref: 'NotFoundDesktop.jpg', url: '/404', width: 1440, fullPage: true },
  { name: '12-404-mobile', board: 'NotFoundMobile', ref: 'NotFoundMobile.jpg', url: '/404', width: 390, height: 844, fullPage: true },
  // ---- Home (batch 2 + 3). Parts are cut from the page by section, matching the board's split. ----
  { name: '20-home-1-desktop-reduced', board: 'HomeDesktopReduced (part 1)', ref: 'HomeDesktopReduced.jpg', url: '/', width: 1440, range: [null, '.journey-still'] },
  { name: '21-home-1-desktop', board: 'HomeDesktop (part 1, to the journey)', ref: 'HomeDesktop.jpg', refCrop: { left: 0, top: 0, width: 1440, height: 3066 }, url: '/', width: 1440, range: [null, '.vm'] },
  { name: '22-home-journey-pinned', board: 'Journey (progress 0.33)', ref: 'Journey.jpg', url: '/', width: 1440, motion: 'no-preference', journey: 1 / 3 },
  { name: '23-home-2-desktop', board: 'HomeDesktop2', ref: 'HomeDesktop2.jpg', url: '/', width: 1440, range: ['.proof', '.fac'] },
  { name: '24-home-3-desktop', board: 'HomeDesktop3', ref: 'HomeDesktop3.jpg', url: '/', width: 1440, range: ['.life', 'footer.site-footer'] },
  { name: '25-home-1-mobile', board: 'HomeMobile (part 1)', ref: 'HomeMobile.jpg', url: '/', width: 390, height: 844, range: [null, '.vm'] },
  { name: '26-home-2-mobile', board: 'HomeMobile2', ref: 'HomeMobile2.jpg', url: '/', width: 390, height: 844, range: ['.journey-v', '.campus'] },
  { name: '27-home-3-mobile', board: 'HomeMobile3', ref: 'HomeMobile3.jpg', url: '/', width: 390, height: 844, range: ['.fac', 'footer.site-footer'] },
  { name: '28-emblem-3d', board: 'EmblemSpec · at rest (render-f1600)', refAsset: 'render-f1600.png', url: '/', width: 1440, motion: 'no-preference', wait: 3500, selector: '.hero [data-emblem-stage]' },
  // ---- About, Founder, Principal (batch 4) ----
  { name: '30-about-1-desktop', board: 'AboutDesktop (part 1)', ref: 'AboutDesktop.jpg', url: '/about', width: 1440, range: [null, '.ab-beyond'] },
  { name: '31-about-2-desktop', board: 'AboutDesktop2', ref: 'AboutDesktop2.jpg', url: '/about', width: 1440, range: ['.ab-vm', 'footer.site-footer'] },
  { name: '32-about-1-mobile', board: 'AboutMobile (part 1)', ref: 'AboutMobile.jpg', url: '/about', width: 390, height: 844, range: [null, '.ab-beyond'] },
  { name: '33-about-2-mobile', board: 'AboutMobile2', ref: 'AboutMobile2.jpg', url: '/about', width: 390, height: 844, range: ['.ab-vm', 'footer.site-footer'] },
  { name: '34-founder-desktop', board: 'FounderDesktop', ref: 'FounderDesktop.jpg', url: '/about/founder', width: 1440, fullPage: true },
  { name: '35-founder-mobile', board: 'FounderMobile', ref: 'FounderMobile.jpg', url: '/about/founder', width: 390, height: 844, fullPage: true },
  { name: '36-principal-desktop', board: 'PrincipalDesktop', ref: 'PrincipalDesktop.jpg', url: '/about/principal', width: 1440, fullPage: true },
  { name: '37-principal-mobile', board: 'PrincipalMobile', ref: 'PrincipalMobile.jpg', url: '/about/principal', width: 390, height: 844, fullPage: true },
  // ---- Learning + Program Detail (batch 5). Only Primary is drawn. ----
  { name: '40-learning-desktop', board: 'LearningDesktop (stage 01)', ref: 'LearningDesktop.jpg', url: '/learning', width: 1440, fullPage: true, wait: 1800 },
  { name: '41-learning-mobile', board: 'LearningMobile', ref: 'LearningMobile.jpg', url: '/learning', width: 390, height: 844, fullPage: true, wait: 1800 },
  { name: '42-primary-desktop', board: 'ProgramDetail (primary)', ref: 'ProgramDetail.jpg', url: '/learning/primary', width: 1440, fullPage: true },
  { name: '43-primary-mobile', board: 'ProgramDetailMobile (primary)', ref: 'ProgramDetailMobile.jpg', url: '/learning/primary', width: 390, height: 844, fullPage: true },
  // ---- Campus + Facility Detail (batch 6). Three facilities are drawn. ----
  { name: '50-campus-desktop', board: 'CampusDesktop (Learn, facility 01)', ref: 'CampusDesktop.jpg', url: '/campus', width: 1440, fullPage: true },
  { name: '51-campus-mobile', board: 'CampusMobile', ref: 'CampusMobile.jpg', url: '/campus', width: 390, height: 844, fullPage: true },
  { name: '52-mph-desktop', board: 'FacilityDetail (multipurpose-hall)', ref: 'FacilityDetail.jpg', url: '/campus/multipurpose-hall', width: 1440, fullPage: true },
  { name: '53-mph-mobile', board: 'FacilityDetailMobile (multipurpose-hall)', ref: 'FacilityDetailMobile.jpg', url: '/campus/multipurpose-hall', width: 390, height: 844, fullPage: true },
  { name: '54-indoor-desktop', board: 'FacilityIndoorSports (drafts on)', ref: 'FacilityIndoorSports.jpg', url: '/campus/indoor-sports-room', width: 1440, fullPage: true },
  { name: '55-indoor-mobile', board: 'FacilityIndoorSportsMobile (drafts on)', ref: 'FacilityIndoorSportsMobile.jpg', url: '/campus/indoor-sports-room', width: 390, height: 844, fullPage: true },
  { name: '56-library-desktop', board: 'FacilityLibrary (drafts off on the board; on in the demo)', ref: 'FacilityLibrary.jpg', url: '/campus/library', width: 1440, fullPage: true },
  { name: '57-library-mobile', board: 'FacilityLibraryMobile (drafts off on the board; on in the demo)', ref: 'FacilityLibraryMobile.jpg', url: '/campus/library', width: 390, height: 844, fullPage: true },
  // ---- Admissions (batch 7) ----
  { name: '60-admissions-desktop', board: 'AdmissionsDesktop (closed, external enquiry)', ref: 'AdmissionsDesktop.jpg', url: '/admissions', width: 1440, fullPage: true },
  { name: '61-admissions-mobile', board: 'AdmissionsMobile', ref: 'AdmissionsMobile.jpg', url: '/admissions', width: 390, height: 844, fullPage: true },
  { name: '63-enquiry-form', board: 'EnquiryForm (idle, 640)', ref: 'EnquiryForm.jpg', url: '/dev/enquiry-states', width: 1440, selector: '.states > div:first-child [data-enquiry-root]', prepare: async (p) => { await p.addStyleTag({ content: '.states{grid-template-columns:640px 640px !important}' }); } },
  { name: '62-enquiry-states', board: 'AdmissionsFormStates', ref: 'AdmissionsFormStates.jpg', url: '/dev/enquiry-states', width: 1440, fullPage: true },
  // ---- Achievements (batch 8) ----
  { name: '70-achievements-desktop', board: 'AchievementsDesktop (2026)', ref: 'AchievementsDesktop.jpg', url: '/achievements', width: 1440, fullPage: true },
  { name: '71-achievements-mobile', board: 'AchievementsMobile (2026)', ref: 'AchievementsMobile.jpg', url: '/achievements', width: 390, height: 844, fullPage: true },
  // ---- Gallery + Album + Lightbox (batch 9) ----
  { name: '80-gallery-desktop', board: 'GalleryDesktop (2025-26)', ref: 'GalleryDesktop.jpg', url: '/gallery/2025-26', width: 1440, fullPage: true },
  { name: '81-gallery-mobile', board: 'GalleryMobile (2025-26)', ref: 'GalleryMobile.jpg', url: '/gallery/2025-26', width: 390, height: 844, fullPage: true },
  { name: '82-gallery-empty', board: 'GalleryDesktopEmpty (2015-16)', ref: 'GalleryDesktopEmpty.jpg', url: '/gallery/2015-16', width: 1440, fullPage: true },
  { name: '83-album-desktop', board: 'GalleryAlbum', ref: 'GalleryAlbum.jpg', url: '/gallery/2025-26/annual-day', width: 1440, fullPage: true },
  { name: '84-album-mobile', board: 'GalleryAlbumMobile', ref: 'GalleryAlbumMobile.jpg', url: '/gallery/2025-26/annual-day', width: 390, height: 844, fullPage: true },
  { name: '85-lightbox', board: 'GalleryLightbox (7 / 18)', ref: 'GalleryLightbox.jpg', url: '/gallery/2025-26/annual-day#photo-7', width: 1440, height: 900, wait: 500 },
  { name: '86-lightbox-loading', board: 'GalleryLightboxLoading', ref: 'GalleryLightboxLoading.jpg', url: '/gallery/2025-26/annual-day?lbstate=loading#photo-7', width: 1440, height: 900, wait: 500 },
  { name: '87-lightbox-failed', board: 'GalleryLightboxFailed', ref: 'GalleryLightboxFailed.jpg', url: '/gallery/2025-26/annual-day?lbstate=failed#photo-7', width: 1440, height: 900, wait: 500 },
  { name: '88-lightbox-mobile', board: 'GalleryLightboxMobile', ref: 'GalleryLightboxMobile.jpg', url: '/gallery/2025-26/annual-day#photo-7', width: 390, height: 844, wait: 500 },
  // ---- Information + six pages (batch 10) ----
  { name: '90-info-desktop', board: 'InformationDesktop', ref: 'InformationDesktop.jpg', url: '/information', width: 1440, fullPage: true },
  { name: '91-info-mobile', board: 'InformationMobile', ref: 'InformationMobile.jpg', url: '/information', width: 390, height: 844, fullPage: true },
  { name: '92-timings-desktop', board: 'TimingsDesktop', ref: 'TimingsDesktop.jpg', url: '/information/timings', width: 1440, fullPage: true },
  { name: '93-timings-mobile', board: 'TimingsMobile', ref: 'TimingsMobile.jpg', url: '/information/timings', width: 390, height: 844, fullPage: true },
  { name: '94-timings-print', board: 'TimingsPrint (one A4 sheet)', ref: 'TimingsPrint.jpg', url: '/information/timings', width: 794, height: 1123, fullPage: true, prepare: async (p) => { await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(200); } },
  { name: '95-rules-desktop', board: 'RulesDesktop', ref: 'RulesDesktop.jpg', url: '/information/rules', width: 1440, fullPage: true },
  { name: '96-rules-mobile', board: 'RulesMobile', ref: 'RulesMobile.jpg', url: '/information/rules', width: 390, height: 844, fullPage: true },
  { name: '97-decorum-desktop', board: 'DecorumDesktop', ref: 'DecorumDesktop.jpg', url: '/information/decorum', width: 1440, fullPage: true },
  { name: '98-decorum-mobile', board: 'DecorumMobile', ref: 'DecorumMobile.jpg', url: '/information/decorum', width: 390, height: 844, fullPage: true },
  { name: '99-song-desktop', board: 'SongDesktop (no recording)', ref: 'SongDesktop.jpg', url: '/information/song', width: 1440, fullPage: true },
  { name: '9a-song-mobile', board: 'SongMobile (board shows a recording; none supplied)', ref: 'SongMobile.jpg', url: '/information/song', width: 390, height: 844, fullPage: true },
  { name: '9b-prayer-desktop', board: 'PrayerDesktop', ref: 'PrayerDesktop.jpg', url: '/information/prayer', width: 1440, fullPage: true },
  { name: '9c-prayer-mobile', board: 'PrayerMobile', ref: 'PrayerMobile.jpg', url: '/information/prayer', width: 390, height: 844, fullPage: true },
  { name: '9d-disclosure-desktop', board: 'DisclosureDesktop', ref: 'DisclosureDesktop.jpg', url: '/information/disclosure', width: 1440, fullPage: true },
  { name: '9e-disclosure-mobile', board: 'DisclosureMobile', ref: 'DisclosureMobile.jpg', url: '/information/disclosure', width: 390, height: 844, fullPage: true },
  // ---- Contact, Services, Search (batch 11) ----
  { name: 'a0-contact-desktop', board: 'ContactDesktop', ref: 'ContactDesktop.jpg', url: '/contact', width: 1440, fullPage: true },
  { name: 'a1-contact-mobile', board: 'ContactMobile', ref: 'ContactMobile.jpg', url: '/contact', width: 390, height: 844, fullPage: true },
  { name: 'a2-contact-form', board: 'ContactForm (idle, 640)', ref: 'ContactForm.jpg', url: '/contact', width: 1440, selector: '.ct-form [data-enquiry-root]', prepare: async (p) => { await p.addStyleTag({ content: '.ct-form{width:640px}' }); } },
  { name: 'a3-services-desktop', board: 'ServicesDesktop', ref: 'ServicesDesktop.jpg', url: '/services', width: 1440, fullPage: true },
  { name: 'a4-services-mobile', board: 'ServicesMobile', ref: 'ServicesMobile.jpg', url: '/services', width: 390, height: 844, fullPage: true },
  // Search needs the Pagefind index: run these against the built site (BASE=http://localhost:4322).
  { name: 'a5-search-desktop', board: 'SearchPage (timings)', ref: 'SearchPage.jpg', url: '/search?q=timings', width: 1440, fullPage: true, wait: 800 },
  { name: 'a6-search-mobile', board: 'SearchMobile (timings)', ref: 'SearchMobile.jpg', url: '/search?q=timings', width: 390, height: 844, fullPage: true, wait: 800 },
  { name: 'a7-search-none', board: 'SearchStates · no results', ref: 'SearchStates.jpg', refCrop: { left: 524, top: 517, width: 492, height: 440 }, url: '/search?q=zzqxw', width: 1440, wait: 800, clip: { x: 0, y: 133, width: 984, height: 760 } },
  { name: 'a8-search-error', board: 'SearchStates · error', ref: 'SearchStates.jpg', refCrop: { left: 1048, top: 517, width: 492, height: 440 }, url: '/search?q=timings&state=error', width: 1440, wait: 500, clip: { x: 0, y: 133, width: 984, height: 760 } },
  { name: '29-emblem-static', board: 'EmblemSpec · reduced motion / no WebGL', refAsset: 'render-f1600.png', url: '/', width: 1440, selector: '.hero [data-emblem-stage]' }
];

const only = process.argv.slice(2);
const label = (text, width) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="56"><rect width="100%" height="100%" fill="#1F1A17"/><text x="20" y="35" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="700" fill="#FBF7F0">${text.replace(/&/g, '&amp;')}</text></svg>`);

const browser = await chromium.launch();
try {
  for (const c of comparisons) {
    if (only.length && !only.some((o) => c.name.includes(o))) continue;
    console.log(`… ${c.name}`);
    const ctx = await browser.newContext({ viewport: { width: c.width, height: c.height ?? 900 }, reducedMotion: c.motion ?? 'reduce' });
    // Headless WebGL is software, which the site skips; force the 3D emblem for the board comparisons.
    await ctx.addInitScript(() => { window.__kbEmblemForce3D = true; });
    const page = await ctx.newPage();
    await page.goto(BASE + c.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    if (c.prepare) await c.prepare(page);
    if (c.wait) await page.waitForTimeout(c.wait);
    if (c.journey !== undefined) {
      // Scroll the pinned journey to a given progress, then capture the viewport.
      await page.evaluate((v) => {
        const s = document.querySelector('[data-journey]');
        const st = s.querySelector('.jp-sticky');
        const top = s.getBoundingClientRect().top + scrollY;
        const span = s.offsetHeight - st.offsetHeight;
        scrollTo(0, top - parseFloat(getComputedStyle(st).top) + v * span);
      }, c.journey);
      await page.waitForTimeout(600);
    }
    if (c.fullPage || c.range) {
      // A full-page capture never scrolls, so below-the-fold lazy images would stay blank.
      await page.evaluate(async () => {
        const imgs = [...document.querySelectorAll('img[loading="lazy"]')];
        imgs.forEach((i) => (i.loading = 'eager'));
        await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
      });
    }
    let clip = c.clip;
    if (c.range) {
      clip = await page.evaluate(([a, b]) => {
        const top = a ? document.querySelector(a).getBoundingClientRect().top + scrollY : 0;
        const el = document.querySelector(b);
        const bottom = el.getBoundingClientRect().bottom + scrollY;
        return { x: 0, y: Math.round(top), width: document.documentElement.clientWidth, height: Math.round(bottom - top) };
      }, c.range);
    }
    const mine = c.selector
      ? await page.locator(c.selector).screenshot()
      : c.journey !== undefined ? await page.screenshot()
      : await page.screenshot({ clip, fullPage: !!(c.fullPage || c.range) });
    await ctx.close();

    let ref = sharp(readFileSync(c.refAsset ? join(root, '..', 'design-handoff', 'assets', c.refAsset) : join(refDir, c.ref)));
    if (c.refCrop) ref = ref.extract(c.refCrop);
    const refBuf = await ref.png().toBuffer();
    const [rm, mm] = await Promise.all([sharp(refBuf).metadata(), sharp(mine).metadata()]);
    const colW = Math.max(rm.width, mm.width);
    const h = Math.max(rm.height, mm.height);
    const gap = 24;
    const W = colW * 2 + gap;
    await sharp({ create: { width: W, height: h + 56, channels: 3, background: '#D9D2C7' } })
      .composite([
        { input: label(`Board · ${c.board}`, colW), left: 0, top: 0 },
        { input: label(`Built · ${c.url} @ ${c.width}px`, colW), left: colW + gap, top: 0 },
        { input: refBuf, left: 0, top: 56 },
        { input: mine, left: colW + gap, top: 56 }
      ])
      .png()
      .toFile(join(out, `${c.name}.png`));
    console.log(`✓ ${c.name}  (board ${rm.width}×${rm.height}, built ${mm.width}×${mm.height})`);
  }
} finally {
  await browser.close();
}
console.log(`Comparisons in ${out}`);
