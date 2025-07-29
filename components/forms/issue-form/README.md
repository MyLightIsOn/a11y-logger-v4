# Issue Form Component

## Assessment Relationship Handling

The issue form deals with a complex relationship with assessments. Here's how it works:

### Data Structure

- When an issue is fetched from the database, the `assessment` field may be:
  - A string (the assessment's `documentId`)
  - An object (the full assessment object)

- When submitting an issue:
  - The backend expects a string `assessmentId` to establish the relationship
  - For backward compatibility, we also include the `assessment` field with the same string ID

### Implementation Notes

- The form maintains a `selectedAssessmentId` state variable that always holds the string ID
- When loading an existing issue, we determine the assessment ID from either:
  - The `assessmentId` field (if available)
  - The `assessment` field (parsing it as either string or object)
- On submission, we include both fields to ensure compatibility

### Strapi Relationship Background

This implementation accommodates Strapi's relationship handling where:

1. When querying with relationships, Strapi populates related fields with full objects
2. When submitting, Strapi expects string IDs for relationships

This pattern may be useful in other form components that deal with related entities.
