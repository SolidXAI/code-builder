import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';
import ts, { PropertyDeclaration } from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Change } from '@schematics/angular/utility/change';
import { ArrayDecoratorManager } from '../../decorator-managers/dto/ArrayDecoratorManager';
import { OptionalDecoratorManager } from '../../decorator-managers/dto/OptionalDecoratorManager';
import { StringDecoratorManager } from '../../decorator-managers/dto/StringDecoratorManager';
import { TransformDecoratorManager } from '../../decorator-managers/dto/TransformDecoratorManager';
import { DecoratorType, FieldChange, FieldManager, FieldType, ManagerForDtoOptions, safeInsertImport } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';

export class ManyToManyRelationFieldManagerForDto
    extends BaseFieldManagerForDto
    implements FieldManager {
    isJson(): boolean {
        return false;
    }
    isBoolean(): boolean {
        return false;
    }
    // relationInverseSource: ts.SourceFile;
    // relationInverseDecoratorManagers: DecoratorManager[];

    constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
        super(tree, moduleName, modelName, {...field, required: false}, options);
        this.decoratorManagers = [...this.decoratorManagers,...this.getFieldDecoratorManagers(
            this.field,
            this.source,
            DecoratorType.Array,
            DecoratorType.ValidateNested,
        )];
        this.decoratorManagers.push(
            new TransformDecoratorManager({ isTransform: true, type: this.transformType(this.field.relationModelSingularName), source: this.source, field: field })
        );
        
        // TODO : inverse source file logic is required, but needs to be handled in a better way
        // if (this.field.relationCreateInverse) {
        //     const relatedEntityFileName = (this.options.sourceType === DtoSourceType.Create) ? `create-${dasherize(this.field.relationModelSingularName)}.dto.ts` : `update-${dasherize(this.field.relationModelSingularName)}.dto.ts`;
        //     const relatedEntityPath = this.field.relationModelModuleName ? `src/${dasherize(this.field.relationModelModuleName)}/dtos/${relatedEntityFileName}` : `src/${dasherize(moduleName)}/dtos/${relatedEntityFileName}`;
        //     this.relationInverseSource = createSourceFile(tree, relatedEntityPath);
        //     this.relationInverseDecoratorManagers = this.getFieldDecoratorManagers(
        //         this.field,
        //         this.relationInverseSource,
        //         DecoratorType.Array,
        //         DecoratorType.ValidateNested,
        //         // DecoratorType.Transform,
        //       );
        //     this.relationInverseDecoratorManagers.push(
        //         new TransformDecoratorManager({ isTransform: true, type: this.transformType(this.modelName), source: this.relationInverseSource, field: field })
        //     );
        //     this.relationInverseDecoratorManagers.push(
        //         new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: this.relationInverseSource, field: field })
        //     );
        // }
    }

    isString(): boolean {
        return false;
    }
    isNumber(): boolean {
        return false;
    }
    isInt(): boolean {
        return false;
    }
    isDecimal(): boolean {
        return false;
    }
    isApplyRegex(): boolean {
        return false;
    }
    isApplyRequired(): boolean {
        return false;
    }
    isApplyMin(): boolean {
        return false;
    }
    isApplyMax(): boolean {
        return false;
    }
    isDate(): boolean {
        return false;
    }
    isTransform(): boolean {
        return true;
    }

    // This is the field type of the owner in the m2m relation
    fieldType(): FieldType {
        return this.manyToManyFieldType(this.field.relationModelSingularName)
    }

    // This field type is used in the case of one-to-many relation, when we generate the inverse field in the related entity
    // additionalFieldType(): FieldType {
    //     return this.manyToManyFieldType(this.modelName)
    // }

    private transformType(forModelName: string): string {
        return `Update${classify(forModelName)}Dto`;
    }

    private manyToManyFieldType(forModelName: string): FieldType {
        // const type = `number`
        const type = this.transformType(forModelName)
        const text = `${type}[]`
        return {
            text: text,
            node: (_field: any) =>
                ts.factory.createArrayTypeNode(ts.factory.createTypeReferenceNode(
                    ts.factory.createIdentifier(type),
                    undefined
                )),
        };
    }

    override addAdditionalField(): FieldChange[] {
        const fieldChanges: FieldChange[] = [];

        // Add the ids field to the main entity
        fieldChanges.push(this.addAdditionalIdsField());
        // Add the command field to the main entity
        fieldChanges.push(this.addAdditionalCommandField());

        // Add the inverse field to the related entity
        // if (this.field.relationCreateInverse) {
        //     fieldChanges.push(this.addAdditionalInverseField());
        //     fieldChanges.push(this.addAdditionalInverseIdsField());
        //     fieldChanges.push(this.addAdditionalInverseCommandsField());
        // }
        return fieldChanges;
    }
    
    // private addAdditionalInverseIdsField(): FieldChange {
    //     const fieldName = `${this.field.relationModelFieldName}Ids`;
    //     const fieldType = "number[]";
    //     const source= this.relationInverseSource
    //     const field = this.field
    //     const modelName = this.field.relationModelSingularName        
    //     const decoratorManagers = [
    //         new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
    //         new ArrayDecoratorManager({ isArray: true, source: source, field: field })
    //     ]

    //     return this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);
    // }

    // private addAdditionalInverseCommandsField(): FieldChange {
    //     const fieldName = `${this.field.relationModelFieldName}Command`;
    //     const fieldType = "string";
    //     const source= this.relationInverseSource
    //     const field = this.field
    //     const modelName = this.field.relationModelSingularName        
    //     const decoratorManagers = [
    //         new StringDecoratorManager({ isString: true, source: source, field: field }),
    //         new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
    //         // TODO pending @IsEnum(RelationFieldsCommand) 
    //     ]

    //     return this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);
    // }

    private addAdditionalIdsField() : FieldChange{
        const fieldName = `${this.field.name}Ids`;
        const fieldType = "number[]";
        const source= this.source
        const field = this.field
        const modelName = this.modelName        
        const decoratorManagers = [
            new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
            new ArrayDecoratorManager({ isArray: true, source: source, field: field })
        ]

        return this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);
    }

    private addAdditionalCommandField(): FieldChange {
        const fieldName = `${this.field.name}Command`;
        const fieldType = "string";
        const source= this.source
        const field = this.field
        const modelName = this.modelName        
        const decoratorManagers = [
            new StringDecoratorManager({ isString: true, source: source, field: field }),
            new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
            // TODO pending @IsEnum(RelationFieldsCommand) 
        ]

        return this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);

    }

    // private inverseFieldImport(modelName: string, currentModuleName: string, source: ts.SourceFile): Change {
    //     const inverseEntityImportName = `update-${dasherize(modelName)}.dto`;
    //     const modulePath = `src/${currentModuleName}`;
    //     const inverseEntityPath = `${modulePath}/dtos/${inverseEntityImportName}`;
    //     return safeInsertImport(source, `Update${classify(modelName)}Dto`, inverseEntityPath, currentModuleName);
    // }
    
    // private addAdditionalInverseField() : FieldChange {
    //     const fieldName = this.additionalFieldName();
    //     const fieldType = this.additionalFieldType().text;
    //     const source= this.relationInverseSource
    //     const field = this.field
    //     const modelName = this.field.relationModelSingularName        
    //     const decoratorManagers = this.relationInverseDecoratorManagers
    //     const fieldChange =  this.addFieldInternal(fieldName, fieldType, decoratorManagers, field, modelName, source);
    //     if (this.modelName !== this.field.relationModelSingularName) {
    //         const currentModelName = this.modelName;
    //         const currentModuleName = this.moduleName;
    //         fieldChange.changes.push(this.inverseFieldImport(currentModelName, currentModuleName, source));
    //     }
    //     return fieldChange;
    // }

    //TODO: Can be improved to avoid duplicate code
    override addOrUpdateAdditionalField(): FieldChange[] {
        const fieldChanges: FieldChange[] = [];

        // Add or update the ids field
        fieldChanges.push(this.updateAdditionalIdsField());
        // Add or update the command field
        fieldChanges.push(this.updateAdditionalCommandField());

        // if (this.field.relationCreateInverse) {
        //     fieldChanges.push(this.updateAdditionalInverseField());
        //     fieldChanges.push(this.updateAdditionalInverseIdsField());
        //     fieldChanges.push(this.updateAdditionalInverseCommandsField());
        // }
        return fieldChanges;
    }

    // updateAdditionalInverseField(): FieldChange {
    //    const inverseFieldName = this.field.relationModelFieldName;
    //    const inverseFieldType = this.manyToManyFieldType(this.modelName).node(this.field);
    //    const source= this.relationInverseSource
    //    const field = this.field
    //    const inverseDecoratorManagers = this.relationInverseDecoratorManagers
       
    //    const inverseField = this.getFieldIdentifierNode(
    //           inverseFieldName,
    //           source
    //      )?.parent as PropertyDeclaration; 
    //      if (inverseField == null) {
    //           return this.addAdditionalInverseField();
    //      }
    //      else {
    //             //Update the inverse field
    //             const fieldChange = this.updateFieldInternal(inverseFieldName, inverseFieldType, inverseDecoratorManagers, field, source)
    //             if (this.modelName !== this.field.relationModelSingularName) {
    //                 const currentModelName = this.modelName;
    //                 const currentModuleName = this.moduleName;
    //                 fieldChange.changes.push(this.inverseFieldImport(currentModelName, currentModuleName, source));
    //             }
    //             return fieldChange;
    //      }
    // }

    // updateAdditionalInverseIdsField(): FieldChange {
    //     const idsFieldName = `${this.field.relationModelFieldName}Ids`
    //     const idsFieldType = ts.factory.createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
    //     const source = this.relationInverseSource
    //     const field = this.field
    //     const decoratorManagers = [
    //         new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
    //         new ArrayDecoratorManager({ isArray: true, source: source, field: field })
    //     ]
 
    //     const idsField = this.getFieldIdentifierNode(
    //         idsFieldName,
    //         source
    //     )?.parent as PropertyDeclaration;
    //     if (idsField == null) {
    //         return this.addAdditionalInverseIdsField();
    //     }
    //     else {
    //         //Update the ids field
    //         return this.updateFieldInternal(idsFieldName, idsFieldType, decoratorManagers, field, source)
    //     }
    // }

    // updateAdditionalInverseCommandsField(): FieldChange {
    //     const commandFieldName = `${this.field.relationModelFieldName}Command`
    //     const commandFieldType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    //     const source = this.relationInverseSource
    //     const field = this.field
    //     const decoratorManagers = [
    //         new StringDecoratorManager({ isString: true, source: source, field: field }),
    //         new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
    //         // TODO pending @IsEnum(RelationFieldsCommand) 
    //     ]
 
    //     const commandField = this.getFieldIdentifierNode(
    //         commandFieldName,
    //         source
    //     )?.parent as PropertyDeclaration;
    //     if (commandField == null) {
    //         return this.addAdditionalInverseCommandsField();
    //     }
    //     else {
    //         //Update the command field
    //         return this.updateFieldInternal(commandFieldName, commandFieldType, decoratorManagers, field, source)
    //     }
    // }

    private updateAdditionalIdsField(): FieldChange {
        const idsFieldName = `${this.field.name}Ids`
        const source = this.source
        const field = this.field

        // Handle the main source additional fields
        // Add or update the ids field
        const idsField = this.getFieldIdentifierNode(
            idsFieldName,
            source
        )?.parent as PropertyDeclaration;
        if (idsField == null) {
            return this.addAdditionalIdsField();
        }
        else {
            //Update the ids field
            const fieldType = ts.factory.createArrayTypeNode(ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
            const decoratorManagers = [
                new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
                new ArrayDecoratorManager({ isArray: true, source: source, field: field })
            ];
            return this.updateFieldInternal(idsFieldName, fieldType, decoratorManagers, field, source);
        }

    }

    updateAdditionalCommandField(): FieldChange {
        const commandFieldName = `${this.field.name}Command`
        const source = this.source
        const field = this.field

        // Handle the main source additional fields
        // Add or update the command field
        const commandField = this.getFieldIdentifierNode(
            commandFieldName,
            source
        )?.parent as PropertyDeclaration;
        if (commandField == null) {
            return this.addAdditionalCommandField();
        }
        else {
            //Update the command field
            const fieldType = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
            const decoratorManagers = [
                new StringDecoratorManager({ isString: true, source: source, field: field }),
                new OptionalDecoratorManager({ isApplyOptional: true, optional: true, source: source, field: field }),
                // TODO pending @IsEnum(RelationFieldsCommand) 
            ];
            return this.updateFieldInternal(commandFieldName, fieldType, decoratorManagers, field, source);
        }
    }

    override removeAdditionalField(): FieldChange[] {
        const fieldChanges: FieldChange[] = [];

        // Add the ids field to the main entity
        fieldChanges.push(this.removeAdditionalIdsField());
        // Add the command field to the main entity
        fieldChanges.push(this.removeAdditionalCommandField());

        // Add the inverse field to the related entity
        // if (this.field.relationCreateInverse) {
        //     fieldChanges.push(this.removeAdditionalInverseField());
        //     fieldChanges.push(this.removeAdditionalInverseIdsField());
        //     fieldChanges.push(this.removeAdditionalInverseCommandsField());
        // }
        return fieldChanges;
    }

    removeAdditionalIdsField(): FieldChange {
        const fieldName = `${this.field.name}Ids`;
        const source = this.source;
        return this.removeFieldFor(fieldName, source);
    }
    removeAdditionalCommandField(): FieldChange {
        const fieldName = `${this.field.name}Command`;
        const source = this.source;
        return this.removeFieldFor(fieldName, source);
    }
    // removeAdditionalInverseField(): FieldChange {
    //     const fieldName = this.additionalFieldName();
    //     const source = this.relationInverseSource;
    //     return this.removeFieldFor(fieldName, source);
    // }
    // removeAdditionalInverseIdsField(): FieldChange {
    //     const fieldName = `${this.field.relationModelFieldName}Ids`;
    //     const source = this.relationInverseSource;
    //     return this.removeFieldFor(fieldName, source);
    // }
    // removeAdditionalInverseCommandsField(): FieldChange {
    //     const fieldName = `${this.field.relationModelFieldName}Command`;
    //     const source = this.relationInverseSource;
    //     return this.removeFieldFor(fieldName, source);
    // }

    //TODO: Need to revise the algorithm to generate multiple fields as part of single solid field type
    override fieldName(): string {
        return `${this.field.name}`;
    }

    // additionalFieldName(): string {
    //     return this.field.relationModelFieldName;
    // }

    protected isAdditionalFieldRequired(): boolean {
        return true
    }

    override addField(): FieldChange[] {
        const fieldChanges: FieldChange[] = super.addField();
        if (fieldChanges.length > 0 && this.modelName !== this.field.relationModelSingularName) {
            const mainField = fieldChanges[0];
            mainField.changes.push(this.relatedFieldImport());
        }
        return fieldChanges;
    }

    override updateField(): FieldChange[] {
        const fieldChanges: FieldChange[] = super.updateField();

        //FIXME This might not be required, since addField might never be called from within updateField
        // const containsAddFieldChanges = fieldChanges.filter((change) => !(change instanceof InsertChange));
        // if (containsAddFieldChanges) return fieldChanges;

        //This line is required to add import changes in the update context
        // if (fieldChanges.length > 0 && this.modelName !== this.field.relationModelSingularName) {
            const mainField = fieldChanges[0];
            mainField.changes.push(this.relatedFieldImport());
        // }
        return fieldChanges
    }

    relatedFieldImport(): Change {
        const relatedEntityImportName = `update-${dasherize(this.field.relationModelSingularName)}.dto`;
        const relatedEntityPath = this.field.relationModelModuleName ? `src/${this.field.relationModelModuleName}/dtos/${relatedEntityImportName}` : `./${relatedEntityImportName}`;
        return safeInsertImport(this.source, `Update${classify(this.field.relationModelSingularName)}Dto`, relatedEntityPath, this.moduleName);
        // return insertImport(this.source, this.source.fileName, `Update${classify(this.field.relationModelSingularName)}Dto`, relatedEntityPath);
    } //Uncomment this method while implementing many-to-many relation changes
}
