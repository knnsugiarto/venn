import { useEffect, useState } from "react";
import { cardLink } from "@/lib/codec";
import { cardFromProfile, isStorageAvailable, type Profile } from "@/lib/profile";
import { CircleProgress } from "./CircleProgress";
import { QrImage } from "./QrImage";
import { Burst } from "./VennGraphic";

/** Ready state: the code is rebuilt from the circle each time, so it is always fresh for 48 h. */
export function MyCode({ profile, celebrate }: { profile: Profile; celebrate?: boolean }) {
  const [link, setLink] = useState("");
  const [full, setFull] = useState(false);

  useEffect(() => {
    const card = cardFromProfile(profile, Date.now(), window.location.origin);
    setLink(card ? cardLink(card, window.location.origin) : "");
  }, [profile]);

  // Keep the screen awake while the code is showing; harmless if unsupported.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  const alt = `QR code for ${profile.n}'s Venn`;


  return (
    <div className="pb-2">
      <div className="mt-2 flex items-center gap-4">
        <CircleProgress profile={profile} size={120} />
        <div>
          <p className="font-display text-2xl font-medium">{profile.n}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <button onClick={() => setFull(true)} className="relative block w-[200px] shrink-0 rounded-[20px] bg-tile p-2 shadow-[0_8px_30px_-12px_oklch(0.18_0_0/0.25)]" aria-label="Show my code full screen">
          {link && <QrImage text={link} alt={alt} />}
          {celebrate && <Burst />}
        </button>
        <button className="btn-quiet text-left font-medium underline" onClick={() => setFull(true)}>Show my code</button>
      </div>
      {!isStorageAvailable() && <p className="text-sm text-ink-soft">Private browsing: your circle will disappear when you close this tab.</p>}

      {full && (
        <button onClick={() => setFull(false)} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-tile p-4" aria-label="Close full screen code">
          <div className="w-full max-w-[min(92vw,80vh)]"><QrImage text={link} alt={alt} size={1000} /></div>
          <span className="text-ink-soft">Scan with a phone camera · tap to close</span>
        </button>
      )}
    </div>
  );
}
