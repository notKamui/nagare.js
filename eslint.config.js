import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'curly': ['error', 'multi-line'],
    'antfu/if-newline': 'off',
    'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
  },
  ignores: ['node_modules'],
})
