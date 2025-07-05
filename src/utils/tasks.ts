import type { LayerPreset } from "@/types/project"
import { ProjectLoader } from "./project-loader"

export interface Layer {
  id: string
  name: string
  src: string
  file_path: string
  width: number
  height: number
  isVisible: boolean
  zIndex: number
}

export interface TaskContext {
  layers: Layer[]
  canvasWidth: number
  canvasHeight: number
  onApplyPreset?: (layerStates: Record<string, boolean>) => void
  onLoadProject?: (layers: Layer[], presets: LayerPreset[], canvasWidth: number, canvasHeight: number) => void
}

export interface ExportTask {
  type: "quick-export-png" | "quick-export-jpg" | "bulk-export"
  filename?: string
  quality?: number
  preset?: LayerPreset
}

export interface SaveTask {
  type: "save" | "save-as"
  filename?: string
}

export interface OpenTask {
  type: "open"
  file?: File
}

export type Task = ExportTask | SaveTask | OpenTask

export class TaskManager {
  private context: TaskContext

  constructor(context: TaskContext) {
    this.context = context
  }

  updateContext(context: TaskContext) {
    this.context = context
  }

  async executeTask(task: Task): Promise<void> {
    switch (task.type) {
      case "quick-export-png":
        return this.handleQuickExportPNG(task.filename)
      case "quick-export-jpg":
        return this.handleQuickExportJPG(task.filename, task.quality)
      case "bulk-export":
        return this.handleBulkExport()
      case "save":
        return this.handleSave(task.filename)
      case "save-as":
        return this.handleSaveAs(task.filename)
      case "open":
        return this.handleOpen(task.file)
      default:
        throw new Error(`Unknown task type: ${(task as any).type}`)
    }
  }

  private async handleQuickExportPNG(filename = "quick-export"): Promise<void> {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not create canvas context")
    }

    canvas.width = this.context.canvasWidth
    canvas.height = this.context.canvasHeight

    // Clear canvas
    ctx.clearRect(0, 0, this.context.canvasWidth, this.context.canvasHeight)

    // Get visible layers sorted by z-index
    const visibleLayers = this.context.layers.filter((layer) => layer.isVisible).sort((a, b) => a.zIndex - b.zIndex)

    if (visibleLayers.length === 0) {
      this.downloadCanvas(canvas, filename, "png")
      return
    }

    return new Promise((resolve, reject) => {
      let loadedImages = 0
      const totalImages = visibleLayers.length

      const checkComplete = () => {
        if (loadedImages === totalImages) {
          this.downloadCanvas(canvas, filename, "png")
          resolve()
        }
      }

      visibleLayers.forEach((layer) => {
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          ctx.drawImage(img, 0, 0, this.context.canvasWidth, this.context.canvasHeight)
          loadedImages++
          checkComplete()
        }

        img.onerror = () => {
          console.warn(`Failed to load layer: ${layer.name}`)
          loadedImages++
          checkComplete()
        }

        img.src = layer.src
      })
    })
  }

  private async handleQuickExportJPG(filename = "quick-export", quality = 90): Promise<void> {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not create canvas context")
    }

    canvas.width = this.context.canvasWidth
    canvas.height = this.context.canvasHeight

    // Fill white background for JPG
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, this.context.canvasWidth, this.context.canvasHeight)

    // Get visible layers sorted by z-index
    const visibleLayers = this.context.layers.filter((layer) => layer.isVisible).sort((a, b) => a.zIndex - b.zIndex)

    if (visibleLayers.length === 0) {
      this.downloadCanvas(canvas, filename, "jpg", quality)
      return
    }

    return new Promise((resolve, reject) => {
      let loadedImages = 0
      const totalImages = visibleLayers.length

      const checkComplete = () => {
        if (loadedImages === totalImages) {
          this.downloadCanvas(canvas, filename, "jpg", quality)
          resolve()
        }
      }

      visibleLayers.forEach((layer) => {
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          ctx.drawImage(img, 0, 0, this.context.canvasWidth, this.context.canvasHeight)
          loadedImages++
          checkComplete()
        }

        img.onerror = () => {
          console.warn(`Failed to load layer: ${layer.name}`)
          loadedImages++
          checkComplete()
        }

        img.src = layer.src
      })
    })
  }

  private async handleBulkExport(): Promise<void> {
    const event = new CustomEvent("open-bulk-export")
    window.dispatchEvent(event)
  }

  private async handleSave(filename?: string): Promise<void> {
    // Export current project as JSON
    const projectData = ProjectLoader.exportProject(
      this.context.layers,
      [], // Presets would be passed from context
      this.context.canvasWidth,
      this.context.canvasHeight,
    )

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename || "project"}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  private async handleSaveAs(filename?: string): Promise<void> {
    const userFilename = prompt("Enter filename:", filename || "project")
    if (userFilename) {
      return this.handleSave(userFilename)
    }
  }

  private async handleOpen(file?: File): Promise<void> {
    if (!file) {
      // Create file input to select file
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"
      input.onchange = (e) => {
        const selectedFile = (e.target as HTMLInputElement).files?.[0]
        if (selectedFile) {
          this.handleOpen(selectedFile)
        }
      }
      input.click()
      return
    }

    try {
      const projectData = await ProjectLoader.loadProjectFile(file)
      const layers = ProjectLoader.convertProjectLayersToRuntimeLayers(projectData.layers)

      // Convert presets to runtime format
      const presets = projectData.presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        layerStates: preset.layer_states,
        createdAt: new Date(preset.created_at),
      }))

      if (this.context.onLoadProject) {
        this.context.onLoadProject(layers, presets, projectData.canvas.width, projectData.canvas.height)
      }

      console.log("Project loaded successfully:", {
        layers: layers.length,
        presets: presets.length,
        canvas: projectData.canvas,
      })
    } catch (error) {
      console.error("Failed to load project:", error)
      alert(`Failed to load project: ${error}`)
    }
  }

  private downloadCanvas(canvas: HTMLCanvasElement, filename: string, format: "png" | "jpg", quality = 100): void {
    const link = document.createElement("a")
    link.download = `${filename}.${format}`

    if (format === "jpg") {
      link.href = canvas.toDataURL("image/jpeg", quality / 100)
    } else {
      link.href = canvas.toDataURL("image/png")
    }

    link.click()
  }
}

// Export utility functions for creating tasks
export const createQuickExportPNGTask = (filename?: string): ExportTask => ({
  type: "quick-export-png",
  filename,
})

export const createQuickExportJPGTask = (filename?: string, quality?: number): ExportTask => ({
  type: "quick-export-jpg",
  filename,
  quality,
})

export const createBulkExportTask = (): ExportTask => ({
  type: "bulk-export",
})

export const createSaveTask = (filename?: string): SaveTask => ({
  type: "save",
  filename,
})

export const createSaveAsTask = (filename?: string): SaveTask => ({
  type: "save-as",
  filename,
})

export const createOpenTask = (file?: File): OpenTask => ({
  type: "open",
  file,
})
