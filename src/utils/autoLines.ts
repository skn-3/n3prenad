import { FacadeType, OrderLine } from '@/types/order';

interface AutoLineParams {
  windowCount: number;
  doorCount: number;
  facadeType: FacadeType;
  kmDistance: number;
}

export function generateAutoLines(params: AutoLineParams): OrderLine[] {
  const { windowCount, doorCount, facadeType, kmDistance } = params;
  const totalUnits = windowCount + doorCount;
  if (totalUnits === 0) return [];

  const kmReturn = kmDistance * 2;
  const minutes = kmDistance; // ~1 min/km

  const lines: OrderLine[] = [];
  let id = 0;

  const add = (name: string, unitPrice: number, quantity: number) => {
    if (quantity > 0) {
      lines.push({
        id: `auto-${id++}`,
        name,
        unitPrice,
        quantity,
        sum: Math.round(unitPrice * quantity),
      });
    }
  };

  // Etablering
  add('Etablering Bilersättning', 6.63, kmReturn);
  add('Etablering restid', 11.73, minutes);
  add('Etablering Grundpris', 703, 1);

  // Montering fönster
  const windowPrices: Record<FacadeType, number> = { tra: 352, sten: 624, puts: 352 };
  if (windowCount > 0) {
    add('Montering Fönster', windowPrices[facadeType], windowCount);
  }

  // Montering dörr
  const doorPrices: Record<FacadeType, number> = { tra: 624, sten: 938, puts: 624 };
  if (doorCount > 0) {
    add('Montering Dörr', doorPrices[facadeType], doorCount);
  }

  // Byggavfall
  add('Byggavfall per enhet', 40.8, totalUnits);

  // Infästningsmaterial
  add('Ersättning Infästnings mat.', 40.8, totalUnits);

  // Rivning
  const rivPrices: Record<FacadeType, number> = { tra: 154.8, sten: 154.8, puts: 186.7 };
  add('Rivning', rivPrices[facadeType], totalUnits);

  // Bleck
  const bleckPrices: Record<FacadeType, number> = { tra: 79.8, sten: 131.8, puts: 131.8 };
  add('Montering Bleck', bleckPrices[facadeType], totalUnits);

  return lines;
}
