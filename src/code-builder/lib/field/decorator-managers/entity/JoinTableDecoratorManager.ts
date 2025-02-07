import ts, { ModifierLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";
import { DecoratorManager, PartialAddFieldChange } from "../../FieldManager";

interface JoinTableDecoratorOptions {
    isManyToManyRelationOwner: boolean;
    source: ts.SourceFile;
    field: any;
    fieldName: string;
    modelName: string;
    relationJoinTableName: string;
    relationTableModelName: string;
    relationTableModelNameInverse: string;
}

export class JoinTableDecoratorManager implements DecoratorManager {
    constructor(public options: JoinTableDecoratorOptions, public fieldNode?: PropertyDeclaration,) { }
    isApplyDecorator(): boolean {
        return this.options.isManyToManyRelationOwner;
    }
    decoratorName(): string {
        return 'JoinTable';
    }

    buildDecorator(): PartialAddFieldChange {
        const changes: Change[] = [];
        const fieldSourceLines: string[] = [];

        // Add the many-to-many import
        // const decoratorImport = insertImport(
        //     this.options.source,
        //     this.options.source.fileName,
        //     this.decoratorName(),
        //     'typeorm',
        // );
        // if (decoratorImport) {
        //     changes.push(decoratorImport);
        // }
        fieldSourceLines.push(
            `@${this.decoratorName()}(${this.buildRelationOptionsCode()})`,
        );
        changes.push(...this.decoratorImports());

        return {
            filePath: this.options.source.fileName,
            field: this.options.field,
            changes: changes,
            fieldSourceLines: fieldSourceLines,
        };
    }

    decoratorImports(): Change[] {
        return [insertImport(
            this.options.source,
            this.options.source.fileName,
            this.decoratorName(),
            'typeorm')]
    }

    setFieldNode(fieldNode: PropertyDeclaration): void {
        this.fieldNode = fieldNode;
    }

    updateDecorator(): [PropertyDeclaration, Change[]] {
        // Check if the field property declaration exists, if not throw an error
        if (!this.fieldNode) throw new Error('Field node is required for updating the one to many decorator');

        let newModifiers: ModifierLike[] = [];
        let existingModifiers = this.fieldNode.modifiers;

        // Check if field has an existing one-to-many relation decorator
        const existingDecorator = this.findDecorator(this.decoratorName(), existingModifiers);

        //Remove the many-to-one decorator if it exists
        //TODO probably this too can be done in a lesser intrusive way i.e update everything instead of removing and adding
        newModifiers = [...this.filterNonDecorators(existingModifiers), ...this.filterOtherDecorators(this.decoratorName(), existingModifiers)];

        //Add the one-to-many decorator if it is required  
        const changes: Change[] = [];  

        if (this.isApplyDecorator()) {
            newModifiers = [...newModifiers, this.createDecorator(existingDecorator)];
            changes.push(...this.decoratorImports());
        }

        const updatedProperty = ts.factory.updatePropertyDeclaration(
            this.fieldNode,
            newModifiers, //Replace with new modifiers
            this.fieldNode.name,
            this.fieldNode.questionToken,
            this.fieldNode.type,
            this.fieldNode.initializer,
        );
        return [updatedProperty, changes];
    }

    private buildRelationOptionsCode(): string {
        const options: Record<string, string | Record<string, string>> = {};
    
        if (this.options.relationJoinTableName) {
            options['name'] = this.options.relationJoinTableName
                ? `"${this.options.relationJoinTableName}"`
                : `"${this.options.fieldName}"`;
        }
    
        if (this.options.relationTableModelName) {
            options['joinColumn'] = {
                name: `"${this.options.relationTableModelName ? `${this.options.relationTableModelName}_id` : `${this.options.fieldName}_id`}"`,
            };
        }
    
        if (this.options.relationTableModelNameInverse) {
            options['inverseJoinColumn'] = {
                name: `"${this.options.relationTableModelNameInverse ? `${this.options.relationTableModelNameInverse}_id` : `${this.options.fieldName}_id`}"`,
            };
        }
    
        return `{ ${Object.entries(options)
            .map(([key, value]) => {
                if (typeof value === 'string') {
                    return `${key}: ${value}`;
                }
                const nestedOptions = Object.entries(value)
                    .map(([nestedKey, nestedValue]) => `${nestedKey}: ${nestedValue}`)
                    .join(', ');
                return `${key}: { ${nestedOptions} }`;
            })
            .join(', ')} }`;
    }

    private createDecorator(existingDecorator: ts.Decorator | undefined): ts.Decorator {
        let existingRelationOptions: ts.ObjectLiteralElementLike[] = this.existingDecoratorOptions(existingDecorator);

        const newRelationOptions: ts.ObjectLiteralElementLike[] = [];
        if (this.options.relationJoinTableName) {
            newRelationOptions.push(
                ts.factory.createPropertyAssignment(
                    'name',
                    ts.factory.createStringLiteral(this.options.relationJoinTableName)
                )
            );
        }
    
        if (this.options.relationTableModelName) {
            newRelationOptions.push(
                ts.factory.createPropertyAssignment(
                    'joinColumn',
                    ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment(
                            'name',
                            ts.factory.createStringLiteral(`${this.options.relationTableModelName}_id`)
                        ),
                    ])
                )
            );
        }
    
        if (this.options.relationTableModelNameInverse) {
            newRelationOptions.push(
                ts.factory.createPropertyAssignment(
                    'inverseJoinColumn',
                    ts.factory.createObjectLiteralExpression([
                        ts.factory.createPropertyAssignment(
                            'name',
                            ts.factory.createStringLiteral(`${this.options.relationTableModelNameInverse}_id`)
                        ),
                    ])
                )
            );
        }
    
        // Merge existing and new options, avoiding duplicates
        const mergedRelationOptions = [
            ...existingRelationOptions.filter(
                (option) => !(ts.isPropertyAssignment(option) && option.name.getText() === 'name')
            ),
            ...newRelationOptions,
        ];

        // Re-create the decorator with the merged decorator options
        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const argumentsArray: ts.Expression[] = this.createDecoratorArguments(mergedRelationOptions);
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, argumentsArray);
        return ts.factory.createDecorator(call)
    }

    private createDecoratorArguments(joinTableOptions: ts.ObjectLiteralElementLike[]) {
        const argumentsArray: ts.Expression[] = [];
        if (joinTableOptions.length > 0) {
            const validationOptionsObjectLiteral = ts.factory.createObjectLiteralExpression(joinTableOptions);
            argumentsArray.push(validationOptionsObjectLiteral);
        }
        return argumentsArray;
    }

    private existingDecoratorOptions(existingDecorator: ts.Decorator | undefined): ts.ObjectLiteralElementLike[] {
        let existingDecoratorPropertyAssignments: ts.ObjectLiteralElementLike[] = [];
        if (existingDecorator !== undefined) {
            //Pre-set the relation options from the existing relation decorator
            const existingCallExpression = existingDecorator.expression as ts.CallExpression;
            // Check if  call expression has at least 1 arguments
            if (existingCallExpression.arguments.length > 0) { //Because we are interested in the 1st argument, we check for length > 0
                if (!ts.isObjectLiteralExpression(existingCallExpression.arguments[0])) { throw new Error('JoinTable decorator 1st argument must be an object literal containing the joinTable options'); }
                const existingObjectLiteralExpression = existingCallExpression.arguments[0] as ts.ObjectLiteralExpression;
                existingDecoratorPropertyAssignments.push(...existingObjectLiteralExpression.properties);
            }
        }
        return existingDecoratorPropertyAssignments;
    }

    private findDecorator(name: string, existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Decorator | undefined {
        return existingModifiers ? existingModifiers.filter((m) => (m.kind === ts.SyntaxKind.Decorator)).map(m => m as ts.Decorator).filter(m => this.containsIdentifierName(m, name)).pop() : undefined;
    }

    private filterOtherDecorators(name: string, existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Decorator[] {
        return existingModifiers ? existingModifiers.filter((m) => (m.kind === ts.SyntaxKind.Decorator)).map(m => m as ts.Decorator).filter(m => !this.containsIdentifierName(m, name)) : [];
    }

    private filterNonDecorators(existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Modifier[] {
        return existingModifiers ? existingModifiers.filter((m) => (m.kind !== ts.SyntaxKind.Decorator)).map(m => m as ts.Modifier) : [];
    }

    private containsIdentifierName(m: ts.Decorator, identifierName: string): boolean {
        const callExpression = m.expression as ts.CallExpression;
        const identifier = callExpression.expression as ts.Identifier;
        return identifier.text === identifierName;
    }

}