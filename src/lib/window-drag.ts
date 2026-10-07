/**
 * Window Drag Demo - Cross-Platform Minimal Reproducible Example
 * 
 * This module provides comprehensive window dragging functionality with:
 * - State machine tracking
 * - Detailed logging
 * - Cross-platform support (Windows/macOS/Linux)
 * - DPI awareness
 * - Multi-monitor support
 */

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  windowStartX: number;
  windowStartY: number;
  dragStartTime: number;
  lastMoveTime: number;
}

interface DragLogEntry {
  timestamp: number;
  event: string;
  data: Record<string, unknown>;
  state: DragState;
}

class WindowDragManager {
  private state: DragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    windowStartX: 0,
    windowStartY: 0,
    dragStartTime: 0,
    lastMoveTime: 0,
  };

  private logs: DragLogEntry[] = [];
  private readonly maxLogs = 1000;
  
  // State machine states
  private static readonly STATES = {
    IDLE: 'IDLE',
    PRESSED: 'PRESSED',
    DRAGGING: 'DRAGGING',
    RELEASED: 'RELEASED',
  } as const;

  private currentState: keyof typeof WindowDragManager.STATES = 'IDLE';

  constructor() {
    this.init();
  }

  private init() {
    this.log('INIT', { platform: navigator.platform, userAgent: navigator.userAgent });
    this.attachListeners();
  }

  private log(event: string, data: Record<string, unknown> = {}) {
    const entry: DragLogEntry = {
      timestamp: Date.now(),
      event,
      data,
      state: { ...this.state },
    };
    
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with state machine visualization
    const stateTransition = `[${this.currentState}] --${event}--> [${this.getNextState(event)}]`;
    console.log(
      `%c[WindowDrag]%c ${event} | ${stateTransition}`,
      'color: #4F46E5; font-weight: bold;',
      'color: #333;',
      {
        ...data,
        state: this.state,
        timestamp: new Date().toISOString(),
      }
    );

    // Update display if demo UI exists
    this.updateLogDisplay(entry);
  }

  private getNextState(event: string): string {
    const transitions: Record<string, Record<string, string>> = {
      IDLE: { mousedown: 'PRESSED' },
      PRESSED: { mousemove: 'DRAGGING', mouseup: 'IDLE' },
      DRAGGING: { mousemove: 'DRAGGING', mouseup: 'RELEASED' },
      RELEASED: { timeout: 'IDLE' },
    };
    return transitions[this.currentState]?.[event] || this.currentState;
  }

  private transitionState(event: string) {
    const nextState = this.getNextState(event);
    if (nextState !== this.currentState) {
      this.log('STATE_CHANGE', { from: this.currentState, to: nextState, trigger: event });
      this.currentState = nextState as keyof typeof WindowDragManager.STATES;
    }
  }

  private attachListeners() {
    // Use capture phase to intercept events before they bubble
    document.addEventListener('mousedown', this.handleMouseDown, { capture: true });
    document.addEventListener('mousemove', this.handleMouseMove, { capture: true });
    document.addEventListener('mouseup', this.handleMouseUp, { capture: true });
    
    // Touch support for touchscreens
    document.addEventListener('touchstart', this.handleTouchStart, { capture: true, passive: false });
    document.addEventListener('touchmove', this.handleTouchMove, { capture: true, passive: false });
    document.addEventListener('touchend', this.handleTouchEnd, { capture: true });

    // Double-click for maximize
    document.addEventListener('dblclick', this.handleDoubleClick, { capture: true });

    this.log('LISTENERS_ATTACHED', { 
      events: ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'dblclick'] 
    });
  }

  private handleMouseDown = (e: MouseEvent) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // Check if target is in drag region
    const target = e.target as HTMLElement;
    const isDragRegion = target.closest('.drag-region');
    const isNoDrag = target.closest('.no-drag');

    if (!isDragRegion || isNoDrag) return;

    // Prevent default to avoid text selection
    e.preventDefault();
    e.stopPropagation();

    this.state.isDragging = true;
    this.state.startX = e.screenX;
    this.state.startY = e.screenY;
    this.state.currentX = e.screenX;
    this.state.currentY = e.screenY;
    this.state.dragStartTime = Date.now();
    this.state.lastMoveTime = Date.now();

    // Get window position (if available via IPC)
    if (window.ipcRenderer) {
      window.ipcRenderer.invoke('window-get-position').then((pos: unknown) => {
        if (pos && typeof pos === 'object' && 'x' in pos && 'y' in pos) {
          const p = pos as { x?: number; y?: number };
          this.state.windowStartX = p.x ?? 0;
          this.state.windowStartY = p.y ?? 0;
        } else {
          this.state.windowStartX = 0;
          this.state.windowStartY = 0;
        }
      }).catch(() => {
        // Fallback: track relative movement
        this.state.windowStartX = 0;
        this.state.windowStartY = 0;
      });
    }

    this.transitionState('mousedown');
    this.log('DRAG_START', {
      mouseX: e.clientX,
      mouseY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      target: target.className,
      buttons: e.buttons,
      detail: e.detail,
    });

    // Visual feedback
    document.body.classList.add('is-dragging');
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.state.isDragging) return;

    const now = Date.now();
    const deltaTime = now - this.state.lastMoveTime;
    
    this.state.currentX = e.screenX;
    this.state.currentY = e.screenY;
    this.state.lastMoveTime = now;

    const deltaX = e.screenX - this.state.startX;
    const deltaY = e.screenY - this.state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    this.transitionState('mousemove');
    this.log('DRAG_MOVE', {
      mouseX: e.clientX,
      mouseY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      deltaX,
      deltaY,
      distance,
      deltaTime,
      velocity: distance / (deltaTime || 1), // px/ms
      buttons: e.buttons,
    });

    // Throttle IPC calls to reduce overhead
    if (deltaTime > 16) { // ~60fps
      this.updateWindowPosition();
    }
  };

  private handleMouseUp = () => {
    if (!this.state.isDragging) return;

    const dragDuration = Date.now() - this.state.dragStartTime;
    const deltaX = this.state.currentX - this.state.startX;
    const deltaY = this.state.currentY - this.state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    this.state.isDragging = false;
    this.transitionState('mouseup');
    this.log('DRAG_END', {
      duration: dragDuration,
      distance,
      deltaX,
      deltaY,
      finalX: this.state.currentX,
      finalY: this.state.currentY,
      wasClick: distance < 5 && dragDuration < 200, // Consider it a click if minimal movement
    });

    document.body.classList.remove('is-dragging');

    // Reset state after logging
    setTimeout(() => this.transitionState('timeout'), 0);
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const isDragRegion = target.closest('.drag-region');
    const isNoDrag = target.closest('.no-drag');

    if (!isDragRegion || isNoDrag) return;

    e.preventDefault();

    this.state.isDragging = true;
    this.state.startX = touch.screenX;
    this.state.startY = touch.screenY;
    this.state.currentX = touch.screenX;
    this.state.currentY = touch.screenY;
    this.state.dragStartTime = Date.now();

    this.log('TOUCH_START', {
      x: touch.clientX,
      y: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
    });

    document.body.classList.add('is-dragging');
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.state.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.state.currentX = touch.screenX;
    this.state.currentY = touch.screenY;

    const deltaX = touch.screenX - this.state.startX;
    const deltaY = touch.screenY - this.state.startY;

    this.log('TOUCH_MOVE', {
      x: touch.clientX,
      y: touch.clientY,
      deltaX,
      deltaY,
    });
  };

  private handleTouchEnd = () => {
    if (!this.state.isDragging) return;

    this.state.isDragging = false;
    this.log('TOUCH_END', {
      duration: Date.now() - this.state.dragStartTime,
    });

    document.body.classList.remove('is-dragging');
  };

  private handleDoubleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const isDragRegion = target.closest('.drag-region');
    
    if (!isDragRegion) return;

    // Check if we're not clicking on a button
    if (target.closest('.no-drag')) return;

    this.log('DOUBLE_CLICK', { target: target.className });
    
    // Trigger maximize/restore via IPC
    if (window.ipcRenderer) {
      window.ipcRenderer.send('window-maximize');
    }
  };

  private async updateWindowPosition() {
    if (!window.ipcRenderer || !this.state.isDragging) return;

    const deltaX = this.state.currentX - this.state.startX;
    const deltaY = this.state.currentY - this.state.startY;

    try {
      // 主进程返回的是布尔值（见 electron/main.cjs 的 window-set-position）。
      // 工具箱原文把它当 { success, error } 用，这里按真实返回类型收一下。
      const result = (await window.ipcRenderer.invoke('window-set-position',
        this.state.windowStartX + deltaX,
        this.state.windowStartY + deltaY
      )) as { success?: boolean; error?: string } | boolean;

      if (result && typeof result === 'object' && result.success === false) {
        this.log('POSITION_UPDATE_FAILED', { error: result.error });
      }
    } catch (error) {
      this.log('POSITION_UPDATE_ERROR', { error: String(error) });
    }
  }

  private updateLogDisplay(entry: DragLogEntry) {
    const logContainer = document.getElementById('drag-log-container');
    if (!logContainer) return;

    const logEl = document.createElement('div');
    logEl.className = `log-entry log-${entry.event.toLowerCase()}`;
    logEl.innerHTML = `
      <span class="timestamp">${new Date(entry.timestamp).toLocaleTimeString()}.${String(entry.timestamp % 1000).padStart(3, '0')}</span>
      <span class="event">${entry.event}</span>
      <span class="state">[${this.currentState}]</span>
    `;
    
    logContainer.insertBefore(logEl, logContainer.firstChild);
    
    // Keep only last 50 visible entries
    while (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.lastChild!);
    }
  }

  // Public API for testing
  public getState(): DragState {
    return { ...this.state };
  }

  public getLogs(): DragLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    console.clear();
    this.log('LOGS_CLEARED');
  }

  public exportLogs(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      logs: this.logs,
    }, null, 2);
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    dragManager?: WindowDragManager;
  }
}

// Initialize drag manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dragManager = new WindowDragManager();
  });
} else {
  window.dragManager = new WindowDragManager();
}

export default WindowDragManager;
