import ts, { ModifierLike, ObjectLiteralElementLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import _ from 'lodash';
import { DecoratorManager, PartialAddFieldChange } from "../../FieldManager";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";

//TODO : Need to support column default e.g if type is a date field, the ormType should be deduced automatically depending upon the db used
export interface ColumnDecoratorOptions {
    isColumn: boolean;
    columnName: string;
    type: string;
    required: boolean;
    otherOptions: Map<string, any>;
    otherOptionExpressions: Map<string, ts.Expression | null>;
    source: ts.SourceFile;
    field: any;
}

export class ColumnDecoratorManager implements DecoratorManager {

    constructor(public options: ColumnDecoratorOptions, public fieldNode?: PropertyDeclaration,) { }
    isApplyDecorator(): boolean {
        return this.options.isColumn;
    }
    decoratorName(): string {
        return 'Column';
    }
    setFieldNode(fieldNode: ts.PropertyDeclaration): void {
        this.fieldNode = fieldNode;
    }
    buildDecorator(): PartialAddFieldChange {
        const fieldSourceLines = [];
        const changes: Change[] = [];

        //Add the Column decorator to the field
        const columnDecoratorLine = `@${this.decoratorName()}(${this.buildColumnOptionsCode()})`;
        fieldSourceLines.push(columnDecoratorLine);
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

    updateDecorator(): [PropertyDeclaration, Change[]] {
        if (!this.fieldNode) throw new Error('Field node is required for updating the index decorator');

        let newModifiers: ModifierLike[] = [];
        let existingModifiers: ts.NodeArray<ModifierLike> | undefined = this.fieldNode.modifiers;

        // Check if the field has an Column decorator.
        const existingDecorator = this.findDecorator(this.decoratorName(), existingModifiers);

        //Remove the column decorator if the column decorator exists
        //TODO probably this too can be done in a lesser intrusive way i.e update everything instead of removing and adding
        newModifiers = [...this.filterNonDecorators(existingModifiers), ...this.filterOtherDecorators(this.decoratorName(), existingModifiers)];

        //Add the column decorator if column decorator is required  
        const changes: Change[] = [];  

        if (this.isApplyDecorator()) {
            newModifiers = [...newModifiers, this.createColumnDecorator(existingDecorator)];
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

    private createColumnDecorator(existingColumnDecorator: ts.Decorator | undefined): ts.Decorator {
        // Capture the existing column decorator options
        let existingColumnDecoratorPropertyAssignments: ts.ObjectLiteralElementLike[] = [];
        if (existingColumnDecorator !== undefined) {
            //Pre-set the column options from the existing column decorator
            const existingCallExpression = existingColumnDecorator.expression as ts.CallExpression;
            // Check if  call expression has at least 1 arguments
            if (existingCallExpression.arguments.length > 0) {
                if (!ts.isObjectLiteralExpression(existingCallExpression.arguments[0])) { throw new Error('Column decorator 1st arguments must be an object literal containing the column options'); }
                const existingObjectLiteralExpression = existingCallExpression.arguments[0] as ts.ObjectLiteralExpression;
                existingColumnDecoratorPropertyAssignments.push(...existingObjectLiteralExpression.properties);
            }
        }

        // Create the new column decorator options as property assignments, if the option is not null
        const columnDecoratorOptions = this.createColumnDecoratorOptions();
        const newPropertyAssignments: ObjectLiteralElementLike[] = Array.from(columnDecoratorOptions.values()).filter(p => p !== null) as ts.PropertyAssignment[];
        // console.log('newPropertyAssignments', newPropertyAssignments.map(p => JSON.stringify(p.name)).join(', '));

        // Add the other unhandled column decorator options
        const handledColumnDecoratorOptions = Array.from(columnDecoratorOptions.keys());
        //@ts-ignore
        const otherPropertyAssignments = existingColumnDecoratorPropertyAssignments.filter(ps => !handledColumnDecoratorOptions.includes(ps.name?.escapedText as string));
        newPropertyAssignments.push(...otherPropertyAssignments);

        // Re-create the column decorator with the merged column decorator options
        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const decoratorOptions = ts.factory.createObjectLiteralExpression(newPropertyAssignments);
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, [decoratorOptions]);
        return ts.factory.createDecorator(call)
    }

    private createColumnDecoratorOptions(): Map<string, ts.PropertyAssignment | null> { //This function is used while updating the field
        const options = new Map<string, ts.Expression | null>();

        //Set common options
        //TODO Proper types to be used e.g ColumnCommonOptions
        // if (this.field.defaultValue) {
        //   options.set('default',  this.field.defaultValue);
        // }
        (!_.isEmpty(this.options.columnName)) ? options.set('name', ts.factory.createStringLiteral(this.options.columnName)) : options.set('name', null);
        (this.options.type) ? options.set('type', ts.factory.createStringLiteral(this.options.type)) : options.set('type', null);
        if (!this.options.required) {
            options.set('nullable', ts.factory.createTrue());
        }

        //Set additional options
        this.options.otherOptionExpressions.forEach((value, key) => {
            options.set(key, value);
        });

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

    private buildColumnDecoratorOptions(): Map<string, any> { //This function is used while adding the field
        const options: any = new Map<string, any>();
        //Set common options
        //TODO Proper types to be used e.g ColumnCommonOptions
        // if (this.options.field.defaultValue) {
        //   options.set('default', this.options.field.defaultValue);
        // }
        if (!_.isEmpty(this.options.columnName)) {
            options.set('name', `${this.options.columnName}`);
        }

        if (!_.isEmpty(this.options.type)) {
            options.set('type', `${this.options.type}`);
        }
        if (!this.options.required) {
            options.set('nullable', true);
        }

        // Set some keys as null, to indicate they are handled i.e they will be removed & recreated, if required
        //Handled keys
        // options.set('length', null) //TODO Can be improved, since handled keys needs to be managed in this decorator. Ideally it should be managed in the corresponding field

        //Set additional options
        this.options.otherOptions.forEach((value, key) => {
            options.set(key, value);
        });
        return options;
    }

    private buildColumnOptionsCode(): string {
        const options = this.buildColumnDecoratorOptions();
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

}