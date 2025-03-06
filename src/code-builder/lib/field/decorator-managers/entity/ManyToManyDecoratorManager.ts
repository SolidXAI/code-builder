import { camelize, classify } from "@angular-devkit/core/src/utils/strings";
import ts, { ModifierLike, ObjectLiteralElementLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";
import { DecoratorManager, DeleteType, PartialAddFieldChange } from "../../FieldManager";

interface ManyToManyDecoratorOptions {
    isManyToMany: boolean;
    relationModelName: string;
    relationInverseFieldName: string;
    owner: boolean;
    source: ts.SourceFile;
    field: any;
    fieldName: string;
    modelName: string;
}

export class ManyToManyDecoratorManager implements DecoratorManager {
    constructor(public options: ManyToManyDecoratorOptions, public fieldNode?: PropertyDeclaration,) { }
    isApplyDecorator(): boolean {
        return this.options.isManyToMany;
    }
    decoratorName(): string {
        return 'ManyToMany';
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
        changes.push(...this.decoratorImports());

        // if (decoratorImport) {
        //     changes.push(decoratorImport);
        // }

        const fieldSourceLineComponents: string[] = [];
        fieldSourceLineComponents.push(`() => ${classify(this.options.relationModelName)}`);
        this.options.relationInverseFieldName ? fieldSourceLineComponents.push(`${camelize(this.options.relationModelName)} => ${camelize(this.options.relationModelName)}.${this.options.relationInverseFieldName}`) : "no-ops";
        fieldSourceLineComponents.push(`${this.buildRelationOptionsCode()}`);
        fieldSourceLines.push(`@${this.decoratorName()}(${fieldSourceLineComponents.join(', ')})`);

        return {
            filePath: this.options.source.fileName,
            field: this.options.field,
            changes: changes,
            fieldSourceLines: fieldSourceLines,
        };
    }

    setFieldNode(fieldNode: PropertyDeclaration): void {
        this.fieldNode = fieldNode;
    }

    decoratorImports(): Change[] {
        return [insertImport(
            this.options.source,
            this.options.source.fileName,
            this.decoratorName(),
            'typeorm')]
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
            newModifiers = [...newModifiers, this.createRelationDecorator(existingDecorator)];
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
        const relationOptions = new Map<string, any>();
        // this.options.owner ? relationOptions.set('cascade', true): "no-ops";
        this.options.owner ? relationOptions.set('cascade', true) :  relationOptions.set('cascade', ['insert','update']);
        const decoratorArgs = Array.from(relationOptions)
        .map(([key, value]) => {
         if (Array.isArray(value)) {
            return `${key}: [${value.map(v => `'${v}'`).join(', ')}]`
         }  
         return `${key}: ${value}`   
        })
        .join(', ');
        // Convert the map to a string
        return `{ ${decoratorArgs} }`;
    }

    private createRelationDecorator(existingRelationDecorator: ts.Decorator | undefined): ts.Decorator {
        let existingRelationOptions: ts.ObjectLiteralElementLike[] = this.existingDecoratorOptions(existingRelationDecorator);

        const mergedRelationOptions: ObjectLiteralElementLike[] = this.mergeNewAndExistingDecoratorOptions(existingRelationOptions);

        // Re-create the decorator with the merged decorator options
        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const argumentsArray: ts.Expression[] = this.createDecoratorArguments(mergedRelationOptions);
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, argumentsArray);
        return ts.factory.createDecorator(call)
    }

    private mergeNewAndExistingDecoratorOptions(existingRelationOptions: ts.ObjectLiteralElementLike[]) {
        const decoratorOptions = this.createRelationDecoratorOptions();
        const newPropertyAssignments: ObjectLiteralElementLike[] = Array.from(decoratorOptions.values()).filter(p => p !== null) as ts.PropertyAssignment[];

        // console.log('newPropertyAssignments', newPropertyAssignments.map(p => JSON.stringify(p.name)).join(', '));
        // Add the other unhandled column decorator options
        const handledDecoratorOptions = Array.from(decoratorOptions.keys());
        //@ts-ignore
        const otherPropertyAssignments = existingRelationOptions.filter(ps => !handledDecoratorOptions.includes(ps.name?.escapedText as string));
        newPropertyAssignments.push(...otherPropertyAssignments);
        return newPropertyAssignments;
    }

    private createDecoratorArguments(newPropertyAssignments: ts.ObjectLiteralElementLike[]) {
        const argumentsArray: ts.Expression[] = [];
        // 1st Argument: Target
        const typeFunctionOrTarget = ts.factory.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createIdentifier(classify(this.options.relationModelName))
        );
        argumentsArray.push(typeFunctionOrTarget);

        if (this.options.relationInverseFieldName) {
            // 2nd Argument: Inverse side
            const inverseSide = ts.factory.createArrowFunction(
                undefined,
                undefined,
                [ts.factory.createParameterDeclaration(
                    undefined,
                    undefined,
                    ts.factory.createIdentifier(camelize(this.options.relationModelName)),
                    undefined,
                    undefined,
                    undefined
                )],
                undefined,
                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier(camelize(this.options.relationModelName)),
                    ts.factory.createIdentifier(this.options.relationInverseFieldName)
                )
            );
            argumentsArray.push(inverseSide);
        }

        // 3rd Argument: Options. This argument is optional
        if (newPropertyAssignments.length > 0) {
            const decoratorOptions = ts.factory.createObjectLiteralExpression(newPropertyAssignments);
            argumentsArray.push(decoratorOptions);
        }
        return argumentsArray;
    }

    private existingDecoratorOptions(existingRelationDecorator: ts.Decorator | undefined): ts.ObjectLiteralElementLike[] {
        let existingRelationDecoratorPropertyAssignments: ts.ObjectLiteralElementLike[] = [];
        if (existingRelationDecorator !== undefined) {
            //Pre-set the relation options from the existing relation decorator
            const existingCallExpression = existingRelationDecorator.expression as ts.CallExpression;
            // Check if  call expression has at least 1 arguments
            if (existingCallExpression.arguments.length > 2) { //Because we are interested in the 2nd argument, we check for length > 1
                if (!ts.isObjectLiteralExpression(existingCallExpression.arguments[2])) { throw new Error('Many-to-Many decorator 3rd argument must be an object literal containing the relation options'); }
                const existingObjectLiteralExpression = existingCallExpression.arguments[2] as ts.ObjectLiteralExpression;
                existingRelationDecoratorPropertyAssignments.push(...existingObjectLiteralExpression.properties);
            }
        }
        return existingRelationDecoratorPropertyAssignments;
    }

    private createRelationDecoratorOptions(): Map<string, ts.PropertyAssignment | null> {
        const relationOptions: any = new Map<string, ts.Expression>();
        this.options.owner ? relationOptions.set('cascade', ts.factory.createTrue()): "no-ops";
        return this.optionsToPropertyAssignmentsOrNull(relationOptions);
    }

    private optionsToPropertyAssignmentsOrNull(options: Map<string, ts.Expression | null>): Map<string, ts.PropertyAssignment | null> {
        const decoratorOptions = new Map<string, ts.PropertyAssignment | null>();
        options.forEach((value, key) => {
            if (value !== null) {
                decoratorOptions.set(key, ts.factory.createPropertyAssignment(ts.factory.createIdentifier(key), value));
            }
            else {
                decoratorOptions.set(key, null);
            }
        });
        return decoratorOptions;
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