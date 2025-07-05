"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import Image from "next/image"
import LayerToolbar from "./layer-toolbar"

interface Layer {
  id: string
  name: string
  src: string
  file_path: string
  width: number
  height: number
  isVisible: boolean
  zIndex: number
}

interface CanvasProps {
  layers: Layer[]
  canvasWidth: number
  canvasHeight: number
  zoom: number
  panX: number
  panY: number
  isProjectLoaded?: boolean
  projectName?: string | null
  onZoomChange: (zoom: number, centerX?: number, centerY?: number) => void
  onPanChange: (x: number, y: number) => void
  onOpen?: () => void
  onSave?: () => void
  onSaveAs?: () => void
  onNewProject?: () => void
  onQuickExportPNG?: () => void
  onQuickExportJPG?: () => void
  onBulkExport?: () => void
}

export default function Canvas({
                                 layers,
                                 canvasWidth,
                                 canvasHeight,
                                 zoom,
                                 panX,
                                 panY,
                                 isProjectLoaded = false,
                                 projectName,
                                 onZoomChange,
                                 onPanChange,
                                 onOpen,
                                 onSave,
                                 onSaveAs,
                                 onNewProject,
                                 onQuickExportPNG,
                                 onQuickExportJPG,
                                 onBulkExport,
                               }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
      (e: WheelEvent) => {
        e.preventDefault()

        if (!containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const centerX = e.clientX - rect.left
        const centerY = e.clientY - rect.top

        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor))

        onZoomChange(newZoom, centerX, centerY)
      },
      [zoom, onZoomChange],
  )

  // Handle mouse pan
  const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isSpacePressed)) {
          e.preventDefault()
          setIsPanning(true)
          setLastPanPoint({ x: e.clientX, y: e.clientY })
        }
      },
      [isSpacePressed],
  )

  const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (isPanning) {
          const deltaX = e.clientX - lastPanPoint.x
          const deltaY = e.clientY - lastPanPoint.y

          onPanChange(panX + deltaX, panY + deltaY)
          setLastPanPoint({ x: e.clientX, y: e.clientY })
        }
      },
      [isPanning, lastPanPoint, panX, panY, onPanChange],
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      container.removeEventListener("wheel", handleWheel)
    }
  }, [handleWheel])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        setIsSpacePressed(false)
        setIsPanning(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const handleZoomIn = () => onZoomChange(Math.min(zoom * 1.2, 10))
  const handleZoomOut = () => onZoomChange(Math.max(zoom / 1.2, 0.1))
  const handleFitToScreen = () => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const scaleX = (rect.width - 100) / canvasWidth
    const scaleY = (rect.height - 100) / canvasHeight
    const fitZoom = Math.min(scaleX, scaleY, 1)
    onZoomChange(fitZoom)
    onPanChange(0, 0)
  }
  const handleActualSize = () => {
    onZoomChange(1)
    onPanChange(0, 0)
  }

  // Sort layers by z-index for proper rendering order
  const sortedLayers = layers.slice().sort((a, b) => a.zIndex - b.zIndex)

  // Determine canvas aspect ratio for better empty state display
  const aspectRatio = canvasWidth / canvasHeight
  const isLandscape = aspectRatio > 1
  const isSquare = Math.abs(aspectRatio - 1) < 0.1

  return (
      <div className="flex flex-col h-full">
        {/* Toolbar with Menu Bar */}
        <LayerToolbar
            zoom={zoom}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            isProjectLoaded={isProjectLoaded}
            projectName={projectName}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToScreen={handleFitToScreen}
            onActualSize={handleActualSize}
            onOpen={onOpen}
            onSave={onSave}
            onSaveAs={onSaveAs}
            onNewProject={onNewProject}
            onQuickExportPNG={onQuickExportPNG}
            onQuickExportJPG={onQuickExportJPG}
            onBulkExport={onBulkExport}
        />

        {/* Canvas Container */}
        <div
            ref={containerRef}
            className="flex-1 overflow-hidden bg-gray-200 relative"
            style={{ cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : "default" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
          {layers.length === 0 ? (
              /* Empty State */
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500 max-w-md mx-auto p-8">
                  <div className="text-6xl mb-4">🎨</div>
                  <h3 className="text-xl font-medium mb-2">
                    {isProjectLoaded ? "Empty Project" : "No Project Loaded"}
                  </h3>
                  <p className="text-sm mb-2">
                    {isProjectLoaded
                        ? "This project has no layers. Add some layers to get started."
                        : "Open a CSP project file exported from your Python extractor"}
                  </p>
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-1">
                      Canvas: {canvasWidth}×{canvasHeight}px
                      {isSquare ? " (Square)" : isLandscape ? " (Landscape)" : " (Portrait)"}
                    </p>
                    <p className="text-xs text-gray-400">
                      Aspect Ratio: {aspectRatio.toFixed(2)}:1
                    </p>
                  </div>

                  <div className="flex gap-2 justify-center">
                    <button
                        onClick={onOpen}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Open Project
                    </button>
                    {!isProjectLoaded && (
                        <button
                            onClick={onNewProject}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                        >
                          New Project
                        </button>
                    )}
                  </div>
                </div>
              </div>
          ) : (
              /* Canvas with Layers */
              <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `translate(${panX}px, ${panY}px)`,
                  }}
              >
                {/* Main Canvas */}
                <div
                    className="relative bg-white shadow-2xl border border-gray-300"
                    style={{
                      width: canvasWidth * zoom,
                      height: canvasHeight * zoom,
                      imageRendering: zoom > 2 ? "pixelated" : "auto",
                    }}
                >
                  {/* Transparency Checkerboard */}
                  <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `
                    linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
                    linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
                    linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                  `,
                        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                        backgroundPosition: `0 0, 0 ${10 * zoom}px, ${10 * zoom}px ${-10 * zoom}px, ${-10 * zoom}px 0px`,
                      }}
                  />
                  {/* Render Layers in z-index order */}
                  {sortedLayers.map((layer) => (
                      <div
                          key={layer.id}
                          className="absolute inset-0"
                          style={{
                            zIndex: layer.zIndex,
                            opacity: layer.isVisible ? 1 : 0,
                          }}
                      >
                        <Image
                            src={layer.src || "/placeholder.svg"}
                            alt={layer.name}
                            fill
                            className="object-contain"
                            style={{
                              imageRendering: zoom > 2 ? "pixelated" : "auto",
                            }}
                            priority={layer.zIndex < 3}
                        />
                      </div>
                  ))}
                </div>
              </div>
          )}

          {/* Canvas Info Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {isProjectLoaded && projectName && (
                <div>Project: {projectName} | </div>
            )}
            Canvas: {canvasWidth}×{canvasHeight}px | Zoom: {Math.round(zoom * 100)}% | Layers: {layers.length}
            {layers.length > 0 && ` | Visible: ${layers.filter(l => l.isVisible).length}`}
          </div>
        </div>
      </div>
  )
}