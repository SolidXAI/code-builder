import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { DiscoveryService } from "@nestjs/core";
import { EntityManager, Repository } from 'typeorm';
import { CRUDService } from '@solidstarters/solid-core-module';
import { ModelMetadataService } from '@solidstarters/solid-core-module';
import { ModuleMetadataService } from '@solidstarters/solid-core-module';
import { MediaStorageProviderMetadataService } from '@solidstarters/solid-core-module';
import { ConfigService } from '@nestjs/config';
import { MediaService } from '@solidstarters/solid-core-module';
import { FileService } from '@solidstarters/solid-core-module';
import { CrudHelperService } from '@solidstarters/solid-core-module';


import { <%= classify(model) %> } from '../entities/<%= dasherize(model) %>.entity';

@Injectable()
export class <%= classify(model) %>Service extends CRUDService<<%= classify(model) %>>{
  constructor(
    readonly modelMetadataService: ModelMetadataService,
    readonly moduleMetadataService: ModuleMetadataService,
    readonly mediaStorageProviderService: MediaStorageProviderMetadataService,
    readonly configService: ConfigService,
    readonly fileService: FileService,
    readonly mediaService: MediaService,
    readonly discoveryService: DiscoveryService,
    readonly crudHelperService: CrudHelperService,
    @InjectEntityManager()
    readonly entityManager: EntityManager,
    @InjectRepository(<%= classify(model) %>, '<%= dataSource %>')
    readonly repo: Repository<<%= classify(model) %>>,
 ) {
   super(modelMetadataService, moduleMetadataService, mediaStorageProviderService, configService, fileService, mediaService, discoveryService, crudHelperService,entityManager, repo, '<%= model %>', '<%= module %>');
 }
}
