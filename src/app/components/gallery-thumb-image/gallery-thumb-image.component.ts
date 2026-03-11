import { ChangeDetectionStrategy, Component, input } from '@angular/core';


@Component({
  selector: 'gallery-thumb-image',
  templateUrl: './gallery-thumb-image.component.html',
  styleUrls: ['./gallery-thumb-image.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { ngSkipHydration: 'true' },
})
export class GalleryThumbImageComponent {
  readonly alt = input('');
  readonly src = input<string | null | undefined>(undefined);
}
