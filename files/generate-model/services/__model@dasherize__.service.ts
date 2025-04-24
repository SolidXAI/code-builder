import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { DiscoveryService, ModuleRef  } from "@nestjs/core";
import { EntityManager, Repository } from 'typeorm';

import { CRUDService } from '<%= calculateModuleFileImportPath(module,"src/services/crud.service") %>';
import { ModelMetadataService } from '<%= calculateModuleFileImportPath(module,"src/services/model-metadata.service") %>';
import { ModuleMetadataService } from '<%= calculateModuleFileImportPath(module,"src/services/module-metadata.service") %>';
import { ConfigService } from '@nestjs/config';
import { FileService } from '<%= calculateModuleFileImportPath(module,"src/services/file.service") %>';
import { CrudHelperService } from '<%= calculateModuleFileImportPath(module,"src/services/crud-helper.service") %>';


import { <%= classify(model) %>Repository } from '../repositories/<%= dasherize(model) %>.repository';

@Injectable()
export class <%= classify(model) %>Service extends CRUDService<<%= classify(model) %>>{
  constructor(
    readonly modelMetadataService: ModelMetadataService,
    readonly moduleMetadataService: ModuleMetadataService,
    readonly configService: ConfigService,
    readonly fileService: FileService,
    readonly discoveryService: DiscoveryService,
    readonly crudHelperService: CrudHelperService,
    @InjectEntityManager()
    readonly entityManager: EntityManager,
    readonly repo: <%= classify(model) %>Repository,
    readonly moduleRef: ModuleRef

 ) {
   super(modelMetadataService, moduleMetadataService,  configService, fileService,  discoveryService, crudHelperService,entityManager, repo, '<%= model %>', '<%= module %>', moduleRef);
 }
}
