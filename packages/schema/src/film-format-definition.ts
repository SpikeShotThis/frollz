import { z } from 'zod';
import type { FrameSizeCode } from './film.js';

// Core film families we support in inventory and frame-count workflows.
// This mirrors how photographers buy stock in the real world: 35mm rolls, 120 rolls,
// large-format sheets, and Instax instant packs.
export const filmTypeCodeSchema = z.enum(['135', '120', 'sheet', 'instax']);
// Physical packaging channel used to sell and load stock.
// This drives both UI labels and business rules like "spools cannot be loaded directly."
export const distributionTypeCodeSchema = z.enum(['roll', 'sheet_box', 'instant_pack', 'spool']);

// Runtime type for supported film families.
export type FilmTypeCode = z.infer<typeof filmTypeCodeSchema>;
// Runtime type for supported distribution channels.
export type DistributionTypeCode = z.infer<typeof distributionTypeCodeSchema>;

// Display metadata for a packaging channel in selectors and tables.
export type DistributionTypeDefinition = {
  code: DistributionTypeCode;
  label: string;
};

// A frame size option for a format (for example 6x7 on 120, half-frame on 35mm).
// These values define how many exposures each selected gate/crop yields per loaded unit.
export type FrameSizeDefinition = {
  code: FrameSizeCode;
  label: string;
  // Frame count contribution from the selected frame size.
  framesPerUnit: number;
  // Additional geometry multiplier (e.g. half-frame on 35mm).
  frameSizeMultiplier: number;
};

// A purchasable/loadable stock variant (for example 36exp roll, 25-sheet box, Instax pack).
// Combined with frame size, this determines usable frame count and loadability constraints.
export type StockVariantDefinition = {
  code: string;
  label: string;
  distributionType: DistributionTypeCode;
  // Number of units sold by the variant (e.g. 10 sheets per box).
  unitsPerVariant: number;
  // Frame count contribution from the selected stock variant (e.g. 24/36exp, Instax pack).
  framesPerUnit: number;
  // Variant multiplier (e.g. 220 roll has 2x frame capacity of 120 roll).
  variantMultiplier: number;
  // Spools are not directly loadable.
  supportsDirectLoad: boolean;
};

// Full definition of a format entry that powers UI selection and frame-count math.
// This is the source-of-truth for each format's valid frame sizes and stock variants.
export type FilmFormatDefinition = {
  filmType: FilmTypeCode;
  frameSizes: readonly FrameSizeDefinition[];
  stockVariants: readonly StockVariantDefinition[];
};

// Human-readable labels for each distribution type code.
const distributionTypeLabels: Readonly<Record<DistributionTypeCode, string>> = {
  roll: 'Roll',
  sheet_box: 'Sheet Box',
  instant_pack: 'Instant Pack',
  spool: 'Spool'
};

// Exported lookup list used by API/UI when showing package/distribution choices.
export const distributionTypeDefinitions: readonly DistributionTypeDefinition[] = distributionTypeCodeSchema.options.map((code) => ({
  code,
  label: distributionTypeLabels[code]
}));

// Normalized constructor for frame-size entries so all formats use the same defaults.
function defineFrameSize(
  code: FrameSizeCode,
  label: string,
  framesPerUnit: number,
  frameSizeMultiplier = 1
): FrameSizeDefinition {
  return { code, label, framesPerUnit, frameSizeMultiplier };
}

// Normalized constructor for stock variants.
// Default values represent "single unit, single frame multiplier" unless explicitly overridden.
function defineStockVariant(
  code: string,
  label: string,
  distributionType: DistributionTypeCode,
  params: Partial<Pick<StockVariantDefinition, 'unitsPerVariant' | 'framesPerUnit' | 'variantMultiplier'>> & {
    supportsDirectLoad: boolean;
  }
): StockVariantDefinition {
  return {
    code,
    label,
    distributionType,
    unitsPerVariant: params.unitsPerVariant ?? 1,
    framesPerUnit: params.framesPerUnit ?? 1,
    variantMultiplier: params.variantMultiplier ?? 1,
    supportsDirectLoad: params.supportsDirectLoad
  };
}

// Canonical frame-size set for 120 film.
// framesPerUnit reflects expected exposures per roll for each gate/mask.
const MEDIUM_FRAME_SIZES: readonly FrameSizeDefinition[] = [
  defineFrameSize('645', '6x4.5', 15),
  defineFrameSize('6x6', '6x6', 12),
  defineFrameSize('6x7', '6x7', 10),
  defineFrameSize('6x8', '6x8', 9),
  defineFrameSize('6x9', '6x9', 8),
  defineFrameSize('6x12', '6x12', 4),
  defineFrameSize('6x17', '6x17', 3)
] as const;

const SHEET_BOX_VARIANTS: readonly StockVariantDefinition[] = [
  defineStockVariant('10sheets', '10 sheets', 'sheet_box', {
    unitsPerVariant: 10,
    supportsDirectLoad: true
  }),
  defineStockVariant('25sheets', '25 sheets', 'sheet_box', {
    unitsPerVariant: 25,
    supportsDirectLoad: true
  }),
  defineStockVariant('50sheets', '50 sheets', 'sheet_box', {
    unitsPerVariant: 50,
    supportsDirectLoad: true
  })
];

// Shared builder for formats where one selected frame equals one captured image.
// Used for sheet and Instax families, which do not have multiple frame-size options per format code.
function defineSingleFrameFormat(params: {
  filmType: FilmTypeCode;
  frameSizeCode: FrameSizeCode;
  frameSizeLabel: string;
  stockVariants: readonly StockVariantDefinition[];
}): FilmFormatDefinition {
  return {
    filmType: params.filmType,
    frameSizes: [defineFrameSize(params.frameSizeCode, params.frameSizeLabel, 1)],
    stockVariants: params.stockVariants
  };
}

// 220 is modeled as 2x capacity relative to 120.
const MEDIUM_ROLL_VARIANTS: readonly StockVariantDefinition[] = [
  defineStockVariant('120_roll', '120 roll', 'roll', {
    supportsDirectLoad: true
  }),
  defineStockVariant('220_roll', '220 roll', 'roll', {
    variantMultiplier: 2,
    supportsDirectLoad: true
  })
];

// Instax sells as fixed packs; each pack contributes 10 exposures in this domain model.
function instaxPackVariant(label: string): readonly StockVariantDefinition[] {
  return [
    defineStockVariant('pack', label, 'instant_pack', {
      framesPerUnit: 10,
      supportsDirectLoad: true
    })
  ] as const;
}

// Large-format sheet SKUs where format code and frame-size label are the same real-world size name.
const SHEET_FORMAT_CODES = ['4x5', '8x10', '5x7', '11x14'] as const;

// Generated sheet format map to avoid repeating identical code/label declarations.
const sheetFormatDefinitions = Object.fromEntries(
  SHEET_FORMAT_CODES.map((formatCode) => [
    formatCode,
    defineSingleFrameFormat({
      filmType: 'sheet',
      frameSizeCode: formatCode,
      frameSizeLabel: formatCode,
      stockVariants: SHEET_BOX_VARIANTS
    })
  ])
) as Readonly<Record<(typeof SHEET_FORMAT_CODES)[number], FilmFormatDefinition>>;

// Instax product families with UI format code, internal frame-size code, and user-facing name.
const INSTAX_FORMATS = [
  { formatCode: 'InstaxMini', frameSizeCode: 'instax_mini', name: 'Instax Mini' },
  { formatCode: 'InstaxWide', frameSizeCode: 'instax_wide', name: 'Instax Wide' },
  { formatCode: 'InstaxSquare', frameSizeCode: 'instax_square', name: 'Instax Square' }
] as const;

// Generated Instax format map; pack labels derive from the same product name.
const instaxFormatDefinitions = Object.fromEntries(
  INSTAX_FORMATS.map(({ formatCode, frameSizeCode, name }) => [
    formatCode,
    defineSingleFrameFormat({
      filmType: 'instax',
      frameSizeCode,
      frameSizeLabel: name,
      stockVariants: instaxPackVariant(`${name} Pack`)
    })
  ])
) as Readonly<Record<(typeof INSTAX_FORMATS)[number]['formatCode'], FilmFormatDefinition>>;

// Master catalog keyed by external format code.
// This is consumed across validation, selection UIs, and frame-count resolution.
export const filmFormatDefinitions: Readonly<Record<string, FilmFormatDefinition>> = {
  '35mm': {
    filmType: '135',
    frameSizes: [
      defineFrameSize('full_frame', 'Full frame', 1),
      defineFrameSize('half_frame', 'Half frame', 1, 2)
    ],
    stockVariants: [
      defineStockVariant('24exp', '24 exposures', 'roll', {
        framesPerUnit: 24,
        supportsDirectLoad: true
      }),
      defineStockVariant('36exp', '36 exposures', 'roll', {
        framesPerUnit: 36,
        supportsDirectLoad: true
      }),
      defineStockVariant('100ft_bulk', '100ft spool', 'spool', {
        supportsDirectLoad: false
      }),
      defineStockVariant('400ft_bulk', '400ft spool', 'spool', {
        supportsDirectLoad: false
      })
    ]
  },
  '120': {
    filmType: '120',
    frameSizes: MEDIUM_FRAME_SIZES,
    stockVariants: MEDIUM_ROLL_VARIANTS
  },
  ...sheetFormatDefinitions,
  ...instaxFormatDefinitions
} as const;

// Retrieves the catalog definition for a format code.
export function getFilmFormatDefinition(formatCode: string): FilmFormatDefinition | null {
  return filmFormatDefinitions[formatCode] ?? null;
}

// Lists valid frame-size options for the requested format.
export function getFrameSizeDefinitionsForFormatCode(formatCode: string): readonly FrameSizeDefinition[] {
  return getFilmFormatDefinition(formatCode)?.frameSizes ?? [];
}

// Lists valid stock/package variants for the requested format.
export function getStockVariantDefinitionsForFormatCode(formatCode: string): readonly StockVariantDefinition[] {
  return getFilmFormatDefinition(formatCode)?.stockVariants ?? [];
}

// Compatibility alias for existing API/UI paths.
export function getPackageTypeDefinitionsForFormatCode(formatCode: string): readonly StockVariantDefinition[] {
  return getStockVariantDefinitionsForFormatCode(formatCode);
}

// Convenience accessor for frame-size codes used by form validation.
export function getFrameSizeCodesForFormatCode(formatCode: string): readonly FrameSizeCode[] {
  return getFrameSizeDefinitionsForFormatCode(formatCode).map((frameSize) => frameSize.code);
}

// Returns the owning film family for a format code.
export function getFilmTypeForFormatCode(formatCode: string): FilmTypeCode | null {
  return getFilmFormatDefinition(formatCode)?.filmType ?? null;
}

export function isFrameSizeValidForFormatCode(formatCode: string, frameSize: string): frameSize is FrameSizeCode {
  return getFrameSizeDefinitionsForFormatCode(formatCode).some((def) => def.code === frameSize);
}

// Frame-count resolver result: either a computed count or a domain-specific validation error.
export type ResolveFrameCountResult =
  | { ok: true; frameCount: number }
  | { ok: false; message: string };

// Resolves total frames for non-sheet formats by multiplying independent capacity factors:
// package base frames, frame-size contribution, units per package, and variant/size multipliers.
// Includes domain-specific error messages that map to user-facing guidance.
export function resolveNonLargeFrameCount(params: {
  formatCode: string;
  packageTypeCode: string;
  frameSize: FrameSizeCode;
}): ResolveFrameCountResult {
  const { formatCode, packageTypeCode, frameSize } = params;
  const definition = getFilmFormatDefinition(formatCode);

  if (!definition || definition.filmType === 'sheet') {
    return { ok: false, message: 'Unsupported film format for non-large frame generation' };
  }

  const frameSizeDefinition = definition.frameSizes.find((candidate) => candidate.code === frameSize);
  if (!frameSizeDefinition) {
    const formatKey = formatCode === '35mm' ? '35mm' : definition.filmType;
    const frameSizeErrors: Record<string, string> = {
      '35mm': 'Unsupported 35mm frame size for frame generation',
      '120': 'Unsupported medium format frame size for frame generation',
      instax: 'Unsupported Instax frame size for frame generation'
    };
    return { ok: false, message: frameSizeErrors[formatKey] ?? 'Unsupported film format for non-large frame generation' };
  }

  const stockVariant = definition.stockVariants.find((candidate) => candidate.code === packageTypeCode);
  if (!stockVariant || !stockVariant.supportsDirectLoad) {
    if (formatCode === '35mm' && (packageTypeCode === '100ft_bulk' || packageTypeCode === '400ft_bulk')) {
      return { ok: false, message: '35mm spool must be converted to a supported roll before loading' };
    }
    const formatKey = formatCode === '35mm' ? '35mm' : definition.filmType;
    const packageTypeErrors: Record<string, string> = {
      '35mm': 'Unsupported 35mm package type for frame generation',
      '120': 'Unsupported medium format package type for frame generation',
      instax: 'Unsupported Instax package type for frame generation'
    };
    return { ok: false, message: packageTypeErrors[formatKey] ?? 'Unsupported film format for non-large frame generation' };
  }

  return {
    ok: true,
    frameCount:
      stockVariant.framesPerUnit *
      frameSizeDefinition.framesPerUnit *
      stockVariant.unitsPerVariant *
      stockVariant.variantMultiplier *
      frameSizeDefinition.frameSizeMultiplier
  };
}
