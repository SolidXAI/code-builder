import { PropertyDeclaration } from "@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript";
import { ColumnDecoratorManager, ColumnDecoratorOptions } from "./ColumnDecoratorManager";

export interface PrimaryColumnDecoratorOptions extends ColumnDecoratorOptions {
    required: true;
}

export class PrimaryColumnDecoratorManager extends ColumnDecoratorManager {

    constructor(public options: PrimaryColumnDecoratorOptions, public fieldNode?: PropertyDeclaration,) { 
        super(options, fieldNode);
    }

    decoratorName(): string {
        return 'PrimaryColumn';
    }

}