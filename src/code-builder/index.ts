import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import {
  MergeStrategy,
  Rule,
  SchematicContext,
  Source,
  Tree,
  apply,
  branchAndMerge,
  chain,
  externalSchematic,
  mergeWith,
  move,
  template,
  url,
} from '@angular-devkit/schematics';
import * as generateModelHelpers from './lib/model/helpers';
import { addField, SOLID_CORE_MODULE_NAME } from './lib/model/helpers';
import { removeField } from './lib/model/helpers';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
const generateModelUtils = { dasherize, classify, ...generateModelHelpers };
// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function addModule(options: any): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    //Link to nestjs schematic
    return chain([
      externalSchematic('@nestjs/schematics', 'module', { //FIXME : Show better error. if addModule is called multiple times, it returns a very technical error i.e "A merge conflicted on path e.g 'src/client/client.module.ts'."
        name: options?.module,
      }),
      updateChecksum(options?.module, options?.generateChecksum, ...generateModelHelpers.getSourceFilePathsAffected(generateModelHelpers.Command.AddModule, options)),
    ]);
  };
}

export function refreshModel(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const modulePath = (options.module === SOLID_CORE_MODULE_NAME) ? `src` : `src/${options.module}`;

    // If the model related code is not present, then add it by call addModel, else call update field with the fields provided
    const modelEntityFilePath = `${modulePath}/entities/${dasherize(options.model)}.entity.ts`;
    // console.log('Model Entity File Path: ', modelEntityFilePath);
    if (!tree.exists(modelEntityFilePath)) {
      // console.log('Model does not exist, adding model');
      return addModel(options)(tree, _context);
    }
    else {
      // console.log('Model does not exist, updating fields');
      return updateFields(options)(tree, _context);
    }
  };
}

export function addModel(options: any): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // If the module is solid-core, the code needs to be generated in src/ since solid-core-module is a library & there is only 1 module
    const modulePath = (options.module === SOLID_CORE_MODULE_NAME) ? `src` : `src/${options.module}`;
    //Link to a templates folder
    const sourceTemplates: Source = apply(url('../files/generate-model'), [
      template({ ...generateModelUtils, ...options }),
      move(modulePath),
    ]);
    return branchAndMerge(
      chain([
        addModuleImportsAndMetadata(options),
        mergeWith(sourceTemplates, MergeStrategy.Overwrite),
        updateChecksum(options?.module, options?.generateChecksum, ...generateModelHelpers.getSourceFilePathsAffected(generateModelHelpers.Command.AddModel, options)),
        addFields(options),
        // removeFields(options),
      ]),
    )(tree, context);
  };
}

function normalizeFieldType(fields: string| string[]): string[] {
 // if field is a string, convert it to an array
  if (typeof fields === 'string') {
    fields = [fields];
  }
  return fields; 
}

export function addFields(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const normalizedFields = normalizeFieldType(options.fields);
    const fields: any[] = normalizedFields.map((f: any) => JSON.parse(f));
    fields.forEach((field: any) => {
      addField(tree, options, field);
    });
    return tree;
  };
}

export function updateFields(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const normalizedFields = normalizeFieldType(options.fields);
    const fields: any[] = normalizedFields.map((f: any) => JSON.parse(f));
    options?.generateChecksum ? generateModelHelpers.takeBackupIfChecksumsMismatch(tree, options.module) : "no-ops";

    fields.forEach((field: any) => {
      generateModelHelpers.updateField(tree, options, field);
    });
    return tree;
  };
}

export function removeFields(options: any): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const normalizedFields = normalizeFieldType(options.fields);
    const fields: any[] = normalizedFields.map((f: any) => JSON.parse(f));
    options?.generateChecksum ? generateModelHelpers.takeBackupIfChecksumsMismatch(tree, options.module) : "no-ops";

    fields.forEach((field: any) => {
      removeField(tree, options, field);
    });
    return tree;
  };
}


function addModuleImportsAndMetadata(options: any) { // TODO This method should perhaps be moved elsewhere since this is not a seperate command
  return (tree: Tree, _context: SchematicContext) => {
    // Handle the module imports
    const modulePath = (options.module === SOLID_CORE_MODULE_NAME) ? `src` : `src/${options.module}`;
    const moduleFilePath = `${modulePath}/${dasherize(options.module)}.module.ts`;
    const moduleImports: generateModelHelpers.ImportData[] = [
      { symbolName: `TypeOrmModule`, importPath: `@nestjs/typeorm` },
      generateModelHelpers.getSolidImports(
        options.model,
        generateModelHelpers.SolidProviderType.Entity,
      ),
      generateModelHelpers.getSolidImports(
        options.model,
        generateModelHelpers.SolidProviderType.Service,
      ),
      generateModelHelpers.getSolidImports(
        options.model,
        generateModelHelpers.SolidProviderType.Controller,
      ),
    ];
    generateModelHelpers.addImports(tree, moduleFilePath, moduleImports);

    // Handle the module metadata
    const moduleMetadata = [
      generateModelHelpers.getModuleMetadata(
        options.model,
        generateModelHelpers.ModuleMetadataType.TypeOrmImports,
      ),
      generateModelHelpers.getModuleMetadata(
        options.model,
        generateModelHelpers.ModuleMetadataType.Controllers,
      ),
      generateModelHelpers.getModuleMetadata(
        options.model,
        generateModelHelpers.ModuleMetadataType.Providers,
      ),
    ];
    generateModelHelpers.addModuleMetadata(
      tree,
      moduleFilePath,
      moduleMetadata,
    );

    return tree;
  };
}

export function showAST(options: any): Rule {
return (tree: Tree, _context: SchematicContext) => {
  showASTinfo(tree, options.name);
  return tree;
}
}

function showASTinfo(tree:Tree, filePath : string){
  //Show the source tree of the target file
  const sourceNode = ts.createSourceFile(filePath, tree.readText(filePath), ts.ScriptTarget.ES2015, true);
  showTree(sourceNode);
}

function showTree(sourceNode: ts.SourceFile){
  function printAllChildren(node: ts.Node, depth: number){
      console.log(`${depth}.`.repeat(depth), ts.SyntaxKind[node.kind]);
      if (node.getChildCount() === 0) {
          console.log(`${depth}.`.repeat(depth) + ' Text: ' + node.getText());
      }
      node.getChildren().forEach(child => printAllChildren(child, depth + 1));
  }
  printAllChildren(sourceNode, 0);
}

export function updateChecksum(moduleName: string, generateChecksum: boolean = false, ...filePaths: string[]): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    if (!generateChecksum) {
      return tree;
    }
    return generateModelHelpers.handleUpdateChecksums(tree, moduleName, ...filePaths);
  };
}

