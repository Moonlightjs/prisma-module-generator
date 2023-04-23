import { paramCase } from 'change-case';
import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import * as path from 'path';
import { OptionalKind, Project, EnumMemberStructure } from 'ts-morph';

export async function generateScalarFieldEnum(project: Project, moduleDir: string, model: PrismaDMMF.Model) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-scalar-field.enum.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addEnum({
    isExported: true,
    name: `${model.name}ScalarFieldEnum`,
    members: model.fields
      .filter((field) => ['scalar', 'enum'].includes(field.kind))
      .map<OptionalKind<EnumMemberStructure>>(({ name }) => ({
        name: name,
        value: name,
      })),
  });
}
