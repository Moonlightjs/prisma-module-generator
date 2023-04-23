import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import { EnumMemberStructure, OptionalKind, Project } from 'ts-morph';

export default function generateEnum(project: Project, outputDir: string, enumItem: PrismaDMMF.DatamodelEnum) {
  const dirPath = path.resolve(outputDir, 'enums');
  const filePath = path.resolve(dirPath, `${paramCase(enumItem.name)}.enum.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addEnum({
    isExported: true,
    name: enumItem.name,
    members: enumItem.values.map<OptionalKind<EnumMemberStructure>>(({ name }) => ({
      name,
      value: name,
    })),
  });
}
