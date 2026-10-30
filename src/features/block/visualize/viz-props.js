// Every viz component declares these; widgets/block-output passes them all.
export const VIZ_PROPS = {
    value: {},
    error: { type: String, default: null },
    block: { type: Object, default: null },
    isList: { type: Boolean, default: false },
    outputItems: { type: Array, default: () => [] },
    getEvaluation: { type: Function, default: () => null }
};
