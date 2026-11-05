/**
 * Brazilian Ecommerce Data Validation Utilities
 * Validates CPF (Modulo 11), Full Name, Email, Phone/WhatsApp, and Credit Card (Luhn)
 */

// 1. Algoritmo Oficial do Módulo 11 para Validação de CPF
export function validateCPF(rawCpf: string): boolean {
  const cpf = rawCpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;

  // Rejeita sequências de números repetidos conhecidas (000..., 111..., etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9), 10)) return false;

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

// 2. Validação de Nome Completo
export function validateFullName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 5) {
    return { valid: false, error: 'O nome completo deve conter no mínimo 5 caracteres.' };
  }

  // Apenas letras, acentos, hífens e espaços
  const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: 'O nome não pode conter números ou símbolos especiais.' };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { valid: false, error: 'Por favor, digite seu nome e sobrenome.' };
  }

  if (parts[0].length < 2) {
    return { valid: false, error: 'O primeiro nome está muito curto.' };
  }

  if (parts[parts.length - 1].length < 2) {
    return { valid: false, error: 'O sobrenome está muito curto.' };
  }

  // Rejeita palavras aleatórias ou testes óbvios
  const lower = trimmed.toLowerCase();
  const blacklisted = ['teste teste', 'asdf asdf', 'nome sobrenome', 'fulano de tal', 'admin admin', '123 123'];
  if (blacklisted.includes(lower)) {
    return { valid: false, error: 'Por favor, informe seu nome e sobrenome reais para emissão do pedido.' };
  }

  return { valid: true };
}

// 3. Validação de E-mail
export function validateEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 5) return false;
  // Regex oficial RFC para validação de e-mail com TLD válido
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

// 4. Validação de Telefone / WhatsApp Brasileiro
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, // SP
  21, 22, 24, // RJ
  27, 28, // ES
  31, 32, 33, 34, 35, 37, 38, // MG
  41, 42, 43, 44, 45, 46, // PR (43 é Arapongas/Londrina)
  47, 48, 49, // SC
  51, 53, 54, 55, // RS
  61, 62, 64, 65, 66, 67, // DF, GO, MT, MS
  68, 69, // AC, RO
  71, 73, 74, 75, 77, // BA
  79, // SE
  81, 87, // PE
  82, // AL
  83, // PB
  84, // RN
  85, 88, // CE
  86, 89, // PI
  91, 93, 94, // PA
  92, 97, // AM
  95, // RR
  96, // AP
  98, 99, // MA
  63, // TO
]);

export function validatePhone(phoneRaw: string): { valid: boolean; error?: string } {
  const phone = phoneRaw.replace(/\D/g, '');

  if (phone.length < 10 || phone.length > 11) {
    return { valid: false, error: 'O telefone deve conter DDD + número (10 ou 11 dígitos).' };
  }

  // Rejeita sequências repetidas (0000000000, 11111111111, etc.)
  if (/^(\d)\1+$/.test(phone)) {
    return { valid: false, error: 'Número de telefone inválido (dígitos repetidos).' };
  }

  const ddd = parseInt(phone.substring(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return { valid: false, error: `O DDD (${ddd}) informado não existe no Brasil.` };
  }

  // Celulares no Brasil possuem 11 dígitos e o primeiro dígito após o DDD deve ser '9'
  if (phone.length === 11) {
    const ninthDigit = phone.charAt(2);
    if (ninthDigit !== '9') {
      return { valid: false, error: 'Celulares com 11 dígitos devem começar com 9 após o DDD.' };
    }
  }

  return { valid: true };
}

// 5. Validação de Cartão de Crédito com Algoritmo de Luhn (Mod 10)
export function validateLuhn(cardNumberRaw: string): boolean {
  const card = cardNumberRaw.replace(/\D/g, '');
  if (card.length < 13 || card.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = card.length - 1; i >= 0; i--) {
    let digit = parseInt(card.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

// 6. Validação de Validade do Cartão
export function validateCardExpiry(exp: string): { valid: boolean; error?: string } {
  const clean = exp.replace(/\D/g, '');
  if (clean.length !== 4) {
    return { valid: false, error: 'Informe a validade no formato MM/AA (ex: 12/28).' };
  }

  const month = parseInt(clean.substring(0, 2), 10);
  const year2Digits = parseInt(clean.substring(2, 4), 10);

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Mês de validade inválido (deve ser entre 01 e 12).' };
  }

  const now = new Date();
  const currentYear2Digits = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1; // 1-12

  if (year2Digits < currentYear2Digits) {
    return { valid: false, error: 'Este cartão de crédito já está vencido.' };
  }

  if (year2Digits === currentYear2Digits && month < currentMonth) {
    return { valid: false, error: 'Este cartão de crédito já está vencido.' };
  }

  if (year2Digits > currentYear2Digits + 15) {
    return { valid: false, error: 'Ano de validade além do limite permitido.' };
  }

  return { valid: true };
}
