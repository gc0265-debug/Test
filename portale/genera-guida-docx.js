/**
 * Genera Guida_Operativa_Sistema_Field_Project.docx dal medesimo contenuto
 * della pagina guida-operativa.html, in identita' visiva Field Project SAS.
 *
 * Uso:  npm i docx && node genera-guida-docx.js [cartella-output]
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Footer, PageNumber, PageBreak, LevelFormat, convertMillimetersToTwip
} = require("docx");

/* ---------- identita' Field Project SAS ---------- */
const NERO = "1A1A1A";
const ROSSO = "C0332B";
const GRIGIO = "4D4D4D";
const GRIGIO_CHIARO = "8A8A8A";
const RIGA = "E3E3E3";
const FONT = "Montserrat";
const MONO = "Consolas";

const CONTENUTO = 9638; // larghezza utile in DXA (A4, margini 20 mm)

/* ---------- helper ---------- */
// Converte **grassetto** e `codice` in TextRun
function runs(testo, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let i = 0, m;
  while ((m = re.exec(testo)) !== null) {
    if (m.index > i) out.push(new TextRun({ ...base, text: testo.slice(i, m.index) }));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(new TextRun({ ...base, text: tok.slice(2, -2), bold: true, color: NERO }));
    } else {
      out.push(new TextRun({ ...base, text: tok.slice(1, -1), font: MONO, size: (base.size || 20) - 2 }));
    }
    i = re.lastIndex;
  }
  if (i < testo.length) out.push(new TextRun({ ...base, text: testo.slice(i) }));
  return out;
}

const P = (testo, o = {}) => new Paragraph({
  children: runs(testo, { size: o.size || 20, color: o.color || GRIGIO, italics: o.italics }),
  spacing: { after: o.after === undefined ? 140 : o.after, line: 290 },
  alignment: o.align,
  indent: o.indent,
  border: o.border,
  shading: o.shading,
  keepNext: o.keepNext,
});

const H1 = (testo, numero) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 420, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RIGA, space: 8 } },
  children: [
    new TextRun({ text: numero + "  ", size: 28, bold: true, color: ROSSO, font: FONT }),
    new TextRun({ text: testo.toUpperCase(), size: 28, bold: true, color: NERO, font: FONT, characterSpacing: 10 }),
  ],
});

const H2 = (testo) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 110 },
  children: [new TextRun({ text: testo.toUpperCase(), size: 20, bold: true, color: NERO, font: FONT, characterSpacing: 16 })],
});

const H3 = (testo) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 220, after: 80 },
  children: [new TextRun({ text: testo, size: 21, bold: true, color: NERO, font: FONT })],
});

const ETICHETTA = (testo) => new Paragraph({
  spacing: { before: 200, after: 60 },
  children: [new TextRun({ text: testo.toUpperCase(), size: 15, bold: true, color: ROSSO, font: FONT, characterSpacing: 24 })],
});

const BUL = (testo) => new Paragraph({
  numbering: { reference: "punti", level: 0 },
  spacing: { after: 90, line: 280 },
  children: runs(testo, { size: 20, color: GRIGIO }),
});

const NUM = (testo) => new Paragraph({
  numbering: { reference: "passi", level: 0 },
  spacing: { after: 90, line: 280 },
  children: runs(testo, { size: 20, color: GRIGIO }),
});

// riquadro con filetto rosso a sinistra (gate, note, frasi)
const RIQUADRO = (titolo, testo, opt = {}) => [
  new Paragraph({
    spacing: { before: 160, after: 30 },
    indent: { left: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: ROSSO, space: 10 } },
    children: [new TextRun({ text: titolo.toUpperCase(), size: 15, bold: true, color: ROSSO, font: FONT, characterSpacing: 20 })],
  }),
  new Paragraph({
    spacing: { after: 180, line: 285 },
    indent: { left: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: ROSSO, space: 10 } },
    children: runs(testo, { size: 19, color: opt.scuro ? NERO : GRIGIO }),
  }),
];

function cella(testo, larghezza, opt = {}) {
  return new TableCell({
    width: { size: larghezza, type: WidthType.DXA },
    margins: { top: 90, bottom: 90, right: 160 },
    shading: opt.head ? { type: ShadingType.CLEAR, fill: "FFFFFF" } : undefined,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.SINGLE, size: opt.head ? 6 : 2, color: opt.head ? "C9C9C9" : RIGA },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    children: [new Paragraph({
      spacing: { after: 0, line: 265 },
      children: opt.head
        ? [new TextRun({ text: testo.toUpperCase(), size: 15, bold: true, color: GRIGIO_CHIARO, font: FONT, characterSpacing: 18 })]
        : runs(testo, { size: 18, color: opt.forte ? NERO : GRIGIO, bold: opt.forte }),
    })],
  });
}

function tabella(intestazioni, righe, larghezze, fortePrimaColonna = true) {
  return new Table({
    columnWidths: larghezze,
    width: { size: CONTENUTO, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: intestazioni.map((t, i) => cella(t, larghezze[i], { head: true })),
      }),
      ...righe.map(r => new TableRow({
        children: r.map((t, i) => cella(t, larghezze[i], { forte: fortePrimaColonna && i === 0 })),
      })),
    ],
  });
}

const SPAZIO = (n) => new Paragraph({ spacing: { after: n || 120 }, children: [] });

/* ---------- fasi del ciclo di vita ---------- */
function fase(n, titolo, skill, corpo, kv, gate) {
  const blocchi = [
    new Paragraph({
      spacing: { before: 300, after: 20 },
      keepNext: true,
      children: [
        new TextRun({ text: n + "  ", size: 24, bold: true, color: ROSSO, font: FONT }),
        new TextRun({ text: titolo.toUpperCase(), size: 21, bold: true, color: NERO, font: FONT, characterSpacing: 14 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 130 },
      keepNext: true,
      children: [new TextRun({ text: skill, size: 16, color: GRIGIO_CHIARO, font: MONO })],
    }),
    P(corpo),
  ];
  const larghezze = [1900, CONTENUTO - 1900];
  blocchi.push(new Table({
    columnWidths: larghezze,
    width: { size: CONTENUTO, type: WidthType.DXA },
    rows: kv.map(([k, v]) => new TableRow({
      children: [
        new TableCell({
          width: { size: larghezze[0], type: WidthType.DXA },
          margins: { top: 70, bottom: 70, right: 160 },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: RIGA },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          children: [new Paragraph({
            spacing: { after: 0 },
            children: [new TextRun({ text: k.toUpperCase(), size: 14, bold: true, color: GRIGIO_CHIARO, font: FONT, characterSpacing: 18 })],
          })],
        }),
        new TableCell({
          width: { size: larghezze[1], type: WidthType.DXA },
          margins: { top: 70, bottom: 70 },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: RIGA },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          children: [new Paragraph({ spacing: { after: 0, line: 265 }, children: runs(v, { size: 18, color: GRIGIO }) })],
        }),
      ],
    })),
  }));
  if (gate) blocchi.push(...RIQUADRO(gate[0], gate[1], { scuro: true }));
  else blocchi.push(SPAZIO(120));
  return blocchi;
}

/* ---------- alberi di decisione ---------- */
function decisione(domanda, righe) {
  const larghezze = [4300, CONTENUTO - 4300];
  return [
    H3(domanda),
    new Table({
      columnWidths: larghezze,
      width: { size: CONTENUTO, type: WidthType.DXA },
      rows: righe.map(([se, allora, skill]) => new TableRow({
        children: [
          cella(se, larghezze[0]),
          new TableCell({
            width: { size: larghezze[1], type: WidthType.DXA },
            margins: { top: 90, bottom: 90 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: RIGA },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            children: [
              new Paragraph({
                spacing: { after: 20, line: 265 },
                children: [
                  new TextRun({ text: "→  ", size: 18, color: ROSSO, font: FONT }),
                  ...runs(allora, { size: 18, color: NERO }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [new TextRun({ text: "     " + skill, size: 15, color: GRIGIO_CHIARO, font: MONO })],
              }),
            ],
          }),
        ],
      })),
    }),
    SPAZIO(200),
  ];
}

/* ---------- documento ---------- */
const copertina = [
  SPAZIO(2400),
  new Paragraph({
    spacing: { after: 700 },
    children: [
      new TextRun({ text: "FIELD ", size: 24, bold: true, color: NERO, font: FONT, characterSpacing: 60 }),
      new TextRun({ text: "PROJECT ", size: 24, bold: true, color: ROSSO, font: FONT, characterSpacing: 60 }),
      new TextRun({ text: "SAS", size: 17, bold: true, color: GRIGIO, font: FONT, characterSpacing: 44 }),
    ],
  }),
  new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: "GUIDA OPERATIVA", size: 52, bold: true, color: NERO, font: FONT, characterSpacing: 10 })],
  }),
  new Paragraph({
    spacing: { after: 320 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: RIGA, space: 14 } },
    children: [new TextRun({ text: "DEL SISTEMA", size: 52, bold: true, color: ROSSO, font: FONT, characterSpacing: 10 })],
  }),
  P("Come lavorare con le skill: che cosa fare in ogni momento della commessa, quale strumento attivare, cosa devi avere in mano prima di lanciarlo e che cosa ne esce.", { size: 21, after: 700 }),
  ...[
    ["Destinatario", "Direzione di cantiere — Field Project SAS"],
    ["Ambito", "Coordinamento installazioni arredo contract · D.Lgs. 81/2008"],
    ["Commessa di riferimento", "2514RW — WP1 FOH · WP2 CORRIDOI · WP3 SUITE · WP4 SCALA B"],
    ["Revisione", "1 — " + new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })],
  ].map(([k, v]) => new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: k.toUpperCase() + "   ", size: 14, bold: true, color: GRIGIO_CHIARO, font: FONT, characterSpacing: 20 }),
      new TextRun({ text: v, size: 18, color: GRIGIO, font: FONT }),
    ],
  })),
  new Paragraph({ children: [new PageBreak()] }),
];

const indiceVoci = [
  "Come è fatto il sistema",
  "Come si lancia una skill",
  "La commessa dall'apertura al collaudo",
  "Le routine che tengono in piedi il sistema",
  "Quale skill, quando due si somigliano",
  "I numeri da sapere a memoria",
  "Gli errori che costano di più",
  "Quando nessuna skill corrisponde",
];

const indice = [
  new Paragraph({
    spacing: { after: 260 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RIGA, space: 10 } },
    children: [new TextRun({ text: "INDICE", size: 24, bold: true, color: NERO, font: FONT, characterSpacing: 26 })],
  }),
  ...indiceVoci.map((t, i) => new Paragraph({
    spacing: { after: 130 },
    children: [
      new TextRun({ text: String(i + 1).padStart(2, "0") + "     ", size: 18, bold: true, color: ROSSO, font: FONT }),
      new TextRun({ text: t, size: 20, color: NERO, font: FONT }),
    ],
  })),
  new Paragraph({ children: [new PageBreak()] }),
];

const corpo = [
  /* --- 01 --- */
  H1("Come è fatto il sistema", "01"),
  P("Il sistema non è un archivio di documenti: è un insieme di processi, ognuno con un proprio strumento. Tre regole ne spiegano il funzionamento.", { size: 21, color: NERO }),
  H2("Una skill = un processo, con confini netti"),
  P("Ogni skill copre un processo e si ferma dove ne inizia un altro. I confini non sono formali: servono a non mescolare cose che hanno destinatari e conseguenze diverse. L'avanzamento fisico non è la contabilità del SAL; una non conformità di montaggio non è un punto di snag list; una revisione dopo l'approvazione non è una variante economica. Tenerli separati è ciò che rende i dati difendibili quando qualcuno li contesta."),
  H2("I registri si accumulano, i report si generano"),
  P("Le skill di registro — non conformità, instabilità progettuale, decisioni DL, scadenzario, performance fornitori — costruiscono uno storico che cresce nel tempo. Le skill di reporting non raccolgono nulla: **leggono** quei registri e li mettono in forma per un destinatario. Se il registro non è aggiornato, il report è vuoto. Il lavoro sta nell'alimentare i registri quando l'evento accade, non il venerdì sera."),
  H2("Tutto ciò che esce ha una data certa"),
  P("Registro instabilità progettuale, registro decisioni DL, non conformità, verbale di handover: sono costruiti per essere opponibili. La data di prima segnalazione di un nodo, l'anzianità di una decisione non presa, il collegamento fra una revisione e il pacchetto approvato prima: è la documentazione che sostiene le scritture formali di rito e difende gli slittamenti che non dipendono da noi."),

  /* --- 02 --- */
  H1("Come si lancia una skill", "02"),
  H2("Tre modi, stesso risultato"),
  BUL("**Descrivi la situazione.** Non serve sapere il nome della skill: «ho trovato tre ante rigate nella suite 412» attiva da sé la gestione non conformità. È il modo normale."),
  BUL("**Chiama la skill per nome** quando sai già quale vuoi: `/gestione-non-conformita`. Utile quando due processi sono vicini e vuoi essere certo di quale parte."),
  BUL("**Parti dal Quadro di Comando** quando non ricordi cosa esiste: apri la scheda, copi la frase, la incolli."),
  H2("Cosa avere pronto prima"),
  P("Quasi ogni skill fa domande, e le fa perché la risposta cambia l'esito. Tre cose accelerano qualsiasi lancio:"),
  BUL("**Il codice commessa** — 2514RW — e il **WP** di riferimento. Vale come chiave di tutto: registri, report, SAL e snag usano la stessa struttura di aree."),
  BUL("**I file, allegati alla richiesta**: POS, capitolato, elaborato, foto del difetto, export dell'app di cantiere. Una skill con il documento davanti lavora sul reale; senza, ti intervista."),
  BUL("**La data dell'evento**, se non è oggi. I registri con data certa perdono valore se la data è quella di quando ti sei ricordato di registrarlo."),
  ...RIQUADRO("Regola", "Se una skill ti chiede la gravità di una NC, la priorità di uno snag o il peso di un'area, **non lasciarla scegliere**. Quei parametri determinano scadenze e destinatari dell'escalation: il default sbagliato manda una critica nel binario delle lievi."),
  H2("Cosa fare dell'output"),
  P("Ogni skill restituisce file — Word, Excel, PDF — oltre alla risposta a schermo. Sono documenti finiti, non bozze da reimpaginare: rispettano già l'identità Field Project SAS. Il passo che resta a te è la distribuzione sui canali ufficiali della commessa e, quando il documento è un verbale, la firma."),

  /* --- 03 --- */
  H1("La commessa dall'apertura al collaudo", "03"),
  P("Otto passaggi, cinque dei quali sono gate: se non li superi non dovresti passare oltre, e il sistema te lo dice per iscritto. Serve proprio a questo — avere un documento che dimostra che il gate non era chiuso.", { size: 21, color: NERO }),

  ...fase("01", "Apertura commessa", "front-end-planning",
    "Prima di qualunque altra cosa: leggi capitolato, disegni e computo in gerarchia e fai emergere le contraddizioni finché costano poco. Ogni discordanza diventa una riga di registro e, se serve, una RFI verso GC o DL. Nel frattempo mappi gli interlocutori, i brand standard della struttura e il sopralluogo logistico.",
    [["Serve avere", "Contratto, capitolato, elaborati, computo, brand standard del marchio"],
     ["Chiedi", "«Apri la commessa [codice]: analisi documentale, registro discordanze, RFI, RTM e readiness gate»"],
     ["Ottieni", "Registro discordanze e RFI · RTM · Readiness Gate firmabile"]],
    ["Gate 1 — Readiness", "Se le voci critiche non sono chiuse, la progettazione esecutiva non si apre. Il readiness gate va firmato prima della Fase 2: è l'unico documento che, a valle, dimostra cosa si sapeva e cosa mancava all'inizio."]),

  ...fase("02", "Ambito e WBS", "scope-wbs",
    "Qui si scrive dove finisce il nostro lavoro. Inclusioni, esclusioni e assunzioni esplicite, poi la WBS su tre livelli: area fisica → lavorazioni → voci di capitolato. I codici che nascono qui vengono riusati per tutta la commessa, quindi vale la pena spenderci tempo una volta sola.",
    [["Serve avere", "Readiness gate chiuso, capitolato riconciliato, elenco aree"],
     ["Chiedi", "«Definiamo ambito e WBS della commessa [codice] sui quattro WP»"],
     ["Ottieni", "WBS in Word/PDF per GC e DL · Excel operativo con i codici · albero visivo"],
     ["Alimenta", "Avanzamento fisico, SAL, snag list: useranno tutti questi codici"]],
    null),

  ...fase("03", "Progettazione esecutiva", "progettazione-shop-drawing",
    "Shop drawing e submittal sotto revision control, RFI di progettazione, campioni e strike-off, mock-up o model room come prova generale. Il change order log resta aperto fino al freeze: dopo, ogni modifica cambia natura e cambia registro.",
    [["Serve avere", "WBS, elaborati con numero di revisione, esito mock-up"],
     ["Chiedi", "«Aggiorna il registro submittal e dimmi se siamo in condizione di design freeze per il WP [n]»"],
     ["Ottieni", "Registro submittal · Checklist mock-up · Change order log"]],
    ["Gate 2 — Design freeze", "Senza freeze non si va in produzione. Dopo il freeze, ogni revisione su un pacchetto approvato non è più un change order: è instabilità progettuale, e va nel registro con data certa."]),

  ...fase("04", "Passaggio di consegne", "handover-commessa-pm-ddc",
    "La commessa passa dal PM alla direzione di cantiere. Otto sezioni da verificare — quadro contrattuale, elaborati e revisioni, stato approvazioni, assunzioni dell'offerta, fornitori, governance, programma, nodi aperti — con un punteggio pesato che dice se puoi partire.",
    [["Serve avere", "Il PM davanti, contratto e programma vigente, elenco fornitori"],
     ["Chiedi", "«Facciamo l'handover della commessa [codice]: checklist 8 sezioni, semaforo, integrazioni mancanti»"],
     ["Ottieni", "Verbale firmato da entrambi · punteggio per sezione · integrazioni con responsabile e data"]],
    ["Gate 3 — Completezza", "≥ 90% handover completo · 70–89% condizionale, si firma con l'elenco delle integrazioni · sotto il 70% non accettabile: si formalizza la presa in carico dichiarando il perimetro di ciò che non è stato consegnato. Obiettivo: arrivare al verde entro due settimane."]),

  ...fase("05", "Piano di Cantiere", "piano-cantiere-ddc",
    "Un'intervista, una volta sola, per fissare il piano macro: organigramma, sequenza dei WP con milestone, fornitori assegnati, logistica, presidio sicurezza, qualità e collaudo, rischi noti. Da qui in poi le skill operative eseguono quello che qui è stato deciso.",
    [["Serve avere", "Verbale di handover, WBS, cronoprogramma, fornitori per WP"],
     ["Chiedi", "«Costruiamo il Piano di Cantiere della commessa [codice]»"],
     ["Ottieni", "Piano di Cantiere in Word · Excel delle milestone"]],
    null),

  ...fase("06", "Apertura del cantiere in sicurezza", "cantiere-sicurezza-onboarding · verifica-pos-cse",
    "Squadra per squadra: POS firmato e coerente con le lavorazioni di questo cantiere, DUVRI dove ci sono interferenze, idoneità tecnico-professionale ex art. 90, tessere di riconoscimento nominative, DURC in validità. Il POS di ogni fornitore passa dalla verifica interna **prima** di arrivare al CSE: sei aree di controllo ed esito GO / NO-GO.",
    [["Serve avere", "I documenti ricevuti dai fornitori, elenco nominativo degli operatori"],
     ["Chiedi", "«Verifica lo stato documentale di sicurezza per l'apertura del cantiere [codice]» · «Verifica questo POS prima dell'invio al CSE»"],
     ["Ottieni", "Report di apertura per DL/GC · email di sollecito ai giallo/rosso · report POS con GO/NO-GO e bozza di richiesta integrazioni"]],
    ["Gate 4 — Ingresso in cantiere", "Nessuna squadra entra con documentazione in stato rosso. Il DURC vale 120 giorni dall'emissione: quello raccolto all'apertura scade durante il cantiere, e il rinnovo non arriva da solo."]),

  ...fase("07", "Esecuzione", "coordinamento-giornaliero-gc · logistica-e-collaudo · gestione-non-conformita · registro-instabilita-progettuale · sicurezza-continuativa-cantiere",
    "È la fase più lunga e l'unica in cui il sistema chiede qualcosa tutti i giorni. Il ritmo è nel capitolo 04; qui conta il principio: ogni evento va nel suo registro nel momento in cui accade, perché il valore probatorio sta nella data.",
    [["Ogni giorno", "Diario di cantiere e richieste del GC"],
     ["Quando accade", "NC con gravità e SLA · episodio di instabilità progettuale · controllo sicurezza a evento"],
     ["In anticipo", "Slot di scarico, con rilevamento delle sovrapposizioni su mezzi, aree e montacarichi"]],
    null),

  ...fase("08", "Collaudo e consegna", "logistica-e-collaudo",
    "Il sopralluogo finale con DL e GC produce la snag list nello standard Field Project SAS: codice punto, area riferita alla stessa struttura WP, descrizione oggettiva, foto, responsabile, priorità e scadenza calcolata dalla priorità.",
    [["Serve avere", "Struttura aree/WP, elenco fornitori competenti, sopralluogo fatto"],
     ["Chiedi", "«Prepara la snag list del collaudo della commessa [codice]»"],
     ["Ottieni", "Snag list con priorità e scadenze · stato per punto fino alla verifica"]],
    ["Gate 5 — Consegna", "I punti in priorità alta impediscono la consegna. Uno snag che resta irrisolto oltre la scadenza non si archivia: si converte in non conformità, che ha SLA ed escalation."]),

  /* --- 04 --- */
  new Paragraph({ children: [new PageBreak()] }),
  H1("Le routine che tengono in piedi il sistema", "04"),
  P("Il sistema rende quanto lo alimenti. Questo è il ritmo minimo perché i report settimanali e il cruscotto mensile abbiano dentro qualcosa di vero.", { size: 21, color: NERO }),
  SPAZIO(60),
  tabella(
    ["Quando", "Cosa fai", "Skill", "Perché non si salta"],
    [
      ["Ogni mattina", "Briefing: squadre presenti, attività per WP, richieste del GC", "coordinamento-giornaliero-gc", "È la fonte di campo che il consolidato settimanale riconcilia con l'input del PM"],
      ["Ogni sera", "Debrief: cosa è stato fatto, eventi, nodi nati oggi", "coordinamento-giornaliero-gc", "Ricostruire a memoria tre giorni dopo produce un diario che non regge un contraddittorio"],
      ["Appena accade", "Apri la NC con gravità dichiarata; registra l'episodio di instabilità progettuale", "gestione-non-conformita · registro-instabilita-progettuale", "Lo SLA decorre dall'apertura e la data certa è il valore stesso del registro"],
      ["Prima di ogni nuova fase", "Verifica POS/DUVRI validi, DPI idonei, idoneità sanitaria della squadra", "sicurezza-continuativa-cantiere", "Le squadre cambiano composizione in corsa: chi è entrato dopo l'onboarding non è coperto"],
      ["Settimanale", "Report a DL/GC, email al cliente, consolidato per l'Advisor", "reportistica-brandizzata", "Il consolidato riconcilia tre fonti e segnala le discrepanze: è il quadro unico pre-riunione"],
      ["Prima della riunione DL", "Contro-agenda: temi nostri, decisioni richieste come domande chiuse, nodi con data di prima segnalazione", "preparazione-riunione-dl", "Senza agenda della DL, chi porta i temi decide di cosa si parla"],
      ["Settimanale", "Avanzamento fisico per WP e stato varianti", "project-controller", "Alimenta il report e mantiene confrontabile la baseline"],
      ["Mensile", "Cruscotto: ore risparmiate, sicurezza, NC entro SLA, rating fornitori, certificazioni in scadenza", "cruscotto-mensile", "È l'unica vista che attraversa più cantieri e mostra i processi che stanno scivolando"],
      ["Mensile", "Scadenzario certificazioni degli operatori", "scadenzario-certificazioni-sicurezza", "Preavviso a 30 giorni: sotto quella soglia il rinnovo non fa in tempo"],
      ["A SAL", "Libretto delle misure, quantità contabilizzate, cascata fino al netto ante IVA", "sal-controller", "Consegnato e montato non coincidono: la differenza va tracciata prima di fatturare"],
      ["Trimestrale", "Pacchetto per il commercialista, con i giustificativi mancanti evidenziati", "doc-commercialista · nota-trasferte", "Le ricevute di trasferta si perdono, e il recupero a fine anno costa il triplo"],
      ["Fine commessa", "Aggiorna lo storico performance dei fornitori", "storico-performance-fornitori", "È ciò che rende motivata la scelta delle squadre sul cantiere successivo"],
    ],
    [1500, 2600, 2300, 3238]
  ),

  /* --- 05 --- */
  new Paragraph({ children: [new PageBreak()] }),
  H1("Quale skill, quando due si somigliano", "05"),
  P("Le confusioni ricorrenti sono quattro. Per ciascuna, la discriminante è una sola domanda.", { size: 21, color: NERO }),

  ...decisione("Ho trovato un difetto. Dove lo registro?", [
    ["Rilevato durante l'esecuzione, il montaggio è in corso", "Non conformità, con gravità e SLA", "gestione-non-conformita"],
    ["Rilevato al sopralluogo di collaudo finale con DL/GC", "Punto di snag list, con priorità", "logistica-e-collaudo"],
    ["Punto di snag scaduto e non risolto", "Si converte in NC: torna alla prima riga", "gestione-non-conformita"],
    ["Non è un difetto: è il progetto che chiede altro", "Variante, non NC", "project-controller"],
  ]),

  ...decisione("Il progetto è cambiato. Quale registro?", [
    ["Siamo prima del design freeze", "Change order log della progettazione", "progettazione-shop-drawing"],
    ["Pacchetto già approvato, rimesso in discussione da committente, DL o ID", "Instabilità progettuale, con data certa e ore di riprogettazione", "registro-instabilita-progettuale"],
    ["La modifica ha un impatto economico da formalizzare", "Variante: proposta → emessa → approvata, con baseline aggiornata", "project-controller"],
    ["Cambia l'importo da contabilizzare a SAL", "Contabilità, separata dall'avanzamento", "sal-controller"],
  ]),

  ...decisione("Documenti di sicurezza: quale delle quattro?", [
    ["Documenti aziendali per far entrare una squadra", "Checklist di apertura: POS, DUVRI, art. 90, tessere, DURC", "cantiere-sicurezza-onboarding"],
    ["Un singolo POS da mandare al CSE", "Verifica in sei aree con esito GO/NO-GO", "verifica-pos-cse"],
    ["Attestati e idoneità della singola persona, su più cantieri", "Registro nominale con preavviso a 30 giorni", "scadenzario-certificazioni-sicurezza"],
    ["Nuova fase, nuovo subappalto, squadra cambiata in corsa", "Controllo a evento e storico comportamenti", "sicurezza-continuativa-cantiere"],
  ]),

  ...decisione("Devo aggiornare qualcuno. Con cosa?", [
    ["Registrazione interna della giornata", "Diario di cantiere", "coordinamento-giornaliero-gc"],
    ["DL e GC, periodico formale", "Report settimanale PDF/Word", "reportistica-brandizzata"],
    ["Cliente finale", "Email narrativa, stessa fonte dati", "reportistica-brandizzata"],
    ["Advisor, prima della riunione di coordinamento", "Consolidato a tre fonti con discrepanze evidenziate", "reportistica-brandizzata"],
    ["Tavolo formale con DL e committenza", "Contro-agenda e registro decisioni", "preparazione-riunione-dl"],
  ]),

  /* --- 06 --- */
  H1("I numeri da sapere a memoria", "06"),
  P("Sono le soglie che il sistema applica da solo, ma che devi riconoscere quando le vedi in un report o quando qualcuno te le contesta."),
  SPAZIO(60),
  tabella(
    ["Parametro", "Valore", "Effetto"],
    [
      ["NC critica", "24 h", "Blocca lavorazioni, impatta la sicurezza o è a vista in area chiave. Escalation immediata a fornitore + DL/GC"],
      ["NC normale", "72 h", "Scostamento da capitolato: impatta qualità o programma senza bloccare. DL/GC solo se scade"],
      ["NC lieve", "7 giorni", "Difetto estetico minore. Solo fornitore"],
      ["NC «in scadenza»", "< 20% SLA", "Meno di 5 ore su una critica, meno di 14 su una normale"],
      ["Snag priorità alta", "5 giorni", "Impedisce la consegna o riguarda sicurezza e funzionalità"],
      ["Snag priorità media", "10 giorni", "Visibile ma non bloccante"],
      ["Handover", "90 / 70 %", "Verde sopra 90, condizionale fra 70 e 89, non accettabile sotto 70"],
      ["Validità DURC", "120 giorni", "Dall'emissione: va rinnovato in corso di cantiere"],
      ["Preavviso certificazioni", "30 giorni", "Soglia singola prima della scadenza di attestati e idoneità"],
      ["Escalation comportamenti", "3 in 90 giorni", "Tre segnalazioni sulla stessa squadra: si sale a DL/GC"],
      ["Consolidato Advisor", "3 fonti", "Campo, PM, app di cantiere. Con meno di due è un report di parte, non un consolidato"],
    ],
    [2500, 1600, CONTENUTO - 4100]
  ),

  /* --- 07 --- */
  H1("Gli errori che costano di più", "07"),
  H3("Mescolare avanzamento fisico e contabilità"),
  P("«Siamo al 60%» e «possiamo fatturare il 60%» sono due frasi diverse e due skill diverse. L'avanzamento pesa le aree, il SAL valorizza le voci contrattuali e sottrae ritenuta di garanzia, recupero anticipo ed eventuali penali. Confonderli in un documento che esce verso il GC è difficile da recuperare."),
  H3("Aprire una NC senza dichiarare la gravità"),
  P("La gravità determina lo SLA e chi riceve l'escalation. Una critica registrata come normale perde 48 ore e non arriva a DL/GC nel momento in cui serviva."),
  H3("Alimentare i registri a fine settimana"),
  P("I registri con data certa valgono per la data. Un episodio di instabilità progettuale registrato venerdì per lunedì è comunque utile, ma ha perso la parte di valore che serviva davvero: dimostrare quando si è saputo."),
  H3("Mandare un POS al CSE senza verificarlo"),
  P("Il POS incompleto torna indietro dal Coordinatore, con il ritardo che ne consegue sull'ingresso della squadra. La verifica interna costa pochi minuti e produce già la bozza di richiesta di integrazioni al fornitore."),
  H3("Trattare una squadra cambiata come una squadra onboardata"),
  P("L'onboarding certifica le persone che c'erano quel giorno. Chi subentra a metà cantiere non è coperto da nulla finché non passa dal controllo a evento."),
  H3("Arrivare alla riunione DL senza contro-agenda"),
  P("Se la DL non manda l'agenda, l'ordine del giorno lo fa chi porta i temi. Le decisioni richieste vanno formulate come domande chiuse: una domanda aperta a verbale non produce una decisione, produce un altro rinvio."),
  H3("Chiedere il cruscotto mensile senza aver alimentato nulla"),
  P("Il cruscotto non raccoglie dati: li aggrega. Se il mese è stato registrato a spot, il cruscotto è onesto e lo mostra — ma non è un errore del cruscotto."),

  /* --- 08 --- */
  H1("Quando nessuna skill corrisponde", "08"),
  P("Capita, ed è l'informazione più utile che il sistema possa darti: significa che stai facendo a mano un processo che nessuno ha ancora codificato."),
  NUM("**Verifica che sia davvero scoperto.** Spesso il processo esiste sotto un altro nome: cerca nel Quadro di Comando per parola chiave, non per titolo."),
  NUM("**Se si ripete, mappalo** con `mappa-tesoro`: scompone le attività ripetitive area per area e indica da quali tre partire."),
  NUM("**Codificalo** con `skill-creator`, che costruisce la nuova skill e la installa nel sistema."),
  NUM("**Aggiungila al Quadro di Comando**: è un oggetto nell'array dei gruppi, conteggi e filtri si aggiornano da soli."),
  ...RIQUADRO("Criterio", "Vale la pena codificare un processo quando ricorre **almeno una volta al mese** e ha un output riconoscibile — un documento, un registro, una comunicazione. Sotto quella frequenza, una skill costa più di quanto rende."),

  ETICHETTA("Il catalogo completo"),
  P("Tutte le skill e i moduli del Board, con cosa producono e la frase per lanciarli, stanno nel Quadro di Comando: si cerca per parola chiave e si filtra per area."),
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: "https://claude.ai/artifact/JPKEJ1HvJaWBmjr2ofDJQo", size: 17, color: ROSSO, font: MONO })],
  }),
  P("Questa guida in versione consultabile online:"),
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: "https://claude.ai/artifact/FeUzm9e1i1FYvaNSpZgcb8", size: 17, color: ROSSO, font: MONO })],
  }),
];

const doc = new Document({
  creator: "Field Project SAS",
  title: "Guida Operativa del Sistema Field Project",
  description: "Come usare le skill del sistema Field Project: ciclo di vita della commessa, routine, decisioni e soglie operative.",
  styles: {
    default: {
      document: { run: { font: FONT, size: 20, color: GRIGIO } },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 28, bold: true, color: NERO } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 20, bold: true, color: NERO } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 21, bold: true, color: NERO } },
    ],
  },
  numbering: {
    config: [
      { reference: "punti", levels: [{ level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 340, hanging: 200 } }, run: { color: ROSSO, font: FONT } } }] },
      { reference: "passi", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 400, hanging: 260 } }, run: { color: ROSSO, bold: true, font: FONT } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: convertMillimetersToTwip(210), height: convertMillimetersToTwip(297) },
        margin: {
          top: convertMillimetersToTwip(22), bottom: convertMillimetersToTwip(20),
          left: convertMillimetersToTwip(20), right: convertMillimetersToTwip(20),
        },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: RIGA, space: 8 } },
          tabStops: [{ type: "right", position: CONTENUTO }],
          children: [
            new TextRun({ text: "FIELD PROJECT SAS   ·   GUIDA OPERATIVA DEL SISTEMA", size: 13, color: GRIGIO_CHIARO, font: FONT, characterSpacing: 16 }),
            new TextRun({ text: "\t", size: 13 }),
            new TextRun({ children: [PageNumber.CURRENT], size: 15, bold: true, color: ROSSO, font: FONT }),
          ],
        })],
      }),
    },
    children: [...copertina, ...indice, ...corpo],
  }],
});

const out = path.join(process.argv[2] || __dirname, "Guida_Operativa_Sistema_Field_Project.docx");
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log("scritto:", out, b.length, "byte"); });
