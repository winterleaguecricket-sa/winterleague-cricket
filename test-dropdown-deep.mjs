import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-gpu-rasterization',
      '--enable-features=VaapiVideoDecoder',
      '--ignore-gpu-blocklist'
    ]
  });
  const page = await browser.newPage();
  const client = await page.createCDPSession();

  // Enable detailed performance monitoring
  await client.send('Performance.enable');

  // Track ALL network requests with full sizes
  const networkLog = [];
  page.on('response', async (res) => {
    try {
      const url = res.url();
      const status = res.status();
      const headers = res.headers();
      const contentLength = headers['content-length'] ? parseInt(headers['content-length']) : null;
      
      // Try to get actual body size for API calls
      let bodySize = contentLength;
      if (url.includes('/api/') || url.includes('/_next/')) {
        try {
          const buffer = await res.buffer();
          bodySize = buffer.length;
        } catch (e) {}
      }
      
      networkLog.push({
        url: url.length > 100 ? url.substring(0, 100) : url,
        status,
        size: bodySize,
        type: headers['content-type']?.split(';')[0] || 'unknown'
      });
    } catch (e) {}
  });

  console.log('=== Loading page ===');
  await page.goto('https://winterleaguecricket.co.za/forms/player-registration', {
    waitUntil: 'networkidle0',
    timeout: 60000
  });
  
  // Click landing page
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent.includes('Register')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Fill step 1
  const fill = async (sel, val) => {
    const el = await page.$(sel);
    if (el) { await el.click({clickCount:3}); await el.type(val); }
  };
  await fill('input[placeholder*="parent full name"]', 'John Smith');
  await fill('input[type="email"]', 'test@test.com');
  await fill('input[type="password"]', 'Test12345!');
  const tels = await page.$$('input[type="tel"]');
  if (tels[0]) { await tels[0].click({clickCount:3}); await tels[0].type('0821234567'); }

  // Next
  await page.evaluate(() => {
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent.includes('Next')) b.click();
    });
  });
  await new Promise(r => setTimeout(r, 3000));

  // Check what's on step 2 before clicking
  const step2Info = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*').length;
    const inlineStyles = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.style.cssText && el.style.cssText.length > 0) {
        const s = el.style.cssText;
        // Count inline styles that create GPU layers
        if (s.includes('transform') || s.includes('animation') || s.includes('will-change') || s.includes('filter') || s.includes('backdrop')) {
          inlineStyles.push({
            tag: el.tagName,
            cls: el.className?.toString().substring(0, 40),
            style: s.substring(0, 100)
          });
        }
      }
    });
    
    // Check all CSS animations running
    const animations = document.getAnimations ? document.getAnimations().length : 'N/A';
    
    return { allElements, inlineStyles, animations };
  });
  
  console.log(`\n=== Step 2 State ===`);
  console.log(`Total elements: ${step2Info.allElements}`);
  console.log(`Running animations: ${step2Info.animations}`);
  console.log(`GPU inline styles: ${step2Info.inlineStyles.length}`);
  step2Info.inlineStyles.forEach(s => console.log(`  ${s.tag}.${s.cls} => ${s.style}`));

  // Reset network log for the dropdown click
  networkLog.length = 0;

  // Start CPU profiling
  await client.send('Profiler.enable');
  await client.send('Profiler.start');

  // Take memory snapshot BEFORE
  const memBefore = await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedJSHeap: performance.memory.usedJSHeapSize,
        totalJSHeap: performance.memory.totalJSHeapSize
      };
    }
    return null;
  });
  const metricsBefore = await page.metrics();

  console.log(`\n=== CLICKING TEAM DROPDOWN ===`);
  console.log(`Before: Heap=${(metricsBefore.JSHeapUsedSize/1024/1024).toFixed(2)}MB, DOM=${metricsBefore.Nodes}, Layouts=${metricsBefore.LayoutCount}`);
  
  const clickStart = Date.now();

  // Click the dropdown
  await page.evaluate(() => {
    const btn = document.querySelector('[class*="dropdownButton"]');
    if (btn) {
      console.log('DROPDOWN CLICK: button found, clicking...');
      btn.click();
    } else {
      console.log('DROPDOWN CLICK: button NOT found!');
    }
  });

  // Measure at very short intervals
  for (let i = 0; i < 10; i++) {
    const delay = i < 5 ? 200 : 500;
    await new Promise(r => setTimeout(r, delay));
    const m = await page.metrics();
    const elapsed = Date.now() - clickStart;
    console.log(`  +${elapsed}ms: Heap=${(m.JSHeapUsedSize/1024/1024).toFixed(2)}MB DOM=${m.Nodes} Layouts=${m.LayoutCount} Recalcs=${m.RecalcStyleCount}`);
  }

  // Stop profiling
  const profile = await client.send('Profiler.stop');
  const metricsAfter = await page.metrics();

  console.log(`\nAfter: Heap=${(metricsAfter.JSHeapUsedSize/1024/1024).toFixed(2)}MB, DOM=${metricsAfter.Nodes}, Layouts=${metricsAfter.LayoutCount}`);

  // Analyze CPU profile
  const nodes = profile.profile.nodes;
  const samples = profile.profile.samples || [];
  const timeDeltas = profile.profile.timeDeltas || [];
  const funcTime = {};
  let totalCPU = 0;
  for (let i = 0; i < samples.length; i++) {
    const nodeId = samples[i];
    const delta = timeDeltas[i] || 0;
    totalCPU += delta;
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.callFrame) {
      const name = node.callFrame.functionName || '(anonymous)';
      const url = node.callFrame.url || '';
      const file = url.split('/').pop() || 'native';
      const key = `${name} [${file}]`;
      funcTime[key] = (funcTime[key] || 0) + delta;
    }
  }
  const sorted = Object.entries(funcTime).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(`\n--- CPU Profile (total ${(totalCPU/1000).toFixed(0)}ms) ---`);
  sorted.forEach(([fn, time]) => {
    if (time > 100) console.log(`  ${(time/1000).toFixed(1)}ms - ${fn}`);
  });

  // Check what network happened during dropdown click
  if (networkLog.length > 0) {
    console.log(`\n--- Network during dropdown click (${networkLog.length} requests) ---`);
    let totalNet = 0;
    networkLog.forEach(r => {
      totalNet += r.size || 0;
      console.log(`  ${r.status} ${r.url} (${r.size ? (r.size/1024).toFixed(1)+'KB' : '?'})`);
    });
    console.log(`  Total network: ${(totalNet/1024).toFixed(1)} KB`);
  } else {
    console.log('\n--- No network requests during dropdown click ---');
  }

  // Check DOM right after dropdown opens
  const dropdownDOM = await page.evaluate(() => {
    const panel = document.querySelector('[class*="dropdownPanel"]');
    if (!panel) return { found: false };
    
    const items = panel.querySelectorAll('[class*="dropdownItem"]');
    const allChildren = panel.querySelectorAll('*').length;
    
    // Check for any fixed/absolute/sticky positioning that forces compositing
    const absoluteElements = [];
    panel.querySelectorAll('*').forEach(el => {
      const s = getComputedStyle(el);
      if (s.position === 'fixed' || s.position === 'sticky') {
        absoluteElements.push(`${el.tagName}.${el.className?.toString().substring(0, 30)} pos=${s.position}`);
      }
    });
    
    // Check the panel itself
    const panelStyle = getComputedStyle(panel);
    return {
      found: true,
      items: items.length,
      children: allChildren,
      panelPosition: panelStyle.position,
      panelZIndex: panelStyle.zIndex,
      panelOverflow: panelStyle.overflow,
      panelTransform: panelStyle.transform,
      panelFilter: panelStyle.filter,
      panelBackdropFilter: panelStyle.backdropFilter,
      absoluteElements
    };
  });

  console.log(`\n--- Dropdown Panel DOM ---`);
  console.log(JSON.stringify(dropdownDOM, null, 2));

  // Check the PARENT containers for any GPU-heavy effects
  const parentChain = await page.evaluate(() => {
    const panel = document.querySelector('[class*="dropdownPanel"]');
    if (!panel) return [];
    
    const chain = [];
    let el = panel.parentElement;
    let depth = 0;
    while (el && depth < 10) {
      const s = getComputedStyle(el);
      const info = {
        tag: el.tagName,
        className: el.className?.toString().substring(0, 60),
        position: s.position,
        overflow: s.overflow,
        transform: s.transform !== 'none' ? s.transform : null,
        filter: s.filter !== 'none' ? s.filter : null,
        backdropFilter: s.backdropFilter !== 'none' ? s.backdropFilter : null,
        willChange: s.willChange !== 'auto' ? s.willChange : null,
        zIndex: s.zIndex !== 'auto' ? s.zIndex : null,
        opacity: s.opacity !== '1' ? s.opacity : null,
        boxShadow: s.boxShadow !== 'none' ? s.boxShadow.substring(0, 60) : null,
        size: `${el.scrollWidth}x${el.scrollHeight}`
      };
      // only include if has something interesting
      if (info.transform || info.filter || info.backdropFilter || info.willChange || info.opacity || info.zIndex) {
        chain.push(info);
      }
      el = el.parentElement;
      depth++;
    }
    return chain;
  });

  if (parentChain.length > 0) {
    console.log(`\n--- Parent chain GPU effects ---`);
    parentChain.forEach(p => console.log(`  ${p.tag}.${p.className} => ${JSON.stringify(p)}`));
  }

  // Screenshot
  await page.screenshot({ path: '/tmp/dropdown-open.png', fullPage: false });
  console.log('\nScreenshot: /tmp/dropdown-open.png');

  await browser.close();
  console.log('\nDone!');
})();
