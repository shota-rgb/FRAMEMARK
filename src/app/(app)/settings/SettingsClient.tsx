'use client'

import { useState } from 'react'
import { Settings, Plus, Trash2, GripVertical, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, CommentTemplate } from '@/lib/types'

interface SettingsClientProps {
  workspace: Workspace
  templates: CommentTemplate[]
}

export default function SettingsClient({ workspace: initialWorkspace, templates: initialTemplates }: SettingsClientProps) {
  const supabase = createClient()
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [workspaceName, setWorkspaceName] = useState(initialWorkspace.name)
  const [templates, setTemplates] = useState(initialTemplates)
  const [newTemplate, setNewTemplate] = useState('')
  const [saving, setSaving] = useState(false)
  const [addingSaving, setAddingSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSaveWorkspace() {
    setSaving(true)
    const { error } = await supabase
      .from('workspaces')
      .update({ name: workspaceName.trim() })
      .eq('id', workspace.id)
    if (!error) {
      setWorkspace({ ...workspace, name: workspaceName.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function handleAddTemplate() {
    if (!newTemplate.trim()) return
    setAddingSaving(true)
    const { data, error } = await supabase
      .from('comment_templates')
      .insert({
        workspace_id: workspace.id,
        content: newTemplate.trim(),
        sort_order: templates.length,
      })
      .select()
      .single()
    if (!error && data) {
      setTemplates((prev) => [...prev, data])
      setNewTemplate('')
    }
    setAddingSaving(false)
  }

  async function handleDeleteTemplate(id: string) {
    const { error } = await supabase.from('comment_templates').delete().eq('id', id)
    if (!error) setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-[#666]" />
        <h1 className="text-white font-bold text-lg">設定</h1>
      </div>

      {/* Workspace settings */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
        <h2 className="text-white font-medium mb-4">ワークスペース</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[#888] mb-1.5">ワークスペース名</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            onClick={handleSaveWorkspace}
            disabled={saving || workspaceName.trim() === workspace.name}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? '保存しました！' : '保存'}
          </button>
        </div>
      </div>

      {/* Template settings */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
        <h2 className="text-white font-medium mb-1">修正指示テンプレート</h2>
        <p className="text-[#555] text-sm mb-4">よく使う修正指示をテンプレートとして登録します</p>

        <div className="space-y-2 mb-4">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-[#252525] border border-[#333] rounded-xl">
              <GripVertical className="w-4 h-4 text-[#444] flex-shrink-0" />
              <span className="flex-1 text-sm text-[#ccc]">{t.content}</span>
              <button
                onClick={() => handleDeleteTemplate(t.id)}
                className="text-[#444] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {templates.length === 0 && (
            <p className="text-[#444] text-sm py-2">テンプレートがありません</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newTemplate}
            onChange={(e) => setNewTemplate(e.target.value)}
            placeholder="例：【カット】この部分を削除してください"
            className="flex-1 bg-[#252525] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-indigo-500 transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTemplate()}
          />
          <button
            onClick={handleAddTemplate}
            disabled={addingSaving || !newTemplate.trim()}
            className="px-3 py-2.5 bg-[#252525] hover:bg-[#333] border border-[#333] disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
