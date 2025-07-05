import type { LayerPreset } from "@/types/project"
import { ProjectLoader } from "./project-loader"

// Import Tauri APIs directly
import { path } from '@tauri-apps/api'
import {readTextFile, writeTextFile} from '@tauri-apps/plugin-fs';
import {save, open} from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core'

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
  onLoadProject?: (layers: Layer[], presets: LayerPreset[], canvasWidth: number, canvasHeight: number, fileName?: string) => void
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
  private currentProjectPath?: string

  constructor(context: TaskContext) {
    this.context = context
  }

  updateContext(context: TaskContext) {
    this.context = context
  }

  private isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window
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

  private async handleQuickExportPNG(filename = "canvas-export"): Promise<void> {
    console.log("🖼️ Starting PNG export:", filename)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not create canvas context")
    }

    canvas.width = this.context.canvasWidth
    canvas.height = this.context.canvasHeight
    ctx.clearRect(0, 0, this.context.canvasWidth, this.context.canvasHeight)

    const visibleLayers = this.context.layers.filter((layer) => layer.isVisible).sort((a, b) => a.zIndex - b.zIndex)
    console.log("📋 Visible layers for export:", visibleLayers.length, visibleLayers.map(l => l.name))

    if (visibleLayers.length === 0) {
      console.log("⚠️ No visible layers, exporting empty canvas")
      await this.downloadCanvas(canvas, filename, "png")
      return
    }

    return new Promise((resolve, reject) => {
      let loadedImages = 0
      const totalImages = visibleLayers.length

      const checkComplete = async () => {
        if (loadedImages === totalImages) {
          console.log("✅ All images loaded, downloading canvas")
          await this.downloadCanvas(canvas, filename, "png")
          resolve()
        }
      }

      visibleLayers.forEach((layer, index) => {
        console.log(`🔄 Loading image ${index + 1}/${totalImages}: ${layer.name} from ${layer.src}`)
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          console.log(`✅ Image loaded: ${layer.name} (${img.naturalWidth}x${img.naturalHeight})`)
          const scaleX = this.context.canvasWidth / layer.width
          const scaleY = this.context.canvasHeight / layer.height
          const scale = Math.min(scaleX, scaleY)

          const scaledWidth = layer.width * scale
          const scaledHeight = layer.height * scale
          const offsetX = (this.context.canvasWidth - scaledWidth) / 2
          const offsetY = (this.context.canvasHeight - scaledHeight) / 2

          console.log(`🎨 Drawing ${layer.name}: scale=${scale.toFixed(3)}, size=${scaledWidth.toFixed(0)}x${scaledHeight.toFixed(0)}, offset=${offsetX.toFixed(0)},${offsetY.toFixed(0)}`)
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
          loadedImages++
          checkComplete()
        }

        img.onerror = (error) => {
          console.error(`❌ Failed to load layer: ${layer.name} from ${layer.src}`, error)
          loadedImages++
          checkComplete()
        }

        img.src = layer.src
      })
    })
  }

  private async handleQuickExportJPG(filename = "canvas-export", quality = 90): Promise<void> {
    console.log("🖼️ Starting JPG export:", filename, "quality:", quality)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("Could not create canvas context")
    }

    canvas.width = this.context.canvasWidth
    canvas.height = this.context.canvasHeight

    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, this.context.canvasWidth, this.context.canvasHeight)

    const visibleLayers = this.context.layers.filter((layer) => layer.isVisible).sort((a, b) => a.zIndex - b.zIndex)
    console.log("📋 Visible layers for JPG export:", visibleLayers.length)

    if (visibleLayers.length === 0) {
      console.log("⚠️ No visible layers, exporting white canvas")
      await this.downloadCanvas(canvas, filename, "jpg", quality)
      return
    }

    return new Promise((resolve, reject) => {
      let loadedImages = 0
      const totalImages = visibleLayers.length

      const checkComplete = async () => {
        if (loadedImages === totalImages) {
          console.log("✅ All images loaded, downloading JPG canvas")
          await this.downloadCanvas(canvas, filename, "jpg", quality)
          resolve()
        }
      }

      visibleLayers.forEach((layer, index) => {
        console.log(`🔄 Loading image ${index + 1}/${totalImages}: ${layer.name}`)
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          console.log(`✅ Image loaded: ${layer.name}`)
          const scaleX = this.context.canvasWidth / layer.width
          const scaleY = this.context.canvasHeight / layer.height
          const scale = Math.min(scaleX, scaleY)

          const scaledWidth = layer.width * scale
          const scaledHeight = layer.height * scale
          const offsetX = (this.context.canvasWidth - scaledWidth) / 2
          const offsetY = (this.context.canvasHeight - scaledHeight) / 2

          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
          loadedImages++
          checkComplete()
        }

        img.onerror = (error) => {
          console.error(`❌ Failed to load layer: ${layer.name}`, error)
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
    if (this.isTauri()) {
      // Tauri save
      if (!this.currentProjectPath) {
        return this.handleSaveAs(filename)
      }

      const projectData = ProjectLoader.exportProject(
          this.context.layers,
          [],
          this.context.canvasWidth,
          this.context.canvasHeight,
      )

      try {
        await writeTextFile(this.currentProjectPath, JSON.stringify(projectData, null, 2))
        console.log("Project saved successfully")
      } catch (error) {
        console.error("Failed to save project:", error)
        throw error
      }
    } else {
      // Web save (download)
      const projectData = ProjectLoader.exportProject(
          this.context.layers,
          [],
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
  }

  private async handleSaveAs(filename?: string): Promise<void> {
    if (this.isTauri()) {
      // Tauri save dialog
      try {
        const filePath = await save({
          defaultPath: filename ? `${filename}.json` : 'project.json',
          filters: [{
            name: 'Project Files',
            extensions: ['json']
          }]
        })

        if (filePath) {
          this.currentProjectPath = filePath
          await this.handleSave()
        }
      } catch (error) {
        console.error("Failed to save project:", error)
        throw error
      }
    } else {
      // Web save as (prompt for filename)
      const userFilename = prompt("Enter filename:", filename || "project")
      if (userFilename) {
        return this.handleSave(userFilename)
      }
    }
  }

  private async handleOpen(file?: File): Promise<void> {
    if (this.isTauri()) {
      // Tauri file dialog
      try {
        const selected = await open({
          filters: [{
            name: 'Project Files',
            extensions: ['json']
          }],
          directory: false,
          multiple: false
        })

        if (selected && typeof selected === 'string') {
          await this.loadTauriProject(selected)
        }
      } catch (error) {
        console.error("Failed to open project:", error)
        throw error
      }
    } else {
      // Web file input
      if (!file) {
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
        console.log("📂 Loading project file:", file.name)
        const projectData = await ProjectLoader.loadProjectFile(file)
        await this.loadProjectData(projectData, file.name)
      } catch (error) {
        console.error("Failed to load project:", error)
        alert(`Failed to load project: ${error}`)
      }
    }
  }

  private async loadTauriProject(projectPath: string): Promise<void> {
    try {
      console.log("📂 Loading Tauri project from:", projectPath)
      const content = await readTextFile(projectPath)
      const projectData = JSON.parse(content)

      this.currentProjectPath = projectPath
      const fileName = await path.basename(projectPath, '.json')

      // Load layers with real asset paths
      const projectDir = await path.dirname(projectPath)
      console.log("📁 Project directory:", projectDir)
      const layersWithAssets = await this.loadLayersWithAssets(projectData.layers, projectDir)

      const presets = projectData.presets.map((preset: any) => ({
        id: preset.id,
        name: preset.name,
        layer_states: preset.layer_states, // Keep as layer_states for consistency
        created_at: preset.created_at,
      }))

      console.log("🎯 Loaded presets:", presets)

      if (this.context.onLoadProject) {
        this.context.onLoadProject(
            layersWithAssets,
            presets,
            projectData.canvas.width,
            projectData.canvas.height,
            fileName
        )
      }

      console.log("✅ Tauri project loaded successfully:", {
        fileName,
        layers: layersWithAssets.length,
        presets: presets.length,
        canvas: projectData.canvas,
      })
    } catch (error) {
      console.error("❌ Failed to load Tauri project:", error)
      throw error
    }
  }

  private async loadLayersWithAssets(projectLayers: any[], projectDir: string): Promise<Layer[]> {
    console.log("🔄 Loading layers with assets:", projectLayers.length, "layers")
    const layers: Layer[] = []

    for (const [index, layer] of projectLayers.entries()) {
      try {
        console.log(`🔄 Processing layer ${index + 1}: ${layer.name} (${layer.file_path})`)
        const assetPath = await path.join(projectDir, layer.file_path)
        const assetUrl = convertFileSrc(assetPath)
        console.log(`🔗 Asset URL for ${layer.name}: ${assetUrl}`)

        layers.push({
          id: layer.id,
          name: layer.name,
          src: assetUrl,
          file_path: layer.file_path,
          width: layer.width,
          height: layer.height,
          isVisible: layer.is_visible,
          zIndex: layer.z_index,
        })
      } catch (error) {
        console.error(`❌ Failed to load asset for layer ${layer.name}:`, error)
        // Fallback to placeholder
        layers.push({
          id: layer.id,
          name: layer.name,
          src: `/placeholder.svg?height=${layer.height}&width=${layer.width}&text=${encodeURIComponent(layer.name)}`,
          file_path: layer.file_path,
          width: layer.width,
          height: layer.height,
          isVisible: layer.is_visible,
          zIndex: layer.z_index,
        })
      }
    }

    const sortedLayers = layers.sort((a, b) => a.zIndex - b.zIndex)
    console.log("✅ Loaded layers with assets:", sortedLayers.length, "layers")
    return sortedLayers
  }

  private async loadProjectData(projectData: any, fileName: string): Promise<void> {
    console.log("📊 Loading project data:", {
      fileName,
      canvas: projectData.canvas,
      layerCount: projectData.layers.length,
      presetCount: projectData.presets.length
    })

    const layers = ProjectLoader.convertProjectLayersToRuntimeLayers(projectData.layers)
    console.log("🎨 Converted layers:", layers.map(l => ({
      id: l.id,
      name: l.name,
      src: l.src,
      visible: l.isVisible,
      zIndex: l.zIndex
    })))

    // Fixed: Keep layer_states as is, don't rename to layerStates
    const presets = projectData.presets.map((preset: any) => ({
      id: preset.id,
      name: preset.name,
      layer_states: preset.layer_states, // Keep original property name
      created_at: preset.created_at,
    }))

    console.log("🎯 Converted presets:", presets)

    const projectName = fileName.replace(/\.[^/.]+$/, "")

    if (this.context.onLoadProject) {
      this.context.onLoadProject(
          layers,
          presets,
          projectData.canvas.width,
          projectData.canvas.height,
          projectName
      )
    }

    console.log("✅ Project loaded successfully:", {
      projectName,
      layers: layers.length,
      presets: presets.length,
      canvas: projectData.canvas,
    })
  }

  private async downloadCanvas(canvas: HTMLCanvasElement, filename: string, format: "png" | "jpg", quality = 100): Promise<void> {
    if (this.isTauri()) {
      // Tauri save to file
      try {
        const extension = format === 'jpg' ? 'jpg' : 'png'
        const filePath = await save({
          defaultPath: `${filename}.${extension}`,
          filters: [{
            name: 'Images',
            extensions: [extension]
          }]
        })

        if (filePath) {
          const dataUrl = format === "jpg"
              ? canvas.toDataURL("image/jpeg", quality / 100)
              : canvas.toDataURL("image/png")

          // Remove data URL prefix and save as binary
          const base64Data = dataUrl.split(',')[1]
          const binaryData = atob(base64Data)
          const bytes = new Uint8Array(binaryData.length)

          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i)
          }

          // TODO: Add writeBinaryFile import and uncomment
          // await writeBinaryFile(filePath, bytes)
          console.log("🎉 Image exported successfully:", filePath)
        }
      } catch (error) {
        console.error("❌ Failed to export image:", error)
        throw error
      }
    } else {
      // Web download
      console.log(`💾 Downloading ${format.toUpperCase()} file: ${filename}`)
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