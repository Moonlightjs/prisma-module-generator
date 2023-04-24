import { pluralize } from '@moonlightjs/common';
import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
import { camelCase, paramCase } from 'change-case';
import * as path from 'path';
import { Project } from 'ts-morph';
import { getTSDataTypeFromFieldType } from './helpers';

export function generateAdminControllerFile(project: Project, moduleDir: string, model: PrismaDMMF.Model) {
  const filePath = path.resolve(moduleDir, `admin-${paramCase(model.name)}.controller.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  sourceFile.addStatements(/* ts */ `
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
  OpenApiResponse,
  FindManyArgs,
  OpenApiPaginationResponse,
  FindOneArgs,
  SuccessResponseDto,
} from '@moonlightjs/common';
import { ${model.name}Service } from './${paramCase(model.name)}.service';
import { Admin${model.name}Dto, CreateAdmin${model.name}Input, UpdateAdmin${model.name}Input } from './dto';

@ApiTags('Admin${model.name}')
@Controller({
  path: 'admin/${pluralize(paramCase(model.name))}',
  version: '1',
})
export class Admin${model.name}Controller {
  constructor(
    protected readonly ${camelCase(model.name)}Service: ${model.name}Service,
  ) {}

  @ApiBody({
    type: CreateAdmin${model.name}Input,
  })
  @OpenApiResponse({
    status: HttpStatus.CREATED,
    model: Admin${model.name}Dto,
  })
  @Post()
  create(
    @Body() create${model.name}Input: CreateAdmin${model.name}Input,
    @Query() params: Omit<Prisma.${model.name}CreateArgs, 'data'>,
  ) {
    return this.${camelCase(model.name)}Service.create(
      {
        ...params,
        data: {
          ...create${model.name}Input,
        },
      },
      Admin${model.name}Dto,
    );
  }

  @ApiQuery({
    type: FindManyArgs,
  })
  @OpenApiResponse({
    status: HttpStatus.OK,
    model: Admin${model.name}Dto,
    isArray: true,
  })
  @Get()
  findAll(@Query() params: Prisma.${model.name}FindManyArgs) {
    return this.${camelCase(model.name)}Service.findAll(
      params,
      Admin${model.name}Dto,
    );
  }

  @ApiQuery({
    type: FindManyArgs,
  })
  @OpenApiPaginationResponse(Admin${model.name}Dto)
  @Get('/pagination')
  findAllPagination(
    @Query() params: Prisma.${model.name}FindManyArgs,
  ) {
    return this.${camelCase(model.name)}Service.findAllPagination(
      params,
      Admin${model.name}Dto,
    );
  }

  @ApiQuery({
    type: FindOneArgs,
  })
  @OpenApiResponse({ status: HttpStatus.OK, model: Admin${model.name}Dto })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query() params: Prisma.${model.name}FindUniqueArgs,
  ) {
    params.where = {
      id,
    };
    return this.${camelCase(model.name)}Service.findOne(
      params,
      Admin${model.name}Dto,
    );
  }

  @OpenApiResponse({ status: HttpStatus.OK, model: Admin${model.name}Dto })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() update${model.name}Input: UpdateAdmin${model.name}Input,
    @Query()
    params: Omit<Prisma.${model.name}UpdateArgs, 'data' | 'where'>,
  ) {
    return this.${camelCase(model.name)}Service.update(
      {
        ...params,
        where: {
          id,
        },
        data: {
          ...update${model.name}Input,
        },
      },
      Admin${model.name}Dto,
    );
  }

  @ApiResponse({ status: HttpStatus.OK, type: SuccessResponseDto })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${camelCase(model.name)}Service.remove({
      id,
    });
  }
}`);
}

export function generateControllerFile(project: Project, moduleDir: string, model: PrismaDMMF.Model) {
  const filePath = path.resolve(moduleDir, `${paramCase(model.name)}.controller.ts`);
  const sourceFile = project.createSourceFile(filePath, undefined, {
    overwrite: true,
  });

  const idField = model.fields.find((field) => field.isId);
  if (!idField) {
    throw new Error(`Model ${model.name} does not have an id field`);
  }
  const idDataType = getTSDataTypeFromFieldType(idField);

  sourceFile.addStatements(/* ts */ `
import {
Body,
Controller,
Delete,
Get,
HttpCode,
HttpStatus,
Param,
Patch,
Post,
Query,
UseGuards,
} from '@nestjs/common';
import {
ApiBearerAuth,
ApiBody,
ApiQuery,
ApiResponse,
ApiTags,
} from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import {
CountDto,
OpenApiResponse,
FindManyArgs,
OpenApiPaginationResponse,
FindOneArgs,
SuccessResponseDto,
} from '@moonlightjs/common';
import { ${model.name}Service } from './${paramCase(model.name)}.service';
import { ${model.name}Dto, ${model.name}CreateInput, ${model.name}UpdateInput, ${model.name}FindManyArgs, ${
    model.name
  }FindFirstArgs } from './dto';

@ApiTags('${model.name}')
@Controller({
path: '${pluralize(paramCase(model.name))}',
version: '1',
})
export class ${model.name}Controller {
constructor(
  protected readonly ${camelCase(model.name)}Service: ${model.name}Service,
) {}

@ApiBody({
  type: ${model.name}CreateInput,
})
@OpenApiResponse({
  status: HttpStatus.CREATED,
  model: ${model.name}Dto,
})
@Post()
create(
  @Body() create${model.name}Input: ${model.name}CreateInput,
  @Query() params: Omit<Prisma.${model.name}CreateArgs, 'data'>,
) {
  return this.${camelCase(model.name)}Service.create(
    {
      ...params,
      data: {
        ...create${model.name}Input,
      },
    },
    ${model.name}Dto,
  );
}

@ApiQuery({
  type: () => ${model.name}FindManyArgs,
})
@OpenApiResponse({
  status: HttpStatus.OK,
  model: ${model.name}Dto,
  isArray: true,
})
@Get()
findAll(@Query() params: Prisma.${model.name}FindManyArgs) {
  return this.${camelCase(model.name)}Service.findAll(
    params,
    ${model.name}Dto,
  );
}

@ApiQuery({
  type: () => ${model.name}FindManyArgs,
})
@OpenApiPaginationResponse(${model.name}Dto)
@Get('/pagination')
findAllPagination(
  @Query() params: Prisma.${model.name}FindManyArgs,
) {
  return this.${camelCase(model.name)}Service.findAllPagination(
    params,
    ${model.name}Dto,
  );
}

@ApiQuery({
  type: () => ${model.name}FindFirstArgs,
})
@OpenApiResponse({
  status: HttpStatus.OK,
  model: CountDto,
})
@Get('/count')
count(@Query() params: Prisma.${model.name}FindFirstArgs) {
  return this.${camelCase(model.name)}Service.count(params?.where);
}

@ApiQuery({
  type: () => ${model.name}FindFirstArgs,
})
@OpenApiResponse({ status: HttpStatus.OK, model: ${model.name}Dto })
@Get(':id')
findOne(
  @Param('id') id: ${idDataType},
  @Query() params: Prisma.${model.name}FindFirstArgs,
) {
  params.where = {
    id,
  };
  return this.${camelCase(model.name)}Service.findOne(
    params,
    ${model.name}Dto,
  );
}

@OpenApiResponse({ status: HttpStatus.OK, model: ${model.name}Dto })
@Patch(':id')
update(
  @Param('id') id: ${idDataType},
  @Body() update${model.name}Input: ${model.name}UpdateInput,
  @Query()
  params: Omit<Prisma.${model.name}UpdateArgs, 'data' | 'where'>,
) {
  return this.${camelCase(model.name)}Service.update(
    {
      ...params,
      where: {
        id,
      },
      data: {
        ...update${model.name}Input,
      },
    },
    ${model.name}Dto,
  );
}

@ApiResponse({ status: HttpStatus.OK, type: SuccessResponseDto })
@Delete(':id')
remove(@Param('id') id: ${idDataType}) {
  return this.${camelCase(model.name)}Service.remove({
    id,
  });
}
}`);
}
