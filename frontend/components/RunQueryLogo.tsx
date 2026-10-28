import React from 'react';

interface RunQueryLogoProps {
  size?: number;
  className?: string;
}

export const RunQueryLogo: React.FC<RunQueryLogoProps> = ({ size = 20, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Background Frame */}
      <rect width="32" height="32" rx="7" fill="#0A0A0A" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="#262626" />

      {/* Database Disks (Technical Stack) */}
      <ellipse cx="16" cy="9" rx="7.5" ry="2.75" stroke="#737373" strokeWidth="1.5" />
      <path
        d="M8.5 9V14.5C8.5 16.02 11.86 17.25 16 17.25C20.14 17.25 23.5 16.02 23.5 14.5V9"
        stroke="#737373"
        strokeWidth="1.5"
      />
      <path
        d="M8.5 15V20.5C8.5 22.02 11.86 23.25 16 23.25C20.14 23.25 23.5 22.02 23.5 20.5V15"
        stroke="#737373"
        strokeWidth="1.5"
      />

      {/* Query Run Execution Terminal Chevron */}
      <path
        d="M13 18.5L16.5 21L13 23.5"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="21" r="1.25" fill="#3B82F6" />
    </svg>
  );
};
