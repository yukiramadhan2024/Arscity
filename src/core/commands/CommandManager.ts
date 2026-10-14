export interface ICommand {
  description: string;
  execute(): void;
  undo(): void;
  redo?(): void;
}

export class CommandManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  public maxHistory: number = 200;
  private activeGroup: { description: string; commands: ICommand[] } | null = null;

  public onStateChanged?: (canUndo: boolean, canRedo: boolean) => void;

  public beginGroup(description: string): void {
    this.activeGroup = { description, commands: [] };
  }

  public endGroup(): void {
    if (!this.activeGroup) return;
    const grp = this.activeGroup;
    this.activeGroup = null;

    if (grp.commands.length > 0) {
      const composite: ICommand = {
        description: grp.description,
        execute: () => {
          for (const c of grp.commands) c.execute();
        },
        undo: () => {
          for (let i = grp.commands.length - 1; i >= 0; i--) {
            grp.commands[i].undo();
          }
        },
        redo: () => {
          for (const c of grp.commands) {
            if (c.redo) c.redo();
            else c.execute();
          }
        }
      };

      this.undoStack.push(composite);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.notify();
    }
  }

  public execute(command: ICommand): void {
    command.execute();

    if (this.activeGroup) {
      this.activeGroup.commands.push(command);
      return;
    }

    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
    this.notify();
  }

  public undo(): boolean {
    const cmd = this.undoStack.pop();
    if (!cmd) return false;

    cmd.undo();
    this.redoStack.push(cmd);
    this.notify();
    return true;
  }

  public redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;

    if (cmd.redo) {
      cmd.redo();
    } else {
      cmd.execute();
    }
    this.undoStack.push(cmd);
    this.notify();
    return true;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoStack(): ReadonlyArray<ICommand> {
    return this.undoStack;
  }

  public getRedoStack(): ReadonlyArray<ICommand> {
    return this.redoStack;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeGroup = null;
    this.notify();
  }

  private notify(): void {
    if (this.onStateChanged) {
      this.onStateChanged(this.canUndo(), this.canRedo());
    }
  }
}
