import { z } from 'zod'

import { type CupSize } from '@/generated/prisma'

/*
 * US to EU cup size conversion mapping based on MediaWiki bra size template
 * @see https://www.boobpedia.com/boobs/Template:Convert_cup
 */
const usToeEuCupSizeMap: Record<string, CupSize> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  DD: 'E',
  DDD: 'F',
  EE: 'F',
  EEE: 'G',
  E: 'E',
  FF: 'G',
  FFF: 'H',
  F: 'F',
  GG: 'H',
  GGG: 'I',
  G: 'G',
  HH: 'I',
  HHH: 'J',
  H: 'H',
  II: 'J',
  III: 'K',
  I: 'I',
  JJ: 'K',
  JJJ: 'L',
  J: 'J',
  KK: 'L',
  KKK: 'M',
  K: 'K',
  LL: 'M',
  LLL: 'N',
  L: 'L',
  MM: 'N',
  MMM: 'O',
  M: 'M',
  NN: 'O',
  NNN: 'P',
  N: 'N',
  OO: 'P',
  OOO: 'Q',
  O: 'O',
  PP: 'Q',
  PPP: 'R',
  P: 'P',
  QQ: 'R',
  QQQ: 'S',
  Q: 'Q',
  RR: 'S',
  RRR: 'T',
  R: 'R',
  SS: 'T',
  SSS: 'U',
  S: 'S',
  TT: 'U',
  TTT: 'V',
  T: 'T',
  UU: 'V',
  UUU: 'W',
  U: 'U',
  VV: 'W',
  VVV: 'X',
  V: 'V',
  WW: 'X',
  WWW: 'Y',
  W: 'W',
  XX: 'Y',
  XXX: 'Z',
  X: 'X',
  YY: 'Z',
  YYY: 'Z',
  Y: 'Y',
  ZZ: 'Z',
  ZZZ: 'Z',
  Z: 'Z'
} as const

/*
 * Convert US band size to EU band size: EU = 70 + (US - 32) * 2.5
 * @see https://www.boobpedia.com/boobs/Template:Bra_size
 */
const convertUsBandToEu = (usBand: number): number => {
  return Math.round(70 + (usBand - 32) * 2.5)
}

/*
 * Validate US band size (must be even and in range 28-46)
 * @see https://www.boobpedia.com/boobs/Template:Bra_size
 */
const isValidUsBandSize = (band: number): boolean => {
  return band >= 28 && band <= 46 && band % 2 === 0
}

/*
 * Validate EU band size (must be divisible by 5 and in range 60-105)
 * @see https://www.boobpedia.com/boobs/Template:Bra_size
 */
const isValidEuBandSize = (band: number): boolean => {
  return band >= 60 && band <= 105 && band % 5 === 0
}

/*
 * Parse measurements string and convert to EU measurements
 * Examples:
 * - "34B-24-34" -> { cupSize: 'B', bandSize: 75 }
 * - "36DD-28-38" -> { cupSize: 'E', bandSize: 80 }
 * - "32DDD-26-34" -> { cupSize: 'F', bandSize: 70 }
 */
export const measurementsSchema = z.string().transform((measurements, ctx) => {
  const match = /^(\d+)([A-Z]+)(?:-|$)/.exec(measurements)

  if (!match) {
    return { cupSize: null, bandSize: null }
  }

  const inputBandSize = parseInt(match[1], 10)
  const usCupSize = match[2]

  if (isNaN(inputBandSize)) {
    return { cupSize: null, bandSize: null }
  }

  let finalBandSize: number | null = null

  if (isValidUsBandSize(inputBandSize)) {
    finalBandSize = convertUsBandToEu(inputBandSize)
  } else if (isValidEuBandSize(inputBandSize)) {
    finalBandSize = inputBandSize
  } else {
    ctx.addIssue({
      code: 'custom',
      message: `Invalid band size: ${String(inputBandSize)}. US sizes must be even (28-46), EU sizes must be divisible by 5 (60-105)`
    })
    finalBandSize = null
  }

  const euCupSize = usCupSize in usToeEuCupSizeMap ? usToeEuCupSizeMap[usCupSize] : null

  if (euCupSize === null) {
    ctx.addIssue({
      code: 'custom',
      message: `Unknown cup size: ${usCupSize}`
    })
  }

  return {
    cupSize: euCupSize,
    bandSize: finalBandSize
  }
})

export type ParsedMeasurements = z.infer<typeof measurementsSchema>
