import { Component, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-url-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="w-full">
      <label for="url" class="block text-sm font-medium text-gray-700 mb-2"> URL à analyser </label>
      <div class="flex gap-2">
        <input
          id="url"
          type="url"
          [(ngModel)]="url"
          (keyup.enter)="onSubmit()"
          placeholder="https://example.com"
          class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-grade-a focus:border-transparent outline-none transition-shadow"
          [class.border-red-500]="hasError()"
        />
        <button
          type="button"
          (click)="onSubmit()"
          [disabled]="!isValid()"
          class="px-6 py-3 bg-grade-a text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Analyser
        </button>
      </div>
      @if (hasError()) {
        <p class="mt-2 text-sm text-red-600">{{ errorMessage() }}</p>
      }
    </div>
  `,
})
export class UrlInputComponent {
  readonly urlSubmit = output<string>();

  url = '';

  private readonly _error = signal<string | null>(null);
  readonly hasError = signal(false);
  readonly errorMessage = this._error.asReadonly();

  isValid(): boolean {
    if (!this.url.trim()) return false;
    try {
      new URL(this.url);
      return true;
    } catch {
      return false;
    }
  }

  onSubmit(): void {
    this._error.set(null);
    this.hasError.set(false);

    if (!this.url.trim()) {
      this._error.set('Veuillez entrer une URL');
      this.hasError.set(true);
      return;
    }

    try {
      const parsed = new URL(this.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Protocol must be http or https');
      }
      this.urlSubmit.emit(this.url);
    } catch {
      this._error.set('URL invalide. Exemple: https://example.com');
      this.hasError.set(true);
    }
  }
}
