import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import { DecoratorStructure, ExportDeclarationStructure, OptionalKind, Project, SourceFile } from 'ts-morph';

export const generateModelsIndexFile = (prismaClientDmmf: PrismaDMMF.Document, project: Project, outputDir: string) => {
  const modelsBarrelExportSourceFile = project.createSourceFile(
    path.resolve(outputDir, 'models', 'index.ts'),
    undefined,
    { overwrite: true },
  );

  modelsBarrelExportSourceFile.addExportDeclarations(
    prismaClientDmmf.datamodel.models
      .map((model) => model.name)
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>((modelName) => ({
        moduleSpecifier: `./${modelName}.model`,
        namedExports: [modelName],
      })),
  );
};

export const shouldImportPrisma = (fields: PrismaDMMF.Field[]) => {
  return fields.some((field) => ['Json'].includes(field.type));
};

export const shouldImportHelpers = (fields: PrismaDMMF.Field[]) => {
  return fields.some((field) => ['enum'].includes(field.kind));
};

export const getTSDataTypeFromFieldType = (field: PrismaDMMF.Field) => {
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
      type = 'number';
      break;
    case 'Json':
      type = 'Prisma.JsonValue';
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

export const getDefaultValueFromFieldType = (dmmfField: PrismaDMMF.Field) => {
  let defaultValue: any = null;
  if (dmmfField.default) {
    if (typeof dmmfField.default !== 'object') {
      defaultValue = dmmfField.default?.toString();
      if (dmmfField.kind === 'enum') {
        defaultValue = `${dmmfField.type}.${dmmfField.default}`;
      } else if (dmmfField.type === 'BigInt') {
        defaultValue = `BigInt(${defaultValue})`;
      } else if (dmmfField.type === 'String') {
        defaultValue = `'${defaultValue}'`;
      }
    } else if (Array.isArray(dmmfField.default)) {
      if (dmmfField.type === 'String') {
        defaultValue = `[${dmmfField.default.map((d) => `'${d}'`).toString()}]`;
      } else {
        defaultValue = `[${dmmfField.default.toString()}]`;
      }
    }
  }
  return defaultValue;
};

export const getDecoratorsByFieldType = (field: PrismaDMMF.Field) => {
  const decorators: OptionalKind<DecoratorStructure>[] = [];
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
  if (field.isRequired) {
    decorators.unshift({
      name: 'IsDefined',
      arguments: [],
    });
  } else {
    decorators.unshift({
      name: 'IsOptional',
      arguments: [],
    });
  }
  if (field.kind === 'enum') {
    decorators.push({
      name: 'IsEnum',
      arguments: [`${field.type}`],
    });
  }
  decorators.push({
    name: 'Expose',
    arguments: [],
  });
  return decorators;
};

export const getDecoratorsImportsByType = (field: PrismaDMMF.Field) => {
  const validatorImports = new Set();
  switch (field.type) {
    case 'Int':
      validatorImports.add('IsInt');
      break;
    case 'DateTime':
      validatorImports.add('IsDate');
      break;
    case 'String':
      validatorImports.add('IsString');
      break;
    case 'Boolean':
      validatorImports.add('IsBoolean');
      break;
    case 'Float':
    case 'Decimal':
      validatorImports.add('IsNumber');
      break;
    case 'Bytes':
      break;
    case 'Json':
      validatorImports.add('IsJSON');
      break;
    default:
      validatorImports.add('ValidateNested');
      break;
  }
  validatorImports.add('IsBoolean');
  validatorImports.add('IsOptional');
  validatorImports.add('IsDefined');
  validatorImports.add('IsArray');
  if (field.kind === 'enum') {
    validatorImports.add('IsEnum');
  }
  return [...validatorImports];
};

export const generateClassValidatorImport = (sourceFile: SourceFile, validatorImports: Array<string>) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: 'class-validator',
    namedImports: validatorImports,
  });
};

export const generatePrismaImport = (sourceFile: SourceFile) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: '@prisma/client',
    namedImports: ['Prisma'],
  });
};

export const generateRelationImportsImport = (sourceFile: SourceFile, relationImports: Array<string>) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: './',
    namedImports: relationImports,
  });
};
export const generateHelpersImports = (sourceFile: SourceFile, helpersImports: Array<string>) => {
  sourceFile.addImportDeclaration({
    moduleSpecifier: '../helpers',
    namedImports: helpersImports,
  });
};

export const generateEnumImports = (sourceFile: SourceFile, fields: PrismaDMMF.Field[]) => {
  const enumsToImport = fields.filter((field) => field.kind === 'enum').map((field) => field.type);

  if (enumsToImport.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '../../../enums',
      namedImports: enumsToImport,
    });
  }
};

export const generateEnumImportsForWhereInput = (sourceFile: SourceFile, fields: PrismaDMMF.Field[]) => {
  const enumsToImport: string[] = [];
  fields
    .filter((field) => field.kind === 'enum')
    .forEach((field) => {
      enumsToImport.push(field.type);
      if (field.isRequired) {
        enumsToImport.push(`Enum${field.type}Filter`);
      } else {
        enumsToImport.push(`Enum${field.type}NullableFilter`);
      }
    });
  if (enumsToImport.length > 0) {
    sourceFile.addImportDeclaration({
      moduleSpecifier: '../../../enums',
      namedImports: enumsToImport,
    });
  }
};

export function generateEnumsIndexFile(sourceFile: SourceFile, enumNames: string[]) {
  sourceFile.addExportDeclarations(
    enumNames.sort().map<OptionalKind<ExportDeclarationStructure>>((name) => ({
      moduleSpecifier: `./${paramCase(name)}.enum`,
      namedExports: [name],
    })),
  );
  sourceFile.addExportDeclaration({
    moduleSpecifier: './filters',
  });
}

export function generateEnumFiltersIndexFile(sourceFile: SourceFile, enumNames: string[]) {
  sourceFile.addExportDeclarations(
    enumNames.sort().map<OptionalKind<ExportDeclarationStructure>>((name) => ({
      moduleSpecifier: `./${paramCase(name)}-enum.filter`,
    })),
  );
}

export function filterRelatedField(
  field: PrismaDMMF.Field,
  model: PrismaDMMF.Model,
  relatedModel: PrismaDMMF.Model,
): (value: PrismaDMMF.Field, index: number, obj: PrismaDMMF.Field[]) => unknown {
  return (f) => {
    if (f.relationName === field.relationName) {
      if (model.name === relatedModel.name) {
        if (f.name === field.name) {
          return false;
        }
        return true;
      }
      return true;
    }
    return false;
  };
}

export type ImportDeclarationType = {
  namedImports: Set<string>;
  moduleSpecifier: string;
};

export function updateSetImports(set: Set<ImportDeclarationType>, structure: ImportDeclarationType) {
  const existing = [...set].find((s) => s.moduleSpecifier === structure.moduleSpecifier);
  if (existing) {
    existing.namedImports = new Set([...existing.namedImports, ...structure.namedImports]);
  } else {
    set.add(structure);
  }
}
