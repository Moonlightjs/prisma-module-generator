import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase, pascalCase } from 'change-case';
import * as path from 'path';
import { ImportDeclarationType, updateSetImports } from './helpers';
import { Project, Scope } from 'ts-morph';

export const generateUpdateOneWithoutFieldNestedInput = (
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
  extraModelImports: Set<ImportDeclarationType>,
) => {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(
    dirPath,
    `${paramCase(model.name)}-update-one-without-${paramCase(filedIgnore.name)}-nested.input.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: ['IsBoolean', 'IsOptional', 'ValidateNested'],
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
    moduleSpecifier: `./${paramCase(model.name)}-where.input`,
    namedImports: [`${model.name}WhereUniqueInput`],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-create.input`,
    namedImports: [
      `${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input`,
      `${model.name}CreateWithout${pascalCase(filedIgnore.name)}Input`,
    ],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-update.input`,
    namedImports: [`${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-upsert-without-${paramCase(filedIgnore.name)}.input`,
    namedImports: [`${model.name}UpsertWithout${pascalCase(filedIgnore.name)}Input`],
  });

  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}-update-one-without-${paramCase(
      filedIgnore.name,
    )}-nested.input`,
    namedImports: new Set([`${model.name}UpdateOneWithout${pascalCase(filedIgnore.name)}NestedInput`]),
  });

  sourceFile.addClass({
    name: `${model.name}UpdateOneWithout${pascalCase(filedIgnore.name)}NestedInput`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'create',
        type: `${model.name}CreateWithout${pascalCase(filedIgnore.name)}Input`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}CreateWithout${pascalCase(
                filedIgnore.name,
              )}Input, required: false, nullable: true }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}CreateWithout${pascalCase(filedIgnore.name)}Input`],
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
      {
        name: 'connectOrCreate',
        type: `${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}CreateOrConnectWithout${pascalCase(
                filedIgnore.name,
              )}Input, required: false, nullable: true }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input`],
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
      {
        name: 'connect',
        type: `${model.name}WhereUniqueInput`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereUniqueInput, required: false, nullable: true }`],
          },
          {
            name: 'ValidateNested',
            arguments: [''],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}WhereUniqueInput`],
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
      {
        name: 'upsert',
        type: `${model.name}UpsertWithout${pascalCase(filedIgnore.name)}Input`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpsertWithout${pascalCase(
                filedIgnore.name,
              )}Input, required: false, nullable: true }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}UpsertWithout${pascalCase(filedIgnore.name)}Input`],
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
      {
        name: 'disconnect',
        type: `boolean`,
        hasQuestionToken: true,
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
      {
        name: 'delete',
        type: `boolean`,
        hasQuestionToken: true,
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
      {
        name: 'update',
        type: `${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpdateWithout${pascalCase(
                filedIgnore.name,
              )}Input, required: false, nullable: true }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`],
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
