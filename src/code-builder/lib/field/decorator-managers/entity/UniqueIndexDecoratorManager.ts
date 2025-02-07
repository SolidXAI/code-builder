import ts, { ClassDeclaration, ModifierLike, ObjectLiteralElementLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";
import { PartialAddFieldChange } from "../../FieldManager";

interface UniqueIndexDecoratorOptions {
    unique: boolean;
    fieldName: string;
    source: ts.SourceFile;
    field: any;
}

export class UniqueIndexDecoratorManager {
    constructor(public options: UniqueIndexDecoratorOptions, public classNode: ClassDeclaration, public fieldNode?: PropertyDeclaration) { }
    isApplyDecorator(): boolean {
        return this.options.unique;
    }
    decoratorName(): string {
        return 'Index';
    }
    setFieldNode(fieldNode: ts.PropertyDeclaration): void {
        this.fieldNode = fieldNode;
    }
    buildDecorator(): PartialAddFieldChange {
        const fieldSourceLines = [];
        const changes: Change[] = [];
        const indexDecoratorLine = `@Index(["${this.options.fieldName}", "deletedTracker"], { unique: true })`;
        fieldSourceLines.push(indexDecoratorLine);
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

    //Updates the index decorator for the fieldNode based on the options provided
    // @returns the updated property declaration
    updateDecorator(): [ClassDeclaration, Change[]] {
        if (!this.classNode) throw new Error('Class node is required for updating the unique index decorator');

        let newModifiers: ModifierLike[] | undefined = [];
        let existingModifiers: ts.NodeArray<ModifierLike> | undefined = this.classNode.modifiers;

        // Get the existing unique index decorator if it exists
        const existingUniqueIndexDecorator = this.findUniqueIndexDecorator(existingModifiers);

        //Remove the Index decorator if the Index decorator exists
        newModifiers = [...this.filterNonDecorators(existingModifiers),...this.filterOtherDecorators(this.decoratorName(), existingModifiers), ...this.filterOtherIndexDecorators(this.decoratorName(), this.options, existingModifiers)];

        //Add the column decorator if column decorator is required  
        const changes: Change[] = [];

        if (this.isApplyDecorator()) {
            newModifiers = [...newModifiers, this.createUniqueIndexDecorator(existingUniqueIndexDecorator)];
            changes.push(...this.decoratorImports());
        }

        // If field node is provided, replace the class members with the updated field node
        const newMembers = this.classNode.members.filter((member) => {
            // Check if the member is a PropertyDeclaration
            if (ts.isPropertyDeclaration(member)) {
                // Compare the name of the property with the field name
                const memberName = member.name.getText();
                return memberName !== this.options.fieldName; // Exclude members with the matching field name
            }
            return true; // Keep non-PropertyDeclaration members
        });
        if (this.fieldNode) {
            newMembers.push(this.fieldNode);
        }

        // Update the class node with the new modifiers
        const updatedClass = ts.factory.updateClassDeclaration(
            this.classNode,
            newModifiers,
            this.classNode.name,
            this.classNode.typeParameters,
            this.classNode.heritageClauses,
            newMembers,
        );
        return [updatedClass, changes];
    }

    private findUniqueIndexDecorator(existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Decorator | undefined {
        return existingModifiers ? existingModifiers
            .filter((m) => (m.kind === ts.SyntaxKind.Decorator))
            .map(m => m as ts.Decorator)
            .filter(m => this.containsIdentifierName(m, this.decoratorName()))
            .filter(m => this.containsIndexForField(m, this.options.fieldName))
            .pop()
            : undefined;
    }

    private createUniqueIndexDecorator(existingDecorator: ts.Decorator | undefined): ts.Decorator {
        // Capture the existing column decorator options
        let existingUniqueIndexDecoratorPropertyAssignments: ts.ObjectLiteralElementLike[] = [];
        if (existingDecorator !== undefined) {
            //Pre-set the column options from the existing column decorator
            const existingCallExpression = existingDecorator.expression as ts.CallExpression;
            // Check if  call expression has at least 2 arguments
            if (existingCallExpression.arguments.length > 1) {
                if (!ts.isObjectLiteralExpression(existingCallExpression.arguments[1])) { throw new Error('Column decorator 1st arguments must be an object literal containing the column options'); }
                const existingObjectLiteralExpression = existingCallExpression.arguments[1] as ts.ObjectLiteralExpression;
                existingUniqueIndexDecoratorPropertyAssignments.push(...existingObjectLiteralExpression.properties);
            }
        }

        // Create the new unique index decorator options as property assignments, 
        const uniqueIndexDecoratorOptions = this.createUniqueIndexDecoratorOptions();
        const newPropertyAssignments: ObjectLiteralElementLike[] = Array.from(uniqueIndexDecoratorOptions.values()).filter(p => p !== null) as ts.PropertyAssignment[];

        // Add the other unhandled column decorator options
        const handledColumnDecoratorOptions = Array.from(uniqueIndexDecoratorOptions.keys());
        //@ts-ignore
        const otherPropertyAssignments = existingUniqueIndexDecoratorPropertyAssignments.filter(ps => !handledColumnDecoratorOptions.includes(ps.name?.escapedText as string));
        newPropertyAssignments.push(...otherPropertyAssignments);

        // Re-create the column decorator with the merged column decorator options
        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const fieldsArray = ts.factory.createArrayLiteralExpression(
            [
                ts.factory.createStringLiteral(this.options.fieldName),
                ts.factory.createStringLiteral("deletedTracker")
            ],
            false
        )
        const decoratorOptions = ts.factory.createObjectLiteralExpression(newPropertyAssignments);
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, [fieldsArray, decoratorOptions]);
        return ts.factory.createDecorator(call)
    }

    private createUniqueIndexDecoratorOptions(): Map<string, ts.PropertyAssignment | null> { //This function is used while updating the field
        const options = new Map<string, ts.Expression | null>();
        options.set('unique', ts.factory.createTrue());
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

    private filterOtherDecorators(name: string, existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Decorator[] {
        return existingModifiers ? existingModifiers.filter((m) => (m.kind === ts.SyntaxKind.Decorator)).map(m => m as ts.Decorator).filter(m => !this.containsIdentifierName(m, name)) : [];
    }

    private filterOtherIndexDecorators(name: string, decoratorOptions: UniqueIndexDecoratorOptions, existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Decorator[] {
        return existingModifiers
            ? existingModifiers
                .filter((m) => (m.kind === ts.SyntaxKind.Decorator))
                .map(m => m as ts.Decorator)
                .filter(m => this.containsIdentifierName(m, name))
                .filter(m => !this.containsIndexForField(m, decoratorOptions.fieldName))
            : [];
    }

    private filterNonDecorators(existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Modifier[] {
        return existingModifiers ? existingModifiers.filter((m) => (m.kind !== ts.SyntaxKind.Decorator)).map(m => m as ts.Modifier) : [];
    }

    private containsIdentifierName(m: ts.Decorator, identifierName: string): boolean {
        const callExpression = m.expression as ts.CallExpression;
        const identifier = callExpression.expression as ts.Identifier;
        return identifier.text === identifierName;
    }

    private containsIndexForField(m: ts.Decorator, fieldName: string): boolean {
        // Check if the Index decorator contains the field name
        const callExpression = m.expression as ts.CallExpression;
        const args = callExpression.arguments;
        if (args.length === 0) return false;
        let indexAlreadyPresent = false;
        const fields = args[0];
        if (ts.isArrayLiteralExpression(fields)) {
            const fieldNames = fields.elements.map(e => e.getText().replace(/^["']|["']$/g, ""));
            // Check if fieldNames only contains the field name and deletedTracker
            indexAlreadyPresent = fieldNames.includes(fieldName) && fieldNames.includes('deletedTracker') && fieldNames.length === 2;
            console.log('fieldNames', fieldNames);
            console
        }
        if (!indexAlreadyPresent) return false;

        return true;
    }

}