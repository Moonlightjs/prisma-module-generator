import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase, pascalCase } from 'change-case';
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
  generateEnumImports,
  generatePrismaImport,
  getDecoratorsImportsByType,
  shouldImportPrisma,
} from './helpers';

export async function generateCreateInput(
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-create.input.ts`);
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
    namedImports: ['ApiProperty'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: '@moonlightjs/common',
    namedImports: ['IsNotNull', 'IsNotUndefined'],
  });

  sourceFile.addImportDeclaration({
    moduleSpecifier: `./${paramCase(model.name)}-where.input`,
    namedImports: [`${model.name}WhereUniqueInput`],
  });

  const relationImports = new Set<OptionalKind<ImportDeclarationStructure>>();
  model.fields.forEach((field) => {
    if (field.relationName && field.kind === 'object') {
      relationImports.add({
        moduleSpecifier: `../../${paramCase(field.type)}/dto/${paramCase(field.type)}-create.input`,
        namedImports: [getTSDataTypeInputFromRelationFieldType(model, field, dmmf)],
      });
    }
  });
  sourceFile.addImportDeclarations(Array.from(relationImports));

  generateEnumImports(sourceFile, model.fields);

  generateCreateBaseInput(sourceFile, model);

  model.fields.forEach((field) => {
    console.log(`model: ${model.name} field: `, field);
  });

  model.fields
    .filter((field) => field.kind === 'object' && dmmf.datamodel.models.some((model) => model.name === field.type))
    .forEach((field) => {
      generateCreateWithoutFieldInput(sourceFile, model, field, dmmf);
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        generateCreateNestedManyWithoutFieldInputOneToMany(sourceFile, model, field);
      } else {
        generateCreateNestedManyWithoutFieldInputManyToMany(sourceFile, model, field);
      }

      generateCreateNestedOneWithoutFieldInput(sourceFile, model, field);
      generateCreateOrConnectWithoutFieldInput(sourceFile, model, field);
      generateCreateManyFieldInputEnvelope(sourceFile, model, field);
      generateCreateManyFieldInput(sourceFile, model, field, dmmf);
    });

  generateModelCreateInput(sourceFile, model, dmmf);
}

export const generateCreateBaseInput = (sourceFile: SourceFile, model: PrismaDMMF.Model) => {
  sourceFile.addClass({
    name: `${model.name}CreateInputBase`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      ...model.fields
        .filter(
          (field) =>
            (['scalar', 'enum'].includes(field.kind) &&
              !model.fields.some(
                (iField) => iField.relationFromFields && iField.relationFromFields.includes(field.name),
              ) &&
              !(field.isId && field.hasDefaultValue)) ||
            field.kind === 'enum',
        )
        .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
          return {
            name: field.name,
            type: getTSDataTypeInputFromScalarAndEnumFieldType(field),
            hasExclamationToken: field.isRequired,
            hasQuestionToken: !field.isRequired,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsInputByScalarAndEnumFieldFieldType(field),
            isReadonly: true,
            scope: Scope.Public,
          };
        }),
    ],
  });
};

export const generateCreateManyFieldInputEnvelope = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
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

export const generateCreateWithoutFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
  dmmf: PrismaDMMF.Document,
) => {
  sourceFile.addClass({
    name: `${model.name}CreateWithout${pascalCase(filedIgnore.name)}Input`,
    extends: `${model.name}CreateInputBase`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      ...model.fields
        .filter((field) => field.kind === 'object' && field.relationName && field.name !== filedIgnore.name)
        .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
          return {
            name: field.name,
            type: getTSDataTypeInputFromRelationFieldType(model, field, dmmf),
            hasExclamationToken: field.isRequired && !field.isList,
            hasQuestionToken: !field.isRequired || field.isList,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsInputByRelationFieldType(model, field, dmmf),
            isReadonly: true,
            scope: Scope.Public,
          };
        }),
    ],
  });
};

export const generateCreateManyFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
  dmmf: PrismaDMMF.Document,
) => {
  sourceFile.addClass({
    name: `${model.name}CreateMany${pascalCase(filedIgnore.name)}Input`,
    extends: `${model.name}CreateInputBase`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      ...model.fields
        .filter(
          (field) =>
            ['scalar', 'enum'].includes(field.kind) &&
            model.fields.some((f) => f.relationFromFields && f.relationFromFields.includes(field.name)),
        )
        .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
          return {
            name: field.name,
            type: getTSDataTypeInputFromScalarAndEnumFieldType(field),
            hasExclamationToken: field.isRequired,
            hasQuestionToken: !field.isRequired,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsInputByScalarAndEnumFieldFieldType(field),
            isReadonly: true,
            scope: Scope.Public,
          };
        }),
    ],
  });
};

export const generateModelCreateInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
) => {
  sourceFile.addClass({
    name: `${model.name}CreateInput`,
    extends: `${model.name}CreateInputBase`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      ...model.fields
        .filter((field) => field.relationName)
        .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
          return {
            name: field.name,
            type: getTSDataTypeInputFromRelationFieldType(model, field, dmmf),
            hasExclamationToken: field.isRequired && !field.isList,
            hasQuestionToken: !field.isRequired || field.isList,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsInputByRelationFieldType(model, field, dmmf),
            isReadonly: true,
            scope: Scope.Public,
          };
        }),
    ],
  });
};

export const generateCreateOrConnectWithoutFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'where',
        type: `${model.name}WhereUniqueInput`,
        hasExclamationToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [`{ type: () => ${model.name}WhereUniqueInput, required: true, nullable: false }`],
          },
          {
            name: 'ValidateNested',
            arguments: [],
          },
          {
            name: 'Type',
            arguments: [`() => ${model.name}WhereUniqueInput`],
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
        name: 'create',
        type: `${model.name}CreateWithout${pascalCase(filedIgnore.name)}Input`,
        hasExclamationToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}CreateWithout${pascalCase(
                filedIgnore.name,
              )}Input, required: true, nullable: false }`,
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
            name: 'IsDefined',
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

export const generateCreateNestedManyWithoutFieldInputManyToMany = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
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
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
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

export const generateCreateNestedOneWithoutFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}CreateNestedOneWithout${pascalCase(filedIgnore.name)}Input`,
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
    ],
  });
};

// generate data type input
export const getTSDataTypeInputFromScalarAndEnumFieldType = (field: PrismaDMMF.Field) => {
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
      type = 'Prisma.InputJsonValue';
      break;
    case 'Bytes':
      type = `ArrayBuffer`;
      break;
    case 'BigInt':
      type = 'bigint';
      break;
    default:
      // #model
      if (field.kind === 'object') {
        console.log(`${field.name} is a relation field that references ${field.type}`);
        throw new Error('Not support relation field');
      } else {
        console.log(`${field.name} is a scalar field`);
        type = `${field.type}`;
      }
      break;
  }
  if (!field.isRequired) {
    if (field.type === 'Json') {
      type = `${type} | Prisma.NullableJsonNullValueInput`;
    } else {
      type = `${type} | null`;
    }
  }
  if (field.isList) {
    type = `${type}[]`;
  }
  return type;
};

export const getTSDataTypeInputFromRelationFieldType = (
  model: PrismaDMMF.Model,
  field: PrismaDMMF.Field,
  dmmf: PrismaDMMF.Document,
) => {
  if (field.kind === 'object' && field.relationName) {
    const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
    console.log('🚀 ~ file: generate-create-input.ts ~ relatedModel:', relatedModel?.name);
    if (!relatedModel) {
      throw new Error(`Model ${field.type} not found`);
    }
    const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
    if (relatedField !== undefined) {
      if (field.isList) {
        console.log(
          `${field.name} of ${model.name} is a foreign key field for relation many with ${relatedModel.name}`,
        );
        return `${relatedModel.name}CreateNestedManyWithout${pascalCase(relatedField.name)}Input`;
      } else {
        console.log(`${field.name} of ${model.name} is a foreign key field for relation one with ${relatedModel.name}`);
        return `${relatedModel.name}CreateNestedOneWithout${pascalCase(relatedField.name)}Input`;
      }
    }
  }
  console.log('Unknown relation type: ', field);
  throw new Error('Unknown relation type');
};

export const getDecoratorsInputByRelationFieldType = (
  model: PrismaDMMF.Model,
  field: PrismaDMMF.Field,
  dmmf: PrismaDMMF.Document,
) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  const type = getTSDataTypeInputFromRelationFieldType(model, field, dmmf);
  decorators.push({
    name: 'ApiProperty',
    arguments: [
      `{ type: () => ${type}, required: ${field.isRequired ? 'true' : 'false'}, nullable: ${
        field.isRequired ? 'false' : 'true'
      } }`,
    ],
  });
  decorators.push({
    name: 'ValidateNested',
    arguments: [],
  });
  decorators.push({
    name: 'Type',
    arguments: [`() => ${type}`],
  });

  if (field.isRequired && !field.isList) {
    decorators.push({
      name: 'IsDefined',
      arguments: [],
    });
  } else {
    decorators.push({
      name: 'IsOptional',
      arguments: [],
    });
  }
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};

export const getDecoratorsInputByScalarAndEnumFieldFieldType = (field: PrismaDMMF.Field) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  decorators.push(getDecoratorSwaggerInputByFieldType(field));
  switch (field.type) {
    case 'Int':
    case 'BigInt':
      decorators.push({
        name: 'IsInt',
        arguments: field.isList ? ['{ each: true }'] : [],
      });
      break;
    case 'DateTime':
      decorators.push({
        name: 'IsDate',
        arguments: field.isList ? ['{ each: true }'] : [],
      });
      break;
    case 'String':
      decorators.push({
        name: 'IsString',
        arguments: field.isList ? ['{ each: true }'] : [],
      });
      break;
    case 'Boolean':
      decorators.push({
        name: 'IsBoolean',
        arguments: field.isList ? ['{ each: true }'] : [],
      });
      break;
    case 'Float':
    case 'Decimal':
      decorators.push({
        name: 'IsNumber',
        arguments: field.isList ? ['{ each: true }'] : [],
      });
      break;
    case 'Bytes':
      break;
    case 'Json':
      decorators.push({
        name: 'IsJSON',
        arguments: [],
      });
      break;
    default:
      // model name
      if (field.kind === 'object') {
        console.log(`${field.name} is a relation field that references ${field.type}`);
        decorators.push({
          name: 'ValidateNested',
          arguments: field.isList ? ['{ each: true }'] : [],
        });
        decorators.push({
          name: 'Type',
          arguments: [`() => ${field.type}`],
        });
      } else {
        console.log(`${field.name} is a scalar field`);
      }
      break;
  }
  if (field.kind === 'enum') {
    decorators.push({
      name: 'IsEnum',
      arguments: [`${field.type}`],
    });
  }
  if (field.isRequired) {
    decorators.push({
      name: 'IsDefined',
      arguments: [],
    });
  } else {
    decorators.push({
      name: 'IsNotUndefined',
      arguments: [],
    });
  }
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};

export const getDecoratorSwaggerInputByFieldType = (field: PrismaDMMF.Field): OptionalKind<DecoratorStructure> => {
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
      }
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
