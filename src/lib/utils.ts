export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const phone = value.trim().startsWith("+")
    ? "+" + digits
    : digits.length === 10 || digits.length === 11
      ? "+55" + digits
      : "+" + digits;
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    throw new Error(
      "Informe um telefone com DDD. Para outros países, comece com + e o código do país.",
    );
  return phone;
}
export function displayPhone(phone: string) {
  const p = phone.replace(/\D/g, "");
  if (p.startsWith("55") && p.length === 13)
    return "(" + p.slice(2, 4) + ") " + p.slice(4, 9) + "-" + p.slice(9);
  if (p.startsWith("55") && p.length === 12)
    return "(" + p.slice(2, 4) + ") " + p.slice(4, 8) + "-" + p.slice(8);
  return phone;
}
export function searchText(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}
export function initials(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();
}
export function localDateInput(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
export function humanError(e: unknown): string {
  const message =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e && "message" in e
        ? String(e.message)
        : "Não foi possível concluir. Tente novamente.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(message))
    return "Sem conexão com o serviço. Seus dados não foram confirmados. Tente novamente.";
  if (/JWT|refresh.token|not authenticated/i.test(message))
    return "Sua sessão terminou. Entre novamente.";
  return message;
}
export function vCard(name: string, phone: string) {
  const escape = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  return (
    "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:" +
    escape(name) +
    "\r\nTEL;TYPE=CELL:" +
    phone +
    "\r\nEND:VCARD\r\n"
  );
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
