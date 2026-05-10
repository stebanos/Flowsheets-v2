export async function getHash(source) {
    const canonical = JSON.stringify({
        template: source.template ?? '',
        script: source.script ?? '',
        style: source.style ?? ''
    });
    const encoded = new TextEncoder().encode(canonical);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
