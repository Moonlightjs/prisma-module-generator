import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase, pascalCase } from 'change-case';
import * as path from 'path';
import { ImportDeclarationType, updateSetImports } from './helpers';
import { Project, Scope } from 'ts-morph';

export const generateCreateManyFieldInputEnvelope = (
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
  extraModelImports: Set<ImportDeclarationType>,
) => {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(
    dirPath,
    `${paramCase(model.name)}-create-many-${paramCase(filedIgnore.name)}.input-envelope.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: ['IsBoolean', 'IsOptional', 'IsDefined', 'IsArray', 'ValidateNested'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-transformer',
    namedImports: ['Type', 'Expose'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@nestjs/swagger',
    namedImports: ['ApiProperty'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-create.input`,
    namedImports: [`${model.name}CreateMany${pascalCase(filedIgnore.name)}Input`],
  });

  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}-create-many-${paramCase(
      filedIgnore.name,
    )}.input-envelope`,
    namedImports: new Set([`${model.name}CreateMany${pascalCase(filedIgnore.name)}InputEnvelope`]),
  });

  sourceFile.addClass({
    name: `${model.name}CreateMany${pascalCase(filedIgnore.name)}InputEnvelope`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'data',
        type: `${model.name}CreateMany${pascalCase(filedIgnore.name)}Input`,
        hasExclamationToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}CreateMany${pascalCase(
                filedIgnore.name,
              )}Input, required: true, nullable: false, isArray: true }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: ['{ each: true }'],
          },
          {
            name: 'IsArray',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}CreateMany${pascalCase(filedIgnore.name)}Input`],
          },
          {
            name: 'IsDefined',
            arguments: [],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'skipDuplicates',
        type: 'boolean',
        hasExclamationToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: 'boolean', required: false, nullable: true }`],
          },
          {
            name: 'IsBoolean',
            arguments: [],
          },
          {
            name: 'IsOptional',
            arguments: [],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
    ],
  });
};
