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
    // Format: MAZZA:ORDER_NUMBER:BOOKING_ID
    return `MAZZA:${orderNumber.replace('#', '')}:${bookingId}`;
  }

  parseQrCodeData(data: string): { orderNumber: string; bookingId: string } | null {
    const parts = data.split(':');
    if (parts.length !== 3 || parts[0] !== 'MAZZA') {
      return null;
    }

    return {
      orderNumber: `#${parts[1]}`,
      bookingId: parts[2],
    };
  }
}
