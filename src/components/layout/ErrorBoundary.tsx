import { Component, type ReactNode } from 'react';
import { Button, Card } from '@/components/ui';

/** Keeps the sidebar usable if one page crashes, instead of blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    // Navigating to another page or role clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card className="p-6">
        <h2 className="font-semibold">This page hit a problem</h2>
        <p className="mt-2 text-sm text-slate-500">{this.state.error.message}</p>
        <div className="mt-4"><Button secondary onClick={() => this.setState({ error: null })}>Try again</Button></div>
      </Card>
    );
  }
}
