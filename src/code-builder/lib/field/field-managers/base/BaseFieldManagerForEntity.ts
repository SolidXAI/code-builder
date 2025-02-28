import {
  classify,
  dasherize
} from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';
import ts, {
  PropertyDeclaration,
  SourceFile
} from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { findNodes } from '@schematics/angular/utility/ast-utils';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import {
  DecoratorManager, DefaultValueInitializer, FieldChange,
  FieldManager,
  FieldType,
  PartialAddFieldChange,
  RemoveChangeSSS,
  ReplaceChangeSSS,
  createSourceFile,
  getClassExportKeywordNode,
  getClassNode
} from '../../FieldManager';
import { ColumnDecoratorManager } from '../../decorator-managers/entity/ColumnDecoratorManager';
import { IndexDecoratorManager } from '../../decorator-managers/entity/IndexDecoratorManager';
import { ManyToOneDecoratorManager } from '../../decorator-managers/entity/ManyToOneDecoratorManager';
import { ManyToManyDecoratorManager } from '../../decorator-managers/entity/ManyToManyDecoratorManager';
import { JoinTableDecoratorManager } from '../../decorator-managers/entity/JoinTableDecoratorManager';
import { RelationType } from "../../FieldManager";
import { UniqueIndexDecoratorManager } from '../../decorator-managers/entity/UniqueIndexDecoratorManager';
import { JoinColumnDecoratorManager } from '../../decorator-managers/entity/JoinColumnDecoratorManager';

export abstract class BaseFieldManagerForEntity implements FieldManager {
  source: SourceFile;
  indexDecoratorManager: IndexDecoratorManager;
  columnDecoratorManager: ColumnDecoratorManager;
  manyToOneDecoratorManager: ManyToOneDecoratorManager;
  joinColumnDecoratorManager: DecoratorManager;
  manyToManyDecoratorManager: DecoratorManager;
  joinTableDecoratorManager: DecoratorManager;
  uniqueIndexDecoratorManager: UniqueIndexDecoratorManager;
  constructor(
    tree: Tree,
    protected readonly moduleName: string,
    protected readonly modelName: string,
    protected readonly field: any,
  ) {
    // TODO: Note that the source file instance is created during construction
    // So every operation should use a new instance of the field manager, so updated tree/source is used before each operation
    this.source = createSourceFile(
      tree,
      `src/${dasherize(moduleName)}/entities/${dasherize(modelName)}.entity.ts`,
    );

    const fieldPropertyDeclarationNode = this.getFieldIdentifierNode(
      this.fieldName(),
      this.source
    )?.parent as PropertyDeclaration | undefined;

    this.indexDecoratorManager = new IndexDecoratorManager(
      { index: this.field.index, source: this.source, field: this.field },
      fieldPropertyDeclarationNode,
    );
    this.columnDecoratorManager = new ColumnDecoratorManager(
      {
        isColumn: this.isColumn(),
        columnName: this.field.columnName,
        type: this.field.ormType,
        required: this.field.required,
        otherOptions: this.additionalColumnDecoratorOptions(),
        otherOptionExpressions: this.additionalColumnDecoratorOptionExpressions(),
        source: this.source,
        field: this.field,
      },
      fieldPropertyDeclarationNode,
    );
    this.manyToOneDecoratorManager = new ManyToOneDecoratorManager(
      {
        isManyToOne: this.isManyToOne(),
        relationModelSingularName: this.field.relationModelSingularName,
        relationCascade: this.field.relationCascade,
        required: this.field.required,
        source: this.source,
        field: this.field,
        fieldName: this.fieldName(),
        modelName: this.modelName,
      },
      fieldPropertyDeclarationNode,
    );
    this.joinColumnDecoratorManager = new JoinColumnDecoratorManager(
      {
        isManyToOneRelationOwner: this.isManyToOne(),
        source: this.source,
        field: this.field,
        fieldName: this.fieldName(),
        relationModelFieldName: this.field.relationModelFieldName
      },
    );
    this.manyToManyDecoratorManager = new ManyToManyDecoratorManager(
      {
        isManyToMany: this.isManyToMany(),
        relationModelName: this.field.relationModelSingularName,
        relationInverseFieldName: this.field.relationModelFieldName,
        relationCascade: this.field.relationCascade,
        owner: this.field.isRelationManyToManyOwner,
        source: this.source,
        field: this.field,
        fieldName: this.fieldName(),
        modelName: this.modelName,
      },
    );
    this.joinTableDecoratorManager = new JoinTableDecoratorManager(
      {
        isManyToManyRelationOwner: this.isManyToMany() && this.field.isRelationManyToManyOwner,
        source: this.source,
        field: this.field,
        fieldName: this.fieldName(),
        modelName: this.modelName,
        relationJoinTableName: this.field.relationJoinTableName,
        relationJoinColumnName: this.field.relationJoinColumnName,
        joinColumnName: this. field.joinColumnName
      },
    );
    this.uniqueIndexDecoratorManager = new UniqueIndexDecoratorManager(
      { unique: this.field.unique, fieldName: this.fieldName(), source: this.source, field: this.field },
      this.getClassNode(this.modelName, this.source)
    );
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

    //Add the entity field declaration
    let entityPropertyLine = this.buildPropertyLine(fieldName, fieldType, field.defaultValue);
    fieldSourceLines.push(entityPropertyLine);

    //Add the decorators to the field declaration
    const builderChanges: PartialAddFieldChange[] = [];
    builderChanges.push(...this.applyBuildDecoratorTransformations(...decoratorManagers.reverse()));


    // Capture the changes and field source lines
    builderChanges.forEach((builderChange) => {
      changes.push(...builderChange.changes);
      fieldSourceLines.push(...builderChange.fieldSourceLines);
    });

    // Create the field definition changes
    // const classNode = findNodes(source, ts.SyntaxKind.ClassDeclaration)[0];
    const classNode = this.getClassNode(modelName, source);

    const fieldDefinition = `\n${fieldSourceLines.reverse().join('\n')}\n`;
    changes.push(
      new InsertChange(
        source.fileName,
        classNode.end - 1,
        fieldDefinition
      )
    );

    // Apply the unique index decorator changes at the class node level
    changes.push(...this.applyBuildDecoratorTransformationForUniqueIndex(modelName, source));

    return {
      filePath: source.fileName,
      field: field,
      changes: changes,
    };
  }

  private applyBuildDecoratorTransformationForUniqueIndex(modelName: any, source: ts.SourceFile): Change[] {
    const changes: Change[] = [];
    if (!this.uniqueIndexDecoratorManager.isApplyDecorator()) return changes;
    const uniqueIndexDecoratorChanges = this.uniqueIndexDecoratorManager.buildDecorator();
    const classDecoratorLines = `${uniqueIndexDecoratorChanges.fieldSourceLines.reverse().join('\n')}\n`;
    const classExportKeywordNode = getClassExportKeywordNode(classify(modelName), source);
    if (!classExportKeywordNode) {
      throw new Error(`Export keyword not found for class ${modelName} in file ${source.fileName}`);
    }
    const classExportKeywordStartPosition = classExportKeywordNode.getStart(source);
    changes.push(...uniqueIndexDecoratorChanges.changes);
    changes.push(
      new InsertChange(
        source.fileName,
        classExportKeywordStartPosition,
        classDecoratorLines
      )
    );
    return changes;
  }

  private uniqueIndexDecoratorChanges(): [ts.ClassDeclaration, Change[]] {
    const changes: Change[] = [];
    const [updatedClassNode, indexDecoratorChanges] = this.uniqueIndexDecoratorManager.updateDecorator();
    changes.push(...indexDecoratorChanges);
    return [updatedClassNode, changes];
    // changes.push(...this.calculateReplaceChanges(this.printNode(updatedClassNode, source), classNode, source));
  }

  private getClassNode(modelName: any, source: ts.SourceFile) {
    const className = classify(modelName);
    const classNode = getClassNode(className, source);
    if (!classNode) {
      throw new Error(`Class ${className} not found in file ${source.fileName}`);
    }
    return classNode;
  }

  private buildPropertyLine(fieldName: string, fieldType: string, defaultConfigValue: string) {
    let entityPropertyLine = `${fieldName}: ${fieldType}`;
    const defaultValue = this.defaultValueInitializer(defaultConfigValue)?.text ?? null;
    if (defaultValue) {
      entityPropertyLine += ` = ${defaultValue}`;
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
    const decoratorManagers = this.decoratorManagers();

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
      this.updateFieldInitializer(fieldPropertyDeclarationNode, this.defaultValueInitializer(field.defaultValue)?.expression);

    // Apply the decorator transformations  to the field property declaration node
    const [updatedPropertyDeclarationNodeTransformed, decoratorChanges] = this.applyUpdateDecoratorTransformations(updatedPropertyDeclarationNode, ...decoratorManagers);
    updatedPropertyDeclarationNode = updatedPropertyDeclarationNodeTransformed;
    changes.push(...decoratorChanges);

    // Currently additional field support is only limited to relation fields for entities, so there is no need to update the class nodes
    // Since unique index decorator supported is only for fields which are not relation fields.
    // Also the current additional field algorithm is not able to deal with the class where the primary field operations modifies the class node
    if (!this.isAdditionalFieldRequired()) { 
      // Update the property declaration node in the class hierarchy with the updated property declaration node
      // Then calculate the replace changes
      this.uniqueIndexDecoratorManager.setFieldNode(updatedPropertyDeclarationNode);
      // Apply the unique index decorator changes at the class node level
      const [updatedClassNode, uniqueIndexDecoratorChanges] =  this.uniqueIndexDecoratorChanges();
      changes.push(...uniqueIndexDecoratorChanges);
      changes.push(...this.calculateReplaceChanges(this.printNode(updatedClassNode, source), this.getClassNode(this.modelName, source), source)); //FIXME: avoid this.modelName to passed in for avoiding statefullness
    }
    else {
      changes.push (...this.calculateReplaceChanges(this.printNode(updatedPropertyDeclarationNode, source), fieldPropertyDeclarationNode, source));
    }
    return {
      filePath: source.fileName,
      field: field,
      changes: changes,
    };
  }

  updateField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];

    console.log(`\nentity updateField ${this.fieldName()} called ...`);

    const fieldName = this.fieldName();
    const fieldType = this.fieldType().node(this.field);
    const source = this.source
    const field = this.field
    const decoratorManagers = this.decoratorManagers();

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

  //TODO how to handle scenarios, wherein fieldname() implementation has changed later, after add field code was autogenerated
  removeField(): FieldChange[] {
    const fieldChanges: FieldChange[] = [];
    console.log(`Entity removeField ${this.fieldName()} called ...`);
    fieldChanges.push(this.removeFieldFor(this.fieldName(), this.source));
    if (this.isAdditionalFieldRequired()) {
      fieldChanges.push(this.removeAdditionalField());
    }
    return fieldChanges;
  }

  protected removeFieldFor(fieldName: string, fieldSource: SourceFile) {
    const fieldIdentifierNode = this.getFieldIdentifierNode(fieldName, fieldSource);
    if (fieldIdentifierNode == null) {
      return {
        filePath: fieldSource.fileName,
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

  protected calculateReplaceChanges(updateNodeText: string, sourceNode: ts.Node, source: SourceFile): Change[] {
    const changes: Change[] = [];
    if (updateNodeText.trim() !==
      sourceNode.getFullText().trim()) {
      console.log(`Updated Code:\n${updateNodeText.trim()}\nwith length ${updateNodeText.trim().length}\n`);
      console.log(`Old Code:\n${sourceNode.getFullText().trim()}\nwith length ${sourceNode.getFullText().trim().length}\n`);
      const replaceChange = new ReplaceChangeSSS(
        source.fileName,
        sourceNode.pos,
        sourceNode.getFullText(),
        `\n\n${updateNodeText}`
      );
      changes.push(replaceChange);
    }
    return changes;
  }

  protected printNode(updatedPropertyDeclarationNode: ts.Node, nodeSource: SourceFile) { //FIXME: Check if source needs to be passed here too
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false,
      omitTrailingSemicolon: false,
    });

    const updatedPropertyDeclarationNodeText = printer.printNode(
      ts.EmitHint.Unspecified,
      updatedPropertyDeclarationNode,
      nodeSource
    );
    return updatedPropertyDeclarationNodeText;
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

  fieldName(): string {
    return this.field.name;
  }

  abstract fieldType(): FieldType;
  protected additionalColumnDecoratorOptions(): Map<string, any> {
    return new Map<string, any>();
  }

  protected additionalColumnDecoratorOptionExpressions(): Map<string, ts.Expression | null> {
    return new Map<string, ts.Expression>();
  }

  private updateFieldType(
    fieldPropertyDeclarationNode: ts.PropertyDeclaration,
    newTypeNode?: ts.TypeNode,
  ): ts.PropertyDeclaration {
    if (!newTypeNode) return fieldPropertyDeclarationNode;
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

  private updateFieldInitializer(
    fieldPropertyDeclarationNode: ts.PropertyDeclaration,
    initializer?: ts.Expression): ts.PropertyDeclaration {
      if (!initializer) return fieldPropertyDeclarationNode;
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

  protected inverseRelationFieldName(): string {
    return `${this.field.relationModelSingularName}s`;
  }


  private isManyToOne(): boolean {
    return (this.field.type === 'relation' && this.field.relationType === RelationType.ManyToOne);
  }



  protected isAdditionalFieldRequired(): boolean {
    return false;
  }

  protected isManyToMany(): boolean {
    return (this.field.type === 'relation' && this.field.relationType === RelationType.ManyToMany);
  }

  private isColumn(): boolean {
    return this.field.type !== 'relation';
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
        partialFieldChanges.push(transformer.buildDecorator());
      };
    }
  }

  private decoratorManagers(): DecoratorManager[] {
    return [this.indexDecoratorManager, this.columnDecoratorManager, this.manyToOneDecoratorManager, this.joinColumnDecoratorManager, this.manyToManyDecoratorManager, this.joinTableDecoratorManager];
  }

  protected addAdditionalField(): FieldChange[] {
    throw new Error(`addAdditionalField method not implemented for field ${this.fieldName()} of type ${this.field.type}`);
  }

  protected addOrUpdateAdditionalField(): FieldChange[] {
    throw new Error(`addOrUpdateAdditionalField method not implemented for field ${this.fieldName()} of type ${this.field.type}`);
  }

  protected removeAdditionalField(): FieldChange {
    return {
      filePath: this.source.fileName,
      field: this.field,
      changes: [],
    }
  }

  additionalFieldName(): string {
    throw new Error(`additionalFieldName method not implemented for field ${this.fieldName()} of type ${this.field.type}`);
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
}