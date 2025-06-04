<%= outputParentImportPathForDto(parentModel ,parentModule ,"create") %>
<% if (draftPublishWorkflowEnabled) { %>
import { IsOptional, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { datetimeTransformer } from '@solidstarters/solid-core';
<% } %>
export class Create<%= classify(model) %>Dto<%= parentModel ? ` extends Create${classify(parentModel)}Dto` : `` %> {
<% if (draftPublishWorkflowEnabled) { %>
    @IsOptional()
    @IsDate()
    @ApiProperty()
    @Transform(datetimeTransformer)
    publishedAt: Date;
<% } %>    
}