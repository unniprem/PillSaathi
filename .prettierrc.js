/**
 * Prettier Configuration
 *
 * Configures code formatting rules for consistent code style across the project.
 * These settings ensure all JavaScript, JSX, and other supported files
 * follow the same formatting conventions.
 *
 * Key settings:
 * - Single quotes for strings
 * - Trailing commas in ES5-compatible locations
 * - 80 character line width
 * - 2 space indentation
 * - Semicolons at end of statements
 * - LF line endings (Unix-style)
 *
 * @see https://prettier.io/docs/en/configuration.html
 */
module.exports = {
  // Use single quotes instead of double quotes
  singleQuote: true,

  // Add trailing commas where valid in ES5 (objects, arrays, etc.)
  trailingComma: 'all',

  // Avoid parentheses around a sole arrow function parameter
  arrowParens: 'avoid',

  // Print width - wrap lines at 80 characters
  printWidth: 80,

  // Use 2 spaces for indentation
  tabWidth: 2,

  // Use spaces instead of tabs
  useTabs: false,

  // Add semicolons at the end of statements
  semi: true,

  // Use LF line endings
  endOfLine: 'lf',

  // Put the > of a multi-line JSX element at the end of the last line
  bracketSameLine: false,

  // Add spaces inside object literals
  bracketSpacing: true,
};
