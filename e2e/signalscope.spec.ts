import { expect, test } from '@playwright/test';
test('runs the cart demo and updates the reactive timeline', async ({page}) => {
  await page.goto('/'); await expect(page).toHaveTitle(/SignalScope/); await expect(page.getByRole('heading',{name:'Dependency graph'})).toBeVisible();
  const events=page.locator('.event'); const before=await events.count(); await page.getByRole('button',{name:/Run demo/}).click();
  await expect.poll(()=>events.count(),{timeout:5000}).toBeGreaterThan(before); await expect(page.getByText('cartTotal()').first()).toBeVisible();
});
test('visualizes the debounced RxJS search pipeline', async ({page}) => {
  await page.goto('/'); await page.getByRole('button',{name:'RxJS lab'}).click(); await page.getByRole('button',{name:'Load search scenario'}).click();
  await page.getByPlaceholder('Try “angular”').fill('angular'); await expect(page.getByText('angular signals')).toBeVisible({timeout:3000});
});
test('opens the performance monitor', async ({page}) => { await page.goto('/'); await page.getByRole('button',{name:'Performance'}).click(); await expect(page.getByRole('heading',{name:'Performance monitor'})).toBeVisible(); await expect(page.getByText('No dependency cycles')).toBeVisible(); });
test('runs large-dataset analysis in a worker', async ({page}) => {
  await page.goto('/'); await page.getByLabel('Select demo scenario').selectOption('dataset');
  await expect(page.getByText('filteredCount()').first()).toBeVisible();
  await expect(page.getByText(/durationMs/).first()).toBeVisible({timeout:3000});
});
test('creates and edits a custom playground signal',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Create a writable signal'}).click();
  await page.getByLabel('Signal name').fill('interviewScore');await page.getByLabel('Initial signal value').fill('88');await page.getByRole('button',{name:'Create signal'}).click();
  await expect(page.getByRole('heading',{name:'interviewScore()'})).toBeVisible();await page.getByLabel('Set value').fill('95');await page.getByRole('button',{name:'Apply value'}).click();
  await expect(page.locator('.value-block strong')).toHaveText('95');
});
test('exports and imports a complete session',async({page})=>{
  await page.goto('/');const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON'}).click();const download=await downloadPromise;const path=await download.path();expect(path).toBeTruthy();
  await page.locator('#session-import').setInputFiles(path!);await expect(page.getByRole('button',{name:/Imported · Exported cart session/})).toBeVisible();
});
