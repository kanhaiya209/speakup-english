"use client";
import React, { useEffect, useRef } from "react";

export const BackgroundBeams = ({ className }) => {
  const beamsRef = useRef(null);

  return (
    <div
      ref={beamsRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="beam1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="beam2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="20%" cy="20%" rx="40%" ry="40%" fill="url(#beam1)" />
        <ellipse cx="80%" cy="80%" rx="40%" ry="40%" fill="url(#beam2)" />
        <ellipse cx="80%" cy="20%" rx="30%" ry="30%" fill="url(#beam1)" />
      </svg>
    </div>
  );
};