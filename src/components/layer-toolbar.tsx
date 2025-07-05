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
import { ZoomIn, ZoomOut, Maximize, RotateCcw, Move, Menu, FileIcon as FileOpen, Save, Download } from "lucide-react"

interface LayerToolbarProps {
  zoom: number
  canvasWidth?: number
  canvasHeight?: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToScreen: () => void
  onActualSize: () => void
  onOpen?: () => void
  onSave?: () => void
  onSaveAs?: () => void
  onQuickExportPNG?: () => void
  onQuickExportJPG?: () => void
  onBulkExport?: () => void
}

export default function LayerToolbar({
  zoom,
  canvasWidth,
  canvasHeight,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onActualSize,
  onOpen,
  onSave,
  onSaveAs,
  onQuickExportPNG,
  onQuickExportJPG,
  onBulkExport,
}: LayerToolbarProps) {
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
            <DropdownMenuItem onClick={onOpen}>
              <FileOpen className="w-4 h-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveAs}>
              <Save className="w-4 h-4 mr-2" />
              Save As...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
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
        <Button variant="outline" size="sm" onClick={onActualSize} title="Actual Size">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Right - Navigation Info */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="hidden md:flex items-center gap-1">
          <span>
            Canvas: {canvasWidth || 6000}×{canvasHeight || 6000}px
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
