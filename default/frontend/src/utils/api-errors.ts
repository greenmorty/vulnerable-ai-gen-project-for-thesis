/**
 * Responsibility: Normalizes Axios and generic runtime errors into user-facing messages for forms and actions.
 */
import axios from "axios";

import type { ApiErrorResponse } from "../types/api";

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage = "Something went wrong. Please try again.",
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.message;

    if (typeof apiMessage === "string" && apiMessage.length > 0) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

