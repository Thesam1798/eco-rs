export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of these values
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Formatting, no code change
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf', // Performance improvement
        'test', // Adding tests
        'build', // Build system or external dependencies
        'ci', // CI configuration
        'chore', // Other changes
        'revert', // Revert a previous commit
      ],
    ],

    // Optional scope
    'scope-enum': [
      1,
      'always',
      [
        'app', // Angular app
        'backend', // Rust backend
        'ui', // User interface
        'api', // API changes
        'config', // Configuration
        'deps', // Dependencies
        'hooks', // Git hooks
        'ci', // CI/CD
        'docs', // Documentation
        'scripts', // Build scripts
        'rust', // Rust specific
        'tauri', // Tauri specific
        'eslint', // ESLint config
        'vitest', // Vitest config
        'tailwind', // Tailwind config
        'vscode', // VSCode config
      ],
    ],

    // Header max length
    'header-max-length': [2, 'always', 100],

    // Body and footer should have blank line before
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
