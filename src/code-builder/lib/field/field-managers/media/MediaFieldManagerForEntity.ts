import { Tree } from '@angular-devkit/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { FieldChange, FieldManager, FieldType } from '../../FieldManager';
import { BaseFieldManagerForEntity } from '../base/BaseFieldManagerForEntity';

export class MediaFieldManagerForEntity
  extends BaseFieldManagerForEntity
  implements FieldManager {
  source: ts.SourceFile;

  constructor(tree: Tree, moduleName: string, modelName: string, field: any) {
    super(tree, moduleName, modelName, field);
  }

  fieldType(): FieldType {
    return {
      text: 'string',
      node: (_field: any) => ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    };
  }

  override addField(): FieldChange[] {
    if (this.field.mediaEmbedded) {
      return super.addField();
    }
    else { // No Entity implementation required for non-embedded media field
      return [{
        filePath: this.source.fileName,
        field: this.field,
        changes: [],
      }];
    }
  }
  override removeField(): FieldChange[] {
    if (this.field.mediaEmbedded) {
      return super.removeField();
    }
    else {// No Entity implementation required for non-embedded media field
      return [{
        filePath: this.source.fileName,
        field: this.field,
        changes: [],
      }];
    }
  }
  override updateField(): FieldChange[] {
    if (this.field.mediaEmbedded) {
      return super.updateField();
    }
    else {// No Entity implementation required for non-embedded media field
      return [{
        filePath: this.source.fileName,
        field: this.field,
        changes: [],
      }];
    }
  }
}