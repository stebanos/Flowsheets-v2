import pluginJs from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import { resolve } from 'path';

// Layer indices: 0=vue, 1=vue-ecosystem, 2=primevue, 3=external, 4=shared, 5=entities, 6=features, 7=widgets, 8=pages, 9=relative
function importLayer(source) {
    if (source === 'vue') return 0;
    if (/^(vue[-/]|@vue\/)/.test(source) || source === 'pinia' || source === 'vue-router') return 1;
    if (/^(primevue(\/|$)|@primevue\/)/.test(source)) return 2;
    if (/^@\/shared/.test(source)) return 4;
    if (/^@\/entities/.test(source)) return 5;
    if (/^@\/features/.test(source)) return 6;
    if (/^@\/widgets/.test(source)) return 7;
    if (/^@\/pages/.test(source)) return 8;
    if (/^\./.test(source)) return 9;
    return 3;
}

const layerName = ['vue', 'vue-ecosystem', 'primevue', 'external', 'shared', 'entities', 'features', 'widgets', 'pages', 'relative'];

const localPlugin = {
    rules: {
        'import-order': {
            meta: { type: 'suggestion', fixable: null, schema: [] },
            create(context) {
                const imports = [];
                return {
                    ImportDeclaration(node) {
                        imports.push({ node, layer: importLayer(node.source.value), path: node.source.value });
                    },
                    'Program:exit'() {
                        for (let i = 1; i < imports.length; i++) {
                            const prev = imports[i - 1];
                            const curr = imports[i];
                            if (curr.layer < prev.layer) {
                                context.report({
                                    node: curr.node,
                                    message: `'${curr.path}' (${layerName[curr.layer]}) must come before '${prev.path}' (${layerName[prev.layer]})`
                                });
                            } else if (curr.layer === prev.layer && curr.path < prev.path) {
                                context.report({
                                    node: curr.node,
                                    message: `'${curr.path}' should come before '${prev.path}' (alphabetical order within ${layerName[curr.layer]})`
                                });
                            }
                        }
                    }
                };
            }
        }
    }
};

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                process: 'readonly',
                module: 'readonly'
            }
        }
    },
    {
        files: ['**/*.test.js', '**/*.spec.js'],
        languageOptions: {
            globals: globals.vitest
        }
    },
    {
        files: ['**/*.cjs'],
        languageOptions: {
            globals: globals.node
        }
    },
    {
        name: 'app/files-to-lint',
        files: ['**/*.{js,mjs,cjs,vue}']
    },
    {
        name: 'app/files-to-ignore',
        ignores: ['**/node_modules/**', '**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/*.d.ts', 'original_working_version/**']
    },
    pluginJs.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        rules: {
            'no-unused-vars': ['warn', { caughtErrorsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            'semi': ['error', 'always'],
            'indent': ['error', 4],
            'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
            'comma-dangle': ['error', 'never'],
            'vue/multi-word-component-names': 'off' // Block.vue needs to be renamed (e.g. FlowBlock) before this can be turned on
        }
    },
    {
        plugins: { local: localPlugin },
        rules: {
            'local/import-order': 'error'
        }
    },
    {
        plugins: { boundaries },
        settings: {
            'import/resolver': {
                alias: {
                    map: [['@', resolve('./src')]],
                    extensions: ['.js', '.vue']
                }
            },
            'boundaries/elements': [
                { type: 'app',      pattern: 'src/app/**' },
                { type: 'pages',    pattern: 'src/pages/**' },
                // Each feature slice (block/drag, block/name, etc.) is captured separately
                // so cross-feature imports are detectable as cross-element imports.
                { type: 'features', pattern: 'src/features/block/(**)', capture: ['featureName'] },
                { type: 'widgets',  pattern: 'src/widgets/**' },
                { type: 'entities', pattern: 'src/entities/**' },
                { type: 'shared',   pattern: 'src/shared/**' }
            ],
            'boundaries/ignore': ['src/main.js']
        },
        rules: {
            'boundaries/dependencies': ['error', {
                default: 'disallow',
                rules: [
                    { from: 'app',      allow: ['pages', 'widgets', 'features', 'entities', 'shared'] },
                    { from: 'pages',    allow: ['widgets', 'features', 'entities', 'shared'] },
                    { from: 'widgets',  allow: ['features', 'entities', 'shared'] },
                    {
                        from: [['features', { featureName: '*' }]],
                        allow: [
                            ['features', { featureName: '{{from.captured.featureName}}' }],
                            'entities', 'shared'
                        ]
                    },
                    { from: 'entities', allow: ['shared'] },
                    { from: 'shared',   allow: [] }
                ]
            }]
        }
    }
];
