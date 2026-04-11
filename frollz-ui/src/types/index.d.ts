export interface Package {
    id: number;
    name: string;
}
export interface Format {
    id: number;
    packageid: number;
    name: string;
    package?: Package;
}
export interface Process {
    id: number;
    name: string;
}
export interface Emulsion {
    id: number;
    name: string;
    brand: string;
    manufacturer: string;
    speed: number;
    formatid: number;
    processid: number;
    parentId: number | null;
    boxImageUrl?: string;
    tags: Tag[];
}
export interface Tag {
    id: number;
    name: string;
    colorCode: string;
    description: string | null;
}
export interface EmulsionTag {
    id: number;
    emulsionId: number;
    tagid: number;
}
export interface FilmTag {
    id: number;
    filmId: number;
    tagid: number;
}
export interface FilmState {
    id: number;
    filmId: number;
    stateid: number;
    date: Date;
    note: string | null;
    state?: {
        id: number;
        name: string;
    };
    metadata: unknown[];
}
export interface Film {
    id: number;
    name: string;
    emulsionId: number;
    expirationDate: Date | null;
    parentId: number | null;
    transitionprofileId: number;
    emulsion?: Emulsion;
    tags: Tag[];
    states: FilmState[];
    parent?: Film;
}
export interface TransitionProfile {
    id: number;
    name: string;
}
export interface TransitionMetadataField {
    field: string;
    fieldType: string;
    defaultValue: string | null;
    isRequired: boolean;
}
export interface TransitionEdge {
    id: number;
    fromState: string;
    toState: string;
    metadata: TransitionMetadataField[];
}
export interface TransitionGraph {
    states: string[];
    transitions: TransitionEdge[];
}
export declare function currentStateName(film: Film): string;
