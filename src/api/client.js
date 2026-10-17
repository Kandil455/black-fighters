// Application API client (Firebase-backed). Replaces the legacy base44 naming.
import { api as indexApi } from './index';

export const api = indexApi;
export const base44 = indexApi;
export default api;
