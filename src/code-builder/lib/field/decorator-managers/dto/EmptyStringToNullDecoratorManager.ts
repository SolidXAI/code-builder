import ts, { ModifierLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";
import { DecoratorManager, PartialAddFieldChange } from "../../FieldManager";

export interface EmptyStringToNullDecoratorOptions {
    isApplyTransform: boolean;
    source: ts.SourceFile;
    field: any;
}

export class EmptyStringToNullDecoratorManager implements DecoratorManager {
    constructor(public options: EmptyStringToNullDecoratorOptions, public fieldNode?: any) { }

    isApplyDecorator(): boolean {
        return this.options.isApplyTransform;
    }

    buildDecorator(): PartialAddFieldChange {
        const fieldSourceLines = [];
        const changes: Change[] = [];
        fieldSourceLines.push(`@${this.decoratorName()}(emptyStringToNullTransformer)`);
        changes.push(...this.decoratorImports());

        return {
            filePath: this.options.source.fileName,
            field: this.options.field,
            changes,
            fieldSourceLines,
        };
    }

    setFieldNode(fieldNode: ts.PropertyDeclaration): void {
        this.fieldNode = fieldNode;
    }

    decoratorName(): string {
        return "Transform";
    }

    decoratorImports(): Change[] {
        return [
            insertImport(
                this.options.source,
                this.options.source.fileName,
                this.decoratorName(),
                "class-transformer"
            ),
            insertImport(
                this.options.source,
                this.options.source.fileName,
                "emptyStringToNullTransformer",
                "@solidxai/core"
            ),
        ];
    }

    updateDecorator(): [PropertyDeclaration, Change[]] {
        if (!this.fieldNode) throw new Error(`Field node is required for updating the ${this.decoratorName()} decorator`);

        let newModifiers: ModifierLike[] = [];
        const existingModifiers: ts.NodeArray<ModifierLike> | undefined = this.fieldNode.modifiers;
        const existingDecorator = this.findDecorator(this.decoratorName(), existingModifiers);

        newModifiers = [...this.filterNonDecorators(existingModifiers), ...this.filterOtherDecorators(this.decoratorName(), existingModifiers)];

        const changes: Change[] = [];

        if (this.isApplyDecorator()) {
            newModifiers = [...newModifiers, this.createDecorator(existingDecorator)];
            changes.push(...this.decoratorImports());
        }

        const updatedProperty = ts.factory.updatePropertyDeclaration(
            this.fieldNode,
            newModifiers,
            this.fieldNode.name,
            this.fieldNode.questionToken,
            this.fieldNode.type,
            this.fieldNode.initializer,
        );
        return [updatedProperty, changes];
    }

    createDecorator(_existingDecorator: ts.Decorator | undefined): ts.Decorator {
        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, [
            ts.factory.createIdentifier("emptyStringToNullTransformer"),
        ]);

        return ts.factory.createDecorator(call);
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
