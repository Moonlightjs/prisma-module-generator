import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import { OptionalKind, Project, PropertyDeclarationStructure, Scope, SourceFile } from 'ts-morph';
import {
  generateClassValidatorImport,
  generatePrismaImport,
  getDecoratorsImportsByType,
  shouldImportPrisma,
} from './helpers';

export async function generateFindArgs(project: Project, moduleDir: string, model: PrismaDMMF.Model) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-find.args.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: ['IsEnum', 'IsInt', 'ValidateNested'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-transformer',
    namedImports: ['Type', 'Expose'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@nestjs/swagger',
    namedImports: ['ApiProperty', 'getSchemaPath'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-where.input`,
    namedImports: [`${model.name}WhereUniqueInput`, `${model.name}WhereInput`],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-order-by.input`,
    namedImports: [`${model.name}OrderByWithRelationInput`],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-scalar-field.enum`,
    namedImports: [`${model.name}ScalarFieldEnum`],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@moonlightjs/common',
    namedImports: ['IsNotNull', 'getEnumValues'],
  });

  generateFindFirstArgs(sourceFile, model);
  generateFindManyArgs(sourceFile, model);
}

const generateFindFirstArgs = (sourceFile: SourceFile, model: PrismaDMMF.Model) => {
  sourceFile.addClass({
    name: `${model.name}FindFirstArgs`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'select',
        type: 'any',
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: 'object', required: false, nullable: false }`],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'include',
        type: 'any',
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: 'object', required: false, nullable: false }`],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'where',
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
        name: 'orderBy',
        type: `${model.name}OrderByWithRelationInput | ${model.name}OrderByWithRelationInput[]`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ oneOf: [{ $ref: getSchemaPath(${model.name}OrderByWithRelationInput) }, { type: 'array', items: { $ref: getSchemaPath(${model.name}OrderByWithRelationInput) } }], required: false, nullable: false }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: ['{ each: true }'],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}OrderByWithRelationInput`],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'cursor',
        type: `${model.name}WhereUniqueInput`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereUniqueInput, required: false, nullable: false }`],
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
            arguments: [`() => ${model.name}WhereUniqueInput`],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'skip',
        type: 'number',
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: 'number', required: false, nullable: false }`],
          },
          {
            name: 'IsInt',
            arguments: [],
          },
          {
            name: 'IsNotNull',
            arguments: [],
          },
          {
            name: 'Expose',
            arguments: [],
          },
        ],
      },
      {
        name: 'distinct',
        type: `${model.name}ScalarFieldEnum[] | ${model.name}ScalarFieldEnum`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ oneOf: [{ type: 'string', enum: getEnumValues(${model.name}ScalarFieldEnum) }, { type: 'array', items: { type: 'string', enum: getEnumValues(${model.name}ScalarFieldEnum) } }], required: false, nullable: false }`,
            ],
          },
          {
            name: 'ValidateNested',
            arguments: ['{ each: true }'],
          },
          {
            name: 'IsEnum',
            arguments: [`${model.name}ScalarFieldEnum`, `{ each: true }`],
          },
          {
            name: 'IsNotNull',
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

const generateFindManyArgs = (sourceFile: SourceFile, model: PrismaDMMF.Model) => {
  sourceFile.addClass({
    name: `${model.name}FindManyArgs`,
    isExported: true,
    extends: `${model.name}FindFirstArgs`,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'skip',
        type: 'number',
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: 'number', required: false, nullable: false }`],
          },
          {
            name: 'IsInt',
            arguments: [],
          },
          {
            name: 'IsNotNull',
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
