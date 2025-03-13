import { classify } from "@angular-devkit/core/src/utils/strings";
import ts, { ModifierLike, ObjectLiteralElementLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";
import { DecoratorManager, DeleteType, PartialAddFieldChange } from "../../FieldManager";
import _ from 'lodash';
interface ManyToOneDecoratorOptions {
    isManyToOne: boolean;
    relationCoModelSingularName: string;
    relationCascade: DeleteType;
    required: boolean;
    source: ts.SourceFile;
    field: any;
    fieldName: string;
    modelName: string;
}
export class ManyToOneDecoratorManager implements DecoratorManager {
    constructor(public options: ManyToOneDecoratorOptions, public fieldNode?: PropertyDeclaration,) { }
    isApplyDecorator(): boolean {
        return this.options.isManyToOne;
    }
    decoratorName(): string {
        return 'ManyToOne';
    }
    buildDecorator(): PartialAddFieldChange {
        const changes: Change[] = [];
        const fieldSourceLines: string[] = [];
        // Add the ManyToOne import
        // const relationImports = insertImport(
        //     this.options.source,
        //     this.options.source.fileName,
        //     this.decoratorName(),
        //     'typeorm',
        // );
        // if (relationImports) {
        //     changes.push(relationImports);
        // }
        // Add the relation decorator
        fieldSourceLines.push(
            `@${this.decoratorName()}(() => ${classify(this.options.relationCoModelSingularName)}, ${this.buildRelationOptionsCode()})`,
        );
        changes.push(...this.decoratorImports());
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
        if (!this.fieldNode) throw new Error('Field node is required for updating the index decorator');
        let newModifiers: ModifierLike[] = [];
        let existingModifiers = this.fieldNode.modifiers;
        // Check if field has an existing many-to-one relation decorator
        const existingDecorator = this.findDecorator(this.decoratorName(), existingModifiers);
        //Remove the many-to-one decorator if it exists
        //TODO probably this too can be done in a lesser intrusive way i.e update everything instead of removing and adding
        newModifiers = [...this.filterNonDecorators(existingModifiers), ...this.filterOtherDecorators(this.decoratorName(), existingModifiers)];
        //Add the many-to-one decorator if it is required  
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
        const options = this.buildRelationDecoratorOptions();
        const keys = Array.from(options.keys());
        const optionsString = keys
            .filter((key) => options.get(key) !== null)
            .map((key) => {
                if (typeof options.get(key) === 'string') {
                    return `${key}: "${options.get(key)}"`;
                } else {
                    return `${key}: ${options.get(key)}`;
                }
            })
            .join(', ');
        return `{ ${optionsString} }`;
    }
    private buildRelationDecoratorOptions(): Map<string, any> {
        const options: any = new Map<string, any>();
        //Set common options
        // onDelete option
        if (!_.isEmpty(this.options.relationCascade)) {
            const cascade = this.options.relationCascade.toUpperCase();
            const onDeleteType: DeleteType = cascade as DeleteType;
            options.set('onDelete', onDeleteType);
        }
        // nullable option
        if (!this.options.required) {
            options.set('nullable', true);
        }
        else {
            options.set('nullable', false);
        }
        return options;
    }
    
    private createRelationDecorator(existingRelationDecorator: ts.Decorator | undefined): ts.Decorator {
        // console.log('createRelationDecorator called with ....', existingRelationDecorator?.getText());
        // Capture the existing relation decorator options
        let existingRelationDecoratorPropertyAssignments: ts.ObjectLiteralElementLike[] = [];
        if (existingRelationDecorator !== undefined) {
            //Pre-set the relation options from the existing relation decorator
            const existingCallExpression = existingRelationDecorator.expression as ts.CallExpression;
            // Check if  call expression has at least 1 arguments
            if (existingCallExpression.arguments.length > 1) { //Because we are interested in the 2nd argument, we check for length > 1
                if (!ts.isObjectLiteralExpression(existingCallExpression.arguments[1])) { throw new Error('ManyToOne decorator 2nd arguments must be an object literal containing the relation options'); }
                const existingObjectLiteralExpression = existingCallExpression.arguments[1] as ts.ObjectLiteralExpression;
                existingRelationDecoratorPropertyAssignments.push(...existingObjectLiteralExpression.properties);
            }
        }
        // Create the new relation decorator options
        const decoratorOptions = this.createRelationDecoratorOptions();
        const newPropertyAssignments: ObjectLiteralElementLike[] = Array.from(decoratorOptions.values()).filter(p => p !== null) as ts.PropertyAssignment[];
        // console.log('newPropertyAssignments', newPropertyAssignments.map(p => JSON.stringify(p.name)).join(', '));
        // Add the other unhandled column decorator options
        const handledDecoratorOptions = Array.from(decoratorOptions.keys());
        //@ts-ignore
        const otherPropertyAssignments = existingRelationDecoratorPropertyAssignments.filter(ps => !handledDecoratorOptions.includes(ps.name?.escapedText as string));
        newPropertyAssignments.push(...otherPropertyAssignments);
        // Re-create the relation decorator with the merged relation decorator options
        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const typeFunctionOrTarget = ts.factory.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            ts.factory.createIdentifier(classify(this.options.relationCoModelSingularName))
        )
        const decoratorOptionsExpression = ts.factory.createObjectLiteralExpression(newPropertyAssignments);
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, [typeFunctionOrTarget, decoratorOptionsExpression]);
        return ts.factory.createDecorator(call)
    }
    private createRelationDecoratorOptions(): Map<string, ts.PropertyAssignment | null> {
        const options: any = new Map<string, ts.Expression>();
        const cascade = this.options.relationCascade.toUpperCase();
        const onDeleteType: DeleteType = cascade as DeleteType;
        options.set('onDelete', ts.factory.createStringLiteral(onDeleteType));
        if (!this.options.required) {
            options.set('nullable', ts.factory.createTrue());
        }
        else {
            options.set('nullable', ts.factory.createFalse());
        }
        
        return this.optionsToPropertyAssignmentsOrNull(options);
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