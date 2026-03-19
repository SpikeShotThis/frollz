const globals = require("globals");
const pluginVue = require("eslint-plugin-vue");
const tseslint = require("typescript-eslint");
const vueParser = require("vue-eslint-parser");
const skipFormatting = require("@vue/eslint-config-prettier/skip-formatting");
const gitignore = require("eslint-config-flat-gitignore").default;
const vueA11y = require("eslint-plugin-vuejs-accessibility");
module.exports = [
	gitignore(),
	{
		ignores: [
			"eslint.config.cjs",
			"dist/**",
			"coverage/**",
			".vite/**",
		],
	},
	...pluginVue.configs["flat/essential"],
	...tseslint.configs.recommended,
	...vueA11y.configs["flat/recommended"],
	skipFormatting,
	{
		files: ["**/*.vue"],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: [".vue"],
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			"vue/multi-word-component-names": "off",
			"@typescript-eslint/no-unused-vars": ["error", {
				varsIgnorePattern: "^_",
				argsIgnorePattern: "^_",
				caughtErrorsIgnorePattern: "^_",
			}],
		},
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", {
				varsIgnorePattern: "^_",
				argsIgnorePattern: "^_",
				caughtErrorsIgnorePattern: "^_",
			}],
		},
	},
	{
		files: ["**/*.cjs", "**/*.config.js"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ["**/*.spec.ts", "**/*.test.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
		},
	},
];
