export enum ErrorType {
  NETWORK = "NETWORK",
  AUTH = "AUTH",
  VALIDATION = "VALIDATION",
  SERVER = "SERVER",
  UNKNOWN = "UNKNOWN",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly originalError?: unknown;
  public readonly status?: number;

  constructor(
    message: string,
    type: ErrorType,
    originalError?: unknown,
    status?: number
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.originalError = originalError;
    this.status = status;
  }

  static from(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, ErrorType.UNKNOWN, error);
    }

    if (typeof error === "string") {
      return new AppError(error, ErrorType.UNKNOWN, error);
    }

    return new AppError(
      "An unexpected error occurred",
      ErrorType.UNKNOWN,
      error
    );
  }

  public get userMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return "Unable to connect to the server. Please check your internet connection.";
      case ErrorType.AUTH:
        return "Session expired. Please log in again.";
      case ErrorType.FORBIDDEN:
        return "You do not have permission to perform this action.";
      case ErrorType.NOT_FOUND:
        return "The requested resource was not found.";
      case ErrorType.SERVER:
        return "Something went wrong on our end. Please try again later.";
      default:
        return this.message;
    }
  }
}
