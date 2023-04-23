import { pluralize } from '@moonlightjs/common';
import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { camelCase, paramCase } from 'change-case';
import * as path from 'path';
import { Project } from 'ts-morph';

export function generateServiceFile(project: Project, moduleDir: string, model: PrismaDMMF.Model) {
  const filePath = path.resolve(moduleDir, `${paramCase(model.name)}.service.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addStatements(/* ts */ `
import { BadRequestException, Injectable } from '@nestjs/common';
import { ${model.name}, Prisma } from '@prisma/client';
import {
  CountDto,
  PagedResultDto,
  Pagination,
  toDto,
  HttpErrorException,
} from '@moonlightjs/common';
import { PrismaService } from '@moonlightjs/common';
import { Admin${model.name}Dto } from './dto/admin-${paramCase(model.name)}.dto';
import { ${model.name}Dto } from './dto/${paramCase(model.name)}.dto';

const DEFAULT_SKIP = 0;
const DEFAULT_TAKE = 20;

@Injectable()
export class ${model.name}Service {
  constructor(protected prisma: PrismaService) {}

  async findOne<TDto = any>(
    params: Prisma.${model.name}FindFirstArgs,
    dtoType: typeof Admin${model.name}Dto | typeof ${model.name}Dto = Admin${model.name}Dto,
  ): Promise<TDto> {
    const ${camelCase(model.name)} = await this.prisma.${camelCase(model.name)}.findFirst(params);
    return toDto<TDto>(dtoType, ${camelCase(model.name)});
  }

  async findAll<TDto = any>(
    params: Prisma.${model.name}FindManyArgs,
    dtoType: typeof Admin${model.name}Dto | typeof ${model.name}Dto = Admin${model.name}Dto,
  ): Promise<TDto[]> {
    params.skip = params.skip ?? DEFAULT_SKIP;
    params.take = params.take ?? DEFAULT_TAKE;
    const ${pluralize(camelCase(model.name))} = await this.prisma.${camelCase(model.name)}.findMany(
      params,
    );
    return ${pluralize(camelCase(model.name))}.map((${camelCase(model.name)}) =>
      toDto<TDto>(dtoType, ${camelCase(model.name)}),
    );
  }

  async findAllPagination<TDto = any>(
    params: Prisma.${model.name}FindManyArgs,
    dtoType: typeof Admin${model.name}Dto | typeof ${model.name}Dto = Admin${model.name}Dto,
  ): Promise<PagedResultDto<TDto>> {
    params.skip = params.skip ?? DEFAULT_SKIP;
    params.take = params.take ?? DEFAULT_TAKE;
    const [${pluralize(camelCase(model.name))}, total] = await Promise.all([
      this.prisma.${camelCase(model.name)}.findMany(params),
      this.prisma.${camelCase(model.name)}.count({
        where: params.where,
      }),
    ]);
    return PagedResultDto.create({
      data: ${pluralize(camelCase(model.name))}.map((${camelCase(model.name)}) =>
        toDto<TDto>(dtoType, ${camelCase(model.name)}),
      ),
      pagination: Pagination.create({
        take: params.take,
        skip: params.skip,
        total: total,
      }),
    });
  }

  async count(where?: Prisma.${model.name}WhereInput): Promise<CountDto> {
    const total = await this.prisma.${camelCase(model.name)}.count({
      where: where,
    });
    return CountDto.create(total);
  }

  async create<TDto = any>(
    params: Prisma.${model.name}CreateArgs,
    dtoType: typeof Admin${model.name}Dto | typeof ${model.name}Dto = Admin${model.name}Dto,
  ): Promise<TDto> {
    const ${camelCase(model.name)} = await this.prisma.${camelCase(model.name)}.create(params);
    return toDto<TDto>(dtoType, ${camelCase(model.name)});
  }

  async update<TDto = any>(
    params: Prisma.${model.name}UpdateArgs,
    dtoType: typeof Admin${model.name}Dto | typeof ${model.name}Dto = Admin${model.name}Dto,
  ): Promise<TDto> {
    const ${camelCase(model.name)} = await this.prisma.${camelCase(model.name)}.update(params);
    return toDto<TDto>(dtoType, ${camelCase(model.name)});
  }

  async remove(
    where: Prisma.${model.name}WhereUniqueInput,
  ): Promise<boolean> {
    const ${camelCase(model.name)} = await this.prisma.${camelCase(model.name)}.delete({
      where,
    });
    return !!${camelCase(model.name)};
  }
}`);
}
