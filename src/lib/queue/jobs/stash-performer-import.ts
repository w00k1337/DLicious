import 'server-only'

import { type Job, type Queue } from 'bullmq'
import * as countryCodes from 'country-codes-list'
import { z } from 'zod'

import type { CupSize, Prisma } from '@/generated/prisma'
import { getPerformer, type Performer } from '@/lib/api/stash'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

import { BaseWorker, createLazyQueue } from '../core'

export interface StashPerformerImportJobData {
  stashId: number
}

export interface StashPerformerImportJobResult {
  stashId: number
  performerId: string
  name: string
  action: 'created' | 'updated'
}

const isoCountryCodes = Object.keys(countryCodes.customList('countryCode', '{countryCode}')).sort() as readonly string[]
const countryCodeSchema = z.enum(isoCountryCodes)

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

const convertUsBandToEu = (usBand: number): number => Math.round(70 + (usBand - 32) * 2.5)
const isValidUsBandSize = (band: number): boolean => band >= 28 && band <= 46 && band % 2 === 0
const isValidEuBandSize = (band: number): boolean => band >= 60 && band <= 105 && band % 5 === 0

const measurementsSchema = z.string().transform((measurements, ctx) => {
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

const mapPerformerToPrisma = (
  performer: Performer
): Omit<Prisma.PerformerCreateInput, 'id' | 'createdAt' | 'updatedAt' | 'isMonitored'> => {
  const { imageUrl, measurements, country, aliases, isFavorite, birthdate, breastType } = performer
  const parsedMeasurements = measurementsSchema.safeParse(measurements)
  const parsedCountry = country ? countryCodeSchema.safeParse(country) : null

  const { cupSize, bandSize } = parsedMeasurements.success ? parsedMeasurements.data : { cupSize: null, bandSize: null }
  const validatedCountry = parsedCountry?.success ? parsedCountry.data : country

  const stashDbId =
    performer.stashes.find(stash => {
      try {
        const host = new URL(stash.endpoint).host
        return host === 'stashdb.org' || host.endsWith('.stashdb.org')
      } catch {
        return false
      }
    })?.id ?? null

  return {
    stashId: performer.id,
    stashDbId,
    name: performer.name,
    aliases,
    imageUrl,
    country: validatedCountry,
    birthdate,
    cupSize,
    bandSize,
    hasNaturalBreasts: breastType === 'Natural' ? true : breastType === 'Fake' ? false : null,
    isFavorite,
    syncedAt: new Date()
  }
}

export const STASH_PERFORMER_IMPORT_QUEUE_NAME = 'stash-performer-import' as const

export const getStashPerformerImportQueue = (): Queue<StashPerformerImportJobData, StashPerformerImportJobResult> =>
  createLazyQueue<StashPerformerImportJobData, StashPerformerImportJobResult>(STASH_PERFORMER_IMPORT_QUEUE_NAME, {
    removeOnComplete: true
  })()

export class StashPerformerImportWorker extends BaseWorker<StashPerformerImportJobData, StashPerformerImportJobResult> {
  getQueueName(): string {
    return STASH_PERFORMER_IMPORT_QUEUE_NAME
  }

  async process(
    job: Job<StashPerformerImportJobData, StashPerformerImportJobResult>
  ): Promise<StashPerformerImportJobResult> {
    const { stashId } = job.data

    logger.debug(
      {
        jobId: job.id,
        stashId,
        isChildJob: !!job.parent
      },
      'Processing stash performer import'
    )

    const stashPerformer = await getPerformer(stashId)
    if (!stashPerformer) throw new Error(`Performer with stashId ${String(stashId)} not found`)

    logger.debug({ jobId: job.id, stashId, performerName: stashPerformer.name }, 'Fetched performer from Stash API')

    const performerData = mapPerformerToPrisma(stashPerformer)

    const performer = await prisma.performer.upsert({
      where: { stashId },
      update: performerData,
      create: performerData
    })

    const action: 'created' | 'updated' =
      performer.createdAt.getTime() === performer.updatedAt.getTime() ? 'created' : 'updated'

    return {
      stashId,
      performerId: performer.id,
      name: performer.name,
      action
    }
  }
}

export const stashPerformerImportWorker = new StashPerformerImportWorker()
