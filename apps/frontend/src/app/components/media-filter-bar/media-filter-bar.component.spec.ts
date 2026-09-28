import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { MediaFilterBarComponent } from './media-filter-bar.component';

describe('MediaFilterBarComponent', () => {
  let component: MediaFilterBarComponent;

  beforeEach(() => {
    component = new MediaFilterBarComponent();
    component.counts = { book: 10, movie: 5, concert: 2 };
    component.selectedTypes = { book: true, movie: true, concert: true };
  });

  it('calculates totalCount correctly', () => {
    expect(component.totalCount).toBe(17);
  });

  it('recognizes when all media types are selected', () => {
    expect(component.isAllSelected).toBe(true);
    expect(component.isTypeActive('book')).toBe(false);
    expect(component.isTypeActive('movie')).toBe(false);
    expect(component.isTypeActive('concert')).toBe(false);
  });

  it('filters to a single type in a single click from All state', () => {
    let emittedTypes: any = null;
    let filterChanged = false;
    component.selectedTypesChange.subscribe(val => (emittedTypes = val));
    component.filterChange.subscribe(() => (filterChanged = true));

    component.selectType('book');

    expect(component.selectedTypes).toEqual({
      book: true,
      movie: false,
      concert: false
    });
    expect(component.isAllSelected).toBe(false);
    expect(component.isTypeActive('book')).toBe(true);
    expect(component.isTypeActive('movie')).toBe(false);
    expect(component.isTypeActive('concert')).toBe(false);
    expect(emittedTypes).toEqual({ book: true, movie: false, concert: false });
    expect(filterChanged).toBe(true);
  });

  it('switches directly to another type in a single click', () => {
    component.selectType('book');
    expect(component.selectedTypes.book).toBe(true);

    component.selectType('movie');

    expect(component.selectedTypes).toEqual({
      book: false,
      movie: true,
      concert: false
    });
    expect(component.isTypeActive('movie')).toBe(true);
    expect(component.isTypeActive('book')).toBe(false);
  });

  it('clicking the active single type toggles back to All', () => {
    component.selectType('book');
    expect(component.selectedTypes.book).toBe(true);
    expect(component.isAllSelected).toBe(false);

    component.selectType('book');

    expect(component.isAllSelected).toBe(true);
    expect(component.selectedTypes).toEqual({
      book: true,
      movie: true,
      concert: true
    });
  });

  it('selectAll() resets all types to true', () => {
    component.selectType('concert');
    expect(component.selectedTypes.concert).toBe(true);
    expect(component.isAllSelected).toBe(false);

    component.selectAll();

    expect(component.isAllSelected).toBe(true);
    expect(component.selectedTypes).toEqual({
      book: true,
      movie: true,
      concert: true
    });
  });

  it('supports modifier key (Cmd/Ctrl/Shift) for additive multi-selection', () => {
    // Start with only books
    component.selectType('book');

    // Cmd-click movie to add it
    const metaClick = { metaKey: true } as unknown as MouseEvent;
    component.selectType('movie', metaClick);

    expect(component.selectedTypes).toEqual({
      book: true,
      movie: true,
      concert: false
    });
    expect(component.isAllSelected).toBe(false);
    expect(component.isTypeActive('book')).toBe(true);
    expect(component.isTypeActive('movie')).toBe(true);
    expect(component.isTypeActive('concert')).toBe(false);

    // Cmd-click book to remove it, leaving only movie
    component.selectType('book', metaClick);
    expect(component.selectedTypes).toEqual({
      book: false,
      movie: true,
      concert: false
    });
    expect(component.isTypeActive('movie')).toBe(true);
  });

  it('reverts to all if modifier-clicking deselects the last active type', () => {
    component.selectType('book');
    const shiftClick = { shiftKey: true } as unknown as MouseEvent;
    component.selectType('book', shiftClick);

    expect(component.isAllSelected).toBe(true);
    expect(component.selectedTypes).toEqual({
      book: true,
      movie: true,
      concert: true
    });
  });

  it('clears search query and notifies parent', () => {
    component.searchQuery = 'Sci-Fi';
    let emittedSearch = 'initial';
    let filterChanged = false;
    component.searchQueryChange.subscribe(val => (emittedSearch = val));
    component.filterChange.subscribe(() => (filterChanged = true));

    component.clearSearch();

    expect(component.searchQuery).toBe('');
    expect(emittedSearch).toBe('');
    expect(filterChanged).toBe(true);
  });

  it('switches view mode and notifies parent', () => {
    let emittedMode: any = null;
    component.viewModeChange.subscribe(val => (emittedMode = val));

    component.setViewMode('table');

    expect(component.viewMode).toBe('table');
    expect(emittedMode).toBe('table');
  });
});
