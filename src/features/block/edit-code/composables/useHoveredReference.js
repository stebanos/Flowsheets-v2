export function useHoveredReference({ setHovered, clearHovered }) {
    const onMouseOver = (e) => {
        const el = e.target?.closest?.('.cm-block-name');
        if (el) {
            const name = (el.textContent || '').trim();
            if (name) { setHovered(name); }
        }
    };

    const onMouseOut = (e) => {
        const related = e.relatedTarget;
        if (!related || !related.closest?.('.cm-block-name')) { clearHovered(); }
    };

    const onLeave = () => clearHovered();

    const attachHoverHandlers = (editorView) => {
        const rootEl = editorView.value?.dom;
        if (!rootEl || !rootEl.addEventListener) { return; }

        rootEl.addEventListener('mouseover', onMouseOver);
        rootEl.addEventListener('mouseout', onMouseOut);
        rootEl.addEventListener('mouseleave', onLeave);
    };

    const detachHoverHandlers = (editorView) => {
        const rootEl = editorView.value?.dom;
        if (!rootEl) { return; }

        rootEl.removeEventListener('mouseover', onMouseOver);
        rootEl.removeEventListener('mouseout', onMouseOut);
        rootEl.removeEventListener('mouseleave', onLeave);
    };

    return { attachHoverHandlers, detachHoverHandlers };
}
