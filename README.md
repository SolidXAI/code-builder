# @solidxai/code-builder

> The code generation engine behind SolidX — turning data model definitions into production-ready NestJS boilerplate.

`@solidxai/code-builder` is the schematics-based code generation engine that powers the SolidX platform. When you define a module or model through the SolidX app builder, this package is what runs under the hood — reading your metadata and producing fully-formed, decorator-complete NestJS files ready to run without further editing.

[![npm version](https://img.shields.io/npm/v/@solidxai/code-builder)](https://www.npmjs.com/package/@solidxai/code-builder)
[![License: BSL-1.1](https://img.shields.io/badge/License-BSL--1.1-blue.svg)](https://opensource.org/licenses/BSL-1.1)
[![Documentation](https://img.shields.io/badge/docs-solidxai.com-blue)](https://docs.solidxai.com/docs)

---

## How it works

SolidX stores your application's structure — modules, models, and fields — as metadata JSON files. `@solidxai/code-builder` reads that metadata and generates or updates the corresponding NestJS source files using Angular Schematics as the generation engine and the TypeScript compiler API for precise AST-level file manipulation.

The key characteristic that sets it apart from a simple templating tool: **it operates on live TypeScript files at the AST level**. This means it can add a new field to an existing entity, update a decorator on a DTO property, or remove a relation — all without touching the surrounding code. Manual changes your team makes to generated files are preserved across regenerations.

The flow looks like this:

```
Module metadata JSON
        │
        ▼
  @solidxai/code-builder
  (Angular Schematics + TypeScript AST)
        │
        ▼
  NestJS source files
  (entity, service, controller, repository, DTOs)
```

---

## Schematics

The package exposes three schematics, each invoked automatically by the `solid` CLI in `@solidxai/core`.

### `add-module`

Scaffolds the folder structure and boilerplate for a new SolidX module.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `module` | string | yes | The name of the module to create |

**What it creates:**

```
{module}/
└── {module}.module.ts    # NestJS module with imports and metadata wired up
```

---

### `refresh-model`

The workhorse schematic. Generates the full set of NestJS artifacts for a model if they do not yet exist, or surgically updates existing files to reflect the current field definitions in metadata. Safe to run repeatedly — existing custom logic is not overwritten.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `module` | string | yes | The module the model belongs to |
| `model` | string | yes | The model name to generate or refresh |

**What it generates:**

```
{module}/
├── entities/
│   └── {model}.entity.ts         # TypeORM entity extending CommonEntity
├── services/
│   └── {model}.service.ts        # NestJS service extending CRUDService
├── controllers/
│   └── {model}.controller.ts     # REST controller with CRUD, upload, soft-delete endpoints
├── repositories/
│   └── {model}.repository.ts     # Custom repository extending SolidBaseRepository
└── dtos/
    ├── create-{model}.dto.ts     # Create DTO with field-level validation decorators
    └── update-{model}.dto.ts     # Update DTO (partial, extends create DTO)
```

Each file is generated with the correct imports, class decorators, TypeORM column annotations, `class-validator` decorators, and Swagger `@ApiProperty` decorators based on the field definitions in the metadata.

---

### `remove-fields`

Removes one or more fields from an existing model's entity and both DTOs, cleaning up all associated decorators and imports. This is the inverse of the field-addition path in `refresh-model`. This command is invoked under the hood by SolidX when you delete a field from the model builder UI.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `module` | string | yes | The module the model belongs to |
| `model` | string | yes | The model to remove fields from |
| `fieldNamesForRemoval` | string \| string[] | yes | Field name(s) to remove |

---

## Supported field types

The generator understands 20+ semantic field types and applies the appropriate TypeORM column definitions, validation decorators, and relation handling for each:

| Category | Field Types |
|---|---|
| Text | `shortText`, `longText`, `richText` |
| Numeric | `int`, `bigint`, `decimal` |
| Date & Time | `date`, `datetime`, `time` |
| Boolean | `boolean` |
| Structured | `json` |
| Relations | `relation` — ManyToOne, OneToMany, ManyToMany |
| Media | `mediaSingle`, `mediaMultiple` |
| Selection | `selectionStatic`, `selectionDynamic` |
| Special | `email`, `password`, `uuid`, `computed` |

Each field type has a dedicated handler that manages changes to all three target files (entity, create DTO, update DTO) independently, ensuring the right decorators are applied in the right place.

---

## Installation

This package is consumed automatically by `@solidxai/core` as a dependency — you do not need to install it directly in most cases. It is invoked by the `solid refresh-model` and `solid refresh-module` CLI commands.

If you need to use it standalone:

```bash
npm install @solidxai/code-builder
```
---

## Tech stack

| Concern | Technology |
|---|---|
| Schematic engine | Angular Schematics (`@angular-devkit/schematics`) |
| NestJS integration | `@nestjs/schematics` |
| Validation | `class-validator` |
| Build | TypeScript compiler (`tsc`) + `tsc-alias` |

---

## Part of the SolidX Platform

`@solidxai/code-builder` works in concert with the other SolidX packages:

| Package | Role |
|---|---|
| [`@solidxai/core`](https://www.npmjs.com/package/@solidxai/core) | NestJS backend module; invokes this package via its `solid` CLI |
| [`@solidxai/core-ui`](https://www.npmjs.com/package/@solidxai/core-ui) | React admin panel that drives the visual model builder |
| `@solidxai/code-builder` | Code generation engine (this package) |

When a developer uses the SolidX app builder to define a new model or add a field, `@solidxai/core-ui` saves the metadata, `@solidxai/core` exposes the CLI command, and `@solidxai/code-builder` does the actual file generation. The result is standard, human-readable NestJS code that your team owns and can extend freely.

| | |
|---|---|
| Website | [solidxai.com](https://solidxai.com) |
| Documentation | [docs.solidxai.com](https://docs.solidxai.com/docs) |
| Support | support@solidxai.com |

---

## License

BSL-1.1 © [Logicloop](https://logicloop.io)
