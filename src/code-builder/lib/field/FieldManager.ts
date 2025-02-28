import { Tree } from '@angular-devkit/schematics';
import ts, { PropertyDeclaration } from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNodes, insertImport } from '@schematics/angular/utility/ast-utils';
import { Change, NoopChange, RemoveChange, ReplaceChange } from '@schematics/angular/utility/change';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { BigIntFieldHandler } from './field-managers/bigint/BigIntFieldHandler';
import { BooleanFieldHandler } from './field-managers/boolean/BooleanFieldHandler';
import { ComputedFieldHandler } from './field-managers/computed/ComputedFieldHandler';
import { DateFieldHandler } from './field-managers/date/DateFieldHandler';
import { DecimalFieldHandler } from './field-managers/decimal/DecimalFieldHandler';
import { EmailFieldHandler } from './field-managers/email/EmailFieldHandler';
import { IntFieldHandler } from './field-managers/int/IntFieldHandler';
import { JsonFieldHandler } from './field-managers/json/JsonFieldHandler';
import { LongTextFieldHandler } from './field-managers/long-text/LongTextFieldHandler';
import { NoOpsFieldHandler } from './field-managers/no-ops/NoOpsFieldHandler';
import { PasswordFieldHandler } from './field-managers/password/PasswordFieldHandler';
import { ManyToManyRelationFieldHandler } from './field-managers/relation/ManyToManyRelationFieldHandler';
import { ManyToOneRelationFieldHandler } from './field-managers/relation/ManyToOneRelationFieldHandler';
import { RichTextFieldHandler } from './field-managers/rich-text/RichTextFieldHandler';
import { ShortTextFieldHandler } from './field-managers/short-text/ShortTextFieldHandler';
import { UUIDFieldHandler } from './field-managers/uuid/UUIDFieldHandler';
import { SOLID_CORE_MODULE_NAME, SOLID_CORE_MODULE_NPM_PACKAGE_NAME } from '../model/helpers';
import { OneToManyRelationFieldHandler } from './field-managers/relation/OneToManyRelationFieldHandler';
import { ManyToManyInverseRelationFieldHandler } from './field-managers/relation/ManyToManyInverseRelationFieldHandler';

export const MAX_EMAIL_LENGTH = 254;
export const UUID_REGEX = `^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`;

enum SolidFieldType {
  // numeric types
  int = 'int',
  bigint = 'bigint',
  // float = 'float',
  // double = 'double',
  decimal = 'decimal',

  // text types
  shortText = 'shortText',
  longtext = 'longText',
  richText = 'richText',
  json = 'json',

  // boolean types
  boolean = 'boolean',

  // date
  date = 'date',
  datetime = 'datetime',
  time = 'time',

  // relation
  relation = 'relation',

  // media
  mediaSingle = 'mediaSingle',
  mediaMultiple = 'mediaMultiple',

  email = 'email',
  password = 'password',

  // selection
  selectionStatic = 'selectionStatic',
  selectionDynamic = 'selectionDynamic',

  uuid = 'uuid',
  computed = 'computed',

}

export enum DecoratorType {
  Max = 'max',
  Min = 'min',
  Required = 'required',
  Optional = 'optional',
  Regex = 'regex',
  Number = 'number',
  String = 'string',
  Int = 'int',
  Decimal = 'decimal',
  Date = 'date',
  Boolean = 'boolean',
  Json = 'json',
  Transform = 'transform',
  Array = 'array',
  ValidateNested = 'validateNested',
  BigInt = "bigint",
  MinLength = 'minLength',
  MaxLength = 'maxLength',
  ApiProperty = 'apiProperty'
}

export enum DeleteType {
  CASCADE = 'CASCADE',
  RESTRICT = 'RESTRICT',
  SET_NULL = 'SET_NULL',
  SET_DEFAULT = 'SET_DEFAULT'
}

export interface FieldHandler {
  entityFieldManager: FieldManager;
  createDtoFieldManager: FieldManager;
  updateDtoFieldManager: FieldManager;
  addEntityField(): FieldChange[];
  addDtoField(): FieldChange[];
  removeEntityField(): FieldChange[];
  removeDtoField(): FieldChange[];
  updateEntityField(): FieldChange[];
  updateDtoField(): FieldChange[];
}

export interface FieldType {
  text: string;
  node: (field: any) => ts.TypeNode;
}

export interface DefaultValueInitializer {
  value: any;
  text: string;
  expression: ts.Expression;
}

export interface DecoratorManager {
  fieldNode?: PropertyDeclaration;
  options: any;
  // addDecorator(): PropertyDeclaration;
  // removeDecorator(): PropertyDeclaration;
  updateDecorator(): [ts.PropertyDeclaration, Change[]];
  buildDecorator(): PartialAddFieldChange;
  setFieldNode(fieldNode: PropertyDeclaration): void;
  decoratorName(): string;
  isApplyDecorator(): boolean;
}

export interface FieldManager {
  source: ts.SourceFile;
  addField(): FieldChange[];
  removeField(): FieldChange[];
  updateField(): FieldChange[];
  fieldName(): string;
  fieldType(): FieldType;
}

export interface FieldChange {
  filePath: string;
  field: any;
  changes: Change[];
}

export class PartialAddFieldChange implements FieldChange {
  filePath: string;
  field: any;
  changes: Change[] = [];
  fieldSourceLines: string[] = [];
}

// export class PartialUpdateFieldChange implements FieldChange {
//   filePath: string;
//   field: any;
//   changes: Change[] = [];
//   updatedPropertyNode: PropertyDeclaration;
// }

export class RemoveChangeSSS extends RemoveChange {
  removePosition: number;
  constructor(path: string, pos: number, toRemove: string) {
    super(path, pos, toRemove);
    this.removePosition = pos;
  }
}

export class ReplaceChangeSSS extends ReplaceChange {
  replacePosition: number;
  constructor(path: string, pos: number, oldText: string, newText: string) {
    super(path, pos, oldText, newText);
    this.replacePosition = pos;
  }
}


export function getFieldHandler(
  tree: Tree,
  moduleName: string,
  modelName: string,
  field: any,
): FieldHandler {
  // console.log('field', field);
  switch (field.type) {
    case SolidFieldType.shortText:
    case SolidFieldType.selectionStatic:
    case SolidFieldType.selectionDynamic:
      if (field.selectionValueType === "int") {
        return new IntFieldHandler(tree, moduleName, modelName, field);
      }
      return new ShortTextFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.longtext:
      return new LongTextFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.richText:
      return new RichTextFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.json:
      return new JsonFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.int:
      return new IntFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.decimal:
      return new DecimalFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.bigint:
      return new BigIntFieldHandler(tree, moduleName, modelName, field);  
    case SolidFieldType.boolean:
      return new BooleanFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.email:
      return new EmailFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.password:
      return new PasswordFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.date:
    case SolidFieldType.datetime:
    case SolidFieldType.time:
      return new DateFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.relation: {
      if (field.relationType === RelationType.ManyToOne) {
        return new ManyToOneRelationFieldHandler(tree, moduleName, modelName, field);
      }
      else if (field.relationType === RelationType.OneToMany) {
        return new OneToManyRelationFieldHandler(tree, moduleName, modelName, field);
      }
      else if (field.relationType === RelationType.ManyToMany) {
        if (field.isRelationManyToManyOwner) {
          return new ManyToManyRelationFieldHandler(tree, moduleName, modelName, field);
        }
        else {
          return new ManyToManyInverseRelationFieldHandler(tree, moduleName, modelName, field);
        }
      }
      return new NoOpsFieldHandler(tree, moduleName, modelName, field);
    }
    case SolidFieldType.mediaSingle:
    case SolidFieldType.mediaMultiple:
      return new NoOpsFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.uuid:
      return new UUIDFieldHandler(tree, moduleName, modelName, field);
    case SolidFieldType.computed:
      return new ComputedFieldHandler(tree, moduleName, modelName, field);
    default:
      console.log(`Field ${field.name} of type ${field.type} not supported yet`);
      return new NoOpsFieldHandler(tree, moduleName, modelName, field);
  }
}

export function createSourceFile(tree: Tree, filePath: string) {
  //if filePath starts with src/solid-core, replace it with src/
  if (filePath.startsWith(`src/${SOLID_CORE_MODULE_NAME }`)) {
    filePath = filePath.replace(`src/${SOLID_CORE_MODULE_NAME }`, 'src');
  }
  return ts.createSourceFile(
    filePath,
    tree.readText(filePath),
    ts.ScriptTarget.Latest,
    true,
  );
}

export function getClassNode(className: string, source: ts.SourceFile): ts.ClassDeclaration|undefined {
  const classNodes = findNodes(source, ts.SyntaxKind.ClassDeclaration)as ts.ClassDeclaration[];
  return classNodes.find(node => node.name && node.name.text === className);
}

export function getClassExportKeywordNode (className: string, sourceFile: ts.SourceFile): ts.ExportKeyword | undefined{
  const classNode = getClassNode(className, sourceFile);

  if (!classNode) {
    throw new Error(`Class "${className}" not found`);
  }

  // Find the `export` modifier
  const exportModifier = classNode.modifiers?.find(
    (modifier): modifier is ts.ExportKeyword => modifier.kind === ts.SyntaxKind.ExportKeyword
    // (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  );

  return exportModifier;
};


export enum RelationType {
  ManyToOne = 'many-to-one',
  ManyToMany = 'many-to-many',
  OneToMany = "one-to-many"
}

export enum DtoSourceType {
  Create = 'create',
  Update = 'update',
}

export class ManagerForDtoOptions {
  constructor(
    public sourceType: DtoSourceType,
  ) {}
}
// insertImport(this.source, this.source.fileName, `Update${classify(this.field.relationModelSingularName)}Dto`, relatedEntityPath);
export function safeInsertImport(source: ts.SourceFile, symbolName: string, importFileName: string, currentModuleName: string ): Change {
  // Check if in current source, there exists a class with the same symbolName
  if (importFileName.startsWith(`src/${SOLID_CORE_MODULE_NAME }`)) {
    if (currentModuleName === SOLID_CORE_MODULE_NAME) {
      importFileName = importFileName.replace(`src/${SOLID_CORE_MODULE_NAME }`, 'src');
    }
    else {
      importFileName = SOLID_CORE_MODULE_NPM_PACKAGE_NAME;
    }
  }

  if (!getClassNode(symbolName, source)){
    return insertImport(source, source.fileName, symbolName, importFileName);
  }
  return new NoopChange();
}

// Register a custom decorator
export function IsBigInt(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isBigInt',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return typeof value === 'bigint';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a BigInt`;
        },
      },
    });
  };
}
