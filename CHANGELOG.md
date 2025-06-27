# Changelog

## [0.10.2] - 2025-06-27

### Changed
- Converted project from CommonJS to ES modules (ESM)
- Updated TypeScript compilation target to ES2022
- Added .js extensions to all relative imports for ESM compatibility

### Fixed
- Resolved issues with chalk v5 import (ESM-only package)
- Fixed module loading errors on Linux systems

## [0.10.1] - 2025-06-27

### Added
- Delete command: `runlog del <uuid>` to delete conversations you uploaded
- Help command: `runlog --help` to show usage information
- Persistent client ID tracking for authorization
- Authorization check for delete operations (can only delete your own uploads)

### Changed
- All API requests now include persistent client ID in X-Source-UUID header
- Improved error messages for authorization failures

### Fixed
- Test suite issues with mocking (chalk, process.cwd)
- Tool now properly tracks upload ownership

## [0.10.0] - Previous version
- Initial release with upload functionality