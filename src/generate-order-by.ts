import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import {
  Scope,
  ImportDeclarationStructure,
  OptionalKind,
  Project,
  PropertyDeclarationStructure,
  SourceFile,
  DecoratorStructure,
} from 'ts-morph';
import { generatePrismaImport, shouldImportPrisma } from './helpers';

export async function generateOrderByInput(
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-order-by.input.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  if (shouldImportPrisma(model.fields)) {
    generatePrismaImport(sourceFile);
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-transformer',
    namedImports: ['Type', 'Expose'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: ['IsEnum', 'ValidateNested'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@nestjs/swagger',
    namedImports: ['ApiProperty'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@moonlightjs/common',
    namedImports: ['SortOrder', 'OrderByRelationAggregateInput', 'IsNotNull'],
  });

  const relationImports = new Set<OptionalKind<ImportDeclarationStructure>>();
  model.fields.forEach((field) => {
    if (field.relationName && field.kind === 'object') {
      const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
      if (!relatedModel) {
        throw new Error(`Model ${field.type} not found`);
      }
      const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
      if (relatedField !== undefined) {
        if (!field.isList) {
          relationImports.add({
            moduleSpecifier: `../../${paramCase(field.type)}/dto/${paramCase(field.type)}-order-by.input`,
            namedImports: [`${relatedModel.name}OrderByWithRelationInput`],
          });
        }
      }
    }
  });

  sourceFile.addImportDeclarations(Array.from(relationImports));

  generateOrderByWithRelationInput(sourceFile, model, dmmf);
}

const generateOrderByWithRelationInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
) => {
  sourceFile.addClass({
    name: `${model.name}OrderByWithRelationInput`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: model.fields.map<OptionalKind<PropertyDeclarationStructure>>((field) => {
      const decorators = getDecoratorsOrderByType(field, dmmf);
      return {
        name: field.name,
        type: getOrderByType(field, dmmf),
        decorators,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
      };
    }),
  });
};

const getOrderByType = (field: PrismaDMMF.Field, dmmf: PrismaDMMF.Document) => {
  if (['scalar', 'enum'].includes(field.kind)) {
    return `SortOrder`;
  } else if (field.kind === 'object' && field.relationName) {
    const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
    if (!relatedModel) {
      throw new Error(`Model ${field.type} not found`);
    }
    const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
    if (relatedField !== undefined) {
      if (field.isList) {
        return `OrderByRelationAggregateInput`;
      } else {
        return `${relatedModel.name}OrderByWithRelationInput`;
      }
    }
  }
  throw new Error(`Unknown field kind: ${field.kind}`);
};

const getDecoratorsOrderByType = (field: PrismaDMMF.Field, dmmf: PrismaDMMF.Document) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  if (['scalar', 'enum'].includes(field.kind)) {
    decorators.push({
      name: 'ApiProperty',
      arguments: [`{ type: 'string', enum: SortOrder, required: false, nullable: false }`],
    });
    decorators.push({
      name: 'IsEnum',
      arguments: [`SortOrder`],
    });
  } else if (field.kind === 'object' && field.relationName) {
    const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
    if (!relatedModel) {
      throw new Error(`Model ${field.type} not found`);
    }
    const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
    if (relatedField !== undefined) {
      if (field.isList) {
        decorators.push({
          name: 'ApiProperty',
          arguments: [`{ type: () => OrderByRelationAggregateInput, required: false, nullable: false }`],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => OrderByRelationAggregateInput`],
        });
      } else {
        decorators.push({
          name: 'ApiProperty',
          arguments: [`{ type: () => ${relatedModel.name}OrderByWithRelationInput, required: false, nullable: false }`],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => ${relatedModel.name}OrderByWithRelationInput`],
        });
      }
      decorators.push({
        name: 'ValidateNested',
        arguments: [],
      });
    }
  }
  decorators.push({
    name: 'IsNotNull',
    arguments: [],
  });
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};
