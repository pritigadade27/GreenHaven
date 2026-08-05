/** Inline SVG icon set. */

const paths = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  heart: <path d="M12 20.5 4.2 13a4.8 4.8 0 0 1 6.8-6.8l1 1 1-1a4.8 4.8 0 0 1 6.8 6.8Z" />,
  cart: (
    <>
      <path d="M8 9V6.5a4 4 0 0 1 8 0V9" />
      <path d="M4.8 9h14.4l-1 11.2a1.6 1.6 0 0 1-1.6 1.3H7.4a1.6 1.6 0 0 1-1.6-1.3Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.8 20.5a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-8 5-14 16-15 1 11-5 16-13 16Z" />
      <path d="M9 15c2-3 5-5 8-6" />
    </>
  ),
  drop: <path d="M12 3c3.5 4.2 5.5 7.2 5.5 9.8A5.5 5.5 0 0 1 6.5 12.8C6.5 10.2 8.5 7.2 12 3Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  paw: (
    <>
      <circle cx="8" cy="7.5" r="2" />
      <circle cx="16" cy="7.5" r="2" />
      <circle cx="5" cy="13" r="1.8" />
      <circle cx="19" cy="13" r="1.8" />
      <path d="M12 12c3 0 5 2.4 5 4.6S15 21 12 21s-5-2.2-5-4.4S9 12 12 12Z" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 17.3 6.7 20.2l1.1-6.1L3.4 9.9l6-.8Z" />,
  truck: (
    <>
      <path d="M2 6.5h11v10H2Z" />
      <path d="M13 10h4.2l2.8 3.2v3.3H13Z" />
      <circle cx="6.5" cy="18.5" r="1.8" />
      <circle cx="17" cy="18.5" r="1.8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5.5c0 4.7-3.2 8-8 9.5-4.8-1.5-8-4.8-8-9.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  mail: (
    <>
      <path d="M3 6h18v12H3Z" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
  ),
  pin: (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </>
  ),
  quote: (
    <path d="M9.5 5.5C6.4 7 4.5 9.9 4.5 13.6c0 2.9 1.7 4.9 4.1 4.9 2.1 0 3.7-1.6 3.7-3.7 0-2-1.4-3.5-3.3-3.5-.4 0-.8.1-1 .2.4-1.8 1.8-3.4 3.6-4.3ZM19.4 5.5c-3.1 1.5-5 4.4-5 8.1 0 2.9 1.7 4.9 4.1 4.9 2.1 0 3.7-1.6 3.7-3.7 0-2-1.4-3.5-3.3-3.5-.4 0-.8.1-1 .2.4-1.8 1.8-3.4 3.6-4.3Z" />
  ),

  /* --- social. Drawn as outlines so they inherit currentColor like the rest. */
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path d="M14.5 8.5h2.2V5.6h-2.6c-2.3 0-3.8 1.5-3.8 3.9v1.6H8.1v3h2.2v7.3h3.2v-7.3h2.4l.4-3h-2.8V9.8c0-.9.4-1.3 1-1.3Z" />
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M10.6 17.8c.5-1.9 1.4-5.4 1.4-5.4M9.9 10.9c0-1.7 1.3-3 3-3s2.9 1.1 2.9 2.8c0 2-1.3 3.6-2.9 3.6-.9 0-1.5-.7-1.3-1.5" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.8" y="6" width="18.4" height="12" rx="4" />
      <path d="M10.4 9.6 15 12l-4.6 2.4Z" fill="currentColor" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20.2 12a8.2 8.2 0 0 1-12.3 7.1L3.8 20.2l1.1-4a8.2 8.2 0 1 1 15.3-4.2Z" />
      <path d="M9.2 9.1c.3-.1.7 0 .9.4l.6 1.1c.1.3.1.6-.1.8l-.4.5c.6 1.1 1.5 2 2.6 2.6l.5-.4c.2-.2.5-.2.8-.1l1.1.6c.4.2.5.6.4.9-.3.8-1.1 1.2-1.9 1-2.6-.6-4.6-2.6-5.2-5.2-.2-.8.2-1.6 1-1.9Z" />
    </>
  ),
};

export default function Icon({ name, size = 22, strokeWidth = 1.6, filled = false, ...rest }) {
  const path = paths[name];
  if (!path) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {path}
    </svg>
  );
}
