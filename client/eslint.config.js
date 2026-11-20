import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
    ...tseslint.configs.recommended,
    { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
    {
        files: ['**/*.tsx', '**/*.ts'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'error'
        }
    }
];
