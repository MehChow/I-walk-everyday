/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

function screens(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? screens(path) : entry.name.endsWith('.tsx') ? [path] : [];
  });
}

it('never sends percentage dimensions to Expo UI native modifiers', () => {
  const invalid: string[] = [];
  for (const path of screens('src')) {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const controls = new Set<string>();
    const styles = new Map<string, ts.ObjectLiteralExpression>();
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.getText(source) === "'@expo/ui'") {
        const imports = statement.importClause?.namedBindings;
        if (imports && ts.isNamedImports(imports)) {
          for (const item of imports.elements) {
            // Host is a React Native layout boundary, so percentages are valid there.
            if ((item.propertyName ?? item.name).text !== 'Host') controls.add(item.name.text);
          }
        }
      }
    }
    function collect(node: ts.Node) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isCallExpression(node.initializer)
        && node.initializer.expression.getText(source) === 'StyleSheet.create') {
        const object = node.initializer.arguments[0];
        if (object && ts.isObjectLiteralExpression(object)) {
          for (const property of object.properties) {
            if (ts.isPropertyAssignment(property) && ts.isObjectLiteralExpression(property.initializer)) {
              styles.set(`${node.name.text}.${property.name.getText(source)}`, property.initializer);
            }
          }
        }
      }
      ts.forEachChild(node, collect);
    }
    collect(source);
    function inspect(node: ts.Node) {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && controls.has(node.tagName.getText(source))) {
        for (const attribute of node.attributes.properties) {
          if (!ts.isJsxAttribute(attribute) || attribute.name.getText(source) !== 'style'
            || !attribute.initializer || !ts.isJsxExpression(attribute.initializer) || !attribute.initializer.expression) continue;
          const expression = attribute.initializer.expression;
          const style = ts.isObjectLiteralExpression(expression) ? expression : styles.get(expression.getText(source));
          if (!style) continue;
          for (const property of style.properties) {
            if (ts.isPropertyAssignment(property) && ['width', 'height'].includes(property.name.getText(source))
              && ts.isStringLiteral(property.initializer)) {
              invalid.push(`${path}: ${node.tagName.getText(source)} ${property.name.getText(source)}=${property.initializer.text}`);
            }
          }
        }
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
  expect(invalid).toEqual([]);
});
