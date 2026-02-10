import puppeteer from 'puppeteer';

const CHROME = '/home/codespace/.cache/puppeteer/chrome/linux-145.0.7632.46/chrome-linux64/chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('=== GPU FIX VERIFICATION - INSIDE FORM ===\n');

  // 1. Load form and click to begin
  console.log('1. Loading player registration form...');
  await page.goto('https://winterleaguecricket.co.za/forms/player-registration', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // Find and click the "Begin Registration" or start button
  console.log('2. Clicking to enter the form...');
  const startClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, a, [role="button"]');
    for (const b of buttons) {
      const text = b.textContent?.toLowerCase() || '';
      if (text.includes('begin') || text.includes('start') || text.includes('register') || text.includes('continue')) {
        b.click();
        return { clicked: true, text: b.textContent.trim().substring(0, 50) };
      }
    }
    return { clicked: false };
  });
  console.log('   Start button:', JSON.stringify(startClicked));
  await new Promise(r => setTimeout(r, 3000)); // wait for form to render & fetch

  // Check if we're now in the actual form
  const formCheck = await page.evaluate(() => {
    const formElements = document.querySelectorAll('[class*="formContainer"], [class*="FormDisplay"], [class*="stepsContainer"]');
    const inputs = document.querySelectorAll('input, select, textarea');
    return {
      formElements: formElements.length,
      inputs: inputs.length,
      pageText: document.body.textContent.substring(0, 200)
    };
  });
  console.log('   Form elements:', formCheck.formElements, 'Inputs:', formCheck.inputs);
  console.log();

  // 3. GPU check inside the form
  console.log('3. GPU property scan (inside form)...');
  const gpuCheck = await page.evaluate(() => {
    const results = {
      backgroundAttachmentFixed: [],
      positionFixed: [],
      backdropFilter: [],
      filterBlur: [],
      translateZ: [],
      willChange: [],
      opacity: [] // elements with separate opacity that create layers
    };

    const bodyStyle = getComputedStyle(document.body);
    results.bodyBgAttachment = bodyStyle.backgroundAttachment;

    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const style = getComputedStyle(el);
      const cls = el.className?.toString()?.split(' ')[0] || el.tagName;
      
      if (style.backgroundAttachment === 'fixed') {
        results.backgroundAttachmentFixed.push(cls);
      }
      if (style.position === 'fixed') {
        results.positionFixed.push(cls);
      }
      if (style.backdropFilter && style.backdropFilter !== 'none') {
        results.backdropFilter.push({ cls, value: style.backdropFilter });
      }
      if (style.filter && style.filter !== 'none' && style.filter.includes('blur')) {
        results.filterBlur.push({ cls, value: style.filter });
      }
      if (style.willChange && style.willChange !== 'auto') {
        results.willChange.push({ cls, value: style.willChange });
      }
      if (style.transform && style.transform !== 'none' && 
          (style.transform.includes('translateZ') || style.transform.includes('translate3d'))) {
        results.translateZ.push({ cls, value: style.transform });
      }
      // Elements with opacity < 1 create compositing layers
      const op = parseFloat(style.opacity);
      if (op < 1 && op > 0) {
        results.opacity.push({ cls, value: style.opacity });
      }
    }

    return results;
  });

  console.log(`   Body bg-attachment: ${gpuCheck.bodyBgAttachment} ${gpuCheck.bodyBgAttachment === 'scroll' ? '✅' : '❌'}`);
  console.log(`   bg-attachment:fixed elements: ${gpuCheck.backgroundAttachmentFixed.length} ${gpuCheck.backgroundAttachmentFixed.length === 0 ? '✅' : '❌'}`);
  console.log(`   position:fixed elements: ${gpuCheck.positionFixed.length}`);
  if (gpuCheck.positionFixed.length > 0) console.log('     ', gpuCheck.positionFixed);
  console.log(`   backdrop-filter elements: ${gpuCheck.backdropFilter.length} ${gpuCheck.backdropFilter.length === 0 ? '✅' : '❌'}`);
  console.log(`   filter:blur elements: ${gpuCheck.filterBlur.length} ${gpuCheck.filterBlur.length === 0 ? '✅' : '❌'}`);
  console.log(`   translateZ elements: ${gpuCheck.translateZ.length} ${gpuCheck.translateZ.length === 0 ? '✅' : '❌'}`);
  console.log(`   will-change elements: ${gpuCheck.willChange.length} ${gpuCheck.willChange.length === 0 ? '✅' : '❌'}`);
  console.log(`   Separate opacity elements (compositing layers): ${gpuCheck.opacity.length}`);
  if (gpuCheck.opacity.length > 0) {
    gpuCheck.opacity.forEach(o => console.log(`     ${o.cls}: opacity=${o.value}`));
  }
  console.log();

  // 4. formBackgroundEffect check
  console.log('4. formBackgroundEffect element...');
  const bgEffect = await page.evaluate(() => {
    const el = document.querySelector('[class*="formBackgroundEffect"]');
    if (!el) return { found: false };
    const style = getComputedStyle(el);
    return {
      found: true,
      position: style.position,
      opacity: style.opacity,
      zIndex: style.zIndex,
      inset: style.inset,
      background: style.backgroundImage?.substring(0, 100)
    };
  });
  if (bgEffect.found) {
    console.log(`   Position: ${bgEffect.position} ${bgEffect.position !== 'fixed' ? '✅' : '❌'}`);
    console.log(`   Opacity: ${bgEffect.opacity} ${bgEffect.opacity === '1' ? '✅' : '⚠️ separate opacity'}`);
    console.log(`   Z-index: ${bgEffect.zIndex}`);
  } else {
    console.log('   Not found (ok on landing page)');
  }
  console.log();

  // 5. Pre-dropdown metrics
  console.log('5. Pre-dropdown metrics...');
  const preMetrics = await page.metrics();
  const preHeap = (preMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
  console.log(`   Heap: ${preHeap} MB, DOM: ${preMetrics.Nodes}, Layouts: ${preMetrics.LayoutCount}`);
  console.log();

  // 6. Find and click the team dropdown
  console.log('6. Finding team dropdown...');
  const dropdownInfo = await page.evaluate(() => {
    // Look for the custom selectBox for team selection
    const allEls = document.querySelectorAll('div, button, span');
    for (const el of allEls) {
      const text = el.textContent?.trim() || '';
      const cls = el.className?.toString() || '';
      // Look for "Select your team" text or selectBox class near team-related content
      if ((text === 'Select your team' || text === '-- Select your team --') && 
          (cls.includes('select') || cls.includes('Select') || cls.includes('dropdown') || cls.includes('Dropdown'))) {
        el.click();
        return { found: true, clicked: true, text, class: cls.substring(0, 80) };
      }
    }
    
    // Try clicking any selectBox
    const selectBoxes = document.querySelectorAll('[class*="selectBox"]');
    for (const el of selectBoxes) {
      const parentField = el.closest('[class*="field"], [class*="Field"], [class*="group"], [class*="Group"]');
      const fieldText = parentField?.textContent || el.textContent || '';
      if (fieldText.toLowerCase().includes('team')) {
        el.click();
        return { found: true, clicked: true, text: el.textContent?.substring(0, 50), class: el.className?.substring(0, 80), method: 'selectBox' };
      }
    }
    
    // Last resort: click the first selectBox
    if (selectBoxes.length > 0) {
      selectBoxes[0].click();
      return { found: true, clicked: true, text: selectBoxes[0].textContent?.substring(0, 50), class: selectBoxes[0].className?.substring(0, 80), method: 'first-selectBox' };
    }
    
    return { found: false, clicked: false, selectBoxCount: selectBoxes.length };
  });
  console.log('   Result:', JSON.stringify(dropdownInfo, null, 2));

  await new Promise(r => setTimeout(r, 1000));

  // 7. Post-dropdown metrics
  console.log('\n7. Post-dropdown metrics...');
  const postMetrics = await page.metrics();
  const postHeap = (postMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
  const heapDelta = (postHeap - preHeap).toFixed(2);
  const layoutDelta = postMetrics.LayoutCount - preMetrics.LayoutCount;
  const styleDelta = postMetrics.RecalcStyleCount - preMetrics.RecalcStyleCount;
  console.log(`   Heap: ${postHeap} MB (delta: ${heapDelta} MB)`);
  console.log(`   DOM: ${postMetrics.Nodes} (delta: ${postMetrics.Nodes - preMetrics.Nodes})`);
  console.log(`   Layouts: ${postMetrics.LayoutCount} (delta: ${layoutDelta})`);
  console.log(`   Style recalcs: ${postMetrics.RecalcStyleCount} (delta: ${styleDelta})`);
  console.log();

  // 8. Check dropdown panel
  console.log('8. Dropdown panel check...');
  const panelCheck = await page.evaluate(() => {
    const panels = document.querySelectorAll('[class*="dropdownPanel"]');
    const visible = [];
    for (const p of panels) {
      const style = getComputedStyle(p);
      if (style.display !== 'none') {
        const items = p.querySelectorAll('[class*="dropdownItem"]');
        // Check items for ::after pseudo-elements with content
        let itemsWithPseudo = 0;
        for (const item of items) {
          const afterStyle = getComputedStyle(item, '::after');
          if (afterStyle.content && afterStyle.content !== 'none' && afterStyle.content !== '""' && afterStyle.content !== "''") {
            itemsWithPseudo++;
          }
        }
        visible.push({
          position: style.position,
          zIndex: style.zIndex,
          backdropFilter: style.backdropFilter,
          filter: style.filter,
          itemCount: items.length,
          itemsWithPseudoAfter: itemsWithPseudo
        });
      }
    }
    return { visibleCount: visible.length, panels: visible };
  });
  console.log('   Visible panels:', panelCheck.visibleCount);
  for (const p of panelCheck.panels) {
    console.log(`   Items: ${p.itemCount}, pseudo-elements: ${p.itemsWithPseudoAfter} ${p.itemsWithPseudoAfter === 0 ? '✅' : '❌'}`);
    console.log(`   backdrop-filter: ${p.backdropFilter} ${p.backdropFilter === 'none' ? '✅' : '❌'}`);
    console.log(`   filter: ${p.filter} ${p.filter === 'none' ? '✅' : '❌'}`);
  }
  console.log();

  // 9. Summary
  console.log('=== FINAL VERDICT ===');
  let issues = 0;
  if (gpuCheck.bodyBgAttachment !== 'scroll') { issues++; console.log('❌ body bg-attachment not scroll'); }
  if (gpuCheck.backgroundAttachmentFixed.length > 0) { issues++; console.log('❌ elements with bg-attachment: fixed'); }
  if (gpuCheck.backdropFilter.length > 0) { issues++; console.log('❌ elements with backdrop-filter'); }
  if (gpuCheck.filterBlur.length > 0) { issues++; console.log('❌ elements with filter:blur'); }
  if (gpuCheck.translateZ.length > 0) { issues++; console.log('❌ elements with translateZ'); }
  if (bgEffect.found && bgEffect.position === 'fixed') { issues++; console.log('❌ formBackgroundEffect still fixed'); }
  if (bgEffect.found && bgEffect.opacity !== '1') { issues++; console.log('❌ formBackgroundEffect has separate opacity'); }
  
  if (issues === 0) {
    console.log('🟢 ALL GPU COMPOSITOR KILLERS ELIMINATED');
    console.log(`   Dropdown click: +${heapDelta} MB heap, +${layoutDelta} layouts, +${styleDelta} style recalcs`);
    console.log('   Safe for user to test');
  } else {
    console.log(`🔴 ${issues} issue(s) remaining`);
  }

  await browser.close();
  console.log('\nDone.');
})();
