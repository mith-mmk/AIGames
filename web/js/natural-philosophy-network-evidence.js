/* Curated evidence layer. Load after natural-philosophy-network-data.js. */
/* global module:readonly */
(function attachNaturalPhilosophyNetworkEvidence(globalScope) {
    "use strict";

    const data = globalScope.NaturalPhilosophyNetworkData;
    if (!data || !Array.isArray(data.people) || !Array.isArray(data.evidenceEvents)) {
        throw new Error("NaturalPhilosophyNetworkData must be loaded before natural-philosophy-network-evidence.js.");
    }

    const personIds = new Set(data.people.map((person) => person.id));
    const evidenceEvents = [
        {
            id: "ev-dm-books-1632-05-10",
            type: "transmission",
            participants: ["300075", "300610"],
            dateStart: "1632-05-10",
            dateEnd: "1632-05-10",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "René Descartes to Marin Mersenne, 10 May 1632, Adam and Tannery (AT) I, 249–52; the letter records books sent by Mersenne to Descartes.",
            sourceUrl: "https://fr.wikisource.org/wiki/Œuvres_de_Descartes/Édition_Adam_et_Tannery/Correspondance/Lettre_XLIII",
            evidenceLocator: "AT I, 249–52; letter dated 10 May 1632.",
        },
        {
            id: "ev-dm-geometry-copies-1638-02-12",
            type: "transmission",
            participants: ["300075", "300610"],
            dateStart: "1638-02-12",
            dateEnd: "1638-02-12",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "René Descartes to Marin Mersenne, 12 February 1638, AT I, 517–19; Descartes asks Mersenne to distribute separately printed copies of La Géométrie.",
            sourceUrl: "https://fr.wikisource.org/wiki/Œuvres_de_Descartes/Édition_Adam_et_Tannery/Correspondance/Lettre_CV",
            evidenceLocator: "AT I, 517–19, editorial note at p. 518.",
        },
        {
            id: "ev-fmd-maxima-minima-1638-01",
            type: "transmission",
            participants: ["600027", "300610", "300075"],
            route: ["600027", "300610", "300075"],
            dateStart: "1638-01-01",
            dateEnd: "1638-01-31",
            datePrecision: "approximate",
            confidence: "high",
            sourceCitation: "Pierre de Fermat, Maxima et Minima; Fermat's text was sent through Mersenne to Descartes and received around 10 January 1638.",
            sourceUrl: "https://fr.wikisource.org/wiki/Œuvres_de_Fermat/I/Maxima_et_Minima",
            evidenceLocator: "Editorial account of the transmission and the circa-10-January-1638 receipt.",
        },
        {
            id: "ev-fmd-dioptrique-controversy-1637-1639",
            type: "theme",
            participants: ["600027", "300610", "300075"],
            dateStart: "1637-01-01",
            dateEnd: "1639-12-31",
            datePrecision: "year",
            confidence: "high",
            sourceCitation: "Michèle Grégoire, ‘La correspondance entre Descartes et Fermat’, Revue d'histoire des sciences 51 (1998), 355–62: the exchange begins with refraction and proceeds to tangents; all but one letters are addressed to Mersenne.",
            sourceUrl: "https://www.persee.fr/doc/rhs_0151-4105_1998_num_51_2_1329",
            evidenceLocator: "pp. 355–62; overview of the 1637–39 correspondence.",
        },
        {
            id: "ev-desargues-papers-1638-04-04",
            type: "transmission",
            participants: ["903689", "300610", "300075"],
            route: ["300075", "300610", "903689"],
            dateStart: "1638-04-04",
            dateEnd: "1638-04-04",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Girard Desargues to Marin Mersenne, 4 April 1638; the letter records papers Descartes had sent to Mersenne and Mersenne had entrusted to Desargues. It additionally records Desargues's return of the papers to Mersenne.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Œuvres_de_Fermat,_Tannery,_tome_4,_1912.djvu/55",
            evidenceLocator: "Page 55, letter dated 4 April 1638; the non-repeating route encodes Descartes → Mersenne → Desargues, while the separately stated return is not encoded as a bypass edge.",
        },
        {
            id: "ev-desargues-robberval-1638-04-04",
            type: "mention",
            participants: ["903689", "903462"],
            dateStart: "1638-04-04",
            dateEnd: "1638-04-04",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Girard Desargues to Marin Mersenne, 4 April 1638; the letter explicitly mentions Roberval.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Œuvres_de_Fermat,_Tannery,_tome_4,_1912.djvu/55",
            evidenceLocator: "Page 55, letter dated 4 April 1638.",
        },
        {
            id: "ev-desargues-mydorge-1638-04-04",
            type: "mention",
            participants: ["903689", "900356"],
            dateStart: "1638-04-04",
            dateEnd: "1638-04-04",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Girard Desargues to Marin Mersenne, 4 April 1638; the letter explicitly mentions Mydorge.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Œuvres_de_Fermat,_Tannery,_tome_4,_1912.djvu/55",
            evidenceLocator: "Page 55, letter dated 4 April 1638.",
        },
        {
            id: "ev-desargues-descartes-papers-1638-04-04",
            type: "mention",
            participants: ["903689", "300075"],
            dateStart: "1638-04-04",
            dateEnd: "1638-04-04",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Girard Desargues to Marin Mersenne, 4 April 1638; Descartes is named in the account of the papers entrusted to Desargues.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Œuvres_de_Fermat,_Tannery,_tome_4,_1912.djvu/55",
            evidenceLocator: "Page 55, letter dated 4 April 1638.",
        },
        {
            id: "ev-hmd-objections-forwarded-1641-03-10",
            type: "transmission",
            participants: ["11119", "300610", "300075"],
            route: ["11119", "300610", "300075"],
            dateStart: "1641-03-10",
            dateEnd: "1641-03-10",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Thomas Hobbes to Marin Mersenne for René Descartes, 10 March 1641; the letter responds to the communication of Descartes's 4 March response.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Descartes_-_Œuvres,_éd._Adam_et_Tannery,_III.djvu/353",
            evidenceLocator: "AT III, page 353; heading and opening note for the 10 March 1641 letter.",
        },
        {
            id: "ev-hd-objections-replies-1641-03-10",
            type: "theme",
            participants: ["11119", "300075"],
            dateStart: "1641-03-10",
            dateEnd: "1641-03-10",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Thomas Hobbes to Marin Mersenne for René Descartes, 10 March 1641; this documented exchange belongs to the Hobbes–Descartes objections-and-replies controversy around the Meditations.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Descartes_-_Œuvres,_éd._Adam_et_Tannery,_III.djvu/353",
            evidenceLocator: "AT III, page 353; cross-reference to Descartes's 4 March communication.",
        },
        {
            id: "ev-dm-sixth-objections-parts-1641-07-22",
            type: "transmission",
            participants: ["300075", "300610"],
            dateStart: "1641-07-22",
            dateEnd: "1641-07-22",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "René Descartes to Marin Mersenne, 22 July 1641; Mersenne had sent the Sixth Objections in parts.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Descartes_-_Œuvres,_éd._Adam_et_Tannery,_III.djvu/427",
            evidenceLocator: "AT III, page 427; 22 July 1641 letter.",
        },
        {
            id: "ev-dm-sixth-replies-returned-1641-07-22",
            type: "transmission",
            participants: ["300075", "300610"],
            dateStart: "1641-07-22",
            dateEnd: "1641-07-22",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "René Descartes to Marin Mersenne, 22 July 1641; Descartes returns the replies joined together after receiving the Sixth Objections in parts.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Descartes_-_Œuvres,_éd._Adam_et_Tannery,_III.djvu/427",
            evidenceLocator: "AT III, page 427; 22 July 1641 letter.",
        },
        {
            id: "ev-gmd-fifth-objections-request-1641",
            type: "transmission",
            participants: ["900042", "300610", "300075"],
            route: ["900042", "300610", "300075"],
            dateStart: "1641-01-01",
            dateEnd: "1641-05-16",
            datePrecision: "range",
            confidence: "high",
            sourceCitation: "Pierre Gassendi, Fifth Objections; Mersenne made Gassendi a participant in the Meditations project and requested that he set down his doubts in writing.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Œuvres_de_Descartes,_éd._Cousin,_tome_II.djvu/93",
            evidenceLocator: "Critical edition, page 93; prefatory account to the Fifth Objections.",
        },
        {
            id: "ev-gmd-fifth-objections-holland-1641-05-16",
            type: "transmission",
            participants: ["900042", "300610", "300075"],
            route: ["900042", "300610", "300075"],
            dateStart: "1641-05-16",
            dateEnd: "1641-05-16",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Adam and Tannery's correspondence notes record Mersenne's sending Gassendi's Fifth Objections text to Holland on 16 May 1641.",
            sourceUrl: "https://fr.wikisource.org/wiki/Page:Descartes_-_Œuvres,_éd._Adam_et_Tannery,_III.djvu/377",
            evidenceLocator: "AT III, page 377; editorial source note for 16 May 1641.",
        },
        {
            id: "ev-ed-mind-body-1643-06-20",
            type: "theme",
            participants: ["903445", "300075"],
            dateStart: "1643-06-20",
            dateEnd: "1643-06-20",
            datePrecision: "exact",
            confidence: "high",
            sourceCitation: "Elisabeth of the Palatinate to René Descartes, The Hague, 20 June 1643; primary correspondence on mind–body interaction.",
            sourceUrl: "https://fr.wikisource.org/wiki/Correspondance_avec_Élisabeth/Élisabeth_à_Descartes_-_La_Haye,_20_juin_1643",
            evidenceLocator: "Letter heading and text, The Hague, 20 June 1643.",
        },
        {
            id: "ev-collective-controversy-1638",
            type: "theme",
            participants: ["300075", "300610", "600027", "903462", "900356", "300096", "903689"],
            dateStart: "1638-01-01",
            dateEnd: "1638-12-31",
            datePrecision: "year",
            confidence: "medium",
            sourceCitation: "Adrien Baillet, La Vie de M. Descartes, book 4, chapters 9–10; retrospective account of the 1638 mathematical controversy involving Descartes, Fermat, Mersenne, Roberval, Mydorge, Hardy, and Desargues.",
            sourceUrl: "https://fr.wikisource.org/wiki/La_Vie_de_M._Descartes/Livre_4/Chapitre_9",
            evidenceLocator: "Book 4, chapters 9–10; retrospective narrative, therefore medium confidence.",
        },
    ];

    const requiredKeys = ["id", "type", "participants", "dateStart", "dateEnd", "datePrecision", "confidence", "sourceCitation", "sourceUrl", "evidenceLocator"];
    if (evidenceEvents.length < 15 || evidenceEvents.length > 30) {
        throw new Error("The curated evidence layer must contain between 15 and 30 events.");
    }
    for (const event of evidenceEvents) {
        if (requiredKeys.some((key) => !(key in event)) || Object.keys(event).some((key) => !requiredKeys.includes(key) && key !== "route")) {
            throw new Error(`Evidence event ${event.id} does not match the required schema.`);
        }
        if (!event.participants.length || event.participants.some((id) => !personIds.has(id))) {
            throw new Error(`Evidence event ${event.id} references a person absent from NaturalPhilosophyNetworkData.people.`);
        }
        if ("route" in event && event.type !== "transmission") {
            throw new Error(`Evidence event ${event.id} has a route but is not a transmission.`);
        }
        if (event.type === "transmission" && event.participants.length === 3 && !("route" in event)) {
            throw new Error(`Three-person transmission ${event.id} must provide its documented route.`);
        }
        if ("route" in event) {
            if (!Array.isArray(event.route) || event.route.length < 2 || event.route.some((id) => !personIds.has(id) || !event.participants.includes(id))) {
                throw new Error(`Evidence event ${event.id} has an invalid transmission route.`);
            }
            if (new Set(event.route).size !== event.route.length || new Set(event.route).size !== new Set(event.participants).size) {
                throw new Error(`Evidence event ${event.id} route must visit each participant exactly once.`);
            }
            for (let index = 0; index < event.route.length - 1; index += 1) {
                const [from, to] = [event.route[index], event.route[index + 1]];
                if (!event.participants.includes(from) || !event.participants.includes(to) || from === to) {
                    throw new Error(`Evidence event ${event.id} has an invalid adjacent route pair.`);
                }
            }
        }
    }
    if (new Set(evidenceEvents.map((event) => event.id)).size !== evidenceEvents.length) {
        throw new Error("Curated evidence event ids must be unique.");
    }
    if (data.evidenceEvents.some((event) => evidenceEvents.some((candidate) => candidate.id === event.id))) {
        throw new Error("Curated evidence event ids are already present; load this evidence layer only once.");
    }

    data.evidenceEvents.push(...evidenceEvents.map((event) => Object.freeze(event)));
    if (data.audit?.counts) data.audit.counts.evidenceEvents = data.evidenceEvents.length;
    if (typeof module !== "undefined" && module.exports) module.exports = evidenceEvents;
}(globalThis));
