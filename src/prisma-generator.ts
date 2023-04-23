import { removeDir } from '@moonlightjs/common';
import { EnvValue, GeneratorOptions } from '@prisma/generator-helper';
import { getDMMF, parseEnvValue } from '@prisma/internals';
import { paramCase } from 'change-case';
import { promises as fs } from 'fs';
import * as path from 'path';
import { generateControllerFile } from './generate-controller';
import { generateCreateInput } from './generate-create-input';
import { generateAdminDto, generateDto, generateDtosIndexFile } from './generate-dto';
import generateEnum from './generate-enum';
import generateEnumFilter from './generate-enum-filter';
import { generateModuleFile, generateModuleIndexFile } from './generate-module';
import { generateServiceFile } from './generate-service';
import { generateUpdateInput } from './generate-update-input';
import { generateWhereInputs } from './generate-where-input';
import { generateEnumFiltersIndexFile, generateEnumsIndexFile } from './helpers';
import { project } from './project';
import { generateOrderByInput } from './generate-order-by';
import { generateScalarFieldEnum } from './generate-scalar-field-enum';
import { generateFindArgs } from './generate-find-args';

export async function generate(options: GeneratorOptions) {
  try {
    const outputDir = parseEnvValue(options.generator.output as EnvValue);
    await fs.mkdir(outputDir, { recursive: true });
    await removeDir(outputDir, true);

    const prismaClientProvider = options.otherGenerators.find(
      (it) => parseEnvValue(it.provider) === 'prisma-client-js',
    );

    const prismaClientDmmf = await getDMMF({
      datamodel: options.datamodel,
      previewFeatures: prismaClientProvider?.previewFeatures,
    });

    const enumNames = new Set<string>();
    prismaClientDmmf.datamodel.enums.forEach((enumItem) => {
      enumNames.add(enumItem.name);
      generateEnum(project, outputDir, enumItem);
      generateEnumFilter(project, outputDir, enumItem);
    });

    if (enumNames.size > 0) {
      const enumFiltersIndexSourceFile = project.createSourceFile(
        path.resolve(outputDir, 'enums', 'filters', 'index.ts'),
        undefined,
        {
          overwrite: true,
        },
      );
      generateEnumFiltersIndexFile(enumFiltersIndexSourceFile, [...enumNames]);
      const enumsIndexSourceFile = project.createSourceFile(path.resolve(outputDir, 'enums', 'index.ts'), undefined, {
        overwrite: true,
      });
      generateEnumsIndexFile(enumsIndexSourceFile, [...enumNames]);
    }

    const promifyCreateModule = prismaClientDmmf.datamodel.models.map(async (model) => {
      const moduleDir = path.resolve(outputDir, 'modules', paramCase(model.name));
      await fs.mkdir(moduleDir, { recursive: true });
      await removeDir(moduleDir, true);
      // gererate dto files
      await generateAdminDto(project, moduleDir, model);
      await generateDto(project, moduleDir, model);
      // await generateCreateAdminInputBase(project, moduleDir, model);
      await generateCreateInput(project, moduleDir, model, prismaClientDmmf);
      // await generateAdminUpdateInputBase(project, moduleDir, model);
      await generateUpdateInput(project, moduleDir, model, prismaClientDmmf);
      await generateWhereInputs(project, moduleDir, model, prismaClientDmmf);
      await generateOrderByInput(project, moduleDir, model, prismaClientDmmf);
      await generateScalarFieldEnum(project, moduleDir, model);
      await generateFindArgs(project, moduleDir, model);
      await generateDtosIndexFile(project, moduleDir, model);

      // gererate service file
      await generateServiceFile(project, moduleDir, model);

      // gererate controller files
      // await generateAdminControllerFile(project, moduleDir, model);
      await generateControllerFile(project, moduleDir, model);

      // gererate molule file
      await generateModuleFile(project, moduleDir, model);
      await generateModuleIndexFile(project, moduleDir, model);
    });
    await Promise.all(promifyCreateModule);

    // const helpersIndexSourceFile = project.createSourceFile(
    //   path.resolve(outputDir, 'helpers', 'index.ts'),
    //   undefined,
    //   { overwrite: true }
    // );
    // generateHelpersIndexFile(helpersIndexSourceFile);
    await project.save();
  } catch (error) {
    console.log('🚀 ------------------------------------------------------------🚀');
    console.log('🚀 ~ file: prisma-generator.ts:56 ~ generate ~ error:', error);
    console.log('🚀 ------------------------------------------------------------🚀');
  }
}
