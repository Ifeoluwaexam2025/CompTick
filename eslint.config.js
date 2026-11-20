const globals = require('globals');

module.exports = [
    {
        files: ['**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: globals.node
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['error', { args: 'none' }],
            'no-unreachable': 'error',
            eqeqeq: 'error'
        }
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: { globals: globals.jest }
    }
];
