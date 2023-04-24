import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase, pascalCase } from 'change-case';
import * as path from 'path';
import { Project, Scope } from 'ts-morph';

export const generateCreateNestedManyWithoutFieldInputManyToMany = (
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(
    dirPath,
    `${paramCase(model.name)}-create-nested-many-without-${paramCase(filedIgnore.name)}.input.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: ['IsArray', 'IsOptional', 'ValidateNested'],
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

  sourceFile.addClass({
    name: `${model.name}CreateNestedManyWithout${pascalCase(filedIgnore.name)}Input`,
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
        type: `${model.name}CreateWithout${pascalCase(filedIgnore.name)}Input[]`,
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
              )}Input, required: false, nullable: true, isArray: true }`,
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
        type: `${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input[]`,
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
              )}Input, required: false, nullable: true, isArray: true }`,
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
        type: `${model.name}WhereUniqueInput[]`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}WhereUniqueInput, required: false, nullable: true, isArray: true }`,
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
    ],
  });
};

export const generateCreateNestedManyWithoutFieldInputOneToMany = (
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(
    dirPath,
    `${paramCase(model.name)}-create-nested-many-without-${paramCase(filedIgnore.name)}.input.ts`,
  );
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: ['IsArray', 'IsOptional', 'ValidateNested'],
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
    moduleSpecifier: `./${paramCase(model.name)}-create-many-${paramCase(filedIgnore.name)}.input-envelope`,
    namedImports: [`${model.name}CreateMany${pascalCase(filedIgnore.name)}InputEnvelope`],
  });

  sourceFile.addClass({
    name: `${model.name}CreateNestedManyWithout${pascalCase(filedIgnore.name)}Input`,
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
        type: `${model.name}CreateWithout${pascalCase(filedIgnore.name)}Input[]`,
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
              )}Input, required: false, nullable: true, isArray: true }`,
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
        type: `${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input[]`,
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
              )}Input, required: false, nullable: true, isArray: true }`,
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
        name: 'createMany',
        type: `${model.name}CreateMany${pascalCase(filedIgnore.name)}InputEnvelope`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}CreateMany${pascalCase(
                filedIgnore.name,
              )}InputEnvelope, required: false, nullable: true, }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}CreateMany${pascalCase(filedIgnore.name)}InputEnvelope`],
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
        type: `${model.name}WhereUniqueInput[]`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}WhereUniqueInput, required: false, nullable: true, isArray: true }`,
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
    ],
  });
};
