import { LinkaroMark } from "@linkaro/ui/components/linkaro-logo"
import QRCode from "qrcode"

/**
 * QR code de la double authentification, généré côté serveur, avec le logo
 * Linkaro au centre. La correction d'erreur maximale (H, 30 %) garde le code
 * lisible malgré le logo, qui en masque moins de 10 %.
 */
export function TotpQrCode({ value }: { value: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "H" })
  const size = modules.size

  // Un seul tracé pour tous les modules sombres.
  let path = ""
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`
    }
  }

  const logo = Math.round(size * 0.24)
  const logoStart = (size - logo) / 2
  const quiet = 2

  return (
    <svg
      viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
      className="size-44 rounded-md bg-white"
      role="img"
      aria-label="QR code à scanner avec ton application d'authentification"
      shapeRendering="crispEdges"
    >
      <path d={path} fill="#0b0b0f" />
      <rect
        x={logoStart - 0.5}
        y={logoStart - 0.5}
        width={logo + 1}
        height={logo + 1}
        rx={1.5}
        fill="#ffffff"
      />
      <LinkaroMark
        x={logoStart}
        y={logoStart}
        width={logo}
        height={logo}
        className="text-brand"
        shapeRendering="geometricPrecision"
      />
    </svg>
  )
}
