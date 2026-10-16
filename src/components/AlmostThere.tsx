import { useState } from "react";
import { saveProfile, topUpPrompts, withTyped, type Profile } from "@/lib/profile";
import { missingFor } from "@/lib/readiness";
import { NameStep, StepTop, TypedStep } from "./Steps";

/** "Almost there": exactly missingFor(profile) typed prompts, then the name if missing. Saves after each answer. */
export function AlmostThere({ profile, header, onDone, onCancel }: { profile: Profile; header?: React.ReactNode; onDone: (p: Profile) => void; onCancel?: () => void }) {
  const [prompts] = useState(() => topUpPrompts(profile, missingFor(profile)));
  const [needName] = useState(() => !profile.n.trim());
  const [p, setP] = useState(profile);
  const [step, setStep] = useState(0);
  const steps = prompts.length + (needName ? 1 : 0);

  function update(next: Profile) {
    saveProfile(next);
    setP(next);
    if (step + 1 >= steps) onDone(next);
    else setStep(step + 1);
  }

  const prompt = prompts[step];
  return (
    <div className="flex min-h-[70vh] flex-col">
      <StepTop onBack={step > 0 ? () => setStep(step - 1) : onCancel} dots={steps} at={step} />
      {header && step === 0 && <div className="mt-4 rounded-[20px] bg-oat p-4 text-base">{header}</div>}
      {prompt ? (
        <TypedStep key={prompt} prompt={prompt} kicker={`Question ${step + 1} of ${prompts.length}`} initial={p.typed[prompt]?.text ?? ""} onNext={(t) => update(withTyped(p, prompt, t))} />
      ) : (
        <NameStep initial={p.n} onNext={(n) => update({ ...p, n })} />
      )}
    </div>
  );
}
