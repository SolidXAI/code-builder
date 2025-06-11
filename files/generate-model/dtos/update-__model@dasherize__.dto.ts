import { IsInt,IsOptional } from 'class-validator';
<% if (draftPublishWorkflowEnabled === 'true') { %>
import { IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { datetimeTransformer } from '@solidstarters/solid-core';
<% } %>
<%= outputParentImportPathForDto(parentModel ,parentModule ,"update") %>
export class Update<%= classify(model) %>Dto<%= parentModel ? ` extends Update${classify(parentModel)}Dto` : `` %> {
    @IsOptional()
    @IsInt()
    id: number;
<% if (draftPublishWorkflowEnabled === 'true') { %>
    @IsOptional()
    @IsDate()
    @ApiProperty()
    @Transform(datetimeTransformer)
    publishedAt: Date;
<% } %>    
}