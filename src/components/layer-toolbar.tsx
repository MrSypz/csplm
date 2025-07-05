"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Move, Menu, FileIcon as FileOpen, Save, Download, Plus } from "lucide-react"

interface LayerToolbarProps {
  zoom: number
  canvasWidth?: number
  canvasHeight?: number
  isProjectLoaded?: boolean
  projectName?: string | null
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onActualSize: () => void
  onOpen?: () => void
  onSave?: () => void
  onSaveAs?: () => void
  onNewProject?: () => void
  onQuickExportPNG?: () => void
  onQuickExportJPG?: () => void
  onBulkExport?: () => void
}

export default function LayerToolbar({
                                       zoom,
                                       canvasWidth,
                                       canvasHeight,
                                       isProjectLoaded = false,
                                       projectName,
                                       onZoomIn,
                                       onZoomOut,
                                       onFitToScreen,
                                       onActualSize,
                                       onOpen,
                                       onSave,
                                       onSaveAs,
                                       onNewProject,
                                       onQuickExportPNG,
                                       onQuickExportJPG,
                                       onBulkExport,
                                     }: LayerToolbarProps) {
  const formatCanvasSize = (width?: number, height?: number) => {
    if (!width || !height) return "Unknown"

    // Common resolution names
    if (width === 1920 && height === 1080) return "1920×1080 (Full HD)"
    if (width === 3840 && height === 2160) return "3840×2160 (4K)"
    if (width === 1280 && height === 720) return "1280×720 (HD)"
    if (width === 2560 && height === 1440) return "2560×1440 (QHD)"
    if (width === 1366 && height === 768) return "1366×768"
    if (width === 1024 && height === 768) return "1024×768 (XGA)"
    if (width === height) return `${width}×${height} (Square)`

    return `${width}×${height}`
  }

  return (
      <div className="flex items-center justify-between gap-2 p-3 bg-gray-50 border-b">
        {/* Menu Bar */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="w-4 h-4 mr-1" />
                File
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onNewProject}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpen}>
                <FileOpen className="w-4 h-4 mr-2" />
                Open Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSave} disabled={!isProjectLoaded}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSaveAs} disabled={!isProjectLoaded}>
                <Save className="w-4 h-4 mr-2" />
                Save As...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={!isProjectLoaded}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={onQuickExportPNG}>
                    <Download className="w-4 h-4 mr-2" />
                    Quick Export PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onQuickExportJPG}>
                    <Download className="w-4 h-4 mr-2" />
                    Quick Export JPG
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onBulkExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Bulk Export
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Project Status */}
          {isProjectLoaded && projectName && (
              <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border">
                📁 {projectName}
              </div>
          )}
        </div>

        {/* Center - Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onZoomOut} disabled={zoom <= 0.1}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-mono min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={onZoomIn} disabled={zoom >= 10}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <Button variant="outline" size="sm" onClick={onFitToScreen} title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onActualSize} title="Actual Size (100%)">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Right - Canvas Info and Navigation */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="hidden md:flex items-center gap-1">
          <span title={`Canvas dimensions: ${canvasWidth}×${canvasHeight} pixels`}>
            📐 {formatCanvasSize(canvasWidth, canvasHeight)}
          </span>
          </div>
          <div className="flex items-center gap-1">
            <Move className="w-3 h-3" />
            <span className="hidden sm:inline">Spacebar+Drag, Alt+Drag or Middle Mouse to Pan</span>
            <span className="sm:hidden">Pan: Space+Drag</span>
          </div>
        </div>
      </div>
  )
}