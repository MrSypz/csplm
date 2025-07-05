import type { ProjectFile, ProjectLayer, Layer } from "@/types/project"

export class ProjectLoader {
  static isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window
  }

  static async loadProjectFile(file: File): Promise<ProjectFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const project: ProjectFile = JSON.parse(content)

          // Validate project structure
          if (!project.version) {
            throw new Error("Missing version field")
          }

          if (!project.canvas || typeof project.canvas.width !== 'number' || typeof project.canvas.height !== 'number') {
            throw new Error("Missing or invalid canvas dimensions")
          }

          if (!Array.isArray(project.layers)) {
            throw new Error("Missing or invalid layers array")
          }

          if (!Array.isArray(project.presets)) {
            throw new Error("Missing or invalid presets array")
          }

          // Validate canvas dimensions are reasonable
          if (project.canvas.width <= 0 || project.canvas.height <= 0) {
            throw new Error("Canvas dimensions must be positive")
          }

          if (project.canvas.width > 50000 || project.canvas.height > 50000) {
            throw new Error("Canvas dimensions are too large (max 50000px)")
          }

          console.log("✅ Project validation passed:", {
            version: project.version,
            canvas: project.canvas,
            layerCount: project.layers.length,
            presetCount: project.presets.length
          })

          resolve(project)
        } catch (error) {
          reject(new Error(`Failed to parse project file: ${error instanceof Error ? error.message : String(error)}`))
        }
      }

      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  static convertProjectLayersToRuntimeLayers(projectLayers: ProjectLayer[], projectDir?: string): Layer[] {
    console.log("🔄 Converting project layers to runtime layers:", projectLayers.length, "layers")

    const layers = projectLayers
        .sort((a, b) => a.z_index - b.z_index) // Sort by z_index
        .map((layer, index) => {
          // Validate layer data
          const width = layer.width > 0 ? layer.width : 1920
          const height = layer.height > 0 ? layer.height : 1080

          const runtimeLayer = {
            id: layer.id || `layer-${index}`,
            name: layer.name || `Layer ${index + 1}`,
            src: this.convertFilePathToSrc(layer.file_path, width, height, projectDir),
            file_path: layer.file_path || `./assets/layer_${index + 1}.png`,
            width,
            height,
            isVisible: typeof layer.is_visible === 'boolean' ? layer.is_visible : true,
            zIndex: typeof layer.z_index === 'number' ? layer.z_index : index,
          }

          console.log(`🎨 Converted layer ${index + 1}: ${runtimeLayer.name}`, {
            id: runtimeLayer.id,
            src: runtimeLayer.src,
            size: `${runtimeLayer.width}x${runtimeLayer.height}`,
            visible: runtimeLayer.isVisible,
            zIndex: runtimeLayer.zIndex
          })

          return runtimeLayer
        })

    console.log("✅ All layers converted:", layers.length)
    return layers
  }

  static convertRuntimeLayersToProjectLayers(layers: Layer[]): ProjectLayer[] {
    return layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      file_path: layer.file_path,
      width: layer.width,
      height: layer.height,
      is_visible: layer.isVisible,
      z_index: layer.zIndex,
    }))
  }

  static convertFilePathToSrc(filePath: string, width: number, height: number, projectDir?: string): string {
    if (this.isTauri() && projectDir && filePath) {
      console.log(`🔄 Tauri mode: ${filePath} will be resolved later with real assets`)
      return this.createPlaceholder(filePath.split('/').pop() || 'Layer', width, height)
    }

    if (filePath && filePath.includes("assets/")) {
      const filename = filePath.split("/").pop()
      if (filename) {
        const webAssetPath = `/project-assets/${filename}`
        console.log(`🌐 Web mode: ${filePath} -> ${webAssetPath}`)
        return webAssetPath
      }
    }

    // Fallback to placeholder if no asset file
    const filename = filePath ? filePath.split("/").pop()?.replace(/\.(png|jpg|jpeg)$/i, "") : "Layer"
    const placeholder = this.createPlaceholder(filename || "Layer", width, height)
    console.log(`📝 Fallback placeholder: ${placeholder}`)
    return placeholder
  }

  private static createPlaceholder(text: string, width: number, height: number): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0" stroke="#ddd" stroke-width="2"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
              font-family="Arial, sans-serif" font-size="24" fill="#666">
          ${text}
        </text>
        <text x="50%" y="60%" text-anchor="middle" dy="0.3em" 
              font-family="Arial, sans-serif" font-size="16" fill="#999">
          ${width}×${height}
        </text>
      </svg>
    `
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  static exportProject(layers: Layer[], presets: any[], canvasWidth: number, canvasHeight: number): ProjectFile {
    return {
      version: "1.0",
      canvas: {
        width: canvasWidth,
        height: canvasHeight,
      },
      layers: this.convertRuntimeLayersToProjectLayers(layers),
      presets: presets.map((preset) => ({
        id: preset.id,
        name: preset.name,
        layer_states: preset.layerStates || preset.layer_states,
        created_at: preset.createdAt ? preset.createdAt.toISOString() : preset.created_at || new Date().toISOString(),
      })),
    }
  }
}