import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Menu } from './menu/menu.component';

@Component({
  selector: 'app-root',
  standalone: true, // Asegúrate de tener esto si estás usando Angular standalone
  imports: [RouterOutlet, Menu],
  templateUrl: './app.html',
  styleUrls: ['./app.css'] // ← CORREGIDO (antes decía styleUrl)
})
export class App {
  protected readonly title = signal('proyecto_io');
}
