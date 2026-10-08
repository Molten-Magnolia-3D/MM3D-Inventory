import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

const READER_ID = "mm3d-camera-reader";

export default function CameraScan({
  onCode,
  onClose,
}: {
  onCode: (code: string) => void;
  onClose: () => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handled = useRef(false);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: (viewfinderWidth, viewfinderHeight) => ({
              width: Math.max(180, Math.floor(viewfinderWidth * 0.86)),
              height: Math.max(90, Math.floor(viewfinderHeight * 0.22)),
            }),
          },
          (decoded) => {
            if (handled.current || cancelled) return;
            const text = decoded.trim();
            if (!text) return;
            handled.current = true;
            onCodeRef.current(text);
          },
          () => undefined,
        );
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(
          /NotAllowedError|Permission|denied/i.test(message)
            ? "Camera permission was denied. Allow camera access for this site, or type the barcode instead."
            : "Could not open the camera. Type the barcode in the top box instead.",
        );
      }
    })();

    return () => {
      cancelled = true;
      const running = scannerRef.current;
      scannerRef.current = null;
      if (running?.isScanning) {
        void running.stop().then(() => running.clear()).catch(() => undefined);
      } else {
        try {
          running?.clear();
        } catch {
          /* already torn down */
        }
      }
    };
  }, []);

  return (
    <div className="cam-overlay" role="dialog" aria-label="Scan a barcode with the camera">
      <div className="cam-overlay-head">
        <div>
          <strong>Scan a label</strong>
          <p>Point at a Code 128 bar or QR. USB scanners still type into the top box.</p>
        </div>
        <button type="button" className="btn secondary" onClick={onClose}>
          Close
        </button>
      </div>
      {error && <div className="danger-banner cam-overlay-error">{error}</div>}
      <div id={READER_ID} className="cam-reader" />
    </div>
  );
}
