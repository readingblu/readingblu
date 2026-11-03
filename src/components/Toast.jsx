export default function Toast({ message }) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))_+_4.5rem)] left-1/2 z-[60] w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-center text-sm font-extrabold text-white shadow-lg md:bottom-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {message}
    </div>
  )
}