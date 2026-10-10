import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'recurrsave-browser-'));
const chrome = spawn(chromePath, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let socket;
let sessionId;
let sequence = 0;
let pageLoads = 0;
const pending = new Map();
const browserErrors = [];

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await check()) return;
    await pause(100);
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

function send(method, params = {}, session = sessionId) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 10000);
    pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value); }, reject: (error) => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function click(text) {
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((node) => node.textContent.trim().startsWith(${JSON.stringify(text)})); if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); button.click(); })()`);
}

async function fill(id, value) {
  await evaluate(`(() => { const input = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
}

async function dashboard() { return evaluate("fetch('/api/dashboard').then(response => response.json())"); }

async function reload() {
  const previousLoads = pageLoads;
  await send('Page.reload');
  await waitFor(() => pageLoads > previousLoads, 'page reload');
}

async function screenshot(name, clip) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(clip ? { clip } : {}) });
  const path = join(profile, `${name}.png`);
  writeFileSync(path, Buffer.from(result.data, 'base64'));
  console.log(`Screenshot: ${path}`);
}

async function checkTextContrast() {
  const failures = await evaluate(`(() => {
    const failures = [];
    const channels = colour => colour.match(/[\\d.]+/g).map(Number);
    const luminance = rgb => rgb.slice(0, 3).map(channel => channel / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const background = element => {
      for (let current = element; current; current = current.parentElement) {
        const colour = channels(getComputedStyle(current).backgroundColor);
        if (colour.length === 3 || colour[3] === 1) return colour;
      }
      return [255, 255, 255];
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!node.textContent.trim() || !element || element.closest('.sr-only, [aria-hidden="true"], button:disabled, script, style')) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility === 'hidden') continue;
      const colour = luminance(channels(style.color));
      const base = luminance(background(element));
      const ratio = (Math.max(colour, base) + 0.05) / (Math.min(colour, base) + 0.05);
      const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.667 && parseFloat(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) failures.push({ text: node.textContent.trim().slice(0, 60), ratio: ratio.toFixed(2), colour: style.color });
    }
    return failures;
  })()`);
  assert.deepEqual(failures, [], 'Visible text contrast');
}

try {
  let port;
  await waitFor(() => {
    try { port = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; return Boolean(port); }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }, 'Chrome startup');
  const version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json());
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const handler = pending.get(message.id);
      if (!handler) return;
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text);
    if (message.method === 'Page.loadEventFired') pageLoads++;
  });
  const target = await send('Target.createTarget', { url: 'about:blank' }, null);
  sessionId = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: process.env.APP_URL || 'http://localhost:5173' });
  await waitFor(() => evaluate("Boolean(document.getElementById('income'))"), 'onboarding');
  assert.equal(await evaluate("document.querySelector('.accessibility summary').textContent.trim()"), 'Accessibility');
  await checkTextContrast();
  await screenshot('onboarding-desktop');
  await click('Continue');
  await waitFor(() => evaluate("document.getElementById('income').getAttribute('aria-invalid') === 'true'"), 'income validation');
  assert.equal(await evaluate('document.activeElement.id'), 'income');
  await click('Try an example budget');
  await click('Continue');
  await waitFor(() => evaluate("document.getElementById('step-heading').textContent === 'Your emergency cushion'"), 'step two');
  await reload();
  await waitFor(() => evaluate("document.getElementById('step-heading')?.textContent === 'Your emergency cushion'"), 'saved progress');
  assert.equal(await evaluate("document.getElementById('emergency').value"), '200');
  await click('Continue');
  await waitFor(() => evaluate("document.getElementById('target') !== null"), 'goal step');
  await click('Continue');
  await waitFor(() => evaluate("document.getElementById('step-heading').textContent === 'The bigger picture'"), 'summary step');
  await click('Continue');
  await waitFor(() => evaluate("document.getElementById('initialRule') !== null"), 'weekly engine');
  await click('Start my savings journey');
  await waitFor(() => evaluate("Boolean(document.getElementById('inbox'))"), 'dashboard');
  await checkTextContrast();
  let data = await dashboard();
  assert.equal(data.budget.weekly, 34615);
  await click('Simulate receipt');
  await waitFor(async () => (await dashboard()).entries.length === 1, 'first receipt');
  await waitFor(() => evaluate("document.querySelector('.goal-amount strong').textContent === '£0.01'"), 'goal update');
  await click('Replay last receipt');
  await waitFor(() => evaluate("document.querySelector('.success-box')?.textContent.includes('already processed')"), 'duplicate feedback');
  assert.equal((await dashboard()).entries.length, 1);
  console.log('PASS: five onboarding steps, validation focus, saved progress, receipt saving and duplicate replay.');

  await evaluate("document.querySelectorAll('.rule-row')[1].querySelectorAll('input[type=checkbox]')[1].click()");
  await click('Save rules');
  await waitFor(() => evaluate("document.querySelector('.success-box')?.textContent.includes('rules saved')"), 'rule update');
  assert.equal((await dashboard()).rules.find((rule) => rule.merchant === 'gym').essential, true);
  await evaluate("document.querySelectorAll('.receipt-card')[1].querySelector('button').click()");
  await waitFor(async () => (await dashboard()).entries.length === 2, 'gym receipt');
  await waitFor(() => evaluate("document.querySelector('.goal-amount strong').textContent === '£3.21'"), 'gym saving');
  await evaluate("document.querySelectorAll('.receipt-card')[2].querySelector('button').click()");
  await waitFor(async () => (await dashboard()).entries.length === 3, 'adobe receipt');
  await waitFor(() => evaluate("document.querySelector('.goal-amount strong').textContent === '£3.22'"), 'adobe saving');
  await fill('spending-amount', '12.50');
  await fill('spending-description', 'Lunch with a friend');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*/api/spending'] });
  await click('Record spending');
  await waitFor(() => evaluate("document.querySelector('.error-box')?.textContent.includes('Cannot reach the backend')"), 'recoverable network error');
  assert.equal(await evaluate("document.getElementById('spending-amount').value"), '12.50');
  await send('Network.setBlockedURLs', { urls: [] });
  await click('Record spending');
  await waitFor(async () => (await dashboard()).entries.length === 4, 'spending retry');
  await waitFor(() => evaluate("document.getElementById('spending-amount').value === ''"), 'successful spending form reset');
  console.log('PASS: rule editing, all three sample receipts, manual spending and retry after a blocked backend request.');

  await evaluate("document.querySelector('.accessibility summary').click()");
  await evaluate("document.querySelector('#text-size').value = 'extra'; document.querySelector('#text-size').dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('.accessibility-panel input[type=checkbox]').click();");
  await waitFor(() => evaluate("document.documentElement.dataset.text === 'extra' && document.documentElement.dataset.contrast === 'high'"), 'display preferences');
  await reload();
  await waitFor(() => evaluate("document.documentElement.dataset.text === 'extra' && document.documentElement.dataset.contrast === 'high' && Boolean(document.getElementById('inbox'))"), 'persisted accessibility settings');
  await checkTextContrast();
  for (let index = 0; index < 6 && await evaluate('document.activeElement.className') !== 'skip-link'; index++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
  }
  assert.equal(await evaluate("document.activeElement.className"), 'skip-link');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate('document.activeElement.id'), 'main-content');
  const accessibility = await send('Accessibility.getFullAXTree');
  assert.ok(accessibility.nodes.some((node) => node.role?.value === 'heading' && node.name?.value === 'Your money has a new rhythm.'));
  assert.ok(accessibility.nodes.some((node) => node.name?.value === 'Accessibility' && !node.ignored));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate("getComputedStyle(document.documentElement).scrollBehavior"), 'auto');
  for (const width of [720, 375, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    const size = await evaluate('({ content: document.documentElement.scrollWidth, viewport: innerWidth })');
    assert.ok(size.content <= size.viewport, `Horizontal overflow at ${width}px: ${size.content}`);
    if (width <= 375) {
      const descriptionWidth = await evaluate("document.querySelector('.activity-description').getBoundingClientRect().width");
      assert.ok(descriptionWidth >= 120, `Activity description must remain readable at ${width}px: ${descriptionWidth}`);
    }
  }
  await evaluate("document.querySelector('.accessibility').open = true");
  const bounds = await evaluate("(() => { const rect = document.querySelector('.accessibility-panel').getBoundingClientRect(); return {left: rect.left, right: rect.right, viewport: innerWidth}; })()");
  assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport, 'Settings panel remains on screen at 320 pixels.');
  await evaluate("document.querySelector('.accessibility').open = false");
  await screenshot('dashboard-mobile-accessible');
  const activityClip = await evaluate("(() => { const rect = document.querySelector('.activity-list').closest('.card').getBoundingClientRect(); return { x: 0, y: rect.top + scrollY, width: innerWidth, height: Math.min(rect.height, 900), scale: 1 }; })()");
  await screenshot('activity-mobile-accessible', activityClip);
  console.log('PASS: visible accessibility settings, preference persistence, text contrast, keyboard skip link, accessibility tree, system reduced motion and layout at 720, 375 and 320 pixels with extra large text.');

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('.accessibility summary').click()");
  await click('Restore defaults');
  await evaluate("document.querySelector('.accessibility').open = false");
  for (let day = 0; day < 10; day++) {
    await click('Confirm spending');
    await waitFor(() => evaluate("[...document.querySelectorAll('button')].some(button => button.textContent === 'Day confirmed')"), 'day confirmation');
    if (day < 9) {
      await click('Advance demo');
      await waitFor(() => evaluate("[...document.querySelectorAll('button')].some(button => button.textContent === 'Confirm spending & close day' && !button.disabled)"), 'next demo day');
    }
  }
  data = await dashboard();
  assert.equal(data.streak, 10);
  assert.equal(data.rate, '2.01');
  assert.equal(data.boosts, 1);
  await screenshot('dashboard-desktop');
  assert.deepEqual(browserErrors, []);
  console.log('PASS: ten day streak through UI controls, one boost, no browser runtime exceptions.');
} catch (error) {
  console.error('Browser runtime errors:', browserErrors);
  if (socket?.readyState === WebSocket.OPEN && sessionId) {
    console.error('Page diagnostic:', await evaluate('({ title: document.title, text: document.body.innerText, url: location.href })'));
    await screenshot('failure');
  }
  throw error;
} finally {
  socket?.close();
  chrome.kill();
}
