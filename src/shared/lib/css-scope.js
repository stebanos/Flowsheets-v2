// Prefix each comma-separated selector with the scope attribute selector.
// At-rules (lines starting with @) are passed through unchanged.
// Rules inside at-rule blocks are not prefixed in v1 (known limitation).
export function scopeCSS(css, scopeId) {
    const attr = `[${scopeId}]`;
    let result = '';
    let i = 0;
    let depth = 0;
    let ruleStart = 0;

    while (i < css.length) {
        const ch = css[i];
        if (ch === '{') {
            if (depth === 0) {
                const selector = css.slice(ruleStart, i);
                const trimmed = selector.trim();
                if (trimmed.startsWith('@')) {
                    depth++;
                    i++;
                    while (i < css.length && depth > 0) {
                        if (css[i] === '{') { depth++; }
                        else if (css[i] === '}') { depth--; }
                        i++;
                    }
                    result += css.slice(ruleStart, i);
                    ruleStart = i;
                    continue;
                } else {
                    const prefixed = trimmed
                        .split(',')
                        .map(s => `${s.trim()}${attr}`)
                        .join(', ');
                    result += prefixed + ' {';
                    depth++;
                }
            } else {
                depth++;
                result += ch;
            }
        } else if (ch === '}') {
            depth--;
            result += ch;
            if (depth === 0) {
                ruleStart = i + 1;
            }
        } else if (depth === 0) {
            // whitespace between rules — skip
        } else {
            result += ch;
        }
        i++;
    }
    return result;
}

export function escapeAttr(str) {
    return str.replace(/"/g, '&quot;');
}

export function injectStyle(name, css, scopeId) {
    const scoped = scopeCSS(css, scopeId);
    let el = document.head.querySelector(`style[data-viz-name="${escapeAttr(name)}"]`);
    if (!el) {
        el = document.createElement('style');
        el.setAttribute('data-viz-name', name);
        document.head.appendChild(el);
    }
    el.textContent = scoped;
}
