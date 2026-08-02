/**
 * Official OS brand logos as inline SVGs. Vector-perfect at every size,
 * no external image dependency, no next/image config, no CORS. Colors
 * follow each vendor's brand guidelines so cards read as authentic
 * platform representatives.
 */

import type { SVGProps } from "react";
type LogoProps = SVGProps<SVGSVGElement>;

export function WindowsLogo({ className, ...rest }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <path
        fill="#00A4EF"
        d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"
      />
    </svg>
  );
}

export function AppleLogo({ className, ...rest }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <path
        fill="#111"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}

export function IosLogo({ className, ...rest }: LogoProps) {
  // Uses the Apple mark since iOS is officially represented by it.
  return <AppleLogo className={className} {...rest} />;
}

export function AndroidLogo({ className, ...rest }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <path
        fill="#3DDC84"
        d="M17.523 15.3414c-.5665 0-1.026-.4595-1.026-1.0261 0-.5665.4595-1.0261 1.026-1.0261.5666 0 1.0261.4596 1.0261 1.0261 0 .5666-.4595 1.0261-1.0261 1.0261m-11.046 0c-.5665 0-1.0261-.4595-1.0261-1.0261 0-.5665.4596-1.0261 1.0261-1.0261.5666 0 1.0261.4596 1.0261 1.0261 0 .5666-.4595 1.0261-1.0261 1.0261m11.4145-6.02l2.0522-3.5548a.4161.4161 0 0 0-.1521-.5676.4157.4157 0 0 0-.5676.1521l-2.0784 3.6c-1.5904-.7259-3.3763-1.1298-5.2664-1.1298s-3.676.4039-5.2665 1.1298L4.7369 5.3521a.4157.4157 0 0 0-.5676-.1521.4163.4163 0 0 0-.1521.5676l2.0522 3.5548C2.4952 11.1348.4174 14.4571 0 18.3554h24c-.4174-3.8983-2.4952-7.2206-6.1085-9.014"
      />
    </svg>
  );
}
