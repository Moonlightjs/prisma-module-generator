import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import path from 'path';
import { ImportDeclarationType, updateSetImports } from './helpers';
import { Project, Scope } from 'ts-morph';

export async function generateRelationFilter(
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  extraModelImports: Set<ImportDeclarationType>,
) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-relation.filter.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: ['ValidateNested'],
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
    moduleSpecifier: '@moonlightjs/common',
    namedImports: ['IsNotNull'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-where.input`,
    namedImports: [`${model.name}WhereInput`],
  });

  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}-relation.filter`,
    namedImports: new Set([`${model.name}ListRelationFilter`, `${model.name}RelationFilter`]),
  });

  sourceFile.addClass({
    name: `${model.name}ListRelationFilter`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'every',
        type: `${model.name}WhereInput`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereInput, required: false, nullable: false }`],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}WhereInput`],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'some',
        type: `${model.name}WhereInput`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereInput, required: false, nullable: false }`],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}WhereInput`],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'none',
        type: `${model.name}WhereInput`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereInput, required: false, nullable: false }`],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}WhereInput`],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
    ],
  });

  sourceFile.addClass({
    name: `${model.name}RelationFilter`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'is',
        type: `${model.name}WhereInput`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereInput, required: false, nullable: false }`],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}WhereInput`],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'isNot',
        type: `${model.name}WhereInput`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereInput, required: false, nullable: false }`],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}WhereInput`],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
    ],
  });
}
