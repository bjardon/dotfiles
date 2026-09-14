Default to writing TypeScript with Node.js as the runtime and pnpm as
the package manager. This includes standalone scripts, one-off automation, and
helper tools.

When writing TypeScript, keep it strictly type-safe. Use strict mode,
validate untrusted inputs, and keep type checking
passing. Resolve type errors through accurate types and narrowing rather than
`any`, unchecked assertions, or suppression comments.

Use the installed pnpm for installs, package scripts, and dependency execution
unless the working project has an established package manager.
