import { Component, AfterViewInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.html',
  styleUrls: ['./menu.css'],
  encapsulation: ViewEncapsulation.None // Desactiva el encapsulamiento para aplicar estilos globales
})
export class MenuComponent implements AfterViewInit {
  @ViewChild('matrix') matrix!: ElementRef;
  @ViewChild('supply') supply!: ElementRef;
  @ViewChild('demand') demand!: ElementRef;
  @ViewChild('rowsInput') rowsInput!: ElementRef<HTMLInputElement>;
  @ViewChild('colsInput') colsInput!: ElementRef<HTMLInputElement>;
  @ViewChild('totalCostElement') totalCostElement!: ElementRef;
  @ViewChild('econ') econ!: ElementRef;
  @ViewChild('methodLabel') methodLabel!: ElementRef;
  @ViewChild('iterations') iterations!: ElementRef;

  state = {
    type: 'transporte' as 'transporte' | 'asignacion',
    rows: 3,
    cols: 3,
    costs: [] as number[][],
    supply: [] as number[],
    demand: [] as number[],
    balanced: false,
    method: null as string | null,
    tableau: [] as number[][],
    steps: [] as any[],
    stepIndex: 0,
    totalCost: 0,
    _stepCache: null as any
  };

  ngAfterViewInit() {
    this.loadExample(); // Carga un ejemplo inicial para que la página sea usable de inmediato
    this.buildInputs();
    this.setupEventListeners();
  }

  private nice(v: number): string {
    return Number.isFinite(v) ? new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(v) : '—';
  }
  
  private buildInputs(): void {
    const matrix = this.matrix.nativeElement;
    const supply = this.supply.nativeElement;
    const demand = this.demand.nativeElement;
    matrix.innerHTML = '';
    supply.innerHTML = '';
    demand.innerHTML = '';

    const table = document.createElement('div');
    table.className = 'inline-block rounded-xl overflow-hidden border border-white/10';
    const head = document.createElement('div');
    head.className = 'grid';
    head.style.gridTemplateColumns = `repeat(${this.state.cols}, minmax(44px, 64px))`;
    table.appendChild(head);

    for (let r = 0; r < this.state.rows; r++) {
      const row = document.createElement('div');
      row.className = 'grid';
      row.style.gridTemplateColumns = `repeat(${this.state.cols}, minmax(64px, 80px))`;
      for (let c = 0; c < this.state.cols; c++) {
        const inp = document.createElement('input') as HTMLInputElement;
        inp.className = 'table-cell bg-white/10 border border-white/10 focus:outline-none focus:ring-2 ring-brand rounded-md text-sm text-white px-2 py-1';
        inp.type = 'number';
        inp.min = '0';
        inp.value = (this.state.costs[r]?.[c] ?? 0).toString();
        inp.placeholder = 'c' + (r + 1) + (c + 1);
        inp.addEventListener('input', () => {
          if (!this.state.costs[r]) this.state.costs[r] = [];
          this.state.costs[r][c] = parseFloat(inp.value || '0');
        });
        row.appendChild(inp);
      }
      matrix.appendChild(row);
    }

    for (let r = 0; r < this.state.rows; r++) {
      const inp = document.createElement('input') as HTMLInputElement;
      inp.className = 'bg-white/10 border border-white/10 focus:outline-none focus:ring-2 ring-brand rounded-md text-sm text-white px-2 py-1';
      inp.type = 'number';
      inp.min = '0';
      inp.value = (this.state.supply[r] ?? 0).toString();
      inp.placeholder = 'Oferta ' + (r + 1);
      inp.addEventListener('input', () => this.state.supply[r] = parseFloat(inp.value || '0'));
      supply.appendChild(inp);
    }

    for (let c = 0; c < this.state.cols; c++) {
      const inp = document.createElement('input') as HTMLInputElement;
      inp.className = 'bg-white/10 border border-white/10 focus:outline-none focus:ring-2 ring-brand rounded-md text-sm text-white px-2 py-1';
      inp.type = 'number';
      inp.min = '0';
      inp.value = (this.state.demand[c] ?? 0).toString();
      inp.placeholder = 'Demanda ' + (c + 1);
      inp.addEventListener('input', () => this.state.demand[c] = parseFloat(inp.value || '0'));
      demand.appendChild(inp);
    }
  }

  private loadExample(): void {
    if (this.state.type === 'transporte') {
      this.state.rows = 3; this.state.cols = 3;
      this.state.costs = [[4, 8, 6], [5, 7, 6], [8, 9, 7]];
      this.state.supply = [20, 30, 25];
      this.state.demand = [10, 35, 30];
    } else {
      this.state.rows = 4; this.state.cols = 4;
      this.state.costs = [[9, 2, 7, 8], [6, 4, 3, 7], [5, 8, 1, 8], [7, 6, 9, 4]];
      this.state.supply = Array(this.state.rows).fill(1);
      this.state.demand = Array(this.state.cols).fill(1);
    }
    this.rowsInput.nativeElement.value = this.state.rows.toString();
    this.colsInput.nativeElement.value = this.state.cols.toString();
    this.buildInputs();
    this.notify('Ejemplo cargado.');
  }

  private balanceProblem(): void {
    const totalS = this.state.supply.reduce((a, b) => a + (+b || 0), 0);
    const totalD = this.state.demand.reduce((a, b) => a + (+b || 0), 0);
    if (totalS === 0 && totalD === 0) return;
    if (totalS === totalD) { this.state.balanced = true; this.notify('El problema ya está balanceado.'); return; }
    if (totalS > totalD) {
      this.state.cols += 1;
      for (let r = 0; r < this.state.rows; r++) {
        if (!this.state.costs[r]) this.state.costs[r] = [];
        this.state.costs[r][this.state.cols - 1] = 0;
      }
      this.state.demand.push(totalS - totalD);
      this.notify('Se añadió un destino ficticio para balancear.');
    } else {
      this.state.rows += 1;
      const newRow = Array(this.state.cols).fill(0);
      this.state.costs.push(newRow);
      this.state.supply.push(totalD - totalS);
      this.notify('Se añadió un origen ficticio para balancear.');
    }
    this.rowsInput.nativeElement.value = this.state.rows.toString();
    this.colsInput.nativeElement.value = this.state.cols.toString();
    this.state.balanced = true;
    this.buildInputs();
  }

  private solveNorthWest(): any {
    const m = this.state.rows, n = this.state.cols;
    const supply = this.state.supply.slice();
    const demand = this.state.demand.slice();
    const alloc = Array.from({ length: m }, () => Array(n).fill(0));
    let i = 0, j = 0;
    const steps = [];
    while (i < m && j < n) {
      const qty = Math.min(supply[i], demand[j]);
      alloc[i][j] = qty;
      steps.push({ desc: `Asignar ${qty} en (O${i + 1}, D${j + 1}) por Esquina Noroeste.`, alloc: this.clone2D(alloc) });
      supply[i] -= qty; demand[j] -= qty;
      if (supply[i] === 0 && demand[j] === 0) j++;
      else if (supply[i] === 0) i++;
      else j++;
    }
    const cost = this.calculateTotalCost(alloc, this.state.costs);
    return { alloc, steps, cost, note: 'Solución inicial rápida; no garantiza optimalidad. Útil como punto de partida.' };
  }

  private solveLowestCost(): any {
    const m = this.state.rows, n = this.state.cols;
    const supply = this.state.supply.slice();
    const demand = this.state.demand.slice();
    const alloc = Array.from({ length: m }, () => Array(n).fill(0));
    const used = Array.from({ length: m }, () => Array(n).fill(false));
    const steps = [];
    while (supply.some(x => x > 0) && demand.some(x => x > 0)) {
      let min = Infinity, pos = [-1, -1];
      for (let i = 0; i < m; i++) for (let j = 0; j < n; j++)
        if (supply[i] > 0 && demand[j] > 0 && !used[i][j] && this.state.costs[i][j] < min)
          { min = this.state.costs[i][j]; pos = [i, j]; }
      if (pos[0] === -1) break;
      const [i, j] = pos;
      const qty = Math.min(supply[i], demand[j]);
      alloc[i][j] = qty;
      steps.push({ desc: `Tomar celda de menor costo c=${this.state.costs[i][j]} y asignar ${qty} en (O${i + 1}, D${j + 1}).`, alloc: this.clone2D(alloc) });
      supply[i] -= qty; demand[j] -= qty;
      if (supply[i] === 0) for (let jj = 0; jj < n; jj++) used[i][jj] = true;
      if (demand[j] === 0) for (let ii = 0; ii < m; ii++) used[ii][j] = true;
    }
    const cost = this.calculateTotalCost(alloc, this.state.costs);
    return { alloc, steps, cost, note: 'Suele mejorar respecto a Esquina Noroeste; no siempre óptimo.' };
  }

  private solveVogel(): any {
    const m = this.state.rows, n = this.state.cols;
    let supply = this.state.supply.slice();
    let demand = this.state.demand.slice();
    const alloc = Array.from({ length: m }, () => Array(n).fill(0));
    const activeRows = Array(m).fill(true);
    const activeCols = Array(n).fill(true);
    const steps = [];

    const rowPenalty = (i: number) => {
      const vals = [];
      for (let j = 0; j < n; j++) if (activeCols[j] && demand[j] > 0) vals.push(this.state.costs[i][j]);
      return vals.length < 2 ? vals[0] ?? 0 : vals.sort((a, b) => a - b)[1] - vals[0];
    };

    const colPenalty = (j: number) => {
      const vals = [];
      for (let i = 0; i < m; i++) if (activeRows[i] && supply[i] > 0) vals.push(this.state.costs[i][j]);
      return vals.length < 2 ? vals[0] ?? 0 : vals.sort((a, b) => a - b)[1] - vals[0];
    };

    while (supply.some(x => x > 0) && demand.some(x => x > 0)) {
      let best = { type: 'row', idx: -1, pen: -1 };
      for (let i = 0; i < m; i++) if (activeRows[i] && supply[i] > 0)
        if (rowPenalty(i) > best.pen) best = { type: 'row', idx: i, pen: rowPenalty(i) };
      for (let j = 0; j < n; j++) if (activeCols[j] && demand[j] > 0)
        if (colPenalty(j) > best.pen) best = { type: 'col', idx: j, pen: colPenalty(j) };
      if (best.idx === -1) break;

      let iChosen = -1, jChosen = -1, min = Infinity;
      if (best.type === 'row') {
        const i = best.idx;
        for (let j = 0; j < n; j++) if (activeCols[j] && demand[j] > 0 && this.state.costs[i][j] < min)
          { min = this.state.costs[i][j]; iChosen = i; jChosen = j; }
      } else {
        const j = best.idx;
        for (let i = 0; i < m; i++) if (activeRows[i] && supply[i] > 0 && this.state.costs[i][j] < min)
          { min = this.state.costs[i][j]; iChosen = i; jChosen = j; }
      }
      const qty = Math.min(supply[iChosen], demand[jChosen]);
      alloc[iChosen][jChosen] = (alloc[iChosen][jChosen] || 0) + qty;
      steps.push({ desc: `Penalización ${best.pen} en ${best.type === 'row' ? 'fila' : 'columna'} ${best.idx + 1}. Asignar ${qty} en (O${iChosen + 1}, D${jChosen + 1}) con c=${this.state.costs[iChosen][jChosen]}.`, alloc: this.clone2D(alloc) });
      supply[iChosen] -= qty; demand[jChosen] -= qty;
      if (supply[iChosen] === 0) activeRows[iChosen] = false;
      if (demand[jChosen] === 0) activeCols[jChosen] = false;
    }
    const cost = this.calculateTotalCost(alloc, this.state.costs);
    return { alloc, steps, cost, note: 'Método heurístico eficaz que suele acercarse a la óptima con menos iteraciones.' };
  }

  private solveHungarian(): any {
    const n = Math.max(this.state.rows, this.state.cols);
    const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => this.state.costs[i]?.[j] ?? 0));
    const steps = [];

    for (let i = 0; i < n; i++) {
      const min = Math.min(...A[i]);
      for (let j = 0; j < n; j++) A[i][j] -= min;
    }
    steps.push({ desc: 'Reducción por filas: restar el mínimo de cada fila.', hung: this.clone2D(A) });

    for (let j = 0; j < n; j++) {
      let min = Infinity;
      for (let i = 0; i < n; i++) min = Math.min(min, A[i][j]);
      for (let i = 0; i < n; i++) A[i][j] -= min;
    }
    steps.push({ desc: 'Reducción por columnas: restar el mínimo de cada columna.', hung: this.clone2D(A) });

    const assigned = Array(n).fill(-1);
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[a].filter(v => v === 0).length - A[b].filter(v => v === 0).length);
    const usedCols = new Set();
    for (const i of order) {
      for (let j = 0; j < n; j++) if (A[i][j] === 0 && !usedCols.has(j)) {
        assigned[i] = j; usedCols.add(j); break;
      }
    }
    steps.push({ desc: 'Cubrimiento de ceros y selección de ceros independientes para asignación.', assign: assigned.slice() });

    let cost = 0;
    const alloc = Array.from({ length: this.state.rows }, () => Array(this.state.cols).fill(0));
    for (let i = 0; i < this.state.rows; i++) {
      const j = assigned[i];
      if (j != null && j >= 0 && j < this.state.cols) {
        alloc[i][j] = 1;
        cost += this.state.costs[i][j];
      }
    }

    return { alloc, steps, cost, note: 'Procedimiento resumido del método Húngaro. En casos complejos puede requerir pasos adicionales de marcado y ajuste.' };
  }

  private clone2D(a: any[][]): any[][] {
    return a.map(row => row.slice());
  }

  private calculateTotalCost(alloc: any[][], costs: any[][]): number {
    let sum = 0;
    for (let i = 0; i < alloc.length; i++) for (let j = 0; j < alloc[0].length; j++)
      sum += (alloc[i][j] || 0) * (costs[i]?.[j] ?? 0);
    return sum;
  }

  private renderIterations(data: any): void {
    const wrap = this.iterations.nativeElement;
    wrap.innerHTML = '';
    this.state.steps = data.steps;
    this.state.stepIndex = 0;
    this.state.totalCost = data.cost;

    data.steps.forEach((s: any, idx: number) => {
      const card = document.createElement('div');
      card.className = 'rounded-xl bg-white/5 border border-white/10 p-4 fade-enter';
      setTimeout(() => card.classList.add('fade-enter-active'), 10);
      const title = document.createElement('div');
      title.className = 'flex items-center justify-between';
      title.innerHTML = `<div class="font-semibold">Paso ${idx + 1}</div><div class="text-white/60 text-sm">${s.desc}</div>`;
      card.appendChild(title);

      if (s.alloc) card.appendChild(this.renderTable(s.alloc, this.state.costs, true));
      if (s.hung) card.appendChild(this.renderTable(s.hung, null, false, 'Matriz reducida'));
      if (s.assign) {
        const list = document.createElement('div');
        list.className = 'mt-3 text-sm text-white/80';
        list.innerHTML = s.assign.map((j: number, i: number) => `Tarea ${i + 1} → Recurso ${j + 1}`).join('<br>');
        card.appendChild(list);
      }
      wrap.appendChild(card);
    });

    this.totalCostElement.nativeElement.textContent = this.nice(data.cost);
    this.econ.nativeElement.textContent = this.buildEconomicInsight(data);
  }

  private renderTable(values: any[][], costs: any[][] | null = null, showMiniCost = false, title: string | null = null): HTMLElement {
    const cont = document.createElement('div');
    cont.className = 'mt-3 overflow-auto';
    if (title) {
      const h = document.createElement('div');
      h.className = 'text-sm font-semibold mb-2';
      h.textContent = title;
      cont.appendChild(h);
    }
    const m = values.length, n = values[0].length;
    const table = document.createElement('div');
    table.className = 'inline-block rounded-xl overflow-hidden border border-white/10';
    for (let i = 0; i < m; i++) {
      const row = document.createElement('div');
      row.className = 'grid';
      row.style.gridTemplateColumns = `repeat(${n}, minmax(64px, 80px))`;
      for (let j = 0; j < n; j++) {
        const cell = document.createElement('div');
        cell.className = 'relative px-3 py-2 text-center bg-white/5 border border-white/10';
        cell.innerHTML = `<div class="text-white font-semibold">${this.nice(values[i][j] ?? 0)}</div>`;
        if (showMiniCost && costs) {
          const c = costs[i][j] ?? 0;
          const mini = document.createElement('div');
          mini.className = 'absolute top-1 right-2 text-[10px] text-white/60';
          mini.textContent = 'c=' + this.nice(c);
          cell.appendChild(mini);
          if (values[i][j] > 0) cell.classList.add('ring-brand');
        }
        row.appendChild(cell);
      }
      table.appendChild(row);
    }
    cont.appendChild(table);
    return cont;
  }

  private buildEconomicInsight(result: any): string {
    const methodNames: { [key: string]: string } = { nw: 'Esquina Noroeste', lc: 'Costo Mínimo', vogel: 'Aproximación de Vogel', hungarian: 'Húngaro' };
    const name = this.state.method ? methodNames[this.state.method] || 'Método' : 'Método';
    const cost = result.cost;
    return this.state.type === 'transporte'
      ? `${name}: El costo total estimado es $ ${this.nice(cost)}. Esta asignación cumple oferta y demanda, priorizando ${name === 'Esquina Noroeste' ? 'rapidez operativa' : 'menores costos unitarios'} y sugiere un ahorro potencial respecto a decisiones no estructuradas.`
      : `${name}: La asignación minimiza el costo total a $ ${this.nice(cost)} seleccionando combinaciones exclusivas. La interpretación sugiere una mejora en productividad al evitar ociosidad y sobrecostos.`;
  }

  private notify(msg: string): void {
    const n = document.createElement('div');
    n.className = 'fixed bottom-6 right-6 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white/90 shadow-xl';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2400);
  }

  private setupEventListeners(): void {
    document.getElementById('build')?.addEventListener('click', () => {
      console.log('Botón "Generar tabla" clickeado'); // Depuración
      this.state.rows = Math.max(1, Math.min(6, parseInt(this.rowsInput.nativeElement.value || '1')));
      this.state.cols = Math.max(1, Math.min(6, parseInt(this.colsInput.nativeElement.value || '1')));
      this.state.costs = Array.from({ length: this.state.rows }, () => Array(this.state.cols).fill(0));
      this.state.supply = Array(this.state.rows).fill(0);
      this.state.demand = Array(this.state.cols).fill(0);
      this.buildInputs();
    });

    document.getElementById('fillExample')?.addEventListener('click', () => {
      console.log('Botón "Cargar ejemplo" clickeado'); // Depuración
      this.loadExample();
    });

    document.getElementById('balance')?.addEventListener('click', () => {
      console.log('Botón "Balancear" clickeado'); // Depuración
      this.balanceProblem();
    });

    document.getElementById('reset')?.addEventListener('click', () => {
      console.log('Botón "Reiniciar" clickeado'); // Depuración
      this.state = { ...this.state, costs: [], supply: [], demand: [], steps: [], tableau: [], totalCost: 0, balanced: false, _stepCache: null };
      this.iterations.nativeElement.innerHTML = '<div class="text-white/70">Genera la tabla y elige un método para ver las iteraciones.</div>';
      this.totalCostElement.nativeElement.textContent = '—';
      this.econ.nativeElement.textContent = 'Aquí verás el análisis del impacto en costos y eficiencia.';
      this.buildInputs();
      this.notify('Reiniciado.');
    });

    document.querySelectorAll('.type-btn').forEach((b: Element) => {
      b.addEventListener('click', () => {
        console.log('Botón de tipo clickeado'); // Depuración
        document.querySelectorAll('.type-btn').forEach((x: Element) => x.classList.remove('tab-active'));
        b.classList.add('tab-active');
        const type = (b as HTMLElement).dataset['type'];
        this.state.type = type === 'transporte' || type === 'asignacion' ? type : 'transporte';
        if (this.state.type === 'asignacion') {
          this.state.rows = Math.max(this.state.rows, this.state.cols);
          this.state.cols = this.state.rows;
        }
        this.buildInputs();
      });
    });

    document.querySelectorAll('.method-btn').forEach((b: Element) => {
      b.addEventListener('click', () => {
        console.log('Botón de método clickeado'); // Depuración
        this.state.method = (b as HTMLElement).dataset['method'] || null;
        document.querySelectorAll('.method-btn').forEach((x: Element) => x.classList.remove('tab-active'));
        b.classList.add('tab-active');
        const names: { [key: string]: string } = { nw: 'Esquina Noroeste', lc: 'Costo Mínimo', vogel: 'Aproximación de Vogel', hungarian: 'Húngaro' };
        this.methodLabel.nativeElement.textContent = this.state.method ? names[this.state.method] || '—' : '—';
      });
    });

    document.getElementById('solve')?.addEventListener('click', () => {
      console.log('Botón "Resolver" clickeado'); // Depuración
      this.runSolve('all');
    });

    document.getElementById('step')?.addEventListener('click', () => {
      console.log('Botón "Paso a paso" clickeado'); // Depuración
      this.runStep();
    });

    document.getElementById('exportReport')?.addEventListener('click', () => {
      console.log('Botón "Exportar reporte" clickeado'); // Depuración
      this.exportReport();
    });

    document.getElementById('print')?.addEventListener('click', () => {
      console.log('Botón "Imprimir" clickeado'); // Depuración
      window.print();
    });

    document.getElementById('year')!.textContent = new Date().getFullYear().toString();
  }

  private validateInputs(): boolean {
    if (!this.state.costs.length) { this.notify('Primero genera la tabla.'); return false; }
    if (this.state.type === 'transporte') {
      const sumS = this.state.supply.reduce((a, b) => a + (+b || 0), 0);
      const sumD = this.state.demand.reduce((a, b) => a + (+b || 0), 0);
      if (sumS !== sumD) { this.notify('El problema no está balanceado. Usa "Balancear".'); return false; }
    } else {
      this.state.supply = Array(this.state.rows).fill(1);
      this.state.demand = Array(this.state.cols).fill(1);
    }
    return true;
  }

  private runSolve(mode: string): void {
    if (!this.state.method) { this.notify('Selecciona un método.'); return; }
    if (!this.validateInputs()) return;

    let out: any;
    if (this.state.type === 'transporte') {
      out = this.state.method === 'nw' ? this.solveNorthWest() :
            this.state.method === 'lc' ? this.solveLowestCost() :
            this.state.method === 'vogel' ? this.solveVogel() : null;
      if (!out) { this.notify('Método Húngaro es para asignación. Cambia el tipo.'); return; }
    } else {
      if (this.state.method !== 'hungarian') { this.notify('Para asignación usa el método Húngaro.'); return; }
      out = this.solveHungarian();
    }
    this.renderIterations(out);
  }

  private runStep(): void {
    if (!this.state.method) { this.notify('Selecciona un método.'); return; }
    if (!this.validateInputs()) return;

    let out: any = this.state._stepCache;
    if (!out) {
      out = this.state.type === 'transporte'
        ? this.state.method === 'nw' ? this.solveNorthWest() :
          this.state.method === 'lc' ? this.solveLowestCost() :
          this.state.method === 'vogel' ? this.solveVogel() : null
        : this.state.method === 'hungarian' ? this.solveHungarian() : null;
      if (!out) { this.notify('Método no válido para este tipo.'); return; }
      this.state._stepCache = out;
      this.iterations.nativeElement.innerHTML = '';
      this.totalCostElement.nativeElement.textContent = this.nice(out.cost);
      this.econ.nativeElement.textContent = this.buildEconomicInsight(out);
    }

    const idx = this.state.stepIndex;
    if (idx >= out.steps.length) { this.notify('No hay más pasos.'); return; }

    const s = out.steps[idx];
    const card = document.createElement('div');
    card.className = 'rounded-xl bg-white/5 border border-white/10 p-4 fade-enter';
    setTimeout(() => card.classList.add('fade-enter-active'), 10);
    const title = document.createElement('div');
    title.className = 'flex items-center justify-between';
    title.innerHTML = `<div class="font-semibold">Paso ${idx + 1}</div><div class="text-white/60 text-sm">${s.desc}</div>`;
    card.appendChild(title);
    if (s.alloc) card.appendChild(this.renderTable(s.alloc, this.state.costs, true));
    if (s.hung) card.appendChild(this.renderTable(s.hung, null, false, 'Matriz reducida'));
    if (s.assign) {
      const list = document.createElement('div');
      list.className = 'mt-3 text-sm text-white/80';
      list.innerHTML = s.assign.map((j: number, i: number) => `Tarea ${i + 1} → Recurso ${j + 1}`).join('<br>');
      card.appendChild(list);
    }
    this.iterations.nativeElement.appendChild(card);
    this.state.stepIndex++;
  }

  private exportReport(): void {
    if (!this.state.steps.length) { this.notify('No hay contenido para exportar.'); return; }
    const methodNames: { [key: string]: string } = { nw: 'Esquina Noroeste', lc: 'Costo Mínimo', vogel: 'Aproximación de Vogel', hungarian: 'Húngaro' };
    const rows = this.state.steps.map((s: any, i: number) => `
      <h3 style="margin:12px 0 6px 0;">Paso ${i + 1}: ${s.desc}</h3>
      ${s.alloc ? this.tableHTML(s.alloc, this.state.costs, true) : ''}
      ${s.hung ? this.tableHTML(s.hung, null, false) : ''}
      ${s.assign ? `<p>${s.assign.map((j: number, k: number) => `Tarea ${k + 1} → Recurso ${j + 1}`).join('<br>')}</p>` : ''}
    `).join('');
    const html = `
      <html><head><meta charset="utf-8"><title>Reporte IO</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 6px 0}.muted{color:#475569}table{border-collapse:collapse;margin:8px 0 16px 0}td{border:1px solid #cbd5e1;padding:6px 10px;text-align:center}small{color:#64748b}</style></head>
      <body><h1>Reporte de Iteraciones</h1><div class="muted">${new Date().toLocaleString('es-PE')}</div><h2>Método: ${this.state.method ? methodNames[this.state.method] || '—' : '—'}</h2><h3>Costo total: ${this.nice(this.state.totalCost)}</h3><p>${this.buildEconomicInsight({ cost: this.state.totalCost })}</p>${rows}<hr><p><small>Créditos: Aron Omar Pizarro Cahuana y Jhoel Esteban Cardenas Quispe</small></p></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  private tableHTML(values: any[][], costs: any[][] | null = null, showMini = false): string {
    let out = '<table><tbody>';
    for (let i = 0; i < values.length; i++) {
      out += '<tr>';
      for (let j = 0; j < values[0].length; j++)
        out += `<td>${this.nice(values[i][j] ?? 0)}${showMini && costs?.[i]?.[j] != null ? `<br><small>c=${this.nice(costs[i][j])}</small>` : ''}</td>`;
      out += '</tr>';
    }
    out += '</tbody></table>';
    return out;
  }
}