import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  async generateQrCode(data: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCodeDataUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  generateQrCodeData(orderNumber: string, bookingId: string): string {
    // Return a regular JSON object string
    return JSON.stringify({
      orderNumber,
      bookingId,
    });
  }

  parseQrCodeData(data: string): { orderNumber: string; bookingId: string } | null {
    try {
      const parsed = JSON.parse(data);
      if (parsed && parsed.bookingId && parsed.orderNumber) {
        return {
          orderNumber: parsed.orderNumber,
          bookingId: parsed.bookingId,
        };
      }
    } catch (e) {
      // Fallback for legacy format if needed, or simply return null
    }

    // Legacy format check (MAZZA:ORDER:ID)
    const parts = data.split(':');
    if (parts.length === 3 && parts[0] === 'MAZZA') {
      return {
        orderNumber: `#${parts[1]}`,
        bookingId: parts[2],
      };
    }

    // Check if data is a raw UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(data)) {
      return {
        orderNumber: 'Unknown',
        bookingId: data
      };
    }

    return null;
  }
}
