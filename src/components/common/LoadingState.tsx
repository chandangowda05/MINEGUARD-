import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
