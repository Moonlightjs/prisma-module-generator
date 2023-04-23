import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import { Project } from 'ts-morph';

export function generateModuleFile(project: Project, moduleDir: string, model: PrismaDMMF.Model) {
  const filePath = path.resolve(moduleDir, `${paramCase(model.name)}.module.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addStatements(/* ts */ `
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ${model.name}Controller } from './${paramCase(model.name)}.controller';
import { ${model.name}Service } from './${paramCase(model.name)}.service';

@Module({
  imports: [ConfigModule],
  controllers: [${model.name}Controller],
  providers: [${model.name}Service],
  exports: [${model.name}Service],
})
export class ${model.name}Module {}`);
}

export const generateModuleIndexFile = (project: Project, moduleDir: string, model: PrismaDMMF.Model) => {
  const modelName = model.name;
  const modelsBarrelExportSourceFile = project.createSourceFile(path.resolve(moduleDir, 'index.ts'), undefined, {
    overwrite: true,
  });
  modelsBarrelExportSourceFile.addExportDeclarations([
    {
      moduleSpecifier: `./dto`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}.controller`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}.service`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}.module`,
    },
  ]);
};
