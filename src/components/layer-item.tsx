"use client"

import type React from "react"
import Image from "next/image"
import { Switch } from "@/components/ui/switch"
import { Eye, EyeOff, GripVertical } from "lucide-react"

interface LayerItemProps {
  id: string
  name: string
  src: string
  width: number
  height: number
  isVisible: boolean
  isSelected: boolean
  isDragging: boolean
  isDragOver: boolean
  zIndex: number
  onToggleVisibility: (id: string) => void
  onSelect: (id: string) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetId: string) => void
}

export default function LayerItem({
  id,
  name,
  src,
  width,
  height,
  isVisible,
  isSelected,
  isDragging,
  isDragOver,
  zIndex,
  onToggleVisibility,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: LayerItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, id)}
      className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-all ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
      } ${isDragging ? "opacity-50 scale-95" : ""} ${isDragOver ? "border-green-500 bg-green-50 border-2" : ""}`}
      onClick={() => onSelect(id)}
    >
      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
        <GripVertical className="w-4 h-4" />
      </div>

      <Switch
        checked={isVisible}
        onCheckedChange={() => onToggleVisibility(id)}
        onClick={(e) => e.stopPropagation()}
      />
      {isVisible ? <Eye className="w-4 h-4 text-gray-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}

      <div className="relative w-10 h-10 border rounded overflow-hidden bg-gray-100 flex-shrink-0">
        <Image src={src || "/placeholder.svg"} alt={name} fill className="object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{name}</div>
        <div className="text-xs text-gray-500">
          {width}×{height} • Z:{zIndex}
        </div>
      </div>
    </div>
  )
}
