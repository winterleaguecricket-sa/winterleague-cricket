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

  console.log('=== GPU FIX VERIFICATION TEST ===\n');

  // 1. Load the player registration page
  console.log('1. Loading player registration form...');
  await page.goto('https://winterleaguecricket.co.za/forms/player-registration', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  console.log('   Page loaded successfully\n');

  // 2. Check for GPU-heavy CSS properties
  console.log('2. Checking for GPU compositor killers...');
  const gpuCheck = await page.evaluate(() => {
    const results = {
      backgroundAttachment: [],
      positionFixed: [],
      backdropFilter: [],
      filterBlur: [],
      translateZ: [],
      willChange: [],
      compositingLayers: []
    };

    // Check body background-attachment
    const bodyStyle = getComputedStyle(document.body);
    results.bodyBgAttachment = bodyStyle.backgroundAttachment;
    results.bodyBgImage = bodyStyle.backgroundImage ? 'has-image' : 'none';

    // Walk all elements looking for GPU-heavy properties
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const style = getComputedStyle(el);
      const tag = el.tagName + (el.className ? '.' + el.className.split(' ')[0] : '');

      if (style.backgroundAttachment === 'fixed') {
        results.backgroundAttachment.push(tag);
      }
      if (style.position === 'fixed') {
        results.positionFixed.push(tag);
      }
      if (style.backdropFilter && style.backdropFilter !== 'none') {
        results.backdropFilter.push({ tag, value: style.backdropFilter });
      }
      if (style.filter && style.filter !== 'none' && style.filter.includes('blur')) {
        results.filterBlur.push({ tag, value: style.filter });
      }
      if (style.willChange && style.willChange !== 'auto') {
        results.willChange.push({ tag, value: style.willChange });
      }
      // Check for translateZ in transform
      if (style.transform && style.transform !== 'none' && 
          (style.transform.includes('translateZ') || style.transform.includes('translate3d'))) {
        results.translateZ.push({ tag, value: style.transform });
      }
    }

    // Also check ::before and ::after pseudo-elements via computed style
    // (limited - can only check on elements with them)
    
    return results;
  });

  console.log(`   Body background-attachment: ${gpuCheck.bodyBgAttachment} ${gpuCheck.bodyBgAttachment === 'scroll' ? '✅' : '❌ STILL FIXED!'}`);
  console.log(`   Body background-image: ${gpuCheck.bodyBgImage}`);
  console.log(`   Elements with background-attachment: fixed: ${gpuCheck.backgroundAttachment.length} ${gpuCheck.backgroundAttachment.length === 0 ? '✅' : '❌'}`);
  if (gpuCheck.backgroundAttachment.length > 0) console.log('     ', gpuCheck.backgroundAttachment);
  console.log(`   Elements with position: fixed: ${gpuCheck.positionFixed.length} (should be 0 normally, alert modal excluded)`);
  if (gpuCheck.positionFixed.length > 0) console.log('     ', gpuCheck.positionFixed);
  console.log(`   Elements with backdrop-filter: ${gpuCheck.backdropFilter.length} ${gpuCheck.backdropFilter.length === 0 ? '✅' : '❌'}`);
  if (gpuCheck.backdropFilter.length > 0) console.log('     ', gpuCheck.backdropFilter);
  console.log(`   Elements with filter: blur(): ${gpuCheck.filterBlur.length} ${gpuCheck.filterBlur.length === 0 ? '✅' : '❌'}`);
  if (gpuCheck.filterBlur.length > 0) console.log('     ', gpuCheck.filterBlur);
  console.log(`   Elements with translateZ/translate3d: ${gpuCheck.translateZ.length} ${gpuCheck.translateZ.length === 0 ? '✅' : '❌'}`);
  if (gpuCheck.translateZ.length > 0) console.log('     ', gpuCheck.translateZ);
  console.log(`   Elements with will-change: ${gpuCheck.willChange.length} ${gpuCheck.willChange.length === 0 ? '✅' : '❌'}`);
  if (gpuCheck.willChange.length > 0) console.log('     ', gpuCheck.willChange);
  console.log();

  // 3. Pre-dropdown metrics
  console.log('3. Pre-dropdown metrics...');
  const preMetrics = await page.metrics();
  const preHeap = (preMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
  console.log(`   JS Heap: ${preHeap} MB`);
  console.log(`   DOM Nodes: ${preMetrics.Nodes}`);
  console.log(`   Layout Count: ${preMetrics.LayoutCount}`);
  console.log(`   Recalc Style Count: ${preMetrics.RecalcStyleCount}\n`);

  // 4. Click the team dropdown
  console.log('4. Clicking team dropdown...');
  const dropdownSelector = 'select, [class*="dropdown"], [class*="Dropdown"], [class*="select"], [class*="Select"]';
  
  // Find the team dropdown specifically
  const teamDropdown = await page.evaluate(() => {
    // Look for a clickable element that contains "team" text or is a dropdown for teams
    const allElements = document.querySelectorAll('[class*="dropdown"], [class*="Dropdown"], [class*="select"], [class*="Select"], select');
    for (const el of allElements) {
      const text = el.textContent || el.placeholder || '';
      if (text.toLowerCase().includes('team') || text.toLowerCase().includes('select your')) {
        return {
          found: true,
          tag: el.tagName,
          class: el.className,
          text: text.substring(0, 50),
          id: el.id
        };
      }
    }
    
    // Also check for custom dropdowns with click handlers
    const labels = document.querySelectorAll('label, span, div');
    for (const el of labels) {
      if (el.textContent && el.textContent.toLowerCase().includes('select your team')) {
        return {
          found: true,
          tag: el.tagName,
          class: el.className,
          text: el.textContent.substring(0, 50),
          isLabel: true
        };
      }
    }
    
    return { found: false };
  });

  console.log('   Team dropdown element:', JSON.stringify(teamDropdown, null, 2));

  // Try to find and click the dropdown trigger
  const clicked = await page.evaluate(() => {
    // The custom dropdown in FormDisplay - look for the selectBox class
    const selectBoxes = document.querySelectorAll('[class*="selectBox"], [class*="dropdownTrigger"]');
    for (const el of selectBoxes) {
      if (el.textContent && (el.textContent.includes('team') || el.textContent.includes('Team') || el.textContent.includes('Select'))) {
        el.click();
        return { clicked: true, text: el.textContent.substring(0, 50), class: el.className };
      }
    }
    
    // Fallback: click anything that looks like a custom select for team
    const allDivs = document.querySelectorAll('div[class*="select"], div[class*="Select"]');
    for (const el of allDivs) {
      const parentText = el.closest('[class*="field"], [class*="Field"]')?.textContent || '';
      if (parentText.toLowerCase().includes('team')) {
        el.click();
        return { clicked: true, text: el.textContent.substring(0, 50), class: el.className, method: 'parent-match' };
      }
    }
    
    return { clicked: false };
  });

  console.log('   Click result:', JSON.stringify(clicked, null, 2));

  // Wait a moment for any rendering
  await new Promise(r => setTimeout(r, 500));

  // 5. Post-dropdown metrics
  console.log('\n5. Post-dropdown metrics...');
  const postMetrics = await page.metrics();
  const postHeap = (postMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2);
  console.log(`   JS Heap: ${postHeap} MB (delta: ${(postHeap - preHeap).toFixed(2)} MB)`);
  console.log(`   DOM Nodes: ${postMetrics.Nodes} (delta: ${postMetrics.Nodes - preMetrics.Nodes})`);
  console.log(`   Layout Count: ${postMetrics.LayoutCount} (delta: ${postMetrics.LayoutCount - preMetrics.LayoutCount})`);
  console.log(`   Recalc Style Count: ${postMetrics.RecalcStyleCount} (delta: ${postMetrics.RecalcStyleCount - preMetrics.RecalcStyleCount})\n`);

  // 6. Check if dropdown panel appeared and its properties
  console.log('6. Post-click DOM analysis...');
  const postClickCheck = await page.evaluate(() => {
    const dropdownPanels = document.querySelectorAll('[class*="dropdownPanel"], [class*="DropdownPanel"]');
    const panelInfo = [];
    for (const panel of dropdownPanels) {
      const style = getComputedStyle(panel);
      const items = panel.querySelectorAll('[class*="dropdownItem"]');
      panelInfo.push({
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        position: style.position,
        zIndex: style.zIndex,
        backdropFilter: style.backdropFilter,
        filter: style.filter,
        overflow: style.overflow,
        itemCount: items.length,
        maxHeight: style.maxHeight
      });
    }
    return { panelCount: dropdownPanels.length, panels: panelInfo };
  });

  console.log('   Dropdown panels found:', postClickCheck.panelCount);
  if (postClickCheck.panels.length > 0) {
    for (const p of postClickCheck.panels) {
      console.log(`   Panel: visible=${p.visible}, position=${p.position}, z-index=${p.zIndex}`);
      console.log(`     backdrop-filter=${p.backdropFilter}, filter=${p.filter}`);
      console.log(`     items=${p.itemCount}, maxHeight=${p.maxHeight}, overflow=${p.overflow}`);
    }
  }
  console.log();

  // 7. Check formBackgroundEffect properties
  console.log('7. formBackgroundEffect element check...');
  const bgEffectCheck = await page.evaluate(() => {
    const el = document.querySelector('[class*="formBackgroundEffect"]');
    if (!el) return { found: false };
    const style = getComputedStyle(el);
    return {
      found: true,
      position: style.position,
      opacity: style.opacity,
      zIndex: style.zIndex,
      backgroundImage: style.backgroundImage ? 'has-gradient' : 'none',
      width: style.width,
      height: style.height
    };
  });

  if (bgEffectCheck.found) {
    console.log(`   Position: ${bgEffectCheck.position} ${bgEffectCheck.position !== 'fixed' ? '✅' : '❌ STILL FIXED!'}`);
    console.log(`   Opacity: ${bgEffectCheck.opacity} ${bgEffectCheck.opacity === '1' ? '✅ (pre-multiplied)' : '❌ separate opacity = new layer'}`);
    console.log(`   Z-index: ${bgEffectCheck.zIndex}`);
    console.log(`   Background: ${bgEffectCheck.backgroundImage}`);
  } else {
    console.log('   Element not found (may be expected)');
  }
  console.log();

  // 8. Overall score
  console.log('=== RESULTS SUMMARY ===');
  const issues = [];
  if (gpuCheck.bodyBgAttachment === 'fixed') issues.push('body background-attachment: fixed');
  if (gpuCheck.backgroundAttachment.length > 0) issues.push(`${gpuCheck.backgroundAttachment.length} elements with bg-attachment: fixed`);
  if (gpuCheck.backdropFilter.length > 0) issues.push(`${gpuCheck.backdropFilter.length} elements with backdrop-filter`);
  if (gpuCheck.filterBlur.length > 0) issues.push(`${gpuCheck.filterBlur.length} elements with filter: blur()`);
  if (gpuCheck.translateZ.length > 0) issues.push(`${gpuCheck.translateZ.length} elements with translateZ`);
  if (bgEffectCheck.found && bgEffectCheck.position === 'fixed') issues.push('formBackgroundEffect still position: fixed');
  if (bgEffectCheck.found && bgEffectCheck.opacity !== '1') issues.push('formBackgroundEffect has separate opacity');

  if (issues.length === 0) {
    console.log('🟢 ALL GPU COMPOSITOR FIXES VERIFIED - Zero GPU-heavy properties detected');
    console.log(`   Heap impact of dropdown click: ${(postHeap - preHeap).toFixed(2)} MB`);
    console.log(`   Layout count delta: ${postMetrics.LayoutCount - preMetrics.LayoutCount}`);
  } else {
    console.log('🔴 ISSUES REMAINING:');
    issues.forEach(i => console.log(`   - ${i}`));
  }

  await browser.close();
  console.log('\nTest complete.');
})();
