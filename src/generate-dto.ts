import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import {
  DecoratorStructure,
  ImportDeclarationStructure,
  OptionalKind,
  Project,
  PropertyDeclarationStructure,
  Scope,
} from 'ts-morph';
import {
  ImportDeclarationType,
  generateEnumImports,
  generatePrismaImport,
  getDefaultValueFromFieldType,
  shouldImportPrisma,
  updateSetImports,
} from './helpers';

export async function generateDto(
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  extraModelImports: Set<ImportDeclarationType>,
) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-full.dto.ts`);
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
    moduleSpecifier: '@nestjs/swagger',
    namedImports: ['ApiProperty'],
  });

  const relationImports = new Set<OptionalKind<ImportDeclarationStructure>>();
  model.fields.forEach((field) => {
    if (field.relationName && field.kind === 'object' && field.type !== model.name) {
      relationImports.add({
        moduleSpecifier: `../../${paramCase(field.type)}/dto/${paramCase(field.type)}.dto`,
        namedImports: [field.type + 'Dto'],
      });
    }
  });
  sourceFile.addImportDeclarations(Array.from(relationImports));

  generateEnumImports(sourceFile, model.fields);

  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}.dto`,
    namedImports: new Set([`${model.name}Dto`]),
  });

  sourceFile.addClass({
    name: `${model.name}FullDto`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      ...model.fields.map<OptionalKind<PropertyDeclarationStructure>>((field) => {
        return {
          name: field.name,
          type: getTSDataTypeDtoFromFieldType(field),
          hasExclamationToken: !field.default && field.isRequired,
          hasQuestionToken: !field.isRequired,
          trailingTrivia: '\r\n',
          decorators: getDecoratorsDtoByFieldType(field),
          initializer: field.default ? getDefaultValueFromFieldType(field) : undefined,
          isReadonly: true,
          scope: Scope.Public,
        };
      }),
    ],
  });
}

export const getTSDataTypeAdminDtoFromFieldType = (field: PrismaDMMF.Field) => {
  let type = field.type;
  switch (field.type) {
    case 'Int':
    case 'Float':
      type = 'number';
      break;
    case 'DateTime':
      type = 'Date';
      break;
    case 'String':
      type = 'string';
      break;
    case 'Boolean':
      type = 'boolean';
      break;
    case 'Decimal':
      type = 'any';
      break;
    case 'Json':
      type = 'Prisma.JsonValue';
      break;
    case 'BigInt':
      type = 'bigint';
      break;
    case 'Bytes':
      type = `ArrayBuffer`;
      break;
    default:
      // #model
      if (field.kind === 'object') {
        console.log(`${field.name} is a relation field that references ${field.type}`);
        type = `Admin${field.type}Dto`;
      } else {
        console.log(`${field.name} is a scalar field`);
        type = `${field.type}`;
      }
      break;
  }
  if (!field.isRequired) {
    type = `${type} | null`;
  }
  if (field.isList) {
    type = `${type}[]`;
  }
  return type;
};

export const getTSDataTypeDtoFromFieldType = (field: PrismaDMMF.Field) => {
  let type = field.type;
  switch (field.type) {
    case 'Int':
    case 'Float':
      type = 'number';
      break;
    case 'DateTime':
      type = 'Date';
      break;
    case 'String':
      type = 'string';
      break;
    case 'Boolean':
      type = 'boolean';
      break;
    case 'Decimal':
      type = 'any';
      break;
    case 'Json':
      type = 'Prisma.JsonValue';
      break;
    case 'BigInt':
      type = 'bigint';
      break;
    case 'Bytes':
      type = `ArrayBuffer`;
      break;
    default:
      // #model
      if (field.kind === 'object') {
        console.log(`${field.name} is a relation field that references ${field.type}`);
        type = `${field.type}Dto`;
      } else {
        console.log(`${field.name} is a scalar field`);
        type = `${field.type}`;
      }
      break;
  }
  if (!field.isRequired) {
    type = `${type} | null`;
  }
  if (field.isList) {
    type = `${type}[]`;
  }
  return type;
};

export const getDecoratorsAdminDtoByFieldType = (field: PrismaDMMF.Field) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  decorators.push(getDecoratorSwaggerAdminDtoByFieldType(field));
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};

export const getDecoratorSwaggerAdminDtoByFieldType = (field: PrismaDMMF.Field): OptionalKind<DecoratorStructure> => {
  const name = 'ApiProperty';
  let type = '';
  let required: 'true' | 'false' = 'true';
  let nullable: 'true' | 'false' = 'false';
  if (!field.isRequired) {
    required = 'false';
    nullable = 'true';
  }
  switch (field.type) {
    case 'Int':
    case 'BigInt':
      type = `'integer'`;
      break;
    case 'DateTime':
      type = `() => Date`;
      break;
    case 'String':
      type = `'string'`;
      break;
    case 'Boolean':
      type = `'boolean'`;
      break;
    case 'Float':
      type = `'float'`;
      break;
    case 'Decimal':
      type = `'double'`;
      break;
    case 'Bytes':
      type = `number'`;
      break;
    case 'Json':
      type = `'object'`;
      break;
    default:
      if (field.kind === 'enum') {
        type = `'string'`;
      } else if (field.kind === 'object') {
        type = `() => Admin${field.type}Dto`;
      }
      break;
  }
  return {
    name,
    arguments: [
      `{ type: ${type}, required: ${required}, nullable: ${nullable}${field.isList ? ', isArray: true' : ''}${
        field.kind === `enum` ? `, enum: ${field.type}` : ''
      } }`,
    ],
  };
};

export const getDecoratorsDtoByFieldType = (field: PrismaDMMF.Field) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  decorators.push(getDecoratorSwaggerDtoByFieldType(field));
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};

export const getDecoratorSwaggerDtoByFieldType = (field: PrismaDMMF.Field): OptionalKind<DecoratorStructure> => {
  const name = 'ApiProperty';
  let type = '';
  let required: 'true' | 'false' = 'true';
  let nullable: 'true' | 'false' = 'false';
  if (!field.isRequired) {
    required = 'false';
    nullable = 'true';
  }
  switch (field.type) {
    case 'Int':
    case 'BigInt':
      type = `'integer'`;
      break;
    case 'DateTime':
      type = `() => Date`;
      break;
    case 'String':
      type = `'string'`;
      break;
    case 'Boolean':
      type = `'boolean'`;
      break;
    case 'Float':
      type = `'float'`;
      break;
    case 'Decimal':
      type = `'double'`;
      break;
    case 'Bytes':
      type = `number'`;
      break;
    case 'Json':
      type = `'object'`;
      break;
    default:
      if (field.kind === 'enum') {
        type = `'string'`;
      } else if (field.kind === 'object') {
        type = `() => ${field.type}Dto`;
      }
      break;
  }
  return {
    name,
    arguments: [
      `{ type: ${type}, required: ${required}, nullable: ${nullable}${field.isList ? ', isArray: true' : ''}${
        field.kind === `enum` ? `, enum: ${field.type}` : ''
      } }`,
    ],
  };
};

export const generateDtosIndexFile = (project: Project, moduleDir: string, model: PrismaDMMF.Model) => {
  const modelName = model.name;
  const modelsBarrelExportSourceFile = project.createSourceFile(path.resolve(moduleDir, 'dto', 'index.ts'), undefined, {
    overwrite: true,
  });
  modelsBarrelExportSourceFile.addExportDeclarations([
    {
      moduleSpecifier: `./${paramCase(modelName)}-full.dto`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}-where.input`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}-order-by.input`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}-scalar-field.enum`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}-find.args`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}-create.input`,
    },
    {
      moduleSpecifier: `./${paramCase(modelName)}-update.input`,
    },
  ]);
};
