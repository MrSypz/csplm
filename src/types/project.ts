export interface ProjectLayer {
  id: string
  name: string
  file_path: string
  width: number
  height: number
  is_visible: boolean
  z_index: number
}

export interface LayerPreset {
  id: string
  name: string
  layer_states: Record<string, boolean>
  created_at: string
}

export interface ProjectCanvas {
  width: number
  height: number
}

export interface ProjectFile {
  version: string
  canvas: ProjectCanvas
  layers: ProjectLayer[]
  presets: LayerPreset[]
}

// Runtime layer interface (with converted src for web display)
export interface Layer {
  id: string
  name: string
  src: string // Converted from file_path for web display
  file_path: string // Original file path
  width: number
  height: number
  isVisible: boolean
  zIndex: number
}
