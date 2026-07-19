'use client';

import { useState } from 'react';
import { api } from '@/services/api';
import { Template, TemplateVariable } from '@/types';
import { Plus, Edit, Trash2, Copy, Download, FileText, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function TemplatePanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: '',
    variables: [] as TemplateVariable[],
  });

  const loadTemplates = async () => {
    try {
      const data = await api.templates.list();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newTemplate = await api.templates.create(formData.name, formData.content);
      setTemplates([...templates, newTemplate]);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    try {
      // Need update API
      setEditingTemplate(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await api.templates.delete(name);
      setTemplates(templates.filter(t => t.name !== name));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      content: '',
      description: '',
      variables: [],
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium">Templates</h3>
        <Button size="sm" onClick={() => { setShowCreateDialog(true); resetForm(); }}>
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p>No templates yet</p>
            <p className="text-sm">Create your first template to get started</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {templates.map((template) => (
              <TemplateItem
                key={template.name}
                template={template}
                onEdit={() => {
                  setEditingTemplate(template);
                  setFormData({
                    name: template.name,
                    content: template.content,
                    description: template.description || '',
                    variables: template.variables,
                  });
                }}
                onDelete={() => handleDelete(template.name)}
                onUse={() => console.log('Use template:', template.name)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              Define a template with variables using Tera/Jinja2 syntax.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., requirement.md"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Template description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={defaultTemplateContent}
                className="font-mono min-h-[300px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={editingTemplate ? handleUpdate : handleCreate}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateItem({ template, onEdit, onDelete, onUse }: { 
  template: Template; 
  onEdit: () => void; 
  onDelete: () => void;
  onUse: () => void;
}) {
  return (
    <div className="p-3 rounded-lg border border-border hover:bg-accent transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium truncate">{template.name}</span>
            {template.variables.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {template.variables.length} variables
              </span>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-muted-foreground truncate">{template.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onUse} title="Use template">
            <FileText className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete" className="text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const defaultTemplateContent = `---
id: "{{ spec_id }}"
title: "{{ title }}"
type: "requirement"
status: "draft"
priority: "P2"
tags: []
depends_on: []
author: "{{ author }}"
created: "{{ date }}"
updated: "{{ date }}"
version: "0.1.0"
---

# {{ title }}

## Context
<!-- Why is this needed? -->

## Requirement
<!-- Clear, verifiable description -->

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## References
- [[VIS-001]]
`;