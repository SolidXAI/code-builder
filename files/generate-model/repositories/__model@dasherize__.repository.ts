import { Injectable } from '@nestjs/common';
import { RequestContextService, SecurityRuleRepository, SolidBaseRepository } from '@solidstarters/solid-core';
import { DataSource } from 'typeorm';
import { <%= classify(model) %> } from '../entities/<%= dasherize(model) %>.entity';

@Injectable()
export class <%= classify(model) %>Repository extends SolidBaseRepository<<%= classify(model) %>> {
    constructor(
        readonly dataSource: DataSource,
        readonly requestContextService: RequestContextService,
        readonly securityRuleRepository: SecurityRuleRepository,
    ) {
        super(<%= classify(model) %>, dataSource, requestContextService, securityRuleRepository);
    }
}