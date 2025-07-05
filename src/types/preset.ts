export interface LayerPreset {
  id: string
  name: string
  layerStates: Record<string, boolean> // layerId -> isVisible
  createdAt: Date
}
