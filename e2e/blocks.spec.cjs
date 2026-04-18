const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    // Seed an empty sheet before page JS runs — prevents the default greeting/message blocks.
    // Only seeds if localStorage has NO sheet data (i.e. first navigation, not mid-test reloads
    // like E9 where the auto-saved blocks must survive the reload).
    await page.addInitScript(() => {
        if (!localStorage.getItem('flowsheets.sheets')) {
            const id = 'e2e-test-sheet';
            localStorage.setItem('flowsheets.activeSheet', id);
            localStorage.setItem('flowsheets.sheets', JSON.stringify({
                [id]: { name: 'Untitled', blocks: [] }
            }));
        }
    });
    await page.goto('');
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Double-click the canvas to create a block at approximately (x, y). */
async function createBlock(page, x = 300, y = 200) {
    const canvas = page.locator('[data-block-grid]');
    await canvas.dblclick({ position: { x, y } });
}

/**
 * Type code into the nth block's CodeMirror editor.
 * Selects all existing content and replaces it.
 */
async function typeCode(page, code, blockIndex = 0) {
    const editor = page.locator('.block-code .cm-content').nth(blockIndex);
    await editor.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.type(code);
}

/** Return the output locator for the nth block. */
function blockOutput(page, blockIndex = 0) {
    return page.locator('.block-output').nth(blockIndex);
}

// ── E1 — Create a block ───────────────────────────────────────────────────────

test('E1 — create a block', async ({ page }) => {
    await createBlock(page);

    await expect(page.locator('.block-name').first()).toBeVisible();
    await expect(page.locator('.block-code-editor').first()).toBeVisible();
    await expect(page.locator('.block-output').first()).toBeVisible();
});

// ── E2 — Edit code and see output ─────────────────────────────────────────────

test('E2 — edit code and see output', async ({ page }) => {
    await createBlock(page);
    await typeCode(page, '1 + 1');

    await expect(blockOutput(page)).toContainText('2');
});

// ── E3 — Block referencing another block ──────────────────────────────────────

test('E3 — block referencing another block', async ({ page }) => {
    await createBlock(page, 150, 150);
    await createBlock(page, 450, 150);

    await typeCode(page, '10', 0);

    const name = (await page.locator('[data-block-name]').nth(0).textContent()).trim();
    await typeCode(page, `${name} * 2`, 1);

    await expect(blockOutput(page, 1)).toContainText('20');

    await typeCode(page, '5', 0);
    await expect(blockOutput(page, 1)).toContainText('10');
});

// ── E4 — Rename a block, references update ────────────────────────────────────

test('E4 — rename a block, references update', async ({ page }) => {
    await createBlock(page, 150, 150);
    await createBlock(page, 450, 150);

    await typeCode(page, '10', 0);
    const name = (await page.locator('[data-block-name]').nth(0).textContent()).trim();

    await typeCode(page, `${name} + 1`, 1);
    await expect(blockOutput(page, 1)).toContainText('11');

    // Wait for the 750ms identifiersByBlock debounce before renaming —
    // renameReferences reads identifiersByBlock to find which blocks reference the old name.
    await page.waitForTimeout(1000);

    // Rename first block to 'x'
    await page.locator('[data-block-name]').nth(0).dblclick();
    const nameInput = page.locator('.block-name-edit').first();
    await nameInput.fill('x');
    await nameInput.press('Enter');

    // Second block's code should now reference 'x'
    await expect(page.locator('.block-code .cm-content').nth(1)).toContainText('x + 1');
    await expect(blockOutput(page, 1)).toContainText('11');
});

// ── E5 — Drag a block ─────────────────────────────────────────────────────────

test('E5 — drag a block to a new position', async ({ page }) => {
    await createBlock(page, 300, 200);

    const blockEl = page.locator('[data-block]').first();
    const before = await blockEl.boundingBox();

    const header = page.locator('.block-header').first();
    await header.hover();
    await page.mouse.down();
    await page.mouse.move(500, 350, { steps: 10 });
    await page.mouse.up();

    const after = await blockEl.boundingBox();
    expect(after.x).not.toBe(before.x);
    expect(after.y).not.toBe(before.y);
});

// ── E6 — Resize a block ───────────────────────────────────────────────────────

test('E6 — resize a block', async ({ page }) => {
    await createBlock(page, 300, 200);

    const blockEl = page.locator('[data-block]').first();
    const before = await blockEl.boundingBox();

    const handle = page.locator('.block-handle').first();
    const handleBox = await handle.boundingBox();

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 120, handleBox.y + 48, { steps: 10 });
    await page.mouse.up();

    const after = await blockEl.boundingBox();
    expect(after.width).toBeGreaterThan(before.width);
});

// ── E7 — Circular dependency shows error ──────────────────────────────────────

test('E7 — circular dependency shows error', async ({ page }) => {
    await createBlock(page, 150, 150);
    await createBlock(page, 450, 150);

    const nameA = (await page.locator('[data-block-name]').nth(0).textContent()).trim();
    const nameB = (await page.locator('[data-block-name]').nth(1).textContent()).trim();

    await typeCode(page, nameB, 0);
    await typeCode(page, nameA, 1);

    // Error message is "Circular dependency: a → b → a"
    await expect(blockOutput(page, 0)).toContainText('Circular');
    await expect(blockOutput(page, 1)).toContainText('Circular');
});

// ── E8 — Delete a block ───────────────────────────────────────────────────────

test('E8 — delete a block via header trash button', async ({ page }) => {
    await createBlock(page, 300, 200);
    await expect(page.locator('.block-output')).toHaveCount(1);

    // Hover to reveal the inline header icons, then click the trash button.
    await page.locator('.block-header').first().hover();
    await page.getByTitle('Delete block').first().click();

    await expect(page.locator('.block-output')).toHaveCount(0);
});

// ── E9 — Page reload persists blocks ──────────────────────────────────────────

test('E9 — page reload persists blocks', async ({ page }) => {
    await createBlock(page, 150, 150);
    await createBlock(page, 450, 150);

    await typeCode(page, '42', 0);
    await typeCode(page, '99', 1);

    const nameA = (await page.locator('[data-block-name]').nth(0).textContent()).trim();
    const nameB = (await page.locator('[data-block-name]').nth(1).textContent()).trim();

    // Wait for the 500ms debounced auto-save to flush
    await page.waitForTimeout(700);
    await page.reload();

    await expect(page.locator('[data-block-name]')).toHaveCount(2);

    const namesAfter = await page.locator('[data-block-name]').allTextContents();
    expect(namesAfter.map(n => n.trim())).toContain(nameA);
    expect(namesAfter.map(n => n.trim())).toContain(nameB);
});

// ── E10 — Extract selection to new block ──────────────────────────────────────

test('E10 — extract selection to new block', async ({ page }) => {
    await createBlock(page, 300, 200);
    await typeCode(page, '(10 + 5) * 2');

    // Place cursor at document start, then move past '(' and select '10 + 5' (6 chars).
    const editor = page.locator('.block-code .cm-content').first();
    await editor.click();
    await page.keyboard.press('Meta+A');   // select all → cursor collapses to end
    await page.keyboard.press('ArrowLeft'); // collapse to document start
    await page.keyboard.press('ArrowRight'); // skip '('
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Shift+ArrowRight'); // select '10 + 5'
    }

    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+Shift+X' : 'Control+Shift+X');

    // Extraction creates a second block
    await expect(page.locator('.block-output')).toHaveCount(2);
});

// ── E11 — Undo delete restores the block ─────────────────────────────────────

test('E11 — undo delete restores the block', async ({ page }) => {
    await createBlock(page, 300, 200);
    const name = (await page.locator('[data-block-name]').first().textContent()).trim();

    await page.locator('.block-header').first().hover();
    await page.getByTitle('Delete block').first().click();

    // Block gone, undo toast visible
    await expect(page.locator('.block-output')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();

    await page.getByRole('button', { name: 'Undo' }).click();

    // Block is back
    await expect(page.locator('.block-output')).toHaveCount(1);
    await expect(page.locator('[data-block-name]').first()).toContainText(name);
});

// ── E12 — Rename sheet via tab double-click ───────────────────────────────────

test('E12 — rename sheet via tab double-click', async ({ page }) => {
    await page.locator('[data-sheet-tab]').first().dblclick();

    const input = page.locator('[data-sheet-tab] input').first();
    await input.fill('My Sheet');
    await input.press('Enter');

    await expect(page.locator('[data-sheet-tab]').first()).toContainText('My Sheet');
    await expect(page.locator('[data-sheet-name]')).toContainText('My Sheet');
});

// ── E13 — Rename sheet via sidebar double-click ───────────────────────────────

test('E13 — rename sheet via sidebar double-click', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle sheets sidebar' }).click();
    await page.locator('[data-sidebar-sheet]').first().dblclick();

    const input = page.locator('[data-sidebar-sheet] input').first();
    await input.fill('Sidebar Rename');
    await input.press('Enter');

    await expect(page.locator('[data-sidebar-sheet]').first()).toContainText('Sidebar Rename');
    await expect(page.locator('[data-sheet-name]')).toContainText('Sidebar Rename');
});

// ── E14 — Runtime error shows in output ──────────────────────────────────────

test('E14 — runtime error shows in output', async ({ page }) => {
    await createBlock(page);
    await typeCode(page, 'undeclaredVariable');

    await expect(blockOutput(page)).toContainText('not defined');
});

// ── E15 — Array output renders as list ───────────────────────────────────────

test('E15 — array output renders as list', async ({ page }) => {
    await createBlock(page);
    await typeCode(page, '[1, 2, 3]');

    const output = blockOutput(page);
    await expect(output).toContainText('1');
    await expect(output).toContainText('2');
    await expect(output).toContainText('3');
    // Each item is a separate row
    await expect(output.locator('div').filter({ hasText: /^1$/ })).toBeVisible();
    await expect(output.locator('div').filter({ hasText: /^2$/ })).toBeVisible();
    await expect(output.locator('div').filter({ hasText: /^3$/ })).toBeVisible();
});

// ── E16 — Create a new sheet via sidebar ─────────────────────────────────────

test('E16 — create a new sheet via sidebar', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle sheets sidebar' }).click();

    await page.getByRole('button', { name: 'New sheet' }).click();

    const input = page.locator('input[class*="ring-blue"]:visible').first();
    await input.fill('Second Sheet');
    await input.press('Enter');

    await expect(page.locator('[data-sidebar-sheet]')).toHaveCount(2);
    await expect(page.locator('[data-sidebar-sheet]').last()).toContainText('Second Sheet');
});

// ── E17 — Switch between sheets ───────────────────────────────────────────────

test('E17 — switch between sheets isolates blocks', async ({ page }) => {
    // Add a block to the first (seeded) sheet
    await createBlock(page, 300, 200);
    await typeCode(page, '42');
    await expect(blockOutput(page)).toContainText('42');

    // Wait for the debounced auto-save before switching sheets
    await page.waitForTimeout(700);

    // Create a second sheet
    await page.getByRole('button', { name: 'Toggle sheets sidebar' }).click();
    await page.getByRole('button', { name: 'New sheet' }).click();
    const input = page.locator('input[class*="ring-blue"]:visible').first();
    await input.press('Enter');

    // Second sheet is now active — should have no blocks
    await expect(page.locator('[data-block]')).toHaveCount(0);

    // Switch back to the first sheet
    await page.locator('[data-sidebar-sheet]').first().click();

    await expect(page.locator('[data-block]')).toHaveCount(1);
    await expect(blockOutput(page)).toContainText('42');
});

// ── E18 — Inputs panel shows referenced block names ──────────────────────────

test('E18 — inputs panel shows referenced block names', async ({ page }) => {
    await createBlock(page, 150, 150);
    await createBlock(page, 450, 150);

    await typeCode(page, '10', 0);
    const nameA = (await page.locator('[data-block-name]').nth(0).textContent()).trim();

    await typeCode(page, `${nameA} * 2`, 1);
    await expect(blockOutput(page, 1)).toContainText('20');

    // Inputs button only appears on the block that has a dependency (block 1)
    await page.locator('.block-header').nth(1).hover();
    await page.getByTitle('Inputs').click();

    // Panel shows the referenced block's name
    await expect(page.locator('.inputs-panel')).toBeVisible();
    await expect(page.locator('.inputs-panel')).toContainText(nameA);
});

// ── E19 — Viz selector switches visualization type ────────────────────────────

test('E19 — viz selector switches to JSON', async ({ page }) => {
    await createBlock(page);
    await typeCode(page, '({ a: 1, b: 2 })');

    // Toggle the viz bar, then open the viz popup and switch to JSON
    await page.locator('.block-header').first().hover();
    await page.getByTitle('Visualization').click();
    // The viz bar shows a label button in the output area — click it to open the popup
    await page.locator('.block-output button').first().click();
    await page.getByRole('menuitem', { name: 'JSON' }).click();

    // JSON viz renders a <pre> with formatted output
    await expect(page.locator('.block-output pre')).toBeVisible();
    await expect(page.locator('.block-output pre')).toContainText('"a": 1');
    await expect(page.locator('.block-output pre')).toContainText('"b": 2');
});
