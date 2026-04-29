# Core Coding Standards

## 1. Function Style

- **Use `const` Arrow Functions:** Always prefer `const` arrow functions for all functions, including event handlers and utility functions. Class methods are the only exception.
  - **Correct:** `export const myFunction = (options: MyOptions): string => { ... };`
  - **Incorrect:** `export function myFunction(options: MyOptions): string { ... }`

## 2. Control Flow

- **Use Early Returns (Guard Clauses):** Always use early returns to reduce nesting and improve readability. Avoid `else` statements by returning early.
- **Always Use Braces:** Every `if` statement must use curly braces `{}`, even for a single statement.
- **Extract Deep Nesting:** If a section within a method is indented more than 2 levels, extract it into a separate private function or method.

## 3. Options Objects

- **Methods with more than one argument must use an options object:**
  - **Correct:** `findNearest(options: { companyId: string; k: number })`
  - **Incorrect:** `findNearest(companyId: string, k: number)`

## 4. JSDoc Comments

- **JSDoc on All Exports:** All exported functions, methods, classes, and complex non-exported functions MUST have a JSDoc comment.
- **CRITICAL: No Types in JSDoc:** TypeScript handles typing. JSDoc is for **descriptions only**.

## 5. General Clean Code

- **Single Responsibility Principle (SRP):** Functions must do one thing well.
- **DRY (Don't Repeat Yourself):** Abstract repeated logic into reusable utility functions.
- **Naming:** Write out full words (e.g., `options` instead of `opts`).

## 6. Class Interface Pattern

- **Define a type interface first:** Before creating a class, define a `type` alias for its public API with JSDoc comments. Then implement the class against that type.

## 7. Private Members

- **Prefix with underscore:** All private methods and properties must be prefixed with `_`.

# Svelte 5 Core Principles

## 1. Reactivity is Runes

- **CRITICAL: Use Runes for all reactivity.** The `$`-family of runes are the _only_ way to manage state.
- **State:** Use `$state` for all reactive local state.
- **Derived State:** Use `$derived` for all computed values. Proxied external service state must use native getters instead of `$derived`.
- **Side Effects:** Use `$effect` for side effects.

## 2. Component Props & Events

- **Props:** Use `$props` to define component properties.
- **Bindings:** Use `$bindable` to make a prop two-way bindable from a parent.
- **Event Handlers:** Use plain HTML `onclick` (and similar) attributes.

## 3. Markup & Reusability

- **Use Snippets:** Use `{#snippet ...}` and `{@render ...}` for all reusable markup.

## 4. Internationalization (i18n)

- **Use Paraglide:** All user-facing text MUST be internationalized via `import t from "$locale";`.

# Strict TypeScript Rules

- **Avoid `any`:** Use `unknown` and perform runtime type checking.
- **Prefer `type` over `interface`:** Always use `type` aliases by default.
- **Strict Null Checks:** All code must be "strict null" compatible. Use `undefined` instead of `null`.

# Tailwind CSS Best Practices

- **Utility-First Always:** Apply utilities directly in the `class` attribute. Avoid `@apply`.
- **Configuration:** All colors, fonts, and spacing should be defined in `tailwind.config.js`.

# SvelteKit Conventions

- **Stores:** Use singleton services with `$state` instead of Svelte stores.
- **State:** All local state belongs in ViewModels. Views delegate to view models.
- **Initialization:** Use `initialize()` in ViewModels instead of `onMount`.
- **Destructuring:** Never destructure reactive properties from ViewModels (e.g., use `viewModel.show`, not `const { show } = viewModel`).
- **File Path Comments:** Every file must include its relative path from the monorepo root as a comment at the very top of the file (Line 1 for TS, Line 1 inside `<script>` for Svelte).

# Genkit Node.js API Rules

- **Single File Structure**: All Genkit code, including plugin initialization, flows, and helpers, must be placed in a single `src/lib/server/genkit/index.ts` file (or similar relevant path).
- **Model Naming**: Always specify models using the model helper (e.g., `googleAI.model('gemini-2.5-pro')`).
