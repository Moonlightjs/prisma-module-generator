import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import { Project, VariableDeclarationKind } from 'ts-morph';
import { ImportDeclarationType } from './helpers';

export default function generateNamespaceExtraModels(
  project: Project,
  outputDir: string,
  extraModelImports: Set<ImportDeclarationType>,
) {
  const filePath = path.resolve(outputDir, `index.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  const allModels: string[] = [];
  extraModelImports.forEach((importDeclaration) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: importDeclaration.moduleSpecifier,
      namedImports: [...importDeclaration.namedImports],
    });
    allModels.push(...importDeclaration.namedImports);
  });

  sourceFile.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: 'extraModels',
        initializer: `[${allModels.join(', ')}]`,
      },
    ],
  });
}
