"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import * as d3 from "d3"
import { feature } from "topojson-client"
import { GlobeWidget } from "./globe-widget"
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RefreshCw, MenuIcon, X, Share2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Define types for our geographic data
type TopoJSON = {
  type: string
  objects: {
    [key: string]: any
  }
  arcs: Array<Array<[number, number]>>
  transform: {
    scale: [number, number]
    translate: [number, number]
  }
}

type GeoData = {
  countries: any
  land: any
}

// Define color themes
const colorThemes = {
  classic: {
    background: "#cae8ff",
    land: "#e8e8e8",
    landStroke: "#999",
    countryStroke: "#555",
    graticule: "#ccc",
    name: "Classic",
    uiBackground: "#ffffff",
    uiText: "#000000",
    uiAccent: "#0066cc",
    uiMenuBg: "rgba(255, 255, 255, 0.9)",
  },
  dark: {
    background: "#1a1a2e",
    land: "#2a2a4a",
    landStroke: "#4a4a6a",
    countryStroke: "#6a6a8a",
    graticule: "#4a4a6a",
    name: "Dark",
    uiBackground: "#121212",
    uiText: "#ffffff",
    uiAccent: "#6a8caf",
    uiMenuBg: "rgba(18, 18, 18, 0.9)",
  },
  earth: {
    background: "#a4d1e9",
    land: "#c4dea0",
    landStroke: "#75a37c",
    countryStroke: "#5a7a5a",
    graticule: "#75a3a3",
    name: "Earth",
    uiBackground: "#f0f7e9",
    uiText: "#2c3e50",
    uiAccent: "#3d8b40",
    uiMenuBg: "rgba(240, 247, 233, 0.9)",
  },
  sepia: {
    background: "#f0e6d2",
    land: "#e0c9a6",
    landStroke: "#b5a285",
    countryStroke: "#8a7a65",
    graticule: "#c0b090",
    name: "Sepia",
    uiBackground: "#f5f0e6",
    uiText: "#5d4037",
    uiAccent: "#a1887f",
    uiMenuBg: "rgba(245, 240, 230, 0.9)",
  },
  monochrome: {
    background: "#f5f5f5",
    land: "#d9d9d9",
    landStroke: "#a0a0a0",
    countryStroke: "#707070",
    graticule: "#c0c0c0",
    name: "Monochrome",
    uiBackground: "#ffffff",
    uiText: "#333333",
    uiAccent: "#666666",
    uiMenuBg: "rgba(255, 255, 255, 0.9)",
  },
  neonBlue: {
    background: "#000033",
    land: "#0033cc",
    landStroke: "#00ccff",
    countryStroke: "#00ffff",
    graticule: "#0066ff",
    name: "Neon Blue",
    uiBackground: "#000033",
    uiText: "#00ffff",
    uiAccent: "#00ccff",
    uiMenuBg: "rgba(0, 0, 51, 0.9)",
  },
  neonPink: {
    background: "#330033",
    land: "#990099",
    landStroke: "#ff00ff",
    countryStroke: "#ff66ff",
    graticule: "#cc00cc",
    name: "Neon Pink",
    uiBackground: "#330033",
    uiText: "#ff66ff",
    uiAccent: "#ff00ff",
    uiMenuBg: "rgba(51, 0, 51, 0.9)",
  },
  neonGreen: {
    background: "#001a00",
    land: "#006600",
    landStroke: "#00ff00",
    countryStroke: "#66ff66",
    graticule: "#00cc00",
    name: "Neon Green",
    uiBackground: "#001a00",
    uiText: "#66ff66",
    uiAccent: "#00ff00",
    uiMenuBg: "rgba(0, 26, 0, 0.9)",
  },
  cyberpunk: {
    background: "#0b0b2b",
    land: "#3d0066",
    landStroke: "#ff00ff",
    countryStroke: "#00ffff",
    graticule: "#ffff00",
    name: "Cyberpunk",
    uiBackground: "#0b0b2b",
    uiText: "#00ffff",
    uiAccent: "#ff00ff",
    uiMenuBg: "rgba(11, 11, 43, 0.9)",
  },
  retrowave: {
    background: "#000033",
    land: "#330066",
    landStroke: "#ff00cc",
    countryStroke: "#00ffff",
    graticule: "#9900ff",
    name: "Retrowave",
    uiBackground: "#000033",
    uiText: "#00ffff",
    uiAccent: "#ff00cc",
    uiMenuBg: "rgba(0, 0, 51, 0.9)",
  },
}

type ThemeKey = keyof typeof colorThemes

export default function MercatorMap() {
  // Refs for DOM elements
  const svgRef = useRef<SVGSVGElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<boolean>(false)
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null)
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // State for map properties
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [position, setPosition] = useState<[number, number]>([0, 0]) // [longitude, latitude]
  const [isDragging, setIsDragging] = useState(false)
  const [geoData, setGeoData] = useState<GeoData | null>(null)
  const [theme, setTheme] = useState<ThemeKey>("classic")
  const [showMenu, setShowMenu] = useState(false)
  const [showRotation, setShowRotation] = useState(true)
  const [shareSuccess, setShareSuccess] = useState(false)

  // Load saved settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check URL parameters first
      const urlParams = new URLSearchParams(window.location.search)
      const lon = urlParams.get("lon")
      const lat = urlParams.get("lat")
      const themeParam = urlParams.get("theme")

      if (lon && lat) {
        setPosition([Number.parseFloat(lon), Number.parseFloat(lat)])
      } else {
        // If no URL parameters, try localStorage
        const savedPosition = localStorage.getItem("mercatorPosition")
        if (savedPosition) {
          try {
            setPosition(JSON.parse(savedPosition))
          } catch (e) {
            console.error("Failed to parse saved position", e)
          }
        }
      }

      if (themeParam && Object.keys(colorThemes).includes(themeParam)) {
        setTheme(themeParam as ThemeKey)
      } else {
        const savedTheme = localStorage.getItem("mercatorTheme")
        if (savedTheme && Object.keys(colorThemes).includes(savedTheme)) {
          setTheme(savedTheme as ThemeKey)
        }
      }

      const savedShowRotation = localStorage.getItem("mercatorShowRotation")
      if (savedShowRotation !== null) {
        setShowRotation(savedShowRotation === "true")
      }
    }
  }, [])

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mercatorPosition", JSON.stringify(position))
      localStorage.setItem("mercatorTheme", theme)
      localStorage.setItem("mercatorShowRotation", String(showRotation))
    }
  }, [position, theme, showRotation])

  // Update URL with current position (debounced to prevent infinite loops)
  useEffect(() => {
    // Clear any existing timeout
    if (urlUpdateTimeoutRef.current) {
      clearTimeout(urlUpdateTimeoutRef.current)
    }

    // Set a new timeout to update the URL after a delay
    urlUpdateTimeoutRef.current = setTimeout(() => {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href)
        url.searchParams.set("lon", position[0].toString())
        url.searchParams.set("lat", position[1].toString())
        url.searchParams.set("theme", theme)

        // Update URL without reloading the page
        window.history.replaceState({}, "", url.toString())
      }
    }, 500) // 500ms debounce

    // Cleanup function
    return () => {
      if (urlUpdateTimeoutRef.current) {
        clearTimeout(urlUpdateTimeoutRef.current)
      }
    }
  }, [position, theme])

  // Function to load geographic data
  const loadGeoData = useCallback(async () => {
    try {
      // Load world topology data
      const worldData = await d3.json<TopoJSON>("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")

      if (worldData) {
        // Convert TopoJSON to GeoJSON
        const countries = feature(worldData, worldData.objects.countries)
        const land = feature(worldData, worldData.objects.land)

        setGeoData({ countries, land })
      }
    } catch (error) {
      console.error("Error loading geographic data:", error)
    }
  }, [])

  // Function to create and update the map
  const createMap = useCallback(() => {
    if (!svgRef.current || !geoData || width === 0 || height === 0) return

    // Get current theme colors
    const currentTheme = colorThemes[theme]

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove()

    // Create projection - using Mercator with proper center
    const projection = d3
      .geoMercator()
      .scale(Math.min(width, height * 2) / (2 * Math.PI)) // Scale to fit the container
      .center([0, 0])
      .translate([width / 2, height / 2])
      .rotate([-position[0], -position[1], 0])
      .precision(0.1)

    // Create path generator
    const path = d3.geoPath().projection(projection)

    // Create SVG element
    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height)

    // Create background
    svg.append("rect").attr("width", width).attr("height", height).attr("fill", currentTheme.background)

    // Draw graticule (coordinate grid)
    const graticule = d3.geoGraticule()

    svg
      .append("g")
      .attr("class", "graticule")
      .append("path")
      .datum(graticule())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", currentTheme.graticule)
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2")

    // Draw land and countries
    // For proper wrapping, we'll draw multiple copies of the world
    const offsets = [-360, 0, 360]

    offsets.forEach((offset) => {
      // Draw land
      svg
        .append("g")
        .attr("class", "land")
        .selectAll("path")
        .data(geoData.land.features)
        .enter()
        .append("path")
        .attr("d", (d: any) => {
          // Clone the feature and shift its coordinates
          const shiftedFeature = JSON.parse(JSON.stringify(d))
          if (shiftedFeature.geometry.type === "Polygon") {
            shiftedFeature.geometry.coordinates = shiftedFeature.geometry.coordinates.map((ring: any) => {
              return ring.map((coord: [number, number]) => {
                return [coord[0] + offset, coord[1]]
              })
            })
          } else if (shiftedFeature.geometry.type === "MultiPolygon") {
            shiftedFeature.geometry.coordinates = shiftedFeature.geometry.coordinates.map((polygon: any) => {
              return polygon.map((ring: any) => {
                return ring.map((coord: [number, number]) => {
                  return [coord[0] + offset, coord[1]]
                })
              })
            })
          }
          return path(shiftedFeature)
        })
        .attr("fill", currentTheme.land)
        .attr("stroke", currentTheme.landStroke)
        .attr("stroke-width", 0.5)

      // Draw country boundaries
      svg
        .append("g")
        .attr("class", "countries")
        .selectAll("path")
        .data(geoData.countries.features)
        .enter()
        .append("path")
        .attr("d", (d: any) => {
          // Clone the feature and shift its coordinates
          const shiftedFeature = JSON.parse(JSON.stringify(d))
          if (shiftedFeature.geometry.type === "Polygon") {
            shiftedFeature.geometry.coordinates = shiftedFeature.geometry.coordinates.map((ring: any) => {
              return ring.map((coord: [number, number]) => {
                return [coord[0] + offset, coord[1]]
              })
            })
          } else if (shiftedFeature.geometry.type === "MultiPolygon") {
            shiftedFeature.geometry.coordinates = shiftedFeature.geometry.coordinates.map((polygon: any) => {
              return polygon.map((ring: any) => {
                return ring.map((coord: [number, number]) => {
                  return [coord[0] + offset, coord[1]]
                })
              })
            })
          }
          return path(shiftedFeature)
        })
        .attr("fill", "none")
        .attr("stroke", currentTheme.countryStroke)
        .attr("stroke-width", 0.25)
        .attr("class", "country")
        .attr("data-name", (d: any) => d.properties.name)
    })
  }, [position, geoData, height, width, theme])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapContainerRef.current) {
        // Get the viewport dimensions
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Calculate the maximum size that fits in the viewport
        // Leave some margin for the controls
        const maxWidth = viewportWidth - 40
        const maxHeight = viewportHeight - 40

        // Set dimensions to fill the available space
        setWidth(maxWidth)
        setHeight(maxHeight)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Load geographic data on component mount
  useEffect(() => {
    loadGeoData()
  }, [loadGeoData])

  // Create/update map when data or dimensions change
  useEffect(() => {
    createMap()
  }, [createMap, geoData, width, height, position, theme])

  // Custom mouse drag handling
  useEffect(() => {
    if (!svgRef.current) return

    const handleMouseDown = (e: MouseEvent) => {
      dragRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      setIsDragging(true)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !lastMousePosRef.current) return

      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y

      // Calculate new position based on drag distance
      const scale = 0.25
      const newLongitude = position[0] - dx * scale
      const newLatitude = position[1] + dy * scale

      // Update position
      setPosition([newLongitude, newLatitude])

      // Update last mouse position
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      dragRef.current = false
      lastMousePosRef.current = null
      setIsDragging(false)
    }

    const svg = svgRef.current
    svg.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      svg.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [position])

  // Calculate the new position based on direction and current position
  const calculateNewPosition = (direction: "up" | "down" | "left" | "right", step: number): [number, number] => {
    const [longitude, latitude] = position

    switch (direction) {
      case "up":
        // Move north
        return [longitude, latitude + step]
      case "down":
        // Move south
        return [longitude, latitude - step]
      case "right":
        // Move east - always along the current parallel
        return [longitude + step, latitude]
      case "left":
        // Move west - always along the current parallel
        return [longitude - step, latitude]
      default:
        return position
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior (scrolling)
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()
      }

      const step = 5 // Degrees to move per key press
      let direction: "up" | "down" | "left" | "right"

      switch (e.key) {
        case "ArrowUp":
          direction = "up"
          break
        case "ArrowDown":
          direction = "down"
          break
        case "ArrowLeft":
          direction = "left"
          break
        case "ArrowRight":
          direction = "right"
          break
        default:
          return
      }

      const newPosition = calculateNewPosition(direction, step)
      setPosition(newPosition)
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [position])

  // Reset to default view
  const handleReset = () => {
    setPosition([0, 0])
  }

  // Move map with arrow buttons
  const moveMap = (direction: "up" | "down" | "left" | "right") => {
    const step = 10
    const newPosition = calculateNewPosition(direction, step)
    setPosition(newPosition)
  }

  // Handle theme change
  const handleThemeChange = (value: string) => {
    setTheme(value as ThemeKey)
  }

  // Share current view
  const handleShare = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("lon", position[0].toString())
      url.searchParams.set("lat", position[1].toString())
      url.searchParams.set("theme", theme)

      // Copy to clipboard
      navigator.clipboard
        .writeText(url.toString())
        .then(() => {
          setShareSuccess(true)
          setTimeout(() => setShareSuccess(false), 2000)
        })
        .catch((err) => {
          console.error("Failed to copy URL: ", err)
        })
    }
  }

  // Normalize longitude to -180 to 180 range for display
  const normalizedLongitude = (((position[0] % 360) + 540) % 360) - 180

  // Get current theme colors
  const currentTheme = colorThemes[theme]

  return (
    <div
      className="relative w-full h-screen flex items-center justify-center"
      style={{
        backgroundColor: currentTheme.uiBackground,
        color: currentTheme.uiText,
      }}
    >
      <div
        ref={mapContainerRef}
        className={`relative overflow-visible ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <svg ref={svgRef} className="w-full h-full" style={{ touchAction: "none" }} />

        {/* Coordinates display */}
        {showRotation && (
          <div
            className="absolute bottom-4 left-4 p-2 rounded-md shadow-sm text-sm"
            style={{
              backgroundColor: currentTheme.uiMenuBg,
              color: currentTheme.uiText,
              borderColor: currentTheme.uiAccent,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            Your position: {normalizedLongitude.toFixed(2)}°, {position[1].toFixed(2)}°
          </div>
        )}

        {/* Globe widget */}
        <div className="absolute top-4 right-4">
          <GlobeWidget position={position} size={80} theme={colorThemes[theme]} />
        </div>

        {/* Menu toggle button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 shadow-sm z-50"
          onClick={() => setShowMenu(!showMenu)}
          style={{
            backgroundColor: currentTheme.uiMenuBg,
            color: currentTheme.uiText,
            borderColor: currentTheme.uiAccent,
          }}
        >
          {showMenu ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
        </Button>

        {/* Controls menu */}
        {showMenu && (
          <div
            className="absolute top-16 left-4 p-4 rounded-md shadow-md max-w-xs z-50"
            style={{
              backgroundColor: currentTheme.uiMenuBg,
              color: currentTheme.uiText,
              borderColor: currentTheme.uiAccent,
              borderWidth: "1px",
              borderStyle: "solid",
              position: "absolute",
              display: "block",
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Controls</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowMenu(false)}
                  style={{ color: currentTheme.uiText }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="show-rotation" className="text-sm">
                    Show position
                  </Label>
                  <Switch id="show-rotation" checked={showRotation} onCheckedChange={setShowRotation} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Navigation</Label>
                <div className="flex flex-col items-center">
                  <Button
                    variant="outline"
                    onClick={() => moveMap("up")}
                    className="mb-1 px-3 py-1"
                    style={{
                      backgroundColor: currentTheme.uiBackground,
                      color: currentTheme.uiText,
                      borderColor: currentTheme.uiAccent,
                    }}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      onClick={() => moveMap("left")}
                      className="px-3 py-1"
                      style={{
                        backgroundColor: currentTheme.uiBackground,
                        color: currentTheme.uiText,
                        borderColor: currentTheme.uiAccent,
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => moveMap("right")}
                      className="px-3 py-1"
                      style={{
                        backgroundColor: currentTheme.uiBackground,
                        color: currentTheme.uiText,
                        borderColor: currentTheme.uiAccent,
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => moveMap("down")}
                    className="mt-1 px-3 py-1"
                    style={{
                      backgroundColor: currentTheme.uiBackground,
                      color: currentTheme.uiText,
                      borderColor: currentTheme.uiAccent,
                    }}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Themes</Label>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger
                    className="w-full"
                    style={{
                      backgroundColor: currentTheme.uiBackground,
                      color: currentTheme.uiText,
                      borderColor: currentTheme.uiAccent,
                    }}
                  >
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent
                    style={{
                      backgroundColor: currentTheme.uiBackground,
                      color: currentTheme.uiText,
                      borderColor: currentTheme.uiAccent,
                    }}
                  >
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="earth">Earth</SelectItem>
                    <SelectItem value="sepia">Sepia</SelectItem>
                    <SelectItem value="monochrome">Monochrome</SelectItem>
                    <SelectItem value="neonBlue">Neon Blue</SelectItem>
                    <SelectItem value="neonPink">Neon Pink</SelectItem>
                    <SelectItem value="neonGreen">Neon Green</SelectItem>
                    <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                    <SelectItem value="retrowave">Retrowave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleReset}
                  className="flex-1"
                  style={{
                    backgroundColor: currentTheme.uiAccent,
                    color: currentTheme.uiBackground,
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>

                <Button
                  onClick={handleShare}
                  className="flex-1"
                  style={{
                    backgroundColor: shareSuccess ? "#4CAF50" : currentTheme.uiAccent,
                    color: currentTheme.uiBackground,
                  }}
                >
                  {shareSuccess ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs" style={{ color: currentTheme.uiText }}>
                <p>Drag to move your viewpoint on Earth.</p>
                <p>Use arrow keys for precise navigation.</p>
                <p>Share your view with others using the Share button.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
