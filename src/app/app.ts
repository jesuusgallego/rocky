import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RestTimerBar } from './rest-timer/rest-timer-bar';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RestTimerBar],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
