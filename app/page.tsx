import { Analytics } from "@vercel/analytics/react"
import MercatorMap from "@/components/mercator-map"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Analytics />
      <MercatorMap />
    </main>
  )
}
