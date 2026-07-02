function isFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v);
}

function firstNumericKey(obj) {
    return Object.keys(obj).find(key => isFiniteNumber(obj[key]));
}

function firstStringKey(obj) {
    return Object.keys(obj).find(key => typeof obj[key] === 'string');
}

export function coerceNumberSeries(value) {
    if (!Array.isArray(value) || value.length === 0) { return null; }

    const first = value[0];

    if (isFiniteNumber(first)) {
        if (!value.every(isFiniteNumber)) { return null; }
        return value.map((v, i) => ({ label: String(i), value: v }));
    }

    if (Array.isArray(first)) {
        const rows = value.map(row => {
            if (!Array.isArray(row) || row.length < 2 || !isFiniteNumber(row[1])) { return null; }
            return { label: String(row[0]), value: row[1] };
        });
        return rows.every(row => row !== null) ? rows : null;
    }

    if (first !== null && typeof first === 'object') {
        const labelKey = firstStringKey(first);
        const valueKey = firstNumericKey(first);
        if (!valueKey) { return null; }
        const rows = value.map(item => {
            if (item === null || typeof item !== 'object' || !isFiniteNumber(item[valueKey])) { return null; }
            return { label: labelKey ? String(item[labelKey]) : '', value: item[valueKey] };
        });
        return rows.every(row => row !== null) ? rows : null;
    }

    return null;
}

export function coerceNumbers(value) {
    const series = coerceNumberSeries(value);
    if (!series) { return null; }
    return series.map(item => item.value);
}

function coerceTime(raw) {
    const date = raw instanceof Date ? raw : new Date(raw);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
}

export function coerceTimeSeries(value) {
    if (!Array.isArray(value) || value.length === 0) { return null; }

    const first = value[0];
    let points;

    if (Array.isArray(first)) {
        points = value.map(row => {
            if (!Array.isArray(row) || row.length < 2 || !isFiniteNumber(row[1])) { return null; }
            const time = coerceTime(row[0]);
            return time === null ? null : { time, value: row[1] };
        });
    } else if (first !== null && typeof first === 'object') {
        const dateKeys = ['date', 'time', 'timestamp', 'x'];
        const valueKeys = ['value', 'y'];
        const dateKey = dateKeys.find(key => key in first);
        const valueKey = valueKeys.find(key => isFiniteNumber(first[key]));
        if (!dateKey || !valueKey) { return null; }
        points = value.map(item => {
            if (item === null || typeof item !== 'object' || !isFiniteNumber(item[valueKey])) { return null; }
            const time = coerceTime(item[dateKey]);
            return time === null ? null : { time, value: item[valueKey] };
        });
    } else {
        return null;
    }

    const valid = points.filter(point => point !== null);
    if (valid.length === 0) { return null; }

    return valid.sort((a, b) => a.time - b.time);
}

export function extent(nums) {
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min !== max) { return [min, max]; }
    if (min === 0) { return [0, 1]; }
    return [min - 1, min + 1];
}

export function niceTicks(min, max, count = 5) {
    if (min === max) { return [min]; }

    const span = max - min;
    const rawStep = span / Math.max(count, 1);
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const residual = rawStep / magnitude;

    let niceResidual;
    if (residual <= 1) { niceResidual = 1; }
    else if (residual <= 2) { niceResidual = 2; }
    else if (residual <= 5) { niceResidual = 5; }
    else { niceResidual = 10; }

    const step = niceResidual * magnitude;
    const start = Math.ceil(min / step) * step;

    const ticks = [];
    for (let tick = start; tick <= max + step * 1e-9; tick += step) {
        ticks.push(Number(tick.toFixed(10)));
    }

    return ticks.length > 0 ? ticks : [min, max];
}
