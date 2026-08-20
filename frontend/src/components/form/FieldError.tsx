import { cn } from "@/lib/utils";

function FieldError({ className, message }: { className?: string; message: string | undefined }) {
  if (!message) return null;

  return (
    <p data-slot="field-error" className={cn("mt-1.5 text-sm text-destructive", className)}>
      {message}
    </p>
  );
}

export { FieldError };
