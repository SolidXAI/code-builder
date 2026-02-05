import { classify, dasherize } from '@angular-devkit/core/src/utils/strings';
import { Tree } from '@angular-devkit/schematics';
import { MetadataManager } from '@nestjs/schematics';
import ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { insertImport } from '@schematics/angular/utility/ast-utils';
import { Change, InsertChange } from '@schematics/angular/utility/change';
import * as crypto from 'crypto';
import {
  DtoSourceType,
  FieldChange,
  RemoveChangeSSS,
  ReplaceChangeSSS,
  getFieldHandler,
} from '../field/FieldManager';
import { SupportedDatabases } from '../field/db-helpers';

export const SOLID_CORE_MODULE_NAME = 'solid-core';
export const SOLID_CORE_MODULE_NPM_PACKAGE_NAME = '@solidxai/solid-core';


// export const CHECKSUM_FILE_PATH = 'code-builder/output/checksums.json';
export const CHECKSUM_HASH_ALGORITHM = 'md5';
export enum Command {
  AddModule = 'add-module',
  AddModel = 'add-model',
}

export enum SolidProviderType {
  Entity = 'Entity',
  Dto = 'Dto',
  Service = 'Service',
  Controller = 'Controller',
  Repository = 'Repository'
}

export enum ModuleMetadataType {
  TypeOrmImports = 'imports',
  Service = 'service',
  Controllers = 'controllers',
  Repository = 'repository',
}

export type ImportData = {
  symbolName: string;
  importPath: string;
};

export type ModuleMetadata = {
  metadata: string;
  symbol: string;
};

export type Checksum = {
  filePath: string;
  checksum: string;
  algorithm: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleMetadataConfiguration {
  checksums: Checksum[]; // Other metadata keys are not used, so only kept 1 key in the interface for now
}

export function getModuleMetadata(
  modelName: string,
  type: ModuleMetadataType,
): ModuleMetadata {
  switch (type) {
    case ModuleMetadataType.TypeOrmImports:
      // const symbols = [`TypeOrmModule.forFeature([${classify(modelName)}])`, `SolidCoreModule`];
      return {
        metadata: 'imports',
        symbol: `TypeOrmModule.forFeature([${classify(modelName)}])`
      };
    case ModuleMetadataType.Service:
      return { metadata: 'providers', symbol: `${classify(modelName)}Service` };
    case ModuleMetadataType.Controllers:
      return {
        metadata: 'controllers',
        symbol: `${classify(modelName)}Controller`,
      };
    case ModuleMetadataType.Repository:
      return { metadata: 'providers', symbol: `${classify(modelName)}Repository` };
    default:
      throw Error('Invalid ModuleMetadataType');
  }
}

export function getSolidImports(
  modelName: string,
  type: SolidProviderType,
): ImportData {
  switch (type) {
    case SolidProviderType.Dto:
      return {
        symbolName: `Create${classify(modelName)}Dto`,
        importPath: `./dtos/create-${dasherize(modelName)}.dto`,
      };
    case SolidProviderType.Service:
      return {
        symbolName: `${classify(modelName)}Service`,
        importPath: `./services/${dasherize(modelName)}.service`,
      };
    case SolidProviderType.Controller:
      return {
        symbolName: `${classify(modelName)}Controller`,
        importPath: `./controllers/${dasherize(modelName)}.controller`,
      };
    case SolidProviderType.Entity:
      return {
        symbolName: `${classify(modelName)}`,
        importPath: `./entities/${dasherize(modelName)}.entity`,
      };
      case SolidProviderType.Repository:
        return {
          symbolName: `${classify(modelName)}Repository`,
          importPath: `./repositories/${dasherize(modelName)}.repository`,
        };
    default:
      throw Error('Invalid SolidProviderType');
  }
}

export function addModuleMetadata(
  tree: Tree,
  moduleFilePath: string,
  moduleMetadata: ModuleMetadata[],
) {
  let moduleFileContent = tree.readText(moduleFilePath);
  if (moduleFileContent == '') {
    throw new Error(`${moduleFilePath} seems to be empty`);
  }
  moduleMetadata.forEach((metadata) => {
    const metadataManager = new MetadataManager(moduleFileContent);
    moduleFileContent =
      metadataManager.insert(metadata.metadata, metadata.symbol) ??
      moduleFileContent;
  });
  tree.overwrite(moduleFilePath, moduleFileContent);
}

export function addImports(
  tree: Tree,
  filePath: string,
  imports: ImportData[],
) {
  const fileContent = tree.readText(filePath);
  if (fileContent == '') {
    throw new Error(`${filePath} seems to be empty`);
  }
  const source = ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
  );

  const updateRecorder = tree.beginUpdate(filePath);
  imports.forEach((importData) => {
    const insertImportChange = insertImport(
      source,
      filePath,
      importData.symbolName,
      importData.importPath,
    );
    if (insertImportChange instanceof InsertChange) {
      updateRecorder.insertRight(
        insertImportChange.pos,
        insertImportChange.toAdd,
      );
    }
  });
  tree.commitUpdate(updateRecorder);
}

function safeApplyChanges(
  tree: Tree,
  moduleName: string,
  filePath: string,
  changes: Change[],
  generateChecksum: boolean = false
) {
  const uniqueChanges = deDuplicateByDescription(changes);

  // Get all the insert changes
  const insertChanges = uniqueChanges.filter((change) => change instanceof InsertChange);

  // Get all the replace and remove changes
  const replaceAndRemoveChanges = uniqueChanges.filter(
    (change) => change instanceof ReplaceChangeSSS || change instanceof RemoveChangeSSS
  );
  const { replaceChangesArray, removeChangesArray } = deDuplicateByPosition(replaceAndRemoveChanges);

  const safeChanges = [...insertChanges, ...replaceChangesArray, ...removeChangesArray];
  applyChanges(tree, filePath, safeChanges)
  generateChecksum ? handleUpdateChecksums(tree, moduleName, filePath) : "no-ops";
}

function deDuplicateByDescription(changes: Change[]) {
  return changes.filter((item, index, self) => index === self.findIndex((c) => c.description === item.description)
  );
}

// if there are multiple replace changes for the same position, then only the last replace change will be applied
function deDuplicateByPosition(replaceAndRemoveChanges: Change[]) {
  const replaceChanges = replaceAndRemoveChanges.filter((change) => change instanceof ReplaceChangeSSS);
  // de-duplicate the replace changes in the same position, using the last replace change
  const replaceChangesMap = new Map<number, ReplaceChangeSSS>();
  replaceChanges.forEach((change) => {
    replaceChangesMap.set(change.replacePosition, change);
  });
  const replaceChangesArray = Array.from(replaceChangesMap.values());

  // if there are multiple replace changes for the same position, then only the last replace change will be applied
  const removeChanges = replaceAndRemoveChanges.filter((change) => change instanceof RemoveChangeSSS);
  // de-duplicate the remove changes in the same position, using the last remove change
  const removeChangesMap = new Map<number, RemoveChangeSSS>();
  removeChanges.forEach((change) => {
    removeChangesMap.set(change.removePosition, change);
  });
  const removeChangesArray = Array.from(removeChangesMap.values());
  return { replaceChangesArray, removeChangesArray };
}

export function generateMD5Hash(input: string): string {
  return crypto.createHash('md5').update(input).digest('hex');
}

function createBackup(tree: Tree, filePath: string, fileContent: string) {
  const backupFilePath = `${filePath}.bkp`;
  if (!tree.exists(backupFilePath)) {
    tree.create(backupFilePath, fileContent);
  }
  else {
    console.log('Backup file already exists...');
    // throw new Error('Backup file already exists. Please delete this file and try again');
    //tree.overwrite(backupFilePath, fileContent);
  }
}

export function loadModuleMetadata(tree: Tree, moduleName: string): ModuleMetadataConfiguration {
  const moduleMetadataFilePath = getModuleMetadataFilePath(moduleName);
  const metadata: ModuleMetadataConfiguration = tree.exists(moduleMetadataFilePath) ? JSON.parse(tree.readText(moduleMetadataFilePath)) : null;
  if (!metadata.checksums) metadata.checksums = [];
  return metadata;
}

function getModuleMetadataFilePath(moduleName: string) {
  if (moduleName === SOLID_CORE_MODULE_NAME) {
    return `src/${moduleName}/seeders/seed-data/${moduleName}-metadata.json`
  }
  else {
    return `module-metadata/${dasherize(moduleName)}/${dasherize(moduleName)}-metadata.json`;
  }
}

// function getChecksum(tree: Tree, filePath: string, checksums?: Checksum[]) {
//   if (!checksums) {
//     checksums = loadChecksums(tree);
//   }
//   return checksums.filter((checksum: Checksum) => checksum.filePath === filePath).pop();
// }


function applyChanges(tree: Tree, filePath: string, changes: Change[]) {
  /*
  //Given the filePath, generate a checksum of the file from the content of the file
  const fileContent = tree.readText(filePath);
  const checksum = generateMD5Hash(fileContent);
  console.log('checksum:', checksum, filePath);

  // Compare the checksum in the existing checksums.json file. If they don't match then create a backup of the file
  // const checksums: Checksum[] = loadChecksums(tree);
  // console.log('checksums:', checksums);
  const existingChecksum = getChecksum(tree, filePath);
  console.log('existingChecksum:', existingChecksum);

  if (existingChecksum && existingChecksum.checksum !== checksum) {
    createBackup(tree, filePath, fileContent);
  }*/

  const updateRecorder = tree.beginUpdate(filePath);
  changes.forEach((change) => {
    if (change instanceof InsertChange) {
      updateRecorder.insertLeft(change.pos, change.toAdd);
    }
    else if (change instanceof ReplaceChangeSSS) {
      // console.log(`removing ${change.oldText.length} at ${change.replacePosition}`);
      updateRecorder.remove(change.replacePosition, change.oldText.length);
      // console.log(`inserting ${change.newText} at ${change.replacePosition}`);
      updateRecorder.insertLeft(change.replacePosition, change.newText);
      // console.log('source', updateRecorder.getText());
    }
    else if (change instanceof RemoveChangeSSS) {
      updateRecorder.remove(change.removePosition, change.toRemove.length);
    }
  });
  tree.commitUpdate(updateRecorder);
}

export function addField(tree: Tree, options: any, field: any) {
  try {
    const fieldHandler = getFieldHandler(
      tree,
      options.module,
      options.model,
      field,
      options.modelEnableSoftDelete
    );
    const entityFieldChanges = fieldHandler.addEntityField();
    applyFieldChanges(tree, options.module, entityFieldChanges, options?.generateChecksum)

    const dtoFieldChanges = fieldHandler.addDtoField();
    applyFieldChanges(tree, options.module, dtoFieldChanges, options?.generateChecksum)

  }
  catch (e) {
    console.error('Error while adding field' + field.name, e);
  }
}
export function removeField(tree: Tree, options: any, field: any) {
  try {
    const fieldHandler = getFieldHandler(
      tree,
      options.module,
      options.model,
      field,
      options.modelEnableSoftDelete
    );

    const entityFieldChanges = fieldHandler.removeEntityField();
    applyFieldChanges(tree, options.module, entityFieldChanges, options?.generateChecksum)

    const dtoFieldChanges = fieldHandler.removeDtoField();
    applyFieldChanges(tree, options.module, dtoFieldChanges, options?.generateChecksum)

  } catch (e) {
    console.error('Error while removing field' + field.name, e);
  }
}

export function updateField(tree: Tree, options: any, field: any) {
  try {
    const fieldHandler = getFieldHandler(
      tree,
      options.module,
      options.model,
      field,
      options.modelEnableSoftDelete,
      options.dataSourceType as SupportedDatabases
    );
    const entityFieldChanges = fieldHandler.updateEntityField();
    // console.log('entityFieldChanges:', entityFieldChanges.map((change) => change.changes));
    applyFieldChanges(tree, options.module, entityFieldChanges, options?.generateChecksum)

    const dtoFieldChanges = fieldHandler.updateDtoField();
    // console.log('dtoFieldChanges:', dtoFieldChanges.map((change) => change.changes));
    applyFieldChanges(tree, options.module, dtoFieldChanges, options?.generateChecksum)
  }
  catch (e) {
    console.error('Error while updating field' + field.name, e);
  }
}

function applyFieldChanges(tree: Tree, moduleName: string, fieldChanges: FieldChange[], generateChecksum: boolean = false) {
  // Collect the changes file wise into a map, i.e all changes related to a file get applied together
  const changesMap = new Map<string, Change[]>();
  fieldChanges.forEach((fieldChange) => {
    const changes = changesMap.get(fieldChange.filePath) ?? [];
    changes.push(...fieldChange.changes);
    changesMap.set(fieldChange.filePath, changes);
  });

  //Apply the changes to the file
  changesMap.forEach((changes, filePath) => {
    safeApplyChanges(
      tree,
      moduleName,
      filePath,
      changes,
      generateChecksum
    );
  });
}

// Read all the files with the given fileNames and update the checksum in the checksum file
export function getUpdatedChecksums(filePaths: string[], existingChecksums: Checksum[], tree: Tree) {
  filePaths.forEach((filePath) => {
    // Find the checksum entry for the given file path
    const checksumEntry = existingChecksums.find((checksum: Checksum) => checksum.filePath === filePath);

    // If the checksum entry is found, update the checksum
    if (checksumEntry) {
      const updatedChecksum = generateMD5Hash(tree.readText(filePath));
      if (checksumEntry.checksum !== updatedChecksum) {
        checksumEntry.checksum = generateMD5Hash(tree.readText(filePath));
        checksumEntry.updatedAt = new Date();
      }
    }
    else {
      // If the checksum entry is not found, create a new checksum entry
      existingChecksums.push({
        filePath: filePath,
        checksum: generateMD5Hash(tree.readText(filePath)),
        algorithm: CHECKSUM_HASH_ALGORITHM,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });
  return existingChecksums;
}

export function getSourceFilePathsAffected(command: Command, options: any): string[] {
  const sourceFilePaths: string[] = [];
  switch (command) {
    case Command.AddModule:
      sourceFilePaths.push(`src/${dasherize(options.module)}/${dasherize(options.module)}.module.ts`);
      break;
    case Command.AddModel:
      sourceFilePaths.push(`src/${dasherize(options.module)}/${dasherize(options.module)}.module.ts`);
      sourceFilePaths.push(`src/${dasherize(options.module)}/services/${dasherize(options.model)}.service.ts`);
      sourceFilePaths.push(`src/${dasherize(options.module)}/controllers/${dasherize(options.model)}.controller.ts`);
      sourceFilePaths.push(`src/${dasherize(options.module)}/entities/${dasherize(options.model)}.entity.ts`);
      sourceFilePaths.push(`src/${dasherize(options.module)}/dtos/create-${dasherize(options.model)}.dto.ts`);
      sourceFilePaths.push(`src/${dasherize(options.module)}/dtos/update-${dasherize(options.model)}.dto.ts`);
      break;
    default:
      throw Error('Invalid command');
  }
  return sourceFilePaths;
}

export function handleUpdateChecksums(tree: any, moduleName: string, ...filePaths: string[]) {
  // console.log('Updating checksums for the following files:', filePaths);
  const metadata = loadModuleMetadata(tree, moduleName);
  const updatedChecksums = getUpdatedChecksums(filePaths, metadata.checksums, tree);
  metadata.checksums = updatedChecksums;
  // Save the updated checksums to the checksum file, by overwriting the existing checksum file
  tree.overwrite(getModuleMetadataFilePath(moduleName), JSON.stringify(metadata, null, 2));
  return tree;
}

// Refer -> https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
// https://learning-notes.mistermicheels.com/javascript/typescript/compiler-api/
export function removeUnusedImports(tree: Tree, filePath: string): string {
  const sourceCode = tree.readText(filePath);
  // const compilerOptions = {
  //   getScriptFileNames: () => [filePath],
  //   getScriptVersion: () => '0',
  //   getScriptSnapshot: (fileName: string) =>
  //     fileName === filePath
  //       ? ts.ScriptSnapshot.fromString(sourceCode)
  //       : undefined,
  //   getCurrentDirectory: () => '',
  //   getCompilationSettings: () => ({ module: ts.ModuleKind.CommonJS }),
  //   getDefaultLibFileName: (options: any) => ts.getDefaultLibFilePath(options),
  //   readFile: (filePath:string) => tree.readText(filePath),
  //   fileExists: (filePath:string) => tree.exists(filePath),
  // };

  // const languageService = ts.createLanguageService(compilerOptions);

  // Create a language service
  // const languageService = ts.createLanguageService({
  //     getScriptFileNames: () => ['temp.ts'],
  //     getScriptVersion: () => '0',
  //     getScriptSnapshot: (fileName: string) => fileName === 'temp.ts' ? ts.ScriptSnapshot.fromString(sourceCode) : undefined,
  //     getCurrentDirectory: () => '',
  //     getCompilationSettings: () => ({ module: ts.ModuleKind.CommonJS })
  // });
  const defaultCompilerHost = ts.createCompilerHost({});
  console.log(
    'defaultCompilerHost:',
    JSON.stringify(defaultCompilerHost.getCurrentDirectory()),
  );

  /*
  const program = ts.createProgram([filePath],{}, defaultCompilerHost);
  // const diagnostics = languageService.getSemanticDiagnostics(filePath);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const unusedImports: Set<string> = new Set();

  if (!tree.exists(`output.diagnostics.json`)) {
    tree.create(`output.diagnostics.json`, diagnostics.map(d => d.messageText).join('\n'));
  }
  // Find unused imports from diagnostics
  for (const diagnostic of diagnostics) {
    console.log('diagnostic:', diagnostic);
    if (diagnostic.code === 6192 && diagnostic.start && diagnostic.length) {
      // 6192: Unused import
      const start = diagnostic.start;
      const end = diagnostic.start + diagnostic.length;

      // Get the text range of the unused import
      const importText = sourceCode.substring(start, end);

      // Extract the import specifier
      const importSpecifier = importText.match(/import\s+(.*?)\s+from/)?.[1];

      if (importSpecifier) {
        unusedImports.add(importSpecifier);
      }
    }
  }

  console.log('Unused imports:', unusedImports);
  // Remove unused imports
  let result = sourceCode;
  unusedImports.forEach((importSpecifier) => {
    result = result.replace(
      new RegExp(`import\\s+${importSpecifier}\\s+from\\s+.*?;`, 'g'),
      '',
    );
  });

  return result;*/
  return sourceCode;
}

export function takeBackupIfChecksumsMismatch(tree: Tree, moduleName: string) {
  const metadata = loadModuleMetadata(tree, moduleName);
  metadata.checksums.forEach((checksum: Checksum) => {
    const filePath = checksum.filePath;
    const fileContent = tree.readText(filePath);
    const fileHash = generateMD5Hash(fileContent);
    if (checksum.checksum !== fileHash) {
      createBackup(tree, filePath, fileContent);
    }
  });
}

export function calculateModuleFileImportPath(moduleName: string, internalPath: string) {
  return (moduleName === SOLID_CORE_MODULE_NAME) ? internalPath : SOLID_CORE_MODULE_NPM_PACKAGE_NAME;
}

export function outputEntitySuperClassImport(module: string, isLegacyTable: boolean = false, isLegacyTableWithId: boolean = false, parentModel: string | null = null, parentModule: string = "solid-core") {
  let importPath: string = isLegacyTableWithId ? calculateModuleFileImportPath(module, `src/entities/legacy-common-with-id.entity`) : isLegacyTable ? calculateModuleFileImportPath(module, `src/entities/legacy-common.entity`) : calculateModuleFileImportPath(module, `src/entities/common.entity`);
  let importSymbol: string = isLegacyTableWithId ? "LegacyCommonWithIdEntity" : isLegacyTable ? "LegacyCommonEntity" : "CommonEntity";
  if (parentModel != null) {
    importPath = calculateModuleFileImportPath(parentModule, `src/${dasherize(parentModule)}/entities/${dasherize(parentModel)}.entity`);
    importSymbol = `${classify(parentModel)}`;
  }
  return `import { ${importSymbol} } from '${importPath}';`;
}

export function outputParentImportPathForDto(parentModel: string | null = null, parentModule: string | null = null, context: string) {
  if (parentModel == null || parentModule == null) {
    return "";
  }
  let importPath = ``;
  let importSymbol = ``;
  if (context === DtoSourceType.Update) {
    importPath = parentModule === SOLID_CORE_MODULE_NAME ? SOLID_CORE_MODULE_NPM_PACKAGE_NAME : `src/${dasherize(parentModule)}/dtos/update-${dasherize(parentModel)}.dto.ts`;
    importSymbol = `Update${classify(parentModel)}Dto`;
  } else if (context === DtoSourceType.Create) {
    importPath = parentModule === SOLID_CORE_MODULE_NAME ? SOLID_CORE_MODULE_NPM_PACKAGE_NAME : `src/${dasherize(parentModule)}/dtos/create-${dasherize(parentModel)}.dto.ts`;
    importSymbol = `Create${classify(parentModel)}Dto`;
  }
  return `import { ${importSymbol} } from '${importPath}';`;
}

export function unSnakeCase(name: string) {
  return name.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}

export function readModelOptionsFromMetadata(tree: Tree, moduleName: string, modelName: string): any {
  const metadataFilePath = getModuleMetadataFilePath(moduleName);
  if (!tree.exists(metadataFilePath)) {
    throw new Error(`Module metadata file not found at ${metadataFilePath}`);
  }

  const metadataJson = JSON.parse(tree.readText(metadataFilePath));
  const moduleMetadata = metadataJson.moduleMetadata;
  if (!moduleMetadata || !moduleMetadata.models) {
    throw new Error(`Invalid metadata structure in ${metadataFilePath}: missing moduleMetadata.models`);
  }

  const model = moduleMetadata.models.find((m: any) => m.singularName === modelName);
  if (!model) {
    throw new Error(`Model '${modelName}' not found in module '${moduleName}' metadata. Available models: ${moduleMetadata.models.map((m: any) => m.singularName).join(', ')}`);
  }

  const options: any = {
    module: moduleName,
    model: modelName,
    table: model.tableName,
    moduleDisplayName: moduleMetadata.displayName,
    dataSource: model.dataSource,
    dataSourceType: model.dataSourceType,
    modelEnableSoftDelete: model.enableSoftDelete,
    draftPublishWorkflowEnabled: model.draftPublishWorkflow,
    isLegacyTable: model.isLegacyTable ?? false,
    isLegacyTableWithId: model.isLegacyTableWithId ?? false,
    fields: model.fields.map((f: any) => JSON.stringify(f)),
  };

  if (model.isChild && model.parentModelUserKey) {
    options.parentModel = model.parentModelUserKey;
  }

  return options;
}

export function readFieldOptionsFromMetadata(tree: Tree, moduleName: string, modelName: string, fieldNames: string[]): { fields: string[], modelEnableSoftDelete: boolean, dataSourceType: string } {
  const metadataFilePath = getModuleMetadataFilePath(moduleName);
  if (!tree.exists(metadataFilePath)) {
    throw new Error(`Module metadata file not found at ${metadataFilePath}`);
  }

  const metadataJson = JSON.parse(tree.readText(metadataFilePath));
  const moduleMetadata = metadataJson.moduleMetadata;
  if (!moduleMetadata || !moduleMetadata.models) {
    throw new Error(`Invalid metadata structure in ${metadataFilePath}: missing moduleMetadata.models`);
  }

  const model = moduleMetadata.models.find((m: any) => m.singularName === modelName);
  if (!model) {
    throw new Error(`Model '${modelName}' not found in module '${moduleName}' metadata. Available models: ${moduleMetadata.models.map((m: any) => m.singularName).join(', ')}`);
  }

  const matchedFields: any[] = [];
  const notFound: string[] = [];
  for (const name of fieldNames) {
    const field = model.fields.find((f: any) => f.name === name);
    if (field) {
      matchedFields.push(field);
    } else {
      notFound.push(name);
    }
  }

  if (notFound.length > 0) {
    throw new Error(`Field(s) not found in model '${modelName}': ${notFound.join(', ')}. Available fields: ${model.fields.map((f: any) => f.name).join(', ')}`);
  }

  return {
    fields: matchedFields.map((f: any) => JSON.stringify(f)),
    modelEnableSoftDelete: model.enableSoftDelete ?? false,
    dataSourceType: model.dataSourceType,
  };
}