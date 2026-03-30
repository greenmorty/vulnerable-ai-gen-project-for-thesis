/**
 * Responsibility: Extends Axios request config typing with auth-refresh control flags used by the session layer.
 */
import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    _retry?: boolean;
  }
}

