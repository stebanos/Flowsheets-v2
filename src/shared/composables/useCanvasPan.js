import { ref } from 'vue';

const AXIS_LOCK_THRESHOLD = 5;

const panX = ref(0);
const panY = ref(0);
const isPanning = ref(false);

let _baseX = 0;
let _baseY = 0;
let _startClientX = 0;
let _startClientY = 0;
let _lockedAxis = null;

function startPan(event) {
    _baseX = panX.value;
    _baseY = panY.value;
    _startClientX = event.clientX;
    _startClientY = event.clientY;
    _lockedAxis = null;
    isPanning.value = true;
    window.addEventListener('mousemove', _onPanMove);
    window.addEventListener('mouseup', _stopPan);
}

function _onPanMove(event) {
    if (!isPanning.value) { return; }
    const dx = event.clientX - _startClientX;
    const dy = event.clientY - _startClientY;
    if (event.shiftKey) {
        if (_lockedAxis === null) {
            if (Math.abs(dx) < AXIS_LOCK_THRESHOLD && Math.abs(dy) < AXIS_LOCK_THRESHOLD) { return; }
            _lockedAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }
        if (_lockedAxis === 'x') { panX.value = _baseX + dx; }
        else { panY.value = _baseY + dy; }
    } else {
        _lockedAxis = null;
        panX.value = _baseX + dx;
        panY.value = _baseY + dy;
    }
}

function _stopPan() {
    isPanning.value = false;
    _lockedAxis = null;
    window.removeEventListener('mousemove', _onPanMove);
    window.removeEventListener('mouseup', _stopPan);
}

function resetPan() { panX.value = 0; panY.value = 0; }
function setPan(x, y) { panX.value = x; panY.value = y; }
function panByDelta(dx, dy) { panX.value += dx; panY.value += dy; }

export function useCanvasPan() {
    return { panX, panY, isPanning, startPan, resetPan, setPan, panByDelta };
}
