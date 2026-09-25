export type WeatherErrorCode =
  | "INVALID_COORDINATES"
  | "INVALID_PARAMETERS"
  | "UNSUPPORTED_OPERATION"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "INVALID_PAYLOAD"
  | "HISTORICAL_RANGE_UNAVAILABLE"
  | "NOT_FOUND";

export interface SanitizedWeatherError {
  code: WeatherErrorCode;
  message: string;
  statusCode: number;
  isRetryable: boolean;
  retryAfterSeconds?: number;
  provider?: string;
}

/**
 * Structured typed error for all weather operations.
 * Enforces sanitization at boundaries so internal URLs, tokens, or stacks
 * are never exposed to clients or logged unsafely.
 */
export class WeatherError extends Error {
  readonly code: WeatherErrorCode;
  readonly statusCode: number;
  readonly isRetryable: boolean;
  readonly retryAfterSeconds?: number;
  readonly provider?: string;
  readonly details?: unknown;

  constructor(options: {
    message: string;
    code: WeatherErrorCode;
    statusCode: number;
    isRetryable?: boolean;
    retryAfterSeconds?: number;
    provider?: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "WeatherError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isRetryable = options.isRetryable ?? false;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.provider = options.provider;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, WeatherError.prototype);
  }

  /**
   * Safe JSON representation for HTTP responses and client presentation.
   */
  toSanitizedJSON(): SanitizedWeatherError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      retryAfterSeconds: this.retryAfterSeconds,
      provider: this.provider,
    };
  }

  static invalidCoordinates(
    message = "Coordinates out of bounds (-90..90, -180..180)"
  ): WeatherError {
    return new WeatherError({
      message,
      code: "INVALID_COORDINATES",
      statusCode: 400,
      isRetryable: false,
    });
  }

  static invalidParameters(message: string, details?: unknown): WeatherError {
    return new WeatherError({
      message,
      code: "INVALID_PARAMETERS",
      statusCode: 400,
      isRetryable: false,
      details,
    });
  }

  static unsupported(provider: string, operation: string): WeatherError {
    return new WeatherError({
      message: `Operation '${operation}' is not supported by provider '${provider}'`,
      code: "UNSUPPORTED_OPERATION",
      statusCode: 501,
      provider,
      isRetryable: false,
    });
  }

  static providerTimeout(provider: string, timeoutMs: number): WeatherError {
    return new WeatherError({
      message: `Weather provider '${provider}' timed out after ${timeoutMs}ms`,
      code: "PROVIDER_TIMEOUT",
      statusCode: 504,
      provider,
      isRetryable: true,
    });
  }

  static providerUnavailable(
    provider: string,
    statusCode = 502,
    details?: unknown
  ): WeatherError {
    return new WeatherError({
      message: `Weather provider '${provider}' responded with an upstream error (${statusCode})`,
      code: "PROVIDER_UNAVAILABLE",
      statusCode: statusCode >= 500 && statusCode < 600 ? statusCode : 502,
      provider,
      isRetryable: true,
      details,
    });
  }

  static rateLimited(
    provider: string,
    retryAfterSeconds?: number
  ): WeatherError {
    const delayNotice = retryAfterSeconds
      ? ` Please retry after ${retryAfterSeconds}s.`
      : "";
    return new WeatherError({
      message: `Weather provider '${provider}' rate limit exceeded.${delayNotice}`,
      code: "RATE_LIMITED",
      statusCode: 429,
      provider,
      isRetryable: true,
      retryAfterSeconds,
    });
  }

  static networkError(provider: string, cause?: unknown): WeatherError {
    return new WeatherError({
      message: `Network communication failure with provider '${provider}'`,
      code: "NETWORK_ERROR",
      statusCode: 502,
      provider,
      isRetryable: true,
      cause,
    });
  }

  static invalidPayload(provider: string, reason: string): WeatherError {
    return new WeatherError({
      message: `Weather provider '${provider}' returned an unexpected or malformed payload: ${reason}`,
      code: "INVALID_PAYLOAD",
      statusCode: 502,
      provider,
      isRetryable: false,
    });
  }

  static historicalRangeUnavailable(
    provider: string,
    startDate: string,
    endDate: string,
    reason?: string
  ): WeatherError {
    const suffix = reason ? `: ${reason}` : "";
    return new WeatherError({
      message: `Historical weather data from ${startDate} to ${endDate} is unavailable from provider '${provider}'${suffix}`,
      code: "HISTORICAL_RANGE_UNAVAILABLE",
      statusCode: 400,
      provider,
      isRetryable: false,
    });
  }
}
