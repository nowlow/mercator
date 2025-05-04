"use client"

import { useRef, useEffect } from "react"
import * as d3 from "d3"

interface ThemeColors {
  background: string
  land: string
  landStroke: string
  countryStroke: string
  graticule: string
  name: string
  uiBackground?: string
  uiText?: string
  uiAccent?: string
  uiMenuBg?: string
}

interface GlobeWidgetProps {
  position: [number, number]
  size: number
  theme: ThemeColors
}

export function GlobeWidget({ position, size, theme }: GlobeWidgetProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove()

    // Create SVG
    const svg = d3.select(svgRef.current).attr("width", size).attr("height", size)

    // Create orthographic projection for the globe
    const projection = d3
      .geoOrthographic()
      .translate([size / 2, size / 2])
      .scale(size / 2 - 2)
      .rotate([position[0], -position[1], 0])

    // Create path generator
    const path = d3.geoPath().projection(projection)

    // Draw globe outline
    svg
      .append("circle")
      .attr("cx", size / 2)
      .attr("cy", size / 2)
      .attr("r", size / 2 - 2)
      .attr("fill", theme.background)
      .attr("stroke", theme.landStroke)
      .attr("stroke-width", 0.5)

    // Draw graticule
    const graticule = d3.geoGraticule()

    svg
      .append("path")
      .datum(graticule())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", theme.graticule)
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "1,1")

    // Draw equator
    const equator = { type: "LineString", coordinates: [...Array(361).keys()].map((d) => [d - 180, 0]) }
    svg
      .append("path")
      .datum(equator)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", theme.landStroke)
      .attr("stroke-width", 0.5)

    // Draw prime meridian
    const primeMeridian = { type: "LineString", coordinates: [...Array(181).keys()].map((d) => [0, d - 90]) }
    svg
      .append("path")
      .datum(primeMeridian)
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", theme.landStroke)
      .attr("stroke-width", 0.5)

    // Draw center point
    svg
      .append("circle")
      .attr("cx", size / 2)
      .attr("cy", size / 2)
      .attr("r", 2)
      .attr("fill", "red")
  }, [position, size, theme])

  return (
    <div
      className="rounded-full shadow-sm p-1"
      style={{
        backgroundColor: theme.uiMenuBg || "rgba(255, 255, 255, 0.8)",
        borderColor: theme.uiAccent,
        borderWidth: "1px",
        borderStyle: "solid",
      }}
    >
      <svg ref={svgRef} width={size} height={size} />
    </div>
  )
}
