import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import boundaries from 'eslint-plugin-boundaries';
import { resolve } from 'path';

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
