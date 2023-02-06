<h1 align="center">TypeScript API Tools</h1>

<p align="center">
	Utility functions for working with TypeScript's API.
	Based on the wonderful <a href="https://github.com/ajafff/tsutils">tsutils</a>.
</p>

<p align="center">
	<a href="#contributors" target="_blank">
<!-- prettier-ignore-start -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
<img alt="All Contributors: 2" src="https://img.shields.io/badge/all_contributors-2-21bb42.svg" />
<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- prettier-ignore-end -->
	</a>
	<a href="https://codecov.io/gh/JoshuaKGoldberg/ts-api-tools" target="_blank">
		<img alt="Codecov Test Coverage" src="https://codecov.io/gh/JoshuaKGoldberg/ts-api-tools/branch/main/graph/badge.svg?token=eVIFY4MhfQ"/>
	</a>
	<a href="https://github.com/JoshuaKGoldberg/ts-api-tools/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank">
		<img alt="Contributor Covenant" src="https://img.shields.io/badge/code_of_conduct-enforced-21bb42" />
	</a>
	<a href="https://github.com/JoshuaKGoldberg/ts-api-tools/blob/main/LICENSE.md" target="_blank">
	    <img alt="License: MIT" src="https://img.shields.io/github/license/JoshuaKGoldberg/ts-api-tools?color=21bb42">
    </a>
	<a href="https://github.com/sponsors/JoshuaKGoldberg" target="_blank">
    	<img alt="Sponsor: On GitHub" src="https://img.shields.io/badge/sponsor-on_github-21bb42.svg" />
    </a>
	<img alt="Style: Prettier" src="https://img.shields.io/badge/style-prettier-21bb42.svg" />
    <img alt="TypeScript: Strict" src="https://img.shields.io/badge/typescript-strict-21bb42.svg" />
</p>

## Usage

```shell
npm i ts-api-tools
```

```ts
import * as tools from "ts-api-tools";
```

`ts-api-tools` provides several categories of utility functions:

- [Comments](#comments)
- [Compiler Options](#compiler-options)
- [Flags](#flags)
- [Modifiers](#modifiers)
- [Node Type Guards](#node-type-guards)
- [Node Utilities](#node-utilities)
- [Scopes](#scopes)
- [Syntax](#syntax)
- [Tokens](#tokens)
- [Type Getters](#type-getters)
- [Type Type Guards](#type-type-guards)
- [Type Utilities](#type-utilities)

> This package is a partial fork of and replacement for [`tsutils`](https://github.com/ajafff/tsutils) ([original license: MIT](https://github.com/ajafff/tsutils/blob/26b195358ec36d59f00333115aa3ffd9611ca78b/LICENSE)).
> See [#3](https://github.com/JoshuaKGoldberg/ts-api-tools/issues/3) for notes on API coverage compared to `tsutils`.

### Comments

#### `forEachComment`

Iterates over all comments owned by `node` or its children.

- `type ForEachCommentCallback = (fullText: string, comment: ts.CommentRange) => void`
- `function forEachComment(node: ts.Node, callback: ForEachCommentCallback, sourceFile?: ts.SourceFile): void`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.forEachComment(node, (fullText, comment) => {
	console.log(`Found comment at position ${comment.pos}: '${fullText}'.`);
});
```

### Compiler Options

#### `isCompilerOptionEnabled`

Checks if a given compiler option is enabled.
It handles dependencies of options, e.g. `declaration` is implicitly enabled by `composite` or `strictNullChecks` is enabled by `strict`.
However, it does not check dependencies that are already checked and reported as errors, e.g. `checkJs` without `allowJs`.
This function only handles boolean flags.

- `type BooleanCompilerOptions =` _(all keys of `ts.CompilerOptions` with a `boolean` value)_
- `function isCompilerOptionEnabled(options: ts.CompilerOptions, option: BooleanCompilerOptions): boolean`

```ts
import * as tools from "ts-api-tools";

const options = {
	allowJs: true,
};

tools.isCompilerOptionEnabled(options, "allowJs"); // true
tools.isCompilerOptionEnabled(options, "allowSyntheticDefaultImports"); // false
```

#### `isStrictCompilerOptionEnabled`

Checks if a given compiler option is enabled, accounting for whether all flags (except `strictPropertyInitialization`) have been enabled by `strict: true`.

- `function isStrictCompilerOptionEnabled(options: ts.CompilerOptions, option: StrictCompilerOption): boolean`

```ts
import * as tools from "ts-api-tools";

const optionsLenient = {
	noImplicitAny: true,
};

tools.isStrictCompilerOptionEnabled(optionsLenient, "noImplicitAny"); // true
tools.isStrictCompilerOptionEnabled(optionsLenient, "noImplicitThis"); // false

const optionsStrict = {
	noImplicitThis: false,
	strict: true,
};

tools.isStrictCompilerOptionEnabled(optionsStrict, "noImplicitAny"); // true
tools.isStrictCompilerOptionEnabled(optionsStrict, "noImplicitThis"); // false
```

### Flags

#### `isModifierFlagSet`

- `function isModifierFlagSet(node: ts.Declaration, flag: ts.ModifierFlags): boolean`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isModifierFlagSet(node, ts.ModifierFlags.Abstract);
```

#### `isNodeFlagSet`

- `function isNodeFlagSet(node: ts.Node, flag: ts.NodeFlags): boolean`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isNodeFlagSet(node, ts.NodeFlags.AwaitContext);
```

#### `isObjectFlagSet`

- `function isObjectFlagSet(node: ts.ObjectType, flag: ts.ObjectFlags): boolean`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isObjectFlagSet(node, ts.ObjectFlags.Anonymous);
```

#### `isSymbolFlagSet`

- `function isSymbolFlagSet(symbol: ts.Symbol, flag: ts.SymbolFlags): boolean`

```ts
import * as tools from "ts-api-tools";

declare const symbol: ts.Symbol;

tools.isSymbolFlagSet(node, ts.SymbolFlags.Accessor);
```

#### `isTypeFlagSet`

- `function isTypeFlagSet(type: ts.Type, flag: ts.TypeFlags): boolean`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isTypeFlagSet(type, ts.TypeFlags.Any);
```

### Node Type Guards

#### `isEntityNameExpression`

- `function isEntityNameExpression(node: ts.Node): node is ts.EntityNameExpression`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isEntityNameExpression(node);
```

#### `isExpression`

- `function isExpression(node: ts.Node): node is ts.Expression`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isExpression(node);
```

#### `isNumericOrStringLikeLiteral`

- `function isNumericOrStringLikeLiteral(node: ts.Node): node is NumericOrStringLikeLiteral`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isNumericOrStringLikeLiteral(node);
```

#### `isParameterDeclaration`

- `function isParameterDeclaration(node: ts.Node): node is ts.ParameterDeclaration`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isParameterDeclaration(node);
```

#### `isConstAssertion`

- `function isConstAssertion(node: ts.AssertionExpression): node is ConstAssertionExpression`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isConstAssertion(node);
```

### Node Utilities

#### `isBindableObjectDefinePropertyCall`

- `function isBindableObjectDefinePropertyCall(node: ts.CallExpression): boolean`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

isBindableObjectDefinePropertyCall(type);
```

#### `isInConstContext`

- `function isInConstContext(node: ts.Expression): boolean`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

isInConstContext(node);
```

### Modifiers

#### `hasModifier`

- `function hasModifier(modifiers: Iterable<ts.Modifier> | undefined, ...kinds: ts.Modifier): boolean`

```ts
import * as tools from "ts-api-tools";

declare const modifiers: ts.Modifier[];

hasModifier(modifiers, ts.SyntaxKind.AbstractKeyword);
```

### Scopes

#### `isFunctionScopeBoundary`

- `const enum ScopeBoundary { None, Function }`
- `function isFunctionScopeBoundary(node: ts.Node): ScopeBoundary`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

tools.isFunctionScopeBoundary(node);
```

### Syntax

#### `isAssignmentKind`

- `function isAssignmentKind(kind: ts.SyntaxKind): boolean`

```ts
import * as tools from "ts-api-tools";

declare const kind: ts.SyntaxKind;

tools.isAssignmentKind(kind);
```

#### `isNumericPropertyName`

- `function isNumericPropertyName(name: string | ts.__String): boolean`

```ts
import * as tools from "ts-api-tools";

tools.isNumericPropertyName("abc"); // false
tools.isNumericPropertyName("123"); // true
```

### `isValidPropertyAccess`

Determines whether the given text can be used to access a property with a PropertyAccessExpression while preserving the property's name.

- `function isValidPropertyAccess(text: string, languageVersion?: ts.ScriptTarget): void`

```ts
import * as tools from "ts-api-tools";

isValidPropertyAccess("abc"); // true
isValidPropertyAccess("123"); // false
```

### Tokens

#### `forEachToken`

Iterates over all tokens of `node`.

- `type ForEachTokenCallback = (token: ts.Node) => void`
- `function forEachToken(node: ts.Node, callback: ForEachTokenCallback, sourceFile?: ts.SourceFile): void`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;

forEachToken(node, (token) => {
	console.log("Found token:", token.getText());
});
```

### Type Getters

#### `getCallSignaturesOfType`

- `function getCallSignaturesOfType(type: ts.Type): readonly ts.Signature[]`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

getCallSignaturesOfType(type);
```

#### `getPropertyOfType`

- `function getPropertyOfType(type: ts.Type, name: ts.__String): ts.Symbol | undefined`

```ts
import * as tools from "ts-api-tools";

declare const property: ts.Symbol;
declare const type: ts.Type;

getPropertyOfType(type, property.getEscapedName());
```

### Type Type Guards

#### `isConditionalType`

- `function isConditionalType(type: ts.Type): type is ts.ConditionalType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isConditionalType(type);
```

#### `isIntersectionType`

- `function isIntersectionType(type: ts.Type): type is ts.IntersectionType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isIntersectionType(type);
```

#### `isLiteralType`

- `function isLiteralType(type: ts.Type): type is ts.LiteralType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isLiteralType(type);
```

#### `isObjectType`

- `function isObjectType(type: ts.Type): type is ts.ObjectType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isObjectType(type);
```

#### `isUnionOrIntersectionType`

- `function isUnionOrIntersectionType(type: ts.Type): type is ts.UnionOrIntersectionType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isUnionOrIntersectionType(type);
```

#### `isUnionType`

- `function isUnionType(type: ts.Type): type is ts.UnionType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isUnionType(type);
```

#### `isUniqueESSymbolType`

- `function isUniqueESSymbolType(type: ts.Type): type is ts.UniqueESSymbolType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isUniqueESSymbolType(type);
```

#### `isTupleType`

- `function isTupleType(type: ts.Type): type is ts.TupleType`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isTupleType(type);
```

#### `isTupleTypeReference`

- `function isTupleTypeReference(type: ts.Type): type is TupleTypeReference`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isTupleTypeReference(type);
```

#### `isTypeReference`

- `function isTypeReference(type: ts.Type): type is ts.TypeReference`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isTypeReference(type);
```

### Type Utilities

#### `getWellKnownSymbolPropertyOfType`

- `function getWellKnownSymbolPropertyOfType(type: ts.Type, wellKnownSymbolName: string, typeChecker: ts.TypeChecker): ts.Symbol | undefined`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;
declare const typeChecker: ts.TypeChecker;

tools.getWellKnownSymbolPropertyOfType(type, "asyncIterator", typeChecker);
```

#### `isBooleanLiteralType`

Determines whether the given type is a boolean literal type and matches the given boolean literal.

- `function isBooleanLiteralType(type: ts.Type, literal: boolean)`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isBooleanLiteralType(type);
```

#### `isFalsyType`

Determines whether a type is definitely falsy.
This function doesn't unwrap union types.

- `function isFalsyType(type: ts.Type): boolean`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.isFalsyType(type);
```

#### `isPropertyReadonlyInType`

Determines whether writing to a certain property of a given type is allowed.

- `function isPropertyReadonlyInType(type: ts.Type, name: ts.__String, typeChecker: ts.TypeChecker): boolean`

```ts
import * as tools from "ts-api-tools";

declare const property: ts.Symbol;
declare const type: ts.Type;
declare const typeChecker: ts.TypeChecker;

tools.isPropertyReadonlyInType(type, property.getEscapedName(), typeChecker);
```

#### `isThenableType`

Determines whether a type is thenable and thus can be used with `await`.

- `function isThenableType(typeChecker: ts.TypeChecker, node: ts.Node, type: ts.Type): boolean`
- `function isThenableType(typeChecker: ts.TypeChecker, node: ts.Expression, type?: ts.Type): boolean`

```ts
import * as tools from "ts-api-tools";

declare const node: ts.Node;
declare const type: ts.Type;
declare const typeChecker: ts.TypeChecker;

tools.isThenableType(typeChecker, node, type);

declare const expression: ts.Expression;

tools.isThenableType(typeChecker, expression);
tools.isThenableType(typeChecker, expression, type);
```

#### `someTypePart`

- `type SomeTypePartPredicate = (type: ts.Type) => type is ts.UnionOrIntersectionType`
- `type SomeTypePartCallback = (type: ts.Type) => boolean`
- `function someTypePart(type: ts.Type, predicate: SomeTypePartPredicate, callback: SomeTypePartCallback): boolean`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;
declare const typeChecker: ts.TypeChecker;

tools.someTypePart(type, tools.isUnionOrIntersectionType, (subType) => {
	console.log("Got a literal type:", typeChecker.typeToString(subType));
});
```

#### `symbolHasReadonlyDeclaration`

- `function symbolHasReadonlyDeclaration(symbol: ts.Symbol, typeChecker: ts.TypeChecker): boolean`

```ts
import * as tools from "ts-api-tools";

declare const symbol: ts.Symbol;
declare const typeChecker: ts.TypeChecker;

tools.symbolHasReadonlyDeclaration(symbol, typeChecker);
```

#### `unionTypeParts`

- `function unionTypeParts(type: ts.Type): ts.Type[]`

```ts
import * as tools from "ts-api-tools";

declare const type: ts.Type;

tools.unionTypeParts(type);
```

## Development

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md).
Thanks! 💖

## Contributors

Many thanks to [@ajafff](https://github.com/ajafff) for creating the original [`tsutils`](https://github.com/ajafff/tsutils) that this project is based on and uses a significant majority of code from! 🙌

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- spellchecker: disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.joshuakgoldberg.com"><img src="https://avatars.githubusercontent.com/u/3335181?v=4?s=100" width="100px;" alt="Josh Goldberg"/><br /><sub><b>Josh Goldberg</b></sub></a><br /><a href="#tool-JoshuaKGoldberg" title="Tools">🔧</a> <a href="https://github.com/JoshuaKGoldberg/ts-api-tools/commits?author=JoshuaKGoldberg" title="Code">💻</a> <a href="https://github.com/JoshuaKGoldberg/ts-api-tools/commits?author=JoshuaKGoldberg" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ajafff"><img src="https://avatars.githubusercontent.com/u/11968040?v=4?s=100" width="100px;" alt="Klaus Meinhardt"/><br /><sub><b>Klaus Meinhardt</b></sub></a><br /><a href="https://github.com/JoshuaKGoldberg/ts-api-tools/commits?author=ajafff" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- spellchecker: enable -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

> 💙 This package is templated from [@JoshuaKGoldberg](https://github.com/JoshuaKGoldberg)'s [template-typescript-node-package](https://github.com/JoshuaKGoldberg/template-typescript-node-package).

> _"My tools! I have to have my tools!" - Dennis Reynolds_
