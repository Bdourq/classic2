import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  // Keep latest callback in a ref so the effect closure doesn't go stale
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    // StrictMode-safe: no mountedRef guard — each effect invocation owns its
    // own Html5Qrcode instance, and cleanup always stops the camera.
    let qrCode: Html5Qrcode | null = null;
    let done = false; // prevent double-fire after unmount

    async function start() {
      try {
        qrCode = new Html5Qrcode('qr-reader');
        await qrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (done) return;
            done = true;
            qrCode?.stop().catch(() => {}).finally(() => onScanRef.current(text));
          },
          () => {} // frame-level decode errors — ignore
        );
      } catch (err) {
        console.warn('[QRScanner] Camera init error:', err);
      }
    }

    start();

    return () => {
      done = true;
      qrCode?.stop().catch(() => {});
    };
  }, []); // intentionally empty — one scanner per mount lifecycle

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(26, 10, 3, 0.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="cafe-card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
        <p style={{
          textAlign: 'center', fontWeight: 700,
          fontSize: '1.1rem', color: 'var(--brown-800)', marginBottom: '1rem',
        }}>
          📷 وجّه الكاميرا نحو رمز QR للعميل
        </p>

        {/* html5-qrcode mounts into this div */}
        <div id="qr-reader" style={{ width: '100%', direction: 'ltr' }} />

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
