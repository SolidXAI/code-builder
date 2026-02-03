import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';
import ts, {
  ClassDeclaration,
  PropertyDeclaration,
  SourceFile,
} from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import {
  findNodes
} from '@schematics/angular/utility/ast-utils';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import {
  DecoratorManager,
  DecoratorType,
  DefaultValueInitializer,
  DtoSourceType,
  FieldChange,
  FieldManager,
  FieldType,
  ManagerForDtoOptions,
  PartialAddFieldChange,
  RemoveChangeSSS,
  ReplaceChangeSSS,
  createSourceFile,
  getClassNode
} from '../../FieldManager';
import { ArrayDecoratorManager } from '../../decorator-managers/dto/ArrayDecoratorManager';
import { BooleanDecoratorManager } from '../../decorator-managers/dto/BooleanDecoratorManager';
import { DateDecoratorManager } from '../../decorator-managers/dto/DateDecoratorManager';
import { DecimalDecoratorManager } from '../../decorator-managers/dto/DecimalDecoratorManager';
import { IntDecoratorManager } from '../../decorator-managers/dto/IntDecoratorManager';
import { JsonDecoratorManager } from '../../decorator-managers/dto/JsonDecoratorManager';
import { MaxDecoratorManager } from '../../decorator-managers/dto/MaxDecoratorManager';
import { MinDecoratorManager } from '../../decorator-managers/dto/MinDecoratorManager';
import { NumberDecoratorManager } from '../../decorator-managers/dto/NumberDecoratorManager';
import { OptionalDecoratorManager } from '../../decorator-managers/dto/OptionalDecoratorManager';
import { RegexDecoratorManager } from '../../decorator-managers/dto/RegexDecoratorManager';
import { RequiredDecoratorManager } from '../../decorator-managers/dto/RequiredDecoratorManager';
import { StringDecoratorManager } from '../../decorator-managers/dto/StringDecoratorManager';
import { TransformDecoratorManager } from '../../decorator-managers/dto/TransformDecoratorManager';
import { ValidateNestedDecoratorManager } from '../../decorator-managers/dto/ValidateNestedDecoratorManager';
import { BigIntDecoratorManager } from '../../decorator-managers/dto/BigIntDecoratorManager';
import { MaxLengthDecoratorManager } from '../../decorator-managers/dto/MaxLengthDecoratorManager';
import { MinLengthDecoratorManager } from '../../decorator-managers/dto/MinLengthDecoratorManager';
import { ApiPropertyDecoratorManager } from '../../decorator-managers/dto/ApiPropertyDecoratorManager';

// This class manages the field generation for the DTOs
// It adds validation decorators to the fields
// The validation decorators added use the class-validator library
export abstract class BaseFieldManagerForDto implements FieldManager {
  source: SourceFile;
  updatedSourceClassNode?: ts.ClassDeclaration;
  decoratorManagers: DecoratorManager[];

  constructor(
    tree: Tree,
    protected readonly moduleName: string,
    protected readonly modelName: string,
    protected readonly field: any,
    protected readonly options: ManagerForDtoOptions,
  ) {
    const sourceFileName = (options.sourceType === DtoSourceType.Create) ? `create-${dasherize(modelName)}.dto.ts` : `update-${dasherize(modelName)}.dto.ts`;
    const sourcePath = `src/${dasherize(moduleName)}/dtos/${sourceFileName}`;
    this.source = createSourceFile(
      tree,
      sourcePath,
    );
    this.decoratorManagers = this.getFieldDecoratorManagers(
      this.field,
      this.source,
      DecoratorType.Max,
      DecoratorType.Min,
      DecoratorType.MinLength,
      DecoratorType.MaxLength,
      DecoratorType.Required,
      DecoratorType.Optional,
      DecoratorType.Regex,
      DecoratorType.Number,
      DecoratorType.Int,
      DecoratorType.Decimal,
      DecoratorType.String,
      DecoratorType.Date,
      DecoratorType.Boolean,
      DecoratorType.Json,
      DecoratorType.ApiProperty
    );
  }

  removeField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];
    console.log(`Dto removeField ${this.fieldName()} called ...`);
    fieldChanges.push(this.removeFieldFor(this.fieldName(), this.source));
    if (this.isAdditionalFieldRequired()) {
      fieldChanges.push(...this.removeAdditionalField());
    }
    return fieldChanges;
  }


  fieldName(): string {
    return this.field.name;
  }

  protected removeFieldFor(fieldName: string, fieldSource: SourceFile): FieldChange {
    const fieldIdentifierNode = this.getFieldIdentifierNode(fieldName, fieldSource);
    if (fieldIdentifierNode == null) {
      // throw new Error(`Could not remove field. Field: ${fieldName} is missing in entity ${classify(this.modelName)}.`);
      return {
        filePath: this.source.fileName,
        field: this.field,
        changes: [],
      };
    }
    const propertyDeclarationNode = fieldIdentifierNode.parent;
    return {
      filePath: fieldSource.fileName,
      field: this.field,
      changes: [
        new RemoveChangeSSS(
          fieldSource.fileName,
          propertyDeclarationNode.pos,
          propertyDeclarationNode.getFullText(),
        ),
      ],
    };
  }

  protected getFieldIdentifierNode(fieldName: string, fieldSource: SourceFile) {
    return findNodes(fieldSource, ts.SyntaxKind.Identifier)
      .filter((node) => node.getText() === fieldName)
      .filter((node) => node?.parent && ts.isPropertyDeclaration(node?.parent))
      .pop();
  }

  protected isFieldPresent(fieldName: string, fieldSource: SourceFile): boolean {
    return this.getFieldIdentifierNode(fieldName, fieldSource) != null;
  }

  protected addFieldInternal(fieldName: string, fieldType: string, decoratorManagers: DecoratorManager[], field: any, modelName: any, source: ts.SourceFile): FieldChange {
    //FIXME There might a case where the main field is not present, but additional field is present. Do we update the fields or throw an error. Needs to be discussed
    // For now, we assume, that if primary field is not present, then additional field is also not present
    if (this.isFieldPresent(fieldName, source)) {
      return {
        filePath: source.fileName,
        field: field,
        changes: [],
      }
      // throw new Error(
      //   `Field: ${fieldName} already exists in entity ${classify(modelName)}. Use the updateField() method to modify the field`
      // );
    }

    const fieldSourceLines = [];
    const changes: Change[] = [];

    //Add the dto field declaration
    let dtoPropertyLine = this.buildPropertyLine(fieldName, fieldType, field.defaultValue);
    fieldSourceLines.push(dtoPropertyLine);

    //Add the decorators to the field declaration
    const builderChanges: PartialAddFieldChange[] = [];
    builderChanges.push(...this.applyBuildDecoratorTransformations(...decoratorManagers.reverse()));


    // Capture the changes and field source lines
    builderChanges.forEach((builderChange) => {
      changes.push(...builderChange.changes);
      fieldSourceLines.push(...builderChange.fieldSourceLines);
    });

    const classNode = this.getClassNode(modelName, this.options, source);

    const fieldDefinition = `\n${fieldSourceLines.reverse().join('\n')}\n\n`;
    changes.push(
      new InsertChange(
        source.fileName,
        classNode.end - 1,
        fieldDefinition
      )
    );

    return {
      filePath: source.fileName,
      field: field,
      changes: changes,
    };
  }

  private buildPropertyLine(fieldName: string, fieldType: string, defaultConfigValue: string) {
    let entityPropertyLine = `${fieldName}: ${fieldType}`;
    if (this.options.sourceType === DtoSourceType.Create) {
      const defaultValue = this.defaultValueInitializer(defaultConfigValue)?.text ?? null;
      if (defaultValue) {
        entityPropertyLine += ` = ${defaultValue}`;
      }
    }
    entityPropertyLine += ';';
    return entityPropertyLine;
  }

  addField(): FieldChange[] {

    const fieldChanges: FieldChange[] = [];

    const fieldName = this.fieldName();
    const fieldType = this.fieldType().text;
    const source = this.source
    const field = this.field
    const modelName = this.modelName
    const decoratorManagers = this.decoratorManagers;

    fieldChanges.push(this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source));
    if (this.isAdditionalFieldRequired()) {
      // Get the related field property declaration node
      fieldChanges.push(...this.addAdditionalField());
    }
    return fieldChanges;
  }

  protected updateFieldInternal(fieldName: string, fieldType: ts.TypeNode, decoratorManagers: DecoratorManager[], field: any, source: ts.SourceFile): FieldChange {
    const changes: Change[] = [];

    // Get the field property declaration node
    const fieldPropertyDeclarationNode = this.getFieldIdentifierNode(
      fieldName,
      source,
    )?.parent as PropertyDeclaration;


    // FIXME Handle the imports related to the updated field type
    // Update the entity property declaration type
    let updatedPropertyDeclarationNode: ts.PropertyDeclaration =
      this.updateFieldType(fieldPropertyDeclarationNode, fieldType);

    updatedPropertyDeclarationNode =
    this.updateFieldInitializer(updatedPropertyDeclarationNode, this.defaultValueInitializer(field.defaultValue)?.expression);
  
    // Apply the decorator transformations  to the field property declaration node
    const [updatedPropertyDeclarationNodeTransformed, decoratorChanges] = this.applyUpdateDecoratorTransformations(updatedPropertyDeclarationNode, ...decoratorManagers);
    updatedPropertyDeclarationNode = updatedPropertyDeclarationNodeTransformed;
    changes.push(...decoratorChanges);

    // changes.push(...this.calculateReplaceChanges(this.printNode(updatedPropertyDeclarationNode, source), fieldPropertyDeclarationNode, source));

    // if (!this.isAdditionalFieldRequired()) {
      // Get the source class node i.e CreateDto or UpdateDto
      const sourceClassNode = this.getClassNode(this.modelName, this.options, source); // FIXME Avoid this.model to avoid stateful behaviour
      const classNode = this.updatedSourceClassNode ?? sourceClassNode;
      // Set the updated property declaration node to the source class node
      const updatedClassNode = this.updateClassNode(classNode, updatedPropertyDeclarationNode, fieldName);
      this.updatedSourceClassNode = updatedClassNode; // Set the updated class node to the source class node, so it can be used for additional operations e.g for additional field updates
      changes.push(...this.calculateReplaceChanges(this.printNode(updatedClassNode, source), sourceClassNode, source.fileName)); 
    // }
    // else {
    //   changes.push(...this.calculateReplaceChanges(this.printNode(updatedPropertyDeclarationNode, source), fieldPropertyDeclarationNode, source.fileName));
    // }

    return {
      filePath: source.fileName,
      field: field,
      changes: changes,
    };
  }

  updateClassNode(sourceClassNode: ts.ClassDeclaration, updatedFieldNode: ts.PropertyDeclaration, fieldName: string): ClassDeclaration {
    // Replace the class memeber matching the field name with the updated field node
    const newMembers = sourceClassNode.members.map((member) => {
      // Check if the member is a PropertyDeclaration
      if (ts.isPropertyDeclaration(member)) {
        // Compare the name of the property with the field name
        const memberName = member.name.getText();
        if (memberName === fieldName) {
          return updatedFieldNode!;
        }
      }
      return member;
    });

    // Update the class node with the new modifiers
    const updatedClass = ts.factory.updateClassDeclaration(
      sourceClassNode,
      sourceClassNode.modifiers,
      sourceClassNode.name,
      sourceClassNode.typeParameters,
      sourceClassNode.heritageClauses,
      newMembers,
    );
    return updatedClass;
  }

  updateField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    console.log(`\ncreate Dto updateField ${this.fieldName()} called ...`);

    const fieldName = this.fieldName();
    const fieldType = this.fieldType().node(this.field);
    const source = this.source
    const field = this.field
    const decoratorManagers = this.decoratorManagers;

    //Validate if field exists
    if (!this.isFieldPresent(this.fieldName(), this.source)) {
      return this.addField();
    }
    const fieldChange = this.updateFieldInternal(fieldName, fieldType, decoratorManagers, field, source);
    fieldChanges.push(fieldChange);

    if (this.isAdditionalFieldRequired()) {
      // Get the related field property declaration node
      fieldChanges.push(...this.addOrUpdateAdditionalField()); // TODO This needs to be refactored and renamed to updateAdditionalField, since it is confusing
    }
    else {
      // fieldChanges.push(this.removeAdditionalField()); //FIXME temporary fix, to check update module command
    }

    return fieldChanges;
  }

  protected addAdditionalField(): FieldChange[] {
    throw new Error(`addAdditionalField method not implemented for field ${this.fieldName()} of type ${this.field.type}`);
  }

  protected addOrUpdateAdditionalField(): FieldChange[] {
    throw new Error(`addOrUpdateAdditionalField method not implemented for field ${this.fieldName()} of type ${this.field.type}`);
  }

  protected removeAdditionalField(): FieldChange[] {
    return [{
      filePath: this.source.fileName,
      field: this.field,
      changes: [],
    }]
  }

  updateFieldType(
    fieldPropertyDeclarationNode: ts.PropertyDeclaration,
    newTypeNode?: ts.TypeNode,
  ): ts.PropertyDeclaration {
    // console.log(
    //   `\nEntity updateFieldType ${this.fieldName()} called ... with existing field type: ${fieldPropertyDeclarationNode.type?.getText()}`,
    // );
    // const newTypeNode: ts.TypeNode = this.fieldType().node(this.field);

    const updatedPropertyDeclaration = ts.factory.updatePropertyDeclaration(
      fieldPropertyDeclarationNode,
      fieldPropertyDeclarationNode.modifiers,
      fieldPropertyDeclarationNode.name,
      fieldPropertyDeclarationNode.questionToken,
      newTypeNode, // Replace with new type node
      fieldPropertyDeclarationNode.initializer,
    );
    return updatedPropertyDeclaration;
  }

  //Abstract methods 
  // TODO : The apply methods can probably be gotten rid of. To enforce certain properties we can override constructor and set the properties e.g required is always false for many to many
  // TODO: The is methods can be replaced with a single method that returns all the decorator managers applicable for a particular type
  abstract fieldType(): FieldType;
  abstract isString(): boolean;
  abstract isNumber(): boolean;
  abstract isInt(): boolean;
  abstract isDecimal(): boolean;
  // abstract isApplyLength(): boolean;
  abstract isApplyRegex(): boolean;
  abstract isApplyRequired(): boolean;
  abstract isApplyMin(): boolean;
  abstract isApplyMax(): boolean;
  abstract isDate(): boolean;
  abstract isTransform(): boolean;
  abstract isJson(): boolean;
  abstract isBoolean(): boolean;
  protected isBigInt(): boolean { // Not keeping this abstract, as this abstract approach will be deprecated in future
    return false;
  };
  protected isApplyMinLength(): boolean { // Not keeping this abstract, as this abstract approach will be deprecated in future
    return false;
  }
  protected isApplyMaxLength(): boolean { // Not keeping this abstract, as this abstract approach will be deprecated in future
    return false;
  }

  protected isApplyApiProperty(): boolean { // Not keeping this abstract, as this abstract approach will be deprecated in future
    return true;
  }

  protected applyUpdateDecoratorTransformations(fieldPropertyDeclarationNode: ts.PropertyDeclaration, ...transformers: DecoratorManager[]): [ts.PropertyDeclaration, Change[]] {
    let updatedPropertyDeclarationNode = fieldPropertyDeclarationNode;
    const changes: Change[] = [];
    transformers.forEach(updateTransformation());
    return [updatedPropertyDeclarationNode, changes];

    function updateTransformation(): (value: DecoratorManager, index: number, array: DecoratorManager[]) => void {
      return transformer => {
        transformer.setFieldNode(updatedPropertyDeclarationNode);
        try {
          const [updatedPropertyDeclaration, updateChanges] = transformer.updateDecorator()
          updatedPropertyDeclarationNode = updatedPropertyDeclaration;
          changes.push(...updateChanges);
        } catch (error) {
          // console.log(`Error updating decorator for ${transformer.decoratorName()} with message: ${error.message}`);
          throw error;
        }
      }
    }
  }

  protected applyBuildDecoratorTransformations(...transformers: DecoratorManager[]): PartialAddFieldChange[] {
    const partialFieldChanges: PartialAddFieldChange[] = [];
    transformers.forEach(buildTransformation());
    return partialFieldChanges;

    function buildTransformation(): (value: DecoratorManager, index: number, array: DecoratorManager[]) => void {
      return transformer => {
        if (!transformer.isApplyDecorator()) return;
        try {
          partialFieldChanges.push(transformer.buildDecorator());
        } catch (error) {
          // console.log(`Error building decorator for ${transformer.decoratorName()} with message: ${error.message}`);
          throw error;
        }
      }
    }
  }

  protected calculateReplaceChanges(updatedSourceNodeText: string, sourceNode:ts.Node, sourceFileName: string): Change[] {
    const changes: Change[] = [];
    if (updatedSourceNodeText.trim() !==
      sourceNode.getFullText().trim()) {
      console.log(`Updated Code:\n${updatedSourceNodeText.trim()}\nwith length ${updatedSourceNodeText.trim().length}\n`);
      console.log(`Old Code:\n${sourceNode.getFullText().trim()}\nwith length ${sourceNode.getFullText().trim().length}\n`);
      const replaceChange = new ReplaceChangeSSS(
        sourceFileName,
        sourceNode.pos,
        sourceNode.getFullText(),
        `\n\n${updatedSourceNodeText}`
      );
      changes.push(replaceChange);
    }
    return changes;
  }

  protected printNode(updatedPropertyDeclarationNode: ts.Node, nodeSource: SourceFile): string {
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false,
      omitTrailingSemicolon: false,
    });

    let text = printer.printNode(
      ts.EmitHint.Unspecified,
      updatedPropertyDeclarationNode,
      nodeSource
    );

    // Add blank line between class members (after each field block)
    if (ts.isClassDeclaration(updatedPropertyDeclarationNode)) {
      text = text.replace(/;\n(\s*@|\s*\w)/g, ';\n\n$1');
    }

    return text;
  }

  protected isAdditionalFieldRequired(): boolean {
    return false;
  }

  //FIXME: This code is not useful, better initialize the decorators using the constructor, for now
  protected getFieldDecoratorManagers(field: any, source: SourceFile, ...decoratorTypes: DecoratorType[]): DecoratorManager[] {
    return decoratorTypes.map((decoratorType) => {
      switch (decoratorType) {
        case DecoratorType.Max:
          return new MaxDecoratorManager({ isApplyMax: this.isApplyMax(), max: field.max, source: source, field: field });
        case DecoratorType.Min:
          return new MinDecoratorManager({ isApplyMin: this.isApplyMin(), min: field.min, source: source, field: field });
        case DecoratorType.MinLength:
          return new MinLengthDecoratorManager({ isApplyMinLength: this.isApplyMinLength(), length: field.min, source: source, field: field });
        case DecoratorType.MaxLength:
          return new MaxLengthDecoratorManager({ isApplyMaxLength: this.isApplyMaxLength(), length: field.max, source: source, field: field });
        case DecoratorType.Required:
          return new RequiredDecoratorManager({ isApplyRequired: true, required: field.required, source: source, field: field });
        case DecoratorType.Optional:
          return new OptionalDecoratorManager({ isApplyOptional: true, optional: (this.options.sourceType === DtoSourceType.Update || !field.required), source: source, field: field });
        case DecoratorType.Regex:
          return new RegexDecoratorManager({ isApplyRegex: this.isApplyRegex(), regexPattern: field.regexPattern, regexPatternNotMatchingErrorMsg: field.regexPatternNotMatchingErrorMsg, source: source, field: field });
        case DecoratorType.Number:
          return new NumberDecoratorManager({ isNumber: this.isNumber(), source: source, field: field });
        case DecoratorType.String:
          return new StringDecoratorManager({ isString: this.isString(), source: source, field: field });
        case DecoratorType.Int:
          return new IntDecoratorManager({ isInt: this.isInt(), source: source, field: field });
        case DecoratorType.Decimal:
          return new DecimalDecoratorManager({ isDecimal: this.isDecimal(), source: source, field: field });
        case DecoratorType.BigInt:
          return new BigIntDecoratorManager({ isBigInt: this.isBigInt(), source: source, field: field });
        case DecoratorType.Date:
          return new DateDecoratorManager({ isDate: this.isDate(), source: source, field: field });
        case DecoratorType.Boolean:
          return new BooleanDecoratorManager({ isBoolean: this.isBoolean(), source: source, field: field });
        case DecoratorType.Json:
          return new JsonDecoratorManager({ isJson: this.isJson(), source: source, field: field });
        case DecoratorType.Transform:
          return new TransformDecoratorManager({ isTransform: true, type: this.fieldType().text.replace("[]", ""), source: source, field: field });
        case DecoratorType.Array:
          return new ArrayDecoratorManager({ isArray: true, source: source, field: field });
        case DecoratorType.ValidateNested:
          return new ValidateNestedDecoratorManager({ isValidateNested: true, source: source, field: field });
        case DecoratorType.ApiProperty:
          return new ApiPropertyDecoratorManager({ isApplyApiProperty: this.isApplyApiProperty(), source: source, field: field });
      }
    });
  }

  protected parseDefaultValue(defaultValueConfig: string): any | null {
    if (!defaultValueConfig) return null;
    return defaultValueConfig
  }

  protected defaultValueInitializer(defaultValueConfig: string): DefaultValueInitializer | null {
    const defaultValue = this.parseDefaultValue(defaultValueConfig);
    if (!defaultValue) return null;
    return {
      value: defaultValue,
      text: `"${defaultValue.toString()}"`,
      expression: ts.factory.createStringLiteral(defaultValue.toString())
    }
  }

  private getClassNode(modelName: any, options: ManagerForDtoOptions, source: ts.SourceFile) {
    // if (this.updatedSourceClassNode) {
    //   return this.updatedSourceClassNode;
    // }
    const classifiedModelName = classify(modelName);
    const sourceClassName = (options.sourceType === DtoSourceType.Create) ? `Create${classifiedModelName}Dto` : `Update${classifiedModelName}Dto`;
    const classNode = getClassNode(sourceClassName, source);
    if (!classNode) {
      throw new Error(`Class ${sourceClassName} not found in file ${source.fileName}`);
    }
    return classNode;
  }
  
    private updateFieldInitializer(
      fieldPropertyDeclarationNode: ts.PropertyDeclaration,
      initializer?: ts.Expression): ts.PropertyDeclaration {
        if (!initializer) return fieldPropertyDeclarationNode;
        if (this.options.sourceType === DtoSourceType.Update) return fieldPropertyDeclarationNode;

        const updatedPropertyDeclaration = ts.factory.updatePropertyDeclaration(
          fieldPropertyDeclarationNode,
          fieldPropertyDeclarationNode.modifiers,
          fieldPropertyDeclarationNode.name,
          fieldPropertyDeclarationNode.questionToken,
          fieldPropertyDeclarationNode.type, 
          initializer // Replace with new initializer
        );
        return updatedPropertyDeclaration;
    }
  
}