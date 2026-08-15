import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  isPdsModalOpen = signal(false);
  isLogModalOpen = signal(false);

  openPdsModal() {
    this.isPdsModalOpen.set(true);
  }

  closePdsModal() {
    this.isPdsModalOpen.set(false);
  }

  openLogModal() {
    this.isLogModalOpen.set(true);
  }

  closeLogModal() {
    this.isLogModalOpen.set(false);
  }
}
