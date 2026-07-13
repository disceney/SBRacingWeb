import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';

/** Entrée d'un menu navigable au clavier. */
export interface MenuItem {
  /** Libellé courant (recalculé à chaque rafraîchissement). */
  label: () => string;
  /** Validation par Entrée. */
  onActivate?: () => void;
  /** Modification par ←/→ (dir = ±1) ; shift indique un pas fin. */
  onChange?: (dir: -1 | 1, shift: boolean) => void;
  disabled?: boolean;
}

/**
 * Liste de menu rétro : navigation ↑/↓, modification ←/→, validation Entrée.
 * L'élément sélectionné est précédé d'un chevron et surligné.
 */
export class MenuList {
  private readonly items: MenuItem[];
  private readonly texts: Phaser.GameObjects.Text[];
  private index = 0;
  private readonly keyHandler: (event: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, items: MenuItem[], lineHeight = 30) {
    this.items = items;
    this.texts = items.map((_, i) =>
      scene.add.text(x, y + i * lineHeight, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#e8e8e8',
      }),
    );
    // Premier élément activable sélectionné d'office.
    while (this.items[this.index]?.disabled && this.index < items.length - 1) this.index++;

    this.keyHandler = (event) => this.handleKey(event);
    scene.input.keyboard!.on('keydown', this.keyHandler);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.keyboard?.off('keydown', this.keyHandler);
    });
    this.refresh();
  }

  refresh(): void {
    this.items.forEach((item, i) => {
      const selected = i === this.index;
      const text = this.texts[i]!;
      text.setText(`${selected ? '▶ ' : '  '}${item.label()}`);
      text.setColor(item.disabled ? '#6a707c' : selected ? '#f0d048' : '#e8e8e8');
    });
  }

  private handleKey(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
        this.move(-1);
        break;
      case 'ArrowDown':
        this.move(1);
        break;
      case 'ArrowLeft':
        this.change(-1, event.shiftKey);
        break;
      case 'ArrowRight':
        this.change(1, event.shiftKey);
        break;
      case 'Enter':
        audio.unlock();
        this.items[this.index]?.onActivate?.();
        audio.playMenuBlip();
        break;
    }
  }

  private move(dir: number): void {
    let next = this.index;
    for (let i = 0; i < this.items.length; i++) {
      next = (next + dir + this.items.length) % this.items.length;
      if (!this.items[next]?.disabled) break;
    }
    if (next !== this.index) {
      this.index = next;
      audio.unlock();
      audio.playMenuBlip();
      this.refresh();
    }
  }

  private change(dir: -1 | 1, shift: boolean): void {
    const item = this.items[this.index];
    if (item?.onChange && !item.disabled) {
      audio.unlock();
      item.onChange(dir, shift);
      audio.playMenuBlip();
      this.refresh();
    }
  }
}
