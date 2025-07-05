"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageIcon, Settings, GripVertical, Trash2 } from "lucide-react"
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

interface ExportItem {
  id: string
  name: string
  preset: LayerPreset
  format: "png" | "jpg"
  quality: number
  enabled: boolean
}

interface ExportManagerProps {
  layers: Layer[]
  presets: LayerPreset[]
  canvasWidth: number
  canvasHeight: number
  onApplyPreset: (layerStates: Record<string, boolean>) => void
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function ExportManager({
  layers,
  presets,
  canvasWidth,
  canvasHeight,
  onApplyPreset,
  isOpen = false,
  onOpenChange,
}: ExportManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(isOpen)
  const [exportItems, setExportItems] = useState<ExportItem[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [currentExportName, setCurrentExportName] = useState("")
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Single export settings
  const [singleFormat, setSingleFormat] = useState<"png" | "jpg">("png")
  const [singleQuality, setSingleQuality] = useState(90)
  const [singleFilename, setSingleFilename] = useState("canvas-export")

  // Sync external open state
  useEffect(() => {
    setIsDialogOpen(isOpen)
  }, [isOpen])

  // Listen for bulk export events
  useEffect(() => {
    const handleBulkExport = () => {
      setIsDialogOpen(true)
      initializeExportItems()
    }

    window.addEventListener("open-bulk-export", handleBulkExport)
    return () => window.removeEventListener("open-bulk-export", handleBulkExport)
  }, [])

  // Initialize export items from presets when dialog opens
  const initializeExportItems = () => {
    if (presets.length > 0) {
      const items: ExportItem[] = presets.map((preset) => ({
        id: `export-${preset.id}`,
        name: preset.name,
        preset,
        format: "png",
        quality: 90,
        enabled: true,
      }))
      setExportItems(items)
    }
  }

  const updateExportItem = (id: string, updates: Partial<ExportItem>) => {
    setExportItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const removeExportItem = (id: string) => {
    setExportItems((prev) => prev.filter((item) => item.id !== id))
  }

  const toggleAllExportItems = (enabled: boolean) => {
    setExportItems((prev) => prev.map((item) => ({ ...item, enabled })))
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", itemId)
  }

  const handleDragEnd = () => {
    setDraggedItemId(null)
    setDragOverItemId(null)
  }

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (draggedItemId && draggedItemId !== itemId) {
      setDragOverItemId(itemId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverItemId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData("text/plain")

    if (draggedId && draggedId !== targetId) {
      setExportItems((prev) => {
        const draggedIndex = prev.findIndex((item) => item.id === draggedId)
        const targetIndex = prev.findIndex((item) => item.id === targetId)

        if (draggedIndex === -1 || targetIndex === -1) return prev

        const newItems = [...prev]
        const [draggedItem] = newItems.splice(draggedIndex, 1)
        newItems.splice(targetIndex, 0, draggedItem)

        return newItems
      })
    }

    setDraggedItemId(null)
    setDragOverItemId(null)
  }

  const captureCanvas = async (layerStates?: Record<string, boolean>): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) {
        resolve("")
        return
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve("")
        return
      }

      // Set canvas size
      canvas.width = canvasWidth
      canvas.height = canvasHeight

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      // Apply layer states if provided, sort by z-index
      const currentLayers = layerStates
        ? layers.filter((layer) => layerStates[layer.id]).sort((a, b) => a.zIndex - b.zIndex)
        : layers.filter((layer) => layer.isVisible).sort((a, b) => a.zIndex - b.zIndex)

      let loadedImages = 0
      const totalImages = currentLayers.length

      if (totalImages === 0) {
        resolve(canvas.toDataURL("image/png"))
        return
      }

      currentLayers.forEach((layer) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          // Draw image to fit canvas
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)

          loadedImages++
          if (loadedImages === totalImages) {
            resolve(canvas.toDataURL("image/png"))
          }
        }
        img.onerror = () => {
          loadedImages++
          if (loadedImages === totalImages) {
            resolve(canvas.toDataURL("image/png"))
          }
        }
        img.src = layer.src
      })
    })
  }

  const downloadImage = (dataUrl: string, filename: string, format: "png" | "jpg", quality: number) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      if (ctx) {
        if (format === "jpg") {
          // Fill white background for JPG
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }
        ctx.drawImage(img, 0, 0)

        const finalDataUrl =
          format === "jpg" ? canvas.toDataURL("image/jpeg", quality / 100) : canvas.toDataURL("image/png")

        const link = document.createElement("a")
        link.download = `${filename}.${format}`
        link.href = finalDataUrl
        link.click()
      }
    }

    img.src = dataUrl
  }

  const exportSingle = async () => {
    const dataUrl = await captureCanvas()
    if (dataUrl) {
      downloadImage(dataUrl, singleFilename, singleFormat, singleQuality)
    }
  }

  const exportBulk = async () => {
    const enabledItems = exportItems.filter((item) => item.enabled)
    if (enabledItems.length === 0) return

    setIsExporting(true)
    setExportProgress(0)

    for (let i = 0; i < enabledItems.length; i++) {
      const item = enabledItems[i]
      setCurrentExportName(item.name)

      // Apply preset
      onApplyPreset(item.preset.layer_states)
      // Wait a bit for state to update
      await new Promise((resolve) => setTimeout(resolve, 100))

      const dataUrl = await captureCanvas(item.preset.layer_states)
      if (dataUrl) {
        downloadImage(dataUrl, item.name, item.format, item.quality)
      }

      setExportProgress(((i + 1) / enabledItems.length) * 100)

      // Small delay between exports
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    setIsExporting(false)
    setCurrentExportName("")
    setExportProgress(0)
  }

  const getPresetSummary = (preset: LayerPreset) => {
    const visibleCount = Object.values(preset.layer_states).filter(Boolean).length
    const totalCount = Object.keys(preset.layer_states).length
    return `${visibleCount}/${totalCount} visible`
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (onOpenChange) {
      onOpenChange(open)
    }
    if (open) {
      initializeExportItems()
    }
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Images</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="export" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Export</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Single Export
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Format</label>
                    <Select value={singleFormat} onValueChange={(value: "png" | "jpg") => setSingleFormat(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {singleFormat === "jpg" && (
                    <div>
                      <label className="text-sm font-medium">Quality</label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={singleQuality}
                        onChange={(e) => setSingleQuality(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Filename</label>
                  <Input
                    value={singleFilename}
                    onChange={(e) => setSingleFilename(e.target.value)}
                    placeholder="Enter filename..."
                  />
                </div>

                <Button onClick={exportSingle} className="w-full">
                  Export Current State
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Bulk Export from Presets
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleAllExportItems(true)}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleAllExportItems(false)}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                {exportItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No presets available for bulk export.</p>
                    <p className="text-sm">Create some layer presets first to enable bulk export.</p>
                  </div>
                ) : (
                  <>
                    {/* Export Queue */}
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                      {exportItems.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, item.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, item.id)}
                          className={`flex items-center gap-2 p-2 border rounded-md transition-all ${
                            draggedItemId === item.id ? "opacity-50 scale-95" : ""
                          } ${dragOverItemId === item.id ? "border-green-500 bg-green-50 border-2" : ""}`}
                        >
                          <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <Checkbox
                            checked={item.enabled}
                            onCheckedChange={(checked) => updateExportItem(item.id, { enabled: !!checked })}
                          />

                          <div className="flex-1">
                            <Input
                              value={item.name}
                              onChange={(e) => updateExportItem(item.id, { name: e.target.value })}
                              className="text-sm"
                            />
                            <div className="text-xs text-gray-500 mt-1">{getPresetSummary(item.preset)}</div>
                          </div>

                          <Select
                            value={item.format}
                            onValueChange={(value: "png" | "jpg") => updateExportItem(item.id, { format: value })}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="png">PNG</SelectItem>
                              <SelectItem value="jpg">JPG</SelectItem>
                            </SelectContent>
                          </Select>

                          {item.format === "jpg" && (
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={item.quality}
                              onChange={(e) => updateExportItem(item.id, { quality: Number(e.target.value) })}
                              className="w-16"
                            />
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExportItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Export Progress */}
                    {isExporting && (
                      <div className="space-y-2">
                        <div className="text-sm">Exporting: {currentExportName}</div>
                        <Progress value={exportProgress} />
                      </div>
                    )}

                    <Button
                      onClick={exportBulk}
                      disabled={exportItems.filter((item) => item.enabled).length === 0 || isExporting}
                      className="w-full"
                    >
                      {isExporting
                        ? "Exporting..."
                        : `Export ${exportItems.filter((item) => item.enabled).length} Items`}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
