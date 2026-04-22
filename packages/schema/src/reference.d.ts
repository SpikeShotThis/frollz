import { z } from 'zod';
export declare const filmFormatCodes: readonly ["35mm", "120", "220", "4x5", "2x3", "8x10", "InstaxMini", "InstaxWide", "InstaxSquare"];
export declare const developmentProcessCodes: readonly ["C41", "E6", "ECN2", "BW"];
export declare const filmStateCodes: readonly ["purchased", "stored", "loaded", "exposed", "removed", "sent_for_dev", "developed", "scanned", "archived"];
export declare const storageLocationCodes: readonly ["freezer", "refrigerator", "shelf", "other"];
export declare const slotStateCodes: readonly ["empty", "loaded", "exposed", "removed"];
export declare const deviceTypeCodes: readonly ["camera", "interchangeable_back", "film_holder"];
export declare const holderTypeCodes: readonly ["standard", "grafmatic", "readyload", "quickload"];
export declare const filmFormatCodeSchema: z.ZodEnum<{
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
export declare const developmentProcessCodeSchema: z.ZodEnum<{
    C41: "C41";
    E6: "E6";
    ECN2: "ECN2";
    BW: "BW";
}>;
export declare const filmStateCodeSchema: z.ZodEnum<{
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
export declare const storageLocationCodeSchema: z.ZodEnum<{
    freezer: "freezer";
    refrigerator: "refrigerator";
    shelf: "shelf";
    other: "other";
}>;
export declare const slotStateCodeSchema: z.ZodEnum<{
    loaded: "loaded";
    exposed: "exposed";
    removed: "removed";
    empty: "empty";
}>;
export declare const deviceTypeCodeSchema: z.ZodEnum<{
    camera: "camera";
    interchangeable_back: "interchangeable_back";
    film_holder: "film_holder";
}>;
export declare const holderTypeCodeSchema: z.ZodEnum<{
    standard: "standard";
    grafmatic: "grafmatic";
    readyload: "readyload";
    quickload: "quickload";
}>;
export declare const filmFormatSchema: z.ZodObject<{
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
export declare const developmentProcessSchema: z.ZodObject<{
    id: z.ZodNumber;
    code: z.ZodEnum<{
        C41: "C41";
        E6: "E6";
        ECN2: "ECN2";
        BW: "BW";
    }>;
    label: z.ZodString;
}, z.core.$strip>;
export declare const packageTypeSchema: z.ZodObject<{
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
export declare const filmStateSchema: z.ZodObject<{
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
export declare const storageLocationSchema: z.ZodObject<{
    id: z.ZodNumber;
    code: z.ZodEnum<{
        freezer: "freezer";
        refrigerator: "refrigerator";
        shelf: "shelf";
        other: "other";
    }>;
    label: z.ZodString;
}, z.core.$strip>;
export declare const slotStateSchema: z.ZodObject<{
    id: z.ZodNumber;
    code: z.ZodEnum<{
        loaded: "loaded";
        exposed: "exposed";
        removed: "removed";
        empty: "empty";
    }>;
    label: z.ZodString;
}, z.core.$strip>;
export declare const deviceTypeSchema: z.ZodObject<{
    id: z.ZodNumber;
    code: z.ZodEnum<{
        camera: "camera";
        interchangeable_back: "interchangeable_back";
        film_holder: "film_holder";
    }>;
    label: z.ZodString;
}, z.core.$strip>;
export declare const holderTypeSchema: z.ZodObject<{
    id: z.ZodNumber;
    code: z.ZodEnum<{
        standard: "standard";
        grafmatic: "grafmatic";
        readyload: "readyload";
        quickload: "quickload";
    }>;
    label: z.ZodString;
}, z.core.$strip>;
export declare const emulsionSchema: z.ZodObject<{
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
export declare const referenceTablesSchema: z.ZodObject<{
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
    developmentProcesses: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            C41: "C41";
            E6: "E6";
            ECN2: "ECN2";
            BW: "BW";
        }>;
        label: z.ZodString;
    }, z.core.$strip>>;
    packageTypes: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>;
    filmStates: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>;
    storageLocations: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            freezer: "freezer";
            refrigerator: "refrigerator";
            shelf: "shelf";
            other: "other";
        }>;
        label: z.ZodString;
    }, z.core.$strip>>;
    slotStates: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            loaded: "loaded";
            exposed: "exposed";
            removed: "removed";
            empty: "empty";
        }>;
        label: z.ZodString;
    }, z.core.$strip>>;
    deviceTypes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            camera: "camera";
            interchangeable_back: "interchangeable_back";
            film_holder: "film_holder";
        }>;
        label: z.ZodString;
    }, z.core.$strip>>;
    holderTypes: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        code: z.ZodEnum<{
            standard: "standard";
            grafmatic: "grafmatic";
            readyload: "readyload";
            quickload: "quickload";
        }>;
        label: z.ZodString;
    }, z.core.$strip>>;
    emulsions: z.ZodArray<z.ZodObject<{
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
    }, z.core.$strip>>;
}, z.core.$strip>;
export type FilmFormat = z.infer<typeof filmFormatSchema>;
export type DevelopmentProcess = z.infer<typeof developmentProcessSchema>;
export type PackageType = z.infer<typeof packageTypeSchema>;
export type FilmState = z.infer<typeof filmStateSchema>;
export type StorageLocation = z.infer<typeof storageLocationSchema>;
export type SlotState = z.infer<typeof slotStateSchema>;
export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type HolderType = z.infer<typeof holderTypeSchema>;
export type Emulsion = z.infer<typeof emulsionSchema>;
export type ReferenceTables = z.infer<typeof referenceTablesSchema>;
//# sourceMappingURL=reference.d.ts.map