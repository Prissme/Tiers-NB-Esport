"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";

type ReloadingImageProps = ComponentProps<"img"> & {
  maxRetries?: number;
};

export default function ReloadingImage({
  src,
  onError,
  maxRetries = 2,
  ...props
}: ReloadingImageProps) {
  const [attempts, setAttempts] = useState(0);

  const resolvedSrc = useMemo(() => {
    if (!src) return src;
    if (attempts === 0) return src;
    const joiner = src.includes("?") ? "&" : "?";
    return `${src}${joiner}reload=${attempts}`;
  }, [attempts, src]);

  return (
    <img
      {...props}
      src={resolvedSrc}
      onError={(event) => {
        if (attempts < maxRetries) {
          setAttempts((prev) => prev + 1);
        }
        onError?.(event);
      }}
    />
  );
}
