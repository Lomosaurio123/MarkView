'use client';

import { useEffect, useRef, useState } from 'react';
import { useFileStore } from '@/store/fileStore';
import { api } from '@/services/api';
import { GraphData, GraphNode, GraphEdge } from '@/types';
import { Loader2, Minus, Plus, Search, Target, Filter, Layout, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ForceGraphNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function GraphPanel() {
  const { tree } = useFileStore();
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string[]>([]);
  const [layoutType, setLayoutType] = useState<'force' | 'hierarchical'>('force');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const nodesRef = useRef<ForceGraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  const loadGraph = async () => {
    setIsLoading(true);
    try {
      const data = await api.graph.build('');
      setGraphData(data);
      if (data) {
        nodesRef.current = data.nodes.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 }));
        edgesRef.current = data.edges;
        initializePositions();
      }
    } catch (error) {
      console.error('Failed to load graph:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializePositions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    nodesRef.current.forEach((node, i) => {
      const angle = (i / nodesRef.current.length) * Math.PI * 2;
      const radius = Math.min(width, height) * 0.3;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });
  };

  useEffect(() => {
    loadGraph();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;
      initializePositions();
    });
    
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;
    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      
      if (layoutType === 'force') {
        simulateForce(dt);
      }
      
      draw(ctx);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [layoutType]);

  const simulateForce = (dt: number) => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const k = 0.01; // Spring constant
    const repulsion = 1000;
    const damping = 0.9;
    
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }
    
    // Attraction (edges)
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = k * dist;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });
    
    // Update positions
    nodes.forEach(node => {
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx * dt * 60;
      node.y += node.vy * dt * 60;
      
      // Boundary constraints
      const canvas = canvasRef.current;
      if (canvas) {
        const margin = 50;
        node.x = Math.max(margin, Math.min(canvas.width - margin, node.x));
        node.y = Math.max(margin, Math.min(canvas.height - margin, node.y));
      }
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const nodes = getFilteredNodes();
    const edges = getFilteredEdges(nodes);
    
    // Draw edges
    ctx.strokeStyle = '#64748b40';
    ctx.lineWidth = 1 * dpr;
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;
      
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const color = getNodeColor(node.type);
      const statusColor = getStatusColor(node.status);
      
      // Outer ring (status)
      ctx.beginPath();
      ctx.arc(node.x, node.y, 18 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = statusColor;
      ctx.fill();
      
      // Inner circle (type)
      ctx.beginPath();
      ctx.arc(node.x, node.y, 14 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Label
      ctx.fillStyle = '#1e293b';
      ctx.font = `11px ${dpr} system-ui`;
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 28 * dpr);
    });
  };

  const getFilteredNodes = () => {
    let nodes = nodesRef.current;
    
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      nodes = nodes.filter(n => 
        n.label.toLowerCase().includes(lowerFilter) ||
        n.id.toLowerCase().includes(lowerFilter) ||
        n.type.toLowerCase().includes(lowerFilter)
      );
    }
    
    if (nodeTypeFilter.length > 0) {
      nodes = nodes.filter(n => nodeTypeFilter.includes(n.type));
    }
    
    return nodes;
  };

  const getFilteredEdges = (nodes: ForceGraphNode[]) => {
    const nodeIds = new Set(nodes.map(n => n.id));
    return edgesRef.current.filter(e => 
      nodeIds.has(e.source) && nodeIds.has(e.target)
    );
  };

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      requirement: '#3b82f6',
      design: '#8b5cf6',
      task: '#f59e0b',
      adr: '#ec4899',
      vision: '#06b6d4',
      glossary: '#84cc16',
    };
    return colors[type] || '#64748b';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#94a3b8',
      review: '#f59e0b',
      approved: '#22c55e',
      implemented: '#3b82f6',
      deprecated: '#ef4444',
      archived: '#64748b',
    };
    return colors[status] || '#64748b';
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedNode = nodesRef.current.find(node => {
      const dx = node.x / window.devicePixelRatio - x;
      const dy = node.y / window.devicePixelRatio - y;
      return Math.sqrt(dx * dx + dy * dy) < 18;
    });
    
    if (clickedNode) {
      // Navigate to file
      console.log('Navigate to:', clickedNode.path);
    }
  };

  const uniqueTypes = [...new Set(nodesRef.current.map(n => n.type))];
  const uniqueStatuses = [...new Set(nodesRef.current.map(n => n.status))];

  return (
    <div className="flex h-full flex-col">
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter nodes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={nodeTypeFilter.join(',')} onValueChange={(v) => setNodeTypeFilter(v ? v.split(',') : [])}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Node types" />
            </SelectTrigger>
            <SelectContent>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={layoutType} onValueChange={(v) => setLayoutType(v as 'force' | 'hierarchical')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="force">Force Directed</SelectItem>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={loadGraph} disabled={isLoading} title="Reload">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab"
          onClick={handleCanvasClick}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Legend:</span>
            {uniqueTypes.map(type => (
              <span key={type} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getNodeColor(type) }} />
                {type}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span>Status:</span>
            {uniqueStatuses.map(status => (
              <span key={status} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(status) }} />
                {status}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}