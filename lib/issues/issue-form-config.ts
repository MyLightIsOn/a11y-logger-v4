export const issueFormConfig = [
  {
    type: "input",
    field: "title",
    label: "Title",
    subtext: "Provide a short title for the issue",
    placeholder: "Example: Search button not focusable...",
    ariaDescribedBy: "title",
    required: true,
    requiredError: "Issue title is required",
  },
  {
    type: "textarea",
    field: "description",
    label: "Description",
    subtext: " Provide a detailed description of the issue.",
    placeholder:
      "Example: The search button on the homepage is not focusable via keyboard.",
    ariaDescribedBy: "description",
    required: true,
    requiredError: "Issue description is required",
  },
];
