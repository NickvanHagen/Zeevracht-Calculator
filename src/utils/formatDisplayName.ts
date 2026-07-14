const nameParticles = new Set(['de', 'den', 'der', 'het', 'op', 'ten', 'ter', 'van', 'vd', 'von']);

const titleCase = (value: string) => {
  if (!value) {
    return '';
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`;
};

const splitNamePart = (part: string) => {
  const normalized = part.toLowerCase();

  if (normalized.startsWith('van') && normalized.length > 3) {
    return ['van', normalized.slice(3)];
  }

  return [normalized];
};

export function formatDisplayName(value: string) {
  const source = value.includes('@') ? value.split('@')[0] : value;
  const parts = source
    .replace(/[_-]+/g, ' ')
    .split(/[\s.]+/)
    .flatMap(splitNamePart)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'TFF gebruiker';
  }

  return parts
    .map((part, index) => (index > 0 && nameParticles.has(part) ? part : titleCase(part)))
    .join(' ');
}
