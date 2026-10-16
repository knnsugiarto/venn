import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImage({ text, alt, size = 600 }: { text: string; alt: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    // Medium error correction + 2-module quiet zone: scans reliably off a bright screen.
    QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 2, width: size, color: { dark: "#141413", light: "#FFFFFF" } })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [text, size]);
  if (!src) return <div className="aspect-square w-full rounded-xl bg-tile" />;
  return <img src={src} alt={alt} className="block aspect-square w-full" />;
}
