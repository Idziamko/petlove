export const EMAIL_PATTERN = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

export function focusUrlField(id: string) {
  const input = document.getElementById(id);
  if (!(input instanceof HTMLInputElement)) return;
  input.focus();
  input.select();
}

export function isPasswordSecure(touched: boolean | undefined, error: string | undefined, value: string) {
  return Boolean(touched && !error && value);
}
