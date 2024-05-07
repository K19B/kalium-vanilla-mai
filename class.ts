export class maiScore {
    ranker: string
    score: number
    index: number
    theoryCount: number
    date: Date

    constructor(r: string,
        s: number,
        i: number,
        c: number,
        d: Date) {
        this.ranker = r;
        this.score = s;
        this.index = i;
        this.theoryCount = c;
        this.date = d;
    }
}
export enum musicDifficulty {
    BASIC,
    ADVANCED,
    EXPERT,
    MASTER,
    ReMASTER,
    UTAGE
}
export class musicScore {
    name: string
    level: string
    difficulty: musicDifficulty
    score: number
    dxScore: number

    constructor(n: string,
                l: string,
                s: number,
                d: number,
                diff: musicDifficulty)
    {
        this.name = n;
        this.level = l;
        this.score = s;
        this.dxScore = d;
        this.difficulty = diff;
    }
}
