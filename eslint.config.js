import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';

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
    }
];