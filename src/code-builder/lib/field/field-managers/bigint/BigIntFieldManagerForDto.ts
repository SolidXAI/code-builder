import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { DefaultValueInitializer, FieldManager, FieldType, ManagerForDtoOptions } from '../../FieldManager';
import { BaseFieldManagerForDto } from '../base/BaseFieldManagerForDto';

export class BigIntFieldManagerForDto
    extends BaseFieldManagerForDto
    implements FieldManager {
    isJson(): boolean {
        return false;
    }
    isBoolean(): boolean {
        return false;
    }
    source: any;

    constructor(tree: Tree, moduleName: string, modelName: string, field: any, options: ManagerForDtoOptions) {
        super(tree, moduleName, modelName, field, options);
    }

    isString(): boolean {
        return false;
    }
    isNumber(): boolean {
        return false;
    }
    isInt(): boolean {
        return false;
    }
    isDecimal(): boolean {
        return false;
    }
    override isBigInt(): boolean {
        return true;
    }
    isApplyRegex(): boolean {
        return false;
    }
    isApplyRequired(): boolean {
        return true;
    }
    isApplyMin(): boolean {
        return true;
    }
    isApplyMax(): boolean {
        return true;
    }
    isDate(): boolean {
        return false;
    }
    isTransform(): boolean {
        return false;
    }
    fieldType(): FieldType {
        return {
            text: 'bigint',
            node: (_field: any) =>
                ts.factory.createKeywordTypeNode(ts.SyntaxKind.BigIntKeyword),
        };
    }

    protected override parseDefaultValue(defaultValue: string): bigint | null {
        if (!defaultValue)  return null;
        try {
          return BigInt(defaultValue);
        }
        catch (e) {
          // console.log(`Could not set default value ${defaultValue}  for field ${this.field.name} in model ${this.modelName}`);
          return null;
        }
      }
    
      protected override defaultValueInitializer(defaultValueConfig: string): DefaultValueInitializer | null {
        const defaultValue = this.parseDefaultValue(defaultValueConfig);
        if (!defaultValue) return null;
        return {
          value: defaultValue,
          text: `${defaultValue.toString()}n`,
          expression: ts.factory.createBigIntLiteral(defaultValue.toString())
        }
      }
        
}
