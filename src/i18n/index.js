import ar from "./ar.json";
import en from "./en.json";
import { useLocale, LocaleProvider } from "@/lib/LocaleContext";

export const messages = { ar, en };
export const useI18n = useLocale;
export { LocaleProvider };
export default messages;
