import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssessmentForm from "./assessment-form";
import axios from "axios";
import { getAllTags } from "@/data/services/tag-service";
import { Assessment } from "@/types/assessment";
import { Project } from "@/types/project";
import { Tag } from "@/types/tag";

// Mock axios and tag service
jest.mock("axios");
jest.mock("@/data/services/tag-service", () => ({
  getAllTags: jest.fn(),
}));

// Mock the UI components
jest.mock("@/components/ui/input", () => ({
  Input: ({
    id,
    value,
    onChange,
    className,
    placeholder,
    required,
    type
  }: {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    placeholder?: string;
    required?: boolean;
    type?: string;
  }) => (
    <input
      id={id}
      data-testid={`input-${id}`}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      required={required}
      type={type}
    />
  ),
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    id,
    value,
    onChange,
    className,
    placeholder,
    rows
  }: {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    placeholder?: string;
    rows?: number;
  }) => (
    <textarea
      id={id}
      data-testid={`textarea-${id}`}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      rows={rows}
    />
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    type,
    variant,
    onClick,
    disabled,
    className
  }: {
    children: React.ReactNode;
    type?: "button" | "submit" | "reset";
    variant?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      type={type}
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/multi-select", () => ({
  MultiSelect: ({
    id,
    options,
    selected,
    onChangeAction,
    placeholder,
    className
  }: {
    id?: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChangeAction: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <div data-testid={`mock-multi-select-${id}`} className={className}>
      <select
        id={id}
        data-testid={`select-${id}`}
        multiple
        // Convert selected array to string[] for HTML select compatibility
        value={selected}
        onChange={(e) => {
          const selectedOptions = Array.from(e.target.selectedOptions).map(
            (option) => option.value
          );
          onChangeAction(selectedOptions);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span>{placeholder}</span>
    </div>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({
    children
  }: {
    children: React.ReactNode;
  }) => <>{children}</>,
  SelectItem: ({
    value,
    children
  }: {
    value: string;
    children: React.ReactNode;
  }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({
    children,
    className
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  SelectValue: ({
    placeholder
  }: {
    placeholder: string;
  }) => (
    <option value={placeholder}>{placeholder}</option>
  ),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  X: () => <span data-testid="x-icon">X</span>,
  SaveIcon: () => <span data-testid="save-icon">Save</span>,
}));

describe("AssessmentForm", () => {
  const mockOnSubmit = jest.fn<Promise<void>, [any]>().mockResolvedValue(undefined);
  const mockOnCancel = jest.fn<void, []>();

  const mockProjects: Project[] = [
    { documentId: "1", name: "Project 1" },
    { documentId: "2", name: "Project 2" },
  ];

  const mockTags: Tag[] = [
    { documentId: "1", label: "Tag 1" },
    { documentId: "2", label: "Tag 2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.get as jest.Mock).mockResolvedValue({ data: mockProjects });
    (getAllTags as jest.Mock).mockResolvedValue(mockTags);
  });

  it("renders the form correctly for creating a new assessment", async () => {
    render(<AssessmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Check that the form title is correct
    expect(screen.getByText("Create New Assessment")).toBeInTheDocument();

    // Check that form fields are rendered
    expect(screen.getByTestId("input-name")).toBeInTheDocument();
    expect(screen.getByTestId("textarea-description")).toBeInTheDocument();
    expect(screen.getByTestId("mock-multi-select-project")).toBeInTheDocument();
    expect(screen.getByTestId("mock-multi-select-tags")).toBeInTheDocument();

    // Check that buttons are rendered
    expect(screen.getByText(/Cancel/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save/ })).toBeInTheDocument();

    // Wait for projects and tags to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/projects");
      expect(getAllTags).toHaveBeenCalled();
    });
  });

  it("renders the form correctly for editing an existing assessment", async () => {
    const mockAssessment: Assessment = {
      documentId: "1",
      name: "Test Assessment",
      description: "Test Description",
      guidelines: "wcag 2.1 AA",
      projects: [{ documentId: "1", name: "Project 1" }],
      tags: [{ documentId: "1", label: "Tag 1" }],
      issues: [],
    };

    render(
      <AssessmentForm
        assessment={mockAssessment}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    // Check that the form title is correct
    expect(screen.getByText("Edit Assessment")).toBeInTheDocument();

    // Check that form fields are pre-filled
    const nameInput = screen.getByTestId("input-name");
    const descriptionTextarea = screen.getByTestId("textarea-description");

    expect(nameInput).toHaveValue("Test Assessment");
    expect(descriptionTextarea).toHaveValue("Test Description");

    // Wait for projects and tags to load
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/projects");
      expect(getAllTags).toHaveBeenCalled();
    });
  });

  it("submits the form with correct data", async () => {
    render(<AssessmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill out the form
    const nameInput = screen.getByTestId("input-name");
    const descriptionInput = screen.getByTestId("textarea-description");

    await userEvent.type(nameInput, "New Assessment");
    await userEvent.type(descriptionInput, "New Description");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Save/ });
    await userEvent.click(submitButton);

    // Check that onSubmit was called with the correct data
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Assessment",
          description: "New Description",
          projects: [],
          tags: [],
        }),
      );
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    render(<AssessmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText(/Cancel/);
    await userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("displays error message when form submission fails", async () => {
    mockOnSubmit.mockRejectedValueOnce(new Error("Submission failed"));

    render(<AssessmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill out the form
    const nameInput = screen.getByTestId("input-name");
    await userEvent.type(nameInput, "New Assessment");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Save/ });
    await userEvent.click(submitButton);

    // Check that error message is displayed
    await waitFor(() => {
      expect(
        screen.getByText("Failed to save assessment. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("displays loading state during form submission", async () => {
    // Create a promise that we can resolve manually
    let resolveSubmit!: (value: void) => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    mockOnSubmit.mockReturnValueOnce(submitPromise);

    render(<AssessmentForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill out the form
    const nameInput = screen.getByTestId("input-name");
    await userEvent.type(nameInput, "New Assessment");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Save/ });
    await userEvent.click(submitButton);

    // Check that loading state is displayed
    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    // Resolve the promise to complete the submission
    resolveSubmit!(undefined);

    // Check that loading state is removed
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Save/ })).toBeInTheDocument();
    });
  });
});
