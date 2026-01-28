import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ModuleRef  } from "@nestjs/core";
import { EntityManager } from 'typeorm';
import { CRUDService } from '<%= calculateModuleFileImportPath(module,"src/services/crud.service") %>';
import { <%= classify(model) %> } from '../entities/<%= dasherize(model) %>.entity';
import { <%= classify(model) %>Repository } from '../repositories/<%= dasherize(model) %>.repository';

@Injectable()
export class <%= classify(model) %>Service extends CRUDService<<%= classify(model) %>>{
  constructor(
    @InjectEntityManager("<%= dataSource %>")
    readonly entityManager: EntityManager,
    readonly repo: <%= classify(model) %>Repository,
    readonly moduleRef: ModuleRef,
    <% if (dataSource !== 'default') { %>
    readonly defaultDatasourceEntityManager: EntityManager,
    <% } %>  
 ) {
   super(entityManager, repo, '<%= model %>', '<%= module %>', moduleRef);
 }
}