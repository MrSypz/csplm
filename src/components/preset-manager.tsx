"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Save, FolderOpen, Trash2, GripVertical } from "lucide-react"
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

interface PresetManagerProps {
  layers: Layer[]
  presets: LayerPreset[]
  setPresets: (presets: LayerPreset[]) => void
  onApplyPreset: (layerStates: Record<string, boolean>) => void
}

export default function PresetManager({ layers, presets, setPresets, onApplyPreset }: PresetManagerProps) {
  const [newPresetName, setNewPresetName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [draggedPresetId, setDraggedPresetId] = useState<string | null>(null)
  const [dragOverPresetId, setDragOverPresetId] = useState<string | null>(null)

  const savePreset = () => {
    if (!newPresetName.trim()) return

    const layerStates: Record<string, boolean> = {}
    layers.forEach((layer) => {
      layerStates[layer.id] = layer.isVisible
    })

    const newPreset: LayerPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      layer_states: layerStates,
      created_at: new Date().toISOString(),
    }

    console.log("Saving new preset:", newPreset)
    setPresets([...presets, newPreset])
    setNewPresetName("")
    setIsDialogOpen(false)
  }

  const applyPreset = (preset: LayerPreset) => {
    console.log("Applying preset:", preset.name, preset.layer_states || preset.layerStates)

    // Handle both layer_states and layerStates for compatibility
    const layerStates = preset.layer_states || (preset as any).layerStates || {}
    onApplyPreset(layerStates)
  }

  const deletePreset = (presetId: string) => {
    console.log("Deleting preset:", presetId)
    setPresets(presets.filter((p) => p.id !== presetId))
  }

  const getPresetSummary = (preset: LayerPreset) => {
    console.log("Getting summary for preset:", preset.name, "layer_states:", preset.layer_states, "layerStates:", (preset as any).layerStates)

    // Handle both layer_states and layerStates for compatibility
    const layerStates = preset.layer_states || (preset as any).layerStates

    if (!layerStates || typeof layerStates !== 'object') {
      console.warn("Invalid layer states for preset:", preset.name, layerStates)
      return "Invalid preset"
    }

    try {
      const visibleCount = Object.values(layerStates).filter(Boolean).length
      const totalCount = Object.keys(layerStates).length
      return `${visibleCount}/${totalCount} visible`
    } catch (error) {
      console.error("Error generating preset summary:", error, preset)
      return "Error"
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, presetId: string) => {
    setDraggedPresetId(presetId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", presetId)
  }

  const handleDragEnd = () => {
    setDraggedPresetId(null)
    setDragOverPresetId(null)
  }

  const handleDragOver = (e: React.DragEvent, presetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (draggedPresetId && draggedPresetId !== presetId) {
      setDragOverPresetId(presetId)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverPresetId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData("text/plain")

    if (draggedId && draggedId !== targetId) {
      setPresets((prev) => {
        const draggedIndex = prev.findIndex((preset) => preset.id === draggedId)
        const targetIndex = prev.findIndex((preset) => preset.id === targetId)

        if (draggedIndex === -1 || targetIndex === -1) return prev

        const newPresets = [...prev]
        const [draggedPreset] = newPresets.splice(draggedIndex, 1)
        newPresets.splice(targetIndex, 0, draggedPreset)

        return newPresets
      })
    }

    setDraggedPresetId(null)
    setDragOverPresetId(null)
  }

  // Debug logging
  console.log("PresetManager render - presets:", presets.length, presets)

  return (
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Layer Presets</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" title="Save Current Layer State" disabled={layers.length === 0}>
                <Save className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save Layer Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="preset-name" className="text-sm font-medium">
                    Preset Name
                  </label>
                  <Input
                      id="preset-name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Enter preset name..."
                      className="mt-1"
                      onKeyDown={(e) => e.key === "Enter" && savePreset()}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Current state: {layers.filter((l) => l.isVisible).length}/{layers.length} layers visible
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={savePreset} disabled={!newPresetName.trim()}>
                    Save Preset
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {presets.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">
              {layers.length === 0 ? "Load a project to create presets" : "No presets saved yet"}
            </div>
        ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {presets.map((preset) => (
                  <div
                      key={preset.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, preset.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, preset.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, preset.id)}
                      className={`flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 transition-all ${
                          draggedPresetId === preset.id ? "opacity-50 scale-95" : ""
                      } ${dragOverPresetId === preset.id ? "border-green-500 bg-green-50 border-2" : ""}`}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="flex-1 justify-start h-auto p-1"
                        title="Apply this preset"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <FolderOpen className="w-3 h-3 text-gray-500" />
                        <div className="flex-1 text-left">
                          <div className="text-xs font-medium truncate">{preset.name}</div>
                          <div className="text-xs text-gray-500">{getPresetSummary(preset)}</div>
                        </div>
                      </div>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePreset(preset.id)}
                        className="p-1 h-auto text-red-500 hover:text-red-700"
                        title="Delete preset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
              ))}
            </div>
        )}
      </div>
  )
}