"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import LayerItem from "./layer-item"
import PresetManager from "./preset-manager"
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

interface LayerPanelProps {
  layers: Layer[]
  selectedLayerId: string | null
  canvasWidth: number
  canvasHeight: number
  zoom: number
  panX: number
  panY: number
  viewportWidth: number
  viewportHeight: number
  presets: LayerPreset[]
  onLayerToggleVisibility: (id: string) => void
  onLayerSelect: (id: string) => void
  onPanChange: (x: number, y: number) => void
  onAddLayer: () => void
  onDeleteLayer: (id: string) => void
  onApplyPreset: (layerStates: Record<string, boolean>) => void
  onReorderLayers: (draggedId: string, targetId: string) => void
  onPresetsChange: (presets: LayerPreset[]) => void
}

export default function LayerPanel({
  layers,
  selectedLayerId,
  canvasWidth,
  canvasHeight,
  presets,
  onLayerToggleVisibility,
  onLayerSelect,
  onAddLayer,
  onDeleteLayer,
  onApplyPreset,
  onReorderLayers,
  onPresetsChange,
}: LayerPanelProps) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", layerId)
  }

  const handleDragEnd = () => {
    setDraggedLayerId(null)
    setDragOverLayerId(null)
  }

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (draggedLayerId && draggedLayerId !== layerId) {
      setDragOverLayerId(layerId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverLayerId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData("text/plain")

    if (draggedId && draggedId !== targetId) {
      onReorderLayers(draggedId, targetId)
    }

    setDraggedLayerId(null)
    setDragOverLayerId(null)
  }

  // Sort layers by z-index for display (highest z-index first in UI)
  const displayLayers = layers.slice().sort((a, b) => b.zIndex - a.zIndex)

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Layer Panel Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-800">Layers</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onAddLayer} title="Add Layer">
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedLayerId && onDeleteLayer(selectedLayerId)}
              disabled={!selectedLayerId}
              title="Delete Layer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {layers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No layers loaded</p>
            <p className="text-xs mt-1">Open a project file to get started</p>
          </div>
        ) : (
          displayLayers.map((layer) => (
            <LayerItem
              key={layer.id}
              id={layer.id}
              name={layer.name}
              src={layer.src}
              width={layer.width}
              height={layer.height}
              isVisible={layer.isVisible}
              isSelected={selectedLayerId === layer.id}
              isDragging={draggedLayerId === layer.id}
              isDragOver={dragOverLayerId === layer.id}
              zIndex={layer.zIndex}
              onToggleVisibility={onLayerToggleVisibility}
              onSelect={onLayerSelect}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      {/* Layer Stats */}
      <div className="p-3 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex justify-between mb-1">
          <span>
            {layers.filter((l) => l.isVisible).length} of {layers.length} visible
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Canvas: {canvasWidth}×{canvasHeight}px
        </div>
      </div>

      {/* Preset Manager */}
      <PresetManager layers={layers} presets={presets} setPresets={onPresetsChange} onApplyPreset={onApplyPreset} />
    </div>
  )
}
