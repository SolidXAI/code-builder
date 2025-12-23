import { Injectable } from '@nestjs/common';
import { SecurityRuleRepository } from '<%= calculateModuleFileImportPath(module,"src/repository/security-rule.repository") %>';
import { SolidBaseRepository } from '<%= calculateModuleFileImportPath(module,"src/repository/solid-base.repository") %>' ;
import { RequestContextService } from '<%= calculateModuleFileImportPath(module,"src/services/request-context.service") %>';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { <%= classify(model) %> } from '../entities/<%= dasherize(model) %>.entity';

@Injectable()
export class <%= classify(model) %>Repository extends SolidBaseRepository<<%= classify(model) %>> {
    constructor(
        @InjectDataSource("<%= dataSource %>")
        readonly dataSource: DataSource,
        readonly requestContextService: RequestContextService,
        readonly securityRuleRepository: SecurityRuleRepository,
    ) {
        super(<%= classify(model) %>, dataSource, requestContextService, securityRuleRepository);
    }
}