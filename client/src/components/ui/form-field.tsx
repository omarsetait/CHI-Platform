import { forwardRef, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/status-message";
import { cn } from "@/lib/utils";

interface FormFieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormFieldWrapper({
  label,
  htmlFor,
  error,
  description,
  required,
  children,
  className,
}: FormFieldWrapperProps) {
  const descriptionId = description ? `${htmlFor}-description` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1">
        <Label 
          htmlFor={htmlFor}
          className={cn(error && "text-destructive")}
        >
          {label}
        </Label>
        {required && (
          <span className="text-destructive text-sm" aria-hidden="true">*</span>
        )}
      </div>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {children}
      
      {error && <FieldError message={error} />}
    </div>
  );
}

interface TextInputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
}

export const TextInputField = forwardRef<HTMLInputElement, TextInputFieldProps>(
  ({ label, error, description, required, id, className, ...props }, ref) => {
    const inputId = id || props.name || label.toLowerCase().replace(/\s+/g, "-");
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    
    const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(" ");

    return (
      <FormFieldWrapper
        label={label}
        htmlFor={inputId}
        error={error}
        description={description}
        required={required}
        className={className}
      >
        <Input
          ref={ref}
          id={inputId}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={ariaDescribedBy || undefined}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
          data-testid={`input-${inputId}`}
          {...props}
        />
      </FormFieldWrapper>
    );
  }
);
TextInputField.displayName = "TextInputField";

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  description?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, description, required, id, className, ...props }, ref) => {
    const textareaId = id || props.name || label.toLowerCase().replace(/\s+/g, "-");
    const descriptionId = description ? `${textareaId}-description` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    
    const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(" ");

    return (
      <FormFieldWrapper
        label={label}
        htmlFor={textareaId}
        error={error}
        description={description}
        required={required}
        className={className}
      >
        <Textarea
          ref={ref}
          id={textareaId}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={ariaDescribedBy || undefined}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
          data-testid={`textarea-${textareaId}`}
          {...props}
        />
      </FormFieldWrapper>
    );
  }
);
TextareaField.displayName = "TextareaField";

interface SelectFieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function SelectFieldWrapper({
  label,
  htmlFor,
  error,
  description,
  required,
  children,
  className,
}: SelectFieldWrapperProps) {
  return (
    <FormFieldWrapper
      label={label}
      htmlFor={htmlFor}
      error={error}
      description={description}
      required={required}
      className={className}
    >
      {children}
    </FormFieldWrapper>
  );
}
