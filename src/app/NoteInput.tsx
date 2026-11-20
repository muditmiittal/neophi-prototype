export function NoteInput({ value, onChange, lang }: { value: string; onChange: (value: string) => void; lang?: string }) {
  return <textarea className="textarea" rows={2} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your own reason, in your own words" lang={lang} />;
}
