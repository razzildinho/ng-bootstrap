import {Component} from '@angular/core';

@Component({selector: 'ngbd-alert-basic', templateUrl: './alert-basic.html'})
export class NgbdAlertBasic {
  show = true;
  alerts: Array<number>;

  constructor() { this.alerts = [1, 2, 3, 4, 5]; }

  toggle() { this.show = !this.show; }

  randomAlerts() {
    const newAlerts = [];
    const nb = Math.floor(Math.random() * 7);
    // const nb = this.alerts.length - 1;
    for (let i = 0; i < nb; i++) {
      newAlerts.push(i + 1);
    }

    this.alerts = newAlerts;
  }
}
