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
                module: 'readonly',
            }
        }
    },
    {
        name: 'app/files-to-lint',
        files: ['**/*.{js,mjs,cjs,vue}']
    },
    {
        name: 'app/files-to-ignore',
        ignores: ['**/node_modules/**', '**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/*.d.ts']
    },
    pluginJs.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        rules: {
            'no-unused-vars': 'warn',
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            'semi': ['error', 'always'],
            'indent': ['error', 4],
            'space-before-function-paren': ['error', 'always'],
            'comma-dangle': ['error', 'never']
        }
    }
];