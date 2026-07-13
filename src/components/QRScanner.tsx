import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    // StrictMode-safe: no guard — each effect invocation owns its instance.
    let qrCode: Html5Qrcode | null = null;
    let done = false;

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
          () => {}
        );
      } catch (err) {
        console.warn('[QRScanner] Camera init error:', err);
      }
    }

    start();
    return () => { done = true; qrCode?.stop().catch(() => {}); };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(5,5,5,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(6px)',
    }}>
      <div className="cc-card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>

        {/* عنوان */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
            📷 وجّه الكاميرا نحو رمز QR
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            سيُضاف +1 نقطة تلقائياً
          </p>
        </div>

        <div className="cc-divider" style={{ marginBottom: '1rem' }} />

        {/* حاوية html5-qrcode */}
        <div id="qr-reader" style={{ width: '100%', direction: 'ltr' }} />

        <button className="cc-btn-outline" style={{ marginTop: '1rem' }} onClick={onClose}>
          إلغاء
        </button>
      </div>
    </div>
  );
}
