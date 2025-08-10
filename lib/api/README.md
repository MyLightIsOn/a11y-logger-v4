# API Services

This directory contains the API service layer for making HTTP requests to the backend API endpoints. The architecture is designed to be modular, reusable, and easily extensible for new entities.

## Architecture

### Base Service (`base.ts`)
- `BaseApiService`: Abstract base class providing common HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Automatic authentication token injection via Supabase
- Consistent error handling and response formatting
- Request/response interceptors for common functionality

### Service Types (`types.ts`)
- Common interfaces for pagination, sorting, and filtering
- Generic request/response wrappers
- Utility types for Create/Update operations

### Entity Services
Each entity (Projects, Assessments, Issues, etc.) has its own service class that extends `BaseApiService`:
- `ProjectsApiService` - CRUD operations for projects
- More services to be added...

## Usage

### Basic Usage
