// Контракт ошибок бэкенда: { error: { code, message } }.
// message — английский текст для логов/разработчика, пользователю показываем
// только русский текст из мэппинга по стабильному code.

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Неверный email или пароль",
  CONFLICT: "Пользователь с таким email уже существует",
  VALIDATION_ERROR: "Проверьте правильность введённых данных",
  INTERNAL_ERROR: "Внутренняя ошибка сервера, попробуйте позже",
};

const FALLBACK_MESSAGE = "Что-то пошло не так, попробуйте позже";

function extractErrorCode(error: unknown): string | undefined {
  const code = (error as { response?: { data?: { error?: { code?: unknown } } } } | null)?.response
    ?.data?.error?.code;
  return typeof code === "string" ? code : undefined;
}

export function getApiErrorMessage(error: unknown): string {
  const code = extractErrorCode(error);
  if (!code) return FALLBACK_MESSAGE;
  return ERROR_MESSAGES[code] ?? FALLBACK_MESSAGE;
}
