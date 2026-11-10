import './PageBackdrop.css'

/**
 * Decorative paper texture behind the page: blurred beige glows and two
 * watercolour stains. Purely presentational; images come from CSS so each
 * breakpoint only downloads its own Figma export.
 */
export function PageBackdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="backdrop__glow backdrop__glow--upper-left" />
      <div className="backdrop__glow backdrop__glow--right" />
      <div className="backdrop__glow backdrop__glow--lower-left" />
      <div className="backdrop__glow backdrop__glow--mobile-right" />
      <div className="backdrop__watercolor">
        <div className="backdrop__watercolor-art" />
      </div>
      <div className="backdrop__watercolor-fade" />
      <div className="backdrop__watermark">
        <div className="backdrop__watermark-art" />
      </div>
    </div>
  )
}
