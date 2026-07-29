"use client";

import Image from "next/image";
import { useState } from "react";

type TeamCrestProps = {
  teamName: string;
  crestUrl?: string | null;
  size?: number;
};

function getInitials(teamName: string) {
  const words = teamName.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  return `${firstWord.charAt(0)}${lastWord.charAt(0)}`.toUpperCase();
}

export function TeamCrest({ teamName, crestUrl, size = 48 }: TeamCrestProps) {
  const [failedCrestUrl, setFailedCrestUrl] = useState<string | null>(null);

  const imageFailed = Boolean(crestUrl) && failedCrestUrl === crestUrl;

  if (!crestUrl || imageFailed) {
    return (
      <span
        className="team-crest team-crest-fallback"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        aria-label={`${teamName} crest unavailable`}
        role="img"
      >
        {getInitials(teamName)}
      </span>
    );
  }

  return (
    <span
      className="team-crest"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <Image
        className="team-crest-image"
        src={crestUrl}
        alt={`${teamName} crest`}
        width={size}
        height={size}
        unoptimized
        onError={() => setFailedCrestUrl(crestUrl)}
      />
    </span>
  );
}
