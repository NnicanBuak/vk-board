module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'body-changelog-list': ({ body }) => {
          if (!body) {
            return [true, 'body is optional for small commits'];
          }

          const lines = body
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

          const valid = lines.length > 0 && lines.every((line) => line.startsWith('- '));

          return [
            valid,
            'write the commit body as a bullet list with each line starting with "- "',
          ];
        },
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'chore', 'docs', 'test', 'build', 'ci', 'revert'],
    ],
    'scope-enum': [
      2,
      'always',
      ['home', 'board', 'profile', 'api', 'server', 'ci', 'deps', 'core', 'app'],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [2, 'always'],
    'body-changelog-list': [2, 'always'],
  },
};
