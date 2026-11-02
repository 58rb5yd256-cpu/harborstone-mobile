// Shared Playwright helpers for the Harborstone Mobile test suite (localhost OTP simulation mode).
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8000';
async function newPage(opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: opts.w || 393, height: opts.h || 852 }, deviceScaleFactor: 2, acceptDownloads: true });
  const page = await ctx.newPage(); page.errors = [];
  page.on('pageerror', (e) => page.errors.push('PAGEERR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) page.errors.push('CONSOLE ' + m.text()); });
  return { browser, ctx, page };
}
async function login(page, email = 'demo@example.com') {
  await page.goto(BASE + '/'); await page.waitForSelector('form[data-form=login]');
  await page.fill('#f_email', email); await page.fill('#f_password', 'password123'); await page.click('form[data-form=login] button[type=submit]');
  await page.waitForSelector('#otpBoxes'); const code = (await page.textContent('.devcode')).trim();
  for (let i = 0; i < 6; i++) await page.fill(`#otpBoxes input[data-i="${i}"]`, code[i]);
  await page.waitForFunction(() => location.hash === '#/home', null, { timeout: 8000 }); await page.waitForTimeout(300);
}
const go = async (page, hash, wait = 150) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(wait); };
const text = (page) => page.evaluate(() => document.getElementById('view').innerText);
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hm_state_v1')));
module.exports = { BASE, newPage, login, go, text, state };
