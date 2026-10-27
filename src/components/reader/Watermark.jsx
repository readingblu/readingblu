import { useId } from 'react'

export default function Watermark({ text }) {
  const patternId = `wm${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const textProps = {
    fontFamily: 'Nunito, sans-serif',
    fontSize: 14,
    fontWeight: 800,
  }

  return (
    <svg aria-hidden="true" className="absolute inset-0 z-10 h-full w-full select-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={patternId} width="600" height="170" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <text x="10" y="40" fill="#0b1f4b" fillOpacity="0.14" {...textProps}>
            {text}
          </text>
          <text x="11" y="41" fill="#ffffff" fillOpacity="0.14" {...textProps}>
            {text}
          </text>
          <text x="300" y="125" fill="#0b1f4b" fillOpacity="0.14" {...textProps}>
            {text}
          </text>
          <text x="301" y="126" fill="#ffffff" fillOpacity="0.14" {...textProps}>
            {text}
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  )
}