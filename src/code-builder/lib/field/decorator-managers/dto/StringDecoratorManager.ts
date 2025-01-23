import ts, { ModifierLike, PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { DecoratorManager, PartialAddFieldChange } from "../../FieldManager";
import { insertImport } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";

export interface StringDecoratorOptions {
  isString: boolean;
  source: ts.SourceFile;
  field: any;
}

export class StringDecoratorManager implements DecoratorManager {
  constructor(public options: StringDecoratorOptions, public fieldNode?: PropertyDeclaration | undefined) { }
  isApplyDecorator(): boolean {
    return this.options.isString;
  }
  buildDecorator(): PartialAddFieldChange {
    const fieldSourceLines = [];
    const changes: Change[] = [];
    fieldSourceLines.push(`@${this.decoratorName()}()`);
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
  decoratorName(): string {
    return 'IsString';
  }
  decoratorImports(): Change[] {
    return [insertImport(
        this.options.source,
        this.options.source.fileName,
        this.decoratorName(),
        'class-validator')]
}
  updateDecorator(): [PropertyDeclaration, Change[]] {
    if (!this.fieldNode) throw new Error(`Field node is required for updating the ${this.decoratorName()} decorator`);

    let newModifiers: ModifierLike[] = [];
    let existingModifiers: ts.NodeArray<ModifierLike> | undefined = this.fieldNode.modifiers;

    // Check if the field has an Length decorator.
    const existingDecorator = this.findDecorator(this.decoratorName(), existingModifiers);

    //Remove the column decorator if the column decorator exists
    //TODO probably this too can be done in a lesser intrusive way i.e update everything instead of removing and adding
    newModifiers = [...this.filterNonDecorators(existingModifiers), ...this.filterOtherDecorators(this.decoratorName(), existingModifiers)];

    //Add the column decorator if column decorator is required  
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
    // Capture the existing column decorator options
    let validationOptions: ts.ObjectLiteralElementLike[] = [];
    if (existingDecorator !== undefined) {
      //Pre-set the column options from the existing column decorator
      const existingCallExpression = existingDecorator.expression as ts.CallExpression;
      // Check if  call expression has at least 1 arguments
      if (existingCallExpression.arguments.length > 0) {
        if (!ts.isObjectLiteralExpression(existingCallExpression.arguments[0])) { throw new Error(`${this.decoratorName()} decorator 1st argument must be an object literal containing the validation options`); }
        const existingObjectLiteralExpression = existingCallExpression.arguments[0] as ts.ObjectLiteralExpression;
        validationOptions.push(...existingObjectLiteralExpression.properties);
      }
    }

    // Re-create the column decorator with the merged column decorator options
    const decoratorIdentifier = ts.factory.createIdentifier(this.decoratorName());
    const argumentsArray: ts.Expression[] = [];
    if (validationOptions.length > 0) {
      const validationOptionsObjectLiteral = ts.factory.createObjectLiteralExpression(validationOptions);
      argumentsArray.push(validationOptionsObjectLiteral);
    }
    const call = ts.factory.createCallExpression(decoratorIdentifier, undefined, argumentsArray);
    return ts.factory.createDecorator(call)
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