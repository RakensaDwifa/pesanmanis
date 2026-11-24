"use client";

import React, { Component } from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface SentryLike {
  captureException: (error: Error, context?: { extra?: unknown }) => void;
}

interface WindowWithSentry extends Window {
  Sentry?: SentryLike;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    const sentry =
      typeof window !== "undefined"
        ? (window as WindowWithSentry).Sentry
        : undefined;
    if (sentry) {
      sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-5">
          <div className="max-w-md w-full px-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="font-heading text-headline-md text-on-surface mb-2">
              Terjadi Kesalahan
            </h1>
            <p className="text-body-md text-on-surface-variant mb-6">
              Maaf, terjadi kesalahan yang tidak terduga. Tim kami sudah diberitahu.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white text-label-lg font-semibold rounded-full shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </button>
              <Link
                href="/"
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full text-label-lg font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
              >
                <Home className="h-4 w-4" />
                Kembali ke Beranda
              </Link>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-8 text-left text-xs text-on-surface-variant">
                <summary className="cursor-pointer mb-2">Detail Error (Development)</summary>
                <pre className="bg-surface-container-low p-4 rounded-xl overflow-auto max-h-64">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
