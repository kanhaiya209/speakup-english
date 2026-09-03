import React from "react"
import { clsx } from "clsx"

export const ShimmerButton = React.forwardRef(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "2px",
      shimmerDuration = "3s",
      borderRadius = "12px",
      background = "rgba(99, 102, 241, 1)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={{
          "--spread": "120deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        }}
        className={clsx(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden border border-white/10 px-6 py-3 whitespace-nowrap text-white font-semibold [border-radius:var(--radius)]",
          "transform-gpu transition-all duration-300 ease-in-out active:translate-y-px hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* Glow halo aura (strong outer glow) */}
        <div className="absolute inset-0 -z-30 overflow-visible [container-type:size]">
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1]">
            <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] blur-md opacity-80" />
          </div>
        </div>

        {/* Sharp border beam */}
        <div className="absolute inset-0 -z-20 overflow-visible [container-type:size]">
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1]">
            <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
          </div>
        </div>

        {/* Content */}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>

        {/* Specular inset highlight */}
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_6px_rgba(0,0,0,0.4)] transition-all duration-300" />

        {/* Inner backdrop fill */}
        <div className="absolute [inset:var(--cut)] -z-10 [border-radius:calc(var(--radius)-var(--cut))] [background:var(--bg)]" />

        {/* Keyframes are scoped to this component (hoisted + deduped by React) */}
        <style href="shimmer-button-keyframes" precedence="default">{`
          @keyframes shimmer-slide { to { transform: translate(calc(100cqw - 100%), 0); } }
          @keyframes spin-around {
            0% { transform: translateZ(0) rotate(0deg); }
            100% { transform: translateZ(0) rotate(360deg); }
          }
          .animate-shimmer-slide { animation: shimmer-slide var(--speed, 3s) ease-in-out infinite alternate; }
          .animate-spin-around { animation: spin-around var(--speed, 3s) infinite linear; }
        `}</style>
      </button>
    )
  }
)
ShimmerButton.displayName = "ShimmerButton"
