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
import { getTSDataTypeInputFromScalarAndEnumFieldType } from './generate-create-input';
import {
  generateClassValidatorImport,
  generateEnumImports,
  generatePrismaImport,
  getDecoratorsImportsByType,
  shouldImportPrisma,
} from './helpers';

export function generateUpdateInput(
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
) {
  const dirPath = path.resolve(moduleDir, 'dto');
  const filePath = path.resolve(dirPath, `${paramCase(model.name)}-update.input.ts`);
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

  generateEnumImports(sourceFile, model.fields);

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
      console.log(`🚀 ~ file: generate-update-input.ts:93 ~ model ${model.name} ~ field:`, field);
      relationImports.add({
        moduleSpecifier: `../../${paramCase(field.type)}/dto/${paramCase(field.type)}-update.input`,
        namedImports: [getTSDataTypeUpdateInputFromRelationFieldType(model, field, dmmf)],
      });
    }
  });
  sourceFile.addImportDeclarations(Array.from(relationImports));

  generateUpdateBaseInput(sourceFile, model);

  model.fields
    .filter((field) => field.kind === 'object' && dmmf.datamodel.models.some((model) => model.name === field.type))
    .forEach((field) => {
      const relationCreateImports = new Set<string>();
      relationCreateImports.add(`${model.name}CreateWithout${pascalCase(field.name)}Input`);
      relationCreateImports.add(`${model.name}CreateOrConnectWithout${pascalCase(field.name)}Input`);
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        relationCreateImports.add(`${model.name}CreateMany${pascalCase(field.name)}InputEnvelope`);
      }
      sourceFile.addImportDeclaration({
        moduleSpecifier: `./${paramCase(model.name)}-create.input`,
        namedImports: Array.from(relationCreateImports),
      });

      generateUpdateWithoutFieldInput(sourceFile, model, field, dmmf);
      generateUpdateWithWhereUniqueWithoutFieldInput(sourceFile, model, field);

      if (field.isList) {
        let createUpdateInputRequired = false;
        const relateModel = dmmf.datamodel.models.find((model) => model.name === field.type);
        if (relateModel) {
          const relationField = relateModel.fields.find((f) => f.relationName === field.relationName);
          if (relationField) {
            if (!relationField.isList && relationField.isRequired) {
              createUpdateInputRequired = true;
            }
          }
        }
        if (createUpdateInputRequired) {
          generateUpdateOneRequiredWithoutFieldNestedInput(sourceFile, model, field);
        } else {
          generateUpdateOneWithoutFieldNestedInput(sourceFile, model, field);
        }
      } else {
        if (field.relationFromFields && field.relationFromFields.length > 0) {
          generateUpdateManyWithoutFieldNestedInputOneToMany(sourceFile, model, field);
        } else {
          generateUpdateManyWithoutFieldNestedInputManyToMany(sourceFile, model, field);
        }
      }
      if (field.isList) {
        generateUpsertWithoutFieldInput(sourceFile, model, field);
      } else {
        generateUpsertWithWhereUniqueWithoutFieldInput(sourceFile, model, field);
      }
    });

  generateModelUpdateInput(sourceFile, model, dmmf);
}

export const generateUpdateBaseInput = (sourceFile: SourceFile, model: PrismaDMMF.Model) => {
  sourceFile.addClass({
    name: `${model.name}UpdateInputBase`,
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
              !field.isId) ||
            field.kind === 'enum',
        )
        .map<OptionalKind<PropertyDeclarationStructure>>((field) => {
          return {
            name: field.name,
            type: getTSDataTypeInputFromScalarAndEnumFieldType(field),
            hasQuestionToken: true,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsUpdateInputByScalarAndEnumFieldType(field),
            isReadonly: true,
            scope: Scope.Public,
          };
        }),
    ],
  });
};

export const generateUpdateWithoutFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
  dmmf: PrismaDMMF.Document,
) => {
  sourceFile.addClass({
    name: `${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`,
    extends: `${model.name}UpdateInputBase`,
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
            type: getTSDataTypeUpdateInputFromRelationFieldType(model, field, dmmf),
            hasQuestionToken: true,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsUpdateInputByRelationFieldType(model, field, dmmf),
            isReadonly: true,
            scope: Scope.Public,
          };
        }),
    ],
  });
};

export const generateUpdateWithWhereUniqueWithoutFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}UpdateWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input`,
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
        name: 'data',
        type: `${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`,
        hasExclamationToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpdateWithout${pascalCase(
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
            arguments: [`() => ${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`],
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

export const generateUpsertWithoutFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}UpsertWithout${pascalCase(filedIgnore.name)}Input`,
    isExported: true,
    decorators: [
      {
        name: 'Expose',
        arguments: [],
      },
    ],
    properties: [
      {
        name: 'update',
        type: `${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`,
        hasExclamationToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpdateWithout${pascalCase(
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
            arguments: [`() => ${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`],
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
            arguments: [`() => ${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input`],
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

export const generateUpsertWithWhereUniqueWithoutFieldInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}UpsertWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input`,
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
        name: 'update',
        type: `${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`,
        hasExclamationToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpdateWithout${pascalCase(
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
            arguments: [`() => ${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`],
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
            arguments: [`() => ${model.name}CreateOrConnectWithout${pascalCase(filedIgnore.name)}Input`],
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

export const generateUpdateManyWithoutFieldNestedInputManyToMany = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}UpdateManyWithout${pascalCase(filedIgnore.name)}NestedInput`,
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
      {
        name: 'upsert',
        type: `${model.name}UpsertWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input[]`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpsertWithWhereUniqueWithout${pascalCase(
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
            arguments: [`() => ${model.name}UpsertWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input`],
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
        name: 'set',
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
      {
        name: 'disconnect',
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
      {
        name: 'delete',
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
      {
        name: 'update',
        type: `${model.name}UpdateWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input[]`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpdateWithWhereUniqueWithout${pascalCase(
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
            arguments: [`() => ${model.name}UpdateWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input`],
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
      // @todo: add updateMany and deleteMany
    ],
  });
};

export const generateUpdateManyWithoutFieldNestedInputOneToMany = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}UpdateManyWithout${pascalCase(filedIgnore.name)}NestedInput`,
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
      {
        name: 'upsert',
        type: `${model.name}UpsertWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input[]`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpsertWithWhereUniqueWithout${pascalCase(
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
            arguments: [`() => ${model.name}UpsertWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input`],
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
        name: 'set',
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
      {
        name: 'disconnect',
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
      {
        name: 'delete',
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
      {
        name: 'update',
        type: `${model.name}UpdateWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input[]`,
        hasQuestionToken: true,
        trailingTrivia: '\r\n',
        scope: Scope.Public,
        isReadonly: true,
        decorators: [
          {
            name: 'ApiProperty',
            arguments: [
              `{ type: () => ${model.name}UpdateWithWhereUniqueWithout${pascalCase(
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
            arguments: [`() => ${model.name}UpdateWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input`],
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
      // @todo: add updateMany and deleteMany
    ],
  });
};

export const generateUpdateOneWithoutFieldNestedInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
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

export const generateUpdateOneRequiredWithoutFieldNestedInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  filedIgnore: PrismaDMMF.Field,
) => {
  sourceFile.addClass({
    name: `${model.name}UpdateRequiredOneWithout${pascalCase(filedIgnore.name)}NestedInput`,
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

export const generateModelUpdateInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
) => {
  sourceFile.addClass({
    name: `${model.name}UpdateInput`,
    extends: `${model.name}UpdateInputBase`,
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
            type: getTSDataTypeUpdateInputFromRelationFieldType(model, field, dmmf),
            hasQuestionToken: true,
            trailingTrivia: '\r\n',
            decorators: getDecoratorsUpdateInputByRelationFieldType(model, field, dmmf),
            isReadonly: true,
            scope: Scope.Public,
          };
        }),
    ],
  });
};

//
export const getTSDataTypeUpdateInputFromRelationFieldType = (
  model: PrismaDMMF.Model,
  field: PrismaDMMF.Field,
  dmmf: PrismaDMMF.Document,
) => {
  if (field.kind === 'object' && field.relationName) {
    const relatedModel = dmmf.datamodel.models.find((model) => model.name === field.type);
    console.log('🚀 ~ file: generate-update-input.ts ~ relatedModel:', relatedModel?.name);
    if (!relatedModel) {
      throw new Error(`Model ${field.type} not found`);
    }
    const relatedField = relatedModel.fields.find((f) => f.relationName === field.relationName);
    if (relatedField !== undefined) {
      if (field.isList) {
        console.log(
          `${field.name} of ${model.name} is a foreign key field for relation many with ${relatedModel.name}`,
        );
        return `${relatedModel.name}UpdateManyWithout${pascalCase(relatedField.name)}NestedInput`;
      } else {
        console.log(`${field.name} of ${model.name} is a foreign key field for relation one with ${relatedModel.name}`);
        if (field.isRequired) {
          return `${relatedModel.name}UpdateRequiredOneWithout${pascalCase(relatedField.name)}NestedInput`;
        } else {
          return `${relatedModel.name}UpdateOneWithout${pascalCase(relatedField.name)}NestedInput`;
        }
      }
    }
  }
  console.log('Unknown relation type: ', field);
  throw new Error('Unknown relation type');
};

export const getDecoratorsUpdateInputByScalarAndEnumFieldType = (field: PrismaDMMF.Field) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  decorators.push(getDecoratorSwaggerUpdateInputByFieldType(field));
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
      name: 'IsNotNull',
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

export const getDecoratorSwaggerUpdateInputByFieldType = (
  field: PrismaDMMF.Field,
): OptionalKind<DecoratorStructure> => {
  const name = 'ApiProperty';
  let type = '';
  const required = 'false' as const;
  let nullable: 'true' | 'false' = 'false';
  if (!field.isRequired) {
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

export const getDecoratorsUpdateInputByRelationFieldType = (
  model: PrismaDMMF.Model,
  field: PrismaDMMF.Field,
  dmmf: PrismaDMMF.Document,
) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
  const type = getTSDataTypeUpdateInputFromRelationFieldType(model, field, dmmf);
  decorators.push({
    name: 'ApiProperty',
    arguments: [`{ type: () => ${type}, required: false, nullable: ${field.isRequired ? 'false' : 'true'} }`],
  });
  decorators.push({
    name: 'ValidateNested',
    arguments: [],
  });
  decorators.push({
    name: 'Type',
    arguments: [`() => ${type}`],
  });

  decorators.push({
    name: 'IsOptional',
    arguments: [],
  });

  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};
