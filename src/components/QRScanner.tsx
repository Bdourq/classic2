import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const mountedRef = useRef(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const scanner = new Html5QrcodeScanner(
      'qr-scanner-container',
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear().catch(() => {});
        onScan(decodedText);
      },
      () => { /* ignore scan errors */ }
    );

    scannerRef.current = scanner;

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(26, 10, 3, 0.85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="cafe-card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
        <p style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--brown-800)',
          marginBottom: '1rem',
        }}>
          📷 وجّه الكاميرا نحو رمز QR للعميل
        </p>

        <div id="qr-scanner-container" style={{ width: '100%', direction: 'ltr' }} />

        <button
          className="cafe-btn-outline"
          style={{ marginTop: '1rem' }}
          onClick={onClose}
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
