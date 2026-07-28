import { AlertCircle, Loader2, RotateCw } from 'lucide-react';

/**
 * Shared states for anything generated from a paper. Every generation can
 * fail (the API errors, the model returns nothing, the paper has no usable
 * text), and the user must always be told which of those happened —
 * silently showing a spinner or a blank panel forever is not an option.
 */

export function GenerationLoading({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-accent-ink" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function GenerationFailed({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertCircle className="w-8 h-8 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-bold text-foreground transition-colors hover:border-accent/40 hover:text-accent-ink"
      >
        <RotateCw className="w-3.5 h-3.5" />
        Try again
      </button>
    </div>
  );
}
