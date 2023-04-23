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
  SourceFile,
} from 'ts-morph';
import {
  generateClassValidatorImport,
  generateEnumImportsForWhereInput,
  generatePrismaImport,
  getDecoratorsImportsByType,
  shouldImportPrisma,
} from './helpers';
import {
  getDecoratorsInputByScalarAndEnumFieldFieldType,
  getTSDataTypeInputFromScalarAndEnumFieldType,
} from './generate-create-input';

export async function generateWhereInputs(
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-where.input.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  const validatorImports = [
    ...new Set(model.fields.map((field) => getDecoratorsImportsByType(field)).flatMap((item) => item)),
  ];

  generateClassValidatorImport(sourceFile, validatorImports as Array<string>);

  if (shouldImportPrisma(model.fields)) {
    generatePrismaImport(sourceFile);
  }

  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-transformer',
    namedImports: ['Type', 'Expose'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@nestjs/swagger',
    namedImports: ['ApiProperty', 'getSchemaPath'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@moonlightjs/common',
    namedImports: [
      'BoolFilter',
      'BoolNullableFilter',
      'DateTimeFilter',
      'DateTimeNullableFilter',
      'FloatFilter',
      'FloatNullableFilter',
      'IntFilter',
      'IntNullableFilter',
      'StringFilter',
      'StringNullableFilter',
      'IsNotNull',
      'IsNotUndefined',
      'getEnumValues',
    ],
  });

  const relationImports = new Set<OptionalKind<ImportDeclarationStructure>>();
  model.fields.forEach((field) => {
    if (field.relationName && field.kind === 'object') {
      relationImports.add({
        moduleSpecifier: `../../${paramCase(field.type)}/dto/${paramCase(field.type)}-where.input`,
        namedImports: getImportDeclarationsFromRelationType(field, dmmf),
      });
    }
  });

  sourceFile.addImportDeclarations(Array.from(relationImports));

  generateEnumImportsForWhereInput(sourceFile, model.fields);

  generateWhereInput(sourceFile, model, dmmf);
  generateScalarWhereInput(sourceFile, model);
  generateRelationFilter(sourceFile, model);
  generateWhereUniqueInput(sourceFile, model);
}

const generateWhereInput = (sourceFile: SourceFile, model: PrismaDMMF.Model, dmmf: PrismaDMMF.Document) => {
  const properties = model.fields
    .filter((field) => ['scalar', 'enum'].includes(field.kind) && field.type !== 'Json')
    .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
      const decorators = getDecoratorsWhereInputByScalarAndEnumType(field);
      return {
        name: field.name,
        type: getTSDataTypeWhereInputFromScalarAndEnumType(field),
        decorators,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
      };
    });
  model.fields
    .filter((field) => field.kind === 'object' && field.relationName)
    .forEach((field) => {
      const decorators = getDecoratorsWhereInputByRelationType(field, dmmf);
      properties.push({
        name: field.name,
        type: getTSDataTypeWhereInputFromRelationType(field, dmmf),
        decorators,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
      });
    });

  properties.unshift({
    name: 'NOT',
    type: `${model.name}WhereInput[]`,
    hasQuestionToken: true,
    trailingTrivia: '\r\n',
    scope: Scope.Public,
    decorators: [
      {
        name: 'ApiProperty',
        arguments: [`{ type: () => [${model.name}WhereInput], required: false, nullable: false, isArray: true }`],
      },
      {
        name: 'ValidateNested',
        arguments: [],
      },
      {
        name: 'IsArray',
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
  });
  properties.unshift({
    name: 'OR',
    type: `${model.name}WhereInput[]`,
    hasQuestionToken: true,
    trailingTrivia: '\r\n',
    scope: Scope.Public,
    decorators: [
      {
        name: 'ApiProperty',
        arguments: [`{ type: () => [${model.name}WhereInput], required: false, nullable: false, isArray: true }`],
      },
      {
        name: 'ValidateNested',
        arguments: [],
      },
      {
        name: 'IsArray',
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
  });
  properties.unshift({
    name: 'AND',
    type: `${model.name}WhereInput[]`,
    hasQuestionToken: true,
    trailingTrivia: '\r\n',
    scope: Scope.Public,
    decorators: [
      {
        name: 'ApiProperty',
        arguments: [`{ type: () => [${model.name}WhereInput], required: false, nullable: false, isArray: true }`],
      },
      {
        name: 'ValidateNested',
        arguments: [],
      },
      {
        name: 'IsArray',
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
  });

  sourceFile.addClass({
    name: `${model.name}WhereInput`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties,
  });
};

const generateScalarWhereInput = (sourceFile: SourceFile, model: PrismaDMMF.Model) => {
  const properties = model.fields
    .filter((field) => ['scalar', 'enum'].includes(field.kind) && field.type !== 'Json')
    .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
      const decorators = getDecoratorsWhereInputByScalarAndEnumType(field);
      return {
        name: field.name,
        type: getTSDataTypeWhereInputFromScalarAndEnumType(field),
        decorators,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
      };
    });

  properties.unshift({
    name: 'NOT',
    type: `${model.name}ScalarWhereInput[]`,
    hasQuestionToken: true,
    trailingTrivia: '\r\n',
    decorators: [
      {
        name: 'ApiProperty',
        arguments: [`{ type: () => [${model.name}ScalarWhereInput], required: false, nullable: false, isArray: true }`],
      },
      {
        name: 'ValidateNested',
        arguments: [],
      },
      {
        name: 'IsArray',
        arguments: [],
      },
      {
        name: 'IsNotNull',
        arguments: [],
      },
      {
        name: 'Type',
        arguments: [`() => ${model.name}ScalarWhereInput`],
      },
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    scope: Scope.Public,
  });
  properties.unshift({
    name: 'OR',
    type: `${model.name}ScalarWhereInput[]`,
    hasQuestionToken: true,
    trailingTrivia: '\r\n',
    decorators: [
      {
        name: 'ApiProperty',
        arguments: [`{ type: () => ${model.name}ScalarWhereInput, required: false, nullable: false, isArray: true }`],
      },
      {
        name: 'ValidateNested',
        arguments: [],
      },
      {
        name: 'IsArray',
        arguments: [],
      },
      {
        name: 'IsNotNull',
        arguments: [],
      },
      {
        name: 'Type',
        arguments: [`() => ${model.name}ScalarWhereInput`],
      },
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    scope: Scope.Public,
  });
  properties.unshift({
    name: 'AND',
    type: `${model.name}ScalarWhereInput[]`,
    hasQuestionToken: true,
    trailingTrivia: '\r\n',
    decorators: [
      {
        name: 'ApiProperty',
        arguments: [`{ type: () => [${model.name}ScalarWhereInput], required: false, nullable: false, isArray: true }`],
      },
      {
        name: 'ValidateNested',
        arguments: [],
      },
      {
        name: 'IsArray',
        arguments: [],
      },
      {
        name: 'IsNotNull',
        arguments: [],
      },
      {
        name: 'Type',
        arguments: [`() => ${model.name}ScalarWhereInput`],
      },
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    scope: Scope.Public,
  });

  sourceFile.addClass({
    name: `${model.name}ScalarWhereInput`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties,
  });
};

function generateRelationFilter(sourceFile: SourceFile, model: PrismaDMMF.Model) {
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

export const generateWhereUniqueInput = (sourceFile: SourceFile, model: PrismaDMMF.Model) => {
  sourceFile.addClass({
    name: `${model.name}WhereUniqueInput`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      ...model.fields
        .filter((field) => field.isId || field.isUnique)
        .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
          return {
            name: field.name,
            type: getTSDataTypeInputFromScalarAndEnumFieldType(field),
            hasExclamationToken: field.isRequired,
            hasQuestionToken: !field.isRequired,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsInputByScalarAndEnumFieldFieldType(field),
            scope: Scope.Public,
          };
        }),
    ],
  });
};
//
export const getTSDataTypeWhereInputFromScalarAndEnumType = (field: PrismaDMMF.Field) => {
  let type = 'any';
  if (field.isRequired) {
    switch (field.type) {
      case 'Int':
        type = 'IntFilter | number';
        break;
      case 'Float':
        type = 'FloatFilter | number';
        break;
      case 'DateTime':
        type = 'DateTimeFilter | Date | string';
        break;
      case 'String':
        type = 'StringFilter | string';
        break;
      case 'Boolean':
        type = 'BoolFilter | boolean';
        break;
      case 'Decimal':
        type = 'FloatFilter | number | string';
        break;
      case 'BigInt':
        type = 'IntFilter | bigint | number';
        break;
      default:
        // enum field
        console.log(`${field.name} is a scalar field`);
        type = `Enum${field.type}Filter | ${field.type}`;
        break;
    }
  } else {
    switch (field.type) {
      case 'Int':
        type = 'IntNullableFilter | number | null';
        break;
      case 'Float':
        type = 'FloatNullableFilter | number | null';
        break;
      case 'Decimal':
        type = 'FloatNullableFilter | number | string | null';
        break;
      case 'DateTime':
        type = 'DateTimeNullableFilter | Date | string | null';
        break;
      case 'String':
        type = 'StringNullableFilter | string | null';
        break;
      case 'Boolean':
        type = 'BoolNullableFilter | boolean | null';
        break;
      case 'BigInt':
        type = 'IntNullableFilter | bigint | number | null';
        break;
      default:
        // enum field
        console.log(`${field.name} is a scalar field`);
        type = `Enum${field.type}NullableFilter | ${field.type} | null`;
        break;
    }
  }

  return type;
};

export const getDecoratorsWhereInputByScalarAndEnumType = (field: PrismaDMMF.Field) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  if (field.isRequired) {
    switch (field.type) {
      case 'Int':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(IntFilter) }, { type: 'number' }], example: { not: { equals: 10 } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => IntFilter`],
        });
        break;
      case 'Float':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(FloatFilter) }, { type: 'number' }], example: { not: { equals: 10.1 } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => FloatFilter`],
        });
        break;
      case 'DateTime':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(DateTimeFilter) }, { type: 'string' }],  example: { not: { equals: '2022-01-01T00:00:00.000Z' } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => DateTimeFilter`],
        });
        break;
      case 'String':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(StringFilter) }, { type: 'string' }], example: { not: { equals: 'example' } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => StringFilter`],
        });
        break;
      case 'Boolean':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(BoolFilter) }, { type: 'boolean' }], example: { not: { equals: true } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => BoolFilter`],
        });
        break;
      case 'Decimal':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(FloatFilter) }, { type: 'number' }, { type: 'string' }], example: { not: { equals: 10.1 } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => FloatFilter`],
        });
        break;
      case 'BigInt':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(IntFilter) }, { type: 'number' }, { type: 'bigint' }], example: { not: { equals: 10 } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => IntFilter`],
        });
        break;
      default:
        // enum field
        console.log(`${field.name} is a enum field`);
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(Enum${field.type}Filter) }, { type: 'string', enum: getEnumValues(${field.type}) }], example: getEnumValues(${field.type}).length ? { not: { equals: getEnumValues(${field.type})[0] } } : undefined, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => Enum${field.type}Filter`],
        });
        break;
    }
    decorators.push({
      name: 'IsNotNull',
      arguments: [],
    });
  } else {
    switch (field.type) {
      case 'Int':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(IntNullableFilter) }, { type: 'number' }], example: { not: { equals: 10 } }, required: false, nullable: true }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => IntNullableFilter`],
        });
        break;
      case 'Float':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(FloatNullableFilter) }, { type: 'number' }], example: { not: { equals: 10.1 } }, required: false, nullable: true }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => FloatNullableFilter`],
        });
        break;
      case 'Decimal':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(FloatNullableFilter) }, { type: 'number' }, { type: 'string' }], example: { not: { equals: 10.1 } }, required: false, nullable: true }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => FloatNullableFilter`],
        });
        break;
      case 'DateTime':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(DateTimeNullableFilter) }, { type: 'string' }], example: { not: { equals: '2022-01-01T00:00:00.000Z' } }, required: false, nullable: true }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => DateTimeNullableFilter`],
        });
        break;
      case 'String':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(StringNullableFilter) }, { type: 'string' }], example: { not: { equals: 'example' } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => StringNullableFilter`],
        });
        break;
      case 'Boolean':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(BoolNullableFilter) }, { type: 'boolean' }], example: { not: { equals: true } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => BoolNullableFilter`],
        });
        break;
      case 'BigInt':
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(IntNullableFilter) }, { type: 'number' }, { type: 'bigint' }], example: { not: { equals: 10 } }, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => IntNullableFilter`],
        });
        break;
      default:
        // enum field
        console.log(`${field.name} is a enum field`);
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(Enum${field.type}NullableFilter) }, { type: 'string', enum: getEnumValues(${field.type}) }], example: getEnumValues(${field.type}).length ? { not: { equals: getEnumValues(${field.type})[0] } } : undefined, required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => Enum${field.type}NullableFilter`],
        });
        break;
    }
    decorators.push({
      name: 'IsOptional',
      arguments: [],
    });
  }
  decorators.push({
    name: 'ValidateNested',
    arguments: [],
  });
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};

export const getTSDataTypeWhereInputFromRelationType = (field: PrismaDMMF.Field, dmmf: PrismaDMMF.Document) => {
  if (field.kind === 'object' && field.relationName) {
    const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
    if (!relatedModel) {
      throw new Error(`Model ${field.type} not found`);
    }
    const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
    if (relatedField !== undefined) {
      if (field.isList) {
        return `${relatedModel.name}ListRelationFilter`;
      } else {
        return `${relatedModel.name}RelationFilter | ${relatedModel.name}WhereInput`;
      }
    }
  }
  console.log('Unknown relation type: ', field);
  throw new Error('Unknown relation type');
};

export const getDecoratorsWhereInputByRelationType = (field: PrismaDMMF.Field, dmmf: PrismaDMMF.Document) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  if (field.kind === 'object' && field.relationName) {
    const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
    if (!relatedModel) {
      throw new Error(`Model ${field.type} not found`);
    }
    const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
    if (relatedField !== undefined) {
      if (field.isList) {
        decorators.push({
          name: 'ApiProperty',
          arguments: [`{ type: () => ${relatedModel.name}ListRelationFilter, required: false, nullable: false }`],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => ${relatedModel.name}ListRelationFilter`],
        });
      } else {
        decorators.push({
          name: 'ApiProperty',
          arguments: [
            `{ oneOf: [{ $ref: getSchemaPath(${relatedModel.name}RelationFilter) }, { $ref: getSchemaPath(${relatedModel.name}WhereInput) }], required: false, nullable: false }`,
          ],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => ${relatedModel.name}RelationFilter`],
        });
      }
    }
  }
  decorators.push({
    name: 'IsNotNull',
    arguments: [],
  });
  decorators.push({
    name: 'ValidateNested',
    arguments: [],
  });
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};

export const getImportDeclarationsFromRelationType = (field: PrismaDMMF.Field, dmmf: PrismaDMMF.Document) => {
  if (field.kind === 'object' && field.relationName) {
    const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
    if (!relatedModel) {
      throw new Error(`Model ${field.type} not found`);
    }
    const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
    if (relatedField !== undefined) {
      if (field.isList) {
        return [`${relatedModel.name}ListRelationFilter`];
      } else {
        return [`${relatedModel.name}RelationFilter`, `${relatedModel.name}WhereInput`];
      }
    }
  }
  console.log('Unknown relation type: ', field);
  throw new Error('Unknown relation type');
};
