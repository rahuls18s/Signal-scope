import { expect, test, type Page } from '@playwright/test';
async function openSignalScope(page:Page){await page.goto('/');await page.getByRole('button',{name:/Open SignalScope|Explore SignalScope/}).first().click();await expect(page.getByRole('heading',{name:'Dependency graph'})).toBeVisible();}
test('presents the portfolio and hands off to the live project',async({page})=>{
  await page.goto('/');await expect(page).toHaveTitle(/Rahul S/);await expect(page.getByRole('heading',{name:/I build interfaces/})).toBeVisible();
  await page.locator('#work').scrollIntoViewIfNeeded();await expect(page.getByRole('heading',{name:/Reactive state/})).toBeVisible();
  await page.getByRole('button',{name:/Launch live build/}).click();await expect(page.getByRole('heading',{name:'Dependency graph'})).toBeVisible();
  await page.getByRole('button',{name:/Return to Rahul portfolio/}).click();await expect(page.getByRole('heading',{name:/I build interfaces/})).toBeVisible();
});
test('keeps the animated portfolio usable on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.locator('.media-orb')).toBeVisible();
  for(const id of ['work','craft','about']){await page.locator(`#${id}`).scrollIntoViewIfNeeded();await expect(page.locator(`#${id}`)).toBeVisible();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});
test('runs the cart demo and updates the reactive timeline', async ({page}) => {
  await openSignalScope(page);
  const events=page.locator('.event'); const before=await events.count(); await page.getByRole('button',{name:/Run demo/}).click();
  await expect.poll(()=>events.count(),{timeout:5000}).toBeGreaterThan(before); await expect(page.getByText('cartTotal()').first()).toBeVisible();
});
test('visualizes the debounced RxJS search pipeline', async ({page}) => {
  await openSignalScope(page); await page.getByRole('button',{name:'RxJS lab'}).click(); await page.getByRole('button',{name:'Load search scenario'}).click();
  await page.getByPlaceholder('Try “angular”').fill('angular'); await expect(page.getByText('angular signals')).toBeVisible({timeout:3000});
});
test('opens the performance monitor', async ({page}) => { await openSignalScope(page); await page.getByRole('button',{name:'Performance'}).click(); await expect(page.getByRole('heading',{name:'Performance monitor'})).toBeVisible(); await expect(page.getByText('No dependency cycles')).toBeVisible(); });
test('runs large-dataset analysis in a worker', async ({page}) => {
  await openSignalScope(page); await page.getByLabel('Select demo scenario').selectOption('dataset');
  await expect(page.getByText('filteredCount()').first()).toBeVisible();
  await expect(page.getByText(/durationMs/).first()).toBeVisible({timeout:3000});
});
test('creates and edits a custom playground signal',async({page})=>{
  await openSignalScope(page);await page.getByRole('button',{name:'Create a writable signal'}).click();
  await page.getByLabel('Signal name').fill('interviewScore');await page.getByLabel('Initial signal value').fill('88');await page.getByRole('button',{name:'Create signal'}).click();
  await expect(page.getByRole('heading',{name:'interviewScore()'})).toBeVisible();await page.getByLabel('Set value').fill('95');await page.getByRole('button',{name:'Apply value'}).click();
  await expect(page.locator('.value-block strong')).toHaveText('95');
});
test('exports and imports a complete session',async({page})=>{
  await openSignalScope(page);const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON'}).click();const download=await downloadPromise;const path=await download.path();expect(path).toBeTruthy();
  await page.locator('#session-import').setInputFiles(path!);await expect(page.getByRole('button',{name:/Imported · Exported cart session/})).toBeVisible();
});
