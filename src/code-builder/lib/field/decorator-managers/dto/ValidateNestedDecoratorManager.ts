import ts, { ModifierLike, ObjectLiteralElementLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { DecoratorManager, PartialAddFieldChange } from "../../FieldManager";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";

export interface ValidateNestedDecoratorOptions {
    isValidateNested: boolean;
    source: ts.SourceFile;
    field: any;
}
export class ValidateNestedDecoratorManager implements DecoratorManager {
    constructor(public options: ValidateNestedDecoratorOptions, public fieldNode?: ts.PropertyDeclaration) { }
    isApplyDecorator(): boolean {
        return this.options.isValidateNested;
    }
    buildDecorator(): PartialAddFieldChange {
        const fieldSourceLines = [];
        const changes: Change[] = [];
        fieldSourceLines.push(`@${this.decoratorName()}(${this.buildValidationOptionsCode()})`);
        changes.push(...this.decoratorImports());

        return {
            filePath: this.options.source.fileName,
            field: this.options.field,
            changes: changes,
            fieldSourceLines: fieldSourceLines,
        };
    }

    setFieldNode(fieldNode: ts.PropertyDeclaration): void {
        this.fieldNode = fieldNode;
    }

    decoratorName(): string {
        return 'ValidateNested';
    }

    decoratorImports(): Change[] {
        return [insertImport(
            this.options.source,
            this.options.source.fileName,
            this.decoratorName(),
            'class-validator')]
    }

    private buildValidationOptionsCode(): string {
        return `{ each : true }`;
    }

    updateDecorator(): [PropertyDeclaration, Change[]] {
        if (!this.fieldNode) throw new Error(`Field node is required for updating the ${this.decoratorName()} decorator`);

        let newModifiers: ModifierLike[] = [];
        let existingModifiers: ts.NodeArray<ModifierLike> | undefined = this.fieldNode.modifiers;

        // Check if the field has an IsArray decorator.
        const existingDecorator = this.findDecorator(this.decoratorName(), existingModifiers);

        //Remove the  decorator if the  decorator exists
        //TODO probably this too can be done in a lesser intrusive way i.e update everything instead of removing and adding
        newModifiers = [...this.filterNonDecorators(existingModifiers), ...this.filterOtherDecorators(this.decoratorName(), existingModifiers)];

        //Add the  decorator, if it is required  
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

    createDecorator(existingDecorator: ts.Decorator | undefined): ts.Decorator {
        // Capture the existing isArray decorator options
        const validationOptions: ts.ObjectLiteralElementLike[] = this.existingValidationOptions(existingDecorator);

        //Merge the options with the existing options
        const mergedValidationOptions: ObjectLiteralElementLike[] = this.mergeExistingAndNewValidationOptions(validationOptions);

        // Re-create the isArray decorator with the existing isArray decorator options
        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const argumentsArray: ts.Expression[] = this.createDecoratorArguments(mergedValidationOptions);
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, argumentsArray);
        return ts.factory.createDecorator(call)
    }

    private mergeExistingAndNewValidationOptions(validationOptions: ts.ObjectLiteralElementLike[]) {
        const decoratorOptions = this.createValidationDecoratorOptions();
        const mergedValidationOptions: ObjectLiteralElementLike[] = Array.from(decoratorOptions.values()).filter(p => p !== null) as ts.PropertyAssignment[];
        // console.log('mergedValidationOptions', mergedValidationOptions.map(p => JSON.stringify(p.name)).join(', '));
        // Add the other unhandled column decorator options
        const handledDecoratorOptions = Array.from(decoratorOptions.keys());
        //@ts-ignore
        const otherPropertyAssignments = validationOptions.filter(ps => !handledDecoratorOptions.includes(ps.name?.escapedText as string));
        mergedValidationOptions.push(...otherPropertyAssignments);
        return mergedValidationOptions;
    }

    private createValidationDecoratorOptions(): Map<string, ts.PropertyAssignment | null> {
        const options: any = new Map<string, ts.Expression>();
        options.set('each', ts.factory.createTrue());
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

    private createDecoratorArguments(validationOptions: ts.ObjectLiteralElementLike[]) {
        const argumentsArray: ts.Expression[] = [];
        if (validationOptions.length > 0) {
            const validationOptionsObjectLiteral = ts.factory.createObjectLiteralExpression(validationOptions);
            argumentsArray.push(validationOptionsObjectLiteral);
        }
        return argumentsArray;
    }

    private existingValidationOptions(existingDecorator: ts.Decorator | undefined) {
        const validationOptions: ts.ObjectLiteralElementLike[] = [];

        if (existingDecorator !== undefined) {
            //Pre-set the isArray options from the existing IsArray decorator
            const existingCallExpression = existingDecorator.expression as ts.CallExpression;
            // Check if  call expression has at least 1 argument
            if (existingCallExpression.arguments.length > 0) {
                if (!ts.isObjectLiteralExpression(existingCallExpression.arguments[0])) { throw new Error('ValidateNested decorator 1st argument must be an object literal containing the validation options'); }
                const existingObjectLiteralExpression = existingCallExpression.arguments[0] as ts.ObjectLiteralExpression;
                validationOptions.push(...existingObjectLiteralExpression.properties);
            }
        }
        return validationOptions;
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