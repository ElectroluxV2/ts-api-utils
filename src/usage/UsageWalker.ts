// Code largely based on https://github.com/ajafff/tsutils
// Original license: https://github.com/ajafff/tsutils/blob/26b195358ec36d59f00333115aa3ffd9611ca78b/LICENSE

import ts from "typescript";

import { includesModifier } from "../modifiers";
import { DeclarationDomain } from "./declarations";
import { getPropertyName } from "./getPropertyName";
import { getUsageDomain } from "./getUsageDomain";
import {
	isBlockScopeBoundary,
	Scope,
	ScopeBoundary,
	ScopeBoundarySelector,
} from "./Scope";
import {
	BlockScope,
	ClassExpressionScope,
	ConditionalTypeScope,
	ConditionalTypeScopeState,
	FunctionExpressionScope,
	FunctionScope,
	NonRootScope,
	RootScope,
} from "./scopes";
import { UsageInfo, UsageInfoCallback } from "./usage";
import {
	canHaveDecorators,
	getDecorators,
	identifierToKeywordKind,
} from "./utils";

// TODO class decorators resolve outside of class, element and parameter decorator resolve inside/at the class
// TODO computed property name resolves inside/at the class
// TODO this and super in all of them are resolved outside of the class
export class UsageWalker {
	#result = new Map<ts.Identifier, UsageInfo>();
	#scope!: Scope;

	getUsage(sourceFile: ts.SourceFile): Map<ts.Identifier, UsageInfo> {
		const variableCallback = (variable: UsageInfo, key: ts.Identifier) => {
			this.#result.set(key, variable);
		};
		const isModule = ts.isExternalModule(sourceFile);
		this.#scope = new RootScope(
			sourceFile.isDeclarationFile &&
				isModule &&
				!containsExportStatement(sourceFile),
			!isModule,
		);
		const cb = (node: ts.Node): void => {
			if (isBlockScopeBoundary(node))
				return continueWithScope(
					node,
					new BlockScope(this.#scope.getFunctionScope(), this.#scope),
					handleBlockScope,
				);
			switch (node.kind) {
				case ts.SyntaxKind.ClassExpression:
					return continueWithScope(
						node,
						(<ts.ClassExpression>node).name !== undefined
							? new ClassExpressionScope(
									(<ts.ClassExpression>node).name!,
									this.#scope,
							  )
							: new NonRootScope(this.#scope, ScopeBoundary.Function),
					);
				case ts.SyntaxKind.ClassDeclaration:
					this.#handleDeclaration(
						<ts.ClassDeclaration>node,
						true,
						DeclarationDomain.Value | DeclarationDomain.Type,
					);
					return continueWithScope(
						node,
						new NonRootScope(this.#scope, ScopeBoundary.Function),
					);
				case ts.SyntaxKind.InterfaceDeclaration:
				case ts.SyntaxKind.TypeAliasDeclaration:
					this.#handleDeclaration(
						<ts.InterfaceDeclaration | ts.TypeAliasDeclaration>node,
						true,
						DeclarationDomain.Type,
					);
					return continueWithScope(
						node,
						new NonRootScope(this.#scope, ScopeBoundary.Type),
					);
				case ts.SyntaxKind.EnumDeclaration:
					this.#handleDeclaration(
						<ts.EnumDeclaration>node,
						true,
						DeclarationDomain.Any,
					);
					return continueWithScope(
						node,
						this.#scope.createOrReuseEnumScope(
							(<ts.EnumDeclaration>node).name.text,
							includesModifier(
								(node as ts.HasModifiers).modifiers,
								ts.SyntaxKind.ExportKeyword,
							),
						),
					);
				case ts.SyntaxKind.ModuleDeclaration:
					return this.#handleModule(
						<ts.ModuleDeclaration>node,
						continueWithScope,
					);
				case ts.SyntaxKind.MappedType:
					return continueWithScope(
						node,
						new NonRootScope(this.#scope, ScopeBoundary.Type),
					);
				case ts.SyntaxKind.FunctionExpression:
				case ts.SyntaxKind.ArrowFunction:
				case ts.SyntaxKind.Constructor:
				case ts.SyntaxKind.MethodDeclaration:
				case ts.SyntaxKind.FunctionDeclaration:
				case ts.SyntaxKind.GetAccessor:
				case ts.SyntaxKind.SetAccessor:
				case ts.SyntaxKind.MethodSignature:
				case ts.SyntaxKind.CallSignature:
				case ts.SyntaxKind.ConstructSignature:
				case ts.SyntaxKind.ConstructorType:
				case ts.SyntaxKind.FunctionType:
					return this.#handleFunctionLikeDeclaration(
						<ts.FunctionLikeDeclaration>node,
						cb,
						variableCallback,
					);
				case ts.SyntaxKind.ConditionalType:
					return this.#handleConditionalType(
						<ts.ConditionalTypeNode>node,
						cb,
						variableCallback,
					);
				// End of Scope specific handling
				case ts.SyntaxKind.VariableDeclarationList:
					this.#handleVariableDeclaration(<ts.VariableDeclarationList>node);
					break;
				case ts.SyntaxKind.Parameter:
					if (
						node.parent.kind !== ts.SyntaxKind.IndexSignature &&
						((<ts.ParameterDeclaration>node).name.kind !==
							ts.SyntaxKind.Identifier ||
							identifierToKeywordKind(
								<ts.Identifier>(<ts.NamedDeclaration>node).name,
							) !== ts.SyntaxKind.ThisKeyword)
					)
						this.#handleBindingName(
							<ts.Identifier>(<ts.NamedDeclaration>node).name,
							false,
							false,
						);
					break;
				case ts.SyntaxKind.EnumMember:
					this.#scope.addVariable(
						getPropertyName((<ts.EnumMember>node).name)!,
						(<ts.EnumMember>node).name,
						ScopeBoundarySelector.Function,
						true,
						DeclarationDomain.Value,
					);
					break;
				case ts.SyntaxKind.ImportClause:
				case ts.SyntaxKind.ImportSpecifier:
				case ts.SyntaxKind.NamespaceImport:
				case ts.SyntaxKind.ImportEqualsDeclaration:
					this.#handleDeclaration(
						<ts.NamedDeclaration>node,
						false,
						DeclarationDomain.Any | DeclarationDomain.Import,
					);
					break;
				case ts.SyntaxKind.TypeParameter:
					this.#scope.addVariable(
						(<ts.TypeParameterDeclaration>node).name.text,
						(<ts.TypeParameterDeclaration>node).name,
						node.parent.kind === ts.SyntaxKind.InferType
							? ScopeBoundarySelector.InferType
							: ScopeBoundarySelector.Type,
						false,
						DeclarationDomain.Type,
					);
					break;
				case ts.SyntaxKind.ExportSpecifier:
					if ((<ts.ExportSpecifier>node).propertyName !== undefined)
						return this.#scope.markExported(
							(<ts.ExportSpecifier>node).propertyName!,
							(<ts.ExportSpecifier>node).name,
						);
					return this.#scope.markExported((<ts.ExportSpecifier>node).name);
				case ts.SyntaxKind.ExportAssignment:
					if (
						(<ts.ExportAssignment>node).expression.kind ===
						ts.SyntaxKind.Identifier
					)
						return this.#scope.markExported(
							<ts.Identifier>(<ts.ExportAssignment>node).expression,
						);
					break;
				case ts.SyntaxKind.Identifier: {
					const domain = getUsageDomain(<ts.Identifier>node);
					if (domain !== undefined)
						this.#scope.addUse({ domain, location: <ts.Identifier>node });
					return;
				}
			}

			return ts.forEachChild(node, cb);
		};
		const continueWithScope = <T extends ts.Node>(
			node: T,
			scope: Scope,
			next: (node: T) => void = forEachChild,
		) => {
			const savedScope = this.#scope;
			this.#scope = scope;
			next(node);
			this.#scope.end(variableCallback);
			this.#scope = savedScope;
		};
		const handleBlockScope = (node: ts.Node) => {
			if (
				node.kind === ts.SyntaxKind.CatchClause &&
				(<ts.CatchClause>node).variableDeclaration !== undefined
			)
				this.#handleBindingName(
					(<ts.CatchClause>node).variableDeclaration!.name,
					true,
					false,
				);
			return ts.forEachChild(node, cb);
		};

		ts.forEachChild(sourceFile, cb);
		this.#scope.end(variableCallback);
		return this.#result;

		function forEachChild(node: ts.Node) {
			return ts.forEachChild(node, cb);
		}
	}

	#handleConditionalType(
		node: ts.ConditionalTypeNode,
		cb: (node: ts.Node) => void,
		varCb: UsageInfoCallback,
	) {
		const savedScope = this.#scope;
		const scope = (this.#scope = new ConditionalTypeScope(savedScope));
		cb(node.checkType);
		scope.updateState(ConditionalTypeScopeState.Extends);
		cb(node.extendsType);
		scope.updateState(ConditionalTypeScopeState.TrueType);
		cb(node.trueType);
		scope.updateState(ConditionalTypeScopeState.FalseType);
		cb(node.falseType);
		scope.end(varCb);
		this.#scope = savedScope;
	}

	#handleFunctionLikeDeclaration(
		node: ts.FunctionLikeDeclaration,
		cb: (node: ts.Node) => void,
		varCb: UsageInfoCallback,
	) {
		if (canHaveDecorators(node)) {
			getDecorators(node)?.forEach(cb);
		}

		const savedScope = this.#scope;
		if (node.kind === ts.SyntaxKind.FunctionDeclaration)
			this.#handleDeclaration(node, false, DeclarationDomain.Value);
		const scope = (this.#scope =
			node.kind === ts.SyntaxKind.FunctionExpression && node.name !== undefined
				? new FunctionExpressionScope(node.name, savedScope)
				: new FunctionScope(savedScope));
		if (node.name !== undefined) cb(node.name);
		if (node.typeParameters !== undefined) node.typeParameters.forEach(cb);
		node.parameters.forEach(cb);
		if (node.type !== undefined) cb(node.type);
		if (node.body !== undefined) {
			scope.beginBody();
			cb(node.body);
		}
		scope.end(varCb);
		this.#scope = savedScope;
	}

	#handleModule(
		node: ts.ModuleDeclaration,
		next: (node: ts.Node, scope: Scope) => void,
	) {
		if (node.flags & ts.NodeFlags.GlobalAugmentation)
			return next(
				node,
				this.#scope.createOrReuseNamespaceScope("-global", false, true, false),
			);
		if (node.name.kind === ts.SyntaxKind.Identifier) {
			const exported = isNamespaceExported(<ts.NamespaceDeclaration>node);
			this.#scope.addVariable(
				node.name.text,
				node.name,
				ScopeBoundarySelector.Function,
				exported,
				DeclarationDomain.Namespace | DeclarationDomain.Value,
			);
			const ambient = includesModifier(
				node.modifiers,
				ts.SyntaxKind.DeclareKeyword,
			);
			return next(
				node,
				this.#scope.createOrReuseNamespaceScope(
					node.name.text,
					exported,
					ambient,
					ambient && namespaceHasExportStatement(node),
				),
			);
		}
		return next(
			node,
			this.#scope.createOrReuseNamespaceScope(
				`"${node.name.text}"`,
				false,
				true,
				namespaceHasExportStatement(node),
			),
		);
	}

	#handleDeclaration(
		node: ts.NamedDeclaration,
		blockScoped: boolean,
		domain: DeclarationDomain,
	) {
		if (node.name !== undefined)
			this.#scope.addVariable(
				(<ts.Identifier>node.name).text,
				<ts.Identifier>node.name,
				blockScoped
					? ScopeBoundarySelector.Block
					: ScopeBoundarySelector.Function,
				includesModifier(
					(node as ts.HasModifiers).modifiers,
					ts.SyntaxKind.ExportKeyword,
				),
				domain,
			);
	}

	#handleBindingName(
		name: ts.BindingName,
		blockScoped: boolean,
		exported: boolean,
	) {
		if (name.kind === ts.SyntaxKind.Identifier)
			return this.#scope.addVariable(
				name.text,
				name,
				blockScoped
					? ScopeBoundarySelector.Block
					: ScopeBoundarySelector.Function,
				exported,
				DeclarationDomain.Value,
			);
		forEachDestructuringIdentifier(name, (declaration) => {
			this.#scope.addVariable(
				declaration.name.text,
				declaration.name,
				blockScoped
					? ScopeBoundarySelector.Block
					: ScopeBoundarySelector.Function,
				exported,
				DeclarationDomain.Value,
			);
		});
	}

	#handleVariableDeclaration(declarationList: ts.VariableDeclarationList) {
		const blockScoped = isBlockScopedVariableDeclarationList(declarationList);
		const exported =
			declarationList.parent.kind === ts.SyntaxKind.VariableStatement &&
			includesModifier(
				declarationList.parent.modifiers,
				ts.SyntaxKind.ExportKeyword,
			);
		for (const declaration of declarationList.declarations)
			this.#handleBindingName(declaration.name, blockScoped, exported);
	}
}

function isNamespaceExported(node: ts.NamespaceDeclaration) {
	return (
		node.parent.kind === ts.SyntaxKind.ModuleDeclaration ||
		includesModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
	);
}

function namespaceHasExportStatement(ns: ts.ModuleDeclaration): boolean {
	if (ns.body === undefined || ns.body.kind !== ts.SyntaxKind.ModuleBlock)
		return false;
	return containsExportStatement(ns.body);
}

function containsExportStatement(block: ts.BlockLike): boolean {
	for (const statement of block.statements)
		if (
			statement.kind === ts.SyntaxKind.ExportDeclaration ||
			statement.kind === ts.SyntaxKind.ExportAssignment
		)
			return true;
	return false;
}

function isBlockScopedVariableDeclarationList(
	declarationList: ts.VariableDeclarationList,
): boolean {
	return (declarationList.flags & ts.NodeFlags.BlockScoped) !== 0;
}

function forEachDestructuringIdentifier<T>(
	pattern: ts.BindingPattern,
	fn: (element: ts.BindingElement & { name: ts.Identifier }) => T,
): T | undefined {
	for (const element of pattern.elements) {
		if (element.kind !== ts.SyntaxKind.BindingElement) continue;
		let result: T | undefined;
		if (element.name.kind === ts.SyntaxKind.Identifier) {
			result = fn(<ts.BindingElement & { name: ts.Identifier }>element);
		} else {
			result = forEachDestructuringIdentifier(element.name, fn);
		}
		if (result) return result;
	}
}
