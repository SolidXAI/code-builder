import ts, { ModifierLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { DecoratorManager, PartialAddFieldChange, RelationType } from "../../FieldManager";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";

interface IndexDecoratorOptions {
    index: boolean;
    source: ts.SourceFile;
    field: any;
}

export class IndexDecoratorManager implements DecoratorManager {

    constructor(public options: IndexDecoratorOptions, public fieldNode?: PropertyDeclaration) { }
    isApplyDecorator(): boolean {
        return this.options.index && this.options.field.relationType !== RelationType.ManyToMany;
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
        // if (this.field.index) {
        const indexDecoratorLine = `@Index()`;
        fieldSourceLines.push(indexDecoratorLine);
        changes.push(...this.decoratorImports());
        // }
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
    updateDecorator(): [PropertyDeclaration, Change[]] {
        if (!this.fieldNode) throw new Error('Field node is required for updating the index decorator');

        let newModifiers: ModifierLike[] | undefined = [];
        let existingModifiers = this.fieldNode.modifiers;

        //Remove the Index decorator if the Index decorator exists
        //TODO probably this too can be done in a lesser intrusive way i.e update everything instead of removing and adding
        newModifiers = [...this.filterNonDecorators(existingModifiers), ...this.filterOtherDecorators(this.decoratorName(), existingModifiers)];

        //Add the column decorator if column decorator is required  
        const changes: Change[] = [];  

        if (this.isApplyDecorator()) {
            newModifiers = [...newModifiers, this.createIndexDecorator()];
            changes.push(...this.decoratorImports());
        }

        //If index decorator is present & index is required, no need to update the index decorator
        const updatedProperty = ts.factory.updatePropertyDeclaration(
            this.fieldNode,
            newModifiers, //newModifiers contains the updated index decorator
            this.fieldNode.name,
            this.fieldNode.questionToken,
            this.fieldNode.type,
            this.fieldNode.initializer,
        );
        return [updatedProperty, changes];
    }

    private createIndexDecorator(): ts.ModifierLike {
        return ts.factory.createDecorator(
            ts.factory.createCallExpression(
                ts.factory.createIdentifier('Index'),
                undefined,
                [],
            ),
        );
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