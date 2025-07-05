import type { ProjectFile, ProjectLayer, Layer } from "@/types/project"

export class ProjectLoader {
  static async loadProjectFile(file: File): Promise<ProjectFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const project: ProjectFile = JSON.parse(content)

          // Validate project structure
          if (!project.version || !project.canvas || !project.layers) {
            throw new Error("Invalid project file format")
          }

          resolve(project)
        } catch (error) {
          reject(new Error(`Failed to parse project file: ${error}`))
        }
      }

      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  static convertProjectLayersToRuntimeLayers(projectLayers: ProjectLayer[]): Layer[] {
    return projectLayers
      .sort((a, b) => a.z_index - b.z_index) // Sort by z_index
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        src: this.convertFilePathToSrcWithDimensions(layer.file_path, layer.width, layer.height),
        file_path: layer.file_path,
        width: layer.width,
        height: layer.height,
        isVisible: layer.is_visible,
        zIndex: layer.z_index,
      }))
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

  static convertFilePathToSrcWithDimensions(filePath: string, width: number, height: number): string {
    if (filePath.includes("assets/")) {
      const filename =
        filePath.split("/").pop()?.replace(".png", "").replace(".jpg", "").replace(".jpeg", "") || "Layer"
      return `/placeholder.svg?height=${height}&width=${width}&text=${encodeURIComponent(filename)}`
    }
    return `/placeholder.svg?height=${height}&width=${width}&text=Layer`
  }

  static createEmptyProject(): ProjectFile {
    return {
      version: "1.0",
      canvas: {
        width: 6000,
        height: 6000,
      },
      layers: [],
      presets: [],
    }
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
        layer_states: preset.layerStates,
        created_at: preset.createdAt.toISOString(),
      })),
    }
  }
}
