export default {
  // TypeScript and JavaScript files (only in src)
  'src/**/*.{ts,tsx,js,jsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],

  // Config files at root
  '*.{js,cjs,mjs}': ['prettier --write'],

  // Angular templates
  '*.html': ['prettier --write --parser angular'],

  // Style and config files
  '*.{css,scss,json,md}': ['prettier --write'],

  // Rust files (run cargo fmt and clippy)
  'src-tauri/**/*.rs': () => [
    'cargo fmt --manifest-path src-tauri/Cargo.toml -- --check',
    'cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings',
  ],
};
