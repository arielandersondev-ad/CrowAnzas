import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { todayInTimezone } from '../../packages/contracts/dist/index.js';

const api = 'http://127.0.0.1:3102/api';
const screenshots = path.resolve('.tmp/browser-artifacts');

async function noOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
async function capture(page, name) {
  await fs.mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
}
async function darkContrast(page) {
  const contrast = await page.locator('.list-total').evaluate(container => {
    const luminance = color => {
      const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
        const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
      });
      return r * .2126 + g * .7152 + b * .0722;
    };
    const background = luminance(getComputedStyle(container).backgroundColor);
    return [...container.querySelectorAll('span, small, strong')].map(element => {
      const foreground = luminance(getComputedStyle(element).color);
      return (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
    });
  });
  for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
  return contrast;
}
async function register(page, { name, amount, quantity, date, description = '', pendingCheck = false }) {
  await page.getByRole('tab', { name: 'Registrar gasto' }).click();
  await page.getByLabel('Nombre del gasto').fill(name);
  await page.getByLabel('Valor del gasto').fill(amount);
  await page.getByLabel('Cantidad', { exact: false }).fill(String(quantity));
  await page.getByLabel('Fecha del gasto').fill(date);
  await page.getByLabel('Descripción').fill(description);
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  if (pendingCheck) {
    await expect(page.getByRole('button', { name: /Guardando/ })).toBeDisabled();
    await expect(page.locator('#quantity')).toBeDisabled();
    await page.locator('form').evaluate(form => form.requestSubmit());
  }
  await expect(page.locator('.success-feedback')).toContainText(name);
  await expect(page.getByRole('tab', { name: 'Resumen del día' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#summary-date')).toHaveValue(date);
  await expect(page.locator('.expense-list')).toContainText(name);
}

test('real UI: validation, exact costs, calendar filtering, reload, keyboard, responsive and theme', async ({ page, request }, info) => {
  const isApi = info.project.name.startsWith('api');
  const mobile = info.project.name.endsWith('mobile');
  const day = mobile ? '2035-02-13' : '2035-02-12';
  const dayEmpty = mobile ? '1980-02-13' : '1980-02-12';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#date')).toHaveValue(todayInTimezone());
  await expect(page.locator('#quantity')).toHaveValue('1');
  await expect(page.locator('.total-bottom strong')).toHaveText('2');
  await expect(page.locator('.total-value')).toHaveText(isApi ? 'Bs 41,00' : 'Bs 104,50');
  await noOverflow(page);
  await capture(page, `${info.project.name}-form`);

  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#amount')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Nombre del gasto').fill('Valor inválido');
  await page.getByLabel('Valor del gasto').fill('1.001');
  await page.getByLabel('Cantidad', { exact: false }).fill('1.5');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.locator('#amount-error')).toBeVisible();
  await expect(page.locator('#quantity-error')).toBeVisible();
  await page.getByLabel('Valor del gasto').fill('0');
  await page.getByLabel('Cantidad', { exact: false }).fill('0');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.locator('#amount-error')).toBeVisible();
  await expect(page.locator('#quantity-error')).toBeVisible();
  await expect(page.locator('.success-feedback')).toHaveCount(0);

  const first = `Café humo ${info.project.name}`;
  const second = `Pan humo ${info.project.name}`;
  let posts = 0;
  if (isApi) {
    await page.route(`${api}/expenses`, async route => {
      if (route.request().method() === 'POST') {
        posts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await route.continue();
    });
  }
  await register(page, { name: first, amount: '0.10', quantity: 5, date: day, description: 'Descripción opcional con café y pan.', pendingCheck: isApi });
  await expect(page.locator('.total-value')).toHaveText('Bs 0,10');
  await expect(page.locator('.expense-list')).toContainText('5 unidades');
  await expect(page.locator('.expense-list')).toContainText('Descripción opcional con café y pan.');
  await register(page, { name: second, amount: '0.20', quantity: 7, date: day });
  await expect(page.locator('.total-value')).toHaveText('Bs 0,30');
  await expect(page.locator('.total-bottom strong')).toHaveText('2');
  if (isApi) {
    expect(posts).toBe(2);
    const response = await request.get(`${api}/expenses/summary?date=${day}`);
    expect(response.ok()).toBe(true);
    const summary = await response.json();
    expect(summary.total).toBe('0.30'); expect(summary.count).toBe(2);
    expect(summary.expenses.map(e => e.name)).toEqual([second, first]);
    expect(summary.expenses.map(e => e.quantity)).toEqual([7, 5]);
    const list = await (await request.get(`${api}/expenses?date=${day}`)).json();
    expect(list).toEqual(summary.expenses);
    expect((await (await request.get(`${api}/health`)).json()).storage).toBe('memory');
    await expect(page.locator('.mode-notice')).toContainText(/memoria/i);
  }
  await noOverflow(page);
  await capture(page, `${info.project.name}-summary`);

  await page.reload();
  if (isApi) await expect(page.locator('.mode-notice')).toContainText(/memoria/i);
  await page.getByRole('tab', { name: 'Resumen del día' }).click();
  await page.getByLabel('Consultar fecha').fill(day);
  await expect(page.locator('.total-value')).toHaveText('Bs 0,30');
  await expect(page.locator('.expense-list')).toContainText(first);
  await expect(page.locator('.expense-list')).toContainText(second);
  await page.getByLabel('Consultar fecha').fill('');
  await expect(page.locator('.error-state')).toContainText('Selecciona una fecha válida.');
  await expect(page.locator('.total-value')).toHaveText('—');
  await expect(page.locator('.total-bottom strong')).toHaveText('—');
  await expect(page.locator('.expense-list')).toHaveCount(0);
  await capture(page, `${info.project.name}-blank-filter`);
  await page.getByRole('button', { name: 'Volver a hoy' }).click();
  await expect(page.locator('#summary-date')).toHaveValue(todayInTimezone());
  await expect(page.locator('.total-bottom strong')).toHaveText('2');
  await page.getByLabel('Consultar fecha').fill(dayEmpty);
  await expect(page.locator('.empty-state')).toContainText('No hay gastos');
  await expect(page.locator('.total-value')).toHaveText('Bs 0,00');
  await capture(page, `${info.project.name}-empty`);
  await page.getByRole('tab', { name: 'Resumen del día' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Registrar gasto' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Resumen del día' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Resumen del día' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Activar tema oscuro' }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await darkContrast(page);
  await noOverflow(page);
  await capture(page, `${info.project.name}-dark`);
  expect(errors).toEqual([]);
});

test('dark contrast after source refresh', async ({ page }, info) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Resumen del día' }).click();
  await expect(page.locator('.list-total')).toBeVisible();
  await page.getByRole('button', { name: 'Activar tema oscuro' }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  const ratios = await darkContrast(page);
  await noOverflow(page);
  await capture(page, `${info.project.name}-dark`);
  await info.attach('dark-total-contrast', { body: JSON.stringify({ ratios }), contentType: 'application/json' });
});

test('unavailable API visibly errors and never reports a false save', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('api'), 'Only API mode has HTTP outages.');
  await page.route(`${api}/**`, route => route.abort('connectionrefused'));
  await page.goto('/');
  await page.getByRole('tab', { name: 'Resumen del día' }).click();
  await expect(page.locator('.error-state')).toContainText('No pudimos cargar el día');
  await expect(page.locator('.error-state')).toContainText(/conectar|conexión/i);
  await page.getByRole('tab', { name: 'Registrar gasto' }).click();
  await page.getByLabel('Nombre del gasto').fill('No debe guardarse');
  await page.getByLabel('Valor del gasto').fill('10.00');
  await page.getByRole('button', { name: 'Guardar gasto' }).click();
  await expect(page.locator('.error-feedback')).toBeVisible();
  await expect(page.locator('.success-feedback')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('crowanzas.expenses.v1'))).toBeNull();
  await capture(page, `${info.project.name}-unavailable`);
});
