import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, first } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from './dialog/dialog.component';
import { AnalizeResult } from './metadata/analize-result.type';

@Injectable({ providedIn: 'root' })
export class AppService {
  private url = 'https://localhost:7258';

  constructor(private dialog: MatDialog, private http: HttpClient) {}

  public showMessage(title: string, message: string) {
    this.dialog
      .open(DialogComponent, { width: '400px', data: { title, message } })
      .afterClosed();
  }

  public analizeImage(image: Blob): Observable<AnalizeResult> {
    const formData = new FormData();
    formData.append('value', image, 'image.png');

    return this.http
      .post<AnalizeResult>(`${this.url}/NumbersNeuralNetwork/Analize`, formData)
      .pipe(first());
  }
}
