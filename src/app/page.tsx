"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Canvas from "@/components/canvas"
import LayerPanel from "@/components/layer-panel"
import ExportManager from "@/components/export-manager"
import {
  TaskManager,
  createQuickExportPNGTask,
  createQuickExportJPGTask,
  createBulkExportTask,
  createSaveTask,
  createSaveAsTask,
  createOpenTask,
} from "@/utils/tasks"
import type { LayerPreset } from "@/types/project"

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

export default function ImageEditor() {
  const [zoom, setZoom] = useState(0.3)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 })
  const [isLayerPanelVisible, setIsLayerPanelVisible] = useState(true)
  const [presets, setPresets] = useState<LayerPreset[]>([])
  const [isExportManagerOpen, setIsExportManagerOpen] = useState(false)

  // Dynamic canvas size - starts with reasonable defaults
  const [canvasWidth, setCanvasWidth] = useState(1920)
  const [canvasHeight, setCanvasHeight] = useState(1080)
  const [layers, setLayers] = useState<Layer[]>([])

  // Track if a project is loaded
  const [isProjectLoaded, setIsProjectLoaded] = useState(false)
  const [projectName, setProjectName] = useState<string | null>(null)

  // Initialize task manager
  const taskManagerRef = useRef<TaskManager | null>(null)

  const handleLoadProject = useCallback(
      (newLayers: Layer[], newPresets: LayerPreset[], newCanvasWidth: number, newCanvasHeight: number, fileName?: string) => {
        console.log("Loading project with canvas size:", newCanvasWidth, "x", newCanvasHeight)

        setLayers(newLayers)
        setPresets(newPresets)
        setCanvasWidth(newCanvasWidth)
        setCanvasHeight(newCanvasHeight)
        setSelectedLayerId(newLayers.length > 0 ? newLayers[0].id : null)
        setIsProjectLoaded(true)
        setProjectName(fileName || null)

        // Reset view with new canvas dimensions
        setZoom(0.3)
        setPanX(0)
        setPanY(0)
      },
      [],
  )

  const handleNewProject = useCallback(() => {
    const newCanvasWidth = 1920  // Default to common resolution
    const newCanvasHeight = 1080

    setLayers([])
    setPresets([])
    setCanvasWidth(newCanvasWidth)
    setCanvasHeight(newCanvasHeight)
    setSelectedLayerId(null)
    setIsProjectLoaded(false)
    setProjectName(null)

    // Reset view
    setZoom(0.3)
    setPanX(0)
    setPanY(0)
  }, [])

  useEffect(() => {
    taskManagerRef.current = new TaskManager({
      layers,
      canvasWidth,
      canvasHeight,
      onApplyPreset: handleApplyPreset,
      onLoadProject: handleLoadProject,
    })
  }, [layers, canvasWidth, canvasHeight, handleLoadProject])

  // Update task manager context when dependencies change
  useEffect(() => {
    if (taskManagerRef.current) {
      taskManagerRef.current.updateContext({
        layers,
        canvasWidth,
        canvasHeight,
        onApplyPreset: handleApplyPreset,
        onLoadProject: handleLoadProject,
      })
    }
  }, [layers, canvasWidth, canvasHeight, handleLoadProject])

  const handleZoomChange = useCallback(
      (newZoom: number, centerX?: number, centerY?: number) => {
        if (centerX !== undefined && centerY !== undefined) {
          const zoomRatio = newZoom / zoom
          const newPanX = centerX - (centerX - panX) * zoomRatio
          const newPanY = centerY - (centerY - panY) * zoomRatio

          setPanX(newPanX)
          setPanY(newPanY)
        }
        setZoom(newZoom)
      },
      [zoom, panX, panY],
  )

  const handlePanChange = useCallback((x: number, y: number) => {
    setPanX(x)
    setPanY(y)
  }, [])

  const handleLayerToggleVisibility = useCallback((id: string) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, isVisible: !layer.isVisible } : layer)))
  }, [])

  const handleLayerSelect = useCallback((id: string) => {
    setSelectedLayerId(id)
  }, [])

  const handleAddLayer = useCallback(() => {
    const maxZIndex = layers.length > 0 ? Math.max(...layers.map((l) => l.zIndex)) : -1
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `New Layer ${layers.length + 1}`,
      src: `/placeholder.svg?height=${canvasHeight}&width=${canvasWidth}&text=New+Layer+${layers.length + 1}`,
      file_path: `./assets/new_layer_${layers.length + 1}.png`,
      width: canvasWidth,
      height: canvasHeight,
      isVisible: true,
      zIndex: maxZIndex + 1,
    }
    setLayers((prev) => [...prev, newLayer])
    setSelectedLayerId(newLayer.id)
  }, [layers, canvasWidth, canvasHeight])

  const handleDeleteLayer = useCallback(
      (id: string) => {
        if (layers.length <= 1) return
        setLayers((prev) => prev.filter((layer) => layer.id !== id))
        if (selectedLayerId === id) {
          const remainingLayers = layers.filter((l) => l.id !== id)
          setSelectedLayerId(remainingLayers.length > 0 ? remainingLayers[0].id : null)
        }
      },
      [layers, selectedLayerId],
  )

  const handleReorderLayers = useCallback((draggedId: string, targetId: string) => {
    setLayers((prev) => {
      const draggedIndex = prev.findIndex((layer) => layer.id === draggedId)
      const targetIndex = prev.findIndex((layer) => layer.id === targetId)

      if (draggedIndex === -1 || targetIndex === -1) return prev

      const newLayers = [...prev]
      const [draggedLayer] = newLayers.splice(draggedIndex, 1)
      newLayers.splice(targetIndex, 0, draggedLayer)

      // Update z-index based on new order
      return newLayers.map((layer, index) => ({
        ...layer,
        zIndex: index,
      }))
    })
  }, [])

  const handleApplyPreset = useCallback((layerStates: Record<string, boolean>) => {
    setLayers((prev) =>
        prev.map((layer) => ({
          ...layer,
          isVisible: layerStates[layer.id] ?? layer.isVisible,
        })),
    )
  }, [])

  // Task handlers using TaskManager
  const handleOpen = useCallback(async () => {
    if (taskManagerRef.current) {
      try {
        await taskManagerRef.current.executeTask(createOpenTask())
      } catch (error) {
        console.error("Open task failed:", error)
      }
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (taskManagerRef.current) {
      try {
        await taskManagerRef.current.executeTask(createSaveTask())
      } catch (error) {
        console.error("Save task failed:", error)
      }
    }
  }, [])

  const handleSaveAs = useCallback(async () => {
    if (taskManagerRef.current) {
      try {
        await taskManagerRef.current.executeTask(createSaveAsTask())
      } catch (error) {
        console.error("Save As task failed:", error)
      }
    }
  }, [])

  const handleQuickExportPNG = useCallback(async () => {
    if (taskManagerRef.current) {
      try {
        await taskManagerRef.current.executeTask(createQuickExportPNGTask())
      } catch (error) {
        console.error("Quick Export PNG task failed:", error)
      }
    }
  }, [])

  const handleQuickExportJPG = useCallback(async () => {
    if (taskManagerRef.current) {
      try {
        await taskManagerRef.current.executeTask(createQuickExportJPGTask())
      } catch (error) {
        console.error("Quick Export JPG task failed:", error)
      }
    }
  }, [])

  const handleBulkExport = useCallback(async () => {
    if (taskManagerRef.current) {
      try {
        await taskManagerRef.current.executeTask(createBulkExportTask())
      } catch (error) {
        console.error("Bulk Export task failed:", error)
      }
    }
  }, [])

  const canvasRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const updateViewportSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        setViewportSize({ width: rect.width, height: rect.height })
      }
    }

    updateViewportSize()
    window.addEventListener("resize", updateViewportSize)
    return () => window.removeEventListener("resize", updateViewportSize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault()
        setIsLayerPanelVisible((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const visibleLayers = layers.filter((layer) => layer.isVisible)

  return (
      <div className="flex h-screen bg-gray-100">
        <div ref={canvasRef} className="flex-1 flex flex-col">
          <Canvas
              layers={visibleLayers}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              zoom={zoom}
              panX={panX}
              panY={panY}
              isProjectLoaded={isProjectLoaded}
              projectName={projectName}
              onZoomChange={handleZoomChange}
              onPanChange={handlePanChange}
              onOpen={handleOpen}
              onSave={handleSave}
              onSaveAs={handleSaveAs}
              onNewProject={handleNewProject}
              onQuickExportPNG={handleQuickExportPNG}
              onQuickExportJPG={handleQuickExportJPG}
              onBulkExport={handleBulkExport}
          />
        </div>
        {isLayerPanelVisible && (
            <LayerPanel
                layers={layers}
                selectedLayerId={selectedLayerId}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                zoom={zoom}
                panX={panX}
                panY={panY}
                viewportWidth={viewportSize.width}
                viewportHeight={viewportSize.height}
                presets={presets}
                onLayerToggleVisibility={handleLayerToggleVisibility}
                onLayerSelect={handleLayerSelect}
                onPanChange={handlePanChange}
                onAddLayer={handleAddLayer}
                onDeleteLayer={handleDeleteLayer}
                onApplyPreset={handleApplyPreset}
                onReorderLayers={handleReorderLayers}
                onPresetsChange={setPresets}
            />
        )}

        {/* Export Manager */}
        <ExportManager
            layers={layers}
            presets={presets}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onApplyPreset={handleApplyPreset}
            isOpen={isExportManagerOpen}
            onOpenChange={setIsExportManagerOpen}
        />
      </div>
  )
}