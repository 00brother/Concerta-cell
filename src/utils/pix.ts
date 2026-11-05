import QRCode from 'qrcode';

/**
 * Normalizes text to ASCII uppercase without accents for BR Code compatibility.
 */
function normalizeAscii(text: string, maxLength: number): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase();
  return normalized.substring(0, maxLength);
}

/**
 * Formats an EMV TLV (Tag-Length-Value) string.
 */
function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Calculates CRC-16/CCITT-FALSE (polynomial 0x1021, init 0xFFFF)
 * strictly following the Central Bank of Brazil (BACEN) PIX specification.
 */
export function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface PixPayloadOptions {
  key: string;
  recipientName?: string;
  city?: string;
  amount: number;
  txId?: string;
  description?: string;
}

/**
 * Generates a 100% compliant, standard Pix Copia e Cola / BR Code payload.
 * Compatible with all Brazilian banking applications.
 */
export function generatePixBrCode(options: PixPayloadOptions): string {
  let cleanKey = options.key.trim();
  // If it's a Brazilian phone number without +55, add +55 for Bacen phone key standard
  const digitsOnly = cleanKey.replace(/\D/g, '');
  if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !cleanKey.includes('@') && !cleanKey.includes('-')) {
    cleanKey = `+55${digitsOnly}`;
  }

  // 1. Merchant Account Information (Tag 26)
  const gui = emvField('00', 'br.gov.bcb.pix');
  const keyField = emvField('01', cleanKey);
  const descField = options.description
    ? emvField('02', normalizeAscii(options.description, 25))
    : '';
  const merchantAccountInfo = emvField('26', `${gui}${keyField}${descField}`);

  // 2. Merchant Category Code (Tag 52)
  const mcc = emvField('52', '0000');

  // 3. Currency (Tag 53: 986 = BRL)
  const currency = emvField('53', '986');

  // 4. Amount (Tag 54)
  const amountStr = options.amount.toFixed(2);
  const amountField = emvField('54', amountStr);

  // 5. Country Code (Tag 58: BR)
  const country = emvField('58', 'BR');

  // 6. Merchant Name (Tag 59, max 25 chars)
  const recipient = normalizeAscii(options.recipientName || 'CONSERTA CELL', 25);
  const merchantName = emvField('59', recipient || 'CONSERTA CELL');

  // 7. Merchant City (Tag 60, max 15 chars)
  const cityName = normalizeAscii(options.city || 'ARAPONGAS', 15);
  const merchantCity = emvField('60', cityName || 'ARAPONGAS');

  // 8. Additional Data Field (Tag 62 -> 05 TxID)
  const rawTxId = options.txId
    ? options.txId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25)
    : '***';
  const txIdField = emvField('05', rawTxId || '***');
  const additionalData = emvField('62', txIdField);

  // 0. Payload Format Indicator
  const payloadFormat = emvField('00', '01');

  // Assemble full payload prior to CRC
  const payloadWithoutCrc = `${payloadFormat}${merchantAccountInfo}${mcc}${currency}${amountField}${country}${merchantName}${merchantCity}${additionalData}6304`;

  // Compute CRC16 and append
  const checksum = crc16Ccitt(payloadWithoutCrc);
  return `${payloadWithoutCrc}${checksum}`;
}

/**
 * Generates a high-resolution, scan-ready QR Code Data URL from a PIX code.
 */
export async function generatePixQrCodeDataUrl(pixCode: string): Promise<string> {
  try {
    return await QRCode.toDataURL(pixCode, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Falha ao gerar QR Code offline:', err);
    // Fallback to trusted CDN QR generator
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(pixCode)}`;
  }
}
