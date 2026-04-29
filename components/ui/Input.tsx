import { useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

/**
 * Labeled text input with auto-generated id so the label and the input are
 * properly associated for screen readers. The previous version of this file
 * rendered ONLY the label (no <input>) which silently broke every consumer.
 */
export default function Input({ label, id, className, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className="mb-4">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium mb-1.5"
        style={{ color: 'var(--t3)' }}
      >
        {label}
      </label>
      <input
        id={inputId}
        className={
          'w-full px-3 py-2.5 rounded-lg text-sm outline-none ' +
          (className ?? '')
        }
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--t1)',
        }}
        {...props}
      />
    </div>
  )
}
