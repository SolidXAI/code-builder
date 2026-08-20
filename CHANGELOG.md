# Changelog

## [0.1.11] - 2026-08-20

### Added

- add ComputedFieldManagerForDto and integrate into ComputedFieldHandler
- integrate EmptyStringToNullDecoratorManager into EmailFieldManagerForDto
- add internationalisation support to model and field management
- add draft publish workflow support to model and field management

### Fixed

- remove 'uniqueChainTracker' from supported tracker field names in UniqueIndexDecoratorManager

### Maintenance

- remove obsolete schema files for add and update fields, and add model

### Other

- Revert "Revert "feat: add draft publish workflow support to model and field management""
- Revert "feat: add draft publish workflow support to model and field management"
- cleanup changes

## [0.1.11-beta.0] - 2026-08-05

### Added

- add ComputedFieldManagerForDto and integrate into ComputedFieldHandler
- integrate EmptyStringToNullDecoratorManager into EmailFieldManagerForDto
- add internationalisation support to model and field management
- add draft publish workflow support to model and field management

### Fixed

- remove 'uniqueChainTracker' from supported tracker field names in UniqueIndexDecoratorManager

### Maintenance

- remove obsolete schema files for add and update fields, and add model

### Other

- Revert "Revert "feat: add draft publish workflow support to model and field management""
- Revert "feat: add draft publish workflow support to model and field management"
- cleanup changes

## [0.1.10] - 2026-07-13

### Added

- implement relation import path resolution for entity and DTO managers

### Other

- fix for resolving solid-core metadata json in consuming projects

## [0.1.9] - 2026-07-09

### Other

- relative field imports

## [0.1.8] - 2026-06-16

### Other

- changes to modify the module metadata file path
- changes to code builder around legacy table flags cleanup

## [0.1.7] - 2026-06-01

### Fixed

- update module metadata file path for solid-core module

## [0.1.7] - 2026-05-22

### Other

- gitignore changes
- license changes
- removed unused imports
- ignoring length attribute in column decorators in typeorm for long text and rich text fields
- Regex code gen impact
