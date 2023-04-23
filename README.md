# Prisma Module Generator

![npm](https://img.shields.io/npm/v/@moonlightjs/prisma-module-generator)
![npm](https://img.shields.io/npm/dt/@moonlightjs/prisma-module-generator)
![npm](https://img.shields.io/npm/dw/@moonlightjs/prisma-module-generator)
![npm](https://img.shields.io/npm/l/@moonlightjs/prisma-module-generator)


Prisma Module Generator is a library that generates NestJS modules based on Prisma models. It was inspired by [Prisma Class Validator Generator](https://github.com/omar-dulaimi/prisma-class-validator-generator).

## Table of Contents

- [Prisma Module Generator](#prisma-module-generator)
  - [Table of Contents](#table-of-contents)
  - [Supported Prisma Versions](#supported-prisma-versions)
    - [Prisma 4](#prisma-4)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)


## Supported Prisma Versions

Probably no breaking changes for this library, so try newer versions first.

### Prisma 4
- 4.0.0 and higher

## Features

- Generates CRUD operations for Prisma models.
- Integrates with NestJS decorators to create controllers, services, and DTOs.
- Automatically generates class validators and OpenAPI Swaggers for your DTOs.

## Installation

To install Prisma Module Generator, run:

Using npm:

```bash
 npm install @moonlightjs/prisma-module-generator --save-dev
```

Using yarn:

```bash
 yarn add @moonlightjs/prisma-module-generator --dev
```

## Usage

1- Add the generator to your Prisma schema

```prisma
generator module_generator {
  provider = "prisma-module-generator"
}
```

2- Running `npx prisma generate` for the following schema.prisma

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  title     String
  content   String?
  published Boolean  @default(false)
  viewCount Int      @default(0)
  author    User?    @relation(fields: [authorId], references: [id])
  authorId  Int?
  rating    Float
}
```

## Contributing

Contributions are welcome! If you find a bug or have an idea for a new feature, please open an issue or submit a pull request.

## License

Prisma Module Generator is licensed under the [MIT License](https://opensource.org/licenses/MIT).