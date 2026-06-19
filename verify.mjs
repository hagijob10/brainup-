import { chromium, devices } from 'playwright';

const errors = [];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

async function toMain() { await page.evaluate(() => window.goTo('main')); await page.waitForTimeout(300); }
async function shot(name) { await page.waitForTimeout(350); await page.screenshot({ path: 'shots/' + name + '.png' }); }

await page.goto('http://localhost:8125', { waitUntil: 'networkidle' });
await page.waitForSelector('text=BrainUp');
console.log('CARDS_ON_MAIN:', await page.locator('.game-card').count());
await shot('00-main');

// ---------- Regression: original 7 games still openable ----------
const origScreens = ['screen-schulte','screen-reverse','screen-stroop','screen-simon','screen-math','screen-diff','screen-reaction'];
for (let i = 0; i < 7; i++) {
  await page.locator('.game-card').nth(i).click();
  if (await page.locator('#screen-levels.active').count()) await page.locator('.level-card').nth(0).click();
  await page.waitForSelector('#' + origScreens[i] + '.active', { timeout: 5000 });
  console.log('REGRESSION OK:', origScreens[i]);
  await page.locator('.screen.active .back-btn').click();
  await page.waitForSelector('#screen-main.active', { timeout: 5000 });
}

// ---------- GAME 8: Memory Match ----------
await page.locator('.game-card').nth(7).click();
await page.waitForSelector('#screen-levels.active');
await page.locator('.level-card').nth(0).click(); // novice 4x4
await page.waitForSelector('#screen-memory.active');
await shot('08-memory');
const symbols = await page.evaluate(() => window.__BRAINUP_DEBUG__.memoryCards());
const bySymbol = {};
symbols.forEach((s, i) => { (bySymbol[s] = bySymbol[s] || []).push(i); });
for (const sym in bySymbol) {
  const [a, b] = bySymbol[sym];
  await page.locator('.memory-card').nth(a).click();
  await page.locator('.memory-card').nth(b).click();
  await page.waitForTimeout(150);
}
await page.waitForSelector('#screen-result.active', { timeout: 5000 });
await shot('08b-memory-result');
console.log('MEMORY_SCORE:', await page.locator('#result-score').textContent(), '|', await page.locator('#result-label').textContent());
await toMain();

// ---------- GAME 9: Remember Positions ----------
await page.locator('.game-card').nth(8).click();
await page.waitForSelector('#screen-levels.active');
await page.locator('.level-card').nth(0).click(); // novice
await page.waitForSelector('#screen-positions.active');
await shot('09-positions');
for (let round = 1; round <= 10; round++) {
  await page.waitForFunction(() => document.getElementById('positions-status').textContent.includes('Тапни'), null, { timeout: 5000 });
  const dots = await page.evaluate(() => window.__BRAINUP_DEBUG__.positionsDots());
  for (const idx of dots) await page.locator('.positions-cell').nth(idx).click();
  await page.waitForTimeout(750);
}
await page.waitForSelector('#screen-result.active', { timeout: 5000 });
await shot('09b-positions-result');
console.log('POSITIONS_SCORE:', await page.locator('#result-score').textContent());
await toMain();

// ---------- GAME 10: N-back ----------
await page.locator('.game-card').nth(9).click();
await page.waitForSelector('#screen-levels.active');
await page.locator('.level-card').nth(0).click(); // 1-back
await page.waitForSelector('#screen-nback.active');
await shot('10-nback');
for (let trial = 0; trial < 20; trial++) {
  const { seq, n } = await page.evaluate(() => ({ seq: window.__BRAINUP_DEBUG__.nbackSeq(), n: window.__BRAINUP_DEBUG__.nbackN() }));
  const correct = trial < n ? false : seq[trial] === seq[trial-n];
  await page.locator(correct ? '#nback-btn-yes' : '#nback-btn-no').click();
  await page.waitForTimeout(650);
}
await page.waitForSelector('#screen-result.active', { timeout: 5000 });
await shot('10b-nback-result');
console.log('NBACK_SCORE:', await page.locator('#result-score').textContent(), '|', await page.locator('#result-label').textContent());
await toMain();

console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
await browser.close();
