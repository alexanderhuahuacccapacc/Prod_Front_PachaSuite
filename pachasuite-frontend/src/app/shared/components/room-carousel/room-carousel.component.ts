import { Component, Input, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-room-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-carousel.component.html',
  styleUrls: ['./room-carousel.component.scss']
})
export class RoomCarouselComponent {

  @Input() set imagenes(imgs: string[]) {
    this._imagenes = (imgs && imgs.length > 0) ? imgs : [this.fallback];
    this.currentIndex.set(0);
  }
  get imagenes(): string[] { return this._imagenes; }

  @Input() altText    = 'Habitación';
  @Input() badge      = '';
  @Input() badgeColor = 'primary';

  private _imagenes: string[] = [];
  private fallback = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';

  currentIndex = signal(0);
  isAnimating  = signal(false);

  total    = computed(() => this.imagenes.length);
  hasMany  = computed(() => this.total() > 1);
  current  = computed(() => this.imagenes[this.currentIndex()]);

  prev(event: Event): void {
    event.stopPropagation();
    if (this.isAnimating()) return;
    this.goTo((this.currentIndex() - 1 + this.total()) % this.total());
  }

  next(event: Event): void {
    event.stopPropagation();
    if (this.isAnimating()) return;
    this.goTo((this.currentIndex() + 1) % this.total());
  }

  goToIndex(i: number, event: Event): void {
    event.stopPropagation();
    if (i === this.currentIndex()) return;
    this.goTo(i);
  }

  private goTo(index: number): void {
    this.isAnimating.set(true);
    this.currentIndex.set(index);
    setTimeout(() => this.isAnimating.set(false), 350);
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = this.fallback;
  }

  indices(): number[] {
    return Array.from({ length: this.total() }, (_, i) => i);
  }
}
