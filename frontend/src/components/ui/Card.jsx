'use client';
// src/components/ui/Card.jsx

export default function Card({
  children,
  className = '',
  padding = true,
  hover = false,
  onClick,
  ...props
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-2xl shadow-sm border border-gray-100',
        padding ? 'p-4' : '',
        hover ? 'hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
