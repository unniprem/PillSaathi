import { pillColor } from '../../src/ui/pillLook';

test('a pill keeps its colour whatever its spacing or case', () => {
  expect(pillColor('Iron')).toBe('#9B3D2E'); // "iron" sums to 440, 440 % 8 = 0
  expect(pillColor(' iron ')).toBe('#9B3D2E');
  expect(pillColor('Metformin 500')).toBe('#F4F1EA'); // sums to 1158, % 8 = 6
});
