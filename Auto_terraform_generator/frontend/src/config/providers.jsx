/**
 * Provider display configuration.
 * To add a new cloud provider, add an entry here — the UI picks it up automatically.
 * Keys must match the `providerKey` field in your base.json schemas.
 */
export const PROVIDERS = {
  aws: {
    key: "aws",
    label: "Amazon Web Services",
    shortLabel: "AWS",
    color: "#FF9900",
    bgColor: "rgba(255,153,0,0.10)",
    borderColor: "rgba(255,153,0,0.35)",
    // Official AWS smile-arrow logo (simplified SVG path)
    logo: (
      <svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 40 }}>
        <text x="0" y="36" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="32" fill="#FF9900">AWS</text>
      </svg>
    ),
  },
  gcp: {
    key: "gcp",
    label: "Google Cloud Platform",
    shortLabel: "GCP",
    color: "#4285F4",
    bgColor: "rgba(66,133,244,0.10)",
    borderColor: "rgba(66,133,244,0.35)",
    logo: (
      <svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 40 }}>
        <text x="0" y="36" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="32" fill="#4285F4">GCP</text>
      </svg>
    ),
  },
  azure: {
    key: "azure",
    label: "Microsoft Azure",
    shortLabel: "Azure",
    color: "#0078D4",
    bgColor: "rgba(0,120,212,0.10)",
    borderColor: "rgba(0,120,212,0.35)",
    logo: (
      <svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 40 }}>
        <text x="0" y="36" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="24" fill="#0078D4">Azure</text>
      </svg>
    ),
  },
};

/** Fallback config for any providerKey not listed above */
export function getProvider(key) {
  return (
    PROVIDERS[key] || {
      key,
      label: key.toUpperCase(),
      shortLabel: key.toUpperCase(),
      color: "#6e7681",
      bgColor: "rgba(110,118,129,0.10)",
      borderColor: "rgba(110,118,129,0.35)",
      logo: (
        <svg viewBox="0 0 80 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 64, height: 40 }}>
          <text x="0" y="36" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="28" fill="#6e7681">
            {key.toUpperCase()}
          </text>
        </svg>
      ),
    }
  );
}
