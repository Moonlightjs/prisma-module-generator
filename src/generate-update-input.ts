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
  ImportDeclarationType,
  filterRelatedField,
  generateClassValidatorImport,
  generateEnumImports,
  generatePrismaImport,
  getDecoratorsImportsByType,
  shouldImportPrisma,
  updateSetImports,
} from './helpers';
import { generateUpsertWithWhereUniqueWithoutFieldInput } from './generate-upsert-with-where-unique-without-field-input';
import { generateUpsertWithoutFieldInput } from './generate-upsert-without-field-input';
import { generateUpdateOneWithoutFieldNestedInput } from './generate-update-one-without-field-nested-input';
import { generateUpdateOneRequiredWithoutFieldNestedInput } from './generate-update-one-required-without-field-nested-input';
import {
  generateUpdateManyWithoutFieldNestedInputOneToMany,
  generateUpdateManyWithoutFieldNestedInputManyToMany,
} from './generate-update-many-without-field-nested-input';

export function generateUpdateInput(
  project: Project,
  moduleDir: string,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
  extraModelImports: Set<ImportDeclarationType>,
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

  const relationImports = new Set<ImportDeclarationType>();
  model.fields.forEach((field) => {
    if (field.relationName && field.kind === 'object') {
      updateSetImports(relationImports, {
        moduleSpecifier: `../../${paramCase(field.type)}/dto/${paramCase(
          getTSDataTypeUpdateInputFromRelationFieldType(model, field, dmmf),
        ).replace('-input', '.input')}`,
        namedImports: new Set([getTSDataTypeUpdateInputFromRelationFieldType(model, field, dmmf)]),
      });
    }
  });

  generateUpdateBaseInput(sourceFile, model, extraModelImports);

  model.fields
    .filter((field) => field.kind === 'object' && dmmf.datamodel.models.some((model) => model.name === field.type))
    .forEach((field) => {
      // updateSetImports(relationImports, {
      //   moduleSpecifier: `./${paramCase(model.name)}-create.input`,
      //   namedImports: new Set([
      //     `${model.name}CreateWithout${pascalCase(field.name)}Input`,
      //     `${model.name}CreateOrConnectWithout${pascalCase(field.name)}Input`,
      //   ]),
      // });
      // if (field.relationFromFields && field.relationFromFields.length > 0) {
      //   updateSetImports(relationImports, {
      //     moduleSpecifier: `./${paramCase(model.name)}-create-many-${paramCase(field.name)}.input-envelope`,
      //     namedImports: new Set([`${model.name}CreateMany${pascalCase(field.name)}InputEnvelope`]),
      //   });
      // }

      generateUpdateWithoutFieldInput(sourceFile, model, field, dmmf, extraModelImports);
      generateUpdateWithWhereUniqueWithoutFieldInput(sourceFile, model, field, extraModelImports);

      if (field.isList) {
        generateUpsertWithoutFieldInput(project, moduleDir, model, field, extraModelImports);
      } else {
        generateUpsertWithWhereUniqueWithoutFieldInput(project, moduleDir, model, field, extraModelImports);
      }

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
          generateUpdateOneRequiredWithoutFieldNestedInput(project, moduleDir, model, field, extraModelImports);
        } else {
          generateUpdateOneWithoutFieldNestedInput(project, moduleDir, model, field, extraModelImports);
        }
      } else {
        if (field.relationFromFields && field.relationFromFields.length > 0) {
          generateUpdateManyWithoutFieldNestedInputOneToMany(project, moduleDir, model, field, extraModelImports);
        } else {
          generateUpdateManyWithoutFieldNestedInputManyToMany(project, moduleDir, model, field, extraModelImports);
        }
      }
    });
  Array.from(relationImports).forEach((importDeclaration) => {
    sourceFile.addImportDeclaration({
      moduleSpecifier: importDeclaration.moduleSpecifier,
      namedImports: Array.from(importDeclaration.namedImports),
    });
  });
  generateModelUpdateInput(sourceFile, model, dmmf, extraModelImports);
}

export const generateUpdateBaseInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  extraModelImports: Set<ImportDeclarationType>,
) => {
  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}-update.input`,
    namedImports: new Set([`${model.name}UpdateInputBase`]),
  });
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
  extraModelImports: Set<ImportDeclarationType>,
) => {
  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}-update.input`,
    namedImports: new Set([`${model.name}UpdateWithout${pascalCase(filedIgnore.name)}Input`]),
  });
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
  extraModelImports: Set<ImportDeclarationType>,
) => {
  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}-update.input`,
    namedImports: new Set([`${model.name}UpdateWithWhereUniqueWithout${pascalCase(filedIgnore.name)}Input`]),
  });
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

export const generateModelUpdateInput = (
  sourceFile: SourceFile,
  model: PrismaDMMF.Model,
  dmmf: PrismaDMMF.Document,
  extraModelImports: Set<ImportDeclarationType>,
) => {
  updateSetImports(extraModelImports, {
    moduleSpecifier: `./modules/${paramCase(model.name)}/dto/${paramCase(model.name)}-update.input`,
    namedImports: new Set([`${model.name}UpdateInput`]),
  });
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
    const relatedField = relatedModel.fields.find(filterRelatedField(field, model, relatedModel));
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
