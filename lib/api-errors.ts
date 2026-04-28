import type { ZodError } from "zod";

function formatPath(path: (string | number)[]) {
  if (path.length === 0) {
    return "root";
  }

  return path
    .map((part) => (typeof part === "number" ? `[${part}]` : part))
    .join(".");
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function createRawPreview(rawText: string, maxLength = 700) {
  const compact = compactWhitespace(rawText);
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength)}...`
    : compact;
}

export function formatZodIssues(error: ZodError, limit = 8) {
  const issues = error.issues.slice(0, limit).map((issue) => {
    const path = formatPath(issue.path);
    return `- ${path}: ${issue.message}`;
  });

  if (error.issues.length > limit) {
    issues.push(`- ... и ещё ${error.issues.length - limit} ошибок`);
  }

  return issues.join("\n");
}

export function buildSchemaErrorMessage(options: {
  title: string;
  error: ZodError;
  rawText: string;
}) {
  const issues = formatZodIssues(options.error);
  const rawPreview = createRawPreview(options.rawText);

  return `${options.title}\n\nПроблемные поля:\n${issues}\n\nФрагмент ответа AI:\n${rawPreview}`;
}
