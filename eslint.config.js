import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ['**/*.{js,mjs,cjs,vue}']
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                process: 'readonly',
                module: 'readonly',
            }
        }
    },
    pluginJs.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        rules: {
            'no-unused-vars': 'warn',
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'indent': ['error', 4],
            'space-before-function-paren': ['error', 'always'],
        }
    }
];