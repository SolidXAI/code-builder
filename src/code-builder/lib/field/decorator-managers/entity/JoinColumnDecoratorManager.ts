import ts, { ModifierLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";
import { DecoratorManager, PartialAddFieldChange } from "../../FieldManager";

interface JoinColumnDecoratorOptions {
    isManyToOneRelationOwner: boolean;
    source: ts.SourceFile;
    field: any;
    fieldName: string;
    relationCoModelColumnName?: string;
}

export class JoinColumnDecoratorManager implements DecoratorManager {
    constructor(
        public options: JoinColumnDecoratorOptions,
        public fieldNode?: PropertyDeclaration,
    ) { }

    isApplyDecorator(): boolean {
        return this.options.isManyToOneRelationOwner;
    }

    decoratorName(): string {
        return 'JoinColumn';
    }

    buildDecorator(): PartialAddFieldChange {
        const changes: Change[] = [];
        const fieldSourceLines: string[] = [];

        fieldSourceLines.push(`@${this.decoratorName()}(${this.buildRelationOptionsCode()})`);
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
            'typeorm'
        )];
    }

    setFieldNode(fieldNode: PropertyDeclaration): void {
        this.fieldNode = fieldNode;
    }

    updateDecorator(): [PropertyDeclaration, Change[]] {
        if (!this.fieldNode) throw new Error('Field node is required for updating the JoinColumn decorator');

        let newModifiers: ModifierLike[] = [];
        const existingModifiers = this.fieldNode.modifiers;

        const existingDecorator = this.findDecorator(this.decoratorName(), existingModifiers);

        newModifiers = [
            ...this.filterNonDecorators(existingModifiers),
            ...this.filterOtherDecorators(this.decoratorName(), existingModifiers),
        ];

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

    private buildRelationOptionsCode(): string {
        const options: Record<string, string> = {};

        if (this.options.relationCoModelColumnName) {
            options['name'] = `"${this.options.relationCoModelColumnName}"`;
            return `{ ${Object.entries(options)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')} }`;
        }
        return '';
    }

    private createDecorator(existingDecorator: ts.Decorator | undefined): ts.Decorator {
        const existingOptions: ts.ObjectLiteralElementLike[] = this.existingDecoratorOptions(existingDecorator);

        const newOptions: ts.ObjectLiteralElementLike[] = [];

        if (this.options.relationCoModelColumnName) {
            newOptions.push(
                ts.factory.createPropertyAssignment(
                    'name',
                    ts.factory.createStringLiteral(`${this.options.relationCoModelColumnName}`)
                )
            );
        }

        const mergedOptions = [
            ...existingOptions.filter(
                (option) => !(ts.isPropertyAssignment(option) && option.name.getText() === 'name')
            ),
            ...newOptions,
        ];

        const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
        const argumentsArray: ts.Expression[] = this.createDecoratorArguments(mergedOptions);
        const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, argumentsArray);
        return ts.factory.createDecorator(call);
    }

    private createDecoratorArguments(options: ts.ObjectLiteralElementLike[]) {
        const argumentsArray: ts.Expression[] = [];
        if (options.length > 0) {
            const optionsObjectLiteral = ts.factory.createObjectLiteralExpression(options);
            argumentsArray.push(optionsObjectLiteral);
        }
        return argumentsArray;
    }

    private existingDecoratorOptions(existingDecorator: ts.Decorator | undefined): ts.ObjectLiteralElementLike[] {
        const options: ts.ObjectLiteralElementLike[] = [];
        if (existingDecorator) {
            const existingCallExpression = existingDecorator.expression as ts.CallExpression;
            if (existingCallExpression.arguments.length > 0) {
                const firstArgument = existingCallExpression.arguments[0];
                if (!ts.isObjectLiteralExpression(firstArgument)) {
                    throw new Error('JoinColumn decorator 1st argument must be an object literal');
                }
                options.push(...firstArgument.properties);
            }
        }
        return options;
    }

    private findDecorator(name: string, existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Decorator | undefined {
        return existingModifiers
            ?.filter((m) => m.kind === ts.SyntaxKind.Decorator)
            .map((m) => m as ts.Decorator)
            .find((m) => this.containsIdentifierName(m, name));
    }

    private filterOtherDecorators(name: string, existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Decorator[] {
        return existingModifiers
            ?.filter((m) => m.kind === ts.SyntaxKind.Decorator)
            .map((m) => m as ts.Decorator)
            .filter((m) => !this.containsIdentifierName(m, name)) || [];
    }

    private filterNonDecorators(existingModifiers: ts.NodeArray<ts.ModifierLike> | undefined): ts.Modifier[] {
        return existingModifiers
            ?.filter((m) => m.kind !== ts.SyntaxKind.Decorator)
            .map((m) => m as ts.Modifier) || [];
    }

    private containsIdentifierName(decorator: ts.Decorator, name: string): boolean {
        const callExpression = decorator.expression as ts.CallExpression;
        const identifier = callExpression.expression as ts.Identifier;
        return identifier.text === name;
    }
}
