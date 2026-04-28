import { getMediaUrl } from '../api/matrix'

const COLORS = [
  'bg-red-500','bg-orange-500','bg-amber-500','bg-green-500',
  'bg-teal-500','bg-blue-500','bg-indigo-500','bg-purple-500','bg-pink-500',
]

function colorFor(str = '') {
  let h = 0
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function Avatar({ name = '', avatarUrl = null, size = 10, className = '' }) {
  const px = `w-${size} h-${size}`
  const letter = (name[0] || '?').toUpperCase()
  const src = avatarUrl ? getMediaUrl(avatarUrl) : null

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${px} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  return (
    <div className={`${px} rounded-full flex-shrink-0 flex items-center justify-center
                     text-white font-semibold text-sm select-none ${colorFor(name)} ${className}`}>
      {letter}
    </div>
  )
}
