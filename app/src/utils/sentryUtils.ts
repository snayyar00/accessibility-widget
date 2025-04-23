import React from 'react';
import * as Sentry from '@sentry/react';

/**
 * Creates a Sentry transaction for measuring component performance
 * @param componentName The name of the component being measured
 * @param operation The operation type (e.g., 'component.render')
 * @returns A function to finish the transaction
 */
export function trackComponentPerformance(
  componentName: string,
  operation: string = 'component.render'
): () => void {
  const transaction = Sentry.startTransaction({
    name: `${componentName}`,
    op: operation,
  });

  // Return a function to finish the transaction
  return () => {
    transaction.finish();
  };
}

/**
 * A higher order component that wraps a component with error boundary and performance tracking
 * @param Component The component to wrap
 * @param options Options for the HOC
 * @returns The wrapped component
 */
export function withSentryTracing<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    componentName?: string;
    withErrorBoundary?: boolean;
    fallback?: React.ReactNode;
  } = {}
): React.ComponentType<P> {
  const displayName = options.componentName || Component.displayName || Component.name || 'UnnamedComponent';
  const withErrorBoundary = options.withErrorBoundary ?? true;
  const fallbackElement = options.fallback ?? React.createElement('div', {}, `An error has occurred in ${displayName}`);

  // First wrap with performance monitoring
  let WrappedComponent = Sentry.withProfiler(Component, { name: displayName });

  // Then wrap with error boundary if needed
  if (withErrorBoundary) {
    WrappedComponent = Sentry.withErrorBoundary(WrappedComponent, {
      fallback: fallbackElement,
      showDialog: true,
    });
  }

  return WrappedComponent;
}

/**
 * Creates a custom Sentry span for measuring specific operations
 * @param name The name of the operation
 * @param operation The operation type
 * @returns An object with start and finish methods
 */
export function createSpan(name: string, operation: string = 'custom.operation') {
  let span: any | null = null;

  return {
    start: () => {
      const activeTransaction = Sentry.getCurrentHub()?.getScope()?.getTransaction();
      if (activeTransaction) {
        span = activeTransaction.startChild({
          op: operation,
          description: name,
        });
      }
      return span;
    },
    finish: () => {
      if (span) {
        span.finish();
      }
    },
  };
}

/**
 * Records a breadcrumb in Sentry
 * @param message The message for the breadcrumb
 * @param category The category of the breadcrumb
 * @param level The severity level
 * @param data Additional data to include
 */
export function recordBreadcrumb(
  message: string,
  category: string = 'app.action',
  level: Sentry.Severity = Sentry.Severity.Info,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Captures an exception with additional context
 * @param error The error to capture
 * @param context Additional context for the error
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
} 