import jsPDF from 'jspdf'
import { PergolaConfig, SIDE_KEYS, SIDE_LABEL, STRUCTURE_FINISHES, FABRIC_PRESETS, GLASS_PRESETS } from './types'
import { BrandConfig } from '../config/brands'
import { getBrandByHost } from '../config/getBrandByHost'

export interface CapturedViews {
  front: string
  side: string
  top: string
}

export async function generateSpecificationPdf(
  cfg: PergolaConfig,
  views?: CapturedViews,
  brandConfig?: BrandConfig
): Promise<void> {
  const brand = brandConfig || getBrandByHost()

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297

  // Background header band
  doc.setFillColor(30, 41, 59) // Slate 800
  doc.rect(0, 0, pageWidth, 28, 'F')

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(`SCHEDA TECNICA — ${brand.brandName.toUpperCase()}`, 14, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225)
  doc.text(`Configuratore 3D Pergola Bioclimatica | ${brand.domain}`, 14, 18)

  const dateStr = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  doc.text(`Data: ${dateStr}`, pageWidth - 14, 18, { align: 'right' })

  // Current Y tracker
  let y = 38

  // Section 1: Dimensioni & Montaggio
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('1. DIMENSIONI E MONTAGGIO', 14, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(51, 65, 85)

  const mountingText =
    cfg.mounting === 'free'
      ? 'Autoportante (4 colonne a terra)'
      : cfg.mounting === 'wall1'
      ? 'Addossata a parete — 1 lato (2 colonne a terra)'
      : cfg.mounting === 'wall2'
      ? 'Addossata ad angolo — 2 pareti (1 colonna a terra)'
      : 'Addossata tra 2 pareti contrapposte (0 colonne, ancoraggio integrale)'

  doc.text(`• Larghezza nominale (L): ${cfg.width.toFixed(2)} m`, 16, y)
  doc.text(`• Profondità nominale (P): ${cfg.depth.toFixed(2)} m`, 85, y)
  doc.text(`• Altezza sottotrave (A): ${cfg.height.toFixed(2)} m`, 150, y)
  y += 5
  doc.text(`• Tipologia installazione: ${mountingText}`, 16, y)
  y += 9

  // Section 2: Finiture e Materiali
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('2. FINITURE ARCHITETTONICHE', 14, y)
  y += 6

  const structPreset = STRUCTURE_FINISHES.find(
    (f) => f.hex.toLowerCase() === cfg.colors.structure.toLowerCase()
  )
  const structName = structPreset ? structPreset.name : `Colore personalizzato (${cfg.colors.structure})`

  const fabPreset = FABRIC_PRESETS.find(
    (f) => f.hex.toLowerCase() === cfg.colors.fabric.toLowerCase()
  )
  const fabName = fabPreset ? fabPreset.name : `Colore personalizzato (${cfg.colors.fabric})`
  const weaveName = cfg.fabricWeave === 'ferrari' ? 'Serge Ferrari (Traspirante filtrante)' : 'Soltis 92 (Microforato oscurante)'

  const glassPreset = GLASS_PRESETS.find(
    (g) => g.hex.toLowerCase() === cfg.colors.glass.toLowerCase()
  )
  const glassName = glassPreset ? glassPreset.name : `Vetro personalizzato (${cfg.colors.glass})`

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(51, 65, 85)
  doc.text(`• Finitura Struttura e Travi: ${structName}`, 16, y)
  y += 5
  doc.text(`• Tessuto Chiusure Verticali: ${fabName} — Trama: ${weaveName}`, 16, y)
  y += 5
  doc.text(`• Vetrate Panoramiche: ${glassName}`, 16, y)
  y += 9

  // Section 3: Tetto e Sistemi Laterali
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('3. CONFIGURAZIONE TETTO E CHIUSURE LATERALI', 14, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(51, 65, 85)
  doc.text(
    `• Lamelle frangisole: Orientabili 0°–180° | Impacchettabili a pacchetto: ${
      cfg.louverPacked ? 'SÌ (apertura cielo libero)' : 'NO'
    }`,
    16,
    y
  )
  y += 5
  doc.text(
    `• Illuminazione: Strip LED integrata perimetrale sottotrave (${cfg.led ? 'ATTIVA' : 'DISATTIVA'})`,
    16,
    y
  )
  y += 6

  // Table of Sides
  SIDE_KEYS.forEach((k) => {
    const sc = cfg.sides[k]
    let sysDesc = 'Libero (aperto)'
    if (sc.system === 'panel1') {
      sysDesc = `Tenda a caduta singola (${sc.fabric === 'thermal' ? 'Oscurante termica' : 'Ombreggiante solare'})`
    } else if (sc.system === 'panel2') {
      sysDesc = `Doppia tenda Estate & Inverno (${sc.fabric === 'thermal' ? 'Termica' : 'Ombreggiante'})`
    } else if (sc.system === 'glass') {
      sysDesc = `Vetrata panoramica (${sc.glassOpen === 'center' ? 'Porta centrale battente' : 'Scorrevole impacchettabile'})`
    }
    doc.text(`  - Lato ${SIDE_LABEL[k]} (${k}): ${sysDesc}`, 16, y)
    y += 4.5
  })
  y += 6

  // Section 4: Viste Ortogonali
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('4. VISTE TECNICHE ORTOGONALI', 14, y)
  y += 6

  if (views) {
    const imgW = 58
    const imgH = 46
    const startX = 14
    const gap = 4

    // Front View
    if (views.front) {
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(startX, y, imgW, imgH + 6, 2, 2, 'F')
      doc.addImage(views.front, 'PNG', startX, y, imgW, imgH)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text('VISTA FRONTALE', startX + imgW / 2, y + imgH + 4, { align: 'center' })
    }

    // Side View
    if (views.side) {
      const x = startX + imgW + gap
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(x, y, imgW, imgH + 6, 2, 2, 'F')
      doc.addImage(views.side, 'PNG', x, y, imgW, imgH)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text('VISTA LATERALE', x + imgW / 2, y + imgH + 4, { align: 'center' })
    }

    // Top View
    if (views.top) {
      const x = startX + (imgW + gap) * 2
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(x, y, imgW, imgH + 6, 2, 2, 'F')
      doc.addImage(views.top, 'PNG', x, y, imgW, imgH)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("VISTA DALL'ALTO", x + imgW / 2, y + imgH + 4, { align: 'center' })
    }
  }

  // Footer
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'Documento generato automaticamente per quotazione e fattibilità architettonica. Tolleranze costruttive standard.',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  doc.save(`Scheda_Tecnica_${brand.brandName.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
}
