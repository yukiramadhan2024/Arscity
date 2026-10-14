import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CommandManager, ICommand } from '../src/core/commands/CommandManager';
import { CompositeCommand } from '../src/core/commands/CityCommands';

class MockCounterCommand implements ICommand {
  public description: string;
  private stateRef: { count: number };
  private delta: number;

  constructor(stateRef: { count: number }, delta: number) {
    this.stateRef = stateRef;
    this.delta = delta;
    this.description = `Counter delta ${delta}`;
  }

  public execute(): void {
    this.stateRef.count += this.delta;
  }

  public undo(): void {
    this.stateRef.count -= this.delta;
  }
}

describe('CommandManager - Undo/Redo Delta History', () => {
  it('executes commands and tracks undo/redo availability', () => {
    const manager = new CommandManager();
    const state = { count: 0 };

    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);

    manager.execute(new MockCounterCommand(state, 5));
    expect(state.count).toBe(5);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);

    manager.execute(new MockCounterCommand(state, 10));
    expect(state.count).toBe(15);

    // Undo step 1
    const didUndo1 = manager.undo();
    expect(didUndo1).toBe(true);
    expect(state.count).toBe(5);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(true);

    // Undo step 2
    const didUndo2 = manager.undo();
    expect(didUndo2).toBe(true);
    expect(state.count).toBe(0);
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);

    // Redo step 1
    const didRedo1 = manager.redo();
    expect(didRedo1).toBe(true);
    expect(state.count).toBe(5);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(true);

    // Redo step 2
    const didRedo2 = manager.redo();
    expect(didRedo2).toBe(true);
    expect(state.count).toBe(15);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('clears redo stack upon executing a new action', () => {
    const manager = new CommandManager();
    const state = { count: 0 };

    manager.execute(new MockCounterCommand(state, 10));
    manager.execute(new MockCounterCommand(state, 20));
    manager.undo(); // back to 10, redo has +20

    expect(manager.canRedo()).toBe(true);

    // Branch history by executing a new command
    manager.execute(new MockCounterCommand(state, 100));
    expect(state.count).toBe(110);
    expect(manager.canRedo()).toBe(false); // Redo stack must be cleared!
  });

  it('enforces maximum history limit of 200 commands', () => {
    const manager = new CommandManager();
    expect(manager.maxHistory).toBe(200);

    const state = { count: 0 };
    for (let i = 0; i < 250; i++) {
      manager.execute(new MockCounterCommand(state, 1));
    }

    expect(state.count).toBe(250);

    // Can only undo up to maxHistory (200) times
    let undoCount = 0;
    while (manager.canUndo()) {
      manager.undo();
      undoCount++;
    }

    expect(undoCount).toBe(200);
    expect(state.count).toBe(50); // 250 - 200
  });

  it('supports grouping composite actions (e.g. long road drag or batch edits) into one undo entry', () => {
    const manager = new CommandManager();
    const state = { count: 0 };

    manager.beginGroup('Operasi Multi Drag');
    manager.execute(new MockCounterCommand(state, 5));
    manager.execute(new MockCounterCommand(state, 10));
    manager.execute(new MockCounterCommand(state, 15));
    manager.endGroup();

    expect(state.count).toBe(30);
    // Stack contains only 1 entry for the entire group
    expect(manager.canUndo()).toBe(true);

    // Undo should revert all 3 steps at once
    manager.undo();
    expect(state.count).toBe(0);
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);

    // Redo should restore all 3 steps at once
    manager.redo();
    expect(state.count).toBe(30);
  });
});
