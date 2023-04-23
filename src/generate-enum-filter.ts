import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { paramCase } from 'change-case';
import * as path from 'path';
import { Project } from 'ts-morph';

export default function generateEnumFilter(project: Project, outputDir: string, enumItem: PrismaDMMF.DatamodelEnum) {
  const dirPath = path.resolve(outputDir, 'enums', 'filters');
  const filePath = path.resolve(dirPath, `${paramCase(enumItem.name)}-enum.filter.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: `@moonlightjs/common`,
    namedImports: ['IsNotNull', 'getEnumValues'],
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: `@nestjs/swagger`,
    namedImports: ['ApiProperty', 'getSchemaPath'],
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: `class-transformer`,
    namedImports: ['Expose', 'Type'],
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: `class-validator`,
    namedImports: ['IsEnum', 'IsOptional', 'ValidateNested'],
  });
  sourceFile.addImportDeclaration({
    moduleSpecifier: `../${paramCase(enumItem.name)}.enum`,
    namedImports: [`${enumItem.name}`],
  });

  sourceFile.addStatements(
    // ts
    `@Expose()
    export class NestedEnum${enumItem.name}NullableFilter {
      @ApiProperty({ type: () => String, example: getEnumValues(${enumItem.name}).length ? getEnumValues(${enumItem.name})[0] : undefined, required: false, nullable: true })
      @IsEnum(${enumItem.name})
      @IsOptional()
      @Expose()
      public equals?: ${enumItem.name} | null;
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: true })
      @IsEnum(${enumItem.name}, { each: true })
      @IsOptional()
      @Expose()
      public in?: ${enumItem.name}[] | null;
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: true })
      @IsEnum(${enumItem.name}, { each: true })
      @IsOptional()
      @Expose()
      public notIn?: ${enumItem.name}[] | null;
    
      @ApiProperty({
        oneOf: [{ $ref: getSchemaPath(NestedEnum${enumItem.name}NullableFilter) }, { type: 'string' }],
        example: getEnumValues(${enumItem.name}).length ? { not: { equals: getEnumValues(${enumItem.name})[0] } } : undefined,
        required: false,
        nullable: true,
      })
      @ValidateNested()
      @IsOptional()
      @Type(() => NestedEnum${enumItem.name}NullableFilter)
      @Expose()
      public not?: NestedEnum${enumItem.name}NullableFilter | ${enumItem.name} | null;
    }`,
  );

  sourceFile.addStatements(
    // ts
    `@Expose()
    export class NestedEnum${enumItem.name}Filter {
      @ApiProperty({ type: () => String, example: getEnumValues(${enumItem.name}).length ? getEnumValues(${enumItem.name})[0] : undefined, required: false, nullable: false })
      @IsEnum(${enumItem.name})
      @IsNotNull()
      @Expose()
      public equals?: ${enumItem.name};
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: false })
      @IsEnum(${enumItem.name}, { each: true })
      @IsNotNull()
      @Expose()
      public in?: ${enumItem.name}[];
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: false })
      @IsEnum(${enumItem.name}, { each: true })
      @IsNotNull()
      @Expose()
      public notIn?: ${enumItem.name}[];
    
      @ApiProperty({
        oneOf: [{ $ref: getSchemaPath(NestedEnum${enumItem.name}Filter) }, { type: 'string' }],
        example: getEnumValues(${enumItem.name}).length ? { not: { equals: getEnumValues(${enumItem.name})[0] } } : undefined,
        required: false,
        nullable: true,
      })
      @ValidateNested()
      @IsOptional()
      @Type(() => NestedEnum${enumItem.name}NullableFilter)
      @Expose()
      public not?: NestedEnum${enumItem.name}Filter | ${enumItem.name};
    }`,
  );

  sourceFile.addStatements(
    // ts
    `@Expose()
    export class Enum${enumItem.name}NullableFilter {
      @ApiProperty({ type: () => String, example: getEnumValues(${enumItem.name}).length ? getEnumValues(${enumItem.name})[0] : undefined, required: false, nullable: true })
      @IsEnum(${enumItem.name})
      @IsOptional()
      @Expose()
      public equals?: ${enumItem.name} | null;
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: true })
      @IsEnum(${enumItem.name}, { each: true })
      @IsOptional()
      @Expose()
      public in?: ${enumItem.name}[] | null;
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: true })
      @IsEnum(${enumItem.name}, { each: true })
      @IsOptional()
      @Expose()
      public notIn?: ${enumItem.name}[] | null;
    
      @ApiProperty({
        oneOf: [{ $ref: getSchemaPath(NestedEnum${enumItem.name}NullableFilter) }, { type: 'string' }],
        example: getEnumValues(${enumItem.name}).length ? { not: { equals: getEnumValues(${enumItem.name})[0] } } : undefined,
        required: false,
        nullable: true,
      })
      @ValidateNested()
      @IsOptional()
      @Type(() => NestedEnum${enumItem.name}NullableFilter)
      @Expose()
      public not?: NestedEnum${enumItem.name}NullableFilter | ${enumItem.name} | null;
    }`,
  );

  sourceFile.addStatements(
    // ts
    `@Expose()
    export class Enum${enumItem.name}Filter {
      @ApiProperty({ type: () => String, example: getEnumValues(${enumItem.name}).length ? getEnumValues(${enumItem.name})[0] : undefined, required: false, nullable: false })
      @IsEnum(${enumItem.name})
      @IsNotNull()
      @Expose()
      public equals?: ${enumItem.name};
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: false })
      @IsEnum(${enumItem.name}, { each: true })
      @IsNotNull()
      @Expose()
      public in?: ${enumItem.name}[];
    
      @ApiProperty({ type: () => [String], example: getEnumValues(${enumItem.name}).length ? [getEnumValues(${enumItem.name})[0]] : undefined, isArray: true, required: false, nullable: false })
      @IsEnum(${enumItem.name}, { each: true })
      @IsNotNull()
      @Expose()
      public notIn?: ${enumItem.name}[];
    
      @ApiProperty({
        oneOf: [{ $ref: getSchemaPath(NestedEnum${enumItem.name}Filter) }, { type: 'string' }],
        example: getEnumValues(${enumItem.name}).length ? { not: { equals: getEnumValues(${enumItem.name})[0] } } : undefined,
        required: false,
        nullable: true,
      })
      @ValidateNested()
      @IsOptional()
      @Type(() => NestedEnum${enumItem.name}Filter)
      @Expose()
      public not?: NestedEnum${enumItem.name}Filter | ${enumItem.name};
    }`,
  );
}
