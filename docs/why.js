export class OrderedFrozenMap extends Map {
  constructor(
    pairs,
    ordering = (a, b) => {
      if (a < b) return -1;
      if (b > a) return +1;
      return 0;
    }
  ) {
    pairs.sort(([aKey, _aValue], [bKey, _bValue]) => ordering(aKey, bKey));
    super(pairs);
    Object.freeze(this);
  }
  static with(values, f, ordering) {
    return new OrderedFrozenMap(
      [...values].map((value) => [f(value), value]),
      ordering
    );
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2h5LmpzIiwic291cmNlUm9vdCI6Ii4vIiwic291cmNlcyI6WyJ3aHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxPQUFPLGdCQUF1QixTQUFRLEdBQVM7SUFFbkQsWUFDRSxLQUFvQixFQUNwQixXQUFtQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUMxQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNyQixPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7UUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN2RSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDYixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFTSxNQUFNLENBQUMsSUFBSSxDQUNoQixNQUFtQixFQUNuQixDQUFjLEVBQ2QsUUFBaUM7UUFFakMsT0FBTyxJQUFJLGdCQUFnQixDQUN6QixDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUM3QyxRQUFRLENBQ1QsQ0FBQztJQUNKLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjbGFzcyBPcmRlcmVkRnJvemVuTWFwPEssIFY+IGV4dGVuZHMgTWFwPEssIFY+XG4gIGltcGxlbWVudHMgUmVhZG9ubHk8TWFwPEssIFY+PiB7XG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihcbiAgICBwYWlyczogQXJyYXk8W0ssIFZdPixcbiAgICBvcmRlcmluZzogKGE6IEssIGI6IEspID0+IG51bWJlciA9IChhLCBiKSA9PiB7XG4gICAgICBpZiAoYSA8IGIpIHJldHVybiAtMTtcbiAgICAgIGlmIChiID4gYSkgcmV0dXJuICsxO1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICApIHtcbiAgICBwYWlycy5zb3J0KChbYUtleSwgX2FWYWx1ZV0sIFtiS2V5LCBfYlZhbHVlXSkgPT4gb3JkZXJpbmcoYUtleSwgYktleSkpO1xuICAgIHN1cGVyKHBhaXJzKTtcbiAgICBPYmplY3QuZnJlZXplKHRoaXMpO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyB3aXRoPEssIFY+KFxuICAgIHZhbHVlczogSXRlcmFibGU8Vj4sXG4gICAgZjogKHY6IFYpID0+IEssXG4gICAgb3JkZXJpbmc/OiAoYTogSywgYjogSykgPT4gbnVtYmVyXG4gICkge1xuICAgIHJldHVybiBuZXcgT3JkZXJlZEZyb3plbk1hcChcbiAgICAgIFsuLi52YWx1ZXNdLm1hcCgodmFsdWUpID0+IFtmKHZhbHVlKSwgdmFsdWVdKSxcbiAgICAgIG9yZGVyaW5nXG4gICAgKTtcbiAgfVxufVxuIl19