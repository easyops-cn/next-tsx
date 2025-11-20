import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import type {
  ContextReference,
  ParsedApp,
  ParsedModule,
} from "./interfaces.js";
import { resolveImportSource } from "./resolveImportSource.js";

export function getContextReference(
  path: NodePath<t.Identifier | t.JSXIdentifier>,
  state: ParsedModule,
  app: ParsedApp
): ContextReference | null {
  if (!path.isReferencedIdentifier()) {
    return null;
  }

  const contextName = path.node.name;
  const binding = path.scope.getBinding(contextName);
  if (!binding) {
    return null;
  }

  const topLevelBinding = state.topLevelBindings.get(binding.identifier);
  if (topLevelBinding) {
    if (topLevelBinding.kind === "context") {
      return {
        type: "local",
        name: contextName,
      };
    }
    state.errors.push({
      message: `The identifier "${contextName}" is not a context.`,
      node: binding.identifier,
      severity: "error",
    });
    return null;
  }

  if (binding.kind === "module") {
    if (
      binding.path.isImportSpecifier() &&
      binding.path.parentPath.isImportDeclaration()
    ) {
      const imported = binding.path.get("imported");
      if (!imported.isIdentifier()) {
        state.errors.push({
          message: `Unsupported import specifier type: ${imported.type}`,
          node: imported.node,
          severity: "error",
        });
        return null;
      }
      const source = binding.path.parentPath.get("source");
      return {
        type: "imported",
        name: imported.node.name,
        importSource: resolveImportSource(
          source.node.value,
          state.filePath,
          app.files
        ),
      };
    }
  }

  state.errors.push({
    message: `Unsupported context binding for "${contextName}"`,
    node: binding.identifier,
    severity: "error",
  });

  return null;
}

export function getContextReferenceEventAgentId(refName: string) {
  return `context-agent-${refName}`;
}
