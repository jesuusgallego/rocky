import { Component } from '@angular/core';
import { WorkoutForm } from './workouts/workout-form/workout-form';
import { WorkoutHistory } from './workouts/workout-history/workout-history';

@Component({
  imports: [WorkoutForm, WorkoutHistory],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
