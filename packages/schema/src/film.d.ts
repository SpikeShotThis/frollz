import { z } from 'zod';
export declare const filmTransitionMap: Map<string, string[]>;
export declare const filmSummarySchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    name: z.ZodString;
    emulsionId: z.ZodNumber;
    packageTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    expirationDate: z.ZodNullable<z.ZodISODateTime>;
    currentStateId: z.ZodNumber;
    currentStateCode: z.ZodEnum<{
        purchased: "purchased";
        stored: "stored";
        loaded: "loaded";
        exposed: "exposed";
        removed: "removed";
        sent_for_dev: "sent_for_dev";
        developed: "developed";
        scanned: "scanned";
        archived: "archived";
    }>;
    emulsion: z.ZodObject<{
        id: z.ZodNumber;
        brand: z.ZodString;
        manufacturer: z.ZodString;
        isoSpeed: z.ZodNumber;
        developmentProcessId: z.ZodNumber;
        developmentProcess: z.ZodObject<{
            id: z.ZodNumber;
            code: z.ZodEnum<{
                C41: "C41";
                E6: "E6";
                ECN2: "ECN2";
                BW: "BW";
            }>;
            label: z.ZodString;
        }, z.core.$strip>;
        balance: z.ZodString;
        filmFormats: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            code: z.ZodEnum<{
                "35mm": "35mm";
                "4x5": "4x5";
                "2x3": "2x3";
                "8x10": "8x10";
                InstaxMini: "InstaxMini";
                InstaxWide: "InstaxWide";
                InstaxSquare: "InstaxSquare";
                120: "120";
                220: "220";
            }>;
            label: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    packageType: z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodString;
        label: z.ZodString;
        filmFormatId: z.ZodNumber;
        filmFormat: z.ZodObject<{
            id: z.ZodNumber;
            code: z.ZodEnum<{
                "35mm": "35mm";
                "4x5": "4x5";
                "2x3": "2x3";
                "8x10": "8x10";
                InstaxMini: "InstaxMini";
                InstaxWide: "InstaxWide";
                InstaxSquare: "InstaxSquare";
                120: "120";
                220: "220";
            }>;
            label: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
    filmFormat: z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            "35mm": "35mm";
            "4x5": "4x5";
            "2x3": "2x3";
            "8x10": "8x10";
            InstaxMini: "InstaxMini";
            InstaxWide: "InstaxWide";
            InstaxSquare: "InstaxSquare";
            120: "120";
            220: "220";
        }>;
        label: z.ZodString;
    }, z.core.$strip>;
    currentState: z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            purchased: "purchased";
            stored: "stored";
            loaded: "loaded";
            exposed: "exposed";
            removed: "removed";
            sent_for_dev: "sent_for_dev";
            developed: "developed";
            scanned: "scanned";
            archived: "archived";
        }>;
        label: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const filmDetailSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    name: z.ZodString;
    emulsionId: z.ZodNumber;
    packageTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    expirationDate: z.ZodNullable<z.ZodISODateTime>;
    currentStateId: z.ZodNumber;
    currentStateCode: z.ZodEnum<{
        purchased: "purchased";
        stored: "stored";
        loaded: "loaded";
        exposed: "exposed";
        removed: "removed";
        sent_for_dev: "sent_for_dev";
        developed: "developed";
        scanned: "scanned";
        archived: "archived";
    }>;
    emulsion: z.ZodObject<{
        id: z.ZodNumber;
        brand: z.ZodString;
        manufacturer: z.ZodString;
        isoSpeed: z.ZodNumber;
        developmentProcessId: z.ZodNumber;
        developmentProcess: z.ZodObject<{
            id: z.ZodNumber;
            code: z.ZodEnum<{
                C41: "C41";
                E6: "E6";
                ECN2: "ECN2";
                BW: "BW";
            }>;
            label: z.ZodString;
        }, z.core.$strip>;
        balance: z.ZodString;
        filmFormats: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            code: z.ZodEnum<{
                "35mm": "35mm";
                "4x5": "4x5";
                "2x3": "2x3";
                "8x10": "8x10";
                InstaxMini: "InstaxMini";
                InstaxWide: "InstaxWide";
                InstaxSquare: "InstaxSquare";
                120: "120";
                220: "220";
            }>;
            label: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    packageType: z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodString;
        label: z.ZodString;
        filmFormatId: z.ZodNumber;
        filmFormat: z.ZodObject<{
            id: z.ZodNumber;
            code: z.ZodEnum<{
                "35mm": "35mm";
                "4x5": "4x5";
                "2x3": "2x3";
                "8x10": "8x10";
                InstaxMini: "InstaxMini";
                InstaxWide: "InstaxWide";
                InstaxSquare: "InstaxSquare";
                120: "120";
                220: "220";
            }>;
            label: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>;
    filmFormat: z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            "35mm": "35mm";
            "4x5": "4x5";
            "2x3": "2x3";
            "8x10": "8x10";
            InstaxMini: "InstaxMini";
            InstaxWide: "InstaxWide";
            InstaxSquare: "InstaxSquare";
            120: "120";
            220: "220";
        }>;
        label: z.ZodString;
    }, z.core.$strip>;
    currentState: z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            purchased: "purchased";
            stored: "stored";
            loaded: "loaded";
            exposed: "exposed";
            removed: "removed";
            sent_for_dev: "sent_for_dev";
            developed: "developed";
            scanned: "scanned";
            archived: "archived";
        }>;
        label: z.ZodString;
    }, z.core.$strip>;
    latestEvent: z.ZodNullable<z.ZodLazy<z.ZodObject<{
        id: z.ZodNumber;
        filmId: z.ZodNumber;
        userId: z.ZodNumber;
        filmStateId: z.ZodNumber;
        filmStateCode: z.ZodEnum<{
            purchased: "purchased";
            stored: "stored";
            loaded: "loaded";
            exposed: "exposed";
            removed: "removed";
            sent_for_dev: "sent_for_dev";
            developed: "developed";
            scanned: "scanned";
            archived: "archived";
        }>;
        occurredAt: z.ZodISODateTime;
        recordedAt: z.ZodISODateTime;
        notes: z.ZodNullable<z.ZodString>;
        eventData: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const filmCreateRequestSchema: z.ZodObject<{
    name: z.ZodString;
    emulsionId: z.ZodNumber;
    packageTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    expirationDate: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
}, z.core.$strip>;
export declare const filmUpdateRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    expirationDate: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
}, z.core.$strip>;
export declare const filmListQuerySchema: z.ZodObject<{
    stateCode: z.ZodOptional<z.ZodEnum<{
        purchased: "purchased";
        stored: "stored";
        loaded: "loaded";
        exposed: "exposed";
        removed: "removed";
        sent_for_dev: "sent_for_dev";
        developed: "developed";
        scanned: "scanned";
        archived: "archived";
    }>>;
    filmFormatId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    emulsionId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const filmJourneyEventDataPurchasedSchema: z.ZodObject<{}, z.core.$strict>;
export declare const filmJourneyEventDataStoredSchema: z.ZodObject<{
    storageLocationId: z.ZodNumber;
    storageLocationCode: z.ZodEnum<{
        freezer: "freezer";
        refrigerator: "refrigerator";
        shelf: "shelf";
        other: "other";
    }>;
}, z.core.$strip>;
export declare const filmJourneyEventDataLoadedSchema: z.ZodObject<{
    receiverId: z.ZodNumber;
    slotSideNumber: z.ZodNullable<z.ZodNumber>;
    intendedPushPull: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export declare const filmJourneyEventDataExposedSchema: z.ZodObject<{}, z.core.$strict>;
export declare const filmJourneyEventDataRemovedSchema: z.ZodObject<{}, z.core.$strict>;
export declare const filmJourneyEventDataSentForDevSchema: z.ZodObject<{
    labName: z.ZodNullable<z.ZodString>;
    labContact: z.ZodNullable<z.ZodString>;
    actualPushPull: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export declare const filmJourneyEventDataDevelopedSchema: z.ZodObject<{
    labName: z.ZodNullable<z.ZodString>;
    actualPushPull: z.ZodNullable<z.ZodNumber>;
}, z.core.$strip>;
export declare const filmJourneyEventDataScannedSchema: z.ZodObject<{
    scannerOrSoftware: z.ZodNullable<z.ZodString>;
    scanLink: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const filmJourneyEventDataArchivedSchema: z.ZodObject<{}, z.core.$strict>;
export declare const filmJourneyEventPayloadSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    filmStateCode: z.ZodLiteral<"purchased">;
    eventData: z.ZodObject<{}, z.core.$strict>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"stored">;
    eventData: z.ZodObject<{
        storageLocationId: z.ZodNumber;
        storageLocationCode: z.ZodEnum<{
            freezer: "freezer";
            refrigerator: "refrigerator";
            shelf: "shelf";
            other: "other";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"loaded">;
    eventData: z.ZodObject<{
        receiverId: z.ZodNumber;
        slotSideNumber: z.ZodNullable<z.ZodNumber>;
        intendedPushPull: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"exposed">;
    eventData: z.ZodObject<{}, z.core.$strict>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"removed">;
    eventData: z.ZodObject<{}, z.core.$strict>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"sent_for_dev">;
    eventData: z.ZodObject<{
        labName: z.ZodNullable<z.ZodString>;
        labContact: z.ZodNullable<z.ZodString>;
        actualPushPull: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"developed">;
    eventData: z.ZodObject<{
        labName: z.ZodNullable<z.ZodString>;
        actualPushPull: z.ZodNullable<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"scanned">;
    eventData: z.ZodObject<{
        scannerOrSoftware: z.ZodNullable<z.ZodString>;
        scanLink: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    filmStateCode: z.ZodLiteral<"archived">;
    eventData: z.ZodObject<{}, z.core.$strict>;
}, z.core.$strip>], "filmStateCode">;
export declare const filmJourneyEventSchema: z.ZodObject<{
    id: z.ZodNumber;
    filmId: z.ZodNumber;
    userId: z.ZodNumber;
    filmStateId: z.ZodNumber;
    filmStateCode: z.ZodEnum<{
        purchased: "purchased";
        stored: "stored";
        loaded: "loaded";
        exposed: "exposed";
        removed: "removed";
        sent_for_dev: "sent_for_dev";
        developed: "developed";
        scanned: "scanned";
        archived: "archived";
    }>;
    occurredAt: z.ZodISODateTime;
    recordedAt: z.ZodISODateTime;
    notes: z.ZodNullable<z.ZodString>;
    eventData: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export declare const createFilmJourneyEventRequestSchema: z.ZodObject<{
    filmStateCode: z.ZodEnum<{
        purchased: "purchased";
        stored: "stored";
        loaded: "loaded";
        exposed: "exposed";
        removed: "removed";
        sent_for_dev: "sent_for_dev";
        developed: "developed";
        scanned: "scanned";
        archived: "archived";
    }>;
    occurredAt: z.ZodISODateTime;
    notes: z.ZodOptional<z.ZodString>;
    eventData: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export declare const filmHolderSlotSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    filmReceiverId: z.ZodNumber;
    sideNumber: z.ZodNumber;
    slotStateId: z.ZodNumber;
    slotStateCode: z.ZodEnum<{
        loaded: "loaded";
        exposed: "exposed";
        removed: "removed";
        empty: "empty";
    }>;
    loadedFilmId: z.ZodNullable<z.ZodNumber>;
    createdAt: z.ZodISODateTime;
}, z.core.$strip>;
export declare const filmReceiverSummarySchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    receiverTypeId: z.ZodNumber;
    receiverTypeCode: z.ZodEnum<{
        camera: "camera";
        interchangeable_back: "interchangeable_back";
        film_holder: "film_holder";
    }>;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
}, z.core.$strip>;
export declare const cameraSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    receiverTypeCode: z.ZodLiteral<"camera">;
    make: z.ZodString;
    model: z.ZodString;
    serialNumber: z.ZodNullable<z.ZodString>;
    dateAcquired: z.ZodNullable<z.ZodISODateTime>;
}, z.core.$strip>;
export declare const interchangeableBackSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    receiverTypeCode: z.ZodLiteral<"interchangeable_back">;
    name: z.ZodString;
    system: z.ZodString;
}, z.core.$strip>;
export declare const filmHolderSchema: z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    receiverTypeCode: z.ZodLiteral<"film_holder">;
    name: z.ZodString;
    brand: z.ZodString;
    holderTypeId: z.ZodNumber;
    holderTypeCode: z.ZodEnum<{
        standard: "standard";
        grafmatic: "grafmatic";
        readyload: "readyload";
        quickload: "quickload";
    }>;
    slots: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        userId: z.ZodNumber;
        filmReceiverId: z.ZodNumber;
        sideNumber: z.ZodNumber;
        slotStateId: z.ZodNumber;
        slotStateCode: z.ZodEnum<{
            loaded: "loaded";
            exposed: "exposed";
            removed: "removed";
            empty: "empty";
        }>;
        loadedFilmId: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const filmReceiverSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    receiverTypeCode: z.ZodLiteral<"camera">;
    make: z.ZodString;
    model: z.ZodString;
    serialNumber: z.ZodNullable<z.ZodString>;
    dateAcquired: z.ZodNullable<z.ZodISODateTime>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    receiverTypeCode: z.ZodLiteral<"interchangeable_back">;
    name: z.ZodString;
    system: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodNumber;
    userId: z.ZodNumber;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    receiverTypeCode: z.ZodLiteral<"film_holder">;
    name: z.ZodString;
    brand: z.ZodString;
    holderTypeId: z.ZodNumber;
    holderTypeCode: z.ZodEnum<{
        standard: "standard";
        grafmatic: "grafmatic";
        readyload: "readyload";
        quickload: "quickload";
    }>;
    slots: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        userId: z.ZodNumber;
        filmReceiverId: z.ZodNumber;
        sideNumber: z.ZodNumber;
        slotStateId: z.ZodNumber;
        slotStateCode: z.ZodEnum<{
            loaded: "loaded";
            exposed: "exposed";
            removed: "removed";
            empty: "empty";
        }>;
        loadedFilmId: z.ZodNullable<z.ZodNumber>;
        createdAt: z.ZodISODateTime;
    }, z.core.$strip>>;
}, z.core.$strip>], "receiverTypeCode">;
export declare const createFilmReceiverRequestSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    receiverTypeCode: z.ZodLiteral<"camera">;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    make: z.ZodString;
    model: z.ZodString;
    serialNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dateAcquired: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
}, z.core.$strip>, z.ZodObject<{
    receiverTypeCode: z.ZodLiteral<"interchangeable_back">;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    name: z.ZodString;
    system: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    receiverTypeCode: z.ZodLiteral<"film_holder">;
    receiverTypeId: z.ZodNumber;
    filmFormatId: z.ZodNumber;
    frameSize: z.ZodString;
    name: z.ZodString;
    brand: z.ZodString;
    holderTypeId: z.ZodNumber;
}, z.core.$strip>], "receiverTypeCode">;
export declare const updateFilmReceiverRequestSchema: z.ZodObject<{
    filmFormatId: z.ZodOptional<z.ZodNumber>;
    frameSize: z.ZodOptional<z.ZodString>;
    make: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    serialNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dateAcquired: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
    name: z.ZodOptional<z.ZodString>;
    system: z.ZodOptional<z.ZodString>;
    brand: z.ZodOptional<z.ZodString>;
    holderTypeId: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type FilmSummary = z.infer<typeof filmSummarySchema>;
export type FilmDetail = z.infer<typeof filmDetailSchema>;
export type FilmCreateRequest = z.infer<typeof filmCreateRequestSchema>;
export type FilmUpdateRequest = z.infer<typeof filmUpdateRequestSchema>;
export type FilmListQuery = z.infer<typeof filmListQuerySchema>;
export type FilmJourneyEvent = z.infer<typeof filmJourneyEventSchema>;
export type FilmJourneyEventPayload = z.infer<typeof filmJourneyEventPayloadSchema>;
export type CreateFilmJourneyEventRequest = z.infer<typeof createFilmJourneyEventRequestSchema>;
export type FilmHolderSlot = z.infer<typeof filmHolderSlotSchema>;
export type FilmReceiver = z.infer<typeof filmReceiverSchema>;
export type CreateFilmReceiverRequest = z.infer<typeof createFilmReceiverRequestSchema>;
export type UpdateFilmReceiverRequest = z.infer<typeof updateFilmReceiverRequestSchema>;
//# sourceMappingURL=film.d.ts.map