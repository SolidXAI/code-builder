<%= outputParentImportPathForDto(parentModel ,parentModule ,"create") %>
export class Create<%= classify(model) %>Dto<%= parentModel ? ` extends Create${classify(parentModel)}Dto` : `` %> {}