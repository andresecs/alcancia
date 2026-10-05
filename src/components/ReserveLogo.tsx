const assetPathPrefix = "/assets";
const logoMask = `${assetPathPrefix}/87d64.svg`;

// The logo shape is a mask filled with the current text color, so it follows
// the theme (dark on light pages, light in dark mode).
export default function ReserveLogo() {
  return (
    <span className="reserve-logo" aria-hidden="true">
      <span
        className="reserve-logo__mask"
        style={{ maskImage: `url("${logoMask}")`, WebkitMaskImage: `url("${logoMask}")` }}
      />
    </span>
  );
}
