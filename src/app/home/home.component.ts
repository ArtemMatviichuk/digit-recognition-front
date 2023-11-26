import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {
  Subject,
  fromEvent,
  concatMap,
  takeUntil,
  tap,
  Observable,
} from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgIf } from '@angular/common';
import { AppService } from '../app.service';
import { AppState } from '../metadata/app-state.type';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
  ],
})
export class HomeComponent {
  @ViewChild('drawingCanvas', { static: false })
  drawingCanvas?: ElementRef<HTMLCanvasElement>;

  public selectedMode: AppState = null;

  public currentImageSrc?: string | null;
  public resultImageSrc?: string | null;

  public recognizedDigits?: string | null;

  private onDestroy$ = new Subject<void>();
  private context?: CanvasRenderingContext2D | null;

  constructor(private appService: AppService, private cdr: ChangeDetectorRef) {}

  public ngOnInit() {}

  public ngAfterViewInit() {
    this.subscribeToCanvasEvents();
  }

  public ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  public clearCanvas() {
    this.context?.clearRect(0, 0, 400, 400);
    this.context?.beginPath();

    this.setUpCanvasBackground();
  }

  public reset() {
    this.selectedMode = null;
    this.currentImageSrc = null;

    this.recognizedDigits = null;
    this.resultImageSrc = null;
  }

  public analizeImage() {
    this.selectedMode = 'Analize';

    const url = this.drawingCanvas?.nativeElement.toDataURL('image/png');

    if (!!url) {
      fetch(url)
        .then((res) => res.blob())
        .then((b) => this.checkImage(b));
    }
  }

  public uploadImage(event: any) {
    if (!event) {
      return;
    }

    const file: File = event.target?.files?.[0];

    event.target.value = '';

    this.selectedMode = 'Analize';
    this.checkImage(file);
  }

  private async checkImage(blob: Blob) {
    this.recognizedDigits = null;
    this.resultImageSrc = null;

    this.currentImageSrc = URL.createObjectURL(blob);

    this.appService.analizeImage(blob).subscribe(
      (response) => {
        const byteCharacters = atob(response.image);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        this.recognizedDigits = response.value;
        this.resultImageSrc = URL.createObjectURL(
          new Blob([byteArray], { type: 'image/jpg' })
        );

        this.cdr.detectChanges();
      },
      (error) => this.appService.showMessage('Помилка', error.error.message)
    );

    this.selectedMode = null;
  }

  private subscribeToCanvasEvents() {
    if (!this.drawingCanvas) {
      return;
    }

    const canvasEl: HTMLCanvasElement = this.drawingCanvas?.nativeElement;
    this.context = canvasEl.getContext('2d');
    if (this.context) {
      this.context.lineWidth = 8;
    }

    this.setUpCanvasBackground();

    const mouseDown$ = fromEvent(
      this.drawingCanvas.nativeElement,
      'mousedown'
    ) as Observable<MouseEvent>;
    const mouseMove$ = fromEvent(
      this.drawingCanvas.nativeElement,
      'mousemove'
    ) as Observable<MouseEvent>;
    const mouseUp$ = fromEvent(this.drawingCanvas.nativeElement, 'mouseup');
    const mouseLeave$ = fromEvent(
      this.drawingCanvas.nativeElement,
      'mouseleave'
    );

    mouseDown$.pipe(concatMap((down) => mouseMove$.pipe(takeUntil(mouseUp$))));

    const mouseDraw$ = mouseDown$.pipe(
      tap((e: MouseEvent) => this.context?.moveTo(e.offsetX, e.offsetY)),
      concatMap(() =>
        mouseMove$.pipe(takeUntil(mouseUp$), takeUntil(mouseLeave$))
      )
    );

    mouseDraw$.subscribe((e: MouseEvent) => this.draw(e.offsetX, e.offsetY));
  }

  private setUpCanvasBackground() {
    if (!this.context) {
      return;
    }

    this.context.globalCompositeOperation = 'source-over';
    this.context.fillStyle = 'white';
    this.context.fillRect(0, 0, 400, 400);
  }

  private draw(offsetX: number, offsetY: number) {
    this.context?.lineTo(offsetX, offsetY);
    this.context?.stroke();
  }
}
