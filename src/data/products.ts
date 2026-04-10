import { Product } from '@/types/order';

export const defaultProducts: Product[] = [
  // Etablering
  { id: 'etab-bil', name: 'Etablering Bilersättning', price: 6.63, category: 'Etablering', isActive: true },
  { id: 'etab-restid', name: 'Etablering restid', price: 11.73, category: 'Etablering', isActive: true },
  { id: 'etab-grund', name: 'Etablering Grundpris', price: 703, category: 'Etablering', isActive: true },

  // Rivning
  { id: 'riv-tra', name: 'Rivning dörr/fönster', price: 154.8, category: 'Rivning', isActive: true },
  { id: 'riv-puts', name: 'Rivning putsfasad', price: 186.7, category: 'Rivning', isActive: true },
  { id: 'riv-karm', name: 'Rivning för montering i befintlig karm', price: 140.8, category: 'Rivning', isActive: true },

  // Montering Fönster
  { id: 'mont-fonster-tra', name: 'Montering Fönster', price: 352, category: 'Montering Fönster', isActive: true },
  { id: 'mont-fonster-sten', name: 'Montering Fönster Sten/Betong', price: 624, category: 'Montering Fönster', isActive: true },
  { id: 'mont-fonster-stor-tra', name: 'Montering Fönster 2,6-4 m2', price: 624, category: 'Montering Fönster', isActive: true },
  { id: 'mont-fonster-stor-sten', name: 'Montering Fönster 2,6-4 m2 Sten/Betong', price: 610, category: 'Montering Fönster', isActive: true },
  { id: 'mont-fonster-bef', name: 'Montering Fönster mot bef. utsida inkl mjukfog', price: 586.5, category: 'Montering Fönster', isActive: true },
  { id: 'mont-fonster-stor-bef', name: 'Montering Fönster 2,6-4 m2 mot bef utsida inkl mjukfog', price: 1116.7, category: 'Montering Fönster', isActive: true },
  { id: 'mont-karm', name: 'Montering i Befintlig karm', price: 375.4, category: 'Montering Fönster', isActive: true },
  { id: 'mont-fonsterdorr-tra', name: 'Montering Fönsterdörr', price: 624, category: 'Montering Fönster', isActive: true },
  { id: 'mont-fonsterdorr-sten', name: 'Montering Fönsterdörr Sten/Betong', price: 938, category: 'Montering Fönster', isActive: true },

  // Montering Dörr
  { id: 'mont-dorr-tra', name: 'Montering dörr trä', price: 624, category: 'Montering Dörr', isActive: true },
  { id: 'mont-dorr-sten', name: 'Montering dörr sten', price: 938, category: 'Montering Dörr', isActive: true },
  { id: 'mont-dorr-bef', name: 'Montering dörr mot bef. utsida inkl mjukfog', price: 1126, category: 'Montering Dörr', isActive: true },

  // Bleck & Material
  { id: 'bleck-tra', name: 'Montering Bleck Trähus', price: 79.8, category: 'Bleck & Material', isActive: true },
  { id: 'bleck-sten', name: 'Montering Bleck Puts/Stenhus', price: 131.8, category: 'Bleck & Material', isActive: true },
  { id: 'mat-bleck', name: 'Materialkostnad underbleck tom 30cm', price: 450.3, category: 'Bleck & Material', isActive: true },
  { id: 'byggavfall', name: 'Byggavfall per enhet återvinning', price: 40.8, category: 'Bleck & Material', isActive: true },
  { id: 'infastning', name: 'Ersättning Infästnings material', price: 40.8, category: 'Bleck & Material', isActive: true },

  // Tillbehör
  { id: 'inv-listning', name: 'Arbetskostnad Inv Listning/Gerning', price: 267.5, category: 'Tillbehör', isActive: true },
  { id: 'inv-smyg', name: 'Arbetskostnad Inv Smyg', price: 178.3, category: 'Tillbehör', isActive: true },
  { id: 'utv-snickarglad', name: 'Arbetskostnad Utv Snickarglädje', price: 272, category: 'Tillbehör', isActive: true },
  { id: 'utv-smyg', name: 'Arbetskostnad Utv Smyg', price: 197, category: 'Tillbehör', isActive: true },
  { id: 'l-profil-mont', name: 'Montering utv Plåtinklädnad L-Profil', price: 234.6, category: 'Tillbehör', isActive: true },
  { id: 'l-profil-mat', name: 'Materialkostnad L-Profil', price: 638.5, category: 'Tillbehör', isActive: true },
  { id: 'fonsterbänk', name: 'Montering Fönsterbänk', price: 155, category: 'Tillbehör', isActive: true },
  { id: 'adeltralist', name: 'Montering Ädelträlist insida tröskel', price: 140.8, category: 'Tillbehör', isActive: true },

  // Tillägg
  { id: 'extra-timme', name: 'Extra Montagetimme', price: 469, category: 'Tillägg', isActive: true },
  { id: 'dorrbroms', name: 'Montering dörrbroms', price: 94, category: 'Tillägg', isActive: true },
  { id: 'myggbage', name: 'Montering Myggbåge', price: 155, category: 'Tillägg', isActive: true },
  { id: 'lascylinder', name: 'Montering låscylinder', price: 117.3, category: 'Tillägg', isActive: true },
  { id: 'kodlas', name: 'Montering Kodlås YD', price: 314.3, category: 'Tillägg', isActive: true },
  { id: 'plisse', name: 'Montering Plisségardin/persienn', price: 117.3, category: 'Tillägg', isActive: true },
  { id: 'markis-sm', name: 'Montering Markis -1,5m', price: 389.4, category: 'Tillägg', isActive: true },
  { id: 'markis-md', name: 'Montering Markis 1,5-3m', price: 704, category: 'Tillägg', isActive: true },
  { id: 'markis-lg', name: 'Montering Markis 3-6m', price: 938.4, category: 'Tillägg', isActive: true },
  { id: 'takfonster', name: 'Montering Takfönster inkl plåt & inv. smyg', price: 6803.4, category: 'Tillägg', isActive: true },
  { id: 'smartflow', name: 'Montering Smartflow/spaltventil', price: 79, category: 'Tillägg', isActive: true },
  { id: 'lossproj', name: 'Montering Lösspröjs', price: 155, category: 'Tillägg', isActive: true },
  { id: 'fallskydd', name: 'Pengar till fallskydd', price: 100, category: 'Tillägg', isActive: true },
  { id: 'extra-kostnad', name: 'Till Montör extra kostnad', price: 658, category: 'Tillägg', isActive: true },
];
